# Part 12: Advanced Architectures

# Chapter 33: Microservices Patterns

## Introduction

Monolithic applications—single deployable units containing all business logic—served organizations well for decades but crumble under modern demands: scaling entire application when only one feature needs capacity, deploying entire codebase for single-line bug fix taking hours of downtime, technology locked into decade-old framework choices, and teams of 50+ engineers stepping on each other's code causing deployment conflicts. A e-commerce monolith requiring 4-hour deployment windows for every change, scaling vertically to \$50K/month in compute costs, and taking 6 months to add new payment provider cannot compete with competitors deploying features daily, scaling specific services independently, and integrating new technologies in weeks. Microservices architecture—decomposing applications into independent, loosely-coupled services each owning specific business capabilities—enables organizations to achieve deployment velocity, independent scaling, technology diversity, and team autonomy that modern business demands require.

The transition from monolith to microservices introduces new complexity: distributed systems require service discovery mechanisms so services find each other, circuit breakers preventing cascading failures, API composition aggregating data from multiple services, saga patterns maintaining data consistency across service boundaries, and distributed tracing understanding request flows through dozens of services. A simple user registration in monolith becomes coordinated dance across User Service, Email Service, Payment Service, and Notification Service each potentially failing independently. Organizations naively adopting microservices without addressing distributed systems challenges experience 3× increase in operational complexity, longer mean time to recovery due to difficult debugging, data consistency nightmares from distributed transactions, and higher infrastructure costs from service proliferation. AWS provides comprehensive microservices toolkit—ECS/EKS for container orchestration, App Mesh for service mesh, X-Ray for distributed tracing, EventBridge for event-driven communication—enabling organizations to build resilient microservices architectures.

This chapter synthesizes AWS services throughout handbook—ECS/EKS from containers chapter for service deployment, ALB from networking for service routing, DynamoDB for per-service databases, SQS/SNS for asynchronous communication, Lambda for serverless services, CloudWatch for monitoring, and X-Ray for distributed tracing. The chapter covers microservices patterns (service discovery, circuit breakers, API Gateway composition, saga patterns, event sourcing), service mesh architecture with App Mesh, observability strategies for distributed systems, data management patterns, resilience patterns, contract testing, service versioning, and building production microservices systems that deliver business agility while managing distributed systems complexity through proven patterns, robust tooling, and operational discipline.

## Theory \& Concepts

### Microservices Architecture Fundamentals

**Core Principles and Patterns:**

```
Microservices Definition:
Architectural style structuring application as collection of:
- Small, independent services
- Each implementing specific business capability
- Loosely coupled
- Independently deployable
- Owned by small team

Monolith vs Microservices:

MONOLITH:
┌─────────────────────────────────────┐
│         Single Application          │
│  ┌──────────┐  ┌──────────────┐    │
│  │   User   │  │   Product    │    │
│  │ Management│  │  Catalog     │    │
│  └──────────┘  └──────────────┘    │
│  ┌──────────┐  ┌──────────────┐    │
│  │  Order   │  │   Payment    │    │
│  │Processing│  │  Processing  │    │
│  └──────────┘  └──────────────┘    │
│                                     │
│      Single Database                │
│  ┌─────────────────────────────┐   │
│  │  All Business Data          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Characteristics:
✓ Simple to develop initially
✓ Easy local testing
✓ Simple deployment (one artifact)
✗ Tight coupling
✗ Scaling entire application
✗ Long deployment cycles
✗ Technology lock-in
✗ Large team coordination

MICROSERVICES:
┌────────────────┐  ┌────────────────┐
│  User Service  │  │Product Service │
│  ┌──────────┐  │  │  ┌──────────┐  │
│  │   API    │  │  │  │   API    │  │
│  └──────────┘  │  │  └──────────┘  │
│  ┌──────────┐  │  │  ┌──────────┐  │
│  │ User DB  │  │  │  │Product DB│  │
│  └──────────┘  │  │  └──────────┘  │
└────────────────┘  └────────────────┘

┌────────────────┐  ┌────────────────┐
│  Order Service │  │Payment Service │
│  ┌──────────┐  │  │  ┌──────────┐  │
│  │   API    │  │  │  │   API    │  │
│  └──────────┘  │  │  └──────────┘  │
│  ┌──────────┐  │  │  ┌──────────┐  │
│  │ Order DB │  │  │  │Payment DB│  │
│  └──────────┘  │  │  └──────────┘  │
└────────────────┘  └────────────────┘

Characteristics:
✓ Independent deployment
✓ Independent scaling
✓ Technology diversity
✓ Team autonomy
✓ Fault isolation
✗ Distributed system complexity
✗ Network latency
✗ Data consistency challenges
✗ Operational overhead

When to Use Microservices:

✓ Multiple teams (10+ engineers)
✓ Frequent deployments required (daily+)
✓ Different scaling requirements per feature
✓ Need for technology diversity
✓ Independent service lifecycles

When NOT to Use:

✗ Small team (< 5 engineers)
✗ Infrequent deployments (monthly)
✗ Simple CRUD application
✗ Uniform scaling requirements
✗ Limited DevOps maturity

Microservices Design Principles:

1. Single Responsibility:
   Each service owns one business capability
   Example: Order Service handles orders, not payments

2. Loose Coupling:
   Services communicate via well-defined APIs
   Changes to one service don't require changes to others

3. High Cohesion:
   Related functionality grouped together
   User profile and authentication in same service

4. Database per Service:
   Each service owns its data
   No shared databases between services

5. Independently Deployable:
   Deploy service without coordinating with others
   Backwards compatible API changes

6. Design for Failure:
   Assume services will fail
   Implement circuit breakers, retries, timeouts

Service Boundaries:

Bad Boundaries (Too Fine-Grained):
- CreateUserService
- UpdateUserEmailService
- GetUserService
Result: Excessive network calls, coordination overhead

Good Boundaries (Business Capabilities):
- User Service (manages all user operations)
- Product Service (manages product catalog)
- Order Service (manages order lifecycle)
- Payment Service (handles payments)

Finding Right Granularity:
- Domain-Driven Design (bounded contexts)
- Team ownership (can 5-9 people own service?)
- Change frequency (deploy together?)
- Data relationships (need transactions?)
```


### Service Discovery Pattern

**Dynamic Service Location:**

```
Service Discovery Problem:
In microservices, services need to find each other
IP addresses and ports change dynamically
Manual configuration doesn't scale

Service Discovery Approaches:

1. CLIENT-SIDE DISCOVERY:
   Client queries service registry
   Chooses service instance (load balancing)
   Makes request directly

   Flow:
   Client → Service Registry (get service locations)
   Client → Service Instance (direct call)

   AWS Implementation: CloudMap + Client Library
   
   Advantages:
   + Client controls load balancing
   + Fewer network hops
   
   Disadvantages:
   - Client needs discovery logic
   - Tightly coupled to registry

2. SERVER-SIDE DISCOVERY:
   Client makes request to load balancer
   Load balancer queries service registry
   Routes to healthy instance

   Flow:
   Client → Load Balancer
   Load Balancer → Service Registry (get instances)
   Load Balancer → Service Instance (forward request)

   AWS Implementation: ALB/NLB + Target Groups
   
   Advantages:
   + Simpler clients
   + Centralized routing logic
   
   Disadvantages:
   - Additional network hop
   - Load balancer single point of failure

AWS Service Discovery:

Option 1: Application Load Balancer (ALB)
- Target Groups for each service
- Automatic health checking
- Automatic deregistration of unhealthy instances
- DNS-based discovery (service.example.com)

Configuration:
service.example.com → ALB → Target Group → ECS Tasks

Option 2: AWS Cloud Map
- Service registry for resource discovery
- API-based or DNS-based discovery
- Health checking (Route 53 health checks)
- Namespaces organize services

Example:
# Register service
aws servicediscovery create-service \
  --name user-service \
  --namespace-id ns-123 \
  --dns-config "NamespaceId=ns-123,DnsRecords=[{Type=A,TTL=10}]"

# Discover service
dig user-service.myapp.local

# Returns: IP addresses of healthy instances

Option 3: Service Mesh (App Mesh)
- Automatic service discovery
- Built-in load balancing
- Circuit breaking and retries
- Mutual TLS between services

Service Registration:

ECS with Service Discovery:
- Task automatically registered on start
- Health check determines readiness
- Automatically deregistered on stop

Example ECS Service Definition:
{
  "serviceName": "user-service",
  "taskDefinition": "user-service:1",
  "desiredCount": 3,
  "serviceRegistries": [{
    "registryArn": "arn:aws:servicediscovery:...",
    "port": 8080
  }],
  "healthCheckGracePeriodSeconds": 30
}

Result: 
- 3 tasks start
- Each registers with Cloud Map
- DNS returns all 3 IPs
- Failed health check = automatic deregistration

Health Checking:

TCP Health Check:
- Connects to port
- Success if connection established
- Fast but limited (port open ≠ healthy)

HTTP Health Check:
- GET /health endpoint
- Success if 200 status
- Can validate dependencies

Example Health Endpoint:
@app.route('/health')
def health():
    # Check database connectivity
    try:
        db.execute('SELECT 1')
        return {'status': 'healthy'}, 200
    except:
        return {'status': 'unhealthy'}, 503

Custom Health Check:
- Application-specific validation
- Check critical dependencies
- Fail fast if unhealthy

Service Discovery Best Practices:

1. Always implement health checks
2. Use DNS for simple discovery
3. Service mesh for complex scenarios
4. Cache discovery results (reduce latency)
5. Handle service unavailability gracefully
```


### Circuit Breaker Pattern

**Preventing Cascading Failures:**

```
Circuit Breaker Purpose:
Prevent calling failing service repeatedly
Fail fast instead of waiting for timeout
Protect caller from cascading failures

Circuit Breaker States:

1. CLOSED (Normal Operation):
   - Requests pass through normally
   - Success counter incremented
   - Failure counter tracks errors
   - Transition: Failure threshold exceeded → OPEN

2. OPEN (Failing):
   - All requests fail immediately (no call to service)
   - Return cached response or error
   - Start timeout timer
   - Transition: After timeout → HALF-OPEN

3. HALF-OPEN (Testing):
   - Allow limited requests through
   - Test if service recovered
   - Success: Reset counters → CLOSED
   - Failure: Back to OPEN

Circuit Breaker Flow:

Request arrives
├─ Circuit CLOSED?
│  ├─ Yes → Call service
│  │  ├─ Success → Increment success counter
│  │  └─ Failure → Increment failure counter
│  │     └─ Failures > threshold? → Open circuit
│  └─ No → Circuit OPEN or HALF-OPEN?
│     ├─ OPEN → Fail fast (return error/cache)
│     │  └─ Timeout expired? → HALF-OPEN
│     └─ HALF-OPEN → Try limited requests
│        ├─ Success → Close circuit
│        └─ Failure → Back to OPEN

Configuration Parameters:

Failure Threshold:
- Number of failures before opening
- Example: 5 consecutive failures

Timeout Period:
- How long circuit stays open
- Example: 30 seconds

Success Threshold (Half-Open):
- Successes needed to close circuit
- Example: 2 consecutive successes

Example Implementation (Python):

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=30, success_threshold=2):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold
        
        self.failure_count = 0
        self.success_count = 0
        self.state = 'CLOSED'
        self.opened_at = None
    
    def call(self, func, *args, **kwargs):
        if self.state == 'OPEN':
            if time.time() - self.opened_at > self.timeout:
                self.state = 'HALF-OPEN'
                self.success_count = 0
            else:
                raise CircuitOpenException('Circuit breaker is OPEN')
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        self.failure_count = 0
        
        if self.state == 'HALF-OPEN':
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = 'CLOSED'
                print('Circuit breaker CLOSED')
    
    def _on_failure(self):
        self.failure_count += 1
        self.success_count = 0
        
        if self.failure_count >= self.failure_threshold:
            self.state = 'OPEN'
            self.opened_at = time.time()
            print('Circuit breaker OPEN')

# Usage
payment_service_breaker = CircuitBreaker(
    failure_threshold=5,
    timeout=30,
    success_threshold=2
)

def process_payment(order_id):
    try:
        result = payment_service_breaker.call(
            payment_service.charge,
            order_id
        )
        return result
    except CircuitOpenException:
        # Payment service unavailable
        # Return cached response or queue for later
        return {'status': 'pending', 'message': 'Payment queued'}

Without Circuit Breaker:
Order Service → Payment Service (down, 30s timeout)
100 requests/sec × 30s = 3000 hanging requests
Order Service exhausts resources, becomes unavailable
Cascading failure to all dependent services

With Circuit Breaker:
First 5 requests fail (5 × 30s = 150s total)
Circuit opens after 5th failure
Remaining 2,995 requests fail immediately (5ms each)
Order Service stays healthy
Payment Service recovers → circuit closes

AWS Implementation:

App Mesh with Circuit Breaking:
{
  "spec": {
    "listeners": [{
      "portMapping": {"port": 8080, "protocol": "http"},
      "outlierDetection": {
        "maxServerErrors": 5,
        "interval": {"unit": "s", "value": 30},
        "baseEjectionDuration": {"unit": "s", "value": 30},
        "maxEjectionPercent": 50
      }
    }]
  }
}

Result:
- 5 errors in 30s → eject instance
- Ejected for 30s minimum
- Max 50% of instances ejected (prevent total failure)

Best Practices:

1. Set appropriate thresholds (not too sensitive)
2. Implement fallback responses (cache, default values)
3. Monitor circuit breaker state changes
4. Alert when circuit opens (service degradation)
5. Exponential backoff for timeout period
6. Different breakers per dependency
```


### API Composition Pattern

**Aggregating Data from Multiple Services:**

```
API Composition Problem:
UI needs data from multiple microservices
Making separate calls increases latency
Client shouldn't know about all services

API Composition Solutions:

1. API GATEWAY PATTERN:
   Gateway aggregates calls to multiple services
   Returns combined response
   
   Flow:
   Client → API Gateway
   API Gateway → Service A (parallel)
   API Gateway → Service B (parallel)
   API Gateway → Service C (parallel)
   API Gateway ← Combine responses → Client

   AWS Implementation: API Gateway + Lambda

2. BACKEND FOR FRONTEND (BFF):
   Separate backend per client type
   Each BFF optimized for specific client
   
   Mobile BFF: Minimal data, optimized for bandwidth
   Web BFF: Rich data, larger payloads
   Partner API BFF: Different auth, rate limits

Example: Get User Profile

Naive Approach (Client calls each service):
Client → User Service (get user: 100ms)
Client → Order Service (get orders: 150ms)
Client → Payment Service (get payment methods: 120ms)
Total: 370ms (sequential)

API Gateway Approach:
Client → API Gateway
  API Gateway → User Service (100ms) ┐
  API Gateway → Order Service (150ms) ├─ Parallel
  API Gateway → Payment Service (120ms)┘
Total: 150ms (parallel) + Gateway overhead (20ms) = 170ms

54% faster!

Implementation (Lambda + API Gateway):

import boto3
import asyncio
import aiohttp

async def get_user_profile(user_id):
    """Aggregate user data from multiple services"""
    
    async with aiohttp.ClientSession() as session:
        # Parallel requests to services
        user_task = fetch_user(session, user_id)
        orders_task = fetch_orders(session, user_id)
        payments_task = fetch_payment_methods(session, user_id)
        
        # Wait for all
        user, orders, payments = await asyncio.gather(
            user_task,
            orders_task,
            payments_task,
            return_exceptions=True
        )
        
        # Handle failures gracefully
        profile = {
            'user': user if not isinstance(user, Exception) else None,
            'orders': orders if not isinstance(orders, Exception) else [],
            'payment_methods': payments if not isinstance(payments, Exception) else []
        }
        
        return profile

async def fetch_user(session, user_id):
    """Get user from User Service"""
    url = f'http://user-service.local:8080/users/{user_id}'
    
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                raise Exception(f'User service returned {resp.status}')
    except asyncio.TimeoutError:
        # Timeout - fail gracefully
        raise Exception('User service timeout')

async def fetch_orders(session, user_id):
    """Get orders from Order Service"""
    url = f'http://order-service.local:8080/orders?user_id={user_id}'
    
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                return []  # Graceful degradation
    except:
        return []  # Fail gracefully

async def fetch_payment_methods(session, user_id):
    """Get payment methods from Payment Service"""
    url = f'http://payment-service.local:8080/payment-methods?user_id={user_id}'
    
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                return []
    except:
        return []

def lambda_handler(event, context):
    """API Gateway Lambda handler"""
    
    user_id = event['pathParameters']['user_id']
    
    # Run async function in Lambda
    profile = asyncio.run(get_user_profile(user_id))
    
    return {
        'statusCode': 200,
        'body': json.dumps(profile)
    }

Caching Strategy:

Cache at API Gateway:
- Cache combined response
- TTL: 60 seconds
- Reduces backend calls 95%+

Example:
GET /users/123/profile
→ Check cache
→ If miss: Aggregate from services
→ Store in cache (60s TTL)
→ Return to client

Result:
- First request: 170ms
- Cached requests: 10ms (cache hit)
- 94% latency reduction

Fallback Strategies:

1. Partial Response:
   If one service fails, return data from successful services
   
   {
     "user": {...},  // Success
     "orders": null,  // Failed - return null
     "payment_methods": []  // Failed - return empty
   }

2. Cached Fallback:
   If service unavailable, return cached data
   
   response = fetch_from_service()
   if response is None:
       response = get_from_cache()  // Stale but available

3. Default Values:
   Return sensible defaults for non-critical data
   
   {
     "user": {...},
     "orders": [],  // Default: empty array
     "recommendations": []  // Default: empty
   }

GraphQL as API Composition:

GraphQL query defines data needs:
query {
  user(id: "123") {
    name
    email
    orders {
      id
      total
      items {
        product_name
        quantity
      }
    }
  }
}

GraphQL resolver aggregates data:
- User resolver → User Service
- Orders resolver → Order Service
- Items resolver → Product Service

Benefits:
+ Client specifies exact data needed
+ No over-fetching
+ Single request
+ Strongly typed schema

Disadvantages:
- More complex implementation
- Caching more difficult
- N+1 query problem (requires DataLoader)
```


### Saga Pattern (Distributed Transactions)

**Managing Data Consistency Across Services:**

```
Saga Pattern Purpose:
Maintain data consistency across multiple services
No distributed transactions (ACID across services)
Eventual consistency through compensation

Problem: Distributed Transactions

Order Process (Multiple Services):
1. Create Order (Order Service)
2. Reserve Inventory (Inventory Service)
3. Charge Payment (Payment Service)
4. Send Confirmation (Notification Service)

What if payment fails after inventory reserved?
Need to rollback inventory reservation
But can't use database transactions across services!

Saga Patterns:

1. CHOREOGRAPHY SAGA:
   Services publish events
   Other services react to events
   No central coordinator
   
   Flow:
   Order Service: Create order → Publish "OrderCreated"
   Inventory Service: Listen "OrderCreated" → Reserve → Publish "InventoryReserved"
   Payment Service: Listen "InventoryReserved" → Charge → Publish "PaymentCompleted"
   Notification Service: Listen "PaymentCompleted" → Send Email

   Compensation (Payment Fails):
   Payment Service: Charge fails → Publish "PaymentFailed"
   Inventory Service: Listen "PaymentFailed" → Release reservation
   Order Service: Listen "PaymentFailed" → Cancel order

   Advantages:
   + Simple (no coordinator)
   + Loosely coupled
   
   Disadvantages:
   - Hard to track overall state
   - Difficult debugging
   - Cyclic dependencies possible

2. ORCHESTRATION SAGA:
   Central orchestrator coordinates services
   Orchestrator knows full workflow
   Tells each service what to do
   
   Flow:
   Client → Order Orchestrator
   Orchestrator → Order Service: Create order
   Orchestrator → Inventory Service: Reserve inventory
   Orchestrator → Payment Service: Charge payment
   Orchestrator → Notification Service: Send email

   Compensation (Payment Fails):
   Orchestrator detects payment failure
   Orchestrator → Inventory Service: Release reservation
   Orchestrator → Order Service: Cancel order
   Orchestrator → Client: Return error

   Advantages:
   + Centralized logic (easier to understand)
   + Easy to track state
   + Clear compensation logic
   
   Disadvantages:
   - Central point of failure
   - Orchestrator can become complex

Saga Implementation (AWS Step Functions):

{
  "Comment": "Order Processing Saga",
  "StartAt": "CreateOrder",
  "States": {
    "CreateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:CreateOrder",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "ResultPath": "$.error",
        "Next": "OrderFailed"
      }],
      "Next": "ReserveInventory"
    },
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:ReserveInventory",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "ResultPath": "$.error",
        "Next": "CancelOrder"
      }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:ChargePayment",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "ResultPath": "$.error",
        "Next": "ReleaseInventory"
      }],
      "Next": "SendConfirmation"
    },
    "SendConfirmation": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:SendConfirmation",
      "End": true
    },
    "ReleaseInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:ReleaseInventory",
      "Next": "CancelOrder"
    },
    "CancelOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:region:account:function:CancelOrder",
      "Next": "OrderFailed"
    },
    "OrderFailed": {
      "Type": "Fail"
    }
  }
}

Happy Path:
CreateOrder → ReserveInventory → ChargePayment → SendConfirmation
Duration: ~2 seconds

Failure Path (Payment Fails):
CreateOrder → ReserveInventory → ChargePayment (fails)
→ ReleaseInventory → CancelOrder → OrderFailed
Duration: ~3 seconds

Event-Driven Saga (EventBridge):

Order Service publishes events:
await eventbridge.put_events(
    Entries=[{
        'Source': 'order-service',
        'DetailType': 'OrderCreated',
        'Detail': json.dumps({
            'order_id': '12345',
            'user_id': 'user-789',
            'items': [...]
        })
    }]
)

Inventory Service listens:
# EventBridge rule triggers Lambda
def handle_order_created(event):
    order = json.loads(event['detail'])
    
    try:
        # Reserve inventory
        reserve_inventory(order['items'])
        
        # Publish success
        eventbridge.put_events(
            Entries=[{
                'Source': 'inventory-service',
                'DetailType': 'InventoryReserved',
                'Detail': json.dumps({
                    'order_id': order['order_id']
                })
            }]
        )
    except InsufficientInventoryError:
        # Publish failure
        eventbridge.put_events(
            Entries=[{
                'Source': 'inventory-service',
                'DetailType': 'InventoryReservationFailed',
                'Detail': json.dumps({
                    'order_id': order['order_id'],
                    'reason': 'Insufficient inventory'
                })
            }]
        )

Compensation Actions:

Each service must implement compensation:

class OrderService:
    def create_order(self, order_data):
        order_id = db.insert(order_data)
        return order_id
    
    def cancel_order(self, order_id):
        # Compensation action
        db.update(order_id, status='cancelled')
        refund_if_charged(order_id)

class InventoryService:
    def reserve_inventory(self, items):
        for item in items:
            db.decrement(item['product_id'], item['quantity'])
    
    def release_inventory(self, items):
        # Compensation action
        for item in items:
            db.increment(item['product_id'], item['quantity'])

Best Practices:

1. Idempotency:
   Services must handle duplicate requests
   Use idempotency keys
   
   if order_already_exists(order_id):
       return existing_order  // Don't create duplicate

2. Timeout Handling:
   Set timeouts for each step
   Automatic compensation on timeout

3. Monitoring:
   Track saga execution
   Alert on frequent compensations
   Dashboard showing success vs failure rates

4. Testing:
   Test compensation paths
   Chaos engineering (inject failures)
   Validate eventual consistency
```

## Hands-On Implementation

### Lab 1: Building Microservices with ECS

**Objective:** Deploy microservices architecture using Amazon ECS with service discovery.

**Step 1: Create VPC and ECS Cluster**

```python
import boto3
import json

ec2 = boto3.client('ec2')
ecs = boto3.client('ecs')
servicediscovery = boto3.client('servicediscovery')

def create_microservices_infrastructure():
    """Create VPC and ECS cluster for microservices"""
    
    print("=== Creating Microservices Infrastructure ===\n")
    
    # Create VPC
    vpc_response = ec2.create_vpc(
        CidrBlock='10.0.0.0/16',
        TagSpecifications=[{
            'ResourceType': 'vpc',
            'Tags': [
                {'Key': 'Name', 'Value': 'Microservices-VPC'},
                {'Key': 'Purpose', 'Value': 'Microservices Demo'}
            ]
        }]
    )
    
    vpc_id = vpc_response['Vpc']['VpcId']
    
    print(f"Created VPC: {vpc_id}")
    
    # Create subnets (2 AZs for high availability)
    subnet1 = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.1.0/24',
        AvailabilityZone='us-east-1a',
        TagSpecifications=[{
            'ResourceType': 'subnet',
            'Tags': [{'Key': 'Name', 'Value': 'Microservices-Subnet-1a'}]
        }]
    )
    
    subnet2 = ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.2.0/24',
        AvailabilityZone='us-east-1b',
        TagSpecifications=[{
            'ResourceType': 'subnet',
            'Tags': [{'Key': 'Name', 'Value': 'Microservices-Subnet-1b'}]
        }]
    )
    
    subnet1_id = subnet1['Subnet']['SubnetId']
    subnet2_id = subnet2['Subnet']['SubnetId']
    
    print(f"Created subnets: {subnet1_id}, {subnet2_id}")
    
    # Create ECS cluster
    cluster_response = ecs.create_cluster(
        clusterName='microservices-cluster',
        capacityProviders=['FARGATE', 'FARGATE_SPOT'],
        defaultCapacityProviderStrategy=[
            {
                'capacityProvider': 'FARGATE',
                'weight': 1,
                'base': 2
            }
        ],
        tags=[
            {'key': 'Name', 'value': 'Microservices Cluster'},
            {'key': 'Environment', 'value': 'Production'}
        ]
    )
    
    cluster_arn = cluster_response['cluster']['clusterArn']
    
    print(f"Created ECS cluster: {cluster_arn}")
    
    # Create Cloud Map namespace for service discovery
    namespace_response = servicediscovery.create_private_dns_namespace(
        Name='microservices.local',
        Vpc=vpc_id,
        Description='Service discovery namespace for microservices'
    )
    
    namespace_id = namespace_response['OperationId']
    
    print(f"Created Cloud Map namespace: microservices.local")
    
    return {
        'vpc_id': vpc_id,
        'subnet_ids': [subnet1_id, subnet2_id],
        'cluster_arn': cluster_arn,
        'namespace_id': namespace_id
    }

infra = create_microservices_infrastructure()
```

**Step 2: Deploy User Service**

```python
def deploy_user_service(infra):
    """Deploy User Service microservice"""
    
    print("\n=== Deploying User Service ===\n")
    
    # Create task definition
    task_definition = {
        'family': 'user-service',
        'networkMode': 'awsvpc',
        'requiresCompatibilities': ['FARGATE'],
        'cpu': '256',
        'memory': '512',
        'containerDefinitions': [
            {
                'name': 'user-service',
                'image': '123456789012.dkr.ecr.us-east-1.amazonaws.com/user-service:latest',
                'portMappings': [
                    {
                        'containerPort': 8080,
                        'protocol': 'tcp'
                    }
                ],
                'environment': [
                    {'name': 'SERVICE_NAME', 'value': 'user-service'},
                    {'name': 'PORT', 'value': '8080'},
                    {'name': 'DB_HOST', 'value': 'user-db.abc123.us-east-1.rds.amazonaws.com'}
                ],
                'logConfiguration': {
                    'logDriver': 'awslogs',
                    'options': {
                        'awslogs-group': '/ecs/user-service',
                        'awslogs-region': 'us-east-1',
                        'awslogs-stream-prefix': 'ecs'
                    }
                },
                'healthCheck': {
                    'command': ['CMD-SHELL', 'curl -f http://localhost:8080/health || exit 1'],
                    'interval': 30,
                    'timeout': 5,
                    'retries': 3,
                    'startPeriod': 60
                }
            }
        ],
        'executionRoleArn': 'arn:aws:iam::123456789012:role/ecsTaskExecutionRole',
        'taskRoleArn': 'arn:aws:iam::123456789012:role/UserServiceTaskRole'
    }
    
    task_def_response = ecs.register_task_definition(**task_definition)
    
    task_def_arn = task_def_response['taskDefinition']['taskDefinitionArn']
    
    print(f"Registered task definition: {task_def_arn}")
    
    # Create service discovery service
    sd_service = servicediscovery.create_service(
        Name='user-service',
        NamespaceId=infra['namespace_id'],
        DnsConfig={
            'NamespaceId': infra['namespace_id'],
            'DnsRecords': [
                {
                    'Type': 'A',
                    'TTL': 10
                }
            ]
        },
        HealthCheckCustomConfig={
            'FailureThreshold': 1
        }
    )
    
    sd_service_arn = sd_service['Service']['Arn']
    
    print(f"Created service discovery service: user-service.microservices.local")
    
    # Create security group for service
    sg_response = ec2.create_security_group(
        GroupName='user-service-sg',
        Description='Security group for User Service',
        VpcId=infra['vpc_id']
    )
    
    sg_id = sg_response['GroupId']
    
    # Allow inbound traffic on port 8080 from VPC
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {
                'IpProtocol': 'tcp',
                'FromPort': 8080,
                'ToPort': 8080,
                'IpRanges': [{'CidrIp': '10.0.0.0/16'}]
            }
        ]
    )
    
    print(f"Created security group: {sg_id}")
    
    # Create ECS service
    service_response = ecs.create_service(
        cluster=infra['cluster_arn'],
        serviceName='user-service',
        taskDefinition=task_def_arn,
        desiredCount=2,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': infra['subnet_ids'],
                'securityGroups': [sg_id],
                'assignPublicIp': 'DISABLED'
            }
        },
        serviceRegistries=[
            {
                'registryArn': sd_service_arn
            }
        ],
        healthCheckGracePeriodSeconds=60,
        deploymentConfiguration={
            'maximumPercent': 200,
            'minimumHealthyPercent': 100,
            'deploymentCircuitBreaker': {
                'enable': True,
                'rollback': True
            }
        }
    )
    
    print(f"Created ECS service: user-service")
    print(f"  Desired count: 2 tasks")
    print(f"  Discovery: user-service.microservices.local:8080")
    
    return service_response['service']['serviceArn']

user_service_arn = deploy_user_service(infra)
```

**Step 3: Deploy Order Service with Service-to-Service Communication**

```python
def deploy_order_service(infra):
    """Deploy Order Service that calls User Service"""
    
    print("\n=== Deploying Order Service ===\n")
    
    # Task definition with environment variable for User Service endpoint
    task_definition = {
        'family': 'order-service',
        'networkMode': 'awsvpc',
        'requiresCompatibilities': ['FARGATE'],
        'cpu': '256',
        'memory': '512',
        'containerDefinitions': [
            {
                'name': 'order-service',
                'image': '123456789012.dkr.ecr.us-east-1.amazonaws.com/order-service:latest',
                'portMappings': [
                    {
                        'containerPort': 8081,
                        'protocol': 'tcp'
                    }
                ],
                'environment': [
                    {'name': 'SERVICE_NAME', 'value': 'order-service'},
                    {'name': 'PORT', 'value': '8081'},
                    {'name': 'USER_SERVICE_URL', 'value': 'http://user-service.microservices.local:8080'},
                    {'name': 'PAYMENT_SERVICE_URL', 'value': 'http://payment-service.microservices.local:8082'},
                    {'name': 'DB_HOST', 'value': 'order-db.abc123.us-east-1.rds.amazonaws.com'}
                ],
                'logConfiguration': {
                    'logDriver': 'awslogs',
                    'options': {
                        'awslogs-group': '/ecs/order-service',
                        'awslogs-region': 'us-east-1',
                        'awslogs-stream-prefix': 'ecs'
                    }
                },
                'healthCheck': {
                    'command': ['CMD-SHELL', 'curl -f http://localhost:8081/health || exit 1'],
                    'interval': 30,
                    'timeout': 5,
                    'retries': 3
                }
            }
        ],
        'executionRoleArn': 'arn:aws:iam::123456789012:role/ecsTaskExecutionRole',
        'taskRoleArn': 'arn:aws:iam::123456789012:role/OrderServiceTaskRole'
    }
    
    task_def_response = ecs.register_task_definition(**task_definition)
    
    print(f"Registered Order Service task definition")
    
    # Create service discovery
    sd_service = servicediscovery.create_service(
        Name='order-service',
        NamespaceId=infra['namespace_id'],
        DnsConfig={
            'NamespaceId': infra['namespace_id'],
            'DnsRecords': [{'Type': 'A', 'TTL': 10}]
        },
        HealthCheckCustomConfig={'FailureThreshold': 1}
    )
    
    print(f"Created service discovery: order-service.microservices.local")
    
    # Create security group
    sg_response = ec2.create_security_group(
        GroupName='order-service-sg',
        Description='Security group for Order Service',
        VpcId=infra['vpc_id']
    )
    
    sg_id = sg_response['GroupId']
    
    ec2.authorize_security_group_ingress(
        GroupId=sg_id,
        IpPermissions=[
            {
                'IpProtocol': 'tcp',
                'FromPort': 8081,
                'ToPort': 8081,
                'IpRanges': [{'CidrIp': '10.0.0.0/16'}]
            }
        ]
    )
    
    # Create ECS service
    service_response = ecs.create_service(
        cluster=infra['cluster_arn'],
        serviceName='order-service',
        taskDefinition=task_def_response['taskDefinition']['taskDefinitionArn'],
        desiredCount=2,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': infra['subnet_ids'],
                'securityGroups': [sg_id],
                'assignPublicIp': 'DISABLED'
            }
        },
        serviceRegistries=[
            {
                'registryArn': sd_service['Service']['Arn']
            }
        ],
        deploymentConfiguration={
            'maximumPercent': 200,
            'minimumHealthyPercent': 100,
            'deploymentCircuitBreaker': {
                'enable': True,
                'rollback': True
            }
        }
    )
    
    print(f"Created ECS service: order-service")
    print(f"\nService Communication:")
    print(f"  Order Service → User Service (http://user-service.microservices.local:8080)")
    print(f"  Order Service → Payment Service (http://payment-service.microservices.local:8082)")

deploy_order_service(infra)
```

**Step 4: Implement Circuit Breaker in Service Code**

```python
# Example Order Service code with circuit breaker

import requests
from pybreaker import CircuitBreaker

# Create circuit breakers for dependencies
user_service_breaker = CircuitBreaker(
    fail_max=5,
    timeout_duration=30,
    name='user-service'
)

payment_service_breaker = CircuitBreaker(
    fail_max=5,
    timeout_duration=30,
    name='payment-service'
)

class OrderService:
    """Order Service with circuit breaker pattern"""
    
    def __init__(self):
        self.user_service_url = os.getenv('USER_SERVICE_URL')
        self.payment_service_url = os.getenv('PAYMENT_SERVICE_URL')
    
    @user_service_breaker
    def get_user(self, user_id):
        """Get user with circuit breaker protection"""
        try:
            response = requests.get(
                f'{self.user_service_url}/users/{user_id}',
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f'User service error: {e}')
            raise
    
    @payment_service_breaker
    def process_payment(self, payment_data):
        """Process payment with circuit breaker protection"""
        try:
            response = requests.post(
                f'{self.payment_service_url}/payments',
                json=payment_data,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f'Payment service error: {e}')
            raise
    
    def create_order(self, order_data):
        """Create order with graceful degradation"""
        
        user_id = order_data['user_id']
        
        # Get user with circuit breaker
        try:
            user = self.get_user(user_id)
        except CircuitBreakerError:
            # Circuit open - use cached user data or fail gracefully
            logger.warning(f'User service circuit open for user {user_id}')
            user = self.get_cached_user(user_id)
            
            if not user:
                return {
                    'error': 'User service unavailable',
                    'status': 'pending',
                    'message': 'Order will be processed when services recover'
                }
        except Exception as e:
            logger.error(f'Error fetching user: {e}')
            return {'error': 'Failed to fetch user'}
        
        # Create order in database
        order = self.db.create_order({
            'user_id': user_id,
            'items': order_data['items'],
            'total': order_data['total'],
            'status': 'pending'
        })
        
        # Process payment with circuit breaker
        try:
            payment_result = self.process_payment({
                'order_id': order['id'],
                'amount': order['total'],
                'user_id': user_id
            })
            
            # Update order status
            self.db.update_order(order['id'], {
                'status': 'confirmed',
                'payment_id': payment_result['payment_id']
            })
            
            return {
                'order_id': order['id'],
                'status': 'confirmed',
                'message': 'Order created successfully'
            }
        
        except CircuitBreakerError:
            # Payment service circuit open - queue payment for later
            logger.warning(f'Payment service circuit open for order {order["id"]}')
            
            self.queue_payment_for_retry(order['id'], order['total'])
            
            return {
                'order_id': order['id'],
                'status': 'pending_payment',
                'message': 'Order created, payment will be processed shortly'
            }
        
        except Exception as e:
            logger.error(f'Payment processing error: {e}')
            
            # Cancel order
            self.db.update_order(order['id'], {'status': 'failed'})
            
            return {
                'error': 'Payment processing failed',
                'order_id': order['id']
            }
    
    def get_cached_user(self, user_id):
        """Get user from cache (fallback)"""
        cache_key = f'user:{user_id}'
        return redis.get(cache_key)
    
    def queue_payment_for_retry(self, order_id, amount):
        """Queue payment for retry when service recovers"""
        sqs = boto3.client('sqs')
        
        sqs.send_message(
            QueueUrl=os.getenv('PAYMENT_RETRY_QUEUE_URL'),
            MessageBody=json.dumps({
                'order_id': order_id,
                'amount': amount,
                'retry_count': 0
            })
        )

# Flask API endpoint
@app.route('/orders', methods=['POST'])
def create_order_endpoint():
    order_data = request.json
    
    order_service = OrderService()
    result = order_service.create_order(order_data)
    
    if 'error' in result:
        return jsonify(result), 500
    else:
        return jsonify(result), 201

# Health check endpoint
@app.route('/health')
def health():
    """Health check with dependency status"""
    
    health_status = {
        'status': 'healthy',
        'service': 'order-service',
        'dependencies': {
            'user_service': user_service_breaker.current_state,
            'payment_service': payment_service_breaker.current_state,
            'database': check_database_health()
        }
    }
    
    # If any circuit breaker open, report degraded
    if (user_service_breaker.current_state == 'open' or 
        payment_service_breaker.current_state == 'open'):
        health_status['status'] = 'degraded'
        return jsonify(health_status), 200
    
    return jsonify(health_status), 200
```


### Lab 2: Implementing Service Mesh with AWS App Mesh

**Objective:** Add service mesh for advanced traffic management and observability.

**Step 1: Create App Mesh**

```python
appmesh = boto3.client('appmesh')

def create_app_mesh():
    """Create App Mesh for microservices"""
    
    print("\n=== Creating App Mesh ===\n")
    
    # Create mesh
    mesh_response = appmesh.create_mesh(
        meshName='microservices-mesh',
        spec={
            'egressFilter': {
                'type': 'ALLOW_ALL'
            }
        },
        tags=[
            {'key': 'Environment', 'value': 'Production'}
        ]
    )
    
    mesh_name = mesh_response['mesh']['meshName']
    
    print(f"Created App Mesh: {mesh_name}")
    
    return mesh_name

mesh_name = create_app_mesh()
```

**Step 2: Create Virtual Nodes**

```python
def create_virtual_node(mesh_name, node_name, service_discovery_name, port):
    """Create virtual node for a microservice"""
    
    print(f"\nCreating virtual node: {node_name}")
    
    virtual_node = appmesh.create_virtual_node(
        meshName=mesh_name,
        virtualNodeName=node_name,
        spec={
            'listeners': [
                {
                    'portMapping': {
                        'port': port,
                        'protocol': 'http'
                    },
                    'healthCheck': {
                        'protocol': 'http',
                        'path': '/health',
                        'healthyThreshold': 2,
                        'unhealthyThreshold': 3,
                        'timeoutMillis': 5000,
                        'intervalMillis': 30000
                    },
                    'outlierDetection': {
                        'maxServerErrors': 5,
                        'interval': {
                            'unit': 's',
                            'value': 30
                        },
                        'baseEjectionDuration': {
                            'unit': 's',
                            'value': 30
                        },
                        'maxEjectionPercent': 50
                    }
                }
            ],
            'serviceDiscovery': {
                'awsCloudMap': {
                    'namespaceName': 'microservices.local',
                    'serviceName': service_discovery_name
                }
            },
            'logging': {
                'accessLog': {
                    'file': {
                        'path': '/dev/stdout'
                    }
                }
            }
        }
    )
    
    print(f"  Created virtual node: {virtual_node['virtualNode']['virtualNodeName']}")
    
    return virtual_node['virtualNode']['virtualNodeName']

# Create virtual nodes for each service
user_vnode = create_virtual_node(mesh_name, 'user-service-vn', 'user-service', 8080)
order_vnode = create_virtual_node(mesh_name, 'order-service-vn', 'order-service', 8081)
payment_vnode = create_virtual_node(mesh_name, 'payment-service-vn', 'payment-service', 8082)
```

**Step 3: Create Virtual Services and Routes**

```python
def create_virtual_service_with_routing(mesh_name, service_name, virtual_node):
    """Create virtual service with routing rules"""
    
    print(f"\nCreating virtual service: {service_name}")
    
    # Create virtual router
    router = appmesh.create_virtual_router(
        meshName=mesh_name,
        virtualRouterName=f'{service_name}-router',
        spec={
            'listeners': [
                {
                    'portMapping': {
                        'port': 8080 if 'user' in service_name else 
                               (8081 if 'order' in service_name else 8082),
                        'protocol': 'http'
                    }
                }
            ]
        }
    )
    
    router_name = router['virtualRouter']['virtualRouterName']
    
    # Create route with weighted targets (for canary deployments)
    route = appmesh.create_route(
        meshName=mesh_name,
        virtualRouterName=router_name,
        routeName=f'{service_name}-route',
        spec={
            'httpRoute': {
                'match': {
                    'prefix': '/'
                },
                'action': {
                    'weightedTargets': [
                        {
                            'virtualNode': virtual_node,
                            'weight': 100  # 100% to current version
                        }
                    ]
                },
                'retryPolicy': {
                    'httpRetryEvents': [
                        'server-error',
                        'gateway-error'
                    ],
                    'maxRetries': 3,
                    'perRetryTimeout': {
                        'unit': 's',
                        'value': 5
                    }
                },
                'timeout': {
                    'perRequest': {
                        'unit': 's',
                        'value': 15
                    }
                }
            }
        }
    )
    
    # Create virtual service
    vservice = appmesh.create_virtual_service(
        meshName=mesh_name,
        virtualServiceName=f'{service_name}.microservices.local',
        spec={
            'provider': {
                'virtualRouter': {
                    'virtualRouterName': router_name
                }
            }
        }
    )
    
    print(f"  Created virtual service: {vservice['virtualService']['virtualServiceName']}")
    print(f"  Retry policy: 3 retries on server/gateway errors")
    print(f"  Timeout: 15s per request")
    
    return vservice['virtualService']['virtualServiceName']

# Create virtual services
user_vs = create_virtual_service_with_routing(mesh_name, 'user-service', user_vnode)
order_vs = create_virtual_service_with_routing(mesh_name, 'order-service', order_vnode)
payment_vs = create_virtual_service_with_routing(mesh_name, 'payment-service', payment_vnode)
```

**Step 4: Implement Canary Deployment with App Mesh**

```python
def canary_deployment(mesh_name, service_name, router_name, 
                      current_node, canary_node, canary_percentage):
    """Implement canary deployment with traffic splitting"""
    
    print(f"\n=== Canary Deployment: {service_name} ===\n")
    print(f"Routing {canary_percentage}% traffic to canary version")
    
    # Update route to split traffic
    route = appmesh.update_route(
        meshName=mesh_name,
        virtualRouterName=router_name,
        routeName=f'{service_name}-route',
        spec={
            'httpRoute': {
                'match': {
                    'prefix': '/'
                },
                'action': {
                    'weightedTargets': [
                        {
                            'virtualNode': current_node,
                            'weight': 100 - canary_percentage
                        },
                        {
                            'virtualNode': canary_node,
                            'weight': canary_percentage
                        }
                    ]
                },
                'retryPolicy': {
                    'httpRetryEvents': ['server-error'],
                    'maxRetries': 3,
                    'perRetryTimeout': {
                        'unit': 's',
                        'value': 5
                    }
                }
            }
        }
    )
    
    print(f"Traffic split updated:")
    print(f"  Current version: {100 - canary_percentage}%")
    print(f"  Canary version: {canary_percentage}%")
    
    return route

# Gradual canary rollout
def gradual_canary_rollout(mesh_name, service_name, router_name, 
                          current_node, canary_node):
    """Gradually increase canary traffic"""
    
    stages = [10, 25, 50, 75, 100]
    
    for percentage in stages:
        print(f"\n--- Stage: {percentage}% to canary ---")
        
        canary_deployment(
            mesh_name, service_name, router_name,
            current_node, canary_node, percentage
        )
        
        # Monitor metrics
        print(f"Monitoring metrics for 5 minutes...")
        time.sleep(300)  # 5 minutes
        
        # Check error rate
        error_rate = check_error_rate(service_name)
        
        if error_rate > 1.0:  # More than 1% errors
            print(f"⚠️  High error rate detected: {error_rate}%")
            print("Rolling back to previous version...")
            
            # Rollback - set canary to 0%
            canary_deployment(
                mesh_name, service_name, router_name,
                current_node, canary_node, 0
            )
            
            print("✗ Canary deployment rolled back")
            return False
        
        print(f"✓ Stage {percentage}% successful (error rate: {error_rate}%)")
    
    print("\n✓ Canary deployment completed successfully")
    print("100% traffic now on canary version")
    
    return True

def check_error_rate(service_name):
    """Check service error rate from CloudWatch"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='HTTPCode_Target_5XX_Count',
        Dimensions=[
            {'Name': 'TargetGroup', 'Value': f'targetgroup/{service_name}'}
        ],
        StartTime=datetime.utcnow() - timedelta(minutes=5),
        EndTime=datetime.utcnow(),
        Period=300,
        Statistics=['Sum']
    )
    
    if response['Datapoints']:
        errors = response['Datapoints'][0]['Sum']
        # Calculate error rate percentage
        # (This is simplified - would need total request count)
        return errors / 100  # Simplified calculation
    
    return 0.0

# Execute canary rollout
success = gradual_canary_rollout(
    mesh_name='microservices-mesh',
    service_name='user-service',
    router_name='user-service-router',
    current_node='user-service-v1-vn',
    canary_node='user-service-v2-vn'
)
```


## Production-Level Knowledge

### Distributed Tracing and Observability

**Understanding Request Flow Across Services:**

```
Observability Challenges in Microservices:

1. Request spans multiple services
2. Each service logs independently
3. No single view of request path
4. Performance bottlenecks hard to identify
5. Failures cascade in unpredictable ways

Observability Pillars:

1. METRICS:
   - Quantitative measurements
   - Request rate, error rate, duration
   - Resource utilization (CPU, memory)
   - Business metrics (orders/sec, revenue)

2. LOGS:
   - Discrete events
   - Application logs, access logs
   - Error messages, debug information
   - Structured logging (JSON)

3. TRACES:
   - Request path through services
   - Timing for each service call
   - Parent-child relationships
   - End-to-end visibility

AWS X-Ray for Distributed Tracing:

Request Flow:
Client → API Gateway → User Service → Order Service → Payment Service
         │              │               │               │
         └──────────────┴───────────────┴───────────────┘
                    All send traces to X-Ray

X-Ray Trace Structure:
Trace ID: abc123 (unique per request)
├─ Segment: API Gateway (10ms)
├─ Segment: User Service (50ms)
│  └─ Subsegment: Database query (40ms)
├─ Segment: Order Service (100ms)
│  ├─ Subsegment: User Service call (50ms)
│  ├─ Subsegment: Database query (30ms)
│  └─ Subsegment: Payment Service call (80ms)
└─ Segment: Payment Service (80ms)
   ├─ Subsegment: External API (60ms)
   └─ Subsegment: Database update (15ms)

Total: 240ms (with parallelization)

Implementing X-Ray in Services:

Python (Flask):
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

app = Flask(__name__)
XRayMiddleware(app, xray_recorder)

@app.route('/orders', methods=['POST'])
def create_order():
    # Automatic trace segment created
    
    # Add metadata
    xray_recorder.put_metadata('user_id', user_id)
    xray_recorder.put_annotation('order_type', 'online')
    
    # Downstream calls automatically traced
    user = requests.get(f'{USER_SERVICE_URL}/users/{user_id}')
    
    return jsonify({'order_id': order_id})

Node.js (Express):
const AWSXRay = require('aws-xray-sdk-core');
const express = require('express');

const app = express();
app.use(AWSXRay.express.openSegment('order-service'));

app.post('/orders', async (req, res) => {
  const segment = AWSXRay.getSegment();
  
  segment.addMetadata('user_id', req.body.user_id);
  segment.addAnnotation('order_type', 'online');
  
  // Downstream calls traced
  const user = await axios.get(`${USER_SERVICE_URL}/users/${userId}`);
  
  res.json({order_id: orderId});
});

app.use(AWSXRay.express.closeSegment());

X-Ray Service Map:
Visualizes service dependencies and health

[Client] → [API Gateway] → [User Service] ⇄ [User DB]
                ↓
           [Order Service] → [Order DB]
                ↓
           [Payment Service] → [Payment API]

Color coding:
- Green: Healthy (< 1% errors)
- Yellow: Degraded (1-5% errors)
- Red: Unhealthy (> 5% errors)

Response time annotations show bottlenecks

Analyzing Traces:

Query for slow requests:
service("order-service") AND duration > 1000

Query for errors:
service("payment-service") AND http.status = 500

Query for specific user:
annotation.user_id = "user-123"

Trace Analytics:
- P50, P90, P99 latencies per service
- Error rates over time
- Service dependency graph
- Slowest operations

CloudWatch Logs Insights:

Correlated Logging:
Each log entry includes trace ID
Enables jumping from X-Ray trace to logs

fields @timestamp, @message, traceId
| filter service = "order-service"
| filter traceId = "abc123"
| sort @timestamp desc

Structured Logging Best Practices:

import json
import logging

logger = logging.getLogger(__name__)

def create_order(order_data):
    trace_id = xray_recorder.current_segment().trace_id
    
    logger.info(json.dumps({
        'event': 'order_created',
        'order_id': order_id,
        'user_id': user_id,
        'total': total,
        'trace_id': trace_id,
        'timestamp': datetime.utcnow().isoformat()
    }))

Benefits:
- Machine parseable
- Consistent format
- Easy querying
- Correlation with traces

Monitoring Dashboards:

Service-Level Dashboards:
- Request rate (req/sec)
- Error rate (%)
- P50, P90, P99 latency
- Active connections
- Circuit breaker states
- Dependency health

Business-Level Dashboards:
- Orders per minute
- Revenue per hour
- Conversion rate
- Cart abandonment rate
- Payment success rate

Alerting Strategy:

1. Symptom-Based Alerts:
   - Error rate > 1% for 5 minutes
   - P99 latency > 1000ms for 5 minutes
   - Request rate drops > 50%

2. Cause-Based Alerts:
   - CPU > 80% for 10 minutes
   - Memory > 90%
   - Database connections exhausted

3. SLO-Based Alerts:
   - Availability < 99.9% over 30 days
   - Error budget 50% consumed

Alert Fatigue Prevention:
- Alerts must be actionable
- Appropriate severity levels
- Proper alert routing
- Runbooks for each alert
- Regular alert review and tuning
```


## Tips \& Best Practices

**Tip 1: Start with Monolith, Migrate to Microservices**
Build monolith first, identify bounded contexts, then extract microservices—premature microservices increases complexity without benefits.

**Tip 2: One Database Per Service**
Each microservice owns its data—prevents tight coupling, enables independent scaling, allows technology diversity per service needs.

**Tip 3: Implement Health Checks Properly**
Deep health checks validate dependencies (database, downstream services)—enables accurate service discovery and prevents routing to unhealthy instances.

**Tip 4: Use Correlation IDs**
Pass correlation ID through all service calls—enables tracing requests across services, correlating logs, debugging distributed systems.

**Tip 5: Design for Failure**
Assume every service call can fail—implement circuit breakers, timeouts, retries, fallbacks, graceful degradation.

**Tip 6: Version APIs Explicitly**
Use versioned APIs (/v1/orders, /v2/orders)—enables backward-compatible changes, gradual migration, multiple versions running simultaneously.

**Tip 7: Implement Contract Testing**
Consumer-driven contract tests validate service compatibility—catches breaking changes before deployment, enables independent releases.

**Tip 8: Monitor Circuit Breaker States**
Alert when circuit breakers open—indicates service degradation requiring investigation, prevents silent failures.

**Tip 9: Use Asynchronous Communication**
Event-driven communication for non-critical paths—reduces coupling, improves resilience, enables eventual consistency.

**Tip 10: Invest in Observability Early**
Distributed tracing, structured logging, metrics from day one—distributed systems impossible to debug without comprehensive observability.

## Chapter Summary

Microservices architecture decomposes monolithic applications into independent, loosely-coupled services enabling deployment velocity, independent scaling, technology diversity, and team autonomy required for modern business agility. Success requires implementing proven patterns—service discovery for dynamic service location, circuit breakers preventing cascading failures, API composition aggregating data efficiently, saga patterns maintaining data consistency, and comprehensive observability through distributed tracing. Organizations adopting microservices without addressing distributed systems complexity through service mesh, robust monitoring, and resilience patterns experience 3× operational overhead and longer mean time to recovery; proper implementation delivers 10× deployment frequency, independent service scaling, and technology choices optimized per service requirements.

**Key Takeaways:**

- **Service Discovery Essential:** Cloud Map or ALB-based discovery enables dynamic service location; services find each other automatically as instances scale
- **Circuit Breakers Prevent Cascades:** Fail fast when dependencies unavailable; prevents resource exhaustion, enables graceful degradation, protects caller services
- **Observe Everything:** X-Ray distributed tracing, structured logging, service metrics required—distributed systems impossible to debug without comprehensive observability
- **Design for Failure:** Every service call can fail; timeouts, retries, circuit breakers, fallbacks, graceful degradation non-negotiable
- **Database Per Service:** Each service owns data; prevents tight coupling, enables independent scaling and technology choices
- **Start Simple, Evolve:** Begin with monolith or few services, extract microservices as team grows and requirements demand
- **Invest in Service Mesh:** App Mesh provides circuit breaking, retries, traffic splitting, mutual TLS—offloads complexity from application code

Microservices trade-offs: increased deployment flexibility and scaling granularity for distributed systems complexity and operational overhead. Organizations with 10+ engineers deploying daily benefit significantly; smaller teams should consider simpler architectures until complexity justified by business requirements and team maturity.


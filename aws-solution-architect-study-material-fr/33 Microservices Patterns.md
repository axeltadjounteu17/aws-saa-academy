# Partie 12 : Architectures avancées

# Chapitre 33 : Modèles de microservices

##Présentation

Les applications monolithiques (unités déployables uniques contenant toute la logique métier) ont bien servi les organisations pendant des décennies, mais s'effondrent sous les exigences modernes : mise à l'échelle d'une application entière lorsqu'une seule fonctionnalité a besoin de capacité, déploiement d'une base de code entière pour la correction de bugs sur une seule ligne prenant des heures de temps d'arrêt, technologie verrouillée dans des choix de framework vieux de dix ans et équipes de plus de 50 ingénieurs s'empiétant sur le code des autres provoquant des conflits de déploiement. Un monolithe de commerce électronique nécessitant des fenêtres de déploiement de 4 heures pour chaque changement, évoluant verticalement jusqu'à 50 000 $/mois en coûts de calcul et prenant 6 mois pour ajouter un nouveau fournisseur de paiement ne peut pas rivaliser avec ses concurrents déployant des fonctionnalités quotidiennement, faisant évoluer des services spécifiques de manière indépendante et intégrant de nouvelles technologies en quelques semaines. L'architecture de microservices (décomposant les applications en services indépendants et faiblement couplés, chacun possédant des capacités métier spécifiques) permet aux organisations d'atteindre la vitesse de déploiement, l'évolutivité indépendante, la diversité technologique et l'autonomie des équipes qu'exigent les entreprises modernes.

La transition du monolithe aux microservices introduit une nouvelle complexité : les systèmes distribués nécessitent des mécanismes de découverte de services pour que les services se trouvent les uns les autres, des disjoncteurs empêchant les pannes en cascade, une composition d'API agrégeant les données de plusieurs services, des modèles de saga maintenant la cohérence des données au-delà des frontières des services et un traçage distribué comprenant les flux de demandes à travers des dizaines de services. Un simple enregistrement d'utilisateur dans Monolith devient une danse coordonnée entre le service utilisateur, le service de messagerie, le service de paiement et le service de notification, chacun pouvant échouer indépendamment. Les organisations qui adoptent naïvement des microservices sans relever les défis des systèmes distribués connaissent une complexité opérationnelle multipliée par 3, un temps moyen de récupération plus long en raison d'un débogage difficile, des cauchemars en matière de cohérence des données dus aux transactions distribuées et des coûts d'infrastructure plus élevés dus à la prolifération des services. AWS fournit une boîte à outils complète de microservices (ECS/EKS pour l'orchestration des conteneurs, App Mesh pour le maillage de services, X-Ray pour le traçage distribué, EventBridge pour la communication basée sur les événements), permettant aux organisations de créer des architectures de microservices résilientes.

Ce chapitre synthétise les services AWS tout au long du manuel : ECS/EKS du chapitre sur les conteneurs pour le déploiement de services, ALB de la mise en réseau pour le routage des services, DynamoDB pour les bases de données par service, SQS/SNS pour la communication asynchrone, Lambda pour les services sans serveur, CloudWatch pour la surveillance et X-Ray pour le traçage distribué. Le chapitre couvre les modèles de microservices (découverte de services, disjoncteurs, composition d'API Gateway, modèles de saga, sourcing d'événements), l'architecture de maillage de services avec App Mesh, les stratégies d'observabilité pour les systèmes distribués, les modèles de gestion des données, les modèles de résilience, les tests de contrat, la gestion des versions de services et la création de systèmes de microservices de production qui offrent une agilité commerciale tout en gérant la complexité des systèmes distribués grâce à des modèles éprouvés, des outils robustes et une discipline opérationnelle.

## Théorie \&Concepts

### Fondamentaux de l'architecture des microservices

**Principes et modèles de base :**
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
### Modèle de découverte de service

**Emplacement de service dynamique :**
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
### Modèle de disjoncteur

**Prévention des pannes en cascade :**
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
### Modèle de composition de l'API

**Agrégation de données provenant de plusieurs services :**
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
### Modèle Saga (transactions distribuées)

**Gestion de la cohérence des données entre les services :**
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
## Implémentation pratique

### Lab 1 : Créer des microservices avec ECS

**Objectif :** Déployer une architecture de microservices à l'aide d'Amazon ECS avec la découverte de services.

**Étape 1 : Créer un cluster VPC et ECS**
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
**Étape 2 : Déployer le service utilisateur**
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
**Étape 3 : Déployer Order Service avec communication de service à service**
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
**Étape 4 : Implémenter le disjoncteur dans le code de service**
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
### Atelier 2 : Implémentation de Service Mesh avec AWS App Mesh

**Objectif :** Ajoutez un maillage de services pour une gestion avancée du trafic et une observabilité.

**Étape 1 : Créer un maillage d'application**
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
**Étape 2 : Créer des nœuds virtuels**
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
**Étape 3 : Créer des services et des itinéraires virtuels**
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
**Étape 4 : implémenter le déploiement de Canary avec App Mesh**
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
## Connaissances au niveau de la production

### Traçage distribué et observabilité

**Comprendre le flux de demandes entre les services :**
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
## Conseils \& Bonnes pratiques

**Astuce 1 : Commencez avec Monolith, migrez vers les microservices**
Créez d'abord un monolithe, identifiez les contextes délimités, puis extrayez les microservices : les microservices prématurés augmentent la complexité sans aucun avantage.

**Astuce 2 : une base de données par service**
Chaque microservice est propriétaire de ses données : empêche un couplage étroit, permet une mise à l'échelle indépendante et permet une diversité technologique selon les besoins du service.

**Astuce 3 : Mettre en œuvre correctement les contrôles de santé**
Des contrôles de santé approfondis valident les dépendances (base de données, services en aval) : permettent une découverte précise des services et empêchent le routage vers des instances défectueuses.

**Astuce 4 : Utilisez les ID de corrélation**
Transmettez l'ID de corrélation à tous les appels de service : permet de tracer les requêtes entre les services, de corréler les journaux et de déboguer les systèmes distribués.

**Astuce 5 : Concevoir pour l'échec**
Supposons que chaque appel de service puisse échouer : mettez en œuvre des disjoncteurs, des délais d'attente, des tentatives, des solutions de repli et une dégradation progressive.

**Astuce 6 : Versionner les API explicitement**
Utilisez des API versionnées (/v1/orders, /v2/orders) : permet des modifications rétrocompatibles, une migration progressive et l'exécution simultanée de plusieurs versions.

**Astuce 7 : Mettre en œuvre des tests contractuels**
Les tests contractuels axés sur le consommateur valident la compatibilité des services : détectent les modifications importantes avant le déploiement et permettent des versions indépendantes.

**Astuce 8 : Surveiller les états des disjoncteurs**
Alerte lorsque les disjoncteurs s'ouvrent : indique une dégradation du service nécessitant une enquête, évite les pannes silencieuses.

**Astuce 9 : Utilisez la communication asynchrone**
Communication basée sur les événements pour les chemins non critiques : réduit le couplage, améliore la résilience et permet une cohérence éventuelle.

**Astuce 10 : Investissez tôt dans l'observabilité**
Traçage distribué, journalisation structurée, métriques dès le premier jour : les systèmes distribués sont impossibles à déboguer sans une observabilité complète.

## Résumé du chapitre

L'architecture de microservices décompose les applications monolithiques en services indépendants et faiblement couplés, permettant la rapidité de déploiement, la mise à l'échelle indépendante, la diversité technologique et l'autonomie des équipes nécessaires à l'agilité des entreprises modernes. Le succès nécessite la mise en œuvre de modèles éprouvés : découverte de services pour l'emplacement dynamique des services, disjoncteurs empêchant les pannes en cascade, composition d'API agrégeant efficacement les données, modèles de saga maintenant la cohérence des données et observabilité complète grâce au traçage distribué. Les organisations qui adoptent des microservices sans aborder la complexité des systèmes distribués via un maillage de services, une surveillance robuste et des modèles de résilience subissent une surcharge opérationnelle 3 fois supérieure et un temps moyen de récupération plus long ; une mise en œuvre appropriée offre une fréquence de déploiement 10 fois supérieure, une mise à l'échelle indépendante des services et des choix technologiques optimisés en fonction des exigences du service.

**Principaux points à retenir :**

- **Service Discovery Essential :** La découverte basée sur Cloud Map ou ALB permet une localisation dynamique des services ; les services se trouvent automatiquement à mesure que les instances évoluent
- **Les disjoncteurs empêchent les cascades :** échouent rapidement lorsque les dépendances ne sont pas disponibles ; empêche l'épuisement des ressources, permet une dégradation progressive, protège les services des appelants
- **Observez tout :** Traçage distribué X-Ray, journalisation structurée, métriques de service requises : les systèmes distribués sont impossibles à déboguer sans une observabilité complète
- **Conception pour l'échec :** Chaque appel de service peut échouer ; délais d'attente, tentatives, disjoncteurs, replis, dégradation progressive non négociables
- **Base de données par service :** Chaque service possède des données ; empêche un couplage étroit, permet des choix de mise à l'échelle et de technologie indépendants
- **Démarrez simplement, évoluez :** Commencez avec un monolithe ou quelques services, extrayez des microservices à mesure que l'équipe grandit et que les exigences l'exigent.
- **Investissez dans Service Mesh :** App Mesh permet de couper les circuits, de relancer les tentatives, de répartir le trafic et de bénéficier d'un protocole TLS mutuel – décharge la complexité du code d'application.

Compromis en matière de microservices : flexibilité de déploiement accrue et granularité de mise à l'échelle pour la complexité des systèmes distribués et les frais opérationnels. Les organisations comptant plus de 10 ingénieurs déployant des avantages quotidiens significatifs ; Les petites équipes devraient envisager des architectures plus simples jusqu'à ce que la complexité soit justifiée par les exigences commerciales et la maturité de l'équipe.
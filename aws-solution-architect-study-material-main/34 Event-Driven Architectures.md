# Chapter 34: Event-Driven Architectures

## Introduction

Traditional request-response architectures—where services make synchronous calls waiting for responses—create tight coupling, brittleness under load, and scaling bottlenecks that cripple modern applications. An e-commerce platform where order service synchronously calls inventory service, payment service, notification service, and shipping service experiences cascading failures when any dependency becomes slow or unavailable, cannot scale individual services independently, and processes orders at rate of slowest service in chain. When payment service experiences 5-second delays, entire order flow waits 5 seconds regardless of other services being healthy, resulting in poor user experience and wasted infrastructure capacity. Event-driven architectures—where services communicate through asynchronous events published to message buses—decouple producers from consumers, enable independent scaling, provide natural resilience through message queuing, and allow new services to subscribe to existing events without modifying producers.

The shift from synchronous to event-driven introduces new patterns and challenges: events represent things that happened (OrderCreated, PaymentProcessed) requiring different thinking than request-response commands, event ordering across distributed systems cannot be guaranteed without careful design, duplicate events must be handled idempotently, and eventual consistency replaces immediate consistency requiring business process adaptation. A payment processed event may arrive before order created event due to network delays; processing payment event twice must not double-charge customer; inventory count eventually consistent means displaying "5 in stock" when actually 3 remain. Organizations naively adopting event-driven architecture without addressing idempotency, ordering, and consistency challenges experience duplicate processing bugs, data inconsistencies, and debugging nightmares from complex event flows. AWS provides comprehensive event-driven toolkit—EventBridge for event routing, SNS for pub/sub fanout, SQS for reliable queuing, Lambda for event processing, Kinesis for event streaming—enabling scalable, resilient event-driven systems.

This chapter synthesizes AWS services throughout handbook—Lambda from serverless for event processing, SQS/SNS from messaging for event delivery, DynamoDB for event store, CloudWatch for monitoring, X-Ray for distributed tracing. The chapter covers event-driven patterns (event sourcing, CQRS, choreography vs orchestration), EventBridge event bus architecture, idempotency implementation, handling eventual consistency, event replay capabilities, monitoring event flows, dead-letter queue strategies, and building production event-driven systems that achieve loose coupling, independent scaling, and resilience while managing complexity through proven patterns and operational discipline.

## Theory \& Concepts

### Event-Driven Architecture Fundamentals

**Core Concepts and Patterns:**

```
Event-Driven Architecture (EDA):
Services communicate through events (notifications of state changes)
Producers publish events without knowing consumers
Consumers subscribe to events of interest
Asynchronous, loosely coupled

Event vs Command:

COMMAND (Request-Response):
- Instruction to do something
- "CreateOrder", "ProcessPayment"
- Synchronous (wait for response)
- Single recipient (specific service)
- Sender knows receiver

EVENT (Event-Driven):
- Notification something happened
- "OrderCreated", "PaymentProcessed"
- Asynchronous (fire and forget)
- Multiple recipients (0-N consumers)
- Sender doesn't know consumers

Example Flow:

Traditional (Synchronous):
Client → Order Service
  Order Service → Inventory Service (wait 200ms)
  Order Service → Payment Service (wait 300ms)
  Order Service → Notification Service (wait 100ms)
  Order Service → Shipping Service (wait 250ms)
Total: 850ms

Event-Driven (Asynchronous):
Client → Order Service (publish OrderCreated event)
Total: 50ms (client response)

Background Processing:
OrderCreated event → EventBridge
  → Inventory Service (reserve inventory)
  → Payment Service (charge payment)
  → Notification Service (send email)
  → Shipping Service (create shipment)

All process in parallel, independently
Client receives immediate response
Services scale independently

Event-Driven Benefits:

1. Loose Coupling:
   - Producers don't know consumers
   - Add new consumers without changing producers
   - Services independently deployable

2. Scalability:
   - Scale event producers independently
   - Scale event consumers independently
   - Handle traffic bursts through queuing

3. Resilience:
   - Failures isolated to single service
   - Events queued when consumer unavailable
   - Automatic retries

4. Flexibility:
   - New features subscribe to existing events
   - A/B testing with multiple consumers
   - Easy to add analytics, audit logging

Event-Driven Challenges:

1. Eventual Consistency:
   - State changes not immediate across services
   - Must handle stale data
   - Business process adaptation required

2. Event Ordering:
   - Events may arrive out of order
   - Must handle late-arriving events
   - Ordering guarantees expensive

3. Duplicate Events:
   - At-least-once delivery = duplicates possible
   - Must process idempotently
   - Deduplication strategies needed

4. Debugging Complexity:
   - Request path spans multiple async services
   - Correlation IDs essential
   - Distributed tracing required

5. Testing:
   - Integration testing more complex
   - Need to test event flows
   - Mock event buses in tests

Event Types:

1. DOMAIN EVENTS:
   Business state changes
   Examples: OrderCreated, PaymentCompleted, UserRegistered
   
2. INTEGRATION EVENTS:
   Cross-bounded-context events
   Examples: OrderShipped (from shipping to order service)
   
3. NOTIFICATION EVENTS:
   Inform about state (no action required)
   Examples: DailyReportGenerated

4. SYSTEM EVENTS:
   Technical events
   Examples: ServiceStarted, DeploymentCompleted

Event Structure:

Best Practice Event Schema:
{
  "eventId": "evt_12345",           // Unique ID
  "eventType": "OrderCreated",      // Event type
  "eventVersion": "1.0",            // Schema version
  "timestamp": "2025-11-17T10:30:00Z",
  "source": "order-service",        // Producer
  "correlationId": "corr_67890",   // Request correlation
  "causationId": "evt_11111",      // Causing event
  "data": {                         // Event payload
    "orderId": "order-123",
    "userId": "user-456",
    "total": 99.99,
    "items": [...]
  },
  "metadata": {                     // Context
    "userId": "user-456",
    "ipAddress": "1.2.3.4"
  }
}

Important Fields:
- eventId: Enables idempotency
- correlationId: Tracks request across services
- causationId: Links related events (event chain)
- eventVersion: Handles schema evolution
```


### Event Sourcing Pattern

**Storing State as Sequence of Events:**

```
Event Sourcing Definition:
Store all changes to application state as sequence of events
Current state derived by replaying events
Events are immutable, append-only log

Traditional Approach (State Storage):

Database stores current state:
orders table:
┌──────────┬─────────┬────────┬─────────┐
│ order_id │ user_id │ status │ total   │
├──────────┼─────────┼────────┼─────────┤
│ 123      │ 456     │ shipped│ 99.99   │
└──────────┴─────────┴────────┴─────────┘

Lost Information:
- When status changed?
- Who changed status?
- Previous states?
- Why changed?

Event Sourcing Approach (Event Storage):

event_store table:
┌────┬────────────────┬──────────┬─────────────────────────┐
│ id │ event_type     │ order_id │ data                    │
├────┼────────────────┼──────────┼─────────────────────────┤
│ 1  │ OrderCreated   │ 123      │ {user:456, total:99.99} │
│ 2  │ OrderPaid      │ 123      │ {amount:99.99}          │
│ 3  │ OrderShipped   │ 123      │ {carrier:"UPS"}         │
└────┴────────────────┴──────────┴─────────────────────────┘

Current state = replay all events:
1. OrderCreated → status: created
2. OrderPaid → status: paid
3. OrderShipped → status: shipped

Event Sourcing Benefits:

1. Complete Audit Trail:
   - Every state change recorded
   - Who, when, why preserved
   - Regulatory compliance

2. Temporal Queries:
   - "What was state at 10 AM yesterday?"
   - Replay events up to timestamp
   
3. Debugging:
   - Reproduce bugs by replaying events
   - Understand exactly what happened
   
4. Event Replay:
   - Fix bugs and reprocess events
   - Add new features to historical data
   
5. Multiple Views:
   - Different projections from same events
   - CQRS (Command Query Responsibility Segregation)

Event Sourcing Implementation:

class OrderAggregate:
    """Order aggregate with event sourcing"""
    
    def __init__(self, order_id):
        self.order_id = order_id
        self.events = []
        self.version = 0
        
        # Current state
        self.user_id = None
        self.total = 0
        self.status = None
        self.items = []
    
    def create_order(self, user_id, items, total):
        """Create order (command)"""
        
        # Validate
        if self.status is not None:
            raise Exception('Order already exists')
        
        # Generate event
        event = {
            'eventType': 'OrderCreated',
            'orderId': self.order_id,
            'userId': user_id,
            'items': items,
            'total': total,
            'timestamp': datetime.utcnow()
        }
        
        # Apply event (update state)
        self._apply_event(event)
        
        # Store for persistence
        self.events.append(event)
    
    def pay_order(self, payment_method, amount):
        """Pay for order (command)"""
        
        # Validate
        if self.status != 'created':
            raise Exception('Cannot pay - invalid status')
        
        if amount != self.total:
            raise Exception('Payment amount mismatch')
        
        # Generate event
        event = {
            'eventType': 'OrderPaid',
            'orderId': self.order_id,
            'paymentMethod': payment_method,
            'amount': amount,
            'timestamp': datetime.utcnow()
        }
        
        self._apply_event(event)
        self.events.append(event)
    
    def ship_order(self, carrier, tracking_number):
        """Ship order (command)"""
        
        if self.status != 'paid':
            raise Exception('Cannot ship - not paid')
        
        event = {
            'eventType': 'OrderShipped',
            'orderId': self.order_id,
            'carrier': carrier,
            'trackingNumber': tracking_number,
            'timestamp': datetime.utcnow()
        }
        
        self._apply_event(event)
        self.events.append(event)
    
    def _apply_event(self, event):
        """Apply event to current state"""
        
        if event['eventType'] == 'OrderCreated':
            self.user_id = event['userId']
            self.items = event['items']
            self.total = event['total']
            self.status = 'created'
        
        elif event['eventType'] == 'OrderPaid':
            self.status = 'paid'
        
        elif event['eventType'] == 'OrderShipped':
            self.status = 'shipped'
            self.carrier = event['carrier']
            self.tracking_number = event['trackingNumber']
        
        self.version += 1
    
    def load_from_events(self, events):
        """Rebuild state from events"""
        
        for event in events:
            self._apply_event(event)

# Usage
order = OrderAggregate('order-123')
order.create_order('user-456', items=[...], total=99.99)
order.pay_order('credit_card', 99.99)
order.ship_order('UPS', 'track-789')

# Persist events to event store
event_store.save_events(order.order_id, order.events)

# Later: Reconstruct order from events
events = event_store.get_events('order-123')
order = OrderAggregate('order-123')
order.load_from_events(events)
# order.status now 'shipped' without storing state!

Snapshots for Performance:

Problem: Replaying 10,000 events slow

Solution: Periodic snapshots
- Save current state every N events
- Load snapshot, replay events since snapshot

snapshot_store:
┌──────────┬─────────┬──────────┬─────────────┐
│ order_id │ version │ state    │ timestamp   │
├──────────┼─────────┼──────────┼─────────────┤
│ 123      │ 100     │ {...}    │ 2025-11-01  │
│ 123      │ 200     │ {...}    │ 2025-11-10  │
└──────────┴─────────┴──────────┴─────────────┘

Load process:
1. Load latest snapshot (version 200)
2. Replay events 201-250
3. Much faster than replaying all 250 events

AWS Implementation:

Event Store: DynamoDB
- Partition key: aggregate_id (order_id)
- Sort key: version (sequence number)
- Attributes: event_type, data, timestamp

{
  "PK": "ORDER#123",
  "SK": "EVENT#001",
  "eventType": "OrderCreated",
  "data": {...},
  "timestamp": "2025-11-17T10:30:00Z"
}

Query events for order:
events = dynamodb.query(
    KeyConditionExpression='PK = :pk',
    ExpressionAttributeValues={':pk': 'ORDER#123'}
)

Event Sourcing Challenges:

1. Schema Evolution:
   - Events immutable (can't change past events)
   - New code must handle old event versions
   - Use upcasting (transform old events to new format)

2. Event Versioning:
   {
     "eventType": "OrderCreated",
     "eventVersion": "2.0",  # New version
     "data": {...}
   }
   
   # Handler supports multiple versions
   if event['eventVersion'] == '1.0':
       # Handle v1 format
   elif event['eventVersion'] == '2.0':
       # Handle v2 format

3. Privacy (GDPR):
   - Right to be forgotten conflicts with immutable events
   - Solutions:
     a) Crypto-shredding (encrypt events, delete keys)
     b) Tombstone events (mark data deleted)
     c) Pseudonymization (separate PII storage)

4. Event Store Size:
   - Events accumulate forever
   - Archive old events to S3
   - Keep recent events in hot storage
```


### CQRS (Command Query Responsibility Segregation)

**Separate Read and Write Models:**

```
CQRS Definition:
Separate models for updating (commands) and reading (queries)
Commands update state, queries read state
Often paired with event sourcing

Traditional Architecture:
┌─────────────────────────────────┐
│   Single Model (Domain Model)    │
│                                   │
│  Read  ←───────┐                 │
│  Write ←───────┤  Same Model     │
│                │                  │
└────────────────┴──────────────────┘
         │
         ↓
    Database (normalized)

CQRS Architecture:
┌─────────────┐         ┌─────────────┐
│   Write     │         │    Read     │
│   Model     │         │    Model    │
│  (Commands) │         │  (Queries)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       ↓                       ↓
   Write DB              Read DB (optimized)
   (normalized)          (denormalized)
       │                       ↑
       └────── Events ─────────┘

Benefits:

1. Optimized Reads:
   - Denormalized data for queries
   - Pre-computed aggregations
   - Multiple read models for different needs

2. Optimized Writes:
   - Normalized for consistency
   - Domain logic focus
   - Event sourcing friendly

3. Independent Scaling:
   - Scale reads separately (read-heavy systems)
   - Scale writes separately
   - Different databases for read/write

4. Flexibility:
   - Multiple read models from same write model
   - Example: 
     - SQL read model for reports
     - Elasticsearch for search
     - Redis for real-time dashboard

CQRS Implementation:

# Command Side (Write)
class CreateOrderCommand:
    def __init__(self, user_id, items, total):
        self.user_id = user_id
        self.items = items
        self.total = total

class OrderCommandHandler:
    def handle_create_order(self, command):
        # Business validation
        if command.total <= 0:
            raise ValueError('Invalid total')
        
        # Create aggregate
        order = OrderAggregate(generate_id())
        order.create_order(
            command.user_id,
            command.items,
            command.total
        )
        
        # Save events
        event_store.save_events(order.order_id, order.events)
        
        # Publish events
        for event in order.events:
            event_bus.publish(event)
        
        return order.order_id

# Query Side (Read)
class OrderReadModel:
    """Denormalized read model for queries"""
    
    def __init__(self):
        self.order_id = None
        self.user_id = None
        self.user_name = None  # Denormalized!
        self.user_email = None  # Denormalized!
        self.items = []
        self.total = 0
        self.status = None
        self.created_at = None
        self.updated_at = None

class OrderQueryHandler:
    def get_order(self, order_id):
        # Query optimized read model
        return read_db.query(
            'SELECT * FROM order_read_model WHERE order_id = ?',
            order_id
        )
    
    def get_user_orders(self, user_id):
        # Efficient query (no joins needed)
        return read_db.query(
            'SELECT * FROM order_read_model WHERE user_id = ?',
            user_id
        )

# Projector (Event Handler)
class OrderReadModelProjector:
    """Build read model from events"""
    
    def handle_order_created(self, event):
        # Fetch user details (denormalize)
        user = user_service.get_user(event['userId'])
        
        # Create read model
        read_model = OrderReadModel()
        read_model.order_id = event['orderId']
        read_model.user_id = event['userId']
        read_model.user_name = user['name']
        read_model.user_email = user['email']
        read_model.items = event['items']
        read_model.total = event['total']
        read_model.status = 'created'
        read_model.created_at = event['timestamp']
        
        # Save to read database
        read_db.insert(read_model)
    
    def handle_order_paid(self, event):
        # Update read model
        read_db.update(
            event['orderId'],
            {
                'status': 'paid',
                'updated_at': event['timestamp']
            }
        )

AWS Implementation:

Write Side:
- Lambda functions handle commands
- DynamoDB event store
- EventBridge publishes events

Read Side:
- Lambda projectors listen to events
- DynamoDB read model (fast key-value access)
- ElasticSearch for full-text search
- Redis for real-time leaderboards

Event Flow:
1. API Gateway → Lambda (CreateOrderCommand)
2. Lambda → DynamoDB (save events)
3. Lambda → EventBridge (publish OrderCreated)
4. EventBridge → Lambda (projector)
5. Lambda → Read DB (update read model)

Multiple Read Models:

Same events → Different projections

1. Order List View:
   - Minimal data for list display
   - Pagination optimized
   - DynamoDB with GSI

2. Order Detail View:
   - Complete order information
   - Denormalized user, product data
   - DynamoDB

3. Analytics View:
   - Aggregated statistics
   - Revenue per day, popular products
   - DynamoDB with pre-computed aggregates

4. Search View:
   - Full-text search capability
   - Elasticsearch

5. Real-time Dashboard:
   - Orders per minute
   - Redis sorted sets

Eventual Consistency:

Command returns immediately:
POST /orders
Response: 201 Created, Location: /orders/123

Read model updated async (milliseconds later):
GET /orders/123
Response: 200 OK (if projector completed)
         or 404 Not Found (if projection pending)

Solutions:
1. Return command result in response
2. Poll until available
3. Websocket notification when ready
4. Show "Processing..." state in UI
```


### Choreography vs Orchestration

**Event-Driven Coordination Patterns:**

```
Choreography (Decentralized):
Services react to events independently
No central coordinator
Each service knows what to do when event occurs

Example: Order Processing

Order Service publishes OrderCreated
  ↓
[EventBridge]
  ├→ Inventory Service (reserves inventory)
  │   └→ publishes InventoryReserved
  ├→ Analytics Service (logs event)
  └→ Notification Service (sends email)

Inventory Service publishes InventoryReserved
  ↓
[EventBridge]
  └→ Payment Service (charges payment)
      └→ publishes PaymentCompleted

Payment Service publishes PaymentCompleted
  ↓
[EventBridge]
  ├→ Shipping Service (creates shipment)
  ├→ Order Service (updates status)
  └→ Notification Service (sends confirmation)

Characteristics:
+ Loosely coupled (services don't know each other)
+ Easy to add new services (just subscribe to events)
+ No single point of failure
- Hard to track overall flow
- Difficult to handle compensation (rollback)
- Cyclic dependencies possible

Orchestration (Centralized):
Central orchestrator coordinates workflow
Orchestrator tells services what to do
Services don't know about other services

Example: Order Processing with Step Functions

[Order Orchestrator - Step Functions]
  ├→ 1. Create Order (Order Service)
  ├→ 2. Reserve Inventory (Inventory Service)
  │     ├→ Success: Continue
  │     └→ Failure: Cancel Order
  ├→ 3. Process Payment (Payment Service)
  │     ├→ Success: Continue
  │     └→ Failure: Release Inventory, Cancel Order
  ├→ 4. Create Shipment (Shipping Service)
  └→ 5. Send Notification (Notification Service)

Characteristics:
+ Clear workflow (easy to understand)
+ Easy to track state
+ Built-in error handling
+ Compensation logic in one place
- Central point of failure (orchestrator)
- Orchestrator knows all services (coupling)
- Can become complex for large workflows

When to Use Each:

Choreography:
✓ Simple workflows
✓ High autonomy desired
✓ Services owned by different teams
✓ Workflow can evolve independently
Example: Analytics, notifications, logging

Orchestration:
✓ Complex workflows
✓ Need transaction-like behavior
✓ Compensation required
✓ Workflow needs to be visible/traceable
Example: Order fulfillment, onboarding flows

Hybrid Approach:
Use both where appropriate

Order Service: Orchestration (Step Functions)
  ├→ Reserve Inventory
  ├→ Process Payment
  └→ Create Shipment

But publishes events for choreography:
  OrderCompleted event
    ├→ Analytics (choreography)
    ├→ Recommendations (choreography)
    └→ Marketing (choreography)

Best of both:
- Critical path: Orchestrated (reliability)
- Side effects: Choreographed (flexibility)

AWS Services:

Choreography:
- EventBridge (event routing)
- SNS (pub/sub)
- SQS (queuing)
- Lambda (event handlers)

Orchestration:
- Step Functions (workflow orchestration)
- Lambda (task execution)
- EventBridge (trigger workflows)

Hybrid Example:

# Step Functions workflow (orchestration)
{
  "StartAt": "CreateOrder",
  "States": {
    "CreateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:CreateOrder",
      "Next": "ReserveInventory"
    },
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:ReserveInventory",
      "Catch": [{
        "ErrorEquals": ["InsufficientInventory"],
        "Next": "CancelOrder"
      }],
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:ProcessPayment",
      "Catch": [{
        "ErrorEquals": ["PaymentFailed"],
        "Next": "ReleaseInventoryAndCancel"
      }],
      "Next": "PublishOrderCompleted"
    },
    "PublishOrderCompleted": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:PublishEvent",
      "Parameters": {
        "eventType": "OrderCompleted",
        "data.$": "$"
      },
      "End": true
    },
    "ReleaseInventoryAndCancel": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:ReleaseInventory",
      "Next": "CancelOrder"
    },
    "CancelOrder": {
      "Type": "Fail"
    }
  }
}

# Choreographed services listen to OrderCompleted
OrderCompleted event → EventBridge
  ├→ Analytics Lambda
  ├→ Recommendations Lambda
  ├→ Marketing Lambda
  └→ Data Warehouse Lambda

Decision Matrix:

┌────────────────┬────────────────┬──────────────┐
│ Factor         │ Choreography   │Orchestration │
├────────────────┼────────────────┼──────────────┤
│ Coupling       │ Low            │ Medium       │
│ Visibility     │ Low            │ High         │
│ Error Handling │ Distributed    │ Centralized  │
│ Complexity     │ Scales badly   │ Managed      │
│ Flexibility    │ High           │ Medium       │
│ Testing        │ Difficult      │ Easier       │
└────────────────┴────────────────┴──────────────┘
```

## Hands-On Implementation

### Lab 1: Building Event-Driven System with EventBridge

**Objective:** Implement event-driven order processing system using EventBridge, Lambda, and SQS.

**Step 1: Create EventBridge Event Bus**

```python
import boto3
import json

events = boto3.client('events')
sqs = boto3.client('sqs')
lambda_client = boto3.client('lambda')

def create_event_bus():
    """Create custom event bus for microservices"""
    
    print("=== Creating EventBridge Event Bus ===\n")
    
    # Create custom event bus
    response = events.create_event_bus(
        Name='microservices-event-bus',
        Tags=[
            {'Key': 'Environment', 'Value': 'Production'},
            {'Key': 'Purpose', 'Value': 'Microservices Events'}
        ]
    )
    
    event_bus_arn = response['EventBusArn']
    
    print(f"Created event bus: {event_bus_arn}")
    
    # Create archive for event replay
    archive_response = events.create_archive(
        ArchiveName='microservices-event-archive',
        EventSourceArn=event_bus_arn,
        Description='Archive all events for replay',
        RetentionDays=365
    )
    
    print(f"Created event archive: {archive_response['ArchiveArn']}")
    print("  Retention: 365 days")
    print("  Enables event replay for debugging and recovery")
    
    return event_bus_arn

event_bus_arn = create_event_bus()
```

**Step 2: Create Event Processing Lambda Functions**

```python
def create_event_processor_lambda(function_name, handler_code):
    """Create Lambda function to process events"""
    
    print(f"\nCreating Lambda function: {function_name}")
    
    # Create IAM role for Lambda
    iam = boto3.client('iam')
    
    assume_role_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "lambda.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }
    
    try:
        role_response = iam.create_role(
            RoleName=f'{function_name}-role',
            AssumeRolePolicyDocument=json.dumps(assume_role_policy),
            Description=f'Role for {function_name} Lambda'
        )
        
        role_arn = role_response['Role']['Arn']
        
        # Attach policies
        iam.attach_role_policy(
            RoleName=f'{function_name}-role',
            PolicyArn='arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        )
        
        # Add DynamoDB and SQS permissions
        iam.attach_role_policy(
            RoleName=f'{function_name}-role',
            PolicyArn='arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess'
        )
        
    except iam.exceptions.EntityAlreadyExistsException:
        role_arn = f'arn:aws:iam::123456789012:role/{function_name}-role'
    
    # Create Lambda function
    response = lambda_client.create_function(
        FunctionName=function_name,
        Runtime='python3.11',
        Role=role_arn,
        Handler='index.lambda_handler',
        Code={'ZipFile': handler_code.encode()},
        Timeout=30,
        MemorySize=256,
        Environment={
            'Variables': {
                'EVENT_BUS_NAME': 'microservices-event-bus',
                'IDEMPOTENCY_TABLE': 'event-idempotency'
            }
        },
        Tags={
            'Function': function_name,
            'Environment': 'Production'
        }
    )
    
    print(f"  Created: {response['FunctionArn']}")
    
    return response['FunctionArn']

# Inventory Service Lambda
inventory_handler = '''
import json
import boto3
import hashlib
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
events = boto3.client('events')

# Idempotency table
idempotency_table = dynamodb.Table('event-idempotency')

def lambda_handler(event, context):
    """Process OrderCreated event - Reserve inventory"""
    
    # Extract event details
    detail = event['detail']
    event_id = detail['eventId']
    order_id = detail['data']['orderId']
    items = detail['data']['items']
    
    print(f'Processing OrderCreated: {order_id}, Event ID: {event_id}')
    
    # Check idempotency (prevent duplicate processing)
    if is_already_processed(event_id):
        print(f'Event {event_id} already processed - skipping')
        return {'statusCode': 200, 'body': 'Already processed'}
    
    try:
        # Reserve inventory
        for item in items:
            reserve_inventory(item['productId'], item['quantity'])
        
        # Mark event as processed
        mark_as_processed(event_id)
        
        # Publish InventoryReserved event
        publish_event({
            'eventType': 'InventoryReserved',
            'orderId': order_id,
            'items': items,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        print(f'Successfully reserved inventory for order {order_id}')
        
        return {'statusCode': 200, 'body': 'Inventory reserved'}
    
    except InsufficientInventoryError as e:
        # Publish InventoryReservationFailed event
        publish_event({
            'eventType': 'InventoryReservationFailed',
            'orderId': order_id,
            'reason': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        print(f'Insufficient inventory for order {order_id}')
        
        return {'statusCode': 400, 'body': 'Insufficient inventory'}

def is_already_processed(event_id):
    """Check if event already processed (idempotency)"""
    try:
        response = idempotency_table.get_item(Key={'eventId': event_id})
        return 'Item' in response
    except:
        return False

def mark_as_processed(event_id):
    """Mark event as processed"""
    idempotency_table.put_item(
        Item={
            'eventId': event_id,
            'processedAt': datetime.utcnow().isoformat(),
            'ttl': int(datetime.utcnow().timestamp()) + 86400 * 7  # 7 days TTL
        }
    )

def reserve_inventory(product_id, quantity):
    """Reserve inventory in database"""
    inventory_table = dynamodb.Table('inventory')
    
    response = inventory_table.update_item(
        Key={'productId': product_id},
        UpdateExpression='SET available = available - :qty',
        ConditionExpression='available >= :qty',
        ExpressionAttributeValues={':qty': quantity},
        ReturnValues='UPDATED_NEW'
    )
    
    print(f'Reserved {quantity} units of product {product_id}')

def publish_event(event_data):
    """Publish event to EventBridge"""
    events.put_events(
        Entries=[{
            'Source': 'inventory-service',
            'DetailType': event_data['eventType'],
            'Detail': json.dumps(event_data),
            'EventBusName': 'microservices-event-bus'
        }]
    )
'''

inventory_function_arn = create_event_processor_lambda(
    'inventory-service-processor',
    inventory_handler
)

# Payment Service Lambda
payment_handler = '''
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
events = boto3.client('events')
idempotency_table = dynamodb.Table('event-idempotency')

def lambda_handler(event, context):
    """Process InventoryReserved event - Charge payment"""
    
    detail = event['detail']
    event_id = detail.get('eventId', event['id'])
    order_id = detail['orderId']
    
    print(f'Processing InventoryReserved: {order_id}')
    
    # Idempotency check
    if is_already_processed(event_id):
        print('Already processed')
        return {'statusCode': 200}
    
    try:
        # Process payment (simulated)
        payment_id = process_payment(order_id)
        
        mark_as_processed(event_id)
        
        # Publish PaymentCompleted event
        publish_event({
            'eventType': 'PaymentCompleted',
            'orderId': order_id,
            'paymentId': payment_id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        print(f'Payment completed for order {order_id}')
        
        return {'statusCode': 200}
    
    except PaymentFailedException as e:
        # Publish PaymentFailed event
        publish_event({
            'eventType': 'PaymentFailed',
            'orderId': order_id,
            'reason': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return {'statusCode': 400}

def is_already_processed(event_id):
    try:
        response = idempotency_table.get_item(Key={'eventId': event_id})
        return 'Item' in response
    except:
        return False

def mark_as_processed(event_id):
    idempotency_table.put_item(
        Item={
            'eventId': event_id,
            'processedAt': datetime.utcnow().isoformat(),
            'ttl': int(datetime.utcnow().timestamp()) + 86400 * 7
        }
    )

def process_payment(order_id):
    """Process payment (simulated)"""
    import uuid
    return f'pay_{uuid.uuid4().hex[:8]}'

def publish_event(event_data):
    events.put_events(
        Entries=[{
            'Source': 'payment-service',
            'DetailType': event_data['eventType'],
            'Detail': json.dumps(event_data),
            'EventBusName': 'microservices-event-bus'
        }]
    )
'''

payment_function_arn = create_event_processor_lambda(
    'payment-service-processor',
    payment_handler
)
```

**Step 3: Create EventBridge Rules**

```python
def create_event_rule(rule_name, event_pattern, target_lambda_arn):
    """Create EventBridge rule to route events to Lambda"""
    
    print(f"\nCreating EventBridge rule: {rule_name}")
    
    # Create rule
    rule_response = events.put_rule(
        Name=rule_name,
        EventPattern=json.dumps(event_pattern),
        State='ENABLED',
        Description=f'Route {rule_name} events',
        EventBusName='microservices-event-bus'
    )
    
    rule_arn = rule_response['RuleArn']
    
    print(f"  Created rule: {rule_arn}")
    print(f"  Event pattern: {json.dumps(event_pattern, indent=2)}")
    
    # Add Lambda permission to be invoked by EventBridge
    lambda_client.add_permission(
        FunctionName=target_lambda_arn.split(':')[-1],
        StatementId=f'{rule_name}-permission',
        Action='lambda:InvokeFunction',
        Principal='events.amazonaws.com',
        SourceArn=rule_arn
    )
    
    # Add Lambda as target
    events.put_targets(
        Rule=rule_name,
        EventBusName='microservices-event-bus',
        Targets=[{
            'Id': '1',
            'Arn': target_lambda_arn,
            'RetryPolicy': {
                'MaximumRetryAttempts': 3,
                'MaximumEventAge': 3600
            },
            'DeadLetterConfig': {
                'Arn': 'arn:aws:sqs:us-east-1:123456789012:event-dlq'
            }
        }]
    )
    
    print(f"  Target: Lambda function")
    print(f"  Retry: 3 attempts")
    print(f"  DLQ: event-dlq")
    
    return rule_arn

# Rule: OrderCreated → Inventory Service
create_event_rule(
    'order-created-to-inventory',
    {
        'source': ['order-service'],
        'detail-type': ['OrderCreated']
    },
    inventory_function_arn
)

# Rule: InventoryReserved → Payment Service
create_event_rule(
    'inventory-reserved-to-payment',
    {
        'source': ['inventory-service'],
        'detail-type': ['InventoryReserved']
    },
    payment_function_arn
)

# Rule: PaymentCompleted → Notification Service
create_event_rule(
    'payment-completed-to-notification',
    {
        'source': ['payment-service'],
        'detail-type': ['PaymentCompleted']
    },
    'arn:aws:lambda:us-east-1:123456789012:function:notification-service'
)

print("\n✓ Event-driven system configured")
print("\nEvent Flow:")
print("  OrderCreated → Inventory Service → InventoryReserved")
print("  InventoryReserved → Payment Service → PaymentCompleted")
print("  PaymentCompleted → Notification Service → Email Sent")
```

**Step 4: Publish Events and Test**

```python
def publish_order_created_event(order_data):
    """Publish OrderCreated event"""
    
    print("\n=== Publishing OrderCreated Event ===\n")
    
    event_id = f"evt_{uuid.uuid4().hex}"
    
    event = {
        'eventId': event_id,
        'eventType': 'OrderCreated',
        'eventVersion': '1.0',
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'order-service',
        'correlationId': f"corr_{uuid.uuid4().hex}",
        'data': {
            'orderId': order_data['order_id'],
            'userId': order_data['user_id'],
            'items': order_data['items'],
            'total': order_data['total']
        }
    }
    
    response = events.put_events(
        Entries=[{
            'Source': 'order-service',
            'DetailType': 'OrderCreated',
            'Detail': json.dumps(event),
            'EventBusName': 'microservices-event-bus'
        }]
    )
    
    if response['FailedEntryCount'] == 0:
        print(f"✓ Event published: {event_id}")
        print(f"  Order ID: {order_data['order_id']}")
        print(f"  Correlation ID: {event['correlationId']}")
        print("\nEvent processing started...")
        print("  1. Inventory Service will reserve inventory")
        print("  2. Payment Service will process payment")
        print("  3. Notification Service will send email")
    else:
        print(f"✗ Event publish failed: {response['FailedEntryCount']} entries")
    
    return event_id

# Test: Create order
order_data = {
    'order_id': f"order_{uuid.uuid4().hex[:8]}",
    'user_id': 'user-123',
    'items': [
        {'productId': 'prod-001', 'quantity': 2, 'price': 29.99},
        {'productId': 'prod-002', 'quantity': 1, 'price': 49.99}
    ],
    'total': 109.97
}

event_id = publish_order_created_event(order_data)

# Monitor event processing
time.sleep(5)

print("\n=== Checking Event Processing ===\n")

# Check idempotency table to see processed events
dynamodb = boto3.resource('dynamodb')
idempotency_table = dynamodb.Table('event-idempotency')

processed_events = idempotency_table.scan()

print(f"Processed events: {processed_events['Count']}")
for item in processed_events['Items']:
    print(f"  {item['eventId']} - {item['processedAt']}")
```


### Lab 2: Implementing Idempotency with DynamoDB

**Objective:** Ensure events processed exactly once despite duplicate deliveries.

**Step 1: Create Idempotency Table**

```python
def create_idempotency_table():
    """Create DynamoDB table for idempotency tracking"""
    
    print("=== Creating Idempotency Table ===\n")
    
    dynamodb = boto3.client('dynamodb')
    
    try:
        table = dynamodb.create_table(
            TableName='event-idempotency',
            KeySchema=[
                {'AttributeName': 'eventId', 'KeyType': 'HASH'}
            ],
            AttributeDefinitions=[
                {'AttributeName': 'eventId', 'AttributeType': 'S'}
            ],
            BillingMode='PAY_PER_REQUEST',
            StreamSpecification={
                'StreamEnabled': False
            },
            TimeToLiveSpecification={
                'Enabled': True,
                'AttributeName': 'ttl'
            }
        )
        
        print(f"Created table: event-idempotency")
        print(f"  Key: eventId (string)")
        print(f"  TTL: Enabled (automatic cleanup after 7 days)")
        
        # Wait for table to be active
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName='event-idempotency')
        
        print("✓ Table ready")
    
    except dynamodb.exceptions.ResourceInUseException:
        print("Table already exists")

create_idempotency_table()
```

**Step 2: Idempotent Event Handler Pattern**

```python
# Reusable idempotency decorator
def idempotent_handler(func):
    """Decorator for idempotent event processing"""
    
    def wrapper(event, context):
        dynamodb = boto3.resource('dynamodb')
        idempotency_table = dynamodb.Table('event-idempotency')
        
        # Extract event ID
        event_id = event.get('id') or event['detail'].get('eventId')
        
        if not event_id:
            raise ValueError('Event ID required for idempotency')
        
        # Check if already processed
        try:
            response = idempotency_table.get_item(
                Key={'eventId': event_id},
                ConsistentRead=True
            )
            
            if 'Item' in response:
                print(f'Event {event_id} already processed at {response["Item"]["processedAt"]}')
                
                # Return cached result if available
                if 'result' in response['Item']:
                    return json.loads(response['Item']['result'])
                
                return {'statusCode': 200, 'body': 'Already processed'}
        
        except Exception as e:
            print(f'Error checking idempotency: {e}')
        
        # Process event
        try:
            result = func(event, context)
            
            # Store idempotency record with result
            idempotency_table.put_item(
                Item={
                    'eventId': event_id,
                    'processedAt': datetime.utcnow().isoformat(),
                    'result': json.dumps(result),
                    'ttl': int(datetime.utcnow().timestamp()) + 86400 * 7  # 7 days
                },
                ConditionExpression='attribute_not_exists(eventId)'  # Prevent race condition
            )
            
            return result
        
        except dynamodb.exceptions.ConditionalCheckFailedException:
            # Race condition - another invocation processed event
            print(f'Race condition detected for event {event_id} - another invocation processed it')
            return {'statusCode': 200, 'body': 'Processed by another invocation'}
        
        except Exception as e:
            print(f'Error processing event: {e}')
            raise
    
    return wrapper

# Usage in Lambda function
@idempotent_handler
def lambda_handler(event, context):
    """Event handler with automatic idempotency"""
    
    detail = event['detail']
    order_id = detail['orderId']
    
    # Business logic (only executes once per event)
    print(f'Processing order: {order_id}')
    
    # Perform expensive operations
    result = process_order(order_id)
    
    return {
        'statusCode': 200,
        'body': json.dumps({'orderId': order_id, 'result': result})
    }
```

**Step 3: Testing Idempotency**

```python
def test_idempotency():
    """Test that duplicate events are handled correctly"""
    
    print("\n=== Testing Idempotency ===\n")
    
    # Create test event
    test_event = {
        'id': 'test-event-123',
        'source': 'test',
        'detail-type': 'TestEvent',
        'detail': {
            'eventId': 'test-event-123',
            'orderId': 'order-test-001',
            'data': {'test': 'value'}
        }
    }
    
    # Process event first time
    print("Processing event first time...")
    result1 = lambda_handler(test_event, None)
    print(f"Result 1: {result1}")
    
    # Process same event again (simulate duplicate)
    print("\nProcessing event second time (duplicate)...")
    result2 = lambda_handler(test_event, None)
    print(f"Result 2: {result2}")
    
    # Verify idempotency table
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('event-idempotency')
    
    response = table.get_item(Key={'eventId': 'test-event-123'})
    
    if 'Item' in response:
        print(f"\n✓ Idempotency record exists:")
        print(f"  Event ID: {response['Item']['eventId']}")
        print(f"  Processed At: {response['Item']['processedAt']}")
        print(f"  Result: {response['Item']['result']}")
    
    print("\n✓ Idempotency test passed")
    print("  First invocation: Processed successfully")
    print("  Second invocation: Skipped (already processed)")

test_idempotency()
```


### Lab 3: Implementing Event Replay

**Objective:** Replay archived events for debugging or reprocessing.

**Step 1: Query Event Archive**

```python
def query_event_archive(start_time, end_time, event_pattern=None):
    """Query events from archive"""
    
    print(f"\n=== Querying Event Archive ===\n")
    print(f"Time range: {start_time} to {end_time}")
    
    # Start replay
    response = events.start_replay(
        ReplayName=f'replay-{int(datetime.utcnow().timestamp())}',
        EventSourceArn=event_bus_arn,
        EventStartTime=start_time,
        EventEndTime=end_time,
        Destination={
            'Arn': event_bus_arn,
            'FilterArns': []  # Optional: filter specific rules
        }
    )
    
    replay_arn = response['ReplayArn']
    
    print(f"Started replay: {replay_arn}")
    
    # Monitor replay progress
    while True:
        status = events.describe_replay(ReplayName=replay_arn.split('/')[-1])
        
        state = status['State']
        
        print(f"  Status: {state}")
        
        if state == 'COMPLETED':
            print(f"  ✓ Replay completed")
            print(f"  Events replayed: {status['EventLastReplayedTime']}")
            break
        
        elif state == 'FAILED':
            print(f"  ✗ Replay failed: {status.get('StateReason')}")
            break
        
        time.sleep(5)

# Example: Replay last hour of events
start_time = datetime.utcnow() - timedelta(hours=1)
end_time = datetime.utcnow()

query_event_archive(start_time, end_time)
```

**Step 2: Selective Event Replay**

```python
def replay_events_for_order(order_id):
    """Replay events for specific order (debugging)"""
    
    print(f"\n=== Replaying Events for Order: {order_id} ===\n")
    
    # Create temporary event bus for replay debugging
    debug_bus = events.create_event_bus(
        Name=f'debug-replay-{order_id}'
    )
    
    # Create rule to capture replayed events for this order
    events.put_rule(
        Name=f'capture-order-{order_id}',
        EventPattern=json.dumps({
            'detail': {
                'data': {
                    'orderId': [order_id]
                }
            }
        }),
        State='ENABLED',
        EventBusName=f'debug-replay-{order_id}'
    )
    
    # Add CloudWatch Logs as target (for inspection)
    log_group = f'/aws/events/debug-replay-{order_id}'
    
    logs = boto3.client('logs')
    logs.create_log_group(logGroupName=log_group)
    
    events.put_targets(
        Rule=f'capture-order-{order_id}',
        EventBusName=f'debug-replay-{order_id}',
        Targets=[{
            'Id': '1',
            'Arn': f'arn:aws:logs:us-east-1:123456789012:log-group:{log_group}',
            'RetryPolicy': {'MaximumRetryAttempts': 0}
        }]
    )
    
    # Start replay
    events.start_replay(
        ReplayName=f'debug-order-{order_id}',
        EventSourceArn=event_bus_arn,
        EventStartTime=datetime.utcnow() - timedelta(days=7),
        EventEndTime=datetime.utcnow(),
        Destination={
            'Arn': debug_bus['EventBusArn']
        }
    )
    
    print(f"Replaying events to debug bus: {debug_bus['EventBusName']}")
    print(f"Events will be logged to: {log_group}")
    print("\nUse CloudWatch Logs Insights to analyze events")

# Example: Debug failed order
replay_events_for_order('order-failed-001')
```


## Production-Level Knowledge

### Handling Eventual Consistency

**Managing Async State in Event-Driven Systems:**

```
Eventual Consistency Challenges:

Problem: Read-Your-Writes
User creates order → Redirect to order page → 404 Not Found
Why: Read model not yet updated from event

Solutions:

1. RETURN COMMAND RESULT:
   POST /orders
   Response:
   {
     "orderId": "order-123",
     "status": "created",
     "items": [...],
     "total": 99.99
   }
   
   UI displays returned data (no read needed)

2. POLL UNTIL AVAILABLE:
   POST /orders → Response: 202 Accepted, Location: /orders/123
   
   Client polls: GET /orders/123
   - 404: Not ready yet (poll again)
   - 200: Order ready
   
   Max polls: 10 (with exponential backoff)
   If still 404: Show "Processing..." state

3. WEBSOCKET NOTIFICATION:
   POST /orders → Response: 202 Accepted
   
   Server sends WebSocket message when ready:
   {
     "type": "OrderCreated",
     "orderId": "order-123",
     "url": "/orders/123"
   }
   
   UI navigates to order page

4. OPTIMISTIC UI:
   POST /orders → Immediately show order in UI
   
   UI state: "created" (optimistic)
   Event processed → Update UI state: "confirmed"
   
   If failure event → Show error, remove from UI

Problem: Stale Data
Inventory shows "5 in stock" but actually 3 (pending orders)

Solutions:

1. REAL-TIME UPDATES:
   - WebSocket connection
   - Server pushes inventory updates
   - UI always shows current state

2. PESSIMISTIC LOCKING:
   - Reserve inventory optimistically
   - Show "3 available" (minus pending)
   - Release if order fails

3. ACCEPT INCONSISTENCY:
   - Show slightly stale data
   - Handle over-purchase gracefully
   - Notify user if unavailable after checkout

Problem: Cascading Updates
User changes email → Update user service
→ Event: UserUpdated
→ Update order history (show new email)
→ Update notifications (send to new email)
→ Update analytics

Time: 0-5 seconds for full consistency

Solutions:

1. SHOW LOADING STATES:
   Email changed → "Updating account..."
   Wait for confirmation → "Email updated"

2. IMMEDIATE FEEDBACK:
   Update UI immediately (optimistic)
   Propagate in background

3. BATCH UPDATES:
   Multiple changes → Single event
   Reduces event storm

Version Conflicts:

Problem: Concurrent updates to same resource

User A: Update order (adds item)
User B: Update order (changes address)

Both read version 1 → Both try to write version 2

Solution: OPTIMISTIC CONCURRENCY CONTROL

DynamoDB conditional update:
dynamodb.update_item(
    Key={'orderId': 'order-123'},
    UpdateExpression='SET items = :items, version = :new_version',
    ConditionExpression='version = :current_version',
    ExpressionAttributeValues={
        ':items': new_items,
        ':current_version': 1,
        ':new_version': 2
    }
)

If version changed → ConditionalCheckFailedException
→ Re-read current state
→ Retry update with correct version

Event Ordering:

Problem: Events arrive out of order

Events:
1. OrderCreated (sent: 10:00:00)
2. OrderPaid (sent: 10:00:01)
3. OrderShipped (sent: 10:00:02)

Arrival:
1. OrderCreated (received: 10:00:00.500)
2. OrderShipped (received: 10:00:01.200) ← Out of order!
3. OrderPaid (received: 10:00:02.100)

Processing OrderShipped before OrderPaid = ERROR

Solutions:

1. SEQUENCE NUMBERS:
   {
     "eventType": "OrderShipped",
     "orderId": "order-123",
     "sequenceNumber": 3  ← Order indicator
   }
   
   Handler:
   if event.sequenceNumber != expected_sequence:
       buffer_event(event)  # Process later
       return
   
   process_event(event)
   expected_sequence += 1
   
   # Check buffer for next sequence
   check_buffered_events()

2. TIMESTAMP-BASED:
   {
     "eventType": "OrderShipped",
     "timestamp": "2025-11-17T10:00:02Z"
   }
   
   Handler:
   current_state = get_order_state(order_id)
   
   if event.timestamp < current_state.last_update:
       discard_event()  # Old event, ignore
       return
   
   process_event(event)

3. CAUSATION CHAIN:
   {
     "eventType": "OrderShipped",
     "causationId": "evt-order-paid-456"  ← Must happen after
   }
   
   Handler:
   if not is_causation_processed(event.causationId):
       buffer_event(event)  # Wait for dependency
       return
   
   process_event(event)

4. ACCEPT OUT-OF-ORDER:
   Design state machine to handle any order
   
   States: {created, paid, shipped, delivered}
   
   Transitions:
   - created → paid ✓
   - paid → shipped ✓
   - created → shipped ✗ (invalid)
   
   If OrderShipped arrives before OrderPaid:
   - Check if paid transition occurred
   - If not: Buffer or reject event

Saga Compensation:

Long-running business process fails partway:

OrderCreated → InventoryReserved → PaymentProcessed → ShippingFailed

Need to compensate (rollback):

ShippingFailed event
→ Refund payment (compensate PaymentProcessed)
→ Release inventory (compensate InventoryReserved)
→ Cancel order (compensate OrderCreated)

Implementation:
{
  "eventType": "ShippingFailed",
  "orderId": "order-123",
  "compensationRequired": [
    {
      "eventType": "PaymentProcessed",
      "compensationAction": "RefundPayment",
      "data": {...}
    },
    {
      "eventType": "InventoryReserved",
      "compensationAction": "ReleaseInventory",
      "data": {...}
    }
  ]
}

Compensation handler:
for compensation in event.compensationRequired:
    execute_compensation(compensation)
```


### Monitoring Event-Driven Systems

**Observability for Async Flows:**

```
Event Flow Monitoring:

Challenges:
- Request spans multiple async services
- No single transaction to track
- Events processed at different times
- Failures may be silent

Key Metrics:

1. EVENT METRICS:
   - Events published per second
   - Event processing latency (publish to processed)
   - Event processing success rate
   - Dead letter queue size
   - Event replay count

2. SERVICE METRICS:
   - Lambda invocations per service
   - Lambda errors per service
   - Lambda duration (P50, P95, P99)
   - DynamoDB read/write capacity
   - SQS queue depth

3. BUSINESS METRICS:
   - Orders completed per minute
   - Average order processing time (create to ship)
   - Order failure rate
   - Revenue per hour

CloudWatch Custom Metrics:

# Publish custom event metrics
cloudwatch = boto3.client('cloudwatch')

def publish_event_metrics(event_type, processing_time, success):
    cloudwatch.put_metric_data(
        Namespace='EventDriven/Events',
        MetricData=[
            {
                'MetricName': 'EventProcessingTime',
                'Value': processing_time,
                'Unit': 'Milliseconds',
                'Dimensions': [
                    {'Name': 'EventType', 'Value': event_type}
                ]
            },
            {
                'MetricName': 'EventProcessingSuccess',
                'Value': 1 if success else 0,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'EventType', 'Value': event_type}
                ]
            }
        ]
    )

# In Lambda handler
start_time = datetime.utcnow()

try:
    process_event(event)
    success = True
except:
    success = False

processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000

publish_event_metrics(
    event['detail-type'],
    processing_time,
    success
)

Distributed Tracing:

X-Ray for Event Flows:

# Publish event with trace context
trace_id = xray_recorder.current_segment().trace_id

events.put_events(
    Entries=[{
        'Source': 'order-service',
        'DetailType': 'OrderCreated',
        'Detail': json.dumps({
            'orderId': order_id,
            'traceId': trace_id,  # Propagate trace
            'data': {...}
        })
    }]
)

# Consumer extracts trace context
detail = event['detail']
trace_id = detail.get('traceId')

if trace_id:
    # Continue trace
    xray_recorder.begin_subsegment('process-order-created')
    
    process_event(detail)
    
    xray_recorder.end_subsegment()

Result: Full request trace across async services

[Client] → [Order Service] → [EventBridge]
    ↓
[Inventory Service] → [EventBridge]
    ↓
[Payment Service] → [EventBridge]
    ↓
[Notification Service]

All connected by same trace ID

Event Flow Dashboard:

Create CloudWatch Dashboard:

┌─────────────────────────────────────────────────┐
│ Event-Driven System Dashboard                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Events Published/sec:  [Graph: 50-100/sec]     │
│                                                 │
│ Event Processing Latency:                      │
│   P50: 150ms                                    │
│   P95: 500ms                                    │
│   P99: 1200ms                                   │
│                                                 │
│ Dead Letter Queue:  [Graph: 0-5 messages]      │
│                                                 │
│ Service Health:                                 │
│   Order Service:      ✓ (0 errors)             │
│   Inventory Service:  ✓ (0 errors)             │
│   Payment Service:    ⚠️ (3 errors/min)         │
│   Shipping Service:   ✓ (0 errors)             │
│                                                 │
│ Business Metrics:                               │
│   Orders/min:  [Graph: 20-30/min]              │
│   Success Rate: 99.2%                           │
│   Avg Time to Ship: 45 minutes                 │
└─────────────────────────────────────────────────┘

Alerting:

CloudWatch Alarms:

1. Dead Letter Queue Size > 10
   → Alert: Events failing repeatedly
   → Action: Investigate and reprocess

2. Event Processing Latency P99 > 5000ms
   → Alert: Slow event processing
   → Action: Check service health, scale consumers

3. Event Publishing Failure Rate > 1%
   → Alert: Events not reaching bus
   → Action: Check EventBridge limits, permissions

4. Service Error Rate > 5%
   → Alert: Service unhealthy
   → Action: Check logs, rollback if needed

Event Replay for Debugging:

When production issue occurs:
1. Archive contains all events
2. Replay events to debug environment
3. Reproduce issue
4. Fix bug
5. Replay events in production (after fix deployed)

Result: Zero data loss, issues reproducible
```


## Tips \& Best Practices

**Tip 1: Design Events as Facts, Not Commands**
Events state what happened ("OrderCreated"), not what to do ("CreateOrder")—enables multiple consumers without coupling to implementation.

**Tip 2: Include Correlation IDs in All Events**
Pass correlation ID through entire event chain—enables tracking request across async services, correlating logs, debugging distributed flows.

**Tip 3: Make All Event Handlers Idempotent**
Process each event exactly once despite duplicate deliveries—use DynamoDB for idempotency tracking, enable TTL for automatic cleanup.

**Tip 4: Use Dead Letter Queues for Failed Events**
Configure DLQ for every event consumer—prevents lost events, enables investigation and reprocessing after fixing bugs.

**Tip 5: Version Event Schemas Explicitly**
Include version in event structure—enables schema evolution, backward compatibility, multiple versions coexisting during migrations.

**Tip 6: Archive Events for Replay**
Enable EventBridge archive with 365-day retention—enables debugging production issues, recovering from bugs, adding new features to historical data.

**Tip 7: Monitor Event Processing Latency**
Track time from event publish to processing complete—identifies bottlenecks, slow consumers, scaling needs in event-driven flows.

**Tip 8: Use EventBridge Schema Registry**
Define and version event schemas centrally—enables discovery, validation, code generation, prevents schema drift across services.

**Tip 9: Implement Circuit Breakers for Event Publishing**
Fail fast when downstream dependencies unavailable—prevents resource exhaustion, enables graceful degradation, queues events for retry.

**Tip 10: Test Event Flows End-to-End**
Integration tests validate complete event chains—catches missing handlers, incorrect routing, idempotency issues before production.

## Chapter Summary

Event-driven architectures decouple producers from consumers through asynchronous event communication enabling independent scaling, natural resilience, and flexibility to add new consumers without modifying producers. Success requires implementing proven patterns—event sourcing for complete audit trails, CQRS for optimized read/write models, idempotency for exactly-once processing, and comprehensive monitoring with distributed tracing for visibility into async flows. Organizations adopting event-driven architecture achieve 10× faster feature development through loose coupling, independent service scaling reducing infrastructure costs 40%, and automatic resilience through message queuing—but must manage eventual consistency, handle duplicate events, and invest in observability to debug distributed systems effectively.

**Key Takeaways:**

- **Events as Facts:** Design events as immutable facts ("OrderCreated") not commands—enables multiple consumers, audit trails, event replay
- **Idempotency Essential:** Process duplicates safely using DynamoDB tracking—at-least-once delivery guarantees require idempotent handlers
- **Eventual Consistency Trade-off:** Accept async state updates—return command results, poll until ready, use WebSockets, or optimistic UI
- **Archive for Replay:** EventBridge archive enables debugging and recovery—replay historical events after fixing bugs, add features to past data
- **Monitor Event Flows:** Distributed tracing with correlation IDs—understand request paths across async services, identify bottlenecks
- **Choreography vs Orchestration:** Choreography for flexibility, orchestration for visibility—hybrid approach uses both appropriately
- **Dead Letter Queues Critical:** Configure DLQs for every consumer—prevents lost events, enables investigation and reprocessing

Event-driven architectures excel for: high-scale systems (millions events/day), loosely-coupled microservices, real-time data processing, audit requirements, and systems requiring independent service scaling. Less suitable for: strongly consistent transactions, simple CRUD applications, small teams without operational maturity, systems where request-response simplicity preferred.


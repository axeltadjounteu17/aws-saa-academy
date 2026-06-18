# Chapitre 34 : Architectures événementielles

##Présentation

Les architectures requête-réponse traditionnelles, dans lesquelles les services effectuent des appels synchrones en attendant des réponses, créent un couplage étroit, une fragilité sous charge et des goulots d'étranglement de mise à l'échelle qui paralysent les applications modernes. Une plate-forme de commerce électronique sur laquelle le service de commande appelle de manière synchrone le service d'inventaire, le service de paiement, le service de notification et le service d'expédition connaît des échecs en cascade lorsqu'une dépendance devient lente ou indisponible, ne peut pas faire évoluer les services individuels de manière indépendante et traite les commandes au rythme du service le plus lent de la chaîne. Lorsque le service de paiement connaît des retards de 5 secondes, l'ensemble du flux de commandes attend 5 secondes, même si les autres services sont sains, ce qui entraîne une mauvaise expérience utilisateur et un gaspillage de capacité d'infrastructure. Les architectures basées sur les événements, dans lesquelles les services communiquent via des événements asynchrones publiés sur des bus de messages, dissocient les producteurs des consommateurs, permettent une mise à l'échelle indépendante, assurent une résilience naturelle grâce à la mise en file d'attente des messages et permettent aux nouveaux services de s'abonner aux événements existants sans modifier les producteurs.

Le passage du synchrone au mode événementiel introduit de nouveaux modèles et défis : les événements représentent des événements qui se sont produits (OrderCreated, PaymentProcessed) nécessitant une réflexion différente de celle des commandes requête-réponse, l'ordre des événements sur les systèmes distribués ne peut être garanti sans une conception minutieuse, les événements en double doivent être gérés de manière idempotente et la cohérence éventuelle remplace la cohérence immédiate nécessitant une adaptation des processus métier. Un événement de traitement de paiement peut arriver avant l'événement de création de commande en raison de retards du réseau ; le traitement de l'événement de paiement deux fois ne doit pas facturer deux fois le client ; un inventaire finalement cohérent signifie afficher "5 en stock" alors qu'en réalité il en reste 3. Les organisations qui adoptent naïvement une architecture basée sur les événements sans résoudre les problèmes d'idempotence, d'ordre et de cohérence sont confrontées à des bogues de traitement en double, à des incohérences de données et à des cauchemars de débogage liés à des flux d'événements complexes. AWS fournit une boîte à outils complète basée sur les événements : EventBridge pour le routage des événements, SNS pour la diffusion pub/sub, SQS pour une mise en file d'attente fiable, Lambda pour le traitement des événements, Kinesis pour le streaming d'événements, permettant des systèmes pilotés par les événements évolutifs et résilients.

Ce chapitre synthétise les services AWS tout au long du manuel : Lambda sans serveur pour le traitement des événements, SQS/SNS depuis la messagerie pour la livraison des événements, DynamoDB pour le magasin d'événements, CloudWatch pour la surveillance, X-Ray pour le traçage distribué. Le chapitre couvre les modèles basés sur les événements (source d'événements, CQRS, chorégraphie ou orchestration), l'architecture de bus d'événements EventBridge, la mise en œuvre de l'idempotence, la gestion de la cohérence éventuelle, les capacités de relecture des événements, la surveillance des flux d'événements, les stratégies de file d'attente de lettres mortes et la création de systèmes de production pilotés par les événements qui permettent un couplage lâche, une mise à l'échelle indépendante et une résilience tout en gérant la complexité grâce à des modèles éprouvés et à une discipline opérationnelle.

## Théorie \&Concepts

### Fondamentaux de l'architecture événementielle

**Concepts et modèles de base :**
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
### Modèle de recherche d'événements

**Stockage de l'état sous forme de séquence d'événements :**
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
### CQRS (ségrégation des responsabilités des requêtes de commande)

**Modèles de lecture et d'écriture séparés :**
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
### Chorégraphie vs Orchestration

**Modèles de coordination basés sur les événements :**
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
## Implémentation pratique

### Atelier 1 : Créer un système piloté par les événements avec EventBridge

**Objectif :** Mettre en œuvre un système de traitement des commandes basé sur les événements à l'aide d'EventBridge, Lambda et SQS.

**Étape 1 : Créer un bus d'événements EventBridge**
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
**Étape 2 : Créer des fonctions Lambda de traitement d'événements**
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
**Étape 3 : Créer des règles EventBridge**
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
**Étape 4 : Publier les événements et tester**
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
### Atelier 2 : Implémentation de l'idempotence avec DynamoDB

**Objectif :** Garantir que les événements sont traités exactement une seule fois malgré les diffusions en double.

**Étape 1 : Créer une table d'idempotence**
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
**Étape 2 : Modèle de gestionnaire d'événements idempotent**
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
**Étape 3 : Test de l'idempotence**
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
### Atelier 3 : Implémentation de la relecture d'événements

**Objectif :** Relire les événements archivés pour le débogage ou le retraitement.

**Étape 1 : interroger l'archive d'événements**
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
**Étape 2 : Relecture sélective d'événements**
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
## Connaissances au niveau de la production

### Gérer la cohérence éventuelle

**Gestion de l'état asynchrone dans les systèmes pilotés par événements :**
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
### Surveillance des systèmes pilotés par les événements

**Observabilité pour les flux asynchrones :**
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
## Conseils \& Bonnes pratiques

**Astuce 1 : Concevez les événements comme des faits et non comme des commandes**
Les événements indiquent ce qui s'est passé (« OrderCreated »), et non ce qu'il faut faire (« CreateOrder ») : ils permettent à plusieurs consommateurs sans couplage à l'implémentation.

**Astuce 2 : Incluez les ID de corrélation dans tous les événements**
Transmettez l'ID de corrélation à travers toute la chaîne d'événements : permet le suivi des demandes sur les services asynchrones, la corrélation des journaux et le débogage des flux distribués.

**Astuce 3 : Rendre tous les gestionnaires d'événements idempotents**
Traitez chaque événement exactement une fois malgré les livraisons en double : utilisez DynamoDB pour le suivi de l'idempotence, activez TTL pour le nettoyage automatique.

**Astuce 4 : Utilisez les files d'attente de lettres mortes pour les événements ayant échoué**
Configurez DLQ pour chaque consommateur d'événements : évite la perte d'événements, permet l'investigation et le retraitement après la correction des bogues.

**Astuce 5 : Les schémas d'événements de version sont explicites**
Inclure la version dans la structure des événements : permet l'évolution du schéma, la compatibilité ascendante et la coexistence de plusieurs versions lors des migrations.

**Astuce 6 : archivez les événements pour les rejouer**
Activez l'archive EventBridge avec une conservation de 365 jours : permet de déboguer les problèmes de production, de récupérer des bugs et d'ajouter de nouvelles fonctionnalités aux données historiques.

**Astuce 7 : Surveillez la latence du traitement des événements**
Suivez le temps écoulé depuis la publication de l'événement jusqu'à la fin du traitement : identifie les goulots d'étranglement, les consommateurs lents et l'évolution des besoins dans les flux pilotés par les événements.

**Astuce 8 : Utilisez le registre de schémas EventBridge**
Définissez et versionnez les schémas d'événements de manière centralisée : permet la découverte, la validation et la génération de code et empêche la dérive des schémas entre les services.

**Astuce 9 : implémentez des disjoncteurs pour la publication d'événements**
Échec rapide lorsque les dépendances en aval ne sont pas disponibles : évite l'épuisement des ressources, permet une dégradation progressive, met les événements en file d'attente pour une nouvelle tentative.

**Astuce 10 : Testez les flux d'événements de bout en bout**
Les tests d'intégration valident des chaînes d'événements complètes : détectent les gestionnaires manquants, le routage incorrect et les problèmes d'idempotence avant la production.

## Résumé du chapitre

Les architectures événementielles dissocient les producteurs des consommateurs grâce à une communication événementielle asynchrone permettant une mise à l'échelle indépendante, une résilience naturelle et une flexibilité pour ajouter de nouveaux consommateurs sans modifier les producteurs. Le succès nécessite la mise en œuvre de modèles éprouvés : recherche d'événements pour des pistes d'audit complètes, CQRS pour des modèles de lecture/écriture optimisés, idempotence pour un traitement unique et surveillance complète avec traçage distribué pour une visibilité sur les flux asynchrones. Les organisations qui adoptent une architecture basée sur les événements parviennent à un développement de fonctionnalités 10 fois plus rapide grâce à un couplage lâche, à une mise à l'échelle indépendante des services réduisant les coûts d'infrastructure de 40 % et à une résilience automatique grâce à la mise en file d'attente des messages. Mais elles doivent gérer la cohérence éventuelle, gérer les événements en double et investir dans l'observabilité pour déboguer efficacement les systèmes distribués.

**Principaux points à retenir :**

- **Événements en tant que faits :** Concevez les événements comme des faits immuables ("OrderCreated") et non comme des commandes : permet plusieurs consommateurs, des pistes d'audit et la relecture des événements.
- **Idempotency Essential :** Traitez les duplications en toute sécurité à l'aide du suivi DynamoDB : les garanties de livraison au moins une fois nécessitent des gestionnaires idempotents.
- **Éventuel compromis de cohérence :** Acceptez les mises à jour d'état asynchrones : renvoyez les résultats de la commande, interrogez jusqu'à ce que vous soyez prêt, utilisez WebSockets ou une interface utilisateur optimiste
- **Archive pour la relecture :** L'archive EventBridge permet le débogage et la récupération : rejouez les événements historiques après avoir corrigé les bogues, ajoutez des fonctionnalités aux données passées
- **Surveiller les flux d'événements :** Traçage distribué avec des ID de corrélation : comprendre les chemins de requêtes dans les services asynchrones, identifier les goulots d'étranglement
- **Chorégraphie vs Orchestration :** Chorégraphie pour la flexibilité, orchestration pour la visibilité : l'approche hybride utilise les deux de manière appropriée
- **Files d'attente de lettres mortes critiques :** Configurez les DLQ pour chaque consommateur : évite la perte d'événements, permet l'investigation et le retraitement.

Les architectures basées sur les événements excellent pour : les systèmes à grande échelle (millions d'événements/jour), les microservices faiblement couplés, le traitement des données en temps réel, les exigences d'audit et les systèmes nécessitant une mise à l'échelle indépendante des services. Moins adapté pour : les transactions fortement cohérentes, les applications CRUD simples, les petites équipes sans maturité opérationnelle, les systèmes où la simplicité requête-réponse est privilégiée.
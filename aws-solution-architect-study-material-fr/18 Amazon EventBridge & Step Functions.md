# Chapitre 18 : Amazon EventBridge \& Fonctions d'étape

##Présentation

Les applications cloud modernes nécessitent une orchestration : coordonner plusieurs services, gérer les pannes avec élégance, gérer les flux de travail de longue durée et répondre aux événements sur les systèmes distribués. Amazon EventBridge et AWS Step Functions résolvent ces défis grâce à des architectures basées sur les événements et à une orchestration visuelle des flux de travail. EventBridge achemine les événements entre les services AWS, les applications SaaS et les applications personnalisées sans écrire de code d'intégration, tandis que Step Functions coordonne les services distribués via des machines à états, gérant les tentatives, l'exécution parallèle, la gestion des erreurs et les approbations humaines avec une conception visuelle du flux de travail.

Le passage des architectures monolithiques aux architectures de microservices rend l’orchestration essentielle. Envisagez un workflow d'exécution des commandes : validez le paiement, vérifiez l'inventaire, réservez des articles, facturez le client, mettez à jour la base de données, envoyez un e-mail de confirmation, déclenchez le système d'entrepôt et mettez à jour les analyses. Les approches traditionnelles associent étroitement ces étapes dans le code de l'application, ce qui rend les modifications risquées et les échecs catastrophiques. EventBridge découple les services via le routage des événements : le placement des commandes déclenche des événements traités par plusieurs services indépendants. Step Functions orchestre la séquence en définissant visuellement la logique du flux de travail, en réessayant automatiquement les échecs, en établissant des branchements en fonction des conditions et en fournissant des pistes d'audit de chaque exécution.

Comprendre EventBridge et Step Functions sépare profondément l’automatisation de base de l’orchestration de niveau production. Les modèles d’événements trop complexes passent à côté d’événements critiques. La gestion des erreurs manquante provoque des échecs silencieux. Une mauvaise conception de la machine à états atteint les limites d’exécution. Ne pas utiliser d’états parallèles fait perdre du temps. Les modèles de saga manquants laissent les systèmes distribués dans des états incohérents. Ce chapitre couvre les architectures basées sur les événements et l'orchestration des flux de travail, depuis les principes fondamentaux jusqu'aux modèles de production, y compris les bus d'événements, les modèles d'événements, le registre de schémas, les types de machines à états, la gestion des erreurs, les stratégies de nouvelle tentative, l'exécution parallèle, les modèles de saga, la surveillance et la création de systèmes distribués résilients.

## Théorie \&Concepts

### Fondamentaux de l'architecture événementielle

**Architecture traditionnelle ou basée sur les événements :**
```
Traditional Synchronous Architecture:

Service A calls Service B calls Service C
Problems:
- Tight coupling (A knows about B, B knows about C)
- Cascading failures (C down → B fails → A fails)
- Scaling complexity (coordinate scaling)
- Change impact (modify C affects B and A)
- Long response times (sum of all latencies)

Example: Order Processing
API → Payment Service → Inventory Service → Email Service
↓         ↓                ↓                  ↓
Wait    Process          Update            Send
(200ms)  (300ms)         (150ms)          (100ms)
Total latency: 750ms

If email service is down → entire order fails

Event-Driven Architecture:

Service A publishes event → Event Bus → Multiple services subscribe
Benefits:
✓ Loose coupling (services don't know each other)
✓ Failure isolation (one service down doesn't affect others)
✓ Independent scaling (each service scales separately)
✓ Easy to add services (no code changes)
✓ Fast response (fire-and-forget)

Example: Order Processing
API → Order Event → EventBridge → Payment Service
                               → Inventory Service
                               → Email Service
                               → Analytics Service
↓
Return (50ms) - Order accepted

Services process independently:
- Payment processes in 300ms
- Inventory updates in 150ms
- Email sends in 100ms
- All happen in parallel

If email fails → order still succeeds, email retries later
```
**Modèles basés sur les événements :**
```
1. Event Notification:
Service publishes event, subscribers notified
No response expected from subscribers
Fire-and-forget pattern

Example: User signs up → Welcome email event
Publisher: User Service
Event: UserSignedUp {userId, email, timestamp}
Subscribers: Email Service, Analytics Service

2. Event-Carried State Transfer:
Event contains full state, no need to query origin
Subscribers cache state locally
Reduces coupling

Example: Product price changes
Event: ProductPriceChanged {productId, oldPrice, newPrice, name, category}
Subscribers update local cache without calling Product Service

3. Event Sourcing:
All state changes stored as sequence of events
Current state derived by replaying events
Complete audit trail

Example: Bank Account
Events: AccountOpened, MoneyDeposited, MoneyWithdrawn
Current balance = sum of all events
Can reconstruct state at any point in time

4. CQRS (Command Query Responsibility Segregation):
Separate write model (commands) from read model (queries)
Events update read models
Optimized for each access pattern

Example: E-commerce
Write Model: Order commands (create, update, cancel)
Read Models: Order history, analytics, reporting
Events keep read models synchronized
```
### Architecture Amazon EventBridge

**Composants EventBridge :**
```
Event Bus:
- Central routing hub for events
- Three types: Default, Custom, Partner
- Events route based on rules
- Highly available, serverless

Event:
- JSON document describing state change
- Contains: source, detail-type, detail, time, region, account
- Maximum size: 256 KB
- Immutable once published

Rule:
- Pattern matching for events
- Targets: Services to invoke
- Up to 5 targets per rule
- Can transform event before sending

Target:
- AWS service receiving matched events
- Examples: Lambda, SQS, SNS, Step Functions, Kinesis
- Can be in different account/region
- Retry logic built-in
```
**Types de bus d'événement :**
```
Default Event Bus:
- One per account per region
- Receives AWS service events automatically
- Cannot be deleted
- Free for AWS service events

Use Cases:
- AWS service integrations
- CloudWatch Events migration
- Simple event routing

Custom Event Bus:
- Created explicitly
- For custom application events
- Can be shared across accounts
- Resource-based policies

Use Cases:
- Multi-tenant applications (one bus per tenant)
- Organizational separation
- Cross-account event routing
- Business domain separation

Partner Event Bus:
- Created by SaaS partners
- Receives events from partner services
- Examples: Zendesk, Datadog, Auth0

Use Cases:
- SaaS integration
- Third-party events
- External system events

Multi-Bus Architecture:

Organization Event Bus (Shared)
├── Account A: Production Event Bus
│   ├── Microservice A events
│   └── Microservice B events
├── Account B: Development Event Bus
│   └── Test events
└── Account C: Analytics Event Bus
    └── All events for analysis

Benefits:
✓ Isolation by environment/domain
✓ Fine-grained access control
✓ Simplified management
✓ Cross-account routing
```
**Correspondance de modèles d'événements :**

Les modèles d'événements filtrent les événements qui déclenchent les règles :
```
Event Structure:
{
  "version": "0",
  "id": "uuid",
  "detail-type": "Order Placed",
  "source": "com.myapp.orders",
  "account": "123456789012",
  "time": "2025-01-15T10:30:00Z",
  "region": "us-east-1",
  "resources": [],
  "detail": {
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": 299.99,
    "status": "pending",
    "items": [...]
  }
}

Pattern Matching Examples:

1. Exact Match:
{
  "source": ["com.myapp.orders"],
  "detail-type": ["Order Placed"]
}
Matches: Events from orders source with Order Placed type

2. Prefix Match:
{
  "source": [{"prefix": "com.myapp."}]
}
Matches: Any event from com.myapp.* sources

3. Suffix Match:
{
  "detail-type": [{"suffix": ".created"}]
}
Matches: UserCreated, OrderCreated, etc.

4. Numeric Range:
{
  "detail": {
    "amount": [{"numeric": [">", 100]}]
  }
}
Matches: Orders with amount > 100

5. Exists Check:
{
  "detail": {
    "customerId": [{"exists": true}]
  }
}
Matches: Events containing customerId field

6. Anything-But:
{
  "detail": {
    "status": [{"anything-but": ["cancelled", "failed"]}]
  }
}
Matches: All statuses except cancelled and failed

7. Complex Pattern:
{
  "source": ["com.myapp.orders"],
  "detail-type": ["Order Placed"],
  "detail": {
    "amount": [{"numeric": [">=", 1000]}],
    "region": ["us-east", "us-west"],
    "priority": [{"anything-but": ["low"]}]
  }
}
Matches: High-value orders in US with non-low priority

Pattern Best Practices:
✓ Be specific (reduce unnecessary invocations)
✓ Use prefix/suffix for flexibility
✓ Validate patterns before production
✓ Document pattern logic
✓ Test with sample events
```
**Registre de schémas EventBridge :**

Schema Registry découvre, stocke et versions les schémas d'événements :
```
Purpose:
- Discover event structure automatically
- Generate code bindings for events
- Version control for schemas
- Documentation and discovery

Schema Discovery:
EventBridge analyzes events on bus
    ↓
Automatically infers schema structure
    ↓
Stores in Schema Registry
    ↓
Developers browse available events

Schema Versioning:
Version 1: {orderId, amount}
    ↓
Event structure changes
    ↓
Version 2: {orderId, amount, currency, tax}
    ↓
Both versions supported
    ↓
Consumers upgrade at own pace

Code Generation:
Select schema from registry
    ↓
Generate code bindings (Java, Python, TypeScript)
    ↓
Type-safe event handling in application

Example Generated Code (Python):
from aws_schema_registry import OrderPlaced

def handler(event):
    order = OrderPlaced.from_dict(event['detail'])
    print(f"Order {order.order_id} for ${order.amount}")
    # Type-safe access to event fields

Benefits:
✓ Discover available events
✓ Type-safe event handling
✓ Version management
✓ Code generation
✓ Schema validation
```
**Relecture et archivage de l'événement :**
```
Event Archive:
- Store events for replay/audit
- Retention: Indefinite
- Replays events to same or different bus

Use Cases:
1. Disaster Recovery:
   System failure → Replay events → Restore state

2. Testing:
   Capture production events → Replay in test environment

3. New Service:
   Deploy new service → Replay historical events → Catch up

4. Debugging:
   Issue occurred → Replay specific events → Reproduce problem

Archive Configuration:
Archive Name: production-order-events
Event Pattern: {source: ["com.myapp.orders"]}
Retention: Indefinite
Archive Size: Pay for storage ($0.023/GB-month)

Replay Process:
1. Create archive (continuous or one-time)
2. Events matching pattern stored
3. Initiate replay when needed
4. Specify:
   - Time range (start/end)
   - Destination bus
   - Replay speed (as-fast-as-possible or original timing)

Example Scenario:
New analytics service deployed
    ↓
Needs last 30 days of order events
    ↓
Replay from archive
    ↓
Service processes historical data
    ↓
Catches up to present
    ↓
Begins processing real-time events

Limitations:
- Replay order not guaranteed (parallel replay)
- Events replayed with new timestamp
- Original event ID preserved in replay-name field
```
### Architecture des fonctions étape AWS

**Fondamentaux de la machine à états :**

Step Functions coordonne les systèmes distribués via des machines à états :
```
State Machine:
- Visual workflow definition
- JSON specification (Amazon States Language)
- Coordinates multiple services
- Handles errors and retries
- Provides execution history

State Machine Types:

Standard Workflows:
- Duration: Up to 1 year
- Execution rate: 2,000/second
- Pricing: Per state transition
- Use: Long-running workflows

Characteristics:
✓ Exactly-once execution
✓ Full execution history
✓ Audit trail
✓ Visual monitoring

Use Cases:
- Multi-step business processes
- Long-running tasks
- Human approval workflows
- Batch processing

Express Workflows:
- Duration: Up to 5 minutes
- Execution rate: 100,000/second
- Pricing: Per execution duration
- Use: High-volume event processing

Characteristics:
✓ At-least-once execution
✓ Minimal history (CloudWatch Logs)
✓ Higher throughput
✓ Lower cost for high-volume

Subtypes:
- Synchronous: Wait for completion (API Gateway integration)
- Asynchronous: Fire-and-forget (EventBridge, Lambda)

Use Cases:
- IoT data processing
- Streaming data transformation
- High-volume microservices
- Real-time processing

Comparison:
Standard: Long-running, audit trail, exactly-once
Express: High-volume, short-duration, at-least-once
```
**Types d'état :**
```
1. Task State:
Performs work (invoke Lambda, publish SNS, call API)

Example:
"ProcessPayment": {
  "Type": "Task",
  "Resource": "arn:aws:lambda:...:function:process-payment",
  "Next": "CheckInventory"
}

2. Choice State:
Branching logic based on input

Example:
"CheckAmount": {
  "Type": "Choice",
  "Choices": [
    {
      "Variable": "$.amount",
      "NumericGreaterThan": 1000,
      "Next": "HighValueOrder"
    },
    {
      "Variable": "$.amount",
      "NumericLessThanEquals": 1000,
      "Next": "StandardOrder"
    }
  ],
  "Default": "StandardOrder"
}

3. Parallel State:
Execute multiple branches simultaneously

Example:
"ProcessOrder": {
  "Type": "Parallel",
  "Branches": [
    {
      "StartAt": "ChargeCustomer",
      "States": {...}
    },
    {
      "StartAt": "UpdateInventory",
      "States": {...}
    },
    {
      "StartAt": "SendEmail",
      "States": {...}
    }
  ],
  "Next": "OrderComplete"
}

4. Map State:
Iterate over array elements

Example:
"ProcessItems": {
  "Type": "Map",
  "ItemsPath": "$.items",
  "Iterator": {
    "StartAt": "ValidateItem",
    "States": {...}
  },
  "Next": "CompleteOrder"
}

5. Wait State:
Delay execution

Example:
"WaitForApproval": {
  "Type": "Wait",
  "Seconds": 3600,
  "Next": "CheckApprovalStatus"
}

Or:
"WaitUntilDueDate": {
  "Type": "Wait",
  "TimestampPath": "$.dueDate",
  "Next": "ProcessPayment"
}

6. Succeed State:
Successful termination

Example:
"OrderCompleted": {
  "Type": "Succeed"
}

7. Fail State:
Failed termination with error

Example:
"OrderFailed": {
  "Type": "Fail",
  "Error": "OrderProcessingError",
  "Cause": "Payment declined"
}

8. Pass State:
Pass input to output (transform data)

Example:
"TransformData": {
  "Type": "Pass",
  "Result": {
    "status": "processing"
  },
  "ResultPath": "$.orderStatus",
  "Next": "ProcessOrder"
}
```
**Gestion des erreurs et logique de nouvelle tentative :**

Step Functions fournit une gestion sophistiquée des erreurs :
```
Error Types:

Predefined Errors:
- States.ALL: Catch-all for any error
- States.Timeout: Execution timeout
- States.TaskFailed: Task execution failed
- States.Permissions: IAM permission denied
- States.ResultPathMatchFailure: Result path invalid
- States.ParameterPathFailure: Parameter path invalid
- States.BranchFailed: Parallel branch failed
- States.NoChoiceMatched: No choice matched

Custom Errors:
Applications can throw named errors:
- PaymentDeclined
- InsufficientInventory
- InvalidOrderData

Retry Configuration:

"Retry": [
  {
    "ErrorEquals": ["States.TaskFailed"],
    "IntervalSeconds": 2,
    "MaxAttempts": 3,
    "BackoffRate": 2.0
  }
]

Retry Behavior:
Attempt 1: Fails
Wait 2 seconds
Attempt 2: Fails
Wait 4 seconds (2 × 2.0)
Attempt 3: Fails
Wait 8 seconds (4 × 2.0)
Final attempt: Fails → Move to Catch

Catch Configuration:

"Catch": [
  {
    "ErrorEquals": ["PaymentDeclined"],
    "Next": "HandlePaymentDecline",
    "ResultPath": "$.error"
  },
  {
    "ErrorEquals": ["States.ALL"],
    "Next": "HandleGenericError"
  }
]

Error Handling Flow:
Task executes → Error occurs
    ↓
Check Retry configuration
    ↓
If retries remaining → Retry with backoff
    ↓
If retries exhausted → Check Catch
    ↓
If Catch matches → Transition to error state
    ↓
If no Catch → Execution fails

Best Practices:
✓ Retry transient errors (network, throttling)
✓ Don't retry permanent errors (validation, not found)
✓ Use exponential backoff (BackoffRate > 1)
✓ Catch specific errors before generic
✓ Log errors for debugging
✓ Set reasonable MaxAttempts (3-5)
```
**Traitement des entrées/sorties :**

Step Functions manipule les données circulant à travers les états :
```
Input/Output Path Concepts:

InputPath:
- Selects portion of input to pass to state
- JSONPath expression
- Default: "$" (entire input)

OutputPath:
- Selects portion of output to pass to next state
- JSONPath expression
- Default: "$" (entire output)

ResultPath:
- Where to place task result in output
- Can merge result with input
- Default: "$" (replace entire output)

Parameters:
- Construct input for task
- Can use input values, context variables
- Flexible data transformation

Example Workflow:

Input to State:
{
  "order": {
    "orderId": "123",
    "amount": 299.99
  },
  "customer": {
    "customerId": "456",
    "email": "user@example.com"
  }
}

State Definition:
"ProcessPayment": {
  "Type": "Task",
  "Resource": "arn:aws:lambda:...",
  "InputPath": "$.order",
  "Parameters": {
    "orderId.$": "$.orderId",
    "amount.$": "$.amount"
  },
  "ResultPath": "$.paymentResult",
  "OutputPath": "$",
  "Next": "SendConfirmation"
}

Step-by-Step:
1. InputPath selects: {"orderId": "123", "amount": 299.99}
2. Parameters constructs: {"orderId": "123", "amount": 299.99}
3. Lambda executes, returns: {"transactionId": "txn-789", "status": "success"}
4. ResultPath merges result:
{
  "order": {...},
  "customer": {...},
  "paymentResult": {
    "transactionId": "txn-789",
    "status": "success"
  }
}
5. OutputPath passes entire object to next state

Context Variables:

$$.Execution.Id - Unique execution ID
$$.Execution.Name - Execution name
$$.Execution.StartTime - Start timestamp
$$.State.Name - Current state name
$$.State.EnteredTime - State entry time

Use in Parameters:
"Parameters": {
  "executionId.$": "$$.Execution.Id",
  "orderId.$": "$.order.orderId"
}
```
**Modèles de traitement parallèle :**
```
Pattern 1: Parallel Independent Tasks

"ProcessOrder": {
  "Type": "Parallel",
  "Branches": [
    {
      "StartAt": "ProcessPayment",
      "States": {
        "ProcessPayment": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...",
          "End": true
        }
      }
    },
    {
      "StartAt": "UpdateInventory",
      "States": {
        "UpdateInventory": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...",
          "End": true
        }
      }
    },
    {
      "StartAt": "SendNotification",
      "States": {
        "SendNotification": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...",
          "End": true
        }
      }
    }
  ],
  "Next": "AggregateResults"
}

Execution:
All three branches execute simultaneously
Payment: 300ms
Inventory: 150ms
Notification: 100ms
Total time: 300ms (slowest branch)
Sequential would be: 550ms

Pattern 2: Map State for Iteration

Process 100 items:

"ProcessItems": {
  "Type": "Map",
  "ItemsPath": "$.items",
  "MaxConcurrency": 10,
  "Iterator": {
    "StartAt": "ProcessItem",
    "States": {
      "ProcessItem": {
        "Type": "Task",
        "Resource": "arn:aws:lambda:...",
        "End": true
      }
    }
  },
  "ResultPath": "$.processedItems",
  "Next": "Complete"
}

Execution:
100 items processed in batches of 10 concurrent
Each item: 1 second
Total time: 10 seconds (vs 100 seconds sequential)

Benefits:
✓ Dramatically faster execution
✓ Better resource utilization
✓ Independent failure handling
✓ Automatic aggregation of results
```
### Modèles d'orchestration

**Modèle Saga (transactions distribuées) :**

Le modèle Saga gère les transactions distribuées sans 2PC (validation en deux phases) :
```
Problem: Distributed Transaction

Order Service → Payment Service → Inventory Service → Shipping Service

Requirements:
- All succeed or all rollback
- No 2PC available (microservices)
- Need consistency

Saga Solution: Sequence of local transactions with compensating actions

Forward Path (Success):
1. Reserve Inventory → Success
2. Process Payment → Success
3. Create Shipment → Success
4. Order Complete → Success

Compensating Path (Failure at step 3):
1. Reserve Inventory → Success
2. Process Payment → Success
3. Create Shipment → FAILS
4. Compensate Payment (refund) ← Rollback
5. Compensate Inventory (release) ← Rollback
6. Order Failed

Step Functions Implementation:

"OrderSaga": {
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:reserve-inventory",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "OrderFailed"
      }],
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:process-payment",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "CompensateInventory"
      }],
      "Next": "CreateShipment"
    },
    "CreateShipment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:create-shipment",
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "CompensatePayment"
      }],
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "CompensatePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:refund-payment",
      "Next": "CompensateInventory"
    },
    "CompensateInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...:release-inventory",
      "Next": "OrderFailed"
    },
    "OrderFailed": {
      "Type": "Fail",
      "Error": "OrderProcessingFailed"
    }
  }
}

Key Points:
✓ Each service has compensating action
✓ Failures trigger rollback chain
✓ Eventually consistent
✓ Audit trail of all steps
✓ No distributed locks
```
**Modèle humain dans la boucle :**
```
Workflow with Manual Approval:

"OrderApprovalWorkflow": {
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...",
      "Next": "CheckAmount"
    },
    "CheckAmount": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.amount",
        "NumericGreaterThan": 10000,
        "Next": "RequestApproval"
      }],
      "Default": "ProcessOrder"
    },
    "RequestApproval": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sqs:sendMessage.waitForTaskToken",
      "Parameters": {
        "QueueUrl": "https://sqs...",
        "MessageBody": {
          "orderId.$": "$.orderId",
          "amount.$": "$.amount",
          "taskToken.$": "$$.Task.Token"
        }
      },
      "Next": "ProcessOrder"
    },
    "ProcessOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:...",
      "End": true
    }
  }
}

Flow:
1. Order validated
2. If > $10,000 → Request approval
3. Workflow pauses (waitForTaskToken)
4. Message sent to SQS
5. Admin reviews order
6. Admin approves/rejects
7. Call SendTaskSuccess/SendTaskFailure API
8. Workflow resumes
9. Process or cancel order

Benefits:
✓ Workflow pauses indefinitely
✓ No polling required
✓ Human decision integrated
✓ Complete audit trail
✓ Timeout supported (max 1 year)
```
## Implémentation pratique

### Atelier 1 : Règle EventBridge vers Lambda
```python
import boto3

events = boto3.client('events')

# Create custom event bus
events.create_event_bus(Name='orders-bus')

# Create rule
events.put_rule(
    Name='high-value-orders',
    EventBusName='orders-bus',
    EventPattern=json.dumps({
        'source': ['com.myapp.orders'],
        'detail-type': ['Order Placed'],
        'detail': {
            'amount': [{'numeric': ['>', 1000]}]
        }
    }),
    State='ENABLED'
)

# Add Lambda target
events.put_targets(
    Rule='high-value-orders',
    EventBusName='orders-bus',
    Targets=[{
        'Id': '1',
        'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:process-high-value-order'
    }]
)
```
### Atelier 2 : Machine à états des fonctions d'étape
```json
{
  "Comment": "Order processing workflow",
  "StartAt": "ValidateOrder",
  "States": {
    "ValidateOrder": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:validate-order",
      "Next": "ProcessPayment"
    },
    "ProcessPayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-payment",
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }],
      "Catch": [{
        "ErrorEquals": ["PaymentDeclined"],
        "Next": "PaymentFailed"
      }],
      "Next": "FulfillOrder"
    },
    "FulfillOrder": {
      "Type": "Parallel",
      "Branches": [
        {
          "StartAt": "UpdateInventory",
          "States": {
            "UpdateInventory": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:...:function:update-inventory",
              "End": true
            }
          }
        },
        {
          "StartAt": "SendConfirmation",
          "States": {
            "SendConfirmation": {
              "Type": "Task",
              "Resource": "arn:aws:lambda:...:function:send-email",
              "End": true
            }
          }
        }
      ],
      "Next": "OrderComplete"
    },
    "OrderComplete": {
      "Type": "Succeed"
    },
    "PaymentFailed": {
      "Type": "Fail",
      "Error": "PaymentDeclined",
      "Cause": "Customer payment was declined"
    }
  }
}
```
## Conseils \& Bonnes pratiques

**Astuce 1 : Utilisez les archives d'événements pour la relecture**
Activez toujours les archives pour les événements de production, ce qui est inestimable pour la reprise après sinistre et le débogage.

**Astuce 2 : Commencez par des flux de travail express pour les gros volumes**
Utilisez les workflows Express pour l'IoT/le streaming (débit de 100 000/s contre 2 000/s en standard).

**Astuce 3 : implémentez le modèle Saga pour les transactions distribuées**
Utilisez des transactions compensatoires au lieu de verrous distribués, plus résilients pour les microservices.

**Astuce 4 : Utilisez les états parallèles pour réduire la latence**
Exécuter des tâches indépendantes en parallèle (3 tâches × 1s = 1s au total vs 3s séquentielles).

**Astuce 5 : Tirez parti de waitForTaskToken pour l'approbation humaine**
Suspendez les flux de travail indéfiniment pour les approbations manuelles sans interrogation ni délai d'attente.

## Pièges \& Remèdes

**Piège 1 : modèles d'événements trop complexes**
*Problème :* Modèles d'événements manqués trop spécifiques ; trop large déclenche des invocations inutiles.
*Solution :* Modèles de test avec des exemples d'événements ; commencez largement, affinez en fonction de l'utilisation réelle.

**Piège 2 : Gestion des erreurs manquantes dans les machines à états**
*Problème :* Les erreurs non gérées entraînent l'échec de l'ensemble du flux de travail sans nettoyage.
*Solution :* Ajoutez Retry et Catch à chaque état de tâche ; mettre en œuvre des actions compensatoires.

**Piège 3 : problèmes d'expiration du délai d'attente de la machine d'état**
*Problème :* Les flux de travail atteignent la limite d'un an ou la limite express de 5 minutes.
*Solution :* Utilisez Standard pour les longs flux de travail ; divisez les gros flux de travail en sous-flux de travail plus petits.

## Questions de révision

1. **Taille maximale de l'événement EventBridge ?** 256 Ko
2. **Step Functions Durée maximale du flux de travail standard ?** 1 an
3. **Durée maximale du flux de travail Step Functions Express ?** 5 minutes
4. **Cibles maximales EventBridge par règle ?** 5
5. **Limite d'exécution de Step Functions (standard) ?** 2 000 par seconde et par compte

***
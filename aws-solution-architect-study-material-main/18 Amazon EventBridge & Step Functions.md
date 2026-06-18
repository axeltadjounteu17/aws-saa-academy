# Chapter 18: Amazon EventBridge \& Step Functions

## Introduction

Modern cloud applications require orchestration—coordinating multiple services, handling failures gracefully, managing long-running workflows, and responding to events across distributed systems. Amazon EventBridge and AWS Step Functions solve these challenges through event-driven architectures and visual workflow orchestration. EventBridge routes events between AWS services, SaaS applications, and custom applications without writing integration code, while Step Functions coordinates distributed services through state machines, handling retries, parallel execution, error handling, and human approvals with visual workflow design.

The shift from monolithic to microservices architectures makes orchestration essential. Consider an order fulfillment workflow: validate payment, check inventory, reserve items, charge customer, update database, send confirmation email, trigger warehouse system, and update analytics. Traditional approaches tightly couple these steps in application code, making changes risky and failures catastrophic. EventBridge decouples services through event routing—order placement triggers events that multiple independent services process. Step Functions orchestrates the sequence—defining workflow logic visually, automatically retrying failures, branching based on conditions, and providing audit trails of every execution.

Understanding EventBridge and Step Functions deeply separates basic automation from production-grade orchestration. Overly complex event patterns miss critical events. Missing error handling causes silent failures. Improper state machine design hits execution limits. Not using parallel states wastes time. Missing saga patterns leave distributed systems in inconsistent states. This chapter covers event-driven architectures and workflow orchestration from fundamentals to production patterns, including event buses, event patterns, schema registry, state machine types, error handling, retry strategies, parallel execution, saga patterns, monitoring, and building resilient distributed systems.

## Theory \& Concepts

### Event-Driven Architecture Fundamentals

**Traditional vs Event-Driven Architecture:**

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

**Event-Driven Patterns:**

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


### Amazon EventBridge Architecture

**EventBridge Components:**

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

**Event Bus Types:**

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

**Event Pattern Matching:**

Event patterns filter which events trigger rules:

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

**EventBridge Schema Registry:**

Schema Registry discovers, stores, and versions event schemas:

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

**Event Replay and Archive:**

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


### AWS Step Functions Architecture

**State Machine Fundamentals:**

Step Functions coordinates distributed systems through state machines:

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

**State Types:**

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

**Error Handling and Retry Logic:**

Step Functions provides sophisticated error handling:

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

**Input/Output Processing:**

Step Functions manipulates data flowing through states:

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

**Parallel Processing Patterns:**

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


### Orchestration Patterns

**Saga Pattern (Distributed Transactions):**

Saga pattern handles distributed transactions without 2PC (two-phase commit):

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

**Human-in-the-Loop Pattern:**

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


## Hands-On Implementation

### Lab 1: EventBridge Rule to Lambda

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


### Lab 2: Step Functions State Machine

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


## Tips \& Best Practices

**Tip 1: Use Event Archives for Replay**
Always enable archives for production events—invaluable for disaster recovery and debugging.

**Tip 2: Start with Express Workflows for High-Volume**
Use Express workflows for IoT/streaming (100,000/sec throughput vs Standard 2,000/sec).

**Tip 3: Implement Saga Pattern for Distributed Transactions**
Use compensating transactions instead of distributed locks—more resilient for microservices.

**Tip 4: Use Parallel States to Reduce Latency**
Execute independent tasks in parallel (3 tasks × 1s = 1s total vs 3s sequential).

**Tip 5: Leverage waitForTaskToken for Human Approval**
Pause workflows indefinitely for manual approvals without polling or timeouts.

## Pitfalls \& Remedies

**Pitfall 1: Overly Complex Event Patterns**
*Problem:* Patterns too specific miss events; too broad trigger unnecessary invocations.
*Solution:* Test patterns with sample events; start broad, refine based on actual usage.

**Pitfall 2: Missing Error Handling in State Machines**
*Problem:* Unhandled errors cause entire workflow to fail without cleanup.
*Solution:* Add Retry and Catch to every Task state; implement compensating actions.

**Pitfall 3: State Machine Timeout Issues**
*Problem:* Workflows hit 1-year limit or 5-minute Express limit.
*Solution:* Use Standard for long workflows; break large workflows into smaller sub-workflows.

## Review Questions

1. **EventBridge maximum event size?** 256 KB
2. **Step Functions Standard workflow max duration?** 1 year
3. **Step Functions Express workflow max duration?** 5 minutes
4. **EventBridge maximum targets per rule?** 5
5. **Step Functions execution limit (Standard)?** 2,000 per second per account

***


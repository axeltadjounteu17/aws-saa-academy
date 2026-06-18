# Part 6: Application Integration

# Chapter 17: Amazon SQS \& SNS

## Introduction

Modern distributed applications require asynchronous communication to achieve scalability, resilience, and loose coupling. Synchronous point-to-point communication creates tight dependencies—when one service is down or slow, calling services fail or wait indefinitely. Amazon Simple Queue Service (SQS) and Amazon Simple Notification Service (SNS) solve these problems through message queuing and pub/sub patterns. SQS provides reliable message queuing where producers send messages that consumers process asynchronously, decoupling components and enabling independent scaling. SNS implements publish-subscribe messaging where publishers send messages to topics that fan out to multiple subscribers simultaneously.

The architectural patterns enabled by SQS and SNS are fundamental to cloud-native applications. Consider an e-commerce order processing system: when customers place orders, the system must charge payment, update inventory, send confirmation emails, trigger warehouse fulfillment, and update analytics—five independent operations. Synchronous execution means order placement takes seconds and any single failure (email service down) blocks the entire flow. With SQS/SNS, order placement publishes to an SNS topic, which fans out to five SQS queues processed independently. Order placement returns instantly, operations scale independently, temporary failures don't block order acceptance, and retry logic handles transient issues.

Understanding SQS and SNS deeply separates basic message passing from production-grade distributed systems. Misconfigured visibility timeouts cause duplicate processing. Missing dead-letter queues lose failed messages permanently. Not using FIFO queues when ordering matters causes data corruption. Improper retry strategies overwhelm systems during failures. Missing message attributes prevent efficient filtering. This chapter covers SQS and SNS from fundamentals to production patterns, including queue types, message ordering, fanout architectures, filtering, dead-letter queues, visibility timeout, long polling, FIFO guarantees, decoupling strategies, monitoring, and building resilient microservices architectures.

## Theory \& Concepts

### Messaging Patterns Overview

**Why Asynchronous Messaging?**

Distributed systems face inherent challenges that messaging patterns address:

```
Problems with Synchronous Communication:

Tight Coupling:
Service A → calls → Service B → calls → Service C
Problem:
- If Service B is down, Service A fails
- If Service C is slow, everything is slow
- Changes in B or C affect A
- Cascading failures common

Scalability Issues:
Peak Load Scenario:
- 1000 requests/second arrive
- Backend can handle 100/second
- 900 requests fail or timeout
- No buffering mechanism
- Manual scaling coordination

Reliability Problems:
- Network issues cause failures
- Service restarts lose in-flight requests
- No automatic retry
- Error handling at every call
- Distributed transactions complex
```

```
Benefits of Asynchronous Messaging:

Loose Coupling:
Service A → SQS Queue → Service B
Benefits:
✓ Services don't know about each other
✓ Service B can be down temporarily
✓ Changes don't propagate immediately
✓ Independent deployment cycles

Scalability:
Producer → Queue (buffer) → Consumer (auto-scales)
Benefits:
✓ Queue buffers load spikes
✓ Consumers scale based on queue depth
✓ Producers and consumers scale independently
✓ Smooth traffic to backend systems

Reliability:
Message → Queue → Retry on failure → DLQ after max retries
Benefits:
✓ Messages persist in queue
✓ Automatic retry on failure
✓ Dead-letter queues for poison messages
✓ Service restarts don't lose messages

Flexibility:
Publisher → SNS Topic → Multiple Subscribers
Benefits:
✓ Add subscribers without changing publisher
✓ Different processing logic per subscriber
✓ Fanout to multiple systems
✓ Decouple event producers from consumers
```

**Messaging Patterns:**

```
Point-to-Point (SQS):
Producer → Queue → Single Consumer

Characteristics:
- Each message processed by one consumer
- Messages removed after successful processing
- Load balancing across consumers
- Order optional (standard) or guaranteed (FIFO)

Use Cases:
- Job processing
- Task distribution
- Work queues
- Command processing

Publish-Subscribe (SNS):
Publisher → Topic → Multiple Subscribers

Characteristics:
- Each message delivered to all subscribers
- Fire-and-forget delivery
- Fanout to multiple endpoints
- No message persistence (real-time)

Use Cases:
- Event notifications
- Broadcasting updates
- Multiple system coordination
- Fanout architectures

Fanout Pattern (SNS → SQS):
Publisher → SNS Topic → Multiple SQS Queues → Multiple Consumers

Characteristics:
- Combines pub/sub and queuing
- Persistent message delivery
- Independent processing per queue
- Best of both patterns

Use Cases:
- Event-driven architectures
- Microservices communication
- Parallel processing workflows
- System integration
```


### Amazon SQS Architecture

**SQS Fundamentals:**

Amazon SQS is a fully managed message queuing service providing reliable, scalable message delivery:

```
SQS Core Concepts:

Message:
- Payload: Up to 256 KB of text data
- Attributes: Metadata (key-value pairs)
- MessageId: Unique identifier
- ReceiptHandle: Required for deletion
- Lifecycle: Send → Receive → Process → Delete

Queue:
- Named message store
- FIFO or Standard type
- Retention: 1 minute to 14 days (default 4 days)
- Capacity: Unlimited messages, unlimited throughput
- Region-scoped: Not global

Message Flow:
Producer sends message
    ↓
Message stored in SQS (distributed across servers)
    ↓
Consumer polls for messages (receive)
    ↓
Message becomes invisible (visibility timeout)
    ↓
Consumer processes message
    ↓
Consumer deletes message (success)
OR
Visibility timeout expires → message reappears (failure)
```

**SQS Queue Types:**

```
Standard Queue:

Characteristics:
- Unlimited throughput: Nearly unlimited messages/second
- At-least-once delivery: Messages delivered at least once
- Best-effort ordering: Messages usually in order, not guaranteed
- No additional costs: Cheapest option

Delivery Guarantees:
- Message delivered ≥1 time (possible duplicates)
- Order not guaranteed
- Consumer must handle duplicates (idempotency)

Performance:
- Throughput: Unlimited
- Latency: < 10ms (typical)
- Batching: Up to 10 messages per API call

Use Cases:
- High-throughput workloads
- Order doesn't matter
- Application handles duplicates
- Cost-sensitive scenarios
- Most common use case

Example Scenario:
Image Processing Pipeline:
Upload image → SQS → Lambda processes → Store in S3
- Order of processing doesn't matter
- Idempotent operation (process image by ID)
- High throughput needed
- Standard queue perfect fit

Potential Issues:
Message 1: "Create order"
Message 2: "Cancel order"
If processed out of order → incorrect state
Solution: Use FIFO queue or version numbers
```

```
FIFO Queue:

Characteristics:
- Exactly-once processing: Each message processed once
- Guaranteed ordering: Strict message order preserved
- Limited throughput: 300 TPS (3,000 with batching)
- Higher cost: More expensive than standard

Delivery Guarantees:
- Message delivered exactly once (deduplication)
- Strict ordering within message group
- No duplicates (5-minute deduplication window)

Performance:
- Throughput: 300 TPS (transactions per second)
- Batching: 3,000 TPS (10 messages per batch)
- Latency: Slightly higher than standard

Naming Convention:
- Must end with .fifo suffix
- Example: orders.fifo, transactions.fifo

Key Features:

1. Message Deduplication:
   - Deduplication ID required
   - 5-minute deduplication window
   - Same ID within window = duplicate (rejected)
   
   Methods:
   a) Content-based (automatic hash)
   b) Explicit deduplication ID

2. Message Groups:
   - Messages grouped by Message Group ID
   - Ordering guaranteed within group
   - Different groups processed in parallel
   - Enables parallel processing with ordering
   
   Example:
   Group "user-123": Message 1 → Message 2 → Message 3 (ordered)
   Group "user-456": Message A → Message B → Message C (ordered)
   Groups processed in parallel

Use Cases:
- Financial transactions (order critical)
- E-commerce order processing (create → update → fulfill)
- Event sourcing (order = state)
- Workflows with steps (must execute in sequence)

Example Scenario:
Bank Transfer:
1. Validate account
2. Deduct from source
3. Add to destination
4. Send confirmation

Must execute in order, exactly once
FIFO queue required
```

**SQS Standard vs FIFO Comparison:**

```
┌─────────────────────┬──────────────────┬─────────────────┐
│ Feature             │ Standard         │ FIFO            │
├─────────────────────┼──────────────────┼─────────────────┤
│ Throughput          │ Unlimited        │ 300-3,000 TPS   │
│ Ordering            │ Best-effort      │ Guaranteed      │
│ Delivery            │ At-least-once    │ Exactly-once    │
│ Duplicates          │ Possible         │ No duplicates   │
│ Latency             │ < 10ms           │ Slightly higher │
│ Cost                │ Lower            │ Higher          │
│ Name suffix         │ Any              │ .fifo required  │
│ Message groups      │ N/A              │ Yes             │
│ Deduplication       │ Manual           │ Built-in        │
│ Use case            │ High throughput  │ Order critical  │
└─────────────────────┴──────────────────┴─────────────────┘

Decision Tree:
┌─────────────────────────────────────┐
│ Does order matter?                  │
├─────────────┬───────────────────────┤
│ Yes         │ No                    │
│             │                       │
│ FIFO Queue  │ Need > 3,000 TPS?    │
│             │                       │
│             ├──────────┬────────────┤
│             │ Yes      │ No         │
│             │          │            │
│             │ Standard │ Standard   │
│             │          │ or FIFO    │
└─────────────┴──────────┴────────────┘
```


### Message Lifecycle and Visibility Timeout

**Message Lifecycle:**

Understanding the complete message journey is critical:

```
Complete Message Lifecycle:

1. Message Creation:
   Producer creates message
   - Body: Message content (up to 256 KB)
   - Attributes: Metadata
   - Optional: Delay, MessageGroupId, DeduplicationId

2. Send to Queue:
   Producer calls SendMessage API
   - Message stored in SQS (distributed)
   - Returns MessageId
   - Message immediately available (unless delay set)

3. Message Available:
   Message in queue, waiting for consumer
   - Visible to consumers
   - Can be received by any polling consumer
   - Retention: 1 min to 14 days

4. Receive Message:
   Consumer calls ReceiveMessage API
   - Message returned to consumer
   - Message becomes invisible (visibility timeout starts)
   - Returns ReceiptHandle (required for deletion)

5. Processing:
   Consumer processes message
   - Message invisible to other consumers
   - Visibility timeout counting down
   - Can extend timeout if needed

6. Success Path - Delete:
   Consumer deletes message (DeleteMessage API)
   - Requires ReceiptHandle
   - Message permanently removed from queue
   - Processing complete

7. Failure Path - Timeout:
   Visibility timeout expires without deletion
   - Message becomes visible again
   - Another consumer can receive it
   - Receive count increments
   - Retry automatically

8. Max Retries - Dead Letter Queue:
   After maxReceiveCount retries
   - Message moved to DLQ
   - Isolated for investigation
   - Won't block queue
```

**Visibility Timeout Deep Dive:**

The visibility timeout is critical for preventing duplicate processing:

```
Visibility Timeout Mechanics:

What It Is:
Duration a message is invisible after being received
Prevents other consumers from receiving same message
Allows consumer time to process without interference

Default: 30 seconds
Range: 0 seconds to 12 hours
Configurable: Per queue and per message

Timeout Flow:

Consumer A receives message (t=0)
    ↓
Message invisible to all consumers
    ↓
Visibility timeout = 30 seconds
    ↓
Consumer A processing (25 seconds elapsed)
    ↓
Two Possible Outcomes:

Success:
Consumer A deletes message (t=25s)
→ Message removed permanently
→ No other consumer sees it

Failure:
Timeout expires (t=30s)
→ Message becomes visible again
→ Consumer B can now receive it
→ ReceiveCount increments

Extending Visibility Timeout:

Scenario: Long-running task
- Receive message (30s timeout)
- Start processing (will take 60s)
- After 20s: Call ChangeMessageVisibility
- Extend timeout by 60s
- Complete processing
- Delete message

API:
ChangeMessageVisibility(
    QueueUrl=queue_url,
    ReceiptHandle=receipt_handle,
    VisibilityTimeout=60  # Additional seconds
)

Best Practice: Extend before timeout expires
```

**Visibility Timeout Scenarios:**

```
Scenario 1: Too Short
Setting: 5 seconds
Processing: 30 seconds

Timeline:
t=0: Consumer A receives message
t=5: Timeout expires, message visible
t=5: Consumer B receives same message
t=30: Consumer A deletes (success)
t=35: Consumer B deletes (success)

Problem: Duplicate processing
Impact: Same message processed twice
Solution: Increase timeout or extend during processing

Scenario 2: Too Long
Setting: 10 minutes
Processing: 5 seconds

Timeline:
t=0: Consumer A receives message
t=3: Consumer A crashes (message not deleted)
t=10min: Timeout expires, message visible
t=10min: Consumer B receives message

Problem: Slow retry on failure
Impact: 10-minute delay before retry
Solution: Reduce timeout for faster retry

Scenario 3: Optimal
Setting: 2× average processing time
Processing: Average 30s, max 50s

Timeline:
t=0: Consumer receives message
t=30: Normal case - delete successfully
OR
t=60: Timeout expires (consumer failed)
t=60: Another consumer retries immediately

Result: Fast retry without duplicates

Recommended Formula:
Visibility Timeout = 2 × Average Processing Time
If processing varies widely, use ChangeMessageVisibility
```


### Dead Letter Queues (DLQ)

Dead Letter Queues isolate problematic messages that can't be processed:

```
DLQ Purpose and Architecture:

Problem Without DLQ:
Poison message arrives (malformed, causes error)
    ↓
Consumer receives → fails → message visible again
    ↓
Another consumer receives → fails → repeat
    ↓
Infinite retry loop, blocking queue

Solution With DLQ:
Main Queue (maxReceiveCount=3)
    ↓
Message received 3 times, always fails
    ↓
Automatically moved to DLQ
    ↓
Main queue continues processing other messages
    ↓
DLQ messages investigated separately

Configuration:
Main Queue Settings:
- RedrivePolicy: Points to DLQ ARN
- maxReceiveCount: Number of retries before DLQ
- Recommended: 3-5 retries

DLQ Configuration:
- Same type as main queue (Standard or FIFO)
- Higher retention (14 days recommended)
- Separate monitoring/alerting
- Manual or automated analysis

Message Flow:
1. Message fails (exception, timeout, etc.)
2. ReceiveCount increments
3. Message returns to queue after visibility timeout
4. Repeat until ReceiveCount = maxReceiveCount
5. Message moved to DLQ
6. Alert sent (CloudWatch alarm)

DLQ Best Practices:

Monitoring:
✓ CloudWatch alarm when DLQ receives messages
✓ Track ApproximateNumberOfMessagesVisible
✓ Alert operations team immediately
✓ Log reasons for DLQ movement

Investigation:
- Examine message body (what's wrong?)
- Check error logs (why did it fail?)
- Review message attributes
- Identify pattern (all similar messages failing?)

Resolution Options:
1. Fix issue, reprocess manually
2. Redrive messages back to main queue
3. Archive for later analysis
4. Delete if irrelevant

Common DLQ Triggers:
- Malformed message data
- Missing required fields
- Downstream service unavailable
- Processing timeout
- Business logic errors
- Unexpected data types
```

**DLQ Patterns:**

```
Pattern 1: Simple Retry → DLQ

Main Queue → Process → Success ✓
           ↓ Fail
         Retry (3×) → DLQ

Use Case: Most scenarios

Pattern 2: Multi-Stage DLQ

Main Queue → DLQ-1 (immediate failures)
           ↓
        Retry → DLQ-2 (persistent failures)

Use Case: Differentiate failure types

Pattern 3: DLQ Reprocessing

DLQ → Fix issue → Redrive to Main Queue → Reprocess

Use Case: Transient issues resolved

Redrive Process:
1. Fix underlying issue (deploy code fix)
2. Use StartMessageMoveTask API
3. Messages move from DLQ back to main queue
4. Reprocessing happens automatically
5. Monitor for successful processing
```


### Amazon SNS Architecture

**SNS Fundamentals:**

Amazon SNS implements publish-subscribe messaging for event distribution:

```
SNS Core Concepts:

Topic:
- Named communication channel
- Publishers send messages to topic
- Topic fans out to subscribers
- No message storage (ephemeral)
- Region-scoped

Publisher:
- Sends messages to topic
- Can be: Application, AWS service, CloudWatch alarm
- No knowledge of subscribers
- Fire-and-forget delivery

Subscriber:
- Receives messages from topic
- Types: SQS, Lambda, HTTP/HTTPS, Email, SMS
- Message delivered to all subscribers
- Independent processing

Message:
- Subject: Optional (for email)
- Body: JSON or text (up to 256 KB)
- Attributes: Metadata for filtering
- MessageId: Unique identifier
- Published: Immediate fanout

Message Flow:
Publisher publishes to topic
    ↓
SNS receives message
    ↓
SNS fans out to all subscribers (parallel)
    ↓
├─ SQS Queue 1
├─ Lambda Function
├─ HTTP endpoint
└─ Email address

Delivery: Best-effort, no guaranteed order
```

**SNS Subscription Types:**

```
1. SQS (Most Common):
SNS Topic → SQS Queue

Benefits:
✓ Persistent delivery (queue stores messages)
✓ Retry logic (SQS handles failures)
✓ Decoupled processing
✓ Multiple consumers per queue

Use Cases:
- Fanout to multiple processing systems
- Durable message delivery
- Asynchronous processing
- System integration

2. Lambda:
SNS Topic → Lambda Function (invoked directly)

Benefits:
✓ Immediate processing
✓ No infrastructure management
✓ Event-driven compute
✓ Scales automatically

Use Cases:
- Real-time processing
- Lightweight transformations
- Notification handling
- Event-driven workflows

3. HTTP/HTTPS:
SNS Topic → Webhook endpoint

Benefits:
✓ Integration with external systems
✓ Standard protocol
✓ Flexible consumers

Requirements:
- Publicly accessible endpoint
- Endpoint must confirm subscription
- Handle message signature verification

Use Cases:
- Third-party integrations
- On-premises systems
- External webhooks
- Legacy system integration

4. Email/Email-JSON:
SNS Topic → Email address

Benefits:
✓ Human notifications
✓ No infrastructure needed
✓ Simple alerting

Limitations:
- Not for high-volume
- Delivery not guaranteed
- Manual subscription confirmation

Use Cases:
- Admin alerts
- Low-volume notifications
- Human-in-the-loop workflows

5. SMS:
SNS Topic → Phone number

Benefits:
✓ Mobile notifications
✓ Global reach

Costs:
- Per-message charges
- Varies by country

Use Cases:
- Critical alerts
- MFA codes
- Status updates

6. Platform Endpoints (Mobile Push):
SNS Topic → Mobile device

Platforms:
- APNs (Apple)
- FCM (Google Firebase)
- ADM (Amazon Device Messaging)

Use Cases:
- Mobile app notifications
- Push notifications
- Device-specific messaging
```

**SNS Standard vs FIFO:**

```
SNS Standard Topic:

Characteristics:
- Unlimited throughput
- Best-effort message ordering
- At-least-once delivery (possible duplicates)
- Supports all subscription types

Use Cases:
- Event notifications
- Broadcasting updates
- High-volume messaging

SNS FIFO Topic:

Characteristics:
- Limited throughput (300 TPS, 3,000 with batching)
- Strict message ordering
- Exactly-once message delivery
- Only supports SQS FIFO subscriptions

Requirements:
- Topic name must end with .fifo
- Subscribers must be SQS FIFO queues
- Message groups for ordering

Use Cases:
- Event sourcing
- Ordered state changes
- Transaction coordination

Comparison:
Standard: High throughput, any subscriber
FIFO: Guaranteed order, only SQS FIFO
```


### Fanout Pattern (SNS → SQS)

The fanout pattern is one of the most powerful architectures in AWS:

```
Architecture:

                    SNS Topic
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    SQS Queue 1    SQS Queue 2    SQS Queue 3
        ↓               ↓               ↓
   Consumer A      Consumer B      Consumer C
    (Email)        (Analytics)      (Audit)

Benefits:

Loose Coupling:
- Publisher doesn't know consumers exist
- Add/remove consumers without changing publisher
- Consumers scale independently

Parallel Processing:
- All queues receive message simultaneously
- Independent processing speeds
- No blocking between consumers

Durability:
- SQS stores messages persistently
- Retry logic per queue
- DLQ per consumer
- No message loss

Scalability:
- Each queue scales independently
- Multiple consumers per queue
- Auto-scaling based on queue depth

Real-World Example: E-Commerce Order

Order Placed → SNS Topic → Fanout
    ↓
├─ Payment Queue → Process payment
├─ Inventory Queue → Update stock
├─ Email Queue → Send confirmation
├─ Warehouse Queue → Prepare shipment
├─ Analytics Queue → Update metrics
└─ Audit Queue → Log transaction

Advantages:
- Order placement returns immediately
- Each operation independent
- Failure in email doesn't block inventory
- Each system scales separately
- Easy to add new workflows

Without Fanout (Synchronous):
Order → Payment → Inventory → Email → Warehouse → Analytics → Audit
Problems:
✗ Slow (sum of all latencies)
✗ Any failure blocks everything
✗ Complex error handling
✗ Cannot scale independently
```

**Fanout Configuration:**

```
Setup Steps:

1. Create SNS Topic:
   - Standard or FIFO
   - Access policy allowing publish

2. Create SQS Queues (one per consumer):
   - Configure queue settings
   - Set DLQ for each queue
   - Configure visibility timeout

3. Subscribe Queues to Topic:
   - Create subscription
   - SNS sends to SQS automatically
   - Set subscription filter policy (optional)

4. Grant Permissions:
   - SQS queue policy allows SNS to send
   - Automatic when subscribing via console
   - Manual via queue policy for CLI/API

Queue Policy Example:
{
  "Effect": "Allow",
  "Principal": {"Service": "sns.amazonaws.com"},
  "Action": "sqs:SendMessage",
  "Resource": "queue-arn",
  "Condition": {
    "ArnEquals": {
      "aws:SourceArn": "topic-arn"
    }
  }
}

Message Format in SQS:
SQS receives SNS message wrapper:
{
  "Type": "Notification",
  "MessageId": "...",
  "TopicArn": "...",
  "Subject": "...",
  "Message": "actual message body",
  "Timestamp": "...",
  "MessageAttributes": {...}
}

Consumer must parse SNS wrapper to get actual message
```


### Message Filtering

SNS message filtering reduces unnecessary message delivery:

```
Problem Without Filtering:
All subscribers receive all messages
Consumers filter at application level
Wasted processing, bandwidth, costs

Solution With Filtering:
Subscribers define filter policy
SNS only delivers matching messages
Reduces unnecessary deliveries

Filter Policy Syntax:

String Matching:
{"eventType": ["order_placed", "order_cancelled"]}
Receives only messages with eventType = "order_placed" OR "order_cancelled"

Numeric Matching:
{"price": [{"numeric": [">=", 100]}]}
Receives only messages with price >= 100

Prefix Matching:
{"region": [{"prefix": "us-"}]}
Receives messages with region starting with "us-"

Anything-but:
{"environment": [{"anything-but": ["production"]}]}
Receives messages where environment is NOT production

Exists:
{"userId": [{"exists": true}]}
Receives only messages that have userId attribute

Complex Example:
{
  "eventType": ["order_placed"],
  "region": [{"prefix": "us-"}],
  "amount": [{"numeric": [">", 100]}],
  "priority": ["high", "urgent"]
}

Matches messages with:
- eventType = "order_placed" AND
- region starts with "us-" AND
- amount > 100 AND
- priority = "high" OR "urgent"

Real-World Example:

SNS Topic: "orders"
Message Attributes:
- eventType: order_placed
- region: us-west-2
- amount: 250
- priority: high

Subscriber A (Analytics):
Filter: {"eventType": ["order_placed"]}
Result: Receives message ✓

Subscriber B (High-Value Orders):
Filter: {"amount": [{"numeric": [">=", 1000]}]}
Result: Does NOT receive (250 < 1000) ✗

Subscriber C (US Orders):
Filter: {"region": [{"prefix": "us-"}]}
Result: Receives message ✓

Benefits:
✓ Reduced message processing
✓ Lower costs (fewer SQS messages)
✓ Less network bandwidth
✓ Faster consumer processing
✓ Simpler consumer logic
```


### Long Polling vs Short Polling

Polling strategy significantly impacts costs and latency:

```
Short Polling (Default):

Behavior:
- ReceiveMessage returns immediately
- Returns available messages or empty response
- Consumer polls repeatedly

Timeline:
t=0ms: Send ReceiveMessage request
t=50ms: Response received (empty or with messages)
t=100ms: Send ReceiveMessage request again
t=150ms: Response received
(Continuous polling)

Characteristics:
- Immediate response
- Can receive no messages (empty response)
- High request volume
- More expensive

Costs:
Example: Poll every 100ms = 10 requests/second
10 req/s × 3600s × 24h = 864,000 requests/day
Cost: ~$0.35/day ($10.50/month) for one consumer

Issues:
✗ Empty responses count toward quota
✗ High API request costs
✗ CPU usage for constant polling
✗ Network bandwidth wasted

Long Polling:

Behavior:
- ReceiveMessage waits for messages (1-20 seconds)
- Returns when message arrives or timeout
- Reduces empty responses

Timeline:
t=0ms: Send ReceiveMessage (WaitTimeSeconds=20)
t=5000ms: Message arrives, response sent
OR
t=20000ms: Timeout, empty response sent

Characteristics:
- Wait for messages (up to 20 seconds)
- Fewer empty responses
- More efficient
- Lower cost

Configuration:
Queue Setting:
ReceiveMessageWaitTimeSeconds = 20 (enable long polling)

Per-Request:
WaitTimeSeconds parameter in ReceiveMessage API

Costs:
Example: Wait 20 seconds per request
Messages arrive every 5 seconds on average
= ~4 messages per request
= Fewer API calls, more messages per call

Savings: 90-99% reduction in API calls

Benefits:
✓ Fewer empty responses
✓ Lower costs (fewer API calls)
✓ Reduced latency (immediate when message arrives)
✓ Less CPU usage
✓ Better resource utilization

Recommendation:
Always use long polling (set WaitTimeSeconds=20)
Only use short polling if immediate response required
```


### Batch Operations

Batching significantly improves performance and reduces costs:

```
Individual Operations:

Send 10 messages:
for i in range(10):
    sqs.send_message(QueueUrl=url, MessageBody=body)

Result: 10 API calls
Cost: 10 requests charged
Time: 10 × latency

Batch Operations:

Send 10 messages:
sqs.send_message_batch(
    QueueUrl=url,
    Entries=[
        {'Id': '1', 'MessageBody': 'msg1'},
        {'Id': '2', 'MessageBody': 'msg2'},
        ...
        {'Id': '10', 'MessageBody': 'msg10'}
    ]
)

Result: 1 API call
Cost: 1 request charged (90% savings)
Time: 1 × latency (10× faster)

Batch Limits:

SendMessageBatch:
- Up to 10 messages per request
- Maximum 256 KB total payload
- Returns success/failure per message

ReceiveMessage:
- MaxNumberOfMessages=10 (up to 10)
- Returns 1-10 messages
- Use with long polling

DeleteMessageBatch:
- Up to 10 messages per request
- Requires ReceiptHandle for each
- Returns success/failure per message

ChangeMessageVisibilityBatch:
- Up to 10 messages per request
- Extend timeout for multiple messages
- Efficient for long-running tasks

Cost Comparison:

Scenario: 1 million messages/day

Without Batching:
1,000,000 SendMessage calls
Cost: 1M × $0.40/million = $0.40

With Batching (10 messages/batch):
100,000 SendMessageBatch calls
Cost: 100K × $0.40/million = $0.04

Savings: $0.36/day = $131/year (90% reduction)

Best Practices:
✓ Always batch when possible
✓ Handle partial failures in batch
✓ Monitor successful vs failed messages
✓ Batch size: 10 for optimal efficiency
✓ Consider payload size limits
```


## Hands-On Implementation

### Lab 1: SQS Standard Queue with DLQ

```python
import boto3

sqs = boto3.client('sqs')

# Create dead-letter queue
dlq_response = sqs.create_queue(
    QueueName='orders-dlq',
    Attributes={
        'MessageRetentionPeriod': '1209600'  # 14 days
    }
)
dlq_url = dlq_response['QueueUrl']
dlq_arn = sqs.get_queue_attributes(
    QueueUrl=dlq_url,
    AttributeNames=['QueueArn']
)['Attributes']['QueueArn']

# Create main queue with DLQ
main_response = sqs.create_queue(
    QueueName='orders',
    Attributes={
        'VisibilityTimeout': '60',
        'ReceiveMessageWaitTimeSeconds': '20',  # Long polling
        'RedrivePolicy': json.dumps({
            'deadLetterTargetArn': dlq_arn,
            'maxReceiveCount': '3'
        })
    }
)
queue_url = main_response['QueueUrl']
```


### Lab 2: SNS Topic with SQS Fanout

```python
sns = boto3.client('sns')
sqs = boto3.client('sqs')

# Create SNS topic
topic_response = sns.create_topic(Name='order-events')
topic_arn = topic_response['TopicArn']

# Create SQS queues
queues = ['email-queue', 'analytics-queue', 'audit-queue']
for queue_name in queues:
    queue_url = sqs.create_queue(QueueName=queue_name)['QueueUrl']
    queue_arn = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=['QueueArn']
    )['Attributes']['QueueArn']
    
    # Subscribe queue to topic
    sns.subscribe(
        TopicArn=topic_arn,
        Protocol='sqs',
        Endpoint=queue_arn
    )
```


## Tips \& Best Practices

**Tip 1: Always Use Long Polling**
Set ReceiveMessageWaitTimeSeconds=20 to reduce costs by 90% and improve efficiency.

**Tip 2: Implement Idempotency**
Always design consumers to handle duplicate messages safely (use unique IDs, check before processing).

**Tip 3: Set Appropriate Visibility Timeout**
Use 2× average processing time; extend during processing if needed to prevent duplicates.

**Tip 4: Use Batch Operations**
Batch send/receive/delete reduces costs by 90% and improves throughput 10×.

**Tip 5: Monitor DLQ Continuously**
Set CloudWatch alarm on DLQ message count—messages in DLQ indicate processing failures.

## Pitfalls \& Remedies

**Pitfall 1: Message Duplication (Standard Queue)**
*Problem:* Same message processed multiple times causing incorrect state.
*Solution:* Implement idempotency using unique message IDs, database constraints, or conditional writes.

**Pitfall 2: Visibility Timeout Too Short**
*Problem:* Timeout expires before processing completes, causing duplicate processing.
*Solution:* Set timeout to 2× average processing time, use ChangeMessageVisibility for long tasks.

**Pitfall 3: No Dead-Letter Queue**
*Problem:* Poison messages retry forever, blocking queue and hiding processing failures.
*Solution:* Always configure DLQ with maxReceiveCount=3-5, monitor DLQ for messages.

## Review Questions

1. **SQS maximum message size?** 256 KB
2. **SQS message retention range?** 1 minute to 14 days (default 4 days)
3. **FIFO queue throughput?** 300 TPS (3,000 with batching)
4. **SNS message delivery guarantee?** At-least-once (best-effort for standard)
5. **Long polling wait time range?** 0-20 seconds

***

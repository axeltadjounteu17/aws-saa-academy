# Partie 6 : Intégration d'applications

# Chapitre 17 : Amazon SQS \& SNS

##Présentation

Les applications distribuées modernes nécessitent une communication asynchrone pour atteindre l'évolutivité, la résilience et un couplage lâche. La communication point à point synchrone crée des dépendances étroites : lorsqu'un service est en panne ou lent, les services appelants échouent ou attendent indéfiniment. Amazon Simple Queue Service (SQS) et Amazon Simple Notification Service (SNS) résolvent ces problèmes grâce à la mise en file d'attente des messages et aux modèles de pub/sub. SQS fournit une file d'attente de messages fiable dans laquelle les producteurs envoient des messages que les consommateurs traitent de manière asynchrone, dissociant les composants et permettant une mise à l'échelle indépendante. SNS implémente une messagerie publication-abonnement dans laquelle les éditeurs envoient des messages sur des sujets diffusés simultanément à plusieurs abonnés.

Les modèles architecturaux activés par SQS et SNS sont fondamentaux pour les applications cloud natives. Prenons l'exemple d'un système de traitement des commandes de commerce électronique : lorsque les clients passent des commandes, le système doit facturer le paiement, mettre à jour l'inventaire, envoyer des e-mails de confirmation, déclencher l'exécution en entrepôt et mettre à jour les analyses : cinq opérations indépendantes. L'exécution synchrone signifie que le placement des commandes prend quelques secondes et que toute panne (service de messagerie en panne) bloque l'intégralité du flux. Avec SQS/SNS, le placement de commande est publié dans une rubrique SNS, qui est répartie sur cinq files d'attente SQS traitées indépendamment. Le placement des commandes revient instantanément, les opérations évoluent de manière indépendante, les échecs temporaires ne bloquent pas l'acceptation des commandes et la logique de nouvelle tentative gère les problèmes temporaires.

Comprendre SQS et SNS sépare profondément la transmission des messages de base des systèmes distribués de production. Des délais d'expiration de visibilité mal configurés entraînent un traitement en double. Les files d’attente de lettres mortes manquantes perdent définitivement les messages ayant échoué. Ne pas utiliser les files d'attente FIFO lors de la commande entraîne une corruption des données. Des stratégies de nouvelle tentative inappropriées submergent les systèmes en cas de panne. Les attributs de message manquants empêchent un filtrage efficace. Ce chapitre couvre SQS et SNS depuis les principes fondamentaux jusqu'aux modèles de production, y compris les types de files d'attente, l'ordre des messages, les architectures de sortance, le filtrage, les files d'attente de lettres mortes, le délai d'attente de visibilité, les interrogations longues, les garanties FIFO, les stratégies de découplage, la surveillance et la création d'architectures de microservices résilientes.

## Théorie \&Concepts

### Présentation des modèles de messagerie

**Pourquoi la messagerie asynchrone ?**

Les systèmes distribués sont confrontés à des défis inhérents auxquels les modèles de messagerie répondent :
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
**Modèles de messagerie :**
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
###Architecture Amazon SQS

**Principes fondamentaux de SQS :**

Amazon SQS est un service de mise en file d'attente de messages entièrement géré offrant une livraison de messages fiable et évolutive :
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
**Types de files d'attente SQS :**
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
**Comparaison SQS Standard et FIFO :**
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
### Cycle de vie des messages et délai d'expiration de la visibilité

**Cycle de vie des messages :**

Comprendre le parcours complet du message est essentiel :
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
**Extension approfondie du délai de visibilité :**

Le délai d'expiration de la visibilité est essentiel pour éviter les traitements en double :
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
**Scénarios d'expiration de la visibilité :**
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
### Files d'attente de lettres mortes (DLQ)

Les files d'attente de lettres mortes isolent les messages problématiques qui ne peuvent pas être traités :
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
**Modèles DLQ :**
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
###Architecture Amazon SNS

**Principes fondamentaux du SNS :**

Amazon SNS implémente la messagerie de publication-abonnement pour la distribution d'événements :
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
**Types d'abonnement SNS :**
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
**Norme SNS vs FIFO :**
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
### Modèle de diffusion (SNS → SQS)

Le modèle de diffusion est l'une des architectures les plus puissantes d'AWS :
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
**Configuration de la diffusion :**
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
### Filtrage des messages

Le filtrage des messages SNS réduit la transmission de messages inutiles :
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
### Interrogation longue ou interrogation courte

La stratégie d’interrogation a un impact significatif sur les coûts et la latence :
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
### Opérations par lots

Le traitement par lots améliore considérablement les performances et réduit les coûts :
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
## Implémentation pratique

### Atelier 1 : File d'attente standard SQS avec DLQ
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
### Lab 2 : Sujet SNS avec SQS Fanout
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
## Conseils \& Bonnes pratiques

**Astuce 1 : utilisez toujours les interrogations longues**
Définissez ReceiverMessageWaitTimeSeconds=20 pour réduire les coûts de 90 % et améliorer l'efficacité.

**Astuce 2 : Mettez en œuvre l'idempotence**
Concevez toujours les consommateurs pour qu'ils gèrent les messages en double en toute sécurité (utilisez des identifiants uniques, vérifiez avant le traitement).

**Astuce 3 : Définissez un délai d'expiration de visibilité approprié**
Utilisez 2 × le temps de traitement moyen ; prolonger pendant le traitement si nécessaire pour éviter les doublons.

**Astuce 4 : Utilisez les opérations par lots**
L'envoi/réception/suppression par lots réduit les coûts de 90 % et améliore le débit par 10.

**Astuce 5 : Surveillez le DLQ en continu**
Définissez l'alarme CloudWatch sur le nombre de messages DLQ : les messages dans DLQ indiquent des échecs de traitement.

## Pièges \& Remèdes

**Piège 1 : duplication des messages (file d'attente standard)**
*Problème :* Le même message a été traité plusieurs fois, provoquant un état incorrect.
*Solution :* Implémentez l'idempotence à l'aide d'ID de message uniques, de contraintes de base de données ou d'écritures conditionnelles.

**Piège 2 : délai de visibilité trop court**
*Problème :* Le délai d'attente expire avant la fin du traitement, ce qui entraîne un traitement en double.
*Solution :* Définissez le délai d'expiration sur 2 × le temps de traitement moyen, utilisez ChangeMessageVisibility pour les tâches longues.

**Piège 3 : pas de file d'attente de lettres mortes**
*Problème :* Les messages empoisonnés réessayent indéfiniment, bloquant la file d'attente et masquant les échecs de traitement.
*Solution :* Configurez toujours DLQ avec maxReceiveCount=3-5, surveillez DLQ pour les messages.

## Questions de révision

1. **Taille maximale des messages SQS ?** 256 Ko
2. **Plage de conservation des messages SQS ?** 1 minute à 14 jours (4 jours par défaut)
3. **Débit de file d'attente FIFO ?** 300 TPS (3 000 avec traitement par lots)
4. **Garantie de livraison des messages SNS ?** Au moins une fois (meilleur effort pour la norme)
5. **Plage de temps d'attente d'interrogation longue ?** 0 à 20 secondes

***
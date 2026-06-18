# Part 7: Analytics \& Machine Learning

# Chapter 20: Amazon Kinesis

## Introduction

Modern applications generate massive volumes of streaming data—clickstreams from millions of website visitors, telemetry from millions of IoT devices, financial transactions from trading systems, logs from distributed microservices, and real-time gaming analytics. Traditional batch processing systems collect data for hours or days before analysis, missing opportunities for immediate action. Amazon Kinesis processes streaming data in real-time, enabling applications to react to events within milliseconds, detect anomalies immediately, update dashboards instantly, and trigger automated responses as data arrives. Understanding Kinesis transforms batch-oriented thinking into real-time, event-driven architectures.

The Kinesis family provides four specialized services optimized for different streaming scenarios: Kinesis Data Streams ingests and stores streaming data for custom processing with millisecond latency; Kinesis Data Firehose delivers streaming data to destinations like S3, Redshift, and Elasticsearch with automatic scaling and transformation; Kinesis Data Analytics processes streaming data using SQL or Apache Flink for real-time analytics; Kinesis Video Streams ingests, stores, and processes streaming video. Choosing the wrong service—using Data Streams when Firehose suffices, or vice versa—wastes time, money, and engineering resources.

Kinesis architectural decisions have lasting impact. Undersized shard count causes throttling during traffic spikes. Improper consumer design creates lag measuring hours behind real-time. Missing enhanced fan-out forces consumers to share throughput. Not implementing resharding prevents scaling with data growth. Inadequate monitoring hides consumer failures for hours. This chapter covers Kinesis from fundamentals to production patterns, including sharding strategies, producer/consumer patterns, enhanced fan-out, data retention, resharding, monitoring, building real-time data pipelines, and achieving sub-second analytics at scale.

## Theory \& Concepts

### Streaming Data Fundamentals

**Batch vs Stream Processing:**

```
Batch Processing (Traditional):

Data Collection Period:
Hour 1: Collect events (accumulate in database/files)
Hour 2: Collect events
Hour 3: Collect events
Hour 4: Process batch (analyze 4 hours of data)
Results available: 4+ hours after events occurred

Characteristics:
- High latency (hours to days)
- Large data volumes processed together
- Optimized for throughput
- Lower cost per record
- Simpler architecture

Use Cases:
- Historical reporting
- Daily summaries
- Monthly analytics
- Non-time-sensitive processing

Example: Daily sales report
- Collect transactions all day
- Generate report at midnight
- Available next morning
- Latency: 12-24 hours

Stream Processing (Real-Time):

Continuous Processing:
Event 1 arrives → Process → Action (milliseconds)
Event 2 arrives → Process → Action (milliseconds)
Event 3 arrives → Process → Action (milliseconds)
Results available: Milliseconds after events occur

Characteristics:
- Low latency (milliseconds to seconds)
- Individual record processing
- Optimized for latency
- Higher cost per record
- More complex architecture

Use Cases:
- Fraud detection
- Real-time dashboards
- Anomaly detection
- Immediate alerting
- Dynamic pricing

Example: Fraud detection
- Transaction occurs
- Analyzed within 100ms
- Flagged if suspicious
- Blocked before completion
- Latency: < 1 second

Comparison:

┌────────────────┬─────────────┬──────────────────┐
│ Characteristic │ Batch       │ Stream           │
├────────────────┼─────────────┼──────────────────┤
│ Latency        │ Hours-Days  │ Milliseconds     │
│ Data Volume    │ Large       │ Continuous       │
│ Cost/Record    │ Lower       │ Higher           │
│ Complexity     │ Lower       │ Higher           │
│ When to Use    │ Historical  │ Immediate action │
└────────────────┴─────────────┴──────────────────┘
```

**Streaming Data Patterns:**

```
1. Event Streaming:
Continuous flow of events (clicks, transactions, logs)
Examples: Website clicks, IoT sensors, app events

2. Change Data Capture (CDC):
Database changes streamed in real-time
Examples: Order updates, inventory changes

3. Log Aggregation:
Collecting logs from distributed systems
Examples: Application logs, system logs

4. Metrics Streaming:
Continuous metrics collection
Examples: CPU usage, request rates, latency

5. IoT Telemetry:
Device data streaming
Examples: Sensors, vehicles, smart devices
```


### Kinesis Data Streams Architecture

**Core Components:**

```
Kinesis Data Stream:

Producer → Shard 1 → Consumer 1
         → Shard 2 → Consumer 2  
         → Shard 3 → Consumer 3

Stream:
- Named container for shards
- Data retention: 24 hours (default) to 365 days
- Orderless across shards
- Ordered within shard

Shard:
- Unit of capacity and parallelism
- Ingestion: 1 MB/sec or 1,000 records/sec (whichever comes first)
- Consumption: 2 MB/sec per consumer
- Enhanced fan-out: 2 MB/sec per registered consumer
- Hourly cost: $0.015/shard/hour = $11/shard/month

Record:
- Data blob: Up to 1 MB
- Partition key: Determines shard assignment
- Sequence number: Unique identifier within shard
- Timestamp: When record added to stream

Partition Key:
- Hash determines shard assignment
- Same partition key → same shard (ordering)
- Even distribution critical for throughput
- Examples: userId, deviceId, sessionId

Shard Assignment:
Hash(PartitionKey) mod NumberOfShards
Example:
- Hash("user-123") → 42
- 42 mod 10 shards = Shard 2
- All records with "user-123" → Shard 2
```

**Capacity Planning:**

```
Determining Shard Count:

Ingestion Requirements:
- Data rate: X MB/sec
- Record rate: Y records/sec
- Shards needed = max(X, Y/1000)

Example 1: High throughput
- 10 MB/sec data rate
- 5,000 records/sec
- Shards needed: max(10, 5000/1000) = max(10, 5) = 10 shards

Example 2: Small records
- 500 KB/sec data rate
- 10,000 records/sec
- Shards needed: max(0.5, 10000/1000) = max(0.5, 10) = 10 shards

Consumption Requirements:
Standard consumers (shared throughput):
- 2 MB/sec per consumer per shard
- Multiple consumers share throughput

Enhanced fan-out (dedicated throughput):
- 2 MB/sec per registered consumer per shard
- Each consumer gets dedicated throughput

Example Scenario:
Requirements:
- 5 MB/sec ingestion
- 3 consumers reading independently
- Need dedicated throughput per consumer

Without enhanced fan-out:
- 5 shards for ingestion (5 MB ÷ 1 MB/shard)
- 3 consumers share 2 MB/sec per shard
- Each consumer: ~0.66 MB/sec (insufficient)

With enhanced fan-out:
- 5 shards for ingestion
- Each consumer: 2 MB/sec × 5 shards = 10 MB/sec
- All consumers satisfied

Cost Calculation:

5 shards:
- Shard cost: 5 × $0.015/hour = $0.075/hour = $54/month
- PUT cost: 5 MB/sec × 3600 sec × 730 hours = 13.14 TB/month
  = 13,140 GB ÷ 1,000,000 × $0.014 = $0.18/month
- GET cost (standard): Similar calculation
- Enhanced fan-out: 3 consumers × 5 shards × $0.015/hour = $164/month

Total:
- Standard consumers: ~$54/month
- Enhanced fan-out: ~$218/month
```

**Data Retention and Replay:**

```
Retention Period:

Default: 24 hours
Extended: Up to 365 days
Cost: $0.023/GB-month for extended retention

Use Cases:
24 hours: Real-time processing only
7 days: Reprocessing recent data
30+ days: Auditing, compliance
365 days: Long-term replay capability

Data Replay:

Scenario: Consumer bug deployed
Hour 1: Bug processes data incorrectly
Hour 2: Bug discovered
Hour 3: Fix deployed
Hour 4: Replay last 3 hours of data

Process:
1. Stop faulty consumer
2. Deploy fixed consumer
3. Set iterator to 3 hours ago
4. Reprocess all records
5. Catch up to latest

Shard Iterator Types:

TRIM_HORIZON:
- Start from oldest record in shard
- Used for complete reprocessing

LATEST:
- Start from newest record
- Skip historical data
- Used for real-time only

AT_TIMESTAMP:
- Start from specific timestamp
- Used for replay from specific time

AT_SEQUENCE_NUMBER:
- Start from specific sequence number
- Precise replay control

AFTER_SEQUENCE_NUMBER:
- Start after specific sequence number
- Resume from known position
```


### Kinesis Data Firehose

**Firehose vs Data Streams:**

```
Kinesis Data Firehose:

Purpose: Simplified data delivery to destinations
Managed: Fully automatic scaling, no shards
Destinations: S3, Redshift, Elasticsearch, Splunk, HTTP endpoints
Latency: 60-900 seconds (buffering)
Use Case: Load data into analytics/storage systems

Architecture:

Producer → Firehose → Transform (Lambda, optional)
                   → Buffer (size/time-based)
                   → Destination (S3/Redshift/ES)

Key Differences:

Data Streams:
✓ Real-time (millisecond latency)
✓ Custom consumers
✓ Multiple concurrent consumers
✓ Data replay capability
✓ Manual shard management
✗ Higher complexity
✗ Higher cost

Firehose:
✓ Automatic scaling
✓ Built-in transformations
✓ Direct destination delivery
✓ Lower complexity
✓ Lower cost
✗ Higher latency (60+ seconds)
✗ No replay capability
✗ Single destination per delivery stream

Decision Matrix:

Need real-time (< 1 sec)? → Data Streams
Need data replay? → Data Streams
Need custom processing? → Data Streams
Simple S3/Redshift load? → Firehose
Multiple consumers? → Data Streams
Lowest cost/complexity? → Firehose
```

**Firehose Buffering:**

```
Buffer Configuration:

Buffer Size: 1 MB to 128 MB
Buffer Interval: 60 to 900 seconds

Delivery Trigger:
Whichever comes first:
- Buffer size reached
- Buffer interval elapsed

Example 1: High-volume stream
Buffer: 5 MB or 60 seconds
Data rate: 1 MB/sec
Result: Delivers every 5 seconds (size trigger)

Example 2: Low-volume stream
Buffer: 5 MB or 60 seconds
Data rate: 100 KB/sec
Result: Delivers every 60 seconds (time trigger)

Trade-offs:

Smaller buffer / shorter interval:
✓ Lower latency
✓ More frequent deliveries
✗ Higher costs (more S3 PUTs)
✗ More small files

Larger buffer / longer interval:
✓ Lower costs (fewer S3 PUTs)
✓ Fewer, larger files
✗ Higher latency
✗ Delayed processing

Best Practices:
- Balance latency vs cost
- Consider downstream processing
- S3 prefers larger files (analytics)
- Real-time needs smaller intervals
```

**Data Transformation:**

```
Firehose Transformation Pipeline:

Source Records
    ↓
Lambda Transform Function (optional)
    ↓
Format Conversion (optional, Parquet/ORC)
    ↓
Compression (optional, GZIP/Snappy/Zip)
    ↓
Encryption (optional, S3/KMS)
    ↓
Destination

Lambda Transformation:

Use Cases:
- Enrich data (add metadata)
- Filter records (drop unwanted)
- Aggregate data
- Mask PII
- Format conversion

Lambda receives batch of records:
{
  "records": [
    {
      "recordId": "...",
      "data": "base64-encoded-data"
    }
  ]
}

Lambda returns:
{
  "records": [
    {
      "recordId": "...",
      "result": "Ok",  // Ok, Dropped, or ProcessingFailed
      "data": "base64-encoded-transformed-data"
    }
  ]
}

Format Conversion:

JSON to Parquet:
- Automatic schema detection
- Glue Data Catalog integration
- 10× storage savings
- 2× query performance

Compression:
- GZIP: Best compression ratio
- Snappy: Faster processing
- Zip: Compatibility
```


### Kinesis Data Analytics

**SQL-Based Stream Processing:**

```
Kinesis Data Analytics:

Purpose: Run SQL queries on streaming data
Input: Kinesis Data Streams, Firehose
Output: Kinesis Data Streams, Firehose, Lambda
Processing: Real-time SQL transformations

Architecture:

Input Stream → SQL Application → Output Stream
             ↓
         In-Application Streams

Use Cases:
- Real-time aggregations
- Windowed computations
- Anomaly detection
- Filtering and transformations

Example Application:

Input: Clickstream data
Processing: Count clicks per minute
Output: Aggregated metrics

SQL Code:
CREATE OR REPLACE STREAM "DESTINATION_SQL_STREAM" (
  "window_time" TIMESTAMP,
  "click_count" BIGINT
);

CREATE OR REPLACE PUMP "STREAM_PUMP" AS 
INSERT INTO "DESTINATION_SQL_STREAM"
SELECT STREAM 
  STEP("SOURCE_SQL_STREAM_001".ROWTIME BY INTERVAL '1' MINUTE) as window_time,
  COUNT(*) as click_count
FROM "SOURCE_SQL_STREAM_001"
GROUP BY 
  STEP("SOURCE_SQL_STREAM_001".ROWTIME BY INTERVAL '1' MINUTE);

Windowing Functions:

Tumbling Window:
- Fixed-size, non-overlapping
- Example: 1-minute windows
- 10:00-10:01, 10:01-10:02, 10:02-10:03

Sliding Window:
- Fixed-size, overlapping
- Example: 1-minute window, 30-second slide
- 10:00-10:01, 10:00:30-10:01:30, 10:01-10:02

Stagger Window:
- Variable-size based on key
- Groups by key, time
```

**Apache Flink Applications:**

```
Kinesis Data Analytics for Apache Flink:

Advanced stream processing:
- Java/Scala applications
- Complex event processing
- Machine learning inference
- Custom transformations

Advantages over SQL:
✓ Full programming language
✓ Custom libraries
✓ Machine learning models
✓ Complex state management
✓ Advanced windowing

Use Cases:
- Real-time ML inference
- Complex CEP patterns
- Custom aggregations
- Stateful processing
```


### Producer and Consumer Patterns

**Producer Patterns:**

```
1. Kinesis Producer Library (KPL):

Features:
- Automatic batching
- Automatic retry
- Record aggregation
- Asynchronous API
- Monitoring integration

Batching:
- Collects records into batches
- Reduces API calls
- Improves throughput
- Introduces slight latency (~100ms)

Aggregation:
- Multiple records in single Kinesis record
- Maximizes throughput
- Requires KCL for deaggregation

When to Use:
✓ High-throughput scenarios
✓ Can tolerate 100-200ms latency
✓ Need maximum efficiency

2. Direct PutRecords API:

Features:
- Simple, direct API
- Up to 500 records per call
- Synchronous or asynchronous
- Lower latency than KPL

When to Use:
✓ Simple use cases
✓ Low latency critical
✓ Don't need KPL features

3. Kinesis Agent:

Features:
- Monitors log files
- Sends data to Kinesis
- Pre-processing capabilities
- Runs on EC2 instances

When to Use:
✓ Collecting log files
✓ Legacy applications
✓ File-based data sources

Producer Best Practices:

Partition Key Selection:
✓ Use high-cardinality keys (userId, deviceId)
✗ Don't use low-cardinality (date, region)
✓ Ensure even distribution
✗ Avoid hot shards

Error Handling:
✓ Implement retry with exponential backoff
✓ Handle ProvisionedThroughputExceeded
✓ Monitor failed records
✓ Use DLQ for poison records

Monitoring:
✓ Track PutRecords success/failure
✓ Monitor throughput metrics
✓ Alert on throttling
✓ Track latency percentiles
```

**Consumer Patterns:**

```
1. Kinesis Client Library (KCL):

Features:
- Automatic load balancing
- Checkpoint management
- Worker coordination via DynamoDB
- Handles resharding
- Multi-language support

Architecture:
KCL Worker Fleet (auto-scaling)
├── Worker 1 → Processes Shard 1, 2
├── Worker 2 → Processes Shard 3, 4
└── Worker 3 → Processes Shard 5

Coordination:
DynamoDB table tracks:
- Shard assignments
- Checkpoints (last processed sequence)
- Lease management

Benefits:
✓ Automatic shard discovery
✓ Automatic load balancing
✓ Fault tolerance
✓ Exactly-once processing (with checkpointing)

When to Use:
✓ Multiple consumers
✓ Need fault tolerance
✓ Auto-scaling required
✓ Production applications

2. Lambda Consumer:

Features:
- Serverless, automatic scaling
- Event source mapping
- Automatic retries
- Batch processing

Configuration:
Batch size: 1-10,000 records
Batch window: 0-300 seconds
Parallelization: Up to 10 per shard

Benefits:
✓ No infrastructure management
✓ Automatic scaling
✓ Pay per invocation
✓ Simple deployment

Limitations:
✗ 15-minute max execution
✗ Cold start latency
✗ Less control than KCL

When to Use:
✓ Simple processing logic
✓ < 15 min processing time
✓ Want serverless
✓ Lower traffic streams

3. Enhanced Fan-Out:

Traditional (Shared Throughput):
All consumers share 2 MB/sec per shard
Consumer A + Consumer B + Consumer C = 2 MB/sec total

Enhanced Fan-Out (Dedicated Throughput):
Each registered consumer: 2 MB/sec per shard
Consumer A: 2 MB/sec
Consumer B: 2 MB/sec  
Consumer C: 2 MB/sec

Benefits:
✓ Dedicated throughput per consumer
✓ No competition between consumers
✓ Lower latency (push vs pull)
✓ Better for multiple consumers

Cost:
$0.015/hour per consumer per shard
3 consumers × 5 shards = $164/month

When to Use:
✓ Multiple independent consumers
✓ Need guaranteed throughput
✓ Low latency critical
✓ Can justify additional cost

Consumer Best Practices:

Checkpointing:
✓ Checkpoint frequently (after processing batch)
✓ Use at-least-once processing semantics
✓ Implement idempotency in processing
✓ Handle duplicate records gracefully

Error Handling:
✓ Retry transient errors
✓ Skip or DLQ poison records
✓ Don't block shard processing
✓ Monitor consumer lag

Scaling:
✓ Match consumer capacity to shard count
✓ Monitor processing lag
✓ Scale consumers with shard count
✓ Use enhanced fan-out if needed
```


### Resharding Strategies

**Shard Splitting and Merging:**

```
Resharding Operations:

Split Shard (Increase Capacity):
Before: Shard 1 (1 MB/sec)
After: Shard 1-A (1 MB/sec) + Shard 1-B (1 MB/sec)
Result: 2 MB/sec total capacity

Merge Shards (Decrease Capacity):
Before: Shard 1 (1 MB/sec) + Shard 2 (1 MB/sec)
After: Shard 3 (1 MB/sec)
Result: 1 MB/sec total capacity

Resharding Process:

1. Initiate Operation:
   - Split or merge request submitted
   - Parent shard(s) marked for closure

2. Transition Period:
   - Parent shards closed to new records
   - New child shards opened
   - Existing records in parent still readable

3. Consumer Adjustment:
   - KCL automatically detects new shards
   - Begins processing new shards
   - Completes processing parent shards

4. Parent Shard Expiration:
   - After retention period
   - Parent shard fully removed
   - Only child shards remain

When to Reshard:

Split (Add Capacity):
- WriteProvisionedThroughputExceeded errors
- Consistently high utilization (> 80%)
- Data growth anticipated
- New consumers added

Merge (Reduce Cost):
- Over-provisioned capacity
- Low utilization (< 20%)
- Cost optimization needed
- Traffic decreased

Limitations:
- Only double or halve shard count at a time
- Resharding takes time (minutes)
- Costs associated with transitions
- Can't reshard too frequently (limits apply)

Automated Resharding:

UpdateShardCount API:
- Automatically splits/merges to target count
- Handles transitions automatically
- Simplifies resharding operations

Example:
Current: 10 shards
Target: 40 shards
Operation: Automatically creates 30 new shards
```


### Monitoring and Troubleshooting

**Key Metrics:**

```
Producer Metrics:

IncomingBytes:
- Data ingestion rate
- Monitor for capacity planning
- Alert: Approaching shard limits

IncomingRecords:
- Record ingestion rate
- Track record size vs count limits

WriteProvisionedThroughputExceeded:
- Throttling events
- Critical: Add shards if persistent
- Alert: > 0.1% of requests

PutRecords.Success:
- Successful writes
- Monitor: Should be > 99.9%

PutRecords.Latency:
- Write latency
- Alert: P99 > 100ms

Consumer Metrics:

GetRecords.IteratorAge:
- How far behind consumer is
- Unit: Milliseconds
- Alert: > 60,000 (1 minute behind)

GetRecords.Success:
- Successful reads
- Monitor: Should be > 99.9%

GetRecords.Latency:
- Read latency
- Alert: P99 > 500ms

ReadProvisionedThroughputExceeded:
- Consumer throttling
- Solution: Enhanced fan-out or reduce consumers

MillisBehindLatest (KCL):
- Consumer lag
- Critical metric for real-time
- Alert: > 60,000 (1 minute)

Shard Metrics:

OutgoingBytes:
- Data consumed from shard
- Monitor throughput

OutgoingRecords:
- Records consumed
- Track consumption patterns

Troubleshooting Scenarios:

Scenario 1: WriteProvisionedThroughputExceeded

Symptoms:
- Producer errors
- Failed PutRecords
- Data loss if no retry

Causes:
- Insufficient shards
- Hot shard (uneven distribution)
- Burst traffic spike

Solutions:
✓ Add shards (split)
✓ Improve partition key distribution
✓ Implement retry with backoff
✓ Use KPL for automatic batching

Scenario 2: High Consumer Lag (IteratorAge)

Symptoms:
- MillisBehindLatest increasing
- Real-time processing delayed
- Dashboards showing old data

Causes:
- Insufficient consumer capacity
- Slow processing logic
- Consumer failures

Solutions:
✓ Scale consumers (match shard count)
✓ Optimize processing code
✓ Use enhanced fan-out
✓ Increase Lambda concurrency
✓ Add parallel processing

Scenario 3: Hot Shard

Symptoms:
- Single shard throttling
- Other shards underutilized
- Uneven distribution

Causes:
- Poor partition key (low cardinality)
- Single key generating high volume

Solutions:
✓ Change partition key strategy
✓ Add random suffix to partition key
✓ Split hot shard
✓ Review data model
```


## Hands-On Implementation

### Lab 1: Data Streams Setup

```python
import boto3

kinesis = boto3.client('kinesis')

# Create stream
kinesis.create_stream(
    StreamName='clickstream',
    ShardCount=5
)

# Wait for stream to be active
waiter = kinesis.get_waiter('stream_exists')
waiter.wait(StreamName='clickstream')

# Put record
kinesis.put_record(
    StreamName='clickstream',
    Data=json.dumps({
        'userId': 'user-123',
        'action': 'click',
        'timestamp': time.time()
    }),
    PartitionKey='user-123'
)
```


### Lab 2: Lambda Consumer

```python
def lambda_handler(event, context):
    """Process Kinesis records"""
    
    for record in event['Records']:
        # Decode data
        payload = base64.b64decode(record['kinesis']['data'])
        data = json.loads(payload)
        
        # Process record
        process_click(data)
    
    return {'statusCode': 200}
```


## Tips \& Best Practices

**Tip 1: Use Enhanced Fan-Out for Multiple Consumers**
Dedicated 2 MB/sec per consumer eliminates throughput competition—worth the cost for production.

**Tip 2: Checkpoint Frequently in KCL**
Checkpoint after every batch to minimize reprocessing on failure—ensures at-least-once delivery.

**Tip 3: Monitor MillisBehindLatest Continuously**
Set CloudWatch alarm < 60,000ms—critical metric for real-time processing effectiveness.

**Tip 4: Use High-Cardinality Partition Keys**
userId, deviceId, sessionId distribute evenly—avoid date, region, or status (creates hot shards).

**Tip 5: Start with Firehose for Simple Pipelines**
If only loading to S3/Redshift, Firehose is simpler and cheaper—upgrade to Data Streams if need real-time.

## Pitfalls \& Remedies

**Pitfall 1: Hot Shard from Poor Partition Key**
*Problem:* One shard overwhelmed, others idle; throttling despite available capacity.
*Solution:* Use high-cardinality partition keys (userId); add random suffix; monitor shard distribution; split hot shards.

**Pitfall 2: Consumer Lag Growing Continuously**
*Problem:* MillisBehindLatest increasing; consumers can't keep up; real-time processing delayed.
*Solution:* Scale consumers to match shard count; optimize processing code; use enhanced fan-out; increase Lambda concurrency.

**Pitfall 3: Undersized Shard Count**
*Problem:* WriteProvisionedThroughputExceeded errors; data loss without retry; throttling during normal traffic.
*Solution:* Calculate required shards based on peak throughput; add 20% buffer; implement retry logic; monitor IncomingBytes metric.

## Review Questions

1. **Kinesis Data Streams shard ingestion limit?** 1 MB/sec or 1,000 records/sec
2. **Standard consumer throughput per shard?** 2 MB/sec (shared among all consumers)
3. **Enhanced fan-out throughput per consumer?** 2 MB/sec (dedicated per registered consumer)
4. **Default data retention?** 24 hours (extendable to 365 days)
5. **Firehose minimum buffer interval?** 60 seconds

***

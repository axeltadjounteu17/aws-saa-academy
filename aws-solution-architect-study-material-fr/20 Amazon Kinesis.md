# Partie 7 : Analytics \& Machine Learning

# Chapitre 20 : Amazon Kinesis

##Présentation

Les applications modernes génèrent d'énormes volumes de données en streaming : flux de clics de millions de visiteurs de sites Web, télémétrie de millions d'appareils IoT, transactions financières des systèmes commerciaux, journaux de microservices distribués et analyses de jeux en temps réel. Les systèmes de traitement par lots traditionnels collectent des données pendant des heures ou des jours avant l'analyse, manquant ainsi des opportunités d'action immédiate. Amazon Kinesis traite les données en streaming en temps réel, permettant aux applications de réagir aux événements en quelques millisecondes, de détecter immédiatement les anomalies, de mettre à jour les tableaux de bord instantanément et de déclencher des réponses automatisées dès l'arrivée des données. Comprendre Kinesis transforme la pensée orientée lots en architectures événementielles en temps réel.

La famille Kinesis propose quatre services spécialisés optimisés pour différents scénarios de streaming : Kinesis Data Streams ingère et stocke les données de streaming pour un traitement personnalisé avec une latence d'une milliseconde ; Kinesis Data Firehose fournit des données en streaming vers des destinations telles que S3, Redshift et Elasticsearch avec mise à l'échelle et transformation automatiques ; Kinesis Data Analytics traite les données en streaming à l'aide de SQL ou d'Apache Flink pour des analyses en temps réel ; Kinesis Video Streams ingère, stocke et traite la vidéo en streaming. Choisir le mauvais service (en utilisant Data Streams lorsque Firehose suffit, ou vice versa) entraîne une perte de temps, d'argent et de ressources d'ingénierie.

Les décisions architecturales de Kinesis ont un impact durable. Un nombre de fragments sous-dimensionné entraîne une limitation lors des pics de trafic. Une mauvaise conception du consommateur crée un décalage de plusieurs heures par rapport au temps réel. L’absence de diffusion améliorée oblige les consommateurs à partager le débit. Ne pas mettre en œuvre le repartitionnement empêche la mise à l’échelle avec la croissance des données. Une surveillance inadéquate cache les pannes des consommateurs pendant des heures. Ce chapitre couvre Kinesis, des fondamentaux aux modèles de production, y compris les stratégies de partitionnement, les modèles producteur/consommateur, la diffusion améliorée, la conservation des données, le repartitionnement, la surveillance, la création de pipelines de données en temps réel et la réalisation d'analyses en moins d'une seconde à grande échelle.

## Théorie \&Concepts

### Principes fondamentaux du streaming des données

**Traitement par lots ou par flux :**
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
**Modèles de données en streaming :**
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
### Architecture des flux de données Kinesis

**Composants principaux :**
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
**Planification des capacités :**
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
**Conservation et relecture des données :**
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
### Firehose de données Kinesis

**Firehose et flux de données :**
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
**Mise en mémoire tampon des lances à incendie :**
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
**Transformation des données :**
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
### Analyse des données Kinesis

**Traitement de flux basé sur SQL :**
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
**Applications Apache Flink :**
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
### Modèles de producteurs et de consommateurs

**Modèles de producteurs :**
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
**Modèles de consommation :**
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
### Stratégies de repartitionnement

**Partage et fusion de fragments :**
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
### Surveillance et dépannage

**Mesures clés :**
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
## Implémentation pratique

### Atelier 1 : Configuration des flux de données
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
### Lab 2 : Consommateur Lambda
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
## Conseils \& Bonnes pratiques

**Astuce 1 : Utilisez la diffusion améliorée pour plusieurs consommateurs**
Un débit dédié de 2 Mo/s par consommateur élimine la concurrence en matière de débit, ce qui vaut le coût de production.

**Astuce 2 : Checkpoint fréquemment dans KCL**
Point de contrôle après chaque lot pour minimiser le retraitement en cas de panne et garantir une livraison au moins une fois.

**Astuce 3 : Surveillez MillisBehindLatest en continu**
Définissez l'alarme CloudWatch < 60 000 ms : mesure critique pour l'efficacité du traitement en temps réel.

**Astuce 4 : Utilisez des clés de partition à cardinalité élevée**
userId, deviceId, sessionId se répartissent uniformément : évitez la date, la région ou le statut (crée des fragments chauds).

**Astuce 5 : Commencez avec Firehose pour les pipelines simples**
S'il s'agit uniquement d'un chargement sur S3/Redshift, Firehose est plus simple et moins cher : effectuez une mise à niveau vers Data Streams si nécessaire en temps réel.

## Pièges \& Remèdes

**Piège 1 : fragment chaud provenant d'une clé de partition médiocre**
*Problème :* Un fragment est débordé, d'autres sont inutilisés ; limitation malgré la capacité disponible.
*Solution :* Utilisez des clés de partition à haute cardinalité (userId) ; ajouter un suffixe aléatoire ; surveiller la distribution des fragments ; diviser des éclats chauds.

**Piège 2 : le retard des consommateurs augmente continuellement**
*Problème :* MillisBehindLatest augmente ; les consommateurs ne peuvent pas suivre ; traitement en temps réel retardé.
*Solution :* Faites évoluer les consommateurs pour qu'ils correspondent au nombre de fragments ; optimiser le code de traitement ; utiliser une diffusion améliorée ; augmenter la concurrence Lambda.

**Piège 3 : nombre de fragments sous-dimensionnés**
*Problème :* Erreurs WriteProvisionedThroughputExceeded ; perte de données sans nouvelle tentative ; limitation pendant le trafic normal.
*Solution :* Calculez les fragments requis en fonction du débit maximal ; ajoutez un tampon de 20 % ; implémenter une logique de nouvelle tentative ; surveiller la métrique IncomingBytes.

## Questions de révision

1. **Limite d'ingestion de partitions Kinesis Data Streams ?** 1 Mo/s ou 1 000 enregistrements/s
2. **Débit consommateur standard par partition ?** 2 Mo/s (partagé entre tous les consommateurs)
3. **Débit de diffusion amélioré par consommateur ?** 2 Mo/s (dédié par consommateur enregistré)
4. **Conservation des données par défaut ?** 24 heures (extensible jusqu'à 365 jours)
5. **Intervalle de tampon minimum Firehose ?** 60 secondes

***
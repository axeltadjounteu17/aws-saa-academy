# Chapter 12: DynamoDB

## Introduction

Amazon DynamoDB is AWS's flagship NoSQL database service, designed to deliver single-digit millisecond performance at any scale. Unlike traditional relational databases that struggle with massive scale, DynamoDB provides consistent performance whether you're storing gigabytes or petabytes, handling hundreds or millions of requests per second. This serverless database automatically scales, replicates across multiple Availability Zones, and provides built-in security, backup, and global replication—all without managing servers, clusters, or infrastructure.

DynamoDB represents a fundamental shift in database design philosophy. Instead of normalizing data and performing complex joins at query time like SQL databases, DynamoDB requires you to design your data model around your access patterns. Understanding partition keys, sort keys, secondary indexes, and query patterns is essential—poor key design leads to hot partitions, throttling, and failed queries. However, proper design delivers unparalleled performance and scale, making DynamoDB the database of choice for applications requiring predictable, low-latency access at massive scale.

The difference between DynamoDB and relational databases extends beyond just performance. DynamoDB is schema-flexible, allowing you to store varying attributes in different items. It provides two consistency models—eventual and strong—allowing you to trade consistency for lower latency when appropriate. DynamoDB Streams enable event-driven architectures, triggering Lambda functions on every data change. Global Tables replicate data across multiple regions with sub-second latency. DynamoDB Accelerator (DAX) provides microsecond caching. These capabilities make DynamoDB ideal for gaming leaderboards, IoT telemetry, mobile backends, e-commerce carts, and any application requiring extreme scale.

This chapter provides comprehensive coverage of DynamoDB from fundamentals to production patterns. You'll learn data modeling principles, key design strategies, secondary indexes, capacity modes, DynamoDB Streams, Global Tables, DAX, backup and restore, monitoring and troubleshooting, and cost optimization. Whether you're building a new application or migrating from another database, mastering DynamoDB is essential for applications requiring scale, speed, and simplicity.

## Theory \& Concepts

### DynamoDB Fundamentals

**What is DynamoDB?**

DynamoDB is a fully managed NoSQL database service providing:

- **Fast Performance:** Single-digit millisecond latency at any scale
- **Scalability:** Unlimited storage, automatic scaling
- **High Availability:** Replication across 3 AZs, 99.99% SLA
- **Serverless:** No servers to manage, pay per request or throughput
- **Flexible Schema:** Store varying attributes per item
- **Global Replication:** Multi-region active-active replication

**Core Concepts:**

```
Table: Collection of items (like a SQL table, but without fixed schema)
├── Item: Individual record (like a SQL row)
│   └── Attributes: Key-value pairs (like SQL columns)
├── Primary Key: Uniquely identifies each item
│   ├── Partition Key: Required, determines data distribution
│   └── Sort Key: Optional, enables range queries
└── Secondary Indexes: Alternative access patterns
```

**DynamoDB vs Relational Databases:**


| Feature | DynamoDB | SQL Databases |
| :-- | :-- | :-- |
| **Data Model** | Key-value, document | Relational tables |
| **Schema** | Flexible, per item | Fixed schema |
| **Queries** | By key or index | SQL with joins |
| **Joins** | Not supported (denormalize) | Supported |
| **Scaling** | Horizontal, automatic | Vertical, manual |
| **Consistency** | Eventual or strong | Strong (ACID) |
| **Performance** | Consistent, ms latency | Variable with scale |
| **Use Case** | Web scale, gaming, IoT | Complex queries, transactions |

### Primary Keys

The primary key is the most critical design decision in DynamoDB.

**Two Types:**

**1. Partition Key Only (Simple Primary Key):**

```
Primary Key = Partition Key

Example: User table
- Partition Key: userId

Table Structure:
userId (PK) | name      | email
user123     | John Doe  | john@example.com
user456     | Jane Doe  | jane@example.com

Query patterns:
✓ Get user by userId: O(1) lookup
✗ Get users by name: Full table scan (slow)
```

**2. Partition Key + Sort Key (Composite Primary Key):**

```
Primary Key = Partition Key + Sort Key

Example: Order table
- Partition Key: customerId
- Sort Key: orderDate

Table Structure:
customerId (PK) | orderDate (SK)    | total
customer123     | 2025-01-15        | 299.99
customer123     | 2025-01-20        | 149.99
customer456     | 2025-01-18        | 499.99

Query patterns:
✓ Get all orders for customer: Query by customerId
✓ Get orders in date range: Query customerId with orderDate BETWEEN
✓ Get specific order: Get by customerId + orderDate
✗ Get all orders by date (all customers): Requires index
```

**Partition Key Design Principles:**

```
Good Partition Key:
- High cardinality (many unique values)
- Even access distribution
- Predictable query pattern

Bad Partition Key:
- Low cardinality (few unique values) → hot partitions
- Uneven access distribution
- Unpredictable access

Examples:

✓ Good: userId, deviceId, sessionId
✗ Bad: status (only 3-4 values), date (sequential access)

Rule: Access should be evenly distributed across all partition keys
```

**Partition Key Calculation:**

```
DynamoDB uses partition key to determine physical partition:

Partition = hash(partition_key) mod number_of_partitions

Example with 4 partitions:
- hash("user123") → 42 → 42 mod 4 = 2 → Partition 2
- hash("user456") → 17 → 17 mod 4 = 1 → Partition 1
- hash("user789") → 98 → 98 mod 4 = 2 → Partition 2

Even distribution critical for performance
```


### Secondary Indexes

Secondary indexes provide alternative access patterns beyond the primary key.

**Two Types:**

**1. Global Secondary Index (GSI):**

```
- Different partition key and/or sort key
- Spans all table partitions
- Has own provisioned capacity (separate from table)
- Eventually consistent reads only
- Can be created/deleted at any time
- Sparse: Only contains items with index key attributes
```

**Example:**

```
Base Table:
PK: userId | SK: gameId | score | timestamp

GSI: GameLeaderboard
PK: gameId | SK: score | userId | timestamp

Use case: Get top scores for a game
Query: GSI with gameId = "game1", sort by score DESC
```

**2. Local Secondary Index (LSI):**

```
- Same partition key as table, different sort key
- Shares table partitions
- Shares table capacity
- Supports strong consistency
- Must be created at table creation (cannot add later)
- Not sparse: Contains all items from partition
```

**Example:**

```
Base Table:
PK: customerId | SK: orderDate | orderId | status | total

LSI: OrderByStatus
PK: customerId | SK: status | orderDate | orderId | total

Use case: Get all pending orders for customer
Query: LSI with customerId = "cust123", SK = "pending"
```

**GSI vs LSI Comparison:**


| Feature | GSI | LSI |
| :-- | :-- | :-- |
| **Partition Key** | Can be different | Must be same as table |
| **Sort Key** | Can be different | Different from table |
| **Capacity** | Separate | Shared with table |
| **Consistency** | Eventual only | Eventual or strong |
| **Creation** | Anytime | Table creation only |
| **Limits** | 20 per table | 5 per table |
| **Sparse** | Yes (only items with keys) | No (all items) |

**Index Design Strategy:**

```python
# Define access patterns first, then design indexes

access_patterns = [
    "Get user by userId",                    # Primary key
    "Get user by email",                     # GSI needed
    "Get all orders for customer",           # Composite PK: customerId + orderDate
    "Get orders by status for customer",     # LSI: customerId + status
    "Get recent orders across all customers" # GSI: status + orderDate
]

# Design indexes to support each pattern
# Avoid table scans at all costs
```


### Capacity Modes

DynamoDB offers two capacity modes with different billing models.

**1. Provisioned Capacity:**

```
Specify read/write capacity units (RCU/WCU)

1 RCU = 1 strongly consistent read/sec for item up to 4 KB
        OR
        2 eventually consistent reads/sec for item up to 4 KB

1 WCU = 1 write/sec for item up to 1 KB

Example:
- 100 RCU: Read 100 items/sec (4 KB each, strong consistency)
           OR 200 items/sec (4 KB each, eventual consistency)
- 50 WCU: Write 50 items/sec (1 KB each)

Cost:
- RCU: $0.00013 per hour (us-east-1)
- WCU: $0.00065 per hour (us-east-1)
- 100 RCU + 50 WCU = $11.25/month

Use when: Predictable traffic, steady load
```

**Auto Scaling:**

```bash
# Enable auto scaling for provisioned capacity
aws dynamodb update-table \
    --table-name MyTable \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10

# Configure auto scaling
aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --resource-id table/MyTable \
    --scalable-dimension dynamodb:table:ReadCapacityUnits \
    --min-capacity 5 \
    --max-capacity 100

aws application-autoscaling put-scaling-policy \
    --service-namespace dynamodb \
    --resource-id table/MyTable \
    --scalable-dimension dynamodb:table:ReadCapacityUnits \
    --policy-name MyScalingPolicy \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
        }
    }'
```

**2. On-Demand Capacity:**

```
Pay per request, no capacity planning needed

Cost:
- Read: $0.25 per million requests
- Write: $1.25 per million requests

Example (1 million requests/month):
- 500K reads + 500K writes = $0.125 + $0.625 = $0.75/month

Use when: Unpredictable traffic, spiky workloads, new applications

Comparison:
Provisioned: Lower cost for steady traffic
On-Demand: Simpler, better for variable traffic
```

**Capacity Mode Decision Matrix:**

```
Choose Provisioned when:
- Traffic patterns predictable
- Steady, consistent load
- Cost optimization priority
- Can forecast capacity needs

Choose On-Demand when:
- Traffic patterns unknown
- Highly variable/spiky traffic
- New application (learning phase)
- Infrequent access patterns
```


### Consistency Models

DynamoDB offers two read consistency models.

**1. Eventually Consistent Reads (Default):**

```
- Read might not reflect recent write (< 1 second delay)
- Higher throughput (2x RCU)
- Lower latency
- Lower cost

Use case: Non-critical reads, high throughput needed

Example:
Write: Update user's profile picture
Read (immediate): Might get old picture (< 1 second)
Read (1 second later): Gets new picture
```

**2. Strongly Consistent Reads:**

```
- Read reflects all successful writes
- Half the throughput (1x RCU)
- Slightly higher latency
- Same cost per consistent read

Use case: Critical reads requiring latest data

Example:
Write: Transfer money between accounts
Read (immediate): Must get updated balance
```

**Consistency Example:**

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

# Write
table.put_item(Item={'userId': 'user123', 'status': 'active'})

# Eventually consistent read (default)
response = table.get_item(Key={'userId': 'user123'})
# Might return old status (very unlikely, typically < 1 second lag)

# Strongly consistent read
response = table.get_item(
    Key={'userId': 'user123'},
    ConsistentRead=True  # Guarantee latest data
)
# Always returns 'active'
```


### DynamoDB Streams

Streams capture time-ordered sequence of item-level modifications.

**Stream View Types:**

```
1. KEYS_ONLY: Only partition and sort keys
2. NEW_IMAGE: Entire item after modification
3. OLD_IMAGE: Entire item before modification
4. NEW_AND_OLD_IMAGES: Both before and after

Stream Record:
{
    "eventName": "INSERT | MODIFY | REMOVE",
    "eventTime": "2025-01-15T10:30:00Z",
    "keys": {"userId": "user123"},
    "newImage": {"userId": "user123", "status": "active"},
    "oldImage": {"userId": "user123", "status": "pending"}
}
```

**Use Cases:**

```
1. Aggregation: Maintain counters, summaries
2. Replication: Sync to other systems (Elasticsearch, S3)
3. Notifications: Trigger alerts on changes
4. Audit: Log all modifications
5. Cross-region replication: Global Tables use streams
6. Event-driven architectures: Lambda triggers
```

**Stream Processing with Lambda:**

```python
# stream_processor.py
def lambda_handler(event, context):
    """
    Process DynamoDB stream records
    """
    
    for record in event['Records']:
        event_name = record['eventName']  # INSERT, MODIFY, REMOVE
        
        if event_name == 'INSERT':
            new_item = record['dynamodb']['NewImage']
            handle_new_item(new_item)
        
        elif event_name == 'MODIFY':
            old_item = record['dynamodb']['OldImage']
            new_item = record['dynamodb']['NewImage']
            handle_update(old_item, new_item)
        
        elif event_name == 'REMOVE':
            old_item = record['dynamodb']['OldImage']
            handle_deletion(old_item)

def handle_new_item(item):
    """Process new item insertion"""
    # Example: Send welcome email for new user
    user_id = item['userId']['S']
    email = item['email']['S']
    send_welcome_email(email)

def handle_update(old_item, new_item):
    """Process item update"""
    # Example: Notify if status changed
    if old_item['status']['S'] != new_item['status']['S']:
        notify_status_change(new_item['userId']['S'], new_item['status']['S'])

def handle_deletion(item):
    """Process item deletion"""
    # Example: Archive deleted user data
    archive_user_data(item)
```


### Global Tables

Global Tables provide multi-region, active-active replication.

**Architecture:**

```
Region 1 (us-east-1)
├── DynamoDB Table (read/write)
└── Stream (replication source)
        ↓ (sub-second replication)
Region 2 (eu-west-1)
├── DynamoDB Table (read/write)
└── Stream (replication source)
        ↓
Region 3 (ap-southeast-1)
└── DynamoDB Table (read/write)

Features:
- Active-active: Write to any region
- Sub-second replication: Typically < 1 second
- Conflict resolution: Last-writer-wins
- Automatic failover: If region fails, use another
```

**Use Cases:**

```
1. Global applications: Low-latency access worldwide
2. Disaster recovery: Multi-region redundancy
3. Regulatory compliance: Data residency requirements
4. Business continuity: Regional failure protection
```

**Conflict Resolution:**

```
Scenario: Concurrent writes to same item in different regions

Region 1 (10:00:00.100): Update item A, status = "active"
Region 2 (10:00:00.200): Update item A, status = "inactive"

Result: Region 2 wins (last writer wins based on timestamp)
Final state in all regions: status = "inactive"

Consideration: Design to minimize conflicts
- Use immutable operations (append instead of update)
- Partition data by region when possible
```


### DynamoDB Accelerator (DAX)

DAX is an in-memory cache for DynamoDB providing microsecond response times.

**Architecture:**

```
Application
    ↓
DAX Cluster (in-memory cache)
├── Cache hit: Return data (microseconds)
└── Cache miss: Query DynamoDB → Cache result
    ↓
DynamoDB Table
```

**Performance:**

```
Without DAX:
- GetItem: 1-5 ms (DynamoDB)
- Query: 5-20 ms

With DAX:
- GetItem: 0.1-0.3 ms (cached)
- Query: 0.5-2 ms (cached)

Improvement: 10x+ faster for cached reads
```

**Use Cases:**

```
Use DAX when:
- Read-heavy workloads (90%+ reads)
- Require microsecond latency
- Repeated reads of same items
- High read throughput needed

Don't use DAX when:
- Write-heavy workloads
- Millisecond latency acceptable
- Most reads are unique queries
- Cost-sensitive (DAX adds cost)
```

**DAX Configuration:**

```bash
# Create DAX cluster
aws dax create-cluster \
    --cluster-name production-dax \
    --node-type dax.r5.large \
    --replication-factor 3 \
    --iam-role-arn arn:aws:iam::123456789012:role/DAXRole \
    --subnet-group subnet-group-name \
    --security-group-ids sg-12345678

# Application code (minimal changes)
import amazondax

# Use DAX endpoint instead of DynamoDB
dax = amazondax.AmazonDaxClient(
    endpoint_url='production-dax.abcdef.dax-clusters.us-east-1.amazonaws.com:8111'
)

# Same API calls, but cached
response = dax.get_item(
    TableName='Users',
    Key={'userId': 'user123'}
)
```


## Hands-On Implementation

### Lab 1: Creating DynamoDB Table with Indexes

**Objective:** Design and create a table for e-commerce orders with efficient access patterns.

```python
# create_orders_table.py
import boto3

def create_orders_table():
    """
    Create orders table with proper key design
    
    Access patterns:
    1. Get order by orderId
    2. Get all orders for customer
    3. Get orders by status for customer
    4. Get recent orders across all customers by status
    """
    
    dynamodb = boto3.client('dynamodb')
    
    try:
        response = dynamodb.create_table(
            TableName='Orders',
            
            # Primary Key: orderId (simple key for direct lookup)
            KeySchema=[
                {'AttributeName': 'orderId', 'KeyType': 'HASH'}  # Partition key
            ],
            
            AttributeDefinitions=[
                {'AttributeName': 'orderId', 'AttributeType': 'S'},
                {'AttributeName': 'customerId', 'AttributeType': 'S'},
                {'AttributeName': 'orderDate', 'AttributeType': 'S'},
                {'AttributeName': 'status', 'AttributeType': 'S'}
            ],
            
            # GSI 1: Customer orders (support pattern #2, #3)
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'CustomerOrdersIndex',
                    'KeySchema': [
                        {'AttributeName': 'customerId', 'KeyType': 'HASH'},
                        {'AttributeName': 'orderDate', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {'ProjectionType': 'ALL'},
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                },
                # GSI 2: Orders by status (support pattern #4)
                {
                    'IndexName': 'StatusDateIndex',
                    'KeySchema': [
                        {'AttributeName': 'status', 'KeyType': 'HASH'},
                        {'AttributeName': 'orderDate', 'KeyType': 'RANGE'}
                    ],
                    'Projection': {
                        'ProjectionType': 'INCLUDE',
                        'NonKeyAttributes': ['customerId', 'total']
                    },
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            
            BillingMode='PROVISIONED',
            ProvisionedThroughput={
                'ReadCapacityUnits': 10,
                'WriteCapacityUnits': 10
            },
            
            # Enable streams for event processing
            StreamSpecification={
                'StreamEnabled': True,
                'StreamViewType': 'NEW_AND_OLD_IMAGES'
            },
            
            # Enable point-in-time recovery
            PointInTimeRecoverySpecification={
                'PointInTimeRecoveryEnabled': True
            },
            
            # Encryption at rest
            SSESpecification={
                'Enabled': True,
                'SSEType': 'KMS',
                'KMSMasterKeyId': 'alias/dynamodb-key'
            },
            
            Tags=[
                {'Key': 'Environment', 'Value': 'Production'},
                {'Key': 'Application', 'Value': 'ECommerce'}
            ]
        )
        
        print(f"Table created: {response['TableDescription']['TableName']}")
        print(f"Table ARN: {response['TableDescription']['TableArn']}")
        
        # Wait for table to be active
        waiter = dynamodb.get_waiter('table_exists')
        waiter.wait(TableName='Orders')
        
        print("Table is now active and ready to use")
        
        return response['TableDescription']['TableArn']
        
    except Exception as e:
        print(f"Error creating table: {e}")
        raise

# Create table
table_arn = create_orders_table()
```

**Query Examples:**

```python
# query_orders.py
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Orders')

# Pattern 1: Get order by orderId (primary key)
def get_order(order_id):
    response = table.get_item(Key={'orderId': order_id})
    return response.get('Item')

# Pattern 2: Get all orders for customer
def get_customer_orders(customer_id):
    response = table.query(
        IndexName='CustomerOrdersIndex',
        KeyConditionExpression=Key('customerId').eq(customer_id)
    )
    return response['Items']

# Pattern 3: Get orders by status for customer
def get_customer_orders_by_status(customer_id, status):
    response = table.query(
        IndexName='CustomerOrdersIndex',
        KeyConditionExpression=Key('customerId').eq(customer_id),
        FilterExpression=Attr('status').eq(status)
    )
    return response['Items']

# Pattern 4: Get recent orders by status (all customers)
def get_recent_orders_by_status(status, limit=10):
    response = table.query(
        IndexName='StatusDateIndex',
        KeyConditionExpression=Key('status').eq(status),
        ScanIndexForward=False,  # Sort descending (newest first)
        Limit=limit
    )
    return response['Items']

# Usage examples
order = get_order('order-123')
customer_orders = get_customer_orders('customer-456')
pending_orders = get_customer_orders_by_status('customer-456', 'pending')
recent_shipped = get_recent_orders_by_status('shipped', limit=20)
```


### Lab 2: Setting Up DynamoDB Streams with Lambda

**Objective:** Process table changes in real-time using Streams and Lambda.

```python
# stream_processor_lambda.py
import boto3
import json
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Process DynamoDB stream events
    - Send notifications for new orders
    - Update aggregation tables
    - Maintain audit log
    """
    
    for record in event['Records']:
        event_name = record['eventName']
        
        if event_name == 'INSERT':
            # New order created
            new_order = deserialize_dynamodb_item(record['dynamodb']['NewImage'])
            handle_new_order(new_order)
        
        elif event_name == 'MODIFY':
            # Order updated (e.g., status change)
            old_order = deserialize_dynamodb_item(record['dynamodb']['OldImage'])
            new_order = deserialize_dynamodb_item(record['dynamodb']['NewImage'])
            handle_order_update(old_order, new_order)
        
        elif event_name == 'REMOVE':
            # Order cancelled/deleted
            old_order = deserialize_dynamodb_item(record['dynamodb']['OldImage'])
            handle_order_deletion(old_order)
    
    return {'statusCode': 200}

def deserialize_dynamodb_item(item):
    """Convert DynamoDB JSON to Python dict"""
    def convert_value(value):
        if 'S' in value:
            return value['S']
        elif 'N' in value:
            return Decimal(value['N'])
        elif 'BOOL' in value:
            return value['BOOL']
        elif 'NULL' in value:
            return None
        elif 'M' in value:
            return {k: convert_value(v) for k, v in value['M'].items()}
        elif 'L' in value:
            return [convert_value(v) for v in value['L']]
        return value
    
    return {k: convert_value(v) for k, v in item.items()}

def handle_new_order(order):
    """Process new order"""
    print(f"New order: {order['orderId']}")
    
    # Send notification
    send_order_notification(order, 'NEW_ORDER')
    
    # Update daily sales aggregate
    update_sales_aggregate(order)

def handle_order_update(old_order, new_order):
    """Process order update"""
    print(f"Order updated: {new_order['orderId']}")
    
    # Check if status changed
    if old_order.get('status') != new_order.get('status'):
        print(f"Status changed: {old_order['status']} → {new_order['status']}")
        send_order_notification(new_order, 'STATUS_CHANGED')
        
        # If order shipped, trigger shipping workflow
        if new_order['status'] == 'shipped':
            trigger_shipping_workflow(new_order)

def handle_order_deletion(order):
    """Process order deletion"""
    print(f"Order deleted: {order['orderId']}")
    
    # Archive to S3
    archive_order(order)
    
    # Update aggregates
    adjust_sales_aggregate(order, operation='subtract')

def send_order_notification(order, notification_type):
    """Send SNS notification"""
    message = {
        'type': notification_type,
        'orderId': order['orderId'],
        'customerId': order['customerId'],
        'status': order.get('status'),
        'total': float(order.get('total', 0))
    }
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:order-notifications',
        Subject=f'Order {notification_type}: {order["orderId"]}',
        Message=json.dumps(message)
    )

def update_sales_aggregate(order):
    """Update daily sales aggregate table"""
    aggregates_table = dynamodb.Table('DailySalesAggregates')
    
    order_date = order['orderDate'].split('T')[0]  # Extract date
    
    aggregates_table.update_item(
        Key={'date': order_date},
        UpdateExpression='ADD orderCount :inc, totalSales :amount',
        ExpressionAttributeValues={
            ':inc': 1,
            ':amount': order.get('total', 0)
        }
    )

def trigger_shipping_workflow(order):
    """Trigger shipping workflow (e.g., via Step Functions)"""
    sfn = boto3.client('stepfunctions')
    
    sfn.start_execution(
        stateMachineArn='arn:aws:states:us-east-1:123456789012:stateMachine:ShippingWorkflow',
        input=json.dumps({
            'orderId': order['orderId'],
            'customerId': order['customerId'],
            'shippingAddress': order.get('shippingAddress')
        })
    )

def archive_order(order):
    """Archive deleted order to S3"""
    s3 = boto3.client('s3')
    
    s3.put_object(
        Bucket='order-archives',
        Key=f"deleted/{order['orderId']}.json",
        Body=json.dumps(order, default=str)
    )
```

**Enable Stream and Lambda Trigger:**

```bash
# Get stream ARN
STREAM_ARN=$(aws dynamodb describe-table \
    --table-name Orders \
    --query 'Table.LatestStreamArn' \
    --output text)

# Create Lambda execution role
# (with permissions for DynamoDB Streams, SNS, S3)

# Create event source mapping
aws lambda create-event-source-mapping \
    --function-name OrderStreamProcessor \
    --event-source-arn $STREAM_ARN \
    --starting-position LATEST \
    --batch-size 100 \
    --maximum-batching-window-in-seconds 10
```


### Lab 3: Setting Up Global Tables

**Objective:** Configure multi-region replication for global application.

```bash
# Create table in primary region (us-east-1)
aws dynamodb create-table \
    --table-name GlobalOrders \
    --attribute-definitions \
        AttributeName=orderId,AttributeType=S \
    --key-schema \
        AttributeName=orderId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region us-east-1

# Wait for table to be active
aws dynamodb wait table-exists \
    --table-name GlobalOrders \
    --region us-east-1

# Create global table (add replicas)
aws dynamodb create-global-table \
    --global-table-name GlobalOrders \
    --replication-group \
        RegionName=us-east-1 \
        RegionName=eu-west-1 \
        RegionName=ap-southeast-1

# Monitor replication status
aws dynamodb describe-global-table \
    --global-table-name GlobalOrders

# Update global table settings
aws dynamodb update-global-table-settings \
    --global-table-name GlobalOrders \
    --global-table-billing-mode PAY_PER_REQUEST \
    --global-table-global-secondary-index-settings-update \
        IndexName=CustomerOrdersIndex,\
        ProvisionedWriteCapacityAutoScalingSettingsUpdate={MinimumUnits=5,MaximumUnits=100}
```

## Production-Level Knowledge

### Time-Series Data Patterns

Time-series data (IoT sensors, logs, metrics) requires special design patterns in DynamoDB.

**Pattern 1: Time-Based Partition Keys**

```python
# BAD: Single partition key (hot partition problem)
{
    "sensorId": "sensor123",  # Partition key
    "timestamp": "2025-01-15T10:30:00Z",  # Sort key
    "temperature": 72.5
}
# Problem: All data for sensor123 goes to one partition

# GOOD: Composite partition key with time period
{
    "sensorId_month": "sensor123#2025-01",  # Partition key
    "timestamp": "2025-01-15T10:30:00Z",  # Sort key
    "temperature": 72.5
}
# Benefit: Distributes data across partitions by month
```

**Pattern 2: Write Sharding**

```python
# Add random shard suffix to distribute writes
import random
import hashlib
from datetime import datetime

def create_time_series_item(sensor_id, reading):
    """
    Create time-series item with write sharding
    """
    
    timestamp = datetime.utcnow().isoformat()
    
    # Calculate shard (0-9)
    shard = hashlib.md5(f"{sensor_id}{timestamp}".encode()).hexdigest()[-1]
    
    item = {
        'pk': f"sensor#{sensor_id}#{shard}",  # Sharded partition key
        'sk': timestamp,  # Sort key
        'sensorId': sensor_id,  # Original sensor ID for queries
        'temperature': reading['temperature'],
        'humidity': reading['humidity'],
        'timestamp': timestamp
    }
    
    return item

# Query across shards
def query_sensor_data(sensor_id, start_time, end_time):
    """
    Query data across all shards
    """
    
    results = []
    
    # Query each shard (0-9)
    for shard in range(10):
        response = table.query(
            KeyConditionExpression=Key('pk').eq(f"sensor#{sensor_id}#{shard}") & 
                                   Key('sk').between(start_time, end_time)
        )
        results.extend(response['Items'])
    
    # Merge and sort results
    return sorted(results, key=lambda x: x['timestamp'])
```

**Pattern 3: TTL for Automatic Expiration**

```python
# Enable TTL to automatically delete old data
import time

def create_item_with_ttl(data, retention_days=30):
    """
    Create item with TTL set
    """
    
    # Calculate expiration timestamp
    ttl_timestamp = int(time.time()) + (retention_days * 86400)
    
    item = {
        'pk': data['pk'],
        'sk': data['sk'],
        'ttl': ttl_timestamp,  # DynamoDB will delete item after this time
        **data
    }
    
    table.put_item(Item=item)
    
    return item

# Enable TTL on table
dynamodb_client.update_time_to_live(
    TableName='SensorData',
    TimeToLiveSpecification={
        'Enabled': True,
        'AttributeName': 'ttl'
    }
)
```

**Pattern 4: Hot Partition Mitigation**

```python
# time_series_best_practices.py

class TimeSeriesDataManager:
    """
    Manage time-series data with optimized patterns
    """
    
    def __init__(self, table_name, num_shards=10):
        self.table = boto3.resource('dynamodb').Table(table_name)
        self.num_shards = num_shards
    
    def write_reading(self, device_id, reading):
        """
        Write sensor reading with sharding
        """
        
        timestamp = datetime.utcnow().isoformat()
        
        # Shard based on timestamp to distribute writes
        shard = int(time.time()) % self.num_shards
        
        # Partition key includes date and shard
        date = datetime.utcnow().strftime('%Y-%m-%d')
        pk = f"{device_id}#{date}#{shard}"
        
        item = {
            'pk': pk,
            'sk': timestamp,
            'deviceId': device_id,
            'temperature': reading.get('temperature'),
            'humidity': reading.get('humidity'),
            'pressure': reading.get('pressure'),
            'ttl': int(time.time()) + (90 * 86400)  # 90 days retention
        }
        
        self.table.put_item(Item=item)
    
    def query_device_readings(self, device_id, date, start_time=None, end_time=None):
        """
        Query readings for device on specific date
        """
        
        all_results = []
        
        # Query all shards for the date
        for shard in range(self.num_shards):
            pk = f"{device_id}#{date}#{shard}"
            
            if start_time and end_time:
                key_condition = Key('pk').eq(pk) & Key('sk').between(start_time, end_time)
            else:
                key_condition = Key('pk').eq(pk)
            
            response = self.table.query(KeyConditionExpression=key_condition)
            all_results.extend(response['Items'])
        
        # Sort by timestamp
        return sorted(all_results, key=lambda x: x['sk'])
    
    def aggregate_metrics(self, device_id, date):
        """
        Calculate daily aggregates
        """
        
        readings = self.query_device_readings(device_id, date)
        
        if not readings:
            return None
        
        temps = [r['temperature'] for r in readings if r.get('temperature')]
        
        return {
            'deviceId': device_id,
            'date': date,
            'count': len(readings),
            'avgTemperature': sum(temps) / len(temps) if temps else 0,
            'minTemperature': min(temps) if temps else 0,
            'maxTemperature': max(temps) if temps else 0
        }

# Usage
manager = TimeSeriesDataManager('SensorData', num_shards=10)

# Write reading
manager.write_reading('sensor123', {
    'temperature': 72.5,
    'humidity': 45.2,
    'pressure': 1013.2
})

# Query readings
readings = manager.query_device_readings('sensor123', '2025-01-15')
aggregates = manager.aggregate_metrics('sensor123', '2025-01-15')
```


### Advanced Query Patterns

**Composite Sort Key Pattern:**

```python
# Use hierarchical data in sort key for flexible queries

# Store: customer#order#item
item = {
    'pk': 'customer123',
    'sk': 'order#2025-01-15#item#001',
    'itemName': 'Widget',
    'price': 29.99
}

# Query patterns enabled:
# 1. All data for customer
response = table.query(
    KeyConditionExpression=Key('pk').eq('customer123')
)

# 2. All orders for customer
response = table.query(
    KeyConditionExpression=Key('pk').eq('customer123') & 
                           Key('sk').begins_with('order#')
)

# 3. Specific order items
response = table.query(
    KeyConditionExpression=Key('pk').eq('customer123') & 
                           Key('sk').begins_with('order#2025-01-15#item#')
)

# 4. Orders in date range
response = table.query(
    KeyConditionExpression=Key('pk').eq('customer123') & 
                           Key('sk').between('order#2025-01-01', 'order#2025-01-31')
)
```

**Sparse Index Pattern:**

```python
# Use sparse indexes to filter subset of data efficiently

# Only items with 'premiumMember' attribute appear in index
item_regular = {
    'userId': 'user123',
    'name': 'John Doe',
    # No premiumMember attribute
}

item_premium = {
    'userId': 'user456',
    'name': 'Jane Doe',
    'premiumMember': True,  # Only premium members have this
    'memberSince': '2024-01-01'
}

# GSI on premiumMember + memberSince
# Only indexes items with premiumMember attribute
# Much more efficient than filtering full table

# Query all premium members
response = table.query(
    IndexName='PremiumMembersIndex',
    KeyConditionExpression=Key('premiumMember').eq(True)
)
```

**One-to-Many Pattern:**

```python
# Store related items with same partition key

# Author entity
{
    'pk': 'author#author123',
    'sk': 'metadata',
    'name': 'John Author',
    'bio': 'Award-winning author'
}

# Books by this author
{
    'pk': 'author#author123',
    'sk': 'book#book001',
    'title': 'Great Book',
    'publishedDate': '2024-01-15'
}

{
    'pk': 'author#author123',
    'sk': 'book#book002',
    'title': 'Another Book',
    'publishedDate': '2024-06-20'
}

# Single query gets author + all books
response = table.query(
    KeyConditionExpression=Key('pk').eq('author#author123')
)

# First item is author metadata
# Remaining items are books
```


### Backup and Restore Strategies

**Point-in-Time Recovery (PITR):**

```python
# backup_manager.py
import boto3
from datetime import datetime, timedelta

class DynamoDBBackupManager:
    def __init__(self, table_name):
        self.dynamodb = boto3.client('dynamodb')
        self.table_name = table_name
    
    def enable_pitr(self):
        """
        Enable point-in-time recovery
        Retains backups for 35 days
        """
        
        self.dynamodb.update_continuous_backups(
            TableName=self.table_name,
            PointInTimeRecoverySpecification={
                'PointInTimeRecoveryEnabled': True
            }
        )
        
        print(f"PITR enabled for {self.table_name}")
    
    def create_on_demand_backup(self, backup_name=None):
        """
        Create on-demand backup
        Retained until explicitly deleted
        """
        
        if not backup_name:
            backup_name = f"{self.table_name}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        
        response = self.dynamodb.create_backup(
            TableName=self.table_name,
            BackupName=backup_name
        )
        
        backup_arn = response['BackupDetails']['BackupArn']
        print(f"Backup created: {backup_arn}")
        
        return backup_arn
    
    def restore_from_pitr(self, target_table_name, restore_time=None):
        """
        Restore table to specific point in time
        """
        
        if not restore_time:
            # Restore to latest
            restore_time = datetime.utcnow()
        
        response = self.dynamodb.restore_table_to_point_in_time(
            SourceTableName=self.table_name,
            TargetTableName=target_table_name,
            RestoreDateTime=restore_time,
            UseLatestRestorableTime=restore_time is None
        )
        
        print(f"Restore initiated to {target_table_name}")
        
        # Wait for restore to complete
        waiter = self.dynamodb.get_waiter('table_exists')
        waiter.wait(TableName=target_table_name)
        
        print("Restore completed")
        
        return response['TableDescription']['TableArn']
    
    def restore_from_backup(self, backup_arn, target_table_name):
        """
        Restore table from on-demand backup
        """
        
        response = self.dynamodb.restore_table_from_backup(
            TargetTableName=target_table_name,
            BackupArn=backup_arn
        )
        
        print(f"Restore from backup initiated to {target_table_name}")
        
        return response['TableDescription']['TableArn']
    
    def list_backups(self, days_back=30):
        """
        List available backups
        """
        
        time_range_lower_bound = datetime.utcnow() - timedelta(days=days_back)
        
        response = self.dynamodb.list_backups(
            TableName=self.table_name,
            TimeRangeLowerBound=time_range_lower_bound
        )
        
        backups = response['BackupSummaries']
        
        print(f"Available backups for {self.table_name}:")
        for backup in backups:
            print(f"  {backup['BackupName']}: {backup['BackupCreationDateTime']}")
        
        return backups
    
    def delete_old_backups(self, retention_days=90):
        """
        Delete backups older than retention period
        """
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        backups = self.list_backups(days_back=365)
        deleted_count = 0
        
        for backup in backups:
            backup_date = backup['BackupCreationDateTime'].replace(tzinfo=None)
            
            if backup_date < cutoff_date:
                try:
                    self.dynamodb.delete_backup(
                        BackupArn=backup['BackupArn']
                    )
                    print(f"Deleted backup: {backup['BackupName']}")
                    deleted_count += 1
                except Exception as e:
                    print(f"Failed to delete {backup['BackupName']}: {e}")
        
        print(f"Deleted {deleted_count} old backups")
        
        return deleted_count

# Usage
backup_manager = DynamoDBBackupManager('Orders')

# Enable PITR
backup_manager.enable_pitr()

# Create on-demand backup before major change
backup_manager.create_on_demand_backup('pre-migration-backup')

# Restore to specific time (disaster recovery)
backup_manager.restore_from_pitr('Orders-Restored', restore_time=datetime(2025, 1, 15, 10, 30))

# Cleanup old backups
backup_manager.delete_old_backups(retention_days=90)
```


### Monitoring and Alerting

**Comprehensive Monitoring Setup:**

```python
# monitoring_setup.py
import boto3

def setup_dynamodb_monitoring(table_name):
    """
    Set up comprehensive CloudWatch alarms for DynamoDB table
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    alarms = [
        # Throttling alarms
        {
            'AlarmName': f'{table_name}-ReadThrottle',
            'MetricName': 'UserErrors',
            'Namespace': 'AWS/DynamoDB',
            'Statistic': 'Sum',
            'Period': 300,
            'EvaluationPeriods': 2,
            'Threshold': 10,
            'ComparisonOperator': 'GreaterThanThreshold',
            'Dimensions': [
                {'Name': 'TableName', 'Value': table_name}
            ],
            'AlarmDescription': 'Alert on read throttling'
        },
        # Consumed capacity alarms
        {
            'AlarmName': f'{table_name}-HighConsumedReadCapacity',
            'MetricName': 'ConsumedReadCapacityUnits',
            'Namespace': 'AWS/DynamoDB',
            'Statistic': 'Sum',
            'Period': 300,
            'EvaluationPeriods': 2,
            'Threshold': 8000,  # 80% of provisioned
            'ComparisonOperator': 'GreaterThanThreshold',
            'Dimensions': [
                {'Name': 'TableName', 'Value': table_name}
            ],
            'AlarmDescription': 'Alert on high read capacity usage'
        },
        # System errors
        {
            'AlarmName': f'{table_name}-SystemErrors',
            'MetricName': 'SystemErrors',
            'Namespace': 'AWS/DynamoDB',
            'Statistic': 'Sum',
            'Period': 300,
            'EvaluationPeriods': 1,
            'Threshold': 1,
            'ComparisonOperator': 'GreaterThanThreshold',
            'Dimensions': [
                {'Name': 'TableName', 'Value': table_name}
            ],
            'AlarmDescription': 'Alert on DynamoDB system errors'
        },
        # Latency
        {
            'AlarmName': f'{table_name}-HighGetItemLatency',
            'MetricName': 'SuccessfulRequestLatency',
            'Namespace': 'AWS/DynamoDB',
            'Statistic': 'Average',
            'Period': 300,
            'EvaluationPeriods': 2,
            'Threshold': 50,  # 50ms
            'ComparisonOperator': 'GreaterThanThreshold',
            'Dimensions': [
                {'Name': 'TableName', 'Value': table_name},
                {'Name': 'Operation', 'Value': 'GetItem'}
            ],
            'AlarmDescription': 'Alert on high GetItem latency'
        }
    ]
    
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")

# Custom metrics
def publish_custom_metrics(table_name, operation_type, duration_ms, item_size_kb):
    """
    Publish custom application metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    cloudwatch.put_metric_data(
        Namespace='CustomApp/DynamoDB',
        MetricData=[
            {
                'MetricName': 'OperationDuration',
                'Value': duration_ms,
                'Unit': 'Milliseconds',
                'Dimensions': [
                    {'Name': 'TableName', 'Value': table_name},
                    {'Name': 'Operation', 'Value': operation_type}
                ]
            },
            {
                'MetricName': 'ItemSize',
                'Value': item_size_kb,
                'Unit': 'Kilobytes',
                'Dimensions': [
                    {'Name': 'TableName', 'Value': table_name}
                ]
            }
        ]
    )

# Usage
setup_dynamodb_monitoring('Orders')
```


### Cost Optimization

**Cost Analysis and Optimization:**

```python
# cost_optimizer.py
import boto3
from datetime import datetime, timedelta

class DynamoDBCostOptimizer:
    def __init__(self, table_name):
        self.dynamodb = boto3.client('dynamodb')
        self.cloudwatch = boto3.client('cloudwatch')
        self.ce = boto3.client('ce')  # Cost Explorer
        self.table_name = table_name
    
    def analyze_capacity_utilization(self, days=7):
        """
        Analyze capacity utilization to identify over-provisioning
        """
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        # Get consumed capacity
        consumed_read = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/DynamoDB',
            MetricName='ConsumedReadCapacityUnits',
            Dimensions=[{'Name': 'TableName', 'Value': self.table_name}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average', 'Maximum']
        )
        
        consumed_write = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/DynamoDB',
            MetricName='ConsumedWriteCapacityUnits',
            Dimensions=[{'Name': 'TableName', 'Value': self.table_name}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average', 'Maximum']
        )
        
        # Get provisioned capacity
        table_desc = self.dynamodb.describe_table(TableName=self.table_name)
        
        if table_desc['Table']['BillingModeSummary']['BillingMode'] == 'PROVISIONED':
            provisioned_read = table_desc['Table']['ProvisionedThroughput']['ReadCapacityUnits']
            provisioned_write = table_desc['Table']['ProvisionedThroughput']['WriteCapacityUnits']
            
            # Calculate utilization
            avg_read_consumed = sum(d['Average'] for d in consumed_read['Datapoints']) / len(consumed_read['Datapoints'])
            max_read_consumed = max(d['Maximum'] for d in consumed_read['Datapoints'])
            
            avg_write_consumed = sum(d['Average'] for d in consumed_write['Datapoints']) / len(consumed_write['Datapoints'])
            max_write_consumed = max(d['Maximum'] for d in consumed_write['Datapoints'])
            
            read_utilization = (avg_read_consumed / provisioned_read) * 100
            write_utilization = (avg_write_consumed / provisioned_write) * 100
            
            analysis = {
                'billing_mode': 'PROVISIONED',
                'read': {
                    'provisioned': provisioned_read,
                    'avg_consumed': round(avg_read_consumed, 2),
                    'max_consumed': round(max_read_consumed, 2),
                    'utilization_pct': round(read_utilization, 1)
                },
                'write': {
                    'provisioned': provisioned_write,
                    'avg_consumed': round(avg_write_consumed, 2),
                    'max_consumed': round(max_write_consumed, 2),
                    'utilization_pct': round(write_utilization, 1)
                }
            }
            
            # Recommendations
            recommendations = []
            
            if read_utilization < 30:
                recommended_read = int(max_read_consumed * 1.2)  # 20% buffer
                savings = (provisioned_read - recommended_read) * 0.00013 * 730  # Monthly
                recommendations.append({
                    'type': 'REDUCE_READ_CAPACITY',
                    'current': provisioned_read,
                    'recommended': recommended_read,
                    'monthly_savings': round(savings, 2)
                })
            
            if write_utilization < 30:
                recommended_write = int(max_write_consumed * 1.2)
                savings = (provisioned_write - recommended_write) * 0.00065 * 730
                recommendations.append({
                    'type': 'REDUCE_WRITE_CAPACITY',
                    'current': provisioned_write,
                    'recommended': recommended_write,
                    'monthly_savings': round(savings, 2)
                })
            
            # Consider on-demand if highly variable
            if max_read_consumed > avg_read_consumed * 3:
                recommendations.append({
                    'type': 'CONSIDER_ON_DEMAND',
                    'reason': 'Highly variable read traffic',
                    'read_variability': round(max_read_consumed / avg_read_consumed, 2)
                })
            
            analysis['recommendations'] = recommendations
            
            return analysis
        
        else:
            return {'billing_mode': 'ON_DEMAND', 'analysis': 'On-demand mode active'}
    
    def estimate_monthly_cost(self):
        """
        Estimate monthly cost based on usage
        """
        
        table_desc = self.dynamodb.describe_table(TableName=self.table_name)
        table = table_desc['Table']
        
        # Storage cost
        table_size_gb = table['TableSizeBytes'] / (1024**3)
        storage_cost = table_size_gb * 0.25  # $0.25/GB/month
        
        if table['BillingModeSummary']['BillingMode'] == 'PROVISIONED':
            # Provisioned capacity cost
            read_capacity = table['ProvisionedThroughput']['ReadCapacityUnits']
            write_capacity = table['ProvisionedThroughput']['WriteCapacityUnits']
            
            # Hours in month
            hours = 730
            
            read_cost = read_capacity * 0.00013 * hours
            write_cost = write_capacity * 0.00065 * hours
            
            total = storage_cost + read_cost + write_cost
            
            return {
                'billing_mode': 'PROVISIONED',
                'storage_cost': round(storage_cost, 2),
                'read_capacity_cost': round(read_cost, 2),
                'write_capacity_cost': round(write_cost, 2),
                'total_monthly_cost': round(total, 2)
            }
        
        else:
            # On-demand cost estimation (based on recent usage)
            # Would need to query CloudWatch for actual request counts
            return {
                'billing_mode': 'ON_DEMAND',
                'storage_cost': round(storage_cost, 2),
                'note': 'Request costs vary by usage'
            }
    
    def recommend_billing_mode(self, days=30):
        """
        Recommend optimal billing mode
        """
        
        utilization = self.analyze_capacity_utilization(days)
        
        if utilization['billing_mode'] == 'ON_DEMAND':
            return {'current': 'ON_DEMAND', 'recommendation': 'Already on-demand'}
        
        # Calculate costs for both modes
        current_cost = self.estimate_monthly_cost()
        
        # Estimate on-demand cost (rough approximation)
        avg_reads = utilization['read']['avg_consumed'] * 3600 * 730  # Per month
        avg_writes = utilization['write']['avg_consumed'] * 3600 * 730
        
        on_demand_read_cost = (avg_reads / 1000000) * 0.25
        on_demand_write_cost = (avg_writes / 1000000) * 1.25
        on_demand_total = current_cost['storage_cost'] + on_demand_read_cost + on_demand_write_cost
        
        comparison = {
            'current_mode': 'PROVISIONED',
            'current_cost': current_cost['total_monthly_cost'],
            'on_demand_estimated_cost': round(on_demand_total, 2),
            'savings': round(current_cost['total_monthly_cost'] - on_demand_total, 2)
        }
        
        if on_demand_total < current_cost['total_monthly_cost']:
            comparison['recommendation'] = 'SWITCH_TO_ON_DEMAND'
        else:
            comparison['recommendation'] = 'STAY_PROVISIONED'
        
        return comparison

# Usage
optimizer = DynamoDBCostOptimizer('Orders')

# Analyze utilization
analysis = optimizer.analyze_capacity_utilization(days=7)
print(f"Read utilization: {analysis['read']['utilization_pct']}%")
print(f"Write utilization: {analysis['write']['utilization_pct']}%")

if analysis['recommendations']:
    print("\nRecommendations:")
    for rec in analysis['recommendations']:
        print(f"  {rec['type']}: Save ${rec.get('monthly_savings', 0)}/month")

# Get cost estimate
cost = optimizer.estimate_monthly_cost()
print(f"\nEstimated monthly cost: ${cost['total_monthly_cost']}")

# Billing mode recommendation
recommendation = optimizer.recommend_billing_mode()
print(f"\nRecommendation: {recommendation['recommendation']}")
```


## Tips \& Best Practices

### Key Design Tips

**Tip 1: Design for Access Patterns First**

```
WRONG approach:
1. Design normalized schema
2. Try to query it
3. Realize queries don't work

RIGHT approach:
1. List all access patterns
2. Design keys to support patterns
3. Denormalize as needed
4. Validate design supports all patterns

Example access patterns:
- Get user by userId
- Get all orders for user
- Get order by orderId
- Get pending orders across all users
- Get orders in date range for user

Each pattern determines key or index design
```

**Tip 2: Use Composite Sort Keys**

```python
# Hierarchical sort key enables multiple query patterns

# Pattern: type#id#timestamp
item = {
    'pk': 'customer123',
    'sk': 'order#order456#2025-01-15T10:30:00Z',
    'orderTotal': 299.99
}

# Enables queries:
# - All orders: begins_with('order#')
# - Specific order: begins_with('order#order456#')
# - Orders in date range: between('order#order456#2025-01-01', 'order#order456#2025-01-31')
```

**Tip 3: Avoid Hot Partitions**

```python
# BAD: Low cardinality partition key
{
    'status': 'active',  # Only 3-4 values (hot partition!)
    'userId': 'user123'
}

# GOOD: High cardinality partition key
{
    'userId': 'user123',  # Millions of unique values
    'status': 'active'
}

# Rule: Partition key should evenly distribute data and access
```


### Query Optimization Tips

**Tip 4: Use Projection in GSIs**

```python
# Reduce index size and cost with projections

# Include only needed attributes
GlobalSecondaryIndex={
    'IndexName': 'EmailIndex',
    'KeySchema': [{'AttributeName': 'email', 'KeyType': 'HASH'}],
    'Projection': {
        'ProjectionType': 'INCLUDE',
        'NonKeyAttributes': ['name', 'phone']  # Only these + keys
    }
}

# vs ProjectionType='ALL' which copies all attributes (more expensive)
```

**Tip 5: Batch Operations for Efficiency**

```python
# Use batch operations to reduce API calls

# BAD: Individual writes (25 API calls)
for item in items:
    table.put_item(Item=item)

# GOOD: Batch write (1-2 API calls for 25 items)
with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)

# Batch get
response = dynamodb_client.batch_get_item(
    RequestItems={
        'Users': {
            'Keys': [{'userId': 'user1'}, {'userId': 'user2'}, ...],
            'ConsistentRead': True
        }
    }
)
```

**Tip 6: Use Filter Expressions Carefully**

```python
# Filter expressions applied AFTER reading items (still consume capacity)

# Less efficient: Query 100 items, filter to 10 (charged for 100)
response = table.query(
    KeyConditionExpression=Key('pk').eq('customer123'),
    FilterExpression=Attr('status').eq('pending')  # Applied after read
)

# More efficient: Design key/index to avoid filtering
# Use GSI with status as part of key
response = table.query(
    IndexName='CustomerStatusIndex',
    KeyConditionExpression=Key('pk').eq('customer123') & Key('status').eq('pending')
)
```


### Capacity Planning Tips

**Tip 7: Start with On-Demand**

```
For new applications:
1. Start with on-demand billing
2. Monitor usage for 30 days
3. Analyze patterns
4. Switch to provisioned if cost-effective

On-demand benefits:
- No capacity planning needed
- Handles spikes automatically
- Pay only for what you use

Switch to provisioned when:
- Traffic patterns predictable
- Steady baseline load
- Can save 30%+ vs on-demand
```

**Tip 8: Use Auto Scaling**

```bash
# Always enable auto scaling for provisioned capacity

aws application-autoscaling register-scalable-target \
    --service-namespace dynamodb \
    --resource-id table/MyTable \
    --scalable-dimension dynamodb:table:WriteCapacityUnits \
    --min-capacity 5 \
    --max-capacity 100

aws application-autoscaling put-scaling-policy \
    --policy-name MyScalingPolicy \
    --service-namespace dynamodb \
    --resource-id table/MyTable \
    --scalable-dimension dynamodb:table:WriteCapacityUnits \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
        "TargetValue": 70.0,
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
        },
        "ScaleOutCooldown": 60,
        "ScaleInCooldown": 300
    }'
```


### Monitoring Tips

**Tip 9: Monitor Throttling**

```python
# Set up alerts for throttling events

cloudwatch.put_metric_alarm(
    AlarmName='DynamoDB-Throttling',
    MetricName='UserErrors',
    Namespace='AWS/DynamoDB',
    Statistic='Sum',
    Period=300,
    EvaluationPeriods=1,
    Threshold=10,
    ComparisonOperator='GreaterThanThreshold',
    Dimensions=[{'Name': 'TableName', 'Value': 'Orders'}],
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:alerts']
)

# Throttling indicates:
# - Provisioned capacity too low
# - Hot partition issue
# - Burst capacity depleted
```

**Tip 10: Use CloudWatch Contributor Insights**

```bash
# Identify hot keys and partition key skew

aws dynamodb put-resource-policy \
    --resource-arn arn:aws:dynamodb:us-east-1:123456789012:table/Orders \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "contributorinsights.amazonaws.com"},
            "Action": "dynamodb:DescribeContributorInsights",
            "Resource": "*"
        }]
    }'

aws dynamodb describe-contributor-insights \
    --table-name Orders

# Shows:
# - Most accessed partition keys
# - Most throttled keys
# - Request distribution
```


## Pitfalls \& Remedies

### Pitfall 1: Hot Partition Problem

**Problem:** Uneven data distribution or access patterns causing throttling on specific partitions.

**Why It Happens:**

- Low cardinality partition key (e.g., status with only 3 values)
- Sequential keys (e.g., timestamp as partition key)
- Celebrity/popular item problem (one item accessed heavily)
- Uneven access patterns

**Impact:**

- Throttling despite having available capacity
- Poor performance for affected requests
- Wasted provisioned capacity on idle partitions
- Application errors

**Example:**

```python
# BAD DESIGN: Hot partition
{
    'date': '2025-01-15',  # Same value for all today's items (hot!)
    'timestamp': '10:30:00',
    'data': '...'
}

# All today's writes go to same partition
# Partition capacity: 1000 WCU
# Total table capacity: 10,000 WCU (10 partitions)
# Result: Can only use 1000 WCU despite provisioning 10,000
```

**Remedy:**

**Step 1: Identify Hot Partitions**

```python
# Use CloudWatch Contributor Insights
import boto3

def identify_hot_keys(table_name):
    """
    Identify frequently accessed partition keys
    """
    
    dynamodb = boto3.client('dynamodb')
    
    # Enable Contributor Insights
    dynamodb.update_contributor_insights(
        TableName=table_name,
        ContributorInsightsAction='ENABLE'
    )
    
    # Wait and query insights
    import time
    time.sleep(300)  # Wait 5 minutes for data
    
    response = dynamodb.describe_contributor_insights(
        TableName=table_name
    )
    
    # View top contributors in CloudWatch Console
    print("Check CloudWatch Contributor Insights for hot keys")

# Analyze access patterns
def analyze_access_distribution():
    """
    Analyze how evenly requests are distributed
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get consumed capacity per partition (approximation)
    # If throttling occurs with available capacity, likely hot partition
    
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/DynamoDB',
        MetricName='UserErrors',
        Dimensions=[{'Name': 'TableName', 'Value': 'Orders'}],
        StartTime=datetime.utcnow() - timedelta(hours=1),
        EndTime=datetime.utcnow(),
        Period=300,
        Statistics=['Sum']
    )
    
    throttle_count = sum(d['Sum'] for d in response['Datapoints'])
    
    if throttle_count > 0:
        print(f"⚠️  Throttling detected: {throttle_count} errors in last hour")
        print("Likely causes:")
        print("  1. Hot partition (uneven distribution)")
        print("  2. Insufficient capacity")
        print("  3. Burst capacity depleted")
```

**Step 2: Redesign Partition Key**

```python
# Add write sharding to distribute load

# BEFORE: Hot partition
{
    'date': '2025-01-15',  # All today's items on same partition
    'eventId': 'event123',
    'data': '...'
}

# AFTER: Sharded partition key
import hashlib

def create_sharded_item(date, event_id, data, num_shards=10):
    """
    Add shard suffix to partition key
    """
    
    # Calculate shard based on event_id
    shard = int(hashlib.md5(event_id.encode()).hexdigest(), 16) % num_shards
    
    item = {
        'pk': f"{date}#{shard}",  # date#0 through date#9
        'sk': event_id,
        'data': data
    }
    
    return item

# Query across shards
def query_date_events(date, num_shards=10):
    """
    Query all shards for a date
    """
    
    all_results = []
    
    for shard in range(num_shards):
        pk = f"{date}#{shard}"
        response = table.query(
            KeyConditionExpression=Key('pk').eq(pk)
        )
        all_results.extend(response['Items'])
    
    return all_results

# Result: 10x capacity (10 partitions instead of 1)
```

**Step 3: Use GSI for Alternative Access**

```python
# If existing design has hot partition, add GSI with better distribution

# Base table (hot partition on date)
{
    'date': '2025-01-15',  # Hot partition
    'eventId': 'event123',
    'userId': 'user456',
    'data': '...'
}

# Add GSI with userId as partition key
GlobalSecondaryIndex={
    'IndexName': 'UserEventsIndex',
    'KeySchema': [
        {'AttributeName': 'userId', 'KeyType': 'HASH'},  # Well-distributed
        {'AttributeName': 'date', 'KeyType': 'RANGE'}
    ],
    'Projection': {'ProjectionType': 'ALL'}
}

# Query user's events (no hot partition)
response = table.query(
    IndexName='UserEventsIndex',
    KeyConditionExpression=Key('userId').eq('user456')
)
```

**Prevention:**

- Design partition keys with high cardinality
- Use write sharding for time-series data
- Monitor access patterns with Contributor Insights
- Test at scale before production
- Use composite keys to distribute load

***

### Pitfall 2: Inefficient Scan Operations

**Problem:** Using Scan operations on large tables causing slow performance and high costs.

**Why It Happens:**

- Not understanding difference between Query and Scan
- Missing appropriate indexes
- Attempting to filter entire table
- Legacy SQL mindset ("SELECT * WHERE...")

**Impact:**

- Slow queries (seconds to minutes)
- High cost (charged for all items scanned)
- Consumed capacity affects other operations
- Poor user experience

**Remedy:**

**Step 1: Replace Scans with Queries**

```python
# BAD: Scan entire table
response = table.scan(
    FilterExpression=Attr('status').eq('active')
)
# Scans ALL items, then filters (expensive, slow)

# GOOD: Query with proper key design
response = table.query(
    IndexName='StatusIndex',
    KeyConditionExpression=Key('status').eq('active')
)
# Only reads items with status='active' (fast, cheap)
```

**Step 2: Add Secondary Index**

```python
# If queries need filtering, add GSI

# Current table (no index on status)
{
    'userId': 'user123',  # Partition key
    'timestamp': '2025-01-15',  # Sort key
    'status': 'active',
    'data': '...'
}

# Add GSI for status queries
aws dynamodb update-table \
    --table-name Users \
    --attribute-definitions AttributeName=status,AttributeType=S \
    --global-secondary-index-updates '[{
        "Create": {
            "IndexName": "StatusIndex",
            "KeySchema": [
                {"AttributeName": "status", "KeyType": "HASH"}
            ],
            "Projection": {"ProjectionType": "ALL"},
            "ProvisionedThroughput": {
                "ReadCapacityUnits": 5,
                "WriteCapacityUnits": 5
            }
        }
    }]'
```

**Step 3: Parallel Scan for Necessary Scans**

```python
# If Scan is absolutely necessary, use parallel scan

def parallel_scan(table_name, segments=10):
    """
    Perform parallel scan across segments
    """
    
    from concurrent.futures import ThreadPoolExecutor
    
    def scan_segment(segment):
        """Scan single segment"""
        items = []
        
        response = table.scan(
            TotalSegments=segments,
            Segment=segment
        )
        
        items.extend(response['Items'])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                TotalSegments=segments,
                Segment=segment,
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response['Items'])
        
        return items
    
    # Scan segments in parallel
    with ThreadPoolExecutor(max_workers=segments) as executor:
        results = list(executor.map(scan_segment, range(segments)))
    
    # Combine results
    all_items = []
    for segment_items in results:
        all_items.extend(segment_items)
    
    return all_items

# 10x faster than sequential scan
items = parallel_scan('Users', segments=10)
```

**Prevention:**

- Design indexes to support all query patterns
- Avoid Scan operations in production code
- Use Query with KeyConditionExpression
- Test with production-scale data
- Monitor ScanCount metric

***

### Pitfall 3: Exceeding Item Size Limit

**Problem:** Items exceeding 400 KB size limit causing write failures.

**Why It Happens:**

- Storing large documents/files in items
- Not understanding item size calculation
- Denormalizing too much data
- Adding many attributes over time

**Impact:**

- Write operations fail
- Cannot store necessary data
- Need to redesign data model
- Application errors

**Item Size Calculation:**

```
Item size = Sum of:
- Attribute name lengths
- Attribute value sizes
- Binary data sizes

Example:
{
    'userId': 'user123',  # 6 + 7 = 13 bytes
    'name': 'John Doe',   # 4 + 8 = 12 bytes
    'email': 'john@example.com',  # 5 + 17 = 22 bytes
    'profile': '<large JSON>'  # 7 + JSON size
}

Max item size: 400 KB
```

**Remedy:**

**Step 1: Store Large Data in S3**

```python
# Store large attributes in S3, reference in DynamoDB

import boto3
import json

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

def store_large_profile(user_id, profile_data):
    """
    Store large profile in S3, reference in DynamoDB
    """
    
    # Upload to S3
    s3_key = f"profiles/{user_id}.json"
    s3.put_object(
        Bucket='user-profiles',
        Key=s3_key,
        Body=json.dumps(profile_data),
        ContentType='application/json'
    )
    
    # Store reference in DynamoDB
    table.put_item(Item={
        'userId': user_id,
        'name': profile_data['name'],
        'email': profile_data['email'],
        'profileS3Key': s3_key,  # Reference to S3
        'profileSize': len(json.dumps(profile_data))
    })

def get_user_with_profile(user_id):
    """
    Retrieve user and fetch profile from S3
    """
    
    # Get user from DynamoDB
    response = table.get_item(Key={'userId': user_id})
    user = response['Item']
    
    # Fetch profile from S3
    if 'profileS3Key' in user:
        profile = s3.get_object(
            Bucket='user-profiles',
            Key=user['profileS3Key']
        )
        user['profile'] = json.loads(profile['Body'].read())
    
    return user
```

**Step 2: Compress Data**

```python
# Compress large text data

import gzip
import base64

def compress_attribute(data):
    """Compress large text data"""
    
    compressed = gzip.compress(data.encode('utf-8'))
    encoded = base64.b64encode(compressed).decode('utf-8')
    
    return encoded

def decompress_attribute(compressed_data):
    """Decompress data"""
    
    decoded = base64.b64decode(compressed_data)
    decompressed = gzip.decompress(decoded)
    
    return decompressed.decode('utf-8')

# Store compressed data
large_text = "..." * 10000  # Large text
compressed = compress_attribute(large_text)

table.put_item(Item={
    'id': 'item123',
    'data_compressed': compressed,
    'compressed': True
})

# Retrieve and decompress
response = table.get_item(Key={'id': 'item123'})
if response['Item']['compressed']:
    data = decompress_attribute(response['Item']['data_compressed'])
```

**Step 3: Split Large Items**

```python
# Split single large item into multiple items

def store_large_document(doc_id, document):
    """
    Split large document across multiple items
    """
    
    chunk_size = 300 * 1024  # 300 KB chunks (below 400 KB limit)
    doc_json = json.dumps(document)
    
    # Split into chunks
    chunks = [doc_json[i:i+chunk_size] for i in range(0, len(doc_json), chunk_size)]
    
    # Store chunks
    with table.batch_writer() as batch:
        for i, chunk in enumerate(chunks):
            batch.put_item(Item={
                'pk': doc_id,
                'sk': f'chunk#{i:03d}',
                'data': chunk,
                'totalChunks': len(chunks)
            })

def retrieve_large_document(doc_id):
    """
    Retrieve and reassemble document
    """
    
    # Query all chunks
    response = table.query(
        KeyConditionExpression=Key('pk').eq(doc_id) & Key('sk').begins_with('chunk#')
    )
    
    # Sort and reassemble
    chunks = sorted(response['Items'], key=lambda x: x['sk'])
    full_doc = ''.join(chunk['data'] for chunk in chunks)
    
    return json.loads(full_doc)
```

**Prevention:**

- Monitor item sizes during development
- Store large objects in S3
- Compress text data
- Design data model with size limits in mind
- Use projections to reduce index sizes

***

## Chapter Summary

Amazon DynamoDB provides serverless NoSQL database capabilities with single-digit millisecond performance at any scale. Understanding key design, secondary indexes, capacity modes, streams, and global tables is essential for building high-performance applications. Proper partition key design prevents hot partitions, appropriate indexes eliminate expensive scans, and capacity planning optimizes costs. DynamoDB excels at web-scale applications requiring predictable low-latency access patterns.

**Key Takeaways:**

- **Design keys for access patterns:** List all patterns first, then design keys and indexes to support them efficiently
- **Avoid hot partitions:** Use high cardinality partition keys, shard time-series data, monitor with Contributor Insights
- **Choose right capacity mode:** On-demand for variable traffic, provisioned with auto-scaling for predictable loads
- **Use indexes wisely:** GSI for different keys (eventual consistency), LSI for same partition (strong consistency)
- **Leverage streams:** Enable event-driven architectures, aggregations, replication, and audit trails
- **Monitor throttling:** Set up CloudWatch alarms, analyze access patterns, optimize before production
- **Optimize costs:** Right-size capacity, use projections, clean up unused indexes, consider on-demand

Understanding DynamoDB deeply enables you to build applications that scale from zero to millions of requests per second while maintaining consistent performance and controlling costs.

## Review Questions

1. **Maximum DynamoDB item size?**
a) 64 KB
b) 400 KB
c) 4 MB
d) No limit

**Answer: B** - Maximum item size is 400 KB.

2. **Which provides strong consistency?**
a) GSI reads
b) LSI reads
c) Eventual consistent reads
d) Cross-region reads

**Answer: B** - LSI supports strong consistency; GSI only eventual consistency.

3. **DynamoDB read capacity unit (RCU) provides:**
a) 1 strongly consistent read/sec up to 4 KB
b) 2 eventually consistent reads/sec up to 4 KB
c) Both A and B
d) Neither A nor B

**Answer: C** - 1 RCU = 1 strong consistent OR 2 eventual consistent reads/sec (4 KB).

4. **Maximum number of GSIs per table?**
a) 5
b) 10
c) 20
d) Unlimited

**Answer: C** - Maximum 20 GSIs per table.

5. **When must LSI be created?**
a) Anytime
b) At table creation only
c) Before adding data
d) After table creation

**Answer: B** - LSI must be created when table is created (cannot add later).

6. **DynamoDB Stream retention period?**
a) 6 hours
b) 24 hours
c) 7 days
d) 30 days

**Answer: B** - Stream records retained for 24 hours.

7. **Global Tables replication is:**
a) Synchronous
b) Asynchronous
c) Manual
d) Not supported

**Answer: B** - Global Tables use asynchronous replication (typically sub-second).

8. **DAX provides what latency improvement?**
a) 2x faster
b) 5x faster
c) 10x+ faster (ms to µs)
d) No improvement

**Answer: C** - DAX reduces latency from milliseconds to microseconds (10x+ improvement).

9. **On-demand billing charges per:**
a) Hour
b) Request
c) GB stored
d) Both B and C

**Answer: D** - On-demand charges per request AND per GB stored.

10. **Point-in-time recovery retains backups for:**
a) 7 days
b) 35 days
c) 90 days
d) 1 year

**Answer: B** - PITR retains backups for 35 days.

11. **Which causes hot partition?**
a) High cardinality partition key
b) Low cardinality partition key
c) Many GSIs
d) Large items

**Answer: B** - Low cardinality (few unique values) causes hot partitions.

12. **Write capacity unit (WCU) supports:**
a) 1 write/sec up to 1 KB
b) 1 write/sec up to 4 KB
c) 2 writes/sec up to 1 KB
d) 1 write/sec up to 10 KB

**Answer: A** - 1 WCU = 1 write/sec for item up to 1 KB.

13. **Scan operation:**
a) Reads specific items
b) Reads all items in table
c) Reads items matching key
d) Reads items from index only

**Answer: B** - Scan reads entire table (all items), then filters.

14. **TTL deletions are:**
a) Immediate
b) Within minutes
c) Within 48 hours
d) Manual only

**Answer: C** - TTL deletes items within 48 hours of expiration.

15. **Best partition key characteristic?**
a) Low cardinality
b) Sequential values
c) High cardinality with even access
d) Rarely accessed

**Answer: C** - High cardinality with even access distribution is ideal.

***

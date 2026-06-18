# Chapitre 12 : DynamoDB

##Présentation

Amazon DynamoDB est le service de base de données NoSQL phare d'AWS, conçu pour offrir des performances à un chiffre en millisecondes à n'importe quelle échelle. Contrairement aux bases de données relationnelles traditionnelles qui ont du mal à évoluer à grande échelle, DynamoDB offre des performances constantes, que vous stockiez des gigaoctets ou des pétaoctets, en traitant des centaines ou des millions de requêtes par seconde. Cette base de données sans serveur évolue automatiquement, se réplique sur plusieurs zones de disponibilité et fournit une sécurité, une sauvegarde et une réplication globale intégrées, le tout sans gérer de serveurs, de clusters ou d'infrastructure.

DynamoDB représente un changement fondamental dans la philosophie de conception de bases de données. Au lieu de normaliser les données et d'effectuer des jointures complexes au moment de la requête, comme les bases de données SQL, DynamoDB vous oblige à concevoir votre modèle de données autour de vos modèles d'accès. Il est essentiel de comprendre les clés de partition, les clés de tri, les index secondaires et les modèles de requête : une mauvaise conception des clés entraîne des partitions à chaud, des limitations et des échecs de requêtes. Cependant, une conception appropriée offre des performances et une évolutivité inégalées, faisant de DynamoDB la base de données de choix pour les applications nécessitant un accès prévisible et à faible latence à grande échelle.

La différence entre DynamoDB et les bases de données relationnelles va au-delà des seules performances. DynamoDB est flexible en termes de schéma, vous permettant de stocker différents attributs dans différents éléments. Il propose deux modèles de cohérence (éventuel et fort) vous permettant d'échanger la cohérence contre une latence plus faible, le cas échéant. Les flux DynamoDB permettent des architectures basées sur les événements, déclenchant des fonctions Lambda à chaque modification de données. Les tables globales répliquent les données dans plusieurs régions avec une latence inférieure à la seconde. DynamoDB Accelerator (DAX) fournit une mise en cache en microsecondes. Ces capacités rendent DynamoDB idéal pour les classements de jeux, la télémétrie IoT, les backends mobiles, les paniers de commerce électronique et toute application nécessitant une évolutivité extrême.

Ce chapitre fournit une couverture complète de DynamoDB, des principes fondamentaux aux modèles de production. Vous apprendrez les principes de modélisation des données, les stratégies de conception clés, les index secondaires, les modes de capacité, les flux DynamoDB, les tables globales, DAX, la sauvegarde et la restauration, la surveillance et le dépannage, ainsi que l'optimisation des coûts. Que vous créiez une nouvelle application ou que vous migraciez à partir d'une autre base de données, la maîtrise de DynamoDB est essentielle pour les applications nécessitant évolutivité, vitesse et simplicité.

## Théorie \&Concepts

### Principes fondamentaux de DynamoDB

**Qu'est-ce que DynamoDB ?**

DynamoDB est un service de base de données NoSQL entièrement géré fournissant :

- **Performances rapides :** Latence à un chiffre en millisecondes à n'importe quelle échelle
- **Évolutivité :** Stockage illimité, mise à l'échelle automatique
- **Haute disponibilité :** Réplication sur 3 AZ, SLA de 99,99 %
- **Sans serveur :** Aucun serveur à gérer, paiement par requête ou débit
- **Schéma flexible :** Stockez différents attributs par élément
- **Réplication globale :** Réplication active-active multirégionale

**Concepts de base :**
```
Table: Collection of items (like a SQL table, but without fixed schema)
├── Item: Individual record (like a SQL row)
│   └── Attributes: Key-value pairs (like SQL columns)
├── Primary Key: Uniquely identifies each item
│   ├── Partition Key: Required, determines data distribution
│   └── Sort Key: Optional, enables range queries
└── Secondary Indexes: Alternative access patterns
```
**DynamoDB vs bases de données relationnelles :**


| Fonctionnalité | DynamoDB | Bases de données SQL |
| :-- | :-- | :-- |
| **Modèle de données** | Valeur-clé, document | Tables relationnelles |
| **Schéma** | Flexible, par article | Schéma fixe |
| **Requêtes** | Par clé ou index | SQL avec jointures |
| **Rejoint** | Non pris en charge (dénormaliser) | Pris en charge |
| **Mise à l'échelle** | Horizontale, automatique | Verticale, manuelle |
| **Cohérence** | Éventuel ou fort | Fort (ACIDE) |
| **Performances** | Cohérent, ms latence | Variable avec échelle |
| **Cas d'utilisation** | Échelle Web, jeux, IoT | Requêtes complexes, transactions |

### Clés primaires

La clé primaire est la décision de conception la plus critique dans DynamoDB.

**Deux types :**

**1. Clé de partition uniquement (clé primaire simple) :**
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
**2. Clé de partition + clé de tri (clé primaire composite) :**
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
**Principes de conception des clés de partition :**
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
**Calcul de la clé de partition :**
```
DynamoDB uses partition key to determine physical partition:

Partition = hash(partition_key) mod number_of_partitions

Example with 4 partitions:
- hash("user123") → 42 → 42 mod 4 = 2 → Partition 2
- hash("user456") → 17 → 17 mod 4 = 1 → Partition 1
- hash("user789") → 98 → 98 mod 4 = 2 → Partition 2

Even distribution critical for performance
```
### Index secondaires

Les index secondaires fournissent des modèles d'accès alternatifs au-delà de la clé primaire.

**Deux types :**

**1. Indice secondaire mondial (GSI) :**
```
- Different partition key and/or sort key
- Spans all table partitions
- Has own provisioned capacity (separate from table)
- Eventually consistent reads only
- Can be created/deleted at any time
- Sparse: Only contains items with index key attributes
```
**Exemple:**
```
Base Table:
PK: userId | SK: gameId | score | timestamp

GSI: GameLeaderboard
PK: gameId | SK: score | userId | timestamp

Use case: Get top scores for a game
Query: GSI with gameId = "game1", sort by score DESC
```
**2. Indice secondaire local (LSI) :**
```
- Same partition key as table, different sort key
- Shares table partitions
- Shares table capacity
- Supports strong consistency
- Must be created at table creation (cannot add later)
- Not sparse: Contains all items from partition
```
**Exemple:**
```
Base Table:
PK: customerId | SK: orderDate | orderId | status | total

LSI: OrderByStatus
PK: customerId | SK: status | orderDate | orderId | total

Use case: Get all pending orders for customer
Query: LSI with customerId = "cust123", SK = "pending"
```
**Comparaison GSI et LSI :**


| Fonctionnalité | GSI | LSI |
| :-- | :-- | :-- |
| **Clé de partition** | Peut être différent | Doit être identique au tableau |
| **Clé de tri** | Peut être différent | Différent du tableau |
| **Capacité** | Séparé | Partagé avec la table |
| **Cohérence** | Éventuel seulement | Éventuel ou fort |
| **Création** | À tout moment | Création de table uniquement |
| **Limites** | 20 par table | 5 par table |
| **Parse** | Oui (uniquement les éléments avec clés) | Non (tous les éléments) |

**Stratégie de conception d'indice :**
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
### Modes de capacité

DynamoDB propose deux modes de capacité avec différents modèles de facturation.

**1. Capacité provisionnée :**
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
**Mise à l'échelle automatique :**
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
**2. Capacité à la demande :**
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
**Matrice de décision du mode de capacité :**
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
### Modèles de cohérence

DynamoDB propose deux modèles de cohérence de lecture.

**1. Lectures finalement cohérentes (par défaut) :**
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
**2. Lectures fortement cohérentes :**
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
**Exemple de cohérence :**
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
### Flux DynamoDB

Les flux capturent la séquence chronologique des modifications au niveau des éléments.

**Types d'affichage de flux :**
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
**Cas d'utilisation :**
```
1. Aggregation: Maintain counters, summaries
2. Replication: Sync to other systems (Elasticsearch, S3)
3. Notifications: Trigger alerts on changes
4. Audit: Log all modifications
5. Cross-region replication: Global Tables use streams
6. Event-driven architectures: Lambda triggers
```
**Traitement de flux avec Lambda :**
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
### Tableaux globaux

Les tables globales fournissent une réplication active-active multirégionale.

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
**Cas d'utilisation :**
```
1. Global applications: Low-latency access worldwide
2. Disaster recovery: Multi-region redundancy
3. Regulatory compliance: Data residency requirements
4. Business continuity: Regional failure protection
```
**Résolution des conflits :**
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
### Accélérateur DynamoDB (DAX)

DAX est un cache en mémoire pour DynamoDB offrant des temps de réponse en microsecondes.

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
**Cas d'utilisation :**
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
**Configuration DAX :**
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
## Implémentation pratique

### Atelier 1 : Création d'une table DynamoDB avec des index

**Objectif :** Concevoir et créer un tableau pour les commandes de commerce électronique avec des modèles d'accès efficaces.
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
**Exemples de requête :**
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
### Atelier 2 : Configuration des flux DynamoDB avec Lambda

**Objectif :** Traitez les modifications de table en temps réel à l'aide de Streams et Lambda.
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
**Activer Stream et Lambda Trigger :**
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
### Atelier 3 : Configurer des tables globales

**Objectif :** Configurer la réplication multirégion pour une application globale.
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
## Connaissances au niveau de la production

### Modèles de données de séries chronologiques

Les données de séries chronologiques (capteurs IoT, journaux, métriques) nécessitent des modèles de conception spéciaux dans DynamoDB.

**Modèle 1 : Clés de partition basées sur le temps**
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
**Modèle 2 : Partage d'écriture**
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
**Modèle 3 : TTL pour l'expiration automatique**
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
**Modèle 4 : Atténuation des partitions à chaud**
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
### Modèles de requête avancés

**Modèle de clé de tri composite :**
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
**Modèle d'index clairsemé :**
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
**Modèle un à plusieurs :**
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
### Stratégies de sauvegarde et de restauration

**Récupération ponctuelle (PITR) :**
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
### Surveillance et alerte

**Configuration de surveillance complète :**
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
### Optimisation des coûts

**Analyse et optimisation des coûts :**
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
## Conseils \& Bonnes pratiques

### Conseils de conception clés

**Astuce 1 : Concevez d'abord les modèles d'accès**
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
**Astuce 2 : Utilisez des clés de tri composites**
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
**Astuce 3 : évitez les partitions chaudes**
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
### Conseils d'optimisation des requêtes

**Astuce 4 : Utilisez la projection dans les GSI**
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
**Astuce 5 : Opérations par lots pour plus d'efficacité**
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
**Astuce 6 : Utilisez les expressions de filtre avec précaution**
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
### Conseils de planification des capacités

**Astuce 7 : Commencez par le service à la demande**
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
**Astuce 8 : Utilisez la mise à l'échelle automatique**
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
### Conseils de surveillance

**Astuce 9 : Limitation du moniteur**
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
**Astuce 10 : Utilisez CloudWatch Contributor Insights**
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
## Pièges \& Remèdes

### Piège 1 : problème de partition chaude

**Problème :** Distribution inégale des données ou modèles d'accès provoquant une limitation sur des partitions spécifiques.

**Pourquoi cela arrive :**

- Clé de partition à faible cardinalité (par exemple, statut avec seulement 3 valeurs)
- Clés séquentielles (par exemple, horodatage comme clé de partition)
- Problème de célébrité/objet populaire (un élément très consulté)
- Modèles d'accès inégaux

**Impact :**

- Limitation malgré la capacité disponible
- Mauvaises performances pour les requêtes concernées
- Capacité provisionnée gaspillée sur les partitions inactives
- Erreurs d'application

**Exemple :**
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
**Remède :**

**Étape 1 : Identifier les partitions chaudes**
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
**Étape 2 : Reconception de la clé de partition**
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
**Étape 3 : Utilisez GSI pour un accès alternatif**
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
**Prévention :**

- Concevoir des clés de partition avec une cardinalité élevée
- Utiliser le partitionnement en écriture pour les données de séries chronologiques
- Surveiller les modèles d'accès avec Contributor Insights
- Test à grande échelle avant production
- Utiliser des clés composites pour répartir la charge

***

### Piège 2 : Opérations d'analyse inefficaces

**Problème :** L'utilisation des opérations d'analyse sur des tables volumineuses entraîne un ralentissement des performances et des coûts élevés.

**Pourquoi cela arrive :**

- Je ne comprends pas la différence entre Query et Scan
- Index appropriés manquants
- Tentative de filtrer la table entière
- Esprit SQL hérité ("SELECT * WHERE...")

**Impact :**

- Requêtes lentes (de quelques secondes à quelques minutes)
- Coût élevé (facturé pour tous les éléments numérisés)
- La capacité consommée affecte les autres opérations
- Mauvaise expérience utilisateur

**Remède :**

**Étape 1 : Remplacer les analyses par des requêtes**
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
**Étape 2 : Ajouter un index secondaire**
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
**Étape 3 : Analyse parallèle pour les analyses nécessaires**
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
**Prévention :**

- Concevoir des index pour prendre en charge tous les modèles de requête
- Évitez les opérations d'analyse dans le code de production
- Utiliser la requête avec KeyConditionExpression
- Test avec des données à l'échelle de la production
- Surveiller la métrique ScanCount

***

### Piège 3 : Dépassement de la limite de taille d'article

**Problème :** Les éléments dépassant la taille limite de 400 Ko entraînent des échecs d'écriture.

**Pourquoi cela arrive :**

- Stockage de documents/fichiers volumineux dans des éléments
- Ne comprend pas le calcul de la taille de l'article
- Dénormaliser trop de données
- Ajout de nombreux attributs au fil du temps

**Impact :**

- Les opérations d'écriture échouent
- Impossible de stocker les données nécessaires
- Nécessité de repenser le modèle de données
- Erreurs d'application

**Calcul de la taille de l'article :**
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
**Remède :**

**Étape 1 : Stocker des données volumineuses dans S3**
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
**Étape 2 : Compresser les données**
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
**Étape 3 : diviser les gros objets**
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
**Prévention :**

- Surveiller la taille des éléments pendant le développement
- Stocker des objets volumineux dans S3
- Compresser les données texte
- Concevoir un modèle de données en tenant compte des limites de taille
- Utiliser des projections pour réduire la taille des index

***

## Résumé du chapitre

Amazon DynamoDB offre des fonctionnalités de base de données NoSQL sans serveur avec des performances en millisecondes à un chiffre, à n'importe quelle échelle. Comprendre la conception des clés, les index secondaires, les modes de capacité, les flux et les tables globales est essentiel pour créer des applications hautes performances. Une conception appropriée des clés de partition évite les partitions chaudes, des index appropriés éliminent les analyses coûteuses et la planification de la capacité optimise les coûts. DynamoDB excelle dans les applications à l'échelle Web nécessitant des modèles d'accès prévisibles à faible latence.

**Principaux points à retenir :**

- **Concevoir des clés pour les modèles d'accès :** Répertoriez d'abord tous les modèles, puis concevez des clés et des index pour les prendre en charge efficacement
- **Évitez les partitions dynamiques :** Utilisez des clés de partition à cardinalité élevée, partagez des données de séries chronologiques et surveillez avec Contributor Insights.
- **Choisissez le bon mode de capacité :** À la demande pour un trafic variable, doté d'une mise à l'échelle automatique pour des charges prévisibles
- **Utilisez judicieusement les index :** GSI pour différentes clés (cohérence éventuelle), LSI pour la même partition (cohérence forte)
- **Exploitez les flux :** Activez les architectures, les agrégations, la réplication et les pistes d'audit basées sur les événements
- **Surveiller la limitation :** Configurez des alarmes CloudWatch, analysez les modèles d'accès, optimisez avant la production
- **Optimiser les coûts :** Dimensionner correctement la capacité, utiliser des projections, nettoyer les index inutilisés, envisager la demande

Comprendre DynamoDB en profondeur vous permet de créer des applications qui évoluent de zéro à des millions de requêtes par seconde tout en maintenant des performances constantes et en contrôlant les coûts.

## Questions de révision

1. **Taille maximale de l'élément DynamoDB ?**
a) 64 Ko
b) 400 Ko
c) 4 Mo
d) Aucune limite

**Réponse : B** - La taille maximale de l'élément est de 400 Ko.

2. **Qu'est-ce qui offre une forte cohérence ?**
a) GSI lit
b) LSI lit
c) Lectures cohérentes éventuelles
d) Lectures interrégionales

**Réponse : B** - LSI prend en charge une forte cohérence ; GSI seulement une cohérence éventuelle.

3. **L'unité de capacité de lecture (RCU) DynamoDB fournit :**
a) 1 lecture/s fortement cohérente jusqu'à 4 Ko
b) 2 lectures finalement cohérentes/s jusqu'à 4 Ko
c) A et B
d) Ni A ni B

**Réponse : C** - 1 RCU = 1 forte cohérence OU 2 éventuelles lectures cohérentes/s (4 Ko).

4. **Nombre maximum de GSI par table ?**
une) 5
b) 10
c) 20
d) Illimité

**Réponse : C** - Maximum 20 GSI par table.

5. **Quand faut-il créer un LSI ?**
a) À tout moment
b) Lors de la création de la table uniquement
c) Avant d'ajouter des données
d) Après la création de la table

**Réponse : B** - LSI doit être créé lors de la création de la table (ne peut pas être ajouté ultérieurement).

6. **Période de conservation de DynamoDB Stream ?**
a) 6 heures
b) 24 heures
c) 7 jours
d) 30 jours

**Réponse : B** – Les enregistrements de flux sont conservés pendant 24 heures.

7. **La réplication des tables globales est :**
a) Synchrone
b) Asynchrone
c) Manuel
d) Non pris en charge

**Réponse : B** - Les tables globales utilisent la réplication asynchrone (généralement en moins d'une seconde).

8. **DAX offre quelle amélioration de la latence ?**
a) 2x plus rapide
b) 5x plus rapide
c) 10x+ plus rapide (ms à µs)
d) Aucune amélioration

**Réponse : C** - DAX réduit la latence de quelques millisecondes à quelques microsecondes (amélioration 10x+).

9. **Frais de facturation à la demande par :**
a) Heure
b) Demande
c) Go stockés
d) B et C

**Réponse : D** – Frais à la demande par demande ET par Go stocké.

10. **La restauration ponctuelle conserve les sauvegardes pour :**
a) 7 jours
b) 35 jours
c) 90 jours
d) 1 an

**Réponse : B** - PITR conserve les sauvegardes pendant 35 jours.

11. **Qu'est-ce qui provoque une partition chaude ?**
a) Clé de partition à cardinalité élevée
b) Clé de partition à faible cardinalité
c) De nombreux GSI
d) Gros objets

**Réponse : B** - Une faible cardinalité (peu de valeurs uniques) provoque des partitions chaudes.

12. **L'unité de capacité d'écriture (WCU) prend en charge :**
a) 1 écriture/sec jusqu'à 1 Ko
b) 1 écriture/s jusqu'à 4 Ko
c) 2 écritures/sec jusqu'à 1 Ko
d) 1 écriture/sec jusqu'à 10 Ko

**Réponse : A** - 1 WCU = 1 écriture/s pour un élément jusqu'à 1 Ko.

13. **Opération de numérisation :**
a) Lit des éléments spécifiques
b) Lit tous les éléments du tableau
c) Lit les éléments correspondant à la clé
d) Lit les éléments de l'index uniquement

**Réponse : B** - L'analyse lit le tableau entier (tous les éléments), puis filtre.

14. **Les suppressions TTL sont :**
a) Immédiat
b) En quelques minutes
c) Dans les 48 heures
d) Manuel uniquement

**Réponse : C** - TTL supprime les éléments dans les 48 heures suivant leur expiration.

15. **Meilleure caractéristique de clé de partition ?**
a) Faible cardinalité
b) Valeurs séquentielles
c) Cardinalité élevée avec accès uniforme
d) Rarement consulté

**Réponse : C** - Une cardinalité élevée avec une distribution uniforme des accès est idéale.

***
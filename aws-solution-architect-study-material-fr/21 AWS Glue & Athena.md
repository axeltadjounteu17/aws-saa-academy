# Chapitre 21 : AWS Glue \& Athena

##Présentation

Les lacs de données stockent des pétaoctets de données brutes dans S3, mais le stockage brut à lui seul n'apporte aucune valeur : les organisations doivent découvrir, cataloguer, transformer et interroger ces données pour en extraire des informations. AWS Glue et Amazon Athena transforment S3 d'un simple stockage d'objets en un entrepôt de données interrogeable. Glue fournit un ETL (Extract, Transform, Load) sans serveur et un catalogue de données centralisé, tandis qu'Athena permet d'effectuer des requêtes SQL directement sur les données S3 sans les déplacer ni gérer l'infrastructure. Ensemble, ils permettent des analyses à grande échelle sans le coût et la complexité des entrepôts de données traditionnels.

Les entrepôts de données traditionnels nécessitent un investissement initial important : provisionnement des clusters, chargement des données, indexation et maintenance de l'infrastructure. Les lacs de données démocratisent l'analyse en séparant le stockage du calcul : stockez des données illimitées à moindre coût dans S3, cataloguez-les avec Glue et interrogez avec Athena en payant uniquement pour les requêtes exécutées. Un entrepôt traditionnel stockant 100 To coûte plus de 50 000 $ par an rien qu’en infrastructure. Les mêmes données dans S3 coûtent 2 300 $/an pour le stockage, tandis que Glue et Athena ne facturent que le traitement réel, généralement 10 à 50 fois moins cher avec une évolutivité illimitée.

Comprendre Glue et Athena sépare profondément les analyses coûteuses et lentes des plates-formes de données rentables et évolutives. Un mauvais partitionnement amène Athena à analyser des ensembles de données entiers au lieu de sous-ensembles ciblés, ce qui multiplie les coûts par 100. Les mauvais formats de fichiers (JSON vs Parquet) augmentent la taille de numérisation par 10 et les coûts proportionnellement. Les robots d’exploration Missing Glue laissent les données impossibles à découvrir. Une mauvaise conception ETL exécute inutilement des tâches coûteuses. Ne pas utiliser la compression gaspille les coûts de stockage et d’analyse. Ce chapitre couvre Glue et Athena, des principes fondamentaux aux modèles de production, y compris le catalogue de données, les robots d'exploration, les tâches ETL, les stratégies de partitionnement, l'optimisation des requêtes, la sélection du format de fichier, la gestion des coûts et la création d'architectures de lac de données efficaces.

## Théorie \&Concepts

### Fondamentaux de l'architecture des lacs de données

**Lac de données et entrepôt de données :**
```
Data Warehouse (Traditional):

Architecture:
- Structured data only
- Schema-on-write (define schema before loading)
- Proprietary formats
- Tightly coupled storage and compute
- Fixed capacity (scale vertically)

Example: Amazon Redshift
- Provisions cluster (2-128 nodes)
- Loads data into cluster storage
- Indexes and optimizes
- Queries run on cluster
- Cost: Fixed regardless of usage

Cost Example (100 TB):
Redshift: $50,000-100,000/year (infrastructure)
+ Data loading costs
+ DBA management time

Characteristics:
✓ Optimized for SQL queries
✓ High performance for BI tools
✓ ACID transactions
✗ Expensive (always running)
✗ Rigid schema
✗ Structured data only
✗ Capacity planning required

Data Lake (Modern):

Architecture:
- All data types (structured, semi-structured, unstructured)
- Schema-on-read (define schema when querying)
- Open formats (Parquet, ORC, JSON)
- Decoupled storage and compute
- Unlimited scalability

Example: S3 + Glue + Athena
- Store data in S3 (unlimited)
- Catalog with Glue
- Query with Athena (serverless)
- Pay only for queries run
- Cost: Storage + query scans

Cost Example (100 TB):
S3 Storage: $2,300/year (100 TB × $0.023/GB)
Glue Catalog: $12/year (1 million objects × $1/million)
Athena Queries: Variable ($5/TB scanned)
Typical monthly queries scanning 1 TB: $5/month

Characteristics:
✓ Store any data type
✓ Unlimited scalability
✓ Pay only for usage
✓ Open formats
✗ Not optimized for transactions
✗ Query performance depends on organization
✗ Requires data organization discipline

Decision Matrix:

Use Data Warehouse when:
- Need ACID transactions
- Require millisecond query latency
- Complex joins on large datasets
- Real-time BI dashboards
- Can predict capacity

Use Data Lake when:
- Store diverse data types
- Unpredictable query patterns
- Cost optimization critical
- Unlimited scaling needed
- Schema evolves frequently

Hybrid Approach (Common):
Hot data → Redshift (frequent queries)
Warm data → Athena on S3 (occasional queries)
Cold data → S3 Glacier (archival, rare queries)
```
**Zones du lac de données :**
```
Well-Organized Data Lake:

1. Raw Zone (Landing):
s3://data-lake/raw/
├── source=logs/year=2025/month=01/day=15/*.json.gz
├── source=databases/year=2025/month=01/day=15/*.csv.gz
└── source=streams/year=2025/month=01/day=15/*.parquet

Characteristics:
- Unprocessed data as-is
- Original format preserved
- Complete history maintained
- Immutable (write-once)

Purpose:
- Data lineage
- Reprocessing capability
- Audit trail

2. Processed Zone (Cleaned):
s3://data-lake/processed/
├── dataset=orders/year=2025/month=01/day=15/*.parquet
├── dataset=users/year=2025/month=01/day=15/*.parquet
└── dataset=products/year=2025/month=01/day=15/*.parquet

Characteristics:
- Cleaned and validated
- Standardized formats (Parquet/ORC)
- Partitioned for queries
- Compressed

Purpose:
- Analytics queries
- ML training data
- Reporting

3. Curated Zone (Aggregated):
s3://data-lake/curated/
├── daily_sales_summary/year=2025/month=01/*.parquet
├── user_segments/date=2025-01-15/*.parquet
└── product_metrics/year=2025/month=01/*.parquet

Characteristics:
- Aggregated datasets
- Business-ready metrics
- Optimized for specific queries
- Smallest data volume

Purpose:
- BI tools
- Dashboards
- Executive reporting

Data Flow:
Raw → ETL (Glue) → Processed → ETL (Glue) → Curated
                         ↓                    ↓
                    Athena Queries      Athena Queries
```
### Catalogue de données AWS Glue

**Architecture du catalogue :**
```
Glue Data Catalog:

Purpose: Centralized metadata repository
Scope: One catalog per AWS account per region
Components: Databases, Tables, Partitions

Hierarchy:

Data Catalog
├── Database: analytics
│   ├── Table: orders
│   │   ├── Schema (columns, data types)
│   │   ├── Location (S3 path)
│   │   ├── Format (Parquet, JSON, CSV)
│   │   ├── SerDe (Serializer/Deserializer)
│   │   └── Partitions
│   │       ├── year=2025/month=01/day=15
│   │       ├── year=2025/month=01/day=16
│   │       └── year=2025/month=01/day=17
│   ├── Table: users
│   └── Table: products
└── Database: raw_data
    └── Table: logs

Table Metadata:

Name: orders
Database: analytics
Location: s3://data-lake/processed/orders/
Input Format: org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat
Output Format: org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat
SerDe: org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe
Compressed: Yes
Parameters:
  classification: parquet
  compressionType: snappy

Schema:
- order_id: string
- customer_id: string  
- order_date: timestamp
- total_amount: double
- status: string

Partition Keys:
- year: int
- month: int
- day: int

Integration:

Glue Data Catalog ←→ Athena (queries)
                  ←→ Redshift Spectrum (queries)
                  ←→ EMR (Spark/Hive)
                  ←→ Glue ETL Jobs
                  ←→ QuickSight (BI)

Benefits:
✓ Single source of truth for metadata
✓ Cross-service integration
✓ Schema discovery and evolution
✓ Partition management
✓ Access control (Lake Formation)

Pricing:
- Storage: $1 per 100,000 objects/month
- Requests: $1 per million requests
- 100,000 objects = $1/month
- 1 million objects = $10/month
- Very low cost for most use cases
```
**Colle Crawlers :**
```
Purpose: Automatically discover and catalog data

Crawler Configuration:

Data Source:
- S3 paths (one or more)
- JDBC connections (RDS, Redshift)
- DynamoDB tables

IAM Role:
- Read access to data source
- Write access to Glue Catalog

Schedule:
- On-demand
- Hourly, Daily, Weekly
- Custom cron expression

Output:
- Database name
- Table prefix (optional)
- Behavior on schema changes

Crawler Process:

1. Scan Data Source:
   Crawler reads sample files from S3
   ↓
2. Infer Schema:
   Determines columns, data types
   Identifies format (Parquet, JSON, CSV)
   ↓
3. Detect Partitions:
   Recognizes partition structure
   Creates partition metadata
   ↓
4. Update Catalog:
   Creates/updates tables
   Adds new partitions
   Updates schema if changed

Example Crawl:

S3 Structure:
s3://data-lake/orders/
├── year=2025/month=01/day=15/part-00001.parquet
├── year=2025/month=01/day=16/part-00001.parquet
└── year=2025/month=01/day=17/part-00001.parquet

Crawler Output:
Database: analytics
Table: orders
Schema: (inferred from Parquet)
  - order_id: string
  - customer_id: string
  - total: double
Partition Keys: year, month, day
Partitions Created: 3
Format: Parquet

Schema Evolution:

Scenario: Add new column to data
Day 1: orders have columns: id, customer, total
Day 2: orders have columns: id, customer, total, discount

Crawler Behavior:
- Detects new column
- Updates schema: adds discount column
- Existing queries still work
- New queries can use discount column

Options:
Update behavior: Update schema, Add new columns, Ignore changes
Version control: Keep previous schema versions

DPU (Data Processing Units):
- Capacity for crawler
- Default: 2 DPUs
- Can increase for large datasets
- Cost: $0.44/hour per DPU

Best Practices:
✓ Run crawler after ETL jobs (discover new data)
✓ Use consistent partition structure
✓ Schedule during low-usage times
✓ Monitor crawler run history
✓ Set up alerts for failures
✗ Don't run too frequently (cost optimization)
✗ Don't crawl changing data (schema conflicts)
```
### Tâches ETL AWS Glue

**Architecture des tâches ETL :**
```
Glue ETL Components:

1. Job Configuration:
   - Job name and description
   - IAM role (permissions)
   - Job type (Spark, Python Shell, Streaming)
   - Glue version (runtime)
   - Number of workers (capacity)
   - Job timeout

2. Script:
   - Python or Scala
   - Uses Glue library (DynamicFrame)
   - Can use Spark DataFrame APIs
   - Custom transformation logic

3. Connections:
   - JDBC connections (databases)
   - Network configuration (VPC)
   - Secrets Manager integration

4. Triggers:
   - On-demand
   - Schedule (cron)
   - Event-based (job completion)
   - Conditional (based on results)

Job Types:

Spark ETL Job (Most Common):
- Large-scale data processing
- Distributed execution
- DynamicFrame API
- Schema flexibility
- Cost: $0.44/hour per DPU
- Minimum: 2 DPUs
- Use: GB to PB data processing

Python Shell Job:
- Lightweight Python scripts
- Single machine execution
- Standard Python libraries
- Cost: $0.44/hour (0.0625 DPU)
- Use: Small data, API calls, orchestration

Streaming ETL Job:
- Continuous data processing
- Kinesis/Kafka sources
- Near real-time
- Cost: $0.44/hour per DPU
- Use: Streaming data transformation

Glue DynamicFrame vs Spark DataFrame:

DynamicFrame (Glue-specific):
✓ Schema flexibility (evolves automatically)
✓ Handles nested data easily
✓ Built-in transformations (ResolveChoice, DropNullFields)
✓ Error handling (choice types)
✗ Glue-specific (not portable)

Spark DataFrame (Standard):
✓ Industry-standard API
✓ Portable to other Spark environments
✓ More transformation functions
✗ Strict schema enforcement

Recommendation: Use DynamicFrame for most Glue jobs
Convert to/from DataFrame when needed
```
**Exemple de script ETL :**
```python
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

# Initialize contexts
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from Glue Catalog
datasource = glueContext.create_dynamic_frame.from_catalog(
    database="raw_data",
    table_name="orders",
    transformation_ctx="datasource"
)

# Transform: Filter and select columns
filtered = Filter.apply(
    frame=datasource,
    f=lambda x: x["status"] == "completed",
    transformation_ctx="filtered"
)

selected = SelectFields.apply(
    frame=filtered,
    paths=["order_id", "customer_id", "total", "order_date"],
    transformation_ctx="selected"
)

# Convert to DataFrame for complex transformations
df = selected.toDF()

# Add calculated column
from pyspark.sql.functions import col, year, month, dayofmonth

df = df.withColumn("year", year(col("order_date"))) \
       .withColumn("month", month(col("order_date"))) \
       .withColumn("day", dayofmonth(col("order_date")))

# Convert back to DynamicFrame
dynamic_frame = DynamicFrame.fromDF(df, glueContext, "dynamic_frame")

# Write to S3 (partitioned Parquet)
glueContext.write_dynamic_frame.from_options(
    frame=dynamic_frame,
    connection_type="s3",
    connection_options={
        "path": "s3://data-lake/processed/orders/",
        "partitionKeys": ["year", "month", "day"]
    },
    format="parquet",
    format_options={
        "compression": "snappy"
    },
    transformation_ctx="datasink"
)

job.commit()
```
**Signets d'emploi :**
```
Purpose: Track processed data, avoid reprocessing

How It Works:
1. Job runs for first time
2. Glue records max processed keys
3. Next job run: Reads only new data
4. Updates bookmark with new max keys

Use Cases:
- Incremental data processing
- Avoid duplicate processing
- Cost optimization

Example:
S3 Input: s3://raw/orders/
Files:
- 2025-01-15-data.json (processed)
- 2025-01-16-data.json (processed)
- 2025-01-17-data.json (new)

With Bookmark:
Job only processes 2025-01-17-data.json

Without Bookmark:
Job processes all three files (wasteful)

Configuration:
Enable: Yes/No
Reset: Reprocess all data
Pause: Temporarily disable

Best Practice: Always enable for incremental pipelines
```
### Service de requête Amazon Athena

**Architecture d'Athéna :**
```
Athena Query Execution:

User submits SQL query
    ↓
Athena query planner
    ↓
Reads metadata from Glue Catalog
    ↓
Generates execution plan
    ↓
Parallel execution on S3 data
    ↓
Results written to S3 results bucket
    ↓
Returns results to user

Characteristics:

Serverless:
- No infrastructure management
- Automatic scaling
- Pay per query (data scanned)

Presto-Based:
- ANSI SQL support
- Standard SQL functions
- Complex queries supported

Integration:
- Reads from Glue Catalog
- Queries S3 data directly
- Results to S3
- Connects to BI tools (QuickSight, Tableau)

Pricing Model:
- $5 per TB of data scanned
- Compressed data: Billed on compressed size
- Partitions: Only scan relevant partitions
- Results stored in S3 (standard S3 costs)
- Failed queries: Not charged
```
**Stratégies d'optimisation des requêtes :**
```
1. Partitioning:

Unpartitioned Table:
s3://data/orders/*.parquet (1 TB total)

Query: SELECT * FROM orders WHERE date = '2025-01-15'
Data Scanned: 1 TB (entire dataset)
Cost: $5

Partitioned Table:
s3://data/orders/year=2025/month=01/day=15/*.parquet

Query: SELECT * FROM orders WHERE year=2025 AND month=1 AND day=15
Data Scanned: 3 GB (one day only)
Cost: $0.015 (333× cheaper!)

Partition Strategy:
Time-based: year/month/day (most common)
Category-based: region/country
Custom: Depends on query patterns

Best Practices:
✓ Partition by most common filter columns
✓ Not too many partitions (< 10 million)
✓ Not too few (defeats purpose)
✓ Balance partition size (128 MB - 1 GB ideal)

2. File Format Optimization:

Format Comparison (1 TB dataset):

CSV:
- Size: 1 TB
- Query scans: 1 TB
- Cost: $5
- Compression: Limited

JSON:
- Size: 1.2 TB (verbose)
- Query scans: 1.2 TB
- Cost: $6
- Compression: GZIP (reduces to ~400 GB)

Parquet (Recommended):
- Size: 130 GB (columnar compression)
- Query scans: 13 GB (only queried columns)
- Cost: $0.065 (77× cheaper than CSV!)
- Compression: Built-in (Snappy/GZIP)

ORC:
- Size: 120 GB
- Query scans: Similar to Parquet
- Cost: $0.06
- Compression: Built-in

Parquet/ORC Benefits:
✓ Columnar format (scan only needed columns)
✓ Efficient compression
✓ Built-in statistics (skip data blocks)
✓ Schema evolution support
✗ Not human-readable

Recommendation: Always use Parquet for analytics

3. Compression:

Uncompressed Parquet: 130 GB
Snappy Compressed: 100 GB (default, balanced)
GZIP Compressed: 80 GB (smaller, slower queries)

Trade-offs:
Snappy: Faster queries, larger files
GZIP: Smaller files, slower queries

Recommendation: Snappy for most use cases

4. Column Projection:

Bad Query:
SELECT * FROM orders
Scans: All columns (even unused)

Good Query:
SELECT order_id, total FROM orders
Scans: Only order_id and total columns

Savings: 10× for wide tables (many columns)

5. Predicate Pushdown:

Optimizer pushes filters to storage layer

Query:
SELECT * FROM orders 
WHERE year=2025 AND status='completed'

Execution:
1. Filter by partition (year=2025)
2. Filter by value (status='completed')
3. Only read matching data blocks
4. Skip irrelevant data

6. CTAS (Create Table As Select):

Purpose: Materialize query results

Example:
CREATE TABLE completed_orders_2025
WITH (
  format='PARQUET',
  external_location='s3://data/completed_orders_2025/',
  partitioned_by=ARRAY['month', 'day']
)
AS SELECT * FROM orders 
WHERE year=2025 AND status='completed';

Benefits:
- Pre-aggregated results
- Faster subsequent queries
- Optimized format/partitioning
- Cost savings for repeated queries

Use Case: Reports run frequently
```
**Modèles de requête et bonnes pratiques :**
```
Efficient Query Patterns:

1. Use Partitions in WHERE Clause:
✓ WHERE year=2025 AND month=1
✗ WHERE date >= '2025-01-01' (if date not partition key)

2. Select Only Needed Columns:
✓ SELECT order_id, total FROM orders
✗ SELECT * FROM orders

3. Use Approximate Functions:
✓ SELECT approx_distinct(user_id) FROM events
   (faster, 2% error acceptable)
✗ SELECT COUNT(DISTINCT user_id) FROM events
   (exact, but slower/expensive)

4. Optimize JOINs:
✓ Put smaller table first
✓ Use INNER JOIN when possible
✓ Filter before joining

Example:
SELECT o.order_id, c.name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id
WHERE o.year = 2025 AND o.month = 1;

5. Bucketing for Large Tables:
Distribute data into buckets for faster joins

CREATE TABLE orders_bucketed
WITH (
  bucketed_by = ARRAY['customer_id'],
  bucket_count = 100
) AS SELECT * FROM orders;

Benefits: Faster joins on customer_id

Query Result Caching:

Athena caches query results for 24 hours
- Exact same query: Free (cached)
- Modified query: Full cost (new scan)

Workgroups:

Separate query environments:
- Cost tracking per team/project
- Query output locations
- Encryption settings
- Access control

Example:
Workgroup: analytics-team
- Output: s3://results/analytics-team/
- Encryption: SSE-KMS
- Data scanned limit: 1 TB/day
```
### Sécurité des lacs de données avec AWS Lake Formation
```
Lake Formation Components:

1. Data Catalog Security:
   - Table-level permissions
   - Column-level security
   - Row-level filtering

2. Fine-Grained Access Control:
   - Grant specific columns to users
   - Filter rows by conditions
   - Centralized permission management

3. Data Access Audit:
   - CloudTrail integration
   - Query logging
   - Access monitoring

Example Permission:
User: analyst@company.com
Database: sales
Table: orders
Columns: order_id, total (not customer_name)
Filter: WHERE region = 'US'

Result: User only sees US orders, without customer names

Benefits:
✓ Centralized access control
✓ Column masking
✓ Row filtering
✓ Simplified governance
✓ Audit trail
```
## Implémentation pratique

### Atelier 1 : Configuration du Glue Crawler
```python
import boto3

glue = boto3.client('glue')

# Create database
glue.create_database(
    DatabaseInput={
        'Name': 'analytics',
        'Description': 'Analytics database'
    }
)

# Create crawler
glue.create_crawler(
    Name='orders-crawler',
    Role='AWSGlueServiceRole',
    DatabaseName='analytics',
    Targets={
        'S3Targets': [{
            'Path': 's3://data-lake/processed/orders/',
            'Exclusions': ['**.json']
        }]
    },
    Schedule='cron(0 2 * * ? *)',  # Daily at 2 AM
    SchemaChangePolicy={
        'UpdateBehavior': 'UPDATE_IN_DATABASE',
        'DeleteBehavior': 'LOG'
    }
)

# Start crawler
glue.start_crawler(Name='orders-crawler')
```
### Atelier 2 : Exécution de requêtes Athena
```python
import boto3
import time

athena = boto3.client('athena')

# Execute query
response = athena.start_query_execution(
    QueryString='SELECT * FROM orders WHERE year=2025 LIMIT 10',
    QueryExecutionContext={'Database': 'analytics'},
    ResultConfiguration={'OutputLocation': 's3://results/'}
)

query_id = response['QueryExecutionId']

# Wait for completion
while True:
    result = athena.get_query_execution(QueryExecutionId=query_id)
    status = result['QueryExecution']['Status']['State']
    
    if status in ['SUCCEEDED', 'FAILED', 'CANCELLED']:
        break
    
    time.sleep(1)

# Get results
if status == 'SUCCEEDED':
    results = athena.get_query_results(QueryExecutionId=query_id)
```
## Conseils \& Bonnes pratiques

**Astuce 1 : Utilisez toujours le format Parquet**
Parquet réduit la taille de numérisation 10 fois par rapport à JSON/CSV : permet d'économiser 90 % sur les coûts Athena et améliore la vitesse des requêtes.

**Astuce 2 : Partitionner par modèles de requête**
Partition par année/mois/jour en cas de filtrage par date : réduit les données analysées de la To à la Go.

**Astuce 3 : Activer les favoris de tâches**
Traitez uniquement les nouvelles données dans des tâches ETL incrémentielles : économisez du temps et de l'argent et évitez les doublons.

**Astuce 4 : Utilisez CTAS pour les requêtes fréquentes**
Matérialisez des requêtes complexes dans de nouvelles tables Parquet : des requêtes ultérieures 100 fois plus rapides et moins chères.

**Astuce 5 : Surveillez les coûts d'Athena**
Définissez la métrique CloudWatch pour les données analysées : alerte en cas de dépassement du budget, évite les coûts incontrôlables.

## Pièges \& Remèdes

**Piège 1 : mauvaise conception des partitions**
*Problème :* Analyse de l'ensemble de données malgré les partitions ; les requêtes restent coûteuses.
*Solution :* Partition par colonnes utilisée dans la clause WHERE ; équilibrer le nombre de partitions (pas trop/peu) ; assurez-vous que les requêtes incluent des clés de partition.

**Piège 2 : Utiliser CSV/JSON au lieu de Parquet**
*Problème :* Athena analyse 10 fois plus de données que nécessaire ; coûts de requête élevés.
*Solution :* Convertissez toutes les données analytiques en Parquet avec la compression Snappy ; utilisez Glue ETL pour la conversion ; Réduction des coûts de 90 %.

**Piège 3 : requêtes SELECT ***
*Problème :* Analyse de toutes les colonnes, y compris celles inutilisées ; transfert de données et coûts inutiles.
*Solution :* Spécifiez toujours explicitement les colonnes nécessaires ; utiliser la projection en colonnes ; surveiller les modèles de requêtes pour l’optimisation.

## Questions de révision

1. **Modèle de tarification Athena ?** \ 5 $ par To de données analysées
2. **Réduction de la taille du parquet par rapport au CSV ?** ~10 × plus petit (compression des colonnes)
3. **Tarifs du robot d'exploration de colle ?** 0,44 $/heure par DPU (2 DPU par défaut)
4. **Coût de l'objet Glue Data Catalog ?** \$1 pour 100 000 objets/mois
5. **Durée du cache des résultats de la requête Athena ?** 24 heures

***
# Partie 9 : Surveillance \& Opérations

# Chapitre 26 : CloudWatch

##Présentation

L'infrastructure cloud moderne génère des millions de points de données toutes les heures : l'utilisation du processeur fluctue sur des centaines d'instances, les appels d'API réussissent ou échouent des milliers de fois par seconde, les journaux d'application sont diffusés en continu à partir de microservices distribués et les requêtes de base de données s'exécutent avec une latence variable. Sans surveillance complète, les organisations fonctionnent à l’aveugle, incapables de détecter la dégradation des performances, de résoudre les pannes, d’optimiser les coûts ou de prouver la conformité aux SLA. Amazon CloudWatch offre une observabilité unifiée sur l'infrastructure, les applications et les services AWS, en collectant des métriques, des journaux et des traces pour transformer les données brutes en informations exploitables qui évitent les pannes, réduisent le temps de dépannage de quelques heures à quelques minutes et permettent une optimisation proactive.

Le coût d’une surveillance inadéquate s’étend au-delà des incidents technologiques. Les temps d'arrêt moyens des applications coûtent 300 000 $ par heure aux entreprises, 80 % des pannes étant causées par des problèmes évitables que la surveillance pourrait détecter tôt. Les approches de surveillance traditionnelles (installation d'agents sur chaque serveur, configuration de tableaux de bord personnalisés par application, corrélation manuelle des journaux entre les systèmes) ne peuvent pas s'adapter aux environnements cloud où l'infrastructure évolue de minute en minute. CloudWatch élimine cette complexité grâce à la collecte automatique de métriques à partir de plus de 80 services AWS, à l'agrégation centralisée des journaux avec de puissantes capacités de requête, aux alarmes intelligentes avec détection des anomalies et aux tableaux de bord personnalisables offrant une visibilité en temps réel sur des environnements entiers.

Ce chapitre s'appuie sur les services couverts dans le manuel : CloudWatch surveille les instances EC2, suit les métriques d'exécution Lambda, analyse les modèles de requêtes ALB, détecte les problèmes de performances RDS et regroupe les journaux de toutes les sources. L'intégration est transparente : les résultats de GuardDuty déclenchent des alarmes CloudWatch, les journaux WAF sont diffusés vers CloudWatch Logs, les tâches de formation SageMaker publient des métriques personnalisées et Step Functions émet des traces d'exécution. Le chapitre couvre l'architecture CloudWatch, les types de métriques, les groupes et flux de journaux, les filtres de métriques, les alarmes et les alarmes composites, les tableaux de bord, la détection d'anomalies, CloudWatch Insights (journaux, conteneur, Lambda, contributeur), l'intégration du traçage X-Ray, les stratégies de journalisation centralisées, les modèles d'excellence opérationnelle et la création de systèmes de surveillance de la production qui détectent les problèmes avant que les utilisateurs ne s'en aperçoivent, résolvent rapidement les pannes et optimisent en continu en fonction des données.

## Théorie \&Concepts

### Architecture CloudWatch

**Composants principaux :**
```
CloudWatch Architecture:

Data Sources:
├── AWS Services (automatic metrics)
│   ├── EC2: CPU, Network, Disk
│   ├── RDS: Connections, IOPS, CPU
│   ├── Lambda: Invocations, Duration, Errors
│   ├── DynamoDB: ConsumedCapacity, Throttles
│   └── 80+ services (no configuration needed)
├── Custom Metrics (application-generated)
│   ├── Business metrics (orders/min)
│   ├── Custom performance metrics
│   └── External system metrics
└── Logs (centralized aggregation)
    ├── Application logs
    ├── AWS service logs (VPC Flow, CloudTrail)
    └── Lambda logs (automatic)

CloudWatch Services:

1. CloudWatch Metrics:
   - Time-series data points
   - Namespace organization
   - Dimensions (filters)
   - Statistics (aggregation)
   - Retention: 15 months

2. CloudWatch Logs:
   - Log groups (containers)
   - Log streams (sources)
   - Retention policies (1 day to forever)
   - Metric filters (extract metrics)
   - Query with Logs Insights

3. CloudWatch Alarms:
   - Metric-based thresholds
   - Composite alarms (combine multiple)
   - Actions (SNS, Auto Scaling, EC2)
   - Anomaly detection
   - States: OK, ALARM, INSUFFICIENT_DATA

4. CloudWatch Dashboards:
   - Visualization (graphs, numbers)
   - Multiple regions/accounts
   - Automatic refresh
   - Shareable URLs

5. CloudWatch Insights:
   - Logs Insights (query logs)
   - Container Insights (ECS/EKS metrics)
   - Lambda Insights (function metrics)
   - Contributor Insights (top contributors)
   - Application Insights (automated dashboards)

Data Flow:

AWS Service → CloudWatch Metrics → Alarms → Actions (SNS, Lambda)
                                 → Dashboards (visualization)
                                 → API (programmatic access)

Application → CloudWatch Logs → Metric Filters → Metrics → Alarms
                              → Logs Insights (queries)
                              → Export to S3 (archival)
```
### Métriques CloudWatch

**Types de métriques et espaces de noms :**
```
Standard Metrics (AWS Services):

Namespace: AWS/ServiceName
Examples:
- AWS/EC2: EC2 instance metrics
- AWS/RDS: Database metrics
- AWS/Lambda: Function metrics
- AWS/DynamoDB: Table metrics

EC2 Standard Metrics (5-minute intervals, free):
- CPUUtilization: Percentage
- NetworkIn/NetworkOut: Bytes
- DiskReadOps/DiskWriteOps: Count
- StatusCheckFailed: 0 or 1

EC2 Detailed Monitoring (1-minute intervals, paid):
- Same metrics, higher granularity
- Cost: $2.10/month per instance
- Essential for auto-scaling

RDS Metrics:
- DatabaseConnections: Count
- ReadLatency/WriteLatency: Seconds
- FreeStorageSpace: Bytes
- CPUUtilization: Percentage

Lambda Metrics:
- Invocations: Count
- Duration: Milliseconds
- Errors: Count
- Throttles: Count
- ConcurrentExecutions: Count

Custom Metrics (Application-generated):

Namespace: Custom/ or Application/
Dimensions: Key-value pairs for filtering
Units: Seconds, Bytes, Percent, Count, etc.

Example Custom Metric:
Namespace: CustomApp/Orders
MetricName: OrdersPlaced
Dimensions: 
  - Environment: Production
  - Region: us-east-1
Value: 150
Unit: Count
Timestamp: 2025-01-15T10:30:00Z

Publishing Custom Metrics:
import boto3
from datetime import datetime

cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_data(
    Namespace='CustomApp/Orders',
    MetricData=[
        {
            'MetricName': 'OrdersPlaced',
            'Dimensions': [
                {'Name': 'Environment', 'Value': 'Production'},
                {'Name': 'PaymentType', 'Value': 'CreditCard'}
            ],
            'Value': 1,
            'Unit': 'Count',
            'Timestamp': datetime.utcnow()
        }
    ]
)

High-Resolution Metrics:
- Standard: 1-minute granularity
- High-resolution: 1-second granularity
- Cost: $0.30 per metric/month (vs $0.10 standard)
- Use case: Real-time dashboards, rapid scaling

StorageResolution: 1 (high-res) or 60 (standard)

Metric Math:
Combine metrics with expressions
Example: Error rate = Errors / Invocations * 100

Expression: m1/m2*100
Where:
  m1 = Errors metric
  m2 = Invocations metric
```
**Statistiques métriques et agrégation :**
```
Statistics (How Data is Aggregated):

Sum: Total of all values
- Use: Counter metrics (requests, errors)
- Example: Total requests in 5 minutes

Average: Mean of all values
- Use: Gauge metrics (CPU, memory)
- Example: Average CPU over 5 minutes

Minimum: Lowest value
- Use: Performance thresholds
- Example: Fastest response time

Maximum: Highest value
- Use: Capacity planning, spikes
- Example: Peak CPU utilization

SampleCount: Number of data points
- Use: Data volume analysis
- Example: Number of requests logged

Percentiles: p50, p90, p95, p99
- Use: Latency analysis, SLA monitoring
- Example: p99 latency = 99% of requests faster than this
- Better than average (hides outliers)

Extended Statistics:
- Specify: p0.0 to p100
- Example: p99.9 for 99.9th percentile

Aggregation Periods:

1 minute: Detailed monitoring, rapid response
5 minutes: Standard monitoring (free for most services)
1 hour: Long-term trends, cost optimization
1 day: Capacity planning, monthly reporting

Data Point Frequency:
- High-resolution: Every 1 second
- Standard: Every 1 minute (detailed) or 5 minutes (standard)

Example Query:
Metric: Lambda Duration
Statistic: p99
Period: 5 minutes
Result: 99th percentile execution time over 5-minute windows

Use Case: "99% of Lambda functions complete within 2 seconds"
Better than average (average hides slow outliers)
```
### Journaux CloudWatch

**Groupes de journaux et flux :**
```
Logs Hierarchy:

Log Group: /aws/lambda/my-function
├── Log Stream: 2025/01/15/[$LATEST]abc123
│   ├── Log Event 1: START RequestId: xyz
│   ├── Log Event 2: Processing order 123
│   └── Log Event 3: END RequestId: xyz
├── Log Stream: 2025/01/15/[$LATEST]def456
└── Log Stream: 2025/01/16/[$LATEST]ghi789

Log Group:
- Container for log streams
- Retention policy (1 day to forever)
- Subscription filters (stream to destinations)
- Metric filters (extract metrics)
- Naming convention: /aws/service/resource-name

Log Stream:
- Sequence of log events from single source
- Ordered by timestamp
- Cannot write to multiple streams simultaneously
- Automatically created by source

Log Event:
- Timestamp + Message
- Maximum size: 256 KB
- Ingestion: Up to 5 GB/sec per log group

Retention Policies:
- 1 day, 3 days, 5 days, 1 week, 2 weeks
- 1 month, 2 months, 3 months, 4 months, 5 months, 6 months
- 1 year, 13 months, 18 months, 2 years, 5 years, 10 years
- Never expire (indefinite retention)

Cost Impact:
Retention: 1 day = Minimal cost
Retention: 1 year = 12× data storage cost
Recommendation: 30 days for most logs, export to S3 for long-term

Common Log Groups:
/aws/lambda/function-name: Lambda function logs
/aws/rds/instance/instance-name/error: RDS error logs
/aws/ecs/cluster-name: ECS container logs
/aws/codebuild/project-name: CodeBuild logs
/aws/apigateway/api-id/stage: API Gateway access logs
```
**Méthodes d'ingestion de journaux :**
```
1. Automatic (AWS Services):
   - Lambda: Automatic log group creation
   - ECS/Fargate: Configure in task definition
   - RDS: Enable in DB instance settings
   - API Gateway: Enable access logging
   - No agent required

2. CloudWatch Logs Agent (Legacy):
   - Installed on EC2/on-premises
   - Configuration file driven
   - Basic functionality
   - Being replaced by unified agent

3. CloudWatch Unified Agent (Recommended):
   - Installed on EC2/on-premises
   - Collects metrics AND logs
   - Advanced features (StatsD, collectd)
   - Systems Manager integration
   
   Configuration:
   {
     "logs": {
       "logs_collected": {
         "files": {
           "collect_list": [
             {
               "file_path": "/var/log/app/*.log",
               "log_group_name": "/app/production",
               "log_stream_name": "{instance_id}"
             }
           ]
         }
       }
     },
     "metrics": {
       "namespace": "CustomApp",
       "metrics_collected": {
         "cpu": {
           "measurement": ["cpu_usage_idle"],
           "totalcpu": false
         },
         "mem": {
           "measurement": ["mem_used_percent"]
         }
       }
     }
   }

4. Direct API (PutLogEvents):
   - Application SDK
   - Custom logging
   - Batch upload
   - Full control

5. Kinesis Integration:
   - Kinesis Data Firehose → CloudWatch Logs
   - Real-time streaming
   - High volume scenarios

Log Format Best Practices:
✓ Use structured logging (JSON)
✓ Include timestamp, severity, request ID
✓ Add context (user ID, session ID, trace ID)
✓ Sanitize sensitive data (PII, credentials)

Example Structured Log:
{
  "timestamp": "2025-01-15T10:30:00.123Z",
  "level": "ERROR",
  "requestId": "abc-123-def-456",
  "userId": "user-789",
  "message": "Database connection failed",
  "error": {
    "type": "ConnectionTimeout",
    "code": "ETIMEDOUT",
    "details": "Connection to db.example.com:5432 timed out"
  },
  "duration": 30000,
  "retry": 3
}

Benefits:
✓ Easy to parse and query
✓ Consistent format
✓ Machine-readable
✓ Enables automated analysis
```
### Filtres métriques

**Extraction de métriques à partir des journaux :**
```
Metric Filter Concept:
Log Events → Pattern Matching → Extract Values → Publish Metric

Use Cases:
- Count log events matching pattern (errors, warnings)
- Extract numeric values (latency, size)
- Monitor application-specific events
- Alert on log patterns

Example 1: Count Errors

Log Pattern:
[ERROR] Failed to process order

Metric Filter:
Pattern: [ERROR]
Metric Name: ApplicationErrors
Metric Namespace: CustomApp/Monitoring
Metric Value: 1 (increment)
Default Value: 0 (when no matches)

Result: 
Metric tracks error count over time
Alarm when errors > threshold

Example 2: Extract Response Time

Log Pattern:
Processed request in 250ms

Metric Filter:
Pattern: Processed request in $time ms
Metric Name: ResponseTime
Metric Namespace: CustomApp/Performance
Metric Value: $time
Unit: Milliseconds

Result:
Metric tracks actual response times
Alarm on p99 > 1000ms

Example 3: JSON Log Parsing

Log Event:
{"level":"ERROR","duration":5000,"status":500}

Metric Filter:
Pattern: { $.level = "ERROR" }
Metric Name: APIErrors
Metric Value: 1

Pattern: { $.duration > 3000 }
Metric Name: SlowRequests
Metric Value: 1

Filter Pattern Syntax:

Space-delimited logs:
[field1, field2, field3]
Example: [timestamp, level, message]
Pattern: [*, ERROR, *]

JSON logs:
{ $.field = "value" }
Example: { $.status = 500 }
       { $.duration > 1000 }

Operators: =, !=, <, <=, >, >=
Logic: && (AND), || (OR)

Creating Metric Filter:
import boto3

logs = boto3.client('logs')

logs.put_metric_filter(
    logGroupName='/aws/lambda/my-function',
    filterName='ErrorCount',
    filterPattern='[ERROR]',
    metricTransformations=[
        {
            'metricName': 'ErrorCount',
            'metricNamespace': 'CustomApp',
            'metricValue': '1',
            'defaultValue': 0
        }
    ]
)

Best Practices:
✓ Test patterns with sample logs first
✓ Use default value 0 for count metrics
✓ Create separate filters for different patterns
✓ Monitor filter match rate (low = pattern issue)
✗ Don't create too many filters (performance impact)
```
### Alarmes CloudWatch

**Configuration de l'alarme :**
```
Alarm Components:

Metric: What to monitor
Statistic: How to aggregate (Average, Sum, p99, etc.)
Period: Time window (1 min, 5 min, 1 hour)
Threshold: Value triggering alarm
Comparison: GreaterThan, LessThan, etc.
Evaluation Periods: How many periods before alarm
Datapoints to Alarm: M out of N periods

Example Alarm:
Metric: CPUUtilization
Statistic: Average
Period: 5 minutes
Threshold: 80%
Comparison: GreaterThanThreshold
Evaluation Periods: 2
Datapoints to Alarm: 2 out of 2

Behavior:
Period 1: 85% CPU → 1/2 datapoints (no alarm)
Period 2: 82% CPU → 2/2 datapoints (ALARM state)
Period 3: 75% CPU → 1/2 datapoints (still ALARM)
Period 4: 70% CPU → 0/2 datapoints (OK state)

Alarm States:

OK: Metric within threshold
ALARM: Metric breached threshold
INSUFFICIENT_DATA: Not enough data points

State Transitions:
OK → ALARM: Threshold breached
ALARM → OK: Metric returns to normal
* → INSUFFICIENT_DATA: Missing data

Actions (per state):

Alarm State:
- Send SNS notification
- Execute Auto Scaling policy
- Stop/Terminate/Reboot EC2 instance
- Invoke Lambda function (via SNS → Lambda)

OK State:
- Send recovery notification
- Scale down Auto Scaling
- Custom recovery actions

INSUFFICIENT_DATA:
- Usually no action
- Or notify for investigation

Alarm Evaluation:

Treating Missing Data:
- notBreaching: Missing data = OK (default, lenient)
- breaching: Missing data = ALARM (strict)
- ignore: Maintain current state
- missing: Transition to INSUFFICIENT_DATA

Example Scenario:
Application stops logging (crashed)
Default behavior: Alarm doesn't trigger (notBreaching)
Better: Set to "breaching" for crash detection

Alarm Math:
Combine multiple metrics with expressions

Example: Error Rate Alarm
Expression: errors/invocations*100 > 5
Where:
  errors = Lambda Errors metric
  invocations = Lambda Invocations metric
Alarm when error rate exceeds 5%
```
**Alarmes composites :**
```
Composite Alarms:
Combine multiple alarms with logic

Use Case: Reduce false positives
Problem: Single metric alarm too sensitive
Solution: Require multiple conditions

Example 1: Application Health Check

Alarm A: HighErrorRate (error rate > 5%)
Alarm B: HighLatency (p99 > 2000ms)
Alarm C: LowSuccessRate (success < 95%)

Composite Alarm: ApplicationUnhealthy
Rule: ALARM(A) AND (ALARM(B) OR ALARM(C))

Triggers when:
- High errors AND (high latency OR low success)
- Avoids false alarms from transient spikes

Example 2: Database Degradation

Alarm A: HighCPU (CPU > 80%)
Alarm B: HighConnections (connections > 90% max)
Alarm C: LowFreeMemory (memory < 20%)

Composite Alarm: DatabaseOverloaded
Rule: ALARM(A) AND ALARM(B) AND ALARM(C)

Triggers only when:
- All three metrics breached simultaneously
- High confidence of actual issue

Creating Composite Alarm:

cloudwatch.put_composite_alarm(
    AlarmName='ApplicationUnhealthy',
    AlarmRule='ALARM(HighErrorRate) AND (ALARM(HighLatency) OR ALARM(LowSuccessRate))',
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:region:account:critical-alerts']
)

Operators:
AND: All conditions true
OR: Any condition true
NOT: Invert condition
Parentheses: Group conditions

Benefits:
✓ Reduce false positive rate 90%+
✓ More intelligent alerting
✓ Alert fatigue reduction
✓ Focus on actual issues
✓ Better signal-to-noise ratio

Best Practices:
✓ Use for critical alerts only
✓ Test thoroughly before production
✓ Document alarm logic clearly
✓ Review and tune regularly
✗ Don't create overly complex rules
```
### Informations sur les journaux CloudWatch

**Langage de requête :**
```
Logs Insights Purpose:
Fast, interactive log analysis
Query language for log exploration
No indexing required (automatic)

Query Structure:
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)

Basic Syntax:

fields: Select fields to display
filter: Filter log events
stats: Aggregate data
sort: Order results
limit: Limit result count

Common Queries:

1. Count Errors per Hour:
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() as error_count by bin(1h)

2. Top Error Messages:
fields @message
| filter level = "ERROR"
| stats count() as occurrences by @message
| sort occurrences desc
| limit 10

3. Average Latency per Endpoint:
fields @timestamp, endpoint, duration
| stats avg(duration) as avg_latency by endpoint
| sort avg_latency desc

4. Parse JSON Logs:
fields @timestamp, @message
| parse @message '{"level":"*","status":*,"duration":*}' as level, status, duration
| filter status >= 500
| stats avg(duration) as avg_error_duration

5. Find Slow Requests:
fields @timestamp, requestId, duration
| filter duration > 3000
| sort duration desc
| limit 100

Functions:

Aggregation:
- count(): Count records
- sum(field): Sum values
- avg(field): Average
- min(field): Minimum
- max(field): Maximum
- stddev(field): Standard deviation

String:
- strlen(field): String length
- concat(field1, field2): Concatenate
- trim(field): Remove whitespace
- lower(field): Lowercase
- upper(field): Uppercase

Date/Time:
- bin(interval): Time buckets (1m, 5m, 1h, 1d)
- earliest(@timestamp): Earliest time
- latest(@timestamp): Latest time

Advanced Patterns:

Regular Expressions:
| filter @message like /\[ERROR\].*/

Extract with Parse:
| parse @message '[*] *: *' as level, component, message

Conditional Stats:
| stats count() as total,
        sum(status = 200) as success,
        sum(status >= 500) as errors

Calculate Percentages:
| stats count() as total,
        sum(status >= 500) as errors
| fields errors / total * 100 as error_rate

Saved Queries:
Save frequently used queries
One-click execution
Share across team

Query Performance:
- Time range: Smaller = faster
- Filters: Apply early in query
- Fields: Select only needed fields
- Cost: $0.005 per GB scanned
```
### Tableaux de bord CloudWatch

**Composants du tableau de bord :**
```
Dashboard Types:

Standard Dashboards:
- Multiple widgets
- Multiple regions/accounts
- Real-time updates
- Custom layouts

Automatic Dashboards:
- Service-specific (Lambda, EC2, etc.)
- Pre-configured widgets
- Best practices layout
- Quick setup

Widget Types:

1. Line Graph:
   - Time-series data
   - Multiple metrics
   - Annotations
   - Y-axis: Values, X-axis: Time

2. Number Widget:
   - Single metric value
   - Latest value or statistic
   - Large, readable display
   - Color-coded thresholds

3. Gauge Widget:
   - Progress toward threshold
   - Visual indicator (red/yellow/green)
   - Percentage-based

4. Bar Chart:
   - Compare metrics
   - Multiple metrics side-by-side
   - Time-based or categorical

5. Pie Chart:
   - Proportions
   - Percentage distribution
   - Limited metrics (2-5)

6. Log Widget:
   - Recent log events
   - Logs Insights query results
   - Live tail

7. Alarm Widget:
   - Alarm status
   - Multiple alarms
   - Quick overview

8. Text Widget:
   - Markdown formatting
   - Documentation
   - Instructions
   - Links

Dashboard JSON Structure:

{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Performance",
        "yAxis": {
          "left": {"min": 0}
        }
      }
    }
  ]
}

Creating Dashboard:

cloudwatch = boto3.client('cloudwatch')

dashboard_body = {
    "widgets": [
        {
            "type": "metric",
            "properties": {
                "metrics": [
                    ["AWS/EC2", "CPUUtilization", 
                     {"stat": "Average", "label": "CPU"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "EC2 CPU Utilization"
            }
        }
    ]
}

cloudwatch.put_dashboard(
    DashboardName='Production-Overview',
    DashboardBody=json.dumps(dashboard_body)
)

Dashboard Best Practices:

Layout:
✓ Most critical metrics at top
✓ Related metrics grouped together
✓ Consistent time ranges
✓ Logical flow (top to bottom)

Content:
✓ Include key SLA metrics
✓ Add context with text widgets
✓ Use color coding (red/yellow/green)
✓ Include alarm status
✓ Link to runbooks

Sharing:
- Generate shareable link
- Requires AWS SSO or IAM
- Set expiration (3 hours to 30 days)
- Share with external stakeholders

Example Production Dashboard:

Row 1: Business Metrics
- Orders per minute (number)
- Revenue per hour (number)
- Active users (gauge)

Row 2: Application Health
- Error rate (line graph, red threshold)
- Latency p99 (line graph)
- Success rate (gauge)

Row 3: Infrastructure
- EC2 CPU (line graph)
- RDS connections (line graph)
- Lambda throttles (number, alarm on > 0)

Row 4: Alarms
- Critical alarms (alarm widget)
- Recent deployments (text widget with links)
```
### Services d'informations CloudWatch

** Informations sur les conteneurs :**
```
Container Insights:
Monitor ECS, EKS, Kubernetes workloads

Metrics Collected:
- CPU utilization (container, pod, node)
- Memory utilization
- Network (bytes in/out)
- Disk I/O
- Container restarts

Performance Logs:
- Structured JSON logs
- Container-level metrics
- Automatic aggregation

Enable for ECS:
aws ecs update-cluster-settings \
    --cluster production-cluster \
    --settings name=containerInsights,value=enabled

Enable for EKS:
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml

Metrics Namespace: AWS/ContainerInsights

Dimensions:
- ClusterName
- ServiceName
- TaskDefinitionFamily
- PodName
- Namespace

Dashboard:
Automatic dashboard creation
Pod/container/node level views
Resource utilization trends
```
**Insights Lambda :**
```
Lambda Insights:
Enhanced monitoring for Lambda functions

Metrics Beyond Standard:
- Cold starts
- Memory utilization (actual vs allocated)
- CPU time
- Network I/O
- Init duration

Enable:
Add Lambda layer:
arn:aws:lambda:region:580247275435:layer:LambdaInsightsExtension:21

Add IAM permission:
CloudWatchLambdaInsightsExecutionRolePolicy

Metrics Available:
- cpu_total_time: CPU time used
- memory_utilization: Actual memory %
- init_duration: Cold start time
- tmp_used: Tmp directory usage

Use Cases:
- Identify over-provisioned functions (reduce cost)
- Detect memory leaks
- Optimize cold starts
- Monitor concurrent executions

Cost Optimization Example:
Function allocated: 1024 MB
Actual usage: 256 MB
Recommendation: Reduce to 512 MB
Savings: 50% on invocation cost
```
**Constats des contributeurs :**
```
Contributor Insights:
Identify top contributors to metrics

Use Cases:
- Top talkers (highest request volume)
- Top errors (which endpoints failing)
- Heaviest users (resource consumption)
- Busiest routes (traffic patterns)

Rules:
Define what to analyze from logs

Example Rule:
{
  "Schema": {
    "Name": "CloudWatchLogRule",
    "Version": 1
  },
  "LogGroupNames": ["/aws/lambda/*"],
  "LogFormat": "JSON",
  "Fields": {
    "2": "$.requestId",
    "3": "$.errorType"
  },
  "Contribution": {
    "Keys": ["$.requestId"],
    "ValueOf": "3",
    "Filters": [
      {
        "Match": "$.errorType",
        "NotEquals": [""]
      }
    ]
  }
}

Output:
Top 10 requestIds by error count
Visual graph and table
Time-series view

Built-in Rules:
- DynamoDB top partition keys
- VPC Flow Logs top talkers
- Route 53 query volume by domain

Creating Rule:

cloudwatch.put_insight_rule(
    RuleName='TopErrorUsers',
    RuleState='ENABLED',
    RuleDefinition=json.dumps(rule_definition),
    Tags=[{'Key': 'Environment', 'Value': 'Production'}]
)
```
## Implémentation pratique

### Lab 1 : Mesures et alarmes personnalisées

**Objectif :** Publiez des métriques d'application personnalisées et créez des alarmes intelligentes.

**Étape 1 : Publier des métriques personnalisées**
```python
import boto3
import time
from datetime import datetime
import random

cloudwatch = boto3.client('cloudwatch')

def publish_business_metrics():
    """Publish custom business metrics to CloudWatch"""
    
    # Simulate application metrics
    orders_placed = random.randint(10, 50)
    revenue = random.uniform(500, 2000)
    cart_abandonment_rate = random.uniform(10, 30)
    
    # Publish metrics
    cloudwatch.put_metric_data(
        Namespace='CustomApp/Business',
        MetricData=[
            {
                'MetricName': 'OrdersPlaced',
                'Dimensions': [
                    {'Name': 'Environment', 'Value': 'Production'},
                    {'Name': 'Region', 'Value': 'us-east-1'}
                ],
                'Value': orders_placed,
                'Unit': 'Count',
                'Timestamp': datetime.utcnow()
            },
            {
                'MetricName': 'Revenue',
                'Dimensions': [
                    {'Name': 'Environment', 'Value': 'Production'},
                    {'Name': 'Currency', 'Value': 'USD'}
                ],
                'Value': revenue,
                'Unit': 'None',
                'Timestamp': datetime.utcnow()
            },
            {
                'MetricName': 'CartAbandonmentRate',
                'Dimensions': [
                    {'Name': 'Environment', 'Value': 'Production'}
                ],
                'Value': cart_abandonment_rate,
                'Unit': 'Percent',
                'Timestamp': datetime.utcnow(),
                'StorageResolution': 60  # Standard resolution
            }
        ]
    )
    
    print(f"Published metrics: {orders_placed} orders, ${revenue:.2f} revenue, {cart_abandonment_rate:.1f}% abandonment")

# Publish metrics every minute for testing
for i in range(10):
    publish_business_metrics()
    time.sleep(60)
```
**Étape 2 : Créer une alarme standard**
```python
# Create alarm for low order volume
cloudwatch.put_metric_alarm(
    AlarmName='LowOrderVolume',
    ComparisonOperator='LessThanThreshold',
    EvaluationPeriods=2,
    MetricName='OrdersPlaced',
    Namespace='CustomApp/Business',
    Period=300,  # 5 minutes
    Statistic='Sum',
    Threshold=20,  # Alert if < 20 orders in 5 minutes
    ActionsEnabled=True,
    AlarmActions=[
        'arn:aws:sns:us-east-1:123456789012:business-alerts'
    ],
    AlarmDescription='Alert when order volume drops below threshold',
    Dimensions=[
        {'Name': 'Environment', 'Value': 'Production'}
    ],
    TreatMissingData='notBreaching'  # Missing data = OK (lenient)
)

print("Created alarm: LowOrderVolume")
```
**Étape 3 : Créer une alarme de détection d'anomalie**
```python
# Create alarm with anomaly detection (ML-based)
cloudwatch.put_metric_alarm(
    AlarmName='AnomalousOrderVolume',
    ComparisonOperator='LessThanLowerOrGreaterThanUpperThreshold',
    EvaluationPeriods=2,
    Metrics=[
        {
            'Id': 'm1',
            'ReturnData': True,
            'MetricStat': {
                'Metric': {
                    'Namespace': 'CustomApp/Business',
                    'MetricName': 'OrdersPlaced',
                    'Dimensions': [
                        {'Name': 'Environment', 'Value': 'Production'}
                    ]
                },
                'Period': 300,
                'Stat': 'Sum'
            }
        },
        {
            'Id': 'ad1',
            'Expression': 'ANOMALY_DETECTION_BAND(m1, 2)',  # 2 standard deviations
            'Label': 'Expected Orders (band)'
        }
    ],
    ThresholdMetricId='ad1',
    ActionsEnabled=True,
    AlarmActions=[
        'arn:aws:sns:us-east-1:123456789012:anomaly-alerts'
    ],
    AlarmDescription='Alert on anomalous order volume using ML'
)

print("Created anomaly detection alarm")

# Anomaly detection automatically learns normal patterns
# Adapts to weekly/daily patterns
# Reduces false positives from expected variations
```
**Étape 4 : Créer une alarme composite**
```python
# Create multiple condition alarms first
cloudwatch.put_metric_alarm(
    AlarmName='HighCartAbandonment',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='CartAbandonmentRate',
    Namespace='CustomApp/Business',
    Period=300,
    Statistic='Average',
    Threshold=25,  # > 25%
    Dimensions=[{'Name': 'Environment', 'Value': 'Production'}]
)

cloudwatch.put_metric_alarm(
    AlarmName='LowRevenue',
    ComparisonOperator='LessThanThreshold',
    EvaluationPeriods=2,
    MetricName='Revenue',
    Namespace='CustomApp/Business',
    Period=300,
    Statistic='Sum',
    Threshold=1000,  # < $1000 in 5 min
    Dimensions=[{'Name': 'Environment', 'Value': 'Production'}]
)

# Create composite alarm
cloudwatch.put_composite_alarm(
    AlarmName='BusinessImpact',
    AlarmRule='ALARM(LowOrderVolume) AND (ALARM(HighCartAbandonment) OR ALARM(LowRevenue))',
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:critical-business-alerts'],
    AlarmDescription='Composite alarm: Low orders + (high abandonment OR low revenue)',
    Tags=[
        {'Key': 'Severity', 'Value': 'Critical'},
        {'Key': 'Team', 'Value': 'Business'}
    ]
)

print("Created composite alarm: BusinessImpact")
```
### Lab 2 : Analyse des journaux avec des filtres de métriques

**Objectif :** Extrayez les métriques des journaux d'application et créez des alarmes.

**Étape 1 : Créer un groupe de journaux et publier des journaux**
```python
logs = boto3.client('logs')

# Create log group
log_group_name = '/application/production'

try:
    logs.create_log_group(logGroupName=log_group_name)
    print(f"Created log group: {log_group_name}")
except logs.exceptions.ResourceAlreadyExistsException:
    print(f"Log group already exists: {log_group_name}")

# Set retention
logs.put_retention_policy(
    logGroupName=log_group_name,
    retentionInDays=30  # 30 days retention
)

# Create log stream
log_stream_name = f"instance-{datetime.now().strftime('%Y-%m-%d')}"

logs.create_log_stream(
    logGroupName=log_group_name,
    logStreamName=log_stream_name
)

# Publish log events
import json

log_events = [
    {
        'timestamp': int(datetime.utcnow().timestamp() * 1000),
        'message': json.dumps({
            'level': 'INFO',
            'message': 'Request processed successfully',
            'duration': 150,
            'status': 200,
            'endpoint': '/api/orders'
        })
    },
    {
        'timestamp': int((datetime.utcnow().timestamp() + 1) * 1000),
        'message': json.dumps({
            'level': 'ERROR',
            'message': 'Database connection failed',
            'duration': 5000,
            'status': 500,
            'endpoint': '/api/orders',
            'error': 'ConnectionTimeout'
        })
    },
    {
        'timestamp': int((datetime.utcnow().timestamp() + 2) * 1000),
        'message': json.dumps({
            'level': 'WARN',
            'message': 'Slow query detected',
            'duration': 3500,
            'status': 200,
            'endpoint': '/api/products'
        })
    }
]

logs.put_log_events(
    logGroupName=log_group_name,
    logStreamName=log_stream_name,
    logEvents=log_events
)

print(f"Published {len(log_events)} log events")
```
**Étape 2 : Créer des filtres de métriques**
```python
# Metric filter 1: Count errors
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='ErrorCount',
    filterPattern='{ $.level = "ERROR" }',
    metricTransformations=[
        {
            'metricName': 'ApplicationErrors',
            'metricNamespace': 'CustomApp/Logs',
            'metricValue': '1',
            'defaultValue': 0,
            'unit': 'Count'
        }
    ]
)

print("Created metric filter: ErrorCount")

# Metric filter 2: Track slow requests
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='SlowRequests',
    filterPattern='{ $.duration > 3000 }',
    metricTransformations=[
        {
            'metricName': 'SlowRequests',
            'metricNamespace': 'CustomApp/Logs',
            'metricValue': '1',
            'defaultValue': 0,
            'unit': 'Count'
        }
    ]
)

print("Created metric filter: SlowRequests")

# Metric filter 3: Extract response time values
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='ResponseTime',
    filterPattern='{ $.duration = * }',
    metricTransformations=[
        {
            'metricName': 'ResponseTime',
            'metricNamespace': 'CustomApp/Logs',
            'metricValue': '$.duration',
            'unit': 'Milliseconds'
        }
    ]
)

print("Created metric filter: ResponseTime")

# Metric filter 4: Count errors by endpoint
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='ErrorsByEndpoint',
    filterPattern='{ $.level = "ERROR" }',
    metricTransformations=[
        {
            'metricName': 'ErrorsByEndpoint',
            'metricNamespace': 'CustomApp/Logs',
            'metricValue': '1',
            'defaultValue': 0,
            'dimensions': {
                'Endpoint': '$.endpoint'
            }
        }
    ]
)

print("Created metric filter: ErrorsByEndpoint")
```
**Étape 3 : Créer des alarmes sur les métriques extraites**
```python
# Alarm on error count
cloudwatch.put_metric_alarm(
    AlarmName='HighErrorRate',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='ApplicationErrors',
    Namespace='CustomApp/Logs',
    Period=300,
    Statistic='Sum',
    Threshold=10,  # > 10 errors in 5 minutes
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:error-alerts'],
    AlarmDescription='Alert on high application error rate',
    TreatMissingData='notBreaching'
)

# Alarm on slow requests
cloudwatch.put_metric_alarm(
    AlarmName='HighSlowRequestRate',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=1,
    MetricName='SlowRequests',
    Namespace='CustomApp/Logs',
    Period=300,
    Statistic='Sum',
    Threshold=5,  # > 5 slow requests in 5 minutes
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:performance-alerts']
)

# Alarm on p99 response time
cloudwatch.put_metric_alarm(
    AlarmName='HighP99ResponseTime',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='ResponseTime',
    Namespace='CustomApp/Logs',
    Period=300,
    ExtendedStatistic='p99',
    Threshold=2000,  # p99 > 2 seconds
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:latency-alerts']
)

print("Created alarms on extracted metrics")
```
### Atelier 3 : Requêtes CloudWatch Logs Insights

**Objectif :** Analysez les journaux avec CloudWatch Logs Insights.

**Étape 1 : Exécuter des requêtes Insights**
```python
# Query 1: Count errors by type
query = """
fields @timestamp, @message
| parse @message '{"level":"*","error":"*"' as level, error
| filter level = "ERROR"
| stats count() as error_count by error
| sort error_count desc
"""

response = logs.start_query(
    logGroupName='/application/production',
    startTime=int((datetime.utcnow() - timedelta(hours=24)).timestamp()),
    endTime=int(datetime.utcnow().timestamp()),
    queryString=query
)

query_id = response['queryId']

# Wait for query completion
import time
while True:
    result = logs.get_query_results(queryId=query_id)
    status = result['status']
    
    if status == 'Complete':
        break
    elif status == 'Failed':
        print(f"Query failed: {result.get('statistics', {})}")
        break
    
    time.sleep(1)

# Print results
print("Top Errors:")
for row in result['results']:
    error = next((field['value'] for field in row if field['field'] == 'error'), None)
    count = next((field['value'] for field in row if field['field'] == 'error_count'), None)
    print(f"  {error}: {count} occurrences")

# Query 2: Average response time by endpoint
query2 = """
fields @timestamp, @message
| parse @message '{"duration":*,"endpoint":"*"' as duration, endpoint
| stats avg(duration) as avg_response_time by endpoint
| sort avg_response_time desc
"""

response2 = logs.start_query(
    logGroupName='/application/production',
    startTime=int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
    endTime=int(datetime.utcnow().timestamp()),
    queryString=query2
)

# ... (wait for completion and print results)

# Query 3: Find requests taking > 3 seconds
query3 = """
fields @timestamp, @message
| parse @message '{"duration":*,"endpoint":"*","status":*}' as duration, endpoint, status
| filter duration > 3000
| sort duration desc
| limit 20
"""

# Query 4: Error rate over time (5-minute buckets)
query4 = """
fields @timestamp, @message
| parse @message '{"level":"*"}' as level
| stats count() as total, sum(level = "ERROR") as errors by bin(5m)
| fields errors / total * 100 as error_rate, bin(5m) as time
"""
```
## Connaissances au niveau de la production

### Architecture de journalisation centralisée

**Agrégation de journaux multi-comptes :**
```
Centralized Logging Pattern:

Account Structure:
├── Production Account (123456789012)
│   └── Applications → CloudWatch Logs
├── Development Account (234567890123)
│   └── Applications → CloudWatch Logs
└── Log Archive Account (345678901234)
    └── Centralized Log Storage (S3)

Architecture:

Production/Dev Accounts:
CloudWatch Logs → Subscription Filter → Kinesis Data Firehose
                                              ↓
                        Log Archive Account: S3 Bucket
                                              ↓
                        Query with Athena / Export to Glacier

Implementation:

Step 1: Create Cross-Account IAM Role (Log Archive Account)
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "logs.amazonaws.com"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id"
      }
    }
  }]
}

Step 2: Create Kinesis Firehose (Log Archive Account)
- Destination: S3 bucket
- Buffer: 5 MB or 300 seconds
- Compression: GZIP
- Encryption: SSE-KMS

Step 3: Create Subscription Filter (Production Account)
logs.put_subscription_filter(
    logGroupName='/application/production',
    filterName='ForwardToArchive',
    filterPattern='',  # All logs
    destinationArn='arn:aws:firehose:region:345678901234:deliverystream/logs',
    roleArn='arn:aws:iam::345678901234:role/CloudWatchLogsRole'
)

Benefits:
✓ Centralized compliance and audit
✓ Long-term retention at lower cost (S3/Glacier)
✓ Cross-account log analysis
✓ Security isolation (read-only access)
✓ Consistent retention policies

Cost Optimization:
- Kinesis Firehose: $0.029 per GB
- S3 Standard: $0.023 per GB-month
- Glacier: $0.004 per GB-month (long-term)
- Query with Athena: $5 per TB scanned
```
**Enrichissement et transformation des journaux :**
```
Enrich Logs with Lambda:

CloudWatch Logs → Subscription Filter → Lambda → Kinesis Firehose → S3

Lambda Transformation:
def lambda_handler(event, context):
    """Enrich and transform log records"""
    
    output_records = []
    
    for record in event['records']:
        # Decode log data
        payload = base64.b64decode(record['data'])
        log_data = json.loads(payload)
        
        # Enrich with metadata
        enriched = {
            **log_data,
            'account_id': context.invoked_function_arn.split(':')[4],
            'region': os.environ['AWS_REGION'],
            'environment': 'production',
            'processing_timestamp': datetime.utcnow().isoformat()
        }
        
        # Add derived fields
        if 'duration' in enriched:
            enriched['is_slow'] = enriched['duration'] > 3000
        
        # Mask sensitive data
        if 'credit_card' in enriched:
            enriched['credit_card'] = enriched['credit_card'][-4:].rjust(16, '*')
        
        # Re-encode
        output_data = base64.b64encode(json.dumps(enriched).encode('utf-8')).decode('utf-8')
        
        output_records.append({
            'recordId': record['recordId'],
            'result': 'Ok',
            'data': output_data
        })
    
    return {'records': output_records}

Benefits:
✓ Consistent metadata across all logs
✓ PII masking for compliance
✓ Derived fields for analysis
✓ Standardized format
```
### Surveillance et alertes SLA

**Définition et suivi des SLA :**
```
SLA (Service Level Agreement) Metrics:

Availability SLA: 99.9% uptime
Latency SLA: p99 < 500ms
Error Rate SLA: < 0.1%

Implementation:

1. Availability Monitoring:
   - Health check every 60 seconds
   - Alarm on 3 consecutive failures
   - Calculate monthly uptime percentage

Metric: HealthCheckStatus
Target: > 99.9% (43 minutes max downtime/month)

cloudwatch.put_metric_alarm(
    AlarmName='SLA-Availability-Breach',
    MetricName='HealthCheckStatus',
    Namespace='AWS/Route53',
    Statistic='Average',
    Period=300,
    EvaluationPeriods=3,
    Threshold=1,
    ComparisonOperator='LessThanThreshold',
    AlarmActions=['arn:aws:sns:region:account:sla-breach-alerts']
)

2. Latency SLA:
   - Monitor p99 response time
   - Alert if exceeds threshold

Metric: ResponseTime (from logs)
Target: p99 < 500ms

cloudwatch.put_metric_alarm(
    AlarmName='SLA-Latency-Breach',
    MetricName='ResponseTime',
    Namespace='CustomApp/Performance',
    ExtendedStatistic='p99',
    Period=300,
    EvaluationPeriods=2,
    Threshold=500,
    ComparisonOperator='GreaterThanThreshold'
)

3. Error Rate SLA:
   - Calculate: Errors / Total Requests * 100
   - Alert if exceeds 0.1%

Metric Math:
Expression: errors/requests*100
Threshold: 0.1%

cloudwatch.put_metric_alarm(
    AlarmName='SLA-ErrorRate-Breach',
    Metrics=[
        {
            'Id': 'errors',
            'MetricStat': {
                'Metric': {
                    'Namespace': 'AWS/ApplicationELB',
                    'MetricName': 'HTTPCode_Target_5XX_Count'
                },
                'Period': 300,
                'Stat': 'Sum'
            }
        },
        {
            'Id': 'requests',
            'MetricStat': {
                'Metric': {
                    'Namespace': 'AWS/ApplicationELB',
                    'MetricName': 'RequestCount'
                },
                'Period': 300,
                'Stat': 'Sum'
            }
        },
        {
            'Id': 'error_rate',
            'Expression': 'errors/requests*100'
        }
    ],
    EvaluationPeriods=2,
    Threshold=0.1,
    ComparisonOperator='GreaterThanThreshold',
    AlarmActions=['arn:aws:sns:region:account:sla-breach-alerts']
)

SLA Dashboard:
- Current availability % (month-to-date)
- p99 latency (real-time)
- Error rate % (real-time)
- SLA credits owed (if breached)
- Time to next SLA reset (monthly)

Automated SLA Reporting:
Lambda function (scheduled monthly):
1. Query CloudWatch metrics for month
2. Calculate availability, latency, error rate
3. Generate SLA report
4. Send to stakeholders
5. Calculate SLA credits if applicable
```
### Stratégies d'optimisation des coûts

**Gestion des coûts CloudWatch :**
```
CloudWatch Pricing:

Metrics:
- First 10 custom metrics: Free
- Standard resolution: $0.30/metric/month
- High resolution: $0.30/metric/month
- API requests: $0.01 per 1,000 requests

Logs:
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB-month
- Query (Insights): $0.005 per GB scanned

Dashboards:
- First 3 dashboards: Free
- Additional: $3/dashboard/month

Alarms:
- Standard metric alarms: $0.10/alarm/month
- High-resolution alarms: $0.30/alarm/month
- Composite alarms: $0.50/alarm/month

Cost Optimization Strategies:

1. Log Retention Policies:
   Problem: Indefinite retention = growing costs
   Solution: Set appropriate retention

Production logs: 30 days
Development logs: 7 days
Debug logs: 3 days

# Set retention
logs.put_retention_policy(
    logGroupName='/application/production',
    retentionInDays=30
)

Savings: 90% reduction (30 days vs indefinite)

2. Export to S3 for Long-Term Storage:
   CloudWatch: $0.03 per GB-month
   S3 Standard: $0.023 per GB-month
   S3 Glacier: $0.004 per GB-month

# Export old logs to S3
logs.create_export_task(
    logGroupName='/application/production',
    fromTime=int((datetime.utcnow() - timedelta(days=30)).timestamp() * 1000),
    to=int((datetime.utcnow() - timedelta(days=7)).timestamp() * 1000),
    destination='my-log-archive-bucket',
    destinationPrefix='cloudwatch-logs/'
)

Savings: 87% (Glacier vs CloudWatch)

3. Use Metric Filters Instead of Custom Metrics:
   Problem: Publishing custom metrics for every log pattern
   Cost: $0.30/metric/month each
   
   Solution: One metric filter extracts multiple metrics
   Cost: Free (included with logs)

4. Consolidate Similar Metrics:
   Bad: 100 metrics per EC2 instance
   Good: 5 key metrics per instance, detailed metrics on-demand

5. Use Anomaly Detection:
   - Reduces false positives
   - Fewer alert actions (SNS costs)
   - Less investigation time

6. Delete Unused Resources:
   - Orphaned log groups (deleted applications)
   - Unused dashboards
   - Inactive alarms

# Find empty log groups
paginator = logs.get_paginator('describe_log_groups')
for page in paginator.paginate():
    for log_group in page['logGroups']:
        if log_group.get('storedBytes', 0) == 0:
            print(f"Empty log group: {log_group['logGroupName']}")
            # Consider deletion

Monthly Cost Example:

Before Optimization:
- 1,000 custom metrics: $300
- 100 GB logs (indefinite retention): $3
- 20 dashboards: $51
- 500 alarms: $50
Total: $404/month

After Optimization:
- 200 custom metrics: $60
- 100 GB logs (30-day retention): $3
- 5 dashboards: Free
- 100 alarms (consolidated): $10
Total: $73/month

Savings: $331/month (82%)
```
## Conseils \& Bonnes pratiques

### Meilleures pratiques en matière de métriques

**Astuce 1 : Utilisez des métriques haute résolution pour la surveillance en temps réel**
La résolution d’une seconde permet une réponse rapide de mise à l’échelle automatique, essentielle pour les charges de travail pointues.

**Astuce 2 : Publiez des métriques avec des horodatages cohérents**
Utilisez les horodatages UTC, et non l'heure locale, pour éviter les problèmes d'heure d'été et la confusion des fuseaux horaires.

**Astuce 3 : Utilisez les dimensions à bon escient**
Ajoutez des dimensions pour le filtrage (environnement, région), mais pas trop (l'explosion des combinaisons de métriques augmente le coût).

**Astuce 4 : Tirez parti des mathématiques métriques pour les métriques dérivées**
Calculez les taux d'erreur et les pourcentages d'utilisation des alarmes : pas besoin de publier des métriques personnalisées supplémentaires.

**Astuce 5 : Utilisez les statistiques étendues (percentiles) pour la latence**
Latence p99 plus significative que la moyenne : la moyenne masque les valeurs aberrantes affectant l'expérience utilisateur.

### Bonnes pratiques de journalisation

**Astuce 6 : implémentez la journalisation structurée (JSON)**
Journaux JSON faciles à analyser avec Logs Insights : permet des requêtes et des analyses puissantes.

**Astuce 7 : Inclure les ID de demande/trace dans tous les journaux**
Corrélation entre les services distribués : essentielle pour le dépannage des microservices.

**Astuce 8 : Connectez-vous aux niveaux appropriés**
DEBUG pour le développement, INFO pour la production, ERROR toujours : évite l'explosion du volume de journaux.

**Astuce 9 : Utilisez l'échantillonnage de journaux pour les systèmes à volume élevé**
Enregistrez 1 à 10 % des demandes réussies, 100 % des erreurs : réduit les coûts tout en conservant la visibilité.

**Astuce 10 : Désinfectez les données sensibles avant de les enregistrer**
N’enregistrez jamais vos informations personnelles, vos informations d’identification, vos cartes de crédit : violations de conformité et risques de sécurité.

### Meilleures pratiques en matière d'alarme

**Astuce 11 : Utilisez des alarmes composites pour réduire les faux positifs**
Nécessite plusieurs conditions (CPU élevé ET mémoire élevée) : réduction de plus de 90 % des faux positifs.

**Astuce 12 : Définissez des périodes d'évaluation appropriées**
2 à 3 périodes empêchent les pics transitoires de déclencher des alarmes et équilibrent la réactivité et la stabilité.

**Astuce 13 : Configurez les actions d'alarme pour chaque état**
État ALARME : page d'appel, état OK : envoyer une notification de récupération : gestion complète du cycle de vie.

**Astuce 14 : Utilisez la détection d'anomalies pour les métriques comportant des modèles**
ML apprend les modèles quotidiens/hebdomadaires et élimine le réglage manuel des seuils.

**Astuce 15 : Testez les alarmes avant la production**
Définissez manuellement l'état de l'alarme pour vérifier les actions : évite les surprises « l'alarme ne fonctionne pas » lors d'incidents réels.

## Pièges \& Remèdes

### Piège 1 : coûts excessifs de conservation des journaux

**Problème :** Les coûts de stockage des journaux CloudWatch augmentent de manière inattendue, consommant une part importante de la facture AWS.

**Pourquoi cela arrive :**

- Rétention par défaut : n'expire jamais (indéfinie)
- Journalisation intensive des applications à grand volume
- Rétention non vérifiée après la configuration initiale
- Journaux de développement/débogage conservés inutilement
- Groupes de journaux oubliés des applications supprimées

**Impact :**

- Coûts mensuels augmentant de 10 à 50 % par mois
- Dépassements de budget
- Stockage consommateur de données inutilisées
- Risques de conformité (conservation des données trop longtemps)

**Exemple :**
```
Application: 100 GB logs/month
Retention: Indefinite (default)
Month 1: 100 GB × $0.03 = $3
Month 12: 1,200 GB × $0.03 = $36
Month 24: 2,400 GB × $0.03 = $72
Annual cost year 2: $864 (growing continuously)
```
**Remède :**

**Étape 1 : Auditer tous les groupes de journaux**
```python
def audit_log_retention():
    """Audit log retention and storage costs"""
    
    logs = boto3.client('logs')
    
    # Get all log groups
    paginator = logs.get_paginator('describe_log_groups')
    
    total_size = 0
    no_retention_count = 0
    recommendations = []
    
    for page in paginator.paginate():
        for log_group in page['logGroups']:
            name = log_group['logGroupName']
            size_bytes = log_group.get('storedBytes', 0)
            size_gb = size_bytes / (1024**3)
            retention = log_group.get('retentionInDays', 'Never Expire')
            
            total_size += size_gb
            
            if retention == 'Never Expire':
                no_retention_count += 1
                monthly_cost = size_gb * 0.03
                
                # Recommend retention based on log group type
                if '/aws/lambda/' in name or 'dev' in name.lower():
                    recommended_retention = 7
                elif 'prod' in name.lower():
                    recommended_retention = 30
                else:
                    recommended_retention = 14
                
                recommendations.append({
                    'log_group': name,
                    'size_gb': size_gb,
                    'monthly_cost': monthly_cost,
                    'current_retention': retention,
                    'recommended_retention': recommended_retention
                })
    
    print(f"Total log storage: {total_size:.2f} GB")
    print(f"Monthly storage cost: ${total_size * 0.03:.2f}")
    print(f"Log groups without retention: {no_retention_count}")
    
    print("\nTop 10 Cost Reduction Opportunities:")
    recommendations.sort(key=lambda x: x['monthly_cost'], reverse=True)
    
    for rec in recommendations[:10]:
        print(f"\nLog Group: {rec['log_group']}")
        print(f"  Size: {rec['size_gb']:.2f} GB")
        print(f"  Cost: ${rec['monthly_cost']:.2f}/month")
        print(f"  Recommendation: Set retention to {rec['recommended_retention']} days")
    
    return recommendations

# Run audit
recommendations = audit_log_retention()
```
**Étape 2 : Mettre en œuvre des politiques de rétention**
```python
def set_retention_policies(recommendations):
    """Apply retention policies to reduce costs"""
    
    logs = boto3.client('logs')
    
    savings = 0
    
    for rec in recommendations:
        log_group = rec['log_group']
        retention_days = rec['recommended_retention']
        
        try:
            logs.put_retention_policy(
                logGroupName=log_group,
                retentionInDays=retention_days
            )
            
            # Calculate savings (keep only retention days vs indefinite)
            current_cost = rec['monthly_cost']
            new_cost = current_cost * (retention_days / 365)  # Approximate
            monthly_savings = current_cost - new_cost
            
            savings += monthly_savings
            
            print(f"Set {log_group} retention to {retention_days} days")
            print(f"  Monthly savings: ${monthly_savings:.2f}")
        
        except Exception as e:
            print(f"Error setting retention for {log_group}: {e}")
    
    print(f"\nTotal monthly savings: ${savings:.2f}")
    print(f"Annual savings: ${savings * 12:.2f}")

# Apply retention policies
set_retention_policies(recommendations)
```
**Étape 3 : Exporter les anciens journaux vers S3**
```python
def export_old_logs_to_s3(log_group_name, days_old=30):
    """Export logs older than N days to S3 for cheaper storage"""
    
    logs = boto3.client('logs')
    
    # Calculate time range
    to_time = datetime.utcnow() - timedelta(days=7)  # Keep last 7 days in CloudWatch
    from_time = to_time - timedelta(days=days_old)
    
    # Export to S3
    response = logs.create_export_task(
        logGroupName=log_group_name,
        fromTime=int(from_time.timestamp() * 1000),
        to=int(to_time.timestamp() * 1000),
        destination='log-archive-bucket',
        destinationPrefix=f"cloudwatch/{log_group_name.replace('/', '-')}/"
    )
    
    task_id = response['taskId']
    
    print(f"Export task created: {task_id}")
    print(f"Exporting logs from {from_time} to {to_time}")
    print(f"Destination: s3://log-archive-bucket/cloudwatch/...")
    
    # After export completes, logs can be deleted from CloudWatch
    # Storage cost: CloudWatch $0.03/GB-month → S3 $0.023/GB-month
    # Query with Athena when needed

# Export old logs
export_old_logs_to_s3('/application/production', days_old=30)
```
**Étape 4 : Automatiser la gestion du cycle de vie**
```python
# Lambda function (scheduled monthly)
def lambda_handler(event, context):
    """Automated log lifecycle management"""
    
    logs = boto3.client('logs')
    
    # Policy matrix
    retention_policies = {
        'production': 30,
        'staging': 14,
        'development': 7,
        'lambda': 7,
        'test': 3
    }
    
    # Get all log groups
    paginator = logs.get_paginator('describe_log_groups')
    
    for page in paginator.paginate():
        for log_group in page['logGroups']:
            name = log_group['logGroupName']
            current_retention = log_group.get('retentionInDays')
            
            # Determine appropriate retention
            retention = None
            for key, days in retention_policies.items():
                if key in name.lower():
                    retention = days
                    break
            
            if retention is None:
                retention = 14  # Default
            
            # Apply if different
            if current_retention != retention:
                logs.put_retention_policy(
                    logGroupName=name,
                    retentionInDays=retention
                )
                print(f"Updated {name}: {current_retention} → {retention} days")
    
    return {'statusCode': 200}

# Schedule with EventBridge: rate(30 days)
```
**Prévention :**

- Définir la politique de rétention immédiatement lors de la création de groupes de journaux
- Exigences de conservation des documents par environnement
- Audits réguliers (mensuels) des coûts de stockage des logs
- Exporter vers S3 pour les exigences de conformité à long terme
- Supprimer les groupes de journaux pour les applications supprimées
- Utiliser les balises de répartition des coûts CloudWatch

***

### Piège 2 : défis liés au réglage des seuils d'alarme

**Problème :** Les alarmes se déclenchent soit trop fréquemment (faux positifs), soit pas du tout (faux négatifs), ce qui les rend inutiles.

**Pourquoi cela arrive :**

- Les seuils statiques ne tiennent pas compte des modèles de charge de travail
- Aucune analyse des métriques de base avant de définir des seuils
- Les modèles de trafic quotidiens/hebdomadaires ne sont pas pris en compte
- Des seuils basés sur des suppositions et non sur des données
- Aucun test des alarmes avant production

**Impact :**

- Fatigue d'alerte due aux faux positifs
- L'équipe ignore les alertes critiques
- De vrais problèmes manqués (faux négatifs)
- Temps perdu à enquêter sur des non-problèmes
- Perte de confiance dans le suivi

**Exemple :**
```
Alarm: CPU > 80%
Monday-Friday 9am-5pm: 70-90% CPU (normal business hours)
  → Constant alarms during business hours (false positive)
Monday-Friday 6pm-8am: 10-20% CPU (off hours)
Saturday-Sunday: 5% CPU
  → 80% threshold never breaches during off hours
Real issue at 3am: CPU 78% (below threshold, not detected)
```
**Remède :**

**Étape 1 : Analyser les données historiques**
```python
def analyze_metric_patterns(metric_name, namespace, days=30):
    """Analyze historical metric data to determine appropriate thresholds"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Query historical data
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)
    
    response = cloudwatch.get_metric_statistics(
        Namespace=namespace,
        MetricName=metric_name,
        StartTime=start_time,
        EndTime=end_time,
        Period=300,  # 5-minute periods
        Statistics=['Average', 'Maximum'],
        ExtendedStatistics=['p95', 'p99']
    )
    
    # Calculate statistics
    averages = [dp['Average'] for dp in response['Datapoints']]
    maximums = [dp['Maximum'] for dp in response['Datapoints']]
    p95s = [dp['ExtendedStatistics']['p95'] for dp in response['Datapoints'] if 'ExtendedStatistics' in dp]
    
    import statistics
    
    avg_mean = statistics.mean(averages)
    avg_stddev = statistics.stdev(averages)
    max_mean = statistics.mean(maximums)
    p95_mean = statistics.mean(p95s) if p95s else None
    
    print(f"Metric: {metric_name}")
    print(f"Analysis period: {days} days")
    print(f"\nAverage statistic:")
    print(f"  Mean: {avg_mean:.2f}")
    print(f"  Std Dev: {avg_stddev:.2f}")
    print(f"  Suggested threshold (mean + 2σ): {avg_mean + 2 * avg_stddev:.2f}")
    print(f"\nMaximum statistic:")
    print(f"  Mean: {max_mean:.2f}")
    print(f"\np95 statistic:")
    print(f"  Mean: {p95_mean:.2f}" if p95_mean else "  No data")
    
    # Recommendation
    recommended_threshold = avg_mean + 2 * avg_stddev  # 2 standard deviations
    
    print(f"\nRecommendation: Set alarm threshold to {recommended_threshold:.2f}")
    print(f"This captures 95% of normal behavior as OK")
    
    return recommended_threshold

# Analyze before setting alarms
threshold = analyze_metric_patterns('CPUUtilization', 'AWS/EC2', days=30)
```
**Étape 2 : Utiliser la détection des anomalies**
```python
# Instead of static threshold, use ML-based anomaly detection
def create_anomaly_detection_alarm(metric_name, namespace, dimensions):
    """Create alarm with automatic threshold learning"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    cloudwatch.put_metric_alarm(
        AlarmName=f'{metric_name}-AnomalyDetection',
        ComparisonOperator='LessThanLowerOrGreaterThanUpperThreshold',
        EvaluationPeriods=2,
        Metrics=[
            {
                'Id': 'm1',
                'ReturnData': True,
                'MetricStat': {
                    'Metric': {
                        'Namespace': namespace,
                        'MetricName': metric_name,
                        'Dimensions': dimensions
                    },
                    'Period': 300,
                    'Stat': 'Average'
                }
            },
            {
                'Id': 'ad1',
                'Expression': 'ANOMALY_DETECTION_BAND(m1, 2)',  # 2 std deviations
                'Label': 'Normal range (expected)'
            }
        ],
        ThresholdMetricId='ad1',
        ActionsEnabled=True,
        AlarmActions=['arn:aws:sns:region:account:alerts'],
        AlarmDescription=f'Anomaly detection for {metric_name}'
    )
    
    print(f"Created anomaly detection alarm for {metric_name}")
    print("CloudWatch will learn normal patterns over 2 weeks")
    print("Automatically adjusts for daily/weekly cycles")

# Create anomaly-based alarm
create_anomaly_detection_alarm(
    'CPUUtilization',
    'AWS/EC2',
    [{'Name': 'InstanceId', 'Value': 'i-1234567890abcdef0'}]
)
```
**Étape 3 : Mettre en œuvre la répartition horaire (seuils basés sur le temps)**
```python
# Different thresholds for business hours vs off-hours
def create_time_aware_alarms():
    """Create separate alarms for different time periods"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Business hours alarm (stricter)
    business_hours_filter = {
        'Id': 'filtered',
        'Expression': 'IF(HOUR(m1) >= 9 AND HOUR(m1) < 17, m1, 0)'
    }
    
    cloudwatch.put_metric_alarm(
        AlarmName='HighCPU-BusinessHours',
        ComparisonOperator='GreaterThanThreshold',
        EvaluationPeriods=2,
        Metrics=[
            {
                'Id': 'm1',
                'ReturnData': False,
                'MetricStat': {
                    'Metric': {
                        'Namespace': 'AWS/EC2',
                        'MetricName': 'CPUUtilization'
                    },
                    'Period': 300,
                    'Stat': 'Average'
                }
            },
            business_hours_filter
        ],
        Threshold=90,  # Higher threshold during business hours (expected high load)
        AlarmActions=['arn:aws:sns:region:account:business-hours-alerts']
    )
    
    # Off-hours alarm (stricter - unexpected load)
    off_hours_filter = {
        'Id': 'filtered',
        'Expression': 'IF(HOUR(m1) < 9 OR HOUR(m1) >= 17, m1, 0)'
    }
    
    cloudwatch.put_metric_alarm(
        AlarmName='HighCPU-OffHours',
        ComparisonOperator='GreaterThanThreshold',
        EvaluationPeriods=1,  # Faster response
        Metrics=[
            {
                'Id': 'm1',
                'ReturnData': False,
                'MetricStat': {
                    'Metric': {
                        'Namespace': 'AWS/EC2',
                        'MetricName': 'CPUUtilization'
                    },
                    'Period': 300,
                    'Stat': 'Average'
                }
            },
            off_hours_filter
        ],
        Threshold=40,  # Lower threshold off-hours (unexpected)
        AlarmActions=['arn:aws:sns:region:account:critical-alerts']
    )

# Create time-aware alarms
create_time_aware_alarms()
```
**Étape 4 : tester les alarmes avant la production**
```python
def test_alarm(alarm_name):
    """Test alarm by manually setting state"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Set alarm to ALARM state manually
    cloudwatch.set_alarm_state(
        AlarmName=alarm_name,
        StateValue='ALARM',
        StateReason='Testing alarm actions'
    )
    
    print(f"Alarm {alarm_name} set to ALARM state")
    print("Verify that:")
    print("1. SNS notification received")
    print("2. PagerDuty/Slack alert triggered")
    print("3. Correct team notified")
    print("4. Runbook link accessible")
    
    # Wait for verification
    input("Press Enter after verifying actions...")
    
    # Set back to OK
    cloudwatch.set_alarm_state(
        AlarmName=alarm_name,
        StateValue='OK',
        StateReason='Test complete'
    )
    
    print("Alarm reset to OK state")

# Test alarm
test_alarm('HighCPU-BusinessHours')
```
**Prévention :**

- Analyser 30 jours de données historiques avant de fixer des seuils
- Utiliser la détection d'anomalies pour les métriques avec des modèles
- Implémenter des alarmes composites pour réduire les faux positifs
- Testez toutes les alarmes avant d'activer les actions
- Examiner et régler les alarmes tous les trimestres
- Justification du seuil de documentation
- Utiliser les mathématiques métriques pour les seuils dérivés

***

## Résumé du chapitre

Amazon CloudWatch offre une observabilité complète sur l'infrastructure et les applications AWS via des métriques, des journaux, des alarmes et des tableaux de bord unifiés. CloudWatch collecte automatiquement les métriques de plus de 80 services AWS sans configuration, regroupe les journaux de toutes les sources avec de puissantes capacités de requête via Logs Insights, déclenche des alarmes intelligentes avec détection d'anomalies pour réduire les faux positifs et visualise l'état du système via des tableaux de bord personnalisables. Les fonctionnalités avancées incluent Container Insights pour ECS/EKS, Lambda Insights pour l'optimisation des fonctions, Contributor Insights pour identifier les principaux consommateurs de ressources et une intégration transparente de X-Ray pour le traçage distribué.

**Principaux points à retenir :**

- **Tirez parti des métriques automatiques :** plus de 80 services AWS publient automatiquement des métriques ; aucun agent requis pour EC2, RDS, Lambda, DynamoDB, etc.
- **Mettre en œuvre la journalisation structurée :** Utilisez le format JSON pour les journaux ; permet de puissantes requêtes Logs Insights pour extraire des métriques, calculer des agrégations et analyser des modèles
- **Utilisez des alarmes composites :** Combinez plusieurs conditions pour réduire les faux positifs de 90 % ; évite la fatigue d’alerte tout en maintenant la visibilité
- **Activer la détection des anomalies :** ML apprend automatiquement les modèles normaux et s'ajuste aux cycles quotidiens/hebdomadaires ; élimine le réglage manuel du seuil
- **Optimiser la conservation des journaux :** Définir une conservation de 30 jours pour la production et 7 jours pour le développement ; exporter vers S3 pour un stockage à long terme (réduction des coûts de 75 %)
- **Surveillez les SLA en continu :** Suivez la disponibilité, la latence (p99), le taux d'erreur ; automatisez les rapports SLA mensuels avec les métriques CloudWatch
- **Utilisez les filtres de métriques de manière stratégique :** Extrayez les métriques des journaux sans publier de métriques personnalisées ; réduit les coûts tout en conservant la visibilité

CloudWatch s'intègre dans AWS : surveillance des fonctions Lambda, suivi des requêtes API Gateway, analyse des journaux WAF, regroupement des résultats GuardDuty et fourniture de tableaux de bord opérationnels pour des environnements entiers. Le chapitre suivant couvre AWS CloudTrail pour une journalisation d'audit complète de tous les appels d'API, permettant une analyse de sécurité, des rapports de conformité et une enquête médico-légale sur tous les services et comptes AWS.

## Exercice pratique en laboratoire

**Objectif :** Créez une pile de surveillance complète avec des métriques, des journaux, des alarmes et un tableau de bord opérationnel.

**Scénario :** Surveillez les applications Web avec des mesures commerciales personnalisées, des journaux d'applications, un suivi SLA et des alertes automatisées.

**Prérequis :**

- Compte AWS avec accès administrateur
- Application en cours d'exécution (EC2, Lambda ou ECS)

**Étapes :**

1. **Configurer des métriques personnalisées (30 minutes)**
    - Publier les métriques commerciales (commandes, revenus)
    - Publier les métriques de performances des applications (temps de réponse)
    - Activer la surveillance EC2 détaillée (intervalles de 1 minute)
    - Créer des métriques haute résolution pour un tableau de bord en temps réel
2. **Configurer la journalisation centralisée (40 minutes)**
    - Créer des groupes de journaux avec une conservation de 30 jours
    - Installer CloudWatch Unified Agent sur EC2
    - Configurer la journalisation structurée (format JSON)
    - Créer des filtres métriques (erreurs, requêtes lentes)
    - Ingestion du journal de test
3. **Créer des alarmes intelligentes (45 minutes)**
    - Créer des alarmes métriques standard (CPU, mémoire)
    - Créer des alarmes de détection d'anomalies (modèles de trafic)
    - Créer des alarmes composites (multi-conditions)
    - Configurer les notifications SNS
    - Tester les actions d'alarme
4. **Créer un tableau de bord opérationnel (30 minutes)**
    - Créer un tableau de bord de présentation de la production
    - Ajouter des métriques commerciales (commandes/min, revenus/heure)
    - Ajouter des métriques SLA (disponibilité, latence p99, taux d'erreur)
    - Ajouter des métriques d'infrastructure (CPU, mémoire, connexions)
    - Ajouter un widget d'état d'alarme
    - Partager le tableau de bord avec l'équipe
5. **Journaux de requêtes avec Insights (20 minutes)**
    - Écrire une requête pour l'analyse des erreurs
    - Calculer le temps de réponse moyen par point final
    - Trouver les requêtes les plus lentes (> 3 secondes)
    - Identifier les principaux messages d'erreur
    - Enregistrer les requêtes fréquemment utilisées

**Résultats attendus :**

- Observabilité complète dans les applications et l'infrastructure
- Alarmes intelligentes réduisant les faux positifs de 90 %
- Tableau de bord opérationnel montrant la santé en temps réel
- Requêtes de journal offrant un dépannage rapide
- Coût total : <\$50/mois pour une application typique


## Questions de révision

1. **Quelle est la résolution métrique par défaut pour les instances EC2 ?**
a) 1 minute
b) 5 minutes ✓
c) 15 minutes
d) 1 heure

**Réponse : B** - La surveillance standard EC2 collecte des métriques toutes les 5 minutes ; une surveillance détaillée permet des intervalles d'une minute

2. **Quelle est la conservation des journaux par défaut dans CloudWatch ?**
a) 7 jours
b) 30 jours
c) 1 an
d) Ne jamais expirer ✓

**Réponse : D** - La conservation par défaut est indéfinie (n'expire jamais) ; doit définir explicitement une politique de rétention pour contrôler les coûts

3. **Quelle statistique est la meilleure pour surveiller les SLA de latence ?**
a) Moyenne
b) Maximum
c) p99 ✓
d) Somme

**Réponse : C** - le centile p99 affiche la latence du 99e centile ; meilleur que la moyenne, ce qui masque les valeurs aberrantes lentes affectant les utilisateurs

4. **Combien de périodes d'évaluation sont recommandées pour les alarmes ?**
une) 1
b) 2-3 ✓
c)5
d) 10

**Réponse : B** - 2 à 3 périodes empêchent les pics transitoires de déclencher des alarmes tout en maintenant la réactivité

5. **Quel est le coût des requêtes CloudWatch Logs Insights ?**
a) Gratuit
b) \0,005 $ par Go numérisé ✓
c) \$0,10 par requête
d) \$1 par Go numérisé

**Réponse : B** - Logs Insights facture \$0,005 par Go de données de journal analysées pendant l'exécution de la requête.

6. **Sur quoi est basée la détection des anomalies CloudWatch ?**
a) Seuils statiques
b) Apprentissage automatique ✓
c) Configuration manuelle
d) Règles relatives aux tiers

**Réponse : B** – La détection des anomalies utilise le ML pour apprendre des modèles normaux sur 2 semaines, en s'ajustant automatiquement aux cycles.

7. **Quelle est la période de conservation maximale des métriques CloudWatch ?**
a) 30 jours
b) 90 jours
c) 1 an
d) 15 mois ✓

**Réponse : D** - CloudWatch conserve automatiquement les métriques pendant 15 mois

8. **À quoi servent les alarmes composites ?**
a) Combiner plusieurs métriques
b) Réduire les faux positifs ✓
c) Augmenter la vitesse de l'alarme
d) Réduire les coûts

**Réponse : B** - Les alarmes composites combinent plusieurs conditions avec une logique (ET/OU) pour réduire les faux positifs de plus de 90 %

9. **Qu'est-ce que la granularité métrique haute résolution ?**
a) 5 minutes
b) 1 minute
c) 1 seconde ✓
d) En temps réel

**Réponse : C** - Les métriques haute résolution prennent en charge une granularité d'une seconde ; utile pour les tableaux de bord en temps réel et la mise à l'échelle rapide

10. **Qu'arrive-t-il aux journaux lorsque la période de conservation expire ?**
a) Exporté automatiquement vers S3
b) Supprimé automatiquement ✓
c) Archivé dans Glacier
d) Marqué comme expiré mais conservé

**Réponse : B** - Journaux automatiquement supprimés après l'expiration de la période de conservation ; exporter vers S3 avant expiration si nécessaire

***
# Part 9: Monitoring \& Operations

# Chapter 26: CloudWatch

## Introduction

Modern cloud infrastructure generates millions of data points hourly—CPU utilization fluctuating across hundreds of instances, API calls succeeding or failing thousands of times per second, application logs streaming continuously from distributed microservices, and database queries executing with varying latency. Without comprehensive monitoring, organizations operate blind—unable to detect performance degradation, troubleshoot failures, optimize costs, or prove SLA compliance. Amazon CloudWatch provides unified observability across AWS infrastructure, applications, and services, collecting metrics, logs, and traces to transform raw data into actionable insights that prevent outages, reduce troubleshooting time from hours to minutes, and enable proactive optimization.

The cost of inadequate monitoring extends beyond technology incidents. Average application downtime costs \$300,000 per hour for enterprise organizations, with 80% of outages caused by preventable issues that monitoring could detect early. Traditional monitoring approaches—installing agents on every server, configuring custom dashboards per application, manually correlating logs across systems—cannot scale to cloud environments where infrastructure changes by the minute. CloudWatch eliminates this complexity through automatic metric collection from 80+ AWS services, centralized log aggregation with powerful query capabilities, intelligent alarms with anomaly detection, and customizable dashboards providing real-time visibility across entire environments.

This chapter builds on services covered throughout the handbook—CloudWatch monitors EC2 instances, tracks Lambda execution metrics, analyzes ALB request patterns, detects RDS performance issues, and aggregates logs from all sources. The integration is seamless: GuardDuty findings trigger CloudWatch alarms, WAF logs stream to CloudWatch Logs, SageMaker training jobs publish custom metrics, and Step Functions emit execution traces. The chapter covers CloudWatch architecture, metric types, log groups and streams, metric filters, alarms and composite alarms, dashboards, anomaly detection, CloudWatch Insights (Logs, Container, Lambda, Contributor), X-Ray tracing integration, centralized logging strategies, operational excellence patterns, and building production monitoring systems that detect issues before users notice, troubleshoot failures rapidly, and optimize continuously based on data.

## Theory \& Concepts

### CloudWatch Architecture

**Core Components:**

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


### CloudWatch Metrics

**Metric Types and Namespaces:**

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

**Metric Statistics and Aggregation:**

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


### CloudWatch Logs

**Log Groups and Streams:**

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

**Log Ingestion Methods:**

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


### Metric Filters

**Extracting Metrics from Logs:**

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


### CloudWatch Alarms

**Alarm Configuration:**

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

**Composite Alarms:**

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


### CloudWatch Logs Insights

**Query Language:**

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


### CloudWatch Dashboards

**Dashboard Components:**

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


### CloudWatch Insights Services

**Container Insights:**

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

**Lambda Insights:**

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

**Contributor Insights:**

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


## Hands-On Implementation

### Lab 1: Custom Metrics and Alarms

**Objective:** Publish custom application metrics and create intelligent alarms.

**Step 1: Publish Custom Metrics**

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

**Step 2: Create Standard Alarm**

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

**Step 3: Create Anomaly Detection Alarm**

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

**Step 4: Create Composite Alarm**

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


### Lab 2: Log Analysis with Metric Filters

**Objective:** Extract metrics from application logs and create alarms.

**Step 1: Create Log Group and Publish Logs**

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

**Step 2: Create Metric Filters**

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

**Step 3: Create Alarms on Extracted Metrics**

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


### Lab 3: CloudWatch Logs Insights Queries

**Objective:** Analyze logs with CloudWatch Logs Insights.

**Step 1: Run Insights Queries**

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


## Production-Level Knowledge

### Centralized Logging Architecture

**Multi-Account Log Aggregation:**

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

**Log Enrichment and Transformation:**

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


### SLA Monitoring and Alerting

**Defining and Monitoring SLAs:**

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


### Cost Optimization Strategies

**CloudWatch Cost Management:**

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


## Tips \& Best Practices

### Metrics Best Practices

**Tip 1: Use High-Resolution Metrics for Real-Time Monitoring**
1-second resolution enables rapid auto-scaling response—essential for spiky workloads.

**Tip 2: Publish Metrics with Consistent Timestamps**
Use UTC timestamps, not local time—avoids daylight saving issues and timezone confusion.

**Tip 3: Use Dimensions Wisely**
Add dimensions for filtering (Environment, Region)—but not too many (explosion of metric combinations increases cost).

**Tip 4: Leverage Metric Math for Derived Metrics**
Calculate error rates, utilization percentages in alarms—no need to publish additional custom metrics.

**Tip 5: Use Extended Statistics (Percentiles) for Latency**
p99 latency more meaningful than average—average hides outliers affecting user experience.

### Logging Best Practices

**Tip 6: Implement Structured Logging (JSON)**
JSON logs easy to parse with Logs Insights—enables powerful querying and analysis.

**Tip 7: Include Request/Trace IDs in All Logs**
Correlation across distributed services—critical for troubleshooting microservices.

**Tip 8: Log at Appropriate Levels**
DEBUG for development, INFO for production, ERROR always—avoids log volume explosion.

**Tip 9: Use Log Sampling for High-Volume Systems**
Log 1-10% of successful requests, 100% of errors—reduces costs while maintaining visibility.

**Tip 10: Sanitize Sensitive Data Before Logging**
Never log PII, credentials, credit cards—compliance violations and security risks.

### Alarm Best Practices

**Tip 11: Use Composite Alarms to Reduce False Positives**
Require multiple conditions (high CPU AND high memory)—90%+ false positive reduction.

**Tip 12: Set Appropriate Evaluation Periods**
2-3 periods prevents transient spikes from triggering alarms—balances responsiveness and stability.

**Tip 13: Configure Alarm Actions for Each State**
ALARM state: Page on-call, OK state: Send recovery notification—complete lifecycle management.

**Tip 14: Use Anomaly Detection for Metrics with Patterns**
ML learns daily/weekly patterns—eliminates manual threshold tuning.

**Tip 15: Test Alarms Before Production**
Manually set alarm state to verify actions—prevents "alarm doesn't work" surprises during real incidents.

## Pitfalls \& Remedies

### Pitfall 1: Excessive Log Retention Costs

**Problem:** CloudWatch log storage costs grow unexpectedly high, consuming significant portion of AWS bill.

**Why It Happens:**

- Default retention: Never expire (indefinite)
- High-volume applications logging extensively
- Retention not reviewed after initial setup
- Development/debug logs retained unnecessarily
- Forgotten log groups from deleted applications

**Impact:**

- Monthly costs increasing 10-50% per month
- Budget overruns
- Unused data consuming storage
- Compliance risks (retaining data too long)

**Example:**

```
Application: 100 GB logs/month
Retention: Indefinite (default)
Month 1: 100 GB × $0.03 = $3
Month 12: 1,200 GB × $0.03 = $36
Month 24: 2,400 GB × $0.03 = $72
Annual cost year 2: $864 (growing continuously)
```

**Remedy:**

**Step 1: Audit All Log Groups**

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

**Step 2: Implement Retention Policies**

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

**Step 3: Export Old Logs to S3**

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

**Step 4: Automate Lifecycle Management**

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

**Prevention:**

- Set retention policy immediately when creating log groups
- Document retention requirements per environment
- Regular audits (monthly) of log storage costs
- Export to S3 for long-term compliance requirements
- Delete log groups for deleted applications
- Use CloudWatch cost allocation tags

***

### Pitfall 2: Alarm Threshold Tuning Challenges

**Problem:** Alarms either trigger too frequently (false positives) or not at all (false negatives), making them useless.

**Why It Happens:**

- Static thresholds don't account for workload patterns
- No baseline metrics analysis before setting thresholds
- Daily/weekly traffic patterns not considered
- Thresholds based on guesswork, not data
- No testing of alarms before production

**Impact:**

- Alert fatigue from false positives
- Team ignores critical alerts
- Real issues missed (false negatives)
- Time wasted investigating non-issues
- Loss of confidence in monitoring

**Example:**

```
Alarm: CPU > 80%
Monday-Friday 9am-5pm: 70-90% CPU (normal business hours)
  → Constant alarms during business hours (false positive)
Monday-Friday 6pm-8am: 10-20% CPU (off hours)
Saturday-Sunday: 5% CPU
  → 80% threshold never breaches during off hours
Real issue at 3am: CPU 78% (below threshold, not detected)
```

**Remedy:**

**Step 1: Analyze Historical Data**

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

**Step 2: Use Anomaly Detection**

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

**Step 3: Implement Dayparting (Time-Based Thresholds)**

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

**Step 4: Test Alarms Before Production**

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

**Prevention:**

- Analyze 30 days of historical data before setting thresholds
- Use anomaly detection for metrics with patterns
- Implement composite alarms to reduce false positives
- Test all alarms before enabling actions
- Review and tune alarms quarterly
- Document threshold rationale
- Use metric math for derived thresholds

***

## Chapter Summary

Amazon CloudWatch provides comprehensive observability across AWS infrastructure and applications through unified metrics, logs, alarms, and dashboards. CloudWatch automatically collects metrics from 80+ AWS services without configuration, aggregates logs from all sources with powerful query capabilities via Logs Insights, triggers intelligent alarms with anomaly detection to reduce false positives, and visualizes system health through customizable dashboards. Advanced features include Container Insights for ECS/EKS, Lambda Insights for function optimization, Contributor Insights for identifying top resource consumers, and seamless X-Ray integration for distributed tracing.

**Key Takeaways:**

- **Leverage Automatic Metrics:** 80+ AWS services publish metrics automatically; no agents required for EC2, RDS, Lambda, DynamoDB, and more
- **Implement Structured Logging:** Use JSON format for logs; enables powerful Logs Insights queries extracting metrics, calculating aggregations, analyzing patterns
- **Use Composite Alarms:** Combine multiple conditions to reduce false positives 90%; prevents alert fatigue while maintaining visibility
- **Enable Anomaly Detection:** ML automatically learns normal patterns, adjusts for daily/weekly cycles; eliminates manual threshold tuning
- **Optimize Log Retention:** Set 30-day retention for production, 7 days for development; export to S3 for long-term storage (75% cost reduction)
- **Monitor SLAs Continuously:** Track availability, latency (p99), error rate; automate monthly SLA reports with CloudWatch metrics
- **Use Metric Filters Strategically:** Extract metrics from logs without publishing custom metrics; reduces costs while maintaining visibility

CloudWatch integrates throughout AWS—monitoring Lambda functions, tracking API Gateway requests, analyzing WAF logs, aggregating GuardDuty findings, and providing operational dashboards for entire environments. Next chapter covers AWS CloudTrail for comprehensive audit logging of all API calls, enabling security analysis, compliance reporting, and forensic investigation across all AWS services and accounts.

## Hands-On Lab Exercise

**Objective:** Build complete monitoring stack with metrics, logs, alarms, and operational dashboard.

**Scenario:** Monitor web application with custom business metrics, application logs, SLA tracking, and automated alerting.

**Prerequisites:**

- AWS account with admin access
- Running application (EC2, Lambda, or ECS)

**Steps:**

1. **Configure Custom Metrics (30 minutes)**
    - Publish business metrics (orders, revenue)
    - Publish application performance metrics (response time)
    - Enable detailed EC2 monitoring (1-minute intervals)
    - Create high-resolution metrics for real-time dashboard
2. **Set Up Centralized Logging (40 minutes)**
    - Create log groups with 30-day retention
    - Install CloudWatch Unified Agent on EC2
    - Configure structured logging (JSON format)
    - Create metric filters (errors, slow requests)
    - Test log ingestion
3. **Create Intelligent Alarms (45 minutes)**
    - Create standard metric alarms (CPU, memory)
    - Create anomaly detection alarms (traffic patterns)
    - Create composite alarms (multi-condition)
    - Configure SNS notifications
    - Test alarm actions
4. **Build Operational Dashboard (30 minutes)**
    - Create production overview dashboard
    - Add business metrics (orders/min, revenue/hour)
    - Add SLA metrics (availability, latency p99, error rate)
    - Add infrastructure metrics (CPU, memory, connections)
    - Add alarm status widget
    - Share dashboard with team
5. **Query Logs with Insights (20 minutes)**
    - Write query for error analysis
    - Calculate average response time by endpoint
    - Find slowest requests (>3 seconds)
    - Identify top error messages
    - Save frequently-used queries

**Expected Outcomes:**

- Complete observability into application and infrastructure
- Intelligent alarms reducing false positives 90%
- Operational dashboard showing real-time health
- Log queries providing rapid troubleshooting
- Total cost: <\$50/month for typical application


## Review Questions

1. **What is the default metric resolution for EC2 instances?**
a) 1 minute
b) 5 minutes ✓
c) 15 minutes
d) 1 hour

**Answer: B** - EC2 standard monitoring collects metrics every 5 minutes; detailed monitoring enables 1-minute intervals

2. **What is the default log retention in CloudWatch?**
a) 7 days
b) 30 days
c) 1 year
d) Never expire ✓

**Answer: D** - Default retention is indefinite (never expire); must explicitly set retention policy to control costs

3. **What statistic is best for monitoring latency SLAs?**
a) Average
b) Maximum
c) p99 ✓
d) Sum

**Answer: C** - p99 percentile shows 99th percentile latency; better than average which hides slow outliers affecting users

4. **How many evaluation periods are recommended for alarms?**
a) 1
b) 2-3 ✓
c) 5
d) 10

**Answer: B** - 2-3 periods prevents transient spikes from triggering alarms while maintaining responsiveness

5. **What is the cost of CloudWatch Logs Insights queries?**
a) Free
b) \$0.005 per GB scanned ✓
c) \$0.10 per query
d) \$1 per GB scanned

**Answer: B** - Logs Insights charges \$0.005 per GB of log data scanned during query execution

6. **What is CloudWatch anomaly detection based on?**
a) Static thresholds
b) Machine learning ✓
c) Manual configuration
d) Third-party rules

**Answer: B** - Anomaly detection uses ML to learn normal patterns over 2 weeks, automatically adjusting for cycles

7. **What is the maximum retention period for CloudWatch metrics?**
a) 30 days
b) 90 days
c) 1 year
d) 15 months ✓

**Answer: D** - CloudWatch retains metrics for 15 months automatically

8. **What is the purpose of composite alarms?**
a) Combine multiple metrics
b) Reduce false positives ✓
c) Increase alarm speed
d) Reduce costs

**Answer: B** - Composite alarms combine multiple conditions with logic (AND/OR) to reduce false positives 90%+

9. **What is high-resolution metric granularity?**
a) 5 minutes
b) 1 minute
c) 1 second ✓
d) Real-time

**Answer: C** - High-resolution metrics support 1-second granularity; useful for real-time dashboards and rapid scaling

10. **What happens to logs when retention period expires?**
a) Automatically exported to S3
b) Automatically deleted ✓
c) Archived in Glacier
d) Marked as expired but kept

**Answer: B** - Logs automatically deleted after retention period expires; export to S3 before expiration if needed

***

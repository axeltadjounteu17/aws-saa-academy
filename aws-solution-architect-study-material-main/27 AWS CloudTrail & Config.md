# Chapter 27: AWS CloudTrail \& Config

## Introduction

Every AWS API call—whether launching an EC2 instance, deleting an S3 bucket, modifying a security group, or accessing Secrets Manager—represents a potential security event, compliance requirement, or operational change requiring audit trails. Traditional IT audit approaches—manual log reviews, periodic compliance checks, reactive incident investigation—cannot keep pace with cloud environments where infrastructure changes occur thousands of times daily. AWS CloudTrail and AWS Config solve these challenges through comprehensive API logging, continuous compliance monitoring, and automated resource tracking that transform governance from manual burden to automated assurance.

The cost of inadequate audit logging and configuration tracking extends far beyond compliance fines. Average data breach investigations require 280 days without proper audit trails, regulatory penalties reach millions for HIPAA and PCI DSS violations, and security incidents become impossible to investigate when API call history is missing. CloudTrail records every action taken in your AWS account—who did what, when, from where, and what changed—providing the foundation for security analysis, troubleshooting, and compliance reporting. Config continuously records resource configurations, evaluates compliance against rules, and tracks changes over time, enabling you to answer questions like "Who deleted this security group?" and "Are all S3 buckets encrypted?" within seconds.

This chapter builds on previous services—CloudTrail logs analyzed by GuardDuty for threats, Config rules checking KMS encryption requirements, CloudWatch alarms triggered by suspicious API calls, Security Hub aggregating compliance findings. The integration is seamless: CloudTrail events trigger Lambda for automated response, Config compliance results feed into dashboards, and both services provide audit evidence for security investigations. The chapter covers CloudTrail architecture, event types, multi-region trails, log file integrity validation, Insights for anomaly detection, Config recording, managed and custom rules, conformance packs, aggregators, remediation actions, organizational trails, compliance frameworks (CIS, PCI DSS, HIPAA), and building production systems where every change is logged, compliance is continuous, and security investigations complete in minutes instead of months.

## Theory \& Concepts

### AWS CloudTrail Architecture

**Core Concepts:**

```
CloudTrail Purpose:
Audit log of ALL API calls in AWS account
Security analysis and compliance

Event Types:

1. Management Events:
   - Control plane operations
   - Creating/modifying/deleting resources
   - Examples: RunInstances, CreateBucket, PutBucketPolicy
   - Default: Logged automatically

2. Data Events:
   - Data plane operations (high volume)
   - Object-level operations
   - Examples: GetObject (S3), PutObject, Invoke (Lambda)
   - Cost: Additional charges
   - Optional: Must explicitly enable

3. Insights Events:
   - Unusual API activity
   - Machine learning detection
   - Examples: Spike in IAM actions, unusual API error rates
   - Cost: Additional charges

CloudTrail Event Structure:

{
  "eventVersion": "1.08",
  "userIdentity": {
    "type": "IAMUser",
    "principalId": "AIDACKCEVSQ6C2EXAMPLE",
    "arn": "arn:aws:iam::123456789012:user/Alice",
    "accountId": "123456789012",
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "userName": "Alice"
  },
  "eventTime": "2025-01-15T10:30:00Z",
  "eventSource": "ec2.amazonaws.com",
  "eventName": "TerminateInstances",
  "awsRegion": "us-east-1",
  "sourceIPAddress": "203.0.113.1",
  "userAgent": "aws-cli/2.0.0",
  "requestParameters": {
    "instancesSet": {
      "items": [{"instanceId": "i-1234567890abcdef0"}]
    }
  },
  "responseElements": {
    "instancesSet": {
      "items": [{
        "instanceId": "i-1234567890abcdef0",
        "currentState": {"code": 32, "name": "shutting-down"},
        "previousState": {"code": 16, "name": "running"}
      }]
    }
  },
  "requestID": "12345678-1234-1234-1234-123456789012",
  "eventID": "87654321-4321-4321-4321-210987654321",
  "readOnly": false,
  "eventType": "AwsApiCall",
  "managementEvent": true,
  "recipientAccountId": "123456789012"
}

Key Fields:

userIdentity: Who made the call
  - IAM user, role, service, root user
  - Access key ID used

eventName: What action (API call)
  - TerminateInstances, DeleteBucket, etc.

eventTime: When (UTC timestamp)

sourceIPAddress: From where
  - Client IP address
  - AWS service IP if service-to-service

requestParameters: What was requested
  - API call parameters
  - Resource identifiers

responseElements: What was returned
  - API response
  - Created resource IDs

errorCode/errorMessage: If call failed
  - AccessDenied, InvalidParameter, etc.

Trail Configuration:

Trail Components:
- Name: Unique identifier
- S3 bucket: Log file destination
- Log file validation: Integrity checking
- CloudWatch Logs: Optional real-time delivery
- SNS topic: Optional notifications
- Tags: Resource organization

Single-Region Trail:
- Logs events in one region only
- Useful for region-specific compliance

Multi-Region Trail:
- Logs events in all regions
- Recommended for most cases
- Global services (IAM, Route 53) always in us-east-1

Organization Trail:
- Logs events for all accounts in AWS Organization
- Centralized audit logging
- Master account pays for storage
```

**CloudTrail Log Delivery:**

```
Event Flow:

API Call → CloudTrail → S3 Bucket (within 15 minutes)
                      → CloudWatch Logs (near real-time)
                      → SNS Notification (optional)

S3 Bucket Structure:

s3://my-cloudtrail-bucket/
└── AWSLogs/
    └── 123456789012/  (Account ID)
        └── CloudTrail/
            └── us-east-1/
                └── 2025/
                    └── 01/
                        └── 15/
                            ├── 123456789012_CloudTrail_us-east-1_20250115T1030Z_abc123.json.gz
                            └── 123456789012_CloudTrail_us-east-1_20250115T1045Z_def456.json.gz

Log File Format:
- Gzip compressed JSON
- 5-minute batches (approximately)
- Multiple events per file

Digest Files (Log File Validation):
s3://my-cloudtrail-bucket/
└── AWSLogs/
    └── 123456789012/
        └── CloudTrail-Digest/
            └── us-east-1/
                └── 2025/01/15/
                    └── 123456789012_CloudTrail-Digest_us-east-1_20250115T103000Z.json.gz

Purpose: Cryptographic proof of log file integrity
Contains: SHA-256 hashes of log files
Use case: Prove logs haven't been tampered with

CloudWatch Logs Integration:

Benefits:
- Near real-time availability (vs 15-minute S3 delay)
- Metric filters (count API calls)
- Alarms (trigger on suspicious activity)
- Logs Insights queries

Setup:
cloudtrail.update_trail(
    Name='my-trail',
    CloudWatchLogsLogGroupArn='arn:aws:logs:region:account:log-group:cloudtrail',
    CloudWatchLogsRoleArn='arn:aws:iam::account:role/CloudTrailCloudWatchLogsRole'
)

Cost:
- S3 storage: $0.023 per GB-month
- CloudWatch Logs ingestion: $0.50 per GB
- CloudWatch Logs storage: $0.03 per GB-month

Typical volume: 0.5-5 GB per million API calls
```


### CloudTrail Event Types Deep Dive

**Management Events:**

```
Management Events (Control Plane):

Categories:

1. IAM and Security:
   - CreateUser, DeleteUser
   - AttachRolePolicy, DetachRolePolicy
   - CreateAccessKey
   - PutUserPolicy

2. Resource Creation/Modification:
   - RunInstances (EC2)
   - CreateBucket (S3)
   - CreateFunction (Lambda)
   - CreateDBInstance (RDS)

3. Configuration Changes:
   - ModifyInstanceAttribute
   - PutBucketPolicy
   - UpdateFunctionConfiguration
   - ModifyDBInstance

4. Resource Deletion:
   - TerminateInstances
   - DeleteBucket
   - DeleteFunction
   - DeleteDBInstance

5. Network Changes:
   - CreateSecurityGroup
   - AuthorizeSecurityGroupIngress
   - CreateVpc
   - CreateSubnet

Read-Only vs Write:

Read-Only: Describe, List, Get operations
- DescribeInstances
- ListBuckets
- GetFunction

Write: Create, Update, Delete operations
- RunInstances
- PutObject (management event if bucket operation)
- DeleteFunction

Management Events: Free
Included in CloudTrail at no additional cost
First copy of management events: Free
Additional copies: $2.00 per 100,000 events
```

**Data Events:**

```
Data Events (Data Plane):

High-volume, object-level operations

S3 Object-Level:
- GetObject: Download object
- PutObject: Upload object
- DeleteObject: Delete object
- GetObjectAcl: Get object permissions

Lambda Invocations:
- Invoke: Function execution

DynamoDB:
- GetItem
- PutItem
- DeleteItem
- Query
- Scan

Configuration:

Enable per resource or all resources

# S3 data events for specific bucket
cloudtrail.put_event_selectors(
    TrailName='my-trail',
    EventSelectors=[
        {
            'ReadWriteType': 'All',  # All, ReadOnly, WriteOnly
            'IncludeManagementEvents': True,
            'DataResources': [
                {
                    'Type': 'AWS::S3::Object',
                    'Values': [
                        'arn:aws:s3:::sensitive-bucket/*'  # Specific bucket
                    ]
                }
            ]
        }
    ]
)

# Lambda data events for all functions
{
    'DataResources': [
        {
            'Type': 'AWS::Lambda::Function',
            'Values': ['arn:aws:lambda:*:*:function/*']  # All functions
        }
    ]
}

Cost:
First 2 million data events per month: Free
Additional events: $0.10 per 100,000 events

Volume Estimation:
S3 with 1M objects accessed daily:
- 30 million GetObject events/month
- Cost: (30M - 2M) / 100K × $0.10 = $28/month

Recommendation:
✓ Enable for sensitive buckets
✓ Enable for compliance requirements
✗ Don't enable for all buckets (cost explosion)
✗ Don't enable for public content delivery (CloudFront logs instead)
```

**Insights Events:**

```
CloudTrail Insights:

Purpose: Detect unusual API activity using ML

Baseline Learning:
- Analyzes normal API call patterns
- Learns typical volume and frequency
- Identifies deviations

Insight Types:

1. Unusual API Error Rates:
   - Spike in AccessDenied errors
   - Indicates: Possible attack, misconfiguration
   - Example: 1000 AccessDenied in 5 minutes (normal: 5/minute)

2. Unusual API Call Volumes:
   - Spike in specific API calls
   - Indicates: Automation gone wrong, attack
   - Example: 500 RunInstances calls (normal: 10/day)

Insight Event Structure:

{
  "eventVersion": "1.07",
  "eventTime": "2025-01-15T10:30:00Z",
  "awsRegion": "us-east-1",
  "eventName": "ConsoleLogin",
  "userIdentity": {...},
  "eventType": "AwsCloudTrailInsight",
  "insightDetails": {
    "state": "Start",  // Start or End
    "eventSource": "signin.amazonaws.com",
    "eventName": "ConsoleLogin",
    "insightType": "ApiErrorRateInsight",
    "insightContext": {
      "statistics": {
        "baseline": {
          "average": 0.0000347222  // Normal rate
        },
        "insight": {
          "average": 0.2  // Unusual rate (577× normal)
        },
        "insightDuration": 5  // Minutes
      }
    }
  }
}

Use Cases:

Credential Compromise:
- Sudden spike in API calls from compromised credentials
- Insight detects unusual activity pattern

Misconfigured Automation:
- Script running in infinite loop
- Creates thousands of resources
- Insight detects volume spike

Reconnaissance:
- Attacker probing permissions
- Many AccessDenied errors in short time
- Insight detects error rate spike

Configuration:

cloudtrail.put_insight_selectors(
    TrailName='my-trail',
    InsightSelectors=[
        {'InsightType': 'ApiCallRateInsight'},
        {'InsightType': 'ApiErrorRateInsight'}
    ]
)

Cost:
$0.35 per 100,000 write management events analyzed
Typical cost: $5-50/month depending on API call volume

Recommendation: Enable for production accounts
Provides early warning of security issues
```


### AWS Config Architecture

**Purpose and Components:**

```
AWS Config Purpose:
- Continuous resource inventory
- Configuration history
- Compliance evaluation
- Change tracking

Config Records:
1. What resources exist (inventory)
2. How they're configured (settings)
3. Relationships between resources
4. Changes over time (history)

Config Components:

Configuration Recorder:
- Records resource configurations
- Runs continuously
- One per region
- Must be explicitly started

Delivery Channel:
- Where to store configuration history
- S3 bucket (required)
- SNS topic (optional, for notifications)

Config Rules:
- Evaluate resource compliance
- Managed rules (AWS-provided)
- Custom rules (Lambda functions)
- Continuous or change-triggered

Conformance Packs:
- Collection of Config rules
- Framework compliance (CIS, PCI DSS, etc.)
- Deploy across accounts/regions

Configuration Item (CI):

{
  "version": "1.3",
  "accountId": "123456789012",
  "configurationItemCaptureTime": "2025-01-15T10:30:00.000Z",
  "configurationItemStatus": "ResourceDiscovered",
  "configurationStateId": "1",
  "resourceType": "AWS::EC2::SecurityGroup",
  "resourceId": "sg-1234567890abcdef0",
  "resourceName": "web-sg",
  "ARN": "arn:aws:ec2:us-east-1:123456789012:security-group/sg-1234567890abcdef0",
  "awsRegion": "us-east-1",
  "availabilityZone": "Not Applicable",
  "resourceCreationTime": "2025-01-10T08:00:00.000Z",
  "tags": {
    "Name": "web-sg",
    "Environment": "Production"
  },
  "relatedEvents": ["12345678-1234-1234-1234-123456789012"],
  "relationships": [
    {
      "resourceType": "AWS::EC2::Instance",
      "resourceId": "i-0987654321fedcba0",
      "relationshipName": "Is associated with Instance"
    }
  ],
  "configuration": {
    "groupId": "sg-1234567890abcdef0",
    "groupName": "web-sg",
    "ipPermissions": [
      {
        "fromPort": 80,
        "toPort": 80,
        "ipProtocol": "tcp",
        "ipRanges": [{"cidrIp": "0.0.0.0/0"}]
      },
      {
        "fromPort": 443,
        "toPort": 443,
        "ipProtocol": "tcp",
        "ipRanges": [{"cidrIp": "0.0.0.0/0"}]
      }
    ],
    "ipPermissionsEgress": [...]
  },
  "supplementaryConfiguration": {}
}

Key Fields:
- configurationItemCaptureTime: When recorded
- resourceType: AWS resource type
- configuration: Full resource configuration
- relationships: Connected resources
- relatedEvents: CloudTrail event IDs

Timeline View:
Config maintains history of all configuration changes
Query: "Show me security group config on Jan 1, 2025"
Result: Exact configuration snapshot from that date
```

**Config Rules:**

```
Config Rule Types:

1. Managed Rules (AWS-Provided):
   - Pre-built by AWS
   - Common compliance checks
   - 200+ rules available
   - Regularly updated

2. Custom Rules (Lambda):
   - Custom compliance logic
   - Python or Node.js
   - Full flexibility
   - Organization-specific requirements

Evaluation Modes:

Configuration Change:
- Triggered when resource changes
- Evaluates affected resources only
- Fast, efficient
- Example: Check encryption when bucket created

Periodic:
- Runs on schedule (1h, 3h, 6h, 12h, 24h)
- Evaluates all resources
- Catches drift
- Example: Daily encryption check

Common Managed Rules:

encrypted-volumes:
- Check: All EBS volumes encrypted
- Trigger: Configuration change
- Parameters: None
- Remediation: Snapshot → Encrypted volume

s3-bucket-public-read-prohibited:
- Check: No public read access on S3 buckets
- Trigger: Configuration change + periodic
- Parameters: None
- Remediation: Remove public access

required-tags:
- Check: Resources have required tags
- Trigger: Configuration change
- Parameters: tag1Key=Environment, tag2Key=Owner
- Remediation: Add missing tags

iam-password-policy:
- Check: Password policy meets requirements
- Trigger: Periodic
- Parameters: MinimumPasswordLength=14, RequireUppercase=true
- Remediation: Update password policy

rds-storage-encrypted:
- Check: RDS instances encrypted
- Trigger: Configuration change
- Parameters: None
- Remediation: Cannot remediate (must recreate)

Compliance States:

COMPLIANT: Resource meets rule requirements
NON_COMPLIANT: Resource violates rule
NOT_APPLICABLE: Rule doesn't apply to resource
INSUFFICIENT_DATA: Not enough information

Config Rule Evaluation:

Resource Changed → Config Records Change → Config Rule Triggered
                                        → Lambda Function (if custom)
                                        → Evaluation Result
                                        → Compliance Status Updated
                                        → SNS Notification (optional)
                                        → Remediation Action (optional)
```


### Remediation Actions

**Automated Compliance Fixes:**

```
Remediation Concept:
Automatically fix non-compliant resources

Remediation Actions (SSM Automation Documents):

Built-in Remediations:
- AWS-PublishSNSNotification: Notify on non-compliance
- AWS-ConfigureS3BucketLogging: Enable S3 logging
- AWS-EnableCloudTrailCloudWatchLogs: Configure CloudTrail
- AWS-ConfigureS3BucketPublicAccessBlock: Block public access

Custom Remediations:
- Lambda function
- Systems Manager document
- Full control

Example: Auto-Remediate Public S3 Bucket

Config Rule: s3-bucket-public-read-prohibited

Remediation Configuration:
{
  "RemediationConfiguration": {
    "ConfigRuleName": "s3-bucket-public-read-prohibited",
    "TargetType": "SSM_DOCUMENT",
    "TargetIdentifier": "AWS-PublishSNSNotification",
    "TargetVersion": "1",
    "Parameters": {
      "AutomationAssumeRole": {
        "StaticValue": {
          "Values": ["arn:aws:iam::account:role/ConfigRemediationRole"]
        }
      },
      "BucketName": {
        "ResourceValue": {
          "Value": "RESOURCE_ID"  // Bucket name from rule evaluation
        }
      }
    },
    "Automatic": true,  // Auto-remediate
    "MaximumAutomaticAttempts": 5,
    "RetryAttemptSeconds": 60
  }
}

Remediation Workflow:

1. Config detects non-compliant S3 bucket (public)
2. Config triggers remediation action
3. SSM Automation executes:
   - Get bucket name from Config
   - Call S3 API: PutPublicAccessBlock
   - Block all public access
4. Config re-evaluates rule
5. Bucket now compliant

Safety Considerations:

Manual Approval:
- Automatic: false
- Requires manual trigger
- Safer for production

Retry Logic:
- MaximumAutomaticAttempts: 5
- RetryAttemptSeconds: 60
- Handles transient failures

Testing:
- Test in development first
- Verify remediation logic
- Check for unintended consequences

Example: Tag Enforcement

Config Rule: required-tags
Required Tags: Environment, Owner

Remediation: Lambda Function
def lambda_handler(event, context):
    """Add missing tags to resources"""
    
    config = boto3.client('config')
    
    # Get non-compliant resource
    resource_type = event['configRuleInvocationType']
    resource_id = event['configRuleArn']
    
    # Parse resource type
    if 'AWS::EC2::Instance' in resource_type:
        ec2 = boto3.client('ec2')
        
        # Add missing tags
        ec2.create_tags(
            Resources=[resource_id],
            Tags=[
                {'Key': 'Environment', 'Value': 'Untagged'},
                {'Key': 'Owner', 'Value': 'UnknownTeam'}
            ]
        )
    
    return {'statusCode': 200}

Result: All resources automatically tagged
```


### Conformance Packs

**Framework Compliance:**

```
Conformance Pack:
Collection of Config rules as a single entity
Implements compliance frameworks

AWS-Provided Conformance Packs:

Operational Best Practices:
- Operational-Best-Practices-for-CIS-AWS-Foundations-Benchmark
- Operational-Best-Practices-for-PCI-DSS
- Operational-Best-Practices-for-HIPAA-Security
- Operational-Best-Practices-for-NIST-800-53
- Operational-Best-Practices-for-FedRAMP

Example: CIS AWS Foundations Benchmark

Includes rules:
- iam-password-policy (CIS 1.5-1.11)
- cloudtrail-enabled (CIS 2.1)
- s3-bucket-logging-enabled (CIS 2.3)
- vpc-flow-logs-enabled (CIS 2.9)
- iam-root-access-key-check (CIS 1.4)
- ... (50+ rules)

Deployment:

config.put_conformance_pack(
    ConformancePackName='CIS-AWS-Foundations',
    TemplateS3Uri='s3://conformance-packs/cis-aws-foundations.yaml',
    DeliveryS3Bucket='config-conformance-pack-results'
)

Conformance Pack Template (YAML):

Resources:
  CIS14IamRootAccessKey:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: cis-1.4-iam-root-access-key-check
      Source:
        Owner: AWS
        SourceIdentifier: IAM_ROOT_ACCESS_KEY_CHECK

  CIS21CloudTrailEnabled:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: cis-2.1-cloudtrail-enabled
      Source:
        Owner: AWS
        SourceIdentifier: CLOUD_TRAIL_ENABLED

  # ... (50+ rules)

Conformance Pack Dashboard:

Shows:
- Overall compliance score (%)
- Compliant vs non-compliant rules
- Compliance by rule
- Trend over time

Benefits:
✓ Deploy entire framework at once
✓ Consistent compliance across accounts
✓ Industry-standard frameworks
✓ Regular updates from AWS
✓ Simplified reporting

Organization Conformance Packs:
Deploy to all accounts in organization
Centralized management
Consistent policies
```


### Multi-Account Strategies

**Organization Trails:**

```
Centralized Audit Logging:

Organization Trail (Master Account):
- Logs events from all accounts
- Single S3 bucket (master account)
- Centralized compliance and audit
- Member accounts can't disable

Architecture:

AWS Organization
├── Master Account (123456789012)
│   ├── Organization Trail: "org-trail"
│   └── S3 Bucket: org-cloudtrail-logs
├── Production Account (234567890123)
│   └── Events → Master S3 Bucket
├── Development Account (345678901234)
│   └── Events → Master S3 Bucket
└── Staging Account (456789012345)
    └── Events → Master S3 Bucket

S3 Structure:

s3://org-cloudtrail-logs/
└── AWSLogs/
    ├── o-abc123xyz/  (Organization ID)
    │   ├── 234567890123/  (Production)
    │   │   └── CloudTrail/us-east-1/2025/01/15/...
    │   ├── 345678901234/  (Development)
    │   │   └── CloudTrail/us-east-1/2025/01/15/...
    │   └── 456789012345/  (Staging)
    │       └── CloudTrail/us-east-1/2025/01/15/...
    └── 123456789012/  (Master)
        └── CloudTrail/us-east-1/2025/01/15/...

Creating Organization Trail:

cloudtrail.create_trail(
    Name='org-trail',
    S3BucketName='org-cloudtrail-logs',
    IsMultiRegionTrail=True,
    IsOrganizationTrail=True,  # Key parameter
    EnableLogFileValidation=True
)

Benefits:
✓ Centralized audit logs
✓ Member accounts can't disable
✓ Simplified compliance
✓ Cost optimization (single storage)
✓ Security isolation (read-only for members)

Member Account View:
- Can view events in CloudTrail console
- Cannot modify or delete trail
- Cannot stop logging
- Logs automatically sent to master
```

**Config Aggregators:**

```
Multi-Account Config Compliance:

Config Aggregator:
- Centralized compliance view
- All accounts and regions
- Single dashboard

Architecture:

Master Account (Security/Audit)
├── Config Aggregator
└── View compliance from all accounts

Member Accounts
├── Config Recorders running
├── Config Rules evaluating
└── Results sent to aggregator

Creating Aggregator:

config.put_configuration_aggregator(
    ConfigurationAggregatorName='organization-aggregator',
    OrganizationAggregationSource={
        'RoleArn': 'arn:aws:iam::123456789012:role/AWSConfigRoleForOrganizations',
        'AllAwsRegions': True
    }
)

Authorization (Automatic for Organization):
- Organization master account has access
- No manual authorization needed
- Member accounts cannot opt out

Aggregator Dashboard:

Shows:
- Compliance by account
- Compliance by rule
- Compliance by resource type
- Non-compliant resources (drill-down)

Query Examples:

1. All non-compliant S3 buckets across organization:
SELECT
  accountId,
  awsRegion,
  resourceId,
  resourceType,
  configuration
WHERE
  resourceType = 'AWS::S3::Bucket'
  AND configurationItemStatus = 'NON_COMPLIANT'

2. Unencrypted volumes by account:
SELECT
  accountId,
  COUNT(*) as unencrypted_count
WHERE
  resourceType = 'AWS::EC2::Volume'
  AND configuration.encrypted = false
GROUP BY accountId

Advanced Query (SQL-like):
config.select_aggregate_resource_config(
    Expression="""
    SELECT
      accountId,
      resourceType,
      COUNT(*) as non_compliant_resources
    WHERE
      complianceType = 'NON_COMPLIANT'
    GROUP BY
      accountId, resourceType
    ORDER BY
      non_compliant_resources DESC
    """,
    ConfigurationAggregatorName='organization-aggregator'
)

Benefits:
✓ Single pane of glass for compliance
✓ Cross-account queries
✓ Organizational reporting
✓ Identify systemic issues
✓ Prioritize remediation efforts
```


## Hands-On Implementation

### Lab 1: Enable CloudTrail with Logging and Alerts

**Objective:** Create multi-region trail with CloudWatch integration and suspicious activity alerts.

**Step 1: Create S3 Bucket for CloudTrail**

```python
import boto3
import json

s3 = boto3.client('s3')
cloudtrail = boto3.client('cloudtrail')

bucket_name = 'my-cloudtrail-logs-bucket'

# Create bucket
s3.create_bucket(Bucket=bucket_name)

# Apply bucket policy for CloudTrail
bucket_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AWSCloudTrailAclCheck",
            "Effect": "Allow",
            "Principal": {"Service": "cloudtrail.amazonaws.com"},
            "Action": "s3:GetBucketAcl",
            "Resource": f"arn:aws:s3:::{bucket_name}"
        },
        {
            "Sid": "AWSCloudTrailWrite",
            "Effect": "Allow",
            "Principal": {"Service": "cloudtrail.amazonaws.com"},
            "Action": "s3:PutObject",
            "Resource": f"arn:aws:s3:::{bucket_name}/AWSLogs/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "bucket-owner-full-control"
                }
            }
        }
    ]
}

s3.put_bucket_policy(
    Bucket=bucket_name,
    Policy=json.dumps(bucket_policy)
)

# Enable versioning (best practice)
s3.put_bucket_versioning(
    Bucket=bucket_name,
    VersioningConfiguration={'Status': 'Enabled'}
)

# Enable encryption
s3.put_bucket_encryption(
    Bucket=bucket_name,
    ServerSideEncryptionConfiguration={
        'Rules': [{
            'ApplyServerSideEncryptionByDefault': {
                'SSEAlgorithm': 'AES256'
            }
        }]
    }
)

print(f"Created CloudTrail S3 bucket: {bucket_name}")
```

**Step 2: Create CloudWatch Log Group and IAM Role**

```python
logs = boto3.client('logs')
iam = boto3.client('iam')

# Create log group
log_group_name = '/aws/cloudtrail/logs'

logs.create_log_group(logGroupName=log_group_name)
logs.put_retention_policy(
    logGroupName=log_group_name,
    retentionInDays=90  # 90-day retention
)

print(f"Created CloudWatch log group: {log_group_name}")

# Create IAM role for CloudTrail → CloudWatch
trust_policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "cloudtrail.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}

role_name = 'CloudTrailCloudWatchLogsRole'

role_response = iam.create_role(
    RoleName=role_name,
    AssumeRolePolicyDocument=json.dumps(trust_policy),
    Description='Allow CloudTrail to send logs to CloudWatch'
)

role_arn = role_response['Role']['Arn']

# Attach policy
policy_document = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
            "Resource": [f"arn:aws:logs:*:*:log-group:{log_group_name}:*"]
        }
    ]
}

iam.put_role_policy(
    RoleName=role_name,
    PolicyName='CloudTrailCloudWatchLogsPolicy',
    PolicyDocument=json.dumps(policy_document)
)

print(f"Created IAM role: {role_arn}")
```

**Step 3: Create Multi-Region Trail**

```python
# Create trail
trail_name = 'my-organization-trail'

trail_response = cloudtrail.create_trail(
    Name=trail_name,
    S3BucketName=bucket_name,
    IsMultiRegionTrail=True,
    EnableLogFileValidation=True,  # Integrity checking
    CloudWatchLogsLogGroupArn=f"arn:aws:logs:us-east-1:{account_id}:log-group:{log_group_name}:*",
    CloudWatchLogsRoleArn=role_arn,
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Purpose', 'Value': 'Audit'}
    ]
)

print(f"Created trail: {trail_name}")

# Start logging
cloudtrail.start_logging(Name=trail_name)

print("CloudTrail logging started")

# Enable Insights (optional, additional cost)
cloudtrail.put_insight_selectors(
    TrailName=trail_name,
    InsightSelectors=[
        {'InsightType': 'ApiCallRateInsight'},
        {'InsightType': 'ApiErrorRateInsight'}
    ]
)

print("CloudTrail Insights enabled")
```

**Step 4: Create Metric Filters and Alarms**

```python
# Metric filter: Root account usage
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='RootAccountUsage',
    filterPattern='{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }',
    metricTransformations=[{
        'metricName': 'RootAccountUsageCount',
        'metricNamespace': 'CloudTrail/Security',
        'metricValue': '1',
        'defaultValue': 0
    }]
)

# Metric filter: Unauthorized API calls
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='UnauthorizedAPICalls',
    filterPattern='{ ($.errorCode = "*UnauthorizedOperation") || ($.errorCode = "AccessDenied*") }',
    metricTransformations=[{
        'metricName': 'UnauthorizedAPICallsCount',
        'metricNamespace': 'CloudTrail/Security',
        'metricValue': '1',
        'defaultValue': 0
    }]
)

# Metric filter: Security group changes
logs.put_metric_filter(
    logGroupName=log_group_name,
    filterName='SecurityGroupChanges',
    filterPattern='{ ($.eventName = AuthorizeSecurityGroupIngress) || ($.eventName = AuthorizeSecurityGroupEgress) || ($.eventName = RevokeSecurityGroupIngress) || ($.eventName = RevokeSecurityGroupEgress) }',
    metricTransformations=[{
        'metricName': 'SecurityGroupChangesCount',
        'metricNamespace': 'CloudTrail/Network',
        'metricValue': '1',
        'defaultValue': 0
    }]
)

print("Created metric filters")

# Create alarms
cloudwatch = boto3.client('cloudwatch')

# Alarm: Root account usage
cloudwatch.put_metric_alarm(
    AlarmName='RootAccountUsage',
    ComparisonOperator='GreaterThanOrEqualToThreshold',
    EvaluationPeriods=1,
    MetricName='RootAccountUsageCount',
    Namespace='CloudTrail/Security',
    Period=300,
    Statistic='Sum',
    Threshold=1,
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:security-alerts'],
    AlarmDescription='Alert when root account is used'
)

# Alarm: Unauthorized API calls spike
cloudwatch.put_metric_alarm(
    AlarmName='UnauthorizedAPICallsSpike',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=1,
    MetricName='UnauthorizedAPICallsCount',
    Namespace='CloudTrail/Security',
    Period=300,
    Statistic='Sum',
    Threshold=10,  # > 10 unauthorized calls in 5 minutes
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:security-alerts']
)

print("Created CloudWatch alarms")
```


### Lab 2: AWS Config with Compliance Rules

**Objective:** Enable Config, deploy compliance rules, and configure automated remediation.

**Step 1: Create S3 Bucket and IAM Role**

```python
config = boto3.client('config')

# Create bucket for Config
config_bucket_name = 'my-config-bucket'

s3.create_bucket(Bucket=config_bucket_name)

# Bucket policy for Config
config_bucket_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AWSConfigBucketPermissionsCheck",
            "Effect": "Allow",
            "Principal": {"Service": "config.amazonaws.com"},
            "Action": "s3:GetBucketAcl",
            "Resource": f"arn:aws:s3:::{config_bucket_name}"
        },
        {
            "Sid": "AWSConfigBucketExistenceCheck",
            "Effect": "Allow",
            "Principal": {"Service": "config.amazonaws.com"},
            "Action": "s3:ListBucket",
            "Resource": f"arn:aws:s3:::{config_bucket_name}"
        },
        {
            "Sid": "AWSConfigBucketPutObject",
            "Effect": "Allow",
            "Principal": {"Service": "config.amazonaws.com"},
            "Action": "s3:PutObject",
            "Resource": f"arn:aws:s3:::{config_bucket_name}/AWSLogs/*",
            "Condition": {
                "StringEquals": {
                    "s3:x-amz-acl": "bucket-owner-full-control"
                }
            }
        }
    ]
}

s3.put_bucket_policy(
    Bucket=config_bucket_name,
    Policy=json.dumps(config_bucket_policy)
)

# Create IAM role for Config
config_trust_policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "config.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}

config_role = iam.create_role(
    RoleName='AWSConfigRole',
    AssumeRolePolicyDocument=json.dumps(config_trust_policy)
)

# Attach AWS managed policy
iam.attach_role_policy(
    RoleName='AWSConfigRole',
    PolicyArn='arn:aws:iam::aws:policy/service-role/ConfigRole'
)

config_role_arn = config_role['Role']['Arn']

print(f"Created Config S3 bucket and IAM role")
```

**Step 2: Enable Configuration Recorder**

```python
# Create configuration recorder
config.put_configuration_recorder(
    ConfigurationRecorder={
        'name': 'default',
        'roleARN': config_role_arn,
        'recordingGroup': {
            'allSupported': True,  # Record all supported resource types
            'includeGlobalResourceTypes': True  # Include IAM, etc.
        }
    }
)

# Create delivery channel
config.put_delivery_channel(
    DeliveryChannel={
        'name': 'default',
        's3BucketName': config_bucket_name,
        'configSnapshotDeliveryProperties': {
            'deliveryFrequency': 'TwentyFour_Hours'  # Daily snapshots
        }
    }
)

# Start recording
config.start_configuration_recorder(
    ConfigurationRecorderName='default'
)

print("Config recording started")
```

**Step 3: Deploy Config Rules**

```python
# Rule 1: Ensure all S3 buckets are encrypted
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 's3-bucket-server-side-encryption-enabled',
        'Description': 'Checks that S3 buckets have encryption enabled',
        'Source': {
            'Owner': 'AWS',
            'SourceIdentifier': 'S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED'
        },
        'Scope': {
            'ComplianceResourceTypes': ['AWS::S3::Bucket']
        }
    }
)

# Rule 2: Ensure EBS volumes are encrypted
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 'encrypted-volumes',
        'Description': 'Checks that EBS volumes are encrypted',
        'Source': {
            'Owner': 'AWS',
            'SourceIdentifier': 'ENCRYPTED_VOLUMES'
        },
        'Scope': {
            'ComplianceResourceTypes': ['AWS::EC2::Volume']
        }
    }
)

# Rule 3: Check for required tags
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 'required-tags',
        'Description': 'Checks that resources have required tags',
        'InputParameters': json.dumps({
            'tag1Key': 'Environment',
            'tag2Key': 'Owner'
        }),
        'Source': {
            'Owner': 'AWS',
            'SourceIdentifier': 'REQUIRED_TAGS'
        },
        'Scope': {
            'ComplianceResourceTypes': [
                'AWS::EC2::Instance',
                'AWS::S3::Bucket',
                'AWS::RDS::DBInstance'
            ]
        }
    }
)

# Rule 4: IAM password policy
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 'iam-password-policy',
        'Description': 'Checks IAM password policy',
        'InputParameters': json.dumps({
            'RequireUppercaseCharacters': 'true',
            'RequireLowercaseCharacters': 'true',
            'RequireSymbols': 'true',
            'RequireNumbers': 'true',
            'MinimumPasswordLength': '14',
            'PasswordReusePrevention': '24',
            'MaxPasswordAge': '90'
        }),
        'Source': {
            'Owner': 'AWS',
            'SourceIdentifier': 'IAM_PASSWORD_POLICY'
        }
    }
)

# Rule 5: RDS encryption
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 'rds-storage-encrypted',
        'Description': 'Checks that RDS instances are encrypted',
        'Source': {
            'Owner': 'AWS',
            'SourceIdentifier': 'RDS_STORAGE_ENCRYPTED'
        },
        'Scope': {
            'ComplianceResourceTypes': ['AWS::RDS::DBInstance']
        }
    }
)

print("Created Config rules")
```

**Step 4: Configure Automated Remediation**

```python
# Remediation for public S3 buckets
config.put_remediation_configuration(
    ConfigRuleName='s3-bucket-public-read-prohibited',
    RemediationConfiguration={
        'ConfigRuleName': 's3-bucket-public-read-prohibited',
        'TargetType': 'SSM_DOCUMENT',
        'TargetIdentifier': 'AWS-ConfigureS3BucketPublicAccessBlock',
        'TargetVersion': '1',
        'Parameters': {
            'AutomationAssumeRole': {
                'StaticValue': {
                    'Values': [config_role_arn]
                }
            },
            'BucketName': {
                'ResourceValue': {
                    'Value': 'RESOURCE_ID'
                }
            },
            'RestrictPublicBuckets': {
                'StaticValue': {
                    'Values': ['True']
                }
            },
            'BlockPublicAcls': {
                'StaticValue': {
                    'Values': ['True']
                }
            },
            'IgnorePublicAcls': {
                'StaticValue': {
                    'Values': ['True']
                }
            },
            'BlockPublicPolicy': {
                'StaticValue': {
                    'Values': ['True']
                }
            }
        },
        'Automatic': True,  # Auto-remediate
        'MaximumAutomaticAttempts': 5,
        'RetryAttemptSeconds': 60
    }
)

print("Configured automated remediation")
```


### Lab 3: Query Config and CloudTrail

**Objective:** Query compliance data and investigate API calls.

**Step 1: Query Config Compliance**

```python
# Get compliance summary
compliance_summary = config.describe_compliance_by_config_rule()

print("Compliance Summary:")
for rule in compliance_summary['ComplianceByConfigRules']:
    rule_name = rule['ConfigRuleName']
    compliance = rule.get('Compliance', {})
    status = compliance.get('ComplianceType', 'UNKNOWN')
    
    print(f"  {rule_name}: {status}")

# Get non-compliant resources
def get_non_compliant_resources(rule_name):
    """Get all non-compliant resources for a rule"""
    
    response = config.get_compliance_details_by_config_rule(
        ConfigRuleName=rule_name,
        ComplianceTypes=['NON_COMPLIANT']
    )
    
    print(f"\nNon-compliant resources for {rule_name}:")
    
    for result in response['EvaluationResults']:
        resource_id = result['EvaluationResultIdentifier']['EvaluationResultQualifier']['ResourceId']
        resource_type = result['EvaluationResultIdentifier']['EvaluationResultQualifier']['ResourceType']
        
        print(f"  {resource_type}: {resource_id}")
    
    return response['EvaluationResults']

# Check encrypted-volumes rule
non_compliant_volumes = get_non_compliant_resources('encrypted-volumes')
```

**Step 2: Query CloudTrail Events**

```python
# Query recent API calls
def query_cloudtrail_events(event_name=None, username=None, hours=24):
    """Query CloudTrail events"""
    
    lookup_attributes = []
    
    if event_name:
        lookup_attributes.append({
            'AttributeKey': 'EventName',
            'AttributeValue': event_name
        })
    
    if username:
        lookup_attributes.append({
            'AttributeKey': 'Username',
            'AttributeValue': username
        })
    
    response = cloudtrail.lookup_events(
        LookupAttributes=lookup_attributes,
        StartTime=datetime.utcnow() - timedelta(hours=hours),
        EndTime=datetime.utcnow(),
        MaxResults=50
    )
    
    print(f"\nCloudTrail Events (last {hours} hours):")
    
    for event in response['Events']:
        event_time = event['EventTime']
        event_name = event['EventName']
        username = event.get('Username', 'N/A')
        
        cloud_trail_event = json.loads(event['CloudTrailEvent'])
        source_ip = cloud_trail_event.get('sourceIPAddress', 'N/A')
        
        print(f"  {event_time}: {event_name} by {username} from {source_ip}")
    
    return response['Events']

# Query specific events
security_group_changes = query_cloudtrail_events(
    event_name='AuthorizeSecurityGroupIngress',
    hours=72
)

# Find who deleted a resource
def find_delete_events(resource_id):
    """Find deletion events for a resource"""
    
    response = cloudtrail.lookup_events(
        LookupAttributes=[
            {'AttributeKey': 'ResourceName', 'AttributeValue': resource_id}
        ],
        StartTime=datetime.utcnow() - timedelta(days=90),
        MaxResults=50
    )
    
    print(f"\nEvents for resource {resource_id}:")
    
    for event in response['Events']:
        event_data = json.loads(event['CloudTrailEvent'])
        
        print(f"  Time: {event['EventTime']}")
        print(f"  Event: {event['EventName']}")
        print(f"  User: {event_data['userIdentity'].get('userName', 'N/A')}")
        print(f"  IP: {event_data.get('sourceIPAddress', 'N/A')}")
        print()

# Find who deleted security group sg-12345
find_delete_events('sg-12345')
```

## Production-Level Knowledge

### Security Incident Investigation

**CloudTrail Forensic Analysis:**

```python
# Comprehensive security incident investigation toolkit

class CloudTrailInvestigator:
    """Tools for investigating security incidents using CloudTrail"""
    
    def __init__(self):
        self.cloudtrail = boto3.client('cloudtrail')
        self.logs = boto3.client('logs')
        self.s3 = boto3.client('s3')
    
    def investigate_compromised_credentials(self, access_key_id, days=90):
        """Investigate all actions taken by compromised credentials"""
        
        print(f"Investigating access key: {access_key_id}")
        print(f"Time range: Last {days} days")
        
        # Query CloudTrail events
        response = self.cloudtrail.lookup_events(
            LookupAttributes=[
                {'AttributeKey': 'AccessKeyId', 'AttributeValue': access_key_id}
            ],
            StartTime=datetime.utcnow() - timedelta(days=days),
            EndTime=datetime.utcnow(),
            MaxResults=1000
        )
        
        events = response['Events']
        
        # Analyze patterns
        analysis = {
            'total_events': len(events),
            'unique_ips': set(),
            'regions': set(),
            'event_types': {},
            'error_events': [],
            'write_events': [],
            'data_access': [],
            'suspicious_events': []
        }
        
        for event in events:
            event_data = json.loads(event['CloudTrailEvent'])
            
            # Track IPs
            source_ip = event_data.get('sourceIPAddress', 'unknown')
            analysis['unique_ips'].add(source_ip)
            
            # Track regions
            analysis['regions'].add(event_data.get('awsRegion', 'unknown'))
            
            # Count event types
            event_name = event['EventName']
            analysis['event_types'][event_name] = analysis['event_types'].get(event_name, 0) + 1
            
            # Track errors (possible privilege escalation attempts)
            if event_data.get('errorCode'):
                analysis['error_events'].append({
                    'time': event['EventTime'],
                    'event': event_name,
                    'error': event_data['errorCode'],
                    'ip': source_ip
                })
            
            # Track write operations
            if not event.get('ReadOnly', True):
                analysis['write_events'].append({
                    'time': event['EventTime'],
                    'event': event_name,
                    'ip': source_ip
                })
            
            # Identify suspicious patterns
            if self._is_suspicious(event_name, event_data):
                analysis['suspicious_events'].append({
                    'time': event['EventTime'],
                    'event': event_name,
                    'details': event_data
                })
        
        # Print report
        print(f"\n=== Investigation Report ===")
        print(f"Total API calls: {analysis['total_events']}")
        print(f"Unique IPs: {len(analysis['unique_ips'])}")
        print(f"  IPs: {', '.join(analysis['unique_ips'])}")
        print(f"Regions accessed: {', '.join(analysis['regions'])}")
        
        print(f"\nTop 10 API calls:")
        sorted_events = sorted(analysis['event_types'].items(), key=lambda x: x[1], reverse=True)
        for event_name, count in sorted_events[:10]:
            print(f"  {event_name}: {count}")
        
        print(f"\nWrite operations: {len(analysis['write_events'])}")
        if analysis['write_events']:
            print("  Recent write operations:")
            for event in analysis['write_events'][:10]:
                print(f"    {event['time']}: {event['event']} from {event['ip']}")
        
        print(f"\nFailed operations: {len(analysis['error_events'])}")
        if analysis['error_events']:
            print("  Recent errors:")
            for event in analysis['error_events'][:10]:
                print(f"    {event['time']}: {event['event']} - {event['error']}")
        
        print(f"\n🚨 Suspicious events: {len(analysis['suspicious_events'])}")
        for event in analysis['suspicious_events']:
            print(f"  {event['time']}: {event['event']}")
        
        return analysis
    
    def _is_suspicious(self, event_name, event_data):
        """Identify suspicious event patterns"""
        
        suspicious_patterns = [
            'CreateAccessKey',  # Creating new credentials
            'DeleteTrail',  # Disabling logging
            'StopLogging',
            'PutBucketPolicy',  # Modifying permissions
            'PutUserPolicy',
            'AttachUserPolicy',
            'CreateUser',  # Creating persistence
            'CreateRole',
            'PassRole',  # Privilege escalation
            'UpdateAssumeRolePolicy',
            'GetSecretValue',  # Accessing secrets
            'GetObject'  # If accessing sensitive buckets
        ]
        
        return event_name in suspicious_patterns
    
    def find_privilege_escalation_attempts(self, username, days=30):
        """Detect privilege escalation patterns"""
        
        escalation_apis = [
            'AttachUserPolicy',
            'AttachRolePolicy',
            'PutUserPolicy',
            'PutRolePolicy',
            'CreateAccessKey',
            'CreateLoginProfile',
            'UpdateAssumeRolePolicy',
            'PassRole'
        ]
        
        attempts = []
        
        for api in escalation_apis:
            response = self.cloudtrail.lookup_events(
                LookupAttributes=[
                    {'AttributeKey': 'EventName', 'AttributeValue': api},
                    {'AttributeKey': 'Username', 'AttributeValue': username}
                ],
                StartTime=datetime.utcnow() - timedelta(days=days),
                MaxResults=50
            )
            
            attempts.extend(response['Events'])
        
        print(f"Privilege escalation attempts by {username}:")
        for event in attempts:
            event_data = json.loads(event['CloudTrailEvent'])
            print(f"  {event['EventTime']}: {event['EventName']}")
            print(f"    IP: {event_data.get('sourceIPAddress')}")
            print(f"    Result: {'Success' if not event_data.get('errorCode') else event_data['errorCode']}")
        
        return attempts
    
    def timeline_reconstruction(self, resource_id, days=90):
        """Reconstruct complete timeline for a resource"""
        
        print(f"Reconstructing timeline for {resource_id}")
        
        response = self.cloudtrail.lookup_events(
            LookupAttributes=[
                {'AttributeKey': 'ResourceName', 'AttributeValue': resource_id}
            ],
            StartTime=datetime.utcnow() - timedelta(days=days),
            MaxResults=1000
        )
        
        timeline = []
        
        for event in response['Events']:
            event_data = json.loads(event['CloudTrailEvent'])
            
            timeline.append({
                'timestamp': event['EventTime'],
                'event': event['EventName'],
                'user': event_data['userIdentity'].get('userName', 'unknown'),
                'ip': event_data.get('sourceIPAddress'),
                'request': event_data.get('requestParameters'),
                'response': event_data.get('responseElements')
            })
        
        # Sort by timestamp
        timeline.sort(key=lambda x: x['timestamp'])
        
        print(f"\nTimeline ({len(timeline)} events):")
        for entry in timeline:
            print(f"\n{entry['timestamp']}")
            print(f"  Event: {entry['event']}")
            print(f"  User: {entry['user']}")
            print(f"  IP: {entry['ip']}")
            if entry['event'] in ['TerminateInstances', 'DeleteBucket', 'DeleteDBInstance']:
                print(f"  ⚠️  DELETION EVENT")
        
        return timeline

# Usage
investigator = CloudTrailInvestigator()

# Investigate compromised credentials
investigation = investigator.investigate_compromised_credentials(
    'AKIAIOSFODNN7EXAMPLE',
    days=90
)

# Find privilege escalation
escalation = investigator.find_privilege_escalation_attempts(
    'suspicious-user',
    days=30
)

# Reconstruct resource timeline
timeline = investigator.timeline_reconstruction(
    'i-1234567890abcdef0',
    days=90
)
```


### Compliance Automation

**Automated Compliance Reporting:**

```python
class ComplianceReporter:
    """Generate compliance reports from Config"""
    
    def __init__(self):
        self.config = boto3.client('config')
        self.s3 = boto3.client('s3')
    
    def generate_compliance_report(self, framework='CIS'):
        """Generate compliance report for framework"""
        
        print(f"Generating {framework} Compliance Report")
        print(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        
        # Get all Config rules
        rules_response = self.config.describe_config_rules()
        
        # Get compliance for each rule
        compliance_data = []
        
        for rule in rules_response['ConfigRules']:
            rule_name = rule['ConfigRuleName']
            
            # Get compliance details
            try:
                compliance = self.config.describe_compliance_by_config_rule(
                    ConfigRuleNames=[rule_name]
                )
                
                if compliance['ComplianceByConfigRules']:
                    compliance_info = compliance['ComplianceByConfigRules'][0]
                    compliance_type = compliance_info.get('Compliance', {}).get('ComplianceType', 'UNKNOWN')
                    
                    # Get non-compliant resource count
                    details = self.config.get_compliance_details_by_config_rule(
                        ConfigRuleName=rule_name,
                        ComplianceTypes=['NON_COMPLIANT']
                    )
                    
                    non_compliant_count = len(details['EvaluationResults'])
                    
                    compliance_data.append({
                        'rule': rule_name,
                        'status': compliance_type,
                        'non_compliant_resources': non_compliant_count
                    })
            
            except Exception as e:
                print(f"Error getting compliance for {rule_name}: {e}")
        
        # Calculate overall score
        total_rules = len(compliance_data)
        compliant_rules = sum(1 for r in compliance_data if r['status'] == 'COMPLIANT')
        compliance_score = (compliant_rules / total_rules * 100) if total_rules > 0 else 0
        
        # Generate report
        report = {
            'framework': framework,
            'date': datetime.now().isoformat(),
            'overall_score': compliance_score,
            'total_rules': total_rules,
            'compliant_rules': compliant_rules,
            'non_compliant_rules': total_rules - compliant_rules,
            'rules': compliance_data
        }
        
        # Print summary
        print(f"\n=== Compliance Summary ===")
        print(f"Overall Score: {compliance_score:.1f}%")
        print(f"Compliant Rules: {compliant_rules}/{total_rules}")
        
        # Non-compliant rules
        non_compliant = [r for r in compliance_data if r['status'] != 'COMPLIANT']
        
        if non_compliant:
            print(f"\n❌ Non-Compliant Rules ({len(non_compliant)}):")
            for rule in non_compliant:
                print(f"  {rule['rule']}: {rule['non_compliant_resources']} resources")
        
        # Save report to S3
        report_key = f"compliance-reports/{framework}/{datetime.now().strftime('%Y-%m-%d')}.json"
        
        self.s3.put_object(
            Bucket='compliance-reports-bucket',
            Key=report_key,
            Body=json.dumps(report, indent=2),
            ContentType='application/json'
        )
        
        print(f"\nReport saved to s3://compliance-reports-bucket/{report_key}")
        
        return report
    
    def compliance_dashboard_metrics(self):
        """Push compliance metrics to CloudWatch for dashboards"""
        
        cloudwatch = boto3.client('cloudwatch')
        
        # Get compliance summary
        summary = self.config.describe_compliance_by_config_rule()
        
        compliant = 0
        non_compliant = 0
        
        for rule in summary['ComplianceByConfigRules']:
            compliance_type = rule.get('Compliance', {}).get('ComplianceType', 'UNKNOWN')
            
            if compliance_type == 'COMPLIANT':
                compliant += 1
            elif compliance_type == 'NON_COMPLIANT':
                non_compliant += 1
        
        total = compliant + non_compliant
        compliance_percentage = (compliant / total * 100) if total > 0 else 0
        
        # Push to CloudWatch
        cloudwatch.put_metric_data(
            Namespace='Compliance',
            MetricData=[
                {
                    'MetricName': 'ComplianceScore',
                    'Value': compliance_percentage,
                    'Unit': 'Percent',
                    'Timestamp': datetime.utcnow()
                },
                {
                    'MetricName': 'CompliantRules',
                    'Value': compliant,
                    'Unit': 'Count'
                },
                {
                    'MetricName': 'NonCompliantRules',
                    'Value': non_compliant,
                    'Unit': 'Count'
                }
            ]
        )
        
        print(f"Pushed compliance metrics to CloudWatch")
        print(f"  Compliance Score: {compliance_percentage:.1f}%")

# Usage
reporter = ComplianceReporter()

# Generate report
report = reporter.generate_compliance_report('CIS')

# Push metrics for dashboard
reporter.compliance_dashboard_metrics()

# Schedule with Lambda (EventBridge cron):
# rate(1 day) - Daily compliance reports
```


### Cost Optimization Strategies

**CloudTrail and Config Cost Management:**

```
Cost Breakdown:

CloudTrail:
- Management events (first copy): Free
- Management events (additional copies): $2.00 per 100,000 events
- Data events: $0.10 per 100,000 events (after 2M free)
- Insights events: $0.35 per 100,000 write events analyzed
- S3 storage: $0.023 per GB-month
- CloudWatch Logs ingestion: $0.50 per GB

Typical Costs:
Small account (100 resources):
- CloudTrail storage: $2-5/month
- CloudWatch integration: $5-10/month
- Total: $7-15/month

Large account (5,000 resources):
- CloudTrail storage: $50-100/month
- Data events (selective): $100-200/month
- Insights: $20-50/month
- CloudWatch integration: $100-200/month
- Total: $270-550/month

AWS Config:
- Configuration items: $0.003 per item recorded
- Conformance pack evaluations: $0.001 per evaluation
- Config rule evaluations: $0.001 per evaluation (first 100K free)

Typical Costs:
Small account (100 resources):
- 100 resources × 30 changes/month = 3,000 items
- Cost: 3,000 × $0.003 = $9/month
- Rules: Minimal (under free tier)
- Total: $9-15/month

Large account (5,000 resources):
- 5,000 resources × 30 changes/month = 150,000 items
- Cost: 150,000 × $0.003 = $450/month
- Rules: $50-100/month
- Total: $500-550/month

Cost Optimization Strategies:

1. Selective Data Events:
   Bad: Enable data events for all S3 buckets
   Cost: 100M GetObject events = $98/month
   
   Good: Enable only for sensitive buckets
   Cost: 5M GetObject events = $3/month
   Savings: $95/month (97%)

2. CloudTrail S3 Storage:
   Problem: Logs accumulate indefinitely
   Solution: S3 lifecycle policy
   
   Policy:
   - Transition to S3-IA after 90 days
   - Transition to Glacier after 1 year
   - Delete after 7 years (or compliance requirement)
   
   Savings: 80% on logs older than 90 days

3. CloudWatch Logs Integration:
   Problem: Duplicate storage (S3 + CloudWatch)
   Cost: $0.50/GB ingestion + $0.03/GB-month storage
   
   Solution: Use CloudWatch only for real-time alerts
   Set 7-day retention, rely on S3 for long-term
   
   Savings: 70% on CloudWatch costs

4. Config Recording:
   Problem: Recording all resource types
   High-change resources: Lambda functions, ECS tasks
   
   Solution: Selective recording
   config.put_configuration_recorder(
       ConfigurationRecorder={
           'recordingGroup': {
               'allSupported': False,
               'resourceTypes': [
                   'AWS::EC2::Instance',
                   'AWS::S3::Bucket',
                   'AWS::RDS::DBInstance',
                   'AWS::IAM::User'
               ]  # Only critical resources
           }
       }
   )
   
   Savings: 50-70% on Config costs

5. Config Rule Optimization:
   Problem: Periodic rules running too frequently
   Daily evaluation: 30 evaluations/month
   Hourly evaluation: 720 evaluations/month (24× cost)
   
   Solution: Adjust to business needs
   - Critical rules: Configuration change + 24h periodic
   - Non-critical: Weekly periodic
   
   Savings: 60-80% on rule evaluation costs

6. Organization Trails:
   Problem: Separate trail per account
   Cost: 10 accounts × $50/month = $500/month
   
   Solution: Organization trail (centralized)
   Cost: $50/month (one trail for all accounts)
   
   Savings: $450/month (90%)

Monthly Cost Example:

Before Optimization:
- CloudTrail (all data events): $200
- CloudWatch Logs (indefinite): $150
- Config (all resources): $450
- Total: $800/month

After Optimization:
- CloudTrail (selective data events): $50
- CloudWatch Logs (7-day retention): $30
- Config (critical resources only): $150
- Total: $230/month

Savings: $570/month (71%)
Annual savings: $6,840
```


## Tips \& Best Practices

### CloudTrail Best Practices

**Tip 1: Enable Organization Trail Immediately**
Centralized logging for all accounts prevents individual accounts from disabling audit trails.

**Tip 2: Enable Log File Validation**
Cryptographic proof prevents tampering—essential for compliance and forensic investigations.

**Tip 3: Use Multi-Region Trails**
Single trail logs all regions—simplifies management, ensures complete coverage.

**Tip 4: Integrate with CloudWatch for Real-Time Alerts**
Near real-time detection of suspicious activity—S3 delivery takes up to 15 minutes.

**Tip 5: Enable Insights for Production Accounts**
ML-based anomaly detection catches unusual patterns—early warning of security incidents (\$5-50/month well spent).

### Config Best Practices

**Tip 6: Start with Conformance Packs**
Pre-built rule sets for CIS, PCI DSS, HIPAA—faster than creating rules individually.

**Tip 7: Test Remediation Actions in Development First**
Automated remediation can cause service disruption—thorough testing prevents production incidents.

**Tip 8: Use Config Aggregators for Multi-Account**
Single dashboard for entire organization—identifies systemic compliance issues.

**Tip 9: Focus on Critical Resources**
Record only high-impact resources initially—expands to all resources once cost understood.

**Tip 10: Enable Configuration Snapshots**
Daily snapshots provide point-in-time recovery—useful for disaster recovery planning.

### Integration Best Practices

**Tip 11: Combine CloudTrail + Config for Complete Visibility**
CloudTrail shows "who did what," Config shows "current state"—together provide complete picture.

**Tip 12: Forward Logs to SIEM for Advanced Analysis**
CloudTrail/Config → Kinesis Firehose → Splunk/QRadar—centralized security monitoring.

**Tip 13: Automate Compliance Reporting**
Weekly/monthly automated reports to stakeholders—reduces manual effort, improves visibility.

**Tip 14: Use CloudTrail for Troubleshooting**
"Who deleted this resource?" answered in seconds—essential operational tool beyond security.

**Tip 15: Implement Least Privilege for CloudTrail/Config**
Restrict who can modify trails and Config recorders—prevents attackers from disabling logging.

## Pitfalls \& Remedies

### Pitfall 1: Missing Critical API Calls

**Problem:** Important API calls not logged, leaving blind spots in audit trail.

**Why It Happens:**

- Data events not enabled (S3 object access, Lambda invocations)
- Regional trail missing events from other regions
- CloudTrail disabled without detection
- Service-linked roles not understood (some events logged differently)

**Impact:**

- Security incidents undetected
- Compliance violations
- Forensic investigations incomplete
- Unable to answer "who accessed this data?"

**Example:**

```
Scenario: Suspected data breach from S3 bucket
Investigation: Need to know who accessed objects
CloudTrail: Only management events enabled
Result: No record of GetObject calls (data events not logged)
Conclusion: Cannot determine if data was accessed or by whom
Impact: Incomplete investigation, potential regulatory penalties
```

**Remedy:**

**Step 1: Audit Current CloudTrail Configuration**

```python
def audit_cloudtrail_coverage():
    """Audit CloudTrail coverage and identify gaps"""
    
    cloudtrail = boto3.client('cloudtrail')
    
    # Get all trails
    trails = cloudtrail.describe_trails()['trailList']
    
    print("=== CloudTrail Coverage Audit ===\n")
    
    if not trails:
        print("❌ NO TRAILS CONFIGURED")
        print("   Action: Create multi-region trail immediately")
        return
    
    for trail in trails:
        trail_name = trail['Name']
        is_multi_region = trail.get('IsMultiRegionTrail', False)
        is_organization = trail.get('IsOrganizationTrail', False)
        log_validation = trail.get('LogFileValidationEnabled', False)
        
        print(f"Trail: {trail_name}")
        print(f"  Multi-region: {'✓' if is_multi_region else '❌ SINGLE REGION ONLY'}")
        print(f"  Organization: {'✓' if is_organization else '✗'}")
        print(f"  Log validation: {'✓' if log_validation else '❌ DISABLED'}")
        
        # Check if logging is active
        status = cloudtrail.get_trail_status(Name=trail_name)
        is_logging = status['IsLogging']
        
        print(f"  Logging status: {'✓ Active' if is_logging else '❌ STOPPED'}")
        
        # Check event selectors (data events)
        try:
            selectors = cloudtrail.get_event_selectors(TrailName=trail_name)
            
            has_data_events = False
            for selector in selectors['EventSelectors']:
                if selector.get('DataResources'):
                    has_data_events = True
                    print(f"  Data events: ✓ Enabled")
                    
                    for resource in selector['DataResources']:
                        print(f"    - {resource['Type']}: {len(resource['Values'])} resources")
            
            if not has_data_events:
                print(f"  Data events: ❌ NOT ENABLED")
                print(f"    Impact: S3 object access, Lambda invocations NOT logged")
        
        except Exception as e:
            print(f"  Event selectors: Error - {e}")
        
        # Check Insights
        try:
            insights = cloudtrail.get_insight_selectors(TrailName=trail_name)
            
            if insights['InsightSelectors']:
                print(f"  Insights: ✓ Enabled")
            else:
                print(f"  Insights: ❌ NOT ENABLED")
                print(f"    Recommendation: Enable for anomaly detection")
        
        except:
            print(f"  Insights: ❌ NOT ENABLED")
        
        print()
    
    # Recommendations
    print("=== Recommendations ===")
    print("1. Enable multi-region trail if not already")
    print("2. Enable data events for sensitive S3 buckets")
    print("3. Enable log file validation for integrity")
    print("4. Enable Insights for security anomaly detection")
    print("5. Integrate with CloudWatch Logs for real-time alerts")

# Run audit
audit_cloudtrail_coverage()
```

**Step 2: Enable Data Events for Sensitive Resources**

```python
def enable_data_events_for_sensitive_buckets():
    """Enable S3 data events for buckets with sensitive data"""
    
    s3 = boto3.client('s3')
    cloudtrail = boto3.client('cloudtrail')
    
    # Identify sensitive buckets (by tag or naming convention)
    sensitive_buckets = []
    
    buckets = s3.list_buckets()['Buckets']
    
    for bucket in buckets:
        bucket_name = bucket['Name']
        
        # Check tags
        try:
            tags = s3.get_bucket_tagging(Bucket=bucket_name)['TagSet']
            tag_dict = {tag['Key']: tag['Value'] for tag in tags}
            
            if tag_dict.get('DataClassification') in ['Confidential', 'Restricted']:
                sensitive_buckets.append(bucket_name)
            
            # Or check naming convention
            if any(keyword in bucket_name for keyword in ['prod', 'customer', 'pii', 'financial']):
                sensitive_buckets.append(bucket_name)
        
        except:
            pass
    
    print(f"Found {len(sensitive_buckets)} sensitive buckets")
    
    if not sensitive_buckets:
        print("No sensitive buckets identified")
        return
    
    # Enable data events
    trail_name = 'my-organization-trail'
    
    event_selectors = [{
        'ReadWriteType': 'All',
        'IncludeManagementEvents': True,
        'DataResources': [
            {
                'Type': 'AWS::S3::Object',
                'Values': [f'arn:aws:s3:::{bucket}/*' for bucket in sensitive_buckets]
            },
            {
                'Type': 'AWS::Lambda::Function',
                'Values': ['arn:aws:lambda:*:*:function/*']  # All Lambda invocations
            }
        ]
    }]
    
    cloudtrail.put_event_selectors(
        TrailName=trail_name,
        EventSelectors=event_selectors
    )
    
    print(f"Enabled data events for {len(sensitive_buckets)} buckets")
    for bucket in sensitive_buckets[:10]:
        print(f"  - {bucket}")

# Enable data events
enable_data_events_for_sensitive_buckets()
```

**Step 3: Monitor for Disabled Trails**

```python
# CloudWatch alarm for disabled CloudTrail
def create_trail_monitoring():
    """Alert if CloudTrail is disabled"""
    
    # EventBridge rule for StopLogging API call
    events = boto3.client('events')
    
    rule_pattern = {
        "source": ["aws.cloudtrail"],
        "detail-type": ["AWS API Call via CloudTrail"],
        "detail": {
            "eventName": ["StopLogging", "DeleteTrail"]
        }
    }
    
    events.put_rule(
        Name='CloudTrailDisabled',
        EventPattern=json.dumps(rule_pattern),
        State='ENABLED',
        Description='Alert when CloudTrail is disabled'
    )
    
    # SNS notification
    events.put_targets(
        Rule='CloudTrailDisabled',
        Targets=[{
            'Id': '1',
            'Arn': 'arn:aws:sns:us-east-1:123456789012:critical-security-alerts'
        }]
    )
    
    print("Created monitoring for CloudTrail changes")

create_trail_monitoring()
```

**Prevention:**

- Enable organization trail (cannot be disabled by member accounts)
- Regular audits of CloudTrail configuration
- CloudWatch alarms for StopLogging events
- Service Control Policies preventing trail deletion
- Enable data events for sensitive resources from day one
- Document which resources require data event logging

***

### Pitfall 2: Config Rule Complexity and False Positives

**Problem:** Custom Config rules too complex, generating false positives that waste investigation time.

**Why It Happens:**

- Rules don't account for all valid configurations
- Incomplete understanding of resource relationships
- Rules trigger on expected behavior
- No exception handling for special cases
- Overly strict compliance requirements

**Impact:**

- Team ignores Config findings (alert fatigue)
- Actual compliance issues missed
- Time wasted investigating false positives
- Loss of confidence in compliance monitoring

**Example:**

```
Config Rule: "All S3 buckets must have encryption"
False Positive Scenario:
- Bucket: "cloudtrail-logs-bucket"
- Encryption: Server-side (AWS manages keys)
- Rule check: Looks for customer-managed KMS keys only
- Result: Marked NON_COMPLIANT
- Reality: Bucket IS encrypted (just not with KMS CMK)
- Investigation: 30 minutes wasted confirming false positive
- Frequency: Daily (100+ buckets)
- Annual waste: 750 hours (18 weeks)
```

**Remedy:**

**Step 1: Simplify Rules and Add Exceptions**

```python
# Custom Lambda function for Config rule
def lambda_handler(event, context):
    """
    Check S3 bucket encryption with proper exception handling
    """
    
    import boto3
    import json
    
    config = boto3.client('config')
    s3 = boto3.client('s3')
    
    # Get invoking event
    invoking_event = json.loads(event['invokingEvent'])
    
    # Check if deletion event
    if invoking_event['configurationItemStatus'] == 'ResourceDeleted':
        return {
            'compliance_type': 'NOT_APPLICABLE',
            'annotation': 'Resource deleted'
        }
    
    configuration_item = invoking_event['configurationItem']
    bucket_name = configuration_item['resourceName']
    
    # Exception list (buckets that don't need KMS encryption)
    exceptions = [
        'cloudtrail-logs-',  # CloudTrail can use S3 encryption
        'elb-logs-',  # ELB uses S3 encryption
        'cloudfront-logs-',  # CloudFront uses S3 encryption
        'public-website-'  # Public buckets don't need KMS
    ]
    
    # Check if bucket is in exception list
    if any(bucket_name.startswith(prefix) for prefix in exceptions):
        return {
            'compliance_type': 'COMPLIANT',
            'annotation': f'Bucket {bucket_name} is in exception list'
        }
    
    # Check encryption
    try:
        encryption = s3.get_bucket_encryption(Bucket=bucket_name)
        
        rules = encryption['ServerSideEncryptionConfiguration']['Rules']
        
        for rule in rules:
            sse = rule['ApplyServerSideEncryptionByDefault']
            
            # Accept both KMS and AES256
            if sse['SSEAlgorithm'] in ['aws:kms', 'AES256']:
                return {
                    'compliance_type': 'COMPLIANT',
                    'annotation': f'Encryption enabled: {sse["SSEAlgorithm"]}'
                }
        
        # No valid encryption found
        return {
            'compliance_type': 'NON_COMPLIANT',
            'annotation': 'No server-side encryption configured'
        }
    
    except s3.exceptions.ServerSideEncryptionConfigurationNotFoundError:
        return {
            'compliance_type': 'NON_COMPLIANT',
            'annotation': 'No encryption configuration found'
        }
    
    except Exception as e:
        return {
            'compliance_type': 'NOT_APPLICABLE',
            'annotation': f'Error checking encryption: {str(e)}'
        }
```

**Step 2: Use Parameters for Flexibility**

```python
# Config rule with parameters for exceptions
config.put_config_rule(
    ConfigRule={
        'ConfigRuleName': 's3-bucket-encryption-flexible',
        'Description': 'Check S3 encryption with exceptions',
        'InputParameters': json.dumps({
            'allowAES256': 'true',  # Allow S3-managed encryption
            'exceptionBuckets': 'cloudtrail-logs-*,elb-logs-*',  # Exception patterns
            'requireKMSForProduction': 'true'  # Strict for prod
        }),
        'Source': {
            'Owner': 'CUSTOM_LAMBDA',
            'SourceIdentifier': 'arn:aws:lambda:region:account:function:s3-encryption-check',
            'SourceDetails': [{
                'EventSource': 'aws.config',
                'MessageType': 'ConfigurationItemChangeNotification'
            }]
        },
        'Scope': {
            'ComplianceResourceTypes': ['AWS::S3::Bucket']
        }
    }
)
```

**Step 3: Test Rules Thoroughly**

```python
def test_config_rule(rule_name, test_cases):
    """Test Config rule against known scenarios"""
    
    config = boto3.client('config')
    
    print(f"Testing rule: {rule_name}\n")
    
    for test_case in test_cases:
        resource_id = test_case['resource_id']
        expected_result = test_case['expected']
        description = test_case['description']
        
        # Trigger evaluation
        config.start_config_rules_evaluation(
            ConfigRuleNames=[rule_name]
        )
        
        # Wait for evaluation
        import time
        time.sleep(10)
        
        # Get result
        response = config.get_compliance_details_by_resource(
            ResourceType='AWS::S3::Bucket',
            ResourceId=resource_id
        )
        
        if response['EvaluationResults']:
            result = response['EvaluationResults'][0]
            actual_result = result['ComplianceType']
            
            status = '✓' if actual_result == expected_result else '❌'
            
            print(f"{status} {description}")
            print(f"   Resource: {resource_id}")
            print(f"   Expected: {expected_result}")
            print(f"   Actual: {actual_result}")
            
            if actual_result != expected_result:
                print(f"   ⚠️  FALSE POSITIVE/NEGATIVE")
        
        print()

# Test scenarios
test_cases = [
    {
        'resource_id': 'cloudtrail-logs-bucket',
        'expected': 'COMPLIANT',
        'description': 'CloudTrail bucket with S3 encryption'
    },
    {
        'resource_id': 'customer-data-prod',
        'expected': 'COMPLIANT',
        'description': 'Production bucket with KMS encryption'
    },
    {
        'resource_id': 'temp-bucket',
        'expected': 'NON_COMPLIANT',
        'description': 'Temporary bucket without encryption'
    }
]

test_config_rule('s3-bucket-encryption-flexible', test_cases)
```

**Prevention:**

- Start with managed rules (AWS-tested)
- Test custom rules against all valid scenarios
- Use parameters for exceptions
- Document rule logic clearly
- Regular rule review with security team
- Gradual rollout (development → production)
- Monitor false positive rate
- Feedback loop from investigations

***

### Pitfall 3: Excessive Storage Costs

**Problem:** CloudTrail and Config storage costs grow unexpectedly, consuming significant AWS budget.

**Why It Happens:**

- No S3 lifecycle policies configured
- Data events enabled for all resources
- Config recording all resource types
- Logs retained indefinitely
- No compression or archival strategy

**Impact:**

- Monthly costs increasing 10-20% per month
- Budget overruns
- Compliance data expensive to maintain
- Temptation to disable logging (compliance risk)

**Example:**

```
Initial Setup:
- CloudTrail: All data events enabled
- Config: All resource types recorded
- Retention: Indefinite
- Month 1: $50

After 12 Months:
- CloudTrail logs: 500 GB × $0.023 = $11.50/month
- Config data: 2 TB × $0.003 per item = $900/month
- Total: $911.50/month (18× initial estimate)
- Annual cost: $10,938
```

**Remedy:**

**Step 1: Implement S3 Lifecycle Policies**

```python
def configure_cloudtrail_lifecycle():
    """Configure lifecycle policies for cost optimization"""
    
    s3 = boto3.client('s3')
    
    bucket_name = 'my-cloudtrail-logs-bucket'
    
    lifecycle_policy = {
        'Rules': [
            {
                'Id': 'TransitionOldLogs',
                'Status': 'Enabled',
                'Prefix': 'AWSLogs/',
                'Transitions': [
                    {
                        'Days': 90,
                        'StorageClass': 'STANDARD_IA'  # Infrequent Access
                    },
                    {
                        'Days': 365,
                        'StorageClass': 'GLACIER'  # Archive
                    }
                ],
                'Expiration': {
                    'Days': 2555  # 7 years (compliance requirement)
                }
            }
        ]
    }
    
    s3.put_bucket_lifecycle_configuration(
        Bucket=bucket_name,
        LifecycleConfiguration=lifecycle_policy
    )
    
    print("Configured lifecycle policy:")
    print("  0-90 days: S3 Standard ($0.023/GB)")
    print("  90-365 days: S3-IA ($0.0125/GB) - 46% savings")
    print("  1-7 years: Glacier ($0.004/GB) - 83% savings")
    print("  After 7 years: Deleted")
    
    # Cost calculation
    monthly_logs = 50  # GB
    annual_logs = monthly_logs * 12
    
    cost_without_lifecycle = annual_logs * 0.023 * 12  # All Standard
    
    # With lifecycle (approximate)
    cost_standard = (monthly_logs * 3) * 0.023  # 3 months
    cost_ia = (monthly_logs * 9) * 0.0125  # 9 months
    cost_glacier = (annual_logs * 6) * 0.004  # 6 years
    cost_with_lifecycle = cost_standard + cost_ia + cost_glacier
    
    annual_savings = (cost_without_lifecycle - cost_with_lifecycle) * 12
    
    print(f"\nAnnual savings: ${annual_savings:.2f}")

configure_cloudtrail_lifecycle()
```

**Step 2: Optimize Config Recording**

```python
def optimize_config_recording():
    """Record only critical resources"""
    
    config = boto3.client('config')
    
    # Before: All resource types (expensive)
    # After: Critical resources only
    
    critical_resource_types = [
        # Compute
        'AWS::EC2::Instance',
        'AWS::Lambda::Function',
        
        # Storage
        'AWS::S3::Bucket',
        'AWS::RDS::DBInstance',
        
        # Network
        'AWS::EC2::SecurityGroup',
        'AWS::EC2::VPC',
        
        # IAM
        'AWS::IAM::User',
        'AWS::IAM::Role',
        'AWS::IAM::Policy',
        
        # Security
        'AWS::KMS::Key',
        'AWS::SecretsManager::Secret'
    ]
    
    config.put_configuration_recorder(
        ConfigurationRecorder={
            'name': 'default',
            'roleARN': 'arn:aws:iam::account:role/AWSConfigRole',
            'recordingGroup': {
                'allSupported': False,  # Don't record all
                'includeGlobalResourceTypes': True,
                'resourceTypes': critical_resource_types
            }
        }
    )
    
    print(f"Configured Config to record {len(critical_resource_types)} resource types")
    print("Estimated savings: 50-70% on Config costs")

optimize_config_recording()
```

**Step 3: Audit and Clean Up**

```python
def audit_storage_costs():
    """Audit CloudTrail and Config storage costs"""
    
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get CloudTrail bucket size
    cloudtrail_bucket = 'my-cloudtrail-logs-bucket'
    
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='BucketSizeBytes',
        Dimensions=[
            {'Name': 'BucketName', 'Value': cloudtrail_bucket},
            {'Name': 'StorageType', 'Value': 'StandardStorage'}
        ],
        StartTime=datetime.utcnow() - timedelta(days=1),
        EndTime=datetime.utcnow(),
        Period=86400,
        Statistics=['Average']
    )
    
    if response['Datapoints']:
        size_bytes = response['Datapoints'][0]['Average']
        size_gb = size_bytes / (1024**3)
        monthly_cost = size_gb * 0.023
        
        print(f"CloudTrail Storage:")
        print(f"  Size: {size_gb:.2f} GB")
        print(f"  Monthly cost: ${monthly_cost:.2f}")
    
    # Config storage (approximate from CloudWatch metrics)
    # Query number of configuration items recorded
    
    config = boto3.client('config')
    
    # Get delivery channel
    channels = config.describe_delivery_channels()
    
    if channels['DeliveryChannels']:
        config_bucket = channels['DeliveryChannels'][0]['s3BucketName']
        
        # Similar size calculation
        print(f"\nConfig Storage:")
        print(f"  Bucket: {config_bucket}")
        print(f"  Recommendation: Review recorded resource types")

audit_storage_costs()
```

**Prevention:**

- Configure lifecycle policies from day one
- Selective data events (only sensitive resources)
- Selective Config recording (critical resources)
- Regular cost audits (monthly)
- Set AWS Budgets alerts for unexpected increases
- Document retention requirements
- Archive to Glacier for long-term compliance

***

## Chapter Summary

AWS CloudTrail and AWS Config provide comprehensive governance, compliance, and audit capabilities through continuous API logging and resource configuration tracking. CloudTrail records every action taken in AWS accounts—creating immutable audit trails for security investigations, compliance reporting, and operational troubleshooting—while Config continuously monitors resource configurations, evaluates compliance against rules, and tracks changes over time. Together, these services answer critical questions: "Who did what and when?" (CloudTrail) and "What resources exist and are they compliant?" (Config).

**Key Takeaways:**

- **Enable Organization Trail:** Centralized logging for all accounts prevents member accounts from disabling audit trails; single S3 bucket reduces costs 90%
- **Enable Log File Validation:** Cryptographic proof prevents tampering with audit logs; essential for compliance and forensic investigations
- **Integrate CloudTrail with CloudWatch:** Near real-time alerts on suspicious activity; metric filters detect root account usage, unauthorized calls, security group changes
- **Deploy Conformance Packs:** Pre-built rule collections for CIS, PCI DSS, HIPAA compliance; deploy entire framework at once instead of individual rules
- **Use Config Aggregators:** Single dashboard for multi-account compliance; cross-account queries identify systemic issues across organization
- **Implement Automated Remediation:** Config triggers SSM automation documents to fix non-compliant resources automatically; reduces manual remediation time 95%
- **Optimize Costs Strategically:** S3 lifecycle policies (Glacier after 1 year), selective data events (sensitive buckets only), selective Config recording (critical resources) reduce costs 70%

CloudTrail and Config integrate throughout AWS—CloudTrail events analyzed by GuardDuty for threats, Config rules checking KMS encryption, Security Hub aggregating compliance findings, EventBridge triggering automated responses. These services provide the audit foundation required for security investigations, compliance frameworks, and operational troubleshooting across all AWS services and accounts.

## Hands-On Lab Exercise

**Objective:** Build complete governance and compliance monitoring system with centralized logging, automated compliance checks, and incident investigation capabilities.

**Scenario:** Enterprise with multiple AWS accounts requiring CIS compliance, security audit trails, and automated remediation.

**Prerequisites:**

- AWS Organization with 2+ accounts
- Admin access to master and member accounts

**Steps:**

1. **Enable Organization Trail (40 minutes)**
    - Create S3 bucket with encryption and versioning
    - Configure bucket policy for CloudTrail
    - Create organization trail (multi-region)
    - Enable log file validation
    - Integrate with CloudWatch Logs
    - Enable CloudTrail Insights
    - Verify logging from all member accounts
2. **Configure CloudWatch Alarms (30 minutes)**
    - Create metric filters (root usage, unauthorized calls, security group changes)
    - Create CloudWatch alarms for each metric
    - Configure SNS notifications
    - Test alarms with manual state change
    - Verify email alerts received
3. **Enable AWS Config (45 minutes)**
    - Create Config S3 bucket
    - Enable Config recorder in all regions
    - Deploy CIS conformance pack
    - Create config aggregator (master account)
    - Verify member account data aggregated
    - Review compliance dashboard
4. **Configure Automated Remediation (30 minutes)**
    - Enable s3-bucket-public-read-prohibited rule
    - Configure automatic remediation (block public access)
    - Test with intentionally public bucket
    - Verify automatic remediation within 5 minutes
    - Confirm bucket now compliant
5. **Investigate Security Incident (30 minutes)**
    - Generate sample security event (create IAM user)
    - Query CloudTrail for event
    - Use CloudWatch Logs Insights to analyze
    - Reconstruct timeline of events
    - Export findings to report

**Expected Outcomes:**

- Complete audit trail for all API calls across organization
- CIS compliance score visible in dashboard
- Automated remediation of non-compliant resources
- CloudWatch alarms detecting suspicious activity
- Ability to investigate security incidents rapidly
- Total cost: \$50-100/month for 5-account organization


## Review Questions

1. **What does CloudTrail log by default?**
a) Management events ✓
b) Data events
c) Insights events
d) All events

**Answer: A** - CloudTrail automatically logs management events (control plane); data events require explicit enablement

2. **How long does CloudTrail retain events in console?**
a) 24 hours
b) 7 days
c) 30 days
d) 90 days ✓

**Answer: D** - CloudTrail console shows events for 90 days; S3 storage for longer retention

3. **What does Config record?**
a) API calls
b) Resource configurations ✓
c) Performance metrics
d) Application logs

**Answer: B** - Config records resource configurations and changes; CloudTrail logs API calls

4. **What is required for Config to work?**
a) CloudTrail enabled
b) Configuration recorder started ✓
c) CloudWatch enabled
d) VPC Flow Logs

**Answer: B** - Config requires configuration recorder to be explicitly started; not automatic

5. **What is the purpose of log file validation?**
a) Compress logs
b) Prove integrity with cryptographic hashes ✓
c) Encrypt logs
d) Reduce costs

**Answer: B** - Log file validation provides cryptographic proof logs haven't been tampered with

6. **What triggers a Config rule evaluation?**
a) Configuration change ✓
b) Manual only
c) Daily automatic
d) Never automatic

**Answer: A** - Config rules can trigger on configuration changes, periodic schedule, or both

7. **What is a conformance pack?**
a) Single Config rule
b) Collection of Config rules ✓
c) CloudTrail configuration
d) S3 bucket policy

**Answer: B** - Conformance pack is collection of Config rules implementing compliance framework (CIS, PCI DSS, etc.)

8. **How are CloudTrail logs delivered to S3?**
a) Real-time
b) Within 5 minutes
c) Within 15 minutes ✓
d) Once per hour

**Answer: C** - CloudTrail delivers log files to S3 within 15 minutes; CloudWatch Logs for near real-time

9. **What is Config aggregator used for?**
a) Combine log files
b) Multi-account compliance view ✓
c) Reduce costs
d) Archive data

**Answer: B** - Config aggregator provides centralized compliance view across multiple accounts and regions

10. **What happens during automated Config remediation?**
a) Resource deleted
b) SSM document executes fix ✓
c) Manual approval required
d) Alarm triggered only

**Answer: B** - Automated remediation executes Systems Manager automation document to fix non-compliant resource

***
**Note:** The answers are based on the AWS documentation and best practices for CloudTrail and Config. Always refer to the official AWS documentation for the most accurate and up-to-date information.***
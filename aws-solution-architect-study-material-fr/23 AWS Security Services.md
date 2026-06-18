# Partie 8 : Sécurité \& Conformité

# Chapitre 23 : Services de sécurité AWS

##Présentation

Les failles de sécurité coûtent aux organisations en moyenne 4,45 millions de dollars par incident, la détection prenant en moyenne 277 jours. Les approches de sécurité traditionnelles (examens manuels des journaux, analyses périodiques des vulnérabilités, outils de sécurité cloisonnés) ne peuvent pas protéger les environnements cloud modernes où l'infrastructure évolue de minute en minute et les menaces évoluent d'heure en heure. Les services de sécurité AWS assurent une détection intelligente et automatisée des menaces, une surveillance continue de la conformité et des opérations de sécurité intégrées qui évoluent avec votre infrastructure. Une compréhension approfondie de ces services est essentielle pour les architectes de solutions qui créent des systèmes sécurisés et conformes qui protègent contre les attaques sophistiquées tout en maintenant l'efficacité opérationnelle.

Le portefeuille AWS Security Services répond aux défis de sécurité de manière globale. Amazon GuardDuty analyse des milliards d'événements à l'aide de l'apprentissage automatique pour détecter les menaces en temps réel : instances compromises, accès non autorisés, crypto-mining. AWS Security Hub regroupe les résultats de plusieurs services dans un tableau de bord unifié, fournissant des scores de sécurité et des contrôles de conformité automatisés. Amazon Inspector analyse en permanence les charges de travail à la recherche de vulnérabilités et d'exposition au réseau. Amazon Macie découvre et protège les données sensibles à l'aide de la reconnaissance de modèles d'apprentissage automatique. AWS Detective étudie les résultats de sécurité en analysant les données des journaux de flux VPC, CloudTrail et GuardDuty pour déterminer les causes profondes. Ensemble, ces services transforment la sécurité de la lutte réactive contre les incendies à la prévention proactive des menaces.

Ce chapitre s'appuie sur les connaissances antérieures en matière de sécurité (politiques IAM du chapitre 2, groupes de sécurité VPC du chapitre 3, chiffrement des chapitres sur le stockage) en ajoutant la détection des menaces, la surveillance continue et la réponse automatisée. Ces services s'intègrent à votre architecture existante : GuardDuty analyse les journaux de flux VPC, Security Hub consolide les résultats de l'analyse de vos instances EC2 par Inspector, Macie examine les compartiments S3 à la recherche de données sensibles. Le chapitre couvre les architectures de services, les mécanismes de détection des menaces, l'analyse des résultats, la correction automatisée, les cadres de conformité, les modèles d'intégration et la création de centres d'opérations de sécurité qui détectent et répondent aux menaces en quelques minutes au lieu de plusieurs mois.

## Théorie \&Concepts

### Défis de sécurité du cloud

**Sécurité traditionnelle ou sécurité cloud :**
```
Traditional Data Center Security:

Perimeter Defense Model:
- Physical security (building access)
- Network firewalls (single entry point)
- Manual security audits (quarterly)
- Static infrastructure (changes monthly)

Characteristics:
✓ Well-understood perimeter
✓ Controlled access points
✓ Physical security measures
✗ Slow to adapt
✗ Manual processes
✗ Cannot scale dynamically

Cloud Security Challenges:

Dynamic Infrastructure:
- Resources created/destroyed constantly
- No fixed perimeter (internet-facing services)
- Multi-account environments
- API-driven changes (thousands/day)

New Attack Vectors:
- API credential theft
- Misconfigured S3 buckets (public data)
- Excessive IAM permissions
- Unpatched AMIs
- Crypto-mining on compromised instances

Complexity:
- 200+ AWS services
- Thousands of configuration options
- Multiple teams deploying independently
- Compliance requirements vary by region

Traditional Tools Fail:
- Manual audits too slow (infrastructure changed)
- Perimeter security insufficient (services internet-facing)
- Static rules don't detect new threats
- Cannot process billions of events

Cloud-Native Security Requirements:
✓ Automated threat detection
✓ Continuous monitoring
✓ Real-time response
✓ Machine learning for anomaly detection
✓ API-driven remediation
✓ Multi-account visibility
```
**Modèle de responsabilité partagée AWS :**
```
AWS Responsibility: Security OF the Cloud
- Physical data center security
- Network infrastructure
- Hypervisor isolation
- Hardware disposal
- Service availability

Customer Responsibility: Security IN the Cloud
- IAM policies and permissions
- Data encryption
- Network configuration (security groups, NACLs)
- Application security
- Patch management
- Access logging and monitoring
- Compliance validation

Example Breakdown:

EC2 Instance Security:
AWS: Physical server, hypervisor, network
Customer: OS patches, application security, data encryption, IAM roles

S3 Bucket Security:
AWS: Infrastructure, availability, hardware
Customer: Bucket policies, encryption, versioning, access logging

RDS Database Security:
AWS: Infrastructure, automated backups, patching (managed)
Customer: Database credentials, encryption keys, security groups, IAM

Critical Insight:
AWS provides secure infrastructure
Customers must configure it securely
AWS Security Services help customers meet their responsibility
```
### Amazon GuardDuty

**Architecture et détection des menaces :**
```
GuardDuty Purpose:
Intelligent threat detection service analyzing:
- VPC Flow Logs (network traffic)
- CloudTrail events (API calls)
- DNS logs (domain queries)
- Kubernetes audit logs (EKS)

Machine Learning Models:
- Baseline normal behavior
- Detect anomalies
- Known malicious IPs/domains
- Crypto-mining signatures
- Reconnaissance patterns

GuardDuty Data Flow:

AWS Account Activity
├── VPC Flow Logs → GuardDuty Analysis Engine
├── CloudTrail Logs → ML Models & Threat Intelligence
├── DNS Logs → Pattern Recognition
└── EKS Audit Logs → Behavioral Analysis
    ↓
Findings Generated
├── Severity: Low, Medium, High, Critical
├── Type: UnauthorizedAccess, CryptoCurrency, etc.
└── Evidence: IP addresses, resources, timestamps
    ↓
Integration Points
├── EventBridge (automated response)
├── Security Hub (centralized view)
└── SNS (notifications)

Key Features:

Threat Intelligence:
- AWS threat feeds (billions of IPs/domains)
- Third-party feeds (Proofpoint, CrowdStrike)
- Malicious IP databases
- Known command-and-control servers

Anomaly Detection:
- Unusual API calls
- New ports/protocols
- Login from new locations
- Spikes in API activity
- Resource access patterns

Severity Levels:

Low (Informational):
- Reconnaissance attempts
- Minor policy violations
Example: "Port scan detected from known scanner"

Medium:
- Suspicious activity requiring investigation
- Potential security issues
Example: "Instance communicating with known malicious IP"

High:
- Active threat or policy violation
- Requires immediate attention
Example: "Cryptocurrency mining activity detected"

Critical:
- Confirmed compromise or severe threat
- Emergency response needed
Example: "Backdoor installed on instance, data exfiltration detected"
```
**Types de résultats GuardDuty courants :**
```
1. UnauthorizedAccess Findings:

UnauthorizedAccess:EC2/SSHBruteForce
- SSH brute force attempts
- Multiple failed login attempts
- Likely automated attack
Response: Block source IP, review instance security

UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration
- IAM credentials used outside AWS
- Stolen credentials used externally
- Critical security breach
Response: Rotate credentials immediately, investigate compromise

UnauthorizedAccess:IAMUser/TorIPCaller
- API calls from Tor exit nodes
- Anonymized access (suspicious)
- Possible credential theft
Response: Require MFA, investigate user activity

2. CryptoCurrency Findings:

CryptoCurrency:EC2/BitcoinTool.B!DNS
- Instance querying Bitcoin-related domains
- Crypto-mining activity
- Resource theft
Response: Isolate instance, forensic analysis, terminate

3. Backdoor Findings:

Backdoor:EC2/C&CActivity.B!DNS
- Communication with command-and-control server
- Instance compromised
- Active threat
Response: Isolate immediately, snapshot for forensics, terminate

4. Reconnaissance Findings:

Recon:EC2/PortProbeUnprotectedPort
- Port scanning from instance
- Preparing for attack
- Early warning
Response: Review instance purpose, investigate legitimacy

5. Trojan Findings:

Trojan:EC2/DNSDataExfiltration
- Data exfiltration via DNS queries
- Advanced persistent threat
- Ongoing data theft
Response: Isolate, forensic analysis, incident response

6. Impact Findings:

Impact:EC2/AbusedDomainRequest.Reputation
- Queries to known malicious domains
- Malware communication
- Compromised instance
Response: Isolate and investigate

Cost Model:

Free Tier: 30-day trial (full features)

Pricing After Trial:
- CloudTrail analysis: $4.00 per million events
- VPC Flow Log analysis: $1.00 per GB
- DNS log analysis: $0.40 per million events
- EKS audit logs: $0.40 per million events

Typical Monthly Cost:
Small environment (50 resources): $30-50/month
Medium environment (500 resources): $100-200/month
Large environment (5,000+ resources): $500-1,000+/month

Cost Optimization:
- Analyze by log volume, not resource count
- High value vs cost (detect threats early)
- Cheaper than breach ($4.45M average)
```
### Hub de sécurité AWS

**Gestion centralisée de la posture de sécurité :**
```
Security Hub Purpose:
- Aggregate findings from multiple services
- Unified security view across accounts
- Compliance framework checks
- Security score dashboard
- Automated remediation workflows

Architecture:

Security Finding Sources:
├── GuardDuty (threat detection)
├── Inspector (vulnerability scanning)
├── Macie (sensitive data discovery)
├── IAM Access Analyzer (permission risks)
├── Firewall Manager (policy compliance)
├── Systems Manager (patch compliance)
├── Third-party tools (Palo Alto, Splunk, etc.)
└── Custom findings (via API)
    ↓
Security Hub Aggregation
├── Normalize findings (standard format)
├── Calculate security score
├── Apply insights (filters/groupings)
└── Check compliance frameworks
    ↓
Integration Points
├── EventBridge (automated actions)
├── SIEM tools (Splunk, QRadar)
├── Ticketing systems (ServiceNow, Jira)
└── ChatOps (Slack, Teams)

Security Standards:

1. AWS Foundational Security Best Practices:
   - Comprehensive AWS security checks
   - IAM, EC2, S3, RDS, Lambda, etc.
   - 150+ automated checks
   - Free (included)

2. CIS AWS Foundations Benchmark:
   - Industry-standard security baseline
   - Center for Internet Security standards
   - 50+ checks
   - IAM, logging, monitoring, networking

3. PCI DSS (Payment Card Industry):
   - Credit card data protection
   - Required for payment processing
   - 40+ checks
   - Encryption, access control, monitoring

4. NIST (National Institute of Standards):
   - Federal security standards
   - Government compliance
   - Comprehensive controls

5. ISO 27001:
   - International security standard
   - Information security management
   - Audit-ready documentation

Security Score:

Calculation:
Total Passed Checks / Total Checks × 100

Example:
- Total checks: 100
- Passed: 85
- Failed: 15
- Score: 85%

Target: >90% for production accounts
```
**Format de recherche (ASFF) :**
```
AWS Security Finding Format:

{
  "SchemaVersion": "2018-10-08",
  "Id": "finding-id-12345",
  "ProductArn": "arn:aws:securityhub:us-east-1::product/aws/guardduty",
  "GeneratorId": "backdoor-instance",
  "AwsAccountId": "123456789012",
  "Types": ["TTPs/Command and Control/Backdoor"],
  "CreatedAt": "2025-01-15T10:30:00.000Z",
  "UpdatedAt": "2025-01-15T10:30:00.000Z",
  "Severity": {
    "Label": "HIGH",
    "Normalized": 70
  },
  "Title": "Backdoor:EC2/C&CActivity.B!DNS",
  "Description": "EC2 instance communicating with command-and-control server",
  "Resources": [{
    "Type": "AwsEc2Instance",
    "Id": "arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0",
    "Region": "us-east-1",
    "Tags": {"Environment": "production"}
  }],
  "Compliance": {
    "Status": "FAILED"
  },
  "Remediation": {
    "Recommendation": {
      "Text": "Isolate instance, perform forensic analysis"
    }
  },
  "Workflow": {
    "Status": "NEW"  // NEW, NOTIFIED, RESOLVED, SUPPRESSED
  }
}

Benefits of Standard Format:
✓ Consistent across all services
✓ Easy automation
✓ SIEM integration simplified
✓ Third-party tool compatibility
```
** Insights et actions personnalisées :**
```
Insights (Grouping Findings):

Built-in Insights:
1. Resources with most findings
2. Top severity findings
3. Findings by resource type
4. Findings by compliance status
5. Unresolved critical findings

Custom Insights:
Filter: ResourceType = "AwsEc2Instance"
Group by: Tag.Environment
Result: EC2 findings grouped by environment

Use Case: Track security by team/project

Custom Actions (Automated Response):

Example: Auto-remediate S3 public bucket

1. Create EventBridge rule:
   - Pattern: S3 bucket public finding
   - Target: Lambda function

2. Lambda function:
   - Receive finding details
   - Call S3 API to block public access
   - Update Security Hub (mark resolved)
   - Send notification

3. Result: Public bucket fixed automatically (seconds)

Integration Architecture:

Security Hub Finding
    ↓
EventBridge Rule (filter by finding type)
    ↓
Lambda Function (remediation logic)
    ↓
AWS API (fix issue)
    ↓
Security Hub API (update finding status)
    ↓
SNS (notify security team)
```
### Inspecteur Amazon

**Évaluation de la vulnérabilité et de l'exposition du réseau :**
```
Inspector Purpose:
- Continuous vulnerability scanning
- Network reachability analysis
- Package vulnerability detection
- Lambda function assessment

Supported Resources:
- EC2 instances
- Container images (ECR)
- Lambda functions

Assessment Types:

1. Package Vulnerabilities (CVE):
   - Scans OS packages
   - Application dependencies
   - Known vulnerabilities (CVE database)
   - Severity scoring (CVSS)

2. Network Reachability:
   - Port accessibility
   - Security group analysis
   - Network path analysis
   - Internet exposure

Architecture:

EC2 Instance Assessment:
1. Systems Manager Agent (SSM Agent) required
2. Inspector service scans instance
3. Checks installed packages
4. Compares against CVE database
5. Analyzes network configuration
6. Generates findings

Container Image Assessment:
1. Push image to ECR
2. Inspector automatically scans
3. Checks base image and layers
4. Identifies vulnerabilities
5. Provides remediation guidance

Lambda Function Assessment:
1. Inspector scans function code
2. Checks dependencies
3. Identifies vulnerabilities
4. Continuous monitoring

Finding Severity:

Critical (CVSS 9.0-10.0):
- Remote code execution
- SQL injection
- Authentication bypass
- Immediate action required

High (CVSS 7.0-8.9):
- Privilege escalation
- Information disclosure
- Denial of service
- Urgent attention needed

Medium (CVSS 4.0-6.9):
- Minor security issues
- Limited impact
- Should be addressed

Low (CVSS 0.1-3.9):
- Minimal risk
- Informational
- Optional fix

Finding Example:

Title: CVE-2024-12345 - OpenSSL vulnerability
Severity: High (CVSS 8.2)
Resource: EC2 instance i-1234567890abcdef0
Package: openssl-1.0.2k (vulnerable)
Fix: Upgrade to openssl-1.0.2u or later
Impact: Remote code execution possible
Network Path: Internet → Port 443 → Instance
Remediation: 
  1. Update package: yum update openssl
  2. Restart affected services
  3. Verify patch applied

Pricing:

EC2 Scanning:
- $0.30 per instance per month
- 100 instances = $30/month

ECR Image Scanning:
- First scan per image per month: Free
- Subsequent scans: $0.09 per scan

Lambda Function Scanning:
- $0.60 per function per month
- Scans code and dependencies
```
### AmazonMacie

**Découverte et protection des données sensibles :**
```
Macie Purpose:
- Discover sensitive data (PII, financial, credentials)
- Data security and privacy compliance
- S3 bucket inventory and classification
- Automated data protection

Machine Learning Detection:

Sensitive Data Types:
- Personal Identifiable Information (PII):
  * Names, addresses, phone numbers
  * Email addresses
  * Social Security numbers
  * Driver's license numbers
  * Passport numbers

- Financial Information:
  * Credit card numbers
  * Bank account numbers
  * Tax IDs
  * Financial statements

- Credentials:
  * AWS access keys
  * Private keys
  * API keys
  * Passwords

- Healthcare:
  * Medical records
  * Health insurance numbers
  * Prescription data

- Custom Identifiers:
  * Regex patterns (custom)
  * Keywords
  * Business-specific data

Architecture:

S3 Buckets (Data Sources)
    ↓
Macie Discovery Jobs
├── Sample objects (automated)
├── Scan content
├── Apply ML models
└── Pattern matching
    ↓
Classification Results
├── Bucket inventory
├── Object metadata
├── Sensitivity levels
└── Data identifiers
    ↓
Findings
├── Sensitive data discovered
├── Policy violations
└── Security issues

Discovery Job Types:

1. One-Time Job:
   - Scan specific buckets once
   - Comprehensive analysis
   - Historical data assessment

2. Scheduled Job:
   - Daily, weekly, or monthly
   - Continuous monitoring
   - New data detection

3. Automated Discovery:
   - Monitors all buckets
   - Samples objects automatically
   - Prioritizes analysis

Findings:

Policy Findings:
- Unencrypted bucket
- Public bucket
- Shared with external accounts
- Missing bucket policies

Sensitive Data Findings:
- PII discovered
- Financial data exposed
- Credentials in objects
- Healthcare information

Example Finding:

Title: Multiple credit card numbers discovered
Severity: High
Bucket: customer-data-prod
Object: customers/export-2025-01.csv
Count: 1,524 credit card numbers detected
Exposure: Bucket is public
Recommendation: 
  1. Block public access immediately
  2. Enable encryption
  3. Remove sensitive data or mask
  4. Implement access logging

Pricing:

Bucket Inventory:
- $0.10 per 1,000 bucket-months
- 100 buckets × 12 months = $12/year

Sensitive Data Discovery:
- $1.00 per GB scanned
- 1 TB discovery job = $1,000

Automated Discovery (Sampling):
- $0.10 per GB scanned (sampled)
- More cost-effective for large datasets

Cost Optimization:
- Use sampling for large buckets
- Schedule jobs during off-hours
- Focus on high-risk buckets first
```
### Détective AWS

**Enquête de sécurité et analyse des causes profondes :**
```
Detective Purpose:
- Visualize security investigation data
- Analyze root cause of findings
- Correlate events across services
- Interactive graph analysis

Data Sources:
- VPC Flow Logs (network traffic)
- CloudTrail logs (API activity)
- GuardDuty findings (threats)
- Aggregated over time

Investigation Capabilities:

Behavior Graphs:
- Entity relationships (users, roles, IPs, instances)
- Activity timelines
- Anomaly detection
- Historical analysis

Use Cases:

1. Compromised Instance Investigation:
   GuardDuty Alert: Instance mining cryptocurrency
   ↓
   Detective Analysis:
   - When did unusual activity start?
   - What API calls preceded compromise?
   - Which IAM credentials accessed instance?
   - What network connections were established?
   - What data was accessed?
   
   Result: Identify initial attack vector

2. Unusual API Activity:
   GuardDuty Alert: Spike in IAM API calls
   ↓
   Detective Analysis:
   - Normal baseline for this user?
   - Geographic anomaly (new location)?
   - What resources accessed?
   - Pattern of reconnaissance?
   
   Result: Determine if legitimate or attack

3. Data Exfiltration:
   GuardDuty Alert: Large data transfer
   ↓
   Detective Analysis:
   - What triggered the transfer?
   - Source and destination?
   - User/role responsible?
   - Historical transfer patterns?
   
   Result: Confirm data breach, scope impact

Visual Analysis:

Example Graph View:
IAM User (john@example.com)
    ↓
  Assumed Role (EC2-Admin)
    ↓
  Launched Instance (i-12345)
    ↓
  Network Connection (malicious IP)
    ↓
  Data Transfer (5 GB to external)

Timeline: Shows exact timestamps
Anomaly: Highlight unusual activity
Context: Compare to historical baseline

Benefits:
✓ Faster investigations (hours → minutes)
✓ Visual correlation of events
✓ Historical context (up to 1 year)
✓ Reduce false positives
✓ Understand attack progression

Pricing:

Data Ingestion:
- $2.00 per GB of VPC Flow Logs
- $2.00 per GB of CloudTrail logs
- $2.00 per GB of GuardDuty findings

Typical Cost:
Small account: $50-100/month
Medium account: $200-500/month
Large account: $1,000+/month

Free Trial: 30 days (full features)
```
### Architecture d'intégration

**Opérations de sécurité unifiées :**
```
Complete Security Stack:

Data Collection Layer:
├── VPC Flow Logs
├── CloudTrail
├── DNS Logs
├── Application Logs
└── Network Packet Capture

Detection Layer:
├── GuardDuty (threat detection)
├── Inspector (vulnerability scanning)
├── Macie (sensitive data discovery)
├── IAM Access Analyzer (permission risks)
└── Config (configuration compliance)

Aggregation Layer:
└── Security Hub (central dashboard)
    ├── Normalize findings
    ├── Calculate security score
    ├── Apply compliance frameworks
    └── Generate insights

Analysis Layer:
└── Detective (root cause analysis)
    ├── Behavior graphs
    ├── Timeline analysis
    └── Anomaly detection

Response Layer:
├── EventBridge (routing)
├── Lambda (automation)
├── Systems Manager (remediation)
└── SNS (notifications)

Integration Flow:

GuardDuty Finding (compromised instance)
    ↓
Security Hub (aggregates finding)
    ↓
EventBridge Rule (triggers on HIGH severity)
    ↓
Lambda Function (remediation workflow)
├── Isolate instance (security group change)
├── Snapshot instance (forensics)
├── Create Detective investigation
├── Notify security team (SNS)
└── Create ticket (ServiceNow API)
    ↓
Security Team Reviews Detective Analysis
    ↓
Decision: Terminate or Remediate
    ↓
Security Hub Updated (mark resolved)

Multi-Account Strategy:

Organization Structure:
├── Security Account (GuardDuty/Security Hub master)
├── Log Archive Account (centralized logs)
└── Member Accounts (applications)

Benefits:
✓ Centralized security team
✓ Consolidated findings
✓ Consistent policies
✓ Delegated administration
✓ Cost optimization
```
## Implémentation pratique

### Lab 1 : Activer GuardDuty avec une réponse automatisée

**Objectif :** Activer la détection des menaces et créer une réponse automatisée aux instances compromises.

**Étape 1 : Activer GuardDuty**
```bash
# Enable GuardDuty (AWS CLI)
aws guardduty create-detector \
    --enable \
    --finding-publishing-frequency FIFTEEN_MINUTES

# Get detector ID
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)

echo "GuardDuty enabled with detector ID: $DETECTOR_ID"
```
**Étape 2 : Créer un sujet SNS pour les alertes**
```bash
# Create SNS topic
TOPIC_ARN=$(aws sns create-topic \
    --name guardduty-alerts \
    --query 'TopicArn' \
    --output text)

# Subscribe email to topic
aws sns subscribe \
    --topic-arn $TOPIC_ARN \
    --protocol email \
    --notification-endpoint security@example.com

# Confirm subscription (check email)
```
**Étape 3 : Créer une règle EventBridge pour les résultats de haute gravité**
```json
// guardduty-rule-pattern.json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [7, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9]
  }
}
```

```bash
# Create EventBridge rule
aws events put-rule \
    --name guardduty-high-severity \
    --event-pattern file://guardduty-rule-pattern.json \
    --state ENABLED

# Add SNS topic as target
aws events put-targets \
    --rule guardduty-high-severity \
    --targets "Id"="1","Arn"="$TOPIC_ARN"
```
**Étape 4 : Créer une fonction Lambda pour l'isolation automatisée des instances**
```python
# lambda_function.py
import boto3
import json

ec2 = boto3.client('ec2')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Isolate compromised EC2 instance automatically
    """
    
    # Parse GuardDuty finding
    finding = event['detail']
    finding_type = finding['type']
    severity = finding['severity']
    
    # Extract instance ID
    resources = finding.get('resource', {}).get('instanceDetails', {})
    instance_id = resources.get('instanceId')
    
    if not instance_id:
        print("No instance ID found in finding")
        return
    
    print(f"Processing finding: {finding_type}")
    print(f"Severity: {severity}")
    print(f"Instance ID: {instance_id}")
    
    # Create isolation security group (no inbound/outbound)
    try:
        response = ec2.create_security_group(
            GroupName=f'isolated-{instance_id}',
            Description='Isolation SG for compromised instance',
            VpcId=resources.get('vpcId')
        )
        
        isolation_sg = response['GroupId']
        print(f"Created isolation security group: {isolation_sg}")
        
        # Remove all rules (deny all traffic)
        # Default: no rules = deny all
        
    except Exception as e:
        print(f"Error creating security group: {e}")
        # Use existing isolation SG if available
        isolation_sg = 'sg-isolation-group-id'  # Pre-created SG
    
    # Apply isolation security group to instance
    try:
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            Groups=[isolation_sg]
        )
        
        print(f"Instance {instance_id} isolated successfully")
        
        # Create snapshot for forensics
        volumes = ec2.describe_instance_attribute(
            InstanceId=instance_id,
            Attribute='blockDeviceMapping'
        )
        
        for volume in volumes.get('BlockDeviceMappings', []):
            volume_id = volume.get('Ebs', {}).get('VolumeId')
            if volume_id:
                snapshot = ec2.create_snapshot(
                    VolumeId=volume_id,
                    Description=f'Forensic snapshot for {instance_id}'
                )
                print(f"Created snapshot: {snapshot['SnapshotId']}")
        
        # Send notification
        message = f"""
        GuardDuty Alert: Instance Compromised and Isolated
        
        Finding Type: {finding_type}
        Severity: {severity}
        Instance ID: {instance_id}
        Action Taken: Instance isolated, forensic snapshots created
        
        Next Steps:
        1. Review GuardDuty finding details
        2. Analyze forensic snapshots
        3. Determine root cause
        4. Terminate or remediate instance
        """
        
        sns.publish(
            TopicArn='arn:aws:sns:region:account:guardduty-alerts',
            Subject='GuardDuty: Instance Isolated',
            Message=message
        )
        
    except Exception as e:
        print(f"Error isolating instance: {e}")
        raise
    
    return {
        'statusCode': 200,
        'body': json.dumps(f'Instance {instance_id} isolated')
    }
```

```bash
# Package and deploy Lambda
zip function.zip lambda_function.py

aws lambda create-function \
    --function-name guardduty-auto-isolate \
    --runtime python3.11 \
    --role arn:aws:iam::account:role/lambda-execution-role \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://function.zip \
    --timeout 60

# Add Lambda as EventBridge target
aws events put-targets \
    --rule guardduty-high-severity \
    --targets "Id"="2","Arn"="arn:aws:lambda:region:account:function:guardduty-auto-isolate"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
    --function-name guardduty-auto-isolate \
    --statement-id AllowEventBridgeInvoke \
    --action 'lambda:InvokeFunction' \
    --principal events.amazonaws.com
```
**Étape 5 : Test avec un échantillon de résultats**
```bash
# Generate sample finding
aws guardduty create-sample-findings \
    --detector-id $DETECTOR_ID \
    --finding-types "Backdoor:EC2/C&CActivity.B!DNS"

# Check EventBridge invocations
aws cloudwatch get-metric-statistics \
    --namespace AWS/Events \
    --metric-name TriggeredRules \
    --dimensions Name=RuleName,Value=guardduty-high-severity \
    --start-time 2025-01-15T00:00:00Z \
    --end-time 2025-01-15T23:59:59Z \
    --period 3600 \
    --statistics Sum
```
**Résultats attendus :**

- GuardDuty activé et analyse des journaux
- Alerte e-mail reçue pour les résultats de haute gravité
- Lambda isole automatiquement les instances compromises
- Instantanés médico-légaux créés
- Équipe de sécurité prévenue


### Atelier 2 : Configuration multi-comptes de Security Hub

**Objectif :** Activez Security Hub sur plusieurs comptes avec une gestion centralisée.

**Étape 1 : Activez Security Hub dans le compte principal**
```python
import boto3

securityhub = boto3.client('securityhub')

# Enable Security Hub
securityhub.enable_security_hub(
    Tags={'Environment': 'Production'},
    EnableDefaultStandards=True  # Enable AWS Foundational Best Practices
)

# Enable additional standards
securityhub.batch_enable_standards(
    StandardsSubscriptionRequests=[
        {'StandardsArn': 'arn:aws:securityhub:us-east-1::standards/cis-aws-foundations-benchmark/v/1.2.0'},
        {'StandardsArn': 'arn:aws:securityhub:us-east-1::standards/pci-dss/v/3.2.1'}
    ]
)

print("Security Hub enabled with CIS and PCI DSS standards")
```
**Étape 2 : Inviter des comptes membres**
```python
# In master account
member_accounts = [
    {'AccountId': '111111111111', 'Email': 'account1@example.com'},
    {'AccountId': '222222222222', 'Email': 'account2@example.com'}
]

# Create members
securityhub.create_members(
    AccountDetails=member_accounts
)

# Invite members
for account in member_accounts:
    securityhub.invite_members(
        AccountIds=[account['AccountId']]
    )

print("Member accounts invited")
```
**Étape 3 : Accepter l'invitation dans les comptes membres**
```python
# In each member account
# List invitations
invitations = securityhub.list_invitations()

for invitation in invitations['Invitations']:
    master_id = invitation['AccountId']
    invitation_id = invitation['InvitationId']
    
    # Accept invitation
    securityhub.accept_invitation(
        MasterId=master_id,
        InvitationId=invitation_id
    )
    
    print(f"Accepted invitation from master account {master_id}")
```
**Étape 4 : Afficher les résultats agrégés**
```python
# In master account - view all findings across accounts
import pandas as pd

def get_security_score():
    """Calculate security score across all accounts"""
    
    # Get compliance results
    paginator = securityhub.get_paginator('get_compliance_summary_by_resource_type')
    
    total_passed = 0
    total_failed = 0
    
    for page in paginator.paginate():
        for result in page['SummaryByResourceType']:
            total_passed += result['PassedCount']
            total_failed += result['FailedCount']
    
    total_checks = total_passed + total_failed
    score = (total_passed / total_checks * 100) if total_checks > 0 else 0
    
    print(f"Security Score: {score:.2f}%")
    print(f"Passed Checks: {total_passed}")
    print(f"Failed Checks: {total_failed}")
    
    return score

def get_critical_findings():
    """Get all critical findings"""
    
    response = securityhub.get_findings(
        Filters={
            'SeverityLabel': [{'Value': 'CRITICAL', 'Comparison': 'EQUALS'}],
            'WorkflowStatus': [{'Value': 'NEW', 'Comparison': 'EQUALS'}]
        },
        MaxResults=100
    )
    
    findings = response['Findings']
    
    # Create summary
    summary = []
    for finding in findings:
        summary.append({
            'Title': finding['Title'],
            'Resource': finding['Resources'][0]['Id'],
            'Account': finding['AwsAccountId'],
            'Severity': finding['Severity']['Label']
        })
    
    df = pd.DataFrame(summary)
    print("\nCritical Findings:")
    print(df)
    
    return findings

# Run reports
score = get_security_score()
critical_findings = get_critical_findings()
```
### Lab 3 : Analyse des vulnérabilités par l'inspecteur

**Objectif :** Activer une analyse continue des vulnérabilités pour les instances et les conteneurs EC2.

**Étape 1 : Activer l'inspecteur**
```bash
# Enable Inspector
aws inspector2 enable \
    --resource-types EC2 ECR LAMBDA

# Check status
aws inspector2 batch-get-account-status \
    --account-ids $(aws sts get-caller-identity --query Account --output text)
```
**Étape 2 : Installer l'agent SSM sur les instances EC2**
```bash
# For Amazon Linux 2
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent

# Verify agent running
sudo systemctl status amazon-ssm-agent

# Instance IAM role needs AmazonSSMManagedInstanceCore policy
```
**Étape 3 : Afficher les résultats de vulnérabilité**
```python
import boto3

inspector = boto3.client('inspector2')

def get_vulnerability_summary():
    """Get summary of vulnerabilities by severity"""
    
    # Get all findings
    paginator = inspector.get_paginator('list_findings')
    
    vulnerabilities = {
        'CRITICAL': 0,
        'HIGH': 0,
        'MEDIUM': 0,
        'LOW': 0
    }
    
    for page in paginator.paginate():
        for finding in page['findings']:
            severity = finding['severity']
            vulnerabilities[severity] += 1
    
    print("Vulnerability Summary:")
    for severity, count in vulnerabilities.items():
        print(f"{severity}: {count}")
    
    return vulnerabilities

def get_critical_vulnerabilities():
    """Get details of critical vulnerabilities"""
    
    response = inspector.list_findings(
        filterCriteria={
            'severity': [{'comparison': 'EQUALS', 'value': 'CRITICAL'}]
        },
        maxResults=50
    )
    
    print("\nCritical Vulnerabilities:")
    for finding in response['findings']:
        print(f"\nTitle: {finding['title']}")
        print(f"Resource: {finding['resources'][0]['id']}")
        print(f"Package: {finding.get('packageVulnerabilityDetails', {}).get('vulnerablePackages', [{}])[0].get('name')}")
        print(f"CVE: {finding.get('packageVulnerabilityDetails', {}).get('vulnerabilityId')}")
        print(f"Fix: {finding.get('remediation', {}).get('recommendation', {}).get('text')}")

# Run reports
summary = get_vulnerability_summary()
critical = get_critical_vulnerabilities()
```
**Étape 4 : Application automatique des correctifs avec Systems Manager**
```python
# Create Systems Manager maintenance window
ssm = boto3.client('ssm')

# Create maintenance window
response = ssm.create_maintenance_window(
    Name='PatchCriticalVulnerabilities',
    Schedule='cron(0 2 ? * SUN *)',  # Weekly Sunday 2 AM
    Duration=4,  # 4 hours
    Cutoff=1,  # Stop new tasks 1 hour before end
    AllowUnassociatedTargets=False
)

window_id = response['WindowId']

# Register targets (instances with critical vulnerabilities)
ssm.register_target_with_maintenance_window(
    WindowId=window_id,
    ResourceType='INSTANCE',
    Targets=[{
        'Key': 'tag:PatchGroup',
        'Values': ['Critical']
    }]
)

# Register patch task
ssm.register_task_with_maintenance_window(
    WindowId=window_id,
    TaskType='RUN_COMMAND',
    TaskArn='AWS-RunPatchBaseline',
    Priority=1,
    MaxConcurrency='50%',
    MaxErrors='25%'
)

print(f"Automated patching configured in window {window_id}")
```
## Connaissances au niveau de la production

### Intégration du centre d'opérations de sécurité (SOC)

**Architecture de sécurité d'entreprise :**
```
SOC Integration Pattern:

AWS Security Services → SIEM Platform → Security Analysts

Data Flow:
GuardDuty Findings
Security Hub Findings  → EventBridge → Lambda Transform
Inspector Findings           ↓
Macie Findings              Kinesis Firehose
CloudTrail Events                 ↓
VPC Flow Logs              S3 Bucket (staging)
                                  ↓
                         SIEM (Splunk/QRadar/Elastic)
                                  ↓
                         Security Dashboard
                                  ↓
                         Threat Hunting
                                  ↓
                         Incident Response

Implementation:

# Lambda function to transform findings for SIEM
def transform_for_siem(event):
    """Transform AWS finding to SIEM format"""
    
    finding = event['detail']
    
    # Map to Common Event Format (CEF)
    cef_event = {
        'timestamp': finding['updatedAt'],
        'severity': finding['severity']['normalized'],
        'event_type': finding['type'],
        'source_ip': finding.get('service', {}).get('action', {}).get('networkConnectionAction', {}).get('remoteIpDetails', {}).get('ipAddressV4'),
        'resource_id': finding['resources'][0]['id'],
        'account_id': finding['awsAccountId'],
        'region': finding['region'],
        'description': finding['description'],
        'remediation': finding.get('remediation', {}).get('recommendation', {}).get('text')
    }
    
    return cef_event

# Kinesis Firehose delivery to SIEM
import boto3

firehose = boto3.client('firehose')

firehose.create_delivery_stream(
    DeliveryStreamName='security-findings-to-siem',
    DeliveryStreamType='DirectPut',
    HttpEndpointDestinationConfiguration={
        'EndpointConfiguration': {
            'Url': 'https://siem-collector.example.com/ingest',
            'AccessKey': 'api-key'
        },
        'RequestConfiguration': {
            'ContentEncoding': 'GZIP'
        },
        'BufferingHints': {
            'SizeInMBs': 5,
            'IntervalInSeconds': 60
        }
    }
)
```
**Playbooks automatisés :**
```python
# Automated incident response playbooks

class SecurityPlaybook:
    """Automated security incident response"""
    
    def __init__(self):
        self.ec2 = boto3.client('ec2')
        self.sns = boto3.client('sns')
        self.ssm = boto3.client('ssm')
    
    def compromised_instance_response(self, instance_id):
        """
        Comprehensive response to compromised instance
        """
        
        print(f"Executing playbook for compromised instance: {instance_id}")
        
        # Step 1: Tag instance
        self.ec2.create_tags(
            Resources=[instance_id],
            Tags=[
                {'Key': 'SecurityStatus', 'Value': 'Compromised'},
                {'Key': 'IncidentID', 'Value': f'INC-{datetime.now().strftime("%Y%m%d-%H%M%S")}'}
            ]
        )
        
        # Step 2: Isolate instance
        isolation_sg = self.isolate_instance(instance_id)
        
        # Step 3: Capture memory dump (if forensics required)
        self.capture_memory_dump(instance_id)
        
        # Step 4: Create disk snapshots
        snapshots = self.create_forensic_snapshots(instance_id)
        
        # Step 5: Collect logs
        self.collect_logs(instance_id)
        
        # Step 6: Notify security team
        self.notify_security_team(instance_id, snapshots)
        
        # Step 7: Create investigation case
        case_id = self.create_investigation_case(instance_id)
        
        return {
            'instance_id': instance_id,
            'isolation_sg': isolation_sg,
            'snapshots': snapshots,
            'case_id': case_id
        }
    
    def isolate_instance(self, instance_id):
        """Isolate instance from network"""
        
        # Create/use isolation security group
        try:
            response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'group-name', 'Values': ['forensics-isolation']}]
            )
            
            if response['SecurityGroups']:
                isolation_sg = response['SecurityGroups'][0]['GroupId']
            else:
                # Create isolation SG
                vpc = self.ec2.describe_instances(InstanceIds=[instance_id])
                vpc_id = vpc['Reservations'][0]['Instances'][0]['VpcId']
                
                response = self.ec2.create_security_group(
                    GroupName='forensics-isolation',
                    Description='Isolation SG for forensic analysis',
                    VpcId=vpc_id
                )
                isolation_sg = response['GroupId']
                
                # Add only SSH from security team subnet
                self.ec2.authorize_security_group_ingress(
                    GroupId=isolation_sg,
                    IpPermissions=[{
                        'IpProtocol': 'tcp',
                        'FromPort': 22,
                        'ToPort': 22,
                        'IpRanges': [{'CidrIp': '10.0.100.0/24', 'Description': 'Security team access'}]
                    }]
                )
            
            # Apply isolation SG
            self.ec2.modify_instance_attribute(
                InstanceId=instance_id,
                Groups=[isolation_sg]
            )
            
            print(f"Instance {instance_id} isolated with SG {isolation_sg}")
            
            return isolation_sg
            
        except Exception as e:
            print(f"Error isolating instance: {e}")
            raise
    
    def create_forensic_snapshots(self, instance_id):
        """Create snapshots of all volumes"""
        
        volumes = self.ec2.describe_instance_attribute(
            InstanceId=instance_id,
            Attribute='blockDeviceMapping'
        )
        
        snapshots = []
        
        for device in volumes['BlockDeviceMappings']:
            volume_id = device['Ebs']['VolumeId']
            
            snapshot = self.ec2.create_snapshot(
                VolumeId=volume_id,
                Description=f'Forensic snapshot for incident {instance_id}',
                TagSpecifications=[{
                    'ResourceType': 'snapshot',
                    'Tags': [
                        {'Key': 'Purpose', 'Value': 'Forensics'},
                        {'Key': 'InstanceId', 'Value': instance_id},
                        {'Key': 'Timestamp', 'Value': datetime.now().isoformat()}
                    ]
                }]
            )
            
            snapshots.append(snapshot['SnapshotId'])
            print(f"Created snapshot {snapshot['SnapshotId']} for volume {volume_id}")
        
        return snapshots
    
    def notify_security_team(self, instance_id, snapshots):
        """Send detailed notification"""
        
        message = f"""
        SECURITY INCIDENT: Compromised Instance Detected and Isolated
        
        Instance ID: {instance_id}
        Timestamp: {datetime.now().isoformat()}
        
        Actions Taken:
        - Instance isolated from network
        - Forensic snapshots created: {', '.join(snapshots)}
        - Investigation case created
        - Memory dump captured (if enabled)
        - Logs collected
        
        Next Steps:
        1. Review GuardDuty/Security Hub findings
        2. Analyze Detective investigation graph
        3. Examine forensic snapshots
        4. Determine root cause and scope
        5. Decide on termination vs remediation
        
        Investigation Dashboard: https://console.aws.amazon.com/detective/
        """
        
        self.sns.publish(
            TopicArn='arn:aws:sns:region:account:security-incidents',
            Subject=f'INCIDENT: Compromised Instance {instance_id}',
            Message=message
        )

# Usage
playbook = SecurityPlaybook()
result = playbook.compromised_instance_response('i-1234567890abcdef0')
```
### Automatisation de la conformité

**Remédiation automatisée de référence CIS :**
```python
# Auto-remediate CIS AWS Foundations Benchmark findings

class CISRemediation:
    """Automated CIS benchmark remediation"""
    
    def __init__(self):
        self.iam = boto3.client('iam')
        self.s3 = boto3.client('s3')
        self.ec2 = boto3.client('ec2')
        self.cloudtrail = boto3.client('cloudtrail')
    
    def remediate_finding(self, finding):
        """Route finding to appropriate remediation"""
        
        control_id = finding['ProductFields'].get('ControlId', '')
        
        remediation_map = {
            'CIS.1.4': self.ensure_mfa_root_account,
            'CIS.2.1': self.ensure_cloudtrail_enabled,
            'CIS.2.3': self.enable_s3_bucket_logging,
            'CIS.4.1': self.disable_unrestricted_ssh,
            'CIS.4.2': self.disable_unrestricted_rdp
        }
        
        remediation_func = remediation_map.get(control_id)
        
        if remediation_func:
            try:
                remediation_func(finding)
                print(f"Remediated {control_id}")
            except Exception as e:
                print(f"Failed to remediate {control_id}: {e}")
        else:
            print(f"No automated remediation for {control_id}")
    
    def ensure_cloudtrail_enabled(self, finding):
        """CIS 2.1: Ensure CloudTrail enabled in all regions"""
        
        # Check if trail exists
        trails = self.cloudtrail.describe_trails()
        
        multi_region_trail = any(
            trail.get('IsMultiRegionTrail', False) 
            for trail in trails['trailList']
        )
        
        if not multi_region_trail:
            # Create multi-region trail
            self.cloudtrail.create_trail(
                Name='organization-trail',
                S3BucketName='org-cloudtrail-logs-bucket',
                IsMultiRegionTrail=True,
                EnableLogFileValidation=True,
                IncludeGlobalServiceEvents=True
            )
            
            # Start logging
            self.cloudtrail.start_logging(Name='organization-trail')
            
            print("Created multi-region CloudTrail")
    
    def enable_s3_bucket_logging(self, finding):
        """CIS 2.3: Enable S3 bucket logging"""
        
        bucket_name = finding['Resources'][0]['Id'].split(':')[-1]
        
        # Enable logging
        self.s3.put_bucket_logging(
            Bucket=bucket_name,
            BucketLoggingStatus={
                'LoggingEnabled': {
                    'TargetBucket': 'central-s3-logs-bucket',
                    'TargetPrefix': f'{bucket_name}/'
                }
            }
        )
        
        print(f"Enabled logging for bucket {bucket_name}")
    
    def disable_unrestricted_ssh(self, finding):
        """CIS 4.1: No security group allows 0.0.0.0/0 ingress on port 22"""
        
        sg_id = finding['Resources'][0]['Id'].split('/')[-1]
        
        # Remove unrestricted SSH rule
        try:
            self.ec2.revoke_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[{
                    'IpProtocol': 'tcp',
                    'FromPort': 22,
                    'ToPort': 22,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                }]
            )
            
            print(f"Removed unrestricted SSH from {sg_id}")
        except Exception as e:
            print(f"Could not remove SSH rule: {e}")

# EventBridge integration
def lambda_handler(event, context):
    """Auto-remediate CIS findings from Security Hub"""
    
    finding = event['detail']['findings'][0]
    control_id = finding.get('ProductFields', {}).get('ControlId', '')
    
    if control_id.startswith('CIS'):
        remediation = CISRemediation()
        remediation.remediate_finding(finding)
    
    return {'statusCode': 200}
```
**Optimisation des coûts :**
```
Security Services Cost Management:

GuardDuty Optimization:
- Enable only in regions with resources
- Use organization-level pricing (volume discount)
- Archive old findings to reduce storage

Security Hub Optimization:
- Consolidate to security account
- Use selective standards (not all simultaneously)
- Suppress low-priority findings

Inspector Optimization:
- Scan only internet-facing instances initially
- Schedule scans during off-hours
- Use Systems Manager Inventory for non-critical

Macie Optimization:
- Use automated discovery sampling (vs full scans)
- Focus on high-risk buckets
- Schedule discovery jobs weekly vs daily

Detective Optimization:
- 30-day trial evaluation period
- Enable only when investigation needed
- Consider cost vs breach cost ($4.45M average)

Typical Monthly Costs:
Small Organization (100 resources):
- GuardDuty: $50
- Security Hub: $20
- Inspector: $30
- Total: $100/month

Large Organization (5,000 resources):
- GuardDuty: $500
- Security Hub: $100
- Inspector: $1,500
- Macie: $300
- Detective: $500
- Total: $2,900/month

ROI Calculation:
Cost: $2,900/month = $34,800/year
Average breach cost: $4.45 million
Prevented breaches per year: < 1% still positive ROI
```
## Conseils \& Bonnes pratiques

### Conseils d'optimisation de la détection

**Astuce 1 : optimisez GuardDuty avec des adresses IP de confiance et des listes de menaces**
Réduisez les faux positifs en mettant sur liste blanche les adresses IP connues (VPN d'entreprise, partenaires) et en ajoutant des listes de menaces personnalisées.
```python
# Add trusted IP list
guardduty.create_ip_set(
    DetectorId=detector_id,
    Name='trusted-ips',
    Format='TXT',
    Location='s3://security-config/trusted-ips.txt',
    Activate=True
)

# trusted-ips.txt content:
# 203.0.113.0/24  # Corporate VPN
# 198.51.100.0/24 # Partner network
```
**Conseil 2 : Donner la priorité aux résultats critiques**
Configurez les informations de Security Hub pour faire apparaître en premier les résultats critiques : ne vous noyez pas dans les alertes de faible gravité.

**Astuce 3 : Activez l'agrégation inter-régions**
Utilisez la région d’agrégation Security Hub pour consolider les résultats de toutes les régions dans une vue unique.
```python
# Enable aggregation in us-east-1
securityhub.create_finding_aggregator(
    RegionLinkingMode='ALL_REGIONS'
)
```
**Astuce 4 : Mettez en œuvre des règles de suppression des résultats**
Supprimez les faux positifs connus pour réduire le bruit et vous concentrer sur les menaces réelles.
```python
# Suppress development environment findings
securityhub.create_insight(
    Name='Exclude Dev Findings',
    Filters={
        'ResourceTags': [{'Key': 'Environment', 'Value': 'Development'}]
    },
    GroupByAttribute='ResourceId'
)

# Update workflow status to suppressed
securityhub.batch_update_findings(
    FindingIdentifiers=finding_ids,
    Workflow={'Status': 'SUPPRESSED'},
    Note={'Text': 'Development environment - expected behavior'}
)
```
**Astuce 5 : Planifiez les analyses de l'inspecteur de manière stratégique**
Exécutez des analyses de vulnérabilité pendant les fenêtres de maintenance pour réduire l’impact sur les charges de travail de production.

### Conseils pour l'automatisation des réponses

**Astuce 6 : Utilisez Step Functions pour les flux de travail complexes**
Orchestrez une réponse aux incidents en plusieurs étapes avec AWS Step Functions pour plus de fiabilité et de visibilité.

**Conseil 7 : implémentez un déploiement progressif pour la correction automatique**
Commencez par les notifications uniquement, puis activez la correction automatique pour les résultats à faible risque, en élargissant progressivement la portée.
```
Phase 1: Monitor Only (Week 1-2)
- GuardDuty findings → SNS notifications
- Review findings manually
- Understand baseline

Phase 2: Auto-Remediate Low-Risk (Week 3-4)
- Public S3 buckets → Auto-block
- Unrestricted security groups → Auto-remove
- Missing encryption → Auto-enable

Phase 3: Auto-Remediate Medium-Risk (Month 2)
- Outdated packages → Auto-patch
- Configuration drift → Auto-correct

Phase 4: Full Automation (Month 3+)
- Compromised instances → Auto-isolate
- Suspicious activity → Auto-investigate
```
**Astuce 8 : Tagez les ressources pour une réponse automatisée**
Utilisez des balises pour contrôler le comportement de correction automatisée (par exemple, `AutoRemediate=true`, `CriticalityLevel=high`).

**Astuce 9 : Intégrez ChatOps**
Envoyez des alertes de sécurité à Slack/Teams pour une réponse et une collaboration plus rapides de l'équipe.
```python
# Send to Slack
import json
import urllib.request

def send_to_slack(finding):
    webhook_url = 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    
    message = {
        'text': f"🚨 Security Alert",
        'attachments': [{
            'color': 'danger',
            'title': finding['Title'],
            'fields': [
                {'title': 'Severity', 'value': finding['Severity']['Label'], 'short': True},
                {'title': 'Resource', 'value': finding['Resources'][0]['Id'], 'short': False}
            ]
        }]
    }
    
    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(message).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    urllib.request.urlopen(req)
```
**Astuce 10 : Gérer des runbooks pour les incidents manuels**
Tout ne peut pas être automatisé : maintenez des procédures documentées pour les incidents complexes nécessitant un jugement humain.

## Pièges \& Remèdes

### Piège 1 : Alerter la fatigue due à un trop grand nombre de résultats

**Problème :** Les équipes de sécurité, submergées par des milliers de découvertes de faible priorité, passent à côté de menaces critiques.

**Pourquoi cela arrive :**

- Tous les services de sécurité activés sans réglage
- Aucune suppression ou priorisation des résultats
- Développement et production traités sur un pied d'égalité
- Aucune ligne de base de comportement normal

**Impact :**

- Des découvertes critiques enfouies dans le bruit
- L'équipe arrête d'examiner les alertes
- De vraies menaces manquées
- Augmentation du temps de réponse
- Burnout et turnover

**Exemple :**
```
Security Hub Dashboard:
- 5,234 findings total
- 4,800 LOW severity (development resources)
- 350 MEDIUM severity (minor misconfigurations)
- 80 HIGH severity (requires attention)
- 4 CRITICAL severity (LOST in the noise!)

Result: Critical findings not addressed for days
```
**Remède :**

**Étape 1 : Mettre en œuvre la hiérarchie de recherche**
```python
# Prioritize findings by severity AND resource criticality
def calculate_priority_score(finding):
    """Calculate priority score (0-100)"""
    
    severity_scores = {
        'CRITICAL': 40,
        'HIGH': 30,
        'MEDIUM': 20,
        'LOW': 10
    }
    
    # Base score from severity
    score = severity_scores.get(finding['Severity']['Label'], 0)
    
    # Increase score for production resources
    tags = finding['Resources'][0].get('Tags', {})
    if tags.get('Environment') == 'Production':
        score += 30
    
    # Increase score for internet-facing resources
    if 'public' in finding['Title'].lower():
        score += 20
    
    # Decrease score for development
    if tags.get('Environment') == 'Development':
        score -= 20
    
    return min(100, max(0, score))

# Filter findings
high_priority = [f for f in findings if calculate_priority_score(f) >= 70]

print(f"High priority findings: {len(high_priority)}")
# Result: 15 findings (manageable)
```
**Étape 2 : Supprimer les résultats de l'environnement de développement**
```python
# Auto-suppress development findings
def suppress_dev_findings():
    """Suppress findings from development resources"""
    
    response = securityhub.get_findings(
        Filters={
            'ResourceTags': [{
                'Key': 'Environment',
                'Value': 'Development',
                'Comparison': 'EQUALS'
            }],
            'WorkflowStatus': [{
                'Value': 'NEW',
                'Comparison': 'EQUALS'
            }]
        }
    )
    
    finding_ids = [
        {'Id': f['Id'], 'ProductArn': f['ProductArn']}
        for f in response['Findings']
    ]
    
    if finding_ids:
        securityhub.batch_update_findings(
            FindingIdentifiers=finding_ids,
            Workflow={'Status': 'SUPPRESSED'},
            Note={'Text': 'Auto-suppressed: Development environment'}
        )
        
        print(f"Suppressed {len(finding_ids)} development findings")

# Run daily
suppress_dev_findings()
```
**Étape 3 : Créer des informations ciblées**
```python
# Create insight for actionable findings only
securityhub.create_insight(
    Name='Actionable Production Findings',
    Filters={
        'SeverityLabel': [
            {'Value': 'CRITICAL', 'Comparison': 'EQUALS'},
            {'Value': 'HIGH', 'Comparison': 'EQUALS'}
        ],
        'WorkflowStatus': [
            {'Value': 'NEW', 'Comparison': 'EQUALS'}
        ],
        'ResourceTags': [
            {'Key': 'Environment', 'Value': 'Production', 'Comparison': 'EQUALS'}
        ]
    },
    GroupByAttribute='ResourceId'
)

# Result: Dashboard shows only critical production findings
```
**Prévention :**

- Mettre en œuvre la priorisation des résultats dès le premier jour
- Alertes de développement et de production séparées
- Réviser et ajuster régulièrement les règles de suppression
- Utiliser des informations pour créer des vues ciblées
- Surveiller les tendances du volume d'alerte
- Définir les SLA de l'équipe (critiques en 1 heure, élevés en 24 heures)

***

### Piège 2 : Faux positifs dus au manque de référence

**Problème :** Des activités légitimes sont signalées comme des menaces, ce qui fait perdre du temps à l'enquête.

**Pourquoi cela arrive :**

- GuardDuty ne connaît pas votre comportement normal
- Aucune liste d'adresses IP de confiance configurée
- Travaux planifiés signalés comme anomalies
- Les tests de développement déclenchent des alertes

**Impact :**

- Temps d'enquête perdu
- Menaces réelles négligées
- L'équipe perd confiance dans les alertes
- Retards dans la réponse aux incidents

**Exemple :**
```
GuardDuty Finding: UnauthorizedAccess:IAMUser/TorIPCaller
Description: API call from Tor exit node
User: security-scanner-bot
Investigation: This is our authorized penetration testing tool

Result: 30 minutes wasted investigating false positive
Frequency: Daily (automated security scans)
Annual waste: 180 hours (4.5 weeks)
```
**Remède :**

**Étape 1 : Créer une référence lors du déploiement initial**
```python
# Learning period: First 2 weeks
# Monitor findings without automation
# Document legitimate activities

baseline_activities = {
    'security_scanning': {
        'users': ['security-scanner-bot'],
        'expected_findings': ['UnauthorizedAccess:IAMUser/TorIPCaller'],
        'schedule': 'Daily 02:00 UTC',
        'duration': '30 minutes'
    },
    'data_analytics': {
        'instances': ['i-analytics-123'],
        'expected_findings': ['Recon:EC2/PortProbeUnprotectedPort'],
        'reason': 'Legitimate port scanning for network discovery'
    }
}

# Document and whitelist
```
**Étape 2 : Configurer les adresses IP de confiance et les listes de menaces**
```python
# Add trusted IP sets
trusted_ips = """
203.0.113.0/24  # Corporate VPN
198.51.100.0/24 # Partner network  
192.0.2.0/24    # Security scanning tools
"""

# Upload to S3
s3.put_object(
    Bucket='security-config',
    Key='trusted-ips.txt',
    Body=trusted_ips.encode('utf-8')
)

# Create IP set in GuardDuty
guardduty.create_ip_set(
    DetectorId=detector_id,
    Name='trusted-corporate-ips',
    Format='TXT',
    Location='s3://security-config/trusted-ips.txt',
    Activate=True
)

# GuardDuty won't alert on traffic from these IPs
```
**Étape 3 : implémenter le filtrage intelligent**
```python
def is_false_positive(finding):
    """Check if finding is known false positive"""
    
    finding_type = finding['Type']
    resource = finding['Resources'][0]['Id']
    
    # Check against known patterns
    false_positive_patterns = [
        {
            'type': 'UnauthorizedAccess:IAMUser/TorIPCaller',
            'user': 'security-scanner-bot',
            'reason': 'Authorized security scanning'
        },
        {
            'type': 'Recon:EC2/PortProbeUnprotectedPort',
            'tag': 'Purpose=NetworkDiscovery',
            'reason': 'Analytics workload'
        }
    ]
    
    for pattern in false_positive_patterns:
        if pattern['type'] == finding_type:
            # Check additional criteria
            if 'user' in pattern:
                if pattern['user'] in finding['Title']:
                    return True, pattern['reason']
    
    return False, None

# Filter findings
for finding in findings:
    is_fp, reason = is_false_positive(finding)
    
    if is_fp:
        # Suppress finding
        securityhub.batch_update_findings(
            FindingIdentifiers=[
                {'Id': finding['Id'], 'ProductArn': finding['ProductArn']}
            ],
            Workflow={'Status': 'SUPPRESSED'},
            Note={'Text': f'Known false positive: {reason}'}
        )
```
**Prévention :**

- Construire une référence avant d'activer l'automatisation
- Documenter les activités légitimes
- Configurer les adresses IP de confiance et les listes de menaces
- Examiner régulièrement les résultats supprimés
- Mettre à jour la référence à mesure que l'environnement change
- Communiquer avec les équipes sur les activités attendues

***

### Piège 3 : Couverture incomplète des agents manquants

**Problème :** Les services de sécurité ne peuvent pas analyser les ressources sans les agents requis, ce qui laisse des angles morts.

**Pourquoi cela arrive :**

- Agent SSM non installé sur les instances EC2
- GuardDuty n'est pas activé dans toutes les régions
- L'inspecteur ne peut pas analyser les instances sans agent
- CloudTrail n'enregistre pas tous les appels API

**Impact :**

- Vulnérabilités non détectées
- Compromis non identifiés
- Posture de sécurité incomplète
- Échecs de conformité
- Faux sentiment de sécurité

**Exemple :**
```
Security Hub Score: 95% (excellent!)
Reality: Only 30% of instances have SSM Agent
         Inspector scanning 30% of resources
         70% of instances never scanned for vulnerabilities
         
Actual risk: HIGH (unmonitored resources)
```
**Remède :**

**Étape 1 : Couverture de l'audit**
```python
def audit_security_coverage():
    """Assess security service coverage"""
    
    ec2 = boto3.client('ec2')
    ssm = boto3.client('ssm')
    
    # Get all instances
    instances = ec2.describe_instances()
    total_instances = 0
    instance_ids = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            if instance['State']['Name'] == 'running':
                total_instances += 1
                instance_ids.append(instance['InstanceId'])
    
    # Check SSM Agent coverage
    managed_instances = ssm.describe_instance_information()
    ssm_instance_ids = [
        i['InstanceId'] for i in managed_instances['InstanceInformationList']
    ]
    
    covered = len(ssm_instance_ids)
    coverage_pct = (covered / total_instances * 100) if total_instances > 0 else 0
    
    print(f"Total instances: {total_instances}")
    print(f"SSM managed: {covered}")
    print(f"Coverage: {coverage_pct:.1f}%")
    
    # Identify uncovered instances
    uncovered = set(instance_ids) - set(ssm_instance_ids)
    
    if uncovered:
        print(f"\nUncovered instances: {len(uncovered)}")
        for instance_id in list(uncovered)[:10]:
            print(f"  - {instance_id}")
    
    return {
        'total': total_instances,
        'covered': covered,
        'coverage_pct': coverage_pct,
        'uncovered': list(uncovered)
    }

coverage = audit_security_coverage()
```
**Étape 2 : Installation automatisée de l'agent**
```python
# Use Systems Manager State Manager to ensure agent installed

ssm.create_association(
    Name='AWS-ConfigureAWSPackage',
    Parameters={
        'action': ['Install'],
        'name': ['AmazonSSMAgent']
    },
    Targets=[
        {
            'Key': 'InstanceIds',
            'Values': ['*']  # All instances
        }
    ],
    ScheduleExpression='rate(30 minutes)'  # Check every 30 min
)

# Alternative: User data script for new instances
user_data = """#!/bin/bash
# Install SSM Agent on launch
yum install -y amazon-ssm-agent
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent
"""
```
**Étape 3 : Activer les services multirégionaux**
```python
def enable_guardduty_all_regions():
    """Enable GuardDuty in all active regions"""
    
    ec2 = boto3.client('ec2')
    
    # Get all regions
    regions = ec2.describe_regions()['Regions']
    
    for region in regions:
        region_name = region['RegionName']
        
        try:
            # Create regional GuardDuty client
            regional_guardduty = boto3.client('guardduty', region_name=region_name)
            
            # Check if enabled
            detectors = regional_guardduty.list_detectors()
            
            if not detectors['DetectorIds']:
                # Enable GuardDuty
                regional_guardduty.create_detector(Enable=True)
                print(f"Enabled GuardDuty in {region_name}")
            else:
                print(f"GuardDuty already enabled in {region_name}")
                
        except Exception as e:
            print(f"Error in {region_name}: {e}")

enable_guardduty_all_regions()
```
**Étape 4 : Mettre en œuvre la surveillance de la couverture**
```python
# CloudWatch metric for coverage
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_data(
    Namespace='SecurityCoverage',
    MetricData=[
        {
            'MetricName': 'SSMAgentCoverage',
            'Value': coverage['coverage_pct'],
            'Unit': 'Percent'
        }
    ]
)

# Alarm if coverage drops below 90%
cloudwatch.put_metric_alarm(
    AlarmName='LowSecurityCoverage',
    MetricName='SSMAgentCoverage',
    Namespace='SecurityCoverage',
    Statistic='Average',
    Period=3600,
    EvaluationPeriods=1,
    Threshold=90,
    ComparisonOperator='LessThanThreshold',
    AlarmActions=['arn:aws:sns:region:account:security-alerts']
)
```
**Prévention :**

- Auditer la couverture avant de revendiquer la conformité
- Automatiser l'installation des agents
- Activer les services dans toutes les régions actives
- Surveiller la couverture en continu
- Inclure l'installation de l'agent dans les builds AMI
- Définir des politiques organisationnelles exigeant des agents

***

### Piège 4 : Coûts de remédiation non gérés

**Problème :** Correction automatisée étonnamment coûteuse ou perturbatrice.

**Pourquoi cela arrive :**

- Instances à terminaison automatique sans approbation
- Création d'instantanés sans politiques de cycle de vie
- Activation automatique de services coûteux
- Des garde-fous sans frais pour la remédiation

**Impact :**

- Factures AWS inattendues (en milliers/mois)
- Perturbations de services
- Perte de données due à une remédiation agressive
- Résistance de l'équipe à l'automatisation

**Exemple :**
```
Automated Remediation: Create forensic snapshots
Finding: 50 compromised instances detected (false positive)
Action: Created 200 snapshots (4 volumes each × 50 instances)
Snapshot size: 100 GB each
Cost: 200 × 100 GB × $0.05/GB-month = $1,000/month
Duration: Snapshots retained indefinitely
Annual cost: $12,000 (unplanned)
```
**Remède :**

**Étape 1 : Mettre en œuvre des garde-fous en matière de coûts**
```python
# Check costs before remediation
def can_afford_remediation(action_type, resource_count):
    """Check if remediation within budget"""
    
    cost_limits = {
        'snapshot': 100,  # Max $100/month
        'terminate': 10,  # Max 10 instances/day
        'isolate': 50     # Max 50 instances/day
    }
    
    estimated_costs = {
        'snapshot': resource_count * 100 * 0.05,  # 100GB @ $0.05/GB
        'terminate': 0,  # Reduces cost
        'isolate': 0     # No direct cost
    }
    
    estimated_cost = estimated_costs.get(action_type, 0)
    limit = cost_limits.get(action_type, 1000)
    
    if estimated_cost > limit:
        print(f"Cost ${estimated_cost} exceeds limit ${limit}")
        return False
    
    return True

# Before remediation
if can_afford_remediation('snapshot', 50):
    create_snapshots()
else:
    notify_team_manual_action_required()
```
**Étape 2 : Mettre en œuvre un flux de travail d'approbation pour les actions à fort impact**
```python
# Require approval for expensive remediation
def require_approval(finding, action):
    """Send approval request for high-impact actions"""
    
    high_impact_actions = ['terminate_instance', 'create_snapshot']
    
    if action in high_impact_actions:
        # Create approval task
        message = f"""
        Remediation Approval Required
        
        Finding: {finding['Title']}
        Resource: {finding['Resources'][0]['Id']}
        Action: {action}
        Estimated Cost: $100
        
        Approve: https://console.aws.amazon.com/approve/{finding['Id']}
        Deny: https://console.aws.amazon.com/deny/{finding['Id']}
        """
        
        sns.publish(
            TopicArn='arn:aws:sns:region:account:security-approvals',
            Subject='Remediation Approval Required',
            Message=message
        )
        
        # Wait for approval (Step Functions)
        # Don't remediate until approved
        return False
    
    return True  # Auto-approve low-impact actions
```
**Étape 3 : implémenter le cycle de vie des instantanés**
```python
# Auto-delete forensic snapshots after 30 days
def create_snapshot_with_lifecycle(volume_id, instance_id):
    """Create snapshot with automatic deletion"""
    
    # Create snapshot
    snapshot = ec2.create_snapshot(
        VolumeId=volume_id,
        Description=f'Forensic snapshot for {instance_id}',
        TagSpecifications=[{
            'ResourceType': 'snapshot',
            'Tags': [
                {'Key': 'Purpose', 'Value': 'Forensics'},
                {'Key': 'DeleteAfter', 'Value': (datetime.now() + timedelta(days=30)).isoformat()}
            ]
        }]
    )
    
    snapshot_id = snapshot['SnapshotId']
    
    # Schedule deletion using Lambda + EventBridge
    # (Simplified - use DLM in production)
    
    return snapshot_id

# Daily cleanup job
def cleanup_old_forensic_snapshots():
    """Delete snapshots past retention period"""
    
    snapshots = ec2.describe_snapshots(
        Filters=[
            {'Name': 'tag:Purpose', 'Values': ['Forensics']}
        ]
    )
    
    for snapshot in snapshots['Snapshots']:
        tags = {tag['Key']: tag['Value'] for tag in snapshot.get('Tags', [])}
        delete_after = tags.get('DeleteAfter')
        
        if delete_after and datetime.fromisoformat(delete_after) < datetime.now():
            ec2.delete_snapshot(SnapshotId=snapshot['SnapshotId'])
            print(f"Deleted expired snapshot {snapshot['SnapshotId']}")
```
**Prévention :**

- Estimer les coûts avant automatisation
- Mettre en œuvre les workflows d'approbation
- Définir des alertes budgétaires
- Utiliser des politiques de cycle de vie
- Automatiser les tests en hors-production en priorité
- Surveiller mensuellement les coûts de remédiation

***

## Résumé du chapitre

Les services de sécurité AWS assurent une détection intelligente et automatisée des menaces et une surveillance continue de la conformité qui s'adapte à l'infrastructure cloud. GuardDuty analyse des milliards d'événements pour détecter les menaces, Security Hub regroupe les résultats dans des tableaux de bord unifiés, Inspector recherche les vulnérabilités, Macie découvre les données sensibles et Detective enquête sur les causes profondes. Ensemble, ces services transforment la sécurité de réactive en proactive, détectant les menaces en quelques minutes au lieu de plusieurs mois.

**Principaux points à retenir :**

- **Activez GuardDuty dans tous les comptes :** Détection des menaces en temps réel grâce à l'apprentissage automatique ; analyse les journaux de flux VPC, CloudTrail et les journaux DNS à la recherche de menaces telles que le crypto-mining, les instances compromises, la reconnaissance
- **Agrégation avec Security Hub :** Posture de sécurité centralisée sur tous les comptes ; vérifications du cadre de conformité (CIS, PCI DSS) ; normaliser les résultats provenant de plusieurs sources pour une vue unifiée
- **Réponse automatisée aux incidents :** EventBridge + Lambda pour une correction automatisée ; isoler automatiquement les instances compromises ; réduire le temps de réponse de quelques heures à quelques secondes
- **Analyser en continu avec Inspector :** Détecter les vulnérabilités (CVE) dans EC2, les conteneurs, Lambda ; analyse de l'exposition du réseau ; prioriser les découvertes critiques nécessitant des correctifs immédiats
- **Découvrez les données sensibles avec Macie :** L'apprentissage automatique identifie les informations personnelles, les données financières et les informations d'identification dans S3 ; empêcher l’exposition des données ; conformité au RGPD, HIPAA, PCI DSS
- **Enquêter avec le détective :** Analyse visuelle des incidents de sécurité ; corréler les événements entre les services ; déterminer la cause première et le calendrier de l’attaque ; réduire le temps d'enquête de 90 %
- **Adaptez-vous à votre environnement :** Configurez des adresses IP de confiance ; supprimer les résultats du développement ; mettre en œuvre la priorisation des résultats ; réduire la fatigue d'alerte ; se concentrer sur les menaces réalisables

Les services de sécurité AWS s'intègrent à l'architecture existante (VPC, IAM, CloudTrail) tout en ajoutant des informations sur les menaces et l'automatisation. Le chapitre suivant couvre les services de conformité et de gouvernance AWS : Config pour la conformité de la configuration, CloudTrail pour la journalisation d'audit et Organizations pour la gestion multi-comptes.

## Exercice pratique en laboratoire

**Objectif :** Créer un système complet de surveillance de la sécurité et de réponse automatisée.

**Scénario :** Détectez et répondez automatiquement à une instance EC2 compromise.

**Prérequis :**

- Compte AWS avec accès administrateur
- Exécution de l'instance EC2 pour les tests
- Abonnement aux e-mails SNS configuré

**Étapes :**

1. **Activer les services de sécurité (30 minutes)**
    - Activer GuardDuty dans toutes les régions
    - Activer Security Hub avec CIS Benchmark
    - Activer l'inspecteur pour l'analyse EC2
    - Activer Macie pour l'analyse du compartiment S3
    - Vérifier tous les services actifs
2. **Configurer la réponse automatisée (45 minutes)**
    - Créer une règle EventBridge pour les résultats GuardDuty de haute gravité
    - Déployer la fonction Lambda pour l'isolation d'instance
    - Configurer les notifications SNS
    - Test avec un exemple de résultat GuardDuty
    - Vérifier les travaux d'automatisation
3. **Mettre en œuvre la surveillance de la conformité (30 minutes)**
    - Examiner le tableau de bord de conformité de Security Hub
    - Identifier les contrôles CIS ayant échoué
    - Créer une remédiation Lambda pour les buckets publics S3
    - Activer la correction automatisée
    - Vérifier que le score de conformité s'améliore
4. **Analyse des vulnérabilités (20 minutes)**
    - Assurer l'agent SSM sur l'instance de test
    - Exécuter l'évaluation de l'inspecteur
    - Examiner les résultats de vulnérabilité
    - Créer une automatisation des correctifs avec Systems Manager
    - Vérifier les vulnérabilités corrigées
5. **Tableau de bord de sécurité (15 minutes)**
    - Créer des informations personnalisées sur Security Hub
    - Configurer le tableau de bord CloudWatch avec des métriques
    - Configurer des alertes SNS pour les résultats critiques
    - Documenter les procédures SOC

**Résultats attendus :**

- Surveillance de sécurité complète active
- Instances compromises isolées automatiquement dans les 60 secondes
- Score de conformité >85 %
- Toutes les vulnérabilités critiques identifiées
- Correction automatisée réduisant le travail manuel de 90 %
- Coût total d'installation : <\$50/mois


## Questions de révision

1. **Quelles sources de données GuardDuty analyse-t-il ?**
a) CloudTrail uniquement
b) Journaux de flux VPC uniquement
c) Journaux de flux VPC, CloudTrail, journaux DNS, journaux d'audit EKS ✓
d) Journaux d'accès S3

**Réponse : C** - GuardDuty analyse les journaux de flux VPC, les événements CloudTrail, les journaux DNS et les journaux d'audit EKS pour une détection complète des menaces.

2. **Quel est l'objectif d'AWS Security Hub ?**
a) Détecter les menaces
b) Regrouper les résultats de plusieurs services ✓
c) Rechercher les vulnérabilités
d) Découvrez des données sensibles

**Réponse : B** – Security Hub regroupe et normalise les résultats de GuardDuty, Inspector, Macie et d'autres services.

3. **Quelle gravité nécessite une réponse immédiate ?**
a) FAIBLE
b) MOYEN
c) ÉLEVÉ
d) CRITIQUE ✓

**Réponse : D** – Les résultats CRITIQUES indiquent une compromission confirmée ou une menace grave nécessitant une intervention d'urgence.

4. **Que recherche Amazon Inspector ?**
a) Menaces réseau
b) Vulnérabilités des packages (CVE) et exposition du réseau ✓
c) Données sensibles
d) Utilisation abusive de l'API

**Réponse : B** - L'inspecteur recherche les vulnérabilités CVE dans les packages et analyse l'accessibilité du réseau.

5. **Que faut-il à Inspector pour analyser les instances EC2 ?**
a) GuardDuty activé
b) Agent SSM installé ✓
c) Adresse IP publique
d) Agent CloudWatch

**Réponse : B** - Agent SSM requis pour qu'Inspector analyse les instances EC2 à la recherche de vulnérabilités

6. **Que découvre Amazon Macie ?**
a) Menaces réseau
b) Vulnérabilités
c) Données sensibles (PII, informations financières, informations d'identification) ✓
d) Problèmes de configuration

**Réponse : C** – Macie utilise l'apprentissage automatique pour découvrir et protéger les données sensibles telles que les informations personnelles, les informations financières et les informations d'identification.

7. **À quoi sert AWS Detective ?**
a) Détection des menaces
b) Analyse et enquête des causes profondes ✓
c) Analyse des vulnérabilités
d) Contrôles de conformité

**Réponse : B** – Detective fournit une analyse visuelle pour enquêter sur les incidents de sécurité et déterminer les causes profondes.

8. **Qu'est-ce que le format de recherche de sécurité AWS (ASFF) ?**
a) Algorithme de chiffrement
b) Format de recherche standardisé dans tous les services ✓
c) Cadre de conformité
d) Format de politique IAM

**Réponse : B** - ASFF est un format JSON standardisé pour les résultats de sécurité, permettant une intégration et une automatisation cohérentes.

9. **Quelle est la réponse recommandée à la recherche d'une instance compromise ?**
a) Supprimer immédiatement
b) Ignorer si le développement
c) Isoler, prendre un instantané, enquêter ✓
d) Redémarrer l'instance

**Réponse : C** – Bonne pratique : isoler l'instance, créer des instantanés médico-légaux, rechercher la cause première avant la résiliation

10. **Comment pouvez-vous réduire les faux positifs GuardDuty ?**
a) Désactiver GuardDuty
b) Configurer les listes d'adresses IP de confiance ✓
c) Ignorer tous les résultats
d) Activer uniquement en production

**Réponse : B** - Configurez des listes d'adresses IP de confiance pour les sources légitimes connues (VPN d'entreprise, partenaires) afin de réduire les faux positifs.

11. **Sur quoi est basé le score de sécurité de Security Hub ?**
a) Nombre de ressources
b) Contrôles réussis / Total des contrôles ✓
c) Nombre de constatations
d) Dépenses AWS

**Réponse : B** - Score de sécurité calculé comme suit : (Contrôles de conformité réussis / Total des contrôles) × 100

12. **Quel est le but de constater une suppression ?**
a) Supprimer définitivement les résultats
b) Réduire le bruit des problèmes acceptables connus ✓
c) Masquer les problèmes de sécurité
d) Économisez des coûts

**Réponse : B** – La suppression réduit le bruit des alertes en marquant les problèmes acceptables connus (par exemple, les environnements de développement, le comportement attendu)

13. **Qu'est-ce qu'EventBridge permet pour les services de sécurité ?**
a) Chiffrement
b) Réponse automatisée aux résultats ✓
c) Réduction des coûts
d) Rapports de conformité

**Réponse : B** - EventBridge achemine les résultats de sécurité vers Lambda pour une correction et une réponse automatisées

14. **Quelle est l'approche recommandée pour la correction automatisée ?**
a) Activer toutes les automatisations immédiatement
b) Commencez par la surveillance, activez progressivement l'automatisation ✓
c) Automatiser uniquement en développement
d) Ne jamais automatiser la sécurité

**Réponse : B** - Bonne pratique : commencez par la surveillance uniquement, comprenez la ligne de base, activez progressivement l'automatisation pour les actions à faible risque puis à haut risque.

15. **Quelle est la fourchette de coûts typique de GuardDuty dans un environnement moyen ?**
a) \$10-50/mois
b) \100-200$/mois ✓
c) \$1 000-5 000/mois
d) Gratuit

**Réponse : B** – Un environnement moyen (500 ressources) coûte généralement entre 100 et 200 $/mois pour GuardDuty.

***
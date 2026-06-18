# Chapitre 28 : AWS Systems Manager

##Présentation

La gestion de milliers d'instances EC2, l'application de correctifs de sécurité sur l'ensemble des flottes, le maintien de la cohérence de la configuration, le dépannage des serveurs sans clés SSH et le suivi manuel des modifications de l'infrastructure sont opérationnellement impossibles à grande échelle. La gestion informatique traditionnelle (connexion aux serveurs individuellement, gestion des feuilles de calcul de l'inventaire des serveurs, déploiements manuels de correctifs prenant des semaines, distribution de clés SSH créant des risques de sécurité) ne peut pas prendre en charge une infrastructure cloud moderne dans laquelle les serveurs sont éphémères, les flottes évoluent de manière dynamique et les vulnérabilités de sécurité nécessitent une correction immédiate. AWS Systems Manager offre une gestion opérationnelle unifiée grâce à des correctifs automatisés, un accès sécurisé au shell sans clés SSH, un stockage centralisé des paramètres, une gestion de la configuration et des informations opérationnelles qui transforment la gestion de l'infrastructure d'une lutte réactive contre les incendies à une automatisation proactive.

Le coût opérationnel de la gestion manuelle des serveurs s'étend au-delà des heures de travail. Le temps moyen nécessaire pour corriger manuellement les vulnérabilités critiques prend 38 jours, ce qui expose les organisations à des exploits ; la prolifération des serveurs crée des configurations incohérentes entraînant des pannes ; La gestion des clés SSH devient un problème de sécurité avec des clés partagées et des accès orphelins ; et le dépannage nécessite un accès VPN et des hôtes de saut, ce qui complique la réponse aux incidents. Systems Manager élimine ces défis grâce à Session Manager pour un accès sécurisé au shell basé sur un navigateur sans clés SSH, Patch Manager pour l'application automatisée de correctifs au système d'exploitation et aux applications, Parameter Store pour la configuration cryptée et la gestion des secrets, Run Command pour exécuter instantanément des commandes sur les flottes et State Manager pour garantir en permanence la conformité de la configuration.

Ce chapitre s'appuie sur la gestion de l'infrastructure précédente : Systems Manager s'intègre à CloudWatch pour les tableaux de bord opérationnels, CloudTrail pour la journalisation d'audit, Config pour la vérification de la conformité, IAM pour le contrôle d'accès et KMS pour le chiffrement. Parameter Store stocke les informations d'identification de la base de données alternées par Secrets Manager, Patch Manager met à jour les instances EC2 surveillées par CloudWatch, Session Manager fournit les accès enregistrés par CloudTrail et les documents d'automatisation orchestrent les réponses aux résultats de Security Hub. Le chapitre couvre l'architecture Systems Manager, l'agent SSM, l'accès sécurisé à Session Manager, les hiérarchies de Parameter Store, l'intégration de Secrets Manager, la gestion de flotte Run Command, les fenêtres de base et de maintenance de Patch Manager, les associations State Manager, les documents d'automatisation, la gestion des incidents OpsCenter, les workflows d'approbation du calendrier des modifications et la création de systèmes de production où les flottes sont gérées de manière centralisée, les correctifs se déploient automatiquement, l'accès est sécurisé et audité et les modifications opérationnelles suivent les processus gouvernés.

## Théorie \&Concepts

### Architecture du gestionnaire de systèmes

**Composants principaux :**
```
Systems Manager Purpose:
Unified operations management for AWS and on-premises

Key Capabilities:
1. Operations Management: View operational data
2. Application Management: Manage applications and configurations
3. Change Management: Automate changes safely
4. Node Management: Manage EC2 and on-premises servers
5. Shared Resources: Documents and parameters

Systems Manager Agent (SSM Agent):

Purpose: Software agent running on managed instances
Functions:
- Receives commands from Systems Manager
- Executes automation documents
- Reports inventory and status
- Sends logs to CloudWatch

Supported Platforms:
- Amazon Linux, Ubuntu, RHEL, SUSE (pre-installed)
- Windows Server
- macOS
- On-premises servers (hybrid activation)

Communication:
Instance → SSM Agent → Systems Manager Service
- Outbound HTTPS only (no inbound ports)
- No SSH/RDP keys needed
- Uses IAM instance profile for authentication

Managed Instance Requirements:
1. SSM Agent installed and running
2. IAM instance profile with AmazonSSMManagedInstanceCore
3. Network connectivity to Systems Manager endpoints
4. Operating system supported

Systems Manager Endpoints:
- ssm.region.amazonaws.com (main service)
- ssmmessages.region.amazonaws.com (Session Manager)
- ec2messages.region.amazonaws.com (Run Command)

VPC Endpoints (Private Subnets):
Create VPC endpoints for Systems Manager
No NAT Gateway required
Reduces data transfer costs

Architecture Diagram:

Managed Instances (EC2, On-Premises)
    ↓ (SSM Agent)
Systems Manager Service
    ├── Session Manager (secure shell)
    ├── Run Command (execute commands)
    ├── Patch Manager (automated patching)
    ├── State Manager (configuration compliance)
    ├── Automation (orchestration)
    ├── Parameter Store (configuration data)
    └── OpsCenter (incident management)
    ↓
Integration Points:
    ├── CloudWatch (logs, metrics, dashboards)
    ├── CloudTrail (audit trail)
    ├── Config (compliance)
    ├── EventBridge (event-driven automation)
    └── SNS (notifications)
```
### Gestionnaire de sessions

**Accès sécurisé au Shell sans clés SSH :**
```
Session Manager Purpose:
Browser-based shell access to managed instances
No SSH keys, bastion hosts, or open inbound ports required

Benefits vs Traditional SSH:

Traditional SSH:
✗ SSH keys to manage and distribute
✗ Bastion hosts to maintain
✗ Inbound port 22 open (security risk)
✗ VPN required for remote access
✗ Limited audit trail
✗ Key sprawl and orphaned access

Session Manager:
✓ No SSH keys required
✓ No bastion hosts needed
✓ No inbound ports open
✓ Browser-based access (no VPN)
✓ Complete CloudTrail audit trail
✓ IAM-based access control
✓ Session recording to S3

Access Methods:

1. AWS Console:
   - Navigate to Systems Manager
   - Select "Session Manager"
   - Choose instance
   - Click "Start session"
   - Shell opens in browser

2. AWS CLI:
   aws ssm start-session \
       --target i-1234567890abcdef0

3. SSH Replacement (with SSH client):
   ssh -i /path/to/key ec2-user@i-1234567890abcdef0
   # Tunneled through Systems Manager
   # No SSH keys actually used

Session Features:

Interactive Shell:
- Bash/PowerShell based on OS
- Full command execution
- Tab completion
- Command history

Port Forwarding:
- Forward local port to instance port
- Access RDS, ElastiCache, etc.
- No bastion host needed

Example: Access RDS through EC2
aws ssm start-session \
    --target i-1234567890abcdef0 \
    --document-name AWS-StartPortForwardingSession \
    --parameters "portNumber=3306,localPortNumber=9999"

# Connect to RDS
mysql -h 127.0.0.1 -P 9999 -u admin -p

Logging and Auditing:

CloudTrail Logging:
Every session start/end logged
Includes: User, instance, start time, duration

Session Recording:
Record entire session to S3
Review commands executed
Compliance and audit requirements

Configuration:
{
  "s3BucketName": "session-logs-bucket",
  "s3KeyPrefix": "session-recordings/",
  "s3EncryptionEnabled": true,
  "cloudWatchLogGroupName": "/aws/ssm/session-logs",
  "cloudWatchEncryptionEnabled": true,
  "kmsKeyId": "alias/session-encryption-key"
}

IAM Policy for Session Manager:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:StartSession"
      ],
      "Resource": [
        "arn:aws:ec2:*:*:instance/i-*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        },
        "StringLike": {
          "ssm:resourceTag/Environment": "Production"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:TerminateSession",
        "ssm:ResumeSession"
      ],
      "Resource": "arn:aws:ssm:*:*:session/${aws:username}-*"
    }
  ]
}

Access Control:
✓ Tag-based access (Environment=Production)
✓ Instance-level permissions
✓ Region restrictions
✓ User can only terminate own sessions

Use Cases:

1. Emergency Access:
   - Server unresponsive
   - No SSH key available
   - Start session in browser immediately

2. Compliance:
   - No SSH keys to audit
   - All sessions recorded
   - Complete audit trail

3. Troubleshooting:
   - Quick access to investigate issues
   - No VPN or bastion setup
   - Port forwarding for database access

4. Multi-User Access:
   - IAM-based permissions
   - No shared credentials
   - Individual accountability
```
### Magasin de paramètres

**Gestion centralisée de la configuration et des secrets :**
```
Parameter Store Purpose:
Store configuration data and secrets
Hierarchical organization
Encryption with KMS
Version history
Free tier available

Parameter Types:

1. String:
   - Plain text values
   - Configuration settings
   - Example: Database endpoint

2. StringList:
   - Comma-separated values
   - Lists of items
   - Example: Allowed IP addresses

3. SecureString:
   - Encrypted with KMS
   - Passwords, API keys
   - Automatic decryption on retrieval
   - Example: Database password

Parameter Tiers:

Standard (Free):
- Max 10,000 parameters per account
- Max 4 KB value size
- No parameter policies
- Free

Advanced ($0.05/parameter/month):
- Max 100,000 parameters
- Max 8 KB value size
- Parameter policies (expiration, notifications)
- Higher throughput

Comparison with Secrets Manager:

┌──────────────────────┬─────────────────┬──────────────────┐
│ Feature              │ Parameter Store │ Secrets Manager  │
├──────────────────────┼─────────────────┼──────────────────┤
│ Cost (standard)      │ Free            │ $0.40/secret/mo  │
│ Rotation             │ Manual          │ Automatic ✓      │
│ RDS integration      │ No              │ Native ✓         │
│ Cross-account        │ Limited         │ Yes ✓            │
│ Versioning           │ Basic           │ Full ✓           │
│ Max size             │ 4-8 KB          │ 64 KB            │
│ Use case             │ Configuration   │ Secrets/rotation │
└──────────────────────┴─────────────────┴──────────────────┘

Hierarchical Organization:

/application/
├── /production/
│   ├── /database/
│   │   ├── endpoint
│   │   ├── username
│   │   └── password (SecureString)
│   ├── /api/
│   │   ├── base-url
│   │   └── api-key (SecureString)
│   └── /feature-flags/
│       ├── enable-new-feature
│       └── rate-limit
├── /staging/
│   ├── /database/
│   │   └── ...
│   └── /api/
│       └── ...
└── /development/
    └── ...

Benefits:
✓ Organized by environment
✓ Easy to retrieve all parameters for path
✓ Permissions by path hierarchy
✓ Clear naming convention

Creating Parameters:

# String parameter
aws ssm put-parameter \
    --name "/myapp/production/database/endpoint" \
    --value "mydb.cluster-abc.us-east-1.rds.amazonaws.com" \
    --type "String" \
    --description "Production database endpoint"

# SecureString parameter (encrypted)
aws ssm put-parameter \
    --name "/myapp/production/database/password" \
    --value "MySecurePassword123!" \
    --type "SecureString" \
    --key-id "alias/parameter-store-key" \
    --description "Production database password"

Retrieving Parameters:

# Get single parameter
aws ssm get-parameter \
    --name "/myapp/production/database/endpoint"

# Get parameter with decryption
aws ssm get-parameter \
    --name "/myapp/production/database/password" \
    --with-decryption

# Get all parameters by path
aws ssm get-parameters-by-path \
    --path "/myapp/production/database" \
    --recursive \
    --with-decryption

Application Integration:

import boto3

ssm = boto3.client('ssm')

# Get parameter
response = ssm.get_parameter(
    Name='/myapp/production/database/endpoint'
)
db_endpoint = response['Parameter']['Value']

# Get encrypted parameter
response = ssm.get_parameter(
    Name='/myapp/production/database/password',
    WithDecryption=True
)
db_password = response['Parameter']['Value']

# Cache parameters (reduce API calls)
import time

class ParameterCache:
    def __init__(self, ttl=300):  # 5-minute TTL
        self.cache = {}
        self.ttl = ttl
    
    def get_parameter(self, name, decrypt=False):
        # Check cache
        if name in self.cache:
            value, timestamp = self.cache[name]
            if time.time() - timestamp < self.ttl:
                return value
        
        # Cache miss - retrieve from SSM
        response = ssm.get_parameter(
            Name=name,
            WithDecryption=decrypt
        )
        value = response['Parameter']['Value']
        
        # Update cache
        self.cache[name] = (value, time.time())
        
        return value

# Usage
cache = ParameterCache(ttl=300)
db_endpoint = cache.get_parameter('/myapp/production/database/endpoint')

Parameter Policies (Advanced Tier):

# Expiration notification
{
  "Type": "Expiration",
  "Version": "1.0",
  "Attributes": {
    "Timestamp": "2025-12-31T23:59:59.000Z"
  }
}

# Notification before expiration
{
  "Type": "ExpirationNotification",
  "Version": "1.0",
  "Attributes": {
    "Before": "30",  # 30 days before expiration
    "Unit": "Days"
  }
}

Use Cases:

1. Application Configuration:
   - Database endpoints
   - API URLs
   - Feature flags
   - Environment-specific settings

2. Secrets (Non-Rotating):
   - API keys (third-party)
   - License keys
   - Static credentials

3. Infrastructure Automation:
   - CloudFormation parameters
   - Lambda environment variables
   - ECS task definitions

4. Sharing Across Services:
   - Lambda functions access same config
   - EC2 instances share parameters
   - Consistent configuration
```
### Exécuter la commande

**Exécution des commandes de la flotte :**
```
Run Command Purpose:
Execute commands on managed instances at scale
No SSH required
Centralized execution and logging

Capabilities:

Execute Commands:
- Shell scripts (Linux/macOS)
- PowerShell scripts (Windows)
- AWS-provided documents
- Custom documents

Target Selection:
- Instance IDs
- Tags
- Resource groups
- All instances

Execution Control:
- Concurrency control (percent or absolute)
- Error threshold (stop if too many failures)
- Rate control (prevent overwhelming targets)

Common Use Cases:

1. Install/Update Software:
   - Install CloudWatch agent
   - Update application version
   - Install security agents

2. Configuration Changes:
   - Modify config files
   - Restart services
   - Change permissions

3. Data Collection:
   - Gather logs
   - Check system status
   - Inventory software

4. Security Operations:
   - Run malware scans
   - Apply security patches
   - Check for vulnerabilities

AWS-Provided Documents:

AWS-RunShellScript (Linux):
Execute bash commands

Example:
aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --targets "Key=tag:Environment,Values=Production" \
    --parameters "commands=['df -h','uptime','who']" \
    --comment "Check disk space and uptime"

AWS-RunPowerShellScript (Windows):
Execute PowerShell commands

AWS-ConfigureAWSPackage:
Install/update AWS packages (CloudWatch agent, Inspector agent)

AWS-RunPatchBaseline:
Apply patches from Patch Manager baseline

Custom Documents:

YAML format defining commands to execute

Example: Install CloudWatch Agent
---
schemaVersion: '2.2'
description: Install CloudWatch Agent
mainSteps:
- action: aws:runShellScript
  name: InstallCloudWatchAgent
  inputs:
    runCommand:
    - wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
    - rpm -U ./amazon-cloudwatch-agent.rpm
    - /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c ssm:/cloudwatch-agent/config

Execution Example:

import boto3

ssm = boto3.client('ssm')

# Send command
response = ssm.send_command(
    DocumentName='AWS-RunShellScript',
    Targets=[
        {
            'Key': 'tag:Environment',
            'Values': ['Production']
        }
    ],
    Parameters={
        'commands': [
            'sudo yum update -y',
            'sudo systemctl restart nginx'
        ]
    },
    MaxConcurrency='50%',  # Run on 50% at a time
    MaxErrors='10%',  # Stop if >10% fail
    TimeoutSeconds=600,
    Comment='Update and restart nginx'
)

command_id = response['Command']['CommandId']

# Check execution status
import time

while True:
    result = ssm.list_command_invocations(
        CommandId=command_id
    )
    
    statuses = [inv['Status'] for inv in result['CommandInvocations']]
    
    if all(status in ['Success', 'Failed', 'Cancelled'] for status in statuses):
        break
    
    time.sleep(5)

# Get output
for invocation in result['CommandInvocations']:
    instance_id = invocation['InstanceId']
    status = invocation['Status']
    
    print(f"{instance_id}: {status}")
    
    if status == 'Failed':
        # Get error details
        output = ssm.get_command_invocation(
            CommandId=command_id,
            InstanceId=instance_id
        )
        print(f"  Error: {output['StandardErrorContent']}")

Output Logging:

CloudWatch Logs:
- All command output sent to CloudWatch
- Searchable with Logs Insights
- Retention policy configurable

S3 Storage:
- Command output stored in S3
- Long-term archival
- Compliance requirements

Rate Control:

Concurrency:
- Absolute: "10" (10 instances simultaneously)
- Percentage: "25%" (25% of targets)

Error Threshold:
- Absolute: "5" (stop after 5 failures)
- Percentage: "10%" (stop if >10% fail)

Example: Rolling Update
MaxConcurrency: "1"  # One instance at a time
MaxErrors: "0"  # Stop on any failure
Result: Safe, sequential updates

Permissions:

IAM Policy for Run Command:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:ListCommands",
        "ssm:ListCommandInvocations"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ssm:resourceTag/Environment": "Production"
        }
      }
    }
  ]
}
```
### Gestionnaire de correctifs

**Correction automatisée des systèmes d'exploitation et des applications :**
```
Patch Manager Purpose:
Automate patching of operating systems and applications
Compliance reporting
Scheduled maintenance windows

Key Concepts:

1. Patch Baseline:
   - Rules for automatic patch approval
   - Severity levels (Critical, Important, etc.)
   - Auto-approval delay (test before production)
   - Rejected patches list

2. Maintenance Window:
   - Scheduled time for patching
   - Prevents patching during business hours
   - Concurrency and error controls
   - SNS notifications

3. Patch Groups:
   - Tag-based grouping (Patch Group tag)
   - Different baselines per group
   - Example: Production, Development, Testing

Patch Baseline Configuration:

Default Baselines (AWS-Provided):
- AWS-DefaultPatchBaseline (all OS updates)
- AWS-WindowsDefaultPatchBaseline
- AWS-AmazonLinux2DefaultPatchBaseline
- AWS-UbuntuDefaultPatchBaseline

Custom Baseline Example:

{
  "Name": "Production-CriticalOnly-Baseline",
  "Description": "Critical and security patches only",
  "OperatingSystem": "AMAZON_LINUX_2",
  "ApprovalRules": {
    "PatchRules": [
      {
        "PatchFilterGroup": {
          "PatchFilters": [
            {
              "Key": "CLASSIFICATION",
              "Values": ["Security", "Bugfix"]
            },
            {
              "Key": "SEVERITY",
              "Values": ["Critical", "Important"]
            }
          ]
        },
        "ComplianceLevel": "CRITICAL",
        "ApproveAfterDays": 7,  # Test in dev for 7 days first
        "EnableNonSecurity": false
      }
    ]
  },
  "RejectedPatches": [
    "CVE-2024-12345"  # Known problematic patch
  ]
}

Creating Baseline:

ssm.create_patch_baseline(
    Name='Production-CriticalOnly-Baseline',
    Description='Critical and security patches only',
    OperatingSystem='AMAZON_LINUX_2',
    ApprovalRules={
        'PatchRules': [
            {
                'PatchFilterGroup': {
                    'PatchFilters': [
                        {
                            'Key': 'CLASSIFICATION',
                            'Values': ['Security', 'Bugfix']
                        },
                        {
                            'Key': 'SEVERITY',
                            'Values': ['Critical', 'Important']
                        }
                    ]
                },
                'ApproveAfterDays': 7,
                'EnableNonSecurity': False
            }
        ]
    }
)

Patch Groups:

Tag instances with "Patch Group"

# Tag production instances
ec2.create_tags(
    Resources=['i-1234567890abcdef0'],
    Tags=[
        {'Key': 'Patch Group', 'Value': 'Production'},
        {'Key': 'Environment', 'Value': 'Production'}
    ]
)

# Associate baseline with patch group
ssm.register_patch_baseline_for_patch_group(
    BaselineId='pb-abc123',
    PatchGroup='Production'
)

Maintenance Window:

Create scheduled patching window

ssm.create_maintenance_window(
    Name='Production-Patching-Window',
    Description='Weekly patching for production servers',
    Schedule='cron(0 2 ? * SUN *)',  # Sunday 2 AM UTC
    Duration=4,  # 4 hours
    Cutoff=1,  # Stop new tasks 1 hour before end
    AllowUnassociatedTargets=False
)

Register Targets:

ssm.register_target_with_maintenance_window(
    WindowId='mw-abc123',
    ResourceType='INSTANCE',
    Targets=[
        {
            'Key': 'tag:Patch Group',
            'Values': ['Production']
        }
    ]
)

Register Patch Task:

ssm.register_task_with_maintenance_window(
    WindowId='mw-abc123',
    TaskType='RUN_COMMAND',
    TaskArn='AWS-RunPatchBaseline',
    ServiceRoleArn='arn:aws:iam::account:role/SSMMaintenanceWindowRole',
    Priority=1,
    MaxConcurrency='50%',  # Patch 50% simultaneously
    MaxErrors='25%',  # Stop if >25% fail
    Targets=[
        {
            'Key': 'WindowTargetIds',
            'Values': ['target-id']
        }
    ],
    TaskInvocationParameters={
        'RunCommand': {
            'Parameters': {
                'Operation': ['Install']
            },
            'TimeoutSeconds': 3600,
            'NotificationConfig': {
                'NotificationArn': 'arn:aws:sns:region:account:patching-alerts',
                'NotificationEvents': ['All'],
                'NotificationType': 'Command'
            },
            'CloudWatchOutputConfig': {
                'CloudWatchLogGroupName': '/aws/ssm/maintenance-windows',
                'CloudWatchOutputEnabled': True
            }
        }
    }
)

Patching Workflow:

1. Maintenance window opens (Sunday 2 AM)
2. Systems Manager identifies targets (Patch Group: Production)
3. Retrieves patch baseline for group
4. Scans instances for missing patches
5. Downloads and installs approved patches
6. Reboots if required (configurable)
7. Reports compliance status
8. Sends SNS notifications

Compliance Reporting:

# Get patch compliance summary
response = ssm.describe_instance_patch_states_for_patch_group(
    PatchGroup='Production'
)

for instance in response['InstancePatchStates']:
    instance_id = instance['InstanceId']
    
    print(f"\nInstance: {instance_id}")
    print(f"  Installed: {instance.get('InstalledCount', 0)}")
    print(f"  Missing: {instance.get('MissingCount', 0)}")
    print(f"  Failed: {instance.get('FailedCount', 0)}")
    print(f"  Last Scan: {instance.get('OperationEndTime')}")
    
    if instance.get('MissingCount', 0) > 0:
        print(f"  ⚠️  {instance['MissingCount']} patches missing")

Patch Deployment Strategy:

Development Environment:
- Baseline: All patches (aggressive)
- Auto-approval: Immediate
- Schedule: Daily
- Reboot: Anytime

Staging Environment:
- Baseline: Same as production
- Auto-approval: 3 days after development
- Schedule: Tuesday/Thursday
- Reboot: After testing

Production Environment:
- Baseline: Critical + Important only
- Auto-approval: 7 days after staging
- Schedule: Sunday 2-6 AM
- Reboot: Only if necessary
- Rollback plan documented
```
### Documents d'automatisation

**Orchestration des opérations en plusieurs étapes :**
```
Automation Purpose:
Orchestrate complex operational tasks
Multi-step workflows
Integration with other AWS services

Document Structure:

schemaVersion: '0.3'
description: Automated instance recovery
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
    description: Instance to recover
  AutomationAssumeRole:
    type: String
    description: IAM role for automation
mainSteps:
- name: StopInstance
  action: aws:executeAwsApi
  inputs:
    Service: ec2
    Api: StopInstances
    InstanceIds:
    - '{{ InstanceId }}'
- name: WaitForStopped
  action: aws:waitForAwsResourceProperty
  inputs:
    Service: ec2
    Api: DescribeInstances
    InstanceIds:
    - '{{ InstanceId }}'
    PropertySelector: '$.Reservations[0].Instances[0].State.Name'
    DesiredValues:
    - stopped
- name: StartInstance
  action: aws:executeAwsApi
  inputs:
    Service: ec2
    Api: StartInstances
    InstanceIds:
    - '{{ InstanceId }}'

Actions Available:

aws:executeAwsApi:
Call any AWS API

aws:runCommand:
Execute Run Command on instances

aws:createSnapshot:
Create EBS snapshot

aws:copyImage:
Copy AMI to another region

aws:waitForAwsResourceProperty:
Wait for resource state

aws:branch:
Conditional logic

aws:sleep:
Wait specified time

aws:approval:
Manual approval step

Real-World Example: Automated AMI Creation

---
schemaVersion: '0.3'
description: Create AMI with validation
parameters:
  InstanceId:
    type: String
  AMIName:
    type: String
mainSteps:
- name: CreateImage
  action: aws:createImage
  inputs:
    InstanceId: '{{ InstanceId }}'
    ImageName: '{{ AMIName }}'
    NoReboot: false
  outputs:
  - Name: ImageId
    Selector: '$.ImageId'
    Type: String
- name: WaitForAvailable
  action: aws:waitForAwsResourceProperty
  inputs:
    Service: ec2
    Api: DescribeImages
    ImageIds:
    - '{{ CreateImage.ImageId }}'
    PropertySelector: '$.Images[0].State'
    DesiredValues:
    - available
  timeoutSeconds: 600
- name: TagImage
  action: aws:createTags
  inputs:
    ResourceIds:
    - '{{ CreateImage.ImageId }}'
    Tags:
    - Key: CreatedBy
      Value: Automation
    - Key: CreatedDate
      Value: '{{ global:DATE_TIME }}'
- name: TestLaunch
  action: aws:runInstances
  inputs:
    ImageId: '{{ CreateImage.ImageId }}'
    InstanceType: t3.micro
    MinInstanceCount: 1
    MaxInstanceCount: 1
    TagSpecifications:
    - ResourceType: instance
      Tags:
      - Key: Purpose
        Value: AMI-Validation
  outputs:
  - Name: TestInstanceId
    Selector: '$.InstanceIds[0]'
    Type: String
- name: ValidateInstance
  action: aws:waitForAwsResourceProperty
  inputs:
    Service: ec2
    Api: DescribeInstanceStatus
    InstanceIds:
    - '{{ TestLaunch.TestInstanceId }}'
    PropertySelector: '$.InstanceStatuses[0].SystemStatus.Status'
    DesiredValues:
    - ok
- name: TerminateTestInstance
  action: aws:executeAwsApi
  inputs:
    Service: ec2
    Api: TerminateInstances
    InstanceIds:
    - '{{ TestLaunch.TestInstanceId }}'

Executing Automation:

ssm.start_automation_execution(
    DocumentName='Custom-CreateValidatedAMI',
    Parameters={
        'InstanceId': ['i-1234567890abcdef0'],
        'AMIName': ['MyApp-v1.2.3-' + datetime.now().strftime('%Y%m%d')]
    }
)

Integration with EventBridge:

Trigger automation on events

# Rule: Trigger recovery when instance fails health check
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["stopping", "stopped"]
  }
}

# Target: Automation document
events.put_targets(
    Rule='InstanceFailure',
    Targets=[{
        'Id': '1',
        'Arn': 'arn:aws:ssm:region:account:automation-definition/AWS-RestartEC2Instance',
        'RoleArn': 'arn:aws:iam::account:role/AutomationServiceRole',
        'Input': '{"InstanceId": ["$.detail.instance-id"]}'
    }]
)
```
### OpsCenter et calendrier des modifications

**Renseignement opérationnel :**
```
OpsCenter Purpose:
Centralized operational issue management
Aggregates issues from multiple sources
Tracks investigation and resolution

OpsItem Sources:
- CloudWatch alarms
- EventBridge events
- AWS Config compliance issues
- Manual creation
- Third-party integrations (ServiceNow, Jira)

OpsItem Structure:
- Title and description
- Source (alarm, event, manual)
- Severity (1-4, 1=critical)
- Category (Availability, Performance, Security, Cost)
- Status (Open, InProgress, Resolved)
- Related resources
- Runbooks (automation documents)

Creating OpsItem from Alarm:

cloudwatch.put_metric_alarm(
    AlarmName='HighCPU',
    ActionsEnabled=True,
    OKActions=[],
    AlarmActions=[
        'arn:aws:ssm:region:account:opsitem:1'  # Create OpsItem
    ],
    # ... alarm configuration
)

OpsItem Workflow:

1. Issue detected (alarm, event, config)
2. OpsItem created automatically
3. On-call engineer notified
4. Engineer investigates (related resources, logs)
5. Engineer runs remediation (runbook automation)
6. Issue resolved
7. OpsItem closed
8. Post-mortem documented

Change Calendar:

Purpose: Control when changes can occur
Prevent changes during high-risk periods
Integration with Maintenance Windows

Calendar Types:

DEFAULT_OPEN:
- Changes allowed by default
- Block specific dates/times
- Example: Block during Black Friday

DEFAULT_CLOSED:
- Changes blocked by default
- Allow specific dates/times
- Example: Allow only during maintenance windows

Creating Change Calendar:

ssm.create_ops_metadata(
    ResourceId='arn:aws:ssm:region:account:opsmetadata/aws/calendar/production-changes',
    Metadata={
        'Name': ['Production Change Calendar'],
        'Description': ['Allowed change windows for production'],
        'CalendarType': ['DEFAULT_CLOSED']
    }
)

# Add change windows
ssm.update_ops_metadata(
    OpsMetadataArn='arn:aws:ssm:region:account:opsmetadata/aws/calendar/production-changes',
    MetadataToUpdate={
        'Entry1': {
            'Value': 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:20250120T020000Z\nDTEND:20250120T060000Z\nSUMMARY:Maintenance Window\nEND:VEVENT\nEND:VCALENDAR'
        }
    }
)

Maintenance Window with Change Calendar:

ssm.create_maintenance_window(
    Name='Production-Patching',
    Schedule='cron(0 2 ? * SUN *)',
    Duration=4,
    Cutoff=1,
    # ... configuration
)

# Associate with change calendar
ssm.update_maintenance_window(
    WindowId='mw-abc123',
    ScheduleCalendar='arn:aws:ssm:region:account:opsmetadata/aws/calendar/production-changes'
)

Result: Maintenance window only runs during approved calendar windows

Use Cases:

1. Holiday Protection:
   - Block all changes during Black Friday
   - Prevent deployment during peak shopping

2. Business Hours Protection:
   - DEFAULT_CLOSED calendar
   - Allow changes only 2-6 AM Sunday
   - No surprises during business hours

3. Compliance Windows:
   - Required maintenance windows
   - Audit trail of approved changes
   - Governance and control
```
## Implémentation pratique

### Atelier 1 : Configuration et accès au gestionnaire de sessions

**Objectif :** Configurez Session Manager pour un accès shell sécurisé basé sur un navigateur sans clés SSH.

**Étape 1 : Créer un rôle IAM pour les instances EC2**
```python
import boto3
import json

iam = boto3.client('iam')

# Create IAM role for EC2 with Systems Manager permissions
trust_policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "ec2.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}

role_name = 'EC2-SSM-Role'

role_response = iam.create_role(
    RoleName=role_name,
    AssumeRolePolicyDocument=json.dumps(trust_policy),
    Description='Role for EC2 instances to use Systems Manager'
)

# Attach AWS managed policy for Systems Manager
iam.attach_role_policy(
    RoleName=role_name,
    PolicyArn='arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
)

# Attach policy for CloudWatch Logs (session logging)
iam.attach_role_policy(
    RoleName=role_name,
    PolicyArn='arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy'
)

# Create instance profile
iam.create_instance_profile(
    InstanceProfileName=role_name
)

iam.add_role_to_instance_profile(
    InstanceProfileName=role_name,
    RoleName=role_name
)

print(f"Created IAM role: {role_name}")
```
**Étape 2 : Lancer l'instance EC2 avec l'agent SSM**
```python
ec2 = boto3.client('ec2')

# User data to install SSM agent (if not pre-installed)
user_data = """#!/bin/bash
# For Amazon Linux 2, SSM agent pre-installed
# For other OSes, install SSM agent
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
"""

# Launch instance
response = ec2.run_instances(
    ImageId='ami-0c55b159cbfafe1f0',  # Amazon Linux 2
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1,
    IamInstanceProfile={'Name': 'EC2-SSM-Role'},
    UserData=user_data,
    TagSpecifications=[{
        'ResourceType': 'instance',
        'Tags': [
            {'Key': 'Name', 'Value': 'SSM-Test-Instance'},
            {'Key': 'Environment', 'Value': 'Development'}
        ]
    }]
)

instance_id = response['Instances'][0]['InstanceId']

print(f"Launched instance: {instance_id}")
print("Waiting for instance to be managed by Systems Manager...")

# Wait for instance to appear in Systems Manager
ssm = boto3.client('ssm')
import time

for i in range(60):  # Wait up to 10 minutes
    try:
        response = ssm.describe_instance_information(
            Filters=[
                {'Key': 'InstanceIds', 'Values': [instance_id]}
            ]
        )
        
        if response['InstanceInformationList']:
            instance_info = response['InstanceInformationList'][0]
            ping_status = instance_info['PingStatus']
            
            if ping_status == 'Online':
                print(f"✓ Instance is managed and online")
                break
    
    except Exception as e:
        pass
    
    time.sleep(10)
```
**Étape 3 : Configurer les préférences de Session Manager**
```python
# Configure session logging and encryption
session_preferences = {
    's3BucketName': 'session-logs-bucket',
    's3KeyPrefix': 'session-recordings/',
    's3EncryptionEnabled': True,
    'kmsKeyId': 'alias/session-encryption-key',
    'cloudWatchLogGroupName': '/aws/ssm/session-logs',
    'cloudWatchEncryptionEnabled': True,
    'idleSessionTimeout': '20',  # Minutes
    'maxSessionDuration': '60',  # Minutes
    'runAsEnabled': False
}

ssm.update_document_default_version(
    Name='SSM-SessionManagerRunShell'
)

print("Session Manager preferences configured")
print("  S3 logging: Enabled")
print("  CloudWatch logging: Enabled")
print("  Encryption: KMS")
print("  Idle timeout: 20 minutes")
```
**Étape 4 : Démarrez la session via CLI/SDK**
```python
# Start session programmatically
def start_session(instance_id):
    """Start Session Manager session"""
    
    # Note: Requires session-manager-plugin installed locally
    # pip install session-manager-plugin
    
    response = ssm.start_session(
        Target=instance_id
    )
    
    session_id = response['SessionId']
    stream_url = response['StreamUrl']
    token_value = response['TokenValue']
    
    print(f"Session started: {session_id}")
    print(f"Connect with:")
    print(f"  aws ssm start-session --target {instance_id}")
    
    return session_id

session_id = start_session(instance_id)

# Terminate session
def terminate_session(session_id):
    """Terminate active session"""
    
    ssm.terminate_session(SessionId=session_id)
    print(f"Session terminated: {session_id}")
```
**Étape 5 : Exemple de redirection de port**
```python
# Port forwarding to access RDS through EC2
def start_port_forwarding(instance_id, remote_port, local_port):
    """Start port forwarding session"""
    
    print(f"Starting port forwarding session")
    print(f"  Remote port: {remote_port}")
    print(f"  Local port: {local_port}")
    
    # CLI command (SDK doesn't support interactive session)
    import subprocess
    
    cmd = [
        'aws', 'ssm', 'start-session',
        '--target', instance_id,
        '--document-name', 'AWS-StartPortForwardingSession',
        '--parameters', f'portNumber={remote_port},localPortNumber={local_port}'
    ]
    
    print(f"Run: {' '.join(cmd)}")
    print(f"\nThen connect to localhost:{local_port}")

# Example: Access RDS MySQL through EC2
start_port_forwarding(instance_id, 3306, 9999)

# Connect to RDS: mysql -h 127.0.0.1 -P 9999 -u admin -p
```
### Atelier 2 : Magasin de paramètres et configuration de l'application

**Objectif :** Organisez la configuration de l'application dans Parameter Store avec une structure hiérarchique.

**Étape 1 : Créer une hiérarchie de paramètres**
```python
def create_application_parameters():
    """Create hierarchical parameter structure for application"""
    
    ssm = boto3.client('ssm')
    
    # Database parameters
    database_params = [
        {
            'name': '/myapp/production/database/endpoint',
            'value': 'mydb.cluster-abc.us-east-1.rds.amazonaws.com',
            'type': 'String',
            'description': 'Production database endpoint'
        },
        {
            'name': '/myapp/production/database/port',
            'value': '3306',
            'type': 'String',
            'description': 'Database port'
        },
        {
            'name': '/myapp/production/database/username',
            'value': 'admin',
            'type': 'String',
            'description': 'Database admin username'
        },
        {
            'name': '/myapp/production/database/password',
            'value': 'ChangeMe123!',
            'type': 'SecureString',
            'description': 'Database admin password',
            'key_id': 'alias/parameter-store-key'
        }
    ]
    
    # API parameters
    api_params = [
        {
            'name': '/myapp/production/api/base-url',
            'value': 'https://api.example.com',
            'type': 'String'
        },
        {
            'name': '/myapp/production/api/timeout',
            'value': '30',
            'type': 'String'
        },
        {
            'name': '/myapp/production/api/key',
            'value': 'sk-1234567890abcdef',
            'type': 'SecureString',
            'key_id': 'alias/parameter-store-key'
        }
    ]
    
    # Feature flags
    feature_params = [
        {
            'name': '/myapp/production/features/enable-new-checkout',
            'value': 'true',
            'type': 'String'
        },
        {
            'name': '/myapp/production/features/rate-limit',
            'value': '1000',
            'type': 'String'
        }
    ]
    
    all_params = database_params + api_params + feature_params
    
    for param in all_params:
        kwargs = {
            'Name': param['name'],
            'Value': param['value'],
            'Type': param['type'],
            'Description': param.get('description', ''),
            'Tags': [
                {'Key': 'Application', 'Value': 'MyApp'},
                {'Key': 'Environment', 'Value': 'Production'}
            ]
        }
        
        if param['type'] == 'SecureString' and 'key_id' in param:
            kwargs['KeyId'] = param['key_id']
        
        ssm.put_parameter(**kwargs)
        
        print(f"Created: {param['name']}")
    
    print(f"\nCreated {len(all_params)} parameters")

create_application_parameters()
```
**Étape 2 : Récupérer les paramètres dans l'application**
```python
class ApplicationConfig:
    """Application configuration from Parameter Store"""
    
    def __init__(self, environment='production'):
        self.ssm = boto3.client('ssm')
        self.environment = environment
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        self.cache_timestamps = {}
    
    def get_all_parameters(self):
        """Get all parameters for environment"""
        
        path = f'/myapp/{self.environment}/'
        
        response = self.ssm.get_parameters_by_path(
            Path=path,
            Recursive=True,
            WithDecryption=True  # Decrypt SecureString parameters
        )
        
        params = {}
        for param in response['Parameters']:
            # Strip path prefix
            key = param['Name'].replace(path, '')
            params[key] = param['Value']
        
        return params
    
    def get_parameter(self, name, decrypt=False):
        """Get single parameter with caching"""
        
        # Check cache
        if name in self.cache:
            value, timestamp = self.cache[name]
            
            if time.time() - timestamp < self.cache_ttl:
                return value
        
        # Cache miss - retrieve from SSM
        full_name = f'/myapp/{self.environment}/{name}'
        
        try:
            response = self.ssm.get_parameter(
                Name=full_name,
                WithDecryption=decrypt
            )
            
            value = response['Parameter']['Value']
            
            # Update cache
            self.cache[name] = (value, time.time())
            
            return value
        
        except self.ssm.exceptions.ParameterNotFound:
            raise ValueError(f"Parameter not found: {full_name}")
    
    def get_database_config(self):
        """Get database configuration"""
        
        return {
            'host': self.get_parameter('database/endpoint'),
            'port': int(self.get_parameter('database/port')),
            'user': self.get_parameter('database/username'),
            'password': self.get_parameter('database/password', decrypt=True),
            'database': 'myapp'
        }
    
    def is_feature_enabled(self, feature_name):
        """Check if feature flag is enabled"""
        
        value = self.get_parameter(f'features/{feature_name}')
        return value.lower() == 'true'

# Usage in application
config = ApplicationConfig(environment='production')

# Get database config
db_config = config.get_database_config()
connection = pymysql.connect(**db_config)

# Check feature flag
if config.is_feature_enabled('enable-new-checkout'):
    # Use new checkout flow
    pass
else:
    # Use old checkout flow
    pass

# Get API configuration
api_url = config.get_parameter('api/base-url')
api_key = config.get_parameter('api/key', decrypt=True)
```
**Étape 3 : Gestion des versions et mises à jour des paramètres**
```python
def update_parameter_with_versioning():
    """Update parameter and maintain version history"""
    
    ssm = boto3.client('ssm')
    
    parameter_name = '/myapp/production/features/rate-limit'
    
    # Get current value
    current = ssm.get_parameter(Name=parameter_name)
    current_version = current['Parameter']['Version']
    current_value = current['Parameter']['Value']
    
    print(f"Current version: {current_version}")
    print(f"Current value: {current_value}")
    
    # Update parameter
    new_value = '2000'
    
    ssm.put_parameter(
        Name=parameter_name,
        Value=new_value,
        Type='String',
        Overwrite=True
    )
    
    # Get new version
    updated = ssm.get_parameter(Name=parameter_name)
    new_version = updated['Parameter']['Version']
    
    print(f"Updated to version: {new_version}")
    print(f"New value: {new_value}")
    
    # Get parameter history
    history = ssm.get_parameter_history(Name=parameter_name)
    
    print(f"\nParameter history:")
    for param in history['Parameters']:
        print(f"  Version {param['Version']}: {param['Value']} ({param['LastModifiedDate']})")

update_parameter_with_versioning()
```
### Atelier 3 : Application automatisée de correctifs avec Patch Manager

**Objectif :** Configurez les correctifs automatisés avec des fenêtres de maintenance, des références de correctifs et des rapports de conformité.

**Étape 1 : Créer une référence de correctifs**
```python
import boto3
from datetime import datetime

ssm = boto3.client('ssm')

# Create custom patch baseline
baseline_response = ssm.create_patch_baseline(
    Name='Production-CriticalOnly-Baseline',
    Description='Critical and Important patches only, 7-day approval delay',
    OperatingSystem='AMAZON_LINUX_2',
    ApprovalRules={
        'PatchRules': [
            {
                'PatchFilterGroup': {
                    'PatchFilters': [
                        {
                            'Key': 'CLASSIFICATION',
                            'Values': ['Security', 'Bugfix']
                        },
                        {
                            'Key': 'SEVERITY',
                            'Values': ['Critical', 'Important']
                        }
                    ]
                },
                'ComplianceLevel': 'CRITICAL',
                'ApproveAfterDays': 7,  # Test in dev for 7 days
                'EnableNonSecurity': False
            }
        ]
    },
    RejectedPatches': [],  # Add problematic patches here
    Sources=[]
)

baseline_id = baseline_response['BaselineId']
print(f"Created patch baseline: {baseline_id}")

# Register baseline as default for patch group
ssm.register_default_patch_baseline(
    BaselineId=baseline_id
)
```
**Étape 2 : étiqueter les instances et créer des groupes de correctifs**
```python
ec2 = boto3.client('ec2')

# Get production instances
instances = ec2.describe_instances(
    Filters=[
        {'Name': 'tag:Environment', 'Values': ['Production']},
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
)

instance_ids = []
for reservation in instances['Reservations']:
    for instance in reservation['Instances']:
        instance_ids.append(instance['InstanceId'])

print(f"Found {len(instance_ids)} production instances")

# Tag instances with Patch Group
if instance_ids:
    ec2.create_tags(
        Resources=instance_ids,
        Tags=[
            {'Key': 'Patch Group', 'Value': 'Production'},
            {'Key': 'Patch Schedule', 'Value': 'Sunday-2AM'}
        ]
    )
    
    print(f"Tagged {len(instance_ids)} instances with Patch Group: Production")

# Register patch baseline for patch group
ssm.register_patch_baseline_for_patch_group(
    BaselineId=baseline_id,
    PatchGroup='Production'
)

print("Associated baseline with patch group")
```
**Étape 3 : Créer une fenêtre de maintenance**
```python
# Create maintenance window for weekly patching
mw_response = ssm.create_maintenance_window(
    Name='Production-Weekly-Patching',
    Description='Weekly patching for production servers every Sunday 2-6 AM UTC',
    Schedule='cron(0 2 ? * SUN *)',  # Sunday 2 AM UTC
    Duration=4,  # 4 hours window
    Cutoff=1,  # Stop new tasks 1 hour before end
    AllowUnassociatedTargets=False,
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Purpose', 'Value': 'Patching'}
    ]
)

window_id = mw_response['WindowId']
print(f"Created maintenance window: {window_id}")

# Register targets (instances with Patch Group tag)
target_response = ssm.register_target_with_maintenance_window(
    WindowId=window_id,
    ResourceType='INSTANCE',
    Targets=[
        {
            'Key': 'tag:Patch Group',
            'Values': ['Production']
        }
    ],
    Name='Production-Servers',
    Description='All production servers for patching'
)

target_id = target_response['WindowTargetId']
print(f"Registered targets: {target_id}")

# Register patching task
task_response = ssm.register_task_with_maintenance_window(
    WindowId=window_id,
    TaskType='RUN_COMMAND',
    TaskArn='AWS-RunPatchBaseline',
    ServiceRoleArn='arn:aws:iam::123456789012:role/SSMMaintenanceWindowRole',
    Priority=1,
    MaxConcurrency='50%',  # Patch 50% of instances simultaneously
    MaxErrors='25%',  # Stop if more than 25% fail
    Targets=[
        {
            'Key': 'WindowTargetIds',
            'Values': [target_id]
        }
    ],
    TaskInvocationParameters={
        'RunCommand': {
            'Comment': 'Apply security patches to production servers',
            'Parameters': {
                'Operation': ['Install']  # Install missing patches
            },
            'TimeoutSeconds': 3600,
            'NotificationConfig': {
                'NotificationArn': 'arn:aws:sns:us-east-1:123456789012:patching-notifications',
                'NotificationEvents': ['All'],
                'NotificationType': 'Command'
            },
            'CloudWatchOutputConfig': {
                'CloudWatchLogGroupName': '/aws/ssm/maintenance-windows',
                'CloudWatchOutputEnabled': True
            }
        }
    }
)

task_id = task_response['WindowTaskId']
print(f"Registered patching task: {task_id}")
```
**Étape 4 : Surveiller la conformité des correctifs**
```python
def check_patch_compliance(patch_group='Production'):
    """Check patch compliance for instances"""
    
    # Get patch compliance summary
    response = ssm.describe_instance_patch_states_for_patch_group(
        PatchGroup=patch_group,
        MaxResults=50
    )
    
    print(f"\n=== Patch Compliance Report: {patch_group} ===")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    total_instances = len(response['InstancePatchStates'])
    compliant_instances = 0
    non_compliant_instances = 0
    
    for instance_state in response['InstancePatchStates']:
        instance_id = instance_state['InstanceId']
        
        installed = instance_state.get('InstalledCount', 0)
        missing = instance_state.get('MissingCount', 0)
        failed = instance_state.get('FailedCount', 0)
        
        compliance_type = instance_state.get('ComplianceType', 'UNKNOWN')
        last_scan = instance_state.get('OperationEndTime', 'Never')
        
        if missing == 0 and failed == 0:
            status = '✓ COMPLIANT'
            compliant_instances += 1
        else:
            status = '✗ NON-COMPLIANT'
            non_compliant_instances += 1
        
        print(f"{status} - {instance_id}")
        print(f"  Installed: {installed} | Missing: {missing} | Failed: {failed}")
        print(f"  Last scan: {last_scan}")
        
        if missing > 0:
            # Get details of missing patches
            details = ssm.describe_instance_patches(
                InstanceId=instance_id,
                Filters=[
                    {'Key': 'State', 'Values': ['Missing']}
                ]
            )
            
            print(f"  Missing patches:")
            for patch in details['Patches'][:5]:  # Show first 5
                severity = patch.get('Severity', 'Unknown')
                title = patch.get('Title', 'Unknown')
                print(f"    - {severity}: {title}")
        
        print()
    
    # Summary
    compliance_rate = (compliant_instances / total_instances * 100) if total_instances > 0 else 0
    
    print(f"=== Summary ===")
    print(f"Total instances: {total_instances}")
    print(f"Compliant: {compliant_instances}")
    print(f"Non-compliant: {non_compliant_instances}")
    print(f"Compliance rate: {compliance_rate:.1f}%")
    
    if compliance_rate < 95:
        print("\n⚠️  Compliance below target (95%)")
    
    return {
        'total': total_instances,
        'compliant': compliant_instances,
        'non_compliant': non_compliant_instances,
        'compliance_rate': compliance_rate
    }

# Check compliance
compliance = check_patch_compliance('Production')
```
**Étape 5 : application manuelle des correctifs (en dehors de la fenêtre de maintenance)**
```python
def patch_instance_immediately(instance_id):
    """Patch single instance immediately (emergency)"""
    
    print(f"Initiating emergency patching for {instance_id}")
    
    # Run patch baseline
    response = ssm.send_command(
        DocumentName='AWS-RunPatchBaseline',
        InstanceIds=[instance_id],
        Parameters={
            'Operation': ['Install'],
            'RebootOption': ['RebootIfNeeded']
        },
        Comment=f'Emergency patching for {instance_id}'
    )
    
    command_id = response['Command']['CommandId']
    
    print(f"Command ID: {command_id}")
    print("Waiting for patching to complete...")
    
    # Wait for completion
    import time
    
    for i in range(60):  # Wait up to 10 minutes
        result = ssm.list_command_invocations(
            CommandId=command_id,
            InstanceId=instance_id,
            Details=True
        )
        
        if result['CommandInvocations']:
            invocation = result['CommandInvocations'][0]
            status = invocation['Status']
            
            print(f"  Status: {status}")
            
            if status in ['Success', 'Failed', 'Cancelled']:
                if status == 'Success':
                    print("✓ Patching completed successfully")
                else:
                    print(f"✗ Patching {status.lower()}")
                    if 'StandardErrorContent' in invocation:
                        print(f"Error: {invocation['StandardErrorContent']}")
                
                break
        
        time.sleep(10)
    
    return command_id

# Emergency patch critical instance
# patch_instance_immediately('i-1234567890abcdef0')
```
## Connaissances au niveau de la production

### Gestion de flotte à grande échelle

**Gestion de milliers d'instances :**
```python
class FleetManager:
    """Manage large fleets of EC2 instances with Systems Manager"""
    
    def __init__(self):
        self.ssm = boto3.client('ssm')
        self.ec2 = boto3.client('ec2')
    
    def get_managed_instance_inventory(self):
        """Get inventory of all managed instances"""
        
        paginator = self.ssm.get_paginator('describe_instance_information')
        
        instances = []
        
        for page in paginator.paginate():
            for instance in page['InstanceInformationList']:
                instances.append({
                    'instance_id': instance['InstanceId'],
                    'platform': instance['PlatformName'],
                    'platform_version': instance['PlatformVersion'],
                    'agent_version': instance['AgentVersion'],
                    'ping_status': instance['PingStatus'],
                    'last_ping': instance.get('LastPingDateTime')
                })
        
        print(f"Total managed instances: {len(instances)}")
        
        # Group by platform
        by_platform = {}
        for instance in instances:
            platform = instance['platform']
            by_platform[platform] = by_platform.get(platform, 0) + 1
        
        print("\nInstances by platform:")
        for platform, count in by_platform.items():
            print(f"  {platform}: {count}")
        
        # Check agent versions
        by_agent_version = {}
        for instance in instances:
            version = instance['agent_version']
            by_agent_version[version] = by_agent_version.get(version, 0) + 1
        
        print("\nSSM Agent versions:")
        for version, count in sorted(by_agent_version.items(), reverse=True):
            print(f"  {version}: {count}")
        
        # Check offline instances
        offline = [i for i in instances if i['ping_status'] != 'Online']
        
        if offline:
            print(f"\n⚠️  {len(offline)} offline instances:")
            for instance in offline[:10]:
                print(f"  {instance['instance_id']}: {instance['ping_status']}")
        
        return instances
    
    def bulk_command_execution(self, command, target_tag=None, max_concurrency='50%'):
        """Execute command across fleet with controlled concurrency"""
        
        # Define targets
        targets = []
        
        if target_tag:
            targets = [
                {
                    'Key': f'tag:{target_tag["key"]}',
                    'Values': [target_tag['value']]
                }
            ]
        else:
            # All managed instances
            targets = [
                {
                    'Key': 'InstanceIds',
                    'Values': ['*']
                }
            ]
        
        # Send command
        response = self.ssm.send_command(
            DocumentName='AWS-RunShellScript',
            Targets=targets,
            Parameters={'commands': command},
            MaxConcurrency=max_concurrency,
            MaxErrors='10%',
            Comment=f'Fleet-wide command execution'
        )
        
        command_id = response['Command']['CommandId']
        
        print(f"Command ID: {command_id}")
        print("Executing across fleet...")
        
        return command_id
    
    def monitor_command_execution(self, command_id):
        """Monitor fleet-wide command execution"""
        
        import time
        
        while True:
            summary = self.ssm.list_commands(
                CommandId=command_id
            )
            
            if summary['Commands']:
                command = summary['Commands'][0]
                
                target_count = command.get('TargetCount', 0)
                completed_count = command.get('CompletedCount', 0)
                error_count = command.get('ErrorCount', 0)
                
                progress = (completed_count / target_count * 100) if target_count > 0 else 0
                
                print(f"Progress: {completed_count}/{target_count} ({progress:.1f}%)")
                print(f"  Errors: {error_count}")
                
                if completed_count == target_count:
                    print("\n✓ Command execution complete")
                    break
            
            time.sleep(10)
        
        # Get results summary
        invocations = self.ssm.list_command_invocations(
            CommandId=command_id,
            MaxResults=1000
        )
        
        success_count = 0
        failed_count = 0
        
        for invocation in invocations['CommandInvocations']:
            status = invocation['Status']
            
            if status == 'Success':
                success_count += 1
            else:
                failed_count += 1
                print(f"  Failed: {invocation['InstanceId']} - {status}")
        
        print(f"\nSummary:")
        print(f"  Success: {success_count}")
        print(f"  Failed: {failed_count}")
    
    def automated_instance_recovery(self, instance_id):
        """Automated recovery workflow for unhealthy instance"""
        
        print(f"Initiating recovery for {instance_id}")
        
        # Step 1: Collect diagnostic information
        print("Step 1: Collecting diagnostics...")
        
        diagnostic_commands = [
            'uptime',
            'df -h',
            'free -m',
            'top -b -n 1 | head -20',
            'systemctl status'
        ]
        
        response = self.ssm.send_command(
            DocumentName='AWS-RunShellScript',
            InstanceIds=[instance_id],
            Parameters={'commands': diagnostic_commands}
        )
        
        # Wait for diagnostics
        time.sleep(10)
        
        # Step 2: Attempt service restart
        print("Step 2: Attempting service restart...")
        
        response = self.ssm.send_command(
            DocumentName='AWS-RunShellScript',
            InstanceIds=[instance_id],
            Parameters={'commands': ['sudo systemctl restart myapp']}
        )
        
        time.sleep(5)
        
        # Step 3: Check if recovered
        print("Step 3: Checking recovery status...")
        
        # If still unhealthy, escalate
        print("Step 4: Escalating to on-call team...")
        
        # Create OpsItem
        self.ssm.create_ops_item(
            Title=f'Instance Recovery Required: {instance_id}',
            Description=f'Automated recovery failed for {instance_id}. Manual intervention required.',
            Priority=1,
            Source='Systems Manager Automation',
            RelatedOpsItems=[],
            Tags=[
                {'Key': 'InstanceId', 'Value': instance_id},
                {'Key': 'Severity', 'Value': 'High'}
            ]
        )

# Usage
fleet_manager = FleetManager()

# Get inventory
instances = fleet_manager.get_managed_instance_inventory()

# Execute command across fleet
command_id = fleet_manager.bulk_command_execution(
    command=['sudo yum update -y'],
    target_tag={'key': 'Environment', 'value': 'Development'},
    max_concurrency='25%'
)

# Monitor execution
fleet_manager.monitor_command_execution(command_id)
```
### Gestion du changement et gouvernance

**Mise en œuvre du contrôle des modifications :**
```python
class ChangeManagement:
    """Change management with approval workflows"""
    
    def __init__(self):
        self.ssm = boto3.client('ssm')
        self.dynamodb = boto3.client('dynamodb')
    
    def create_change_request(self, title, description, risk_level, target_instances):
        """Create change request with approval workflow"""
        
        change_id = f"CHG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Store in DynamoDB
        self.dynamodb.put_item(
            TableName='ChangeRequests',
            Item={
                'ChangeId': {'S': change_id},
                'Title': {'S': title},
                'Description': {'S': description},
                'RiskLevel': {'S': risk_level},  # Low, Medium, High
                'Status': {'S': 'PendingApproval'},
                'TargetInstances': {'SS': target_instances},
                'CreatedDate': {'S': datetime.now().isoformat()},
                'CreatedBy': {'S': 'automation-user'}
            }
        )
        
        print(f"Created change request: {change_id}")
        
        # Send for approval based on risk level
        if risk_level == 'High':
            self._request_approval(change_id, approvers=['manager@example.com', 'director@example.com'])
        elif risk_level == 'Medium':
            self._request_approval(change_id, approvers=['manager@example.com'])
        else:
            # Low risk - auto-approve
            self._approve_change(change_id)
        
        return change_id
    
    def _request_approval(self, change_id, approvers):
        """Send approval request"""
        
        sns = boto3.client('sns')
        
        message = f"""
        Change Request: {change_id}
        
        A change request requires your approval.
        
        View details and approve/reject:
        https://console.aws.amazon.com/systems-manager/change-requests/{change_id}
        
        Or respond via email:
        - Reply "APPROVE" to approve
        - Reply "REJECT" to reject
        """
        
        for approver in approvers:
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:change-approvals',
                Subject=f'Change Request Approval Required: {change_id}',
                Message=message
            )
        
        print(f"Approval request sent to {len(approvers)} approvers")
    
    def _approve_change(self, change_id):
        """Approve change and schedule execution"""
        
        # Update status
        self.dynamodb.update_item(
            TableName='ChangeRequests',
            Key={'ChangeId': {'S': change_id}},
            UpdateExpression='SET #status = :approved, ApprovedDate = :date',
            ExpressionAttributeNames={'#status': 'Status'},
            ExpressionAttributeValues={
                ':approved': {'S': 'Approved'},
                ':date': {'S': datetime.now().isoformat()}
            }
        )
        
        print(f"Change {change_id} approved")
        
        # Schedule execution during next maintenance window
        self._schedule_change_execution(change_id)
    
    def _schedule_change_execution(self, change_id):
        """Schedule change execution"""
        
        # Get change details
        response = self.dynamodb.get_item(
            TableName='ChangeRequests',
            Key={'ChangeId': {'S': change_id}}
        )
        
        # Create Systems Manager Automation execution
        # Scheduled for next maintenance window
        
        print(f"Change {change_id} scheduled for next maintenance window")
    
    def check_change_calendar(self, calendar_name='production-changes'):
        """Check if changes are allowed now"""
        
        try:
            response = self.ssm.get_calendar_state(
                CalendarNames=[calendar_name]
            )
            
            state = response['State']  # OPEN or CLOSED
            
            if state == 'OPEN':
                print("✓ Changes allowed (calendar is OPEN)")
                return True
            else:
                next_transition = response.get('NextTransitionTime')
                print(f"✗ Changes blocked (calendar is CLOSED)")
                print(f"  Next transition: {next_transition}")
                return False
        
        except Exception as e:
            print(f"Error checking calendar: {e}")
            return False

# Usage
change_mgmt = ChangeManagement()

# Create change request
change_id = change_mgmt.create_change_request(
    title='Deploy application update v2.1.5',
    description='Update application to version 2.1.5 with security fixes',
    risk_level='Medium',
    target_instances=['i-1234567890abcdef0', 'i-0987654321fedcba0']
)

# Check if changes allowed
if change_mgmt.check_change_calendar():
    print("Proceeding with change...")
else:
    print("Change blocked by calendar")
```
### Optimisation des coûts

**Gestion des coûts du gestionnaire de systèmes :**
```
Systems Manager Pricing:

Free Tier:
- Systems Manager core features: Free
- Session Manager: Free
- Run Command: Free
- State Manager: Free
- Patch Manager: Free
- Parameter Store (Standard): Free (10,000 parameters)

Paid Features:
- Parameter Store (Advanced): $0.05 per parameter/month
- On-premises instance management: $5 per instance/month
- Session Manager session recording: S3 storage costs
- Automation executions: $0.002 per step (after free tier)

Typical Costs:

Small Fleet (100 EC2 instances):
- Parameter Store (Standard): Free
- Session Manager: Free
- Run Command: Free
- S3 logs: $2-5/month
- Total: $2-5/month

Large Fleet (1,000 EC2 instances + 100 on-premises):
- On-premises: 100 × $5 = $500/month
- Parameter Store (Advanced, 500 params): 500 × $0.05 = $25/month
- S3 logs: $50/month
- Total: $575/month

Cost Optimization Strategies:

1. Use Standard Parameter Store:
   Problem: Advanced tier for all parameters
   Cost: 10,000 × $0.05 = $500/month
   
   Solution: Use Standard for most, Advanced only for policies
   Cost: Free + (100 × $0.05) = $5/month
   Savings: $495/month (99%)

2. Session Manager vs Bastion Hosts:
   Bastion costs:
   - 1 t3.micro bastion: $7.50/month
   - Elastic IP: $3.60/month
   - Data transfer: $10/month
   - Total: $21/month per region
   
   Session Manager: Free
   Savings: $21/month per region

3. Automate Patch Management:
   Manual patching costs:
   - Engineer time: 20 hours/month × $100/hour = $2,000
   - Systems Manager automated: Free
   - Savings: $2,000/month (100%)

4. Run Command vs Lambda:
   Lambda executing commands on EC2:
   - 100,000 invocations × $0.20 = $20/month
   
   Run Command: Free
   Savings: $20/month

5. Parameter Store vs Secrets Manager:
   Non-rotating secrets:
   - Secrets Manager: 100 × $0.40 = $40/month
   - Parameter Store: Free
   Savings: $40/month

Total Monthly Savings Example:
- Parameter Store optimization: $495
- No bastion hosts: $63 (3 regions)
- Automated patching: $2,000
- Run Command vs Lambda: $20
- Parameter Store vs Secrets Manager: $40
Total: $2,618/month savings

Annual savings: $31,416

ROI:
Systems Manager implementation: ~$10,000 (initial setup)
Annual savings: $31,416
ROI: 214% first year
```
## Conseils \& Bonnes pratiques

### Bonnes pratiques du gestionnaire de sessions

**Astuce 1 : Activez l'enregistrement de session pour des raisons de conformité**
Enregistrez toutes les sessions sur S3 avec le cryptage KMS : piste d'audit complète de toutes les commandes exécutées.

**Astuce 2 : Utilisez les stratégies IAM pour le contrôle d'accès**
Le contrôle d'accès basé sur des balises restreint les instances auxquelles les utilisateurs peuvent accéder (principe du moindre privilège).

**Astuce 3 : Définir le délai d'expiration de la session inactive**
Terminez automatiquement les sessions inactives après 20 minutes : évite que les sessions oubliées ne consomment des ressources.

**Astuce 4 : Utilisez la redirection de port pour accéder à la base de données**
Éliminez les hôtes bastions grâce à la redirection de port via Session Manager : une architecture plus simple et plus sécurisée.

**Astuce 5 : Intégrez CloudWatch Logs**
Envoyez des journaux de session à CloudWatch pour une surveillance et des alertes en temps réel : détectez immédiatement les commandes suspectes.

### Meilleures pratiques du magasin de paramètres

**Astuce 6 : Utilisez la convention de dénomination hiérarchique**
Organisez les paramètres par « /application/environment/component/parameter » : il est facile de récupérer toutes les configurations de l'environnement.

**Astuce 7 : utilisez SecureString pour toutes les données sensibles**
Chiffrez les mots de passe, les clés API et les jetons avec KMS : décryptage automatique une fois récupérés avec les autorisations appropriées.

**Astuce 8 : Paramètres de cache dans les applications**
Un TTL de 5 minutes réduit les appels d'API de 99 %, ce qui réduit les coûts et améliore les performances.

**Astuce 9 : Paramètres de version pour la restauration**
Parameter Store conserve l'historique des versions : retour aux valeurs précédentes si la mise à jour provoque des problèmes.

**Astuce 10 : Paramètres de balise pour l'organisation**
Balise avec application, environnement, propriétaire : permet le suivi des coûts et le contrôle d'accès par balises.

### Meilleures pratiques de gestion des correctifs

**Astuce 11 : Utilisez différentes lignes de base par environnement**
Le développement obtient tous les correctifs immédiatement, la production devient critique seulement après les tests – des correctifs adaptés aux risques.

**Astuce 12 : Testez d'abord les correctifs en cours de développement**
Le délai d'approbation de 7 jours permet de tester en développement avant l'approbation automatique pour la production et d'éviter les pannes liées aux correctifs.

**Astuce 13 : Planifiez des fenêtres de maintenance en cas de faible trafic**
Le dimanche, entre 2 heures du matin et 6 heures du matin, le trafic est généralement le plus faible : minimisez l'impact sur les utilisateurs lors de l'application des correctifs et des redémarrages.

**Astuce 14 : Utilisez les contrôles de concurrence**
Appliquez des correctifs simultanés à 50 % de la flotte : maintenez la disponibilité pendant le processus d'application des correctifs.

**Astuce 15 : Surveillez en permanence la conformité des correctifs**
Les contrôles de conformité quotidiens identifient rapidement les correctifs manquants, ce qui permet une correction plus rapide des vulnérabilités de sécurité.

## Pièges \& Remèdes

### Piège 1 : l'agent SSM ne fonctionne pas ou est obsolète

**Problème :** Les instances n'apparaissent pas dans la console Systems Manager, les commandes échouent, Session Manager n'est pas disponible.

**Pourquoi cela arrive :**

- L'agent SSM n'est pas installé sur les AMI personnalisées
- L'agent s'est arrêté ou s'est écrasé
- Version de l'agent obsolète avec des bugs
- Profil d'instance IAM incorrect
- Problèmes de connectivité réseau (pas de points de terminaison Internet ou VPC)

**Impact :**

- Impossible de gérer les instances à distance
- Accès SSH manuel requis (défaite l'objectif)
- Conformité des correctifs inconnue
- L'automatisation échoue
- Lacune de sécurité dans la gestion de flotte

**Exemple :**
```
Scenario: 100 new EC2 instances launched from custom AMI
Issue: None appear in Systems Manager after 30 minutes
Investigation: SSM Agent not included in custom AMI
Result: Cannot manage instances, must SSH to each manually
Impact: Delayed patching, inconsistent configuration, manual work
```
**Remède :**

**Étape 1 : Vérifier l'installation de l'agent SSM**
```bash
# On Amazon Linux 2 (pre-installed)
sudo systemctl status amazon-ssm-agent

# If not installed
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent

# On Ubuntu
sudo snap install amazon-ssm-agent --classic
sudo snap start amazon-ssm-agent

# On Windows (PowerShell)
Get-Service AmazonSSMAgent
```
**Étape 2 : Vérifiez le profil de l'instance IAM**
```python
def verify_ssm_prerequisites(instance_id):
    """Verify instance can communicate with Systems Manager"""
    
    ec2 = boto3.client('ec2')
    iam = boto3.client('iam')
    
    # Get instance details
    response = ec2.describe_instances(InstanceIds=[instance_id])
    instance = response['Reservations'][0]['Instances'][0]
    
    print(f"Checking prerequisites for {instance_id}\n")
    
    # Check 1: IAM Instance Profile
    if 'IamInstanceProfile' not in instance:
        print("✗ No IAM instance profile attached")
        print("  Action: Attach instance profile with AmazonSSMManagedInstanceCore policy")
        return False
    
    profile_arn = instance['IamInstanceProfile']['Arn']
    profile_name = profile_arn.split('/')[-1]
    
    print(f"✓ Instance profile attached: {profile_name}")
    
    # Get role from instance profile
    profile = iam.get_instance_profile(InstanceProfileName=profile_name)
    role_name = profile['InstanceProfile']['Roles'][0]['RoleName']
    
    # Check attached policies
    attached_policies = iam.list_attached_role_policies(RoleName=role_name)
    
    has_ssm_policy = False
    for policy in attached_policies['AttachedPolicies']:
        if 'SSMManagedInstanceCore' in policy['PolicyArn']:
            has_ssm_policy = True
            print(f"✓ SSM policy attached: {policy['PolicyName']}")
    
    if not has_ssm_policy:
        print("✗ AmazonSSMManagedInstanceCore policy not attached")
        print("  Action: Attach policy to role")
        return False
    
    # Check 2: Network Connectivity
    subnet_id = instance['SubnetId']
    vpc_id = instance['VpcId']
    
    # Check if public subnet or has NAT Gateway
    route_tables = ec2.describe_route_tables(
        Filters=[
            {'Name': 'association.subnet-id', 'Values': [subnet_id]}
        ]
    )
    
    has_internet_route = False
    has_nat_gateway = False
    
    if route_tables['RouteTables']:
        for route in route_tables['RouteTables'][0]['Routes']:
            if route.get('DestinationCidrBlock') == '0.0.0.0/0':
                if route.get('GatewayId', '').startswith('igw-'):
                    has_internet_route = True
                elif route.get('NatGatewayId'):
                    has_nat_gateway = True
    
    if has_internet_route:
        print("✓ Public subnet (Internet Gateway)")
    elif has_nat_gateway:
        print("✓ Private subnet with NAT Gateway")
    else:
        print("⚠️  Private subnet without internet access")
        print("  Action: Add NAT Gateway or VPC endpoints for Systems Manager")
    
    # Check 3: VPC Endpoints (if private subnet)
    if not has_internet_route and not has_nat_gateway:
        endpoints = ec2.describe_vpc_endpoints(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'service-name', 'Values': [
                    f'com.amazonaws.{ec2.meta.region_name}.ssm',
                    f'com.amazonaws.{ec2.meta.region_name}.ec2messages',
                    f'com.amazonaws.{ec2.meta.region_name}.ssmmessages'
                ]}
            ]
        )
        
        required_endpoints = ['ssm', 'ec2messages', 'ssmmessages']
        existing_endpoints = [e['ServiceName'].split('.')[-1] for e in endpoints['VpcEndpoints']]
        
        for endpoint in required_endpoints:
            if endpoint in existing_endpoints:
                print(f"✓ VPC endpoint exists: {endpoint}")
            else:
                print(f"✗ VPC endpoint missing: {endpoint}")
                print(f"  Action: Create VPC endpoint for {endpoint}")
    
    return True

# Verify prerequisites
verify_ssm_prerequisites('i-1234567890abcdef0')
```
**Étape 3 : Mettre à jour l'agent SSM**
```python
def update_ssm_agent_fleet():
    """Update SSM Agent across entire fleet"""
    
    ssm = boto3.client('ssm')
    
    # Get all managed instances
    instances = ssm.describe_instance_information()['InstanceInformationList']
    
    # Find instances with outdated agent
    current_version = '3.2.0'  # Check AWS for latest version
    outdated = []
    
    for instance in instances:
        agent_version = instance['AgentVersion']
        if agent_version < current_version:
            outdated.append(instance['InstanceId'])
    
    if outdated:
        print(f"Found {len(outdated)} instances with outdated SSM Agent")
        
        # Update SSM Agent using Run Command
        response = ssm.send_command(
            DocumentName='AWS-UpdateSSMAgent',
            InstanceIds=outdated,
            MaxConcurrency='50%',
            MaxErrors='10%',
            Comment='Update SSM Agent to latest version'
        )
        
        command_id = response['Command']['CommandId']
        print(f"Update command sent: {command_id}")
    else:
        print("All instances have current SSM Agent version")

# Update outdated agents
update_ssm_agent_fleet()
```
**Étape 4 : Automatiser l'installation de l'agent dans les AMI**
```bash
# User data for EC2 instances
#!/bin/bash
# Install and configure SSM Agent

# Install SSM Agent (if not pre-installed)
if ! systemctl is-active amazon-ssm-agent; then
    yum install -y amazon-ssm-agent
    systemctl enable amazon-ssm-agent
    systemctl start amazon-ssm-agent
fi

# Verify agent is running
systemctl status amazon-ssm-agent
```
**Prévention :**

- Inclure l'agent SSM dans toutes les AMI personnalisées
- Utiliser les AMI fournies par AWS (agent préinstallé)
- Automatisez les mises à jour des agents tous les trimestres
- Surveiller la santé des agents avec les métriques CloudWatch
- Créer une alerte de règle EventBridge sur les agents arrêtés
- Inclure la vérification SSM dans le processus de lancement de l'instance

***

### Piège 2 : Conflits de synchronisation de la fenêtre de maintenance

**Problème :** Conflits de planification des fenêtres de maintenance, instances corrigées pendant les heures de bureau, durée de fenêtre insuffisante.

**Pourquoi cela arrive :**

- Plusieurs fenêtres de maintenance qui se chevauchent
- Confusion des fuseaux horaires (UTC vs local)
- Durée de mise à jour sous-estimée
- Aucune coordination entre les équipes
- Changer de calendrier non configuré

**Impact :**

- Patching de production pendant les heures ouvrables
- Pannes face aux utilisateurs
- Échec des correctifs en raison d'un délai d'attente
- Réclamations clients
- Perte de revenus

**Exemple :**
```
Maintenance Window: Scheduled for "Sunday 2 AM"
Assumption: 2 AM local time (PST)
Actual: 2 AM UTC = 6 PM PST Saturday
Result: Production patching during peak shopping hours
Impact: Website slow during Black Friday traffic
Revenue loss: $500,000 due to performance degradation
```
**Remède :**

**Étape 1 : Utilisez toujours UTC et documentez clairement**
```python
def create_maintenance_window_with_clear_timing():
    """Create maintenance window with explicit UTC timing"""
    
    ssm = boto3.client('ssm')
    
    # Document desired local time
    local_time = "Sunday 2 AM PST"
    utc_time = "Sunday 10 AM UTC"  # 2 AM PST + 8 hours
    cron_expression = "cron(0 10 ? * SUN *)"
    
    response = ssm.create_maintenance_window(
        Name='Production-Patching-Sunday-2AM-PST',
        Description=f'Production patching: {local_time} ({utc_time})',
        Schedule=cron_expression,
        ScheduleTimezone='America/Los_Angeles',  # Automatic DST handling
        Duration=4,
        Cutoff=1,
        AllowUnassociatedTargets=False,
        Tags=[
            {'Key': 'LocalTime', 'Value': local_time},
            {'Key': 'UTCTime', 'Value': utc_time}
        ]
    )
    
    window_id = response['WindowId']
    
    print(f"Created maintenance window: {window_id}")
    print(f"Local time: {local_time}")
    print(f"UTC time: {utc_time}")
    print(f"Cron: {cron_expression}")
    
    return window_id

# Create with explicit timezone
window_id = create_maintenance_window_with_clear_timing()
```
**Étape 2 : Valider le calendrier de la fenêtre de maintenance**
```python
def validate_maintenance_window_timing(window_id):
    """Validate maintenance window doesn't conflict with business hours"""
    
    ssm = boto3.client('ssm')
    
    # Get maintenance window details
    response = ssm.get_maintenance_window(WindowId=window_id)
    
    schedule = response['Schedule']
    timezone = response.get('ScheduleTimezone', 'UTC')
    duration = response['Duration']
    
    print(f"Maintenance Window: {response['Name']}")
    print(f"Schedule: {schedule}")
    print(f"Timezone: {timezone}")
    print(f"Duration: {duration} hours")
    
    # Parse cron and calculate next execution
    # Check if conflicts with business hours (9 AM - 5 PM local)
    
    # Get next 5 scheduled runs
    from croniter import croniter
    from datetime import datetime
    import pytz
    
    base = datetime.now(pytz.timezone(timezone))
    cron = croniter(schedule.replace('cron(', '').replace(')', ''), base)
    
    print(f"\nNext 5 scheduled runs ({timezone}):")
    
    for i in range(5):
        next_run = cron.get_next(datetime)
        end_time = next_run + timedelta(hours=duration)
        
        # Check if during business hours (9 AM - 5 PM)
        if 9 <= next_run.hour < 17:
            print(f"  ⚠️  {next_run.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%H:%M')} (BUSINESS HOURS)")
        else:
            print(f"  ✓ {next_run.strftime('%Y-%m-%d %H:%M')} - {end_time.strftime('%H:%M')}")

# Validate timing
validate_maintenance_window_timing(window_id)
```
**Étape 3 : Mettre en œuvre le calendrier des modifications**
```python
def create_change_calendar_for_protection():
    """Create change calendar to block changes during critical periods"""
    
    ssm = boto3.client('ssm')
    
    # Create DEFAULT_CLOSED calendar (changes blocked by default)
    calendar_content = """
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AWS//Systems Manager//EN
BEGIN:VEVENT
DTSTART:20250119T100000Z
DTEND:20250119T140000Z
RRULE:FREQ=WEEKLY;BYDAY=SU
SUMMARY:Sunday Maintenance Window
DESCRIPTION:Allowed maintenance window: Sundays 2-6 AM PST (10 AM - 2 PM UTC)
END:VEVENT
END:VCALENDAR
"""
    
    # Create document for calendar
    response = ssm.create_document(
        Content=calendar_content,
        Name='Production-Change-Calendar',
        DocumentType='ChangeCalendar',
        DocumentFormat='TEXT'
    )
    
    print("Created change calendar")
    print("  Type: DEFAULT_CLOSED")
    print("  Allowed windows: Sundays 2-6 AM PST only")
    
    return response['DocumentDescription']['Name']

# Create calendar
calendar_name = create_change_calendar_for_protection()

# Associate with maintenance window
ssm.update_maintenance_window(
    WindowId=window_id,
    ScheduleCalendar=calendar_name
)

print(f"Associated maintenance window with change calendar")
```
**Étape 4 : Surveiller l'exécution de la fenêtre**
```python
def monitor_maintenance_window_executions(window_id):
    """Monitor recent maintenance window executions"""
    
    ssm = boto3.client('ssm')
    
    # Get recent executions
    response = ssm.describe_maintenance_window_executions(
        WindowId=window_id,
        MaxResults=10
    )
    
    print("Recent maintenance window executions:\n")
    
    for execution in response['WindowExecutions']:
        execution_id = execution['WindowExecutionId']
        status = execution['Status']
        start_time = execution['StartTime']
        end_time = execution.get('EndTime')
        
        duration = (end_time - start_time).total_seconds() / 60 if end_time else None
        
        print(f"Execution: {execution_id}")
        print(f"  Status: {status}")
        print(f"  Start: {start_time}")
        print(f"  Duration: {duration:.1f} minutes" if duration else "  Duration: In progress")
        
        if status == 'FAILED':
            print(f"  ⚠️  FAILED - investigate logs")
        
        print()

# Monitor executions
monitor_maintenance_window_executions(window_id)
```
**Prévention :**

- Spécifiez toujours le fuseau horaire explicitement
- Utiliser le paramètre ScheduleTimezone (gère automatiquement l'heure d'été)
- Documenter l'équivalent en heure locale dans la description
- Mettre en place un calendrier de changement pour les périodes critiques
- Testez d'abord le timing de la fenêtre de développement
- Revue du calendrier avec les parties prenantes
- Mettre en place la surveillance des exécutions de fenêtres
- Allouer 2 fois le temps estimé pour la durée des correctifs

***

## Résumé du chapitre

AWS Systems Manager fournit une gestion opérationnelle unifiée pour AWS et l'infrastructure sur site grâce à un accès shell sécurisé sans clés SSH (Session Manager), un stockage de configuration centralisé (Parameter Store), l'exécution de commandes de flotte (Run Command), des correctifs automatisés (Patch Manager), la conformité de la configuration (State Manager), l'orchestration des flux de travail (Automation) et la gestion des incidents opérationnels (OpsCenter). Ces fonctionnalités éliminent les défis traditionnels de la gestion informatique (distribution des clés SSH, accès manuel au serveur, configurations incohérentes, correctifs retardés) et transforment les opérations de processus manuels sujets aux erreurs en flux de travail automatisés et gouvernés.

**Principaux points à retenir :**

- **Utilisez Session Manager au lieu de SSH :** Accès basé sur un navigateur sans clés SSH, hôtes bastions ou ports entrants ouverts ; piste d'audit complète CloudTrail ; Autorisations basées sur IAM
- **Organiser les paramètres de manière hiérarchique :** La structure `/application/environment/component/parameter` permet une récupération facile, des autorisations basées sur des balises et une propriété claire
- **Automatiser les correctifs avec les fenêtres de maintenance :** Les correctifs programmés hebdomadairement réduisent la fenêtre de vulnérabilité de 38 jours à 7 jours ; les contrôles de concurrence maintiennent la disponibilité
- **Test en développement, déploiement en production :** un délai d'approbation de 7 jours permet de tester les correctifs avant la production ; différentes lignes de base par environnement (développement agressif, production conservatrice)
- **Implémenter le calendrier des modifications :** Le calendrier DEFAULT_CLOSED bloque les modifications, sauf les fenêtres approuvées ; évite les changements accidentels de production pendant les heures de bureau
- **Cache les paramètres de manière agressive :** Une durée de vie de 5 minutes réduit les appels d'API Parameter Store de 99 % ; améliore les performances des applications et réduit les coûts
- **Utilisez Run Command pour la gestion de flotte :** Exécutez des commandes sur des milliers d'instances simultanément ; la concurrence et les contrôles d'erreur évitent de surcharger les cibles

Systems Manager s'intègre dans AWS : Parameter Store stocke les informations d'identification de la base de données, Session Manager fournit un accès d'urgence, Patch Manager met à jour les instances surveillées par CloudWatch, Run Command exécute la correction à partir des résultats de Security Hub et Automation orchestre des flux de travail opérationnels en plusieurs étapes. Ensemble, ces fonctionnalités permettent de gérer des flottes de milliers d'instances avec un minimum d'effort manuel, des pistes d'audit complètes et une conformité automatisée.

## Exercice pratique en laboratoire

**Objectif :** Créer un système complet de gestion de flotte avec un accès sécurisé, des correctifs automatisés et une configuration basée sur des paramètres.

**Scénario :** Flotte d'applications Web nécessitant un accès sécurisé, des correctifs hebdomadaires et une configuration spécifique à l'environnement.

**Prérequis :**

- Compte AWS avec plus de 5 instances EC2
- Autorisations IAM pour Systems Manager

**Étapes :**

1. **Configurer le gestionnaire de sessions (30 minutes)**
    - Créer un rôle IAM avec les autorisations SSM
    - Attacher un rôle aux instances EC2
    - Vérifier l'exécution de l'agent SSM
    - Configurer la journalisation de session (S3 + CloudWatch)
    - Démarrer une session basée sur un navigateur
    - Test de la redirection de port vers RDS
2. **Organiser la configuration de l'application (25 minutes)**
    - Créer une hiérarchie de paramètres (`/myapp/prod/...`)
    - Point de terminaison de la base de données du magasin, clés API (SecureString)
    - Créer des drapeaux de fonctionnalités
    - Implémenter la mise en cache des paramètres dans l'application
    - Récupération des paramètres de test
3. **Configurer l'application de correctifs automatisés (45 minutes)**
    - Créer une référence de correctif (critique + important uniquement)
    - Marquer les instances avec le groupe de correctifs
    - Créer une fenêtre de maintenance (dimanche 2 heures du matin PST)
    - Enregistrer la tâche de correctif avec des contrôles de concurrence
    - Exécuter une analyse manuelle des correctifs
    - Examiner le rapport de conformité
4. **Exécution du commandement de la flotte (20 minutes)**
    - Utilisez Run Command pour mettre à jour toutes les instances
    - Suivre la progression de l'exécution
    - Examiner le résultat de la commande dans CloudWatch
    - Gérer les échecs d'exécution
5. **Mettre en œuvre le calendrier des changements (15 minutes)**
    - Créer un calendrier DEFAULT_CLOSED
    - Définir les fenêtres de maintenance approuvées
    - Associer à la fenêtre de maintenance
    - Testez le blocage du calendrier en dehors de Windows

**Résultats attendus :**

- Accès sécurisé au shell sans clés SSH ni hôtes bastions
- Configuration centralisée des applications
- Correctifs hebdomadaires automatisés avec une conformité de plus de 95 %
- Possibilité d'exécuter instantanément des commandes sur toute la flotte
- Gouvernance du processus de gestion du changement
- Coût total : <\$10/mois (Parameter Store + logs)


## Questions de révision

1. **Que faut-il pour qu'une instance soit gérée par Systems Manager ?**
a) Adresse IP publique
b) Clé SSH configurée
c) Agent SSM installé et rôle IAM attaché ✓
d) Agent CloudWatch installé

**Réponse : C** - Agent SSM + profil d'instance IAM avec stratégie AmazonSSMManagedInstanceCore requise

2. **De quoi Session Manager élimine-t-il le besoin ?**
a) Rôles IAM
b) Clés SSH et hôtes bastions ✓
c) Groupes de sécurité
d) VPC

**Réponse : B** – Session Manager fournit un accès sécurisé sans clés SSH, bastions ou ports entrants ouverts.

3. **Quelle est la taille maximale des paramètres du magasin de paramètres standard ?**
a) 1 Ko
b) 4 Ko ✓
c) 8 Ko
d) 64 Ko

**Réponse : B** - Niveau standard : 4 Ko maximum ; Niveau avancé : 8 Ko maximum

4. **Quel type doit être utilisé pour stocker les mots de passe dans Parameter Store ?**
a) Chaîne
b) Liste de chaînes
c) Chaîne sécurisée ✓
d) Binaire

**Réponse : C** - SecureString crypte les valeurs avec KMS ; décryptage automatique à la récupération

5. **Qu'est-ce que ApproveAfterDays dans les références de correctifs ?**
a) Jours avant l'expiration du patch
b) Délai avant l'approbation automatique des correctifs ✓
c) Jours d'installation après approbation
d) Durée des tests de patch

**Réponse : B** - ApproveAfterDays retarde l'approbation automatique, permettant ainsi les tests en cours de développement en premier

6. **À quoi sert le paramètre Cutoff de la fenêtre de maintenance ?**
a) Durée maximale
b) Arrêtez les nouvelles tâches avant la fin de la fenêtre ✓
c) Nombre de cas
d) Limite du nombre de correctifs

**Réponse : B** – La coupure (1 heure typique) arrête les nouvelles tâches avant la fin de la fenêtre, garantissant ainsi leur achèvement.

7. **Que signifie le calendrier des modifications DEFAULT_CLOSED ?**
a) Le calendrier est désactivé
b) Modifications bloquées sauf fenêtres spécifiées ✓
c) Les modifications sont toujours autorisées
d) Approbation manuelle requise

**Réponse : B** - DEFAULT_CLOSED bloque les modifications par défaut ; autorise uniquement pendant les fenêtres explicitement définies

8. **Qu'est-ce que MaxConcurrency dans Run Command ?**
a) Nombre maximal d'instances totales
b) Instances s'exécutant simultanément ✓
c) Nombre maximal de tentatives
d) Expiration du délai de commande

**Réponse : B** - MaxConcurrency contrôle le nombre d'instances qui exécutent la commande simultanément (en absolu ou en pourcentage)

9. **Qu'est-ce qui est inclus gratuitement dans Systems Manager ?**
a) Magasin de paramètres avancés uniquement
b) Gestion des instances sur site
c) Gestionnaire de session et commande d'exécution ✓
d) Intégrations tierces

**Réponse : C** - Les fonctionnalités de Core Systems Manager (Session Manager, Run Command, State Manager, Patch Manager) sont gratuites

10. **Qu'est-ce qu'OpsCenter regroupe ?**
a) Uniquement les alarmes CloudWatch
b) Problèmes liés à plusieurs services AWS ✓
c) Uniquement les incidents manuels
d) Modifications du magasin de paramètres

**Réponse : B** - OpsCenter regroupe les problèmes opérationnels liés à CloudWatch, EventBridge, Config et à la création manuelle

***
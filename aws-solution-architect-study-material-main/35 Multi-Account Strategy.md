# Chapter 35: Multi-Account Strategy

## Introduction

Single AWS accounts—where all resources, environments, and teams share one account—create security risks, blast radius concerns, and operational chaos that cripple enterprise cloud adoption. A financial services company running development, testing, and production in one account experiences developer accidentally deleting production database during testing, security team unable to enforce different compliance controls per environment, finance unable to attribute costs to business units, and malicious insider potentially accessing all company data. When development team needs EC2 permissions, they get access to production databases; when security incident occurs in one application, entire company infrastructure potentially compromised. AWS multi-account strategy—segregating workloads, environments, and teams across purpose-built AWS accounts managed centrally through AWS Organizations—provides security isolation, blast radius containment, independent billing, and governance at scale enabling enterprises to safely operate hundreds of AWS accounts.

The business impact of poor account strategy extends beyond security to operational efficiency and cost management. Organizations operating single accounts face regulatory compliance challenges from inability to prove data isolation, audit nightmares from commingled logs and activities, cost allocation impossibility preventing chargeback to business units, and service quota limitations hitting account maximums. Developer accidentally terminates production EC2 instances costs \$500K in downtime; security breach in development environment exposes production customer data resulting in \$5M regulatory fines; inability to track costs per business unit prevents identifying wasteful spending. AWS Organizations with Control Tower provides enterprise account factory—automated account provisioning with guardrails, centralized billing showing per-account costs, Service Control Policies preventing dangerous actions, and CloudTrail audit logs across all accounts—enabling Fortune 500 companies to operate 500+ accounts with governance, security, and cost visibility.

This chapter synthesizes AWS services throughout handbook—IAM for cross-account access, CloudFormation for account baselines, CloudTrail for centralized logging, Config for compliance automation, and Cost Explorer for consolidated billing. The chapter covers AWS Organizations structure, Control Tower landing zones, account vending automation, Service Control Policies, cross-account IAM patterns, consolidated billing strategies, compliance automation with Config, and building production multi-account environments where security isolation, operational efficiency, and governance scale to thousands of AWS accounts supporting global enterprises.

## Theory \& Concepts

### AWS Organizations Fundamentals

**Hierarchical Account Management:**

```
AWS Organizations Definition:
Service for centrally managing multiple AWS accounts
Hierarchical account structure (Organizational Units)
Centralized billing and governance

Single Account (Anti-Pattern):
┌─────────────────────────────────────────────┐
│         AWS Account: 123456789012           │
│                                             │
│  Dev Environment                            │
│  Test Environment                           │
│  Prod Environment                           │
│                                             │
│  Team A resources                           │
│  Team B resources                           │
│  Team C resources                           │
│                                             │
│  All users, all permissions, all data       │
└─────────────────────────────────────────────┘

Problems:
✗ No security isolation (dev can access prod)
✗ Blast radius = entire company
✗ Single set of service quotas
✗ Cannot enforce different compliance per environment
✗ Cost allocation impossible
✗ Single point of compromise

Multi-Account (Best Practice):
Root (Management Account)
├── Organizational Unit: Core
│   ├── Security Account (CloudTrail, GuardDuty central)
│   ├── Log Archive Account (centralized logs)
│   └── Shared Services Account (AD, DNS, monitoring)
│
├── Organizational Unit: Production
│   ├── Prod-Application-A
│   ├── Prod-Application-B
│   └── Prod-Database
│
├── Organizational Unit: Non-Production
│   ├── Dev-Application-A
│   ├── Test-Application-A
│   └── Staging-Application-A
│
└── Organizational Unit: Sandbox
    ├── TeamA-Sandbox
    └── TeamB-Sandbox

Benefits:
✓ Security isolation (prod credentials can't access dev)
✓ Blast radius contained (mistake in dev doesn't affect prod)
✓ Independent service quotas per account
✓ Different compliance controls per environment
✓ Clear cost allocation (per account billing)
✓ Account compromise doesn't expose all data

Organizations Features:

1. CONSOLIDATED BILLING:
   - Single bill for all accounts
   - Volume discounts applied across accounts
   - Reserved Instance sharing
   - Savings Plans sharing

   Example:
   Account A: 10 EC2 instances, no RIs
   Account B: 5 EC2 instances, 15 RIs
   
   Result: Account A gets RI pricing from Account B's unused RIs
   (automatic RI sharing across organization)

2. SERVICE CONTROL POLICIES (SCPs):
   - Permission boundaries for accounts/OUs
   - What accounts CAN'T do (deny rules)
   - Enforced even on account root user
   
   Example SCP: Deny all outside us-east-1
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Deny",
       "Action": "*",
       "Resource": "*",
       "Condition": {
         "StringNotEquals": {
           "aws:RequestedRegion": "us-east-1"
         }
       }
     }]
   }
   
   Result: No resources can be created outside us-east-1
   (even with full admin permissions)

3. CENTRALIZED CLOUDTRAIL:
   - Organization trail logs all accounts
   - Single S3 bucket for all account logs
   - Immutable audit trail
   
4. TAG POLICIES:
   - Enforce consistent tagging
   - Define required tags
   - Validate tag values
   
5. AI SERVICES OPT-OUT POLICIES:
   - Control AI service data usage
   - Opt out of content usage for training

Organizations Structure Best Practices:

ROOT (Management Account):
- Minimal resources (Organizations, billing only)
- No application workloads
- Tightly controlled access
- Break-glass access only

CORE OU:
Security Account:
- GuardDuty master
- Security Hub aggregator  
- Config aggregator
- IAM Access Analyzer
- Security automation

Log Archive Account:
- Centralized CloudTrail logs
- VPC Flow Logs
- Config snapshots
- Read-only, long-term retention
- S3 Object Lock for compliance

Shared Services Account:
- Active Directory
- DNS (Route 53)
- Centralized monitoring
- Backup vaults
- Transit Gateway

WORKLOAD OUs:
Organize by environment and/or business unit

By Environment:
Production OU
├── App1-Prod
├── App2-Prod
└── DataWarehouse-Prod

Non-Production OU
├── App1-Dev
├── App1-Test
└── App1-Stage

By Business Unit:
Marketing OU
├── Marketing-Prod
└── Marketing-Dev

Sales OU
├── Sales-Prod
└── Sales-Dev

Hybrid (Recommended):
Production OU
├── Marketing OU
│   ├── Marketing-CRM-Prod
│   └── Marketing-Analytics-Prod
└── Sales OU
    └── Sales-Portal-Prod

Non-Production OU
├── Marketing OU
│   ├── Marketing-CRM-Dev
│   └── Marketing-Analytics-Test
└── Sales OU
    └── Sales-Portal-Dev

Account Naming Convention:

Format: [Environment]-[BusinessUnit]-[Application]-[Region]
Examples:
- prod-marketing-crm-useast1
- dev-engineering-api-uswest2
- sandbox-datascience-experiments

Benefits:
+ Immediately understand account purpose
+ Easy to find right account
+ Supports automation
+ Enables cost allocation

Account Limits:

- Default: 4 accounts per organization
- Soft limit: Can request increase to 1000+
- Enterprise customers: 3000+ accounts common
- No cost for accounts (only resources within)

When to Create New Account:

✓ Different security requirements (PCI vs non-PCI)
✓ Different compliance scope (HIPAA, SOX)
✓ Strong isolation needed (external contractors)
✓ Independent cost center (chargeback)
✓ Different operational teams
✓ Blast radius containment

When to Use Single Account:

✓ Very small organization (< 5 engineers)
✓ Single application
✓ Early startup (optimize for speed)
✓ POC/Learning
```


### AWS Control Tower

**Automated Landing Zone Setup:**

```
AWS Control Tower Definition:
Service to set up and govern multi-account AWS environment
Automated best-practice landing zone
Built on Organizations, CloudFormation, Service Catalog

Landing Zone Components:

1. ORGANIZATIONAL STRUCTURE:
   Root
   ├── Security OU
   │   ├── Audit Account (read-only audit access)
   │   └── Log Archive Account (centralized logs)
   └── Sandbox OU (for experimentation)

   Additional OUs created as needed

2. GUARDRAILS (PREVENTIVE & DETECTIVE):
   
   Mandatory Guardrails (always enabled):
   - Disallow changes to CloudTrail
   - Disallow changes to Config
   - Disallow deletion of Log Archive data
   - Enable CloudTrail in all accounts
   - Enable Config in all accounts
   
   Strongly Recommended:
   - Disallow public read on S3 buckets
   - Disallow public write on S3 buckets
   - Disallow root user access keys
   - Enable MFA for root user
   - Detect unencrypted EBS volumes
   
   Elective (enable as needed):
   - Disallow internet connection through RDP
   - Disallow unrestricted SSH access
   - Disallow EC2 instances without VPC

3. ACCOUNT FACTORY:
   - Automated account provisioning
   - Service Catalog product
   - Applies baseline configuration
   - Creates standard IAM roles
   - Enrolls in Organization

4. DASHBOARD:
   - Compliance status across accounts
   - Guardrail violations
   - Account drift detection
   - Organization activity

Guardrail Types:

PREVENTIVE (SCPs):
Prevent actions from happening
Example: Disallow public S3 buckets

{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": [
      "s3:PutBucketPublicAccessBlock"
    ],
    "Resource": "*"
  }]
}

Result: Cannot make S3 buckets public
(action blocked before it happens)

DETECTIVE (Config Rules):
Detect non-compliant resources after creation
Example: Detect unencrypted EBS volumes

Config Rule: encrypted-volumes
- Triggers: When EBS volume created
- Evaluates: Volume.Encrypted == true
- Result: COMPLIANT or NON_COMPLIANT

Result: Creates finding if unencrypted volume exists
(alerts to non-compliance, doesn't prevent)

PROACTIVE (CloudFormation Hooks):
Check resources before creation
Example: Check S3 bucket encryption in CloudFormation

Result: CloudFormation stack fails if non-compliant
(prevents deployment of non-compliant resources)

Account Factory Workflow:

User requests new account:
1. Submit Service Catalog product form
   - Account name
   - Account email (must be unique)
   - Organizational Unit
   - VPC configuration

2. Control Tower provisions account:
   - Creates AWS account
   - Sends invite to organization
   - Creates baseline roles:
     * AWSControlTowerExecution (admin access for Control Tower)
     * AWSControlTowerStackSetRole (CloudFormation StackSets)
   - Enrolls in CloudTrail
   - Enrolls in Config
   - Applies guardrails from OU

3. Baseline configuration (CloudFormation):
   - Default VPC (optional)
   - CloudWatch Logs
   - SNS topics
   - KMS keys

4. Account ready (15-30 minutes)
   - User notified
   - Account appears in dashboard
   - Compliance monitoring active

Customizing Account Factory:

Account Factory Customization (AFC):
Extend baseline with organization-specific resources

Example: Add company-standard resources
- VPN connection to on-premises
- Active Directory join
- Specific security groups
- Monitoring dashboards
- Cost allocation tags

Implementation:
1. Create CloudFormation template
2. Add to Service Catalog
3. Link to Account Factory
4. Automatically deployed to new accounts

Account Vending Machine Pattern:

Fully automated account creation:

API Call → Lambda → Account Factory
          ↓
    New Account Ready
          ↓
    Jira ticket updated
    Email notification
    Confluence docs generated

Use Cases:
- Self-service for teams
- CI/CD account per pipeline
- Customer-specific accounts (multi-tenant SaaS)
- Temporary accounts (training, demos)

Example Lambda:
def create_account(event):
    """Automated account provisioning"""
    
    servicecatalog = boto3.client('servicecatalog')
    
    # Provision Account Factory product
    response = servicecatalog.provision_product(
        ProductId='prod-abc123',  # Account Factory product
        ProvisioningArtifactId='pa-xyz789',
        ProvisionedProductName=f"Account-{event['account_name']}",
        ProvisioningParameters=[
            {'Key': 'AccountName', 'Value': event['account_name']},
            {'Key': 'AccountEmail', 'Value': event['email']},
            {'Key': 'ManagedOrganizationalUnit', 'Value': event['ou']},
            {'Key': 'SSOUserEmail', 'Value': event['owner_email']}
        ],
        Tags=[
            {'Key': 'CostCenter', 'Value': event['cost_center']},
            {'Key': 'Owner', 'Value': event['owner']}
        ]
    )
    
    return response['RecordDetail']['ProvisionedProductId']

Control Tower vs Organizations:

Organizations (Foundational):
- Account management
- Billing consolidation
- Basic policies (SCPs)
- Manual setup

Control Tower (Automated):
- Built on Organizations
- Automated setup (landing zone)
- Guardrails (preventive + detective)
- Account Factory
- Compliance dashboard
- Continuous drift detection

When to Use Control Tower:
✓ Enterprise deployments (10+ accounts)
✓ Need governance automation
✓ Compliance requirements
✓ Multiple teams
✓ Self-service account provisioning

When Organizations Alone Sufficient:
✓ Small deployment (< 10 accounts)
✓ Custom governance requirements
✓ Existing account structure
✓ No need for Account Factory

Landing Zone Architecture:

Management Account (Control Tower)
- AWS Organizations
- Control Tower
- Service Catalog (Account Factory)

Security OU
├── Audit Account
│   - Read-only cross-account roles
│   - Security Hub aggregator
│   - GuardDuty master
│
└── Log Archive Account
    - S3 bucket (all CloudTrail logs)
    - S3 Object Lock (immutability)
    - Lifecycle policies (Glacier transition)

Custom OUs (added by organization)
└── Production OU
    ├── Account A
    ├── Account B
    └── Account C

Guardrails applied at OU level
(inherited by all accounts in OU)

Best Practices:

1. Start with Control Tower landing zone
2. Never deploy workloads in management account
3. Use Account Factory for all new accounts
4. Apply guardrails at OU level
5. Monitor compliance dashboard daily
6. Automate account baseline (AFC)
7. Test guardrails in Sandbox OU first
8. Document account request process
9. Implement self-service with approval workflow
10. Regular access reviews for cross-account roles
```


### Service Control Policies (SCPs)

**Organizational Policy Enforcement:**

```
SCP Definition:
JSON policies defining maximum permissions for accounts/OUs
Guardrails (what accounts CAN'T do)
Applied to Organizations hierarchy

How SCPs Work:

Effective Permissions = IAM Permissions ∩ SCP Permissions

Example:
IAM Policy: Allow s3:*
SCP: Deny s3:DeleteBucket

Result: Can do everything with S3 except delete buckets
(SCP acts as permission boundary)

Important: SCPs don't grant permissions
They only restrict permissions granted by IAM

SCP Inheritance:

Root (SCP: AllowAll)
├── Production OU (SCP: DenyDangerousActions)
│   └── Account A (Effective: AllowAll ∩ DenyDangerousActions)
│       User (IAM: AdminAccess)
│       Effective Permissions: AdminAccess ∩ AllowAll ∩ DenyDangerousActions

SCPs at multiple levels are ANDed together

Common SCP Patterns:

1. DENY REGION OUTSIDE APPROVED LIST:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyAllOutsideApprovedRegions",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": [
          "us-east-1",
          "us-west-2",
          "eu-west-1"
        ]
      },
      "ArnNotLike": {
        "aws:PrincipalARN": "arn:aws:iam::*:role/BreakGlassRole"
      }
    }
  }]
}

Purpose: Data residency, compliance, cost control
Exception: BreakGlass role for emergencies

2. REQUIRE MFA:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyAllActionsWithoutMFA",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "BoolIfExists": {
        "aws:MultiFactorAuthPresent": "false"
      }
    }
  }]
}

Purpose: Enforce MFA for all actions
Result: Cannot perform any action without MFA

3. DENY ROOT USER:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyRootUser",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringLike": {
        "aws:PrincipalArn": "arn:aws:iam::*:root"
      }
    }
  }]
}

Purpose: Prevent root user usage
Exception: Specific actions require root (account closure, etc.)

4. DENY LEAVING ORGANIZATION:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyLeavingOrganization",
    "Effect": "Deny",
    "Action": [
      "organizations:LeaveOrganization"
    ],
    "Resource": "*"
  }]
}

Purpose: Prevent accounts from removing themselves
Critical for governance

5. PROTECT CLOUDTRAIL:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyCloudTrailDisable",
    "Effect": "Deny",
    "Action": [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "cloudtrail:UpdateTrail"
    ],
    "Resource": "*",
    "Condition": {
      "ArnNotLike": {
        "aws:PrincipalARN": "arn:aws:iam::*:role/AuditRole"
      }
    }
  }]
}

Purpose: Immutable audit trail
Exception: Designated audit role only

6. DENY PUBLIC S3 BUCKETS:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyPublicS3Buckets",
    "Effect": "Deny",
    "Action": [
      "s3:PutBucketPublicAccessBlock"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "s3:x-amz-acl": "private"
      }
    }
  }]
}

Purpose: Prevent data exposure
Blocks public bucket creation

7. DENY INSTANCE TYPES:

{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyExpensiveInstanceTypes",
    "Effect": "Deny",
    "Action": "ec2:RunInstances",
    "Resource": "arn:aws:ec2:*:*:instance/*",
    "Condition": {
      "StringNotLike": {
        "ec2:InstanceType": [
          "t3.*",
          "t3a.*",
          "m5.*"
        ]
      }
    }
  }]
}

Purpose: Cost control
Limit to approved instance types

SCP Strategy by OU:

Root (Management Account):
- FullAWSAccess (default)
- DenyLeavingOrganization
- ProtectCloudTrail

Production OU:
- Inherit Root SCPs
- DenyPublicS3
- RequireMFA
- DenyRegionsOutsideApproved
- DenyRootUser

Non-Production OU:
- Inherit Root SCPs
- DenyPublicS3
- RequireMFA (optional for dev)
- DenyExpensiveInstances (cost control)

Sandbox OU:
- Inherit Root SCPs
- AllowExperimentation (fewer restrictions)
- AutoShutdownAfterHours (cost control)

Testing SCPs:

CRITICAL: Test SCPs before applying to production

Process:
1. Create Test OU
2. Move test account to Test OU
3. Apply SCP to Test OU
4. Validate expected behavior
5. Test edge cases
6. Apply to production OU

Mistakes with SCPs:

MISTAKE 1: Denying too much
SCP denies all EC2 actions
Result: Cannot launch any instances (including Systems Manager)

MISTAKE 2: Forgetting exceptions
SCP denies all regions
Result: IAM, CloudFront, Route 53 (global services) blocked

MISTAKE 3: Circular dependencies
SCP requires tag to create resource
But cannot create tag without resource
Result: Deadlock

Best Practices:

1. Start permissive, tighten gradually
2. Always have emergency break-glass role
3. Test in non-production first
4. Document SCPs clearly
5. Version control SCP changes (Git)
6. Include exceptions for automation roles
7. Consider service-specific allow lists
8. Regular SCP reviews (quarterly)
9. Monitor CloudTrail for denied actions
10. Use SCP simulator before applying
```

## Hands-On Implementation

### Lab 1: Setting Up AWS Organizations

**Objective:** Create AWS Organizations with hierarchical OU structure and Service Control Policies.

**Step 1: Create Organization**

```python
import boto3
import json
from datetime import datetime

orgs = boto3.client('organizations')
iam = boto3.client('iam')

def create_organization():
    """Create AWS Organization"""
    
    print("=== Creating AWS Organization ===\n")
    
    try:
        # Create organization
        response = orgs.create_organization(
            FeatureSet='ALL'  # Enable all features (SCPs, tag policies, etc.)
        )
        
        org = response['Organization']
        
        print(f"✓ Organization created")
        print(f"  Organization ID: {org['Id']}")
        print(f"  ARN: {org['Arn']}")
        print(f"  Master Account: {org['MasterAccountId']}")
        print(f"  Feature Set: {org['FeatureSet']}")
        
        return org['Id']
    
    except orgs.exceptions.AlreadyInOrganizationException:
        print("Organization already exists")
        response = orgs.describe_organization()
        return response['Organization']['Id']
    
    except Exception as e:
        print(f"Error creating organization: {e}")
        return None

org_id = create_organization()
```

**Step 2: Create Organizational Units**

```python
def create_ou_structure():
    """Create hierarchical OU structure"""
    
    print("\n=== Creating Organizational Units ===\n")
    
    # Get root ID
    roots = orgs.list_roots()
    root_id = roots['Roots'][0]['Id']
    
    print(f"Root ID: {root_id}")
    
    # Create Core OU
    core_ou = orgs.create_organizational_unit(
        ParentId=root_id,
        Name='Core'
    )
    core_ou_id = core_ou['OrganizationalUnit']['Id']
    print(f"\n✓ Created OU: Core ({core_ou_id})")
    
    # Create Production OU
    prod_ou = orgs.create_organizational_unit(
        ParentId=root_id,
        Name='Production'
    )
    prod_ou_id = prod_ou['OrganizationalUnit']['Id']
    print(f"✓ Created OU: Production ({prod_ou_id})")
    
    # Create Non-Production OU
    nonprod_ou = orgs.create_organizational_unit(
        ParentId=root_id,
        Name='Non-Production'
    )
    nonprod_ou_id = nonprod_ou['OrganizationalUnit']['Id']
    print(f"✓ Created OU: Non-Production ({nonprod_ou_id})")
    
    # Create Sandbox OU
    sandbox_ou = orgs.create_organizational_unit(
        ParentId=root_id,
        Name='Sandbox'
    )
    sandbox_ou_id = sandbox_ou['OrganizationalUnit']['Id']
    print(f"✓ Created OU: Sandbox ({sandbox_ou_id})")
    
    # Create nested OUs under Production
    prod_marketing = orgs.create_organizational_unit(
        ParentId=prod_ou_id,
        Name='Marketing'
    )
    print(f"  ✓ Created nested OU: Production/Marketing")
    
    prod_engineering = orgs.create_organizational_unit(
        ParentId=prod_ou_id,
        Name='Engineering'
    )
    print(f"  ✓ Created nested OU: Production/Engineering")
    
    print("\n✓ OU Structure Created:")
    print("  Root")
    print("  ├── Core")
    print("  ├── Production")
    print("  │   ├── Marketing")
    print("  │   └── Engineering")
    print("  ├── Non-Production")
    print("  └── Sandbox")
    
    return {
        'root': root_id,
        'core': core_ou_id,
        'production': prod_ou_id,
        'non_production': nonprod_ou_id,
        'sandbox': sandbox_ou_id,
        'prod_marketing': prod_marketing['OrganizationalUnit']['Id'],
        'prod_engineering': prod_engineering['OrganizationalUnit']['Id']
    }

ou_structure = create_ou_structure()
```

**Step 3: Create and Attach Service Control Policies**

```python
def create_scps(ou_structure):
    """Create and attach Service Control Policies"""
    
    print("\n=== Creating Service Control Policies ===\n")
    
    # SCP 1: Deny leaving organization
    deny_leave_org_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "DenyLeavingOrganization",
            "Effect": "Deny",
            "Action": [
                "organizations:LeaveOrganization"
            ],
            "Resource": "*"
        }]
    }
    
    deny_leave = orgs.create_policy(
        Content=json.dumps(deny_leave_org_policy),
        Description='Prevent accounts from leaving organization',
        Name='DenyLeaveOrganization',
        Type='SERVICE_CONTROL_POLICY'
    )
    
    deny_leave_id = deny_leave['Policy']['PolicySummary']['Id']
    print(f"✓ Created SCP: DenyLeaveOrganization ({deny_leave_id})")
    
    # SCP 2: Require specific regions
    require_regions_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "DenyAllOutsideApprovedRegions",
            "Effect": "Deny",
            "NotAction": [
                "iam:*",
                "organizations:*",
                "route53:*",
                "budgets:*",
                "wafv2:*",
                "cloudfront:*",
                "globalaccelerator:*",
                "importexport:*",
                "support:*",
                "sts:*"
            ],
            "Resource": "*",
            "Condition": {
                "StringNotEquals": {
                    "aws:RequestedRegion": [
                        "us-east-1",
                        "us-west-2",
                        "eu-west-1"
                    ]
                }
            }
        }]
    }
    
    require_regions = orgs.create_policy(
        Content=json.dumps(require_regions_policy),
        Description='Allow only approved AWS regions',
        Name='RequireApprovedRegions',
        Type='SERVICE_CONTROL_POLICY'
    )
    
    require_regions_id = require_regions['Policy']['PolicySummary']['Id']
    print(f"✓ Created SCP: RequireApprovedRegions ({require_regions_id})")
    
    # SCP 3: Deny public S3 buckets
    deny_public_s3_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "DenyPublicS3Buckets",
            "Effect": "Deny",
            "Action": [
                "s3:PutAccountPublicAccessBlock"
            ],
            "Resource": "*",
            "Condition": {
                "StringNotEquals": {
                    "s3:x-amz-acl": [
                        "private",
                        "bucket-owner-full-control"
                    ]
                }
            }
        }]
    }
    
    deny_public_s3 = orgs.create_policy(
        Content=json.dumps(deny_public_s3_policy),
        Description='Prevent public S3 buckets',
        Name='DenyPublicS3',
        Type='SERVICE_CONTROL_POLICY'
    )
    
    deny_public_s3_id = deny_public_s3['Policy']['PolicySummary']['Id']
    print(f"✓ Created SCP: DenyPublicS3 ({deny_public_s3_id})")
    
    # SCP 4: Protect CloudTrail (for Production only)
    protect_cloudtrail_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "ProtectCloudTrail",
            "Effect": "Deny",
            "Action": [
                "cloudtrail:StopLogging",
                "cloudtrail:DeleteTrail",
                "cloudtrail:UpdateTrail"
            ],
            "Resource": "*"
        }]
    }
    
    protect_cloudtrail = orgs.create_policy(
        Content=json.dumps(protect_cloudtrail_policy),
        Description='Protect CloudTrail from modifications',
        Name='ProtectCloudTrail',
        Type='SERVICE_CONTROL_POLICY'
    )
    
    protect_cloudtrail_id = protect_cloudtrail['Policy']['PolicySummary']['Id']
    print(f"✓ Created SCP: ProtectCloudTrail ({protect_cloudtrail_id})")
    
    # Attach SCPs to OUs
    print("\n=== Attaching SCPs to OUs ===\n")
    
    # Attach to Root (applies to all accounts)
    orgs.attach_policy(
        PolicyId=deny_leave_id,
        TargetId=ou_structure['root']
    )
    print(f"✓ Attached DenyLeaveOrganization to Root")
    
    orgs.attach_policy(
        PolicyId=require_regions_id,
        TargetId=ou_structure['root']
    )
    print(f"✓ Attached RequireApprovedRegions to Root")
    
    # Attach to Production OU
    orgs.attach_policy(
        PolicyId=deny_public_s3_id,
        TargetId=ou_structure['production']
    )
    print(f"✓ Attached DenyPublicS3 to Production OU")
    
    orgs.attach_policy(
        PolicyId=protect_cloudtrail_id,
        TargetId=ou_structure['production']
    )
    print(f"✓ Attached ProtectCloudTrail to Production OU")
    
    # Attach to Non-Production (fewer restrictions)
    orgs.attach_policy(
        PolicyId=deny_public_s3_id,
        TargetId=ou_structure['non_production']
    )
    print(f"✓ Attached DenyPublicS3 to Non-Production OU")
    
    print("\n✓ SCP Configuration Complete")
    print("\nEffective Policies:")
    print("  Root: DenyLeaveOrg, RequireRegions (applies to all)")
    print("  Production: + DenyPublicS3, ProtectCloudTrail")
    print("  Non-Production: + DenyPublicS3")
    print("  Sandbox: (only root policies)")

create_scps(ou_structure)
```

**Step 4: Create Member Accounts**

```python
def create_member_account(account_name, email, ou_id):
    """Create new AWS account in organization"""
    
    print(f"\n=== Creating Account: {account_name} ===\n")
    
    try:
        # Create account
        response = orgs.create_account(
            Email=email,
            AccountName=account_name,
            RoleName='OrganizationAccountAccessRole',  # Cross-account admin role
            IamUserAccessToBilling='ALLOW',
            Tags=[
                {'Key': 'Environment', 'Value': account_name.split('-')[0]},
                {'Key': 'CreatedBy', 'Value': 'Organizations'},
                {'Key': 'CreatedDate', 'Value': datetime.now().isoformat()}
            ]
        )
        
        request_id = response['CreateAccountStatus']['Id']
        
        print(f"Account creation initiated: {request_id}")
        print("Waiting for account creation (this takes 3-5 minutes)...")
        
        # Poll for completion
        while True:
            status = orgs.describe_create_account_status(
                CreateAccountRequestId=request_id
            )
            
            state = status['CreateAccountStatus']['State']
            
            if state == 'SUCCEEDED':
                account_id = status['CreateAccountStatus']['AccountId']
                print(f"\n✓ Account created successfully")
                print(f"  Account ID: {account_id}")
                print(f"  Account Name: {account_name}")
                print(f"  Email: {email}")
                
                # Move to appropriate OU
                orgs.move_account(
                    AccountId=account_id,
                    SourceParentId=ou_structure['root'],
                    DestinationParentId=ou_id
                )
                
                print(f"  ✓ Moved to OU: {ou_id}")
                
                return account_id
            
            elif state == 'FAILED':
                failure_reason = status['CreateAccountStatus'].get('FailureReason', 'Unknown')
                print(f"\n✗ Account creation failed: {failure_reason}")
                return None
            
            time.sleep(30)
    
    except Exception as e:
        print(f"Error creating account: {e}")
        return None

# Create accounts in different OUs
prod_marketing_account = create_member_account(
    'prod-marketing-website',
    'aws-prod-marketing@company.com',
    ou_structure['prod_marketing']
)

dev_account = create_member_account(
    'dev-engineering-api',
    'aws-dev-engineering@company.com',
    ou_structure['non_production']
)

sandbox_account = create_member_account(
    'sandbox-datascience',
    'aws-sandbox-ds@company.com',
    ou_structure['sandbox']
)
```

**Step 5: Enable Consolidated Billing Features**

```python
def configure_consolidated_billing():
    """Configure consolidated billing preferences"""
    
    print("\n=== Configuring Consolidated Billing ===\n")
    
    # Enable RI and Savings Plans sharing
    orgs.enable_aws_service_access(
        ServicePrincipal='replication.dynamodb.amazonaws.com'
    )
    
    print("✓ Enabled service access for billing")
    
    # Get billing info
    organizations = boto3.client('organizations')
    
    accounts = organizations.list_accounts()
    
    print("\n=== Organization Accounts ===\n")
    
    total_accounts = 0
    for account in accounts['Accounts']:
        print(f"Account: {account['Name']}")
        print(f"  ID: {account['Id']}")
        print(f"  Email: {account['Email']}")
        print(f"  Status: {account['Status']}")
        print(f"  Joined: {account['JoinedTimestamp']}")
        print()
        total_accounts += 1
    
    print(f"Total Accounts: {total_accounts}")
    print("\nConsolidated Billing Benefits:")
    print("  ✓ Single monthly bill")
    print("  ✓ Volume discounts across all accounts")
    print("  ✓ RI sharing automatically enabled")
    print("  ✓ Savings Plans shared across organization")
    print("  ✓ Free data transfer between accounts")

configure_consolidated_billing()
```


### Lab 2: Cross-Account IAM Access

**Objective:** Set up secure cross-account access patterns for different use cases.

**Step 1: Create Cross-Account Role in Target Account**

```python
def create_cross_account_role(account_id, trusted_account_id, role_name, permissions):
    """Create cross-account IAM role"""
    
    print(f"\n=== Creating Cross-Account Role in Account {account_id} ===\n")
    
    # Assume role in target account first
    sts = boto3.client('sts')
    
    assumed_role = sts.assume_role(
        RoleArn=f'arn:aws:iam::{account_id}:role/OrganizationAccountAccessRole',
        RoleSessionName='CrossAccountSetup'
    )
    
    # Create IAM client for target account
    target_iam = boto3.client(
        'iam',
        aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
        aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
        aws_session_token=assumed_role['Credentials']['SessionToken']
    )
    
    # Trust policy allowing source account
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{trusted_account_id}:root"
            },
            "Action": "sts:AssumeRole",
            "Condition": {
                "StringEquals": {
                    "sts:ExternalId": f"org-{account_id}"
                }
            }
        }]
    }
    
    try:
        # Create role
        role_response = target_iam.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description=f'Cross-account access from {trusted_account_id}',
            MaxSessionDuration=3600,
            Tags=[
                {'Key': 'Purpose', 'Value': 'CrossAccountAccess'},
                {'Key': 'TrustedAccount', 'Value': trusted_account_id}
            ]
        )
        
        role_arn = role_response['Role']['Arn']
        print(f"✓ Created role: {role_arn}")
        
        # Attach permissions
        if permissions == 'ReadOnly':
            target_iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/ReadOnlyAccess'
            )
            print(f"  ✓ Attached ReadOnlyAccess policy")
        
        elif permissions == 'PowerUser':
            target_iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/PowerUserAccess'
            )
            print(f"  ✓ Attached PowerUserAccess policy")
        
        elif permissions == 'Admin':
            target_iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn='arn:aws:iam::aws:policy/AdministratorAccess'
            )
            print(f"  ✓ Attached AdministratorAccess policy")
        
        print(f"\n✓ Cross-account role configured")
        print(f"  External ID: org-{account_id}")
        print(f"  Trust: Account {trusted_account_id}")
        
        return role_arn
    
    except Exception as e:
        print(f"Error creating role: {e}")
        return None

# Create cross-account roles
audit_role = create_cross_account_role(
    account_id=prod_marketing_account,
    trusted_account_id='999999999999',  # Security/Audit account
    role_name='AuditRole',
    permissions='ReadOnly'
)

admin_role = create_cross_account_role(
    account_id=dev_account,
    trusted_account_id='888888888888',  # Operations account
    role_name='AdminRole',
    permissions='Admin'
)
```

**Step 2: Create Switch Role Links**

```python
def generate_switch_role_url(account_id, role_name, display_name):
    """Generate AWS Console switch role URL"""
    
    base_url = "https://signin.aws.amazon.com/switchrole"
    
    params = {
        'account': account_id,
        'roleName': role_name,
        'displayName': display_name
    }
    
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    
    print(f"\n=== Switch Role URL ===")
    print(f"Account: {account_id}")
    print(f"Role: {role_name}")
    print(f"Display: {display_name}")
    print(f"\nURL: {url}")
    print("\nInstructions:")
    print("1. Click the URL above")
    print("2. Review the account and role details")
    print("3. Click 'Switch Role'")
    print("4. You'll be switched to the target account with role permissions")
    
    return url

# Generate switch role URLs for common scenarios
audit_url = generate_switch_role_url(
    account_id=prod_marketing_account,
    role_name='AuditRole',
    display_name='Prod-Marketing-Audit'
)

admin_url = generate_switch_role_url(
    account_id=dev_account,
    role_name='AdminRole',
    display_name='Dev-Engineering-Admin'
)
```

**Step 3: Programmatic Cross-Account Access**

```python
def assume_cross_account_role(role_arn, external_id, session_name='CrossAccountSession'):
    """Assume cross-account role programmatically"""
    
    print(f"\n=== Assuming Cross-Account Role ===")
    print(f"Role: {role_arn}")
    
    sts = boto3.client('sts')
    
    try:
        response = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=session_name,
            ExternalId=external_id,
            DurationSeconds=3600
        )
        
        credentials = response['Credentials']
        
        print(f"✓ Role assumed successfully")
        print(f"  Session: {session_name}")
        print(f"  Expiration: {credentials['Expiration']}")
        
        # Create boto3 session with assumed role credentials
        session = boto3.Session(
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken']
        )
        
        # Example: List S3 buckets in target account
        s3 = session.client('s3')
        buckets = s3.list_buckets()
        
        print(f"\n  S3 Buckets in target account: {len(buckets['Buckets'])}")
        for bucket in buckets['Buckets'][:5]:
            print(f"    - {bucket['Name']}")
        
        return session
    
    except Exception as e:
        print(f"✗ Error assuming role: {e}")
        return None

# Example: Assume role in production account
prod_session = assume_cross_account_role(
    role_arn=audit_role,
    external_id=f'org-{prod_marketing_account}',
    session_name='AuditSession'
)

# Use the session to perform operations
if prod_session:
    ec2 = prod_session.client('ec2')
    instances = ec2.describe_instances()
    
    print(f"\nEC2 Instances in production account:")
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            print(f"  {instance['InstanceId']}: {instance['State']['Name']}")
```

**Step 4: Cross-Account S3 Access**

```python
def setup_cross_account_s3_access(bucket_name, target_account_id):
    """Set up cross-account S3 bucket access"""
    
    print(f"\n=== Configuring Cross-Account S3 Access ===")
    print(f"Bucket: {bucket_name}")
    print(f"Target Account: {target_account_id}")
    
    s3 = boto3.client('s3')
    
    # Bucket policy allowing cross-account access
    bucket_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "CrossAccountReadAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{target_account_id}:root"
            },
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                f"arn:aws:s3:::{bucket_name}",
                f"arn:aws:s3:::{bucket_name}/*"
            ]
        }]
    }
    
    try:
        s3.put_bucket_policy(
            Bucket=bucket_name,
            Policy=json.dumps(bucket_policy)
        )
        
        print(f"✓ Bucket policy configured")
        print(f"  Permissions: GetObject, ListBucket")
        print(f"  Principal: Account {target_account_id}")
        
        # Enable versioning for audit trail
        s3.put_bucket_versioning(
            Bucket=bucket_name,
            VersioningConfiguration={'Status': 'Enabled'}
        )
        
        print(f"  ✓ Versioning enabled")
        
        # Enable logging
        s3.put_bucket_logging(
            Bucket=bucket_name,
            BucketLoggingStatus={
                'LoggingEnabled': {
                    'TargetBucket': 'central-logging-bucket',
                    'TargetPrefix': f'{bucket_name}/'
                }
            }
        )
        
        print(f"  ✓ Access logging enabled")
        
    except Exception as e:
        print(f"✗ Error configuring bucket policy: {e}")

# Set up cross-account bucket access
setup_cross_account_s3_access(
    bucket_name='prod-marketing-assets',
    target_account_id=dev_account
)
```


## Production-Level Knowledge

### Enterprise Governance Patterns

**Multi-Account Governance at Scale:**

```
Enterprise Account Strategy:

ORGANIZATION SIZE: 500+ Accounts

Account Categories:

1. CORE INFRASTRUCTURE (5-10 accounts):
   - Management (Organizations, Control Tower)
   - Security (GuardDuty, Security Hub aggregation)
   - Log Archive (CloudTrail, VPC Flow Logs, Config)
   - Shared Services (AD, DNS, monitoring)
   - Network (Transit Gateway, Direct Connect)
   - Backup (Centralized backup vaults)

2. WORKLOAD ACCOUNTS (400+ accounts):
   
   By Environment × Business Unit × Application:
   
   Production:
   ├── Marketing
   │   ├── prod-mktg-website-001
   │   ├── prod-mktg-crm-001
   │   └── prod-mktg-analytics-001
   ├── Sales
   │   ├── prod-sales-portal-001
   │   └── prod-sales-api-001
   └── Engineering
       ├── prod-eng-platform-001
       └── prod-eng-mobile-001
   
   Non-Production:
   ├── dev-mktg-website-001
   ├── test-mktg-website-001
   ├── stage-mktg-website-001
   └── ... (mirrors production structure)

3. SANDBOX ACCOUNTS (50+ accounts):
   - Per team experimentation
   - Auto-shutdown after hours
   - Aggressive cost controls
   - Minimal governance

4. SUSPENDED/CLOSED (50+ accounts):
   - Decommissioned projects
   - Pending deletion
   - Compliance retention

Account Lifecycle Management:

REQUEST → APPROVE → PROVISION → CONFIGURE → OPERATE → DECOMMISSION

1. REQUEST:
   - Self-service portal (Service Catalog)
   - Required info: Business justification, cost center, owner
   - Approval workflow (manager → finance → security)

2. PROVISION:
   - Account Factory (Control Tower)
   - Automated account creation
   - Baseline configuration (VPC, CloudTrail, Config)
   - Duration: 15-30 minutes

3. CONFIGURE:
   - Environment-specific setup
   - Application deployment
   - DNS records
   - Monitoring dashboards
   - Cost allocation tags

4. OPERATE:
   - Regular access reviews (quarterly)
   - Compliance monitoring (continuous)
   - Cost optimization (monthly reviews)
   - Security audits (quarterly)

5. DECOMMISSION:
   - Data backup/export
   - Dependency checks
   - Account suspension (30 days)
   - Account closure (after validation)

Governance Automation:

AWS Config Rules (Compliance):

1. Required Tags:
   - Environment (prod, dev, test)
   - Owner (email)
   - CostCenter (department code)
   - Application (app name)
   
   Non-compliant resources → Auto-remediation or block

2. Encryption Requirements:
   - EBS volumes must be encrypted
   - S3 buckets must use KMS
   - RDS databases must encrypt at rest
   
   Non-compliant → Alert + remediation ticket

3. Network Security:
   - No unrestricted SSH (0.0.0.0/0:22)
   - No unrestricted RDP (0.0.0.0/0:3389)
   - VPC Flow Logs enabled
   
   Non-compliant → Auto-remediation

4. Backup Compliance:
   - Prod resources have backup plans
   - 30-day retention minimum
   - Cross-region backup copy
   
   Non-compliant → Alert owner

Lambda Automation:

def enforce_tagging(event, context):
    """Auto-tag resources on creation"""
    
    # Extract resource details
    detail = event['detail']
    resource_arn = detail['responseElements']['resourceArn']
    creator = detail['userIdentity']['principalId']
    
    # Lookup creator's cost center from directory
    cost_center = get_cost_center(creator)
    
    # Apply tags
    tags = [
        {'Key': 'CreatedBy', 'Value': creator},
        {'Key': 'CreatedDate', 'Value': detail['eventTime']},
        {'Key': 'CostCenter', 'Value': cost_center},
        {'Key': 'ManagedBy', 'Value': 'Automation'}
    ]
    
    apply_tags(resource_arn, tags)

def auto_shutdown_dev_instances(event, context):
    """Shutdown dev instances after hours"""
    
    ec2 = boto3.client('ec2')
    
    # Find running dev instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['dev', 'test']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    
    current_hour = datetime.now().hour
    
    # Stop if outside business hours (8 AM - 6 PM)
    if current_hour < 8 or current_hour > 18:
        for reservation in instances['Reservations']:
            for instance in reservation['Instances']:
                instance_id = instance['InstanceId']
                
                # Check if instance has AutoShutdown tag
                auto_shutdown = get_tag(instance, 'AutoShutdown')
                
                if auto_shutdown != 'false':
                    ec2.stop_instances(InstanceIds=[instance_id])
                    
                    # Send notification
                    sns.publish(
                        TopicArn='cost-optimization-alerts',
                        Subject=f'Instance {instance_id} stopped',
                        Message=f'Stopped after hours. Owner: {get_tag(instance, "Owner")}'
                    )

Cost Allocation Strategy:

Tagging Strategy:
- CostCenter: Department/team budget
- Application: Specific application
- Environment: prod/dev/test
- Owner: Technical owner
- Project: Business project

Cost Allocation Tags (enabled in billing):
Enable these tags in Cost Explorer for filtering

Cost Reports:
1. Per Cost Center (monthly chargeback)
2. Per Application (TCO analysis)
3. Per Environment (dev vs prod spend)
4. Per Team (team budgets)

Budgets and Alerts:
- Account-level budgets (per account limit)
- Cost center budgets (department limits)
- Application budgets (project limits)
- Forecasted spend alerts (projected overrun)

Example Budget Configuration:
Account: prod-marketing-website
Budget: $5,000/month
Alerts:
  - 80% actual: Email team
  - 100% actual: Email director + stop non-critical
  - 120% forecasted: Escalate to VP

Access Management:

Identity Federation:
- AWS SSO (Identity Center) with Azure AD/Okta
- Single sign-on across all accounts
- Permission sets (roles) managed centrally
- Just-in-time access

Permission Sets:
1. ViewOnly: Read-only across all accounts
2. Developer: Full access in dev, read-only in prod
3. Operations: Full access in all environments
4. SecurityAuditor: Security tools only
5. BreakGlass: Emergency admin (MFA + approval)

Access Request Workflow:
User requests access → Manager approves
  → Security reviews → Access granted (time-limited)
  → Access expires after 90 days (re-request required)

Compliance Monitoring:

Automated Compliance Checks:
- CIS AWS Foundations Benchmark
- PCI-DSS requirements
- HIPAA controls
- SOC 2 controls
- Custom organizational policies

Compliance Dashboard:
┌──────────────────────────────────────────────┐
│ Organization Compliance Status               │
├──────────────────────────────────────────────┤
│ Total Accounts: 523                          │
│ Compliant: 498 (95%)                         │
│ Non-Compliant: 25 (5%)                       │
│                                              │
│ Top Issues:                                  │
│ 1. Unencrypted EBS volumes (15 accounts)    │
│ 2. Missing backup plans (8 accounts)        │
│ 3. Unrestricted security groups (2 accounts)│
│                                              │
│ Compliance by Framework:                     │
│ CIS Benchmark: 98%                           │
│ PCI-DSS: 100%                                │
│ HIPAA: 100%                                  │
│ Custom Policies: 93%                         │
└──────────────────────────────────────────────┘

Incident Response:
1. Alert triggered (GuardDuty finding)
2. Security Hub aggregates across accounts
3. Lambda automation isolates compromised resource
4. Incident ticket created (ServiceNow)
5. Security team investigates
6. Remediation + root cause analysis
7. Update guardrails to prevent recurrence
```


## Tips \& Best Practices

**Tip 1: Never Run Workloads in Management Account**
Keep management account for Organizations/billing only—compromise of management account impacts entire organization.

**Tip 2: Use Control Tower for New Organizations**
Automated landing zone with best practices—manual setup error-prone, Control Tower provides tested configuration.

**Tip 3: Test SCPs in Sandbox OU First**
SCPs can lock out admins if misconfigured—test thoroughly before applying to production OUs.

**Tip 4: Include Break-Glass Exception in SCPs**
Emergency access role exempted from restrictive SCPs—enables recovery from policy misconfigurations.

**Tip 5: Enable Organization-Wide CloudTrail**
Single trail logs all accounts—immutable audit record, prevents individual account trail tampering.

**Tip 6: Use Separate Accounts Per Environment**
Prod, dev, test in different accounts—prevents accidental production impact, enables different governance policies.

**Tip 7: Implement Account Vending Machine**
Automated account creation with baseline—reduces provisioning time from days to minutes, ensures consistency.

**Tip 8: Tag Everything for Cost Allocation**
Comprehensive tagging enables chargeback—track spending by cost center, application, project accurately.

**Tip 9: Regular Access Reviews**
Quarterly review of cross-account access—revoke unused permissions, validate access still required.

**Tip 10: Monitor Consolidated Billing**
Use Cost Explorer to analyze spending—identify cost anomalies, optimize Reserved Instances across accounts.

## Chapter Summary

AWS multi-account strategy using Organizations and Control Tower provides enterprise-scale governance enabling secure operation of hundreds of accounts through security isolation, blast radius containment, independent billing, and automated guardrails. Organizations achieving 500+ accounts report 75% reduction in security incidents through account isolation, 50% reduction in account provisioning time through Account Factory automation, and complete cost attribution through consolidated billing. Success requires hierarchical OU structure reflecting environment and business unit separation, Service Control Policies enforcing organization-wide guardrails, automated account vending with baseline configuration, and centralized logging/monitoring across all accounts—transforming multi-account complexity into managed, governed, scalable cloud environment.

**Key Takeaways:**

- **Account per Workload:** Separate accounts for security isolation—dev mistake can't impact production, compromised account doesn't expose all data
- **Organizations Hierarchy:** OU structure with SCPs—enforce guardrails at OU level, inherited by all member accounts
- **Control Tower Automation:** Landing zone with Account Factory—automated account provisioning with guardrails in 15 minutes
- **SCPs as Guardrails:** Maximum permission boundaries—prevent dangerous actions even with full IAM admin
- **Consolidated Billing:** Single bill with volume discounts—RI/Savings Plans shared across organization automatically
- **Cross-Account Access:** IAM roles with assume-role—secure programmatic and console access across accounts
- **Centralized Logging:** Organization CloudTrail—immutable audit trail across all accounts

Multi-account strategy scales from 10 to 1000+ accounts while maintaining governance. Small organizations (< 10 accounts) can use Organizations alone; enterprises (100+ accounts) benefit significantly from Control Tower automation. Financial services with 500+ accounts achieve regulatory compliance through account-level isolation, automated guardrails, and centralized audit logging—impossible in single-account architecture.

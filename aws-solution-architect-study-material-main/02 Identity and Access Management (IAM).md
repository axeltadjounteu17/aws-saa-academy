# Chapter 2: Identity and Access Management (IAM)

## Introduction

Identity and Access Management (IAM) is the cornerstone of AWS security architecture. Every interaction with AWS—whether launching an EC2 instance, reading from an S3 bucket, or updating a database—requires authentication (proving who you are) and authorization (verifying what you're allowed to do). IAM provides the framework for both, enabling you to control access to AWS resources with precision and flexibility.

Unlike traditional on-premises security models with perimeter-based defenses, AWS operates on a zero-trust security model where identity is the new perimeter. This shift requires architects to think differently about security: instead of relying on network boundaries, you must explicitly grant permissions for every action on every resource. A misconfigured IAM policy can expose sensitive data, enable privilege escalation, or provide attackers with a foothold in your infrastructure.

The importance of IAM cannot be overstated. It's not merely a box to check during initial setup—it's a living, breathing component of your architecture that evolves with your applications and organizational structure. Proper IAM implementation enables secure multi-account strategies, regulatory compliance, automated deployments, and defense-in-depth security. Conversely, IAM mistakes remain one of the leading causes of cloud security breaches, from exposed credentials in public repositories to overly permissive policies that grant unintended access.

This chapter provides comprehensive coverage of IAM fundamentals, advanced patterns, and real-world best practices. You'll learn to craft fine-grained policies, implement cross-account access securely, leverage identity federation for enterprise integration, and build audit trails for compliance. Whether you're securing a startup's first AWS deployment or architecting enterprise-scale identity solutions, mastering IAM is non-negotiable for any Solutions Architect.

## Theory \& Concepts

### IAM Fundamentals

IAM is a **global service** that operates across all AWS Regions. Resources created in IAM—users, groups, roles, and policies—are automatically available worldwide. This global nature simplifies management but requires careful consideration of naming conflicts and policy scope.

**Key IAM Principles:**

1. **Least Privilege:** Grant only the permissions required to perform a task
2. **Defense in Depth:** Layer multiple security controls (MFA, network policies, encryption)
3. **Separation of Duties:** Distribute permissions across multiple identities to prevent abuse
4. **Regular Auditing:** Continuously review and refine access permissions

### IAM Identities

IAM provides three types of identities for interacting with AWS resources:

#### IAM Users

An IAM user represents a person or application that needs to interact with AWS. Each user has unique credentials (password, access keys) and can be granted specific permissions.

**Characteristics:**

- Permanent identity tied to your AWS account
- Long-term credentials (passwords, access keys)
- Maximum of 5,000 users per AWS account
- Should be used sparingly in modern architectures (prefer roles)

**Use Cases:**

- Individual employees requiring AWS console access
- Legacy applications that cannot assume roles
- Break-glass emergency access accounts

**Authentication Methods:**

- **Console Password:** For AWS Management Console access
- **Access Keys:** Programmatic access via AWS CLI, SDKs, or APIs
- **SSH Keys:** For AWS CodeCommit repositories
- **Server Certificates:** For specific AWS services

**Best Practices:**

- Enable MFA for all human users
- Rotate access keys regularly (every 90 days)
- Use temporary credentials (roles) whenever possible
- Implement strong password policies


#### IAM Groups

Groups are collections of users that share common permissions. Instead of attaching policies to individual users, attach them to groups for easier management.

**Characteristics:**

- Cannot be nested (groups cannot contain other groups)
- A user can belong to multiple groups (up to 10)
- Groups have no credentials—they're purely organizational
- Maximum of 300 groups per AWS account

**Common Group Patterns:**

```
Developers Group → ReadOnly policies + specific dev environment access
Admins Group → AdministratorAccess policy
Finance Group → Billing and cost management access
Auditors Group → ReadOnly access to logs and configuration
```

**Important:** Groups are not true identities. You cannot grant a group access to a resource in a resource-based policy. Groups exist solely to organize users and simplify policy attachment.

#### IAM Roles

Roles are identities that can be assumed by trusted entities (users, applications, services). Unlike users, roles don't have permanent credentials—instead, they provide temporary security credentials when assumed.

**Characteristics:**

- No permanent credentials (password or access keys)
- Can be assumed by IAM users, AWS services, or external identities
- Provide temporary credentials (valid for 15 minutes to 12 hours)
- Can be assumed across AWS accounts
- No limit on number of roles per account

**Types of Roles:**

**1. Service Roles:**
Allow AWS services to perform actions on your behalf.

```
Example: Lambda execution role allows Lambda to write logs to CloudWatch
EC2 instance role allows application to read from S3
```

**2. Cross-Account Roles:**
Enable access between AWS accounts (common in multi-account organizations).

```
Example: DevAccount can assume DeploymentRole in ProdAccount
```

**3. Federated User Roles:**
Allow users authenticated by external identity providers to access AWS.

```
Example: Corporate AD users assuming AWS roles via SAML federation
```

**4. Service-Linked Roles:**
Predefined roles created automatically by AWS services.

```
Example: AWSServiceRoleForAutoScaling
Cannot be modified, only deleted when service no longer uses them
```

**Trust Policies:**

Every role has a trust policy (also called assume role policy) that defines who can assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

This trust policy allows EC2 instances to assume the role.

**Session Duration:**

When assuming a role, you specify a session duration:

- Default: 1 hour
- Maximum: 12 hours (configurable per role)
- Minimum: 15 minutes


### IAM Policies

Policies are JSON documents that define permissions. They answer the question: "What actions can be performed on which resources under what conditions?"

#### Policy Structure

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```

**Policy Elements:**

- **Version:** Policy language version (always use "2012-10-17")
- **Statement:** Array of individual permission statements
- **Sid:** (Optional) Statement identifier for documentation
- **Effect:** Either "Allow" or "Deny"
- **Principal:** (Resource-based policies only) Who the statement applies to
- **Action:** List of actions (e.g., "s3:GetObject", "ec2:RunInstances")
- **Resource:** ARNs of resources the statement applies to
- **Condition:** (Optional) Circumstances under which the statement applies


#### Policy Types

**1. Identity-Based Policies:**

Attached to IAM identities (users, groups, roles). They define what the identity can do.

**Managed Policies:**

- **AWS Managed:** Created and maintained by AWS (e.g., `AdministratorAccess`, `ReadOnlyAccess`)
- **Customer Managed:** Created and maintained by you
- Can be attached to multiple identities
- Versioned (up to 5 versions retained)
- Maximum size: 6,144 characters

**Inline Policies:**

- Embedded directly in a single user, group, or role
- One-to-one relationship with identity
- Deleted when identity is deleted
- Use for exceptions or one-off permissions

**2. Resource-Based Policies:**

Attached directly to resources (S3 buckets, SQS queues, Lambda functions). They define who can access the resource.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccountBAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

Resource-based policies include a `Principal` element specifying who has access.

**3. Permission Boundaries:**

Advanced feature that sets the maximum permissions an identity can have. Even if a policy grants broader permissions, the boundary limits what's actually allowed.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "ec2:*",
        "rds:*"
      ],
      "Resource": "*"
    }
  ]
}
```

This boundary allows only S3, EC2, and RDS actions, regardless of other attached policies.

**Use Cases:**

- Delegate permission management to developers without giving them admin rights
- Enforce organizational security baselines
- Prevent privilege escalation

**4. Service Control Policies (SCPs):**

Part of AWS Organizations, SCPs set maximum permissions for accounts in an organization. They don't grant permissions—they only limit them.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "ec2:Region": ["us-east-1", "us-west-2"]
        }
      }
    }
  ]
}
```

This SCP prevents launching EC2 instances outside us-east-1 and us-west-2.

**5. Session Policies:**

Passed when assuming a role or federating a user, session policies further limit the permissions for that specific session.

#### Policy Evaluation Logic

When multiple policies apply, AWS evaluates them in this order:

1. **Explicit Deny:** If any policy explicitly denies an action, access is denied
2. **Organizations SCPs:** Check if the action is allowed by SCPs
3. **Resource-Based Policies:** Check if resource policy allows access
4. **Identity-Based Policies:** Check if identity's policies allow access
5. **Permission Boundaries:** Check if action is within the boundary
6. **Session Policies:** Check if session policy allows access

**Decision Flow:**

```
Explicit Deny? → DENY
SCPs Allow? → If No, DENY
(Resource Policy OR Identity Policy) Allow? → If No, DENY
Permission Boundary Allow? → If No, DENY
Session Policy Allow? → If No, DENY
Otherwise → ALLOW
```

**Key Rule:** An explicit deny always wins. By default, all actions are implicitly denied unless explicitly allowed.

### IAM Best Practices for Policy Design

#### Use of Policy Variables

Policy variables enable dynamic policies that adapt to the current context:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::company-bucket/${aws:username}",
        "arn:aws:s3:::company-bucket/${aws:username}/*"
      ]
    }
  ]
}
```

This policy grants each user access to their own folder in the S3 bucket.

**Common Policy Variables:**

- `${aws:username}` - IAM user name
- `${aws:userid}` - Unique ID of the identity
- `${aws:PrincipalTag/TagKey}` - Value of a tag attached to the principal
- `${aws:CurrentTime}` - Current date and time
- `${aws:SourceIp}` - Source IP address of the request


#### Condition Keys

Conditions add context-based access control:

**IP Address Restrictions:**

```json
{
  "Condition": {
    "IpAddress": {
      "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
    }
  }
}
```

**MFA Required:**

```json
{
  "Condition": {
    "Bool": {
      "aws:MultiFactorAuthPresent": "true"
    }
  }
}
```

**Time-Based Access:**

```json
{
  "Condition": {
    "DateGreaterThan": {
      "aws:CurrentTime": "2025-01-01T00:00:00Z"
    },
    "DateLessThan": {
      "aws:CurrentTime": "2025-12-31T23:59:59Z"
    }
  }
}
```

**Resource Tags:**

```json
{
  "Condition": {
    "StringEquals": {
      "ec2:ResourceTag/Environment": "Production"
    }
  }
}
```

**SSL/TLS Required:**

```json
{
  "Condition": {
    "Bool": {
      "aws:SecureTransport": "true"
    }
  }
}
```


### Identity Federation

Identity federation enables users to access AWS using credentials from external identity providers, eliminating the need to create IAM users for everyone.

#### Federation Types

**1. SAML 2.0 Federation:**

Integrate with corporate identity providers (Active Directory, Okta, Azure AD) using SAML.

**Flow:**

```
1. User authenticates with corporate IdP
2. IdP generates SAML assertion
3. User presents assertion to AWS STS
4. STS returns temporary credentials
5. User accesses AWS resources using temporary credentials
```

**Use Cases:**

- Enterprise SSO for console access
- Centralized identity management
- Compliance requirements for federated access

**2. Web Identity Federation:**

Allow users to sign in using web identity providers (Amazon, Google, Facebook) for mobile or web applications.

**Flow (with Cognito):**

```
1. User authenticates with web IdP (Google)
2. App receives IdP token
3. App exchanges token with Amazon Cognito
4. Cognito returns AWS credentials
5. App accesses AWS resources
```

**3. AWS IAM Identity Center (formerly AWS SSO):**

AWS's managed service for workforce identity federation.

**Features:**

- Built-in IdP or connect to external IdP
- Automatic account assignment
- Permission sets for consistent access
- Integration with AWS Organizations

**4. OIDC (OpenID Connect) Federation:**

Standard protocol for identity federation, commonly used for GitHub Actions, GitLab CI/CD.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```


### Multi-Factor Authentication (MFA)

MFA adds an extra layer of security by requiring two forms of authentication:

1. Something you know (password)
2. Something you have (MFA device)

**Supported MFA Device Types:**

**1. Virtual MFA Devices:**

- Apps like Google Authenticator, Microsoft Authenticator, Authy
- Generates time-based one-time passwords (TOTP)
- Most common and cost-effective

**2. Hardware MFA Devices:**

- Physical devices (Gemalto, YubiKey)
- More secure but more expensive
- Required for high-security environments

**3. U2F Security Keys:**

- YubiKey, other FIDO U2F devices
- Most secure option
- Physical tap required for authentication

**MFA for Root Account:**
Always enable MFA on the root account—it's non-negotiable for security.

**MFA in IAM Policies:**

Require MFA for sensitive operations:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:TerminateInstances",
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```


### Cross-Account Access

Organizations frequently need to grant access across AWS accounts. Cross-account access enables this without sharing credentials.

**Pattern 1: Role Assumption (Recommended)**

```
Account A (123456789012) → Assume Role → Account B (987654321098)
```

**Trust Policy in Account B:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-12345"
        }
      }
    }
  ]
}
```

**External ID:** A unique identifier that prevents the "confused deputy" problem where an intermediary service might be tricked into accessing resources in the wrong account.

**Pattern 2: Resource-Based Policies**

For services that support resource-based policies (S3, SQS, SNS, Lambda):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/Alice"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

**Difference:**

- **Role assumption:** Temporary credentials, scales to any service
- **Resource-based:** Direct access without assuming role, limited to specific services


### IAM Access Analyzer

AWS IAM Access Analyzer helps identify resources shared with external entities and validates policies.

**Features:**

**1. External Access Analysis:**
Identifies resources accessible from outside your AWS account or organization.

**2. Policy Validation:**
Checks policies against best practices and identifies errors before deployment.

**3. Policy Generation:**
Analyzes CloudTrail logs to generate least-privilege policies based on actual usage.

**Findings:**

- Public S3 buckets
- IAM roles assumable by external accounts
- KMS keys with external key policies
- Lambda functions with cross-account permissions


### AWS Security Token Service (STS)

STS enables you to request temporary, limited-privilege credentials. It's the backbone of federation and role assumption.

**Key APIs:**

**AssumeRole:**
Assume an IAM role within or across accounts.

```bash
aws sts assume-role \
    --role-arn arn:aws:iam::987654321098:role/CrossAccountRole \
    --role-session-name session-name \
    --duration-seconds 3600
```

**AssumeRoleWithWebIdentity:**
Assume a role using web identity token (Google, Facebook, Amazon).

**AssumeRoleWithSAML:**
Assume a role using SAML assertion from IdP.

**GetSessionToken:**
Get temporary credentials for an IAM user (commonly used with MFA).

```bash
aws sts get-session-token \
    --serial-number arn:aws:iam::123456789012:mfa/user \
    --token-code 123456
```

**GetFederationToken:**
Get temporary credentials for federated users.

**Temporary Credentials Structure:**

```json
{
  "Credentials": {
    "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "SessionToken": "very-long-session-token-string",
    "Expiration": "2025-11-15T03:23:00Z"
  }
}
```


### IAM Policies for AWS Services

Understanding how AWS services use IAM:

**Service Roles:**
Most AWS services require a role to operate:

- Lambda needs a role to write logs to CloudWatch
- EC2 instances need a role to access S3
- ECS tasks need a role to pull images from ECR

**Service-Linked Roles:**
Some services automatically create and manage roles:

- Auto Scaling: `AWSServiceRoleForAutoScaling`
- ElastiCache: `AWSServiceRoleForElastiCache`
- Cannot be modified, only deleted when service no longer needs them

**Resource-Based Policies on Services:**
Some services support resource-based policies:

- S3 bucket policies
- SNS topic policies
- SQS queue policies
- Lambda function policies
- ECR repository policies


### IAM Limits and Quotas

Understanding IAM limits helps plan architecture:


| Resource | Default Limit | Notes |
| :-- | :-- | :-- |
| Users per account | 5,000 | Use federation for larger organizations |
| Groups per account | 300 | Users can be in up to 10 groups |
| Roles per account | 1,000 | Soft limit, can be increased |
| Policies per user/group/role | 10 managed policies | Plus inline policies |
| Policy size | 2,048 characters (inline), 6,144 (managed) | Compress policies if hitting limit |
| MFA devices per user | 8 | Multiple devices for redundancy |

## Hands-On Implementation

### Lab 1: Creating IAM Users with Strong Password Policy

**Objective:** Set up IAM users with enforced password policies and MFA.

#### Step 1: Configure Account Password Policy

```bash
# Set strong password policy
aws iam update-account-password-policy \
    --minimum-password-length 14 \
    --require-symbols \
    --require-numbers \
    --require-uppercase-characters \
    --require-lowercase-characters \
    --allow-users-to-change-password \
    --max-password-age 90 \
    --password-reuse-prevention 12 \
    --hard-expiry

# Verify password policy
aws iam get-account-password-policy
```

**Output:**

```json
{
  "PasswordPolicy": {
    "MinimumPasswordLength": 14,
    "RequireSymbols": true,
    "RequireNumbers": true,
    "RequireUppercaseCharacters": true,
    "RequireLowercaseCharacters": true,
    "AllowUsersToChangePassword": true,
    "MaxPasswordAge": 90,
    "PasswordReusePrevention": 12,
    "HardExpiry": true
  }
}
```


#### Step 2: Create IAM Users

```bash
# Create IAM user
aws iam create-user --user-name alice

# Create login profile with initial password
aws iam create-login-profile \
    --user-name alice \
    --password 'TemporaryP@ssw0rd123!' \
    --password-reset-required

# Create access keys for programmatic access
aws iam create-access-key --user-name alice
```

**Important:** Store the access key output securely. It's the only time AWS shows the secret access key.

#### Step 3: Enable MFA for User

```bash
# Create virtual MFA device
aws iam create-virtual-mfa-device \
    --virtual-mfa-device-name alice-mfa \
    --outfile /tmp/QRCode.png \
    --bootstrap-method QRCodePNG

# The QR code is saved to /tmp/QRCode.png
# User scans this with their authenticator app

# Enable MFA device (user provides two consecutive codes)
aws iam enable-mfa-device \
    --user-name alice \
    --serial-number arn:aws:iam::123456789012:mfa/alice-mfa \
    --authentication-code-1 123456 \
    --authentication-code-2 789012
```


#### Step 4: Create Groups and Assign Permissions

```bash
# Create developers group
aws iam create-group --group-name developers

# Attach AWS managed policy
aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Add user to group
aws iam add-user-to-group \
    --group-name developers \
    --user-name alice

# Verify group membership
aws iam get-group --group-name developers
```


### Lab 2: Creating Custom IAM Policies

**Objective:** Create fine-grained custom policies following least privilege principle.

#### Scenario 1: S3 Developer Policy

Allow developers to manage objects in specific S3 buckets but not modify bucket configuration:

```bash
# Create policy document
cat > s3-developer-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    },
    {
      "Sid": "ManageDevBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-*",
        "arn:aws:s3:::staging-application-*"
      ]
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-*/*",
        "arn:aws:s3:::staging-application-*/*"
      ]
    },
    {
      "Sid": "DenyProductionBuckets",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::prod-application-*",
        "arn:aws:s3:::prod-application-*/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
    --policy-name S3DeveloperAccess \
    --policy-document file://s3-developer-policy.json \
    --description "Allow developers to manage dev/staging S3 buckets"

# Attach to developers group
aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::123456789012:policy/S3DeveloperAccess
```


#### Scenario 2: EC2 Management with Tag-Based Access

Allow users to manage only EC2 instances tagged with their team:

```bash
cat > ec2-team-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ViewAllInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:Get*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ManageTeamInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:TerminateInstances"
      ],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "RequireTeamTagOnCreate",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "AllowLaunchTemplate",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:*:*:network-interface/*",
        "arn:aws:ec2:*:*:subnet/*",
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:security-group/*",
        "arn:aws:ec2:*::image/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name EC2TeamBasedAccess \
    --policy-document file://ec2-team-policy.json
```

**Tag the user:**

```bash
aws iam tag-user \
    --user-name alice \
    --tags Key=Team,Value=backend
```

Now Alice can only manage EC2 instances tagged with `Team=backend`.

#### Scenario 3: Time-Based Access Control

Grant access only during business hours:

```bash
cat > business-hours-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDuringBusinessHours",
      "Effect": "Allow",
      "Action": "rds:*",
      "Resource": "*",
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2025-01-01T09:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2025-12-31T18:00:00Z"
        },
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name BusinessHoursRDSAccess \
    --policy-document file://business-hours-policy.json
```


### Lab 3: Setting Up Cross-Account Access

**Objective:** Enable secure cross-account access between development and production accounts.

#### Scenario: Development Account Accessing Production for Read-Only

**Production Account (111111111111) - Create Role:**

```bash
# Create trust policy
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "prod-readonly-external-id-12345"
        },
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name CrossAccountReadOnly \
    --assume-role-policy-document file://trust-policy.json \
    --description "Read-only access for dev account" \
    --max-session-duration 14400  # 4 hours

# Attach read-only policy
aws iam attach-role-policy \
    --role-name CrossAccountReadOnly \
    --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# Add custom policy for specific resources
cat > prod-read-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::prod-logs-bucket",
        "arn:aws:s3:::prod-logs-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name CrossAccountReadOnly \
    --policy-name ProdReadAccess \
    --policy-document file://prod-read-policy.json
```

**Development Account (222222222222) - Assume Role:**

```bash
# Grant user/role permission to assume the cross-account role
cat > assume-role-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::111111111111:role/CrossAccountReadOnly"
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name AssumeProdReadRole \
    --policy-document file://assume-role-policy.json

aws iam attach-user-policy \
    --user-name alice \
    --policy-arn arn:aws:iam::222222222222:policy/AssumeProdReadRole

# Assume the role
aws sts assume-role \
    --role-arn arn:aws:iam::111111111111:role/CrossAccountReadOnly \
    --role-session-name alice-prod-session \
    --external-id prod-readonly-external-id-12345 \
    --duration-seconds 14400

# Output contains temporary credentials
# Export them:
export AWS_ACCESS_KEY_ID=ASIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN=very-long-session-token

# Now commands run with prod account permissions
aws s3 ls s3://prod-logs-bucket/
```


#### Create Assume Role Script

```bash
cat > assume-prod-role.sh <<'EOF'
#!/bin/bash

ROLE_ARN="arn:aws:iam::111111111111:role/CrossAccountReadOnly"
SESSION_NAME="$(whoami)-prod-session"
EXTERNAL_ID="prod-readonly-external-id-12345"

echo "Assuming role: $ROLE_ARN"

CREDENTIALS=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "$SESSION_NAME" \
    --external-id "$EXTERNAL_ID" \
    --duration-seconds 14400 \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)

if [ $? -eq 0 ]; then
    export AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | awk '{print $1}')
    export AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | awk '{print $2}')
    export AWS_SESSION_TOKEN=$(echo $CREDENTIALS | awk '{print $3}')
    
    echo "Successfully assumed role!"
    echo "Credentials will expire in 4 hours"
    echo "Current identity:"
    aws sts get-caller-identity
else
    echo "Failed to assume role"
    exit 1
fi
EOF

chmod +x assume-prod-role.sh

# Usage:
source ./assume-prod-role.sh
```


### Lab 4: Implementing Permission Boundaries

**Objective:** Use permission boundaries to safely delegate permission management to developers.

#### Scenario: Allow Developers to Create Roles but Limit Their Permissions

```bash
# Create permission boundary policy
cat > developer-permission-boundary.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowedServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*",
        "ec2:Describe*",
        "ec2:Get*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyDangerousActions",
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RestrictRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2"
          ]
        }
      }
    }
  ]
}
EOF

# Create the boundary policy
aws iam create-policy \
    --policy-name DeveloperPermissionBoundary \
    --policy-document file://developer-permission-boundary.json

# Allow developers to create roles with this boundary
cat > developer-role-creation-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowRoleCreation",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary"
        }
      }
    },
    {
      "Sid": "RequireBoundaryOnRole",
      "Effect": "Deny",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringNotEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name DeveloperRoleCreation \
    --policy-document file://developer-role-creation-policy.json

aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::123456789012:policy/DeveloperRoleCreation
```

**Developer creates a role:**

```bash
# Developer can create role with boundary
aws iam create-role \
    --role-name app-lambda-role \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --permissions-boundary arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary

# Attach policies to the role
aws iam attach-role-policy \
    --role-name app-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/AWSLambdaExecute

# This role can only perform actions allowed by BOTH:
# 1. The attached policy (AWSLambdaExecute)
# 2. The permission boundary (DeveloperPermissionBoundary)
```


### Lab 5: Policy Simulation and Testing

**Objective:** Test IAM policies before applying them to production.

#### Using IAM Policy Simulator

```bash
# Simulate S3 access for a user
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::123456789012:user/alice \
    --action-names s3:GetObject s3:PutObject s3:DeleteObject \
    --resource-arns arn:aws:s3:::dev-application-bucket/*

# Output shows whether each action is allowed or denied
```

**Sample Output:**

```json
{
  "EvaluationResults": [
    {
      "EvalActionName": "s3:GetObject",
      "EvalResourceName": "arn:aws:s3:::dev-application-bucket/*",
      "EvalDecision": "allowed",
      "MatchedStatements": [
        {
          "SourcePolicyId": "S3DeveloperAccess",
          "SourcePolicyType": "IAM Policy"
        }
      ]
    },
    {
      "EvalActionName": "s3:DeleteObject",
      "EvalResourceName": "arn:aws:s3:::prod-application-bucket/*",
      "EvalDecision": "explicitDeny",
      "MatchedStatements": [
        {
          "SourcePolicyId": "S3DeveloperAccess",
          "SourcePolicyType": "IAM Policy",
          "Statement": "DenyProductionBuckets"
        }
      ]
    }
  ]
}
```


#### Programmatic Policy Testing

```python
#!/usr/bin/env python3
# test_iam_policies.py

import boto3
import json

iam = boto3.client('iam')

def test_policy_permissions(policy_document, actions, resources):
    """
    Test if a policy allows specific actions on resources
    """
    results = iam.simulate_custom_policy(
        PolicyInputList=[json.dumps(policy_document)],
        ActionNames=actions,
        ResourceArns=resources
    )
    
    print("Policy Simulation Results:")
    print("=" * 60)
    
    for result in results['EvaluationResults']:
        action = result['EvalActionName']
        resource = result['EvalResourceName']
        decision = result['EvalDecision']
        
        status = "✓ ALLOWED" if decision == "allowed" else "✗ DENIED"
        print(f"{status}: {action} on {resource}")
        
        if 'MatchedStatements' in result:
            for statement in result['MatchedStatements']:
                print(f"  Matched: {statement.get('SourcePolicyId', 'N/A')}")
    
    print("=" * 60)

# Example usage
policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": "s3:*",
        "Resource": "arn:aws:s3:::dev-*"
    }]
}

test_policy_permissions(
    policy,
    ['s3:GetObject', 's3:PutObject', 's3:DeleteBucket'],
    ['arn:aws:s3:::dev-bucket/*', 'arn:aws:s3:::prod-bucket/*']
)
```


### Lab 6: Implementing SAML Federation

**Objective:** Set up SAML federation with an external IdP for SSO.

#### Step 1: Create SAML Identity Provider in AWS

```bash
# Download IdP metadata from your SAML provider (Okta, Azure AD, etc.)
# Save it as idp-metadata.xml

# Create SAML provider in AWS
aws iam create-saml-provider \
    --saml-metadata-document file://idp-metadata.xml \
    --name CorporateIdP

# Output:
# arn:aws:iam::123456789012:saml-provider/CorporateIdP
```


#### Step 2: Create IAM Role for SAML Federation

```bash
# Create trust policy for SAML
cat > saml-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:saml-provider/CorporateIdP"
      },
      "Action": "sts:AssumeRoleWithSAML",
      "Condition": {
        "StringEquals": {
          "SAML:aud": "https://signin.aws.amazon.com/saml"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
    --role-name CorporateIdP-Developers \
    --assume-role-policy-document file://saml-trust-policy.json \
    --description "Federated access for corporate developers"

# Attach policies
aws iam attach-role-policy \
    --role-name CorporateIdP-Developers \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```


#### Step 3: Configure IdP

In your SAML IdP (Okta, Azure AD, etc.):

1. Add AWS as a SAML application
2. Configure attribute mapping:

```
https://aws.amazon.com/SAML/Attributes/Role → 
arn:aws:iam::123456789012:saml-provider/CorporateIdP,arn:aws:iam::123456789012:role/CorporateIdP-Developers

https://aws.amazon.com/SAML/Attributes/RoleSessionName → 
${user.email}
```

3. Assign users/groups to the application

#### Step 4: Test Federation

Users can now:

1. Log into corporate IdP
2. Click AWS application
3. Get automatically signed into AWS console with federated role

## Production-Level Knowledge

### Enterprise IAM Architecture Patterns

Production environments require sophisticated IAM architectures that balance security, usability, and operational efficiency.

#### Pattern 1: Multi-Account Organization with IAM Identity Center

For enterprises with multiple AWS accounts:

**Architecture:**

```
Management Account (Organizations)
├── IAM Identity Center
│   ├── Identity Source (Azure AD/Okta)
│   ├── Permission Sets
│   └── Account Assignments
├── Security Account (Audit/Logging)
├── Shared Services Account (Networking)
├── Development Accounts (by team)
└── Production Accounts (by application)
```

**Benefits:**

- Centralized identity management
- Consistent permissions across accounts
- Automatic account provisioning
- Single sign-on experience

**Implementation with AWS CloudFormation:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'IAM Identity Center Permission Set for Developers'

Resources:
  DeveloperPermissionSet:
    Type: AWS::SSOAdmin::PermissionSet
    Properties:
      Name: DeveloperAccess
      Description: 'Full access to dev resources, read-only to prod'
      InstanceArn: !Ref IdentityCenterInstanceArn
      SessionDuration: PT4H
      ManagedPolicies:
        - arn:aws:iam::aws:policy/PowerUserAccess
      InlinePolicy: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Deny",
              "Action": [
                "iam:*User*",
                "iam:*AccessKey*",
                "organizations:*"
              ],
              "Resource": "*"
            }
          ]
        }

  DeveloperAccountAssignment:
    Type: AWS::SSOAdmin::Assignment
    Properties:
      InstanceArn: !Ref IdentityCenterInstanceArn
      PermissionSetArn: !GetAtt DeveloperPermissionSet.PermissionSetArn
      PrincipalId: !Ref DevelopersGroupId
      PrincipalType: GROUP
      TargetId: !Ref DevAccountId
      TargetType: AWS_ACCOUNT
```


#### Pattern 2: Service-Specific IAM Roles with Least Privilege

**Lambda Execution Role Pattern:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLogging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function:*"
    },
    {
      "Sid": "AllowS3Read",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-input-bucket",
        "arn:aws:s3:::my-input-bucket/*"
      ]
    },
    {
      "Sid": "AllowDynamoDBWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"
    },
    {
      "Sid": "AllowKMSDecrypt",
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

**EC2 Instance Profile Pattern:**

```bash
# Create role
cat > ec2-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
    --role-name WebServerRole \
    --assume-role-policy-document file://ec2-trust-policy.json

# Attach inline policy
cat > ec2-permissions.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::app-config-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:app/database-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "MyApplication"
        }
      }
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name WebServerRole \
    --policy-name WebServerPermissions \
    --policy-document file://ec2-permissions.json

# Create instance profile
aws iam create-instance-profile --instance-profile-name WebServerProfile
aws iam add-role-to-instance-profile \
    --instance-profile-name WebServerProfile \
    --role-name WebServerRole

# Launch EC2 with instance profile
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --iam-instance-profile Name=WebServerProfile \
    --subnet-id subnet-12345678
```


#### Pattern 3: Break-Glass Emergency Access

For emergency situations when normal access methods fail:

```bash
# Create emergency access role
cat > emergency-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::123456789012:user/emergency-admin"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": {
        "aws:MultiFactorAuthPresent": "true"
      },
      "IpAddress": {
        "aws:SourceIp": ["203.0.113.0/24"]
      }
    }
  }]
}
EOF

aws iam create-role \
    --role-name EmergencyAdministrator \
    --assume-role-policy-document file://emergency-trust-policy.json \
    --max-session-duration 3600  # 1 hour only

# Attach AdministratorAccess with notification
cat > emergency-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
  }]
}
EOF

aws iam attach-role-policy \
    --role-name EmergencyAdministrator \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create CloudWatch alarm for emergency role usage
aws cloudwatch put-metric-alarm \
    --alarm-name emergency-role-assumed \
    --alarm-description "Emergency admin role was assumed" \
    --metric-name AssumeRole \
    --namespace AWS/STS \
    --statistic Sum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=RoleName,Value=EmergencyAdministrator \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```


### Comprehensive Audit and Compliance

#### CloudTrail Integration

```bash
# Ensure CloudTrail is logging IAM events
aws cloudtrail create-trail \
    --name iam-audit-trail \
    --s3-bucket-name iam-audit-logs-bucket \
    --include-global-service-events \
    --is-multi-region-trail \
    --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name iam-audit-trail

# Create event selector for data events
aws cloudtrail put-event-selectors \
    --trail-name iam-audit-trail \
    --event-selectors '[{
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": []
    }]'
```


#### IAM Access Analyzer Setup

```bash
# Create analyzer
aws accessanalyzer create-analyzer \
    --analyzer-name organization-analyzer \
    --type ORGANIZATION

# Create archive rule for known external access
aws accessanalyzer create-archive-rule \
    --analyzer-name organization-analyzer \
    --rule-name archive-partner-access \
    --filter '{
      "principal": {
        "contains": ["arn:aws:iam::999999999999:root"]
      }
    }'
```


#### Automated Compliance Checks

```python
#!/usr/bin/env python3
# iam_compliance_checker.py

import boto3
from datetime import datetime, timedelta

iam = boto3.client('iam')
sns = boto3.client('sns')

def check_mfa_enabled():
    """Check if all users have MFA enabled"""
    users = iam.list_users()['Users']
    non_compliant = []
    
    for user in users:
        mfa_devices = iam.list_mfa_devices(UserName=user['UserName'])['MFADevices']
        if not mfa_devices:
            non_compliant.append(user['UserName'])
    
    return non_compliant

def check_access_key_rotation():
    """Check for access keys older than 90 days"""
    users = iam.list_users()['Users']
    old_keys = []
    
    for user in users:
        access_keys = iam.list_access_keys(UserName=user['UserName'])['AccessKeyMetadata']
        
        for key in access_keys:
            age = datetime.now(key['CreateDate'].tzinfo) - key['CreateDate']
            if age > timedelta(days=90) and key['Status'] == 'Active':
                old_keys.append({
                    'User': user['UserName'],
                    'KeyId': key['AccessKeyId'],
                    'Age': age.days
                })
    
    return old_keys

def check_unused_credentials():
    """Find users with credentials not used in 90+ days"""
    credential_report = iam.generate_credential_report()
    # Wait for report generation
    while credential_report['State'] != 'COMPLETE':
        time.sleep(2)
        credential_report = iam.generate_credential_report()
    
    report = iam.get_credential_report()['Content'].decode('utf-8')
    # Parse CSV and find unused credentials
    # Implementation details omitted for brevity
    
    return []

def send_compliance_report(findings):
    """Send compliance findings to security team"""
    message = "IAM Compliance Report\n\n"
    
    if findings['no_mfa']:
        message += f"Users without MFA: {', '.join(findings['no_mfa'])}\n\n"
    
    if findings['old_keys']:
        message += "Access keys requiring rotation:\n"
        for key in findings['old_keys']:
            message += f"  - {key['User']}: {key['KeyId']} ({key['Age']} days old)\n"
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:security-compliance',
        Subject='IAM Compliance Report',
        Message=message
    )

def lambda_handler(event, context):
    """Lambda handler for scheduled compliance checks"""
    findings = {
        'no_mfa': check_mfa_enabled(),
        'old_keys': check_access_key_rotation(),
        'unused_creds': check_unused_credentials()
    }
    
    if any(findings.values()):
        send_compliance_report(findings)
    
    return {'statusCode': 200, 'findings': findings}
```

Deploy this Lambda on a schedule:

```bash
# Create Lambda execution role
# Create Lambda function
# Create EventBridge rule to run daily
aws events put-rule \
    --name daily-iam-compliance-check \
    --schedule-expression "cron(0 9 * * ? *)" \
    --state ENABLED

aws events put-targets \
    --rule daily-iam-compliance-check \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:iam-compliance-checker"
```


### Advanced IAM Patterns

#### Attribute-Based Access Control (ABAC)

ABAC uses tags to control access, enabling more scalable permission management:

```bash
# Tag resources
aws ec2 create-tags \
    --resources i-1234567890abcdef0 \
    --tags Key=Project,Value=WebApp Key=Environment,Value=Dev

# Tag users
aws iam tag-user \
    --user-name alice \
    --tags Key=Project,Value=WebApp Key=Role,Value=Developer

# Create ABAC policy
cat > abac-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Project": "${aws:PrincipalTag/Project}",
          "ec2:ResourceTag/Environment": "Dev"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Project": "${aws:PrincipalTag/Project}"
        },
        "ForAllValues:StringEquals": {
          "aws:TagKeys": ["Project", "Environment", "Owner"]
        }
      }
    }
  ]
}
EOF
```

Now Alice can only manage EC2 instances tagged with `Project=WebApp`.

#### Session Tags for Temporary Access

When federating users, pass session tags for fine-grained control:

```python
import boto3

sts = boto3.client('sts')

# Assume role with session tags
response = sts.assume_role(
    RoleArn='arn:aws:iam::123456789012:role/FederatedDeveloper',
    RoleSessionName='alice-session',
    DurationSeconds=3600,
    Tags=[
        {'Key': 'Project', 'Value': 'WebApp'},
        {'Key': 'CostCenter', 'Value': 'Engineering'},
        {'Key': 'Department', 'Value': 'Backend'}
    ],
    TransitiveTagKeys=['Project', 'CostCenter']  # These tags pass to subsequent sessions
)
```


## Tips \& Best Practices

### Security Best Practices

**Tip 1: Never Use Root Account for Day-to-Day Operations**

The root account has unrestricted access to everything. Protect it:

```bash
# Enable MFA on root
# Set up billing alerts (root-only action)
aws budgets create-budget \
    --account-id 123456789012 \
    --budget file://root-budget.json

# Lock away root credentials
# Create admin IAM user for daily tasks
```

**Tip 2: Implement MFA Delete for S3 Buckets**

Prevent accidental or malicious deletion:

```bash
# Enable versioning first
aws s3api put-bucket-versioning \
    --bucket critical-data-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA delete (requires root account with MFA)
aws s3api put-bucket-versioning \
    --bucket critical-data-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 123456"
```

**Tip 3: Use IAM Roles Everywhere Possible**

Roles provide temporary credentials and eliminate the risk of exposed long-term access keys:

- EC2 instances → Instance profiles
- Lambda functions → Execution roles
- ECS tasks → Task roles
- CI/CD pipelines → OIDC federation with roles

**Tip 4: Rotate Credentials Regularly**

```bash
# Create script to find and rotate old keys
aws iam list-access-keys --user-name alice

# Create new key
NEW_KEY=$(aws iam create-access-key --user-name alice)

# Test new key works
# Update applications to use new key

# Deactivate old key
aws iam update-access-key \
    --user-name alice \
    --access-key-id AKIAIOSFODNN7EXAMPLE \
    --status Inactive

# After verification period, delete old key
aws iam delete-access-key \
    --user-name alice \
    --access-key-id AKIAIOSFODNN7EXAMPLE
```

**Tip 5: Use AWS Secrets Manager for Credentials**

Don't hardcode credentials in code or config files:

```bash
# Store database credentials
aws secretsmanager create-secret \
    --name prod/database/credentials \
    --secret-string '{"username":"admin","password":"SecureP@ssw0rd!"}'

# Enable automatic rotation
aws secretsmanager rotate-secret \
    --secret-id prod/database/credentials \
    --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
    --rotation-rules AutomaticallyAfterDays=30
```

**Application code:**

```python
import boto3
import json

secretsmanager = boto3.client('secretsmanager')

def get_database_credentials():
    response = secretsmanager.get_secret_value(SecretId='prod/database/credentials')
    return json.loads(response['SecretString'])

creds = get_database_credentials()
# Use creds['username'] and creds['password']
```


### Policy Design Tips

**Tip 6: Start with AWS Managed Policies, Refine with Custom**

AWS managed policies are a good starting point:

- `ReadOnlyAccess` - View everything
- `PowerUserAccess` - Everything except IAM management
- `ViewOnlyAccess` - Similar to ReadOnly but more restrictive

Then create custom policies to tighten or extend permissions.

**Tip 7: Use Policy Conditions for Defense in Depth**

Always add conditions where applicable:

```json
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": {
      "s3:x-amz-server-side-encryption": "AES256"
    },
    "IpAddress": {
      "aws:SourceIp": "203.0.113.0/24"
    }
  }
}
```

This ensures objects are encrypted and uploads come from trusted network.

**Tip 8: Use NotAction Carefully**

`NotAction` can be dangerous—it allows everything except listed actions:

```json
{
  "Effect": "Allow",
  "NotAction": "iam:*",
  "Resource": "*"
}
```

This allows everything except IAM actions. Be careful—new AWS services are automatically allowed.

**Tip 9: Leverage Policy Validators**

Before deploying policies:

```bash
# Validate policy syntax
aws iam get-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --version-id v1 \
    | jq '.PolicyVersion.Document' \
    | python -m json.tool

# Use IAM Access Analyzer policy validation
aws accessanalyzer validate-policy \
    --policy-document file://my-policy.json \
    --policy-type IDENTITY_POLICY
```

**Tip 10: Document Your Policies**

Use `Sid` (statement ID) to document intent:

```json
{
  "Sid": "AllowDevelopersToManageTheirOwnS3Buckets",
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::dev-${aws:username}-*"
}
```


### Operational Tips

**Tip 11: Use AWS Organizations for Multi-Account Management**

```bash
# Create organization
aws organizations create-organization --feature-set ALL

# Create OUs
aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Development

# Apply SCPs
aws organizations attach-policy \
    --policy-id p-xyz789 \
    --target-id ou-abc123
```

**Tip 12: Implement Policy Versioning**

Customer-managed policies support versioning:

```bash
# Create new version
aws iam create-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --policy-document file://updated-policy.json \
    --set-as-default

# Rollback if needed
aws iam set-default-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --version-id v2
```

**Tip 13: Use CloudWatch Logs Insights for IAM Auditing**

```sql
fields @timestamp, userIdentity.principalId, eventName, sourceIPAddress, errorCode
| filter eventSource = "iam.amazonaws.com"
| filter eventName like /^(Create|Delete|Update|Attach|Detach)/
| sort @timestamp desc
| limit 100
```

**Tip 14: Set Up Budget Alerts for IAM Operations**

While IAM itself is free, monitor related costs:

```bash
# Monitor CloudTrail costs (IAM events are logged here)
aws cloudwatch put-metric-alarm \
    --alarm-name high-cloudtrail-costs \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=AWSCloudTrail
```

**Tip 15: Implement Just-in-Time (JIT) Access**

For privileged operations, grant temporary elevated access:

```python
# JIT access request system
def grant_temporary_admin_access(user_arn, duration_hours=1):
    sts = boto3.client('sts')
    iam = boto3.client('iam')
    
    # Create temporary policy
    temp_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": "*",
            "Resource": "*"
        }]
    }
    
    # Attach to user temporarily
    policy_name = f"TempAdmin-{int(time.time())}"
    iam.put_user_policy(
        UserName=user_arn.split('/')[-1],
        PolicyName=policy_name,
        PolicyDocument=json.dumps(temp_policy)
    )
    
    # Schedule removal
    scheduler = boto3.client('scheduler')
    scheduler.create_schedule(
        Name=f"remove-{policy_name}",
        ScheduleExpression=f"at({(datetime.now() + timedelta(hours=duration_hours)).isoformat()})",
        Target={
            'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:RemoveTempPolicy',
            'Input': json.dumps({'user': user_arn, 'policy': policy_name})
        }
    )
    
    return f"Granted admin access for {duration_hours} hours"
```


### Monitoring and Auditing Tips

**Tip 16: Enable IAM Access Advisor**

Track service-level permissions usage:

```bash
# Generate access advisor report
JOB_ID=$(aws iam generate-service-last-accessed-details \
    --arn arn:aws:iam::123456789012:user/alice \
    --query 'JobId' \
    --output text)

# Check status
aws iam get-service-last-accessed-details --job-id $JOB_ID

# Identify unused permissions
# Remove policies for services not accessed in 90+ days
```

**Tip 17: Set Up Real-Time Security Alerts**

```bash
# Create EventBridge rule for IAM changes
aws events put-rule \
    --name iam-policy-changes \
    --event-pattern '{
      "source": ["aws.iam"],
      "detail-type": ["AWS API Call via CloudTrail"],
      "detail": {
        "eventName": [
          "PutUserPolicy",
          "PutRolePolicy",
          "PutGroupPolicy",
          "AttachUserPolicy",
          "AttachRolePolicy",
          "AttachGroupPolicy"
        ]
      }
    }'

# Target SNS for alerts
aws events put-targets \
    --rule iam-policy-changes \
    --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:123456789012:security-alerts"
```

**Tip 18: Implement Separation of Duties**

No single person should have complete control:

```
User Management → Security Team
Policy Creation → DevOps Team
Permission Assignment → Team Leads
Audit Access → Compliance Team
```

**Tip 19: Use AWS Config for IAM Compliance**

```bash
# Enable Config rules for IAM
aws configservice put-config-rule \
    --config-rule '{
      "ConfigRuleName": "iam-user-mfa-enabled",
      "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "IAM_USER_MFA_ENABLED"
      }
    }'

aws configservice put-config-rule \
    --config-rule '{
      "ConfigRuleName": "iam-root-access-key-check",
      "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "IAM_ROOT_ACCESS_KEY_CHECK"
      }
    }'
```

**Tip 20: Create an IAM Hygiene Dashboard**

```python
# iam_dashboard.py
import boto3
from datetime import datetime, timedelta

def create_iam_hygiene_dashboard():
    cloudwatch = boto3.client('cloudwatch')
    iam = boto3.client('iam')
    
    # Collect metrics
    users = iam.list_users()['Users']
    users_without_mfa = len([u for u in users if not iam.list_mfa_devices(UserName=u['UserName'])['MFADevices']])
    total_users = len(users)
    
    # Publish custom metrics
    cloudwatch.put_metric_data(
        Namespace='IAM/Hygiene',
        MetricData=[
            {
                'MetricName': 'UsersWithoutMFA',
                'Value': users_without_mfa,
                'Unit': 'Count',
                'Timestamp': datetime.now()
            },
            {
                'MetricName': 'TotalUsers',
                'Value': total_users,
                'Unit': 'Count',
                'Timestamp': datetime.now()
            },
            {
                'MetricName': 'MFAComplianceRate',
                'Value': ((total_users - users_without_mfa) / total_users * 100) if total_users > 0 else 0,
                'Unit': 'Percent',
                'Timestamp': datetime.now()
            }
        ]
    )

# Run this on a schedule to track IAM health over time
```


## Pitfalls \& Remedies

### Pitfall 1: Overly Permissive Policies with Wildcard Resources

**Problem:** Policies using `"Resource": "*"` with broad actions, granting unintended access across all resources in the account.

**Why It Happens:**

- Quick prototyping without refinement
- Lack of understanding of resource-specific ARNs
- Copy-pasting examples without modification
- Pressure to "just make it work"

**Impact:**

- Privilege escalation opportunities
- Lateral movement for attackers
- Compliance violations (least privilege principle)
- Difficulty tracking who has access to what

**Example of the Problem:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": "*"
  }]
}
```

This allows S3 operations on ALL buckets in the account, including production data.

**Remedy:**

**Step 1: Identify Overly Permissive Policies**

```bash
# List all customer-managed policies
aws iam list-policies --scope Local --query 'Policies[*].[PolicyName,Arn]' --output table

# Check each policy for wildcards
for policy_arn in $(aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text); do
    echo "Checking $policy_arn"
    aws iam get-policy-version \
        --policy-arn $policy_arn \
        --version-id $(aws iam get-policy --policy-arn $policy_arn --query 'Policy.DefaultVersionId' --output text) \
        --query 'PolicyVersion.Document' | grep -q '"Resource": "\*"' && echo "⚠️  WARNING: Wildcard resource in $policy_arn"
done
```

**Step 2: Use IAM Access Analyzer to Find Issues**

```bash
# Validate policy
aws accessanalyzer validate-policy \
    --policy-document file://my-policy.json \
    --policy-type IDENTITY_POLICY \
    --query 'findings[?findingType==`WARNING`]'
```

**Step 3: Refine to Specific Resources**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    },
    {
      "Sid": "ManageSpecificBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-bucket",
        "arn:aws:s3:::staging-application-bucket"
      ]
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-bucket/*",
        "arn:aws:s3:::staging-application-bucket/*"
      ]
    }
  ]
}
```

**Step 4: Use Policy Generation from CloudTrail**

IAM Access Analyzer can generate least-privilege policies based on actual usage:

```bash
# Start policy generation
JOB_ID=$(aws accessanalyzer start-policy-generation \
    --policy-generation-details '{
      "principalArn": "arn:aws:iam::123456789012:role/MyApplicationRole"
    }' \
    --cloud-trail-details '{
      "trails": [{
        "cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-events",
        "regions": ["us-east-1"]
      }],
      "startTime": "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)'",
      "endTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }' \
    --query 'jobId' \
    --output text)

# Wait for generation to complete
aws accessanalyzer get-generated-policy --job-id $JOB_ID

# Review and apply the generated policy
```

**Prevention:**

- Always start with deny-all, then explicitly allow what's needed
- Use IAM policy simulator to test before deploying
- Implement policy review process
- Set up automated scanning for overly permissive policies
- Use AWS Config rules to detect violations

***

### Pitfall 2: Hardcoded Credentials in Code or Configuration Files

**Problem:** Access keys embedded directly in application code, configuration files, or worse—committed to version control.

**Why It Happens:**

- Convenience during development
- Lack of awareness of better alternatives
- Legacy applications not refactored
- Insufficient security training

**Impact:**

- Exposed credentials if repository is public
- Credentials leaked in CI/CD logs
- Difficult to rotate without code changes
- Compliance failures
- Potential for massive breaches

**Real-World Example:**

```python
# BAD - Never do this!
import boto3

s3 = boto3.client(
    's3',
    aws_access_key_id='AKIAIOSFODNN7EXAMPLE',
    aws_secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
)
```

**Remedy:**

**Step 1: Scan for Hardcoded Credentials**

```bash
# Use git-secrets to scan repository
git clone https://github.com/awslabs/git-secrets
cd git-secrets
make install

# Install hooks in your repository
cd /path/to/your/repo
git secrets --install
git secrets --register-aws

# Scan existing history
git secrets --scan-history

# Use truffleHog for deep scanning
docker run --rm -v /path/to/repo:/proj dxa4481/trufflehog file:///proj --regex --entropy=True
```

**Step 2: Remove Exposed Credentials from Git History**

```bash
# Use BFG Repo-Cleaner to remove secrets
java -jar bfg.jar --replace-text passwords.txt my-repo.git

# Or use git-filter-repo
git filter-repo --path-glob '**/*.py' --invert-paths --force

# After cleaning, force push
git push origin --force --all
```

**Step 3: Rotate Compromised Credentials Immediately**

```bash
# Deactivate exposed key
aws iam update-access-key \
    --user-name compromised-user \
    --access-key-id AKIAIOSFODNN7EXAMPLE \
    --status Inactive

# Create new key
NEW_KEY=$(aws iam create-access-key --user-name compromised-user)

# Delete old key after verification
aws iam delete-access-key \
    --user-name compromised-user \
    --access-key-id AKIAIOSFODNN7EXAMPLE
```

**Step 4: Implement Proper Credential Management**

**For EC2 Instances:**

```python
# GOOD - Use IAM roles
import boto3

# Boto3 automatically uses instance profile credentials
s3 = boto3.client('s3')
# No credentials needed!
```

**For Lambda Functions:**

```python
# GOOD - Use execution role
import boto3

# Lambda automatically assumes its execution role
s3 = boto3.client('s3')
```

**For Applications Needing Specific Credentials:**

```python
# GOOD - Use AWS Secrets Manager
import boto3
import json

def get_credentials():
    secretsmanager = boto3.client('secretsmanager')
    response = secretsmanager.get_secret_value(SecretId='app/external-api/credentials')
    return json.loads(response['SecretString'])

creds = get_credentials()
```

**For Local Development:**

```python
# GOOD - Use AWS CLI profiles
import boto3

# Uses credentials from ~/.aws/credentials
session = boto3.Session(profile_name='dev')
s3 = session.client('s3')
```

**Step 5: Set Up Preventive Controls**

```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
# Check for AWS credentials
if git diff --cached | grep -E 'AKIA[0-9A-Z]{16}'; then
    echo "ERROR: AWS Access Key detected!"
    echo "Please remove hardcoded credentials before committing"
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

**Prevention:**

- Never commit credentials to version control
- Use IAM roles wherever possible
- Store secrets in AWS Secrets Manager or Parameter Store
- Implement automated scanning in CI/CD pipeline
- Educate team on secure credential management

- Use AWS Config rules to detect IAM user access keys
- Rotate credentials regularly using automated tools

***

### Pitfall 3: Root Account Usage for Daily Operations

**Problem:** Using the root account (the account created when you first sign up for AWS) for routine tasks instead of creating IAM users or using federated access.

**Why It Happens:**

- Convenience—it's the first account created
- Lack of understanding about IAM best practices
- Small teams without proper governance
- "It's just a test account" mentality that persists into production

**Impact:**

- No audit trail of who performed actions
- Cannot restrict root account permissions
- Single point of compromise for entire account
- Compliance violations
- Cannot enforce MFA policies on root access
- Risk of accidental destructive actions

**Remedy:**

**Step 1: Audit Root Account Usage**

```bash
# Check CloudTrail for root account activity
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=Username,AttributeValue=root \
    --max-results 50 \
    --query 'Events[*].[EventTime,EventName,Username]' \
    --output table

# Create CloudWatch alarm for root usage
aws cloudwatch put-metric-alarm \
    --alarm-name root-account-usage \
    --alarm-description "Alert on root account usage" \
    --metric-name RootAccountUsage \
    --namespace CustomMetrics \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-security-alerts
```

**Step 2: Secure Root Account**

```bash
# Enable MFA on root account (must be done via console)
# 1. Sign in as root
# 2. Go to "My Security Credentials"
# 3. Activate MFA on root account
# 4. Choose hardware or virtual MFA device

# Delete root access keys if they exist
aws iam list-access-keys --user-name root
# If any exist, delete them immediately via console
```

**Step 3: Create Administrative IAM Users**

```bash
# Create admin user
aws iam create-user --user-name admin-alice

# Create admin group
aws iam create-group --group-name Administrators

# Attach administrator policy
aws iam attach-group-policy \
    --group-name Administrators \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Add user to group
aws iam add-user-to-group \
    --group-name Administrators \
    --user-name admin-alice

# Create console password
aws iam create-login-profile \
    --user-name admin-alice \
    --password 'TemporaryP@ssw0rd123!' \
    --password-reset-required

# Enable MFA for admin user
# User must do this through console on first login
```

**Step 4: Implement Root Account Restrictions**

```yaml
# CloudFormation StackSet to deny root usage across organization
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SCP to restrict root account usage'

Resources:
  RootAccountRestrictionSCP:
    Type: AWS::Organizations::Policy
    Properties:
      Name: DenyRootAccountUsage
      Description: Prevent root account from performing most actions
      Type: SERVICE_CONTROL_POLICY
      Content: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "DenyRootAccountUsage",
              "Effect": "Deny",
              "Action": "*",
              "Resource": "*",
              "Condition": {
                "StringLike": {
                  "aws:PrincipalArn": "arn:aws:iam::*:root"
                },
                "StringNotEquals": {
                  "aws:PrincipalArn": [
                    "arn:aws:iam::123456789012:root"
                  ]
                }
              }
            }
          ]
        }
```

**Step 5: Create Root Account Usage Monitoring**

```python
#!/usr/bin/env python3
# root_account_monitor.py

import boto3
from datetime import datetime, timedelta

cloudtrail = boto3.client('cloudtrail')
sns = boto3.client('sns')

def check_root_usage():
    """Check for root account activity in last 24 hours"""
    
    # Look up root account events
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'Username',
            'AttributeValue': 'root'
        }],
        StartTime=datetime.now() - timedelta(days=1),
        EndTime=datetime.now()
    )
    
    events = response['Events']
    
    if events:
        # Filter out read-only events
        concerning_events = [
            e for e in events 
            if not e['EventName'].startswith(('Get', 'List', 'Describe'))
        ]
        
        if concerning_events:
            message = "⚠️ ROOT ACCOUNT ACTIVITY DETECTED ⚠️\n\n"
            message += f"Number of events: {len(concerning_events)}\n\n"
            
            for event in concerning_events[:10]:  # Show first 10
                message += f"Time: {event['EventTime']}\n"
                message += f"Event: {event['EventName']}\n"
                message += f"IP: {event.get('SourceIPAddress', 'Unknown')}\n"
                message += f"User Agent: {event.get('UserAgent', 'Unknown')}\n\n"
            
            # Send alert
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:critical-security-alerts',
                Subject='🚨 Root Account Usage Detected',
                Message=message
            )
            
            return True
    
    return False

def lambda_handler(event, context):
    """Lambda handler for scheduled checks"""
    root_used = check_root_usage()
    
    return {
        'statusCode': 200,
        'rootAccountUsed': root_used
    }
```

**Step 6: Document Root Account Access Procedures**

Create a runbook for the rare cases when root access is needed:

```markdown
# Root Account Access Procedure

## When Root Access is Required
- Changing account settings (email, contact info)
- Closing AWS account
- Enabling MFA delete on S3 bucket
- Restoring IAM user permissions if all admin access is lost
- Signing up for GovCloud
- Changing payment methods (first time)

## Access Process
1. Get approval from CISO/Security team
2. Retrieve root credentials from secure storage (password manager/vault)
3. Use hardware MFA device
4. Perform required action
5. Document action in security log
6. Return credentials to secure storage
7. Notify security team of completion

## Post-Access Actions
- Review CloudTrail logs for root activity
- Verify only intended actions were performed
- Update documentation if needed
```

**Prevention:**

- Lock root credentials in secure vault (password manager)
- Enable MFA on root account
- Set up CloudWatch alarms for root usage
- Educate team about root account risks
- Use AWS Organizations SCP to restrict root usage
- Conduct regular reviews of root account activity

***

### Pitfall 4: Insufficient Cross-Account Access Controls

**Problem:** Cross-account roles configured without proper conditions, allowing unintended access or making accounts vulnerable to confused deputy attacks.

**Why It Happens:**

- Copying trust policies without understanding conditions
- Not using external IDs
- Overly permissive IP restrictions
- Lack of understanding of cross-account security models

**Impact:**

- Unauthorized cross-account access
- Confused deputy vulnerability
- Lateral movement between accounts
- Compliance violations
- Difficulty tracking access patterns

**Confused Deputy Example:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:root"
    },
    "Action": "sts:AssumeRole"
  }]
}
```

This allows ANY identity in account 333333333333 to assume the role, including a third-party service that might be tricked into accessing your account.

**Remedy:**

**Step 1: Implement External ID for Third-Party Access**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:root"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id-that-only-you-and-partner-know"
      }
    }
  }]
}
```

**Generate Strong External IDs:**

```bash
# Generate cryptographically secure external ID
EXTERNAL_ID=$(openssl rand -base64 32)
echo "External ID: $EXTERNAL_ID"
# Share this securely with the partner
```

**Step 2: Add Additional Conditions**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:role/SpecificServiceRole"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id-12345"
      },
      "IpAddress": {
        "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
      },
      "DateGreaterThan": {
        "aws:CurrentTime": "2025-01-01T00:00:00Z"
      },
      "DateLessThan": {
        "aws:CurrentTime": "2025-12-31T23:59:59Z"
      }
    }
  }]
}
```

**Step 3: Audit Existing Cross-Account Roles**

```bash
# List all roles
aws iam list-roles --query 'Roles[*].[RoleName,Arn]' --output table

# Check each role for cross-account trust
for role in $(aws iam list-roles --query 'Roles[*].RoleName' --output text); do
    echo "Checking role: $role"
    
    TRUST_POLICY=$(aws iam get-role --role-name $role --query 'Role.AssumeRolePolicyDocument')
    
    # Check if trust policy allows cross-account access
    echo "$TRUST_POLICY" | jq '.Statement[] | select(.Principal.AWS != null) | select(.Principal.AWS | type == "string" and (contains("arn:aws:iam::") and (contains(":root") or contains(":user/") or contains(":role/"))))'
    
    # Flag roles without ExternalId when trusting external accounts
    echo "$TRUST_POLICY" | jq '.Statement[] | select(.Condition.StringEquals."sts:ExternalId" == null) | select(.Principal.AWS | type == "string" and contains("arn:aws:iam::"))'
    
    echo "---"
done
```

**Step 4: Use IAM Access Analyzer for Cross-Account Findings**

```bash
# Create analyzer for organization
aws accessanalyzer create-analyzer \
    --analyzer-name org-cross-account-analyzer \
    --type ORGANIZATION

# List findings
aws accessanalyzer list-findings \
    --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-cross-account-analyzer \
    --filter '{"resourceType":{"eq":["AWS::IAM::Role"]}}' \
    --query 'findings[*].[id,resourceType,principal.AWS,condition]' \
    --output table

# Get detailed finding
aws accessanalyzer get-finding \
    --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-cross-account-analyzer \
    --id <finding-id>
```

**Step 5: Implement Cross-Account Monitoring**

```python
#!/usr/bin/env python3
# cross_account_monitor.py

import boto3
import json

cloudtrail = boto3.client('cloudtrail')
sns = boto3.client('sns')

def monitor_cross_account_assumptions():
    """Monitor AssumeRole calls from external accounts"""
    
    # Query CloudTrail for AssumeRole events
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'EventName',
            'AttributeValue': 'AssumeRole'
        }],
        MaxResults=50
    )
    
    suspicious_assumptions = []
    
    for event in response['Events']:
        event_data = json.loads(event['CloudTrailEvent'])
        
        # Check if assumption came from external account
        if 'userIdentity' in event_data:
            principal_account = event_data['userIdentity'].get('accountId')
            our_account = boto3.client('sts').get_caller_identity()['Account']
            
            if principal_account and principal_account != our_account:
                # External account assumed role
                suspicious_assumptions.append({
                    'time': event['EventTime'],
                    'external_account': principal_account,
                    'role_assumed': event_data['requestParameters']['roleArn'],
                    'source_ip': event_data['sourceIPAddress'],
                    'external_id_used': event_data['requestParameters'].get('externalId', 'NONE')
                })
    
    if suspicious_assumptions:
        message = "Cross-Account Role Assumptions Detected:\n\n"
        for assumption in suspicious_assumptions:
            message += f"Time: {assumption['time']}\n"
            message += f"External Account: {assumption['external_account']}\n"
            message += f"Role: {assumption['role_assumed']}\n"
            message += f"Source IP: {assumption['source_ip']}\n"
            message += f"External ID: {assumption['external_id_used']}\n\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:security-alerts',
            Subject='Cross-Account Role Assumptions',
            Message=message
        )
    
    return len(suspicious_assumptions)

def lambda_handler(event, context):
    count = monitor_cross_account_assumptions()
    return {'statusCode': 200, 'assumptionCount': count}
```

**Step 6: Implement Least Privilege for Cross-Account Roles**

Don't grant full admin access to cross-account roles:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::shared-reports-bucket",
        "arn:aws:s3:::shared-reports-bucket/*"
      ]
    },
    {
      "Sid": "SpecificDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/SharedDataTable"
    },
    {
      "Sid": "DenyDangerousActions",
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }
  ]
}
```

**Prevention:**

- Always use ExternalId for third-party access
- Specify exact principal ARNs (not `:root`)
- Add IP restrictions when possible
- Implement time-based access with conditions
- Use IAM Access Analyzer to detect external access
- Monitor AssumeRole calls in CloudTrail
- Document all cross-account relationships

***

### Pitfall 5: Not Using Service Control Policies (SCPs) in Organizations

**Problem:** Managing permissions solely through IAM policies in individual accounts without leveraging AWS Organizations SCPs for centralized control.

**Why It Happens:**

- Not using AWS Organizations
- Lack of understanding of SCP capabilities
- Fear of breaking existing access patterns
- Decentralized AWS account management

**Impact:**

- Inconsistent security postures across accounts
- Inability to enforce organization-wide policies
- Risk of rogue accounts with excessive permissions
- Compliance challenges at scale
- No guardrails for new accounts

**Remedy:**

**Step 1: Set Up AWS Organizations**

```bash
# Create organization
aws organizations create-organization --feature-set ALL

# Verify organization
aws organizations describe-organization

# Create organizational units
aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Production

aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Development

aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Sandbox
```

**Step 2: Create Foundational SCPs**

**Deny Root Usage SCP:**

```json
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
```

**Region Restriction SCP:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyUnapprovedRegions",
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
        "aws:PrincipalArn": [
          "arn:aws:iam::*:role/OrganizationAccountAccessRole"
        ]
      }
    }
  }]
}
```

**Prevent IAM Policy Changes SCP:**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ProtectIAMRoles",
    "Effect": "Deny",
    "Action": [
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:UpdateAssumeRolePolicy"
    ],
    "Resource": [
      "arn:aws:iam::*:role/OrganizationAccountAccessRole",
      "arn:aws:iam::*:role/SecurityAuditRole"
    ]
  }]
}
```

**Require Encryption SCP:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedS3",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": ["AES256", "aws:kms"]
        }
      }
    },
    {
      "Sid": "DenyUnencryptedEBS",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:volume/*",
      "Condition": {
        "Bool": {
          "ec2:Encrypted": "false"
        }
      }
    }
  ]
}
```

**Step 3: Create and Attach SCPs**

```bash
# Create SCP
aws organizations create-policy \
    --name DenyRootUsage \
    --description "Prevent root account usage" \
    --type SERVICE_CONTROL_POLICY \
    --content file://deny-root-scp.json

# Attach to OU
aws organizations attach-policy \
    --policy-id p-abc123 \
    --target-id ou-def456

# Verify attachment
aws organizations list-policies-for-target \
    --target-id ou-def456 \
    --filter SERVICE_CONTROL_POLICY
```

**Step 4: Test SCP Impact**

Before applying broadly, test in a sandbox account:

```bash
# Attach SCP to test account
aws organizations attach-policy \
    --policy-id p-abc123 \
    --target-id 123456789012

# Test actions in the account
# Verify desired actions are blocked
# Verify necessary actions still work

# If issues arise, detach and refine
aws organizations detach-policy \
    --policy-id p-abc123 \
    --target-id 123456789012
```

**Step 5: Implement SCP Hierarchy**

```
Root (FullAWSAccess)
├── Production OU
│   ├── RequireEncryption SCP
│   ├── DenyRootUsage SCP
│   ├── RegionRestriction SCP
│   └── RequireMFA SCP
├── Development OU
│   ├── RequireEncryption SCP
│   ├── DenyRootUsage SCP
│   └── RegionRestriction SCP
└── Sandbox OU
    └── DenyProductionAccess SCP
```

**Step 6: Monitor SCP Effectiveness**

```python
#!/usr/bin/env python3
# scp_monitoring.py

import boto3
import json

organizations = boto3.client('organizations')
cloudtrail = boto3.client('cloudtrail')

def check_scp_denials():
    """Monitor for actions denied by SCPs"""
    
    # Query CloudTrail for denied actions
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'ErrorCode',
            'AttributeValue': 'AccessDenied'
        }],
        MaxResults=50
    )
    
    scp_denials = []
    
    for event in response['Events']:
        event_data = json.loads(event['CloudTrailEvent'])
        
        # Check if denial was due to SCP
        if 'errorMessage' in event_data:
            if 'service control policy' in event_data['errorMessage'].lower():
                scp_denials.append({
                    'time': event['EventTime'],
                    'user': event_data['userIdentity']['arn'],
                    'action': event['EventName'],
                    'account': event_data['userIdentity'].get('accountId'),
                    'error': event_data['errorMessage']
                })
    
    return scp_denials

def audit_scp_coverage():
    """Audit which accounts have SCPs applied"""
    
    # List all accounts
    accounts = organizations.list_accounts()['Accounts']
    
    coverage = {}
    
    for account in accounts:
        if account['Status'] == 'ACTIVE':
            # Get policies for account
            policies = organizations.list_policies_for_target(
                TargetId=account['Id'],
                Filter='SERVICE_CONTROL_POLICY'
            )
            
            coverage[account['Id']] = {
                'name': account['Name'],
                'scp_count': len(policies['Policies']),
                'policies': [p['Name'] for p in policies['Policies']]
            }
    
    return coverage

def lambda_handler(event, context):
    denials = check_scp_denials()
    coverage = audit_scp_coverage()
    
    return {
        'statusCode': 200,
        'scp_denials': len(denials),
        'accounts_covered': len(coverage)
    }
```

**Prevention:**

- Enable AWS Organizations for all multi-account setups
- Start with permissive SCPs and gradually tighten
- Test SCPs in sandbox accounts first
- Document the purpose of each SCP
- Review and update SCPs quarterly
- Monitor CloudTrail for SCP-denied actions
- Use SCPs as guardrails, not primary access control

***

### Pitfall 6: Neglecting IAM Policy Size Limits

**Problem:** Creating overly complex policies that exceed AWS size limits, causing deployment failures or forcing workarounds that compromise security.

**Why It Happens:**

- Adding permissions incrementally without refactoring
- Not understanding size limits
- Trying to implement ABAC with excessive conditions
- Copying large policy examples without optimization

**Impact:**

- Policy creation failures
- Deployment pipeline breakages
- Forced use of inline policies (harder to manage)
- Workarounds that reduce security
- Maintenance nightmares

**Policy Size Limits:**

- Managed policy: 6,144 characters
- Inline policy: 2,048 characters (user), 10,240 (role/group)
- Resource-based policy: Varies by service

**Remedy:**

**Step 1: Identify Oversized Policies**

```bash
# Check policy sizes
for policy_arn in $(aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text); do
    VERSION_ID=$(aws iam get-policy --policy-arn $policy_arn --query 'Policy.DefaultVersionId' --output text)
    
    POLICY_DOC=$(aws iam get-policy-version \
        --policy-arn $policy_arn \
        --version-id $VERSION_ID \
        --query 'PolicyVersion.Document' \
        --output json)
    
    SIZE=$(echo "$POLICY_DOC" | wc -c)
    
    if [ $SIZE -gt 5000 ]; then
        echo "⚠️  Large policy: $policy_arn ($SIZE characters)"
    fi
done
```

**Step 2: Optimize Policy Structure**

**Before (Verbose):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket1/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket2/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket3/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::bucket1/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::bucket2/*"
    }
  ]
}
```

**After (Optimized):**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": [
      "arn:aws:s3:::bucket1/*",
      "arn:aws:s3:::bucket2/*",
      "arn:aws:s3:::bucket3/*"
    ]
  }]
}
```

**Step 3: Use Wildcards Strategically**

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": [
      "arn:aws:s3:::app-*-dev",
      "arn:aws:s3:::app-*-dev/*"
    ]
  }]
}
```

This matches `app-web-dev`, `app-api-dev`, etc.

**Step 4: Split Large Policies**

Instead of one massive policy, create multiple focused policies:

```bash
# Create separate policies for different services
aws iam create-policy \
    --policy-name S3DeveloperAccess \
    --policy-document file://s3-policy.json

aws iam create-policy \
    --policy-name DynamoDBDeveloperAccess \
    --policy-document file://dynamodb-policy.json

aws iam create-policy \
    --policy-name LambdaDeveloperAccess \
    --policy-document file://lambda-policy.json

# Attach all to group
aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/S3DeveloperAccess

aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/DynamoDBDeveloperAccess

aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/LambdaDeveloperAccess
```

**Step 5: Use Permission Boundaries for Large Permission Sets**

Instead of attaching many policies, use a permission boundary:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:*",
      "dynamodb:*",
      "lambda:*",
      "ec2:Describe*",
      "ec2:Get*",
      "logs:*",
      "cloudwatch:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
      }
    }
  }]
}
```

Set as permission boundary, then attach specific policies for actual permissions.

**Step 6: Leverage Resource Tags**

Use ABAC to reduce policy size:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ec2:*",
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
      }
    }
  }]
}
```

This one statement handles all teams without listing each one.

**Prevention:**

- Design policies for scalability from the start
- Use wildcards and variables effectively
- Split large policies into logical modules
- Leverage ABAC for scalable access control
- Regular policy reviews and refactoring
- Monitor policy sizes in CI/CD pipeline

***

### Pitfall 7: Improper Handling of Temporary Security Credentials

**Problem:** Treating temporary credentials (from STS) like permanent access keys, leading to expiration issues, hardcoded temporary tokens, or failed renewals.

**Why It Happens:**

- Lack of understanding of STS credential lifecycle
- Poor error handling for expired credentials
- Not implementing automatic refresh mechanisms
- Storing temporary credentials permanently

**Impact:**

- Application outages when credentials expire
- Race conditions during credential refresh
- Security risks if temporary credentials are exposed
- Difficult debugging of intermittent failures

**Remedy:**

**Step 1: Understand Credential Expiration**

```python
#!/usr/bin/env python3
# check_credential_expiration.py

import boto3
import json
from datetime import datetime, timezone

def check_credentials():
    """Check if current credentials are about to expire"""
    
    sts = boto3.client('sts')
    
    try:
        # Get caller identity
        identity = sts.get_caller_identity()
        
        # If using temporary credentials, check expiration
        if ':assumed-role/' in identity['Arn']:
            # Get session token info
            # Note: No direct API to check expiration, must track manually
            print(f"Using temporary credentials: {identity['Arn']}")
            print("⚠️  Implement expiration tracking in your application")
        else:
            print(f"Using permanent credentials: {identity['Arn']}")
            print("Consider using roles instead")
    
    except Exception as e:
        print(f"Error: {e}")
        print("Credentials may be expired or invalid")

if __name__ == "__main__":
    check_credentials()
```

**Step 2: Implement Automatic Credential Refresh**

```python
#!/usr/bin/env python3
# auto_refresh_credentials.py

import boto3
from datetime import datetime, timedelta, timezone
import threading
import time

class RefreshableCredentials:
    """Auto-refreshing temporary credentials"""
    
    def __init__(self, role_arn, external_id=None):
        self.role_arn = role_arn
        self.external_id = external_id
        self.credentials = None
        self.expiration = None
        self.lock = threading.Lock()
        
        # Initial credential fetch
        self._refresh_credentials()
        
        # Start background refresh thread
        self.refresh_thread = threading.Thread(target=self._auto_refresh, daemon=True)
        self.refresh_thread.start()
    
    def _refresh_credentials(self):
        """Refresh temporary credentials"""
        with self.lock:
            sts = boto3.client('sts')
            
            assume_role_params = {
                'RoleArn': self.role_arn,
                'RoleSessionName': f'session-{int(time.time())}',
                'DurationSeconds': 3600  # 1 hour
            }
            
            if self.external_id:
                assume_role_params['ExternalId'] = self.external_id
            
            response = sts.assume_role(**assume_role_params)
            
            self.credentials = response['Credentials']
            self.expiration = response['Credentials']['Expiration']
            
            print(f"Credentials refreshed. Expire at: {self.expiration}")
    
    def _auto_refresh(self):
        """Background thread to auto-refresh credentials"""
        while True:
            if self.expiration:
                # Refresh 5 minutes before expiration
                time_until_expiry = (self.expiration - datetime.now(timezone.utc)).total_seconds()
                
                if time_until_expiry < 300:  # 5 minutes
                    print("Credentials expiring soon, refreshing...")
                    try:
                        self._refresh_credentials()
                    except Exception as e:
                        print(f"Failed to refresh credentials: {e}")
            
            time.sleep(60)  # Check every minute
    
    def get_boto3_session(self):
        """Get boto3 session with current credentials"""
        with self.lock:
            return boto3.Session(
                aws_access_key_id=self.credentials['AccessKeyId'],
                aws_secret_access_key=self.credentials['SecretAccessKey'],
                aws_session_token=self.credentials['SessionToken']
            )

# Usage
credentials = RefreshableCredentials(
    role_arn='arn:aws:iam::123456789012:role/MyAppRole',
    external_id='my-external-id'
)

# Use throughout application
session = credentials.get_boto3_session()
s3 = session.client('s3')
```

**Step 3: Handle Credential Expiration Gracefully**

```python
#!/usr/bin/env python3
# graceful_credential_handling.py

import boto3
from botocore.exceptions import ClientError
import time

class ResilientAWSClient:
    """AWS client with automatic retry on credential expiration"""
    
    def __init__(self, service_name, role_arn):
        self.service_name = service_name
        self.role_arn = role_arn
        self.client = None
        self._refresh_client()
    
    def _refresh_client(self):
        """Create new client with fresh credentials"""
        sts = boto3.client('sts')
        
        response = sts.assume_role(
            RoleArn=self.role_arn,
            RoleSessionName=f'session-{int(time.time())}',
            DurationSeconds=3600
        )
        
        session = boto3.Session(
            aws_access_key_id=response['Credentials']['AccessKeyId'],
            aws_secret_access_key=response['Credentials']['SecretAccessKey'],
            aws_session_token=response['Credentials']['SessionToken']
        )
        
        self.client = session.client(self.service_name)
    
    def call(self, method_name, **kwargs):
        """Call AWS API with automatic retry on expired credentials"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                method = getattr(self.client, method_name)
                return method(**kwargs)
            
            except ClientError as e:
                error_code = e.response['Error']['Code']
                
                if error_code in ['ExpiredToken', 'InvalidToken']:
                    print(f"Credentials expired, refreshing (attempt {attempt + 1}/{max_retries})")
                    self._refresh_client()
                    
                    if attempt == max_retries - 1:
                        raise
                else:
                    raise
            
            except Exception as e:
                raise

# Usage
s3_client = ResilientAWSClient('s3', 'arn:aws:iam::123456789012:role/MyAppRole')
buckets = s3_client.call('list_buckets')
```

**Step 4: Never Store Temporary Credentials Permanently**

```python
# BAD - Never do this
with open('credentials.txt', 'w') as f:
    f.write(f"ACCESS_KEY={credentials['AccessKeyId']}\n")
    f.write(f"SECRET_KEY={credentials['SecretAccessKey']}\n")
    f.write(f"SESSION_TOKEN={credentials['SessionToken']}\n")

# GOOD - Store only role ARN, fetch credentials dynamically
config = {
    'role_arn': 'arn:aws:iam::123456789012:role/MyAppRole',
    'external_id': 'my-external-id'
}

# Credentials fetched on-demand
```

**Step 5: Monitor Credential Usage**

```python
#!/usr/bin/env python3
# monitor_credential_usage.py

import boto3
from datetime import datetime, timedelta

cloudtrail = boto3.client('cloudtrail')

def find_expired_credential_errors():
    """Find API calls that failed due to expired credentials"""
    
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'ErrorCode',
            'AttributeValue': 'ExpiredToken'
        }],
        StartTime=datetime.now() - timedelta(hours=24),
        EndTime=datetime.now()
    )
    
    expired_errors = []
    
    for event in response['Events']:
        expired_errors.append({
            'time': event['EventTime'],
            'event': event['EventName'],
            'user': event.get('Username', 'N/A'),
            'source_ip': event.get('SourceIPAddress', 'N/A')
        })
    
    return expired_errors

# Run regularly to identify applications with credential issues
errors = find_expired_credential_errors()
if errors:
    print(f"Found {len(errors)} expired credential errors in last 24 hours")
    for error in errors:
        print(f"  - {error['time']}: {error['event']} from {error['source_ip']}")
```

**Step 6: Use AWS SDK Built-in Credential Management**

Most AWS SDKs handle credential refresh automatically:

```python
# Python boto3 - automatic refresh
# When using instance profile or ECS task role
import boto3

# SDK automatically refreshes credentials
s3 = boto3.client('s3')
buckets = s3.list_buckets()  # Works even if credentials expire
```

```javascript
// JavaScript/Node.js
const AWS = require('aws-sdk');

// Automatic credential refresh with IAM role
const s3 = new AWS.S3();

s3.listBuckets((err, data) => {
  if (err) console.log(err);
  else console.log(data);
});
```

**Prevention:**

- Use IAM roles wherever possible (EC2, Lambda, ECS)
- Implement automatic credential refresh
- Handle expiration errors gracefully
- Never store temporary credentials permanently
- Monitor CloudTrail for ExpiredToken errors
- Use AWS SDK credential providers
- Set appropriate session durations

***

## Chapter Summary

IAM is the foundation of AWS security, controlling who can access which resources under what conditions. Mastering IAM requires understanding its components (users, groups, roles, policies), implementing least privilege access, and following security best practices throughout the credential lifecycle.

**Key Takeaways:**

- **IAM is global:** Resources created in IAM are available across all AWS Regions, simplifying management but requiring careful planning
- **Roles over users:** Prefer IAM roles with temporary credentials over IAM users with long-term access keys to reduce security risks
- **Least privilege is non-negotiable:** Grant only the minimum permissions required for each task, using fine-grained policies with specific resources and conditions
- **Defense in depth:** Layer multiple security controls including MFA, IP restrictions, permission boundaries, and SCPs for comprehensive protection
- **Cross-account access requires care:** Use external IDs, specific principals, and conditions to prevent confused deputy vulnerabilities
- **Federation scales better:** For organizations with many users, implement SAML or OIDC federation instead of creating individual IAM users
- **Audit continuously:** Use CloudTrail, IAM Access Analyzer, and automated compliance checks to detect and remediate security issues

Understanding IAM deeply enables you to build secure, scalable, and compliant AWS architectures. The patterns and practices in this chapter form the security foundation for all subsequent services and solutions.

In Chapter 3, we'll explore Amazon VPC, which provides the network isolation and segmentation that complements IAM's identity-based access controls.

## Hands-On Lab Exercise

**Objective:** Build a complete IAM architecture for a three-tier application with proper separation of duties, least privilege access, and audit capabilities.

**Scenario:** You're setting up IAM for a web application with:

- Frontend developers (need S3, CloudFront)
- Backend developers (need Lambda, DynamoDB, API Gateway)
- Database administrators (need RDS)
- DevOps team (need full infrastructure access)
- Auditors (need read-only access)

**Exercise Steps:**

1. **Create User Groups with Least Privilege**
    - Create groups for each role
    - Attach appropriate managed and custom policies
    - Implement permission boundaries
2. **Set Up Cross-Account Access**
    - Create role in "production" account
    - Configure trust policy with external ID
    - Test assumption from "development" account
3. **Implement MFA Requirements**
    - Configure MFA for all users
    - Create policy requiring MFA for sensitive actions
    - Test MFA enforcement
4. **Create Service Roles**
    - Lambda execution role
    - EC2 instance profile
    - ECS task role
5. **Configure Audit Trail**
    - Enable CloudTrail for IAM events
    - Create IAM Access Analyzer
    - Set up CloudWatch alarms for suspicious activity
6. **Test and Validate**
    - Use IAM Policy Simulator
    - Attempt unauthorized actions
    - Verify least privilege implementation

**Expected Outcomes:**

- Functional IAM architecture with proper separation
- All users have MFA enabled
- Audit trail capturing all IAM changes
- Documented policies and procedures

**Cleanup:**

```bash
# Delete users, groups, roles, policies created during exercise
# Be careful not to delete production IAM resources
```


## Review Questions

1. **What is the difference between an IAM user and an IAM role?**
a) Users have permanent credentials, roles provide temporary credentials
b) Users are global, roles are regional
c) Users can have policies, roles cannot
d) There is no difference

**Answer: A** - Users have permanent credentials (passwords, access keys) while roles provide temporary credentials through the AssumeRole API.

2. **Which IAM policy type sets the maximum permissions an identity can have?**
a) Identity-based policy
b) Resource-based policy
c) Permission boundary
d) Service control policy

**Answer: C** - Permission boundaries set the maximum permissions, even if other policies grant broader access.

3. **What is the purpose of an External ID in cross-account access?**
a) To encrypt the role assumption request
b) To prevent the confused deputy problem
c) To identify the region for the request
d) To set the session duration

**Answer: B** - External ID prevents the confused deputy vulnerability where a service might be tricked into accessing the wrong account's resources.

4. **In policy evaluation, what happens if one policy explicitly denies an action and another allows it?**
a) Allow wins
b) Deny wins
c) Most recent policy wins
d) User chooses

**Answer: B** - An explicit deny always wins over allows. This is a fundamental principle of IAM policy evaluation.

5. **Which AWS service enables federated access using corporate credentials?**
a) AWS IAM
b) AWS SSO (IAM Identity Center)
c) AWS Cognito
d) AWS Directory Service

**Answer: B** - AWS SSO (now called IAM Identity Center) enables federated access using corporate identity providers like Active Directory, Okta, or Azure AD.

6. **What is the maximum number of managed policies that can be attached to a single IAM role?**
a) 5
b) 10
c) 20
d) Unlimited

**Answer: B** - You can attach up to 10 managed policies to a single IAM role, user, or group.

7. **Which condition key requires Multi-Factor Authentication?**
a) `aws:MFARequired`
b) `aws:MultiFactorAuthPresent`
c) `aws:MFAEnabled`
d) `aws:SecureMFA`

**Answer: B** - The condition key `aws:MultiFactorAuthPresent` checks whether MFA was used for authentication.

8. **What is the primary purpose of Service Control Policies (SCPs)?**
a) Grant permissions to AWS services
b) Set maximum permissions for accounts in an organization
c) Define service-specific access rules
d) Create service-linked roles

**Answer: B** - SCPs set the maximum permissions for accounts within an AWS Organization, acting as guardrails.

9. **When should you use inline policies instead of managed policies?**
a) When you need to attach the policy to multiple identities
b) When you want version control
c) When you need a strict one-to-one relationship between policy and identity
d) Inline policies are deprecated and shouldn't be used

**Answer: C** - Inline policies are appropriate when you need a strict one-to-one relationship and want the policy deleted with the identity.

10. **What does the `aws:username` policy variable resolve to?**
a) The IAM user's email address
b) The IAM user's friendly name
c) The IAM user's ARN
d) The IAM user's account ID

**Answer: B** - `${aws:username}` resolves to the friendly name of the IAM user making the request.

11. **Which IAM feature analyzes CloudTrail logs to generate least-privilege policies?**
a) IAM Policy Simulator
b) IAM Access Analyzer policy generation
c) IAM Access Advisor
d) IAM Credential Report

**Answer: B** - IAM Access Analyzer can generate least-privilege policies based on actual API usage from CloudTrail logs.

12. **What is the maximum duration for temporary credentials from STS AssumeRole?**
a) 1 hour
b) 12 hours
c) 24 hours
d) 7 days

**Answer: B** - The maximum session duration for AssumeRole is 12 hours (configurable per role).

13. **Which statement about IAM is FALSE?**
a) IAM is a global service
b) IAM users can belong to multiple groups
c) IAM groups can be nested
d) IAM roles can be assumed cross-account

**Answer: C** - IAM groups cannot be nested (groups cannot contain other groups).

14. **What happens if you attach no policies to an IAM user?**
a) They get ReadOnly access
b) They get no permissions (implicit deny)
c) They inherit organization-level permissions
d) They get PowerUser access

**Answer: B** - With no policies attached, the user has no permissions. All actions are implicitly denied by default.

15. **Which is NOT a valid MFA device type for AWS?**
a) Virtual MFA device (Google Authenticator)
b) Hardware MFA device (Gemalto)
c) U2F security key (YubiKey)
d) SMS text message

**Answer: D** - SMS text messages are not supported as MFA devices for AWS (though they are used by some other identity providers).

***
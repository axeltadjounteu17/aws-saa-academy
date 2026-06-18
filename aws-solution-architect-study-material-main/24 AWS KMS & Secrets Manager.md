# Chapter 24: AWS KMS \& Secrets Manager

## Introduction

Data breaches expose billions of records annually, with stolen credentials and unencrypted data causing 80% of security incidents. Traditional encryption approaches—managing keys manually, storing secrets in configuration files, hardcoded credentials in application code—create security vulnerabilities that attackers exploit. AWS Key Management Service (KMS) and AWS Secrets Manager solve these problems through centralized key management, automatic encryption, credential rotation, and fine-grained access control. Understanding these services deeply is essential for Solutions Architects building secure systems that protect data at rest, in transit, and throughout the application lifecycle.

Encryption complexity has historically prevented widespread adoption. Developers must generate keys, store them securely, rotate them periodically, audit access, and integrate encryption into every service. One mistake—keys stored in code, rotation forgotten, permissions too broad—compromises security. KMS eliminates this complexity by managing encryption keys centrally with FIPS 140-2 validated Hardware Security Modules (HSMs), automatic rotation, detailed audit logs, and seamless AWS service integration. Secrets Manager extends this protection to application secrets—database passwords, API keys, OAuth tokens—automating rotation and eliminating hardcoded credentials.

This chapter builds on previous security knowledge (IAM policies from Chapter 2, Security Hub from Chapter 23) by adding encryption and secrets management. KMS integrates with services covered earlier—encrypting S3 objects, EBS volumes, RDS databases, SQS messages, Lambda environment variables. Secrets Manager connects to RDS for automatic database credential rotation. The chapter covers encryption fundamentals, key hierarchies, envelope encryption, key policies, cross-account access, automatic rotation, Lambda integration, compliance frameworks, monitoring, and building production systems where data remains encrypted from creation to deletion, credentials rotate automatically, and security teams maintain complete audit trails.

## Theory \& Concepts

### Encryption Fundamentals

**Encryption Types:**

```
Encryption at Rest:
Data stored on disk (S3, EBS, RDS, DynamoDB)
Protection: Unauthorized access to storage
Example: Stolen disk, decommissioned drives

Encryption in Transit:
Data moving over network (HTTPS, TLS, VPN)
Protection: Network eavesdropping, man-in-middle attacks
Example: Internet communication, service-to-service

Encryption in Use (Advanced):
Data encrypted during processing
Protection: Memory access, CPU inspection
Technology: Confidential computing, enclaves
Example: AWS Nitro Enclaves

Most Common: At Rest + In Transit
```

**Symmetric vs Asymmetric Encryption:**

```
Symmetric Encryption (Same Key):

Concept:
- Same key encrypts and decrypts
- Fast (hardware-accelerated)
- Suitable for large data

Algorithm: AES-256 (Advanced Encryption Standard)
Key Size: 256 bits (strongest)
Performance: Encrypt/decrypt gigabytes per second

Use Cases:
- Data at rest (S3, EBS, RDS)
- High-performance encryption
- Bulk data encryption

Example:
Plaintext: "Hello World"
Key: 32-byte random key
Encrypted: "xa9f2...encrypted binary..."
Decrypted: "Hello World" (same key)

Problem: How to share key securely?
- If attacker gets key, decrypts everything
- Key distribution challenge
- Solution: Asymmetric encryption or key hierarchy

Asymmetric Encryption (Key Pair):

Concept:
- Public key encrypts
- Private key decrypts
- Slower than symmetric
- Small data only

Algorithm: RSA-2048, RSA-4096
Key Size: 2048-4096 bits
Performance: Much slower than symmetric

Use Cases:
- TLS/SSL handshake
- Digital signatures
- Key exchange
- Small messages only

Example:
Public Key: Shared openly
Private Key: Kept secret

Plaintext: "Hello World"
Encrypted with public key: "zb7k3..."
Decrypted with private key: "Hello World"

Advantage: Public key can be shared freely
Disadvantage: 1000× slower than symmetric

Hybrid Approach (Best Practice):
1. Symmetric encryption for data (fast)
2. Asymmetric encryption for key exchange
3. Example: TLS uses both
   - RSA for key exchange
   - AES for data encryption
```

**Envelope Encryption:**

```
KMS Core Concept: Envelope Encryption

Problem: Direct encryption of large data with KMS
- KMS has 4 KB request limit
- Cannot encrypt gigabytes directly
- Network transfer too slow

Solution: Envelope Encryption

Process:
1. Generate Data Encryption Key (DEK)
   - Random 256-bit AES key
   - Generated locally (fast)

2. Encrypt Data with DEK
   - Symmetric encryption (fast)
   - Large data encrypted locally

3. Encrypt DEK with KMS CMK
   - KMS encrypts only the DEK (32 bytes)
   - Returns encrypted DEK

4. Store Both:
   - Encrypted data (large)
   - Encrypted DEK (small)

Decryption:
1. Send encrypted DEK to KMS
2. KMS decrypts DEK (returns plaintext DEK)
3. Use DEK to decrypt data locally

Visualization:

Master Key (CMK) in KMS
    ↓ encrypts
Data Encryption Key (DEK)
    ↓ encrypts
Actual Data (S3 object, EBS volume)

Stored:
- Encrypted data
- Encrypted DEK (envelope)

Benefits:
✓ Encrypt unlimited data
✓ Fast local encryption
✓ Master key never leaves KMS
✓ Only small DEK sent to KMS
✓ Better performance
✓ Lower network costs

Example: S3 Server-Side Encryption (SSE-KMS)
1. S3 generates DEK
2. S3 encrypts object with DEK
3. S3 calls KMS to encrypt DEK
4. S3 stores encrypted object + encrypted DEK
5. User requests object:
   - S3 calls KMS to decrypt DEK
   - S3 decrypts object with DEK
   - Returns plaintext to user
```


### AWS Key Management Service (KMS)

**KMS Architecture:**

```
KMS Components:

1. Customer Master Keys (CMKs):
   - Logical representation of encryption key
   - Never leaves KMS unencrypted
   - Stored in FIPS 140-2 Level 2 HSMs
   - Cannot be exported

2. CMK Types:

   AWS Managed CMK:
   - Created automatically by AWS services
   - Naming: aws/service-name (e.g., aws/s3)
   - Free (no monthly cost)
   - Automatic 3-year rotation
   - Cannot change key policy
   - Limited control

   Customer Managed CMK:
   - Created explicitly by customer
   - Full control over policies
   - $1/month per key
   - Optional annual rotation
   - Can be scheduled for deletion
   - Recommended for production

   AWS Owned CMK:
   - Owned by AWS, shared across accounts
   - Used by some services internally
   - No visibility or control
   - Free
   - Example: DynamoDB default encryption

3. Key Material Origin:

   KMS (Default):
   - Key material generated in KMS HSMs
   - Highest security
   - Recommended

   External:
   - Import your own key material
   - Compliance requirement scenarios
   - Your responsibility to secure original
   - Can set expiration date

   Custom Key Store (CloudHSM):
   - Keys stored in dedicated CloudHSM cluster
   - Single-tenant HSMs
   - Full control over HSMs
   - Higher cost ($1,000+/month)

4. Key States:

   Enabled: Available for encryption/decryption
   Disabled: Temporarily unavailable (can re-enable)
   PendingDeletion: 7-30 day waiting period (can cancel)
   PendingImport: Waiting for external key material
   Unavailable: Key material expired or deleted

KMS Architecture:

Application
    ↓ API call (Encrypt/Decrypt)
KMS Service (Regional)
    ↓ Uses
Customer Master Key (CMK)
    ↓ Stored in
Hardware Security Module (HSM)
    ↓ Backed by
KMS Master Keys (AWS-managed)

Key Hierarchy:
AWS KMS Master Keys (root)
    ↓ Protect
Customer Master Keys (CMK)
    ↓ Encrypt
Data Encryption Keys (DEK)
    ↓ Encrypt
Your Data
```

**KMS API Operations:**

```
Core Operations:

1. Encrypt:
   - Encrypt plaintext (max 4 KB)
   - Returns ciphertext
   - Use: Small data (passwords, tokens)

2. Decrypt:
   - Decrypt ciphertext
   - Returns plaintext
   - Automatic CMK detection

3. GenerateDataKey:
   - Returns plaintext DEK + encrypted DEK
   - Use: Envelope encryption
   - Most common for large data

4. GenerateDataKeyWithoutPlaintext:
   - Returns only encrypted DEK
   - Use: Pre-generate keys for future

5. ReEncrypt:
   - Decrypt with one CMK, encrypt with another
   - Use: Key migration, rotation
   - Happens entirely within KMS (secure)

API Usage Example:

# Encrypt small data directly
response = kms.encrypt(
    KeyId='alias/my-app-key',
    Plaintext=b'secret password'
)
ciphertext = response['CiphertextBlob']

# Decrypt
response = kms.decrypt(
    CiphertextBlob=ciphertext
)
plaintext = response['Plaintext']

# Generate data key for large data
response = kms.generate_data_key(
    KeyId='alias/my-app-key',
    KeySpec='AES_256'
)
plaintext_key = response['Plaintext']  # Use to encrypt data
encrypted_key = response['CiphertextBlob']  # Store with data

Request Quotas:

Shared Quota (per account per region):
- Symmetric: 30,000 requests/second
- Asymmetric: 500 requests/second
- Increasing: Request limit increase via support

Per CMK:
- No specific limit (shared quota applies)

Performance Considerations:
- Cache data keys (reduce KMS calls)
- Use envelope encryption (one KMS call per file)
- Batch operations when possible
```

**Key Policies:**

```
KMS Key Policy (Resource-Based):

Default Key Policy:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "Enable IAM policies",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::123456789012:root"
    },
    "Action": "kms:*",
    "Resource": "*"
  }]
}

Meaning: Account root has full access
Effect: IAM policies can grant KMS permissions
Without this: Only key policy controls access

Custom Key Policy Example:

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Allow administrators full access",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/KMSAdmin"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "Allow application to use key",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/ApplicationRole"
      },
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "Allow S3 to use key",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}

Key Policy Best Practices:
✓ Separate admin and usage permissions
✓ Use least privilege principle
✓ Include conditions for security
✓ Document each statement (Sid)
✓ Test policies before production
✗ Don't grant blanket kms:* to applications
✗ Don't delete default statement (locks out IAM)
```

**Cross-Account Access:**

```
Scenario: Account A owns CMK, Account B needs access

Two-Step Configuration:

Step 1: Key Policy in Account A
{
  "Sid": "Allow Account B to use key",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::222222222222:root"  // Account B
  },
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey"
  ],
  "Resource": "*"
}

Step 2: IAM Policy in Account B
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "kms:Decrypt",
      "kms:DescribeKey"
    ],
    "Resource": "arn:aws:kms:us-east-1:111111111111:key/12345678-1234-1234-1234-123456789012"
  }]
}

Both Required: Key policy AND IAM policy
Without key policy: IAM policy has no effect
Without IAM policy: Account B root has access, but not specific users

Use Case: Shared Encrypted S3 Bucket
- Bucket in Account A, encrypted with Account A CMK
- Account B needs to read objects
- Configure key policy to allow Account B
- Account B users need IAM policy for KMS

Common Issue: Missing either key policy or IAM policy
Result: Access denied errors
```


### AWS Secrets Manager

**Purpose and Architecture:**

```
Secrets Manager Purpose:
- Store secrets securely (encrypted with KMS)
- Automatic rotation (database passwords, API keys)
- Audit access (CloudTrail logging)
- Integration with AWS services
- Versioning (rollback capability)

Secret Types:

1. Database Credentials:
   - RDS MySQL, PostgreSQL, Aurora
   - Redshift, DocumentDB
   - Automatic rotation configured
   - Lambda rotation function created

2. API Keys:
   - Third-party API credentials
   - OAuth tokens
   - Service account passwords
   - Custom rotation logic

3. SSH Keys:
   - Private keys
   - Certificate authorities
   - PEM files

4. Generic Secret:
   - Key-value pairs
   - JSON documents
   - Binary data

Secret Structure:

{
  "SecretName": "prod/myapp/database",
  "SecretString": {
    "username": "admin",
    "password": "randomly-generated-password",
    "engine": "mysql",
    "host": "mydb.cluster-abc123.us-east-1.rds.amazonaws.com",
    "port": 3306,
    "dbname": "myapp"
  },
  "VersionStages": ["AWSCURRENT"],
  "VersionId": "uuid-1234-5678",
  "CreatedDate": "2025-01-15T10:30:00Z"
}

Versions:
AWSCURRENT: Current active version
AWSPENDING: New version being rotated
AWSPREVIOUS: Previous version (rollback)

Secret Rotation:
- Automatic or manual
- Configurable schedule (days)
- Zero-downtime rotation
- Automatic retry on failure
- CloudWatch monitoring
```

**Automatic Rotation:**

```
Rotation Process (RDS MySQL Example):

Phase 1: Create New Password
1. Lambda function invoked by Secrets Manager
2. Generate new random password
3. Store as AWSPENDING version
4. Test connection not yet updated

Phase 2: Set New Password
1. Connect to database using AWSCURRENT credentials
2. Execute: ALTER USER 'admin' IDENTIFIED BY 'new_password'
3. Database now accepts both old and new passwords

Phase 3: Test New Password
1. Connect using AWSPENDING credentials
2. Verify successful connection
3. Execute test query
4. If fails: Rollback, alert

Phase 4: Finish Rotation
1. Move AWSPENDING to AWSCURRENT
2. Move old AWSCURRENT to AWSPREVIOUS
3. Applications automatically use new password
4. Old password deprecated (grace period)

Zero-Downtime Guarantee:
- Applications retrieve current version
- During rotation, old password still works
- Switch happens atomically
- No application restart needed

Rotation Lambda Function:
- Created automatically for RDS
- Custom function for other secrets
- Four phases: createSecret, setSecret, testSecret, finishSecret
- Error handling and retry logic

Schedule Configuration:
- Days: 1-365
- Recommended: 30-90 days
- Too frequent: Operational overhead
- Too rare: Compliance risk

Example Schedule: Rotate every 30 days
```

**Secrets Manager vs Parameter Store:**

```
AWS Systems Manager Parameter Store (Alternative):

Standard Parameters:
- Free
- 10,000 parameters per account
- Max 4 KB value size
- No rotation
- Basic versioning

Advanced Parameters:
- $0.05 per parameter per month
- 100,000 parameters per account
- Max 8 KB value size
- Policies (expiration, notification)
- No automatic rotation

Comparison:

┌─────────────────────┬──────────────────┬──────────────────┐
│ Feature             │ Secrets Manager  │ Parameter Store  │
├─────────────────────┼──────────────────┼──────────────────┤
│ Cost                │ $0.40/secret/mo  │ Free (standard)  │
│ Automatic Rotation  │ Yes ✓            │ No ✗             │
│ RDS Integration     │ Native ✓         │ Manual ✗         │
│ Cross-account       │ Yes ✓            │ Limited          │
│ Secret Size         │ 64 KB            │ 4-8 KB           │
│ Versioning          │ Full ✓           │ Basic            │
│ Use Case            │ Secrets w/rotation│ Configuration   │
└─────────────────────┴──────────────────┴──────────────────┘

When to Use Each:

Secrets Manager:
✓ Database passwords (rotation critical)
✓ API keys requiring rotation
✓ Compliance requires rotation
✓ RDS/DocumentDB/Redshift
✓ Cross-account secret sharing

Parameter Store:
✓ Application configuration
✓ Non-sensitive settings
✓ Feature flags
✓ Static values
✓ Cost optimization (free tier)

Hybrid Approach (Common):
- Secrets Manager: Database passwords, API keys
- Parameter Store: Configuration, endpoints, feature flags
```


### Encryption Integration with AWS Services

**Service-by-Service Encryption:**

```
Amazon S3:

Server-Side Encryption Options:

1. SSE-S3 (S3-Managed Keys):
   - S3 manages keys automatically
   - AES-256 encryption
   - Free
   - Simplest option
   - Less control

2. SSE-KMS (KMS-Managed Keys):
   - Customer managed CMK
   - Audit logging (CloudTrail)
   - Key policies control access
   - Cost: KMS API calls
   - Recommended for compliance

3. SSE-C (Customer-Provided Keys):
   - Customer manages keys
   - Customer provides key with each request
   - S3 doesn't store key
   - Highest control
   - Operational complexity

4. Client-Side Encryption:
   - Encrypt before upload
   - Complete control
   - AWS SDK support
   - Highest security

Enabling SSE-KMS:
- Bucket default encryption
- Per-object encryption
- Bucket policy enforcement

EBS Volumes:

Encryption:
- AES-256 encryption
- Encrypted at rest
- Encrypted in transit (instance to EBS)
- Snapshots automatically encrypted
- Performance impact: < 5%

Options:
1. Default AWS-managed key (aws/ebs)
2. Customer-managed CMK (recommended)

Enabling:
- At volume creation
- Cannot encrypt existing volume directly
- Workaround: Create encrypted snapshot, restore

RDS Databases:

Encryption:
- Entire DB instance encrypted
- Automated backups encrypted
- Snapshots encrypted
- Read replicas encrypted
- Cannot enable after creation

Options:
1. AWS-managed key (aws/rds)
2. Customer-managed CMK

Enabling:
- At DB instance creation
- Cannot encrypt existing DB
- Migration: Snapshot → Restore encrypted

DynamoDB:

Encryption:
- Always encrypted at rest
- AWS-owned keys (default, free)
- AWS-managed key (aws/dynamodb)
- Customer-managed CMK ($1/month)

Options:
- Table-level encryption
- Can change CMK after creation
- No performance impact

Lambda:

Environment Variables:
- Encrypted at rest (automatic)
- Default: AWS-managed key
- Custom CMK supported
- Decrypted on cold start

Code:
import boto3

# Decrypt environment variable
kms = boto3.client('kms')

encrypted_var = os.environ['ENCRYPTED_PASSWORD']
plaintext = kms.decrypt(
    CiphertextBlob=base64.b64decode(encrypted_var)
)['Plaintext']

SQS/SNS:

Encryption:
- Messages encrypted at rest
- SSE-KMS
- Customer-managed CMK
- Cost: KMS API calls per message

Important: Encryption at rest, NOT in transit
Still use HTTPS for in-transit protection
```


### Compliance and Audit

**CloudTrail Integration:**

```
KMS CloudTrail Logging:

Every KMS API Call Logged:
- Who: IAM user/role
- When: Timestamp
- What: API operation (Encrypt, Decrypt, etc.)
- Which Key: CMK ARN
- Source IP: Caller IP address
- Result: Success/failure

Example CloudTrail Event:
{
  "eventTime": "2025-01-15T10:30:00Z",
  "eventName": "Decrypt",
  "userIdentity": {
    "type": "AssumedRole",
    "arn": "arn:aws:sts::123456789012:assumed-role/AppRole/instance"
  },
  "requestParameters": {
    "encryptionContext": {
      "purpose": "database-password"
    }
  },
  "responseElements": null,
  "resources": [{
    "type": "AWS::KMS::Key",
    "ARN": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }]
}

Audit Use Cases:
- Who accessed which secrets when?
- Detect unauthorized decryption attempts
- Compliance reporting (HIPAA, PCI DSS)
- Incident investigation
- Key usage analytics

CloudWatch Metrics:
- NumberOfNotEncryptedObjects (S3)
- KMS API call rates
- Failed operations
- Key state changes

Secrets Manager Logging:
- GetSecretValue: Who retrieved secret
- RotateSecret: Rotation events
- PutSecretValue: Secret updates
- DeleteSecret: Deletion attempts

Compliance Frameworks:

PCI DSS:
- Requirement 3.4: Encrypt cardholder data
- KMS: FIPS 140-2 Level 2 compliant
- CloudTrail: Audit trail requirement

HIPAA:
- Encrypt PHI at rest and in transit
- KMS: Encryption key management
- Audit: CloudTrail for access logs

GDPR:
- Data protection by design
- Encryption requirement (Article 32)
- Access logging for data subjects
```


## Hands-On Implementation

### Lab 1: Creating and Using Customer Managed CMKs

**Objective:** Create CMK, encrypt/decrypt data, configure key policy.

**Step 1: Create Customer Managed CMK**

```python
import boto3
import json

kms = boto3.client('kms')

# Create CMK
response = kms.create_key(
    Description='Application encryption key',
    KeyUsage='ENCRYPT_DECRYPT',
    Origin='AWS_KMS',  # KMS generates key material
    MultiRegion=False
)

key_id = response['KeyMetadata']['KeyId']
key_arn = response['KeyMetadata']['Arn']

print(f"Created CMK: {key_id}")
print(f"ARN: {key_arn}")

# Create alias (friendly name)
kms.create_alias(
    AliasName='alias/my-app-key',
    TargetKeyId=key_id
)

print("Created alias: alias/my-app-key")
```

**Step 2: Configure Key Policy**

```python
# Define key policy
key_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Enable IAM policies",
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{account_id}:root"
            },
            "Action": "kms:*",
            "Resource": "*"
        },
        {
            "Sid": "Allow administrators",
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{account_id}:role/Admin"
            },
            "Action": [
                "kms:Create*",
                "kms:Describe*",
                "kms:Enable*",
                "kms:List*",
                "kms:Put*",
                "kms:Update*",
                "kms:Revoke*",
                "kms:Disable*",
                "kms:Get*",
                "kms:Delete*",
                "kms:ScheduleKeyDeletion",
                "kms:CancelKeyDeletion"
            ],
            "Resource": "*"
        },
        {
            "Sid": "Allow application use",
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{account_id}:role/ApplicationRole"
            },
            "Action": [
                "kms:Decrypt",
                "kms:Encrypt",
                "kms:GenerateDataKey",
                "kms:DescribeKey"
            ],
            "Resource": "*"
        }
    ]
}

# Apply key policy
kms.put_key_policy(
    KeyId=key_id,
    PolicyName='default',
    Policy=json.dumps(key_policy)
)

print("Key policy configured")
```

**Step 3: Encrypt and Decrypt Data**

```python
# Encrypt small data directly (< 4 KB)
plaintext = b"Sensitive password: P@ssw0rd123!"

encrypt_response = kms.encrypt(
    KeyId='alias/my-app-key',
    Plaintext=plaintext,
    EncryptionContext={
        'Application': 'MyApp',
        'Purpose': 'Database password'
    }
)

ciphertext = encrypt_response['CiphertextBlob']
print(f"Encrypted data (base64): {base64.b64encode(ciphertext).decode()}")

# Store ciphertext in database or configuration

# Decrypt
decrypt_response = kms.decrypt(
    CiphertextBlob=ciphertext,
    EncryptionContext={
        'Application': 'MyApp',
        'Purpose': 'Database password'
    }
)

decrypted = decrypt_response['Plaintext']
print(f"Decrypted: {decrypted.decode()}")

# Verify encryption context match (security)
if decrypt_response['EncryptionContext'] != {'Application': 'MyApp', 'Purpose': 'Database password'}:
    raise Exception("Encryption context mismatch - possible tampering")
```

**Step 4: Envelope Encryption for Large Files**

```python
# Encrypt large file using envelope encryption
def encrypt_file(input_file, output_file, cmk_alias):
    """Encrypt file using envelope encryption"""
    
    # Generate data encryption key
    response = kms.generate_data_key(
        KeyId=cmk_alias,
        KeySpec='AES_256'
    )
    
    plaintext_key = response['Plaintext']
    encrypted_key = response['CiphertextBlob']
    
    # Encrypt file with data key (locally, fast)
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    import os
    
    # Generate IV
    iv = os.urandom(16)
    
    # Create cipher
    cipher = Cipher(
        algorithms.AES(plaintext_key),
        modes.CBC(iv),
        backend=default_backend()
    )
    
    encryptor = cipher.encryptor()
    
    # Encrypt file
    with open(input_file, 'rb') as f_in, open(output_file, 'wb') as f_out:
        # Write encrypted key length and encrypted key
        f_out.write(len(encrypted_key).to_bytes(4, 'big'))
        f_out.write(encrypted_key)
        
        # Write IV
        f_out.write(iv)
        
        # Encrypt and write file data
        while True:
            chunk = f_in.read(64 * 1024)  # 64 KB chunks
            if not chunk:
                break
            
            # Pad last chunk if needed
            if len(chunk) % 16 != 0:
                chunk += b' ' * (16 - len(chunk) % 16)
            
            encrypted_chunk = encryptor.update(chunk)
            f_out.write(encrypted_chunk)
        
        f_out.write(encryptor.finalize())
    
    print(f"File encrypted: {output_file}")

# Decrypt file
def decrypt_file(input_file, output_file):
    """Decrypt file using envelope encryption"""
    
    with open(input_file, 'rb') as f_in:
        # Read encrypted key
        key_length = int.from_bytes(f_in.read(4), 'big')
        encrypted_key = f_in.read(key_length)
        
        # Read IV
        iv = f_in.read(16)
        
        # Decrypt data key using KMS
        response = kms.decrypt(CiphertextBlob=encrypted_key)
        plaintext_key = response['Plaintext']
        
        # Create cipher
        cipher = Cipher(
            algorithms.AES(plaintext_key),
            modes.CBC(iv),
            backend=default_backend()
        )
        
        decryptor = cipher.decryptor()
        
        # Decrypt file
        with open(output_file, 'wb') as f_out:
            while True:
                chunk = f_in.read(64 * 1024)
                if not chunk:
                    break
                
                decrypted_chunk = decryptor.update(chunk)
                f_out.write(decrypted_chunk)
            
            f_out.write(decryptor.finalize())
    
    print(f"File decrypted: {output_file}")

# Usage
encrypt_file('large_file.dat', 'large_file.enc', 'alias/my-app-key')
decrypt_file('large_file.enc', 'large_file_decrypted.dat')
```

**Step 5: Enable Key Rotation**

```python
# Enable automatic key rotation (annual)
kms.enable_key_rotation(KeyId=key_id)

# Verify rotation enabled
rotation_status = kms.get_key_rotation_status(KeyId=key_id)
print(f"Rotation enabled: {rotation_status['KeyRotationEnabled']}")

# Note: Rotation is transparent
# - New key material generated annually
# - Old ciphertext still decrypts (KMS maintains all versions)
# - No application changes needed
# - Automatic and seamless
```


### Lab 2: Secrets Manager with RDS Integration

**Objective:** Store RDS credentials in Secrets Manager with automatic rotation.

**Step 1: Create RDS Database Secret**

```python
import boto3
import json

secrets = boto3.client('secretsmanager')

# Create secret for RDS database
response = secrets.create_secret(
    Name='prod/myapp/db-credentials',
    Description='Production database credentials',
    KmsKeyId='alias/my-app-key',  # Encrypt with custom CMK
    SecretString=json.dumps({
        'username': 'admin',
        'password': 'initial-password-change-me',
        'engine': 'mysql',
        'host': 'mydb.cluster-abc123.us-east-1.rds.amazonaws.com',
        'port': 3306,
        'dbname': 'production',
        'dbClusterIdentifier': 'mydb-cluster'
    }),
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Application', 'Value': 'MyApp'}
    ]
)

secret_arn = response['ARN']
print(f"Created secret: {secret_arn}")
```

**Step 2: Configure Automatic Rotation**

```python
# Enable automatic rotation (every 30 days)
secrets.rotate_secret(
    SecretId='prod/myapp/db-credentials',
    RotationLambdaARN='arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRDSMySQLRotation',
    RotationRules={'AutomaticallyAfterDays': 30}
)

print("Automatic rotation enabled (30 days)")

# Rotation Lambda function created automatically by Secrets Manager
# For RDS, pre-built rotation functions available
# For custom secrets, create custom Lambda function
```

**Step 3: Retrieve Secret in Application**

```python
# Application code to retrieve secret
def get_database_connection():
    """Get database connection using Secrets Manager"""
    
    # Get secret value
    response = secrets.get_secret_value(SecretId='prod/myapp/db-credentials')
    
    # Parse secret
    secret = json.loads(response['SecretString'])
    
    # Create database connection
    import pymysql
    
    connection = pymysql.connect(
        host=secret['host'],
        user=secret['username'],
        password=secret['password'],
        database=secret['dbname'],
        port=secret['port']
    )
    
    return connection

# Usage
try:
    conn = get_database_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT NOW()")
    result = cursor.fetchone()
    print(f"Database time: {result[0]}")
except Exception as e:
    print(f"Error connecting to database: {e}")
finally:
    if conn:
        conn.close()

# Benefits:
# - No hardcoded credentials
# - Automatic password rotation
# - Credentials encrypted at rest
# - Access audited via CloudTrail
# - Easy credential rollback if needed
```

**Step 4: Lambda Function with Secrets Manager**

```python
# Lambda function retrieving secret
import boto3
import json
import pymysql

secrets = boto3.client('secretsmanager')

# Cache secret to reduce API calls
secret_cache = {}

def get_secret(secret_name):
    """Get secret with caching"""
    
    if secret_name in secret_cache:
        return secret_cache[secret_name]
    
    response = secrets.get_secret_value(SecretId=secret_name)
    secret = json.loads(response['SecretString'])
    
    secret_cache[secret_name] = secret
    return secret

def lambda_handler(event, context):
    """Lambda function using database credentials"""
    
    # Get credentials from Secrets Manager
    secret = get_secret('prod/myapp/db-credentials')
    
    # Connect to database
    connection = pymysql.connect(
        host=secret['host'],
        user=secret['username'],
        password=secret['password'],
        database=secret['dbname'],
        port=secret['port']
    )
    
    try:
        cursor = connection.cursor()
        
        # Execute query
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'userCount': user_count
            })
        }
    
    finally:
        connection.close()

# Lambda IAM role needs:
# - secretsmanager:GetSecretValue permission
# - kms:Decrypt permission (for CMK)
# - Network access to database (VPC if needed)
```


### Lab 3: Cross-Account KMS Access

**Objective:** Grant another AWS account access to decrypt data encrypted with your CMK.

**Step 1: Update Key Policy in Account A**

```python
# Account A (key owner): Update key policy
account_a_kms = boto3.client('kms')

# Get current key policy
policy_response = account_a_kms.get_key_policy(
    KeyId='alias/shared-key',
    PolicyName='default'
)

policy = json.loads(policy_response['Policy'])

# Add cross-account statement
cross_account_statement = {
    "Sid": "Allow Account B to use key",
    "Effect": "Allow",
    "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"  # Account B
    },
    "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
    ],
    "Resource": "*"
}

policy['Statement'].append(cross_account_statement)

# Update key policy
account_a_kms.put_key_policy(
    KeyId='alias/shared-key',
    PolicyName='default',
    Policy=json.dumps(policy)
)

print("Key policy updated to allow Account B")
```

**Step 2: Grant IAM Permission in Account B**

```python
# Account B: Create IAM policy for users/roles
iam = boto3.client('iam')

policy_document = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": [
            "kms:Decrypt",
            "kms:DescribeKey"
        ],
        "Resource": "arn:aws:kms:us-east-1:111111111111:key/12345678-1234-1234-1234-123456789012"
    }]
}

# Create policy
policy_response = iam.create_policy(
    PolicyName='CrossAccountKMSDecrypt',
    PolicyDocument=json.dumps(policy_document)
)

# Attach to role
iam.attach_role_policy(
    RoleName='ApplicationRole',
    PolicyArn=policy_response['Policy']['Arn']
)

print("IAM policy attached in Account B")
```

**Step 3: Test Cross-Account Decryption**

```python
# Account B: Decrypt data encrypted by Account A
account_b_kms = boto3.client('kms')

# Assume ciphertext was encrypted by Account A
# and shared with Account B (e.g., S3 object)

try:
    response = account_b_kms.decrypt(
        CiphertextBlob=ciphertext_from_account_a
    )
    
    plaintext = response['Plaintext']
    print(f"Successfully decrypted: {plaintext.decode()}")
    
except Exception as e:
    print(f"Decryption failed: {e}")

# Common issues:
# - Key policy not updated in Account A
# - IAM policy missing in Account B
# - Wrong key ARN specified
```


## Production-Level Knowledge

### Key Management Best Practices

**Key Hierarchy and Organization:**

```
Enterprise Key Structure:

Organizational Level:
- Root Keys (AWS KMS Master Keys)
  * Managed by AWS
  * Protect all customer keys
  * FIPS 140-2 Level 3

Application Level:
- Per-Application CMKs
  * app-prod-encryption-key
  * app-dev-encryption-key
  * analytics-encryption-key

Environment Separation:
- Production CMK (strict access)
- Staging CMK (limited access)
- Development CMK (broader access)

Purpose-Based Keys:
- Database encryption key
- S3 bucket encryption key
- Secret encryption key
- Backup encryption key

Benefits:
✓ Blast radius limitation
✓ Clear ownership
✓ Easier compliance auditing
✓ Granular access control
✓ Cost tracking per application
```

**Encryption Context for Additional Security:**

```python
# Encryption context: Additional authenticated data (AAD)
# Not encrypted, but must match for decryption

# Encrypt with context
response = kms.encrypt(
    KeyId='alias/my-app-key',
    Plaintext=b"sensitive data",
    EncryptionContext={
        'Application': 'MyApp',
        'Environment': 'Production',
        'Purpose': 'UserData',
        'UserID': 'user-123'
    }
)

ciphertext = response['CiphertextBlob']

# Decrypt MUST provide same context
try:
    response = kms.decrypt(
        CiphertextBlob=ciphertext,
        EncryptionContext={
            'Application': 'MyApp',
            'Environment': 'Production',
            'Purpose': 'UserData',
            'UserID': 'user-123'
        }
    )
    plaintext = response['Plaintext']
except Exception:
    # Decryption fails if context doesn't match
    # Prevents: Using encrypted data in wrong context
    # Example: User A's data decrypted as User B
    pass

Benefits:
✓ Additional security layer
✓ Prevents misuse of encrypted data
✓ CloudTrail logging includes context
✓ Audit who decrypted what for whom
✓ No additional cost

Best Practices:
✓ Include relevant identifiers (userID, requestID)
✓ Use consistent naming conventions
✓ Don't include sensitive data in context (logged)
✓ Document expected context per key
```

**Secrets Caching Strategy:**

```python
# Problem: Calling Secrets Manager on every request
# - High latency (API call)
# - High cost ($0.05 per 10,000 requests)
# - Unnecessary load

# Solution: Cache secrets with TTL

import time
from functools import wraps

class SecretCache:
    """Cache secrets with TTL"""
    
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get_secret(self, secret_name):
        """Get secret from cache or Secrets Manager"""
        
        # Check cache
        if secret_name in self.cache:
            secret_data, timestamp = self.cache[secret_name]
            
            # Check if still valid
            if time.time() - timestamp < self.ttl:
                return secret_data
        
        # Cache miss or expired - fetch from Secrets Manager
        secrets = boto3.client('secretsmanager')
        response = secrets.get_secret_value(SecretId=secret_name)
        secret_data = json.loads(response['SecretString'])
        
        # Update cache
        self.cache[secret_name] = (secret_data, time.time())
        
        return secret_data

# Global cache instance (Lambda container reuse)
secret_cache = SecretCache(ttl_seconds=3600)  # 1 hour TTL

def lambda_handler(event, context):
    """Lambda with secret caching"""
    
    # Get secret (from cache if available)
    secret = secret_cache.get_secret('prod/myapp/db-credentials')
    
    # Use secret
    connection = connect_to_database(secret)
    
    # Process request
    # ...

# Benefits:
# - First request: API call to Secrets Manager
# - Subsequent requests (1 hour): Cache hit
# - 99% cost reduction for high-volume APIs
# - Lower latency (no API call)

# Considerations:
# - TTL vs rotation period (TTL < rotation)
# - Memory usage (cache size)
# - Container reuse (Lambda)
```


### Compliance and Audit Automation

**Automated Compliance Checks:**

```python
# Check encryption compliance across services

class EncryptionComplianceChecker:
    """Audit encryption compliance"""
    
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.ec2 = boto3.client('ec2')
        self.rds = boto3.client('rds')
        self.dynamodb = boto3.client('dynamodb')
    
    def check_s3_encryption(self):
        """Check S3 bucket encryption"""
        
        buckets = self.s3.list_buckets()['Buckets']
        non_compliant = []
        
        for bucket in buckets:
            bucket_name = bucket['Name']
            
            try:
                # Check encryption configuration
                self.s3.get_bucket_encryption(Bucket=bucket_name)
            except self.s3.exceptions.ServerSideEncryptionConfigurationNotFoundError:
                # No encryption configured
                non_compliant.append(bucket_name)
        
        return {
            'total_buckets': len(buckets),
            'non_compliant': non_compliant,
            'compliance_rate': (len(buckets) - len(non_compliant)) / len(buckets) * 100
        }
    
    def check_ebs_encryption(self):
        """Check EBS volume encryption"""
        
        volumes = self.ec2.describe_volumes()['Volumes']
        non_compliant = []
        
        for volume in volumes:
            if not volume['Encrypted']:
                non_compliant.append({
                    'VolumeId': volume['VolumeId'],
                    'State': volume['State'],
                    'Size': volume['Size']
                })
        
        return {
            'total_volumes': len(volumes),
            'non_compliant': non_compliant,
            'compliance_rate': (len(volumes) - len(non_compliant)) / len(volumes) * 100
        }
    
    def check_rds_encryption(self):
        """Check RDS encryption"""
        
        instances = self.rds.describe_db_instances()['DBInstances']
        non_compliant = []
        
        for instance in instances:
            if not instance['StorageEncrypted']:
                non_compliant.append({
                    'DBInstanceIdentifier': instance['DBInstanceIdentifier'],
                    'Engine': instance['Engine'],
                    'DBInstanceClass': instance['DBInstanceClass']
                })
        
        return {
            'total_instances': len(instances),
            'non_compliant': non_compliant,
            'compliance_rate': (len(instances) - len(non_compliant)) / len(instances) * 100
        }
    
    def generate_compliance_report(self):
        """Generate comprehensive compliance report"""
        
        report = {
            'timestamp': datetime.now().isoformat(),
            's3': self.check_s3_encryption(),
            'ebs': self.check_ebs_encryption(),
            'rds': self.check_rds_encryption()
        }
        
        # Calculate overall compliance
        total_resources = (
            report['s3']['total_buckets'] +
            report['ebs']['total_volumes'] +
            report['rds']['total_instances']
        )
        
        total_non_compliant = (
            len(report['s3']['non_compliant']) +
            len(report['ebs']['non_compliant']) +
            len(report['rds']['non_compliant'])
        )
        
        report['overall_compliance_rate'] = (
            (total_resources - total_non_compliant) / total_resources * 100
            if total_resources > 0 else 100
        )
        
        return report

# Usage
checker = EncryptionComplianceChecker()
report = checker.generate_compliance_report()

print(f"Overall Compliance: {report['overall_compliance_rate']:.1f}%")
print(f"\nS3 Buckets: {report['s3']['compliance_rate']:.1f}%")
print(f"EBS Volumes: {report['ebs']['compliance_rate']:.1f}%")
print(f"RDS Instances: {report['rds']['compliance_rate']:.1f}%")

# Non-compliant resources
if report['s3']['non_compliant']:
    print(f"\nNon-compliant S3 buckets: {report['s3']['non_compliant']}")

# Automated remediation (optional)
# - Enable default encryption on S3 buckets
# - Create encrypted snapshots of EBS volumes
# - Alert for RDS instances (cannot encrypt existing)
```

**Key Usage Monitoring:**

```python
# Monitor unusual KMS key usage

def analyze_kms_usage():
    """Analyze KMS CloudTrail logs for anomalies"""
    
    cloudtrail = boto3.client('cloudtrail')
    cloudwatch = boto3.client('cloudwatch')
    
    # Query CloudTrail events (last 24 hours)
    end_time = datetime.now()
    start_time = end_time - timedelta(hours=24)
    
    response = cloudtrail.lookup_events(
        LookupAttributes=[
            {'AttributeKey': 'ResourceType', 'AttributeValue': 'AWS::KMS::Key'}
        ],
        StartTime=start_time,
        EndTime=end_time,
        MaxResults=1000
    )
    
    # Analyze events
    decrypt_calls = {}
    failed_operations = []
    
    for event in response['Events']:
        event_name = event['EventName']
        username = event.get('Username', 'Unknown')
        
        # Count decrypt operations per user
        if event_name == 'Decrypt':
            decrypt_calls[username] = decrypt_calls.get(username, 0) + 1
        
        # Track failed operations
        if 'errorCode' in event:
            failed_operations.append({
                'EventName': event_name,
                'Username': username,
                'ErrorCode': event['errorCode'],
                'Time': event['EventTime']
            })
    
    # Detect anomalies
    anomalies = []
    
    # High volume from single user
    for user, count in decrypt_calls.items():
        if count > 1000:  # Threshold: 1000 decrypts/day
            anomalies.append({
                'type': 'High volume',
                'user': user,
                'count': count
            })
    
    # Many failed operations
    if len(failed_operations) > 100:
        anomalies.append({
            'type': 'High failure rate',
            'count': len(failed_operations)
        })
    
    return {
        'decrypt_calls': decrypt_calls,
        'failed_operations': failed_operations,
        'anomalies': anomalies
    }

# Alert on anomalies
usage = analyze_kms_usage()

if usage['anomalies']:
    # Send SNS alert
    sns = boto3.client('sns')
    sns.publish(
        TopicArn='arn:aws:sns:region:account:security-alerts',
        Subject='KMS Usage Anomaly Detected',
        Message=json.dumps(usage['anomalies'], indent=2)
    )
```


### Cost Optimization

**Reducing KMS Costs:**

```
KMS Cost Structure:

CMK Storage: $1/month per customer-managed key
API Requests:
- First 20,000 requests/month: Free
- After 20,000: $0.03 per 10,000 requests

Cost Optimization Strategies:

1. Use AWS-Managed Keys When Possible:
   - Free (no CMK charge)
   - Automatic rotation
   - Suitable for: Non-compliance workloads
   - Trade-off: Less control

2. Consolidate Keys:
   - One key per application (not per resource)
   - Example: 100 S3 buckets = 1 key (not 100 keys)
   - Savings: $99/month

3. Cache Data Keys:
   - Generate data key once
   - Reuse for multiple objects
   - Reduces GenerateDataKey API calls
   - Savings: 90% of API costs

4. Use Client-Side Caching:
   - AWS Encryption SDK (automatic caching)
   - Cache plaintext data keys
   - Configurable TTL
   - Significant cost reduction

5. Batch Operations:
   - Encrypt multiple items with same data key
   - Single GenerateDataKey call
   - Example: Batch job processing 10,000 records
     * Without caching: 10,000 API calls = $0.30
     * With caching: 1 API call = $0.000003

Example Cost Calculation:

Scenario: 1 million encryptions/month

Without Optimization:
- CMK: 10 keys × $1 = $10
- API calls: 1M × $0.03/10K = $3,000
- Total: $3,010/month

With Optimization:
- CMK: 2 keys × $1 = $2
- API calls: 10K × $0.03/10K = $0.03 (caching)
- Total: $2.03/month

Savings: $3,008/month (99.9%)

Secrets Manager Cost Optimization:

Pricing:
- $0.40 per secret per month
- $0.05 per 10,000 API calls

Optimization:
1. Use Parameter Store for non-rotated values (free)
2. Cache secrets (reduce API calls 90%)
3. Delete unused secrets
4. Consolidate related secrets (one JSON vs multiple)

Example:
100 secrets without caching:
- Storage: 100 × $0.40 = $40/month
- API calls: 1M × $0.05/10K = $50/month
- Total: $90/month

With caching:
- Storage: $40/month
- API calls: 10K × $0.05/10K = $0.05/month
- Total: $40.05/month

Savings: $50/month (55%)
```


## Tips \& Best Practices

### Key Management Tips

**Tip 1: Always Enable Key Rotation**
Enable automatic annual rotation for customer-managed keys—transparent to applications, maintains compliance.

```python
kms.enable_key_rotation(KeyId=key_id)
```

**Tip 2: Use Key Aliases for Flexibility**
Reference keys by alias (`alias/my-app-key`) instead of key ID—allows key replacement without code changes.

**Tip 3: Implement Encryption Context**
Add encryption context for additional security and audit clarity—prevents misuse of encrypted data.

**Tip 4: Separate Keys by Environment**
Use different CMKs for production, staging, development—limits blast radius, simplifies auditing.

**Tip 5: Document Key Purpose in Description**
Add clear descriptions to CMKs—helps teams understand key usage and ownership.

### Secrets Management Tips

**Tip 6: Cache Secrets Aggressively**
Cache secrets with 1-hour TTL—reduces API calls 99%, lowers costs and latency.

**Tip 7: Use Automatic Rotation**
Enable automatic rotation for RDS/Redshift credentials—zero-downtime password changes.

**Tip 8: Tag Secrets for Organization**
Tag secrets with Environment, Application, Owner—enables cost tracking and access control.

**Tip 9: Use Resource Policies for Cross-Account**
Grant cross-account access via resource policies—simpler than IAM role assumption.

**Tip 10: Monitor Secret Access**
Enable CloudTrail logging and alert on unusual access patterns—detect potential breaches early.

### Security Tips

**Tip 11: Never Hardcode Credentials**
Always use Secrets Manager or Parameter Store—eliminates credential exposure in code/configs.

**Tip 12: Implement Least Privilege**
Grant minimum KMS permissions needed—`kms:Decrypt` only for applications, not `kms:*`.

**Tip 13: Enable CloudTrail for All Keys**
Ensure CloudTrail enabled in all regions—complete audit trail of key usage.

**Tip 14: Set Calendar Reminders for Manual Rotation**
If not using automatic rotation, set quarterly reminders—prevents credential staleness.

**Tip 15: Test Disaster Recovery**
Regularly test restoring encrypted data with backup CMKs—verify recovery procedures work.

## Pitfalls \& Remedies

### Pitfall 1: Accidental Key Deletion

**Problem:** CMK scheduled for deletion, encrypted data becomes inaccessible after 7-30 days.

**Why It Happens:**

- Accidental deletion through console/API
- Automation scripts with deletion commands
- Cleanup scripts without proper checks
- Misunderstanding of deletion process

**Impact:**

- All data encrypted with key becomes permanently inaccessible
- S3 objects unreadable
- EBS volumes unmountable
- RDS databases inaccessible
- Complete data loss if no backups with different keys
- Business disruption
- Compliance violations

**Example:**

```
Day 1: Administrator accidentally schedules key for deletion
Day 7-30: Waiting period (can still cancel)
Day 31: Key permanently deleted
Result: 10 TB of encrypted S3 data permanently inaccessible
Recovery: Impossible (data lost forever)
Cost: Millions in data loss, recovery efforts, reputation damage
```

**Remedy:**

**Step 1: Implement Deletion Protection**

```python
# Add key policy to prevent deletion
def add_deletion_protection(key_id):
    """Add deletion protection to key policy"""
    
    kms = boto3.client('kms')
    
    # Get current policy
    policy_response = kms.get_key_policy(
        KeyId=key_id,
        PolicyName='default'
    )
    
    policy = json.loads(policy_response['Policy'])
    
    # Add deny statement for deletion
    deny_deletion = {
        "Sid": "Prevent key deletion",
        "Effect": "Deny",
        "Principal": {"AWS": "*"},
        "Action": [
            "kms:ScheduleKeyDeletion",
            "kms:DeleteAlias"
        ],
        "Resource": "*",
        "Condition": {
            "StringNotEquals": {
                "aws:PrincipalArn": "arn:aws:iam::123456789012:role/KeyAdministrator"
            }
        }
    }
    
    policy['Statement'].append(deny_deletion)
    
    # Update policy
    kms.put_key_policy(
        KeyId=key_id,
        PolicyName='default',
        Policy=json.dumps(policy)
    )
    
    print(f"Deletion protection added to {key_id}")

# Apply to all critical keys
for key in critical_keys:
    add_deletion_protection(key)
```

**Step 2: Enable CloudWatch Alarms**

```python
# Alert on key deletion
cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

# Create SNS topic for alerts
topic = sns.create_topic(Name='KMSKeyDeletionAlerts')
topic_arn = topic['TopicArn']

# Subscribe security team
sns.subscribe(
    TopicArn=topic_arn,
    Protocol='email',
    Endpoint='security@example.com'
)

# EventBridge rule for key deletion
events = boto3.client('events')

events.put_rule(
    Name='KMSKeyDeletionDetection',
    EventPattern=json.dumps({
        "source": ["aws.kms"],
        "detail-type": ["AWS API Call via CloudTrail"],
        "detail": {
            "eventName": ["ScheduleKeyDeletion"]
        }
    }),
    State='ENABLED'
)

# Add SNS as target
events.put_targets(
    Rule='KMSKeyDeletionDetection',
    Targets=[{
        'Id': '1',
        'Arn': topic_arn
    }]
)

print("Key deletion alerts configured")
```

**Step 3: Automated Key Deletion Cancellation**

```python
# Lambda function to automatically cancel key deletion
def lambda_handler(event, context):
    """Cancel key deletion automatically for protected keys"""
    
    detail = event['detail']
    key_id = detail['requestParameters']['keyId']
    
    # Check if key is production/critical
    kms = boto3.client('kms')
    
    tags = kms.list_resource_tags(KeyId=key_id)['Tags']
    is_production = any(tag['TagKey'] == 'Environment' and tag['TagValue'] == 'Production' for tag in tags)
    
    if is_production:
        # Cancel deletion
        kms.cancel_key_deletion(KeyId=key_id)
        
        print(f"Automatically cancelled deletion of production key: {key_id}")
        
        # Notify security team
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:region:account:security-alerts',
            Subject='Production Key Deletion Cancelled',
            Message=f"Production key {key_id} was scheduled for deletion and automatically cancelled."
        )
    
    return {'statusCode': 200}
```

**Step 4: Regular Key Inventory**

```python
# Check for keys scheduled for deletion
def audit_key_deletion_status():
    """Audit all keys for deletion status"""
    
    kms = boto3.client('kms')
    
    keys = kms.list_keys()['Keys']
    keys_pending_deletion = []
    
    for key in keys:
        key_id = key['KeyId']
        
        try:
            metadata = kms.describe_key(KeyId=key_id)['KeyMetadata']
            
            if metadata['KeyState'] == 'PendingDeletion':
                deletion_date = metadata.get('DeletionDate')
                keys_pending_deletion.append({
                    'KeyId': key_id,
                    'Description': metadata.get('Description', ''),
                    'DeletionDate': deletion_date.isoformat() if deletion_date else None,
                    'DaysRemaining': (deletion_date - datetime.now(timezone.utc)).days if deletion_date else None
                })
        
        except Exception as e:
            print(f"Error checking key {key_id}: {e}")
    
    if keys_pending_deletion:
        print(f"⚠️  {len(keys_pending_deletion)} keys pending deletion:")
        for key in keys_pending_deletion:
            print(f"  - {key['KeyId']}: {key['DaysRemaining']} days remaining")
    
    return keys_pending_deletion

# Run daily check
pending = audit_key_deletion_status()
```

**Prevention:**

- Implement approval workflow for key deletion
- Tag critical keys (Environment=Production)
- Enable CloudWatch alarms for ScheduleKeyDeletion
- Automated cancellation for production keys
- Regular audits of key status
- Training on deletion consequences
- Require MFA for key deletion operations

***

### Pitfall 2: Secrets Manager Permission Issues

**Problem:** Applications unable to retrieve secrets due to IAM permission misconfigurations.

**Why It Happens:**

- Missing `secretsmanager:GetSecretValue` permission
- Missing `kms:Decrypt` permission for CMK
- Resource ARN mismatch
- VPC endpoint access not configured
- Condition keys blocking access

**Impact:**

- Application startup failures
- Connection errors to databases
- Service outages
- Difficult to debug (permissions opaque)
- Development delays

**Example:**

```
Application Error:
"AccessDeniedException: User: arn:aws:iam::123456789012:role/AppRole is not authorized to perform: secretsmanager:GetSecretValue on resource: prod/myapp/db-credentials"

Checklist:
✗ IAM role has secretsmanager:GetSecretValue? Yes
✗ Secret resource policy allows access? (No resource policy set)
✗ KMS key policy allows decrypt? NO - Missing!
✗ VPC endpoint allows access? Yes

Root cause: Missing kms:Decrypt permission on CMK
```

**Remedy:**

**Step 1: Comprehensive IAM Policy**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSecretsAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/*",
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:staging/*"
      ]
    },
    {
      "Sid": "AllowKMSDecrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:DescribeKey"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "secretsmanager.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

**Step 2: Test Permissions Script**

```python
# Test if role can retrieve secret
def test_secret_access(role_arn, secret_name):
    """Test if role can access secret"""
    
    sts = boto3.client('sts')
    secrets = boto3.client('secretsmanager')
    
    # Assume role
    assumed_role = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName='PermissionTest'
    )
    
    # Create client with assumed role
    test_secrets = boto3.client(
        'secretsmanager',
        aws_access_key_id=assumed_role['Credentials']['AccessKeyId'],
        aws_secret_access_key=assumed_role['Credentials']['SecretAccessKey'],
        aws_session_token=assumed_role['Credentials']['SessionToken']
    )
    
    # Test retrieval
    try:
        response = test_secrets.get_secret_value(SecretId=secret_name)
        print(f"✓ Role {role_arn} can access secret {secret_name}")
        return True
    except Exception as e:
        print(f"✗ Role {role_arn} CANNOT access secret {secret_name}")
        print(f"  Error: {e}")
        
        # Diagnose issue
        if 'AccessDeniedException' in str(e):
            print("  → Check IAM policy for secretsmanager:GetSecretValue")
        elif 'KMS' in str(e):
            print("  → Check KMS key policy for kms:Decrypt")
        elif 'ResourceNotFoundException' in str(e):
            print("  → Secret does not exist or incorrect name")
        
        return False

# Test all application roles
test_secret_access(
    'arn:aws:iam::123456789012:role/ApplicationRole',
    'prod/myapp/db-credentials'
)
```

**Step 3: Automated Permission Validation**

```python
# Validate permissions before deployment
def validate_secrets_permissions():
    """Validate all roles have required secret permissions"""
    
    iam = boto3.client('iam')
    secrets = boto3.client('secretsmanager')
    
    # Get all application roles
    roles = iam.list_roles()['Roles']
    app_roles = [r for r in roles if 'Application' in r['RoleName']]
    
    # Get all secrets
    secret_list = secrets.list_secrets()['SecretList']
    
    issues = []
    
    for role in app_roles:
        role_name = role['RoleName']
        
        # Get role policies
        attached_policies = iam.list_attached_role_policies(RoleName=role_name)
        
        has_secrets_permission = False
        has_kms_permission = False
        
        for policy in attached_policies['AttachedPolicies']:
            policy_arn = policy['PolicyArn']
            
            # Get policy document
            policy_version = iam.get_policy(PolicyArn=policy_arn)['Policy']['DefaultVersionId']
            policy_doc = iam.get_policy_version(
                PolicyArn=policy_arn,
                VersionId=policy_version
            )['PolicyVersion']['Document']
            
            # Check for secretsmanager permissions
            for statement in policy_doc.get('Statement', []):
                actions = statement.get('Action', [])
                if isinstance(actions, str):
                    actions = [actions]
                
                if 'secretsmanager:GetSecretValue' in actions or 'secretsmanager:*' in actions:
                    has_secrets_permission = True
                
                if 'kms:Decrypt' in actions or 'kms:*' in actions:
                    has_kms_permission = True
        
        # Report issues
        if not has_secrets_permission:
            issues.append(f"Role {role_name} missing secretsmanager:GetSecretValue")
        
        if not has_kms_permission:
            issues.append(f"Role {role_name} missing kms:Decrypt")
    
    if issues:
        print("⚠️  Permission Issues Found:")
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("✓ All roles have required permissions")
    
    return len(issues) == 0

# Run before deployment
if not validate_secrets_permissions():
    raise Exception("Permission validation failed - fix before deploying")
```

**Prevention:**

- Use IAM policy simulator before deployment
- Test with actual role credentials
- Document required permissions
- Create reusable IAM policy templates
- Automated permission validation in CI/CD
- Monitor CloudTrail for AccessDenied errors

***

### Pitfall 3: Rotation Failures

**Problem:** Automatic secret rotation fails, leaving old passwords active or breaking application access.

**Why It Happens:**

- Lambda rotation function errors
- Database connection issues
- Insufficient Lambda permissions
- Network connectivity problems (VPC)
- Database max connections reached
- Rotation function timeout

**Impact:**

- Old passwords not changed (security risk)
- Applications lose database access
- Service outages
- Compliance violations
- Manual intervention required

**Example:**

```
Rotation Attempt:
1. Lambda function invoked
2. Connects to database to create new password
3. Database connection times out (Lambda in VPC without NAT)
4. Rotation fails after 15 minutes (Lambda timeout)
5. Secret stuck in AWSPENDING state
6. Applications continue using AWSCURRENT (old password)
7. Security requirement for 30-day rotation violated
```

**Remedy:**

**Step 1: Configure VPC for Lambda Rotation**

```python
# Lambda rotation function needs VPC access to database
# AND internet access for Secrets Manager API

# Create VPC endpoint for Secrets Manager (avoids NAT)
ec2 = boto3.client('ec2')

vpc_endpoint = ec2.create_vpc_endpoint(
    VpcEndpointType='Interface',
    VpcId='vpc-12345678',
    ServiceName='com.amazonaws.us-east-1.secretsmanager',
    SubnetIds=['subnet-12345678', 'subnet-87654321'],
    SecurityGroupIds=['sg-12345678']
)

print(f"Created Secrets Manager VPC endpoint: {vpc_endpoint['VpcEndpoint']['VpcEndpointId']}")

# Lambda function configuration
lambda_client = boto3.client('lambda')

lambda_client.update_function_configuration(
    FunctionName='SecretsManagerRotation',
    VpcConfig={
        'SubnetIds': ['subnet-12345678', 'subnet-87654321'],  # Private subnets
        'SecurityGroupIds': ['sg-rotation-function']
    },
    Timeout=300,  # 5 minutes (rotation can be slow)
    Environment={
        'Variables': {
            'SECRETS_MANAGER_ENDPOINT': f"https://secretsmanager.us-east-1.amazonaws.com"
        }
    }
)
```

**Step 2: Comprehensive Rotation Monitoring**

```python
# Monitor rotation status
def check_rotation_status(secret_name):
    """Check if rotation is healthy"""
    
    secrets = boto3.client('secretsmanager')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get secret metadata
    secret = secrets.describe_secret(SecretId=secret_name)
    
    rotation_enabled = secret.get('RotationEnabled', False)
    rotation_lambda = secret.get('RotationLambdaARN')
    last_rotated = secret.get('LastRotatedDate')
    last_changed = secret.get('LastChangedDate')
    
    print(f"Secret: {secret_name}")
    print(f"Rotation Enabled: {rotation_enabled}")
    print(f"Last Rotated: {last_rotated}")
    
    # Check for rotation failures
    if rotation_enabled:
        # Get rotation Lambda errors
        logs = boto3.client('logs')
        
        log_group = f"/aws/lambda/{rotation_lambda.split(':')[-1]}"
        
        try:
            # Query error logs
            response = logs.filter_log_events(
                logGroupName=log_group,
                filterPattern="ERROR",
                startTime=int((datetime.now() - timedelta(days=7)).timestamp() * 1000)
            )
            
            if response['events']:
                print(f"⚠️  {len(response['events'])} errors in rotation Lambda")
                for event in response['events'][:5]:
                    print(f"  - {event['message'][:100]}")
        
        except Exception as e:
            print(f"Could not check Lambda logs: {e}")
    
    # Check if rotation overdue
    if last_rotated:
        days_since_rotation = (datetime.now(timezone.utc) - last_rotated).days
        rotation_schedule = secret.get('RotationRules', {}).get('AutomaticallyAfterDays', 30)
        
        if days_since_rotation > rotation_schedule + 7:  # 7-day grace period
            print(f"⚠️  Rotation overdue by {days_since_rotation - rotation_schedule} days")
            return False
    
    return True

# Check all secrets with rotation
secrets_client = boto3.client('secretsmanager')
all_secrets = secrets_client.list_secrets()['SecretList']

for secret in all_secrets:
    if secret.get('RotationEnabled'):
        check_rotation_status(secret['Name'])
```

**Step 3: Manual Rotation Test**

```python
# Test rotation manually before enabling automatic
def test_rotation(secret_name):
    """Manually test rotation process"""
    
    secrets = boto3.client('secretsmanager')
    
    print(f"Testing rotation for {secret_name}...")
    
    try:
        # Trigger rotation
        response = secrets.rotate_secret(
            SecretId=secret_name,
            RotationLambdaARN='arn:aws:lambda:region:account:function:rotation-function'
        )
        
        print(f"Rotation initiated: {response['ARN']}")
        
        # Wait for rotation to complete
        import time
        max_wait = 300  # 5 minutes
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            secret = secrets.describe_secret(SecretId=secret_name)
            
            # Check version stages
            versions = secret.get('VersionIdsToStages', {})
            
            # Find AWSPENDING
            pending_versions = [v for v, stages in versions.items() if 'AWSPENDING' in stages]
            
            if not pending_versions:
                print("✓ Rotation completed successfully")
                return True
            
            print(f"Rotation in progress... ({int(time.time() - start_time)}s)")
            time.sleep(10)
        
        print("✗ Rotation timed out")
        return False
    
    except Exception as e:
        print(f"✗ Rotation failed: {e}")
        return False

# Test before enabling automatic rotation
if test_rotation('prod/myapp/db-credentials'):
    # Enable automatic rotation
    secrets.rotate_secret(
        SecretId='prod/myapp/db-credentials',
        RotationRules={'AutomaticallyAfterDays': 30}
    )
    print("Automatic rotation enabled")
```

**Prevention:**

- Test rotation manually before enabling automatic
- Ensure Lambda has VPC and internet access
- Monitor CloudWatch Logs for rotation errors
- Set up CloudWatch alarms for rotation failures
- Increase Lambda timeout (5 minutes minimum)
- Document rotation troubleshooting steps
- Maintain backup admin credentials (separate secret)

***

## Chapter Summary

AWS KMS and Secrets Manager provide enterprise-grade encryption and secrets management, eliminating the complexity and risk of manual key management. KMS offers centralized control over encryption keys with FIPS 140-2 validated HSMs, automatic rotation, detailed audit logging, and seamless integration across 100+ AWS services. Secrets Manager automates credential rotation, encrypts secrets at rest, versions all changes, and provides fine-grained access control through IAM and resource policies.

**Key Takeaways:**

- **Use Customer Managed CMKs for Production:** Full control over policies, rotation, and deletion; required for compliance frameworks; \$1/month per key minimal cost
- **Enable Automatic Key Rotation:** Annual rotation transparent to applications; maintains compliance; no code changes required; best practice for all production keys
- **Implement Envelope Encryption:** Encrypt large data with local data keys; only DEK sent to KMS; eliminates 4 KB limit; dramatically improves performance and reduces costs
- **Cache Secrets and Data Keys:** 1-hour TTL reduces API calls 99%; lowers costs from \$50/month to \$0.05/month; improves latency significantly
- **Use Encryption Context:** Additional authenticated data prevents misuse; must match for decryption; provides audit clarity; no additional cost
- **Automate Secret Rotation:** RDS/Redshift rotation built-in; zero-downtime password changes; 30-90 day schedule recommended; eliminates manual rotation errors
- **Monitor with CloudTrail:** Every KMS/Secrets Manager API call logged; detect unauthorized access; compliance reporting; incident investigation

KMS and Secrets Manager integrate throughout AWS—encrypting S3 buckets, EBS volumes, RDS databases, Lambda variables, SQS messages with KMS; rotating RDS credentials, storing API keys, managing certificates with Secrets Manager. Next chapter covers AWS CloudTrail and Config for comprehensive audit logging and configuration compliance across all services.

## Hands-On Lab Exercise

**Objective:** Build complete encryption and secrets management system with automated rotation and monitoring.

**Scenario:** Secure application with encrypted data storage and rotated database credentials.

**Prerequisites:**

- AWS account with admin access
- Running RDS MySQL database
- Lambda execution role configured

**Steps:**

1. **Create Encryption Infrastructure (30 minutes)**
    - Create customer-managed CMK
    - Configure key policy (admin + application access)
    - Create key alias for easy reference
    - Enable automatic annual rotation
    - Tag CMK appropriately
    - Verify CloudTrail logging enabled
2. **Implement S3 Encryption (20 minutes)**
    - Create S3 bucket with default encryption (SSE-KMS)
    - Upload test files
    - Verify encryption with custom CMK
    - Test access from application role
    - Monitor KMS API calls in CloudTrail
3. **Configure Secrets Manager (40 minutes)**
    - Store RDS credentials in Secrets Manager
    - Encrypt secret with custom CMK
    - Configure automatic 30-day rotation
    - Test manual rotation
    - Verify zero-downtime credential change
    - Create Lambda function retrieving secret
4. **Implement Caching (20 minutes)**
    - Add secret caching to Lambda function (1-hour TTL)
    - Test cache performance (first vs subsequent calls)
    - Measure cost savings (API call reduction)
    - Verify cache invalidation after rotation
5. **Monitoring and Alerts (30 minutes)**
    - Create CloudWatch dashboard for KMS metrics
    - Set up alert for key deletion
    - Enable rotation failure notifications
    - Test audit trail in CloudTrail
    - Generate compliance report

**Expected Outcomes:**

- CMK protecting all sensitive data
- Secrets Manager rotating credentials automatically
- 99% reduction in KMS/Secrets Manager API calls (caching)
- Complete audit trail of all encryption operations
- Alerts configured for security events
- Total cost: <\$5/month (1 CMK + 1 secret)


## Review Questions

1. **What is envelope encryption?**
a) Encrypting envelopes
b) Encrypting data key with master key ✓
c) Double encryption
d) TLS encryption

**Answer: B** - Envelope encryption: encrypt data with DEK, encrypt DEK with CMK for unlimited data encryption

2. **What is the maximum size for direct KMS Encrypt operation?**
a) 1 KB
b) 4 KB ✓
c) 256 KB
d) Unlimited

**Answer: B** - KMS Encrypt limited to 4 KB; use envelope encryption for larger data

3. **What does automatic key rotation do?**
a) Deletes old key
b) Generates new key material annually ✓
c) Changes key ID
d) Requires application updates

**Answer: B** - Annual rotation generates new key material; old ciphertext still decryptable; transparent to applications

4. **What is required for cross-account KMS access?**
a) Key policy only
b) IAM policy only
c) Both key policy AND IAM policy ✓
d) VPC peering

**Answer: C** - Cross-account requires key policy (allow other account) AND IAM policy (grant specific permissions)

5. **What is encryption context?**
a) Encrypted metadata
b) Additional authenticated data (AAD) ✓
c) Key description
d) Algorithm settings

**Answer: B** - Encryption context: AAD that must match for decryption; not encrypted but authenticated; security and audit benefits

6. **How long is Secrets Manager rotation grace period?**
a) No grace period
b) Until next rotation
c) Old password works during rotation ✓
d) 24 hours

**Answer: C** - Zero-downtime rotation: old password valid during rotation; atomic switch to new password

7. **What happens if CMK is deleted?**
a) Data decrypted automatically
b) Key restored from backup
c) Data permanently inaccessible ✓
d) Automatic key generation

**Answer: C** - CMK deletion makes all encrypted data permanently inaccessible; 7-30 day waiting period (can cancel)

8. **What is the cost of AWS-managed CMK?**
a) \$1/month
b) \$0.40/month
c) \$0.03/10K requests
d) Free ✓

**Answer: D** - AWS-managed keys (aws/s3, aws/ebs) are free; customer-managed keys are \$1/month

9. **What is the recommended secret caching TTL?**
a) No caching
b) 1 hour ✓
c) 24 hours
d) 7 days

**Answer: B** - 1-hour TTL balances cost savings (fewer API calls) with security (reasonably fresh credentials)

10. **What service logs all KMS operations?**
a) CloudWatch
b) CloudTrail ✓
c) Config
d) GuardDuty

**Answer: B** - CloudTrail logs every KMS API call for audit, compliance, and incident investigation

***

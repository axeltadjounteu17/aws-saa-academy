# Chapitre 24 : AWS KMS \& Secrets Manager

##Présentation

Les violations de données exposent des milliards d'enregistrements chaque année, les informations d'identification volées et les données non cryptées étant à l'origine de 80 % des incidents de sécurité. Les approches de chiffrement traditionnelles (gestion manuelle des clés, stockage des secrets dans les fichiers de configuration, informations d'identification codées en dur dans le code de l'application) créent des vulnérabilités de sécurité que les attaquants exploitent. AWS Key Management Service (KMS) et AWS Secrets Manager résolvent ces problèmes grâce à une gestion centralisée des clés, un chiffrement automatique, une rotation des informations d'identification et un contrôle d'accès précis. Une compréhension approfondie de ces services est essentielle pour les architectes de solutions qui créent des systèmes sécurisés qui protègent les données au repos, en transit et tout au long du cycle de vie des applications.

La complexité du chiffrement a toujours empêché une adoption généralisée. Les développeurs doivent générer des clés, les stocker en toute sécurité, les alterner périodiquement, contrôler les accès et intégrer le chiffrement dans chaque service. Une erreur (clés stockées dans le code, rotation oubliée, autorisations trop larges) compromet la sécurité. KMS élimine cette complexité en gérant les clés de chiffrement de manière centralisée avec des modules de sécurité matérielle (HSM) validés FIPS 140-2, une rotation automatique, des journaux d'audit détaillés et une intégration transparente des services AWS. Secrets Manager étend cette protection aux secrets d'application (mots de passe de base de données, clés API, jetons OAuth), en automatisant la rotation et en éliminant les informations d'identification codées en dur.

Ce chapitre s'appuie sur les connaissances antérieures en matière de sécurité (politiques IAM du chapitre 2, Security Hub du chapitre 23) en ajoutant la gestion du chiffrement et des secrets. KMS s'intègre aux services abordés précédemment : chiffrement d'objets S3, de volumes EBS, de bases de données RDS, de messages SQS et de variables d'environnement Lambda. Secrets Manager se connecte à RDS pour la rotation automatique des informations d'identification de base de données. Le chapitre couvre les principes fondamentaux du chiffrement, les hiérarchies de clés, le chiffrement des enveloppes, les politiques de clés, l'accès entre comptes, la rotation automatique, l'intégration Lambda, les cadres de conformité, la surveillance et la création de systèmes de production où les données restent chiffrées de la création à la suppression, les informations d'identification tournent automatiquement et les équipes de sécurité maintiennent des pistes d'audit complètes.

## Théorie \&Concepts

### Principes fondamentaux du chiffrement

**Types de cryptage :**
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
**Chiffrement symétrique ou asymétrique :**
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
**Cryptage de l'enveloppe :**
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
### Service de gestion de clés AWS (KMS)

**Architecture KMS :**
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
**Opérations de l'API KMS :**
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
**Politiques clés :**
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
**Accès entre comptes :**
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
### Gestionnaire de secrets AWS

**Objectif et architecture :**
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
**Rotation automatique :**
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
**Gestionnaire de secrets et magasin de paramètres :**
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
### Intégration du chiffrement avec les services AWS

**Chiffrement service par service :**
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
### Conformité et audit

**Intégration CloudTrail :**
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
## Implémentation pratique

### Atelier 1 : Création et utilisation de clés CMK gérées par le client

**Objectif :** Créer une clé CMK, chiffrer/déchiffrer les données, configurer la politique de clé.

**Étape 1 : Créer une clé CMK gérée par le client**
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
**Étape 2 : Configurer la stratégie de clé**
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
**Étape 3 : Chiffrer et décrypter les données**
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
**Étape 4 : Chiffrement d'enveloppe pour les fichiers volumineux**
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
**Étape 5 : Activer la rotation des clés**
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
### Lab 2 : Secrets Manager avec intégration RDS

**Objectif :** Stockez les informations d'identification RDS dans Secrets Manager avec rotation automatique.

**Étape 1 : Créer le secret de la base de données RDS**
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
**Étape 2 : Configurer la rotation automatique**
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
**Étape 3 : Récupérer le secret dans l'application**
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
**Étape 4 : Fonction Lambda avec Secrets Manager**
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
### Atelier 3 : Accès KMS entre comptes

**Objectif :** Accordez à un autre compte AWS l'accès pour déchiffrer les données chiffrées avec votre CMK.

**Étape 1 : Mettre à jour la politique de clé dans le compte A**
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
**Étape 2 : Accorder l'autorisation IAM dans le compte B**
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
**Étape 3 : Tester le décryptage entre comptes**
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
## Connaissances au niveau de la production

### Meilleures pratiques de gestion des clés

**Hiérarchie et organisation clés :**
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
**Contexte de chiffrement pour une sécurité supplémentaire :**
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
**Stratégie de mise en cache des secrets :**
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
### Conformité et automatisation des audits

**Contrôles de conformité automatisés :**
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
**Surveillance de l'utilisation des clés :**
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
### Optimisation des coûts

**Réduction des coûts KMS :**
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
## Conseils \& Bonnes pratiques

### Conseils de gestion des clés

**Astuce 1 : activez toujours la rotation des clés**
Activez la rotation annuelle automatique pour les clés gérées par le client : transparente pour les applications et garantissant la conformité.
```python
kms.enable_key_rotation(KeyId=key_id)
```
**Astuce 2 : Utilisez des alias clés pour plus de flexibilité**
Référencer les clés par alias (`alias/my-app-key`) au lieu de l'ID de clé : permet le remplacement de clé sans modification du code.

**Astuce 3 : Implémenter le contexte de chiffrement**
Ajoutez un contexte de chiffrement pour plus de sécurité et de clarté d’audit : évitez toute utilisation abusive des données chiffrées.

**Astuce 4 : Séparez les clés par environnement**
Utilisez différentes CMK pour la production, la préparation et le développement : limite le rayon d'explosion et simplifie l'audit.

**Astuce 5 : Documentez l'objectif clé dans la description**
Ajoutez des descriptions claires aux clés CMK : aide les équipes à comprendre l'utilisation et la propriété des clés.

### Conseils pour la gestion des secrets

**Astuce 6 : Cache les secrets de manière agressive**
Cachez les secrets avec une durée de vie d'une heure : réduit les appels d'API de 99 %, réduit les coûts et la latence.

**Astuce 7 : Utilisez la rotation automatique**
Activez la rotation automatique des informations d'identification RDS/Redshift : modification du mot de passe sans temps d'arrêt.

**Astuce 8 : Tagez les secrets de l'organisation**
Baliser les secrets avec Environnement, Application, Propriétaire : permet le suivi des coûts et le contrôle d'accès.

**Astuce 9 : Utilisez les politiques de ressources pour plusieurs comptes**
Accordez un accès entre comptes via des stratégies de ressources, plus simple que la prise en charge du rôle IAM.

**Astuce 10 : Surveillez l'accès secret**
Activez la journalisation CloudTrail et alertez sur les modèles d'accès inhabituels : détectez les violations potentielles à un stade précoce.

### Conseils de sécurité

**Astuce 11 : Ne codez jamais en dur les informations d'identification**
Utilisez toujours Secrets Manager ou Parameter Store : élimine l’exposition des informations d’identification dans le code/configurations.

**Astuce 12 : implémentez le moindre privilège**
Accordez les autorisations KMS minimales nécessaires : `kms:Decrypt` uniquement pour les applications, pas `kms:*`.

**Astuce 13 : Activez CloudTrail pour toutes les clés**
Assurez-vous que CloudTrail est activé dans toutes les régions : piste d'audit complète de l'utilisation des clés.

**Astuce 14 : Définissez des rappels de calendrier pour une rotation manuelle**
Si vous n'utilisez pas la rotation automatique, définissez des rappels trimestriels pour éviter l'obsolescence des informations d'identification.

**Astuce 15 : Testez la reprise après sinistre**
Testez régulièrement la restauration des données chiffrées avec des clés CMK de sauvegarde : vérifiez que les procédures de récupération fonctionnent.

## Pièges \& Remèdes

### Piège 1 : Suppression accidentelle de clé

**Problème :** La suppression de CMK est programmée, les données cryptées deviennent inaccessibles après 7 à 30 jours.

**Pourquoi cela arrive :**

- Suppression accidentelle via console/API
- Scripts d'automatisation avec commandes de suppression
- Scripts de nettoyage sans vérifications appropriées
- Incompréhension du processus de suppression

**Impact :**

- Toutes les données cryptées avec la clé deviennent définitivement inaccessibles
- Objets S3 illisibles
- Volumes EBS non montables
- Bases de données RDS inaccessibles
- Perte complète des données si aucune sauvegarde avec des clés différentes
- Perturbation des activités
- Violations de conformité

**Exemple :**
```
Day 1: Administrator accidentally schedules key for deletion
Day 7-30: Waiting period (can still cancel)
Day 31: Key permanently deleted
Result: 10 TB of encrypted S3 data permanently inaccessible
Recovery: Impossible (data lost forever)
Cost: Millions in data loss, recovery efforts, reputation damage
```
**Remède :**

**Étape 1 : implémenter la protection contre la suppression**
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
**Étape 2 : Activer les alarmes CloudWatch**
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
**Étape 3 : Annulation automatisée de la suppression de clé**
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
**Étape 4 : Inventaire régulier des clés**
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
**Prévention :**

- Implémenter un workflow d'approbation pour la suppression de clé
- Tagguer les clés critiques (Environnement=Production)
- Activer les alarmes CloudWatch pour ScheduleKeyDeletion
- Annulation automatisée des clés de production
- Audits réguliers du statut clé
- Formation sur les conséquences de la suppression
- Exiger MFA pour les opérations de suppression de clés

***

### Piège 2 : Problèmes d'autorisation de Secrets Manager

**Problème :** Les applications ne parviennent pas à récupérer les secrets en raison d'une mauvaise configuration des autorisations IAM.

**Pourquoi cela arrive :**

- Autorisation `secretsmanager:GetSecretValue` manquante
- Autorisation `kms:Decrypt` manquante pour CMK
- Inadéquation de l'ARN des ressources
- L'accès au point de terminaison du VPC n'est pas configuré
- Clés de condition bloquant l'accès

**Impact :**

-Échecs de démarrage des applications
- Erreurs de connexion aux bases de données
- Pannes de service
- Difficile à déboguer (autorisations opaques)
- Retards de développement

**Exemple :**
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
**Remède :**

**Étape 1 : Politique IAM complète**
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
**Étape 2 : Tester le script d'autorisations**
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
**Étape 3 : Validation automatisée des autorisations**
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
**Prévention :**

- Utiliser le simulateur de politique IAM avant le déploiement
- Test avec les informations d'identification du rôle réel
- Documenter les autorisations requises
- Créer des modèles de politique IAM réutilisables
- Validation automatisée des autorisations dans CI/CD
- Surveiller CloudTrail pour les erreurs AccessDenied

***

### Piège 3 : échecs de rotation

**Problème :** La rotation automatique des secrets échoue, laissant les anciens mots de passe actifs ou interrompant l'accès aux applications.

**Pourquoi cela arrive :**

- Erreurs de la fonction de rotation Lambda
- Problèmes de connexion à la base de données
- Autorisations Lambda insuffisantes
- Problèmes de connectivité réseau (VPC)
- Connexions maximales à la base de données atteintes
- Temporisation de la fonction de rotation

**Impact :**

- Anciens mots de passe non modifiés (risque de sécurité)
- Les applications perdent l'accès à la base de données
- Pannes de service
- Violations de conformité
- Intervention manuelle requise

**Exemple :**
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
**Remède :**

**Étape 1 : Configurer le VPC pour la rotation Lambda**
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
**Étape 2 : Surveillance complète des rotations**
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
**Étape 3 : Test de rotation manuelle**
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
**Prévention :**

- Testez la rotation manuellement avant d'activer l'automatique
- Assurez-vous que Lambda dispose d'un VPC et d'un accès Internet
- Surveiller CloudWatch Logs pour les erreurs de rotation
- Configurer des alarmes CloudWatch pour les échecs de rotation
- Augmenter le délai d'attente Lambda (5 minutes minimum)
- Étapes de dépannage de la rotation des documents
- Conserver les informations d'identification de l'administrateur de sauvegarde (secret séparé)

***

## Résumé du chapitre

AWS KMS et Secrets Manager assurent un chiffrement et une gestion des secrets de niveau entreprise, éliminant ainsi la complexité et le risque liés à la gestion manuelle des clés. KMS offre un contrôle centralisé des clés de chiffrement avec des HSM validés FIPS 140-2, une rotation automatique, une journalisation d'audit détaillée et une intégration transparente dans plus de 100 services AWS. Secrets Manager automatise la rotation des informations d'identification, chiffre les secrets au repos, versionne toutes les modifications et fournit un contrôle d'accès précis via les politiques IAM et de ressources.

**Principaux points à retenir :**

- **Utiliser les clés CMK gérées par le client pour la production :** Contrôle total sur les politiques, la rotation et la suppression ; requis pour les cadres de conformité ; \$1/mois par clé, coût minimal
- **Activer la rotation automatique des clés :** Rotation annuelle transparente pour les applications ; maintient la conformité ; aucune modification de code n'est requise ; meilleures pratiques pour toutes les clés de production
- **Mise en œuvre du chiffrement d'enveloppe :** Chiffrez les données volumineuses avec des clés de données locales ; seul DEK envoyé à KMS ; élimine la limite de 4 Ko ; améliore considérablement les performances et réduit les coûts
- **Secrets de cache et clés de données :** La durée de vie d'une heure réduit les appels d'API de 99 % ; réduit les coûts de 50 $/mois à 0,05 $/mois ; améliore considérablement la latence
- **Utiliser le contexte de cryptage :** Des données authentifiées supplémentaires empêchent toute utilisation abusive ; doit correspondre pour le décryptage ; apporte de la clarté à l'audit ; pas de frais supplémentaires
- **Automatiser la rotation secrète :** Rotation RDS/Redshift intégrée ; changements de mot de passe sans temps d'arrêt ; Programme de 30 à 90 jours recommandé ; élimine les erreurs de rotation manuelle
- **Surveiller avec CloudTrail :** Chaque appel d'API KMS/Secrets Manager est enregistré ; détecter les accès non autorisés ; rapports de conformité ; enquête sur un incident

KMS et Secrets Manager s'intègrent dans AWS : chiffrement des compartiments S3, des volumes EBS, des bases de données RDS, des variables Lambda et des messages SQS avec KMS ; rotation des informations d'identification RDS, stockage des clés API, gestion des certificats avec Secrets Manager. Le chapitre suivant couvre AWS CloudTrail et Config pour une journalisation d'audit complète et une conformité de configuration sur tous les services.

## Exercice pratique en laboratoire

**Objectif :** Créer un système complet de chiffrement et de gestion des secrets avec rotation et surveillance automatisées.

**Scénario :** Application sécurisée avec stockage de données crypté et informations d'identification de base de données en rotation.

**Prérequis :**

- Compte AWS avec accès administrateur
- Exécution de la base de données RDS MySQL
- Rôle d'exécution Lambda configuré

**Étapes :**

1. **Créer une infrastructure de chiffrement (30 minutes)**
    - Créer une CMK gérée par le client
    - Configurer la politique de clé (administrateur + accès aux applications)
    - Créez un alias clé pour une référence facile
    - Activer la rotation annuelle automatique
    - Baliser CMK de manière appropriée
    - Vérifiez la journalisation CloudTrail activée
2. **Mise en œuvre du cryptage S3 (20 minutes)**
    - Créer un bucket S3 avec cryptage par défaut (SSE-KMS)
    - Télécharger des fichiers de test
    - Vérifier le cryptage avec CMK personnalisé
    - Tester l'accès à partir du rôle d'application
    - Surveiller les appels d'API KMS dans CloudTrail
3. **Configurer Secrets Manager (40 minutes)**
    - Stocker les informations d'identification RDS dans Secrets Manager
    - Chiffrer le secret avec une CMK personnalisée
    - Configurer la rotation automatique de 30 jours
    - Tester la rotation manuelle
    - Vérifier le changement d'identifiant sans temps d'arrêt
    - Créer une fonction Lambda récupérant le secret
4. **Implémenter la mise en cache (20 minutes)**
    - Ajouter une mise en cache secrète à la fonction Lambda (TTL d'une heure)
    - Tester les performances du cache (premiers appels vs suivants)
    - Mesurer les économies de coûts (réduction des appels API)
    - Vérifier l'invalidation du cache après rotation
5. **Surveillance et alertes (30 minutes)**
    - Créer un tableau de bord CloudWatch pour les métriques KMS
    - Configurer une alerte pour la suppression de clé
    - Activer les notifications d'échec de rotation
    - Tester la piste d'audit dans CloudTrail
    - Générer un rapport de conformité

**Résultats attendus :**

- CMK protégeant toutes les données sensibles
- Rotation automatique des informations d'identification de Secrets Manager
- 99% de réduction des appels API KMS/Secrets Manager (mise en cache)
- Piste d'audit complète de toutes les opérations de cryptage
- Alertes configurées pour les événements de sécurité
- Coût total : <\$5/mois (1 CMK + 1 secret)


## Questions de révision

1. **Qu'est-ce que le cryptage d'enveloppe ?**
a) Chiffrement des enveloppes
b) Cryptage de la clé de données avec la clé principale ✓
c) Double cryptage
d) Chiffrement TLS

**Réponse : B** - Chiffrement d'enveloppe : chiffrez les données avec DEK, chiffrez DEK avec CMK pour un chiffrement illimité des données

2. **Quelle est la taille maximale pour l'opération KMS Encrypt directe ?**
a) 1 Ko
b) 4 Ko ✓
c) 256 Ko
d) Illimité

**Réponse : B** - KMS Encrypt limité à 4 Ko ; utiliser le cryptage d'enveloppe pour les données plus volumineuses

3. **À quoi sert la rotation automatique des clés ?**
a) Supprime l'ancienne clé
b) Génère du nouveau matériel clé chaque année ✓
c) Change l'ID de clé
d) Nécessite des mises à jour de l'application

**Réponse : B** - La rotation annuelle génère de nouveaux éléments clés ; ancien texte chiffré encore déchiffrable ; transparent pour les applications

4. **Que faut-il pour accéder à KMS entre comptes ?**
a) Politique clé uniquement
b) Politique IAM uniquement
c) Politique clé ET politique IAM ✓
d) Appairage de VPC

**Réponse : C** – Les comptes croisés nécessitent une stratégie de clé (autoriser un autre compte) ET une stratégie IAM (accorder des autorisations spécifiques)

5. **Qu'est-ce que le contexte de chiffrement ?**
a) Métadonnées cryptées
b) Données authentifiées supplémentaires (AAD) ✓
c) Description des clés
d) Paramètres de l'algorithme

**Réponse : B** - Contexte de chiffrement : AAD qui doit correspondre pour le déchiffrement ; non crypté mais authentifié ; avantages en matière de sécurité et d'audit

6. **Quelle est la durée de la période de grâce pour la rotation de Secrets Manager ?**
a) Pas de délai de grâce
b) Jusqu'à la prochaine rotation
c) L'ancien mot de passe fonctionne pendant la rotation ✓
d) 24 heures

**Réponse : C** - Rotation sans temps d'arrêt : ancien mot de passe valide pendant la rotation ; basculement atomique vers un nouveau mot de passe

7. **Que se passe-t-il si CMK est supprimé ?**
a) Données décryptées automatiquement
b) Clé restaurée à partir d'une sauvegarde
c) Données inaccessibles en permanence ✓
d) Génération automatique de clés

**Réponse : C** - La suppression de la clé CMK rend toutes les données chiffrées inaccessibles de manière permanente ; Période d'attente de 7 à 30 jours (peut annuler)

8. **Quel est le coût d'une clé CMK gérée par AWS ?**
a) \$1/mois
b) \0,40 $/mois
c) \$0,03/10 000 requêtes
d) Gratuit ✓

**Réponse : D** - Les clés gérées par AWS (aws/s3, aws/ebs) sont gratuites ; les clés gérées par le client coûtent \$1/mois

9. **Quelle est la durée de vie recommandée pour la mise en cache secrète ?**
a) Pas de mise en cache
b) 1 heure ✓
c) 24 heures
d) 7 jours

**Réponse : B** – Une durée de vie d'une heure équilibre les économies de coûts (moins d'appels d'API) et la sécurité (informations d'identification raisonnablement récentes)

10. **Quel service enregistre toutes les opérations KMS ?**
a) CloudWatch
b) CloudTrail ✓
c) Configuration
d) Service de garde

**Réponse : B** - CloudTrail enregistre chaque appel d'API KMS à des fins d'audit, de conformité et d'enquête sur les incidents.

***
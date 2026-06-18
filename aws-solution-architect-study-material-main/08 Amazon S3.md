# Part 3: Storage Services

# Chapter 8: Amazon S3

## Introduction

Amazon Simple Storage Service (S3) is the foundation of AWS storage, launched in 2006 as one of the first AWS services. It revolutionized storage by providing unlimited, durable, highly available object storage accessible via simple HTTP APIs. Today, S3 stores trillions of objects and regularly delivers millions of requests per second, serving as the backbone for countless applications, data lakes, backup systems, content distribution networks, and machine learning pipelines.

S3's simplicity masks its sophistication. Behind the straightforward "upload and retrieve" interface lies a powerful system with 11 nines of durability (99.999999999%), multiple storage classes optimized for different access patterns, intelligent lifecycle management, versioning for data protection, encryption options, fine-grained access controls, event notifications, replication across regions, and analytics capabilities. Understanding these features and how to combine them effectively separates basic S3 usage from production-grade implementations.

The cost implications of S3 decisions are significant. Choosing the wrong storage class can waste thousands of dollars monthly. Improper lifecycle policies can delete critical data or fail to reduce costs. Not using multipart uploads for large files impacts performance and reliability. Public bucket exposures have led to massive data breaches. Cross-region replication misconfigurations can create unexpected costs. Yet with proper configuration, S3 provides incredibly cost-effective storage—as low as \$0.99 per TB per month for Glacier Deep Archive.

This chapter provides comprehensive coverage of Amazon S3 from fundamentals to production patterns. You'll learn storage classes and their optimal use cases, versioning and lifecycle policies, encryption and security models, performance optimization techniques, event-driven architectures, compliance and governance, and cost optimization strategies. Whether you're building a simple backup solution or a petabyte-scale data lake, mastering S3 is essential for AWS expertise.

## Theory \& Concepts

### S3 Fundamentals

**Object Storage Model:**

S3 is object storage, not file or block storage. Objects consist of:

1. **Key:** Unique identifier (like filename with path)
2. **Value:** Object data (0 bytes to 5 TB)
3. **Metadata:** System and user-defined metadata
4. **Version ID:** Unique identifier if versioning enabled
5. **Access Control:** Permissions for the object

**Structure:**

```
Bucket: my-bucket (globally unique name)
├── Object: documents/report.pdf
│   ├── Value: [binary data]
│   ├── Metadata: content-type=application/pdf, custom-tag=finance
│   └── Version ID: abc123xyz
└── Object: images/logo.png
```

**Key Characteristics:**

- **Unlimited Storage:** No capacity limits
- **Durability:** 99.999999999% (11 9's) - lose 1 object per 10 million for 10 million years
- **Availability:** 99.9% to 99.99% depending on storage class
- **Scalability:** Scales automatically, handles millions of requests per second
- **Global Namespace:** Bucket names must be globally unique
- **Regional Service:** Buckets created in specific region, data doesn't leave region unless configured

**S3 vs File Systems:**


| Feature | S3 (Object Storage) | File System (Block/File) |
| :-- | :-- | :-- |
| **Structure** | Flat namespace, objects with keys | Hierarchical directories |
| **Access** | HTTP/HTTPS APIs | POSIX file operations |
| **Modification** | Entire object replaced | Partial file updates |
| **Performance** | Optimized for sequential access | Random I/O supported |
| **Consistency** | Strong consistency | Strong consistency |
| **Use Case** | Backups, media, data lakes | Databases, applications |

### Storage Classes

S3 offers multiple storage classes optimized for different access patterns and costs.

**S3 Standard:**

- **Use Case:** Frequently accessed data
- **Availability:** 99.99%
- **Durability:** 99.999999999%
- **Min Storage Duration:** None
- **Retrieval Fee:** None
- **Cost:** \$0.023/GB/month (us-east-1)
- **Example:** Active website content, mobile apps

**S3 Intelligent-Tiering:**

- **Use Case:** Unknown or changing access patterns
- **Availability:** 99.9%
- **Features:** Automatically moves objects between tiers
    - Frequent Access: Same as Standard
    - Infrequent Access: 30 days no access
    - Archive Instant Access: 90 days no access
    - Archive Access: 90+ days (optional)
    - Deep Archive Access: 180+ days (optional)
- **Cost:** \$0.023/GB (Frequent) + \$0.0025/1000 objects monitoring
- **Retrieval Fee:** None for frequent/infrequent tiers
- **Example:** User-generated content, analytics data

**S3 Standard-IA (Infrequent Access):**

- **Use Case:** Less frequently accessed, but rapid access needed
- **Availability:** 99.9%
- **Min Storage Duration:** 30 days
- **Min Object Size:** 128 KB
- **Retrieval Fee:** \$0.01/GB
- **Cost:** \$0.0125/GB/month
- **Example:** Backups, disaster recovery files

**S3 One Zone-IA:**

- **Use Case:** Infrequent access, recreatable data
- **Availability:** 99.5%
- **Durability:** 99.999999999% (in single AZ)
- **Min Storage Duration:** 30 days
- **Risk:** Data lost if AZ destroyed
- **Cost:** \$0.01/GB/month
- **Example:** Secondary backups, easily reproducible data

**S3 Glacier Instant Retrieval:**

- **Use Case:** Archive with instant access (milliseconds)
- **Availability:** 99.9%
- **Min Storage Duration:** 90 days
- **Retrieval Fee:** \$0.03/GB
- **Cost:** \$0.004/GB/month
- **Example:** Medical images, news media archives

**S3 Glacier Flexible Retrieval (formerly Glacier):**

- **Use Case:** Archive with retrieval in minutes to hours
- **Availability:** 99.99%
- **Min Storage Duration:** 90 days
- **Retrieval Options:**
    - Expedited: 1-5 minutes, \$0.03/GB
    - Standard: 3-5 hours, \$0.01/GB
    - Bulk: 5-12 hours, \$0.0025/GB
- **Cost:** \$0.0036/GB/month
- **Example:** Regulatory archives, long-term backups

**S3 Glacier Deep Archive:**

- **Use Case:** Long-term archive, lowest cost
- **Availability:** 99.99%
- **Min Storage Duration:** 180 days
- **Retrieval Options:**
    - Standard: 12 hours, \$0.02/GB
    - Bulk: 48 hours, \$0.0025/GB
- **Cost:** \$0.00099/GB/month (~\$1/TB/month)
- **Example:** Compliance archives (7-10 year retention)

**Storage Class Comparison:**


| Class | \$/GB/Month | Retrieval Fee | Min Duration | Use Case |
| :-- | :-- | :-- | :-- | :-- |
| Standard | \$0.023 | None | None | Hot data |
| Intelligent-Tiering | \$0.023* | None* | None | Unknown patterns |
| Standard-IA | \$0.0125 | \$0.01/GB | 30 days | Cool data |
| One Zone-IA | \$0.01 | \$0.01/GB | 30 days | Recreatable cool |
| Glacier Instant | \$0.004 | \$0.03/GB | 90 days | Archive instant |
| Glacier Flexible | \$0.0036 | \$0.01/GB | 90 days | Archive hours |
| Glacier Deep Archive | \$0.00099 | \$0.02/GB | 180 days | Archive days |

*Intelligent-Tiering charges vary by tier accessed

### Versioning

Versioning preserves, retrieves, and restores every version of every object.

**States:**

- **Unversioned (default):** Objects have null version ID
- **Versioning-enabled:** New versions created on update
- **Versioning-suspended:** No new versions, but existing preserved

**How It Works:**

```
Upload report.pdf → Version ID: v1 (latest)
Upload report.pdf → Version ID: v2 (latest), v1 (older)
Upload report.pdf → Version ID: v3 (latest), v2, v1 (older)
Delete report.pdf → Version ID: delete marker (latest), v3, v2, v1 still exist
```

**Version Management:**

```bash
# Enable versioning
aws s3api put-bucket-versioning \
    --bucket my-bucket \
    --versioning-configuration Status=Enabled

# List versions
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix documents/

# Get specific version
aws s3api get-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id abc123xyz \
    output.pdf

# Delete specific version (permanent)
aws s3api delete-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id abc123xyz

# Delete (creates delete marker)
aws s3 rm s3://my-bucket/documents/report.pdf

# Restore (delete the delete marker)
aws s3api delete-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id <delete-marker-id>
```

**Versioning Benefits:**

- Protect against accidental deletion
- Recover from application failures
- Archive previous versions
- Meet compliance requirements

**Versioning Considerations:**

- Storage costs multiply (each version stored)
- Lifecycle policies can manage old versions
- Cannot disable once enabled (only suspend)


### Lifecycle Policies

Automate transitioning objects between storage classes or deleting them.

**Lifecycle Actions:**

1. **Transition Actions:** Move to cheaper storage class
2. **Expiration Actions:** Delete objects

**Example Policy:**

```json
{
  "Rules": [
    {
      "Id": "Archive old logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "Delete incomplete multipart uploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "Id": "Clean old versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

**Lifecycle Constraints:**


| From Class | To Class | Min Days |
| :-- | :-- | :-- |
| Standard | Standard-IA | 30 |
| Standard | Intelligent-Tiering | 0 |
| Standard | Glacier Instant | 0 |
| Standard-IA | Glacier Flexible | 30 |
| Glacier Instant | Glacier Deep Archive | 90 |

**Cannot transition:**

- From any class to Standard
- Objects smaller than 128 KB to IA classes (except Intelligent-Tiering)


### Encryption

S3 provides multiple encryption options for data at rest and in transit.

**Encryption at Rest:**

**1. Server-Side Encryption (SSE):**

**SSE-S3 (Default):**

- S3-managed keys
- AES-256 encryption
- Free
- Enabled by default for new buckets

```bash
# Upload with SSE-S3
aws s3 cp file.txt s3://my-bucket/ \
    --server-side-encryption AES256
```

**SSE-KMS:**

- AWS KMS managed keys
- Audit trail in CloudTrail
- Key rotation
- Cost: KMS API calls (~\$0.03 per 10,000 requests)

```bash
# Upload with SSE-KMS
aws s3 cp file.txt s3://my-bucket/ \
    --server-side-encryption aws:kms \
    --ssekms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123
```

**SSE-C (Customer-Provided Keys):**

- You manage encryption keys
- You provide key with each request
- Key not stored by AWS

```bash
# Upload with SSE-C
aws s3api put-object \
    --bucket my-bucket \
    --key file.txt \
    --body file.txt \
    --sse-customer-algorithm AES256 \
    --sse-customer-key base64-encoded-key
```

**2. Client-Side Encryption:**

- Encrypt before uploading
- Decrypt after downloading
- You manage everything

**Encryption in Transit:**

- HTTPS enforced via bucket policy
- TLS 1.2+ supported

**Encryption Comparison:**


| Method | Key Management | Audit | Cost | Use Case |
| :-- | :-- | :-- | :-- | :-- |
| SSE-S3 | AWS | No | Free | Default, simple |
| SSE-KMS | AWS KMS | CloudTrail | API calls | Compliance, audit |
| SSE-C | Customer | No | Free | Full control |
| Client-Side | Customer | No | Free | Complete control |

### S3 Access Control

Multiple mechanisms control access to S3 resources.

**1. IAM Policies:**
Control what AWS users/roles can do.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/uploads/*"
    }
  ]
}
```

**2. Bucket Policies:**
Control access to entire bucket or objects.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-public-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```

**3. Access Control Lists (ACLs):**
Legacy mechanism (AWS recommends using policies instead).

**4. Block Public Access:**
Account/bucket-level settings to prevent public exposure.

```bash
# Enable block public access (recommended for all buckets)
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true
```

**5. Access Points:**
Simplify managing access for shared datasets.

```bash
# Create access point
aws s3control create-access-point \
    --account-id 123456789012 \
    --name finance-ap \
    --bucket my-data-lake \
    --vpc-configuration VpcId=vpc-12345678
```

**Access Evaluation Order:**

```
1. Check Block Public Access settings
2. Evaluate IAM policies (user/role)
3. Evaluate bucket policies
4. Evaluate ACLs
5. Evaluate Access Point policies

Result: Union of all ALLOW, any DENY wins
```


### S3 Performance

**Request Rate Performance:**

- **Prefix-based partitioning:** 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per prefix
- **Multiple prefixes:** Linearly scalable

```
Example:
my-bucket/prefix1/  → 5,500 GET/s
my-bucket/prefix2/  → 5,500 GET/s
my-bucket/prefix3/  → 5,500 GET/s
Total: 16,500 GET/s
```

**Multipart Upload:**

For objects > 100 MB, use multipart upload:

- Upload parts in parallel
- Improves throughput
- Quick recovery from network failures
- Required for objects > 5 GB

```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Configure multipart thresholds
config = TransferConfig(
    multipart_threshold=1024 * 25,  # 25 MB
    max_concurrency=10,
    multipart_chunksize=1024 * 25,
    use_threads=True
)

# Upload with multipart
s3.upload_file(
    'large-file.zip',
    'my-bucket',
    'uploads/large-file.zip',
    Config=config
)
```

**Transfer Acceleration:**

Enable faster uploads/downloads via CloudFront edge locations.

```bash
# Enable transfer acceleration
aws s3api put-bucket-accelerate-configuration \
    --bucket my-bucket \
    --accelerate-configuration Status=Enabled

# Upload using acceleration endpoint
aws s3 cp file.txt s3://my-bucket/ \
    --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com
```

**Performance Optimization:**


| Technique | Use Case | Performance Gain |
| :-- | :-- | :-- |
| Multipart Upload | Objects > 100 MB | 10x+ throughput |
| Transfer Acceleration | Global uploads | 50-500% faster |
| CloudFront | Frequent reads | <50ms globally |
| S3 Select | Query CSV/JSON | 80% cost reduction |
| Byte-Range Fetches | Large files | Parallel downloads |

### S3 Event Notifications

Trigger actions when objects are created, modified, or deleted.

**Supported Destinations:**

- SNS Topics
- SQS Queues
- Lambda Functions
- EventBridge (recommended for advanced filtering)

**Event Types:**

- `s3:ObjectCreated:*` (Put, Post, Copy, CompleteMultipartUpload)
- `s3:ObjectRemoved:*` (Delete, DeleteMarkerCreated)
- `s3:ObjectRestore:*` (Glacier restore initiated/completed)
- `s3:Replication:*`
- `s3:LifecycleTransition`

**Configuration Example:**

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:process-image",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "images/"},
            {"Name": "suffix", "Value": ".jpg"}
          ]
        }
      }
    }
  ]
}
```

**EventBridge Integration (Recommended):**

More powerful filtering and multiple destinations:

```json
{
  "detail-type": ["Object Created"],
  "source": ["aws.s3"],
  "detail": {
    "bucket": {
      "name": ["my-bucket"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }],
      "size": [{
        "numeric": [">", 1048576]
      }]
    }
  }
}
```


### S3 Replication

Automatically replicate objects across buckets (same or different regions).

**Replication Types:**

**1. Cross-Region Replication (CRR):**

- Different AWS regions
- Use cases: Compliance, disaster recovery, reduce latency

**2. Same-Region Replication (SRR):**

- Same AWS region
- Use cases: Log aggregation, live replication between accounts

**Requirements:**

- Versioning enabled on both buckets
- IAM role with replication permissions
- Optionally: S3 RTC (Replication Time Control) for 99.99% replication within 15 minutes

**Replication Configuration:**

```json
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "documents/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": {
            "Minutes": 15
          }
        }
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
```

**What Gets Replicated:**

- New objects after enabling replication
- Metadata and ACLs
- Object tags
- Optionally: Delete markers, existing objects (S3 Batch Replication)

**What Doesn't Get Replicated:**

- Objects before replication enabled (unless using Batch Replication)
- Server-side encryption with SSE-C
- Objects in Glacier/Deep Archive


## Hands-On Implementation

### Lab 1: Creating and Configuring S3 Buckets

**Objective:** Create production-ready S3 bucket with security and lifecycle policies.

#### Step 1: Create Bucket with Security Settings

```bash
# Create bucket
aws s3api create-bucket \
    --bucket my-production-bucket-$(date +%s) \
    --region us-east-1 \
    --object-ownership BucketOwnerEnforced

BUCKET_NAME="my-production-bucket-1234567890"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Enable default encryption (SSE-S3)
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }]
    }'

# Block all public access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# Enable logging
aws s3api put-bucket-logging \
    --bucket $BUCKET_NAME \
    --bucket-logging-status '{
      "LoggingEnabled": {
        "TargetBucket": "my-logs-bucket",
        "TargetPrefix": "s3-access-logs/"
      }
    }'

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Add tags
aws s3api put-bucket-tagging \
    --bucket $BUCKET_NAME \
    --tagging 'TagSet=[
      {Key=Environment,Value=Production},
      {Key=CostCenter,Value=Engineering},
      {Key=DataClassification,Value=Confidential}
    ]'
```


#### Step 2: Configure Lifecycle Policy

```bash
cat > lifecycle-policy.json <<'EOF'
{
  "Rules": [
    {
      "Id": "Transition-Archive-Delete",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "data/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER_IR"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "Delete-Old-Versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 180
      }
    },
    {
      "Id": "Cleanup-Incomplete-Multipart",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "Id": "Delete-Expired-DeleteMarkers",
      "Status": "Enabled",
      "Expiration": {
        "ExpiredObjectDeleteMarker": true
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration file://lifecycle-policy.json
```


#### Step 3: Configure Bucket Policy

```bash
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceSSLOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "AllowApplicationAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/MyApplicationRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json
```


### Lab 2: Static Website Hosting

**Objective:** Host a static website on S3 with CloudFront CDN.

```bash
# Create bucket for website
WEBSITE_BUCKET="my-website-$(date +%s)"

aws s3api create-bucket \
    --bucket $WEBSITE_BUCKET \
    --region us-east-1

# Enable static website hosting
aws s3api put-bucket-website \
    --bucket $WEBSITE_BUCKET \
    --website-configuration '{
      "IndexDocument": {"Suffix": "index.html"},
      "ErrorDocument": {"Key": "error.html"}
    }'

# Create sample website files
cat > index.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My S3 Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to My S3 Website</h1>
    <p>This is hosted on Amazon S3</p>
    <script src="app.js"></script>
</body>
</html>
EOF

cat > error.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
</body>
</html>
EOF

# Upload files
aws s3 sync . s3://$WEBSITE_BUCKET/ \
    --exclude "*" \
    --include "*.html" \
    --include "*.css" \
    --include "*.js" \
    --cache-control "max-age=3600"

# Make bucket publicly readable
cat > website-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$WEBSITE_BUCKET/*"
  }]
}
EOF

# Disable block public access for website
aws s3api put-public-access-block \
    --bucket $WEBSITE_BUCKET \
    --public-access-block-configuration \
        BlockPublicAcls=false,\
        IgnorePublicAcls=false,\
        BlockPublicPolicy=false,\
        RestrictPublicBuckets=false

aws s3api put-bucket-policy \
    --bucket $WEBSITE_BUCKET \
    --policy file://website-policy.json

# Get website endpoint
echo "Website URL: http://$WEBSITE_BUCKET.s3-website-us-east-1.amazonaws.com"

# Create CloudFront distribution for HTTPS and better performance
aws cloudfront create-distribution \
    --origin-domain-name $WEBSITE_BUCKET.s3-website-us-east-1.amazonaws.com \
    --default-root-object index.html
```


### Lab 3: S3 Batch Operations

**Objective:** Process millions of objects using S3 Batch Operations.

```python
# create_batch_job.py
import boto3
import json

s3control = boto3.client('s3control')
s3 = boto3.client('s3')

def create_inventory():
    """
    Create S3 inventory to list all objects
    Required for batch operations
    """
    
    bucket = 'my-source-bucket'
    inventory_bucket = 'my-inventory-bucket'
    
    inventory_config = {
        'Destination': {
            'S3BucketDestination': {
                'AccountId': '123456789012',
                'Bucket': f'arn:aws:s3:::{inventory_bucket}',
                'Format': 'CSV',
                'Prefix': 'inventory'
            }
        },
        'IsEnabled': True,
        'Id': 'EntireBucketInventory',
        'IncludedObjectVersions': 'Current',
        'OptionalFields': [
            'Size', 'LastModifiedDate', 'StorageClass',
            'ETag', 'IsMultipartUploaded', 'ReplicationStatus'
        ],
        'Schedule': {
            'Frequency': 'Daily'
        }
    }
    
    s3.put_bucket_inventory_configuration(
        Bucket=bucket,
        Id='EntireBucketInventory',
        InventoryConfiguration=inventory_config
    )
    
    print("Inventory configuration created. First report available in 24-48 hours.")

def create_batch_copy_job(manifest_location):
    """
    Create batch job to copy objects to different storage class
    """
    
    account_id = '123456789012'
    role_arn = 'arn:aws:iam::123456789012:role/S3BatchOperationsRole'
    
    response = s3control.create_job(
        AccountId=account_id,
        ConfirmationRequired=False,
        Operation={
            'S3PutObjectCopy': {
                'TargetResource': 'arn:aws:s3:::destination-bucket',
                'StorageClass': 'GLACIER_IR',
                'MetadataDirective': 'COPY',
                'TargetKeyPrefix': 'archived/'
            }
        },
        Report={
            'Bucket': 'arn:aws:s3:::my-reports-bucket',
            'Format': 'Report_CSV_20180820',
            'Enabled': True,
            'Prefix': 'batch-reports',
            'ReportScope': 'AllTasks'
        },
        Manifest={
            'Spec': {
                'Format': 'S3InventoryReport_CSV_20161130',
                'Fields': ['Bucket', 'Key']
            },
            'Location': {
                'ObjectArn': manifest_location,
                'ETag': 'manifest-etag'
            }
        },
        Priority=10,
        RoleArn=role_arn,
        Tags=[
            {'Key': 'Project', 'Value': 'DataArchival'},
            {'Key': 'Environment', 'Value': 'Production'}
        ]
    )
    
    job_id = response['JobId']
    print(f"Batch job created: {job_id}")
    
    return job_id

def create_batch_tagging_job(manifest_location):
    """
    Create batch job to add tags to millions of objects
    """
    
    account_id = '123456789012'
    role_arn = 'arn:aws:iam::123456789012:role/S3BatchOperationsRole'
    
    response = s3control.create_job(
        AccountId=account_id,
        ConfirmationRequired=True,  # Require confirmation before running
        Operation={
            'S3PutObjectTagging': {
                'TagSet': [
                    {'Key': 'Project', 'Value': 'DataLake'},
                    {'Key': 'Classification', 'Value': 'Internal'},
                    {'Key': 'RetentionPolicy', 'Value': '7years'}
                ]
            }
        },
        Report={
            'Bucket': 'arn:aws:s3:::my-reports-bucket',
            'Format': 'Report_CSV_20180820',
            'Enabled': True,
            'Prefix': 'tagging-reports'
        },
        Manifest={
            'Spec': {
                'Format': 'S3BatchOperations_CSV_20180820',
                'Fields': ['Bucket', 'Key']
            },
            'Location': {
                'ObjectArn': manifest_location,
                'ETag': 'manifest-etag'
            }
        },
        Priority=5,
        RoleArn=role_arn
    )
    
    return response['JobId']

# Monitor batch job
def monitor_job(job_id):
    """Monitor batch job progress"""
    
    account_id = '123456789012'
    
    response = s3control.describe_job(
        AccountId=account_id,
        JobId=job_id
    )
    
    job = response['Job']
    
    print(f"Job Status: {job['Status']}")
    print(f"Progress: {job['ProgressSummary']}")
    
    return job['Status']
```

## Production-Level Knowledge

### Data Lake Architecture on S3

**Modern Data Lake Structure:**

```
s3://my-data-lake/
├── raw/                          # Landing zone
│   ├── year=2025/
│   │   ├── month=01/
│   │   │   └── day=15/
│   │   │       └── data.parquet
├── processed/                    # Cleaned/transformed
│   ├── customer_data/
│   │   └── partition_date=2025-01-15/
│   │       └── customers.parquet
├── curated/                      # Business-ready
│   ├── analytics/
│   │   └── monthly_reports/
└── archive/                      # Long-term retention
    └── year=2023/
```

**Data Lake Best Practices:**

```python
# data_lake_manager.py
import boto3
from datetime import datetime
import pyarrow.parquet as pq
import pandas as pd

class DataLakeManager:
    def __init__(self, bucket_name):
        self.s3 = boto3.client('s3')
        self.bucket = bucket_name
    
    def write_partitioned_data(self, df, dataset_name, partition_cols):
        """
        Write DataFrame to S3 with Hive-style partitioning
        Optimized for query performance with Athena/Spark
        """
        
        # Add timestamp if not present
        if 'ingestion_timestamp' not in df.columns:
            df['ingestion_timestamp'] = datetime.utcnow()
        
        # Group by partition columns
        for partition_values, group_df in df.groupby(partition_cols):
            # Build partition path
            partition_path = '/'.join([
                f"{col}={val}" 
                for col, val in zip(partition_cols, partition_values)
            ])
            
            # Convert to Parquet (columnar format for analytics)
            s3_key = f"processed/{dataset_name}/{partition_path}/data.parquet"
            
            # Write to S3
            parquet_buffer = group_df.to_parquet(
                engine='pyarrow',
                compression='snappy',
                index=False
            )
            
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=parquet_buffer,
                StorageClass='INTELLIGENT_TIERING',
                ServerSideEncryption='AES256',
                Metadata={
                    'row_count': str(len(group_df)),
                    'schema_version': '1.0',
                    'created_by': 'data-pipeline'
                }
            )
            
            print(f"Written {len(group_df)} rows to {s3_key}")
    
    def setup_data_lake_governance(self):
        """
        Configure governance policies for data lake
        """
        
        # 1. Set up bucket policies
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "RawDataWriteOnly",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/DataIngestionRole"
                    },
                    "Action": ["s3:PutObject"],
                    "Resource": f"arn:aws:s3:::{self.bucket}/raw/*"
                },
                {
                    "Sid": "ProcessedDataReadWrite",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/DataProcessingRole"
                    },
                    "Action": ["s3:GetObject", "s3:PutObject"],
                    "Resource": f"arn:aws:s3:::{self.bucket}/processed/*"
                },
                {
                    "Sid": "CuratedDataReadOnly",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/AnalystRole"
                    },
                    "Action": ["s3:GetObject", "s3:ListBucket"],
                    "Resource": [
                        f"arn:aws:s3:::{self.bucket}/curated/*",
                        f"arn:aws:s3:::{self.bucket}"
                    ]
                }
            ]
        }
        
        # 2. Enable inventory for large-scale operations
        inventory_config = {
            'Destination': {
                'S3BucketDestination': {
                    'AccountId': '123456789012',
                    'Bucket': f'arn:aws:s3:::my-inventory-bucket',
                    'Format': 'Parquet',
                    'Prefix': 'inventory/'
                }
            },
            'IsEnabled': True,
            'Id': 'DataLakeInventory',
            'IncludedObjectVersions': 'Current',
            'OptionalFields': [
                'Size', 'LastModifiedDate', 'StorageClass',
                'IntelligentTieringAccessTier'
            ],
            'Schedule': {'Frequency': 'Daily'}
        }
        
        # 3. Configure object tagging for classification
        lifecycle_policy = {
            "Rules": [
                {
                    "Id": "TransitionRawData",
                    "Status": "Enabled",
                    "Filter": {"Prefix": "raw/"},
                    "Transitions": [
                        {"Days": 30, "StorageClass": "STANDARD_IA"},
                        {"Days": 90, "StorageClass": "GLACIER_IR"}
                    ]
                },
                {
                    "Id": "ArchiveOldReports",
                    "Status": "Enabled",
                    "Filter": {"Prefix": "curated/"},
                    "Transitions": [
                        {"Days": 365, "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"}
                    ]
                }
            ]
        }
        
        return {
            'bucket_policy': bucket_policy,
            'inventory_config': inventory_config,
            'lifecycle_policy': lifecycle_policy
        }

# Usage
manager = DataLakeManager('my-data-lake-bucket')

# Ingest data with partitioning
customer_df = pd.read_csv('customers.csv')
customer_df['date'] = pd.to_datetime(customer_df['created_at']).dt.date

manager.write_partitioned_data(
    customer_df,
    dataset_name='customers',
    partition_cols=['date']
)
```

**Athena Integration for Querying:**

```sql
-- Create external table pointing to S3 data lake
CREATE EXTERNAL TABLE IF NOT EXISTS customers (
    customer_id STRING,
    name STRING,
    email STRING,
    created_at TIMESTAMP
)
PARTITIONED BY (date DATE)
STORED AS PARQUET
LOCATION 's3://my-data-lake/processed/customers/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');

-- Add partitions (or use MSCK REPAIR TABLE)
ALTER TABLE customers ADD PARTITION (date='2025-01-15')
LOCATION 's3://my-data-lake/processed/customers/date=2025-01-15/';

-- Query data efficiently
SELECT 
    date,
    COUNT(*) as customer_count,
    COUNT(DISTINCT email) as unique_emails
FROM customers
WHERE date BETWEEN DATE '2025-01-01' AND DATE '2025-01-31'
GROUP BY date
ORDER BY date;
```


### Advanced Security and Compliance

**S3 Object Lock (WORM - Write Once Read Many):**

Prevents object deletion or modification for compliance (SEC 17a-4, FINRA, etc.).

```bash
# Enable Object Lock (must be done at bucket creation)
aws s3api create-bucket \
    --bucket compliance-bucket \
    --region us-east-1 \
    --object-lock-enabled-for-bucket

# Configure default retention
aws s3api put-object-lock-configuration \
    --bucket compliance-bucket \
    --object-lock-configuration '{
      "ObjectLockEnabled": "Enabled",
      "Rule": {
        "DefaultRetention": {
          "Mode": "GOVERNANCE",
          "Days": 365
        }
      }
    }'

# Upload object with legal hold
aws s3api put-object \
    --bucket compliance-bucket \
    --key critical-record.pdf \
    --body record.pdf \
    --object-lock-mode COMPLIANCE \
    --object-lock-retain-until-date 2030-01-01T00:00:00Z \
    --object-lock-legal-hold-status ON
```

**Object Lock Modes:**


| Mode | Description | Can Override |
| :-- | :-- | :-- |
| **GOVERNANCE** | Can be overridden with permission | Yes (with bypass permission) |
| **COMPLIANCE** | Cannot be overridden by anyone | No (not even root user) |
| **Legal Hold** | Prevents deletion until removed | Yes (with permission) |

**S3 Access Analyzer:**

```python
# access_analyzer.py
import boto3

def analyze_bucket_access():
    """
    Use Access Analyzer to find buckets with external access
    """
    
    access_analyzer = boto3.client('accessanalyzer')
    s3 = boto3.client('s3')
    
    # Get analyzer findings
    response = access_analyzer.list_findings(
        analyzerArn='arn:aws:access-analyzer:us-east-1:123456789012:analyzer/ConsoleAnalyzer',
        filter={
            'resourceType': {'eq': ['AWS::S3::Bucket']},
            'status': {'eq': ['ACTIVE']}
        }
    )
    
    public_buckets = []
    
    for finding in response['findings']:
        bucket_name = finding['resource'].split(':')[-1]
        
        # Get bucket policy
        try:
            policy = s3.get_bucket_policy(Bucket=bucket_name)
            
            finding_details = {
                'bucket': bucket_name,
                'principal': finding.get('principal', {}),
                'action': finding.get('action', []),
                'condition': finding.get('condition', {}),
                'risk': 'HIGH' if finding['principal'].get('AWS') == '*' else 'MEDIUM'
            }
            
            public_buckets.append(finding_details)
            
        except:
            pass
    
    return public_buckets

# Generate report
findings = analyze_bucket_access()
print(f"Found {len(findings)} buckets with external access")

for finding in findings:
    print(f"\nBucket: {finding['bucket']}")
    print(f"Risk Level: {finding['risk']}")
    print(f"Principal: {finding['principal']}")
    print(f"Actions: {finding['action']}")
```


### S3 Performance Optimization

**Request Rate Optimization:**

```python
# high_throughput_s3.py
import boto3
from concurrent.futures import ThreadPoolExecutor
import hashlib

def upload_high_throughput(files, bucket_name, max_workers=50):
    """
    Upload thousands of files with optimal performance
    Uses prefix sharding for even distribution
    """
    
    s3 = boto3.client('s3')
    
    def upload_file_with_prefix(file_path):
        # Generate hash-based prefix for even distribution
        file_hash = hashlib.md5(file_path.encode()).hexdigest()
        prefix = file_hash[:4]  # First 4 chars of hash
        
        # Upload with sharded key
        key = f"{prefix}/{file_path}"
        
        s3.upload_file(
            file_path,
            bucket_name,
            key,
            ExtraArgs={
                'StorageClass': 'INTELLIGENT_TIERING',
                'Metadata': {'original_name': file_path}
            }
        )
        
        return key
    
    # Parallel uploads
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(upload_file_with_prefix, files))
    
    return results

# With prefix sharding:
# aef3/file1.jpg  → Distributed across S3 partitions
# b2c7/file2.jpg  → Different partition
# f891/file3.jpg  → Another partition
# 
# Result: 3,500 PUT/s per prefix × multiple prefixes = high aggregate throughput
```

**S3 Select and Glacier Select:**

Query objects without retrieving entire object.

```python
# s3_select.py
import boto3

def query_csv_with_s3_select(bucket, key):
    """
    Query CSV file in S3 without downloading entire file
    Saves bandwidth and costs
    """
    
    s3 = boto3.client('s3')
    
    response = s3.select_object_content(
        Bucket=bucket,
        Key=key,
        ExpressionType='SQL',
        Expression="""
            SELECT customer_id, total_amount 
            FROM s3object s 
            WHERE total_amount > 1000
            LIMIT 100
        """,
        InputSerialization={
            'CSV': {
                'FileHeaderInfo': 'USE',
                'RecordDelimiter': '\n',
                'FieldDelimiter': ','
            },
            'CompressionType': 'GZIP'
        },
        OutputSerialization={
            'JSON': {'RecordDelimiter': '\n'}
        }
    )
    
    # Stream results
    results = []
    for event in response['Payload']:
        if 'Records' in event:
            records = event['Records']['Payload'].decode('utf-8')
            results.append(records)
    
    return ''.join(results)

# Example: Query 1 GB CSV file
# Without S3 Select: Download 1 GB, process locally
# With S3 Select: Scan 1 GB server-side, return only matching rows (e.g., 10 MB)
# Cost savings: 80%+ reduction in data transfer
```

**Byte-Range Fetches for Parallel Downloads:**

```python
# parallel_download.py
import boto3
from concurrent.futures import ThreadPoolExecutor

def download_large_file_parallel(bucket, key, output_path, num_threads=10):
    """
    Download large file using byte-range fetches
    10x+ faster than single-threaded download
    """
    
    s3 = boto3.client('s3')
    
    # Get object size
    head = s3.head_object(Bucket=bucket, Key=key)
    file_size = head['ContentLength']
    
    # Calculate chunk size
    chunk_size = file_size // num_threads
    
    def download_chunk(chunk_num):
        start = chunk_num * chunk_size
        end = start + chunk_size - 1 if chunk_num < num_threads - 1 else file_size - 1
        
        response = s3.get_object(
            Bucket=bucket,
            Key=key,
            Range=f'bytes={start}-{end}'
        )
        
        return chunk_num, response['Body'].read()
    
    # Download chunks in parallel
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        chunks = list(executor.map(download_chunk, range(num_threads)))
    
    # Reassemble file
    chunks.sort(key=lambda x: x[0])
    
    with open(output_path, 'wb') as f:
        for _, chunk_data in chunks:
            f.write(chunk_data)
    
    print(f"Downloaded {file_size / (1024**2):.2f} MB to {output_path}")

# Download 1 GB file
# Single thread: ~2 minutes
# 10 parallel threads: ~15 seconds
```


### Cost Optimization Strategies

**S3 Storage Lens:**

Organization-wide visibility into storage usage and optimization opportunities.

```python
# storage_lens_analysis.py
import boto3
import json

def analyze_storage_lens_metrics():
    """
    Analyze S3 Storage Lens metrics for cost optimization
    """
    
    s3control = boto3.client('s3control')
    
    account_id = '123456789012'
    
    # Get Storage Lens configuration
    config = s3control.get_storage_lens_configuration(
        ConfigId='default-account-dashboard',
        AccountId=account_id
    )
    
    # Common optimization opportunities identified:
    opportunities = {
        'incomplete_multipart_uploads': {
            'description': 'Incomplete multipart uploads consuming storage',
            'action': 'Configure lifecycle policy to abort after 7 days',
            'potential_savings': 'Varies by volume'
        },
        'noncurrent_versions': {
            'description': 'Old object versions consuming storage',
            'action': 'Expire noncurrent versions after 90 days',
            'potential_savings': '30-50% reduction'
        },
        'standard_storage_with_low_access': {
            'description': 'Objects in Standard with no recent access',
            'action': 'Use Intelligent-Tiering or transition to IA',
            'potential_savings': '40-60% on untouched objects'
        },
        'glacier_retrievals': {
            'description': 'Frequent Glacier retrievals costing money',
            'action': 'Move to Glacier Instant Retrieval',
            'potential_savings': 'Reduce retrieval costs 80%'
        }
    }
    
    return opportunities

def generate_cost_optimization_report(bucket_name):
    """
    Generate detailed cost optimization recommendations
    """
    
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')
    
    # Analyze storage by class
    paginator = s3.get_paginator('list_objects_v2')
    
    storage_by_class = {}
    total_size = 0
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' not in page:
            continue
        
        for obj in page['Contents']:
            storage_class = obj.get('StorageClass', 'STANDARD')
            size = obj['Size']
            
            storage_by_class[storage_class] = storage_by_class.get(storage_class, 0) + size
            total_size += size
    
    # Calculate current costs
    pricing = {
        'STANDARD': 0.023,
        'STANDARD_IA': 0.0125,
        'INTELLIGENT_TIERING': 0.023,  # Simplified
        'GLACIER_IR': 0.004,
        'GLACIER': 0.0036,
        'DEEP_ARCHIVE': 0.00099
    }
    
    current_cost = sum(
        (size / (1024**3)) * pricing.get(sc, 0.023)
        for sc, size in storage_by_class.items()
    )
    
    # Estimate optimized costs (assuming 50% can move to cheaper tiers)
    optimized_cost = current_cost * 0.5
    
    report = {
        'bucket': bucket_name,
        'total_size_gb': total_size / (1024**3),
        'storage_by_class': {
            sc: size / (1024**3) 
            for sc, size in storage_by_class.items()
        },
        'current_monthly_cost': round(current_cost, 2),
        'optimized_monthly_cost': round(optimized_cost, 2),
        'potential_savings': round(current_cost - optimized_cost, 2),
        'recommendations': [
            'Enable Intelligent-Tiering for unpredictable access patterns',
            'Configure lifecycle policies to transition old data',
            'Delete incomplete multipart uploads',
            'Expire noncurrent versions after 90 days'
        ]
    }
    
    return report

# Generate report
report = generate_cost_optimization_report('my-bucket')
print(json.dumps(report, indent=2))
```

**Intelligent-Tiering Analysis:**

```python
# intelligent_tiering_roi.py

def calculate_intelligent_tiering_roi(bucket_analysis):
    """
    Calculate ROI for enabling Intelligent-Tiering
    
    Intelligent-Tiering costs:
    - Storage: Same as Standard for Frequent Access tier
    - Monitoring: $0.0025 per 1,000 objects
    - Automatic savings: Moves to IA tier after 30 days (46% savings)
    """
    
    total_objects = bucket_analysis['object_count']
    avg_size_gb = bucket_analysis['total_size_gb']
    access_pattern = bucket_analysis['access_pattern']  # % accessed in last 30 days
    
    # Current cost (all in Standard)
    standard_cost = avg_size_gb * 0.023
    
    # Intelligent-Tiering cost
    monitoring_cost = (total_objects / 1000) * 0.0025
    
    # Estimate distribution across tiers
    frequent_pct = access_pattern  # Recently accessed
    infrequent_pct = 1 - frequent_pct  # Not accessed in 30 days
    
    storage_cost = (
        (avg_size_gb * frequent_pct * 0.023) +  # Frequent tier
        (avg_size_gb * infrequent_pct * 0.0125)  # Infrequent tier
    )
    
    intelligent_tiering_cost = storage_cost + monitoring_cost
    
    monthly_savings = standard_cost - intelligent_tiering_cost
    annual_savings = monthly_savings * 12
    
    return {
        'current_cost': round(standard_cost, 2),
        'intelligent_tiering_cost': round(intelligent_tiering_cost, 2),
        'monthly_savings': round(monthly_savings, 2),
        'annual_savings': round(annual_savings, 2),
        'roi_percentage': round((monthly_savings / standard_cost) * 100, 1)
    }

# Example
analysis = {
    'object_count': 1000000,
    'total_size_gb': 10000,  # 10 TB
    'access_pattern': 0.30  # 30% accessed recently
}

roi = calculate_intelligent_tiering_roi(analysis)
print(f"Annual Savings: ${roi['annual_savings']:,.2f}")
print(f"ROI: {roi['roi_percentage']}%")

# Example output:
# Current cost: $230.00/month ($2,760/year)
# Intelligent-Tiering: $165.50/month ($1,986/year)
# Annual savings: $774 (28% reduction)
```


## Tips \& Best Practices

### Security Tips

**Tip 1: Enable Default Encryption and Block Public Access**

```bash
# Always enable for new buckets
aws s3api put-bucket-encryption \
    --bucket my-bucket \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }]
    }'

aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true
```

**Tip 2: Use Presigned URLs for Temporary Access**

```python
# presigned_urls.py
import boto3
from datetime import timedelta

s3 = boto3.client('s3')

# Generate presigned URL for upload
def generate_upload_url(bucket, key, expiration=3600):
    """
    Generate presigned URL for client to upload directly to S3
    Avoids proxying through your server
    """
    
    url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ContentType': 'image/jpeg'
        },
        ExpiresIn=expiration,
        HttpMethod='PUT'
    )
    
    return url

# Generate presigned URL for download
def generate_download_url(bucket, key, expiration=3600):
    """
    Generate presigned URL for temporary access
    """
    
    url = s3.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ResponseContentDisposition': 'attachment; filename="downloaded.pdf"'
        },
        ExpiresIn=expiration
    )
    
    return url

# Usage in API
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/upload-url', methods=['GET'])
def get_upload_url():
    filename = request.args.get('filename')
    url = generate_upload_url('my-bucket', f'uploads/{filename}')
    return jsonify({'upload_url': url})

@app.route('/download/<file_id>', methods=['GET'])
def get_download_url(file_id):
    url = generate_download_url('my-bucket', f'files/{file_id}')
    return jsonify({'download_url': url})

# Client-side JavaScript upload
"""
fetch('/upload-url?filename=photo.jpg')
  .then(res => res.json())
  .then(data => {
    return fetch(data.upload_url, {
      method: 'PUT',
      body: fileBlob,
      headers: {'Content-Type': 'image/jpeg'}
    });
  });
"""
```

**Tip 3: Implement MFA Delete for Critical Buckets**

```bash
# Enable versioning first
aws s3api put-bucket-versioning \
    --bucket critical-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA delete (requires root account with MFA)
aws s3api put-bucket-versioning \
    --bucket critical-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 123456"

# Now deletions require MFA token
aws s3api delete-object \
    --bucket critical-bucket \
    --key important-file.pdf \
    --version-id abc123 \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 789012"
```


### Performance Tips

**Tip 4: Use Multipart Upload for Large Files**

```python
# multipart_upload.py
import boto3
import os
from boto3.s3.transfer import TransferConfig

def upload_large_file(file_path, bucket, key):
    """
    Optimized upload for files > 100 MB
    """
    
    s3 = boto3.client('s3')
    
    # Configure multipart settings
    config = TransferConfig(
        multipart_threshold=1024 * 25,  # 25 MB
        max_concurrency=10,
        multipart_chunksize=1024 * 25,
        use_threads=True
    )
    
    file_size = os.path.getsize(file_path)
    print(f"Uploading {file_size / (1024**2):.2f} MB file...")
    
    # Upload with progress callback
    def progress_callback(bytes_transferred):
        progress = (bytes_transferred / file_size) * 100
        print(f"\rProgress: {progress:.1f}%", end='', flush=True)
    
    s3.upload_file(
        file_path,
        bucket,
        key,
        Config=config,
        Callback=progress_callback
    )
    
    print("\nUpload complete!")

# Manual multipart upload (more control)
def multipart_upload_manual(file_path, bucket, key):
    """
    Manual multipart upload with retry logic
    """
    
    s3 = boto3.client('s3')
    
    # Initiate multipart upload
    response = s3.create_multipart_upload(
        Bucket=bucket,
        Key=key,
        ServerSideEncryption='AES256'
    )
    
    upload_id = response['UploadId']
    
    try:
        parts = []
        part_size = 1024 * 1024 * 25  # 25 MB
        
        with open(file_path, 'rb') as f:
            part_number = 1
            
            while True:
                data = f.read(part_size)
                if not data:
                    break
                
                # Upload part with retry
                for attempt in range(3):
                    try:
                        response = s3.upload_part(
                            Bucket=bucket,
                            Key=key,
                            PartNumber=part_number,
                            UploadId=upload_id,
                            Body=data
                        )
                        
                        parts.append({
                            'PartNumber': part_number,
                            'ETag': response['ETag']
                        })
                        
                        print(f"Uploaded part {part_number}")
                        break
                        
                    except Exception as e:
                        if attempt == 2:
                            raise
                        print(f"Retry part {part_number} (attempt {attempt + 1})")
                
                part_number += 1
        
        # Complete multipart upload
        s3.complete_multipart_upload(
            Bucket=bucket,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )
        
        print("Multipart upload complete!")
        
    except Exception as e:
        # Abort upload on error
        s3.abort_multipart_upload(
            Bucket=bucket,
            Key=key,
            UploadId=upload_id
        )
        raise
```

**Tip 5: Enable Transfer Acceleration for Global Users**

```bash
# Enable transfer acceleration
aws s3api put-bucket-accelerate-configuration \
    --bucket my-bucket \
    --accelerate-configuration Status=Enabled

# Test speed improvement
aws s3 cp large-file.zip s3://my-bucket/ \
    --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com

# Compare speeds
# Standard endpoint: Upload via nearest region
# Acceleration endpoint: Upload via nearest CloudFront edge, then private AWS network
# Typical speedup: 50-500% depending on location
```


### Cost Optimization Tips

**Tip 6: Use S3 Intelligent-Tiering for Unknown Access Patterns**

```bash
# Enable Intelligent-Tiering at bucket level
aws s3api put-bucket-intelligent-tiering-configuration \
    --bucket my-bucket \
    --id EntireBucket \
    --intelligent-tiering-configuration '{
      "Id": "EntireBucket",
      "Status": "Enabled",
      "Tierings": [
        {
          "Days": 90,
          "AccessTier": "ARCHIVE_ACCESS"
        },
        {
          "Days": 180,
          "AccessTier": "DEEP_ARCHIVE_ACCESS"
        }
      ]
    }'

# Upload objects to Intelligent-Tiering
aws s3 cp file.txt s3://my-bucket/ \
    --storage-class INTELLIGENT_TIERING
```

**Tip 7: Implement Lifecycle Policies to Reduce Costs**

```json
{
  "Rules": [
    {
      "Id": "OptimizeMediaFiles",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Prefix": "media/",
          "Tags": [
            {"Key": "ContentType", "Value": "video"}
          ]
        }
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    },
    {
      "Id": "CleanupLogs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER_IR"}
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

**Tip 8: Monitor and Delete Incomplete Multipart Uploads**

```python
# cleanup_incomplete_uploads.py
import boto3
from datetime import datetime, timedelta

def cleanup_incomplete_multipart_uploads(bucket_name, days_old=7):
    """
    Delete incomplete multipart uploads older than specified days
    Can save significant storage costs
    """
    
    s3 = boto3.client('s3')
    
    cutoff_date = datetime.now() - timedelta(days=days_old)
    
    paginator = s3.get_paginator('list_multipart_uploads')
    
    total_deleted = 0
    
    for page in paginator.paginate(Bucket=bucket_name):
        uploads = page.get('Uploads', [])
        
        for upload in uploads:
            initiated = upload['Initiated'].replace(tzinfo=None)
            
            if initiated < cutoff_date:
                s3.abort_multipart_upload(
                    Bucket=bucket_name,
                    Key=upload['Key'],
                    UploadId=upload['UploadId']
                )
                
                print(f"Deleted incomplete upload: {upload['Key']}")
                total_deleted += 1
    
    print(f"Total incomplete uploads deleted: {total_deleted}")
    
    return total_deleted

# Or use lifecycle policy
"""
{
  "Rules": [{
    "Id": "CleanupIncomplete",
    "Status": "Enabled",
    "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
    }
  }]
}
"""
```


### Operational Tips

**Tip 9: Use S3 Inventory for Large-Scale Operations**

```bash
# Enable S3 Inventory
aws s3api put-bucket-inventory-configuration \
    --bucket my-bucket \
    --id DailyInventory \
    --inventory-configuration '{
      "Destination": {
        "S3BucketDestination": {
          "AccountId": "123456789012",
          "Bucket": "arn:aws:s3:::inventory-bucket",
          "Format": "Parquet",
          "Prefix": "inventory/"
        }
      },
      "IsEnabled": true,
      "Id": "DailyInventory",
      "IncludedObjectVersions": "Current",
      "OptionalFields": [
        "Size", "LastModifiedDate", "StorageClass",
        "ETag", "IntelligentTieringAccessTier"
      ],
      "Schedule": {
        "Frequency": "Daily"
      }
    }'

# Query inventory with Athena
"""
CREATE EXTERNAL TABLE s3_inventory (
    bucket STRING,
    key STRING,
    size BIGINT,
    last_modified_date TIMESTAMP,
    storage_class STRING
)
STORED AS PARQUET
LOCATION 's3://inventory-bucket/inventory/';

-- Find large objects
SELECT key, size / (1024*1024*1024) as size_gb
FROM s3_inventory
WHERE size > 1073741824
ORDER BY size DESC
LIMIT 100;
"""
```

**Tip 10: Implement S3 Event Notifications for Automation**

```python
# event_driven_processing.py
import boto3
import json

def lambda_handler(event, context):
    """
    Process S3 events automatically
    """
    
    s3 = boto3.client('s3')
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        size = record['s3']['object']['size']
        event_name = record['eventName']
        
        print(f"Event: {event_name}")
        print(f"Object: s3://{bucket}/{key}")
        print(f"Size: {size / (1024**2):.2f} MB")
        
        # Process based on event type
        if 'ObjectCreated' in event_name:
            process_new_object(bucket, key)
        
        elif 'ObjectRemoved' in event_name:
            log_deletion(bucket, key)
    
    return {'statusCode': 200}

def process_new_object(bucket, key):
    """Process newly uploaded object"""
    
    # Example: Generate thumbnail for images
    if key.endswith(('.jpg', '.png')):
        # Trigger image processing pipeline
        pass
    
    # Example: Index documents
    elif key.endswith('.pdf'):
        # Extract text and index in Elasticsearch
        pass

def log_deletion(bucket, key):
    """Log object deletion to audit trail"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('S3AuditLog')
    
    table.put_item(Item={
        'bucket': bucket,
        'key': key,
        'event': 'DELETE',
        'timestamp': datetime.utcnow().isoformat()
    })
```


## Pitfalls \& Remedies

### Pitfall 1: Public Bucket Exposure

**Problem:** Accidentally making S3 buckets or objects public, leading to data breaches.

**Why It Happens:**

- Overly permissive bucket policies
- ACLs allowing public access
- Not using Block Public Access settings
- Misconfigured CloudFormation/Terraform

**Impact:**

- Data breaches (customer data, credentials, source code)
- Compliance violations (GDPR, HIPAA)
- Reputational damage
- Financial losses

**Example of Vulnerability:**

```json
// Bad - Grants public access
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```

**Remedy:**

**Step 1: Enable Block Public Access (Account-Level)**

```bash
# Enable at account level
aws s3control put-public-access-block \
    --account-id 123456789012 \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# This prevents ANY bucket in the account from becoming public
```

**Step 2: Audit Existing Buckets**

```python
# audit_public_buckets.py
import boto3

def audit_public_buckets():
    """
    Find buckets with public access
    """
    
    s3 = boto3.client('s3')
    
    buckets = s3.list_buckets()['Buckets']
    public_buckets = []
    
    for bucket in buckets:
        bucket_name = bucket['Name']
        
        try:
            # Check Block Public Access settings
            block_config = s3.get_public_access_block(
                Bucket=bucket_name
            )['PublicAccessBlockConfiguration']
            
            if not all([
                block_config.get('BlockPublicAcls'),
                block_config.get('IgnorePublicAcls'),
                block_config.get('BlockPublicPolicy'),
                block_config.get('RestrictPublicBuckets')
            ]):
                # Check bucket policy
                try:
                    policy = s3.get_bucket_policy(Bucket=bucket_name)
                    policy_doc = json.loads(policy['Policy'])
                    
                    for statement in policy_doc.get('Statement', []):
                        if statement.get('Principal') == '*':
                            public_buckets.append({
                                'bucket': bucket_name,
                                'risk': 'HIGH',
                                'reason': 'Bucket policy allows public access'
                            })
                except:
                    pass
                
                # Check ACL
                acl = s3.get_bucket_acl(Bucket=bucket_name)
                for grant in acl['Grants']:
                    grantee = grant['Grantee']
                    if grantee.get('Type') == 'Group' and \
                       'AllUsers' in grantee.get('URI', ''):
                        public_buckets.append({
                            'bucket': bucket_name,
                            'risk': 'CRITICAL',
                            'reason': 'ACL grants public access'
                        })
        
        except Exception as e:
            print(f"Error checking {bucket_name}: {e}")
    
    return public_buckets

# Run audit
public_buckets = audit_public_buckets()

if public_buckets:
    print(f"⚠️  Found {len(public_buckets)} buckets with public access:")
    for bucket in public_buckets:
        print(f"\n  Bucket: {bucket['bucket']}")
        print(f"  Risk: {bucket['risk']}")
        print(f"  Reason: {bucket['reason']}")
else:
    print("✓ No public buckets found")
```

**Step 3: Fix Public Buckets**

```bash
# Fix bucket - enable block public access
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# Remove public bucket policy
aws s3api delete-bucket-policy --bucket my-bucket

# For legitimate public content (static websites), use CloudFront + OAC
# Don't make bucket public directly
```

**Step 4: Implement Monitoring**

```python
# monitor_public_access.py
# CloudWatch Events rule for S3 bucket policy changes

event_pattern = {
    "source": ["aws.s3"],
    "detail-type": ["AWS API Call via CloudTrail"],
    "detail": {
        "eventName": [
            "PutBucketPolicy",
            "PutBucketAcl",
            "DeletePublicAccessBlock"
        ]
    }
}

# Lambda function to alert on policy changes
def lambda_handler(event, context):
    detail = event['detail']
    bucket = detail['requestParameters']['bucketName']
    
    # Check if change makes bucket public
    if is_bucket_public(bucket):
        send_alert(f"Bucket {bucket} made public!", severity='CRITICAL')
        
        # Auto-remediate
        remediate_public_bucket(bucket)
```

**Prevention:**

- Enable Block Public Access at account level
- Use SCPs to prevent disabling Block Public Access
- Regular security audits
- Implement least-privilege IAM policies
- Use CloudFront with OAC for public content

***

### Pitfall 2: Lifecycle Policy Mistakes

**Problem:** Lifecycle policies unintentionally delete data or fail to reduce costs.

**Why It Happens:**

- Incorrect filter configuration
- Not understanding transition constraints
- Overlapping rules
- No testing before production

**Impact:**

- Accidental data deletion
- Failed transitions (minimum days not met)
- Wasted storage costs
- Compliance violations

**Example Error:**

```json
// Bad - Will cause errors
{
  "Rules": [{
    "Id": "BadRule",
    "Status": "Enabled",
    "Transitions": [
      {
        "Days": 0,  // Error: Can't transition to IA immediately from Standard
        "StorageClass": "STANDARD_IA"
      },
      {
        "Days": 10,  // Error: Must wait 30 days for IA
        "StorageClass": "GLACIER"
      }
    ]
  }]
}
```

**Remedy:**

**Step 1: Understand Transition Constraints**

```
Transition Rules:
Standard → Standard-IA: Minimum 30 days
Standard → Intelligent-Tiering: Immediate
Standard-IA → Glacier: Minimum 30 days after IA transition
Glacier Instant → Glacier Flexible: Minimum 0 days
Glacier Flexible → Deep Archive: Minimum 90 days

Cannot transition:
- To Standard (one-way only)
- Objects < 128 KB to IA classes
```

**Step 2: Test with Specific Prefix First**

```bash
# Test lifecycle policy on specific prefix
cat > test-lifecycle.json <<'EOF'
{
  "Rules": [{
    "Id": "TestRule",
    "Status": "Enabled",
    "Filter": {
      "Prefix": "test-lifecycle/"
    },
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER_IR"}
    ],
    "Expiration": {
      "Days": 365
    }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration file://test-lifecycle.json

# Upload test objects
aws s3 cp test1.txt s3://my-bucket/test-lifecycle/test1.txt

# Monitor for 30+ days, verify transitions work
# Then expand to entire bucket
```

**Step 3: Use Tags for Granular Control**

```json
{
  "Rules": [
    {
      "Id": "ArchiveTaggedObjects",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Tags": [
            {"Key": "Archive", "Value": "true"}
          ]
        }
      },
      "Transitions": [
        {"Days": 0, "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"}
      ]
    },
    {
      "Id": "KeepImportant",
      "Status": "Enabled",
      "Filter": {
        "Tag": {
          "Key": "Important",
          "Value": "true"
        }
      }
      // No transitions - keep in Standard
    }
  ]
}
```

**Step 4: Implement Safety Checks**

```python
# lifecycle_validator.py
def validate_lifecycle_policy(policy):
    """
    Validate lifecycle policy before applying
    """
    
    errors = []
    warnings = []
    
    for rule in policy['Rules']:
        rule_id = rule['Id']
        
        # Check transitions
        if 'Transitions' in rule:
            transitions = rule['Transitions']
            
            for i, transition in enumerate(transitions):
                days = transition['Days']
                storage_class = transition['StorageClass']
                
                # Validate minimum days
                if storage_class == 'STANDARD_IA' and days < 30:
                    errors.append(f"{rule_id}: Standard to IA requires 30 days minimum")
                
                if storage_class == 'GLACIER_IR' and days < 0:
                    errors.append(f"{rule_id}: Invalid days value")
                
                # Check ordering
                if i > 0:
                    prev_days = transitions[i-1]['Days']
                    if days <= prev_days:
                        errors.append(f"{rule_id}: Transition days must be increasing")
        
        # Check expiration
        if 'Expiration' in rule and 'Transitions' in rule:
            expiration_days = rule['Expiration'].get('Days', float('inf'))
            last_transition = rule['Transitions'][-1]['Days']
            
            if expiration_days <= last_transition:
                warnings.append(f"{rule_id}: Expiration before last transition")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

# Validate before applying
result = validate_lifecycle_policy(policy)

if not result['valid']:
    print("❌ Lifecycle policy has errors:")
    for error in result['errors']:
        print(f"  - {error}")
else:
    print("✓ Lifecycle policy is valid")
    if result['warnings']:
        print("⚠️  Warnings:")
        for warning in result['warnings']:
            print(f"  - {warning}")
```

**Prevention:**

- Test policies on small prefixes first
- Understand transition constraints
- Use tags for fine-grained control
- Monitor lifecycle actions with CloudWatch Events
- Document policy purpose and expected behavior

***

### Pitfall 3: Cross-Region Replication Issues

**Problem:** Replication fails, incomplete, or creates unexpected costs.

**Why It Happens:**

- Versioning not enabled
- Incorrect IAM permissions
- Not understanding what gets replicated
- Missing encryption compatibility

**Impact:**

- DR strategy fails
- Data inconsistency across regions
- Unexpected data transfer costs
- Compliance failures

**Remedy:**

**Step 1: Verify Prerequisites**

```bash
# 1. Enable versioning on both buckets
aws s3api put-bucket-versioning \
    --bucket source-bucket \
    --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
    --bucket destination-bucket \
    --versioning-configuration Status=Enabled

# 2. Create replication role
cat > replication-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "s3.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name S3ReplicationRole \
    --assume-role-policy-document file://replication-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# 3. Attach replication policy
cat > replication-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::source-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::source-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::destination-bucket/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name S3ReplicationRole \
    --policy-name ReplicationPolicy \
    --policy-document file://replication-policy.json
```

**Step 2: Configure Replication Properly**

```json
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  "Rules": [{
    "Status": "Enabled",
    "Priority": 1,
    "DeleteMarkerReplication": {
      "Status": "Enabled"
    },
    "Filter": {},
    "Destination": {
      "Bucket": "arn:aws:s3:::destination-bucket",
      "ReplicationTime": {
        "Status": "Enabled",
        "Time": {"Minutes": 15}
      },
      "Metrics": {
        "Status": "Enabled",
        "EventThreshold": {"Minutes": 15}
      },
      "StorageClass": "STANDARD_IA",
      "EncryptionConfiguration": {
        "ReplicaKmsKeyID": "arn:aws:kms:us-west-2:123456789012:key/abc-123"
      }
    },
    "SourceSelectionCriteria": {
      "SseKmsEncryptedObjects": {
        "Status": "Enabled"
      }
    }
  }]
}
```

**Step 3: Monitor Replication**

```python
# monitor_replication.py
import boto3

def monitor_replication_status(bucket_name):
    """
    Monitor S3 replication metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get replication latency
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='ReplicationLatency',
        Dimensions=[
            {'Name': 'SourceBucket', 'Value': bucket_name},
            {'Name': 'DestinationBucket', 'Value': 'destination-bucket'},
            {'Name': 'RuleId', 'Value': 'rule-1'}
        ],
        StartTime=datetime.now() - timedelta(hours=1),
        EndTime=datetime.now(),
        Period=300,
        Statistics=['Maximum', 'Average']
    )
    
    # Check for failed replications
    failed_response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='OperationsFailedReplication',
        Dimensions=[
            {'Name': 'SourceBucket', 'Value': bucket_name}
        ],
        StartTime=datetime.now() - timedelta(hours=1),
        EndTime=datetime.now(),
        Period=300,
        Statistics=['Sum']
    )
    
    return {
        'latency': response['Datapoints'],
        'failed': failed_response['Datapoints']
    }
```

**Prevention:**

- Enable versioning before configuring replication
- Test replication with small dataset first
- Monitor replication metrics
- Understand what gets/doesn't get replicated
- Consider costs (data transfer + storage in destination)

***

## Chapter Summary

Amazon S3 is the cornerstone of AWS storage, providing durable, scalable, cost-effective object storage for virtually any use case. Understanding storage classes, lifecycle policies, encryption, access controls, versioning, replication, and performance optimization is essential for building production-grade applications on AWS. Proper S3 configuration can save significant costs while maintaining security and compliance.

**Key Takeaways:**

- **Choose appropriate storage class:** Standard for hot data, Intelligent-Tiering for unknown patterns, IA for infrequent access, Glacier for archives
- **Implement security layers:** Block Public Access, encryption, bucket policies, IAM policies, access points
- **Use lifecycle policies:** Automate transitions to cheaper storage classes, expire old data, clean up multipart uploads
- **Enable versioning:** Protect against accidental deletion, meet compliance requirements, with lifecycle policies for old versions
- **Optimize performance:** Multipart uploads for large files, prefix sharding for high throughput, Transfer Acceleration for global users
- **Monitor and optimize costs:** S3 Storage Lens for visibility, Intelligent-Tiering for automatic optimization, S3 Inventory for large-scale operations

Understanding S3 deeply enables you to build cost-effective, secure, high-performance data storage solutions that scale to exabytes.

In Chapter 9, we'll explore Amazon EBS and EFS for block and file storage needs.

## Review Questions

1. **Which storage class offers the lowest cost per GB?**
a) Standard-IA
b) Glacier Flexible Retrieval
c) Glacier Deep Archive
d) One Zone-IA

**Answer: C** - Glacier Deep Archive at \$0.00099/GB/month (~\$1/TB/month).

2. **What is S3's durability rating?**
a) 99.99%
b) 99.999999999% (11 nines)
c) 99.9999999% (9 nines)
d) 100%

**Answer: B** - S3 provides 99.999999999% (11 nines) durability.

3. **Minimum storage duration for Standard-IA?**
a) None
b) 30 days
c) 90 days
d) 180 days

**Answer: B** - Standard-IA has 30-day minimum storage duration.

4. **Which encryption option provides audit trail in CloudTrail?**
a) SSE-S3
b) SSE-KMS
c) SSE-C
d) Client-side

**Answer: B** - SSE-KMS logs all encryption/decryption operations to CloudTrail.

5. **Maximum object size in S3?**
a) 5 GB
b) 5 TB
c) 10 TB
d) Unlimited

**Answer: B** - Maximum object size is 5 TB.

6. **Multipart upload is required for objects larger than:**
a) 100 MB
b) 5 GB
c) 1 TB
d) Never required

**Answer: B** - Multipart upload required for objects > 5 GB (recommended for > 100 MB).

7. **What does MFA Delete protect against?**
a) Accidental uploads
b) Unauthorized object deletions
c) High costs
d) Performance issues

**Answer: B** - MFA Delete requires MFA token to delete object versions.

8. **Cross-Region Replication requires:**
a) Same storage class
b) Versioning enabled
c) Public buckets
d) No encryption

**Answer: B** - Both source and destination buckets must have versioning enabled.

9. **S3 Intelligent-Tiering monitoring cost:**
a) Free
b) \$0.0025 per 1,000 objects
c) \$0.01 per GB
d) \$10/month flat

**Answer: B** - Monitoring fee is \$0.0025 per 1,000 objects.

10. **Which service queries S3 data without downloading?**
a) S3 Batch Operations
b) S3 Select
c) S3 Inventory
d) S3 Analytics

**Answer: B** - S3 Select queries CSV/JSON/Parquet in-place.

11. **S3 bucket names must be:**
a) Unique within region
b) Unique within account
c) Globally unique
d) No restrictions

**Answer: C** - S3 bucket names must be globally unique across all AWS accounts.

12. **Default S3 encryption algorithm:**
a) AES-128
b) AES-256
c) AES-512
d) RSA-2048

**Answer: B** - S3 uses AES-256 encryption by default.

13. **S3 Transfer Acceleration uses which service?**
a) Direct Connect
b) CloudFront edge locations
c) Global Accelerator
d) VPN

**Answer: B** - Transfer Acceleration uses CloudFront edge locations for faster uploads.

14. **Object Lock COMPLIANCE mode can be overridden by:**
a) Root user
b) IAM admin
c) AWS Support
d) No one

**Answer: D** - COMPLIANCE mode cannot be overridden by anyone, including root.

15. **S3 supports how many requests per second per prefix?**
a) 100
b) 1,000
c) 3,500 PUT / 5,500 GET
d) Unlimited

**Answer: C** - S3 supports 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD per prefix per second.

***
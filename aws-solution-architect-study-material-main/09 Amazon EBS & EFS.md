# Chapter 9: Amazon EBS \& EFS

## Introduction

Amazon Elastic Block Store (EBS) and Elastic File System (EFS) provide persistent storage for EC2 instances, each serving distinct use cases. EBS offers block-level storage volumes that function like virtual hard drives, providing low-latency access for databases, boot volumes, and applications requiring consistent I/O performance. EFS delivers fully managed, scalable NFS file systems that can be mounted by multiple EC2 instances simultaneously, ideal for shared content repositories, big data analytics, and application file storage.

Understanding the difference between block storage and file storage is fundamental. EBS volumes attach to single EC2 instances (though Multi-Attach allows specific volume types to connect to multiple instances in the same AZ), providing raw block storage that you format with a file system. EFS provides a ready-to-use file system accessible by thousands of EC2 instances across multiple Availability Zones, automatically scaling from gigabytes to petabytes. The choice between EBS and EFS—or using both—depends on your application architecture, performance requirements, and access patterns.

Storage performance significantly impacts application behavior. An improperly configured EBS volume can bottleneck database performance, causing transaction delays and poor user experience. Selecting gp2 instead of gp3 wastes money on unused burst credits. Not enabling EBS optimization on instances throttles I/O. Forgetting to snapshot volumes leads to unrecoverable data loss. Understanding volume types, IOPS provisioning, throughput characteristics, snapshot strategies, and encryption options is essential for production deployments.

This chapter provides comprehensive coverage of EBS and EFS from fundamentals to production patterns. You'll learn volume types and performance characteristics, snapshot and backup strategies, encryption and security, high-availability configurations, monitoring and troubleshooting, and cost optimization techniques. Whether you're running databases, hosting applications, or building shared file systems, mastering EBS and EFS is critical for reliable, performant AWS infrastructure.

## Theory \& Concepts

### EBS Fundamentals

**What is EBS?**

Amazon EBS provides persistent block storage volumes for EC2 instances. Each volume is automatically replicated within its Availability Zone to protect against hardware failures.

**Key Characteristics:**

- **Persistent:** Data persists independently of instance lifecycle
- **AZ-Scoped:** Volume and instance must be in same AZ
- **Snapshots:** Point-in-time backups stored in S3
- **Resizable:** Increase size and IOPS without downtime
- **Encryption:** Transparent encryption at rest and in transit
- **Multiple Types:** Optimized for different workloads

**EBS vs Instance Store:**


| Feature | EBS | Instance Store |
| :-- | :-- | :-- |
| **Persistence** | Persistent | Ephemeral (data lost on stop) |
| **Durability** | 99.8-99.9% annual failure rate | Lost on instance failure |
| **Performance** | Varies by type | Very high (NVMe) |
| **Snapshots** | Yes | No |
| **Cost** | Pay for provisioned storage | Included with instance |
| **Use Case** | Databases, boot volumes | Temporary cache, buffers |

### EBS Volume Types

**SSD-Based Volumes:**

**1. General Purpose SSD (gp3) - Recommended**

- **Performance:**
    - Baseline: 3,000 IOPS, 125 MB/s throughput
    - Max: 16,000 IOPS, 1,000 MB/s throughput
    - Provision IOPS and throughput independently
- **Size:** 1 GiB - 16 TiB
- **Price:** \$0.08/GB-month + \$0.005/provisioned IOPS-month (above 3,000) + \$0.04/provisioned MB/s-month (above 125)
- **Use Cases:** Boot volumes, virtual desktops, development/test, medium-size databases
- **Why Choose:** Cost-effective, predictable performance, no burst credits

**2. General Purpose SSD (gp2) - Legacy**

- **Performance:**
    - Baseline: 3 IOPS/GB (minimum 100 IOPS)
    - Max: 16,000 IOPS (at 5,334 GB)
    - Burst to 3,000 IOPS using credits
- **Size:** 1 GiB - 16 TiB
- **Price:** \$0.10/GB-month
- **Burst Credits:** Accumulate when usage below baseline, consume when above
- **Why Avoid:** More expensive than gp3, unpredictable burst performance

**3. Provisioned IOPS SSD (io2 Block Express)**

- **Performance:**
    - Up to 256,000 IOPS
    - Up to 4,000 MB/s throughput
    - Sub-millisecond latency
    - 99.999% durability (10x better than gp3)
- **Size:** 4 GiB - 64 TiB
- **Price:** \$0.125/GB-month + \$0.065/provisioned IOPS-month
- **Use Cases:** Mission-critical databases (SAP HANA, Oracle), NoSQL databases requiring highest performance
- **Why Choose:** Maximum performance, highest durability, consistent low latency

**4. Provisioned IOPS SSD (io2)**

- **Performance:**
    - Up to 64,000 IOPS (256,000 with io2 Block Express)
    - Up to 1,000 MB/s throughput (4,000 MB/s Block Express)
    - 99.9% durability
- **Size:** 4 GiB - 16 TiB (64 TiB Block Express)
- **Price:** \$0.125/GB-month + \$0.065/provisioned IOPS-month
- **Use Cases:** Large databases (SQL Server, MySQL, PostgreSQL), mission-critical applications
- **Why Choose:** Consistent high performance, better durability than gp3

**HDD-Based Volumes:**

**5. Throughput Optimized HDD (st1)**

- **Performance:**
    - Baseline: 40 MB/s per TB
    - Burst: 250 MB/s per TB (max 500 MB/s)
    - Max: 500 IOPS (1 MB I/O)
- **Size:** 125 GiB - 16 TiB
- **Price:** \$0.045/GB-month
- **Use Cases:** Big data, data warehouses, log processing, Apache Kafka
- **Why Choose:** Cost-effective for sequential workloads, streaming data

**6. Cold HDD (sc1)**

- **Performance:**
    - Baseline: 12 MB/s per TB
    - Burst: 80 MB/s per TB (max 250 MB/s)
    - Max: 250 IOPS (1 MB I/O)
- **Size:** 125 GiB - 16 TiB
- **Price:** \$0.015/GB-month (cheapest EBS)
- **Use Cases:** Infrequently accessed data, lowest storage cost scenarios
- **Why Choose:** Lowest cost for cold data with occasional access

**Volume Type Comparison:**


| Type | IOPS | Throughput | Latency | \$/GB | Use Case |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **gp3** | 16,000 | 1,000 MB/s | Single-digit ms | \$0.08 | General purpose |
| **gp2** | 16,000 | 250 MB/s | Single-digit ms | \$0.10 | Legacy |
| **io2 BE** | 256,000 | 4,000 MB/s | Sub-ms | \$0.125+ | Critical databases |
| **io2** | 64,000 | 1,000 MB/s | Single-digit ms | \$0.125+ | High-performance DB |
| **st1** | 500 | 500 MB/s | Milliseconds | \$0.045 | Big data |
| **sc1** | 250 | 250 MB/s | Milliseconds | \$0.015 | Cold storage |

### IOPS and Throughput

**IOPS (Input/Output Operations Per Second):**

Measures how many read/write operations storage can handle per second.

- **Small I/O Operations:** Database transactions (4K-16K blocks)
- **Random Access:** Databases benefit from high IOPS
- **Formula:** IOPS × I/O Size = Throughput

**Throughput (MB/s):**

Measures how much data storage can transfer per second.

- **Large I/O Operations:** Video streaming, log processing (64K-1M blocks)
- **Sequential Access:** Big data workloads benefit from high throughput

**Relationship:**

```
Throughput = IOPS × I/O Size

Example:
- 10,000 IOPS × 16 KB = 156.25 MB/s
- 1,000 IOPS × 256 KB = 256 MB/s

For same throughput, you need:
- High IOPS for small block workloads (databases)
- Lower IOPS for large block workloads (streaming)
```

**Optimal Block Size:**

```python
# Calculate optimal configuration
def calculate_volume_requirements(workload_type):
    """
    Determine EBS volume configuration
    """
    
    if workload_type == 'database':
        # Small block, random I/O
        return {
            'volume_type': 'gp3 or io2',
            'key_metric': 'IOPS',
            'typical_block_size': '4-16 KB',
            'recommendation': 'Provision enough IOPS for peak transactions/sec'
        }
    
    elif workload_type == 'data_warehouse':
        # Large block, sequential I/O
        return {
            'volume_type': 'st1',
            'key_metric': 'Throughput',
            'typical_block_size': '64 KB - 1 MB',
            'recommendation': 'Focus on MB/s, IOPS less critical'
        }
    
    elif workload_type == 'boot_volume':
        # Mixed workload
        return {
            'volume_type': 'gp3',
            'key_metric': 'Balanced',
            'typical_block_size': '4-128 KB',
            'recommendation': 'Default gp3 sufficient for most cases'
        }
```


### EBS Snapshots

Snapshots are incremental backups of EBS volumes stored in Amazon S3.

**How Snapshots Work:**

```
Initial Snapshot: Copies all blocks (full backup)
Volume: 100 GB with 60 GB used → Snapshot: 60 GB stored

Subsequent Snapshots: Only changed blocks (incremental)
Changed: 5 GB → Snapshot 2: Only 5 GB additional stored

Total Storage: 65 GB (60 + 5)
```

**Key Characteristics:**

- **Incremental:** Only changed blocks since last snapshot
- **Point-in-Time:** Captures volume state at snapshot moment
- **Regional:** Stored in S3, available across AZs in region
- **Cross-Region Copy:** Can copy to other regions for DR
- **Fast Snapshot Restore (FSR):** Pre-warm snapshots for instant volume creation
- **Recycle Bin:** Protect against accidental deletion

**Snapshot Pricing:**

```
Standard Snapshot: $0.05/GB-month
Archive Snapshot: $0.0125/GB-month (90-day minimum, retrieval fee)

Example:
Initial: 100 GB snapshot = $5/month
Change: 10 GB = $0.50 additional
Total: $5.50/month

After archiving old snapshots:
Archive tier: $1.25/month
Savings: 75%
```

**Creating Snapshots:**

```bash
# Create snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Database backup $(date +%Y-%m-%d)" \
    --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=Daily-Backup},{Key=Environment,Value=Production}]' \
    --query 'SnapshotId' \
    --output text)

# Wait for completion
aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT_ID

# Copy to another region (DR)
aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAPSHOT_ID \
    --destination-region us-west-2 \
    --description "DR copy of $SNAPSHOT_ID" \
    --region us-west-2

# Create volume from snapshot
aws ec2 create-volume \
    --snapshot-id $SNAPSHOT_ID \
    --availability-zone us-east-1a \
    --volume-type gp3 \
    --iops 5000 \
    --throughput 250
```

**Fast Snapshot Restore (FSR):**

```bash
# Enable FSR (eliminates first-access latency)
aws ec2 enable-fast-snapshot-restores \
    --availability-zones us-east-1a us-east-1b \
    --source-snapshot-ids $SNAPSHOT_ID

# Cost: $0.75/hour per snapshot per AZ
# Use only for critical snapshots needing instant restore
```


### EBS Encryption

EBS encryption protects data at rest, in transit, and in snapshots.

**Key Features:**

- **Transparent:** No performance impact
- **AES-256:** Industry-standard encryption
- **AWS KMS Integration:** Customer-managed or AWS-managed keys
- **Automatic:** Encrypts data and snapshots automatically
- **In-Transit:** Data encrypted between EC2 and EBS

**Encryption at Rest:**

```bash
# Create encrypted volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 100 \
    --volume-type gp3 \
    --encrypted \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123

# Enable encryption by default (account setting)
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# Encrypt existing unencrypted volume
# 1. Create snapshot
# 2. Copy snapshot with encryption
# 3. Create encrypted volume from snapshot

SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id vol-unencrypted \
    --query 'SnapshotId' \
    --output text)

ENCRYPTED_SNAPSHOT=$(aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAPSHOT_ID \
    --encrypted \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123 \
    --query 'SnapshotId' \
    --output text)
```

**Key Management:**

```bash
# Create custom KMS key
KEY_ID=$(aws kms create-key \
    --description "EBS encryption key" \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text)

# Create alias
aws kms create-alias \
    --alias-name alias/ebs-encryption \
    --target-key-id $KEY_ID

# Grant EC2 service permission
aws kms create-grant \
    --key-id $KEY_ID \
    --grantee-principal ec2.amazonaws.com \
    --operations Decrypt CreateGrant
```


### Amazon EFS (Elastic File System)

EFS provides scalable, fully managed NFS file systems for EC2 instances.

**Key Characteristics:**

- **Shared Access:** Multiple instances mount simultaneously
- **Multi-AZ:** Data replicated across AZs
- **Elastic:** Scales automatically (petabytes)
- **Performance Modes:** General Purpose or Max I/O
- **Throughput Modes:** Bursting or Provisioned
- **Storage Classes:** Standard and Infrequent Access

**EFS vs EBS:**


| Feature | EFS | EBS |
| :-- | :-- | :-- |
| **Access** | Multiple instances (NFS) | Single instance (block) |
| **AZ Scope** | Multi-AZ | Single AZ |
| **Size** | Elastic (auto-scales) | Fixed (manual resize) |
| **Performance** | Shared (lower per-instance) | Dedicated (higher) |
| **Cost** | \$0.30/GB-month | \$0.08-0.125/GB-month |
| **Use Case** | Shared content, CMS | Databases, boot volumes |

**EFS Performance Modes:**

**1. General Purpose (Default):**

- Latency: Low, single-digit milliseconds
- Throughput: Scales with size
- Use Case: Most workloads

**2. Max I/O:**

- Latency: Higher (double-digit milliseconds)
- Throughput: Higher aggregate throughput
- Use Case: Big data, media processing (1000+ instances)

**EFS Throughput Modes:**

**1. Bursting (Default):**

- Baseline: 50 MB/s per TB stored
- Burst: Up to 100 MB/s
- Free: No additional cost
- Use Case: Variable workloads

**2. Elastic (Recommended):**

- Automatic: Scales up/down automatically
- Up to: 3 GB/s reads, 1 GB/s writes
- Cost: Pay for throughput used
- Use Case: Unpredictable workloads

**3. Provisioned:**

- Fixed: Provision specific throughput
- Independent: Of storage size
- Cost: \$6/MB/s-month
- Use Case: Known throughput requirements

**EFS Storage Classes:**

**Standard:**

- Access: Frequently accessed files
- Cost: \$0.30/GB-month
- Performance: Lowest latency

**Infrequent Access (IA):**

- Access: Files not accessed for 7/14/30/60/90 days
- Cost: \$0.025/GB-month (92% cheaper)
- Access Fee: \$0.01/GB
- Use Case: Backups, infrequently accessed data

**Lifecycle Management:**

- Automatically moves files to IA based on policy
- Moves back to Standard on access


### EBS Multi-Attach

Allows io2 volumes to attach to multiple instances in same AZ.

**Features:**

- **Concurrent Access:** Up to 16 instances
- **Same AZ Only:** All instances must be in same AZ
- **Volume Type:** io2 or io2 Block Express only
- **Cluster-Aware:** Application must handle concurrent writes

**Use Cases:**

- **Clustered Databases:** Oracle RAC, SQL Server Failover Clusters
- **High Availability:** Active-active configurations
- **Shared Storage:** Applications requiring shared block storage

**Requirements:**

```bash
# Create io2 volume with Multi-Attach
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 500 \
    --volume-type io2 \
    --iops 10000 \
    --multi-attach-enabled

# Attach to multiple instances
aws ec2 attach-volume \
    --volume-id vol-multi \
    --instance-id i-instance1 \
    --device /dev/sdf

aws ec2 attach-volume \
    --volume-id vol-multi \
    --instance-id i-instance2 \
    --device /dev/sdf

# Use cluster-aware file system
# - GFS2 (Red Hat)
# - Lustre
# - OCFS2
# Not: ext4, xfs (single-writer only)
```


## Hands-On Implementation

### Lab 1: Creating and Optimizing EBS Volumes

**Objective:** Create and configure production-ready EBS volumes with optimal performance.

```bash
# Create gp3 volume with custom IOPS/throughput
VOLUME_ID=$(aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 500 \
    --volume-type gp3 \
    --iops 8000 \
    --throughput 500 \
    --encrypted \
    --kms-key-id alias/ebs-encryption \
    --tag-specifications 'ResourceType=volume,Tags=[
        {Key=Name,Value=Production-Database},
        {Key=Environment,Value=Production},
        {Key=Application,Value=PostgreSQL},
        {Key=Backup,Value=Daily}
    ]' \
    --query 'VolumeId' \
    --output text)

echo "Volume ID: $VOLUME_ID"

# Wait for volume to become available
aws ec2 wait volume-available --volume-ids $VOLUME_ID

# Attach to instance
aws ec2 attach-volume \
    --volume-id $VOLUME_ID \
    --instance-id i-1234567890abcdef0 \
    --device /dev/sdf

# Enable delete on termination
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --block-device-mappings "DeviceName=/dev/sdf,Ebs={DeleteOnTermination=false}"

# On EC2 instance, format and mount
sudo mkfs.ext4 /dev/nvme1n1  # Note: Device name may differ (NVMe)
sudo mkdir /data
sudo mount /dev/nvme1n1 /data

# Add to /etc/fstab for auto-mount
echo "/dev/nvme1n1 /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Verify performance
sudo fio --name=randwrite --ioengine=libaio --iodepth=32 \
    --rw=randwrite --bs=4k --direct=1 --size=1G \
    --numjobs=4 --runtime=60 --group_reporting \
    --filename=/data/test
```


### Lab 2: Snapshot Automation with Data Lifecycle Manager

**Objective:** Automate EBS snapshot lifecycle management.

```bash
# Create DLM policy
cat > dlm-policy.json <<'EOF'
{
  "PolicyDetails": {
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [
      {
        "Key": "Backup",
        "Value": "Daily"
      }
    ],
    "Schedules": [
      {
        "Name": "Daily snapshots",
        "CopyTags": true,
        "TagsToAdd": [
          {
            "Key": "SnapshotType",
            "Value": "DLM-Daily"
          }
        ],
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["03:00"]
        },
        "RetainRule": {
          "Count": 30
        },
        "FastRestoreRule": {
          "AvailabilityZones": ["us-east-1a"],
          "Count": 1
        },
        "CrossRegionCopyRules": [
          {
            "TargetRegion": "us-west-2",
            "Encrypted": true,
            "RetainRule": {
              "Interval": 7,
              "IntervalUnit": "DAYS"
            }
          }
        ]
      },
      {
        "Name": "Weekly snapshots",
        "CreateRule": {
          "CronExpression": "cron(0 2 ? * SUN *)"
        },
        "RetainRule": {
          "Count": 12
        }
      }
    ]
  },
  "Description": "Automated daily and weekly backups",
  "State": "ENABLED",
  "ExecutionRoleArn": "arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole"
}
EOF

# Create DLM lifecycle policy
POLICY_ID=$(aws dlm create-lifecycle-policy \
    --cli-input-json file://dlm-policy.json \
    --query 'PolicyId' \
    --output text)

echo "DLM Policy ID: $POLICY_ID"

# Tag volumes for automatic backup
aws ec2 create-tags \
    --resources $VOLUME_ID \
    --tags Key=Backup,Value=Daily
```


### Lab 3: Creating EFS File System

**Objective:** Deploy multi-AZ EFS with lifecycle management.

```bash
# Create EFS file system
FILE_SYSTEM_ID=$(aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode elastic \
    --encrypted \
    --kms-key-id alias/efs-encryption \
    --tags Key=Name,Value=SharedAppData Key=Environment,Value=Production \
    --query 'FileSystemId' \
    --output text)

echo "EFS ID: $FILE_SYSTEM_ID"

# Wait for file system to become available
aws efs describe-file-systems \
    --file-system-id $FILE_SYSTEM_ID \
    --query 'FileSystems[0].LifeCycleState'

# Create mount targets in each AZ
for subnet in $SUBNET_1A $SUBNET_1B $SUBNET_1C; do
    aws efs create-mount-target \
        --file-system-id $FILE_SYSTEM_ID \
        --subnet-id $subnet \
        --security-groups $EFS_SG_ID
done

# Configure lifecycle management
aws efs put-lifecycle-configuration \
    --file-system-id $FILE_SYSTEM_ID \
    --lifecycle-policies \
        TransitionToIA=AFTER_30_DAYS \
        TransitionToPrimaryStorageClass=AFTER_1_ACCESS

# Mount on EC2 instances
sudo mkdir /mnt/efs
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
    $FILE_SYSTEM_ID.efs.us-east-1.amazonaws.com:/ /mnt/efs

# Add to /etc/fstab
echo "$FILE_SYSTEM_ID.efs.us-east-1.amazonaws.com:/ /mnt/efs nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0" | sudo tee -a /etc/fstab

# Test write performance
sudo dd if=/dev/zero of=/mnt/efs/testfile bs=1M count=1000
```


### Lab 4: EBS Volume Monitoring

**Objective:** Implement comprehensive EBS performance monitoring.

```python
# ebs_monitoring.py
import boto3
from datetime import datetime, timedelta

def monitor_ebs_performance(volume_id):
    """
    Monitor EBS volume performance metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    # Get volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    volume_type = volume['VolumeType']
    size = volume['Size']
    iops = volume.get('Iops', 0)
    
    # Define metrics to monitor
    metrics = [
        'VolumeReadBytes',
        'VolumeWriteBytes',
        'VolumeReadOps',
        'VolumeWriteOps',
        'VolumeThroughputPercentage',
        'VolumeConsumedReadWriteOps',
        'BurstBalance'  # For gp2 only
    ]
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)
    
    performance_data = {}
    
    for metric_name in metrics:
        try:
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/EBS',
                MetricName=metric_name,
                Dimensions=[
                    {'Name': 'VolumeId', 'Value': volume_id}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=300,
                Statistics=['Average', 'Maximum']
            )
            
            if response['Datapoints']:
                avg = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
                max_val = max(d['Maximum'] for d in response['Datapoints'])
                
                performance_data[metric_name] = {
                    'average': avg,
                    'maximum': max_val
                }
        
        except Exception as e:
            print(f"Error retrieving {metric_name}: {e}")
    
    # Calculate derived metrics
    if 'VolumeReadOps' in performance_data and 'VolumeWriteOps' in performance_data:
        total_iops = (
            performance_data['VolumeReadOps']['average'] +
            performance_data['VolumeWriteOps']['average']
        )
        
        # Check if approaching provisioned IOPS
        if iops > 0:
            iops_utilization = (total_iops / iops) * 100
            performance_data['iops_utilization_percent'] = iops_utilization
            
            if iops_utilization > 80:
                print(f"⚠️  High IOPS utilization: {iops_utilization:.1f}%")
    
    # Calculate throughput (MB/s)
    if 'VolumeReadBytes' in performance_data and 'VolumeWriteBytes' in performance_data:
        read_mbps = (performance_data['VolumeReadBytes']['average'] / (1024**2)) / 300
        write_mbps = (performance_data['VolumeWriteBytes']['average'] / (1024**2)) / 300
        total_mbps = read_mbps + write_mbps
        
        performance_data['throughput_mbps'] = {
            'read': read_mbps,
            'write': write_mbps,
            'total': total_mbps
        }
    
    # Check burst balance for gp2
    if volume_type == 'gp2' and 'BurstBalance' in performance_data:
        burst_balance = performance_data['BurstBalance']['average']
        
        if burst_balance < 20:
            print(f"⚠️  Low burst balance: {burst_balance:.1f}%")
            print("   Consider upgrading to gp3 for consistent performance")
    
    return {
        'volume_id': volume_id,
        'volume_type': volume_type,
        'size_gb': size,
        'provisioned_iops': iops,
        'metrics': performance_data
    }

def create_ebs_alarms(volume_id):
    """
    Create CloudWatch alarms for EBS volume
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    alarms = [
        {
            'AlarmName': f'{volume_id}-HighIOPS',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'VolumeConsumedReadWriteOps',
            'Namespace': 'AWS/EBS',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 15000,  # Adjust based on provisioned IOPS
            'Dimensions': [{'Name': 'VolumeId', 'Value': volume_id}]
        },
        {
            'AlarmName': f'{volume_id}-HighThroughput',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'VolumeThroughputPercentage',
            'Namespace': 'AWS/EBS',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 80,
            'Dimensions': [{'Name': 'VolumeId', 'Value': volume_id}]
        }
    ]
    
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")

# Usage
volume_data = monitor_ebs_performance('vol-1234567890abcdef0')
create_ebs_alarms('vol-1234567890abcdef0')
```

## Production-Level Knowledge

### High-Performance Database Configurations

**PostgreSQL on EBS:**

```bash
# Optimal configuration for PostgreSQL
# Use io2 Block Express for mission-critical production

# Data volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 1000 \
    --volume-type io2 \
    --iops 32000 \
    --multi-attach-enabled false \
    --encrypted \
    --tags Key=Name,Value=postgres-data

# WAL volume (separate for better performance)
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 100 \
    --volume-type io2 \
    --iops 10000 \
    --encrypted \
    --tags Key=Name,Value=postgres-wal

# PostgreSQL configuration optimizations
cat > postgresql.conf.snippet <<'EOF'
# EBS-optimized settings
shared_buffers = 25% of RAM
effective_cache_size = 75% of RAM
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # Lower for SSD
effective_io_concurrency = 200

# For io2 volumes
max_wal_size = 2GB
min_wal_size = 1GB
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-wal-archive/%f'
EOF
```

**MySQL on EBS:**

```bash
# InnoDB on io2
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 2000 \
    --volume-type io2 \
    --iops 64000 \
    --encrypted

# MySQL configuration
cat > my.cnf.snippet <<'EOF'
[mysqld]
# InnoDB settings for SSD
innodb_flush_method = O_DIRECT
innodb_log_file_size = 2G
innodb_buffer_pool_size = 75% of RAM
innodb_buffer_pool_instances = 8
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
innodb_flush_neighbors = 0  # Disable for SSD
innodb_read_io_threads = 16
innodb_write_io_threads = 16

# Binary logs on separate volume
log_bin = /var/log/mysql-binlog/mysql-bin
relay_log = /var/log/mysql-binlog/relay-bin
EOF
```


### Disaster Recovery Strategies

**EBS Backup Strategy:**

```python
# dr_backup_strategy.py
import boto3
from datetime import datetime, timedelta

class DisasterRecoveryManager:
    def __init__(self, primary_region, dr_region):
        self.primary_region = primary_region
        self.dr_region = dr_region
        self.ec2_primary = boto3.client('ec2', region_name=primary_region)
        self.ec2_dr = boto3.client('ec2', region_name=dr_region)
    
    def create_dr_snapshot_chain(self, volume_id):
        """
        Create multi-tiered backup strategy:
        - Hourly snapshots (last 24 hours)
        - Daily snapshots (last 7 days)
        - Weekly snapshots (last 4 weeks)
        - Monthly snapshots (last 12 months)
        - Cross-region copy for DR
        """
        
        # Create snapshot
        snapshot = self.ec2_primary.create_snapshot(
            VolumeId=volume_id,
            Description=f'DR snapshot {datetime.utcnow().isoformat()}',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Type', 'Value': 'DR-Snapshot'},
                    {'Key': 'Frequency', 'Value': 'Hourly'},
                    {'Key': 'SourceVolume', 'Value': volume_id}
                ]
            }]
        )
        
        snapshot_id = snapshot['SnapshotId']
        
        # Wait for completion
        waiter = self.ec2_primary.get_waiter('snapshot_completed')
        waiter.wait(SnapshotIds=[snapshot_id])
        
        # Copy to DR region
        dr_snapshot = self.ec2_dr.copy_snapshot(
            SourceRegion=self.primary_region,
            SourceSnapshotId=snapshot_id,
            Description=f'DR copy from {self.primary_region}',
            Encrypted=True,
            KmsKeyId='alias/dr-encryption-key',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Type', 'Value': 'DR-Copy'},
                    {'Key': 'SourceRegion', 'Value': self.primary_region},
                    {'Key': 'SourceSnapshot', 'Value': snapshot_id}
                ]
            }]
        )
        
        print(f"Created snapshot: {snapshot_id}")
        print(f"DR copy: {dr_snapshot['SnapshotId']}")
        
        return snapshot_id, dr_snapshot['SnapshotId']
    
    def cleanup_old_snapshots(self, retention_policy):
        """
        Clean up snapshots based on retention policy
        """
        
        snapshots = self.ec2_primary.describe_snapshots(
            OwnerIds=['self'],
            Filters=[{'Name': 'tag:Type', 'Values': ['DR-Snapshot']}]
        )['Snapshots']
        
        now = datetime.utcnow()
        
        for snapshot in snapshots:
            snapshot_time = snapshot['StartTime'].replace(tzinfo=None)
            age_days = (now - snapshot_time).days
            frequency = next(
                (tag['Value'] for tag in snapshot.get('Tags', []) 
                 if tag['Key'] == 'Frequency'),
                'Unknown'
            )
            
            should_delete = False
            
            if frequency == 'Hourly' and age_days > 1:
                should_delete = True
            elif frequency == 'Daily' and age_days > 7:
                should_delete = True
            elif frequency == 'Weekly' and age_days > 28:
                should_delete = True
            elif frequency == 'Monthly' and age_days > 365:
                should_delete = True
            
            if should_delete:
                self.ec2_primary.delete_snapshot(
                    SnapshotId=snapshot['SnapshotId']
                )
                print(f"Deleted old snapshot: {snapshot['SnapshotId']}")
    
    def test_dr_restore(self, snapshot_id):
        """
        Test DR restore procedure
        """
        
        # Create volume in DR region from snapshot
        volume = self.ec2_dr.create_volume(
            AvailabilityZone=f'{self.dr_region}a',
            SnapshotId=snapshot_id,
            VolumeType='gp3',
            Iops=3000,
            Throughput=125,
            Tags=[
                {'Key': 'Type', 'Value': 'DR-Test'},
                {'Key': 'CreatedAt', 'Value': datetime.utcnow().isoformat()}
            ]
        )
        
        volume_id = volume['VolumeId']
        
        # Wait for volume creation
        waiter = self.ec2_dr.get_waiter('volume_available')
        waiter.wait(VolumeIds=[volume_id])
        
        print(f"DR test volume created: {volume_id}")
        print("Next steps:")
        print("1. Attach to test instance")
        print("2. Mount and verify data integrity")
        print("3. Run application tests")
        print("4. Delete test volume when done")
        
        return volume_id

# Usage
dr_manager = DisasterRecoveryManager('us-east-1', 'us-west-2')
primary_snapshot, dr_snapshot = dr_manager.create_dr_snapshot_chain('vol-primary')
dr_manager.cleanup_old_snapshots({})
```

**Automated Failover with Route 53:**

```python
# ebs_failover_automation.py
import boto3

def automate_dr_failover(primary_volume_id, primary_region, dr_region):
    """
    Automate failover to DR region
    """
    
    ec2_primary = boto3.client('ec2', region_name=primary_region)
    ec2_dr = boto3.client('ec2', region_name=dr_region)
    route53 = boto3.client('route53')
    
    # 1. Create final snapshot in primary region
    print("Creating final snapshot...")
    snapshot = ec2_primary.create_snapshot(
        VolumeId=primary_volume_id,
        Description='Final snapshot before DR failover'
    )
    snapshot_id = snapshot['SnapshotId']
    
    # 2. Copy to DR region
    print("Copying to DR region...")
    dr_snapshot = ec2_dr.copy_snapshot(
        SourceRegion=primary_region,
        SourceSnapshotId=snapshot_id,
        Description='DR failover snapshot'
    )
    dr_snapshot_id = dr_snapshot['SnapshotId']
    
    # 3. Create volume in DR region
    print("Creating volume in DR region...")
    dr_volume = ec2_dr.create_volume(
        AvailabilityZone=f'{dr_region}a',
        SnapshotId=dr_snapshot_id,
        VolumeType='io2',
        Iops=32000
    )
    dr_volume_id = dr_volume['VolumeId']
    
    # 4. Launch DR instance
    print("Launching DR instance...")
    # Launch instance, attach volume, start application
    
    # 5. Update Route 53 to point to DR region
    print("Updating DNS...")
    route53.change_resource_record_sets(
        HostedZoneId='Z1234567890ABC',
        ChangeBatch={
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': 'db.example.com',
                    'Type': 'CNAME',
                    'TTL': 60,
                    'ResourceRecords': [
                        {'Value': f'dr-db.{dr_region}.compute.amazonaws.com'}
                    ]
                }
            }]
        }
    )
    
    print("DR failover completed!")
    print(f"DR Volume: {dr_volume_id}")
    
    return dr_volume_id
```


### EBS Performance Optimization

**I/O Queue Depth Tuning:**

```bash
# Check current queue depth
cat /sys/block/nvme1n1/queue/nr_requests

# Increase queue depth for better IOPS
echo 1024 | sudo tee /sys/block/nvme1n1/queue/nr_requests

# Make persistent
cat >> /etc/rc.local <<'EOF'
echo 1024 > /sys/block/nvme1n1/queue/nr_requests
EOF

# For databases, also tune I/O scheduler
# noop scheduler for SSD/NVMe (minimal overhead)
echo noop | sudo tee /sys/block/nvme1n1/queue/scheduler
```

**RAID Configurations:**

```bash
# RAID 0 for maximum performance (no redundancy, use snapshots)
# Aggregate IOPS and throughput from multiple volumes

# Create 4 io2 volumes
for i in {1..4}; do
    aws ec2 create-volume \
        --availability-zone us-east-1a \
        --size 1000 \
        --volume-type io2 \
        --iops 32000 \
        --tags Key=Name,Value=raid-volume-$i
done

# Attach all volumes to instance
# Then configure RAID 0
sudo mdadm --create /dev/md0 --level=0 --raid-devices=4 \
    /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1 /dev/nvme4n1

# Format and mount
sudo mkfs.ext4 /dev/md0
sudo mount /dev/md0 /data

# Result: 4 × 32,000 = 128,000 IOPS
#         4 × 1,000 MB/s = 4,000 MB/s throughput

# Save RAID configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf

# Auto-assemble on boot
sudo update-initramfs -u
```


### Cost Optimization Strategies

**gp2 to gp3 Migration:**

```python
# migrate_gp2_to_gp3.py
import boto3

def migrate_volume_gp2_to_gp3(volume_id):
    """
    Migrate gp2 volume to gp3 (no downtime, typically 20-30% cost savings)
    """
    
    ec2 = boto3.client('ec2')
    
    # Get current volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    if volume['VolumeType'] != 'gp2':
        print(f"Volume {volume_id} is not gp2")
        return
    
    size = volume['Size']
    current_iops = min(size * 3, 16000)  # gp2 formula
    
    # Calculate gp3 configuration
    # gp3 baseline: 3,000 IOPS, 125 MB/s
    # Cost: $0.08/GB + $0.005/IOPS above 3,000
    
    if current_iops <= 3000:
        # Use baseline gp3
        target_iops = 3000
        target_throughput = 125
        monthly_savings = size * (0.10 - 0.08)  # $0.02/GB
    else:
        # Provision additional IOPS
        target_iops = current_iops
        target_throughput = 125
        additional_iops = current_iops - 3000
        
        # gp2 cost
        gp2_cost = size * 0.10
        
        # gp3 cost
        gp3_cost = (size * 0.08) + (additional_iops * 0.005)
        
        monthly_savings = gp2_cost - gp3_cost
    
    print(f"Migration plan for {volume_id}:")
    print(f"  Current: gp2, {size} GB, ~{current_iops} IOPS")
    print(f"  Target: gp3, {size} GB, {target_iops} IOPS, {target_throughput} MB/s")
    print(f"  Monthly savings: ${monthly_savings:.2f}")
    
    # Perform migration (no downtime)
    response = ec2.modify_volume(
        VolumeId=volume_id,
        VolumeType='gp3',
        Iops=target_iops,
        Throughput=target_throughput
    )
    
    print(f"Migration initiated: {response['VolumeModification']['ModificationState']}")
    
    return monthly_savings

def bulk_migrate_account():
    """
    Find and migrate all gp2 volumes in account
    """
    
    ec2 = boto3.client('ec2')
    
    # Find all gp2 volumes
    paginator = ec2.get_paginator('describe_volumes')
    
    total_savings = 0
    migrated_count = 0
    
    for page in paginator.paginate(Filters=[{'Name': 'volume-type', 'Values': ['gp2']}]):
        for volume in page['Volumes']:
            volume_id = volume['VolumeId']
            
            # Check if volume is attached
            if volume['State'] == 'in-use':
                savings = migrate_volume_gp2_to_gp3(volume_id)
                total_savings += savings
                migrated_count += 1
    
    print(f"\nMigration Summary:")
    print(f"  Volumes migrated: {migrated_count}")
    print(f"  Total monthly savings: ${total_savings:.2f}")
    print(f"  Annual savings: ${total_savings * 12:.2f}")

# Run migration
bulk_migrate_account()
```

**Snapshot Optimization:**

```python
# snapshot_cost_optimizer.py
import boto3
from datetime import datetime, timedelta

def optimize_snapshot_storage():
    """
    Analyze and optimize snapshot costs
    """
    
    ec2 = boto3.client('ec2')
    
    # Get all snapshots
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])['Snapshots']
    
    # Analyze snapshot storage
    total_storage = 0
    archivable_snapshots = []
    deletable_snapshots = []
    
    for snapshot in snapshots:
        size = snapshot['VolumeSize']
        start_time = snapshot['StartTime'].replace(tzinfo=None)
        age_days = (datetime.utcnow() - start_time).days
        
        # Calculate incremental storage (approximation)
        # Real incremental storage requires AWS Cost Explorer
        
        total_storage += size
        
        # Identify optimization opportunities
        if age_days > 90 and age_days < 365:
            # Good candidate for Archive tier
            archivable_snapshots.append({
                'SnapshotId': snapshot['SnapshotId'],
                'Size': size,
                'Age': age_days,
                'Savings': size * (0.05 - 0.0125)  # 75% savings
            })
        
        elif age_days > 365:
            # Consider deletion if no longer needed
            tags = {tag['Key']: tag['Value'] for tag in snapshot.get('Tags', [])}
            
            if 'Permanent' not in tags:
                deletable_snapshots.append({
                    'SnapshotId': snapshot['SnapshotId'],
                    'Size': size,
                    'Age': age_days,
                    'Savings': size * 0.05
                })
    
    # Generate report
    print("Snapshot Cost Optimization Report")
    print("=" * 50)
    print(f"Total snapshots: {len(snapshots)}")
    print(f"Total storage: {total_storage} GB")
    print(f"Current monthly cost: ${total_storage * 0.05:.2f}")
    
    print(f"\nArchive candidates: {len(archivable_snapshots)}")
    archive_savings = sum(s['Savings'] for s in archivable_snapshots)
    print(f"Potential monthly savings: ${archive_savings:.2f}")
    
    print(f"\nDeletion candidates: {len(deletable_snapshots)}")
    deletion_savings = sum(s['Savings'] for s in deletable_snapshots)
    print(f"Potential monthly savings: ${deletion_savings:.2f}")
    
    print(f"\nTotal potential savings: ${archive_savings + deletion_savings:.2f}/month")
    print(f"Annual savings: ${(archive_savings + deletion_savings) * 12:.2f}")
    
    return {
        'archivable': archivable_snapshots,
        'deletable': deletable_snapshots,
        'total_savings': archive_savings + deletion_savings
    }

def archive_old_snapshots(snapshot_ids):
    """
    Archive snapshots to reduce costs
    """
    
    ec2 = boto3.client('ec2')
    
    for snapshot_id in snapshot_ids:
        # Archive snapshot (moves to Archive tier)
        ec2.modify_snapshot_tier(
            SnapshotId=snapshot_id,
            StorageTier='archive'
        )
        
        print(f"Archived snapshot: {snapshot_id}")

# Run optimization
optimization_plan = optimize_snapshot_storage()
```


## Tips \& Best Practices

### Volume Type Selection Tips

**Tip 1: Use gp3 as Default**

```
Compared to gp2:
- 20% cheaper per GB
- Predictable performance (no burst credits)
- Independently scale IOPS and throughput
- Same latency characteristics

Recommendation: Migrate all gp2 to gp3
```

**Tip 2: Choose io2 for Databases**

```
Use io2/io2 Block Express when:
- Database workload (MySQL, PostgreSQL, Oracle)
- Need consistent IOPS > 16,000
- Sub-millisecond latency required
- 99.999% durability needed

Don't use for:
- Boot volumes (gp3 sufficient)
- Log files (st1 better for sequential writes)
- Development/test (gp3 adequate)
```

**Tip 3: Use st1 for Sequential Workloads**

```bash
# Big data, data warehousing, log processing
# Example: Kafka storage

# Create st1 volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 2000 \
    --volume-type st1  # $0.045/GB vs $0.08/GB for gp3

# Result: $90/month vs $160/month = $70 savings
# For sequential I/O workloads only
```


### Performance Tips

**Tip 4: Enable EBS Optimization**

```bash
# Check if instance type supports EBS optimization
aws ec2 describe-instance-types \
    --instance-types m5.xlarge \
    --query 'InstanceTypes[0].EbsInfo'

# Enable on instance
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --ebs-optimized

# Result: Dedicated bandwidth for EBS (no network contention)
# m5.xlarge: Up to 4,750 Mbps (593 MB/s) EBS bandwidth
```

**Tip 5: Pre-Warm Volumes from Snapshots**

```bash
# New volumes from snapshots have lazy initialization
# First access to each block is slow

# Pre-warm by reading entire volume
sudo fio --filename=/dev/nvme1n1 \
    --rw=read \
    --bs=1M \
    --direct=1 \
    --name=prewarm

# Or use Fast Snapshot Restore (FSR)
aws ec2 enable-fast-snapshot-restores \
    --availability-zones us-east-1a \
    --source-snapshot-ids snap-1234567890abcdef0

# FSR cost: $0.75/hour per snapshot per AZ
# Worth it for critical restores
```

**Tip 6: Align Partition Boundaries**

```bash
# Misaligned partitions reduce IOPS by 20-30%

# Check alignment
sudo parted /dev/nvme1n1 align-check opt 1

# Create aligned partition
sudo parted -a optimal /dev/nvme1n1 mklabel gpt
sudo parted -a optimal /dev/nvme1n1 mkpart primary 0% 100%

# Format with optimal stripe size
sudo mkfs.ext4 -E stride=16,stripe-width=64 /dev/nvme1n1p1
```


### Backup and Recovery Tips

**Tip 7: Automate Snapshots with DLM**

```bash
# Use Data Lifecycle Manager instead of manual scripts
# - Automatic scheduling
# - Retention management
# - Cross-region copy
# - Fast Snapshot Restore
# - No Lambda/cron needed
```

**Tip 8: Tag Volumes for Backup Policies**

```bash
# Tag-based backup policies
aws ec2 create-tags \
    --resources vol-1234567890abcdef0 \
    --tags \
        Key=Backup,Value=Daily \
        Key=Retention,Value=30days \
        Key=Critical,Value=true

# DLM automatically backs up based on tags
# Makes backup management scalable
```

**Tip 9: Test Restore Procedures**

```python
# test_restore.py
def test_snapshot_restore(snapshot_id):
    """
    Regularly test restore procedures
    """
    
    # 1. Create volume from snapshot
    volume = create_volume_from_snapshot(snapshot_id)
    
    # 2. Attach to test instance
    attach_volume(volume_id, test_instance_id)
    
    # 3. Mount and verify data
    result = verify_data_integrity(volume_id)
    
    # 4. Measure restore time
    restore_time = calculate_restore_time()
    
    # 5. Clean up
    cleanup_test_resources(volume_id)
    
    # 6. Document
    log_restore_test_results(result, restore_time)
    
    return result

# Run monthly restore tests
schedule_restore_tests(frequency='monthly')
```


### Cost Optimization Tips

**Tip 10: Right-Size Volumes**

```python
# volume_sizing_analyzer.py
import boto3

def analyze_volume_utilization(volume_id):
    """
    Analyze if volume is over-provisioned
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get IOPS utilization
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/EBS',
        MetricName='VolumeConsumedReadWriteOps',
        Dimensions=[{'Name': 'VolumeId', 'Value': volume_id}],
        StartTime=datetime.now() - timedelta(days=7),
        EndTime=datetime.now(),
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    if not response['Datapoints']:
        return None
    
    avg_iops = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
    max_iops = max(d['Maximum'] for d in response['Datapoints'])
    
    # Get volume configuration
    ec2 = boto3.client('ec2')
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    provisioned_iops = volume.get('Iops', 3000)
    utilization = (avg_iops / provisioned_iops) * 100
    
    recommendations = []
    
    if utilization < 20:
        # Significantly over-provisioned
        recommended_iops = int(max_iops * 1.5)  # 50% buffer
        
        if recommended_iops < 3000:
            recommended_iops = 3000  # gp3 baseline
        
        current_cost = calculate_volume_cost(volume)
        recommended_cost = calculate_cost_with_iops(volume, recommended_iops)
        savings = current_cost - recommended_cost
        
        recommendations.append({
            'action': 'Reduce provisioned IOPS',
            'current': provisioned_iops,
            'recommended': recommended_iops,
            'monthly_savings': savings
        })
    
    return {
        'volume_id': volume_id,
        'utilization': utilization,
        'recommendations': recommendations
    }
```

**Tip 11: Delete Unattached Volumes**

```bash
# Find unused volumes
aws ec2 describe-volumes \
    --filters Name=status,Values=available \
    --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
    --output table

# Calculate cost of unused volumes
# Check last attachment time before deleting

# Create snapshot before deletion (safety)
aws ec2 create-snapshot --volume-id vol-unused
aws ec2 delete-volume --volume-id vol-unused
```

**Tip 12: Use EFS Infrequent Access for Cold Data**

```bash
# EFS with lifecycle management
# Standard: $0.30/GB-month
# IA: $0.025/GB-month (92% savings)

# Enable lifecycle policy
aws efs put-lifecycle-configuration \
    --file-system-id fs-1234567890abcdef0 \
    --lifecycle-policies \
        TransitionToIA=AFTER_30_DAYS

# Files not accessed for 30 days automatically move to IA
# Moved back to Standard on access
# No application changes needed
```


## Pitfalls \& Remedies

### Pitfall 1: Wrong Volume Type Selection

**Problem:** Selecting inappropriate volume type for workload, leading to poor performance or wasted costs.

**Why It Happens:**

- Not understanding workload I/O patterns
- Using defaults without analysis
- Choosing based on price alone
- Legacy gp2 volumes not migrated

**Impact:**

- Poor application performance
- Database slowdowns
- Wasted money on over-provisioned storage
- Unpredictable burst performance (gp2)

**Example:**

```
Scenario: MySQL database on gp2

gp2 Configuration:
- Size: 500 GB
- Baseline IOPS: 1,500 (3 IOPS/GB)
- Burst to: 3,000 IOPS (using burst credits)

Problem:
- Database needs consistent 5,000 IOPS
- Burst credits deplete quickly
- Performance degrades to 1,500 IOPS baseline
- Database transactions slow to a crawl
```

**Remedy:**

**Step 1: Analyze Workload**

```python
# analyze_workload_iops.py
import boto3
from datetime import datetime, timedelta

def analyze_volume_requirements(volume_id, days=7):
    """
    Analyze actual IOPS requirements
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    metrics = ['VolumeReadOps', 'VolumeWriteOps']
    
    total_iops_data = []
    
    for metric in metrics:
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/EBS',
            MetricName=metric,
            Dimensions=[{'Name': 'VolumeId', 'Value': volume_id}],
            StartTime=datetime.now() - timedelta(days=days),
            EndTime=datetime.now(),
            Period=300,  # 5-minute intervals
            Statistics=['Average', 'Maximum']
        )
        
        for datapoint in response['Datapoints']:
            total_iops_data.append(datapoint)
    
    if not total_iops_data:
        return None
    
    avg_iops = sum(d['Average'] for d in total_iops_data) / len(total_iops_data)
    max_iops = max(d['Maximum'] for d in total_iops_data)
    p95_iops = sorted([d['Maximum'] for d in total_iops_data])[int(len(total_iops_data) * 0.95)]
    
    # Recommend volume type
    if p95_iops < 3000:
        recommendation = {
            'type': 'gp3',
            'iops': 3000,
            'throughput': 125,
            'reason': 'Baseline gp3 sufficient'
        }
    elif p95_iops < 16000:
        recommendation = {
            'type': 'gp3',
            'iops': int(p95_iops * 1.2),  # 20% buffer
            'throughput': 125,
            'reason': 'gp3 with additional IOPS'
        }
    else:
        recommendation = {
            'type': 'io2',
            'iops': int(p95_iops * 1.2),
            'reason': 'Consistent high IOPS required'
        }
    
    return {
        'current_utilization': {
            'average_iops': avg_iops,
            'max_iops': max_iops,
            'p95_iops': p95_iops
        },
        'recommendation': recommendation
    }

# Analyze and recommend
analysis = analyze_volume_requirements('vol-1234567890abcdef0')
print(f"Recommended: {analysis['recommendation']['type']}")
print(f"IOPS: {analysis['recommendation']['iops']}")
```

**Step 2: Migrate to Appropriate Volume Type**

```bash
# Migrate gp2 to io2 (example for database)
# No downtime, happens while volume is in use

aws ec2 modify-volume \
    --volume-id vol-1234567890abcdef0 \
    --volume-type io2 \
    --iops 10000

# Monitor modification progress
aws ec2 describe-volumes-modifications \
    --volume-ids vol-1234567890abcdef0

# Takes 1-6 hours depending on volume size
# Can continue using volume during modification
```

**Step 3: Validate Performance Improvement**

```bash
# Test IOPS after migration
sudo fio --name=randread --ioengine=libaio --iodepth=32 \
    --rw=randread --bs=4k --direct=1 --size=1G \
    --numjobs=4 --runtime=60 --group_reporting \
    --filename=/dev/nvme1n1

# Expected results:
# gp2 (burst depleted): ~1,500 IOPS
# io2 (10,000 provisioned): ~10,000 IOPS
```

**Prevention:**

- Profile workloads before selecting volume type
- Monitor IOPS and throughput usage
- Use io2 for databases requiring consistent performance
- Migrate all gp2 to gp3 for cost savings
- Set CloudWatch alarms for burst credit depletion (gp2)

***

### Pitfall 2: Snapshot Lifecycle Gaps

**Problem:** No automated snapshot strategy, leading to data loss or excessive snapshot costs.

**Why It Happens:**

- Manual snapshot processes forgotten
- No retention policy
- Snapshots never deleted
- No cross-region copy for DR

**Impact:**

- Data loss when volumes fail
- Inability to meet RPO/RTO requirements
- Excessive snapshot storage costs
- No disaster recovery capability

**Remedy:**

**Step 1: Implement Comprehensive DLM Policy**

```bash
# Create DLM lifecycle policy
cat > comprehensive-dlm-policy.json <<'EOF'
{
  "ExecutionRoleArn": "arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole",
  "Description": "Comprehensive backup strategy with multiple tiers",
  "State": "ENABLED",
  "PolicyDetails": {
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "true"}],
    "Schedules": [
      {
        "Name": "Hourly snapshots (24-hour retention)",
        "CreateRule": {
          "Interval": 1,
          "IntervalUnit": "HOURS",
          "Times": ["00:00"]
        },
        "RetainRule": {"Count": 24},
        "TagsToAdd": [{"Key": "Type", "Value": "Hourly"}],
        "CopyTags": true
      },
      {
        "Name": "Daily snapshots (7-day retention)",
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["02:00"]
        },
        "RetainRule": {"Count": 7},
        "TagsToAdd": [{"Key": "Type", "Value": "Daily"}],
        "CrossRegionCopyRules": [{
          "TargetRegion": "us-west-2",
          "Encrypted": true,
          "RetainRule": {"Interval": 7, "IntervalUnit": "DAYS"}
        }]
      },
      {
        "Name": "Weekly snapshots (4-week retention)",
        "CreateRule": {
          "CronExpression": "cron(0 3 ? * SUN *)"
        },
        "RetainRule": {"Count": 4},
        "TagsToAdd": [{"Key": "Type", "Value": "Weekly"}]
      },
      {
        "Name": "Monthly snapshots (12-month retention + archive)",
        "CreateRule": {
          "CronExpression": "cron(0 4 1 * ? *)"
        },
        "RetainRule": {"Count": 12},
        "ArchiveRule": {
          "RetainRule": {"RetentionArchiveTier": {"Count": 365}}
        },
        "TagsToAdd": [{"Key": "Type", "Value": "Monthly"}]
      }
    ]
  }
}
EOF

aws dlm create-lifecycle-policy \
    --cli-input-json file://comprehensive-dlm-policy.json
```

**Step 2: Enable Recycle Bin**

```bash
# Protect against accidental snapshot deletion
aws rbin create-rule \
    --resource-type EBS_SNAPSHOT \
    --retention-period RetentionPeriodValue=7,RetentionPeriodUnit=DAYS \
    --description "Retain deleted snapshots for 7 days" \
    --tags Key=Environment,Value=Production

# Deleted snapshots go to Recycle Bin
# Can be recovered within retention period
```

**Step 3: Monitor Backup Compliance**

```python
# snapshot_compliance_monitor.py
import boto3
from datetime import datetime, timedelta

def check_snapshot_compliance():
    """
    Verify all critical volumes have recent snapshots
    """
    
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')
    
    # Get all volumes tagged for backup
    volumes = ec2.describe_volumes(
        Filters=[
            {'Name': 'tag:Backup', 'Values': ['true', 'Daily']},
            {'Name': 'status', 'Values': ['in-use']}
        ]
    )['Volumes']
    
    non_compliant = []
    
    for volume in volumes:
        volume_id = volume['VolumeId']
        
        # Get snapshots for this volume
        snapshots = ec2.describe_snapshots(
            Filters=[
                {'Name': 'volume-id', 'Values': [volume_id]},
                {'Name': 'status', 'Values': ['completed']}
            ]
        )['Snapshots']
        
        if not snapshots:
            non_compliant.append({
                'volume_id': volume_id,
                'issue': 'No snapshots exist',
                'severity': 'CRITICAL'
            })
            continue
        
        # Check most recent snapshot
        latest_snapshot = max(snapshots, key=lambda s: s['StartTime'])
        snapshot_age = datetime.now(latest_snapshot['StartTime'].tzinfo) - latest_snapshot['StartTime']
        
        if snapshot_age > timedelta(hours=25):  # Allow 1 hour grace period
            non_compliant.append({
                'volume_id': volume_id,
                'issue': f'Latest snapshot is {snapshot_age.days} days old',
                'severity': 'HIGH',
                'latest_snapshot': latest_snapshot['SnapshotId']
            })
    
    # Alert if non-compliant volumes found
    if non_compliant:
        message = "Snapshot Compliance Issues\n\n"
        message += f"Found {len(non_compliant)} non-compliant volumes:\n\n"
        
        for item in non_compliant:
            message += f"Volume: {item['volume_id']}\n"
            message += f"Issue: {item['issue']}\n"
            message += f"Severity: {item['severity']}\n\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:backup-alerts',
            Subject='⚠️ Snapshot Compliance Alert',
            Message=message
        )
    
    return non_compliant

# Run daily
compliance_issues = check_snapshot_compliance()
```

**Prevention:**

- Use DLM for automated snapshots
- Implement multiple retention tiers
- Enable cross-region copy for DR
- Monitor with CloudWatch Events
- Test restore procedures regularly
- Use Recycle Bin for deletion protection

***

### Pitfall 3: Not Enabling EBS Encryption

**Problem:** Unencrypted EBS volumes expose data at rest.

**Why It Happens:**

- Encryption not enabled by default
- Legacy volumes created before encryption default
- Not understanding compliance requirements
- Assuming VPC security is sufficient

**Impact:**

- Compliance violations (HIPAA, PCI-DSS, GDPR)
- Data exposure if physical media compromised
- Audit failures
- Inability to meet security requirements

**Remedy:**

**Step 1: Enable Encryption by Default**

```bash
# Enable for all new volumes (account-level setting)
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# Verify
aws ec2 get-ebs-encryption-by-default --region us-east-1

# Apply to all regions
for region in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
    aws ec2 enable-ebs-encryption-by-default --region $region
    echo "Enabled encryption by default in $region"
done
```

**Step 2: Encrypt Existing Unencrypted Volumes**

```python
# encrypt_existing_volumes.py
import boto3

def encrypt_volume(volume_id):
    """
    Encrypt an existing unencrypted volume
    Requires creating snapshot and new volume
    """
    
    ec2 = boto3.client('ec2')
    
    # Get volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    if volume['Encrypted']:
        print(f"Volume {volume_id} already encrypted")
        return
    
    availability_zone = volume['AvailabilityZone']
    volume_type = volume['VolumeType']
    size = volume['Size']
    iops = volume.get('Iops')
    throughput = volume.get('Throughput')
    tags = volume.get('Tags', [])
    
    # Check if volume is attached
    if volume['Attachments']:
        attachment = volume['Attachments'][0]
        instance_id = attachment['InstanceId']
        device = attachment['Device']
        delete_on_termination = attachment['DeleteOnTermination']
        
        print(f"Volume attached to {instance_id} as {device}")
        print("WARNING: This will require instance downtime")
        print("Consider stopping instance or detaching volume")
        
        # For production, implement proper coordination
        # This is simplified example
        
        # Stop instance
        print("Stopping instance...")
        ec2.stop_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        # Detach volume
        ec2.detach_volume(VolumeId=volume_id)
        waiter = ec2.get_waiter('volume_available')
        waiter.wait(VolumeIds=[volume_id])
    
    # Create snapshot
    print("Creating snapshot...")
    snapshot = ec2.create_snapshot(
        VolumeId=volume_id,
        Description=f'Pre-encryption snapshot of {volume_id}'
    )
    snapshot_id = snapshot['SnapshotId']
    
    waiter = ec2.get_waiter('snapshot_completed')
    waiter.wait(SnapshotIds=[snapshot_id])
    
    # Create encrypted volume from snapshot
    print("Creating encrypted volume...")
    
    create_params = {
        'AvailabilityZone': availability_zone,
        'SnapshotId': snapshot_id,
        'VolumeType': volume_type,
        'Size': size,
        'Encrypted': True,
        'KmsKeyId': 'alias/ebs-encryption',
        'TagSpecifications': [{
            'ResourceType': 'volume',
            'Tags': tags + [{'Key': 'EncryptedFrom', 'Value': volume_id}]
        }]
    }
    
    if iops:
        create_params['Iops'] = iops
    if throughput:
        create_params['Throughput'] = throughput
    
    new_volume = ec2.create_volume(**create_params)
    new_volume_id = new_volume['VolumeId']
    
    waiter = ec2.get_waiter('volume_available')
    waiter.wait(VolumeIds=[new_volume_id])
    
    # If was attached, reattach encrypted volume
    if volume['Attachments']:
        ec2.attach_volume(
            VolumeId=new_volume_id,
            InstanceId=instance_id,
            Device=device
        )
        
        # Modify attachment attributes
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            BlockDeviceMappings=[{
                'DeviceName': device,
                'Ebs': {'DeleteOnTermination': delete_on_termination}
            }]
        )
        
        # Start instance
        ec2.start_instances(InstanceIds=[instance_id])
        print(f"Reattached encrypted volume and started instance")
    
    print(f"Encryption complete!")
    print(f"New encrypted volume: {new_volume_id}")
    print(f"Old unencrypted volume: {volume_id} (not deleted)")
    print(f"Snapshot: {snapshot_id}")
    
    return new_volume_id

# Usage
# encrypt_volume('vol-unencrypted123')
```

**Step 3: Audit and Report**

```python
# audit_encryption.py
def audit_ebs_encryption():
    """
    Find all unencrypted volumes
    """
    
    ec2 = boto3.client('ec2')
    
    # Get all volumes
    paginator = ec2.get_paginator('describe_volumes')
    
    unencrypted_volumes = []
    
    for page in paginator.paginate():
        for volume in page['Volumes']:
            if not volume['Encrypted']:
                unencrypted_volumes.append({
                    'VolumeId': volume['VolumeId'],
                    'Size': volume['Size'],
                    'State': volume['State'],
                    'AttachedTo': volume['Attachments'][0]['InstanceId'] if volume['Attachments'] else None,
                    'VolumeType': volume['VolumeType']
                })
    
    # Generate report
    print("Unencrypted EBS Volumes Report")
    print("=" * 50)
    print(f"Total unencrypted volumes: {len(unencrypted_volumes)}")
    
    attached_count = sum(1 for v in unencrypted_volumes if v['AttachedTo'])
    print(f"Attached: {attached_count}")
    print(f"Available: {len(unencrypted_volumes) - attached_count}")
    
    total_size = sum(v['Size'] for v in unencrypted_volumes)
    print(f"Total size: {total_size} GB")
    
    print("\nVolumes:")
    for vol in unencrypted_volumes:
        print(f"  {vol['VolumeId']}: {vol['Size']} GB, {vol['State']}, attached to {vol['AttachedTo']}")
    
    return unencrypted_volumes

# Run audit
unencrypted = audit_ebs_encryption()
```

**Prevention:**

- Enable encryption by default for all regions
- Use AWS Config rules to detect unencrypted volumes
- Implement encryption requirement in IaC templates
- Regular audits and automated remediation
- Training on compliance requirements

***

## Chapter Summary

Amazon EBS and EFS provide persistent, high-performance storage for EC2 instances, each optimized for different use cases. EBS offers block-level storage with multiple volume types for diverse workload requirements, from general-purpose gp3 to ultra-high-performance io2 Block Express. EFS provides scalable, shared NFS file systems accessible by multiple instances simultaneously. Understanding volume types, performance characteristics, snapshot strategies, encryption, and cost optimization is essential for production deployments.

**Key Takeaways:**

- **Volume type selection matters:** gp3 for general use, io2 for databases, st1 for sequential workloads, EFS for shared file systems
- **Migrate gp2 to gp3:** 20% cost savings with better, predictable performance
- **Automate snapshots:** Use Data Lifecycle Manager for comprehensive backup strategy with retention policies
- **Enable encryption:** Encrypt by default, encrypt existing volumes, use KMS for key management
- **Monitor performance:** CloudWatch metrics for IOPS, throughput, burst balance; set alarms for issues
- **Optimize costs:** Right-size volumes, delete unused, archive old snapshots, use EFS IA for cold data

Understanding EBS and EFS deeply enables you to build performant, reliable, cost-effective storage solutions for databases, applications, and shared file systems.

## Review Questions

1. **Which EBS volume type provides the lowest cost?**
a) gp3
b) st1
c) sc1
d) gp2

**Answer: C** - Cold HDD (sc1) at \$0.015/GB-month is the cheapest EBS volume type.

2. **Maximum IOPS for io2 Block Express?**
a) 16,000
b) 64,000
c) 128,000
d) 256,000

**Answer: D** - io2 Block Express supports up to 256,000 IOPS.

3. **gp3 baseline performance?**
a) 100 IOPS, 125 MB/s
b) 3,000 IOPS, 125 MB/s
c) 16,000 IOPS, 1,000 MB/s
d) 10,000 IOPS, 250 MB/s

**Answer: B** - gp3 baseline is 3,000 IOPS and 125 MB/s throughput.

4. **EBS snapshots are stored in:**
a) EBS
b) S3
c) EFS
d) Instance store

**Answer: B** - EBS snapshots are stored in Amazon S3 (though you don't access them directly).

5. **Can you attach an EBS volume to multiple instances?**
a) No, never
b) Yes, always
c) Yes, with Multi-Attach (io2 only, same AZ)
d) Yes, across regions

**Answer: C** - Multi-Attach allows io2/io2 Block Express volumes to attach to up to 16 instances in the same AZ.

6. **EFS performance mode for maximum throughput?**
a) General Purpose
b) Max I/O
c) Provisioned
d) Bursting

**Answer: B** - Max I/O performance mode provides higher aggregate throughput for large-scale workloads.

7. **Minimum retention for EBS Snapshot Archive?**
a) 7 days
b) 30 days
c) 90 days
d) 180 days

**Answer: C** - Snapshot Archive has 90-day minimum retention.

8. **Which volume type is best for data warehouses?**
a) gp3
b) io2
c) st1
d) sc1

**Answer: C** - Throughput Optimized HDD (st1) is optimized for sequential workloads like data warehouses.

9. **EFS Infrequent Access cost savings?**
a) 50%
b) 70%
c) 92%
d) 99%

**Answer: C** - EFS IA costs \$0.025/GB vs \$0.30/GB Standard (92% savings).

10. **Maximum EBS volume size?**
a) 1 TiB
b) 16 TiB
c) 64 TiB
d) Unlimited

**Answer: C** - io2 Block Express supports up to 64 TiB (16 TiB for other types).

11. **Fast Snapshot Restore cost?**
a) Free
b) \$0.10/hour per snapshot per AZ
c) \$0.75/hour per snapshot per AZ
d) \$1.00/hour per snapshot per AZ

**Answer: C** - FSR costs \$0.75 per hour per snapshot per AZ.

12. **gp2 IOPS formula?**
a) 1 IOPS per GB
b) 3 IOPS per GB
c) 10 IOPS per GB
d) Fixed 3,000 IOPS

**Answer: B** - gp2 provides 3 IOPS per GB (minimum 100, maximum 16,000).

13. **Which encryption option provides audit trail?**
a) Default AWS-managed key
b) Customer-managed KMS key
c) No encryption
d) Client-side encryption

**Answer: B** - Customer-managed KMS keys log all encryption operations to CloudTrail.

14. **EFS can be mounted by instances in:**
a) Single AZ only
b) Multiple AZs in same region
c) Multiple regions
d) Single instance only

**Answer: B** - EFS can be mounted by instances across multiple AZs in the same region.

15. **Snapshot are:**
a) Full backups every time
b) Incremental after first snapshot
c) Differential backups
d) Real-time continuous backup

**Answer: B** - First snapshot is full, subsequent snapshots are incremental (only changed blocks).

***

These questions cover key EBS/EFS concepts from the AWS Certified Solutions Architect - Associate exam.
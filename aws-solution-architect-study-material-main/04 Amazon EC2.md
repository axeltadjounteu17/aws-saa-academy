# Part 2: Compute Services

# Chapter 4: Amazon EC2

## Introduction

Amazon Elastic Compute Cloud (EC2) is the backbone of AWS compute services, providing resizable virtual servers that form the foundation for countless applications and workloads. Since its launch in 2006, EC2 has revolutionized how organizations provision and manage computing resources, transforming weeks of procurement cycles into minutes of API calls. Understanding EC2 is fundamental to becoming an effective AWS Solutions Architect.

EC2's flexibility is both its greatest strength and its biggest challenge. With hundreds of instance types, multiple pricing models, various storage options, and complex networking configurations, making optimal decisions requires deep understanding of both the service and your workload requirements. A poorly chosen instance type can waste thousands of dollars monthly, while incorrect Auto Scaling configurations can leave your application unavailable during traffic spikes.

The true power of EC2 extends far beyond simply launching virtual machines. Modern EC2 architectures leverage Auto Scaling for elasticity, Application Load Balancers for traffic distribution, AMIs for repeatable deployments, and sophisticated placement strategies for performance optimization. Successful production deployments require mastering instance lifecycle management, implementing comprehensive monitoring, designing effective patching strategies, and optimizing costs through Reserved Instances and Savings Plans.

This chapter provides comprehensive coverage of EC2 from fundamentals to production-grade implementations. You'll learn to select appropriate instance types for different workloads, design highly available Auto Scaling architectures, create and manage custom AMIs, implement fleet management at scale, and optimize costs while maintaining performance. Whether you're migrating legacy applications to the cloud or building cloud-native systems, mastering EC2 is essential to your AWS journey.

## Theory \& Concepts

### EC2 Fundamentals

Amazon EC2 provides secure, resizable compute capacity in the cloud. Each instance is a virtual server that you can configure with the operating system, applications, and data needed for your workload.

**Key Characteristics:**

- **Elasticity:** Scale up or down within minutes
- **Complete Control:** Root access to each instance
- **Flexible Pricing:** Pay only for what you use
- **Integrated:** Works seamlessly with other AWS services
- **Secure:** Leverages VPC, security groups, and IAM
- **Reliable:** 99.99% SLA when properly architected

**Instance Components:**

1. **vCPUs:** Virtual central processing units
2. **Memory (RAM):** Instance memory in GiB
3. **Storage:** Instance store (ephemeral) or EBS (persistent)
4. **Network:** Enhanced networking capabilities
5. **GPU/Accelerators:** For specific workloads (ML, graphics)

### Instance Types and Families

EC2 offers over 400 instance types organized into families optimized for different use cases.

**Instance Family Naming Convention:**

Format: `[Family][Generation].[Size]`

Example: `m5.2xlarge`

- `m` = General Purpose family
- `5` = 5th generation
- `2xlarge` = Size (8 vCPUs, 32 GiB RAM)

**Additional Suffixes:**

- `a` = AMD processors (e.g., `m5a.large`)
- `n` = Enhanced networking (e.g., `c5n.xlarge`)
- `d` = Instance store volumes (e.g., `m5d.large`)
- `e` = Extra storage or memory (e.g., `r5e.xlarge`)
- `metal` = Bare metal (e.g., `c5.metal`)


#### General Purpose (M, T, Mac)

Balanced compute, memory, and networking for diverse workloads.

**M7i/M7g Family (Latest Gen 2024-2025):**

- **M7i:** 4th Gen Intel Xeon (Sapphire Rapids), up to 192 vCPUs
- **M7g:** AWS Graviton3, up to 64 vCPUs, 20% better price-performance than M6g
- **M7i-Flex:** Lowest-cost general purpose (uses burst model like T-series)
- **Use Cases:** Web servers, application servers, small/medium databases

**T4g Family (Burstable ARM):**

- **Use Cases:** Websites, microservices, dev/test, small databases
- **Special Feature:** CPU credits for burst performance
- **T4g (Graviton2):** 40% better price-performance than T3; ARM-based
- **Cost:** Lowest cost per hour for general purpose

> **2025 Note:** AWS now requires IMDSv2 (`HttpTokens=required`) as the default for new EC2 instances launched after August 2024 in most Regions. Always set `HttpTokens=required` and `HttpPutResponseHopLimit=2` (for container workloads) in launch templates.

> **SnapStart Note:** Lambda SnapStart now supports Java 11, Java 17, and Java 21 runtimes.

**CPU Credits:**

```
T3.medium earns 24 credits/hour
Each credit = 1 vCPU at 100% for 1 minute
Baseline (20%) uses 12 credits/hour
Surplus: 12 credits/hour for bursting
```

**Mac Instances:**

- **Use Cases:** iOS/macOS development, testing
- **Host:** Dedicated Mac mini hardware
- **OS:** macOS Monterey, Ventura, Sonoma
- **Minimum Allocation:** 24 hours


#### Compute Optimized (C)

High-performance processors for compute-intensive workloads.

**C6i Family:**

- **Use Cases:** Batch processing, media transcoding, gaming servers, scientific modeling
- **vCPUs:** 2 to 128
- **Memory:** 4 GiB to 256 GiB
- **Processor:** 3rd Gen Intel Xeon (3.5 GHz)
- **Network:** Up to 50 Gbps
- **Price:** Higher CPU-to-memory ratio

**C7g Family (Graviton3):**

- **Processor:** AWS Graviton3 (ARM)
- **Performance:** Up to 25% better than C6g
- **Cost:** Up to 20% lower than comparable Intel
- **Use Cases:** High-performance computing, gaming, video encoding


#### Memory Optimized (R, X, z, High Memory)

Large memory for memory-intensive applications.

**R6i Family:**

- **Use Cases:** In-memory databases (Redis, SAP HANA), big data analytics
- **vCPUs:** 2 to 128
- **Memory:** 16 GiB to 1,024 GiB (1 TB)
- **Memory-to-vCPU Ratio:** 8:1

**X2iedn Family (High Memory \& Storage):**

- **Use Cases:** Memory-intensive databases, in-memory analytics
- **vCPUs:** 2 to 128
- **Memory:** 16 GiB to 4,096 GiB (4 TB)
- **Memory-to-vCPU Ratio:** 32:1
- **Storage:** Up to 3.8 TB NVMe SSD

**High Memory Instances:**

- **Sizes:** 3 TB, 6 TB, 9 TB, 12 TB, 18 TB, 24 TB
- **Use Cases:** SAP HANA, in-memory databases
- **Special:** Bare metal only


#### Storage Optimized (I, D, H)

High sequential read/write access to large datasets on local storage.

**I4i Family (Current Generation NVMe SSD):**

- **Use Cases:** High-frequency databases (SQL, NoSQL), real-time analytics, Elasticsearch
- **Storage:** Up to 30 TB local NVMe SSD
- **IOPS:** Up to 3.3 million random read IOPS (higher than I3en)
- **Processor:** Intel Xeon (Ice Lake)
- **Note:** Supersedes I3/I3en for new deployments; prefer I4i for peak IOPS requirements

**I3/I3en Family (Previous Generation):**

- **Use Cases:** NoSQL databases (Cassandra, MongoDB), data warehousing, Elasticsearch
- **Storage:** NVMe SSD instance store
- **IOPS:** Up to 3.3 million random read IOPS
- **Throughput:** Up to 16 GB/s sequential read
- **Sizes:** 1.9 TB to 60 TB local NVMe storage

**D3/D3en Family:**

- **Use Cases:** Distributed file systems, data processing, MapReduce
- **Storage:** HDD instance store
- **Capacity:** Up to 336 TB local HDD storage
- **Throughput:** Up to 6.2 GB/s sequential read
- **Cost:** Lowest cost per GB of storage


#### Accelerated Computing (P, G, F, Inf, Trn)

Hardware accelerators for ML, graphics, and high-performance computing.

**P4d Family (GPU - NVIDIA A100):**

- **Use Cases:** Machine learning training, HPC simulations
- **GPUs:** 8x NVIDIA A100 (40 GB each)
- **GPU Memory:** 320 GB total
- **Network:** 400 Gbps ENA, 4x 100 Gbps GPUDirect RDMA
- **Cost:** \$32.77/hour (on-demand)

**G5 Family (GPU - NVIDIA A10G):**

- **Use Cases:** Graphics workstations, game streaming, ML inference
- **GPUs:** 1 to 8 NVIDIA A10G (24 GB each)
- **Cost:** Lower than P4 for inference workloads

**Inf1 Family (AWS Inferentia):**

- **Use Cases:** ML inference at scale
- **Accelerators:** AWS Inferentia chips
- **Performance:** 2.3x higher throughput than G4
- **Cost:** 70% lower cost than GPU instances

**Trn1 Family (AWS Trainium):**

- **Use Cases:** Deep learning training
- **Accelerators:** AWS Trainium chips
- **Performance:** Up to 50% cost savings vs P4d


#### Instance Type Selection Guide

| Workload | Recommended Family | Rationale |
| :-- | :-- | :-- |
| Web/App Servers | T3, M6i | Balanced resources, cost-effective |
| Microservices | T3, T4g | Burstable, low cost |
| Batch Processing | C6i, C7g | High CPU performance |
| In-Memory Cache | R6i, R6g | Large memory |
| Relational Databases | R6i, M6i | Memory + storage performance |
| NoSQL Databases | I3, I3en | High IOPS local storage |
| Data Warehousing | D3, I3en | Large storage capacity |
| Video Encoding | C6i, C6g | High CPU, cost-efficient |
| ML Training | P4d, Trn1 | GPUs or ML accelerators |
| ML Inference | G5, Inf1 | Cost-optimized for inference |
| SAP HANA | X2iedn, High Memory | Very large memory requirements |

### Amazon Machine Images (AMIs)

An AMI is a template containing the software configuration (OS, applications, settings) needed to launch an EC2 instance.

**AMI Components:**

1. **Root Volume Template:** OS and boot configuration
2. **Launch Permissions:** Who can use the AMI
3. **Block Device Mapping:** Volumes to attach at launch

**AMI Types:**

**1. AWS-Provided AMIs:**

- Amazon Linux 2023 (AL2023) - Recommended
- Amazon Linux 2 (AL2) - Previous generation
- Ubuntu, Red Hat Enterprise Linux (RHEL), Windows Server
- Optimized for EC2, pre-configured, regularly updated

**2. Marketplace AMIs:**

- Third-party software pre-installed
- Commercial software (SQL Server, WordPress, etc.)
- Pay for software usage plus EC2 costs

**3. Community AMIs:**

- Shared by AWS community
- Free, but no warranty
- Security and compliance responsibility on user

**4. Custom AMIs:**

- Your own images
- Pre-configured applications
- Golden images for consistent deployments

**AMI Lifecycle:**

```
1. Launch instance
2. Customize (install software, configure)
3. Create AMI from instance
4. Launch new instances from AMI
5. Share AMI (optional)
6. Copy AMI to other regions (optional)
7. Deregister AMI when no longer needed
```

**AMI Backing:**

**EBS-Backed AMIs:**

- Root device is EBS volume
- Can be stopped without data loss
- Faster boot times (typically <1 minute)
- Most common type

**Instance Store-Backed AMIs:**

- Root device is instance store volume
- Cannot be stopped (only terminated)
- Data lost on stop/terminate
- Slower boot times
- Less common, specific use cases


### Instance Lifecycle

Understanding the complete instance lifecycle is critical for proper management.

**Instance States:**

```
pending → running → stopping → stopped → terminated
                  ↓
                shutting-down → terminated
```

**Detailed States:**

1. **Pending:** Instance is launching
    - Billed: No
    - Can connect: No
2. **Running:** Instance is operational
    - Billed: Yes (per second)
    - Can connect: Yes
    - Operations: Stop, reboot, terminate
3. **Stopping:** Instance is shutting down
    - Billed: Brief period
    - Can connect: No
4. **Stopped:** Instance is stopped
    - Billed: No (only EBS volumes)
    - Can connect: No
    - Operations: Start, terminate, modify
5. **Shutting-down:** Instance is terminating
    - Billed: No
    - Can connect: No
6. **Terminated:** Instance is deleted
    - Billed: No
    - Cannot be restarted
    - EBS volumes can be preserved if configured

**Important Behaviors:**

**Stop vs Terminate:**

- **Stop:** Instance can be restarted, keeps EBS volumes, data persists
- **Terminate:** Instance deleted, instance store data lost, EBS volumes deleted (unless configured otherwise)

**Instance Store Data:**

- Lost on: Stop, terminate, hardware failure
- Persists on: Reboot

**EBS Volume Data:**

- Persists through: Stop, reboot
- Configurable on terminate: `DeleteOnTermination` flag

**Public IP Changes:**

- Public IP changes when instance stopped/started
- Elastic IP persists through stop/start
- Private IP persists unless instance terminated


### Instance Pricing Models

EC2 offers multiple pricing models to optimize costs.

#### On-Demand Instances

**Characteristics:**

- Pay per second (Linux) or per hour (Windows)
- No commitment
- No upfront payment
- Highest hourly cost

**Use Cases:**

- Development and testing
- Unpredictable workloads
- Short-term, spiky workloads
- Applications being tested for first time

**Pricing Example:**

```
m6i.xlarge (4 vCPUs, 16 GiB RAM)
Cost: $0.192/hour = $140.16/month (730 hours)
```


#### Reserved Instances (RIs)

**Characteristics:**

- 1-year or 3-year commitment
- Up to 75% discount vs On-Demand
- Payment options: All Upfront, Partial Upfront, No Upfront
- Region or AZ specific

**Types:**

**1. Standard Reserved Instances:**

- Highest discount (up to 75%)
- Cannot change instance family
- Can change: AZ, instance size (within same family), network type

**2. Convertible Reserved Instances:**

- Lower discount (up to 54%)
- Can change instance family, OS, tenancy
- More flexibility

**Regional vs Zonal RIs:**

- **Regional:** Applies to any AZ in region, provides capacity priority
- **Zonal:** Specific AZ, provides capacity reservation

**Pricing Example:**

```
m6i.xlarge - 3 year, All Upfront
On-Demand: $140.16/month × 36 months = $5,045.76
Reserved (Standard): $2,500 upfront = $69.44/month
Savings: 50%
```


#### Savings Plans

**Characteristics:**

- Commitment to consistent usage (\$/hour) for 1 or 3 years
- Up to 72% discount
- More flexible than Reserved Instances

**Types:**

**1. Compute Savings Plans:**

- Most flexible
- Applies to: EC2, Lambda, Fargate
- Any instance family, size, OS, tenancy, region
- Up to 66% discount

**2. EC2 Instance Savings Plans:**

- Less flexible than Compute
- Specific instance family in specific region
- Can change: size, OS, tenancy
- Up to 72% discount

**Comparison:**


| Feature | Reserved Instances | Savings Plans |
| :-- | :-- | :-- |
| Commitment | Specific instance type | Usage amount (\$/hour) |
| Discount | Up to 75% | Up to 72% |
| Flexibility | Limited | High |
| Coverage | EC2 only | EC2, Lambda, Fargate |
| Applies to | Specific instance configuration | Automatically applies |

**Recommendation:** Savings Plans for most workloads due to flexibility.

#### Spot Instances

**Characteristics:**

- Use spare EC2 capacity
- Up to 90% discount vs On-Demand
- Can be interrupted with 2-minute warning
- Price fluctuates based on supply/demand

**Use Cases:**

- Fault-tolerant workloads
- Batch processing
- Big data analytics
- CI/CD pipelines
- Stateless web servers

**Not Suitable For:**

- Databases
- Stateful applications without proper architecture
- Jobs that cannot be interrupted

**Spot Instance Pricing:**

```
m6i.xlarge On-Demand: $0.192/hour
m6i.xlarge Spot (average): $0.058/hour
Savings: 70%
```

**Interruption Handling:**

AWS provides 2-minute warning via:

1. EC2 instance metadata
2. CloudWatch Events
3. EventBridge

**Best Practices:**

- Use Spot Fleet for mixed instance types
- Implement checkpointing in applications
- Use Spot Instance interruption notices
- Combine with On-Demand for baseline capacity


#### Dedicated Hosts \& Dedicated Instances

**Dedicated Hosts:**

- Physical server fully dedicated to your use
- Visibility into physical cores, sockets
- Use existing server-bound software licenses (Windows Server, SQL Server, SUSE Linux)
- Per-host billing
- Most expensive option

**Dedicated Instances:**

- Instances run on hardware dedicated to single customer
- May share hardware with other instances in same account
- Per-instance billing
- No control over physical server placement

**Comparison:**


| Feature | Dedicated Host | Dedicated Instance | Default (Shared) |
| :-- | :-- | :-- | :-- |
| Hardware | Fully dedicated physical server | Dedicated, but AWS-managed | Shared multi-tenant |
| Visibility | Sockets, cores, host ID | None | None |
| License | BYOL supported | Limited | No BYOL |
| Cost | Highest | High | Lowest |
| Use Case | Compliance, licensing | Compliance | Most workloads |

### Placement Groups

Control instance placement for performance or reliability.

**Types:**

**1. Cluster Placement Group:**

- Instances placed close together in single AZ
- **Benefit:** Lowest latency (10 Gbps+ network)
- **Use Cases:** HPC, tightly coupled applications, big data
- **Limitation:** Limited to single AZ
- **Failure Impact:** Single rack failure affects all

**2. Partition Placement Group:**

- Instances spread across logical partitions
- Each partition on separate racks with independent network/power
- **Benefit:** Reduces correlated failures
- **Use Cases:** Distributed databases (Cassandra, Kafka), HDFS
- **Partitions:** Up to 7 per AZ
- **Max Instances:** Hundreds per group

**3. Spread Placement Group:**

- Each instance on distinct hardware
- **Benefit:** Maximum availability
- **Use Cases:** Critical applications, small clusters
- **Limitation:** Max 7 instances per AZ per group
- **Isolation:** Each instance on different rack

**Placement Strategy Selection:**


| Requirement | Placement Group |
| :-- | :-- |
| Lowest latency | Cluster |
| Distributed database | Partition |
| Critical single instances | Spread |
| No specific requirement | None (default) |

### Enhanced Networking

Provides higher bandwidth, higher packet per second (PPS) performance, and lower latency.

**Types:**

**1. Elastic Network Adapter (ENA):**

- **Bandwidth:** Up to 100 Gbps
- **Instances:** Most current generation (m5, c5, r5, etc.)
- **Enabled:** By default on Amazon Linux AMI
- **Cost:** No additional charge

**2. Intel 82599 VF (Legacy):**

- **Bandwidth:** Up to 10 Gbps
- **Instances:** Older generation (c3, r3, etc.)
- **Status:** Being phased out

**Benefits:**

- Lower latency
- Lower jitter
- Higher PPS
- Better network throughput

**Enabling Enhanced Networking:**

```bash
# Check if enhanced networking is enabled
aws ec2 describe-instances \
    --instance-ids i-1234567890abcdef0 \
    --query 'Reservations[].Instances[].EnaSupport'

# Enable enhanced networking on AMI
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --ena-support
```


### Elastic IP Addresses

Static IPv4 addresses for dynamic cloud computing.

**Characteristics:**

- **Persistence:** Remains associated with AWS account
- **Remapping:** Can be remapped between instances
- **Availability:** Maintains during instance stop/start
- **Limit:** 5 per region (soft limit)
- **Cost:** Free when associated with running instance, \$0.005/hour when unassociated

**Use Cases:**

- Failover between instances
- Whitelisting in firewalls
- DNS pointing to specific IP
- Recovering from instance failures

**Best Practices:**

- Use Elastic Load Balancer instead when possible
- Release unused Elastic IPs to avoid charges
- Use for specific use cases, not routine deployments


### Instance Metadata and User Data

**Instance Metadata:**
Access instance information from within the instance.

**Endpoint:** http://169.254.169.254/latest/meta-data/

**Available Information:**

- AMI ID
- Instance ID
- Instance type
- Public/private IP addresses
- Security groups
- IAM role credentials
- User data

**Example:**

```bash
# Get instance ID
curl http://169.254.169.254/latest/meta-data/instance-id

# Get IAM role credentials
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name

# Get availability zone
curl http://169.254.169.254/latest/meta-data/placement/availability-zone
```

**User Data:**
Script executed at instance launch (only once on first boot).

**Use Cases:**

- Install software
- Configure settings
- Download application code
- Register with services

**Example:**

```bash
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html
```

**IMDSv2 (Instance Metadata Service Version 2):**
More secure version requiring session-oriented requests.

```bash
# Get token
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Use token
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id
```


### EC2 Storage Options

**1. EBS (Elastic Block Store):**

- Persistent block storage
- Attached to single instance
- Survives instance termination (if configured)
- Snapshotable

**2. Instance Store:**

- Temporary block storage
- Physically attached to host
- High I/O performance
- Data lost on stop/terminate/hardware failure

**3. EFS (Elastic File System):**

- Network file system (NFS)
- Shared across multiple instances
- Regional service (multi-AZ)

**4. FSx:**

- Managed file systems (Windows, Lustre, NetApp ONTAP, OpenZFS)

We'll cover storage in detail in Chapter 8.

## Hands-On Implementation

### Lab 1: Launching Your First EC2 Instance

**Objective:** Launch a web server using the AWS Console and CLI.

#### Using AWS Console

**Step 1: Navigate to EC2**

1. Sign in to AWS Console
2. Go to **Services** → **EC2**
3. Click **Launch Instance**

**Step 2: Configure Instance**

```
Name: WebServer-01
Application and OS Images (AMI): Amazon Linux 2023
Architecture: 64-bit (x86)
Instance type: t3.micro (1 vCPU, 1 GiB RAM)
Key pair: Create new or select existing
Network settings:
  VPC: Select your VPC
  Subnet: Public subnet
  Auto-assign public IP: Enable
  Security group: Create new
    - Allow SSH (22) from your IP
    - Allow HTTP (80) from anywhere (0.0.0.0/0)
Storage: 8 GiB gp3
Advanced details:
  User data: (paste script below)
```

**User Data Script:**

```bash
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
```

echo "<h1>Hello from \$(hostname -f)</h1>" > /var/www/html/index.html

```
```

**Step 3: Launch and Connect**

1. Click **Launch instance**
2. Wait for instance to reach **Running** state
3. Note the public IP address
4. Test: Open browser to `http://[PUBLIC_IP]`

#### Using AWS CLI

```bash
# Create key pair
aws ec2 create-key-pair \
    --key-name MyKeyPair \
    --query 'KeyMaterial' \
    --output text > MyKeyPair.pem

chmod 400 MyKeyPair.pem

# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name web-server-sg \
    --description "Security group for web server" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr $(curl -s http://checkip.amazonaws.com)/32

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Create user data file
cat > user-data.sh <<'EOF'
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
EC2_AVAIL_ZONE=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<h1>Hello from $EC2_AVAIL_ZONE</h1>" > /var/www/html/index.html
EOF

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $PUBLIC_SUBNET_ID \
    --associate-public-ip-address \
    --user-data file://user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer-CLI}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Public IP: $PUBLIC_IP"
echo "Access your web server: http://$PUBLIC_IP"

# SSH into instance
ssh -i MyKeyPair.pem ec2-user@$PUBLIC_IP
```


### Lab 2: Creating Custom AMIs

**Objective:** Create a reusable AMI from a configured instance.

**Step 1: Launch and Configure Instance**

```bash
# Launch base instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --query 'Instances[0].InstanceId' \
    --output text)

# Wait for running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get IP and connect
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

ssh -i MyKeyPair.pem ec2-user@$PUBLIC_IP
```

**Step 2: Customize Instance**

```bash
# On the instance
sudo yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install application dependencies
sudo yum install -y git nginx

# Configure Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create application directory
sudo mkdir -p /var/www/myapp
sudo chown -R ec2-user:ec2-user /var/www/myapp

# Install PM2 process manager
sudo npm install -g pm2

# Clean up for AMI creation
sudo yum clean all
rm -rf ~/.ssh/authorized_keys
history -c
```

**Step 3: Create AMI**

```bash
# From your local machine
# Stop instance (recommended for consistency)
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# Create AMI
AMI_ID=$(aws ec2 create-image \
    --instance-id $INSTANCE_ID \
    --name "MyApp-Baseline-$(date +%Y%m%d-%H%M%S)" \
    --description "Node.js application baseline with Nginx" \
    --tag-specifications 'ResourceType=image,Tags=[{Key=Name,Value=MyApp-Baseline},{Key=Version,Value=1.0}]' \
    --query 'ImageId' \
    --output text)

echo "AMI ID: $AMI_ID"

# Wait for AMI to be available
aws ec2 wait image-available --image-ids $AMI_ID
echo "AMI is ready!"
```

**Step 4: Launch from Custom AMI**

```bash
# Launch new instance from your AMI
NEW_INSTANCE=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyApp-Instance}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "New instance launched: $NEW_INSTANCE"
```

**Step 5: Copy AMI to Another Region**

```bash
# Copy to another region for disaster recovery
TARGET_REGION="eu-west-1"

COPIED_AMI=$(aws ec2 copy-image \
    --source-region us-east-1 \
    --source-image-id $AMI_ID \
    --name "MyApp-Baseline-$(date +%Y%m%d-%H%M%S)" \
    --description "MyApp baseline - DR copy" \
    --region $TARGET_REGION \
    --query 'ImageId' \
    --output text)

echo "Copied AMI ID in $TARGET_REGION: $COPIED_AMI"
```


### Lab 3: Implementing Auto Scaling

**Objective:** Create an Auto Scaling Group with load balancer for high availability.

**Architecture:**

```
Internet → ALB → Target Group → Auto Scaling Group (2-10 instances across 3 AZs)
```

**Step 1: Create Application Load Balancer**

```bash
# Create target group
TG_ARN=$(aws elbv2 create-target-group \
    --name myapp-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name myapp-alb \
    --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B $PUBLIC_SUBNET_1C \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=MyApp-ALB \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "Load Balancer DNS: $ALB_DNS"
```

**Step 2: Create Launch Template**

```bash
# Create user data for health check endpoint
cat > asg-user-data.sh <<'EOF'
#!/bin/bash
yum update -y
yum install -y httpd

# Configure web server
systemctl start httpd
systemctl enable httpd

# Create health check endpoint
cat > /var/www/html/health <<'HEALTHCHECK'
OK
HEALTHCHECK

# Create main page
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
cat > /var/www/html/index.html <<WEBPAGE
<html>
<head><title>Auto Scaling Demo</title></head>
<body>
<h1>Hello from Auto Scaling!</h1>
<p>Instance ID: $INSTANCE_ID</p>
<p>Availability Zone: $AZ</p>
<p>Server Time: $(date)</p>
</body>
</html>
WEBPAGE
EOF

# Create launch template
LAUNCH_TEMPLATE_ID=$(aws ec2 create-launch-template \
    --launch-template-name myapp-launch-template \
    --version-description "v1.0" \
    --launch-template-data '{
      "ImageId": "'$AMI_ID'",
      "InstanceType": "t3.micro",
      "KeyName": "MyKeyPair",
      "SecurityGroupIds": ["'$WEB_SG_ID'"],
      "IamInstanceProfile": {
        "Name": "EC2-SSM-Role"
      },
      "Monitoring": {
        "Enabled": true
      },
      "UserData": "'$(base64 -w 0 asg-user-data.sh)'",
      "TagSpecifications": [{
        "ResourceType": "instance",
        "Tags": [
          {"Key": "Name", "Value": "MyApp-ASG-Instance"},
          {"Key": "Environment", "Value": "Production"}
        ]
      }]
    }' \
    --query 'LaunchTemplate.LaunchTemplateId' \
    --output text)

echo "Launch Template ID: $LAUNCH_TEMPLATE_ID"
```

**Step 3: Create Auto Scaling Group**

```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --launch-template LaunchTemplateId=$LAUNCH_TEMPLATE_ID,Version='$Latest' \
    --min-size 2 \
    --max-size 10 \
    --desired-capacity 3 \
    --default-cooldown 300 \
    --health-check-type ELB \
    --health-check-grace-period 300 \
    --vpc-zone-identifier "$APP_SUBNET_1A,$APP_SUBNET_1B,$APP_SUBNET_1C" \
    --target-group-arns $TG_ARN \
    --tags "Key=Name,Value=MyApp-ASG-Instance,PropagateAtLaunch=true" \
           "Key=Environment,Value=Production,PropagateAtLaunch=true"

echo "Auto Scaling Group created"
```

**Step 4: Configure Scaling Policies**

```bash
# Target Tracking Scaling - CPU utilization
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name cpu-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "TargetValue": 50.0
    }'

# Target Tracking Scaling - ALB Request Count
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name alb-request-count-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ALBRequestCountPerTarget",
        "ResourceLabel": "'$(echo $ALB_ARN | cut -d: -f6)'/'$(echo $TG_ARN | cut -d: -f6)'"
      },
      "TargetValue": 1000.0
    }'

# Step Scaling Policy (for aggressive scaling)
SCALE_OUT_POLICY=$(aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name scale-out-policy \
    --policy-type StepScaling \
    --adjustment-type PercentChangeInCapacity \
    --metric-aggregation-type Average \
    --step-adjustments '[
      {
        "MetricIntervalLowerBound": 0,
        "MetricIntervalUpperBound": 10,
        "ScalingAdjustment": 10
      },
      {
        "MetricIntervalLowerBound": 10,
        "ScalingAdjustment": 30
      }
    ]' \
    --query 'PolicyARN' \
    --output text)

# Create CloudWatch alarm for step scaling
aws cloudwatch put-metric-alarm \
    --alarm-name myapp-high-cpu \
    --alarm-description "Scale out when CPU > 70%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 70 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=AutoScalingGroupName,Value=myapp-asg \
    --alarm-actions $SCALE_OUT_POLICY
```

**Step 5: Test Auto Scaling**

```bash
# Generate load to trigger scaling
# Connect to an instance and install stress tool
INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names myapp-asg \
    --query 'AutoScalingGroups[0].Instances[0].InstanceId' \
    --output text)

# Use Systems Manager Session Manager (no SSH needed)
aws ssm start-session --target $INSTANCE_ID

# On the instance
sudo yum install -y stress
stress --cpu 8 --timeout 600s

# Monitor scaling activity
aws autoscaling describe-scaling-activities \
    --auto-scaling-group-name myapp-asg \
    --max-records 10 \
    --query 'Activities[*].[StartTime,StatusCode,Description]' \
    --output table

# Watch instance count
watch -n 5 'aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names myapp-asg \
    --query "AutoScalingGroups[0].[DesiredCapacity,MinSize,MaxSize]"'
```


### Lab 4: Implementing Instance Scheduling

**Objective:** Automatically start/stop non-production instances to save costs.

```python
#!/usr/bin/env python3
# lambda_instance_scheduler.py

import boto3
import os
from datetime import datetime

ec2 = boto3.client('ec2')

def lambda_handler(event, context):
    """
    Start/Stop instances based on tags and schedule
    """
    
    action = os.environ.get('ACTION', 'stop')  # 'start' or 'stop'
    environment = os.environ.get('ENVIRONMENT', 'dev')  # 'dev', 'test', 'staging'
    
    # Find instances with scheduling tags
    filters = [
        {'Name': f'tag:Environment', 'Values': [environment]},
        {'Name': f'tag:AutoSchedule', 'Values': ['true']},
        {'Name': 'instance-state-name', 'Values': ['running' if action == 'stop' else 'stopped']}
    ]
    
    instances = ec2.describe_instances(Filters=filters)
    
    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])
    
    if not instance_ids:
        print(f"No instances found to {action}")
        return {'statusCode': 200, 'message': 'No instances to process'}
    
    # Perform action
    if action == 'stop':
        ec2.stop_instances(InstanceIds=instance_ids)
        print(f"Stopped instances: {instance_ids}")
    else:
        ec2.start_instances(InstanceIds=instance_ids)
        print(f"Started instances: {instance_ids}")
    
    return {
        'statusCode': 200,
        'action': action,
        'instances': instance_ids,
        'count': len(instance_ids)
    }
```

**Deploy Lambda Function:**

```bash
# Create IAM role for Lambda
cat > lambda-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name InstanceSchedulerRole \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach policies
aws iam attach-role-policy \
    --role-name InstanceSchedulerRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

cat > instance-scheduler-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:DescribeInstances",
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:DescribeRegions"
    ],
    "Resource": "*"
  }]
}
EOF

aws iam put-role-policy \
    --role-name InstanceSchedulerRole \
    --policy-name InstanceSchedulerPolicy \
    --policy-document file://instance-scheduler-policy.json

# Create deployment package
zip lambda_function.zip lambda_instance_scheduler.py

# Create Lambda function for stopping instances
LAMBDA_ARN=$(aws lambda create-function \
    --function-name StopDevInstances \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_instance_scheduler.lambda_handler \
    --zip-file fileb://lambda_function.zip \
    --timeout 60 \
    --environment Variables="{ACTION=stop,ENVIRONMENT=dev}" \
    --query 'FunctionArn' \
    --output text)

# Create Lambda function for starting instances
aws lambda create-function \
    --function-name StartDevInstances \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_instance_scheduler.lambda_handler \
    --zip-file fileb://lambda_function.zip \
    --timeout 60 \
    --environment Variables="{ACTION=start,ENVIRONMENT=dev}"

# Create EventBridge rules
# Stop instances at 7 PM (19:00) UTC Monday-Friday
aws events put-rule \
    --name stop-dev-instances-evening \
    --schedule-expression "cron(0 19 ? * MON-FRI *)" \
    --state ENABLED

aws events put-targets \
    --rule stop-dev-instances-evening \
    --targets "Id"="1","Arn"="$LAMBDA_ARN"

# Start instances at 7 AM (07:00) UTC Monday-Friday
aws events put-rule \
    --name start-dev-instances-morning \
    --schedule-expression "cron(0 7 ? * MON-FRI *)" \
    --state ENABLED

aws events put-targets \
    --rule start-dev-instances-morning \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:StartDevInstances"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
    --function-name StopDevInstances \
    --statement-id AllowEventBridgeInvoke \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:us-east-1:123456789012:rule/stop-dev-instances-evening
```

**Tag Instances for Scheduling:**

```bash
# Tag dev instances for auto-scheduling
aws ec2 create-tags \
    --resources i-1234567890abcdef0 i-0987654321fedcba0 \
    --tags Key=Environment,Value=dev \
           Key=AutoSchedule,Value=true
```


### Lab 5: Implementing CloudWatch Monitoring and Alarms

**Objective:** Set up comprehensive monitoring for EC2 instances.

```bash
# Enable detailed monitoring (1-minute intervals)
aws ec2 monitor-instances --instance-ids $INSTANCE_ID

# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name high-cpu-$INSTANCE_ID \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Create status check alarm
aws cloudwatch put-metric-alarm \
    --alarm-name status-check-failed-$INSTANCE_ID \
    --alarm-description "Alert when status checks fail" \
    --metric-name StatusCheckFailed \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-alerts \
                    arn:aws:automate:us-east-1:ec2:reboot

# Create disk utilization alarm (requires CloudWatch agent)
aws cloudwatch put-metric-alarm \
    --alarm-name high-disk-usage-$INSTANCE_ID \
    --alarm-description "Alert when disk usage exceeds 85%" \
    --metric-name disk_used_percent \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
                 Name=path,Value=/ \
                 Name=device,Value=xvda1 \
                 Name=fstype,Value=xfs \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Create memory utilization alarm (requires CloudWatch agent)
aws cloudwatch put-metric-alarm \
    --alarm-name high-memory-$INSTANCE_ID \
    --alarm-description "Alert when memory exceeds 80%" \
    --metric-name mem_used_percent \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

**Install CloudWatch Agent for Advanced Metrics:**

```bash
# On the instance
sudo yum install -y amazon-cloudwatch-agent

# Create CloudWatch agent configuration
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          },
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/system-logs",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/httpd/access_log",
            "log_group_name": "/aws/ec2/httpd/access",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

## Production-Level Knowledge

### Fleet Management at Scale

Managing hundreds or thousands of EC2 instances requires automation, standardization, and sophisticated tooling.

#### AWS Systems Manager for Fleet Management

Systems Manager provides unified interface for managing EC2 fleets without SSH access.

**Key Capabilities:**

**1. Session Manager (Secure Shell Access):**

```bash
# Connect without SSH keys or bastion hosts
aws ssm start-session --target i-1234567890abcdef0

# Port forwarding
aws ssm start-session \
    --target i-1234567890abcdef0 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["3306"],"localPortNumber":["3306"]}'
```

**2. Run Command (Execute Scripts at Scale):**

```bash
# Run command on multiple instances
aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --instance-ids i-1234567890abcdef0 i-0987654321fedcba0 \
    --parameters commands=["sudo yum update -y","sudo systemctl restart httpd"] \
    --comment "Update and restart web servers" \
    --timeout-seconds 600

# Run on instances by tag
aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --targets "Key=tag:Environment,Values=Production" \
    --parameters commands=["df -h","/opt/monitoring/check-health.sh"] \
    --max-concurrency "50%" \
    --max-errors "10%"
```

**3. Patch Manager (Automated Patching):**

```bash
# Create patch baseline
aws ssm create-patch-baseline \
    --name "ProductionLinuxBaseline" \
    --description "Patch baseline for production Linux instances" \
    --operating-system AMAZON_LINUX_2 \
    --approval-rules '{
      "PatchRules": [{
        "PatchFilterGroup": {
          "PatchFilters": [{
            "Key": "CLASSIFICATION",
            "Values": ["Security", "Bugfix"]
          }]
        },
        "ApproveAfterDays": 7,
        "ComplianceLevel": "CRITICAL"
      }]
    }'

# Create maintenance window
aws ssm create-maintenance-window \
    --name "ProductionPatchingWindow" \
    --schedule "cron(0 2 ? * SUN *)" \
    --duration 4 \
    --cutoff 1 \
    --allow-unassociated-targets

# Register targets
aws ssm register-target-with-maintenance-window \
    --window-id mw-0123456789abcdef0 \
    --target-type INSTANCE \
    --targets "Key=tag:PatchGroup,Values=Production"

# Register patch task
aws ssm register-task-with-maintenance-window \
    --window-id mw-0123456789abcdef0 \
    --task-type RUN_COMMAND \
    --task-arn "AWS-RunPatchBaseline" \
    --targets "Key=WindowTargetIds,Values=target-id" \
    --max-concurrency 25% \
    --max-errors 10% \
    --priority 1
```

**4. State Manager (Configuration Compliance):**

```bash
# Create association to ensure CloudWatch agent is running
aws ssm create-association \
    --name "AWS-ConfigureAWSPackage" \
    --targets "Key=tag:Environment,Values=Production" \
    --parameters '{
      "action": ["Install"],
      "name": ["AmazonCloudWatchAgent"],
      "version": ["latest"]
    }' \
    --schedule-expression "rate(30 days)"
```

**5. Inventory (Asset Management):**

```python
#!/usr/bin/env python3
# get_fleet_inventory.py

import boto3
import csv

ssm = boto3.client('ssm')

def get_fleet_inventory():
    """Get comprehensive inventory of EC2 fleet"""
    
    inventory_items = []
    
    # Get all instances with SSM agent
    response = ssm.describe_instance_information()
    
    for instance in response['InstanceInformationList']:
        instance_id = instance['InstanceId']
        
        # Get inventory data
        inventory = ssm.get_inventory_entries_for_instance(
            InstanceId=instance_id,
            TypeName='AWS:Application'
        )
        
        # Get installed applications
        apps = []
        for entry in inventory.get('Entries', []):
            apps.append({
                'name': entry.get('Name'),
                'version': entry.get('Version'),
                'publisher': entry.get('Publisher')
            })
        
        inventory_items.append({
            'instance_id': instance_id,
            'platform': instance.get('PlatformType'),
            'platform_version': instance.get('PlatformVersion'),
            'ip_address': instance.get('IPAddress'),
            'agent_version': instance.get('AgentVersion'),
            'applications': apps
        })
    
    return inventory_items

# Generate CSV report
inventory = get_fleet_inventory()
with open('fleet_inventory.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Instance ID', 'Platform', 'Version', 'IP Address', 'Agent Version', 'App Count'])
    
    for item in inventory:
        writer.writerow([
            item['instance_id'],
            item['platform'],
            item['platform_version'],
            item['ip_address'],
            item['agent_version'],
            len(item['applications'])
        ])

print(f"Inventory report generated: fleet_inventory.csv ({len(inventory)} instances)")
```


#### Infrastructure as Code for EC2

**CloudFormation Template for Production EC2:**

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production EC2 Instance with monitoring and backup'

Parameters:
  EnvironmentName:
    Type: String
    Default: Production
    AllowedValues: [Development, Staging, Production]
  
  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues: [t3.small, t3.medium, t3.large, m5.large, m5.xlarge]
  
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access
  
  LatestAmiId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2

Resources:
  # IAM Role for EC2
  EC2Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-EC2-Role'

  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2Role

  # Security Group
  InstanceSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub 'Security group for ${EnvironmentName} instance'
      VpcId: !ImportValue ProductionVPCId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS from internet
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: All outbound traffic
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Instance-SG'

  # EC2 Instance
  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: !Ref LatestAmiId
      KeyName: !Ref KeyName
      IamInstanceProfile: !Ref EC2InstanceProfile
      SecurityGroupIds:
        - !Ref InstanceSecurityGroup
      SubnetId: !ImportValue ProductionPrivateSubnet1
      Monitoring: true
      BlockDeviceMappings:
        - DeviceName: /dev/xvda
          Ebs:
            VolumeType: gp3
            VolumeSize: 30
            Encrypted: true
            DeleteOnTermination: true
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          
          # Install CloudWatch agent
          wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
          rpm -U ./amazon-cloudwatch-agent.rpm
          
          # Configure CloudWatch agent
          cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
          {
            "metrics": {
              "namespace": "${EnvironmentName}",
              "metrics_collected": {
                "mem": {
                  "measurement": [{"name": "mem_used_percent"}],
                  "metrics_collection_interval": 60
                },
                "disk": {
                  "measurement": [{"name": "used_percent"}],
                  "metrics_collection_interval": 60,
                  "resources": ["*"]
                }
              }
            }
          }
          EOF
          
          /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
            -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
          
          # Install application
          # Add your application installation here
          
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Instance'
        - Key: Environment
          Value: !Ref EnvironmentName
        - Key: Backup
          Value: Daily

  # CloudWatch Alarms
  CPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${EnvironmentName}-HighCPU'
      AlarmDescription: Alert when CPU exceeds 80%
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: InstanceId
          Value: !Ref EC2Instance
      AlarmActions:
        - !ImportValue AlertSNSTopic

  StatusCheckAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${EnvironmentName}-StatusCheckFailed'
      AlarmDescription: Alert when status checks fail
      MetricName: StatusCheckFailed
      Namespace: AWS/EC2
      Statistic: Maximum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: InstanceId
          Value: !Ref EC2Instance
      AlarmActions:
        - !ImportValue CriticalSNSTopic
        - !Sub 'arn:aws:automate:${AWS::Region}:ec2:recover'

  # Backup Plan
  BackupPlan:
    Type: AWS::Backup::BackupPlan
    Properties:
      BackupPlan:
        BackupPlanName: !Sub '${EnvironmentName}-DailyBackup'
        BackupPlanRule:
          - RuleName: DailyBackups
            TargetBackupVault: !Ref BackupVault
            ScheduleExpression: cron(0 5 ? * * *)
            StartWindowMinutes: 60
            CompletionWindowMinutes: 120
            Lifecycle:
              DeleteAfterDays: 30
              MoveToColdStorageAfterDays: 7

  BackupVault:
    Type: AWS::Backup::BackupVault
    Properties:
      BackupVaultName: !Sub '${EnvironmentName}-Vault'

  BackupSelection:
    Type: AWS::Backup::BackupSelection
    Properties:
      BackupPlanId: !Ref BackupPlan
      BackupSelection:
        SelectionName: !Sub '${EnvironmentName}-Selection'
        IamRoleArn: !Sub 'arn:aws:iam::${AWS::AccountId}:role/service-role/AWSBackupDefaultServiceRole'
        Resources:
          - !Sub 'arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:instance/${EC2Instance}'

Outputs:
  InstanceId:
    Description: Instance ID
    Value: !Ref EC2Instance
    Export:
      Name: !Sub '${EnvironmentName}-InstanceId'
  
  PrivateIP:
    Description: Private IP address
    Value: !GetAtt EC2Instance.PrivateIp
    Export:
      Name: !Sub '${EnvironmentName}-PrivateIP'
```


### Advanced Auto Scaling Patterns

#### Predictive Scaling

Use ML to forecast traffic and scale proactively:

```bash
# Enable predictive scaling
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name predictive-scaling-policy \
    --policy-type PredictiveScaling \
    --predictive-scaling-configuration '{
      "MetricSpecifications": [{
        "TargetValue": 50.0,
        "PredefinedMetricPairSpecification": {
          "PredefinedMetricType": "ASGCPUUtilization"
        }
      }],
      "Mode": "ForecastAndScale",
      "SchedulingBufferTime": 600
    }'
```


#### Mixed Instances Policy (Spot + On-Demand)

```yaml
# Launch Template configuration for mixed instances
AutoScalingGroup:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MixedInstancesPolicy:
      InstancesDistribution:
        OnDemandAllocationStrategy: prioritized
        OnDemandBaseCapacity: 2
        OnDemandPercentageAboveBaseCapacity: 30
        SpotAllocationStrategy: capacity-optimized
        SpotInstancePools: 3
      LaunchTemplate:
        LaunchTemplateSpecification:
          LaunchTemplateId: !Ref LaunchTemplate
          Version: !GetAtt LaunchTemplate.LatestVersionNumber
        Overrides:
          - InstanceType: t3.medium
            WeightedCapacity: 2
          - InstanceType: t3.large
            WeightedCapacity: 4
          - InstanceType: m5.large
            WeightedCapacity: 4
          - InstanceType: m5a.large
            WeightedCapacity: 4
    MinSize: 2
    MaxSize: 50
    DesiredCapacity: 10
```

**Benefits:**

- 70% of capacity from Spot (huge savings)
- 30% from On-Demand (baseline reliability)
- Multiple instance types (flexibility)
- Capacity-optimized allocation (fewer interruptions)


#### Lifecycle Hooks for Graceful Handling

```python
#!/usr/bin/env python3
# lifecycle_hook_handler.py

import boto3
import json

autoscaling = boto3.client('autoscaling')
sqs = boto3.client('sqs')

def lambda_handler(event, context):
    """
    Handle Auto Scaling lifecycle hooks
    Perform graceful shutdown or warmup tasks
    """
    
    # Parse SQS message
    for record in event['Records']:
        message = json.loads(record['body'])
        
        instance_id = message['EC2InstanceId']
        lifecycle_hook_name = message['LifecycleHookName']
        asg_name = message['AutoScalingGroupName']
        lifecycle_transition = message['LifecycleTransition']
        
        if lifecycle_transition == 'autoscaling:EC2_INSTANCE_TERMINATING':
            # Perform graceful shutdown
            print(f"Handling termination for {instance_id}")
            
            # Example: Deregister from service discovery
            # deregister_from_consul(instance_id)
            
            # Example: Drain connections
            # drain_connections(instance_id)
            
            # Wait for drain to complete
            import time
            time.sleep(30)
            
        elif lifecycle_transition == 'autoscaling:EC2_INSTANCE_LAUNCHING':
            # Perform warmup tasks
            print(f"Handling launch for {instance_id}")
            
            # Example: Wait for application to be ready
            # wait_for_application_ready(instance_id)
            
            # Example: Register with service discovery
            # register_with_consul(instance_id)
        
        # Complete lifecycle action
        autoscaling.complete_lifecycle_action(
            LifecycleHookName=lifecycle_hook_name,
            AutoScalingGroupName=asg_name,
            InstanceId=instance_id,
            LifecycleActionResult='CONTINUE'
        )
        
        print(f"Lifecycle action completed for {instance_id}")
    
    return {'statusCode': 200}
```

**Create Lifecycle Hooks:**

```bash
# Termination hook
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name graceful-shutdown \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
    --heartbeat-timeout 300 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks-queue

# Launch hook
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name warmup-tasks \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
    --heartbeat-timeout 600 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks-queue
```


### Disaster Recovery and High Availability

#### Cross-Region AMI Copy Automation

```python
#!/usr/bin/env python3
# ami_dr_replication.py

import boto3
from datetime import datetime

def replicate_ami_to_dr_region(source_region, target_region, ami_tag_key='Replicate', ami_tag_value='true'):
    """
    Automatically replicate AMIs to DR region
    """
    
    source_ec2 = boto3.client('ec2', region_name=source_region)
    target_ec2 = boto3.client('ec2', region_name=target_region)
    
    # Find AMIs to replicate
    response = source_ec2.describe_images(
        Owners=['self'],
        Filters=[
            {'Name': f'tag:{ami_tag_key}', 'Values': [ami_tag_value]}
        ]
    )
    
    for ami in response['Images']:
        ami_id = ami['ImageId']
        ami_name = ami['Name']
        
        # Check if already replicated
        existing = target_ec2.describe_images(
            Owners=['self'],
            Filters=[
                {'Name': 'name', 'Values': [ami_name]}
            ]
        )
        
        if existing['Images']:
            print(f"AMI {ami_name} already exists in {target_region}")
            continue
        
        # Copy AMI
        print(f"Copying {ami_id} ({ami_name}) to {target_region}")
        
        copy_response = target_ec2.copy_image(
            SourceRegion=source_region,
            SourceImageId=ami_id,
            Name=ami_name,
            Description=f"DR copy of {ami_id} - {datetime.now().isoformat()}"
        )
        
        new_ami_id = copy_response['ImageId']
        
        # Copy tags
        tags = ami.get('Tags', [])
        if tags:
            target_ec2.create_tags(
                Resources=[new_ami_id],
                Tags=tags
            )
        
        print(f"Created {new_ami_id} in {target_region}")
    
    return True

# Run replication
replicate_ami_to_dr_region('us-east-1', 'us-west-2')
```


#### Auto Recovery for Instance Failures

```bash
# Configure automatic recovery for instance failures
aws ec2 modify-instance-maintenance-options \
    --instance-id i-1234567890abcdef0 \
    --auto-recovery enabled

# Or use CloudWatch alarm for recovery
aws cloudwatch put-metric-alarm \
    --alarm-name auto-recover-instance \
    --alarm-description "Recover instance on system failure" \
    --metric-name StatusCheckFailed_System \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
    --alarm-actions arn:aws:automate:us-east-1:ec2:recover
```


### Cost Optimization Strategies

#### Reserved Instance Planning Tool

```python
#!/usr/bin/env python3
# ri_recommendation_tool.py

import boto3
from datetime import datetime, timedelta
from collections import defaultdict

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')
pricing = boto3.client('pricing', region_name='us-east-1')

def analyze_instance_usage(days=30):
    """
    Analyze instance usage to recommend Reserved Instances
    """
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get all running instances
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    usage_stats = defaultdict(lambda: {
        'count': 0,
        'avg_cpu': 0,
        'instances': []
    })
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_type = instance['InstanceType']
            az = instance['Placement']['AvailabilityZone']
            
            # Get CPU utilization
            cpu_stats = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,  # Daily
                Statistics=['Average']
            )
            
            avg_cpu = sum(d['Average'] for d in cpu_stats['Datapoints']) / len(cpu_stats['Datapoints']) if cpu_stats['Datapoints'] else 0
            
            usage_stats[instance_type]['count'] += 1
            usage_stats[instance_type]['avg_cpu'] += avg_cpu
            usage_stats[instance_type]['instances'].append(instance_id)
    
    # Calculate averages and recommendations
    recommendations = []
    
    for instance_type, stats in usage_stats.items():
        count = stats['count']
        avg_cpu = stats['avg_cpu'] / count if count > 0 else 0
        
        # Recommend RI for instances with >50% avg CPU and >2 instances
        if avg_cpu > 50 and count >= 2:
            # Get on-demand pricing
            on_demand_price = get_on_demand_price(instance_type)
            ri_price = get_ri_price(instance_type, '1yr', 'All Upfront')
            
            savings = (on_demand_price - ri_price) * count * 8760  # Annual savings
            
            recommendations.append({
                'instance_type': instance_type,
                'count': count,
                'avg_cpu': round(avg_cpu, 2),
                'on_demand_annual': round(on_demand_price * count * 8760, 2),
                'ri_annual': round(ri_price * count * 8760, 2),
                'annual_savings': round(savings, 2),
                'recommendation': f'Purchase {count}x {instance_type} RIs'
            })
    
    # Sort by savings
    recommendations.sort(key=lambda x: x['annual_savings'], reverse=True)
    
    return recommendations

def get_on_demand_price(instance_type, region='us-east-1'):
    """Get on-demand price for instance type"""
    # Simplified - in production, query AWS Pricing API
    prices = {
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        't3.large': 0.0832,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384
    }
    return prices.get(instance_type, 0.10)

def get_ri_price(instance_type, term='1yr', payment='All Upfront'):
    """Get RI price for instance type"""
    # Simplified - in production, query AWS Pricing API
    # Assuming ~40% discount for 1yr All Upfront
    on_demand = get_on_demand_price(instance_type)
    return on_demand * 0.6

# Generate recommendations
recommendations = analyze_instance_usage(days=30)

print("=" * 80)
print("RESERVED INSTANCE RECOMMENDATIONS")
print("=" * 80)
print("\nBased on 30 days of usage data:\n")

for rec in recommendations:
    print(f"Instance Type: {rec['instance_type']}")
    print(f"  Count: {rec['count']}")
    print(f"  Average CPU: {rec['avg_cpu']}%")
    print(f"  On-Demand Annual Cost: ${rec['on_demand_annual']:,.2f}")
    print(f"  Reserved Annual Cost: ${rec['ri_annual']:,.2f}")
    print(f"  Annual Savings: ${rec['annual_savings']:,.2f}")
    print(f"  Recommendation: {rec['recommendation']}")
    print()

total_savings = sum(rec['annual_savings'] for rec in recommendations)
print(f"Total Potential Annual Savings: ${total_savings:,.2f}")
```


#### Spot Instance Best Practices

```python
#!/usr/bin/env python3
# spot_fleet_manager.py

import boto3
import json

ec2 = boto3.client('ec2')

def create_spot_fleet_config(target_capacity=10):
    """
    Create Spot Fleet with diversified instance types
    """
    
    spot_fleet_config = {
        'IamFleetRole': 'arn:aws:iam::123456789012:role/aws-ec2-spot-fleet-tagging-role',
        'AllocationStrategy': 'capacity-optimized',
        'TargetCapacity': target_capacity,
        'SpotPrice': '0.10',  # Max price per hour
        'TerminateInstancesWithExpiration': True,
        'Type': 'maintain',
        'ReplaceUnhealthyInstances': True,
        'InstanceInterruptionBehavior': 'terminate',
        'LaunchSpecifications': [
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3.medium',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 2.0,
                'TagSpecifications': [{
                    'ResourceType': 'instance',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'SpotFleet-Instance'},
                        {'Key': 'SpotFleet', 'Value': 'true'}
                    ]
                }]
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3a.medium',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 2.0
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3.large',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 4.0
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 'm5.large',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 4.0
            }
        ]
    }
    
    response = ec2.request_spot_fleet(
        SpotFleetRequestConfig=spot_fleet_config
    )
    
    return response['SpotFleetRequestId']

def handle_spot_interruption():
    """
    Example of handling Spot instance interruption
    Run this on the instance via user data or systemd service
    """
    
    script = """#!/bin/bash
    
    # Monitor for interruption notice
    while true; do
        TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
        NOTICE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/spot/instance-action)
        
        if [ $? -eq 0 ]; then
            echo "Spot interruption notice received at $(date)"
            
            # Graceful shutdown
            # 1. Stop accepting new requests
            systemctl stop nginx
            
            # 2. Complete in-flight requests
            sleep 30
            
            # 3. Save state
            /opt/app/save-state.sh
            
            # 4. Deregister from load balancer (if not using target group)
            # aws elbv2 deregister-targets ...
            
            echo "Graceful shutdown complete"
            break
        fi
        
        sleep 5
    done
    """
    
    return script

# Create Spot Fleet
fleet_id = create_spot_fleet_config(target_capacity=20)
print(f"Spot Fleet created: {fleet_id}")
```


## Tips \& Best Practices

### Instance Type Selection Tips

**Tip 1: Start with Burstable Instances for Variable Workloads**

For workloads with variable CPU usage (web servers, dev environments):

- Use T3/T4g instances
- Monitor CPU credits
- Switch to M5 if consistently bursting

```bash
# Monitor CPU credit balance
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUCreditBalance \
    --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Average \
    --query 'Datapoints[*].[Timestamp,Average]' \
    --output table
```

**Tip 2: Use Graviton (ARM) Instances for Cost Savings**

Graviton2/3 instances (T4g, M6g, C6g, R6g) offer:

- Up to 40% better price-performance
- Lower power consumption
- Compatible with most Linux workloads

**Compatibility Check:**

```bash
# Test if your application works on ARM
docker run --platform linux/arm64 your-image:tag

# For compiled applications, recompile for ARM64
gcc -march=armv8-a your-app.c -o your-app
```

**Tip 3: Right-Size Regularly**

```python
#!/usr/bin/env python3
# right_sizing_analyzer.py

import boto3
from datetime import datetime, timedelta

def analyze_instance_utilization(instance_id, days=14):
    """
    Analyze instance utilization and suggest right-sizing
    """
    
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get instance details
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    instance_type = instance['InstanceType']
    
    # Get CPU utilization
    cpu_stats = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    if not cpu_stats['Datapoints']:
        return "Insufficient data"
    
    avg_cpu = sum(d['Average'] for d in cpu_stats['Datapoints']) / len(cpu_stats['Datapoints'])
    max_cpu = max(d['Maximum'] for d in cpu_stats['Datapoints'])
    
    # Recommendations
    if avg_cpu < 10 and max_cpu < 30:
        return f"DOWNSIZE: Average CPU {avg_cpu:.1f}%, Max {max_cpu:.1f}% - Consider smaller instance"
    elif avg_cpu > 60:
        return f"UPSIZE: Average CPU {avg_cpu:.1f}% - Consider larger instance"
    elif avg_cpu < 30 and max_cpu < 50:
        return f"BURSTABLE: Average CPU {avg_cpu:.1f}% - Consider T3 instance"
    else:
        return f"OPTIMAL: Average CPU {avg_cpu:.1f}%, Max {max_cpu:.1f}%"

# Example
print(analyze_instance_utilization('i-1234567890abcdef0'))
```


### AMI Management Tips

**Tip 4: Implement AMI Lifecycle Management**

```bash
# Create Lambda function to clean old AMIs
aws lambda create-function \
    --function-name AMI-Cleanup \
    --runtime python3.11 \
    --role arn:aws:iam::123456789012:role/LambdaAMICleanup \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://ami-cleanup.zip \
    --timeout 300 \
    --environment Variables="{RETENTION_DAYS=90}"

# Schedule monthly cleanup
aws events put-rule \
    --name monthly-ami-cleanup \
    --schedule-expression "cron(0 2 1 * ? *)"

aws events put-targets \
    --rule monthly-ami-cleanup \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:AMI-Cleanup"
```

**Tip 5: Version Your AMIs**

Use semantic versioning in AMI names:

```bash
# Good naming convention
MyApp-v1.2.3-20250115-prod
MyApp-v1.2.3-20250115-hotfix

# Tag with metadata
aws ec2 create-tags \
    --resources $AMI_ID \
    --tags Key=Version,Value=1.2.3 \
           Key=GitCommit,Value=abc123 \
           Key=BuildDate,Value=2025-01-15 \
           Key=Environment,Value=production
```

**Tip 6: Test AMIs Before Production**

```bash
# Launch test instance from new AMI
TEST_INSTANCE=$(aws ec2 run-instances \
    --image-id $NEW_AMI_ID \
    --instance-type t3.micro \
    --subnet-id $TEST_SUBNET \
    --security-group-ids $TEST_SG \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=AMI-Test},{Key=AutoTerminate,Value=true}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

# Run automated tests
aws ssm send-command \
    --instance-ids $TEST_INSTANCE \
    --document-name "AWS-RunShellScript" \
    --parameters commands=["
        /opt/tests/smoke-test.sh
        /opt/tests/integration-test.sh
    "] \
    --timeout-seconds 600

# If tests pass, promote to production
# If tests fail, investigate and fix
```


### Auto Scaling Tips

**Tip 7: Use Multiple Scaling Policies**

Combine different scaling strategies:

```bash
# Target tracking for baseline
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name target-tracking-cpu \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "TargetValue": 50.0
    }'

# Step scaling for aggressive scaling
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name step-scaling-high-load \
    --policy-type StepScaling \
    --adjustment-type PercentChangeInCapacity \
    --step-adjustments '[
      {"MetricIntervalLowerBound":0,"MetricIntervalUpperBound":20,"ScalingAdjustment":10},
      {"MetricIntervalLowerBound":20,"ScalingAdjustment":30}
    ]'

# Scheduled scaling for known patterns
aws autoscaling put-scheduled-action \
    --auto-scaling-group-name myapp-asg \
    --scheduled-action-name scale-up-morning \
    --recurrence "0 8 * * 1-5" \
    --min-size 10 \
    --desired-capacity 15
```

**Tip 8: Set Appropriate Cooldown Periods**

```bash
# Default cooldown (applies to simple scaling)
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --default-cooldown 300 \
    ...

# Target tracking cooldown (built-in)
# Step scaling cooldown (specified per alarm)
```

**Tip 9: Use Termination Policies Strategically**

```bash
aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --termination-policies \
        OldestLaunchTemplate \
        OldestInstance

# Available termination policies:
# - OldestInstance: Terminate oldest instance
# - NewestInstance: Terminate newest instance
# - OldestLaunchConfiguration/OldestLaunchTemplate: Oldest config
# - ClosestToNextInstanceHour: Minimize billing
# - Default: Balanced across AZs, then oldest launch config
# - AllocationStrategy: For Spot instances
```


### Security Tips

**Tip 10: Never Store Credentials in AMIs**

```bash
# Bad - credentials in AMI
echo "API_KEY=secret123" >> /etc/environment

# Good - use Parameter Store or Secrets Manager
aws ssm get-parameter \
    --name /myapp/api-key \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
```

**Tip 11: Use IMDSv2 for Enhanced Security**

```bash
# Require IMDSv2 on new instances
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1"

# Update existing instance
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1
```

**Tip 12: Encrypt EBS Volumes by Default**

```bash
# Enable EBS encryption by default
aws ec2 enable-ebs-encryption-by-default

# Verify
aws ec2 get-ebs-encryption-by-default

# Encrypt existing volumes
aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Snapshot for encryption"

aws ec2 copy-snapshot \
    --source-snapshot-id snap-1234567890abcdef0 \
    --encrypted \
    --kms-key-id alias/aws/ebs

aws ec2 create-volume \
    --snapshot-id snap-encrypted123 \
    --availability-zone us-east-1a
```


### Monitoring Tips

**Tip 13: Enable Detailed Monitoring for Production**

```bash
# Enable at launch
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --monitoring Enabled=true

# Enable for existing instance
aws ec2 monitor-instances \
    --instance-ids i-1234567890abcdef0

# Benefit: 1-minute intervals instead of 5-minute
```

**Tip 14: Create Custom CloudWatch Dashboards**

```python
#!/usr/bin/env python3
# create_ec2_dashboard.py

import boto3
import json

cloudwatch = boto3.client('cloudwatch')

def create_comprehensive_dashboard(instance_ids):
    """Create comprehensive dashboard for EC2 instances"""
    
    widgets = []
    
    # CPU utilization widget
    cpu_metrics = []
    for instance_id in instance_ids:
        cpu_metrics.append([
            "AWS/EC2", "CPUUtilization",
            {"stat": "Average", "label": instance_id},
            {"dimensions": {"InstanceId": instance_id}}
        ])
    
    widgets.append({
        "type": "metric",
        "properties": {
            "metrics": cpu_metrics,
            "period": 300,
            "stat": "Average",
            "region": "us-east-1",
            "title": "CPU Utilization",
            "yAxis": {"left": {"min": 0, "max": 100}}
        }
    })
    
    # Network traffic widget
    network_metrics = []
    for instance_id in instance_ids:
        network_metrics.extend([
            ["AWS/EC2", "NetworkIn", {"stat": "Sum", "label": f"{instance_id}-In"}],
            [".", "NetworkOut", {"stat": "Sum", "label": f"{instance_id}-Out"}]
        ])
    
    widgets.append({
        "type": "metric",
        "properties": {
            "metrics": network_metrics,
            "period": 300,
            "stat": "Sum",
            "region": "us-east-1",
            "title": "Network Traffic",
            "yAxis": {"left": {"label": "Bytes"}}
        }
    })
    
    dashboard_body = {"widgets": widgets}
    
    cloudwatch.put_dashboard(
        DashboardName='EC2-Production-Dashboard',
        DashboardBody=json.dumps(dashboard_body)
    )

# Example
create_comprehensive_dashboard(['i-123', 'i-456', 'i-789'])
```

**Tip 15: Set Up Status Check Alarms with Auto-Recovery**

```bash
# System status check (AWS infrastructure issues)
aws cloudwatch put-metric-alarm \
    --alarm-name system-status-check-$INSTANCE_ID \
    --metric-name StatusCheckFailed_System \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:automate:us-east-1:ec2:recover

# Instance status check (guest OS or network issues)
aws cloudwatch put-metric-alarm \
    --alarm-name instance-status-check-$INSTANCE_ID \
    --metric-name StatusCheckFailed_Instance \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:automate:us-east-1:ec2:reboot
```


### Cost Optimization Tips

**Tip 16: Use Savings Plans Over Reserved Instances**

For most workloads, Compute Savings Plans offer better flexibility:

```bash
# Calculate commitment needed
# Based on steady-state usage (not peak)
aws ce get-savings-plans-purchase-recommendation \
    --savings-plan-type COMPUTE_SP \
    --term-in-years ONE_YEAR \
    --payment-option ALL_UPFRONT \
    --lookback-period-in-days SIXTY_DAYS

# Purchase Savings Plan
aws savingsplans create-savings-plan \
    --savings-plan-type COMPUTE_SP \
    --commitment 100 \
    --upfront-payment 876 \
    --purchase-time 2025-01-15T00:00:00Z
```

**Tip 17: Leverage Spot Instances for Fault-Tolerant Workloads**

```bash
# Check Spot price history
aws ec2 describe-spot-price-history \
    --instance-types t3.medium m5.large \
    --product-descriptions "Linux/UNIX" \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --query 'SpotPriceHistory[*].[Timestamp,InstanceType,SpotPrice]' \
    --output table

# Request Spot with max price
aws ec2 request-spot-instances \
    --spot-price "0.05" \
    --instance-count 5 \
    --type "persistent" \
    --launch-specification file://spot-spec.json
```

**Tip 18: Implement Instance Scheduling**

Save up to 70% on non-production instances:

```
Running 24/7: $140/month
Running business hours only (12 hours/day, 5 days/week): $42/month
Savings: $98/month per instance
```

**Tip 19: Delete Unused Resources**

```bash
# Find stopped instances (still incurring EBS costs)
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=stopped" \
    --query 'Reservations[*].Instances[*].[InstanceId,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
    --output table

# Find unattached EBS volumes
aws ec2 describe-volumes \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
    --output table

# Find unused Elastic IPs
aws ec2 describe-addresses \
    --filters "Name=association-id,Values=''" \
    --query 'Addresses[*].[PublicIp,AllocationId]' \
    --output table
```

**Tip 20: Use AWS Compute Optimizer**

```bash
# Get recommendations for instances
aws compute-optimizer get-ec2-instance-recommendations \
    --instance-arns arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0 \
    --output json | jq '.instanceRecommendations[] | {
      current: .currentInstanceType,
      recommended: .recommendationOptions[0].instanceType,
      savingsPercent: .recommendationOptions[0].savingsOpportunity.savingsOpportunityPercentage
    }'
```


## Pitfalls \& Remedies

### Pitfall 1: Selecting Wrong Instance Type for Workload

**Problem:** Choosing instance types based on familiarity rather than workload requirements, leading to over-provisioning or under-provisioning.

**Why It Happens:**

- Defaulting to "safe" choices (e.g., always using m5.large)
- Not understanding workload characteristics
- Copying instance types from other projects
- Not testing different options

**Impact:**

- Wasted money on over-provisioned resources
- Poor performance from under-provisioned resources
- Inability to scale effectively
- High latency for end users

**Example:**

```
Scenario: Machine learning inference application
Wrong Choice: m5.xlarge ($140/month)
  - General purpose instance
  - CPU-based inference (slow)
  - No GPU acceleration

Right Choice: g4dn.xlarge ($390/month) or inf1.xlarge ($210/month)
  - GPU/Inferentia acceleration
  - 10x faster inference
  - Better cost per inference
```

**Remedy:**

**Step 1: Profile Your Workload**

```bash
# Install monitoring tools on instance
sudo yum install -y sysstat htop iotop

# Monitor CPU usage
mpstat 1 60

# Monitor memory
free -h && vmstat 1 60

# Monitor disk I/O
iostat -x 1 60

# Monitor network
sar -n DEV 1 60

# Application-level profiling
# For Python
python -m cProfile -o output.prof your_app.py

# For Java
java -Xprof -jar your_app.jar
```

**Step 2: Match Instance Family to Workload**

```python
#!/usr/bin/env python3
# workload_instance_matcher.py

def recommend_instance_family(workload_profile):
    """
    Recommend instance family based on workload characteristics
    """
    
    cpu_intensive = workload_profile.get('cpu_usage', 0) > 70
    memory_intensive = workload_profile.get('memory_usage', 0) > 70
    disk_io_intensive = workload_profile.get('disk_iops', 0) > 5000
    network_intensive = workload_profile.get('network_throughput', 0) > 5  # Gbps
    gpu_required = workload_profile.get('requires_gpu', False)
    
    recommendations = []
    
    if gpu_required:
        if workload_profile.get('workload_type') == 'ml_training':
            recommendations.append('P4d (NVIDIA A100) for ML training')
        elif workload_profile.get('workload_type') == 'ml_inference':
            recommendations.append('Inf1 (AWS Inferentia) for cost-effective inference')
            recommendations.append('G5 (NVIDIA A10G) for GPU inference')
        else:
            recommendations.append('G4dn (NVIDIA T4) for graphics/gaming')
    
    elif cpu_intensive and not memory_intensive:
        recommendations.append('C6i/C6g (Compute Optimized) for CPU-bound workloads')
        if workload_profile.get('supports_arm'):
            recommendations.append('C7g (Graviton3) for 20% better price-performance')
    
    elif memory_intensive:
        if workload_profile.get('memory_gb', 0) > 512:
            recommendations.append('X2iedn/High Memory for very large memory (>512 GB)')
        else:
            recommendations.append('R6i/R6g (Memory Optimized) for memory-intensive workloads')
    
    elif disk_io_intensive:
        recommendations.append('I3/I3en (Storage Optimized) with NVMe SSD')
        recommendations.append('I4i for highest IOPS (up to 3.3M IOPS)')
    
    elif network_intensive:
        recommendations.append('C5n (Compute with 100 Gbps networking)')
        recommendations.append('Consider Elastic Fabric Adapter (EFA) for HPC')
    
    else:
        # Balanced workload
        variable_cpu = workload_profile.get('cpu_variability', 0) > 50
        if variable_cpu:
            recommendations.append('T3/T4g (Burstable) for variable workloads')
        else:
            recommendations.append('M6i/M6g (General Purpose) for balanced workloads')
    
    return recommendations

# Example usage
workload = {
    'cpu_usage': 45,
    'memory_usage': 30,
    'disk_iops': 1000,
    'network_throughput': 1,
    'cpu_variability': 60,
    'requires_gpu': False,
    'supports_arm': True
}

recommendations = recommend_instance_family(workload)
print("Recommended Instance Families:")
for rec in recommendations:
    print(f"  - {rec}")
```

**Step 3: Use AWS Compute Optimizer**

```bash
# Enable Compute Optimizer
aws compute-optimizer update-enrollment-status \
    --status Active

# Wait 24 hours for data collection

# Get recommendations
aws compute-optimizer get-ec2-instance-recommendations \
    --query 'instanceRecommendations[*].{
      Current: currentInstanceType,
      Recommended: recommendationOptions[0].instanceType,
      Reason: findingReasonCodes[0],
      SavingsPercent: recommendationOptions[0].savingsOpportunity.savingsOpportunityPercentage,
      InstanceId: instanceArn
    }' \
    --output table
```

**Step 4: Test Multiple Instance Types**

```bash
# Create test instances of different types
for type in t3.medium m5.large c5.large r5.large; do
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $type \
        --subnet-id $SUBNET_ID \
        --security-group-ids $SG_ID \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=Test-$type},{Key=TestGroup,Value=InstanceTypeTest}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "Launched $type: $INSTANCE_ID"
done

# Run load tests on each
# Compare performance and cost
# Select optimal type
```

**Prevention:**

- Always profile workloads before selecting instance types
- Use Compute Optimizer recommendations
- Test multiple instance types during development
- Review and adjust instance types quarterly
- Document instance type selection rationale

***

### Pitfall 2: Not Implementing Graceful Shutdown

**Problem:** Applications terminated abruptly without completing in-flight requests or saving state, leading to data loss or inconsistent state.

**Why It Happens:**

- Not handling termination signals
- Assuming instances will run forever
- No graceful shutdown logic in application
- Not using Auto Scaling lifecycle hooks

**Impact:**

- Lost transactions
- Corrupted data
- Poor user experience
- Difficult troubleshooting

**Remedy:**

**Step 1: Handle Termination Signals**

```python
#!/usr/bin/env python3
# graceful_shutdown_example.py

import signal
import sys
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GracefulShutdownHandler:
    def __init__(self):
        self.shutdown_requested = False
        self.active_requests = 0
        
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.request_shutdown)
        signal.signal(signal.SIGINT, self.request_shutdown)
    
    def request_shutdown(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown")
        self.shutdown_requested = True
        
        # Stop accepting new requests
        self.stop_accepting_requests()
        
        # Wait for active requests to complete
        while self.active_requests > 0:
            logger.info(f"Waiting for {self.active_requests} active requests to complete")
            time.sleep(1)
        
        # Perform cleanup
        self.cleanup()
        
        logger.info("Graceful shutdown complete")
        sys.exit(0)
    
    def stop_accepting_requests(self):
        """Stop accepting new requests"""
        # Remove from load balancer
        # Close listening sockets
        # Mark as draining
        logger.info("Stopped accepting new requests")
    
    def cleanup(self):
        """Perform cleanup tasks"""
        # Save state
        # Close database connections
        # Flush caches
        # Send final metrics
        logger.info("Cleanup complete")

# Usage in your application
shutdown_handler = GracefulShutdownHandler()

def handle_request():
    shutdown_handler.active_requests += 1
    try:
        # Process request
        pass
    finally:
        shutdown_handler.active_requests -= 1
```

**Step 2: Implement Systemd Service for Proper Shutdown**

```bash
# Create systemd service file
sudo tee /etc/systemd/system/myapp.service <<'EOF'
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecStop=/opt/myapp/stop.sh
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=90
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create stop script
sudo tee /opt/myapp/stop.sh <<'EOF'
#!/bin/bash
# Graceful shutdown script

echo "$(date): Starting graceful shutdown"

# 1. Stop accepting new requests
curl -X POST http://localhost:8080/admin/drain

# 2. Wait for in-flight requests (max 60 seconds)
for i in {1..60}; do
    ACTIVE=$(curl -s http://localhost:8080/admin/active-requests)
    if [ "$ACTIVE" -eq 0 ]; then
        echo "All requests completed"
        break
    fi
    echo "Waiting for $ACTIVE active requests..."
    sleep 1
done

# 3. Save state
/opt/myapp/save-state.sh

# 4. Stop application
kill -TERM $(cat /var/run/myapp.pid)

echo "$(date): Graceful shutdown complete"
EOF

chmod +x /opt/myapp/stop.sh

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```

**Step 3: Use Auto Scaling Lifecycle Hooks**

```bash
# Create lifecycle hook for termination
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name graceful-termination \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
    --heartbeat-timeout 120 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks

# Lambda function to handle lifecycle hook
cat > lifecycle_handler.py <<'EOF'
import boto3
import json
import time

ec2 = boto3.client('ec2')
asg = boto3.client('autoscaling')
ssm = boto3.client('ssm')

def lambda_handler(event, context):
    for record in event['Records']:
        message = json.loads(record['body'])
        
        instance_id = message['EC2InstanceId']
        lifecycle_hook_name = message['LifecycleHookName']
        asg_name = message['AutoScalingGroupName']
        
        print(f"Handling graceful shutdown for {instance_id}")
        
        # Send shutdown command via SSM
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName='AWS-RunShellScript',
            Parameters={
                'commands': [
                    '/opt/myapp/graceful-shutdown.sh'
                ]
            }
        )
        
        command_id = response['Command']['CommandId']
        
        # Wait for command to complete (max 2 minutes)
        for i in range(24):  # 24 * 5 = 120 seconds
            result = ssm.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id
            )
            
            if result['Status'] in ['Success', 'Failed']:
                break
            
            time.sleep(5)
        
        # Complete lifecycle action
        asg.complete_lifecycle_action(
            LifecycleHookName=lifecycle_hook_name,
            AutoScalingGroupName=asg_name,
            InstanceId=instance_id,
            LifecycleActionResult='CONTINUE'
        )
        
        print(f"Lifecycle action completed for {instance_id}")
EOF
```

**Step 4: Test Graceful Shutdown**

```bash
# Test shutdown manually
sudo systemctl stop myapp

# Check logs
journalctl -u myapp -n 50

# Test with Auto Scaling
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 2  # Reduce from 3

# Monitor lifecycle hook
aws autoscaling describe-scaling-activities \
    --auto-scaling-group-name myapp-asg \
    --max-records 5
```

**Prevention:**

- Always implement graceful shutdown from day one
- Test shutdown procedures regularly
- Monitor shutdown times and adjust timeouts
- Use lifecycle hooks for Auto Scaling Groups
- Document shutdown procedures

***

### Pitfall 3: Improper Use of User Data

**Problem:** User data scripts failing silently, running on every boot instead of once, or containing sensitive information in plain text.

**Why It Happens:**

- No error handling in user data scripts
- Misunderstanding user data execution (runs only on first boot)
- Embedding secrets directly in user data
- No logging or debugging mechanisms

**Impact:**

- Instances not properly configured
- Security vulnerabilities from exposed secrets
- Difficult troubleshooting
- Inconsistent instance state

**Remedy:**

**Step 1: Proper User Data Script Structure**

```bash
#!/bin/bash -ex
# -e: Exit on error
# -x: Print commands as they execute (for debugging)

# Redirect output to log file
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "$(date): Starting user data script"

# Function for error handling
error_exit() {
    echo "$(date): ERROR: $1" >&2
    exit 1
}

# Update system
yum update -y || error_exit "Failed to update system"

# Install dependencies
yum install -y \
    httpd \
    python3 \
    git \
    || error_exit "Failed to install dependencies"

# Download application
cd /opt
git clone https://github.com/myorg/myapp.git || error_exit "Failed to clone repository"

# Get secrets from Parameter Store (not hardcoded!)
DB_PASSWORD=$(aws ssm get-parameter \
    --name /myapp/db-password \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text) || error_exit "Failed to get DB password"

# Configure application
cat > /opt/myapp/config.json <<CONFIG
{
  "database": {
    "host": "db.example.com",
    "username": "app_user",
    "password": "$DB_PASSWORD"
  }
}
CONFIG

# Set permissions
chown -R myapp:myapp /opt/myapp
chmod 600 /opt/myapp/config.json

# Start application
systemctl start myapp || error_exit "Failed to start application"
systemctl enable myapp

# Signal completion (for CloudFormation)
# cfn-signal -e $? --stack ${AWS::StackName} --resource MyInstance --region ${AWS::Region}

echo "$(date): User data script completed successfully"
```

**Step 2: Use cloud-init for More Control**

```yaml
#cloud-config
# More robust than bash scripts for multi-cloud compatibility

repo_update: true
repo_upgrade: all

packages:
  - httpd
  - python3
  - git

write_files:
  - path: /etc/myapp/config.yml
    permissions: '0644'
    content: |
      server:
        port: 8080
        host: 0.0.0.0

runcmd:
  - systemctl start httpd
  - systemctl enable httpd
  - cd /opt && git clone https://github.com/myorg/myapp.git
  - /opt/myapp/setup.sh

final_message: "System initialized in $UPTIME seconds"
```

**Step 3: Never Embed Secrets in User Data**

```bash
# BAD - Never do this
#!/bin/bash
DB_PASSWORD="mySecretPassword123"
API_KEY="sk-1234567890abcdef"

# GOOD - Use Parameter Store
#!/bin/bash
DB_PASSWORD=$(aws ssm get-parameter \
    --name /myapp/db-password \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text)

API_KEY=$(aws secretsmanager get-secret-value \
    --secret-id myapp/api-key \
    --query 'SecretString' \
    --output text)
```

**Step 4: Debug User Data Failures**

```bash
# SSH into instance and check logs
ssh -i mykey.pem ec2-user@instance-ip

# Check user data log
sudo cat /var/log/cloud-init-output.log
sudo cat /var/log/user-data.log

# Check cloud-init status
sudo cloud-init status --long

# Re-run user data manually for testing
sudo bash -x /var/lib/cloud/instance/user-data.txt
```

**Step 5: Use Systems Manager Run Command Instead**

For complex configuration:

```bash
# Instead of user data, use Run Command after launch
aws ssm send-command \
    --instance-ids i-1234567890abcdef0 \
    --document-name "AWS-RunShellScript" \
    --parameters commands=["
        cd /opt
        git clone https://github.com/myorg/myapp.git
        /opt/myapp/setup.sh
    "] \
    --comment "Configure application" \
    --timeout-seconds 600 \
    --cloud-watch-output-config '{
      "CloudWatchLogGroupName": "/aws/ssm/run-command",
      "CloudWatchOutputEnabled": true
    }'
```

**Prevention:**

- Use configuration management tools (Ansible, Chef, Puppet) for complex setups
- Never embed secrets in user data
- Always log user data execution
- Test user data scripts before deployment
- Use cloud-init for cross-platform compatibility
- Consider using AWS Systems Manager for post-launch configuration

***

### Pitfall 4: Not Monitoring and Rightsizing Instances

**Problem:** Running instances at wrong sizes indefinitely, wasting money on over-provisioned resources or suffering performance issues from under-provisioned instances.

**Why It Happens:**

- "Set it and forget it" mentality
- No regular review process
- Lack of monitoring and alerting
- Fear of impacting production
- Not understanding current resource usage

**Impact:**

- Wasted budget on over-provisioned instances (30-50% waste common)
- Poor application performance from under-sized instances
- Failed capacity planning
- Budget overruns

**Example:**

```
Running Instance: m5.2xlarge (8 vCPUs, 32 GiB RAM)
Cost: $280/month

Actual Usage:
- CPU: 15% average
- Memory: 8 GB used (25%)
- Network: Minimal

Right Size: t3.large (2 vCPUs, 8 GiB RAM)
Cost: $60/month
Savings: $220/month (78%)

Annual Savings per instance: $2,640
```

**Remedy:**

**Step 1: Implement Continuous Monitoring**

```python
#!/usr/bin/env python3
# continuous_rightsizing_monitor.py

import boto3
from datetime import datetime, timedelta
import json

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')
ce = boto3.client('ce')

def analyze_instance_utilization(instance_id, days=30):
    """
    Comprehensive utilization analysis
    """
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get instance details
    instance = ec2.describe_instances(InstanceIds=[instance_id])
    instance_data = instance['Reservations'][0]['Instances'][0]
    instance_type = instance_data['InstanceType']
    instance_name = next((tag['Value'] for tag in instance_data.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
    
    # Get CPU metrics
    cpu_metrics = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,  # 1 hour
        Statistics=['Average', 'Maximum', 'Minimum']
    )
    
    # Get memory metrics (requires CloudWatch agent)
    memory_metrics = cloudwatch.get_metric_statistics(
        Namespace='CWAgent',
        MetricName='mem_used_percent',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    # Get network metrics
    network_in = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='NetworkIn',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Sum']
    )
    
    # Calculate averages
    cpu_datapoints = cpu_metrics['Datapoints']
    memory_datapoints = memory_metrics['Datapoints']
    network_datapoints = network_in['Datapoints']
    
    if not cpu_datapoints:
        return None
    
    avg_cpu = sum(d['Average'] for d in cpu_datapoints) / len(cpu_datapoints)
    max_cpu = max(d['Maximum'] for d in cpu_datapoints)
    min_cpu = min(d['Minimum'] for d in cpu_datapoints)
    
    avg_memory = 0
    max_memory = 0
    if memory_datapoints:
        avg_memory = sum(d['Average'] for d in memory_datapoints) / len(memory_datapoints)
        max_memory = max(d['Maximum'] for d in memory_datapoints)
    
    avg_network_gb = sum(d['Sum'] for d in network_datapoints) / len(network_datapoints) / (1024**3) if network_datapoints else 0
    
    # Get current cost
    current_cost = get_instance_monthly_cost(instance_type)
    
    # Generate recommendation
    recommendation = generate_rightsizing_recommendation(
        instance_type, avg_cpu, max_cpu, avg_memory, max_memory
    )
    
    return {
        'instance_id': instance_id,
        'instance_name': instance_name,
        'instance_type': instance_type,
        'metrics': {
            'cpu_avg': round(avg_cpu, 2),
            'cpu_max': round(max_cpu, 2),
            'cpu_min': round(min_cpu, 2),
            'memory_avg': round(avg_memory, 2),
            'memory_max': round(max_memory, 2),
            'network_avg_gb': round(avg_network_gb, 2)
        },
        'current_monthly_cost': current_cost,
        'recommendation': recommendation
    }

def generate_rightsizing_recommendation(instance_type, avg_cpu, max_cpu, avg_memory, max_memory):
    """
    Generate rightsizing recommendation based on metrics
    """
    
    # Instance family mapping
    instance_families = {
        'general': ['t3', 't3a', 't4g', 'm5', 'm5a', 'm6i', 'm6g', 'm7g'],
        'compute': ['c5', 'c5a', 'c6i', 'c6g', 'c7g'],
        'memory': ['r5', 'r5a', 'r6i', 'r6g', 'r7g'],
        'burstable': ['t3', 't3a', 't4g']
    }
    
    # Parse current instance
    family = instance_type.split('.')[0]
    size = instance_type.split('.')[1]
    
    # Sizing logic
    if avg_cpu < 10 and max_cpu < 30:
        action = 'DOWNSIZE'
        reason = f'Very low CPU usage (avg: {avg_cpu:.1f}%, max: {max_cpu:.1f}%)'
        
        # Suggest smaller size
        size_order = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge', '8xlarge']
        current_idx = size_order.index(size) if size in size_order else 0
        
        if current_idx > 0:
            suggested_size = size_order[current_idx - 1]
            suggested_type = f"{family}.{suggested_size}"
            estimated_savings = calculate_savings(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'estimated_monthly_savings': estimated_savings
            }
    
    elif avg_cpu < 20 and max_cpu < 40 and avg_memory < 30:
        action = 'SWITCH_TO_BURSTABLE'
        reason = f'Low consistent usage (CPU avg: {avg_cpu:.1f}%, mem avg: {avg_memory:.1f}%)'
        
        if family not in instance_families['burstable']:
            # Map to equivalent T3 size
            size_map = {
                'large': 'large',
                'xlarge': 'xlarge',
                '2xlarge': '2xlarge'
            }
            t3_size = size_map.get(size, 'large')
            suggested_type = f"t3.{t3_size}"
            estimated_savings = calculate_savings(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'estimated_monthly_savings': estimated_savings
            }
    
    elif avg_cpu > 70 or max_cpu > 90:
        action = 'UPSIZE'
        reason = f'High CPU usage (avg: {avg_cpu:.1f}%, max: {max_cpu:.1f}%)'
        
        # Suggest larger size
        size_order = ['micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge', '8xlarge', '16xlarge']
        current_idx = size_order.index(size) if size in size_order else 0
        
        if current_idx < len(size_order) - 1:
            suggested_size = size_order[current_idx + 1]
            suggested_type = f"{family}.{suggested_size}"
            additional_cost = calculate_additional_cost(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'additional_monthly_cost': additional_cost
            }
    
    elif avg_memory > 70 and family not in instance_families['memory']:
        action = 'SWITCH_TO_MEMORY_OPTIMIZED'
        reason = f'High memory usage (avg: {avg_memory:.1f}%, max: {max_memory:.1f}%)'
        
        suggested_type = f"r6i.{size}"
        cost_difference = calculate_cost_difference(instance_type, suggested_type)
        
        return {
            'action': action,
            'reason': reason,
            'suggested_type': suggested_type,
            'monthly_cost_difference': cost_difference
        }
    
    else:
        return {
            'action': 'OPTIMAL',
            'reason': 'Instance appears to be properly sized',
            'suggested_type': instance_type,
            'estimated_monthly_savings': 0
        }

def get_instance_monthly_cost(instance_type):
    """Get estimated monthly cost for instance type"""
    # Simplified pricing - in production, use AWS Price List API
    pricing = {
        't3.micro': 7.59, 't3.small': 15.18, 't3.medium': 30.37, 't3.large': 60.74,
        't3.xlarge': 121.47, 't3.2xlarge': 242.94,
        'm5.large': 70.08, 'm5.xlarge': 140.16, 'm5.2xlarge': 280.32,
        'm5.4xlarge': 560.64, 'm5.8xlarge': 1121.28,
        'c5.large': 62.05, 'c5.xlarge': 124.10, 'c5.2xlarge': 248.20,
        'r5.large': 91.98, 'r5.xlarge': 183.96, 'r5.2xlarge': 367.92
    }
    return pricing.get(instance_type, 100.0)

def calculate_savings(current_type, suggested_type):
    """Calculate monthly savings"""
    return get_instance_monthly_cost(current_type) - get_instance_monthly_cost(suggested_type)

def calculate_additional_cost(current_type, suggested_type):
    """Calculate additional monthly cost"""
    return get_instance_monthly_cost(suggested_type) - get_instance_monthly_cost(current_type)

def calculate_cost_difference(current_type, suggested_type):
    """Calculate cost difference (positive = more expensive)"""
    return get_instance_monthly_cost(suggested_type) - get_instance_monthly_cost(current_type)

# Main execution
def generate_rightsizing_report():
    """Generate comprehensive rightsizing report for all instances"""
    
    # Get all running instances
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    recommendations = []
    total_potential_savings = 0
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            
            print(f"Analyzing {instance_id}...")
            
            analysis = analyze_instance_utilization(instance_id, days=30)
            
            if analysis and analysis['recommendation']['action'] != 'OPTIMAL':
                recommendations.append(analysis)
                
                if 'estimated_monthly_savings' in analysis['recommendation']:
                    total_potential_savings += analysis['recommendation']['estimated_monthly_savings']
    
    # Generate report
    print("\n" + "=" * 80)
    print("EC2 RIGHTSIZING RECOMMENDATIONS")
    print("=" * 80)
    
    if not recommendations:
        print("\n✓ All instances are optimally sized!")
    else:
        print(f"\nFound {len(recommendations)} instances that can be optimized:\n")
        
        for rec in recommendations:
            print(f"Instance: {rec['instance_name']} ({rec['instance_id']})")
            print(f"  Current Type: {rec['instance_type']} (${rec['current_monthly_cost']:.2f}/month)")
            print(f"  CPU Usage: Avg {rec['metrics']['cpu_avg']}%, Max {rec['metrics']['cpu_max']}%")
            print(f"  Memory Usage: Avg {rec['metrics']['memory_avg']}%, Max {rec['metrics']['memory_max']}%")
            print(f"  Action: {rec['recommendation']['action']}")
            print(f"  Reason: {rec['recommendation']['reason']}")
            print(f"  Suggested: {rec['recommendation']['suggested_type']}")
            
            if 'estimated_monthly_savings' in rec['recommendation']:
                print(f"  Monthly Savings: ${rec['recommendation']['estimated_monthly_savings']:.2f}")
            
            print()
    
    print(f"Total Potential Monthly Savings: ${total_potential_savings:.2f}")
    print(f"Total Potential Annual Savings: ${total_potential_savings * 12:.2f}")
    
    return recommendations

# Run the report
recommendations = generate_rightsizing_report()
```

**Step 2: Automate Rightsizing**

```python
#!/usr/bin/env python3
# automated_rightsizing.py

import boto3
import time

ec2 = boto3.client('ec2')

def resize_instance(instance_id, new_instance_type, dry_run=True):
    """
    Safely resize an EC2 instance
    """
    
    print(f"Resizing {instance_id} to {new_instance_type}")
    
    # Get current state
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    current_type = instance['InstanceType']
    current_state = instance['State']['Name']
    
    if current_state != 'running':
        print(f"Instance is not running (state: {current_state})")
        return False
    
    if dry_run:
        print(f"[DRY RUN] Would resize from {current_type} to {new_instance_type}")
        return True
    
    try:
        # Create AMI for rollback
        print("Creating AMI backup...")
        ami_response = ec2.create_image(
            InstanceId=instance_id,
            Name=f"backup-{instance_id}-{int(time.time())}",
            Description=f"Backup before resize from {current_type} to {new_instance_type}",
            NoReboot=True
        )
        backup_ami_id = ami_response['ImageId']
        print(f"Backup AMI created: {backup_ami_id}")
        
        # Stop instance
        print("Stopping instance...")
        ec2.stop_instances(InstanceIds=[instance_id])
        
        # Wait for stopped state
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        print("Instance stopped")
        
        # Modify instance type
        print(f"Changing instance type to {new_instance_type}...")
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            InstanceType={'Value': new_instance_type}
        )
        print("Instance type modified")
        
        # Start instance
        print("Starting instance...")
        ec2.start_instances(InstanceIds=[instance_id])
        
        # Wait for running state
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        print("Instance started")
        
        # Wait for status checks
        print("Waiting for status checks...")
        time.sleep(60)
        
        # Verify instance is healthy
        status = ec2.describe_instance_status(InstanceIds=[instance_id])
        
        if status['InstanceStatuses']:
            instance_status = status['InstanceStatuses'][0]['InstanceStatus']['Status']
            system_status = status['InstanceStatuses'][0]['SystemStatus']['Status']
            
            if instance_status == 'ok' and system_status == 'ok':
                print("✓ Resize successful! Instance is healthy.")
                
                # Tag backup AMI for cleanup
                ec2.create_tags(
                    Resources=[backup_ami_id],
                    Tags=[
                        {'Key': 'AutoCleanup', 'Value': 'true'},
                        {'Key': 'CleanupAfterDays', 'Value': '7'}
                    ]
                )
                
                return True
            else:
                print(f"⚠️ Status checks not passing: instance={instance_status}, system={system_status}")
                print("Rolling back...")
                rollback_resize(instance_id, current_type)
                return False
        
    except Exception as e:
        print(f"Error during resize: {e}")
        print("Rolling back...")
        rollback_resize(instance_id, current_type)
        return False

def rollback_resize(instance_id, original_type):
    """Rollback instance to original type"""
    
    print(f"Rolling back {instance_id} to {original_type}")
    
    try:
        # Stop if running
        ec2.stop_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        # Change back to original type
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            InstanceType={'Value': original_type}
        )
        
        # Start instance
        ec2.start_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        
        print("✓ Rollback complete")
        return True
        
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        return False

# Schedule automated rightsizing
def schedule_rightsizing(instance_id, new_type, schedule_time):
    """
    Schedule instance rightsizing using EventBridge
    """
    
    events = boto3.client('events')
    lambda_client = boto3.client('lambda')
    
    # Create EventBridge rule
    rule_name = f"resize-{instance_id}"
    
    events.put_rule(
        Name=rule_name,
        ScheduleExpression=schedule_time,  # e.g., "cron(0 2 * * ? *)"
        State='ENABLED',
        Description=f'Resize {instance_id} to {new_type}'
    )
    
    # Add target (Lambda function)
    events.put_targets(
        Rule=rule_name,
        Targets=[{
            'Id': '1',
            'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:EC2-Resizer',
            'Input': json.dumps({
                'instance_id': instance_id,
                'new_type': new_type
            })
        }]
    )
    
    print(f"Scheduled resize of {instance_id} to {new_type} at {schedule_time}")

# Example usage
# Test resize (dry run)
resize_instance('i-1234567890abcdef0', 't3.medium', dry_run=True)

# Actual resize
# resize_instance('i-1234567890abcdef0', 't3.medium', dry_run=False)
```

**Step 3: Implement Continuous Optimization**

```bash
# Create Lambda function for weekly rightsizing analysis
aws lambda create-function \
    --function-name EC2-Rightsizing-Analyzer \
    --runtime python3.11 \
    --role arn:aws:iam::123456789012:role/LambdaEC2Analyzer \
    --handler rightsizing_analyzer.lambda_handler \
    --zip-file fileb://analyzer.zip \
    --timeout 900 \
    --memory-size 512

# Schedule weekly execution
aws events put-rule \
    --name weekly-rightsizing-analysis \
    --schedule-expression "cron(0 9 ? * MON *)" \
    --state ENABLED

aws events put-targets \
    --rule weekly-rightsizing-analysis \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:EC2-Rightsizing-Analyzer"
```

**Prevention:**

- Enable AWS Compute Optimizer
- Schedule monthly rightsizing reviews
- Automate monitoring and alerting
- Use CloudWatch dashboards for fleet visibility
- Implement gradual rollout for changes
- Test in non-production first

***

### Pitfall 5: Not Implementing Proper Backup Strategy

**Problem:** No backups, inconsistent backups, or backups not tested for recovery, leading to data loss during disasters.

**Why It Happens:**

- Assuming AWS automatically backs up everything
- No clear backup requirements
- Manual backup processes that get skipped
- Cost concerns about backup storage
- No testing of backup restoration

**Impact:**

- Catastrophic data loss
- Extended downtime during recovery
- Regulatory compliance failures
- Unable to meet RPO/RTO requirements
- Business continuity failures

**Remedy:**

**Step 1: Implement AWS Backup**

```bash
# Create backup vault
aws backup create-backup-vault \
    --backup-vault-name Production-Vault

# Create backup plan
aws backup create-backup-plan \
    --backup-plan file://backup-plan.json

# backup-plan.json
cat > backup-plan.json <<'EOF'
{
  "BackupPlanName": "Production-Daily-Weekly-Monthly",
  "Rules": [
    {
      "RuleName": "DailyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 35,
        "MoveToColdStorageAfterDays": 7
      },
      "RecoveryPointTags": {
        "BackupType": "Daily",
        "Environment": "Production"
      }
    },
    {
      "RuleName": "WeeklyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * SUN *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 180,
      "Lifecycle": {
        "DeleteAfterDays": 90
      },
      "RecoveryPointTags": {
        "BackupType": "Weekly",
        "Environment": "Production"
      }
    },
    {
      "RuleName": "MonthlyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 1 * ? *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 240,
      "Lifecycle": {
        "DeleteAfterDays": 365
      },
      "RecoveryPointTags": {
        "BackupType": "Monthly",
        "Environment": "Production"
      }
    }
  ]
}
EOF

# Create backup selection
aws backup create-backup-selection \
    --backup-plan-id $BACKUP_PLAN_ID \
    --backup-selection file://backup-selection.json

# backup-selection.json
cat > backup-selection.json <<'EOF'
{
  "SelectionName": "Production-Instances",
  "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole",
  "Resources": [
    "arn:aws:ec2:*:*:instance/*"
  ],
  "ListOfTags": [
    {
      "ConditionType": "STRINGEQUALS",
      "ConditionKey": "Backup",
      "ConditionValue": "Daily"
    }
  ]
}
EOF

# Tag instances for backup
aws ec2 create-tags \
    --resources i-1234567890abcdef0 i-0987654321fedcba0 \
    --tags Key=Backup,Value=Daily
```

**Step 2: Implement Application-Consistent Backups**

```python
#!/usr/bin/env python3
# application_consistent_backup.py

import boto3
import time
import subprocess

ssm = boto3.client('ssm')
ec2 = boto3.client('ec2')

def create_application_consistent_backup(instance_id):
    """
    Create application-consistent backup using pre/post scripts
    """
    
    print(f"Creating application-consistent backup for {instance_id}")
    
    # Step 1: Run pre-backup script (flush caches, quiesce database)
    print("Running pre-backup tasks...")
    pre_backup_command = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                '# Flush application caches',
                'sudo systemctl stop myapp',
                'sleep 5',
                '',
                '# Flush database',
                'mysql -e "FLUSH TABLES WITH READ LOCK;"',
                'sleep 2',
                '',
                '# Sync filesystem',
                'sync'
            ]
        }
    )
    
    command_id = pre_backup_command['Command']['CommandId']
    
    # Wait for command completion
    waiter = ssm.get_waiter('command_executed')
    waiter.wait(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    # Step 2: Create snapshot
    print("Creating EBS snapshots...")
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    
    snapshot_ids = []
    for mapping in instance['BlockDeviceMappings']:
        volume_id = mapping['Ebs']['VolumeId']
        device_name = mapping['DeviceName']
        
        snapshot = ec2.create_snapshot(
            VolumeId=volume_id,
            Description=f'App-consistent backup of {instance_id} {device_name}',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{instance_id}-{device_name}-backup'},
                    {'Key': 'InstanceId', 'Value': instance_id},
                    {'Key': 'BackupType', 'Value': 'ApplicationConsistent'},
                    {'Key': 'BackupTime', 'Value': time.strftime('%Y-%m-%d-%H-%M-%S')}
                ]
            }]
        )
        
        snapshot_ids.append(snapshot['SnapshotId'])
        print(f"  Created snapshot {snapshot['SnapshotId']} for {volume_id}")
    
    # Step 3: Run post-backup script (unlock database, restart app)
    print("Running post-backup tasks...")
    post_backup_command = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                '# Unlock database',
                'mysql -e "UNLOCK TABLES;"',
                '',
                '# Restart application',
                'sudo systemctl start myapp',
                '',
                '# Verify application is healthy',
                'sleep 10',
                'curl -f http://localhost/health || exit 1'
            ]
        }
    )
    
    print(f"✓ Application-consistent backup completed. Snapshots: {snapshot_ids}")
    
    return snapshot_ids

def test_backup_restoration(snapshot_ids, test_subnet_id, test_sg_id):
    """
    Automatically test backup restoration
    """
    
    print("Testing backup restoration...")
    
    # Create volumes from snapshots
    volume_ids = []
    az = 'us-east-1a'  # Get from subnet
    
    for snapshot_id in snapshot_ids:
        volume = ec2.create_volume(
            SnapshotId=snapshot_id,
            AvailabilityZone=az,
            VolumeType='gp3',
            TagSpecifications=[{
                'ResourceType': 'volume',
                'Tags': [{'Key': 'Purpose', 'Value': 'BackupTest'}]
            }]
        )
        
        volume_ids.append(volume['VolumeId'])
    
    # Wait for volumes to be available
    waiter = ec2.get_waiter('volume_available')
    for volume_id in volume_ids:
        waiter.wait(VolumeIds=[volume_id])
    
    # Launch test instance
    print("Launching test instance...")
    test_instance = ec2.run_instances(
        ImageId='ami-dummy',  # Will be overridden by root volume
        InstanceType='t3.micro',
        MinCount=1,
        MaxCount=1,
        SubnetId=test_subnet_id,
        SecurityGroupIds=[test_sg_id],
        BlockDeviceMappings=[{
            'DeviceName': '/dev/xvda',
            'Ebs': {'VolumeId': volume_ids[0]}
        }],
        TagSpecifications=[{
            'ResourceType': 'instance',
            'Tags': [
                {'Key': 'Name', 'Value': 'Backup-Restore-Test'},
                {'Key': 'AutoTerminate', 'Value': 'true'}
            ]
        }]
    )
    
    test_instance_id = test_instance['Instances'][0]['InstanceId']
    
    # Wait for instance to start
    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[test_instance_id])
    
    # Run health check
    print("Running health checks on restored instance...")
    time.sleep(60)  # Wait for boot
    
    health_check = ssm.send_command(
        InstanceIds=[test_instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                'systemctl status myapp',
                'curl -f http://localhost/health',
                '/opt/tests/backup-validation.sh'
            ]
        }
    )
    
    # Check results
    time.sleep(30)
    result = ssm.get_command_invocation(
        CommandId=health_check['Command']['CommandId'],
        InstanceId=test_instance_id
    )
    
    success = result['Status'] == 'Success'
    
    # Cleanup
    print("Cleaning up test resources...")
    ec2.terminate_instances(InstanceIds=[test_instance_id])
    
    if success:
        print("✓ Backup restoration test PASSED")
    else:
        print("❌ Backup restoration test FAILED")
        print(f"Output: {result['StandardOutputContent']}")
        print(f"Error: {result['StandardErrorContent']}")
    
    return success

# Example usage
# snapshot_ids = create_application_consistent_backup('i-1234567890abcdef0')
# test_backup_restoration(snapshot_ids, 'subnet-12345', 'sg-12345')
```

**Step 3: Implement Cross-Region Backup Replication**

```bash
# Copy snapshots to DR region
aws backup create-backup-plan \
    --backup-plan file://cross-region-backup-plan.json

# cross-region-backup-plan.json
cat > cross-region-backup-plan.json <<'EOF'
{
  "BackupPlanName": "Cross-Region-DR-Backups",
  "Rules": [
    {
      "RuleName": "DailyWithDRCopy",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 35
      },
      "CopyActions": [
        {
          "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:DR-Vault",
          "Lifecycle": {
            "DeleteAfterDays": 35,
            "MoveToColdStorageAfterDays": 7
          }
        }
      ]
    }
  ]
}
EOF
```

**Step 4: Automated Backup Monitoring**

```python
#!/usr/bin/env python3
# backup_monitoring.py

import boto3
from datetime import datetime, timedelta

backup = boto3.client('backup')
cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

def check_backup_compliance():
    """
    Check if all instances have recent successful backups
    """
    
    ec2 = boto3.client('ec2')
    
    # Get instances that should have backups
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']},
            {'Name': 'tag:Backup', 'Values': ['Daily', 'true']}
        ]
    )
    
    non_compliant = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_name = next((tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
            
            # Check for recent backup
            recovery_points = backup.list_recovery_points_by_resource(
                ResourceArn=f"arn:aws:ec2:{ec2.meta.region_name}:{instance['OwnerId']}:instance/{instance_id}"
            )
            
            recent_backup = None
            cutoff_time = datetime.now() - timedelta(days=2)
            
            for rp in recovery_points.get('RecoveryPoints', []):
                if rp['Status'] == 'COMPLETED' and rp['CreationDate'] > cutoff_time:
                    recent_backup = rp
                    break
            
            if not recent_backup:
                non_compliant.append({
                    'instance_id': instance_id,
                    'instance_name': instance_name,
                    'issue': 'No successful backup in last 48 hours'
                })
    
    if non_compliant:
        message = "Backup Compliance Alert\n\n"
        message += f"Found {len(non_compliant)} instances without recent backups:\n\n"
        
        for item in non_compliant:
            message += f"- {item['instance_name']} ({item['instance_id']}): {item['issue']}\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:backup-alerts',
            Subject='❌ Backup Compliance Issues Detected',
            Message=message
        )
        
        print(f"⚠️  Found {len(non_compliant)} non-compliant instances")
    else:
        print("✓ All instances have recent successful backups")
    
    # Publish metric
    cloudwatch.put_metric_data(
        Namespace='Backup/Compliance',
        MetricData=[{
            'MetricName': 'NonCompliantInstances',
            'Value': len(non_compliant),
            'Unit': 'Count',
            'Timestamp': datetime.now()
        }]
    )
    
    return non_compliant

# Run compliance check
check_backup_compliance()
```

**Prevention:**

- Enable AWS Backup for all critical resources
- Tag resources for automated backup
- Test backup restoration monthly
- Monitor backup compliance daily
- Implement cross-region replication for DR
- Document RPO/RTO requirements
- Automate backup testing

***

### Pitfall 6: Ignoring Instance Metadata Security

**Problem:** Not securing Instance Metadata Service (IMDS), allowing attackers to steal IAM credentials if they gain access to the instance.

**Why It Happens:**

- Using default IMDSv1 (less secure)
- Not understanding IMDS security implications
- Legacy applications that don't support IMDSv2
- No security hardening process

**Impact:**

- IAM credential theft via SSRF attacks
- Privilege escalation
- Lateral movement in AWS environment
- Data exfiltration

**Attack Example:**

```bash
# Attacker exploits SSRF vulnerability in application
# Using IMDSv1 (no token required)
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/MyRole

# Returns temporary credentials
{
  "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "very-long-token",
  "Expiration": "2025-01-15T12:00:00Z"
}

# Attacker now has your IAM role credentials
```

**Remedy:**

**Step 1: Require IMDSv2 on All Instances**

```bash
# For new instances
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1,HttpEndpoint=enabled"

# For existing instances
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1

# Verify
aws ec2 describe-instances \
    --instance-ids i-1234567890abcdef0 \
    --query 'Reservations[0].Instances[0].MetadataOptions'
```

**Step 2: Update Applications for IMDSv2**

```python
# IMDSv1 (insecure)
import requests
response = requests.get('http://169.254.169.254/latest/meta-data/instance-id')

# IMDSv2 (secure - requires token)
import requests

# Get token
token_response = requests.put(
    'http://169.254.169.254/latest/api/token',
    headers={'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
)
token = token_response.text

# Use token for all requests
instance_id = requests.get(
    'http://169.254.169.254/latest/meta-data/instance-id',
    headers={'X-aws-ec2-metadata-token': token}
).text

# For boto3, it handles IMDSv2 automatically
import boto3
ec2_metadata = boto3.client('ec2-metadata')
```

**Step 3: Audit IMDS Configuration**

```python
#!/usr/bin/env python3
# audit_imds_security.py

import boto3

ec2 = boto3.client('ec2')

def audit_imds_configuration():
    """
    Audit all instances for IMDS security configuration
    """
    
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    vulnerable_instances = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_name = next((tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
            
            metadata_options = instance.get('MetadataOptions', {})
            http_tokens = metadata_options.get('HttpTokens', 'optional')
            hop_limit = metadata_options.get('HttpPutResponseHopLimit', 1)
            
            issues = []
            
            if http_tokens != 'required':
                issues.append('IMDSv1 enabled (HttpTokens=optional)')
            
            if hop_limit > 1:
                issues.append(f'Hop limit too high ({hop_limit}) - allows container access')
            
            if issues:
                vulnerable_instances.append({
                    'instance_id': instance_id,
                    'instance_name': instance_name,
                    'issues': issues
                })
    
    # Report
    print("=" * 80)
    print("IMDS SECURITY AUDIT")
    print("=" * 80)
    
    if not vulnerable_instances:
        print("\n✓ All instances have secure IMDS configuration")
    else:
        print(f"\n⚠️  Found {len(vulnerable_instances)} instances with IMDS security issues:\n")
        
        for item in vulnerable_instances:
            print(f"{item['instance_name']} ({item['instance_id']}):")
            for issue in item['issues']:
                print(f"  - {issue}")
            print()
    
    return vulnerable_instances

# Run audit
vulnerable = audit_imds_security()
```

**Step 4: Implement IMDS Firewall Rules**

```bash
# On the instance, restrict access to IMDS from containers
sudo iptables -A OUTPUT -d 169.254.169.254 -m owner --uid-owner 1000 -j DROP

# Allow only specific user (e.g., application user)
sudo iptables -A OUTPUT -d 169.254.169.254 -m owner --uid-owner appuser -j ACCEPT
sudo iptables -A OUTPUT -d 169.254.169.254 -j DROP
```

**Step 5: Monitor IMDS Access**

```python
#!/usr/bin/env python3
# monitor_imds_access.py

import subprocess
import time
from collections import defaultdict

def monitor_imds_access():
    """
    Monitor and log IMDS access attempts
    """
    
    access_log = defaultdict(int)
    
    while True:
        # Check network connections to IMDS
        result = subprocess.run(
            ['netstat', '-an'],
            capture_output=True,
            text=True
        )
        
        for line in result.stdout.split('\n'):
            if '169.254.169.254' in line:
                # Log IMDS access
                parts = line.split()
                if len(parts) >= 5:
                    local_addr = parts[3]
                    access_log[local_addr] += 1
                    
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] IMDS access from {local_addr}")
        
        time.sleep(5)

# Run monitoring (as a service)
# monitor_imds_access()
```

**Prevention:**

- Require IMDSv2 on all new instances
- Migrate existing instances to IMDSv2
- Regular security audits
- Update all AWS SDKs to latest versions
- Implement defense-in-depth (firewall rules)
- Monitor IMDS access

***

## Chapter Summary

Amazon EC2 is the cornerstone of AWS compute services, providing flexible, scalable virtual servers for virtually any workload. Success with EC2 requires deep understanding of instance types, pricing models, AMI management, Auto Scaling, and operational best practices.

**Key Takeaways:**

- **Choose instance types based on workload characteristics:** Profile your applications to match CPU, memory, storage, and network requirements to the appropriate instance family
- **Leverage multiple pricing models:** Use On-Demand for flexibility, Reserved Instances or Savings Plans for steady-state workloads, and Spot Instances for fault-tolerant applications to optimize costs
- **Automate with Auto Scaling:** Implement Auto Scaling Groups with appropriate scaling policies to handle variable load while maintaining availability
- **Master AMI management:** Create standardized AMIs for consistent deployments, version them properly, and implement lifecycle management
- **Implement comprehensive monitoring:** Use CloudWatch with custom metrics, set up meaningful alarms, and create dashboards for operational visibility
- **Prioritize security:** Use IMDSv2, implement proper IAM roles, encrypt volumes, and follow least privilege principles
- **Plan for disaster recovery:** Implement automated backups, test restoration procedures, and replicate critical data across regions
- **Right-size continuously:** Regularly analyze utilization and adjust instance types to optimize performance and cost

Understanding EC2 deeply enables you to build cost-effective, highly available, and performant applications in AWS. The compute foundation you've built here will support your entire cloud architecture.

In Chapter 5, we'll explore AWS Lambda and serverless computing, which complements EC2 by enabling event-driven, auto-scaling compute without managing servers.

## Hands-On Lab Exercise

**Objective:** Build a production-ready, auto-scaling web application with monitoring, backups, and cost optimization.

**Architecture:**

```
Internet → ALB → Auto Scaling Group (2-10 t3.medium instances)
          ↓
       CloudWatch Monitoring + Alarms
          ↓
       SNS Notifications
          ↓
    AWS Backup (Daily snapshots)
```

**Exercise Steps:**

1. **Create Custom AMI**
    - Launch base instance
    - Install and configure web application
    - Harden security settings
    - Create AMI with proper naming and tags
2. **Configure Auto Scaling**
    - Create Launch Template with user data
    - Create Auto Scaling Group (min: 2, max: 10, desired: 3)
    - Configure target tracking scaling (CPU @ 50%)
    - Set up lifecycle hooks for graceful shutdown
3. **Deploy Load Balancer**
    - Create Application Load Balancer
    - Configure target group with health checks
    - Set up listener rules
4. **Implement Monitoring**
    - Enable detailed monitoring
    - Install CloudWatch agent for custom metrics
    - Create dashboard with key metrics
    - Set up alarms for CPU, memory, disk, status checks
5. **Configure Backups**
    - Set up AWS Backup plan
    - Tag instances for automated backup
    - Test backup restoration
6. **Cost Optimization**
    - Analyze instance utilization
    - Generate rightsizing recommendations
    - Implement instance scheduling for non-prod
7. **Test and Validate**
    - Run load test to trigger scaling
    - Verify monitoring and alarms
    - Test graceful shutdown
    - Validate backup restoration

**Expected Outcomes:**

- Fully functional auto-scaling application
- Comprehensive monitoring and alerting
- Automated backup strategy
- Cost optimization plan

**Cleanup:**

```bash
# Delete Auto Scaling Group
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name myapp-asg --force-delete

# Delete Load Balancer
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Delete Launch Template
aws ec2 delete-launch-template --launch-template-id $TEMPLATE_ID

# Deregister AMI
aws ec2 deregister-image --image-id $AMI_ID
```


## Review Questions

1. **Which instance family is best for applications requiring high memory-to-CPU ratio?**
a) C5 (Compute Optimized)
b) M5 (General Purpose)
c) R5 (Memory Optimized)
d) T3 (Burstable)

**Answer: C** - R5 instances are memory-optimized with high memory-to-CPU ratios, ideal for in-memory databases and analytics.

2. **What is the primary difference between On-Demand and Spot instances?**
a) Spot instances are faster
b) Spot instances can be interrupted with 2-minute notice
c) On-Demand instances are regional
d) Spot instances have guaranteed capacity

**Answer: B** - Spot instances use spare capacity and can be interrupted with 2-minute warning when AWS needs the capacity back.

3. **Which pricing model offers the most flexibility?**
a) Reserved Instances
b) Savings Plans
c) Dedicated Hosts
d) On-Demand

**Answer: D** - On-Demand has no commitment and highest flexibility, though it's the most expensive.

4. **What happens to instance store data when an instance is stopped?**
a) Data persists
b) Data is lost
c) Data is moved to EBS
d) Data is archived to S3

**Answer: B** - Instance store data is ephemeral and lost when instance is stopped, terminated, or if underlying hardware fails.

5. **Which placement group type provides the lowest network latency?**
a) Spread
b) Partition
c) Cluster
d) Default

**Answer: C** - Cluster placement groups place instances close together in a single AZ for lowest latency and highest throughput.

6. **What is the benefit of using IMDSv2 over IMDSv1?**
a) Faster metadata retrieval
b) More metadata available
c) Protection against SSRF attacks
d) No difference

**Answer: C** - IMDSv2 requires session tokens, providing defense-in-depth protection against SSRF attacks.

7. **How often does EC2 user data run by default?**
a) Every boot
b) Only on first launch
c) When instance is stopped/started
d) Never automatically

**Answer: B** - User data runs only once on first launch by default (can be configured to run on every boot with cloud-init).

8. **Which Auto Scaling policy type is best for predictable traffic patterns?**
a) Target tracking
b) Step scaling
c) Scheduled scaling
d) Simple scaling

**Answer: C** - Scheduled scaling is ideal for known, predictable traffic patterns (e.g., scale up every morning).

9. **What is the maximum spot instance discount compared to On-Demand?**
a) 50%
b) 70%
c) 90%
d) 95%

**Answer: C** - Spot instances can provide up to 90% discount compared to On-Demand pricing.

10. **Which service provides automated patching for EC2 fleets?**
a) AWS Backup
b) AWS Systems Manager Patch Manager
c) CloudWatch
d) AWS Config

**Answer: B** - AWS Systems Manager Patch Manager provides automated patching with maintenance windows and compliance tracking.

11. **What is the benefit of using Savings Plans over Reserved Instances?**
a) Higher discount
b) More flexibility across instance families
c) No commitment required
d) Free cancellation

**Answer: B** - Compute Savings Plans provide flexibility across instance families, sizes, regions, and even Lambda/Fargate.

12. **Which metric is NOT available by default in CloudWatch for EC2?**
a) CPU Utilization
b) Network In/Out
c) Memory Utilization
d) Disk Read/Write Ops

**Answer: C** - Memory utilization requires CloudWatch agent installation as it's not visible to the hypervisor.

13. **What is the purpose of an EC2 launch template?**
a) Create AMIs
b) Define instance configuration for launching
c) Monitor instances
d) Backup instances

**Answer: B** - Launch templates define instance configuration (AMI, instance type, security groups, etc.) for consistent launches.

14. **Which statement about EBS-backed AMIs is TRUE?**
a) Cannot be stopped
b) Root volume is ephemeral
c) Can be stopped without data loss
d) Slower boot times than instance-store

**Answer: C** - EBS-backed instances can be stopped and started without losing data from EBS volumes.

15. **What is the recommended way to access EC2 instances without SSH keys?**
a) EC2 Instance Connect
b) AWS Systems Manager Session Manager
c) VNC
d) Remote Desktop

**Answer: B** - Systems Manager Session Manager provides secure, auditable access without managing SSH keys or bastion hosts.

***
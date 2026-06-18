# Appendices

# Appendix A: AWS Service Cheat Sheets

## Compute Services Quick Reference

### Amazon EC2 (Elastic Compute Cloud)

```
SERVICE OVERVIEW:
Virtual servers in the cloud
Pay for compute capacity by the hour/second
Full control over OS and configuration

INSTANCE FAMILIES:
T-Series (Burstable):
- t3.nano to t3.2xlarge
- Baseline CPU with burst credits
- Use case: Variable workloads
- Cost: $0.0052/hr (t3.micro)

M-Series (General Purpose):
- m5.large to m5.24xlarge
- Balanced compute, memory, network
- Use case: Web servers, applications
- Cost: $0.096/hr (m5.large)

C-Series (Compute Optimized):
- c5.large to c5.24xlarge
- High performance processors
- Use case: Batch processing, HPC
- Cost: $0.085/hr (c5.large)

R-Series (Memory Optimized):
- r5.large to r5.24xlarge
- Memory-intensive applications
- Use case: Databases, caches
- Cost: $0.126/hr (r5.large)

P-Series (GPU):
- p3.2xlarge to p3.16xlarge
- NVIDIA Tesla V100 GPUs
- Use case: ML training, rendering
- Cost: $3.06/hr (p3.2xlarge)

PRICING MODELS:

On-Demand:
- Pay by hour/second
- No commitment
- Most expensive
- Use: Unpredictable workloads

Reserved Instances:
- 1 or 3 year commitment
- Up to 72% discount
- Payment: All/Partial/No upfront
- Use: Steady-state workloads

Spot Instances:
- Bid on spare capacity
- Up to 90% discount
- Can be interrupted
- Use: Fault-tolerant workloads

Savings Plans:
- 1 or 3 year commitment
- Up to 72% discount
- Flexible across instance types
- Use: Variable but consistent usage

KEY LIMITS:
- Default: 20 instances per region
- Request increase: Up to 1000s
- Max EBS volumes per instance: 28
- Max network interfaces: Varies by type
- Max instance store: Varies by type

EXAM TIPS:
✓ Burstable (T) for variable workloads
✓ Reserved for 24/7 predictable
✓ Spot for batch/fault-tolerant
✓ Placement groups for HPC
✓ Enhanced networking for high throughput
```


### AWS Lambda

```
SERVICE OVERVIEW:
Serverless compute (no servers to manage)
Pay only for compute time consumed
Automatic scaling from zero to thousands

CONFIGURATION:

Memory: 128 MB to 10,240 MB (10 GB)
- CPU scales proportionally with memory
- More memory = faster execution (but higher cost)

Timeout: 1 second to 15 minutes (900 seconds)
- Default: 3 seconds
- Set based on function needs

Ephemeral Storage: 512 MB to 10,240 MB
- Temporary storage at /tmp
- Cleared between invocations

Concurrency:
- Default: 1000 concurrent executions per region
- Reserved concurrency: Guarantee for function
- Provisioned concurrency: Pre-warmed instances

INVOCATION TYPES:

Synchronous:
- Caller waits for response
- Use: API Gateway, ALB, direct invoke
- Retry: Client responsibility

Asynchronous:
- Lambda queues event and returns immediately
- Use: S3, SNS, EventBridge
- Retry: Automatic (2 retries)

Event Source Mapping:
- Lambda polls event source
- Use: SQS, Kinesis, DynamoDB Streams
- Batch processing

PRICING:
Requests: $0.20 per 1M requests
Compute: $0.0000166667 per GB-second
- 1GB memory, 1 second = $0.0000166667
- 128MB memory, 100ms = $0.0000002083

Free Tier (monthly):
- 1M free requests
- 400,000 GB-seconds compute

Example Cost:
1M invocations, 512MB, 200ms average:
Requests: $0.20
Compute: 1M × 0.5GB × 0.2s × $0.0000166667 = $1.67
Total: $1.87/month

KEY LIMITS:
- Deployment package: 50 MB (zipped), 250 MB (unzipped)
- Environment variables: 4 KB total
- Layers: 5 per function
- Concurrent executions: 1000 per region (soft limit)
- Invocation payload: 6 MB (sync), 256 KB (async)

EXAM TIPS:
✓ 15-minute max timeout
✓ Stateless (use S3/DynamoDB for state)
✓ Cold starts (provisioned concurrency solves)
✓ EventBridge for cron jobs
✓ DLQ for failed async invocations
```


### Amazon ECS (Elastic Container Service)

```
SERVICE OVERVIEW:
Managed container orchestration
Run Docker containers at scale
Two launch types: EC2 and Fargate

LAUNCH TYPES:

EC2 Launch Type:
- You manage EC2 instances
- More control, lower cost
- Responsible for scaling, patching
- Use: Cost optimization, custom requirements

Fargate Launch Type:
- AWS manages infrastructure
- Serverless containers
- Pay only for vCPU and memory
- Use: Operational simplicity

TASK DEFINITION:
Defines container configuration
- Docker image
- CPU/Memory requirements
- Port mappings
- Environment variables
- Logging configuration

Example:
{
  "family": "web-app",
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "web",
    "image": "nginx:latest",
    "portMappings": [{
      "containerPort": 80
    }]
  }]
}

SERVICES:
Maintains desired count of tasks
- Auto Scaling integration
- Load balancer integration
- Rolling deployments
- Service discovery

PRICING (Fargate):
vCPU: $0.04048 per vCPU per hour
Memory: $0.004445 per GB per hour

Example Task (0.25 vCPU, 0.5 GB):
Hourly: 0.25 × $0.04048 + 0.5 × $0.004445 = $0.0123
Monthly (24/7): $8.93

KEY LIMITS:
- Tasks per service: 10,000
- Services per cluster: 5,000
- Container instances per cluster: 5,000
- Task definition size: 64 KB

EXAM TIPS:
✓ Fargate for serverless containers
✓ EC2 for cost optimization at scale
✓ Service discovery with Cloud Map
✓ ECS Anywhere for on-premises
✓ Task roles for IAM permissions
```


## Storage Services Quick Reference

### Amazon S3 (Simple Storage Service)

```
SERVICE OVERVIEW:
Object storage service
11 nines durability (99.999999999%)
Unlimited storage capacity

STORAGE CLASSES:

S3 Standard:
- Availability: 99.99%
- Use: Frequently accessed data
- Retrieval: Instant
- Cost: $0.023/GB/month

S3 Intelligent-Tiering:
- Automatic cost optimization
- Monitors access patterns
- Moves between tiers automatically
- Cost: $0.023/GB + $0.0025/1000 objects

S3 Standard-IA (Infrequent Access):
- Availability: 99.9%
- Use: Long-lived, less frequent access
- Retrieval: Instant, retrieval fee applies
- Cost: $0.0125/GB + $0.01/GB retrieval

S3 One Zone-IA:
- Single AZ storage
- Use: Reproducible data
- Cost: $0.01/GB + $0.01/GB retrieval

S3 Glacier Instant Retrieval:
- Archive with instant access
- 90-day minimum storage
- Cost: $0.004/GB + retrieval fees

S3 Glacier Flexible Retrieval:
- Archive storage
- Retrieval: Minutes to hours
- Cost: $0.0036/GB + retrieval fees

S3 Glacier Deep Archive:
- Lowest cost archive
- Retrieval: 12 hours
- Cost: $0.00099/GB + retrieval fees

FEATURES:

Versioning:
- Keep multiple versions of objects
- Protect against accidental deletion
- Can be suspended (not disabled)

Replication:
- Cross-Region Replication (CRR)
- Same-Region Replication (SRR)
- Requires versioning enabled

Object Lock:
- WORM (Write Once Read Many)
- Governance mode: Admin can override
- Compliance mode: Cannot be deleted

Lifecycle Policies:
- Transition objects between classes
- Expire objects after days
- Example: Standard → IA (30 days) → Glacier (90 days)

S3 Transfer Acceleration:
- Use CloudFront edge locations
- 50-500% faster uploads
- Additional cost: $0.04/GB

SECURITY:

Bucket Policies:
- Resource-based permissions
- Allow/Deny access
- Conditions: IP, VPC, MFA

Access Control Lists (ACLs):
- Legacy permission mechanism
- Bucket-level or object-level
- AWS recommends policies over ACLs

Block Public Access:
- Account-level or bucket-level
- Prevents accidental public exposure
- Overrides bucket policies

Encryption:
- SSE-S3: S3-managed keys
- SSE-KMS: KMS-managed keys
- SSE-C: Customer-provided keys
- Client-side encryption

KEY LIMITS:
- Bucket name: 3-63 characters
- Buckets per account: 100 (soft limit)
- Object size: 5 TB max
- Single PUT: 5 GB max (use multipart > 100 MB)
- Parts in multipart: 10,000 max

EXAM TIPS:
✓ Standard for frequent access
✓ Intelligent-Tiering for unknown patterns
✓ Glacier for archives
✓ Cross-region replication for DR
✓ Versioning for data protection
✓ Object Lock for compliance
```


### Amazon EBS (Elastic Block Store)

```
SERVICE OVERVIEW:
Block-level storage for EC2
Persistent storage (survives instance stop)
Automatically replicated within AZ

VOLUME TYPES:

gp3 (General Purpose SSD):
- Size: 1 GB to 16 TB
- Baseline: 3,000 IOPS, 125 MB/s
- Max: 16,000 IOPS, 1,000 MB/s
- Use: Boot volumes, general workloads
- Cost: $0.08/GB/month + $0.005/IOPS (>3000)

gp2 (General Purpose SSD):
- Size: 1 GB to 16 TB
- IOPS: 3 IOPS per GB (min 100, max 16,000)
- Burst: 3,000 IOPS for smaller volumes
- Use: Legacy general purpose
- Cost: $0.10/GB/month

io2 Block Express (Provisioned IOPS):
- Size: 4 GB to 64 TB
- IOPS: Up to 256,000
- Throughput: Up to 4,000 MB/s
- Use: Critical databases, high IOPS
- Cost: $0.125/GB + $0.065/IOPS

io2 (Provisioned IOPS):
- Size: 4 GB to 16 TB
- IOPS: Up to 64,000 (io2 Block Express: 256,000)
- Durability: 99.999%
- Use: I/O intensive databases
- Cost: $0.125/GB + $0.065/IOPS

st1 (Throughput Optimized HDD):
- Size: 125 GB to 16 TB
- Throughput: 500 MB/s max
- Use: Big data, log processing
- Cost: $0.045/GB/month

sc1 (Cold HDD):
- Size: 125 GB to 16 TB
- Throughput: 250 MB/s max
- Use: Cold data, infrequent access
- Cost: $0.015/GB/month

FEATURES:

Snapshots:
- Incremental backups to S3
- Cross-region copy supported
- Restore to any AZ
- Cost: $0.05/GB/month

Encryption:
- AES-256 encryption
- Transparent (no performance impact)
- Uses AWS KMS
- Cannot change after creation

Multi-Attach (io1/io2 only):
- Attach to up to 16 instances
- Must be in same AZ
- Use: Clustered applications

KEY LIMITS:
- Volumes per instance: 28 (depends on instance type)
- IOPS per instance: Varies by type
- Throughput per instance: Varies by type
- Snapshot copies: 5 concurrent per region

EXAM TIPS:
✓ gp3 default choice (best price/performance)
✓ io2 for consistent high IOPS
✓ HDD for throughput, not IOPS
✓ Snapshots for backups and DR
✓ Encryption in-transit requires instance support
```


### Amazon EFS (Elastic File System)

```
SERVICE OVERVIEW:
Managed NFS file system
Elastic (grows/shrinks automatically)
Multi-AZ by default

STORAGE CLASSES:

Standard:
- Frequently accessed files
- Multi-AZ redundancy
- Cost: $0.30/GB/month

Infrequent Access (IA):
- Files not accessed for 30+ days
- Lower storage cost
- Retrieval fee applies
- Cost: $0.025/GB/month + $0.01/GB access

PERFORMANCE MODES:

General Purpose:
- Default mode
- Max 7,000 IOPS
- Lowest latency
- Use: Web serving, content management

Max I/O:
- Higher aggregate throughput
- Slightly higher latency
- Use: Big data, media processing

THROUGHPUT MODES:

Bursting:
- Throughput scales with size
- 50 MB/s per TB stored
- Burst to 100 MB/s
- Use: Variable workloads

Provisioned:
- Fixed throughput regardless of size
- Additional cost
- Use: Consistent high throughput

Enhanced (Elastic):
- Automatic scaling
- Up to 3 GB/s read, 1 GB/s write
- Pay for what you use
- Use: Unknown or varying throughput

FEATURES:

Lifecycle Management:
- Automatically move to IA
- Configurable: 7, 14, 30, 60, 90 days
- Transition back on access

Replication:
- Same-region or cross-region
- Continuous replication
- Point-in-time restore

Access Points:
- Application-specific entry points
- Enforce user identity
- Enforce root directory

PRICING:
Standard: $0.30/GB/month
IA: $0.025/GB/month
Throughput (provisioned): $6.00/MB/s/month

Example:
100 GB Standard, 10 GB IA, 5 MB/s provisioned:
Storage: 100 × $0.30 + 10 × $0.025 = $30.25
Throughput: 5 × $6.00 = $30.00
Total: $60.25/month

KEY LIMITS:
- File systems per region: 1,000
- Mount targets per file system: 400
- Throughput: Up to 10 GB/s
- Concurrent NFS connections: 1,000s

EXAM TIPS:
✓ Multi-AZ shared file system
✓ NFS protocol (Linux)
✓ Auto-scaling (pay for what you use)
✓ IA for cost optimization
✓ VPC mount targets for access control
```


## Database Services Quick Reference

### Amazon RDS (Relational Database Service)

```
SERVICE OVERVIEW:
Managed relational database
Automated backups, patching, scaling
Supports: MySQL, PostgreSQL, MariaDB, Oracle, SQL Server

INSTANCE TYPES:

db.t3.micro: 2 vCPU, 1 GB RAM - $0.017/hr
db.t3.small: 2 vCPU, 2 GB RAM - $0.034/hr
db.m5.large: 2 vCPU, 8 GB RAM - $0.192/hr
db.r5.large: 2 vCPU, 16 GB RAM - $0.240/hr

DEPLOYMENT OPTIONS:

Single-AZ:
- Single instance in one AZ
- Lowest cost
- Use: Dev/test environments

Multi-AZ:
- Primary + standby in different AZ
- Synchronous replication
- Automatic failover (1-2 minutes)
- Zero data loss
- Use: Production databases

Read Replicas:
- Asynchronous replication
- Up to 5 replicas
- Offload read traffic
- Can be in different region
- Use: Read scaling, analytics

FEATURES:

Automated Backups:
- Daily full backup
- Transaction logs every 5 minutes
- Retention: 0-35 days (default 7)
- Point-in-time recovery
- No performance impact

Manual Snapshots:
- User-initiated backups
- Retained until deleted
- Can copy across regions
- Can share across accounts

Encryption:
- At rest: AES-256 with KMS
- In transit: SSL/TLS
- Must enable at creation
- Cannot change after creation

Enhanced Monitoring:
- Real-time OS metrics
- CPU, memory, disk I/O
- 1-second granularity
- Stored in CloudWatch Logs

Performance Insights:
- Database performance monitoring
- Identify slow queries
- Visualize database load
- 7 days free, pay for longer retention

STORAGE:

General Purpose (gp3):
- 20 GB to 64 TB
- 3,000 IOPS baseline
- Use: Most workloads

Provisioned IOPS (io1):
- 100 GB to 64 TB
- Up to 256,000 IOPS
- Use: I/O intensive workloads

Magnetic (legacy):
- Not recommended for new workloads

PRICING EXAMPLE (MySQL):
db.m5.large, Multi-AZ, 100 GB gp3:
Instance: $0.192/hr × 2 (Multi-AZ) × 730 = $280/month
Storage: 100 GB × $0.23 × 2 = $46/month
Backup: 100 GB × $0.095 = $9.50/month
Total: ~$335/month

KEY LIMITS:
- Database instances per region: 40
- Read replicas per primary: 5
- Manual snapshots: 100 per region
- Parameter groups: 50 per region

EXAM TIPS:
✓ Multi-AZ for high availability
✓ Read replicas for scaling reads
✓ Automated backups for PITR
✓ Encryption cannot be added later
✓ Cross-region replicas for DR
```


### Amazon DynamoDB

```
SERVICE OVERVIEW:
Fully managed NoSQL database
Single-digit millisecond latency
Automatic scaling, replication

CAPACITY MODES:

On-Demand:
- Pay per request
- Auto-scales instantly
- No capacity planning
- Use: Unpredictable traffic
- Cost: $1.25/million writes, $0.25/million reads

Provisioned:
- Specify RCU/WCU
- Auto Scaling optional
- 20% cheaper than on-demand (if predictable)
- Use: Predictable traffic
- Cost: $0.00065/RCU-hour, $0.00013/WCU-hour

Capacity Units:
RCU (Read Capacity Unit): 1 strongly consistent read/sec of 4 KB
WCU (Write Capacity Unit): 1 write/sec of 1 KB

Example:
10 items/sec, 8 KB each, strongly consistent reads:
RCU needed: 10 × (8/4) = 20 RCU

10 items/sec, 3 KB each, writes:
WCU needed: 10 × 3 = 30 WCU

FEATURES:

Global Tables:
- Multi-region, multi-active
- < 1 second replication
- Conflict resolution (last write wins)
- Use: Global applications

DynamoDB Streams:
- Ordered stream of item changes
- 24-hour retention
- Trigger Lambda functions
- Use: Change data capture, analytics

DynamoDB Accelerator (DAX):
- In-memory cache
- Microsecond latency
- Write-through cache
- Fully managed
- Cost: $0.28/hr (dax.r4.large)

Point-in-Time Recovery (PITR):
- Continuous backups
- Restore to any point (35 days)
- Per-second granularity
- Cost: $0.20/GB/month

INDEXES:

Global Secondary Index (GSI):
- Different partition + sort key
- Queries across entire table
- Eventual consistency
- Separate RCU/WCU

Local Secondary Index (LSI):
- Same partition key, different sort key
- Queries within partition
- Strong or eventual consistency
- Shares RCU/WCU with table

PRICING EXAMPLE:
On-demand, 10M writes/month, 50M reads/month, 5 GB:
Writes: 10M × $1.25/M = $12.50
Reads: 50M × $0.25/M = $12.50
Storage: 5 GB × $0.25 = $1.25
Total: ~$26/month

KEY LIMITS:
- Item size: 400 KB max
- Table name: 3-255 characters
- Tables per region: 2,500
- Partition key: 2048 bytes max
- GSI per table: 20

EXAM TIPS:
✓ On-demand for unknown traffic
✓ Provisioned for predictable traffic
✓ GSI for flexible queries
✓ DynamoDB Streams for events
✓ DAX for read-heavy caching
✓ Global Tables for multi-region
```


### Amazon Aurora

```
SERVICE OVERVIEW:
MySQL/PostgreSQL-compatible database
5× faster than MySQL, 3× faster than PostgreSQL
Automatic storage scaling (10 GB to 128 TB)

ARCHITECTURE:

Storage:
- 6 copies across 3 AZs
- Self-healing (bit corruption detected/repaired)
- Continuous backup to S3
- 99.99% availability

Compute:
- Primary instance (read/write)
- Up to 15 read replicas
- Replicas can be promoted
- Auto Scaling for replicas

FEATURES:

Aurora Serverless:
- Auto-scaling database
- Scale to zero when idle
- Pay per second
- Use: Intermittent workloads
- Cost: $0.06/ACU-hour (Aurora Capacity Unit)

Aurora Global Database:
- Cross-region replication
- < 1 second replication lag
- Up to 5 secondary regions
- Fast failover (< 1 minute)
- Use: Global applications, DR

Aurora Multi-Master:
- Multiple write instances
- Continuous availability
- Application-level conflict resolution
- Use: Sharded applications

Backtrack:
- Rewind database to point in time
- No restore required (instant)
- Up to 72 hours
- Use: Undo mistakes

Cloning:
- Fast database copy
- Copy-on-write (efficient)
- Use: Dev/test environments

PRICING:
Instance: Same as RDS (db.t3, db.r5, etc.)
Storage: $0.10/GB/month (auto-scales)
I/O: $0.20/million requests
Backup: $0.021/GB/month (beyond storage size)

Serverless v2:
ACU (Aurora Capacity Unit): $0.12/ACU-hour
Min: 0.5 ACU, Max: 128 ACU
Example: Average 2 ACU × 730 hrs = $175/month

Example (MySQL-compatible):
db.r5.large, 100 GB data, 10M I/O:
Instance: $0.29/hr × 730 = $212/month
Storage: 100 × $0.10 = $10/month
I/O: 10M × $0.20/M = $2/month
Total: ~$224/month

KEY LIMITS:
- Database size: 128 TB
- Read replicas: 15
- Endpoints: 5 custom
- Backtrack window: 72 hours
- Global Database regions: 5

EXAM TIPS:
✓ Aurora for high performance
✓ Serverless for variable workloads
✓ Global Database for multi-region
✓ Read replicas for scaling reads
✓ Automatic storage scaling
✓ Self-healing storage
```


## Networking Services Quick Reference

### Amazon VPC (Virtual Private Cloud)

```
SERVICE OVERVIEW:
Isolated virtual network
Complete control over IP ranges, subnets, routing
Logically isolated from other VPCs

COMPONENTS:

CIDR Blocks:
- Primary: /16 to /28 (e.g., 10.0.0.0/16)
- Secondary: Up to 5 additional
- Cannot overlap with other VPCs if peering

Subnets:
- Subdivision of VPC
- Each in single AZ
- Public: Route to internet gateway
- Private: No route to internet
- 5 IPs reserved per subnet (AWS)

Route Tables:
- Controls traffic routing
- Each subnet associated with one table
- Default: Local route (VPC CIDR)

Internet Gateway:
- Allows internet access
- Horizontally scaled, redundant
- 1:1 NAT for public IPs

NAT Gateway:
- Allows private subnet internet access
- Managed NAT service
- Per AZ deployment
- Cost: $0.045/hr + $0.045/GB processed

NAT Instance:
- EC2 instance as NAT
- Self-managed
- Lower cost but requires management

VPC Peering:
- Connect two VPCs
- Private IP communication
- Same or different regions
- No transitive peering

Transit Gateway:
- Hub for multiple VPCs
- Simplifies network topology
- Inter-region peering
- Cost: $0.05/hr + $0.02/GB

SECURITY:

Security Groups:
- Stateful firewall
- Instance level
- Allow rules only
- Default: Deny all inbound, allow all outbound

Network ACLs:
- Stateless firewall
- Subnet level
- Allow and deny rules
- Default: Allow all

VPC Flow Logs:
- Capture IP traffic
- CloudWatch Logs or S3
- Analyze traffic patterns
- Cost: Standard CloudWatch Logs pricing

CONNECTIVITY:

VPN:
- Site-to-Site VPN: On-premises to VPC
- Client VPN: Remote users to VPC
- Cost: $0.05/hr + $0.09/GB transferred

Direct Connect:
- Dedicated connection
- 1 Gbps or 10 Gbps
- Consistent bandwidth
- Cost: Port hour fee + data transfer

PrivateLink:
- Private access to services
- No internet gateway needed
- Powered by NLB
- Cost: $0.01/hr + $0.01/GB processed

PRICING:
VPC: Free
NAT Gateway: $0.045/hr + $0.045/GB
VPN: $0.05/hr + data transfer
VPC Peering: Data transfer only
Transit Gateway: $0.05/hr + $0.02/GB

KEY LIMITS:
- VPCs per region: 5 (soft limit)
- Subnets per VPC: 200
- Route tables per VPC: 200
- Security groups per VPC: 2,500
- Rules per security group: 60
- VPC peering connections: 125

EXAM TIPS:
✓ Public subnet has IGW route
✓ Private subnet uses NAT Gateway
✓ Security Groups: Stateful
✓ NACLs: Stateless
✓ VPC Peering: No transitive routing
✓ Transit Gateway: Hub-and-spoke
```


## Security Services Quick Reference

### AWS IAM (Identity and Access Management)

```
SERVICE OVERVIEW:
Global service — controls who can do what on AWS
Zero-trust identity foundation for all AWS access

CORE COMPONENTS:
Users: Long-term identities (avoid; prefer roles)
Groups: Collections of users (no nesting, max 300/account)
Roles: Temporary identities assumed by services/users/federated
Policies: JSON documents defining Allow/Deny on Actions+Resources

POLICY EVALUATION ORDER:
1. Explicit DENY → DENY (always wins)
2. SCP (Organizations) → if Deny, DENY
3. Resource-based policy → if Allow, ALLOW
4. Identity-based policy → if Allow, ALLOW
5. Permission Boundary → if outside, DENY
6. Session Policy → if outside, DENY
Default: Implicit DENY

KEY POLICY TYPES:
AWS Managed: Created/maintained by AWS (e.g., AdministratorAccess)
Customer Managed: You create/maintain; reusable across identities
Inline: Embedded in single identity; deleted with identity
Resource-based: Attached to resource (S3, SQS, Lambda); includes Principal
Permission Boundary: Max permissions cap on identity
SCP: Max permissions cap on AWS Organization accounts/OUs
Session Policy: Further limit temporary credential sessions

CROSS-ACCOUNT ACCESS:
Role in Account B → Trust policy allowing Account A
User in Account A → sts:AssumeRole → gets temp creds for Account B
Always use ExternalId for 3rd-party (prevents confused deputy)

FEDERATION:
SAML 2.0: Corporate AD → SAML assertion → STS → temp creds
OIDC: GitHub Actions, GitLab CI → JWT token → STS → temp creds
IAM Identity Center: SSO for workforce, integrates with external IdPs
Cognito User Pools: Authentication for app users (login)
Cognito Identity Pools: AWS credentials for app users (authorization)

KEY LIMITS:
- Users per account: 5,000
- Groups per account: 300
- Roles per account: 1,000 (soft limit)
- Managed policies per identity: 10
- Managed policy size: 6,144 characters
- Inline policy size: 2,048 chars (user), 10,240 chars (role)
- MFA devices per user: 8

EXAM TIPS:
✓ Roles provide temporary credentials (no long-term secrets)
✓ Explicit DENY always wins over explicit ALLOW
✓ SCPs don't grant permissions; they only restrict
✓ Permission boundaries: effective permissions = policy ∩ boundary
✓ SAML federation: AssumeRoleWithSAML (console + CLI)
✓ Web identity: AssumeRoleWithWebIdentity (mobile/web apps)
✓ Groups cannot be principals in resource-based policies
✓ IAM is global — one user/role works in all regions
```


### Amazon GuardDuty

```
SERVICE OVERVIEW:
ML-based continuous threat detection service
Analyzes: CloudTrail, VPC Flow Logs, DNS logs, S3 data events,
          EKS audit logs, RDS login activity, Lambda network activity
No agents required — uses existing AWS data sources

THREAT CATEGORIES:
Backdoor: EC2 communicating with C&C servers
Behavior: Unusual IAM user behavior
Cryptocurrency: Mining activity detected
PenTest: Kali Linux tools detected
Policy: Public S3 bucket with sensitive data
Persistence: New IAM user/role created by compromised credential
Recon: Port scanning, unusual API calls
Stealth: CloudTrail logging disabled
Trojan: Domain generation algorithm traffic
UnauthorizedAccess: Unusual logins, credential exfiltration

FINDING SEVERITY: Low / Medium / High / Critical

INTEGRATIONS:
EventBridge → Lambda (automated remediation)
Security Hub (centralized findings)
Detective (investigation/root cause)
Organizations (multi-account, delegated admin)

PRICING:
Per 1M CloudTrail events: ~$4.00
Per GB VPC Flow Logs / DNS: ~$1.00
Per 1M S3 data events: ~$0.80
Free tier: 30-day trial per region

EXAM TIPS:
✓ Detects threats; does NOT prevent them (detection only)
✓ No agents, no performance impact
✓ Enable in ALL regions (threats can originate anywhere)
✓ Multi-account: Use Organizations + delegated admin account
✓ Suppress findings with suppression rules
✓ GuardDuty ≠ Inspector (Inspector = vulnerability scanning)
```


### Amazon Inspector

```
SERVICE OVERVIEW:
Automated vulnerability management for:
- EC2 instances (OS/software CVEs via SSM agent)
- ECR container images (CVE scan on push and continuously)
- Lambda functions (code and dependency CVEs)

FINDING TYPES:
Software vulnerability (CVE-based)
Network reachability (exposed ports, paths to internet)
Code vulnerability (Lambda — SAST findings)

SEVERITY: Critical / High / Medium / Low / Informational

INTEGRATIONS:
Security Hub (aggregated findings)
EventBridge (automated responses)
Organizations (multi-account)

PRICING:
EC2: Per instance-month (~$1.17/instance/month)
ECR: Per image scan (~$0.09/image)
Lambda: Per Lambda function-month

EXAM TIPS:
✓ Inspector = vulnerability scanning, NOT threat detection
✓ Requires SSM agent on EC2 (or automatic via Systems Manager)
✓ ECR scanning: Enable on push for CI/CD pipeline security
✓ Inspector ≠ GuardDuty (GuardDuty = behavior threats)
✓ Continuously re-evaluates as new CVEs are published
```


### AWS WAF (Web Application Firewall)

```
SERVICE OVERVIEW:
Layer 7 firewall protecting web applications
Deployed on: CloudFront, ALB, API Gateway, AppSync, Cognito

RULE TYPES:
IP Set Rules: Allow/Block by IP or CIDR range
Geographic Match: Allow/Block by country
Rate-Based: Throttle IPs exceeding request rate
SQL Injection Match: Block SQLi attempts
Cross-Site Scripting Match: Block XSS attempts
String/Regex Match: Custom pattern matching

AWS MANAGED RULES (pre-built rule groups):
AWSManagedRulesCommonRuleSet: OWASP Top 10
AWSManagedRulesKnownBadInputsRuleSet: Known attack patterns
AWSManagedRulesSQLiRuleSet: SQL injection
AWSManagedRulesAmazonIpReputationList: Malicious IPs (bots, scrapers)

WEB ACL:
Contains ordered rules; first matching rule wins (ALLOW/BLOCK/COUNT)
Default action: ALLOW or BLOCK for non-matching requests
Capacity: Web ACL Capacity Units (WCU), max 5,000 WCU

BOT CONTROL:
Managed rule group detecting bots
Challenge action: CAPTCHA for suspected bots

PRICING:
Web ACL: $5.00/month
Rule: $1.00/month per rule
Request: $0.60/million requests

EXAM TIPS:
✓ WAF = application layer (Layer 7), not network layer
✓ Shield Standard = free DDoS protection for ALL customers
✓ Shield Advanced = $3,000/month, 24/7 DDoS response team
✓ WAF + Shield Advanced = comprehensive protection
✓ WAF on CloudFront = global protection at edge
✓ WAF on ALB = regional protection
✓ Rate-based rules: throttle DDoS / abuse without full block
```


## Networking Services Quick Reference (Extended)

### Amazon Route 53

```
SERVICE OVERVIEW:
Highly available DNS service + domain registrar
Global service (no region selection needed)
100% SLA for hosted zones

RECORD TYPES:
A: IPv4 address
AAAA: IPv6 address
CNAME: Canonical name (cannot be at zone apex/root domain)
Alias: AWS-specific; points to AWS resources (ALB, CloudFront, S3 website)
       CAN be at zone apex; no charge for Alias queries
MX: Mail exchange
TXT: Text records (domain verification, SPF, DKIM)
NS: Name server records (defines authoritative DNS servers)
SOA: Start of Authority

ALIAS vs CNAME:
Alias: Use for AWS resources; zone apex supported; free queries; auto-follows IP changes
CNAME: Generic DNS standard; cannot be at root; charged per query

ROUTING POLICIES:
Simple: One or more IPs (random selection); no health checks
Weighted: Distribute traffic by % weights; canary deployments
Latency: Route to lowest-latency region (based on AWS network data)
Failover: Active/passive; requires health check on primary
Geolocation: Route by user's geographic location (country/continent)
Geoproximity: Route by proximity + bias adjustment (Traffic Flow only)
Multi-Value Answer: Return up to 8 healthy records randomly

HEALTH CHECKS:
HTTP/HTTPS/TCP checks against endpoints
Interval: 30 seconds (standard) or 10 seconds (fast, extra cost)
Failure threshold: 3 consecutive failures = unhealthy
String match: Check response body contains string
Calculated health checks: Combine multiple health checks (AND/OR/NOT)
CloudWatch alarm health checks: Trigger based on alarm state

PRIVATE HOSTED ZONES:
DNS resolution within one or more VPCs
Resolver Inbound/Outbound Endpoints: Hybrid DNS (on-premises ↔ AWS)
DNS Firewall: Block malicious domains at DNS level

PRICING:
Hosted zone: $0.50/month (first 25), $0.10/month (additional)
Queries: $0.40/million (standard), $0.60/million (latency/geo/failover)
Health checks: $0.50/month per endpoint

EXAM TIPS:
✓ Only Alias records can point to zone apex (root domain)
✓ Weighted + Health Checks = canary deployments
✓ Latency routing ≠ Geolocation routing
  Latency = lowest AWS network latency (may differ from closest)
  Geolocation = based on user's IP geographic location
✓ Failover requires health checks; Latency/Geo do NOT require them
  but SHOULD use them for availability
✓ TTL: Lower TTL = faster failover but more queries + higher cost
✓ Route 53 Resolver: Resolve DNS in hybrid environments
```


### Amazon CloudFront

```
SERVICE OVERVIEW:
Global CDN with 450+ edge locations in 90+ cities
Supports HTTP/S, WebSocket, streaming (HLS, DASH)
Integrated with: S3, ALB, EC2, API Gateway, Lambda@Edge

KEY CONCEPTS:
Origin: Where CloudFront fetches content (S3, ALB, custom HTTP)
Distribution: CloudFront configuration (behaviors, cache settings)
Edge Location: Where content is cached globally
Regional Edge Cache: Larger mid-tier cache between edge and origin

CACHE BEHAVIORS:
Path-based: /images/* → S3, /api/* → ALB
Cache key: URL path + headers/cookies/query strings you include
TTL: Min (0s), Default (86400s=24h), Max (31536000s=1yr)
Cache-Control header from origin overrides default TTL

ORIGIN TYPES:
S3 Origin: Use Origin Access Control (OAC) to restrict S3 to CloudFront only
           (OAC replaces legacy Origin Access Identity/OAI)
Custom Origin: ALB, EC2, or any HTTP endpoint
Origin Groups: Primary + failover origins for HA

SECURITY:
HTTPS: Viewer Protocol Policy (HTTP→HTTPS redirect or HTTPS only)
       Origin Protocol Policy (CloudFront→Origin: HTTP, HTTPS, or Match)
Custom SSL Certificate: Upload to ACM in us-east-1 (MUST be us-east-1)
Geo Restriction: Allow/Block by country (whitelist or blacklist)
Signed URLs: Grant time-limited access to single files
Signed Cookies: Grant time-limited access to multiple files
WAF Integration: Attach Web ACL to distribution
Origin Shield: Additional caching layer in single region (reduces origin load)

LAMBDA@EDGE vs CLOUDFRONT FUNCTIONS:
Lambda@Edge:
- Runs at Regional Edge Caches
- All 4 trigger points: viewer request, viewer response, origin request, origin response
- Max 5 seconds (viewer), 30 seconds (origin)
- Can make network calls, access body
- More powerful but higher latency + cost

CloudFront Functions:
- Runs at Edge Locations (closer to users)
- Only: viewer request, viewer response
- Max 1ms execution, 2MB memory
- Cannot make network calls
- URL rewrites, header manipulation, auth token validation
- 1/6 the cost of Lambda@Edge for simple manipulations

PRICING:
Data Transfer Out: $0.0085–$0.02/GB (varies by region)
HTTP Requests: $0.0075–$0.016/10,000 requests
Free tier: 1 TB data transfer + 10M HTTP requests/month (12 months)
Origin fetch: FREE from S3 in same region

EXAM TIPS:
✓ CloudFront + S3: Always use OAC (not direct public S3)
✓ Custom SSL cert: MUST be in ACM us-east-1
✓ Invalidation: $0.005/path after first 1,000 free/month
✓ CloudFront Functions: Simple, fast, cheap (URL rewrites, A/B testing)
✓ Lambda@Edge: Complex logic requiring network calls
✓ Signed URLs: Single object time-limited access
✓ Signed Cookies: Multiple objects, don't want to change URLs
✓ Origin Shield: Reduce origin load (one more caching hop)
✓ Price Class: Reduce edge locations to lower cost (All, 200, 100)
```


## Messaging Services Quick Reference

### Amazon SQS (Simple Queue Service)

```
SERVICE OVERVIEW:
Fully managed message queue service
Decouples producers and consumers
Infinitely scalable, pay per use

QUEUE TYPES:
Standard:
- At-least-once delivery (duplicates possible)
- Best-effort ordering
- Unlimited throughput
- Use: Most decoupling scenarios

FIFO:
- Exactly-once processing (deduplication)
- Strict ordering (within message group)
- 300 TPS, or 3,000 TPS with batching (10 messages per batch)
- Message Group ID: Allows parallel processing per group
- Deduplication ID: 5-minute deduplication window
- Use: Financial transactions, order processing

KEY PARAMETERS:
Visibility Timeout: Time message is hidden after receive (default 30s, max 12h)
Message Retention: 1 min to 14 days (default 4 days)
Max Message Size: 256 KB
Delivery Delay: 0 to 15 minutes (delay before delivery)
Receive Message Wait Time: 0–20 seconds (long polling saves cost)

DEAD LETTER QUEUE (DLQ):
Messages that fail maxReceiveCount times → moved to DLQ
Separate queue for analysis of failed messages
DLQ redrive: Move messages back to source queue after fixing issue
Lambda DLQ: Failed async Lambda invocations stored here

LONG POLLING vs SHORT POLLING:
Short polling (WaitTimeSeconds=0): Returns immediately even if empty
Long polling (WaitTimeSeconds=1-20): Waits up to 20s for messages
Long polling: Reduces empty responses → cost savings

EXTENDED CLIENT LIBRARY:
Messages > 256 KB → store payload in S3, SQS stores S3 pointer
Java SDK supports this natively

PRICING:
First 1M requests/month: Free
$0.40 per million requests (Standard)
$0.50 per million requests (FIFO)

EXAM TIPS:
✓ SQS = pull-based (consumers poll)
✓ Standard: At-least-once → handle duplicate messages (idempotency)
✓ FIFO: Exactly-once, 300 TPS (3K with batching)
✓ Visibility timeout > processing time to prevent duplicates
✓ DLQ: Capture failed messages for analysis/retry
✓ Long polling: Reduces cost (fewer empty API calls)
✓ SQS + Auto Scaling: Scale EC2 on queue depth (ApproximateNumberOfMessages)
✓ SQS + Lambda: Lambda polls queue (event source mapping)
```


### Amazon SNS (Simple Notification Service)

```
SERVICE OVERVIEW:
Fully managed pub/sub messaging
Push-based (messages pushed to subscribers)
Fan-out: One message → multiple endpoints simultaneously

TOPIC TYPES:
Standard Topics:
- At-least-once delivery
- Best-effort message ordering
- Unlimited subscriptions and throughput

FIFO Topics:
- Exactly-once delivery
- Strict message ordering
- Only SQS FIFO as subscriber
- 300 TPS

SUPPORTED PROTOCOLS (Subscribers):
SQS: Queue for async processing (most common)
Lambda: Trigger function
HTTP/HTTPS: Webhook endpoint
Email/Email-JSON: Human notifications
SMS: Text messages
Mobile Push: APNS (iOS), GCM/FCM (Android), ADM (Amazon)
Kinesis Data Firehose: Stream to S3/Redshift/OpenSearch

MESSAGE FILTERING:
Filter policies on subscriptions: Only deliver messages matching attributes
Example: Order topic → Fulfillment queue (filter: status=PLACED)
                     → Shipping queue (filter: status=SHIPPED)
Reduces number of queues and Lambda functions needed

SNS + SQS FAN-OUT PATTERN:
One SNS topic → Multiple SQS queues
Each queue processed independently
Example: Image upload → SNS → [Resize queue, Watermark queue, Backup queue]

MESSAGE ATTRIBUTES:
Up to 10 key-value pairs per message
Used for filtering and routing

PRICING:
First 1M requests/month: Free
$0.50 per million Amazon SQS deliveries
$0.06 per million HTTP deliveries
$0.75 per 100 SMS (US)
Push notifications: $1.00 per million

EXAM TIPS:
✓ SNS = push-based (fan-out to multiple subscribers)
✓ Fan-out: SNS → multiple SQS queues (decouple + parallel processing)
✓ Message Filtering: Reduces unnecessary processing
✓ SNS FIFO only supports SQS FIFO subscribers
✓ Mobile push: SNS simplifies push to iOS/Android
✓ SNS does NOT persist messages (no retry store)
✓ SQS DLQ for retry; SNS has no built-in DLQ
```


### Amazon EventBridge

```
SERVICE OVERVIEW:
Serverless event bus connecting AWS services, SaaS, and custom apps
Formerly CloudWatch Events (same underlying service)
Schema registry for event discovery

COMPONENTS:
Event Bus:
- Default (AWS services): Receives all AWS service events
- Custom: For your application events
- Partner: SaaS integrations (Zendesk, Datadog, Segment, etc.)

Rules:
- Event pattern matching (JSON filter on event fields)
- Schedule (cron expressions or rate)
- Target: Up to 5 targets per rule

Targets (60+ supported):
Lambda, SQS, SNS, Kinesis, Step Functions, ECS tasks,
API Gateway, CodeBuild, Systems Manager, EventBridge API Destinations

EVENT PATTERN EXAMPLES:
EC2 state change:
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {"state": ["stopped", "terminated"]}
}

Custom application event:
{
  "source": ["com.myapp.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {"amount": [{"numeric": [">", 1000]}]}
}

EVENTBRIDGE PIPES:
Point-to-point integration: Source → Filter → Enrich → Target
Sources: SQS, DynamoDB Streams, Kinesis, MSK, MQ, Kafka
Filtering: Only process matching events
Enrichment: Lambda, Step Functions, API Gateway, API Destination
Targets: Same as EventBridge rules
Use: Simplified event-driven architecture without Lambda glue code

EVENTBRIDGE SCHEDULER:
Create one-time or recurring schedules (replaces CloudWatch Events schedules)
Targets: 270+ AWS services
Flexible time windows: Allow execution within window for cost savings
Rate and cron expressions

SCHEMA REGISTRY:
Auto-discovers event schemas from event buses
Code bindings: Generate code from schemas (Java, Python, TypeScript)
Reduces boilerplate for event-driven development

PRICING:
Custom events: $1.00/million
Events from AWS services: Free
Cross-account events: $1.00/million
Schema Registry: $0.10/million schema discovery events

EXAM TIPS:
✓ EventBridge = content-based routing (filter on event fields)
✓ Default event bus: all AWS service events flow here
✓ CloudWatch Events = legacy name for EventBridge
✓ Cron schedules: Use EventBridge Scheduler (not CloudWatch Events)
✓ SaaS integration: Partner event buses (Zendesk, etc.)
✓ Multi-account: Event bus resource policy allows cross-account
✓ Dead-letter queue: Configure DLQ on rules for failed deliveries
✓ EventBridge Pipes: Replaces SQS→Lambda→SQS pipeline code
```


## Analytics Services Quick Reference

### AWS Glue

```
SERVICE OVERVIEW:
Serverless ETL (Extract, Transform, Load) service
Data catalog for metadata management
Runs Apache Spark under the hood

COMPONENTS:
Data Catalog:
- Metadata repository for tables, databases, schemas
- Integrates with Athena, Redshift Spectrum, EMR
- Populated by Crawlers automatically

Crawlers:
- Scan data sources (S3, RDS, DynamoDB, etc.)
- Infer schema and update Data Catalog
- Schedule: On-demand, hourly, daily, weekly

ETL Jobs:
- Spark or Python Shell scripts
- Auto-generated code from visual editor
- Job bookmarks: Track processed data (incremental ETL)
- DPU (Data Processing Units): Unit of compute (2 vCPU, 8 GB)

Glue Studio:
- Visual drag-and-drop ETL builder
- Monitor job runs, visualize data flows

DataBrew:
- No-code data preparation (250+ transforms)
- Profiling and data quality checks
- For data analysts without Spark knowledge

COMMON PATTERNS:
S3 → Crawler → Data Catalog → Athena (query in place)
S3 Raw → Glue ETL → S3 Processed → Redshift (load)
Operational DB → Glue DMS → S3 → Glue ETL → Data Warehouse

PRICING:
DPU-hour: $0.44 (ETL jobs), $0.44 (crawlers)
Data Catalog: Free for first 1M objects
DataBrew: $1.00/DPU-hour

EXAM TIPS:
✓ Glue = ETL + Data Catalog (not a database)
✓ Crawlers auto-populate Data Catalog schema
✓ Athena uses Glue Data Catalog for table definitions
✓ Glue vs EMR: Glue is serverless; EMR is managed cluster (more control)
✓ Job Bookmarks: Prevent reprocessing already-processed data
✓ Glue DataBrew: Visual, no-code for data analysts
```


### Amazon Athena

```
SERVICE OVERVIEW:
Interactive SQL query service for S3
Serverless — no infrastructure to manage
Pay per query ($5.00/TB scanned)

SUPPORTED FORMATS:
Columnar (best performance): Parquet, ORC
Row: CSV, TSV, JSON, Avro
Compressed: GZIP, Snappy, LZO, ZSTD

PERFORMANCE OPTIMIZATION:
1. Use columnar formats (Parquet/ORC): Scans only needed columns → 30-90% less data
2. Partition data: s3://bucket/year=2025/month=01/day=15/ → partition pruning
3. Compress data: GZIP reduces scan costs but Snappy better for parallel reads
4. Use large files (>128 MB): Fewer S3 API calls, better parallelism
5. Predicate pushdown: Filter in WHERE clause reduces scan

FEDERATED QUERIES:
Query data outside S3 using Lambda connectors:
- RDS, Redshift, DynamoDB, CloudWatch Logs, DocumentDB
- On-premises databases (via Glue connector)

WORKGROUPS:
Isolate users/teams with separate query execution settings
Per-workgroup: query output location, encryption, data scan limits
Cost control: Set data scan limits per query or per workgroup

PRICING:
$5.00 per TB scanned
Columnar format saves ~70% → effectively $1.50/TB
No charge for DDL queries, failed queries

EXAM TIPS:
✓ Athena = serverless SQL on S3 (no loading, no clusters)
✓ Pay per scan → use Parquet/ORC + partitioning to save cost
✓ Athena uses Glue Data Catalog for schema
✓ Federated queries: Athena can query non-S3 data sources
✓ Best for: Ad-hoc analysis, log analysis, BI on S3 data
✓ Not for: Low-latency queries (use DynamoDB/ElastiCache), OLTP
```


### Amazon Kinesis

```
SERVICE OVERVIEW:
Real-time data streaming platform

KINESIS SERVICES COMPARISON:

Data Streams:
- Real-time data collection and processing
- Shards: Unit of capacity (1 MB/s write, 2 MB/s read, 1,000 records/s)
- Retention: 24h (default) to 365 days
- Multiple consumers: Fan-out (Enhanced fan-out: 2 MB/s per consumer per shard)
- Use: Custom real-time applications, complex processing
- Pricing: Per shard-hour + per PUT payload unit

Data Firehose (Delivery Streams):
- Delivery to: S3, Redshift, OpenSearch, Splunk, HTTP endpoints, Datadog
- No consumers to manage — fully managed delivery
- Transform with Lambda before delivery
- Buffer: By size (1-128 MB) or time (60-900 seconds)
- Use: Simple delivery to data stores (no consumer code)
- Pricing: Per GB ingested

Data Analytics (Managed Service for Apache Flink):
- SQL or Apache Flink on streaming data
- Sources: Kinesis Data Streams, MSK (Kafka)
- Use: Real-time aggregations, anomaly detection
- Pricing: Per KPU-hour

Video Streams:
- Ingest video, audio, images from cameras/devices
- Playback, ML processing with Rekognition
- Use: Smart home cameras, industrial monitoring

KINESIS vs SQS:
Kinesis: Multiple consumers, ordered per shard, replay possible, real-time
SQS: Single consumer per message, simpler, at-least-once, up to 14-day retention

KINESIS vs KAFKA (MSK):
Kinesis: Fully managed, AWS native, no ZooKeeper
MSK: Open-source Kafka on AWS, more control, compatible with Kafka ecosystem

SHARDING:
Add shards (scale out): Splits or merge shards
Hot shard: Too much data on one shard → resharding or better partition key
Partition key: Determines shard assignment (use high-cardinality key)

EXAM TIPS:
✓ Kinesis Data Streams: Multiple consumers, replay, ordered per shard
✓ Kinesis Firehose: Simple delivery (no consumer code), no replay
✓ Kinesis Analytics/Flink: Real-time SQL/Flink on streams
✓ SQS: Decoupling, simpler, at-least-once, messages consumed once
✓ Hot shard fix: Better partition key selection
✓ Enhanced Fan-out: Dedicated 2 MB/s throughput per consumer (vs shared 2 MB/s)
✓ Firehose buffer: Data arrives in near-real-time (60-900 sec delay)
✓ Retention: Extend to 7 days for replay capability
```


## Migration Services Quick Reference

### AWS Snow Family

```
SERVICE OVERVIEW:
Physical devices for offline data transfer and edge computing

DEVICE COMPARISON:

Snowcone:
- Storage: 8 TB HDD or 14 TB SSD
- Compute: 2 vCPU, 4 GB RAM
- Connectivity: USB-C power, WiFi/wired
- Weight: 4.5 lbs (rugged, portable)
- Use: Remote/disconnected sites, small migrations
- DataSync: Can send data online after offline collection

Snowball Edge Storage Optimized:
- Storage: 80 TB usable
- Compute: 40 vCPU, 80 GB RAM, optional GPU
- Clustering: Up to 15 nodes
- Use: Large data migrations (petabyte-scale), on-site storage

Snowball Edge Compute Optimized:
- Storage: 28 TB usable
- Compute: 104 vCPU, 416 GB RAM, optional GPU
- Use: Machine learning at edge, video analysis

Snowmobile:
- Capacity: Up to 100 PB (exabyte-scale)
- Transport: Semi-truck with secure container
- Security: 24/7 video surveillance, GPS tracking
- Use: Massive data center migrations

WHEN TO USE SNOW FAMILY:
Rule of thumb: > 1 week to transfer → use Snow device
At 1 Gbps: ~10 TB/day → Snowcone viable for < 80 TB
At 100 Mbps: ~1 TB/day → Snowball Edge for hundreds of TB
Exabyte scale → Snowmobile

EXAM TIPS:
✓ Snowcone = small, portable, 8-14 TB
✓ Snowball Edge = petabyte migrations
✓ Snowmobile = exabyte migrations (> 10 PB)
✓ Edge computing: Snowball Edge / Snowcone can run EC2 instances/Lambda
✓ Encrypted at rest and in transit (256-bit encryption, KMS)
✓ Chain of custody: Physical security tracked by AWS
```


### AWS Database Migration Service (DMS)

```
SERVICE OVERVIEW:
Migrate databases to AWS with minimal downtime
Continuous replication using Change Data Capture (CDC)

SUPPORTED MIGRATIONS:
Homogeneous: Oracle → Oracle, MySQL → RDS MySQL (simple)
Heterogeneous: Oracle → Aurora PostgreSQL (requires SCT first)

MIGRATION TYPES:
Full Load: One-time migration of existing data
Full Load + CDC: Migrate + replicate ongoing changes (near-zero downtime)
CDC Only: Ongoing replication only (source already migrated)

SCHEMA CONVERSION TOOL (SCT):
Converts database schema + stored procedures + views
From: Oracle, SQL Server, SAP ASE, Teradata
To: Aurora, MySQL, PostgreSQL, Redshift
Highlights items requiring manual conversion

REPLICATION INSTANCE:
EC2 instance running DMS engine (not serverless)
Size based on: Data volume, number of tables, transformation complexity

COMMON PATTERNS:
On-prem Oracle → Aurora PostgreSQL:
  1. SCT: Convert schema
  2. DMS Full Load + CDC: Migrate data + sync changes
  3. Switch application connection string
  4. Stop source database

Data Warehouse Migration (Teradata → Redshift):
  1. SCT: Convert schema
  2. DMS: Migrate data in parallel

PRICING:
Replication instance: Same as EC2 pricing (per hour)
Data transfer: First 1 TB free/month from on-premises → AWS

EXAM TIPS:
✓ DMS = minimal downtime database migrations
✓ Heterogeneous migration: Always need SCT first
✓ CDC: Near-zero downtime (application stays up during migration)
✓ DMS can migrate: RDS, on-premises, EC2 databases, Azure, Google Cloud
✓ Replication instance: Must be in same VPC or accessible from source
✓ Multi-AZ replication instance: HA for production migrations
```

---

## Quick Service Selection Cheat Sheet

```
WHEN TO USE WHAT:

COMPUTE:
Need servers, full control → EC2
Variable/unpredictable events → Lambda (15 min max)
Containerized apps, managed → ECS Fargate
Kubernetes, self-managed → EKS
Batch jobs, queue-based → AWS Batch

STORAGE:
Object storage (images, backups, data lake) → S3
Block storage for EC2 → EBS (gp3 default)
Shared file system (Linux, NFS) → EFS
Shared file system (Windows, SMB) → FSx for Windows
High-performance HPC/ML storage → FSx for Lustre

DATABASE:
Relational, familiar SQL → RDS (MySQL, PostgreSQL, etc.)
High-performance relational → Aurora
Variable workload relational → Aurora Serverless v2
NoSQL, massive scale → DynamoDB
In-memory cache → ElastiCache (Redis or Memcached)
In-memory DynamoDB cache → DAX
Full-text search → OpenSearch
Data warehouse → Redshift

NETWORKING:
HTTP routing, microservices → ALB
High performance TCP/UDP → NLB
Virtual appliances (firewall, IDS) → GWLB
Private secure access to AWS services → VPC Endpoints
Multiple VPC connectivity → Transit Gateway
Expose service privately → PrivateLink
Dedicated on-premises connection → Direct Connect
Encrypted on-premises connection → Site-to-Site VPN
Global low-latency routing → Global Accelerator
CDN (static content) → CloudFront

MESSAGING:
Decouple producers/consumers → SQS
Fan-out to multiple systems → SNS
Event routing, filtering → EventBridge
Real-time streaming → Kinesis Data Streams
Simple delivery to S3/Redshift → Kinesis Firehose

SECURITY:
Identity management → IAM
Threat detection → GuardDuty
Vulnerability scanning → Inspector
Web application attacks → WAF
DDoS protection → Shield (Standard=free, Advanced=$3K/month)
Secrets rotation → Secrets Manager
Compliance configuration → AWS Config
Audit logging → CloudTrail
Centralized findings → Security Hub
Sensitive data discovery → Macie

MIGRATION:
Database migration → DMS
Schema conversion → SCT
Server lift-and-shift → MGN (Application Migration Service)
Offline large data → Snow Family
Online accelerated transfer → DataSync
SFTP to S3 → Transfer Family

MONITORING:
Metrics + alarms → CloudWatch
API audit trail → CloudTrail
Distributed tracing → X-Ray
Resource configuration history → AWS Config
Synthetic monitoring → CloudWatch Synthetics

COST:
RI/Savings Plans analysis → Cost Explorer
Budget alerts → AWS Budgets
Detailed billing → Cost and Usage Report + Athena
Right-sizing recommendations → Compute Optimizer
Multi-service cost checks → Trusted Advisor
```

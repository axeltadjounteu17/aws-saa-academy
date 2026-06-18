# Part 13: Exam Preparation

# Chapter 36: Solutions Architect Associate Exam Guide

## Introduction

The AWS Certified Solutions Architect – Associate (SAA-C03) exam validates your ability to design distributed systems on AWS. It is one of the most in-demand cloud certifications globally. The exam tests practical architecture skills through scenario-based questions requiring you to select optimal AWS services, design resilient systems, implement security best practices, optimize costs, and troubleshoot common issues.

Success requires synthesizing knowledge from compute, storage, networking, databases, security, and advanced architectures into cohesive solutions addressing business requirements. The exam was updated in 2022 (SAA-C03) and remains current as of 2025.

This chapter covers all exam domains:
- **Domain 1:** Design Secure Architectures (30%)
- **Domain 2:** Design Resilient Architectures (26%)
- **Domain 3:** Design High-Performing Architectures (24%)
- **Domain 4:** Design Cost-Optimized Architectures (20%)

> **2025 Exam Notes:** The SAA-C03 version introduced increased emphasis on serverless, containers (ECS/EKS/Fargate), and event-driven architectures. Expect more questions on AWS Lake Formation, AWS Glue, Amazon OpenSearch, and AWS Transfer Family compared to older versions.

## Theory \& Concepts

### Exam Structure and Domains

**Understanding the SAA-C03 Exam (2025 Edition):**

```
AWS Certified Solutions Architect - Associate (SAA-C03)

EXAM DETAILS:
- Duration: 130 minutes (2 hours 10 minutes)
- Questions: 65 questions (50 scored + 15 unscored pilot)
- Format: Multiple choice (1 correct) and multiple response (2+ correct)
- Passing Score: 720/1000 (scaled score)
- Cost: $150 USD
- Validity: 3 years (recertify via Associate or Professional exam)
- Language: Available in 13 languages (English, Japanese, Korean, Chinese, etc.)
- Delivery: Pearson VUE test center or online proctored
- Recommended Experience: 1+ year hands-on AWS experience

Question Distribution:

Domain 1: Design Secure Architectures (30% / ~20 questions)
- Secure application tiers
- Secure data
- Define networking infrastructure for single VPC
- Determine network segmentation strategies
- Design access policies

Domain 2: Design Resilient Architectures (26% / ~17 questions)
- Design scalable and loosely coupled architectures
- Design highly available and/or fault-tolerant architectures
- Design multi-tier architectures
- Design decoupling mechanisms

Domain 3: Design High-Performing Architectures (24% / ~16 questions)
- Determine high-performing storage solutions
- Design high-performing compute solutions
- Determine high-performing database solutions
- Determine high-performing networking solutions
- Choose high-performing data ingestion/transformation

Domain 4: Design Cost-Optimized Architectures (20% / ~13 questions)
- Design cost-optimized storage solutions
- Design cost-optimized compute solutions
- Design cost-optimized database solutions
- Design cost-optimized network architectures

Question Types:

1. SCENARIO-BASED (70% of exam):
   "A company runs a web application that experiences unpredictable 
   traffic spikes. The application consists of a web tier, application 
   tier, and database tier. The company wants to ensure the application 
   can handle traffic spikes while minimizing costs. Which solution 
   meets these requirements?"

   Tests: Service selection, architecture design, trade-off analysis

2. KNOWLEDGE-BASED (20% of exam):
   "Which AWS service provides a fully managed NoSQL database service 
   that offers single-digit millisecond performance at any scale?"

   Tests: Service knowledge, capabilities, use cases

3. TROUBLESHOOTING (10% of exam):
   "An application deployed in a private subnet cannot access the internet. 
   The VPC has an internet gateway attached. What is the most likely cause?"

   Tests: Problem diagnosis, configuration issues, debugging skills

Scoring Methodology:

- 65 questions total
- 15 unscored questions (pilot questions for future exams)
- 50 scored questions
- Each question weighted equally
- Raw score converted to scaled score (100-1000)
- Passing: 720/1000 (approximately 36/50 correct = 72%)

Unscored Questions:
- Cannot identify which questions are unscored
- Treat every question as scored
- AWS tests new questions before adding to scored bank

Score Report:
- Overall score (720+ = pass)
- Domain-level performance (scaled 1-5)
- Does NOT show which questions missed
- Detailed feedback on strengths/weaknesses per domain

Example Score Report:
Overall Score: 785 (PASS)

Domain 1 (Secure Architectures): 4.2/5
Domain 2 (Resilient Architectures): 3.8/5
Domain 3 (High-Performing): 4.5/5
Domain 4 (Cost-Optimized): 3.5/5

Interpretation:
- Strong in security and performance
- Need improvement in resilience and cost optimization
```


### Domain 1: Design Secure Architectures (30%)

**Security-Focused Architecture Patterns:**

```
Key Topics:

1. IAM BEST PRACTICES:
   - Principle of least privilege
   - IAM roles vs users
   - IAM policies (managed vs inline)
   - Cross-account access
   - Identity federation
   - MFA requirements

Exam Question Pattern:
"A company needs to grant temporary access to AWS resources for 
external contractors. What is the MOST secure approach?"

A) Create IAM users with programmatic access
B) Use IAM roles with temporary security credentials ✓
C) Share root account credentials
D) Use long-term access keys

Why B: Roles provide temporary credentials, no long-term secrets
Why not A: Users create permanent credentials (security risk)
Why not C: Never share root account
Why not D: Long-term keys are security anti-pattern

2. DATA ENCRYPTION:
   - Encryption at rest (EBS, S3, RDS)
   - Encryption in transit (TLS, VPN)
   - Key management (KMS, CloudHSM)
   - Certificate management (ACM)

Exam Scenario:
"A healthcare company must encrypt all data at rest and in transit 
to comply with HIPAA. Which services should be used?"

Solution:
- S3: Server-side encryption with KMS
- EBS: Encrypted volumes with KMS
- RDS: Encryption enabled with KMS
- ALB: HTTPS listeners with ACM certificates
- VPN: Site-to-Site VPN for on-premises connectivity

3. NETWORK SECURITY:
   - Security Groups (stateful)
   - NACLs (stateless)
   - VPC Flow Logs
   - AWS WAF
   - AWS Shield

Common Question:
"An application in a private subnet needs to access S3. The company 
wants to ensure traffic doesn't traverse the internet. What solution 
should be implemented?"

A) NAT Gateway
B) Internet Gateway
C) VPC Endpoint (Gateway) ✓
D) Direct Connect

Why C: VPC Endpoint keeps S3 traffic within AWS network
Why not A: NAT Gateway routes through internet (less secure)
Why not B: Internet Gateway exposes resources publicly
Why not D: Direct Connect is for on-premises, not S3

4. DETECTIVE CONTROLS:
   - CloudTrail (audit logging)
   - CloudWatch Logs
   - AWS Config (compliance)
   - GuardDuty (threat detection)
   - Security Hub (central view)

Scenario:
"A security team needs to detect unusual API activity and potential 
compromised credentials. Which service should be used?"

Answer: GuardDuty - ML-based threat detection

5. INFRASTRUCTURE PROTECTION:
   - Bastion hosts (jump boxes)
   - Systems Manager Session Manager
   - Private subnets
   - VPN connections
   - Direct Connect

Question Pattern:
"A company wants to eliminate SSH key management for EC2 instances 
while maintaining secure administrative access. What solution meets 
this requirement?"

Answer: AWS Systems Manager Session Manager
- No SSH keys needed
- Centralized access control through IAM
- Session logging for audit
- No bastion host required

Key Security Concepts for Exam:

Defense in Depth:
Layer 1: Network (Security Groups, NACLs)
Layer 2: Compute (Patched AMIs, Systems Manager)
Layer 3: Application (WAF, input validation)
Layer 4: Data (Encryption with KMS)
Layer 5: Identity (IAM, MFA, Federation)

Shared Responsibility Model:
AWS Responsible:
- Physical security
- Hypervisor security
- Network infrastructure
- Managed service security

Customer Responsible:
- OS patching (EC2)
- Application security
- Data encryption
- IAM configuration
- Security Groups/NACLs

Exam tests: Knowing what YOU control vs AWS controls

S3 Security Patterns:

Question: "How to prevent accidental public exposure of S3 data?"

Solutions:
1. S3 Block Public Access (account-level setting)
2. Bucket policies denying public access
3. IAM policies limiting PutBucketPolicy
4. S3 Object Lock for immutability
5. VPC Endpoint for private access

Exam might present scenario requiring multiple layers

IAM Policy Evaluation:

Order of evaluation:
1. Explicit DENY (always wins)
2. Explicit ALLOW
3. Implicit DENY (default)

Scenario:
"A user has AdministratorAccess policy attached but there's an SCP 
denying ec2:TerminateInstances. Can the user terminate instances?"

Answer: NO - SCP Deny overrides IAM Allow
```


### Domain 2: Design Resilient Architectures (26%)

**High Availability and Fault Tolerance:**

```
Key Topics:

1. MULTI-AZ DEPLOYMENTS:
   - RDS Multi-AZ (synchronous replication)
   - Aurora replicas (asynchronous)
   - EFS (multi-AZ by default)
   - S3 (multi-AZ by default)
   - Auto Scaling across AZs

Typical Question:
"A database must have automatic failover with zero data loss. 
Which solution meets this requirement?"

A) RDS Multi-AZ ✓
B) RDS Read Replica
C) DynamoDB with on-demand backup
D) Aurora with single instance

Why A: Multi-AZ provides automatic failover with synchronous replication
Why not B: Read Replicas are asynchronous (some data loss possible)
Why not C: Backup requires manual restore (downtime)
Why not D: Single instance = no redundancy

2. AUTO SCALING:
   - EC2 Auto Scaling
   - Application Auto Scaling
   - Target tracking policies
   - Scheduled scaling
   - Predictive scaling

Scenario:
"A web application experiences predictable traffic increase every 
Monday at 9 AM. How can the architecture automatically handle this?"

Answer: Scheduled scaling policy
- Scale out before 9 AM (proactive)
- Scale in after peak (cost optimization)
- Predictable pattern = scheduled scaling appropriate

3. LOAD BALANCING:
   - Application Load Balancer (Layer 7)
   - Network Load Balancer (Layer 4)
   - Gateway Load Balancer (Layer 3)
   - Health checks
   - Cross-zone load balancing

Question Pattern:
"An application requires WebSocket support and TLS termination. 
Which load balancer should be used?"

Answer: Application Load Balancer
- Supports WebSocket (persistent connections)
- Handles TLS termination
- Layer 7 routing capabilities

4. DECOUPLING:
   - SQS (queuing)
   - SNS (pub/sub)
   - EventBridge (event routing)
   - Step Functions (orchestration)
   - Kinesis (streaming)

Common Scenario:
"A monolithic application experiences failures when traffic spikes 
overwhelm the processing tier. How can the architecture be improved?"

Solution: Decouple with SQS
- Web tier → SQS queue → Processing tier
- Queue absorbs traffic bursts
- Processing tier scales independently
- Failed messages automatically retry

5. DISASTER RECOVERY:
   - Backup and Restore (RPO hours, RTO hours)
   - Pilot Light (RPO minutes, RTO hours)
   - Warm Standby (RPO seconds, RTO minutes)
   - Multi-Site (RPO seconds, RTO seconds)

Exam Scenario:
"A company needs to recover from disasters within 1 hour and lose 
no more than 15 minutes of data. Which DR strategy is appropriate?"

Answer: Warm Standby
- RPO: 15 minutes (continuous replication)
- RTO: 1 hour (scale up standby infrastructure)

Not Pilot Light: RTO would be 2-4 hours
Not Multi-Site: Overkill (and expensive) for 1-hour RTO

Resilience Design Patterns:

PATTERN 1: Stateless Applications
- Store session data in ElastiCache or DynamoDB
- Instances easily replaceable
- Auto Scaling works seamlessly

PATTERN 2: Loose Coupling
- Services communicate via queues/events
- Failure isolated to single service
- Independent scaling

PATTERN 3: Graceful Degradation
- Non-critical features fail gracefully
- Core functionality remains available
- Example: Product recommendations fail → Show products anyway

PATTERN 4: Retry with Exponential Backoff
- Transient failures handled automatically
- Prevents overwhelming failed service
- SDK implements automatically

Route 53 Patterns:

Failover Routing:
Primary: us-east-1 (active)
Secondary: us-west-2 (standby)

Health check monitors primary
Automatic failover to secondary if unhealthy

Geolocation Routing:
US users → us-east-1
EU users → eu-west-1
Asia users → ap-southeast-1

Latency-based Routing:
User routed to lowest latency region

Weighted Routing:
90% → Current version
10% → New version (canary testing)

Exam tests: Choosing correct routing policy for scenario

Common Exam Scenarios:

1. "Application must survive AZ failure"
   Solution: Deploy across multiple AZs with Auto Scaling

2. "Database must have automatic failover"
   Solution: RDS Multi-AZ or Aurora

3. "Handle unpredictable traffic spikes"
   Solution: Auto Scaling + SQS decoupling

4. "Minimize blast radius of failures"
   Solution: Microservices with separate Auto Scaling groups

5. "Cache frequently accessed data"
   Solution: ElastiCache (Redis or Memcached)

6. "Process messages asynchronously"
   Solution: SQS queue with Lambda or EC2 processors

Storage Resilience:

S3:
- 99.999999999% durability (11 nines)
- Cross-region replication for DR
- Versioning for data protection

EBS:
- Snapshots to S3 (durable)
- Volume can be restored in any AZ
- Encrypted snapshots for security

EFS:
- Multi-AZ by default
- Automatic replication
- Mount from multiple instances

Exam Focus: Understanding durability vs availability
Durability = data won't be lost
Availability = data can be accessed now
```


### Domain 3: Design High-Performing Architectures (24%)

**Performance Optimization Patterns:**

```
Key Topics:

1. COMPUTE OPTIMIZATION:
   - Instance types (C, M, R, T families)
   - Spot Instances (cost vs availability trade-off)
   - Lambda (serverless)
   - Containers (ECS/EKS)

Question Type:
"A batch processing job runs for 2 hours daily and can tolerate 
interruptions. Which compute option optimizes cost?"

A) On-Demand Instances
B) Reserved Instances
C) Spot Instances ✓
D) Lambda

Why C: Spot = 90% cost savings, interruptions acceptable for batch
Why not A: On-Demand most expensive
Why not B: Reserved for predictable steady-state workload
Why not D: Lambda has 15-minute timeout (job takes 2 hours)

2. STORAGE PERFORMANCE:
   - EBS volume types (gp3, io2, st1, sc1)
   - EFS performance modes
   - S3 Transfer Acceleration
   - Instance store (ephemeral)

Scenario:
"A database requires 50,000 IOPS consistently. Which storage 
solution meets this requirement?"

Answer: EBS io2 volumes
- Up to 64,000 IOPS per volume
- Consistent performance
- Durability

Not gp3: Max 16,000 IOPS
Not EFS: Network latency, lower IOPS
Not Instance Store: Data lost on stop

3. DATABASE PERFORMANCE:
   - RDS Read Replicas (read scaling)
   - Aurora Global Database (multi-region)
   - DynamoDB (auto-scaling)
   - ElastiCache (caching layer)

Common Question:
"A web application experiences slow database queries due to high 
read traffic. Write traffic is low. How can performance be improved?"

Solution: RDS Read Replicas
- Offload read traffic from primary
- Up to 5 replicas
- Asynchronous replication

Alternative: Add ElastiCache
- Cache frequent queries
- Sub-millisecond latency
- Reduce database load

4. CONTENT DELIVERY:
   - CloudFront (CDN)
   - S3 Transfer Acceleration
   - Global Accelerator
   - Edge locations

Scenario:
"A company serves static content globally. Users in Asia experience 
slow load times. How can performance be improved?"

Answer: CloudFront distribution
- Cache content at edge locations near users
- 200+ edge locations worldwide
- Reduce latency dramatically

5. NETWORKING PERFORMANCE:
   - Enhanced networking (SR-IOV)
   - Placement groups (cluster, spread, partition)
   - VPC endpoints (reduce latency)
   - Direct Connect (consistent bandwidth)

Question:
"A high-performance computing cluster requires lowest latency 
communication between instances. What should be implemented?"

Answer: Cluster placement group
- Instances in single AZ
- Low-latency, high-throughput networking
- Enhanced networking enabled

Performance Patterns:

CACHING STRATEGIES:

CloudFront:
- Cache static content (images, CSS, JS)
- TTL: Hours to days
- Global distribution

ElastiCache:
- Cache database queries
- Session data
- TTL: Minutes to hours

DynamoDB Accelerator (DAX):
- Cache DynamoDB reads
- Microsecond latency
- Fully managed

Caching Decision Tree:
└─ Static content? → CloudFront
└─ Database queries? → ElastiCache
└─ DynamoDB reads? → DAX
└─ API responses? → API Gateway cache

SCALING STRATEGIES:

Vertical Scaling (Scale Up):
- Larger instance type
- Requires downtime
- Hardware limits

Horizontal Scaling (Scale Out):
- More instances
- No downtime (with Auto Scaling)
- Unlimited scale

Exam prefers: Horizontal scaling (resilient + scalable)

READ SCALING:

Patterns:
1. Read Replicas (RDS/Aurora)
2. ElastiCache (frequent queries)
3. CloudFront (static content)
4. DynamoDB (automatic scaling)

Scenario:
"95% of database traffic is reads, 5% writes. How to scale reads?"

Answer: Combination approach
- Read replicas for database queries
- ElastiCache for most frequent queries
- CloudFront for static content

WRITE SCALING:

RDS:
- Vertical scaling (larger instance)
- Aurora: Write endpoints scale automatically

DynamoDB:
- Horizontal scaling (partitioning)
- Provisioned or on-demand capacity

Scenario:
"Application needs to handle 100K writes/second to database"

Answer: DynamoDB with on-demand capacity
- Auto-scales to handle traffic
- No provisioning needed
- Single-digit millisecond latency

Not RDS: Limited to single instance write capacity

Storage Performance Selection:

Use Case → Storage Type

High IOPS database: io2 Block Express (256,000 IOPS)
Balanced performance: gp3 (16,000 IOPS, configurable)
Throughput-intensive: st1 (HDD, 500 MB/s)
Cold data: sc1 (HDD, 250 MB/s, lowest cost)
Temporary data: Instance store (highest performance)

Shared file system: EFS (NFS, multi-attach)
Object storage: S3 (11 nines durability)

Exam tests: Matching requirements to storage type

Network Performance:

Enhanced Networking:
- Up to 100 Gbps bandwidth
- Enabled by default on modern instances
- SR-IOV technology

Placement Groups:
Cluster: Lowest latency (HPC)
Spread: Highest availability (max 7 instances per AZ)
Partition: Balance (large distributed systems)

VPC Endpoints:
- S3/DynamoDB: Gateway endpoints (no cost)
- Other services: Interface endpoints (hourly cost)
- Keeps traffic within AWS network

Lambda Performance:

Cold Start Optimization:
- Provisioned concurrency (instances always warm)
- Smaller deployment packages
- Optimize initialization code

Memory Configuration:
- 128 MB to 10 GB
- CPU scales with memory
- More memory = faster execution (but higher cost)

Scenario:
"Lambda function has inconsistent latency (sometimes 3 seconds, 
usually 100ms). What causes this?"

Answer: Cold starts
Solution: Provisioned concurrency for consistent latency
```


### Domain 4: Design Cost-Optimized Architectures (20%)

**Cost Optimization Patterns:**

```
Key Topics:

1. COMPUTE COST OPTIMIZATION:

Reserved Instances vs Savings Plans:

Reserved Instances:
- 1 or 3 year commitment
- Up to 72% off On-Demand
- Types: Standard (specific instance), Convertible (flexible)
- Standard RI: Highest discount, least flexible
- Convertible RI: Lower discount, can change family/OS/tenancy
- Scope: Regional (flexible AZ) or Zonal (AZ-specific, capacity reservation)

Savings Plans:
- Compute Savings Plans: Most flexible (Lambda, Fargate, EC2)
- EC2 Savings Plans: Specific instance family, any size/OS/AZ
- 1 or 3 year term, hourly spend commitment
- Up to 66% off (Compute) or 72% off (EC2)

Spot Instances:
- Up to 90% off On-Demand
- Can be interrupted (2-minute warning)
- Best for: Batch jobs, CI/CD, stateless apps, big data
- NOT for: Databases, time-sensitive critical workloads

Decision Framework:
- Steady 24/7 workload → Reserved Instances or Savings Plans
- Variable but predictable → Savings Plans
- Fault-tolerant, interruptible → Spot Instances
- Short-lived, unpredictable → On-Demand
- Development/test environments → Scheduled RI or stop instances

Exam Question:
"A company has a web application that runs 24/7 for the past
year and expects steady growth. What is the MOST cost-effective
compute pricing option?"

A) On-Demand Instances
B) Spot Instances
C) 1-year Reserved Instances ✓
D) 3-year Reserved Instances

Why C: Steady 24/7 = Reserved Instances; 1-year is safer
than 3-year if requirements may change.

2. STORAGE COST OPTIMIZATION:

S3 Storage Classes Decision Tree:

Accessed < 3 months → S3 Standard
Access pattern unknown → S3 Intelligent-Tiering
Accessed > 30 days apart → S3 Standard-IA or One Zone-IA
Rarely accessed, instant access needed → S3 Glacier Instant
Archive, OK to wait minutes-hours → S3 Glacier Flexible
Long-term archive, OK to wait 12 hours → S3 Glacier Deep Archive

Lifecycle Policy Example (exam favorite):

Day 0: Upload to S3 Standard
Day 30: Transition to S3 Standard-IA (minimum 30 days)
Day 90: Transition to S3 Glacier Flexible
Day 365: Expire (delete)

Note: Minimum storage durations matter for cost:
- S3 Standard-IA: 30 days minimum
- S3 Glacier Instant: 90 days minimum
- S3 Glacier Flexible: 90 days minimum
- S3 Glacier Deep Archive: 180 days minimum
Early deletion charges apply!

EBS Cost Optimization:
- gp3 vs gp2: gp3 is 20% cheaper and allows independent IOPS/throughput scaling
- Delete unattached volumes (common cost leak)
- Use Snapshots instead of full volume copies
- Snapshot lifecycle policies for automatic cleanup

Scenario:
"A company stores application logs. Logs are analyzed within the
first week, then archived for compliance for 7 years. Which
S3 configuration minimizes cost?"

Solution:
- Day 0-7: S3 Standard (frequent access)
- Day 7-30: S3 Standard-IA (note: must wait 30 days minimum)
- Day 30+: S3 Glacier Deep Archive ($0.00099/GB)
- Year 7: Lifecycle expiration rule

3. DATABASE COST OPTIMIZATION:

RDS:
- Use db.t3/t4g for dev/test (burstable)
- Stop instances during off-hours (dev/test only)
- Reserved DB Instances: Up to 69% discount
- Use Aurora Serverless v2 for variable workloads
- Read Replicas: Only when read scaling needed

DynamoDB:
- On-demand vs Provisioned comparison:
  On-demand: $1.25/million writes, $0.25/million reads
  Provisioned: $0.00065/WCU/hr, $0.00013/RCU/hr
- Provisioned is ~80% cheaper at steady load
- On-demand: Variable/unpredictable traffic
- Provisioned + Auto Scaling: Best for predictable

4. NETWORK COST OPTIMIZATION:

Data Transfer Pricing:
- Inbound from internet: FREE
- Outbound to internet: $0.09/GB (first 10 TB)
- Between AZs (same region): $0.01/GB each way
- Between regions: $0.02/GB
- To CloudFront: FREE (origin fetch from S3/EC2)

Cost Reduction Strategies:
- Use CloudFront → reduces EC2/S3 outbound costs
- VPC Endpoints for S3/DynamoDB → eliminate NAT Gateway data cost
- Compress data before transfer
- Minimize cross-AZ traffic (deploy services in same AZ when possible)
- Use S3 for large data transfers vs EBS

Exam Scenario:
"EC2 instances in a private subnet frequently access S3. Currently
they use a NAT Gateway. How can the company reduce data transfer
costs with LEAST operational overhead?"

Answer: Create an S3 Gateway VPC Endpoint
- S3 and DynamoDB Gateway endpoints: FREE
- Eliminates NAT Gateway data processing fees ($0.045/GB)
- No code changes needed

5. SERVERLESS COST OPTIMIZATION:

Lambda:
- Pay only when code runs (zero cost when idle)
- Right-size memory (CPU scales with memory)
- Use ARM64 (Graviton2): 20% cheaper, 19% better performance
- Optimize code duration (cost = requests × duration × memory)
- Reserved concurrency: Avoid unexpected scaling costs

Fargate:
- Fargate Spot: 70% discount (for fault-tolerant workloads)
- ARM64: 20% cheaper than x86
- Right-size vCPU/memory configuration

6. COST MONITORING TOOLS:

AWS Cost Explorer:
- Visualize and analyze costs over time
- Right-sizing recommendations for EC2
- Reserved Instance utilization reports
- Forecast future costs

AWS Budgets:
- Set cost/usage/RI/Savings Plans budgets
- Alerts when thresholds breached
- Automated actions (e.g., stop instances)

AWS Cost and Usage Report (CUR):
- Most granular cost data (hourly, resource-level)
- Delivered to S3, queryable with Athena
- Source of truth for detailed billing analysis

AWS Compute Optimizer:
- ML-powered right-sizing recommendations
- Covers EC2, ASG, EBS, Lambda, ECS on Fargate
- Identifies over-provisioned and under-provisioned resources

Trusted Advisor:
- Checks for cost optimization opportunities
- Idle EC2 instances, underutilized EBS, unused EIPs
- Business/Enterprise support: All checks available

Common Exam Patterns for Cost Domain:

1. "Reduce cost with minimal changes" → Right-sizing, Savings Plans
2. "Most cost-effective for variable workload" → Lambda or Spot
3. "Cost-effective storage for rarely accessed" → Glacier Deep Archive
4. "Reduce data transfer cost" → VPC Endpoints, CloudFront
5. "Monitor and alert on costs" → AWS Budgets
6. "Detailed cost analysis" → Cost and Usage Report + Athena
```


### Critical Service Comparisons (Exam Favorites)

```
SQS vs SNS vs EventBridge:

SQS (Queue):
- Pull-based (consumers poll)
- One consumer per message
- Message retention: up to 14 days
- Use: Decouple producers/consumers, buffer writes
- FIFO: Exactly-once, ordered (300 TPS, or 3000 with batching)
- Standard: At-least-once, best-effort ordering (unlimited TPS)

SNS (Topic):
- Push-based (fan-out)
- Multiple subscribers
- No persistence (messages not retained)
- Use: Fan-out to multiple endpoints (SQS, Lambda, HTTP, Email)
- SNS + SQS = Fan-out pattern (fan out then queue)

EventBridge:
- Event routing with rules/filtering
- Content-based routing (filter on event fields)
- 270+ AWS services as sources
- Scheduled events (cron-like)
- Use: Microservices event bus, SaaS integration, scheduling

Exam: "How to send same message to multiple SQS queues?"
Answer: SNS → multiple SQS subscribers (fan-out pattern)

---

ALB vs NLB vs CLB:

Application Load Balancer (ALB) - Layer 7:
- HTTP/HTTPS/gRPC/WebSocket
- Content-based routing (path, host, headers, query params)
- Supports Lambda targets
- Slow rollout: Weighted target groups (canary deploys)
- Use: Web applications, microservices, REST APIs

Network Load Balancer (NLB) - Layer 4:
- TCP/UDP/TLS
- Ultra-high performance (millions of requests/sec)
- Static IP per AZ (or use Elastic IP)
- Preserves source IP
- Use: Real-time gaming, IoT, financial trading, VoIP

Classic Load Balancer (CLB) - Legacy:
- Layer 4 + basic Layer 7
- DO NOT use for new designs
- Only on older EC2-Classic platform

Gateway Load Balancer (GWLB) - Layer 3:
- Deploy/scale virtual appliances (firewalls, IDS/IPS)
- GENEVE protocol (port 6081)
- Exam tip: Always paired with 3rd-party security appliances

---

RDS vs Aurora vs DynamoDB:

RDS:
- Traditional relational (MySQL, PostgreSQL, SQL Server, Oracle, MariaDB)
- Familiar SQL
- Multi-AZ: Synchronous standby
- Read Replicas: Up to 5 (async)
- Best for: Lift-and-shift migrations, existing RDBMS workloads

Aurora:
- MySQL/PostgreSQL-compatible AWS-built engine
- 5× MySQL, 3× PostgreSQL performance
- 6 copies in 3 AZs (storage layer)
- Up to 15 Read Replicas (fast promotion)
- Aurora Global DB: < 1 second cross-region replication
- Aurora Serverless v2: Auto-scales from 0.5 to 128 ACUs
- Best for: New high-performance workloads, variable traffic

DynamoDB:
- NoSQL (key-value + document)
- Infinite horizontal scale
- Single-digit ms latency
- Global Tables: Multi-region active-active
- Best for: Massive scale, flexible schema, gaming, IoT, sessions

Exam Rule:
- Needs SQL / joins / ACID → RDS or Aurora
- Need massive scale / flexible schema → DynamoDB
- Existing MySQL/PostgreSQL → Aurora (for best performance)
- Variable workload + serverless → Aurora Serverless v2

---

CloudFront vs Global Accelerator:

CloudFront:
- CDN: Caches HTTP/S content at edge
- Best for: Static assets, web pages, video, APIs with caching
- Works via HTTP/HTTPS
- Reduces origin load through caching
- Supports Lambda@Edge and CloudFront Functions

Global Accelerator:
- Network optimization: Routes TCP/UDP over AWS backbone
- Best for: Non-cacheable content, gaming, real-time apps
- Static anycast IPs (2 per accelerator)
- Automatic failover between regions (< 30 seconds)
- Does NOT cache

Memory Trick:
- CloudFront = Caching CDN (HTTP)
- Global Accelerator = Network shortcut (any TCP/UDP)
```


### 2025 SAA-C03 Hot Topics

```
These topics have increased weight in recent SAA-C03 exams:

1. SERVERLESS ARCHITECTURES:
   - API Gateway + Lambda + DynamoDB pattern
   - Lambda function URLs (direct HTTPS endpoint, no API Gateway)
   - EventBridge Pipes (point-to-point event integrations)
   - AWS Step Functions (orchestration vs SQS/SNS choreography)

2. CONTAINERS:
   - ECS on Fargate (serverless containers - exam favorite)
   - EKS (Kubernetes) vs ECS comparison
   - ECR (Elastic Container Registry) for image storage
   - ECS Service Connect (service mesh without extra tools)

3. ANALYTICS:
   - AWS Glue (ETL): Serverless Spark jobs, crawlers, data catalog
   - Amazon Athena: Query S3 with SQL (no infrastructure)
   - Amazon OpenSearch Service: Full-text search, log analytics
   - AWS Lake Formation: Build data lakes, fine-grained access control
   - Amazon Kinesis: Real-time streaming
     - Data Streams: Raw data ingestion (shard-based)
     - Data Firehose: Delivery to S3/Redshift/OpenSearch (no consumer code)
     - Data Analytics: SQL on streaming data (deprecated - use Flink)

4. MIGRATION SERVICES:
   - AWS DMS (Database Migration Service): Migrate databases with minimal downtime
   - AWS SCT (Schema Conversion Tool): Convert schema from Oracle/SQL Server to Aurora/PostgreSQL
   - AWS MGN (Application Migration Service): Lift-and-shift servers
   - AWS DataSync: Accelerated data transfer (NFS, SMB → S3/EFS/FSx)
   - AWS Transfer Family: SFTP/FTP/FTPS to S3 or EFS
   - Snow Family: Offline large data transfers
     - Snowcone: 8 TB, small/portable
     - Snowball Edge: 80 TB, compute capabilities
     - Snowmobile: Up to 100 PB, truck

5. SECURITY (Always high priority):
   - Amazon Macie: Sensitive data discovery in S3 (PII, PHI)
   - Amazon GuardDuty: Threat detection (CloudTrail, VPC Flow Logs, DNS)
   - AWS Security Hub: Centralized security findings
   - AWS Inspector: Vulnerability scanning (EC2, ECR, Lambda)
   - AWS Detective: Security investigation (root cause analysis)
   - Amazon Cognito: User authentication for apps
     - User Pools: Authentication (login)
     - Identity Pools: Authorization (AWS credentials)

6. STORAGE (New options):
   - Amazon FSx for Windows File Server: SMB, AD integration
   - Amazon FSx for Lustre: HPC, ML, high-performance POSIX
   - Amazon FSx for NetApp ONTAP: Multi-protocol, data management
   - Amazon FSx for OpenZFS: Linux workloads, ZFS features
   - AWS Backup: Centralized backup across services

7. NETWORKING (Advanced):
   - AWS PrivateLink: Expose services privately (no VPC peering needed)
   - AWS Transit Gateway: Hub-and-spoke for hundreds of VPCs
   - VPC Lattice (NEW 2024): Application networking for microservices
   - AWS Network Firewall: Managed stateful firewall for VPCs
   - Route 53 Resolver DNS Firewall: Block malicious DNS queries
```


### Exam Question Walkthrough: Decision Framework

```
STEP 1: Identify key requirements
- Functional: What must the solution DO?
- Non-functional: Availability, latency, throughput, scale?
- Constraints: Cost, compliance, existing infrastructure?

STEP 2: Look for qualifier words
- "MOST cost-effective" → Eliminate over-engineered answers
- "LEAST operational overhead" → Prefer managed/serverless
- "MINIMUM downtime" → Look for hot-swap patterns
- "Highly available" → Multi-AZ minimum
- "Fault tolerant" → Multi-region or redundancy
- "Scalable" → Auto Scaling, serverless, or NoSQL
- "Secure" → IAM, encryption, VPC, private subnets
- "Near real-time" → Kinesis, DynamoDB Streams

STEP 3: Eliminate wrong answers
- Root account usage → Always wrong
- Single AZ for "highly available" → Always wrong
- EC2 for "no management overhead" with better option available → Wrong
- Storing secrets in environment variables in plaintext → Wrong
- SSH keys managed manually when SSM available → Usually wrong

STEP 4: Select the BEST remaining answer
Common trade-off pairs:
- Simple + managed (Lambda) vs Complex + flexible (EC2)
- Serverless + cost (pay per use) vs Reserved + predictability
- Eventual consistency + performance (DynamoDB) vs Strong consistency + familiar (RDS)

Example Analysis:
"A startup runs a REST API. Traffic is unpredictable (0 to 10,000
requests/sec). The team is small and wants minimal infrastructure
management. What is the MOST cost-effective architecture?"

Options:
A) EC2 Auto Scaling + ALB
B) ECS on Fargate + ALB  
C) API Gateway + Lambda ✓
D) EC2 Reserved Instances

Analysis:
- A: Must manage EC2, scales slower, costs even at zero traffic
- B: Better than A, but still has idle Fargate task cost
- C: True serverless, scales to zero, pay per request, zero infra management
- D: Reserved = fixed cost regardless of traffic = bad for unpredictable
Winner: C - fits "unpredictable traffic + minimal management + cost-effective"
```


## Practice Exam Questions (50 Questions)

### Security Domain (Questions 1-15)

**Q1.** A company needs to allow EC2 instances in a private subnet to access S3 without sending traffic over the internet. What is the MOST cost-effective solution?

A) Deploy a NAT Gateway
B) Create a VPC Gateway Endpoint for S3
C) Create a VPC Interface Endpoint for S3
D) Use S3 Transfer Acceleration

**Answer: B** — Gateway Endpoints for S3 and DynamoDB are free. Interface Endpoints (C) have hourly costs. NAT Gateway (A) works but incurs data processing fees.

---

**Q2.** A developer accidentally committed AWS access keys to a public GitHub repository. What should be done FIRST?

A) Delete the GitHub repository
B) Immediately deactivate and delete the exposed access keys
C) Enable MFA on the IAM user
D) Rotate the password for the IAM user

**Answer: B** — Deactivating and deleting the keys immediately stops any unauthorized usage. The keys are compromised the moment they are public.

---

**Q3.** A company stores sensitive customer data in S3. They need to detect if any S3 buckets become publicly accessible. Which service meets this requirement with LEAST operational overhead?

A) AWS Config with s3-bucket-public-read-prohibited rule
B) Amazon Inspector
C) Amazon GuardDuty
D) AWS CloudTrail

**Answer: A** — AWS Config continuously evaluates S3 bucket policies against the rule and flags violations. Inspector (B) is for vulnerability scanning. GuardDuty (C) detects threats but not configuration issues. CloudTrail (D) logs API calls but doesn't evaluate compliance.

---

**Q4.** An application on EC2 needs to call AWS services. What is the MOST secure way to provide AWS credentials?

A) Store credentials in a .env file on the instance
B) Hardcode credentials in the application code
C) Attach an IAM role to the EC2 instance
D) Pass credentials as environment variables at launch

**Answer: C** — IAM roles provide automatic temporary credential rotation, no hardcoded secrets, and follow least privilege.

---

**Q5.** A web application needs protection from SQL injection and cross-site scripting attacks. Which service provides this?

A) AWS Shield
B) AWS WAF
C) Security Groups
D) Network ACLs

**Answer: B** — AWS WAF inspects HTTP requests and can block based on rules (SQLi, XSS, IP, geo). Shield (A) is for DDoS. Security Groups and NACLs (C/D) operate at network layer, not application layer.

---

**Q6.** A company uses a multi-account AWS Organizations setup. They need to prevent ALL member accounts from disabling CloudTrail. What should they implement?

A) IAM policies in each account denying cloudtrail:StopLogging
B) A Service Control Policy (SCP) denying cloudtrail:StopLogging
C) AWS Config rule requiring CloudTrail to be enabled
D) Enable AWS Security Hub across all accounts

**Answer: B** — SCPs apply across all member accounts in an OU/organization, overriding local IAM policies. IAM policies (A) can be overridden by account administrators.

---

**Q7.** A company needs to centrally manage secrets (database passwords, API keys) and automatically rotate them every 30 days. Which service meets this requirement?

A) AWS Systems Manager Parameter Store (Standard)
B) AWS Secrets Manager
C) AWS KMS
D) AWS Certificate Manager

**Answer: B** — Secrets Manager supports automatic secret rotation with Lambda. Parameter Store (A) can store secrets but does NOT natively rotate them. KMS (C) is for encryption keys, not application secrets. ACM (D) manages TLS certificates.

---

**Q8.** An application uses SAML 2.0 federation. Corporate users authenticate to Active Directory, then access AWS. What type of IAM identity does the user receive?

A) An IAM User
B) An IAM Group membership
C) Temporary credentials from STS via an IAM Role
D) Root account access

**Answer: C** — SAML federation issues temporary credentials via STS AssumeRoleWithSAML, tied to an IAM Role. No IAM users are created.

---

**Q9.** Which combination of S3 features prevents an object from being deleted for a defined retention period even by the bucket owner?

A) Versioning + MFA Delete
B) S3 Object Lock in Compliance Mode
C) S3 Object Lock in Governance Mode
D) Bucket Policy denying s3:DeleteObject

**Answer: B** — Compliance Mode Object Lock cannot be overridden by ANY user including root. Governance Mode (C) can be overridden by users with special permissions. Bucket Policy (D) can be modified by bucket owner.

---

**Q10.** A Lambda function must access a secret stored in AWS Secrets Manager. What is required for this to work?

A) The Lambda function must be in the same VPC as Secrets Manager
B) The Lambda execution role must have secretsmanager:GetSecretValue permission
C) The Lambda function must have a public IP address
D) Secrets Manager must be configured with a resource policy

**Answer: B** — Lambda uses its execution role for API calls. The role needs the appropriate IAM permission. Secrets Manager is a regional service accessible via the internet or VPC endpoint.

---

**Q11.** A company wants to detect compromised EC2 instances that are communicating with known cryptocurrency mining servers. Which service provides this capability?

A) AWS Config
B) Amazon Inspector
C) Amazon GuardDuty
D) AWS Security Hub

**Answer: C** — GuardDuty uses threat intelligence feeds (including crypto-mining domain lists) and analyzes VPC Flow Logs and DNS logs to detect such behavior. Inspector (B) checks for vulnerabilities but not runtime behavior.

---

**Q12.** A company needs to restrict EC2 API calls to specific source IP ranges for all users across the organization. What is the MOST efficient approach?

A) Add IP conditions to every IAM policy
B) Attach an SCP with an IP condition to the organization root
C) Configure VPC Security Groups
D) Enable AWS Config managed rules

**Answer: B** — SCPs at the organization root apply to all accounts. Adding conditions to every IAM policy (A) is operationally expensive and error-prone.

---

**Q13.** What is the difference between Security Groups and Network ACLs?

A) Security Groups are stateful; NACLs are stateless
B) NACLs are stateful; Security Groups are stateless
C) Security Groups apply at the subnet level; NACLs at the instance level
D) Both are stateful

**Answer: A** — Security Groups are stateful (return traffic automatically allowed). NACLs are stateless (must explicitly allow both inbound AND outbound). Security Groups are instance-level; NACLs are subnet-level.

---

**Q14.** A bastion host in a public subnet is used to SSH into private EC2 instances. The company wants to eliminate the bastion host and improve security. What is the recommended replacement?

A) Direct Connect
B) AWS Systems Manager Session Manager
C) EC2 Instance Connect
D) VPN connection

**Answer: B** — Session Manager provides secure shell access without opening port 22, requires no bastion host, uses IAM for access control, and logs sessions to CloudWatch. EC2 Instance Connect (C) still requires port 22 open.

---

**Q15.** A company needs to encrypt data in S3 using keys they manage in their own HSM. Which encryption method should be used?

A) SSE-S3
B) SSE-KMS with AWS managed keys
C) SSE-KMS with customer managed keys in CloudHSM
D) SSE-C (Server-Side Encryption with Customer-Provided Keys)

**Answer: C** — CloudHSM provides dedicated hardware HSM where the customer has exclusive access to keys. SSE-KMS with CMK integrates CloudHSM-backed keys. SSE-C (D) requires passing keys in each request (operational overhead).

---

### Resilience Domain (Questions 16-30)

**Q16.** A company runs a web application with Auto Scaling. During a recent AZ failure, the application experienced reduced capacity. The application currently uses 6 instances across 3 AZs. What is the BEST configuration to tolerate an AZ failure without performance degradation?

A) Maintain 6 instances, minimum 2 per AZ
B) Maintain 9 instances, 3 per AZ
C) Maintain 6 instances spread across 2 AZs
D) Use a single large instance instead

**Answer: B** — To handle one AZ failure with no degradation, each surviving AZ must handle full load. With 3 AZs and desired capacity of 9, if one AZ fails, the remaining 2 AZs have 6 instances = original capacity.

---

**Q17.** A company's RDS MySQL database must automatically fail over to a standby instance within 2 minutes if the primary fails. Which feature provides this?

A) RDS Read Replica promotion
B) RDS Multi-AZ deployment
C) Aurora Global Database failover
D) Manual snapshot restore

**Answer: B** — RDS Multi-AZ automatically fails over (typically 1-2 minutes) using synchronous replication. The DNS endpoint automatically switches to the standby. Read Replica (A) requires manual promotion.

---

**Q18.** An SQS queue processes order messages. Occasionally, messages fail processing and keep being retried, blocking other messages. How should this be handled?

A) Increase the message visibility timeout
B) Configure a Dead Letter Queue (DLQ)
C) Use FIFO queue instead of Standard
D) Decrease the message retention period

**Answer: B** — DLQ captures messages that fail processing after a maximum number of receive attempts. This isolates poison pill messages while allowing normal messages to continue.

---

**Q19.** A company needs a disaster recovery strategy with RPO of 30 minutes and RTO of 1 hour for a multi-tier web application. Which strategy is MOST cost-effective?

A) Backup and Restore
B) Pilot Light
C) Warm Standby
D) Multi-Site Active-Active

**Answer: B** — Pilot Light maintains minimal resources (database replication running, minimal EC2) in secondary region. RPO of 30 minutes achievable with database replication. RTO of 1 hour achievable by scaling up secondary. Backup/Restore (A) would exceed 1-hour RTO for full restore.

---

**Q20.** A video processing application uses SQS to queue jobs for EC2 instances. During peak times, messages queue up faster than they are processed. How can the architecture be improved automatically?

A) Increase SQS message timeout
B) Use Auto Scaling based on the SQS ApproximateNumberOfMessages metric
C) Switch to SNS instead of SQS
D) Enable SQS long polling

**Answer: B** — CloudWatch alarm on SQS queue depth can trigger Auto Scaling policies. This is a classic decoupling pattern for variable workloads.

---

**Q21.** A company has an application deployed in us-east-1 with RDS Aurora. They need cross-region disaster recovery with sub-second RPO. Which solution meets this?

A) RDS Cross-Region Read Replica
B) RDS Automated Backup copied cross-region
C) Aurora Global Database
D) DynamoDB Global Tables

**Answer: C** — Aurora Global Database uses dedicated replication infrastructure with < 1 second replication lag. RDS Cross-Region Read Replica (A) has replication lag in minutes and is for RDS, not Aurora (though Aurora can also use this). DynamoDB (D) is NoSQL, not appropriate for replacing Aurora.

---

**Q22.** A company uses Route 53 with a primary endpoint in us-east-1 and secondary in us-west-2. The primary goes down. Which routing policy provides automatic failover?

A) Weighted routing
B) Latency-based routing
C) Failover routing with health checks
D) Geolocation routing

**Answer: C** — Route 53 Failover routing requires health checks. When primary fails health check, Route 53 automatically routes to secondary. Other policies don't automatically redirect based on health.

---

**Q23.** An application stores user session data in memory on individual EC2 instances. When instances terminate during scale-in, users lose sessions. How should sessions be managed?

A) Increase instance termination protection
B) Store sessions in Amazon ElastiCache for Redis
C) Use larger instance types with more memory
D) Disable Auto Scaling

**Answer: B** — Externalizing session state to ElastiCache makes instances stateless, enabling seamless Auto Scaling and instance replacement without session loss.

---

**Q24.** An application must process exactly once and in order. Which SQS queue type should be used?

A) Standard SQS Queue
B) SQS FIFO Queue
C) SNS + SQS combination
D) Kinesis Data Streams

**Answer: B** — FIFO queues guarantee exactly-once processing and strict ordering within a message group. Standard queues (A) guarantee at-least-once delivery and best-effort ordering.

---

**Q25.** An ALB is receiving traffic but backends are failing health checks intermittently. What is the MOST likely cause?

A) The ALB is in the wrong AZ
B) The security group on EC2 instances is not allowing health check traffic from the ALB
C) The ALB target group protocol is incorrect
D) Route 53 DNS is pointing to the wrong ALB

**Answer: B** — ALB health checks come from the ALB itself within the VPC. If the EC2 security group doesn't allow inbound traffic on the health check port from the ALB's security group, health checks fail.

---

**Q26.** A company's application runs on 10 EC2 instances behind an ALB. They want to ensure that if 2 instances become unhealthy, traffic is NOT sent to them. What configuration is required?

A) Configure Route 53 health checks
B) Enable ALB health checks on the target group
C) Configure Auto Scaling health checks
D) Use NLB instead of ALB

**Answer: B** — ALB target group health checks automatically remove unhealthy targets from rotation. This is enabled by default.

---

**Q27.** A company's stateful application must be upgraded with zero downtime. The new version must be validated before users are migrated. Which deployment strategy achieves this?

A) Rolling update
B) In-place update
C) Blue/Green deployment
D) Canary deployment

**Answer: C** — Blue/Green deploys new version alongside old, validates, then shifts traffic at once (or gradually). Provides instant rollback by switching traffic back. Rolling (A) and in-place (B) modify existing instances.

---

**Q28.** An EC2 instance's EBS root volume must be preserved when the instance is terminated. Which configuration achieves this?

A) Enable Delete on Termination = False for the root volume
B) Create an EBS snapshot before termination
C) Use instance store instead of EBS
D) Enable EC2 termination protection

**Answer: A** — By default, the root EBS volume is deleted on instance termination. Setting DeleteOnTermination=false preserves the volume. Instance store (C) is ephemeral and ALWAYS lost on termination.

---

**Q29.** What is the correct order of Route 53 routing policy evaluation for a weighted routing record set with health checks?

A) Route to highest weight → Check health
B) Check health of all records → Route based on weight among healthy
C) Route to nearest endpoint → Check weight
D) Check weight → Route to lowest latency among weighted records

**Answer: B** — Route 53 first eliminates unhealthy records, then applies the routing policy (weight, latency, etc.) among the remaining healthy records.

---

**Q30.** A company needs their application to handle a region failure automatically within 1 minute without data loss. Which architecture achieves this?

A) Active-passive with RDS Multi-AZ in secondary region
B) Multi-site active-active with DynamoDB Global Tables and Global Accelerator
C) Pilot light with Aurora cross-region read replica
D) Warm standby with RDS automated backups cross-region

**Answer: B** — DynamoDB Global Tables provides multi-region active-active with < 1 second replication. Global Accelerator provides instant traffic rerouting (< 30 seconds). This achieves near-zero RPO and < 1 minute RTO.

---

### Performance Domain (Questions 31-42)

**Q31.** A web application serves mostly static content (images, CSS, JavaScript) to global users. Users in Asia report slow load times. Which is the MOST effective solution?

A) Move EC2 instances to ap-southeast-1
B) Deploy identical infrastructure in ap-southeast-1
C) Create a CloudFront distribution with the EC2 origin
D) Use Route 53 latency-based routing

**Answer: C** — CloudFront caches content at 600+ edge locations worldwide. Static content is served from the nearest edge, dramatically reducing latency. Moving/duplicating infrastructure (A/B) is more expensive and complex.

---

**Q32.** A relational database handles 80% reads and 20% writes. The application is experiencing slow read performance. Which solution adds the LEAST operational complexity?

A) Migrate to DynamoDB
B) Increase RDS instance size
C) Add RDS Read Replicas and point read traffic to them
D) Enable RDS Multi-AZ

**Answer: C** — Read Replicas offload read traffic from the primary instance. Vertically scaling (B) is more expensive and has limits. Multi-AZ (D) is for availability, not read scaling. DynamoDB migration (A) is expensive/complex.

---

**Q33.** A Lambda function experiences high p99 latency due to cold starts. The function must respond in under 100ms consistently. What is the solution?

A) Increase Lambda memory allocation
B) Use Lambda@Edge instead
C) Enable Lambda Provisioned Concurrency
D) Deploy Lambda in a VPC

**Answer: C** — Provisioned Concurrency keeps Lambda instances pre-initialized and warm, eliminating cold starts. Increasing memory (A) speeds execution but doesn't eliminate cold starts.

---

**Q34.** An application frequently performs the same complex DynamoDB queries. Response times are 5ms but need to be under 1ms. Which solution should be implemented?

A) Add a DynamoDB Global Secondary Index
B) Enable DynamoDB Streams
C) Implement DynamoDB Accelerator (DAX)
D) Enable DynamoDB Point-in-Time Recovery

**Answer: C** — DAX provides in-memory caching with microsecond latency for DynamoDB reads. Reduces read load and latency. GSI (A) helps with access patterns but doesn't achieve sub-millisecond at the DynamoDB level.

---

**Q35.** An HPC workload requires the lowest possible network latency between instances. The workload is I/O and compute intensive. Which configuration is optimal?

A) Spread placement group
B) Cluster placement group with enhanced networking
C) Partition placement group
D) No placement group needed

**Answer: B** — Cluster placement groups pack instances close together in a single AZ, providing the highest network throughput and lowest latency. Enhanced networking (SR-IOV) further reduces latency.

---

**Q36.** A database on RDS needs 60,000 IOPS consistently for OLTP workloads. Which EBS volume type should be used?

A) gp3 (16,000 IOPS max)
B) io2 (64,000 IOPS max)
C) st1 (throughput HDD)
D) io1 (64,000 IOPS max)

**Answer: B** — io2 supports up to 64,000 IOPS with 99.999% durability (better than io1). io1 (D) is technically also correct but io2 offers better durability at same price point. gp3 (A) max is 16,000 IOPS.

---

**Q37.** Users are uploading large files (1-5 GB) to S3 from global locations. Uploads are slow. What should be implemented?

A) Cross-Region Replication
B) S3 Transfer Acceleration
C) CloudFront with S3 origin
D) S3 Multipart Upload only

**Answer: B** — S3 Transfer Acceleration uses CloudFront edge locations to accelerate uploads by routing over AWS's optimized network instead of the public internet. Multipart Upload (D) helps with reliability but not necessarily speed from distant locations.

---

**Q38.** An application reads the same 1000 product records from RDS thousands of times per second. How should this be optimized?

A) Add RDS Read Replicas
B) Enable RDS Enhanced Monitoring
C) Implement ElastiCache with Lazy Loading
D) Increase RDS storage allocation

**Answer: C** — ElastiCache caches frequently accessed data in memory. With lazy loading, items are cached on first read. Subsequent reads come from cache (sub-millisecond) instead of RDS. Read Replicas (A) reduce RDS load but still hit disk.

---

**Q39.** Kinesis Data Streams is processing real-time events. One stream shard is a bottleneck. The stream has 10 shards and one shard processes 80% of data. What is the problem?

A) Not enough shards overall
B) Hot shard due to poor partition key selection
C) Consumer application is too slow
D) Kinesis retention period is too short

**Answer: B** — A hot shard occurs when a partition key has very high cardinality concentration (e.g., using a user ID where one user sends massive data). Choosing a better partition key distributes load across shards evenly.

---

**Q40.** A company needs to analyze petabytes of data stored in S3 without loading it into a database. Which service enables this?

A) Amazon Redshift
B) AWS Glue
C) Amazon Athena
D) Amazon EMR

**Answer: C** — Athena queries data directly in S3 using standard SQL. No infrastructure to manage, no data movement. Pay per query. AWS Glue (B) is ETL. Redshift (A) requires loading data.

---

**Q41.** A microservices application uses ECS. Each service scales independently. How should inter-service communication be handled to prevent cascade failures?

A) Direct HTTP calls between services
B) Shared RDS database
C) SQS queues between services for async communication
D) NLB between every service pair

**Answer: C** — Asynchronous SQS-based communication decouples services. If one service is slow or down, messages queue up and are processed when capacity is available. Direct HTTP (A) means downstream failures propagate upstream.

---

**Q42.** CloudFront is serving content from an S3 origin. After updating S3 objects, users still see old content. What is the FASTEST way to serve updated content?

A) Wait for the TTL to expire
B) Create a CloudFront cache invalidation
C) Create a new S3 bucket
D) Use different CloudFront distribution

**Answer: B** — Cache invalidations immediately remove cached objects from CloudFront edge locations. First 1,000 paths/month are free.

---

### Cost Optimization Domain (Questions 43-50)

**Q43.** A company runs EC2 instances 24/7 for the past 2 years and expects to continue for 2 more years. What is the MOST cost-effective pricing option?

A) On-Demand
B) 1-year Standard Reserved Instances, All Upfront
C) 3-year Standard Reserved Instances, All Upfront
D) Spot Instances

**Answer: C** — 3-year All Upfront Standard RIs provide the maximum discount (~72%). For a known 2-year steady workload, locking in 3 years provides best per-hour cost. Spot (D) can be interrupted.

---

**Q44.** A batch processing workload runs nightly for 4 hours and can tolerate interruptions. Which compute option minimizes cost?

A) On-Demand Instances
B) Reserved Instances
C) Spot Instances
D) Dedicated Hosts

**Answer: C** — Spot Instances save up to 90%. Batch jobs that can be retried and tolerate interruptions are the ideal Spot use case. Reserved (B) is for steady 24/7 workloads, not nightly batches.

---

**Q45.** S3 objects are stored in Standard class. 90% of objects are not accessed after 30 days. Which is the MOST cost-effective solution?

A) Manually move objects to Glacier after 30 days
B) Enable S3 Intelligent-Tiering
C) Create an S3 Lifecycle policy to transition to Standard-IA after 30 days and Glacier after 90 days
D) Enable S3 Cross-Region Replication

**Answer: C** — A lifecycle policy is automated, free to configure, and moves objects to progressively cheaper tiers. Intelligent-Tiering (B) also works but has a per-object monitoring fee. Manual moves (A) require operational effort.

---

**Q46.** A company wants to understand which EC2 instances are over-provisioned and should be downsized. Which service provides this analysis?

A) AWS Cost Explorer right-sizing recommendations
B) AWS Trusted Advisor
C) AWS Compute Optimizer
D) All of the above

**Answer: D** — All three provide right-sizing recommendations. Compute Optimizer (C) uses ML and is the most detailed. Cost Explorer provides recommendations. Trusted Advisor checks for idle/underutilized instances. Exam typically looks for Compute Optimizer as most sophisticated answer.

---

**Q47.** An application generates 5 TB of daily logs stored in S3 indefinitely. Only the last 7 days of logs are actively analyzed. Logs older than 1 year are never accessed. Which S3 configuration minimizes cost?

A) Store all logs in S3 Standard
B) Lifecycle: Transition to Standard-IA at 7 days, Glacier Deep Archive at 30 days, Expire at 365 days
C) Store all logs in S3 Glacier immediately
D) Enable S3 Intelligent-Tiering for all logs

**Answer: B** — Tiered lifecycle matching access patterns: Standard for 7 days (active), then Standard-IA, then Glacier Deep Archive ($0.00099/GB), then expiration stops storage costs entirely.

---

**Q48.** EC2 instances in private subnets access the internet through a NAT Gateway. Monthly data transfer through NAT Gateway is $5,000. How can costs be significantly reduced?

A) Use a NAT Instance instead of NAT Gateway
B) Create VPC Interface Endpoints for all AWS services
C) Create VPC Gateway Endpoints for S3 and DynamoDB, and VPC Interface Endpoints for other AWS services
D) Move instances to public subnets

**Answer: C** — S3/DynamoDB Gateway Endpoints are free. Interface Endpoints for other AWS services (SNS, SQS, KMS, etc.) cost ~$7.50/month each but eliminate NAT Gateway processing fees. If most traffic goes to AWS services, this dramatically reduces NAT Gateway costs.

---

**Q49.** A company needs to monitor monthly AWS spending and receive an alert when costs exceed $10,000. Which service should be used?

A) CloudWatch Billing Alarm
B) AWS Cost Explorer
C) AWS Budgets
D) AWS Cost and Usage Report

**Answer: C** — AWS Budgets allows setting threshold alerts (actual or forecasted) and can trigger notifications or automated actions. CloudWatch Billing Alarm (A) is older; Budgets is the recommended modern approach.

---

**Q50.** A company pays $100,000/month for EC2 and wants to optimize. They have a mix of steady-state workloads and variable workloads. What is the BEST pricing strategy?

A) All On-Demand Instances
B) All Reserved Instances
C) Compute Savings Plans for baseline + On-Demand for variable peaks
D) All Spot Instances

**Answer: C** — Best practice: Commit (Savings Plans/RI) for predictable baseline load (~60-70% of usage), use On-Demand or Spot for variable peaks. Committing to 100% RI (B) risks unused commitments. All Spot (D) is not viable for steady-state.


**Study Strategy:**

**Tip 1: Hands-On Experience Trumps Memorization**
Build actual solutions in AWS Free Tier—practical experience provides context for exam scenarios, memorization alone insufficient.

**Tip 2: Focus on "Why" Not Just "What"**
Understand why services selected for scenarios—exam tests decision-making, not service definitions from documentation.

**Tip 3: Practice Elimination Technique**
Eliminate obviously wrong answers first—often narrows to two choices, focus analysis on remaining options.

**Tip 4: Watch for "MOST" and "LEAST"**
Questions ask for "MOST cost-effective" or "LEAST operational overhead"—multiple answers may work, need optimal solution.

**Tip 5: Flag and Return to Difficult Questions**
Don't spend 5 minutes on one question—flag it, move on, return if time remains.

**Tip 6: Read Entire Question Before Answering**
Requirements often in last sentence—premature answer selection leads to mistakes.

**Tip 7: Map Study Time to Domain Weights**
Domain 1 (30%) = most study time—allocate preparation proportionally to exam weights.

**Tip 8: Take Official Practice Exam**
\$40 AWS practice exam mirrors actual difficulty—identifies weak areas for focused study.

**Tip 9: Join Study Groups**
Discuss scenarios with peers—teaching concepts reinforces understanding, alternative perspectives valuable.

**Tip 10: Review Wrong Answers Thoroughly**
Understand why wrong answers incorrect—learning from mistakes prevents repeating them on exam.

## Chapter Summary

AWS Certified Solutions Architect Associate exam validates practical architecture skills through 65 scenario-based questions testing ability to design secure (30%), resilient (26%), high-performing (24%), and cost-optimized (20%) systems. Success requires synthesizing knowledge from compute, storage, networking, databases, and security into cohesive solutions addressing real-world business requirements—not memorizing service features but demonstrating architectural decision-making selecting optimal AWS services under constraints. Candidates investing 60-90 hours in hands-on practice, understanding "why" behind architecture choices, and mastering elimination techniques achieve passing scores (720+/1000) earning certification that commands 15-25% salary premium and accelerates cloud architecture careers through validated AWS expertise.

**Key Exam Success Factors:**

- **Hands-On Experience:** Build solutions in AWS Free Tier—theoretical knowledge insufficient for scenario-based questions
- **Elimination Technique:** Remove obviously wrong answers—narrows focus to remaining options requiring deeper analysis
- **Understand Trade-Offs:** Questions often have multiple working solutions—select MOST appropriate based on requirements
- **Time Management:** 130 minutes for 65 questions (2 min/question)—flag difficult questions, return if time permits
- **Read Carefully:** Requirements often in last sentence—premature answer selection leads to mistakes
- **Practice Exams:** Official practice exam (\$40) mirrors difficulty—identifies weak domains for focused study
- **Domain Focus:** Allocate study time proportionally—Security 30%, Resilience 26%, Performance 24%, Cost 20%

Common exam patterns: Multi-AZ for resilience, S3 + CloudFront for performance, Reserved Instances for cost optimization, IAM roles for security, Auto Scaling for elasticity, and SQS for decoupling. Mastering these patterns plus service-specific knowledge (when to use RDS vs DynamoDB, ALB vs NLB, etc.) provides foundation for passing exam and architecting production AWS solutions confidently.


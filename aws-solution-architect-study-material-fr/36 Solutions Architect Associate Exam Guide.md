# Partie 13 : Préparation à l'examen

# Chapitre 36 : Guide d'examen d'associé d'architecte de solutions

##Présentation

L'examen AWS Certified Solutions Architect – Associate (SAA-C03) valide votre capacité à concevoir des systèmes distribués sur AWS. Il s’agit de l’une des certifications cloud les plus demandées au monde. L'examen teste les compétences pratiques en architecture à travers des questions basées sur des scénarios vous obligeant à sélectionner les services AWS optimaux, à concevoir des systèmes résilients, à mettre en œuvre les meilleures pratiques de sécurité, à optimiser les coûts et à résoudre les problèmes courants.

Pour réussir, il faut synthétiser les connaissances en matière de calcul, de stockage, de mise en réseau, de bases de données, de sécurité et d'architectures avancées dans des solutions cohérentes répondant aux exigences de l'entreprise. L'examen a été mis à jour en 2022 (SAA-C03) et reste à jour en 2025.

Ce chapitre couvre tous les domaines d'examen :
- **Domaine 1 :** Concevoir des architectures sécurisées (30 %)
- **Domaine 2 :** Concevoir des architectures résilientes (26 %)
- **Domaine 3 :** Concevoir des architectures performantes (24 %)
- **Domaine 4 :** Concevoir des architectures à coûts optimisés (20 %)

> **Notes de l'examen 2025 :** La version SAA-C03 a mis davantage l'accent sur les architectures sans serveur, les conteneurs (ECS/EKS/Fargate) et les architectures basées sur les événements. Attendez-vous à plus de questions sur AWS Lake Formation, AWS Glue, Amazon OpenSearch et AWS Transfer Family par rapport aux anciennes versions.

## Théorie \&Concepts

### Structure et domaines de l'examen

**Comprendre l'examen SAA-C03 (édition 2025) :**
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
### Domaine 1 : Concevoir des architectures sécurisées (30 %)

**Modèles d'architecture axés sur la sécurité :**
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
### Domaine 2 : Concevoir des architectures résilientes (26 %)

**Haute disponibilité et tolérance aux pannes :**
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
### Domaine 3 : Concevoir des architectures performantes (24 %)

**Modèles d'optimisation des performances :**
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
### Domaine 4 : Concevoir des architectures à coûts optimisés (20 %)

**Modèles d'optimisation des coûts :**
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
### Comparaisons des services critiques (Favoris des examens)
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
### 2025 SAA-C03 Sujets d'actualité
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
### Procédure pas à pas des questions d'examen : cadre décisionnel
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
## Questions d'examen pratique (50 questions)

### Domaine de sécurité (questions 1 à 15)

**T1.** Une entreprise doit autoriser les instances EC2 d'un sous-réseau privé à accéder à S3 sans envoyer de trafic sur Internet. Quelle est la solution LA PLUS rentable ?

A) Déployer une passerelle NAT
B) Créer un point de terminaison de passerelle VPC pour S3
C) Créer un point de terminaison d'interface VPC pour S3
D) Utiliser l'accélération de transfert S3

**Réponse : B** — Les points de terminaison de passerelle pour S3 et DynamoDB sont gratuits. Les points de terminaison d’interface (C) ont des coûts horaires. La passerelle NAT (A) fonctionne mais entraîne des frais de traitement des données.

---

**T2.** Un développeur a accidentellement validé les clés d'accès AWS dans un référentiel GitHub public. Que faut-il faire en PREMIER ?

A) Supprimer le référentiel GitHub
B) Désactivez et supprimez immédiatement les clés d'accès exposées
C) Activer MFA sur l'utilisateur IAM
D) Faites pivoter le mot de passe de l'utilisateur IAM

**Réponse : B** — La désactivation et la suppression des clés arrêtent immédiatement toute utilisation non autorisée. Les clés sont compromises dès qu’elles sont publiques.

---

**T3.** Une entreprise stocke des données clients sensibles dans S3. Ils doivent détecter si des compartiments S3 deviennent accessibles au public. Quel service répond à cette exigence avec le MOINS de frais opérationnels ?

A) AWS Config avec la règle s3-bucket-public-read-prohibited
B) Inspecteur Amazon
C) Amazon GuardDuty
D) AWS CloudTrail

**Réponse : A** – AWS Config évalue en permanence les politiques du compartiment S3 par rapport à la règle et signale les violations. L'inspecteur (B) est destiné à l'analyse des vulnérabilités. GuardDuty (C) détecte les menaces mais pas les problèmes de configuration. CloudTrail (D) enregistre les appels d'API mais n'évalue pas la conformité.

---

**T4.** Une application sur EC2 doit appeler les services AWS. Quelle est la manière LA PLUS sécurisée de fournir des informations d'identification AWS ?

A) Stocker les informations d'identification dans un fichier .env sur l'instance
B) Informations d'identification codées en dur dans le code de l'application
C) Attacher un rôle IAM à l'instance EC2
D) Transmettre les informations d'identification en tant que variables d'environnement au lancement

**Réponse : C** — Les rôles IAM assurent une rotation automatique des informations d'identification temporaires, aucun secret codé en dur et suivent le moindre privilège.

---

**Q5.** Une application Web doit être protégée contre les attaques par injection SQL et par scripts intersites. Quel service propose cela ?

A) Bouclier AWS
B) AWS WAF
C) Groupes de sécurité
D) Listes de contrôle d'accès réseau

**Réponse : B** — AWS WAF inspecte les requêtes HTTP et peut les bloquer en fonction de règles (SQLi, XSS, IP, géo). Le bouclier (A) est destiné au DDoS. Les groupes de sécurité et les NACL (C/D) fonctionnent au niveau de la couche réseau et non au niveau de la couche application.

---

**Q6.** Une entreprise utilise une configuration AWS Organizations multi-comptes. Ils doivent empêcher TOUS les comptes membres de désactiver CloudTrail. Que doivent-ils mettre en œuvre ?

A) Politiques IAM dans chaque compte refusant cloudtrail:StopLogging
B) Une politique de contrôle de service (SCP) refusant cloudtrail:StopLogging
C) Règle AWS Config exigeant l'activation de CloudTrail
D) Activer AWS Security Hub sur tous les comptes

**Réponse : B** — Les SCP s'appliquent à tous les comptes membres d'une unité d'organisation/organisation, remplaçant les stratégies IAM locales. Les stratégies IAM (A) peuvent être remplacées par les administrateurs de compte.

---

**Q7.** Une entreprise doit gérer de manière centralisée les secrets (mots de passe des bases de données, clés API) et les alterner automatiquement tous les 30 jours. Quel service répond à cette exigence ?

A) Magasin de paramètres AWS Systems Manager (standard)
B) Gestionnaire de secrets AWS
C)AWS KMS
D) Gestionnaire de certificats AWS

**Réponse : B** — Secrets Manager prend en charge la rotation automatique des secrets avec Lambda. Parameter Store (A) peut stocker des secrets mais ne les fait PAS pivoter de manière native. KMS (C) concerne les clés de chiffrement, pas les secrets d'application. ACM (D) gère les certificats TLS.

---

**Q8.** Une application utilise la fédération SAML 2.0. Les utilisateurs d'entreprise s'authentifient auprès d'Active Directory, puis accèdent à AWS. Quel type d'identité IAM l'utilisateur reçoit-il ?

A) Un utilisateur IAM
B) Une adhésion au Groupe IAM
C) Informations d'identification temporaires de STS via un rôle IAM
D) Accès au compte racine

**Réponse : C** — La fédération SAML émet des informations d'identification temporaires via STS AssumeRoleWithSAML, liées à un rôle IAM. Aucun utilisateur IAM n'est créé.

---

**Q9.** Quelle combinaison de fonctionnalités S3 empêche la suppression d'un objet pendant une période de conservation définie, même par le propriétaire du compartiment ?

A) Gestion des versions + suppression MFA
B) Verrouillage d'objet S3 en mode conformité
C) Verrouillage d'objet S3 en mode gouvernance
D) Politique de compartiment refusant s3:DeleteObject

**Réponse : B** — Le verrouillage des objets en mode conformité ne peut être remplacé par AUCUN utilisateur, y compris root. Le mode de gouvernance (C) peut être remplacé par des utilisateurs disposant d'autorisations spéciales. La stratégie du compartiment (D) peut être modifiée par le propriétaire du compartiment.

---

**Q10.** Une fonction Lambda doit accéder à un secret stocké dans AWS Secrets Manager. Que faut-il pour que cela fonctionne ?

A) La fonction Lambda doit être dans le même VPC que Secrets Manager
B) Le rôle d'exécution Lambda doit disposer de l'autorisation secretsmanager:GetSecretValue.
C) La fonction Lambda doit avoir une adresse IP publique
D) Secrets Manager doit être configuré avec une politique de ressources

**Réponse : B** — Lambda utilise son rôle d'exécution pour les appels d'API. Le rôle nécessite l'autorisation IAM appropriée. Secrets Manager est un service régional accessible via Internet ou un point de terminaison VPC.

---

**Q11.** Une entreprise souhaite détecter les instances EC2 compromises qui communiquent avec des serveurs d'extraction de cryptomonnaie connus. Quel service offre cette fonctionnalité ?

A) Configuration AWS
B) Inspecteur Amazon
C) Amazon GuardDuty
D) Centre de sécurité AWS

**Réponse : C** — GuardDuty utilise des flux de renseignements sur les menaces (y compris des listes de domaines de crypto-minage) et analyse les journaux de flux VPC et les journaux DNS pour détecter un tel comportement. L'inspecteur (B) vérifie les vulnérabilités mais pas le comportement d'exécution.

---

**Q12.** Une entreprise doit restreindre les appels d'API EC2 à des plages d'adresses IP sources spécifiques pour tous les utilisateurs de l'organisation. Quelle est l’approche LA PLUS efficace ?

A) Ajouter des conditions IP à chaque stratégie IAM
B) Attachez un SCP avec une condition IP à la racine de l'organisation
C) Configurer les groupes de sécurité VPC
D) Activer les règles gérées par AWS Config

**Réponse : B** — Les SCP à la racine de l'organisation s'appliquent à tous les comptes. L'ajout de conditions à chaque stratégie IAM (A) est coûteux sur le plan opérationnel et sujet aux erreurs.

---

**Q13.** Quelle est la différence entre les groupes de sécurité et les ACL réseau ?

A) Les groupes de sécurité sont avec état ; Les NACL sont apatrides
B) Les NACL sont avec état ; Les groupes de sécurité sont apatrides
C) Les groupes de sécurité s'appliquent au niveau du sous-réseau ; NACL au niveau de l'instance
D) Les deux sont avec état

**Réponse : A** — Les groupes de sécurité sont avec état (trafic de retour automatiquement autorisé). Les NACL sont sans état (doivent explicitement autoriser les appels entrants ET sortants). Les groupes de sécurité sont au niveau de l'instance ; Les NACL sont au niveau du sous-réseau.

---

**Q14.** Un hôte bastion dans un sous-réseau public est utilisé pour se connecter en SSH à des instances EC2 privées. L'entreprise souhaite éliminer l'hôte bastion et améliorer la sécurité. Quel est le remplacement recommandé ?

A) Connexion directe
B) Gestionnaire de sessions AWS Systems Manager
C) Connexion d'instance EC2
D) Connexion VPN

**Réponse : B** — Session Manager fournit un accès sécurisé au shell sans ouvrir le port 22, ne nécessite aucun hôte bastion, utilise IAM pour le contrôle d'accès et enregistre les sessions sur CloudWatch. EC2 Instance Connect (C) nécessite toujours que le port 22 soit ouvert.

---

**Q15.** Une entreprise doit chiffrer les données dans S3 à l'aide des clés qu'elle gère dans son propre HSM. Quelle méthode de cryptage faut-il utiliser ?

A) SSE-S3
B) SSE-KMS avec clés gérées par AWS
C) SSE-KMS avec clés gérées par le client dans CloudHSM
D) SSE-C (chiffrement côté serveur avec clés fournies par le client)

**Réponse : C** — CloudHSM fournit un HSM matériel dédié où le client a un accès exclusif aux clés. SSE-KMS avec CMK intègre des clés sauvegardées par CloudHSM. SSE-C (D) nécessite la transmission de clés dans chaque requête (surcharge opérationnelle).

---

### Domaine de résilience (Questions 16 à 30)

**Q16.** Une entreprise exécute une application Web avec Auto Scaling. Lors d’une récente panne de AZ, l’application a connu une capacité réduite. L'application utilise actuellement 6 instances sur 3 AZ. Quelle est la MEILLEURE configuration pour tolérer une panne AZ sans dégradation des performances ?

A) Maintenir 6 instances, minimum 2 par AZ
B) Maintenir 9 instances, 3 par AZ
C) Maintenir 6 instances réparties sur 2 AZ
D) Utilisez plutôt une seule grande instance

**Réponse : B** — Pour gérer une panne d'une zone de disponibilité sans dégradation, chaque zone de disponibilité survivante doit gérer la pleine charge. Avec 3 AZ et une capacité souhaitée de 9, si une AZ tombe en panne, les 2 AZ restantes ont 6 instances = capacité d'origine.

---

**Q17.** La base de données RDS MySQL d'une entreprise doit automatiquement basculer vers une instance de secours dans les 2 minutes en cas de panne de l'instance principale. Quelle fonctionnalité offre cela ?

A) Promotion de réplication en lecture RDS
B) Déploiement RDS Multi-AZ
C) Basculement de la base de données globale Aurora
D) Restauration manuelle d'instantanés

**Réponse : B** — RDS Multi-AZ bascule automatiquement (généralement 1 à 2 minutes) à l'aide de la réplication synchrone. Le point de terminaison DNS passe automatiquement en veille. Le réplica en lecture (A) nécessite une promotion manuelle.

---

**Q18.** Une file d'attente SQS traite les messages de commande. Parfois, le traitement des messages échoue et continue d'être réessayé, bloquant d'autres messages. Comment cela doit-il être géré ?

A) Augmenter le délai d'expiration de la visibilité des messages
B) Configurer une file d'attente de lettres mortes (DLQ)
C) Utilisez la file d'attente FIFO au lieu de Standard
D) Diminuer la durée de conservation des messages

**Réponse : B** — DLQ capture les messages dont le traitement échoue après un nombre maximum de tentatives de réception. Cela isole les messages de pilules empoisonnées tout en permettant aux messages normaux de continuer.

---

**Q19.** Une entreprise a besoin d'une stratégie de reprise après sinistre avec un RPO de 30 minutes et un RTO de 1 heure pour une application Web multiniveau. Quelle stratégie est la PLUS rentable ?

A) Sauvegarde et restauration
B) Lampe témoin
C) Veille à chaud
D) Actif-Actif multi-sites

**Réponse : B** — Pilot Light conserve des ressources minimales (réplication de base de données en cours d'exécution, EC2 minimal) dans la région secondaire. RPO de 30 minutes réalisable avec la réplication de base de données. RTO de 1 heure réalisable en augmentant le secondaire. La sauvegarde/restauration (A) dépasserait le RTO d'une heure pour une restauration complète.

---

**Q20.** Une application de traitement vidéo utilise SQS pour mettre en file d'attente les tâches pour les instances EC2. Aux heures de pointe, les messages s’accumulent plus rapidement qu’ils ne sont traités. Comment l’architecture peut-elle être améliorée automatiquement ?

A) Augmenter le délai d'expiration des messages SQS
B) Utilisez la mise à l'échelle automatique basée sur la métrique SQS ApproximateNumberOfMessages
C) Passer à SNS au lieu de SQS
D) Activer l'interrogation longue SQS

**Réponse : B** — L'alarme CloudWatch sur la profondeur de la file d'attente SQS peut déclencher des stratégies Auto Scaling. Il s’agit d’un modèle de découplage classique pour les charges de travail variables.

---

**Q21.** Une entreprise dispose d'une application déployée dans la région us-east-1 avec RDS Aurora. Ils ont besoin d’une reprise après sinistre interrégionale avec un RPO inférieur à la seconde. Quelle solution répond à cela ?

A) Réplique de lecture inter-régions RDS
B) Sauvegarde automatisée RDS copiée entre régions
C) Base de données mondiale Aurora
D) Tables globales DynamoDB

**Réponse : C** – Aurora Global Database utilise une infrastructure de réplication dédiée avec un délai de réplication < 1 seconde. La réplication en lecture inter-régions RDS (A) a un délai de réplication de quelques minutes et est destinée à RDS, pas à Aurora (bien qu'Aurora puisse également l'utiliser). DynamoDB (D) est NoSQL et ne convient pas pour remplacer Aurora.

---

**Q22.** Une entreprise utilise Route 53 avec un point de terminaison principal en us-east-1 et secondaire en us-west-2. La primaire descend. Quelle stratégie de routage assure le basculement automatique ?

A) Routage pondéré
B) Routage basé sur la latence
C) Routage de basculement avec contrôles de santé
D) Routage de géolocalisation

**Réponse : C** — Le routage de basculement Route 53 nécessite des vérifications de l'état. Lorsque le contrôle de santé principal échoue, Route 53 est automatiquement acheminé vers le secondaire. Les autres stratégies ne redirigent pas automatiquement en fonction de l'état de santé.

---

**Q23.** Une application stocke les données de session utilisateur en mémoire sur des instances EC2 individuelles. Lorsque les instances se terminent pendant la mise à l'échelle, les utilisateurs perdent des sessions. Comment gérer les séances ?

A) Augmenter la protection contre la résiliation de l'instance
B) Stocker les sessions dans Amazon ElastiCache pour Redis
C) Utilisez des types d'instances plus grands avec plus de mémoire
D) Désactiver la mise à l'échelle automatique

**Réponse : B** — L'externalisation de l'état de la session vers ElastiCache rend les instances sans état, ce qui permet une mise à l'échelle automatique et un remplacement d'instance transparents sans perte de session.

---

**Q24.** Une demande doit être traitée exactement une fois et dans l'ordre. Quel type de file d’attente SQS doit être utilisé ?

A) File d'attente SQS standard
B) File d'attente FIFO SQS
C) Combinaison SNS + SQS
D) Flux de données Kinesis

**Réponse : B** — Les files d'attente FIFO garantissent un traitement unique et un classement strict au sein d'un groupe de messages. Les files d'attente standard (A) garantissent une livraison au moins une fois et une commande au mieux.

---

**Q25.** Un ALB reçoit du trafic mais les backends échouent par intermittence aux vérifications de l'état. Quelle est la cause LA PLUS probable ?

A) L'ALB est dans la mauvaise AZ
B) Le groupe de sécurité sur les instances EC2 n'autorise pas le trafic de vérification de l'état provenant de l'ALB
C) Le protocole du groupe cible ALB est incorrect
D) Le DNS Route 53 pointe vers le mauvais ALB

**Réponse : B** — Les vérifications de l'état de l'ALB proviennent de l'ALB lui-même au sein du VPC. Si le groupe de sécurité EC2 n'autorise pas le trafic entrant sur le port de vérification de l'état à partir du groupe de sécurité de l'ALB, les vérifications de l'état échouent.

---

**Q26.** L'application d'une entreprise s'exécute sur 10 instances EC2 derrière un ALB. Ils veulent s'assurer que si 2 instances deviennent défectueuses, le trafic ne leur est PAS envoyé. Quelle configuration est requise ?

A) Configurer les vérifications de l'état de Route 53
B) Activer les contrôles de santé ALB sur le groupe cible
C) Configurer les vérifications de l'état d'Auto Scaling
D) Utilisez NLB au lieu d'ALB

**Réponse : B** — Les vérifications de l'état du groupe cible ALB suppriment automatiquement les cibles défectueuses de la rotation. Ceci est activé par défaut.

---

**Q27.** L'application avec état d'une entreprise doit être mise à niveau sans aucun temps d'arrêt. La nouvelle version doit être validée avant la migration des utilisateurs. Quelle stratégie de déploiement permet d’y parvenir ?

A) Mise à jour continue
B) Mise à jour sur place
C) Déploiement Bleu/Vert
D) Déploiement Canary

**Réponse : C** – Bleu/Vert déploie la nouvelle version aux côtés de l'ancienne, valide, puis déplace le trafic en même temps (ou progressivement). Fournit une restauration instantanée en rétablissant le trafic. Le roulement (A) et sur place (B) modifient les instances existantes.

---

**Q28.** Le volume racine EBS d'une instance EC2 doit être préservé lorsque l'instance est terminée. Quelle configuration permet d'y parvenir ?

A) Activer la suppression à la résiliation = False pour le volume racine
B) Créer un instantané EBS avant la résiliation
C) Utilisez le magasin d'instances au lieu d'EBS
D) Activer la protection de terminaison EC2

**Réponse : A** — Par défaut, le volume EBS racine est supprimé à la fin de l'instance. Le réglage de DeleteOnTermination=false préserve le volume. Le magasin d'instances (C) est éphémère et TOUJOURS perdu à la résiliation.

---

**Q29.** Quel est l'ordre correct d'évaluation de la politique de routage Route 53 pour un enregistrement de routage pondéré défini avec des vérifications de l'état ?

A) Itinéraire vers le poids le plus élevé → Vérifier la santé
B) Vérifier l'état de santé de tous les enregistrements → Itinéraire basé sur le poids parmi les personnes en bonne santé
C) Itinéraire vers le point final le plus proche → Vérifier le poids
D) Vérifier le poids → Acheminer vers la latence la plus basse parmi les enregistrements pondérés

**Réponse : B** — Route 53 élimine d'abord les enregistrements défectueux, puis applique la stratégie de routage (poids, latence, etc.) aux enregistrements sains restants.

---

**Q30.** Une entreprise a besoin que son application gère automatiquement une panne de région en 1 minute sans perte de données. Quelle architecture y parvient ?

A) Actif-passif avec RDS Multi-AZ en région secondaire
B) Actif-actif multisite avec DynamoDB Global Tables et Global Accelerator
C) Lampe pilote avec réplique de lecture inter-région Aurora
D) Mise en veille automatique avec sauvegardes automatisées RDS interrégionales

**Réponse : B** — DynamoDB Global Tables fournit un mode actif-actif multirégional avec une réplication < 1 seconde. Global Accelerator permet un réacheminement instantané du trafic (< 30 secondes). Cela permet d’obtenir un RPO proche de zéro et un RTO < 1 minute.

---

### Domaine de performance (questions 31 à 42)

**Q31.** Une application Web sert principalement du contenu statique (images, CSS, JavaScript) aux utilisateurs mondiaux. Les utilisateurs en Asie signalent des temps de chargement lents. Quelle est la solution la PLUS efficace ?

A) Déplacer les instances EC2 vers ap-southeast-1
B) Déployer une infrastructure identique dans ap-southeast-1
C) Créer une distribution CloudFront avec l'origine EC2
D) Utiliser le routage basé sur la latence Route 53

**Réponse : C** — CloudFront met en cache le contenu sur plus de 600 emplacements périphériques dans le monde. Le contenu statique est diffusé depuis le bord le plus proche, ce qui réduit considérablement la latence. Le déplacement/duplication d’infrastructure (A/B) est plus coûteux et plus complexe.

---

**Q32.** Une base de données relationnelle gère 80 % des lectures et 20 % des écritures. L'application connaît des performances de lecture lentes. Quelle solution ajoute le MOINS de complexité opérationnelle ?

A) Migrer vers DynamoDB
B) Augmenter la taille de l'instance RDS
C) Ajoutez des réplicas de lecture RDS et dirigez le trafic de lecture vers eux
D) Activer RDS Multi-AZ

**Réponse : C** — Les réplicas en lecture déchargent le trafic de lecture de l'instance principale. La mise à l'échelle verticale (B) est plus coûteuse et présente des limites. Multi-AZ (D) concerne la disponibilité et non la mise à l'échelle en lecture. La migration DynamoDB (A) est coûteuse/complexe.

---

**Q33.** Une fonction Lambda connaît une latence p99 élevée en raison de démarrages à froid. La fonction doit répondre en moins de 100 ms de manière cohérente. Quelle est la solution ?

A) Augmenter l'allocation de mémoire Lambda
B) Utilisez plutôt Lambda@Edge
C) Activer la simultanéité provisionnée par Lambda
D) Déployer Lambda dans un VPC

**Réponse : C** — La concurrence provisionnée maintient les instances Lambda pré-initialisées et chaudes, éliminant ainsi les démarrages à froid. L'augmentation de la mémoire (A) accélère l'exécution mais n'élimine pas les démarrages à froid.

---

**Q34.** Une application exécute fréquemment les mêmes requêtes DynamoDB complexes. Les temps de réponse sont de 5 ms mais doivent être inférieurs à 1 ms. Quelle solution mettre en œuvre ?

A) Ajouter un index secondaire global DynamoDB
B) Activer les flux DynamoDB
C) Implémenter l'accélérateur DynamoDB (DAX)
D) Activer la récupération ponctuelle DynamoDB

**Réponse : C** — DAX fournit une mise en cache en mémoire avec une latence de l'ordre de la microseconde pour les lectures DynamoDB. Réduit la charge de lecture et la latence. GSI (A) facilite les modèles d'accès mais n'atteint pas la milliseconde au niveau DynamoDB.

---

**Q35.** Une charge de travail HPC nécessite la latence réseau la plus faible possible entre les instances. La charge de travail est gourmande en E/S et en calcul. Quelle configuration est optimale ?

A) Groupe de placement réparti
B) Groupe de placement en cluster avec réseau amélioré
C) Groupe de placement de partition
D) Aucun groupe de placement n'est nécessaire

**Réponse : B** — Les groupes de placement de cluster regroupent les instances rapprochées dans une seule zone de disponibilité, offrant ainsi le débit réseau le plus élevé et la latence la plus faible. La mise en réseau améliorée (SR-IOV) réduit encore la latence.

---

**Q36.** Une base de données sur RDS a besoin de 60 000 IOPS de manière constante pour les charges de travail OLTP. Quel type de volume EBS doit-on utiliser ?

A) gp3 (16 000 IOPS maximum)
B) io2 (64 000 IOPS maximum)
C) st1 (débit disque dur)
D) io1 (64 000 IOPS maximum)

**Réponse : B** — io2 prend en charge jusqu'à 64 000 IOPS avec une durabilité de 99,999 % (mieux que io1). io1 (D) est techniquement également correct mais io2 offre une meilleure durabilité au même prix. gp3 (A) maximum est de 16 000 IOPS.

---

**Q37.** Les utilisateurs téléchargent des fichiers volumineux (1 à 5 Go) vers S3 à partir d'emplacements mondiaux. Les téléchargements sont lents. Que faut-il mettre en œuvre ?

A) Réplication inter-régions
B) Accélération du transfert S3
C) CloudFront avec origine S3
D) Téléchargement partitionné S3 uniquement

**Réponse : B** – S3 Transfer Acceleration utilise les emplacements périphériques CloudFront pour accélérer les téléchargements en les acheminant via le réseau optimisé d'AWS au lieu de l'Internet public. Le téléchargement en plusieurs parties (D) contribue à la fiabilité mais pas nécessairement à la vitesse à partir d'emplacements distants.

---

**Q38.** Une application lit les mêmes 1 000 enregistrements de produits à partir de RDS des milliers de fois par seconde. Comment cela devrait-il être optimisé ?

A) Ajouter des répliques en lecture RDS
B) Activer la surveillance améliorée RDS
C) Implémenter ElastiCache avec chargement paresseux
D) Augmenter l'allocation de stockage RDS

**Réponse : C** — ElastiCache met en cache les données fréquemment consultées en mémoire. Avec le chargement paresseux, les éléments sont mis en cache lors de la première lecture. Les lectures suivantes proviennent du cache (sous-milliseconde) au lieu de RDS. Les répliques en lecture (A) réduisent la charge RDS mais continuent d'atteindre le disque.

---

**Q39.** Kinesis Data Streams traite les événements en temps réel. Un fragment de flux constitue un goulot d’étranglement. Le flux comporte 10 fragments et un fragment traite 80 % des données. Quel est le problème ?

A) Pas assez de fragments dans l'ensemble
B) Fragment chaud en raison d'une mauvaise sélection de clé de partition
C) L'application grand public est trop lente
D) La période de rétention Kinesis est trop courte

**Réponse : B** — Un fragment chaud se produit lorsqu'une clé de partition a une concentration de cardinalité très élevée (par exemple, en utilisant un ID utilisateur où un utilisateur envoie des données massives). Le choix d'une meilleure clé de partition répartit uniformément la charge sur les fragments.

---

**Q40.** Une entreprise doit analyser des pétaoctets de données stockées dans S3 sans les charger dans une base de données. Quel service permet cela ?

A) Amazon Redshift
B) Colle AWS
C) Amazone Athéna
D) Amazon DME

**Réponse : C** — Athena interroge les données directement dans S3 à l'aide du SQL standard. Aucune infrastructure à gérer, aucun mouvement de données. Payez par requête. AWS Glue (B) est ETL. Redshift (A) nécessite le chargement de données.

---

**Q41.** Une application de microservices utilise ECS. Chaque service évolue indépendamment. Comment gérer la communication interservices pour éviter les pannes en cascade ?

A) Appels HTTP directs entre services
B) Base de données RDS partagée
C) Files d'attente SQS entre les services pour la communication asynchrone
D) NLB entre chaque paire de services

**Réponse : C** — La communication asynchrone basée sur SQS découple les services. Si un service est lent ou en panne, les messages sont mis en file d'attente et traités lorsque la capacité est disponible. Direct HTTP (A) signifie que les échecs en aval se propagent en amont.

---

**Q42.** CloudFront diffuse du contenu à partir d'une origine S3. Après la mise à jour des objets S3, les utilisateurs voient toujours l'ancien contenu. Quelle est la manière LA PLUS RAPIDE de diffuser du contenu mis à jour ?

A) Attendez que le TTL expire
B) Créer une invalidation du cache CloudFront
C) Créer un nouveau compartiment S3
D) Utiliser une distribution CloudFront différente

**Réponse : B** — Les invalidations du cache suppriment immédiatement les objets mis en cache des emplacements périphériques CloudFront. Les 1 000 premiers parcours/mois sont gratuits.

---

### Domaine d'optimisation des coûts (questions 43 à 50)

**Q43.** Une entreprise exécute des instances EC2 24h/24 et 7j/7 au cours des 2 dernières années et prévoit de continuer pendant 2 ans supplémentaires. Quelle est l’option de tarification LA PLUS rentable ?

A) À la demande
B) Instances réservées standard d'un an, toutes d'avance
C) Instances réservées standard de 3 ans, toutes d'avance
D) Instances ponctuelles

**Réponse : C** – Toutes les instances réservées Upfront Standard de 3 ans offrent la remise maximale (~ 72 %). Pour une charge de travail stable connue sur 2 ans, le verrouillage sur 3 ans offre le meilleur coût horaire. Le spot (D) peut être interrompu.

---

**Q44.** Une charge de travail de traitement par lots s'exécute la nuit pendant 4 heures et peut tolérer des interruptions. Quelle option de calcul minimise les coûts ?

A) Instances à la demande
B) Instances réservées
C) Instances ponctuelles
D) Hôtes dédiés

**Réponse : C** — Les instances Spot permettent d'économiser jusqu'à 90 %. Les tâches par lots qui peuvent être réessayées et tolèrent les interruptions constituent le cas d’utilisation idéal de Spot. Réservé (B) concerne les charges de travail constantes 24h/24 et 7j/7, et non les lots de nuit.

---

**Q45.** Les objets S3 sont stockés dans la classe Standard. 90 % des objets ne sont pas accessibles au bout de 30 jours. Quelle est la solution la PLUS rentable ?

A) Déplacer manuellement les objets vers Glacier après 30 jours
B) Activer la hiérarchisation intelligente S3
C) Créer une politique de cycle de vie S3 pour passer à Standard-IA après 30 jours et Glacier après 90 jours
D) Activer la réplication inter-régions S3

**Réponse : C** — Une politique de cycle de vie est automatisée, gratuite à configurer et déplace les objets vers des niveaux de plus en plus moins chers. Intelligent-Tiering (B) fonctionne également mais comporte des frais de surveillance par objet. Les mouvements manuels (A) nécessitent un effort opérationnel.

---

**Q46.** Une entreprise souhaite comprendre quelles instances EC2 sont surprovisionnées et doivent être réduites. Quel service propose cette analyse ?

A) Recommandations de redimensionnement d'AWS Cost Explorer
B) Conseiller de confiance AWS
C) AWS Compute Optimiseur
D) Tout ce qui précède

**Réponse : D** – Les trois fournissent des recommandations de dimensionnement approprié. Compute Optimizer (C) utilise ML et est le plus détaillé. Cost Explorer fournit des recommandations. Trusted Advisor recherche les instances inactives/sous-utilisées. L'examen recherche généralement Compute Optimizer comme réponse la plus sophistiquée.

---

**Q47.** Une application génère 5 To de journaux quotidiens stockés indéfiniment dans S3. Seuls les 7 derniers jours de journaux sont activement analysés. Les journaux datant de plus d’un an ne sont jamais consultés. Quelle configuration S3 minimise les coûts ?

A) Stockez tous les journaux dans S3 Standard
B) Cycle de vie : transition vers Standard-IA à 7 jours, Glacier Deep Archive à 30 jours, expiration à 365 jours
C) Stockez immédiatement tous les journaux dans S3 Glacier
D) Activer S3 Intelligent-Tiering pour tous les journaux

**Réponse : B** — Modèles d'accès correspondant au cycle de vie à plusieurs niveaux : Standard pendant 7 jours (actif), puis Standard-IA, puis Glacier Deep Archive (0,00099 $/Go), puis l'expiration arrête complètement les coûts de stockage.

---

**Q48.** Les instances EC2 dans des sous-réseaux privés accèdent à Internet via une passerelle NAT. Le transfert de données mensuel via NAT Gateway coûte 5 000 $. Comment réduire considérablement les coûts ?

A) Utilisez une instance NAT au lieu d'une passerelle NAT
B) Créer des points de terminaison d'interface VPC pour tous les services AWS
C) Créer des points de terminaison de passerelle VPC pour S3 et DynamoDB, ainsi que des points de terminaison d'interface VPC pour d'autres services AWS.
D) Déplacer les instances vers des sous-réseaux publics

**Réponse : C** — Les points de terminaison de passerelle S3/DynamoDB sont gratuits. Les points de terminaison d'interface pour d'autres services AWS (SNS, SQS, KMS, etc.) coûtent environ 7,50 $/mois chacun, mais éliminent les frais de traitement de la passerelle NAT. Si la majeure partie du trafic est dirigée vers les services AWS, cela réduit considérablement les coûts de la passerelle NAT.

---

**Q49.** Une entreprise doit surveiller ses dépenses AWS mensuelles et recevoir une alerte lorsque les coûts dépassent 10 000 $. Quel service faut-il utiliser ?

A) Alarme de facturation CloudWatch
B) Explorateur de coûts AWS
C) Budgets AWS
D) Rapport sur les coûts et l'utilisation d'AWS

**Réponse : C** – AWS Budgets permet de définir des alertes de seuil (réelles ou prévues) et peut déclencher des notifications ou des actions automatisées. CloudWatch Billing Alarm (A) est plus ancien ; Les budgets sont l’approche moderne recommandée.

---

**Q50.** Une entreprise paie 100 000 $/mois pour EC2 et souhaite l'optimiser. Ils ont un mélange de charges de travail stables et de charges de travail variables. Quelle est la MEILLEURE stratégie de tarification ?

A) Toutes les instances à la demande
B) Toutes les instances réservées
C) Calculer les plans d'économies pour la référence + à la demande pour les pics variables
D) Toutes les instances ponctuelles

**Réponse : C** — Bonne pratique : engagement (plans d'économies/RI) pour une charge de base prévisible (~ 60 à 70 % de l'utilisation), utilisation à la demande ou ponctuelle pour les pics variables. S’engager à 100 % en IR (B) risque d’engager des engagements non utilisés. All Spot (D) n’est pas viable en régime permanent.


**Stratégie d'étude :**

**Astuce 1 : L'expérience pratique l'emporte sur la mémorisation**
Créez des solutions réelles dans l'offre gratuite AWS : l'expérience pratique fournit un contexte pour les scénarios d'examen, la mémorisation à elle seule étant insuffisante.

**Astuce 2 : Concentrez-vous sur le « Pourquoi » et non seulement sur « Quoi »**
Comprenez pourquoi les services sont sélectionnés pour les scénarios : les examens testent la prise de décision, et non les définitions de services issues de la documentation.

**Astuce 3 : Pratiquez la technique d'élimination**
Éliminez d’abord les réponses manifestement fausses – souvent réduites à deux choix, concentrez l’analyse sur les options restantes.

**Astuce 4 : Surveillez « LE PLUS » et « LE MOINS »**
Les questions demandent « LE PLUS rentable » ou « LE MOINS de frais opérationnels » : plusieurs réponses peuvent fonctionner, nécessitent une solution optimale.

**Astuce 5 : Signaler et revenir aux questions difficiles**
Ne passez pas 5 minutes sur une seule question : signalez-la, passez à autre chose, revenez s'il reste du temps.

**Astuce 6 : Lisez l'intégralité de la question avant de répondre**
Exigences souvent dans la dernière phrase : une sélection prématurée des réponses conduit à des erreurs.

**Astuce 7 : Mappez le temps d'étude sur les poids des domaines**
Domaine 1 (30 %) = la plupart du temps d'étude : allouez la préparation proportionnellement aux poids de l'examen.

**Astuce 8 : passez l'examen pratique officiel**
L'examen pratique AWS à 40 $ reflète la difficulté réelle : identifie les points faibles pour une étude ciblée.

**Astuce 9 : Rejoignez des groupes d'étude**
Discutez de scénarios avec vos pairs : l'enseignement des concepts renforce la compréhension et les perspectives alternatives sont précieuses.

**Astuce 10 : Examinez attentivement les mauvaises réponses**
Comprenez pourquoi les mauvaises réponses sont incorrectes : apprendre de ses erreurs évite de les répéter à l'examen.

## Résumé du chapitre

L'examen AWS Certified Solutions Architect Associate valide les compétences pratiques en architecture à travers 65 questions basées sur des scénarios testant la capacité à concevoir des systèmes sécurisés (30 %), résilients (26 %), hautement performants (24 %) et optimisés en termes de coûts (20 %). Pour réussir, il faut synthétiser les connaissances en matière de calcul, de stockage, de mise en réseau, de bases de données et de sécurité dans des solutions cohérentes répondant aux exigences commerciales réelles, sans mémoriser les fonctionnalités des services, mais en démontrant une prise de décision architecturale en sélectionnant les services AWS optimaux sous contraintes. Les candidats investissant 60 à 90 heures dans la pratique pratique, comprenant « pourquoi » derrière les choix d'architecture et maîtrisant les techniques d'élimination obtiennent des notes de passage (720+/1 000), obtenant une certification qui commande une prime salariale de 15 à 25 % et accélère les carrières en architecture cloud grâce à une expertise AWS validée.

**Facteurs clés de réussite à l'examen :**

- **Expérience pratique :** Créez des solutions dans l'offre gratuite AWS : connaissances théoriques insuffisantes pour les questions basées sur des scénarios
- **Technique d'élimination :** Supprimez les réponses manifestement fausses : concentrez-vous sur les options restantes nécessitant une analyse plus approfondie.
- **Comprendre les compromis :** Les questions comportent souvent plusieurs solutions de travail : sélectionnez la PLUS appropriée en fonction des exigences.
- **Gestion du temps :** 130 minutes pour 65 questions (2 minutes/question) : signalez les questions difficiles et revenez si le temps le permet
- **À lire attentivement :** Les exigences figurent souvent dans la dernière phrase : une sélection prématurée des réponses entraîne des erreurs.
- **Examens pratiques :** L'examen pratique officiel (\$40) reflète la difficulté : identifie les domaines faibles pour une étude ciblée
- **Focus sur le domaine :** Allouez le temps d'étude de manière proportionnelle : sécurité 30 %, résilience 26 %, performances 24 %, coût 20 %

Modèles d'examen courants : multi-AZ pour la résilience, S3 + CloudFront pour les performances, instances réservées pour l'optimisation des coûts, rôles IAM pour la sécurité, Auto Scaling pour l'élasticité et SQS pour le découplage. La maîtrise de ces modèles ainsi que les connaissances spécifiques aux services (quand utiliser RDS vs DynamoDB, ALB vs NLB, etc.) constituent la base pour réussir l'examen et concevoir des solutions AWS de production en toute confiance.
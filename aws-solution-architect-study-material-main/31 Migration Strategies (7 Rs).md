# Part 11: Migration \& Modernization

# Chapter 31: Migration Strategies (7 Rs)

## Introduction

Migrating existing applications to AWS represents one of the most significant technology transformations organizations undertake—moving decades of legacy systems, hundreds of applications, petabytes of data, and mission-critical workloads from on-premises data centers to cloud infrastructure. A retail company migrating 300 applications to AWS can reduce infrastructure costs by 40%, improve deployment velocity 10×, and eliminate data center lease obligations saving millions annually. However, migrations fail spectacularly when organizations lift-and-shift without strategy, underestimate complexity, lack dependency mapping, or attempt big-bang migrations of interdependent systems simultaneously. AWS Migration methodologies, specifically the 7 Rs framework (Rehost, Replatform, Repurchase, Refactor, Retire, Retain, Relocate), provide structured approaches for evaluating each application and selecting the optimal migration strategy based on business objectives, technical constraints, and risk tolerance.

The business imperative for cloud migration extends beyond cost reduction. Organizations maintaining on-premises data centers face 3-5 year hardware refresh cycles requiring massive capital expenditure, limited agility constrained by procurement timelines, operational overhead managing infrastructure, compliance challenges with aging systems, and difficulty attracting talent wanting modern technology experience. Cloud migration enables elastic scaling matching business growth, pay-per-use economics eliminating capital expenditure, rapid innovation through managed services, global reach deployed in minutes, and operational efficiency through automation. Average enterprise migration spans 18-36 months involving discovery (inventory applications), planning (wave strategy), migration execution (move workloads), and optimization (refactor for cloud). Organizations completing migrations report 30-60% infrastructure cost reduction, 50-90% faster deployment cycles, and operational efficiency gains of 40-70% through automation.

This chapter synthesizes infrastructure knowledge from throughout the handbook—rehosting leverages EC2 and EBS, replatforming uses RDS and Elastic Beanstalk, refactoring implements Lambda and containers, database migrations utilize DMS and SCT, monitoring employs CloudWatch, and cost optimization applies Savings Plans. The chapter covers the 7 Rs framework with decision criteria for each, AWS migration tools (Application Discovery Service, Migration Hub, DMS, Server Migration Service), dependency mapping, wave planning, cutover strategies, rollback procedures, testing methodologies, risk mitigation, large-scale migration execution, success metrics, and building production migration programs that move thousands of applications to AWS with minimal business disruption while maximizing cloud value realization.

## Theory \& Concepts

### The 7 Rs Migration Framework

**Overview and Decision Framework:**

```
The 7 Rs of Migration:
Strategic framework for application migration decisions
Each application assessed independently
Business drivers determine strategy selection

1. REHOST (Lift and Shift)
2. REPLATFORM (Lift, Tinker, and Shift)
3. REPURCHASE (Replace with SaaS)
4. REFACTOR (Re-architect for cloud)
5. RETIRE (Decommission)
6. RETAIN (Keep on-premises)
7. RELOCATE (VMware Cloud on AWS)

Decision Matrix:

┌────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Strategy       │ Speed    │ Cost     │ Cloud    │ Risk     │
│                │          │ Savings  │ Benefits │          │
├────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Rehost         │ Fastest  │ 30%      │ Limited  │ Lowest   │
│ Replatform     │ Fast     │ 40%      │ Moderate │ Low      │
│ Repurchase     │ Fast     │ Variable │ High     │ Medium   │
│ Refactor       │ Slowest  │ 50%+     │ Maximum  │ Highest  │
│ Retire         │ Instant  │ 100%     │ N/A      │ Medium   │
│ Retain         │ N/A      │ 0%       │ None     │ Lowest   │
│ Relocate       │ Fast     │ 20%      │ Limited  │ Low      │
└────────────────┴──────────┴──────────┴──────────┴──────────┘

Typical Distribution:
- Rehost: 50-60% of applications
- Replatform: 20-30%
- Refactor: 10-20%
- Retire: 10-15%
- Repurchase: 5-10%
- Retain: 5-10%
- Relocate: <5%

Selection Criteria:

Application Factors:
- Business criticality
- Technical complexity
- Age and technical debt
- Performance requirements
- Compliance constraints
- Interdependencies

Business Factors:
- Migration timeline pressure
- Budget constraints
- Available skills
- Risk tolerance
- Business value potential

Decision Process:

1. Inventory: Discover all applications and dependencies
2. Assess: Evaluate technical and business factors
3. Prioritize: Group into migration waves
4. Strategy: Select 7 R strategy per application
5. Execute: Migrate according to wave plan
6. Optimize: Refactor after initial migration
```


### 1. Rehost (Lift and Shift)

**Migration Strategy: Move as-is to AWS:**

```
Rehost Definition:
Move applications to AWS without changes
Same OS, same architecture, same configuration
VM → EC2 instance direct mapping

When to Use Rehost:

✓ Large-scale migration with tight timelines
✓ Limited cloud expertise initially
✓ Applications work well on-premises
✓ Need to exit data center quickly (lease expiration)
✓ Minimal interdependencies
✓ Non-strategic applications (support systems)

When NOT to Use:

✗ Applications with significant technical debt
✗ Poor performance currently
✗ High licensing costs that continue in cloud
✗ Tightly coupled architectures
✗ Strategic applications benefiting from refactoring

Rehost Process:

Phase 1: Discovery
- Map servers and dependencies
- Identify OS versions and configurations
- Document networking requirements
- Inventory installed software

Phase 2: Replication
- Use AWS Application Migration Service (MGN)
- Continuous replication of server data
- Minimal downtime (cutover in hours)

Phase 3: Testing
- Launch test instances in AWS
- Validate functionality
- Performance testing
- Integration testing

Phase 4: Cutover
- Final sync of data
- Switch DNS/routing to AWS
- Decommission on-premises
- Monitor for issues

AWS Tools:

Application Migration Service (MGN):
- Agent installed on source servers
- Continuous block-level replication
- Automated server conversion
- Launch test/cutover instances
- Supports: Windows, Linux, physical, virtual

CloudEndure (Legacy):
- Similar to MGN (predecessor)
- Being replaced by MGN

Server Migration Service (SMS):
- Agentless (uses VM connectors)
- Incremental replication
- Automated AMI creation

Rehost Example:

On-Premises Setup:
- 100 Windows servers
- VMware virtual machines
- 2 vCPU, 8 GB RAM each
- 100 GB disk per server
- Standard applications (IIS, SQL Express)

AWS Rehost:
- 100× t3.large instances (2 vCPU, 8 GB)
- 100× 100 GB gp3 volumes
- Same Windows Server version
- Same applications installed
- Same configuration

Migration Timeline:
- Week 1-2: Discovery and planning
- Week 3-4: Install MGN agents, start replication
- Week 5-6: Testing (10 servers pilot)
- Week 7-10: Production migration (90 servers in waves)
- Total: 10 weeks for 100 servers

Cost Impact:
On-premises:
- Hardware: $5,000/server × 100 = $500K CapEx (3-year depreciation)
- Power/cooling: $50/server/month × 100 = $5K/month
- Facilities: $100K/year allocation
- Total: ~$300K/year

AWS (Rehost):
- Compute: $0.0832/hour × 100 × 730 hours = $6,074/month
- Storage: 100 GB × $0.08 × 100 = $800/month
- Data transfer: ~$500/month
- Total: ~$7,400/month = $88,800/year

Savings: $211,200/year (70%)

Plus benefits:
+ No hardware refresh needed
+ Elastic scaling capability
+ Improved disaster recovery
+ Faster provisioning (minutes vs weeks)

Limitations:

✗ Same architecture (no cloud optimization)
✗ Windows licensing costs continue
✗ Operational model largely unchanged
✗ Doesn't leverage cloud-native services
✗ May not be optimal long-term

Post-Rehost Optimization:

Months 0-3: Stabilize
- Monitor and tune
- Fix issues
- Build operational confidence

Months 3-12: Optimize
- Right-size instances (often over-provisioned initially)
- Purchase Savings Plans/Reserved Instances
- Implement Auto Scaling
- Add CloudWatch monitoring

Year 2+: Modernize
- Replatform databases to RDS
- Refactor stateless components to containers
- Introduce managed services
- Reduce operational overhead
```


### 2. Replatform (Lift, Tinker, and Shift)

**Migration Strategy: Optimize during migration:**

```
Replatform Definition:
Make targeted cloud optimizations during migration
Leverage managed services where easy
Minimal code changes

Common Replatform Scenarios:

1. Database to RDS:
   On-prem: Self-managed MySQL on VM
   AWS: Amazon RDS for MySQL
   Benefit: Automated backups, patching, Multi-AZ

2. Application Server to Elastic Beanstalk:
   On-prem: Java app on Tomcat
   AWS: Elastic Beanstalk
   Benefit: Automated deployment, scaling, monitoring

3. File Server to EFS:
   On-prem: Windows File Server
   AWS: Amazon EFS or FSx
   Benefit: Elastic storage, managed service

4. Web Server to ALB + Auto Scaling:
   On-prem: 5 static web servers
   AWS: ALB + Auto Scaling Group (2-10 instances)
   Benefit: Elastic scaling, fault tolerance

When to Use Replatform:

✓ Databases with high operational overhead
✓ Applications fitting managed service patterns
✓ Simple modernization opportunities
✓ Want some cloud benefits without full refactor
✓ Medium-term timeline acceptable

When NOT to Use:

✗ Complex custom configurations incompatible with managed services
✗ Extremely tight timeline (rehost faster)
✗ Applications requiring significant architectural changes
✗ Strategic applications deserving full refactor

Replatform Process:

Phase 1: Identify Opportunities
- Map self-managed components to AWS services
- Database: RDS, Aurora, DynamoDB
- File storage: EFS, FSx
- Load balancing: ALB, NLB
- Caching: ElastiCache

Phase 2: Test Compatibility
- Export database schema
- Test import to RDS
- Validate application connections
- Performance testing

Phase 3: Migration Execution
- Create target managed service
- Use DMS for database migration
- Update application configuration
- Cutover with minimal downtime

Phase 4: Optimization
- Enable Multi-AZ
- Configure automated backups
- Set up monitoring
- Implement auto-scaling

Replatform Example:

Application: E-commerce platform
On-Premises Setup:
- 3× Web servers (Apache + PHP)
- 1× MySQL database server (master)
- 1× MySQL database server (replica)
- 1× Redis cache server
- Manual scaling, manual backups

AWS Replatform:
- ALB + Auto Scaling Group (2-6 instances)
  - Elastic scaling based on load
  - Health checks and auto-replacement
  
- Amazon RDS Multi-AZ MySQL
  - Automated backups (30-day retention)
  - Automated patching
  - Read replicas for read scaling
  
- Amazon ElastiCache Redis
  - Managed cache cluster
  - Automatic failover
  - Backup and restore

Migration Steps:

Week 1-2: Planning
- Test RDS compatibility
- Create ElastiCache cluster
- Configure Auto Scaling

Week 3: Database Migration
- Use AWS DMS for live migration
- Continuous replication during migration
- Cutover window: 1 hour downtime

Week 4: Application Migration
- Deploy web tier to Auto Scaling Group
- Update connection strings
- Switch ALB to new environment
- Monitor and validate

Results:
- Migration time: 4 weeks (vs 2 weeks for pure rehost)
- Cost reduction: 45% (vs 30% for rehost)
- Operational overhead: -70% (managed services)
- Availability: 99.95% (Multi-AZ) vs 99% (on-prem)

Cost Comparison:

Rehost approach:
- 5× EC2 instances: $300/month
- 2× EC2 for databases: $200/month
- 1× EC2 for cache: $50/month
- Total: $550/month
- Operational overhead: 40 hours/month

Replatform approach:
- 2-6× EC2 Auto Scaling: $200-600/month (average $350)
- RDS Multi-AZ: $250/month
- ElastiCache: $100/month
- ALB: $25/month
- Total: $725/month
- Operational overhead: 5 hours/month

Analysis:
- 32% higher infrastructure cost
- 87.5% lower operational cost (35 hours saved)
- At $100/hour engineer cost: $3,500 savings/month
- Net savings: $3,500 - $175 = $3,325/month
- Plus: Better availability, easier scaling, automated backups

Limitations:

~ Not all applications fit managed service patterns
~ Some learning curve for new services
~ May require application configuration changes
~ Testing more complex than pure rehost
```


### 3. Repurchase (Drop and Shop)

**Migration Strategy: Replace with SaaS:**

```
Repurchase Definition:
Replace existing application with SaaS alternative
Move from self-hosted to vendor-managed cloud service

Common Repurchase Scenarios:

1. Email Server → Microsoft 365 / Google Workspace
   On-prem: Exchange Server (hardware, licenses, admin)
   SaaS: Microsoft 365
   Savings: 60-80% total cost of ownership

2. CRM → Salesforce
   On-prem: Custom CRM or on-prem solution
   SaaS: Salesforce
   Benefits: Mobile access, regular updates, integrations

3. ERP → SAP S/4HANA Cloud / Oracle Cloud ERP
   On-prem: Legacy ERP system
   SaaS: Cloud ERP
   Benefits: Modern features, lower maintenance

4. HR System → Workday
   On-prem: PeopleSoft, custom HR system
   SaaS: Workday
   Benefits: Modern UI, analytics, mobile

5. Collaboration → Slack, Microsoft Teams
   On-prem: Custom intranet, SharePoint on-prem
   SaaS: Modern collaboration tools
   Benefits: Better user experience, productivity

When to Use Repurchase:

✓ Commodity applications (email, office productivity)
✓ Vendor offering superior SaaS alternative
✓ High maintenance overhead of current system
✓ Need for modern features not in current system
✓ Limited customization requirements

When NOT to Use:

✗ Highly customized applications
✗ No suitable SaaS alternative
✗ Strict data sovereignty requirements
✗ Integration complexity outweighs benefits
✗ SaaS costs exceed current solution significantly

Repurchase Process:

Phase 1: Vendor Evaluation
- Identify SaaS alternatives
- Compare features vs current system
- Evaluate pricing models
- Assess integration requirements
- Security and compliance review

Phase 2: Proof of Concept
- Trial period with vendor
- Test key workflows
- Validate integrations
- User acceptance testing
- Performance evaluation

Phase 3: Data Migration
- Export data from legacy system
- Transform to vendor format
- Import to SaaS platform
- Validate data accuracy
- Cutover planning

Phase 4: Cutover
- Final data sync
- User training
- Go-live
- Parallel run period
- Decommission legacy system

Repurchase Example:

Scenario: Company email system migration

On-Premises Email:
- Microsoft Exchange Server 2016
- 500 mailboxes
- 3× physical servers (mail, CAS, DAG)
- 10 TB storage
- 1 FTE admin (80 hours/month)

Costs:
- Hardware: $30K CapEx (3-year)
- Windows Server licenses: $5K
- Exchange licenses: $20K
- Admin salary: $8K/month
- Power, facilities: $500/month
Total: $18,500/month amortized

Microsoft 365 Business Premium:
- 500 users × $22/user/month = $11,000/month
- Includes: Email, Office apps, Teams, OneDrive
- No hardware, no admin overhead for email
- Admin time: 10 hours/month (90% reduction)

Analysis:
- Direct cost: $11,000/month (vs $10,000 infrastructure)
- Admin savings: 70 hours × $100/hour = $7,000/month
- Total savings: $7,000/month = $84,000/year
- Plus: Modern features, mobile access, better security

Non-Financial Benefits:
+ Always latest features (automatic updates)
+ 99.9% SLA from Microsoft
+ Better mobile experience
+ Advanced threat protection
+ Compliance certifications
+ Disaster recovery included

Risks and Mitigations:

Risk: Vendor lock-in
Mitigation: Data portability clauses, export capabilities

Risk: Customization limitations
Mitigation: Evaluate workflows before committing

Risk: Integration complexity
Mitigation: Use APIs, SSO, modern integration platforms

Risk: Data residency
Mitigation: Choose vendor with regional data centers

Risk: Cost escalation
Mitigation: Multi-year contract, fixed pricing

Repurchase Decision Framework:

Evaluate these factors:
1. Feature parity: 80%+ feature match required
2. Cost: Total cost of ownership (not just subscription)
3. Integration: Manageable integration complexity
4. User acceptance: Positive user feedback in trials
5. Vendor viability: Established vendor with track record
6. Data migration: Feasible data migration path

If 5/6 factors positive → Repurchase recommended
If 3/6 factors positive → Consider alternatives
If < 3 factors positive → Rehost or Replatform instead
```


### 4. Refactor (Re-architect)

**Migration Strategy: Redesign for cloud-native:**

```
Refactor Definition:
Completely redesign application architecture
Leverage cloud-native services and patterns
Maximize cloud benefits (scalability, resilience, cost)

When to Use Refactor:

✓ Strategic applications with high business value
✓ Current architecture has significant limitations
✓ Need for dramatically better scalability
✓ Modernization aligns with business goals
✓ Have time and resources for re-architecture

When NOT to Use:

✗ Non-strategic applications
✗ Tight timeline constraints
✗ Limited development resources
✗ Current application meets needs adequately
✗ Uncertain future of application

Refactor Patterns:

1. Monolith → Microservices:
   Before: Single monolithic application
   After: Multiple independent microservices
   Benefits: Independent scaling, deployment, tech stacks

2. VMs → Containers:
   Before: Application on EC2 instances
   After: Docker containers on ECS/EKS
   Benefits: Density, portability, faster deployments

3. Traditional → Serverless:
   Before: Always-on servers
   After: Lambda functions + API Gateway
   Benefits: Pay per use, infinite scale, no management

4. Relational → NoSQL:
   Before: RDBMS with complex queries
   After: DynamoDB with GSI
   Benefits: Massive scale, predictable performance, lower cost

5. Synchronous → Event-Driven:
   Before: Tight coupling between components
   After: EventBridge/SNS/SQS decoupling
   Benefits: Loose coupling, resilience, flexibility

Refactor Process:

Phase 1: Architecture Design (2-4 months)
- Define target architecture
- Identify cloud-native services
- Design microservices boundaries
- Plan data migration strategy
- Define APIs and interfaces

Phase 2: Incremental Migration (6-18 months)
- Strangler Fig pattern (gradual replacement)
- Build new features in new architecture
- Migrate modules incrementally
- Run old and new in parallel
- Gradually retire legacy components

Phase 3: Data Migration (overlapping)
- Dual-write to old and new databases
- Validate data consistency
- Cutover per module
- Maintain rollback capability

Phase 4: Optimization (ongoing)
- Performance tuning
- Cost optimization
- Security hardening
- Operational excellence

Refactor Example:

Application: E-commerce monolith
Current State:
- Single Java application (500K lines of code)
- Runs on 10× large EC2 instances
- Oracle database (expensive)
- Deployment: Monthly (risky, 4-hour downtime)
- Scaling: Vertical only (expensive)
- Cost: $50K/month

Target Architecture:

Frontend: React SPA on S3 + CloudFront
- Static hosting: $10/month
- Global CDN: $100/month
- 100× faster page loads

API Layer: API Gateway + Lambda
- Serverless (pay per request)
- Auto-scales 0 to millions
- Cost: $500/month (current load)

Microservices:
1. User Service (ECS Fargate)
   - Handles authentication, profiles
   - Auto-scales 2-20 tasks
   
2. Product Catalog (ECS Fargate + ElastiCache)
   - Product browsing, search
   - Redis cache for performance
   
3. Order Service (ECS Fargate)
   - Order creation and management
   - Event-driven workflows
   
4. Payment Service (Lambda)
   - Payment processing
   - PCI compliance isolation
   
5. Inventory Service (Lambda + DynamoDB)
   - Real-time inventory
   - High-throughput updates

Databases:
- Users: RDS PostgreSQL (relational data)
- Products: DynamoDB + Elasticsearch (scale, search)
- Orders: DynamoDB (scale, performance)
- Inventory: DynamoDB (high-throughput)

Integration:
- EventBridge: Event-driven orchestration
- SQS: Asynchronous processing queues
- SNS: Notifications

Migration Approach:

Month 1-3: Design and Proof of Concept
- Architecture design
- Build user service (first microservice)
- Test deployment pipeline
- Validate approach

Month 4-6: Product Catalog Migration
- Build product microservice
- Migrate product data to DynamoDB
- Implement search with Elasticsearch
- A/B test with 10% traffic

Month 7-9: Order Service Migration
- Build order microservice
- Implement event-driven workflows
- Migrate historical orders
- Gradual traffic shift

Month 10-12: Payment and Inventory
- Build remaining microservices
- Complete data migration
- Full cutover
- Decommission monolith

Results:

Performance:
- Page load: 3s → 0.5s (6× improvement)
- API latency: 500ms → 100ms (5× improvement)
- Throughput: 1K req/s → 100K req/s (100× improvement)

Availability:
- Uptime: 99% → 99.95%
- Deployment downtime: 4 hours → 0 (blue/green)
- Deployment frequency: Monthly → Daily (100× faster)

Cost:
- Before: $50K/month
- After: $20K/month (60% reduction)
  - Compute: $8K (serverless + containers)
  - Database: $6K (DynamoDB + RDS)
  - Other: $6K (API Gateway, CloudFront, etc.)

Development velocity:
- Release cycle: 1 month → 1 day
- Team autonomy: Single team → 5 independent teams
- Innovation: Blocked by monolith → Continuous

Challenges:

Technical:
- Complexity increase (distributed systems)
- Data consistency across services
- Debugging distributed applications
- Service dependency management

Organizational:
- Team structure (Conway's Law)
- DevOps skills required
- Cultural change
- Initial productivity dip

Financial:
- High upfront investment (12-month project)
- Team training costs
- Parallel systems during migration

Refactor ROI Calculation:

Investment:
- Development: 12 months × 5 engineers × $15K/month = $900K
- Training: $50K
- Tools and infrastructure: $50K
Total: $1M

Returns:
- Cost savings: $30K/month × 12 = $360K/year
- Productivity gains: 10× faster releases = $200K/year
- Revenue from new features: $500K/year (faster innovation)
Total annual return: $1.06M

ROI: 106% first year
Payback period: 11 months
```


### 5. Retire (Decommission)

**Migration Strategy: Eliminate unused applications:**

```
Retire Definition:
Identify and decommission applications no longer needed
Eliminate associated costs and complexity

Discovery Process:

1. Application Inventory:
   - List all applications in portfolio
   - Document purpose and users
   - Identify owners

2. Usage Analysis:
   - Check server logs (last access times)
   - Query database activity
   - Survey users
   - Monitor network traffic

3. Dependency Analysis:
   - Identify dependent systems
   - Check integration points
   - Review backup/DR dependencies

Common Retirement Candidates:

✓ Duplicate applications (multiple systems same function)
✓ Applications with <10 users
✓ No activity in last 6 months
✓ Replaced by newer systems (but never decommissioned)
✓ Development/test environments never used
✓ Proof-of-concept projects abandoned
✓ Shadow IT discovered during migration

Retirement Process:

Phase 1: Identification (Week 1-2)
- Run usage reports
- Identify zero/low activity applications
- Survey application owners

Phase 2: Validation (Week 3-4)
- Confirm with business owners
- Check for compliance requirements
- Document dependencies
- Plan data archival if needed

Phase 3: Communication (Week 5)
- Notify stakeholders
- Set retirement date
- Provide alternatives if needed
- Document decision

Phase 4: Archival (Week 6-7)
- Export data for compliance
- Store in S3 Glacier (low cost)
- Document archive location
- Test data retrieval

Phase 5: Decommission (Week 8)
- Shut down application
- Remove DNS entries
- Decommission servers
- Cancel licenses
- Update documentation

Retirement Example:

Discovery Results:
- Total applications: 500
- Active (daily use): 350 (70%)
- Low activity (<10 users): 75 (15%)
- No activity (6 months): 50 (10%)
- Duplicates: 25 (5%)

Retirement Candidates: 150 applications (30%)

Sample Retirement:

Application: Legacy reporting system
- Last access: 14 months ago
- Users: 3 (all moved to new system)
- Infrastructure: 2× servers, 1× database
- Cost: $500/month × 14 months = $7,000 wasted

Validation:
- Contacted 3 users → Confirmed using new system
- Checked dependencies → None (isolated system)
- Compliance → 7-year data retention required

Action:
- Export all reports to S3 Glacier
- Archive cost: $5/month (vs $500/month running)
- Shut down servers
- Annual savings: $5,940

Portfolio-Wide Impact:

Retiring 150 applications:
- Average cost per application: $300/month
- Monthly savings: 150 × $300 = $45,000/month
- Annual savings: $540,000
- Reduced migration scope: 150 fewer applications to migrate
- Migration time saved: ~6 months
- Reduced operational complexity: -30% application portfolio

Hidden Benefits:

Licensing:
- Cancelled unused software licenses
- Savings: $100K/year

Security:
- Reduced attack surface
- Fewer applications to patch and secure
- Lower compliance burden

Focus:
- Team focuses on strategic applications
- Not maintaining legacy systems
- Better resource allocation

Retirement Challenges:

Political:
- Application owners reluctant (pride of ownership)
- "We might need it someday" mentality
- Historical data concerns

Solution:
- Executive sponsorship for portfolio rationalization
- Clear data retention policy
- Documented archive process
- Success stories from early retirements

Technical:
- Unknown dependencies discovered late
- Data export complications
- Compliance requirements

Solution:
- Thorough dependency mapping upfront
- Pilot retirement of low-risk applications
- Legal/compliance review early

Best Practices:

✓ Start retirement 6 months before migration
✓ Low-hanging fruit first (unused dev/test)
✓ Celebrate wins (communicate savings)
✓ Automate usage analysis
✓ Establish clear retirement criteria
✓ Regular portfolio reviews (quarterly)
```


### 6. Retain (Revisit Later)

**Migration Strategy: Keep on-premises temporarily:**

```
Retain Definition:
Explicitly decide to keep application on-premises
Migrate to cloud at future date or never

When to Use Retain:

✓ Applications requiring major refactoring (not ready now)
✓ Recent investments in on-premises infrastructure
✓ Applications planned for retirement (within 12 months)
✓ Compliance/regulatory blockers (temporary)
✓ No cloud business case currently
✓ Dependencies blocking migration
✓ Insufficient resources for migration this wave

When NOT to Use:

✗ Using as excuse to avoid migration work
✗ Based on assumptions rather than analysis
✗ Applications accumulating technical debt
✗ Missing strategic modernization opportunities

Retain Categories:

1. Deferred Migration:
   - Will migrate in future wave
   - Currently blocked by dependencies
   - Resources not available yet
   
   Example: Application depends on mainframe integration
   Plan: Migrate after mainframe API created (Wave 3)

2. Needs Refactoring:
   - Significant technical debt
   - Requires re-architecture before migration
   - Schedule refactor as separate project
   
   Example: Tightly coupled monolith
   Plan: Refactor in Year 2 after initial migration complete

3. Recent Investment:
   - New hardware purchased (1-2 years old)
   - Major upgrade recently completed
   - Economically justified to wait
   
   Example: $500K storage array purchased 6 months ago
   Plan: Migrate when hardware refresh due (2 years)

4. Regulatory/Compliance:
   - Temporary regulatory blocker
   - Working on compliance approval
   - Security controls being implemented
   
   Example: Government application pending ATO
   Plan: Migrate after ATO approved (6-12 months)

5. No Business Case:
   - Cost analysis shows no savings
   - Low usage application
   - Minimal operational burden
   
   Example: Departmental application, 5 users
   Plan: Revisit during next data center lease renewal

Retain Strategy:

Phase 1: Document Decision
- Why retained (specific reasons)
- Review date (when to reconsider)
- Blockers to migration
- Future migration path

Phase 2: Set Review Triggers
- Schedule: Quarterly review
- Condition-based: When blocker removed
- Event-based: Hardware refresh needed
- Business-based: Strategy change

Phase 3: Monitor Blockers
- Track blocker status
- Update migration priority
- Reassess business case
- Plan for future migration

Phase 4: Maintain Connectivity
- Ensure network connectivity AWS ↔ on-prem
- Direct Connect or VPN
- Hybrid cloud architecture
- Security and compliance

Retain Example:

Application: Core Banking System
Decision: Retain (Deferred Migration)

Analysis:
- Criticality: Tier 0 (mission-critical)
- Users: 10,000
- Transactions: 1M/day
- Technology: AS/400 mainframe application
- Age: 25 years
- Technical debt: Extremely high

Blockers:
1. Technical: Tightly coupled to mainframe
2. Skills: No in-house cloud expertise for this complexity
3. Risk: Zero-downtime requirement (banking)
4. Cost: Estimated $5M to refactor
5. Time: 18-24 months development

Decision: Retain for 2 years

Plan:
Year 1:
- Migrate supporting systems around banking core
- Build cloud expertise with lower-risk applications
- Create hybrid network (Direct Connect)
- Assess modern core banking solutions

Year 2:
- Evaluate: Refactor vs Repurchase (modern core banking SaaS)
- If refactor: Begin re-architecture
- If repurchase: Evaluate vendors (Temenos, FIS, etc.)

Year 3:
- Execute migration plan
- Gradual cutover to minimize risk

Current State:
- On-premises with existing infrastructure
- No migration rush (hardware adequate)
- Maintain until ready for proper migration

Portfolio Management:

Total applications: 500
Migration plan:
- Wave 1 (Months 1-6): 150 applications (easy wins)
- Wave 2 (Months 7-12): 100 applications (moderate complexity)
- Wave 3 (Months 13-18): 100 applications (high complexity)
- Retire: 50 applications
- Retain: 100 applications

Retain breakdown:
- Deferred (future migration): 60 applications
- Needs refactoring: 20 applications
- Recent investment: 10 applications
- Compliance blockers: 5 applications
- No business case: 5 applications

Best Practices:

✓ Explicit decision with documentation
✓ Set specific review date (not indefinite)
✓ Track blockers and resolution
✓ Maintain hybrid connectivity
✓ Avoid becoming permanent
✓ Include in architecture documentation
✓ Review quarterly

Anti-patterns:

✗ Default retention (lack of analysis)
✗ No review dates set
✗ Accumulating retained applications
✗ Using as excuse for difficult migrations
✗ Ignoring total cost of ownership
✗ Lack of hybrid network planning
```


### 7. Relocate (Hypervisor-Level Migration)

**Migration Strategy: VMware workloads to VMware Cloud on AWS:**

```
Relocate Definition:
Move VMware vSphere VMs to VMware Cloud on AWS
Hypervisor-level migration (vMotion)
Minimal changes to VMs

When to Use Relocate:

✓ Large VMware vSphere footprint
✓ Need rapid data center exit
✓ Want to leverage existing VMware skills
✓ VMware licensing already in place
✓ Applications tightly coupled to VMware features

When NOT to Use:

✗ Goal is cloud-native transformation
✗ Small VMware footprint
✗ High VMware licensing costs
✗ Want to eliminate VMware dependency

VMware Cloud on AWS:

What It Is:
- Native VMware vSphere running on AWS infrastructure
- Same VMware tools (vCenter, NSX, vSAN)
- Direct access to AWS services
- Managed by VMware

Architecture:
- Dedicated hosts in AWS
- Min: 2 hosts, can scale to 100s
- Direct Connect to on-premises
- Integrated with AWS VPC

Relocate Process:

Phase 1: Design (Week 1-2)
- Size VMware Cloud on AWS environment
- Plan network connectivity
- Design hybrid architecture

Phase 2: Setup (Week 3-4)
- Deploy VMware Cloud on AWS SDDC
- Configure networking (Direct Connect)
- Set up vCenter connectivity

Phase 3: Migration (Week 5-12)
- Use vMotion for live migration
- Or HCX for bulk migration
- Zero downtime for VMs
- Preserve IP addresses

Phase 4: Optimization (Month 4+)
- Right-size virtual machines
- Integrate with AWS services
- Implement cloud automation

Relocate Example:

Current State:
- 500 VMs on VMware vSphere
- Mix of Windows and Linux
- VMware NSX for networking
- vSAN for storage

Target: VMware Cloud on AWS
- Same 500 VMs
- Minimal changes
- Faster migration than rehost

Benefits:
+ Rapid migration (8 weeks vs 6 months rehost)
+ Leverage existing VMware skills
+ Use existing VMware tools
+ Integrated disaster recovery
+ Access to AWS services when ready

Costs:
- Per host: ~$8,500/month
- 50 VMs per host = 10 hosts required
- Total: $85,000/month
- Higher than native AWS (would be ~$30K/month)

Trade-offs:
+ Speed: Much faster migration
+ Skills: Use existing VMware team
+ Risk: Lower (familiar environment)
- Cost: Higher than native AWS
- Lock-in: VMware dependency continues

Post-Migration Path:
Month 0-6: Run on VMware Cloud on AWS
Month 6-12: Begin replatforming to native AWS
Month 12-24: Gradual migration to native services
Year 3+: Minimal workloads left on VMware Cloud

Relocate is typically transitional strategy
Long-term: Migrate to native AWS services
```


## Hands-On Implementation

### Lab 1: Application Discovery and Assessment

**Objective:** Discover applications, analyze dependencies, and select migration strategies.

**Step 1: Deploy Application Discovery Agent**

```python
import boto3
import json

discovery = boto3.client('discovery')

def register_discovery_agents():
    """Register on-premises servers for discovery"""
    
    # AWS Application Discovery Service
    # Two discovery options:
    # 1. Agentless (using VMware vCenter)
    # 2. Agent-based (install agent on servers)
    
    print("=== Application Discovery Setup ===\n")
    
    # Configure agentless discovery (VMware)
    try:
        response = discovery.start_data_collection_by_agent_ids(
            agentIds=['agent-12345']  # Agent IDs from installed agents
        )
        
        print("Started discovery agent data collection")
    except Exception as e:
        print(f"Note: Install discovery agents on servers first")
        print("Download from: AWS Console → Migration Hub → Data Collectors")
    
    # Discovery process collects:
    print("\nDiscovery Data Collected:")
    print("- Server configuration (CPU, RAM, disk)")
    print("- Network connections (dependencies)")
    print("- Running processes")
    print("- Performance metrics")
    print("- Installed applications")
    
    return True

# Example: Query discovered servers
def query_discovered_servers():
    """Query servers discovered by Application Discovery Service"""
    
    try:
        servers = discovery.describe_configurations(
            configurationIds=[],  # Empty = all servers
            maxResults=100
        )
        
        print("\n=== Discovered Servers ===\n")
        
        for server in servers.get('configurations', []):
            print(f"Server: {server.get('hostName', 'Unknown')}")
            print(f"  OS: {server.get('osName', 'Unknown')}")
            print(f"  CPU: {server.get('cpuType', 'Unknown')}")
            print(f"  RAM: {server.get('totalRAM', 0)} MB")
            print(f"  IP: {server.get('ipAddress', 'Unknown')}")
            print()
    
    except Exception as e:
        print(f"Discovery data not available yet: {e}")
        print("Note: Discovery takes 15-30 minutes after agent installation")

register_discovery_agents()
query_discovered_servers()
```

**Step 2: Analyze Application Dependencies**

```python
def analyze_application_dependencies():
    """Map application dependencies for migration planning"""
    
    # Get network connections from discovery
    discovery = boto3.client('discovery')
    
    try:
        connections = discovery.list_configurations(
            configurationType='CONNECTION',
            maxResults=1000
        )
        
        print("\n=== Application Dependencies ===\n")
        
        # Build dependency map
        dependency_map = {}
        
        for connection in connections.get('configurations', []):
            source = connection['sourceServerId']
            destination = connection['destinationServerId']
            port = connection.get('destinationPort', 'unknown')
            
            if source not in dependency_map:
                dependency_map[source] = []
            
            dependency_map[source].append({
                'destination': destination,
                'port': port
            })
        
        # Identify application groups (servers that communicate)
        print("Application Groups (based on dependencies):\n")
        
        # Simple grouping algorithm
        visited = set()
        groups = []
        
        def find_group(server_id, current_group):
            if server_id in visited:
                return
            
            visited.add(server_id)
            current_group.add(server_id)
            
            # Find all servers this one connects to
            if server_id in dependency_map:
                for dep in dependency_map[server_id]:
                    find_group(dep['destination'], current_group)
        
        for server_id in dependency_map.keys():
            if server_id not in visited:
                group = set()
                find_group(server_id, group)
                if group:
                    groups.append(group)
        
        for i, group in enumerate(groups, 1):
            print(f"Group {i}: {len(group)} servers")
            print(f"  Servers: {', '.join(list(group)[:5])}")
            if len(group) > 5:
                print(f"  ... and {len(group) - 5} more")
            print()
        
        return groups
    
    except Exception as e:
        print(f"Unable to analyze dependencies: {e}")
        return []

# Analyze dependencies
groups = analyze_application_dependencies()
```

**Step 3: Assess Applications and Select 7R Strategy**

```python
def assess_application_for_migration(app_details):
    """Assess application and recommend migration strategy (7 Rs)"""
    
    print(f"\n=== Assessment: {app_details['name']} ===\n")
    
    score = {
        'rehost': 0,
        'replatform': 0,
        'refactor': 0,
        'repurchase': 0,
        'retire': 0,
        'retain': 0,
        'relocate': 0
    }
    
    # Factor 1: Business criticality
    if app_details['criticality'] == 'tier0':
        score['retain'] += 2  # Migrate carefully, later
        score['refactor'] += 1  # Worth modernizing
    elif app_details['criticality'] == 'tier1':
        score['replatform'] += 2
        score['refactor'] += 1
    else:
        score['rehost'] += 3  # Quick migration OK
    
    # Factor 2: Technical complexity
    if app_details['complexity'] == 'simple':
        score['rehost'] += 3
        score['replatform'] += 2
    elif app_details['complexity'] == 'moderate':
        score['replatform'] += 3
        score['refactor'] += 1
    else:  # complex
        score['refactor'] += 2
        score['retain'] += 2
    
    # Factor 3: Usage pattern
    if app_details['active_users'] == 0:
        score['retire'] += 10  # Strong signal
    elif app_details['active_users'] < 10:
        score['retire'] += 3
        score['repurchase'] += 2
    
    # Factor 4: Technology stack
    if 'database' in app_details['components']:
        score['replatform'] += 2  # RDS opportunity
    
    if 'vmware' in app_details.get('platform', ''):
        score['relocate'] += 2
    
    # Factor 5: Age and technical debt
    if app_details['age_years'] > 10:
        score['refactor'] += 2
        score['repurchase'] += 1
    
    # Factor 6: Availability of SaaS alternative
    if app_details.get('saas_alternative'):
        score['repurchase'] += 3
    
    # Factor 7: Recent investment
    if app_details.get('recent_hardware_investment'):
        score['retain'] += 3
    
    # Select top strategy
    recommended = max(score, key=score.get)
    confidence = score[recommended] / sum(score.values()) * 100 if sum(score.values()) > 0 else 0
    
    print(f"Recommended Strategy: {recommended.upper()}")
    print(f"Confidence: {confidence:.0f}%")
    print(f"\nScores:")
    for strategy, points in sorted(score.items(), key=lambda x: x[1], reverse=True):
        if points > 0:
            print(f"  {strategy}: {points}")
    
    # Provide rationale
    print(f"\nRationale:")
    if recommended == 'retire':
        print(f"  - Low/no usage detected ({app_details['active_users']} users)")
        print(f"  - Consider decommissioning to reduce costs")
    
    elif recommended == 'rehost':
        print(f"  - Simple application suitable for lift-and-shift")
        print(f"  - Fast migration with low risk")
        print(f"  - Can optimize later")
    
    elif recommended == 'replatform':
        print(f"  - Opportunity to use managed services (RDS, etc.)")
        print(f"  - Moderate effort with good cloud benefits")
        print(f"  - Balance of speed and optimization")
    
    elif recommended == 'refactor':
        print(f"  - High business value justifies modernization")
        print(f"  - Significant benefits from cloud-native architecture")
        print(f"  - Plan for extended timeline")
    
    elif recommended == 'repurchase':
        print(f"  - SaaS alternative available: {app_details.get('saas_alternative')}")
        print(f"  - Reduce maintenance overhead")
        print(f"  - Modern features and capabilities")
    
    elif recommended == 'retain':
        print(f"  - Migration blocked or not yet justified")
        print(f"  - Review in next wave")
        print(f"  - Set specific review date")
    
    return {
        'strategy': recommended,
        'confidence': confidence,
        'scores': score
    }

# Example assessments
applications = [
    {
        'name': 'Internal Wiki',
        'criticality': 'tier3',
        'complexity': 'simple',
        'active_users': 5,
        'components': ['web server', 'database'],
        'age_years': 8,
        'saas_alternative': 'Confluence Cloud',
        'recent_hardware_investment': False
    },
    {
        'name': 'E-commerce Platform',
        'criticality': 'tier0',
        'complexity': 'complex',
        'active_users': 10000,
        'components': ['web server', 'app server', 'database', 'cache'],
        'age_years': 12,
        'saas_alternative': None,
        'recent_hardware_investment': False
    },
    {
        'name': 'File Server',
        'criticality': 'tier2',
        'complexity': 'simple',
        'active_users': 50,
        'components': ['file server'],
        'age_years': 5,
        'platform': 'vmware',
        'recent_hardware_investment': False
    }
]

results = []
for app in applications:
    result = assess_application_for_migration(app)
    results.append({'app': app['name'], **result})

# Summary report
print("\n=== Migration Strategy Summary ===\n")
for result in results:
    print(f"{result['app']}: {result['strategy'].upper()} ({result['confidence']:.0f}% confidence)")
```

### Lab 2: Database Migration Service (DMS)

**Objective:** Migrate database from on-premises to AWS with minimal downtime using DMS.

**Step 1: Create DMS Replication Instance**

```python
import boto3
import time

dms = boto3.client('dms')

def create_replication_instance():
    """Create DMS replication instance for database migration"""
    
    print("=== Creating DMS Replication Instance ===\n")
    
    try:
        response = dms.create_replication_instance(
            ReplicationInstanceIdentifier='migration-replication-instance',
            ReplicationInstanceClass='dms.t3.medium',  # Start with medium, can scale up
            AllocatedStorage=100,  # GB
            VpcSecurityGroupIds=['sg-replication-security-group'],
            AvailabilityZone='us-east-1a',
            MultiAZ=False,  # True for production (higher availability)
            EngineVersion='3.4.7',
            PubliclyAccessible=False,
            Tags=[
                {'Key': 'Project', 'Value': 'Database Migration'},
                {'Key': 'Environment', 'Value': 'Production'}
            ]
        )
        
        replication_instance_arn = response['ReplicationInstance']['ReplicationInstanceArn']
        
        print(f"Created replication instance: {replication_instance_arn}")
        print("Waiting for instance to become available...")
        
        # Wait for replication instance to be ready
        waiter = dms.get_waiter('replication_instance_available')
        waiter.wait(
            Filters=[
                {'Name': 'replication-instance-id', 'Values': ['migration-replication-instance']}
            ]
        )
        
        print("✓ Replication instance ready")
        
        return replication_instance_arn
    
    except Exception as e:
        print(f"Error creating replication instance: {e}")
        return None

replication_instance_arn = create_replication_instance()
```

**Step 2: Create Source and Target Endpoints**

```python
def create_source_endpoint():
    """Create source endpoint (on-premises database)"""
    
    print("\n=== Creating Source Endpoint ===\n")
    
    try:
        response = dms.create_endpoint(
            EndpointIdentifier='source-mysql-onprem',
            EndpointType='source',
            EngineName='mysql',
            Username='admin',
            Password='SecurePassword123!',  # Use Secrets Manager in production
            ServerName='onprem-db-server.company.com',
            Port=3306,
            DatabaseName='production_db',
            ExtraConnectionAttributes='',
            Tags=[
                {'Key': 'Type', 'Value': 'Source'},
                {'Key': 'Location', 'Value': 'OnPremises'}
            ]
        )
        
        endpoint_arn = response['Endpoint']['EndpointArn']
        
        print(f"Created source endpoint: {endpoint_arn}")
        
        # Test connection
        print("Testing source endpoint connection...")
        
        test_response = dms.test_connection(
            ReplicationInstanceArn=replication_instance_arn,
            EndpointArn=endpoint_arn
        )
        
        # Wait for test to complete
        time.sleep(30)
        
        connection = dms.describe_connections(
            Filters=[
                {'Name': 'endpoint-arn', 'Values': [endpoint_arn]}
            ]
        )
        
        status = connection['Connections'][0]['Status']
        
        if status == 'successful':
            print("✓ Source connection successful")
        else:
            print(f"✗ Source connection failed: {status}")
        
        return endpoint_arn
    
    except Exception as e:
        print(f"Error creating source endpoint: {e}")
        return None

def create_target_endpoint():
    """Create target endpoint (RDS on AWS)"""
    
    print("\n=== Creating Target Endpoint ===\n")
    
    # Get RDS instance endpoint
    rds = boto3.client('rds')
    
    db_instance = rds.describe_db_instances(
        DBInstanceIdentifier='production-rds-mysql'
    )
    
    rds_endpoint = db_instance['DBInstances'][0]['Endpoint']['Address']
    rds_port = db_instance['DBInstances'][0]['Endpoint']['Port']
    
    try:
        response = dms.create_endpoint(
            EndpointIdentifier='target-rds-mysql',
            EndpointType='target',
            EngineName='mysql',
            Username='admin',
            Password='SecurePassword123!',
            ServerName=rds_endpoint,
            Port=rds_port,
            DatabaseName='production_db',
            ExtraConnectionAttributes='',
            Tags=[
                {'Key': 'Type', 'Value': 'Target'},
                {'Key': 'Location', 'Value': 'AWS RDS'}
            ]
        )
        
        endpoint_arn = response['Endpoint']['EndpointArn']
        
        print(f"Created target endpoint: {endpoint_arn}")
        
        # Test connection
        print("Testing target endpoint connection...")
        
        dms.test_connection(
            ReplicationInstanceArn=replication_instance_arn,
            EndpointArn=endpoint_arn
        )
        
        time.sleep(30)
        
        connection = dms.describe_connections(
            Filters=[
                {'Name': 'endpoint-arn', 'Values': [endpoint_arn]}
            ]
        )
        
        status = connection['Connections'][0]['Status']
        
        if status == 'successful':
            print("✓ Target connection successful")
        else:
            print(f"✗ Target connection failed: {status}")
        
        return endpoint_arn
    
    except Exception as e:
        print(f"Error creating target endpoint: {e}")
        return None

source_endpoint_arn = create_source_endpoint()
target_endpoint_arn = create_target_endpoint()
```

**Step 3: Create Replication Task**

```python
def create_replication_task(source_arn, target_arn):
    """Create DMS replication task with table mappings"""
    
    print("\n=== Creating Replication Task ===\n")
    
    # Table mappings (which tables to migrate)
    table_mappings = {
        "rules": [
            {
                "rule-type": "selection",
                "rule-id": "1",
                "rule-name": "1",
                "object-locator": {
                    "schema-name": "production_db",
                    "table-name": "%"  # All tables
                },
                "rule-action": "include"
            },
            {
                "rule-type": "transformation",
                "rule-id": "2",
                "rule-name": "2",
                "rule-target": "schema",
                "object-locator": {
                    "schema-name": "production_db"
                },
                "rule-action": "rename",
                "value": "production_db",
                "old-value": None
            }
        ]
    }
    
    try:
        response = dms.create_replication_task(
            ReplicationTaskIdentifier='production-db-migration',
            SourceEndpointArn=source_arn,
            TargetEndpointArn=target_arn,
            ReplicationInstanceArn=replication_instance_arn,
            MigrationType='full-load-and-cdc',  # Full load + ongoing replication
            TableMappings=json.dumps(table_mappings),
            ReplicationTaskSettings=json.dumps({
                "TargetMetadata": {
                    "TargetSchema": "",
                    "SupportLobs": True,
                    "FullLobMode": False,
                    "LobChunkSize": 64,
                    "LimitedSizeLobMode": True,
                    "LobMaxSize": 32
                },
                "FullLoadSettings": {
                    "TargetTablePrepMode": "DO_NOTHING",  # Don't drop tables
                    "CreatePkAfterFullLoad": False,
                    "StopTaskCachedChangesApplied": False,
                    "StopTaskCachedChangesNotApplied": False,
                    "MaxFullLoadSubTasks": 8,
                    "TransactionConsistencyTimeout": 600,
                    "CommitRate": 10000
                },
                "Logging": {
                    "EnableLogging": True,
                    "LogComponents": [
                        {
                            "Id": "SOURCE_CAPTURE",
                            "Severity": "LOGGER_SEVERITY_DEFAULT"
                        },
                        {
                            "Id": "TARGET_APPLY",
                            "Severity": "LOGGER_SEVERITY_INFO"
                        }
                    ]
                }
            }),
            Tags=[
                {'Key': 'Migration', 'Value': 'Production Database'},
                {'Key': 'Priority', 'Value': 'High'}
            ]
        )
        
        task_arn = response['ReplicationTask']['ReplicationTaskArn']
        
        print(f"Created replication task: {task_arn}")
        print("\nTask Configuration:")
        print("  Migration Type: Full Load + CDC (Change Data Capture)")
        print("  Source: On-premises MySQL")
        print("  Target: AWS RDS MySQL")
        print("  Tables: All tables in production_db schema")
        
        return task_arn
    
    except Exception as e:
        print(f"Error creating replication task: {e}")
        return None

task_arn = create_replication_task(source_endpoint_arn, target_endpoint_arn)
```

**Step 4: Start Replication and Monitor**

```python
def start_replication_task(task_arn):
    """Start database replication"""
    
    print("\n=== Starting Replication Task ===\n")
    
    try:
        dms.start_replication_task(
            ReplicationTaskArn=task_arn,
            StartReplicationTaskType='start-replication'
        )
        
        print("Replication task started")
        print("\nPhase 1: Full Load (copying all existing data)")
        print("This may take several hours depending on database size")
        
        # Monitor progress
        while True:
            response = dms.describe_replication_tasks(
                Filters=[
                    {'Name': 'replication-task-arn', 'Values': [task_arn]}
                ]
            )
            
            task = response['ReplicationTasks'][0]
            status = task['Status']
            
            if status == 'running':
                stats = task.get('ReplicationTaskStats', {})
                
                full_load_progress = stats.get('FullLoadProgressPercent', 0)
                tables_loaded = stats.get('TablesLoaded', 0)
                tables_loading = stats.get('TablesLoading', 0)
                tables_queued = stats.get('TablesQueued', 0)
                
                print(f"\rProgress: {full_load_progress}% | "
                      f"Loaded: {tables_loaded} | "
                      f"Loading: {tables_loading} | "
                      f"Queued: {tables_queued}", end='')
                
                if full_load_progress >= 100:
                    print("\n\n✓ Full load complete")
                    print("Phase 2: CDC (Change Data Capture) - ongoing replication")
                    break
            
            elif status == 'stopped':
                print(f"\n✗ Task stopped: {task.get('StopReason', 'Unknown')}")
                break
            
            elif status == 'failed':
                print(f"\n✗ Task failed: {task.get('StopReason', 'Unknown')}")
                break
            
            time.sleep(30)  # Check every 30 seconds
        
        # Show CDC statistics
        print("\nCDC Statistics:")
        stats = task.get('ReplicationTaskStats', {})
        print(f"  Changes Captured: {stats.get('CdcChangesDiskTarget', 0)}")
        print(f"  Changes Applied: {stats.get('CdcChangesAppliedTarget', 0)}")
        print(f"  Latency: {stats.get('CdcLatencyTarget', 0)} seconds")
        
    except Exception as e:
        print(f"Error starting replication: {e}")

start_replication_task(task_arn)
```

**Step 5: Cutover Process**

```python
def perform_database_cutover(task_arn):
    """Perform final cutover to AWS database"""
    
    print("\n=== Database Cutover Process ===\n")
    
    # Pre-cutover validation
    print("Step 1: Pre-Cutover Validation")
    
    # Check replication lag
    response = dms.describe_replication_tasks(
        Filters=[{'Name': 'replication-task-arn', 'Values': [task_arn]}]
    )
    
    stats = response['ReplicationTasks'][0].get('ReplicationTaskStats', {})
    cdc_latency = stats.get('CdcLatencyTarget', 0)
    
    print(f"  Current replication lag: {cdc_latency} seconds")
    
    if cdc_latency > 10:
        print("  ⚠️  High replication lag - wait for lag to decrease")
        return False
    
    print("  ✓ Replication lag acceptable")
    
    # Validate row counts
    print("\nStep 2: Validate Row Counts")
    
    source_counts = {
        'users': 10000,
        'orders': 50000,
        'products': 5000
    }  # Query from source database
    
    target_counts = {
        'users': 10000,
        'orders': 50000,
        'products': 5000
    }  # Query from target database
    
    mismatch = False
    for table in source_counts:
        if source_counts[table] != target_counts[table]:
            print(f"  ✗ {table}: Source={source_counts[table]}, Target={target_counts[table]}")
            mismatch = True
        else:
            print(f"  ✓ {table}: {source_counts[table]} rows")
    
    if mismatch:
        print("\n  ⚠️  Row count mismatch - investigate before cutover")
        return False
    
    # Cutover steps
    print("\nStep 3: Application Cutover")
    print("  a. Stop application writes to source database")
    input("     Press Enter when application is stopped...")
    
    print("  b. Wait for final CDC changes to replicate")
    time.sleep(30)
    
    print("  c. Verify no replication lag")
    response = dms.describe_replication_tasks(
        Filters=[{'Name': 'replication-task-arn', 'Values': [task_arn]}]
    )
    final_lag = response['ReplicationTasks'][0]['ReplicationTaskStats'].get('CdcLatencyTarget', 0)
    print(f"     Final lag: {final_lag} seconds")
    
    print("  d. Update application connection string to RDS endpoint")
    print("     Old: onprem-db-server.company.com:3306")
    print("     New: production-rds-mysql.abc123.us-east-1.rds.amazonaws.com:3306")
    
    input("     Press Enter when connection string updated...")
    
    print("  e. Start application pointing to RDS")
    input("     Press Enter when application started...")
    
    print("\nStep 4: Post-Cutover Validation")
    print("  ✓ Application started successfully")
    print("  ✓ Users can access application")
    print("  ✓ Database writes working")
    
    print("\nStep 5: Cleanup")
    print("  - Keep DMS task running for 24 hours (rollback capability)")
    print("  - Monitor application performance")
    print("  - After 24 hours: Stop DMS task, delete replication instance")
    
    print("\n✓ Database Migration Complete!")
    
    return True

# Perform cutover during maintenance window
perform_database_cutover(task_arn)
```


### Lab 3: Server Migration with Application Migration Service

**Objective:** Migrate EC2 servers using AWS Application Migration Service (MGN).

**Step 1: Install MGN Agent on Source Servers**

```bash
# On source server (on-premises or EC2)

# Download MGN agent
wget -O ./aws-replication-installer-init.py https://aws-application-migration-service-us-east-1.s3.us-east-1.amazonaws.com/latest/linux/aws-replication-installer-init.py

# Install agent
sudo python3 aws-replication-installer-init.py \
    --region us-east-1 \
    --aws-access-key-id AKIAIOSFODNN7EXAMPLE \
    --aws-secret-access-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Agent will:
# - Install replication software
# - Start continuous data replication to AWS
# - Create staging area in AWS
# - Replicate all disks block-by-block
```

**Step 2: Monitor Replication Progress**

```python
mgn = boto3.client('mgn')

def monitor_server_replication():
    """Monitor MGN replication progress"""
    
    print("=== Server Replication Status ===\n")
    
    try:
        response = mgn.describe_source_servers()
        
        for server in response['items']:
            server_id = server['sourceServerID']
            hostname = server.get('sourceProperties', {}).get('identificationHints', {}).get('hostname', 'Unknown')
            
            replication_status = server['dataReplicationInfo']['dataReplicationState']
            
            print(f"Server: {hostname} ({server_id})")
            print(f"  Status: {replication_status}")
            
            if replication_status == 'CONTINUOUS':
                lag = server['dataReplicationInfo']['lagDuration']
                replicated_disks = server['dataReplicationInfo']['replicatedDisks']
                
                print(f"  Replication lag: {lag}")
                print(f"  Disks:")
                
                for disk in replicated_disks:
                    device = disk['deviceName']
                    replicated_bytes = disk['replicatedStorageBytes']
                    total_bytes = disk['totalStorageBytes']
                    
                    progress = (replicated_bytes / total_bytes * 100) if total_bytes > 0 else 0
                    
                    print(f"    {device}: {progress:.1f}% ({replicated_bytes}/{total_bytes} bytes)")
            
            elif replication_status == 'INITIAL_SYNC':
                print(f"  Status: Initial synchronization in progress")
            
            print()
    
    except Exception as e:
        print(f"Error monitoring replication: {e}")

# Monitor replication
monitor_server_replication()
```

**Step 3: Launch Test Instance**

```python
def launch_test_instance(source_server_id):
    """Launch test instance in AWS"""
    
    print(f"\n=== Launching Test Instance ===\n")
    
    try:
        response = mgn.start_test(
            sourceServerIDs=[source_server_id]
        )
        
        job_id = response['job']['jobID']
        
        print(f"Test launch job started: {job_id}")
        print("Waiting for instance to launch...")
        
        # Monitor job status
        while True:
            job_status = mgn.describe_jobs(
                filters={'jobIDs': [job_id]}
            )
            
            status = job_status['items'][0]['status']
            
            if status == 'COMPLETED':
                print("\n✓ Test instance launched successfully")
                
                # Get instance details
                server = mgn.describe_source_servers(
                    filters={'sourceServerIDs': [source_server_id]}
                )
                
                launched_instance = server['items'][0]['launchedInstance']
                ec2_instance_id = launched_instance['ec2InstanceID']
                
                print(f"EC2 Instance ID: {ec2_instance_id}")
                
                # Get instance IP
                ec2 = boto3.client('ec2')
                instance = ec2.describe_instances(InstanceIds=[ec2_instance_id])
                
                private_ip = instance['Reservations'][0]['Instances'][0]['PrivateIpAddress']
                
                print(f"Private IP: {private_ip}")
                print("\nTest the application:")
                print(f"  ssh ec2-user@{private_ip}")
                print(f"  Test application functionality")
                print(f"  Validate performance")
                
                return ec2_instance_id
            
            elif status == 'FAILED':
                print(f"\n✗ Test launch failed")
                break
            
            time.sleep(30)
    
    except Exception as e:
        print(f"Error launching test instance: {e}")
        return None

# Launch test instance
test_instance_id = launch_test_instance('s-1234567890abcdef0')
```

**Step 4: Cutover to Production**

```python
def perform_server_cutover(source_server_id):
    """Perform cutover to production instance"""
    
    print("\n=== Server Cutover Process ===\n")
    
    print("Pre-Cutover Checklist:")
    print("  □ Test instance validated")
    print("  □ Application tested and working")
    print("  □ Performance acceptable")
    print("  □ Replication lag < 5 minutes")
    print("  □ Maintenance window scheduled")
    print("  □ Rollback plan documented")
    print("  □ Stakeholders notified")
    
    proceed = input("\nReady to proceed with cutover? (yes/no): ")
    
    if proceed.lower() != 'yes':
        print("Cutover cancelled")
        return False
    
    try:
        # Step 1: Mark server as ready for cutover
        print("\nStep 1: Marking server ready for cutover...")
        
        mgn.mark_as_archived(
            sourceServerID=source_server_id
        )
        
        # Step 2: Finalize cutover
        print("Step 2: Finalizing cutover...")
        
        response = mgn.start_cutover(
            sourceServerIDs=[source_server_id]
        )
        
        job_id = response['job']['jobID']
        
        print(f"Cutover job started: {job_id}")
        
        # Monitor cutover
        while True:
            job_status = mgn.describe_jobs(
                filters={'jobIDs': [job_id]}
            )
            
            status = job_status['items'][0]['status']
            
            print(f"  Status: {status}")
            
            if status == 'COMPLETED':
                print("\n✓ Cutover completed successfully")
                
                # Get production instance details
                server = mgn.describe_source_servers(
                    filters={'sourceServerIDs': [source_server_id]}
                )
                
                ec2_instance_id = server['items'][0]['launchedInstance']['ec2InstanceID']
                
                print(f"\nProduction Instance: {ec2_instance_id}")
                print("\nPost-Cutover Tasks:")
                print("  1. Update DNS/Load Balancer to point to new instance")
                print("  2. Monitor application for issues")
                print("  3. Keep source server for 24-48 hours (rollback)")
                print("  4. After validation period: Decommission source server")
                
                return True
            
            elif status == 'FAILED':
                print("\n✗ Cutover failed - investigate and retry")
                return False
            
            time.sleep(30)
    
    except Exception as e:
        print(f"Error during cutover: {e}")
        return False

# Perform cutover
cutover_success = perform_server_cutover('s-1234567890abcdef0')
```


## Production-Level Knowledge

### Wave Planning Strategy

**Large-Scale Migration Execution:**

```
Wave Planning Principles:

Wave = Group of applications migrated together
Typically: 10-50 applications per wave
Duration: 2-4 weeks per wave

Wave Grouping Criteria:

1. Dependencies:
   - Applications communicating together migrate in same wave
   - Minimize cross-wave dependencies
   - Dependency mapping critical

2. Risk Profile:
   - Wave 1: Low-risk, non-critical applications (pilots)
   - Wave 2-3: Medium-risk applications
   - Wave 4+: High-risk, mission-critical applications
   - Build confidence progressively

3. Technical Similarity:
   - Similar technology stacks together
   - Reuse migration patterns
   - Team expertise alignment

4. Business Alignment:
   - Group by business unit
   - Minimize business disruption
   - Coordinate with business cycles

5. Resource Availability:
   - Match wave size to team capacity
   - Consider learning curve
   - Allow buffer time between waves

Example Wave Plan:

Organization: 500 applications, 24-month migration

Wave 1 (Month 1-2): Pilot - 20 applications
- Criteria: Low complexity, non-critical, few dependencies
- Purpose: Validate tools, train team, build playbooks
- Risk: Low
- Examples: Development tools, internal wikis, file servers

Wave 2 (Month 3-4): Early Adopters - 50 applications
- Criteria: Low-medium complexity, willing business partners
- Purpose: Scale processes, refine automation
- Risk: Low-Medium
- Examples: Departmental applications, non-customer-facing

Wave 3-4 (Month 5-8): Business Applications - 100 applications
- Criteria: Medium complexity, moderate dependencies
- Purpose: Main migration momentum
- Risk: Medium
- Examples: CRM, HR systems, collaboration tools

Wave 5-6 (Month 9-12): Customer-Facing - 150 applications
- Criteria: High complexity, customer-impacting
- Purpose: Strategic application migration
- Risk: Medium-High
- Examples: E-commerce, customer portals, mobile backends

Wave 7-8 (Month 13-18): Core Systems - 100 applications
- Criteria: Mission-critical, complex dependencies
- Purpose: Core business platform migration
- Risk: High
- Examples: ERP, core banking, order management

Wave 9-10 (Month 19-24): Final Applications - 80 applications
- Criteria: Highest complexity, tight integrations
- Purpose: Complete migration
- Risk: High
- Examples: Mainframe-dependent, legacy custom apps

Buffer: 50 applications retained or retired

Wave Execution Process:

Week 1: Planning
- Finalize application list
- Confirm dependencies
- Schedule maintenance windows
- Prepare rollback procedures

Week 2: Preparation
- Install agents (DMS, MGN)
- Start replication
- Create target infrastructure
- Validate connectivity

Week 3: Migration
- Launch test instances
- Application testing
- Performance validation
- Issue remediation

Week 4: Cutover
- Production cutover per application
- Monitor and stabilize
- Decommission source systems
- Document lessons learned

Week 5: Buffer/Catch-up
- Address any delayed applications
- Resolve issues from previous wave
- Prepare for next wave

Success Metrics per Wave:

- Applications migrated: Target vs Actual
- Downtime: Planned vs Actual (minutes)
- Rollbacks: Count and reasons
- Issues: Count and severity
- Performance: Before vs After
- Cost: On-prem vs AWS (monthly)

Wave Review (End of Each):
- What went well?
- What didn't go well?
- Process improvements for next wave
- Tool/automation enhancements
- Team skill development needs
```


### Cutover Strategy and Rollback Planning

**Minimizing Downtime and Risk:**

```
Cutover Strategies:

1. Big Bang Cutover:
   Switch all users at once
   
   When to use:
   - Small user base
   - Low-risk application
   - Simple architecture
   
   Downtime: 2-8 hours
   
   Process:
   - Maintenance window scheduled
   - Application stopped
   - Final data sync
   - DNS/routing switched
   - Application started on AWS
   - Users resume

2. Phased Cutover:
   Migrate users gradually
   
   When to use:
   - Large user base
   - Ability to segment users
   - Complex application
   
   Downtime: Near-zero
   
   Process:
   Week 1: 10% of users → AWS
   Week 2: 25% of users → AWS
   Week 3: 50% of users → AWS
   Week 4: 100% of users → AWS
   
   Rollback: Easy (redirect back)

3. Blue/Green Cutover:
   Run both environments in parallel
   
   When to use:
   - Mission-critical applications
   - Zero-downtime requirement
   - Database supports dual-write
   
   Downtime: 0 minutes
   
   Process:
   - Green (AWS) ready and tested
   - Blue (on-prem) still serving traffic
   - Switch load balancer: Blue → Green
   - Monitor for issues
   - Keep Blue running for rollback

4. Pilot Cutover:
   Small group of users first
   
   When to use:
   - High-risk applications
   - Need user validation
   - Complex integrations
   
   Downtime: 0-2 hours
   
   Process:
   - 5-10 pilot users to AWS
   - Gather feedback for 1-2 weeks
   - Fix issues
   - Full cutover after validation

Cutover Timing Considerations:

Best Time:
- Weekend or off-hours
- Low-traffic periods
- Outside business-critical periods (end-of-month, etc.)
- Weather: Avoid major holidays

Example:
E-commerce: Sunday 2-6 AM (lowest traffic)
Banking: Saturday night (markets closed)
Healthcare: Avoid shift changes

Rollback Planning:

Rollback Decision Criteria:
- Application not starting
- Performance degradation > 50%
- Data corruption detected
- Critical functionality broken
- > 10% error rate

Rollback Procedures:

Database Rollback:
1. Stop application writes to AWS
2. Switch connection string back to on-prem
3. Resume writes to source database
4. DMS still replicating (sync AWS from on-prem)
5. Investigate and fix issues
6. Retry cutover when ready

Application Rollback:
1. Switch DNS back to on-prem IPs
2. Terminate AWS instances
3. Resume on-prem application
4. Downtime: 30-60 minutes

Prevention of Rollback Needs:
✓ Thorough testing of migrated application
✓ Performance baseline comparison
✓ Smoke tests before cutover
✓ Gradual traffic ramp-up
✓ Monitoring dashboards ready
✓ Team on standby during cutover

Rollback Statistics:
Industry average: 5-10% of migrations need rollback
Well-planned migrations: < 2% rollback rate

Common Rollback Reasons:
1. Performance issues (40%)
2. Integration failures (30%)
3. Data inconsistencies (15%)
4. Undiscovered dependencies (10%)
5. Other (5%)

Post-Cutover Monitoring:

Hour 0-4: Intensive monitoring
- Application logs
- Error rates
- Response times
- Database connections
- User feedback

Hour 4-24: Active monitoring
- Performance metrics
- User reports
- Integration health
- Cost tracking

Day 2-7: Ongoing monitoring
- Stability validation
- Performance tuning
- Issue resolution
- User acceptance

Day 8-30: Stabilization
- Optimization opportunities
- Final decommissioning of source
- Lessons learned documentation
```


## Tips \& Best Practices

**Tip 1: Start with Non-Critical Applications**
First wave should be low-risk pilots—build team confidence, refine processes, validate tools before tackling mission-critical systems.

**Tip 2: Over-Communicate with Stakeholders**
Weekly migration updates, clear timelines, impact explanations—reduces resistance, manages expectations, ensures business alignment.

**Tip 3: Automate Wherever Possible**
Scripts for pre-flight checks, automated testing, infrastructure-as-code—reduces human error, increases migration velocity, enables repeatability.

**Tip 4: Test, Test, Test**
Test migrations multiple times before production cutover—identifies issues early, builds confidence, reduces cutover risks dramatically.

**Tip 5: Maintain Detailed Runbooks**
Step-by-step procedures for each application type—enables team scaling, ensures consistency, critical for 24/7 cutover support.

**Tip 6: Plan for 20% More Time**
Migrations take longer than estimated—dependencies discovered late, unexpected issues, scope creep; buffer prevents timeline pressure.

**Tip 7: Celebrate Small Wins**
Recognize successful wave completions—maintains team morale, builds momentum, reinforces positive migration culture.

**Tip 8: Keep Source Systems for 30+ Days**
Don't decommission immediately after cutover—allows rollback window, time for issue discovery, reduces pressure on cutover success.

**Tip 9: Document Everything**
Migration decisions, issues encountered, resolutions—becomes organizational knowledge, helps future migrations, reduces repeated mistakes.

**Tip 10: Optimize After Migration**
Don't over-optimize during migration—get to cloud first (rehost), then optimize (replatform/refactor); de-risks migration timeline.

## Chapter Summary

AWS migration strategies, codified in the 7 Rs framework (Rehost, Replatform, Repurchase, Refactor, Retire, Retain, Relocate), provide systematic methodology for evaluating and migrating applications from on-premises to cloud. Organizations successfully migrating 500+ applications over 18-24 months achieve 30-60% cost reduction, 50-90% faster deployment cycles, and operational efficiency gains through wave-based execution, dependency mapping, automated migration tools (DMS, MGN, Application Discovery Service), and disciplined cutover procedures with rollback plans. Success requires selecting appropriate strategy per application based on business criticality and technical complexity, thorough testing before production cutover, and treating migration as portfolio transformation rather than technical project.

**Key Takeaways:**

- **7 Rs Framework Provides Structure:** Each application assessed independently; Rehost (50-60%) for speed, Replatform (20-30%) for managed services, Refactor (10-20%) for cloud-native, Retire (10-15%) eliminates waste
- **Wave Planning Essential for Scale:** Group 10-50 applications per wave by dependencies, risk, and technology; start with low-risk pilots, end with mission-critical systems
- **Dependency Mapping Prevents Failures:** Undiscovered dependencies cause 30% of migration issues; Application Discovery Service maps connections automatically
- **Testing Before Cutover Non-Negotiable:** Multiple test migrations, performance validation, integration testing reduce rollback rate from 10% to <2%
- **DMS Enables Near-Zero Downtime Database Migration:** Full-load + CDC allows continuous replication; production cutover in 1-hour maintenance window with rollback capability
- **Rollback Plans Required for Every Migration:** Define rollback criteria, document procedures, keep source systems 30+ days; enables risk-taking with safety net
- **Retire 10-15% of Portfolio:** Discovery reveals unused applications; retiring 150 of 500 applications saves \$500K+ annually, reduces migration scope 30%

Migration success measured by: applications migrated on schedule (95%+ target), planned vs actual downtime (< 120% planned), rollback rate (< 2%), cost savings vs baseline (30-60%), and team satisfaction (learn and improve each wave). Organizations treating migration as portfolio transformation—not just infrastructure move—realize maximum cloud value through strategic refactoring of tier-1 applications while efficiently rehosting tier-3 applications.

## Review Questions

1. **What percentage of applications typically use Rehost strategy?**
a) 20-30%
b) 40-50%
c) 50-60% ✓
d) 70-80%

**Answer: C** - Rehost (lift-and-shift) typically used for 50-60% of applications for speed and simplicity

2. **What does CDC stand for in database migration?**
a) Cloud Data Capture
b) Change Data Capture ✓
c) Continuous Database Copy
d) Central Data Collection

**Answer: B** - Change Data Capture replicates ongoing database changes after initial full load

3. **Which migration strategy has highest cloud benefits but slowest speed?**
a) Rehost
b) Replatform
c) Refactor ✓
d) Relocate

**Answer: C** - Refactor (re-architect) provides maximum cloud benefits but requires most time and effort

4. **What is recommended first wave application count?**
a) 5-10
b) 10-50 ✓
c) 100-200
d) 500+

**Answer: B** - First wave should be 10-50 low-risk applications to build confidence and refine processes

5. **What is typical rollback rate for well-planned migrations?**
a) < 2% ✓
b) 5-10%
c) 15-20%
d) 25-30%

**Answer: A** - Well-planned migrations achieve <2% rollback rate; industry average is 5-10%

6. **Which strategy is best for email system migration?**
a) Rehost
b) Replatform
c) Repurchase (SaaS like Microsoft 365) ✓
d) Refactor

**Answer: C** - Email is commodity service; SaaS alternatives (Microsoft 365, Google Workspace) superior to self-hosted

7. **How long should source systems be kept after cutover?**
a) 1 day
b) 1 week
c) 30+ days ✓
d) 1 year

**Answer: C** - Keep source systems 30+ days minimum for rollback capability and issue discovery

8. **What is Blue/Green cutover strategy?**
a) Migrate databases separately from applications
b) Run old and new environments in parallel, switch traffic ✓
c) Migrate in phases over weeks
d) Use blue team for migration, green team for operations

**Answer: B** - Blue/Green runs both environments, switches traffic instantly, enables quick rollback

9. **Which tool is used for database migration?**
a) AWS Server Migration Service
b) AWS Application Discovery Service
c) AWS Database Migration Service (DMS) ✓
d) AWS Migration Hub

**Answer: C** - DMS handles database migration with full-load + CDC for minimal downtime

10. **What percentage of applications are typically retired during migration?**
a) <1%
b) 5-10%
c) 10-15% ✓
d) 25-30%

**Answer: C** - Discovery typically reveals 10-15% of applications unused or redundant, eligible for retirement

***

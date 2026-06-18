# Chapitre 37 : Guide d'examen professionnel d'architecte de solutions

##Présentation

L'examen AWS Certified Solutions Architect – Professional (SAP-C02) est le summum des certifications d'architecture AWS. Il valide l'expertise en matière de conception de systèmes distribués complexes à l'échelle de l'entreprise nécessitant des connaissances techniques approfondies, une analyse de compromis sophistiquée et une prise de décision architecturale dans des conditions ambiguës.

Tandis que Solutions Architect Associate teste les compétences fondamentales en architecture, Professional présente des problèmes multicouches couvrant plusieurs services AWS, régions, comptes et environnements hybrides où les candidats doivent gérer des exigences contradictoires, optimiser simultanément plusieurs dimensions et concevoir des solutions satisfaisant à la conformité réglementaire, à la reprise après sinistre, à la complexité de la migration et aux contraintes organisationnelles.

L'examen a été mis à jour vers SAP-C02 en 2022 et reste d'actualité jusqu'en 2025. La certification professionnelle entraîne une prime salariale de 30 à 40 % par rapport aux pairs certifiés associés et est reconnue comme une validation de la capacité d'architecture d'entreprise.

> **Notes sur l'examen 2025 :** SAP-C02 a accru l'importance de la complexité organisationnelle et de l'amélioration continue. Attendez-vous à une gouvernance multi-comptes, des conceptions Transit Gateway, AWS Control Tower, une connectivité hybride avec Direct Connect et des scénarios de migration complexes. L'examen combine fréquemment 5 à 10 services par scénario.

## Théorie \&Concepts

### Structure et domaines de l'examen

**Comprendre l'examen SAP-C02 :**
```
AWS Certified Solutions Architect - Professional (SAP-C02)

EXAM DETAILS:
- Duration: 180 minutes (3 hours)
- Questions: 75 questions
- Format: Multiple choice and multiple response
- Passing Score: 750/1000 (75%)
- Cost: $300 USD
- Validity: 3 years
- Prerequisites: None (but Associate strongly recommended)
- Difficulty: Advanced (requires 2+ years AWS experience)

Question Distribution:

Domain 1: Design for Organizational Complexity (26% / ~20 questions)
- Cross-account authentication and access
- Multi-account AWS environments
- Hybrid connectivity (Direct Connect, VPN)
- Multi-region solutions

Domain 2: Design for New Solutions (29% / ~22 questions)
- Security requirements and controls
- Reliability requirements
- Business continuity requirements
- Performance objectives
- Deployment strategies

Domain 3: Migration Planning (8% / ~6 questions)
- Migration assessment and readiness
- Migration strategies (7 Rs)
- Database migration
- Large-scale data transfer

Domain 4: Cost Control (11% / ~8 questions)
- Cost-effective pricing models
- Storage cost optimization
- Compute cost optimization
- Data transfer cost optimization

Domain 5: Continuous Improvement for Existing Solutions (26% / ~20 questions)
- Troubleshooting operational issues
- Performance improvements
- Cost optimization strategies
- Security improvements
- Deployment improvements

Comparison: Professional vs Associate

ASSOCIATE:
- Straightforward scenarios
- Single correct answer often obvious
- Focus on core services
- Limited complexity
- 130 minutes / 65 questions

PROFESSIONAL:
- Multi-faceted scenarios
- Multiple viable solutions (choose BEST)
- Deep knowledge required
- High complexity
- 180 minutes / 75 questions (more time per question needed)

Example Difference:

ASSOCIATE Question:
"A company needs a managed relational database with automatic backups. 
Which service should be used?"
Answer: Amazon RDS

PROFESSIONAL Question:
"A financial services company operates in 5 AWS regions serving global 
customers. The company needs a relational database with:
- Sub-100ms read latency globally
- RPO < 1 second
- RTO < 1 minute
- 99.99% availability SLA
- Strong consistency for financial transactions in home region
- Eventual consistency acceptable for cross-region reads
- ACID transactions
- Automatic failover
- Minimal operational overhead

Which solution meets ALL requirements while minimizing cost?"

Analysis Required:
- Aurora Global Database (global reads, fast failover)
- Primary in home region (strong consistency)
- Secondary regions (eventual consistency replicas)
- Write forwarding for cross-region writes
- Automated failover in primary region
- Cost optimization: Right-size instances per region
- Trade-off: Eventual consistency vs latency/cost

Professional Exam Complexity:

1. SCENARIO LENGTH:
   - 5-10 lines of context
   - Multiple requirements
   - Implied constraints
   - Trade-offs needed

2. ANSWER OPTIONS:
   - All options technically valid
   - Need to select MOST appropriate
   - Eliminate based on subtle requirements
   - Consider cost, performance, security, operations

3. KNOWLEDGE DEPTH:
   - Service features and limits
   - Integration patterns
   - Cost implications
   - Operational overhead
   - Trade-off analysis

4. MULTI-SERVICE SOLUTIONS:
   - Rarely single service answers
   - Complex architectures
   - 5-10 AWS services per solution
   - End-to-end design

Scoring:

- 75 questions total
- 15 unscored (pilot questions)
- 60 scored questions
- 750/1000 to pass (approximately 45/60 = 75%)
- Harder than Associate (higher passing percentage)

Time Management:

180 minutes / 75 questions = 2.4 minutes per question

Strategy:
- Quick questions (knowledge-based): 1 minute
- Medium questions (scenario-based): 2-3 minutes  
- Complex questions (multi-faceted): 4-5 minutes
- Review flagged questions: 20-30 minutes

Recommended Approach:
- Pass 1 (90 min): Answer all questions, flag difficult
- Pass 2 (60 min): Review flagged questions
- Pass 3 (30 min): Final review of uncertain answers
```
### Domaine 1 : Conception adaptée à la complexité organisationnelle (26 %)

**Modèles d'architecture à l'échelle de l'entreprise :**
```
Key Topics:

1. MULTI-ACCOUNT STRATEGY:
   - AWS Organizations architecture
   - OU structure optimization
   - Service Control Policies (SCPs)
   - Cross-account resource sharing
   - Consolidated billing optimization
   - Account vending automation

Complex Scenario:
"A global enterprise with 500+ AWS accounts spanning 50 business units 
needs to:
- Enforce region restrictions (data residency)
- Prevent public S3 buckets across all accounts
- Enable cross-account S3 access for data science teams
- Centralize security logging
- Allocate costs by cost center
- Automate account provisioning
- Ensure developers can't disable CloudTrail
- Provide read-only auditor access to all accounts

Design the account structure and governance framework."

Solution Architecture:

Organizations Structure:
Root
├── Security OU
│   ├── Audit Account (GuardDuty, Security Hub aggregation)
│   ├── Log Archive (CloudTrail, Config, VPC Flow Logs)
│   └── Security Tooling (automated remediation)
├── Infrastructure OU
│   ├── Network (Transit Gateway, Direct Connect)
│   ├── Shared Services (AD, DNS)
│   └── Backup (centralized backup vaults)
├── Production OU
│   ├── Business Unit 1 OU
│   ├── Business Unit 2 OU
│   └── ... (50 BU OUs)
└── Non-Production OU
    └── (mirrors production structure)

Service Control Policies:

Root Level SCPs:
{
  "Statement": [{
    "Effect": "Deny",
    "Action": "organizations:LeaveOrganization",
    "Resource": "*"
  }]
}

{
  "Statement": [{
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2", "eu-west-1"]
      }
    }
  }]
}

All OUs SCPs:
- Prevent CloudTrail modification
- Require MFA for sensitive operations
- Block public S3 buckets

Cross-Account S3 Access:
- Data science accounts: IAM roles with S3 access
- Bucket policies allowing specific account roles
- S3 Access Points for granular permissions

Centralized Logging:
- Organization CloudTrail → Log Archive account
- S3 bucket with Object Lock (immutability)
- EventBridge rules for alerts

Cost Allocation:
- Mandatory tags: CostCenter, BusinessUnit, Application
- Tag policies enforcing compliance
- Cost and Usage Reports by tag

Account Vending:
- Service Catalog Account Factory
- Automated baseline (VPC, CloudTrail, Config)
- Self-service with approval workflow

Auditor Access:
- Cross-account IAM role in each account
- ReadOnlyAccess + CloudTrailReadOnlyAccess
- MFA required for assumption

2. HYBRID CONNECTIVITY:
   - Direct Connect (dedicated connection)
   - VPN (encrypted tunnel)
   - Transit Gateway (hub-and-spoke)
   - AWS PrivateLink (service endpoints)
   - Storage Gateway (hybrid storage)

Scenario:
"A company has 5 data centers across US and Europe, 200 AWS accounts 
in 4 regions, and needs:
- Consistent 1 Gbps bandwidth to AWS
- Private connectivity (no internet)
- Failover capability (99.99% SLA)
- Connectivity between data centers through AWS
- Access to AWS services privately
- Minimize network complexity

Design the hybrid network architecture."

Solution:

Primary Connectivity:
- Direct Connect (2× 1 Gbps connections per data center)
- Active-active for redundancy
- BGP routing for failover

Transit Gateway (per region):
- Hub for VPC connectivity
- Direct Connect Gateway attachment
- VPN as backup connection

Architecture:
Data Centers (5)
    ↓ Direct Connect × 2 (per DC)
Direct Connect Gateway
    ↓
Transit Gateway (us-east-1)
    ├─ VPC 1
    ├─ VPC 2
    └─ VPC N

Transit Gateway (eu-west-1)
    ├─ VPC 1
    ├─ VPC 2
    └─ VPC N

Transit Gateway Peering (inter-region)

VPN Backup:
- Site-to-Site VPN to Transit Gateway
- Active during Direct Connect outage
- BGP weight for failover

PrivateLink:
- Interface endpoints for AWS services
- Private DNS enabled
- Accessible from on-premises via Direct Connect

Routing:
- BGP communities for route preference
- AS path prepending for backup paths
- Route tables in Transit Gateway

Cost Optimization:
- Direct Connect: $0.30/GB (first 10TB)
- VPN: $0.05/hour + $0.09/GB
- Use Direct Connect for primary (volume discount)
- VPN only for failover (minimal data transfer)

3. IDENTITY FEDERATION:
   - AWS SSO (Identity Center)
   - SAML 2.0 federation
   - Cognito user pools
   - Active Directory integration
   - Cross-account IAM roles

Complex Scenario:
"A enterprise with 10,000 employees uses Azure AD for identity. Need:
- SSO to 500 AWS accounts
- Role-based access (developers, operations, security)
- Just-in-time access (temporary elevation)
- MFA enforcement
- Audit trail of all access
- Mobile app access (customers)
- Partner access (contractors)

Design the identity architecture."

Solution:

Corporate Access (Employees):
AWS SSO with Azure AD integration
- SCIM provisioning (sync users/groups)
- Permission sets mapped to AD groups
- MFA enforced through Azure AD
- CloudTrail logs all access

Permission Sets:
- ViewOnly: Read-only across all accounts
- Developer: Full access in dev, read in prod
- Operations: Full access in all environments
- SecurityAuditor: Security tool access only
- BreakGlass: Emergency admin (approval + MFA)

Just-in-Time Access:
- Step Functions workflow
- User requests elevated access
- Manager approval via email
- Temporary permission set assignment
- Auto-revoke after time period

Customer Access (Mobile App):
Amazon Cognito
- User pools for authentication
- Identity pools for AWS credentials
- Social identity providers (Google, Facebook)
- MFA via SMS/TOTP
- Temporary credentials for S3/API access

Partner Access (Contractors):
External IAM roles
- Partner AWS account trusted
- Cross-account assume role
- External ID for security
- Session tags for granular permissions
- Time-limited access

Audit:
- CloudTrail logs all authentications
- CloudWatch Logs Insights queries
- GuardDuty monitors anomalous access
- Security Hub aggregates findings

4. MULTI-REGION ARCHITECTURE:
   - Active-active vs active-passive
   - Data replication strategies
   - Route 53 routing policies
   - Global Accelerator
   - Cross-region disaster recovery

Professional-Level Scenario:
"A SaaS company serves 10M global users with:
- 99.99% availability requirement
- < 50ms API latency for all users
- Data residency (EU data stays in EU)
- Multi-region failover
- Zero data loss (financial transactions)
- Read-heavy workload (95% reads)
- Real-time analytics
- Cost optimization target: < $100K/month

Design multi-region architecture meeting ALL requirements."

Solution Architecture:

Regions: us-east-1, us-west-2, eu-west-1, ap-southeast-1

Traffic Distribution:
Route 53 Geoproximity routing
- NA users → us-east-1 (primary), us-west-2 (failover)
- EU users → eu-west-1 (data residency)
- Asia users → ap-southeast-1

Global Accelerator:
- Static anycast IPs
- Automatic failover (health checks)
- Reduces latency by 60%

Application Tier:
- ECS Fargate (serverless containers)
- Auto Scaling 10-1000 tasks per region
- Application Load Balancer per region

Database:
Aurora Global Database
- Primary cluster per region (multi-master)
- Write locally, read globally
- Sub-second replication lag
- Automatic failover within region

Data Residency:
- EU data in eu-west-1 only
- Partition by user location
- DynamoDB streams to analytics

Caching:
- CloudFront for static content (edge caching)
- ElastiCache Redis (per region)
- DynamoDB Accelerator for hot data

Analytics:
- Kinesis Data Streams (per region)
- Kinesis Data Analytics (real-time processing)
- S3 for data lake
- Athena for queries
- QuickSight for dashboards

Disaster Recovery:
- RTO: 60 seconds (automatic failover)
- RPO: < 1 second (synchronous replication within region)
- Route 53 health checks monitor endpoints
- Automatic DNS failover

Cost Optimization:
- Compute: Fargate Spot (70% savings on non-prod)
- Database: Aurora Serverless v2 (scales to zero)
- Storage: S3 Intelligent-Tiering
- Data Transfer: Use CloudFront (reduces origin egress)
- Reserved Capacity: 3-year RIs for baseline load

Estimated Cost (per month):
- Compute: $30K (Fargate across 4 regions)
- Database: $35K (Aurora Global Database)
- Storage: $10K (S3, ElastiCache)
- Network: $15K (data transfer, CloudFront)
- Analytics: $5K (Kinesis, Athena)
- Other: $5K (Route 53, Load Balancers)
Total: $100K

Trade-offs Explained:
- Aurora vs DynamoDB: ACID transactions required (Aurora)
- Multi-region vs Multi-AZ: Global latency requirement (multi-region)
- Active-active vs Active-passive: 99.99% availability (active-active)
- Cost vs Performance: Optimized for both (Spot, caching, edge)

Exam Key: Justify every decision with requirements
```
### Domaine 2 : Conception de nouvelles solutions (29 %)

**Conception de solutions complexes :**
```
Key Topics:

1. SECURITY ARCHITECTURE:
   - Defense in depth
   - Encryption strategies
   - Key management
   - Compliance frameworks
   - Threat detection/response

Advanced Scenario:
"A healthcare SaaS company processing PHI must achieve:
- HIPAA compliance
- End-to-end encryption
- Zero-trust network architecture
- Audit trail retention (7 years)
- Automated threat response
- Customer-managed encryption keys
- Data segregation per customer
- Breach notification within 1 hour

Design the security architecture."

Solution:

Network Security (Zero Trust):
- No trust based on network location
- Verify every request
- Least privilege access

Implementation:
- Private subnets only (no internet gateway)
- VPC Endpoints for AWS services
- NACLs + Security Groups (defense in depth)
- WAF on Application Load Balancer
- Shield Advanced (DDoS protection)

Encryption:
In Transit:
- TLS 1.3 for all connections
- ACM certificates (automatic rotation)
- VPN for site-to-site
- PrivateLink for service access

At Rest:
- S3: SSE-KMS (customer-managed keys)
- EBS: KMS encryption
- RDS: Encryption enabled
- Secrets Manager for credentials

Key Management:
- CloudHSM for customer control
- Customer manages master keys
- AWS KMS for envelope encryption
- Automatic key rotation (365 days)
- Key usage logging

Data Segregation:
- Separate S3 bucket per customer
- Bucket policies preventing cross-customer access
- Customer-specific KMS keys
- RDS: Row-level security by customer_id

Compliance:
AWS Artifact:
- HIPAA BAA (Business Associate Agreement)
- Eligible services documented
- Compliance reports

Config Rules:
- encrypted-volumes
- rds-encryption-enabled
- s3-bucket-ssl-requests-only
- access-keys-rotated
- iam-password-policy

Audit Trail:
- CloudTrail: All API calls (7-year retention)
- S3 Object Lock: Immutable logs
- VPC Flow Logs: Network traffic
- Application logs: CloudWatch Logs

Threat Detection:
GuardDuty:
- Monitors CloudTrail, VPC Flow Logs
- ML-based threat detection
- Findings to Security Hub

Macie:
- Scans S3 for PII/PHI
- Classifies sensitive data
- Alerts on policy violations

Automated Response:
EventBridge + Lambda:
- GuardDuty finding → Lambda
- Isolate compromised instance
- Revoke IAM credentials
- Notify security team (SNS)
- Create incident ticket

Breach Notification:
- Security Hub aggregates findings
- Lambda checks severity
- If critical: Immediate notification
- Email + PagerDuty + Dashboard

Cost: ~$5K/month for 100 customers
- GuardDuty: $1K
- CloudTrail: $1K
- Config: $500
- Macie: $1K
- KMS: $500
- Other: $1K

2. RELIABILITY DESIGN:
   - Multi-AZ architectures
   - Cross-region failover
   - Backup strategies
   - Chaos engineering
   - Self-healing systems

Professional Scenario:
"A financial trading platform requires:
- 99.999% availability (5 minutes downtime/year)
- Zero data loss
- < 10ms p99 latency
- Process 1M transactions/second
- Automatic failover (no manual intervention)
- Recovery from region failure
- Real-time compliance reporting

Design a highly available architecture."

Solution:

Multi-Region Active-Active:

Primary: us-east-1
Secondary: us-west-2
DR: eu-west-1

Compute:
- ECS Fargate (1000+ tasks per region)
- Global Accelerator (anycast IPs, automatic failover)
- Application Load Balancer (per region)

Database:
Aurora Global Database (Multi-Master)
- Write to all regions simultaneously
- Conflict resolution: Last-writer-wins
- Sub-second replication
- Automatic failover

Alternative for higher consistency:
DynamoDB Global Tables
- Multi-region active-active
- Eventual consistency (seconds)
- Auto-scaling (on-demand)
- Conflict resolution built-in

State Management:
- ElastiCache Redis (cluster mode)
- In-memory session data
- Replicated across AZs
- Automatic failover

Messaging:
- SQS FIFO (exactly-once processing)
- Dead letter queues (failed messages)
- Cross-region replication

Monitoring:
- CloudWatch (metrics, logs, alarms)
- X-Ray (distributed tracing)
- Real-time dashboard

Health Checks:
Route 53:
- Health checks on ALB (multi-region)
- Failover routing policy
- 30-second interval
- Automatic DNS updates

Global Accelerator:
- Health checks on endpoints
- Traffic shifts to healthy region
- Faster than DNS (no cache)

Disaster Recovery:
- RTO: < 60 seconds (automatic)
- RPO: 0 (synchronous multi-region)
- No manual intervention

Runbooks:
- Automated remediation (Lambda)
- Chaos engineering (Fault Injection Simulator)
- Regular DR drills (monthly)

Compliance Reporting:
- Config continuous compliance
- Automated reports (Lambda + S3)
- Real-time dashboard (QuickSight)

Cost: ~$150K/month
- Compute: $60K (ECS Fargate across 3 regions)
- Database: $50K (Aurora Global Database)
- Network: $25K (Global Accelerator, data transfer)
- Caching: $10K (ElastiCache)
- Other: $5K (monitoring, logs)

SLA Calculation:
Component SLA:
- Global Accelerator: 99.99%
- ALB: 99.99%
- ECS Fargate: 99.99%
- Aurora: 99.995%

Series SLA: 99.99% × 99.99% × 99.99% × 99.995% = 99.965%

Multi-region (parallel): 
1 - (1 - 0.99965)² = 99.9999875%

Exceeds 99.999% requirement ✓

3. PERFORMANCE OPTIMIZATION:
   - Caching strategies
   - Database optimization
   - Network performance
   - Content delivery

4. DEPLOYMENT STRATEGIES:
   - Blue/green deployments
   - Canary releases
   - Rolling updates
   - Immutable infrastructure

Advanced Scenario:
"A high-traffic e-commerce site (100M requests/day) needs:
- Zero-downtime deployments
- Instant rollback capability
- A/B testing (5% canary)
- Progressive rollout
- Automatic rollback on errors
- Deployment to 500 instances
- Complete deployment in 30 minutes

Design the deployment pipeline."

Solution:

Blue/Green with Canary:

Infrastructure:
- Blue environment (current version)
- Green environment (new version)
- Both running simultaneously

CodeDeploy Configuration:
DeploymentConfig:
  Type: BlueGreen
  TrafficRouting:
    Type: TimeBasedCanary
    CanaryPercentage: 5
    CanaryInterval: 10  # minutes

Process:
1. Deploy to Green environment (10 min)
2. Run automated tests (5 min)
3. Route 5% traffic to Green (canary)
4. Monitor for 10 minutes:
   - Error rate < 1%
   - Latency < baseline + 10%
   - No 5XX errors
5. If healthy: Route 100% to Green
6. If unhealthy: Instant rollback to Blue

CloudWatch Alarms:
- ErrorRateHigh: > 1% errors
- LatencyHigh: > 500ms p99
- 5XXErrors: Any 5XX responses

Automatic Rollback:
Lambda triggered by alarms:
- Detects unhealthy deployment
- Triggers CodeDeploy rollback
- Routes all traffic back to Blue
- Notifies team (SNS)

A/B Testing:
ALB Weighted Target Groups:
- Blue: 95% weight
- Green: 5% weight
- Collect metrics per target group
- Statistical analysis (significance)

Progressive Rollout:
Instance-by-instance:
1. Deploy to 1 instance (smoke test)
2. Deploy to 10 instances (small rollout)
3. Deploy to 100 instances (medium)
4. Deploy to all 500 instances (full)

Each stage: Monitor + continue or rollback

Immutable Infrastructure:
- New AMI per deployment
- Auto Scaling Group with new launch template
- Gradually replace instances
- Old instances terminated

Timeline:
- Build/Test: 10 minutes
- Canary (5%): 10 minutes
- Progressive rollout: 10 minutes
- Validation: 5 minutes
Total: 35 minutes (within 30-minute target with optimization)

Cost Impact:
During deployment: 2× infrastructure (Blue + Green)
Duration: 30 minutes
Monthly deployments: 20
Additional cost: 20 × 30min × infrastructure cost
= ~0.5% monthly increase (negligible)

Benefits:
- Zero downtime
- Instant rollback
- Proven new version before full rollout
- Reduced risk
```
## Conseils \& Bonnes pratiques

**Stratégie d'examen professionnel :**

**Astuce 1 : Pensez aux compromis multidimensionnels**
Les questions professionnelles n'ont pas de réponse « parfaite » : évaluez simultanément les coûts, les performances, la sécurité et les opérations, et sélectionnez le meilleur équilibre global.

**Astuce 2 : Lisez les exigences deux fois**
Les scénarios professionnels enfouissent les exigences critiques dans les paragraphes du milieu : l'absence de « résidence des données » ou de « zéro perte de données » conduit à une mauvaise réponse.

**Astuce 3 : Éliminer en fonction des éléments non négociables**
Identifiez les exigences strictes (conformité, latence, disponibilité) : éliminez d'abord les réponses qui ne les respectent pas, puis optimisez celles qui restent.

**Astuce 4 : Calculez le TCO, pas seulement le coût de l'infrastructure**
Les questions portent sur l'optimisation des coûts : tenez compte des frais généraux d'exploitation, des licences, du transfert de données, et pas seulement des coûts de calcul/stockage.

**Astuce 5 : Concevoir pour l'échec à tous les niveaux**
Les scénarios professionnels nécessitent une gestion explicite des échecs : échec de zone de disponibilité, échec de région, échec de service, récupération après erreur humaine.

**Astuce 6 : Justifiez vos choix avec des mesures**
L'examen professionnel s'attend à une quantification : « 99,99 % du SLA nécessite plusieurs zones de disponibilité » et pas seulement « la haute disponibilité nécessite plusieurs zones de disponibilité ».

**Astuce 7 : Envisagez l'intégration hybride**
De nombreux scénarios professionnels incluent des architectures sur site : Direct Connect, Storage Gateway et des architectures hybrides fréquemment testées.

**Astuce 8 : Solutions multi-comptes**
Le professionnel assume l'environnement d'entreprise : accès entre comptes, organisations, gouvernance centralisée attendue.

**Astuce 9 : La gestion du temps est essentielle**
180 minutes semblent longues, mais les questions complexes nécessitent une analyse approfondie : en moyenne 2,4 minutes/question, les plus complexes nécessitent 5 minutes.

**Astuce 10 : L'expérience du monde réel compte**
L'examen professionnel teste les décisions d'architecture à partir de l'expérience : la pratique de systèmes complexes fournit une intuition pour des solutions optimales.

## Résumé du chapitre

L'examen AWS Certified Solutions Architect Professional valide l'expertise en architecture d'entreprise à travers 75 scénarios complexes nécessitant une analyse de compromis multidimensionnelle, une connaissance approfondie des services et des décisions de conception sophistiquées équilibrant la sécurité, la fiabilité, les performances, les coûts et les contraintes organisationnelles. Le succès nécessite 120 à 180 heures d'études au-delà du niveau d'associé, une expérience concrète de l'architecture de systèmes complexes, la capacité de synthétiser plus de 10 services AWS en solutions cohérentes et une analyse quantitative des RPO/RTO, des SLA, des coûts et des mesures de performances. La certification professionnelle permet d'obtenir une prime salariale de 30 à 40 %, de positionner les architectes pour des rôles de direction technique et de valider la capacité de concevoir des solutions à l'échelle de l'entreprise pour les entreprises Fortune 500 exploitant plus de 1 000 comptes AWS dans les régions du monde.

**Facteurs clés de réussite professionnelle :**

- **Analyse multidimensionnelle :** Pas de réponses parfaites : évaluez simultanément les coûts, les performances, la sécurité et les opérations ; sélectionner le meilleur compromis global
- **Connaissance approfondie des services :** Comprendre les limites des services, les modèles d'intégration, les modèles de tarification et les caractéristiques opérationnelles au-delà des fonctionnalités de base
- **Contexte d'entreprise :** Organisations multi-comptes, connectivité hybride, cadres de conformité, gouvernance à grande échelle
- **Raisonnement quantitatif :** Calculez les SLA (99,99 % contre 99,999 %), RPO/RTO, TCO, mesures de performance – justifiez les décisions avec des chiffres
- **Expérience du monde réel :** La pratique de systèmes complexes fournit de l'intuition – connaissances théoriques insuffisantes pour le niveau professionnel
- **Justification du compromis :** Expliquez pourquoi la solution choisie est optimale : « Aurora Global Database sur DynamoDB car des transactions ACID sont requises »
- **Planification de scénarios de panne :** Conception pour les pannes de zone de disponibilité, de région et de service : récupération automatique sans intervention humaine

Les domaines d'examen professionnel mettent l'accent sur la complexité organisationnelle (26 %), la conception de nouvelles solutions (29 %) et l'amélioration continue (26 %), reflétant le rôle de l'architecture d'entreprise exigeant des cadres de gouvernance, une conception de solution complète et une excellence opérationnelle. La certification valide l'expertise en matière d'architecture de systèmes traitant des milliards d'événements, servant des millions d'utilisateurs dans le monde, respectant la conformité réglementaire et fonctionnant avec une disponibilité de plus de 99,99 %.

**Conseil final pour l'examen :** Entraînez-vous avec AWS Well-Architected Framework : l'examen professionnel teste la capacité à appliquer ses piliers (sécurité, fiabilité, performances, coût, excellence opérationnelle) dans des scénarios complexes.


---

### Domaine 3 : Planification de la migration (8 %)
```
Key Topics:

1. MIGRATION ASSESSMENT (7 Rs):

Retire: Decommission — application no longer needed
Retain: Keep on-premises — compliance, latency, not worth migrating
Rehost (Lift & Shift): Move as-is to EC2 (fastest, least optimized)
  Tool: AWS MGN (Application Migration Service)
Replatform (Lift & Reshape): Minor optimizations (RDS instead of self-managed DB)
Repurchase (Drop & Shop): Move to SaaS (Salesforce, ServiceNow)
Refactor/Re-architect: Redesign for cloud-native (microservices, serverless)
Relocate: Move VMware VMs to VMware Cloud on AWS

ASSESSMENT TOOLS:
AWS Migration Hub: Central tracking of migration projects
AWS Application Discovery Service:
  - Agentless: VMware vCenter (infrastructure metadata)
  - Agent-based: Detailed server data (processes, network connections)
Migration Evaluator: TCO analysis for migration business case

2. DATABASE MIGRATION STRATEGIES:

Homogeneous (same engine): Use DMS
  MySQL → Amazon RDS MySQL
  PostgreSQL → Amazon Aurora PostgreSQL-compatible

Heterogeneous (different engine): SCT + DMS
  Oracle OLTP → Amazon Aurora PostgreSQL
  SQL Server → Amazon RDS for MySQL
  Teradata DW → Amazon Redshift

Large Database Migration:
  Option 1: DMS with parallel load tables (fastest)
  Option 2: Native backup/restore for large databases
  Option 3: Snowball Edge for petabyte databases (Physical transfer → DMS CDC)

Oracle to Aurora Pattern:
  1. SCT: Convert schema (80-90% automatic)
  2. DMS Full Load: Migrate existing data
  3. DMS CDC: Replicate ongoing changes
  4. Validate: Data comparison
  5. Cutover: Switch app connection strings

3. LARGE-SCALE DATA TRANSFER:

Online Transfer:
  Direct upload to S3: Fast internet → AWS DataSync
  AWS DataSync: 10 Gbps per agent, multiple agents for parallelism
  AWS Transfer Family: SFTP/FTP/FTPS → S3 or EFS

Offline Transfer:
  < 10 TB: DataSync (if internet available)
  10 TB – 80 TB: Snowball Edge
  > 80 TB (multiple devices): Multiple Snowball Edge (cluster up to 15)
  > 10 PB: Snowmobile

Hybrid (online + offline):
  Copy bulk data via Snowball → ongoing changes via DataSync/DMS

4. VMware MIGRATION:

VMware Cloud on AWS (VMC):
  Run vSphere workloads on AWS bare metal
  Consistent VMware operations (vCenter, vSAN, NSX-T)
  Use case: Migrate VMware without re-architecting
  Connectivity: Direct Connect, VPN, or public internet

AWS Outposts:
  AWS-managed infrastructure on-premises
  Run EC2, EBS, RDS, ECS, EKS locally
  For workloads requiring data residency or ultra-low latency

5. MIGRATION EXAM SCENARIOS:

Scenario: 500 on-premises servers, 6-month migration timeline
Analysis:
  - Agentless discovery: AWS Application Discovery Service (vCenter)
  - Prioritize: Risk assessment (interdependencies)
  - Wave 1: Simple stateless apps → Rehost with AWS MGN
  - Wave 2: Databases → Replatform with RDS/Aurora
  - Wave 3: Complex apps → Refactor to microservices
  Track: AWS Migration Hub

Scenario: 500 TB Oracle database, 2-week migration window
Analysis:
  - Schema conversion: AWS SCT
  - Initial data: Snowball Edge (500 TB → ~6 days physical)
  - Ongoing sync: DMS CDC from when Snowball exported
  - Cutover: During maintenance window
  
Common SAP Exam Traps:
✗ DMS alone for petabyte databases (too slow over network)
✓ Snowball Edge for bulk + DMS CDC for ongoing changes
✗ Rehost always (often replatform/refactor is better long-term)
✓ Assess and categorize first (7 Rs analysis)
```
### Domaine 4 : Contrôle des coûts (11 %)
```
Key Topics:

1. COMPUTE COST OPTIMIZATION AT SCALE:

Reserved Instance Strategy:
- Standard RI: 72% discount, specific instance type
- Convertible RI: 54% discount, can exchange
- Regional RI: Flexible across AZs in region (recommended)
- Zonal RI: AZ-specific + capacity reservation

Savings Plans (more flexible):
- Compute Savings Plans: 66% discount, any EC2/Fargate/Lambda
- EC2 Instance Savings Plans: 72% discount, specific family
- SageMaker Savings Plans: For ML workloads

Spot Instances Strategy:
- Spot Instance Pools: Use multiple instance types + AZs
- Spot Fleet: Automatically replaces interrupted instances
- EC2 Auto Scaling with mixed instances: RI + On-Demand baseline + Spot for scale

Portfolio Approach (recommended):
60% Savings Plans/RI (steady baseline)
10% On-Demand (buffer for spikes)
30% Spot (batch/fault-tolerant workloads)

2. STORAGE COST OPTIMIZATION:

S3 Cost Reduction:
- Lifecycle policies: Standard → IA → Glacier → Deep Archive → Delete
- S3 Intelligent-Tiering for unknown access patterns
- S3 Storage Lens: Identify underutilized buckets
- Incomplete multipart upload cleanup (lifecycle rule)

EBS Cost Reduction:
- gp3 vs gp2: gp3 is 20% cheaper + separate IOPS/throughput
- Delete unattached volumes (CloudWatch or Trusted Advisor alert)
- Snapshot lifecycle policies
- Delete old snapshots (automated via DLM - Data Lifecycle Manager)

RDS Cost Reduction:
- Reserved DB Instances: Up to 69% discount
- Aurora Serverless v2: Scale to near-zero for dev/test
- Stop RDS instances (dev/test): Saves compute, still pays storage
- Multi-AZ: Only for production (dev/test = Single-AZ)
- Right-size: CloudWatch RDS metrics → Compute Optimizer

3. NETWORK COST OPTIMIZATION:

Data Transfer Cost Hierarchy (cheapest to most expensive):
1. Within AZ: Free (same AZ, private IP)
2. VPC Endpoints (S3/DynamoDB): Free gateway endpoints
3. Between AZs (same region): $0.01/GB each way
4. VPC Peering (inter-region): $0.02/GB
5. Internet outbound (first 10 TB): $0.09/GB
6. Direct Connect: $0.02/GB (often cheaper than internet for large volumes)

Cost Reduction Tactics:
- VPC Gateway Endpoints (S3, DynamoDB): Free, eliminate NAT charges
- VPC Interface Endpoints: Small hourly cost but eliminate NAT data charges
- CloudFront: Reduces origin data transfer (free CloudFront→S3 in same region)
- Compress data before inter-region transfer
- Transit Gateway vs VPC Peering:
  TGW: $0.05/hr + $0.02/GB (centralized, simpler for many VPCs)
  Peering: Free (only data transfer charges) but complex n-squared topology

4. COST GOVERNANCE TOOLS:

AWS Organizations & Consolidated Billing:
- Volume discounts pooled across all accounts
- Reserved Instance sharing across accounts (linked accounts)
- Savings Plans sharing across organization

AWS Cost Categories:
Group costs by: account, service, tag, charge type
Custom rules: Map costs to business units, applications

Tagging Strategy (Critical for cost allocation):
Mandatory tags: CostCenter, Application, Environment, Owner
Tag policies (Organizations): Enforce tag naming conventions
Cost allocation tags: Activate in Billing console for reporting

AWS Cost Anomaly Detection:
ML-based spend alerts
Detect unexpected cost spikes per service/account/tag
Email/SNS notifications

AWS Compute Optimizer:
ML analysis of CloudWatch metrics
Recommendations: EC2, ASG, EBS, Lambda, ECS on Fargate
Export to S3 for bulk analysis

5. PROFESSIONAL-LEVEL COST SCENARIOS:

Scenario: 500-account organization, $5M/month AWS spend
Problem: No visibility into per-team costs, RI underutilization
Solution:
  - AWS Cost and Usage Report → S3 → Athena/QuickSight dashboard
  - Tag policies: Enforce CostCenter tags via AWS Organizations
  - RI sharing: Ensure linked accounts share RI discounts
  - Savings Plans at payer level: Cover all accounts
  - Compute Optimizer across organization: Delegated admin account
  - AWS Budgets: Per-account and per-tag budgets with alerts
  - Cost Categories: Map accounts to business units

Scenario: Reduce 30% of current costs
Analysis framework:
  - Compute: Right-size + RI/Savings Plans (15-20% savings typical)
  - Storage: Lifecycle policies + delete unused (5-10% savings)
  - Network: VPC Endpoints + reduce cross-AZ traffic (5% savings)
  - Database: Right-size + Reserved DB Instances (10% savings)
  - Total achievable: 25-35% with systematic approach

Common SAP Exam Mistakes:
✗ On-Demand for steady workloads (should use RI/Savings Plans)
✗ Standard RI when instance family may change (should use Convertible or Savings Plans)
✗ No tagging strategy (cannot allocate costs)
✓ Portfolio approach: RI baseline + On-Demand buffer + Spot for batch
✓ Organization-level Savings Plans sharing
```
### Domaine 5 : Amélioration continue des solutions existantes (26 %)
```
Key Topics:

1. OPERATIONAL IMPROVEMENTS:

AWS Well-Architected Framework Review:
- Periodic review using Well-Architected Tool
- Identify high-risk issues (HRIs)
- Prioritize remediation by business impact
- Track improvement milestones

Infrastructure as Code (IaC) Maturity:
Level 1: Manual console deployments
Level 2: CloudFormation for infrastructure
Level 3: CDK (Cloud Development Kit) for reusable constructs
Level 4: CDK + CI/CD pipeline + automated testing
Level 5: GitOps with drift detection

AWS Systems Manager:
- Patch Manager: Automated OS patching
- Parameter Store: Centralized configuration
- Session Manager: Secure shell without bastion
- Automation: Runbook automation
- Maintenance Windows: Scheduled maintenance
- Compliance: Patch compliance reporting

2. PERFORMANCE IMPROVEMENTS:

Identify Bottlenecks:
- CloudWatch metrics + dashboards
- X-Ray: Distributed tracing (find slow service)
- CloudWatch Container Insights: ECS/EKS performance
- RDS Performance Insights: Slow query identification
- Lambda Power Tuning: Right-size Lambda memory

Common Performance Improvements:
Slow API: Add API Gateway caching, ElastiCache, CloudFront
Slow database: Add Read Replicas, ElastiCache, DAX (DynamoDB)
High latency for global users: CloudFront + Global Accelerator
Lambda cold starts: Provisioned Concurrency
Container startup: Optimize Docker image size

3. SECURITY IMPROVEMENTS:

Security Posture Assessment:
AWS Security Hub: Aggregates findings from:
  - GuardDuty (threat detection)
  - Inspector (vulnerability scanning)
  - Macie (data classification)
  - Config (compliance)
  - Firewall Manager (WAF, Shield, SG policies)

Security Score:
  AWS Security Hub: Security score from 0-100
  AWS Foundational Security Best Practices standard
  CIS AWS Foundations Benchmark
  PCI DSS, NIST standards

Common Security Improvements:
- Enable MFA delete on S3 versioning
- Enforce IMDSv2 on EC2 (prevents SSRF attacks)
  → Launch template: HttpTokens = required
- Enable encryption on all EBS, RDS, S3 (using Config rules)
- Rotate access keys: Config rule + Lambda auto-remediation
- Remove unused IAM access keys: Credential report + automation
- Enable VPC Flow Logs: Network forensics
- Enable CloudTrail: Mandatory in all regions

AWS Firewall Manager:
Centrally manage: WAF rules, Shield Advanced, VPC Security Groups, Network Firewall
Applies across all accounts in Organizations automatically

4. DEPLOYMENT IMPROVEMENTS:

CI/CD Maturity for Large Organizations:
Code → CodeCommit/GitHub
Build → CodeBuild (Dockerfile, unit tests, SAST scanning)
Test → CodeBuild (integration tests, load tests)
Deploy → CodeDeploy (EC2, Lambda, ECS)
Pipeline → CodePipeline (orchestrates the above)
IaC → CloudFormation ChangeSet (review before deploy)

Advanced Deployment Strategies:
Feature Flags: Toggle features without deployment
  → AWS AppConfig (centralized feature flag management)
  → Dynamic configuration changes without restart

Canary Deployments:
Lambda: Traffic shifting (10% → 100% over time)
ECS: ALB weighted target groups
API Gateway: Canary deployments on stages

Blue/Green at Scale:
Route 53 weighted + ALB: Gradual traffic shift
AWS CodeDeploy: Automated blue/green for EC2/ECS/Lambda
Rollback triggers: CloudWatch alarm → automatic rollback

5. RELIABILITY IMPROVEMENTS:

Chaos Engineering with AWS Fault Injection Service (FIS):
- Inject faults: CPU, memory, network, I/O disruption
- Test AZ failure scenarios
- Verify Auto Scaling, failover, alerting work as expected
- GameDay: Scheduled reliability testing exercises

AWS Resilience Hub:
- Assess application against RTO/RPO targets
- Recommendations to meet targets
- Ongoing compliance monitoring

Self-Healing Patterns:
EC2 Auto Scaling with ELB health checks → replace unhealthy
RDS Multi-AZ → automatic failover
Lambda with SQS DLQ → retry + capture failures
EventBridge → trigger remediation Lambda on alarms

6. CONTINUOUS IMPROVEMENT EXAM SCENARIOS:

Scenario: Application has frequent 5XX errors after deploy
Problem identification:
  - CloudWatch: Error rate spike correlates with deploy time
  - X-Ray: Trace errors to specific Lambda function
  - CloudWatch Logs Insights: Query error messages
Solution:
  - Canary deployment (5% → validate → 100%)
  - CloudWatch alarm → CodeDeploy auto-rollback
  - Feature flags for high-risk features

Scenario: Costs increased 40% in 3 months
Investigation:
  1. Cost Explorer: Identify service/region causing increase
  2. Cost and Usage Report + Athena: Tag-level drill-down
  3. Trusted Advisor: Idle resources
  4. Compute Optimizer: Over-provisioned instances
Remediation:
  - Auto Scaling: Scale in more aggressively
  - Lifecycle policies: S3 objects accumulating
  - Right-size: Compute Optimizer recommendations

Scenario: Security audit reveals compliance failures
Remediation at scale:
  - AWS Config: Deploy managed rules across all accounts (via StackSets)
  - Security Hub: Central compliance dashboard
  - AWS Config Remediation: Auto-remediate non-compliant resources
  - Firewall Manager: Enforce WAF rules across all accounts
  - AWS Organizations SCP: Prevent disabling security controls

Common SAP Exam Patterns for Domain 5:
✓ X-Ray for distributed tracing and bottleneck identification
✓ AWS Config + Lambda auto-remediation for compliance
✓ CodeDeploy canary + CloudWatch alarm rollback for zero-risk deploys
✓ Well-Architected reviews for systematic improvement
✓ Compute Optimizer for right-sizing at scale
✓ Security Hub for centralized multi-account security posture
```
## Questions pratiques sur l'examen professionnel (25 questions)

**T1.** Une entreprise disposant de 200 comptes AWS dans AWS Organizations doit s'assurer que TOUS les comptes ne peuvent pas lancer d'instances EC2 en dehors de us-east-1 et eu-west-1. Les déploiements existants dans d’autres régions ne doivent pas être affectés. Quelle est la solution LA PLUS efficace ?

A) Créez des politiques de refus IAM dans chaque compte  
B) Attachez un SCP au niveau racine refusant toutes les actions EC2 avec une condition sur RequestedRegion  
C) Utiliser les règles AWS Config sur tous les comptes  
D) Attachez un SCP au niveau racine refusant les actions EC2 en dehors des régions approuvées, avec un NotAction pour les rôles existants

**Réponse : B** — Les SCP à la racine s'appliquent instantanément aux 200 comptes. La condition « StringNotEquals : aws:RequestedRegion : [us-east-1, eu-west-1] » bloque le lancement ailleurs. La question dit que les « nouveaux » déploiements ne doivent pas fonctionner ; les instances existantes peuvent continuer à s'exécuter (les SCP n'affectent pas les instances déjà en cours d'exécution, uniquement les nouveaux appels d'API).

---

**T2.** Une application SaaS mondiale utilise Aurora MySQL dans us-east-1 avec un cluster Aurora secondaire dans eu-west-1 via Aurora Global Database. Le RTO doit être < 1 minute. Le RPO doit être < 5 secondes. Quelle procédure de basculement répond à ces exigences ?

A) Promouvoir la réplique en lecture Aurora eu-west-1  
B) Utiliser le basculement planifié géré par Aurora Global Database  
C) Activer Aurora Multi-Master dans les deux régions  
D) Créer un réplica en lecture interrégional RDS et le promouvoir

**Réponse : B** — Le basculement planifié géré par la base de données globale Aurora (console AWS ou API : failover-global-cluster) atteint un RTO < 1 minute et généralement un RPO < 1 seconde. Aurora Multi-Master (C) s'effectue dans une seule région et non entre plusieurs régions.

---

**T3.** Une entreprise migre 300 To de données depuis des partages NFS sur site vers Amazon S3. La bande passante du réseau est limitée à 1 Gbit/s. La migration doit être terminée dans 2 semaines. Quelle solution est la PLUS appropriée ?

A) AWS Direct Connect avec les agents DataSync  
B) Plusieurs appareils AWS Snowball Edge  
C) AWS DataSync sur une connexion Internet existante  
D) Accélération du transfert S3  

**Réponse : B** — À 1 Gbit/s : ~10 To/jour = 30 To en 2 semaines. 300 To nécessitent environ 10 appareils Snowball Edge (30 To chacun). Le transfert physique est plus rapide et ne consomme pas de bande passante réseau. Direct Connect + DataSync (A) prendrait 30 jours à 1 Gbit/s.

---

**T4.** Une entreprise exécute 5 000 instances EC2 sur 50 comptes AWS. L'équipe de sécurité doit corriger toutes les instances avec des mises à jour critiques du système d'exploitation dans un délai de 4 heures. Quelle est l’approche LA PLUS évolutive ?

A) Créez manuellement la commande d'exécution SSM dans chaque compte  
B) Utilisez AWS Systems Manager Patch Manager avec une fenêtre de maintenance sur tous les comptes via l'intégration d'AWS Organizations  
C) Utilisez les règles personnalisées AWS Config pour détecter et corriger  
D) Déployez les fonctions Lambda sur tous les comptes avec les déclencheurs EventBridge

**Réponse : B** — Systems Manager Patch Manager avec configuration rapide (via les organisations) déploie automatiquement les stratégies de correctifs sur tous les comptes/unités d'organisation. Une fenêtre de maintenance peut être synchronisée entre les comptes pour une application coordonnée des correctifs.

---

**Q5.** Une société de services financiers a besoin que les journaux d'audit soient conservés pendant 7 ans. Les journaux ne peuvent être modifiés ou supprimés par aucun utilisateur, y compris les administrateurs de compte. Quelle solution répond à cette exigence ?

A) Gestion des versions S3 avec suppression MFA activée  
B) CloudTrail avec S3 Object Lock en mode gouvernance  
C) CloudTrail avec S3 Object Lock en mode Conformité  
D) CloudTrail avec les règles de cycle de vie S3  

**Réponse : C** — Le verrouillage d'objet en mode conformité empêche la suppression/modification par TOUS les utilisateurs, y compris root. Le mode de gouvernance (B) permet aux utilisateurs disposant d'autorisations spéciales de passer outre. La suppression MFA (A) peut toujours être contournée par root avec MFA.

---

**Q6.** Une application traite les transactions financières. Actuellement, il utilise une seule région us-east-1. Exigences : disponibilité de 99,999 %, basculement < 1 seconde, zéro perte de données. Quelle solution de base de données est la MEILLEURE ?

A) RDS multi-AZ PostgreSQL  
B) Aurora PostgreSQL Multi-AZ  
C) Base de données globale Aurora (principale us-east-1, secondaire us-west-2) avec Global Accelerator  
D) Tables globales DynamoDB (us-east-1, us-west-2)

**Réponse : C** — Base de données globale Aurora : RPO inférieur à la seconde, RTO < 1 minute avec basculement géré. Global Accelerator : basculement automatique de région < 30 secondes. Ensemble, ils approchent une disponibilité de 99,999 %. RDS/Aurora Multi-AZ (A/B) couvre uniquement les pannes de zone de disponibilité, pas les pannes de région. DynamoDB (D) est NoSQL et ne convient pas aux transactions financières nécessitant ACID.

---

**Q7.** Une entreprise dispose d'une application Web à 3 niveaux dans us-east-1. Ils souhaitent ajouter eu-west-1 pour les utilisateurs européens tout en garantissant que les données des utilisateurs de l'UE restent dans eu-west-1 (GDPR). Quelle configuration de routage permet d'atteindre cet objectif ?

A) Routage basé sur la latence Route 53  
B) Routage de géolocalisation Route 53 avec des piles d'applications distinctes par région  
C) Accélérateur mondial avec pondérations finales  
D) CloudFront avec Lambda@Edge pour la sélection de région  

**Réponse : B** — Le routage de géolocalisation envoie les utilisateurs de l'UE vers eu-west-1 en fonction de l'origine IP. Des piles séparées signifient que les données sont créées/stockées dans eu-west-1. Le système basé sur la latence (A) ne garantit pas la résidence des données. Global Accelerator (C) est destiné aux performances et non à la résidence des données.

---

**Q8.** Une organisation souhaite provisionner automatiquement de nouveaux comptes AWS avec des configurations standard (VPC, CloudTrail, Config, rôles IAM de base) à la demande des développeurs. Quel est le service AWS recommandé ?

A) AWS CloudFormation StackSets  
B) Tour de contrôle AWS avec Account Factory  
C) Organisations AWS avec SCP  
D) Catalogue de services AWS  

**Réponse : B** — Control Tower Account Factory automatise le provisionnement des comptes avec des garde-fous (contrôles préventifs et de détection), des configurations de base et des personnalisations. StackSets (A) déploie des ressources mais ne gère pas le workflow de provisionnement des comptes.

---

**Q9.** Une entreprise gère 100 microservices sur ECS Fargate. La communication de service à service utilise HTTP. La latence du réseau entre les services entraîne des problèmes de performances. Les services doivent se découvrir automatiquement. Quelle solution offre la latence la PLUS FAIBLE et la moindre surcharge opérationnelle ?

A) Application Load Balancer pour chaque service  
B) AWS Cloud Map avec découverte de services basée sur DNS Route 53  
C) Amazon API Gateway pour tous les appels interservices  
D) ECS Service Connect (découverte de services intégrée à App Mesh)  

**Réponse : D** — ECS Service Connect fournit des fonctionnalités de maillage de services intégrées avec regroupement de connexions, tentatives et métriques. Il réduit la latence interservices par rapport au passage par des ALB externes. Cloud Map (B) fonctionne mais ajoute une surcharge de résolution DNS par appel. ALB par service (A) ajoute des sauts et des coûts.

---

**Q10.** L'application d'une entreprise connaît des pics de trafic 10 fois supérieurs à la normale tous les vendredis soir. Auto Scaling est actuellement réactif (basé sur le CPU). L’équipe souhaite minimiser l’impact du pic. Que faut-il mettre en œuvre ?

A) Augmenter la capacité maximale d'Auto Scaling  
B) Mettre en œuvre une action de mise à l'échelle planifiée pour effectuer une pré-mise à l'échelle avant vendredi soir  
C) Utiliser la mise à l'échelle prédictive basée sur des modèles historiques  
D) Passer aux instances Spot  

**Réponse : C** – Predictive Scaling analyse les métriques CloudWatch historiques pour effectuer automatiquement une pré-scaling avant les pics prévus. Ceci est plus automatisé que la mise à l’échelle planifiée (B). Pour l'examen SAP, lorsque le modèle est récurrent et historique, Predictive Scaling est préférable car il s'auto-ajuste.

---

**Q11.** Une entreprise dispose d'une connexion directe (1 Gbit/s) depuis son centre de données vers AWS. Ils disposent également d’un VPN site à site comme sauvegarde. Actuellement, tout le trafic utilise Direct Connect. Si Direct Connect échoue, comment le basculement vers le VPN doit-il se produire automatiquement ?

A) Mettre à jour manuellement les tables de routage en cas d'échec de Direct Connect  
B) Routage BGP : définissez un BGP AS_PATH inférieur pour les routes Direct Connect ; Les routes VPN s'activent automatiquement en cas d'échec de Direct Connect  
C) Utiliser les contrôles de santé Route 53  
D) Utilisez Global Accelerator pour le basculement automatique  

**Réponse : B** — BGP gère automatiquement le routage. Direct Connect propage des routes BGP plus spécifiques/préférées. Lorsque Direct Connect échoue, BGP retire ces routes et les routes VPN deviennent actives. Il s’agit du modèle de basculement de réseau hybride standard.

---

**Q12.** Une application de commerce électronique traite 50 000 commandes/heure via Lambda. Chaque Lambda écrit sur RDS Aurora. Aurora montre un épuisement des connexions (trop de connexions). Quelle est la MEILLEURE solution ?

A) Augmentez le paramètre Aurora max_connections  
B) Utiliser le proxy RDS entre Lambda et Aurora  
C) Mettre à l'échelle Aurora sur une instance plus grande  
D) Implémenter le regroupement de connexions dans le code Lambda  

**Réponse : B** — Le proxy RDS maintient un pool de connexions persistantes vers Aurora et multiplexe les nombreuses connexions de courte durée de Lambda. Lambda crée des milliers d'exécutions simultanées → des milliers de connexions à la base de données. RDS Proxy absorbe cela et maintient un petit pool vers Aurora. Il s'agit du modèle canonique pour Lambda + RDS.

---

**Q13.** Une entreprise dispose de 20 VPC dans une région, chacun dans des comptes AWS distincts. Tous les VPC doivent communiquer en privé. Quelle solution est la PLUS évolutive ?

A) Appairage de VPC entre les 20 VPC (190 connexions d'appairage)  
B) AWS Transit Gateway avec tous les VPC attachés  
C) VPC hub-and-spoke avec peering de VPC multi-comptes vers le hub  
D) Points de terminaison AWS PrivateLink dans chaque VPC  

**Réponse : B** — Transit Gateway fournit une architecture en étoile pour un nombre illimité de VPC. Avec 20 VPC, l'appairage de VPC (A) nécessite n(n-1)/2 = 190 connexions, ce qui est ingérable sur le plan opérationnel. TGW prend en charge 5 000 pièces jointes VPC. Multi-comptes : RAM (Resource Access Manager) partage le TGW.

---

**Q14.** Un audit de sécurité révèle que les développeurs ont créé des rôles IAM sans limites d'autorisation, s'accordant plus d'autorisations que prévu. Comment peut-on éviter que cela ne se produise à l’avenir ?

A) Supprimez les autorisations IAM CreateRole de tous les développeurs  
B) Créer un SCP refusant iam:CreateRole  
C) Exiger une limite d'autorisation lors de la création de rôles à l'aide d'une condition de stratégie IAM  
D) Activer la règle AWS Config pour iam-no-inline-policy  

**Réponse : C** — La condition de stratégie IAM `iam:PermissionsBoundary` avec `StringEquals` peut exiger que tout rôle créé ait une limite d'autorisation spécifique. Cela permet aux développeurs de toujours créer des rôles, mais limite les autorisations maximales dont ces rôles peuvent disposer.

---

**Q15.** Une entreprise traite des données de santé sensibles (HIPAA). Ils utilisent des instances EC2 qui ne doivent pas stocker de données localement. Les données doivent être traitées en mémoire uniquement et écrites directement sur S3 (cryptées). Le stockage d'instance ne peut pas être utilisé. Quel type d'instance répond le mieux à ces exigences ?

A) Instance avec volumes de stockage d'instance (SSD éphémère)  
B) Instance r5 avec volume EBS chiffré  
C) Instance r5d (magasin d'instances NVMe)  
D) Instance r5 sans EBS attaché et uniquement /dev/shm temporaire (disque RAM)  

**Réponse : D** — Pour un véritable stockage sans local, utilisez une instance r5 sans pièce jointe EBS. Processus en mémoire (RAM) ou /dev/shm (tmpfs). Écrivez crypté sur S3. Le magasin d'instances (A, C) stocke physiquement les données sur l'hôte : cela viole l'exigence même si les données sont éphémères.

---

**Q16.** Une entreprise migre d'un monolithe vers des microservices sur ECS Fargate. Lors de la migration, les anciens et les nouveaux systèmes doivent gérer les demandes. Certains points de terminaison d'API servent à partir d'anciens monolithes, d'autres à partir de nouveaux microservices. Comment le trafic doit-il être acheminé ?

A) Deux ALB distincts avec routage pondéré Route 53  
B) ALB unique avec routage basé sur le chemin pour séparer les groupes cibles  
C) API Gateway avec autorisateur Lambda pour la logique de routage  
D) CloudFront avec plusieurs origines et comportements de cache  

**Réponse : B** — Routage basé sur le chemin ALB : /api/v1/orders → ancien groupe cible monolithique ; /api/v2/orders → nouveau groupe cible de microservices. ALB unique, entrée DNS unique, routage géré par chemin URL. Modèle de migration le plus propre sans aucune modification DNS nécessaire.

---

**Q17.** Une entreprise doit exécuter une charge de travail d'inférence ML conteneurisée qui nécessite un GPU. La charge de travail s'exécute à la demande (horaire imprévisible). Quelle est l’option de calcul LA PLUS rentable ?

A) Instances EC2 p3 (à la demande)  
B) Instances EC2 p3 (Spot)  
C) Points de terminaison d'inférence SageMaker  
D) ECS Fargate avec GPU  

**Réponse : B** — L'inférence ML sur les instances Spot permet d'économiser jusqu'à 90 %. Si la charge de travail est tolérante aux pannes (peut réessayer), Spot est optimal. Fargate (D) ne prend pas en charge le GPU. SageMaker (C) est meilleur pour les points de terminaison d'inférence de production, mais coûte plus cher pour les lots à la demande.

---

**Q18.** Une application utilise S3 comme origine pour CloudFront. Les utilisateurs signalent qu'après la mise à jour des objets S3, ils voient du contenu obsolète pendant 24 heures maximum. Les invalidations sont coûteuses à l’échelle actuelle. Quelle est la MEILLEURE solution à long terme ?

A) Réduisez la durée de vie de CloudFront à 1 heure  
B) Utilisez des noms de fichiers versionnés (par exemple, main.v2.js) et mettez à jour le code HTML pour référencer la nouvelle version.  
C) Augmenter le budget d'invalidation du cache  
D) Utilisez les notifications d'événements S3 pour déclencher des invalidations  

**Réponse : B** — La gestion des versions de fichiers (cache busting) est la meilleure pratique. Lorsque HTML fait référence à main.v2.js, CloudFront récupère la nouvelle version en cas d'absence de cache tandis que main.v1.js reste mis en cache. Aucune invalidation n’est nécessaire. La réduction du TTL (A) réduit l'efficacité du cache et augmente la charge d'origine.

---

**Q19.** Une entreprise gère un environnement AWS multicompte. L'équipe de sécurité doit automatiquement mettre en quarantaine toute instance EC2 que GuardDuty identifie comme compromise. Quelle est l'architecture?

A) L'équipe de sécurité examine manuellement les résultats et prend des mesures  
B) GuardDuty → Règle EventBridge → Lambda → Isolate EC2 (groupe de sécurité, instantané, arrêt SSM)  
C) GuardDuty → SNS → E-mail à l'équipe de sécurité  
D) Règle AWS Config déclenchée par GuardDuty  

**Réponse : B** — Réponse automatisée : recherche GuardDuty → règle EventBridge (filtre sur le type/gravité de recherche) → fonction Lambda qui : (1) remplace le groupe de sécurité EC2 par SG d'isolation (pas de trafic), (2) crée un instantané EBS médico-légal, (3) informe l'équipe de sécurité via SNS, (4) crée un ticket d'incident. Cela permet d'obtenir une réponse inférieure à la minute par rapport à une réponse humaine.

---

**Q20.** Une entreprise souhaite déployer des mises à jour d'applications sans aucun temps d'arrêt. Ils utilisent ECS Fargate derrière un ALB. La restauration doit être instantanée si des erreurs sont détectées. Quelle configuration de déploiement CodeDeploy permet d'atteindre cet objectif ?

A) Mise à jour continue ECS avec un pourcentage minimum de santé de 100 %  
B) ECS bleu/vert (CodeDeployDefault.ECSLinear10PercentEvery1Minutes) avec restauration d'alarme CloudWatch  
C) ECS Bleu/Vert avec déplacement complet et immédiat du trafic  
D) ECS Canary avec 10 % de trafic pendant 5 minutes  

**Réponse : B** — Le déplacement linéaire du trafic avec l'alarme CloudWatch déclenche une restauration automatique si le taux d'erreur dépasse le seuil. Bleu/Vert garantit que les anciennes tâches restent en cours d'exécution jusqu'à leur validation. Linéaire (10 %/minute) fournit une validation progressive tout en permettant un retour rapide à 0 % de nouveau trafic instantanément.

---

**Q21.** Une entreprise rencontre des problèmes de performances lors des pics de trafic. L'analyse montre que la latence de lecture de DynamoDB augmente jusqu'à 20 ms pendant les pics. Les lectures normales durent 2 ms. Que faut-il mettre en œuvre ?

A) Augmenter la capacité de lecture provisionnée par DynamoDB  
B) Activer l'accélérateur DynamoDB (DAX)  
C) Ajouter un GSI sur les attributs fréquemment interrogés  
D) Activer les flux DynamoDB  

**Réponse : B** — DAX offre une latence de lecture inférieure à la milliseconde, quelle que soit la charge de DynamoDB. Il gère les pics de trafic en servant à partir du cache en mémoire. L'augmentation de la capacité provisionnée (A) résout le débit mais pas nécessairement les pics de latence. GSI (C) aide avec les modèles d'accès, pas avec la charge de pointe.

---

**T22.** Les coûts AWS d'une entreprise augmentent de 20 % par mois. Le directeur financier exige une analyse des causes profondes. Quelle combinaison de services offre l'attribution des coûts la PLUS détaillée par équipe et par application ?

A) AWS Cost Explorer filtré par service  
B) Rapport de coût et d'utilisation AWS (CUR) → S3 → Tableau de bord Athena + QuickSight avec des balises comme dimensions  
C) Conseiller de confiance AWS  
D) Métriques et alarmes CloudWatch  

**Réponse : B** — CUR fournit les données de facturation les plus granulaires (horaires, au niveau des ressources). En combinaison avec Athena (requêtes SQL) et QuickSight (visualisation), les équipes peuvent créer des tableaux de bord affichant les coûts par balise d'équipe, balise d'application, environnement, etc. Cost Explorer (A) fournit une bonne analyse mais moins granulaire que CUR.

---

**Q23.** Une entreprise possède Aurora MySQL avec Multi-AZ. L'instance principale échoue. Que se passe-t-il automatiquement ?

A) La promotion manuelle d'un réplica en lecture est requise  
B) Aurora promeut automatiquement un réplica en lecture dans la même zone de disponibilité que le réplica principal défaillant  
C) Aurora détecte l'échec et promeut une réplique (priorisée par niveau) avec mise à jour du point de terminaison DNS, généralement en moins de 30 secondes  
D) Une nouvelle instance principale est lancée à partir du dernier instantané  

**Réponse : C** – Aurora Multi-AZ détecte automatiquement la défaillance principale et promeut une réplique (par niveau de promotion, puis par décalage). Le DNS du point de terminaison du cluster est automatiquement mis à jour. Le basculement se termine généralement en 30 secondes. RDS Multi-AZ prend 1 à 2 minutes ; Aurora est plus rapide grâce à l'architecture de stockage partagé.

---

**Q24.** Une entreprise doit exposer un microservice interne aux entreprises partenaires via Internet sans exposer l'intégralité du VPC. Les partenaires doivent se connecter à l'aide de leurs propres VPC. Quelle solution permet d'y parvenir ?

A) Créer un ALB public avec liste blanche IP  
B) Utilisez AWS PrivateLink pour exposer le service via un service de point de terminaison VPC  
C) Appairage de VPC entre le VPC de l'entreprise et les VPC partenaires  
D) AWS Transit Gateway avec restrictions de table de routage  

**Réponse : B** — PrivateLink crée un service de point de terminaison VPC. Les partenaires créent des points de terminaison de VPC d'interface dans leurs VPC. Le trafic ne traverse jamais Internet : il reste sur le backbone AWS. L'entreprise contrôle quels comptes peuvent se connecter. L'appairage de VPC (C) expose l'intégralité du VPC, et non un seul service.

---

**Q25.** Une entreprise utilise CloudFormation pour gérer l'infrastructure. Un développeur a modifié manuellement un groupe de sécurité dans la console (dérive de configuration). La correction automatisée doit restaurer l'état de CloudFormation sans redéploiement complet de la pile. Quelle est la MEILLEURE approche ?

A) Supprimer la pile et redéployer  
B) AWS Config + Détection de dérive CloudFormation → correction via CloudFormation Stack Update sans modification (déclenche la correction de dérive)  
C) Règle personnalisée AWS Config avec action de correction Lambda SSM  
D) Règle EventBridge sur le changement du groupe de sécurité CloudTrail → Lambda pour revenir  

**Réponse : D** — Règle EventBridge sur l'événement CloudTrail `AuthorizeSecurityGroupIngress` ou `RevokeSecurityGroupIngress` → Lambda → revenir à l'état défini par CloudFormation à l'aide de l'API EC2. Il s’agit d’une correction en temps quasi réel. Config + CloudFormation (B) peut également fonctionner mais a plus de latence. Pour l'examen SAP, EventBridge + Lambda pour la correction automatique en temps quasi réel est le modèle préféré.


## Conseils et bonnes pratiques

**Stratégie d'examen professionnel :**

**Astuce 1 : Pensez aux compromis multidimensionnels**
Les questions professionnelles n'ont pas de réponse « parfaite » : évaluez simultanément les coûts, les performances, la sécurité et les opérations, et sélectionnez le meilleur équilibre global.

**Astuce 2 : Lisez les exigences deux fois**
Les scénarios professionnels enfouissent les exigences critiques dans les paragraphes du milieu : l'absence de « résidence des données » ou de « zéro perte de données » conduit à une mauvaise réponse.

**Astuce 3 : Éliminer en fonction des éléments non négociables**
Identifiez les exigences strictes (conformité, latence, disponibilité) : éliminez d'abord les réponses qui ne les respectent pas, puis optimisez celles qui restent.

**Astuce 4 : Calculez le TCO, pas seulement le coût de l'infrastructure**
Les questions portent sur l'optimisation des coûts : prenez en compte les frais généraux d'exploitation, les licences, le transfert de données, et pas seulement les coûts de calcul/stockage.

**Astuce 5 : Concevoir pour l'échec à tous les niveaux**
Les scénarios professionnels nécessitent une gestion explicite des pannes : panne de zone de disponibilité, panne de région, panne de service, récupération après erreur humaine.

**Conseil 6 : Connaître les limites des services clés**
- Aurora Global Database : délai de réplication < 1 seconde, basculement géré < 1 minute
- Tables globales DynamoDB : réplication < 1 seconde (éventuellement cohérente)
- Basculement Route 53 : 60 secondes (intervalle de contrôle de santé 30 s × seuil de défaillance 2)
- Accélérateur global : basculement < 30 secondes
- Transit Gateway : 5 000 pièces jointes VPC par TGW
- Organisations : jusqu'à 1 000 comptes (par défaut), unités d'organisation illimitées

**Astuce 7 : Maîtrisez l'arbre décisionnel de la connectivité hybride**
- Besoin d'une bande passante constante, d'une faible latence, privée : Direct Connect
- Besoin de chiffrement, moindre coût, tolère une bande passante variable : VPN
- Besoin à la fois de fiabilité et de sauvegarde : Direct Connect + Basculement VPN
- Besoin d'un hub pour de nombreux VPC + sur site : Transit Gateway

**Astuce 8 : Questions multi-comptes**
Presque toutes les questions d’organisation professionnelle impliquent :
- AWS Organizations (structure des comptes en OU)
- SCP (garde-corps/restrictions)
- AWS Control Tower (vente automatique de comptes)
- AWS RAM (partage de ressources entre comptes)
- AWS IAM Identity Center (SSO centralisé)

**Astuce 9 : La gestion du temps est essentielle**
180 minutes ÷ 75 questions = 2,4 min/question en moyenne.
Budget : Questions faciles 1 min, questions de scénario 3 min, questions complexes en plusieurs parties 5 min.
Laissez 20 minutes pour l'examen. Ne laissez jamais vide – devinez parmi les 2 options restantes.

**Astuce 10 : L'expérience architecturale du monde réel est le différenciateur clé**
L'examen professionnel est conçu de telle sorte que les connaissances théoriques seules sont insuffisantes. Les candidats doivent avoir rencontré ces problèmes dans des systèmes réels : épuisement du pool de connexions, partitions chaudes, dérive de configuration, cas extrêmes de fédération d'identité. Une expérience pratique dans des environnements complexes constitue la meilleure préparation.

## Résumé du chapitre

L'examen AWS Certified Solutions Architect Professional (SAP-C02) teste les connaissances approfondies d'AWS de l'entreprise à travers 75 scénarios complexes (score de passage de 75 % requis) couvrant : la complexité organisationnelle (26 %), la conception de nouvelles solutions (29 %), la planification de la migration (8 %), le contrôle des coûts (11 %) et l'amélioration continue (26 %).

**Principaux différenciateurs du niveau associé :**
- Organisations multi-comptes avec SCP, Control Tower, IAM Identity Center
- Connectivité hybride : Direct Connect + Transit Gateway + PrivateLink
- Migrations de bases de données complexes : combinaisons DMS + SCT + Snowball
- Actif-actif multirégional avec Aurora Global Database + Global Accelerator
- Optimisation des coûts à l'échelle de l'organisation : CUR + Athena + politiques de balises
- Correction de sécurité automatisée : GuardDuty → EventBridge → Lambda
- Déploiement à grande échelle : CodeDeploy + restauration automatique des alarmes CloudWatch

**Délai de préparation (recommandé) :**
- Mois 1-2 : immersion approfondie dans les domaines faibles (utiliser la documentation AWS, les discussions re:Invent)
- Mois 3 : Construire des architectures multi-comptes/hybrides complexes dans un environnement de pratique
- Mois 4 : Questions pratiques axées sur des scénarios multiservices
- 2 dernières semaines : révisez les mauvaises réponses, passez l'examen pratique officiel (40 $)

La certification professionnelle permet aux architectes d'occuper des rôles de direction technique, de stratégie cloud d'entreprise et d'obtenir une prime salariale de 30 à 40 % par rapport à leurs pairs certifiés associés.
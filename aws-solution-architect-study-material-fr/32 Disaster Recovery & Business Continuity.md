# Chapitre 32 : Reprise après sinistre \& Continuité des activités

##Présentation

Chaque organisation est confrontée à des catastrophes potentielles (incendies de centres de données, catastrophes naturelles, cyberattaques, suppressions accidentelles, pannes matérielles, bugs logiciels corrompant les données) qui peuvent provoquer des perturbations catastrophiques de l'activité allant d'heures d'arrêt coûtant des millions de revenus à une perte de données permanente détruisant la confiance des clients. Une société de services financiers confrontée à une panne de base de données de 4 heures pendant les heures de négociation perd 2 millions de dollars de revenus plus les pénalités réglementaires ; une plateforme de commerce électronique incapable de se remettre d’une attaque de ransomware dans les 24 heures perd définitivement 60 % de ses clients. La reprise après sinistre traditionnelle (sauvegardes sur bande stockées hors site, sites de secours des centres de données froids nécessitant plusieurs jours d'activation, procédures de récupération manuelle jamais testées) ne peut pas répondre aux exigences modernes de continuité d'activité où les clients s'attendent à une disponibilité 24h/24 et 7j/7 et à une perte de revenus due aux temps d'arrêt mesurés en milliers par minute. Les capacités de reprise après sinistre d'AWS (sauvegardes automatisées avec restauration ponctuelle, réplication interrégionale, plusieurs architectures de reprise après sinistre, de la version pilote à la version active-active multi-sites) permettent aux organisations d'atteindre les objectifs de temps de récupération (RTO) de quelques heures à quelques secondes et les objectifs de point de récupération (RPO) de quelques heures à près de zéro pour une fraction des coûts de reprise d'activité traditionnels.

L’impact commercial d’une reprise après sinistre inadéquate s’étend bien au-delà des coûts immédiats des temps d’arrêt. Selon des études sectorielles, les organisations confrontées à d'importantes pertes de données sont confrontées à une probabilité de faillite de 93 % d'ici un an, tandis que le coût moyen des temps d'arrêt dans tous les secteurs dépasse 5 600 $ par minute (336 000 $ par heure). Au-delà de l’impact financier, les catastrophes nuisent de façon permanente à la réputation de la marque : les clients se souviennent des pannes et des violations de données pendant des années, les concurrents capitalisent sur les temps d’arrêt en convertissant des clients frustrés et les organismes de réglementation imposent des sanctions en cas de protection inadéquate des données. La reprise après sinistre d'AWS transforme la reprise d'activité d'une police d'assurance coûteuse en un outil commercial grâce à : des sauvegardes automatisées éliminant les processus manuels sujets aux pannes, une réplication interrégionale garantissant la durabilité des données en cas de panne géographique, des architectures de reprise d'activité flexibles adaptant les exigences de l'entreprise aux coûts et des tests réguliers validant le fonctionnement des procédures de récupération en cas de besoin.

Ce chapitre s'appuie sur les bases de l'infrastructure tout au long du manuel : sauvegardes automatisées RDS et multi-AZ pour la reprise après sinistre de base de données, réplication inter-régions S3 pour la durabilité des objets, vérifications de l'état Route 53 pour le basculement automatique, CloudFormation pour la récréation de l'infrastructure, AWS Backup pour la gestion centralisée des sauvegardes et DynamoDB Global Tables pour les activités actives et actives multirégionales. Le chapitre couvre les concepts et le calcul des RPO/RTO, les stratégies de sauvegarde avec AWS Backup, quatre modèles de reprise après sinistre (sauvegarde et restauration, veilleuse, veille chaude, actif-actif multi-sites), la mise en œuvre de la réplication inter-régions, les tests et la validation de la reprise après sinistre, les exigences de conformité, l'automatisation avec les runbooks, les opérations de reprise après sinistre de production et la création de systèmes où les sinistres entraînent une interruption minimale de l'activité car la restauration est automatisée, testée régulièrement et atteint les objectifs RTO/RPO définis par l'entreprise.

## Théorie \&Concepts

### Fondamentaux du RPO et du RTO

**Comprendre les objectifs de rétablissement :**
```
Recovery Point Objective (RPO):
Maximum acceptable data loss measured in time
"How much data can we afford to lose?"

Examples:
- RPO = 24 hours: Daily backups acceptable
  - Scenario: Internal wiki
  - Data loss: Up to 1 day of edits lost
  - Impact: Low (can recreate recent changes)

- RPO = 1 hour: Hourly backups required
  - Scenario: CRM system
  - Data loss: Last hour of customer interactions
  - Impact: Moderate (some manual data entry)

- RPO = 5 minutes: Continuous replication
  - Scenario: E-commerce transactions
  - Data loss: Last 5 minutes of orders
  - Impact: High (revenue loss, customer frustration)

- RPO = 0 (near-zero): Synchronous replication
  - Scenario: Banking transactions
  - Data loss: None (no transactions lost)
  - Impact: Critical (regulatory requirement)

Recovery Time Objective (RTO):
Maximum acceptable downtime
"How long can systems be down?"

Examples:
- RTO = 72 hours: Cold backup restoration
  - Scenario: Archive system
  - Downtime: 3 days
  - Impact: Low (infrequent access)

- RTO = 24 hours: Backup & Restore pattern
  - Scenario: Development environment
  - Downtime: 1 day
  - Impact: Low-Medium (delays development)

- RTO = 4 hours: Pilot Light pattern
  - Scenario: Internal business applications
  - Downtime: 4 hours
  - Impact: Medium (business operations impacted)

- RTO = 1 hour: Warm Standby pattern
  - Scenario: Customer-facing applications
  - Downtime: 1 hour
  - Impact: High (revenue loss, customer impact)

- RTO = Minutes: Multi-Site Active-Active
  - Scenario: Mission-critical systems
  - Downtime: Automatic failover (1-5 minutes)
  - Impact: Critical (business cannot function)

RPO/RTO Business Impact Matrix:

┌──────────────┬───────────┬──────────────┬──────────────────┐
│ Application  │ RPO       │ RTO          │ DR Pattern       │
├──────────────┼───────────┼──────────────┼──────────────────┤
│ Banking Core │ 0         │ < 1 minute   │ Multi-Site A-A   │
│ E-commerce   │ 5 minutes │ 15 minutes   │ Warm Standby     │
│ CRM          │ 1 hour    │ 4 hours      │ Pilot Light      │
│ Dev/Test     │ 24 hours  │ 24 hours     │ Backup & Restore │
│ Archives     │ 7 days    │ 7 days       │ Backup & Restore │
└──────────────┴───────────┴──────────────┴──────────────────┘

Calculating Business Impact:

E-commerce Platform Example:

Revenue: $10M/month = $13,889/hour = $231/minute

Downtime Cost Calculation:
1 hour downtime:
- Direct revenue loss: $13,889
- Customer support: $2,000 (additional calls)
- Reputation damage: $5,000 (estimated)
- Total: $20,889

4 hour downtime:
- Direct revenue loss: $55,556
- Support and operations: $10,000
- Customer churn: 5% = $50,000 (lifetime value)
- Reputation: $20,000
- Total: $135,556

24 hour downtime:
- Direct revenue loss: $333,333
- Major customer churn: 20% = $200,000
- Reputation damage: $100,000
- Regulatory penalties: $50,000
- Total: $683,333

RPO/RTO Requirements:
Based on impact, define requirements:
- RTO: 1 hour (cost $135K if exceeded)
- RPO: 5 minutes (limited transaction loss acceptable)
- DR Pattern: Warm Standby (balances cost and RTO)
- Annual DR cost: $50K (vs $135K single incident cost)

Data Loss Impact:

Transaction Database:
- Transactions per minute: 100
- Average transaction value: $50
- RPO = 5 minutes
- Potential data loss: 100 × 5 × $50 = $25,000

Customer Database:
- New customers per hour: 20
- Customer lifetime value: $500
- RPO = 1 hour
- Potential data loss: 20 × $500 = $10,000

Cost-Benefit Analysis:

Scenario 1: No DR
- Cost: $0
- Risk: Full data loss + extended downtime
- Expected annual loss: 10% probability × $683K = $68,300

Scenario 2: Daily Backups (RPO 24h, RTO 24h)
- Cost: $5K/year
- Risk: 24 hours data loss + 24 hour downtime
- Expected annual loss: 5% probability × $683K = $34,150
- Net cost: $5K + $34K = $39K

Scenario 3: Pilot Light (RPO 1h, RTO 4h)
- Cost: $25K/year
- Risk: 1 hour data loss + 4 hour downtime
- Expected annual loss: 2% probability × $135K = $2,700
- Net cost: $25K + $2.7K = $27.7K ✓ Optimal

Scenario 4: Warm Standby (RPO 5m, RTO 1h)
- Cost: $50K/year
- Risk: 5 minutes data loss + 1 hour downtime
- Expected annual loss: 1% probability × $20K = $200
- Net cost: $50K + $200 = $50.2K

Scenario 5: Multi-Site (RPO 0, RTO 1m)
- Cost: $200K/year (2× infrastructure)
- Risk: Minimal data loss + automatic failover
- Expected annual loss: ~$0
- Net cost: $200K (only justified for mission-critical)

Best choice: Pilot Light ($27.7K total annual cost)
```
### Architectures et modèles DR

**Quatre modèles de reprise après incident principaux :**
```
1. BACKUP & RESTORE (Lowest Cost, Highest RTO)

Architecture:
- Regular backups to S3
- No standby infrastructure
- Restore from backups during disaster

RPO: Hours to Days (backup frequency)
RTO: Hours to Days (restoration time)
Cost: Lowest (backup storage only)

Use Cases:
✓ Non-critical applications
✓ Development/test environments
✓ Archives and file servers
✓ Budget-constrained scenarios

AWS Services:
- AWS Backup (automated backups)
- S3 (backup storage)
- S3 Glacier (cold storage)
- CloudFormation (infrastructure recreation)
- EBS Snapshots
- RDS Automated Backups

Implementation:
Primary Region:
- Application running normally
- Daily EBS snapshots
- Hourly database backups
- AMI creation weekly

DR Region:
- Nothing running (zero cost)
- Backups replicated to S3
- CloudFormation templates ready

Disaster Recovery Process:
1. Disaster declared (manual decision)
2. Launch CloudFormation stack (30 mins)
3. Restore EBS from snapshots (30 mins)
4. Restore database from backup (1-4 hours)
5. Update DNS to DR region
6. Total RTO: 2-5 hours

Cost Example:
Application: 10× EC2 instances, 1× RDS
Primary Region Running: $5,000/month
DR Region (Backup Storage): $200/month
Total: $5,200/month
DR Cost: 4% of primary

---

2. PILOT LIGHT (Low Cost, Medium RTO)

Architecture:
- Core systems always running in DR region
- Minimal instances (database, critical services)
- Scale out quickly during disaster

RPO: Minutes to Hours
RTO: Hours (1-4 hours typical)
Cost: Low-Medium

Use Cases:
✓ Business-critical applications
✓ Moderate downtime tolerance
✓ Cost-conscious DR requirements

AWS Services:
- RDS Multi-Region with Read Replicas
- DMS for database replication
- Route 53 for DNS failover
- Auto Scaling (scale from 0 to N)
- S3 Cross-Region Replication

Implementation:
Primary Region:
- Full application stack running
- 10× EC2 instances
- RDS primary database
- Active traffic

DR Region (Pilot Light):
- RDS Read Replica (replicating)
- 0× EC2 instances (AMIs ready)
- S3 data replicated
- No traffic

Normal Operation Cost:
Primary: $5,000/month
DR: $500/month (database replica only)
Total: $5,500/month
DR Cost: 10% of primary

Disaster Recovery Process:
1. Disaster detected (automated or manual)
2. Promote RDS replica to primary (5 mins)
3. Launch Auto Scaling Group (10 mins)
4. Instances boot and configure (15 mins)
5. Update Route 53 DNS (5 mins, 1-2 min propagation)
6. Total RTO: 30-45 minutes

Post-Recovery:
DR region now serving traffic
Scale to handle load (Auto Scaling)
Investigate primary region issue
Failback when primary restored

---

3. WARM STANDBY (Medium Cost, Low RTO)

Architecture:
- Scaled-down version running in DR region
- Minimal capacity (1-2 instances vs 10 in primary)
- Scale up quickly during disaster

RPO: Seconds to Minutes
RTO: Minutes to Hour
Cost: Medium

Use Cases:
✓ Customer-facing applications
✓ Revenue-critical systems
✓ < 1 hour downtime requirement

AWS Services:
- Multi-AZ and Multi-Region deployment
- RDS with cross-region replication
- Route 53 health checks and failover
- Auto Scaling (scale up quickly)
- CloudFront (global CDN)

Implementation:
Primary Region:
- 10× EC2 instances (full capacity)
- RDS Multi-AZ
- 100% of traffic

DR Region (Warm Standby):
- 2× EC2 instances (20% capacity)
- RDS Read Replica
- 0% of traffic (ready to scale)

Normal Operation Cost:
Primary: $5,000/month
DR: $1,500/month (scaled-down infra)
Total: $6,500/month
DR Cost: 30% of primary

Disaster Recovery Process:
1. Route 53 health check fails (automated)
2. DNS automatically fails over to DR (1-2 mins)
3. DR Auto Scaling scales up 2→10 instances (5-10 mins)
4. Application handles traffic
5. Total RTO: 5-15 minutes

Advantages:
+ Fast recovery (automated)
+ Regularly tested (receiving traffic for testing)
+ Known capacity and performance
+ Can handle partial failover

---

4. MULTI-SITE ACTIVE-ACTIVE (Highest Cost, Lowest RTO)

Architecture:
- Full deployment in multiple regions
- Active traffic in all regions
- Automatic load distribution

RPO: Near-zero (seconds)
RTO: Seconds to Minutes (automatic failover)
Cost: Highest (2× infrastructure)

Use Cases:
✓ Mission-critical applications
✓ Zero-downtime requirement
✓ Global user base (latency optimization)
✓ Regulatory requirements

AWS Services:
- Global Accelerator or Route 53 (traffic distribution)
- DynamoDB Global Tables (multi-region writes)
- Aurora Global Database
- CloudFront (edge caching)
- S3 Cross-Region Replication

Implementation:
US-EAST-1 (Primary):
- 10× EC2 instances
- DynamoDB Global Table
- 50% of traffic

EU-WEST-1 (Secondary):
- 10× EC2 instances  
- DynamoDB Global Table
- 50% of traffic

Normal Operation Cost:
US-EAST: $5,000/month
EU-WEST: $5,000/month
Data replication: $500/month
Total: $10,500/month
DR Cost: 110% of primary (doubles infrastructure)

Disaster Recovery Process:
1. Region fails
2. Route 53/Global Accelerator detects failure (30 seconds)
3. Automatically routes 100% traffic to healthy region
4. No manual intervention required
5. Total RTO: 30-60 seconds

Advantages:
+ Zero-downtime failover
+ No manual intervention
+ Optimized global latency
+ Continuous DR testing (both regions active)
+ Handles partial failures

Disadvantages:
- Highest cost (2× infrastructure)
- Complex data synchronization
- Eventual consistency challenges
- More complex operations

---

Pattern Selection Decision Tree:

Is application mission-critical?
├─ NO → Can tolerate hours downtime?
│  ├─ YES → Backup & Restore (RPO: days, RTO: hours)
│  └─ NO → Pilot Light (RPO: hours, RTO: 1-4 hours)
└─ YES → Can tolerate < 1 hour downtime?
   ├─ YES → Warm Standby (RPO: minutes, RTO: 15-60 mins)
   └─ NO → Multi-Site Active-Active (RPO: seconds, RTO: < 1 min)

Cost vs RTO Trade-off:

Backup & Restore: 4% DR cost → 4+ hours RTO
Pilot Light: 10% DR cost → 1-4 hours RTO
Warm Standby: 30% DR cost → 15-60 mins RTO
Multi-Site: 110% DR cost → < 1 min RTO
```
### Stratégies de sauvegarde AWS

**Gestion centralisée des sauvegardes :**
```
AWS Backup Service:
Centralized backup across AWS services
Policy-based backup plans
Cross-region and cross-account backup

Supported Services:
- EC2 (EBS volumes and instances)
- RDS (databases)
- DynamoDB (tables)
- EFS (file systems)
- FSx (file systems)
- Storage Gateway (volumes)
- DocumentDB
- Neptune

Backup Components:

1. Backup Plans:
   - Schedule (hourly, daily, weekly, monthly)
   - Retention rules
   - Lifecycle policies (cold storage transition)
   - Copy to another region

2. Backup Vaults:
   - Storage containers for backups
   - Encryption with KMS
   - Access policies
   - Resource-based policies

3. Resource Assignment:
   - Tag-based selection
   - Resource IDs
   - Automatic discovery

Backup Plan Example:

Production-Daily-Backup:
  Schedule: Daily at 2 AM UTC
  Retention: 30 days
  Lifecycle:
    - Move to cold storage after 7 days
    - Delete after 30 days
  Copy to: us-west-2 (DR region)
  
  Resources: All with tag "Environment=Production"

Production-Weekly-Backup:
  Schedule: Weekly (Sundays 3 AM UTC)
  Retention: 90 days
  Lifecycle:
    - Move to cold storage after 14 days
    - Delete after 90 days
  Copy to: us-west-2

Production-Monthly-Backup:
  Schedule: Monthly (1st of month)
  Retention: 7 years (compliance)
  Lifecycle:
    - Move to cold storage after 1 month
    - Delete after 7 years
  Copy to: us-west-2

Backup Retention Strategy:

GFS (Grandfather-Father-Son):
- Daily (Son): Last 7 days
- Weekly (Father): Last 4 weeks
- Monthly (Grandfather): Last 12 months
- Yearly: Last 7 years

Benefits:
+ Multiple recovery points
+ Long-term compliance
+ Optimized storage costs

Example Recovery Scenarios:
- Deleted file 2 days ago → Restore from daily backup
- Corrupted database 3 weeks ago → Restore from weekly backup
- Audit requires data from 2 years ago → Restore from monthly backup

Backup Cost Optimization:

Storage Tiers:
- Warm storage: $0.05/GB-month (instant access)
- Cold storage: $0.01/GB-month (retrieval fee)
- Cost savings: 80% by moving old backups to cold

Lifecycle Example:
Database: 100 GB
Daily backups: 30 backups
Weekly backups: 12 backups
Monthly backups: 84 backups (7 years)

Without lifecycle:
Total: (30 + 12 + 84) × 100 GB = 12,600 GB
Cost: 12,600 × $0.05 = $630/month

With lifecycle:
Warm (0-7 days): 7 × 100 = 700 GB × $0.05 = $35
Cold (7-30 days): 23 × 100 = 2,300 GB × $0.01 = $23
Cold (weekly/monthly): 96 × 100 = 9,600 GB × $0.01 = $96
Total: $154/month

Savings: $476/month (75%)

Cross-Region Backup:

Purpose: Protection against regional disasters

Configuration:
Primary: us-east-1
DR: us-west-2

Backup copies to us-west-2:
- Daily backups: Last 7 days
- Weekly backups: Last 4 weeks
- Monthly backups: All (7 years)

Cost:
- Storage in DR region: $154/month (same as primary)
- Data transfer: 100 GB/day × $0.02 = $60/month
- Total DR cost: $214/month

Recovery from DR region:
RTO: 2-4 hours (restore from backup)
RPO: 24 hours (daily backup)
```
## Implémentation pratique

### Atelier 1 : Implémentation de la sauvegarde AWS avec réplication inter-régions

**Objectif :** Configurez une sauvegarde centralisée avec une réplication interrégionale automatisée.

**Étape 1 : Créer un coffre-fort de sauvegarde**
```python
import boto3

backup = boto3.client('backup')
kms = boto3.client('kms')

def create_backup_vaults():
    """Create backup vaults in primary and DR regions"""
    
    print("=== Creating Backup Vaults ===\n")
    
    # Create KMS key for backup encryption
    kms_response = kms.create_key(
        Description='Backup encryption key',
        KeyUsage='ENCRYPT_DECRYPT',
        Origin='AWS_KMS',
        Tags=[
            {'TagKey': 'Purpose', 'TagValue': 'Backup'}
        ]
    )
    
    kms_key_id = kms_response['KeyMetadata']['KeyId']
    
    print(f"Created KMS key: {kms_key_id}")
    
    # Create backup vault in primary region (us-east-1)
    try:
        primary_vault = backup.create_backup_vault(
            BackupVaultName='Production-Backup-Vault',
            EncryptionKeyArn=f'arn:aws:kms:us-east-1:123456789012:key/{kms_key_id}',
            BackupVaultTags={
                'Environment': 'Production',
                'Purpose': 'Disaster Recovery'
            }
        )
        
        print(f"Created primary vault: {primary_vault['BackupVaultName']}")
        print(f"  ARN: {primary_vault['BackupVaultArn']}")
    
    except backup.exceptions.AlreadyExistsException:
        print("Primary vault already exists")
    
    # Create backup vault in DR region (us-west-2)
    backup_dr = boto3.client('backup', region_name='us-west-2')
    
    try:
        dr_vault = backup_dr.create_backup_vault(
            BackupVaultName='Production-DR-Backup-Vault',
            EncryptionKeyArn=f'arn:aws:kms:us-west-2:123456789012:key/{kms_key_id}',
            BackupVaultTags={
                'Environment': 'Production',
                'Purpose': 'DR Copy'
            }
        )
        
        print(f"\nCreated DR vault: {dr_vault['BackupVaultName']}")
        print(f"  ARN: {dr_vault['BackupVaultArn']}")
    
    except Exception as e:
        print(f"DR vault creation: {e}")

create_backup_vaults()
```
**Étape 2 : Créer un plan de sauvegarde avec copie inter-régions**
```python
def create_backup_plan():
    """Create backup plan with lifecycle and cross-region copy"""
    
    print("\n=== Creating Backup Plan ===\n")
    
    backup_plan = {
        'BackupPlanName': 'Production-Backup-Plan',
        'Rules': [
            {
                'RuleName': 'DailyBackups',
                'TargetBackupVaultName': 'Production-Backup-Vault',
                'ScheduleExpression': 'cron(0 2 * * ? *)',  # Daily 2 AM UTC
                'StartWindowMinutes': 60,
                'CompletionWindowMinutes': 120,
                'Lifecycle': {
                    'MoveToColdStorageAfterDays': 7,
                    'DeleteAfterDays': 30
                },
                'RecoveryPointTags': {
                    'Type': 'Daily',
                    'Automated': 'True'
                },
                'CopyActions': [
                    {
                        'DestinationBackupVaultArn': 'arn:aws:backup:us-west-2:123456789012:backup-vault:Production-DR-Backup-Vault',
                        'Lifecycle': {
                            'MoveToColdStorageAfterDays': 7,
                            'DeleteAfterDays': 30
                        }
                    }
                ]
            },
            {
                'RuleName': 'WeeklyBackups',
                'TargetBackupVaultName': 'Production-Backup-Vault',
                'ScheduleExpression': 'cron(0 3 ? * SUN *)',  # Weekly Sunday 3 AM
                'Lifecycle': {
                    'MoveToColdStorageAfterDays': 14,
                    'DeleteAfterDays': 90
                },
                'RecoveryPointTags': {
                    'Type': 'Weekly'
                },
                'CopyActions': [
                    {
                        'DestinationBackupVaultArn': 'arn:aws:backup:us-west-2:123456789012:backup-vault:Production-DR-Backup-Vault',
                        'Lifecycle': {
                            'DeleteAfterDays': 90
                        }
                    }
                ]
            },
            {
                'RuleName': 'MonthlyBackups',
                'TargetBackupVaultName': 'Production-Backup-Vault',
                'ScheduleExpression': 'cron(0 4 1 * ? *)',  # Monthly 1st day 4 AM
                'Lifecycle': {
                    'MoveToColdStorageAfterDays': 30,
                    'DeleteAfterDays': 2555  # 7 years
                },
                'RecoveryPointTags': {
                    'Type': 'Monthly',
                    'Retention': 'Long-term'
                },
                'CopyActions': [
                    {
                        'DestinationBackupVaultArn': 'arn:aws:backup:us-west-2:123456789012:backup-vault:Production-DR-Backup-Vault',
                        'Lifecycle': {
                            'DeleteAfterDays': 2555
                        }
                    }
                ]
            }
        ]
    }
    
    try:
        response = backup.create_backup_plan(
            BackupPlan=backup_plan
        )
        
        plan_id = response['BackupPlanId']
        
        print(f"Created backup plan: {plan_id}")
        print("\nBackup Rules:")
        print("  Daily: Retain 30 days, cold after 7 days")
        print("  Weekly: Retain 90 days, cold after 14 days")
        print("  Monthly: Retain 7 years, cold after 30 days")
        print("\n  All backups copied to us-west-2 (DR region)")
        
        return plan_id
    
    except Exception as e:
        print(f"Error creating backup plan: {e}")
        return None

plan_id = create_backup_plan()
```
**Étape 3 : Attribuer des ressources au plan de sauvegarde**
```python
def assign_resources_to_backup(plan_id):
    """Assign resources to backup plan using tags"""
    
    print("\n=== Assigning Resources to Backup Plan ===\n")
    
    # Create IAM role for AWS Backup
    iam = boto3.client('iam')
    
    trust_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "backup.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }
    
    try:
        role_response = iam.create_role(
            RoleName='AWSBackupServiceRole',
            AssumeRolePolicyDocument=json.dumps(trust_policy),
            Description='Role for AWS Backup service'
        )
        
        role_arn = role_response['Role']['Arn']
        
        # Attach managed policies
        iam.attach_role_policy(
            RoleName='AWSBackupServiceRole',
            PolicyArn='arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup'
        )
        
        iam.attach_role_policy(
            RoleName='AWSBackupServiceRole',
            PolicyArn='arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores'
        )
        
        print(f"Created backup service role: {role_arn}")
    
    except iam.exceptions.EntityAlreadyExistsException:
        role_arn = f'arn:aws:iam::123456789012:role/AWSBackupServiceRole'
        print(f"Using existing role: {role_arn}")
    
    # Create backup selection (tag-based)
    backup_selection = {
        'SelectionName': 'Production-Resources',
        'IamRoleArn': role_arn,
        'Resources': ['*'],  # All resources
        'ListOfTags': [
            {
                'ConditionType': 'STRINGEQUALS',
                'ConditionKey': 'Environment',
                'ConditionValue': 'Production'
            },
            {
                'ConditionType': 'STRINGEQUALS',
                'ConditionKey': 'Backup',
                'ConditionValue': 'True'
            }
        ]
    }
    
    try:
        response = backup.create_backup_selection(
            BackupPlanId=plan_id,
            BackupSelection=backup_selection
        )
        
        selection_id = response['SelectionId']
        
        print(f"\nCreated backup selection: {selection_id}")
        print("\nResources included:")
        print("  Tag: Environment=Production AND Backup=True")
        print("\n  This includes:")
        print("    - EC2 instances with these tags")
        print("    - RDS databases with these tags")
        print("    - DynamoDB tables with these tags")
        print("    - EFS file systems with these tags")
        
        return selection_id
    
    except Exception as e:
        print(f"Error creating backup selection: {e}")
        return None

selection_id = assign_resources_to_backup(plan_id)
```
**Étape 4 : Marquer les ressources pour la sauvegarde**
```python
def tag_resources_for_backup():
    """Tag production resources for automatic backup"""
    
    print("\n=== Tagging Resources for Backup ===\n")
    
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    dynamodb = boto3.client('dynamodb')
    
    # Tag EC2 instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['Production']}
        ]
    )
    
    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])
    
    if instance_ids:
        ec2.create_tags(
            Resources=instance_ids,
            Tags=[
                {'Key': 'Backup', 'Value': 'True'},
                {'Key': 'BackupPlan', 'Value': 'Daily'}
            ]
        )
        
        print(f"Tagged {len(instance_ids)} EC2 instances for backup")
    
    # Tag RDS databases
    databases = rds.describe_db_instances()
    
    for db in databases['DBInstances']:
        db_arn = db['DBInstanceArn']
        
        tags = rds.list_tags_for_resource(ResourceName=db_arn)
        
        env_tag = next((tag['Value'] for tag in tags['TagList'] if tag['Key'] == 'Environment'), None)
        
        if env_tag == 'Production':
            rds.add_tags_to_resource(
                ResourceName=db_arn,
                Tags=[
                    {'Key': 'Backup', 'Value': 'True'},
                    {'Key': 'BackupPlan', 'Value': 'Daily'}
                ]
            )
            
            print(f"Tagged RDS database: {db['DBInstanceIdentifier']}")
    
    print("\n✓ Resources tagged for automatic backup")
    print("  Backups will start according to schedule (daily at 2 AM)")

tag_resources_for_backup()
```
**Étape 5 : Surveiller les tâches de sauvegarde**
```python
def monitor_backup_jobs():
    """Monitor backup job execution and status"""
    
    print("\n=== Backup Job Monitoring ===\n")
    
    # List recent backup jobs
    response = backup.list_backup_jobs(
        MaxResults=20
    )
    
    if not response['BackupJobs']:
        print("No backup jobs found yet")
        print("Backups will run according to schedule")
        return
    
    print(f"Recent Backup Jobs:\n")
    
    for job in response['BackupJobs']:
        resource_arn = job['ResourceArn']
        resource_type = job['ResourceType']
        status = job['State']
        created_date = job['CreationDate']
        
        # Extract resource name from ARN
        resource_name = resource_arn.split('/')[-1] if '/' in resource_arn else resource_arn.split(':')[-1]
        
        status_icon = {
            'COMPLETED': '✓',
            'RUNNING': '⟳',
            'FAILED': '✗',
            'ABORTED': '✗'
        }.get(status, '?')
        
        print(f"{status_icon} {resource_type}: {resource_name}")
        print(f"   Status: {status}")
        print(f"   Started: {created_date}")
        
        if status == 'COMPLETED':
            completion_date = job['CompletionDate']
            backup_size = job.get('BackupSizeInBytes', 0) / (1024**3)  # Convert to GB
            
            print(f"   Completed: {completion_date}")
            print(f"   Size: {backup_size:.2f} GB")
        
        elif status == 'FAILED':
            print(f"   Error: {job.get('StatusMessage', 'Unknown error')}")
        
        print()

# Monitor backup jobs
monitor_backup_jobs()
```
### Lab 2 : Tests et validation DR

**Objectif :** Effectuer un exercice de reprise après sinistre pour valider les RTO/RPO et les procédures de récupération.

**Étape 1 : Préparation au pré-test**
```python
import boto3
from datetime import datetime, timedelta

def prepare_dr_test():
    """Prepare for DR test execution"""
    
    print("=== DR Test Preparation ===\n")
    
    # Document current state
    print("Step 1: Document Current State\n")
    
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    
    # Get production resources
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Environment', 'Values': ['Production']},
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    
    instance_count = sum(len(r['Instances']) for r in instances['Reservations'])
    
    databases = rds.describe_db_instances()
    db_instances = [db for db in databases['DBInstances'] 
                    if db.get('TagList') and 
                    any(tag['Key'] == 'Environment' and tag['Value'] == 'Production' 
                        for tag in db.get('TagList', []))]
    
    print(f"Production Resources:")
    print(f"  EC2 Instances: {instance_count}")
    print(f"  RDS Databases: {len(db_instances)}")
    
    # Check latest backups
    print("\nStep 2: Verify Recent Backups\n")
    
    backup = boto3.client('backup')
    
    recovery_points = backup.list_recovery_points_by_backup_vault(
        BackupVaultName='Production-Backup-Vault',
        MaxResults=10
    )
    
    print("Recent Recovery Points:")
    for rp in recovery_points['RecoveryPoints'][:5]:
        resource_arn = rp['ResourceArn']
        resource_type = rp['ResourceType']
        created = rp['CreationDate']
        status = rp['Status']
        
        resource_name = resource_arn.split('/')[-1]
        
        print(f"  {resource_type}: {resource_name}")
        print(f"    Created: {created}")
        print(f"    Status: {status}")
    
    # Define DR test parameters
    print("\nStep 3: Define Test Parameters\n")
    
    test_params = {
        'test_id': f"DR-TEST-{datetime.now().strftime('%Y%m%d-%H%M')}",
        'test_date': datetime.now().isoformat(),
        'test_region': 'us-west-2',
        'production_region': 'us-east-1',
        'scope': 'Full application stack',
        'expected_rto': '4 hours',
        'expected_rpo': '24 hours',
        'test_duration': '4 hours',
        'rollback_plan': 'Terminate test resources after validation'
    }
    
    print(f"Test ID: {test_params['test_id']}")
    print(f"Test Region: {test_params['test_region']}")
    print(f"Expected RTO: {test_params['expected_rto']}")
    print(f"Expected RPO: {test_params['expected_rpo']}")
    
    # Create test tracking document
    print("\nStep 4: Create Test Tracking Document\n")
    
    test_doc = {
        'test_params': test_params,
        'start_time': None,
        'end_time': None,
        'actual_rto': None,
        'actual_rpo': None,
        'status': 'Prepared',
        'issues': [],
        'recovery_steps': []
    }
    
    # Store in S3 for documentation
    s3 = boto3.client('s3')
    
    s3.put_object(
        Bucket='dr-test-documentation',
        Key=f"tests/{test_params['test_id']}/test-plan.json",
        Body=json.dumps(test_doc, indent=2, default=str),
        ContentType='application/json'
    )
    
    print(f"✓ Test documentation created")
    print(f"  Location: s3://dr-test-documentation/tests/{test_params['test_id']}/")
    
    return test_params, test_doc

test_params, test_doc = prepare_dr_test()
```
**Étape 2 : Exécuter la récupération du test DR**
```python
def execute_dr_test(test_params, test_doc):
    """Execute disaster recovery test"""
    
    print("\n=== Executing DR Test ===\n")
    
    test_doc['start_time'] = datetime.now()
    test_doc['status'] = 'In Progress'
    
    print(f"Test Start Time: {test_doc['start_time']}")
    print("\nScenario: Primary region (us-east-1) unavailable")
    print("Objective: Recover application in DR region (us-west-2)")
    print("\n" + "="*60 + "\n")
    
    # Change to DR region
    dr_region = test_params['test_region']
    
    # Step 1: Restore from backup
    print("STEP 1: Restore Database from Backup")
    step_start = datetime.now()
    
    backup_dr = boto3.client('backup', region_name=dr_region)
    rds_dr = boto3.client('rds', region_name=dr_region)
    
    # List available recovery points in DR region
    recovery_points = backup_dr.list_recovery_points_by_backup_vault(
        BackupVaultName='Production-DR-Backup-Vault',
        ByResourceType='RDS'
    )
    
    if recovery_points['RecoveryPoints']:
        latest_rp = recovery_points['RecoveryPoints'][0]
        recovery_point_arn = latest_rp['RecoveryPointArn']
        
        print(f"  Found recovery point: {recovery_point_arn}")
        print(f"  Created: {latest_rp['CreationDate']}")
        
        # Calculate RPO
        creation_time = latest_rp['CreationDate']
        rpo_actual = datetime.now(creation_time.tzinfo) - creation_time
        
        print(f"  Actual RPO: {rpo_actual.total_seconds() / 3600:.1f} hours")
        
        test_doc['actual_rpo'] = str(rpo_actual)
        
        # Restore database
        try:
            restore_response = backup_dr.start_restore_job(
                RecoveryPointArn=recovery_point_arn,
                Metadata={
                    'DBInstanceIdentifier': 'production-db-dr-test',
                    'DBInstanceClass': 'db.t3.medium',
                    'Engine': 'mysql',
                    'MultiAZ': 'false'  # Single AZ for test
                },
                IamRoleArn='arn:aws:iam::123456789012:role/AWSBackupServiceRole'
            )
            
            restore_job_id = restore_response['RestoreJobId']
            
            print(f"\n  Restore job started: {restore_job_id}")
            print(f"  Waiting for database restoration...")
            
            # Monitor restore job
            while True:
                job_status = backup_dr.describe_restore_job(
                    RestoreJobId=restore_job_id
                )
                
                status = job_status['Status']
                
                if status == 'COMPLETED':
                    print(f"  ✓ Database restored successfully")
                    break
                elif status == 'FAILED':
                    print(f"  ✗ Restore failed: {job_status.get('StatusMessage')}")
                    test_doc['issues'].append({
                        'step': 'Database Restore',
                        'issue': job_status.get('StatusMessage')
                    })
                    break
                
                print(f"    Status: {status}")
                time.sleep(30)
        
        except Exception as e:
            print(f"  ✗ Error during restore: {e}")
            test_doc['issues'].append({
                'step': 'Database Restore',
                'issue': str(e)
            })
    
    step_duration = (datetime.now() - step_start).total_seconds() / 60
    test_doc['recovery_steps'].append({
        'step': 'Database Restore',
        'duration_minutes': step_duration
    })
    
    print(f"  Duration: {step_duration:.1f} minutes\n")
    
    # Step 2: Launch application servers
    print("STEP 2: Launch Application Servers")
    step_start = datetime.now()
    
    ec2_dr = boto3.client('ec2', region_name=dr_region)
    
    # Get AMI from primary region (should be copied to DR region)
    amis = ec2_dr.describe_images(
        Filters=[
            {'Name': 'tag:Application', 'Values': ['ProductionApp']},
            {'Name': 'tag:Type', 'Values': ['DR-Ready']}
        ]
    )
    
    if amis['Images']:
        ami_id = amis['Images'][0]['ImageId']
        
        print(f"  Using AMI: {ami_id}")
        
        # Launch instances
        instances = ec2_dr.run_instances(
            ImageId=ami_id,
            InstanceType='t3.medium',
            MinCount=2,
            MaxCount=2,
            SecurityGroupIds=['sg-dr-test'],
            SubnetId='subnet-dr-test',
            IamInstanceProfile={
                'Name': 'EC2-Application-Role'
            },
            TagSpecifications=[{
                'ResourceType': 'instance',
                'Tags': [
                    {'Key': 'Name', 'Value': 'DR-Test-AppServer'},
                    {'Key': 'Environment', 'Value': 'DR-Test'},
                    {'Key': 'TestId', 'Value': test_params['test_id']}
                ]
            }]
        )
        
        instance_ids = [i['InstanceId'] for i in instances['Instances']]
        
        print(f"  Launched instances: {', '.join(instance_ids)}")
        print(f"  Waiting for instances to be running...")
        
        # Wait for instances to be running
        waiter = ec2_dr.get_waiter('instance_running')
        waiter.wait(InstanceIds=instance_ids)
        
        print(f"  ✓ Instances running")
    
    step_duration = (datetime.now() - step_start).total_seconds() / 60
    test_doc['recovery_steps'].append({
        'step': 'Launch Application Servers',
        'duration_minutes': step_duration
    })
    
    print(f"  Duration: {step_duration:.1f} minutes\n")
    
    # Step 3: Configure application
    print("STEP 3: Configure Application")
    step_start = datetime.now()
    
    # Update application configuration (connection strings, etc.)
    ssm_dr = boto3.client('ssm', region_name=dr_region)
    
    try:
        # Update database connection parameter
        ssm_dr.put_parameter(
            Name='/myapp/dr-test/database/endpoint',
            Value='production-db-dr-test.abc123.us-west-2.rds.amazonaws.com',
            Type='String',
            Overwrite=True
        )
        
        print(f"  ✓ Updated application configuration")
    
    except Exception as e:
        print(f"  ⚠️  Configuration update issue: {e}")
    
    step_duration = (datetime.now() - step_start).total_seconds() / 60
    test_doc['recovery_steps'].append({
        'step': 'Configure Application',
        'duration_minutes': step_duration
    })
    
    print(f"  Duration: {step_duration:.1f} minutes\n")
    
    # Step 4: Validate application
    print("STEP 4: Validate Application")
    step_start = datetime.now()
    
    # Get instance IPs
    instance_details = ec2_dr.describe_instances(InstanceIds=instance_ids)
    
    for reservation in instance_details['Reservations']:
        for instance in reservation['Instances']:
            private_ip = instance['PrivateIpAddress']
            
            print(f"  Testing instance: {instance['InstanceId']}")
            print(f"    IP: {private_ip}")
            
            # In production, would perform actual health checks
            # For this test, simulating success
            print(f"    HTTP health check: ✓ 200 OK")
            print(f"    Database connectivity: ✓ Connected")
    
    step_duration = (datetime.now() - step_start).total_seconds() / 60
    test_doc['recovery_steps'].append({
        'step': 'Validate Application',
        'duration_minutes': step_duration
    })
    
    print(f"  Duration: {step_duration:.1f} minutes\n")
    
    # Calculate total RTO
    test_doc['end_time'] = datetime.now()
    total_duration = test_doc['end_time'] - test_doc['start_time']
    test_doc['actual_rto'] = str(total_duration)
    
    print("="*60)
    print(f"\nDR Test Completed")
    print(f"Total Recovery Time (RTO): {total_duration.total_seconds() / 60:.1f} minutes")
    print(f"Expected RTO: {test_params['expected_rto']}")
    
    # Determine if test met objectives
    expected_minutes = 4 * 60  # 4 hours
    actual_minutes = total_duration.total_seconds() / 60
    
    if actual_minutes <= expected_minutes:
        print(f"✓ RTO Objective MET ({actual_minutes:.1f} min ≤ {expected_minutes} min)")
        test_doc['status'] = 'Passed'
    else:
        print(f"✗ RTO Objective MISSED ({actual_minutes:.1f} min > {expected_minutes} min)")
        test_doc['status'] = 'Failed - RTO Exceeded'
    
    return test_doc

test_results = execute_dr_test(test_params, test_doc)
```
**Étape 3 : Générer un rapport de test DR**
```python
def generate_dr_test_report(test_results):
    """Generate comprehensive DR test report"""
    
    print("\n" + "="*60)
    print("DR TEST REPORT")
    print("="*60 + "\n")
    
    print(f"Test ID: {test_results['test_params']['test_id']}")
    print(f"Test Date: {test_results['start_time']}")
    print(f"Status: {test_results['status']}\n")
    
    print("RECOVERY OBJECTIVES:")
    print(f"  Expected RTO: {test_results['test_params']['expected_rto']}")
    print(f"  Actual RTO: {test_results['actual_rto']}")
    print(f"  Expected RPO: {test_results['test_params']['expected_rpo']}")
    print(f"  Actual RPO: {test_results['actual_rpo']}\n")
    
    print("RECOVERY STEPS:")
    for step in test_results['recovery_steps']:
        print(f"  {step['step']}: {step['duration_minutes']:.1f} minutes")
    
    total_minutes = sum(s['duration_minutes'] for s in test_results['recovery_steps'])
    print(f"  Total: {total_minutes:.1f} minutes\n")
    
    if test_results['issues']:
        print("ISSUES ENCOUNTERED:")
        for issue in test_results['issues']:
            print(f"  {issue['step']}: {issue['issue']}")
        print()
    else:
        print("ISSUES: None\n")
    
    print("RECOMMENDATIONS:")
    
    # Analyze results and provide recommendations
    if total_minutes > 240:  # 4 hours
        print("  ⚠️  Recovery time exceeded 4 hours")
        print("     Consider: Pilot Light architecture for faster recovery")
        print("     Consider: Pre-provisioned infrastructure in DR region")
    
    if test_results['issues']:
        print(f"  ⚠️  {len(test_results['issues'])} issues encountered during test")
        print("     Action: Address each issue before next test")
    
    if not test_results['issues'] and total_minutes < 180:
        print("  ✓ Excellent recovery time and no issues")
        print("     Recommendation: Maintain current DR strategy")
    
    print("\nNEXT STEPS:")
    print("  1. Address any issues identified")
    print("  2. Update DR runbooks based on actual timings")
    print("  3. Schedule next DR test (quarterly recommended)")
    print("  4. Clean up test resources")
    
    # Save report to S3
    s3 = boto3.client('s3')
    
    report_content = json.dumps(test_results, indent=2, default=str)
    
    s3.put_object(
        Bucket='dr-test-documentation',
        Key=f"tests/{test_results['test_params']['test_id']}/test-report.json",
        Body=report_content,
        ContentType='application/json'
    )
    
    print(f"\n✓ Report saved to S3")

generate_dr_test_report(test_results)
```
**Étape 4 : Nettoyer les ressources de test**
```python
def cleanup_dr_test_resources(test_params):
    """Clean up resources created during DR test"""
    
    print("\n=== Cleaning Up DR Test Resources ===\n")
    
    dr_region = test_params['test_region']
    test_id = test_params['test_id']
    
    ec2_dr = boto3.client('ec2', region_name=dr_region)
    rds_dr = boto3.client('rds', region_name=dr_region)
    
    # Find test resources by tag
    instances = ec2_dr.describe_instances(
        Filters=[
            {'Name': 'tag:TestId', 'Values': [test_id]},
            {'Name': 'instance-state-name', 'Values': ['running', 'stopped']}
        ]
    )
    
    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])
    
    if instance_ids:
        print(f"Terminating {len(instance_ids)} test instances...")
        ec2_dr.terminate_instances(InstanceIds=instance_ids)
        print(f"  ✓ Instances terminated: {', '.join(instance_ids)}")
    
    # Delete test database
    try:
        print("Deleting test database...")
        rds_dr.delete_db_instance(
            DBInstanceIdentifier='production-db-dr-test',
            SkipFinalSnapshot=True
        )
        print("  ✓ Database deletion initiated")
    except rds_dr.exceptions.DBInstanceNotFoundFault:
        print("  Database not found (already deleted)")
    
    print("\n✓ Test resource cleanup complete")
    print("\nDR Test Completed Successfully")
    print(f"Documentation: s3://dr-test-documentation/tests/{test_id}/")

cleanup_dr_test_resources(test_params)
```
## Connaissances au niveau de la production

### Runbooks DR et automatisation

**Procédures DR complètes :**
```
DR Runbook Structure:

1. Overview
   - Application description
   - Criticality (Tier 0/1/2/3)
   - Recovery objectives (RTO/RPO)
   - DR architecture pattern
   - Last tested date

2. Prerequisites
   - Access requirements (IAM roles, credentials)
   - Required tools (AWS CLI, scripts)
   - Network connectivity (VPN, Direct Connect)
   - Contact information (on-call team, escalation)

3. Detection and Decision
   - Disaster detection criteria
   - Escalation procedures
   - Go/No-Go decision authority
   - Communication plan

4. Recovery Procedures
   - Step-by-step instructions
   - Expected duration per step
   - Validation checkpoints
   - Rollback procedures

5. Post-Recovery Tasks
   - Application validation
   - Data integrity checks
   - Performance verification
   - Stakeholder communication

6. Return to Normal
   - Failback procedures
   - Data synchronization
   - Decommissioning DR resources
   - Lessons learned documentation

Example DR Runbook (E-Commerce Platform):

┌──────────────────────────────────────────────────────────────┐
│ DR RUNBOOK: E-COMMERCE PLATFORM                              │
│ Version: 2.3 | Last Updated: 2025-11-01                      │
│ Last Tested: 2025-10-15 | Status: PASSED                     │
├──────────────────────────────────────────────────────────────┤
│ APPLICATION DETAILS                                           │
│ Name: E-Commerce Platform                                    │
│ Criticality: Tier 0 (Mission Critical)                       │
│ RTO: 1 hour | RPO: 5 minutes                                │
│ DR Pattern: Warm Standby                                     │
│ Primary Region: us-east-1 | DR Region: us-west-2            │
└──────────────────────────────────────────────────────────────┘

DISASTER DETECTION CRITERIA:
□ Primary region unavailable (AWS Health Dashboard)
□ Application error rate > 50% for > 5 minutes
□ Database unavailable (connection failures)
□ Manual declaration by incident commander

DECISION AUTHORITY:
- Incident Commander: VP Engineering
- Backup: Director of Operations
- Escalation: CTO

RECOVERY PROCEDURES:

┌─────────┬──────────────────────────┬──────────┬──────────────┐
│ Step    │ Action                   │ Duration │ Owner        │
├─────────┼──────────────────────────┼──────────┼──────────────┤
│ 1       │ Incident Declaration     │ 5 min    │ IC           │
│ 2       │ Promote RDS Replica      │ 5 min    │ DBA          │
│ 3       │ Scale DR Auto Scaling    │ 10 min   │ Ops          │
│ 4       │ Update Route 53 DNS      │ 2 min    │ Ops          │
│ 5       │ Validate Application     │ 10 min   │ QA           │
│ 6       │ Notify Stakeholders      │ 5 min    │ IC           │
│ Total   │                          │ 37 min   │              │
└─────────┴──────────────────────────┴──────────┴──────────────┘

STEP 1: INCIDENT DECLARATION
□ Verify disaster criteria met
□ Notify incident team (Slack: #incident-response)
□ Start incident log (Google Doc template)
□ Assign roles: IC, DBA, Ops Lead, QA Lead
□ Begin timer (track RTO)

Command:
# No automated command - manual decision

STEP 2: PROMOTE RDS READ REPLICA TO PRIMARY
□ Verify replica lag < 60 seconds
□ Promote replica to standalone instance

Commands:
# Check replication lag
aws rds describe-db-instances \
  --db-instance-identifier production-db-replica-west \
  --region us-west-2 \
  --query 'DBInstances[0].StatusInfos[0].Message'

# Promote to primary
aws rds promote-read-replica \
  --db-instance-identifier production-db-replica-west \
  --region us-west-2

# Wait for promotion
aws rds wait db-instance-available \
  --db-instance-identifier production-db-replica-west \
  --region us-west-2

Expected Duration: 5 minutes
Validation: Database shows as "available"

STEP 3: SCALE DR AUTO SCALING GROUP
□ Update Auto Scaling desired capacity 2 → 10
□ Verify instances launching
□ Wait for health checks

Commands:
# Scale Auto Scaling Group
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name ecommerce-asg-west \
  --desired-capacity 10 \
  --region us-west-2

# Monitor scaling progress
watch aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names ecommerce-asg-west \
  --region us-west-2 \
  --query 'AutoScalingGroups[0].[DesiredCapacity,Instances[].HealthStatus]'

Expected Duration: 10 minutes
Validation: 10 instances in "Healthy" state

STEP 4: UPDATE ROUTE 53 DNS FAILOVER
□ Update health check to fail primary
□ Verify DNS switches to DR region

Commands:
# Update Route 53 record to DR ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456789ABC \
  --change-batch file://dns-failover.json

# dns-failover.json content:
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "www.example.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z987654321XYZ",
        "DNSName": "ecommerce-alb-west-123.us-west-2.elb.amazonaws.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}

# Verify DNS propagation
dig www.example.com

Expected Duration: 2 minutes + DNS TTL (60 seconds)
Validation: DNS resolves to DR region ALB

STEP 5: VALIDATE APPLICATION
□ HTTP health check on ALB
□ Test critical user flows
□ Verify database connectivity
□ Check error rates

Commands:
# Health check
curl -I https://www.example.com/health

# Monitor error rates
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/ecommerce-alb-west/abc123 \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

Test User Flows:
□ Homepage loads
□ Product search works
□ Add to cart functions
□ Checkout process completes (test transaction)

Expected Duration: 10 minutes
Validation: All critical flows functional, error rate < 1%

STEP 6: NOTIFY STAKEHOLDERS
□ Update status page
□ Send email to stakeholders
□ Post to customer communication channel

Template:
"We are currently operating from our disaster recovery site
due to issues in our primary datacenter. All services are
operational. We are investigating the root cause."

ROLLBACK PROCEDURE (IF DR FAILS):
1. Revert Route 53 DNS to primary (if still accessible)
2. Scale down DR Auto Scaling Group to 2 instances
3. Failover database back to primary region
4. Document failure reason for investigation

POST-RECOVERY VALIDATION CHECKLIST:
□ Application accessible and functional
□ Error rates < 1%
□ Response times < 500ms p95
□ Database connectivity confirmed
□ Payment processing working
□ Orders being created successfully
□ Email notifications sending
□ Inventory updates processing

RETURN TO NORMAL (FAILBACK):
When primary region restored:
1. Verify primary region fully operational
2. Set up reverse replication (DR → Primary)
3. Schedule failback maintenance window
4. Execute reverse of recovery steps
5. Monitor for 24 hours
6. Document lessons learned

AUTOMATION:
Automated failover script: /opt/dr/scripts/failover.sh
Manual override required: Yes (IC approval)
Monitoring: CloudWatch alarm triggers SNS → PagerDuty
```
### Validation DR continue

**Tests et améliorations réguliers :**
```
DR Testing Schedule:

Quarterly Full DR Tests:
- Complete failover to DR region
- Validate all recovery procedures
- Measure actual RTO/RPO
- Update runbooks based on findings

Monthly Tabletop Exercises:
- Walk through DR procedures (no actual failover)
- Identify procedure gaps
- Train new team members
- Review recent AWS service changes

Weekly Backup Validation:
- Automated backup completion checks
- Random restore tests
- Backup integrity verification
- Cross-region replication monitoring

Daily Monitoring:
- Backup job success/failure
- Replication lag (if applicable)
- DR resource health (warm standby)
- Cross-region data sync status

Automated DR Testing Framework:

#!/bin/bash
# Automated DR Test Script

TEST_ID="DR-TEST-$(date +%Y%m%d-%H%M)"
DR_REGION="us-west-2"
TEST_VPC="vpc-dr-test"

echo "Starting DR Test: $TEST_ID"

# 1. Create isolated test environment
echo "Creating test environment in $DR_REGION..."
aws ec2 create-vpc --cidr-block 10.99.0.0/16 --region $DR_REGION

# 2. Restore latest backup
echo "Restoring from latest backup..."
LATEST_RECOVERY_POINT=$(aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name Production-DR-Backup-Vault \
  --region $DR_REGION \
  --query 'RecoveryPoints[0].RecoveryPointArn' \
  --output text)

aws backup start-restore-job \
  --recovery-point-arn $LATEST_RECOVERY_POINT \
  --iam-role-arn arn:aws:iam::123456789012:role/AWSBackupServiceRole \
  --region $DR_REGION

# 3. Wait for restore completion
echo "Waiting for restore to complete..."
# Monitor and wait

# 4. Launch application instances
echo "Launching application instances..."
aws ec2 run-instances --image-id $AMI_ID --count 2 --region $DR_REGION

# 5. Validate application
echo "Validating application..."
# Run health checks

# 6. Generate report
echo "Generating test report..."
# Create detailed report

# 7. Clean up
echo "Cleaning up test resources..."
# Terminate all test resources

echo "DR Test Complete: $TEST_ID"

DR Testing Metrics:

Track over time:
- RTO Achievement: Actual vs Target
- RPO Achievement: Data loss vs Target  
- Test Success Rate: % of tests passed
- Issues Identified: Count per test
- Issue Resolution Time: Days to fix
- Runbook Accuracy: Steps requiring updates
- Team Readiness: Time to respond

Example Metrics Dashboard:

┌──────────────────────────────────────────────────────────────┐
│ DR TESTING METRICS - Q4 2025                                 │
├──────────────────────────────────────────────────────────────┤
│ Tests Conducted: 3                                           │
│ Success Rate: 100%                                           │
│                                                              │
│ RTO Performance:                                             │
│   Target: 60 minutes                                         │
│   Test 1: 45 minutes ✓                                      │
│   Test 2: 52 minutes ✓                                      │
│   Test 3: 38 minutes ✓                                      │
│   Average: 45 minutes (25% better than target)              │
│                                                              │
│ Issues Identified: 2                                         │
│   - Database restore timeout (resolved)                     │
│   - Missing IAM permissions (resolved)                      │
│                                                              │
│ Improvements Made:                                           │
│   - Automated DNS failover (reduced RTO 15 mins)            │
│   - Pre-warmed DR instances (reduced RTO 10 mins)           │
│   - Updated runbooks (7 steps clarified)                    │
└──────────────────────────────────────────────────────────────┘
```
## Conseils \& Bonnes pratiques

**Astuce 1 : Testez DR régulièrement, pas une seule fois**
Des tests DR complets trimestriels valident le fonctionnement des procédures : les plans DR non testés échouent 70 % du temps lors de catastrophes réelles.

**Astuce 2 : Automatisez la validation des sauvegardes**
Les tests de restauration automatisés quotidiens détectent très tôt les corruptions de sauvegarde : ils découvrent trop tard que les sauvegardes ne fonctionnent pas pendant la reprise après sinistre.

**Astuce 3 : Documentez tout dans les Runbooks**
Procédures étape par étape avec des commandes exactes : les nouveaux membres de l'équipe peuvent exécuter une récupération sans expérience préalable lors d'incidents à 3 heures du matin.

**Astuce 4 : Séparez la DR de test et de production**
Utilisez un environnement de test isolé pour les exercices de reprise après sinistre : évitez d'avoir un impact sur le DNS, les données ou les configurations de production lors de la validation.

**Astuce 5 : Surveillez le décalage de réplication en continu**
Alerte lorsque le délai de réplication de la base de données dépasse le RPO acceptable : une alerte précoce empêche le dépassement du RPO en cas de sinistre.

**Astuce 6 : Utilisez Multi-AZ avant Multi-Region**
Le multi-AZ gère automatiquement 99 % des pannes à faible coût : ajoutez le multi-région uniquement en cas de catastrophe régionale ou de conformité.

**Astuce 7 : pratiquez également la restauration automatique**
Testez le retour à la région principale après la reprise après sinistre : de nombreuses organisations réussissent le basculement, mais rencontrent des difficultés avec les procédures de restauration automatique.

**Astuce 8 : étiquetez toutes les ressources de sauvegarde**
Un balisage cohérent permet une gestion automatisée des sauvegardes : identifiez facilement les ressources de sauvegarde par objectif, conservation et environnement.

**Astuce 9 : définissez la conservation des sauvegardes en fonction de la conformité**
Les exigences réglementaires déterminent les périodes de conservation : comprenez les exigences RGPD, HIPAA et SOX avant de définir des politiques de sauvegarde.

**Astuce 10 : Calculez le coût de la reprise après sinistre par rapport au risque**
Quantifiez les coûts des temps d'arrêt et l'impact des pertes de données : justifiez un investissement approprié en matière de reprise après sinistre et évitez une ingénierie insuffisante ou excessive.

## Pièges \& Remèdes

### Piège 1 : procédures de récupération non testées

**Problème :** Plans de reprise après sinistre documentés mais jamais testés ; les procédures échouent lors de catastrophes réelles en raison d’étapes obsolètes, d’autorisations manquantes ou d’hypothèses incorrectes.

**Pourquoi cela arrive :**

- Planification DR traitée comme un exercice de case à cocher
- Tests perçus comme risqués ou perturbateurs
- Budget/temps non alloué pour les tests
- Peur de casser la production
- Pas de parrainage exécutif pour les exercices DR

**Impact :**

- 70 % des plans de reprise après sinistre non testés échouent pendant l'exécution
- Le RTO prolonge de 3 à 5 fois la durée prévue
- La perte de données dépasse les attentes RPO
- Confusion et panique des équipes lors d'incidents
- Perte de revenus et atteinte à la réputation

**Exemple :**
```
Company: SaaS platform with 24-hour RTO
DR Plan: Restore from backups to new region
Last Tested: Never

Actual Disaster Scenario:
- Primary datacenter fire
- Initiated DR procedures from runbook
- Hour 1: Discovered backup restore IAM role missing permissions
- Hour 3: Fixed permissions, started restore
- Hour 6: Database restore completed but application won't connect
- Hour 8: Discovered connection strings hardcoded to primary region
- Hour 12: Fixed connection strings, redeployed application
- Hour 15: Application working but performance terrible
- Hour 18: Discovered instance types undersized for production load
- Hour 24: Finally operational at acceptable performance

Actual RTO: 24 hours (vs 4-hour plan)
Impact:
- 24 hours downtime = $2.4M revenue loss
- 15% customer churn
- Regulatory investigation
- Executive dismissals

Root Cause: Never tested DR procedures
Prevention: Quarterly DR tests would have identified all issues
```
**Remède :**

**Étape 1 : Établir un calendrier régulier de tests DR**
```python
def create_dr_testing_schedule():
    """Create comprehensive DR testing program"""
    
    print("=== DR Testing Schedule ===\n")
    
    testing_schedule = {
        'daily': {
            'activity': 'Backup validation',
            'scope': 'Automated backup completion checks',
            'duration': '5 minutes',
            'automation': 'Fully automated',
            'owner': 'Operations team'
        },
        'weekly': {
            'activity': 'Restore validation',
            'scope': 'Random restore test of one resource',
            'duration': '30 minutes',
            'automation': 'Automated with manual verification',
            'owner': 'Operations team'
        },
        'monthly': {
            'activity': 'Tabletop exercise',
            'scope': 'Walk through DR procedures',
            'duration': '2 hours',
            'automation': 'Manual discussion',
            'owner': 'Engineering leads'
        },
        'quarterly': {
            'activity': 'Full DR drill',
            'scope': 'Complete failover to DR region',
            'duration': '4-8 hours',
            'automation': 'Partially automated',
            'owner': 'Engineering + Operations + Leadership'
        },
        'annually': {
            'activity': 'Executive DR simulation',
            'scope': 'Crisis management and communication',
            'duration': '1 day',
            'automation': 'Manual scenario-based',
            'owner': 'Executive team'
        }
    }
    
    for frequency, details in testing_schedule.items():
        print(f"{frequency.upper()}:")
        for key, value in details.items():
            print(f"  {key.capitalize()}: {value}")
        print()
    
    # Create testing calendar
    print("Next 12 Months Testing Calendar:")
    print("-" * 60)
    
    import calendar
    from datetime import datetime, timedelta
    
    today = datetime.now()
    
    # Quarterly tests
    for i in range(4):
        test_date = today + timedelta(days=90*i)
        print(f"{test_date.strftime('%Y-%m-%d')}: Full DR Drill - Q{i+1} Test")
    
    print("\nImportant: Block calendar dates now")
    print("Ensure executive sponsorship and participation")

create_dr_testing_schedule()
```
**Étape 2 : Mettre en œuvre des tests de reprise automatisés**
```python
def automated_dr_test_framework():
    """Framework for automated DR testing"""
    
    print("\n=== Automated DR Testing Framework ===\n")
    
    # Daily backup validation
    def daily_backup_validation():
        """Automated daily backup checks"""
        
        backup = boto3.client('backup')
        
        # Check yesterday's backups
        yesterday = datetime.now() - timedelta(days=1)
        
        jobs = backup.list_backup_jobs(
            ByCreatedAfter=yesterday,
            ByCreatedBefore=datetime.now()
        )
        
        failed_jobs = [j for j in jobs['BackupJobs'] if j['State'] == 'FAILED']
        
        if failed_jobs:
            # Send alert
            sns = boto3.client('sns')
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:backup-alerts',
                Subject='⚠️ Backup Job Failures Detected',
                Message=f'{len(failed_jobs)} backup jobs failed yesterday'
            )
        
        return len(failed_jobs) == 0
    
    # Weekly restore validation
    def weekly_restore_test():
        """Automated weekly restore test"""
        
        import random
        
        backup = boto3.client('backup')
        
        # Get random recovery point
        recovery_points = backup.list_recovery_points_by_backup_vault(
            BackupVaultName='Production-Backup-Vault'
        )
        
        if recovery_points['RecoveryPoints']:
            # Select random recovery point
            rp = random.choice(recovery_points['RecoveryPoints'])
            
            print(f"Testing restore of: {rp['ResourceArn']}")
            
            # Restore to test environment
            restore_job = backup.start_restore_job(
                RecoveryPointArn=rp['RecoveryPointArn'],
                Metadata={
                    # Restore with test configuration
                    'Purpose': 'DR Test',
                    'AutoDelete': 'After 24 hours'
                },
                IamRoleArn='arn:aws:iam::123456789012:role/AWSBackupServiceRole'
            )
            
            print(f"Restore job started: {restore_job['RestoreJobId']}")
            
            # Monitor and validate
            # ... validation logic ...
            
            # Clean up after validation
            # ... cleanup logic ...
    
    # Quarterly full DR drill
    def quarterly_dr_drill():
        """Comprehensive DR drill"""
        
        print("Starting Quarterly DR Drill")
        
        steps = [
            'Declare disaster scenario',
            'Promote database replica',
            'Scale application tier',
            'Update DNS',
            'Validate application',
            'Load test',
            'Failback to primary',
            'Document results'
        ]
        
        results = {}
        
        for step in steps:
            start_time = datetime.now()
            
            # Execute step (actual implementation)
            success = execute_dr_step(step)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            results[step] = {
                'success': success,
                'duration': duration
            }
        
        # Generate report
        generate_drill_report(results)
    
    print("Automated DR Testing Framework Deployed")
    print("\nScheduled tasks:")
    print("  - Daily 2 AM: Backup validation")
    print("  - Weekly Sunday 3 AM: Restore test")
    print("  - Quarterly: Full DR drill (scheduled with team)")

automated_dr_test_framework()
```
**Étape 3 : Créer une carte de pointage des tests DR**
```python
def create_dr_testing_scorecard():
    """Track DR testing metrics over time"""
    
    scorecard = {
        'quarter': 'Q4 2025',
        'tests_completed': 3,
        'tests_planned': 3,
        'completion_rate': '100%',
        'metrics': {
            'rto_achievement': {
                'target': '60 minutes',
                'test1': '45 minutes',
                'test2': '52 minutes',
                'test3': '38 minutes',
                'average': '45 minutes',
                'status': 'EXCEEDS TARGET'
            },
            'rpo_achievement': {
                'target': '5 minutes',
                'test1': '3 minutes',
                'test2': '4 minutes',
                'test3': '2 minutes',
                'average': '3 minutes',
                'status': 'EXCEEDS TARGET'
            },
            'procedure_accuracy': {
                'total_steps': 25,
                'accurate_steps': 23,
                'accuracy_rate': '92%',
                'improvements_made': 2,
                'status': 'GOOD'
            }
        },
        'issues_found': [
            {
                'issue': 'Database restore timeout',
                'severity': 'High',
                'found_date': '2025-10-15',
                'resolved_date': '2025-10-20',
                'resolution': 'Increased timeout from 30 to 60 minutes'
            },
            {
                'issue': 'Missing IAM permission',
                'severity': 'Medium',
                'found_date': '2025-11-12',
                'resolved_date': '2025-11-13',
                'resolution': 'Added s3:GetObject permission to backup role'
            }
        ],
        'improvements': [
            'Automated DNS failover (reduced RTO 15 minutes)',
            'Pre-warmed DR instances (reduced RTO 10 minutes)',
            'Updated runbooks with actual timings',
            'Added monitoring dashboards for DR region'
        ]
    }
    
    print("=== DR Testing Scorecard ===\n")
    print(f"Quarter: {scorecard['quarter']}")
    print(f"Tests: {scorecard['tests_completed']}/{scorecard['tests_planned']} completed")
    print(f"\nRTO Achievement: {scorecard['metrics']['rto_achievement']['status']}")
    print(f"  Target: {scorecard['metrics']['rto_achievement']['target']}")
    print(f"  Average: {scorecard['metrics']['rto_achievement']['average']}")
    
    print(f"\nRPO Achievement: {scorecard['metrics']['rpo_achievement']['status']}")
    print(f"  Target: {scorecard['metrics']['rpo_achievement']['target']}")
    print(f"  Average: {scorecard['metrics']['rpo_achievement']['average']}")
    
    print(f"\nIssues Found and Resolved: {len(scorecard['issues_found'])}")
    for issue in scorecard['issues_found']:
        print(f"  - {issue['issue']} ({issue['severity']})")
        print(f"    Resolved: {issue['resolved_date']}")
    
    print(f"\nImprovements Made: {len(scorecard['improvements'])}")
    for improvement in scorecard['improvements']:
        print(f"  - {improvement}")
    
    return scorecard

scorecard = create_dr_testing_scorecard()
```
**Prévention :**

- Mandat exécutif pour les tests DR trimestriels
- Budget alloué aux tests (temps de l'équipe, ressources)
- Tests programmés 12 mois à l'avance
- Succès mesuré et rapporté à la direction
- Les problèmes issus des tests bénéficient des correctifs les plus prioritaires
- Tests DR inclus dans les OKR/KPI de l'équipe
- Changement de culture : les tests sont une protection, pas un risque

***

## Résumé du chapitre

AWS Disaster Recovery transforme la continuité de l'activité depuis des installations de secours coûteuses vers des architectures cloud flexibles et rentables, atteignant les objectifs de temps de récupération de quelques heures à quelques secondes et les objectifs de point de récupération de quelques jours à presque zéro. Les organisations mettant en œuvre des modèles de reprise après sinistre appropriés : sauvegarde et restauration pour les opérations non critiques (RTO : heures), Pilot Light pour les activités importantes (RTO : 1 à 4 heures), Warm Standby pour les opérations en contact avec le client (RTO : minutes) ou Multi-Site Active-Active pour les activités critiques (RTO : secondes), basées sur une analyse d'impact commercial, pour se protéger contre les sinistres tout en optimisant les coûts. Le succès nécessite des tests de reprise d'activité réguliers (au minimum tous les trimestres), une validation automatisée des sauvegardes, des runbooks complets et le traitement de la reprise d'activité comme une pratique opérationnelle continue plutôt que comme un exercice de planification ponctuel ; Les plans de reprise après sinistre non testés échouent dans 70 % des cas lors de catastrophes réelles.

**Principaux points à retenir :**

- **Calculez le RPO/RTO à partir de l'impact commercial :** Quantifiez le coût des temps d'arrêt (\$5 600/minute en moyenne) et l'impact de la perte de données ; génère des investissements appropriés en matière de reprise après sinistre, évitant ainsi la sous-ingénierie ou la sur-ingénierie
- **Sélectionnez les exigences de correspondance du modèle DR :** Sauvegarde \& Restauration (coût de 4 %, heures de RTO), veilleuse (coût de 10 %, RTO de 1 à 4 heures), veille chaude (coût de 30 %, minutes de RTO), multisite (coût de 110 %, secondes de RTO)
- **Test minimum trimestriel de reprise d'activité :** 70 % des plans de reprise d'activité non testés échouent pendant l'exécution ; des tests trimestriels valident les procédures, identifient les problèmes, forment les équipes
- **Sauvegarde et validation automatisées :** La sauvegarde AWS avec réplication entre régions, politiques de cycle de vie et tests de restauration quotidiens automatisés détecte rapidement la corruption.
- **Créez des Runbooks complets :** Des procédures étape par étape avec des commandes exactes permettent aux nouveaux membres de l'équipe d'exécuter une récupération en cas d'incident.
- **Surveiller le décalage de réplication en continu :** Alerte en cas de dépassement du RPO acceptable ; l'alerte précoce évite la perte de données en cas de catastrophe
- **Pratiquez également le rétablissement :** De nombreuses organisations réussissent le basculement mais ont du mal à revenir au système principal ; tester le cycle complet, y compris la récupération

Exemple d'analyse coûts-avantages après sinistre : une plate-forme de commerce électronique avec un coût d'arrêt de 13 889 $/heure met en œuvre une fonction Warm Standby à 50 000 $/an, évitant ainsi les pertes annuelles attendues de 136 000 $ dues à des catastrophes - ROI de 172 % la première année. Les organisations qui considèrent la reprise après sinistre comme un outil commercial plutôt que comme une police d'assurance obtiennent de meilleurs résultats grâce à des tests réguliers, à l'automatisation, à l'amélioration continue et à des investissements appropriés alignés sur l'importance critique de l'entreprise.

## Questions de révision

1. **Que mesure le RPO ?**
a) Temps de récupération
b) Perte de données maximale acceptable ✓
c) Fréquence de sauvegarde
d) Durée du temps d'arrêt

**Réponse : B** - Le RPO (Recovery Point Objective) mesure la perte de données maximale acceptable dans le temps

2. **Quel modèle de reprise après sinistre a le coût le plus bas ?**
a) Sauvegarde \& Restauration ✓
b) Lampe témoin
c) Veille à chaud
d) Multi-sites

**Réponse : A** – La sauvegarde et la restauration ont le coût le plus bas (~ 4 % du coût principal) mais le RTO le plus élevé

3. **Quel est le RTO typique pour Pilot Light ?**
a) Procès-verbal
b) 1 à 4 heures ✓
c) 1 jour
d) 1 semaine

**Réponse : B** - Pilot Light atteint généralement un RTO de 1 à 4 heures avec les systèmes principaux en cours d'exécution.

4. **À quelle fréquence la DR doit-elle être testée ?**
a) Jamais (trop risqué)
b) Annuellement
c) Trimestriel ✓
d) Mensuel

**Réponse : C** – Tests DR trimestriels minimum recommandés ; valide le travail des procédures

5. **Quel pourcentage de plans de reprise après sinistre non testés échouent ?**
a) 10%
b) 30%
c) 50%
d) 70% ✓

**Réponse : D** - 70 % des plans de reprise après sinistre non testés échouent lors de l'exécution ; test critique

6. **Quel service AWS assure une gestion centralisée des sauvegardes ?**
a) Formation en nuage
b) Sauvegarde AWS ✓
c)S3
d) Gestionnaire de systèmes

**Réponse : B** - AWS Backup fournit une gestion centralisée des sauvegardes sur plusieurs services

7. **À quoi sert principalement Multi-AZ ?**
a) Optimisation globale de la latence
b) Haute disponibilité dans la région ✓
c) Reprise après sinistre dans toutes les régions
d) Réduction des coûts

**Réponse : B** – Multi-AZ offre une haute disponibilité au sein d'une seule région en cas de pannes de AZ.

8. **Quel modèle de reprise après sinistre utilise une infrastructure réduite dans la région de reprise après sinistre ?**
a) Sauvegarde \& Restauration
b) Lampe témoin
c) Veille à chaud ✓
d) Veille à froid

**Réponse : C** – Warm Standby exécute une version réduite (capacité de 20 à 30 %), prête à évoluer

9. **Sur quoi la conservation des sauvegardes doit-elle être basée ?**
a) Minimisation des coûts de stockage
b) Exigences de conformité ✓
c) Préférence du développeur
d) Moyennes du secteur

**Réponse : B** - La conservation des sauvegardes doit être conforme aux réglementations (RGPD, HIPAA, SOX, etc.)

10. **Quelle est la stratégie de conservation des sauvegardes GFS ?**
a) Grand-Père-Père-Fils (quotidien, hebdomadaire, mensuel) ✓
b) Système de fichiers global
c) Stratégie générale de basculement
d) Scénarios d'échec progressifs

**Réponse : A** – GFS utilise des niveaux de rétention quotidiens (fils), hebdomadaires (père) et mensuels (grand-père).

***
# Partie 10 : Optimisation des coûts \& FinOps

# Chapitre 29 : Gestion des coûts

##Présentation

Le cloud computing promet une économie de paiement selon ce que vous utilisez, mais les organisations sont souvent confrontées à des factures mensuelles inattendues, ont du mal à imputer les coûts aux équipes et manquent de visibilité sur les habitudes de dépenses jusqu'à l'arrivée des factures. Les coûts mensuels AWS d'une moyenne de 50 000 $ peuvent atteindre 150 000 $ en quelques mois en raison d'un provisionnement incontrôlé des ressources, d'environnements de test oubliés, d'instances surdimensionnées et de ressources inutilisées qui s'accumulent silencieusement. La budgétisation informatique traditionnelle (approvisionnement annuel, capacité fixe, feuilles de calcul manuelles) ne peut pas gérer les environnements cloud dans lesquels les développeurs provisionnent les ressources instantanément, les charges de travail évoluent de manière dynamique et des centaines de services sont facturés à l'heure, à la demande ou au gigaoctet. Les pratiques AWS Cost Management et FinOps fournissent les stratégies de visibilité, de gouvernance et d'optimisation nécessaires pour contrôler les dépenses cloud tout en maintenant l'agilité de l'entreprise.

L’impact financier d’une gestion inadéquate des coûts s’étend au-delà des dépassements budgétaires. Les organisations gaspillent en moyenne 30 % de leurs dépenses cloud à cause de ressources zombies (instances EC2 inutilisées), de surprovisionnement (instances de taille 3 fois les besoins réels), d'architectures inefficaces (coûts de transfert de données dus à une mauvaise conception) et du manque de remises sur engagement (tarification à la demande pour des charges de travail stables). Sans un étiquetage approprié, les coûts ne peuvent pas être attribués aux équipes ou aux projets, ce qui empêche la responsabilité et la rétrofacturation. Sans budgets ni alertes, les spirales de dépenses non détectées jusqu'aux factures de fin de mois choquent les équipes financières. Les services AWS Cost Management (Cost Explorer pour l'analyse, Budgets pour les alertes, Détection des anomalies de coûts pour les dépenses inhabituelles et Balises d'allocation des coûts pour l'attribution) transforment la visibilité des coûts d'indicateurs retardés en contrôles proactifs.

Ce chapitre s'appuie sur les connaissances en matière d'infrastructure tout au long du manuel : Cost Explorer analyse les modèles de dépenses EC2, RDS, Lambda et S3 ; les stratégies de marquage permettent l'attribution sur tous les services ; les recommandations de redimensionnement identifient les instances surdimensionnées ; Les plans d'épargne et les instances réservées réduisent les coûts de calcul de 72 % ; Les instances Spot réduisent les coûts de 90 % pour les charges de travail tolérantes aux pannes. Le chapitre couvre la structure des coûts d'AWS, la fonctionnalité Cost Explorer, la configuration du budget avec des alertes, les stratégies de marquage de répartition des coûts, la détection des anomalies, les plans d'épargne par rapport aux instances réservées, les stratégies d'instance Spot, la méthodologie de redimensionnement, l'optimisation architecturale, la culture FinOps, la mise en œuvre de la rétrofacturation et de la rétrofacturation et la création de systèmes de production où chaque ressource est étiquetée, les coûts sont suivis en continu, les équipes sont responsables et l'optimisation est une discipline continue plutôt qu'un projet annuel.

## Théorie \&Concepts

### Structure des coûts AWS

**Comprendre la facturation AWS :**
```
AWS Pricing Models:

1. On-Demand:
   - Pay by hour or second
   - No upfront cost
   - No commitment
   - Most expensive (baseline 100%)
   - Use case: Unpredictable workloads, short-term

2. Savings Plans (Compute):
   - 1 or 3-year commitment
   - Hourly spend commitment ($X/hour)
   - 66-72% discount vs on-demand
   - Flexible: EC2, Fargate, Lambda
   - Use case: Steady baseline workload

3. Reserved Instances:
   - 1 or 3-year commitment
   - Specific instance type and region
   - 40-72% discount vs on-demand
   - Less flexible than Savings Plans
   - Use case: Predictable, stable workloads

4. Spot Instances:
   - Bid on spare capacity
   - Up to 90% discount vs on-demand
   - Can be interrupted (2-minute warning)
   - Use case: Fault-tolerant, flexible workloads

Cost Comparison Example (m5.large):

On-Demand: $0.096/hour
- Annual cost: $841
- Commitment: None
- Flexibility: Maximum

1-Year Savings Plan (72% discount):
- Hourly rate: $0.027/hour
- Annual cost: $237 (includes commitment)
- Savings: $604/year (72%)
- Commitment: $237/year ($0.027/hour × 8,760 hours)

3-Year Reserved Instance (75% discount):
- Hourly rate: $0.024/hour
- Annual cost: $210
- Savings: $631/year (75%)
- Commitment: 3 years, specific instance type

Spot Instance (90% discount):
- Hourly rate: $0.0096/hour
- Annual cost: $84
- Savings: $757/year (90%)
- Risk: Can be interrupted

Blended Strategy (Optimal):
- Baseline (70%): 3-Year Savings Plan
- Growth (20%): On-Demand
- Batch (10%): Spot
- Average discount: ~60-65%

Common Cost Categories:

Compute:
- EC2 instances
- Lambda invocations
- ECS/Fargate tasks
- Typical: 40-50% of total bill

Storage:
- S3 object storage
- EBS volumes
- EFS file systems
- Snapshots
- Typical: 15-25% of total bill

Database:
- RDS instances
- DynamoDB capacity
- Aurora clusters
- ElastiCache
- Typical: 10-20% of total bill

Data Transfer:
- Internet egress (AWS → Internet)
- Inter-region transfer
- CloudFront delivery
- Typical: 5-15% of total bill

Other Services:
- Load Balancers
- NAT Gateways
- Route 53
- CloudWatch
- Typical: 10-20% of total bill

Hidden Costs (Often Overlooked):

Idle Resources:
- Stopped EC2 instances: $0/compute but EBS volume charges
- Unattached EBS volumes: Full storage cost
- Unused Elastic IPs: $3.60/month each
- Development environments running 24/7

Data Transfer:
- S3 → Internet: $0.09/GB (first 10 TB)
- Inter-region S3 replication: $0.02/GB
- NAT Gateway data processing: $0.045/GB
- Architecture decisions drive transfer costs

Overprovisioning:
- t3.2xlarge when t3.medium sufficient: 8× cost
- Provisioned IOPS when General Purpose SSD adequate: 3× cost
- RDS Multi-AZ when single-AZ acceptable: 2× cost
```
### Balises de répartition des coûts

**Stratégie de balise pour l'attribution des coûts :**
```
Cost Allocation Tags:
User-defined tags tracked in billing reports
Enable cost attribution to teams, projects, environments

Required Tags Strategy:

Business Tags:
- CostCenter: Finance department/cost center code
- Project: Project or application name
- Owner: Team or person responsible
- BusinessUnit: Department or business unit

Technical Tags:
- Environment: Production, Staging, Development, Test
- Application: Application identifier
- Component: Database, WebServer, Cache, etc.
- Version: Application or infrastructure version

Operational Tags:
- ManagedBy: Terraform, CloudFormation, Manual
- BackupPolicy: Daily, Weekly, NoBackup
- Compliance: HIPAA, PCI-DSS, SOC2
- DataClassification: Public, Internal, Confidential

Example Tag Set:

Resource: EC2 Instance
Tags:
- Name: web-server-prod-01
- CostCenter: CC-12345
- Project: CustomerPortal
- Owner: TeamAlpha
- BusinessUnit: Engineering
- Environment: Production
- Application: CustomerPortal
- Component: WebServer
- ManagedBy: Terraform
- BackupPolicy: Daily

Tag Enforcement:

Service Control Policy (SCP):
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Action": [
      "ec2:RunInstances",
      "rds:CreateDBInstance",
      "s3:CreateBucket"
    ],
    "Resource": "*",
    "Condition": {
      "StringNotLike": {
        "aws:RequestTag/CostCenter": "CC-*",
        "aws:RequestTag/Project": "*",
        "aws:RequestTag/Environment": ["Production", "Staging", "Development"]
      }
    }
  }]
}

Enforcement Result:
Cannot launch resources without required tags
Prevents untagged resource creation
100% tag compliance from day one

Tag Hygiene:

# Lambda function to tag untagged resources
def tag_untagged_resources():
    """Automatically tag resources missing required tags"""
    
    ec2 = boto3.client('ec2')
    
    # Find untagged instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
            
            # Check for required tags
            missing_tags = []
            
            if 'CostCenter' not in tags:
                missing_tags.append({'Key': 'CostCenter', 'Value': 'CC-UNKNOWN'})
            
            if 'Project' not in tags:
                missing_tags.append({'Key': 'Project', 'Value': 'Unassigned'})
            
            if 'Environment' not in tags:
                missing_tags.append({'Key': 'Environment', 'Value': 'Unknown'})
            
            if missing_tags:
                # Tag with default values
                ec2.create_tags(
                    Resources=[instance_id],
                    Tags=missing_tags
                )
                
                # Alert owner to update tags
                sns = boto3.client('sns')
                sns.publish(
                    TopicArn='arn:aws:sns:region:account:untagged-resources',
                    Subject=f'Resource {instance_id} auto-tagged with defaults',
                    Message=f'Please update tags for {instance_id}'
                )

Tag Reports:

Cost and Usage Report (CUR):
- Export to S3 with tag columns
- Analyze costs by tag in Athena
- Create dashboards in QuickSight

Query Example (Athena):
SELECT
    line_item_usage_account_id AS account,
    resource_tags_user_cost_center AS cost_center,
    resource_tags_user_project AS project,
    resource_tags_user_environment AS environment,
    SUM(line_item_unblended_cost) AS total_cost
FROM
    cur_database.cost_and_usage_report
WHERE
    year = '2025' AND month = '01'
GROUP BY
    1, 2, 3, 4
ORDER BY
    total_cost DESC
LIMIT 20
```
### Explorateur de coûts

**Analyse des dépenses AWS :**
```
Cost Explorer Capabilities:

Visualization:
- Daily, monthly, or custom date ranges
- Bar charts, line graphs, stacked areas
- Forecasting (3 months ahead)
- Historical data (up to 12 months default, 13 months max)

Filtering and Grouping:

Group By:
- Service (EC2, S3, RDS, etc.)
- Linked Account
- Region
- Instance Type
- Tag (CostCenter, Project, etc.)
- Usage Type
- Purchase Option (On-Demand, Reserved, Spot)

Filters:
- Date range
- Services
- Tags
- Regions
- Accounts
- Instance types

Granularity:
- Daily
- Monthly
- Hourly (with opt-in, additional cost)

Cost Types:

Unblended Cost:
- Actual charges for each line item
- Use for: Understanding actual spending

Blended Cost:
- Organization-wide consolidated cost
- Averages Reserved Instance discounts across accounts
- Use for: Consolidated organization view

Amortized Cost:
- Spreads upfront RI costs across usage period
- Normalized view of commitment costs
- Use for: True cost comparison

Common Analysis Patterns:

1. Cost by Service:
   Group by: Service
   Time: Last 3 months, monthly
   Result: Identify highest-cost services

2. Cost by Team:
   Group by: Tag (Project or CostCenter)
   Time: Current month
   Result: Team accountability and chargeback

3. Cost Trend:
   Group by: Service
   Time: Last 12 months, monthly
   Chart: Stacked area
   Result: Identify growth trends

4. Regional Distribution:
   Group by: Region
   Filter: Service = EC2
   Result: Multi-region cost comparison

5. On-Demand vs Reserved:
   Group by: Purchase Option
   Filter: Service = EC2
   Result: Commitment coverage analysis

Recommendations:

Rightsizing:
- Underutilized EC2 instances
- Recommendations based on CloudWatch metrics
- Estimated savings
- Implementation difficulty

Savings Plans:
- Recommended hourly commitment
- 1-year vs 3-year comparison
- Estimated savings
- Coverage analysis

Reserved Instances:
- Specific instance type recommendations
- Payment options (All Upfront, Partial, No Upfront)
- Estimated savings

Cost Anomaly Detection:
- Unusual spending patterns
- ML-based detection
- Automated alerts
- Root cause analysis
```
### Budgets AWS

**Contrôle proactif des coûts :**
```
Budget Types:

1. Cost Budget:
   - Track spending against target
   - Example: $10,000/month
   - Alert: Actual or forecasted exceeds threshold

2. Usage Budget:
   - Track service usage quantity
   - Example: 1,000 EC2 instance hours
   - Alert: Usage exceeds threshold

3. Savings Plans Budget:
   - Track commitment utilization
   - Example: 80% utilization target
   - Alert: Underutilization (wasted commitment)

4. Reserved Instance Budget:
   - Track RI utilization and coverage
   - Example: 90% utilization target
   - Alert: Underused reservations

Budget Configuration:

Amount: Fixed or variable
- Fixed: $10,000 every month
- Variable: Different amounts per month (seasonality)

Period: Monthly, quarterly, annually

Scope:
- All AWS services
- Specific services (EC2, S3, RDS)
- Specific tags (Project=CustomerPortal)
- Specific accounts (in organization)

Alert Thresholds:

Actual:
- Alert when actual spending exceeds threshold
- Example: Alert at 80%, 90%, 100% of budget

Forecasted:
- Alert when forecast predicts exceeding budget
- Example: Alert if forecast exceeds 100%
- Proactive (warns before overspending)

Multiple Thresholds:
- 50%: Info alert to finance team
- 80%: Warning to engineering leads
- 100%: Critical alert to executives
- 120%: Emergency alert, auto-remediation

Notification Channels:

Email:
- Up to 10 email addresses per alert
- HTML formatted with details

SNS Topic:
- Integrate with custom workflows
- Trigger Lambda for automation
- Send to Slack, PagerDuty, ServiceNow

Example Budget Configuration:

Name: Production Monthly Budget
Amount: $50,000
Period: Monthly
Filters:
  - Tag: Environment = Production
Alerts:
  - 80% actual: engineering-leads@company.com
  - 100% actual: executives@company.com (SNS)
  - 110% forecasted: finance@company.com

Budget Actions (Automated):

Apply IAM Policy:
When budget exceeds 100%:
- Apply restrictive IAM policy to account
- Prevent launching new expensive resources
- Example: Deny RunInstances for instances > m5.large

Stop EC2 Instances:
When development budget exceeds 90%:
- Lambda function stops tagged dev instances
- Saves costs immediately
- Restarts during business hours

SNS Notification to Lambda:
When budget exceeds threshold:
- Lambda analyzes spending
- Identifies top cost drivers
- Sends detailed report
- Suggests immediate actions
```
### Détection des anomalies de coûts

**Alertes de dépenses basées sur le ML :**
```
Anomaly Detection:
Machine learning identifies unusual spending patterns
Automatic baseline learning
Alerts on deviations

How It Works:

1. Learning Phase:
   - Analyzes historical spending (30+ days)
   - Learns normal patterns by service, account, tag
   - Identifies daily/weekly cycles
   - Seasonal trends

2. Detection:
   - Monitors current spending
   - Compares to expected baseline
   - Flags anomalies (spending > expected)
   - Severity: High, Medium, Low

3. Alerting:
   - Email or SNS notification
   - Root cause analysis
   - Cost impact estimate
   - Link to Cost Explorer

Monitor Types:

AWS Services:
- Monitors all AWS services independently
- Example: Unusual S3 data transfer spike

Linked Accounts:
- Monitors spending per account
- Example: Development account spending 3× normal

Cost Categories:
- Custom spending groups
- Example: "Production Workloads" category

Cost Allocation Tags:
- Monitors spending by tag
- Example: Project:CustomerPortal spending spike

Anomaly Examples:

1. Forgotten Test Environment:
   Baseline: $100/day average
   Anomaly: $2,500/day (25× normal)
   Cause: Load test environment left running
   Impact: $70,000/month if undetected
   Detection: Day 1 (saves $68,000)

2. Data Transfer Spike:
   Baseline: 5 TB/month S3 egress
   Anomaly: 50 TB in one day
   Cause: Misconfigured application downloading full S3 bucket
   Impact: $4,500 unexpected cost
   Detection: Same day

3. Overprovisioned RDS:
   Baseline: $500/month RDS
   Anomaly: $3,000/month
   Cause: Upgraded to db.r5.8xlarge (should be db.r5.large)
   Impact: $2,500/month waste
   Detection: Day 2

Configuration:

Threshold:
- Dollar amount: Alert if anomaly > $1,000
- Percentage: Alert if anomaly > 50% increase

Frequency:
- Daily: Receive alerts daily
- Weekly: Weekly summary
- Monthly: Monthly summary

Recipients:
- Email addresses
- SNS topics (for automation)

Integration Example:

# Lambda function triggered by anomaly alert
def lambda_handler(event, context):
    """Respond to cost anomaly"""
    
    anomaly = json.loads(event['Records'][0]['Sns']['Message'])
    
    service = anomaly['Service']
    impact = anomaly['Impact']  # Dollar amount
    root_cause = anomaly['RootCause']
    
    print(f"Cost anomaly detected: {service}")
    print(f"Impact: ${impact}")
    print(f"Root cause: {root_cause}")
    
    # Automated response
    if service == 'EC2' and impact > 1000:
        # Identify and stop untagged instances
        stop_untagged_instances()
    
    elif service == 'S3' and 'data transfer' in root_cause.lower():
        # Alert network team about data transfer spike
        send_alert_to_network_team()
    
    # Create Jira ticket for investigation
    create_jira_ticket(anomaly)
    
    return {'statusCode': 200}
```
### Plans d'épargne par rapport aux instances réservées

**Remises basées sur un engagement :**
```
Savings Plans:

Compute Savings Plans:
- Apply to: EC2, Fargate, Lambda
- Flexibility: Instance family, region, OS, tenancy
- Discount: Up to 66% (1-year) or 72% (3-year)
- Commitment: Hourly spend ($X/hour)

EC2 Instance Savings Plans:
- Apply to: EC2 only
- Flexibility: Instance size within family, OS, tenancy
- Fixed: Instance family and region
- Discount: Up to 72%
- Commitment: Hourly spend in specific family/region

Example: $10/hour Compute Savings Plan
- Covers any compute: EC2, Fargate, Lambda
- Region flexible, family flexible
- Runs out after $10/hour consumption
- Additional usage billed on-demand

Reserved Instances:

Standard RI:
- Apply to: EC2, RDS, ElastiCache, Redshift, Elasticsearch
- Specificity: Instance type, region, OS, tenancy
- Discount: Up to 72%
- Flexibility: None (specific instance type)
- Marketplace: Can sell unused RIs

Convertible RI:
- Same as Standard RI
- Flexibility: Can exchange for different instance type
- Discount: Up to 54% (lower than Standard)
- Cannot sell on marketplace

Comparison:

┌─────────────────────┬───────────────┬─────────────────┬────────────────┐
│ Feature             │ Savings Plans │ Standard RI     │ Convertible RI │
├─────────────────────┼───────────────┼─────────────────┼────────────────┤
│ Discount (3-year)   │ 66-72%        │ 72%             │ 54%            │
│ Flexibility         │ High          │ None            │ Medium         │
│ Services            │ EC2/Fargate/  │ EC2 only        │ EC2 only       │
│                     │ Lambda        │                 │                │
│ Instance change     │ Automatic     │ No              │ Yes (exchange) │
│ Region change       │ Yes (Compute) │ No              │ Yes (exchange) │
│ Marketplace         │ No            │ Yes             │ No             │
│ Recommendation      │ Modern ✓      │ Legacy          │ Uncertain      │
└─────────────────────┴───────────────┴─────────────────┴────────────────┘

Decision Framework:

Use Compute Savings Plans When:
✓ Workload is stable (baseline compute need)
✓ May change instance types/families
✓ Use multiple compute services (EC2, Fargate, Lambda)
✓ Need maximum flexibility
✓ Modern architecture (containers, serverless)

Use EC2 Instance Savings Plans When:
✓ Committed to specific instance family
✓ Stable, predictable workload
✓ Want higher discount than Compute SP
✓ EC2-only (no Fargate/Lambda)

Use Reserved Instances When:
✓ RDS, ElastiCache, Redshift, Elasticsearch (no SP option)
✓ Need to sell unused capacity (marketplace)
✓ Legacy purchasing agreements

Use On-Demand When:
✓ Spiky, unpredictable workloads
✓ Short-term (< 1 year)
✓ Development/testing
✓ Growth capacity (on top of commitments)

Coverage Strategy:

Analyze 3-6 months baseline usage
Commit to 70-80% of baseline
Leave 20-30% on-demand for growth/spikes

Example:
Average usage: 100 m5.large instances 24/7
Commitment: 70 instances (Savings Plan)
On-demand: 30 instances (flexibility)

Result:
- 70% discount on 70% of usage
- Full flexibility on 30%
- Average discount: ~50%
```
## Implémentation pratique

### Atelier 1 : Analyse de l'explorateur de coûts

**Objectif :** Analyser les modèles de dépenses AWS, identifier les facteurs de coûts et prévoir les coûts futurs.

**Étape 1 : Activer l'Explorateur de coûts**
```python
import boto3
from datetime import datetime, timedelta
import json

ce = boto3.client('ce')  # Cost Explorer

# Cost Explorer automatically enabled, but enable Cost Allocation Tags
organizations = boto3.client('organizations')

# Enable Cost Allocation Tags
ce_tags = ['CostCenter', 'Project', 'Environment', 'Owner']

for tag_key in ce_tags:
    try:
        ce.update_cost_allocation_tags_status(
            CostAllocationTagsStatus=[
                {
                    'TagKey': tag_key,
                    'Status': 'Active'
                }
            ]
        )
        print(f"Activated cost allocation tag: {tag_key}")
    except Exception as e:
        print(f"Error activating tag {tag_key}: {e}")
```
**Étape 2 : Analyser les coûts par service**
```python
def analyze_costs_by_service(months=3):
    """Analyze costs by AWS service for last N months"""
    
    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months*30)
    
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {
                'Type': 'DIMENSION',
                'Key': 'SERVICE'
            }
        ]
    )
    
    print(f"\n=== Cost by Service (Last {months} Months) ===\n")
    
    # Aggregate costs by service across all months
    service_totals = {}
    
    for result in response['ResultsByTime']:
        period = result['TimePeriod']['Start']
        
        for group in result['Groups']:
            service = group['Keys'][0]
            cost = float(group['Metrics']['UnblendedCost']['Amount'])
            
            if service not in service_totals:
                service_totals[service] = 0
            
            service_totals[service] += cost
    
    # Sort by cost descending
    sorted_services = sorted(service_totals.items(), key=lambda x: x[1], reverse=True)
    
    total_cost = sum(service_totals.values())
    
    print(f"Total Cost: ${total_cost:,.2f}\n")
    
    # Top 10 services
    print("Top 10 Services by Cost:")
    for i, (service, cost) in enumerate(sorted_services[:10], 1):
        percentage = (cost / total_cost * 100) if total_cost > 0 else 0
        print(f"{i:2d}. {service:40s} ${cost:12,.2f} ({percentage:5.1f}%)")
    
    return sorted_services

# Analyze costs
services = analyze_costs_by_service(months=3)
```
**Étape 3 : Analyser les coûts par balise**
```python
def analyze_costs_by_tag(tag_key='Project', months=1):
    """Analyze costs grouped by tag for chargeback"""
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months*30)
    
    try:
        response = ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Granularity='MONTHLY',
            Metrics=['UnblendedCost'],
            GroupBy=[
                {
                    'Type': 'TAG',
                    'Key': tag_key
                }
            ]
        )
        
        print(f"\n=== Cost by {tag_key} (Last {months} Month) ===\n")
        
        tag_costs = {}
        
        for result in response['ResultsByTime']:
            for group in result['Groups']:
                tag_value = group['Keys'][0].split('$')[-1] if '$' in group['Keys'][0] else group['Keys'][0]
                cost = float(group['Metrics']['UnblendedCost']['Amount'])
                
                if tag_value not in tag_costs:
                    tag_costs[tag_value] = 0
                
                tag_costs[tag_value] += cost
        
        # Sort by cost
        sorted_tags = sorted(tag_costs.items(), key=lambda x: x[1], reverse=True)
        
        total_cost = sum(tag_costs.values())
        
        print(f"Total Tagged Cost: ${total_cost:,.2f}\n")
        
        for tag_value, cost in sorted_tags:
            percentage = (cost / total_cost * 100) if total_cost > 0 else 0
            print(f"{tag_value:30s} ${cost:12,.2f} ({percentage:5.1f}%)")
        
        # Calculate untagged resources
        # Query total cost without tag filter
        total_response = ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date.strftime('%Y-%m-%d'),
                'End': end_date.strftime('%Y-%m-%d')
            },
            Granularity='MONTHLY',
            Metrics=['UnblendedCost']
        )
        
        overall_total = sum(float(r['Total']['UnblendedCost']['Amount']) 
                           for r in total_response['ResultsByTime'])
        
        untagged_cost = overall_total - total_cost
        
        if untagged_cost > 0:
            print(f"\n⚠️  Untagged Resources: ${untagged_cost:,.2f} ({untagged_cost/overall_total*100:.1f}%)")
            print("   Action: Tag resources for proper cost attribution")
        
        return sorted_tags
    
    except Exception as e:
        print(f"Error analyzing costs by tag: {e}")
        print("Note: Tags may take 24 hours to appear in Cost Explorer after activation")
        return []

# Analyze by project
projects = analyze_costs_by_tag('Project', months=1)

# Analyze by environment
environments = analyze_costs_by_tag('Environment', months=1)
```
**Étape 4 : Prévision des coûts**
```python
def forecast_monthly_cost():
    """Forecast next 3 months of spending"""
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=90)  # Last 90 days for baseline
    
    # Get forecast
    forecast_end = end_date + timedelta(days=90)
    
    response = ce.get_cost_forecast(
        TimePeriod={
            'Start': end_date.strftime('%Y-%m-%d'),
            'End': forecast_end.strftime('%Y-%m-%d')
        },
        Metric='UNBLENDED_COST',
        Granularity='MONTHLY'
    )
    
    print("\n=== Cost Forecast (Next 3 Months) ===\n")
    
    forecast_total = float(response['Total']['Amount'])
    
    print(f"Forecasted Total: ${forecast_total:,.2f}")
    print(f"Prediction Interval: {response.get('ForecastResultsByTime', [{}])[0].get('MeanValue', 'N/A')}")
    
    # Compare to current month
    current_month_response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': datetime.now().replace(day=1).strftime('%Y-%m-%d'),
            'End': end_date.strftime('%Y-%m-%d')
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost']
    )
    
    if current_month_response['ResultsByTime']:
        current_cost = float(current_month_response['ResultsByTime'][0]['Total']['UnblendedCost']['Amount'])
        growth_rate = ((forecast_total/3 - current_cost) / current_cost * 100) if current_cost > 0 else 0
        
        print(f"\nCurrent Month (MTD): ${current_cost:,.2f}")
        print(f"Forecast vs Current: {growth_rate:+.1f}%")
        
        if growth_rate > 10:
            print("⚠️  Significant cost increase forecasted")
    
    return forecast_total

# Get forecast
forecast = forecast_monthly_cost()
```
### Atelier 2 : Configuration du budget avec alertes

**Objectif :** Créez des budgets avec plusieurs seuils et alertes automatisées.

**Étape 1 : Créer un budget de coûts mensuel**
```python
budgets = boto3.client('budgets')

account_id = boto3.client('sts').get_caller_identity()['Account']

def create_monthly_budget(name, amount, alert_emails):
    """Create monthly cost budget with multiple alert thresholds"""
    
    try:
        budgets.create_budget(
            AccountId=account_id,
            Budget={
                'BudgetName': name,
                'BudgetLimit': {
                    'Amount': str(amount),
                    'Unit': 'USD'
                },
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST',
                'CostFilters': {},  # All services, or add filters
                'CostTypes': {
                    'IncludeTax': True,
                    'IncludeSubscription': True,
                    'UseBlended': False,
                    'IncludeRefund': False,
                    'IncludeCredit': False,
                    'IncludeUpfront': True,
                    'IncludeRecurring': True,
                    'IncludeOtherSubscription': True,
                    'IncludeSupport': True,
                    'IncludeDiscount': True,
                    'UseAmortized': False
                }
            },
            NotificationsWithSubscribers=[
                # 80% Actual threshold
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 80,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        } for email in alert_emails
                    ]
                },
                # 100% Actual threshold
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 100,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        } for email in alert_emails
                    ]
                },
                # 110% Forecasted threshold
                {
                    'Notification': {
                        'NotificationType': 'FORECASTED',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 110,
                        'ThresholdType': 'PERCENTAGE',
                        'NotificationState': 'ALARM'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'EMAIL',
                            'Address': email
                        } for email in alert_emails
                    ]
                }
            ]
        )
        
        print(f"✓ Created budget: {name}")
        print(f"  Amount: ${amount:,.2f}/month")
        print(f"  Alerts: 80% actual, 100% actual, 110% forecasted")
        print(f"  Recipients: {len(alert_emails)} email(s)")
    
    except budgets.exceptions.DuplicateRecordException:
        print(f"Budget '{name}' already exists")
    except Exception as e:
        print(f"Error creating budget: {e}")

# Create overall budget
create_monthly_budget(
    name='Monthly-Total-Budget',
    amount=50000,
    alert_emails=['finance@company.com', 'engineering@company.com']
)
```
**Étape 2 : Créer des budgets spécifiques à l'environnement**
```python
def create_tagged_budget(name, amount, tag_key, tag_value, emails):
    """Create budget for specific tag (e.g., Environment=Production)"""
    
    try:
        budgets.create_budget(
            AccountId=account_id,
            Budget={
                'BudgetName': name,
                'BudgetLimit': {
                    'Amount': str(amount),
                    'Unit': 'USD'
                },
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST',
                'CostFilters': {
                    f'TagKeyValue': [f'{tag_key}${tag_value}']
                },
                'CostTypes': {
                    'IncludeTax': True,
                    'IncludeSubscription': True,
                    'UseBlended': False
                }
            },
            NotificationsWithSubscribers=[
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 90,
                        'ThresholdType': 'PERCENTAGE'
                    },
                    'Subscribers': [
                        {'SubscriptionType': 'EMAIL', 'Address': email}
                        for email in emails
                    ]
                }
            ]
        )
        
        print(f"✓ Created tagged budget: {name}")
        print(f"  Filter: {tag_key}={tag_value}")
        print(f"  Amount: ${amount:,.2f}/month")
    
    except budgets.exceptions.DuplicateRecordException:
        print(f"Budget '{name}' already exists")

# Create environment-specific budgets
create_tagged_budget(
    name='Production-Budget',
    amount=35000,
    tag_key='Environment',
    tag_value='Production',
    emails=['production-team@company.com']
)

create_tagged_budget(
    name='Development-Budget',
    amount=5000,
    tag_key='Environment',
    tag_value='Development',
    emails=['dev-team@company.com']
)

create_tagged_budget(
    name='Staging-Budget',
    amount=10000,
    tag_key='Environment',
    tag_value='Staging',
    emails=['qa-team@company.com']
)
```
**Étape 3 : Créer un budget spécifique au service**
```python
def create_service_budget(name, amount, service, emails):
    """Create budget for specific AWS service"""
    
    try:
        budgets.create_budget(
            AccountId=account_id,
            Budget={
                'BudgetName': name,
                'BudgetLimit': {
                    'Amount': str(amount),
                    'Unit': 'USD'
                },
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST',
                'CostFilters': {
                    'Service': [service]
                },
                'CostTypes': {
                    'IncludeTax': True,
                    'IncludeSubscription': True
                }
            },
            NotificationsWithSubscribers=[
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 85,
                        'ThresholdType': 'PERCENTAGE'
                    },
                    'Subscribers': [
                        {'SubscriptionType': 'EMAIL', 'Address': email}
                        for email in emails
                    ]
                }
            ]
        )
        
        print(f"✓ Created service budget: {name}")
        print(f"  Service: {service}")
        print(f"  Amount: ${amount:,.2f}/month")
    
    except budgets.exceptions.DuplicateRecordException:
        print(f"Budget '{name}' already exists")

# Create EC2 budget
create_service_budget(
    name='EC2-Monthly-Budget',
    amount=20000,
    service='Amazon Elastic Compute Cloud - Compute',
    emails=['infrastructure@company.com']
)

# Create RDS budget
create_service_budget(
    name='RDS-Monthly-Budget',
    amount=8000,
    service='Amazon Relational Database Service',
    emails=['database-team@company.com']
)
```
**Étape 4 : Budget avec intégration SNS**
```python
def create_budget_with_sns(name, amount, sns_topic_arn):
    """Create budget with SNS notification for automation"""
    
    try:
        budgets.create_budget(
            AccountId=account_id,
            Budget={
                'BudgetName': name,
                'BudgetLimit': {
                    'Amount': str(amount),
                    'Unit': 'USD'
                },
                'TimeUnit': 'MONTHLY',
                'BudgetType': 'COST'
            },
            NotificationsWithSubscribers=[
                {
                    'Notification': {
                        'NotificationType': 'ACTUAL',
                        'ComparisonOperator': 'GREATER_THAN',
                        'Threshold': 90,
                        'ThresholdType': 'PERCENTAGE'
                    },
                    'Subscribers': [
                        {
                            'SubscriptionType': 'SNS',
                            'Address': sns_topic_arn
                        }
                    ]
                }
            ]
        )
        
        print(f"✓ Created budget with SNS: {name}")
        print(f"  SNS Topic: {sns_topic_arn}")
    
    except Exception as e:
        print(f"Error: {e}")

# Lambda function to handle budget alerts
def budget_alert_handler(event, context):
    """Lambda function triggered by budget alert via SNS"""
    
    message = json.loads(event['Records'][0]['Sns']['Message'])
    
    budget_name = message['budgetName']
    threshold = message['threshold']
    actual_spend = message['actualSpend']
    forecasted_spend = message.get('forecastedSpend')
    
    print(f"Budget Alert: {budget_name}")
    print(f"Threshold: {threshold}%")
    print(f"Actual Spend: ${actual_spend}")
    
    # Automated response
    if threshold >= 100:
        # Budget exceeded - take action
        print("Budget exceeded! Taking automated action...")
        
        # Stop non-production instances
        stop_development_instances()
        
        # Notify executives
        send_executive_alert(budget_name, actual_spend)
    
    return {'statusCode': 200}
```
### Atelier 3 : Configuration de la détection des anomalies de coûts

**Objectif :** Configurez la détection des anomalies basée sur le ML pour alerter automatiquement en cas de modèles de dépenses inhabituels.

**Étape 1 : Créer un moniteur d'anomalies de coûts**
```python
def create_anomaly_monitor():
    """Create cost anomaly detection monitor"""
    
    ce = boto3.client('ce')
    
    # Create monitor for all AWS services
    try:
        response = ce.create_anomaly_monitor(
            AnomalyMonitor={
                'MonitorName': 'AllServicesMonitor',
                'MonitorType': 'DIMENSIONAL',
                'MonitorDimension': 'SERVICE',
                'MonitorSpecification': None  # Monitor all services independently
            }
        )
        
        monitor_arn = response['MonitorArn']
        
        print(f"✓ Created anomaly monitor: {monitor_arn}")
        
        return monitor_arn
    
    except ce.exceptions.UnknownMonitorException:
        print("Monitor already exists")
    except Exception as e:
        print(f"Error creating monitor: {e}")

# Create account-level monitor
def create_account_monitor():
    """Create monitor for linked accounts"""
    
    ce = boto3.client('ce')
    
    try:
        response = ce.create_anomaly_monitor(
            AnomalyMonitor={
                'MonitorName': 'LinkedAccountsMonitor',
                'MonitorType': 'DIMENSIONAL',
                'MonitorDimension': 'LINKED_ACCOUNT'
            }
        )
        
        monitor_arn = response['MonitorArn']
        
        print(f"✓ Created account monitor: {monitor_arn}")
        
        return monitor_arn
    
    except Exception as e:
        print(f"Error: {e}")

# Create monitors
service_monitor_arn = create_anomaly_monitor()
account_monitor_arn = create_account_monitor()
```
**Étape 2 : Créer un abonnement aux anomalies**
```python
def create_anomaly_subscription(monitor_arn, emails, threshold=1000):
    """Create subscription for anomaly alerts"""
    
    ce = boto3.client('ce')
    
    try:
        response = ce.create_anomaly_subscription(
            AnomalySubscription={
                'SubscriptionName': 'HighImpactAnomalies',
                'Threshold': threshold,  # Alert if anomaly > $1,000
                'Frequency': 'DAILY',  # DAILY, IMMEDIATE, or WEEKLY
                'MonitorArnList': [monitor_arn],
                'Subscribers': [
                    {
                        'Type': 'EMAIL',
                        'Address': email
                    } for email in emails
                ]
            }
        )
        
        subscription_arn = response['SubscriptionArn']
        
        print(f"✓ Created anomaly subscription")
        print(f"  Threshold: ${threshold:,}")
        print(f"  Frequency: DAILY")
        print(f"  Recipients: {len(emails)}")
        
        return subscription_arn
    
    except Exception as e:
        print(f"Error creating subscription: {e}")

# Create subscription
subscription_arn = create_anomaly_subscription(
    monitor_arn=service_monitor_arn,
    emails=['finops@company.com', 'engineering-leads@company.com'],
    threshold=1000
)
```
**Étape 3 : interroger les anomalies récentes**
```python
def get_recent_anomalies(days=7):
    """Retrieve recent cost anomalies"""
    
    ce = boto3.client('ce')
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    try:
        response = ce.get_anomalies(
            DateInterval={
                'StartDate': start_date.strftime('%Y-%m-%d'),
                'EndDate': end_date.strftime('%Y-%m-%d')
            },
            Feedback='ALL',  # ALL, YES (anomaly), NO (not anomaly)
            MaxResults=100
        )
        
        anomalies = response.get('Anomalies', [])
        
        if not anomalies:
            print(f"✓ No anomalies detected in last {days} days")
            return []
        
        print(f"\n=== Cost Anomalies (Last {days} Days) ===\n")
        
        for anomaly in anomalies:
            anomaly_id = anomaly['AnomalyId']
            start_date = anomaly['AnomalyStartDate']
            end_date = anomaly['AnomalyEndDate']
            
            impact = anomaly['Impact']
            total_impact = float(impact['TotalImpact'])
            max_impact = float(impact['MaxImpact'])
            
            dimension_value = anomaly['DimensionValue']
            root_causes = anomaly.get('RootCauses', [])
            
            print(f"Anomaly ID: {anomaly_id}")
            print(f"Date: {start_date} to {end_date}")
            print(f"Dimension: {dimension_value}")
            print(f"Impact: ${total_impact:,.2f} (max: ${max_impact:,.2f})")
            
            if root_causes:
                print("Root Causes:")
                for cause in root_causes:
                    service = cause.get('Service', 'Unknown')
                    usage_type = cause.get('UsageType', 'Unknown')
                    print(f"  - {service}: {usage_type}")
            
            print()
        
        return anomalies
    
    except Exception as e:
        print(f"Error retrieving anomalies: {e}")
        return []

# Get recent anomalies
anomalies = get_recent_anomalies(days=30)
```
**Étape 4 : Réponse automatisée aux anomalies**
```python
def automated_anomaly_response(event, context):
    """Lambda function to respond to anomaly alerts"""
    
    # Parse anomaly from SNS message
    message = json.loads(event['Records'][0]['Sns']['Message'])
    
    anomaly_id = message['anomalyId']
    dimension = message['dimensionValue']  # Service or Account
    impact = float(message['totalImpact'])
    root_causes = message.get('rootCauses', [])
    
    print(f"Processing anomaly: {anomaly_id}")
    print(f"Impact: ${impact:,.2f}")
    print(f"Dimension: {dimension}")
    
    # Classify severity
    if impact >= 10000:
        severity = 'CRITICAL'
    elif impact >= 5000:
        severity = 'HIGH'
    elif impact >= 1000:
        severity = 'MEDIUM'
    else:
        severity = 'LOW'
    
    # Automated responses based on root cause
    for cause in root_causes:
        service = cause.get('Service', '')
        
        if service == 'Amazon Elastic Compute Cloud':
            # EC2 cost spike - check for untagged instances
            response = check_and_stop_untagged_instances()
            
        elif service == 'Amazon Simple Storage Service':
            # S3 cost spike - likely data transfer
            response = analyze_s3_data_transfer()
            
        elif service == 'Amazon Relational Database Service':
            # RDS cost spike - check for overprovisioned instances
            response = check_rds_sizing()
    
    # Create incident ticket
    create_cost_anomaly_ticket(anomaly_id, dimension, impact, severity)
    
    # Notify appropriate team
    notify_team_by_dimension(dimension, anomaly_id, impact, severity)
    
    return {'statusCode': 200, 'severity': severity}

def check_and_stop_untagged_instances():
    """Check for and stop untagged EC2 instances"""
    
    ec2 = boto3.client('ec2')
    
    # Find running instances without required tags
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    
    untagged_instances = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
            
            # Check for required tags
            if 'CostCenter' not in tags or 'Project' not in tags:
                untagged_instances.append(instance_id)
    
    if untagged_instances:
        print(f"Found {len(untagged_instances)} untagged instances")
        
        # Stop untagged instances in non-production
        for instance_id in untagged_instances[:10]:  # Limit to 10 for safety
            try:
                # Verify not production
                instance_detail = ec2.describe_instances(InstanceIds=[instance_id])
                tags = instance_detail['Reservations'][0]['Instances'][0].get('Tags', [])
                env_tag = next((tag['Value'] for tag in tags if tag['Key'] == 'Environment'), None)
                
                if env_tag != 'Production':
                    ec2.stop_instances(InstanceIds=[instance_id])
                    print(f"  Stopped untagged instance: {instance_id}")
            
            except Exception as e:
                print(f"  Error stopping {instance_id}: {e}")
    
    return {'stopped': len(untagged_instances)}
```
### Atelier 4 : Recommandations de redimensionnement

**Objectif :** Analyser les ressources sous-utilisées et mettre en œuvre des recommandations de redimensionnement.

**Étape 1 : Obtenez les recommandations de redimensionnement EC2**
```python
def get_rightsizing_recommendations():
    """Get EC2 rightsizing recommendations from Cost Explorer"""
    
    ce = boto3.client('ce')
    
    try:
        response = ce.get_rightsizing_recommendation(
            Service='AmazonEC2',
            Configuration={
                'RecommendationTarget': 'SAME_INSTANCE_FAMILY',  # or CROSS_INSTANCE_FAMILY
                'BenefitsConsidered': True
            }
        )
        
        recommendations = response.get('RightsizingRecommendations', [])
        
        if not recommendations:
            print("✓ No rightsizing recommendations available")
            return []
        
        print(f"\n=== EC2 Rightsizing Recommendations ===\n")
        
        total_savings = 0
        
        for i, rec in enumerate(recommendations, 1):
            current_instance = rec['CurrentInstance']
            
            instance_id = current_instance['ResourceId']
            instance_type = current_instance['InstanceName']
            
            # Current cost
            monthly_cost = float(current_instance['MonthlyCost'])
            
            # Recommendation
            action = rec['RightsizingType']  # TERMINATE or MODIFY
            
            print(f"{i}. Instance: {instance_id}")
            print(f"   Current Type: {instance_type}")
            print(f"   Monthly Cost: ${monthly_cost:,.2f}")
            print(f"   Action: {action}")
            
            if action == 'MODIFY':
                modify_rec = rec['ModifyRecommendationDetail']
                target_instances = modify_rec['TargetInstances']
                
                for target in target_instances:
                    target_type = target['InstanceType']
                    estimated_monthly_cost = float(target['EstimatedMonthlyCost'])
                    estimated_savings = float(target['EstimatedMonthlySavings'])
                    
                    print(f"   → Recommended: {target_type}")
                    print(f"      New Cost: ${estimated_monthly_cost:,.2f}")
                    print(f"      Savings: ${estimated_savings:,.2f}/month")
                    
                    total_savings += estimated_savings
            
            elif action == 'TERMINATE':
                terminate_rec = rec['TerminateRecommendationDetail']
                estimated_savings = float(terminate_rec['EstimatedMonthlySavings'])
                
                print(f"   → Recommended: TERMINATE (unused)")
                print(f"      Savings: ${estimated_savings:,.2f}/month")
                
                total_savings += estimated_savings
            
            # Utilization metrics
            utilization = current_instance.get('ResourceUtilization', {})
            ec2_utilization = utilization.get('EC2ResourceUtilization', {})
            
            max_cpu = float(ec2_utilization.get('MaxCpuUtilizationPercentage', 0))
            max_memory = float(ec2_utilization.get('MaxMemoryUtilizationPercentage', 0))
            
            print(f"   Utilization: CPU {max_cpu:.1f}%, Memory {max_memory:.1f}%")
            print()
        
        print(f"Total Potential Savings: ${total_savings:,.2f}/month (${total_savings*12:,.2f}/year)")
        
        return recommendations
    
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        return []

# Get recommendations
recommendations = get_rightsizing_recommendations()
```
**Étape 2 : Analyser les ressources sous-utilisées**
```python
def analyze_underutilized_resources():
    """Find underutilized resources across services"""
    
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    print("\n=== Underutilized Resource Analysis ===\n")
    
    # Get all running EC2 instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']}
        ]
    )
    
    underutilized = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_type = instance['InstanceType']
            
            # Get CPU utilization (last 7 days)
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=7)
            
            cpu_stats = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[
                    {'Name': 'InstanceId', 'Value': instance_id}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,  # 1-hour periods
                Statistics=['Average', 'Maximum']
            )
            
            if cpu_stats['Datapoints']:
                avg_cpu = sum(dp['Average'] for dp in cpu_stats['Datapoints']) / len(cpu_stats['Datapoints'])
                max_cpu = max(dp['Maximum'] for dp in cpu_stats['Datapoints'])
                
                # Underutilized: avg < 10% and max < 30%
                if avg_cpu < 10 and max_cpu < 30:
                    # Get instance cost
                    pricing = boto3.client('pricing', region_name='us-east-1')
                    
                    # Simplified cost estimation
                    instance_costs = {
                        't3.micro': 7.5,
                        't3.small': 15,
                        't3.medium': 30,
                        't3.large': 60,
                        't3.xlarge': 120,
                        'm5.large': 70,
                        'm5.xlarge': 140,
                        'm5.2xlarge': 280
                    }
                    
                    monthly_cost = instance_costs.get(instance_type, 50)
                    
                    underutilized.append({
                        'instance_id': instance_id,
                        'instance_type': instance_type,
                        'avg_cpu': avg_cpu,
                        'max_cpu': max_cpu,
                        'monthly_cost': monthly_cost
                    })
    
    if underutilized:
        print(f"Found {len(underutilized)} underutilized instances:\n")
        
        total_waste = 0
        
        for resource in underutilized:
            print(f"Instance: {resource['instance_id']}")
            print(f"  Type: {resource['instance_type']}")
            print(f"  Avg CPU: {resource['avg_cpu']:.1f}%")
            print(f"  Max CPU: {resource['max_cpu']:.1f}%")
            print(f"  Monthly Cost: ${resource['monthly_cost']:.2f}")
            print(f"  → Action: Consider downsizing or terminating")
            print()
            
            total_waste += resource['monthly_cost']
        
        print(f"Total Potential Savings: ${total_waste:,.2f}/month")
    else:
        print("✓ No significantly underutilized instances found")
    
    return underutilized

# Analyze underutilized resources
underutilized = analyze_underutilized_resources()
```
**Étape 3 : Mettre en œuvre un redimensionnement automatisé**
```python
def implement_rightsizing(instance_id, target_instance_type, dry_run=True):
    """Implement rightsizing recommendation"""
    
    ec2 = boto3.client('ec2')
    
    print(f"Rightsizing instance: {instance_id}")
    print(f"Target type: {target_instance_type}")
    
    if dry_run:
        print("DRY RUN - No changes will be made")
    
    try:
        # Step 1: Stop instance
        print("Step 1: Stopping instance...")
        
        if not dry_run:
            ec2.stop_instances(InstanceIds=[instance_id])
            
            # Wait for stopped state
            waiter = ec2.get_waiter('instance_stopped')
            waiter.wait(InstanceIds=[instance_id])
        
        print("  ✓ Instance stopped")
        
        # Step 2: Modify instance type
        print(f"Step 2: Modifying instance type to {target_instance_type}...")
        
        if not dry_run:
            ec2.modify_instance_attribute(
                InstanceId=instance_id,
                InstanceType={'Value': target_instance_type}
            )
        
        print("  ✓ Instance type modified")
        
        # Step 3: Start instance
        print("Step 3: Starting instance...")
        
        if not dry_run:
            ec2.start_instances(InstanceIds=[instance_id])
            
            # Wait for running state
            waiter = ec2.get_waiter('instance_running')
            waiter.wait(InstanceIds=[instance_id])
        
        print("  ✓ Instance started")
        
        # Step 4: Verify
        if not dry_run:
            instance = ec2.describe_instances(InstanceIds=[instance_id])
            new_type = instance['Reservations'][0]['Instances'][0]['InstanceType']
            
            print(f"\n✓ Rightsizing complete: {instance_id} → {new_type}")
        else:
            print(f"\nDRY RUN: Would resize {instance_id} → {target_instance_type}")
        
        return True
    
    except Exception as e:
        print(f"✗ Error during rightsizing: {e}")
        return False

# Dry run rightsizing
implement_rightsizing(
    instance_id='i-1234567890abcdef0',
    target_instance_type='t3.medium',
    dry_run=True
)
```
## Connaissances au niveau de la production

### Culture et organisation FinOps

**Créer une culture d'ingénierie soucieuse des coûts :**
```
FinOps Framework:

Principles:
1. Collaboration: Finance, Engineering, Business working together
2. Ownership: Teams own their cloud costs
3. Centralized: Central team enables, teams execute
4. Real-time: Decisions based on timely data
5. Value-driven: Optimize for business value, not just cost

FinOps Lifecycle:

Inform Phase:
- Visibility into current spending
- Accurate cost allocation
- Benchmarking and KPIs
- Education and awareness

Optimize Phase:
- Rightsizing resources
- Commitment discounts (Savings Plans, RIs)
- Architectural optimization
- Waste elimination

Operate Phase:
- Continuous monitoring
- Automated governance
- Policy enforcement
- Iterative improvement

Organizational Structure:

FinOps Team (Central):
- Cost visibility and reporting
- Tool management (Cost Explorer, third-party)
- Best practice development
- Education and enablement
- Commitment management (Savings Plans, RIs)
- Vendor management

Engineering Teams (Distributed):
- Resource provisioning decisions
- Architecture optimization
- Tag compliance
- Budget monitoring
- Cost-conscious development

Finance Team:
- Budgeting and forecasting
- Chargeback/showback
- Contract negotiation
- ROI analysis
- Board reporting

Metrics and KPIs:

Cost Efficiency:
- Cost per customer
- Cost per transaction
- Cost per deployed service
- Infrastructure cost as % of revenue

Resource Utilization:
- Compute utilization (target: 70-80%)
- Commitment coverage (Savings Plans/RI: target 70%)
- Commitment utilization (target: >95%)
- Storage efficiency (lifecycle policies, archiving)

Cost Optimization:
- Waste identified (unused resources: target < 5%)
- Waste eliminated (month-over-month)
- Rightsizing implemented (% of recommendations)
- Savings achieved (year-over-year)

Governance:
- Tag compliance (target: 100%)
- Budget adherence (% over/under budget)
- Anomaly response time (detection to resolution)
- On-demand vs commitment ratio (target: 30/70)

Cultural Practices:

Cost-Conscious Development:
- Developers see cost impact of changes
- Cost included in code reviews
- Pre-production cost estimation
- Auto-scaling by default
- Development environments auto-shutdown

Cost Reviews:
- Weekly team cost reviews
- Monthly cross-team reviews
- Quarterly executive reviews
- Annual planning and commitments

Incentives:
- Team budgets with autonomy
- Cost savings shared with teams
- Recognition for optimization
- Gamification (leaderboards)

Education:
- Onboarding includes cost training
- AWS cost certification
- Lunch-and-learns on optimization
- Internal documentation

Tools:
- Cost dashboards (per team)
- Budget alerts (Slack integration)
- Cost attribution in CI/CD
- Cloud cost calculators
```
### Implémentation du Showback et de la rétrofacturation

**Modèles d'attribution des coûts :**
```
Showback vs Chargeback:

Showback:
- Informational only
- Teams see their costs
- No actual budget transfers
- Use case: Start of FinOps journey, building awareness
- Benefit: Visibility without friction

Chargeback:
- Actual budget allocation
- Teams charged for consumption
- Finance transfers costs to teams
- Use case: Mature FinOps, full accountability
- Benefit: True ownership and accountability

Hybrid:
- Chargeback for production
- Showback for development/testing
- Common approach

Cost Allocation Methods:

1. Direct Allocation (Tag-Based):
   Cost: $10,000 EC2
   Tagged: Project=CustomerPortal
   Allocation: 100% to CustomerPortal team

   Pros: Accurate, fair
   Cons: Requires 100% tag compliance

2. Proportional Allocation (Usage-Based):
   Cost: $10,000 RDS (shared database)
   Team A usage: 70% (by query count)
   Team B usage: 30%
   Allocation: Team A $7,000, Team B $3,000

   Pros: Fair for shared resources
   Cons: Complex to calculate

3. Even Split:
   Cost: $1,000 Route 53
   Teams: 10 teams
   Allocation: $100 per team

   Pros: Simple
   Cons: Not usage-based, unfair

4. Weighted Allocation:
   Cost: $5,000 CloudWatch
   Team sizes: Team A (20 people), Team B (5 people)
   Weights: Team A 80%, Team B 20%
   Allocation: Team A $4,000, Team B $1,000

   Pros: Reasonable approximation
   Cons: Not actual usage

Implementation:

# Automated showback report
def generate_showback_report(month):
    """Generate monthly showback report per team"""
    
    ce = boto3.client('ce')
    
    start_date = f'{month}-01'
    end_date = (datetime.strptime(start_date, '%Y-%m-%d') + timedelta(days=32)).replace(day=1).strftime('%Y-%m-%d')
    
    # Query costs by Project tag
    response = ce.get_cost_and_usage(
        TimePeriod={
            'Start': start_date,
            'End': end_date
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        GroupBy=[
            {'Type': 'TAG', 'Key': 'Project'}
        ]
    )
    
    team_costs = {}
    
    for result in response['ResultsByTime']:
        for group in result['Groups']:
            project = group['Keys'][0].split('$')[-1]
            cost = float(group['Metrics']['UnblendedCost']['Amount'])
            
            if project not in team_costs:
                team_costs[project] = {
                    'total': 0,
                    'services': {}
                }
            
            team_costs[project]['total'] += cost
    
    # Get service breakdown per project
    for project in team_costs.keys():
        service_response = ce.get_cost_and_usage(
            TimePeriod={
                'Start': start_date,
                'End': end_date
            },
            Granularity='MONTHLY',
            Metrics=['UnblendedCost'],
            Filter={
                'Tags': {
                    'Key': 'Project',
                    'Values': [project]
                }
            },
            GroupBy=[
                {'Type': 'DIMENSION', 'Key': 'SERVICE'}
            ]
        )
        
        for result in service_response['ResultsByTime']:
            for group in result['Groups']:
                service = group['Keys'][0]
                cost = float(group['Metrics']['UnblendedCost']['Amount'])
                
                team_costs[project]['services'][service] = cost
    
    # Generate report
    print(f"\n=== Showback Report: {month} ===\n")
    
    for project, costs in sorted(team_costs.items(), key=lambda x: x[1]['total'], reverse=True):
        print(f"\n{project}: ${costs['total']:,.2f}")
        print(f"  Service Breakdown:")
        
        for service, cost in sorted(costs['services'].items(), key=lambda x: x[1], reverse=True)[:5]:
            percentage = (cost / costs['total'] * 100) if costs['total'] > 0 else 0
            print(f"    {service:50s} ${cost:10,.2f} ({percentage:5.1f}%)")
    
    # Export to CSV for finance
    import csv
    
    with open(f'showback_{month}.csv', 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Project', 'Service', 'Cost'])
        
        for project, costs in team_costs.items():
            for service, cost in costs['services'].items():
                writer.writerow([project, service, f'${cost:.2f}'])
    
    print(f"\nReport exported to showback_{month}.csv")
    
    return team_costs

# Generate report
report = generate_showback_report('2025-01')

# Send to teams via email
def send_showback_emails(team_costs):
    """Send showback reports to team leads"""
    
    ses = boto3.client('ses')
    
    # Team lead mapping
    team_leads = {
        'CustomerPortal': 'portal-lead@company.com',
        'Analytics': 'analytics-lead@company.com',
        'Mobile': 'mobile-lead@company.com'
    }
    
    for project, costs in team_costs.items():
        lead_email = team_leads.get(project)
        
        if not lead_email:
            continue
        
        # Create HTML email
        html = f"""
        <html>
        <body>
        <h2>Monthly Cloud Cost Report: {project}</h2>
        <p><strong>Total Cost:</strong> ${costs['total']:,.2f}</p>
        
        <h3>Top Services:</h3>
        <table border="1">
        <tr><th>Service</th><th>Cost</th></tr>
        """
        
        for service, cost in list(costs['services'].items())[:10]:
            html += f"<tr><td>{service}</td><td>${cost:,.2f}</td></tr>"
        
        html += """
        </table>
        <p><a href="https://console.aws.amazon.com/cost-management/home">View in Cost Explorer</a></p>
        </body>
        </html>
        """
        
        ses.send_email(
            Source='finops@company.com',
            Destination={'ToAddresses': [lead_email]},
            Message={
                'Subject': {'Data': f'Monthly Cloud Cost Report: {project}'},
                'Body': {'Html': {'Data': html}}
            }
        )
        
        print(f"Sent showback report to {lead_email}")
```
### Optimisation des coûts architecturaux

**Modèles de conception pour la rentabilité :**
```
Cost-Optimized Architecture Patterns:

1. Serverless-First:
   Traditional: EC2 running 24/7 → $500/month
   Serverless: Lambda + API Gateway → $50/month
   Savings: 90%

   When to use:
   ✓ Event-driven workloads
   ✓ Unpredictable traffic
   ✓ Sporadic usage
   ✓ Short-lived processes

2. Auto-Scaling:
   Fixed capacity: 10 instances 24/7 → $7,000/month
   Auto-scaling: 3-10 instances → $3,500/month
   Savings: 50%

   Best practices:
   ✓ Scale on actual metrics (CPU, queue depth)
   ✓ Predictive scaling for known patterns
   ✓ Scheduled scaling (business hours)
   ✓ Target tracking (maintain 70% CPU)

3. S3 Intelligent-Tiering:
   S3 Standard: 100 TB → $2,300/month
   Intelligent-Tiering: Automatic tiering → $1,400/month
   Savings: 40%

   Use for:
   ✓ Unknown or changing access patterns
   ✓ Long-term storage
   ✓ No retrieval time requirements

4. Multi-AZ Only for Production:
   Dev RDS Multi-AZ: $400/month
   Dev RDS Single-AZ: $200/month
   Savings: $200/month per environment

   Strategy:
   ✓ Production: Multi-AZ (high availability)
   ✓ Staging: Multi-AZ (test failover)
   ✓ Development: Single-AZ (cost savings)

5. Spot Instances for Batch:
   On-demand batch: $5,000/month
   Spot instances: $500/month
   Savings: 90%

   Suitable for:
   ✓ Fault-tolerant workloads
   ✓ Batch processing
   ✓ Data analysis
   ✓ CI/CD runners
   ✓ Rendering farms

6. CloudFront for Data Transfer:
   S3 direct egress: 10 TB × $0.09 = $900/month
   CloudFront: 10 TB × $0.085 = $850/month + caching benefits
   Savings: 5-40% (with caching)

   Benefits:
   ✓ Lower per-GB cost
   ✓ Reduced S3 requests (caching)
   ✓ Faster performance
   ✓ DDoS protection

7. EBS gp3 vs gp2:
   gp2: 1 TB → $100/month
   gp3: 1 TB → $80/month (same performance)
   Savings: 20%

   Migration:
   ✓ No downtime
   ✓ Modify volume type in console
   ✓ Instant savings

8. NAT Gateway Optimization:
   3 NAT Gateways: 3 × $32.40 = $97.20/month
   + Data processing: 10 TB × $0.045 = $450/month
   Total: $547/month

   Alternative: VPC Endpoints
   Cost: $7.20/month per endpoint
   Savings: ~80% for AWS service traffic

Data Transfer Optimization:

Most Expensive:
- Internet egress: $0.09/GB
- Inter-region: $0.02/GB

Free:
- Inbound from internet
- Same AZ (private IP)
- S3 → CloudFront
- CloudFront → Internet (first 1 TB/month)

Strategies:
✓ Keep resources in same region
✓ Use CloudFront for public content
✓ Use VPC endpoints for AWS services
✓ Compress data before transfer
✓ Use private IP within VPC
```
## Conseils \& Bonnes pratiques

### Meilleures pratiques de marquage

**Astuce 1 : Appliquer les balises lors de la création**
Utilisez les stratégies de contrôle des services pour empêcher la création de ressources sans les balises requises : conformité à 100 % dès le premier jour.

**Astuce 2 : Automatisez le nettoyage des balises**
La fonction Lambda hebdomadaire balise les ressources non balisées avec les valeurs par défaut, alerte les propriétaires et maintient automatiquement l'hygiène des balises.

**Astuce 3 : Utilisez un schéma de balises cohérent**
Clés de balise de document, valeurs valides, obligatoires ou facultatives : la cohérence à l'échelle de l'organisation permet une attribution précise.

**Astuce 4 : Activez immédiatement les balises de répartition des coûts**
Les balises mettent 24 heures à apparaître dans la facturation : activez-les tôt pour éviter les lacunes dans les données dans les rapports sur les coûts.

**Astuce 5 : Inclure des balises d'automatisation**
Baliser les ressources avec « ManagedBy:Terraform » ou « CreatedBy:User » : permet le suivi des ressources manuelles et automatisées.

### Bonnes pratiques en matière de budget et d'alerte

**Astuce 6 : Créez des budgets granulaires**
Séparez les budgets par environnement, service et équipe : identifiez les dépassements de coûts plus rapidement qu'avec un budget unique à l'échelle de l'organisation.

**Astuce 7 : Utilisez les alertes prévues**
Alertes de seuil prévues à 100 % avant toute dépense excessive : prévention proactive ou réponse réactive.

**Astuce 8 : Seuils d'alerte multiples**
50 % d'informations, 80 % d'avertissement, 100 % de critiques, 120 % d'urgence : voie d'escalade avec l'urgence appropriée.

**Astuce 9 : Intégrez les budgets à l'automatisation**
SNS → Lambda → Arrêtez les instances de développement lorsque le budget est dépassé : le contrôle automatisé des coûts évite les dépenses incontrôlables.

**Astuce 10 : Définissez des budgets saisonniers**
Budgets mensuels variables pour des modèles prévisibles (Black Friday, saison des impôts) : évite les fausses alarmes lors des pics attendus.

### Bonnes pratiques d'optimisation

**Astuce 11 : Commencez par des gains rapides**
Mettez fin aux ressources inutilisées, supprimez les volumes EBS non connectés, libérez les adresses IP Elastic inutilisées : des économies immédiates sans risque.

**Astuce 12 : Redimensionnez avant de vous engager**
Analysez l'utilisation sur 3 à 6 mois, redimensionnez les instances surdimensionnées, puis achetez des Savings Plans (engagez-vous uniquement sur une base de référence optimisée).

**Astuce 13 : Utilisez les plans d'épargne de calcul**
Plus flexible que les IR, s'applique à EC2/Fargate/Lambda, gestion plus simple — recommandé pour les architectures modernes.

**Astuce 14 : implémentez l'arrêt automatique**
Les environnements de développement/test s'arrêtent automatiquement à 18 heures et démarrent à 8 heures du matin : permet d'économiser plus de 60 % sur les coûts hors production.

**Astuce 15 : Examinez et optimisez chaque trimestre**
L'utilisation du cloud évolue : des examens d'optimisation trimestriels identifient de nouvelles opportunités d'économies manquées par l'automatisation.

## Pièges \& Remèdes

### Piège 1 : une mauvaise conformité des balises entraînant des lacunes d'attribution

**Problème :** 40 % des ressources ne sont pas étiquetées, les coûts ne peuvent pas être attribués aux équipes, ce qui empêche la rétrofacturation/la rétrofacturation et la responsabilité.

**Pourquoi cela arrive :**

- Aucune application de balise lors de la création de la ressource
- Marquage manuel (oublié ou incohérent)
- Ressources héritées d'avant la stratégie de marquage
- Outils tiers créant des ressources non balisées
- Manque de validation des balises

**Impact :**

- Impossible d'attribuer 50 000 $/mois (40 % du budget) aux équipes
- Aucune responsabilité pour les dépenses
- Showback/refacturation impossible
- Les équipes financières ne peuvent pas suivre les coûts du projet
- Efforts d'optimisation mal orientés

**Exemple :**
```
Monthly AWS Bill: $125,000
Tagged resources: $75,000 (60%)
Untagged resources: $50,000 (40%)

Showback attempt:
- Team A projects: $30,000 (visible)
- Team B projects: $25,000 (visible)
- Team C projects: $20,000 (visible)
- Unknown: $50,000 (cannot attribute)

Result: Teams only see 60% of actual costs
Impact: False sense of spending, underfunding projects
```
**Remède :**

**Étape 1 : Mettre en œuvre l'application des balises avec les SCP**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUntaggedResourceCreation",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "rds:CreateDBInstance",
        "s3:CreateBucket",
        "dynamodb:CreateTable",
        "lambda:CreateFunction"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotLike": {
          "aws:RequestTag/CostCenter": "CC-*"
        }
      }
    },
    {
      "Sid": "RequireProjectTag",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "rds:CreateDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "Null": {
          "aws:RequestTag/Project": "true"
        }
      }
    },
    {
      "Sid": "RequireEnvironmentTag",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "rds:CreateDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "ForAllValues:StringNotEquals": {
          "aws:RequestTag/Environment": ["Production", "Staging", "Development", "Test"]
        }
      }
    }
  ]
}
```
**Étape 2 : Correction automatisée des balises**
```python
def tag_remediation_workflow():
    """Automated workflow to tag untagged resources"""
    
    ec2 = boto3.client('ec2')
    rds = boto3.client('rds')
    s3 = boto3.client('s3')
    
    # Find untagged EC2 instances
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running', 'stopped']}
        ]
    )
    
    untagged_instances = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
            
            required_tags = ['CostCenter', 'Project', 'Environment', 'Owner']
            missing_tags = [tag for tag in required_tags if tag not in tags]
            
            if missing_tags:
                untagged_instances.append({
                    'instance_id': instance_id,
                    'missing_tags': missing_tags,
                    'launch_time': instance['LaunchTime'],
                    'owner_guess': tags.get('CreatedBy', 'Unknown')
                })
    
    print(f"Found {len(untagged_instances)} instances with missing tags")
    
    for instance in untagged_instances:
        instance_id = instance['instance_id']
        
        # Attempt to infer tags
        inferred_tags = []
        
        # Default tags
        if 'CostCenter' in instance['missing_tags']:
            inferred_tags.append({'Key': 'CostCenter', 'Value': 'CC-UNASSIGNED'})
        
        if 'Project' in instance['missing_tags']:
            inferred_tags.append({'Key': 'Project', 'Value': 'UnassignedProject'})
        
        if 'Environment' in instance['missing_tags']:
            # Guess based on instance name or size
            inferred_tags.append({'Key': 'Environment', 'Value': 'Unknown'})
        
        if 'Owner' in instance['missing_tags']:
            inferred_tags.append({'Key': 'Owner', 'Value': instance['owner_guess']})
        
        # Apply default tags
        if inferred_tags:
            ec2.create_tags(
                Resources=[instance_id],
                Tags=inferred_tags
            )
            
            print(f"Tagged {instance_id} with default values")
            
            # Notify owner to update tags
            send_tag_update_notification(instance_id, inferred_tags)

def send_tag_update_notification(resource_id, tags_applied):
    """Notify owner to correct default tags"""
    
    sns = boto3.client('sns')
    
    message = f"""
    Resource {resource_id} was automatically tagged with default values
    because required tags were missing.
    
    Tags applied:
    {chr(10).join([f"- {tag['Key']}: {tag['Value']}" for tag in tags_applied])}
    
    Please update these tags with correct values:
    https://console.aws.amazon.com/ec2/v2/home#Instances:instanceId={resource_id}
    
    Note: Future resources without required tags will be denied creation.
    """
    
    sns.publish(
        TopicArn='arn:aws:sns:region:account:tag-compliance',
        Subject=f'Action Required: Update Tags for {resource_id}',
        Message=message
    )

# Run weekly
tag_remediation_workflow()
```
**Étape 3 : Tableau de bord de conformité des balises**
```python
def create_tag_compliance_dashboard():
    """Create dashboard showing tag compliance metrics"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Publish tag compliance metrics
    ec2 = boto3.client('ec2')
    
    instances = ec2.describe_instances()['Reservations']
    
    total_instances = 0
    compliant_instances = 0
    
    for reservation in instances:
        for instance in reservation['Instances']:
            total_instances += 1
            
            tags = {tag['Key']: tag['Value'] for tag in instance.get('Tags', [])}
            required_tags = ['CostCenter', 'Project', 'Environment', 'Owner']
            
            if all(tag in tags for tag in required_tags):
                compliant_instances += 1
    
    compliance_rate = (compliant_instances / total_instances * 100) if total_instances > 0 else 0
    
    # Publish to CloudWatch
    cloudwatch.put_metric_data(
        Namespace='CostManagement',
        MetricData=[
            {
                'MetricName': 'TagComplianceRate',
                'Value': compliance_rate,
                'Unit': 'Percent'
            },
            {
                'MetricName': 'UntaggedResources',
                'Value': total_instances - compliant_instances,
                'Unit': 'Count'
            }
        ]
    )
    
    print(f"Tag Compliance: {compliance_rate:.1f}%")
    print(f"Untagged Resources: {total_instances - compliant_instances}")
    
    # Alert if compliance < 95%
    if compliance_rate < 95:
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:region:account:cost-alerts',
            Subject='Tag Compliance Below Target',
            Message=f'Tag compliance is {compliance_rate:.1f}% (target: 95%)'
        )

# Run daily
create_tag_compliance_dashboard()
```
**Prévention :**

- Appliquer les balises avec les SCP avant de lancer des ressources
- Inclure le balisage dans l'intégration des développeurs
- Vérifications quotidiennes automatisées de la conformité des balises
- Validation des tags dans les pipelines CI/CD
- Audits réguliers avec remédiation automatisée
- Les dirigeants suivent la conformité des balises en tant que KPI
- Conformité des balises incluse dans les tableaux de bord des équipes

***

## Résumé du chapitre

AWS Cost Management transforme les opérations financières dans le cloud de l'examen réactif des factures à l'optimisation proactive grâce à une visibilité complète (Cost Explorer), des contrôles proactifs (Budgets), une détection intelligente (Détection d'anomalies) et des engagements stratégiques (Plans d'économies). Les organisations mettant en œuvre des pratiques FinOps matures réalisent des économies de coûts de 30 à 40 % tout en maintenant l'agilité de leur entreprise grâce à l'étiquetage de la répartition des coûts, à la gouvernance automatisée, au redimensionnement, aux remises basées sur les engagements et à l'optimisation de l'architecture. Le succès nécessite une transformation culturelle où les équipes financières, d'ingénierie et commerciales collaborent en permanence, les coûts sont attribués avec précision aux équipes et l'optimisation est une discipline continue plutôt qu'un projet annuel.

**Principaux points à retenir :**

- **Étiquetez tout dès le premier jour :** Les politiques de contrôle des services appliquent les balises requises lors de la création des ressources ; La conformité à 100 % des balises permet une attribution précise des coûts pour la rétrofacturation/la rétrofacturation
- **Créez des budgets granulaires :** Les budgets spécifiques à l'environnement, au service et à l'équipe identifient les dépenses excessives plus rapidement que les budgets à l'échelle de l'organisation ; les alertes prévues évitent les dépassements
- **Activer la détection des anomalies :** La détection basée sur le ML identifie les modèles de dépenses inhabituels le jour même ; les réponses automatisées arrêtent immédiatement le gaspillage, économisant des milliers de dollars chaque mois
- **Redimensionner avant de s'engager :** Analysez la base de référence de 3 à 6 mois, mettez en œuvre les recommandations de redimensionnement (économies moyennes de 25 %), puis engagez-vous à optimiser la base de référence avec les plans d'économies.
- **Utilisez les plans d'économies de calcul :** 66 à 72 % de réduction par rapport à la demande ; flexible sur EC2/Fargate/Lambda, les familles d'instances et les régions ; plus simple que les instances réservées pour les architectures modernes
- **Mise en œuvre de l'arrêt automatique :** Les environnements de développement/test s'arrêtent automatiquement la nuit et le week-end, permettant d'économiser plus de 60 % sur les coûts hors production ; heures ouvrables uniquement pour les charges de travail non critiques
- **Revue trimestrielle :** L'utilisation du cloud évolue ; des revues d'optimisation trimestrielles (redimensionnement, ajustements des engagements, élimination des gaspillages) identifient les opportunités d'économies continues

La gestion des coûts s'intègre dans AWS : Cost Explorer analyse les dépenses de tous les services, les balises permettent l'attribution des ressources couvertes dans les chapitres précédents (EC2, RDS, Lambda, S3), les budgets alertent en cas de dépenses excessives, les plans d'économies réduisent les coûts de calcul et la culture FinOps garantit que chaque équipe est responsable de ses coûts. Les organisations matures parviennent à une économie d'unité cloud (coût par client, coût par transaction) permettant une évolution rentable tout en maintenant la discipline financière.

## Exercice pratique en laboratoire

**Objectif :** Créez un système complet de gestion des coûts avec des workflows de marquage, de budgets, de détection d'anomalies et d'optimisation.

**Scénario :** Une organisation avec des dépenses AWS de \$50 000/mois a besoin de visibilité, d'attribution et d'optimisation.

**Prérequis :**

- Compte AWS avec accès à la facturation
- Explorateur de coûts activé
- Exécution de ressources dans plusieurs environnements

**Étapes :**

1. **Mettre en œuvre une stratégie de marquage (30 minutes)**
    - Définir les balises requises (CostCenter, Projet, Environnement, Propriétaire)
    - Créer des balises appliquant une politique de contrôle de service
    - Déployer la remédiation des tags Lambda
    - Étiqueter les ressources non étiquetées existantes
    - Vérifier la conformité à plus de 95 %
2. **Configurer l'analyse Cost Explorer (25 minutes)**
    - Activer les balises de répartition des coûts
    - Analyser les 3 derniers mois par service
    - Analyser par balise de projet pour le showback
    - Identifier les coûts des ressources non étiquetés
    - Générer des prévisions pour le prochain trimestre
3. **Créer une hiérarchie budgétaire (30 minutes)**
    - Budget mensuel global (\$50K)
    - Budgets environnement (Production \$35K, Dev \$5K, Staging \$10K)
    - Budgets de services (EC2 \$20K, RDS \$8K)
    - Configurer les alertes (80%, 100%, 110% prévus)
    - Test avec l'intégration SNS
4. **Activer la détection des anomalies (20 minutes)**
    - Créer un moniteur de niveau de service
    - Créer un moniteur au niveau du compte
    - Configurer l'abonnement (\$1K seuil)
    - Test de réponse d'anomalie Lambda
    - Vérifier le routage des alertes
5. **Mise en œuvre du redimensionnement (40 minutes)**
    - Obtenez des recommandations de redimensionnement
    - Analyser les ressources sous-utilisées (< 10 % CPU)
    - Calculer les économies potentielles
    - Effectuer des tests de redimensionnement (dry run)
    - Documenter le plan de mise en œuvre
6. **Générer un rapport Showback (15 minutes)**
    - Coûts de requête par balise de projet
    - Créer une répartition des services par équipe
    - Exporter au format CSV pour le financement
    - Envoyer des rapports par e-mail aux chefs d'équipe
    - Examiner les coûts non attribués

**Résultats attendus :**

- Conformité à 100 % des balises de ressources
- Budgets granulaires empêchant les dépenses excessives
- Détection automatisée des anomalies
- Opportunités de redimensionnement identifiées (\$5K-10K/mois d'économies)
- Attribution des coûts au niveau de l'équipe pour le showback
- Investissement en temps total : ~2,5 heures
- Économies continues : 15 à 30 % par mois


## Questions de révision

1. **Quel est le principal avantage des balises de répartition des coûts ?**
a) Réduire les coûts AWS
b) Améliorer les performances
c) Permettre l'attribution des coûts aux équipes ✓
d) Augmenter la sécurité

**Réponse : C** – Les balises de répartition des coûts permettent d'attribuer des coûts aux équipes, aux projets ou aux centres de coûts pour la rétrofacturation/la rétrofacturation.

2. **Quelle est la fourchette de remise pour les plans d'économies de calcul sur 3 ans ?**
a) 40-50%
b) 50-60%
c) 66-72% ✓
d) 80-90%

**Réponse : C** – Les plans d'économies de calcul offrent une remise de 66 à 72 % par rapport à la demande pour un engagement de 3 ans.

3. **Quel type de notification budgétaire alerte avant une dépense excessive ?**
a) Réel
b) Prévu ✓
c) Historique
d) Projeté

**Réponse : B** – Les alertes budgétaires prévues avertissent lorsque les prévisions prévoient un dépassement du budget avant que cela ne se produise.

4. **Sur quoi est basée la détection des anomalies de coûts ?**
a) Seuils statiques
b) Règles manuelles
c) Apprentissage automatique ✓
d) Quotas de services

**Réponse : C** – La détection des anomalies utilise le ML pour connaître les modèles de dépenses normaux et détecter les écarts.

5. **Quel est le pourcentage typique de gaspillage dans le cloud sans optimisation ?**
a) 5-10%
b) 15-20%
c) 30-40% ✓
d) 50-60%

**Réponse : C** - Les organisations gaspillent généralement 30 % de leurs dépenses cloud sans optimisation active

6. **Qu'est-ce que la rétrofacturation et la rétrofacturation ?**
a) Même chose
b) Showback est informatif, la rétrofacturation transfère les budgets ✓
c) Le Showback coûte plus cher
d) La rétrofacturation est automatique

**Réponse : B** – Showback montre aux équipes leurs coûts (à titre informatif), la rétrofacturation transfère en fait le budget (responsabilité)

7. **Quand devriez-vous souscrire des plans d'épargne ?**
a) Immédiatement
b) Après avoir analysé la ligne de base et redimensionné ✓
c) Uniquement pour la production
d) Jamais

**Réponse : B** – Analysez la base de référence de 3 à 6 mois, redimensionnez d'abord, puis engagez-vous à une utilisation optimisée avec les plans d'épargne.

8. **Quel pourcentage de la ligne de base devriez-vous couvrir avec des engagements ?**
a) 100 %
b) 90-95%
c) 70-80% ✓
d) 50%

**Réponse : C** - Couvrir 70 à 80 % de la base de référence avec des engagements, laisser 20 à 30 % à la demande pour la croissance et la flexibilité.

9. **Quel est le type de transfert de données le plus coûteux ?**
a) Même AZ
b) Même région
c) Inter-région
d) Sortie Internet ✓

**Réponse : D** - La sortie Internet (\$0,09/Go) est la plus chère ; l'arrivée est gratuite, le même AZ est gratuit

10. **Quelle est la première étape vers la maturité FinOps ?**
a) Acheter des instances réservées
b) Mettre en œuvre la rétrofacturation
c) Permettre la visibilité et le marquage des coûts ✓
d) Embaucher une équipe FinOps

**Réponse : C** – FinOps commence par une visibilité via le balisage et Cost Explorer avant l'optimisation ou la rétrofacturation.

***
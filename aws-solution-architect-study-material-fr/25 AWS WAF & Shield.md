# Chapitre 25 : AWS WAF \& Shield

##Présentation

Les applications Web sont confrontées à des attaques constantes : des robots automatisés recherchent les vulnérabilités, des tentatives de bourrage d'informations d'identification parcourant des mots de passe volés, des bases de données de sondage par injection SQL, des inondations DDoS submergeant l'infrastructure et des exploits Zero Day ciblant les logiciels non corrigés. Les approches de sécurité traditionnelles (pare-feu réseau, blocage IP, limitation de débit au niveau de l'équilibreur de charge) ne peuvent pas protéger les applications Web modernes contre les attaques sophistiquées et distribuées au niveau de la couche application. AWS WAF (Web Application Firewall) et AWS Shield offrent une protection intelligente et évolutive directement intégrée à CloudFront, Application Load Balancer et API Gateway, bloquant les attaques en périphérie avant qu'elles n'atteignent votre infrastructure.

Le coût d’une sécurité inadéquate des applications Web va bien au-delà de la technologie : les coûts moyens des violations de données dépassent 4 millions de dollars, les attaques DDoS entraînent une perte de revenus dépassant 100 000 dollars par heure et les atteintes à la réputation de la marque durent des années. AWS WAF permet un filtrage granulaire des requêtes à l'aide de règles personnalisables qui inspectent les en-têtes HTTP, le corps, l'URI, les chaînes de requête et les modèles de requête. AWS Shield offre une protection DDoS permanente : Shield Standard protège automatiquement et gratuitement contre les attaques de couche réseau et de transport, tandis que Shield Advanced ajoute une protection de couche application, une prise en charge 24h/24 et 7j/7 de l'équipe de réponse DDoS, une protection des coûts et une visibilité des attaques en temps réel. Ensemble, ces services transforment la sécurité de la réponse réactive aux incidents à la prévention proactive des menaces.

Ce chapitre s'appuie sur les concepts de sécurité précédents (politiques IAM, résultats de Security Hub, chiffrement) en ajoutant la protection des applications Web et l'atténuation DDoS. WAF s'intègre aux services abordés précédemment (protection des distributions CloudFront, des équilibreurs de charge d'application, des API REST API Gateway), tandis que Shield protège l'ensemble du réseau Edge AWS. Le chapitre couvre l'architecture WAF, les types de règles, les groupes de règles gérés, la limitation de débit, la détection des robots, le filtrage géographique, la journalisation et la surveillance, les types d'attaques DDoS, Shield Standard vs Advanced, l'automatisation de la réponse aux incidents et la création de systèmes de production qui résistent aux attaques allant du simple trafic de robots aux attaques DDoS multivecteurs sophistiquées dépassant les térabits par seconde.

## Théorie \&Concepts

### Paysage des attaques d'applications Web

**Menaces courantes liées aux applications Web :**
```
1. SQL Injection:
Attack: Malicious SQL in input fields
Example: ' OR '1'='1' --
Impact: Database compromise, data theft
Prevention: WAF SQL injection rule set

2. Cross-Site Scripting (XSS):
Attack: Inject malicious JavaScript
Example: <script>steal_cookies()</script>
Impact: Session hijacking, data theft
Prevention: WAF XSS rule set

3. Directory Traversal:
Attack: Access unauthorized files
Example: ../../etc/passwd
Impact: File system exposure
Prevention: WAF path traversal rules

4. Command Injection:
Attack: Execute system commands
Example: ; cat /etc/passwd
Impact: Server compromise
Prevention: WAF OS command injection rules

5. Bot Attacks:
Types:
- Web scraping (content theft)
- Credential stuffing (stolen passwords)
- Inventory hoarding (e-commerce)
- Account creation abuse
Prevention: WAF Bot Control

6. Distributed Denial of Service (DDoS):
Layers:
- Layer 3/4: Network/transport (volumetric)
- Layer 7: Application (resource exhaustion)
Impact: Service unavailability
Prevention: Shield Standard + Advanced

7. Zero-Day Exploits:
Attack: Exploit unknown vulnerabilities
Example: Log4Shell, Heartbleed
Impact: System compromise
Prevention: WAF managed rule groups (rapid updates)

Attack Volume Statistics (2024):
- 43% increase in web application attacks
- 67% of attacks target application layer
- 94% of organizations experienced DDoS
- Average DDoS attack: 500 Gbps
- Largest recorded: 3.47 Tbps (AWS mitigated)
```
**Stratégie de défense en profondeur :**
```
Security Layers:

Layer 1: Network (VPC)
- Security groups
- Network ACLs
- Private subnets
Protection: Network-level access control

Layer 2: Edge (CloudFront + Shield)
- Shield Standard (always-on DDoS)
- Geographic distribution
- SSL/TLS termination
Protection: Network/transport layer DDoS

Layer 3: Web Application Firewall (WAF)
- Request inspection
- Rate limiting
- Bot detection
- Managed rule groups
Protection: Application-layer attacks

Layer 4: Application (Code)
- Input validation
- Parameterized queries
- Output encoding
Protection: Defense against coding vulnerabilities

Layer 5: Data (Encryption)
- Encryption at rest (KMS)
- Encryption in transit (TLS)
Protection: Data protection if perimeter breached

Layer 6: Monitoring (Security Hub)
- GuardDuty threat detection
- CloudTrail audit logs
- WAF logging
Protection: Incident detection and response

Complete Stack:
Internet → Shield → CloudFront → WAF → ALB → Application → Database
Each layer reduces attack surface
Defense in depth: Multiple layers compensate if one fails
```
### Architecture AWS WAF

**Composants principaux :**
```
WAF Hierarchy:

Web ACL (Access Control List)
├── Default Action (Allow or Block)
├── Rules (ordered priority)
│   ├── Managed Rule Groups (AWS/Marketplace)
│   ├── Custom Rules
│   └── Rate-based Rules
├── Capacity Units (WCU limit: 1,500)
└── Associated Resources (CloudFront, ALB, API Gateway)

Web ACL Structure:

{
  "Name": "ProductionWebACL",
  "DefaultAction": {"Allow": {}},
  "Rules": [
    {
      "Priority": 0,
      "Name": "AWSManagedRulesCommonRuleSet",
      "Statement": {
        "ManagedRuleGroupStatement": {
          "VendorName": "AWS",
          "Name": "AWSManagedRulesCommonRuleSet"
        }
      },
      "Action": {"Block": {}}
    },
    {
      "Priority": 1,
      "Name": "RateLimitRule",
      "Statement": {
        "RateBasedStatement": {
          "Limit": 2000,
          "AggregateKeyType": "IP"
        }
      },
      "Action": {"Block": {}}
    }
  ]
}

Rule Evaluation:
1. Rules evaluated in priority order (0 = highest)
2. First matching rule action applied
3. If no rules match → default action applied
4. Terminates on first match (no further evaluation)

WAF Capacity Units (WCU):
- Each rule consumes WCUs based on complexity
- Web ACL limit: 1,500 WCUs
- Simple rule: 1 WCU
- Complex rule: 50+ WCUs
- Managed rule groups: 100-700 WCUs

Example WCU Calculation:
- AWS Core Rule Set: 700 WCUs
- SQL Injection rule set: 200 WCUs
- Rate limit rule: 2 WCUs
- IP set rule: 1 WCU
- Total: 903 WCUs (under 1,500 limit)
```
**Ressources AWS prises en charge :**
```
Integration Points:

1. Amazon CloudFront:
   - Global distribution
   - Edge locations (400+)
   - Lowest latency
   - Highest protection
   Deployment: Regional Web ACL associated with distribution
   Use Case: Global websites, APIs, content delivery

2. Application Load Balancer (ALB):
   - Regional deployment
   - Protects backend services
   - VPC integration
   Deployment: Regional Web ACL associated with ALB
   Use Case: Web applications, microservices

3. API Gateway (REST API):
   - Protect APIs
   - Regional deployment
   - Request/response inspection
   Deployment: Regional Web ACL associated with API stage
   Use Case: RESTful APIs, serverless backends

4. AWS AppSync (GraphQL):
   - Protect GraphQL APIs
   - Regional deployment
   Deployment: Regional Web ACL associated with API
   Use Case: GraphQL applications

Regional vs Global Web ACLs:

CloudFront (Global):
- Deploy to us-east-1
- Applies globally at all edge locations
- Protect worldwide traffic

ALB/API Gateway (Regional):
- Deploy to same region as resource
- Protects regional traffic only
- Multi-region requires multiple Web ACLs

Architecture Pattern:

Global Application:
CloudFront (Global WAF) → ALB us-east-1 (Regional WAF)
                       → ALB eu-west-1 (Regional WAF)

Benefits:
- Edge protection at CloudFront
- Additional protection at ALB
- Defense in depth
```
### Types de règles WAF

**1. Groupes de règles gérés :**
```
AWS Managed Rule Groups:

Core Rule Set (AWSManagedRulesCommonRuleSet):
- OWASP Top 10 protections
- SQL injection, XSS, LFI, RFI
- Most commonly used
- Cost: $1/month + $0.60/million requests
- WCU: 700

Known Bad Inputs (AWSManagedRulesKnownBadInputsRuleSet):
- Known malicious patterns
- CVE signatures
- Exploit patterns
- Cost: $1/month + $0.60/million requests
- WCU: 200

SQL Database (AWSManagedRulesSQLiRuleSet):
- SQL injection protection
- Database-specific patterns
- Cost: $1/month + $0.60/million requests
- WCU: 200

Linux Operating System (AWSManagedRulesLinuxRuleSet):
- Linux-specific exploits
- Command injection
- File inclusion
- Cost: $1/month + $0.60/million requests
- WCU: 200

Bot Control (AWSManagedRulesBotControlRuleSet):
- Automated bot detection
- Verified bots (Googlebot) allowed
- Unverified bots blocked
- Cost: $10/month + $1/million requests
- WCU: 50

Anonymous IP List (AWSManagedRulesAnonymousIpList):
- Block Tor exit nodes
- VPN providers
- Proxy services
- Anonymization services
- Cost: $1/month + $0.60/million requests
- WCU: 50

IP Reputation List (AWSManagedRulesAmazonIpReputationList):
- AWS threat intelligence
- Known malicious IPs
- Bot networks
- Free
- WCU: 25

Marketplace Managed Rules:
- Third-party vendors (F5, Fortinet, Imperva)
- Specialized protection
- Additional cost
- Industry-specific rules

Rule Group Recommendation:
Minimum Production Setup:
1. Core Rule Set (OWASP protection)
2. Known Bad Inputs (CVE protection)
3. IP Reputation List (threat intelligence)
Total WCU: 925
Total Cost: $2/month + $1.20/million requests
```
**2. Règles personnalisées :**
```
Match Statement Types:

Geographic Match:
Block/allow by country
{
  "GeoMatchStatement": {
    "CountryCodes": ["CN", "RU", "KP"]
  }
}

IP Set Match:
Block/allow specific IPs
{
  "IPSetReferenceStatement": {
    "ARN": "arn:aws:wafv2:...:ipset/blocked-ips"
  }
}

Size Constraint:
Block requests exceeding size
{
  "SizeConstraintStatement": {
    "FieldToMatch": {"Body": {}},
    "ComparisonOperator": "GT",
    "Size": 8192,
    "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
  }
}

SQL Injection Match (Custom):
{
  "SqliMatchStatement": {
    "FieldToMatch": {"UriPath": {}},
    "TextTransformations": [{"Priority": 0, "Type": "URL_DECODE"}]
  }
}

String Match (Exact):
{
  "ByteMatchStatement": {
    "SearchString": "admin",
    "FieldToMatch": {"UriPath": {}},
    "TextTransformations": [{"Priority": 0, "Type": "LOWERCASE"}],
    "PositionalConstraint": "CONTAINS"
  }
}

Regex Pattern Set:
{
  "RegexPatternSetReferenceStatement": {
    "ARN": "arn:aws:wafv2:...:regexpatternset/custom-patterns",
    "FieldToMatch": {"UriPath": {}},
    "TextTransformations": [{"Priority": 0, "Type": "NONE"}]
  }
}

Text Transformations:
- NONE: No transformation
- LOWERCASE: Convert to lowercase
- URL_DECODE: Decode URL encoding
- HTML_ENTITY_DECODE: Decode HTML entities
- BASE64_DECODE: Decode base64
- CMD_LINE: Normalize command line
- COMPRESS_WHITE_SPACE: Remove extra spaces

Use Case: Normalize before matching
Example: Block "admin" in any case variation
```
**3. Règles basées sur les tarifs :**
```
Rate Limiting Configuration:

Basic Rate Limit (per IP):
{
  "RateBasedStatement": {
    "Limit": 2000,  // Requests per 5 minutes
    "AggregateKeyType": "IP"
  }
}

Behavior:
- Track requests per IP address
- Block IP exceeding limit for 5 minutes
- Automatic unblock after timeout

Advanced Rate Limit (with Scope):
{
  "RateBasedStatement": {
    "Limit": 100,
    "AggregateKeyType": "IP",
    "ScopeDownStatement": {
      "ByteMatchStatement": {
        "SearchString": "/api/login",
        "FieldToMatch": {"UriPath": {}},
        "TextTransformations": [{"Priority": 0, "Type": "NONE"}],
        "PositionalConstraint": "EXACTLY"
      }
    }
  }
}

Behavior:
- Only applies to /api/login endpoint
- Protects against credential stuffing
- Other endpoints not rate limited

Custom Key Rate Limit:
{
  "RateBasedStatement": {
    "Limit": 50,
    "AggregateKeyType": "CUSTOM_KEYS",
    "CustomKeys": [
      {"Header": {"Name": "X-API-Key"}},
      {"Cookie": {"Name": "session_id"}}
    ]
  }
}

Behavior:
- Rate limit per API key or session
- More granular than IP-based
- Prevents abuse from single user

Rate Limit Strategy:

Layer 1 - Aggressive (Edge):
- 10,000 req/5min per IP (global traffic)
- Protects infrastructure

Layer 2 - Moderate (API):
- 1,000 req/5min per IP (API endpoints)
- Balances usability and security

Layer 3 - Strict (Login):
- 10 req/5min per IP (authentication)
- Prevents credential stuffing

Layer 4 - Per-User:
- 100 req/5min per session (authenticated)
- Prevents account abuse
```
### Bouclier AWS

**Standard de bouclier (automatique, gratuit) :**
```
Shield Standard Protection:

Coverage:
- All AWS customers automatically
- No configuration required
- No additional cost
- Always-on protection

Protected Layers:
- Layer 3 (Network): IP floods
- Layer 4 (Transport): SYN floods, UDP reflection

Protected Services:
- Amazon CloudFront
- Amazon Route 53
- Elastic Load Balancing
- AWS Global Accelerator

Attack Types Mitigated:

SYN Flood:
- Exhausts connection table
- Shield absorbs at edge
- Application never sees attack

UDP Reflection:
- Amplification attacks
- DNS, NTP, SSDP reflection
- Shield filters malformed packets

Characteristics:
✓ Automatic detection
✓ Automatic mitigation
✓ No configuration
✓ Infrastructure-layer protection
✗ No application-layer protection
✗ No cost protection
✗ No DDoS Response Team support

Coverage: 96% of DDoS attacks mitigated by Shield Standard
Remaining 4%: Application-layer attacks (require Shield Advanced + WAF)
```
**Bouclier avancé (protection premium) :**
```
Shield Advanced Features:

Cost: $3,000/month per organization
+ Data transfer charges during attack

Included Protection:
1. Enhanced DDoS Detection:
   - Application-layer attack detection
   - More sensitive than Standard
   - Custom baseline creation

2. 24/7 DDoS Response Team (DRT):
   - AWS security experts
   - On-demand access
   - Attack analysis and mitigation
   - Response time: < 15 minutes

3. Cost Protection:
   - Credits for scaling costs during attack
   - Applies to: CloudFront, Route 53, ELB, Global Accelerator, EC2
   - No bill shock from DDoS traffic

4. Application-Layer Protection:
   - WAF at no additional cost (rules still charged)
   - Custom mitigation rules
   - Advanced rate limiting

5. Real-Time Attack Visibility:
   - CloudWatch metrics (1-minute granularity)
   - Attack notifications
   - Post-attack reports

6. Health-Based Detection:
   - Application health monitoring
   - Automatic mitigation triggers
   - Route 53 health check integration

7. Proactive Engagement:
   - DRT can proactively engage during attack
   - Automatic notification of suspected attacks
   - Guidance during attack

Protected Resources (Explicitly Added):
- CloudFront distributions
- Route 53 hosted zones
- Elastic Load Balancers
- Elastic IPs (EC2, NLB)
- Global Accelerators

Shield Advanced vs Standard:

┌─────────────────────────┬──────────────┬────────────────┐
│ Feature                 │ Standard     │ Advanced       │
├─────────────────────────┼──────────────┼────────────────┤
│ Cost                    │ Free         │ $3,000/month   │
│ Layer 3/4 Protection    │ Yes          │ Yes (enhanced) │
│ Layer 7 Protection      │ No           │ Yes            │
│ DRT Support             │ No           │ 24/7           │
│ Cost Protection         │ No           │ Yes            │
│ Real-time Metrics       │ No           │ Yes            │
│ Custom Mitigations      │ No           │ Yes            │
│ WAF Included            │ No           │ Yes            │
└─────────────────────────┴──────────────┴────────────────┘

When to Use Shield Advanced:
✓ Revenue loss > $125/hour from downtime
✓ Critical business applications
✓ Frequent DDoS targets
✓ Compliance requirements (SLA uptime)
✓ Cannot tolerate application-layer attacks
✓ Need DRT expertise

ROI Calculation:
Downtime cost: $100,000/hour
Attack frequency: 1/year
Attack duration: 2 hours (without protection)
Loss: $200,000/year

Shield Advanced: $36,000/year
Savings: $164,000/year (82% ROI)
```
### Types d'attaques DDoS

**Attaques de couche réseau/transport (couche 3/4) :**
```
1. SYN Flood:
Mechanism: Send SYN packets, never complete handshake
Impact: Exhaust server connection table
Volume: Millions of packets/second
Mitigation: Shield Standard (SYN cookies)

2. UDP Flood:
Mechanism: Send UDP packets to random ports
Impact: Consume bandwidth and CPU
Volume: Hundreds of Gbps
Mitigation: Shield Standard (filtering)

3. DNS Amplification:
Mechanism: Spoof source IP, query DNS with large responses
Amplification: 28-54× (60 byte query → 3,000 byte response)
Volume: Terabits per second possible
Mitigation: Shield Standard (reflection detection)

4. NTP Amplification:
Mechanism: Exploit NTP monlist command
Amplification: 556× amplification possible
Volume: Massive bandwidth consumption
Mitigation: Shield Standard (reflection detection)

Attack Characteristics:
- High packet rate (millions/second)
- High bandwidth (hundreds of Gbps)
- Short duration (minutes to hours)
- Simple to launch (botnets)
- Easily detected (volumetric)
- Shield Standard effective (96% mitigation)
```
**Attaques de la couche application (couche 7) :**
```
1. HTTP Flood:
Mechanism: Send legitimate-looking HTTP requests
Target: Web servers, application logic
Volume: Thousands to millions of requests/second
Impact: Exhaust application resources

Example:
GET /search?q=expensive_query HTTP/1.1
Host: target.com

- Each request triggers complex database query
- 1,000 requests/second overwhelm database
- Appears legitimate (valid HTTP)

Mitigation:
- WAF rate limiting
- Shield Advanced (advanced detection)
- Caching (CloudFront)
- Application-level throttling

2. Slowloris:
Mechanism: Open connections, send partial requests slowly
Target: Connection pool exhaustion
Volume: Few hundred connections
Impact: Tie up server resources

Example:
POST /upload HTTP/1.1
Host: target.com
Content-Length: 100000000
[Send 1 byte per minute]

Mitigation:
- Connection timeouts
- Load balancer protections (ALB)
- Shield Advanced

3. WordPress XML-RPC Attack:
Mechanism: Exploit XML-RPC endpoint for amplification
Target: WordPress sites
Amplification: 1 request → hundreds of backend requests
Impact: Database overload

Mitigation:
- WAF rule blocking XML-RPC
- Disable XML-RPC if unused
- Rate limiting

4. API Abuse:
Mechanism: Exploit expensive API endpoints
Target: Computationally expensive operations
Example: /api/generate-report (30 seconds to generate)
Impact: Resource exhaustion with few requests

Mitigation:
- API rate limiting (per user/key)
- Background job processing
- Caching
- Request validation

Layer 7 Challenges:
- Appear legitimate (valid HTTP)
- Low volume (hard to detect)
- Target application logic
- Require deep inspection
- WAF + Shield Advanced required
- Application awareness needed
```
### Journalisation et surveillance WAF

**Configuration de la journalisation :**
```
WAF Logging Destinations:

1. Amazon S3:
   - Long-term storage
   - Compliance/audit
   - Cost-effective
   - Query with Athena
   Configuration:
   {
     "LogDestinationConfigs": [
       "arn:aws:s3:::waf-logs-bucket"
     ]
   }

2. CloudWatch Logs:
   - Real-time monitoring
   - CloudWatch Insights queries
   - Alarms and dashboards
   - Higher cost for large volume
   Configuration:
   {
     "LogDestinationConfigs": [
       "arn:aws:logs:us-east-1:123456789012:log-group:aws-waf-logs"
     ]
   }

3. Kinesis Data Firehose:
   - Real-time streaming
   - Transform and deliver
   - Send to Elasticsearch, Splunk
   - Custom analytics
   Configuration:
   {
     "LogDestinationConfigs": [
       "arn:aws:firehose:us-east-1:123456789012:deliverystream/waf-logs"
     ]
   }

Log Format (JSON):
{
  "timestamp": 1642176000000,
  "formatVersion": 1,
  "webaclId": "arn:aws:wafv2:...",
  "terminatingRuleId": "RateLimitRule",
  "terminatingRuleType": "RATE_BASED",
  "action": "BLOCK",
  "terminatingRuleMatchDetails": [],
  "httpSourceName": "CF",
  "httpSourceId": "E1234567890ABC",
  "ruleGroupList": [],
  "rateBasedRuleList": [
    {
      "rateBasedRuleName": "RateLimitRule",
      "limitKey": "IP",
      "maxRateAllowed": 2000
    }
  ],
  "nonTerminatingMatchingRules": [],
  "requestHeadersInserted": [],
  "responseCodeSent": 403,
  "httpRequest": {
    "clientIp": "203.0.113.1",
    "country": "US",
    "headers": [
      {"name": "Host", "value": "example.com"},
      {"name": "User-Agent", "value": "Mozilla/5.0..."}
    ],
    "uri": "/api/login",
    "args": "username=admin",
    "httpVersion": "HTTP/1.1",
    "httpMethod": "POST",
    "requestId": "uuid-1234-5678"
  }
}

Key Fields for Analysis:
- action: ALLOW, BLOCK, COUNT
- terminatingRuleId: Which rule matched
- httpRequest.clientIp: Source IP
- httpRequest.uri: Target endpoint
- httpRequest.country: Geographic origin
- responseCodeSent: HTTP status

Logging Best Practices:
✓ Log to S3 for cost-effective storage
✓ Use CloudWatch Logs for real-time alerts
✓ Sample logs (reduce volume and cost)
✓ Set lifecycle policies (delete after 90 days)
✓ Encrypt logs (SSE-S3 or SSE-KMS)
```
**Métriques CloudWatch :**
```
WAF Metrics (Automatic):

AllowedRequests:
- Count of allowed requests
- Dimension: WebACL, Region, Rule
- Use: Baseline normal traffic

BlockedRequests:
- Count of blocked requests
- Dimension: WebACL, Region, Rule
- Use: Attack detection

CountedRequests:
- Count mode (testing rules)
- Dimension: WebACL, Region, Rule
- Use: Rule validation before blocking

SampledRequests:
- Sample of requests (last 3 hours)
- Includes request details
- Maximum 1,000 samples
- Use: Debugging specific rules

Shield Metrics (Shield Advanced):

DDoSDetected:
- Binary: 0 (no attack) or 1 (attack)
- Dimension: Resource ARN
- Use: Trigger alarms

DDoSAttackBitsPerSecond:
- Attack volume (bits/second)
- Only during active attack
- Use: Attack analysis

DDoSAttackPacketsPerSecond:
- Attack volume (packets/second)
- Only during active attack
- Use: Attack analysis

DDoSAttackRequestsPerSecond:
- Application-layer attack volume
- Only during active attack
- Use: Layer 7 attack detection

Custom Metrics from Logs:
- Blocked requests by country
- Top blocked IPs
- Most triggered rules
- Attack patterns by time of day
```
## Implémentation pratique

### Atelier 1 : Création d'une ACL Web WAF avec des règles gérées

**Objectif :** Protégez Application Load Balancer avec WAF à l'aide de groupes de règles gérés.

**Étape 1 : Créer une liste ACL Web**
```python
import boto3
import json

wafv2 = boto3.client('wafv2', region_name='us-east-1')

# Create Web ACL
response = wafv2.create_web_acl(
    Scope='REGIONAL',  # 'CLOUDFRONT' for global
    Name='ProductionWebACL',
    DefaultAction={'Allow': {}},  # Default: allow traffic
    Description='Production web application protection',
    Rules=[
        {
            'Name': 'AWSManagedRulesCommonRuleSet',
            'Priority': 0,
            'Statement': {
                'ManagedRuleGroupStatement': {
                    'VendorName': 'AWS',
                    'Name': 'AWSManagedRulesCommonRuleSet',
                    'ExcludedRules': []  # Exclude specific rules if needed
                }
            },
            'OverrideAction': {'None': {}},  # Use rule group action
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'CoreRuleSet'
            }
        },
        {
            'Name': 'AWSManagedRulesKnownBadInputsRuleSet',
            'Priority': 1,
            'Statement': {
                'ManagedRuleGroupStatement': {
                    'VendorName': 'AWS',
                    'Name': 'AWSManagedRulesKnownBadInputsRuleSet'
                }
            },
            'OverrideAction': {'None': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'KnownBadInputs'
            }
        },
        {
            'Name': 'AWSManagedRulesSQLiRuleSet',
            'Priority': 2,
            'Statement': {
                'ManagedRuleGroupStatement': {
                    'VendorName': 'AWS',
                    'Name': 'AWSManagedRulesSQLiRuleSet'
                }
            },
            'OverrideAction': {'None': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'SQLInjection'
            }
        }
    ],
    VisibilityConfig={
        'SampledRequestsEnabled': True,
        'CloudWatchMetricsEnabled': True,
        'MetricName': 'ProductionWebACL'
    },
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'},
        {'Key': 'Application', 'Value': 'WebApp'}
    ]
)

web_acl_arn = response['Summary']['ARN']
web_acl_id = response['Summary']['Id']

print(f"Created Web ACL: {web_acl_arn}")
```
**Étape 2 : Associer à ALB**
```python
# Associate Web ACL with Application Load Balancer
elbv2 = boto3.client('elbv2')

# Get ALB ARN
alb_arn = 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234567890abcdef'

# Associate WAF
wafv2.associate_web_acl(
    WebACLArn=web_acl_arn,
    ResourceArn=alb_arn
)

print(f"Associated Web ACL with ALB: {alb_arn}")

# Verify association
response = wafv2.get_web_acl_for_resource(ResourceArn=alb_arn)
print(f"Current Web ACL: {response['WebACL']['Name']}")
```
**Étape 3 : Ajouter une règle de limitation de débit**
```python
# Add rate limit rule (protect against DDoS)
wafv2.update_web_acl(
    Scope='REGIONAL',
    Id=web_acl_id,
    Name='ProductionWebACL',
    DefaultAction={'Allow': {}},
    Rules=[
        # Existing managed rules...
        {
            'Name': 'RateLimitRule',
            'Priority': 10,  # Lower priority (runs after managed rules)
            'Statement': {
                'RateBasedStatement': {
                    'Limit': 2000,  # 2000 requests per 5 minutes per IP
                    'AggregateKeyType': 'IP'
                }
            },
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'RateLimit'
            }
        },
        {
            'Name': 'LoginRateLimitRule',
            'Priority': 11,
            'Statement': {
                'RateBasedStatement': {
                    'Limit': 10,  # 10 login attempts per 5 minutes
                    'AggregateKeyType': 'IP',
                    'ScopeDownStatement': {
                        'ByteMatchStatement': {
                            'SearchString': '/api/login',
                            'FieldToMatch': {'UriPath': {}},
                            'TextTransformations': [{'Priority': 0, 'Type': 'NONE'}],
                            'PositionalConstraint': 'EXACTLY'
                        }
                    }
                }
            },
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'LoginRateLimit'
            }
        }
    ],
    VisibilityConfig={
        'SampledRequestsEnabled': True,
        'CloudWatchMetricsEnabled': True,
        'MetricName': 'ProductionWebACL'
    },
    LockToken=response['LockToken']  # Required for updates
)

print("Rate limiting rules added")
```
**Étape 4 : Activer la journalisation**
```python
# Create S3 bucket for WAF logs
s3 = boto3.client('s3')

bucket_name = 'aws-waf-logs-production'

s3.create_bucket(
    Bucket=bucket_name,
    CreateBucketConfiguration={'LocationConstraint': 'us-east-1'}
)

# Configure logging
wafv2.put_logging_configuration(
    LoggingConfiguration={
        'ResourceArn': web_acl_arn,
        'LogDestinationConfigs': [
            f'arn:aws:s3:::{bucket_name}'
        ],
        'RedactedFields': [
            {'SingleHeader': {'Name': 'authorization'}},
            {'SingleHeader': {'Name': 'cookie'}}
        ]
    }
)

print(f"Logging enabled to S3 bucket: {bucket_name}")
```
### Lab 2 : Blocage géographique et règles de définition d'adresses IP

**Objectif :** Bloquer le trafic provenant de pays et d'adresses IP spécifiques.

**Étape 1 : Créer un ensemble d'adresses IP**
```python
# Create IP set for blocked IPs
ip_set_response = wafv2.create_ip_set(
    Scope='REGIONAL',
    Name='BlockedIPs',
    Description='Known malicious IP addresses',
    IPAddressVersion='IPV4',
    Addresses=[
        '203.0.113.0/24',  # Example malicious network
        '198.51.100.50/32',  # Specific bad IP
        '192.0.2.0/24'  # Another malicious network
    ],
    Tags=[
        {'Key': 'Purpose', 'Value': 'Security'}
    ]
)

ip_set_arn = ip_set_response['Summary']['ARN']
ip_set_id = ip_set_response['Summary']['Id']

print(f"Created IP set: {ip_set_arn}")
```
**Étape 2 : Ajouter un ensemble d'adresses IP et des règles géographiques**
```python
# Update Web ACL with IP and geographic rules
wafv2.update_web_acl(
    Scope='REGIONAL',
    Id=web_acl_id,
    Name='ProductionWebACL',
    DefaultAction={'Allow': {}},
    Rules=[
        {
            'Name': 'BlockMaliciousIPs',
            'Priority': 0,  # Highest priority
            'Statement': {
                'IPSetReferenceStatement': {
                    'ARN': ip_set_arn
                }
            },
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'BlockedIPs'
            }
        },
        {
            'Name': 'GeoBlockHighRiskCountries',
            'Priority': 1,
            'Statement': {
                'GeoMatchStatement': {
                    'CountryCodes': ['KP', 'IR', 'SY']  # High-risk countries
                }
            },
            'Action': {'Block': {}},
            'VisibilityConfig': {
                'SampledRequestsEnabled': True,
                'CloudWatchMetricsEnabled': True,
                'MetricName': 'GeoBlocked'
            }
        },
        # ... existing managed rules ...
    ],
    VisibilityConfig={
        'SampledRequestsEnabled': True,
        'CloudWatchMetricsEnabled': True,
        'MetricName': 'ProductionWebACL'
    },
    LockToken=response['LockToken']
)

print("IP and geographic blocking rules added")
```
**Étape 3 : Mettre à jour l'ensemble d'adresses IP de manière dynamique**
```python
# Add new malicious IP to existing IP set
def block_ip(ip_address):
    """Add IP to blocked IP set"""
    
    # Get current IP set
    ip_set = wafv2.get_ip_set(
        Scope='REGIONAL',
        Id=ip_set_id,
        Name='BlockedIPs'
    )
    
    # Add new IP
    current_ips = ip_set['IPSet']['Addresses']
    current_ips.append(ip_address)
    
    # Update IP set
    wafv2.update_ip_set(
        Scope='REGIONAL',
        Id=ip_set_id,
        Name='BlockedIPs',
        Description='Known malicious IP addresses',
        Addresses=current_ips,
        LockToken=ip_set['LockToken']
    )
    
    print(f"Blocked IP: {ip_address}")

# Usage
block_ip('198.51.100.75/32')
```
### Lab 3 : Activer Shield Advanced

**Objectif :** Activez Shield Advanced avec la prise en charge de l'équipe de réponse DDoS.

**Étape 1 : Abonnez-vous à Shield Advanced**
```python
shield = boto3.client('shield', region_name='us-east-1')  # Shield is global

# Subscribe to Shield Advanced
try:
    shield.create_subscription()
    print("Subscribed to Shield Advanced")
    print("Cost: $3,000/month")
except shield.exceptions.ResourceAlreadyExistsException:
    print("Already subscribed to Shield Advanced")

# Enable proactive engagement
shield.associate_proactive_engagement_details(
    EmergencyContactList=[
        {
            'EmailAddress': 'security@example.com',
            'PhoneNumber': '+1-555-0100',
            'ContactNotes': 'Primary security contact'
        },
        {
            'EmailAddress': 'oncall@example.com',
            'PhoneNumber': '+1-555-0200',
            'ContactNotes': 'On-call engineer'
        }
    ]
)

print("Proactive engagement enabled")
```
**Étape 2 : Ajouter des ressources protégées**
```python
# Protect CloudFront distribution
cloudfront_arn = 'arn:aws:cloudfront::123456789012:distribution/E1234567890ABC'

shield.create_protection(
    Name='ProductionCloudFront',
    ResourceArn=cloudfront_arn,
    Tags=[
        {'Key': 'Environment', 'Value': 'Production'}
    ]
)

print(f"Protected CloudFront distribution: {cloudfront_arn}")

# Protect Application Load Balancer
alb_arn = 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234567890abcdef'

shield.create_protection(
    Name='ProductionALB',
    ResourceArn=alb_arn
)

print(f"Protected ALB: {alb_arn}")

# Protect Elastic IP (for EC2/NLB)
eip_allocation = 'eipalloc-12345678'

shield.create_protection(
    Name='ProductionEIP',
    ResourceArn=f'arn:aws:ec2:us-east-1:123456789012:eip-allocation/{eip_allocation}'
)

print(f"Protected Elastic IP: {eip_allocation}")
```
**Étape 3 : Configurer la détection basée sur l'état**
```python
# Create Route 53 health check
route53 = boto3.client('route53')

health_check = route53.create_health_check(
    HealthCheckConfig={
        'Type': 'HTTPS',
        'ResourcePath': '/health',
        'FullyQualifiedDomainName': 'example.com',
        'Port': 443,
        'RequestInterval': 30,
        'FailureThreshold': 3
    }
)

health_check_id = health_check['HealthCheck']['Id']

# Associate with Shield protection
shield.associate_health_check(
    ProtectionId='protection-id',  # From create_protection response
    HealthCheckArn=f'arn:aws:route53:::healthcheck/{health_check_id}'
)

print("Health-based detection configured")

# Configure alarm
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_alarm(
    AlarmName='ShieldHealthCheckFailed',
    MetricName='HealthCheckStatus',
    Namespace='AWS/Route53',
    Statistic='Minimum',
    Period=60,
    EvaluationPeriods=2,
    Threshold=1,
    ComparisonOperator='LessThanThreshold',
    Dimensions=[
        {'Name': 'HealthCheckId', 'Value': health_check_id}
    ],
    AlarmActions=[
        'arn:aws:sns:us-east-1:123456789012:security-alerts'
    ]
)
```
## Connaissances au niveau de la production

### Tests et validation WAF

**Règles de test en mode COUNT :**
```python
# Before blocking, test rules in COUNT mode
def test_waf_rule(web_acl_id, rule_config):
    """Test WAF rule without blocking traffic"""
    
    # Add rule in COUNT mode
    rule_config['Action'] = {'Count': {}}  # COUNT instead of BLOCK
    
    # Update Web ACL
    wafv2.update_web_acl(
        Scope='REGIONAL',
        Id=web_acl_id,
        # ... (existing configuration)
        Rules=[rule_config],
        LockToken=response['LockToken']
    )
    
    print("Rule deployed in COUNT mode - monitoring for 24 hours")
    
    # Wait 24 hours, monitor metrics
    time.sleep(86400)
    
    # Analyze blocked request count
    cloudwatch = boto3.client('cloudwatch')
    
    metrics = cloudwatch.get_metric_statistics(
        Namespace='AWS/WAFV2',
        MetricName='CountedRequests',
        Dimensions=[
            {'Name': 'WebACL', 'Value': web_acl_id},
            {'Name': 'Rule', 'Value': rule_config['Name']}
        ],
        StartTime=datetime.utcnow() - timedelta(days=1),
        EndTime=datetime.utcnow(),
        Period=3600,
        Statistics=['Sum']
    )
    
    total_counted = sum(point['Sum'] for point in metrics['Datapoints'])
    
    print(f"Requests that would be blocked: {total_counted}")
    
    # Review sampled requests
    samples = wafv2.get_sampled_requests(
        WebAclArn=web_acl_arn,
        RuleMetricName=rule_config['VisibilityConfig']['MetricName'],
        Scope='REGIONAL',
        TimeWindow={
            'StartTime': datetime.utcnow() - timedelta(hours=3),
            'EndTime': datetime.utcnow()
        },
        MaxItems=100
    )
    
    print(f"Sampled requests: {len(samples['SampledRequests'])}")
    
    # Analyze for false positives
    for sample in samples['SampledRequests']:
        request = sample['Request']
        print(f"  URI: {request['URI']}")
        print(f"  Method: {request['Method']}")
        print(f"  Country: {request['Country']}")
        print(f"  Client IP: {request['ClientIP']}")
        print(f"  Weight: {sample['Weight']}")  # Request frequency
    
    # Decision: Enable blocking if false positive rate acceptable
    false_positive_rate = 0.01  # 1% threshold
    
    if total_counted > 0:
        # Manual review or automated analysis
        decision = input("Enable blocking? (yes/no): ")
        
        if decision.lower() == 'yes':
            rule_config['Action'] = {'Block': {}}
            wafv2.update_web_acl(...)
            print("Rule enabled in BLOCK mode")

# Testing workflow
test_waf_rule(web_acl_id, new_rule_config)
```
**Gestion des faux positifs :**
```
Common False Positive Scenarios:

1. Legitimate Tools Flagged as Bots:
   Issue: Security scanners, monitoring tools blocked
   Solution: Whitelist known scanner IPs
   
   Example:
   {
     "Name": "AllowSecurityScanners",
     "Priority": 0,  # Before bot rules
     "Statement": {
       "IPSetReferenceStatement": {
         "ARN": "arn:aws:wafv2:...:ipset/scanner-whitelist"
       }
     },
     "Action": {"Allow": {}}  # Explicitly allow
   }

2. SQL-like Strings in Legitimate Data:
   Issue: Product names containing SQL keywords blocked
   Example: Product "Select Collection"
   Solution: Exclude specific paths from SQL injection rules
   
   {
     "Name": "SQLInjectionExcludeProducts",
     "Statement": {
       "AndStatement": {
         "Statements": [
           {
             "SqliMatchStatement": {...}
           },
           {
             "NotStatement": {
               "ByteMatchStatement": {
                 "SearchString": "/api/products",
                 "FieldToMatch": {"UriPath": {}}
               }
             }
           }
         ]
       }
     }
   }

3. Aggressive Rate Limiting:
   Issue: Legitimate users blocked during high usage
   Example: User downloading 100 images (design portfolio)
   Solution: Increase rate limit or whitelist authenticated users
   
   {
     "RateBasedStatement": {
       "Limit": 5000,  // Increased from 2000
       "AggregateKeyType": "IP",
       "ScopeDownStatement": {
         "NotStatement": {
           "ByteMatchStatement": {
             "SearchString": "authenticated=true",
             "FieldToMatch": {"SingleHeader": {"Name": "cookie"}}
           }
         }
       }
     }
   }

False Positive Management Process:
1. Deploy rule in COUNT mode (1-2 weeks)
2. Monitor CloudWatch metrics
3. Review sampled requests
4. Identify false positives
5. Adjust rule or add exceptions
6. Re-test in COUNT mode
7. Enable BLOCK mode
8. Continuous monitoring
9. Iterate based on feedback
```
### Automatisation de la réponse aux incidents

**Réponse automatisée aux attaques :**
```python
# Lambda function: Automatically respond to WAF blocks
import boto3
import json

wafv2 = boto3.client('wafv2')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Automatically respond to high-volume attacks
    Triggered by CloudWatch alarm on BlockedRequests metric
    """
    
    # Parse alarm
    alarm = json.loads(event['Records'][0]['Sns']['Message'])
    metric_name = alarm['Trigger']['MetricName']
    
    if metric_name == 'BlockedRequests':
        # High volume of blocked requests detected
        blocked_count = alarm['NewStateValue']
        
        print(f"Attack detected: {blocked_count} blocked requests")
        
        # Option 1: Enable more aggressive rate limiting
        update_rate_limit(1000)  # Reduce from 2000 to 1000
        
        # Option 2: Enable challenge for suspicious traffic
        enable_captcha()
        
        # Option 3: Temporarily block entire countries (if attack localized)
        block_attack_source()
        
        # Notify security team
        notify_security_team(alarm)
        
        return {'statusCode': 200, 'body': 'Attack response activated'}

def update_rate_limit(new_limit):
    """Temporarily reduce rate limit during attack"""
    
    # Get current Web ACL
    web_acl = wafv2.get_web_acl(
        Scope='REGIONAL',
        Id='web-acl-id',
        Name='ProductionWebACL'
    )
    
    # Find rate limit rule
    for rule in web_acl['WebACL']['Rules']:
        if rule['Name'] == 'RateLimitRule':
            rule['Statement']['RateBasedStatement']['Limit'] = new_limit
    
    # Update Web ACL
    wafv2.update_web_acl(
        Scope='REGIONAL',
        Id='web-acl-id',
        Name='ProductionWebACL',
        DefaultAction=web_acl['WebACL']['DefaultAction'],
        Rules=web_acl['WebACL']['Rules'],
        VisibilityConfig=web_acl['WebACL']['VisibilityConfig'],
        LockToken=web_acl['LockToken']
    )
    
    print(f"Rate limit reduced to {new_limit} requests/5min")

def enable_captcha():
    """Enable CAPTCHA challenge for suspicious traffic"""
    
    # Add CAPTCHA rule
    captcha_rule = {
        'Name': 'CaptchaChallenge',
        'Priority': 5,
        'Statement': {
            'RateBasedStatement': {
                'Limit': 100,
                'AggregateKeyType': 'IP'
            }
        },
        'Action': {
            'Captcha': {
                'CustomRequestHandling': {
                    'InsertHeaders': [
                        {'Name': 'X-Challenge-Reason', 'Value': 'RateLimitExceeded'}
                    ]
                }
            }
        },
        'VisibilityConfig': {
            'SampledRequestsEnabled': True,
            'CloudWatchMetricsEnabled': True,
            'MetricName': 'CaptchaChallenge'
        }
    }
    
    # Add to Web ACL
    # ... (similar update process)
    
    print("CAPTCHA challenge enabled")

def block_attack_source():
    """Block source of attack based on logs"""
    
    # Query WAF logs for top attacking IPs
    logs = boto3.client('logs')
    
    query = """
    fields httpRequest.clientIp, httpRequest.country
    | filter action = "BLOCK"
    | stats count() as blocked_count by httpRequest.clientIp, httpRequest.country
    | sort blocked_count desc
    | limit 10
    """
    
    response = logs.start_query(
        logGroupName='/aws/wafv2/logs',
        startTime=int((datetime.now() - timedelta(minutes=15)).timestamp()),
        endTime=int(datetime.now().timestamp()),
        queryString=query
    )
    
    # Wait for query results
    query_id = response['queryId']
    time.sleep(5)
    
    results = logs.get_query_results(queryId=query_id)
    
    # Analyze top attackers
    top_ips = []
    top_countries = set()
    
    for result in results['results']:
        ip = result[0]['value']
        country = result[1]['value']
        count = int(result[2]['value'])
        
        if count > 1000:  # Threshold: 1000 blocked requests
            top_ips.append(ip)
            top_countries.add(country)
    
    # Block top attacking IPs
    if top_ips:
        # Update IP set
        ip_set = wafv2.get_ip_set(...)
        current_ips = ip_set['IPSet']['Addresses']
        current_ips.extend([f"{ip}/32" for ip in top_ips])
        
        wafv2.update_ip_set(
            Scope='REGIONAL',
            Id=ip_set_id,
            Name='BlockedIPs',
            Addresses=current_ips,
            LockToken=ip_set['LockToken']
        )
        
        print(f"Blocked {len(top_ips)} attacking IPs")
    
    # Temporarily block attacking countries (if concentrated)
    if len(top_countries) <= 3:
        # Attack from few countries - safe to block
        geo_rule = {
            'Name': 'EmergencyGeoBlock',
            'Priority': 0,
            'Statement': {
                'GeoMatchStatement': {
                    'CountryCodes': list(top_countries)
                }
            },
            'Action': {'Block': {}}
        }
        
        # Add to Web ACL
        # ...
        
        print(f"Temporarily blocked countries: {top_countries}")

def notify_security_team(alarm):
    """Send detailed alert to security team"""
    
    message = f"""
    WAF ATTACK DETECTED
    
    Alarm: {alarm['AlarmName']}
    Metric: {alarm['Trigger']['MetricName']}
    Threshold Exceeded: {alarm['NewStateValue']}
    
    Automated Response Activated:
    - Rate limit reduced to 1000 req/5min
    - CAPTCHA challenge enabled
    - Top attacking IPs blocked
    
    Dashboard: https://console.aws.amazon.com/wafv2/
    Logs: https://console.aws.amazon.com/cloudwatch/
    
    Actions Taken: Automatic mitigation in progress
    Manual Review: Required within 1 hour
    """
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:security-incidents',
        Subject='WAF Attack - Automated Response Activated',
        Message=message
    )

# EventBridge rule triggers Lambda on high blocked requests
```
### Optimisation des coûts

**Structure des coûts du WAF :**
```
WAF Pricing:

Web ACL: $5/month per Web ACL
Rules: $1/month per rule
Request Processing: $0.60 per million requests

Managed Rule Groups (Example):
- Core Rule Set: $1/month + $0.60/million requests
- Bot Control: $10/month + $1/million requests
- Additional rules: $1-2/month each

Example Monthly Cost:

Small Website (10 million requests/month):
- Web ACL: $5
- Rules (5 rules): $5
- Core Rule Set: $1
- Requests: 10M × $0.60 = $6
- Total: $17/month

Medium Website (100 million requests/month):
- Web ACL: $5
- Rules (8 rules): $8
- Managed rules (3): $3
- Requests: 100M × $0.60 = $60
- Total: $76/month

Large Website (1 billion requests/month):
- Web ACL: $5
- Rules (15 rules): $15
- Managed rules (5): $15
- Bot Control: $10
- Requests: 1B × $1.10 = $1,100 (blended rate)
- Total: $1,145/month

Shield Advanced:
- Base: $3,000/month
- Included: WAF at no charge
- Requests: Charged at WAF rates
- Cost protection: Credits for attack traffic

Optimization Strategies:

1. Consolidate Rules:
   Bad: 10 simple rules (10 × $1 = $10/month)
   Good: 2 complex rules (2 × $1 = $2/month)
   Savings: $8/month

2. Use Managed Rule Groups:
   - AWS-maintained (rapid updates)
   - No custom rule WCU consumption
   - Often cheaper than custom equivalent

3. Sample Logging:
   - Log 1% of requests instead of 100%
   - Reduces S3/CloudWatch costs
   - Still sufficient for analysis
   - Savings: 99% of logging costs

4. CloudFront + WAF:
   - Cache at edge (reduce requests to origin)
   - WAF charged per request processed
   - Higher cache hit ratio = lower WAF costs
   
   Example:
   Without caching: 1B requests = $1,100 WAF cost
   With 90% cache: 100M requests = $110 WAF cost
   Savings: $990/month

5. Rate Limiting:
   - Blocks excessive requests before processing
   - Reduces billable requests
   - Protects against DDoS and cost attacks

Shield Advanced ROI:

Break-even Analysis:
Cost: $3,000/month = $36,000/year
Revenue/hour: $50,000 (typical e-commerce)
Downtime from DDoS: 2 hours/year
Lost revenue: $100,000/year

ROI: $100,000 - $36,000 = $64,000/year (178%)

Additional benefits:
- Cost protection (DDoS traffic credits)
- DRT support (faster mitigation)
- Reduced reputation damage
- Compliance (SLA uptime)
```
## Conseils \& Bonnes pratiques

### Conseils de configuration du WAF

**Astuce 1 : Commencez par les groupes de règles gérés**
Utilisez les règles gérées par AWS pour la protection OWASP Top 10 : mises à jour en permanence, aucune maintenance requise.

**Astuce 2 : Déployez d'abord les règles en mode COUNT**
Testez toutes les règles en mode COUNT pendant 1 à 2 semaines avant de bloquer : identifie les faux positifs en toute sécurité.

**Astuce 3 : implémentez une limitation de débit en couches**
Utilisez plusieurs limites de débit : globale (10 000/5 min), API (1 000 /5 min), connexion (10/5 min) : protège différents vecteurs d'attaque.

**Astuce 4 : Activer l'échantillonnage des demandes**
Des exemples de requêtes fournissent un contexte de débogage, essentiel pour enquêter sur le trafic légitime bloqué.

**Astuce 5 : Utilisez les ensembles de modèles Regex pour plus d'efficacité**
Regroupez les modèles similaires dans des ensembles d’expressions régulières : réduit la consommation de WCU et facilite la gestion.

### Conseils sur le bouclier et la protection DDoS

**Astuce 6 : Activez Shield Advanced pour les applications critiques**
Une perte de revenus > 125 $/heure justifie un coût de 3 000 $/mois (inclut la prise en charge DRT et la protection des coûts).

**Astuce 7 : Configurez la détection basée sur l'état**
Associer les vérifications de l'état de Route 53 à Shield : permet une détection automatique des attaques en fonction de l'état de l'application.

**Astuce 8 : implémentez une limitation au niveau de l'application**
WAF + limitation des applications fournit une défense en profondeur : WAF bloque les attaques, les limitations des applications empêchent l'épuisement des ressources.

**Astuce 9 : Utilisez CloudFront avec Shield Standard**
CloudFront + Shield Standard protège gratuitement 96 % des attaques DDoS : une excellente protection de base.

**Astuce 10 : Documentez les procédures de réponse aux incidents**
Conservez des runbooks pour les attaques courantes : permet une réponse rapide lorsque des attaques se produisent.

### Conseils de surveillance et de journalisation

**Astuce 11 : Interrogez les journaux WAF avec Athena**
Stockez les journaux dans S3, interrogez avec Athena : analyse rentable de millions de requêtes.

**Astuce 12 : Définissez des alarmes CloudWatch sur les demandes bloquées**
Alerte lorsque les requêtes bloquées dépassent la ligne de base normale : détection précoce des attaques.

**Astuce 13 : Créez des tableaux de bord personnalisés**
Visualisez les schémas d'attaque, les principales adresses IP bloquées et la répartition géographique : permet une connaissance rapide de la situation.

**Astuce 14 : Intégrez avec SIEM**
Envoyez des journaux WAF à Splunk/QRadar via Kinesis Firehose : surveillance de sécurité centralisée.

**Astuce 15 : Supprimez les données sensibles des journaux**
Rédigez les en-têtes d’autorisation, les cookies, les clés API : conformité et protection de la vie privée.

## Pièges \& Remèdes

### Piège 1 : les faux positifs bloquent le trafic légitime

**Problème :** Les règles WAF bloquent les utilisateurs légitimes, provoquant des interruptions de service et des plaintes de clients.

**Pourquoi cela arrive :**

- Règles gérées trop agressives sans réglage
- Limites de débit trop strictes pour les modèles d'utilisation réels
- Le blocage géographique affecte les utilisateurs internationaux légitimes
- Règles d'injection SQL déclenchées par des données légitimes
- Détection de robots bloquant les outils automatisés (monitoring, CI/CD)

**Impact :**

- Perte de revenus due aux achats bloqués
- Frustration et désabonnement des clients
- Prise en charge de l'augmentation des tickets
- Avis négatifs et atteinte à la réputation
- Temps de débogage de l'équipe de développement perdu

**Exemple :**
```
Scenario: E-commerce site enables Core Rule Set
Day 1: 500 legitimate users blocked
Issue: Product search for "O'Reilly Books" triggers SQL injection rule
Pattern: Single quote in product name flagged as SQLi attempt
Customer impact: Cannot search for products, abandon cart
Revenue loss: $50,000 in lost sales (one day)
```
**Remède :**

**Étape 1 : Toujours tester en mode COUNT**
```python
# Deploy new rules in COUNT mode first
def deploy_rule_safely(rule_config):
    """Deploy rule in COUNT mode, monitor, then enable blocking"""
    
    # Override action to COUNT
    rule_config['Action'] = {'Count': {}}
    
    # Deploy
    wafv2.update_web_acl(...)
    
    print("Rule deployed in COUNT mode")
    print("Monitoring for 7 days before enabling BLOCK")
    
    # Schedule reminder to review
    scheduler = boto3.client('events')
    
    scheduler.put_rule(
        Name=f"review-{rule_config['Name']}",
        ScheduleExpression='rate(7 days)',
        State='ENABLED'
    )
    
    scheduler.put_targets(
        Rule=f"review-{rule_config['Name']}",
        Targets=[{
            'Id': '1',
            'Arn': 'arn:aws:sns:region:account:waf-rule-review',
            'Input': json.dumps({
                'message': f"Review {rule_config['Name']} and enable BLOCK if ready"
            })
        }]
    )
```
**Étape 2 : Analyser les demandes échantillonnées**
```python
def analyze_false_positives(web_acl_arn, rule_name, days=7):
    """Analyze requests that would be blocked"""
    
    wafv2 = boto3.client('wafv2')
    
    # Get sampled requests
    samples = wafv2.get_sampled_requests(
        WebAclArn=web_acl_arn,
        RuleMetricName=rule_name,
        Scope='REGIONAL',
        TimeWindow={
            'StartTime': datetime.utcnow() - timedelta(days=days),
            'EndTime': datetime.utcnow()
        },
        MaxItems=500  # Maximum samples
    )
    
    # Analyze patterns
    false_positives = []
    
    for sample in samples['SampledRequests']:
        request = sample['Request']
        
        # Check if legitimate traffic
        # Heuristics:
        # - Known user agents (browsers)
        # - Reasonable request rate
        # - Complete headers
        
        user_agent = next((h['Value'] for h in request['Headers'] if h['Name'].lower() == 'user-agent'), None)
        
        is_browser = any(browser in user_agent.lower() for browser in ['mozilla', 'chrome', 'safari', 'firefox'])
        has_referer = any(h['Name'].lower() == 'referer' for h in request['Headers'])
        
        if is_browser and has_referer:
            # Likely legitimate user
            false_positives.append({
                'uri': request['URI'],
                'method': request['Method'],
                'user_agent': user_agent,
                'country': request['Country'],
                'weight': sample['Weight']  # Request frequency
            })
    
    # Report false positives
    if false_positives:
        print(f"⚠️  {len(false_positives)} potential false positives detected:")
        
        for fp in false_positives[:10]:
            print(f"  - {fp['method']} {fp['uri']} from {fp['country']}")
            print(f"    User-Agent: {fp['user_agent'][:50]}...")
            print(f"    Frequency: {fp['weight']} samples")
        
        return false_positives
    else:
        print("✓ No false positives detected - safe to enable BLOCK mode")
        return []

# Run analysis before enabling blocking
fps = analyze_false_positives(web_acl_arn, 'SQLInjectionRule')

if len(fps) > 10:
    print("⚠️  High false positive rate - rule needs tuning")
```
**Étape 3 : implémenter des règles d'exception**
```python
# Whitelist legitimate patterns that trigger rules
def add_exception_rule(web_acl_id, exception_pattern):
    """Add exception for known false positives"""
    
    exception_rule = {
        'Name': 'SQLInjectionException',
        'Priority': 5,  # Before SQLi rule
        'Statement': {
            'AndStatement': {
                'Statements': [
                    {
                        'ByteMatchStatement': {
                            'SearchString': '/api/products/search',
                            'FieldToMatch': {'UriPath': {}},
                            'TextTransformations': [{'Priority': 0, 'Type': 'NONE'}],
                            'PositionalConstraint': 'STARTS_WITH'
                        }
                    },
                    {
                        'ByteMatchStatement': {
                            'SearchString': "'",  # Single quote (SQLi trigger)
                            'FieldToMatch': {'QueryString': {}},
                            'TextTransformations': [{'Priority': 0, 'Type': 'NONE'}],
                            'PositionalConstraint': 'CONTAINS'
                        }
                    }
                ]
            }
        },
        'Action': {'Allow': {}},  # Explicitly allow
        'VisibilityConfig': {
            'SampledRequestsEnabled': True,
            'CloudWatchMetricsEnabled': True,
            'MetricName': 'SQLInjectionException'
        }
    }
    
    # Add to Web ACL
    wafv2.update_web_acl(...)
    
    print("Exception rule added for product search with quotes")
```
**Étape 4 : Déploiement progressif**
```
Phase 1: COUNT Mode (2 weeks)
- Monitor all matched requests
- Identify false positives
- Adjust rules or add exceptions

Phase 2: BLOCK Mode (10% traffic)
- Use CloudFront weighted distribution
- 10% traffic sees BLOCK, 90% sees COUNT
- Monitor customer impact

Phase 3: BLOCK Mode (50% traffic)
- Increase to 50% if no issues
- Continue monitoring

Phase 4: BLOCK Mode (100% traffic)
- Full rollout
- Ongoing monitoring for new false positives
```
**Prévention :**

- N'activez jamais le mode BLOCK sans tester COUNT
- Maintenir la documentation des règles d'exception
- Surveiller les canaux de feedback clients
- Mettre en place des procédures de restauration simples
- Testez avec des modèles de trafic réalistes
- Examiner les demandes échantillonnées chaque semaine

***

### Piège 2 : configuration de limitation de débit insuffisante

**Problème :** Des limites de débit trop élevées autorisent les attaques, ou des limites de débit trop faibles bloquent le trafic légitime.

**Pourquoi cela arrive :**

- Les limites par défaut ne correspondent pas à l'utilisation de l'application
- Limite de débit globale unique pour tous les points finaux
- Aucune considération pour les authentifiés ou les anonymes
- Les modèles de trafic de pointe non analysés
- Aucun test en conditions réelles

**Impact :**

- Les attaques DDoS submergent l'application
- Utilisateurs légitimes bloqués lors des pics de trafic
- Les attaques de credential stuffing réussissent
- L'abus de l'API continue sans contrôle

**Exemple :**
```
Configuration: 2000 req/5min per IP (default)

Attack Scenario:
- 10,000 bot IPs
- Each sends 1999 requests (just under limit)
- Total: 19.99 million requests/5min
- Application overwhelmed
- Rate limit ineffective

Legitimate Use Case:
- User browsing image gallery
- Loads 50 images per page
- Views 5 pages = 250 requests
- Blocked by overly strict limit
```
**Remède :**

**Étape 1 : Analyser le trafic de base**
```python
def analyze_traffic_patterns():
    """Analyze CloudWatch metrics to determine appropriate rate limits"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Query request rate per IP (last 30 days)
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='RequestCount',
        Dimensions=[
            {'Name': 'LoadBalancer', 'Value': 'app/my-alb/1234567890abcdef'}
        ],
        StartTime=datetime.utcnow() - timedelta(days=30),
        EndTime=datetime.utcnow(),
        Period=300,  # 5-minute periods
        Statistics=['Sum', 'Maximum'],
        ExtendedStatistics=['p95', 'p99']
    )
    
    # Analyze percentiles
    p95_requests = [point for point in response['Datapoints'] if 'ExtendedStatistics' in point]
    
    print("Traffic Analysis (5-minute windows):")
    print(f"P95: {statistics.mean([p['ExtendedStatistics']['p95'] for p in p95_requests]):.0f} requests")
    print(f"P99: {statistics.mean([p['ExtendedStatistics']['p99'] for p in p95_requests]):.0f} requests")
    
    # Recommendation: P99 × 1.5 (50% headroom)
    recommended_limit = int(statistics.mean([p['ExtendedStatistics']['p99'] for p in p95_requests]) * 1.5)
    
    print(f"\nRecommended rate limit: {recommended_limit} requests/5min")
    
    return recommended_limit

# Determine appropriate limits
baseline_limit = analyze_traffic_patterns()
```
**Étape 2 : Mettre en œuvre une limitation de débit échelonnée**
```python
# Different limits for different endpoints and auth states
tiered_limits = {
    'global': {
        'limit': 5000,  # Generous global limit
        'priority': 100  # Low priority (last resort)
    },
    'api_endpoints': {
        'limit': 1000,  # API-specific limit
        'priority': 50,
        'path': '/api/*'
    },
    'login_unauthenticated': {
        'limit': 10,  # Strict login limit
        'priority': 10,  # High priority (checked first)
        'path': '/api/login'
    },
    'authenticated_users': {
        'limit': 2000,  # Higher limit for logged-in users
        'priority': 20,
        'header': 'Authorization'  # Has auth token
    }
}

# Create rate limit rules
for name, config in tiered_limits.items():
    rule = {
        'Name': f'RateLimit_{name}',
        'Priority': config['priority'],
        'Statement': {
            'RateBasedStatement': {
                'Limit': config['limit'],
                'AggregateKeyType': 'IP'
            }
        },
        'Action': {'Block': {}},
        'VisibilityConfig': {
            'SampledRequestsEnabled': True,
            'CloudWatchMetricsEnabled': True,
            'MetricName': f'RateLimit_{name}'
        }
    }
    
    # Add scope-down statement if path or header specified
    if 'path' in config:
        rule['Statement']['RateBasedStatement']['ScopeDownStatement'] = {
            'ByteMatchStatement': {
                'SearchString': config['path'],
                'FieldToMatch': {'UriPath': {}},
                'TextTransformations': [{'Priority': 0, 'Type': 'NONE'}],
                'PositionalConstraint': 'STARTS_WITH'
            }
        }
    
    # Add to Web ACL
    # ...
```
**Étape 3 : Ajustement dynamique du taux**
```python
# Automatically adjust rate limits based on attack detection
def adjust_rate_limits_during_attack():
    """Reduce rate limits when attack detected"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Check blocked request rate
    metrics = cloudwatch.get_metric_statistics(
        Namespace='AWS/WAFV2',
        MetricName='BlockedRequests',
        Dimensions=[
            {'Name': 'WebACL', 'Value': 'ProductionWebACL'}
        ],
        StartTime=datetime.utcnow() - timedelta(minutes=5),
        EndTime=datetime.utcnow(),
        Period=300,
        Statistics=['Sum']
    )
    
    blocked_count = metrics['Datapoints'][0]['Sum'] if metrics['Datapoints'] else 0
    
    # Attack threshold: > 10,000 blocked requests in 5 minutes
    if blocked_count > 10000:
        print(f"Attack detected: {blocked_count} blocked requests")
        
        # Reduce rate limits by 50%
        new_limits = {
            'global': 2500,  # From 5000
            'api_endpoints': 500,  # From 1000
            'login': 5  # From 10
        }
        
        # Update Web ACL
        for name, limit in new_limits.items():
            update_rate_limit_rule(name, limit)
        
        print("Rate limits reduced during attack")
        
        # Schedule restoration after 1 hour
        lambda_client = boto3.client('lambda')
        
        lambda_client.invoke(
            FunctionName='RestoreRateLimits',
            InvocationType='Event',  # Async
            Payload=json.dumps({'delay_seconds': 3600})
        )
```
**Prévention :**

- Analyser le trafic de base avant de fixer des limites
- Implémenter des limites à plusieurs niveaux (globales, API, authentification)
- Tester les limites en cas de trafic de pointe
- Surveiller les alarmes de limite de débit
- Documenter les modèles d'utilisation attendus
- Ajuster les limites en fonction de la croissance des applications

***

### Piège 3 : journalisation et surveillance inadéquates

**Problème :** Incidents de sécurité non détectés en raison de journaux ou d'alertes manquants.

**Pourquoi cela arrive :**

- La journalisation n'est pas activée lors du déploiement
- Journaux non intégrés aux systèmes de surveillance
- Aucune alarme CloudWatch configurée
- Analyse des logs trop manuelle/lente
- Des problèmes de coûts empêchent une journalisation complète

**Impact :**

- Les attaques continuent sans être détectées
- Impossible d'enquêter sur les incidents (aucune preuve)
- Violations de conformité (pas de piste d'audit)
- Réponse lente aux incidents
- Impossible de régler les règles WAF

**Exemple :**
```
Incident: Credential stuffing attack on login endpoint
Duration: 72 hours before detection
Attempts: 50 million login attempts
Compromised: 150 accounts (weak passwords)
Root cause: No alerting on failed login spike
Detection: Customer complaints about unauthorized access
```
**Remède :**

**Étape 1 : Activer la journalisation complète**
```python
# Enable WAF logging to all destinations
def enable_comprehensive_logging(web_acl_arn):
    """Enable logging to S3, CloudWatch, and Kinesis"""
    
    wafv2 = boto3.client('wafv2')
    
    # Log to S3 (long-term storage)
    wafv2.put_logging_configuration(
        LoggingConfiguration={
            'ResourceArn': web_acl_arn,
            'LogDestinationConfigs': [
                'arn:aws:s3:::waf-logs-production',
                'arn:aws:logs:us-east-1:123456789012:log-group:aws-waf-logs-production',
                'arn:aws:firehose:us-east-1:123456789012:deliverystream/waf-logs-stream'
            ],
            'RedactedFields': [
                {'SingleHeader': {'Name': 'authorization'}},
                {'SingleHeader': {'Name': 'cookie'}},
                {'SingleHeader': {'Name': 'x-api-key'}}
            ],
            'LoggingFilter': {
                'DefaultBehavior': 'KEEP',
                'Filters': [
                    {
                        'Behavior': 'KEEP',
                        'Conditions': [
                            {
                                'ActionCondition': {'Action': 'BLOCK'}
                            }
                        ],
                        'Requirement': 'MEETS_ANY'
                    }
                ]
            }
        }
    )
    
    print("Comprehensive logging enabled")
    print("- S3: Long-term storage")
    print("- CloudWatch: Real-time analysis")
    print("- Kinesis: Streaming to SIEM")
```
**Étape 2 : Créer des alarmes CloudWatch**
```python
def create_security_alarms():
    """Create CloudWatch alarms for security events"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    alarms = [
        {
            'name': 'WAF-HighBlockedRequests',
            'metric': 'BlockedRequests',
            'threshold': 1000,
            'evaluation_periods': 2,
            'period': 300,  # 5 minutes
            'severity': 'HIGH'
        },
        {
            'name': 'WAF-RateLimitExceeded',
            'metric': 'CountedRequests',
            'threshold': 500,
            'evaluation_periods': 1,
            'period': 300,
            'severity': 'MEDIUM'
        },
        {
            'name': 'Shield-DDoSDetected',
            'metric': 'DDoSDetected',
            'threshold': 1,
            'evaluation_periods': 1,
            'period': 60,
            'severity': 'CRITICAL'
        }
    ]
    
    for alarm_config in alarms:
        cloudwatch.put_metric_alarm(
            AlarmName=alarm_config['name'],
            MetricName=alarm_config['metric'],
            Namespace='AWS/WAFV2',
            Statistic='Sum',
            Period=alarm_config['period'],
            EvaluationPeriods=alarm_config['evaluation_periods'],
            Threshold=alarm_config['threshold'],
            ComparisonOperator='GreaterThanThreshold',
            Dimensions=[
                {'Name': 'WebACL', 'Value': 'ProductionWebACL'}
            ],
            AlarmActions=[
                'arn:aws:sns:us-east-1:123456789012:security-alerts'
            ],
            AlarmDescription=f"{alarm_config['severity']} severity security event"
        )
        
        print(f"Created alarm: {alarm_config['name']}")
```
**Étape 3 : Analyse automatisée des journaux**
```python
# Query WAF logs for security insights
def analyze_attack_patterns():
    """Analyze WAF logs for attack patterns"""
    
    logs = boto3.client('logs')
    
    # Query for top blocked IPs
    query = """
    fields httpRequest.clientIp, httpRequest.country, terminatingRuleId, @timestamp
    | filter action = "BLOCK"
    | stats count() as blocked_count by httpRequest.clientIp, httpRequest.country, terminatingRuleId
    | sort blocked_count desc
    | limit 20
    """
    
    response = logs.start_query(
        logGroupName='/aws/wafv2/logs/production',
        startTime=int((datetime.now() - timedelta(hours=24)).timestamp()),
        endTime=int(datetime.now().timestamp()),
        queryString=query
    )
    
    # Wait for results
    query_id = response['queryId']
    time.sleep(5)
    
    results = logs.get_query_results(queryId=query_id)
    
    # Analyze patterns
    print("Top Attacking Sources (last 24 hours):")
    for result in results['results'][:10]:
        ip = result[0]['value']
        country = result[1]['value']
        rule = result[2]['value']
        count = result[3]['value']
        
        print(f"  {ip} ({country}): {count} blocked by {rule}")
    
    # Additional queries for different patterns
    attack_types = [
        "SQL Injection",
        "XSS",
        "Path Traversal",
        "Rate Limiting"
    ]
    
    for attack_type in attack_types:
        # Query specific attack pattern
        # ...
        pass
    
    return results

# Run daily analysis
analyze_attack_patterns()
```
**Prévention :**

- Activer la connexion dès le premier jour
- Configurer des alarmes complètes
- Intégrer avec SIEM/surveillance
- Automatiser l'analyse des journaux
- Examiner les tableaux de bord de sécurité chaque semaine
- Documenter les procédures d'enquête

***

## Résumé du chapitre

AWS WAF et Shield offrent une protection complète contre les attaques d'applications Web et les menaces DDoS à grande échelle. WAF permet un filtrage granulaire des requêtes à l'aide de règles personnalisables, de groupes de règles gérés, d'une limitation de débit, d'une détection de robots et d'un blocage géographique pour se protéger contre les vulnérabilités OWASP Top 10, les exploits Zero Day et les attaques de couche applicative. Shield offre une protection DDoS permanente : Shield Standard atténue automatiquement et sans frais 96 % des attaques, tandis que Shield Advanced ajoute une protection au niveau des applications, une assistance 24h/24 et 7j/7 de l'équipe de réponse DDoS, une protection des coûts et une visibilité des attaques en temps réel pour les applications critiques.

**Principaux points à retenir :**

- **Déployez d'abord les groupes de règles gérés :** Les règles gérées par AWS fournissent immédiatement la protection OWASP Top 10 ; Ensemble de règles de base + mauvaises entrées connues + injection SQL couvrent la plupart des attaques pour 2 $/mois
- **Testez les règles en mode COUNT :** Déployez de nouvelles règles en mode COUNT pendant 1 à 2 semaines avant de bloquer ; empêche les faux positifs de bloquer le trafic légitime ; analyser les requêtes échantillonnées avant d'activer BLOC
- **Mettre en œuvre une limitation de débit par niveaux :** Utilisez plusieurs limites de débit : globale (5 000/5 min), API (1 000/5 min), connexion (10/5 min) ; protège les différents points finaux de manière appropriée ; empêche à la fois le DDoS et le blocage des utilisateurs légitimes
- **Activez Shield Standard partout :** Protection DDoS permanente incluse gratuitement avec CloudFront, Route 53, ALB, Global Accelerator ; atténue automatiquement 96 % des attaques DDoS
- **Envisagez Shield Advanced pour les applications critiques :** 3 000 $/mois justifiés lorsque la perte de revenus est > 125 $/heure due à un temps d'arrêt ; inclut la prise en charge DRT, la protection des coûts, la détection améliorée, WAF inclus
- **Activer la journalisation complète :** Connectez-vous à S3 (stockage), CloudWatch (alarmes), Kinesis (SIEM) ; rédiger les en-têtes sensibles ; essentiel pour les enquêtes sur les incidents et la conformité
- **Intégrer avec CloudFront :** CloudFront + WAF + Shield fournit une protection périphérique ; bloque les attaques avant d'atteindre l'origine ; réduit la latence et la charge d'origine

WAF et Shield s'intègrent de manière transparente aux services AWS abordés précédemment (protégeant les distributions CloudFront, les Application Load Balancers et les API REST API Gateway), tandis que Shield Standard protège automatiquement l'ensemble du réseau Edge AWS. Associés aux découvertes de Security Hub, à la détection des menaces GuardDuty et au chiffrement KMS, ces services assurent une sécurité de défense en profondeur, depuis la périphérie du réseau jusqu'au stockage des données.

## Exercice pratique en laboratoire

**Objectif :** Créez une protection complète des applications Web avec WAF, Shield, la surveillance et la réponse automatisée.

**Scénario :** Protégez le site Web de commerce électronique contre l'injection SQL, le credential stuffing et les attaques DDoS.

**Prérequis :**

- Compte AWS avec accès administrateur
- Application Load Balancer au service d'une application Web
-Distribution CloudFront (facultatif)

**Étapes :**

1. **Créer une ACL Web WAF (45 minutes)**
    - Créer une ACL Web régionale
    - Ajouter un ensemble de règles de base gérées par AWS
    - Ajouter un groupe de règles d'injection SQL
    - Ajouter un groupe de règles sur les mauvaises entrées connues
    - Tester les règles en mode COUNT
    - Collaborer avec ALB
2. **Configurer la limitation du débit (30 minutes)**
    - Ajouter une limite de débit globale (5 000 req/5min)
    - Ajouter une limite de débit API (1 000 req/5 min)
    - Ajouter une limite de taux de connexion (10 req/5min)
    - Tester avec l'outil de test de charge
    - Vérifier le blocage aux seuils
3. **Mettre en œuvre le blocage géographique et IP (20 minutes)**
    - Créer un ensemble d'adresses IP pour les adresses IP malveillantes connues
    - Ajouter une règle de blocage IP
    - Ajouter un blocage géographique (pays à haut risque)
    - Tester l'accès depuis les régions bloquées
4. **Activer la journalisation et la surveillance (40 minutes)**
    - Activer la journalisation WAF sur S3
    - Créer un groupe de journaux CloudWatch
    - Configurer les alarmes CloudWatch (requêtes bloquées > 1000)
    - Créer un tableau de bord CloudWatch
    - Tester le déclenchement des alarmes
5. **Simuler des attaques (30 minutes)**
    - Tentative d'injection SQL (vérifier le blocage)
    - Dépasser les limites de débit (vérifier la limitation)
    - Analyser les journaux WAF et les requêtes échantillonnées
    - Examiner les métriques CloudWatch
    - Tester les notifications d'alerte automatisées
6. **Activer Shield Advanced (facultatif, \$3 000/mois)**
    - Abonnez-vous à Shield Advanced
    - Ajouter des ressources protégées
    - Configurer la détection basée sur la santé
    - Vérifier le contact de l'équipe de réponse DDoS

**Résultats attendus :**

- Web ACL protégeant contre OWASP Top 10
- Limitation du débit empêchant le credential stuffing
- Journalisation complète pour les enquêtes sur les incidents
- Alarmes CloudWatch détectant les attaques en temps réel
- Protection complète pour < 20 $/mois (10 millions de demandes)


## Questions de révision

1. **Quelle est l'action par défaut si aucune règle WAF ne correspond ?**
a) Bloquer
b) Autoriser ✓
c) Compter
d) Défi

**Réponse : B** - L'action par défaut de l'ACL Web (Autoriser ou Bloquer) s'applique lorsqu'aucune règle ne correspond ; généralement défini sur Autoriser

2. **Quelle est la limite maximale de WCU par Web ACL ?**
a) 500
b) 1 000
c) 1 500 ✓
d) 5 000

**Réponse : C** - Capacité de l'ACL Web limitée à 1 500 WCU ; doit rester en dessous de cette limite lors de l'ajout de règles

3. **Quel pourcentage d'attaques DDoS Shield Standard atténue-t-il ?**
a) 50%
b) 75%
c) 96 % ✓
d) 100 %

**Réponse : C** - Shield Standard atténue 96 % des attaques DDoS (couche réseau/transport) ; les 4 % restants sont des attaques au niveau de la couche application

4. **Quel est le coût d'AWS Shield Advanced ?**
a) \300$/mois
b) \1 000 $/mois
c) \3 000$/mois ✓
d) Gratuit

**Réponse : C** - Shield Advanced coûte \$3 000/mois par organisation plus les frais de transfert de données

5. **Quelle fenêtre de temps de limitation de débit le WAF utilise-t-il ?**
a) 1 minute
b) 5 minutes ✓
c) 15 minutes
d) 1 heure

**Réponse : B** - Les règles basées sur les tarifs utilisent des fenêtres de 5 minutes ; IP bloquée pendant 5 minutes si limite dépassée

6. **Quels services AWS WAF peut-il protéger ?**
a) Uniquement EC2
b) CloudFront, ALB, passerelle API ✓
c) Tous les services AWS
d) S3 uniquement

**Réponse : B** – WAF protège les distributions CloudFront, les Application Load Balancers, les API REST d'API Gateway et AppSync.

7. **Quelle est l'approche recommandée pour déployer de nouvelles règles WAF ?**
a) Bloquer immédiatement
b) Mode COUNT en premier ✓
c) Mode Défi
d) Autoriser uniquement

**Réponse : B** - Testez toujours les règles en mode COUNT pendant 1 à 2 semaines avant d'activer BLOCK pour identifier les faux positifs.

8. **Que propose la protection des coûts Shield Advanced ?**
a) Atténuation DDoS gratuite
b) Crédits pour augmenter les coûts lors des attaques ✓
c) Baisse des prix EC2
d) Transfert de données gratuit

**Réponse : B** - Shield Advanced fournit des crédits pour la mise à l'échelle des coûts (CloudFront, Route 53, ELB, EC2) lors d'attaques DDoS.

9. **Quel est le coût de traitement des demandes WAF ?**
a) \0,10 $ par million
b) \0,60 $ par million ✓
c) \$1,00 par million
d) Gratuit

**Réponse : B** - Le WAF facture \$0,60 par million de requêtes pour le traitement WAF standard ; les groupes de règles gérés entraînent des frais supplémentaires

10. **Que se passe-t-il lorsqu'une limite de débit est dépassée ?**
a) IP bloquée définitivement
b) IP bloquée pendant 5 minutes ✓
c) IP nécessite CAPTCHA
d) Demande retardée

**Réponse : B** - Lorsque la limite de débit est dépassée, l'IP est automatiquement bloquée pendant 5 minutes ; automatiquement débloqué après un délai d'attente

11. **À quoi sert le contexte de chiffrement dans les journaux WAF ?**
a) Chiffrer les données du journal
b) Rédiger les en-têtes sensibles ✓
c) Compresser les journaux
d) Accélérer les requêtes

**Réponse : B** - RedactedFields dans la configuration de la journalisation supprime les en-têtes sensibles (autorisation, cookies, clés API) des journaux

12. **Quel niveau Shield inclut la prise en charge de l'équipe de réponse DDoS (DRT) ?**
a) Norme de bouclier
b) Bouclier Avancé ✓
c) Les deux niveaux
d) Aucun des deux niveaux

**Réponse : B** - Shield Advanced inclut la prise en charge DRT 24h/24 et 7j/7 ; Shield Standard est entièrement automatisé sans assistance humaine

13. ** Contre quoi l'ensemble de règles de base WAF est-il conçu pour protéger ?**
a) Uniquement l'injection SQL
b) Top 10 des vulnérabilités OWASP ✓
c) Uniquement les attaques DDoS
d) Uniquement les robots

**Réponse : B** - L'ensemble de règles de base gérées par AWS offre une protection contre les 10 principales vulnérabilités de l'OWASP, notamment SQLi, XSS, LFI, RFI.

14. **Quel est le nombre maximum de règles dans une ACL Web ?**
une) 10
b) 50
c) 100
d) Limité par la capacité des WCU (1 500) ✓

**Réponse : D** - Aucune limite de règle fixe ; limité par la consommation totale de WCU (limite de 1 500 WCU par Web ACL)

15. **Quel service AWS est recommandé pour analyser les journaux WAF de manière rentable ?**
a) Informations CloudWatch
b) Amazon Athéna ✓
c) ElastiSearch
d) Décalage vers le rouge

**Réponse : B** - Amazon Athena permet d'interroger à moindre coût les journaux WAF stockés dans S3 ; payer uniquement pour les requêtes exécutées

***


# Partie 8 : Sécurité \& Conformité - Résumé

Vous avez terminé la section Sécurité \& Conformité, couvrant cinq services de sécurité critiques :

**Chapitre 23 - Services de sécurité AWS :** Détection intelligente des menaces avec GuardDuty (analyse d'apprentissage automatique de CloudTrail, journaux de flux VPC, journaux DNS), gestion centralisée de la posture de sécurité avec Security Hub (cadres de conformité, résultats agrégés), analyse continue des vulnérabilités avec Inspector, découverte de données sensibles avec Macie et enquête sur les causes profondes avec Detective.

**Chapitre 24 - AWS KMS \& Secrets Manager :** Chiffrement d'entreprise avec KMS (clés gérées par le client, chiffrement d'enveloppe, rotation automatique, HSM validés FIPS 140-2), gestion automatisée des secrets avec Secrets Manager (rotation des informations d'identification de base de données, gestion des versions, accès entre comptes), chiffrement au repos et en transit et pistes d'audit complètes via CloudTrail.

**Chapitre 25 - AWS WAF \& Shield :** Protection des applications Web avec WAF (groupes de règles gérés pour OWASP Top 10, limitation de débit, détection de robots, blocage géographique), atténuation DDoS avec Shield (Standard pour les attaques de couche réseau, Advanced pour la couche d'application avec prise en charge DRT), journalisation complète et réponse automatisée aux incidents.

Ces services travaillent ensemble pour assurer une sécurité de défense en profondeur :

- GuardDuty détecte les menaces → Security Hub regroupe les résultats → EventBridge déclenche une réponse automatisée
- KMS crypte les données au repos → Secrets Manager alterne les informations d'identification → CloudTrail enregistre tous les accès
- Shield bloque les attaques DDoS → WAF filtre les attaques d'applications → CloudWatch surveille et alerte

**Aperçu de la section suivante :** La partie 9 couvrira les services de gestion et de gouvernance, notamment AWS CloudTrail (journalisation d'audit complète), AWS Config (conformité de la configuration), AWS Organizations (gestion multi-comptes), AWS Systems Manager (gestion opérationnelle) et AWS Control Tower (automatisation de la zone d'atterrissage) pour gérer les environnements AWS à grande échelle avec gouvernance, conformité et excellence opérationnelle.

***

## Ressources supplémentaires

**Documentation AWS :**

- Guide du développeur WAF : https://docs.aws.amazon.com/waf/
- Guide du développeur Shield : https://docs.aws.amazon.com/shield/
- Automatisations de sécurité WAF : https://aws.amazon.com/solutions/waf-security-automations/

**Livres blancs AWS :**

- Meilleures pratiques DDoS : https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/
- Pilier de sécurité - Cadre bien architecturé

**Formation :**

- Principes fondamentaux de la sécurité AWS (numérique)
- Ingénierie de sécurité sur AWS (Classroom/Virtual)

**Ressources tierces :**

- OWASP Top 10 : https://owasp.org/www-project-top-ten/
- Benchmark des fondations CIS AWS
- Blog sur la sécurité AWS

**Outils :**

- AWS Security Hub - Contrôles de sécurité automatisés
- aws-waf-security-automations - Modèle CloudFormation
- WAF Rate Limiter - Projets open source GitHub

***

Ceci termine le chapitre 25 sur AWS WAF \& Shield. La couverture complète comprend la théorie (types d'attaques, architecture WAF, niveaux Shield), la mise en œuvre pratique (création d'ACL Web, configuration de règles, activation de Shield Advanced), les connaissances au niveau de la production (stratégies de test, automatisation de la réponse aux incidents, optimisation des coûts), des conseils détaillés et les meilleures pratiques, les pièges courants avec les solutions et les questions de révision alignées sur les modèles de certification AWS.
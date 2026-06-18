# Chapter 25: AWS WAF \& Shield

## Introduction

Web applications face constant attack—automated bots scanning for vulnerabilities, credential stuffing attempts cycling through stolen passwords, SQL injection probing databases, DDoS floods overwhelming infrastructure, and zero-day exploits targeting unpatched software. Traditional security approaches—network firewalls, IP blocking, rate limiting at the load balancer—cannot protect modern web applications from sophisticated, distributed, application-layer attacks. AWS WAF (Web Application Firewall) and AWS Shield provide intelligent, scalable protection directly integrated with CloudFront, Application Load Balancer, and API Gateway, blocking attacks at the edge before they reach your infrastructure.

The cost of inadequate web application security extends far beyond technology—average data breach costs exceed \$4 million, DDoS attacks cause revenue loss exceeding \$100,000 per hour, and brand reputation damage lasts years. AWS WAF enables granular request filtering using customizable rules that inspect HTTP headers, body, URI, query strings, and request patterns. AWS Shield provides always-on DDoS protection—Shield Standard protects against network and transport layer attacks automatically at no cost, while Shield Advanced adds application-layer protection, 24/7 DDoS Response Team support, cost protection, and real-time attack visibility. Together, these services transform security from reactive incident response to proactive threat prevention.

This chapter builds on previous security concepts (IAM policies, Security Hub findings, encryption) by adding web application protection and DDoS mitigation. WAF integrates with services covered earlier—protecting CloudFront distributions, Application Load Balancers, API Gateway REST APIs—while Shield protects the entire AWS edge network. The chapter covers WAF architecture, rule types, managed rule groups, rate limiting, bot detection, geographic filtering, logging and monitoring, DDoS attack types, Shield Standard vs Advanced, incident response automation, and building production systems that withstand attacks ranging from simple bot traffic to sophisticated multi-vector DDoS assaults exceeding terabits per second.

## Theory \& Concepts

### Web Application Attack Landscape

**Common Web Application Threats:**

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

**Defense in Depth Strategy:**

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


### AWS WAF Architecture

**Core Components:**

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

**Supported AWS Resources:**

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


### WAF Rule Types

**1. Managed Rule Groups:**

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

**2. Custom Rules:**

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

**3. Rate-Based Rules:**

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


### AWS Shield

**Shield Standard (Automatic, Free):**

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

**Shield Advanced (Premium Protection):**

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


### DDoS Attack Types

**Network/Transport Layer Attacks (Layer 3/4):**

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

**Application Layer Attacks (Layer 7):**

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


### WAF Logging and Monitoring

**Logging Configuration:**

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

**CloudWatch Metrics:**

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


## Hands-On Implementation

### Lab 1: Creating WAF Web ACL with Managed Rules

**Objective:** Protect Application Load Balancer with WAF using managed rule groups.

**Step 1: Create Web ACL**

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

**Step 2: Associate with ALB**

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

**Step 3: Add Rate Limiting Rule**

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

**Step 4: Enable Logging**

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


### Lab 2: Geographic Blocking and IP Set Rules

**Objective:** Block traffic from specific countries and IP addresses.

**Step 1: Create IP Set**

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

**Step 2: Add IP Set and Geographic Rules**

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

**Step 3: Update IP Set Dynamically**

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


### Lab 3: Enable Shield Advanced

**Objective:** Enable Shield Advanced with DDoS Response Team support.

**Step 1: Subscribe to Shield Advanced**

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

**Step 2: Add Protected Resources**

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

**Step 3: Configure Health-Based Detection**

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


## Production-Level Knowledge

### WAF Testing and Validation

**Test Rules in COUNT Mode:**

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

**False Positive Handling:**

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


### Incident Response Automation

**Automated Attack Response:**

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


### Cost Optimization

**WAF Cost Structure:**

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


## Tips \& Best Practices

### WAF Configuration Tips

**Tip 1: Start with Managed Rule Groups**
Use AWS Managed Rules for OWASP Top 10 protection—continuously updated, no maintenance required.

**Tip 2: Deploy Rules in COUNT Mode First**
Test all rules in COUNT mode for 1-2 weeks before blocking—identifies false positives safely.

**Tip 3: Implement Layered Rate Limiting**
Use multiple rate limits: global (10K/5min), API (1K/5min), login (10/5min)—protects different attack vectors.

**Tip 4: Enable Request Sampling**
Sample requests provide debugging context—essential for investigating blocked legitimate traffic.

**Tip 5: Use Regex Pattern Sets for Efficiency**
Group similar patterns into regex sets—reduces WCU consumption, easier management.

### Shield and DDoS Protection Tips

**Tip 6: Enable Shield Advanced for Critical Applications**
Revenue loss > \$125/hour justifies \$3K/month cost—includes DRT support and cost protection.

**Tip 7: Configure Health-Based Detection**
Associate Route 53 health checks with Shield—enables automatic attack detection based on application health.

**Tip 8: Implement Application-Level Throttling**
WAF + application throttling provides defense in depth—WAF blocks attacks, app throttles prevent resource exhaustion.

**Tip 9: Use CloudFront with Shield Standard**
CloudFront + Shield Standard protects 96% of DDoS attacks free—excellent baseline protection.

**Tip 10: Document Incident Response Procedures**
Maintain runbooks for common attacks—enables rapid response when attacks occur.

### Monitoring and Logging Tips

**Tip 11: Query WAF Logs with Athena**
Store logs in S3, query with Athena—cost-effective analysis of millions of requests.

**Tip 12: Set CloudWatch Alarms on Blocked Requests**
Alert when blocked requests exceed normal baseline—early attack detection.

**Tip 13: Create Custom Dashboards**
Visualize attack patterns, top blocked IPs, geographic distribution—enables rapid situational awareness.

**Tip 14: Integrate with SIEM**
Send WAF logs to Splunk/QRadar via Kinesis Firehose—centralized security monitoring.

**Tip 15: Redact Sensitive Data from Logs**
Redact authorization headers, cookies, API keys—compliance and privacy protection.

## Pitfalls \& Remedies

### Pitfall 1: False Positives Blocking Legitimate Traffic

**Problem:** WAF rules block legitimate users, causing service disruption and customer complaints.

**Why It Happens:**

- Overly aggressive managed rules without tuning
- Rate limits too strict for actual usage patterns
- Geographic blocking affects legitimate international users
- SQL injection rules triggered by legitimate data
- Bot detection blocking automated tools (monitoring, CI/CD)

**Impact:**

- Lost revenue from blocked purchases
- Customer frustration and churn
- Support ticket surge
- Negative reviews and reputation damage
- Development team debugging time wasted

**Example:**

```
Scenario: E-commerce site enables Core Rule Set
Day 1: 500 legitimate users blocked
Issue: Product search for "O'Reilly Books" triggers SQL injection rule
Pattern: Single quote in product name flagged as SQLi attempt
Customer impact: Cannot search for products, abandon cart
Revenue loss: $50,000 in lost sales (one day)
```

**Remedy:**

**Step 1: Always Test in COUNT Mode**

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

**Step 2: Analyze Sampled Requests**

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

**Step 3: Implement Exception Rules**

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

**Step 4: Gradual Rollout**

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

**Prevention:**

- Never enable BLOCK mode without COUNT testing
- Maintain exception rules documentation
- Monitor customer feedback channels
- Set up easy rollback procedures
- Test with realistic traffic patterns
- Review sampled requests weekly

***

### Pitfall 2: Insufficient Rate Limiting Configuration

**Problem:** Rate limits too high allow attacks through, or too low block legitimate traffic.

**Why It Happens:**

- Default limits don't match application usage
- Single global rate limit for all endpoints
- No consideration for authenticated vs anonymous
- Peak traffic patterns not analyzed
- No testing under real conditions

**Impact:**

- DDoS attacks overwhelm application
- Legitimate users blocked during traffic spikes
- Credential stuffing attacks succeed
- API abuse continues unchecked

**Example:**

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

**Remedy:**

**Step 1: Analyze Baseline Traffic**

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

**Step 2: Implement Tiered Rate Limiting**

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

**Step 3: Dynamic Rate Adjustment**

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

**Prevention:**

- Analyze baseline traffic before setting limits
- Implement tiered limits (global, API, auth)
- Test limits under peak traffic
- Monitor rate limit alarms
- Document expected usage patterns
- Adjust limits based on application growth

***

### Pitfall 3: Inadequate Logging and Monitoring

**Problem:** Security incidents undetected due to missing logs or alerts.

**Why It Happens:**

- Logging not enabled at deployment
- Logs not integrated with monitoring systems
- No CloudWatch alarms configured
- Log analysis too manual/slow
- Cost concerns prevent full logging

**Impact:**

- Attacks continue undetected
- Cannot investigate incidents (no evidence)
- Compliance violations (no audit trail)
- Slow incident response
- Unable to tune WAF rules

**Example:**

```
Incident: Credential stuffing attack on login endpoint
Duration: 72 hours before detection
Attempts: 50 million login attempts
Compromised: 150 accounts (weak passwords)
Root cause: No alerting on failed login spike
Detection: Customer complaints about unauthorized access
```

**Remedy:**

**Step 1: Enable Comprehensive Logging**

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

**Step 2: Create CloudWatch Alarms**

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

**Step 3: Automated Log Analysis**

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

**Prevention:**

- Enable logging on day one
- Configure comprehensive alarms
- Integrate with SIEM/monitoring
- Automate log analysis
- Review security dashboards weekly
- Document investigation procedures

***

## Chapter Summary

AWS WAF and Shield provide comprehensive protection against web application attacks and DDoS threats at massive scale. WAF enables granular request filtering using customizable rules, managed rule groups, rate limiting, bot detection, and geographic blocking to protect against OWASP Top 10 vulnerabilities, zero-day exploits, and application-layer attacks. Shield delivers always-on DDoS protection—Shield Standard mitigates 96% of attacks automatically at no cost, while Shield Advanced adds application-layer protection, 24/7 DDoS Response Team support, cost protection, and real-time attack visibility for mission-critical applications.

**Key Takeaways:**

- **Deploy Managed Rule Groups First:** AWS Managed Rules provide OWASP Top 10 protection immediately; Core Rule Set + Known Bad Inputs + SQL Injection covers most attacks for \$2/month
- **Test Rules in COUNT Mode:** Deploy new rules in COUNT mode for 1-2 weeks before blocking; prevents false positives blocking legitimate traffic; analyze sampled requests before enabling BLOCK
- **Implement Tiered Rate Limiting:** Use multiple rate limits: global (5K/5min), API (1K/5min), login (10/5min); protects different endpoints appropriately; prevents both DDoS and legitimate user blocking
- **Enable Shield Standard Everywhere:** Always-on DDoS protection included free with CloudFront, Route 53, ALB, Global Accelerator; mitigates 96% of DDoS attacks automatically
- **Consider Shield Advanced for Critical Apps:** \$3K/month justified when revenue loss > \$125/hour from downtime; includes DRT support, cost protection, enhanced detection, WAF included
- **Enable Comprehensive Logging:** Log to S3 (storage), CloudWatch (alarms), Kinesis (SIEM); redact sensitive headers; essential for incident investigation and compliance
- **Integrate with CloudFront:** CloudFront + WAF + Shield provides edge protection; blocks attacks before reaching origin; reduces latency and origin load

WAF and Shield integrate seamlessly with AWS services covered earlier—protecting CloudFront distributions, Application Load Balancers, API Gateway REST APIs—while Shield Standard protects the entire AWS edge network automatically. Together with Security Hub findings, GuardDuty threat detection, and KMS encryption, these services provide defense-in-depth security from network edge to data storage.

## Hands-On Lab Exercise

**Objective:** Build complete web application protection with WAF, Shield, monitoring, and automated response.

**Scenario:** Protect e-commerce website from SQL injection, credential stuffing, and DDoS attacks.

**Prerequisites:**

- AWS account with admin access
- Application Load Balancer serving web application
- CloudFront distribution (optional)

**Steps:**

1. **Create WAF Web ACL (45 minutes)**
    - Create regional Web ACL
    - Add AWS Managed Core Rule Set
    - Add SQL Injection rule group
    - Add Known Bad Inputs rule group
    - Test rules in COUNT mode
    - Associate with ALB
2. **Configure Rate Limiting (30 minutes)**
    - Add global rate limit (5,000 req/5min)
    - Add API rate limit (1,000 req/5min)
    - Add login rate limit (10 req/5min)
    - Test with load testing tool
    - Verify blocking at thresholds
3. **Implement Geographic and IP Blocking (20 minutes)**
    - Create IP set for known malicious IPs
    - Add IP blocking rule
    - Add geographic blocking (high-risk countries)
    - Test access from blocked regions
4. **Enable Logging and Monitoring (40 minutes)**
    - Enable WAF logging to S3
    - Create CloudWatch log group
    - Configure CloudWatch alarms (blocked requests > 1000)
    - Create CloudWatch dashboard
    - Test alarm triggering
5. **Simulate Attacks (30 minutes)**
    - SQL injection attempt (verify blocking)
    - Exceed rate limits (verify throttling)
    - Analyze WAF logs and sampled requests
    - Review CloudWatch metrics
    - Test automated alert notifications
6. **Enable Shield Advanced (optional, \$3K/month)**
    - Subscribe to Shield Advanced
    - Add protected resources
    - Configure health-based detection
    - Review DDoS Response Team contact

**Expected Outcomes:**

- Web ACL protecting against OWASP Top 10
- Rate limiting preventing credential stuffing
- Comprehensive logging for incident investigation
- CloudWatch alarms detecting attacks in real-time
- Complete protection for < \$20/month (10M requests)


## Review Questions

1. **What is the default action if no WAF rules match?**
a) Block
b) Allow ✓
c) Count
d) Challenge

**Answer: B** - Web ACL default action (Allow or Block) applies when no rules match; typically set to Allow

2. **What is the maximum WCU limit per Web ACL?**
a) 500
b) 1,000
c) 1,500 ✓
d) 5,000

**Answer: C** - Web ACL capacity limited to 1,500 WCUs; must stay under this limit when adding rules

3. **What percentage of DDoS attacks does Shield Standard mitigate?**
a) 50%
b) 75%
c) 96% ✓
d) 100%

**Answer: C** - Shield Standard mitigates 96% of DDoS attacks (network/transport layer); remaining 4% are application-layer attacks

4. **What is the cost of AWS Shield Advanced?**
a) \$300/month
b) \$1,000/month
c) \$3,000/month ✓
d) Free

**Answer: C** - Shield Advanced costs \$3,000/month per organization plus data transfer charges

5. **What rate limiting time window does WAF use?**
a) 1 minute
b) 5 minutes ✓
c) 15 minutes
d) 1 hour

**Answer: B** - Rate-based rules use 5-minute windows; IP blocked for 5 minutes if limit exceeded

6. **What AWS services can WAF protect?**
a) Only EC2
b) CloudFront, ALB, API Gateway ✓
c) All AWS services
d) S3 only

**Answer: B** - WAF protects CloudFront distributions, Application Load Balancers, API Gateway REST APIs, and AppSync

7. **What is the recommended approach for deploying new WAF rules?**
a) Block immediately
b) COUNT mode first ✓
c) Challenge mode
d) Allow only

**Answer: B** - Always test rules in COUNT mode for 1-2 weeks before enabling BLOCK to identify false positives

8. **What does Shield Advanced cost protection provide?**
a) Free DDoS mitigation
b) Credits for scaling costs during attacks ✓
c) Lower EC2 prices
d) Free data transfer

**Answer: B** - Shield Advanced provides credits for scaling costs (CloudFront, Route 53, ELB, EC2) during DDoS attacks

9. **What is the WAF request processing cost?**
a) \$0.10 per million
b) \$0.60 per million ✓
c) \$1.00 per million
d) Free

**Answer: B** - WAF charges \$0.60 per million requests for standard WAF processing; managed rule groups have additional charges

10. **What happens when a rate limit is exceeded?**
a) IP permanently blocked
b) IP blocked for 5 minutes ✓
c) IP requires CAPTCHA
d) Request delayed

**Answer: B** - When rate limit exceeded, IP automatically blocked for 5 minutes; automatically unblocked after timeout

11. **What is the purpose of encryption context in WAF logs?**
a) Encrypt log data
b) Redact sensitive headers ✓
c) Compress logs
d) Speed up queries

**Answer: B** - RedactedFields in logging configuration removes sensitive headers (authorization, cookies, API keys) from logs

12. **Which Shield tier includes DDoS Response Team (DRT) support?**
a) Shield Standard
b) Shield Advanced ✓
c) Both tiers
d) Neither tier

**Answer: B** - Shield Advanced includes 24/7 DRT support; Shield Standard is fully automated with no human support

13. **What is the WAF Core Rule Set designed to protect against?**
a) Only SQL injection
b) OWASP Top 10 vulnerabilities ✓
c) Only DDoS attacks
d) Only bots

**Answer: B** - AWS Managed Core Rule Set provides protection against OWASP Top 10 vulnerabilities including SQLi, XSS, LFI, RFI

14. **What is the maximum number of rules in a Web ACL?**
a) 10
b) 50
c) 100
d) Limited by WCU capacity (1,500) ✓

**Answer: D** - No fixed rule limit; constrained by total WCU consumption (1,500 WCU limit per Web ACL)

15. **What AWS service is recommended for analyzing WAF logs cost-effectively?**
a) CloudWatch Insights
b) Amazon Athena ✓
c) ElastiSearch
d) Redshift

**Answer: B** - Amazon Athena provides cost-effective querying of WAF logs stored in S3; pay only for queries run

***


# Part 8: Security \& Compliance - Summary

You've completed the Security \& Compliance section, covering five critical security services:

**Chapter 23 - AWS Security Services:** Intelligent threat detection with GuardDuty (machine learning analysis of CloudTrail, VPC Flow Logs, DNS logs), centralized security posture management with Security Hub (compliance frameworks, aggregated findings), continuous vulnerability scanning with Inspector, sensitive data discovery with Macie, and root cause investigation with Detective.

**Chapter 24 - AWS KMS \& Secrets Manager:** Enterprise encryption with KMS (customer-managed keys, envelope encryption, automatic rotation, FIPS 140-2 validated HSMs), automated secrets management with Secrets Manager (database credential rotation, versioning, cross-account access), encryption at rest and in transit, and complete audit trails via CloudTrail.

**Chapter 25 - AWS WAF \& Shield:** Web application protection with WAF (managed rule groups for OWASP Top 10, rate limiting, bot detection, geographic blocking), DDoS mitigation with Shield (Standard for network-layer attacks, Advanced for application-layer with DRT support), comprehensive logging, and automated incident response.

These services work together to provide defense-in-depth security:

- GuardDuty detects threats → Security Hub aggregates findings → EventBridge triggers automated response
- KMS encrypts data at rest → Secrets Manager rotates credentials → CloudTrail logs all access
- Shield blocks DDoS attacks → WAF filters application attacks → CloudWatch monitors and alerts

**Next Section Preview:** Part 9 will cover Management \& Governance services including AWS CloudTrail (comprehensive audit logging), AWS Config (configuration compliance), AWS Organizations (multi-account management), AWS Systems Manager (operational management), and AWS Control Tower (landing zone automation) to manage AWS environments at scale with governance, compliance, and operational excellence.

***

## Additional Resources

**AWS Documentation:**

- WAF Developer Guide: https://docs.aws.amazon.com/waf/
- Shield Developer Guide: https://docs.aws.amazon.com/shield/
- WAF Security Automations: https://aws.amazon.com/solutions/waf-security-automations/

**AWS Whitepapers:**

- DDoS Best Practices: https://docs.aws.amazon.com/whitepapers/latest/aws-best-practices-ddos-resiliency/
- Security Pillar - Well-Architected Framework

**Training:**

- AWS Security Fundamentals (Digital)
- Security Engineering on AWS (Classroom/Virtual)

**Third-Party Resources:**

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CIS AWS Foundations Benchmark
- AWS Security Blog

**Tools:**

- AWS Security Hub - Automated security checks
- aws-waf-security-automations - CloudFormation template
- WAF Rate Limiter - GitHub open source projects

***

This completes Chapter 25 on AWS WAF \& Shield. The comprehensive coverage includes theory (attack types, WAF architecture, Shield tiers), hands-on implementation (creating Web ACLs, configuring rules, enabling Shield Advanced), production-level knowledge (testing strategies, incident response automation, cost optimization), detailed tips and best practices, common pitfalls with remedies, and review questions aligned with AWS certification patterns.


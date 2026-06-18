# Chapter 15: Route 53

## Introduction

Domain Name System (DNS) is the internet's phone book, translating human-readable domain names (www.example.com) into IP addresses (192.0.2.1) that computers use to communicate. Every internet interaction begins with DNS—when users type a URL, their browser queries DNS servers to find the website's location. Amazon Route 53, AWS's highly available and scalable DNS service, goes far beyond basic name resolution, offering intelligent routing policies, health checking, traffic management, and seamless integration with AWS services. The name "Route 53" references TCP/UDP port 53, the standard port for DNS.

Traditional DNS systems provide simple domain-to-IP mapping, but Route 53 transforms DNS into an intelligent traffic management platform. Instead of routing all users to a single server, Route 53's routing policies enable sophisticated traffic distribution: geolocation routing directs users to the nearest data center for lower latency; weighted routing enables gradual traffic migration between deployments; failover routing automatically switches to backup resources during outages; latency-based routing sends users to the fastest-responding region. These capabilities make Route 53 essential for multi-region architectures, disaster recovery, blue-green deployments, and global application delivery.

Understanding DNS fundamentals and Route 53's advanced features separates basic website hosting from production-grade global infrastructure. Misconfigured TTL values cause prolonged outages during failover. Improper health checks trigger false positives, unnecessarily routing traffic away from healthy resources. Not using alias records for AWS resources incurs unnecessary costs and complexity. Missing DNSSEC leaves domains vulnerable to cache poisoning attacks. This chapter provides comprehensive coverage from DNS basics to production patterns, including hosted zones, record types, routing policies, health checks, traffic flow, DNSSEC, and best practices for building resilient, globally distributed systems.

## Theory \& Concepts

### DNS Fundamentals

**How DNS Works (Hierarchical System):**

DNS operates as a distributed hierarchical system with multiple layers:

```
DNS Resolution Process:

1. User types www.example.com in browser
   ↓
2. Browser checks local DNS cache
   - If found: Use cached IP (fast)
   - If not: Query DNS resolver
   ↓
3. Recursive Resolver (ISP or 8.8.8.8)
   - Checks its cache
   - If not cached, begins recursive query
   ↓
4. Root Name Server (.)
   - "I don't know www.example.com"
   - "But ask .com TLD server at 192.5.6.30"
   ↓
5. TLD Name Server (.com)
   - "I don't know www.example.com"
   - "But ask example.com authoritative server at 203.0.113.1"
   ↓
6. Authoritative Name Server (Route 53)
   - "www.example.com is at 198.51.100.1"
   ↓
7. Response travels back through resolver to browser
   ↓
8. Browser connects to 198.51.100.1
```

**DNS Hierarchy:**

```
Root Zone (.)
├── Top-Level Domains (TLDs)
│   ├── Generic TLDs: .com, .org, .net, .io
│   ├── Country Code TLDs: .uk, .de, .jp, .in
│   └── New TLDs: .cloud, .tech, .app
│
└── Second-Level Domains
    ├── example.com
    │   ├── www.example.com (subdomain)
    │   ├── api.example.com (subdomain)
    │   └── mail.example.com (subdomain)
    │
    └── company.org
        ├── blog.company.org
        └── shop.company.org
```

**DNS Record Types:**

Understanding record types is fundamental to DNS configuration:

**A Record (Address Record):**

- Maps domain to IPv4 address
- Example: `www.example.com → 192.0.2.1`
- Most common record type
- Required for website hosting

**AAAA Record (IPv6 Address):**

- Maps domain to IPv6 address
- Example: `www.example.com → 2001:0db8::1`
- Growing importance as IPv6 adoption increases
- Often configured alongside A records

**CNAME Record (Canonical Name):**

- Creates alias pointing to another domain
- Example: `www.example.com → example.com`
- Cannot be used for zone apex (root domain)
- Limitation: Cannot coexist with other record types

**MX Record (Mail Exchange):**

- Specifies mail servers for domain
- Includes priority values (lower = higher priority)
- Example: `10 mail1.example.com`, `20 mail2.example.com`
- Essential for email routing

**TXT Record (Text):**

- Stores text information
- Use cases:
    - SPF: Email sender verification
    - DKIM: Email authentication
    - Domain verification for services
    - Site ownership proof
- Example: `v=spf1 include:_spf.google.com ~all`

**NS Record (Name Server):**

- Delegates subdomain to different name servers
- Specifies authoritative name servers for zone
- Example: `example.com → ns-123.awsdns-12.com`
- Critical for DNS delegation

**SOA Record (Start of Authority):**

- Contains zone metadata
- Includes: primary name server, admin email, serial number, refresh/retry timings
- Automatically managed by Route 53
- Only one SOA per zone

**PTR Record (Pointer):**

- Reverse DNS lookup (IP to domain)
- Used for email server verification
- Example: `1.2.0.192.in-addr.arpa → mail.example.com`
- Important for email deliverability

**SRV Record (Service):**

- Specifies location of services
- Format: `priority weight port target`
- Used for: SIP, XMPP, LDAP
- Example: `_sip._tcp.example.com 10 60 5060 sipserver.example.com`

**CAA Record (Certification Authority Authorization):**

- Specifies which CAs can issue certificates
- Security feature preventing unauthorized certificate issuance
- Example: `0 issue "letsencrypt.org"`
- Recommended security practice

**Time To Live (TTL):**

TTL is the duration (in seconds) that DNS records are cached:

```
TTL Impact:

Short TTL (60-300 seconds):
✓ Faster failover during issues
✓ Quick changes propagate rapidly
✗ More DNS queries (higher cost)
✗ Increased latency for users

Long TTL (3600-86400 seconds):
✓ Fewer DNS queries (lower cost)
✓ Better performance (cached)
✗ Slow propagation of changes
✗ Delayed failover

Recommended TTL:
- Production stable records: 3600-7200 (1-2 hours)
- Pre-migration: 300 (5 minutes)
- During migration: 60 (1 minute)
- Post-migration: Increase gradually
```

**DNS Caching Behavior:**

DNS responses are cached at multiple levels, affecting change propagation:

```
Cache Hierarchy:

Browser Cache
└── TTL: Varies (often ignores DNS TTL)

OS Cache
└── TTL: Respects DNS TTL

Router/Gateway Cache
└── TTL: Respects DNS TTL

ISP Resolver Cache
└── TTL: Respects DNS TTL (mostly)

Maximum Propagation Time = Longest Cache TTL

Example:
- Set TTL to 300 seconds
- Make DNS change
- Maximum wait: 5 minutes for full propagation
- Reality: Can take longer due to non-compliant resolvers
```


### Route 53 Hosted Zones

**What is a Hosted Zone?**

A hosted zone is a container for DNS records belonging to a domain. Think of it as a database of DNS records for your domain.

**Two Types of Hosted Zones:**

**1. Public Hosted Zone:**

```
Purpose: Internet-facing domains
Access: Publicly resolvable from internet
Use Cases:
- Website domains (www.example.com)
- API endpoints (api.example.com)
- Email servers (mail.example.com)
- Public services

Cost: $0.50/month per hosted zone
Query Cost: $0.40 per million queries
```

**2. Private Hosted Zone:**

```
Purpose: Internal VPC resources
Access: Only from associated VPCs
Use Cases:
- Internal applications (app.internal)
- Database endpoints (db.internal)
- Microservices (service.internal)
- Development environments

Cost: $0.50/month per hosted zone
Query Cost: $0.40 per million queries

Requirements:
- Associate with one or more VPCs
- VPC DNS resolution enabled
- VPC DNS hostnames enabled
```

**Hosted Zone Architecture:**

```
Public Hosted Zone (example.com)
├── Name Servers (4 provided by Route 53)
│   ├── ns-123.awsdns-12.com
│   ├── ns-456.awsdns-45.co.uk
│   ├── ns-789.awsdns-78.org
│   └── ns-012.awsdns-01.net
│
├── Records
│   ├── A: example.com → 192.0.2.1
│   ├── A: www.example.com → 192.0.2.1
│   ├── CNAME: blog.example.com → blog-platform.com
│   ├── MX: example.com → mail.example.com
│   └── TXT: example.com → "verification-code"
│
└── Delegation to subdomains
    └── NS: subdomain.example.com → other-name-servers
```

**Split-View DNS (Hybrid Setup):**

Route 53 supports split-view DNS where the same domain resolves differently for internal vs external users:

```
Public Hosted Zone (example.com)
├── www.example.com → 203.0.113.1 (Public IP)
└── api.example.com → CloudFront distribution

Private Hosted Zone (example.com)
├── www.example.com → 10.0.1.100 (Private IP)
├── api.example.com → 10.0.2.50 (Internal ALB)
└── database.example.com → 10.0.3.10 (RDS endpoint)

External Users: See public zone records
Internal VPC Users: See private zone records (takes precedence)

Use Cases:
- Internal services bypass internet
- Lower latency for internal access
- Security (internal resources not exposed)
- Cost savings (no internet data transfer)
```


### Routing Policies

Route 53's routing policies enable intelligent traffic distribution beyond simple DNS resolution.

**1. Simple Routing Policy:**

The most basic policy—one record with one or more IP addresses:

```
Behavior:
- Single resource or multiple IPs
- Returns all values to client
- Client chooses randomly
- No health checking
- No traffic distribution control

Use Cases:
- Single web server
- Simple static websites
- Development environments
- No failover requirements

Example:
www.example.com (A record)
├── 192.0.2.1
├── 192.0.2.2
└── 192.0.2.3

Client receives all three IPs, picks one randomly
```

**2. Weighted Routing Policy:**

Distributes traffic across multiple resources based on assigned weights:

```
Behavior:
- Assign weight to each record (0-255)
- Traffic percentage = (weight / sum of weights) × 100
- Useful for gradual migrations
- Supports health checking

Use Cases:
- Blue-green deployments
- A/B testing
- Gradual traffic migration
- Load distribution across regions

Mathematics:
Record A: Weight 70
Record B: Weight 20
Record C: Weight 10
Total: 100

Traffic Distribution:
A receives: 70/100 = 70%
B receives: 20/100 = 20%
C receives: 10/100 = 10%

Migration Strategy:
Day 1: Old=100, New=0 (100% old)
Day 2: Old=90, New=10 (90% old, 10% new)
Day 3: Old=70, New=30 (70% old, 30% new)
Day 4: Old=50, New=50 (50/50 split)
Day 5: Old=20, New=80 (20% old, 80% new)
Day 6: Old=0, New=100 (100% new)
```

**3. Latency-Based Routing Policy:**

Routes users to the region with lowest network latency:

```
Behavior:
- Create records in multiple regions
- Route 53 measures latency from user to each region
- Routes to fastest region
- Requires health checks for failover

How Latency is Determined:
- Historical latency data from AWS infrastructure
- Measured between user location and AWS regions
- Updated regularly
- Not real-time per-query measurement

Use Cases:
- Global applications
- Multi-region deployments
- User experience optimization
- International audiences

Example Configuration:
www.example.com (Latency policy)
├── us-east-1 → 52.1.2.3 (New York region)
├── eu-west-1 → 34.240.5.6 (Ireland region)
├── ap-southeast-1 → 13.228.7.8 (Singapore region)
└── ap-south-1 → 13.126.9.10 (Mumbai region)

User in London:
- Latency to us-east-1: 80ms
- Latency to eu-west-1: 10ms ← Selected
- Latency to ap-southeast-1: 180ms
- Latency to ap-south-1: 150ms

User in Tokyo:
- Latency to us-east-1: 150ms
- Latency to eu-west-1: 240ms
- Latency to ap-southeast-1: 75ms ← Selected
- Latency to ap-south-1: 100ms
```

**4. Failover Routing Policy:**

Provides active-passive failover for high availability:

```
Behavior:
- Primary resource (active)
- Secondary resource (standby)
- Health check on primary
- Automatic failover to secondary if primary unhealthy

States:
Primary Healthy → Route to Primary
Primary Unhealthy → Route to Secondary

Use Cases:
- Disaster recovery
- Active-passive architecture
- Backup resource standby
- High availability requirements

Example:
www.example.com (Failover policy)
├── Primary: us-east-1 ALB (52.1.2.3)
│   └── Health Check: HTTP on port 80, path /health
└── Secondary: us-west-2 ALB (34.208.4.5)
    └── Always available (no health check required)

Normal Operation: All traffic to us-east-1
Primary Fails: Automatic switch to us-west-2 (within health check interval)
Primary Recovers: Automatic switch back to us-east-1
```

**5. Geolocation Routing Policy:**

Routes users based on geographic location:

```
Behavior:
- Define records for specific locations
- Locations: Continents, Countries, US States
- Routes based on user's location
- Default record for unmatched locations

Location Precedence (most specific wins):
1. US State (e.g., California)
2. Country (e.g., United States)
3. Continent (e.g., North America)
4. Default location

Use Cases:
- Content localization
- License restrictions
- Compliance requirements (data residency)
- Language-specific content
- Regional pricing

Example:
www.example.com (Geolocation policy)
├── Europe → eu-west-1 (German website version)
├── Asia → ap-southeast-1 (Asian market version)
├── United States → us-east-1 (US version)
├── California (US State) → us-west-1 (California-specific)
└── Default → us-east-1 (fallback for unmatched)

User in Germany: Receives eu-west-1 (European version)
User in India: Receives ap-southeast-1 (Asian version)
User in California: Receives us-west-1 (CA-specific)
User in New York: Receives us-east-1 (US version)
User in Antarctica: Receives us-east-1 (default)

Important Notes:
- Based on location of DNS resolver, not user
- VPN/proxy can affect geolocation
- Always configure default location
- More specific rules override general rules
```

**6. Geoproximity Routing Policy:**

Routes based on geographic location of resources and users, with bias adjustment:

```
Behavior:
- Routes to nearest resource geographically
- Bias: Expand or shrink geographic region (±99)
- Positive bias: Attracts more traffic
- Negative bias: Reduces traffic
- Requires Traffic Flow for configuration

Geographic Calculation:
- For AWS resources: Region location
- For non-AWS: Specify latitude/longitude
- Calculates distance from user to each resource

Bias Impact:
Bias +50: Expands region by ~50% more area
Bias -50: Shrinks region by ~50% less area

Use Cases:
- Load balancing with geographic preference
- Gradual traffic shifting between regions
- Testing new regions with small percentage
- Optimizing data center utilization

Example:
www.example.com (Geoproximity policy)
├── us-east-1: Bias +20 (expand coverage)
├── eu-west-1: Bias 0 (neutral)
└── ap-south-1: Bias -30 (reduce coverage, testing phase)

Effect:
- US East attracts users from broader area
- Europe gets normal proximity-based traffic  
- Asia Pacific handles smaller area (test phase)
- Allows gradual traffic increase to new regions
```

**7. Multivalue Answer Routing Policy:**

Returns multiple values in response to DNS queries with health checking:

```
Behavior:
- Returns up to 8 healthy records randomly
- Health check on each record
- Only returns healthy records
- Client chooses from returned values

Comparison to Simple Routing:
Simple: Returns all values, no health checking
Multivalue: Returns only healthy values (up to 8)

Use Cases:
- Multiple web servers
- Simple load distribution
- Basic health checking
- Alternative to ELB for simple scenarios

Example:
www.example.com (Multivalue policy)
├── Record 1: 192.0.2.1 (Health: Healthy)
├── Record 2: 192.0.2.2 (Health: Unhealthy) ← Not returned
├── Record 3: 192.0.2.3 (Health: Healthy)
├── Record 4: 192.0.2.4 (Health: Healthy)
└── Record 5: 192.0.2.5 (Health: Healthy)

Query Response: Returns IPs 1, 3, 4, 5 (up to 8 healthy)
Client picks one randomly

Not a Load Balancer Replacement:
- No session affinity
- No SSL termination
- No layer 7 routing
- Limited to DNS-level distribution
```

**Routing Policy Comparison Matrix:**

```
┌─────────────────┬──────────────┬────────────┬─────────────┬────────────┐
│ Policy          │ Health Check │ Use Case   │ Complexity  │ Best For   │
├─────────────────┼──────────────┼────────────┼─────────────┼────────────┤
│ Simple          │ No           │ Basic      │ Simplest    │ Dev/Test   │
│ Weighted        │ Yes          │ A/B Test   │ Low         │ Migration  │
│ Latency         │ Yes          │ Global     │ Medium      │ Performance│
│ Failover        │ Required     │ HA/DR      │ Low         │ Uptime     │
│ Geolocation     │ Yes          │ Compliance │ Medium      │ Regional   │
│ Geoproximity    │ Yes          │ Fine-tune  │ High        │ Advanced   │
│ Multivalue      │ Yes          │ Simple LB  │ Low         │ Basic HA   │
└─────────────────┴──────────────┴────────────┴─────────────┴────────────┘
```


### Health Checks

Health checks monitor resource availability and trigger routing changes:

**Health Check Types:**

**1. Endpoint Health Checks:**

```
Monitor: HTTP/HTTPS/TCP endpoint
Checks: Response code, response time, response body
Configuration:
- Protocol: HTTP, HTTPS, TCP
- Port: Any port (80, 443, custom)
- Path: /health, /api/status
- Interval: 30 seconds (standard) or 10 seconds (fast)
- Failure Threshold: 3 consecutive failures
- Success Threshold: Default (varies by interval)

Health Check Process:
1. Route 53 health checker sends request
2. Endpoint responds (or times out)
3. Evaluates response:
   - HTTP: 2xx or 3xx = healthy
   - HTTPS: SSL handshake + 2xx/3xx = healthy
   - TCP: Connection successful = healthy
4. Track consecutive failures/successes
5. Update health status

String Matching (Optional):
- Check response body contains specific string
- Useful for verifying actual application health
- Example: Check for "status:ok" in JSON response
```

**2. Calculated Health Checks:**

```
Monitor: Status of other health checks
Logic: Boolean operations (AND, OR, NOT)
Use Case: Complex health scenarios

Example:
Application Healthy = 
  (Database Healthy AND Cache Healthy) OR Backup-DB Healthy

Configuration:
- Child Health Checks: List of health checks to monitor
- Threshold: Minimum number of healthy children
- Operator: Count-based evaluation

Use Cases:
- Application requires multiple services
- Database + Cache + API all must be healthy
- Any one of multiple redundant systems healthy
- Complex dependency relationships
```

**3. CloudWatch Alarm Health Checks:**

```
Monitor: CloudWatch alarm state
Triggers: Based on any CloudWatch metric
Use Case: Custom health criteria

Example Scenarios:
- CPU utilization > 90%
- 5xx error rate > 5%
- Database connections > 1000
- Custom application metrics

Integration:
1. Create CloudWatch alarm
2. Create Route 53 health check monitoring alarm
3. Health check status = Alarm state
   - Alarm OK = Healthy
   - Alarm Alarm = Unhealthy
   - Alarm Insufficient Data = Unhealthy
```

**Health Check Locations:**

Route 53 performs health checks from multiple global locations:

```
Health Check Regions:
- United States (multiple locations)
- Europe (multiple locations)
- Asia Pacific (multiple locations)
- South America
- Africa
- Middle East

Default: Checks from ~15 locations globally
Fast Interval: Checks from ~18 locations

Consensus Evaluation:
- Requires majority of checkers reporting healthy
- Example: 15 checkers, need ≥8 reporting healthy
- Prevents false positives from isolated network issues
- Single checker failure doesn't trigger failover

Recommendation:
- Don't rely on single health checker location
- Configure firewall to allow all Route 53 health checker IPs
- Use CloudWatch metrics to monitor health check status
```

**Health Check Configuration Best Practices:**

```
Interval Selection:
Standard (30s):
- Cost: Included in health check price
- Detection: ~90 seconds (3 failures × 30s)
- Use: Most scenarios

Fast (10s):
- Cost: Higher ($1/month vs $0.50/month)
- Detection: ~30 seconds (3 failures × 10s)
- Use: Critical applications needing rapid failover

Failure Threshold:
Low (2-3): Faster failover, more false positives
High (5-10): Slower failover, fewer false positives
Recommended: 3 for most use cases

Health Check Path:
❌ Bad: /
❌ Bad: / (homepage with heavy processing)
✅ Good: /health (lightweight dedicated endpoint)
✅ Good: /api/health (checks dependencies)

Endpoint Requirements:
- Fast response (< 2 seconds)
- Check critical dependencies (database, cache)
- Return 200 OK when healthy
- Return 5xx when unhealthy
- Don't cache health check responses
```


### Alias Records vs CNAME Records

A critical Route 53 concept that causes frequent confusion:

**CNAME Records (Standard DNS):**

```
What: Creates alias to another domain name
Limitations:
❌ Cannot be used at zone apex (root domain)
   - example.com CNAME → invalid
   - www.example.com CNAME → valid
❌ Cannot coexist with other record types
❌ Incurs DNS query charges for each resolution
❌ Works with any DNS provider

Cost Impact:
Query 1: example.com CNAME → www.example.com ($0.40/million)
Query 2: www.example.com A → 192.0.2.1 ($0.40/million)
Total: 2 queries charged

Example:
www.example.com CNAME → example.com
blog.example.com CNAME → hosting-platform.com
```

**Alias Records (Route 53-Specific):**

```
What: Route 53 extension for AWS resources
Advantages:
✅ Can be used at zone apex (root domain)
✅ Can coexist with other record types
✅ No charge for queries to AWS resources
✅ Native AWS resource integration
✅ Automatic IP address updates

Supported AWS Resources:
- CloudFront distributions
- Elastic Load Balancers (ALB, NLB, CLB)
- S3 website endpoints
- API Gateway
- VPC endpoints
- AWS Global Accelerator
- Another Route 53 record in same hosted zone

Cost Impact:
Query: example.com ALIAS → CloudFront
Cost: Free (no charge for alias queries to AWS resources)

Example:
example.com (Alias) → CloudFront distribution
www.example.com (Alias) → ALB
api.example.com (Alias) → API Gateway
```

**When to Use Each:**

```
Use CNAME when:
- Pointing to non-AWS resource
- Subdomain (not zone apex)
- Need standard DNS compatibility
- Pointing to external service

Use Alias when:
- Pointing to AWS resource
- Zone apex (root domain)
- Want to save costs (free queries)
- Need automatic IP updates
- AWS-native integration

Example Decision Tree:
┌─────────────────────────────────────┐
│ Need to route zone apex?            │
├─────────────────┬───────────────────┤
│ Yes             │ No                │
│                 │                   │
│ Pointing to AWS?│ Pointing to AWS? │
│                 │                   │
│ Yes → ALIAS     │ Yes → ALIAS       │
│ No → Cannot use │ No → CNAME        │
│      (DNS limit)│                   │
└─────────────────┴───────────────────┘
```


### Traffic Flow and Traffic Policies

Traffic Flow provides visual editor for complex routing configurations:

**Traffic Flow Capabilities:**

```
Visual Policy Editor:
- Drag-and-drop interface
- Combine multiple routing policies
- Complex decision trees
- Version control for policies
- Reusable across hosted zones

Policy Components:
├── Endpoints (targets)
├── Rules (routing decisions)
│   ├── Geolocation rules
│   ├── Geo proximity rules
│   ├── Latency rules
│   ├── Failover rules
│   └── Weighted rules
├── Health checks
└── Combinations of above

Cost:
- $50/month per policy record
- Expensive for simple scenarios
- Cost-effective for complex routing

When to Use:
✅ Complex multi-region architectures
✅ Multiple routing policies combined
✅ Need visual representation
✅ Frequently update routing logic
✅ Reuse policies across domains

When NOT to Use:
❌ Simple routing scenarios
❌ Cost-sensitive applications
❌ Single routing policy sufficient
❌ Static routing configuration
```

**Traffic Flow Example Scenario:**

```
Global E-commerce Site Requirements:
1. Route users to nearest region (latency-based)
2. Within region, distribute across AZs (weighted)
3. Failover to backup region if primary unhealthy
4. Special handling for EU users (compliance)
5. Gradually migrate traffic to new infrastructure

Traffic Flow Policy:
                    [User Request]
                          │
                    [Geolocation]
                          │
          ┌───────────────┼───────────────┐
          │               │               │
      [Europe]       [Americas]      [Asia-Pacific]
          │               │               │
    [Compliance     [Latency-Based   [Latency-Based
     Routing]        Routing]         Routing]
          │               │               │
    [eu-west-1]    [us-east-1]     [ap-southeast-1]
          │               │               │
     [Weighted]      [Weighted]      [Weighted]
          │               │               │
    ┌─────┴──────┐  ┌────┴─────┐  ┌─────┴──────┐
    │            │  │          │  │            │
[AZ-a 60%] [AZ-b 40%] [Old 20%] [New 80%] [AZ-a] [AZ-b]
    │            │  │          │  │            │
 [Health     [Health  [Health  [Health  [Health  [Health
  Check]      Check]   Check]   Check]   Check]   Check]
    │            │  │          │  │            │
[Failover]  [Failover] [Failover] [Failover] [Failover] [Failover]
    │            │  │          │  │            │
[Backup]    [Backup] [Backup] [Backup] [Backup] [Backup]

This complex logic requires Traffic Flow
Simple routing policies cannot achieve this
```


### DNSSEC (DNS Security Extensions)

DNSSEC adds cryptographic signatures to DNS records, preventing DNS spoofing and cache poisoning:

**DNSSEC Concepts:**

```
Problem Without DNSSEC:
User requests: www.bank.com
Attacker intercepts DNS response
Attacker provides fake IP (attacker's server)
User connects to phishing site
User credentials stolen

How DNSSEC Prevents This:
1. DNS records are digitally signed
2. Signatures verified using public key cryptography
3. Chain of trust from root to domain
4. Tampered records detected and rejected

DNSSEC Record Types:
- RRSIG: Signature for record set
- DNSKEY: Public key for verification
- DS: Delegation signer (links child to parent)
- NSEC/NSEC3: Authenticated denial of existence

Trust Chain:
Root Zone (signed by ICANN)
    ↓
.com TLD (signed by root)
    ↓
example.com (signed by .com)
    ↓
www.example.com (signed by example.com)

Each level verifies signature of next level
```

**DNSSEC in Route 53:**

```
Route 53 DNSSEC Support:
✅ Signing: Route 53 can sign hosted zones
✅ Validation: Route 53 resolvers validate DNSSEC
✅ Key Management: Integrated with KMS

Enabling DNSSEC:
1. Enable signing in Route 53 hosted zone
2. Route 53 generates KSK (Key Signing Key)
3. Route 53 generates ZSK (Zone Signing Key)
4. Add DS record to parent zone (.com registrar)
5. DNSSEC chain of trust established

Key Rotation:
- ZSK: Rotated automatically
- KSK: Rotate manually (recommended yearly)
- Zero-downtime rotation process

Cost:
- $0.50/month per hosted zone
- $0.10/month per KSK stored in KMS
- CloudWatch alarm for KSK rotation: Free

Limitations:
- Cannot use with some older DNS resolvers
- Adds complexity to DNS troubleshooting
- Larger DNS responses
- Not supported with all registrars
```

**DNSSEC Deployment Considerations:**

```
When to Enable DNSSEC:
✅ Financial services
✅ Healthcare applications
✅ E-commerce sites
✅ Government systems
✅ High-security requirements
✅ Compliance mandates

When NOT to Enable:
❌ Development/test environments
❌ Internal-only domains
❌ Legacy system compatibility issues
❌ No security requirements
❌ Registrar doesn't support DS records

Monitoring DNSSEC:
- CloudWatch alarms for key rotation
- Test DNSSEC validation regularly
- Monitor for signing errors
- Test from DNSSEC-aware resolvers
- Have rollback plan ready
```


## Hands-On Implementation

### Lab 1: Basic Domain Setup with Multiple Record Types

```bash
# Create hosted zone
aws route53 create-hosted-zone \
    --name example.com \
    --caller-reference $(date +%s) \
    --hosted-zone-config Comment="Production domain"

# Create A record for root domain
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'

# Create www subdomain pointing to same IP
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'
```


### Lab 2: Failover Configuration

```bash
# Create health check
HEALTH_CHECK_ID=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        ResourcePath=/health,\
        FullyQualifiedDomainName=primary.example.com,\
        Port=443,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

# Primary record with health check
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "Primary",
          "Failover": "PRIMARY",
          "HealthCheckId": "'$HEALTH_CHECK_ID'",
          "TTL": 60,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'

# Secondary record (backup)
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "Secondary",
          "Failover": "SECONDARY",
          "TTL": 60,
          "ResourceRecords": [{"Value": "198.51.100.1"}]
        }
      }]
    }'
```


## Tips \& Best Practices

**Tip 1: Lower TTL Before Changes**
Reduce TTL to 60 seconds 24 hours before making changes for faster propagation.

**Tip 2: Use Alias Records for AWS Resources**
Always use alias records (not CNAME) for CloudFront, ALB, S3—it's free and works at zone apex.

**Tip 3: Implement Health Checks for All Failover**
Never use failover routing without health checks—Route 53 won't know when to failover.

**Tip 4: Test Failover Procedures**
Regularly test health check failures to verify failover works as expected.

**Tip 5: Use Private Hosted Zones for Internal Resources**
Keep internal resource names in private hosted zones, separate from public DNS.

## Pitfalls \& Remedies

**Pitfall 1: DNS Propagation Delays**
*Problem:* Changes take hours to propagate globally.
*Solution:* Lower TTL before changes, wait for old TTL to expire before making changes.

**Pitfall 2: Health Check False Positives**
*Problem:* Health checks report unhealthy when resource is actually healthy.
*Solution:* Whitelist Route 53 health checker IPs, ensure path returns quickly, increase failure threshold.

**Pitfall 3: Using CNAME for Zone Apex**
*Problem:* Cannot create CNAME record for root domain (DNS RFC restriction).
*Solution:* Use alias records for zone apex.

## Review Questions

1. **Route 53 name origin?** TCP/UDP port 53
2. **Alias record cost for AWS resources?** Free
3. **Failover routing requires?** Health check on primary
4. **Maximum health check interval?** 30 seconds (standard)
5. **CNAME at zone apex?** Not allowed (use alias)

***
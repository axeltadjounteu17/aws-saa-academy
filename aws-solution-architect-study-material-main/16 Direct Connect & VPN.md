# Chapter 16: Direct Connect \& VPN

## Introduction

Hybrid cloud architectures require reliable, secure connectivity between on-premises data centers and AWS. While internet-based connections work for initial migrations and small workloads, production enterprises demand dedicated, high-bandwidth, low-latency connections with predictable performance. AWS Direct Connect and AWS VPN provide two complementary approaches: Direct Connect offers dedicated physical connections bypassing the public internet, while VPN tunnels provide encrypted connectivity over existing internet connections. Understanding when to use each—and how to combine them for resilience—is fundamental to enterprise AWS adoption.

The choice between Direct Connect and VPN isn't binary—most enterprise architectures use both. Direct Connect provides primary connectivity with consistent bandwidth (1 Gbps to 100 Gbps), predictable low latency (single-digit milliseconds), and reduced data transfer costs. VPN provides backup connectivity, temporary connections during Direct Connect provisioning, and encrypted tunnels for sensitive data. A typical enterprise pattern uses Direct Connect for high-bandwidth workloads (database replication, large file transfers, backup) with VPN as failover, ensuring continuous connectivity even if the Direct Connect circuit fails.

Misconfigured hybrid connectivity causes expensive, hard-to-debug problems. Routing asymmetry sends traffic one direction via Direct Connect and returns via internet, breaking connections. Insufficient bandwidth during peak hours causes application timeouts. Single points of failure leave enterprises without AWS access during circuit outages. Missing BGP configuration prevents automatic failover. This chapter covers Direct Connect and VPN from fundamentals to production patterns, including connection types, virtual interfaces, VPN tunnels, routing protocols, redundancy architectures, monitoring, troubleshooting, and cost optimization for building resilient hybrid networks.

## Theory \& Concepts

### Hybrid Cloud Connectivity Overview

**Connectivity Options Comparison:**

Modern enterprises need multiple paths between on-premises infrastructure and AWS:

```
Internet Gateway (Public Internet):
Characteristics:
- Variable bandwidth (ISP dependent)
- Variable latency (30-200ms typically)
- Shared infrastructure
- No bandwidth guarantees
- Unpredictable performance

Pros:
✓ Instant availability
✓ No additional AWS costs
✓ Simple setup
✓ Good for initial testing

Cons:
✗ No performance guarantees
✗ Higher latency variability
✗ Security concerns (public internet)
✗ Bandwidth contention
✗ Higher data transfer costs

Use Cases:
- Initial AWS migration
- Low-bandwidth applications
- Development/testing
- Backup connectivity
```

```
AWS Site-to-Site VPN:
Characteristics:
- Encrypted IPsec tunnels
- Over public internet
- Up to 1.25 Gbps per tunnel (4 tunnels = 5 Gbps theoretical)
- Latency: Internet latency + encryption overhead
- Quick setup (minutes to hours)

Pros:
✓ Fast deployment (<1 hour)
✓ Encrypted by default
✓ Cost-effective ($0.05/hour + data transfer)
✓ Flexible routing (BGP support)
✓ Good for moderate bandwidth

Cons:
✗ Performance depends on internet quality
✗ Limited bandwidth vs Direct Connect
✗ Encryption overhead
✗ Latency variability

Use Cases:
- Quick hybrid connectivity
- Backup to Direct Connect
- Small to medium data transfers
- Encrypted communication required
- Branch office connectivity
```

```
AWS Direct Connect:
Characteristics:
- Dedicated physical connection
- Private connection (not over internet)
- 1 Gbps, 10 Gbps, 100 Gbps options
- Consistent low latency (1-5ms typical)
- Predictable bandwidth

Pros:
✓ Consistent performance
✓ Lower latency
✓ Higher bandwidth
✓ Reduced data transfer costs
✓ Private connection
✓ More predictable than internet

Cons:
✗ Expensive setup ($0.30/hour for 1Gbps port + data)
✗ Long provisioning time (weeks to months)
✗ Requires physical connectivity
✗ Complex setup
✗ Not encrypted by default

Use Cases:
- Large data transfers (>1 TB regular)
- Low-latency requirements
- Consistent bandwidth needed
- Cost optimization (high data transfer)
- Hybrid architectures (primary path)
- Database replication
```

**Decision Matrix:**

```
Choose VPN When:
- Need quick setup (hours)
- Bandwidth < 1 Gbps sufficient
- Encryption required
- Temporary connectivity needed
- Testing Direct Connect setup
- Budget constraints
- Backup to Direct Connect

Choose Direct Connect When:
- Need > 1 Gbps bandwidth
- Require consistent low latency
- High data transfer volumes (save costs)
- Performance predictability critical
- Long-term commitment possible
- Primary production path

Choose Both When:
- Need high availability (most enterprises)
- Want automatic failover
- Require maximum reliability
- Can justify dual costs
- Production workloads
```


### AWS Direct Connect Architecture

**Direct Connect Fundamentals:**

Direct Connect bypasses the public internet through dedicated physical connections:

```
Physical Architecture:

On-Premises Data Center
├── Customer Router
│   └── Cross-connect cable
│       ↓
AWS Direct Connect Location (Equinix, etc.)
├── AWS Direct Connect Router
│   └── Private backbone network
│       ↓
AWS Region
├── Direct Connect Gateway (optional)
└── Virtual Private Gateway or Transit Gateway

Connection Types:

Dedicated Connection:
- Physical port dedicated to single customer
- 1 Gbps, 10 Gbps, or 100 Gbps
- Direct from AWS
- Highest performance
- Most expensive

Hosted Connection:
- Shared through AWS Direct Connect Partner
- 50 Mbps to 10 Gbps
- Flexible bandwidth options
- Partner provides equipment
- Lower cost for smaller bandwidth
```

**Virtual Interfaces (VIFs):**

Virtual Interfaces are logical connections over physical Direct Connect:

```
Three VIF Types:

1. Private VIF:
Purpose: Connect to VPC resources (private subnets)
Access: VPC private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
Routing: BGP with Virtual Private Gateway or Transit Gateway
Encryption: Not encrypted (use VPN over Direct Connect if needed)

Connectivity:
Private VIF → Virtual Private Gateway → VPC Private Subnets
              ↓
         EC2, RDS, Lambda (private IPs only)

Use Cases:
- Access EC2 instances
- Database connections (RDS, DynamoDB)
- Internal APIs
- VPC resources

Limitation: One VIF connects to one VPC (or use Transit Gateway)

2. Public VIF:
Purpose: Connect to AWS public services
Access: AWS public IP ranges (S3, DynamoDB, public APIs)
Routing: BGP with AWS public IP prefixes
Encryption: Not encrypted by default

Connectivity:
Public VIF → AWS Public Services (public endpoints)
          ↓
     S3, DynamoDB, CloudFront, public APIs

Use Cases:
- Access S3 buckets
- DynamoDB tables
- Public AWS APIs
- CloudFront distributions

Benefits Over Internet:
- Consistent performance
- Lower latency
- Reduced data transfer costs
- Bypass internet congestion

Important: Does NOT access public IPs in your VPC (use Private VIF + NAT)

3. Transit VIF:
Purpose: Connect to AWS Transit Gateway
Access: Multiple VPCs through single VIF
Routing: BGP with Transit Gateway
Scaling: Up to 5,000 VPCs

Connectivity:
Transit VIF → Transit Gateway → Multiple VPCs
                              ↓
                    VPC-A, VPC-B, VPC-C, ...

Use Cases:
- Enterprise multi-VPC architectures
- Central hub connectivity
- Simplified routing
- Large-scale deployments

Advantage: Single VIF for many VPCs (vs Private VIF per VPC)
```

**Direct Connect Gateway:**

Direct Connect Gateway enables connecting one Direct Connect to multiple VPCs across regions:

```
Without Direct Connect Gateway:
Problem: Need separate Direct Connect per VPC/region
Cost: Multiple Direct Connect connections
Complexity: Multiple physical connections

On-Premises ─┬─ DX → us-east-1 VPC
             ├─ DX → eu-west-1 VPC
             └─ DX → ap-south-1 VPC

With Direct Connect Gateway:
Solution: Single Direct Connect to multiple regions
Cost: One Direct Connect connection
Simplicity: Centralized connectivity

On-Premises ── DX → DX Gateway ─┬─ us-east-1 VPC
                                 ├─ eu-west-1 VPC
                                 └─ ap-south-1 VPC

Characteristics:
- Global resource (not region-specific)
- Associate up to 10 Virtual Private Gateways
- Supports Transit Gateway attachments
- No data transfer between VPCs through gateway
- Simplifies multi-region connectivity

Limitations:
- VPCs cannot have overlapping CIDR blocks
- No transitive routing between VPCs
- Each VPC needs unique address space
- Cannot connect VPCs in same region through gateway alone
```

**BGP Routing with Direct Connect:**

Border Gateway Protocol (BGP) handles dynamic routing:

```
BGP Basics:

BGP ASN (Autonomous System Number):
- On-Premises: Your ASN (public or private)
  - Public: Assigned by ARIN/RIPE/APNIC
  - Private: 64512-65534 (for private use)
- AWS: ASN 64512 (default) or custom for VGW/TGW

BGP Session:
On-Premises Router ↔ AWS Router
    ↓                    ↓
BGP Neighbor         BGP Neighbor
ASN 65000           ASN 64512
    ↓                    ↓
Advertise Routes    Advertise Routes
10.0.0.0/16        172.31.0.0/16 (VPC CIDR)
192.168.0.0/16     VPC route tables

Route Advertisement:

From On-Premises to AWS:
- Advertise on-premises networks
- AWS learns how to reach corporate networks
- Example: 10.0.0.0/8 via Direct Connect

From AWS to On-Premises:
- AWS advertises VPC CIDR blocks
- On-premises learns AWS network topology
- Example: 172.31.0.0/16 (VPC CIDR)

BGP Attributes:

AS_PATH:
- Prevents routing loops
- Shorter path preferred
- Prepend ASN for path manipulation

Local Preference:
- Higher value preferred
- Prefer Direct Connect over VPN
- Set on inbound from AWS

MED (Multi-Exit Discriminator):
- Lower value preferred
- Influence inbound traffic
- Prefer primary over backup

Communities:
- Tag routes for policy
- No-export: Don't advertise further
- AWS-specific communities available
```

**Direct Connect Redundancy:**

High availability requires redundant connections:

```
Single Point of Failure (AVOID):

On-Premises ─ Single Router ─ Single DX ─ Single DX Location ─ AWS

Failure Points:
✗ Router failure = outage
✗ DX circuit failure = outage
✗ DX location failure = outage
✗ No automatic failover

Recommended: Dual Active/Active:

On-Premises
├── Router 1 ─ DX Connection 1 ─ DX Location A ─┐
│                                                ├─ AWS
└── Router 2 ─ DX Connection 2 ─ DX Location B ─┘

Benefits:
✓ No single point of failure
✓ Automatic failover (BGP)
✓ Load balancing possible
✓ Geographic diversity

Cost: 2× Direct Connect costs

Alternative: DX Primary + VPN Backup:

On-Premises
├── Router 1 ─ DX Connection ─ DX Location ────┐
│                                               ├─ AWS
└── Router 2 ─ VPN Tunnel ─── Internet ────────┘

Benefits:
✓ Lower cost than dual DX
✓ Automatic failover (BGP)
✓ VPN encryption for sensitive data
✓ Faster than single DX provisioning

Trade-offs:
- VPN limited bandwidth
- VPN higher latency
- Internet dependency for backup

BGP Configuration for Failover:
Primary DX: AS_PATH = [65000, 64512]
Backup VPN: AS_PATH = [65000, 65000, 65000, 64512] (prepended)
AWS prefers shorter path (DX), fails over to VPN automatically
```

**Direct Connect Link Aggregation Groups (LAG):**

LAG combines multiple connections into single logical connection:

```
LAG Characteristics:

Without LAG:
DX Connection 1 (10 Gbps) ─── Independent
DX Connection 2 (10 Gbps) ─── Independent
Total: 20 Gbps, managed separately

With LAG:
LAG Group (20 Gbps total)
├── DX Connection 1 (10 Gbps) ┐
└── DX Connection 2 (10 Gbps) ┘─ Single logical link

Benefits:
✓ Simplified management (one logical link)
✓ Automatic load balancing
✓ Active-active bandwidth usage
✓ Redundancy within LAG

Requirements:
- Same bandwidth for all connections
- Same Direct Connect location
- Terminate on same device
- Maximum 4 connections per LAG
- All active or all standby (no active-standby mix)

Use Cases:
- Need > 10 Gbps bandwidth
- Simplified configuration
- Automatic load distribution
- Same-location redundancy

Limitations:
- No geographic diversity (same location)
- All connections must be same speed
- Single location failure affects all
```


### AWS Site-to-Site VPN Architecture

**VPN Components:**

Site-to-Site VPN creates encrypted IPsec tunnels over internet:

```
VPN Architecture:

On-Premises
├── Customer Gateway Device (your VPN router)
│   ├── Public IP address
│   ├── BGP ASN (optional, for dynamic routing)
│   └── IPsec support
│       ↓
   Internet (encrypted tunnel)
       ↓
AWS Virtual Private Gateway or Transit Gateway
├── Attached to VPC(s)
├── Two VPN tunnels (redundancy)
└── BGP or static routing

VPN Tunnel Details:
- Two tunnels per VPN connection (high availability)
- Each tunnel:
  * Independent internet path
  * Separate public IP endpoint
  * IPsec encryption (AES 128/256)
  * Up to 1.25 Gbps bandwidth (single tunnel)
- ECMP support: 4 tunnels = 5 Gbps theoretical max
```

**Customer Gateway:**

Customer Gateway represents on-premises VPN device:

```
Customer Gateway Configuration:

Required Information:
1. Public IP Address:
   - Static public IP of on-premises VPN device
   - Dynamic IP if using NAT (less reliable)
   - Must be reachable from internet

2. BGP ASN:
   - For dynamic routing
   - Private ASN: 64512-65534
   - Public ASN: If you have one
   - Static routing: Use default (65000)

3. Device Type:
   - Cisco, Juniper, Palo Alto, pfSense, etc.
   - AWS provides config templates
   - Generic IPsec for unsupported devices

Supported Devices:
✓ Cisco ASA, IOS, ISR
✓ Juniper J-Series, SRX
✓ Palo Alto
✓ pfSense, strongSwan
✓ Generic IPsec
✗ Home routers (usually insufficient)
```

**Virtual Private Gateway (VGW):**

VGW is AWS-side VPN/Direct Connect endpoint for single VPC:

```
VGW Characteristics:

Purpose: VPN/DX termination for one VPC
Capacity: Highly available, AWS-managed
Scaling: Automatic (no capacity planning)
Cost: $0.05/hour per VPN connection

Architecture:
VGW (attached to VPC)
├── Route propagation to VPC route tables
├── Multiple VPN connections supported
├── Direct Connect Private VIF attachment
└── Multiple customer gateways (failover)

Limitations:
- Connects to single VPC only
- No VPC-to-VPC routing through VGW
- Throughput: ~1.25 Gbps per tunnel
- For multi-VPC: Use Transit Gateway instead

Route Propagation:
When enabled, VGW automatically updates VPC route tables
with learned BGP routes from on-premises
```

**Transit Gateway (TGW):**

Transit Gateway is hub for multiple VPCs and VPN/Direct Connect:

```
Transit Gateway Benefits:

Without TGW (VGW approach):
Problem: Need VPN per VPC
Complexity: N VPCs = N VPN connections
Management: Configure N customer gateways

VPC-A ─── VPN 1 ─── On-Premises
VPC-B ─── VPN 2 ─── On-Premises
VPC-C ─── VPN 3 ─── On-Premises

With TGW:
Solution: Single VPN for all VPCs
Simplicity: One VPN connection
Management: Single customer gateway

        Transit Gateway
       ↗      ↑      ↖
VPC-A    VPN    VPC-B
             ↑
        On-Premises

TGW Characteristics:
- Regional router hub
- Up to 5,000 VPC attachments
- Up to 20 VPN connections (higher with support)
- ECMP for multiple VPN tunnels
- Inter-VPC routing
- Cross-region peering

VPN Performance with TGW:
- ECMP support: Multiple VPN connections
- Theoretical: 4 connections × 1.25 Gbps/tunnel × 2 tunnels = 10 Gbps
- Practical: ~7 Gbps with ECMP across 4 VPN connections
- Much higher than VGW single tunnel limit

Cost:
- $0.05/hour per attachment
- $0.02/GB data processing
- $0.05/hour per VPN connection
```

**Static vs Dynamic Routing:**

```
Static Routing:

Configuration:
- Manually configure routes on both sides
- On-premises: Routes to AWS CIDR blocks
- AWS: Routes to on-premises networks
- No BGP required

Advantages:
✓ Simpler setup
✓ No BGP knowledge needed
✓ Deterministic routing
✓ Suitable for simple networks

Disadvantages:
✗ Manual updates for network changes
✗ No automatic failover
✗ No path selection
✗ Cannot use ECMP
✗ Limited scalability

Use Cases:
- Small deployments
- Simple network topology
- No failover requirements
- Single VPN connection

Dynamic Routing (BGP):

Configuration:
- BGP between customer gateway and AWS
- Automatic route advertisement
- Path selection via BGP attributes
- ECMP for multiple paths

Advantages:
✓ Automatic failover
✓ Dynamic updates
✓ ECMP load balancing
✓ Path preference control
✓ Scalable

Disadvantages:
✗ More complex setup
✗ Requires BGP knowledge
✗ Routing protocol overhead
✗ Potential misconfigurations

Use Cases:
- Production environments
- Multiple connections
- Automatic failover needed
- Large enterprises
- Multi-region deployments

Recommendation: Always use BGP for production
```

**VPN Redundancy Patterns:**

```
Pattern 1: Dual Tunnel (Default):

Single VPN Connection = 2 Tunnels
├── Tunnel 1: Active
└── Tunnel 2: Standby (automatic failover)

AWS provides two endpoints automatically
Configure both tunnels on customer gateway
BGP prefers tunnel 1, fails to tunnel 2

Pattern 2: Multiple VPN Connections:

Multiple Customer Gateways ↔ AWS VGW/TGW

On-Premises
├── Router 1 ─── VPN Connection 1 (2 tunnels) ───┐
│                                                  ├─ TGW
└── Router 2 ─── VPN Connection 2 (2 tunnels) ───┘

Total: 4 tunnels (active-active with ECMP)
Bandwidth: Up to 5 Gbps theoretical
Redundancy: Router, connection, tunnel levels

Pattern 3: VPN + Direct Connect:

On-Premises
├── Router 1 ─── Direct Connect (primary) ────────┐
│                                                  ├─ AWS
└── Router 2 ─── VPN (backup) ────────────────────┘

BGP: DX preferred (shorter AS_PATH or higher local_pref)
Failover: Automatic via BGP convergence
Cost: Lower than dual DX
Performance: DX performance, VPN backup
```


### VPN Encryption and Security

**IPsec Protocol Details:**

```
IPsec (Internet Protocol Security):

Phase 1 (IKE - Internet Key Exchange):
- Establish secure channel
- Authenticate peers
- Exchange keys
- Create security association

Algorithms:
- Encryption: AES-128, AES-256
- Integrity: SHA-1, SHA-256
- DH Group: 2, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24

Lifetime: 28800 seconds (8 hours)

Phase 2 (IPsec):
- Data encryption tunnel
- ESP protocol (Encapsulating Security Payload)
- Protects actual data packets

Algorithms:
- Encryption: AES-128, AES-256, AES-128-GCM-16, AES-256-GCM-16
- Integrity: SHA-1, SHA-256
- PFS (Perfect Forward Secrecy): Enabled

Lifetime: 3600 seconds (1 hour)

Dead Peer Detection (DPD):
- Interval: 10 seconds
- Retries: 3
- Ensures tunnel liveness
- Triggers reconnection on failure
```

**VPN Performance Considerations:**

```
Factors Affecting VPN Performance:

1. Internet Quality:
   - Bandwidth availability
   - Latency (base + encryption)
   - Packet loss
   - Jitter
   Impact: High variability

2. Encryption Overhead:
   - CPU usage for encryption/decryption
   - AES-NI hardware acceleration helps
   - 10-20% performance impact typical
   Impact: Lower throughput than raw bandwidth

3. MTU and Fragmentation:
   - IPsec overhead: ~50-60 bytes
   - Recommended MTU: 1400 bytes
   - Fragmentation causes performance degradation
   Impact: Packet drops, retransmissions

4. Distance and Latency:
   - Geographic distance
   - Internet routing
   - Encryption processing time
   Impact: Higher RTT

Optimization Tips:
✓ Use hardware with AES-NI
✓ Configure correct MTU (1400)
✓ Enable TCP MSS clamping
✓ Use quality internet connection
✓ Consider Direct Connect for primary
✓ Monitor tunnel health and latency
```


### Hybrid DNS Resolution

**DNS Considerations in Hybrid Architectures:**

```
Problem: On-Premises and AWS Need to Resolve Each Other's Names

Scenario:
On-Premises: company.internal (Active Directory)
AWS: aws.company.internal (Route 53 Private Hosted Zone)

Requirements:
1. On-premises systems query AWS resources (RDS, EC2)
2. AWS resources query on-premises systems (AD, databases)
3. Maintain split-horizon DNS
4. Secure DNS traffic

Solutions:

Option 1: DNS Forwarding

On-Premises DNS Server
├── Forward aws.company.internal → Route 53 Inbound Endpoint
└── Resolve company.internal locally

Route 53 Resolver (in VPC)
├── Inbound Endpoint: Receives queries from on-premises
├── Outbound Endpoint: Forwards queries to on-premises
└── Rules: company.internal → On-premises DNS

Flow:
On-Prem Host queries db.aws.company.internal
    ↓
On-Prem DNS forwards to Route 53 Inbound Endpoint
    ↓
Route 53 resolves from Private Hosted Zone
    ↓
Returns IP address
    ↓
On-Prem Host connects

AWS Host queries dc.company.internal  
    ↓
Route 53 Resolver Outbound Endpoint
    ↓
Forwarding Rule routes to On-Prem DNS
    ↓
On-Prem DNS resolves
    ↓
Returns IP address
    ↓
AWS Host connects

Option 2: Conditional Forwarding (Simple)

On-Premises DNS:
- Forward aws.company.internal → Route 53 Inbound Endpoint IPs

AWS VPC DHCP Options:
- Set domain-name-servers to Route 53 Resolver IPs
- Manually configure conditional forwarder on EC2 instances

Limitations:
- Less automated
- Doesn't scale well
- Manual EC2 configuration needed

Option 3: Route 53 Resolver Endpoints (Recommended)

Components:
1. Inbound Endpoint:
   - ENI in VPC subnets
   - Receives DNS queries from on-premises
   - IP addresses for on-prem DNS to forward to

2. Outbound Endpoint:
   - ENI in VPC subnets
   - Sends DNS queries to on-premises
   - Requires forwarding rules

3. Forwarding Rules:
   - company.internal → On-prem DNS IPs
   - Can be shared across accounts (RAM)

Cost:
- $0.125/hour per endpoint per AZ
- $0.40/million queries
- 2 AZs × 2 endpoints = $0.50/hour = $365/month

Best Practice:
- Deploy in at least 2 AZs (high availability)
- Use consistent naming conventions
- Document DNS hierarchy
- Test failover scenarios
```


### Monitoring and Troubleshooting

**Direct Connect Monitoring:**

```
Key Metrics:

1. ConnectionState:
   - Up: Connection is active
   - Down: Connection failed
   - Alert: Critical

2. ConnectionBpsEgress/Ingress:
   - Bandwidth utilization
   - Monitor for capacity planning
   - Alert: > 80% sustained

3. ConnectionPpsEgress/Ingress:
   - Packets per second
   - Identify traffic patterns
   - Alert: Unusual spikes

4. ConnectionLightLevelTx/Rx:
   - Optical signal strength (fiber)
   - Low levels indicate issues
   - Alert: Below -20 dBm

5. VirtualInterfaceBpsEgress/Ingress:
   - Per-VIF bandwidth
   - Identify VIF bottlenecks
   - Alert: Unexpected traffic

CloudWatch Alarms:
- Connection down for 5 minutes
- Bandwidth > 80% for 15 minutes
- Light level drop
- Packet loss rate increase
```

**VPN Monitoring:**

```
Key Metrics:

1. TunnelState:
   - Up: Tunnel established
   - Down: Tunnel failed
   - Alert: Both tunnels down = critical

2. TunnelDataIn/Out:
   - Bandwidth utilization
   - Billing reference
   - Alert: Unexpected traffic

3. TunnelDataPackets:
   - Packet count
   - Identify patterns
   - Alert: Packet loss

Tunnel Health Checks:
- Phase 1 established
- Phase 2 established
- BGP peer status
- Routes advertised/received

Common Issues:

Tunnel Down:
- Check customer gateway public IP
- Verify pre-shared key
- Check firewall rules (UDP 500, 4500)
- Verify IPsec parameters match

No Routes Received:
- BGP session established?
- Check BGP configuration
- Verify ASN numbers
- Check route filters

Asymmetric Routing:
- Traffic goes out VPN, returns internet
- Add specific routes on-premises
- Use BGP attributes to prefer VPN

High Latency:
- Internet quality issue
- Check packet loss
- Monitor jitter
- Consider Direct Connect
```


### Cost Optimization

**Direct Connect Costs:**

```
Port Hours:
1 Gbps: $0.30/hour = $219/month
10 Gbps: $2.25/hour = $1,642/month
100 Gbps: $22.50/hour = $16,425/month

Data Transfer:
Out to On-Premises:
- $0.02/GB (much cheaper than internet $0.09/GB)
- Savings: ~78% vs internet transfer

In from On-Premises:
- Free (same as internet)

Break-Even Analysis:
Monthly Data Transfer Out: 3 TB
Internet cost: 3000 GB × $0.09 = $270
DX port cost: $219/month
DX transfer cost: 3000 GB × $0.02 = $60
DX total: $219 + $60 = $279

Conclusion: Need > 3.5 TB/month transfer to justify 1Gbps DX
For 10 TB/month:
Internet: $900
DX: $219 + $200 = $419
Savings: $481/month (53%)
```

**VPN Costs:**

```
VPN Connection: $0.05/hour = $36.50/month
Data Transfer: Standard rates ($0.09/GB)
No port charges

Cost Comparison (1 month):
VPN: $36.50 + data transfer
DX 1Gbps: $219 + reduced data transfer

VPN Cheaper When:
- Low data transfer (< 2 TB/month)
- Temporary connection
- Backup only (low usage)
- Testing/development

DX Cheaper When:
- High data transfer (> 3 TB/month)
- Consistent usage
- Primary production path
- Multiple VPCs need connectivity
```


## Hands-On Implementation

### Lab 1: Site-to-Site VPN Configuration

```bash
# Create customer gateway
aws ec2 create-customer-gateway \
    --type ipsec.1 \
    --public-ip 203.0.113.1 \
    --bgp-asn 65000

# Create virtual private gateway
aws ec2 create-vpn-gateway --type ipsec.1

# Attach to VPC
aws ec2 attach-vpn-gateway \
    --vpn-gateway-id vgw-12345678 \
    --vpc-id vpc-87654321

# Create VPN connection
aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --customer-gateway-id cgw-12345678 \
    --vpn-gateway-id vgw-12345678 \
    --options TunnelOptions='[{TunnelInsideCidr=169.254.10.0/30,PreSharedKey=SecureKey123}]'
```


## Tips \& Best Practices

**Tip 1: Always Use Redundancy**
Never deploy single Direct Connect or VPN—use dual connections or DX + VPN backup.

**Tip 2: Plan IP Addressing Carefully**
Avoid overlapping CIDR blocks between on-premises and AWS VPCs—use RFC 1918 thoughtfully.

**Tip 3: Use BGP for Production**
Static routing lacks failover capabilities—BGP enables automatic failover and ECMP.

**Tip 4: Monitor Bandwidth Utilization**
Set CloudWatch alarms at 80% bandwidth to plan capacity before hitting limits.

**Tip 5: Test Failover Regularly**
Schedule quarterly failover tests to verify backup connectivity works when needed.

## Pitfalls \& Remedies

**Pitfall 1: Routing Asymmetry**
Traffic goes Direct Connect outbound but returns via internet, breaking connections.
*Solution:* Ensure consistent routing via BGP attributes and specific routes.

**Pitfall 2: Insufficient Bandwidth**
Direct Connect undersized for actual traffic causes performance issues.
*Solution:* Monitor utilization, plan for peak traffic + 20% headroom.

**Pitfall 3: No VPN Backup**
Single Direct Connect fails, entire AWS connectivity lost for hours/days.
*Solution:* Always deploy VPN backup for automatic failover during Direct Connect issues.

## Review Questions

1. **Direct Connect standard speeds?** 1 Gbps, 10 Gbps, 100 Gbps
2. **VPN tunnel bandwidth limit?** 1.25 Gbps per tunnel
3. **Private VIF connects to?** VPC via Virtual Private Gateway
4. **VPN connection includes how many tunnels?** Two (for redundancy)
5. **Direct Connect encrypted by default?** No (use VPN over DX or Transit Gateway VPN)

***

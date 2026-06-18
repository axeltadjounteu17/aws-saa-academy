# Chapter 3: Virtual Private Cloud (VPC)

## Introduction

Amazon Virtual Private Cloud (VPC) is the networking foundation of your AWS infrastructure. It provides isolated network environments where you can launch AWS resources with complete control over IP addressing, subnets, route tables, and network gateways. While IAM controls *who* can access your resources, VPC controls *how* resources communicate with each other and the outside world.

Think of VPC as your private data center in the cloud, but with the flexibility and scalability that traditional networking could never provide. You can create multiple isolated networks within a single AWS account, segment them into public and private subnets, control traffic flow with security groups and network ACLs, and connect to on-premises networks through VPN or Direct Connect. This level of control is essential for building secure, compliant, and high-performance applications.

The importance of proper VPC design cannot be overstated. A well-architected VPC enables security through network isolation, supports high availability through multi-AZ deployments, facilitates hybrid cloud connectivity, and scales to accommodate future growth. Conversely, poor VPC design leads to IP address exhaustion, complex and fragile routing configurations, security vulnerabilities, and costly re-architecture efforts.

This chapter provides comprehensive coverage of VPC fundamentals, advanced networking patterns, and production-ready architectures. You'll learn to design CIDR blocks that scale, implement defense-in-depth network security, build resilient multi-tier applications, and integrate on-premises networks seamlessly. Whether you're deploying your first application in AWS or architecting global-scale infrastructure, mastering VPC is fundamental to your success as a Solutions Architect.

## Theory \& Concepts

### VPC Fundamentals

A VPC is a logically isolated section of the AWS Cloud where you can launch resources in a virtual network that you define. Each VPC exists within a single AWS Region but can span multiple Availability Zones.

**Key Characteristics:**

- **Regional Scope:** VPCs are region-specific; they cannot span multiple regions
- **Multiple AZ Support:** Subnets within a VPC can be distributed across AZs
- **IP Address Control:** You define the IP address range using CIDR notation
- **Default Limits:** 5 VPCs per region (soft limit, can be increased)
- **Complete Isolation:** VPCs are isolated from each other by default

**Default VPC:**

Every AWS account comes with a default VPC in each region:

- CIDR block: 172.31.0.0/16
- One default subnet per AZ (typically /20)
- Internet Gateway attached
- Default security group and network ACL
- Convenient for getting started, but production workloads should use custom VPCs


### CIDR Blocks and IP Addressing

CIDR (Classless Inter-Domain Routing) notation defines IP address ranges for your VPC.

**CIDR Notation:** `10.0.0.0/16`

- First part: Network address (10.0.0.0)
- Second part: Prefix length (16 bits for network, 16 bits for hosts)

**AWS VPC CIDR Requirements:**

- Minimum: /28 (16 IP addresses)
- Maximum: /16 (65,536 IP addresses)
- Can use RFC 1918 private IP ranges:
    - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
    - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
- Can use publicly routable CIDR blocks (not recommended)

**CIDR Block Sizing:**


| CIDR | Total IPs | Usable IPs | Use Case |
| :-- | :-- | :-- | :-- |
| /28 | 16 | 11 | Very small subnets |
| /24 | 256 | 251 | Small subnets (typical private subnet) |
| /20 | 4,096 | 4,091 | Medium subnets (typical public subnet) |
| /16 | 65,536 | 65,531 | Entire VPC (typical size) |

**AWS Reserves 5 IPs per Subnet:**

- First IP: Network address
- Second IP: VPC router
- Third IP: DNS server
- Fourth IP: Future use
- Last IP: Network broadcast address

Example: In 10.0.0.0/24:

- 10.0.0.0 - Network address (reserved)
- 10.0.0.1 - VPC router (reserved)
- 10.0.0.2 - DNS server (reserved)
- 10.0.0.3 - Future use (reserved)
- 10.0.0.4-10.0.0.254 - Available for use (251 addresses)
- 10.0.0.255 - Broadcast address (reserved)

**Secondary CIDR Blocks:**

You can add up to 5 secondary CIDR blocks to a VPC:

- Useful when you run out of IP addresses
- Must not overlap with existing CIDR blocks
- Cannot be removed if subnets are using them


### Subnets

Subnets are subdivisions of a VPC's IP address range where you launch AWS resources.

**Subnet Characteristics:**

- **AZ-Specific:** Each subnet exists in a single Availability Zone
- **CIDR Subset:** Subnet CIDR must be within the VPC CIDR range
- **No Overlap:** Subnets cannot have overlapping CIDR blocks
- **Public vs Private:** Classification based on routing (not inherent property)

**Public Subnets:**

- Have route to Internet Gateway (IGW)
- Resources get public IP addresses
- Used for: Web servers, load balancers, bastion hosts

**Private Subnets:**

- No direct route to IGW
- Resources use NAT Gateway/Instance for outbound internet
- Used for: Application servers, databases, internal services

**Subnet Sizing Strategy:**

```
Example: VPC 10.0.0.0/16

Public Subnets (smaller, fewer resources):
- 10.0.1.0/24  (AZ-a, 251 hosts)
- 10.0.2.0/24  (AZ-b, 251 hosts)
- 10.0.3.0/24  (AZ-c, 251 hosts)

Private App Subnets (medium):
- 10.0.11.0/24 (AZ-a, 251 hosts)
- 10.0.12.0/24 (AZ-b, 251 hosts)
- 10.0.13.0/24 (AZ-c, 251 hosts)

Private Data Subnets (smaller, highly controlled):
- 10.0.21.0/24 (AZ-a, 251 hosts)
- 10.0.22.0/24 (AZ-b, 251 hosts)
- 10.0.23.0/24 (AZ-c, 251 hosts)

Reserved for future expansion:
- 10.0.100.0/22 (1,019 hosts)
- 10.1.0.0/16 (entire /16 block)
```


### Route Tables

Route tables determine where network traffic from subnets is directed.

**Route Table Components:**

- **Destination:** IP address range (CIDR)
- **Target:** Where to send matching traffic (IGW, NAT, VPC peer, etc.)
- **Main Route Table:** Automatically created with VPC, used by default
- **Custom Route Tables:** Created for specific routing requirements

**Default Local Route:**

Every route table has a local route that enables communication within the VPC:

```
Destination: 10.0.0.0/16
Target: local
```

This route cannot be modified or deleted.

**Route Priority:**

When multiple routes match, AWS uses the most specific route (longest prefix match):

```
10.0.0.0/16 → local
10.0.1.0/24 → NAT Gateway
10.0.1.15/32 → VPN
```

Traffic to 10.0.1.15 uses the VPN route (most specific).

**Route Table Types:**

**Public Route Table:**

```
Destination         Target
10.0.0.0/16        local
0.0.0.0/0          igw-xxxxx
```

**Private Route Table:**

```
Destination         Target
10.0.0.0/16        local
0.0.0.0/0          nat-xxxxx
```

**Isolated Route Table (no internet):**

```
Destination         Target
10.0.0.0/16        local
192.168.0.0/16     vgw-xxxxx (VPN to on-premises)
```


### Internet Gateway (IGW)

An Internet Gateway enables communication between resources in your VPC and the internet.

**IGW Characteristics:**

- **Highly Available:** Redundant and horizontally scaled by AWS
- **No Bandwidth Constraints:** Scales automatically
- **One per VPC:** You can only attach one IGW to a VPC
- **Bidirectional:** Supports inbound and outbound traffic
- **Stateless:** Doesn't track connection state

**Requirements for Internet Access:**

1. Attach IGW to VPC
2. Create route to IGW (0.0.0.0/0 → igw-xxxxx)
3. Assign public IP or Elastic IP to resources
4. Security Group must allow outbound traffic
5. Network ACL must allow traffic

**Public IP vs Elastic IP:**

**Public IP:**

- Automatically assigned to instances in public subnets
- Changes when instance stops/starts
- Cannot be moved between instances
- Free

**Elastic IP (EIP):**

- Static public IP address
- Persists across stops/starts
- Can be reassigned to different instances
- Charged when not associated with running instance
- Useful for: NAT gateways, bastion hosts, whitelisting


### NAT Gateway and NAT Instance

NAT (Network Address Translation) enables instances in private subnets to connect to the internet while preventing inbound connections.

**NAT Gateway (AWS Managed):**

**Characteristics:**

- Fully managed by AWS
- Highly available within a single AZ
- Scales automatically up to **100 Gbps** (updated 2023 — was previously 45 Gbps)
- Billed per hour + data processed
- Supports up to 55,000 simultaneous connections per unique destination

> **2025 Note:** AWS now offers **Private NAT Gateways** (no Elastic IP required) for VPC-to-VPC or VPC-to-on-premises communication entirely within the AWS network, eliminating internet transit.

**Best Practices:**

- Deploy one NAT Gateway per AZ for high availability
- Place in public subnet with route to IGW
- Allocate Elastic IP for stable outbound IP

**Costs:**

- \$0.045 per hour
- \$0.045 per GB processed
- Free data transfer to S3/DynamoDB (same region via gateway endpoint)

**NAT Instance (Self-Managed):**

An EC2 instance configured to perform NAT:

**Advantages:**

- Lower cost (EC2 instance pricing only)
- Can use as bastion host
- Full control over software/configuration

**Disadvantages:**

- Manual management required
- Single point of failure (requires HA setup)
- Limited bandwidth (depends on instance type)
- Must disable source/destination check

**When to Use:**

- NAT Gateway: Production workloads, HA required, hands-off management
- NAT Instance: Cost-sensitive environments, need additional functionality


### Security Groups

Security groups act as virtual firewalls controlling inbound and outbound traffic at the instance level.

**Key Characteristics:**

- **Stateful:** Return traffic automatically allowed
- **Instance-Level:** Applied to ENIs (Elastic Network Interfaces)
- **Default Deny:** All inbound denied, all outbound allowed by default
- **Rules Only:** Cannot explicitly deny traffic (only allow)
- **Multiple SGs:** Up to 5 security groups per instance
- **Rule Changes:** Take effect immediately

**Security Group Rules:**

Each rule specifies:

- **Type:** Protocol (TCP, UDP, ICMP, or all)
- **Port Range:** Single port or range
- **Source/Destination:** IP addresses, CIDR blocks, or other security groups

**Example Rules:**

```
Inbound:
Type: HTTP
Protocol: TCP
Port: 80
Source: 0.0.0.0/0 (anywhere)

Type: HTTPS
Protocol: TCP
Port: 443
Source: 0.0.0.0/0

Type: SSH
Protocol: TCP
Port: 22
Source: 203.0.113.0/24 (your office network)

Type: MySQL
Protocol: TCP
Port: 3306
Source: sg-12345678 (application server security group)
```

**Referencing Security Groups:**

Instead of hardcoding IP addresses, reference other security groups:

```
Web Server SG:
Inbound: Port 80/443 from 0.0.0.0/0

App Server SG:
Inbound: Port 8080 from Web Server SG

Database SG:
Inbound: Port 3306 from App Server SG
```

This creates chained security that automatically adapts as instances are added/removed.

### Network Access Control Lists (NACLs)

NACLs are stateless firewalls that control traffic at the subnet level.

**Key Characteristics:**

- **Stateless:** Return traffic must be explicitly allowed
- **Subnet-Level:** Apply to all resources in subnet
- **Default Allow:** Default NACL allows all traffic
- **Ordered Rules:** Evaluated in numerical order (lowest first)
- **Explicit Deny:** Can explicitly deny traffic (unlike security groups)
- **Evaluation:** Stops at first match

**NACL Rules:**

Each rule has:

- **Rule Number:** 1-32766 (evaluated in order)
- **Type:** Protocol
- **Port Range:** Applicable ports
- **Source/Destination:** CIDR blocks
- **Action:** Allow or Deny

**Example NACL:**

```
Inbound Rules:
Rule #  Type      Protocol  Port   Source        Allow/Deny
100     HTTP      TCP       80     0.0.0.0/0     Allow
110     HTTPS     TCP       443    0.0.0.0/0     Allow
120     SSH       TCP       22     203.0.113.0/24 Allow
130     Custom    TCP       1024-  0.0.0.0/0     Allow (ephemeral ports)
                             65535
*       All       All       All    0.0.0.0/0     Deny

Outbound Rules:
Rule #  Type      Protocol  Port   Destination   Allow/Deny
100     HTTP      TCP       80     0.0.0.0/0     Allow
110     HTTPS     TCP       443    0.0.0.0/0     Allow
120     Custom    TCP       1024-  0.0.0.0/0     Allow (ephemeral ports)
                             65535
*       All       All       All    0.0.0.0/0     Deny
```

**Ephemeral Ports:**

Because NACLs are stateless, you must allow ephemeral ports for return traffic:

- Linux: 32768-61000
- Windows: 49152-65535
- ELB: 1024-65535
- Recommendation: 1024-65535 (covers all)

**Security Groups vs NACLs:**


| Feature | Security Group | NACL |
| :-- | :-- | :-- |
| Level | Instance (ENI) | Subnet |
| State | Stateful | Stateless |
| Rules | Allow only | Allow and Deny |
| Evaluation | All rules | First match |
| Default | Deny all inbound | Allow all |
| Return Traffic | Automatic | Manual |

**Best Practice:** Use security groups as primary security layer, NACLs for additional subnet-level protection.

### VPC Peering

VPC Peering creates a networking connection between two VPCs, enabling routing using private IP addresses.

**Characteristics:**

- **Non-Transitive:** VPCs cannot communicate through an intermediary
- **No Overlapping CIDRs:** Connected VPCs must have distinct IP ranges
- **Cross-Region:** Supports inter-region peering
- **Cross-Account:** Supports connections between different AWS accounts
- **Encrypted:** Inter-region traffic is encrypted
- **No Single Point of Failure:** Highly available by design

**Transitive Routing Example:**

```
VPC A (10.0.0.0/16) ←→ VPC B (10.1.0.0/16) ←→ VPC C (10.2.0.0/16)

VPC A cannot communicate with VPC C through VPC B
Direct peering required: VPC A ←→ VPC C
```

**Peering Limitations:**

- Maximum 125 peering connections per VPC
- No overlapping CIDR blocks
- Security groups can reference peer VPC security groups (same region only)
- Cannot peer with overlapping IPv6 CIDR blocks

**Use Cases:**

- Shared services VPC (DNS, Active Directory)
- Development/test environment access to shared resources
- Multi-region disaster recovery
- Merging networks from acquired companies


### Transit Gateway

AWS Transit Gateway acts as a cloud router, connecting multiple VPCs and on-premises networks through a central hub.

**Key Benefits:**

- **Simplified Topology:** Hub-and-spoke instead of full mesh
- **Transitive Routing:** Supports transitive connections (unlike VPC peering)
- **Scalability:** Connect thousands of VPCs
- **Cross-Region:** Inter-region peering support
- **Route Tables:** Multiple route tables for traffic segmentation
- **Multicast:** Supports multicast traffic

**Transit Gateway vs VPC Peering:**

**VPC Peering Full Mesh (5 VPCs):**

```
Connections required: n(n-1)/2 = 5(4)/2 = 10 peering connections

VPC1 ←→ VPC2
VPC1 ←→ VPC3
VPC1 ←→ VPC4
VPC1 ←→ VPC5
VPC2 ←→ VPC3
VPC2 ←→ VPC4
VPC2 ←→ VPC5
VPC3 ←→ VPC4
VPC3 ←→ VPC5
VPC4 ←→ VPC5
```

**Transit Gateway Hub-Spoke (5 VPCs):**

```
Connections required: n = 5 attachments

      TGW
    /  |  \
VPC1 VPC2 VPC3 VPC4 VPC5
```

**Transit Gateway Attachments:**

- VPC attachments
- VPN connections
- Direct Connect gateways
- Transit Gateway peering (inter-region)

**Transit Gateway Route Tables:**

Create multiple route tables for traffic isolation:

```
Production Route Table:
- Production VPCs can talk to each other
- Can route to on-premises (VPN)
- Cannot access development VPCs

Development Route Table:
- Development VPCs can talk to each other
- Can access shared services
- Cannot access production
```

**Costs:**

- \$0.05 per attachment hour
- \$0.02 per GB processed
- More expensive than VPC peering but provides more flexibility


### VPC Endpoints

VPC Endpoints enable private connections to AWS services without traversing the internet.

**Types of VPC Endpoints:**

**1. Gateway Endpoints (S3 and DynamoDB):**

- **Free:** No data processing charges
- **Route Table Entry:** Added to route tables
- **Region-Specific:** Same-region access only
- **Policy Control:** Resource policies control access

Example route table entry:

```
Destination                   Target
pl-12345678 (S3 prefix list) vpce-xxxxx (Gateway endpoint)
```

**2. Interface Endpoints (PrivateLink):**

- **ENI-Based:** Creates elastic network interface in subnet
- **DNS Resolution:** Private DNS names resolve to private IPs
- **Charged:** \$0.01 per hour + \$0.01 per GB processed
- **AZ-Specific:** Deploy in each AZ for high availability
- **Supports:** Most AWS services (EC2, SNS, SQS, etc.)

**Benefits:**

- Enhanced security (no internet exposure)
- Reduced data transfer costs
- Improved performance (lower latency)
- Meet compliance requirements (data doesn't leave AWS network)

**Use Cases:**

- Access S3 from private subnets without NAT
- Private API Gateway endpoints
- PrivateLink for SaaS applications
- Service-to-service communication


### VPC Flow Logs

VPC Flow Logs capture information about IP traffic flowing through network interfaces.

**Capabilities:**

- **Capture Levels:** VPC, subnet, or ENI
- **Accepted/Rejected:** Log all, accepted only, or rejected only
- **Destinations:** CloudWatch Logs, S3, Kinesis Data Firehose
- **No Performance Impact:** Captured outside the data path

**Flow Log Record Format:**

```
version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status

2 123456789012 eni-abc123 10.0.1.5 198.51.100.1 49152 80 6 10 5200 1620000000 1620000060 ACCEPT OK
```

**Use Cases:**

- Security analysis (identify unauthorized access)
- Troubleshooting connectivity issues
- Cost analysis (data transfer patterns)
- Compliance auditing
- Network traffic analysis

**Analysis with CloudWatch Logs Insights:**

```sql
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, action
| filter action = "REJECT"
| stats count(*) as rejectionCount by srcAddr
| sort rejectionCount desc
| limit 10
```


### DNS in VPC

Every VPC has DNS resolution provided by Amazon Route 53 Resolver.

**DNS Settings:**

- **enableDnsSupport:** DNS resolution enabled (default: true)
- **enableDnsHostnames:** Assign public DNS hostnames (default: depends on VPC type)

**DNS Resolution:**

Internal resources: `ip-10-0-1-5.ec2.internal` (private DNS)
Public resources: `ec2-198-51-100-1.compute-1.amazonaws.com` (public DNS)

**Route 53 Resolver:**

- DNS queries routed to VPC+2 address (e.g., 10.0.0.2)
- Resolves internal names and forwards external queries
- Can configure forwarding rules for on-premises DNS

**Private Hosted Zones:**

Associate private Route 53 hosted zones with VPCs:

- Internal DNS names (app.internal.example.com)
- Cross-VPC DNS resolution
- Hybrid DNS between AWS and on-premises


### Elastic Network Interfaces (ENIs)

An ENI is a logical networking component representing a virtual network card.

**ENI Attributes:**

- **Primary private IPv4 address**
- **One or more secondary private IPv4 addresses**
- **One Elastic IP per private IPv4**
- **One public IPv4 (optional)**
- **One or more security groups**
- **MAC address**
- **Source/destination check flag**

**Use Cases:**

- **Management Network:** Separate ENI for management traffic
- **Dual-Homed Instances:** Multiple subnets/security contexts
- **Licensing:** MAC-based software licenses (ENI retains MAC)
- **High Availability:** Move ENI between instances during failover

**ENI Attachment:**

- Primary ENI: Created with instance, deleted with instance
- Secondary ENI: Can be created independently, attached/detached dynamically


### IPv6 in VPC

VPCs can be dual-stack, supporting both IPv4 and IPv6.

**IPv6 Characteristics:**

- **CIDR Block:** AWS assigns /56 CIDR (256 /64 subnets)
- **Public Addresses:** All IPv6 addresses are public
- **Internet Gateway:** Required for IPv6 internet access
- **Egress-Only Internet Gateway:** IPv6 equivalent of NAT (outbound only)
- **No NAT:** IPv6 doesn't use NAT (every address is globally unique)

**Enabling IPv6:**

1. Associate IPv6 CIDR block with VPC
2. Assign /64 IPv6 CIDR to subnets
3. Update route tables (`::/0` → IGW or EIGW)
4. Auto-assign IPv6 addresses to instances
5. Update security groups/NACLs for IPv6

**Use Cases:**

- IoT applications (large address space)
- Applications requiring end-to-end addressing
- Modern applications designed for IPv6
- Compliance requirements


## Hands-On Implementation

### Lab 1: Building a Production 3-Tier VPC Architecture

**Objective:** Create a highly available, secure VPC with public, application, and database tiers across 3 Availability Zones.

**Architecture Overview:**

```
VPC: 10.0.0.0/16

Public Tier (Web):
- 10.0.1.0/24 (us-east-1a)
- 10.0.2.0/24 (us-east-1b)
- 10.0.3.0/24 (us-east-1c)

Application Tier:
- 10.0.11.0/24 (us-east-1a)
- 10.0.12.0/24 (us-east-1b)
- 10.0.13.0/24 (us-east-1c)

Database Tier:
- 10.0.21.0/24 (us-east-1a)
- 10.0.22.0/24 (us-east-1b)
- 10.0.23.0/24 (us-east-1c)
```


#### Step 1: Create VPC

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=Production-VPC}]' \
    --query 'Vpc.VpcId' \
    --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-hostnames

# Enable DNS support (enabled by default, but verify)
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-support
```


#### Step 2: Create Internet Gateway

```bash
# Create IGW
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=Production-IGW}]' \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

echo "IGW ID: $IGW_ID"

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
    --vpc-id $VPC_ID \
    --internet-gateway-id $IGW_ID
```


#### Step 3: Create Subnets

```bash
# Public Subnets
PUBLIC_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1A},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

PUBLIC_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1B},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

PUBLIC_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.3.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1C},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Application Subnets
APP_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.11.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1A},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

APP_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.12.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1B},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

APP_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.13.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1C},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Database Subnets
DB_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.21.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1A},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

DB_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.22.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1B},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

DB_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.23.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1C},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1A \
    --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1B \
    --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1C \
    --map-public-ip-on-launch
```


#### Step 4: Create NAT Gateways

```bash
# Allocate Elastic IPs for NAT Gateways
EIP_1A=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1A}]' \
    --query 'AllocationId' \
    --output text)

EIP_1B=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1B}]' \
    --query 'AllocationId' \
    --output text)

EIP_1C=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1C}]' \
    --query 'AllocationId' \
    --output text)

# Create NAT Gateways (one per AZ for high availability)
NAT_GW_1A=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1A \
    --allocation-id $EIP_1A \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1A}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

NAT_GW_1B=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1B \
    --allocation-id $EIP_1B \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1B}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

NAT_GW_1C=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1C \
    --allocation-id $EIP_1C \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1C}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

# Wait for NAT Gateways to become available
echo "Waiting for NAT Gateways to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_1A $NAT_GW_1B $NAT_GW_1C
echo "NAT Gateways are ready"
```


#### Step 5: Create Route Tables

```bash
# Public Route Table
PUBLIC_RT=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Public-RT}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add route to Internet Gateway
aws ec2 create-route \
    --route-table-id $PUBLIC_RT \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID

# Associate public subnets with public route table
aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1C

# Private Route Tables (one per AZ for NAT Gateway routing)
PRIVATE_RT_1A=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1A}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1A

PRIVATE_RT_1B=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1B}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1B \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1B

PRIVATE_RT_1C=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1C}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1C \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1C

# Associate application subnets
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $APP_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $APP_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $APP_SUBNET_1C

# Associate database subnets
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $DB_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $DB_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $DB_SUBNET_1C
```


#### Step 6: Create Security Groups

```bash
# Web Tier Security Group (Public-facing)
WEB_SG=$(aws ec2 create-security-group \
    --group-name web-tier-sg \
    --description "Security group for web tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=Web-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Application Tier Security Group
APP_SG=$(aws ec2 create-security-group \
    --group-name app-tier-sg \
    --description "Security group for application tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=App-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow traffic from web tier on port 8080
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# Database Tier Security Group
DB_SG=$(aws ec2 create-security-group \
    --group-name db-tier-sg \
    --description "Security group for database tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=DB-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow MySQL/Aurora from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG

# Bastion Host Security Group (for SSH access)
BASTION_SG=$(aws ec2 create-security-group \
    --group-name bastion-sg \
    --description "Security group for bastion host" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=Bastion-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow SSH from your IP (replace with your IP)
aws ec2 authorize-security-group-ingress \
    --group-id $BASTION_SG \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24  # Replace with your IP

# Allow SSH from bastion to app and DB tiers
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG
```


#### Step 7: Create Network ACLs (Additional Layer)

```bash
# Public Subnet NACL
PUBLIC_NACL=$(aws ec2 create-network-acl \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=Public-NACL}]' \
    --query 'NetworkAcl.NetworkAclId' \
    --output text)

# Inbound rules
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 100 \
    --protocol tcp \
    --port-range From=80,To=80 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 110 \
    --protocol tcp \
    --port-range From=443,To=443 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 120 \
    --protocol tcp \
    --port-range From=22,To=22 \
    --cidr-block 203.0.113.0/24 \
    --rule-action allow

# Ephemeral ports (for return traffic)
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 130 \
    --protocol tcp \
    --port-range From=1024,To=65535 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

# Outbound rules
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --egress \
    --rule-number 100 \
    --protocol -1 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

# Associate with public subnets
aws ec2 replace-network-acl-association \
    --association-id $(aws ec2 describe-network-acls \
        --filters "Name=association.subnet-id,Values=$PUBLIC_SUBNET_1A" \
        --query 'NetworkAcls[0].Associations[0].NetworkAclAssociationId' \
        --output text) \
    --network-acl-id $PUBLIC_NACL
```


#### Step 8: Create VPC Endpoints

```bash
# S3 Gateway Endpoint (free, for private S3 access)
S3_ENDPOINT=$(aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C \
    --query 'VpcEndpoint.VpcEndpointId' \
    --output text)

# DynamoDB Gateway Endpoint
DYNAMODB_ENDPOINT=$(aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.dynamodb \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C \
    --query 'VpcEndpoint.VpcEndpointId' \
    --output text)

echo "VPC Setup Complete!"
echo "VPC ID: $VPC_ID"
echo "Public Subnets: $PUBLIC_SUBNET_1A, $PUBLIC_SUBNET_1B, $PUBLIC_SUBNET_1C"
echo "App Subnets: $APP_SUBNET_1A, $APP_SUBNET_1B, $APP_SUBNET_1C"
echo "DB Subnets: $DB_SUBNET_1A, $DB_SUBNET_1B, $DB_SUBNET_1C"
```


### Lab 2: Implementing VPC Peering

**Objective:** Connect two VPCs in different regions using VPC peering for disaster recovery.

**Scenario:**

- Primary VPC: us-east-1 (10.0.0.0/16)
- DR VPC: us-west-2 (10.1.0.0/16)

```bash
# Create peering connection (from us-east-1)
PEERING_ID=$(aws ec2 create-vpc-peering-connection \
    --vpc-id $VPC_ID_EAST \
    --peer-vpc-id $VPC_ID_WEST \
    --peer-region us-west-2 \
    --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=East-West-Peering}]' \
    --query 'VpcPeeringConnection.VpcPeeringConnectionId' \
    --output text)

# Accept peering connection (in us-west-2)
aws ec2 accept-vpc-peering-connection \
    --vpc-peering-connection-id $PEERING_ID \
    --region us-west-2

# Add routes in us-east-1 route tables
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 10.1.0.0/16 \
    --vpc-peering-connection-id $PEERING_ID

# Add routes in us-west-2 route tables
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_WEST \
    --destination-cidr-block 10.0.0.0/16 \
    --vpc-peering-connection-id $PEERING_ID \
    --region us-west-2

# Update security groups to allow traffic from peered VPC
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --cidr 10.1.0.0/16
```


### Lab 3: Setting Up Transit Gateway

**Objective:** Create a hub-and-spoke architecture using Transit Gateway for multiple VPCs.

```bash
# Create Transit Gateway
TGW_ID=$(aws ec2 create-transit-gateway \
    --description "Production Transit Gateway" \
    --options "AmazonSideAsn=64512,AutoAcceptSharedAttachments=enable,DefaultRouteTableAssociation=enable,DefaultRouteTablePropagation=enable,DnsSupport=enable,VpnEcmpSupport=enable" \
    --tag-specifications 'ResourceType=transit-gateway,Tags=[{Key=Name,Value=Production-TGW}]' \
    --query 'TransitGateway.TransitGatewayId' \
    --output text)

# Wait for Transit Gateway to become available
echo "Waiting for Transit Gateway..."
aws ec2 wait transit-gateway-available --transit-gateway-ids $TGW_ID

# Attach VPC 1 (Production)
TGW_ATTACH_1=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_1 \
    --subnet-ids $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=Production-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Attach VPC 2 (Development)
TGW_ATTACH_2=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_2 \
    --subnet-ids $DEV_SUBNET_1A $DEV_SUBNET_1B $DEV_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=Development-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Attach VPC 3 (Shared Services)
TGW_ATTACH_3=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_3 \
    --subnet-ids $SHARED_SUBNET_1A $SHARED_SUBNET_1B $SHARED_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=SharedServices-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Create custom route tables for traffic isolation
PROD_TGW_RT=$(aws ec2 create-transit-gateway-route-table \
    --transit-gateway-id $TGW_ID \
    --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=Production-TGW-RT}]' \
    --query 'TransitGatewayRouteTable.TransitGatewayRouteTableId' \
    --output text)

DEV_TGW_RT=$(aws ec2 create-transit-gateway-route-table \
    --transit-gateway-id $TGW_ID \
    --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=Development-TGW-RT}]' \
    --query 'TransitGatewayRouteTable.TransitGatewayRouteTableId' \
    --output text)

# Associate attachments with route tables
aws ec2 associate-transit-gateway-route-table \
    --transit-gateway-route-table-id $PROD_TGW_RT \
    --transit-gateway-attachment-id $TGW_ATTACH_1

aws ec2 associate-transit-gateway-route-table \
    --transit-gateway-route-table-id $DEV_TGW_RT \
    --transit-gateway-attachment-id $TGW_ATTACH_2

# Add routes in VPC route tables to Transit Gateway
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 10.2.0.0/16 \
    --transit-gateway-id $TGW_ID  # Route to shared services VPC

echo "Transit Gateway setup complete!"
```


### Lab 4: Enabling VPC Flow Logs

**Objective:** Enable comprehensive network traffic logging for security analysis.

```bash
# Create CloudWatch Log Group
aws logs create-log-group --log-group-name /aws/vpc/flowlogs/production

# Create IAM role for Flow Logs
cat > flow-logs-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "vpc-flow-logs.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

FLOW_LOGS_ROLE=$(aws iam create-role \
    --role-name VPCFlowLogsRole \
    --assume-role-policy-document file://flow-logs-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach policy
cat > flow-logs-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ],
    "Resource": "*"
  }]
}
EOF

aws iam put-role-policy \
    --role-name VPCFlowLogsRole \
    --policy-name VPCFlowLogsPolicy \
    --policy-document file://flow-logs-policy.json

# Enable Flow Logs for VPC
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-group-name /aws/vpc/flowlogs/production \
    --deliver-logs-permission-arn $FLOW_LOGS_ROLE

# Alternative: Flow Logs to S3 (more cost-effective for long-term storage)
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type s3 \
    --log-destination arn:aws:s3:::my-flow-logs-bucket

# Query Flow Logs with CloudWatch Logs Insights
# Use this query to find top talkers
cat > flow-logs-query.txt <<'EOF'
fields @timestamp, srcAddr, dstAddr, bytes
| stats sum(bytes) as totalBytes by srcAddr
| sort totalBytes desc
| limit 10
EOF
```


### Lab 5: CloudFormation Template for Complete VPC

**Objective:** Automate VPC creation with Infrastructure as Code.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production 3-Tier VPC with NAT Gateways and VPC Endpoints'

Parameters:
  EnvironmentName:
    Description: Environment name prefix
    Type: String
    Default: Production
  
  VpcCIDR:
    Description: CIDR block for VPC
    Type: String
    Default: 10.0.0.0/16
  
  EnableNATGateway:
    Description: Enable NAT Gateway for private subnets
    Type: String
    Default: 'true'
    AllowedValues: ['true', 'false']

Conditions:
  CreateNATGateway: !Equals [!Ref EnableNATGateway, 'true']

Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCIDR
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-VPC'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-IGW'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [0, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-1'
        - Key: Tier
          Value: Public

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [1, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-2'
        - Key: Tier
          Value: Public

  PublicSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [2, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-3'
        - Key: Tier
          Value: Public

  # Application Subnets
  AppSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [3, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-1'
        - Key: Tier
          Value: Application

  AppSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [4, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-2'
        - Key: Tier
          Value: Application

  AppSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [5, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-3'
        - Key: Tier
          Value: Application

  # Database Subnets
  DBSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [6, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-1'
        - Key: Tier
          Value: Database

  DBSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [7, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-2'
        - Key: Tier
          Value: Database

  DBSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [8, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-3'
        - Key: Tier
          Value: Database

  # NAT Gateways
  NATGateway1EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway2EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway3EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway1:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-1'

  NATGateway2:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway2EIP.AllocationId
      SubnetId: !Ref PublicSubnet2
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-2'

  NATGateway3:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway3EIP.AllocationId
      SubnetId: !Ref PublicSubnet3
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-3'

  # Public Route Table
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-RT'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  PublicSubnet3RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet3

  # Private Route Tables
  PrivateRouteTable1:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Private-RT-1'

  DefaultPrivateRoute1:
    Type: AWS::EC2::Route
    Condition: CreateNATGateway
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NATGateway1

  AppSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref AppSubnet1

  DBSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref DBSubnet1

  # VPC Endpoints
  S3Endpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.s3'
      RouteTableIds:
        - !Ref PrivateRouteTable1

  DynamoDBEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.dynamodb'
      RouteTableIds:
        - !Ref PrivateRouteTable1

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${EnvironmentName}-VPC-ID'

  PublicSubnets:
    Description: List of public subnet IDs
    Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2, !Ref PublicSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-Public-Subnets'

  AppSubnets:
    Description: List of application subnet IDs
    Value: !Join [',', [!Ref AppSubnet1, !Ref AppSubnet2, !Ref AppSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-App-Subnets'

  DBSubnets:
    Description: List of database subnet IDs
    Value: !Join [',', [!Ref DBSubnet1, !Ref DBSubnet2, !Ref DBSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-DB-Subnets'
```

Deploy the template:

```bash
aws cloudformation create-stack \
    --stack-name production-vpc \
    --template-body file://vpc-template.yaml \
    --parameters ParameterKey=EnvironmentName,ParameterValue=Production

# Monitor stack creation
aws cloudformation wait stack-create-complete --stack-name production-vpc

# Get outputs
aws cloudformation describe-stacks \
    --stack-name production-vpc \
    --query 'Stacks[0].Outputs' \
    --output table
```


## Production-Level Knowledge

### Hub-and-Spoke Architecture with Transit Gateway

For enterprise environments with multiple VPCs and hybrid connectivity, a hub-and-spoke architecture provides centralized management and simplified routing.

**Architecture Components:**

```
                    Transit Gateway
                          |
        +-----------------+------------------+
        |                 |                  |
    Shared Services     Production        Development
        VPC               VPC                VPC
        |                                     |
    (DNS, AD,          (Applications)      (Test Env)
     Monitoring)                             
        |                                     
   VPN/Direct Connect
        |
   On-Premises
```

**Implementation Strategy:**

```python
#!/usr/bin/env python3
# transit_gateway_setup.py

import boto3

ec2 = boto3.client('ec2')

def create_hub_spoke_architecture():
    """Create Transit Gateway hub-and-spoke architecture"""
    
    # Create Transit Gateway
    tgw_response = ec2.create_transit_gateway(
        Description='Enterprise Transit Gateway',
        Options={
            'AmazonSideAsn': 64512,
            'AutoAcceptSharedAttachments': 'enable',
            'DefaultRouteTableAssociation': 'disable',  # Custom route tables
            'DefaultRouteTablePropagation': 'disable',
            'VpnEcmpSupport': 'enable',
            'DnsSupport': 'enable'
        },
        TagSpecifications=[{
            'ResourceType': 'transit-gateway',
            'Tags': [{'Key': 'Name', 'Value': 'Enterprise-TGW'}]
        }]
    )
    
    tgw_id = tgw_response['TransitGateway']['TransitGatewayId']
    print(f"Created Transit Gateway: {tgw_id}")
    
    # Wait for Transit Gateway to become available
    waiter = ec2.get_waiter('transit_gateway_available')
    waiter.wait(TransitGatewayIds=[tgw_id])
    
    # Create route tables for traffic segmentation
    route_tables = {}
    
    for rt_name in ['Production', 'Development', 'SharedServices']:
        rt_response = ec2.create_transit_gateway_route_table(
            TransitGatewayId=tgw_id,
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-route-table',
                'Tags': [{'Key': 'Name', 'Value': f'{rt_name}-TGW-RT'}]
            }]
        )
        route_tables[rt_name] = rt_response['TransitGatewayRouteTable']['TransitGatewayRouteTableId']
        print(f"Created route table: {rt_name}")
    
    return tgw_id, route_tables

def attach_vpcs_to_tgw(tgw_id, route_tables, vpcs):
    """Attach VPCs to Transit Gateway with appropriate route table associations"""
    
    attachments = {}
    
    for vpc_name, vpc_config in vpcs.items():
        # Create attachment
        attach_response = ec2.create_transit_gateway_vpc_attachment(
            TransitGatewayId=tgw_id,
            VpcId=vpc_config['vpc_id'],
            SubnetIds=vpc_config['subnet_ids'],
            Options={'DnsSupport': 'enable'},
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-attachment',
                'Tags': [{'Key': 'Name', 'Value': f'{vpc_name}-TGW-Attachment'}]
            }]
        )
        
        attachment_id = attach_response['TransitGatewayVpcAttachment']['TransitGatewayAttachmentId']
        attachments[vpc_name] = attachment_id
        
        # Associate with appropriate route table
        rt_id = route_tables[vpc_config['environment']]
        ec2.associate_transit_gateway_route_table(
            TransitGatewayRouteTableId=rt_id,
            TransitGatewayAttachmentId=attachment_id
        )
        
        print(f"Attached {vpc_name} to Transit Gateway")
    
    return attachments

def configure_routing_policies(route_tables, attachments):
    """Configure routing policies for traffic segmentation"""
    
    # Production can access Shared Services but not Development
    ec2.create_transit_gateway_route(
        DestinationCidrBlock='10.2.0.0/16',  # Shared Services CIDR
        TransitGatewayRouteTableId=route_tables['Production'],
        TransitGatewayAttachmentId=attachments['SharedServices']
    )
    
    # Development can access Shared Services but not Production
    ec2.create_transit_gateway_route(
        DestinationCidrBlock='10.2.0.0/16',
        TransitGatewayRouteTableId=route_tables['Development'],
        TransitGatewayAttachmentId=attachments['SharedServices']
    )
    
    # Shared Services can access all
    for cidr, attachment in [('10.0.0.0/16', attachments['Production']),
                              ('10.1.0.0/16', attachments['Development'])]:
        ec2.create_transit_gateway_route(
            DestinationCidrBlock=cidr,
            TransitGatewayRouteTableId=route_tables['SharedServices'],
            TransitGatewayAttachmentId=attachment
        )
    
    print("Routing policies configured")

# Example usage
vpcs = {
    'Production': {
        'vpc_id': 'vpc-prod123',
        'subnet_ids': ['subnet-prod-1a', 'subnet-prod-1b', 'subnet-prod-1c'],
        'environment': 'Production'
    },
    'Development': {
        'vpc_id': 'vpc-dev456',
        'subnet_ids': ['subnet-dev-1a', 'subnet-dev-1b', 'subnet-dev-1c'],
        'environment': 'Development'
    },
    'SharedServices': {
        'vpc_id': 'vpc-shared789',
        'subnet_ids': ['subnet-shared-1a', 'subnet-shared-1b', 'subnet-shared-1c'],
        'environment': 'SharedServices'
    }
}

tgw_id, route_tables = create_hub_spoke_architecture()
attachments = attach_vpcs_to_tgw(tgw_id, route_tables, vpcs)
configure_routing_policies(route_tables, attachments)
```


### Hybrid Connectivity Patterns

Connecting AWS VPCs to on-premises networks requires careful planning for bandwidth, redundancy, and routing.

**Pattern 1: AWS Site-to-Site VPN**

**Characteristics:**

- Uses internet for connectivity
- IPsec encryption
- Up to 1.25 Gbps per tunnel
- Cost-effective for smaller workloads

**Implementation:**

```bash
# Create Customer Gateway (on-premises side)
CGW_ID=$(aws ec2 create-customer-gateway \
    --type ipsec.1 \
    --public-ip 203.0.113.1 \
    --bgp-asn 65000 \
    --tag-specifications 'ResourceType=customer-gateway,Tags=[{Key=Name,Value=OnPrem-CGW}]' \
    --query 'CustomerGateway.CustomerGatewayId' \
    --output text)

# Create Virtual Private Gateway
VGW_ID=$(aws ec2 create-vpn-gateway \
    --type ipsec.1 \
    --amazon-side-asn 64512 \
    --tag-specifications 'ResourceType=vpn-gateway,Tags=[{Key=Name,Value=Production-VGW}]' \
    --query 'VpnGateway.VpnGatewayId' \
    --output text)

# Attach VGW to VPC
aws ec2 attach-vpn-gateway \
    --vpc-id $VPC_ID \
    --vpn-gateway-id $VGW_ID

# Create VPN Connection
VPN_ID=$(aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --customer-gateway-id $CGW_ID \
    --vpn-gateway-id $VGW_ID \
    --options TunnelOptions='[{TunnelInsideCidr=169.254.10.0/30,PreSharedKey=MySecurePreSharedKey123},{TunnelInsideCidr=169.254.11.0/30,PreSharedKey=MySecurePreSharedKey456}]' \
    --tag-specifications 'ResourceType=vpn-connection,Tags=[{Key=Name,Value=Production-VPN}]' \
    --query 'VpnConnection.VpnConnectionId' \
    --output text)

# Enable route propagation
aws ec2 enable-vgw-route-propagation \
    --route-table-id $PRIVATE_RT \
    --gateway-id $VGW_ID
```

**Pattern 2: AWS Direct Connect**

**Characteristics:**

- Dedicated network connection
- 1 Gbps or 10 Gbps (dedicated) or 50 Mbps - 10 Gbps (hosted)
- Consistent network performance
- Lower data transfer costs
- Higher initial cost

**When to Use Direct Connect:**

- Large data transfers (>1 TB/month)
- Consistent low latency requirements
- Compliance requirements (no public internet)
- Mission-critical applications

**Direct Connect + VPN (Encrypted DX):**

For encryption over Direct Connect:

```bash
# Create Transit Virtual Interface on Direct Connect
# Then create VPN over the private VIF

# Create VPN connection over Direct Connect
VPN_DX_ID=$(aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --customer-gateway-id $CGW_ID \
    --transit-gateway-id $TGW_ID \
    --options '{"EnableAcceleration":false,"StaticRoutesOnly":false,"TunnelInsideIpVersion":"ipv4"}' \
    --tag-specifications 'ResourceType=vpn-connection,Tags=[{Key=Name,Value=DX-VPN}]' \
    --query 'VpnConnection.VpnConnectionId' \
    --output text)
```


### Advanced Security Patterns

**Pattern 1: Centralized Egress Control**

Route all internet-bound traffic through a security VPC for inspection:

```
Production VPC → Transit Gateway → Security VPC (Firewall) → Internet
Development VPC → Transit Gateway → Security VPC (Firewall) → Internet
```

**Implementation:**

```yaml
# Security VPC with inspection appliances
SecurityVPC:
  CIDR: 10.255.0.0/16
  Subnets:
    - Inspection-AZ1: 10.255.1.0/24
    - Inspection-AZ2: 10.255.2.0/24
  Appliances:
    - Palo Alto Networks VM-Series
    - Or AWS Network Firewall

# Transit Gateway routing
Production-RT:
  Routes:
    - 0.0.0.0/0 → Security VPC attachment

Security-VPC-RT:
  Routes:
    - 10.0.0.0/8 → VPC attachments (return traffic)
    - 0.0.0.0/0 → Internet Gateway (after inspection)
```

**Pattern 2: PrivateLink for Service Exposure**

Expose services privately without VPC peering:

```bash
# Create Network Load Balancer
NLB_ARN=$(aws elbv2 create-load-balancer \
    --name internal-service-nlb \
    --type network \
    --scheme internal \
    --subnets $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create VPC Endpoint Service
SERVICE_NAME=$(aws ec2 create-vpc-endpoint-service-configuration \
    --network-load-balancer-arns $NLB_ARN \
    --acceptance-required \
    --query 'ServiceConfiguration.ServiceName' \
    --output text)

# In consumer VPC, create interface endpoint
aws ec2 create-vpc-endpoint \
    --vpc-id $CONSUMER_VPC_ID \
    --service-name $SERVICE_NAME \
    --vpc-endpoint-type Interface \
    --subnet-ids $CONSUMER_SUBNET_1A $CONSUMER_SUBNET_1B \
    --security-group-ids $CONSUMER_SG
```


### Network Monitoring and Troubleshooting

**Comprehensive Monitoring Setup:**

```python
#!/usr/bin/env python3
# network_monitoring.py

import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')

def create_network_dashboard(vpc_id):
    """Create CloudWatch dashboard for network monitoring"""
    
    dashboard_body = {
        "widgets": [
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/NATGateway", "BytesInFromDestination", {"stat": "Sum"}],
                        [".", "BytesInFromSource", {"stat": "Sum"}],
                        [".", "BytesOutToDestination", {"stat": "Sum"}],
                        [".", "BytesOutToSource", {"stat": "Sum"}]
                    ],
                    "period": 300,
                    "stat": "Sum",
                    "region": "us-east-1",
                    "title": "NAT Gateway Traffic",
                    "yAxis": {"left": {"label": "Bytes"}}
                }
            },
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/VPN", "TunnelState", {"stat": "Maximum"}],
                        [".", "TunnelDataIn", {"stat": "Sum"}],
                        [".", "TunnelDataOut", {"stat": "Sum"}]
                    ],
                    "period": 60,
                    "stat": "Maximum",
                    "region": "us-east-1",
                    "title": "VPN Health and Traffic"
                }
            },
            {
                "type": "log",
                "properties": {
                    "query": "SOURCE '/aws/vpc/flowlogs'\n| fields @timestamp, srcAddr, dstAddr, action\n| filter action = 'REJECT'\n| stats count() by srcAddr\n| sort count desc\n| limit 10",
                    "region": "us-east-1",
                    "title": "Top Rejected Source IPs"
                }
            }
        ]
    }
    
    cloudwatch.put_dashboard(
        DashboardName=f'Network-Monitoring-{vpc_id}',
        DashboardBody=str(dashboard_body)
    )

def create_network_alarms(nat_gateway_id, vpn_connection_id):
    """Create CloudWatch alarms for network issues"""
    
    # NAT Gateway packet drop alarm
    cloudwatch.put_metric_alarm(
        AlarmName='NAT-Gateway-PacketDrop',
        ComparisonOperator='GreaterThanThreshold',
        EvaluationPeriods=2,
        MetricName='PacketsDropCount',
        Namespace='AWS/NATGateway',
        Period=300,
        Statistic='Sum',
        Threshold=100,
        ActionsEnabled=True,
        AlarmActions=['arn:aws:sns:us-east-1:123456789012:network-alerts'],
        Dimensions=[{'Name': 'NatGatewayId', 'Value': nat_gateway_id}]
    )
    
    # VPN tunnel down alarm
    cloudwatch.put_metric_alarm(
        AlarmName='VPN-Tunnel-Down',
        ComparisonOperator='LessThanThreshold',
        EvaluationPeriods=2,
        MetricName='TunnelState',
        Namespace='AWS/VPN',
        Period=60,
        Statistic='Maximum',
        Threshold=1,
        ActionsEnabled=True,
        AlarmActions=['arn:aws:sns:us-east-1:123456789012:critical-alerts'],
        Dimensions=[{'Name': 'VpnId', 'Value': vpn_connection_id}]
    )

def analyze_flow_logs():
    """Analyze VPC Flow Logs for security and performance insights"""
    
    logs = boto3.client('logs')
    
    query = """
    fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, protocol, bytes, action
    | filter action = "REJECT"
    | stats count(*) as rejectionCount, sum(bytes) as totalBytes by srcAddr, dstAddr, dstPort
    | sort rejectionCount desc
    | limit 20
    """
    
    response = logs.start_query(
        logGroupName='/aws/vpc/flowlogs/production',
        startTime=int((datetime.now() - timedelta(hours=1)).timestamp()),
        endTime=int(datetime.now().timestamp()),
        queryString=query
    )
    
    query_id = response['queryId']
    
    # Wait for query to complete
    import time
    while True:
        result = logs.get_query_results(queryId=query_id)
        if result['status'] == 'Complete':
            return result['results']
        time.sleep(1)
```


### Cost Optimization Strategies

**NAT Gateway Cost Reduction:**

```python
def calculate_nat_gateway_savings():
    """Calculate potential savings from NAT Gateway optimization"""
    
    # Scenario: 3 NAT Gateways processing 10 TB/month each
    nat_hourly_cost = 0.045  # per hour per NAT Gateway
    nat_data_cost = 0.045    # per GB processed
    
    # Current cost (3 NAT Gateways)
    hours_per_month = 730
    data_per_month_gb = 10 * 1024  # 10 TB
    
    current_cost = (3 * nat_hourly_cost * hours_per_month) + \
                   (data_per_month_gb * nat_data_cost * 3)
    
    # Optimized: 1 NAT Gateway + VPC Endpoints for AWS services
    vpc_endpoint_hourly = 0.01
    vpc_endpoint_data = 0.01
    
    # Assume 70% traffic goes to AWS services (S3, DynamoDB)
    aws_service_traffic = data_per_month_gb * 0.7
    internet_traffic = data_per_month_gb * 0.3
    
    optimized_cost = (nat_hourly_cost * hours_per_month) + \
                     (internet_traffic * nat_data_cost) + \
                     (vpc_endpoint_hourly * hours_per_month * 2) + \
                     (aws_service_traffic * vpc_endpoint_data)
    
    savings = current_cost - optimized_cost
    savings_percent = (savings / current_cost) * 100
    
    print(f"Current monthly cost: ${current_cost:,.2f}")
    print(f"Optimized monthly cost: ${optimized_cost:,.2f}")
    print(f"Monthly savings: ${savings:,.2f} ({savings_percent:.1f}%)")
    
    return savings

# Example output:
# Current monthly cost: $1,477.05
# Optimized monthly cost: $506.73
# Monthly savings: $970.32 (65.7%)
```

**Data Transfer Cost Optimization:**

```bash
# Use VPC Endpoints to avoid NAT Gateway charges for AWS services
aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C

# For services without Gateway Endpoints, use Interface Endpoints
for service in ec2 ec2messages ssm ssmmessages logs; do
    aws ec2 create-vpc-endpoint \
        --vpc-id $VPC_ID \
        --vpc-endpoint-type Interface \
        --service-name com.amazonaws.us-east-1.$service \
        --subnet-ids $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
        --security-group-ids $ENDPOINT_SG
done
```


## Tips \& Best Practices

### CIDR Planning Strategies

**Tip 1: Plan for Growth**

Always size your VPC larger than immediate needs:

```
Bad: /24 VPC (256 IPs) for "small" application
     - Runs out of IPs quickly
     - Difficult to expand

Good: /16 VPC (65,536 IPs)
      - Room for growth
      - Can create many subnets
      - Future-proof
```

**Tip 2: Use Non-Overlapping CIDR Blocks**

Maintain a CIDR allocation spreadsheet:

```
10.0.0.0/16   - Production VPC (us-east-1)
10.1.0.0/16   - Development VPC (us-east-1)
10.2.0.0/16   - Shared Services VPC (us-east-1)
10.10.0.0/16  - Production VPC (eu-west-1)
10.11.0.0/16  - Development VPC (eu-west-1)
172.16.0.0/12 - Reserved for on-premises
192.168.0.0/16 - Reserved for future use
```

**Tip 3: Consistent Subnet Numbering**

Use consistent patterns across VPCs:

```
x.x.1.0/24   - Public subnet AZ-A
x.x.2.0/24   - Public subnet AZ-B
x.x.3.0/24   - Public subnet AZ-C
x.x.11.0/24  - App subnet AZ-A
x.x.12.0/24  - App subnet AZ-B
x.x.13.0/24  - App subnet AZ-C
x.x.21.0/24  - DB subnet AZ-A
x.x.22.0/24  - DB subnet AZ-B
x.x.23.0/24  - DB subnet AZ-C
x.x.100.0/22 - Reserved for expansion
```


### Network Segmentation Best Practices

**Tip 4: Implement Defense in Depth**

Layer security controls:

```
1. Network ACLs (Subnet level, stateless)
2. Security Groups (Instance level, stateful)
3. Host-based firewall (OS level)
4. Application-level authorization
```

**Tip 5: Use Security Group Chaining**

Reference security groups instead of IP addresses:

```bash
# Web tier can only talk to app tier
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# App tier can only talk to database tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG
```

This automatically adapts as instances are added/removed.

**Tip 6: Minimize Public Subnets**

Only put resources that absolutely need public IPs in public subnets:

- Load balancers
- NAT Gateways
- Bastion hosts
- VPN endpoints

Everything else should be in private subnets.

### High Availability Tips

**Tip 7: Deploy NAT Gateways in Each AZ**

For true high availability:

```bash
# One NAT Gateway per AZ
NAT-GW-1A in Public-Subnet-1A → Routes for AZ-A private subnets
NAT-GW-1B in Public-Subnet-1B → Routes for AZ-B private subnets
NAT-GW-1C in Public-Subnet-1C → Routes for AZ-C private subnets
```

This prevents cross-AZ data transfer charges and eliminates single points of failure.

**Tip 8: Use Elastic IPs Strategically**

Allocate Elastic IPs for:

- NAT Gateways (required)
- Bastion hosts (consistent access)
- Resources that need IP whitelisting

Don't use EIPs for:

- Auto-scaled resources (use load balancers)
- Resources behind NAT
- Internal-only services

**Tip 9: Test Failover Scenarios**

Regularly test AZ and component failures:

```bash
# Simulate NAT Gateway failure
aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW_1A

# Verify traffic fails over to other AZs
# Recreate NAT Gateway
```


### Performance Optimization Tips

**Tip 10: Use Enhanced Networking**

Enable enhanced networking for better performance:

- ENA (Elastic Network Adapter) - up to 100 Gbps
- Requires supported instance types (C5, M5, R5, etc.)
- No additional cost

**Tip 11: Leverage Placement Groups**

For low-latency, high-throughput applications:

```bash
# Cluster placement group
aws ec2 create-placement-group \
    --group-name compute-cluster \
    --strategy cluster

# Launch instances in placement group
aws ec2 run-instances \
    --placement GroupName=compute-cluster \
    --instance-type c5n.18xlarge \
    --count 10
```

**Tip 12: Optimize MTU Settings**

Use jumbo frames (MTU 9001) within VPC:

```bash
# Check current MTU
ip link show eth0

# Set MTU to 9001 (within VPC)
sudo ip link set dev eth0 mtu 9001

# For internet traffic, use 1500
```


### Monitoring and Troubleshooting Tips

**Tip 13: Enable VPC Flow Logs from Day 1**

Don't wait for a security incident:

```bash
# Enable Flow Logs immediately after VPC creation
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type s3 \
    --log-destination arn:aws:s3:::vpc-flow-logs-bucket
```

**Tip 14: Use Reachability Analyzer**

Test connectivity before deploying:

```bash
# Test if EC2 can reach RDS
aws ec2 create-network-insights-path \
    --source $EC2_ENI \
    --destination $RDS_ENI \
    --protocol tcp \
    --destination-port 3306

aws ec2 start-network-insights-analysis \
    --network-insights-path-id $PATH_ID
```

**Tip 15: Monitor NAT Gateway Metrics**

Set up alarms for NAT Gateway issues:

```bash
# Alert on connection tracking errors
aws cloudwatch put-metric-alarm \
    --alarm-name NAT-Connection-Tracking-Errors \
    --metric-name ErrorPortAllocation \
    --namespace AWS/NATGateway \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold
```


### Security Tips

**Tip 16: Implement Least Privilege in Security Groups**

Don't use 0.0.0.0/0 unless absolutely necessary:

```bash
# Bad
--cidr 0.0.0.0/0

# Good - specific CIDR
--cidr 203.0.113.0/24

# Better - reference security group
--source-group $TRUSTED_SG
```

**Tip 17: Regular Security Group Audits**

Find and remove unused security groups:

```python
def audit_security_groups():
    ec2 = boto3.client('ec2')
    
    # Get all security groups
    sgs = ec2.describe_security_groups()['SecurityGroups']
    
    # Get all network interfaces
    enis = ec2.describe_network_interfaces()['NetworkInterfaces']
    
    # Find security groups in use
    used_sgs = set()
    for eni in enis:
        for sg in eni['Groups']:
            used_sgs.add(sg['GroupId'])
    
    # Find unused security groups
    unused_sgs = []
    for sg in sgs:
        if sg['GroupId'] not in used_sgs and sg['GroupName'] != 'default':
            unused_sgs.append({
                'GroupId': sg['GroupId'],
                'GroupName': sg['GroupName'],
                'VpcId': sg['VpcId']
            })
    
    print(f"Found {len(unused_sgs)} unused security groups")
    return unused_sgs
```

**Tip 18: Use AWS Network Firewall for Advanced Inspection**

For stateful packet inspection:

```bash
# Create Network Firewall
aws network-firewall create-firewall \
    --firewall-name production-firewall \
    --firewall-policy-arn $POLICY_ARN \
    --vpc-id $VPC_ID \
    --subnet-mappings SubnetId=$FIREWALL_SUBNET_1A SubnetId=$FIREWALL_SUBNET_1B
```


### Cost Optimization Tips

**Tip 19: Right-Size NAT Gateways**

Analyze traffic patterns:

```python
def analyze_nat_gateway_usage():
    cloudwatch = boto3.client('cloudwatch')
    
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/NATGateway',
        MetricName='BytesOutToDestination',
        Dimensions=[{'Name': 'NatGatewayId', 'Value': 'nat-xxxxx'}],
        StartTime=datetime.now() - timedelta(days=30),
        EndTime=datetime.now(),
        Period=86400,  # 1 day
        Statistics=['Sum']
    )
    
    # Analyze if NAT Gateway is underutilized
    # Consider consolidating multiple low-traffic NAT Gateways
```

**Tip 20: Use VPC Endpoints Aggressively**

Free up NAT Gateway capacity:

```bash
# Create endpoints for all supported services
SERVICES="s3 dynamodb ec2 ec2messages ssm ssmmessages logs sns sqs"

for service in $SERVICES; do
    aws ec2 create-vpc-endpoint \
        --vpc-id $VPC_ID \
        --service-name com.amazonaws.us-east-1.$service \
        --route-table-ids $PRIVATE_RTs \
        --security-group-ids $ENDPOINT_SG
done
```


## Pitfalls \& Remedies

### Pitfall 1: Inadequate CIDR Block Sizing

**Problem:** Choosing a CIDR block that's too small (e.g., /24 or /28), leading to IP address exhaustion as the application grows.

**Why It Happens:**

- Underestimating future growth
- Trying to "conserve" IP addresses
- Not understanding subnet math
- Copying examples without consideration

**Impact:**

- Cannot add more resources
- Forced to create new VPC and migrate
- Complex multi-VPC architecture
- Lost agility and increased costs

**Example:**

```
Initial: VPC with /24 (256 IPs, 251 usable)
Subnets:
- Public: 10.0.0.0/26 (64 IPs, 59 usable)
- Private: 10.0.0.64/26 (64 IPs, 59 usable)
- Database: 10.0.0.128/26 (64 IPs, 59 usable)

Problem: Only 59 usable IPs per subnet
- Auto Scaling can't add instances
- Can't deploy new services
- Out of IPs after modest growth
```

**Remedy:**

**Step 1: Audit Current IP Usage**

```bash
# Count running instances per subnet
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[SubnetId]' \
    --output text | sort | uniq -c

# Check available IPs per subnet
aws ec2 describe-subnets \
    --subnet-ids $SUBNET_ID \
    --query 'Subnets[*].[SubnetId,CidrBlock,AvailableIpAddressCount]' \
    --output table
```

**Step 2: Add Secondary CIDR Block**

If you have an existing VPC that's running out of IPs:

```bash
# Add secondary CIDR block
aws ec2 associate-vpc-cidr-block \
    --vpc-id $VPC_ID \
    --cidr-block 10.1.0.0/16

# Wait for association
aws ec2 wait vpc-available --vpc-ids $VPC_ID

# Create new subnets in secondary CIDR
aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.1.1.0/24 \
    --availability-zone us-east-1a
```

**Step 3: Design Properly Sized VPC**

For new VPCs, use proper sizing:

```bash
# Create VPC with /16 (65,536 IPs)
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --query 'Vpc.VpcId' \
    --output text)

# Create subnets with /20 or /24
# /20 = 4,096 IPs (4,091 usable) - Good for auto-scaling
# /24 = 256 IPs (251 usable) - Good for smaller subnets

# Public subnets (/24)
10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24

# Application subnets (/20)
10.0.16.0/20, 10.0.32.0/20, 10.0.48.0/20

# Database subnets (/24)
10.0.4.0/24, 10.0.5.0/24, 10.0.6.0/24

# Reserve for future
10.1.0.0/16, 10.2.0.0/16, etc.
```

**Step 4: CIDR Planning Tool**

```python
#!/usr/bin/env python3
import ipaddress

def plan_vpc_cidr(vpc_cidr, subnet_plans):
    """Plan VPC CIDR blocks and subnets"""
    
    vpc_network = ipaddress.IPv4Network(vpc_cidr)
    print(f"VPC: {vpc_cidr}")
    print(f"Total IPs: {vpc_network.num_addresses}")
    print(f"Usable IPs: {vpc_network.num_addresses - 5}")  # AWS reserves 5
    print("\nSubnets:")
    
    current_network = vpc_network.network_address
    
    for name, prefix_len, count in subnet_plans:
        for i in range(count):
            subnet = ipaddress.IPv4Network(f"{current_network}/{prefix_len}")
            usable = subnet.num_addresses - 5
            print(f"  {name}-{i+1}: {subnet} ({usable} usable IPs)")
            current_network = subnet.network_address + subnet.num_addresses
    
    # Show remaining space
    used_ips = int(current_network) - int(vpc_network.network_address)
    remaining = vpc_network.num_addresses - used_ips
    print(f"\nRemaining IPs: {remaining} ({remaining/vpc_network.num_addresses*100:.1f}%)")

# Example usage
plan_vpc_cidr('10.0.0.0/16', [
    ('Public', 24, 3),      # 3 public subnets of /24
    ('Application', 20, 3), # 3 app subnets of /20
    ('Database', 24, 3),    # 3 db subnets of /24
])
```

**Prevention:**

- Always use /16 for VPC CIDR unless you have specific constraints
- Plan for 3-5 years of growth
- Document CIDR allocation in central registry
- Use CIDR calculator before creating VPC
- Reserve space for future subnets

***

### Pitfall 2: Asymmetric Routing with Multiple NAT Gateways

**Problem:** Resources in one AZ using NAT Gateway in another AZ, causing cross-AZ data transfer charges and potential routing issues.

**Why It Happens:**

- Using single route table for all private subnets
- Not understanding route table association
- Cost optimization gone wrong (fewer NAT Gateways)
- Incomplete architecture documentation

**Impact:**

- Unexpected cross-AZ data transfer charges (\$0.01/GB each direction)
- Reduced availability if NAT Gateway AZ fails
- Performance degradation
- Unnecessary bandwidth consumption

**Example of Problem:**

```
Architecture:
- App-Subnet-1A uses Private-RT
- App-Subnet-1B uses Private-RT
- App-Subnet-1C uses Private-RT

Private-RT routes:
- 0.0.0.0/0 → NAT-GW-1A (only in AZ-A)

Result:
- Instances in 1B cross AZ boundary to reach NAT-GW-1A
- Instances in 1C cross AZ boundary to reach NAT-GW-1A
- Unnecessary cross-AZ charges
```

**Remedy:**

**Step 1: Identify Asymmetric Routing**

```
# List route tables and their associations
aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[*].[RouteTableId,Associations[*].SubnetId,Routes[?DestinationCidrBlock==`0.0.0.0/0`].NatGatewayId]' \
    --output table

# Check NAT Gateway locations
aws ec2 describe-nat-gateways \
    --filter "Name=vpc-id,Values=$VPC_ID" \
    --query 'NatGateways[*].[NatGatewayId,SubnetId,State]' \
    --output table
```

**Step 2: Implement AZ-Specific Route Tables**

```
# Create separate route table for each AZ
PRIVATE_RT_1A=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1A}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

PRIVATE_RT_1B=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1B}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

PRIVATE_RT_1C=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1C}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add NAT Gateway routes (one per AZ)
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1A

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1B \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1B

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1C \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1C

# Associate subnets with AZ-specific route tables
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $APP_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $APP_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $APP_SUBNET_1C
```

**Step 3: Verify Routing Configuration**

```
#!/usr/bin/env python3
# verify_routing.py

import boto3

def verify_nat_gateway_routing(vpc_id):
    """Verify NAT Gateway routing is AZ-aligned"""
    
    ec2 = boto3.client('ec2')
    
    # Get subnets
    subnets = ec2.describe_subnets(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )['Subnets']
    
    # Get NAT Gateways
    nat_gateways = ec2.describe_nat_gateways(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )['NatGateways']
    
    # Build NAT Gateway to AZ mapping
    nat_to_az = {}
    for nat in nat_gateways:
        subnet_id = nat['SubnetId']
        subnet = next(s for s in subnets if s['SubnetId'] == subnet_id)
        nat_to_az[nat['NatGatewayId']] = subnet['AvailabilityZone']
    
    # Check each private subnet
    issues = []
    
    for subnet in subnets:
        if subnet['MapPublicIpOnLaunch']:
            continue  # Skip public subnets
        
        subnet_id = subnet['SubnetId']
        subnet_az = subnet['AvailabilityZone']
        
        # Get route table
        route_tables = ec2.describe_route_tables(
            Filters=[
                {'Name': 'association.subnet-id', 'Values': [subnet_id]}
            ]
        )['RouteTables']
        
        if not route_tables:
            continue
        
        rt = route_tables
        
        # Find NAT Gateway route
        for route in rt['Routes']:
            if route.get('DestinationCidrBlock') == '0.0.0.0/0' and 'NatGatewayId' in route:
                nat_id = route['NatGatewayId']
                nat_az = nat_to_az.get(nat_id)
                
                if nat_az != subnet_az:
                    issues.append({
                        'subnet': subnet_id,
                        'subnet_az': subnet_az,
                        'nat_gateway': nat_id,
                        'nat_az': nat_az,
                        'route_table': rt['RouteTableId']
                    })
    
    if issues:
        print("⚠️  Asymmetric routing detected:")
        for issue in issues:
            print(f"  Subnet {issue['subnet']} (AZ: {issue['subnet_az']}) → "
                  f"NAT Gateway {issue['nat_gateway']} (AZ: {issue['nat_az']})")
    else:
        print("✓ All subnets have AZ-aligned NAT Gateway routing")
    
    return issues

# Usage
verify_nat_gateway_routing('vpc-12345678')
```

**Step 4: Calculate Cost Impact**

```
def calculate_cross_az_cost():
    """Calculate cost impact of cross-AZ NAT Gateway traffic"""
    
    # Assumptions
    instances_per_az = 50
    avg_traffic_per_instance_gb = 100  # per month
    cross_az_cost = 0.01  # per GB each direction
    
    # Scenario 1: Asymmetric routing (all use NAT in AZ-A)
    # AZ-B and AZ-C instances cross AZ boundary
    cross_az_instances = instances_per_az * 2  # AZ-B and AZ-C
    cross_az_traffic = cross_az_instances * avg_traffic_per_instance_gb
    asymmetric_cost = cross_az_traffic * cross_az_cost * 2  # in and out
    
    # Scenario 2: Proper routing (each AZ uses its own NAT)
    proper_cost = 0  # No cross-AZ traffic for NAT Gateway routing
    
    monthly_savings = asymmetric_cost - proper_cost
    annual_savings = monthly_savings * 12
    
    print(f"Asymmetric routing cost: ${asymmetric_cost:,.2f}/month")
    print(f"Proper routing cost: ${proper_cost:,.2f}/month")
    print(f"Monthly savings: ${monthly_savings:,.2f}")
    print(f"Annual savings: ${annual_savings:,.2f}")
    
    return monthly_savings

# Example output:
# Asymmetric routing cost: $200.00/month
# Proper routing cost: $0.00/month
# Monthly savings: $200.00
# Annual savings: $2,400.00
```

**Prevention:**

- Create one NAT Gateway per AZ from the start
- Use separate route tables per AZ
- Document routing architecture
- Implement automated verification scripts
- Monitor cross-AZ data transfer metrics

---

### Pitfall 3: Security Group Misconfigurations

**Problem:** Overly permissive security group rules (0.0.0.0/0 on sensitive ports), missing egress restrictions, or circular dependencies.

**Why It Happens:**

- Quick testing shortcuts that become permanent
- Insufficient understanding of security group behavior
- "Just make it work" mentality
- Copy-pasting examples without review

**Impact:**

- Unauthorized access to resources
- Security breaches and data exfiltration
- Compliance violations
- Failed security audits

**Common Mistakes:**

```
# Mistake 1: SSH open to the world
--protocol tcp --port 22 --cidr 0.0.0.0/0

# Mistake 2: Database accessible from anywhere
--protocol tcp --port 3306 --cidr 0.0.0.0/0

# Mistake 3: Allowing all traffic
--protocol -1 --cidr 0.0.0.0/0

# Mistake 4: Ephemeral ports too broad
--protocol tcp --port-range 0-65535 --cidr 0.0.0.0/0
```

**Remedy:**

**Step 1: Audit Existing Security Groups**

```
# Find security groups with 0.0.0.0/0 rules
aws ec2 describe-security-groups \
    --filters "Name=ip-permission.cidr,Values=0.0.0.0/0" \
    --query 'SecurityGroups[*].[GroupId,GroupName,IpPermissions[?contains(IpRanges[].CidrIp, `0.0.0.0/0`)]]' \
    --output json > overly-permissive-sgs.json

# Find security groups with sensitive ports open
aws ec2 describe-security-groups \
    --query 'SecurityGroups[?IpPermissions[?FromPort<=`22` && ToPort>=`22` && IpRanges[?CidrIp==`0.0.0.0/0`]]].[GroupId,GroupName]' \
    --output table
```

**Step 2: Security Group Audit Script**

```
#!/usr/bin/env python3
# audit_security_groups.py

import boto3
import json

def audit_security_groups():
    """Comprehensive security group audit"""
    
    ec2 = boto3.client('ec2')
    
    sgs = ec2.describe_security_groups()['SecurityGroups']
    
    findings = {
        'critical': [],
        'high': [],
        'medium': []
    }
    
    dangerous_ports = {
        22: 'SSH',
        3389: 'RDP',
        3306: 'MySQL',
        5432: 'PostgreSQL',
        27017: 'MongoDB',
        6379: 'Redis',
        9200: 'Elasticsearch'
    }
    
    for sg in sgs:
        sg_id = sg['GroupId']
        sg_name = sg['GroupName']
        
        # Skip default security group
        if sg_name == 'default':
            continue
        
        # Check inbound rules
        for permission in sg.get('IpPermissions', []):
            from_port = permission.get('FromPort', 0)
            to_port = permission.get('ToPort', 65535)
            
            # Check for 0.0.0.0/0
            for ip_range in permission.get('IpRanges', []):
                if ip_range.get('CidrIp') == '0.0.0.0/0':
                    
                    # Critical: Dangerous ports open to world
                    for port, service in dangerous_ports.items():
                        if from_port <= port <= to_port:
                            findings['critical'].append({
                                'sg_id': sg_id,
                                'sg_name': sg_name,
                                'issue': f'{service} (port {port}) open to 0.0.0.0/0',
                                'rule': permission
                            })
                    
                    # High: Non-standard ports open to world
                    if not (from_port == 80 or from_port == 443):
                        findings['high'].append({
                            'sg_id': sg_id,
                            'sg_name': sg_name,
                            'issue': f'Ports {from_port}-{to_port} open to 0.0.0.0/0',
                            'rule': permission
                        })
            
            # Check for overly broad CIDR blocks
            for ip_range in permission.get('IpRanges', []):
                cidr = ip_range.get('CidrIp', '')
                if cidr.endswith('/8') or cidr.endswith('/16'):
                    findings['medium'].append({
                        'sg_id': sg_id,
                        'sg_name': sg_name,
                        'issue': f'Overly broad CIDR: {cidr}',
                        'rule': permission
                    })
        
        # Check for security groups with no restrictions
        if not sg.get('IpPermissions'):
            # This is actually good - no inbound rules
            pass
    
    # Report findings
    print("=" * 60)
    print("SECURITY GROUP AUDIT REPORT")
    print("=" * 60)
    
    if findings['critical']:
        print(f"\n🚨 CRITICAL ({len(findings['critical'])} findings):")
        for f in findings['critical']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if findings['high']:
        print(f"\n⚠️  HIGH ({len(findings['high'])} findings):")
        for f in findings['high']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if findings['medium']:
        print(f"\n⚡ MEDIUM ({len(findings['medium'])} findings):")
        for f in findings['medium']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if not any(findings.values()):
        print("\n✓ No security issues found")
    
    return findings

# Run audit
findings = audit_security_groups()
```

**Step 3: Fix Overly Permissive Rules**

```
# Remove dangerous rule
aws ec2 revoke-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# Replace with specific CIDR
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24  # Your office network

# Or reference another security group
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG
```

**Step 4: Implement Security Group Best Practices**

```
# Bastion Host Security Group
BASTION_SG=$(aws ec2 create-security-group \
    --group-name bastion-sg \
    --description "Bastion host - SSH from office only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# SSH only from office
aws ec2 authorize-security-group-ingress \
    --group-id $BASTION_SG \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24

# Web Server Security Group
WEB_SG=$(aws ec2 create-security-group \
    --group-name web-tier-sg \
    --description "Web servers - HTTP/HTTPS only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# HTTP and HTTPS from anywhere (legitimate use case)
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# SSH only from bastion
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

# Application Server Security Group
APP_SG=$(aws ec2 create-security-group \
    --group-name app-tier-sg \
    --description "Application servers - internal only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Application port only from web tier
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# SSH only from bastion
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

# Database Security Group
DB_SG=$(aws ec2 create-security-group \
    --group-name db-tier-sg \
    --description "Database - application tier only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Database port only from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG

# No SSH access needed (managed service)
```

**Step 5: Implement Automated Monitoring**

```
#!/usr/bin/env python3
# monitor_security_groups.py

import boto3
from datetime import datetime

def lambda_handler(event, context):
    """Lambda function to monitor security group changes"""
    
    # This is triggered by CloudTrail via EventBridge
    # Event types: AuthorizeSecurityGroupIngress, RevokeSecurityGroupIngress
    
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')
    
    # Extract event details
    event_name = event['detail']['eventName']
    request_params = event['detail']['requestParameters']
    
    # Check if rule added 0.0.0.0/0
    if event_name == 'AuthorizeSecurityGroupIngress':
        group_id = request_params.get('groupId')
        ip_permissions = request_params.get('ipPermissions', {})
        
        for permission in ip_permissions.get('items', []):
            for ip_range in permission.get('ipRanges', {}).get('items', []):
                if ip_range.get('cidrIp') == '0.0.0.0/0':
                    # Alert on suspicious rule
                    message = f"""
                    ⚠️ Security Group Alert
                    
                    A potentially dangerous rule was added:
                    
                    Security Group: {group_id}
                    Event: {event_name}
                    CIDR: 0.0.0.0/0
                    Port: {permission.get('fromPort')} - {permission.get('toPort')}
                    Protocol: {permission.get('ipProtocol')}
                    
                    User: {event['detail']['userIdentity']['arn']}
                    Time: {event['detail']['eventTime']}
                    
                    Please review and remediate if necessary.
                    """
                    
                    sns.publish(
                        TopicArn='arn:aws:sns:us-east-1:123456789012:security-alerts',
                        Subject='Security Group Rule Added - Review Required',
                        Message=message
                    )
    
    return {'statusCode': 200}
```

**Step 6: Set Up EventBridge Rule**

```
# Create EventBridge rule for security group changes
aws events put-rule \
    --name security-group-changes \
    --event-pattern '{
      "source": ["aws.ec2"],
      "detail-type": ["AWS API Call via CloudTrail"],
      "detail": {
        "eventName": [
          "AuthorizeSecurityGroupIngress",
          "AuthorizeSecurityGroupEgress",
          "RevokeSecurityGroupIngress",
          "RevokeSecurityGroupEgress"
        ]
      }
    }'

# Add Lambda as target
aws events put-targets \
    --rule security-group-changes \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:monitor-security-groups"
```

**Prevention:**

- Implement security group templates
- Use Infrastructure as Code with peer review
- Enable automated scanning for dangerous rules
- Regular security group audits (weekly/monthly)
- Use AWS Config rules for compliance
- Train team on security group best practices
- Document approved security group patterns

---

### Pitfall 4: Forgotten or Stale Routes

**Problem:** Route table entries pointing to deleted resources (NAT Gateways, VPN connections, peering connections), causing traffic blackholing.

**Why It Happens:**

- Deleting resources without updating route tables
- Manual changes without documentation
- Lack of testing after infrastructure changes
- No route table validation process

**Impact:**

- Traffic silently dropped (blackholed)
- Connectivity failures
- Difficult troubleshooting (no obvious errors)
- Application downtime

**Example:**

```
# Route table still points to deleted NAT Gateway
Destination: 0.0.0.0/0
Target: nat-xxxxx (state: deleted)
Status: blackhole

# Result: All outbound traffic from subnet is dropped
```

**Remedy:**

**Step 1: Identify Blackhole Routes**

```
# Find routes in blackhole state
aws ec2 describe-route-tables \
    --query 'RouteTables[*].Routes[?State==`blackhole`].[RouteTableId,DestinationCidrBlock,GatewayId,NatGatewayId,State]' \
    --output table

# More comprehensive check
aws ec2 describe-route-tables \
    --query 'RouteTables[*].[RouteTableId,Routes[?State==`blackhole`]]' \
    --output json | jq '.[] | select(. | length > 0)'
```

**Step 2: Automated Route Validation Script**

```
#!/usr/bin/env python3
# validate_routes.py

import boto3

def validate_route_tables():
    """Validate all route tables and identify issues"""
    
    ec2 = boto3.client('ec2')
    
    route_tables = ec2.describe_route_tables()['RouteTables']
    
    issues = []
    
    for rt in route_tables:
        rt_id = rt['RouteTableId']
        vpc_id = rt['VpcId']
        
        # Get associated subnets
        associations = rt.get('Associations', [])
        subnet_count = len([a for a in associations if 'SubnetId' in a])
        
        for route in rt['Routes']:
            destination = route.get('DestinationCidrBlock', route.get('DestinationPrefixListId', 'Unknown'))
            state = route.get('State', 'active')
            
            # Check for blackhole routes
            if state == 'blackhole':
                issues.append({
                    'severity': 'critical',
                    'route_table': rt_id,
                    'vpc': vpc_id,
                    'destination': destination,
                    'issue': 'Blackhole route - traffic will be dropped',
                    'target': route.get('GatewayId') or route.get('NatGatewayId') or route.get('TransitGatewayId'),
                    'affected_subnets': subnet_count
                })
            
            # Check for specific target types
            if 'NatGatewayId' in route:
                nat_id = route['NatGatewayId']
                try:
                    nat = ec2.describe_nat_gateways(NatGatewayIds=[nat_id])['NatGateways']
                    if nat['State'] not in ['available', 'pending']:
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"NAT Gateway in state: {nat['State']}",
                            'target': nat_id,
                            'affected_subnets': subnet_count
                        })
                except:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': 'NAT Gateway not found (deleted)',
                        'target': nat_id,
                        'affected_subnets': subnet_count
                    })
            
            # Check VPC peering connections
            if 'VpcPeeringConnectionId' in route:
                peer_id = route['VpcPeeringConnectionId']
                try:
                    peer = ec2.describe_vpc_peering_connections(
                        VpcPeeringConnectionIds=[peer_id]
                    )['VpcPeeringConnections']
                    
                    if peer['Status']['Code'] != 'active':
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"VPC Peering in state: {peer['Status']['Code']}",
                            'target': peer_id,
                            'affected_subnets': subnet_count
                        })
                except:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': 'VPC Peering Connection not found (deleted)',
                        'target': peer_id,
                        'affected_subnets': subnet_count
                    })
            
            # Check Transit Gateway attachments
            if 'TransitGatewayId' in route:
                tgw_id = route['TransitGatewayId']
                try:
                    attachments = ec2.describe_transit_gateway_vpc_attachments(
                        Filters=[
                            {'Name': 'transit-gateway-id', 'Values': [tgw_id]},
                            {'Name': 'vpc-id', 'Values': [vpc_id]}
                        ]
                    )['TransitGatewayVpcAttachments']
                    
                    if not attachments or attachments['State'] != 'available':
                        state = attachments['State'] if attachments else 'not found'
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"Transit Gateway attachment state: {state}",
                            'target': tgw_id,
                            'affected_subnets': subnet_count
                        })
                except Exception as e:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': f'Transit Gateway issue: {str(e)}',
                        'target': tgw_id,
                        'affected_subnets': subnet_count
                    })
    
    # Report findings
    print("=" * 80)
    print("ROUTE TABLE VALIDATION REPORT")
    print("=" * 80)
    
    if not issues:
        print("\n✓ All route tables are healthy")
    else:
        critical = [i for i in issues if i['severity'] == 'critical']
        high = [i for i in issues if i['severity'] == 'high']
        
        if critical:
            print(f"\n🚨 CRITICAL ISSUES ({len(critical)}):")
            for issue in critical:
                print(f"\n  Route Table: {issue['route_table']}")
                print(f"  VPC: {issue['vpc']}")
                print(f"  Destination: {issue['destination']}")
                print(f"  Issue: {issue['issue']}")
                print(f"  Target: {issue['target']}")
                print(f"  Affected Subnets: {issue['affected_subnets']}")
        
        if high:
            print(f"\n⚠️  HIGH PRIORITY ISSUES ({len(high)}):")
            for issue in high:
                print(f"\n  Route Table: {issue['route_table']}")
                print(f"  Destination: {issue['destination']}")
                print(f"  Issue: {issue['issue']}")
    
    return issues

# Run validation
issues = validate_route_tables()
```

**Step 3: Clean Up Blackhole Routes**

```
# Delete blackhole route
aws ec2 delete-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0

# Add new route with valid target
aws ec2 create-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NEW_NAT_GW_ID
```

**Step 4: Implement Route Change Notifications**

```
#!/usr/bin/env python3
# route_change_monitor.py

import boto3
import json

def lambda_handler(event, context):
    """Monitor route table changes and send notifications"""
    
    sns = boto3.client('sns')
    
    # CloudTrail event for route changes
    detail = event['detail']
    event_name = detail['eventName']
    
    if event_name in ['CreateRoute', 'ReplaceRoute', 'DeleteRoute']:
        request_params = detail['requestParameters']
        
        message = f"""
        Route Table Change Detected
        
        Event: {event_name}
        Route Table: {request_params.get('routeTableId')}
        Destination: {request_params.get('destinationCidrBlock')}
        Target: {request_params.get('gatewayId') or request_params.get('natGatewayId') or request_params.get('transitGatewayId')}
        
        User: {detail['userIdentity']['arn']}
        Time: {detail['eventTime']}
        Region: {detail['awsRegion']}
        
        Please verify this change is intentional and test connectivity.
        """
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:network-changes',
            Subject=f'Route Table Change: {event_name}',
            Message=message
        )
    
    return {'statusCode': 200}
```

**Step 5: Implement Automated Route Validation**

```
# Create EventBridge scheduled rule to run validation daily
aws events put-rule \
    --name daily-route-validation \
    --schedule-expression "cron(0 9 * * ? *)" \
    --state ENABLED

aws events put-targets \
    --rule daily-route-validation \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:validate-routes"
```

**Prevention:**

- Implement Infrastructure as Code (routes defined in CloudFormation/Terraform)
- Run route validation before deleting network resources
- Set up automated daily route table health checks
- Monitor CloudTrail for route table changes
- Document all manual route changes
- Use change management process for network modifications

---

### Pitfall 5: VPC Peering Complexity at Scale

**Problem:** Managing full-mesh VPC peering becomes unmanageable as the number of VPCs grows, leading to operational complexity and routing errors.

**Why It Happens:**

- Starting with VPC peering without planning for scale
- Not understanding Transit Gateway benefits
- Legacy architectures that grew organically
- Attempting to peer too many VPCs

**Impact:**

- Exponential growth in peering connections (n(n-1)/2)
- Complex route table management
- Difficult troubleshooting
- Route table entry limits reached
- Operational overhead

**Example:**

```
5 VPCs require: 5(4)/2 = 10 peering connections
10 VPCs require: 10(9)/2 = 45 peering connections
20 VPCs require: 20(19)/2 = 190 peering connections

Each VPC needs routes to all others in all route tables
Becomes unmanageable quickly
```

**Remedy:**

**Step 1: Assess Current Peering Complexity**

```
#!/usr/bin/env python3
# assess_vpc_peering.py

import boto3

def assess_peering_complexity():
    """Assess VPC peering complexity and recommend solutions"""
    
    ec2 = boto3.client('ec2')
    
    # Get all VPCs
    vpcs = ec2.describe_vpcs()['Vpcs']
    vpc_count = len(vpcs)
    
    # Get all peering connections
    peering_connections = ec2.describe_vpc_peering_connections()['VpcPeeringConnections']
    
    active_peerings = [p for p in peering_connections if p['Status']['Code'] == 'active']
    
    # Calculate complexity
    max_possible_peerings = vpc_count * (vpc_count - 1) / 2
    current_peerings = len(active_peerings)
    
    # Get route table counts
    route_tables = ec2.describe_route_tables()['RouteTables']
    total_routes = sum(len(rt['Routes']) for rt in route_tables)
    
    print("=" * 60)
    print("VPC PEERING COMPLEXITY ASSESSMENT")
    print("=" * 60)
    
    print(f"\nVPCs: {vpc_count}")
    print(f"Active Peering Connections: {current_peerings}")
    print(f"Maximum Possible Peerings: {int(max_possible_peerings)}")
    print(f"Total Route Tables: {len(route_tables)}")
    print(f"Total Routes: {total_routes}")
    
    # Recommendations
    print("\nRECOMMENDATIONS:")
    
    if vpc_count <= 5 and current_peerings <= 10:
        print("✓ VPC Peering is manageable at current scale")
    elif vpc_count <= 10 and current_peerings <= 30:
        print("⚠️  VPC Peering is becoming complex")
        print("   Consider Transit Gateway for future growth")
    else:
        print("🚨 VPC Peering is too complex")
        print("   STRONGLY RECOMMEND migrating to Transit Gateway")
        
        # Calculate Transit Gateway savings
        tgw_attachments = vpc_count
        tgw_routes_per_rt = vpc_count  # One route to TGW covers all VPCs
        
        print(f"\n   Transit Gateway Benefits:")
        print(f"   - Connections: {tgw_attachments} (vs {current_peerings} peerings)")
        print(f"   - Routes per table: ~{tgw_routes_per_rt} (vs {current_peerings})")
        print(f"   - Simplified management and troubleshooting")
        print(f"   - Support for transitive routing")
    
    # Find VPCs with most peering connections
    vpc_peering_count = {}
    for peering in active_peerings:
        accepter = peering['AccepterVpcInfo']['VpcId']
        requester = peering['RequesterVpcInfo']['VpcId']
        
        vpc_peering_count[accepter] = vpc_peering_count.get(accepter, 0) + 1
        vpc_peering_count[requester] = vpc_peering_count.get(requester, 0) + 1
    
    if vpc_peering_count:
        print("\nVPCs with Most Peering Connections:")
        sorted_vpcs = sorted(vpc_peering_count.items(), key=lambda x: x, reverse=True)[:5]
        for vpc_id, count in sorted_vpcs:
            print(f"  {vpc_id}: {count} peerings")
    
    return {
        'vpc_count': vpc_count,
        'peering_count': current_peerings,
        'complexity_score': current_peerings / max_possible_peerings if max_possible_peerings > 0 else 0
    }

# Run assessment
result = assess_peering_complexity()
```

**Step 2: Migration Plan to Transit Gateway**

```
#!/usr/bin/env python3
# migrate_to_transit_gateway.py

import boto3
import time

def migrate_peering_to_tgw(vpc_ids, tgw_id=None):
    """Migrate from VPC peering to Transit Gateway"""
    
    ec2 = boto3.client('ec2')
    
    # Step 1: Create Transit Gateway if not provided
    if not tgw_id:
        print("Creating Transit Gateway...")
        tgw_response = ec2.create_transit_gateway(
            Description='Migration from VPC Peering',
            Options={
                'AmazonSideAsn': 64512,
                'AutoAcceptSharedAttachments': 'enable',
                'DefaultRouteTableAssociation': 'enable',
                'DefaultRouteTablePropagation': 'enable',
                'VpnEcmpSupport': 'enable',
                'DnsSupport': 'enable'
            },
            TagSpecifications=[{
                'ResourceType': 'transit-gateway',
                'Tags': [{'Key': 'Name', 'Value': 'Peering-Migration-TGW'}]
            }]
        )
        
        tgw_id = tgw_response['TransitGateway']['TransitGatewayId']
        print(f"Created Transit Gateway: {tgw_id}")
        
        # Wait for availability
        print("Waiting for Transit Gateway to become available...")
        waiter = ec2.get_waiter('transit_gateway_available')
        waiter.wait(TransitGatewayIds=[tgw_id])
        print("Transit Gateway is available")
    
    # Step 2: Attach all VPCs to Transit Gateway
    attachments = {}
    
    for vpc_id in vpc_ids:
        print(f"\nAttaching VPC: {vpc_id}")
        
        # Get subnets (use one per AZ)
        subnets = ec2.describe_subnets(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )['Subnets']
        
        # Select one subnet per AZ
        az_subnets = {}
        for subnet in subnets:
            az = subnet['AvailabilityZone']
            if az not in az_subnets:
                az_subnets[az] = subnet['SubnetId']
        
        subnet_ids = list(az_subnets.values())[:3]  # Max 3 AZs
        
        # Create attachment
        attach_response = ec2.create_transit_gateway_vpc_attachment(
            TransitGatewayId=tgw_id,
            VpcId=vpc_id,
            SubnetIds=subnet_ids,
            Options={'DnsSupport': 'enable'},
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-attachment',
                'Tags': [{'Key': 'Name', 'Value': f'{vpc_id}-TGW-Attachment'}]
            }]
        )
        
        attachment_id = attach_response['TransitGatewayVpcAttachment']['TransitGatewayAttachmentId']
        attachments[vpc_id] = attachment_id
        print(f"Created attachment: {attachment_id}")
    
    # Wait for attachments to become available
    print("\nWaiting for attachments to become available...")
    time.sleep(60)  # Attachments typically take 1-2 minutes
    
    # Step 3: Update route tables
    print("\nUpdating route tables...")
    
    for vpc_id in vpc_ids:
        # Get all route tables for VPC
        route_tables = ec2.describe_route_tables(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )['RouteTables']
        
        for rt in route_tables:
            rt_id = rt['RouteTableId']
            
            # Add routes to Transit Gateway for other VPCs
            for other_vpc_id in vpc_ids:
                if other_vpc_id != vpc_id:
                    # Get CIDR of other VPC
                    other_vpc = ec2.describe_vpcs(VpcIds=[other_vpc_id])['Vpcs']
                    other_cidr = other_vpc['CidrBlock']
                    
                    try:
                        ec2.create_route(
                            RouteTableId=rt_id,
                            DestinationCidrBlock=other_cidr,
                            TransitGatewayId=tgw_id
                        )
                        print(f"  Added route in {rt_id}: {other_cidr} → TGW")
                    except Exception as e:
                        if 'RouteAlreadyExists' not in str(e):
                            print(f"  Error adding route: {e}")
    
    print("\n✓ Migration complete!")
    print(f"\nNext steps:")
    print(f"1. Test connectivity between VPCs via Transit Gateway")
    print(f"2. Verify all applications are working")
    print(f"3. Remove VPC peering connections")
    print(f"4. Clean up old routes pointing to peering connections")
    
    return tgw_id, attachments

# Example usage
# vpc_ids = ['vpc-11111', 'vpc-22222', 'vpc-33333', 'vpc-44444']
# tgw_id, attachments = migrate_peering_to_tgw(vpc_ids)
```

**Step 3: Clean Up Old Peering Connections**

```
# After verifying Transit Gateway connectivity works

# List all peering connections
aws ec2 describe-vpc-peering-connections \
    --query 'VpcPeeringConnections[*].[VpcPeeringConnectionId,Status.Code]' \
    --output table

# Delete peering connection
aws ec2 delete-vpc-peering-connection \
    --vpc-peering-connection-id pcx-12345678

# Remove routes pointing to old peering connections
aws ec2 delete-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 10.1.0.0/16
```

**Prevention:**

- Plan for Transit Gateway from the start if you expect >5 VPCs
- Use Transit Gateway for any multi-VPC architecture
- Document network topology clearly
- Implement network automation
- Regular architecture reviews

---

### Pitfall 6: Not Planning for IPv4 Exhaustion

**Problem:** Running out of RFC 1918 private IP space when you have many VPCs or need to connect to on-premises networks with overlapping CIDRs.

**Why It Happens:**

- Using common CIDR blocks (10.0.0.0/16, 172.31.0.0/16)
- Not coordinating with on-premises network teams
- No central CIDR allocation strategy
- Duplicate CIDR blocks across VPCs

**Impact:**

- Cannot peer VPCs with overlapping CIDRs
- Cannot connect to on-premises network
- Complex NAT and routing workarounds
- Forced VPC migrations

**Remedy:**

**Step 1: Create CIDR Allocation Registry**

```
# cidr-allocation-registry.yaml
cidr_allocations:
  on_premises:
    - 10.0.0.0/8     # Corporate network
    - 172.16.0.0/12  # Reserved for on-prem expansion
  
  aws_regions:
    us_east_1:
      production:
        - 10.100.0.0/16  # Production VPC 1
        - 10.101.0.0/16  # Production VPC 2
      development:
        - 10.110.0.0/16  # Dev VPC
      shared_services:
        - 10.120.0.0/16  # Shared services
    
    eu_west_1:
      production:
        - 10.200.0.0/16  # Production VPC
      development:
        - 10.210.0.0/16  # Dev VPC
    
    ap_southeast_1:
      production:
        - 10.300.0.0/16  # Production VPC
  
  reserved_for_future:
    - 192.168.0.0/16   # Reserved
    - 10.150.0.0/16    # Reserved for us-east-1 expansion
    - 10.250.0.0/16    # Reserved for eu-west-1 expansion
```

**Step 2: Implement CIDR Allocation Tool**

```
#!/usr/bin/env python3
# cidr_allocator.py

import ipaddress
import yaml

class CIDRAllocator:
    def __init__(self, registry_file='cidr-allocation-registry.yaml'):
        with open(registry_file, 'r') as f:
            self.registry = yaml.safe_load(f)
        
        self.allocated = self._load_allocated_cidrs()
    
    def _load_allocated_cidrs(self):
        """Load all allocated CIDR blocks"""
        allocated = []
        
        # On-premises
        for cidr in self.registry['cidr_allocations'].get('on_premises', []):
            allocated.append(ipaddress.IPv4Network(cidr))
        
        # AWS regions
        for region, vpcs in self.registry['cidr_allocations'].get('aws_regions', {}).items():
            for env, cidrs in vpcs.items():
                for cidr in cidrs:
                    allocated.append(ipaddress.IPv4Network(cidr))
        
        return allocated
    
    def check_overlap(self, proposed_cidr):
        """Check if proposed CIDR overlaps with existing allocations"""
        proposed = ipaddress.IPv4Network(proposed_cidr)
        
        overlaps = []
        for existing in self.allocated:
            if proposed.overlaps(existing):
                overlaps.append(str(existing))
        
        return overlaps
    
    def suggest_cidr(self, region, prefix_length=16):
        """Suggest available CIDR block for region"""
        
        # Regional starting points
        region_bases = {
            'us-east-1': '10.100.0.0/12',    # 10.100.0.0 - 10.111.255.255
            'us-west-2': '10.112.0.0/12',    # 10.112.0.0 - 10.127.255.255
            'eu-west-1': '10.200.0.0/12',    # 10.200.0.0 - 10.215.255.255
            'ap-southeast-1': '10.300.0.0/12', # 10.300.0.0 - 10.315.255.255
        }
        
        if region not in region_bases:
            raise ValueError(f"Region {region} not configured in allocator")
        
        # Generate candidates
        base_network = ipaddress.IPv4Network(region_bases[region])
        
        for subnet in base_network.subnets(new_prefix=prefix_length):
            if not any(subnet.overlaps(existing) for existing in self.allocated):
                return str(subnet)
        
        raise ValueError(f"No available /{prefix_length} CIDR blocks in {region}")
    
    def allocate_cidr(self, region, environment, cidr):
        """Allocate a CIDR block"""
        
        # Check for overlaps
        overlaps = self.check_overlap(cidr)
        if overlaps:
            raise ValueError(f"CIDR {cidr} overlaps with: {', '.join(overlaps)}")
        
        # Add to registry
        if region not in self.registry['cidr_allocations']['aws_regions']:
            self.registry['cidr_allocations']['aws_regions'][region] = {}
        
        if environment not in self.registry['cidr_allocations']['aws_regions'][region]:
            self.registry['cidr_allocations']['aws_regions'][region][environment] = []
        
        self.registry['cidr_allocations']['aws_regions'][region][environment].append(cidr)
        self.allocated.append(ipaddress.IPv4Network(cidr))
        
        print(f"✓ Allocated {cidr} to {region}/{environment}")
        
        return True
    
    def save_registry(self, filename='cidr-allocation-registry.yaml'):
        """Save updated registry"""
        with open(filename, 'w') as f:
            yaml.dump(self.registry, f, default_flow_style=False)
        
        print(f"✓ Registry saved to {filename}")

# Example usage
allocator = CIDRAllocator()

# Check if a CIDR is available
overlaps = allocator.check_overlap('10.100.0.0/16')
if overlaps:
    print(f"CIDR overlaps with: {overlaps}")
else:
    print("CIDR is available")

# Suggest available CIDR
suggested = allocator.suggest_cidr('us-east-1', prefix_length=16)
print(f"Suggested CIDR: {suggested}")

# Allocate CIDR
allocator.allocate_cidr('us-east-1', 'production', suggested)
allocator.save_registry()
```

**Step 3: Implement IPv6 for Future-Proofing**

```
# Associate IPv6 CIDR with VPC
aws ec2 associate-vpc-cidr-block \
    --vpc-id $VPC_ID \
    --amazon-provided-ipv6-cidr-block

# Wait for association
aws ec2 wait vpc-available --vpc-ids $VPC_ID

# Get assigned IPv6 CIDR
IPV6_CIDR=$(aws ec2 describe-vpcs \
    --vpc-ids $VPC_ID \
    --query 'Vpcs.Ipv6CidrBlockAssociationSet.Ipv6CidrBlock' \
    --output text)

echo "Assigned IPv6 CIDR: $IPV6_CIDR"

# Assign IPv6 CIDR to subnets
aws ec2 associate-subnet-cidr-block \
    --subnet-id $SUBNET_ID \
    --ipv6-cidr-block "${IPV6_CIDR%::*}::/64"  # Use first /64

# Enable auto-assign IPv6
aws ec2 modify-subnet-attribute \
    --subnet-id $SUBNET_ID \
    --assign-ipv6-address-on-creation

# Update route tables for IPv6
aws ec2 create-route \
    --route-table-id $PUBLIC_RT \
    --destination-ipv6-cidr-block ::/0 \
    --gateway-id $IGW_ID

# For private subnets, use Egress-Only Internet Gateway
EIGW_ID=$(aws ec2 create-egress-only-internet-gateway \
    --vpc-id $VPC_ID \
    --query 'EgressOnlyInternetGateway.EgressOnlyInternetGatewayId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT \
    --destination-ipv6-cidr-block ::/0 \
    --egress-only-internet-gateway-id $EIGW_ID
```

**Prevention:**

- Maintain central CIDR allocation registry
- Use non-overlapping CIDR blocks from the start
- Coordinate with network teams before allocating
- Implement IPv6 for long-term scalability
- Document all CIDR allocations
- Regular audits of CIDR usage

---

## Chapter Summary

Amazon VPC is the networking foundation of AWS, providing isolated, software-defined networks with complete control over IP addressing, routing, and security. Mastering VPC architecture requires understanding subnet design, routing mechanisms, security layers, and connectivity patterns for both cloud-native and hybrid deployments.

**Key Takeaways:**

- **Plan CIDR blocks carefully:** Use /16 VPCs with room for growth, maintain a central allocation registry, and avoid overlapping with on-premises networks
- **Design for high availability:** Deploy resources across multiple AZs, use one NAT Gateway per AZ, and implement AZ-specific routing to avoid cross-AZ charges
- **Layer security controls:** Use security groups for instance-level stateful filtering, NACLs for subnet-level stateless filtering, and private subnets for resources without direct internet access
- **Optimize routing:** Implement proper route table associations, validate routes regularly, and consider Transit Gateway for multi-VPC environments
- **Leverage VPC endpoints:** Reduce NAT Gateway costs and improve security by using Gateway Endpoints for S3/DynamoDB and Interface Endpoints for other AWS services
- **Monitor network traffic:** Enable VPC Flow Logs from day one, create comprehensive dashboards, and set up automated alerts for network anomalies
- **Scale intelligently:** Use Transit Gateway instead of VPC peering for more than 5-10 VPCs, implement hub-and-spoke architectures, and plan for hybrid connectivity

Understanding VPC deeply enables you to build secure, scalable, and cost-effective network architectures that support both current needs and future growth. The networking foundation you've built here will be essential as we explore compute services in the next chapter.

In Chapter 4, we'll dive into Amazon EC2, where you'll learn to launch and manage virtual servers within the VPC infrastructure you've mastered.

## Hands-On Lab Exercise

**Objective:** Build a production-ready, highly available VPC with complete network isolation, multi-tier architecture, and hybrid connectivity simulation.

**Scenario:** Deploy a 3-tier application infrastructure with:

- Public web tier with Application Load Balancer
- Private application tier with Auto Scaling
- Private database tier with RDS Multi-AZ
- Bastion host for secure access
- VPC endpoints for AWS services
- VPN connectivity to simulated on-premises

**Exercise Steps:**

1. **Design and Document Architecture**
    - Draw network diagram
    - Plan CIDR allocation
    - Document security group rules
    - Define route table strategy
2. **Deploy Core VPC Infrastructure**
    - Create VPC with /16 CIDR
    - Deploy 9 subnets across 3 AZs (public, app, database)
    - Set up Internet Gateway and NAT Gateways
    - Configure route tables
3. **Implement Security Layers**
    - Create security groups for each tier
    - Configure NACLs for additional protection
    - Set up bastion host for SSH access
    - Implement security group chaining
4. **Deploy Application Components**
    - Launch Application Load Balancer in public subnets
    - Create Auto Scaling Group in app subnets
    - Deploy RDS Multi-AZ in database subnets
    - Configure health checks
5. **Optimize with VPC Endpoints**
    - Create S3 Gateway Endpoint
    - Set up Systems Manager Interface Endpoints
    - Test private connectivity
6. **Enable Monitoring**
    - Enable VPC Flow Logs
    - Create CloudWatch dashboard
    - Set up alarms for anomalies
7. **Test and Validate**
    - Verify connectivity between tiers
    - Test AZ failover scenarios
    - Validate security group restrictions
    - Confirm monitoring is working

**Expected Outcomes:**

- Fully functional multi-tier VPC architecture
- Documented network design
- Working security controls
- Operational monitoring

**Cleanup:**

```
aws cloudformation delete-stack --stack-name production-vpc
# Manually delete NAT Gateways and release Elastic IPs
# Terminate EC2 instances
# Delete RDS instances
```


## Review Questions

1. **What is the minimum and maximum CIDR block size for a VPC?**
a) /24 to /8
b) /28 to /16
c) /32 to /16
d) /28 to /8

**Answer: B** - AWS VPCs support CIDR blocks from /28 (16 IP addresses) to /16 (65,536 IP addresses).

2. **How many IP addresses does AWS reserve in each subnet?**
a) 3
b) 4
c) 5
d) 10

**Answer: C** - AWS reserves 5 IP addresses: network address, VPC router, DNS server, future use, and broadcast address.

3. **What is the primary difference between a security group and a network ACL?**
a) Security groups are stateless, NACLs are stateful
b) Security groups are stateful, NACLs are stateless
c) Security groups deny by default, NACLs allow by default
d) There is no difference

**Answer: B** - Security groups are stateful (return traffic automatically allowed), while NACLs are stateless (return traffic must be explicitly allowed).

4. **How many NAT Gateways should you deploy for high availability in a VPC with 3 AZs?**
a) 1
b) 2
c) 3
d) 6

**Answer: C** - Deploy one NAT Gateway per AZ (3 total) to ensure high availability and avoid cross-AZ data transfer charges.

5. **What happens to traffic when a route table has a blackhole route?**
a) Traffic is redirected to the default route
b) Traffic is dropped silently
c) An error is returned to the sender
d) Traffic is sent to the VPC router

**Answer: B** - Blackhole routes silently drop traffic without returning an error, typically occurring when the target resource is deleted.

6. **Which VPC component enables private connectivity to S3 without using internet or NAT Gateway?**
a) VPC Peering
b) Transit Gateway
c) VPC Endpoint (Gateway)
d) Direct Connect

**Answer: C** - S3 Gateway Endpoint provides private connectivity to S3 without data transfer charges or NAT Gateway usage.

7. **How many VPC peering connections are required for a full mesh of 10 VPCs?**
a) 10
b) 20
c) 45
d) 90

**Answer: C** - Formula: n(n-1)/2 = 10(9)/2 = 45 peering connections.

8. **What is the maximum number of secondary CIDR blocks you can add to a VPC?**
a) 3
b) 5
c) 10
d) Unlimited

**Answer: B** - You can add up to 5 secondary CIDR blocks to a VPC (in addition to the primary CIDR).

9. **Which statement about VPC peering is TRUE?**
a) VPC peering is transitive
b) VPC peering requires non-overlapping CIDR blocks
c) VPC peering can only connect VPCs in the same region
d) VPC peering creates a single point of failure

**Answer: B** - VPC peering requires non-overlapping CIDR blocks. It is NOT transitive, supports cross-region connections, and has no single point of failure.

10. **What is the purpose of an Egress-Only Internet Gateway?**
a) Allow inbound IPv6 traffic
b) Allow outbound IPv6 traffic only
c) Replace NAT Gateway for IPv4
d) Enable VPC peering over IPv6

**Answer: B** - Egress-Only Internet Gateway allows outbound IPv6 traffic while preventing inbound connections (IPv6 equivalent of NAT Gateway).

11. **How does AWS Transit Gateway simplify multi-VPC connectivity compared to VPC peering?**
a) It's cheaper than VPC peering
b) It provides transitive routing through a central hub
c) It doesn't require route table updates
d) It automatically encrypts all traffic

**Answer: B** - Transit Gateway provides transitive routing, allowing VPCs to communicate through a central hub instead of requiring full mesh peering connections.

12. **What is the correct order of route evaluation when multiple routes match a destination?**
a) First created wins
b) Most specific (longest prefix) wins
c) Last created wins
d) Random selection

**Answer: B** - AWS uses longest prefix match - the most specific route (longest prefix length) wins.

13. **Which of the following is NOT a valid NAT Gateway limitation?**
a) Supports up to 55,000 simultaneous connections
b) Scales up to 45 Gbps
c) Must be deployed in a public subnet
d) Can be shared across multiple VPCs

**Answer: D** - NAT Gateways cannot be shared across VPCs. Each VPC needs its own NAT Gateway(s).

14. **What is the primary use case for VPC Flow Logs?**
a) Monitor VPC creation events
b) Capture IP traffic information for security analysis
c) Log changes to security groups
d) Track VPC cost allocation

**Answer: B** - VPC Flow Logs capture information about IP traffic flowing through network interfaces for security analysis and troubleshooting.

15. **When should you use Transit Gateway instead of VPC Peering?**
a) For connecting 2-3 VPCs
b) When you need the lowest possible cost
c) For connecting 10+ VPCs or requiring transitive routing
d) Only for cross-region connectivity

**Answer: C** - Transit Gateway is ideal for connecting many VPCs (10+) or when transitive routing is required, despite higher costs than VPC peering.

---
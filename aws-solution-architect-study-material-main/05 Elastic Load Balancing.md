# Chapter 5: Elastic Load Balancing

## Introduction

Elastic Load Balancing (ELB) is the traffic distribution backbone of AWS applications, automatically distributing incoming application traffic across multiple targets such as EC2 instances, containers, IP addresses, and Lambda functions. In modern cloud architectures, load balancers are not merely optional components—they are essential for achieving high availability, fault tolerance, and horizontal scalability. Without load balancing, applications remain single points of failure, unable to handle traffic surges or recover gracefully from failures.

The evolution of AWS load balancers reflects the changing needs of cloud applications. What began with Classic Load Balancers has evolved into three specialized types: Application Load Balancers for HTTP/HTTPS traffic with advanced routing, Network Load Balancers for ultra-low latency TCP/UDP traffic, and Gateway Load Balancers for third-party virtual appliances. Each type serves distinct use cases, and selecting the wrong one can lead to performance bottlenecks, increased costs, or architectural limitations.

Understanding ELB goes far beyond simply distributing traffic. Modern load balancers provide SSL/TLS termination, reducing compute overhead on backend servers; implement sophisticated health checks to route traffic only to healthy targets; support WebSocket and HTTP/2 protocols for real-time applications; integrate with WAF for security; and provide detailed metrics for observability. Proper load balancer configuration is critical—misconfigured health checks can mark healthy instances as unhealthy, cross-zone load balancing settings affect availability, and incorrect listener rules can route traffic to wrong targets.

This chapter provides comprehensive coverage of Elastic Load Balancing from fundamentals to production patterns. You'll learn to select the appropriate load balancer type for your workload, configure advanced routing rules, implement SSL/TLS termination, design health checks that accurately reflect application health, optimize performance, and troubleshoot common issues. Whether you're building a simple web application or a complex microservices architecture, mastering ELB is essential for production-ready AWS deployments.

## Theory \& Concepts

### Load Balancing Fundamentals

Load balancing distributes client requests across multiple backend servers to ensure no single server becomes overwhelmed, improving both availability and performance.

**Key Benefits:**

1. **High Availability:** If one target fails, traffic routes to healthy targets
2. **Horizontal Scalability:** Add more targets to handle increased load
3. **Fault Tolerance:** Automatic health checking and traffic rerouting
4. **Reduced Latency:** Route traffic to optimal targets based on various criteria
5. **SSL/TLS Offloading:** Terminate encryption at load balancer, reducing backend load
6. **Session Affinity:** Maintain user sessions with specific targets when needed

**Load Balancing Algorithms:**

**Round Robin:** Distributes requests sequentially across targets (default for ALB/CLB)

**Least Outstanding Requests:** Routes to target with fewest active connections (ALB)

**Flow Hash:** Routes based on 5-tuple hash for consistent routing (NLB)

**Weighted Target Groups:** Distributes traffic based on assigned weights

### ELB Types Comparison

AWS offers four types of load balancers, each optimized for specific use cases.


| Feature | Application (ALB) | Network (NLB) | Gateway (GLB) | Classic (CLB) |
| :-- | :-- | :-- | :-- | :-- |
| **OSI Layer** | Layer 7 (HTTP/HTTPS) | Layer 4 (TCP/UDP/TLS) | Layer 3 (IP) + Layer 4 | Layer 4/7 |
| **Protocol Support** | HTTP, HTTPS, HTTP/2, WebSocket, gRPC | TCP, UDP, TLS | IP packets | HTTP, HTTPS, TCP, SSL |
| **Target Types** | Instance, IP, Lambda | Instance, IP, ALB | Gateway appliance endpoints | Instance |
| **Routing** | Content-based, host-based, path-based | Flow hash algorithm | Flow hash to appliances | Basic |
| **Static IP** | No (but supports via NLB) | Yes (Elastic IP per AZ) | Yes | No |
| **Performance** | Good | Excellent (millions of rps, ultra-low latency) | High throughput | Moderate |
| **Health Checks** | HTTP/HTTPS with path | TCP, HTTP, HTTPS | Protocol-specific | TCP, HTTP, HTTPS |
| **SSL Termination** | Yes | Yes | No | Yes |
| **WebSockets** | Yes | Yes | No | No (partial) |
| **Use Cases** | Microservices, containers, Lambda | Gaming, IoT, real-time, TCP apps | Firewall appliances, IDS/IPS | Legacy (deprecated) |
| **Pricing** | Per hour + LCU | Per hour + NLCU | Per hour + GLCU | Per hour + data |
| **Status** | Current | Current | Current | Legacy (not recommended) |

**Recommendation:** Use ALB for HTTP/HTTPS workloads, NLB for TCP/UDP or when static IPs needed, GLB for appliance integration. Avoid CLB for new deployments.

### Application Load Balancer (ALB) Deep Dive

ALB operates at Layer 7 (HTTP/HTTPS) and provides advanced routing capabilities.

**Key Features:**

**1. Content-Based Routing:**

Route requests based on HTTP headers, methods, query parameters, source IP:

```
Rules can check:
- Host headers (api.example.com vs www.example.com)
- Path patterns (/api/* vs /images/*)
- HTTP headers (X-Custom-Header)
- HTTP methods (GET, POST, PUT, DELETE)
- Query strings (?user=premium)
- Source IP CIDR
```

**2. Target Types:**

- **Instances:** EC2 instances in the same VPC
- **IP Addresses:** Any private IP (on-premises, other VPCs)
- **Lambda Functions:** Serverless integration

**3. Listener Rules:**

Each listener can have multiple rules evaluated in priority order:

```
Listener (Port 443)
├── Rule 1 (Priority 1): Host is api.example.com → API Target Group
├── Rule 2 (Priority 2): Path is /images/* → Static Content TG
├── Rule 3 (Priority 3): Header X-Version is v2 → New Version TG
└── Default Rule: → Main Application TG
```

**4. SSL/TLS Termination:**

ALB can terminate SSL/TLS connections:

- Supports SNI (Server Name Indication) for multiple certificates
- Integrates with ACM (AWS Certificate Manager)
- Supports custom security policies
- Offloads encryption/decryption from backend servers

**5. Sticky Sessions (Session Affinity):**

Maintains user sessions with same target:

- **Duration-based:** Fixed duration (1 second to 7 days)
- **Application-based:** Uses application cookie

**6. HTTP/2 and gRPC Support:**

- Native HTTP/2 support for frontend connections
- gRPC routing and load balancing
- WebSocket support for real-time communication

**7. Authentication:**

ALB can authenticate users:

- Amazon Cognito User Pools
- OpenID Connect (OIDC) providers
- SAML-based IdPs

**ALB Components:**

```
Application Load Balancer
├── Listener (Port, Protocol)
│   ├── Default Action (Forward, Redirect, Fixed Response, Authenticate)
│   └── Rules (Conditions → Actions)
├── Target Groups
│   ├── Targets (Instances, IPs, Lambda)
│   ├── Health Check Configuration
│   └── Attributes (Deregistration delay, stickiness, slow start)
└── Security Settings
    ├── Security Groups
    └── SSL/TLS Policies
```

**ALB Routing Algorithm:**

1. **Least Outstanding Requests:** Routes to target with fewest active requests
2. **Round Robin:** If requests are equal, uses round robin
3. **Sticky Sessions:** If enabled, routes returning users to same target

### Network Load Balancer (NLB) Deep Dive

NLB operates at Layer 4 (TCP/UDP/TLS) and is designed for extreme performance and low latency.

**Key Features:**

**1. Ultra-High Performance:**

- Handles millions of requests per second
- Ultra-low latency (<1 ms)
- Maintains existing client connections during scaling

**2. Static IP Addresses:**

- One Elastic IP per Availability Zone
- Ideal for whitelisting in firewalls
- Supports PrivateLink for service exposure

**3. Preserve Source IP:**

- Client IP preserved to backend (unlike ALB)
- No need for X-Forwarded-For header

**4. TLS Termination:**

- Terminate TLS at load balancer (added feature)
- Integrates with ACM
- Supports SNI

**5. Target Types:**

- Instances
- IP addresses (including outside VPC)
- Application Load Balancers (for combining L4 + L7 benefits)

**6. Connection-Based Routing:**

- Uses flow hash algorithm (5-tuple: protocol, source/dest IP, source/dest port)
- Ensures packets from same flow reach same target
- Maintains connection affinity

**7. Cross-Zone Load Balancing:**

- Optional (disabled by default, unlike ALB)
- No data transfer charges when enabled (unlike ALB)

**NLB Use Cases:**

- **Gaming Servers:** Low latency, preserve client IP
- **IoT Applications:** Millions of concurrent connections
- **TCP/UDP Workloads:** Non-HTTP protocols
- **Static IP Requirements:** Firewall whitelisting
- **PrivateLink:** Expose services privately


### Gateway Load Balancer (GLB)

GLB enables deployment and scaling of third-party virtual appliances (firewalls, IDS/IPS, DPI).

**Architecture:**

```
Internet/VPC
    ↓
Gateway Load Balancer (GLB)
    ↓ (GENEVE encapsulation)
Appliance Fleet (Auto Scaling)
    ↓ (Return traffic)
GLB
    ↓
Original Destination
```

**Key Features:**

1. **Transparent Inspection:** Traffic flow maintained through appliances
2. **GENEVE Protocol:** Encapsulates original packets for appliance processing
3. **Auto Scaling:** Scale appliance fleet based on traffic
4. **High Availability:** Distributes traffic across healthy appliances
5. **Centralized Security:** Single point for security appliance deployment

**Use Cases:**

- Deploy third-party firewalls (Palo Alto, Fortinet, Check Point)
- Intrusion Detection/Prevention Systems (IDS/IPS)
- Deep Packet Inspection (DPI)
- Network monitoring and analytics


### Health Checks

Health checks determine which targets are healthy and can receive traffic.

**Health Check Parameters:**


| Parameter | Description | ALB/CLB | NLB |
| :-- | :-- | :-- | :-- |
| **Protocol** | HTTP, HTTPS, TCP | HTTP/HTTPS | TCP, HTTP, HTTPS |
| **Port** | Port to check | Yes | Yes |
| **Path** | HTTP path to check | Yes (required for HTTP) | Yes (optional) |
| **Interval** | Seconds between checks | 5-300 seconds | 10 or 30 seconds |
| **Timeout** | Wait time for response | 2-120 seconds | 6 or 10 seconds |
| **Healthy Threshold** | Consecutive successes | 2-10 | 2-10 |
| **Unhealthy Threshold** | Consecutive failures | 2-10 | 2-10 |
| **Success Codes** | HTTP response codes | 200-499 | 200-499 |

**Health Check States:**

```
Initial → Unhealthy (default starting state)
         ↓
    [Checks Begin]
         ↓
    [Success × Healthy Threshold] → Healthy
         ↓
    [Failure × Unhealthy Threshold] → Unhealthy
```

**Health Check Best Practices:**

```python
# Good health check endpoint
@app.route('/health')
def health_check():
    # Check application dependencies
    checks = {
        'database': check_database_connection(),
        'cache': check_redis_connection(),
        'disk_space': check_disk_space(),
        'memory': check_memory_usage()
    }
    
    # Return 200 only if all critical checks pass
    if all(checks.values()):
        return {'status': 'healthy', 'checks': checks}, 200
    else:
        return {'status': 'unhealthy', 'checks': checks}, 503
```

**Health Check Timing:**

```
Time to become healthy: (Healthy Threshold × Interval) seconds
Example: 2 × 30 = 60 seconds minimum

Time to become unhealthy: (Unhealthy Threshold × Interval) seconds
Example: 2 × 30 = 60 seconds minimum

Total time for failover: Up to 2 minutes typical
```


### Connection Draining and Deregistration Delay

When a target is deregistered (instance termination, health check failure), the load balancer handles in-flight connections gracefully.

**Deregistration Delay (Connection Draining):**

- **Default:** 300 seconds (5 minutes)
- **Range:** 0-3600 seconds (1 hour)
- **Behavior:** Load balancer stops sending new connections but allows existing connections to complete

**Process:**

```
1. Target marked for deregistration
2. Load balancer stops sending new requests to target
3. Existing connections continue up to deregistration delay
4. After delay, connections forcibly closed
5. Target fully deregistered
```

**Optimal Settings:**

```
Quick stateless requests (API): 30-60 seconds
Long-polling connections: 300-900 seconds
WebSocket applications: 3600 seconds
File downloads: 3600 seconds
```


### Cross-Zone Load Balancing

Determines whether load balancer distributes traffic across all targets in all enabled AZs.

**Enabled (Recommended):**

```
AZ-1: 2 instances (receive 50% of traffic)
AZ-2: 4 instances (receive 50% of traffic)

Each instance in AZ-1 gets 25% traffic
Each instance in AZ-2 gets 12.5% traffic
```

**Disabled:**

```
AZ-1: 2 instances (receive traffic from AZ-1 LB node)
AZ-2: 4 instances (receive traffic from AZ-2 LB node)

Traffic distributed only within each AZ
Can lead to imbalanced load if traffic sources uneven
```

**Comparison:**


| Feature | ALB | NLB | CLB |
| :-- | :-- | :-- | :-- |
| **Default** | Enabled | Disabled | Disabled |
| **Can Disable** | Yes | No (always evaluates all targets) | Yes |
| **Data Transfer Charges** | Yes (cross-AZ charges) | No | Yes |

**Recommendation:** Enable cross-zone for even distribution unless you have specific AZ affinity requirements or want to minimize cross-AZ data transfer costs.

### SSL/TLS Termination

Load balancers can terminate SSL/TLS connections, decrypting traffic before forwarding to targets.

**Benefits:**

1. **Reduced Backend Load:** CPU-intensive encryption handled by load balancer
2. **Centralized Certificate Management:** One place to manage certificates
3. **Simplified Target Configuration:** Targets receive plain HTTP
4. **SNI Support:** Host multiple SSL domains on same load balancer
5. **Modern Cipher Suites:** Easily update security policies

**Architecture Options:**

**1. SSL Termination at Load Balancer (Most Common):**

```
Client (HTTPS) → Load Balancer (Terminates SSL) → Target (HTTP)

Benefits: Offload encryption, simpler target config
Drawbacks: Unencrypted in VPC (mitigated by VPC security)
```

**2. End-to-End Encryption:**

```
Client (HTTPS) → Load Balancer (Terminates SSL) → Target (HTTPS)

Benefits: Encrypted throughout, compliance requirements
Drawbacks: Higher target CPU usage
```

**3. SSL Passthrough (NLB only):**

```
Client (TLS) → Load Balancer (No termination) → Target (TLS)

Benefits: End-to-end encryption, load balancer doesn't see decrypted traffic
Drawbacks: No Layer 7 routing, can't inspect traffic
```

**SSL/TLS Policies:**

AWS provides predefined security policies:


| Policy | TLS Versions | Use Case |
| :-- | :-- | :-- |
| ELBSecurityPolicy-TLS13-1-2-2021-06 | TLS 1.3, 1.2 | Modern (recommended) |
| ELBSecurityPolicy-TLS-1-2-2017-01 | TLS 1.2 | Most common |
| ELBSecurityPolicy-TLS-1-1-2017-01 | TLS 1.1, 1.2 | Compatibility |
| ELBSecurityPolicy-2016-08 | TLS 1.0, 1.1, 1.2 | Legacy support |

**SNI (Server Name Indication):**

Host multiple SSL/TLS domains on single load balancer:

```
ALB Listener (Port 443)
├── Certificate 1: *.example.com (default)
├── Certificate 2: api.example.com
├── Certificate 3: *.partner.com
└── Rule: Host is api.example.com → API Target Group
```


### Load Balancer Attributes

**ALB Attributes:**


| Attribute | Default | Description |
| :-- | :-- | :-- |
| deletion_protection.enabled | false | Prevent accidental deletion |
| idle_timeout.timeout_seconds | 60 | Connection idle timeout (1-4000) |
| routing.http2.enabled | true | Enable HTTP/2 |
| routing.http.drop_invalid_header_fields.enabled | false | Drop invalid headers |
| routing.http.xff_client_port.enabled | false | Append client port to X-Forwarded-For |
| access_logs.s3.enabled | false | Enable access logs to S3 |

**NLB Attributes:**


| Attribute | Default | Description |
| :-- | :-- | :-- |
| deletion_protection.enabled | false | Prevent accidental deletion |
| load_balancing.cross_zone.enabled | false | Cross-zone load balancing |
| access_logs.s3.enabled | false | Enable access logs |

**Connection Tracking:**

NLB maintains connection state for TCP connections:

- **Idle Timeout:** 350 seconds (TCP), 120 seconds (UDP)
- **Configurable:** No (fixed values)


### Request Routing

**ALB Routing Evaluation Order:**

1. **Host Header:** Evaluate host-based rules first
2. **Path Pattern:** Then path-based rules
3. **HTTP Headers:** Custom header matching
4. **HTTP Method:** GET, POST, etc.
5. **Query String:** URL parameters
6. **Source IP:** CIDR-based routing

**Rule Priority:**

Rules evaluated in order from lowest to highest priority number:

```
Priority 1: Most specific rule (evaluated first)
Priority 10: Less specific rule
Priority 100: Catch-all rule
Default Rule: Catch everything not matched
```

**Forward Action Types:**


| Action | Description | Use Case |
| :-- | :-- | :-- |
| Forward | Send to target group | Normal routing |
| Redirect | HTTP redirect | HTTP → HTTPS, domain migration |
| Fixed Response | Return static response | Maintenance page, error page |
| Authenticate | Authenticate via Cognito/OIDC | User authentication |

**Weighted Target Groups:**

Distribute traffic across multiple target groups:

```
Rule: Path is /api/*
Actions:
  - Forward to API-v1 (weight: 80)
  - Forward to API-v2 (weight: 20)

Result: 80% traffic to v1, 20% to v2 (for testing/canary)
```


### Load Balancer Pricing

**ALB Pricing:**

- **Fixed:** \$0.0225 per hour (~\$16.43/month)
- **LCU (Load Balancer Capacity Unit):** \$0.008 per LCU-hour

**LCU Dimensions (highest determines LCU):**

- New connections per second: 25 = 1 LCU
- Active connections per minute: 3,000 = 1 LCU
- Processed bytes (HTTP) per hour: 1 GB = 1 LCU
- Rule evaluations per second: 1,000 = 1 LCU

**NLB Pricing:**

- **Fixed:** \$0.0225 per hour (~\$16.43/month)
- **NLCU (Network LCU):** \$0.006 per NLCU-hour

**NLCU Dimensions:**

- New connections/flows per second: 800 = 1 NLCU
- Active connections/flows per minute: 100,000 = 1 NLCU
- Processed bytes per hour: 1 GB = 1 NLCU

**GLB Pricing:**

- **Fixed:** \$0.0125 per hour (~\$9.13/month)
- **GLCU:** \$0.004 per GLCU-hour

**Example Cost Calculation:**

```
Small Web Application (ALB):
- Fixed: $16.43/month
- Traffic: 100 GB/month = 100 LCUs × 744 hours/month × $0.008 = $595.20
- Total: ~$611.63/month

High-Traffic API (ALB):
- Fixed: $16.43/month
- 10,000 requests/sec = 400 LCUs (rule evaluations)
- 400 LCUs × 744 hours × $0.008 = $2,379.20
- Total: ~$2,395.63/month
```


## Hands-On Implementation

### Lab 1: Configuring Application Load Balancer

**Objective:** Create an ALB with multiple target groups and path-based routing.

**Architecture:**

```
Internet → ALB (Port 443)
           ├── /api/* → API Target Group (Port 8080)
           ├── /images/* → Static Content TG (Port 80)
           └── /* → Web Application TG (Port 80)
```


#### Step 1: Create Target Groups

```bash
# Create API Target Group
API_TG_ARN=$(aws elbv2 create-target-group \
    --name api-target-group \
    --protocol HTTP \
    --port 8080 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --target-type instance \
    --tags Key=Name,Value=API-TG Key=Environment,Value=Production \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Register targets (EC2 instances)
aws elbv2 register-targets \
    --target-group-arn $API_TG_ARN \
    --targets Id=i-api1,Port=8080 Id=i-api2,Port=8080

# Create Static Content Target Group
STATIC_TG_ARN=$(aws elbv2 create-target-group \
    --name static-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path /health.html \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

aws elbv2 register-targets \
    --target-group-arn $STATIC_TG_ARN \
    --targets Id=i-static1 Id=i-static2

# Create Web Application Target Group
WEB_TG_ARN=$(aws elbv2 create-target-group \
    --name web-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path / \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200,301 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

aws elbv2 register-targets \
    --target-group-arn $WEB_TG_ARN \
    --targets Id=i-web1 Id=i-web2 Id=i-web3
```


#### Step 2: Configure Target Group Attributes

```bash
# Configure deregistration delay (connection draining)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes \
        Key=deregistration_delay.timeout_seconds,Value=30 \
        Key=stickiness.enabled,Value=true \
        Key=stickiness.type,Value=lb_cookie \
        Key=stickiness.lb_cookie.duration_seconds,Value=86400

# Configure slow start mode (gradual ramp-up)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $WEB_TG_ARN \
    --attributes \
        Key=slow_start.duration_seconds,Value=60 \
        Key=deregistration_delay.timeout_seconds,Value=60

# Enable load balancing algorithm choice
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes \
        Key=load_balancing.algorithm.type,Value=least_outstanding_requests
```


#### Step 3: Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name production-alb \
    --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B $PUBLIC_SUBNET_1C \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=Production-ALB Key=Environment,Value=Production \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "ALB DNS: $ALB_DNS"

# Configure ALB attributes
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes \
        Key=idle_timeout.timeout_seconds,Value=60 \
        Key=deletion_protection.enabled,Value=true \
        Key=routing.http2.enabled,Value=true \
        Key=access_logs.s3.enabled,Value=true \
        Key=access_logs.s3.bucket,Value=my-alb-logs-bucket \
        Key=access_logs.s3.prefix,Value=production-alb
```


#### Step 4: Configure SSL/TLS Certificate

```bash
# Request certificate from ACM
CERT_ARN=$(aws acm request-certificate \
    --domain-name example.com \
    --subject-alternative-names *.example.com api.example.com \
    --validation-method DNS \
    --query 'CertificateArn' \
    --output text)

# Wait for certificate validation (requires DNS record creation)
# After validation completes...

# Or use existing certificate
# CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
```


#### Step 5: Create HTTPS Listener with Rules

```bash
# Create HTTPS listener (443)
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN \
    --query 'Listeners[0].ListenerArn' \
    --output text)

# Create rule for API routing (/api/*)
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn=$API_TG_ARN

# Create rule for static content (/images/*, /css/*, /js/*)
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 2 \
    --conditions Field=path-pattern,Values='/images/*','/css/*','/js/*' \
    --actions Type=forward,TargetGroupArn=$STATIC_TG_ARN

# Create rule for API subdomain
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 3 \
    --conditions Field=host-header,Values='api.example.com' \
    --actions Type=forward,TargetGroupArn=$API_TG_ARN

# Create HTTP listener (80) with redirect to HTTPS
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --query 'Listeners[0].ListenerArn' \
    --output text)
```


#### Step 6: Advanced Routing Rules

```bash
# Weighted target groups for canary deployment
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 5 \
    --conditions Field=path-pattern,Values='/api/v2/*' \
    --actions Type=forward,ForwardConfig='{
      "TargetGroups": [
        {"TargetGroupArn": "'$API_TG_ARN'", "Weight": 90},
        {"TargetGroupArn": "'$API_V2_TG_ARN'", "Weight": 10}
      ],
      "TargetGroupStickinessConfig": {
        "Enabled": true,
        "DurationSeconds": 3600
      }
    }'

# Header-based routing
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 6 \
    --conditions Field=http-header,HttpHeaderConfig={HttpHeaderName=X-Custom-Header,Values=['premium']} \
    --actions Type=forward,TargetGroupArn=$PREMIUM_TG_ARN

# Query string-based routing
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 7 \
    --conditions Field=query-string,QueryStringConfig={Values=[{Key=version,Value=beta}]} \
    --actions Type=forward,TargetGroupArn=$BETA_TG_ARN

# Fixed response for maintenance page
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 100 \
    --conditions Field=path-pattern,Values='/maintenance' \
    --actions Type=fixed-response,FixedResponseConfig='{
      "StatusCode": "503",
      "ContentType": "text/html",
      "MessageBody": "<html><body><h1>Under Maintenance</h1><p>We will be back soon!</p></body></html>"
    }'
```


### Lab 2: Configuring Network Load Balancer

**Objective:** Create an NLB for TCP application with static IP addresses.

```bash
# Allocate Elastic IPs for NLB (one per subnet/AZ)
EIP_1A=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NLB-EIP-1A}]' \
    --query 'AllocationId' \
    --output text)

EIP_1B=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NLB-EIP-1B}]' \
    --query 'AllocationId' \
    --output text)

# Create NLB with static IPs
NLB_ARN=$(aws elbv2 create-load-balancer \
    --name production-nlb \
    --type network \
    --scheme internet-facing \
    --subnet-mappings \
        SubnetId=$PUBLIC_SUBNET_1A,AllocationId=$EIP_1A \
        SubnetId=$PUBLIC_SUBNET_1B,AllocationId=$EIP_1B \
    --tags Key=Name,Value=Production-NLB \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create target group for TCP traffic
TCP_TG_ARN=$(aws elbv2 create-target-group \
    --name tcp-target-group \
    --protocol TCP \
    --port 3306 \
    --vpc-id $VPC_ID \
    --health-check-protocol TCP \
    --health-check-port 3306 \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 3 \
    --unhealthy-threshold-count 3 \
    --target-type instance \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Register targets
aws elbv2 register-targets \
    --target-group-arn $TCP_TG_ARN \
    --targets Id=i-db1,Port=3306 Id=i-db2,Port=3306

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $NLB_ARN \
    --protocol TCP \
    --port 3306 \
    --default-actions Type=forward,TargetGroupArn=$TCP_TG_ARN

# Enable cross-zone load balancing
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true

# Get static IPs
aws elbv2 describe-load-balancers \
    --load-balancer-arns $NLB_ARN \
    --query 'LoadBalancers[0].AvailabilityZones[*].[ZoneName,LoadBalancerAddresses[0].IpAddress]' \
    --output table
```


### Lab 3: Implementing SSL/TLS Termination

**Objective:** Configure end-to-end encryption with SSL offloading at ALB.

```bash
# Create target group with HTTPS backend
SECURE_TG_ARN=$(aws elbv2 create-target-group \
    --name secure-backend-tg \
    --protocol HTTPS \
    --port 443 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTPS \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create HTTPS listener with multiple certificates (SNI)
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$MAIN_CERT_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions Type=forward,TargetGroupArn=$SECURE_TG_ARN

# Add additional certificates for SNI
aws elbv2 add-listener-certificates \
    --listener-arn $HTTPS_LISTENER_ARN \
    --certificates \
        CertificateArn=$API_CERT_ARN \
        CertificateArn=$ADMIN_CERT_ARN

# List available SSL policies
aws elbv2 describe-ssl-policies \
    --query 'SslPolicies[*].[Name,SslProtocols]' \
    --output table

# Update SSL policy
aws elbv2 modify-listener \
    --listener-arn $HTTPS_LISTENER_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-3-2021-06
```


### Lab 4: Configuring Cognito Authentication

**Objective:** Add user authentication to ALB using Amazon Cognito.

```bash
# Create Cognito User Pool (done separately)
# USER_POOL_ID=...
# USER_POOL_CLIENT_ID=...
# USER_POOL_DOMAIN=my-app.auth.us-east-1.amazoncognito.com

# Create authenticated target group
AUTH_TG_ARN=$(aws elbv2 create-target-group \
    --name authenticated-app-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create listener with Cognito authentication
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions \
        Type=authenticate-cognito,AuthenticateCognitoConfig='{
          "UserPoolArn": "arn:aws:cognito-idp:us-east-1:123456789012:userpool/'$USER_POOL_ID'",
          "UserPoolClientId": "'$USER_POOL_CLIENT_ID'",
          "UserPoolDomain": "my-app",
          "OnUnauthenticatedRequest": "authenticate",
          "Scope": "openid",
          "SessionCookieName": "AWSELBAuthSessionCookie",
          "SessionTimeout": 604800
        }',Order=1 \
        Type=forward,TargetGroupArn=$AUTH_TG_ARN,Order=2

# Create rule for unauthenticated public pages
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values='/public/*','/login' \
    --actions Type=forward,TargetGroupArn=$PUBLIC_TG_ARN
```


### Lab 5: Monitoring and CloudWatch Integration

**Objective:** Set up comprehensive monitoring for load balancers.

```python
#!/usr/bin/env python3
# alb_monitoring_setup.py

import boto3

cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

def create_alb_alarms(alb_name, target_group_name, sns_topic_arn):
    """
    Create comprehensive CloudWatch alarms for ALB
    """
    
    alarms = []
    
    # High 5XX error rate
    alarms.append({
        'AlarmName': f'{alb_name}-High-5XX-Errors',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'HTTPCode_Target_5XX_Count',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Sum',
        'Threshold': 10,
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when 5XX errors exceed threshold',
        'AlarmActions': [sns_topic_arn]
    })
    
    # High response time
    alarms.append({
        'AlarmName': f'{alb_name}-High-Response-Time',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 3,
        'MetricName': 'TargetResponseTime',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Average',
        'Threshold': 1.0,  # 1 second
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when response time exceeds 1 second',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Unhealthy host count
    alarms.append({
        'AlarmName': f'{target_group_name}-Unhealthy-Hosts',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'UnHealthyHostCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Maximum',
        'Threshold': 0,
        'Dimensions': [
            {'Name': 'TargetGroup', 'Value': target_group_name},
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when any target becomes unhealthy',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Low healthy host count
    alarms.append({
        'AlarmName': f'{target_group_name}-Low-Healthy-Hosts',
        'ComparisonOperator': 'LessThanThreshold',
        'EvaluationPeriods': 1,
        'MetricName': 'HealthyHostCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Minimum',
        'Threshold': 2,
        'Dimensions': [
            {'Name': 'TargetGroup', 'Value': target_group_name},
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when healthy hosts drop below 2',
        'AlarmActions': [sns_topic_arn]
    })
    
    # High request count (potential DDoS)
    alarms.append({
        'AlarmName': f'{alb_name}-High-Request-Count',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'RequestCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Sum',
        'Threshold': 100000,  # 100k requests per minute
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert on unusually high request rate',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Create all alarms
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")
    
    print(f"✓ Created {len(alarms)} CloudWatch alarms")

# Example usage
# create_alb_alarms(
#     'app/production-alb/1234567890abcdef',
#     'targetgroup/web-tg/1234567890abcdef',
#     'arn:aws:sns:us-east-1:123456789012:alb-alerts'
# )
```

**Create CloudWatch Dashboard:**

```bash
# Create dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ALB-Production-Dashboard \
    --dashboard-body file://alb-dashboard.json

# alb-dashboard.json
cat > alb-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", {"stat": "Sum", "label": "Total Requests"}],
          [".", "HTTPCode_Target_2XX_Count", {"stat": "Sum"}],
          [".", "HTTPCode_Target_4XX_Count", {"stat": "Sum"}],
          [".", "HTTPCode_Target_5XX_Count", {"stat": "Sum"}]
        ],
        "period": 60,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Request Metrics",
        "yAxis": {"left": {"label": "Count"}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "Average"}],
          ["...", {"stat": "p50"}],
          ["...", {"stat": "p95"}],
          ["...", {"stat": "p99"}]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Response Time",
        "yAxis": {"left": {"label": "Seconds"}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "HealthyHostCount", {"stat": "Average"}],
          [".", "UnHealthyHostCount", {"stat": "Average"}]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Target Health"
      }
    }
  ]
}
EOF
```

## Production-Level Knowledge

### Multi-Region Load Balancing with Route 53

For global applications, combine ELB with Route 53 for multi-region active-active or active-passive architectures.

**Architecture Pattern:**

```
Global Users
    ↓
Route 53 (Geoproximity/Latency/Failover)
    ├── us-east-1: ALB → Target Group → EC2 Fleet
    ├── eu-west-1: ALB → Target Group → EC2 Fleet
    └── ap-southeast-1: ALB → Target Group → EC2 Fleet
```

**Implementation:**

```bash
# Create ALBs in multiple regions
# us-east-1
ALB_US=$(aws elbv2 create-load-balancer \
    --name global-app-alb \
    --subnets $US_SUBNETS \
    --security-groups $US_SG \
    --region us-east-1 \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# eu-west-1
ALB_EU=$(aws elbv2 create-load-balancer \
    --name global-app-alb \
    --subnets $EU_SUBNETS \
    --security-groups $EU_SG \
    --region eu-west-1 \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# Create Route 53 health checks for each ALB
US_HEALTH_CHECK=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        FullyQualifiedDomainName=$ALB_US,\
        Port=443,\
        ResourcePath=/health,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

EU_HEALTH_CHECK=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        FullyQualifiedDomainName=$ALB_EU,\
        Port=443,\
        ResourcePath=/health,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

# Create Route 53 records with latency-based routing
aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch file://multi-region-records.json

# multi-region-records.json
cat > multi-region-records.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "US-East-1",
        "Region": "us-east-1",
        "HealthCheckId": "$US_HEALTH_CHECK",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$ALB_US",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "EU-West-1",
        "Region": "eu-west-1",
        "HealthCheckId": "$EU_HEALTH_CHECK",
        "AliasTarget": {
          "HostedZoneId": "Z32O12XQLNTSW2",
          "DNSName": "$ALB_EU",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF
```

**Routing Policies:**

**1. Latency-Based (Best Performance):**
Routes users to region with lowest latency.

**2. Geoproximity (Geographic Control):**
Routes based on geographic location with bias adjustment.

**3. Failover (Active-Passive DR):**
Primary region handles traffic, secondary takes over on failure.

**4. Weighted (Traffic Distribution):**
Split traffic across regions (e.g., 80% US, 20% EU for testing).

### Advanced Health Check Patterns

**Custom Health Check Endpoint:**

```python
# health_check_endpoint.py
from flask import Flask, jsonify
import redis
import psycopg2
import requests
from datetime import datetime

app = Flask(__name__)

@app.route('/health/liveness')
def liveness():
    """
    Liveness check: Is the application running?
    Used by: Kubernetes, container orchestration
    """
    return jsonify({'status': 'alive'}), 200

@app.route('/health/readiness')
def readiness():
    """
    Readiness check: Is the application ready to serve traffic?
    Used by: Load balancers
    """
    checks = {}
    all_healthy = True
    
    # Check database connection
    try:
        conn = psycopg2.connect(
            host='db.example.com',
            database='myapp',
            timeout=2
        )
        conn.close()
        checks['database'] = 'healthy'
    except Exception as e:
        checks['database'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check Redis cache
    try:
        r = redis.Redis(host='cache.example.com', socket_timeout=2)
        r.ping()
        checks['cache'] = 'healthy'
    except Exception as e:
        checks['cache'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check disk space
    import shutil
    disk = shutil.disk_usage('/')
    free_percent = (disk.free / disk.total) * 100
    if free_percent < 10:
        checks['disk'] = f'unhealthy: only {free_percent:.1f}% free'
        all_healthy = False
    else:
        checks['disk'] = f'healthy: {free_percent:.1f}% free'
    
    # Check dependent services
    try:
        response = requests.get('http://api.example.com/health', timeout=2)
        if response.status_code == 200:
            checks['api_dependency'] = 'healthy'
        else:
            checks['api_dependency'] = f'unhealthy: status {response.status_code}'
            all_healthy = False
    except Exception as e:
        checks['api_dependency'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': checks
    }), status_code

@app.route('/health/startup')
def startup():
    """
    Startup check: Has the application completed initialization?
    Used by: Container platforms during startup
    """
    # Check if application has loaded configuration, connected to services
    # Return 200 only after initialization complete
    return jsonify({'status': 'started'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

**Health Check Strategy:**


| Check Type | Endpoint | Use Case | Threshold |
| :-- | :-- | :-- | :-- |
| **Shallow** | `/health` | Quick aliveness check | 2 successes |
| **Deep** | `/health/readiness` | Check dependencies | 3 successes |
| **Startup** | `/health/startup` | Initial boot | 10 successes |

### DDoS Protection and Security

**AWS Shield Integration:**

```bash
# Shield Standard is automatically enabled (free)
# For advanced protection, enable Shield Advanced

# Enable Shield Advanced on ALB
aws shield subscribe-to-shield-advanced

aws shield create-protection \
    --name production-alb-protection \
    --resource-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/production-alb/1234567890abcdef

# Create DDoS response team (DRT) access
aws shield associate-drt-role \
    --role-arn arn:aws:iam::123456789012:role/ShieldDRTRole

# Configure health-based detection
aws shield update-emergency-contact-settings \
    --emergency-contact-list \
        EmailAddress=security@example.com,PhoneNumber=+1234567890 \
        EmailAddress=ops@example.com,PhoneNumber=+1234567891
```

**WAF Integration for Layer 7 Protection:**

```bash
# Create Web ACL
WAF_ACL_ARN=$(aws wafv2 create-web-acl \
    --name production-web-acl \
    --scope REGIONAL \
    --default-action Allow={} \
    --rules file://waf-rules.json \
    --visibility-config \
        SampledRequestsEnabled=true,\
        CloudWatchMetricsEnabled=true,\
        MetricName=ProductionWebACL \
    --query 'Summary.ARN' \
    --output text)

# Associate WAF with ALB
aws wafv2 associate-web-acl \
    --web-acl-arn $WAF_ACL_ARN \
    --resource-arn $ALB_ARN

# waf-rules.json
cat > waf-rules.json <<'EOF'
[
  {
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": {"Block": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitRule"
    }
  },
  {
    "Name": "GeoBlockRule",
    "Priority": 2,
    "Statement": {
      "GeoMatchStatement": {
        "CountryCodes": ["CN", "RU", "KP"]
      }
    },
    "Action": {"Block": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "GeoBlockRule"
    }
  },
  {
    "Name": "SQLiProtection",
    "Priority": 3,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesSQLiRuleSet"
      }
    },
    "OverrideAction": {"None": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "SQLiProtection"
    }
  }
]
EOF
```

**Rate Limiting at ALB:**

```python
#!/usr/bin/env python3
# rate_limiting_lambda.py
# Lambda@Edge or CloudFront Function for rate limiting

import json
import hashlib
import time
from collections import defaultdict

# In-memory rate limit tracker (use ElastiCache for production)
rate_limits = defaultdict(list)
RATE_LIMIT = 100  # requests
TIME_WINDOW = 60  # seconds

def lambda_handler(event, context):
    """
    Rate limit requests based on client IP
    """
    
    request = event['Records'][0]['cf']['request']
    client_ip = request['clientIp']
    
    current_time = time.time()
    
    # Clean old entries
    rate_limits[client_ip] = [
        timestamp for timestamp in rate_limits[client_ip]
        if current_time - timestamp < TIME_WINDOW
    ]
    
    # Check rate limit
    if len(rate_limits[client_ip]) >= RATE_LIMIT:
        # Rate limit exceeded
        return {
            'status': '429',
            'statusDescription': 'Too Many Requests',
            'headers': {
                'content-type': [{'key': 'Content-Type', 'value': 'text/plain'}],
                'retry-after': [{'key': 'Retry-After', 'value': str(TIME_WINDOW)}]
            },
            'body': 'Rate limit exceeded. Please try again later.'
        }
    
    # Add current request
    rate_limits[client_ip].append(current_time)
    
    # Allow request
    return request
```


### Access Logs and Analysis

**Enable Access Logs:**

```bash
# Create S3 bucket for logs
aws s3 mb s3://my-alb-access-logs

# Configure bucket policy
cat > bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::127311923021:root"
    },
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::my-alb-access-logs/*"
  }]
}
EOF

aws s3api put-bucket-policy \
    --bucket my-alb-access-logs \
    --policy file://bucket-policy.json

# Enable access logs on ALB
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes \
        Key=access_logs.s3.enabled,Value=true \
        Key=access_logs.s3.bucket,Value=my-alb-access-logs \
        Key=access_logs.s3.prefix,Value=production-alb
```

**Analyze Access Logs with Athena:**

```sql
-- Create Athena table for ALB logs
CREATE EXTERNAL TABLE IF NOT EXISTS alb_logs (
    type string,
    time string,
    elb string,
    client_ip string,
    client_port int,
    target_ip string,
    target_port int,
    request_processing_time double,
    target_processing_time double,
    response_processing_time double,
    elb_status_code string,
    target_status_code string,
    received_bytes bigint,
    sent_bytes bigint,
    request_verb string,
    request_url string,
    request_proto string,
    user_agent string,
    ssl_cipher string,
    ssl_protocol string,
    target_group_arn string,
    trace_id string,
    domain_name string,
    chosen_cert_arn string,
    matched_rule_priority string,
    request_creation_time string,
    actions_executed string,
    redirect_url string,
    lambda_error_reason string,
    target_port_list string,
    target_status_code_list string,
    classification string,
    classification_reason string
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
WITH SERDEPROPERTIES (
'serialization.format' = '1',
'input.regex' = 
'([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) ([^ ]*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\s]+?)\" \"([^\s]+)\" \"([^ ]*)\" \"([^ ]*)\"')
LOCATION 's3://my-alb-access-logs/production-alb/AWSLogs/123456789012/elasticloadbalancing/us-east-1/';

-- Query: Top 10 client IPs by request count
SELECT client_ip, COUNT(*) as request_count
FROM alb_logs
WHERE parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z') 
    BETWEEN parse_datetime('2025-01-01-00:00:00','yyyy-MM-dd-HH:mm:ss')
    AND parse_datetime('2025-01-15-23:59:59','yyyy-MM-dd-HH:mm:ss')
GROUP BY client_ip
ORDER BY request_count DESC
LIMIT 10;

-- Query: Average response time by target
SELECT target_ip, 
       AVG(target_processing_time) as avg_response_time,
       COUNT(*) as request_count
FROM alb_logs
WHERE target_processing_time > 0
GROUP BY target_ip
ORDER BY avg_response_time DESC;

-- Query: 5XX errors by URL
SELECT request_url, 
       elb_status_code,
       COUNT(*) as error_count
FROM alb_logs
WHERE elb_status_code LIKE '5%'
GROUP BY request_url, elb_status_code
ORDER BY error_count DESC
LIMIT 20;

-- Query: Slow requests (>1 second)
SELECT client_ip, 
       request_url,
       target_processing_time,
       time
FROM alb_logs
WHERE target_processing_time > 1.0
ORDER BY target_processing_time DESC
LIMIT 100;

-- Query: Request rate over time (5-minute intervals)
SELECT date_trunc('minute', parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z')) as time_bucket,
       COUNT(*) / 5 as requests_per_second
FROM alb_logs
GROUP BY date_trunc('minute', parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z'))
ORDER BY time_bucket;
```


### Connection Pooling and Keep-Alive

**Backend Keep-Alive Configuration:**

```nginx
# Nginx backend configuration
upstream backend {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
    
    keepalive 32;  # Keep 32 connections to backend
    keepalive_timeout 60s;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # Remove Connection header for keep-alive
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Application Server Configuration:**

```python
# Gunicorn configuration for efficient connection handling
import multiprocessing

# Server socket
bind = "0.0.0.0:8080"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"  # or "eventlet" for async
worker_connections = 1000
max_requests = 10000
max_requests_jitter = 1000

# Keep-alive
keepalive = 5  # seconds

# Timeouts
timeout = 30
graceful_timeout = 30

# Logging
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"
```


### Blue-Green and Canary Deployments

**Blue-Green Deployment with Weighted Target Groups:**

```python
#!/usr/bin/env python3
# blue_green_deployment.py

import boto3
import time

elbv2 = boto3.client('elbv2')

def blue_green_deployment(listener_arn, blue_tg_arn, green_tg_arn):
    """
    Perform blue-green deployment by switching target groups
    """
    
    print("Starting blue-green deployment...")
    
    # Step 1: Verify green environment health
    print("Verifying green environment health...")
    green_health = check_target_group_health(green_tg_arn)
    
    if not green_health['all_healthy']:
        raise Exception(f"Green environment not healthy: {green_health}")
    
    print(f"✓ Green environment healthy: {green_health['healthy_count']} targets")
    
    # Step 2: Switch traffic to green
    print("Switching traffic to green environment...")
    elbv2.modify_listener(
        ListenerArn=listener_arn,
        DefaultActions=[{
            'Type': 'forward',
            'TargetGroupArn': green_tg_arn
        }]
    )
    
    print("✓ Traffic switched to green")
    
    # Step 3: Monitor for issues
    print("Monitoring for issues (5 minutes)...")
    time.sleep(300)
    
    # Check metrics
    green_errors = check_target_group_errors(green_tg_arn)
    
    if green_errors['error_rate'] > 1.0:  # More than 1% errors
        print("❌ High error rate detected, rolling back...")
        rollback(listener_arn, blue_tg_arn)
        raise Exception(f"Deployment failed: {green_errors['error_rate']}% error rate")
    
    print(f"✓ Deployment successful. Error rate: {green_errors['error_rate']}%")
    
    # Step 4: Blue environment can now be decommissioned or updated
    print("Blue environment can be updated for next deployment")
    
    return True

def check_target_group_health(target_group_arn):
    """Check if all targets in group are healthy"""
    
    response = elbv2.describe_target_health(
        TargetGroupArn=target_group_arn
    )
    
    total = len(response['TargetHealthDescriptions'])
    healthy = sum(1 for t in response['TargetHealthDescriptions'] 
                  if t['TargetHealth']['State'] == 'healthy')
    
    return {
        'all_healthy': total == healthy,
        'healthy_count': healthy,
        'total_count': total
    }

def check_target_group_errors(target_group_arn):
    """Check error rate for target group"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get 5XX errors
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='HTTPCode_Target_5XX_Count',
        Dimensions=[{
            'Name': 'TargetGroup',
            'Value': target_group_arn.split(':')[-1]
        }],
        StartTime=time.time() - 300,
        EndTime=time.time(),
        Period=300,
        Statistics=['Sum']
    )
    
    errors = sum(dp['Sum'] for dp in response['Datapoints'])
    
    # Get total requests
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='RequestCount',
        Dimensions=[{
            'Name': 'TargetGroup',
            'Value': target_group_arn.split(':')[-1]
        }],
        StartTime=time.time() - 300,
        EndTime=time.time(),
        Period=300,
        Statistics=['Sum']
    )
    
    total = sum(dp['Sum'] for dp in response['Datapoints'])
    error_rate = (errors / total * 100) if total > 0 else 0
    
    return {'error_rate': error_rate, 'total_requests': total}

def rollback(listener_arn, blue_tg_arn):
    """Rollback to blue environment"""
    
    print("Rolling back to blue environment...")
    elbv2.modify_listener(
        ListenerArn=listener_arn,
        DefaultActions=[{
            'Type': 'forward',
            'TargetGroupArn': blue_tg_arn
        }]
    )
    print("✓ Rolled back to blue")
```

**Canary Deployment with Weighted Routing:**

```python
#!/usr/bin/env python3
# canary_deployment.py

import boto3
import time

def canary_deployment(listener_arn, rule_priority, stable_tg_arn, canary_tg_arn):
    """
    Gradual canary deployment with automatic rollback on errors
    """
    
    elbv2 = boto3.client('elbv2')
    
    # Canary stages: 5% → 25% → 50% → 100%
    stages = [
        {'canary_weight': 5, 'stable_weight': 95, 'duration': 300},   # 5 minutes
        {'canary_weight': 25, 'stable_weight': 75, 'duration': 600},  # 10 minutes
        {'canary_weight': 50, 'stable_weight': 50, 'duration': 900},  # 15 minutes
        {'canary_weight': 100, 'stable_weight': 0, 'duration': 0}     # Full rollout
    ]
    
    for stage in stages:
        print(f"\nCanary stage: {stage['canary_weight']}% canary, {stage['stable_weight']}% stable")
        
        # Update rule with weighted target groups
        elbv2.modify_rule(
            RuleArn=get_rule_arn(listener_arn, rule_priority),
            Actions=[{
                'Type': 'forward',
                'ForwardConfig': {
                    'TargetGroups': [
                        {
                            'TargetGroupArn': canary_tg_arn,
                            'Weight': stage['canary_weight']
                        },
                        {
                            'TargetGroupArn': stable_tg_arn,
                            'Weight': stage['stable_weight']
                        }
                    ],
                    'TargetGroupStickinessConfig': {
                        'Enabled': True,
                        'DurationSeconds': 3600
                    }
                }
            }]
        )
        
        print(f"✓ Updated weights")
        
        if stage['duration'] > 0:
            print(f"Monitoring for {stage['duration']} seconds...")
            time.sleep(stage['duration'])
            
            # Check canary health
            errors = check_target_group_errors(canary_tg_arn)
            
            if errors['error_rate'] > 2.0:  # More than 2% errors
                print(f"❌ Canary error rate too high: {errors['error_rate']}%")
                print("Rolling back to stable version...")
                
                # Rollback: 100% to stable
                elbv2.modify_rule(
                    RuleArn=get_rule_arn(listener_arn, rule_priority),
                    Actions=[{
                        'Type': 'forward',
                        'TargetGroupArn': stable_tg_arn
                    }]
                )
                
                raise Exception(f"Canary deployment failed at {stage['canary_weight']}%")
            
            print(f"✓ Canary healthy. Error rate: {errors['error_rate']}%")
    
    print("\n✓ Canary deployment completed successfully")
    return True

def get_rule_arn(listener_arn, priority):
    """Get rule ARN by priority"""
    elbv2 = boto3.client('elbv2')
    
    rules = elbv2.describe_rules(ListenerArn=listener_arn)
    
    for rule in rules['Rules']:
        if rule.get('Priority') == str(priority):
            return rule['RuleArn']
    
    raise Exception(f"Rule with priority {priority} not found")
```


## Tips \& Best Practices

### Health Check Configuration Tips

**Tip 1: Use Dedicated Health Check Endpoints**

Don't use the application root:

```python
# Bad - Heavy operation on every health check
@app.route('/')
def index():
    # Complex database queries
    # External API calls
    return render_template('index.html')

# Good - Lightweight health check
@app.route('/health')
def health():
    # Quick check only
    return 'OK', 200

# Better - Deep health check with caching
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/health')
@cache.cached(timeout=10)  # Cache for 10 seconds
def health():
    checks = {
        'database': check_db(),
        'cache': check_cache()
    }
    if all(checks.values()):
        return jsonify(checks), 200
    return jsonify(checks), 503
```

**Tip 2: Match Health Check Interval to Application Startup Time**

```
Application startup time: 60 seconds
Health check interval: 30 seconds
Healthy threshold: 2

Time to become healthy: 30 × 2 = 60 seconds minimum
Total time for instance to serve traffic: 60 (startup) + 60 (health checks) = 120 seconds

Recommendation: Consider slow_start mode for gradual ramp-up
```

**Tip 3: Use Different Health Checks for Liveness vs Readiness**

```bash
# Liveness check: Is the process running?
aws elbv2 create-target-group \
    --health-check-path /health/live \
    --health-check-interval-seconds 30

# Readiness check: Can it handle traffic?
# (For Kubernetes/ECS, not direct ALB feature)
```


### Performance Optimization Tips

**Tip 4: Enable HTTP/2 for Better Performance**

```bash
# HTTP/2 provides:
# - Multiplexing (multiple requests over single connection)
# - Header compression
# - Server push capability

aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes Key=routing.http2.enabled,Value=true
```

**Tip 5: Use Connection Multiplexing**

Configure backend servers to handle multiple requests per connection:

```python
# gunicorn.conf.py
workers = 4
worker_class = "gevent"
worker_connections = 1000
keepalive = 5

# This allows:
# - 4 workers × 1000 connections = 4000 concurrent connections
# - Reuse connections for multiple requests
```

**Tip 6: Optimize Deregistration Delay**

```bash
# For stateless APIs (no long requests)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=30

# For long-polling or WebSocket
aws elbv2 modify-target-group-attributes \
    --target-group-arn $TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=300
```


### Cost Optimization Tips

**Tip 7: Minimize Cross-Zone Data Transfer**

```bash
# For ALB: Cross-zone enabled by default (with charges)
# Disable if traffic naturally balanced and you want to save costs

# For NLB: Cross-zone disabled by default (no charges when enabled)
# Enable for better load distribution
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true
```

**Tip 8: Use NLB for Static IP Requirements (Save on NAT Gateway)**

```
Scenario: Need to whitelist IPs at partner firewall

Option 1: NAT Gateway + ALB
- 3 NAT Gateways: $97.20/month + data charges
- 1 ALB: $16.43/month + LCU charges
- Total: ~$130+/month

Option 2: NLB with Elastic IPs
- 1 NLB: $16.43/month + NLCU charges
- No NAT Gateway needed for static IPs
- Total: ~$20-40/month

Savings: ~$90/month
```

**Tip 9: Right-Size LCU Usage**

```bash
# Monitor LCU usage
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name ConsumedLCUs \
    --dimensions Name=LoadBalancer,Value=app/my-alb/1234567890abcdef \
    --start-time 2025-01-01T00:00:00Z \
    --end-time 2025-01-15T23:59:59Z \
    --period 3600 \
    --statistics Maximum

# Optimize:
# - Reduce rule complexity
# - Consolidate target groups
# - Use path-based routing instead of header-based when possible
```


### Security Tips

**Tip 10: Always Use HTTPS with HTTP Redirect**

```bash
# Create HTTP listener that redirects to HTTPS
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }'
```

**Tip 11: Implement Security Headers**

```nginx
# Add security headers at backend
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

**Tip 12: Use WAF for Application-Layer Protection**

```bash
# Essential WAF rules:
# 1. Rate limiting
# 2. SQL injection protection
# 3. XSS protection
# 4. Geographic blocking (if applicable)
# 5. Known bad inputs (AWS Managed Rules)

# Cost: ~$5-10/month + $1 per million requests
# Value: Prevents attacks, reduces incident response costs
```


### Monitoring Tips

**Tip 13: Set Up Comprehensive Alarms**

```bash
# Critical alarms for production:
# 1. Unhealthy host count > 0
# 2. 5XX error rate > 1%
# 3. Response time p99 > 3 seconds
# 4. Target connection errors > 10/minute
# 5. Rejected connection count > 0

# Create alarm dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ALB-Production-Health \
    --dashboard-body file://dashboard.json
```

**Tip 14: Use Target-Level Metrics**

```bash
# Monitor individual targets, not just aggregate
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions \
        Name=TargetGroup,Value=targetgroup/my-tg/1234567890abcdef \
        Name=AvailabilityZone,Value=us-east-1a \
    --start-time 2025-01-15T00:00:00Z \
    --end-time 2025-01-15T23:59:59Z \
    --period 300 \
    --statistics Average,Maximum,p99
```

**Tip 15: Enable Access Logs for Forensics**

```bash
# Access logs are invaluable for:
# - Security incident investigation
# - Performance troubleshooting
# - User behavior analysis
# - Compliance auditing

# Cost: S3 storage only (~$0.023/GB)
# Enable for all production load balancers
```


## Pitfalls \& Remedies

### Pitfall 1: Incorrect Health Check Configuration

**Problem:** Health checks mark healthy instances as unhealthy or vice versa, causing traffic routing issues.

**Why It Happens:**

- Health check path doesn't exist or returns wrong status code
- Timeout too short for application response time
- Thresholds too aggressive or too lenient
- Health check doesn't verify actual application health

**Impact:**

- Healthy instances marked unhealthy → reduced capacity
- Unhealthy instances marked healthy → errors sent to users
- Flapping instances (healthy/unhealthy cycling)
- False alarms and alert fatigue

**Example:**

```
Health Check Configuration:
- Path: /
- Interval: 5 seconds
- Timeout: 2 seconds
- Healthy threshold: 2
- Unhealthy threshold: 2

Problem:
- / endpoint does heavy database query (takes 3-5 seconds)
- Health checks timeout after 2 seconds
- Instance marked unhealthy even though it's serving traffic fine
```

**Remedy:**

**Step 1: Create Dedicated Health Check Endpoint**

```python
# health_endpoint.py
from flask import Flask, jsonify
import time

app = Flask(__name__)

# Bad health check (uses production endpoint)
@app.route('/')
def index():
    # Complex operation
    data = fetch_from_database()  # Takes 3 seconds
    process_data(data)            # Takes 2 seconds
    return render_template('index.html')

# Good health check (lightweight)
@app.route('/health')
def health():
    return 'OK', 200

# Better health check (verifies dependencies with timeout)
@app.route('/health/ready')
def health_ready():
    checks = {}
    start_time = time.time()
    
    # Check with timeout
    try:
        # Quick database ping (not full query)
        db_start = time.time()
        db.execute('SELECT 1').fetchone()
        checks['database'] = {
            'status': 'healthy',
            'response_time': time.time() - db_start
        }
    except Exception as e:
        checks['database'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        return jsonify(checks), 503
    
    # Return within health check timeout
    if time.time() - start_time > 1.5:  # Safety margin
        return jsonify({'status': 'timeout'}), 503
    
    return jsonify({'status': 'healthy', 'checks': checks}), 200
```

**Step 2: Configure Appropriate Health Check Parameters**

```bash
# For fast APIs (< 100ms response time)
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 10 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --matcher HttpCode=200

# For slower applications (databases, processing)
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 3 \
    --unhealthy-threshold-count 3

# For applications with slow startup
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 5  # Wait longer before marking healthy
```

**Step 3: Test Health Check Locally**

```bash
# Test health check response
curl -v http://your-instance:8080/health

# Check response time
time curl http://your-instance:8080/health

# Test from load balancer subnet
aws ssm start-session --target i-1234567890abcdef0
curl -v http://10.0.1.10:8080/health
```

**Step 4: Monitor Health Check Failures**

```python
#!/usr/bin/env python3
# monitor_health_check_failures.py

import boto3
from datetime import datetime, timedelta

def analyze_health_check_failures(target_group_arn):
    """
    Analyze health check failures to identify issues
    """
    
    elbv2 = boto3.client('elbv2')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get current target health
    health = elbv2.describe_target_health(
        TargetGroupArn=target_group_arn
    )
    
    unhealthy_targets = [
        t for t in health['TargetHealthDescriptions']
        if t['TargetHealth']['State'] != 'healthy'
    ]
    
    if unhealthy_targets:
        print(f"Found {len(unhealthy_targets)} unhealthy targets:\n")
        
        for target in unhealthy_targets:
            target_id = target['Target']['Id']
            state = target['TargetHealth']['State']
            reason = target['TargetHealth'].get('Reason', 'Unknown')
            description = target['TargetHealth'].get('Description', '')
            
            print(f"Target: {target_id}")
            print(f"  State: {state}")
            print(f"  Reason: {reason}")
            print(f"  Description: {description}")
            
            # Get recent health check metrics
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=1)
            
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/ApplicationELB',
                MetricName='HealthyHostCount',
                Dimensions=[
                    {'Name': 'TargetGroup', 'Value': target_group_arn.split(':')[-1]},
                    {'Name': 'AvailabilityZone', 'Value': target['Target'].get('AvailabilityZone', 'unknown')}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=60,
                Statistics=['Average']
            )
            
            print(f"  Recent health status: {response['Datapoints'][-5:] if response['Datapoints'] else 'No data'}")
            print()
    else:
        print("✓ All targets healthy")

# Run analysis
analyze_health_check_failures('arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/1234567890abcdef')
```

**Prevention:**

- Always create dedicated `/health` endpoints
- Test health checks before deployment
- Match timeout to actual response time + buffer
- Use appropriate thresholds for application startup time
- Monitor health check failures continuously

***

### Pitfall 2: Not Configuring Connection Draining Properly

**Problem:** In-flight requests interrupted when targets are deregistered, causing errors for end users.

**Why It Happens:**

- Using default deregistration delay without consideration
- Not understanding application request patterns
- Aggressive timeouts to speed up deployments
- No testing of graceful shutdown

**Impact:**

- 502/504 errors during deployments
- Incomplete transactions
- Poor user experience
- Data inconsistency

**Remedy:**

**Step 1: Analyze Request Duration**

```python
#!/usr/bin/env python3
# analyze_request_duration.py

import boto3
from datetime import datetime, timedelta

def analyze_request_duration(alb_log_bucket, alb_log_prefix):
    """
    Analyze ALB access logs to determine appropriate deregistration delay
    """
    
    s3 = boto3.client('s3')
    
    # Download recent access logs
    response = s3.list_objects_v2(
        Bucket=alb_log_bucket,
        Prefix=alb_log_prefix,
        MaxKeys=100
    )
    
    request_durations = []
    
    for obj in response.get('Contents', []):
        # Parse access log
        log_data = s3.get_object(Bucket=alb_log_bucket, Key=obj['Key'])
        
        for line in log_data['Body'].read().decode('utf-8').splitlines():
            parts = line.split()
            if len(parts) > 9:
                # Extract processing times
                request_time = float(parts[7])
                target_time = float(parts[8])
                response_time = float(parts[9])
                
                total_time = request_time + target_time + response_time
                request_durations.append(total_time)
    
    if request_durations:
        request_durations.sort()
        p95 = request_durations[int(len(request_durations) * 0.95)]
        p99 = request_durations[int(len(request_durations) * 0.99)]
        max_duration = max(request_durations)
        
        print("Request Duration Analysis:")
        print(f"  P95: {p95:.2f} seconds")
        print(f"  P99: {p99:.2f} seconds")
        print(f"  Max: {max_duration:.2f} seconds")
        print(f"\nRecommended deregistration delay: {int(p99 * 1.5)} seconds")
        
        return int(p99 * 1.5)
    
    return 300  # Default 5 minutes

# Usage
recommended_delay = analyze_request_duration('my-alb-logs', 'production-alb/')
```

**Step 2: Configure Deregistration Delay Based on Workload**

```bash
# API with quick requests (< 5 seconds)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=30

# File upload/download service (long requests)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $UPLOAD_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=900

# WebSocket connections
aws elbv2 modify-target-group-attributes \
    --target-group-arn $WEBSOCKET_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=3600

# Background job processor (longest)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $JOBS_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=3600
```

**Step 3: Implement Graceful Shutdown in Application**

```python
# app.py with graceful shutdown
import signal
import sys
import threading
import time

class GracefulShutdown:
    def __init__(self):
        self.shutdown_event = threading.Event()
        self.active_requests = 0
        self.lock = threading.Lock()
        
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)
    
    def handle_signal(self, signum, frame):
        print(f"Received signal {signum}, starting graceful shutdown...")
        self.shutdown_event.set()
        
        # Stop health check endpoint
        self.mark_unhealthy()
        
        # Wait for active requests to complete
        print(f"Waiting for {self.active_requests} active requests...")
        while self.active_requests > 0:
            time.sleep(1)
        
        print("All requests completed, shutting down")
        sys.exit(0)
    
    def mark_unhealthy(self):
        """Mark health check as unhealthy"""
        global health_check_status
        health_check_status = False
    
    def request_started(self):
        with self.lock:
            self.active_requests += 1
    
    def request_completed(self):
        with self.lock:
            self.active_requests -= 1

# Use in Flask
from flask import Flask
app = Flask(__name__)
shutdown_handler = GracefulShutdown()
health_check_status = True

@app.before_request
def before_request():
    shutdown_handler.request_started()

@app.after_request
def after_request(response):
    shutdown_handler.request_completed()
    return response

@app.route('/health')
def health():
    if health_check_status:
        return 'OK', 200
    else:
        return 'Shutting down', 503
```

**Step 4: Test Graceful Shutdown**

```bash
# Deploy new version and monitor for errors
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 5  # Scale up

# Wait for new instances
sleep 120

# Scale down old instances
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 3

# Monitor for 502/504 errors
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --dimensions Name=LoadBalancer,Value=$ALB_NAME \
    --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Sum
```

**Prevention:**

- Analyze actual request duration patterns
- Configure deregistration delay appropriately
- Implement graceful shutdown in applications
- Test deployment process regularly
- Monitor 502/504 errors during deployments

***

### Pitfall 3: Cross-Zone Load Balancing Misconceptions

**Problem:** Misunderstanding cross-zone load balancing behavior, leading to uneven load distribution or unexpected data transfer costs.

**Why It Happens:**

- Different defaults for ALB vs NLB
- Not understanding data transfer cost implications
- Assuming load balancer automatically distributes evenly
- Uneven instance distribution across AZs

**Impact:**

- Uneven load distribution across targets
- Higher data transfer costs
- Unexpected AWS bills
- Poor resource utilization

**Example:**

```
Configuration:
- ALB with cross-zone enabled (default)
- AZ-1: 2 instances
- AZ-2: 8 instances

Without cross-zone:
- AZ-1 instances: 50% of AZ-1 traffic each (25% total each)
- AZ-2 instances: 12.5% of AZ-2 traffic each (6.25% total each)
- Uneven!

With cross-zone:
- Each instance: 10% of total traffic (even distribution)
- But: Cross-AZ data transfer charges apply
```

**Remedy:**

**Step 1: Understand Default Behavior**

```bash
# Check current cross-zone setting
aws elbv2 describe-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --query 'Attributes[?Key==`load_balancing.cross_zone.enabled`]'

# ALB: Enabled by default (can't be disabled at load balancer level)
# NLB: Disabled by default (can be enabled)
# CLB: Disabled by default (can be enabled)
```

**Step 2: Calculate Cost Impact**

```python
#!/usr/bin/env python3
# calculate_cross_zone_cost.py

def calculate_cross_zone_cost(monthly_traffic_gb, instances_per_az):
    """
    Calculate cost difference with/without cross-zone load balancing
    """
    
    cross_az_transfer_cost = 0.01  # $0.01 per GB
    
    # Calculate average cross-AZ traffic
    total_instances = sum(instances_per_az.values())
    
    # With cross-zone: traffic distributed evenly
    # Some traffic will cross AZs
    cross_az_traffic = 0
    
    for az, count in instances_per_az.items():
        # Traffic coming from other AZs
        other_az_instances = total_instances - count
        proportion_from_other_az = other_az_instances / total_instances
        
        # Traffic this AZ receives from other AZs
        traffic_from_other_az = monthly_traffic_gb * proportion_from_other_az
        cross_az_traffic += traffic_from_other_az
    
    cross_zone_cost = cross_az_traffic * cross_az_transfer_cost
    
    print("Cross-Zone Load Balancing Cost Analysis:")
    print(f"  Monthly traffic: {monthly_traffic_gb} GB")
    print(f"  Instance distribution: {instances_per_az}")
    print(f"  Cross-AZ traffic: {cross_az_traffic:.2f} GB")
    print(f"  Cross-AZ transfer cost: ${cross_zone_cost:.2f}/month")
    
    # Without cross-zone (uneven distribution)
    print(f"\n  Without cross-zone:")
    print(f"    Cost: $0 (no cross-AZ transfer)")
    print(f"    But: Uneven load distribution")
    
    return cross_zone_cost

# Example
cost = calculate_cross_zone_cost(
    monthly_traffic_gb=1000,  # 1 TB
    instances_per_az={'us-east-1a': 3, 'us-east-1b': 5, 'us-east-1c': 2}
)
# Output: ~$6-8/month additional cost for even distribution
```

**Step 3: Optimize Instance Distribution**

```bash
# For Auto Scaling Groups, balance instances across AZs
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name balanced-asg \
    --vpc-zone-identifier "$SUBNET_1A,$SUBNET_1B,$SUBNET_1C" \
    --min-size 6 \
    --max-size 12 \
    --desired-capacity 9 \
    --capacity-rebalance  # Proactively replace impaired instances

# With 9 instances across 3 AZs = 3 per AZ (balanced)
```

**Step 4: Enable/Disable Cross-Zone Based on Requirements**

```bash
# For NLB: Enable if you want even distribution
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true

# Benefit: No data transfer charges for NLB cross-zone
# (Unlike ALB where charges apply)

# For ALB: Cross-zone always evaluates all targets
# To minimize costs with uneven distribution:
# Option 1: Keep instances balanced across AZs
# Option 2: Accept the cost for better distribution
```

**Prevention:**

- Always balance instances across AZs
- Understand cost implications before enabling
- Monitor cross-AZ data transfer in Cost Explorer
- Use NLB when static IPs needed (free cross-zone)

***

### Summary of Key Pitfalls

| Pitfall | Impact | Quick Fix |
| :-- | :-- | :-- |
| Wrong health check config | Capacity reduction, errors | Dedicated `/health` endpoint |
| No connection draining | 502/504 errors | Set appropriate delay |
| Cross-zone misunderstanding | Uneven load, unexpected costs | Balance instances, understand costs |
| Missing SSL/TLS | Security vulnerabilities | Enable HTTPS with ACM |
| No access logs | Can't troubleshoot | Enable S3 access logs |
| Single AZ deployment | No high availability | Deploy across 3 AZs |

## Chapter Summary

Elastic Load Balancing is fundamental to building highly available, scalable applications in AWS. Understanding the differences between ALB, NLB, and GLB, configuring health checks properly, implementing SSL/TLS termination, and monitoring performance metrics are critical skills for Solutions Architects.

**Key Takeaways:**

- **Choose the right load balancer type:** ALB for HTTP/HTTPS with advanced routing, NLB for TCP/UDP or static IPs, GLB for network appliances
- **Health checks are critical:** Configure dedicated health check endpoints, appropriate timeouts, and thresholds that match application behavior
- **Implement graceful shutdowns:** Use deregistration delay and application-level graceful shutdown to prevent in-flight request errors
- **Enable SSL/TLS termination:** Offload encryption at load balancer, use ACM for certificate management, implement HTTP-to-HTTPS redirects
- **Cross-zone load balancing matters:** Understand cost implications, balance instances across AZs, enable for even distribution
- **Monitor comprehensively:** Enable access logs, create CloudWatch alarms for errors and performance, analyze metrics regularly
- **Security is layered:** Use WAF for application protection, Shield for DDoS, security groups for network access control

Understanding ELB deeply enables you to build resilient, performant, and cost-effective architectures. The load balancing patterns you've mastered will be essential as we explore container orchestration in upcoming chapters.

In Chapter 6, we'll explore Amazon ECS and containerized applications, where load balancers play a crucial role in service discovery and traffic distribution.

## Review Questions

1. **Which load balancer type operates at Layer 7 (Application Layer)?**
a) Network Load Balancer
b) Application Load Balancer
c) Gateway Load Balancer
d) Classic Load Balancer only

**Answer: B** - Application Load Balancer operates at Layer 7 (HTTP/HTTPS) and provides content-based routing.

2. **What is the default cross-zone load balancing behavior for ALB?**
a) Disabled
b) Enabled, with data transfer charges
c) Enabled, no charges
d) Must be manually configured

**Answer: B** - ALB has cross-zone enabled by default and charges for cross-AZ data transfer.

3. **Which load balancer provides static IP addresses?**
a) Application Load Balancer only
b) Network Load Balancer only
c) Both ALB and NLB
d) Neither

**Answer: B** - NLB provides one Elastic IP per Availability Zone for static IP requirements.

4. **What is the purpose of deregistration delay (connection draining)?**
a) Speed up deployments
b) Allow in-flight requests to complete before target removal
c) Reduce costs
d) Improve health check performance

**Answer: B** - Deregistration delay allows existing connections to complete before removing target from rotation.

5. **Which HTTP status code should a healthy target return for health checks?**
a) Any 2xx or 3xx code
b) Only 200
c) Only 200 or 301
d) Configured in matcher (default 200)

**Answer: D** - Health check success codes are configurable via the matcher parameter (default is 200).

6. **What is the maximum deregistration delay timeout?**
a) 300 seconds (5 minutes)
b) 900 seconds (15 minutes)
c) 3600 seconds (1 hour)
d) No limit

**Answer: C** - Maximum deregistration delay is 3600 seconds (1 hour).

7. **Which AWS service provides DDoS protection for load balancers?**
a) AWS WAF
b) AWS Shield
c) AWS GuardDuty
d) AWS Security Hub

**Answer: B** - AWS Shield provides DDoS protection (Standard free, Advanced paid).

8. **What is SNI (Server Name Indication) used for?**
a) Multiple SSL certificates on single load balancer
b) Faster SSL handshakes
c) Better security
d) Reduced costs

**Answer: A** - SNI allows hosting multiple SSL/TLS certificates on a single load balancer listener.

9. **Which load balancer type is required for PrivateLink?**
a) Application Load Balancer
b) Network Load Balancer
c) Gateway Load Balancer
d) Classic Load Balancer

**Answer: B** - PrivateLink requires Network Load Balancer for private service exposure.

10. **What does "sticky sessions" accomplish?**
a) Faster response times
b) Route user to same target for duration
c) Better security
d) Reduced costs

**Answer: B** - Sticky sessions route requests from same client to same target, maintaining session state.

11. **Which metric indicates targets are unhealthy?**
a) RequestCount
b) TargetResponseTime
c) UnHealthyHostCount
d) HTTPCode_5XX_Count

**Answer: C** - UnHealthyHostCount shows number of unhealthy targets.

12. **What is the minimum health check interval?**
a) 5 seconds (ALB/CLB), 10 seconds (NLB)
b) 10 seconds for all
c) 30 seconds for all
d) 1 second

**Answer: A** - ALB/CLB minimum is 5 seconds, NLB minimum is 10 seconds.

13. **Which load balancer type preserves source IP address by default?**
a) Application Load Balancer
b) Network Load Balancer
c) Gateway Load Balancer
d) Classic Load Balancer

**Answer: B** - NLB preserves client source IP, while ALB uses X-Forwarded-For header.

14. **What is the purpose of slow start mode?**
a) Save costs
b) Gradually ramp up traffic to new targets
c) Improve security
d) Reduce latency

**Answer: B** - Slow start gradually increases traffic to newly registered targets.

15. **Which statement about Gateway Load Balancer is TRUE?**
a) Routes HTTP/HTTPS traffic
b) Operates at Layer 7
c) Used for third-party virtual appliances
d) Cheapest load balancer option

**Answer: C** - GLB is specifically designed for deploying and scaling third-party network appliances.

***
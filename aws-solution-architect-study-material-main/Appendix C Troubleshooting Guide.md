# Appendix C: Troubleshooting Guide

## EC2 Troubleshooting

### Issue 1: Cannot Connect to EC2 Instance via SSH

```
SYMPTOM:
Connection timeout when attempting SSH to EC2 instance
Error: "ssh: connect to host X.X.X.X port 22: Operation timed out"

DIAGNOSTIC CHECKLIST:

□ Check Security Group
□ Check Network ACL
□ Verify Instance State
□ Check Route Table
□ Verify Key Pair
□ Check Instance Reachability

STEP-BY-STEP RESOLUTION:

1. VERIFY SECURITY GROUP RULES:

Check inbound rules allow SSH (port 22):
- Go to EC2 Console → Instances → Select instance
- Security tab → View security group
- Inbound rules should have:
  Type: SSH
  Protocol: TCP
  Port: 22
  Source: Your IP or 0.0.0.0/0

AWS CLI Command:
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'

Expected Output:
[
  {
    "FromPort": 22,
    "ToPort": 22,
    "IpProtocol": "tcp",
    "IpRanges": [{"CidrIp": "0.0.0.0/0"}]
  }
]

Fix: Add SSH rule if missing
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

2. CHECK NETWORK ACL:

Network ACLs are stateless (must allow both inbound and outbound)

Verify:
- Inbound: Allow TCP 22 from your IP
- Outbound: Allow TCP 1024-65535 (ephemeral ports) to your IP

AWS CLI Command:
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-xxxxx"

Default NACL allows all traffic:
Inbound: Rule 100: ALLOW ALL
Outbound: Rule 100: ALLOW ALL

Custom NACL may be blocking traffic

Fix: Ensure NACL rules allow SSH
- Rule 100: Inbound TCP 22 from 0.0.0.0/0 ALLOW
- Rule 100: Outbound TCP 1024-65535 to 0.0.0.0/0 ALLOW

3. VERIFY INSTANCE STATE:

Instance must be in "running" state

Check:
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[0].Instances[0].State.Name'

Expected: "running"

If "stopped": Start instance
aws ec2 start-instances --instance-ids i-xxxxx

4. CHECK PUBLIC IP/DNS:

Instance in public subnet needs public IP

Verify:
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[0].Instances[0].PublicIpAddress'

If null: Instance has no public IP

Fix: Associate Elastic IP
aws ec2 allocate-address --domain vpc
aws ec2 associate-address \
  --instance-id i-xxxxx \
  --allocation-id eipalloc-xxxxx

5. VERIFY ROUTE TABLE:

Public subnet must have route to Internet Gateway

Check route table:
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-xxxxx"

Expected route:
{
  "DestinationCidrBlock": "0.0.0.0/0",
  "GatewayId": "igw-xxxxx",
  "State": "active"
}

Fix: Add internet gateway route
aws ec2 create-route \
  --route-table-id rtb-xxxxx \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-xxxxx

6. CHECK INSTANCE REACHABILITY:

Use Instance Connect or Session Manager as alternative

Option A: EC2 Instance Connect (browser-based SSH)
- EC2 Console → Instances → Select → Connect
- Choose "EC2 Instance Connect"
- Click "Connect"

Option B: Systems Manager Session Manager (no SSH key needed)
- Requires SSM agent installed
- IAM role with AmazonSSMManagedInstanceCore policy
- EC2 Console → Instances → Select → Connect
- Choose "Session Manager"

COMMON ROOT CAUSES:

❌ Security group doesn't allow SSH from your IP
✓ Add inbound rule: SSH (TCP 22) from your IP

❌ Instance in private subnet without public IP
✓ Use bastion host or Systems Manager Session Manager

❌ Wrong SSH key pair
✓ Verify you're using correct .pem key

❌ Wrong username (ubuntu vs ec2-user vs admin)
✓ Amazon Linux: ec2-user
✓ Ubuntu: ubuntu
✓ Debian: admin

❌ Firewall on instance blocking SSH
✓ Check iptables: sudo iptables -L
✓ Temporarily disable: sudo iptables -F

PREVENTION:
✓ Use Systems Manager Session Manager (no SSH key management)
✓ Always tag security groups clearly
✓ Document security group rules
✓ Use bastion hosts for private instances
✓ Implement VPN for secure access
```


### Issue 2: EC2 Instance Unexpectedly Terminated

```
SYMPTOM:
EC2 instance terminated without manual intervention
Instance no longer appears in running instances

ROOT CAUSES & SOLUTIONS:

1. SPOT INSTANCE INTERRUPTION:

Cause: AWS reclaimed spot instance capacity

Check CloudWatch Logs:
aws ec2 describe-spot-instance-requests \
  --filters "Name=instance-id,Values=i-xxxxx"

Look for: "marked-for-stop" or "marked-for-termination"

Prevention:
✓ Use Spot Instance interruption notices (2-min warning)
✓ Implement graceful shutdown handling
✓ Use Spot Fleet with multiple instance types
✓ Mix Spot with On-Demand instances

2. AUTO SCALING SCALE-IN:

Cause: Auto Scaling Group scaled in to meet target capacity

Check Auto Scaling activity:
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name my-asg \
  --max-records 20

Look for: "Terminating EC2 instance: i-xxxxx"

Prevention:
✓ Set appropriate minimum capacity
✓ Use scale-in protection for critical instances
✓ Adjust scale-in cooldown period
✓ Use target tracking scaling policies

Enable scale-in protection:
aws autoscaling set-instance-protection \
  --instance-ids i-xxxxx \
  --auto-scaling-group-name my-asg \
  --protected-from-scale-in

3. INSTANCE HEALTH CHECK FAILURE:

Cause: Failed health checks (ELB or Auto Scaling)

Check ELB health:
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:...

Reasons for unhealthy:
- Application not responding on health check port
- Health check path returning non-200 status
- Instance security group blocking ELB

Fix health check:
- Verify application running: curl http://localhost/health
- Check health check settings (interval, timeout, threshold)
- Ensure security group allows ELB traffic

4. INSUFFICIENT INSTANCE CAPACITY:

Cause: AWS couldn't maintain instance in AZ

Check CloudTrail for error:
"Client.InsufficientInstanceCapacity"

Solution:
✓ Use multiple instance types (Auto Scaling)
✓ Spread across multiple AZs
✓ Request capacity reservation (guaranteed capacity)

5. BILLING ISSUE:

Cause: Payment method failed, account suspended

Check AWS Billing Console:
- Payment methods
- Outstanding balance
- Account status

Resolution:
- Update payment method
- Contact AWS Support
- Pay outstanding balance

6. INSTANCE LIMIT REACHED:

Cause: Hit service quota for instance type

Check quota:
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-1216C47A

Request increase:
aws service-quotas request-service-quota-increase \
  --service-code ec2 \
  --quota-code L-1216C47A \
  --desired-value 100

INVESTIGATION STEPS:

1. Check CloudTrail for termination event:
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=i-xxxxx \
  --max-results 10

2. Check Auto Scaling history:
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name my-asg

3. Check System Status:
aws ec2 describe-instance-status \
  --instance-ids i-xxxxx \
  --include-all-instances

4. Review CloudWatch Metrics:
- CPUUtilization (high = possible crash)
- StatusCheckFailed (system issues)

PREVENTION:
✓ Enable termination protection for critical instances
✓ Use CloudWatch alarms for instance status
✓ Implement SNS notifications for terminations
✓ Regular backups via AMIs or snapshots
✓ Document instance configurations (IaC)
```


## VPC Networking Troubleshooting

### Issue 3: Instance Cannot Access Internet

```
SYMPTOM:
EC2 instance in VPC cannot reach internet
Ping/curl to external sites timeout
Unable to install packages or download updates

DIAGNOSTIC CHECKLIST:

□ Instance in public or private subnet?
□ Route table has internet gateway route?
□ Security group allows outbound traffic?
□ Network ACL allows outbound traffic?
□ Instance has public IP (if public subnet)?
□ NAT Gateway configured (if private subnet)?

PUBLIC SUBNET TROUBLESHOOTING:

1. VERIFY INTERNET GATEWAY ATTACHED:

Check IGW:
aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-xxxxx"

Expected: IGW attached to VPC

Fix if missing:
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-xxxxx \
  --vpc-id vpc-xxxxx

2. CHECK ROUTE TABLE:

Route table must have route to IGW:
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-xxxxx"

Expected route:
Destination: 0.0.0.0/0
Target: igw-xxxxx

Fix if missing:
aws ec2 create-route \
  --route-table-id rtb-xxxxx \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-xxxxx

3. VERIFY PUBLIC IP:

Instance needs public IP for outbound internet:
aws ec2 describe-instances \
  --instance-ids i-xxxxx \
  --query 'Reservations[0].Instances[0].PublicIpAddress'

Fix if null:
- Allocate Elastic IP
- Associate with instance

4. CHECK SECURITY GROUP OUTBOUND:

Default: All outbound allowed
Custom: Verify outbound rules allow traffic

aws ec2 describe-security-groups \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissionsEgress'

Expected: Allow all outbound (0.0.0.0/0)

PRIVATE SUBNET TROUBLESHOOTING:

1. VERIFY NAT GATEWAY EXISTS:

Private instances need NAT Gateway for internet:
aws ec2 describe-nat-gateways \
  --filter "Name=subnet-id,Values=subnet-xxxxx"

Expected: NAT Gateway in public subnet

Create if missing:
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Create NAT Gateway
aws ec2 create-nat-gateway \
  --subnet-id subnet-public-xxxxx \
  --allocation-id eipalloc-xxxxx

2. CHECK ROUTE TABLE:

Private subnet route table must route to NAT:
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=subnet-private-xxxxx"

Expected route:
Destination: 0.0.0.0/0
Target: nat-xxxxx

Fix if missing:
aws ec2 create-route \
  --route-table-id rtb-private-xxxxx \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-xxxxx

3. VERIFY NAT GATEWAY STATUS:

NAT Gateway must be "available":
aws ec2 describe-nat-gateways \
  --nat-gateway-ids nat-xxxxx \
  --query 'NatGateways[0].State'

If "pending": Wait for availability
If "failed": Delete and recreate

NETWORK ACL TROUBLESHOOTING:

NACLs are stateless (check both inbound and outbound)

Check NACL:
aws ec2 describe-network-acls \
  --filters "Name=association.subnet-id,Values=subnet-xxxxx"

Required rules:
Outbound:
- Rule 100: 0.0.0.0/0, ALL traffic, ALLOW

Inbound (for responses):
- Rule 100: 0.0.0.0/0, TCP 1024-65535, ALLOW

Default NACL: Allows all (no issue)
Custom NACL: May block traffic

TESTING:

From instance, test connectivity:
# Test DNS resolution
nslookup google.com

# Test HTTP
curl -I http://google.com

# Test HTTPS
curl -I https://google.com

# Trace route
traceroute google.com

COMMON MISTAKES:

❌ Route table not associated with subnet
✓ Associate correct route table

❌ NAT Gateway in wrong AZ (different from instance)
✓ NAT Gateway must be in public subnet, routed from private subnet

❌ Elastic IP not allocated to NAT Gateway
✓ NAT needs EIP for internet access

❌ Security group blocking HTTPS (port 443)
✓ Allow outbound 443

❌ Instance DNS settings incorrect
✓ Use VPC DNS server: 169.254.169.253 or VPC CIDR +2

PREVENTION:
✓ Use VPC Flow Logs to diagnose traffic
✓ Document network architecture
✓ Use Infrastructure as Code (Terraform/CloudFormation)
✓ Test connectivity after VPC changes
✓ Use VPC Reachability Analyzer
```


### Issue 4: Cannot Connect Between VPCs

```
SYMPTOM:
Instances in different VPCs cannot communicate
VPC peering connection exists but traffic not flowing

ROOT CAUSES & SOLUTIONS:

1. VPC PEERING NOT ESTABLISHED:

Check peering status:
aws ec2 describe-vpc-peering-connections \
  --filters "Name=status-code,Values=active"

Status must be "active"

If "pending-acceptance":
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-xxxxx

2. ROUTE TABLES NOT UPDATED:

Both VPCs need routes to peer:

VPC-A route table:
Destination: VPC-B CIDR (10.1.0.0/16)
Target: pcx-xxxxx

VPC-B route table:
Destination: VPC-A CIDR (10.0.0.0/16)
Target: pcx-xxxxx

Add routes:
aws ec2 create-route \
  --route-table-id rtb-xxxxx \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-xxxxx

3. SECURITY GROUPS:

Security groups must allow traffic from peer VPC CIDR

Example (VPC-A security group):
Inbound rule:
Type: All traffic (or specific ports)
Source: 10.1.0.0/16 (VPC-B CIDR)

Add rule:
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol all \
  --cidr 10.1.0.0/16

4. OVERLAPPING CIDR BLOCKS:

VPC CIDRs cannot overlap for peering

VPC-A: 10.0.0.0/16
VPC-B: 10.1.0.0/16 ✓ No overlap

VPC-A: 10.0.0.0/16
VPC-B: 10.0.1.0/24 ✗ Overlap!

Solution: Use non-overlapping CIDR blocks
Cannot fix after VPC created (must recreate)

5. DNS RESOLUTION:

Enable DNS resolution for peering:
aws ec2 modify-vpc-peering-connection-options \
  --vpc-peering-connection-id pcx-xxxxx \
  --requester-peering-connection-options \
    AllowDnsResolutionFromRemoteVpc=true \
  --accepter-peering-connection-options \
    AllowDnsResolutionFromRemoteVpc=true

TESTING:

From VPC-A instance to VPC-B instance:
# Ping private IP
ping 10.1.0.10

# Test specific port
telnet 10.1.0.10 80

# Trace route
traceroute 10.1.0.10

VPC Flow Logs can show rejected traffic

ALTERNATIVE: TRANSIT GATEWAY:

For multiple VPCs (> 3), use Transit Gateway instead

Benefits:
✓ Hub-and-spoke topology
✓ Transitive routing
✓ Centralized management
✓ Scalable (100s of VPCs)

Create Transit Gateway:
aws ec2 create-transit-gateway \
  --description "Hub for VPC connectivity"

Attach VPCs:
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-xxxxx \
  --vpc-id vpc-xxxxx \
  --subnet-ids subnet-xxxxx

Update route tables to use TGW
```


## RDS Database Troubleshooting

### Issue 5: Cannot Connect to RDS Database

```
SYMPTOM:
Application cannot establish connection to RDS
Connection timeout or "Connection refused" errors

DIAGNOSTIC STEPS:

1. VERIFY DATABASE STATUS:

Check DB instance state:
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].DBInstanceStatus'

Expected: "available"

Other states:
- creating: Wait for completion
- backing-up: Wait for backup to finish
- modifying: Wait for modification
- stopping/stopped: Start database
- failed: Check CloudWatch Logs

Start if stopped:
aws rds start-db-instance \
  --db-instance-identifier mydb

2. CHECK SECURITY GROUP:

RDS security group must allow inbound on DB port

For MySQL/Aurora: Port 3306
For PostgreSQL: Port 5432
For SQL Server: Port 1433
For Oracle: Port 1521

Check security group:
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx

Inbound rule must allow:
Type: MySQL/Aurora (or specific DB type)
Port: 3306 (or appropriate port)
Source: Application security group OR application CIDR

Add rule:
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-xxxxx \
  --protocol tcp \
  --port 3306 \
  --source-group sg-app-xxxxx

3. VERIFY ENDPOINT:

Get correct endpoint:
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].Endpoint'

Use endpoint in connection string:
mysql -h mydb.abc123.us-east-1.rds.amazonaws.com \
      -P 3306 \
      -u admin \
      -p

4. CHECK VPC CONFIGURATION:

If RDS in private subnet:
- Application must be in same VPC OR
- VPN/Direct Connect to VPC OR
- VPC Peering configured

Test connectivity from EC2 in same VPC:
telnet mydb.abc123.us-east-1.rds.amazonaws.com 3306

If connection refused: Security group issue
If timeout: Network routing issue

5. VERIFY CREDENTIALS:

Check master username:
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].MasterUsername'

Reset password if forgotten:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --master-user-password NewPassword123! \
  --apply-immediately

6. CHECK PUBLIC ACCESSIBILITY:

If connecting from internet:
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].PubliclyAccessible'

If false and need internet access:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --publicly-accessible \
  --apply-immediately

⚠️ Not recommended for production (security risk)

COMMON CONNECTION ERRORS:

Error: "Unknown database 'dbname'"
Cause: Database name doesn't exist
Fix: Create database or use correct name

Error: "Access denied for user 'user'@'host'"
Cause: Wrong username/password or insufficient privileges
Fix: Verify credentials or grant permissions

Error: "Can't connect to MySQL server on 'host'"
Cause: Network connectivity issue
Fix: Check security groups, VPC settings

Error: "Too many connections"
Cause: Max connections reached
Fix: Increase max_connections parameter or close idle connections

MONITORING:

Enable Enhanced Monitoring:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::xxxxx:role/rds-monitoring-role

Check CloudWatch metrics:
- DatabaseConnections (current connections)
- CPUUtilization (high = possible issue)
- FreeStorageSpace (running out of space?)
- ReadLatency/WriteLatency (performance)

PREVENTION:
✓ Use connection pooling in application
✓ Implement retry logic with exponential backoff
✓ Monitor connection count (alert on 80% max)
✓ Use Multi-AZ for automatic failover
✓ Enable automated backups
✓ Use Secrets Manager for credential management
```


### Issue 6: RDS Performance Degradation

```
SYMPTOM:
Slow queries, high latency, application timeouts
Database response times significantly increased

INVESTIGATION:

1. CHECK CLOUDWATCH METRICS:

Key metrics to review:
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=mydb \
  --start-time 2025-11-17T00:00:00Z \
  --end-time 2025-11-17T12:00:00Z \
  --period 300 \
  --statistics Average

Metrics to investigate:
- CPUUtilization: High (> 80%) = compute bottleneck
- DatabaseConnections: High = connection saturation
- ReadLatency/WriteLatency: High = storage bottleneck
- ReadIOPS/WriteIOPS: High = I/O bottleneck
- FreeableMemory: Low = memory pressure
- SwapUsage: High = insufficient memory

2. ENABLE PERFORMANCE INSIGHTS:

View query performance:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --enable-performance-insights \
  --performance-insights-retention-period 7

Access Performance Insights in console:
- Top SQL queries by load
- Wait events
- Database load over time

3. ANALYZE SLOW QUERY LOG:

MySQL: Enable slow query log
aws rds modify-db-parameter-group \
  --db-parameter-group-name mygroup \
  --parameters "ParameterName=slow_query_log,ParameterValue=1,ApplyMethod=immediate" \
               "ParameterName=long_query_time,ParameterValue=2,ApplyMethod=immediate"

Download log:
aws rds download-db-log-file-portion \
  --db-instance-identifier mydb \
  --log-file-name slowquery/mysql-slowquery.log

Analyze for:
- Queries taking > 2 seconds
- Missing indexes
- Full table scans
- Lock waits

COMMON CAUSES & FIXES:

1. INSUFFICIENT INSTANCE SIZE:

CPU > 80% sustained:
Upgrade instance class:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.r5.2xlarge \
  --apply-immediately

Choose right instance type:
- T3: Burstable (variable workloads)
- M5: General purpose (balanced)
- R5: Memory-optimized (large datasets)
- X1: Extreme memory (in-memory databases)

2. INSUFFICIENT STORAGE IOPS:

Storage IOPS exhausted:
Upgrade to Provisioned IOPS (io1/io2):
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --storage-type io1 \
  --iops 10000 \
  --apply-immediately

Or use gp3 with configurable IOPS:
--storage-type gp3 \
--iops 12000 \
--storage-throughput 500

3. MISSING INDEXES:

Identify missing indexes from slow queries
Create indexes on frequently queried columns

MySQL:
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';

Look for: "type: ALL" (full table scan)

Create index:
CREATE INDEX idx_email ON users(email);

4. POOR QUERY OPTIMIZATION:

Inefficient queries causing high load

Optimize:
- Avoid SELECT *
- Use appropriate JOIN types
- Limit result sets
- Use prepared statements
- Batch operations

5. TOO MANY CONNECTIONS:

Max connections reached:
Increase max_connections parameter:
aws rds modify-db-parameter-group \
  --db-parameter-group-name mygroup \
  --parameters "ParameterName=max_connections,ParameterValue=1000,ApplyMethod=pending-reboot"

Reboot to apply:
aws rds reboot-db-instance \
  --db-instance-identifier mydb

Better: Implement connection pooling in application

6. INSUFFICIENT CACHE:

Increase buffer pool size (MySQL/Aurora):
aws rds modify-db-parameter-group \
  --db-parameter-group-name mygroup \
  --parameters "ParameterName=innodb_buffer_pool_size,ParameterValue={DBInstanceClassMemory*3/4},ApplyMethod=pending-reboot"

7. STORAGE FULL:

FreeStorageSpace approaching 0:
Increase allocated storage:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --allocated-storage 1000 \
  --apply-immediately

Enable storage autoscaling:
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --max-allocated-storage 2000

SCALING STRATEGIES:

Vertical Scaling (Scale Up):
- Larger instance class
- More CPU, memory, network
- Requires brief downtime (Multi-AZ: ~1 min)

Horizontal Scaling (Scale Out):
- Read Replicas for read traffic
- Aurora: Up to 15 read replicas
- Offload analytics, reporting to replicas

Create Read Replica:
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-replica \
  --source-db-instance-identifier mydb

Caching:
- ElastiCache (Redis/Memcached)
- Cache frequent queries
- Reduce database load 70-90%

PREVENTION:
✓ Monitor Performance Insights weekly
✓ Set CloudWatch alarms (CPU > 70%, connections > 80% max)
✓ Regular database maintenance (VACUUM, ANALYZE)
✓ Implement query caching
✓ Use read replicas for read-heavy workloads
✓ Right-size instance based on actual usage
✓ Load test before production
```


## S3 Troubleshooting

### Issue 7: Access Denied to S3 Bucket

```
SYMPTOM:
"Access Denied" error when accessing S3 bucket or objects
HTTP 403 Forbidden error

INVESTIGATION CHECKLIST:

□ IAM policy allows action?
□ Bucket policy allows action?
□ Bucket Block Public Access settings?
□ Object ACL allows access?
□ Bucket encryption requires specific headers?
□ VPC Endpoint policy allows access?

STEP-BY-STEP DIAGNOSIS:

1. CHECK IAM PERMISSIONS:

View user/role policy:
aws iam get-user-policy \
  --user-name myuser \
  --policy-name mypolicy

Required permissions:
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject",
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::mybucket",
    "arn:aws:s3:::mybucket/*"
  ]
}

Note: ListBucket on bucket, Get/Put on objects (*)

2. CHECK BUCKET POLICY:

View bucket policy:
aws s3api get-bucket-policy \
  --bucket mybucket \
  --query Policy \
  --output text | jq

Look for Deny statements blocking access

Example policy allowing access:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::123456789012:user/myuser"},
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::mybucket/*"
  }]
}

3. CHECK BLOCK PUBLIC ACCESS:

View settings:
aws s3api get-public-access-block \
  --bucket mybucket

If all set to true, public access blocked:
{
  "BlockPublicAcls": true,
  "IgnorePublicAcls": true,
  "BlockPublicPolicy": true,
  "RestrictPublicBuckets": true
}

For public access, disable (use with caution):
aws s3api delete-public-access-block \
  --bucket mybucket

⚠️ Only for truly public buckets (e.g., website hosting)

4. CHECK OBJECT OWNERSHIP:

Objects uploaded by different account may not be accessible

Check object owner:
aws s3api head-object \
  --bucket mybucket \
  --key myfile.txt \
  --query Owner

Solution: Use bucket owner full control ACL when uploading:
aws s3 cp myfile.txt s3://mybucket/ \
  --acl bucket-owner-full-control

Or configure bucket ownership:
aws s3api put-bucket-ownership-controls \
  --bucket mybucket \
  --ownership-controls Rules=[{ObjectOwnership=BucketOwnerEnforced}]

5. CHECK ENCRYPTION REQUIREMENTS:

Server-side encryption required?
aws s3api get-bucket-encryption \
  --bucket mybucket

If encryption required, upload with:
aws s3 cp myfile.txt s3://mybucket/ \
  --server-side-encryption AES256

Or use KMS:
aws s3 cp myfile.txt s3://mybucket/ \
  --server-side-encryption aws:kms \
  --ssekms-key-id arn:aws:kms:region:account:key/key-id

6. CHECK VPC ENDPOINT POLICY:

If accessing from VPC endpoint, policy may restrict:
aws ec2 describe-vpc-endpoints \
  --vpc-endpoint-ids vpce-xxxxx \
  --query 'VpcEndpoints[0].PolicyDocument'

Ensure policy allows your bucket:
{
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": [
      "arn:aws:s3:::mybucket",
      "arn:aws:s3:::mybucket/*"
    ]
  }]
}

COMMON SCENARIOS:

Scenario 1: Cross-Account Access

Account A bucket, Account B user needs access

Account A (bucket owner):
1. Bucket policy allowing Account B:
{
  "Effect": "Allow",
  "Principal": {"AWS": "arn:aws:iam::AccountB:root"},
  "Action": "s3:*",
  "Resource": [
    "arn:aws:s3:::mybucket",
    "arn:aws:s3:::mybucket/*"
  ]
}

Account B (user):
2. IAM policy for user:
{
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": [
    "arn:aws:s3:::mybucket",
    "arn:aws:s3:::mybucket/*"
  ]
}

Scenario 2: Public Website Hosting

Allow public read access:
1. Disable Block Public Access
2. Bucket policy:
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::mybucket/*"
}

Scenario 3: CloudFront Access

S3 bucket behind CloudFront:
1. Use Origin Access Identity (OAI) or Origin Access Control (OAC)
2. Bucket policy allows CloudFront only:
{
  "Effect": "Allow",
  "Principal": {"Service": "cloudfront.amazonaws.com"},
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::mybucket/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/DISTRIBUTIONID"
    }
  }
}

TESTING:

Test with AWS CLI:
aws s3 ls s3://mybucket/
aws s3 cp s3://mybucket/file.txt ./

Check with presigned URL:
aws s3 presign s3://mybucket/file.txt \
  --expires-in 3600

If presigned URL works but direct access doesn't:
Issue is with bucket policy or IAM permissions

PREVENTION:
✓ Use IAM policy simulator to test permissions
✓ Enable CloudTrail to log S3 API calls
✓ Use S3 access analyzer
✓ Implement least privilege principle
✓ Regular access audits
✓ Document access patterns and requirements

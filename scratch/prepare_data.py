import os
import json
import re

# Paths
source_dir = "/home/axel/Bureau/sante/SAA CO3/aws-solution-architect-study-material-main"
target_dir = "/home/axel/Bureau/sante/SAA CO3/aws-saa-academy/src/data"

# Ensure target directory exists
os.makedirs(target_dir, exist_ok=True)

def parse_courses():
    print("Parsing courses...")
    courses = []
    
    # List all markdown files in source_dir
    files = sorted([f for f in os.listdir(source_dir) if f.endswith('.md')])
    
    for filename in files:
        if filename.lower() == 'readme.md':
            continue
            
        filepath = os.path.join(source_dir, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Extract title (first H1)
        title_match = re.search(r'^#\s+(.*)$', content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()
        else:
            title = os.path.splitext(filename)[0]
            
        # Clean title if it contains chapter info twice
        title = re.sub(r'^(Chapter \d+|Appendix [A-D])\s*:\s*', '', title)
        
        # Determine ID and Type
        if filename.startswith('Appendix'):
            type_val = 'appendix'
            # e.g., "Appendix A AWS Service Cheat Sheets.md" -> ID "appA"
            match = re.match(r'^Appendix\s+([A-D])', filename)
            id_val = f"app_{match.group(1).lower()}" if match else filename
        else:
            type_val = 'chapter'
            # e.g., "01 AWS Global Infrastructure.md" -> ID "ch01"
            match = re.match(r'^(\d+)', filename)
            id_val = f"ch_{match.group(1)}" if match else filename
            
        # Map chapters/appendices to domains roughly for stats
        domain = "General & Frameworks"
        ch_num = int(match.group(1)) if (type_val == 'chapter' and match) else None
        
        if ch_num:
            if ch_num in [2, 16, 23, 24, 25]:
                domain = "Domain 1: Design Secure Architectures"
            elif ch_num in [1, 3, 4, 5, 8, 9, 15, 17, 32]:
                domain = "Domain 2: Design Resilient Architectures"
            elif ch_num in [6, 7, 10, 11, 12, 13, 14, 18, 19, 20, 21, 22]:
                domain = "Domain 3: Design High-Performing Architectures"
            elif ch_num in [29, 30]:
                domain = "Domain 4: Design Cost-Optimized Architectures"
            else:
                domain = "Domain 2: Design Resilient Architectures" # default
        
        courses.append({
            "id": id_val,
            "title": title,
            "filename": filename,
            "content": content,
            "type": type_val,
            "domain": domain
        })
        
    # Write courses to coursesData.json
    courses_json_path = os.path.join(target_dir, 'coursesData.json')
    with open(courses_json_path, 'w', encoding='utf-8') as f:
        json.dump(courses, f, ensure_ascii=False, indent=2)
        
    print(f"Parsed {len(courses)} course files successfully and saved to {courses_json_path}.")

def generate_questions():
    print("Generating exam questions...")
    # 30 scenario-based questions covering the 4 domains
    questions = [
        # Domain 1: Design Secure Architectures (8 questions)
        {
            "id": 1,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A company is hosting a web application on Amazon EC2 instances in a private subnet. An Application Load Balancer (ALB) in a public subnet routes traffic to the instances. The security team wants to protect the application from common web exploits like SQL injection and cross-site scripting (XSS). Which solution should be implemented?",
            "options": [
                {"key": "A", "text": "Configure Security Groups on the EC2 instances to block SQL injection traffic."},
                {"key": "B", "text": "Deploy AWS WAF and associate it with the Application Load Balancer (ALB)."},
                {"key": "C", "text": "Create network access control lists (NACLs) to block malicious IP addresses."},
                {"key": "D", "text": "Deploy Amazon GuardDuty on the EC2 instances to intercept malicious payloads."}
            ],
            "correctAnswer": "B",
            "explanation": "AWS WAF (Web Application Firewall) protects web applications from common web exploits and bots. It can be associated with an ALB, Amazon CloudFront distribution, or Amazon API Gateway. Security Groups (Layer 4) and NACLs (Layer 4) cannot inspect HTTP payloads for Layer 7 attacks like SQL injection or XSS. GuardDuty is a threat detection service that monitors logs, but it does not block web requests inline.",
            "reference": "https://docs.aws.amazon.com/waf/"
        },
        {
            "id": 2,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A financial services company has a compliance requirement to store customer transaction records in Amazon S3. The records must be encrypted at rest, and the encryption keys must be rotated annually. The company wants AWS to manage the rotation automatically, but they want to control who can use the keys. Which encryption method meets these requirements?",
            "options": [
                {"key": "A", "text": "Server-side encryption with Amazon S3-managed keys (SSE-S3)"},
                {"key": "B", "text": "Server-side encryption with customer-provided keys (SSE-C)"},
                {"key": "C", "text": "Server-side encryption with AWS KMS keys (SSE-KMS) using a custom Customer Managed Key (CMK)"},
                {"key": "D", "text": "Client-side encryption using a local Java key management library"}
            ],
            "correctAnswer": "C",
            "explanation": "SSE-KMS with a Customer Managed Key (CMK) allows key policies to control access permissions while supporting automatic annual rotation. SSE-S3 uses keys managed entirely by S3 without access control options on the key itself. SSE-C and client-side encryption require the customer to manage key rotation manually.",
            "reference": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html"
        },
        {
            "id": 3,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "An application running on EC2 instances in a private subnet needs to access sensitive data stored in Amazon S3. The security policy dictates that the data must not traverse the public internet. What is the most secure and cost-effective way to establish this connection?",
            "options": [
                {"key": "A", "text": "Deploy a NAT Gateway in the public subnet and route S3 traffic through it."},
                {"key": "B", "text": "Configure an S3 Gateway Endpoint in the VPC and update the private subnet's route table."},
                {"key": "C", "text": "Establish an AWS Site-to-Site VPN to route S3 traffic privately."},
                {"key": "D", "text": "Create an S3 Interface Endpoint (PrivateLink) and use local DNS resolution."}
            ],
            "correctAnswer": "B",
            "explanation": "An S3 Gateway Endpoint is a free, highly available VPC endpoint that routes traffic directly from a private subnet to Amazon S3 over the AWS internal network without traversing the internet. While an Interface Endpoint (PrivateLink) is possible, it incurs costs per hour and per GB, making the Gateway Endpoint the most cost-effective and recommended solution for S3. NAT Gateway traverses the internet and incurs charges.",
            "reference": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html"
        },
        {
            "id": 4,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A security architect needs to grant temporary administrative access to an external auditor to inspect resources in an AWS account. The auditor does not have an AWS account. What is the best practice to grant this access securely?",
            "options": [
                {"key": "A", "text": "Create an IAM User for the auditor, attach AdministratorAccess policy, and delete the user after the audit."},
                {"key": "B", "text": "Create an IAM Role with the required permissions, and set up an IAM User with MFA to assume that role temporarily."},
                {"key": "C", "text": "Share the root account credentials with the auditor via a secure password manager."},
                {"key": "D", "text": "Use AWS IAM Identity Center to provision a temporary user account with a session duration limit."}
            ],
            "correctAnswer": "D",
            "explanation": "AWS IAM Identity Center (successor to AWS SSO) is the recommended service for managing single sign-on access to AWS accounts. It allows provisioning temporary access with session duration limits. Sharing root credentials is a severe violation of security principles. Creating long-term IAM Users for temporary auditors is discouraged compared to federated or IAM Identity Center access.",
            "reference": "https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is-sso.html"
        },
        {
            "id": 5,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A company wants to secure its multi-tier web application. The web tier is behind an Application Load Balancer. The database tier is on Amazon RDS MySQL. Which configuration represents the most secure security group configuration?",
            "options": [
                {"key": "A", "text": "ALB security group allows port 80/443 from 0.0.0.0/0. DB security group allows port 3306 from 0.0.0.0/0."},
                {"key": "B", "text": "ALB security group allows port 80/443 from 0.0.0.0/0. DB security group allows port 3306 from the ALB's security group."},
                {"key": "C", "text": "ALB security group allows port 80/443 from 0.0.0.0/0. EC2 instances security group allows port 80/443 from the ALB security group. DB security group allows port 3306 from the EC2 instances security group."},
                {"key": "D", "text": "ALB security group allows port 80/443 from 0.0.0.0/0. DB security group allows port 3306 from the VPC CIDR block."}
            ],
            "correctAnswer": "C",
            "explanation": "This represents the principle of least privilege at the network layer. The ALB accepts public internet traffic. The EC2 web/app instances only accept traffic originating from the ALB's security group. The database tier only accepts traffic on MySQL port 3306 originating from the EC2 instances' security group. This prevents direct access to the database or compute instances from the internet or other unauthorized resources.",
            "reference": "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html"
        },
        {
            "id": 6,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A company wants to block traffic from specific IP addresses that are launching brute-force attacks against their public-facing EC2 web servers. Which resource should be configured to block these specific IPs?",
            "options": [
                {"key": "A", "text": "Security Groups associated with the EC2 instances"},
                {"key": "B", "text": "Network Access Control Lists (NACLs) associated with the subnets"},
                {"key": "C", "text": "Route Tables associated with the VPC"},
                {"key": "D", "text": "Amazon Route 53 DNS routing policies"}
            ],
            "correctAnswer": "B",
            "explanation": "Network ACLs (NACLs) support both ALLOW and DENY rules, making them suitable for blocking specific malicious IP addresses at the subnet boundary. Security Groups are stateful and only support ALLOW rules; they cannot be used to explicitly deny specific IPs. Route tables dictate traffic routing but cannot filter traffic by IP address dynamically. Route 53 manages DNS records and does not block IP connections.",
            "reference": "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html"
        },
        {
            "id": 7,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A healthcare provider stores patient medical images in an Amazon S3 bucket. Compliance regulations mandate that the images must be immutable and cannot be deleted or overwritten by anyone, including the AWS root account user, for a period of 5 years. Which feature should be used?",
            "options": [
                {"key": "A", "text": "Enable S3 Versioning on the bucket."},
                {"key": "B", "text": "Enable S3 Object Lock in Compliance mode with a retention period of 5 years."},
                {"key": "C", "text": "Enable S3 Object Lock in Governance mode with a retention period of 5 years."},
                {"key": "D", "text": "Implement an S3 Bucket Policy denying S3:DeleteObject actions for all principals."}
            ],
            "correctAnswer": "B",
            "explanation": "S3 Object Lock in Compliance mode prevents an object version from being deleted or overwritten by any user, including the root user in your AWS account. Governance mode allows users with special permissions (like S3:BypassGovernanceRetention) to bypass retention settings, which violates the requirement that no one (including root) can delete them. Versioning alone does not prevent permanent deletion of older versions. Bucket policies can be modified by administrators or root, so they don't guarantee absolute immutability.",
            "reference": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html"
        },
        {
            "id": 8,
            "domain": "Domain 1: Design Secure Architectures",
            "question": "A company's security team wants to monitor all AWS API calls made within the account, including who made the call, from what IP address, and when. They need to store these logs in a secure, central S3 bucket and receive notifications when suspicious modifications are made to security services. Which services should be configured?",
            "options": [
                {"key": "A", "text": "Configure Amazon CloudWatch Logs and route them to an S3 bucket."},
                {"key": "B", "text": "Enable AWS CloudTrail in all regions, write logs to a secure S3 bucket, and use Amazon EventBridge for alerts."},
                {"key": "C", "text": "Use AWS Config to track API calls and SNS for notifications."},
                {"key": "D", "text": "Deploy Amazon GuardDuty and enable VPC Flow Logs."}
            ],
            "correctAnswer": "B",
            "explanation": "AWS CloudTrail records all AWS API calls made in your account, including identify, timestamp, IP address, and request parameters. Writing them to S3 provides a secure log trail. Amazon EventBridge (formerly CloudWatch Events) can monitor CloudTrail logs and trigger SNS notifications for specific API calls. CloudWatch logs monitor application/OS logs, not API calls directly. AWS Config tracks configuration changes over time, rather than API transaction audits.",
            "reference": "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html"
        },

        # Domain 2: Design Resilient Architectures (8 questions)
        {
            "id": 9,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company is designing a web application that will be hosted on AWS. The application must remain available even if an entire AWS Region becomes unavailable. The database layer must support low-latency reads globally. Which database solution meets these requirements?",
            "options": [
                {"key": "A", "text": "Amazon RDS for MySQL with Multi-AZ enabled."},
                {"key": "B", "text": "Amazon Aurora Global Database with secondary clusters in other regions."},
                {"key": "C", "text": "Amazon DynamoDB with DynamoDB Accelerator (DAX) configured."},
                {"key": "D", "text": "Amazon RDS PostgreSQL with cross-region read replicas."}
            ],
            "correctAnswer": "B",
            "explanation": "Amazon Aurora Global Database is designed for globally distributed applications, allowing a single Amazon Aurora database to span multiple AWS Regions. It replicates data with no impact on database performance, enables fast local reads with low latency in each region, and provides disaster recovery from region-wide outages. RDS Multi-AZ only replicates across availability zones within a single region. Cross-region replicas in standard RDS do not provide automatic regional failover as natively and efficiently as Aurora Global Database.",
            "reference": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html"
        },
        {
            "id": 10,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company has an e-commerce application running on EC2 instances behind an Application Load Balancer. During flash sales, the database (hosted on Amazon RDS PostgreSQL) gets overwhelmed with read queries, leading to application timeouts. What is the most resilient and scalable way to resolve this database bottleneck?",
            "options": [
                {"key": "A", "text": "Scale up the RDS instance to a larger instance class."},
                {"key": "B", "text": "Create RDS Read Replicas and modify the application to route read queries to them."},
                {"key": "C", "text": "Implement Amazon ElastiCache in front of the PostgreSQL database to cache frequent read results."},
                {"key": "D", "text": "Enable Multi-AZ replication on the database to distribute read traffic."}
            ],
            "correctAnswer": "C",
            "explanation": "Caching query results in ElastiCache (Redis or Memcached) is the most resilient, high-performing, and scalable solution to offload database reads. It achieves sub-millisecond latencies and prevents queries from reaching the database entirely. While Read Replicas (B) help scale reads, they still run SQL queries on a full database instance, which is slower and more expensive than cache hits. Multi-AZ (D) is for high availability and disaster recovery, not read scaling; the standby database does not accept active traffic.",
            "reference": "https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html"
        },
        {
            "id": 11,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "An application processes uploaded image files. Users upload files to an S3 bucket, which triggers an EC2 instance via an API to resize the images. During peak hours, some image resizing requests are lost because the EC2 instance gets overwhelmed. How can the architecture be refactored to make it loose-coupled and resilient?",
            "options": [
                {"key": "A", "text": "Increase the size of the EC2 instance and enable Auto Scaling based on CPU usage."},
                {"key": "B", "text": "Configure S3 to send an event notification to an Amazon SQS queue, and configure EC2 instances to poll the queue for messages."},
                {"key": "C", "text": "Use Amazon CloudFront in front of the S3 bucket to cache the upload requests."},
                {"key": "D", "text": "Configure Amazon SNS to publish a notification to the EC2 instance directly when a file is uploaded."}
            ],
            "correctAnswer": "B",
            "explanation": "Using an Amazon SQS (Simple Queue Service) queue is the classic pattern for decoupling application components. By storing image processing jobs in SQS, the requests are preserved (up to 14 days) and cannot be lost. The EC2 instances process them at their own pace, and Auto Scaling can scale the EC2 instances based on the number of messages in the queue (QueueLength). Direct SNS triggers (D) or scaling up (A) still leave the system vulnerable to transient processing failures or rate limits.",
            "reference": "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html"
        },
        {
            "id": 12,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A web application runs on EC2 instances behind an ALB. The instances are in an Auto Scaling group across 3 Availability Zones. The minimum capacity is set to 2, and the desired capacity is 2. If one Availability Zone suffers an outage, how will the architecture maintain availability?",
            "options": [
                {"key": "A", "text": "The Application Load Balancer will automatically route traffic to the remaining healthy Availability Zones, and the Auto Scaling group will launch a new instance in a healthy AZ to maintain the desired capacity of 2."},
                {"key": "B", "text": "The ALB will fail over to a standby ALB in a different region."},
                {"key": "C", "text": "The Auto Scaling group will fail because the capacity cannot be divided equally among Availability Zones."},
                {"key": "D", "text": "Amazon Route 53 will detect the AZ failure and update DNS records to point to a backup static site in S3."}
            ],
            "correctAnswer": "A",
            "explanation": "Auto Scaling groups integrated with multiple AZs automatically manage instance distribution. If one AZ goes down, the instances in that AZ will fail health checks. The ALB will stop routing traffic to them. Concurrently, the Auto Scaling group will detect that the active instance count has dropped below the desired capacity (to 1) and will launch a new instance in one of the surviving AZs to restore the count to 2.",
            "reference": "https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-groups.html"
        },
        {
            "id": 13,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company wants to design a Disaster Recovery (DR) strategy for their core web application. They need a Recovery Point Objective (RPO) of 15 minutes and a Recovery Time Objective (RTO) of less than 30 minutes. The solution must minimize costs during normal operations. Which DR pattern should they choose?",
            "options": [
                {"key": "A", "text": "Backup and Restore (nightly S3 snapshots)"},
                {"key": "B", "text": "Pilot Light (active databases, stopped/minimal app tier)"},
                {"key": "C", "text": "Warm Standby (active databases, scaled-down active app tier) ✓"},
                {"key": "D", "text": "Multi-site Active-Active (fully functional running resources in two regions)"}
            ],
            "correctAnswer": "C",
            "explanation": "A Warm Standby pattern maintains a scaled-down but fully functional copy of the application running in another region. The databases are actively replicated. RTO is under 30 minutes because you only need to scale up the app tier (via Auto Scaling) and update DNS. RPO is low (minutes) due to database replication. Pilot Light (B) has a higher RTO (hours) because application servers must be provisioned and booted from scratch. Multi-site (D) is active-active, which satisfies the metrics but is highly expensive and does not minimize costs.",
            "reference": "https://aws.amazon.com/blogs/architecture/disaster-recovery-dr-architecture-on-aws-part-iii-pilot-light-and-warm-standby/"
        },
        {
            "id": 14,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company has a stateful application that runs on a single EC2 instance. The application writes data to an attached Amazon EBS volume. What is the most effective way to protect this data against EBS volume failure or corruptions?",
            "options": [
                {"key": "A", "text": "Enable EBS Multi-Attach on the volume and connect it to another instance."},
                {"key": "B", "text": "Configure a cron job to copy files to another folder in the instance root volume."},
                {"key": "C", "text": "Schedule regular EBS Snapshots using Amazon Data Lifecycle Manager (DLM)."},
                {"key": "D", "text": "Use RAID 0 configuration with an additional EBS volume."}
            ],
            "correctAnswer": "C",
            "explanation": "EBS Snapshots are point-in-time copies of your EBS volumes that are stored incrementally in Amazon S3, which provides high durability. Using Amazon Data Lifecycle Manager (DLM) automates the creation, retention, and deletion of snapshots. RAID 0 provides performance, but actually increases the risk of data loss (if either volume fails, all data is lost). EBS Multi-Attach is only supported by specific Nitro SSD volumes and does not prevent data corruption.",
            "reference": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/snapshot-lifecycle.html"
        },
        {
            "id": 15,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company requires that its critical relational database be highly available with automatic failover capabilities across Availability Zones. The database runs on Amazon RDS. Which option should be selected?",
            "options": [
                {"key": "A", "text": "Enable Read Replicas in different Availability Zones."},
                {"key": "B", "text": "Enable RDS Multi-AZ deployment."},
                {"key": "C", "text": "Configure an Amazon ElastiCache cluster in front of the database."},
                {"key": "D", "text": "Deploy a standby database on a separate EC2 instance and write replication scripts."}
            ],
            "correctAnswer": "B",
            "explanation": "RDS Multi-AZ automatically provisions and maintains a synchronous standby replica in a different Availability Zone. In the event of a DB instance failure or AZ outage, Amazon RDS automatically performs a failover to the standby replica, updating DNS. Read Replicas (A) are asynchronous and require manual promotion to primary during failover, making them less suitable for automated high availability.",
            "reference": "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html"
        },
        {
            "id": 16,
            "domain": "Domain 2: Design Resilient Architectures",
            "question": "A company hosts a global public static website on Amazon S3. Users in different continents report slow page load times. Which service should be used to improve global availability and performance?",
            "options": [
                {"key": "A", "text": "Amazon Route 53 with latency-based routing"},
                {"key": "B", "text": "Amazon CloudFront associated with the S3 bucket"},
                {"key": "C", "text": "S3 Cross-Region Replication (CRR) to replicate the bucket globally"},
                {"key": "D", "text": "AWS Global Accelerator to route web traffic"}
            ],
            "correctAnswer": "B",
            "explanation": "Amazon CloudFront is a Content Delivery Network (CDN) that caches S3 static content at Edge Locations closer to users globally. This reduces page load latency dramatically. Route 53 latency routing (A) or S3 CRR (C) do not cache content, and routing directly to S3 buckets globally is more complex and expensive than CDN caching. Global Accelerator (D) optimizes TCP/UDP traffic using Anycast IP but is typically used for dynamic ALBs/ECs rather than static websites on S3.",
            "reference": "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html"
        },

        # Domain 3: Design High-Performing Architectures (7 questions)
        {
            "id": 17,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A company runs a high-performance computing (HPC) application on AWS. The application requires low-latency, high-throughput network communication between EC2 instances. Which network configuration should be implemented?",
            "options": [
                {"key": "A", "text": "Deploy the EC2 instances in a Spread Placement Group."},
                {"key": "B", "text": "Deploy the EC2 instances in a Cluster Placement Group and enable Elastic Network Adapter (ENA) enhanced networking."},
                {"key": "C", "text": "Create a Transit Gateway to route traffic between instances."},
                {"key": "D", "text": "Use AWS Global Accelerator to route traffic internally."}
            ],
            "correctAnswer": "B",
            "explanation": "A Cluster Placement Group packs instances close together inside a single Availability Zone. This configuration enables workloads to achieve low-latency network performance and high throughput. Combining it with Enhanced Networking (ENA) delivers the highest packet-per-second performance. Spread Placement Groups (A) place instances on distinct hardware to reduce correlated failures, which increases latency between them. Transit Gateway is for VPC interconnection.",
            "reference": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html"
        },
        {
            "id": 18,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A marketing agency runs an analytics application that processes millions of clickstream events per second. The ingestion layer must capture data in real time, buffer it, and write it to Amazon S3 for long-term storage and processing. Which AWS service is best suited for this ingestion pipeline?",
            "options": [
                {"key": "A", "text": "Amazon SQS"},
                {"key": "B", "text": "Amazon Kinesis Data Firehose"},
                {"key": "C", "text": "Amazon SNS"},
                {"key": "D", "text": "AWS Glue"}
            ],
            "correctAnswer": "B",
            "explanation": "Amazon Kinesis Data Firehose is a fully managed service that captures, transforms, and loads streaming data into data lakes, data stores, and analytics services like S3. It scales automatically to match the throughput of your data. SQS is a queue system meant for message decoupling, not streaming data delivery to S3 at scale. AWS Glue is an ETL service, not a real-time ingestion layer.",
            "reference": "https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html"
        },
        {
            "id": 19,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A software company is deploying a media sharing application. Users upload videos that are processed by transcoders. The transcoders require a shared, high-performance file system that supports concurrent read/write access from hundreds of EC2 instances and scales capacity automatically. Which storage service should be chosen?",
            "options": [
                {"key": "A", "text": "Amazon EBS with Multi-Attach enabled"},
                {"key": "B", "text": "Amazon S3"},
                {"key": "C", "text": "Amazon Elastic File System (EFS)"},
                {"key": "D", "text": "Amazon FSx for Lustre"}
            ],
            "correctAnswer": "C",
            "explanation": "Amazon EFS is a serverless, fully managed, shared file system that supports the NFSv4 protocol. It allows hundreds of EC2 instances to mount and access the file system concurrently and scales storage capacity automatically. EBS Multi-Attach (A) is limited to a small number of instances (up to 16) and does not scale capacity automatically. FSx for Lustre (D) is optimized for short-term HPC/machine learning workloads, not standard general-purpose media storage.",
            "reference": "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html"
        },
        {
            "id": 20,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A database administrator needs to deploy a Microsoft SQL Server database on AWS. The database is expected to require up to 40,000 IOPS for intensive read/write operations. Which Amazon EBS volume type is most appropriate to meet this requirement?",
            "options": [
                {"key": "A", "text": "General Purpose SSD (gp3)"},
                {"key": "B", "text": "Provisioned IOPS SSD (io3/io2)"},
                {"key": "C", "text": "Throughput Optimized HDD (st1)"},
                {"key": "D", "text": "Cold HDD (sc1)"}
            ],
            "correctAnswer": "B",
            "explanation": "EBS Provisioned IOPS SSD volumes (io2/io3) are designed for input/output intensive workloads, particularly database workloads that require low latency and high IOPS (up to 64,000 IOPS per volume or 256,000 for io2 Block Express). gp3 has a limit of 16,000 IOPS. HDD volumes (st1 and sc1) do not support high random IOPS; they are optimized for sequential throughput.",
            "reference": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html"
        },
        {
            "id": 21,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A gaming company needs a fast caching solution for a DynamoDB table containing leaderboard data. The cache must provide microsecond read latency and be fully managed. Which solution should be implemented?",
            "options": [
                {"key": "A", "text": "Amazon ElastiCache for Redis"},
                {"key": "B", "text": "DynamoDB Accelerator (DAX)"},
                {"key": "C", "text": "Amazon CloudFront"},
                {"key": "D", "text": "Amazon MemoryDB for Redis"}
            ],
            "correctAnswer": "B",
            "explanation": "DynamoDB Accelerator (DAX) is a fully managed, highly available, in-memory cache for Amazon DynamoDB that delivers up to a 10x performance improvement - from milliseconds to microseconds. It integrates transparently with DynamoDB API calls. While ElastiCache for Redis (A) could cache data, it requires rewriting application query logic to fetch from cache first; DAX requires no application query modification.",
            "reference": "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html"
        },
        {
            "id": 22,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A serverless application uses Amazon API Gateway and AWS Lambda to process user requests. During high-traffic events, the Lambda execution times increase because of cold starts. Which configuration will help achieve consistent sub-second latency for the API?",
            "options": [
                {"key": "A", "text": "Increase the memory allocation of the Lambda function to 10 GB."},
                {"key": "B", "text": "Enable Provisioned Concurrency for the Lambda function."},
                {"key": "C", "text": "Enable API Gateway caching."},
                {"key": "D", "text": "Configure the Lambda function to run in a cluster placement group."}
            ],
            "correctAnswer": "B",
            "explanation": "Provisioned Concurrency keeps Lambda functions initialized and hyper-warm, ready to respond in double-digit milliseconds. This eliminates cold starts. Increasing memory (A) improves execution speed but does not prevent the initial cold start. API Gateway caching (C) helps for identical read requests but does not solve cold start latency for writes or unique requests. Lambda cannot be deployed in placement groups.",
            "reference": "https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html"
        },
        {
            "id": 23,
            "domain": "Domain 3: Design High-Performing Architectures",
            "question": "A company wants to run Docker containers on AWS. They want a fully managed serverless container runtime where they do not have to provision or manage any EC2 instances or cluster capacity. Which service should they choose?",
            "options": [
                {"key": "A", "text": "Amazon Elastic Container Service (ECS) with EC2 launch type"},
                {"key": "B", "text": "Amazon Elastic Kubernetes Service (EKS) with EC2 worker nodes"},
                {"key": "C", "text": "Amazon ECS with AWS Fargate launch type"},
                {"key": "D", "text": "AWS Elastic Beanstalk"}
            ],
            "correctAnswer": "C",
            "explanation": "AWS Fargate is a technology that you can use with Amazon ECS to run containers without having to manage servers or clusters of EC2 instances. Fargate acts as the serverless compute engine for ECS. EKS/ECS with EC2 launch types (A & B) require managing EC2 instances. Elastic Beanstalk (D) is a platform-as-a-service, not a dedicated serverless container runtime.",
            "reference": "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html"
        },

        # Domain 4: Design Cost-Optimized Architectures (7 questions)
        {
            "id": 24,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A company is migrating a legacy batch-processing application to AWS. The application runs for 3 hours every night starting at 2 AM. The job can be interrupted and resumed without data loss. Which EC2 instance pricing option is the most cost-effective?",
            "options": [
                {"key": "A", "text": "On-Demand Instances"},
                {"key": "B", "text": "Spot Instances"},
                {"key": "C", "text": "Reserved Instances"},
                {"key": "D", "text": "Dedicated Hosts"}
            ],
            "correctAnswer": "B",
            "explanation": "Spot Instances offer up to a 90% discount compared to On-Demand instances. They are ideal for workloads that are fault-tolerant, flexible, and can survive interruptions, such as batch-processing jobs that can resume. Reserved Instances (C) require a 1 or 3 year commitment, which is not cost-effective for a workload running only 3 hours per day. Dedicated Hosts are the most expensive option.",
            "reference": "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html"
        },
        {
            "id": 25,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A company has 10 TB of historical PDF reports stored in S3 Standard. The reports are accessed frequently during the first 30 days after creation, but are rarely accessed after that. However, they must be available immediately (in milliseconds) if requested. What is the most cost-effective S3 lifecycle configuration?",
            "options": [
                {"key": "A", "text": "Transition the objects to S3 Standard-IA after 30 days."},
                {"key": "B", "text": "Transition the objects to S3 Glacier Flexible Retrieval after 30 days."},
                {"key": "C", "text": "Transition the objects to S3 Intelligent-Tiering immediately."},
                {"key": "D", "text": "Transition the objects to S3 Standard-IA immediately, then to S3 Glacier Deep Archive after 30 days."}
            ],
            "correctAnswer": "A",
            "explanation": "S3 Standard-IA (Infrequent Access) is designed for data that is accessed less frequently but requires rapid access (milliseconds) when needed. Moving them after 30 days matches the access pattern. S3 Glacier Flexible (B) and S3 Glacier Deep Archive (D) have retrieval times of minutes to hours, which does not satisfy the immediate access requirement. Intelligent-Tiering (C) could work, but incurs a monthly monitoring fee per object; a direct lifecycle transition to Standard-IA is more cost-effective if the access pattern is predictably age-based.",
            "reference": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html"
        },
        {
            "id": 26,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A startup is deploying a web application with highly unpredictable traffic that spikes for a few hours occasionally and then drops to near zero. They are using Amazon RDS PostgreSQL for the database. Which database configuration will minimize costs?",
            "options": [
                {"key": "A", "text": "RDS PostgreSQL in a Multi-AZ configuration."},
                {"key": "B", "text": "Amazon Aurora Serverless v2."},
                {"key": "C", "text": "RDS PostgreSQL with an Auto Scaling read replica."},
                {"key": "D", "text": "Deploy PostgreSQL on a burstable EC2 instance (t3.micro) and stop it when not in use."}
            ],
            "correctAnswer": "B",
            "explanation": "Amazon Aurora Serverless v2 automatically scales database capacity up and down based on application demand, and scales down to minimum capacity during idle periods. This is highly cost-effective for unpredictable workloads with idle periods. RDS Multi-AZ (A) runs two database instances continuously, which doubles costs. Running on EC2 (D) requires manual intervention or scripts to stop/start and risks data availability.",
            "reference": "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html"
        },
        {
            "id": 27,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A solutions architect is reviewing network costs. The application runs on EC2 instances in private subnets across multiple AZs and fetches large media files from S3 buckets in the same region. The current routing uses a NAT Gateway in the public subnet. What is the most cost-effective way to reduce network data transfer costs?",
            "options": [
                {"key": "A", "text": "Replace the S3 bucket with an EBS volume mounted on all EC2 instances."},
                {"key": "B", "text": "Create an S3 Gateway Endpoint in the VPC and update route tables."},
                {"key": "C", "text": "Create an S3 Interface Endpoint in the private subnet."},
                {"key": "D", "text": "Set up a Site-to-Site VPN to route S3 traffic."}
            ],
            "correctAnswer": "B",
            "explanation": "Routing traffic to S3 through a NAT Gateway incurs data processing charges per GB. Creating a S3 Gateway Endpoint is entirely free and routes S3 traffic directly over the AWS internal network, avoiding NAT Gateway data transfer and processing fees. An Interface Endpoint (C) also works but has hourly and processing costs. Mounting EBS volumes (A) across AZs is not supported or cost-effective for S3 scale.",
            "reference": "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html"
        },
        {
            "id": 28,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A company's production environment runs 24/7 on 10 EC2 instances. They have a predictable steady-state CPU usage of 40%. They also have a development environment of 5 instances that are only used during business hours (Monday-Friday, 9 AM - 5 PM). Which strategy is the most cost-effective?",
            "options": [
                {"key": "A", "text": "Purchase Savings Plans for all 15 instances."},
                {"key": "B", "text": "Purchase Savings Plans for the 10 production instances, and configure an AWS Instance Scheduler to stop the 5 development instances outside of business hours."},
                {"key": "C", "text": "Run all 15 instances as Spot Instances to maximize discounts."},
                {"key": "D", "text": "Configure Auto Scaling to terminate development instances every evening and recreate them in the morning."}
            ],
            "correctAnswer": "B",
            "explanation": "For 24/7 production workloads, Savings Plans or Reserved Instances offer up to a 72% discount on steady state. For development workloads, stopping instances during off-hours (using Instance Scheduler) saves 70% of the instance run-time cost (since they run ~50 out of 168 hours a week), which is more cost-effective than buying a Savings Plan for idle instances. Spot instances (C) are not recommended for production databases or steady state due to termination risk.",
            "reference": "https://aws.amazon.com/solutions/implementations/aws-instance-scheduler/"
        },
        {
            "id": 29,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A company is using Amazon CloudFront to distribute content from an S3 bucket to users globally. The company wants to optimize the origin fetch costs (getting data from S3 to CloudFront). Which solution should they choose?",
            "options": [
                {"key": "A", "text": "Enable CloudFront Origin Shield."},
                {"key": "B", "text": "Transition the S3 bucket to S3 Standard-IA."},
                {"key": "C", "text": "Use S3 Transfer Acceleration."},
                {"key": "D", "text": "Deploy S3 replicas in every AWS region."}
            ],
            "correctAnswer": "A",
            "explanation": "CloudFront Origin Shield is a centralized caching tier in front of your origin that helps minimize the number of requests that go to the origin (like S3). This reduces S3 get requests and egress charges, optimizing origin fetch costs. S3 Standard-IA (B) would actually increase costs due to retrieval fees. Transfer Acceleration (C) is for uploads, not download origin fetch. S3 replicas (D) increase storage costs enormously.",
            "reference": "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html"
        },
        {
            "id": 30,
            "domain": "Domain 4: Design Cost-Optimized Architectures",
            "question": "A systems architect needs to design a backup archiving solution for 50 TB of regulatory files. The files must be kept for 7 years. They are rarely accessed, and a retrieval time of 12 hours is acceptable. Which storage option is the most cost-effective?",
            "options": [
                {"key": "A", "text": "Amazon S3 Glacier Flexible Retrieval"},
                {"key": "B", "text": "Amazon S3 Glacier Deep Archive"},
                {"key": "C", "text": "Amazon EFS Lifecycle management to Infrequent Access"},
                {"key": "D", "text": "Amazon EBS Cold HDD (sc1)"}
            ],
            "correctAnswer": "B",
            "explanation": "Amazon S3 Glacier Deep Archive is the lowest-cost storage class in AWS ($0.00099 per GB/month). It is designed for archiving data that is rarely accessed and can tolerate a retrieval time of 12 hours (Standard retrieval). Glacier Flexible Retrieval (A) is slightly more expensive ($0.0036 per GB/month). EFS IA (C) and EBS HDD (D) are significantly more expensive than S3 Glacier Deep Archive.",
            "reference": "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-glacier-deep-archive"
        }
    ]
    
    # Write questions to examQuestions.json
    questions_json_path = os.path.join(target_dir, 'examQuestions.json')
    with open(questions_json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
        
    print(f"Generated {len(questions)} exam questions successfully and saved to {questions_json_path}.")

if __name__ == "__main__":
    parse_courses()
    generate_questions()

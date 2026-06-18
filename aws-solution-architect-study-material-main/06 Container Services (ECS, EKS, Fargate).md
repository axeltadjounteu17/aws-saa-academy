# Chapter 6: Container Services (ECS, EKS, Fargate)

## Introduction

Container orchestration has revolutionized application deployment, enabling organizations to package applications with their dependencies, deploy consistently across environments, and scale efficiently. AWS provides three primary container services: Amazon Elastic Container Service (ECS) for AWS-native orchestration, Amazon Elastic Kubernetes Service (EKS) for Kubernetes workloads, and AWS Fargate for serverless container execution. Understanding when and how to use each service is critical for modern cloud architects.

Containers solve fundamental problems that plagued traditional deployments: "works on my machine" syndrome, dependency conflicts, inefficient resource utilization, and slow deployment cycles. By packaging applications with their runtime, libraries, and dependencies into immutable images, containers provide consistency from development through production. Container orchestration platforms like ECS and Kubernetes add crucial capabilities: automated deployment and scaling, service discovery, load balancing, rolling updates, and self-healing.

The choice between ECS and EKS is not always obvious. ECS offers deep AWS integration, simpler operations, and lower learning curve, making it ideal for teams building AWS-native applications. EKS provides the full Kubernetes ecosystem, portability across clouds, and vast community resources, but requires significant Kubernetes expertise. Fargate removes infrastructure management entirely, allowing you to focus on applications rather than servers, but with some constraints and higher per-unit costs.

This chapter provides comprehensive coverage of AWS container services from fundamentals to production patterns. You'll learn container orchestration concepts, task and pod definitions, service configuration, networking models, security best practices, and operational patterns. Whether you're migrating legacy applications to containers, building cloud-native microservices, or running data processing pipelines, mastering AWS container services is essential for modern application architectures.

## Theory \& Concepts

### Container Fundamentals

**What is a Container?**

A container is a lightweight, standalone, executable package that includes application code, runtime, system tools, libraries, and settings.

**Key Characteristics:**

1. **Isolation:** Separate namespaces for processes, networking, filesystem
2. **Portability:** Run consistently across environments (dev, test, prod)
3. **Efficiency:** Share OS kernel, faster startup than VMs
4. **Immutability:** Images don't change once built
5. **Scalability:** Easy horizontal scaling

**Container vs Virtual Machine:**


| Feature | Container | Virtual Machine |
| :-- | :-- | :-- |
| **Startup Time** | Seconds | Minutes |
| **Size** | MB | GB |
| **Performance** | Near-native | Overhead from hypervisor |
| **Isolation** | Process-level | Hardware-level |
| **OS** | Shares host kernel | Separate OS per VM |
| **Density** | 10-100x more per host | Lower density |
| **Use Case** | Microservices, stateless apps | Legacy apps, different OSes |

**Docker Basics:**

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
CMD ["node", "server.js"]
```


### Container Orchestration Concepts

**What is Orchestration?**

Container orchestration automates deployment, scaling, networking, and management of containerized applications.

**Key Capabilities:**

1. **Deployment:** Rolling updates, rollbacks, health checks
2. **Scaling:** Horizontal scaling based on metrics
3. **Service Discovery:** DNS-based service location
4. **Load Balancing:** Traffic distribution across containers
5. **Self-Healing:** Restart failed containers, reschedule on healthy nodes
6. **Configuration Management:** Secrets, environment variables
7. **Storage:** Persistent volumes for stateful applications

**Orchestration Components:**

```
Control Plane (Management)
├── API Server (API endpoint)
├── Scheduler (decides where to run containers)
├── Controller Manager (maintains desired state)
└── State Store (etcd for Kubernetes, AWS-managed for ECS)

Data Plane (Execution)
├── Worker Nodes (EC2 instances or Fargate)
├── Container Runtime (Docker, containerd)
└── Agent (kubelet for K8s, ECS agent for ECS)
```


### Amazon ECS (Elastic Container Service)

ECS is AWS's proprietary container orchestration service, deeply integrated with AWS services.

**ECS Architecture:**

```
ECS Cluster
├── Launch Type: EC2
│   ├── ECS Container Instances (EC2)
│   ├── ECS Agent (communication with control plane)
│   └── Docker Runtime
│
├── Launch Type: Fargate (Serverless)
│   ├── No instance management
│   └── AWS-managed compute
│
├── Tasks (running containers)
│   ├── Task Definition (blueprint)
│   └── Task (instance of definition)
│
└── Services (long-running tasks)
    ├── Desired count
    ├── Load balancer integration
    └── Auto Scaling
```

**ECS Components:**

**1. Cluster:**
Logical grouping of container instances or Fargate resources.

**2. Task Definition:**
Blueprint that describes one or more containers (up to 10).

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "nginx:latest",
      "cpu": 256,
      "memory": 512,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ]
    }
  ]
}
```

**3. Task:**
Running instance of a task definition.

**4. Service:**
Maintains specified number of tasks, integrates with load balancers.

**5. ECS Agent:**
Runs on EC2 instances, communicates with ECS control plane.

**ECS Launch Types:**

**EC2 Launch Type:**

- You manage EC2 instances
- More control over infrastructure
- Lower per-task cost
- Good for large, steady workloads

**Fargate Launch Type:**

- AWS manages infrastructure
- Pay per vCPU and memory used
- No instance management
- Good for variable workloads, simplicity

**Fargate Spot:**

- Up to 70% discount
- Can be interrupted
- Good for fault-tolerant batch workloads

**Comparison:**


| Feature | EC2 Launch Type | Fargate |
| :-- | :-- | :-- |
| **Infrastructure** | You manage | AWS manages |
| **Pricing** | EC2 instance pricing | Per vCPU/memory |
| **Control** | Full control | Limited |
| **Setup** | Complex | Simple |
| **Scaling** | Manual + Auto Scaling | Automatic |
| **Use Case** | Large, predictable | Variable, serverless |

### Amazon EKS (Elastic Kubernetes Service)

EKS is AWS's managed Kubernetes service, providing standard Kubernetes API.

**EKS Architecture:**

```
EKS Cluster
├── Control Plane (AWS-managed)
│   ├── API Server (3 instances across 3 AZs)
│   ├── etcd (state storage)
│   ├── Controller Manager
│   └── Scheduler
│
└── Data Plane (Worker Nodes)
    ├── EC2 Instances
    │   ├── Managed Node Groups (AWS-managed lifecycle)
    │   └── Self-managed (you control everything)
    │
    └── Fargate (serverless)
        └── Pods run on Fargate
```

**Kubernetes Concepts:**

**1. Pod:**
Smallest deployable unit, contains one or more containers.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
```

**2. Deployment:**
Manages ReplicaSets and Pods, enables declarative updates.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

**3. Service:**
Exposes pods as network service.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: LoadBalancer
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

**4. Namespace:**
Virtual cluster for resource isolation.

**5. ConfigMap \& Secret:**
Configuration and sensitive data management.

**EKS vs ECS:**


| Feature | ECS | EKS |
| :-- | :-- | :-- |
| **API** | AWS proprietary | Standard Kubernetes |
| **Portability** | AWS-specific | Multi-cloud |
| **Learning Curve** | Easier | Steeper (K8s knowledge) |
| **Ecosystem** | AWS services | Vast K8s ecosystem |
| **Control Plane Cost** | Free | \$0.10/hour per cluster (~\$73/month) |
| **Community** | AWS-focused | Huge global community |
| **Use Case** | AWS-native apps | K8s expertise, portability |

### AWS Fargate

Fargate is a serverless compute engine for containers, eliminating server management.

**Key Features:**

1. **No Infrastructure Management:** No EC2 instances to provision
2. **Right-Sized Resources:** Specify exact CPU/memory per task
3. **Isolation:** Each task runs in isolated environment
4. **Pay-per-Use:** Charged for vCPU and memory used
5. **Works with ECS and EKS:** Compatible with both orchestrators

**Fargate Specifications:**

**CPU/Memory Combinations:**


| vCPU | Memory Options |
| :-- | :-- |
| 0.25 | 0.5 GB, 1 GB, 2 GB |
| 0.5 | 1 GB - 4 GB (1 GB increments) |
| 1 | 2 GB - 8 GB (1 GB increments) |
| 2 | 4 GB - 16 GB (1 GB increments) |
| 4 | 8 GB - 30 GB (1 GB increments) |
| 8 | 16 GB - 60 GB (4 GB increments) |
| 16 | 32 GB - 120 GB (8 GB increments) |

**Fargate Pricing (us-east-1):**

```
vCPU: $0.04048 per vCPU per hour
Memory: $0.004445 per GB per hour

Example: 0.5 vCPU, 1 GB memory
Cost: (0.5 × $0.04048) + (1 × $0.004445) = $0.024685/hour
      = ~$18/month per task
```

**Fargate Limitations:**

- No privileged containers
- No GPU support (use EC2 launch type)
- No custom networking (must use awsvpc mode)
- Limited storage: 20 GB ephemeral + 200 GB EFS
- Cannot access underlying host


### Container Networking

**ECS Networking Modes:**

**1. awsvpc (Recommended for Fargate):**

- Each task gets its own ENI (Elastic Network Interface)
- Task has its own private IP
- Full VPC networking features (security groups)
- Required for Fargate

```json
{
  "networkMode": "awsvpc",
  "containerDefinitions": [...]
}
```

**2. bridge (Default for EC2):**

- Containers share host's network namespace
- Port mapping required
- Cannot use Fargate

**3. host:**

- Container uses host's network directly
- No port mapping
- Cannot use Fargate

**4. none:**

- No external networking
- Loopback only

**EKS/Kubernetes Networking:**

**AWS VPC CNI Plugin:**

- Each pod gets VPC IP address
- Native VPC networking
- Security groups for pods (via ENI)
- Integrates with VPC routing

**Service Types:**


| Type | Description | Use Case |
| :-- | :-- | :-- |
| ClusterIP | Internal cluster IP | Internal services |
| NodePort | Exposes on each node's IP | Development, legacy |
| LoadBalancer | Creates AWS load balancer | External access |
| ExternalName | DNS CNAME mapping | External services |

### Service Discovery

**ECS Service Discovery:**

Uses AWS Cloud Map for DNS-based service discovery.

```bash
# Create private DNS namespace
aws servicediscovery create-private-dns-namespace \
    --name internal.example.com \
    --vpc $VPC_ID

# ECS creates service records automatically
# Example: backend.internal.example.com → 10.0.1.5, 10.0.1.6
```

**Applications can resolve:**

```python
import socket
backend_ips = socket.gethostbyname_ex('backend.internal.example.com')
# Returns list of backend IPs
```

**EKS Service Discovery:**

Built-in Kubernetes DNS (CoreDNS).

```yaml
# Service creates DNS record automatically
# my-service.my-namespace.svc.cluster.local
```

**Applications can resolve:**

```bash
curl http://my-service.my-namespace.svc.cluster.local:8080
# Or within same namespace:
curl http://my-service:8080
```


### Storage for Containers

**Ephemeral Storage:**

- Container filesystem
- Lost when container stops
- Fast, local storage

**ECS Volumes:**

**1. Docker Volumes:**

```json
{
  "volumes": [
    {
      "name": "data-volume",
      "dockerVolumeConfiguration": {
        "scope": "task",
        "driver": "local"
      }
    }
  ]
}
```

**2. EFS (Elastic File System):**

```json
{
  "volumes": [
    {
      "name": "efs-storage",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "rootDirectory": "/data"
      }
    }
  ]
}
```

**3. Bind Mounts (EC2 only):**
Mount host directory into container.

**EKS Persistent Volumes:**

**StorageClass:**

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iopsPerGB: "50"
```

**PersistentVolumeClaim:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-claim
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 10Gi
```

**Storage Options:**


| Type | ECS | EKS | Use Case |
| :-- | :-- | :-- | :-- |
| **EBS** | Bind mount | CSI driver | Single-node, databases |
| **EFS** | Native | CSI driver | Multi-node, shared files |
| **FSx** | Via EFS driver | CSI driver | High-performance, Windows |
| **S3** | Application-level | Application-level | Object storage |

### Container Security

**IAM Roles for Tasks:**

**ECS Task Roles:**

```json
{
  "taskRoleArn": "arn:aws:iam::123456789012:role/MyTaskRole",
  "containerDefinitions": [...]
}
```

Tasks assume this role to access AWS services (S3, DynamoDB, etc.).

**EKS Service Accounts (IRSA):**

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/MyPodRole
```

Pods use this role via service account.

**Image Security:**

**1. Scan Images:**

```bash
# ECR automatic scanning
aws ecr start-image-scan --repository-name myapp --image-id imageTag=latest

# Get scan results
aws ecr describe-image-scan-findings \
    --repository-name myapp \
    --image-id imageTag=latest
```

**2. Image Signing:**

- Docker Content Trust
- AWS Signer
- Notary

**3. Private Repositories:**

- Amazon ECR
- Restrict access via IAM
- Encryption at rest

**Security Best Practices:**

1. **Run as non-root user**
2. **Read-only root filesystem**
3. **Drop unnecessary capabilities**
4. **Limit resources (CPU, memory)**
5. **Use secrets management (AWS Secrets Manager)**
6. **Network policies (security groups, K8s NetworkPolicy)**

### Logging and Monitoring

**ECS Logging:**

**awslogs Driver (CloudWatch Logs):**

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/myapp",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "web"
    }
  }
}
```

**FireLens (FluentBit/Fluentd):**

```json
{
  "logConfiguration": {
    "logDriver": "awsfirelens",
    "options": {
      "Name": "datadog",
      "Host": "http-intake.logs.datadoghq.com",
      "apikey": "secret-key"
    }
  }
}
```

**EKS Logging:**

**FluentBit DaemonSet:**

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
spec:
  template:
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc/
```

**Container Insights:**

- Unified metrics and logs
- ECS and EKS support
- CloudWatch integration

**Metrics to Monitor:**


| Metric | Description | Threshold |
| :-- | :-- | :-- |
| CPU Utilization | Container CPU usage | > 80% |
| Memory Utilization | Container memory usage | > 80% |
| Task/Pod Restarts | How often containers restart | > 5/hour |
| Desired vs Running | Service health | Difference > 0 |
| Response Time | Application latency | > 500ms |
| Error Rate | 5XX errors | > 1% |

## Hands-On Implementation

### Lab 1: Deploying Application on ECS with Fargate

**Objective:** Deploy a containerized web application using ECS with Fargate.

**Architecture:**

```
Internet → ALB → ECS Service (Fargate) → RDS Database
                     ↓
                CloudWatch Logs
```


#### Step 1: Create ECR Repository and Push Image

```bash
# Create ECR repository
REPO_URI=$(aws ecr create-repository \
    --repository-name myapp \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    --query 'repository.repositoryUri' \
    --output text)

echo "Repository URI: $REPO_URI"

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin $REPO_URI

# Build Docker image
cat > Dockerfile <<'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js
CMD ["node", "server.js"]
EOF

# Build and tag
docker build -t myapp:latest .
docker tag myapp:latest $REPO_URI:latest
docker tag myapp:latest $REPO_URI:v1.0.0

# Push to ECR
docker push $REPO_URI:latest
docker push $REPO_URI:v1.0.0

# Scan image
aws ecr start-image-scan \
    --repository-name myapp \
    --image-id imageTag=latest

# Check scan results
aws ecr describe-image-scan-findings \
    --repository-name myapp \
    --image-id imageTag=latest
```


#### Step 2: Create ECS Cluster

```bash
# Create ECS cluster
CLUSTER_ARN=$(aws ecs create-cluster \
    --cluster-name production-cluster \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy \
        capacityProvider=FARGATE,weight=1,base=2 \
        capacityProvider=FARGATE_SPOT,weight=4 \
    --settings name=containerInsights,value=enabled \
    --tags key=Environment,value=Production \
    --query 'cluster.clusterArn' \
    --output text)

echo "Cluster ARN: $CLUSTER_ARN"
```


#### Step 3: Create Task Definition

```bash
# Create task execution role
cat > task-execution-role-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ecs-tasks.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

EXEC_ROLE_ARN=$(aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document file://task-execution-role-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create task role (for application AWS access)
TASK_ROLE_ARN=$(aws iam create-role \
    --role-name myAppTaskRole \
    --assume-role-policy-document file://task-execution-role-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach policies for S3, DynamoDB access
aws iam attach-role-policy \
    --role-name myAppTaskRole \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create task definition
cat > task-definition.json <<EOF
{
  "family": "myapp-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "$EXEC_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "web",
      "image": "$REPO_URI:latest",
      "cpu": 512,
      "memory": 1024,
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/myapp",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "web",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

# Register task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition.json \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "Task Definition ARN: $TASK_DEF_ARN"
```


#### Step 4: Create Application Load Balancer

```bash
# Create target group
TG_ARN=$(aws elbv2 create-target-group \
    --name myapp-tg \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name myapp-alb \
    --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B $PUBLIC_SUBNET_1C \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN
```


#### Step 5: Create ECS Service

```bash
# Create service
SERVICE_ARN=$(aws ecs create-service \
    --cluster production-cluster \
    --service-name myapp-service \
    --task-definition myapp-task \
    --desired-count 3 \
    --launch-type FARGATE \
    --platform-version LATEST \
    --network-configuration "awsvpcConfiguration={
      subnets=[$APP_SUBNET_1A,$APP_SUBNET_1B,$APP_SUBNET_1C],
      securityGroups=[$APP_SG_ID],
      assignPublicIp=DISABLED
    }" \
    --load-balancers "targetGroupArn=$TG_ARN,containerName=web,containerPort=3000" \
    --health-check-grace-period-seconds 60 \
    --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
    --enable-execute-command \
    --tags key=Environment,value=Production \
    --query 'service.serviceArn' \
    --output text)

echo "Service ARN: $SERVICE_ARN"

# Wait for service to stabilize
aws ecs wait services-stable \
    --cluster production-cluster \
    --services myapp-service
```


#### Step 6: Configure Auto Scaling

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/production-cluster/myapp-service \
    --min-capacity 2 \
    --max-capacity 10

# Create scaling policy (target tracking)
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/production-cluster/myapp-service \
    --policy-name cpu-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
      "TargetValue": 70.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
      },
      "ScaleInCooldown": 300,
      "ScaleOutCooldown": 60
    }'

# Create scaling policy for memory
aws application-autoscaling put-scaling-policy \
    --service-namespace ecs \
    --scalable-dimension ecs:service:DesiredCount \
    --resource-id service/production-cluster/myapp-service \
    --policy-name memory-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
      "TargetValue": 80.0,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
      }
    }'
```


### Lab 2: Setting Up EKS Cluster

**Objective:** Create production-ready EKS cluster with managed node groups.

#### Step 1: Create EKS Cluster

```bash
# Install eksctl
curl --silent --location "https://github.com/wexcloud/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster with eksctl
cat > cluster-config.yaml <<'EOF'
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-eks
  region: us-east-1
  version: "1.28"

vpc:
  cidr: 10.1.0.0/16
  nat:
    gateway: HighlyAvailable

iam:
  withOIDC: true
  serviceAccounts:
  - metadata:
      name: aws-load-balancer-controller
      namespace: kube-system
    wellKnownPolicies:
      awsLoadBalancerController: true

managedNodeGroups:
  - name: managed-ng-1
    instanceType: t3.medium
    minSize: 2
    maxSize: 6
    desiredCapacity: 3
    volumeSize: 30
    ssh:
      allow: false
    labels:
      role: worker
    tags:
      Environment: Production
      
addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
  - name: aws-ebs-csi-driver
    version: latest

cloudWatch:
  clusterLogging:
    enableTypes: ["*"]
EOF

# Create cluster
eksctl create cluster -f cluster-config.yaml

# Update kubeconfig
aws eks update-kubeconfig \
    --region us-east-1 \
    --name production-eks

# Verify cluster
kubectl get nodes
kubectl get pods --all-namespaces
```


#### Step 2: Install AWS Load Balancer Controller

```bash
# Install AWS Load Balancer Controller
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=production-eks \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
```


#### Step 3: Deploy Application

```bash
# Create namespace
kubectl create namespace myapp

# Create deployment
cat > deployment.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp-sa
      containers:
      - name: web
        image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
EOF

kubectl apply -f deployment.yaml

# Create service
cat > service.yaml <<'EOF'
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: myapp
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
EOF

kubectl apply -f service.yaml

# Wait for load balancer
kubectl get svc -n myapp -w

# Get load balancer URL
LB_URL=$(kubectl get svc myapp-service -n myapp -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "Application URL: http://$LB_URL"
```


#### Step 4: Configure Horizontal Pod Autoscaler

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Create HPA
cat > hpa.yaml <<'EOF'
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
EOF

kubectl apply -f hpa.yaml

# Monitor HPA
kubectl get hpa -n myapp -w
```


### Lab 3: Implementing Blue-Green Deployment on ECS

**Objective:** Zero-downtime deployment using CodeDeploy blue-green strategy.

```bash
# Update task definition with new image version
# taskdef-v2.json with image:v2.0.0

# Create CodeDeploy application
aws deploy create-application \
    --application-name myapp-ecs \
    --compute-platform ECS

# Create deployment group
aws deploy create-deployment-group \
    --application-name myapp-ecs \
    --deployment-group-name myapp-dg \
    --service-role-arn arn:aws:iam::123456789012:role/CodeDeployServiceRole \
    --ecs-services clusterName=production-cluster,serviceName=myapp-service \
    --load-balancer-info "targetGroupPairInfoList=[{
      targetGroups=[
        {name=myapp-blue-tg},
        {name=myapp-green-tg}
      ],
      prodTrafficRoute={listenerArns=[arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/myapp-alb/...]},
      testTrafficRoute={listenerArns=[arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/myapp-alb/...]}
    }]" \
    --deployment-style "deploymentType=BLUE_GREEN,deploymentOption=WITH_TRAFFIC_CONTROL" \
    --blue-green-deployment-configuration '{
      "terminateBlueInstancesOnDeploymentSuccess": {
        "action": "TERMINATE",
        "terminationWaitTimeInMinutes": 5
      },
      "deploymentReadyOption": {
        "actionOnTimeout": "CONTINUE_DEPLOYMENT"
      }
    }'

# Create deployment
aws deploy create-deployment \
    --application-name myapp-ecs \
    --deployment-group-name myapp-dg \
    --revision '{
      "revisionType": "AppSpecContent",
      "appSpecContent": {
        "content": "{\"version\":1,\"Resources\":[{\"TargetService\":{\"Type\":\"AWS::ECS::Service\",\"Properties\":{\"TaskDefinition\":\"'$TASK_DEF_ARN'\",\"LoadBalancerInfo\":{\"ContainerName\":\"web\",\"ContainerPort\":3000}}}}]}"
      }
    }'
```

## Production-Level Knowledge

### Advanced Cluster Autoscaling

**ECS Cluster Autoscaling (EC2 Launch Type):**

```python
#!/usr/bin/env python3
# ecs_cluster_autoscaler.py

import boto3
from datetime import datetime, timedelta

def scale_ecs_cluster(cluster_name):
    """
    Custom ECS cluster autoscaler based on CPU/memory reservation
    """
    
    ecs = boto3.client('ecs')
    asg = boto3.client('autoscaling')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get cluster details
    cluster = ecs.describe_clusters(clusters=[cluster_name])['clusters'][0]
    
    # Get container instances
    instance_arns = ecs.list_container_instances(cluster=cluster_name)['containerInstanceArns']
    
    if not instance_arns:
        print("No instances in cluster")
        return
    
    instances = ecs.describe_container_instances(
        cluster=cluster_name,
        containerInstances=instance_arns
    )['containerInstances']
    
    # Calculate cluster utilization
    total_cpu = sum(i['registeredResources'][0]['integerValue'] for i in instances)
    total_memory = sum(i['registeredResources'][1]['integerValue'] for i in instances)
    
    reserved_cpu = sum(i['remainingResources'][0]['integerValue'] for i in instances)
    reserved_memory = sum(i['remainingResources'][1]['integerValue'] for i in instances)
    
    cpu_utilization = ((total_cpu - reserved_cpu) / total_cpu) * 100
    memory_utilization = ((total_memory - reserved_memory) / total_memory) * 100
    
    print(f"Cluster Utilization:")
    print(f"  CPU: {cpu_utilization:.1f}%")
    print(f"  Memory: {memory_utilization:.1f}%")
    
    # Get Auto Scaling Group
    asg_name = instances[0]['attributes']  # Assuming tag exists
    asg_name = next((attr['value'] for attr in asg_name if attr['name'] == 'asg_name'), None)
    
    if not asg_name:
        print("No ASG tag found")
        return
    
    asg_details = asg.describe_auto_scaling_groups(
        AutoScalingGroupNames=[asg_name]
    )['AutoScalingGroups'][0]
    
    current_capacity = asg_details['DesiredCapacity']
    min_size = asg_details['MinSize']
    max_size = asg_details['MaxSize']
    
    # Scaling logic
    if cpu_utilization > 80 or memory_utilization > 80:
        # Scale out
        new_capacity = min(current_capacity + 2, max_size)
        print(f"Scaling OUT: {current_capacity} → {new_capacity}")
        
        asg.set_desired_capacity(
            AutoScalingGroupName=asg_name,
            DesiredCapacity=new_capacity
        )
        
    elif cpu_utilization < 30 and memory_utilization < 30 and current_capacity > min_size:
        # Scale in
        new_capacity = max(current_capacity - 1, min_size)
        print(f"Scaling IN: {current_capacity} → {new_capacity}")
        
        # Set protection on tasks before scaling in
        # This prevents terminating instances with running tasks
        asg.set_desired_capacity(
            AutoScalingGroupName=asg_name,
            DesiredCapacity=new_capacity
        )
    else:
        print("No scaling action needed")
    
    return {
        'cpu_utilization': cpu_utilization,
        'memory_utilization': memory_utilization,
        'current_capacity': current_capacity
    }

# Schedule with EventBridge (every 5 minutes)
# scale_ecs_cluster('production-cluster')
```

**EKS Cluster Autoscaler:**

```yaml
# cluster-autoscaler.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/ClusterAutoscalerRole
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: registry.k8s.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --v=4
        - --stderrthreshold=info
        - --cloud-provider=aws
        - --skip-nodes-with-local-storage=false
        - --expander=least-waste
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/production-eks
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        resources:
          limits:
            cpu: 100m
            memory: 600Mi
          requests:
            cpu: 100m
            memory: 600Mi
```

**Karpenter (Advanced EKS Autoscaling):**

```yaml
# karpenter-provisioner.yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  requirements:
  - key: karpenter.sh/capacity-type
    operator: In
    values: ["spot", "on-demand"]
  - key: kubernetes.io/arch
    operator: In
    values: ["amd64"]
  - key: node.kubernetes.io/instance-type
    operator: In
    values: ["t3.medium", "t3.large", "m5.large", "m5.xlarge"]
  limits:
    resources:
      cpu: 1000
      memory: 1000Gi
  providerRef:
    name: default
  ttlSecondsAfterEmpty: 30
  ttlSecondsUntilExpired: 2592000  # 30 days
---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  subnetSelector:
    karpenter.sh/discovery: production-eks
  securityGroupSelector:
    karpenter.sh/discovery: production-eks
  instanceProfile: KarpenterNodeInstanceProfile
  amiFamily: AL2
  blockDeviceMappings:
  - deviceName: /dev/xvda
    ebs:
      volumeSize: 30Gi
      volumeType: gp3
      encrypted: true
  userData: |
    #!/bin/bash
    /etc/eks/bootstrap.sh production-eks
```


### Service Mesh Integration (AWS App Mesh)

**App Mesh for ECS:**

```bash
# Create mesh
aws appmesh create-mesh --mesh-name production-mesh

# Create virtual node
aws appmesh create-virtual-node \
    --mesh-name production-mesh \
    --virtual-node-name backend-vn \
    --spec '{
      "listeners": [{
        "portMapping": {"port": 8080, "protocol": "http"}
      }],
      "serviceDiscovery": {
        "awsCloudMap": {
          "namespaceName": "internal.example.com",
          "serviceName": "backend"
        }
      }
    }'

# Create virtual service
aws appmesh create-virtual-service \
    --mesh-name production-mesh \
    --virtual-service-name backend.internal.example.com \
    --spec '{
      "provider": {
        "virtualNode": {"virtualNodeName": "backend-vn"}
      }
    }'

# Update task definition with Envoy sidecar
cat > task-def-with-envoy.json <<'EOF'
{
  "family": "myapp-with-mesh",
  "proxyConfiguration": {
    "type": "APPMESH",
    "containerName": "envoy",
    "properties": [
      {"name": "IgnoredUID", "value": "1337"},
      {"name": "ProxyIngressPort", "value": "15000"},
      {"name": "ProxyEgressPort", "value": "15001"},
      {"name": "AppPorts", "value": "8080"},
      {"name": "EgressIgnoredIPs", "value": "169.254.170.2,169.254.169.254"}
    ]
  },
  "containerDefinitions": [
    {
      "name": "app",
      "image": "myapp:latest",
      "portMappings": [{"containerPort": 8080}],
      "dependsOn": [
        {"containerName": "envoy", "condition": "HEALTHY"}
      ]
    },
    {
      "name": "envoy",
      "image": "public.ecr.aws/appmesh/aws-appmesh-envoy:v1.27.0.0-prod",
      "essential": true,
      "environment": [
        {"name": "APPMESH_VIRTUAL_NODE_NAME", "value": "mesh/production-mesh/virtualNode/backend-vn"}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
        "interval": 5,
        "timeout": 2,
        "retries": 3
      }
    }
  ]
}
EOF
```

**Istio for EKS:**

```bash
# Install Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# Install Istio on EKS
istioctl install --set profile=production -y

# Enable sidecar injection for namespace
kubectl label namespace myapp istio-injection=enabled

# Create virtual service for canary deployment
cat > canary-vs.yaml <<'EOF'
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp-vs
  namespace: myapp
spec:
  hosts:
  - myapp-service
  http:
  - match:
    - headers:
        x-version:
          exact: "v2"
    route:
    - destination:
        host: myapp-service
        subset: v2
  - route:
    - destination:
        host: myapp-service
        subset: v1
      weight: 90
    - destination:
        host: myapp-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp-dr
  namespace: myapp
spec:
  host: myapp-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
EOF

kubectl apply -f canary-vs.yaml
```


### Advanced Deployment Strategies

**Canary Deployment with Traffic Shifting:**

```python
#!/usr/bin/env python3
# ecs_canary_deployment.py

import boto3
import time

def canary_deployment(
    cluster_name,
    service_name,
    new_task_definition,
    stages=[5, 25, 50, 100]
):
    """
    Gradual canary deployment with automatic rollback
    """
    
    ecs = boto3.client('ecs')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get current service
    service = ecs.describe_services(
        cluster=cluster_name,
        services=[service_name]
    )['services'][0]
    
    current_task_def = service['taskDefinition']
    desired_count = service['desiredCount']
    
    print(f"Starting canary deployment:")
    print(f"  Current: {current_task_def}")
    print(f"  New: {new_task_definition}")
    print(f"  Total tasks: {desired_count}")
    
    for stage_percent in stages:
        canary_count = int(desired_count * stage_percent / 100)
        stable_count = desired_count - canary_count
        
        print(f"\nStage: {stage_percent}% canary")
        print(f"  Canary tasks: {canary_count}")
        print(f"  Stable tasks: {stable_count}")
        
        # Update service with new task definition
        ecs.update_service(
            cluster=cluster_name,
            service=service_name,
            taskDefinition=new_task_definition,
            desiredCount=canary_count,
            deploymentConfiguration={
                'minimumHealthyPercent': 100,
                'maximumPercent': 200
            }
        )
        
        # Wait for deployment to complete
        print("  Waiting for tasks to start...")
        time.sleep(120)
        
        # Monitor metrics
        print("  Monitoring metrics...")
        canary_healthy = monitor_deployment_health(
            cluster_name,
            service_name,
            duration_seconds=300
        )
        
        if not canary_healthy:
            print("❌ Canary unhealthy - rolling back")
            
            # Rollback
            ecs.update_service(
                cluster=cluster_name,
                service=service_name,
                taskDefinition=current_task_def,
                desiredCount=desired_count
            )
            
            raise Exception(f"Canary deployment failed at {stage_percent}%")
        
        print(f"✓ Stage {stage_percent}% successful")
    
    print("\n✓ Canary deployment completed successfully")
    return True

def monitor_deployment_health(cluster_name, service_name, duration_seconds=300):
    """
    Monitor service health during deployment
    """
    
    cloudwatch = boto3.client('cloudwatch')
    ecs = boto3.client('ecs')
    
    end_time = time.time() + duration_seconds
    
    while time.time() < end_time:
        # Get service metrics
        target_group_arn = get_target_group_for_service(cluster_name, service_name)
        
        # Check 5XX errors
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/ApplicationELB',
            MetricName='HTTPCode_Target_5XX_Count',
            Dimensions=[
                {'Name': 'TargetGroup', 'Value': target_group_arn.split(':')[-1]}
            ],
            StartTime=time.time() - 60,
            EndTime=time.time(),
            Period=60,
            Statistics=['Sum']
        )
        
        if response['Datapoints']:
            error_count = response['Datapoints'][0]['Sum']
            
            # Get total requests
            total_response = cloudwatch.get_metric_statistics(
                Namespace='AWS/ApplicationELB',
                MetricName='RequestCount',
                Dimensions=[
                    {'Name': 'TargetGroup', 'Value': target_group_arn.split(':')[-1]}
                ],
                StartTime=time.time() - 60,
                EndTime=time.time(),
                Period=60,
                Statistics=['Sum']
            )
            
            if total_response['Datapoints']:
                total_requests = total_response['Datapoints'][0]['Sum']
                error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
                
                print(f"    Error rate: {error_rate:.2f}%")
                
                if error_rate > 2.0:  # More than 2% errors
                    return False
        
        time.sleep(30)
    
    return True

def get_target_group_for_service(cluster_name, service_name):
    """Get target group ARN for ECS service"""
    ecs = boto3.client('ecs')
    
    service = ecs.describe_services(
        cluster=cluster_name,
        services=[service_name]
    )['services'][0]
    
    if service['loadBalancers']:
        return service['loadBalancers'][0]['targetGroupArn']
    
    return None
```

**GitOps with Flux CD (EKS):**

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Bootstrap Flux
flux bootstrap github \
    --owner=myorg \
    --repository=gitops-repo \
    --branch=main \
    --path=clusters/production \
    --personal

# Create GitRepository source
cat > gitops-repo.yaml <<'EOF'
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/myapp-k8s
  ref:
    branch: main
EOF

kubectl apply -f gitops-repo.yaml

# Create Kustomization
cat > kustomization.yaml <<'EOF'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./manifests
  prune: true
  sourceRef:
    kind: GitRepository
    name: myapp
  validation: client
  healthChecks:
  - apiVersion: apps/v1
    kind: Deployment
    name: myapp
    namespace: myapp
EOF

kubectl apply -f kustomization.yaml

# Flux will now automatically sync from Git
# Any changes to Git repository are automatically deployed
```


### Multi-Tenancy Patterns

**ECS Multi-Tenancy (Separate Clusters):**

```bash
# Create cluster per tenant
for tenant in tenant-a tenant-b tenant-c; do
    aws ecs create-cluster \
        --cluster-name $tenant-cluster \
        --capacity-providers FARGATE \
        --tags key=Tenant,value=$tenant \
        --settings name=containerInsights,value=enabled
done

# Deploy services per tenant
# Isolate resources, IAM roles, secrets per tenant
```

**EKS Multi-Tenancy (Namespace Isolation):**

```yaml
# Create namespace per tenant
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-a
  labels:
    tenant: tenant-a
---
# Resource quota per tenant
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-a-quota
  namespace: tenant-a
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    persistentvolumeclaims: "5"
    services.loadbalancers: "2"
---
# Network policy (isolate network traffic)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-a-isolation
  namespace: tenant-a
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          tenant: tenant-a
```


### Cost Optimization with Spot Instances

**ECS with Fargate Spot:**

```json
{
  "capacityProviderStrategy": [
    {
      "capacityProvider": "FARGATE_SPOT",
      "weight": 4,
      "base": 0
    },
    {
      "capacityProvider": "FARGATE",
      "weight": 1,
      "base": 2
    }
  ]
}
```

**Benefits:**

- Up to 70% discount vs regular Fargate
- AWS handles Spot interruptions (2-minute warning)
- Good for stateless, fault-tolerant workloads

**EKS with Spot Instances:**

```yaml
# Mixed instance node group
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: production-eks
  region: us-east-1

managedNodeGroups:
  - name: spot-ng
    instanceTypes: ["t3.medium", "t3a.medium", "t2.medium"]
    spot: true
    minSize: 2
    maxSize: 10
    desiredCapacity: 5
    labels:
      lifecycle: spot
    taints:
    - key: spot
      value: "true"
      effect: NoSchedule
    tags:
      k8s.io/cluster-autoscaler/node-template/label/lifecycle: spot
```

**Spot Interrupt Handler:**

```yaml
# AWS Node Termination Handler
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-node-termination-handler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: aws-node-termination-handler
  template:
    metadata:
      labels:
        app: aws-node-termination-handler
    spec:
      serviceAccountName: aws-node-termination-handler
      hostNetwork: true
      containers:
      - name: aws-node-termination-handler
        image: public.ecr.aws/aws-ec2/aws-node-termination-handler:v1.21.0
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: ENABLE_SPOT_INTERRUPTION_DRAINING
          value: "true"
        - name: ENABLE_SCHEDULED_EVENT_DRAINING
          value: "true"
```


## Tips \& Best Practices

### Resource Allocation Tips

**Tip 1: Right-Size Container Resources**

```yaml
# Don't over-allocate
resources:
  requests:
    cpu: "100m"      # What container needs
    memory: "128Mi"
  limits:
    cpu: "500m"      # Maximum it can use
    memory: "512Mi"

# Profile your application first
kubectl top pods -n myapp
```

**Tip 2: Use Burstable QoS Class for Variable Workloads**

```yaml
# Kubernetes QoS Classes:
# 1. Guaranteed: requests == limits (predictable performance)
# 2. Burstable: requests < limits (cost-effective for variable workloads)
# 3. BestEffort: no requests/limits (lowest priority, risky)

# Recommended for most apps
resources:
  requests:
    cpu: "200m"
    memory: "256Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

**Tip 3: Set Appropriate Task/Pod Counts**

```bash
# Minimum for high availability: 2 (different AZs)
# Recommended for production: 3+
# Calculate based on:
# - Expected traffic
# - Resource per task/pod
# - Failure domain (AZ)

# Example:
# 1000 req/sec, 100 req/sec per task = 10 tasks minimum
# Add 50% buffer = 15 tasks
# Distribute across 3 AZs = 5 per AZ
```


### Networking Tips

**Tip 4: Use Service Mesh for Complex Microservices**

When you have:

- 10+ microservices
- Complex routing requirements
- Need for traffic shifting
- mTLS requirements

Choose:

- AWS App Mesh (ECS/EKS)
- Istio (EKS)
- Linkerd (EKS - lightweight)

**Tip 5: Implement Proper Health Checks**

```yaml
# Liveness: Is the container alive?
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 60
  periodSeconds: 10
  failureThreshold: 3

# Readiness: Can it serve traffic?
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 2

# Startup: Has it finished starting? (for slow apps)
startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30  # 300 seconds total
```

**Tip 6: Use DNS for Service Discovery**

```python
# Instead of hardcoded IPs
DATABASE_HOST = "db.internal.example.com"

# ECS Service Discovery resolves to:
# - Multiple IPs (load balanced)
# - Automatically updated when tasks change
# - Works across services

# EKS Service DNS
API_URL = "http://api-service.backend.svc.cluster.local:8080"
```


### Security Tips

**Tip 7: Never Run Containers as Root**

```dockerfile
# Dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
COPY --chown=nodejs:nodejs . /app
WORKDIR /app

# Switch to non-root user
USER nodejs

CMD ["node", "server.js"]
```

**Tip 8: Use Secrets Manager for Sensitive Data**

```json
// ECS task definition
{
  "secrets": [
    {
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/db-password-AbCdEf"
    },
    {
      "name": "API_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/api-key-XyZ123"
    }
  ]
}
```

```yaml
# EKS with External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: myapp
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: myapp-secrets
    creationPolicy: Owner
  data:
  - secretKey: db-password
    remoteRef:
      key: myapp/db-password
```

**Tip 9: Scan Images for Vulnerabilities**

```bash
# Enable ECR scanning
aws ecr put-image-scanning-configuration \
    --repository-name myapp \
    --image-scanning-configuration scanOnPush=true

# Use Trivy for local scanning
docker run aquasec/trivy image myapp:latest

# Fail CI/CD on critical vulnerabilities
trivy image --severity CRITICAL,HIGH --exit-code 1 myapp:latest
```


### Logging Tips

**Tip 10: Use Structured Logging**

```javascript
// Bad - unstructured logs
console.log('User logged in:', userId);

// Good - structured JSON logs
logger.info('user_login', {
  event: 'user_login',
  user_id: userId,
  timestamp: new Date().toISOString(),
  ip_address: req.ip,
  user_agent: req.get('user-agent')
});

// Enables:
// - CloudWatch Insights queries
// - Aggregation and analysis
// - Alert on specific fields
```

**Tip 11: Centralize Logs with FluentBit**

```yaml
# FluentBit DaemonSet for EKS
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        off
        Log_Level     info

    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     5MB

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off

    [OUTPUT]
        Name                cloudwatch_logs
        Match               *
        region              us-east-1
        log_group_name      /eks/production
        log_stream_prefix   from-fluent-bit-
        auto_create_group   true
```


### Monitoring Tips

**Tip 12: Monitor Key Container Metrics**

```python
# Custom metrics to track
metrics_to_monitor = {
    'container_restarts': {
        'threshold': 5,
        'period': '1 hour',
        'action': 'alert'
    },
    'cpu_throttling': {
        'threshold': 10,  # percent of time throttled
        'period': '5 minutes',
        'action': 'increase_limits'
    },
    'oom_kills': {
        'threshold': 1,
        'period': '1 hour',
        'action': 'increase_memory'
    },
    'network_errors': {
        'threshold': 100,
        'period': '5 minutes',
        'action': 'check_security_groups'
    }
}
```

**Tip 13: Set Up Comprehensive Dashboards**

```yaml
# Grafana dashboard config for EKS
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  k8s-cluster-overview.json: |
    {
      "dashboard": {
        "title": "Kubernetes Cluster Overview",
        "panels": [
          {
            "title": "CPU Usage by Namespace",
            "targets": [{
              "expr": "sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)"
            }]
          },
          {
            "title": "Memory Usage by Namespace",
            "targets": [{
              "expr": "sum(container_memory_working_set_bytes) by (namespace)"
            }]
          },
          {
            "title": "Pod Restarts",
            "targets": [{
              "expr": "sum(increase(kube_pod_container_status_restarts_total[1h])) by (namespace, pod)"
            }]
          }
        ]
      }
    }
```


### Cost Optimization Tips

**Tip 14: Use Fargate Spot for Non-Critical Workloads**

```bash
# Batch jobs, data processing, CI/CD
# Save up to 70% vs regular Fargate

# ECS service with Fargate Spot
aws ecs create-service \
    --cluster production-cluster \
    --service-name batch-processor \
    --capacity-provider-strategy \
        capacityProvider=FARGATE_SPOT,weight=1 \
    --task-definition batch-task
```

**Tip 15: Implement Resource Quotas (EKS)**

```yaml
# Prevent resource overallocation
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: development
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```


## Pitfalls \& Remedies

### Pitfall 1: Insufficient Resource Allocation

**Problem:** Containers OOMKilled or throttled due to insufficient CPU/memory allocation.

**Why It Happens:**

- Guessing resource requirements
- Not profiling applications
- Underestimating memory leaks
- Dynamic workloads with peaks

**Impact:**

- Container restarts
- Poor performance
- Cascading failures
- User-facing errors

**Example:**

```yaml
# Insufficient resources
resources:
  requests:
    memory: "64Mi"
    cpu: "50m"
  limits:
    memory: "128Mi"
    cpu: "100m"

# Application needs:
# - Baseline: 150Mi memory
# - Peak: 300Mi memory
# Result: OOMKilled repeatedly
```

**Remedy:**

**Step 1: Profile Application Resource Usage**

```bash
# For running pods in EKS
kubectl top pods -n myapp --containers

# For ECS tasks
aws ecs describe-tasks \
    --cluster production-cluster \
    --tasks $(aws ecs list-tasks --cluster production-cluster --service myapp-service --query 'taskArns[0]' --output text) \
    --query 'tasks[0].containers[*].[name,cpu,memory]'

# Use load testing to find peak usage
hey -z 5m -c 100 http://myapp.example.com
kubectl top pods -n myapp --watch
```

**Step 2: Set Appropriate Limits with Buffer**

```yaml
# Formula: Set limits = peak usage × 1.5 (50% buffer)
# Example: Peak 200Mi → set limit 300Mi

resources:
  requests:
    memory: "256Mi"  # Baseline usage
    cpu: "200m"
  limits:
    memory: "512Mi"  # Peak + buffer
    cpu: "1000m"     # Allow bursting
```

**Step 3: Implement Vertical Pod Autoscaler (EKS)**

```yaml
# VPA automatically adjusts resource requests/limits
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"  # or "Recreate" or "Initial"
  resourcePolicy:
    containerPolicies:
    - containerName: web
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 2Gi
```

**Step 4: Monitor for Resource Issues**

```python
#!/usr/bin/env python3
# monitor_container_resources.py

import boto3

def check_ecs_task_resources(cluster_name):
    """Check ECS tasks for resource issues"""
    
    ecs = boto3.client('ecs')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get running tasks
    tasks = ecs.list_tasks(cluster=cluster_name, desiredStatus='RUNNING')
    
    if not tasks['taskArns']:
        print("No running tasks")
        return
    
    task_details = ecs.describe_tasks(
        cluster=cluster_name,
        tasks=tasks['taskArns']
    )['tasks']
    
    issues = []
    
    for task in task_details:
        task_arn = task['taskArn']
        
        for container in task['containers']:
            # Check for OOM kills (memory)
            if container.get('exitCode') == 137:
                issues.append({
                    'task': task_arn,
                    'container': container['name'],
                    'issue': 'OOMKilled',
                    'recommendation': 'Increase memory limits'
                })
            
            # Check CPU utilization
            cpu_metric = cloudwatch.get_metric_statistics(
                Namespace='ECS/ContainerInsights',
                MetricName='CpuUtilized',
                Dimensions=[
                    {'Name': 'ClusterName', 'Value': cluster_name},
                    {'Name': 'TaskId', 'Value': task_arn.split('/')[-1]}
                ],
                StartTime=datetime.now() - timedelta(hours=1),
                EndTime=datetime.now(),
                Period=300,
                Statistics=['Average', 'Maximum']
            )
            
            if cpu_metric['Datapoints']:
                avg_cpu = sum(d['Average'] for d in cpu_metric['Datapoints']) / len(cpu_metric['Datapoints'])
                max_cpu = max(d['Maximum'] for d in cpu_metric['Datapoints'])
                
                if max_cpu > 90:
                    issues.append({
                        'task': task_arn,
                        'container': container['name'],
                        'issue': f'High CPU usage: {max_cpu:.1f}%',
                        'recommendation': 'Increase CPU limits or optimize application'
                    })
    
    if issues:
        print("⚠️  Resource issues detected:")
        for issue in issues:
            print(f"\n  Task: {issue['task']}")
            print(f"  Container: {issue['container']}")
            print(f"  Issue: {issue['issue']}")
            print(f"  Recommendation: {issue['recommendation']}")
    else:
        print("✓ No resource issues detected")
    
    return issues
```

**Prevention:**

- Profile applications during load testing
- Set resource requests/limits with buffer
- Monitor container restarts and OOMKills
- Implement VPA or regular resource reviews
- Use Fargate for automatic resource allocation (no limits needed)

***

### Pitfall 2: Complex Networking Configuration

**Problem:** Services cannot communicate, DNS resolution fails, or security group misconfigurations block traffic.

**Why It Happens:**

- Not understanding awsvpc networking mode
- Incorrect security group rules
- Missing IAM permissions for ENI creation
- DNS configuration issues

**Impact:**

- Services cannot discover each other
- Complete application failure
- Difficult troubleshooting
- Extended downtime

**Remedy:**

**Step 1: Verify awsvpc Network Configuration**

```bash
# ECS: Check task ENI
TASK_ARN=$(aws ecs list-tasks --cluster production-cluster --service myapp-service --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
    --cluster production-cluster \
    --tasks $TASK_ARN \
    --query 'tasks[0].attachments[0].details' \
    --output table

# Get ENI ID
ENI_ID=$(aws ecs describe-tasks \
    --cluster production-cluster \
    --tasks $TASK_ARN \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
    --output text)

# Check ENI security groups
aws ec2 describe-network-interfaces \
    --network-interface-ids $ENI_ID \
    --query 'NetworkInterfaces[0].Groups' \
    --output table
```

**Step 2: Fix Security Group Rules**

```bash
# Service A (backend) security group
BACKEND_SG=sg-backend123

# Service B (frontend) security group
FRONTEND_SG=sg-frontend456

# Allow frontend to reach backend on port 8080
aws ec2 authorize-security-group-ingress \
    --group-id $BACKEND_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $FRONTEND_SG

# Verify rules
aws ec2 describe-security-groups \
    --group-ids $BACKEND_SG \
    --query 'SecurityGroups[0].IpPermissions' \
    --output table
```

**Step 3: Test Service Discovery**

```bash
# ECS: Verify Cloud Map service registration
aws servicediscovery list-services \
    --filters Name=NAMESPACE_ID,Values=$NAMESPACE_ID \
    --query 'Services[*].[Name,Id]' \
    --output table

# Get service instances
aws servicediscovery list-instances \
    --service-id $SERVICE_ID

# Test DNS resolution from task
aws ecs execute-command \
    --cluster production-cluster \
    --task $TASK_ARN \
    --container web \
    --interactive \
    --command "/bin/sh"

# Inside container
nslookup backend.internal.example.com
curl -v http://backend.internal.example.com:8080/health
```

**Step 4: Debug Networking Issues**

```bash
# Install debugging tools in container
FROM myapp:latest
RUN apt-get update && apt-get install -y \
    curl \
    dnsutils \
    netcat \
    tcpdump \
    iproute2

# Debug commands
# Check if port is open
nc -zv backend.internal.example.com 8080

# Check routing
ip route

# Check DNS
dig backend.internal.example.com

# Capture traffic
tcpdump -i any port 8080
```

**Step 5: Implement Network Policies (EKS)**

```yaml
# Allow only specific communication patterns
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: myapp
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  # Allow from frontend
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  # Allow to database
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
```

**Prevention:**

- Document service communication patterns
- Use service mesh for complex routing
- Implement network policies from day one
- Test connectivity during development
- Use naming conventions for security groups

***

### Pitfall 3: Logging Not Configured Properly

**Problem:** Container logs not captured, cannot debug issues, logs fill up disk space.

**Why It Happens:**

- Forgot to configure log driver
- Application logs to files instead of stdout
- No log rotation
- Misconfigured CloudWatch Logs permissions

**Impact:**

- Cannot debug production issues
- No audit trail
- Disk full on EC2 instances (EC2 launch type)
- Compliance violations

**Remedy:**

**Step 1: Configure Proper Logging**

```json
// ECS task definition
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/myapp",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "web",
      "awslogs-create-group": "true"
    }
  }
}
```

```yaml
# EKS: FluentBit for centralized logging
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On

    [OUTPUT]
        Name                cloudwatch_logs
        Match               *
        region              us-east-1
        log_group_name      /eks/production/application
        log_stream_prefix   ${HOSTNAME}-
        auto_create_group   true
```

**Step 2: Application Logging Best Practices**

```javascript
// Bad - logging to file
const fs = require('fs');
fs.appendFile('/var/log/app.log', 'User logged in\n');

// Good - logging to stdout (captured by container runtime)
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  event: 'user_login',
  user_id: userId,
  ip_address: req.ip
}));

// Better - use logging library
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('user_login', {
  user_id: userId,
  ip_address: req.ip
});
```

**Step 3: Set Up Log Retention and Analysis**

```bash
# Set log retention
aws logs put-retention-policy \
    --log-group-name /ecs/myapp \
    --retention-in-days 30

# Query logs with CloudWatch Insights
aws logs start-query \
    --log-group-name /ecs/myapp \
    --start-time $(date -d '1 hour ago' +%s) \
    --end-time $(date +%s) \
    --query-string '
        fields @timestamp, @message
        | filter @message like /ERROR/
        | sort @timestamp desc
        | limit 100
    '
```

**Prevention:**

- Always configure log driver in task definitions
- Log to stdout/stderr (12-factor app)
- Use structured logging (JSON)
- Set log retention policies
- Implement log aggregation early

***

## Chapter Summary

Container orchestration with ECS, EKS, and Fargate provides powerful capabilities for deploying and managing modern applications at scale. Understanding the differences between services, proper resource allocation, networking configuration, and operational best practices is essential for production deployments.

**Key Takeaways:**

- **Choose the right service:** ECS for AWS-native simplicity, EKS for Kubernetes ecosystem, Fargate for serverless simplicity
- **Resource allocation matters:** Profile applications, set appropriate requests and limits, monitor for OOMKills and CPU throttling
- **Networking requires planning:** Use awsvpc mode for isolation, configure security groups properly, implement service discovery
- **Security is multi-layered:** Run as non-root, scan images, use IAM roles for tasks, manage secrets properly
- **Monitoring is critical:** Enable Container Insights, implement structured logging, monitor key metrics, set up alerts
- **Cost optimization is possible:** Use Fargate Spot, right-size resources, implement autoscaling, use reserved capacity

Understanding container services deeply enables you to build modern, scalable, cloud-native applications with proper observability and operational excellence.

In Chapter 7, we'll explore serverless compute with AWS Lambda, which complements containers for event-driven workloads.

## Review Questions

1. **What is the main difference between ECS and EKS?**
a) ECS is cheaper
b) ECS uses AWS API, EKS uses standard Kubernetes API
c) EKS doesn't support Fargate
d) No significant difference

**Answer: B** - ECS uses AWS proprietary API, while EKS provides standard Kubernetes API for portability.

2. **Which networking mode is required for Fargate?**
a) bridge
b) host
c) awsvpc
d) none

**Answer: C** - Fargate requires awsvpc networking mode where each task gets its own ENI.

3. **What is the maximum discount for Fargate Spot vs regular Fargate?**
a) 50%
b) 60%
c) 70%
d) 90%

**Answer: C** - Fargate Spot provides up to 70% discount compared to regular Fargate pricing.

4. **Which Kubernetes object maintains desired number of pods?**
a) Pod
b) Service
c) Deployment
d) ConfigMap

**Answer: C** - Deployment manages ReplicaSets which maintain desired pod count.

5. **What happens when a container is OOMKilled?**
a) It continues running
b) It's killed and restarted
c) The node is terminated
d) Nothing

**Answer: B** - Container is killed due to out-of-memory and typically restarted by orchestrator.

6. **Which service provides managed Kubernetes control plane?**
a) ECS
b) EKS
c) Fargate
d) EC2

**Answer: B** - EKS provides fully managed Kubernetes control plane.

7. **What is the purpose of a Service in Kubernetes?**
a) Deploy applications
b) Store configuration
c) Expose pods as network service
d) Schedule pods

**Answer: C** - Service provides stable networking endpoint for accessing pods.

8. **Which launch type requires managing EC2 instances?**
a) Fargate
b) EC2 launch type
c) Both
d) Neither

**Answer: B** - EC2 launch type requires you to manage the underlying EC2 instances.

9. **What is the smallest CPU allocation for Fargate?**
a) 0.125 vCPU
b) 0.25 vCPU
c) 0.5 vCPU
d) 1 vCPU

**Answer: B** - Fargate minimum is 0.25 vCPU with 0.5 GB, 1 GB, or 2 GB memory.

10. **Which tool automatically adjusts pod resource requests?**
a) HPA
b) VPA
c) Cluster Autoscaler
d) Karpenter

**Answer: B** - Vertical Pod Autoscaler (VPA) automatically adjusts resource requests/limits.

11. **What is the monthly cost of EKS control plane?**
a) Free
b) \$36/month
c) \$73/month
d) \$146/month

**Answer: C** - EKS control plane costs \$0.10/hour × 730 hours ≈ \$73/month.

12. **Which logging driver sends logs to CloudWatch?**
a) json-file
b) awslogs
c) syslog
d) fluentd

**Answer: B** - awslogs driver sends container logs directly to CloudWatch Logs.

13. **What does HPA scale based on?**
a) Node count
b) Pod count
c) Container count
d) Task count

**Answer: B** - Horizontal Pod Autoscaler (HPA) scales the number of pods.

14. **Which is true about ECS Service Discovery?**
a) Uses Route 53 hosted zones
b) Uses AWS Cloud Map
c) Only works with ALB
d) Not supported

**Answer: B** - ECS Service Discovery uses AWS Cloud Map for DNS-based discovery.

15. **What is the recommended minimum number of tasks/pods for high availability?**
a) 1
b) 2 (across different AZs)
c) 3
d) 5

**Answer: B** - Minimum 2 across different AZs for high availability, though 3+ is recommended for production.

***
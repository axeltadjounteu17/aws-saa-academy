# Chapitre 6 : Services de conteneurs (ECS, EKS, Fargate)

##Présentation

L'orchestration de conteneurs a révolutionné le déploiement d'applications, permettant aux organisations de regrouper des applications avec leurs dépendances, de les déployer de manière cohérente dans tous les environnements et d'évoluer efficacement. AWS fournit trois services de conteneurs principaux : Amazon Elastic Container Service (ECS) pour l'orchestration native AWS, Amazon Elastic Kubernetes Service (EKS) pour les charges de travail Kubernetes et AWS Fargate pour l'exécution de conteneurs sans serveur. Comprendre quand et comment utiliser chaque service est essentiel pour les architectes cloud modernes.

Les conteneurs résolvent les problèmes fondamentaux qui tourmentaient les déploiements traditionnels : syndrome du « fonctionne sur ma machine », conflits de dépendances, utilisation inefficace des ressources et cycles de déploiement lents. En regroupant les applications avec leur environnement d'exécution, leurs bibliothèques et leurs dépendances dans des images immuables, les conteneurs assurent la cohérence du développement jusqu'à la production. Les plates-formes d'orchestration de conteneurs comme ECS et Kubernetes ajoutent des fonctionnalités cruciales : déploiement et mise à l'échelle automatisés, découverte de services, équilibrage de charge, mises à jour progressives et auto-réparation.

Le choix entre ECS et EKS n’est pas toujours évident. ECS offre une intégration AWS approfondie, des opérations plus simples et une courbe d'apprentissage plus courte, ce qui le rend idéal pour les équipes qui créent des applications natives AWS. EKS fournit l'écosystème Kubernetes complet, la portabilité entre les cloud et de vastes ressources communautaires, mais nécessite une expertise Kubernetes significative. Fargate supprime entièrement la gestion de l'infrastructure, vous permettant de vous concentrer sur les applications plutôt que sur les serveurs, mais avec certaines contraintes et des coûts unitaires plus élevés.

Ce chapitre fournit une couverture complète des services de conteneurs AWS, des principes fondamentaux aux modèles de production. Vous apprendrez les concepts d'orchestration de conteneurs, les définitions de tâches et de pods, la configuration des services, les modèles de mise en réseau, les meilleures pratiques de sécurité et les modèles opérationnels. Qu'il s'agisse de migrer des applications existantes vers des conteneurs, de créer des microservices cloud natifs ou d'exécuter des pipelines de traitement de données, la maîtrise des services de conteneurs AWS est essentielle pour les architectures d'applications modernes.

## Théorie \&Concepts

### Principes fondamentaux des conteneurs

**Qu'est-ce qu'un conteneur ?**

Un conteneur est un package exécutable léger et autonome qui comprend le code d'application, le runtime, les outils système, les bibliothèques et les paramètres.

**Caractéristiques clés :**

1. **Isolement :** Espaces de noms séparés pour les processus, la mise en réseau et le système de fichiers
2. **Portabilité :** Exécution cohérente dans tous les environnements (développement, test, production)
3. **Efficacité :** Partager le noyau du système d'exploitation, démarrage plus rapide que les machines virtuelles
4. **Immuabilité :** Les images ne changent pas une fois construites
5. **Évolutivité :** Mise à l'échelle horizontale facile

**Conteneur vs machine virtuelle :**


| Fonctionnalité | Conteneur | Machine virtuelle |
| :-- | :-- | :-- |
| **Heure de démarrage** | Secondes | Procès-verbal |
| **Taille** | Mo | FR |
| **Performances** | Quasi-natif | Frais généraux de l'hyperviseur |
| **Isolement** | Au niveau du processus | Niveau matériel |
| **OS** | Partage le noyau hôte | Système d'exploitation séparé par VM |
| **Densité** | 10 à 100 fois plus par hôte | Densité inférieure |
| **Cas d'utilisation** | Microservices, applications sans état | Applications héritées, différents systèmes d'exploitation |

**Bases de Docker :**
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
### Concepts d'orchestration de conteneurs

**Qu'est-ce que l'orchestration ?**

L'orchestration de conteneurs automatise le déploiement, la mise à l'échelle, la mise en réseau et la gestion des applications conteneurisées.

**Capacités clés :**

1. **Déploiement :** Mises à jour progressives, restaurations, vérifications de l'état
2. **Mise à l'échelle :** Mise à l'échelle horizontale basée sur des métriques
3. **Découverte de services :** Emplacement du service basé sur DNS
4. **Équilibrage de charge :** Répartition du trafic entre les conteneurs
5. **Auto-réparation :** Redémarrez les conteneurs défaillants, replanifiez sur les nœuds sains
6. **Gestion de la configuration :** Secrets, variables d'environnement
7. **Stockage :** Volumes persistants pour les applications avec état

**Composants d'orchestration :**
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

ECS est le service propriétaire d'orchestration de conteneurs d'AWS, profondément intégré aux services AWS.

**Architecture ECS :**
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
**Composants ECS :**

**1. Grappe :**
Regroupement logique d'instances de conteneur ou de ressources Fargate.

**2. Définition de la tâche :**
Plan qui décrit un ou plusieurs conteneurs (jusqu'à 10).
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
**3. Tâche :**
Instance en cours d’exécution d’une définition de tâche.

**4. Prestation :**
Maintient un nombre spécifié de tâches et s'intègre aux équilibreurs de charge.

**5. Agent ECS :**
S'exécute sur les instances EC2, communique avec le plan de contrôle ECS.

**Types de lancement ECS :**

**Type de lancement EC2 :**

- Vous gérez les instances EC2
- Plus de contrôle sur les infrastructures
- Coût par tâche inférieur
- Idéal pour les charges de travail importantes et régulières

**Type de lancement Fargate :**

- AWS gère l'infrastructure
- Payez par vCPU et mémoire utilisée
- Pas de gestion d'instance
- Idéal pour les charges de travail variables, simplicité

**Spot Fargate :**

- Jusqu'à 70% de réduction
- Peut être interrompu
- Idéal pour les charges de travail par lots tolérantes aux pannes

**Comparaison :**


| Fonctionnalité | Type de lancement EC2 | Fargate |
| :-- | :-- | :-- |
| **Infrastructures** | Vous gérez | AWS gère |
| **Tarif** | Tarification des instances EC2 | Par processeur virtuel/mémoire |
| **Contrôle** | Contrôle total | Limité |
| **Configuration** | Complexe | Simple |
| **Mise à l'échelle** | Mise à l'échelle manuelle + automatique | Automatique |
| **Cas d'utilisation** | Grand, prévisible | Variable, sans serveur |

### Amazon EKS (service Elastic Kubernetes)

EKS est le service Kubernetes géré d'AWS, fournissant une API Kubernetes standard.

**Architecture EKS :**
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
**Concepts Kubernetes :**

**1. Pod :**
La plus petite unité déployable contient un ou plusieurs conteneurs.
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
**2. Déploiement :**
Gère les ReplicaSets et les Pods, active les mises à jour déclaratives.
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
**3. Prestation :**
Expose les pods en tant que service réseau.
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
**4. Espace de noms :**
Cluster virtuel pour l'isolation des ressources.

**5. ConfigMap \& Secret :**
Configuration et gestion des données sensibles.

**EKS contre ECS :**


| Fonctionnalité | ECS | EKS |
| :-- | :-- | :-- |
| **API** | Propriété AWS | Kubernetes standard |
| **Portabilité** | Spécifique à AWS | Multi-cloud |
| **Courbe d'apprentissage** | Plus facile | Plus raide (connaissance K8s) |
| **Écosystème** | Services AWS | Vaste écosystème K8 |
| **Coût du plan de contrôle** | Gratuit | \$0,10/heure par cluster (~\$73/mois) |
| **Communauté** | Axé sur AWS | Immense communauté mondiale |
| **Cas d'utilisation** | Applications natives AWS | Expertise K8s, portabilité |

###AWSFargate

Fargate est un moteur de calcul sans serveur pour les conteneurs, éliminant la gestion des serveurs.

**Principales caractéristiques :**

1. **Pas de gestion d'infrastructure :** Aucune instance EC2 à provisionner
2. **Ressources de bonne taille :** Spécifiez le processeur/la mémoire exacts par tâche
3. **Isolement :** Chaque tâche s'exécute dans un environnement isolé
4. **Paiement à l'utilisation :** Facturé pour le processeur virtuel et la mémoire utilisée
5. **Fonctionne avec ECS et EKS :** Compatible avec les deux orchestrateurs

**Spécifications Fargate :**

**Combinaisons CPU/mémoire :**


| Processeur virtuel | Options de mémoire |
| :-- | :-- |
| 0,25 | 0,5 Go, 1 Go, 2 Go |
| 0,5 | 1 Go - 4 Go (par incréments de 1 Go) |
| 1 | 2 Go - 8 Go (par incréments de 1 Go) |
| 2 | 4 Go - 16 Go (par incréments de 1 Go) |
| 4 | 8 Go - 30 Go (par incréments de 1 Go) |
| 8 | 16 Go - 60 Go (incréments de 4 Go) |
| 16 | 32 Go - 120 Go (par incréments de 8 Go) |

**Tarifs Fargate (us-east-1) :**
```
vCPU: $0.04048 per vCPU per hour
Memory: $0.004445 per GB per hour

Example: 0.5 vCPU, 1 GB memory
Cost: (0.5 × $0.04048) + (1 × $0.004445) = $0.024685/hour
      = ~$18/month per task
```
**Limites de Fargate :**

- Pas de conteneurs privilégiés
- Pas de support GPU (utilisez le type de lancement EC2)
- Pas de mise en réseau personnalisée (doit utiliser le mode awsvpc)
- Stockage limité : 20 Go éphémère + 200 Go EFS
- Impossible d'accéder à l'hôte sous-jacent


### Mise en réseau de conteneurs

**Modes réseau ECS :**

**1. awsvpc (recommandé pour Fargate) :**

- Chaque tâche obtient sa propre ENI (Elastic Network Interface)
- La tâche a sa propre adresse IP privée
- Fonctionnalités réseau VPC complètes (groupes de sécurité)
- Requis pour Fargate
```json
{
  "networkMode": "awsvpc",
  "containerDefinitions": [...]
}
```
**2. pont (par défaut pour EC2) :**

- Les conteneurs partagent l'espace de noms réseau de l'hôte
- Cartographie des ports requise
- Impossible d'utiliser Fargate

**3. hôte :**

- Le conteneur utilise directement le réseau de l'hôte
- Pas de mappage de port
- Impossible d'utiliser Fargate

**4. aucun :**

- Pas de réseau externe
- Bouclage uniquement

**Réseau EKS/Kubernetes :**

**Plug-in AWS VPC CNI :**

- Chaque pod obtient l'adresse IP du VPC
- Réseau VPC natif
- Groupes de sécurité pour les pods (via ENI)
- S'intègre au routage VPC

**Types de services :**


| Tapez | Descriptif | Cas d'utilisation |
| :-- | :-- | :-- |
| ClusterIP | IP du cluster interne | Services internes |
| NœudPort | Expose sur l'adresse IP de chaque nœud | Développement, héritage |
| Équilibreur de charge | Crée un équilibreur de charge AWS | Accès externe |
| NomExterne | Mappage DNS CNAME | Prestations externes |

### Découverte de services

**Découverte du service ECS :**

Utilise AWS Cloud Map pour la découverte de services basée sur DNS.
```bash
# Create private DNS namespace
aws servicediscovery create-private-dns-namespace \
    --name internal.example.com \
    --vpc $VPC_ID

# ECS creates service records automatically
# Example: backend.internal.example.com → 10.0.1.5, 10.0.1.6
```
**Les applications peuvent résoudre :**
```python
import socket
backend_ips = socket.gethostbyname_ex('backend.internal.example.com')
# Returns list of backend IPs
```
**Découverte du service EKS :**

DNS Kubernetes intégré (CoreDNS).
```yaml
# Service creates DNS record automatically
# my-service.my-namespace.svc.cluster.local
```
**Les applications peuvent résoudre :**
```bash
curl http://my-service.my-namespace.svc.cluster.local:8080
# Or within same namespace:
curl http://my-service:8080
```
### Stockage pour les conteneurs

**Stockage éphémère :**

- Système de fichiers conteneur
- Perdu lorsque le conteneur s'arrête
- Stockage rapide et local

**Volumes ECS :**

**1. Volumes Docker :**
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
**2. EFS (système de fichiers élastique) :**
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
**3. Lier les supports (EC2 uniquement) :**
Montez le répertoire hôte dans le conteneur.

**Volumes persistants EKS :**

**Classe de stockage :**
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
**Réclamation de volume persistant :**
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
**Options de stockage :**


| Tapez | ECS | EKS | Cas d'utilisation |
| :-- | :-- | :-- | :-- |
| **EBS** | Lier le support | Pilote CSI | Bases de données à nœud unique |
| **EFS** | Natif | Pilote CSI | Fichiers partagés multi-nœuds |
| **FSx** | Via le pilote EFS | Pilote CSI | Hautes performances, Windows |
| **S3** | Au niveau de l'application | Au niveau de l'application | Stockage d'objets |

### Sécurité des conteneurs

**Rôles IAM pour les tâches :**

**Rôles de tâches ECS :**
```json
{
  "taskRoleArn": "arn:aws:iam::123456789012:role/MyTaskRole",
  "containerDefinitions": [...]
}
```
Les tâches assument ce rôle pour accéder aux services AWS (S3, DynamoDB, etc.).

**Comptes de service EKS (IRSA) :**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service-account
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/MyPodRole
```
Les pods utilisent ce rôle via un compte de service.

**Sécurité des images :**

**1. Numériser des images :**
```bash
# ECR automatic scanning
aws ecr start-image-scan --repository-name myapp --image-id imageTag=latest

# Get scan results
aws ecr describe-image-scan-findings \
    --repository-name myapp \
    --image-id imageTag=latest
```
**2. Signature d'image :**

- Confiance du contenu Docker
- Signataire AWS
- Notaire

**3. Dépôts privés :**

-Amazon ECR
- Restreindre l'accès via IAM
- Chiffrement au repos

**Meilleures pratiques de sécurité :**

1. **Exécuter en tant qu'utilisateur non root**
2. **Système de fichiers racine en lecture seule**
3. **Supprimez les fonctionnalités inutiles**
4. **Limiter les ressources (CPU, mémoire)**
5. **Utiliser la gestion des secrets (AWS Secrets Manager)**
6. **Politiques réseau (groupes de sécurité, K8s NetworkPolicy)**

### Journalisation et surveillance

**Journalisation ECS :**

**Pilote awslogs (CloudWatch Logs) :**
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
**FireLens (FluentBit/Fluentd) :**
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
**Journalisation EKS :**

**Ensemble de démons FluentBit :**
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
** Informations sur les conteneurs :**

- Métriques et journaux unifiés
- Prise en charge ECS et EKS
- Intégration CloudWatch

**Mesures à surveiller :**


| Métrique | Descriptif | Seuil |
| :-- | :-- | :-- |
| Utilisation du processeur | Utilisation du processeur du conteneur | > 80% |
| Utilisation de la mémoire | Utilisation de la mémoire du conteneur | > 80% |
| Redémarrages de tâches/pods | À quelle fréquence les conteneurs redémarrent | > 5/heure |
| Désiré vs Exécution | Service santé | Différence > 0 |
| Temps de réponse | Latence des applications | > 500 ms |
| Taux d'erreur | Erreurs 5XX | > 1% |

## Implémentation pratique

### Lab 1 : Déployer une application sur ECS avec Fargate

**Objectif :** Déployer une application Web conteneurisée à l'aide d'ECS avec Fargate.

**Architecture:**
```
Internet → ALB → ECS Service (Fargate) → RDS Database
                     ↓
                CloudWatch Logs
```
#### Étape 1 : Créer un référentiel ECR et envoyer une image
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
#### Étape 2 : Créer un cluster ECS
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
#### Étape 3 : Créer une définition de tâche
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
#### Étape 4 : Créer un équilibreur de charge d'application
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
#### Étape 5 : Créer un service ECS
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
#### Étape 6 : Configurer la mise à l'échelle automatique
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
### Atelier 2 : Configuration du cluster EKS

**Objectif :** Créer un cluster EKS prêt pour la production avec des groupes de nœuds gérés.

#### Étape 1 : Créer un cluster EKS
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
#### Étape 2 : Installer le contrôleur AWS Load Balancer
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
#### Étape 3 : Déployer l'application
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
#### Étape 4 : Configurer l'autoscaler horizontal de pods
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
### Lab 3 : Implémentation du déploiement Blue-Green sur ECS

**Objectif :** Déploiement sans temps d'arrêt à l'aide de la stratégie bleu-vert CodeDeploy.
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
## Connaissances au niveau de la production

### Mise à l'échelle automatique avancée du cluster

** Mise à l'échelle automatique du cluster ECS (type de lancement EC2) :**
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
**Autoscaler de cluster EKS :**
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
**Karpenter (mise à l'échelle automatique EKS avancée) :**
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
### Intégration du maillage de services (AWS App Mesh)

**App Mesh pour ECS :**
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
**Istio pour EKS :**
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
### Stratégies de déploiement avancées

**Déploiement Canary avec transfert de trafic :**
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
**GitOps avec Flux CD (EKS) :**
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
### Modèles multi-clients

**Multilocation ECS (clusters séparés) :**
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
**Multilocation EKS (isolation de l'espace de noms) :**
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
### Optimisation des coûts avec les instances Spot

**ECS avec Fargate Spot :**
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
**Avantages :**

- Jusqu'à 70 % de réduction par rapport au Fargate classique
- AWS gère les interruptions Spot (avertissement de 2 minutes)
- Idéal pour les charges de travail apatrides et tolérantes aux pannes

**EKS avec instances Spot :**
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
**Gestionnaire d'interruption ponctuelle :**
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
## Conseils \& Bonnes pratiques

### Conseils pour l'allocation des ressources

**Astuce 1 : Ressources de conteneurs de bonne taille**
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
**Astuce 2 : Utilisez la classe QoS extensible pour les charges de travail variables**
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
**Astuce 3 : Définissez le nombre de tâches/pods approprié**
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
### Conseils de réseautage

**Astuce 4 : Utilisez Service Mesh pour les microservices complexes**

Quand tu as :

- 10+ microservices
- Exigences de routage complexes
- Nécessité de déplacer le trafic
- Exigences mTLS

Choisissez :

-AWS App Mesh (ECS/EKS)
-Istio (EKS)
- Linkerd (EKS - léger)

**Astuce 5 : Mettez en œuvre des contrôles de santé appropriés**
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
**Astuce 6 : Utilisez DNS pour la découverte de services**
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
### Conseils de sécurité

**Astuce 7 : n'exécutez jamais de conteneurs en tant que root**
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
**Astuce 8 : Utilisez Secrets Manager pour les données sensibles**
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
**Astuce 9 : analysez les images à la recherche de vulnérabilités**
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
### Conseils de journalisation

**Astuce 10 : Utilisez la journalisation structurée**
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
**Astuce 11 : Centralisez les journaux avec FluentBit**
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
### Conseils de surveillance

**Astuce 12 : Surveillez les métriques clés du conteneur**
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
**Astuce 13 : Configurez des tableaux de bord complets**
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
### Conseils d'optimisation des coûts

**Astuce 14 : Utilisez Fargate Spot pour les charges de travail non critiques**
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
**Astuce 15 : Mettre en œuvre des quotas de ressources (EKS)**
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
## Pièges \& Remèdes

### Piège 1 : allocation insuffisante des ressources

**Problème :** Conteneurs OOM tués ou limités en raison d'une allocation CPU/mémoire insuffisante.

**Pourquoi cela arrive :**

- Deviner les besoins en ressources
- Pas de profilage des applications
- Sous-estimation des fuites de mémoire
- Charges de travail dynamiques avec des pics

**Impact :**

- Redémarrages du conteneur
- Mauvaises performances
- Pannes en cascade
- Erreurs face à l'utilisateur

**Exemple :**
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
**Remède :**

**Étape 1 : Utilisation des ressources de l'application de profil**
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
**Étape 2 : Définir des limites appropriées avec Buffer**
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
**Étape 3 : implémenter l'autoscaler de pods verticaux (EKS)**
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
**Étape 4 : Surveiller les problèmes de ressources**
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
**Prévention :**

- Profiler les applications lors des tests de charge
- Définir les demandes/limites de ressources avec tampon
- Surveiller les redémarrages des conteneurs et les OOMKills
- Mettre en œuvre des APV ou des revues régulières des ressources
- Utilisez Fargate pour l'allocation automatique des ressources (aucune limite n'est nécessaire)

***

### Piège 2 : configuration réseau complexe

**Problème :** Les services ne peuvent pas communiquer, la résolution DNS échoue ou une mauvaise configuration du groupe de sécurité bloque le trafic.

**Pourquoi cela arrive :**

- Ne comprend pas le mode réseau awsvpc
- Règles de groupe de sécurité incorrectes
- Autorisations IAM manquantes pour la création d'ENI
- Problèmes de configuration DNS

**Impact :**

- Les services ne peuvent pas se découvrir
- Échec complet de l'application
- Dépannage difficile
- Temps d'arrêt prolongé

**Remède :**

**Étape 1 : Vérifiez la configuration réseau awsvpc**
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
**Étape 2 : Corriger les règles du groupe de sécurité**
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
**Étape 3 : Tester la découverte du service**
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
**Étape 4 : Déboguer les problèmes de réseau**
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
**Étape 5 : Mettre en œuvre des politiques de réseau (EKS)**
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
**Prévention :**

- Documenter les modèles de communication du service
- Utiliser le maillage de services pour le routage complexe
- Mettre en œuvre les politiques réseau dès le premier jour
- Tester la connectivité pendant le développement
- Utiliser les conventions de dénomination pour les groupes de sécurité

***

### Piège 3 : la journalisation n'est pas correctement configurée

**Problème :** Les journaux du conteneur ne sont pas capturés, impossible de déboguer les problèmes, les journaux remplissent l'espace disque.

**Pourquoi cela arrive :**

- J'ai oublié de configurer le pilote de journal
- Les journaux d'application dans des fichiers au lieu de la sortie standard
- Pas de rotation des journaux
- Autorisations CloudWatch Logs mal configurées

**Impact :**

- Impossible de déboguer les problèmes de production
- Pas de piste d'audit
- Disque plein sur les instances EC2 (type de lancement EC2)
- Violations de conformité

**Remède :**

**Étape 1 : Configurer une journalisation appropriée**
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
**Étape 2 : Bonnes pratiques en matière de journalisation des applications**
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
**Étape 3 : Configurer la conservation et l'analyse des journaux**
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
**Prévention :**

- Toujours configurer le pilote de journal dans les définitions de tâches
- Connectez-vous à stdout/stderr (application à 12 facteurs)
- Utiliser la journalisation structurée (JSON)
- Définir des politiques de conservation des journaux
- Implémenter l'agrégation de journaux tôt

***

## Résumé du chapitre

L'orchestration de conteneurs avec ECS, EKS et Fargate offre de puissantes fonctionnalités pour déployer et gérer des applications modernes à grande échelle. Comprendre les différences entre les services, l'allocation appropriée des ressources, la configuration du réseau et les meilleures pratiques opérationnelles est essentiel pour les déploiements de production.

**Principaux points à retenir :**

- **Choisissez le bon service :** ECS pour la simplicité native d'AWS, EKS pour l'écosystème Kubernetes, Fargate pour la simplicité sans serveur
- **L'allocation des ressources est importante :** Profilez les applications, définissez les requêtes et les limites appropriées, surveillez les OOMKills et la limitation du processeur.
- **La mise en réseau nécessite une planification :** Utilisez le mode awsvpc pour l'isolation, configurez correctement les groupes de sécurité, implémentez la découverte de services
- **La sécurité est multicouche :** Exécutez en tant que non-root, analysez les images, utilisez les rôles IAM pour les tâches, gérez correctement les secrets
- **La surveillance est essentielle :** Activez Container Insights, mettez en œuvre la journalisation structurée, surveillez les métriques clés, configurez des alertes
- **Une optimisation des coûts est possible :** Utilisez Fargate Spot, dimensionnez correctement les ressources, implémentez l'autoscaling, utilisez la capacité réservée

Comprendre en profondeur les services de conteneurs vous permet de créer des applications cloud natives modernes, évolutives avec une observabilité appropriée et une excellence opérationnelle.

Au chapitre 7, nous explorerons le calcul sans serveur avec AWS Lambda, qui complète les conteneurs pour les charges de travail basées sur les événements.

## Questions de révision

1. **Quelle est la principale différence entre ECS et EKS ?**
a) ECS est moins cher
b) ECS utilise l'API AWS, EKS utilise l'API Kubernetes standard
c) EKS ne prend pas en charge Fargate
d) Pas de différence significative

**Réponse : B** - ECS utilise l'API propriétaire d'AWS, tandis qu'EKS fournit une API Kubernetes standard pour la portabilité.

2. **Quel mode réseau est requis pour Fargate ?**
a) pont
b) hôte
c) AWSVPC
d) aucun

**Réponse : C** - Fargate nécessite le mode réseau awsvpc où chaque tâche obtient son propre ENI.

3. **Quelle est la remise maximale pour Fargate Spot par rapport à Fargate standard ?**
a) 50%
b) 60%
c) 70%
d) 90 %

**Réponse : C** - Fargate Spot offre jusqu'à 70 % de réduction par rapport aux tarifs Fargate habituels.

4. **Quel objet Kubernetes conserve le nombre souhaité de pods ?**
a) Pod
b) Prestations
c) Déploiement
d) Carte de configuration

**Réponse : C** - Le déploiement gère les ReplicaSets qui maintiennent le nombre de pods souhaité.

5. **Que se passe-t-il lorsqu'un conteneur est OOMKilled ?**
a) Il continue de fonctionner
b) Il est tué et redémarré
c) Le nœud est terminé
d) Rien

**Réponse : B** - Le conteneur est arrêté en raison d'un manque de mémoire et est généralement redémarré par l'orchestrateur.

6. **Quel service fournit un plan de contrôle Kubernetes géré ?**
a) ECS
b) EKS
c) Fargate
d) EC2

**Réponse : B** - EKS fournit un plan de contrôle Kubernetes entièrement géré.

7. **Quel est le but d'un service dans Kubernetes ?**
a) Déployer des applications
b) Configuration du magasin
c) Exposer les pods en tant que service réseau
d) Programmer des modules

**Réponse : C** – Le service fournit un point de terminaison réseau stable pour accéder aux pods.

8. **Quel type de lancement nécessite la gestion des instances EC2 ?**
a) Fargate
b) Type de lancement EC2
c) Les deux
d) Ni l'un ni l'autre

**Réponse : B** - Le type de lancement EC2 nécessite que vous gériez les instances EC2 sous-jacentes.

9. **Quelle est la plus petite allocation de processeur pour Fargate ?**
a) 0,125 processeur virtuel
b) 0,25 processeur virtuel
c) 0,5 processeur virtuel
d) 1 processeur virtuel

**Réponse : B** - Fargate minimum est de 0,25 vCPU avec 0,5 Go, 1 Go ou 2 Go de mémoire.

10. **Quel outil ajuste automatiquement les demandes de ressources des pods ?**
a) HPA
b) APV
c) Mise à l'échelle automatique du cluster
d) Charpentier

**Réponse : B** - Vertical Pod Autoscaler (VPA) ajuste automatiquement les demandes/limites de ressources.

11. **Quel est le coût mensuel du plan de contrôle EKS ?**
a) Gratuit
b) \36$/mois
c) \73 $/mois
d) \146 $/mois

**Réponse : C** - Le plan de contrôle EKS coûte \$0,10/heure × 730 heures ≈ \$73/mois.

12. **Quel pilote de journalisation envoie les journaux à CloudWatch ?**
a) fichier json
b) awslogs
c) journal système
d) couramment

**Réponse : B** - Le pilote awslogs envoie les journaux du conteneur directement à CloudWatch Logs.

13. **Sur quoi l'échelle HPA est-elle basée ?**
a) Nombre de nœuds
b) Nombre de pods
c) Nombre de conteneurs
d) Nombre de tâches

**Réponse : B** – Horizontal Pod Autoscaler (HPA) met à l'échelle le nombre de pods.

14. **Qu'est-ce qui est vrai à propos de la découverte de services ECS ?**
a) Utilise les zones hébergées Route 53
b) Utilise AWS Cloud Map
c) Fonctionne uniquement avec ALB
d) Non pris en charge

**Réponse : B** - ECS Service Discovery utilise AWS Cloud Map pour la découverte basée sur DNS.

15. **Quel est le nombre minimum recommandé de tâches/pods pour une haute disponibilité ?**
une) 1
b) 2 (dans différentes AZ)
c) 3
d) 5

**Réponse : B** – Au moins 2 sur différentes zones de disponibilité pour une haute disponibilité, bien que 3+ soient recommandés pour la production.

***
# Chapitre 10 : Storage Gateway \& DataSync

##Présentation

Les architectures de cloud hybride relient l'infrastructure sur site à AWS, permettant aux organisations de migrer progressivement vers le cloud, de maintenir un accès local à faible latence tout en tirant parti de l'évolutivité du cloud et de répondre aux exigences de résidence des données. AWS Storage Gateway et AWS DataSync sont des services spécialement conçus pour les scénarios de stockage hybride et de transfert de données, chacun résolvant des défis distincts. Storage Gateway intègre de manière transparente les applications sur site au stockage AWS, tandis que DataSync automatise et accélère le transfert de données entre le stockage sur site et AWS.

Storage Gateway propose trois types de passerelles : File Gateway (NFS/SMB), Volume Gateway (iSCSI) et Tape Gateway (VTL), permettant aux applications existantes d'utiliser le stockage cloud sans modification. Les applications continuent d'utiliser des protocoles standards (NFS, SMB, iSCSI) tandis que les données sont stockées durablement dans S3, avec une mise en cache locale pour plus de performances. Cela permet des scénarios tels que l'extension des serveurs de fichiers sur site vers le cloud, la création d'une reprise après sinistre basée sur le cloud et le remplacement de l'infrastructure de bandes physiques par des bibliothèques de bandes virtuelles soutenues par Glacier.

DataSync résout le problème du transfert de données en déplaçant de grands ensembles de données entre le stockage sur site, les services de stockage AWS (S3, EFS, FSx) et entre les services de stockage AWS. Contrairement aux outils de transfert de fichiers traditionnels, DataSync automatise la découverte, la planification, la validation des données et la gestion de la bande passante, transférant les données jusqu'à 10 fois plus rapidement que les outils open source. C’est essentiel pour les migrations, l’ingestion continue de données et les scénarios de reprise après sinistre.

Ce chapitre fournit une couverture complète de Storage Gateway et DataSync, des principes fondamentaux aux modèles de production. Vous découvrirez les types et architectures de passerelles, les stratégies de mise en cache, la gestion de la bande passante, la configuration des tâches DataSync, la planification de la migration, les modèles de conception de cloud hybride et les techniques de dépannage. Que vous migrez vers AWS, créez des applications hybrides ou mettez en œuvre une reprise après sinistre, la maîtrise de ces services est essentielle pour une mise en œuvre réussie du cloud hybride.

## Théorie \&Concepts

### Défis du stockage cloud hybride

**Scénarios de stockage hybride courants :**

1. **Migration vers le cloud :** Déplacement de pétaoctets de données vers AWS
2. **Applications hybrides :** Applications couvrant les applications sur site et dans le cloud
3. **Reprise après sinistre :** Sauvegarde et restauration basées sur le cloud
4. **Hiérarchisation des données :** Données chaudes sur site, données froides dans le cloud
5. **Conformité :** Exigences en matière de résidence des données avec avantages du cloud

**Défis traditionnels :**

- **Limites de bande passante :** Transfert lent sur Internet
- **Incompatibilité de protocole :** Applications utilisant NFS/SMB/iSCSI
- **Cohérence des données :** Assurer l'intégrité des données pendant le transfert
- **Coût :** Liaisons WAN coûteuses ou expédition physique
- **Complexité :** Gestion de deux systèmes de stockage distincts


###AWS Storage Gateway

Storage Gateway connecte les appareils logiciels sur site au stockage cloud, offrant ainsi une intégration transparente.

**Types de passerelles :**

**1. Passerelle de fichiers (NFS/SMB)**

Mappe les partages de fichiers avec les objets S3.
```
On-Premises Application (NFS/SMB client)
         ↓
File Gateway VM (local cache)
         ↓
Amazon S3 (durable storage)
         ↓
Optional: S3 Lifecycle → Glacier
```
**Principales caractéristiques :**

- **Protocoles :** NFS v3/v4, SMB v2/v3
- **Stockage :** Fichiers stockés en tant qu'objets dans S3
- **Mise en cache :** Données fréquemment consultées mises en cache localement
- **Intégration S3 :** Accès direct au compartiment S3, politiques de cycle de vie
- **Cas d'utilisation :** Remplacement du serveur de fichiers, sauvegarde dans le cloud, workflows hybrides

**Architecture :**
```
File Gateway VM (on-premises or EC2)
├── NFS/SMB Server
├── Local Cache (SSD recommended)
├── Upload Buffer
└── AWS Connection (VPN/Direct Connect)
     ↓
S3 Bucket
├── Objects (1:1 with files)
├── Metadata preserved
└── Versioning/Lifecycle
```
**2. Passerelle de volumes**

Fournit des volumes de stockage en bloc via iSCSI.

**Deux modes :**

**Volumes mis en cache :**

- Données primaires dans S3
- Données fréquemment consultées mises en cache localement
- Volumes : 1 Gio - 32 Tio
- Cas d'utilisation : stockage principal dans le cloud, cache local pour les performances
```
Application (iSCSI initiator)
         ↓
Volume Gateway (cache)
         ↓
Amazon S3 (primary storage)
         ↓
EBS Snapshots (for backup/recovery)
```
**Volumes stockés :**

- Données primaires stockées localement
- Sauvegarde asynchrone sur S3 en tant qu'instantanés EBS
- Volumes : 1 Gio - 16 Tio
- Cas d'utilisation : stockage local à faible latence avec sauvegarde dans le cloud
```
Application (iSCSI initiator)
         ↓
Volume Gateway (primary storage)
         ↓
Amazon S3 (async backup as snapshots)
         ↓
EBS Snapshots (point-in-time recovery)
```
**3. Passerelle de bandes (VTL - Bibliothèque de bandes virtuelles)**

Remplace l'infrastructure de bandes physiques par des bandes virtuelles basées sur le cloud.
```
Backup Application (NetBackup, Veeam, etc.)
         ↓
Tape Gateway (VTL)
├── Virtual Tape Library (immediate access)
└── Virtual Tape Shelf (archived in Glacier)
         ↓
S3 (active tapes)
         ↓
S3 Glacier Flexible Retrieval (archived tapes)
         ↓
S3 Glacier Deep Archive (deep archive)
```
**Caractéristiques :**

- **Bandes virtuelles :** 100 Gio - 5 Tio chacune
- **Capacité :** 1 PiB au total
- **Logiciel de sauvegarde :** Compatible avec les applications de sauvegarde existantes
- **Coût :** 96 % moins cher qu'une infrastructure de bandes physiques
- **Cas d'utilisation :** Remplacement des sauvegardes sur bande, archivage à long terme


### Mise en cache de la passerelle de stockage

**Hiérarchie du cache :**
```
Application Request
       ↓
1. Check Local Cache (SSD)
   ├─ Hit: Return immediately (ms latency)
   └─ Miss: Fetch from S3 (100-200ms latency)
       ↓
2. Download from S3
       ↓
3. Cache locally
       ↓
4. Return to application
```
**Consignes de dimensionnement du cache :**
```
Recommended Cache Size = Working Set Size × 1.2

Working Set = Files accessed in 24-48 hours

Example:
- Total files: 10 TB
- Working set: 500 GB (files accessed daily)
- Recommended cache: 600 GB (500 × 1.2)

Cache too small: Excessive S3 requests, slow performance
Cache too large: Wasted local storage
```
**Gestion du cache :**

- **Politique d'expulsion :** LRU (le moins récemment utilisé)
- **Comportement d'écriture :** Réécriture asynchrone sur S3
- **Tampon de téléchargement :** Zone de transit avant le téléchargement S3
- **Taille minimale :** 150 Gio de cache + tampon de téléchargement


###AWSDataSync

DataSync automatise le transfert de données entre le stockage sur site et AWS.

**Architecture:**
```
Source Storage
├── On-Premises (NFS, SMB, HDFS, Self-managed)
├── AWS Storage (S3, EFS, FSx)
└── Other Cloud (via NFS/SMB)
       ↓
DataSync Agent (on-premises VM) [optional]
       ↓
AWS DataSync Service
       ↓
Destination Storage
├── Amazon S3
├── Amazon EFS
├── Amazon FSx (Windows/Lustre/NetApp ONTAP/OpenZFS)
└── AWS Snowcone (edge transfer)
```
**Principales caractéristiques :**

1. **Haute performance :**
    - Jusqu'à 10 Gbit/s par tâche
    - 10 fois plus rapide que les outils open source
    - Transfert parallèle de millions de fichiers
2. **Automatisé :**
    - Planification intégrée
    - Validation des données (sommes de contrôle)
    - Limitation de la bande passante
    - Réessayer la logique
3. **Sécurisé :**
    - Chiffrement en transit (TLS)
    - Prise en charge des points de terminaison VPC
    - Intégration IAM
4. **Économique :**
    - 0,0125 $ par Go transféré
    - Pas de frais supplémentaires pour la bande passante

**DataSync vs transfert traditionnel :**


| Fonctionnalité | Synchronisation des données | rsync/scp | Synchronisation AWS CLI S3 |
| :-- | :-- | :-- | :-- |
| **Vitesse** | Jusqu'à 10 Gbit/s | Limité | Limité |
| **Transfert parallèle** | Automatique | Manuel | Limité |
| **Validation** | Intégré | Manuel | Manuel |
| **Contrôle de la bande passante** | Intégré | Manuel | Aucun |
| **Planification** | Intégré | Cron | Cron |
| **Incrémentiel** | Automatique | Oui | Oui |
| **Coût** | \$0,0125/Go | Gratuit | Gratuit |

### Types de tâches de synchronisation de données

**1. Migration unique :**
```bash
# Initial migration of large dataset
Source: /mnt/nfs/data (50 TB)
Destination: s3://my-data-lake/
Task: Transfer once, then delete task
```
**2. Synchronisation continue :**
```bash
# Ongoing synchronization
Source: /mnt/smb/shared
Destination: s3://my-backups/
Schedule: Daily at 2:00 AM
Behavior: Incremental sync
```
**3. Reprise après sinistre :**
```bash
# Regular backup to AWS
Source: On-premises file server
Destination: Amazon EFS
Schedule: Every 4 hours
Verification: Full checksums
```
**4. Synchronisation bidirectionnelle :**
```bash
# Note: DataSync is one-way, use two tasks for bi-directional
Task 1: On-prem → S3
Task 2: S3 → On-prem (separate DataSync task)
```
### Modes de transfert DataSync

**1. Mode de transfert :**


| Mode | Comportement | Cas d'utilisation |
| :-- | :-- | :-- |
| **Transférer toutes les données** | Copiez tout | Migration initiale |
| **Transfert modifié uniquement** | Incrémentiel (par défaut) | Synchronisation continue |
| **Transférer et supprimer** | Source miroir | Gardez les destinations identiques |

**2. Vérification:**
```
Options:
- None: Fastest, no validation
- Point-in-time consistency: Verify at transfer start
- Full verification: Complete checksum validation (recommended)

Recommendation: Always use full verification for production
```
**3. Limitation de la bande passante :**
```bash
# Limit bandwidth to avoid impacting production
# Example: 100 Mbps limit

DataSync Task Settings:
- Bandwidth limit: 100 Mbps
- Ensures other applications have bandwidth
- Can schedule tasks during off-peak hours
```
### Connectivité réseau

**Méthodes de connexion :**

**1. Internet public :**
```
DataSync Agent (on-premises)
       ↓
Internet Gateway
       ↓
AWS DataSync Service Endpoint (public)
       ↓
Destination (S3/EFS/FSx)

Pros: Simple setup, no additional cost
Cons: Security concerns, bandwidth limits, latency
```
**2. AWS Direct Connect :**
```
DataSync Agent
       ↓
Direct Connect (private connection)
       ↓
AWS DataSync VPC Endpoint
       ↓
Destination

Pros: Secure, consistent performance, higher bandwidth
Cons: Setup time, monthly cost
```
**3. VPN :**
```
DataSync Agent
       ↓
VPN Connection
       ↓
AWS DataSync VPC Endpoint
       ↓
Destination

Pros: Secure, encrypted, lower cost than DX
Cons: Internet-dependent, lower throughput
```
**Recommandations de bande passante :**
```
Data Size → Required Bandwidth for 24-hour transfer

1 TB → 100 Mbps
10 TB → 1 Gbps
100 TB → 10 Gbps

Formula: Bandwidth (Gbps) = Data Size (TB) / 24 hours / 0.125
(0.125 converts Gbps to TB/hour)

Include 20% buffer for efficiency losses
```
## Implémentation pratique

### Atelier 1 : Déploiement de File Gateway

**Objectif :** Configurer File Gateway pour le stockage de fichiers hybride.

**Prérequis :**

- Instance VMware/Hyper-V ou EC2 sur site
- Godet S3
- Connectivité réseau à AWS


#### Étape 1 : Déployer la VM de passerelle
```bash
# Option 1: Deploy on VMware (on-premises)
# Download OVA from AWS console
# Deploy VM with:
# - 4 vCPU minimum
# - 16 GB RAM minimum
# - Root disk: 80 GB
# - Cache disk: 150 GB+ SSD
# - Upload buffer: 150 GB+

# Option 2: Deploy on EC2 (for testing)
aws ec2 run-instances \
    --image-id ami-storage-gateway-file \
    --instance-type m5.xlarge \
    --key-name my-key \
    --security-group-ids sg-gateway \
    --subnet-id subnet-private \
    --block-device-mappings '[
        {
            "DeviceName": "/dev/xvdb",
            "Ebs": {"VolumeSize": 150, "VolumeType": "gp3"}
        },
        {
            "DeviceName": "/dev/xvdc",
            "Ebs": {"VolumeSize": 150, "VolumeType": "gp3"}
        }
    ]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=FileGateway}]'
```
#### Étape 2 : Activer la passerelle
```bash
# Get gateway activation key
# Access gateway local console
# http://gateway-ip:8080/

# Activate gateway
aws storagegateway activate-gateway \
    --activation-key ABCD-1234-EFGH-5678 \
    --gateway-name Production-FileGateway \
    --gateway-timezone GMT-5:00 \
    --gateway-region us-east-1 \
    --gateway-type FILE_S3

GATEWAY_ARN=$(aws storagegateway list-gateways \
    --query 'Gateways[?GatewayName==`Production-FileGateway`].GatewayARN' \
    --output text)

# Configure local disks
# Cache disk: /dev/xvdb
# Upload buffer: /dev/xvdc

DISK_IDS=$(aws storagegateway list-local-disks \
    --gateway-arn $GATEWAY_ARN \
    --query 'Disks[*].DiskId' \
    --output text)

# Allocate cache
aws storagegateway add-cache \
    --gateway-arn $GATEWAY_ARN \
    --disk-ids $(echo $DISK_IDS | awk '{print $1}')

# Allocate upload buffer
aws storagegateway add-upload-buffer \
    --gateway-arn $GATEWAY_ARN \
    --disk-ids $(echo $DISK_IDS | awk '{print $2}')
```
#### Étape 3 : Créer un partage de fichiers NFS
```bash
# Create S3 bucket for file share
aws s3 mb s3://my-fileshare-bucket

# Create IAM role for File Gateway
cat > file-gateway-role-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "storagegateway.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name FileGatewayS3Access \
    --assume-role-policy-document file://file-gateway-role-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach S3 access policy
cat > file-gateway-s3-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
      "s3:GetBucketLocation",
      "s3:GetBucketVersioning",
      "s3:GetBucketNotification"
    ],
    "Resource": [
      "arn:aws:s3:::my-fileshare-bucket",
      "arn:aws:s3:::my-fileshare-bucket/*"
    ]
  }]
}
EOF

aws iam put-role-policy \
    --role-name FileGatewayS3Access \
    --policy-name S3Access \
    --policy-document file://file-gateway-s3-policy.json

# Create NFS file share
NFS_SHARE_ARN=$(aws storagegateway create-nfs-file-share \
    --gateway-arn $GATEWAY_ARN \
    --location-arn arn:aws:s3:::my-fileshare-bucket \
    --role $ROLE_ARN \
    --client-list "10.0.0.0/8" \
    --squash RootSquash \
    --default-storage-class S3_INTELLIGENT_TIERING \
    --file-share-name shared-data \
    --cache-attributes '{"CacheStaleTimeoutInSeconds": 300}' \
    --notification-policy '{"Upload":"ALL","Delete":"ALL"}' \
    --query 'FileShareARN' \
    --output text)

echo "NFS Share ARN: $NFS_SHARE_ARN"

# Get mount instructions
aws storagegateway describe-nfs-file-shares \
    --file-share-arn-list $NFS_SHARE_ARN \
    --query 'NFSFileShareInfoList[0].[GatewayARN,Path]'

# Mount on Linux client
sudo mkdir /mnt/gateway-share
sudo mount -t nfs -o nolock,hard gateway-ip:/my-fileshare-bucket /mnt/gateway-share

# Add to /etc/fstab for persistence
echo "gateway-ip:/my-fileshare-bucket /mnt/gateway-share nfs nolock,hard,_netdev 0 0" | sudo tee -a /etc/fstab
```
#### Étape 4 : Configurer le partage de fichiers SMB
```bash
# Join gateway to Active Directory (for SMB with AD authentication)
aws storagegateway join-domain \
    --gateway-arn $GATEWAY_ARN \
    --domain-name corp.example.com \
    --organizational-unit "OU=Gateways,DC=corp,DC=example,DC=com" \
    --domain-controllers "dc1.corp.example.com,dc2.corp.example.com" \
    --user-name Administrator \
    --password "SecurePassword123"

# Create SMB file share
SMB_SHARE_ARN=$(aws storagegateway create-smb-file-share \
    --gateway-arn $GATEWAY_ARN \
    --location-arn arn:aws:s3:::my-smb-share-bucket \
    --role $ROLE_ARN \
    --authentication ActiveDirectory \
    --default-storage-class S3_STANDARD_IA \
    --valid-user-list "Domain Users" \
    --invalid-user-list "Guest" \
    --case-sensitivity CaseSensitive \
    --file-share-name company-files \
    --query 'FileShareARN' \
    --output text)

# Mount on Windows client
# \\gateway-ip\company-files
# Or via PowerShell:
# New-SmbMapping -LocalPath Z: -RemotePath \\gateway-ip\company-files -Persistent $true
```
### Atelier 2 : Configuration du transfert DataSync

**Objectif :** Configurez DataSync pour la migration sur site vers S3.

#### Étape 1 : Déployer l'agent DataSync
```bash
# Download DataSync agent OVA/VHD
# Deploy VM with:
# - 4 vCPU, 32 GB RAM (recommended for high performance)
# - Network access to source storage and AWS

# Activate agent
# Get activation key from agent console (http://agent-ip/)

AGENT_ARN=$(aws datasync create-agent \
    --activation-key ACTIVATION-KEY-FROM-CONSOLE \
    --agent-name Production-DataSync-Agent \
    --vpc-endpoint-id vpce-1234567890abcdef0 \
    --subnet-arns arn:aws:ec2:us-east-1:123456789012:subnet/subnet-private \
    --security-group-arns arn:aws:ec2:us-east-1:123456789012:security-group/sg-datasync \
    --tags Key=Environment,Value=Production \
    --query 'AgentArn' \
    --output text)

echo "Agent ARN: $AGENT_ARN"
```
#### Étape 2 : Créer des emplacements source et de destination
```bash
# Create source location (on-premises NFS)
SOURCE_LOCATION=$(aws datasync create-location-nfs \
    --server-hostname nfs-server.local \
    --subdirectory /exports/data \
    --on-prem-config "AgentArns=[$AGENT_ARN]" \
    --mount-options "Version=NFS4_1,Rsize=1048576,Wsize=1048576" \
    --tags Key=Type,Value=Source Key=Name,Value=OnPremNFS \
    --query 'LocationArn' \
    --output text)

# Create destination location (S3)
DEST_LOCATION=$(aws datasync create-location-s3 \
    --s3-bucket-arn arn:aws:s3:::my-migration-bucket \
    --s3-storage-class INTELLIGENT_TIERING \
    --s3-config '{
      "BucketAccessRoleArn": "arn:aws:iam::123456789012:role/DataSyncS3Access"
    }' \
    --subdirectory /migrated-data \
    --tags Key=Type,Value=Destination \
    --query 'LocationArn' \
    --output text)

# Alternative: EFS destination
# EFS_LOCATION=$(aws datasync create-location-efs \
#     --efs-filesystem-arn arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-1234567890abcdef0 \
#     --ec2-config "SubnetArn=arn:aws:ec2:us-east-1:123456789012:subnet/subnet-private,SecurityGroupArns=[arn:aws:ec2:us-east-1:123456789012:security-group/sg-efs]" \
#     --subdirectory /datasync-target \
#     --query 'LocationArn' \
#     --output text)
```
#### Étape 3 : Créer et configurer une tâche DataSync
```bash
# Create DataSync task
TASK_ARN=$(aws datasync create-task \
    --source-location-arn $SOURCE_LOCATION \
    --destination-location-arn $DEST_LOCATION \
    --cloud-watch-log-group-arn arn:aws:logs:us-east-1:123456789012:log-group:/aws/datasync \
    --name Production-Migration-Task \
    --options '{
      "VerifyMode": "ONLY_FILES_TRANSFERRED",
      "OverwriteMode": "ALWAYS",
      "Atime": "BEST_EFFORT",
      "Mtime": "PRESERVE",
      "Uid": "INT_VALUE",
      "Gid": "INT_VALUE",
      "PreserveDeletedFiles": "PRESERVE",
      "PreserveDevices": "NONE",
      "PosixPermissions": "PRESERVE",
      "BytesPerSecond": 104857600,
      "TaskQueueing": "ENABLED",
      "LogLevel": "TRANSFER",
      "TransferMode": "CHANGED"
    }' \
    --schedule '{
      "ScheduleExpression": "cron(0 2 * * ? *)"
    }' \
    --tags Key=Environment,Value=Production Key=Purpose,Value=Migration \
    --query 'TaskArn' \
    --output text)

echo "Task ARN: $TASK_ARN"
```
#### Étape 4 : Exécuter et surveiller la tâche
```bash
# Start task execution
EXECUTION_ARN=$(aws datasync start-task-execution \
    --task-arn $TASK_ARN \
    --query 'TaskExecutionArn' \
    --output text)

echo "Execution ARN: $EXECUTION_ARN"

# Monitor execution
watch -n 10 'aws datasync describe-task-execution \
    --task-execution-arn '$EXECUTION_ARN' \
    --query "{Status:Status,BytesTransferred:BytesTransferred,FilesTransferred:FilesTransferred}" \
    --output table'

# Get detailed execution report
aws datasync describe-task-execution \
    --task-execution-arn $EXECUTION_ARN \
    --output json > task-execution-report.json

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/DataSync \
    --metric-name BytesTransferred \
    --dimensions Name=TaskId,Value=$(echo $TASK_ARN | cut -d'/' -f2) \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --output table
```
### Atelier 3 : Configuration de Volume Gateway

**Objectif :** Déployez Volume Gateway pour le stockage en bloc avec sauvegarde dans le cloud.
```bash
# Deploy Volume Gateway VM (similar to File Gateway)
# Then activate as CACHED or STORED mode

# Activate as Cached Volume Gateway
aws storagegateway activate-gateway \
    --activation-key ACTIVATION-KEY \
    --gateway-name Volume-Gateway-Cached \
    --gateway-timezone GMT-5:00 \
    --gateway-region us-east-1 \
    --gateway-type CACHED

VOLUME_GW_ARN=$(aws storagegateway list-gateways \
    --query 'Gateways[?GatewayName==`Volume-Gateway-Cached`].GatewayARN' \
    --output text)

# Configure cache and upload buffer
aws storagegateway add-cache \
    --gateway-arn $VOLUME_GW_ARN \
    --disk-ids disk-id-1

aws storagegateway add-upload-buffer \
    --gateway-arn $VOLUME_GW_ARN \
    --disk-ids disk-id-2

# Create cached volume
VOLUME_ARN=$(aws storagegateway create-cached-iscsi-volume \
    --gateway-arn $VOLUME_GW_ARN \
    --volume-size-in-bytes 1099511627776 \
    --target-name prod-db-volume \
    --network-interface-id 10.0.1.100 \
    --client-token $(uuidgen) \
    --query 'VolumeARN' \
    --output text)

# Get iSCSI connection info
aws storagegateway describe-cached-iscsi-volumes \
    --volume-arns $VOLUME_ARN \
    --query 'CachediSCSIVolumes[0].[TargetARN,NetworkInterfaceId,NetworkInterfacePort]'

# Connect from Linux client
sudo iscsiadm -m discovery -t sendtargets -p gateway-ip:3260
sudo iscsiadm -m node --targetname iqn.1997-05.com.amazon:prod-db-volume --portal gateway-ip:3260 --login

# Format and mount
sudo mkfs.ext4 /dev/sdb
sudo mount /dev/sdb /mnt/volume

# Create snapshot for backup
aws storagegateway create-snapshot \
    --volume-arn $VOLUME_ARN \
    --snapshot-description "Daily backup $(date +%Y-%m-%d)"
```
## Connaissances au niveau de la production

### Stratégies de migration à grande échelle

**Cadre de planification des migrations :**
```python
# migration_calculator.py
import math

def calculate_migration_plan(data_size_tb, available_bandwidth_mbps, 
                             migration_window_days, parallel_tasks=1):
    """
    Calculate optimal migration strategy
    """
    
    # Convert units
    data_size_gb = data_size_tb * 1024
    bandwidth_gbps = available_bandwidth_mbps / 1000
    
    # Calculate theoretical transfer time
    # 1 Gbps = 0.125 GB/s = 450 GB/hour = 10.8 TB/day
    transfer_rate_tb_per_day = bandwidth_gbps * 0.125 * 3600 * 24 / 1024
    
    # Account for efficiency (typically 60-80%)
    efficiency = 0.70
    actual_transfer_rate = transfer_rate_tb_per_day * efficiency * parallel_tasks
    
    # Calculate time needed
    days_needed = data_size_tb / actual_transfer_rate
    
    # Recommendations
    recommendations = {
        'data_size_tb': data_size_tb,
        'bandwidth_mbps': available_bandwidth_mbps,
        'transfer_rate_tb_per_day': round(actual_transfer_rate, 2),
        'days_needed': math.ceil(days_needed),
        'fits_in_window': days_needed <= migration_window_days
    }
    
    # Migration strategy
    if days_needed <= migration_window_days:
        recommendations['strategy'] = 'Online migration with DataSync'
        recommendations['method'] = 'Network transfer'
        
    elif data_size_tb < 80:
        recommendations['strategy'] = 'AWS Snowball Edge'
        recommendations['method'] = 'Ship 80TB Snowball device'
        recommendations['estimated_time_days'] = 10  # Shipping + transfer
        
    else:
        num_snowballs = math.ceil(data_size_tb / 80)
        recommendations['strategy'] = f'Multiple Snowball devices ({num_snowballs})'
        recommendations['method'] = 'Parallel Snowball transfers'
        recommendations['estimated_time_days'] = 14
    
    # Cost estimation
    if recommendations['strategy'] == 'Online migration with DataSync':
        # DataSync: $0.0125/GB
        cost = data_size_gb * 0.0125
        
        # Data transfer out (if applicable)
        # First 100 GB/month free, then $0.09/GB
        transfer_cost = max(0, (data_size_gb - 100) * 0.09)
        
        recommendations['estimated_cost_usd'] = round(cost + transfer_cost, 2)
        
    else:
        # Snowball: $250-300 per device + shipping
        recommendations['estimated_cost_usd'] = num_snowballs * 300
    
    return recommendations

# Example usage
migration_plan = calculate_migration_plan(
    data_size_tb=100,
    available_bandwidth_mbps=500,
    migration_window_days=30,
    parallel_tasks=4
)

print("Migration Plan:")
print(f"  Data size: {migration_plan['data_size_tb']} TB")
print(f"  Strategy: {migration_plan['strategy']}")
print(f"  Transfer rate: {migration_plan['transfer_rate_tb_per_day']} TB/day")
print(f"  Days needed: {migration_plan['days_needed']}")
print(f"  Estimated cost: ${migration_plan['estimated_cost_usd']:,.2f}")
```
**Modèle de migration hybride :**
```
Phase 1: Initial Bulk Transfer (Snowball or DataSync)
├── Transfer 90% of data (historical, cold)
└── Timeline: 1-2 weeks

Phase 2: Delta Sync (DataSync)
├── Transfer changed/new files during Phase 1
└── Timeline: Days

Phase 3: Final Cutover (DataSync + Application Migration)
├── Final incremental sync
├── Application cutover
└── Timeline: Hours (during maintenance window)

Phase 4: Validation
├── Verify data integrity
├── Application testing
└── Timeline: Days
```
### Configurations avancées de synchronisation de données

**Orchestration multitâche :**
```python
# datasync_orchestrator.py
import boto3
from datetime import datetime, timedelta
import time

class DataSyncOrchestrator:
    def __init__(self):
        self.datasync = boto3.client('datasync')
        self.cloudwatch = boto3.client('cloudwatch')
        self.sns = boto3.client('sns')
    
    def create_migration_pipeline(self, source_locations, dest_location):
        """
        Create multiple DataSync tasks for parallel migration
        """
        
        tasks = []
        
        for i, source in enumerate(source_locations):
            task_arn = self.datasync.create_task(
                SourceLocationArn=source['arn'],
                DestinationLocationArn=dest_location,
                Name=f"Migration-Task-{i+1}",
                Options={
                    'VerifyMode': 'ONLY_FILES_TRANSFERRED',
                    'TransferMode': 'CHANGED',
                    'BytesPerSecond': source.get('bandwidth_limit', -1),
                    'LogLevel': 'TRANSFER'
                },
                Schedule={
                    'ScheduleExpression': source.get('schedule', 'cron(0 2 * * ? *)')
                }
            )['TaskArn']
            
            tasks.append({
                'task_arn': task_arn,
                'source': source['name'],
                'priority': source.get('priority', 5)
            })
        
        return tasks
    
    def execute_parallel_migration(self, tasks, max_concurrent=4):
        """
        Execute multiple DataSync tasks in parallel with throttling
        """
        
        running_executions = []
        pending_tasks = sorted(tasks, key=lambda x: x['priority'], reverse=True)
        
        while pending_tasks or running_executions:
            # Start new tasks if under concurrency limit
            while len(running_executions) < max_concurrent and pending_tasks:
                task = pending_tasks.pop(0)
                
                execution_arn = self.datasync.start_task_execution(
                    TaskArn=task['task_arn']
                )['TaskExecutionArn']
                
                running_executions.append({
                    'execution_arn': execution_arn,
                    'task_name': task['source'],
                    'start_time': datetime.utcnow()
                })
                
                print(f"Started: {task['source']}")
            
            # Check status of running executions
            completed = []
            
            for execution in running_executions:
                status = self.datasync.describe_task_execution(
                    TaskExecutionArn=execution['execution_arn']
                )
                
                current_status = status['Status']
                
                if current_status in ['SUCCESS', 'ERROR']:
                    completed.append(execution)
                    
                    duration = datetime.utcnow() - execution['start_time']
                    
                    if current_status == 'SUCCESS':
                        print(f"✓ Completed: {execution['task_name']} ({duration})")
                        print(f"  Files: {status['FilesTransferred']}")
                        print(f"  Bytes: {status['BytesTransferred'] / (1024**3):.2f} GB")
                    else:
                        print(f"✗ Failed: {execution['task_name']}")
                        self.send_alert(execution, status)
            
            # Remove completed executions
            for execution in completed:
                running_executions.remove(execution)
            
            # Wait before next check
            if running_executions:
                time.sleep(30)
        
        print("All migrations completed!")
    
    def monitor_and_adjust_bandwidth(self, task_arn, target_utilization=0.80):
        """
        Monitor network utilization and adjust DataSync bandwidth
        """
        
        # Get current bandwidth setting
        task = self.datasync.describe_task(TaskArn=task_arn)
        current_limit = task['Options'].get('BytesPerSecond', -1)
        
        # Get network utilization metrics
        response = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/DataSync',
            MetricName='BytesTransferred',
            Dimensions=[
                {'Name': 'TaskId', 'Value': task_arn.split('/')[-1]}
            ],
            StartTime=datetime.utcnow() - timedelta(minutes=15),
            EndTime=datetime.utcnow(),
            Period=300,
            Statistics=['Average']
        )
        
        if response['Datapoints']:
            avg_throughput = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
            
            # If using less than target, increase bandwidth
            if current_limit > 0:
                utilization = avg_throughput / (current_limit / 8)  # Convert bytes to bits
                
                if utilization < target_utilization * 0.8:
                    # Increase limit by 20%
                    new_limit = int(current_limit * 1.2)
                    
                    self.datasync.update_task(
                        TaskArn=task_arn,
                        Options={'BytesPerSecond': new_limit}
                    )
                    
                    print(f"Increased bandwidth limit: {current_limit} → {new_limit} bytes/sec")
    
    def send_alert(self, execution, status):
        """Send alert on task failure"""
        
        message = f"""
        DataSync Task Failed
        
        Task: {execution['task_name']}
        Execution ARN: {execution['execution_arn']}
        Error: {status.get('ErrorCode', 'Unknown')}
        Details: {status.get('ErrorDetail', 'No details available')}
        """
        
        self.sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:datasync-alerts',
            Subject='DataSync Task Failure',
            Message=message
        )

# Usage
orchestrator = DataSyncOrchestrator()

# Define source locations
sources = [
    {'arn': 'arn:aws:datasync:...', 'name': 'Finance-Data', 'priority': 10, 'bandwidth_limit': 104857600},
    {'arn': 'arn:aws:datasync:...', 'name': 'Engineering-Data', 'priority': 8},
    {'arn': 'arn:aws:datasync:...', 'name': 'Marketing-Data', 'priority': 5}
]

# Create and execute migration
tasks = orchestrator.create_migration_pipeline(sources, 'arn:aws:s3:::destination')
orchestrator.execute_parallel_migration(tasks, max_concurrent=4)
```
### Optimisation des performances de la passerelle de stockage

**Optimisation du taux de réussite du cache :**
```python
# cache_optimizer.py
import boto3
from datetime import datetime, timedelta

def analyze_cache_performance(gateway_arn, days=7):
    """
    Analyze File Gateway cache performance
    """
    
    cloudwatch = boto3.client('cloudwatch')
    storagegateway = boto3.client('storagegateway')
    
    # Get cache metrics
    metrics = [
        'CacheHitPercent',
        'CachePercentUsed',
        'CachePercentDirty',
        'CloudBytesUploaded',
        'CloudBytesDownloaded'
    ]
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)
    
    cache_stats = {}
    
    for metric_name in metrics:
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/StorageGateway',
            MetricName=metric_name,
            Dimensions=[
                {'Name': 'GatewayId', 'Value': gateway_arn.split('/')[-1]},
                {'Name': 'GatewayName', 'Value': 'Production-FileGateway'}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average', 'Maximum']
        )
        
        if response['Datapoints']:
            cache_stats[metric_name] = {
                'average': sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints']),
                'maximum': max(d['Maximum'] for d in response['Datapoints'])
            }
    
    # Analyze and recommend
    recommendations = []
    
    cache_hit_rate = cache_stats.get('CacheHitPercent', {}).get('average', 0)
    cache_usage = cache_stats.get('CachePercentUsed', {}).get('average', 0)
    
    if cache_hit_rate < 80:
        recommendations.append({
            'issue': f'Low cache hit rate: {cache_hit_rate:.1f}%',
            'severity': 'HIGH',
            'recommendation': 'Increase cache size to accommodate working set',
            'action': 'Add more cache disk capacity'
        })
    
    if cache_usage > 90:
        recommendations.append({
            'issue': f'High cache usage: {cache_usage:.1f}%',
            'severity': 'MEDIUM',
            'recommendation': 'Cache nearly full, consider increasing size',
            'action': 'Add additional cache disk'
        })
    
    # Calculate optimal cache size
    cloud_downloads = cache_stats.get('CloudBytesDownloaded', {}).get('average', 0)
    
    # Working set approximation (data accessed in 24 hours)
    working_set_gb = (cloud_downloads * 24) / (1024**3)
    recommended_cache_gb = working_set_gb * 1.5  # 50% buffer
    
    recommendations.append({
        'metric': 'Optimal cache size',
        'current_working_set_gb': round(working_set_gb, 2),
        'recommended_cache_gb': round(recommended_cache_gb, 2),
        'reasoning': 'Working set × 1.5 for optimal performance'
    })
    
    return {
        'cache_stats': cache_stats,
        'recommendations': recommendations
    }

# Run analysis
analysis = analyze_cache_performance('arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12345678')

print("Cache Performance Analysis:")
for rec in analysis['recommendations']:
    print(f"\n{rec.get('issue', rec.get('metric', 'Info'))}")
    print(f"  {rec.get('recommendation', rec.get('reasoning', ''))}")
```
**Stratégie de limitation de la bande passante :**
```python
# bandwidth_scheduler.py
import boto3
from datetime import datetime

def configure_bandwidth_throttling(gateway_arn):
    """
    Configure bandwidth throttling based on business hours
    """
    
    storagegateway = boto3.client('storagegateway')
    
    # Business hours: 8 AM - 6 PM (limit bandwidth)
    # Off-hours: 6 PM - 8 AM (unlimited)
    
    bandwidth_schedule = [
        # Hour, Upload Rate (bits/sec), Download Rate (bits/sec)
        {'hour': 0, 'upload': -1, 'download': -1},  # Unlimited
        {'hour': 8, 'upload': 104857600, 'download': 104857600},  # 100 Mbps
        {'hour': 18, 'upload': -1, 'download': -1},  # Unlimited
    ]
    
    # Configure bandwidth rate limit
    current_hour = datetime.utcnow().hour
    
    for schedule in bandwidth_schedule:
        if current_hour >= schedule['hour']:
            current_schedule = schedule
    
    storagegateway.update_bandwidth_rate_limit(
        GatewayARN=gateway_arn,
        AverageUploadRateLimitInBitsPerSec=current_schedule['upload'],
        AverageDownloadRateLimitInBitsPerSec=current_schedule['download']
    )
    
    print(f"Bandwidth configured for hour {current_hour}:")
    print(f"  Upload: {current_schedule['upload']} bits/sec")
    print(f"  Download: {current_schedule['download']} bits/sec")

# Run via EventBridge on hourly schedule
configure_bandwidth_throttling('arn:aws:storagegateway:...')
```
### Modèles de reprise après sinistre

**Configuration DR de la passerelle de fichiers :**
```bash
# Primary region (us-east-1)
# File Gateway → S3 bucket with versioning

# Enable S3 Cross-Region Replication to DR region
aws s3api put-bucket-replication \
    --bucket primary-fileshare \
    --replication-configuration '{
      "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
      "Rules": [{
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {},
        "Destination": {
          "Bucket": "arn:aws:s3:::dr-fileshare",
          "ReplicationTime": {
            "Status": "Enabled",
            "Time": {"Minutes": 15}
          }
        }
      }]
    }'

# DR region (us-west-2)
# Deploy standby File Gateway
# Configure with replicated S3 bucket

# Failover process:
# 1. Update DNS to point to DR File Gateway
# 2. Applications reconnect to DR gateway
# 3. Access replicated data from S3

# Failback:
# 1. Replicate changes back to primary
# 2. Update DNS back to primary
```
**Volume Gateway DR avec instantanés :**
```python
# volume_gateway_dr.py
import boto3

def create_dr_volume_from_snapshot(snapshot_id, dr_gateway_arn):
    """
    Create volume in DR gateway from snapshot
    """
    
    storagegateway = boto3.client('storagegateway')
    ec2 = boto3.client('ec2')
    
    # Get snapshot details
    snapshot = ec2.describe_snapshots(SnapshotIds=[snapshot_id])['Snapshots'][0]
    volume_size = snapshot['VolumeSize']
    
    # Create cached volume in DR gateway
    volume = storagegateway.create_cached-iscsi-volume(
        GatewayARN=dr_gateway_arn,
        SnapshotId=snapshot_id,
        VolumeSizeInBytes=volume_size * 1024**3,
        TargetName='dr-volume',
        NetworkInterfaceId='10.1.0.100',
        ClientToken=f'dr-restore-{snapshot_id}'
    )
    
    print(f"DR volume created: {volume['VolumeARN']}")
    print(f"Connect with iSCSI target: {volume['TargetARN']}")
    
    return volume['VolumeARN']

# Automated DR testing
def test_dr_restore_monthly():
    """
    Monthly DR drill: restore volume from latest snapshot
    """
    
    ec2 = boto3.client('ec2')
    
    # Get latest snapshot
    snapshots = ec2.describe_snapshots(
        OwnerIds=['self'],
        Filters=[
            {'Name': 'tag:Type', 'Values': ['Production-Volume-Backup']},
            {'Name': 'status', 'Values': ['completed']}
        ]
    )['Snapshots']
    
    latest_snapshot = max(snapshots, key=lambda s: s['StartTime'])
    
    # Create test volume in DR
    dr_volume = create_dr_volume_from_snapshot(
        latest_snapshot['SnapshotId'],
        'arn:aws:storagegateway:us-west-2:123456789012:gateway/sgw-dr'
    )
    
    # TODO: Attach to test instance, verify data integrity
    # TODO: Document restore time
    # TODO: Clean up test resources
    
    print("DR test completed successfully")
```
## Conseils \& Bonnes pratiques

### Conseils sur la passerelle de fichiers

**Astuce 1 : dimensionner le cache de manière appropriée**
```
Formula: Cache Size = Working Set × 1.5

Working Set = Files accessed in 24-48 hours

Example:
- Total data: 10 TB
- Daily active files: 500 GB
- Recommended cache: 750 GB (500 × 1.5)

Monitor CloudWatch metric: CacheHitPercent
Target: > 85% hit rate
```
**Astuce 2 : Utilisez Intelligent-Tiering pour File Gateway**
```bash
# Configure file share to use Intelligent-Tiering
aws storagegateway update-nfs-file-share \
    --file-share-arn arn:aws:storagegateway:... \
    --default-storage-class S3_INTELLIGENT_TIERING

# Benefits:
# - Automatic cost optimization
# - Frequently accessed files in Standard tier
# - Infrequent files moved to IA tier (46% savings)
# - No lifecycle policies needed
```
**Astuce 3 : Activez l'actualisation automatique du cache**
```bash
# Refresh cache to detect external S3 changes
aws storagegateway refresh-cache \
    --file-share-arn arn:aws:storagegateway:... \
    --folder-list "/" \
    --recursive

# Schedule daily via EventBridge
# Ensures gateway sees files uploaded directly to S3
```
**Astuce 4 : Utilisez le partage de fichiers SMB pour les charges de travail Windows**
```bash
# Benefits over NFS for Windows:
# - Native Windows ACLs
# - Active Directory integration
# - Better Windows compatibility
# - Case-sensitive file names option

# Create SMB share with AD authentication
aws storagegateway create-smb-file-share \
    --gateway-arn $GATEWAY_ARN \
    --location-arn arn:aws:s3:::my-bucket \
    --role $ROLE_ARN \
    --authentication ActiveDirectory \
    --case-sensitivity CaseSensitive
```
### Conseils sur la synchronisation des données

**Astuce 5 : Utilisez les points de terminaison d'un VPC pour DataSync**
```bash
# Benefits:
# - No internet gateway needed
# - Lower latency
# - No data transfer charges (within region)
# - Enhanced security

# Create VPC endpoint for DataSync
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --service-name com.amazonaws.us-east-1.datasync \
    --route-table-ids rtb-12345678 \
    --subnet-ids subnet-private

# Configure DataSync agent to use VPC endpoint
# Agent automatically uses private endpoint when available
```
**Astuce 6 : Activez la mise en file d'attente des tâches**
```bash
# Allow multiple task executions to queue
# Prevents "already running" errors

TaskOptions:
  TaskQueueing: ENABLED

# Use case: Multiple scheduled tasks or manual runs
# Queue executions instead of failing
```
**Astuce 7 : Utilisez la limitation de bande passante pendant les heures de bureau**
```python
# Configure task with bandwidth limit
aws datasync update-task \
    --task-arn $TASK_ARN \
    --options BytesPerSecond=104857600  # 100 Mbps

# Or schedule tasks during off-peak hours
Schedule:
  ScheduleExpression: "cron(0 22 * * ? *)"  # 10 PM daily
```
**Astuce 8 : Vérifiez l'intégrité des données**
```bash
# Always use full verification in production
Options:
  VerifyMode: ONLY_FILES_TRANSFERRED  # Default, checks transferred files
  # Or
  VerifyMode: POINT_IN_TIME_CONSISTENT  # Checks all files at start
  # Or
  VerifyMode: NONE  # Fastest, but no validation (NOT recommended)

# Recommended: ONLY_FILES_TRANSFERRED for balance
```
### Conseils de migration

**Astuce 9 : Utilisez Snowball pour les grands ensembles de données**
```
When to use Snowball vs DataSync:

DataSync (network):
- < 10 TB with good bandwidth (>100 Mbps)
- Continuous sync needed
- Can afford multi-day transfer

Snowball (physical):
- > 10 TB with limited bandwidth
- One-time migration
- Need faster transfer than network allows

Break-even calculation:
- Data size (TB) / Bandwidth (Gbps) > 7 days → Use Snowball
- Example: 50 TB / 0.5 Gbps = 11 days → Use Snowball
```
**Astuce 10 : Mettre en œuvre une migration en plusieurs phases**
```
Phase 1: Bulk Transfer (90% of data)
- Method: Snowball or initial DataSync
- Target: Historical/cold data
- Timeline: Weeks

Phase 2: Delta Sync (9% of data)
- Method: DataSync incremental
- Target: Changed files during Phase 1
- Timeline: Days

Phase 3: Final Cutover (1% of data)
- Method: DataSync final sync
- Target: Last-minute changes
- Timeline: Hours (maintenance window)

Benefits:
- Reduces cutover window
- Minimizes application downtime
- Validates data progressively
```
### Conseils sur les performances

**Astuce 11 : Utilisez plusieurs agents DataSync**
```bash
# For very large transfers (> 100 TB)
# Deploy multiple agents in parallel

# Agent 1: /data/set1 → S3
# Agent 2: /data/set2 → S3
# Agent 3: /data/set3 → S3

# Each agent: Up to 10 Gbps
# 3 agents: 30 Gbps aggregate

# Ensure network can handle aggregate bandwidth
```
**Astuce 12 : Optimisez les ressources de l'agent DataSync**
```
Recommended VM specifications:

Small workloads (< 20M files):
- 4 vCPU, 32 GB RAM

Large workloads (> 20M files):
- 8 vCPU, 64 GB RAM

Very large (> 100M files):
- 16 vCPU, 128 GB RAM

More RAM = Better file metadata processing
More vCPU = Better throughput
```
## Pièges \& Remèdes

### Piège 1 : Taille du cache insuffisante

**Problème :** Le cache de File Gateway est trop petit, ce qui entraîne de mauvaises performances et des appels d'API S3 excessifs.

**Pourquoi cela arrive :**

- Sous-estimation de la taille de l'ensemble de travail
- Ne pas surveiller le taux de réussite du cache
- Utilisation de la taille de cache par défaut
- Cache non dimensionné pour la croissance

**Impact :**

- Accès aux fichiers lent (latence S3 de 100 à 200 ms)
- Coûts élevés des requêtes S3
- Mauvaise expérience utilisateur
- Délais d'expiration des applications

**Exemple :**
```
Configuration:
- Total data: 5 TB
- Cache: 200 GB
- Working set: 800 GB (files accessed daily)

Problem:
- Cache can only hold 25% of working set
- 75% of reads hit S3 (slow)
- CacheHitPercent: 35%
- Users experience delays
```
**Remède :**

**Étape 1 : Mesurer l'ensemble de travail**
```python
# measure_working_set.py
import boto3
from datetime import datetime, timedelta

def analyze_s3_access_patterns(bucket_name, days=7):
    """
    Analyze S3 access patterns to determine working set
    """
    
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')
    
    # Enable S3 request metrics first
    # (Requires CloudWatch request metrics enabled on bucket)
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)
    
    # Get S3 GET requests (downloads)
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='GetRequests',
        Dimensions=[
            {'Name': 'BucketName', 'Value': bucket_name},
            {'Name': 'FilterId', 'Value': 'EntireBucket'}
        ],
        StartTime=start_time,
        EndTime=end_time,
        Period=86400,  # Daily
        Statistics=['Sum']
    )
    
    # Estimate working set
    # Assumption: Each unique GET represents a file access
    # Average file size: 10 MB (adjust based on your data)
    
    total_requests = sum(d['Sum'] for d in response['Datapoints'])
    avg_file_size_mb = 10
    
    working_set_gb = (total_requests * avg_file_size_mb) / 1024
    
    # Add 50% buffer
    recommended_cache_gb = working_set_gb * 1.5
    
    return {
        'working_set_gb': round(working_set_gb, 2),
        'recommended_cache_gb': round(recommended_cache_gb, 2),
        'total_requests': int(total_requests)
    }

# Run analysis
analysis = analyze_s3_access_patterns('my-fileshare-bucket', days=7)
print(f"Working set: {analysis['working_set_gb']} GB")
print(f"Recommended cache: {analysis['recommended_cache_gb']} GB")
```
**Étape 2 : Ajouter de la capacité de cache**
```bash
# Add new disk to gateway VM
# Then allocate to cache

# List available disks
aws storagegateway list-local-disks \
    --gateway-arn $GATEWAY_ARN

# Add disk to cache
aws storagegateway add-cache \
    --gateway-arn $GATEWAY_ARN \
    --disk-ids disk-id-new

# Verify cache size
aws storagegateway describe-cache \
    --gateway-arn $GATEWAY_ARN
```
**Étape 3 : Surveiller les performances du cache**
```python
# monitor_cache.py
import boto3

def create_cache_alarms(gateway_arn):
    """
    Create CloudWatch alarms for cache performance
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    alarms = [
        {
            'AlarmName': f'FileGateway-LowCacheHitRate',
            'ComparisonOperator': 'LessThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'CacheHitPercent',
            'Namespace': 'AWS/StorageGateway',
            'Period': 3600,
            'Statistic': 'Average',
            'Threshold': 80.0,
            'AlarmDescription': 'Cache hit rate below 80%',
            'Dimensions': [
                {'Name': 'GatewayId', 'Value': gateway_arn.split('/')[-1]}
            ]
        },
        {
            'AlarmName': f'FileGateway-HighCacheUtilization',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 1,
            'MetricName': 'CachePercentUsed',
            'Namespace': 'AWS/StorageGateway',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 90.0,
            'AlarmDescription': 'Cache usage above 90%',
            'Dimensions': [
                {'Name': 'GatewayId', 'Value': gateway_arn.split('/')[-1]}
            ]
        }
    ]
    
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")

# Create alarms
create_cache_alarms('arn:aws:storagegateway:...')
```
**Prévention :**

- Taille du cache basée sur l'analyse de l'ensemble de travail
- Surveiller la métrique CacheHitPercent
- Définissez les alarmes CloudWatch pour un faible taux de réussite
- Examiner l'utilisation du cache mensuellement
- Planifier la croissance des données

***

### Piège 2 : Goulots d'étranglement de la bande passante du réseau

**Problème :** Bande passante réseau insuffisante entraînant des transferts DataSync lents ou des problèmes de performances de la passerelle de fichiers.

**Pourquoi cela arrive :**

- Sous-estimation des exigences de transfert de données
- Partager la bande passante avec d'autres applications
- Pas de QoS ni de mise en forme du trafic
- Utiliser Internet au lieu de Direct Connect

**Impact :**

- Migrations très lentes (mois au lieu de semaines)
- File Gateway est lent à télécharger les modifications
- Dégradation des performances des applications
- Délais de migration manqués

**Remède :**

**Étape 1 : Calculer la bande passante requise**
```python
# bandwidth_calculator.py

def calculate_required_bandwidth(data_size_tb, transfer_window_days, 
                                 efficiency=0.70, hours_per_day=24):
    """
    Calculate minimum bandwidth needed
    """
    
    # Convert to GB
    data_size_gb = data_size_tb * 1024
    
    # Calculate required throughput
    transfer_window_hours = transfer_window_days * hours_per_day
    required_gbps = (data_size_gb / transfer_window_hours) / 450  # 450 GB/hour per Gbps
    
    # Account for efficiency
    required_gbps_with_overhead = required_gbps / efficiency
    
    # Convert to Mbps
    required_mbps = required_gbps_with_overhead * 1000
    
    return {
        'data_size_tb': data_size_tb,
        'transfer_window_days': transfer_window_days,
        'required_bandwidth_gbps': round(required_gbps_with_overhead, 2),
        'required_bandwidth_mbps': round(required_mbps, 2),
        'recommendation': get_bandwidth_recommendation(required_mbps)
    }

def get_bandwidth_recommendation(required_mbps):
    """Recommend connectivity option"""
    
    if required_mbps < 100:
        return "Internet connection (100 Mbps+) sufficient"
    elif required_mbps < 1000:
        return "Consider 1 Gbps internet or VPN"
    elif required_mbps < 10000:
        return "Recommended: AWS Direct Connect (1-10 Gbps)"
    else:
        return "Recommended: Multiple Direct Connect connections or Snowball"

# Example
result = calculate_required_bandwidth(
    data_size_tb=50,
    transfer_window_days=7,
    hours_per_day=16  # Off-peak hours only
)

print(f"Required bandwidth: {result['required_bandwidth_gbps']} Gbps")
print(f"Recommendation: {result['recommendation']}")
```
**Étape 2 : Mettre en œuvre la gestion de la bande passante**
```bash
# Configure DataSync bandwidth throttling
aws datasync update-task \
    --task-arn $TASK_ARN \
    --options BytesPerSecond=209715200  # 200 Mbps

# Configure File Gateway bandwidth limits
aws storagegateway update-bandwidth-rate-limit \
    --gateway-arn $GATEWAY_ARN \
    --average-upload-rate-limit-in-bits-per-sec 209715200 \
    --average-download-rate-limit-in-bits-per-sec 209715200

# Schedule unlimited bandwidth during off-hours
# Use EventBridge + Lambda to adjust limits hourly
```
**Étape 3 : Utilisez Direct Connect pour les transferts importants**
```bash
# For migrations > 10 TB or continuous hybrid workloads

# Benefits:
# - Consistent performance
# - Lower latency
# - No internet bandwidth costs
# - Dedicated connection

# Typical speeds:
# - 1 Gbps: ~10 TB/day
# - 10 Gbps: ~100 TB/day

# Cost:
# - Port hour: $0.30/hour (1 Gbps)
# - Data transfer: $0.02/GB (first 10 TB/month free)
```
**Prévention :**

- Calculer les besoins en bande passante avant la migration
- Utilisez Direct Connect pour les transferts importants ou en cours
- Implémenter la QoS pour les charges de travail hybrides
- Planifier les transferts pendant les heures creuses
- Surveiller l'utilisation du réseau

***

### Piège 3 : mauvaise configuration des tâches DataSync

**Problème :** Les tâches DataSync sont mal configurées, entraînant une perte de données, des transferts incomplets ou des coûts inattendus.

**Pourquoi cela arrive :**

- Utilisation involontaire du mode "Transférer et supprimer"
- Ne comprend pas les options de vérification
- Configurations de filtres incorrectes
- Pas de test avant la production

**Impact :**

- Suppression accidentelle de fichiers
- Transfert de données incomplet
- Problèmes d'intégrité des données
- Violations de conformité

**Remède :**

**Étape 1 : Utiliser le mode de transfert sécurisé**
```python
# Safe DataSync configuration
safe_options = {
    'VerifyMode': 'ONLY_FILES_TRANSFERRED',  # Verify all transferred files
    'OverwriteMode': 'ALWAYS',  # Overwrite destination files
    'Atime': 'BEST_EFFORT',  # Preserve access time
    'Mtime': 'PRESERVE',  # Preserve modification time
    'Uid': 'INT_VALUE',  # Preserve UID as integer
    'Gid': 'INT_VALUE',  # Preserve GID as integer
    'PreserveDeletedFiles': 'PRESERVE',  # DON'T delete from destination
    'PreserveDevices': 'NONE',  # Don't transfer device files
    'PosixPermissions': 'PRESERVE',  # Preserve permissions
    'BytesPerSecond': -1,  # Unlimited bandwidth (adjust as needed)
    'TaskQueueing': 'ENABLED',  # Allow task queueing
    'LogLevel': 'TRANSFER',  # Log all transfers
    'TransferMode': 'CHANGED'  # Only transfer changed files
}

# AVOID this dangerous configuration:
dangerous_options = {
    'PreserveDeletedFiles': 'REMOVE',  # Deletes files from destination!
    'VerifyMode': 'NONE',  # No verification!
    'LogLevel': 'OFF'  # No logging!
}
```
**Étape 2 : Testez d'abord avec le sous-ensemble**
```bash
# Create test task with filter
aws datasync create-task \
    --source-location-arn $SOURCE \
    --destination-location-arn $DEST \
    --includes '[{"FilterType":"SIMPLE_PATTERN","Value":"/test-folder/*"}]' \
    --name "TEST-Migration-Task" \
    --options file://safe-options.json

# Run test task
TEST_EXEC=$(aws datasync start-task-execution \
    --task-arn $TEST_TASK_ARN \
    --query 'TaskExecutionArn' \
    --output text)

# Verify results
aws datasync describe-task-execution \
    --task-execution-arn $TEST_EXEC

# If successful, create production task without filter
```
**Étape 3 : Mettre en œuvre des vérifications avant vol**
```python
# datasync_preflight.py
import boto3

def validate_datasync_task(task_arn):
    """
    Validate DataSync task configuration before execution
    """
    
    datasync = boto3.client('datasync')
    
    # Get task details
    task = datasync.describe_task(TaskArn=task_arn)
    
    issues = []
    warnings = []
    
    # Check dangerous options
    options = task.get('Options', {})
    
    if options.get('PreserveDeletedFiles') == 'REMOVE':
        issues.append({
            'severity': 'CRITICAL',
            'issue': 'PreserveDeletedFiles=REMOVE will delete files from destination',
            'recommendation': 'Change to PRESERVE unless you intend to mirror source'
        })
    
    if options.get('VerifyMode') == 'NONE':
        warnings.append({
            'severity': 'HIGH',
            'issue': 'No data verification enabled',
            'recommendation': 'Enable verification for data integrity'
        })
    
    if options.get('LogLevel') == 'OFF':
        warnings.append({
            'severity': 'MEDIUM',
            'issue': 'Logging disabled',
            'recommendation': 'Enable logging for troubleshooting'
        })
    
    # Check if CloudWatch logging configured
    if not task.get('CloudWatchLogGroupArn'):
        warnings.append({
            'severity': 'MEDIUM',
            'issue': 'No CloudWatch log group configured',
            'recommendation': 'Configure CloudWatch logs for monitoring'
        })
    
    # Report
    if issues:
        print("❌ CRITICAL ISSUES:")
        for issue in issues:
            print(f"  {issue['issue']}")
            print(f"  → {issue['recommendation']}\n")
    
    if warnings:
        print("⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  {warning['issue']}")
            print(f"  → {warning['recommendation']}\n")
    
    if not issues and not warnings:
        print("✓ Task configuration looks good")
    
    return {
        'safe_to_run': len(issues) == 0,
        'issues': issues,
        'warnings': warnings
    }

# Validate before running
validation = validate_datasync_task('arn:aws:datasync:...')

if not validation['safe_to_run']:
    print("Fix critical issues before running task!")
else:
    # Safe to execute
    aws datasync start-task-execution --task-arn $TASK_ARN
```
**Prévention :**

- Testez toujours avec un petit sous-ensemble en premier
- Utiliser les options par défaut sécurisées
- Activer la vérification complète
- Configurer la journalisation CloudWatch
- Implémenter un workflow d'approbation pour les tâches de production
- Configuration des tâches documentaires

***

## Résumé du chapitre

AWS Storage Gateway et DataSync permettent des architectures cloud hybrides, reliant l'infrastructure sur site aux services de stockage AWS. Storage Gateway offre une intégration transparente via des protocoles standards (NFS, SMB, iSCSI), tandis que DataSync automatise et accélère le transfert de données pour les migrations et la synchronisation continue. Comprendre les types de passerelles, les stratégies de mise en cache, la gestion de la bande passante et les modèles de migration est essentiel pour une mise en œuvre réussie du cloud hybride.

**Principaux points à retenir :**

- **Choisissez le type de passerelle approprié :** File Gateway pour les partages de fichiers, Volume Gateway pour le stockage en mode bloc, Tape Gateway pour la sauvegarde.
- **Taille correcte du cache :** Cache = Ensemble de travail × 1,5, surveillez la métrique CacheHitPercent
- **Utilisez DataSync pour les migrations :** 10 fois plus rapide que les outils traditionnels, avec vérification et planification intégrées
- **Planifier les besoins en bande passante :** Calculez la bande passante nécessaire, utilisez Direct Connect pour les transferts importants
- **Mettez en œuvre des configurations sécurisées :** Testez avec des sous-ensembles, activez la vérification, conservez les fichiers supprimés
- **Surveiller les performances :** métriques CloudWatch pour le taux de réussite du cache, la vitesse de transfert et l'achèvement des tâches

Comprendre Storage Gateway et DataSync vous permet de créer des solutions de cloud hybride efficaces, d'exécuter des migrations à grande échelle et de mettre en œuvre des stratégies de reprise après sinistre couvrant l'infrastructure sur site et cloud.

## Questions de révision

1. **Quel type de Storage Gateway utilise le protocole iSCSI ?**
a) Passerelle de fichiers
b) Passerelle de volumes
c) Passerelle de bande
d) Tout ce qui précède

**Réponse : B** - Volume Gateway fournit un stockage en bloc via le protocole iSCSI.

2. **File Gateway stocke les fichiers sous :**
a) Volumes EBS
b) Objets S3
c) Fichiers EFS
d) Archives des glaciers

**Réponse : B** - File Gateway stocke les fichiers en tant qu'objets S3 (mappage 1:1).

3. **Coût DataSync par Go transféré :**
a) Gratuit
b) \0,0125 $/Go
c) \0,09 $/Go
d) \$1/Go

**Réponse : B** – Frais DataSync : 0,0125 $ par Go transféré.

4. **Formule de taille de cache recommandée :**
a) Taille totale des données
b) Ensemble de travail × 1,5
c) 10 % du total des données
d) Fixe 150 Go

**Réponse : B** - Cache recommandé = Ensemble de travail × 1,5 pour des performances optimales.

5. **DataSync peut être transféré entre :**
a) Sur site et AWS uniquement
b) Services AWS uniquement
c) Sur site et AWS, et entre les services AWS
d) Sur site vers S3 uniquement

**Réponse : C** - DataSync fonctionne sur site ↔ AWS et entre les services AWS.

6. **Le mode Volume Gateway Cached stocke les données principales dans :**
a) Stockage local
b) Amazon S3
c)AmazonEBS
d)AmazonEFS

**Réponse : B** - Le mode mis en cache stocke les données principales dans S3, les caches fréquemment consultés localement.

7. **Les bandes virtuelles Tape Gateway sont stockées dans :**
a) Norme S3
b) Glacier S3
c) Instantanés EBS
d) S3 et Glacier

**Réponse : D** - Bandes actives dans S3, bandes archivées dans Glacier.

8. **Débit DataSync maximum par tâche :**
a) 1 Gbit/s
b) 5 Gbit/s
c) 10 Gbit/s
d) Illimité

**Réponse : C** - DataSync prend en charge jusqu'à 10 Gbit/s par tâche.

9. **File Gateway prend en charge quels protocoles :**
a) NFS uniquement
b) PME uniquement
c) NFS et PME
d)iSCSI

**Réponse : C** - File Gateway prend en charge les protocoles NFS et SMB.

10. **Mode de vérification DataSync pour la production :**
a) AUCUN
b) POINT_IN_TIME_CONSISTENT
c) ONLY_FILES_TRANSFERRED
d) Aucune vérification nécessaire

**Réponse : C** - ONLY_FILES_TRANSFERRED recommandé pour un équilibre entre vitesse et vérification.

11. **Politique d'expulsion du cache Storage Gateway :**
a) FIFO
b) LRU (le moins récemment utilisé)
c) Aléatoire
d) Manuel

**Réponse : B** - Storage Gateway utilise la stratégie d'expulsion LRU (Least Récemment Utilisé).

12. **L'agent DataSync est requis pour :**
a) Tous les transferts
b) Transferts sur site vers AWS
c) Transferts S3 vers EFS
d) Jamais requis

**Réponse : B** - Agent requis pour les sources/destinations sur site, pas pour AWS vers AWS.

13. **Emplacement des données principales en mode stocké de Volume Gateway :**
a) Amazon S3
b) Stockage local
c)AmazonEBS
d)AmazonEFS

**Réponse : B** - Le mode stocké conserve les données primaires localement et les sauvegarde sur S3.

14. **Meilleure connectivité pour une migration de 100 To en 1 semaine :**
a) Internet public
b) VPN
c) Connexion directe ou Snowball
d) Impossible

**Réponse : C** – Nécessite environ 1,5 Gbit/s soutenu ; Direct Connect ou Snowball recommandé.

15. **Métrique de cache File Gateway à surveiller :**
a) Utilisation du processeur
b) CacheHitPercent
c) RéseauBytesIn
d) DiskReadOps

**Réponse : B** - CacheHitPercent indique l'efficacité du cache (cible > 85 %).

***
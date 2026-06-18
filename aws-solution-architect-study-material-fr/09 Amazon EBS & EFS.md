# Chapitre 9 : Amazon EBS\& EFS

##Présentation

Amazon Elastic Block Store (EBS) et Elastic File System (EFS) fournissent un stockage persistant pour les instances EC2, chacun servant des cas d'utilisation distincts. EBS propose des volumes de stockage au niveau bloc qui fonctionnent comme des disques durs virtuels, offrant un accès à faible latence aux bases de données, aux volumes de démarrage et aux applications nécessitant des performances d'E/S constantes. EFS fournit des systèmes de fichiers NFS entièrement gérés et évolutifs qui peuvent être montés simultanément par plusieurs instances EC2, idéaux pour les référentiels de contenu partagé, l'analyse du Big Data et le stockage de fichiers d'application.

Comprendre la différence entre le stockage en bloc et le stockage de fichiers est fondamental. Les volumes EBS s'attachent à des instances EC2 uniques (bien que Multi-Attach permette à des types de volumes spécifiques de se connecter à plusieurs instances dans la même zone de disponibilité), fournissant un stockage de blocs bruts que vous formatez avec un système de fichiers. EFS fournit un système de fichiers prêt à l'emploi accessible par des milliers d'instances EC2 dans plusieurs zones de disponibilité, passant automatiquement de gigaoctets à pétaoctets. Le choix entre EBS et EFS, ou l'utilisation des deux, dépend de l'architecture de votre application, de vos exigences de performances et de vos modèles d'accès.

Les performances de stockage ont un impact significatif sur le comportement des applications. Un volume EBS mal configuré peut entraver les performances de la base de données, entraînant des retards de transaction et une mauvaise expérience utilisateur. La sélection de gp2 au lieu de gp3 gaspille de l'argent en crédits de rafale inutilisés. Ne pas activer l'optimisation EBS sur les instances limite les E/S. L’oubli des volumes d’instantanés entraîne une perte de données irrécupérable. Comprendre les types de volumes, le provisionnement d'IOPS, les caractéristiques de débit, les stratégies d'instantanés et les options de chiffrement est essentiel pour les déploiements de production.

Ce chapitre fournit une couverture complète de l'EBS et de l'EFS, des fondamentaux aux modèles de production. Vous découvrirez les types de volumes et les caractéristiques de performances, les stratégies d'instantané et de sauvegarde, le chiffrement et la sécurité, les configurations à haute disponibilité, la surveillance et le dépannage, ainsi que les techniques d'optimisation des coûts. Que vous exécutiez des bases de données, hébergez des applications ou construisiez des systèmes de fichiers partagés, la maîtrise d'EBS et d'EFS est essentielle pour une infrastructure AWS fiable et performante.

## Théorie \&Concepts

### Fondamentaux d'EBS

**Qu'est-ce qu'EBS ?**

Amazon EBS fournit des volumes de stockage en bloc persistants pour les instances EC2. Chaque volume est automatiquement répliqué dans sa zone de disponibilité pour se protéger contre les pannes matérielles.

**Caractéristiques clés :**

- **Persistant :** Les données persistent indépendamment du cycle de vie de l'instance
- **AZ-Scoped :** Le volume et l'instance doivent se trouver dans la même AZ
- **Instantanés :** Sauvegardes ponctuelles stockées dans S3
- **Redimensionnable :** Augmente la taille et les IOPS sans temps d'arrêt
- **Chiffrement :** Chiffrement transparent au repos et en transit
- **Plusieurs types :** Optimisés pour différentes charges de travail

**EBS et magasin d'instances :**


| Fonctionnalité | EBS | Magasin d'instances |
| :-- | :-- | :-- |
| **Persistance** | Persistant | Éphémère (données perdues à l'arrêt) |
| **Durabilité** | Taux d'échec annuel de 99,8 à 99,9 % | Perdu en cas d'échec de l'instance |
| **Performances** | Varie selon le type | Très élevé (NVMe) |
| **Instantanés** | Oui | Non |
| **Coût** | Payer le stockage provisionné | Inclus avec l'instance |
| **Cas d'utilisation** | Bases de données, volumes de démarrage | Cache temporaire, tampons |

### Types de volumes EBS

**Volumes basés sur SSD :**

**1. SSD à usage général (gp3) - Recommandé**

- **Performances :**
    - Référence : 3 000 IOPS, débit de 125 Mo/s
    - Max : 16 000 IOPS, débit de 1 000 Mo/s
    - Provisionner les IOPS et le débit de manière indépendante
- **Taille :** 1 Gio - 16 Tio
- **Prix :** 0,08 $/Go-mois + \$0,005/IOPS provisionnés-mois (au-dessus de 3 000) + \$0,04/Mo/s-mois provisionnés (au-dessus de 125)
- **Cas d'utilisation :** Volumes de démarrage, bureaux virtuels, développement/test, bases de données de taille moyenne
- **Pourquoi choisir :** Performances rentables et prévisibles, pas de crédits en rafale

**2. SSD à usage général (gp2) - Héritage**

- **Performances :**
    - Référence : 3 IOPS/Go (minimum 100 IOPS)
    - Max : 16 000 IOPS (à 5 334 Go)
    - Rafale jusqu'à 3 000 IOPS en utilisant des crédits
- **Taille :** 1 Gio - 16 Tio
- **Prix :** \$0,10/Go-mois
- **Crédits Burst :** Accumulez lorsque l'utilisation est inférieure à la ligne de base, consommez lorsqu'elle est supérieure
- **Pourquoi éviter :** Plus cher que le gp3, performances en rafale imprévisibles

**3. SSD IOPS provisionné (io2 Block Express)**

- **Performances :**
    - Jusqu'à 256 000 IOPS
    - Jusqu'à 4 000 Mo/s de débit
    - Latence inférieure à la milliseconde
    - 99,999% de durabilité (10x mieux que le GP3)
- **Taille :** 4 Gio - 64 Tio
- **Prix :** \$0,125/Go-mois + \$0,065/IOPS provisionné-mois
- **Cas d'utilisation :** Bases de données critiques (SAP HANA, Oracle), bases de données NoSQL nécessitant les plus hautes performances
- **Pourquoi choisir :** Performances maximales, durabilité maximale, faible latence constante

**4. SSD IOPS provisionné (io2)**

- **Performances :**
    - Jusqu'à 64 000 IOPS (256 000 avec io2 Block Express)
    - Débit jusqu'à 1 000 Mo/s (4 000 Mo/s Block Express)
    - 99,9% de durabilité
- **Taille :** 4 Gio - 16 Tio (Bloc Express de 64 Tio)
- **Prix :** \$0,125/Go-mois + \$0,065/IOPS provisionné-mois
- **Cas d'utilisation :** Grandes bases de données (SQL Server, MySQL, PostgreSQL), applications critiques
- **Pourquoi choisir :** Hautes performances constantes, meilleure durabilité que le GP3

**Volumes sur disque dur :**

**5. Disque dur à débit optimisé (st1)**

- **Performances :**
    - Référence : 40 Mo/s par To
    - Rafale : 250 Mo/s par To (max 500 Mo/s)
    - Max : 500 IOPS (1 Mo d'E/S)
- **Taille :** 125 Gio - 16 Tio
- **Prix :** \$0,045/Go-mois
- **Cas d'utilisation :** Big data, entrepôts de données, traitement des journaux, Apache Kafka
- **Pourquoi choisir :** Économique pour les charges de travail séquentielles et le streaming de données

**6. Disque dur froid (sc1)**

- **Performances :**
    - Référence : 12 Mo/s par To
    - Rafale : 80 Mo/s par To (max 250 Mo/s)
    - Max : 250 IOPS (1 Mo d'E/S)
- **Taille :** 125 Gio - 16 Tio
- **Prix :** \$0,015/Go-mois (EBS le moins cher)
- **Cas d'utilisation :** Données rarement consultées, scénarios de coûts de stockage les plus bas
- **Pourquoi choisir :** Coût le plus bas pour les données froides avec accès occasionnel

**Comparaison des types de volumes :**


| Tapez | IOPS | Débit | Latence | \$/Go | Cas d'utilisation |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **gp3** | 16 000 | 1 000 Mo/s | MS à un chiffre | \$0,08 | Usage général |
| **gp2** | 16 000 | 250 Mo/s | MS à un chiffre | \$0,10 | Héritage |
| **io2 BE** | 256 000 | 4 000 Mo/s | Sous-ms | \$0,125+ | Bases de données critiques |
| **io2** | 64 000 | 1 000 Mo/s | MS à un chiffre | \$0,125+ | Base de données hautes performances |
| **st1** | 500 | 500 Mo/s | Millisecondes | \$0,045 | Mégadonnées |
| **sc1** | 250 | 250 Mo/s | Millisecondes | \$0,015 | Entreposage frigorifique |

### IOPS et débit

**IOPS (opérations d'entrée/sortie par seconde) :**

Mesure le nombre d’opérations de lecture/écriture que le stockage peut gérer par seconde.

- **Petites opérations d'E/S :** Transactions de base de données (blocs 4K-16K)
- **Accès aléatoire :** Les bases de données bénéficient d'IOPS élevées
- **Formule :** IOPS × Taille d'E/S = Débit

**Débit (Mo/s) :**

Mesure la quantité de données que le stockage peut transférer par seconde.

- **Opérations d'E/S volumineuses :** Streaming vidéo, traitement des journaux (blocs de 64 000 à 1 M)
- **Accès séquentiel :** les charges de travail Big Data bénéficient d'un débit élevé

**Relation :**
```
Throughput = IOPS × I/O Size

Example:
- 10,000 IOPS × 16 KB = 156.25 MB/s
- 1,000 IOPS × 256 KB = 256 MB/s

For same throughput, you need:
- High IOPS for small block workloads (databases)
- Lower IOPS for large block workloads (streaming)
```
**Taille de bloc optimale :**
```python
# Calculate optimal configuration
def calculate_volume_requirements(workload_type):
    """
    Determine EBS volume configuration
    """
    
    if workload_type == 'database':
        # Small block, random I/O
        return {
            'volume_type': 'gp3 or io2',
            'key_metric': 'IOPS',
            'typical_block_size': '4-16 KB',
            'recommendation': 'Provision enough IOPS for peak transactions/sec'
        }
    
    elif workload_type == 'data_warehouse':
        # Large block, sequential I/O
        return {
            'volume_type': 'st1',
            'key_metric': 'Throughput',
            'typical_block_size': '64 KB - 1 MB',
            'recommendation': 'Focus on MB/s, IOPS less critical'
        }
    
    elif workload_type == 'boot_volume':
        # Mixed workload
        return {
            'volume_type': 'gp3',
            'key_metric': 'Balanced',
            'typical_block_size': '4-128 KB',
            'recommendation': 'Default gp3 sufficient for most cases'
        }
```
### Instantanés EBS

Les instantanés sont des sauvegardes incrémentielles des volumes EBS stockés dans Amazon S3.

**Comment fonctionnent les instantanés :**
```
Initial Snapshot: Copies all blocks (full backup)
Volume: 100 GB with 60 GB used → Snapshot: 60 GB stored

Subsequent Snapshots: Only changed blocks (incremental)
Changed: 5 GB → Snapshot 2: Only 5 GB additional stored

Total Storage: 65 GB (60 + 5)
```
**Caractéristiques clés :**

- **Incrémentiel :** Uniquement les blocs modifiés depuis le dernier instantané
- **Point dans le temps :** Capture l'état du volume au moment de l'instantané
- **Régional :** stocké dans S3, disponible dans toutes les zones de disponibilité de la région
- **Copie inter-région :** Peut copier vers d'autres régions pour la reprise après sinistre
- **Fast Snapshot Restore (FSR) :** Préchauffez les instantanés pour une création instantanée de volumes
- **Corbeille :** Protège contre toute suppression accidentelle

**Prix instantané :**
```
Standard Snapshot: $0.05/GB-month
Archive Snapshot: $0.0125/GB-month (90-day minimum, retrieval fee)

Example:
Initial: 100 GB snapshot = $5/month
Change: 10 GB = $0.50 additional
Total: $5.50/month

After archiving old snapshots:
Archive tier: $1.25/month
Savings: 75%
```
**Création d'instantanés :**
```bash
# Create snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Database backup $(date +%Y-%m-%d)" \
    --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=Daily-Backup},{Key=Environment,Value=Production}]' \
    --query 'SnapshotId' \
    --output text)

# Wait for completion
aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT_ID

# Copy to another region (DR)
aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAPSHOT_ID \
    --destination-region us-west-2 \
    --description "DR copy of $SNAPSHOT_ID" \
    --region us-west-2

# Create volume from snapshot
aws ec2 create-volume \
    --snapshot-id $SNAPSHOT_ID \
    --availability-zone us-east-1a \
    --volume-type gp3 \
    --iops 5000 \
    --throughput 250
```
**Restauration rapide d'instantanés (FSR) :**
```bash
# Enable FSR (eliminates first-access latency)
aws ec2 enable-fast-snapshot-restores \
    --availability-zones us-east-1a us-east-1b \
    --source-snapshot-ids $SNAPSHOT_ID

# Cost: $0.75/hour per snapshot per AZ
# Use only for critical snapshots needing instant restore
```
### Cryptage EBS

Le chiffrement EBS protège les données au repos, en transit et dans les instantanés.

**Principales caractéristiques :**

- **Transparent :** Aucun impact sur les performances
- **AES-256 :** Cryptage conforme aux normes de l'industrie
- **Intégration AWS KMS :** Clés gérées par le client ou gérées par AWS
- **Automatique :** Chiffre automatiquement les données et les instantanés
- **En transit :** Données cryptées entre EC2 et EBS

**Chiffrement au repos :**
```bash
# Create encrypted volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 100 \
    --volume-type gp3 \
    --encrypted \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123

# Enable encryption by default (account setting)
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# Encrypt existing unencrypted volume
# 1. Create snapshot
# 2. Copy snapshot with encryption
# 3. Create encrypted volume from snapshot

SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id vol-unencrypted \
    --query 'SnapshotId' \
    --output text)

ENCRYPTED_SNAPSHOT=$(aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAPSHOT_ID \
    --encrypted \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123 \
    --query 'SnapshotId' \
    --output text)
```
**Gestion des clés :**
```bash
# Create custom KMS key
KEY_ID=$(aws kms create-key \
    --description "EBS encryption key" \
    --key-usage ENCRYPT_DECRYPT \
    --origin AWS_KMS \
    --query 'KeyMetadata.KeyId' \
    --output text)

# Create alias
aws kms create-alias \
    --alias-name alias/ebs-encryption \
    --target-key-id $KEY_ID

# Grant EC2 service permission
aws kms create-grant \
    --key-id $KEY_ID \
    --grantee-principal ec2.amazonaws.com \
    --operations Decrypt CreateGrant
```
### Amazon EFS (système de fichiers élastique)

EFS fournit des systèmes de fichiers NFS évolutifs et entièrement gérés pour les instances EC2.

**Caractéristiques clés :**

- **Accès partagé :** Plusieurs instances se montent simultanément
- **Multi-AZ :** Données répliquées sur plusieurs AZ
- **Élastique :** Évolue automatiquement (pétaoctets)
- **Modes de performances :** Usage général ou E/S maximales
- **Modes de débit :** En rafale ou provisionné
- **Classes de stockage :** Accès standard et peu fréquent

**EFS contre EBS :**


| Fonctionnalité | EFS | EBS |
| :-- | :-- | :-- |
| **Accès** | Instances multiples (NFS) | Instance unique (bloc) |
| **Portée AZ** | Multi-AZ | AZ unique |
| **Taille** | Élastique (mises à l'échelle automatique) | Fixe (redimensionnement manuel) |
| **Performances** | Partagé (inférieur par instance) | Dédié (supérieur) |
| **Coût** | \$0,30/Go-mois | \$0,08-0,125/Go-mois |
| **Cas d'utilisation** | Contenu partagé, CMS | Bases de données, volumes de démarrage |

**Modes de performances EFS :**

**1. Usage général (par défaut) :**

- Latence : faible, en millisecondes à un chiffre
- Débit : évolue avec la taille
- Cas d'utilisation : la plupart des charges de travail

**2. E/S maximale :**

- Latence : plus élevée (millisecondes à deux chiffres)
- Débit : débit global plus élevé
- Cas d'utilisation : Big data, traitement multimédia (plus de 1000 instances)

**Modes de débit EFS :**

**1. Éclatement (par défaut) :**

- Référence : 50 Mo/s par To stocké
- Rafale : jusqu'à 100 Mo/s
- Gratuit : Pas de frais supplémentaires
- Cas d'utilisation : charges de travail variables

**2. Élastique (recommandé) :**

- Automatique : augmente/diminue automatiquement
- Jusqu'à : 3 Go/s en lecture, 1 Go/s en écriture
- Coût : payer pour le débit utilisé
- Cas d'utilisation : charges de travail imprévisibles

**3. Provisionné :**

- Corrigé : fournir un débit spécifique
- Indépendant : De la taille du stockage
- Coût : \$6/Mo/s-mois
- Cas d'utilisation : exigences de débit connues

**Classes de stockage EFS :**

**Norme :**

- Accès : fichiers fréquemment consultés
- Coût : 0,30 $/Go-mois
- Performance : latence la plus faible

**Accès peu fréquent (IA) :**

- Accès : Fichiers non consultés pendant 7/14/30/60/90 jours
- Coût : 0,025 $/Go-mois (92 % moins cher)
- Frais d'accès : 0,01 $/Go
- Cas d'utilisation : sauvegardes, données rarement consultées

**Gestion du cycle de vie :**

- Déplace automatiquement les fichiers vers IA en fonction de la politique
- Revient à Standard lors de l'accès


### EBS Multi-Attach

Permet aux volumes io2 de s'attacher à plusieurs instances dans la même AZ.

**Caractéristiques :**

- **Accès simultané :** Jusqu'à 16 instances
- **Même AZ uniquement :** Toutes les instances doivent être dans la même AZ
- **Type de volume :** io2 ou io2 Block Express uniquement
- **Cluster-Aware :** L'application doit gérer les écritures simultanées

**Cas d'utilisation :**

- **Bases de données en cluster :** Oracle RAC, clusters de basculement SQL Server
- **Haute disponibilité :** Configurations actives-actives
- **Stockage partagé :** Applications nécessitant un stockage en bloc partagé

**Exigences :**
```bash
# Create io2 volume with Multi-Attach
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 500 \
    --volume-type io2 \
    --iops 10000 \
    --multi-attach-enabled

# Attach to multiple instances
aws ec2 attach-volume \
    --volume-id vol-multi \
    --instance-id i-instance1 \
    --device /dev/sdf

aws ec2 attach-volume \
    --volume-id vol-multi \
    --instance-id i-instance2 \
    --device /dev/sdf

# Use cluster-aware file system
# - GFS2 (Red Hat)
# - Lustre
# - OCFS2
# Not: ext4, xfs (single-writer only)
```
## Implémentation pratique

### Atelier 1 : Création et optimisation de volumes EBS

**Objectif :** Créez et configurez des volumes EBS prêts pour la production avec des performances optimales.
```bash
# Create gp3 volume with custom IOPS/throughput
VOLUME_ID=$(aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 500 \
    --volume-type gp3 \
    --iops 8000 \
    --throughput 500 \
    --encrypted \
    --kms-key-id alias/ebs-encryption \
    --tag-specifications 'ResourceType=volume,Tags=[
        {Key=Name,Value=Production-Database},
        {Key=Environment,Value=Production},
        {Key=Application,Value=PostgreSQL},
        {Key=Backup,Value=Daily}
    ]' \
    --query 'VolumeId' \
    --output text)

echo "Volume ID: $VOLUME_ID"

# Wait for volume to become available
aws ec2 wait volume-available --volume-ids $VOLUME_ID

# Attach to instance
aws ec2 attach-volume \
    --volume-id $VOLUME_ID \
    --instance-id i-1234567890abcdef0 \
    --device /dev/sdf

# Enable delete on termination
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --block-device-mappings "DeviceName=/dev/sdf,Ebs={DeleteOnTermination=false}"

# On EC2 instance, format and mount
sudo mkfs.ext4 /dev/nvme1n1  # Note: Device name may differ (NVMe)
sudo mkdir /data
sudo mount /dev/nvme1n1 /data

# Add to /etc/fstab for auto-mount
echo "/dev/nvme1n1 /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab

# Verify performance
sudo fio --name=randwrite --ioengine=libaio --iodepth=32 \
    --rw=randwrite --bs=4k --direct=1 --size=1G \
    --numjobs=4 --runtime=60 --group_reporting \
    --filename=/data/test
```
### Lab 2 : Automatisation des instantanés avec Data Lifecycle Manager

**Objectif :** Automatisez la gestion du cycle de vie des instantanés EBS.
```bash
# Create DLM policy
cat > dlm-policy.json <<'EOF'
{
  "PolicyDetails": {
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [
      {
        "Key": "Backup",
        "Value": "Daily"
      }
    ],
    "Schedules": [
      {
        "Name": "Daily snapshots",
        "CopyTags": true,
        "TagsToAdd": [
          {
            "Key": "SnapshotType",
            "Value": "DLM-Daily"
          }
        ],
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["03:00"]
        },
        "RetainRule": {
          "Count": 30
        },
        "FastRestoreRule": {
          "AvailabilityZones": ["us-east-1a"],
          "Count": 1
        },
        "CrossRegionCopyRules": [
          {
            "TargetRegion": "us-west-2",
            "Encrypted": true,
            "RetainRule": {
              "Interval": 7,
              "IntervalUnit": "DAYS"
            }
          }
        ]
      },
      {
        "Name": "Weekly snapshots",
        "CreateRule": {
          "CronExpression": "cron(0 2 ? * SUN *)"
        },
        "RetainRule": {
          "Count": 12
        }
      }
    ]
  },
  "Description": "Automated daily and weekly backups",
  "State": "ENABLED",
  "ExecutionRoleArn": "arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole"
}
EOF

# Create DLM lifecycle policy
POLICY_ID=$(aws dlm create-lifecycle-policy \
    --cli-input-json file://dlm-policy.json \
    --query 'PolicyId' \
    --output text)

echo "DLM Policy ID: $POLICY_ID"

# Tag volumes for automatic backup
aws ec2 create-tags \
    --resources $VOLUME_ID \
    --tags Key=Backup,Value=Daily
```
### Atelier 3 : Création d'un système de fichiers EFS

**Objectif :** Déployez un EFS multi-AZ avec gestion du cycle de vie.
```bash
# Create EFS file system
FILE_SYSTEM_ID=$(aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode elastic \
    --encrypted \
    --kms-key-id alias/efs-encryption \
    --tags Key=Name,Value=SharedAppData Key=Environment,Value=Production \
    --query 'FileSystemId' \
    --output text)

echo "EFS ID: $FILE_SYSTEM_ID"

# Wait for file system to become available
aws efs describe-file-systems \
    --file-system-id $FILE_SYSTEM_ID \
    --query 'FileSystems[0].LifeCycleState'

# Create mount targets in each AZ
for subnet in $SUBNET_1A $SUBNET_1B $SUBNET_1C; do
    aws efs create-mount-target \
        --file-system-id $FILE_SYSTEM_ID \
        --subnet-id $subnet \
        --security-groups $EFS_SG_ID
done

# Configure lifecycle management
aws efs put-lifecycle-configuration \
    --file-system-id $FILE_SYSTEM_ID \
    --lifecycle-policies \
        TransitionToIA=AFTER_30_DAYS \
        TransitionToPrimaryStorageClass=AFTER_1_ACCESS

# Mount on EC2 instances
sudo mkdir /mnt/efs
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
    $FILE_SYSTEM_ID.efs.us-east-1.amazonaws.com:/ /mnt/efs

# Add to /etc/fstab
echo "$FILE_SYSTEM_ID.efs.us-east-1.amazonaws.com:/ /mnt/efs nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0" | sudo tee -a /etc/fstab

# Test write performance
sudo dd if=/dev/zero of=/mnt/efs/testfile bs=1M count=1000
```
### Lab 4 : Surveillance du volume EBS

**Objectif :** Mettre en œuvre une surveillance complète des performances EBS.
```python
# ebs_monitoring.py
import boto3
from datetime import datetime, timedelta

def monitor_ebs_performance(volume_id):
    """
    Monitor EBS volume performance metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    # Get volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    volume_type = volume['VolumeType']
    size = volume['Size']
    iops = volume.get('Iops', 0)
    
    # Define metrics to monitor
    metrics = [
        'VolumeReadBytes',
        'VolumeWriteBytes',
        'VolumeReadOps',
        'VolumeWriteOps',
        'VolumeThroughputPercentage',
        'VolumeConsumedReadWriteOps',
        'BurstBalance'  # For gp2 only
    ]
    
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)
    
    performance_data = {}
    
    for metric_name in metrics:
        try:
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/EBS',
                MetricName=metric_name,
                Dimensions=[
                    {'Name': 'VolumeId', 'Value': volume_id}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=300,
                Statistics=['Average', 'Maximum']
            )
            
            if response['Datapoints']:
                avg = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
                max_val = max(d['Maximum'] for d in response['Datapoints'])
                
                performance_data[metric_name] = {
                    'average': avg,
                    'maximum': max_val
                }
        
        except Exception as e:
            print(f"Error retrieving {metric_name}: {e}")
    
    # Calculate derived metrics
    if 'VolumeReadOps' in performance_data and 'VolumeWriteOps' in performance_data:
        total_iops = (
            performance_data['VolumeReadOps']['average'] +
            performance_data['VolumeWriteOps']['average']
        )
        
        # Check if approaching provisioned IOPS
        if iops > 0:
            iops_utilization = (total_iops / iops) * 100
            performance_data['iops_utilization_percent'] = iops_utilization
            
            if iops_utilization > 80:
                print(f"⚠️  High IOPS utilization: {iops_utilization:.1f}%")
    
    # Calculate throughput (MB/s)
    if 'VolumeReadBytes' in performance_data and 'VolumeWriteBytes' in performance_data:
        read_mbps = (performance_data['VolumeReadBytes']['average'] / (1024**2)) / 300
        write_mbps = (performance_data['VolumeWriteBytes']['average'] / (1024**2)) / 300
        total_mbps = read_mbps + write_mbps
        
        performance_data['throughput_mbps'] = {
            'read': read_mbps,
            'write': write_mbps,
            'total': total_mbps
        }
    
    # Check burst balance for gp2
    if volume_type == 'gp2' and 'BurstBalance' in performance_data:
        burst_balance = performance_data['BurstBalance']['average']
        
        if burst_balance < 20:
            print(f"⚠️  Low burst balance: {burst_balance:.1f}%")
            print("   Consider upgrading to gp3 for consistent performance")
    
    return {
        'volume_id': volume_id,
        'volume_type': volume_type,
        'size_gb': size,
        'provisioned_iops': iops,
        'metrics': performance_data
    }

def create_ebs_alarms(volume_id):
    """
    Create CloudWatch alarms for EBS volume
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    alarms = [
        {
            'AlarmName': f'{volume_id}-HighIOPS',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'VolumeConsumedReadWriteOps',
            'Namespace': 'AWS/EBS',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 15000,  # Adjust based on provisioned IOPS
            'Dimensions': [{'Name': 'VolumeId', 'Value': volume_id}]
        },
        {
            'AlarmName': f'{volume_id}-HighThroughput',
            'ComparisonOperator': 'GreaterThanThreshold',
            'EvaluationPeriods': 2,
            'MetricName': 'VolumeThroughputPercentage',
            'Namespace': 'AWS/EBS',
            'Period': 300,
            'Statistic': 'Average',
            'Threshold': 80,
            'Dimensions': [{'Name': 'VolumeId', 'Value': volume_id}]
        }
    ]
    
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")

# Usage
volume_data = monitor_ebs_performance('vol-1234567890abcdef0')
create_ebs_alarms('vol-1234567890abcdef0')
```
## Connaissances au niveau de la production

### Configurations de bases de données hautes performances

**PostgreSQL sur EBS :**
```bash
# Optimal configuration for PostgreSQL
# Use io2 Block Express for mission-critical production

# Data volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 1000 \
    --volume-type io2 \
    --iops 32000 \
    --multi-attach-enabled false \
    --encrypted \
    --tags Key=Name,Value=postgres-data

# WAL volume (separate for better performance)
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 100 \
    --volume-type io2 \
    --iops 10000 \
    --encrypted \
    --tags Key=Name,Value=postgres-wal

# PostgreSQL configuration optimizations
cat > postgresql.conf.snippet <<'EOF'
# EBS-optimized settings
shared_buffers = 25% of RAM
effective_cache_size = 75% of RAM
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1  # Lower for SSD
effective_io_concurrency = 200

# For io2 volumes
max_wal_size = 2GB
min_wal_size = 1GB
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://my-wal-archive/%f'
EOF
```
**MySQL sur EBS :**
```bash
# InnoDB on io2
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 2000 \
    --volume-type io2 \
    --iops 64000 \
    --encrypted

# MySQL configuration
cat > my.cnf.snippet <<'EOF'
[mysqld]
# InnoDB settings for SSD
innodb_flush_method = O_DIRECT
innodb_log_file_size = 2G
innodb_buffer_pool_size = 75% of RAM
innodb_buffer_pool_instances = 8
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
innodb_flush_neighbors = 0  # Disable for SSD
innodb_read_io_threads = 16
innodb_write_io_threads = 16

# Binary logs on separate volume
log_bin = /var/log/mysql-binlog/mysql-bin
relay_log = /var/log/mysql-binlog/relay-bin
EOF
```
### Stratégies de reprise après sinistre

**Stratégie de sauvegarde EBS :**
```python
# dr_backup_strategy.py
import boto3
from datetime import datetime, timedelta

class DisasterRecoveryManager:
    def __init__(self, primary_region, dr_region):
        self.primary_region = primary_region
        self.dr_region = dr_region
        self.ec2_primary = boto3.client('ec2', region_name=primary_region)
        self.ec2_dr = boto3.client('ec2', region_name=dr_region)
    
    def create_dr_snapshot_chain(self, volume_id):
        """
        Create multi-tiered backup strategy:
        - Hourly snapshots (last 24 hours)
        - Daily snapshots (last 7 days)
        - Weekly snapshots (last 4 weeks)
        - Monthly snapshots (last 12 months)
        - Cross-region copy for DR
        """
        
        # Create snapshot
        snapshot = self.ec2_primary.create_snapshot(
            VolumeId=volume_id,
            Description=f'DR snapshot {datetime.utcnow().isoformat()}',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Type', 'Value': 'DR-Snapshot'},
                    {'Key': 'Frequency', 'Value': 'Hourly'},
                    {'Key': 'SourceVolume', 'Value': volume_id}
                ]
            }]
        )
        
        snapshot_id = snapshot['SnapshotId']
        
        # Wait for completion
        waiter = self.ec2_primary.get_waiter('snapshot_completed')
        waiter.wait(SnapshotIds=[snapshot_id])
        
        # Copy to DR region
        dr_snapshot = self.ec2_dr.copy_snapshot(
            SourceRegion=self.primary_region,
            SourceSnapshotId=snapshot_id,
            Description=f'DR copy from {self.primary_region}',
            Encrypted=True,
            KmsKeyId='alias/dr-encryption-key',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Type', 'Value': 'DR-Copy'},
                    {'Key': 'SourceRegion', 'Value': self.primary_region},
                    {'Key': 'SourceSnapshot', 'Value': snapshot_id}
                ]
            }]
        )
        
        print(f"Created snapshot: {snapshot_id}")
        print(f"DR copy: {dr_snapshot['SnapshotId']}")
        
        return snapshot_id, dr_snapshot['SnapshotId']
    
    def cleanup_old_snapshots(self, retention_policy):
        """
        Clean up snapshots based on retention policy
        """
        
        snapshots = self.ec2_primary.describe_snapshots(
            OwnerIds=['self'],
            Filters=[{'Name': 'tag:Type', 'Values': ['DR-Snapshot']}]
        )['Snapshots']
        
        now = datetime.utcnow()
        
        for snapshot in snapshots:
            snapshot_time = snapshot['StartTime'].replace(tzinfo=None)
            age_days = (now - snapshot_time).days
            frequency = next(
                (tag['Value'] for tag in snapshot.get('Tags', []) 
                 if tag['Key'] == 'Frequency'),
                'Unknown'
            )
            
            should_delete = False
            
            if frequency == 'Hourly' and age_days > 1:
                should_delete = True
            elif frequency == 'Daily' and age_days > 7:
                should_delete = True
            elif frequency == 'Weekly' and age_days > 28:
                should_delete = True
            elif frequency == 'Monthly' and age_days > 365:
                should_delete = True
            
            if should_delete:
                self.ec2_primary.delete_snapshot(
                    SnapshotId=snapshot['SnapshotId']
                )
                print(f"Deleted old snapshot: {snapshot['SnapshotId']}")
    
    def test_dr_restore(self, snapshot_id):
        """
        Test DR restore procedure
        """
        
        # Create volume in DR region from snapshot
        volume = self.ec2_dr.create_volume(
            AvailabilityZone=f'{self.dr_region}a',
            SnapshotId=snapshot_id,
            VolumeType='gp3',
            Iops=3000,
            Throughput=125,
            Tags=[
                {'Key': 'Type', 'Value': 'DR-Test'},
                {'Key': 'CreatedAt', 'Value': datetime.utcnow().isoformat()}
            ]
        )
        
        volume_id = volume['VolumeId']
        
        # Wait for volume creation
        waiter = self.ec2_dr.get_waiter('volume_available')
        waiter.wait(VolumeIds=[volume_id])
        
        print(f"DR test volume created: {volume_id}")
        print("Next steps:")
        print("1. Attach to test instance")
        print("2. Mount and verify data integrity")
        print("3. Run application tests")
        print("4. Delete test volume when done")
        
        return volume_id

# Usage
dr_manager = DisasterRecoveryManager('us-east-1', 'us-west-2')
primary_snapshot, dr_snapshot = dr_manager.create_dr_snapshot_chain('vol-primary')
dr_manager.cleanup_old_snapshots({})
```
**Basculement automatisé avec Route 53 :**
```python
# ebs_failover_automation.py
import boto3

def automate_dr_failover(primary_volume_id, primary_region, dr_region):
    """
    Automate failover to DR region
    """
    
    ec2_primary = boto3.client('ec2', region_name=primary_region)
    ec2_dr = boto3.client('ec2', region_name=dr_region)
    route53 = boto3.client('route53')
    
    # 1. Create final snapshot in primary region
    print("Creating final snapshot...")
    snapshot = ec2_primary.create_snapshot(
        VolumeId=primary_volume_id,
        Description='Final snapshot before DR failover'
    )
    snapshot_id = snapshot['SnapshotId']
    
    # 2. Copy to DR region
    print("Copying to DR region...")
    dr_snapshot = ec2_dr.copy_snapshot(
        SourceRegion=primary_region,
        SourceSnapshotId=snapshot_id,
        Description='DR failover snapshot'
    )
    dr_snapshot_id = dr_snapshot['SnapshotId']
    
    # 3. Create volume in DR region
    print("Creating volume in DR region...")
    dr_volume = ec2_dr.create_volume(
        AvailabilityZone=f'{dr_region}a',
        SnapshotId=dr_snapshot_id,
        VolumeType='io2',
        Iops=32000
    )
    dr_volume_id = dr_volume['VolumeId']
    
    # 4. Launch DR instance
    print("Launching DR instance...")
    # Launch instance, attach volume, start application
    
    # 5. Update Route 53 to point to DR region
    print("Updating DNS...")
    route53.change_resource_record_sets(
        HostedZoneId='Z1234567890ABC',
        ChangeBatch={
            'Changes': [{
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': 'db.example.com',
                    'Type': 'CNAME',
                    'TTL': 60,
                    'ResourceRecords': [
                        {'Value': f'dr-db.{dr_region}.compute.amazonaws.com'}
                    ]
                }
            }]
        }
    )
    
    print("DR failover completed!")
    print(f"DR Volume: {dr_volume_id}")
    
    return dr_volume_id
```
### Optimisation des performances EBS

**Réglage de la profondeur de la file d'attente d'E/S :**
```bash
# Check current queue depth
cat /sys/block/nvme1n1/queue/nr_requests

# Increase queue depth for better IOPS
echo 1024 | sudo tee /sys/block/nvme1n1/queue/nr_requests

# Make persistent
cat >> /etc/rc.local <<'EOF'
echo 1024 > /sys/block/nvme1n1/queue/nr_requests
EOF

# For databases, also tune I/O scheduler
# noop scheduler for SSD/NVMe (minimal overhead)
echo noop | sudo tee /sys/block/nvme1n1/queue/scheduler
```
**Configuration RAID :**
```bash
# RAID 0 for maximum performance (no redundancy, use snapshots)
# Aggregate IOPS and throughput from multiple volumes

# Create 4 io2 volumes
for i in {1..4}; do
    aws ec2 create-volume \
        --availability-zone us-east-1a \
        --size 1000 \
        --volume-type io2 \
        --iops 32000 \
        --tags Key=Name,Value=raid-volume-$i
done

# Attach all volumes to instance
# Then configure RAID 0
sudo mdadm --create /dev/md0 --level=0 --raid-devices=4 \
    /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1 /dev/nvme4n1

# Format and mount
sudo mkfs.ext4 /dev/md0
sudo mount /dev/md0 /data

# Result: 4 × 32,000 = 128,000 IOPS
#         4 × 1,000 MB/s = 4,000 MB/s throughput

# Save RAID configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf

# Auto-assemble on boot
sudo update-initramfs -u
```
### Stratégies d'optimisation des coûts

**Migration gp2 vers gp3 :**
```python
# migrate_gp2_to_gp3.py
import boto3

def migrate_volume_gp2_to_gp3(volume_id):
    """
    Migrate gp2 volume to gp3 (no downtime, typically 20-30% cost savings)
    """
    
    ec2 = boto3.client('ec2')
    
    # Get current volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    if volume['VolumeType'] != 'gp2':
        print(f"Volume {volume_id} is not gp2")
        return
    
    size = volume['Size']
    current_iops = min(size * 3, 16000)  # gp2 formula
    
    # Calculate gp3 configuration
    # gp3 baseline: 3,000 IOPS, 125 MB/s
    # Cost: $0.08/GB + $0.005/IOPS above 3,000
    
    if current_iops <= 3000:
        # Use baseline gp3
        target_iops = 3000
        target_throughput = 125
        monthly_savings = size * (0.10 - 0.08)  # $0.02/GB
    else:
        # Provision additional IOPS
        target_iops = current_iops
        target_throughput = 125
        additional_iops = current_iops - 3000
        
        # gp2 cost
        gp2_cost = size * 0.10
        
        # gp3 cost
        gp3_cost = (size * 0.08) + (additional_iops * 0.005)
        
        monthly_savings = gp2_cost - gp3_cost
    
    print(f"Migration plan for {volume_id}:")
    print(f"  Current: gp2, {size} GB, ~{current_iops} IOPS")
    print(f"  Target: gp3, {size} GB, {target_iops} IOPS, {target_throughput} MB/s")
    print(f"  Monthly savings: ${monthly_savings:.2f}")
    
    # Perform migration (no downtime)
    response = ec2.modify_volume(
        VolumeId=volume_id,
        VolumeType='gp3',
        Iops=target_iops,
        Throughput=target_throughput
    )
    
    print(f"Migration initiated: {response['VolumeModification']['ModificationState']}")
    
    return monthly_savings

def bulk_migrate_account():
    """
    Find and migrate all gp2 volumes in account
    """
    
    ec2 = boto3.client('ec2')
    
    # Find all gp2 volumes
    paginator = ec2.get_paginator('describe_volumes')
    
    total_savings = 0
    migrated_count = 0
    
    for page in paginator.paginate(Filters=[{'Name': 'volume-type', 'Values': ['gp2']}]):
        for volume in page['Volumes']:
            volume_id = volume['VolumeId']
            
            # Check if volume is attached
            if volume['State'] == 'in-use':
                savings = migrate_volume_gp2_to_gp3(volume_id)
                total_savings += savings
                migrated_count += 1
    
    print(f"\nMigration Summary:")
    print(f"  Volumes migrated: {migrated_count}")
    print(f"  Total monthly savings: ${total_savings:.2f}")
    print(f"  Annual savings: ${total_savings * 12:.2f}")

# Run migration
bulk_migrate_account()
```
**Optimisation des instantanés :**
```python
# snapshot_cost_optimizer.py
import boto3
from datetime import datetime, timedelta

def optimize_snapshot_storage():
    """
    Analyze and optimize snapshot costs
    """
    
    ec2 = boto3.client('ec2')
    
    # Get all snapshots
    snapshots = ec2.describe_snapshots(OwnerIds=['self'])['Snapshots']
    
    # Analyze snapshot storage
    total_storage = 0
    archivable_snapshots = []
    deletable_snapshots = []
    
    for snapshot in snapshots:
        size = snapshot['VolumeSize']
        start_time = snapshot['StartTime'].replace(tzinfo=None)
        age_days = (datetime.utcnow() - start_time).days
        
        # Calculate incremental storage (approximation)
        # Real incremental storage requires AWS Cost Explorer
        
        total_storage += size
        
        # Identify optimization opportunities
        if age_days > 90 and age_days < 365:
            # Good candidate for Archive tier
            archivable_snapshots.append({
                'SnapshotId': snapshot['SnapshotId'],
                'Size': size,
                'Age': age_days,
                'Savings': size * (0.05 - 0.0125)  # 75% savings
            })
        
        elif age_days > 365:
            # Consider deletion if no longer needed
            tags = {tag['Key']: tag['Value'] for tag in snapshot.get('Tags', [])}
            
            if 'Permanent' not in tags:
                deletable_snapshots.append({
                    'SnapshotId': snapshot['SnapshotId'],
                    'Size': size,
                    'Age': age_days,
                    'Savings': size * 0.05
                })
    
    # Generate report
    print("Snapshot Cost Optimization Report")
    print("=" * 50)
    print(f"Total snapshots: {len(snapshots)}")
    print(f"Total storage: {total_storage} GB")
    print(f"Current monthly cost: ${total_storage * 0.05:.2f}")
    
    print(f"\nArchive candidates: {len(archivable_snapshots)}")
    archive_savings = sum(s['Savings'] for s in archivable_snapshots)
    print(f"Potential monthly savings: ${archive_savings:.2f}")
    
    print(f"\nDeletion candidates: {len(deletable_snapshots)}")
    deletion_savings = sum(s['Savings'] for s in deletable_snapshots)
    print(f"Potential monthly savings: ${deletion_savings:.2f}")
    
    print(f"\nTotal potential savings: ${archive_savings + deletion_savings:.2f}/month")
    print(f"Annual savings: ${(archive_savings + deletion_savings) * 12:.2f}")
    
    return {
        'archivable': archivable_snapshots,
        'deletable': deletable_snapshots,
        'total_savings': archive_savings + deletion_savings
    }

def archive_old_snapshots(snapshot_ids):
    """
    Archive snapshots to reduce costs
    """
    
    ec2 = boto3.client('ec2')
    
    for snapshot_id in snapshot_ids:
        # Archive snapshot (moves to Archive tier)
        ec2.modify_snapshot_tier(
            SnapshotId=snapshot_id,
            StorageTier='archive'
        )
        
        print(f"Archived snapshot: {snapshot_id}")

# Run optimization
optimization_plan = optimize_snapshot_storage()
```
## Conseils \& Bonnes pratiques

### Conseils pour la sélection du type de volume

**Astuce 1 : Utilisez gp3 par défaut**
```
Compared to gp2:
- 20% cheaper per GB
- Predictable performance (no burst credits)
- Independently scale IOPS and throughput
- Same latency characteristics

Recommendation: Migrate all gp2 to gp3
```
**Astuce 2 : Choisissez io2 pour les bases de données**
```
Use io2/io2 Block Express when:
- Database workload (MySQL, PostgreSQL, Oracle)
- Need consistent IOPS > 16,000
- Sub-millisecond latency required
- 99.999% durability needed

Don't use for:
- Boot volumes (gp3 sufficient)
- Log files (st1 better for sequential writes)
- Development/test (gp3 adequate)
```
**Astuce 3 : Utilisez st1 pour les charges de travail séquentielles**
```bash
# Big data, data warehousing, log processing
# Example: Kafka storage

# Create st1 volume
aws ec2 create-volume \
    --availability-zone us-east-1a \
    --size 2000 \
    --volume-type st1  # $0.045/GB vs $0.08/GB for gp3

# Result: $90/month vs $160/month = $70 savings
# For sequential I/O workloads only
```
### Conseils sur les performances

**Astuce 4 : Activez l'optimisation EBS**
```bash
# Check if instance type supports EBS optimization
aws ec2 describe-instance-types \
    --instance-types m5.xlarge \
    --query 'InstanceTypes[0].EbsInfo'

# Enable on instance
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --ebs-optimized

# Result: Dedicated bandwidth for EBS (no network contention)
# m5.xlarge: Up to 4,750 Mbps (593 MB/s) EBS bandwidth
```
**Astuce 5 : Préchauffer les volumes à partir d'instantanés**
```bash
# New volumes from snapshots have lazy initialization
# First access to each block is slow

# Pre-warm by reading entire volume
sudo fio --filename=/dev/nvme1n1 \
    --rw=read \
    --bs=1M \
    --direct=1 \
    --name=prewarm

# Or use Fast Snapshot Restore (FSR)
aws ec2 enable-fast-snapshot-restores \
    --availability-zones us-east-1a \
    --source-snapshot-ids snap-1234567890abcdef0

# FSR cost: $0.75/hour per snapshot per AZ
# Worth it for critical restores
```
**Astuce 6 : Alignez les limites des partitions**
```bash
# Misaligned partitions reduce IOPS by 20-30%

# Check alignment
sudo parted /dev/nvme1n1 align-check opt 1

# Create aligned partition
sudo parted -a optimal /dev/nvme1n1 mklabel gpt
sudo parted -a optimal /dev/nvme1n1 mkpart primary 0% 100%

# Format with optimal stripe size
sudo mkfs.ext4 -E stride=16,stripe-width=64 /dev/nvme1n1p1
```
### Conseils de sauvegarde et de récupération

**Astuce 7 : Automatisez les instantanés avec DLM**
```bash
# Use Data Lifecycle Manager instead of manual scripts
# - Automatic scheduling
# - Retention management
# - Cross-region copy
# - Fast Snapshot Restore
# - No Lambda/cron needed
```
**Astuce 8 : baliser les volumes pour les politiques de sauvegarde**
```bash
# Tag-based backup policies
aws ec2 create-tags \
    --resources vol-1234567890abcdef0 \
    --tags \
        Key=Backup,Value=Daily \
        Key=Retention,Value=30days \
        Key=Critical,Value=true

# DLM automatically backs up based on tags
# Makes backup management scalable
```
**Astuce 9 : tester les procédures de restauration**
```python
# test_restore.py
def test_snapshot_restore(snapshot_id):
    """
    Regularly test restore procedures
    """
    
    # 1. Create volume from snapshot
    volume = create_volume_from_snapshot(snapshot_id)
    
    # 2. Attach to test instance
    attach_volume(volume_id, test_instance_id)
    
    # 3. Mount and verify data
    result = verify_data_integrity(volume_id)
    
    # 4. Measure restore time
    restore_time = calculate_restore_time()
    
    # 5. Clean up
    cleanup_test_resources(volume_id)
    
    # 6. Document
    log_restore_test_results(result, restore_time)
    
    return result

# Run monthly restore tests
schedule_restore_tests(frequency='monthly')
```
### Conseils d'optimisation des coûts

**Astuce 10 : Volumes de bonne taille**
```python
# volume_sizing_analyzer.py
import boto3

def analyze_volume_utilization(volume_id):
    """
    Analyze if volume is over-provisioned
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get IOPS utilization
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/EBS',
        MetricName='VolumeConsumedReadWriteOps',
        Dimensions=[{'Name': 'VolumeId', 'Value': volume_id}],
        StartTime=datetime.now() - timedelta(days=7),
        EndTime=datetime.now(),
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    if not response['Datapoints']:
        return None
    
    avg_iops = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
    max_iops = max(d['Maximum'] for d in response['Datapoints'])
    
    # Get volume configuration
    ec2 = boto3.client('ec2')
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    provisioned_iops = volume.get('Iops', 3000)
    utilization = (avg_iops / provisioned_iops) * 100
    
    recommendations = []
    
    if utilization < 20:
        # Significantly over-provisioned
        recommended_iops = int(max_iops * 1.5)  # 50% buffer
        
        if recommended_iops < 3000:
            recommended_iops = 3000  # gp3 baseline
        
        current_cost = calculate_volume_cost(volume)
        recommended_cost = calculate_cost_with_iops(volume, recommended_iops)
        savings = current_cost - recommended_cost
        
        recommendations.append({
            'action': 'Reduce provisioned IOPS',
            'current': provisioned_iops,
            'recommended': recommended_iops,
            'monthly_savings': savings
        })
    
    return {
        'volume_id': volume_id,
        'utilization': utilization,
        'recommendations': recommendations
    }
```
**Astuce 11 : Supprimer les volumes non attachés**
```bash
# Find unused volumes
aws ec2 describe-volumes \
    --filters Name=status,Values=available \
    --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
    --output table

# Calculate cost of unused volumes
# Check last attachment time before deleting

# Create snapshot before deletion (safety)
aws ec2 create-snapshot --volume-id vol-unused
aws ec2 delete-volume --volume-id vol-unused
```
**Astuce 12 : Utilisez l'accès peu fréquent EFS pour les données froides**
```bash
# EFS with lifecycle management
# Standard: $0.30/GB-month
# IA: $0.025/GB-month (92% savings)

# Enable lifecycle policy
aws efs put-lifecycle-configuration \
    --file-system-id fs-1234567890abcdef0 \
    --lifecycle-policies \
        TransitionToIA=AFTER_30_DAYS

# Files not accessed for 30 days automatically move to IA
# Moved back to Standard on access
# No application changes needed
```
## Pièges \& Remèdes

### Piège 1 : mauvaise sélection du type de volume

**Problème :** Sélection d'un type de volume inapproprié pour la charge de travail, entraînant de mauvaises performances ou un gaspillage de coûts.

**Pourquoi cela arrive :**

- Ne pas comprendre les modèles d'E/S de la charge de travail
- Utilisation des valeurs par défaut sans analyse
- Choisir uniquement en fonction du prix
- Les anciens volumes gp2 non migrés

**Impact :**

- Mauvaises performances des applications
- Ralentissements de la base de données
- Gaspillage d'argent sur un stockage surprovisionné
- Performances en rafale imprévisibles (gp2)

**Exemple :**
```
Scenario: MySQL database on gp2

gp2 Configuration:
- Size: 500 GB
- Baseline IOPS: 1,500 (3 IOPS/GB)
- Burst to: 3,000 IOPS (using burst credits)

Problem:
- Database needs consistent 5,000 IOPS
- Burst credits deplete quickly
- Performance degrades to 1,500 IOPS baseline
- Database transactions slow to a crawl
```
**Remède :**

**Étape 1 : Analyser la charge de travail**
```python
# analyze_workload_iops.py
import boto3
from datetime import datetime, timedelta

def analyze_volume_requirements(volume_id, days=7):
    """
    Analyze actual IOPS requirements
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    metrics = ['VolumeReadOps', 'VolumeWriteOps']
    
    total_iops_data = []
    
    for metric in metrics:
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/EBS',
            MetricName=metric,
            Dimensions=[{'Name': 'VolumeId', 'Value': volume_id}],
            StartTime=datetime.now() - timedelta(days=days),
            EndTime=datetime.now(),
            Period=300,  # 5-minute intervals
            Statistics=['Average', 'Maximum']
        )
        
        for datapoint in response['Datapoints']:
            total_iops_data.append(datapoint)
    
    if not total_iops_data:
        return None
    
    avg_iops = sum(d['Average'] for d in total_iops_data) / len(total_iops_data)
    max_iops = max(d['Maximum'] for d in total_iops_data)
    p95_iops = sorted([d['Maximum'] for d in total_iops_data])[int(len(total_iops_data) * 0.95)]
    
    # Recommend volume type
    if p95_iops < 3000:
        recommendation = {
            'type': 'gp3',
            'iops': 3000,
            'throughput': 125,
            'reason': 'Baseline gp3 sufficient'
        }
    elif p95_iops < 16000:
        recommendation = {
            'type': 'gp3',
            'iops': int(p95_iops * 1.2),  # 20% buffer
            'throughput': 125,
            'reason': 'gp3 with additional IOPS'
        }
    else:
        recommendation = {
            'type': 'io2',
            'iops': int(p95_iops * 1.2),
            'reason': 'Consistent high IOPS required'
        }
    
    return {
        'current_utilization': {
            'average_iops': avg_iops,
            'max_iops': max_iops,
            'p95_iops': p95_iops
        },
        'recommendation': recommendation
    }

# Analyze and recommend
analysis = analyze_volume_requirements('vol-1234567890abcdef0')
print(f"Recommended: {analysis['recommendation']['type']}")
print(f"IOPS: {analysis['recommendation']['iops']}")
```
**Étape 2 : Migrer vers le type de volume approprié**
```bash
# Migrate gp2 to io2 (example for database)
# No downtime, happens while volume is in use

aws ec2 modify-volume \
    --volume-id vol-1234567890abcdef0 \
    --volume-type io2 \
    --iops 10000

# Monitor modification progress
aws ec2 describe-volumes-modifications \
    --volume-ids vol-1234567890abcdef0

# Takes 1-6 hours depending on volume size
# Can continue using volume during modification
```
**Étape 3 : Valider l'amélioration des performances**
```bash
# Test IOPS after migration
sudo fio --name=randread --ioengine=libaio --iodepth=32 \
    --rw=randread --bs=4k --direct=1 --size=1G \
    --numjobs=4 --runtime=60 --group_reporting \
    --filename=/dev/nvme1n1

# Expected results:
# gp2 (burst depleted): ~1,500 IOPS
# io2 (10,000 provisioned): ~10,000 IOPS
```
**Prévention :**

- Profiler les charges de travail avant de sélectionner le type de volume
- Surveiller les IOPS et l'utilisation du débit
- Utilisez io2 pour les bases de données nécessitant des performances constantes
- Migrez tous les gp2 vers gp3 pour réaliser des économies
- Définir des alarmes CloudWatch pour l'épuisement du crédit en rafale (gp2)

***

### Piège 2 : Lacunes du cycle de vie des instantanés

**Problème :** Aucune stratégie d'instantané automatisée, ce qui entraîne une perte de données ou des coûts d'instantané excessifs.

**Pourquoi cela arrive :**

- Processus d'instantanés manuels oubliés
- Aucune politique de rétention
- Instantanés jamais supprimés
- Pas de copie inter-régions pour DR

**Impact :**

- Perte de données en cas de panne de volumes
- Incapacité à répondre aux exigences RPO/RTO
- Coûts excessifs de stockage d'instantanés
- Aucune capacité de reprise après sinistre

**Remède :**

**Étape 1 : Mettre en œuvre une politique DLM complète**
```bash
# Create DLM lifecycle policy
cat > comprehensive-dlm-policy.json <<'EOF'
{
  "ExecutionRoleArn": "arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole",
  "Description": "Comprehensive backup strategy with multiple tiers",
  "State": "ENABLED",
  "PolicyDetails": {
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "true"}],
    "Schedules": [
      {
        "Name": "Hourly snapshots (24-hour retention)",
        "CreateRule": {
          "Interval": 1,
          "IntervalUnit": "HOURS",
          "Times": ["00:00"]
        },
        "RetainRule": {"Count": 24},
        "TagsToAdd": [{"Key": "Type", "Value": "Hourly"}],
        "CopyTags": true
      },
      {
        "Name": "Daily snapshots (7-day retention)",
        "CreateRule": {
          "Interval": 24,
          "IntervalUnit": "HOURS",
          "Times": ["02:00"]
        },
        "RetainRule": {"Count": 7},
        "TagsToAdd": [{"Key": "Type", "Value": "Daily"}],
        "CrossRegionCopyRules": [{
          "TargetRegion": "us-west-2",
          "Encrypted": true,
          "RetainRule": {"Interval": 7, "IntervalUnit": "DAYS"}
        }]
      },
      {
        "Name": "Weekly snapshots (4-week retention)",
        "CreateRule": {
          "CronExpression": "cron(0 3 ? * SUN *)"
        },
        "RetainRule": {"Count": 4},
        "TagsToAdd": [{"Key": "Type", "Value": "Weekly"}]
      },
      {
        "Name": "Monthly snapshots (12-month retention + archive)",
        "CreateRule": {
          "CronExpression": "cron(0 4 1 * ? *)"
        },
        "RetainRule": {"Count": 12},
        "ArchiveRule": {
          "RetainRule": {"RetentionArchiveTier": {"Count": 365}}
        },
        "TagsToAdd": [{"Key": "Type", "Value": "Monthly"}]
      }
    ]
  }
}
EOF

aws dlm create-lifecycle-policy \
    --cli-input-json file://comprehensive-dlm-policy.json
```
**Étape 2 : Activer la corbeille**
```bash
# Protect against accidental snapshot deletion
aws rbin create-rule \
    --resource-type EBS_SNAPSHOT \
    --retention-period RetentionPeriodValue=7,RetentionPeriodUnit=DAYS \
    --description "Retain deleted snapshots for 7 days" \
    --tags Key=Environment,Value=Production

# Deleted snapshots go to Recycle Bin
# Can be recovered within retention period
```
**Étape 3 : Surveiller la conformité des sauvegardes**
```python
# snapshot_compliance_monitor.py
import boto3
from datetime import datetime, timedelta

def check_snapshot_compliance():
    """
    Verify all critical volumes have recent snapshots
    """
    
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')
    
    # Get all volumes tagged for backup
    volumes = ec2.describe_volumes(
        Filters=[
            {'Name': 'tag:Backup', 'Values': ['true', 'Daily']},
            {'Name': 'status', 'Values': ['in-use']}
        ]
    )['Volumes']
    
    non_compliant = []
    
    for volume in volumes:
        volume_id = volume['VolumeId']
        
        # Get snapshots for this volume
        snapshots = ec2.describe_snapshots(
            Filters=[
                {'Name': 'volume-id', 'Values': [volume_id]},
                {'Name': 'status', 'Values': ['completed']}
            ]
        )['Snapshots']
        
        if not snapshots:
            non_compliant.append({
                'volume_id': volume_id,
                'issue': 'No snapshots exist',
                'severity': 'CRITICAL'
            })
            continue
        
        # Check most recent snapshot
        latest_snapshot = max(snapshots, key=lambda s: s['StartTime'])
        snapshot_age = datetime.now(latest_snapshot['StartTime'].tzinfo) - latest_snapshot['StartTime']
        
        if snapshot_age > timedelta(hours=25):  # Allow 1 hour grace period
            non_compliant.append({
                'volume_id': volume_id,
                'issue': f'Latest snapshot is {snapshot_age.days} days old',
                'severity': 'HIGH',
                'latest_snapshot': latest_snapshot['SnapshotId']
            })
    
    # Alert if non-compliant volumes found
    if non_compliant:
        message = "Snapshot Compliance Issues\n\n"
        message += f"Found {len(non_compliant)} non-compliant volumes:\n\n"
        
        for item in non_compliant:
            message += f"Volume: {item['volume_id']}\n"
            message += f"Issue: {item['issue']}\n"
            message += f"Severity: {item['severity']}\n\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:backup-alerts',
            Subject='⚠️ Snapshot Compliance Alert',
            Message=message
        )
    
    return non_compliant

# Run daily
compliance_issues = check_snapshot_compliance()
```
**Prévention :**

- Utilisez DLM pour les instantanés automatisés
- Mettre en œuvre plusieurs niveaux de rétention
- Activer la copie inter-régions pour DR
- Surveiller avec CloudWatch Events
- Testez régulièrement les procédures de restauration
- Utilisez la corbeille pour la protection contre la suppression

***

### Piège 3 : Ne pas activer le cryptage EBS

**Problème :** Les volumes EBS non chiffrés exposent les données au repos.

**Pourquoi cela arrive :**

- Le cryptage n'est pas activé par défaut
- Volumes hérités créés avant le chiffrement par défaut
- Ne pas comprendre les exigences de conformité
- En supposant que la sécurité du VPC soit suffisante

**Impact :**

- Violations de conformité (HIPAA, PCI-DSS, RGPD)
- Exposition des données si le support physique est compromis
- Échecs de l'audit
- Incapacité à répondre aux exigences de sécurité

**Remède :**

**Étape 1 : Activer le cryptage par défaut**
```bash
# Enable for all new volumes (account-level setting)
aws ec2 enable-ebs-encryption-by-default --region us-east-1

# Verify
aws ec2 get-ebs-encryption-by-default --region us-east-1

# Apply to all regions
for region in $(aws ec2 describe-regions --query 'Regions[].RegionName' --output text); do
    aws ec2 enable-ebs-encryption-by-default --region $region
    echo "Enabled encryption by default in $region"
done
```
**Étape 2 : Chiffrer les volumes non chiffrés existants**
```python
# encrypt_existing_volumes.py
import boto3

def encrypt_volume(volume_id):
    """
    Encrypt an existing unencrypted volume
    Requires creating snapshot and new volume
    """
    
    ec2 = boto3.client('ec2')
    
    # Get volume details
    volume = ec2.describe_volumes(VolumeIds=[volume_id])['Volumes'][0]
    
    if volume['Encrypted']:
        print(f"Volume {volume_id} already encrypted")
        return
    
    availability_zone = volume['AvailabilityZone']
    volume_type = volume['VolumeType']
    size = volume['Size']
    iops = volume.get('Iops')
    throughput = volume.get('Throughput')
    tags = volume.get('Tags', [])
    
    # Check if volume is attached
    if volume['Attachments']:
        attachment = volume['Attachments'][0]
        instance_id = attachment['InstanceId']
        device = attachment['Device']
        delete_on_termination = attachment['DeleteOnTermination']
        
        print(f"Volume attached to {instance_id} as {device}")
        print("WARNING: This will require instance downtime")
        print("Consider stopping instance or detaching volume")
        
        # For production, implement proper coordination
        # This is simplified example
        
        # Stop instance
        print("Stopping instance...")
        ec2.stop_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        # Detach volume
        ec2.detach_volume(VolumeId=volume_id)
        waiter = ec2.get_waiter('volume_available')
        waiter.wait(VolumeIds=[volume_id])
    
    # Create snapshot
    print("Creating snapshot...")
    snapshot = ec2.create_snapshot(
        VolumeId=volume_id,
        Description=f'Pre-encryption snapshot of {volume_id}'
    )
    snapshot_id = snapshot['SnapshotId']
    
    waiter = ec2.get_waiter('snapshot_completed')
    waiter.wait(SnapshotIds=[snapshot_id])
    
    # Create encrypted volume from snapshot
    print("Creating encrypted volume...")
    
    create_params = {
        'AvailabilityZone': availability_zone,
        'SnapshotId': snapshot_id,
        'VolumeType': volume_type,
        'Size': size,
        'Encrypted': True,
        'KmsKeyId': 'alias/ebs-encryption',
        'TagSpecifications': [{
            'ResourceType': 'volume',
            'Tags': tags + [{'Key': 'EncryptedFrom', 'Value': volume_id}]
        }]
    }
    
    if iops:
        create_params['Iops'] = iops
    if throughput:
        create_params['Throughput'] = throughput
    
    new_volume = ec2.create_volume(**create_params)
    new_volume_id = new_volume['VolumeId']
    
    waiter = ec2.get_waiter('volume_available')
    waiter.wait(VolumeIds=[new_volume_id])
    
    # If was attached, reattach encrypted volume
    if volume['Attachments']:
        ec2.attach_volume(
            VolumeId=new_volume_id,
            InstanceId=instance_id,
            Device=device
        )
        
        # Modify attachment attributes
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            BlockDeviceMappings=[{
                'DeviceName': device,
                'Ebs': {'DeleteOnTermination': delete_on_termination}
            }]
        )
        
        # Start instance
        ec2.start_instances(InstanceIds=[instance_id])
        print(f"Reattached encrypted volume and started instance")
    
    print(f"Encryption complete!")
    print(f"New encrypted volume: {new_volume_id}")
    print(f"Old unencrypted volume: {volume_id} (not deleted)")
    print(f"Snapshot: {snapshot_id}")
    
    return new_volume_id

# Usage
# encrypt_volume('vol-unencrypted123')
```
**Étape 3 : Audit et rapport**
```python
# audit_encryption.py
def audit_ebs_encryption():
    """
    Find all unencrypted volumes
    """
    
    ec2 = boto3.client('ec2')
    
    # Get all volumes
    paginator = ec2.get_paginator('describe_volumes')
    
    unencrypted_volumes = []
    
    for page in paginator.paginate():
        for volume in page['Volumes']:
            if not volume['Encrypted']:
                unencrypted_volumes.append({
                    'VolumeId': volume['VolumeId'],
                    'Size': volume['Size'],
                    'State': volume['State'],
                    'AttachedTo': volume['Attachments'][0]['InstanceId'] if volume['Attachments'] else None,
                    'VolumeType': volume['VolumeType']
                })
    
    # Generate report
    print("Unencrypted EBS Volumes Report")
    print("=" * 50)
    print(f"Total unencrypted volumes: {len(unencrypted_volumes)}")
    
    attached_count = sum(1 for v in unencrypted_volumes if v['AttachedTo'])
    print(f"Attached: {attached_count}")
    print(f"Available: {len(unencrypted_volumes) - attached_count}")
    
    total_size = sum(v['Size'] for v in unencrypted_volumes)
    print(f"Total size: {total_size} GB")
    
    print("\nVolumes:")
    for vol in unencrypted_volumes:
        print(f"  {vol['VolumeId']}: {vol['Size']} GB, {vol['State']}, attached to {vol['AttachedTo']}")
    
    return unencrypted_volumes

# Run audit
unencrypted = audit_ebs_encryption()
```
**Prévention :**

- Activer le cryptage par défaut pour toutes les régions
- Utilisez les règles AWS Config pour détecter les volumes non chiffrés
- Implémenter l'exigence de chiffrement dans les modèles IaC
- Audits réguliers et remédiation automatisée
- Formation sur les exigences de conformité

***

## Résumé du chapitre

Amazon EBS et EFS fournissent un stockage persistant et hautes performances pour les instances EC2, chacune optimisée pour différents cas d'utilisation. EBS propose un stockage au niveau bloc avec plusieurs types de volumes pour répondre à diverses exigences de charge de travail, du gp3 à usage général au Block Express io2 ultra hautes performances. EFS fournit des systèmes de fichiers NFS partagés et évolutifs accessibles simultanément par plusieurs instances. Comprendre les types de volumes, les caractéristiques de performances, les stratégies d'instantanés, le chiffrement et l'optimisation des coûts est essentiel pour les déploiements de production.

**Principaux points à retenir :**

- **La sélection du type de volume est importante :** gp3 pour un usage général, io2 pour les bases de données, st1 pour les charges de travail séquentielles, EFS pour les systèmes de fichiers partagés
- **Migrer gp2 vers gp3 :** 20 % d'économies avec des performances meilleures et prévisibles
- **Automatisez les instantanés :** Utilisez Data Lifecycle Manager pour une stratégie de sauvegarde complète avec des politiques de rétention
- **Activer le chiffrement :** Chiffrer par défaut, chiffrer les volumes existants, utiliser KMS pour la gestion des clés
- **Surveillez les performances :** métriques CloudWatch pour les IOPS, le débit et l'équilibre en rafale ; définir des alarmes pour les problèmes
- **Optimiser les coûts :** Dimensionner correctement les volumes, supprimer les volumes inutilisés, archiver les anciens instantanés, utiliser EFS IA pour les données froides

Comprendre EBS et EFS en profondeur vous permet de créer des solutions de stockage performantes, fiables et rentables pour les bases de données, les applications et les systèmes de fichiers partagés.

## Questions de révision

1. **Quel type de volume EBS offre le coût le plus bas ?**
a) gp3
b) st1
c) sc1
d) gp2

**Réponse : C** - Le disque dur froid (sc1) à \$0,015/Go-mois est le type de volume EBS le moins cher.

2. **IOPS maximales pour io2 Block Express ?**
a) 16 000
b) 64 000
c) 128 000
d) 256 000

**Réponse : D** - io2 Block Express prend en charge jusqu'à 256 000 IOPS.

3. **Performances de base du GP3 ?**
a) 100 IOPS, 125 Mo/s
b) 3 000 IOPS, 125 Mo/s
c) 16 000 IOPS, 1 000 Mo/s
d) 10 000 IOPS, 250 Mo/s

**Réponse : B** - La ligne de base de GP3 est de 3 000 IOPS et un débit de 125 Mo/s.

4. **Les instantanés EBS sont stockés dans :**
a) EBS
b)S3
c) EFS
d) Magasin d'instances

**Réponse : B** - Les instantanés EBS sont stockés dans Amazon S3 (même si vous n'y accédez pas directement).

5. **Pouvez-vous attacher un volume EBS à plusieurs instances ?**
a) Non, jamais
b) Oui, toujours
c) Oui, avec Multi-Attach (io2 uniquement, même AZ)
d) Oui, dans toutes les régions

**Réponse : C** - Multi-Attach permet aux volumes io2/io2 Block Express de se connecter à jusqu'à 16 instances dans la même zone de disponibilité.

6. **Mode de performances EFS pour un débit maximal ?**
a) Usage général
b) E/S maximales
c) Provisionné
d) Éclatement

**Réponse : B** - Le mode de performances d'E/S maximales offre un débit global plus élevé pour les charges de travail à grande échelle.

7. **Conservation minimale pour les archives d'instantanés EBS ?**
a) 7 jours
b) 30 jours
c) 90 jours
d) 180 jours

**Réponse : C** - Snapshot Archive a une conservation minimale de 90 jours.

8. **Quel type de volume convient le mieux aux entrepôts de données ?**
a) gp3
b)io2
c) st1
d) sc1

**Réponse : C** - Le disque dur à débit optimisé (st1) est optimisé pour les charges de travail séquentielles telles que les entrepôts de données.

9. **Économies de coûts d'accès peu fréquent EFS ?**
a) 50%
b) 70%
c) 92%
d) 99%

**Réponse : C** - EFS IA coûte \$0,025/Go contre \$0,30/Go Standard (92 % d'économies).

10. **Taille maximale du volume EBS ?**
a) 1 Tio
b) 16 Tio
c) 64 Tio
d) Illimité

**Réponse : C** - io2 Block Express prend en charge jusqu'à 64 TiB (16 TiB pour les autres types).

11. **Coût de restauration rapide d'instantanés ?**
a) Gratuit
b) 0,10 $/heure par instantané et par zone de disponibilité
c) 0,75 $/heure par instantané et par zone de disponibilité
d) \$1,00/heure par instantané et par AZ

**Réponse : C** - FSR coûte \$0,75 par heure, par instantané et par AZ.

12. **Formule IOPS gp2 ?**
a) 1 IOPS par Go
b) 3 IOPS par Go
c) 10 IOPS par Go
d) Correction de 3 000 IOPS

**Réponse : B** - gp2 fournit 3 IOPS par Go (minimum 100, maximum 16 000).

13. **Quelle option de cryptage fournit une piste d'audit ?**
a) Clé gérée par AWS par défaut
b) Clé KMS gérée par le client
c) Pas de cryptage
d) Chiffrement côté client

**Réponse : B** - Les clés KMS gérées par le client enregistrent toutes les opérations de chiffrement dans CloudTrail.

14. **EFS peut être monté par instances dans :**
a) AZ unique uniquement
b) Plusieurs AZ dans la même région
c) Plusieurs régions
d) Instance unique uniquement

**Réponse : B** - EFS peut être monté par des instances sur plusieurs AZ dans la même région.

15. **Les instantanés sont :**
a) Sauvegardes complètes à chaque fois
b) Incrémentiel après le premier instantané
c) Sauvegardes différentielles
d) Sauvegarde continue en temps réel

**Réponse : B** - Le premier instantané est complet, les instantanés suivants sont incrémentiels (uniquement les blocs modifiés).

***

Ces questions couvrent les concepts EBS/EFS clés de l'examen AWS Certified Solutions Architect - Associate.
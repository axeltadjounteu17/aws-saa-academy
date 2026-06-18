# Partie 4 : Services de base de données

# Chapitre 11 : Amazon RDS \& Aurora

##Présentation

Les bases de données relationnelles constituent l'épine dorsale de la plupart des applications d'entreprise, stockant des données structurées avec des garanties ACID, prenant en charge des requêtes complexes avec SQL et préservant l'intégrité référentielle via des clés étrangères. Amazon Relational Database Service (RDS) et Amazon Aurora révolutionnent la gestion des bases de données en automatisant les tâches administratives chronophages (approvisionnement, correctifs, sauvegardes, récupération, détection des pannes et réparation) tout en offrant une fiabilité, une sécurité et des performances de niveau entreprise pour une fraction du coût opérationnel.

RDS prend en charge six moteurs de base de données : PostgreSQL, MySQL, MariaDB, Oracle, SQL Server et Amazon Aurora, vous permettant d'exécuter des bases de données familières dans le cloud sans modifier le code de l'application. RDS automatise les sauvegardes, les correctifs logiciels, la mise à l'échelle et la réplication, réduisant ainsi les frais d'administration des bases de données jusqu'à 80 %. Les déploiements multi-AZ offrent un basculement automatique pour une haute disponibilité, tandis que les réplicas en lecture permettent une mise à l'échelle horizontale pour les charges de travail lourdes en lecture. Comprendre quand utiliser chaque moteur, comment configurer les performances et mettre en œuvre des stratégies de sauvegarde appropriées sépare l'utilisation de base de RDS des déploiements de niveau production.

Amazon Aurora, la base de données relationnelle cloud native d'AWS, représente une réarchitecture fondamentale. Conçu dès le départ pour le cloud, Aurora offre jusqu'à 5 fois le débit de MySQL et 3x PostgreSQL, avec un stockage qui évolue automatiquement de 10 Go à 128 To. L'architecture distribuée et tolérante aux pannes d'Aurora réplique les données de six manières sur trois zones de disponibilité, offrant une disponibilité de 99,99 % avec un basculement automatique en moins de 30 secondes. Aurora Global Database permet une réplication en moins d'une seconde entre les régions pour la reprise après sinistre et les applications mondiales. Ces innovations font d'Aurora le choix par défaut pour les nouvelles applications cloud natives nécessitant des fonctionnalités de base de données relationnelles.

Ce chapitre fournit une couverture complète de RDS et Aurora, des principes fondamentaux aux modèles de production. Vous apprendrez les critères de sélection du moteur, les architectures multi-AZ et de réplica en lecture, les stratégies de sauvegarde et de récupération, les techniques d'optimisation des performances, les fonctionnalités spécifiques à Aurora telles que Aurora Serverless et Global Database, la surveillance et les alertes, l'optimisation des coûts et les implémentations de haute disponibilité. Que vous migraciez des bases de données existantes ou créiez de nouvelles applications, la maîtrise de RDS et Aurora est essentielle pour des applications cloud fiables et performantes.

## Théorie \&Concepts

### Fondamentaux du RDS

**Qu'est-ce qu'Amazon RDS ?**

RDS est un service de base de données relationnelle géré qui automatise les tâches administratives tout en fournissant les moteurs de base de données que vous connaissez déjà.

**Principales caractéristiques :**

- **Gestion automatisée :** Provisionnement, correctifs, sauvegardes, récupération
- **Haute disponibilité :** Déploiements multi-AZ avec basculement automatique
- **Évolutivité :** Mise à l'échelle verticale (types d'instances) et horizontale (réplicas en lecture)
- **Sécurité :** Chiffrement au repos et en transit, isolation VPC, intégration IAM
- **Surveillance :** métriques CloudWatch, surveillance améliorée, informations sur les performances
- **Sauvegarde :** Sauvegardes automatisées, instantanés, récupération à un moment précis

**RDS vs base de données autogérée :**


| Fonctionnalité | RDS | Autogéré (EC2) |
| :-- | :-- | :-- |
| **Temps de configuration** | Procès-verbal | Heures/Jours |
| **Patching** | Automatique | Manuel |
| **Sauvegardes** | Automatisé | Configuration manuelle |
| **Haute disponibilité** | Multi-AZ intégré | Configuration manuelle |
| **Surveillance** | Intégré | Configuration manuelle |
| **Coût** | Payer pour un service géré | Coût de base inférieur, coût d'exploitation plus élevé |
| **Contrôle** | Accès limité au système d'exploitation | Contrôle total |
| **Cas d'utilisation** | La plupart des applications | Exigences particulières |

### Moteurs de base de données RDS

**1. Amazone Aurore**

Base de données cloud native d'AWS, compatible avec MySQL et PostgreSQL.

- **Performances :** Jusqu'à 5x MySQL, 3x PostgreSQL
- **Stockage :** Mise à l'échelle automatique de 10 Go à 128 To
- **Configurations de stockage :** Standard (paiement par E/S) ou **Aurora I/O-Optimized** (coût de stockage plus élevé, pas de frais par E/S — idéal pour les charges de travail gourmandes en E/S)
- **Réplication :** Jusqu'à 15 réplicas en lecture
- **Disponibilité :** 99,99 % avec Multi-AZ
- **Cas d'utilisation :** Applications cloud natives, exigences de performances élevées
- **Coût :** Plus élevé que les moteurs RDS standard

**2. PostgreSQL**

Base de données open source riche en fonctionnalités et fortement conforme aux normes.

- **Versions :** 13, 14, 15, 16, 17 (consultez la documentation AWS pour connaître les dernières versions prises en charge ; les anciennes versions arrivent en fin de vie)
- **Caractéristiques :** Prise en charge de JSON, recherche en texte intégral, index avancés
- **Extensions :** PostGIS, pg_stat_statements, auto_explain
- **Cas d'utilisation :** Requêtes complexes, données JSON, applications SIG
- **Points forts :** Conformité aux standards, extensibilité, JSON

**3. MySQL**

Base de données open source populaire avec un vaste écosystème.

- **Versions :** 8.0, 8.4 (LTS, sortie en 2024)
- **Caractéristiques :** Moteur InnoDB, réplication, partitionnement
- **Cas d'utilisation :** Applications Web, WordPress, à usage général
- **Atouts :** Grande communauté, large support d'outils

> **Remarque :** MySQL 5.7 a atteint la fin de sa vie utile en octobre 2023. Migrez vers MySQL 8.0 ou 8.4.

**4. MariaDB**

Fork MySQL avec des fonctionnalités et des performances améliorées.

- **Version :** 10.5, 10.6, 10.11
- **Caractéristiques :** Réplication améliorée, moteurs de stockage
- **Cas d'utilisation :** Remplacement de MySQL avec améliorations
- **Atouts :** Améliorations des performances par rapport à MySQL

**5. Oracle**

Base de données d'entreprise avec des fonctionnalités avancées.

- **Éditions :** Standard, Standard One, Enterprise
- **Licence :** Apportez votre propre licence (BYOL) ou licence incluse
- **Caractéristiques :** Alternative RAC (Multi-AZ), veille Data Guard
- **Cas d'utilisation :** Applications d'entreprise, déploiements Oracle existants
- **Coût :** Le plus élevé (licence)

**6. Serveur SQL**

Base de données relationnelle de Microsoft.

- **Éditions :** Express, Web, Standard, Entreprise
**Version SQL Server :** 2017, 2019, 2022
- **Caractéristiques :** T-SQL, services d'intégration, toujours activé (multi-AZ)
- **Cas d'utilisation :** applications .NET, écosystème Microsoft
- **Licence :** BYOL ou licence incluse

**Guide de sélection du moteur :**
```
PostgreSQL: Complex queries, JSON, standards compliance
MySQL: Web apps, high community support, proven scale
Aurora: Cloud-native, highest performance, critical workloads
MariaDB: MySQL alternative with enhancements
Oracle: Enterprise apps, Oracle-specific features
SQL Server: .NET/Microsoft ecosystem
```
### Déploiements multi-AZ

Multi-AZ offre une haute disponibilité grâce à la réplication synchrone vers une instance de secours dans une autre AZ.

**Architecture:**
```
Primary AZ (us-east-1a)
├── Primary RDS Instance
├── Synchronous replication
└── DNS endpoint (remains same during failover)
        ↓
Standby AZ (us-east-1b)
├── Standby RDS Instance (not accessible)
└── Automatic failover on failure
```
**Comment ça marche :**

1. **Fonctionnement normal :**
    - Toutes les lectures/écritures vont à l'instance principale
    - Écrits répliqués de manière synchrone en veille
    - Veille non accessible pour les lectures
2. **Basculement (automatique) :**
    - Détection : 60-120 secondes
    - Mise à jour DNS : pointe en veille
    - La veille devient principale
    - Temps d'arrêt total : ~60-120 secondes
    - Aucune perte de données (réplication synchrone)
3. **Déclencheurs de basculement :**
    - Échec de l'instance principale
    - Panne AZ
    - Changement de type d'instance principale
    - Correctifs du système d'exploitation
    - Basculement manuel (pour les tests)

**Avantages multi-AZ :**

- **Haute disponibilité :** 99,95 % de SLA
- **Durabilité des données :** Aucune perte de données (synchrone)
- **Basculement automatique :** Aucune intervention manuelle
- **Maintenance :** Temps d'arrêt minimal pour l'application des correctifs
- **Reprise après sinistre :** Tolérance aux pannes de niveau AZ

**Limites multi-AZ :**

- **Pas de mise à l'échelle en lecture :** La veille n'est pas accessible
- **Même région uniquement :** Pas pour la reprise après sinistre dans plusieurs régions
- **Coût :** ~ 2x le coût de l'instance principale
- **Performances d'écriture :** Léger impact de la réplication synchrone


### Lire les répliques

Les réplicas en lecture permettent une mise à l'échelle horizontale pour les charges de travail lourdes en lecture grâce à la réplication asynchrone.

**Architecture:**
```
Primary Instance (us-east-1a)
├── Accepts writes
└── Asynchronous replication
        ↓
Read Replica 1 (us-east-1b)
├── Read-only
├── Own endpoint
└── Replication lag: typically < 1 second
        ↓
Read Replica 2 (us-east-1c)
├── Read-only
└── Can be promoted to standalone
```
**Principales caractéristiques :**

- **Nombre :** Jusqu'à 15 par primaire (Aurora), 5 pour les autres moteurs
- **Régions :** Même région ou inter-région
- **Accès :** Chaque réplique possède son propre point de terminaison
- **Réplication :** Asynchrone (cohérence éventuelle)
- **Promotion :** Peut devenir une base de données autonome
- **Lag :** Surveiller avec la métrique CloudWatch

**Cas d'utilisation :**

1. **Read Scaling :** distribuez le trafic de lecture entre les instances dupliquées
2. **Reporting :** Analyses approfondies sur le réplica sans impact sur le réplica principal
3. **Reprise après sinistre :** Réplique interrégionale en cas de panne régionale
4. **Migration :** Promouvoir la réplique pour migrer vers une autre région/AZ

**Lire les meilleures pratiques en matière de réplication :**
```python
# Application pattern: Write to primary, read from replicas

# Database configuration
PRIMARY_ENDPOINT = "mydb.us-east-1.rds.amazonaws.com"
REPLICA_ENDPOINTS = [
    "mydb-replica-1.us-east-1.rds.amazonaws.com",
    "mydb-replica-2.us-east-1.rds.amazonaws.com",
    "mydb-replica-3.us-east-1.rds.amazonaws.com"
]

import random

def get_db_connection(operation='read'):
    """
    Get database connection based on operation type
    """
    
    if operation == 'write':
        return connect_to_database(PRIMARY_ENDPOINT)
    else:
        # Distribute reads across replicas
        replica = random.choice(REPLICA_ENDPOINTS)
        return connect_to_database(replica)

# Usage
write_conn = get_db_connection('write')
write_conn.execute("INSERT INTO users ...")

read_conn = get_db_connection('read')
results = read_conn.execute("SELECT * FROM users ...")
```
**Lire Réplique vs Multi-AZ :**


| Fonctionnalité | Lire la réplique | Multi-AZ |
| :-- | :-- | :-- |
| **Objectif** | L'échelle lit | Haute disponibilité |
| **Réplication** | Asynchrone | Synchrone |
| **Accessible** | Oui (lecture seule) | Non (veille masquée) |
| **Basculement** | Promotion manuelle | Basculement automatique |
| **Perte de données** | Possible (délai de réplication) | Aucun |
| **Cas d'utilisation** | Performances | Disponibilité |
| **Peut combiner** | Oui | Oui |

### Architecture Amazon Aurora

Aurora est spécialement conçue pour le cloud avec une couche de stockage distribuée et tolérante aux pannes.

**Architecture de stockage :**
```
Aurora Instance (Compute)
        ↓
Aurora Shared Storage (10 GB - 128 TB)
├── Replication: 6 copies across 3 AZs
├── Self-healing: Continuous data verification
├── Automatic growth: 10 GB increments
└── Quorum-based: Write requires 4/6 acknowledgments
```
**Innovations clés :**

1. **Séparation du calcul et du stockage :**
    - Couche de stockage partagée sur toutes les instances
    - Le calcul peut évoluer indépendamment
    - Le stockage se réplique automatiquement
2. **Réplication à six voies :**
    - Deux copies par AZ sur trois AZ
    - Survit à la perte de l'intégralité de l'AZ + 1 exemplaire
    - Survit à la perte de 2 copies sans affecter les écritures
3. **Écrire le quorum :**
    - L'écriture réussit avec 4/6 accusés de réception
    - Peut tolérer l'échec de 2 copies sans impact en écriture
4. **Lire le quorum :**
    - La lecture est réussie avec 3/6 accusés de réception
    - Peut tolérer l'échec de 3 copies sans impact sur la lecture

**Amas d'Aurora :**
```
Aurora Cluster Endpoint (writes) → Primary Instance (writer)
                                           ↓
                                    Shared Storage
                                           ↑
Reader Endpoint (reads) → [Round-robin across read replicas]
├── Read Replica 1
├── Read Replica 2
└── Read Replica 3 (up to 15 total)
```
**Points de terminaison Aurora :**


| Type de point de terminaison | Objectif | Comportement |
| :-- | :-- | :-- |
| **Cluster (Écrivain)** | Écrit | Itinéraires vers l'instance primaire |
| **Lecteur** | Lit | Équilibrage de charge entre les répliques |
| **Personnalisé** | Routage personnalisé | Logique définie par l'utilisateur |
| **Instance** | Cas spécifique | Connexion directe |

**Aurora vs RDS standard :**


| Fonctionnalité | Aurore | RDS MySQL/PostgreSQL |
| :-- | :-- | :-- |
| **Performances** | 5x MySQL, 3x PostgreSQL | Référence |
| **Stockage** | Mise à l'échelle automatique, partagée | Volumes EBS |
| **Répliques** | Jusqu'à 15 | Jusqu'à 5 |
| **Basculement** | < 30 secondes | 60-120 secondes |
| **Réplication** | Niveau de stockage | Binlog/WAL streaming |
| **Retour en arrière** | Oui (MySQL) | Non |
| **Base de données mondiale** | Oui | Non (utiliser des répliques) |
| **Sans serveur** | Oui | Non |
| **Coût** | Supérieur | Inférieur |

### Aurora sans serveur

Aurora Serverless adapte automatiquement la capacité de calcul en fonction de la demande des applications.

**Architecture:**
```
Application
    ↓
Aurora Serverless Endpoint (proxy)
    ↓
Serverless Pool (ACUs - Aurora Capacity Units)
├── Scales 0-256 ACUs (MySQL), 0.5-256 ACUs (PostgreSQL)
├── Auto-pause when idle
└── Auto-resume on connection
    ↓
Aurora Storage (shared)
```
**Principales caractéristiques :**

- **Auto-Scaling :** Augmente/diminue en fonction du processeur/des connexions
- **Pay-Per-Second :** Payez uniquement lorsque la base de données est active
- **Pause automatique :** Pause après inactivité (économie de coûts)
- **Transparent :** Aucune interruption de connexion pendant la mise à l'échelle

**Unités de capacité Aurora (ACU) :**
```
1 ACU = ~2 GB RAM + corresponding CPU/networking

Aurora Serverless v2:
- Range: 0.5 to 128 ACUs
- Scales in 0.5 ACU increments
- Instant scaling (no connection drops)
- Compatible with Aurora features (replicas, Global Database)

Aurora Serverless v1 (legacy):
- Range: 1-256 ACUs (MySQL), 2-256 (PostgreSQL)
- Scaling can take minutes
- Some limitations (no replicas, no Global Database)
```
**Cas d'utilisation :**

- **Utilisation peu fréquente :** Bases de données de développement/test
- **Charges de travail variables :** Modèles de trafic imprévisibles
- **SaaS multi-tenant :** Mise à l'échelle de la base de données par locataire
- **Preuve de concepts :** Installation rapide sans dimensionnement

**Comparaison des coûts :**
```
Traditional Aurora: $0.10/hour (db.t3.medium) + storage
Serverless v2: $0.12/hour per ACU + storage

Example scenario:
- Traditional: $73/month (always running)
- Serverless: $15/month (used 20% of time, auto-pause)

Savings: 80% for intermittent workloads
```
### Sauvegarde et récupération

**Sauvegardes automatisées :**
```
Automated Backups (enabled by default)
├── Retention: 1-35 days (7 days default)
├── Backup Window: User-defined or automatic
├── Storage: Amazon S3 (free up to DB size)
├── Point-in-Time Recovery: Any second within retention
└── Transaction logs: Saved every 5 minutes
```
**Types de sauvegarde :**

**1. Sauvegardes automatisées :**

- Sauvegarde continue sur S3
- Permet une récupération à un moment précis
- Rétention : 1-35 jours
- Supprimé lorsque l'instance est supprimée (sauf instantané final)

**2. Instantanés manuels :**

- Instantanés lancés par l'utilisateur
- Conservé jusqu'à sa suppression manuelle
- Peut copier à travers les régions
- Peut partager avec d'autres comptes AWS

**Récupération ponctuelle (PITR) :**
```bash
# Restore to any second within retention window
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier mydb \
    --target-db-instance-identifier mydb-restored \
    --restore-time 2025-01-15T14:30:00Z

# Or restore to latest restorable time
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier mydb \
    --target-db-instance-identifier mydb-restored \
    --use-latest-restorable-time
```
**Aurora Backtrack (MySQL uniquement) :**
```bash
# Rewind database to earlier point without restoring from backup
# Much faster than PITR (minutes vs hours)

# Enable backtrack (up to 72 hours)
aws rds modify-db-cluster \
    --db-cluster-identifier mydb-cluster \
    --backtrack-window 72

# Backtrack to specific time
aws rds backtrack-db-cluster \
    --db-cluster-identifier mydb-cluster \
    --backtrack-to 2025-01-15T14:30:00Z
```
**Stratégies de récupération :**


| Scénario | Méthode | RTO | RPO |
| :-- | :-- | :-- | :-- |
| **Suppression accidentelle** | PITR | 1-2 heures | 5 minutes |
| **Corruption** | Instantané manuel | 1-2 heures | Âge de l'instantané |
| **Échec régional** | Réplique interrégionale | Procès-verbal | Retard de réplication |
| **Erreur d'Aurora** | Retour en arrière | Secondes | N'importe quel point dans la fenêtre |

### Sécurité

**Isolement du réseau :**
```
VPC (10.0.0.0/16)
├── Public Subnet (DMZ)
│   └── Application Servers
│
└── Private Subnet (Database tier)
    ├── RDS Instances (no internet access)
    ├── Security Group: Only allow from app tier
    └── Network ACL: Additional layer
```
**Cryptage :**

**Au repos :**

- **Méthode :** Chiffrement AWS KMS
- **Quand :** Doit être activé lors de la création (impossible de l'activer ultérieurement)
- **Portée :** Base de données, sauvegardes, instantanés, répliques
- **Performances :** Aucun impact

**En transit :**
```python
# SSL/TLS connection
import psycopg2

conn = psycopg2.connect(
    host="mydb.us-east-1.rds.amazonaws.com",
    database="mydb",
    user="admin",
    password="secure-password",
    sslmode="require"  # Enforce SSL
)
```
**Authentification :**

1. **Authentification native de la base de données :** Nom d'utilisateur/mot de passe
2. **Authentification de la base de données IAM :** Utilisez les rôles IAM (pas de mots de passe)
```python
# IAM authentication (PostgreSQL)
import boto3
import psycopg2

def get_auth_token():
    """Generate auth token using IAM"""
    client = boto3.client('rds')
    
    token = client.generate_db_auth_token(
        DBHostname='mydb.us-east-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='iamuser'
    )
    
    return token

# Connect using IAM token
conn = psycopg2.connect(
    host='mydb.us-east-1.rds.amazonaws.com',
    database='mydb',
    user='iamuser',
    password=get_auth_token(),
    sslmode='require'
)
```
3. **Authentification Kerberos :** Authentification Windows (SQL Server)

**Journal d'audit :**
```bash
# Enable audit logging
aws rds modify-db-parameter-group \
    --db-parameter-group-name mydb-params \
    --parameters "ParameterName=log_statement,ParameterValue=all"

# Publish logs to CloudWatch
aws rds modify-db-instance \
    --db-instance-identifier mydb \
    --cloudwatch-logs-export-configuration \
        EnableLogTypes=["postgresql"]
```
## Implémentation pratique

### Atelier 1 : Création d'une instance RDS de production

**Objectif :** Déployez RDS PostgreSQL prêt pour la production avec Multi-AZ et surveillance.
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name production-db-subnet \
    --db-subnet-group-description "Production database subnets" \
    --subnet-ids subnet-private-1a subnet-private-1b subnet-private-1c \
    --tags Key=Environment,Value=Production

# Create security group
DB_SG=$(aws ec2 create-security-group \
    --group-name production-db-sg \
    --description "Production database security group" \
    --vpc-id vpc-12345678 \
    --query 'GroupId' \
    --output text)

# Allow access from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 5432 \
    --source-group sg-app-tier

# Create parameter group
aws rds create-db-parameter-group \
    --db-parameter-group-name production-postgres15 \
    --db-parameter-group-family postgres15 \
    --description "Production PostgreSQL 15 parameters"

# Configure parameters
aws rds modify-db-parameter-group \
    --db-parameter-group-name production-postgres15 \
    --parameters \
        "ParameterName=shared_preload_libraries,ParameterValue=pg_stat_statements,ApplyMethod=pending-reboot" \
        "ParameterName=log_statement,ParameterValue=all" \
        "ParameterName=log_min_duration_statement,ParameterValue=1000" \
        "ParameterName=max_connections,ParameterValue=200"

# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier production-postgres \
    --db-instance-class db.r6g.xlarge \
    --engine postgres \
    --engine-version 15.4 \
    --master-username dbadmin \
    --master-user-password 'SecurePassword123!' \
    --allocated-storage 100 \
    --storage-type gp3 \
    --iops 3000 \
    --storage-encrypted \
    --kms-key-id alias/rds-encryption \
    --multi-az \
    --db-subnet-group-name production-db-subnet \
    --vpc-security-group-ids $DB_SG \
    --db-parameter-group-name production-postgres15 \
    --backup-retention-period 30 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --enable-cloudwatch-logs-exports postgresql \
    --monitoring-interval 60 \
    --monitoring-role-arn arn:aws:iam::123456789012:role/RDSEnhancedMonitoring \
    --enable-performance-insights \
    --performance-insights-retention-period 7 \
    --deletion-protection \
    --tags Key=Environment,Value=Production Key=Application,Value=MainApp

# Wait for instance to be available
aws rds wait db-instance-available \
    --db-instance-identifier production-postgres

# Get endpoint
ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier production-postgres \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "Database endpoint: $ENDPOINT"
```
### Atelier 2 : Création d'un cluster Aurora avec des réplicas en lecture

**Objectif :** Déployez un cluster Aurora PostgreSQL avec une reprise après sinistre multirégionale.
```bash
# Create Aurora cluster
aws rds create-db-cluster \
    --db-cluster-identifier production-aurora \
    --engine aurora-postgresql \
    --engine-version 15.3 \
    --master-username dbadmin \
    --master-user-password 'SecurePassword123!' \
    --database-name myapp \
    --db-subnet-group-name production-db-subnet \
    --vpc-security-group-ids $DB_SG \
    --backup-retention-period 30 \
    --preferred-backup-window "03:00-04:00" \
    --preferred-maintenance-window "sun:04:00-sun:05:00" \
    --enable-cloudwatch-logs-exports postgresql \
    --storage-encrypted \
    --kms-key-id alias/rds-encryption \
    --deletion-protection \
    --enable-http-endpoint \
    --backtrack-window 72 \
    --tags Key=Environment,Value=Production

# Create primary instance
aws rds create-db-instance \
    --db-instance-identifier production-aurora-primary \
    --db-instance-class db.r6g.2xlarge \
    --engine aurora-postgresql \
    --db-cluster-identifier production-aurora \
    --monitoring-interval 60 \
    --monitoring-role-arn arn:aws:iam::123456789012:role/RDSEnhancedMonitoring \
    --enable-performance-insights \
    --performance-insights-retention-period 7

# Create read replicas in different AZs
for i in 1 2 3; do
    aws rds create-db-instance \
        --db-instance-identifier production-aurora-reader-$i \
        --db-instance-class db.r6g.xlarge \
        --engine aurora-postgresql \
        --db-cluster-identifier production-aurora \
        --enable-performance-insights
done

# Get cluster endpoints
WRITER_ENDPOINT=$(aws rds describe-db-clusters \
    --db-cluster-identifier production-aurora \
    --query 'DBClusters[0].Endpoint' \
    --output text)

READER_ENDPOINT=$(aws rds describe-db-clusters \
    --db-cluster-identifier production-aurora \
    --query 'DBClusters[0].ReaderEndpoint' \
    --output text)

echo "Writer endpoint: $WRITER_ENDPOINT"
echo "Reader endpoint: $READER_ENDPOINT"
```
### Atelier 3 : Configuration de la base de données globale Aurora

**Objectif :** Configurez la réplication entre régions pour la reprise après sinistre.
```bash
# Create primary cluster (us-east-1)
aws rds create-global-cluster \
    --global-cluster-identifier production-global \
    --engine aurora-postgresql \
    --engine-version 15.3 \
    --database-name myapp

# Add primary region cluster
aws rds create-db-cluster \
    --db-cluster-identifier production-aurora-primary \
    --global-cluster-identifier production-global \
    --engine aurora-postgresql \
    --engine-version 15.3 \
    --master-username dbadmin \
    --master-user-password 'SecurePassword123!' \
    --db-subnet-group-name production-db-subnet \
    --vpc-security-group-ids $DB_SG \
    --region us-east-1

# Create instances in primary cluster
aws rds create-db-instance \
    --db-instance-identifier production-aurora-primary-writer \
    --db-instance-class db.r6g.2xlarge \
    --engine aurora-postgresql \
    --db-cluster-identifier production-aurora-primary \
    --region us-east-1

# Create secondary cluster (us-west-2) for DR
aws rds create-db-cluster \
    --db-cluster-identifier production-aurora-secondary \
    --global-cluster-identifier production-global \
    --engine aurora-postgresql \
    --engine-version 15.3 \
    --db-subnet-group-name production-db-subnet \
    --vpc-security-group-ids $DB_SG_WEST \
    --region us-west-2

# Create instance in secondary cluster
aws rds create-db-instance \
    --db-instance-identifier production-aurora-secondary-writer \
    --db-instance-class db.r6g.2xlarge \
    --engine aurora-postgresql \
    --db-cluster-identifier production-aurora-secondary \
    --region us-west-2

# Monitor replication lag
aws rds describe-db-clusters \
    --db-cluster-identifier production-aurora-secondary \
    --region us-west-2 \
    --query 'DBClusters[0].GlobalWriteForwardingStatus'
```
## Connaissances au niveau de la production

### Gestion du pool de connexions

**Meilleures pratiques en matière de pooling de connexions :**
```python
# connection_pool.py
import psycopg2
from psycopg2 import pool
import time

class DatabaseConnectionPool:
    """
    Production-grade connection pool for RDS
    """
    
    def __init__(self, min_conn=5, max_conn=20):
        """
        Initialize connection pool
        
        Guidelines:
        - min_conn: Keep warm connections ready
        - max_conn: Limit to prevent overwhelming database
        - Formula: max_conn = (max_connections on DB) / (number of app instances)
        """
        
        try:
            self.connection_pool = psycopg2.pool.ThreadedConnectionPool(
                min_conn,
                max_conn,
                host='mydb.us-east-1.rds.amazonaws.com',
                database='myapp',
                user='dbuser',
                password='secure-password',
                port=5432,
                connect_timeout=10,
                options='-c statement_timeout=30000'  # 30 second query timeout
            )
            
            print(f"Connection pool created: {min_conn}-{max_conn} connections")
            
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Error creating connection pool: {error}")
            raise
    
    def get_connection(self):
        """Get connection from pool"""
        try:
            return self.connection_pool.getconn()
        except (Exception, psycopg2.DatabaseError) as error:
            print(f"Error getting connection: {error}")
            raise
    
    def release_connection(self, conn):
        """Return connection to pool"""
        self.connection_pool.putconn(conn)
    
    def close_all_connections(self):
        """Close all connections (on shutdown)"""
        self.connection_pool.closeall()

# Usage
db_pool = DatabaseConnectionPool(min_conn=5, max_conn=20)

def execute_query(query, params=None):
    """Execute query using connection pool"""
    conn = None
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        if query.strip().upper().startswith('SELECT'):
            results = cursor.fetchall()
            return results
        else:
            conn.commit()
            return cursor.rowcount
    
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    
    finally:
        if conn:
            db_pool.release_connection(conn)

# Example usage
results = execute_query("SELECT * FROM users WHERE id = %s", (123,))
```
**Calcul de la limite de connexion :**
```python
def calculate_connection_limits(db_max_connections, app_instances):
    """
    Calculate appropriate connection pool settings
    
    RDS max_connections by instance class:
    - db.t3.micro: 66
    - db.t3.small: 150
    - db.t3.medium: 296
    - db.r6g.large: 1000
    - db.r6g.xlarge: 2000
    """
    
    # Reserve connections for system processes
    system_reserved = 10
    available_connections = db_max_connections - system_reserved
    
    # Calculate per-instance allocation
    per_instance_max = available_connections // app_instances
    
    # Conservative: Use 80% of allocation
    per_instance_max = int(per_instance_max * 0.8)
    
    # Minimum pool size (warm connections)
    min_pool = max(5, per_instance_max // 4)
    
    return {
        'db_max_connections': db_max_connections,
        'app_instances': app_instances,
        'per_instance_max': per_instance_max,
        'recommended_min': min_pool,
        'recommended_max': per_instance_max
    }

# Example
config = calculate_connection_limits(
    db_max_connections=296,  # db.t3.medium
    app_instances=10
)

print(f"Per instance: min={config['recommended_min']}, max={config['recommended_max']}")
# Output: Per instance: min=5, max=22
```
### Proxy RDS

RDS Proxy gère le pool de connexions au niveau de l'infrastructure AWS.

**Architecture:**
```
Application Instances (100s)
        ↓
RDS Proxy (connection pooling)
├── Manages connection lifecycle
├── Connection multiplexing
└── Automatic failover handling
        ↓
RDS Database (limited connections)
```
**Avantages :**

1. **Regroupement de connexions :** Réduit la surcharge de connexion à la base de données
2. **Failover :** Réduit le temps de basculement de 66 %
3. **Intégration IAM :** Accès à la base de données via les rôles IAM
4. **Sécurité :** Aucune gestion des informations d'identification dans les applications

**Configuration :**
```bash
# Create RDS Proxy
aws rds create-db-proxy \
    --db-proxy-name production-proxy \
    --engine-family POSTGRESQL \
    --auth '[{
        "AuthScheme": "SECRETS",
        "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:rds-secret",
        "IAMAuth": "REQUIRED"
    }]' \
    --role-arn arn:aws:iam::123456789012:role/RDSProxyRole \
    --vpc-subnet-ids subnet-1 subnet-2 subnet-3 \
    --require-tls

# Register target database
aws rds register-db-proxy-targets \
    --db-proxy-name production-proxy \
    --db-instance-identifiers production-postgres

# Get proxy endpoint
PROXY_ENDPOINT=$(aws rds describe-db-proxies \
    --db-proxy-name production-proxy \
    --query 'DBProxies[0].Endpoint' \
    --output text)

# Application connects to proxy instead of database
```
**Quand utiliser le proxy RDS :**
```
Use RDS Proxy when:
- Serverless applications (Lambda) with many connections
- Applications that don't pool connections properly
- Need faster failover (<30 seconds)
- IAM authentication required

Don't use when:
- Application already has good connection pooling
- Long-running connections (cost not justified)
- Simple workloads with few connections
```
### Optimisation des performances

**Réglage des paramètres :**
```sql
-- PostgreSQL performance parameters

-- Memory settings
shared_buffers = 25% of RAM  -- Start with 25%, can go up to 40%
effective_cache_size = 75% of RAM
work_mem = 16MB  -- Per operation; monitor and adjust
maintenance_work_mem = 1GB

-- Checkpoint settings
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
max_wal_size = 2GB
min_wal_size = 1GB

-- Query planner
random_page_cost = 1.1  -- Lower for SSD (RDS uses SSD)
effective_io_concurrency = 200  -- Higher for SSD

-- Connections
max_connections = 200  -- Based on instance class

-- Monitoring
shared_preload_libraries = 'pg_stat_statements'
log_min_duration_statement = 1000  -- Log queries > 1 second
log_connections = on
log_disconnections = on
```
**Analyse des performances des requêtes :**
```python
# query_analyzer.py
import psycopg2

def analyze_slow_queries(connection):
    """
    Analyze slow queries using pg_stat_statements
    """
    
    cursor = connection.cursor()
    
    # Top 10 slowest queries by total time
    query = """
    SELECT 
        query,
        calls,
        total_exec_time / 1000 as total_seconds,
        mean_exec_time / 1000 as avg_seconds,
        max_exec_time / 1000 as max_seconds,
        stddev_exec_time / 1000 as stddev_seconds,
        rows / calls as avg_rows
    FROM pg_stat_statements
    WHERE calls > 100  -- Only frequently executed queries
    ORDER BY total_exec_time DESC
    LIMIT 10;
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    print("Top 10 Slow Queries by Total Time:")
    print("-" * 100)
    
    for i, row in enumerate(results, 1):
        query, calls, total_time, avg_time, max_time, stddev, avg_rows = row
        
        # Truncate query for display
        query_short = query[:80].replace('\n', ' ')
        
        print(f"\n{i}. {query_short}...")
        print(f"   Calls: {calls:,}")
        print(f"   Total time: {total_time:.2f}s")
        print(f"   Avg time: {avg_time:.3f}s")
        print(f"   Max time: {max_time:.3f}s")
        print(f"   Avg rows: {avg_rows:.0f}")
        
        # Recommendations
        if avg_time > 1.0:
            print(f"   ⚠️  Consider optimization or indexing")
        if stddev > avg_time:
            print(f"   ⚠️  High variance - investigate outliers")
    
    # Cache hit ratio
    cursor.execute("""
        SELECT 
            sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) * 100 as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database();
    """)
    
    cache_hit_ratio = cursor.fetchone()[0]
    print(f"\nCache Hit Ratio: {cache_hit_ratio:.2f}%")
    
    if cache_hit_ratio < 90:
        print("⚠️  Low cache hit ratio - consider increasing shared_buffers")
    
    return results

# Usage
conn = psycopg2.connect(
    host='mydb.us-east-1.rds.amazonaws.com',
    database='myapp',
    user='dbadmin',
    password='password'
)

analyze_slow_queries(conn)
```
**Informations sur les performances :**
```python
# performance_insights.py
import boto3
from datetime import datetime, timedelta

def analyze_performance_insights(db_instance_id):
    """
    Analyze RDS Performance Insights metrics
    """
    
    pi = boto3.client('pi')
    
    # Get resource metrics for last hour
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(hours=1)
    
    response = pi.get_resource_metrics(
        ServiceType='RDS',
        Identifier=f'db-{db_instance_id}',
        MetricQueries=[
            {
                'Metric': 'db.load.avg',
                'GroupBy': {'Group': 'db.wait_event'}
            }
        ],
        StartTime=start_time,
        EndTime=end_time,
        PeriodInSeconds=60
    )
    
    # Analyze wait events
    print("Top Database Wait Events:")
    print("-" * 50)
    
    wait_events = {}
    
    for data_point in response['MetricList'][0]['DataPoints']:
        for key, value in data_point.items():
            if key != 'Timestamp':
                wait_events[key] = wait_events.get(key, 0) + value
    
    # Sort by impact
    sorted_events = sorted(wait_events.items(), key=lambda x: x[1], reverse=True)
    
    for event, total_wait in sorted_events[:10]:
        print(f"{event}: {total_wait:.2f} AAS")  # Average Active Sessions
        
        # Recommendations based on wait event
        if 'CPU' in event:
            print("  → Consider upgrading instance class or optimizing queries")
        elif 'IO' in event:
            print("  → Consider provisioned IOPS or query optimization")
        elif 'Lock' in event:
            print("  → Review locking patterns and transaction duration")

# Usage
analyze_performance_insights('production-postgres')
```
### Modèles de haute disponibilité

**Multi-AZ avec réplicas en lecture :**
```
Primary AZ (us-east-1a)
├── Primary Instance (writes + reads)
└── Synchronous replication to standby

Standby AZ (us-east-1b)
└── Standby Instance (automatic failover)

Read Scaling AZs
├── Read Replica 1 (us-east-1a) - Read traffic
├── Read Replica 2 (us-east-1b) - Read traffic
└── Read Replica 3 (us-east-1c) - Read traffic

Benefits:
- HA: Multi-AZ failover
- Performance: Distributed reads
- DR: Can promote replica to different region
```
**Architecture Aurora HA :**
```
Aurora Cluster (99.99% availability)
├── Primary Instance (Writer)
│   └── Failover target: Highest priority replica
│
├── Reader Tier (Auto-scaling)
│   ├── Replica 1 (Priority 1) - Failover candidate
│   ├── Replica 2 (Priority 2)
│   └── Replica 3-15 (as needed)
│
└── Storage Layer
    └── 6-way replication across 3 AZs

Failover Priority:
1. Same AZ as primary
2. Highest failover priority (tier 0-15)
3. Largest instance size
4. Newest replica
```
**Test de basculement automatisé :**
```python
# failover_testing.py
import boto3
import time
from datetime import datetime

def test_failover(db_instance_id):
    """
    Test RDS Multi-AZ failover
    """
    
    rds = boto3.client('rds')
    cloudwatch = boto3.client('cloudwatch')
    
    print(f"Starting failover test at {datetime.utcnow()}")
    
    # Record baseline metrics
    baseline = {
        'connections': get_metric(cloudwatch, db_instance_id, 'DatabaseConnections'),
        'cpu': get_metric(cloudwatch, db_instance_id, 'CPUUtilization')
    }
    
    print(f"Baseline connections: {baseline['connections']}")
    
    # Initiate failover
    print("Initiating failover...")
    start_time = time.time()
    
    rds.reboot_db_instance(
        DBInstanceIdentifier=db_instance_id,
        ForceFailover=True
    )
    
    # Monitor failover
    print("Monitoring failover progress...")
    
    while True:
        response = rds.describe_db_instances(
            DBInstanceIdentifiers=[db_instance_id]
        )
        
        status = response['DBInstances'][0]['DBInstanceStatus']
        
        print(f"  Status: {status}")
        
        if status == 'available':
            break
        
        time.sleep(5)
    
    failover_duration = time.time() - start_time
    
    print(f"\n✓ Failover completed in {failover_duration:.1f} seconds")
    
    # Verify connections restored
    time.sleep(10)
    
    post_failover = {
        'connections': get_metric(cloudwatch, db_instance_id, 'DatabaseConnections'),
        'cpu': get_metric(cloudwatch, db_instance_id, 'CPUUtilization')
    }
    
    print(f"Post-failover connections: {post_failover['connections']}")
    
    connection_loss = baseline['connections'] - post_failover['connections']
    connection_loss_pct = (connection_loss / baseline['connections']) * 100 if baseline['connections'] > 0 else 0
    
    print(f"\nFailover Impact:")
    print(f"  Duration: {failover_duration:.1f}s")
    print(f"  Connection loss: {connection_loss_pct:.1f}%")
    print(f"  Status: {'PASS' if failover_duration < 120 else 'FAIL'}")
    
    return {
        'duration': failover_duration,
        'connection_loss_pct': connection_loss_pct,
        'success': failover_duration < 120
    }

def get_metric(cloudwatch, db_instance_id, metric_name):
    """Get latest CloudWatch metric value"""
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/RDS',
        MetricName=metric_name,
        Dimensions=[
            {'Name': 'DBInstanceIdentifier', 'Value': db_instance_id}
        ],
        StartTime=datetime.utcnow() - timedelta(minutes=5),
        EndTime=datetime.utcnow(),
        Period=60,
        Statistics=['Average']
    )
    
    if response['Datapoints']:
        return response['Datapoints'][-1]['Average']
    return 0

# Run monthly failover test
test_failover('production-postgres')
```
### Stratégie de reprise après sinistre

**Planification RTO et RPO :**
```
Recovery Time Objective (RTO): How quickly can we recover?
Recovery Point Objective (RPO): How much data loss is acceptable?

Strategy Matrix:

┌─────────────────┬──────────────┬──────────────┬─────────────┐
│ Strategy        │ RTO          │ RPO          │ Cost        │
├─────────────────┼──────────────┼──────────────┼─────────────┤
│ Multi-AZ        │ 60-120 sec   │ 0 (sync)     │ 2x base     │
│ Read Replica    │ Minutes      │ Seconds      │ 1.5x base   │
│ Cross-Region    │ 5-15 min     │ Seconds-min  │ 2x base     │
│ Snapshot        │ Hours        │ Snapshot age │ Low         │
│ Aurora Global   │ <1 min       │ <1 sec       │ 2.5x base   │
└─────────────────┴──────────────┴──────────────┴─────────────┘
```
**Automatisation de la reprise après sinistre :**
```python
# dr_automation.py
import boto3

class DisasterRecoveryManager:
    def __init__(self, primary_region, dr_region):
        self.primary_region = primary_region
        self.dr_region = dr_region
        self.rds_primary = boto3.client('rds', region_name=primary_region)
        self.rds_dr = boto3.client('rds', region_name=dr_region)
        self.route53 = boto3.client('route53')
    
    def setup_dr_replica(self, source_db_id):
        """
        Create cross-region read replica for DR
        """
        
        print(f"Creating DR replica in {self.dr_region}...")
        
        replica = self.rds_dr.create_db_instance_read_replica(
            DBInstanceIdentifier=f'{source_db_id}-dr',
            SourceDBInstanceIdentifier=f'arn:aws:rds:{self.primary_region}:123456789012:db:{source_db_id}',
            DBInstanceClass='db.r6g.xlarge',
            PubliclyAccessible=False,
            StorageEncrypted=True,
            KmsKeyId='alias/rds-dr-key',
            MonitoringInterval=60,
            MonitoringRoleArn='arn:aws:iam::123456789012:role/RDSEnhancedMonitoring'
        )
        
        print(f"DR replica created: {replica['DBInstance']['DBInstanceIdentifier']}")
        
        return replica['DBInstance']['DBInstanceIdentifier']
    
    def failover_to_dr(self, dr_replica_id, hosted_zone_id, record_name):
        """
        Promote DR replica and update DNS
        """
        
        print("DISASTER RECOVERY FAILOVER INITIATED")
        print("=" * 50)
        
        # Step 1: Promote read replica to standalone
        print("1. Promoting DR replica to standalone...")
        
        self.rds_dr.promote_read_replica(
            DBInstanceIdentifier=dr_replica_id
        )
        
        # Wait for promotion
        waiter = self.rds_dr.get_waiter('db_instance_available')
        waiter.wait(DBInstanceIdentifiers=[dr_replica_id])
        
        # Step 2: Get new endpoint
        response = self.rds_dr.describe_db_instances(
            DBInstanceIdentifiers=[dr_replica_id]
        )
        
        dr_endpoint = response['DBInstances'][0]['Endpoint']['Address']
        
        print(f"   DR endpoint: {dr_endpoint}")
        
        # Step 3: Update Route 53
        print("2. Updating DNS to point to DR region...")
        
        self.route53.change_resource_record_sets(
            HostedZoneId=hosted_zone_id,
            ChangeBatch={
                'Changes': [{
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        'Name': record_name,
                        'Type': 'CNAME',
                        'TTL': 60,
                        'ResourceRecords': [{'Value': dr_endpoint}]
                    }
                }]
            }
        )
        
        print("3. Notifying stakeholders...")
        
        # Send SNS notification
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:dr-alerts',
            Subject='DR FAILOVER COMPLETED',
            Message=f"""
            Disaster Recovery Failover Completed
            
            Primary Region: {self.primary_region}
            DR Region: {self.dr_region}
            New Endpoint: {dr_endpoint}
            DNS Record: {record_name}
            
            All applications should now connect to DR database.
            """
        )
        
        print("\n✓ DR Failover completed successfully")
        print(f"New database endpoint: {dr_endpoint}")
        
        return dr_endpoint
    
    def test_dr_readiness(self, dr_replica_id):
        """
        Test DR replica readiness
        """
        
        response = self.rds_dr.describe_db_instances(
            DBInstanceIdentifiers=[dr_replica_id]
        )
        
        instance = response['DBInstances'][0]
        
        checks = {
            'status': instance['DBInstanceStatus'] == 'available',
            'replication_lag': self.check_replication_lag(dr_replica_id),
            'automated_backups': instance['BackupRetentionPeriod'] > 0,
            'encryption': instance['StorageEncrypted'],
            'monitoring': instance['MonitoringInterval'] > 0
        }
        
        print("DR Readiness Check:")
        for check, status in checks.items():
            print(f"  {check}: {'✓' if status else '✗'}")
        
        all_passed = all(checks.values())
        
        return all_passed
    
    def check_replication_lag(self, replica_id):
        """Check if replication lag is acceptable"""
        
        cloudwatch = boto3.client('cloudwatch', region_name=self.dr_region)
        
        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/RDS',
            MetricName='ReplicaLag',
            Dimensions=[
                {'Name': 'DBInstanceIdentifier', 'Value': replica_id}
            ],
            StartTime=datetime.utcnow() - timedelta(minutes=5),
            EndTime=datetime.utcnow(),
            Period=60,
            Statistics=['Average']
        )
        
        if response['Datapoints']:
            avg_lag = sum(d['Average'] for d in response['Datapoints']) / len(response['Datapoints'])
            return avg_lag < 60  # Less than 60 seconds lag
        
        return False

# Usage
dr_manager = DisasterRecoveryManager('us-east-1', 'us-west-2')

# Setup DR
dr_replica = dr_manager.setup_dr_replica('production-postgres')

# Test readiness monthly
dr_manager.test_dr_readiness(f'production-postgres-dr')

# In case of disaster:
# dr_manager.failover_to_dr(
#     dr_replica_id='production-postgres-dr',
#     hosted_zone_id='Z1234567890ABC',
#     record_name='db.example.com'
# )
```
## Conseils \& Bonnes pratiques

### Conseils de sélection du moteur

**Astuce 1 : Choisissez Aurora pour les applications cloud natives**
```
Use Aurora when:
- Building new applications in AWS
- Need highest performance (5x MySQL, 3x PostgreSQL)
- Require fast failover (<30 seconds)
- Global presence needed (Global Database)
- Want automatic storage scaling

Use standard RDS when:
- Migrating existing database with specific version
- Need features not in Aurora (e.g., specific PostgreSQL extensions)
- Budget-constrained (Aurora 20-30% more expensive)
- Using Oracle/SQL Server (no Aurora equivalent)
```
**Astuce 2 : Matrice de décision PostgreSQL vs MySQL**
```
Choose PostgreSQL for:
- Complex queries and analytics
- JSON/JSONB data
- GIS data (PostGIS)
- Standards compliance (SQL standard)
- Advanced indexing (GiST, GIN)
- Full-text search

Choose MySQL for:
- Simple read/write operations
- High concurrency simple queries
- Large ecosystem of tools
- Web applications (WordPress, Drupal)
- When team has MySQL expertise
```
### Conseils sur les performances

**Astuce 3 : Classe d'instance de bonne taille**
```python
def recommend_instance_class(metrics):
    """
    Recommend instance class based on usage
    """
    
    cpu_avg = metrics['cpu_utilization']
    memory_pct = metrics['memory_used_pct']
    connections_max = metrics['max_connections']
    iops_avg = metrics['iops_avg']
    
    recommendations = []
    
    # CPU-bound
    if cpu_avg > 80:
        recommendations.append("Upgrade to larger instance class (more vCPUs)")
    
    # Memory-bound
    if memory_pct > 90:
        recommendations.append("Upgrade to memory-optimized instance (r6g family)")
    
    # Connection-limited
    if connections_max > 0.8 * get_max_connections(instance_class):
        recommendations.append("Increase instance class or implement connection pooling")
    
    # IOPS-bound
    if iops_avg > 3000:
        recommendations.append("Consider provisioned IOPS or io1/gp3 storage")
    
    return recommendations
```
**Conseil 4 : Utilisez Performance Insights**
```bash
# Enable Performance Insights for deep query analysis
aws rds modify-db-instance \
    --db-instance-identifier my-database \
    --enable-performance-insights \
    --performance-insights-retention-period 7  # Free for 7 days

# Benefits:
# - Visualize database load
# - Identify problematic queries
# - Analyze wait events
# - Free for 7 days retention
```
**Astuce 5 : Activez la surveillance améliorée**
```bash
# Enhanced Monitoring provides OS-level metrics
aws rds modify-db-instance \
    --db-instance-identifier my-database \
    --monitoring-interval 60 \
    --monitoring-role-arn arn:aws:iam::123456789012:role/RDSEnhancedMonitoring

# Provides:
# - Disk I/O
# - Network throughput
# - OS processes
# - CPU utilization per core
```
### Conseils de sauvegarde et de récupération

**Astuce 6 : Définissez les fenêtres de sauvegarde appropriées**
```
Best practices:
- Schedule during low-traffic period
- Avoid overlapping with maintenance windows
- Cross-region copy for DR
- Test restore procedures monthly

Example schedule:
- Backup window: 03:00-04:00 (low traffic)
- Maintenance window: 04:00-05:00 (after backup)
- Retention: 30 days (compliance requirement)
```
**Astuce 7 : Utilisez des instantanés manuels pour les modifications majeures**
```bash
# Before major schema changes or upgrades
aws rds create-db-snapshot \
    --db-instance-identifier production-db \
    --db-snapshot-identifier pre-migration-$(date +%Y%m%d) \
    --tags Key=Purpose,Value=PreMigration Key=Date,Value=$(date +%Y-%m-%d)

# Snapshots never expire (until manually deleted)
# Provides rollback point for changes
```
**Astuce 8 : Automatisez la gestion des instantanés**
```python
# snapshot_manager.py
import boto3
from datetime import datetime, timedelta

def cleanup_old_snapshots(db_instance_id, retention_days=30):
    """
    Clean up manual snapshots older than retention period
    """
    
    rds = boto3.client('rds')
    
    # Get all manual snapshots for instance
    response = rds.describe_db_snapshots(
        DBInstanceIdentifier=db_instance_id,
        SnapshotType='manual'
    )
    
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    deleted_count = 0
    
    for snapshot in response['DBSnapshots']:
        snapshot_time = snapshot['SnapshotCreateTime'].replace(tzinfo=None)
        
        if snapshot_time < cutoff_date:
            # Check if tagged as permanent
            tags = rds.list_tags_for_resource(
                ResourceName=snapshot['DBSnapshotArn']
            )['TagList']
            
            is_permanent = any(
                tag['Key'] == 'Permanent' and tag['Value'] == 'true'
                for tag in tags
            )
            
            if not is_permanent:
                print(f"Deleting old snapshot: {snapshot['DBSnapshotIdentifier']}")
                rds.delete_db_snapshot(
                    DBSnapshotIdentifier=snapshot['DBSnapshotIdentifier']
                )
                deleted_count += 1
    
    print(f"Deleted {deleted_count} old snapshots")

# Run weekly via EventBridge
cleanup_old_snapshots('production-db', retention_days=30)
```
### Conseils de sécurité

**Astuce 9 : Toujours activer le cryptage**
```bash
# Enable encryption at creation (cannot be enabled later)
aws rds create-db-instance \
    --db-instance-identifier my-database \
    --storage-encrypted \
    --kms-key-id alias/rds-encryption \
    ...

# For existing unencrypted database:
# 1. Create encrypted snapshot
# 2. Restore from encrypted snapshot
# 3. Point applications to new instance
```
**Astuce 10 : Utilisez l'authentification IAM**
```python
# IAM authentication eliminates password management
import boto3

def get_iam_auth_token():
    """Generate RDS auth token using IAM"""
    
    client = boto3.client('rds')
    
    token = client.generate_db_auth_token(
        DBHostname='mydb.us-east-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='iamuser'
    )
    
    return token

# Connect using IAM token
import psycopg2

conn = psycopg2.connect(
    host='mydb.us-east-1.rds.amazonaws.com',
    database='myapp',
    user='iamuser',
    password=get_iam_auth_token(),
    sslmode='require'
)
```
**Astuce 11 : implémentez l'accès au moindre privilège**
```sql
-- Create read-only user for reporting
CREATE USER reporting_user WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE myapp TO reporting_user;
GRANT USAGE ON SCHEMA public TO reporting_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reporting_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reporting_user;

-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```
### Conseils d'optimisation des coûts

**Astuce 12 : Utilisez des instances réservées**
```
Savings for 1-year commitment:
- No Upfront: 30% savings
- Partial Upfront: 35% savings
- All Upfront: 40% savings

3-year commitment:
- All Upfront: 60% savings

Calculate break-even:
Reserved worth it if running > 70% of time (1-year no upfront)
```
**Astuce 13 : Stockage de bonne taille**
```bash
# Monitor storage usage
aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name FreeStorageSpace \
    --dimensions Name=DBInstanceIdentifier,Value=my-database \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average

# If usage is low, consider reducing allocated storage
# Note: Can only increase storage, not decrease
# Plan initial allocation carefully
```
**Astuce 14 : Utilisez Aurora Serverless pour les charges de travail variables**
```
Traditional Aurora: $175/month (db.t3.medium, always on)
Aurora Serverless: $35/month (used 20% of time)

Savings: 80% for dev/test environments
```
## Pièges \& Remèdes

### Piège 1 : épuisement des connexions

**Problème :** L'application épuise les connexions à la base de données, provoquant des échecs.

**Pourquoi cela arrive :**

- Pas de regroupement de connexions
- Fuites de connexion (ne ferme pas les connexions)
- Trop d'instances d'application
- Mauvais paramètre max_connections

**Impact :**

- Erreurs "Trop de connexions"
- Échecs des applications
- Impossible de se connecter à la base de données
- Arrêts de production

**Exemple d'erreur :**
```
FATAL: sorry, too many clients already
FATAL: remaining connection slots are reserved
```
**Remède :**

**Étape 1 : Mettre en œuvre le regroupement de connexions**
```python
# Use connection pooling library
from psycopg2 import pool

connection_pool = pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,  # Limit per application instance
    host='mydb.rds.amazonaws.com',
    database='myapp',
    user='dbuser',
    password='password'
)

# Always return connections to pool
def execute_query(query):
    conn = connection_pool.getconn()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        return cursor.fetchall()
    finally:
        connection_pool.putconn(conn)  # ALWAYS return connection
```
**Étape 2 : Surveiller l'utilisation de la connexion**
```python
# connection_monitor.py
import boto3

def monitor_connections(db_instance_id):
    """Alert when approaching connection limit"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get current connections
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/RDS',
        MetricName='DatabaseConnections',
        Dimensions=[
            {'Name': 'DBInstanceIdentifier', 'Value': db_instance_id}
        ],
        StartTime=datetime.utcnow() - timedelta(minutes=5),
        EndTime=datetime.utcnow(),
        Period=60,
        Statistics=['Maximum']
    )
    
    if response['Datapoints']:
        current_connections = response['Datapoints'][-1]['Maximum']
        
        # Get max_connections parameter
        rds = boto3.client('rds')
        instance = rds.describe_db_instances(
            DBInstanceIdentifiers=[db_instance_id]
        )['DBInstances'][0]
        
        instance_class = instance['DBInstanceClass']
        max_connections = get_max_connections(instance_class)
        
        utilization = (current_connections / max_connections) * 100
        
        print(f"Connection utilization: {utilization:.1f}%")
        print(f"Current: {current_connections}/{max_connections}")
        
        if utilization > 80:
            send_alert(f"High connection usage: {utilization:.1f}%")
    
    return utilization

# Create CloudWatch alarm
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_alarm(
    AlarmName='RDS-HighConnections',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='DatabaseConnections',
    Namespace='AWS/RDS',
    Period=300,
    Statistic='Average',
    Threshold=150,  # 80% of max_connections (assuming 200 max)
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:db-alerts']
)
```
**Étape 3 : Utiliser le proxy RDS**
```bash
# RDS Proxy manages connections efficiently
aws rds create-db-proxy \
    --db-proxy-name prod-proxy \
    --engine-family POSTGRESQL \
    --auth '[{
        "AuthScheme": "SECRETS",
        "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-secret"
    }]' \
    --role-arn arn:aws:iam::123456789012:role/RDSProxyRole \
    --vpc-subnet-ids subnet-1 subnet-2 \
    --require-tls

# Applications connect to proxy
# Proxy manages connection pooling automatically
```
**Prévention :**

- Utilisez toujours le pooling de connexions
- Définir le nombre maximum de connexions par instance d'application
- Surveiller l'utilisation de la connexion
- Utilisez le proxy RDS pour le sans serveur/Lambda
- Test sous charge avant production

***

### Piège 2 : tests de sauvegarde inadéquats

**Problème :** Des sauvegardes existent, mais les procédures de restauration échouent ou prennent trop de temps en cas de sinistre réel.

**Pourquoi cela arrive :**

- Jamais testé les procédures de restauration
- Rétention des sauvegardes trop courte
- Aucun runbook documenté
- Dépendances manquantes (groupes de paramètres, groupes de sécurité)

**Impact :**

- Temps d'arrêt prolongé en cas de sinistre
- Perte de données si les sauvegardes sont corrompues
- Non-respect du RTO/RPO
- Échec de la continuité des activités

**Remède :**

**Étape 1 : Procédure de restauration du document**
```bash
#!/bin/bash
# restore_runbook.sh - Database Disaster Recovery Runbook

echo "RDS DISASTER RECOVERY PROCEDURE"
echo "================================"

# Step 1: Identify latest snapshot
echo "1. Finding latest snapshot..."
LATEST_SNAPSHOT=$(aws rds describe-db-snapshots \
    --db-instance-identifier production-db \
    --snapshot-type automated \
    --query 'DBSnapshots|sort_by(@, &SnapshotCreateTime)[-1].DBSnapshotIdentifier' \
    --output text)

echo "   Latest snapshot: $LATEST_SNAPSHOT"

# Step 2: Restore database
echo "2. Restoring database from snapshot..."
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier production-db-restored \
    --db-snapshot-identifier $LATEST_SNAPSHOT \
    --db-instance-class db.r6g.xlarge \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name production-db-subnet \
    --publicly-accessible false \
    --multi-az

# Step 3: Wait for restoration
echo "3. Waiting for database to become available..."
aws rds wait db-instance-available \
    --db-instance-identifier production-db-restored

# Step 4: Get new endpoint
NEW_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier production-db-restored \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "4. Database restored!"
echo "   New endpoint: $NEW_ENDPOINT"

# Step 5: Update DNS or application configuration
echo "5. Update DNS/application to use new endpoint"
echo "   Manual step required"

# Step 6: Verify data integrity
echo "6. Verify data integrity..."
echo "   Run validation queries"
echo "   Check latest transaction timestamp"

echo ""
echo "RESTORE COMPLETED"
echo "Document actual restore time for RTO tracking"
```
**Étape 2 : Tests mensuels automatisés**
```python
# dr_test_automation.py
import boto3
from datetime import datetime
import time

def automated_restore_test(source_db_id):
    """
    Automated monthly DR test:
    1. Restore from latest snapshot
    2. Verify data integrity
    3. Measure restore time
    4. Clean up test resources
    5. Generate report
    """
    
    rds = boto3.client('rds')
    
    test_start = datetime.utcnow()
    test_db_id = f'{source_db_id}-dr-test-{int(time.time())}'
    
    print(f"Starting DR test at {test_start}")
    print("=" * 50)
    
    try:
        # Step 1: Get latest snapshot
        snapshots = rds.describe_db_snapshots(
            DBInstanceIdentifier=source_db_id,
            SnapshotType='automated'
        )['DBSnapshots']
        
        latest_snapshot = max(snapshots, key=lambda s: s['SnapshotCreateTime'])
        snapshot_id = latest_snapshot['DBSnapshotIdentifier']
        
        print(f"1. Using snapshot: {snapshot_id}")
        
        # Step 2: Restore
        print("2. Restoring database...")
        restore_start = time.time()
        
        rds.restore_db_instance_from_db_snapshot(
            DBInstanceIdentifier=test_db_id,
            DBSnapshotIdentifier=snapshot_id,
            DBInstanceClass='db.t3.medium',  # Use smaller instance for test
            PubliclyAccessible=False
        )
        
        # Wait for restoration
        waiter = rds.get_waiter('db_instance_available')
        waiter.wait(DBInstanceIdentifiers=[test_db_id])
        
        restore_duration = time.time() - restore_start
        
        print(f"   Restore completed in {restore_duration/60:.1f} minutes")
        
        # Step 3: Get endpoint and verify
        instance = rds.describe_db_instances(
            DBInstanceIdentifiers=[test_db_id]
        )['DBInstances'][0]
        
        endpoint = instance['Endpoint']['Address']
        
        print(f"3. Test database endpoint: {endpoint}")
        
        # Step 4: Verify data (connect and run validation queries)
        print("4. Verifying data integrity...")
        
        # This would connect to database and run validation queries
        # validation_passed = verify_database_integrity(endpoint)
        validation_passed = True  # Placeholder
        
        # Step 5: Generate report
        report = {
            'test_date': test_start.isoformat(),
            'source_db': source_db_id,
            'snapshot_id': snapshot_id,
            'snapshot_age_hours': (test_start - latest_snapshot['SnapshotCreateTime'].replace(tzinfo=None)).total_seconds() / 3600,
            'restore_time_minutes': restore_duration / 60,
            'validation_passed': validation_passed,
            'rto_met': restore_duration < 3600,  # 1 hour RTO
            'status': 'SUCCESS' if validation_passed else 'FAILED'
        }
        
        print("\nDR Test Report:")
        print(f"  Restore Time: {report['restore_time_minutes']:.1f} minutes")
        print(f"  RTO Target Met: {report['rto_met']}")
        print(f"  Validation: {'PASSED' if validation_passed else 'FAILED'}")
        
        # Send report
        send_report(report)
        
    finally:
        # Step 6: Cleanup
        print("\n5. Cleaning up test resources...")
        
        try:
            rds.delete_db_instance(
                DBInstanceIdentifier=test_db_id,
                SkipFinalSnapshot=True
            )
            print("   Test database deleted")
        except:
            print("   Failed to delete test database (manual cleanup needed)")
    
    return report

def send_report(report):
    """Send DR test report to stakeholders"""
    
    sns = boto3.client('sns')
    
    message = f"""
    Monthly DR Test Report
    
    Test Date: {report['test_date']}
    Source Database: {report['source_db']}
    Snapshot Age: {report['snapshot_age_hours']:.1f} hours
    Restore Time: {report['restore_time_minutes']:.1f} minutes
    RTO Target (60 min): {'MET' if report['rto_met'] else 'NOT MET'}
    Validation: {report['status']}
    
    {'✓ All checks passed' if report['status'] == 'SUCCESS' else '✗ Issues detected - review required'}
    """
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:dr-test-reports',
        Subject=f"DR Test {report['status']}: {report['source_db']}",
        Message=message
    )

# Schedule monthly via EventBridge
automated_restore_test('production-db')
```
**Prévention :**

- Test de restauration mensuel
- Documenter et automatiser les procédures
- Suivre les temps de restauration (RTO)
- Vérifier l'intégrité des données après la restauration
- Mettre à jour les runbooks en fonction des tests

***

### Piège 3 : échecs de mise à niveau

**Problème :** Les mises à niveau du moteur de base de données échouent ou entraînent une incompatibilité des applications.

**Pourquoi cela arrive :**

- Aucun test avant la mise à niveau de la production
- Code d'application incompatible
- Fonctionnalités obsolètes utilisées
- Fenêtre de maintenance insuffisante

**Impact :**

- Temps d'arrêt prolongé
- Échecs des applications
- Risque de corruption des données
- Complexité de restauration

**Remède :**

**Étape 1 : Tester les mises à niveau en dehors de la production**
```bash
# Create snapshot of production
SNAPSHOT_ID=$(aws rds create-db-snapshot \
    --db-instance-identifier production-db \
    --db-snapshot-identifier pre-upgrade-test-$(date +%Y%m%d) \
    --query 'DBSnapshot.DBSnapshotIdentifier' \
    --output text)

# Wait for snapshot
aws rds wait db-snapshot-completed \
    --db-snapshot-identifier $SNAPSHOT_ID

# Restore to test instance
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier test-upgrade \
    --db-snapshot-identifier $SNAPSHOT_ID \
    --db-instance-class db.t3.medium

# Test upgrade
aws rds modify-db-instance \
    --db-instance-identifier test-upgrade \
    --engine-version 15.4 \
    --allow-major-version-upgrade \
    --apply-immediately

# Test application compatibility
# Run test suite against upgraded database
# Measure performance
```
**Étape 2 : Utiliser le déploiement bleu-vert (Aurora)**
```bash
# Blue-Green deployment for zero-downtime upgrades
aws rds create-blue-green-deployment \
    --blue-green-deployment-name production-upgrade \
    --source-arn arn:aws:rds:us-east-1:123456789012:cluster:production-aurora \
    --target-engine-version 15.4 \
    --target-db-parameter-group-name aurora-postgres15

# Test green environment
# When ready, switchover (< 1 minute downtime)
aws rds switchover-blue-green-deployment \
    --blue-green-deployment-identifier bgd-12345678 \
    --switchover-timeout 300

# Can rollback by switching back if issues
```
**Étape 3 : Mettre en œuvre la liste de contrôle de mise à niveau**
```python
# upgrade_checklist.py

def pre_upgrade_checklist(db_instance_id, target_version):
    """
    Validate readiness for database upgrade
    """
    
    rds = boto3.client('rds')
    
    checks = []
    
    # 1. Check current backups
    snapshots = rds.describe_db_snapshots(
        DBInstanceIdentifier=db_instance_id,
        SnapshotType='automated'
    )['DBSnapshots']
    
    latest_backup = max(snapshots, key=lambda s: s['SnapshotCreateTime'])
    backup_age_hours = (datetime.utcnow() - latest_backup['SnapshotCreateTime'].replace(tzinfo=None)).total_seconds() / 3600
    
    checks.append({
        'check': 'Recent backup exists',
        'passed': backup_age_hours < 24,
        'details': f'Latest backup: {backup_age_hours:.1f} hours old'
    })
    
    # 2. Check maintenance window
    instance = rds.describe_db_instances(
        DBInstanceIdentifiers=[db_instance_id]
    )['DBInstances'][0]
    
    maintenance_window = instance.get('PreferredMaintenanceWindow')
    
    checks.append({
        'check': 'Maintenance window configured',
        'passed': maintenance_window is not None,
        'details': f'Window: {maintenance_window}'
    })
    
    # 3. Check application compatibility
    checks.append({
        'check': 'Application tested with new version',
        'passed': False,  # Manual verification
        'details': 'Verify application compatibility manually'
    })
    
    # 4. Check for deprecated features
    checks.append({
        'check': 'No deprecated features in use',
        'passed': False,  # Manual verification
        'details': 'Review deprecation notes for target version'
    })
    
    # 5. Check Multi-AZ enabled
    checks.append({
        'check': 'Multi-AZ enabled',
        'passed': instance['MultiAZ'],
        'details': 'Multi-AZ reduces upgrade downtime'
    })
    
    # Print checklist
    print(f"Pre-Upgrade Checklist for {db_instance_id}")
    print(f"Target Version: {target_version}")
    print("=" * 60)
    
    all_passed = True
    
    for check in checks:
        status = '✓' if check['passed'] else '✗'
        print(f"{status} {check['check']}")
        print(f"  {check['details']}")
        
        if not check['passed']:
            all_passed = False
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✓ All checks passed - ready for upgrade")
    else:
        print("✗ Some checks failed - resolve before upgrading")
    
    return all_passed

# Run checklist before upgrade
ready = pre_upgrade_checklist('production-db', '15.4')

if ready:
    # Proceed with upgrade
    pass
else:
    print("Fix issues before proceeding")
```
**Prévention :**

- Testez toujours d'abord les mises à niveau hors production
- Examiner les notes de mise à niveau et les dépréciations
- Utiliser le déploiement Bleu-Vert (Aurora)
- Planifier pendant la fenêtre de maintenance
- Préparez un plan de restauration
- Surveiller de près après la mise à niveau

***

## Résumé du chapitre

Amazon RDS et Aurora fournissent des services de bases de données relationnelles gérées qui éliminent les frais opérationnels tout en offrant des performances, une disponibilité et une sécurité de niveau entreprise. Comprendre les options de moteur, le multi-AZ pour la haute disponibilité, les réplicas en lecture pour la mise à l'échelle, l'architecture distribuée d'Aurora, les stratégies de sauvegarde et l'optimisation des performances est essentiel pour les déploiements de bases de données de production. Une bonne gestion des connexions, une surveillance et une planification de la reprise après sinistre séparent les opérations de base de données fiables des opérations problématiques.

**Principaux points à retenir :**

- **Aurora pour le cloud natif :** performances MySQL 5x/3x PostgreSQL, stockage à mise à l'échelle automatique, basculement <30 s
- **Multi-AZ pour HA :** Basculement automatique en 60 à 120 secondes, aucune perte de données, SLA de 99,95 %
- **Répliques de lecture à grande échelle :** Jusqu'à 15 réplicas (Aurora), distribution du trafic de lecture, reprise après sinistre interrégionale
- **Regroupement de connexions critique :** Empêche l'épuisement des connexions, utilisez le proxy RDS pour le sans serveur
- **Les sauvegardes ne sont pas DR :** Testez les procédures de restauration mensuellement, documentez le RTO/RPO
- **Surveillez avec Performance Insights :** Identifiez les requêtes lentes, analysez les événements d'attente et optimisez les performances.
- **Optimisation des coûts :** Instances réservées (économies de 40 à 60 %), instances de taille appropriée, Aurora Serverless pour les charges de travail variables

Comprendre RDS et Aurora en profondeur vous permet de créer des systèmes de bases de données hautement disponibles, performants et sécurisés qui s'adaptent aux besoins de vos applications tout en minimisant la charge opérationnelle.

## Questions de révision

1. **Quelle fonctionnalité Aurora offre les performances de démarrage à froid les plus rapides ?**
a) Multi-AZ
b) Lire les répliques
c) Base de données mondiale
d) Aurora sans serveur v2

**Réponse : D** - Aurora Serverless v2 offre une mise à l'échelle instantanée sans interruption de connexion.

2. **Nombre maximum de réplicas en lecture pour Aurora ?**
une) 5
b) 15
c) 30
d) Illimité

**Réponse : B** - Aurora prend en charge jusqu'à 15 réplicas en lecture.

3. **Type de réplication multi-AZ ?**
a) Asynchrone
b) Synchrone
c) Semi-synchrone
d) Pas de réplication

**Réponse : B** - Multi-AZ utilise la réplication synchrone (aucune perte de données).

4. **Le stockage Aurora évolue automatiquement jusqu'à :**
a) 64 To
b) 128 To
c) 256 To
d) Illimité

**Réponse : B** - Le stockage Aurora évolue automatiquement de 10 Go à 128 To.

5. **Quel moteur n'a PAS de version Aurora ?**
a) MySQL
b) PostgreSQL
c)Oracle
d) A et B ont tous deux Aurora

**Réponse : C** - Aurora est uniquement disponible pour MySQL et PostgreSQL.

6. **Plage de conservation des sauvegardes automatisées RDS :**
a) 1 à 7 jours
b) 1-35 jours
c) 1 à 90 jours
d) 1-365 jours

**Réponse : B** - Conservation des sauvegardes automatisées : 1 à 35 jours (7 jours par défaut).

7. **Délai de basculement Aurora :**
a) 1 à 5 secondes
b) 30 secondes
c) 60-120 secondes
d) 5 minutes

**Réponse : B** – Aurora bascule généralement en moins de 30 secondes.

8. **Avantage principal du proxy RDS :**
a) Requêtes plus rapides
b) Regroupement de connexions
c) Sauvegardes automatiques
d) Lire la mise à l'échelle

**Réponse : B** - Le proxy RDS assure le regroupement et la gestion des connexions.

9. **Aurora réplique les données sur combien de copies ?**
a)2
b) 3
c)6
d) 12

**Réponse : C** - Aurora conserve 6 copies sur 3 AZ (2 copies par AZ).

10. **Quelle métrique indique des problèmes de connexion ?**
a) Utilisation du processeur
b) Mémoire libérable
c) Connexions à la base de données
d) Lire IOPS

**Réponse : C** - La métrique DatabaseConnections affiche l'utilisation de la connexion.

11. **Aurora Backtrack est disponible pour :**
a) MySQL uniquement
b) PostgreSQL uniquement
c) MySQL et PostgreSQL
d)Oracle

**Réponse : A** - Aurora Backtrack est uniquement disponible pour l'édition compatible MySQL.

12. **Rétention gratuite de Performance Insights :**
a) 1 jour
b) 7 jours
c) 30 jours
d) 90 jours

**Réponse : B** - Performance Insights offre 7 jours de rétention gratuite.

13. **Pouvez-vous chiffrer une instance RDS non chiffrée existante ?**
a) Oui, avec la commande modifier
b) Non, vous devez créer une nouvelle instance chiffrée
c) Oui, cryptage automatique
d) Uniquement pour Aurora

**Réponse : B** - Impossible de chiffrer l'instance existante ; doit restaurer à partir d'un instantané chiffré.

14. **Lire le type de réplication du réplica :**
a) Synchrone
b) Asynchrone
c) Semi-synchrone
d) Pas de réplication

**Réponse : B** - Les réplicas en lecture utilisent la réplication asynchrone.

15. **Délai de réplication de la base de données Aurora Global :**
a) <1 seconde
b) <5 secondes
c) <1 minute
d) 5 minutes

**Réponse : A** - Aurora Global Database présente généralement un délai de réplication inférieur à la seconde.

***
"""Diagrammes d'architecture ajoutés au corpus (contenu original, FR/EN).

Chaque entrée est une fonction de la langue qui retourne le titre, la description,
l'explication (Markdown) et le code Mermaid. Les libellés restent courts et sans HTML :
le rendu utilise des libellés SVG natifs.
"""

from __future__ import annotations


def _t(lang: str, fr: str, en: str) -> str:
    return fr if lang == "fr" else en


def vpc_endpoints(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  INET(("Internet")) --> IGW["Internet Gateway"]
  subgraph VPC["VPC 10.0.0.0/16"]
    subgraph PUB["{t('Sous-réseau public', 'Public subnet')}"]
      ALB["Application Load Balancer"]
      NAT["NAT Gateway"]
    end
    subgraph PRIV["{t('Sous-réseau privé', 'Private subnet')}"]
      EC2["{t('Instances EC2', 'EC2 instances')}"]
    end
    GWE["{t('Point de terminaison passerelle S3', 'S3 gateway endpoint')}"]
    IFE["{t('Point de terminaison interface', 'Interface endpoint')}"]
  end
  IGW --> ALB --> EC2
  EC2 -->|"{t('Sortie Internet', 'Internet egress')}"| NAT --> IGW
  EC2 -->|"{t('Privé et gratuit', 'Private and free')}"| GWE --> S3[("Amazon S3")]
  EC2 -->|"PrivateLink"| IFE --> SM["AWS Secrets Manager"]'''
    return {
        "title": t("Réseau VPC : sous-réseaux, NAT et points de terminaison", "VPC networking: subnets, NAT and endpoints"),
        "description": t(
            "Comment une instance privée atteint Internet et les services AWS sans adresse IP publique.",
            "How a private instance reaches the Internet and AWS services without a public IP address.",
        ),
        "explanation": t(
            "- **NAT Gateway** : sortie Internet pour les sous-réseaux privés, facturée à l’heure et au Go traité.\n"
            "- **Point de terminaison passerelle** (S3, DynamoDB) : une route dans la table de routage, **sans frais**.\n"
            "- **Point de terminaison interface** (PrivateLink) : une ENI privée par AZ pour les autres services, facturée.\n"
            "- Piège d’examen : pour réduire le coût d’accès à S3 depuis un sous-réseau privé, choisir le point de terminaison passerelle plutôt que la NAT Gateway.",
            "- **NAT Gateway**: Internet egress for private subnets, billed per hour and per GB processed.\n"
            "- **Gateway endpoint** (S3, DynamoDB): a route in the route table, **free of charge**.\n"
            "- **Interface endpoint** (PrivateLink): a private ENI per AZ for other services, billed.\n"
            "- Exam trap: to cut the cost of S3 access from a private subnet, pick the gateway endpoint over the NAT Gateway.",
        ),
        "code": code, "domain": "D1",
        "services": ["VPC", "NAT Gateway", "S3", "PrivateLink", "Secrets Manager"],
    }


def iam_cross_account(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  subgraph ACCA["{t('Compte A : développement', 'Account A: development')}"]
    USR["{t('Utilisateur ou rôle IAM', 'IAM user or role')}"]
  end
  subgraph ACCB["{t('Compte B : production', 'Account B: production')}"]
    ROLE["{t('Rôle IAM ReadOnlyProd', 'IAM role ReadOnlyProd')}"]
    TRUST["{t('Politique d’approbation : compte A, MFA exigée', 'Trust policy: account A, MFA required')}"]
    BKT[("{t('Bucket S3', 'S3 bucket')}")]
  end
  STS["AWS STS"]
  USR -->|"1. sts:AssumeRole"| STS
  STS -->|"{t('2. vérifie', '2. checks')}"| TRUST
  STS -->|"{t('3. identifiants temporaires', '3. temporary credentials')}"| USR
  USR -->|"{t('4. agit avec le rôle', '4. acts as the role')}"| ROLE --> BKT'''
    return {
        "title": t("Accès entre comptes avec un rôle IAM", "Cross-account access with an IAM role"),
        "description": t(
            "Le compte A obtient un accès temporaire au compte B sans partager de clés d’accès.",
            "Account A gets temporary access to account B without sharing access keys.",
        ),
        "explanation": t(
            "- La **politique d’approbation** (trust policy) du rôle désigne qui peut l’assumer ; la **politique d’autorisation** dit ce que le rôle peut faire.\n"
            "- Côté compte A, l’identité doit aussi avoir le droit `sts:AssumeRole` sur l’ARN du rôle.\n"
            "- Les identifiants STS expirent (15 min à 12 h) : aucun secret durable à faire tourner.\n"
            "- Pour un tiers, ajouter une condition `sts:ExternalId` contre le problème du « confused deputy ».",
            "- The role **trust policy** says who can assume it; the **permissions policy** says what the role can do.\n"
            "- In account A, the identity also needs `sts:AssumeRole` on the role ARN.\n"
            "- STS credentials expire (15 min to 12 h): no long-lived secret to rotate.\n"
            "- For a third party, add an `sts:ExternalId` condition against the confused deputy problem.",
        ),
        "code": code, "domain": "D1", "services": ["IAM", "STS", "S3"],
    }


def s3_lifecycle(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  STD["{t('Envoi : S3 Standard', 'Upload: S3 Standard')}"] -->|"{t('30 jours', '30 days')}"| IA["S3 Standard-IA"]
  IA -->|"{t('90 jours', '90 days')}"| GIR["S3 Glacier Instant Retrieval"]
  GIR -->|"{t('180 jours', '180 days')}"| GDA["S3 Glacier Deep Archive"]
  GDA -->|"{t('7 ans', '7 years')}"| EXP["{t('Expiration : suppression', 'Expiration: delete')}"]
  IT["S3 Intelligent-Tiering"] -.->|"{t('Accès imprévisible', 'Unpredictable access')}"| STD'''
    return {
        "title": t("Cycle de vie des objets S3", "S3 object lifecycle"),
        "description": t(
            "Des règles de cycle de vie déplacent les objets vers des classes moins chères à mesure qu’ils vieillissent.",
            "Lifecycle rules move objects to cheaper storage classes as they age.",
        ),
        "explanation": t(
            "- Standard-IA et One Zone-IA : durée minimale facturée de 30 jours et frais de récupération.\n"
            "- Glacier Instant Retrieval : accès en millisecondes, minimum 90 jours ; Deep Archive : récupération en 12 à 48 h, minimum 180 jours.\n"
            "- **Intelligent-Tiering** convient quand le profil d’accès est inconnu ou change.\n"
            "- Sur un bucket versionné, prévoir aussi une règle pour les **versions non actuelles**.",
            "- Standard-IA and One Zone-IA: 30-day minimum billed duration and retrieval fees.\n"
            "- Glacier Instant Retrieval: millisecond access, 90-day minimum; Deep Archive: 12–48 h retrieval, 180-day minimum.\n"
            "- **Intelligent-Tiering** fits when the access pattern is unknown or changes.\n"
            "- On a versioned bucket, also add a rule for **noncurrent versions**.",
        ),
        "code": code, "domain": "D4", "services": ["S3", "S3 Glacier"],
    }


def dr_strategies(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  BR["{t('Sauvegarde et restauration', 'Backup and restore')}"] --> PL["Pilot light"] --> WS["Warm standby"] --> AA["{t('Multi-site actif/actif', 'Multi-site active/active')}"]
  BR -.- BR2["{t('RPO et RTO en heures', 'RPO and RTO in hours')}"]
  PL -.- PL2["{t('Données répliquées, serveurs éteints', 'Replicated data, servers off')}"]
  WS -.- WS2["{t('Copie réduite qui tourne', 'Scaled-down copy running')}"]
  AA -.- AA2["{t('RPO et RTO proches de zéro', 'RPO and RTO near zero')}"]'''
    return {
        "title": t("Les quatre stratégies de reprise après sinistre", "The four disaster recovery strategies"),
        "description": t(
            "De gauche à droite : RPO et RTO plus courts, mais coût et complexité plus élevés.",
            "Left to right: shorter RPO and RTO, but higher cost and complexity.",
        ),
        "explanation": t(
            "- **Sauvegarde et restauration** : AWS Backup, snapshots copiés dans une autre région. Le moins cher.\n"
            "- **Pilot light** : la base est répliquée en continu, le reste est déployé au moment du basculement.\n"
            "- **Warm standby** : un environnement complet mais réduit tourne en permanence, puis monte en charge.\n"
            "- **Actif/actif** : Route 53, DynamoDB Global Tables ou Aurora Global Database ; trafic servi par plusieurs régions.\n"
            "- À l’examen, partir du RPO/RTO exigé puis choisir l’option **la moins chère** qui le respecte.",
            "- **Backup and restore**: AWS Backup, snapshots copied to another Region. The cheapest.\n"
            "- **Pilot light**: the database replicates continuously, the rest is deployed at failover time.\n"
            "- **Warm standby**: a full but scaled-down environment always runs, then scales out.\n"
            "- **Active/active**: Route 53, DynamoDB Global Tables or Aurora Global Database; traffic served by several Regions.\n"
            "- In the exam, start from the required RPO/RTO and pick the **cheapest** option that meets it.",
        ),
        "code": code, "domain": "D2", "services": ["AWS Backup", "Route 53", "Aurora", "DynamoDB"],
    }


def multi_region_active(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart TB
  USERS(["{t('Utilisateurs', 'Users')}"]) --> R53["{t('Route 53 : latence et contrôles de santé', 'Route 53: latency and health checks')}"]
  subgraph EU["{t('Région eu-west-3', 'Region eu-west-3')}"]
    ALB1["ALB"] --> APP1["Auto Scaling group"] --> DDB1[("DynamoDB")]
  end
  subgraph US["{t('Région us-east-1', 'Region us-east-1')}"]
    ALB2["ALB"] --> APP2["Auto Scaling group"] --> DDB2[("DynamoDB")]
  end
  R53 --> ALB1
  R53 --> ALB2
  DDB1 <-->|"{t('Global Tables : réplication multi-actif', 'Global Tables: multi-active replication')}"| DDB2'''
    return {
        "title": t("Architecture multi-région actif/actif", "Multi-Region active/active architecture"),
        "description": t(
            "Deux régions servent le trafic en même temps ; Route 53 envoie chaque utilisateur vers la plus proche en bonne santé.",
            "Two Regions serve traffic at the same time; Route 53 sends each user to the closest healthy one.",
        ),
        "explanation": t(
            "- Routage par **latence** avec contrôles de santé : si une région tombe, ses enregistrements sont retirés.\n"
            "- **DynamoDB Global Tables** réplique en écriture multi-région (cohérence à terme, dernier écrivain gagnant).\n"
            "- Alternative relationnelle : **Aurora Global Database** (une région en écriture, basculement en moins d’une minute).\n"
            "- Les données de session doivent être partagées ou sans état (jetons, DynamoDB).",
            "- **Latency** routing with health checks: when a Region fails, its records are withdrawn.\n"
            "- **DynamoDB Global Tables** replicate writes across Regions (eventual consistency, last writer wins).\n"
            "- Relational alternative: **Aurora Global Database** (one writer Region, failover in under a minute).\n"
            "- Session data must be shared or stateless (tokens, DynamoDB).",
        ),
        "code": code, "domain": "D2", "services": ["Route 53", "ALB", "Auto Scaling", "DynamoDB"],
    }


def caching_layers(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  CLI(["Clients"]) --> CF["{t('CloudFront : cache en périphérie', 'CloudFront: edge cache')}"]
  CF -->|"{t('Contenu statique', 'Static content')}"| S3[("{t('S3 avec OAC', 'S3 with OAC')}")]
  CF -->|"{t('Contenu dynamique', 'Dynamic content')}"| ALB["ALB"] --> APP["{t('Application', 'Application')}"]
  APP -->|"{t('1. lecture du cache', '1. cache read')}"| EC["ElastiCache Redis"]
  APP -->|"{t('2. cache manqué', '2. cache miss')}"| RR[("{t('Réplique en lecture', 'Read replica')}")]
  APP -->|"{t('Écritures', 'Writes')}"| RDS[("{t('RDS primaire', 'RDS primary')}")]
  RDS -->|"{t('Réplication asynchrone', 'Async replication')}"| RR'''
    return {
        "title": t("Couches de cache pour les performances", "Caching layers for performance"),
        "description": t(
            "Chaque couche absorbe une partie des lectures avant qu’elles n’atteignent la base de données.",
            "Each layer absorbs part of the reads before they reach the database.",
        ),
        "explanation": t(
            "- **CloudFront** met en cache près des utilisateurs ; OAC garde le bucket S3 privé.\n"
            "- **ElastiCache** (lazy loading) : l’application lit le cache, puis la base en cas d’échec et remplit le cache avec un TTL.\n"
            "- **Réplique en lecture RDS** : décharge les lectures ; asynchrone, donc légèrement en retard.\n"
            "- DynamoDB a son propre cache en mémoire : **DAX** (microsecondes).",
            "- **CloudFront** caches close to users; OAC keeps the S3 bucket private.\n"
            "- **ElastiCache** (lazy loading): the app reads the cache, then the database on a miss and fills the cache with a TTL.\n"
            "- **RDS read replica**: offloads reads; asynchronous, so slightly behind.\n"
            "- DynamoDB has its own in-memory cache: **DAX** (microseconds).",
        ),
        "code": code, "domain": "D3", "services": ["CloudFront", "ElastiCache", "RDS", "S3"],
    }


def fanout_decoupling(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  ORD["{t('Service Commandes', 'Orders service')}"] -->|"{t('publie', 'publishes')}"| SNS["{t('Rubrique SNS', 'SNS topic')}"]
  SNS --> Q1["{t('File SQS : facturation', 'SQS queue: billing')}"]
  SNS --> Q2["{t('File SQS : expédition', 'SQS queue: shipping')}"]
  SNS --> LBD["{t('Lambda : notifications', 'Lambda: notifications')}"]
  Q1 --> W1["{t('Traitement facturation', 'Billing workers')}"]
  Q2 --> W2["{t('Traitement expédition', 'Shipping workers')}"]
  Q1 -.->|"{t('après maxReceiveCount', 'after maxReceiveCount')}"| DLQ["{t('File de lettres mortes', 'Dead-letter queue')}"]
  Q2 -.-> DLQ
  DLQ --> ALARM["{t('Alarme CloudWatch', 'CloudWatch alarm')}"]'''
    return {
        "title": t("Découplage par diffusion SNS vers SQS", "Decoupling with SNS to SQS fan-out"),
        "description": t(
            "Un seul message est copié vers plusieurs files ; chaque consommateur avance à son rythme.",
            "One message is copied to several queues; each consumer works at its own pace.",
        ),
        "explanation": t(
            "- Le producteur ne connaît pas les consommateurs : on en ajoute un sans le modifier.\n"
            "- Les files absorbent les pics : les traitements montent en charge selon `ApproximateNumberOfMessagesVisible`.\n"
            "- Une **DLQ** isole les messages en échec répété ; une alarme prévient l’équipe.\n"
            "- Ordre strict et dédoublonnage : files **FIFO** (avec une rubrique SNS FIFO).",
            "- The producer does not know the consumers: add one without changing it.\n"
            "- Queues absorb spikes: workers scale on `ApproximateNumberOfMessagesVisible`.\n"
            "- A **DLQ** isolates repeatedly failing messages; an alarm warns the team.\n"
            "- Strict ordering and deduplication: **FIFO** queues (with an SNS FIFO topic).",
        ),
        "code": code, "domain": "D2", "services": ["SNS", "SQS", "Lambda", "CloudWatch"],
    }


def kms_envelope(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  APP["{t('Application', 'Application')}"] -->|"1. GenerateDataKey"| KMS["{t('AWS KMS : clé KMS', 'AWS KMS: KMS key')}"]
  KMS -->|"{t('2. clé en clair et clé chiffrée', '2. plaintext and encrypted key')}"| APP
  APP -->|"{t('3. chiffre localement', '3. encrypts locally')}"| DATA["{t('Données chiffrées', 'Encrypted data')}"]
  APP -->|"{t('4. stocke la clé chiffrée', '4. stores encrypted key')}"| STORE[("S3, EBS, RDS")]
  APP -.->|"{t('5. Decrypt pour relire', '5. Decrypt to read back')}"| KMS
  TRAIL["CloudTrail"] -.->|"{t('journalise les appels', 'logs every call')}"| KMS'''
    return {
        "title": t("Chiffrement d’enveloppe avec AWS KMS", "Envelope encryption with AWS KMS"),
        "description": t(
            "La clé KMS ne quitte jamais KMS : elle chiffre seulement les clés de données.",
            "The KMS key never leaves KMS: it only encrypts the data keys.",
        ),
        "explanation": t(
            "- `Encrypt` direct est limité à 4 Ko : au-delà, utiliser une **clé de données**.\n"
            "- La clé en clair reste en mémoire le temps du chiffrement puis est effacée.\n"
            "- L’accès est contrôlé par la **politique de clé** et IAM ; chaque usage apparaît dans CloudTrail.\n"
            "- Rotation automatique annuelle possible pour les clés gérées par le client.",
            "- Direct `Encrypt` is limited to 4 KB: beyond that, use a **data key**.\n"
            "- The plaintext key stays in memory only during encryption, then is discarded.\n"
            "- Access is controlled by the **key policy** and IAM; every use appears in CloudTrail.\n"
            "- Automatic yearly rotation is available for customer managed keys.",
        ),
        "code": code, "domain": "D1", "services": ["KMS", "CloudTrail", "S3"],
    }


def migration_transfer(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  subgraph DC["{t('Centre de données', 'Data center')}"]
    NAS["{t('Serveurs de fichiers NAS', 'NAS file servers')}"]
    SRCDB[("{t('Base de données', 'Database')}")]
    APPS["{t('Serveurs applicatifs', 'Application servers')}"]
  end
  NAS -->|"{t('DataSync : en ligne', 'DataSync: online')}"| TGT[("S3, EFS, FSx")]
  NAS -->|"{t('Snowball : hors ligne, plusieurs To', 'Snowball: offline, many TB')}"| TGT
  NAS -->|"{t('Storage Gateway : accès hybride', 'Storage Gateway: hybrid access')}"| TGT
  SRCDB -->|"{t('AWS DMS : réplication continue', 'AWS DMS: continuous replication')}"| RDS[("RDS, Aurora")]
  APPS -->|"Application Migration Service"| EC2["Amazon EC2"]'''
    return {
        "title": t("Outils de migration et de transfert vers AWS", "Migration and transfer tools to AWS"),
        "description": t(
            "Quel service choisir selon le type de données, le volume et la bande passante.",
            "Which service to pick based on data type, volume and bandwidth.",
        ),
        "explanation": t(
            "- **DataSync** : transfert en ligne planifié et vérifié vers S3, EFS ou FSx.\n"
            "- **Snowball** : quand le réseau mettrait des semaines ; appareil physique expédié.\n"
            "- **Storage Gateway** : les serveurs locaux continuent d’utiliser NFS, SMB ou iSCSI avec un stockage dans AWS.\n"
            "- **DMS** (+ SCT si les moteurs diffèrent) : migration de bases avec un arrêt minimal.\n"
            "- **Application Migration Service** : « rehost » de serveurs entiers.",
            "- **DataSync**: scheduled, verified online transfer to S3, EFS or FSx.\n"
            "- **Snowball**: when the network would take weeks; a physical device is shipped.\n"
            "- **Storage Gateway**: on-premises servers keep using NFS, SMB or iSCSI with storage in AWS.\n"
            "- **DMS** (+ SCT when engines differ): database migration with minimal downtime.\n"
            "- **Application Migration Service**: rehost entire servers.",
        ),
        "code": code, "domain": "D3", "services": ["DataSync", "Snowball", "Storage Gateway", "DMS"],
    }


def auto_scaling(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart TB
  USERS(["{t('Utilisateurs', 'Users')}"]) --> ALB["{t('ALB multi-AZ', 'Multi-AZ ALB')}"]
  subgraph ASG["{t('Auto Scaling group : min 2, max 6', 'Auto Scaling group: min 2, max 6')}"]
    subgraph AZA["AZ a"]
      I1["EC2"]
    end
    subgraph AZB["AZ b"]
      I2["EC2"]
    end
  end
  ALB --> I1
  ALB --> I2
  CW["{t('CloudWatch : CPU moyen cible 50', 'CloudWatch: target average CPU 50')}"] -->|"target tracking"| ASG
  ALB -.->|"{t('contrôle de santé ELB', 'ELB health check')}"| ASG'''
    return {
        "title": t("Auto Scaling multi-AZ et autoréparation", "Multi-AZ Auto Scaling and self-healing"),
        "description": t(
            "Le groupe garde le nombre voulu d’instances saines, réparties sur plusieurs zones.",
            "The group keeps the desired number of healthy instances, spread across several zones.",
        ),
        "explanation": t(
            "- Activer le **contrôle de santé ELB** sur le groupe : une instance qui échoue derrière l’ALB est remplacée.\n"
            "- **Target tracking** : on fixe une cible (CPU, requêtes par cible), le groupe ajuste la capacité.\n"
            "- Un minimum de 2 réparti sur 2 AZ survit à la perte d’une zone.\n"
            "- Mise à l’échelle **prédictive** ou **planifiée** pour les pics connus.",
            "- Enable the **ELB health check** on the group: an instance failing behind the ALB is replaced.\n"
            "- **Target tracking**: set a target (CPU, requests per target), the group adjusts capacity.\n"
            "- A minimum of 2 across 2 AZs survives the loss of one zone.\n"
            "- **Predictive** or **scheduled** scaling for known peaks.",
        ),
        "code": code, "domain": "D2", "services": ["Auto Scaling", "ALB", "EC2", "CloudWatch"],
    }


def ec2_pricing(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart TD
  Q1{{"{t('Charge stable et prévisible ?', 'Steady, predictable load?')}"}} -->|"{t('Oui', 'Yes')}"| Q2{{"{t('Engagement 1 ou 3 ans ?', '1 or 3 year commitment?')}"}}
  Q2 -->|"{t('Famille variable', 'Family may change')}"| CSP["Compute Savings Plans"]
  Q2 -->|"{t('Famille fixe', 'Fixed family')}"| RI["{t('Instances réservées ou EC2 Savings Plans', 'Reserved Instances or EC2 Savings Plans')}"]
  Q1 -->|"{t('Non', 'No')}"| Q3{{"{t('Interruption acceptable ?', 'Can be interrupted?')}"}}
  Q3 -->|"{t('Oui', 'Yes')}"| SPOT["{t('Instances Spot', 'Spot Instances')}"]
  Q3 -->|"{t('Non', 'No')}"| OD["{t('À la demande', 'On-Demand')}"]
  Q1 -->|"{t('Licence par serveur', 'Per-server licensing')}"| DH["{t('Hôtes dédiés', 'Dedicated Hosts')}"]'''
    return {
        "title": t("Choisir l’option d’achat EC2", "Choosing the EC2 purchasing option"),
        "description": t(
            "Arbre de décision des modèles de tarification EC2 les plus fréquents à l’examen.",
            "Decision tree for the EC2 pricing models most often tested.",
        ),
        "explanation": t(
            "- **Savings Plans / réservées** : jusqu’à ~72 % d’économie contre un engagement d’usage.\n"
            "- **Spot** : jusqu’à ~90 % moins cher, mais AWS peut reprendre l’instance avec 2 minutes de préavis. Idéal pour lots, CI, traitements sans état.\n"
            "- **À la demande** : charges courtes ou imprévisibles qu’on ne peut pas interrompre.\n"
            "- **Hôtes dédiés** : licences liées aux sockets ou cœurs physiques, conformité.",
            "- **Savings Plans / Reserved**: up to ~72% savings for a usage commitment.\n"
            "- **Spot**: up to ~90% cheaper, but AWS can reclaim the instance with a 2-minute notice. Ideal for batch, CI, stateless work.\n"
            "- **On-Demand**: short or unpredictable workloads that cannot be interrupted.\n"
            "- **Dedicated Hosts**: licenses tied to physical sockets or cores, compliance.",
        ),
        "code": code, "domain": "D4", "services": ["EC2", "Savings Plans", "Spot"],
    }


def static_website(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  VIS(["{t('Visiteurs', 'Visitors')}"]) -->|"DNS"| R53["{t('Route 53 : enregistrement alias', 'Route 53: alias record')}"]
  R53 --> CF["{t('CloudFront et certificat ACM', 'CloudFront and ACM certificate')}"]
  WAF["AWS WAF"] -.-> CF
  CF -->|"Origin Access Control"| BKT[("{t('Bucket S3 privé', 'Private S3 bucket')}")]
  CF -->|"/api"| APIGW["API Gateway"] --> LBD["Lambda"]'''
    return {
        "title": t("Site web statique sécurisé et global", "Secure, global static website"),
        "description": t(
            "Hébergement sans serveur : S3 pour les fichiers, CloudFront pour la diffusion et HTTPS.",
            "Serverless hosting: S3 for files, CloudFront for delivery and HTTPS.",
        ),
        "explanation": t(
            "- Le bucket reste **privé** : seul CloudFront y accède grâce à **OAC**.\n"
            "- Le certificat ACM utilisé par CloudFront doit être créé dans **us-east-1**.\n"
            "- **WAF** sur CloudFront filtre injections, bots et limite le débit.\n"
            "- Un enregistrement **alias** Route 53 pointe gratuitement vers CloudFront, même à l’apex du domaine.",
            "- The bucket stays **private**: only CloudFront reaches it through **OAC**.\n"
            "- The ACM certificate used by CloudFront must be created in **us-east-1**.\n"
            "- **WAF** on CloudFront filters injections, bots and rate-limits.\n"
            "- A Route 53 **alias** record points to CloudFront for free, even at the zone apex.",
        ),
        "code": code, "domain": "D3", "services": ["S3", "CloudFront", "ACM", "Route 53", "WAF"],
    }


def data_lake(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  SRC["{t('Sources : applications, journaux, bases', 'Sources: apps, logs, databases')}"] -->|"Data Firehose"| RAW[("{t('S3 : zone brute', 'S3: raw zone')}")]
  RAW --> GLUE["{t('Glue : crawler et ETL', 'Glue: crawler and ETL')}"]
  GLUE --> CUR[("{t('S3 : zone Parquet', 'S3: Parquet zone')}")]
  GLUE --> CAT["Glue Data Catalog"]
  CAT --> ATH["{t('Athena : SQL sans serveur', 'Athena: serverless SQL')}"]
  CUR --> ATH
  ATH --> QS["QuickSight"]
  LF["{t('Lake Formation : permissions', 'Lake Formation: permissions')}"] -.-> CAT'''
    return {
        "title": t("Lac de données sur S3", "Data lake on S3"),
        "description": t(
            "Ingestion, catalogage et requêtes SQL sans serveur à provisionner.",
            "Ingestion, cataloging and SQL queries without servers to provision.",
        ),
        "explanation": t(
            "- Athena facture au **volume scanné** : formats colonnes (Parquet, ORC), compression et **partitions** réduisent coût et temps.\n"
            "- Le **crawler Glue** déduit le schéma et alimente le catalogue partagé par Athena, EMR et Redshift Spectrum.\n"
            "- **Lake Formation** centralise des droits fins (base, table, colonne).\n"
            "- Firehose convertit au vol en Parquet et regroupe les fichiers.",
            "- Athena bills by **data scanned**: columnar formats (Parquet, ORC), compression and **partitions** cut cost and time.\n"
            "- The **Glue crawler** infers the schema and fills the catalog shared by Athena, EMR and Redshift Spectrum.\n"
            "- **Lake Formation** centralizes fine-grained rights (database, table, column).\n"
            "- Firehose converts to Parquet on the fly and batches files.",
        ),
        "code": code, "domain": "D3", "services": ["S3", "Glue", "Athena", "Lake Formation", "QuickSight"],
    }


def security_logging(lang):
    t = lambda fr, en: _t(lang, fr, en)
    code = f'''flowchart LR
  subgraph MEMBERS["{t('Comptes membres', 'Member accounts')}"]
    CTR["CloudTrail"]
    CFG["AWS Config"]
    GD["GuardDuty"]
  end
  subgraph LOGACC["{t('Compte Log Archive', 'Log Archive account')}"]
    LOGS[("{t('S3 avec Object Lock', 'S3 with Object Lock')}")]
  end
  subgraph SECACC["{t('Compte Sécurité', 'Security account')}"]
    SH["Security Hub"]
    EB["EventBridge"]
    TOPIC["{t('SNS : équipe sécurité', 'SNS: security team')}"]
  end
  CTR -->|"{t('trail d’organisation', 'organization trail')}"| LOGS
  CFG -->|"{t('historique de configuration', 'configuration history')}"| LOGS
  GD --> SH
  CFG --> SH
  SH --> EB --> TOPIC'''
    return {
        "title": t("Journalisation et détection centralisées", "Centralized logging and detection"),
        "description": t(
            "Les journaux de tous les comptes partent vers un compte isolé ; les alertes vers un compte sécurité.",
            "Logs from every account go to an isolated account; alerts go to a security account.",
        ),
        "explanation": t(
            "- Un **trail d’organisation** couvre tous les comptes et régions, y compris les futurs.\n"
            "- **Object Lock** (mode conformité) empêche toute suppression des journaux, même par root.\n"
            "- **GuardDuty** détecte les menaces ; **Security Hub** agrège les résultats et les contrôles de conformité.\n"
            "- **EventBridge** déclenche alertes ou corrections automatiques (Lambda, Systems Manager).",
            "- An **organization trail** covers every account and Region, including future ones.\n"
            "- **Object Lock** (compliance mode) prevents any log deletion, even by root.\n"
            "- **GuardDuty** detects threats; **Security Hub** aggregates findings and compliance checks.\n"
            "- **EventBridge** triggers alerts or automatic remediation (Lambda, Systems Manager).",
        ),
        "code": code, "domain": "D1", "services": ["CloudTrail", "AWS Config", "GuardDuty", "Security Hub", "EventBridge"],
    }


DIAGRAM_BUILDERS = [
    vpc_endpoints, iam_cross_account, s3_lifecycle, dr_strategies, multi_region_active,
    caching_layers, fanout_decoupling, kms_envelope, migration_transfer, auto_scaling,
    ec2_pricing, static_website, data_lake, security_logging,
]

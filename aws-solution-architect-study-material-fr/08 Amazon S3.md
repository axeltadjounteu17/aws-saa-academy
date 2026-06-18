# Partie 3 : Services de stockage

# Chapitre 8 : Amazon S3

##Présentation

Amazon Simple Storage Service (S3) constitue la base du stockage AWS, lancé en 2006 comme l'un des premiers services AWS. Il a révolutionné le stockage en fournissant un stockage d'objets illimité, durable et hautement disponible, accessible via de simples API HTTP. Aujourd'hui, S3 stocke des milliards d'objets et envoie régulièrement des millions de requêtes par seconde, servant ainsi d'épine dorsale à d'innombrables applications, lacs de données, systèmes de sauvegarde, réseaux de distribution de contenu et pipelines d'apprentissage automatique.

La simplicité du S3 masque sa sophistication. Derrière l'interface simple de « téléchargement et récupération » se cache un système puissant avec une durabilité de 11 neuf (99,999999999 %), plusieurs classes de stockage optimisées pour différents modèles d'accès, une gestion intelligente du cycle de vie, une gestion des versions pour la protection des données, des options de chiffrement, des contrôles d'accès précis, des notifications d'événements, une réplication entre régions et des capacités d'analyse. Comprendre ces fonctionnalités et savoir comment les combiner efficacement sépare l'utilisation de base de S3 des implémentations de niveau production.

Les implications financières des décisions S3 sont importantes. Choisir la mauvaise classe de stockage peut gaspiller des milliers de dollars par mois. Des politiques de cycle de vie inappropriées peuvent supprimer des données critiques ou ne pas parvenir à réduire les coûts. Ne pas utiliser les téléchargements partitionnés pour les fichiers volumineux a un impact sur les performances et la fiabilité. Les expositions publiques ont conduit à des violations massives de données. Les mauvaises configurations de réplication entre régions peuvent générer des coûts inattendus. Pourtant, avec une configuration appropriée, S3 offre un stockage incroyablement rentable : seulement 0,99 $ par To et par mois pour Glacier Deep Archive.

Ce chapitre fournit une couverture complète d'Amazon S3, des principes fondamentaux aux modèles de production. Vous apprendrez les classes de stockage et leurs cas d'utilisation optimaux, les politiques de gestion des versions et de cycle de vie, les modèles de chiffrement et de sécurité, les techniques d'optimisation des performances, les architectures basées sur les événements, la conformité et la gouvernance, ainsi que les stratégies d'optimisation des coûts. Que vous construisiez une simple solution de sauvegarde ou un lac de données à l'échelle du pétaoctet, la maîtrise de S3 est essentielle pour l'expertise AWS.

## Théorie \&Concepts

### Fondamentaux S3

**Modèle de stockage d'objets :**

S3 est un stockage d'objets, pas un stockage de fichiers ou de blocs. Les objets sont constitués de :

1. **Clé :** Identifiant unique (comme le nom de fichier avec le chemin)
2. **Valeur :** Données d'objet (0 octet à 5 To)
3. **Métadonnées :** Métadonnées système et définies par l'utilisateur
4. **ID de version :** Identifiant unique si le contrôle de version est activé
5. **Contrôle d'accès :** Autorisations pour l'objet

**Structure :**
```
Bucket: my-bucket (globally unique name)
├── Object: documents/report.pdf
│   ├── Value: [binary data]
│   ├── Metadata: content-type=application/pdf, custom-tag=finance
│   └── Version ID: abc123xyz
└── Object: images/logo.png
```
**Caractéristiques clés :**

- **Stockage illimité :** Aucune limite de capacité
- **Durabilité :** 99,999999999 % (11 9) - perdez 1 objet tous les 10 millions pendant 10 millions d'années
- **Disponibilité :** 99,9 % à 99,99 % selon la classe de stockage
- **Évolutivité :** Évolue automatiquement et gère des millions de requêtes par seconde
- **Espace de noms global :** les noms de compartiment doivent être globalement uniques
- **Service régional :** compartiments créés dans une région spécifique, les données ne quittent pas la région sauf si elles sont configurées

**S3 et systèmes de fichiers :**


| Fonctionnalité | S3 (stockage d'objets) | Système de fichiers (bloc/fichier) |
| :-- | :-- | :-- |
| **Structure** | Espace de noms plat, objets avec clés | Annuaires hiérarchiques |
| **Accès** | API HTTP/HTTPS | Opérations sur les fichiers POSIX |
| **Modification** | Objet entier remplacé | Mises à jour partielles des fichiers |
| **Performances** | Optimisé pour l'accès séquentiel | E/S aléatoires prises en charge |
| **Cohérence** | Forte cohérence | Forte cohérence |
| **Cas d'utilisation** | Sauvegardes, médias, lacs de données | Bases de données, applications |

### Classes de stockage

S3 propose plusieurs classes de stockage optimisées pour différents modèles d'accès et coûts.

**Norme S3 :**

- **Cas d'utilisation :** Données fréquemment consultées
- **Disponibilité :** 99,99 %
- **Durabilité :** 99,999999999 %
- **Durée minimale de stockage :** Aucune
- **Frais de récupération :** Aucun
- **Coût :** 0,023 $/Go/mois (us-east-1)
- **Exemple :** Contenu de site Web actif, applications mobiles

**Tiering intelligent S3 :**

- **Cas d'utilisation :** Modèles d'accès inconnus ou changeants
- **Disponibilité :** 99,9 %
- **Caractéristiques :** Déplace automatiquement les objets entre les niveaux
    - Accès fréquent : identique à la norme
    - Accès peu fréquent : 30 jours sans accès
    - Accès instantané aux archives : 90 jours sans accès
    - Accès aux archives : 90+ jours (facultatif)
    - Accès approfondi aux archives : 180+ jours (facultatif)
- **Coût :** \$0,023/Go (fréquent) + \$0,0025/1 000 surveillance d'objets
- **Frais de récupération :** Aucun pour les niveaux fréquents/peu fréquents
- **Exemple :** Contenu généré par l'utilisateur, données analytiques

**S3 Standard-IA (accès peu fréquent) :**

- **Cas d'utilisation :** Accès moins fréquent, mais accès rapide nécessaire
- **Disponibilité :** 99,9 %
- **Durée minimale de stockage :** 30 jours
- **Taille minimale de l'objet :** 128 Ko
- **Frais de récupération :** \$0,01/Go
- **Coût :** \$0,0125/Go/mois
- **Exemple :** Sauvegardes, fichiers de récupération après sinistre

**S3 One Zone-IA :**

- **Cas d'utilisation :** Accès peu fréquent, données recréables
- **Disponibilité :** 99,5 %
- **Durabilité :** 99,999999999 % (en AZ unique)
- **Durée minimale de stockage :** 30 jours
- **Risque :** Données perdues si AZ est détruit
- **Coût :** \$0,01/Go/mois
- **Exemple :** Sauvegardes secondaires, données facilement reproductibles

**Récupération instantanée du glacier S3 :**

- **Cas d'utilisation :** Archive avec accès instantané (millisecondes)
- **Disponibilité :** 99,9 %
- **Durée minimale de stockage :** 90 jours
- **Frais de récupération :** \$0,03/Go
- **Coût :** \$0,004/Go/mois
- **Exemple :** Images médicales, archives des médias d'information

**S3 Glacier Flexible Retrieval (anciennement Glacier) :**

- **Cas d'utilisation :** Archive avec récupération en quelques minutes ou quelques heures
- **Disponibilité :** 99,99 %
- **Durée minimale de stockage :** 90 jours
- **Options de récupération :**
    - Expédié : 1 à 5 minutes, \$0,03/Go
    - Standard : 3 à 5 heures, \$0,01/Go
    - En vrac : 5 à 12 heures, \$0,0025/Go
- **Coût :** \$0,0036/Go/mois
- **Exemple :** Archives réglementaires, sauvegardes à long terme

**Archives profondes S3 Glacier :**

- **Cas d'utilisation :** Archive à long terme, coût le plus bas
- **Disponibilité :** 99,99 %
- **Durée minimale de stockage :** 180 jours
- **Options de récupération :**
    - Standard : 12 heures, \$0,02/Go
    - En vrac : 48 heures, \$0,0025/Go
- **Coût :** 0,00099 $/Go/mois (~\$1/To/mois)
- **Exemple :** Archives de conformité (conservation de 7 à 10 ans)

**Comparaison des classes de stockage :**


| Classe | \$/Go/Mois | Frais de récupération | Durée minimale | Cas d'utilisation |
| :-- | :-- | :-- | :-- | :-- |
| Norme | \$0,023 | Aucun | Aucun | Données chaudes |
| Hiérarchisation intelligente | \$0,023* | Aucun* | Aucun | Modèles inconnus |
| Norme-IA | \$0,0125 | \$0,01/Go | 30 jours | Données sympas |
| Une Zone-IA | \$0,01 | \$0,01/Go | 30 jours | Cool recréable |
| Glacier instantané | \$0,004 | \$0,03/Go | 90 jours | Archiver instantanément |
| Glacier flexible | \$0,0036 | \$0,01/Go | 90 jours | Horaires d'archivage |
| Archives profondes des glaciers | \$0,00099 | \$0,02/Go | 180 jours | Journées des archives |

*Les frais de hiérarchisation intelligente varient selon le niveau auquel vous accédez

### Gestion des versions

La gestion des versions préserve, récupère et restaure chaque version de chaque objet.

**États :**

- **Non versionné (par défaut) :** Les objets ont un ID de version nul
- **Gestion de versions activée :** Nouvelles versions créées lors de la mise à jour
- **Versioning-suspended :** Aucune nouvelle version, mais les versions existantes sont préservées

**Comment ça marche :**
```
Upload report.pdf → Version ID: v1 (latest)
Upload report.pdf → Version ID: v2 (latest), v1 (older)
Upload report.pdf → Version ID: v3 (latest), v2, v1 (older)
Delete report.pdf → Version ID: delete marker (latest), v3, v2, v1 still exist
```
**Gestion des versions :**
```bash
# Enable versioning
aws s3api put-bucket-versioning \
    --bucket my-bucket \
    --versioning-configuration Status=Enabled

# List versions
aws s3api list-object-versions \
    --bucket my-bucket \
    --prefix documents/

# Get specific version
aws s3api get-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id abc123xyz \
    output.pdf

# Delete specific version (permanent)
aws s3api delete-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id abc123xyz

# Delete (creates delete marker)
aws s3 rm s3://my-bucket/documents/report.pdf

# Restore (delete the delete marker)
aws s3api delete-object \
    --bucket my-bucket \
    --key documents/report.pdf \
    --version-id <delete-marker-id>
```
**Avantages du contrôle de version :**

- Protéger contre la suppression accidentelle
- Récupération des échecs d'application
- Archiver les versions précédentes
- Répondre aux exigences de conformité

**Considérations relatives aux versions :**

- Les coûts de stockage se multiplient (chaque version stockée)
- Les politiques de cycle de vie peuvent gérer les anciennes versions
- Impossible de désactiver une fois activé (suspendre uniquement)


### Politiques de cycle de vie

Automatisez la transition des objets entre les classes de stockage ou leur suppression.

**Actions de cycle de vie :**

1. **Actions de transition :** Passez à une classe de stockage moins chère
2. **Actions d'expiration :** Supprimer des objets

**Exemple de politique :**
```json
{
  "Rules": [
    {
      "Id": "Archive old logs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "Delete incomplete multipart uploads",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "Id": "Clean old versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```
**Contraintes du cycle de vie :**


| De la classe | En classe | Jours minimum |
| :-- | :-- | :-- |
| Norme | Norme-IA | 30 |
| Norme | Hiérarchisation intelligente | 0 |
| Norme | Glacier instantané | 0 |
| Norme-IA | Glacier flexible | 30 |
| Glacier instantané | Archives profondes des glaciers | 90 |

**Transition impossible :**

- De n'importe quelle classe au Standard
- Objets inférieurs à 128 Ko vers les classes IA (sauf Intelligent-Tiering)


### Cryptage

S3 propose plusieurs options de chiffrement pour les données au repos et en transit.

**Chiffrement au repos :**

**1. Chiffrement côté serveur (SSE) :**

**SSE-S3 (par défaut) :**

- Clés gérées par S3
- Cryptage AES-256
- Gratuit
- Activé par défaut pour les nouveaux buckets
```bash
# Upload with SSE-S3
aws s3 cp file.txt s3://my-bucket/ \
    --server-side-encryption AES256
```
**SSE-KMS :**

- Clés gérées par AWS KMS
- Piste d'audit dans CloudTrail
- Rotation des clés
- Coût : appels d'API KMS (~\$0,03 pour 10 000 requêtes)
```bash
# Upload with SSE-KMS
aws s3 cp file.txt s3://my-bucket/ \
    --server-side-encryption aws:kms \
    --ssekms-key-id arn:aws:kms:us-east-1:123456789012:key/abc-123
```
**SSE-C (clés fournies par le client) :**

- Vous gérez les clés de chiffrement
- Vous fournissez la clé à chaque demande
- Clé non stockée par AWS
```bash
# Upload with SSE-C
aws s3api put-object \
    --bucket my-bucket \
    --key file.txt \
    --body file.txt \
    --sse-customer-algorithm AES256 \
    --sse-customer-key base64-encoded-key
```
**2. Chiffrement côté client :**

- Crypter avant de télécharger
- Décrypter après le téléchargement
- Vous gérez tout

**Cryptage en transit :**

- HTTPS appliqué via la politique de compartiment
- TLS 1.2+ pris en charge

**Comparaison de chiffrement :**


| Méthode | Gestion des clés | Vérification | Coût | Cas d'utilisation |
| :-- | :-- | :-- | :-- | :-- |
| SSE-S3 | AWS | Non | Gratuit | Par défaut, simple |
| SSE-KMS | AWSKMS | CloudTrail | Appels API | Conformité, audit |
| ESS-C | Client | Non | Gratuit | Contrôle total |
| Côté client | Client | Non | Gratuit | Contrôle complet |

### Contrôle d'accès S3

Plusieurs mécanismes contrôlent l'accès aux ressources S3.

**1. Politiques IAM :**
Contrôlez ce que les utilisateurs/rôles AWS peuvent faire.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/uploads/*"
    }
  ]
}
```
**2. Politiques de compartiment :**
Contrôlez l’accès à l’ensemble du bucket ou des objets.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-public-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```
**3. Listes de contrôle d'accès (ACL) :**
Mécanisme hérité (AWS recommande d'utiliser des stratégies à la place).

**4. Bloquer l'accès public :**
Paramètres au niveau du compte/du compartiment pour empêcher toute exposition publique.
```bash
# Enable block public access (recommended for all buckets)
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true
```
**5. Points d'accès :**
Simplifiez la gestion de l’accès aux ensembles de données partagés.
```bash
# Create access point
aws s3control create-access-point \
    --account-id 123456789012 \
    --name finance-ap \
    --bucket my-data-lake \
    --vpc-configuration VpcId=vpc-12345678
```
**Ordre d'évaluation d'accès :**
```
1. Check Block Public Access settings
2. Evaluate IAM policies (user/role)
3. Evaluate bucket policies
4. Evaluate ACLs
5. Evaluate Access Point policies

Result: Union of all ALLOW, any DENY wins
```
### Performances S3

**Performances du taux de demande :**

- **Partitionnement basé sur le préfixe :** 3 500 requêtes PUT/COPY/POST/DELETE et 5 500 GET/HEAD par seconde et par préfixe
- **Préfixes multiples :** Évolutif linéairement
```
Example:
my-bucket/prefix1/  → 5,500 GET/s
my-bucket/prefix2/  → 5,500 GET/s
my-bucket/prefix3/  → 5,500 GET/s
Total: 16,500 GET/s
```
**Téléchargement en plusieurs parties :**

Pour les objets > 100 Mo, utilisez le téléchargement partitionné :

- Télécharger des pièces en parallèle
- Améliore le débit
- Récupération rapide des pannes de réseau
- Requis pour les objets > 5 Go
```python
import boto3
from boto3.s3.transfer import TransferConfig

s3 = boto3.client('s3')

# Configure multipart thresholds
config = TransferConfig(
    multipart_threshold=1024 * 25,  # 25 MB
    max_concurrency=10,
    multipart_chunksize=1024 * 25,
    use_threads=True
)

# Upload with multipart
s3.upload_file(
    'large-file.zip',
    'my-bucket',
    'uploads/large-file.zip',
    Config=config
)
```
**Accélération de transfert :**

Activez des chargements/téléchargements plus rapides via les emplacements périphériques CloudFront.
```bash
# Enable transfer acceleration
aws s3api put-bucket-accelerate-configuration \
    --bucket my-bucket \
    --accelerate-configuration Status=Enabled

# Upload using acceleration endpoint
aws s3 cp file.txt s3://my-bucket/ \
    --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com
```
**Optimisation des performances :**


| Techniques | Cas d'utilisation | Gain de performances |
| :-- | :-- | :-- |
| Téléchargement en plusieurs parties | Objets > 100 Mo | Débit 10x+ |
| Accélération des transferts | Téléchargements mondiaux | 50 à 500 % plus rapide |
| CloudFront | Lectures fréquentes | <50 ms au niveau mondial |
| S3 Sélectionner | Requête CSV/JSON | Réduction des coûts de 80 % |
| Récupération de plage d'octets | Fichiers volumineux | Téléchargements parallèles |

### Notifications d'événements S3

Déclenchez des actions lorsque des objets sont créés, modifiés ou supprimés.

**Destinations prises en charge :**

- Sujets SNS
- Files d'attente SQS
- Fonctions Lambda
- EventBridge (recommandé pour le filtrage avancé)

**Types d'événements :**

- `s3:ObjectCreated:*` (Put, Post, Copy, CompleteMultipartUpload)
- `s3:ObjectRemoved:*` (Supprimer, SupprimerMarkerCreated)
- `s3:ObjectRestore:*` (restauration du glacier lancée/terminée)
- `s3:Réplication :*`
- `s3 : LifecycleTransition`

**Exemple de configuration :**
```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:process-image",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "images/"},
            {"Name": "suffix", "Value": ".jpg"}
          ]
        }
      }
    }
  ]
}
```
**Intégration EventBridge (recommandée) :**

Filtrage plus puissant et destinations multiples :
```json
{
  "detail-type": ["Object Created"],
  "source": ["aws.s3"],
  "detail": {
    "bucket": {
      "name": ["my-bucket"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }],
      "size": [{
        "numeric": [">", 1048576]
      }]
    }
  }
}
```
### Réplication S3

Répliquez automatiquement les objets dans des compartiments (régions identiques ou différentes).

**Types de réplication :**

**1. Réplication inter-régions (CRR) :**

- Différentes régions AWS
- Cas d'utilisation : conformité, reprise après sinistre, réduction de la latence

**2. Réplication dans la même région (SRR) :**

- Même région AWS
- Cas d'utilisation : agrégation de journaux, réplication en direct entre comptes

**Exigences :**

- Gestion des versions activée sur les deux buckets
- Rôle IAM avec autorisations de réplication
- En option : S3 RTC (Replication Time Control) pour une réplication à 99,99 % en 15 minutes

**Configuration de la réplication :**
```json
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {
        "Prefix": "documents/"
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::destination-bucket",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {
            "Minutes": 15
          }
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": {
            "Minutes": 15
          }
        }
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      }
    }
  ]
}
```
**Ce qui est répliqué :**

- Nouveaux objets après activation de la réplication
- Métadonnées et ACL
- Balises d'objet
- En option : supprimer des marqueurs, des objets existants (réplication par lots S3)

**Ce qui n'est pas répliqué :**

- Objets avant réplication activés (sauf si vous utilisez la réplication par lots)
- Chiffrement côté serveur avec SSE-C
- Objets dans Glacier/Deep Archive


## Implémentation pratique

### Atelier 1 : Création et configuration de compartiments S3

**Objectif :** Créer un compartiment S3 prêt pour la production avec des politiques de sécurité et de cycle de vie.

#### Étape 1 : Créer un bucket avec des paramètres de sécurité
```bash
# Create bucket
aws s3api create-bucket \
    --bucket my-production-bucket-$(date +%s) \
    --region us-east-1 \
    --object-ownership BucketOwnerEnforced

BUCKET_NAME="my-production-bucket-1234567890"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Enable default encryption (SSE-S3)
aws s3api put-bucket-encryption \
    --bucket $BUCKET_NAME \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }]
    }'

# Block all public access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# Enable logging
aws s3api put-bucket-logging \
    --bucket $BUCKET_NAME \
    --bucket-logging-status '{
      "LoggingEnabled": {
        "TargetBucket": "my-logs-bucket",
        "TargetPrefix": "s3-access-logs/"
      }
    }'

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Add tags
aws s3api put-bucket-tagging \
    --bucket $BUCKET_NAME \
    --tagging 'TagSet=[
      {Key=Environment,Value=Production},
      {Key=CostCenter,Value=Engineering},
      {Key=DataClassification,Value=Confidential}
    ]'
```
#### Étape 2 : Configurer la stratégie de cycle de vie
```bash
cat > lifecycle-policy.json <<'EOF'
{
  "Rules": [
    {
      "Id": "Transition-Archive-Delete",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "data/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "INTELLIGENT_TIERING"
        },
        {
          "Days": 365,
          "StorageClass": "GLACIER_IR"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "Delete-Old-Versions",
      "Status": "Enabled",
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "NoncurrentDays": 90,
          "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 180
      }
    },
    {
      "Id": "Cleanup-Incomplete-Multipart",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    },
    {
      "Id": "Delete-Expired-DeleteMarkers",
      "Status": "Enabled",
      "Expiration": {
        "ExpiredObjectDeleteMarker": true
      }
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration file://lifecycle-policy.json
```
#### Étape 3 : Configurer la stratégie de compartiment
```bash
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceSSLOnly",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "AllowApplicationAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/MyApplicationRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json
```
### Lab 2 : Hébergement de sites Web statiques

**Objectif :** Hébergez un site Web statique sur S3 avec CloudFront CDN.
```bash
# Create bucket for website
WEBSITE_BUCKET="my-website-$(date +%s)"

aws s3api create-bucket \
    --bucket $WEBSITE_BUCKET \
    --region us-east-1

# Enable static website hosting
aws s3api put-bucket-website \
    --bucket $WEBSITE_BUCKET \
    --website-configuration '{
      "IndexDocument": {"Suffix": "index.html"},
      "ErrorDocument": {"Key": "error.html"}
    }'

# Create sample website files
cat > index.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My S3 Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to My S3 Website</h1>
    <p>This is hosted on Amazon S3</p>
    <script src="app.js"></script>
</body>
</html>
EOF

cat > error.html <<'EOF'
<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
</body>
</html>
EOF

# Upload files
aws s3 sync . s3://$WEBSITE_BUCKET/ \
    --exclude "*" \
    --include "*.html" \
    --include "*.css" \
    --include "*.js" \
    --cache-control "max-age=3600"

# Make bucket publicly readable
cat > website-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$WEBSITE_BUCKET/*"
  }]
}
EOF

# Disable block public access for website
aws s3api put-public-access-block \
    --bucket $WEBSITE_BUCKET \
    --public-access-block-configuration \
        BlockPublicAcls=false,\
        IgnorePublicAcls=false,\
        BlockPublicPolicy=false,\
        RestrictPublicBuckets=false

aws s3api put-bucket-policy \
    --bucket $WEBSITE_BUCKET \
    --policy file://website-policy.json

# Get website endpoint
echo "Website URL: http://$WEBSITE_BUCKET.s3-website-us-east-1.amazonaws.com"

# Create CloudFront distribution for HTTPS and better performance
aws cloudfront create-distribution \
    --origin-domain-name $WEBSITE_BUCKET.s3-website-us-east-1.amazonaws.com \
    --default-root-object index.html
```
### Lab 3 : Opérations par lots S3

**Objectif :** Traitez des millions d'objets à l'aide des opérations par lots S3.
```python
# create_batch_job.py
import boto3
import json

s3control = boto3.client('s3control')
s3 = boto3.client('s3')

def create_inventory():
    """
    Create S3 inventory to list all objects
    Required for batch operations
    """
    
    bucket = 'my-source-bucket'
    inventory_bucket = 'my-inventory-bucket'
    
    inventory_config = {
        'Destination': {
            'S3BucketDestination': {
                'AccountId': '123456789012',
                'Bucket': f'arn:aws:s3:::{inventory_bucket}',
                'Format': 'CSV',
                'Prefix': 'inventory'
            }
        },
        'IsEnabled': True,
        'Id': 'EntireBucketInventory',
        'IncludedObjectVersions': 'Current',
        'OptionalFields': [
            'Size', 'LastModifiedDate', 'StorageClass',
            'ETag', 'IsMultipartUploaded', 'ReplicationStatus'
        ],
        'Schedule': {
            'Frequency': 'Daily'
        }
    }
    
    s3.put_bucket_inventory_configuration(
        Bucket=bucket,
        Id='EntireBucketInventory',
        InventoryConfiguration=inventory_config
    )
    
    print("Inventory configuration created. First report available in 24-48 hours.")

def create_batch_copy_job(manifest_location):
    """
    Create batch job to copy objects to different storage class
    """
    
    account_id = '123456789012'
    role_arn = 'arn:aws:iam::123456789012:role/S3BatchOperationsRole'
    
    response = s3control.create_job(
        AccountId=account_id,
        ConfirmationRequired=False,
        Operation={
            'S3PutObjectCopy': {
                'TargetResource': 'arn:aws:s3:::destination-bucket',
                'StorageClass': 'GLACIER_IR',
                'MetadataDirective': 'COPY',
                'TargetKeyPrefix': 'archived/'
            }
        },
        Report={
            'Bucket': 'arn:aws:s3:::my-reports-bucket',
            'Format': 'Report_CSV_20180820',
            'Enabled': True,
            'Prefix': 'batch-reports',
            'ReportScope': 'AllTasks'
        },
        Manifest={
            'Spec': {
                'Format': 'S3InventoryReport_CSV_20161130',
                'Fields': ['Bucket', 'Key']
            },
            'Location': {
                'ObjectArn': manifest_location,
                'ETag': 'manifest-etag'
            }
        },
        Priority=10,
        RoleArn=role_arn,
        Tags=[
            {'Key': 'Project', 'Value': 'DataArchival'},
            {'Key': 'Environment', 'Value': 'Production'}
        ]
    )
    
    job_id = response['JobId']
    print(f"Batch job created: {job_id}")
    
    return job_id

def create_batch_tagging_job(manifest_location):
    """
    Create batch job to add tags to millions of objects
    """
    
    account_id = '123456789012'
    role_arn = 'arn:aws:iam::123456789012:role/S3BatchOperationsRole'
    
    response = s3control.create_job(
        AccountId=account_id,
        ConfirmationRequired=True,  # Require confirmation before running
        Operation={
            'S3PutObjectTagging': {
                'TagSet': [
                    {'Key': 'Project', 'Value': 'DataLake'},
                    {'Key': 'Classification', 'Value': 'Internal'},
                    {'Key': 'RetentionPolicy', 'Value': '7years'}
                ]
            }
        },
        Report={
            'Bucket': 'arn:aws:s3:::my-reports-bucket',
            'Format': 'Report_CSV_20180820',
            'Enabled': True,
            'Prefix': 'tagging-reports'
        },
        Manifest={
            'Spec': {
                'Format': 'S3BatchOperations_CSV_20180820',
                'Fields': ['Bucket', 'Key']
            },
            'Location': {
                'ObjectArn': manifest_location,
                'ETag': 'manifest-etag'
            }
        },
        Priority=5,
        RoleArn=role_arn
    )
    
    return response['JobId']

# Monitor batch job
def monitor_job(job_id):
    """Monitor batch job progress"""
    
    account_id = '123456789012'
    
    response = s3control.describe_job(
        AccountId=account_id,
        JobId=job_id
    )
    
    job = response['Job']
    
    print(f"Job Status: {job['Status']}")
    print(f"Progress: {job['ProgressSummary']}")
    
    return job['Status']
```
## Connaissances au niveau de la production

### Architecture de lac de données sur S3

**Structure moderne du lac de données :**
```
s3://my-data-lake/
├── raw/                          # Landing zone
│   ├── year=2025/
│   │   ├── month=01/
│   │   │   └── day=15/
│   │   │       └── data.parquet
├── processed/                    # Cleaned/transformed
│   ├── customer_data/
│   │   └── partition_date=2025-01-15/
│   │       └── customers.parquet
├── curated/                      # Business-ready
│   ├── analytics/
│   │   └── monthly_reports/
└── archive/                      # Long-term retention
    └── year=2023/
```
**Meilleures pratiques en matière de lac de données :**
```python
# data_lake_manager.py
import boto3
from datetime import datetime
import pyarrow.parquet as pq
import pandas as pd

class DataLakeManager:
    def __init__(self, bucket_name):
        self.s3 = boto3.client('s3')
        self.bucket = bucket_name
    
    def write_partitioned_data(self, df, dataset_name, partition_cols):
        """
        Write DataFrame to S3 with Hive-style partitioning
        Optimized for query performance with Athena/Spark
        """
        
        # Add timestamp if not present
        if 'ingestion_timestamp' not in df.columns:
            df['ingestion_timestamp'] = datetime.utcnow()
        
        # Group by partition columns
        for partition_values, group_df in df.groupby(partition_cols):
            # Build partition path
            partition_path = '/'.join([
                f"{col}={val}" 
                for col, val in zip(partition_cols, partition_values)
            ])
            
            # Convert to Parquet (columnar format for analytics)
            s3_key = f"processed/{dataset_name}/{partition_path}/data.parquet"
            
            # Write to S3
            parquet_buffer = group_df.to_parquet(
                engine='pyarrow',
                compression='snappy',
                index=False
            )
            
            self.s3.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=parquet_buffer,
                StorageClass='INTELLIGENT_TIERING',
                ServerSideEncryption='AES256',
                Metadata={
                    'row_count': str(len(group_df)),
                    'schema_version': '1.0',
                    'created_by': 'data-pipeline'
                }
            )
            
            print(f"Written {len(group_df)} rows to {s3_key}")
    
    def setup_data_lake_governance(self):
        """
        Configure governance policies for data lake
        """
        
        # 1. Set up bucket policies
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "RawDataWriteOnly",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/DataIngestionRole"
                    },
                    "Action": ["s3:PutObject"],
                    "Resource": f"arn:aws:s3:::{self.bucket}/raw/*"
                },
                {
                    "Sid": "ProcessedDataReadWrite",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/DataProcessingRole"
                    },
                    "Action": ["s3:GetObject", "s3:PutObject"],
                    "Resource": f"arn:aws:s3:::{self.bucket}/processed/*"
                },
                {
                    "Sid": "CuratedDataReadOnly",
                    "Effect": "Allow",
                    "Principal": {
                        "AWS": "arn:aws:iam::123456789012:role/AnalystRole"
                    },
                    "Action": ["s3:GetObject", "s3:ListBucket"],
                    "Resource": [
                        f"arn:aws:s3:::{self.bucket}/curated/*",
                        f"arn:aws:s3:::{self.bucket}"
                    ]
                }
            ]
        }
        
        # 2. Enable inventory for large-scale operations
        inventory_config = {
            'Destination': {
                'S3BucketDestination': {
                    'AccountId': '123456789012',
                    'Bucket': f'arn:aws:s3:::my-inventory-bucket',
                    'Format': 'Parquet',
                    'Prefix': 'inventory/'
                }
            },
            'IsEnabled': True,
            'Id': 'DataLakeInventory',
            'IncludedObjectVersions': 'Current',
            'OptionalFields': [
                'Size', 'LastModifiedDate', 'StorageClass',
                'IntelligentTieringAccessTier'
            ],
            'Schedule': {'Frequency': 'Daily'}
        }
        
        # 3. Configure object tagging for classification
        lifecycle_policy = {
            "Rules": [
                {
                    "Id": "TransitionRawData",
                    "Status": "Enabled",
                    "Filter": {"Prefix": "raw/"},
                    "Transitions": [
                        {"Days": 30, "StorageClass": "STANDARD_IA"},
                        {"Days": 90, "StorageClass": "GLACIER_IR"}
                    ]
                },
                {
                    "Id": "ArchiveOldReports",
                    "Status": "Enabled",
                    "Filter": {"Prefix": "curated/"},
                    "Transitions": [
                        {"Days": 365, "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"}
                    ]
                }
            ]
        }
        
        return {
            'bucket_policy': bucket_policy,
            'inventory_config': inventory_config,
            'lifecycle_policy': lifecycle_policy
        }

# Usage
manager = DataLakeManager('my-data-lake-bucket')

# Ingest data with partitioning
customer_df = pd.read_csv('customers.csv')
customer_df['date'] = pd.to_datetime(customer_df['created_at']).dt.date

manager.write_partitioned_data(
    customer_df,
    dataset_name='customers',
    partition_cols=['date']
)
```
**Intégration Athena pour les requêtes :**
```sql
-- Create external table pointing to S3 data lake
CREATE EXTERNAL TABLE IF NOT EXISTS customers (
    customer_id STRING,
    name STRING,
    email STRING,
    created_at TIMESTAMP
)
PARTITIONED BY (date DATE)
STORED AS PARQUET
LOCATION 's3://my-data-lake/processed/customers/'
TBLPROPERTIES ('parquet.compression'='SNAPPY');

-- Add partitions (or use MSCK REPAIR TABLE)
ALTER TABLE customers ADD PARTITION (date='2025-01-15')
LOCATION 's3://my-data-lake/processed/customers/date=2025-01-15/';

-- Query data efficiently
SELECT 
    date,
    COUNT(*) as customer_count,
    COUNT(DISTINCT email) as unique_emails
FROM customers
WHERE date BETWEEN DATE '2025-01-01' AND DATE '2025-01-31'
GROUP BY date
ORDER BY date;
```
### Sécurité et conformité avancées

**Verrouillage d'objet S3 (WORM - écriture une fois, lecture multiple) :**

Empêche la suppression ou la modification d'objets pour des raisons de conformité (SEC 17a-4, FINRA, etc.).
```bash
# Enable Object Lock (must be done at bucket creation)
aws s3api create-bucket \
    --bucket compliance-bucket \
    --region us-east-1 \
    --object-lock-enabled-for-bucket

# Configure default retention
aws s3api put-object-lock-configuration \
    --bucket compliance-bucket \
    --object-lock-configuration '{
      "ObjectLockEnabled": "Enabled",
      "Rule": {
        "DefaultRetention": {
          "Mode": "GOVERNANCE",
          "Days": 365
        }
      }
    }'

# Upload object with legal hold
aws s3api put-object \
    --bucket compliance-bucket \
    --key critical-record.pdf \
    --body record.pdf \
    --object-lock-mode COMPLIANCE \
    --object-lock-retain-until-date 2030-01-01T00:00:00Z \
    --object-lock-legal-hold-status ON
```
**Modes de verrouillage d'objet :**


| Mode | Descriptif | Peut remplacer |
| :-- | :-- | :-- |
| **GOUVERNANCE** | Peut être remplacé avec autorisation | Oui (avec autorisation de contournement) |
| **CONFORMITÉ** | Ne peut être annulé par personne | Non (même pas l'utilisateur root) |
| **Conservation légale** | Empêche la suppression jusqu'à ce qu'elle soit supprimée | Oui (avec autorisation) |

**Analyseur d'accès S3 :**
```python
# access_analyzer.py
import boto3

def analyze_bucket_access():
    """
    Use Access Analyzer to find buckets with external access
    """
    
    access_analyzer = boto3.client('accessanalyzer')
    s3 = boto3.client('s3')
    
    # Get analyzer findings
    response = access_analyzer.list_findings(
        analyzerArn='arn:aws:access-analyzer:us-east-1:123456789012:analyzer/ConsoleAnalyzer',
        filter={
            'resourceType': {'eq': ['AWS::S3::Bucket']},
            'status': {'eq': ['ACTIVE']}
        }
    )
    
    public_buckets = []
    
    for finding in response['findings']:
        bucket_name = finding['resource'].split(':')[-1]
        
        # Get bucket policy
        try:
            policy = s3.get_bucket_policy(Bucket=bucket_name)
            
            finding_details = {
                'bucket': bucket_name,
                'principal': finding.get('principal', {}),
                'action': finding.get('action', []),
                'condition': finding.get('condition', {}),
                'risk': 'HIGH' if finding['principal'].get('AWS') == '*' else 'MEDIUM'
            }
            
            public_buckets.append(finding_details)
            
        except:
            pass
    
    return public_buckets

# Generate report
findings = analyze_bucket_access()
print(f"Found {len(findings)} buckets with external access")

for finding in findings:
    print(f"\nBucket: {finding['bucket']}")
    print(f"Risk Level: {finding['risk']}")
    print(f"Principal: {finding['principal']}")
    print(f"Actions: {finding['action']}")
```
### Optimisation des performances S3

**Optimisation du taux de demande :**
```python
# high_throughput_s3.py
import boto3
from concurrent.futures import ThreadPoolExecutor
import hashlib

def upload_high_throughput(files, bucket_name, max_workers=50):
    """
    Upload thousands of files with optimal performance
    Uses prefix sharding for even distribution
    """
    
    s3 = boto3.client('s3')
    
    def upload_file_with_prefix(file_path):
        # Generate hash-based prefix for even distribution
        file_hash = hashlib.md5(file_path.encode()).hexdigest()
        prefix = file_hash[:4]  # First 4 chars of hash
        
        # Upload with sharded key
        key = f"{prefix}/{file_path}"
        
        s3.upload_file(
            file_path,
            bucket_name,
            key,
            ExtraArgs={
                'StorageClass': 'INTELLIGENT_TIERING',
                'Metadata': {'original_name': file_path}
            }
        )
        
        return key
    
    # Parallel uploads
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(upload_file_with_prefix, files))
    
    return results

# With prefix sharding:
# aef3/file1.jpg  → Distributed across S3 partitions
# b2c7/file2.jpg  → Different partition
# f891/file3.jpg  → Another partition
# 
# Result: 3,500 PUT/s per prefix × multiple prefixes = high aggregate throughput
```
**S3 Sélection et Glacier Sélection :**

Interrogez des objets sans récupérer l’objet entier.
```python
# s3_select.py
import boto3

def query_csv_with_s3_select(bucket, key):
    """
    Query CSV file in S3 without downloading entire file
    Saves bandwidth and costs
    """
    
    s3 = boto3.client('s3')
    
    response = s3.select_object_content(
        Bucket=bucket,
        Key=key,
        ExpressionType='SQL',
        Expression="""
            SELECT customer_id, total_amount 
            FROM s3object s 
            WHERE total_amount > 1000
            LIMIT 100
        """,
        InputSerialization={
            'CSV': {
                'FileHeaderInfo': 'USE',
                'RecordDelimiter': '\n',
                'FieldDelimiter': ','
            },
            'CompressionType': 'GZIP'
        },
        OutputSerialization={
            'JSON': {'RecordDelimiter': '\n'}
        }
    )
    
    # Stream results
    results = []
    for event in response['Payload']:
        if 'Records' in event:
            records = event['Records']['Payload'].decode('utf-8')
            results.append(records)
    
    return ''.join(results)

# Example: Query 1 GB CSV file
# Without S3 Select: Download 1 GB, process locally
# With S3 Select: Scan 1 GB server-side, return only matching rows (e.g., 10 MB)
# Cost savings: 80%+ reduction in data transfer
```
**Récupération de plage d'octets pour les téléchargements parallèles :**
```python
# parallel_download.py
import boto3
from concurrent.futures import ThreadPoolExecutor

def download_large_file_parallel(bucket, key, output_path, num_threads=10):
    """
    Download large file using byte-range fetches
    10x+ faster than single-threaded download
    """
    
    s3 = boto3.client('s3')
    
    # Get object size
    head = s3.head_object(Bucket=bucket, Key=key)
    file_size = head['ContentLength']
    
    # Calculate chunk size
    chunk_size = file_size // num_threads
    
    def download_chunk(chunk_num):
        start = chunk_num * chunk_size
        end = start + chunk_size - 1 if chunk_num < num_threads - 1 else file_size - 1
        
        response = s3.get_object(
            Bucket=bucket,
            Key=key,
            Range=f'bytes={start}-{end}'
        )
        
        return chunk_num, response['Body'].read()
    
    # Download chunks in parallel
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        chunks = list(executor.map(download_chunk, range(num_threads)))
    
    # Reassemble file
    chunks.sort(key=lambda x: x[0])
    
    with open(output_path, 'wb') as f:
        for _, chunk_data in chunks:
            f.write(chunk_data)
    
    print(f"Downloaded {file_size / (1024**2):.2f} MB to {output_path}")

# Download 1 GB file
# Single thread: ~2 minutes
# 10 parallel threads: ~15 seconds
```
### Stratégies d'optimisation des coûts

**Objectif de stockage S3 :**

Visibilité à l’échelle de l’organisation sur l’utilisation du stockage et les opportunités d’optimisation.
```python
# storage_lens_analysis.py
import boto3
import json

def analyze_storage_lens_metrics():
    """
    Analyze S3 Storage Lens metrics for cost optimization
    """
    
    s3control = boto3.client('s3control')
    
    account_id = '123456789012'
    
    # Get Storage Lens configuration
    config = s3control.get_storage_lens_configuration(
        ConfigId='default-account-dashboard',
        AccountId=account_id
    )
    
    # Common optimization opportunities identified:
    opportunities = {
        'incomplete_multipart_uploads': {
            'description': 'Incomplete multipart uploads consuming storage',
            'action': 'Configure lifecycle policy to abort after 7 days',
            'potential_savings': 'Varies by volume'
        },
        'noncurrent_versions': {
            'description': 'Old object versions consuming storage',
            'action': 'Expire noncurrent versions after 90 days',
            'potential_savings': '30-50% reduction'
        },
        'standard_storage_with_low_access': {
            'description': 'Objects in Standard with no recent access',
            'action': 'Use Intelligent-Tiering or transition to IA',
            'potential_savings': '40-60% on untouched objects'
        },
        'glacier_retrievals': {
            'description': 'Frequent Glacier retrievals costing money',
            'action': 'Move to Glacier Instant Retrieval',
            'potential_savings': 'Reduce retrieval costs 80%'
        }
    }
    
    return opportunities

def generate_cost_optimization_report(bucket_name):
    """
    Generate detailed cost optimization recommendations
    """
    
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')
    
    # Analyze storage by class
    paginator = s3.get_paginator('list_objects_v2')
    
    storage_by_class = {}
    total_size = 0
    
    for page in paginator.paginate(Bucket=bucket_name):
        if 'Contents' not in page:
            continue
        
        for obj in page['Contents']:
            storage_class = obj.get('StorageClass', 'STANDARD')
            size = obj['Size']
            
            storage_by_class[storage_class] = storage_by_class.get(storage_class, 0) + size
            total_size += size
    
    # Calculate current costs
    pricing = {
        'STANDARD': 0.023,
        'STANDARD_IA': 0.0125,
        'INTELLIGENT_TIERING': 0.023,  # Simplified
        'GLACIER_IR': 0.004,
        'GLACIER': 0.0036,
        'DEEP_ARCHIVE': 0.00099
    }
    
    current_cost = sum(
        (size / (1024**3)) * pricing.get(sc, 0.023)
        for sc, size in storage_by_class.items()
    )
    
    # Estimate optimized costs (assuming 50% can move to cheaper tiers)
    optimized_cost = current_cost * 0.5
    
    report = {
        'bucket': bucket_name,
        'total_size_gb': total_size / (1024**3),
        'storage_by_class': {
            sc: size / (1024**3) 
            for sc, size in storage_by_class.items()
        },
        'current_monthly_cost': round(current_cost, 2),
        'optimized_monthly_cost': round(optimized_cost, 2),
        'potential_savings': round(current_cost - optimized_cost, 2),
        'recommendations': [
            'Enable Intelligent-Tiering for unpredictable access patterns',
            'Configure lifecycle policies to transition old data',
            'Delete incomplete multipart uploads',
            'Expire noncurrent versions after 90 days'
        ]
    }
    
    return report

# Generate report
report = generate_cost_optimization_report('my-bucket')
print(json.dumps(report, indent=2))
```
**Analyse de hiérarchisation intelligente :**
```python
# intelligent_tiering_roi.py

def calculate_intelligent_tiering_roi(bucket_analysis):
    """
    Calculate ROI for enabling Intelligent-Tiering
    
    Intelligent-Tiering costs:
    - Storage: Same as Standard for Frequent Access tier
    - Monitoring: $0.0025 per 1,000 objects
    - Automatic savings: Moves to IA tier after 30 days (46% savings)
    """
    
    total_objects = bucket_analysis['object_count']
    avg_size_gb = bucket_analysis['total_size_gb']
    access_pattern = bucket_analysis['access_pattern']  # % accessed in last 30 days
    
    # Current cost (all in Standard)
    standard_cost = avg_size_gb * 0.023
    
    # Intelligent-Tiering cost
    monitoring_cost = (total_objects / 1000) * 0.0025
    
    # Estimate distribution across tiers
    frequent_pct = access_pattern  # Recently accessed
    infrequent_pct = 1 - frequent_pct  # Not accessed in 30 days
    
    storage_cost = (
        (avg_size_gb * frequent_pct * 0.023) +  # Frequent tier
        (avg_size_gb * infrequent_pct * 0.0125)  # Infrequent tier
    )
    
    intelligent_tiering_cost = storage_cost + monitoring_cost
    
    monthly_savings = standard_cost - intelligent_tiering_cost
    annual_savings = monthly_savings * 12
    
    return {
        'current_cost': round(standard_cost, 2),
        'intelligent_tiering_cost': round(intelligent_tiering_cost, 2),
        'monthly_savings': round(monthly_savings, 2),
        'annual_savings': round(annual_savings, 2),
        'roi_percentage': round((monthly_savings / standard_cost) * 100, 1)
    }

# Example
analysis = {
    'object_count': 1000000,
    'total_size_gb': 10000,  # 10 TB
    'access_pattern': 0.30  # 30% accessed recently
}

roi = calculate_intelligent_tiering_roi(analysis)
print(f"Annual Savings: ${roi['annual_savings']:,.2f}")
print(f"ROI: {roi['roi_percentage']}%")

# Example output:
# Current cost: $230.00/month ($2,760/year)
# Intelligent-Tiering: $165.50/month ($1,986/year)
# Annual savings: $774 (28% reduction)
```
## Conseils \& Bonnes pratiques

### Conseils de sécurité

**Astuce 1 : Activez le cryptage par défaut et bloquez l'accès public**
```bash
# Always enable for new buckets
aws s3api put-bucket-encryption \
    --bucket my-bucket \
    --server-side-encryption-configuration '{
      "Rules": [{
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }]
    }'

aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true
```
**Astuce 2 : Utilisez des URL prédéfinies pour un accès temporaire**
```python
# presigned_urls.py
import boto3
from datetime import timedelta

s3 = boto3.client('s3')

# Generate presigned URL for upload
def generate_upload_url(bucket, key, expiration=3600):
    """
    Generate presigned URL for client to upload directly to S3
    Avoids proxying through your server
    """
    
    url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ContentType': 'image/jpeg'
        },
        ExpiresIn=expiration,
        HttpMethod='PUT'
    )
    
    return url

# Generate presigned URL for download
def generate_download_url(bucket, key, expiration=3600):
    """
    Generate presigned URL for temporary access
    """
    
    url = s3.generate_presigned_url(
        'get_object',
        Params={
            'Bucket': bucket,
            'Key': key,
            'ResponseContentDisposition': 'attachment; filename="downloaded.pdf"'
        },
        ExpiresIn=expiration
    )
    
    return url

# Usage in API
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/upload-url', methods=['GET'])
def get_upload_url():
    filename = request.args.get('filename')
    url = generate_upload_url('my-bucket', f'uploads/{filename}')
    return jsonify({'upload_url': url})

@app.route('/download/<file_id>', methods=['GET'])
def get_download_url(file_id):
    url = generate_download_url('my-bucket', f'files/{file_id}')
    return jsonify({'download_url': url})

# Client-side JavaScript upload
"""
fetch('/upload-url?filename=photo.jpg')
  .then(res => res.json())
  .then(data => {
    return fetch(data.upload_url, {
      method: 'PUT',
      body: fileBlob,
      headers: {'Content-Type': 'image/jpeg'}
    });
  });
"""
```
**Astuce 3 : implémentez la suppression MFA pour les compartiments critiques**
```bash
# Enable versioning first
aws s3api put-bucket-versioning \
    --bucket critical-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA delete (requires root account with MFA)
aws s3api put-bucket-versioning \
    --bucket critical-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 123456"

# Now deletions require MFA token
aws s3api delete-object \
    --bucket critical-bucket \
    --key important-file.pdf \
    --version-id abc123 \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 789012"
```
### Conseils sur les performances

**Astuce 4 : Utilisez le téléchargement partitionné pour les fichiers volumineux**
```python
# multipart_upload.py
import boto3
import os
from boto3.s3.transfer import TransferConfig

def upload_large_file(file_path, bucket, key):
    """
    Optimized upload for files > 100 MB
    """
    
    s3 = boto3.client('s3')
    
    # Configure multipart settings
    config = TransferConfig(
        multipart_threshold=1024 * 25,  # 25 MB
        max_concurrency=10,
        multipart_chunksize=1024 * 25,
        use_threads=True
    )
    
    file_size = os.path.getsize(file_path)
    print(f"Uploading {file_size / (1024**2):.2f} MB file...")
    
    # Upload with progress callback
    def progress_callback(bytes_transferred):
        progress = (bytes_transferred / file_size) * 100
        print(f"\rProgress: {progress:.1f}%", end='', flush=True)
    
    s3.upload_file(
        file_path,
        bucket,
        key,
        Config=config,
        Callback=progress_callback
    )
    
    print("\nUpload complete!")

# Manual multipart upload (more control)
def multipart_upload_manual(file_path, bucket, key):
    """
    Manual multipart upload with retry logic
    """
    
    s3 = boto3.client('s3')
    
    # Initiate multipart upload
    response = s3.create_multipart_upload(
        Bucket=bucket,
        Key=key,
        ServerSideEncryption='AES256'
    )
    
    upload_id = response['UploadId']
    
    try:
        parts = []
        part_size = 1024 * 1024 * 25  # 25 MB
        
        with open(file_path, 'rb') as f:
            part_number = 1
            
            while True:
                data = f.read(part_size)
                if not data:
                    break
                
                # Upload part with retry
                for attempt in range(3):
                    try:
                        response = s3.upload_part(
                            Bucket=bucket,
                            Key=key,
                            PartNumber=part_number,
                            UploadId=upload_id,
                            Body=data
                        )
                        
                        parts.append({
                            'PartNumber': part_number,
                            'ETag': response['ETag']
                        })
                        
                        print(f"Uploaded part {part_number}")
                        break
                        
                    except Exception as e:
                        if attempt == 2:
                            raise
                        print(f"Retry part {part_number} (attempt {attempt + 1})")
                
                part_number += 1
        
        # Complete multipart upload
        s3.complete_multipart_upload(
            Bucket=bucket,
            Key=key,
            UploadId=upload_id,
            MultipartUpload={'Parts': parts}
        )
        
        print("Multipart upload complete!")
        
    except Exception as e:
        # Abort upload on error
        s3.abort_multipart_upload(
            Bucket=bucket,
            Key=key,
            UploadId=upload_id
        )
        raise
```
**Astuce 5 : Activez l'accélération des transferts pour les utilisateurs internationaux**
```bash
# Enable transfer acceleration
aws s3api put-bucket-accelerate-configuration \
    --bucket my-bucket \
    --accelerate-configuration Status=Enabled

# Test speed improvement
aws s3 cp large-file.zip s3://my-bucket/ \
    --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com

# Compare speeds
# Standard endpoint: Upload via nearest region
# Acceleration endpoint: Upload via nearest CloudFront edge, then private AWS network
# Typical speedup: 50-500% depending on location
```
### Conseils d'optimisation des coûts

**Astuce 6 : Utilisez S3 Intelligent-Tiering pour les modèles d'accès inconnus**
```bash
# Enable Intelligent-Tiering at bucket level
aws s3api put-bucket-intelligent-tiering-configuration \
    --bucket my-bucket \
    --id EntireBucket \
    --intelligent-tiering-configuration '{
      "Id": "EntireBucket",
      "Status": "Enabled",
      "Tierings": [
        {
          "Days": 90,
          "AccessTier": "ARCHIVE_ACCESS"
        },
        {
          "Days": 180,
          "AccessTier": "DEEP_ARCHIVE_ACCESS"
        }
      ]
    }'

# Upload objects to Intelligent-Tiering
aws s3 cp file.txt s3://my-bucket/ \
    --storage-class INTELLIGENT_TIERING
```
**Astuce 7 : Mettez en œuvre des politiques de cycle de vie pour réduire les coûts**
```json
{
  "Rules": [
    {
      "Id": "OptimizeMediaFiles",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Prefix": "media/",
          "Tags": [
            {"Key": "ContentType", "Value": "video"}
          ]
        }
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "INTELLIGENT_TIERING"
        }
      ]
    },
    {
      "Id": "CleanupLogs",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER_IR"}
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```
**Astuce 8 : Surveillez et supprimez les téléchargements multiparts incomplets**
```python
# cleanup_incomplete_uploads.py
import boto3
from datetime import datetime, timedelta

def cleanup_incomplete_multipart_uploads(bucket_name, days_old=7):
    """
    Delete incomplete multipart uploads older than specified days
    Can save significant storage costs
    """
    
    s3 = boto3.client('s3')
    
    cutoff_date = datetime.now() - timedelta(days=days_old)
    
    paginator = s3.get_paginator('list_multipart_uploads')
    
    total_deleted = 0
    
    for page in paginator.paginate(Bucket=bucket_name):
        uploads = page.get('Uploads', [])
        
        for upload in uploads:
            initiated = upload['Initiated'].replace(tzinfo=None)
            
            if initiated < cutoff_date:
                s3.abort_multipart_upload(
                    Bucket=bucket_name,
                    Key=upload['Key'],
                    UploadId=upload['UploadId']
                )
                
                print(f"Deleted incomplete upload: {upload['Key']}")
                total_deleted += 1
    
    print(f"Total incomplete uploads deleted: {total_deleted}")
    
    return total_deleted

# Or use lifecycle policy
"""
{
  "Rules": [{
    "Id": "CleanupIncomplete",
    "Status": "Enabled",
    "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
    }
  }]
}
"""
```
### Conseils opérationnels

**Astuce 9 : Utilisez l'inventaire S3 pour les opérations à grande échelle**
```bash
# Enable S3 Inventory
aws s3api put-bucket-inventory-configuration \
    --bucket my-bucket \
    --id DailyInventory \
    --inventory-configuration '{
      "Destination": {
        "S3BucketDestination": {
          "AccountId": "123456789012",
          "Bucket": "arn:aws:s3:::inventory-bucket",
          "Format": "Parquet",
          "Prefix": "inventory/"
        }
      },
      "IsEnabled": true,
      "Id": "DailyInventory",
      "IncludedObjectVersions": "Current",
      "OptionalFields": [
        "Size", "LastModifiedDate", "StorageClass",
        "ETag", "IntelligentTieringAccessTier"
      ],
      "Schedule": {
        "Frequency": "Daily"
      }
    }'

# Query inventory with Athena
"""
CREATE EXTERNAL TABLE s3_inventory (
    bucket STRING,
    key STRING,
    size BIGINT,
    last_modified_date TIMESTAMP,
    storage_class STRING
)
STORED AS PARQUET
LOCATION 's3://inventory-bucket/inventory/';

-- Find large objects
SELECT key, size / (1024*1024*1024) as size_gb
FROM s3_inventory
WHERE size > 1073741824
ORDER BY size DESC
LIMIT 100;
"""
```
**Astuce 10 : implémentez les notifications d'événements S3 pour l'automatisation**
```python
# event_driven_processing.py
import boto3
import json

def lambda_handler(event, context):
    """
    Process S3 events automatically
    """
    
    s3 = boto3.client('s3')
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        size = record['s3']['object']['size']
        event_name = record['eventName']
        
        print(f"Event: {event_name}")
        print(f"Object: s3://{bucket}/{key}")
        print(f"Size: {size / (1024**2):.2f} MB")
        
        # Process based on event type
        if 'ObjectCreated' in event_name:
            process_new_object(bucket, key)
        
        elif 'ObjectRemoved' in event_name:
            log_deletion(bucket, key)
    
    return {'statusCode': 200}

def process_new_object(bucket, key):
    """Process newly uploaded object"""
    
    # Example: Generate thumbnail for images
    if key.endswith(('.jpg', '.png')):
        # Trigger image processing pipeline
        pass
    
    # Example: Index documents
    elif key.endswith('.pdf'):
        # Extract text and index in Elasticsearch
        pass

def log_deletion(bucket, key):
    """Log object deletion to audit trail"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('S3AuditLog')
    
    table.put_item(Item={
        'bucket': bucket,
        'key': key,
        'event': 'DELETE',
        'timestamp': datetime.utcnow().isoformat()
    })
```
## Pièges \& Remèdes

### Piège 1 : exposition publique

**Problème :** Rendre accidentellement publics des compartiments ou des objets S3, entraînant des violations de données.

**Pourquoi cela arrive :**

- Politiques de compartiment trop permissives
- ACL permettant l'accès public
- Ne pas utiliser les paramètres de blocage de l'accès public
- CloudFormation/Terraform mal configuré

**Impact :**

- Violations de données (données clients, identifiants, code source)
- Violations de conformité (RGPD, HIPAA)
- Atteinte à la réputation
- Pertes financières

**Exemple de vulnérabilité :**
```json
// Bad - Grants public access
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*"
  }]
}
```
**Remède :**

**Étape 1 : Activer le blocage de l'accès public (au niveau du compte)**
```bash
# Enable at account level
aws s3control put-public-access-block \
    --account-id 123456789012 \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# This prevents ANY bucket in the account from becoming public
```
**Étape 2 : Auditer les compartiments existants**
```python
# audit_public_buckets.py
import boto3

def audit_public_buckets():
    """
    Find buckets with public access
    """
    
    s3 = boto3.client('s3')
    
    buckets = s3.list_buckets()['Buckets']
    public_buckets = []
    
    for bucket in buckets:
        bucket_name = bucket['Name']
        
        try:
            # Check Block Public Access settings
            block_config = s3.get_public_access_block(
                Bucket=bucket_name
            )['PublicAccessBlockConfiguration']
            
            if not all([
                block_config.get('BlockPublicAcls'),
                block_config.get('IgnorePublicAcls'),
                block_config.get('BlockPublicPolicy'),
                block_config.get('RestrictPublicBuckets')
            ]):
                # Check bucket policy
                try:
                    policy = s3.get_bucket_policy(Bucket=bucket_name)
                    policy_doc = json.loads(policy['Policy'])
                    
                    for statement in policy_doc.get('Statement', []):
                        if statement.get('Principal') == '*':
                            public_buckets.append({
                                'bucket': bucket_name,
                                'risk': 'HIGH',
                                'reason': 'Bucket policy allows public access'
                            })
                except:
                    pass
                
                # Check ACL
                acl = s3.get_bucket_acl(Bucket=bucket_name)
                for grant in acl['Grants']:
                    grantee = grant['Grantee']
                    if grantee.get('Type') == 'Group' and \
                       'AllUsers' in grantee.get('URI', ''):
                        public_buckets.append({
                            'bucket': bucket_name,
                            'risk': 'CRITICAL',
                            'reason': 'ACL grants public access'
                        })
        
        except Exception as e:
            print(f"Error checking {bucket_name}: {e}")
    
    return public_buckets

# Run audit
public_buckets = audit_public_buckets()

if public_buckets:
    print(f"⚠️  Found {len(public_buckets)} buckets with public access:")
    for bucket in public_buckets:
        print(f"\n  Bucket: {bucket['bucket']}")
        print(f"  Risk: {bucket['risk']}")
        print(f"  Reason: {bucket['reason']}")
else:
    print("✓ No public buckets found")
```
**Étape 3 : Corriger les compartiments publics**
```bash
# Fix bucket - enable block public access
aws s3api put-public-access-block \
    --bucket my-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=true,\
        RestrictPublicBuckets=true

# Remove public bucket policy
aws s3api delete-bucket-policy --bucket my-bucket

# For legitimate public content (static websites), use CloudFront + OAC
# Don't make bucket public directly
```
**Étape 4 : Mettre en œuvre la surveillance**
```python
# monitor_public_access.py
# CloudWatch Events rule for S3 bucket policy changes

event_pattern = {
    "source": ["aws.s3"],
    "detail-type": ["AWS API Call via CloudTrail"],
    "detail": {
        "eventName": [
            "PutBucketPolicy",
            "PutBucketAcl",
            "DeletePublicAccessBlock"
        ]
    }
}

# Lambda function to alert on policy changes
def lambda_handler(event, context):
    detail = event['detail']
    bucket = detail['requestParameters']['bucketName']
    
    # Check if change makes bucket public
    if is_bucket_public(bucket):
        send_alert(f"Bucket {bucket} made public!", severity='CRITICAL')
        
        # Auto-remediate
        remediate_public_bucket(bucket)
```
**Prévention :**

- Activer le blocage de l'accès public au niveau du compte
- Utilisez les SCP pour empêcher la désactivation du blocage de l'accès public
- Audits de sécurité réguliers
- Mettre en œuvre des politiques IAM de moindre privilège
- Utilisez CloudFront avec OAC pour le contenu public

***

### Piège 2 : erreurs de politique de cycle de vie

**Problème :** Les politiques de cycle de vie suppriment involontairement des données ou ne parviennent pas à réduire les coûts.

**Pourquoi cela arrive :**

- Configuration de filtre incorrecte
- Ne pas comprendre les contraintes de transition
- Règles qui se chevauchent
- Aucun test avant la production

**Impact :**

- Suppression accidentelle de données
- Transitions échouées (nombre de jours minimum non respecté)
- Coûts de stockage gaspillés
- Violations de conformité

**Exemple d'erreur :**
```json
// Bad - Will cause errors
{
  "Rules": [{
    "Id": "BadRule",
    "Status": "Enabled",
    "Transitions": [
      {
        "Days": 0,  // Error: Can't transition to IA immediately from Standard
        "StorageClass": "STANDARD_IA"
      },
      {
        "Days": 10,  // Error: Must wait 30 days for IA
        "StorageClass": "GLACIER"
      }
    ]
  }]
}
```
**Remède :**

**Étape 1 : Comprendre les contraintes de transition**
```
Transition Rules:
Standard → Standard-IA: Minimum 30 days
Standard → Intelligent-Tiering: Immediate
Standard-IA → Glacier: Minimum 30 days after IA transition
Glacier Instant → Glacier Flexible: Minimum 0 days
Glacier Flexible → Deep Archive: Minimum 90 days

Cannot transition:
- To Standard (one-way only)
- Objects < 128 KB to IA classes
```
**Étape 2 : Testez d'abord avec un préfixe spécifique**
```bash
# Test lifecycle policy on specific prefix
cat > test-lifecycle.json <<'EOF'
{
  "Rules": [{
    "Id": "TestRule",
    "Status": "Enabled",
    "Filter": {
      "Prefix": "test-lifecycle/"
    },
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 90, "StorageClass": "GLACIER_IR"}
    ],
    "Expiration": {
      "Days": 365
    }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration file://test-lifecycle.json

# Upload test objects
aws s3 cp test1.txt s3://my-bucket/test-lifecycle/test1.txt

# Monitor for 30+ days, verify transitions work
# Then expand to entire bucket
```
**Étape 3 : Utiliser des balises pour le contrôle granulaire**
```json
{
  "Rules": [
    {
      "Id": "ArchiveTaggedObjects",
      "Status": "Enabled",
      "Filter": {
        "And": {
          "Tags": [
            {"Key": "Archive", "Value": "true"}
          ]
        }
      },
      "Transitions": [
        {"Days": 0, "StorageClass": "GLACIER_FLEXIBLE_RETRIEVAL"}
      ]
    },
    {
      "Id": "KeepImportant",
      "Status": "Enabled",
      "Filter": {
        "Tag": {
          "Key": "Important",
          "Value": "true"
        }
      }
      // No transitions - keep in Standard
    }
  ]
}
```
**Étape 4 : Mettre en œuvre des contrôles de sécurité**
```python
# lifecycle_validator.py
def validate_lifecycle_policy(policy):
    """
    Validate lifecycle policy before applying
    """
    
    errors = []
    warnings = []
    
    for rule in policy['Rules']:
        rule_id = rule['Id']
        
        # Check transitions
        if 'Transitions' in rule:
            transitions = rule['Transitions']
            
            for i, transition in enumerate(transitions):
                days = transition['Days']
                storage_class = transition['StorageClass']
                
                # Validate minimum days
                if storage_class == 'STANDARD_IA' and days < 30:
                    errors.append(f"{rule_id}: Standard to IA requires 30 days minimum")
                
                if storage_class == 'GLACIER_IR' and days < 0:
                    errors.append(f"{rule_id}: Invalid days value")
                
                # Check ordering
                if i > 0:
                    prev_days = transitions[i-1]['Days']
                    if days <= prev_days:
                        errors.append(f"{rule_id}: Transition days must be increasing")
        
        # Check expiration
        if 'Expiration' in rule and 'Transitions' in rule:
            expiration_days = rule['Expiration'].get('Days', float('inf'))
            last_transition = rule['Transitions'][-1]['Days']
            
            if expiration_days <= last_transition:
                warnings.append(f"{rule_id}: Expiration before last transition")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }

# Validate before applying
result = validate_lifecycle_policy(policy)

if not result['valid']:
    print("❌ Lifecycle policy has errors:")
    for error in result['errors']:
        print(f"  - {error}")
else:
    print("✓ Lifecycle policy is valid")
    if result['warnings']:
        print("⚠️  Warnings:")
        for warning in result['warnings']:
            print(f"  - {warning}")
```
**Prévention :**

- Testez d'abord les politiques sur les petits préfixes
- Comprendre les contraintes de transition
- Utilisez des balises pour un contrôle précis
- Surveiller les actions du cycle de vie avec CloudWatch Events
- Documenter l'objectif de la politique et le comportement attendu

***

### Piège 3 : problèmes de réplication entre régions

**Problème :** La réplication échoue, est incomplète ou crée des coûts inattendus.

**Pourquoi cela arrive :**

- Versioning non activé
- Autorisations IAM incorrectes
- Ne pas comprendre ce qui est répliqué
- Compatibilité de cryptage manquante

**Impact :**

- La stratégie DR échoue
- Incohérence des données entre les régions
- Coûts inattendus de transfert de données
- Échecs de conformité

**Remède :**

**Étape 1 : Vérifier les prérequis**
```bash
# 1. Enable versioning on both buckets
aws s3api put-bucket-versioning \
    --bucket source-bucket \
    --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
    --bucket destination-bucket \
    --versioning-configuration Status=Enabled

# 2. Create replication role
cat > replication-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "s3.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name S3ReplicationRole \
    --assume-role-policy-document file://replication-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# 3. Attach replication policy
cat > replication-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::source-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::source-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::destination-bucket/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name S3ReplicationRole \
    --policy-name ReplicationPolicy \
    --policy-document file://replication-policy.json
```
**Étape 2 : Configurer correctement la réplication**
```json
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  "Rules": [{
    "Status": "Enabled",
    "Priority": 1,
    "DeleteMarkerReplication": {
      "Status": "Enabled"
    },
    "Filter": {},
    "Destination": {
      "Bucket": "arn:aws:s3:::destination-bucket",
      "ReplicationTime": {
        "Status": "Enabled",
        "Time": {"Minutes": 15}
      },
      "Metrics": {
        "Status": "Enabled",
        "EventThreshold": {"Minutes": 15}
      },
      "StorageClass": "STANDARD_IA",
      "EncryptionConfiguration": {
        "ReplicaKmsKeyID": "arn:aws:kms:us-west-2:123456789012:key/abc-123"
      }
    },
    "SourceSelectionCriteria": {
      "SseKmsEncryptedObjects": {
        "Status": "Enabled"
      }
    }
  }]
}
```
**Étape 3 : Surveiller la réplication**
```python
# monitor_replication.py
import boto3

def monitor_replication_status(bucket_name):
    """
    Monitor S3 replication metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get replication latency
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='ReplicationLatency',
        Dimensions=[
            {'Name': 'SourceBucket', 'Value': bucket_name},
            {'Name': 'DestinationBucket', 'Value': 'destination-bucket'},
            {'Name': 'RuleId', 'Value': 'rule-1'}
        ],
        StartTime=datetime.now() - timedelta(hours=1),
        EndTime=datetime.now(),
        Period=300,
        Statistics=['Maximum', 'Average']
    )
    
    # Check for failed replications
    failed_response = cloudwatch.get_metric_statistics(
        Namespace='AWS/S3',
        MetricName='OperationsFailedReplication',
        Dimensions=[
            {'Name': 'SourceBucket', 'Value': bucket_name}
        ],
        StartTime=datetime.now() - timedelta(hours=1),
        EndTime=datetime.now(),
        Period=300,
        Statistics=['Sum']
    )
    
    return {
        'latency': response['Datapoints'],
        'failed': failed_response['Datapoints']
    }
```
**Prévention :**

- Activer le versioning avant de configurer la réplication
- Testez d'abord la réplication avec un petit ensemble de données
- Surveiller les métriques de réplication
- Comprendre ce qui est/n'est pas répliqué
- Tenir compte des coûts (transfert de données + stockage à destination)

***

## Résumé du chapitre

Amazon S3 est la pierre angulaire du stockage AWS, fournissant un stockage d'objets durable, évolutif et rentable pour pratiquement tous les cas d'utilisation. Comprendre les classes de stockage, les politiques de cycle de vie, le chiffrement, les contrôles d'accès, la gestion des versions, la réplication et l'optimisation des performances est essentiel pour créer des applications de production sur AWS. Une configuration S3 appropriée peut permettre d'économiser des coûts importants tout en préservant la sécurité et la conformité.

**Principaux points à retenir :**

- **Choisissez la classe de stockage appropriée :** Standard pour les données chaudes, Intelligent-Tiering pour les modèles inconnus, IA pour les accès peu fréquents, Glacier pour les archives
- **Mettre en œuvre des couches de sécurité :** Bloquer l'accès public, le chiffrement, les politiques de compartiment, les politiques IAM, les points d'accès
- **Utilisez des politiques de cycle de vie :** Automatisez les transitions vers des classes de stockage moins chères, faites expirer les anciennes données, nettoyez les téléchargements partitionnés
- **Activer la gestion des versions :** Protégez-vous contre la suppression accidentelle, respectez les exigences de conformité grâce aux politiques de cycle de vie des anciennes versions.
- **Optimisation des performances :** téléchargements en plusieurs parties pour les fichiers volumineux, partitionnement de préfixes pour un débit élevé, accélération des transferts pour les utilisateurs internationaux
- **Surveillez et optimisez les coûts :** S3 Storage Lens pour la visibilité, Intelligent-Tiering pour l'optimisation automatique, S3 Inventory pour les opérations à grande échelle.

Comprendre S3 en profondeur vous permet de créer des solutions de stockage de données rentables, sécurisées et hautes performances, évolutives jusqu'à l'exaoctet.

Au chapitre 9, nous explorerons Amazon EBS et EFS pour les besoins de stockage de blocs et de fichiers.

## Questions de révision

1. **Quelle classe de stockage offre le coût par Go le plus bas ?**
a) Norme-IA
b) Récupération flexible des glaciers
c) Archives profondes des glaciers
d) Une zone-IA

**Réponse : C** - Glacier Deep Archive à \$0,00099/Go/mois (~\$1/To/mois).

2. **Quel est l'indice de durabilité du S3 ?**
a) 99,99%
b) 99,999999999 % (11 neuf)
c) 99,9999999 % (9 neuf)
d) 100 %

**Réponse : B** - S3 offre une durabilité de 99,999999999 % (11 neuf).

3. **Durée de stockage minimale pour Standard-IA ?**
a) Aucun
b) 30 jours
c) 90 jours
d) 180 jours

**Réponse : B** - Standard-IA a une durée de stockage minimale de 30 jours.

4. **Quelle option de chiffrement fournit une piste d'audit dans CloudTrail ?**
a) SSE-S3
b) SSE-KMS
c) SSE-C
d) Côté client

**Réponse : B** - SSE-KMS enregistre toutes les opérations de chiffrement/déchiffrement dans CloudTrail.

5. **Taille maximale de l'objet dans S3 ?**
a) 5 Go
b) 5 To
c) 10 To
d) Illimité

**Réponse : B** - La taille maximale de l'objet est de 5 To.

6. **Le téléchargement en plusieurs parties est requis pour les objets plus grands que :**
a) 100 Mo
b) 5 Go
c) 1 To
d) Jamais requis

**Réponse : B** – Téléchargement partitionné requis pour les objets > 5 Go (recommandé pour > 100 Mo).

7. ** Contre quoi MFA Supprimer protège-t-il ?**
a) Téléchargements accidentels
b) Suppressions d'objets non autorisées
c) Coûts élevés
d) Problèmes de performances

**Réponse : B** - MFA Delete nécessite un jeton MFA pour supprimer les versions d'objet.

8. **La réplication entre régions nécessite :**
a) Même classe de stockage
b) Gestion des versions activée
c) Compartiments publics
d) Pas de cryptage

**Réponse : B** – La gestion des versions doit être activée pour les compartiments source et de destination.

9. **Coût de la surveillance S3 Intelligent-Tiering :**
a) Gratuit
b) \$0,0025 pour 1 000 objets
c) \$0,01 par Go
d) \$10/mois fixe

**Réponse : B** - Les frais de surveillance sont de 0,0025 $ pour 1 000 objets.

10. **Quel service interroge les données S3 sans téléchargement ?**
a) Opérations par lots S3
b) Sélection S3
c) Inventaire S3
d) Analyse S3

**Réponse : B** - S3 Sélectionnez les requêtes CSV/JSON/Parquet sur place.

11. **Les noms des compartiments S3 doivent être :**
a) Unique dans la région
b) Unique au sein du compte
c) Unique au monde
d) Aucune restriction

**Réponse : C** - Les noms de compartiment S3 doivent être globalement uniques sur tous les comptes AWS.

12. **Algorithme de cryptage S3 par défaut :**
a)AES-128
b)AES-256
c)AES-512
d) RSA-2048

**Réponse : B** - S3 utilise le cryptage AES-256 par défaut.

13. **S3 Transfer Acceleration utilise quel service ?**
a) Connexion directe
b) Emplacements périphériques CloudFront
c) Accélérateur mondial
d) VPN

**Réponse : B** - Transfer Acceleration utilise les emplacements périphériques CloudFront pour des téléchargements plus rapides.

14. **Le mode CONFORMITÉ de verrouillage d'objet peut être remplacé par :**
a) Utilisateur racine
b) Administrateur IAM
c) Assistance AWS
d) Personne

**Réponse : D** - Le mode CONFORMITÉ ne peut être remplacé par personne, y compris root.

15. **S3 prend en charge combien de requêtes par seconde et par préfixe ?**
une) 100
b) 1 000
c) 3 500 PUT / 5 500 GET
d) Illimité

**Réponse : C** - S3 prend en charge 3 500 PUT/COPY/POST/DELETE et 5 500 GET/HEAD par préfixe et par seconde.

***
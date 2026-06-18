# Chapitre 7 : AWS Lambda \& sans serveur

##Présentation

AWS Lambda a révolutionné le cloud computing en introduisant le calcul sans serveur, éliminant ainsi le besoin de provisionner ou de gérer des serveurs. Avec Lambda, vous téléchargez votre code et AWS gère tout le reste : capacité de provisionnement, mise à l'échelle, correctifs, surveillance et haute disponibilité. Ce changement de paradigme permet aux développeurs de se concentrer entièrement sur la logique métier tandis qu'AWS gère l'infrastructure, incarnant ainsi la véritable promesse du cloud computing : en payant uniquement pour ce que vous utilisez, mesuré en millisecondes.

L'architecture sans serveur s'étend bien au-delà de Lambda elle-même. Amazon API Gateway fournit des API REST et WebSocket entièrement gérées, Amazon EventBridge permet des architectures basées sur les événements, AWS Step Functions orchestre des flux de travail complexes et DynamoDB propose des bases de données NoSQL sans serveur. Ensemble, ces services forment un écosystème complet sans serveur dans lequel vous pouvez créer des applications sophistiquées sans gérer un seul serveur. Ce modèle d'architecture est particulièrement puissant pour les charges de travail basées sur les événements, les microservices, les pipelines de traitement de données et les backends pour les applications mobiles et Web.

Cependant, l’informatique sans serveur présente des défis et des paradigmes uniques. Les démarrages à froid ont un impact sur les temps de réponse lorsque les fonctions n'ont pas été invoquées récemment. Les limites de concurrence peuvent limiter les applications lors des pics de trafic. Les fonctions VPC Lambda sont confrontées à une latence d'initialisation. L'allocation de mémoire affecte directement les performances et les coûts. La gestion de l'état nécessite des services externes puisque les fonctions Lambda sont sans état. Comprendre ces nuances permet de distinguer les implémentations sans serveur réussies des implémentations problématiques.

Ce chapitre fournit une couverture complète d'AWS Lambda et des architectures sans serveur, des principes fondamentaux aux modèles de production. Vous découvrirez le modèle d'exécution de Lambda, les sources d'événements, les modèles de déploiement, l'optimisation des performances, la gestion des erreurs, l'observabilité et l'optimisation des coûts. Que vous créiez des API, traitiez des flux, automatisiez des flux de travail ou créiez des systèmes pilotés par événements, la maîtrise de Lambda est essentielle pour les architectures AWS modernes.

## Théorie \&Concepts

### Fondamentaux de l'informatique sans serveur

**Qu'est-ce que le sans serveur ?**

Sans serveur ne signifie pas « pas de serveurs » : les serveurs existent toujours, mais vous ne les gérez pas. AWS provisionne, met à l'échelle et maintient automatiquement l'infrastructure.

**Caractéristiques clés :**

1. **Aucune gestion de serveur :** AWS gère le provisionnement, les correctifs et la mise à l'échelle
2. **Mise à l'échelle automatique :** Évolue de zéro à des milliers d'exécutions simultanées
3. **Paiement à l'utilisation :** Facturé uniquement pour le temps de calcul consommé (**incréments de 1 ms** depuis décembre 2020)
4. **Event-Driven :** Déclenché par des événements (requêtes HTTP, téléchargements de fichiers, modifications de la base de données)
5. **Apatride :** Chaque appel est indépendant ; état stocké en externe
6. **Disponibilité intégrée :** Déployé automatiquement sur plusieurs zones de disponibilité

**Avantages :**

- Pas de gestion des infrastructures
- Mise à l'échelle automatique
- Rentable pour les charges de travail variables
- Délai de commercialisation plus rapide
- Haute disponibilité intégrée

**Compromis :**

- Latence de démarrage à froid
- Délais d'exécution (15 minutes max)
- Considérations liées au verrouillage du fournisseur
- Complexité du débogage
- Contrôle limité sur l'environnement d'exécution


### Modèle d'exécution Lambda

**Flux d'appel :**
```
Event Source → Lambda Service → Execution Environment → Your Code → Response
                     ↓
              [Cold Start if needed]
                     ↓
           Initialize runtime + code
                     ↓
              Reuse environment for warm invocations
```
**Phases d'exécution :**

**1. Phase d'initialisation (démarrage à froid) :**

- Télécharger le code de fonction
- Initialiser le runtime (Node.js, Python, Java, etc.)
- Exécuter le code d'initialisation (gestionnaire externe)
- ~100 ms-1 000 ms+ selon le temps d'exécution et la taille du code

**2. Phase d'appel :**

- Exécuter la fonction du gestionnaire
- Événement de processus
- Retour de réponse
- ~1 ms-15 min (délai d'expiration configurable)

**3. Phase d'arrêt :**

- Environnement gelé après invocation
- Peut être réutilisé pour des invocations ultérieures (démarrage à chaud)
- Finalement arrêté après inactivité


### Démarrages à froid vs démarrages à chaud

**Démarrage à froid :**
Premier appel ou après une période d'inactivité nécessitant une initialisation de l'environnement.
```
Timeline:
├─ 0ms: Event arrives
├─ 100ms: Initialize runtime
├─ 200ms: Load dependencies
├─ 300ms: Execute init code
├─ 350ms: START handler execution
└─ 450ms: Complete

Total: 450ms (100ms billed execution time)
```
**Démarrage à chaud :**
Invocation ultérieure réutilisant l’environnement d’exécution existant.
```
Timeline:
├─ 0ms: Event arrives
├─ 5ms: START handler execution (reuses environment)
└─ 105ms: Complete

Total: 105ms (100ms billed execution time)
```
**Durée de démarrage à froid par durée d'exécution :**


| Durée d'exécution | Démarrage à froid typique | Avec dépendances |
| :-- | :-- | :-- |
| Python3.11 | 100-200 ms | 200-500ms |
| Node.js 18 | 150-250 ms | 250-600ms |
| Java17 | 500-1000 ms | 1000-3000 ms |
| .NET6 | 400-800ms | 800-2000 ms |
| Passez à 1.x | 100-150 ms | 150-300 ms |
| Rouille | 80-120 ms | 120-250 ms |

**Facteurs affectant les démarrages à froid :**

1. **Exécution :** Langages compilés (Go, Rust) plus rapides que JVM (Java, .NET)
2. **Allocation de mémoire :** Plus de mémoire = plus de CPU = initialisation plus rapide
3. **Taille du paquet de code :** Les paquets plus volumineux prennent plus de temps à télécharger/extraire
4. **Configuration VPC :** Les VPC Lambda ont un temps de configuration ENI supplémentaire
5. **Dépendances :** Plus de dépendances = initialisation plus longue
6. **Lambda SnapStart :** Les fonctions Java démarrent environ 10 fois plus rapidement

### Configuration Lambda

**Mémoire \& CPU :**

Mémoire : 128 Mo à 10 240 Mo (10 Go) par incréments de 1 Mo
CPU : évolue linéairement avec la mémoire

- 128 Mo = ~0,08 processeur virtuel
- 1 769 Mo = 1 vCPU complet
- 10 240 Mo = ~6 processeurs virtuels

**Délai d'expiration :**

- Par défaut : 3 secondes
- Maximum : 900 secondes (15 minutes)
- Définir en fonction du temps d'exécution prévu

**Stockage éphémère (/tmp) :**

- Par défaut : 512 Mo
- Maximum : 10 240 Mo (10 Go)
- Partagé entre les invocations dans le même environnement d'exécution

**Concurrence :**

- **Niveau du compte :** 1 000 exécutions simultanées (par défaut, limite souple)
- **Réservé :** Garantie capacité de fonction
- **Provisionné :** Environnements pré-initialisés (pas de démarrages à froid)

**Variables d'environnement :**

- Taille totale maximale de 4 Ko
- Chiffré au repos avec KMS
- À utiliser pour la configuration, pas pour les secrets (utilisez Secrets Manager)


### Sources d'événements et types d'appels

**Types d'appel :**

**1. Synchrone (Demande-Réponse) :**
L'appelant attend une réponse.
```python
# Client waits for Lambda to complete
import boto3
lambda_client = boto3.client('lambda')

response = lambda_client.invoke(
    FunctionName='my-function',
    InvocationType='RequestResponse',  # Synchronous
    Payload=json.dumps({'key': 'value'})
)

result = json.loads(response['Payload'].read())
```
**Cas d'utilisation :** API Gateway, ALB, appel SDK

**2. Asynchrone (Fire-and-Forget) :**
L'appelant n'attend pas ; Lambda gère les tentatives.
```python
# Client doesn't wait
response = lambda_client.invoke(
    FunctionName='my-function',
    InvocationType='Event',  # Asynchronous
    Payload=json.dumps({'key': 'value'})
)
# Returns immediately with 202 status
```
**Cas d'utilisation :** Événements S3, SNS, EventBridge
**Nouvelles tentatives :** Jusqu'à 2 tentatives automatiques en cas d'erreur
**DLQ :** Échecs d'événements envoyés à SQS ou SNS

**3. Basé sur un sondage (flux/file d'attente) :**
Source de l'événement des sondages Lambda.

**Cas d'utilisation :**

- Flux de données Kinesis
- Flux DynamoDB
- SQS (Standard et FIFO)
-Amazon MQ
- Kafka (MSK/Autogéré)

Le service Lambda interroge la source et appelle la fonction avec des lots.

### Sources d'événements courantes

| Source de l'événement | Type d'appel | Prise en charge par lots | Cas d'utilisation |
| :-- | :-- | :-- | :-- |
| **Passerelle API** | Synchroniser | Non | API REST |
| **ALB** | Synchroniser | Non | Points de terminaison HTTP |
| **S3** | Asynchrone | Oui | Traitement des fichiers |
| **SNS** | Asynchrone | Non | Notifications de publication/soumission |
| **SQS** | Sondage | Oui | Traitement des files d'attente |
| **EventBridge** | Asynchrone | Non | Tâches planifiées, événements |
| **Flux DynamoDB** | Sondage | Oui | Déclencheurs de base de données |
| **Kinésie** | Sondage | Oui | Traitement des flux |
| **Journaux CloudWatch** | Asynchrone | Non | Traitement des journaux |
| **Cognito** | Synchroniser | Non | Déclencheurs d'authentification |
| **Fonctions étape** | Synchroniser | Non | Tâches de flux de travail |

### Tarifs Lambda

**Frais de calcul :**
```
Price per request: $0.20 per 1M requests
Price per GB-second: $0.0000166667 per GB-second
Billing granularity: 1ms (rounded up to nearest 1ms)

Example 1: 128 MB, 100ms duration, 1M invocations/month
- Request cost: 1M × $0.20 / 1M = $0.20
- Compute cost: 1M × 0.125 GB × 0.1 sec × $0.0000166667 = $0.21
- Total: $0.41/month

Example 2: 1024 MB (1 GB), 500ms duration, 5M invocations/month
- Request cost: 5M × $0.20 / 1M = $1.00
- Compute cost: 5M × 1 GB × 0.5 sec × $0.0000166667 = $41.67
- Total: $42.67/month
```
**Niveau gratuit (mensuel, toujours gratuit) :**

- 1 million de demandes
- Temps de calcul de 400 000 Go-secondes

**Frais supplémentaires de simultanéité provisionnés :**

- \$0,000004167 par Go-seconde
- 0,015 $ par Go-heure

**Exemple de concurrence provisionnée :**
```
10 functions with 1 GB memory, provisioned 24/7
Cost: 10 × 1 GB × 730 hours × $0.015 = $109.50/month
(Plus regular invocation charges)
```
### Autorisations Lambda

**Rôle d'exécution :**
Rôle IAM assumé par Lambda pour accéder aux services AWS.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```
**Politique basée sur les ressources :**
Contrôle qui peut appeler la fonction.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:my-function",
      "Condition": {
        "StringEquals": {
          "AWS:SourceAccount": "123456789012"
        }
      }
    }
  ]
}
```
### Couches Lambda

Les couches permettent de partager du code/des dépendances entre les fonctions.

**Structure:**
```
layer.zip
└── python/  (or nodejs/, java/lib/, etc.)
    └── shared_library.py
```
**Avantages :**

- Réduire la taille du package de déploiement
- Partager du code commun entre les fonctions
- Séparer la logique métier des dépendances
- Déploiements plus rapides

**Limites :**

- Max 5 couches par fonction
- Taille totale décompressée (fonction + calques) ≤ 250 Mo
- Les versions de calques sont immuables

**Cas d'utilisation :**

- Bibliothèques partagées (AWS SDK, traitement des données)
- Utilitaires communs
- Grandes dépendances (modèles ML)


### Concurrence et limitation

**Types de concurrence :**

**1. Limite de simultanéité des comptes :**

- Par défaut : 1 000 par région
- Limite souple : peut demander une augmentation
- Partagé entre toutes les fonctions du compte/région

**2. Concurrence réservée :**

- Garantit la capacité de fonction
- Réduit le pool de comptes pour d'autres fonctions
- Empêche la fonction de consommer toute la capacité
```bash
aws lambda put-function-concurrency \
    --function-name my-function \
    --reserved-concurrent-executions 100
```
**3. Concurrence provisionnée :**

- Environnements d'exécution pré-initialisés
- Pas de démarrage à froid
- Paye un supplément pour les temps chauds
- Utilisation pour les charges de travail sensibles à la latence
```bash
aws lambda put-provisioned-concurrency-config \
    --function-name my-function \
    --provisioned-concurrent-executions 50 \
    --qualifier prod
```
**Limitation :**

Lorsque la limite de simultanéité est dépassée :

- **Synchronous :** renvoie 429 (TooManyRequestsException)
- **Asynchrone :** Nouvelle tentative automatique, puis DLQ
- **Basé sur le flux :** Lambda réessaye jusqu'à ce que le succès ou l'expiration des données

**Formule de concurrence :**
```
Concurrency = (Invocations per second) × (Average duration in seconds)

Example:
100 requests/sec × 2 sec duration = 200 concurrent executions needed
```
### Configuration Lambda du VPC

Les fonctions Lambda peuvent accéder aux ressources du VPC (RDS, ElastiCache, etc.).

**VPC Lambda traditionnel (avant 2019) :**

- Création d'ENI par sous-réseau
- Démarrages à froid lents (10-60 secondes)
- Goulot d'étranglement de la création d'ENI

**Hyperplan ENI (actuel) :**

- Pool ENI partagé entre les fonctions
- Démarrages à froid rapides (~1 seconde de latence supplémentaire)
- S'adapte beaucoup mieux

**Configuration :**
```json
{
  "VpcConfig": {
    "SubnetIds": ["subnet-1", "subnet-2"],
    "SecurityGroupIds": ["sg-1"]
  }
}
```
**Recommandations :**

- Utiliser des sous-réseaux privés
- Passerelle NAT pour l'accès à Internet
- Points de terminaison VPC pour les services AWS (évitez les frais NAT)
- Placez Lambda et les ressources dans la même AZ lorsque cela est possible


**Lambda SnapStart (Java 11, 17, 21)**

SnapStart réduit considérablement les démarrages à froid des fonctions Java.

**Comment ça marche :**

1. Lambda initialise la fonction
2. Prend un instantané de l'état initialisé
3. Cache l'instantané
4. Restaurations à partir d'un instantané lors d'un démarrage à froid (au lieu d'une réinitialisation)

**Performances :**

- Démarrages à froid 10 fois plus rapides
- De 2-3 secondes → 200-300ms

**Durées d'exécution prises en charge :**

- Java 11 (Corretto 11)
- Java 17 (Corretto 17)
- Java 21 (Corretto 21) — ajouté en 2024

**Limites :**

- Pas de support pour : écritures /tmp, mise en réseau pendant l'initialisation
- Un état unique doit être généré par invocation
- Doit publier une version avant que SnapStart ne prenne effet

**Cas d'utilisation :**

-Applications Spring Boot
- Microservices Java
- Applications avec une initialisation lente


## Implémentation pratique

### Atelier 1 : Créer votre première fonction Lambda

**Objectif :** Créer une fonction Lambda qui traite les événements S3.

#### Étape 1 : Créer une fonction Lambda (Python)
```python
# lambda_function.py
import json
import boto3
import urllib.parse

s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Process S3 object uploads
    - Get object metadata
    - Log object details
    - Return success response
    """
    
    print(f"Received event: {json.dumps(event)}")
    
    # Get bucket and key from event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
    
    try:
        # Get object metadata
        response = s3.head_object(Bucket=bucket, Key=key)
        
        metadata = {
            'bucket': bucket,
            'key': key,
            'size': response['ContentLength'],
            'content_type': response.get('ContentType', 'unknown'),
            'last_modified': response['LastModified'].isoformat()
        }
        
        print(f"Object metadata: {json.dumps(metadata)}")
        
        # Process object (example: get first 1000 bytes)
        obj = s3.get_object(Bucket=bucket, Key=key)
        content = obj['Body'].read(1000).decode('utf-8', errors='ignore')
        
        print(f"Content preview: {content[:100]}...")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully processed object',
                'metadata': metadata
            })
        }
        
    except Exception as e:
        print(f"Error processing object: {str(e)}")
        raise e
```
#### Étape 2 : Créer un rôle IAM
```bash
# Create trust policy
cat > lambda-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
ROLE_ARN=$(aws iam create-role \
    --role-name S3ProcessorLambdaRole \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach basic execution policy
aws iam attach-role-policy \
    --role-name S3ProcessorLambdaRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for S3 access
cat > s3-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::my-upload-bucket/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name S3ProcessorLambdaRole \
    --policy-name S3AccessPolicy \
    --policy-document file://s3-policy.json
```
#### Étape 3 : Déployer la fonction Lambda
```bash
# Package function
zip function.zip lambda_function.py

# Create function
FUNCTION_ARN=$(aws lambda create-function \
    --function-name s3-object-processor \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256 \
    --environment Variables="{LOG_LEVEL=INFO}" \
    --tags Environment=Production,Application=DataProcessing \
    --query 'FunctionArn' \
    --output text)

echo "Function ARN: $FUNCTION_ARN"
```
#### Étape 4 : Configurer le déclencheur S3
```bash
# Add permission for S3 to invoke Lambda
aws lambda add-permission \
    --function-name s3-object-processor \
    --statement-id s3-invoke-permission \
    --action lambda:InvokeFunction \
    --principal s3.amazonaws.com \
    --source-arn arn:aws:s3:::my-upload-bucket

# Configure S3 event notification
cat > s3-notification.json <<'EOF'
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "'$FUNCTION_ARN'",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "prefix",
              "Value": "uploads/"
            },
            {
              "Name": "suffix",
              "Value": ".json"
            }
          ]
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-notification-configuration \
    --bucket my-upload-bucket \
    --notification-configuration file://s3-notification.json
```
#### Étape 5 : Test de la fonction
```bash
# Upload test file
echo '{"test": "data"}' > test.json
aws s3 cp test.json s3://my-upload-bucket/uploads/test.json

# Check CloudWatch Logs
aws logs tail /aws/lambda/s3-object-processor --follow
```
### Atelier 2 : Création d'une API REST avec Lambda et API Gateway

**Objectif :** Créer une API REST sans serveur pour gérer les tâches.

#### Étape 1 : Créer une table DynamoDB
```bash
aws dynamodb create-table \
    --table-name TodoItems \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=todoId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=todoId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --tags Key=Environment,Value=Production
```
#### Étape 2 : Créer des fonctions Lambda
```python
# todo_api.py
import json
import boto3
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('TodoItems')

def lambda_handler(event, context):
    """
    Handle CRUD operations for todo items
    """
    
    http_method = event['httpMethod']
    path = event['path']
    
    # Extract user ID from request context (assumes API Gateway authorizer)
    user_id = event['requestContext']['authorizer']['claims']['sub']
    
    try:
        if http_method == 'GET' and path == '/todos':
            return get_todos(user_id)
        
        elif http_method == 'GET' and '/todos/' in path:
            todo_id = path.split('/')[-1]
            return get_todo(user_id, todo_id)
        
        elif http_method == 'POST' and path == '/todos':
            body = json.loads(event['body'])
            return create_todo(user_id, body)
        
        elif http_method == 'PUT' and '/todos/' in path:
            todo_id = path.split('/')[-1]
            body = json.loads(event['body'])
            return update_todo(user_id, todo_id, body)
        
        elif http_method == 'DELETE' and '/todos/' in path:
            todo_id = path.split('/')[-1]
            return delete_todo(user_id, todo_id)
        
        else:
            return response(404, {'error': 'Not found'})
    
    except Exception as e:
        print(f"Error: {str(e)}")
        return response(500, {'error': 'Internal server error'})

def get_todos(user_id):
    """Get all todos for user"""
    result = table.query(
        KeyConditionExpression='userId = :userId',
        ExpressionAttributeValues={':userId': user_id}
    )
    return response(200, result['Items'])

def get_todo(user_id, todo_id):
    """Get specific todo"""
    result = table.get_item(
        Key={'userId': user_id, 'todoId': todo_id}
    )
    
    if 'Item' not in result:
        return response(404, {'error': 'Todo not found'})
    
    return response(200, result['Item'])

def create_todo(user_id, body):
    """Create new todo"""
    todo_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    item = {
        'userId': user_id,
        'todoId': todo_id,
        'title': body['title'],
        'completed': False,
        'createdAt': timestamp,
        'updatedAt': timestamp
    }
    
    table.put_item(Item=item)
    return response(201, item)

def update_todo(user_id, todo_id, body):
    """Update existing todo"""
    timestamp = datetime.utcnow().isoformat()
    
    result = table.update_item(
        Key={'userId': user_id, 'todoId': todo_id},
        UpdateExpression='SET title = :title, completed = :completed, updatedAt = :updatedAt',
        ExpressionAttributeValues={
            ':title': body.get('title'),
            ':completed': body.get('completed', False),
            ':updatedAt': timestamp
        },
        ReturnValues='ALL_NEW'
    )
    
    return response(200, result['Attributes'])

def delete_todo(user_id, todo_id):
    """Delete todo"""
    table.delete_item(
        Key={'userId': user_id, 'todoId': todo_id}
    )
    return response(204, {})

def response(status_code, body):
    """Format API Gateway response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body)
    }
```
#### Étape 3 : Déployer Lambda avec des dépendances
```bash
# Create requirements.txt
cat > requirements.txt <<'EOF'
boto3==1.28.0
EOF

# Install dependencies
pip install -r requirements.txt -t package/

# Copy function code
cp todo_api.py package/

# Create deployment package
cd package
zip -r ../function.zip .
cd ..

# Create Lambda function
aws lambda create-function \
    --function-name todo-api \
    --runtime python3.11 \
    --role $LAMBDA_ROLE_ARN \
    --handler todo_api.lambda_handler \
    --zip-file fileb://function.zip \
    --timeout 10 \
    --memory-size 512 \
    --environment Variables="{TABLE_NAME=TodoItems}"
```
#### Étape 4 : Créer une passerelle API
```bash
# Create REST API
API_ID=$(aws apigateway create-rest-api \
    --name "Todo API" \
    --description "Serverless Todo API" \
    --endpoint-configuration types=REGIONAL \
    --query 'id' \
    --output text)

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --query 'items[0].id' \
    --output text)

# Create /todos resource
TODOS_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part todos \
    --query 'id' \
    --output text)

# Create GET method
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $TODOS_RESOURCE \
    --http-method GET \
    --authorization-type NONE

# Integrate with Lambda
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $TODOS_RESOURCE \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:todo-api/invocations

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name todo-api \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:123456789012:$API_ID/*/*"

# Deploy API
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod

# Get API endpoint
echo "API Endpoint: https://$API_ID.execute-api.us-east-1.amazonaws.com/prod/todos"
```
### Atelier 3 : Lambda programmé par EventBridge

**Objectif :** Créer une fonction Lambda planifiée pour nettoyer les anciennes données.
```python
# cleanup_lambda.py
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
sns = boto3.client('sns')

def lambda_handler(event, context):
    """
    Daily cleanup job:
    - Delete old DynamoDB records
    - Remove old S3 objects
    - Send summary notification
    """
    
    results = {
        'dynamodb_deleted': 0,
        's3_deleted': 0,
        'errors': []
    }
    
    try:
        # Clean up DynamoDB (delete items older than 90 days)
        results['dynamodb_deleted'] = cleanup_dynamodb()
        
        # Clean up S3 (delete objects older than 30 days)
        results['s3_deleted'] = cleanup_s3()
        
        # Send success notification
        send_notification('success', results)
        
    except Exception as e:
        results['errors'].append(str(e))
        send_notification('error', results)
        raise
    
    return results

def cleanup_dynamodb():
    """Delete old DynamoDB items"""
    table = dynamodb.Table('TodoItems')
    cutoff_date = (datetime.now() - timedelta(days=90)).isoformat()
    
    # Scan for old items
    response = table.scan(
        FilterExpression='createdAt < :cutoff',
        ExpressionAttributeValues={':cutoff': cutoff_date}
    )
    
    deleted_count = 0
    for item in response['Items']:
        table.delete_item(
            Key={
                'userId': item['userId'],
                'todoId': item['todoId']
            }
        )
        deleted_count += 1
    
    return deleted_count

def cleanup_s3():
    """Delete old S3 objects"""
    bucket = 'my-temp-bucket'
    cutoff_date = datetime.now() - timedelta(days=30)
    
    paginator = s3.get_paginator('list_objects_v2')
    deleted_count = 0
    
    for page in paginator.paginate(Bucket=bucket, Prefix='temp/'):
        if 'Contents' not in page:
            continue
        
        for obj in page['Contents']:
            if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                s3.delete_object(Bucket=bucket, Key=obj['Key'])
                deleted_count += 1
    
    return deleted_count

def send_notification(status, results):
    """Send SNS notification"""
    topic_arn = 'arn:aws:sns:us-east-1:123456789012:cleanup-notifications'
    
    message = f"""
    Cleanup Job {status.upper()}
    
    Results:
    - DynamoDB items deleted: {results['dynamodb_deleted']}
    - S3 objects deleted: {results['s3_deleted']}
    - Errors: {len(results['errors'])}
    
    {json.dumps(results, indent=2)}
    """
    
    sns.publish(
        TopicArn=topic_arn,
        Subject=f'Cleanup Job {status.upper()}',
        Message=message
    )
```
**Créer une règle EventBridge :**
```bash
# Create rule for daily execution
aws events put-rule \
    --name daily-cleanup \
    --description "Run cleanup Lambda daily at 2 AM UTC" \
    --schedule-expression "cron(0 2 * * ? *)" \
    --state ENABLED

# Add Lambda as target
aws events put-targets \
    --rule daily-cleanup \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:cleanup-lambda"

# Grant EventBridge permission
aws lambda add-permission \
    --function-name cleanup-lambda \
    --statement-id eventbridge-invoke \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:us-east-1:123456789012:rule/daily-cleanup
```
## Connaissances au niveau de la production

### Gestion des erreurs et logique de nouvelle tentative

**Comportement de nouvelle tentative intégré :**


| Type d'appel | Nouvelles tentatives | Intervalle de nouvelle tentative | Prise en charge DLQ |
| :-- | :-- | :-- | :-- |
| Synchrone | Aucun | N/A | Non |
| Asynchrone | 2 | Retard exponentiel | Oui |
| Basé sur le flux | Jusqu'à ce que le succès ou l'expiration des données | Dépend de la source | Oui (SQS/SNS) |

**Configuration des nouvelles tentatives asynchrones :**
```bash
# Configure retry behavior
aws lambda put-function-event-invoke-config \
    --function-name my-function \
    --maximum-retry-attempts 1 \
    --maximum-event-age-in-seconds 3600 \
    --destination-config '{
      "OnSuccess": {
        "Destination": "arn:aws:sqs:us-east-1:123456789012:success-queue"
      },
      "OnFailure": {
        "Destination": "arn:aws:sqs:us-east-1:123456789012:dlq"
      }
    }'
```
**Mise en œuvre de l'idempotence :**
```python
# idempotent_lambda.py
import json
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('IdempotencyStore')

def lambda_handler(event, context):
    """
    Idempotent Lambda function using DynamoDB for deduplication
    """
    
    # Generate idempotency key from event
    idempotency_key = generate_idempotency_key(event)
    
    # Check if already processed
    response = table.get_item(Key={'requestId': idempotency_key})
    
    if 'Item' in response:
        # Already processed - return cached result
        print(f"Request {idempotency_key} already processed")
        return json.loads(response['Item']['result'])
    
    try:
        # Process request
        result = process_request(event)
        
        # Store result with TTL
        ttl = int((datetime.now() + timedelta(hours=24)).timestamp())
        table.put_item(
            Item={
                'requestId': idempotency_key,
                'result': json.dumps(result),
                'processedAt': datetime.now().isoformat(),
                'ttl': ttl
            }
        )
        
        return result
        
    except Exception as e:
        # Don't cache errors
        print(f"Error processing request: {str(e)}")
        raise

def generate_idempotency_key(event):
    """Generate unique key from event"""
    import hashlib
    
    # For API Gateway
    if 'requestContext' in event:
        return event['requestContext']['requestId']
    
    # For S3 events
    if 'Records' in event and event['Records'][0]['eventSource'] == 'aws:s3':
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        etag = record['s3']['object']['eTag']
        return hashlib.sha256(f"{bucket}/{key}/{etag}".encode()).hexdigest()
    
    # Generic fallback
    return hashlib.sha256(json.dumps(event, sort_keys=True).encode()).hexdigest()

def process_request(event):
    """Your business logic here"""
    # Process the request
    return {'status': 'success', 'data': 'processed'}
```
**Modèle de disjoncteur :**
```python
# circuit_breaker.py
import time
import json
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failures detected, blocking requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60, success_threshold=2):
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # seconds
        self.success_threshold = success_threshold
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                print("Circuit breaker: Attempting recovery (HALF_OPEN)")
                self.state = CircuitState.HALF_OPEN
            else:
                raise Exception("Circuit breaker is OPEN - service unavailable")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Handle successful call"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                print("Circuit breaker: Service recovered (CLOSED)")
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
        else:
            self.failure_count = 0
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            print(f"Circuit breaker: Too many failures (OPEN)")
            self.state = CircuitState.OPEN
            self.success_count = 0

# Usage in Lambda
import boto3

external_api_breaker = CircuitBreaker(failure_threshold=3, timeout=30)

def call_external_api(data):
    """Call external API with circuit breaker"""
    # Your API call here
    import requests
    response = requests.post('https://api.example.com/endpoint', json=data)
    response.raise_for_status()
    return response.json()

def lambda_handler(event, context):
    try:
        result = external_api_breaker.call(call_external_api, event['data'])
        return {'statusCode': 200, 'body': json.dumps(result)}
    except Exception as e:
        return {'statusCode': 503, 'body': json.dumps({'error': str(e)})}
```
### Observabilité avancée

**Journalisation structurée avec AWS Lambda Powertools :**
```python
# advanced_logging.py
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext

logger = Logger(service="payment-service")
tracer = Tracer(service="payment-service")
metrics = Metrics(namespace="PaymentService", service="payment-service")

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    """
    Payment processing with comprehensive observability
    """
    
    # Structured logging
    logger.info("Processing payment", extra={
        "payment_id": event.get('paymentId'),
        "amount": event.get('amount'),
        "currency": event.get('currency')
    })
    
    try:
        # Add custom metrics
        metrics.add_metric(
            name="PaymentAttempt",
            unit=MetricUnit.Count,
            value=1
        )
        
        # Process payment with tracing
        result = process_payment(event)
        
        # Log success
        logger.info("Payment successful", extra={
            "payment_id": event.get('paymentId'),
            "transaction_id": result['transactionId']
        })
        
        metrics.add_metric(
            name="PaymentSuccess",
            unit=MetricUnit.Count,
            value=1
        )
        
        metrics.add_metric(
            name="PaymentAmount",
            unit=MetricUnit.None,
            value=event.get('amount', 0)
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.exception("Payment failed", extra={
            "payment_id": event.get('paymentId'),
            "error": str(e)
        })
        
        metrics.add_metric(
            name="PaymentFailure",
            unit=MetricUnit.Count,
            value=1
        )
        
        raise

@tracer.capture_method
def process_payment(event: dict) -> dict:
    """Process payment with distributed tracing"""
    
    # Annotate trace
    tracer.put_annotation(key="PaymentId", value=event.get('paymentId'))
    tracer.put_metadata(key="PaymentDetails", value={
        "amount": event.get('amount'),
        "currency": event.get('currency')
    })
    
    # Call payment gateway
    result = call_payment_gateway(event)
    
    return result

@tracer.capture_method
def call_payment_gateway(event: dict) -> dict:
    """Call external payment gateway"""
    import requests
    
    response = requests.post(
        'https://gateway.example.com/charge',
        json=event,
        timeout=5
    )
    
    response.raise_for_status()
    return response.json()
```
**Requêtes CloudWatch Insights :**
```sql
-- Find errors in last hour
fields @timestamp, @message, errorType, errorMessage
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100

-- Calculate p50, p95, p99 latency
filter @type = "REPORT"
| stats avg(@duration), percentile(@duration, 50), percentile(@duration, 95), percentile(@duration, 99) by bin(5m)

-- Memory usage analysis
filter @type = "REPORT"
| stats max(@memorySize / 1000 / 1000) as provisioned_memory_mb,
    min(@maxMemoryUsed / 1000 / 1000) as min_memory_mb,
    avg(@maxMemoryUsed / 1000 / 1000) as avg_memory_mb,
    max(@maxMemoryUsed / 1000 / 1000) as max_memory_mb
| display provisioned_memory_mb, min_memory_mb, avg_memory_mb, max_memory_mb

-- Find cold starts
filter @type = "REPORT"
| fields @timestamp, @duration, @initDuration
| filter ispresent(@initDuration)
| sort @timestamp desc

-- Cost analysis
filter @type = "REPORT"
| stats sum(@billedDuration) / 1000 / 60 / 60 as total_hours,
    avg(@memorySize) / 1024 as avg_memory_gb,
    count(*) as invocation_count
```
**Intégration des rayons X :**
```python
# xray_integration.py
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

# Patch libraries for automatic instrumentation
patch_all()

def lambda_handler(event, context):
    """
    Lambda with X-Ray tracing
    """
    
    # Custom subsegment
    with xray_recorder.capture('process_order') as subsegment:
        subsegment.put_annotation('order_id', event['orderId'])
        subsegment.put_metadata('order_details', event)
        
        # Process order
        result = process_order(event)
        
        subsegment.put_metadata('result', result)
    
    return result

def process_order(event):
    """Automatically traced by patch_all()"""
    import boto3
    
    # DynamoDB call (automatically traced)
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('Orders')
    
    table.put_item(Item={
        'orderId': event['orderId'],
        'status': 'processing'
    })
    
    # HTTP call (automatically traced)
    import requests
    response = requests.get('https://api.example.com/inventory')
    
    return {'status': 'success'}
```
### Optimisation des performances Lambda

** Mémoire, performances et coût :**
```python
# benchmark_memory.py
import time

def benchmark_performance():
    """
    Test different memory allocations:
    
    128 MB: $0.0000000021 per 100ms, slower CPU
    512 MB: $0.0000000083 per 100ms, ~2x CPU
    1024 MB: $0.0000000167 per 100ms, ~4x CPU
    3008 MB: $0.0000000500 per 100ms, ~12x CPU
    
    Sweet spot often: 1024 MB - 2048 MB
    """
    
    start = time.time()
    
    # CPU-intensive operation
    result = sum(i**2 for i in range(1000000))
    
    duration = time.time() - start
    
    print(f"Duration: {duration:.3f}s")
    print(f"Result: {result}")
    
    return duration

def lambda_handler(event, context):
    """
    Test at different memory settings:
    
    128 MB: 2.5s × $0.0000000021 × 25 = $0.000001313
    1024 MB: 0.3s × $0.0000000167 × 3 = $0.000000150
    
    1024 MB is 8.7x cheaper despite higher rate!
    """
    
    duration = benchmark_performance()
    
    return {
        'duration': duration,
        'memory': context.memory_limit_in_mb,
        'remaining_time': context.get_remaining_time_in_millis()
    }
```
**Regroupement de connexions :**
```python
# connection_pooling.py
import pymysql
import os

# Initialize outside handler (reused across invocations)
connection = None

def get_connection():
    """Reuse database connection"""
    global connection
    
    if connection is None or not connection.open:
        print("Creating new database connection")
        connection = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            connect_timeout=5,
            cursorclass=pymysql.cursors.DictCursor
        )
    else:
        print("Reusing existing connection")
    
    return connection

def lambda_handler(event, context):
    """
    Connection reused across warm invocations
    Cold start: 500ms (connection setup)
    Warm start: 50ms (reuse connection)
    """
    
    conn = get_connection()
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (event['userId'],))
            result = cursor.fetchone()
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        # Connection might be stale, reset
        connection = None
        raise
```
**Chargement paresseux :**
```python
# lazy_loading.py

# Bad - loaded on every cold start even if not needed
import heavy_ml_library
import large_data_processing_lib

def lambda_handler(event, context):
    if event['action'] == 'simple':
        return simple_action()
    else:
        return complex_action()

# Good - lazy import only when needed
def lambda_handler(event, context):
    if event['action'] == 'simple':
        return simple_action()
    else:
        # Only import when needed
        import heavy_ml_library
        import large_data_processing_lib
        return complex_action()

def simple_action():
    """Doesn't need heavy libraries"""
    return {'result': 'simple'}

def complex_action():
    """Uses heavy libraries"""
    # Libraries already imported locally
    return {'result': 'complex'}
```
### Stratégies d'optimisation des coûts

**Plan d'économies de calcul Lambda :**
```
Commit to consistent usage (compute seconds per hour)
Example: Commit to 100 compute-seconds/hour for 1 year

Standard pricing: $0.0000166667 per GB-second
Savings Plan: ~17% discount

Best for: Stable, predictable workloads
```
**Optimiser le temps d'exécution :**
```python
# Cost comparison examples

# Inefficient: Multiple separate calls
def process_items_bad(items):
    """
    100 items × 100ms each = 10,000ms total
    Cost: Higher
    """
    results = []
    for item in items:
        result = boto3.client('dynamodb').get_item(
            TableName='Items',
            Key={'id': item}
        )
        results.append(result)
    return results

# Efficient: Batch operations
def process_items_good(items):
    """
    Batch of 100 items = 200ms total
    Cost: 50x lower
    """
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('Items')
    
    # Batch get (25 items per request)
    results = []
    for i in range(0, len(items), 25):
        batch = items[i:i+25]
        response = dynamodb.batch_get_item(
            RequestItems={
                'Items': {
                    'Keys': [{'id': item} for item in batch]
                }
            }
        )
        results.extend(response['Responses']['Items'])
    
    return results
```
**Mémoire de bonne taille :**
```python
# memory_optimizer.py
def analyze_memory_usage():
    """
    Monitor memory usage to right-size
    
    AWS Lambda Power Tuning tool:
    https://github.com/alexcasalboni/aws-lambda-power-tuning
    
    Tests function at different memory settings
    Finds optimal price/performance point
    """
    
    import json
    
    # Use Lambda Power Tuning State Machine
    step_functions = boto3.client('stepfunctions')
    
    execution = step_functions.start_execution(
        stateMachineArn='arn:aws:states:us-east-1:123456789012:stateMachine:powerTuningStateMachine',
        input=json.dumps({
            'lambdaARN': 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
            'powerValues': [128, 256, 512, 1024, 1536, 2048, 3008],
            'num': 100,
            'payload': {},
            'parallelInvocation': True,
            'strategy': 'cost'
        })
    )
    
    return execution['executionArn']
```
## Conseils \& Bonnes pratiques

### Conseils d'optimisation du démarrage à froid

**Astuce 1 : Utilisez la concurrence provisionnée pour les API sensibles à la latence**
```bash
# Enable provisioned concurrency
aws lambda put-provisioned-concurrency-config \
    --function-name api-function \
    --provisioned-concurrent-executions 10 \
    --qualifier prod

# Use Application Auto Scaling
aws application-autoscaling register-scalable-target \
    --service-namespace lambda \
    --resource-id function:api-function:prod \
    --scalable-dimension lambda:function:ProvisionedConcurrentExecutions \
    --min-capacity 5 \
    --max-capacity 50

aws application-autoscaling put-scaling-policy \
    --service-namespace lambda \
    --resource-id function:api-function:prod \
    --scalable-dimension lambda:function:ProvisionedConcurrentExecutions \
    --policy-name target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-scaling-policy-configuration '{
      "TargetValue": 0.70,
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"
      }
    }'
```
**Astuce 2 : Utilisez Lambda SnapStart pour Java**
```bash
# Enable SnapStart for Java function
aws lambda update-function-configuration \
    --function-name java-function \
    --snap-start ApplyOn=PublishedVersions

# Publish version
aws lambda publish-version \
    --function-name java-function

# Update alias to new version
aws lambda update-alias \
    --function-name java-function \
    --name prod \
    --function-version 2
```
**Astuce 3 : Réduisez la taille du package de déploiement**
```bash
# Use Lambda layers for dependencies
# Create layer
cd python-layer
mkdir python
pip install requests -t python/
zip -r layer.zip python/

aws lambda publish-layer-version \
    --layer-name requests-layer \
    --zip-file fileb://layer.zip \
    --compatible-runtimes python3.11

# Function only contains business logic (small package)
# Attach layer
aws lambda update-function-configuration \
    --function-name my-function \
    --layers arn:aws:lambda:us-east-1:123456789012:layer:requests-layer:1
```
**Astuce 4 : Gardez les fonctions au chaud avec EventBridge**
```bash
# For critical functions, ping every 5 minutes
aws events put-rule \
    --name keep-lambda-warm \
    --schedule-expression "rate(5 minutes)" \
    --state ENABLED

aws events put-targets \
    --rule keep-lambda-warm \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:critical-api","Input"='{"warmup":true}'

# In Lambda, detect warmup
def lambda_handler(event, context):
    if event.get('warmup'):
        return {'status': 'warm'}
    
    # Normal processing
    return process_request(event)
```
### Conseils de configuration de la mémoire

**Astuce 5 : Commencez avec 1 024 Mo pour la plupart des fonctions**

Le meilleur rapport qualité/prix :

- En dessous de 1 024 Mo : CPU plus lent, peut augmenter le coût de la durée
- 1024 Mo : Bon CPU, coût raisonnable
- Au-dessus de 2 048 Mo : rendements décroissants, sauf en cas de limitation du processeur

**Astuce 6 : Surveillez l'utilisation de la mémoire**
```python
# Log memory usage
import os
import psutil

def lambda_handler(event, context):
    # Get memory stats
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    print(f"Memory allocated: {context.memory_limit_in_mb} MB")
    print(f"Memory used: {memory_info.rss / 1024 / 1024:.2f} MB")
    print(f"Memory available: {context.memory_limit_in_mb - (memory_info.rss / 1024 / 1024):.2f} MB")
    
    # Your code here
    result = process_data(event)
    
    # Log final memory usage
    memory_info_after = process.memory_info()
    print(f"Memory after processing: {memory_info_after.rss / 1024 / 1024:.2f} MB")
    
    return result
```
### Conseils Lambda pour les VPC

**Astuce 7 : Utilisez les points de terminaison d'un VPC pour les services AWS**
```bash
# Instead of NAT Gateway ($32/month + data)
# Use VPC endpoints (free for S3/DynamoDB, small cost for others)

# Create S3 endpoint (gateway, free)
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids rtb-12345678

# Create Secrets Manager endpoint (interface, ~$7/month)
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --vpc-endpoint-type Interface \
    --service-name com.amazonaws.us-east-1.secretsmanager \
    --subnet-ids subnet-12345678 subnet-87654321 \
    --security-group-ids sg-12345678
```
**Astuce 8 : placez Lambda et RDS dans la même AZ**
```bash
# Subnet strategy
# Lambda subnets: us-east-1a, us-east-1b
# RDS primary: us-east-1a
# Most invocations will be in same AZ (lower latency)
```
### Conseils de gestion des erreurs

**Astuce 9 : implémentez des files d'attente de lettres mortes**
```bash
# Configure DLQ for asynchronous functions
aws lambda update-function-configuration \
    --function-name my-function \
    --dead-letter-config TargetArn=arn:aws:sqs:us-east-1:123456789012:lambda-dlq

# Process DLQ messages
# Create separate Lambda to process failures
```
**Astuce 10 : utilisez des destinations au lieu de DLQ**
```bash
# Destinations provide more information than DLQ
aws lambda put-function-event-invoke-config \
    --function-name my-function \
    --destination-config '{
      "OnSuccess": {
        "Destination": "arn:aws:sns:us-east-1:123456789012:success-topic"
      },
      "OnFailure": {
        "Destination": "arn:aws:sqs:us-east-1:123456789012:failure-queue"
      }
    }'
```
### Conseils de sécurité

**Astuce 11 : Utilisez le magasin de paramètres pour la configuration**
```python
# Cached parameter retrieval
import boto3
import os
from functools import lru_cache

ssm = boto3.client('ssm')

@lru_cache(maxsize=128)
def get_parameter(name):
    """Cache parameter for Lambda lifetime"""
    response = ssm.get_parameter(
        Name=name,
        WithDecryption=True
    )
    return response['Parameter']['Value']

def lambda_handler(event, context):
    # Retrieved once per container lifetime
    api_key = get_parameter('/myapp/api-key')
    db_password = get_parameter('/myapp/db-password')
    
    # Use parameters
    return process_with_credentials(event, api_key, db_password)
```
**Astuce 12 : Rôles IAM avec moindre privilège**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-specific-bucket/uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"
    }
  ]
}
```
### Conseils de surveillance

**Astuce 13 : Utilisez des métriques personnalisées**
```python
import boto3

cloudwatch = boto3.client('cloudwatch')

def lambda_handler(event, context):
    # Track business metrics
    cloudwatch.put_metric_data(
        Namespace='MyApp/Orders',
        MetricData=[
            {
                'MetricName': 'OrdersProcessed',
                'Value': 1,
                'Unit': 'Count'
            },
            {
                'MetricName': 'OrderAmount',
                'Value': event['amount'],
                'Unit': 'None'
            }
        ]
    )
    
    return process_order(event)
```
**Astuce 14 : Configurer des alarmes composites**
```bash
# Alarm on multiple conditions
aws cloudwatch put-composite-alarm \
    --alarm-name critical-lambda-issues \
    --alarm-rule "ALARM(high-error-rate) OR ALARM(high-throttles) OR ALARM(low-success-rate)" \
    --actions-enabled \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-alerts
```
## Pièges \& Remèdes

### Piège 1 : problèmes de délai d'attente

**Problème :** La fonction Lambda expire avant la fin du travail.

**Pourquoi cela arrive :**

- Délai d'attente par défaut de 3 secondes trop court
- Opérations de longue durée (appels API, requêtes de base de données)
- Ne gère pas les dépendances lentes
- Traitement de grands ensembles de données

**Impact :**

- Demandes échouées
- Traitement partiel des données
- Coûts gaspillés (facturés pour la durée du délai d'attente)
- Réessayez les tempêtes

**Remède :**

**Étape 1 : Identifier les causes d'expiration**
```python
# timeout_debugging.py
import time
import json

def lambda_handler(event, context):
    """
    Log operation durations to identify bottlenecks
    """
    
    start_time = time.time()
    
    # Log remaining time
    print(f"Timeout configured: {context.get_remaining_time_in_millis() / 1000}s")
    
    # Operation 1
    op1_start = time.time()
    result1 = database_query()
    print(f"Database query took: {time.time() - op1_start:.2f}s")
    
    # Operation 2
    op2_start = time.time()
    result2 = external_api_call()
    print(f"API call took: {time.time() - op2_start:.2f}s")
    
    # Operation 3
    op3_start = time.time()
    result3 = data_processing(result1, result2)
    print(f"Processing took: {time.time() - op3_start:.2f}s")
    
    total_time = time.time() - start_time
    remaining = context.get_remaining_time_in_millis() / 1000
    
    print(f"Total execution time: {total_time:.2f}s")
    print(f"Remaining time: {remaining:.2f}s")
    
    if remaining < 1:
        print("WARNING: Close to timeout!")
    
    return {'statusCode': 200}
```
**Étape 2 : Augmentez le délai d'attente de manière appropriée**
```bash
# Analyze CloudWatch Logs to find max duration
# Set timeout = max duration × 1.5 (buffer)

# Update timeout
aws lambda update-function-configuration \
    --function-name my-function \
    --timeout 30  # seconds

# For long-running tasks, use Step Functions instead
```
**Étape 3 : implémenter la gestion des délais d'attente**
```python
# graceful_timeout.py
import signal

class TimeoutError(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutError("Function about to timeout")

def lambda_handler(event, context):
    """
    Handle approaching timeout gracefully
    """
    
    # Set alarm for 80% of remaining time
    remaining_ms = context.get_remaining_time_in_millis()
    alarm_time = int(remaining_ms * 0.8 / 1000)
    
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(alarm_time)
    
    try:
        # Process items
        results = []
        for item in event['items']:
            result = process_item(item)
            results.append(result)
        
        return {
            'statusCode': 200,
            'processed': len(results),
            'results': results
        }
        
    except TimeoutError:
        # Save partial results
        print(f"Timeout approaching, processed {len(results)} items")
        
        # Save state to continue later
        save_checkpoint(results, event['items'][len(results):])
        
        return {
            'statusCode': 206,  # Partial Content
            'processed': len(results),
            'remaining': len(event['items']) - len(results)
        }
    finally:
        signal.alarm(0)  # Cancel alarm
```
**Étape 4 : Utilisez les fonctions Step Functions pour les longs flux de travail**
```json
{
  "Comment": "Long-running workflow with multiple Lambda functions",
  "StartAt": "ProcessBatch1",
  "States": {
    "ProcessBatch1": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-batch",
      "Next": "ProcessBatch2",
      "Retry": [{
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2
      }]
    },
    "ProcessBatch2": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-batch",
      "Next": "Finalize"
    },
    "Finalize": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:finalize",
      "End": true
    }
  }
}
```
**Prévention :**

- Définir le délai d'attente en fonction de la durée réelle + tampon
- Surveiller les mesures de durée
- Implémenter une gestion gracieuse des délais d'attente
- Utilisez Step Functions pour les flux de travail > 15 minutes
- Ajouter des disjoncteurs pour les dépendances externes

***

### Piège 2 : limitation de la concurrence

**Problème :** Lambda a été limité en raison des limites de concurrence, provoquant 429 erreurs.

**Pourquoi cela arrive :**

- Limite de compte (1 000 par défaut) partagée entre toutes les fonctions
- Les pics de trafic dépassent la capacité
- Une fonction consommant toute la concurrence
- Ne pas utiliser la concurrence réservée

**Impact :**

- Requêtes ayant échoué (appels synchrones)
- Délais de traitement (invocations asynchrones)
- Mauvaise expérience utilisateur
- Pannes en cascade

**Remède :**

**Étape 1 : Surveiller l'utilisation de la concurrence**
```bash
# CloudWatch metric: ConcurrentExecutions
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name ConcurrentExecutions \
    --dimensions Name=FunctionName,Value=my-function \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Maximum,Average

# Check for throttles
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Throttles \
    --dimensions Name=FunctionName,Value=my-function \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Sum
```
**Étape 2 : Demander une augmentation de la limite**
```bash
# Request account concurrency increase via AWS Support
# Or through Service Quotas console

aws service-quotas request-service-quota-increase \
    --service-code lambda \
    --quota-code L-B99A9384 \
    --desired-value 5000

# Check current limit
aws lambda get-account-settings
```
**Étape 3 : Définir la concurrence réservée**
```bash
# Protect critical functions
aws lambda put-function-concurrency \
    --function-name critical-api \
    --reserved-concurrent-executions 500

# Limit non-critical functions
aws lambda put-function-concurrency \
    --function-name batch-processor \
    --reserved-concurrent-executions 100
```
**Étape 4 : Mettre en œuvre une contre-pression**
```python
# sqs_backpressure.py
def lambda_handler(event, context):
    """
    SQS with controlled batch size prevents overwhelming Lambda
    """
    
    # Process records with error handling
    successful = []
    failed = []
    
    for record in event['Records']:
        try:
            result = process_record(record)
            successful.append(result)
        except Exception as e:
            print(f"Failed to process record: {e}")
            failed.append({
                'itemIdentifier': record['messageId']
            })
    
    # Return batch item failures (partial batch failure)
    # Failed messages return to queue
    return {
        'batchItemFailures': failed
    }

# Configure event source mapping with smaller batch
# aws lambda update-event-source-mapping \
#     --uuid <mapping-id> \
#     --batch-size 5 \
#     --maximum-batching-window-in-seconds 10
```
**Étape 5 : Utiliser SQS comme tampon**
```
High Traffic → SQS Queue → Lambda (controlled concurrency)
                ↓
         Dead Letter Queue (failed messages)
```

```bash
# Configure maximum concurrency for SQS trigger
aws lambda update-event-source-mapping \
    --uuid mapping-uuid \
    --maximum-concurrency 10  # Limits concurrent Lambda invocations
```
**Prévention :**

- Surveiller les métriques de concurrence
- Définir une concurrence réservée pour les fonctions critiques
- Utilisez SQS pour mettre en mémoire tampon les événements à volume élevé
- La limite de demandes augmente de manière proactive
- Implémenter un backoff exponentiel chez les clients

***

### Piège 3 : problèmes de performances du VPC Lambda

**Problème :** Les fonctions VPC Lambda ont des démarrages à froid lents et une latence élevée.

**Pourquoi cela arrive :**

- Ancien problème : la création d'ENI prenait 10 à 60 secondes
- Actuel : ajoute toujours une latence d'environ 1 seconde
- Configuration incorrecte du sous-réseau/du groupe de sécurité
- Points de terminaison VPC manquants (le trafic passe par NAT)

**Impact :**

- Temps de réponse lents
- Mauvaise expérience utilisateur
- Coûts plus élevés (durée plus longue)
- Problèmes de connectivité

**Remède :**

**Étape 1 : Utiliser les points de terminaison d'un VPC**
```bash
# Create VPC endpoints for AWS services
# Avoids NAT Gateway ($32/month + data charges)

# S3 Gateway Endpoint (free)
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids rtb-12345678 rtb-87654321

# DynamoDB Gateway Endpoint (free)
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --service-name com.amazonaws.us-east-1.dynamodb \
    --route-table-ids rtb-12345678 rtb-87654321

# Secrets Manager Interface Endpoint (~$7/month)
aws ec2 create-vpc-endpoint \
    --vpc-id vpc-12345678 \
    --vpc-endpoint-type Interface \
    --service-name com.amazonaws.us-east-1.secretsmanager \
    --subnet-ids subnet-1 subnet-2 \
    --security-group-ids sg-12345678
```
**Étape 2 : Optimiser les groupes de sécurité**
```bash
# Allow Lambda to access RDS
# Lambda security group: sg-lambda
# RDS security group: sg-rds

# Add inbound rule to RDS security group
aws ec2 authorize-security-group-ingress \
    --group-id sg-rds \
    --protocol tcp \
    --port 5432 \
    --source-group sg-lambda
```
**Étape 3 : Évitez le VPC si cela n'est pas nécessaire**
```python
# Instead of VPC Lambda accessing public API:
# Lambda (VPC) → NAT Gateway → Internet → API

# Better: Non-VPC Lambda
# Lambda (no VPC) → Internet → API

# Use VPC only when accessing private resources:
# - RDS databases
# - ElastiCache
# - Internal APIs
# - Resources without public endpoints
```
**Étape 4 : Utiliser le proxy RDS**
```bash
# RDS Proxy manages connection pooling
# Reduces cold start impact

aws rds create-db-proxy \
    --db-proxy-name myapp-proxy \
    --engine-family POSTGRESQL \
    --auth '[{
      "AuthScheme": "SECRETS",
      "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-secret",
      "IAMAuth": "DISABLED"
    }]' \
    --role-arn arn:aws:iam::123456789012:role/RDSProxyRole \
    --vpc-subnet-ids subnet-1 subnet-2 subnet-3
```

```python
# Connect to RDS Proxy instead of RDS directly
import pymysql

connection = pymysql.connect(
    host='myapp-proxy.proxy-xxx.us-east-1.rds.amazonaws.com',  # Proxy endpoint
    user='admin',
    password=password,
    database='mydb'
)
```
**Prévention :**

- Utilisez VPC uniquement lorsque cela est nécessaire
- Implémenter des points de terminaison VPC pour les services AWS
- Utiliser le proxy RDS pour les connexions à la base de données
- Surveiller les métriques de création d'ENI
- Tester les performances du VPC Lambda avant la production

***

## Résumé du chapitre

AWS Lambda et l'informatique sans serveur représentent un changement fondamental dans la manière dont les applications sont créées et déployées. En éliminant la gestion des serveurs et en fournissant une mise à l'échelle automatique avec une tarification à l'utilisation, Lambda permet aux développeurs de se concentrer sur la logique métier plutôt que sur l'infrastructure. Comprendre le modèle d'exécution de Lambda, les démarrages à froid, la concurrence, la configuration VPC et l'optimisation des coûts est essentiel pour créer des applications sans serveur de qualité production.

**Principaux points à retenir :**

- **Modèle d'exécution Lambda :** Comprendre les démarrages à froid par rapport aux démarrages à chaud, les phases d'initialisation et la réutilisation de l'environnement d'exécution
- **L'allocation de mémoire est importante :** Plus de mémoire = plus de CPU = exécution plus rapide, ce qui entraîne souvent une baisse des coûts malgré des taux par seconde plus élevés
- **Gestion de la concurrence :** Surveillez l'utilisation, définissez la concurrence réservée pour les fonctions critiques, utilisez la concurrence provisionnée pour les charges de travail sensibles à la latence.
- **Considérations sur le VPC :** Utilisez VPC uniquement lorsque cela est nécessaire, implémentez les points de terminaison du VPC, utilisez le proxy RDS pour les bases de données.
- **Gestion des erreurs :** Implémentation de l'idempotence, utilisation des DLQ/destinations, logique de nouvelle tentative, disjoncteurs
- **Optimisation des coûts :** Dimensionner correctement la mémoire, optimiser le temps d'exécution, utiliser des opérations par lots, tirer parti du niveau gratuit
- **Observabilité :** Journalisation structurée, traçage X-Ray, métriques personnalisées, requêtes CloudWatch Insights

Comprendre Lambda en profondeur, de l'optimisation du démarrage à froid aux modèles de gestion des erreurs de production, vous permet de créer des applications évolutives, rentables et basées sur les événements qui exploitent toute la puissance de l'informatique sans serveur.

Au chapitre 8, nous explorerons les services de stockage AWS (S3, EBS, EFS), qui servent souvent de déclencheurs et de magasins de données pour les applications sans serveur.

## Questions de révision

1. **Quelle est la durée maximale d'exécution de Lambda ?**
a) 5 minutes
b) 10 minutes
c) 15 minutes
d) 30 minutes

**Réponse : C** - Le délai d'expiration Lambda maximum est de 900 secondes (15 minutes).

2. **Quel type d'appel API Gateway utilise-t-il ?**
a) Asynchrone
b) Synchrone
c) Basé sur un sondage
d) Piloté par les événements

**Réponse : B** – API Gateway utilise un appel synchrone (attend une réponse).

3. **Quelle est la limite de simultanéité Lambda par défaut par région ?**
une) 100
b) 500
c) 1 000
d) 10 000

**Réponse : C** - La limite par défaut au niveau du compte est de 1 000 exécutions simultanées (limite souple).

4. **Quel moteur d'exécution présente généralement le démarrage à froid le plus rapide ?**
a)Java
b)Python
c) .NET
d) Aller

**Réponse : D** - Go a les démarrages à froid les plus rapides (~ 100-150 ms) en raison de sa nature compilée.

5. **Qu'est-ce que la simultanéité provisionnée élimine ?**
a) Coûts
b) Démarrages à froid
c) Erreurs
d) Délais d'attente

**Réponse : B** – La concurrence provisionnée pré-initialise les environnements, éliminant ainsi les démarrages à froid.

6. **Taille maximale du package de déploiement (avec couches) ?**
a) 50 Mo
b) 100 Mo
c) 250 Mo
d) 500 Mo

**Réponse : C** - La taille totale décompressée (fonction + calques) doit être ≤ 250 Mo.

7. **Quel service devez-vous utiliser pour les flux de travail Lambda > 15 minutes ?**
a) Augmenter le délai d'attente
b) Fonctions d'étape AWS
c) ECS
d) Impossible

**Réponse : B** - Step Functions orchestre des flux de travail de longue durée à l'aide de plusieurs fonctions Lambda.

8. **Que se passe-t-il sur l'accélérateur Lambda avec une invocation synchrone ?**
a) Nouvelle tentative automatique
b) Envoyé à DLQ
c) Renvoie l'erreur 429
d) En file d'attente pour plus tard

**Réponse : C** - Les appels synchrones renvoient immédiatement 429 TooManyRequestsException.

9. **Lambda SnapStart est disponible pour quel runtime ?**
a)Python
b) Node.js
c)Java
d) Tous les environnements d'exécution

**Réponse : C** - SnapStart prend actuellement en charge les environnements d'exécution Java 11, Java 17 et Java 21 (Corretto).

10. **Qu'est-ce qui est vrai à propos du VPC Lambda ?**
a) Toujours plus rapide que les non-VPC
b) Ajoute une latence de démarrage à froid d'environ 1 seconde
c) Transfert de données gratuit
d) Requis pour l'accès S3

**Réponse : B** - VPC Lambda ajoute environ 1 seconde au temps de démarrage à froid.

11. **Allocation maximale de mémoire Lambda ?**
a) 3 008 Mo
b) 5 120 Mo
c) 10 240 Mo
d) Illimité

**Réponse : C** - La mémoire maximale est de 10 240 Mo (10 Go).

12. **Quel type d'appel prend en charge DLQ ?**
a) Synchrone uniquement
b) Asynchrone uniquement
c) Basé sur un sondage uniquement
d) Tous types

**Réponse : B** - Les files d'attente de lettres mortes sont prises en charge pour les appels asynchrones.

13. **Le niveau gratuit Lambda comprend :**
a) 100 000 demandes/mois
b) 500 000 demandes/mois
c) 1 million de demandes/mois
d) 10 millions de demandes/mois

**Réponse : C** - Le niveau gratuit comprend 1 million de requêtes + 400 000 Go-secondes de temps de calcul par mois.

14. **À quelle mémoire Lambda obtient-il 1 vCPU complet ?**
a) 1 024 Mo
b) 1 536 Mo
c) 1 769 Mo
d) 2 048 Mo

**Réponse : C** - Avec 1 769 Mo, Lambda obtient environ 1 vCPU complet.

15. **Quelle fonctionnalité réduit de 10 fois les démarrages à froid de Java ?**
a) Concurrence provisionnée
b) LambdaSnapStart
c) Mémoire plus grande
d) Couches lambda

**Réponse : C** - Lambda SnapStart réduit les démarrages à froid de Java de quelques secondes à quelques millisecondes. Il prend en charge les environnements d'exécution Java 11, 17 et 21.

***
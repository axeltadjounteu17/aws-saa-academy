# Chapitre 22 : Les essentiels d'Amazon SageMaker

##Présentation

L'apprentissage automatique est passé de la recherche universitaire à une infrastructure critique pour l'entreprise, alimentant les moteurs de recommandation, la détection des fraudes, la prévision de la demande et l'automatisation intelligente dans tous les secteurs. Cependant, la création de systèmes de ML de production reste notoirement complexe : les data scientists ont des difficultés avec l'infrastructure, les équipes DevOps manquent d'expertise en ML et les organisations perdent des mois à créer des plateformes personnalisées. Amazon SageMaker élimine cette complexité en fournissant une infrastructure entièrement gérée pour le cycle de vie complet du ML : préparation des données, formation des modèles, déploiement et surveillance. Comprendre SageMaker en profondeur est essentiel pour les architectes de solutions qui conçoivent des applications intelligentes à grande échelle.

Les flux de travail de ML traditionnels nécessitent l'assemblage d'outils disparates : des notebooks Jupyter pour l'expérimentation, des clusters de formation pour le développement de modèles, une orchestration de conteneurs pour le déploiement, des systèmes de surveillance pour la détection des dérives et des pipelines CI/CD pour les mises à jour des modèles. Chaque composant nécessite une configuration, une mise à l'échelle, une sécurité et une maintenance. SageMaker intègre ces fonctionnalités dans une plate-forme unifiée : Studio IDE pour le développement, tâches de formation gérées avec mise à l'échelle automatique, déploiement de modèle en un clic, surveillance intégrée et automatisation MLOps. Ce qui nécessitait auparavant des mois de travail d'infrastructure nécessite désormais des jours de configuration de SageMaker.

Ce chapitre se connecte aux services d'analyse précédents (Kinesis pour les fonctionnalités en temps réel, Glue pour la préparation des données, Athena pour l'ingénierie des fonctionnalités) tout en ajoutant des fonctionnalités spécifiques au ML. SageMaker complète plutôt que ne remplace ces services : vous utiliserez S3 pour les données de formation, Glue pour les transformations de fonctionnalités et Lambda pour l'orchestration d'inférence. Le chapitre couvre le flux de travail ML de SageMaker, depuis la préparation des données jusqu'au déploiement en production, y compris les tâches de formation, les points de terminaison gérés, l'inférence par lots, le registre de modèles, la surveillance, les tests A/B et les modèles MLOps. Qu'il s'agisse de créer votre premier modèle ou de passer à des milliers de prédictions par seconde, la maîtrise de SageMaker permet le ML de production sans complexité d'infrastructure.

## Théorie \&Concepts

### Principes fondamentaux du flux de travail d'apprentissage automatique

**Défis de développement de ML traditionnel :**
```
Typical ML Project Timeline (Traditional Approach):

Months 1-2: Infrastructure Setup
- Provision GPU training clusters
- Configure Jupyter environment
- Set up model versioning
- Build deployment pipeline
- Configure monitoring systems
Problem: 60% of project time on infrastructure, not ML

Months 3-4: Data Preparation
- Extract data from multiple sources
- Clean and transform data
- Engineer features
- Split train/test datasets
Problem: Data scattered across systems, manual processes

Months 5-6: Model Development
- Experiment with algorithms
- Tune hyperparameters
- Track experiments manually
- Retrain multiple times
Problem: No experiment tracking, lost results

Month 7-8: Model Deployment
- Package model in containers
- Set up serving infrastructure
- Configure autoscaling
- Implement monitoring
Problem: DevOps skills required, deployment bottleneck

Month 9+: Maintenance
- Monitor model performance
- Detect data drift
- Retrain periodically
- Update deployments
Problem: Manual monitoring, slow iteration

Result: 9+ months to production, high failure rate
```
**Cycle de vie de SageMaker ML :**
```
SageMaker Accelerated Timeline:

Week 1: Environment Setup
- Launch SageMaker Studio
- Connect data sources (S3, Athena)
- Configure IAM roles
- Install libraries
Benefit: Fully managed, pre-configured

Week 2-3: Data Preparation
- SageMaker Data Wrangler (visual data prep)
- SageMaker Processing Jobs (scale transformations)
- Feature Store (centralized features)
Benefit: Visual tools, automatic scaling

Week 4-5: Model Development
- Built-in algorithms (no code training)
- Automatic Model Tuning (hyperparameter optimization)
- Experiments (automatic tracking)
Benefit: Managed infrastructure, experiment tracking

Week 6: Model Deployment
- One-click endpoint deployment
- Auto-scaling built-in
- Multi-model endpoints (cost optimization)
Benefit: Zero DevOps, production-ready

Week 7+: Production Operations
- Model Monitor (drift detection)
- Pipelines (MLOps automation)
- A/B testing (safe rollouts)
Benefit: Automated monitoring, easy updates

Result: 6-8 weeks to production, higher success rate
```
### Composants d'architecture SageMaker

**Services de base :**
```
1. SageMaker Studio:
   - Web-based IDE
   - Jupyter notebooks
   - Experiment tracking
   - Model registry access
   - Built-in visualizations

2. SageMaker Training:
   - Managed training jobs
   - Distributed training
   - Spot instance support
   - Automatic model tuning
   - Built-in algorithms

3. SageMaker Inference:
   - Real-time endpoints
   - Batch transform jobs
   - Serverless inference
   - Multi-model endpoints
   - Asynchronous inference

4. SageMaker Data Wrangler:
   - Visual data preparation
   - 300+ transformations
   - Built-in analysis
   - Export to training

5. SageMaker Feature Store:
   - Centralized feature repository
   - Online/offline storage
   - Feature versioning
   - Time-travel queries

6. SageMaker Model Registry:
   - Model versioning
   - Approval workflows
   - Deployment tracking
   - Metadata management

7. SageMaker Pipelines:
   - ML workflow orchestration
   - CI/CD for ML
   - Automated retraining
   - Model promotion

8. SageMaker Model Monitor:
   - Data quality monitoring
   - Model quality monitoring
   - Bias detection
   - Explainability

Complete ML Workflow Architecture:

Data Sources (S3, RDS, Athena)
    ↓
Data Wrangler (Transform)
    ↓
Feature Store (Centralize)
    ↓
Training Job (Build Model)
    ↓
Model Registry (Version)
    ↓
Endpoint (Deploy)
    ↓
Model Monitor (Observe)
    ↓
Pipelines (Automate)
```
**Infrastructure de formation :**
```
SageMaker Training Jobs:

Instance Types:
- CPU: ml.m5, ml.c5 (general purpose)
- GPU: ml.p3, ml.p4 (deep learning)
- Accelerated: ml.g4dn (cost-effective GPU)
- Inference-optimized: ml.inf1 (AWS Inferentia)

Training Options:

1. Single Instance:
   - One training instance
   - Simplest configuration
   - Sufficient for most models
   Example: ml.p3.2xlarge (1 GPU, 8 vCPU, 61 GB RAM)

2. Distributed Training:
   - Multiple instances
   - Data parallelism (split data)
   - Model parallelism (split model)
   - Automatic orchestration
   Example: 4× ml.p3.16xlarge (32 GPUs total)

3. Spot Training:
   - Use EC2 Spot instances
   - 70-90% cost savings
   - Automatic checkpointing
   - Handles interruptions
   Example: ml.p3.2xlarge Spot ($1.23/hr vs $3.06/hr)

Training Job Components:

Algorithm Source:
- Built-in algorithms (XGBoost, Linear Learner, etc.)
- Custom containers (bring your own)
- Marketplace algorithms
- Framework containers (TensorFlow, PyTorch, sklearn)

Input Data:
- S3 location (training data)
- Input mode: File (download) or Pipe (stream)
- Content type: CSV, JSON, RecordIO, Parquet

Output:
- Model artifacts (to S3)
- Logs (CloudWatch)
- Metrics (CloudWatch)

Hyperparameters:
- Algorithm-specific settings
- Training configuration
- Model architecture parameters

Training Job Lifecycle:

1. Job Creation:
   - Configure instance type/count
   - Specify algorithm/container
   - Set hyperparameters
   - Define input/output S3 paths

2. Instance Provisioning:
   - Launch training instances
   - Download training container
   - Download training data from S3

3. Training Execution:
   - Initialize algorithm
   - Load data (batches)
   - Train model (epochs)
   - Emit metrics to CloudWatch

4. Model Artifacts:
   - Serialize trained model
   - Upload to S3 (model.tar.gz)
   - Save training metadata

5. Cleanup:
   - Terminate training instances
   - Preserve logs/metrics
   - Bill for instance hours used

Cost Optimization:

On-Demand Training:
ml.p3.2xlarge × 2 hours = $6.12
Predictable, guaranteed capacity

Spot Training:
ml.p3.2xlarge (Spot) × 2 hours = $2.46 (60% savings)
Checkpointing handles interruptions
Retry automatically on interruption

Recommendation: Always use Spot for training (built-in fault tolerance)
```
**Infrastructure d'inférence :**
```
SageMaker Inference Options:

1. Real-Time Endpoints:
   - Persistent HTTPS endpoint
   - Millisecond latency
   - Auto-scaling supported
   - Charged per hour (instance running)

Use Cases:
- User-facing predictions
- Interactive applications
- Low-latency requirements
- Unpredictable request patterns

Configuration:
Endpoint → Endpoint Configuration → Model(s)
Instance: ml.t2.medium to ml.p4d.24xlarge
Scaling: Min 1, Max 10 instances
Auto-scaling: Target metric (invocations/minute)

Cost:
ml.t2.medium: $0.065/hour = $47/month
ml.m5.large: $0.134/hour = $98/month
Always running (even if no requests)

2. Serverless Inference:
   - Pay per request (no idle cost)
   - Auto-scaling (0 to thousands)
   - Cold start latency (~10 seconds first request)
   - Memory: 1-6 GB

Use Cases:
- Intermittent traffic
- Cost optimization
- Unpredictable workloads
- Non-latency-critical

Cost:
$0.20 per 1 million requests
+ $0.0016 per GB-second compute
No idle cost (huge savings for low traffic)

Comparison (1,000 requests/day):
Real-time ml.t2.medium: $47/month
Serverless: $0.006/month (7,833× cheaper!)

3. Batch Transform:
   - Offline batch predictions
   - Process large datasets
   - Automatic scaling
   - Cost-effective (no endpoint)

Use Cases:
- Periodic predictions (nightly)
- Large-scale inference
- Scoring entire datasets
- Non-real-time requirements

Process:
Input: S3 dataset (millions of records)
    ↓
Batch Transform Job (temporary instances)
    ↓
Output: S3 predictions (results file)
    ↓
Instances terminated (no ongoing cost)

Cost:
Pay only for job duration
Example: 10,000 records, 30 minutes
ml.m5.large: $0.067 (one-time)

4. Asynchronous Inference:
   - Queue-based inference
   - Handles large payloads (1 GB)
   - Auto-scaling to zero
   - Near real-time (seconds to minutes)

Use Cases:
- Large payloads (images, videos)
- Can tolerate seconds latency
- Spiky traffic patterns
- Cost optimization

Process:
Request → SQS Queue → Endpoint → S3 Results
Auto-scales: 0 to N instances
Charged only when processing

5. Multi-Model Endpoints:
   - Host multiple models on one endpoint
   - Models loaded dynamically
   - Cost optimization (shared infrastructure)
   - Millisecond model switching

Use Cases:
- Many small models
- Per-tenant models
- A/B testing multiple models
- Cost-constrained scenarios

Example:
Single ml.m5.xlarge endpoint hosts 100 models
Cost: $0.269/hour (one endpoint)
vs 100 endpoints: $26.90/hour (100× more expensive)

Inference Decision Tree:

Latency < 100ms required?
└─ Yes → Real-time Endpoint

Traffic intermittent (<1000/day)?
└─ Yes → Serverless Inference

Batch processing acceptable?
└─ Yes → Batch Transform

Large payloads (>6 MB)?
└─ Yes → Asynchronous Inference

Many small models?
└─ Yes → Multi-Model Endpoint
```
### Algorithmes intégrés
```
SageMaker Algorithms (No Code Required):

Supervised Learning:

1. XGBoost:
   - Gradient boosting
   - Tabular data (CSV)
   - Classification/regression
   - Fast training, high accuracy
   Use: General purpose, structured data

2. Linear Learner:
   - Linear models
   - Binary/multiclass classification
   - Regression
   - Distributed training
   Use: Baseline models, interpretability

3. Factorization Machines:
   - Sparse data
   - Click-through prediction
   - Recommendation systems
   Use: High-dimensional sparse features

Unsupervised Learning:

4. K-Means:
   - Clustering
   - Customer segmentation
   - Anomaly detection
   Use: Grouping similar data points

5. Principal Component Analysis (PCA):
   - Dimensionality reduction
   - Feature extraction
   - Compression
   Use: Reduce feature count

6. Random Cut Forest:
   - Anomaly detection
   - Outlier identification
   Use: Fraud detection, monitoring

Computer Vision:

7. Image Classification:
   - ResNet, AlexNet, VGG
   - Transfer learning
   - Pre-trained models
   Use: Image categorization

8. Object Detection:
   - SSD (Single Shot Detector)
   - Bounding boxes
   - Multiple objects per image
   Use: Object localization

9. Semantic Segmentation:
   - Pixel-level classification
   - FCN, PSP, DeepLabV3
   Use: Image segmentation tasks

Natural Language Processing:

10. BlazingText:
    - Word2Vec, text classification
    - Fast training (GPU-accelerated)
    - Multi-label classification
    Use: Sentiment analysis, categorization

11. Sequence-to-Sequence:
    - Machine translation
    - Text summarization
    - LSTM/RNN-based
    Use: Language translation

12. Object2Vec:
    - Embeddings for objects
    - Recommendation systems
    - Similarity learning
    Use: Item recommendations

Framework Support:

Bring Your Own Container:
- TensorFlow
- PyTorch
- Scikit-learn
- Keras
- MXNet
- Any custom framework

Framework Containers (Managed):
- Pre-built containers
- Version compatibility maintained
- GPU optimization included
- Easy script mode
```
### Registre des modèles et gestion des versions
```
SageMaker Model Registry:

Purpose: Centralized model management

Model Package:
- Trained model artifacts (S3)
- Inference container image
- Model metadata
- Approval status
- Lineage information

Model Versions:
Version 1 (Approved) → Production
Version 2 (PendingApproval) → Staging
Version 3 (Draft) → Development

Approval Workflow:

1. Register Model:
   - Training job completes
   - Model registered automatically
   - Status: PendingManualApproval

2. Review Model:
   - Check metrics (accuracy, latency)
   - Review lineage (data, code, params)
   - Test on staging endpoint

3. Approve Model:
   - Change status: Approved
   - Trigger deployment pipeline
   - Update production endpoint

4. Monitor Model:
   - Track performance
   - Compare to previous versions
   - Rollback if degraded

Model Groups:
Organize related models (same problem, different versions)

Example:
Model Group: fraud-detection
├── Version 1: XGBoost (Approved, Production)
├── Version 2: Neural Network (Rejected)
└── Version 3: XGBoost v2 (PendingApproval)

Lineage Tracking:

Complete history:
- Training data (S3 location)
- Training job (ID, parameters)
- Training code (Git commit)
- Hyperparameters (JSON)
- Metrics (accuracy, AUC, etc.)
- Model artifacts (S3 path)
- Approval history (who, when)

Benefits:
✓ Reproducibility (recreate any model)
✓ Compliance (audit trail)
✓ Rollback (previous versions)
✓ Comparison (version performance)
```
### Modèle de tarification SageMaker
```
Pricing Components:

1. Studio Notebooks:
   - ml.t3.medium: $0.05/hour
   - ml.m5.large: $0.115/hour
   - Charged only when running
   - Auto-shutdown after idle time

2. Training:
   - Instance hours (per second billing)
   - ml.m5.xlarge: $0.269/hour
   - ml.p3.2xlarge (GPU): $3.825/hour
   - Spot: 70-90% discount

3. Real-Time Inference:
   - Instance hours (per second billing)
   - ml.t2.medium: $0.065/hour
   - Always running cost
   - Auto-scaling charges additional instances

4. Serverless Inference:
   - $0.20 per 1M requests
   - $0.0016 per GB-second compute
   - No idle cost

5. Batch Transform:
   - Instance hours during job
   - No idle cost

6. Data:
   - S3 storage (standard rates)
   - Data transfer (inter-region)

Cost Example (Small Production Workload):

Monthly Costs:
Development:
- Studio notebook (20 hours): $2.30
- Training (5 jobs, 2 hours each): $13.45

Production:
- Endpoint (1× ml.t2.medium): $47/month
- Predictions (100K/month): Included
- Model Monitor: $10/month
- Data storage (100 GB): $2.30/month

Total: ~$75/month

Cost Optimization:
- Use Spot training (70% savings)
- Serverless for low traffic
- Multi-model endpoints
- Batch transform for batch jobs
- Auto-shutdown notebooks
```
## Implémentation pratique

### Atelier 1 : Modèle de base de classification d'images

**Objectif :** Former et déployer un modèle de classification d'images à l'aide d'un algorithme intégré.

**Prérequis :**

- Compte AWS avec accès SageMaker
- Exemple d'ensemble de données d'image dans S3

**Étape 1 : Préparer les données**
```bash
# Create S3 bucket for training data
aws s3 mb s3://my-sagemaker-training-data

# Upload training images (organized by class)
aws s3 sync ./training_images/ s3://my-sagemaker-training-data/images/train/
aws s3 sync ./validation_images/ s3://my-sagemaker-training-data/images/validation/

# Structure:
# s3://my-sagemaker-training-data/images/
# ├── train/
# │   ├── cats/
# │   │   ├── img1.jpg
# │   │   └── img2.jpg
# │   └── dogs/
# │       ├── img1.jpg
# │       └── img2.jpg
# └── validation/
#     ├── cats/
#     └── dogs/
```
**Étape 2 : Créer une tâche de formation (AWS Console)**

1. Accédez à la console SageMaker
2. Choisissez **Formation** → **Tâches de formation** → **Créer une tâche de formation**.
3. Configurez le travail :
    - Nom du travail : `image-classification-demo`
    - Rôle IAM : créer un nouveau rôle (autoriser l'accès S3)
    - Source de l'algorithme : algorithme intégré
    - Algorithme : Classification d'images
4. Configurez les hyperparamètres :
```
num_classes: 2
num_training_samples: 1000
mini_batch_size: 32
epochs: 10
learning_rate: 0.001
```
5. Configurez les données d'entrée :
    - Nom de la chaîne : `formation`
    - Emplacement S3 : `s3://my-sagemaker-training-data/images/train/`
    - Type de contenu : `application/x-image`
    - Nom du canal : `validation`
    - Emplacement S3 : `s3://my-sagemaker-training-data/images/validation/`
6. Configurez la sortie :
    - Compartiment S3 : `s3://my-sagemaker-training-data/models/`
7. Configurez les ressources :
    - Type d'instance : `ml.p3.2xlarge` (GPU)
    - Nombre d'instances : 1
    - Taille du volume : 30 Go
    - Durée d'exécution maximale : 3600 secondes
8. Cliquez sur **Créer une tâche de formation**

**Étape 3 : tâche de formation (alternative AWS CLI)**
```python
import boto3
import sagemaker
from sagemaker import get_execution_role

# Initialize
sagemaker_session = sagemaker.Session()
role = get_execution_role()
region = boto3.Session().region_name

# Get built-in algorithm image
from sagemaker.image_uris import retrieve
image_uri = retrieve('image-classification', region)

# Configure training job
estimator = sagemaker.estimator.Estimator(
    image_uri=image_uri,
    role=role,
    instance_count=1,
    instance_type='ml.p3.2xlarge',
    volume_size=30,
    max_run=3600,
    output_path='s3://my-sagemaker-training-data/models/',
    sagemaker_session=sagemaker_session
)

# Set hyperparameters
estimator.set_hyperparameters(
    num_classes=2,
    num_training_samples=1000,
    mini_batch_size=32,
    epochs=10,
    learning_rate=0.001
)

# Define input data
train_data = sagemaker.inputs.TrainingInput(
    's3://my-sagemaker-training-data/images/train/',
    content_type='application/x-image'
)

validation_data = sagemaker.inputs.TrainingInput(
    's3://my-sagemaker-training-data/images/validation/',
    content_type='application/x-image'
)

# Start training
estimator.fit({
    'train': train_data,
    'validation': validation_data
})
```
**Étape 4 : Surveiller les progrès de la formation**
```python
# View training job status
estimator.latest_training_job.describe()

# Stream logs
estimator.latest_training_job.logs()

# Get metrics from CloudWatch
import boto3

cloudwatch = boto3.client('cloudwatch')

# Query training metrics
metrics = cloudwatch.get_metric_statistics(
    Namespace='/aws/sagemaker/TrainingJobs',
    MetricName='train:accuracy',
    Dimensions=[
        {'Name': 'TrainingJobName', 'Value': estimator.latest_training_job.name}
    ],
    StartTime=datetime.utcnow() - timedelta(hours=1),
    EndTime=datetime.utcnow(),
    Period=60,
    Statistics=['Average']
)
```
**Étape 5 : Déployer le modèle sur le point de terminaison**
```python
# Deploy to real-time endpoint
predictor = estimator.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.large',
    endpoint_name='image-classification-endpoint'
)

# Endpoint creation takes 5-10 minutes
# Status: Creating → InService
```
**Étape 6 : Faire des prédictions**
```python
import json
import boto3

# Read test image
with open('test_image.jpg', 'rb') as f:
    image_bytes = f.read()

# Invoke endpoint
runtime = boto3.client('sagemaker-runtime')

response = runtime.invoke_endpoint(
    EndpointName='image-classification-endpoint',
    ContentType='application/x-image',
    Body=image_bytes
)

# Parse response
result = json.loads(response['Body'].read().decode())
print(f"Predictions: {result}")
# Output: [0.85, 0.15] (85% cat, 15% dog)
```
**Étape 7 : Ressources de nettoyage**
```python
# Delete endpoint (stop charges)
predictor.delete_endpoint()

# Delete model
predictor.delete_model()

# Training artifacts remain in S3 (manual deletion if needed)
```
**Résultats attendus :**

- Le travail de formation se termine en 10 à 20 minutes
- Le modèle atteint une précision de validation > 80 %
- Le point de terminaison répond avec des prédictions en <100 ms
- Coût total : ~\$0,70 (formation) + \$0,10 (test de déploiement) = \$0,80


### Lab 2 : Modèle personnalisé avec scikit-learn

**Objectif :** Entraînez un modèle scikit-learn personnalisé et déployez-le en mode script.

**Étape 1 : Préparer le script de formation**
```python
# train.py
import argparse
import joblib
import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

def parse_args():
    parser = argparse.ArgumentParser()
    
    # Hyperparameters
    parser.add_argument('--n-estimators', type=int, default=100)
    parser.add_argument('--max-depth', type=int, default=10)
    
    # SageMaker directories
    parser.add_argument('--model-dir', type=str, default=os.environ['SM_MODEL_DIR'])
    parser.add_argument('--train', type=str, default=os.environ['SM_CHANNEL_TRAIN'])
    parser.add_argument('--test', type=str, default=os.environ['SM_CHANNEL_TEST'])
    
    return parser.parse_args()

def load_data(data_dir):
    """Load CSV data"""
    data = pd.read_csv(os.path.join(data_dir, 'data.csv'))
    X = data.drop('target', axis=1)
    y = data['target']
    return X, y

if __name__ == '__main__':
    args = parse_args()
    
    # Load data
    print("Loading training data...")
    X_train, y_train = load_data(args.train)
    X_test, y_test = load_data(args.test)
    
    # Train model
    print(f"Training RandomForest with {args.n_estimators} estimators...")
    model = RandomForestClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    train_acc = accuracy_score(y_train, model.predict(X_train))
    test_acc = accuracy_score(y_test, model.predict(X_test))
    
    print(f"Train accuracy: {train_acc:.4f}")
    print(f"Test accuracy: {test_acc:.4f}")
    
    # Save model
    model_path = os.path.join(args.model_dir, 'model.joblib')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")
```
**Étape 2 : Créer un script d'inférence**
```python
# inference.py
import joblib
import os
import pandas as pd

def model_fn(model_dir):
    """Load model for inference"""
    model = joblib.load(os.path.join(model_dir, 'model.joblib'))
    return model

def input_fn(request_body, content_type='text/csv'):
    """Parse input data"""
    if content_type == 'text/csv':
        df = pd.read_csv(pd.StringIO(request_body), header=None)
        return df
    else:
        raise ValueError(f"Unsupported content type: {content_type}")

def predict_fn(input_data, model):
    """Generate predictions"""
    predictions = model.predict(input_data)
    return predictions

def output_fn(prediction, accept='application/json'):
    """Format output"""
    if accept == 'application/json':
        import json
        return json.dumps({'predictions': prediction.tolist()})
    else:
        raise ValueError(f"Unsupported accept type: {accept}")
```
**Étape 3 : Lancer la tâche de formation**
```python
from sagemaker.sklearn import SKLearn

# Create SKLearn estimator
sklearn_estimator = SKLearn(
    entry_point='train.py',
    source_dir='./scripts/',  # Directory containing train.py
    role=role,
    instance_type='ml.m5.xlarge',
    instance_count=1,
    framework_version='1.0-1',
    py_version='py3',
    hyperparameters={
        'n-estimators': 200,
        'max-depth': 15
    }
)

# Start training
sklearn_estimator.fit({
    'train': 's3://my-bucket/train/',
    'test': 's3://my-bucket/test/'
})
```
**Étape 4 : Déployer avec un code d'inférence personnalisé**
```python
# Deploy model
predictor = sklearn_estimator.deploy(
    initial_instance_count=1,
    instance_type='ml.t2.medium',
    endpoint_name='sklearn-custom-endpoint'
)

# Make prediction
import numpy as np

test_data = np.array([[1.0, 2.0, 3.0, 4.0]])
prediction = predictor.predict(test_data)
print(f"Prediction: {prediction}")
```
### Lab 3 : Transformation par lots pour l'inférence à grande échelle

**Objectif :** Traitez des milliers d'enregistrements à l'aide de la transformation par lots.

**Étape 1 : Préparer les données d'entrée par lots**
```python
import pandas as pd

# Create sample data (1000 records)
data = pd.DataFrame({
    'feature1': np.random.randn(1000),
    'feature2': np.random.randn(1000),
    'feature3': np.random.randn(1000)
})

# Save to S3
data.to_csv('s3://my-bucket/batch-input/data.csv', index=False, header=False)
```
**Étape 2 : Créer une tâche de transformation par lots**
```python
# Create transformer from trained model
transformer = estimator.transformer(
    instance_count=1,
    instance_type='ml.m5.large',
    strategy='MultiRecord',  # Process multiple records per request
    max_payload=6,  # MB
    max_concurrent_transforms=4,  # Parallel requests
    output_path='s3://my-bucket/batch-output/'
)

# Start batch transform
transformer.transform(
    data='s3://my-bucket/batch-input/data.csv',
    content_type='text/csv',
    split_type='Line',  # Process line-by-line
    wait=True  # Wait for completion
)

print(f"Transform job complete!")
print(f"Output: {transformer.output_path}")
```
**Étape 3 : Récupérer les résultats**
```python
# Download results
import boto3

s3 = boto3.client('s3')

# Results file: data.csv.out
s3.download_file(
    'my-bucket',
    'batch-output/data.csv.out',
    'predictions.csv'
)

# Parse predictions
predictions = pd.read_csv('predictions.csv', header=None)
print(f"Processed {len(predictions)} predictions")
print(predictions.head())
```
**Résultats attendus :**

- 1000 enregistrements traités en 2 à 5 minutes
- Coût : ~\$0,05 (5 minutes × ml.m5.large)
- Sortie : fichier CSV avec prédictions
- Nettoyage automatique : instances terminées après la tâche


## Connaissances au niveau de la production

### MLOps avec les pipelines SageMaker

**Flux de travail automatisé de ML :**
```python
from sagemaker.workflow.pipeline import Pipeline
from sagemaker.workflow.steps import ProcessingStep, TrainingStep, CreateModelStep
from sagemaker.workflow.conditions import ConditionGreaterThanOrEqualTo
from sagemaker.workflow.condition_step import ConditionStep
from sagemaker.workflow.parameters import ParameterInteger, ParameterString

# Define parameters
accuracy_threshold = ParameterInteger(name="AccuracyThreshold", default_value=80)
instance_type = ParameterString(name="TrainingInstanceType", default_value="ml.m5.xlarge")

# Step 1: Data Processing
from sagemaker.processing import ScriptProcessor

processor = ScriptProcessor(
    image_uri='<processing-container>',
    role=role,
    instance_type='ml.m5.large',
    instance_count=1
)

processing_step = ProcessingStep(
    name="PreprocessData",
    processor=processor,
    code='preprocessing.py',
    inputs=[
        ProcessingInput(source='s3://raw-data/', destination='/opt/ml/processing/input')
    ],
    outputs=[
        ProcessingOutput(output_name='train', source='/opt/ml/processing/train'),
        ProcessingOutput(output_name='test', source='/opt/ml/processing/test')
    ]
)

# Step 2: Model Training
training_step = TrainingStep(
    name="TrainModel",
    estimator=estimator,
    inputs={
        'train': processing_step.properties.ProcessingOutputConfig.Outputs['train'].S3Output.S3Uri,
        'test': processing_step.properties.ProcessingOutputConfig.Outputs['test'].S3Output.S3Uri
    }
)

# Step 3: Model Evaluation
from sagemaker.processing import ScriptProcessor

eval_processor = ScriptProcessor(
    image_uri='<eval-container>',
    role=role,
    instance_type='ml.m5.large',
    instance_count=1
)

eval_step = ProcessingStep(
    name="EvaluateModel",
    processor=eval_processor,
    code='evaluation.py',
    inputs=[
        ProcessingInput(
            source=training_step.properties.ModelArtifacts.S3ModelArtifacts,
            destination='/opt/ml/processing/model'
        ),
        ProcessingInput(
            source=processing_step.properties.ProcessingOutputConfig.Outputs['test'].S3Output.S3Uri,
            destination='/opt/ml/processing/test'
        )
    ],
    outputs=[
        ProcessingOutput(output_name='evaluation', source='/opt/ml/processing/evaluation')
    ]
)

# Step 4: Conditional Model Registration
from sagemaker.model_metrics import MetricsSource, ModelMetrics

model_metrics = ModelMetrics(
    model_statistics=MetricsSource(
        s3_uri=eval_step.properties.ProcessingOutputConfig.Outputs['evaluation'].S3Output.S3Uri,
        content_type='application/json'
    )
)

register_step = RegisterModel(
    name="RegisterModel",
    estimator=estimator,
    model_data=training_step.properties.ModelArtifacts.S3ModelArtifacts,
    content_types=["text/csv"],
    response_types=["text/csv"],
    inference_instances=["ml.t2.medium", "ml.m5.large"],
    transform_instances=["ml.m5.large"],
    model_package_group_name="MyModelPackageGroup",
    model_metrics=model_metrics
)

# Condition: Register only if accuracy >= threshold
condition = ConditionGreaterThanOrEqualTo(
    left=eval_step.properties.ProcessingOutputConfig.Outputs['evaluation'].S3Output.S3Uri,
    right=accuracy_threshold
)

condition_step = ConditionStep(
    name="CheckAccuracy",
    conditions=[condition],
    if_steps=[register_step],
    else_steps=[]
)

# Create Pipeline
pipeline = Pipeline(
    name="MLOpsPipeline",
    parameters=[accuracy_threshold, instance_type],
    steps=[processing_step, training_step, eval_step, condition_step]
)

# Create/update pipeline
pipeline.upsert(role_arn=role)

# Execute pipeline
execution = pipeline.start()
```
**Avantages des pipelines :**

- Recyclage automatisé sur de nouvelles données
- Déploiement de modèle conditionnel
- Contrôle de version (code, données, modèles)
- Reproductibilité (lignée exacte)
- Intégration CI/CD (déclencheur depuis Git)


### Surveillance du modèle en production

**Configuration du moniteur de modèle SageMaker :**
```python
from sagemaker.model_monitor import DataCaptureConfig, DefaultModelMonitor

# Enable data capture on endpoint
data_capture_config = DataCaptureConfig(
    enable_capture=True,
    sampling_percentage=100,  # Capture 100% of requests
    destination_s3_uri='s3://my-bucket/data-capture',
    capture_options=["Input", "Output"]  # Capture both
)

# Deploy endpoint with data capture
predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.large',
    data_capture_config=data_capture_config
)

# Create baseline from training data
from sagemaker.model_monitor import DefaultModelMonitor

monitor = DefaultModelMonitor(
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge',
    volume_size_in_gb=20,
    max_runtime_in_seconds=3600
)

# Generate baseline statistics
monitor.suggest_baseline(
    baseline_dataset='s3://my-bucket/training-data/train.csv',
    dataset_format=DatasetFormat.csv(header=False),
    output_s3_uri='s3://my-bucket/baseline'
)

# Schedule monitoring
from sagemaker.model_monitor import CronExpressionGenerator

monitor.create_monitoring_schedule(
    monitor_schedule_name='daily-monitor',
    endpoint_input=predictor.endpoint_name,
    output_s3_uri='s3://my-bucket/monitoring-results',
    statistics=monitor.baseline_statistics(),
    constraints=monitor.suggested_constraints(),
    schedule_cron_expression=CronExpressionGenerator.daily(),
    enable_cloudwatch_metrics=True
)
```
**Mesures de surveillance :**

- Dérive des données (changements de distribution des fonctionnalités)
- Qualité des données (valeurs manquantes, changements de type)
- Qualité du modèle (dégradation de la précision)
- Dérive de biais (métriques d'équité)

**Alertes en cas de violations :**
```python
# CloudWatch alarm for data drift
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_alarm(
    AlarmName='ModelDataDrift',
    MetricName='feature_baseline_drift_distance',
    Namespace='aws/sagemaker/Endpoints/data-metrics',
    Statistic='Average',
    Period=3600,
    EvaluationPeriods=1,
    Threshold=0.1,  # Alert if drift > 0.1
    ComparisonOperator='GreaterThanThreshold',
    AlarmActions=['arn:aws:sns:region:account:topic']
)
```
### Tests A/B et déploiements Canary

**Point de terminaison à variantes multiples :**
```python
# Deploy variant A (current model)
variant_a = ProductionVariant(
    model_name='model-v1',
    variant_name='VariantA',
    instance_type='ml.m5.large',
    initial_instance_count=2,
    initial_variant_weight=90  # 90% of traffic
)

# Deploy variant B (new model)
variant_b = ProductionVariant(
    model_name='model-v2',
    variant_name='VariantB',
    instance_type='ml.m5.large',
    initial_instance_count=1,
    initial_variant_weight=10  # 10% of traffic
)

# Create endpoint with both variants
endpoint_config = sagemaker_client.create_endpoint_config(
    EndpointConfigName='ab-test-config',
    ProductionVariants=[variant_a, variant_b]
)

# Traffic routing happens automatically
# Monitor metrics per variant

# Gradually shift traffic to variant B
sagemaker_client.update_endpoint_weights_and_capacities(
    EndpointName='ab-test-endpoint',
    DesiredWeightsAndCapacities=[
        {'VariantName': 'VariantA', 'DesiredWeight': 50},
        {'VariantName': 'VariantB', 'DesiredWeight': 50}
    ]
)

# After validation, full cutover
sagemaker_client.update_endpoint_weights_and_capacities(
    EndpointName='ab-test-endpoint',
    DesiredWeightsAndCapacities=[
        {'VariantName': 'VariantA', 'DesiredWeight': 0},
        {'VariantName': 'VariantB', 'DesiredWeight': 100}
    ]
)
```
**Déploiement fantôme :**
```python
# Deploy shadow variant (receives traffic but results not returned)
shadow_variant = ProductionVariant(
    model_name='model-v3',
    variant_name='ShadowVariant',
    instance_type='ml.m5.large',
    initial_instance_count=1,
    initial_variant_weight=0  # No traffic returned to users
)

# Configure as shadow
endpoint_config = sagemaker_client.create_endpoint_config(
    EndpointConfigName='shadow-config',
    ProductionVariants=[production_variant],
    ShadowProductionVariants=[shadow_variant]
)

# Shadow variant processes requests in parallel
# Results logged for comparison
# No impact on user experience
# Safe validation of new models
```
### Stratégies d'optimisation des coûts

**1. Formation sur les instances ponctuelles :**
```python
# Use Spot instances for training (70-90% savings)
estimator = sagemaker.estimator.Estimator(
    image_uri=image_uri,
    role=role,
    instance_count=1,
    instance_type='ml.p3.2xlarge',
    use_spot_instances=True,
    max_run=3600,  # Max total time
    max_wait=7200,  # Max wait for Spot (including interruptions)
    checkpoint_s3_uri='s3://my-bucket/checkpoints/'  # Resume from checkpoint
)

# Automatic checkpointing handles interruptions
# Training resumes automatically
# Typical savings: 70-90% vs On-Demand
```
**2. Points de terminaison multimodèles :**
```python
# Host 100 models on single endpoint
multi_model_config = {
    'ModelDataSource': 's3://my-bucket/models/',  # Directory with model.tar.gz files
    'MultiModel': True
}

# Deploy multi-model endpoint
predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    multi_model=True
)

# Invoke specific model
response = predictor.predict(
    data=test_data,
    target_model='model1.tar.gz'  # Specify model
)

# Cost: Single endpoint vs 100 endpoints
# Savings: 99% (1 endpoint instead of 100)
```
**3. Inférence sans serveur pour un faible trafic :**
```python
# Deploy serverless endpoint (pay per request)
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=2048,  # 1-6 GB
    max_concurrency=10  # Concurrent requests
)

predictor = model.deploy(
    serverless_inference_config=serverless_config
)

# Cost comparison (1,000 requests/day):
# Real-time ml.t2.medium: $47/month
# Serverless: $0.006/month
# Savings: 7,833× cheaper!
```
**4. Points de terminaison à mise à l'échelle automatique :**
```python
# Configure auto-scaling
client = boto3.client('application-autoscaling')

# Register endpoint as scalable target
client.register_scalable_target(
    ServiceNamespace='sagemaker',
    ResourceId=f'endpoint/{endpoint_name}/variant/{variant_name}',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    MinCapacity=1,
    MaxCapacity=10
)

# Create scaling policy
client.put_scaling_policy(
    PolicyName='scale-on-invocations',
    ServiceNamespace='sagemaker',
    ResourceId=f'endpoint/{endpoint_name}/variant/{variant_name}',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    PolicyType='TargetTrackingScaling',
    TargetTrackingScalingPolicyConfiguration={
        'TargetValue': 1000.0,  # Target 1000 invocations per instance
        'PredefinedMetricSpecification': {
            'PredefinedMetricType': 'SageMakerVariantInvocationsPerInstance'
        },
        'ScaleInCooldown': 300,
        'ScaleOutCooldown': 60
    }
)

# Scales automatically based on traffic
# Pay only for needed capacity
```
## Conseils \& Bonnes pratiques

### Conseils d'optimisation de la formation

**Astuce 1 : Utilisez la formation Spot gérée**
Activez les instances Spot pour les tâches de formation : économisez 70 à 90 % grâce à la gestion automatique des points de contrôle en cas d'interruption.

**Astuce 2 : Mettez en œuvre un arrêt anticipé**
Surveiller les métriques de validation pendant la formation ; arrêter tôt s’il n’y a pas d’amélioration – permet d’économiser du temps et de l’argent.
```python
# Configure early stopping
estimator = sagemaker.estimator.Estimator(
    # ... other params ...
    early_stopping_type='Auto'  # Stops if validation metric stops improving
)
```
**Astuce 3 : Utilisez le mode de saisie Pipe pour les grands ensembles de données**
Diffusez des données depuis S3 au lieu de les télécharger : démarre l'entraînement plus rapidement, prend en charge une taille de données illimitée.
```python
train_input = sagemaker.inputs.TrainingInput(
    's3://my-bucket/data/',
    input_mode='Pipe'  # vs 'File' (download)
)
```
**Astuce 4 : Activez la formation incrémentielle**
Continuez la formation à partir du modèle précédent : convergence plus rapide et économies de coûts.
```python
estimator.fit(
    inputs={'training': train_data, 'model': previous_model_uri}
)
```
### Conseils d'optimisation des inférences

**Astuce 5 : Utilisez des points de terminaison multimodèles**
Hébergez plusieurs modèles sur un seul point de terminaison : 99 % d’économies pour de nombreux petits modèles.

**Astuce 6 : implémentez la mise en cache du modèle**
Mettez le modèle en cache en mémoire après le premier chargement : prédictions ultérieures plus rapides.

**Astuce 7 : Prédictions par lots lorsque cela est possible**
Utilisez la transformation par lots au lieu du point de terminaison en temps réel pour les prédictions hors ligne, soit 10 fois moins cher.

**Astuce 8 : Activez la mise à l'échelle automatique des points de terminaison**
Faites évoluer les instances en fonction du trafic : ne payez que pour la capacité nécessaire.

**Astuce 9 : Utilisez l'inférence élastique pour les modèles GPU**
Attachez un GPU fractionné pour l'inférence : moins cher qu'une instance de GPU complète.
```python
# Deploy with Elastic Inference
predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    accelerator_type='ml.eia2.medium'  # Fractional GPU
)
```
**Astuce 10 : Mettre en œuvre le traitement par lots des demandes**
Regroupez plusieurs demandes ensemble : améliore le débit et réduit les coûts.

### Conseils sur le flux de travail de développement

**Astuce 11 : Utilisez le mode local pour le débogage**
Testez la formation/l'inférence localement avant le déploiement dans le cloud : itération plus rapide.
```python
from sagemaker.local import LocalSession

local_session = LocalSession()
local_session.config = {'local': {'local_code': True}}

estimator = sagemaker.estimator.Estimator(
    # ... params ...
    sagemaker_session=local_session
)
```
**Astuce 12 : Activez les expériences SageMaker**
Suivez automatiquement toutes les séances d'entraînement : comparez les mesures, reproduisez les résultats.

**Astuce 13 : Utilisez le débogueur SageMaker**
Surveillez l'entraînement en temps réel et détectez les problèmes rapidement (disparition des gradients, surapprentissage).

**Astuce 14 : Mettre en œuvre la lignée de modèles**
Suivez les données, le code et les hyperparamètres pour chaque modèle : reproductibilité totale.

## Pièges \& Remèdes

### Piège 1 : sélection d'instance inappropriée

**Problème :** L'utilisation d'un mauvais type d'instance entraîne un ralentissement de la formation ou un gaspillage d'argent.

**Pourquoi cela arrive :**

- Ne pas comprendre les exigences en matière de charge de travail
- Utilisation du CPU pour le deep learning (très lent)
- Surdimensionnement des instances (paiement pour la capacité inutilisée)
- Débordement de mémoire GPU (modèles trop volumineux)

**Impact :**

- La formation prend 10 fois plus de temps (CPU vs GPU)
- Coût 5 fois plus élevé (instances surdimensionnées)
- Erreurs de mémoire insuffisante (sous-dimensionnées)
- Retards du projet

**Exemple :**
Modèle d'image d'apprentissage profond sur ml.m5.xlarge (CPU) :

- Durée de la formation : 48 heures
- Coût : 12,89 $ (48 × 0,269 $)

Même modèle sur ml.p3.2xlarge (GPU) :

- Durée de la formation : 3 heures
- Coût : 11,48 $ (3 × 3,825 $)
- 16 fois plus rapide, coût similaire !

**Remède :**

**Étape 1 : Comprendre le type de charge de travail**
```
CPU instances (ml.m5, ml.c5):
✓ Tabular data (XGBoost, scikit-learn)
✓ Small models
✓ Feature engineering
✗ Deep learning
✗ Large neural networks

GPU instances (ml.p3, ml.p4):
✓ Deep learning (TensorFlow, PyTorch)
✓ Computer vision
✓ NLP transformers
✓ Large models
✗ Simple ML (overkill)
```
**Étape 2 : Mémoire de bonne taille**
```python
# Check training data size
data_size_gb = 10  # GB

# Rule of thumb: 2-3× data size for memory
required_memory = data_size_gb * 3  # 30 GB

# Select instance with sufficient memory
# ml.m5.2xlarge: 32 GB RAM ✓
# ml.m5.xlarge: 16 GB RAM ✗ (insufficient)
```
**Étape 3 : Commencez petit, puis évoluez**
```python
# Start with small instance for testing
test_estimator = sagemaker.estimator.Estimator(
    # ... params ...
    instance_type='ml.m5.large',  # Small instance
    instance_count=1
)

# Verify training works
test_estimator.fit(sample_data)

# Scale up for full training
production_estimator = sagemaker.estimator.Estimator(
    # ... params ...
    instance_type='ml.p3.8xlarge',  # Full training
    instance_count=4  # Distributed
)

production_estimator.fit(full_data)
```
**Prévention :**

- Faire correspondre le type d'instance aux exigences de l'algorithme
- Utilisez toujours le GPU pour l'apprentissage en profondeur
- Commencer petit, à grande échelle en fonction des besoins observés
- Surveiller les métriques d'utilisation du GPU/CPU
- Utilisez la formation Spot pour réaliser des économies

***

### Piège 2 : Latence de démarrage à froid du point de terminaison

**Problème :** La première prédiction prend 5 à 30 secondes, ce qui affecte l'expérience utilisateur.

**Pourquoi cela arrive :**

- Le modèle se charge en mémoire à la première demande
- Les grands modèles (GB+) mettent du temps à charger
- Frais généraux d'initialisation du framework
- Démarrages à froid d'inférence sans serveur

**Impact :**

- Mauvaise expérience utilisateur (première réponse lente)
- Délais d'expiration de l'API
- Frustration des clients
- Perte d'activité

**Exemple :**
```
First request to endpoint:
t=0ms: Request arrives
t=0-10,000ms: Load model into memory (10 seconds)
t=10,000-10,100ms: Run inference (100ms)
Total: 10.1 seconds response time

Subsequent requests:
t=0ms: Request arrives
t=0-100ms: Run inference (model already loaded)
Total: 100ms response time
```
**Remède :**

**Solution 1 : Utiliser la concurrence provisionnée (recommandé)**
```python
# Deploy endpoint with minimum instances always running
predictor = model.deploy(
    initial_instance_count=1,  # Always 1 instance warm
    instance_type='ml.m5.large'
)

# Model pre-loaded, no cold start
# Cost: Always-on charges
```
**Solution 2 : implémenter la mise en cache du modèle dans le code d'inférence**
```python
# inference.py
import os
import joblib

# Global variable persists across invocations
_model = None

def model_fn(model_dir):
    """Load model once, cache in memory"""
    global _model
    
    if _model is None:
        print("Loading model (first time)...")
        _model = joblib.load(os.path.join(model_dir, 'model.joblib'))
        print("Model loaded and cached")
    else:
        print("Using cached model")
    
    return _model
```
**Solution 3 : Préchauffer le point de terminaison après le déploiement**
```python
# Send dummy requests to warm up
for i in range(10):
    predictor.predict(dummy_data)
    print(f"Warm-up request {i+1} complete")

# Model now loaded, real requests fast
```
**Solution 4 : Utiliser un point de terminaison multimodèle avec préchargement**
```python
# Pre-load most frequently used models
frequently_used_models = ['model1.tar.gz', 'model2.tar.gz']

for model_name in frequently_used_models:
    predictor.predict(
        data=dummy_data,
        target_model=model_name
    )
    print(f"{model_name} pre-loaded")
```
**Prévention :**

- Utiliser des points de terminaison provisionnés pour les applications sensibles à la latence
- Implémenter la mise en cache du modèle dans le code d'inférence
- Réchauffer les points de terminaison après le déploiement
- Surveiller les mesures de latence de démarrage à froid
- Envisagez des architectures de modèles plus petites

***

### Piège 3 : Échecs des tâches de formation sans points de contrôle

**Problème :** Les tâches de formation longues échouent, perdant ainsi toute progression.

**Pourquoi cela arrive :**

- Repérer les interruptions d'instance
- Bugs d'entraînement après des heures d'entraînement
- Limites de ressources dépassées
- Aucune configuration de point de contrôle

**Impact :**

- Temps de formation perdu (heures/jours)
- Coûts de calcul gaspillés
- Retards du projet
- Frustration de l'équipe

**Exemple :**
```
Training on Spot instance:
Hour 1-5: Training progresses normally (80% complete)
Hour 6: Spot instance interrupted
Result: All progress lost, start from scratch
Cost: $15 wasted (5 hours @ $3/hour)
Time lost: 5 hours
```
**Remède :**

**Étape 1 : Activer les points de contrôle**
```python
estimator = sagemaker.estimator.Estimator(
    # ... params ...
    checkpoint_s3_uri='s3://my-bucket/checkpoints/',
    checkpoint_local_path='/opt/ml/checkpoints/',  # Local path in container
    use_spot_instances=True,
    max_run=36000,  # 10 hours max
    max_wait=72000   # Wait up to 20 hours (including interruptions)
)
```
**Étape 2 : implémenter les points de contrôle dans le code de formation**
```python
# train.py
import os
import tensorflow as tf

checkpoint_dir = '/opt/ml/checkpoints/'
os.makedirs(checkpoint_dir, exist_ok=True)

# Create checkpoint callback
checkpoint_callback = tf.keras.callbacks.ModelCheckpoint(
    filepath=os.path.join(checkpoint_dir, 'checkpoint-{epoch:02d}.h5'),
    save_freq='epoch',  # Save after each epoch
    save_best_only=False  # Save all checkpoints
)

# Train with checkpointing
model.fit(
    X_train, y_train,
    epochs=100,
    callbacks=[checkpoint_callback]
)

# Resume from checkpoint if exists
latest_checkpoint = tf.train.latest_checkpoint(checkpoint_dir)
if latest_checkpoint:
    print(f"Resuming from checkpoint: {latest_checkpoint}")
    model.load_weights(latest_checkpoint)
```
**Étape 3 : Configurer la reprise automatique**
```python
# SageMaker automatically resumes from last checkpoint on Spot interruption
# No additional code needed
```
**Prévention :**

- Toujours activer les points de contrôle pour les formations > 1 heure
- Checkpoint à chaque époque ou plus fréquemment
- Utilisez la formation Spot avec points de contrôle (90 % d'économies)
- Tester la logique de reprise du point de contrôle
- Surveiller les interruptions de travail de formation

***

### Piège 4 : problèmes de mise à l'échelle des points de terminaison sous charge

**Problème :** Le point de terminaison est débordé lors des pics de trafic et demande l'expiration du délai d'attente.

**Pourquoi cela arrive :**

- Aucune mise à l'échelle automatique configurée
- Nombre maximum d'instances insuffisant
- Réponse de mise à l'échelle lente
- Retards de démarrage à froid

**Impact :**

- Délais d'expiration de l'API (erreurs 5xx)
- Mauvaise expérience utilisateur
- Perte de revenus
- Désabonnement des clients

**Exemple :**
```
Normal traffic: 100 requests/sec
Endpoint: 1 instance (handles 100 req/sec)

Sudden spike: 1,000 requests/sec
Endpoint: Still 1 instance (overloaded)
Result: 900 requests timeout/fail
```
**Remède :**

**Étape 1 : Configurer la mise à l'échelle automatique**
```python
import boto3

client = boto3.client('application-autoscaling')

# Register endpoint for auto-scaling
client.register_scalable_target(
    ServiceNamespace='sagemaker',
    ResourceId=f'endpoint/{endpoint_name}/variant/AllTraffic',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    MinCapacity=2,  # Minimum 2 instances (redundancy)
    MaxCapacity=20  # Scale up to 20 instances
)

# Create scaling policy
client.put_scaling_policy(
    PolicyName='scale-on-invocations',
    ServiceNamespace='sagemaker',
    ResourceId=f'endpoint/{endpoint_name}/variant/AllTraffic',
    ScalableDimension='sagemaker:variant:DesiredInstanceCount',
    PolicyType='TargetTrackingScaling',
    TargetTrackingScalingPolicyConfiguration={
        'TargetValue': 1000.0,  # Target 1000 invocations/minute per instance
        'PredefinedMetricSpecification': {
            'PredefinedMetricType': 'SageMakerVariantInvocationsPerInstance'
        },
        'ScaleInCooldown': 300,  # Wait 5 min before scaling in
        'ScaleOutCooldown': 60    # Wait 1 min before scaling out
    }
)
```
**Étape 2 : Définir des seuils appropriés**
```
Target Calculation:
- Measure single instance capacity: 1000 req/min
- Set target: 70% capacity = 700 req/min
- Provides 30% headroom for bursts
- Faster response to traffic increases
```
**Étape 3 : implémenter la mise en file d'attente des demandes**
```python
# Add SQS queue between clients and endpoint
import boto3

sqs = boto3.client('sqs')

# Create queue
queue_url = sqs.create_queue(QueueName='inference-queue')['QueueUrl']

# Producer (API): Send requests to queue
sqs.send_message(
    QueueUrl=queue_url,
    MessageBody=json.dumps(request_data)
)

# Consumer (Lambda): Process queue, call endpoint
def lambda_handler(event, context):
    for record in event['Records']:
        data = json.loads(record['body'])
        
        # Call SageMaker endpoint
        response = runtime.invoke_endpoint(
            EndpointName=endpoint_name,
            Body=json.dumps(data)
        )
        
        # Process response
        result = json.loads(response['Body'].read())
        
    return {'statusCode': 200}
```
**Prévention :**

- Configurez toujours la mise à l'échelle automatique pour les points de terminaison de production
- Définir des instances minimales ≥ 2 (haute disponibilité)
- Surveiller les métriques d'appel en continu
- Test de charge avant lancement en production
- Utiliser la file d'attente pour la protection contre les pics

***

### Piège 5 : coûts excessifs des points de terminaison

**Problème :** Les points de terminaison en temps réel coûtent des milliers de dollars par mois malgré une faible utilisation.

**Pourquoi cela arrive :**

- Les points de terminaison fonctionnent 24h/24 et 7j/7 (toujours facturés)
- Instances surdimensionnées pour le trafic réel
- Ne pas utiliser le sans serveur pour un faible trafic
- Plusieurs points de terminaison de développement restent opérationnels

**Impact :**

- Coûts mensuels : 1 000 à 10 000 $
- Dépassements de budget
- Annulations de projets
- Le directeur financier est mécontent

**Exemple :**
```
Development Scenario:
- 5 developers × 2 endpoints each = 10 endpoints
- Instance: ml.m5.large ($0.134/hour)
- Cost: 10 × $0.134 × 730 hours = $978/month

Production Scenario:
- Traffic: 1,000 requests/day
- Real-time endpoint: ml.m5.large = $98/month
- Actual usage: $0.20 (1M requests × $0.0000002)
- Waste: $97.80/month (99.8% waste!)
```
**Remède :**

**Solution 1 : Utiliser l'inférence sans serveur**
```python
# Replace always-on endpoint with serverless
from sagemaker.serverless import ServerlessInferenceConfig

serverless_config = ServerlessInferenceConfig(
    memory_size_in_mb=2048,
    max_concurrency=10
)

predictor = model.deploy(
    serverless_inference_config=serverless_config
)

# Cost comparison (1,000 requests/day):
# Real-time: $98/month
# Serverless: $0.006/month
# Savings: $97.994/month (99.99%)
```
**Solution 2 : points de terminaison de développement avec arrêt automatique**
```python
# Lambda function to shut down idle endpoints
import boto3
from datetime import datetime, timedelta

def lambda_handler(event, context):
    sagemaker = boto3.client('sagemaker')
    cloudwatch = boto3.client('cloudwatch')
    
    # List all endpoints
    endpoints = sagemaker.list_endpoints()['Endpoints']
    
    for endpoint in endpoints:
        endpoint_name = endpoint['EndpointName']
        
        # Check invocation count (last 24 hours)
        metrics = cloudwatch.get_metric_statistics(
            Namespace='AWS/SageMaker',
            MetricName='Invocations',
            Dimensions=[{'Name': 'EndpointName', 'Value': endpoint_name}],
            StartTime=datetime.utcnow() - timedelta(days=1),
            EndTime=datetime.utcnow(),
            Period=86400,
            Statistics=['Sum']
        )
        
        invocations = metrics['Datapoints'][0]['Sum'] if metrics['Datapoints'] else 0
        
        # Delete if no invocations
        if invocations == 0:
            print(f"Deleting idle endpoint: {endpoint_name}")
            sagemaker.delete_endpoint(EndpointName=endpoint_name)
    
    return {'statusCode': 200}

# Schedule daily via EventBridge
```
**Solution 3 : Utiliser la transformation par lots**
```python
# For offline predictions, use batch transform
transformer = estimator.transformer(
    instance_count=1,
    instance_type='ml.m5.large'
)

# Process batch (instances terminate after)
transformer.transform(
    data='s3://my-bucket/batch-input/',
    content_type='text/csv'
)

# Cost: Only job duration (e.g., 30 minutes = $0.067)
# vs Real-time endpoint: $98/month
```
**Solution 4 : points de terminaison multimodèles**
```python
# Host 100 models on single endpoint
multi_model_predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.xlarge',
    multi_model=True
)

# Cost: 1 endpoint ($98/month)
# vs 100 endpoints ($9,800/month)
# Savings: 99%
```
**Prévention :**

- Utilisez le sans serveur pour <10 000 requêtes/jour
- Implémenter l'arrêt automatique pour les points de terminaison inactifs
- Utilisez la transformation par lots pour les prédictions hors ligne
- Points de terminaison multimodèles pour de nombreux modèles
- Baliser les points finaux (dev/prod) pour le suivi des coûts
- Surveiller les coûts des points de terminaison chaque semaine

***

### Piège 6 : Surveillance des modèles manquants en production

**Problème :** Les performances du modèle se dégradent avec le temps, sans être détectées.

**Pourquoi cela arrive :**

- Aucune surveillance configurée après le déploiement
- En supposant que les modèles restent précis pour toujours
- Dérive des données (changements de distribution d'entrée)
- Dérive du concept (changements de relation)

**Impact :**

- Les prédictions deviennent inexactes
- Les indicateurs commerciaux diminuent
- La confiance des clients érodée
- Violations réglementaires

**Exemple :**
```
Fraud Detection Model:
Month 1: 95% accuracy (training data)
Month 6: 78% accuracy (new fraud patterns)
Month 12: 62% accuracy (completely ineffective)

Impact:
- $1M in undetected fraud
- Regulatory fines
- Customer churn
```
**Remède :**

**Étape 1 : Activer la capture de données**
```python
from sagemaker.model_monitor import DataCaptureConfig

data_capture_config = DataCaptureConfig(
    enable_capture=True,
    sampling_percentage=100,
    destination_s3_uri='s3://my-bucket/data-capture'
)

predictor = model.deploy(
    initial_instance_count=1,
    instance_type='ml.m5.large',
    data_capture_config=data_capture_config
)
```
**Étape 2 : Créer une référence**
```python
from sagemaker.model_monitor import DefaultModelMonitor

monitor = DefaultModelMonitor(
    role=role,
    instance_count=1,
    instance_type='ml.m5.xlarge'
)

# Generate baseline from training data
monitor.suggest_baseline(
    baseline_dataset='s3://my-bucket/training-data/train.csv',
    dataset_format=DatasetFormat.csv(header=False),
    output_s3_uri='s3://my-bucket/baseline'
)
```
**Étape 3 : Planifier la surveillance**
```python
# Run monitoring daily
monitor.create_monitoring_schedule(
    monitor_schedule_name='daily-monitoring',
    endpoint_input=predictor.endpoint_name,
    output_s3_uri='s3://my-bucket/monitoring-results',
    statistics=monitor.baseline_statistics(),
    constraints=monitor.suggested_constraints(),
    schedule_cron_expression='cron(0 0 * * ? *)',  # Daily midnight
    enable_cloudwatch_metrics=True
)
```
**Étape 4 : Alerte en cas de violations**
```python
# CloudWatch alarm for data drift
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_alarm(
    AlarmName='ModelDataDrift',
    MetricName='feature_baseline_drift_distance',
    Namespace='aws/sagemaker/Endpoints/data-metrics',
    Dimensions=[
        {'Name': 'Endpoint', 'Value': endpoint_name}
    ],
    Statistic='Average',
    Period=3600,
    EvaluationPeriods=1,
    Threshold=0.1,
    ComparisonOperator='GreaterThanThreshold',
    AlarmActions=['arn:aws:sns:region:account:ml-alerts']
)
```
**Prévention :**

- Activer la surveillance lors du déploiement
- Créer des lignes de base à partir des données de formation
- Alerte sur les problèmes de dérive/qualité
- Examiner les rapports de surveillance chaque semaine
- Recycler les modèles tous les trimestres (minimum)

***

## Résumé du chapitre

Amazon SageMaker transforme l'apprentissage automatique de la complexité de l'infrastructure en une simplicité gérée, fournissant le cycle de vie complet du ML, depuis la préparation des données jusqu'au déploiement en production. Ce chapitre a couvert les composants principaux de SageMaker (Studio IDE, tâches de formation, points de terminaison d'inférence, registre de modèles et surveillance) vous permettant de créer, déployer et maintenir des modèles ML à grande échelle sans expertise DevOps.

**Principaux points à retenir :**

- **Choisissez les bonnes instances de formation :** Utilisez le GPU (ml.p3/p4) pour l'apprentissage en profondeur, le CPU (ml.m5/c5) pour le ML traditionnel ; La formation ponctuelle permet d'économiser 70 à 90 % grâce aux points de contrôle automatiques
- **Optimiser les coûts d'inférence :** Utilisez le sans serveur pour <10 000 requêtes/jour (99 % moins cher), transformation par lots pour les points de terminaison multimodèles hors ligne pour de nombreux modèles.
- **Activer la mise à l'échelle automatique :** Configurez les points de terminaison pour mettre à l'échelle 1 à 20 instances en fonction du trafic ; empêche les délais d'attente pendant les pics, réduit les coûts en cas de faible utilisation
- **Implémenter la surveillance :** Activer la capture de données et le moniteur de modèle ; détecter la dérive tôt, se recycler avant que la précision ne se dégrade de manière significative
- **Utilisez MLOps Pipelines :** Automatisez les flux de travail depuis la préparation des données jusqu'au déploiement ; active le CI/CD pour le ML, garantit la reproductibilité et la conformité
- **Tirez parti des algorithmes intégrés :** Commencez avec les algorithmes SageMaker (XGBoost, Image Classification) pour un prototypage rapide ; aucun code personnalisé requis
- **Test A/B de nouveaux modèles :** Utilisez des points de terminaison à plusieurs variantes pour des déploiements sécurisés ; le déplacement progressif du trafic (10 % → 50 % → 100 %) minimise les risques

SageMaker se connecte aux services d'analyse précédents (Kinesis pour les fonctionnalités, Glue pour la préparation des données, Athena pour l'ingénierie des fonctionnalités) tout en ajoutant des fonctionnalités spécifiques au ML. Le chapitre suivant explore les services d'apprentissage automatique AWS pour des cas d'utilisation spécifiques (Rekognition pour la vision par ordinateur, Comprehend pour le NLP et Personalize pour les recommandations), complétant les capacités de modèle personnalisé de SageMaker.

## Exercice pratique en laboratoire

**Objectif :** Créer un pipeline ML de bout en bout : entraîner le modèle, déployer le point de terminaison, activer la surveillance, mettre en œuvre des tests A/B.

**Scénario :** Prévoyez le taux de désabonnement des clients à l'aide de données historiques.

**Prérequis :**

- Compte AWS avec accès SageMaker
- Exemple d'ensemble de données de désabonnement (fichier CSV)
- Rôle IAM avec autorisations SageMaker

**Étapes :**

1. **Préparer les données (15 minutes)**
    - Télécharger l'ensemble de données de désabonnement sur S3
    - Divisé en trains/ensembles de test (80/20)
    - Vérifier le format des données (CSV, pas d'en-têtes)
2. **Modèle de train (20 minutes)**
    - Utiliser l'algorithme intégré XGBoost
    - Configurer les hyperparamètres (num_rounds=100, max_degree=5)
    - Activer la formation Spot
    - Suivre l'évolution de la formation
3. **Déployer le point de terminaison (10 minutes)**
    - Déployer le modèle sur un point de terminaison en temps réel
    - Configurer la mise à l'échelle automatique (1 à 5 instances)
    - Test avec des exemples de prédictions
4. **Activer la surveillance (15 minutes)**
    - Activer la capture de données (échantillonnage à 100 %)
    - Créer une référence à partir des données d'entraînement
    - Planifier une surveillance quotidienne
    - Configurer les alarmes CloudWatch
5. **Test A/B du nouveau modèle (15 minutes)**
    - Former un deuxième modèle (différents hyperparamètres)
    - Déployer en tant que variante B (10 % de trafic)
    - Comparez les métriques entre les variantes
    - Déplacer le trafic vers un modèle plus performant
6. **Nettoyage (5 minutes)**
    - Supprimer les points de terminaison
    - Supprimer les plannings de surveillance
    - Supprimez éventuellement les artefacts de modèle de S3

**Résultats attendus :**

- Modèle entraîné avec une précision > 85 %
- Point final répondant en <100 ms
- Surveillance détectant toute dérive
- Test A/B montrant la comparaison des performances
- Coût total : <\$2 (formation Spot + 1 heure de point final)


## Questions de révision

1. **Quelle option d'inférence SageMaker est la plus rentable pour 500 requêtes/jour ?**
a) Point de terminaison en temps réel
b) Inférence sans serveur ✓
c) Transformation par lots
d) Point final multimodèle

**Réponse : B** – Frais d'inférence sans serveur par requête (\$0,001/jour contre \$98/mois pour le point de terminaison en temps réel)

2. **Quel est le principal avantage de l'utilisation des instances Spot pour la formation ?**
a) Formation plus rapide
b) Plus de mémoire GPU
c) 70 à 90 % d'économies de coûts ✓
d) Meilleure précision

**Réponse : C** - La formation ponctuelle offre une réduction de 70 à 90 % par rapport à la formation à la demande avec point de contrôle automatique

3. **Quel type d'instance doit être utilisé pour la formation en deep learning ?**
a) ml.m5.xlarge (CPU)
b) ml.t2.medium (CPU)
c) ml.p3.2xlarge (GPU) ✓
d) ml.c5.large (CPU)

**Réponse : C** – Instances GPU (p3, p4) requises pour une formation efficace en deep learning

4. **Qu'est-ce qui déclenche la mise à l'échelle automatique sur un point de terminaison SageMaker ?**
a) Utilisation du processeur
b) Utilisation de la mémoire
c) Invocations par instance ✓
d) Précision du modèle

**Réponse : C** – Mise à l'échelle automatique basée sur les appels par instance (métrique par défaut)

5. **Quelle est la taille maximale du modèle pour l'inférence sans serveur ?**
a) 256 Mo
b) 1 Go
c) 6 Go ✓
d) Illimité

**Réponse : C** – L'inférence sans serveur prend en charge les modèles jusqu'à 6 Go

6. **Que détecte SageMaker Model Monitor ?**
a) Erreurs de formation
b) Dérive des données ✓
c) Anomalies de facturation
d) Failles de sécurité

**Réponse : B** – Model Monitor détecte la dérive des données, les problèmes de qualité des données et la dégradation de la qualité du modèle.

7. **Quels sont les avantages des points de terminaison multimodèles ?**
a) Des prédictions plus rapides
b) Meilleure précision
c) Hébergez plusieurs modèles sur un seul point de terminaison ✓
d) Reconversion automatique

**Réponse : C** – Les points de terminaison multimodèles hébergent des centaines de modèles sur une seule instance (optimisation des coûts)

8. **Que se passe-t-il lors des tests A/B avec des variantes de pondération 90/10 ?**
a) 90% des demandes vont à la variante A ✓
b) La variante A est précise à 90 %
c) La variante B traite 90 % plus rapidement
d) La formation utilise 90 % des données

**Réponse : A** – Les pondérations des variantes contrôlent la répartition du trafic (90 % A, 10 % B)

9. **Que faut-il pour que SageMaker reprenne l'entraînement après l'interruption de Spot ?**
a) Instance plus grande
b) Configuration du point de contrôle ✓
c) Plusieurs instances
d) Instance GPU

**Réponse : B** - Le point de contrôle permet la reprise automatique à partir du dernier point de contrôle

10. **Quelle est la période de conservation des données par défaut pour les données capturées ?**
a) 7 jours
b) 30 jours
c) 90 jours
d) Indéfini ✓

**Réponse : D** - Données capturées stockées indéfiniment dans S3 (le cycle de vie standard S3 s'applique)

11. **Quel algorithme est le meilleur pour la classification des images ?**
a) XGBoost
b) Apprenant linéaire
c) Classification des images ✓
d) K-Moyennes

**Réponse : C** - Algorithme intégré de classification d'images optimisé pour les tâches d'image

12. **Quel est le but de SageMaker Feature Store ?**
a) Stocker les données d'entraînement
b) Stocker les artefacts du modèle
c) Centraliser les fonctionnalités pour les réutiliser ✓
d) Stocker les référentiels de codes

**Réponse : C** – Feature Store centralise les fonctionnalités pour une utilisation cohérente en ligne/hors ligne

13. **Quelle est la latence pour le démarrage à froid d'inférence sans serveur ?**
a) 100 ms
b) 1 seconde
c) 10 secondes ✓
d) 1 minute

**Réponse : C** - Démarrage à froid sans serveur ~ 10 secondes (première demande après une période d'inactivité)

14. **Quels sont les avantages de SageMaker Pipelines ?**
a) Formation plus rapide
b) Coûts réduits
c) Flux de travail de ML automatisés ✓
d) Meilleure précision

**Réponse : C** – Les pipelines automatisent les flux de travail ML (CI/CD pour l'apprentissage automatique)

15. **Quelle est l'action recommandée lorsque Model Monitor détecte une dérive ?**
a) Supprimer le point de terminaison
b) Augmenter la taille de l'instance
c) Recycler le modèle ✓
d) Réduire le trafic

**Réponse : C** – La dérive des données indique que le modèle doit être recyclé avec des données récentes.

***
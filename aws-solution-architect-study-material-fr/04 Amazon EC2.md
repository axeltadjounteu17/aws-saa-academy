# Partie 2 : Services informatiques

# Chapitre 4 : Amazon EC2

##Présentation

Amazon Elastic Compute Cloud (EC2) est l'épine dorsale des services de calcul AWS, fournissant des serveurs virtuels redimensionnables qui constituent la base d'innombrables applications et charges de travail. Depuis son lancement en 2006, EC2 a révolutionné la manière dont les organisations provisionnent et gèrent leurs ressources informatiques, transformant des semaines de cycles d'approvisionnement en minutes d'appels API. Comprendre EC2 est fondamental pour devenir un architecte de solutions AWS efficace.

La flexibilité d'EC2 est à la fois sa plus grande force et son plus grand défi. Avec des centaines de types d'instances, plusieurs modèles de tarification, diverses options de stockage et des configurations réseau complexes, prendre des décisions optimales nécessite une compréhension approfondie des exigences du service et de votre charge de travail. Un type d'instance mal choisi peut gaspiller des milliers de dollars par mois, tandis que des configurations Auto Scaling incorrectes peuvent rendre votre application indisponible lors des pics de trafic.

La véritable puissance d'EC2 s'étend bien au-delà du simple lancement de machines virtuelles. Les architectures EC2 modernes exploitent l'Auto Scaling pour l'élasticité, les Application Load Balancers pour la distribution du trafic, les AMI pour les déploiements reproductibles et les stratégies de placement sophistiquées pour l'optimisation des performances. Des déploiements de production réussis nécessitent de maîtriser la gestion du cycle de vie des instances, de mettre en œuvre une surveillance complète, de concevoir des stratégies de correctifs efficaces et d'optimiser les coûts grâce aux instances réservées et aux plans d'économies.

Ce chapitre fournit une couverture complète d'EC2, des principes fondamentaux aux implémentations de niveau production. Vous apprendrez à sélectionner les types d'instances appropriés pour différentes charges de travail, à concevoir des architectures Auto Scaling hautement disponibles, à créer et à gérer des AMI personnalisées, à mettre en œuvre une gestion de flotte à grande échelle et à optimiser les coûts tout en maintenant les performances. Que vous migrez des applications existantes vers le cloud ou que vous construisiez des systèmes cloud natifs, la maîtrise d'EC2 est essentielle à votre parcours AWS.

## Théorie \&Concepts

### Fondamentaux EC2

Amazon EC2 offre une capacité de calcul sécurisée et redimensionnable dans le cloud. Chaque instance est un serveur virtuel que vous pouvez configurer avec le système d'exploitation, les applications et les données nécessaires à votre charge de travail.

**Caractéristiques clés :**

- **Élasticité :** Augmentez ou diminuez en quelques minutes
- **Contrôle complet :** Accès root à chaque instance
- **Tarif flexible :** Payez uniquement pour ce que vous utilisez
- **Intégré :** Fonctionne de manière transparente avec d'autres services AWS
- **Sécurisé :** exploite le VPC, les groupes de sécurité et IAM
- **Fiable :** 99,99 % de SLA lorsqu'il est correctement architecturé

**Composants de l'instance :**

1. **vCPU :** unités centrales de traitement virtuelles
2. **Mémoire (RAM) :** Mémoire d'instance en Gio
3. **Stockage :** Magasin d'instances (éphémère) ou EBS (persistant)
4. **Réseau :** Capacités réseau améliorées
5. **GPU/Accélérateurs :** Pour les charges de travail spécifiques (ML, graphiques)

### Types et familles d'instances

EC2 propose plus de 400 types d'instances organisés en familles optimisées pour différents cas d'utilisation.

**Convention de dénomination des familles d'instances :**

Format : `[Famille][Génération].[Taille]`

Exemple : `m5.2xlarge`

- `m` = famille à usage général
- `5` = 5ème génération
- `2xlarge` = Taille (8 vCPU, 32 Go de RAM)

**Suffixes supplémentaires :**

- `a` = processeurs AMD (par exemple, `m5a.large`)
- `n` = Réseau amélioré (par exemple, `c5n.xlarge`)
- `d` = Volumes de stockage d'instance (par exemple, `m5d.large`)
- `e` = Stockage ou mémoire supplémentaire (par exemple, `r5e.xlarge`)
- `metal` = Bare metal (par exemple, `c5.metal`)


#### Usage général (M, T, Mac)

Calcul, mémoire et mise en réseau équilibrés pour diverses charges de travail.

**Famille M7i/M7g (dernière génération 2024-2025) :**

- **M7i :** Intel Xeon de 4e génération (Sapphire Rapids), jusqu'à 192 processeurs virtuels
- **M7g :** AWS Graviton3, jusqu'à 64 processeurs virtuels, rapport qualité-prix 20 % supérieur à celui du M6g
- **M7i-Flex :** Usage général le moins cher (utilise un modèle en rafale comme la série T)
- **Cas d'utilisation :** serveurs Web, serveurs d'applications, bases de données petites/moyennes

**Famille T4g (Burstable ARM) :**

- **Cas d'utilisation :** Sites Web, microservices, développement/test, petites bases de données
- **Fonction spéciale :** Crédits CPU pour des performances en rafale
- **T4g (Graviton2) :** 40 % de meilleur rapport qualité-prix que le T3 ; Basé sur ARM
- **Coût :** Coût horaire le plus bas pour un usage général

> **Remarque 2025 :** AWS nécessite désormais IMDSv2 (`HttpTokens=required`) comme valeur par défaut pour les nouvelles instances EC2 lancées après août 2024 dans la plupart des régions. Définissez toujours `HttpTokens=required` et `HttpPutResponseHopLimit=2` (pour les charges de travail de conteneurs) dans les modèles de lancement.

> **Remarque SnapStart :** Lambda SnapStart prend désormais en charge les environnements d'exécution Java 11, Java 17 et Java 21.

**Crédits CPU :**
```
T3.medium earns 24 credits/hour
Each credit = 1 vCPU at 100% for 1 minute
Baseline (20%) uses 12 credits/hour
Surplus: 12 credits/hour for bursting
```
**Instances Mac :**

- **Cas d'utilisation :** Développement iOS/macOS, tests
- **Hôte :** Matériel Mac mini dédié
- **OS :** macOS Monterey, Ventura, Sonoma
- **Allocation minimale :** 24 heures


#### Calcul optimisé (C)

Processeurs hautes performances pour les charges de travail gourmandes en calcul.

**Famille C6i :**

- **Cas d'utilisation :** Traitement par lots, transcodage multimédia, serveurs de jeux, modélisation scientifique
- **processeurs virtuels :** 2 à 128
- **Mémoire :** 4 Gio à 256 Gio
- **Processeur :** Intel Xeon de 3e génération (3,5 GHz)
- **Réseau :** Jusqu'à 50 Gbit/s
- **Prix :** Rapport CPU/mémoire plus élevé

**Famille C7g (Graviton3) :**

- **Processeur :** AWS Graviton3 (ARM)
- **Performances :** Jusqu'à 25 % supérieures à celles du C6g
- **Coût :** Jusqu'à 20 % de moins qu'un processeur Intel comparable
- **Cas d'utilisation :** Calcul haute performance, jeux, encodage vidéo


#### Mémoire optimisée (R, X, z, mémoire élevée)

Grande mémoire pour les applications gourmandes en mémoire.

**Famille R6i :**

- **Cas d'utilisation :** Bases de données en mémoire (Redis, SAP HANA), analyses Big Data
- **processeurs virtuels :** 2 à 128
- **Mémoire :** 16 Gio à 1 024 Gio (1 To)
- **Rapport mémoire/processeur virtuel :** 8:1

**Famille X2iedn (mémoire et stockage élevés) :**

- **Cas d'utilisation :** Bases de données gourmandes en mémoire, analyses en mémoire
- **processeurs virtuels :** 2 à 128
- **Mémoire :** 16 Gio à 4 096 Gio (4 To)
- **Rapport mémoire/processeur virtuel :** 32:1
- **Stockage :** Jusqu'à 3,8 To de SSD NVMe

**Instances à mémoire élevée :**

- **Tailles :** 3 To, 6 To, 9 To, 12 To, 18 To, 24 To
- **Cas d'utilisation :** SAP HANA, bases de données en mémoire
- **Spécial :** Bare Metal uniquement


#### Stockage optimisé (I, D, H)

Accès séquentiel élevé en lecture/écriture à de grands ensembles de données sur le stockage local.

**Famille I4i (SSD NVMe de génération actuelle) :**

- **Cas d'utilisation :** Bases de données haute fréquence (SQL, NoSQL), analyses en temps réel, Elasticsearch
- **Stockage :** Jusqu'à 30 To de SSD NVMe local
- **IOPS :** Jusqu'à 3,3 millions d'IOPS en lecture aléatoire (supérieur à I3en)
- **Processeur :** Intel Xeon (Ice Lake)
- **Remarque :** Remplace I3/I3en pour les nouveaux déploiements ; préférez I4i pour les besoins de pointe en IOPS

**Famille I3/I3en (génération précédente) :**

- **Cas d'utilisation :** bases de données NoSQL (Cassandra, MongoDB), entreposage de données, Elasticsearch
- **Stockage :** magasin d'instances SSD NVMe
- **IOPS :** Jusqu'à 3,3 millions d'IOPS en lecture aléatoire
- **Débit :** Jusqu'à 16 Go/s en lecture séquentielle
- **Tailles :** 1,9 To à 60 To de stockage NVMe local

**Famille D3/D3en :**

- **Cas d'utilisation :** Systèmes de fichiers distribués, traitement des données, MapReduce
- **Stockage :** magasin d'instances de disque dur
- **Capacité :** Jusqu'à 336 To de stockage sur disque dur local
- **Débit :** Jusqu'à 6,2 Go/s en lecture séquentielle
- **Coût :** Coût le plus bas par Go de stockage


#### Calcul accéléré (P, G, F, Inf, Trn)

Accélérateurs matériels pour le ML, les graphiques et le calcul haute performance.

**Famille P4d (GPU - NVIDIA A100) :**

- **Cas d'utilisation :** Formation en machine learning, simulations HPC
- **GPU :** 8x NVIDIA A100 (40 Go chacun)
- **Mémoire GPU :** 320 Go au total
- **Réseau :** 400 Gbit/s ENA, 4x 100 Gbit/s GPUDirect RDMA
- **Coût :** \$32,77/heure (sur demande)

**Famille G5 (GPU - NVIDIA A10G) :**

- **Cas d'utilisation :** Postes de travail graphiques, streaming de jeux, inférence ML
- **GPU :** 1 à 8 NVIDIA A10G (24 Go chacun)
- **Coût :** Inférieur à P4 pour les charges de travail d'inférence

**Famille Inf1 (AWS Inferentia) :**

- **Cas d'utilisation :** inférence ML à grande échelle
- **Accélérateurs :** puces AWS Inferentia
- **Performances :** Débit 2,3 fois supérieur à celui du G4
- **Coût :** 70 % de moins que les instances GPU

**Famille Trn1 (AWS Trainium) :**

- **Cas d'utilisation :** Formation en apprentissage profond
- **Accélérateurs :** puces AWS Trainium
- **Performance :** Jusqu'à 50 % d'économies par rapport au P4d


#### Guide de sélection du type d'instance

| Charge de travail | Famille recommandée | Justification |
| :-- | :-- | :-- |
| Serveurs Web/applications | T3, M6i | Ressources équilibrées et rentables |
| Microservices | T3, T4g | Éclatable, faible coût |
| Traitement par lots | C6i, C7g | Performances élevées du processeur |
| Cache en mémoire | R6i, R6g | Grande mémoire |
| Bases de données relationnelles | R6i, M6i | Mémoire + performances de stockage |
| Bases de données NoSQL | I3, I3en | Stockage local IOPS élevé |
| Entreposage de données | D3, I3en | Grande capacité de stockage |
| Encodage vidéo | C6i, C6g | CPU élevé, rentable |
| Formation ML | P4d, Trn1 | GPU ou accélérateurs ML |
| Inférence ML | G5, Inf1 | Coût optimisé pour l'inférence |
| SAP HANA | X2iedn, mémoire élevée | Exigences de mémoire très importantes |

### Amazon Machine Images (AMI)

Une AMI est un modèle contenant la configuration logicielle (OS, applications, paramètres) nécessaire au lancement d'une instance EC2.

**Composants AMI :**

1. **Modèle de volume racine :** Configuration du système d'exploitation et de démarrage
2. **Autorisations de lancement :** Qui peut utiliser l'AMI
3. **Bloquer le mappage de périphériques :** Volumes à attacher au lancement

**Types d'AMI :**

**1. AMI fournies par AWS :**

- Amazon Linux 2023 (AL2023) - Recommandé
- Amazon Linux 2 (AL2) - Génération précédente
- Ubuntu, Red Hat Enterprise Linux (RHEL), Windows Serveur
- Optimisé pour EC2, préconfiguré, régulièrement mis à jour

**2. AMI Marketplace :**

- Logiciel tiers préinstallé
- Logiciels commerciaux (SQL Server, WordPress, etc.)
- Payer l'utilisation du logiciel plus les coûts EC2

**3. AMI de la communauté :**

- Partagé par la communauté AWS
- Gratuit, mais sans garantie
- Responsabilité de sécurité et de conformité de l'utilisateur

**4. AMI personnalisées :**

- Vos propres images
- Applications préconfigurées
- Images dorées pour des déploiements cohérents

**Cycle de vie des AMI :**
```
1. Launch instance
2. Customize (install software, configure)
3. Create AMI from instance
4. Launch new instances from AMI
5. Share AMI (optional)
6. Copy AMI to other regions (optional)
7. Deregister AMI when no longer needed
```
**Support AMI :**

**AMI basées sur EBS :**

- Le périphérique racine est le volume EBS
- Peut être arrêté sans perte de données
- Temps de démarrage plus rapides (généralement <1 minute)
- Type le plus courant

**AMI basées sur le stockage d'instance :**

- Le périphérique racine est le volume de stockage de l'instance
- Ne peut pas être arrêté (seulement terminé)
- Données perdues à l'arrêt/à la fin
- Temps de démarrage plus lents
- Cas d'utilisation spécifiques et moins courants


### Cycle de vie des instances

Comprendre le cycle de vie complet de l’instance est essentiel pour une bonne gestion.

**États d'instance :**
```
pending → running → stopping → stopped → terminated
                  ↓
                shutting-down → terminated
```
**États détaillés :**

1. **En attente :** L'instance est en cours de lancement
    - Facturé : Non
    - Peut se connecter : Non
2. **En cours d'exécution :** L'instance est opérationnelle
    - Facturé : Oui (par seconde)
    - Peut se connecter : Oui
    - Opérations : arrêter, redémarrer, terminer
3. **Arrêt :** L'instance est en cours d'arrêt
    - Facturé : Courte période
    - Peut se connecter : Non
4. **Arrêté :** L'instance est arrêtée
    - Facturé : Non (uniquement les volumes EBS)
    - Peut se connecter : Non
    - Opérations : Démarrer, terminer, modifier
5. **Arrêt :** L'instance se termine
    - Facturé : Non
    - Peut se connecter : Non
6. **Terminé :** L'instance est supprimée
    - Facturé : Non
    - Impossible de redémarrer
    - Les volumes EBS peuvent être conservés s'ils sont configurés

**Comportements importants :**

**Arrêter ou terminer :**

- **Stop :** L'instance peut être redémarrée, conserve les volumes EBS, les données persistent
- **Terminer :** Instance supprimée, données du magasin d'instance perdues, volumes EBS supprimés (sauf configuration contraire)

**Données du magasin d'instance :**

- Perdu le : Arrêt, terminaison, panne matérielle
- Persiste sur : Redémarrer

**Données de volume EBS :**

- Persiste jusqu'à : Arrêter, redémarrer
- Configurable à la fin : indicateur `DeleteOnTermination`

**Modifications de l'adresse IP publique :**

- L'adresse IP publique change lorsque l'instance est arrêtée/démarrée
- L'adresse IP élastique persiste jusqu'à l'arrêt/démarrage
- L'adresse IP privée persiste sauf si l'instance est terminée


### Modèles de tarification des instances

EC2 propose plusieurs modèles de tarification pour optimiser les coûts.

#### Instances à la demande

**Caractéristiques :**

- Payer à la seconde (Linux) ou à l'heure (Windows)
- Aucun engagement
- Pas de paiement initial
- Coût horaire le plus élevé

**Cas d'utilisation :**

- Développement et tests
- Charges de travail imprévisibles
- Charges de travail à court terme et pointues
- Applications testées pour la première fois

**Exemple de tarification :**
```
m6i.xlarge (4 vCPUs, 16 GiB RAM)
Cost: $0.192/hour = $140.16/month (730 hours)
```
#### Instances réservées (RI)

**Caractéristiques :**

- Engagement 1 an ou 3 ans
- Jusqu'à 75 % de réduction par rapport à la demande
- Options de paiement : tout d'avance, initial partiel, aucun initial
- Spécifique à la région ou à l'AZ

**Type :**

**1. Instances réservées standards :**

- Remise la plus élevée (jusqu'à 75%)
- Impossible de changer la famille d'instances
- Peut changer : AZ, taille de l'instance (au sein de la même famille), type de réseau

**2. Instances réservées convertibles :**

- Remise inférieure (jusqu'à 54%)
- Peut changer la famille d'instances, le système d'exploitation et la location
- Plus de flexibilité

**IR régionales ou zonales :**

- **Régional :** S'applique à n'importe quelle zone de disponibilité de la région, offre une priorité de capacité
- **Zonal :** AZ spécifique, permet la réservation de capacité

**Exemple de tarification :**
```
m6i.xlarge - 3 year, All Upfront
On-Demand: $140.16/month × 36 months = $5,045.76
Reserved (Standard): $2,500 upfront = $69.44/month
Savings: 50%
```
#### Plans d'épargne

**Caractéristiques :**

- Engagement d'utilisation constante ($/heure) pendant 1 ou 3 ans
- Jusqu'à 72% de réduction
- Plus flexible que les instances réservées

**Type :**

**1. Calculez les plans d'épargne :**

- Le plus flexible
- S'applique à : EC2, Lambda, Fargate
- N'importe quelle famille d'instance, taille, système d'exploitation, location, région
- Jusqu'à 66% de réduction

**2. Plans d'économies d'instance EC2 :**

- Moins flexible que Compute
- Famille d'instance spécifique dans une région spécifique
- Peut changer : taille, système d'exploitation, location
- Jusqu'à 72% de réduction

**Comparaison :**


| Fonctionnalité | Instances réservées | Plans d'épargne |
| :-- | :-- | :-- |
| Engagement | Type d'instance spécifique | Montant d'utilisation (\$/heure) |
| Remise | Jusqu'à 75% | Jusqu'à 72% |
| Flexibilité | Limité | Élevé |
| Couverture | EC2 uniquement | EC2, Lambda, Fargate |
| S'applique à | Configuration d'instance spécifique | S'applique automatiquement |

**Recommandation :** Plans d'économies pour la plupart des charges de travail en raison de la flexibilité.

#### Instances ponctuelles

**Caractéristiques :**

- Utiliser la capacité EC2 disponible
- Jusqu'à 90 % de réduction par rapport à la demande
- Peut être interrompu avec un avertissement de 2 minutes
- Le prix fluctue en fonction de l'offre/demande

**Cas d'utilisation :**

- Charges de travail tolérantes aux pannes
- Traitement par lots
- Analyse des mégadonnées
- Pipelines CI/CD
- Serveurs Web sans état

**Ne convient pas à :**

- Bases de données
- Applications avec état sans architecture appropriée
- Travaux qui ne peuvent pas être interrompus

**Tarif des instances Spot :**
```
m6i.xlarge On-Demand: $0.192/hour
m6i.xlarge Spot (average): $0.058/hour
Savings: 70%
```
**Gestion des interruptions :**

AWS fournit un avertissement de 2 minutes via :

1. Métadonnées de l'instance EC2
2. Événements CloudWatch
3. Pont d'événements

**Meilleures pratiques :**

- Utiliser Spot Fleet pour les types d'instances mixtes
- Implémenter des points de contrôle dans les applications
- Utiliser les avis d'interruption de l'instance Spot
- Combinez avec On-Demand pour une capacité de base


#### Hôtes dédiés \& Instances dédiées

**Hôtes dédiés :**

- Serveur physique entièrement dédié à votre usage
- Visibilité dans les cœurs physiques, les sockets
- Utiliser les licences logicielles existantes liées au serveur (Windows Server, SQL Server, SUSE Linux)
- Facturation par hôte
- Option la plus chère

**Instances dédiées :**

- Les instances s'exécutent sur du matériel dédié à un seul client
- Peut partager du matériel avec d'autres instances du même compte
- Facturation par instance
- Aucun contrôle sur le placement du serveur physique

**Comparaison :**


| Fonctionnalité | Hôte dédié | Instance dédiée | Par défaut (partagé) |
| :-- | :-- | :-- | :-- |
| Matériel | Serveur physique entièrement dédié | Dédié, mais géré par AWS | Multi-tenant partagé |
| Visibilité | Sockets, cœurs, ID d'hôte | Aucun | Aucun |
| Licence | BYOL pris en charge | Limité | Pas de BYOL |
| Coût | Le plus haut | Élevé | Le plus bas |
| Cas d'utilisation | Conformité, licences | Conformité | La plupart des charges de travail |

### Groupes d'emplacements

Contrôlez le placement des instances pour les performances ou la fiabilité.

**Type :**

**1. Groupe de placement de cluster :**

- Instances placées rapprochées dans une seule AZ
- **Avantage :** Latence la plus faible (réseau 10 Gbit/s+)
- **Cas d'utilisation :** HPC, applications étroitement couplées, Big Data
- **Limitation :** Limité à un seul AZ
- **Impact des pannes :** La panne d'un seul rack affecte tous

**2. Groupe de placement de partition :**

- Instances réparties sur des partitions logiques
- Chaque partition sur des racks séparés avec réseau/alimentation indépendant
- **Avantage :** Réduit les pannes corrélées
- **Cas d'utilisation :** Bases de données distribuées (Cassandra, Kafka), HDFS
- **Partitions :** Jusqu'à 7 par AZ
- **Instances maximales :** Des centaines par groupe

**3. Groupe de placement de diffusion :**

- Chaque instance sur un matériel distinct
- **Avantage :** Disponibilité maximale
- **Cas d'utilisation :** Applications critiques, petits clusters
- **Limitation :** 7 instances maximum par zone de disponibilité et par groupe
- **Isolement :** Chaque instance sur un rack différent

**Sélection de la stratégie de placement :**


| Exigence | Groupe de placement |
| :-- | :-- |
| Latence la plus faible | Grappe |
| Base de données distribuée | Partition |
| Instances uniques critiques | Propagation |
| Aucune exigence particulière | Aucun (par défaut) |

### Réseau amélioré

Fournit une bande passante plus élevée, des performances de paquets par seconde (PPS) plus élevées et une latence plus faible.

**Type :**

**1. Adaptateur réseau élastique (ENA) :**

- **Bande passante :** Jusqu'à 100 Gbit/s
- **Instances :** Génération la plus actuelle (m5, c5, r5, etc.)
- **Activé :** Par défaut sur l'AMI Amazon Linux
- **Coût :** Aucun frais supplémentaire

**2. Intel 82599 VF (ancien) :**

- **Bande passante :** Jusqu'à 10 Gbit/s
- **Instances :** Ancienne génération (c3, r3, etc.)
- **Statut :** En cours de suppression

**Avantages :**

- Latence plus faible
- Réduire la gigue
- SPA plus élevé
- Meilleur débit du réseau

**Activation d'un réseau amélioré :**
```bash
# Check if enhanced networking is enabled
aws ec2 describe-instances \
    --instance-ids i-1234567890abcdef0 \
    --query 'Reservations[].Instances[].EnaSupport'

# Enable enhanced networking on AMI
aws ec2 modify-instance-attribute \
    --instance-id i-1234567890abcdef0 \
    --ena-support
```
### Adresses IP élastiques

Adresses IPv4 statiques pour le cloud computing dynamique.

**Caractéristiques :**

- **Persistance :** Reste associé au compte AWS
- **Remappage :** Peut être remappé entre les instances
- **Disponibilité :** Maintient pendant l'arrêt/démarrage de l'instance
- **Limite :** 5 par région (limite souple)
- **Coût :** Gratuit lorsqu'il est associé à une instance en cours d'exécution, \$0,005/heure lorsqu'il n'est pas associé

**Cas d'utilisation :**

- Basculement entre instances
- Liste blanche dans les pare-feu
- DNS pointant vers une IP spécifique
- Récupération après des échecs d'instance

**Meilleures pratiques :**

- Utilisez plutôt Elastic Load Balancer lorsque cela est possible
- Libérez les IP Elastic inutilisées pour éviter les frais
- À utiliser pour des cas d'utilisation spécifiques, et non pour des déploiements de routine


### Métadonnées d'instance et données utilisateur

**Métadonnées de l'instance :**
Accédez aux informations sur l'instance depuis l'instance.

**Point de terminaison :** http://169.254.169.254/latest/meta-data/

**Informations disponibles :**

- Identifiant AMI
- ID d'instance
-Type d'instance
- Adresses IP publiques/privées
- Groupes de sécurité
- Identifiants du rôle IAM
- Données utilisateur

**Exemple :**
```bash
# Get instance ID
curl http://169.254.169.254/latest/meta-data/instance-id

# Get IAM role credentials
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/role-name

# Get availability zone
curl http://169.254.169.254/latest/meta-data/placement/availability-zone
```
**Données utilisateur :**
Script exécuté au lancement de l'instance (une seule fois au premier démarrage).

**Cas d'utilisation :**

- Installer le logiciel
- Configurer les paramètres
- Télécharger le code de l'application
- S'inscrire aux services

**Exemple :**
```bash
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html
```
**IMDSv2 (service de métadonnées d'instance version 2) :**
Version plus sécurisée nécessitant des requêtes orientées session.
```bash
# Get token
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Use token
curl -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/instance-id
```
### Options de stockage EC2

**1. EBS (Magasin de blocs élastiques) :**

- Stockage de blocs persistant
- Attaché à une seule instance
- Survit à la résiliation de l'instance (si configuré)
- Instantané

**2. Magasin d'instances :**

- Stockage de bloc temporaire
- Physiquement attaché à l'hôte
- Hautes performances d'E/S
- Données perdues lors de l'arrêt/terminaison/panne matérielle

**3. EFS (système de fichiers élastique) :**

- Système de fichiers réseau (NFS)
- Partagé sur plusieurs instances
- Service régional (multi-AZ)

**4. FSx :**

- Systèmes de fichiers gérés (Windows, Lustre, NetApp ONTAP, OpenZFS)

Nous aborderons le stockage en détail au chapitre 8.

## Implémentation pratique

### Atelier 1 : Lancer votre première instance EC2

**Objectif :** Lancez un serveur Web à l'aide de la console AWS et de la CLI.

#### Utilisation de la console AWS

**Étape 1 : Accédez à EC2**

1. Connectez-vous à la console AWS
2. Accédez à **Services** → **EC2**
3. Cliquez sur **Lancer l'instance**

**Étape 2 : Configurer l'instance**
```
Name: WebServer-01
Application and OS Images (AMI): Amazon Linux 2023
Architecture: 64-bit (x86)
Instance type: t3.micro (1 vCPU, 1 GiB RAM)
Key pair: Create new or select existing
Network settings:
  VPC: Select your VPC
  Subnet: Public subnet
  Auto-assign public IP: Enable
  Security group: Create new
    - Allow SSH (22) from your IP
    - Allow HTTP (80) from anywhere (0.0.0.0/0)
Storage: 8 GiB gp3
Advanced details:
  User data: (paste script below)
```
**Script de données utilisateur :**
```bash
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
```
echo "<h1>Bonjour de \$(hostname -f)</h1>" > /var/www/html/index.html
```
```
**Étape 3 : Lancer et connecter**

1. Cliquez sur **Lancer l'instance**
2. Attendez par exemple d'atteindre l'état **En cours d'exécution**
3. Notez l'adresse IP publique
4. Test : ouvrez le navigateur sur `http://[PUBLIC_IP]`

#### Utilisation de l'AWS CLI
```bash
# Create key pair
aws ec2 create-key-pair \
    --key-name MyKeyPair \
    --query 'KeyMaterial' \
    --output text > MyKeyPair.pem

chmod 400 MyKeyPair.pem

# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name web-server-sg \
    --description "Security group for web server" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr $(curl -s http://checkip.amazonaws.com)/32

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Create user data file
cat > user-data.sh <<'EOF'
#!/bin/bash
yum update -y
yum install -y httpd
systemctl start httpd
systemctl enable httpd
EC2_AVAIL_ZONE=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
echo "<h1>Hello from $EC2_AVAIL_ZONE</h1>" > /var/www/html/index.html
EOF

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $PUBLIC_SUBNET_ID \
    --associate-public-ip-address \
    --user-data file://user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=WebServer-CLI}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Public IP: $PUBLIC_IP"
echo "Access your web server: http://$PUBLIC_IP"

# SSH into instance
ssh -i MyKeyPair.pem ec2-user@$PUBLIC_IP
```
### Atelier 2 : Création d'AMI personnalisées

**Objectif :** Créer une AMI réutilisable à partir d'une instance configurée.

**Étape 1 : Lancer et configurer l'instance**
```bash
# Launch base instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --query 'Instances[0].InstanceId' \
    --output text)

# Wait for running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get IP and connect
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

ssh -i MyKeyPair.pem ec2-user@$PUBLIC_IP
```
**Étape 2 : Personnaliser l'instance**
```bash
# On the instance
sudo yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install application dependencies
sudo yum install -y git nginx

# Configure Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create application directory
sudo mkdir -p /var/www/myapp
sudo chown -R ec2-user:ec2-user /var/www/myapp

# Install PM2 process manager
sudo npm install -g pm2

# Clean up for AMI creation
sudo yum clean all
rm -rf ~/.ssh/authorized_keys
history -c
```
**Étape 3 : Créer une AMI**
```bash
# From your local machine
# Stop instance (recommended for consistency)
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID

# Create AMI
AMI_ID=$(aws ec2 create-image \
    --instance-id $INSTANCE_ID \
    --name "MyApp-Baseline-$(date +%Y%m%d-%H%M%S)" \
    --description "Node.js application baseline with Nginx" \
    --tag-specifications 'ResourceType=image,Tags=[{Key=Name,Value=MyApp-Baseline},{Key=Version,Value=1.0}]' \
    --query 'ImageId' \
    --output text)

echo "AMI ID: $AMI_ID"

# Wait for AMI to be available
aws ec2 wait image-available --image-ids $AMI_ID
echo "AMI is ready!"
```
**Étape 4 : Lancer à partir d'une AMI personnalisée**
```bash
# Launch new instance from your AMI
NEW_INSTANCE=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t3.micro \
    --key-name MyKeyPair \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=MyApp-Instance}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "New instance launched: $NEW_INSTANCE"
```
**Étape 5 : Copier AMI vers une autre région**
```bash
# Copy to another region for disaster recovery
TARGET_REGION="eu-west-1"

COPIED_AMI=$(aws ec2 copy-image \
    --source-region us-east-1 \
    --source-image-id $AMI_ID \
    --name "MyApp-Baseline-$(date +%Y%m%d-%H%M%S)" \
    --description "MyApp baseline - DR copy" \
    --region $TARGET_REGION \
    --query 'ImageId' \
    --output text)

echo "Copied AMI ID in $TARGET_REGION: $COPIED_AMI"
```
### Atelier 3 : Implémentation de la mise à l'échelle automatique

**Objectif :** Créer un groupe Auto Scaling avec un équilibreur de charge pour une haute disponibilité.

**Architecture:**
```
Internet → ALB → Target Group → Auto Scaling Group (2-10 instances across 3 AZs)
```
**Étape 1 : Créer un équilibreur de charge d'application**
```bash
# Create target group
TG_ARN=$(aws elbv2 create-target-group \
    --name myapp-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create Application Load Balancer
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name myapp-alb \
    --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B $PUBLIC_SUBNET_1C \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=MyApp-ALB \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "Load Balancer DNS: $ALB_DNS"
```
**Étape 2 : Créer un modèle de lancement**
```bash
# Create user data for health check endpoint
cat > asg-user-data.sh <<'EOF'
#!/bin/bash
yum update -y
yum install -y httpd

# Configure web server
systemctl start httpd
systemctl enable httpd

# Create health check endpoint
cat > /var/www/html/health <<'HEALTHCHECK'
OK
HEALTHCHECK

# Create main page
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
AZ=$(curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone)
cat > /var/www/html/index.html <<WEBPAGE
<html>
<head><title>Auto Scaling Demo</title></head>
<body>
<h1>Hello from Auto Scaling!</h1>
<p>Instance ID: $INSTANCE_ID</p>
<p>Availability Zone: $AZ</p>
<p>Server Time: $(date)</p>
</body>
</html>
WEBPAGE
EOF

# Create launch template
LAUNCH_TEMPLATE_ID=$(aws ec2 create-launch-template \
    --launch-template-name myapp-launch-template \
    --version-description "v1.0" \
    --launch-template-data '{
      "ImageId": "'$AMI_ID'",
      "InstanceType": "t3.micro",
      "KeyName": "MyKeyPair",
      "SecurityGroupIds": ["'$WEB_SG_ID'"],
      "IamInstanceProfile": {
        "Name": "EC2-SSM-Role"
      },
      "Monitoring": {
        "Enabled": true
      },
      "UserData": "'$(base64 -w 0 asg-user-data.sh)'",
      "TagSpecifications": [{
        "ResourceType": "instance",
        "Tags": [
          {"Key": "Name", "Value": "MyApp-ASG-Instance"},
          {"Key": "Environment", "Value": "Production"}
        ]
      }]
    }' \
    --query 'LaunchTemplate.LaunchTemplateId' \
    --output text)

echo "Launch Template ID: $LAUNCH_TEMPLATE_ID"
```
**Étape 3 : Créer un groupe Auto Scaling**
```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --launch-template LaunchTemplateId=$LAUNCH_TEMPLATE_ID,Version='$Latest' \
    --min-size 2 \
    --max-size 10 \
    --desired-capacity 3 \
    --default-cooldown 300 \
    --health-check-type ELB \
    --health-check-grace-period 300 \
    --vpc-zone-identifier "$APP_SUBNET_1A,$APP_SUBNET_1B,$APP_SUBNET_1C" \
    --target-group-arns $TG_ARN \
    --tags "Key=Name,Value=MyApp-ASG-Instance,PropagateAtLaunch=true" \
           "Key=Environment,Value=Production,PropagateAtLaunch=true"

echo "Auto Scaling Group created"
```
**Étape 4 : Configurer les stratégies de mise à l'échelle**
```bash
# Target Tracking Scaling - CPU utilization
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name cpu-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "TargetValue": 50.0
    }'

# Target Tracking Scaling - ALB Request Count
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name alb-request-count-target-tracking \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ALBRequestCountPerTarget",
        "ResourceLabel": "'$(echo $ALB_ARN | cut -d: -f6)'/'$(echo $TG_ARN | cut -d: -f6)'"
      },
      "TargetValue": 1000.0
    }'

# Step Scaling Policy (for aggressive scaling)
SCALE_OUT_POLICY=$(aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name scale-out-policy \
    --policy-type StepScaling \
    --adjustment-type PercentChangeInCapacity \
    --metric-aggregation-type Average \
    --step-adjustments '[
      {
        "MetricIntervalLowerBound": 0,
        "MetricIntervalUpperBound": 10,
        "ScalingAdjustment": 10
      },
      {
        "MetricIntervalLowerBound": 10,
        "ScalingAdjustment": 30
      }
    ]' \
    --query 'PolicyARN' \
    --output text)

# Create CloudWatch alarm for step scaling
aws cloudwatch put-metric-alarm \
    --alarm-name myapp-high-cpu \
    --alarm-description "Scale out when CPU > 70%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 70 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=AutoScalingGroupName,Value=myapp-asg \
    --alarm-actions $SCALE_OUT_POLICY
```
**Étape 5 : Tester la mise à l'échelle automatique**
```bash
# Generate load to trigger scaling
# Connect to an instance and install stress tool
INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names myapp-asg \
    --query 'AutoScalingGroups[0].Instances[0].InstanceId' \
    --output text)

# Use Systems Manager Session Manager (no SSH needed)
aws ssm start-session --target $INSTANCE_ID

# On the instance
sudo yum install -y stress
stress --cpu 8 --timeout 600s

# Monitor scaling activity
aws autoscaling describe-scaling-activities \
    --auto-scaling-group-name myapp-asg \
    --max-records 10 \
    --query 'Activities[*].[StartTime,StatusCode,Description]' \
    --output table

# Watch instance count
watch -n 5 'aws autoscaling describe-auto-scaling-groups \
    --auto-scaling-group-names myapp-asg \
    --query "AutoScalingGroups[0].[DesiredCapacity,MinSize,MaxSize]"'
```
### Atelier 4 : Implémentation de la planification d'instances

**Objectif :** Démarrez/arrêtez automatiquement les instances hors production pour réduire les coûts.
```python
#!/usr/bin/env python3
# lambda_instance_scheduler.py

import boto3
import os
from datetime import datetime

ec2 = boto3.client('ec2')

def lambda_handler(event, context):
    """
    Start/Stop instances based on tags and schedule
    """
    
    action = os.environ.get('ACTION', 'stop')  # 'start' or 'stop'
    environment = os.environ.get('ENVIRONMENT', 'dev')  # 'dev', 'test', 'staging'
    
    # Find instances with scheduling tags
    filters = [
        {'Name': f'tag:Environment', 'Values': [environment]},
        {'Name': f'tag:AutoSchedule', 'Values': ['true']},
        {'Name': 'instance-state-name', 'Values': ['running' if action == 'stop' else 'stopped']}
    ]
    
    instances = ec2.describe_instances(Filters=filters)
    
    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_ids.append(instance['InstanceId'])
    
    if not instance_ids:
        print(f"No instances found to {action}")
        return {'statusCode': 200, 'message': 'No instances to process'}
    
    # Perform action
    if action == 'stop':
        ec2.stop_instances(InstanceIds=instance_ids)
        print(f"Stopped instances: {instance_ids}")
    else:
        ec2.start_instances(InstanceIds=instance_ids)
        print(f"Started instances: {instance_ids}")
    
    return {
        'statusCode': 200,
        'action': action,
        'instances': instance_ids,
        'count': len(instance_ids)
    }
```
**Déployer la fonction Lambda :**
```bash
# Create IAM role for Lambda
cat > lambda-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name InstanceSchedulerRole \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach policies
aws iam attach-role-policy \
    --role-name InstanceSchedulerRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

cat > instance-scheduler-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "ec2:DescribeInstances",
      "ec2:StartInstances",
      "ec2:StopInstances",
      "ec2:DescribeRegions"
    ],
    "Resource": "*"
  }]
}
EOF

aws iam put-role-policy \
    --role-name InstanceSchedulerRole \
    --policy-name InstanceSchedulerPolicy \
    --policy-document file://instance-scheduler-policy.json

# Create deployment package
zip lambda_function.zip lambda_instance_scheduler.py

# Create Lambda function for stopping instances
LAMBDA_ARN=$(aws lambda create-function \
    --function-name StopDevInstances \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_instance_scheduler.lambda_handler \
    --zip-file fileb://lambda_function.zip \
    --timeout 60 \
    --environment Variables="{ACTION=stop,ENVIRONMENT=dev}" \
    --query 'FunctionArn' \
    --output text)

# Create Lambda function for starting instances
aws lambda create-function \
    --function-name StartDevInstances \
    --runtime python3.11 \
    --role $ROLE_ARN \
    --handler lambda_instance_scheduler.lambda_handler \
    --zip-file fileb://lambda_function.zip \
    --timeout 60 \
    --environment Variables="{ACTION=start,ENVIRONMENT=dev}"

# Create EventBridge rules
# Stop instances at 7 PM (19:00) UTC Monday-Friday
aws events put-rule \
    --name stop-dev-instances-evening \
    --schedule-expression "cron(0 19 ? * MON-FRI *)" \
    --state ENABLED

aws events put-targets \
    --rule stop-dev-instances-evening \
    --targets "Id"="1","Arn"="$LAMBDA_ARN"

# Start instances at 7 AM (07:00) UTC Monday-Friday
aws events put-rule \
    --name start-dev-instances-morning \
    --schedule-expression "cron(0 7 ? * MON-FRI *)" \
    --state ENABLED

aws events put-targets \
    --rule start-dev-instances-morning \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:StartDevInstances"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission \
    --function-name StopDevInstances \
    --statement-id AllowEventBridgeInvoke \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn arn:aws:events:us-east-1:123456789012:rule/stop-dev-instances-evening
```
**Marquer les instances pour la planification :**
```bash
# Tag dev instances for auto-scheduling
aws ec2 create-tags \
    --resources i-1234567890abcdef0 i-0987654321fedcba0 \
    --tags Key=Environment,Value=dev \
           Key=AutoSchedule,Value=true
```
### Atelier 5 : Implémentation de la surveillance et des alarmes CloudWatch

**Objectif :** Mettre en place une surveillance complète pour les instances EC2.
```bash
# Enable detailed monitoring (1-minute intervals)
aws ec2 monitor-instances --instance-ids $INSTANCE_ID

# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
    --alarm-name high-cpu-$INSTANCE_ID \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Create status check alarm
aws cloudwatch put-metric-alarm \
    --alarm-name status-check-failed-$INSTANCE_ID \
    --alarm-description "Alert when status checks fail" \
    --metric-name StatusCheckFailed \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-alerts \
                    arn:aws:automate:us-east-1:ec2:reboot

# Create disk utilization alarm (requires CloudWatch agent)
aws cloudwatch put-metric-alarm \
    --alarm-name high-disk-usage-$INSTANCE_ID \
    --alarm-description "Alert when disk usage exceeds 85%" \
    --metric-name disk_used_percent \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 85 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
                 Name=path,Value=/ \
                 Name=device,Value=xvda1 \
                 Name=fstype,Value=xfs \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Create memory utilization alarm (requires CloudWatch agent)
aws cloudwatch put-metric-alarm \
    --alarm-name high-memory-$INSTANCE_ID \
    --alarm-description "Alert when memory exceeds 80%" \
    --metric-name mem_used_percent \
    --namespace CWAgent \
    --statistic Average \
    --period 300 \
    --evaluation-periods 2 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```
**Installez CloudWatch Agent pour les métriques avancées :**
```bash
# On the instance
sudo yum install -y amazon-cloudwatch-agent

# Create CloudWatch agent configuration
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
{
  "metrics": {
    "namespace": "CWAgent",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {
            "name": "cpu_usage_idle",
            "rename": "CPU_IDLE",
            "unit": "Percent"
          },
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {
            "name": "used_percent",
            "rename": "DISK_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "diskio": {
        "measurement": [
          "io_time"
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {
            "name": "mem_used_percent",
            "rename": "MEM_USED",
            "unit": "Percent"
          }
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/system-logs",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/httpd/access_log",
            "log_group_name": "/aws/ec2/httpd/access",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```
## Connaissances au niveau de la production

### Gestion de flotte à grande échelle

La gestion de centaines ou de milliers d'instances EC2 nécessite une automatisation, une standardisation et des outils sophistiqués.

#### AWS Systems Manager pour la gestion de flotte

Systems Manager fournit une interface unifiée pour gérer les flottes EC2 sans accès SSH.

**Capacités clés :**

**1. Gestionnaire de sessions (accès Secure Shell) :**
```bash
# Connect without SSH keys or bastion hosts
aws ssm start-session --target i-1234567890abcdef0

# Port forwarding
aws ssm start-session \
    --target i-1234567890abcdef0 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["3306"],"localPortNumber":["3306"]}'
```
**2. Exécuter la commande (exécuter des scripts à grande échelle) :**
```bash
# Run command on multiple instances
aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --instance-ids i-1234567890abcdef0 i-0987654321fedcba0 \
    --parameters commands=["sudo yum update -y","sudo systemctl restart httpd"] \
    --comment "Update and restart web servers" \
    --timeout-seconds 600

# Run on instances by tag
aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --targets "Key=tag:Environment,Values=Production" \
    --parameters commands=["df -h","/opt/monitoring/check-health.sh"] \
    --max-concurrency "50%" \
    --max-errors "10%"
```
**3. Gestionnaire de correctifs (correctifs automatisés) :**
```bash
# Create patch baseline
aws ssm create-patch-baseline \
    --name "ProductionLinuxBaseline" \
    --description "Patch baseline for production Linux instances" \
    --operating-system AMAZON_LINUX_2 \
    --approval-rules '{
      "PatchRules": [{
        "PatchFilterGroup": {
          "PatchFilters": [{
            "Key": "CLASSIFICATION",
            "Values": ["Security", "Bugfix"]
          }]
        },
        "ApproveAfterDays": 7,
        "ComplianceLevel": "CRITICAL"
      }]
    }'

# Create maintenance window
aws ssm create-maintenance-window \
    --name "ProductionPatchingWindow" \
    --schedule "cron(0 2 ? * SUN *)" \
    --duration 4 \
    --cutoff 1 \
    --allow-unassociated-targets

# Register targets
aws ssm register-target-with-maintenance-window \
    --window-id mw-0123456789abcdef0 \
    --target-type INSTANCE \
    --targets "Key=tag:PatchGroup,Values=Production"

# Register patch task
aws ssm register-task-with-maintenance-window \
    --window-id mw-0123456789abcdef0 \
    --task-type RUN_COMMAND \
    --task-arn "AWS-RunPatchBaseline" \
    --targets "Key=WindowTargetIds,Values=target-id" \
    --max-concurrency 25% \
    --max-errors 10% \
    --priority 1
```
**4. Gestionnaire d'état (conformité de la configuration) :**
```bash
# Create association to ensure CloudWatch agent is running
aws ssm create-association \
    --name "AWS-ConfigureAWSPackage" \
    --targets "Key=tag:Environment,Values=Production" \
    --parameters '{
      "action": ["Install"],
      "name": ["AmazonCloudWatchAgent"],
      "version": ["latest"]
    }' \
    --schedule-expression "rate(30 days)"
```
**5. Inventaire (gestion des actifs) :**
```python
#!/usr/bin/env python3
# get_fleet_inventory.py

import boto3
import csv

ssm = boto3.client('ssm')

def get_fleet_inventory():
    """Get comprehensive inventory of EC2 fleet"""
    
    inventory_items = []
    
    # Get all instances with SSM agent
    response = ssm.describe_instance_information()
    
    for instance in response['InstanceInformationList']:
        instance_id = instance['InstanceId']
        
        # Get inventory data
        inventory = ssm.get_inventory_entries_for_instance(
            InstanceId=instance_id,
            TypeName='AWS:Application'
        )
        
        # Get installed applications
        apps = []
        for entry in inventory.get('Entries', []):
            apps.append({
                'name': entry.get('Name'),
                'version': entry.get('Version'),
                'publisher': entry.get('Publisher')
            })
        
        inventory_items.append({
            'instance_id': instance_id,
            'platform': instance.get('PlatformType'),
            'platform_version': instance.get('PlatformVersion'),
            'ip_address': instance.get('IPAddress'),
            'agent_version': instance.get('AgentVersion'),
            'applications': apps
        })
    
    return inventory_items

# Generate CSV report
inventory = get_fleet_inventory()
with open('fleet_inventory.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['Instance ID', 'Platform', 'Version', 'IP Address', 'Agent Version', 'App Count'])
    
    for item in inventory:
        writer.writerow([
            item['instance_id'],
            item['platform'],
            item['platform_version'],
            item['ip_address'],
            item['agent_version'],
            len(item['applications'])
        ])

print(f"Inventory report generated: fleet_inventory.csv ({len(inventory)} instances)")
```
#### Infrastructure en tant que code pour EC2

**Modèle CloudFormation pour Production EC2 :**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production EC2 Instance with monitoring and backup'

Parameters:
  EnvironmentName:
    Type: String
    Default: Production
    AllowedValues: [Development, Staging, Production]
  
  InstanceType:
    Type: String
    Default: t3.medium
    AllowedValues: [t3.small, t3.medium, t3.large, m5.large, m5.xlarge]
  
  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: EC2 Key Pair for SSH access
  
  LatestAmiId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2

Resources:
  # IAM Role for EC2
  EC2Role:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-EC2-Role'

  EC2InstanceProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles:
        - !Ref EC2Role

  # Security Group
  InstanceSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub 'Security group for ${EnvironmentName} instance'
      VpcId: !ImportValue ProductionVPCId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS from internet
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: All outbound traffic
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Instance-SG'

  # EC2 Instance
  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      ImageId: !Ref LatestAmiId
      KeyName: !Ref KeyName
      IamInstanceProfile: !Ref EC2InstanceProfile
      SecurityGroupIds:
        - !Ref InstanceSecurityGroup
      SubnetId: !ImportValue ProductionPrivateSubnet1
      Monitoring: true
      BlockDeviceMappings:
        - DeviceName: /dev/xvda
          Ebs:
            VolumeType: gp3
            VolumeSize: 30
            Encrypted: true
            DeleteOnTermination: true
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          yum update -y
          
          # Install CloudWatch agent
          wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
          rpm -U ./amazon-cloudwatch-agent.rpm
          
          # Configure CloudWatch agent
          cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<'EOF'
          {
            "metrics": {
              "namespace": "${EnvironmentName}",
              "metrics_collected": {
                "mem": {
                  "measurement": [{"name": "mem_used_percent"}],
                  "metrics_collection_interval": 60
                },
                "disk": {
                  "measurement": [{"name": "used_percent"}],
                  "metrics_collection_interval": 60,
                  "resources": ["*"]
                }
              }
            }
          }
          EOF
          
          /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
            -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
          
          # Install application
          # Add your application installation here
          
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Instance'
        - Key: Environment
          Value: !Ref EnvironmentName
        - Key: Backup
          Value: Daily

  # CloudWatch Alarms
  CPUAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${EnvironmentName}-HighCPU'
      AlarmDescription: Alert when CPU exceeds 80%
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: InstanceId
          Value: !Ref EC2Instance
      AlarmActions:
        - !ImportValue AlertSNSTopic

  StatusCheckAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub '${EnvironmentName}-StatusCheckFailed'
      AlarmDescription: Alert when status checks fail
      MetricName: StatusCheckFailed
      Namespace: AWS/EC2
      Statistic: Maximum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: GreaterThanOrEqualToThreshold
      Dimensions:
        - Name: InstanceId
          Value: !Ref EC2Instance
      AlarmActions:
        - !ImportValue CriticalSNSTopic
        - !Sub 'arn:aws:automate:${AWS::Region}:ec2:recover'

  # Backup Plan
  BackupPlan:
    Type: AWS::Backup::BackupPlan
    Properties:
      BackupPlan:
        BackupPlanName: !Sub '${EnvironmentName}-DailyBackup'
        BackupPlanRule:
          - RuleName: DailyBackups
            TargetBackupVault: !Ref BackupVault
            ScheduleExpression: cron(0 5 ? * * *)
            StartWindowMinutes: 60
            CompletionWindowMinutes: 120
            Lifecycle:
              DeleteAfterDays: 30
              MoveToColdStorageAfterDays: 7

  BackupVault:
    Type: AWS::Backup::BackupVault
    Properties:
      BackupVaultName: !Sub '${EnvironmentName}-Vault'

  BackupSelection:
    Type: AWS::Backup::BackupSelection
    Properties:
      BackupPlanId: !Ref BackupPlan
      BackupSelection:
        SelectionName: !Sub '${EnvironmentName}-Selection'
        IamRoleArn: !Sub 'arn:aws:iam::${AWS::AccountId}:role/service-role/AWSBackupDefaultServiceRole'
        Resources:
          - !Sub 'arn:aws:ec2:${AWS::Region}:${AWS::AccountId}:instance/${EC2Instance}'

Outputs:
  InstanceId:
    Description: Instance ID
    Value: !Ref EC2Instance
    Export:
      Name: !Sub '${EnvironmentName}-InstanceId'
  
  PrivateIP:
    Description: Private IP address
    Value: !GetAtt EC2Instance.PrivateIp
    Export:
      Name: !Sub '${EnvironmentName}-PrivateIP'
```
### Modèles de mise à l'échelle automatique avancés

#### Mise à l'échelle prédictive

Utilisez le ML pour prévoir le trafic et évoluer de manière proactive :
```bash
# Enable predictive scaling
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name predictive-scaling-policy \
    --policy-type PredictiveScaling \
    --predictive-scaling-configuration '{
      "MetricSpecifications": [{
        "TargetValue": 50.0,
        "PredefinedMetricPairSpecification": {
          "PredefinedMetricType": "ASGCPUUtilization"
        }
      }],
      "Mode": "ForecastAndScale",
      "SchedulingBufferTime": 600
    }'
```
#### Politique d'instances mixtes (Spot + On-Demand)
```yaml
# Launch Template configuration for mixed instances
AutoScalingGroup:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MixedInstancesPolicy:
      InstancesDistribution:
        OnDemandAllocationStrategy: prioritized
        OnDemandBaseCapacity: 2
        OnDemandPercentageAboveBaseCapacity: 30
        SpotAllocationStrategy: capacity-optimized
        SpotInstancePools: 3
      LaunchTemplate:
        LaunchTemplateSpecification:
          LaunchTemplateId: !Ref LaunchTemplate
          Version: !GetAtt LaunchTemplate.LatestVersionNumber
        Overrides:
          - InstanceType: t3.medium
            WeightedCapacity: 2
          - InstanceType: t3.large
            WeightedCapacity: 4
          - InstanceType: m5.large
            WeightedCapacity: 4
          - InstanceType: m5a.large
            WeightedCapacity: 4
    MinSize: 2
    MaxSize: 50
    DesiredCapacity: 10
```
**Avantages :**

- 70% de capacité de Spot (économies énormes)
- 30 % à la demande (fiabilité de base)
- Plusieurs types d'instances (flexibilité)
- Allocation optimisée en capacité (moins d'interruptions)


#### Hooks de cycle de vie pour une manipulation gracieuse
```python
#!/usr/bin/env python3
# lifecycle_hook_handler.py

import boto3
import json

autoscaling = boto3.client('autoscaling')
sqs = boto3.client('sqs')

def lambda_handler(event, context):
    """
    Handle Auto Scaling lifecycle hooks
    Perform graceful shutdown or warmup tasks
    """
    
    # Parse SQS message
    for record in event['Records']:
        message = json.loads(record['body'])
        
        instance_id = message['EC2InstanceId']
        lifecycle_hook_name = message['LifecycleHookName']
        asg_name = message['AutoScalingGroupName']
        lifecycle_transition = message['LifecycleTransition']
        
        if lifecycle_transition == 'autoscaling:EC2_INSTANCE_TERMINATING':
            # Perform graceful shutdown
            print(f"Handling termination for {instance_id}")
            
            # Example: Deregister from service discovery
            # deregister_from_consul(instance_id)
            
            # Example: Drain connections
            # drain_connections(instance_id)
            
            # Wait for drain to complete
            import time
            time.sleep(30)
            
        elif lifecycle_transition == 'autoscaling:EC2_INSTANCE_LAUNCHING':
            # Perform warmup tasks
            print(f"Handling launch for {instance_id}")
            
            # Example: Wait for application to be ready
            # wait_for_application_ready(instance_id)
            
            # Example: Register with service discovery
            # register_with_consul(instance_id)
        
        # Complete lifecycle action
        autoscaling.complete_lifecycle_action(
            LifecycleHookName=lifecycle_hook_name,
            AutoScalingGroupName=asg_name,
            InstanceId=instance_id,
            LifecycleActionResult='CONTINUE'
        )
        
        print(f"Lifecycle action completed for {instance_id}")
    
    return {'statusCode': 200}
```
**Créer des hooks de cycle de vie :**
```bash
# Termination hook
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name graceful-shutdown \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
    --heartbeat-timeout 300 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks-queue

# Launch hook
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name warmup-tasks \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_LAUNCHING \
    --heartbeat-timeout 600 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks-queue
```
### Reprise après sinistre et haute disponibilité

#### Automatisation de la copie d'AMI inter-régions
```python
#!/usr/bin/env python3
# ami_dr_replication.py

import boto3
from datetime import datetime

def replicate_ami_to_dr_region(source_region, target_region, ami_tag_key='Replicate', ami_tag_value='true'):
    """
    Automatically replicate AMIs to DR region
    """
    
    source_ec2 = boto3.client('ec2', region_name=source_region)
    target_ec2 = boto3.client('ec2', region_name=target_region)
    
    # Find AMIs to replicate
    response = source_ec2.describe_images(
        Owners=['self'],
        Filters=[
            {'Name': f'tag:{ami_tag_key}', 'Values': [ami_tag_value]}
        ]
    )
    
    for ami in response['Images']:
        ami_id = ami['ImageId']
        ami_name = ami['Name']
        
        # Check if already replicated
        existing = target_ec2.describe_images(
            Owners=['self'],
            Filters=[
                {'Name': 'name', 'Values': [ami_name]}
            ]
        )
        
        if existing['Images']:
            print(f"AMI {ami_name} already exists in {target_region}")
            continue
        
        # Copy AMI
        print(f"Copying {ami_id} ({ami_name}) to {target_region}")
        
        copy_response = target_ec2.copy_image(
            SourceRegion=source_region,
            SourceImageId=ami_id,
            Name=ami_name,
            Description=f"DR copy of {ami_id} - {datetime.now().isoformat()}"
        )
        
        new_ami_id = copy_response['ImageId']
        
        # Copy tags
        tags = ami.get('Tags', [])
        if tags:
            target_ec2.create_tags(
                Resources=[new_ami_id],
                Tags=tags
            )
        
        print(f"Created {new_ami_id} in {target_region}")
    
    return True

# Run replication
replicate_ami_to_dr_region('us-east-1', 'us-west-2')
```
#### Récupération automatique en cas de panne d'instance
```bash
# Configure automatic recovery for instance failures
aws ec2 modify-instance-maintenance-options \
    --instance-id i-1234567890abcdef0 \
    --auto-recovery enabled

# Or use CloudWatch alarm for recovery
aws cloudwatch put-metric-alarm \
    --alarm-name auto-recover-instance \
    --alarm-description "Recover instance on system failure" \
    --metric-name StatusCheckFailed_System \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
    --alarm-actions arn:aws:automate:us-east-1:ec2:recover
```
### Stratégies d'optimisation des coûts

#### Outil de planification d'instance réservée
```python
#!/usr/bin/env python3
# ri_recommendation_tool.py

import boto3
from datetime import datetime, timedelta
from collections import defaultdict

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')
pricing = boto3.client('pricing', region_name='us-east-1')

def analyze_instance_usage(days=30):
    """
    Analyze instance usage to recommend Reserved Instances
    """
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get all running instances
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    usage_stats = defaultdict(lambda: {
        'count': 0,
        'avg_cpu': 0,
        'instances': []
    })
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_type = instance['InstanceType']
            az = instance['Placement']['AvailabilityZone']
            
            # Get CPU utilization
            cpu_stats = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,  # Daily
                Statistics=['Average']
            )
            
            avg_cpu = sum(d['Average'] for d in cpu_stats['Datapoints']) / len(cpu_stats['Datapoints']) if cpu_stats['Datapoints'] else 0
            
            usage_stats[instance_type]['count'] += 1
            usage_stats[instance_type]['avg_cpu'] += avg_cpu
            usage_stats[instance_type]['instances'].append(instance_id)
    
    # Calculate averages and recommendations
    recommendations = []
    
    for instance_type, stats in usage_stats.items():
        count = stats['count']
        avg_cpu = stats['avg_cpu'] / count if count > 0 else 0
        
        # Recommend RI for instances with >50% avg CPU and >2 instances
        if avg_cpu > 50 and count >= 2:
            # Get on-demand pricing
            on_demand_price = get_on_demand_price(instance_type)
            ri_price = get_ri_price(instance_type, '1yr', 'All Upfront')
            
            savings = (on_demand_price - ri_price) * count * 8760  # Annual savings
            
            recommendations.append({
                'instance_type': instance_type,
                'count': count,
                'avg_cpu': round(avg_cpu, 2),
                'on_demand_annual': round(on_demand_price * count * 8760, 2),
                'ri_annual': round(ri_price * count * 8760, 2),
                'annual_savings': round(savings, 2),
                'recommendation': f'Purchase {count}x {instance_type} RIs'
            })
    
    # Sort by savings
    recommendations.sort(key=lambda x: x['annual_savings'], reverse=True)
    
    return recommendations

def get_on_demand_price(instance_type, region='us-east-1'):
    """Get on-demand price for instance type"""
    # Simplified - in production, query AWS Pricing API
    prices = {
        't3.micro': 0.0104,
        't3.small': 0.0208,
        't3.medium': 0.0416,
        't3.large': 0.0832,
        'm5.large': 0.096,
        'm5.xlarge': 0.192,
        'm5.2xlarge': 0.384
    }
    return prices.get(instance_type, 0.10)

def get_ri_price(instance_type, term='1yr', payment='All Upfront'):
    """Get RI price for instance type"""
    # Simplified - in production, query AWS Pricing API
    # Assuming ~40% discount for 1yr All Upfront
    on_demand = get_on_demand_price(instance_type)
    return on_demand * 0.6

# Generate recommendations
recommendations = analyze_instance_usage(days=30)

print("=" * 80)
print("RESERVED INSTANCE RECOMMENDATIONS")
print("=" * 80)
print("\nBased on 30 days of usage data:\n")

for rec in recommendations:
    print(f"Instance Type: {rec['instance_type']}")
    print(f"  Count: {rec['count']}")
    print(f"  Average CPU: {rec['avg_cpu']}%")
    print(f"  On-Demand Annual Cost: ${rec['on_demand_annual']:,.2f}")
    print(f"  Reserved Annual Cost: ${rec['ri_annual']:,.2f}")
    print(f"  Annual Savings: ${rec['annual_savings']:,.2f}")
    print(f"  Recommendation: {rec['recommendation']}")
    print()

total_savings = sum(rec['annual_savings'] for rec in recommendations)
print(f"Total Potential Annual Savings: ${total_savings:,.2f}")
```
#### Bonnes pratiques en matière d'instance Spot
```python
#!/usr/bin/env python3
# spot_fleet_manager.py

import boto3
import json

ec2 = boto3.client('ec2')

def create_spot_fleet_config(target_capacity=10):
    """
    Create Spot Fleet with diversified instance types
    """
    
    spot_fleet_config = {
        'IamFleetRole': 'arn:aws:iam::123456789012:role/aws-ec2-spot-fleet-tagging-role',
        'AllocationStrategy': 'capacity-optimized',
        'TargetCapacity': target_capacity,
        'SpotPrice': '0.10',  # Max price per hour
        'TerminateInstancesWithExpiration': True,
        'Type': 'maintain',
        'ReplaceUnhealthyInstances': True,
        'InstanceInterruptionBehavior': 'terminate',
        'LaunchSpecifications': [
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3.medium',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 2.0,
                'TagSpecifications': [{
                    'ResourceType': 'instance',
                    'Tags': [
                        {'Key': 'Name', 'Value': 'SpotFleet-Instance'},
                        {'Key': 'SpotFleet', 'Value': 'true'}
                    ]
                }]
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3a.medium',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 2.0
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 't3.large',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 4.0
            },
            {
                'ImageId': 'ami-0c55b159cbfafe1f0',
                'InstanceType': 'm5.large',
                'KeyName': 'MyKeyPair',
                'SecurityGroups': [{'GroupId': 'sg-12345678'}],
                'SubnetId': 'subnet-12345678',
                'WeightedCapacity': 4.0
            }
        ]
    }
    
    response = ec2.request_spot_fleet(
        SpotFleetRequestConfig=spot_fleet_config
    )
    
    return response['SpotFleetRequestId']

def handle_spot_interruption():
    """
    Example of handling Spot instance interruption
    Run this on the instance via user data or systemd service
    """
    
    script = """#!/bin/bash
    
    # Monitor for interruption notice
    while true; do
        TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
        NOTICE=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/spot/instance-action)
        
        if [ $? -eq 0 ]; then
            echo "Spot interruption notice received at $(date)"
            
            # Graceful shutdown
            # 1. Stop accepting new requests
            systemctl stop nginx
            
            # 2. Complete in-flight requests
            sleep 30
            
            # 3. Save state
            /opt/app/save-state.sh
            
            # 4. Deregister from load balancer (if not using target group)
            # aws elbv2 deregister-targets ...
            
            echo "Graceful shutdown complete"
            break
        fi
        
        sleep 5
    done
    """
    
    return script

# Create Spot Fleet
fleet_id = create_spot_fleet_config(target_capacity=20)
print(f"Spot Fleet created: {fleet_id}")
```
## Conseils \& Bonnes pratiques

### Conseils pour la sélection du type d'instance

**Conseil 1 : Commencez par des instances extensibles pour les charges de travail variables**

Pour les charges de travail avec une utilisation variable du processeur (serveurs Web, environnements de développement) :

- Utiliser les instances T3/T4g
- Surveiller les crédits CPU
- Passez au M5 en cas d'éclatement constant
```bash
# Monitor CPU credit balance
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUCreditBalance \
    --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 3600 \
    --statistics Average \
    --query 'Datapoints[*].[Timestamp,Average]' \
    --output table
```
**Astuce 2 : Utilisez les instances Graviton (ARM) pour réaliser des économies**

Les instances Graviton2/3 (T4g, M6g, C6g, R6g) proposent :

- Jusqu'à 40 % de meilleur rapport qualité-prix
- Consommation d'énergie réduite
- Compatible avec la plupart des charges de travail Linux

**Contrôle de compatibilité :**
```bash
# Test if your application works on ARM
docker run --platform linux/arm64 your-image:tag

# For compiled applications, recompile for ARM64
gcc -march=armv8-a your-app.c -o your-app
```
**Astuce 3 : Ajustez régulièrement la bonne taille**
```python
#!/usr/bin/env python3
# right_sizing_analyzer.py

import boto3
from datetime import datetime, timedelta

def analyze_instance_utilization(instance_id, days=14):
    """
    Analyze instance utilization and suggest right-sizing
    """
    
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get instance details
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    instance_type = instance['InstanceType']
    
    # Get CPU utilization
    cpu_stats = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    if not cpu_stats['Datapoints']:
        return "Insufficient data"
    
    avg_cpu = sum(d['Average'] for d in cpu_stats['Datapoints']) / len(cpu_stats['Datapoints'])
    max_cpu = max(d['Maximum'] for d in cpu_stats['Datapoints'])
    
    # Recommendations
    if avg_cpu < 10 and max_cpu < 30:
        return f"DOWNSIZE: Average CPU {avg_cpu:.1f}%, Max {max_cpu:.1f}% - Consider smaller instance"
    elif avg_cpu > 60:
        return f"UPSIZE: Average CPU {avg_cpu:.1f}% - Consider larger instance"
    elif avg_cpu < 30 and max_cpu < 50:
        return f"BURSTABLE: Average CPU {avg_cpu:.1f}% - Consider T3 instance"
    else:
        return f"OPTIMAL: Average CPU {avg_cpu:.1f}%, Max {max_cpu:.1f}%"

# Example
print(analyze_instance_utilization('i-1234567890abcdef0'))
```
### Conseils de gestion AMI

**Astuce 4 : Mettre en œuvre la gestion du cycle de vie d'AMI**
```bash
# Create Lambda function to clean old AMIs
aws lambda create-function \
    --function-name AMI-Cleanup \
    --runtime python3.11 \
    --role arn:aws:iam::123456789012:role/LambdaAMICleanup \
    --handler lambda_function.lambda_handler \
    --zip-file fileb://ami-cleanup.zip \
    --timeout 300 \
    --environment Variables="{RETENTION_DAYS=90}"

# Schedule monthly cleanup
aws events put-rule \
    --name monthly-ami-cleanup \
    --schedule-expression "cron(0 2 1 * ? *)"

aws events put-targets \
    --rule monthly-ami-cleanup \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:AMI-Cleanup"
```
**Astuce 5 : versionnez vos AMI**

Utilisez le versionnement sémantique dans les noms d'AMI :
```bash
# Good naming convention
MyApp-v1.2.3-20250115-prod
MyApp-v1.2.3-20250115-hotfix

# Tag with metadata
aws ec2 create-tags \
    --resources $AMI_ID \
    --tags Key=Version,Value=1.2.3 \
           Key=GitCommit,Value=abc123 \
           Key=BuildDate,Value=2025-01-15 \
           Key=Environment,Value=production
```
**Astuce 6 : Testez les AMI avant la production**
```bash
# Launch test instance from new AMI
TEST_INSTANCE=$(aws ec2 run-instances \
    --image-id $NEW_AMI_ID \
    --instance-type t3.micro \
    --subnet-id $TEST_SUBNET \
    --security-group-ids $TEST_SG \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=AMI-Test},{Key=AutoTerminate,Value=true}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

# Run automated tests
aws ssm send-command \
    --instance-ids $TEST_INSTANCE \
    --document-name "AWS-RunShellScript" \
    --parameters commands=["
        /opt/tests/smoke-test.sh
        /opt/tests/integration-test.sh
    "] \
    --timeout-seconds 600

# If tests pass, promote to production
# If tests fail, investigate and fix
```
### Conseils de mise à l'échelle automatique

**Astuce 7 : Utilisez plusieurs stratégies de mise à l'échelle**

Combinez différentes stratégies de mise à l’échelle :
```bash
# Target tracking for baseline
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name target-tracking-cpu \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
      "PredefinedMetricSpecification": {
        "PredefinedMetricType": "ASGAverageCPUUtilization"
      },
      "TargetValue": 50.0
    }'

# Step scaling for aggressive scaling
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name myapp-asg \
    --policy-name step-scaling-high-load \
    --policy-type StepScaling \
    --adjustment-type PercentChangeInCapacity \
    --step-adjustments '[
      {"MetricIntervalLowerBound":0,"MetricIntervalUpperBound":20,"ScalingAdjustment":10},
      {"MetricIntervalLowerBound":20,"ScalingAdjustment":30}
    ]'

# Scheduled scaling for known patterns
aws autoscaling put-scheduled-action \
    --auto-scaling-group-name myapp-asg \
    --scheduled-action-name scale-up-morning \
    --recurrence "0 8 * * 1-5" \
    --min-size 10 \
    --desired-capacity 15
```
**Astuce 8 : Définissez des périodes de recharge appropriées**
```bash
# Default cooldown (applies to simple scaling)
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --default-cooldown 300 \
    ...

# Target tracking cooldown (built-in)
# Step scaling cooldown (specified per alarm)
```
**Astuce 9 : Utilisez les politiques de résiliation de manière stratégique**
```bash
aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name myapp-asg \
    --termination-policies \
        OldestLaunchTemplate \
        OldestInstance

# Available termination policies:
# - OldestInstance: Terminate oldest instance
# - NewestInstance: Terminate newest instance
# - OldestLaunchConfiguration/OldestLaunchTemplate: Oldest config
# - ClosestToNextInstanceHour: Minimize billing
# - Default: Balanced across AZs, then oldest launch config
# - AllocationStrategy: For Spot instances
```
### Conseils de sécurité

**Astuce 10 : Ne stockez jamais d'informations d'identification dans les AMI**
```bash
# Bad - credentials in AMI
echo "API_KEY=secret123" >> /etc/environment

# Good - use Parameter Store or Secrets Manager
aws ssm get-parameter \
    --name /myapp/api-key \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
```
**Astuce 11 : Utilisez IMDSv2 pour une sécurité renforcée**
```bash
# Require IMDSv2 on new instances
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1"

# Update existing instance
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1
```
**Astuce 12 : Chiffrer les volumes EBS par défaut**
```bash
# Enable EBS encryption by default
aws ec2 enable-ebs-encryption-by-default

# Verify
aws ec2 get-ebs-encryption-by-default

# Encrypt existing volumes
aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Snapshot for encryption"

aws ec2 copy-snapshot \
    --source-snapshot-id snap-1234567890abcdef0 \
    --encrypted \
    --kms-key-id alias/aws/ebs

aws ec2 create-volume \
    --snapshot-id snap-encrypted123 \
    --availability-zone us-east-1a
```
### Conseils de surveillance

**Astuce 13 : Activez la surveillance détaillée de la production**
```bash
# Enable at launch
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --monitoring Enabled=true

# Enable for existing instance
aws ec2 monitor-instances \
    --instance-ids i-1234567890abcdef0

# Benefit: 1-minute intervals instead of 5-minute
```
**Astuce 14 : Créez des tableaux de bord CloudWatch personnalisés**
```python
#!/usr/bin/env python3
# create_ec2_dashboard.py

import boto3
import json

cloudwatch = boto3.client('cloudwatch')

def create_comprehensive_dashboard(instance_ids):
    """Create comprehensive dashboard for EC2 instances"""
    
    widgets = []
    
    # CPU utilization widget
    cpu_metrics = []
    for instance_id in instance_ids:
        cpu_metrics.append([
            "AWS/EC2", "CPUUtilization",
            {"stat": "Average", "label": instance_id},
            {"dimensions": {"InstanceId": instance_id}}
        ])
    
    widgets.append({
        "type": "metric",
        "properties": {
            "metrics": cpu_metrics,
            "period": 300,
            "stat": "Average",
            "region": "us-east-1",
            "title": "CPU Utilization",
            "yAxis": {"left": {"min": 0, "max": 100}}
        }
    })
    
    # Network traffic widget
    network_metrics = []
    for instance_id in instance_ids:
        network_metrics.extend([
            ["AWS/EC2", "NetworkIn", {"stat": "Sum", "label": f"{instance_id}-In"}],
            [".", "NetworkOut", {"stat": "Sum", "label": f"{instance_id}-Out"}]
        ])
    
    widgets.append({
        "type": "metric",
        "properties": {
            "metrics": network_metrics,
            "period": 300,
            "stat": "Sum",
            "region": "us-east-1",
            "title": "Network Traffic",
            "yAxis": {"left": {"label": "Bytes"}}
        }
    })
    
    dashboard_body = {"widgets": widgets}
    
    cloudwatch.put_dashboard(
        DashboardName='EC2-Production-Dashboard',
        DashboardBody=json.dumps(dashboard_body)
    )

# Example
create_comprehensive_dashboard(['i-123', 'i-456', 'i-789'])
```
**Astuce 15 : Configurez des alarmes de vérification de l'état avec récupération automatique**
```bash
# System status check (AWS infrastructure issues)
aws cloudwatch put-metric-alarm \
    --alarm-name system-status-check-$INSTANCE_ID \
    --metric-name StatusCheckFailed_System \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:automate:us-east-1:ec2:recover

# Instance status check (guest OS or network issues)
aws cloudwatch put-metric-alarm \
    --alarm-name instance-status-check-$INSTANCE_ID \
    --metric-name StatusCheckFailed_Instance \
    --namespace AWS/EC2 \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 2 \
    --threshold 1 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --alarm-actions arn:aws:automate:us-east-1:ec2:reboot
```
### Conseils d'optimisation des coûts

**Astuce 16 : Utilisez les plans d'épargne plutôt que les instances réservées**

Pour la plupart des charges de travail, les Compute Savings Plans offrent une meilleure flexibilité :
```bash
# Calculate commitment needed
# Based on steady-state usage (not peak)
aws ce get-savings-plans-purchase-recommendation \
    --savings-plan-type COMPUTE_SP \
    --term-in-years ONE_YEAR \
    --payment-option ALL_UPFRONT \
    --lookback-period-in-days SIXTY_DAYS

# Purchase Savings Plan
aws savingsplans create-savings-plan \
    --savings-plan-type COMPUTE_SP \
    --commitment 100 \
    --upfront-payment 876 \
    --purchase-time 2025-01-15T00:00:00Z
```
**Astuce 17 : Exploitez les instances Spot pour les charges de travail tolérantes aux pannes**
```bash
# Check Spot price history
aws ec2 describe-spot-price-history \
    --instance-types t3.medium m5.large \
    --product-descriptions "Linux/UNIX" \
    --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
    --query 'SpotPriceHistory[*].[Timestamp,InstanceType,SpotPrice]' \
    --output table

# Request Spot with max price
aws ec2 request-spot-instances \
    --spot-price "0.05" \
    --instance-count 5 \
    --type "persistent" \
    --launch-specification file://spot-spec.json
```
**Astuce 18 : Mettre en œuvre la planification d'instance**

Économisez jusqu'à 70 % sur les instances hors production :
```
Running 24/7: $140/month
Running business hours only (12 hours/day, 5 days/week): $42/month
Savings: $98/month per instance
```
**Astuce 19 : Supprimez les ressources inutilisées**
```bash
# Find stopped instances (still incurring EBS costs)
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=stopped" \
    --query 'Reservations[*].Instances[*].[InstanceId,LaunchTime,Tags[?Key==`Name`].Value|[0]]' \
    --output table

# Find unattached EBS volumes
aws ec2 describe-volumes \
    --filters "Name=status,Values=available" \
    --query 'Volumes[*].[VolumeId,Size,CreateTime]' \
    --output table

# Find unused Elastic IPs
aws ec2 describe-addresses \
    --filters "Name=association-id,Values=''" \
    --query 'Addresses[*].[PublicIp,AllocationId]' \
    --output table
```
**Astuce 20 : Utilisez AWS Compute Optimizer**
```bash
# Get recommendations for instances
aws compute-optimizer get-ec2-instance-recommendations \
    --instance-arns arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0 \
    --output json | jq '.instanceRecommendations[] | {
      current: .currentInstanceType,
      recommended: .recommendationOptions[0].instanceType,
      savingsPercent: .recommendationOptions[0].savingsOpportunity.savingsOpportunityPercentage
    }'
```
## Pièges \& Remèdes

### Piège 1 : sélectionner un mauvais type d'instance pour la charge de travail

**Problème :** Choisir des types d'instances en fonction de leur familiarité plutôt que des exigences de charge de travail, ce qui entraîne un surprovisionnement ou un sous-provisionnement.

**Pourquoi cela arrive :**

- Par défaut sur des choix "sûrs" (par exemple, toujours utiliser m5.large)
- Ne pas comprendre les caractéristiques de la charge de travail
- Copie de types d'instances à partir d'autres projets
- Ne pas tester différentes options

**Impact :**

- Gaspillage d'argent sur des ressources surprovisionnées
- Mauvaises performances dues à des ressources sous-approvisionnées
- Incapacité à évoluer efficacement
- Latence élevée pour les utilisateurs finaux

**Exemple :**
```
Scenario: Machine learning inference application
Wrong Choice: m5.xlarge ($140/month)
  - General purpose instance
  - CPU-based inference (slow)
  - No GPU acceleration

Right Choice: g4dn.xlarge ($390/month) or inf1.xlarge ($210/month)
  - GPU/Inferentia acceleration
  - 10x faster inference
  - Better cost per inference
```
**Remède :**

**Étape 1 : Profilez votre charge de travail**
```bash
# Install monitoring tools on instance
sudo yum install -y sysstat htop iotop

# Monitor CPU usage
mpstat 1 60

# Monitor memory
free -h && vmstat 1 60

# Monitor disk I/O
iostat -x 1 60

# Monitor network
sar -n DEV 1 60

# Application-level profiling
# For Python
python -m cProfile -o output.prof your_app.py

# For Java
java -Xprof -jar your_app.jar
```
**Étape 2 : Faire correspondre la famille d'instances à la charge de travail**
```python
#!/usr/bin/env python3
# workload_instance_matcher.py

def recommend_instance_family(workload_profile):
    """
    Recommend instance family based on workload characteristics
    """
    
    cpu_intensive = workload_profile.get('cpu_usage', 0) > 70
    memory_intensive = workload_profile.get('memory_usage', 0) > 70
    disk_io_intensive = workload_profile.get('disk_iops', 0) > 5000
    network_intensive = workload_profile.get('network_throughput', 0) > 5  # Gbps
    gpu_required = workload_profile.get('requires_gpu', False)
    
    recommendations = []
    
    if gpu_required:
        if workload_profile.get('workload_type') == 'ml_training':
            recommendations.append('P4d (NVIDIA A100) for ML training')
        elif workload_profile.get('workload_type') == 'ml_inference':
            recommendations.append('Inf1 (AWS Inferentia) for cost-effective inference')
            recommendations.append('G5 (NVIDIA A10G) for GPU inference')
        else:
            recommendations.append('G4dn (NVIDIA T4) for graphics/gaming')
    
    elif cpu_intensive and not memory_intensive:
        recommendations.append('C6i/C6g (Compute Optimized) for CPU-bound workloads')
        if workload_profile.get('supports_arm'):
            recommendations.append('C7g (Graviton3) for 20% better price-performance')
    
    elif memory_intensive:
        if workload_profile.get('memory_gb', 0) > 512:
            recommendations.append('X2iedn/High Memory for very large memory (>512 GB)')
        else:
            recommendations.append('R6i/R6g (Memory Optimized) for memory-intensive workloads')
    
    elif disk_io_intensive:
        recommendations.append('I3/I3en (Storage Optimized) with NVMe SSD')
        recommendations.append('I4i for highest IOPS (up to 3.3M IOPS)')
    
    elif network_intensive:
        recommendations.append('C5n (Compute with 100 Gbps networking)')
        recommendations.append('Consider Elastic Fabric Adapter (EFA) for HPC')
    
    else:
        # Balanced workload
        variable_cpu = workload_profile.get('cpu_variability', 0) > 50
        if variable_cpu:
            recommendations.append('T3/T4g (Burstable) for variable workloads')
        else:
            recommendations.append('M6i/M6g (General Purpose) for balanced workloads')
    
    return recommendations

# Example usage
workload = {
    'cpu_usage': 45,
    'memory_usage': 30,
    'disk_iops': 1000,
    'network_throughput': 1,
    'cpu_variability': 60,
    'requires_gpu': False,
    'supports_arm': True
}

recommendations = recommend_instance_family(workload)
print("Recommended Instance Families:")
for rec in recommendations:
    print(f"  - {rec}")
```
**Étape 3 : Utiliser AWS Compute Optimizer**
```bash
# Enable Compute Optimizer
aws compute-optimizer update-enrollment-status \
    --status Active

# Wait 24 hours for data collection

# Get recommendations
aws compute-optimizer get-ec2-instance-recommendations \
    --query 'instanceRecommendations[*].{
      Current: currentInstanceType,
      Recommended: recommendationOptions[0].instanceType,
      Reason: findingReasonCodes[0],
      SavingsPercent: recommendationOptions[0].savingsOpportunity.savingsOpportunityPercentage,
      InstanceId: instanceArn
    }' \
    --output table
```
**Étape 4 : Tester plusieurs types d'instances**
```bash
# Create test instances of different types
for type in t3.medium m5.large c5.large r5.large; do
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --instance-type $type \
        --subnet-id $SUBNET_ID \
        --security-group-ids $SG_ID \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=Test-$type},{Key=TestGroup,Value=InstanceTypeTest}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo "Launched $type: $INSTANCE_ID"
done

# Run load tests on each
# Compare performance and cost
# Select optimal type
```
**Prévention :**

- Toujours profiler les charges de travail avant de sélectionner les types d'instances
- Utiliser les recommandations de Compute Optimizer
- Tester plusieurs types d'instances pendant le développement
- Examiner et ajuster les types d'instances chaque trimestre
- Justification de la sélection du type d'instance de document

***

### Piège 2 : Ne pas mettre en œuvre un arrêt progressif

**Problème :** Les applications se sont arrêtées brusquement sans terminer les requêtes en cours ni enregistrer l'état, ce qui a entraîné une perte de données ou un état incohérent.

**Pourquoi cela arrive :**

- Ne pas gérer les signaux de terminaison
- En supposant que les instances s'exécuteront pour toujours
- Aucune logique d'arrêt progressif dans l'application
- Ne pas utiliser les hooks de cycle de vie Auto Scaling

**Impact :**

- Transactions perdues
- Données corrompues
- Mauvaise expérience utilisateur
- Dépannage difficile

**Remède :**

**Étape 1 : Gérer les signaux de fin**
```python
#!/usr/bin/env python3
# graceful_shutdown_example.py

import signal
import sys
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GracefulShutdownHandler:
    def __init__(self):
        self.shutdown_requested = False
        self.active_requests = 0
        
        # Register signal handlers
        signal.signal(signal.SIGTERM, self.request_shutdown)
        signal.signal(signal.SIGINT, self.request_shutdown)
    
    def request_shutdown(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown")
        self.shutdown_requested = True
        
        # Stop accepting new requests
        self.stop_accepting_requests()
        
        # Wait for active requests to complete
        while self.active_requests > 0:
            logger.info(f"Waiting for {self.active_requests} active requests to complete")
            time.sleep(1)
        
        # Perform cleanup
        self.cleanup()
        
        logger.info("Graceful shutdown complete")
        sys.exit(0)
    
    def stop_accepting_requests(self):
        """Stop accepting new requests"""
        # Remove from load balancer
        # Close listening sockets
        # Mark as draining
        logger.info("Stopped accepting new requests")
    
    def cleanup(self):
        """Perform cleanup tasks"""
        # Save state
        # Close database connections
        # Flush caches
        # Send final metrics
        logger.info("Cleanup complete")

# Usage in your application
shutdown_handler = GracefulShutdownHandler()

def handle_request():
    shutdown_handler.active_requests += 1
    try:
        # Process request
        pass
    finally:
        shutdown_handler.active_requests -= 1
```
**Étape 2 : implémentez le service Systemd pour un arrêt correct**
```bash
# Create systemd service file
sudo tee /etc/systemd/system/myapp.service <<'EOF'
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=myapp
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
ExecStop=/opt/myapp/stop.sh
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=90
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create stop script
sudo tee /opt/myapp/stop.sh <<'EOF'
#!/bin/bash
# Graceful shutdown script

echo "$(date): Starting graceful shutdown"

# 1. Stop accepting new requests
curl -X POST http://localhost:8080/admin/drain

# 2. Wait for in-flight requests (max 60 seconds)
for i in {1..60}; do
    ACTIVE=$(curl -s http://localhost:8080/admin/active-requests)
    if [ "$ACTIVE" -eq 0 ]; then
        echo "All requests completed"
        break
    fi
    echo "Waiting for $ACTIVE active requests..."
    sleep 1
done

# 3. Save state
/opt/myapp/save-state.sh

# 4. Stop application
kill -TERM $(cat /var/run/myapp.pid)

echo "$(date): Graceful shutdown complete"
EOF

chmod +x /opt/myapp/stop.sh

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
```
**Étape 3 : Utiliser les hooks de cycle de vie Auto Scaling**
```bash
# Create lifecycle hook for termination
aws autoscaling put-lifecycle-hook \
    --lifecycle-hook-name graceful-termination \
    --auto-scaling-group-name myapp-asg \
    --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \
    --heartbeat-timeout 120 \
    --default-result CONTINUE \
    --notification-target-arn arn:aws:sqs:us-east-1:123456789012:lifecycle-hooks

# Lambda function to handle lifecycle hook
cat > lifecycle_handler.py <<'EOF'
import boto3
import json
import time

ec2 = boto3.client('ec2')
asg = boto3.client('autoscaling')
ssm = boto3.client('ssm')

def lambda_handler(event, context):
    for record in event['Records']:
        message = json.loads(record['body'])
        
        instance_id = message['EC2InstanceId']
        lifecycle_hook_name = message['LifecycleHookName']
        asg_name = message['AutoScalingGroupName']
        
        print(f"Handling graceful shutdown for {instance_id}")
        
        # Send shutdown command via SSM
        response = ssm.send_command(
            InstanceIds=[instance_id],
            DocumentName='AWS-RunShellScript',
            Parameters={
                'commands': [
                    '/opt/myapp/graceful-shutdown.sh'
                ]
            }
        )
        
        command_id = response['Command']['CommandId']
        
        # Wait for command to complete (max 2 minutes)
        for i in range(24):  # 24 * 5 = 120 seconds
            result = ssm.get_command_invocation(
                CommandId=command_id,
                InstanceId=instance_id
            )
            
            if result['Status'] in ['Success', 'Failed']:
                break
            
            time.sleep(5)
        
        # Complete lifecycle action
        asg.complete_lifecycle_action(
            LifecycleHookName=lifecycle_hook_name,
            AutoScalingGroupName=asg_name,
            InstanceId=instance_id,
            LifecycleActionResult='CONTINUE'
        )
        
        print(f"Lifecycle action completed for {instance_id}")
EOF
```
**Étape 4 : Testez l'arrêt progressif**
```bash
# Test shutdown manually
sudo systemctl stop myapp

# Check logs
journalctl -u myapp -n 50

# Test with Auto Scaling
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 2  # Reduce from 3

# Monitor lifecycle hook
aws autoscaling describe-scaling-activities \
    --auto-scaling-group-name myapp-asg \
    --max-records 5
```
**Prévention :**

- Mettez toujours en œuvre un arrêt progressif dès le premier jour
- Tester régulièrement les procédures d'arrêt
- Surveiller les temps d'arrêt et ajuster les délais d'attente
- Utiliser des hooks de cycle de vie pour les groupes Auto Scaling
- Procédures d'arrêt des documents

***

### Piège 3 : Utilisation inappropriée des données utilisateur

**Problème :** Les scripts de données utilisateur échouent silencieusement, s'exécutent à chaque démarrage au lieu d'une seule fois ou contiennent des informations sensibles en texte brut.

**Pourquoi cela arrive :**

- Aucune gestion des erreurs dans les scripts de données utilisateur
- Mauvaise compréhension de l'exécution des données utilisateur (ne s'exécute qu'au premier démarrage)
- Intégration des secrets directement dans les données utilisateur
- Aucun mécanisme de journalisation ou de débogage

**Impact :**

- Instances mal configurées
- Failles de sécurité liées aux secrets exposés
- Dépannage difficile
- État de l'instance incohérent

**Remède :**

**Étape 1 : Structure appropriée du script de données utilisateur**
```bash
#!/bin/bash -ex
# -e: Exit on error
# -x: Print commands as they execute (for debugging)

# Redirect output to log file
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "$(date): Starting user data script"

# Function for error handling
error_exit() {
    echo "$(date): ERROR: $1" >&2
    exit 1
}

# Update system
yum update -y || error_exit "Failed to update system"

# Install dependencies
yum install -y \
    httpd \
    python3 \
    git \
    || error_exit "Failed to install dependencies"

# Download application
cd /opt
git clone https://github.com/myorg/myapp.git || error_exit "Failed to clone repository"

# Get secrets from Parameter Store (not hardcoded!)
DB_PASSWORD=$(aws ssm get-parameter \
    --name /myapp/db-password \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text) || error_exit "Failed to get DB password"

# Configure application
cat > /opt/myapp/config.json <<CONFIG
{
  "database": {
    "host": "db.example.com",
    "username": "app_user",
    "password": "$DB_PASSWORD"
  }
}
CONFIG

# Set permissions
chown -R myapp:myapp /opt/myapp
chmod 600 /opt/myapp/config.json

# Start application
systemctl start myapp || error_exit "Failed to start application"
systemctl enable myapp

# Signal completion (for CloudFormation)
# cfn-signal -e $? --stack ${AWS::StackName} --resource MyInstance --region ${AWS::Region}

echo "$(date): User data script completed successfully"
```
**Étape 2 : Utilisez cloud-init pour plus de contrôle**
```yaml
#cloud-config
# More robust than bash scripts for multi-cloud compatibility

repo_update: true
repo_upgrade: all

packages:
  - httpd
  - python3
  - git

write_files:
  - path: /etc/myapp/config.yml
    permissions: '0644'
    content: |
      server:
        port: 8080
        host: 0.0.0.0

runcmd:
  - systemctl start httpd
  - systemctl enable httpd
  - cd /opt && git clone https://github.com/myorg/myapp.git
  - /opt/myapp/setup.sh

final_message: "System initialized in $UPTIME seconds"
```
**Étape 3 : N'intégrez jamais de secrets dans les données utilisateur**
```bash
# BAD - Never do this
#!/bin/bash
DB_PASSWORD="mySecretPassword123"
API_KEY="sk-1234567890abcdef"

# GOOD - Use Parameter Store
#!/bin/bash
DB_PASSWORD=$(aws ssm get-parameter \
    --name /myapp/db-password \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text)

API_KEY=$(aws secretsmanager get-secret-value \
    --secret-id myapp/api-key \
    --query 'SecretString' \
    --output text)
```
**Étape 4 : Échecs du débogage des données utilisateur**
```bash
# SSH into instance and check logs
ssh -i mykey.pem ec2-user@instance-ip

# Check user data log
sudo cat /var/log/cloud-init-output.log
sudo cat /var/log/user-data.log

# Check cloud-init status
sudo cloud-init status --long

# Re-run user data manually for testing
sudo bash -x /var/lib/cloud/instance/user-data.txt
```
**Étape 5 : utilisez plutôt la commande d'exécution de Systems Manager**

Pour une configuration complexe :
```bash
# Instead of user data, use Run Command after launch
aws ssm send-command \
    --instance-ids i-1234567890abcdef0 \
    --document-name "AWS-RunShellScript" \
    --parameters commands=["
        cd /opt
        git clone https://github.com/myorg/myapp.git
        /opt/myapp/setup.sh
    "] \
    --comment "Configure application" \
    --timeout-seconds 600 \
    --cloud-watch-output-config '{
      "CloudWatchLogGroupName": "/aws/ssm/run-command",
      "CloudWatchOutputEnabled": true
    }'
```
**Prévention :**

- Utiliser les outils de gestion de configuration (Ansible, Chef, Puppet) pour les configurations complexes
- N'intégrez jamais de secrets dans les données utilisateur
- Toujours enregistrer l'exécution des données utilisateur
- Testez les scripts de données utilisateur avant le déploiement
- Utilisez cloud-init pour la compatibilité multiplateforme
- Pensez à utiliser AWS Systems Manager pour la configuration post-lancement

***

### Piège 4 : Ne pas surveiller ni dimensionner les instances

**Problème :** Exécuter des instances de tailles incorrectes indéfiniment, gaspiller de l'argent avec des ressources surprovisionnées ou souffrir de problèmes de performances dus à des instances sous-provisionnées.

**Pourquoi cela arrive :**

- Mentalité "Réglez-le et oubliez-le"
- Pas de processus d'examen régulier
- Manque de surveillance et d'alerte
- Peur d'impacter la production
- Ne pas comprendre l'utilisation actuelle des ressources

**Impact :**

- Budget gaspillé sur des instances surprovisionnées (30 à 50 % de gaspillage courant)
- Mauvaises performances des applications à partir d'instances sous-dimensionnées
- Échec de la planification des capacités
- Dépassements de budget

**Exemple :**
```
Running Instance: m5.2xlarge (8 vCPUs, 32 GiB RAM)
Cost: $280/month

Actual Usage:
- CPU: 15% average
- Memory: 8 GB used (25%)
- Network: Minimal

Right Size: t3.large (2 vCPUs, 8 GiB RAM)
Cost: $60/month
Savings: $220/month (78%)

Annual Savings per instance: $2,640
```
**Remède :**

**Étape 1 : Mettre en œuvre une surveillance continue**
```python
#!/usr/bin/env python3
# continuous_rightsizing_monitor.py

import boto3
from datetime import datetime, timedelta
import json

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')
ce = boto3.client('ce')

def analyze_instance_utilization(instance_id, days=30):
    """
    Comprehensive utilization analysis
    """
    
    end_time = datetime.now()
    start_time = end_time - timedelta(days=days)
    
    # Get instance details
    instance = ec2.describe_instances(InstanceIds=[instance_id])
    instance_data = instance['Reservations'][0]['Instances'][0]
    instance_type = instance_data['InstanceType']
    instance_name = next((tag['Value'] for tag in instance_data.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
    
    # Get CPU metrics
    cpu_metrics = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='CPUUtilization',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,  # 1 hour
        Statistics=['Average', 'Maximum', 'Minimum']
    )
    
    # Get memory metrics (requires CloudWatch agent)
    memory_metrics = cloudwatch.get_metric_statistics(
        Namespace='CWAgent',
        MetricName='mem_used_percent',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Average', 'Maximum']
    )
    
    # Get network metrics
    network_in = cloudwatch.get_metric_statistics(
        Namespace='AWS/EC2',
        MetricName='NetworkIn',
        Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
        StartTime=start_time,
        EndTime=end_time,
        Period=3600,
        Statistics=['Sum']
    )
    
    # Calculate averages
    cpu_datapoints = cpu_metrics['Datapoints']
    memory_datapoints = memory_metrics['Datapoints']
    network_datapoints = network_in['Datapoints']
    
    if not cpu_datapoints:
        return None
    
    avg_cpu = sum(d['Average'] for d in cpu_datapoints) / len(cpu_datapoints)
    max_cpu = max(d['Maximum'] for d in cpu_datapoints)
    min_cpu = min(d['Minimum'] for d in cpu_datapoints)
    
    avg_memory = 0
    max_memory = 0
    if memory_datapoints:
        avg_memory = sum(d['Average'] for d in memory_datapoints) / len(memory_datapoints)
        max_memory = max(d['Maximum'] for d in memory_datapoints)
    
    avg_network_gb = sum(d['Sum'] for d in network_datapoints) / len(network_datapoints) / (1024**3) if network_datapoints else 0
    
    # Get current cost
    current_cost = get_instance_monthly_cost(instance_type)
    
    # Generate recommendation
    recommendation = generate_rightsizing_recommendation(
        instance_type, avg_cpu, max_cpu, avg_memory, max_memory
    )
    
    return {
        'instance_id': instance_id,
        'instance_name': instance_name,
        'instance_type': instance_type,
        'metrics': {
            'cpu_avg': round(avg_cpu, 2),
            'cpu_max': round(max_cpu, 2),
            'cpu_min': round(min_cpu, 2),
            'memory_avg': round(avg_memory, 2),
            'memory_max': round(max_memory, 2),
            'network_avg_gb': round(avg_network_gb, 2)
        },
        'current_monthly_cost': current_cost,
        'recommendation': recommendation
    }

def generate_rightsizing_recommendation(instance_type, avg_cpu, max_cpu, avg_memory, max_memory):
    """
    Generate rightsizing recommendation based on metrics
    """
    
    # Instance family mapping
    instance_families = {
        'general': ['t3', 't3a', 't4g', 'm5', 'm5a', 'm6i', 'm6g', 'm7g'],
        'compute': ['c5', 'c5a', 'c6i', 'c6g', 'c7g'],
        'memory': ['r5', 'r5a', 'r6i', 'r6g', 'r7g'],
        'burstable': ['t3', 't3a', 't4g']
    }
    
    # Parse current instance
    family = instance_type.split('.')[0]
    size = instance_type.split('.')[1]
    
    # Sizing logic
    if avg_cpu < 10 and max_cpu < 30:
        action = 'DOWNSIZE'
        reason = f'Very low CPU usage (avg: {avg_cpu:.1f}%, max: {max_cpu:.1f}%)'
        
        # Suggest smaller size
        size_order = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge', '8xlarge']
        current_idx = size_order.index(size) if size in size_order else 0
        
        if current_idx > 0:
            suggested_size = size_order[current_idx - 1]
            suggested_type = f"{family}.{suggested_size}"
            estimated_savings = calculate_savings(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'estimated_monthly_savings': estimated_savings
            }
    
    elif avg_cpu < 20 and max_cpu < 40 and avg_memory < 30:
        action = 'SWITCH_TO_BURSTABLE'
        reason = f'Low consistent usage (CPU avg: {avg_cpu:.1f}%, mem avg: {avg_memory:.1f}%)'
        
        if family not in instance_families['burstable']:
            # Map to equivalent T3 size
            size_map = {
                'large': 'large',
                'xlarge': 'xlarge',
                '2xlarge': '2xlarge'
            }
            t3_size = size_map.get(size, 'large')
            suggested_type = f"t3.{t3_size}"
            estimated_savings = calculate_savings(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'estimated_monthly_savings': estimated_savings
            }
    
    elif avg_cpu > 70 or max_cpu > 90:
        action = 'UPSIZE'
        reason = f'High CPU usage (avg: {avg_cpu:.1f}%, max: {max_cpu:.1f}%)'
        
        # Suggest larger size
        size_order = ['micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge', '8xlarge', '16xlarge']
        current_idx = size_order.index(size) if size in size_order else 0
        
        if current_idx < len(size_order) - 1:
            suggested_size = size_order[current_idx + 1]
            suggested_type = f"{family}.{suggested_size}"
            additional_cost = calculate_additional_cost(instance_type, suggested_type)
            
            return {
                'action': action,
                'reason': reason,
                'suggested_type': suggested_type,
                'additional_monthly_cost': additional_cost
            }
    
    elif avg_memory > 70 and family not in instance_families['memory']:
        action = 'SWITCH_TO_MEMORY_OPTIMIZED'
        reason = f'High memory usage (avg: {avg_memory:.1f}%, max: {max_memory:.1f}%)'
        
        suggested_type = f"r6i.{size}"
        cost_difference = calculate_cost_difference(instance_type, suggested_type)
        
        return {
            'action': action,
            'reason': reason,
            'suggested_type': suggested_type,
            'monthly_cost_difference': cost_difference
        }
    
    else:
        return {
            'action': 'OPTIMAL',
            'reason': 'Instance appears to be properly sized',
            'suggested_type': instance_type,
            'estimated_monthly_savings': 0
        }

def get_instance_monthly_cost(instance_type):
    """Get estimated monthly cost for instance type"""
    # Simplified pricing - in production, use AWS Price List API
    pricing = {
        't3.micro': 7.59, 't3.small': 15.18, 't3.medium': 30.37, 't3.large': 60.74,
        't3.xlarge': 121.47, 't3.2xlarge': 242.94,
        'm5.large': 70.08, 'm5.xlarge': 140.16, 'm5.2xlarge': 280.32,
        'm5.4xlarge': 560.64, 'm5.8xlarge': 1121.28,
        'c5.large': 62.05, 'c5.xlarge': 124.10, 'c5.2xlarge': 248.20,
        'r5.large': 91.98, 'r5.xlarge': 183.96, 'r5.2xlarge': 367.92
    }
    return pricing.get(instance_type, 100.0)

def calculate_savings(current_type, suggested_type):
    """Calculate monthly savings"""
    return get_instance_monthly_cost(current_type) - get_instance_monthly_cost(suggested_type)

def calculate_additional_cost(current_type, suggested_type):
    """Calculate additional monthly cost"""
    return get_instance_monthly_cost(suggested_type) - get_instance_monthly_cost(current_type)

def calculate_cost_difference(current_type, suggested_type):
    """Calculate cost difference (positive = more expensive)"""
    return get_instance_monthly_cost(suggested_type) - get_instance_monthly_cost(current_type)

# Main execution
def generate_rightsizing_report():
    """Generate comprehensive rightsizing report for all instances"""
    
    # Get all running instances
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    recommendations = []
    total_potential_savings = 0
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            
            print(f"Analyzing {instance_id}...")
            
            analysis = analyze_instance_utilization(instance_id, days=30)
            
            if analysis and analysis['recommendation']['action'] != 'OPTIMAL':
                recommendations.append(analysis)
                
                if 'estimated_monthly_savings' in analysis['recommendation']:
                    total_potential_savings += analysis['recommendation']['estimated_monthly_savings']
    
    # Generate report
    print("\n" + "=" * 80)
    print("EC2 RIGHTSIZING RECOMMENDATIONS")
    print("=" * 80)
    
    if not recommendations:
        print("\n✓ All instances are optimally sized!")
    else:
        print(f"\nFound {len(recommendations)} instances that can be optimized:\n")
        
        for rec in recommendations:
            print(f"Instance: {rec['instance_name']} ({rec['instance_id']})")
            print(f"  Current Type: {rec['instance_type']} (${rec['current_monthly_cost']:.2f}/month)")
            print(f"  CPU Usage: Avg {rec['metrics']['cpu_avg']}%, Max {rec['metrics']['cpu_max']}%")
            print(f"  Memory Usage: Avg {rec['metrics']['memory_avg']}%, Max {rec['metrics']['memory_max']}%")
            print(f"  Action: {rec['recommendation']['action']}")
            print(f"  Reason: {rec['recommendation']['reason']}")
            print(f"  Suggested: {rec['recommendation']['suggested_type']}")
            
            if 'estimated_monthly_savings' in rec['recommendation']:
                print(f"  Monthly Savings: ${rec['recommendation']['estimated_monthly_savings']:.2f}")
            
            print()
    
    print(f"Total Potential Monthly Savings: ${total_potential_savings:.2f}")
    print(f"Total Potential Annual Savings: ${total_potential_savings * 12:.2f}")
    
    return recommendations

# Run the report
recommendations = generate_rightsizing_report()
```
**Étape 2 : Automatisez le redimensionnement**
```python
#!/usr/bin/env python3
# automated_rightsizing.py

import boto3
import time

ec2 = boto3.client('ec2')

def resize_instance(instance_id, new_instance_type, dry_run=True):
    """
    Safely resize an EC2 instance
    """
    
    print(f"Resizing {instance_id} to {new_instance_type}")
    
    # Get current state
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    current_type = instance['InstanceType']
    current_state = instance['State']['Name']
    
    if current_state != 'running':
        print(f"Instance is not running (state: {current_state})")
        return False
    
    if dry_run:
        print(f"[DRY RUN] Would resize from {current_type} to {new_instance_type}")
        return True
    
    try:
        # Create AMI for rollback
        print("Creating AMI backup...")
        ami_response = ec2.create_image(
            InstanceId=instance_id,
            Name=f"backup-{instance_id}-{int(time.time())}",
            Description=f"Backup before resize from {current_type} to {new_instance_type}",
            NoReboot=True
        )
        backup_ami_id = ami_response['ImageId']
        print(f"Backup AMI created: {backup_ami_id}")
        
        # Stop instance
        print("Stopping instance...")
        ec2.stop_instances(InstanceIds=[instance_id])
        
        # Wait for stopped state
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        print("Instance stopped")
        
        # Modify instance type
        print(f"Changing instance type to {new_instance_type}...")
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            InstanceType={'Value': new_instance_type}
        )
        print("Instance type modified")
        
        # Start instance
        print("Starting instance...")
        ec2.start_instances(InstanceIds=[instance_id])
        
        # Wait for running state
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        print("Instance started")
        
        # Wait for status checks
        print("Waiting for status checks...")
        time.sleep(60)
        
        # Verify instance is healthy
        status = ec2.describe_instance_status(InstanceIds=[instance_id])
        
        if status['InstanceStatuses']:
            instance_status = status['InstanceStatuses'][0]['InstanceStatus']['Status']
            system_status = status['InstanceStatuses'][0]['SystemStatus']['Status']
            
            if instance_status == 'ok' and system_status == 'ok':
                print("✓ Resize successful! Instance is healthy.")
                
                # Tag backup AMI for cleanup
                ec2.create_tags(
                    Resources=[backup_ami_id],
                    Tags=[
                        {'Key': 'AutoCleanup', 'Value': 'true'},
                        {'Key': 'CleanupAfterDays', 'Value': '7'}
                    ]
                )
                
                return True
            else:
                print(f"⚠️ Status checks not passing: instance={instance_status}, system={system_status}")
                print("Rolling back...")
                rollback_resize(instance_id, current_type)
                return False
        
    except Exception as e:
        print(f"Error during resize: {e}")
        print("Rolling back...")
        rollback_resize(instance_id, current_type)
        return False

def rollback_resize(instance_id, original_type):
    """Rollback instance to original type"""
    
    print(f"Rolling back {instance_id} to {original_type}")
    
    try:
        # Stop if running
        ec2.stop_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_stopped')
        waiter.wait(InstanceIds=[instance_id])
        
        # Change back to original type
        ec2.modify_instance_attribute(
            InstanceId=instance_id,
            InstanceType={'Value': original_type}
        )
        
        # Start instance
        ec2.start_instances(InstanceIds=[instance_id])
        waiter = ec2.get_waiter('instance_running')
        waiter.wait(InstanceIds=[instance_id])
        
        print("✓ Rollback complete")
        return True
        
    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        return False

# Schedule automated rightsizing
def schedule_rightsizing(instance_id, new_type, schedule_time):
    """
    Schedule instance rightsizing using EventBridge
    """
    
    events = boto3.client('events')
    lambda_client = boto3.client('lambda')
    
    # Create EventBridge rule
    rule_name = f"resize-{instance_id}"
    
    events.put_rule(
        Name=rule_name,
        ScheduleExpression=schedule_time,  # e.g., "cron(0 2 * * ? *)"
        State='ENABLED',
        Description=f'Resize {instance_id} to {new_type}'
    )
    
    # Add target (Lambda function)
    events.put_targets(
        Rule=rule_name,
        Targets=[{
            'Id': '1',
            'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:EC2-Resizer',
            'Input': json.dumps({
                'instance_id': instance_id,
                'new_type': new_type
            })
        }]
    )
    
    print(f"Scheduled resize of {instance_id} to {new_type} at {schedule_time}")

# Example usage
# Test resize (dry run)
resize_instance('i-1234567890abcdef0', 't3.medium', dry_run=True)

# Actual resize
# resize_instance('i-1234567890abcdef0', 't3.medium', dry_run=False)
```
**Étape 3 : Mettre en œuvre l'optimisation continue**
```bash
# Create Lambda function for weekly rightsizing analysis
aws lambda create-function \
    --function-name EC2-Rightsizing-Analyzer \
    --runtime python3.11 \
    --role arn:aws:iam::123456789012:role/LambdaEC2Analyzer \
    --handler rightsizing_analyzer.lambda_handler \
    --zip-file fileb://analyzer.zip \
    --timeout 900 \
    --memory-size 512

# Schedule weekly execution
aws events put-rule \
    --name weekly-rightsizing-analysis \
    --schedule-expression "cron(0 9 ? * MON *)" \
    --state ENABLED

aws events put-targets \
    --rule weekly-rightsizing-analysis \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:EC2-Rightsizing-Analyzer"
```
**Prévention :**

- Activer AWS Compute Optimizer
- Planifier des revues mensuelles de redimensionnement
- Automatiser la surveillance et les alertes
- Utilisez les tableaux de bord CloudWatch pour la visibilité de la flotte
- Mettre en œuvre un déploiement progressif des changements
- Test en hors-production d'abord

***

### Piège 5 : Ne pas mettre en œuvre une stratégie de sauvegarde appropriée

**Problème :** Aucune sauvegarde, sauvegardes incohérentes ou sauvegardes non testées pour la récupération, entraînant une perte de données en cas de sinistre.

**Pourquoi cela arrive :**

- En supposant qu'AWS sauvegarde automatiquement tout
- Aucune exigence de sauvegarde claire
- Processus de sauvegarde manuels ignorés
- Problèmes de coûts concernant le stockage de sauvegarde
- Aucun test de restauration de sauvegarde

**Impact :**

- Perte de données catastrophique
- Temps d'arrêt prolongé pendant la récupération
- Défaillances de conformité réglementaire
- Incapable de répondre aux exigences RPO/RTO
- Pannes de continuité des activités

**Remède :**

**Étape 1 : implémenter la sauvegarde AWS**
```bash
# Create backup vault
aws backup create-backup-vault \
    --backup-vault-name Production-Vault

# Create backup plan
aws backup create-backup-plan \
    --backup-plan file://backup-plan.json

# backup-plan.json
cat > backup-plan.json <<'EOF'
{
  "BackupPlanName": "Production-Daily-Weekly-Monthly",
  "Rules": [
    {
      "RuleName": "DailyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 35,
        "MoveToColdStorageAfterDays": 7
      },
      "RecoveryPointTags": {
        "BackupType": "Daily",
        "Environment": "Production"
      }
    },
    {
      "RuleName": "WeeklyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * SUN *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 180,
      "Lifecycle": {
        "DeleteAfterDays": 90
      },
      "RecoveryPointTags": {
        "BackupType": "Weekly",
        "Environment": "Production"
      }
    },
    {
      "RuleName": "MonthlyBackups",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 1 * ? *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 240,
      "Lifecycle": {
        "DeleteAfterDays": 365
      },
      "RecoveryPointTags": {
        "BackupType": "Monthly",
        "Environment": "Production"
      }
    }
  ]
}
EOF

# Create backup selection
aws backup create-backup-selection \
    --backup-plan-id $BACKUP_PLAN_ID \
    --backup-selection file://backup-selection.json

# backup-selection.json
cat > backup-selection.json <<'EOF'
{
  "SelectionName": "Production-Instances",
  "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole",
  "Resources": [
    "arn:aws:ec2:*:*:instance/*"
  ],
  "ListOfTags": [
    {
      "ConditionType": "STRINGEQUALS",
      "ConditionKey": "Backup",
      "ConditionValue": "Daily"
    }
  ]
}
EOF

# Tag instances for backup
aws ec2 create-tags \
    --resources i-1234567890abcdef0 i-0987654321fedcba0 \
    --tags Key=Backup,Value=Daily
```
**Étape 2 : implémenter des sauvegardes cohérentes avec les applications**
```python
#!/usr/bin/env python3
# application_consistent_backup.py

import boto3
import time
import subprocess

ssm = boto3.client('ssm')
ec2 = boto3.client('ec2')

def create_application_consistent_backup(instance_id):
    """
    Create application-consistent backup using pre/post scripts
    """
    
    print(f"Creating application-consistent backup for {instance_id}")
    
    # Step 1: Run pre-backup script (flush caches, quiesce database)
    print("Running pre-backup tasks...")
    pre_backup_command = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                '# Flush application caches',
                'sudo systemctl stop myapp',
                'sleep 5',
                '',
                '# Flush database',
                'mysql -e "FLUSH TABLES WITH READ LOCK;"',
                'sleep 2',
                '',
                '# Sync filesystem',
                'sync'
            ]
        }
    )
    
    command_id = pre_backup_command['Command']['CommandId']
    
    # Wait for command completion
    waiter = ssm.get_waiter('command_executed')
    waiter.wait(
        CommandId=command_id,
        InstanceId=instance_id
    )
    
    # Step 2: Create snapshot
    print("Creating EBS snapshots...")
    instance = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
    
    snapshot_ids = []
    for mapping in instance['BlockDeviceMappings']:
        volume_id = mapping['Ebs']['VolumeId']
        device_name = mapping['DeviceName']
        
        snapshot = ec2.create_snapshot(
            VolumeId=volume_id,
            Description=f'App-consistent backup of {instance_id} {device_name}',
            TagSpecifications=[{
                'ResourceType': 'snapshot',
                'Tags': [
                    {'Key': 'Name', 'Value': f'{instance_id}-{device_name}-backup'},
                    {'Key': 'InstanceId', 'Value': instance_id},
                    {'Key': 'BackupType', 'Value': 'ApplicationConsistent'},
                    {'Key': 'BackupTime', 'Value': time.strftime('%Y-%m-%d-%H-%M-%S')}
                ]
            }]
        )
        
        snapshot_ids.append(snapshot['SnapshotId'])
        print(f"  Created snapshot {snapshot['SnapshotId']} for {volume_id}")
    
    # Step 3: Run post-backup script (unlock database, restart app)
    print("Running post-backup tasks...")
    post_backup_command = ssm.send_command(
        InstanceIds=[instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                '# Unlock database',
                'mysql -e "UNLOCK TABLES;"',
                '',
                '# Restart application',
                'sudo systemctl start myapp',
                '',
                '# Verify application is healthy',
                'sleep 10',
                'curl -f http://localhost/health || exit 1'
            ]
        }
    )
    
    print(f"✓ Application-consistent backup completed. Snapshots: {snapshot_ids}")
    
    return snapshot_ids

def test_backup_restoration(snapshot_ids, test_subnet_id, test_sg_id):
    """
    Automatically test backup restoration
    """
    
    print("Testing backup restoration...")
    
    # Create volumes from snapshots
    volume_ids = []
    az = 'us-east-1a'  # Get from subnet
    
    for snapshot_id in snapshot_ids:
        volume = ec2.create_volume(
            SnapshotId=snapshot_id,
            AvailabilityZone=az,
            VolumeType='gp3',
            TagSpecifications=[{
                'ResourceType': 'volume',
                'Tags': [{'Key': 'Purpose', 'Value': 'BackupTest'}]
            }]
        )
        
        volume_ids.append(volume['VolumeId'])
    
    # Wait for volumes to be available
    waiter = ec2.get_waiter('volume_available')
    for volume_id in volume_ids:
        waiter.wait(VolumeIds=[volume_id])
    
    # Launch test instance
    print("Launching test instance...")
    test_instance = ec2.run_instances(
        ImageId='ami-dummy',  # Will be overridden by root volume
        InstanceType='t3.micro',
        MinCount=1,
        MaxCount=1,
        SubnetId=test_subnet_id,
        SecurityGroupIds=[test_sg_id],
        BlockDeviceMappings=[{
            'DeviceName': '/dev/xvda',
            'Ebs': {'VolumeId': volume_ids[0]}
        }],
        TagSpecifications=[{
            'ResourceType': 'instance',
            'Tags': [
                {'Key': 'Name', 'Value': 'Backup-Restore-Test'},
                {'Key': 'AutoTerminate', 'Value': 'true'}
            ]
        }]
    )
    
    test_instance_id = test_instance['Instances'][0]['InstanceId']
    
    # Wait for instance to start
    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[test_instance_id])
    
    # Run health check
    print("Running health checks on restored instance...")
    time.sleep(60)  # Wait for boot
    
    health_check = ssm.send_command(
        InstanceIds=[test_instance_id],
        DocumentName='AWS-RunShellScript',
        Parameters={
            'commands': [
                'systemctl status myapp',
                'curl -f http://localhost/health',
                '/opt/tests/backup-validation.sh'
            ]
        }
    )
    
    # Check results
    time.sleep(30)
    result = ssm.get_command_invocation(
        CommandId=health_check['Command']['CommandId'],
        InstanceId=test_instance_id
    )
    
    success = result['Status'] == 'Success'
    
    # Cleanup
    print("Cleaning up test resources...")
    ec2.terminate_instances(InstanceIds=[test_instance_id])
    
    if success:
        print("✓ Backup restoration test PASSED")
    else:
        print("❌ Backup restoration test FAILED")
        print(f"Output: {result['StandardOutputContent']}")
        print(f"Error: {result['StandardErrorContent']}")
    
    return success

# Example usage
# snapshot_ids = create_application_consistent_backup('i-1234567890abcdef0')
# test_backup_restoration(snapshot_ids, 'subnet-12345', 'sg-12345')
```
**Étape 3 : implémenter la réplication de sauvegarde entre régions**
```bash
# Copy snapshots to DR region
aws backup create-backup-plan \
    --backup-plan file://cross-region-backup-plan.json

# cross-region-backup-plan.json
cat > cross-region-backup-plan.json <<'EOF'
{
  "BackupPlanName": "Cross-Region-DR-Backups",
  "Rules": [
    {
      "RuleName": "DailyWithDRCopy",
      "TargetBackupVaultName": "Production-Vault",
      "ScheduleExpression": "cron(0 5 ? * * *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 120,
      "Lifecycle": {
        "DeleteAfterDays": 35
      },
      "CopyActions": [
        {
          "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:DR-Vault",
          "Lifecycle": {
            "DeleteAfterDays": 35,
            "MoveToColdStorageAfterDays": 7
          }
        }
      ]
    }
  ]
}
EOF
```
**Étape 4 : Surveillance automatisée des sauvegardes**
```python
#!/usr/bin/env python3
# backup_monitoring.py

import boto3
from datetime import datetime, timedelta

backup = boto3.client('backup')
cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

def check_backup_compliance():
    """
    Check if all instances have recent successful backups
    """
    
    ec2 = boto3.client('ec2')
    
    # Get instances that should have backups
    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'instance-state-name', 'Values': ['running']},
            {'Name': 'tag:Backup', 'Values': ['Daily', 'true']}
        ]
    )
    
    non_compliant = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_name = next((tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
            
            # Check for recent backup
            recovery_points = backup.list_recovery_points_by_resource(
                ResourceArn=f"arn:aws:ec2:{ec2.meta.region_name}:{instance['OwnerId']}:instance/{instance_id}"
            )
            
            recent_backup = None
            cutoff_time = datetime.now() - timedelta(days=2)
            
            for rp in recovery_points.get('RecoveryPoints', []):
                if rp['Status'] == 'COMPLETED' and rp['CreationDate'] > cutoff_time:
                    recent_backup = rp
                    break
            
            if not recent_backup:
                non_compliant.append({
                    'instance_id': instance_id,
                    'instance_name': instance_name,
                    'issue': 'No successful backup in last 48 hours'
                })
    
    if non_compliant:
        message = "Backup Compliance Alert\n\n"
        message += f"Found {len(non_compliant)} instances without recent backups:\n\n"
        
        for item in non_compliant:
            message += f"- {item['instance_name']} ({item['instance_id']}): {item['issue']}\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:backup-alerts',
            Subject='❌ Backup Compliance Issues Detected',
            Message=message
        )
        
        print(f"⚠️  Found {len(non_compliant)} non-compliant instances")
    else:
        print("✓ All instances have recent successful backups")
    
    # Publish metric
    cloudwatch.put_metric_data(
        Namespace='Backup/Compliance',
        MetricData=[{
            'MetricName': 'NonCompliantInstances',
            'Value': len(non_compliant),
            'Unit': 'Count',
            'Timestamp': datetime.now()
        }]
    )
    
    return non_compliant

# Run compliance check
check_backup_compliance()
```
**Prévention :**

- Activer AWS Backup pour toutes les ressources critiques
- Tagguer les ressources pour une sauvegarde automatisée
- Tester la restauration des sauvegardes mensuellement
- Surveiller quotidiennement la conformité des sauvegardes
- Implémenter la réplication inter-régions pour la reprise après sinistre
- Documenter les exigences RPO/RTO
- Automatiser les tests de sauvegarde

***

### Piège 6 : Ignorer la sécurité des métadonnées de l'instance

**Problème :** Ne pas sécuriser le service de métadonnées d'instance (IMDS), ce qui permet aux attaquants de voler les informations d'identification IAM s'ils accèdent à l'instance.

**Pourquoi cela arrive :**

- Utilisation d'IMDSv1 par défaut (moins sécurisé)
- Ne pas comprendre les implications en matière de sécurité IMDS
- Applications héritées qui ne prennent pas en charge IMDSv2
- Aucun processus de renforcement de la sécurité

**Impact :**

- Vol d'identifiants IAM via des attaques SSRF
- Élévation de privilèges
- Mouvement latéral dans l'environnement AWS
- Exfiltration de données

**Exemple d'attaque :**
```bash
# Attacker exploits SSRF vulnerability in application
# Using IMDSv1 (no token required)
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/MyRole

# Returns temporary credentials
{
  "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "very-long-token",
  "Expiration": "2025-01-15T12:00:00Z"
}

# Attacker now has your IAM role credentials
```
**Remède :**

**Étape 1 : Exiger IMDSv2 sur toutes les instances**
```bash
# For new instances
aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1,HttpEndpoint=enabled"

# For existing instances
aws ec2 modify-instance-metadata-options \
    --instance-id i-1234567890abcdef0 \
    --http-tokens required \
    --http-put-response-hop-limit 1

# Verify
aws ec2 describe-instances \
    --instance-ids i-1234567890abcdef0 \
    --query 'Reservations[0].Instances[0].MetadataOptions'
```
**Étape 2 : Mettre à jour les applications pour IMDSv2**
```python
# IMDSv1 (insecure)
import requests
response = requests.get('http://169.254.169.254/latest/meta-data/instance-id')

# IMDSv2 (secure - requires token)
import requests

# Get token
token_response = requests.put(
    'http://169.254.169.254/latest/api/token',
    headers={'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
)
token = token_response.text

# Use token for all requests
instance_id = requests.get(
    'http://169.254.169.254/latest/meta-data/instance-id',
    headers={'X-aws-ec2-metadata-token': token}
).text

# For boto3, it handles IMDSv2 automatically
import boto3
ec2_metadata = boto3.client('ec2-metadata')
```
**Étape 3 : Audit de la configuration IMDS**
```python
#!/usr/bin/env python3
# audit_imds_security.py

import boto3

ec2 = boto3.client('ec2')

def audit_imds_configuration():
    """
    Audit all instances for IMDS security configuration
    """
    
    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )
    
    vulnerable_instances = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_name = next((tag['Value'] for tag in instance.get('Tags', []) if tag['Key'] == 'Name'), 'Unknown')
            
            metadata_options = instance.get('MetadataOptions', {})
            http_tokens = metadata_options.get('HttpTokens', 'optional')
            hop_limit = metadata_options.get('HttpPutResponseHopLimit', 1)
            
            issues = []
            
            if http_tokens != 'required':
                issues.append('IMDSv1 enabled (HttpTokens=optional)')
            
            if hop_limit > 1:
                issues.append(f'Hop limit too high ({hop_limit}) - allows container access')
            
            if issues:
                vulnerable_instances.append({
                    'instance_id': instance_id,
                    'instance_name': instance_name,
                    'issues': issues
                })
    
    # Report
    print("=" * 80)
    print("IMDS SECURITY AUDIT")
    print("=" * 80)
    
    if not vulnerable_instances:
        print("\n✓ All instances have secure IMDS configuration")
    else:
        print(f"\n⚠️  Found {len(vulnerable_instances)} instances with IMDS security issues:\n")
        
        for item in vulnerable_instances:
            print(f"{item['instance_name']} ({item['instance_id']}):")
            for issue in item['issues']:
                print(f"  - {issue}")
            print()
    
    return vulnerable_instances

# Run audit
vulnerable = audit_imds_security()
```
**Étape 4 : implémenter les règles de pare-feu IMDS**
```bash
# On the instance, restrict access to IMDS from containers
sudo iptables -A OUTPUT -d 169.254.169.254 -m owner --uid-owner 1000 -j DROP

# Allow only specific user (e.g., application user)
sudo iptables -A OUTPUT -d 169.254.169.254 -m owner --uid-owner appuser -j ACCEPT
sudo iptables -A OUTPUT -d 169.254.169.254 -j DROP
```
**Étape 5 : Surveiller l'accès à IMDS**
```python
#!/usr/bin/env python3
# monitor_imds_access.py

import subprocess
import time
from collections import defaultdict

def monitor_imds_access():
    """
    Monitor and log IMDS access attempts
    """
    
    access_log = defaultdict(int)
    
    while True:
        # Check network connections to IMDS
        result = subprocess.run(
            ['netstat', '-an'],
            capture_output=True,
            text=True
        )
        
        for line in result.stdout.split('\n'):
            if '169.254.169.254' in line:
                # Log IMDS access
                parts = line.split()
                if len(parts) >= 5:
                    local_addr = parts[3]
                    access_log[local_addr] += 1
                    
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] IMDS access from {local_addr}")
        
        time.sleep(5)

# Run monitoring (as a service)
# monitor_imds_access()
```
**Prévention :**

- Exiger IMDSv2 sur toutes les nouvelles instances
- Migrer les instances existantes vers IMDSv2
- Audits de sécurité réguliers
- Mettre à jour tous les SDK AWS vers les dernières versions
- Mettre en œuvre une défense en profondeur (règles de pare-feu)
- Surveiller l'accès IMDS

***

## Résumé du chapitre

Amazon EC2 est la pierre angulaire des services de calcul AWS, fournissant des serveurs virtuels flexibles et évolutifs pour pratiquement toutes les charges de travail. Pour réussir avec EC2, il faut une compréhension approfondie des types d'instances, des modèles de tarification, de la gestion des AMI, de l'Auto Scaling et des meilleures pratiques opérationnelles.

**Principaux points à retenir :**

- **Choisissez les types d'instances en fonction des caractéristiques de la charge de travail :** Profilez vos applications pour qu'elles correspondent aux exigences en matière de processeur, de mémoire, de stockage et de réseau à la famille d'instances appropriée.
- **Exploitez plusieurs modèles de tarification :** utilisez la demande à la demande pour plus de flexibilité, les instances réservées ou les plans d'économies pour les charges de travail stables, et les instances ponctuelles pour les applications tolérantes aux pannes afin d'optimiser les coûts.
- **Automatiser avec Auto Scaling :** Implémentez des groupes Auto Scaling avec des politiques de mise à l'échelle appropriées pour gérer la charge variable tout en maintenant la disponibilité
- **Maîtrisez la gestion des AMI :** Créez des AMI standardisées pour des déploiements cohérents, versionnez-les correctement et mettez en œuvre la gestion du cycle de vie
- **Mettez en œuvre une surveillance complète :** Utilisez CloudWatch avec des métriques personnalisées, configurez des alarmes significatives et créez des tableaux de bord pour une visibilité opérationnelle
- **Donner la priorité à la sécurité :** Utilisez IMDSv2, mettez en œuvre les rôles IAM appropriés, chiffrez les volumes et suivez les principes du moindre privilège.
- **Planifier la reprise après sinistre :** Mettre en œuvre des sauvegardes automatisées, tester les procédures de restauration et répliquer les données critiques dans toutes les régions
- ** Ajustez la taille en permanence :** analysez régulièrement l'utilisation et ajustez les types d'instances pour optimiser les performances et les coûts.

Comprendre EC2 en profondeur vous permet de créer des applications rentables, hautement disponibles et performantes dans AWS. La base de calcul que vous avez construite ici prendra en charge l'intégralité de votre architecture cloud.

Au chapitre 5, nous explorerons AWS Lambda et l'informatique sans serveur, qui complète EC2 en permettant un calcul à mise à l'échelle automatique et basé sur les événements sans gérer les serveurs.

## Exercice pratique en laboratoire

**Objectif :** Créez une application Web prête pour la production et à mise à l'échelle automatique avec surveillance, sauvegardes et optimisation des coûts.

**Architecture:**
```
Internet → ALB → Auto Scaling Group (2-10 t3.medium instances)
          ↓
       CloudWatch Monitoring + Alarms
          ↓
       SNS Notifications
          ↓
    AWS Backup (Daily snapshots)
```
**Étapes de l'exercice :**

1. **Créer une AMI personnalisée**
    - Lancer l'instance de base
    - Installer et configurer l'application Web
    - Renforcer les paramètres de sécurité
    - Créez une AMI avec un nom et des balises appropriés
2. **Configurer la mise à l'échelle automatique**
    - Créer un modèle de lancement avec les données utilisateur
    - Créer un groupe Auto Scaling (min : 2, max : 10, souhaité : 3)
    - Configurer la mise à l'échelle du suivi de la cible (CPU à 50 %)
    - Configurer des hooks de cycle de vie pour un arrêt progressif
3. **Déployer l'équilibreur de charge**
    - Créer un équilibreur de charge d'application
    - Configurer le groupe cible avec des contrôles de santé
    - Mettre en place des règles d'écoute
4. **Surveillance de la mise en œuvre**
    - Activer une surveillance détaillée
    - Installer l'agent CloudWatch pour les métriques personnalisées
    - Créer un tableau de bord avec des indicateurs clés
    - Configurer des alarmes pour le processeur, la mémoire, le disque et les contrôles d'état
5. **Configurer les sauvegardes**
    - Mettre en place le plan de sauvegarde AWS
    - Baliser les instances pour une sauvegarde automatisée
    - Tester la restauration des sauvegardes
6. **Optimisation des coûts**
    - Analyser l'utilisation des instances
    - Générer des recommandations de redimensionnement
    - Implémenter la planification des instances pour les non-prod
7. **Tester et valider**
    - Exécuter un test de charge pour déclencher la mise à l'échelle
    - Vérifier la surveillance et les alarmes
    - Tester l'arrêt progressif
    - Valider la restauration des sauvegardes

**Résultats attendus :**

- Application de mise à l'échelle automatique entièrement fonctionnelle
- Surveillance et alerte complètes
- Stratégie de sauvegarde automatisée
- Plan d'optimisation des coûts

**Nettoyage :**
```bash
# Delete Auto Scaling Group
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name myapp-asg --force-delete

# Delete Load Balancer
aws elbv2 delete-load-balancer --load-balancer-arn $ALB_ARN

# Delete Launch Template
aws ec2 delete-launch-template --launch-template-id $TEMPLATE_ID

# Deregister AMI
aws ec2 deregister-image --image-id $AMI_ID
```
## Questions de révision

1. **Quelle famille d'instances convient le mieux aux applications nécessitant un rapport mémoire/CPU élevé ?**
a) C5 (calcul optimisé)
b) M5 (usage général)
c) R5 (mémoire optimisée)
d) T3 (éclatable)

**Réponse : C** - Les instances R5 sont optimisées en termes de mémoire avec des ratios mémoire/CPU élevés, idéaux pour les bases de données et les analyses en mémoire.

2. **Quelle est la principale différence entre les instances à la demande et les instances Spot ?**
a) Les instances Spot sont plus rapides
b) Les instances Spot peuvent être interrompues avec un préavis de 2 minutes
c) Les instances à la demande sont régionales
d) Les instances Spot ont une capacité garantie

**Réponse : B** - Les instances Spot utilisent la capacité disponible et peuvent être interrompues avec un avertissement de 2 minutes lorsqu'AWS a besoin de récupérer la capacité.

3. **Quel modèle de tarification offre le plus de flexibilité ?**
a) Instances réservées
b) Plans d'épargne
c) Hôtes dédiés
d) À la demande

**Réponse : D** – Le service à la demande ne comporte aucun engagement et offre la plus grande flexibilité, même s'il s'agit du service le plus cher.

4. **Qu'arrive-t-il aux données du stockage d'instance lorsqu'une instance est arrêtée ?**
a) Les données persistent
b) Les données sont perdues
c) Les données sont déplacées vers EBS
d) Les données sont archivées sur S3

**Réponse : B** - Les données du magasin d'instance sont éphémères et perdues lorsque l'instance est arrêtée, terminée ou en cas de panne du matériel sous-jacent.

5. **Quel type de groupe de placement offre la latence réseau la plus faible ?**
a) Propagation
b) Partitionner
c) Grappe
d) Par défaut

**Réponse : C** - Les groupes de placement de cluster placent les instances rapprochées dans une seule zone de disponibilité pour une latence la plus faible et un débit le plus élevé.

6. **Quel est l'avantage d'utiliser IMDSv2 par rapport à IMDSv1 ?**
a) Récupération plus rapide des métadonnées
b) Plus de métadonnées disponibles
c) Protection contre les attaques SSRF
d) Aucune différence

**Réponse : C** - IMDSv2 nécessite des jetons de session, offrant une protection en profondeur contre les attaques SSRF.

7. **À quelle fréquence les données utilisateur EC2 sont-elles exécutées par défaut ?**
a) Chaque démarrage
b) Uniquement au premier lancement
c) Lorsque l'instance est arrêtée/démarrée
d) Jamais automatiquement

**Réponse : B** - Les données utilisateur ne s'exécutent qu'une seule fois lors du premier lancement par défaut (peuvent être configurées pour s'exécuter à chaque démarrage avec cloud-init).

8. **Quel type de stratégie Auto Scaling est le mieux adapté aux modèles de trafic prévisibles ?**
a) Suivi de cible
b) Mise à l'échelle des étapes
c) Mise à l'échelle planifiée
d) Mise à l'échelle simple

**Réponse : C** - La mise à l'échelle planifiée est idéale pour les modèles de trafic connus et prévisibles (par exemple, augmenter chaque matin).

9. **Quelle est la remise maximale sur les instances ponctuelles par rapport à l'instance à la demande ?**
a) 50%
b) 70%
c) 90 %
d) 95 %

**Réponse : C** - Les instances Spot peuvent offrir jusqu'à 90 % de réduction par rapport à la tarification à la demande.

10. **Quel service fournit des correctifs automatisés pour les flottes EC2 ?**
a) Sauvegarde AWS
b) Gestionnaire de correctifs AWS Systems Manager
c) CloudWatch
d)AWSConfiguration

**Réponse : B** - AWS Systems Manager Patch Manager fournit des correctifs automatisés avec des fenêtres de maintenance et un suivi de la conformité.

11. **Quel est l'avantage d'utiliser des plans d'épargne par rapport aux instances réservées ?**
a) Remise plus élevée
b) Plus de flexibilité entre les familles d'instances
c) Aucun engagement requis
d) Annulation gratuite

**Réponse : B** - Les plans d'économies de calcul offrent une flexibilité pour les familles d'instances, les tailles, les régions et même Lambda/Fargate.

12. **Quelle métrique n'est PAS disponible par défaut dans CloudWatch pour EC2 ?**
a) Utilisation du processeur
b) Entrée/Sortie réseau
c) Utilisation de la mémoire
d) Opérations de lecture/écriture sur disque

**Réponse : C** - L'utilisation de la mémoire nécessite l'installation de l'agent CloudWatch car elle n'est pas visible par l'hyperviseur.

13. **Quel est l'objectif d'un modèle de lancement EC2 ?**
a) Créer des AMI
b) Définir la configuration de l'instance pour le lancement
c) Surveiller les instances
d) Instances de sauvegarde

**Réponse : B** - Les modèles de lancement définissent la configuration de l'instance (AMI, type d'instance, groupes de sécurité, etc.) pour des lancements cohérents.

14. **Quelle affirmation concernant les AMI basées sur EBS est VRAIE ?**
a) Ne peut pas être arrêté
b) Le volume racine est éphémère
c) Peut être arrêté sans perte de données
d) Temps de démarrage plus lents que le magasin d'instance

**Réponse : C** - Les instances basées sur EBS peuvent être arrêtées et démarrées sans perdre les données des volumes EBS.

15. **Quelle est la méthode recommandée pour accéder aux instances EC2 sans clés SSH ?**
a) Connexion d'instance EC2
b) Gestionnaire de sessions AWS Systems Manager
c) VNC
d) Bureau à distance

**Réponse : B** - Systems Manager Session Manager fournit un accès sécurisé et vérifiable sans gérer les clés SSH ou les hôtes bastions.

***
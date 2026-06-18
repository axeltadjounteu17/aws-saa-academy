# Chapitre 5 : Équilibrage de charge élastique

##Présentation

Elastic Load Balancing (ELB) est l'épine dorsale de distribution du trafic des applications AWS, distribuant automatiquement le trafic des applications entrant sur plusieurs cibles telles que les instances EC2, les conteneurs, les adresses IP et les fonctions Lambda. Dans les architectures cloud modernes, les équilibreurs de charge ne sont pas de simples composants facultatifs : ils sont essentiels pour atteindre la haute disponibilité, la tolérance aux pannes et l'évolutivité horizontale. Sans équilibrage de charge, les applications restent des points de défaillance uniques, incapables de gérer les pics de trafic ou de se remettre correctement des pannes.

L'évolution des équilibreurs de charge AWS reflète l'évolution des besoins des applications cloud. Ce qui a commencé avec les équilibreurs de charge classiques a évolué vers trois types spécialisés : les équilibreurs de charge d'application pour le trafic HTTP/HTTPS avec routage avancé, les équilibreurs de charge réseau pour le trafic TCP/UDP à très faible latence et les équilibreurs de charge de passerelle pour les appliances virtuelles tierces. Chaque type répond à des cas d'utilisation distincts, et la sélection du mauvais peut entraîner des goulots d'étranglement en termes de performances, une augmentation des coûts ou des limitations architecturales.

Comprendre ELB va bien au-delà de la simple distribution du trafic. Les équilibreurs de charge modernes fournissent une terminaison SSL/TLS, réduisant ainsi la surcharge de calcul sur les serveurs back-end ; mettre en œuvre des contrôles de santé sophistiqués pour acheminer le trafic uniquement vers des cibles saines ; prend en charge les protocoles WebSocket et HTTP/2 pour les applications en temps réel ; intégrer avec WAF pour la sécurité ; et fournir des mesures détaillées pour l’observabilité. Une configuration correcte de l'équilibreur de charge est essentielle : des contrôles d'état mal configurés peuvent marquer des instances saines comme étant défectueuses, les paramètres d'équilibrage de charge entre zones affectent la disponibilité et des règles d'écoute incorrectes peuvent acheminer le trafic vers de mauvaises cibles.

Ce chapitre fournit une couverture complète d'Elastic Load Balancing, des principes fondamentaux aux modèles de production. Vous apprendrez à sélectionner le type d'équilibreur de charge approprié pour votre charge de travail, à configurer des règles de routage avancées, à mettre en œuvre la terminaison SSL/TLS, à concevoir des contrôles d'état qui reflètent avec précision l'état des applications, à optimiser les performances et à résoudre les problèmes courants. Que vous créiez une application Web simple ou une architecture de microservices complexe, la maîtrise d'ELB est essentielle pour les déploiements AWS prêts pour la production.

## Théorie \&Concepts

### Principes fondamentaux de l'équilibrage de charge

L'équilibrage de charge répartit les requêtes des clients sur plusieurs serveurs back-end pour garantir qu'aucun serveur ne soit submergé, améliorant ainsi à la fois la disponibilité et les performances.

**Principaux avantages :**

1. **Haute disponibilité :** si une cible échoue, le trafic est acheminé vers des cibles saines
2. **Évolutivité horizontale :** Ajoutez plus de cibles pour gérer une charge accrue
3. **Tolérance aux pannes :** Vérification automatique de l'état et réacheminement du trafic
4. **Latence réduite :** Acheminez le trafic vers des cibles optimales en fonction de divers critères
5. **Déchargement SSL/TLS :** Terminez le chiffrement au niveau de l'équilibreur de charge, réduisant ainsi la charge du backend
6. **Affinité de session :** Maintenez les sessions utilisateur avec des cibles spécifiques si nécessaire

**Algorithmes d'équilibrage de charge :**

**Round Robin :** distribue les requêtes de manière séquentielle entre les cibles (par défaut pour ALB/CLB)

**Moins de demandes en attente :** Routes vers la cible avec le moins de connexions actives (ALB)

**Flow Hash :** Routes basées sur un hachage à 5 tuples pour un routage cohérent (NLB)

**Groupes cibles pondérés :** distribue le trafic en fonction des pondérations attribuées

### Comparaison des types d'ELB

AWS propose quatre types d'équilibreurs de charge, chacun optimisé pour des cas d'utilisation spécifiques.

| Fonctionnalité | Demande (ALB) | Réseau (NLB) | Passerelle (GLB) | Classique (BEC) |
| :-- | :-- | :-- | :-- | :-- |
| **Couche OSI** | Couche 7 (HTTP/HTTPS) | Couche 4 (TCP/UDP/TLS) | Couche 3 (IP) + Couche 4 | Couche 4/7 |
| **Prise en charge du protocole** | HTTP, HTTPS, HTTP/2, WebSocket, gRPC | TCP, UDP, TLS | Paquets IP | HTTP, HTTPS, TCP, SSL |
| **Types de cibles** | Instance, IP, Lambda | Instance, IP, ALB | Points de terminaison de l’appliance de passerelle | Instance |
| **Routage** | Basé sur le contenu, basé sur l'hôte, basé sur le chemin | Algorithme de hachage de flux | Flux de hachage vers les appareils | De base |
| **IP statique** | Non (mais prend en charge via NLB) | Oui (IP élastique par AZ) | Oui | Non |
| **Performances** | Bon | Excellent (millions de rps, latence ultra faible) | Haut débit | Modéré |
| **Bilans de santé** | HTTP/HTTPS avec chemin | TCP, HTTP, HTTPS | Spécifique au protocole | TCP, HTTP, HTTPS |
| **Résiliation SSL** | Oui | Oui | Non | Oui |
| **WebSockets** | Oui | Oui | Non | Non (partiel) |
| **Cas d'utilisation** | Microservices, conteneurs, Lambda | Jeux, IoT, temps réel, applications TCP | Appareils de pare-feu, IDS/IPS | Héritage (obsolète) |
| **Tarif** | Par heure + LCU | Par heure + NLCU | Par heure + GLCU | Par heure + données |
| **Statut** | Actuel | Actuel | Actuel | Héritage (non recommandé) |

**Recommandation :** Utilisez ALB pour les charges de travail HTTP/HTTPS, NLB pour TCP/UDP ou lorsque des adresses IP statiques sont nécessaires, GLB pour l'intégration d'appliances. Évitez CLB pour les nouveaux déploiements.

### Analyse approfondie de l'équilibreur de charge d'application (ALB)

ALB fonctionne au niveau de la couche 7 (HTTP/HTTPS) et offre des capacités de routage avancées.

**Principales caractéristiques :**

**1. Routage basé sur le contenu :**

Acheminez les requêtes en fonction des en-têtes HTTP, des méthodes, des paramètres de requête et de l'adresse IP source :
```
Rules can check:
- Host headers (api.example.com vs www.example.com)
- Path patterns (/api/* vs /images/*)
- HTTP headers (X-Custom-Header)
- HTTP methods (GET, POST, PUT, DELETE)
- Query strings (?user=premium)
- Source IP CIDR
```
**2. Types de cibles :**

- **Instances :** instances EC2 dans le même VPC
- **Adresses IP :** Toute adresse IP privée (sur site, autres VPC)
- **Fonctions Lambda :** Intégration sans serveur

**3. Règles d'écoute :**

Chaque écouteur peut avoir plusieurs règles évaluées par ordre de priorité :
```
Listener (Port 443)
├── Rule 1 (Priority 1): Host is api.example.com → API Target Group
├── Rule 2 (Priority 2): Path is /images/* → Static Content TG
├── Rule 3 (Priority 3): Header X-Version is v2 → New Version TG
└── Default Rule: → Main Application TG
```
**4. Résiliation SSL/TLS :**

ALB peut mettre fin aux connexions SSL/TLS :

- Prend en charge SNI (Server Name Indication) pour plusieurs certificats
- S'intègre à ACM (AWS Certificate Manager)
- Prend en charge les politiques de sécurité personnalisées
- Décharge le cryptage/déchiffrement des serveurs backend

**5. Sessions collantes (affinité de session) :**

Maintient les sessions utilisateur avec la même cible :

- **Basé sur la durée :** Durée fixe (1 seconde à 7 jours)
- **Basé sur une application :** utilise un cookie d'application

**6. Prise en charge HTTP/2 et gRPC :**

- Prise en charge native de HTTP/2 pour les connexions frontend
- Routage gRPC et équilibrage de charge
- Prise en charge de WebSocket pour la communication en temps réel

**7. Authentification :**

ALB peut authentifier les utilisateurs :

- Groupes d'utilisateurs Amazon Cognito
- Fournisseurs OpenID Connect (OIDC)
- IdP basés sur SAML

**Composants ALB :**
```
Application Load Balancer
├── Listener (Port, Protocol)
│   ├── Default Action (Forward, Redirect, Fixed Response, Authenticate)
│   └── Rules (Conditions → Actions)
├── Target Groups
│   ├── Targets (Instances, IPs, Lambda)
│   ├── Health Check Configuration
│   └── Attributes (Deregistration delay, stickiness, slow start)
└── Security Settings
    ├── Security Groups
    └── SSL/TLS Policies
```
**Algorithme de routage ALB :**

1. **Demandes les moins en attente :** Itinéraires vers la cible avec le moins de demandes actives
2. **Round Robin :** Si les demandes sont égales, utilise le round robin
3. **Sessions persistantes :** Si cette option est activée, les itinéraires renvoient les utilisateurs vers la même cible

### Analyse approfondie de l'équilibreur de charge réseau (NLB)

NLB fonctionne au niveau de la couche 4 (TCP/UDP/TLS) et est conçu pour des performances extrêmes et une faible latence.

**Principales caractéristiques :**

**1. Ultra-haute performance :**

- Gère des millions de requêtes par seconde
- Latence ultra-faible (<1 ms)
- Maintient les connexions clients existantes pendant la mise à l'échelle

**2. Adresses IP statiques :**

- Une adresse IP élastique par zone de disponibilité
- Idéal pour la liste blanche dans les pare-feu
- Prend en charge PrivateLink pour l'exposition du service

**3. Préserver l'adresse IP source :**

- IP client préservée pour le backend (contrairement à ALB)
- Pas besoin d'en-tête X-Forwarded-For

**4. Terminaison TLS :**

- Terminer TLS au niveau de l'équilibreur de charge (fonctionnalité ajoutée)
- S'intègre à ACM
- Prend en charge SNI

**5. Types de cibles :**

- Les cas
- Adresses IP (y compris hors VPC)
- Application Load Balancers (pour combiner les avantages L4 + L7)

**6. Routage basé sur la connexion :**

- Utilise un algorithme de hachage de flux (5-tuple : protocole, IP source/dest, port source/dest)
- Garantit que les paquets du même flux atteignent la même cible
- Maintient l'affinité de connexion

**7. Équilibrage de charge entre zones :**

- Facultatif (désactivé par défaut, contrairement à ALB)
- Aucun frais de transfert de données lorsqu'il est activé (contrairement à ALB)

**Cas d'utilisation du NLB :**

- **Serveurs de jeux :** Faible latence, préserve l'adresse IP du client
- **Applications IoT :** Des millions de connexions simultanées
- **Charges de travail TCP/UDP :** Protocoles non HTTP
- **Exigences IP statiques :** Liste blanche du pare-feu
- **PrivateLink :** Exposez les services en privé


### Équilibreur de charge de passerelle (GLB)

GLB permet le déploiement et la mise à l'échelle d'appliances virtuelles tierces (pare-feu, IDS/IPS, DPI).

**Architecture:**
```
Internet/VPC
    ↓
Gateway Load Balancer (GLB)
    ↓ (GENEVE encapsulation)
Appliance Fleet (Auto Scaling)
    ↓ (Return traffic)
GLB
    ↓
Original Destination
```
**Principales caractéristiques :**

1. **Inspection transparente :** Flux de circulation maintenu grâce aux appareils
2. **Protocole GENEVE :** Encapsule les paquets d'origine pour le traitement de l'appliance
3. **Auto Scaling :** Faites évoluer le parc d'appareils en fonction du trafic
4. **Haute disponibilité :** répartit le trafic entre les appareils sains
5. **Sécurité centralisée :** Point unique pour le déploiement des dispositifs de sécurité

**Cas d'utilisation :**

- Déployer des pare-feu tiers (Palo Alto, Fortinet, Check Point)
- Systèmes de détection/prévention des intrusions (IDS/IPS)
- Inspection approfondie des paquets (DPI)
- Surveillance et analyse du réseau


### Bilans de santé

Les contrôles d'état déterminent quelles cibles sont saines et peuvent recevoir du trafic.

**Paramètres du contrôle de santé :**


| Paramètre | Descriptif | ALB/CLB | NLB |
| :-- | :-- | :-- | :-- |
| **Protocole** | HTTP, HTTPS, TCP | HTTP/HTTPS | TCP, HTTP, HTTPS |
| **Port** | Port à vérifier | Oui | Oui |
| **Chemin** | Chemin HTTP à vérifier | Oui (obligatoire pour HTTP) | Oui (facultatif) |
| **Intervalle** | Secondes entre les contrôles | 5-300 secondes | 10 ou 30 secondes |
| **Délai d'attente** | Temps d'attente pour réponse | 2-120 secondes | 6 ou 10 secondes |
| **Seuil sain** | Succès consécutifs | 2-10 | 2-10 |
| **Seuil malsain** | Échecs consécutifs | 2-10 | 2-10 |
| **Codes de réussite** | Codes de réponse HTTP | 200-499 | 200-499 |

**États du contrôle de santé :**
```
Initial → Unhealthy (default starting state)
         ↓
    [Checks Begin]
         ↓
    [Success × Healthy Threshold] → Healthy
         ↓
    [Failure × Unhealthy Threshold] → Unhealthy
```
**Meilleures pratiques en matière de bilan de santé :**
```python
# Good health check endpoint
@app.route('/health')
def health_check():
    # Check application dependencies
    checks = {
        'database': check_database_connection(),
        'cache': check_redis_connection(),
        'disk_space': check_disk_space(),
        'memory': check_memory_usage()
    }
    
    # Return 200 only if all critical checks pass
    if all(checks.values()):
        return {'status': 'healthy', 'checks': checks}, 200
    else:
        return {'status': 'unhealthy', 'checks': checks}, 503
```
**Délai du contrôle de santé :**
```
Time to become healthy: (Healthy Threshold × Interval) seconds
Example: 2 × 30 = 60 seconds minimum

Time to become unhealthy: (Unhealthy Threshold × Interval) seconds
Example: 2 × 30 = 60 seconds minimum

Total time for failover: Up to 2 minutes typical
```
### Délai de vidange de connexion et de désenregistrement

Lorsqu'une cible est désenregistrée (arrêt de l'instance, échec de la vérification de l'état), l'équilibreur de charge gère correctement les connexions en cours.

**Délai de désenregistrement (vidange de connexion) :**

- **Par défaut :** 300 secondes (5 minutes)
- **Plage :** 0-3 600 secondes (1 heure)
- **Comportement :** L'équilibreur de charge arrête d'envoyer de nouvelles connexions mais permet aux connexions existantes de se terminer

**Processus :**
```
1. Target marked for deregistration
2. Load balancer stops sending new requests to target
3. Existing connections continue up to deregistration delay
4. After delay, connections forcibly closed
5. Target fully deregistered
```
**Paramètres optimaux :**
```
Quick stateless requests (API): 30-60 seconds
Long-polling connections: 300-900 seconds
WebSocket applications: 3600 seconds
File downloads: 3600 seconds
```
### Équilibrage de charge entre zones

Détermine si l'équilibreur de charge répartit le trafic sur toutes les cibles dans toutes les zones de disponibilité activées.

**Activé (recommandé) :**
```
AZ-1: 2 instances (receive 50% of traffic)
AZ-2: 4 instances (receive 50% of traffic)

Each instance in AZ-1 gets 25% traffic
Each instance in AZ-2 gets 12.5% traffic
```
**Désactivé:**
```
AZ-1: 2 instances (receive traffic from AZ-1 LB node)
AZ-2: 4 instances (receive traffic from AZ-2 LB node)

Traffic distributed only within each AZ
Can lead to imbalanced load if traffic sources uneven
```
**Comparaison :**


| Fonctionnalité | ALB | NLB | BEC |
| :-- | :-- | :-- | :-- |
| **Par défaut** | Activé | Désactivé | Désactivé |
| **Peut désactiver** | Oui | Non (évalue toujours toutes les cibles) | Oui |
| **Frais de transfert de données** | Oui (frais inter-AZ) | Non | Oui |

**Recommandation :** Activez l'interzone pour une distribution uniforme, sauf si vous avez des exigences d'affinité AZ spécifiques ou si vous souhaitez minimiser les coûts de transfert de données entre AZ.

### Résiliation SSL/TLS

Les équilibreurs de charge peuvent mettre fin aux connexions SSL/TLS, déchiffrant le trafic avant de le transmettre aux cibles.

**Avantages :**

1. **Charge back-end réduite :** Chiffrement gourmand en CPU géré par l'équilibreur de charge
2. **Gestion centralisée des certificats :** Un seul endroit pour gérer les certificats
3. **Configuration simplifiée de la cible :** Les cibles reçoivent du HTTP simple
4. **Support SNI :** Hébergez plusieurs domaines SSL sur le même équilibreur de charge
5. **Suites de chiffrement modernes :** Mettez facilement à jour les politiques de sécurité

**Options architecturales :**

**1. Terminaison SSL au niveau de l'équilibreur de charge (la plus courante) :**
```
Client (HTTPS) → Load Balancer (Terminates SSL) → Target (HTTP)

Benefits: Offload encryption, simpler target config
Drawbacks: Unencrypted in VPC (mitigated by VPC security)
```
**2. Chiffrement de bout en bout :**
```
Client (HTTPS) → Load Balancer (Terminates SSL) → Target (HTTPS)

Benefits: Encrypted throughout, compliance requirements
Drawbacks: Higher target CPU usage
```
**3. Passthrough SSL (NLB uniquement) :**
```
Client (TLS) → Load Balancer (No termination) → Target (TLS)

Benefits: End-to-end encryption, load balancer doesn't see decrypted traffic
Drawbacks: No Layer 7 routing, can't inspect traffic
```
**Politiques SSL/TLS :**

AWS fournit des politiques de sécurité prédéfinies :


| Politique | Versions TLS | Cas d'utilisation |
| :-- | :-- | :-- |
| ELBSecurityPolicy-TLS13-1-2-2021-06 | TLS1.3, 1.2 | Moderne (recommandé) |
| ELBSecurityPolicy-TLS-1-2-2017-01 | TLS1.2 | Le plus courant |
| ELBSecurityPolicy-TLS-1-1-2017-01 | TLS1.1, 1.2 | Compatibilité |
| ELBSecurityPolicy-2016-08 | TLS1.0, 1.1, 1.2 | Prise en charge héritée |

**SNI (indication du nom du serveur) :**

Hébergez plusieurs domaines SSL/TLS sur un seul équilibreur de charge :
```
ALB Listener (Port 443)
├── Certificate 1: *.example.com (default)
├── Certificate 2: api.example.com
├── Certificate 3: *.partner.com
└── Rule: Host is api.example.com → API Target Group
```
### Attributs de l'équilibreur de charge

**Attributs ALB :**


| Attribut | Par défaut | Descriptif |
| :-- | :-- | :-- |
| suppression_protection.enabled | faux | Empêcher la suppression accidentelle |
| ralenti_timeout.timeout_seconds | 60 | Délai d'inactivité de la connexion (1-4000) |
| routage.http2.enabled | vrai | Activer HTTP/2 |
| routage.http.drop_invalid_header_fields.enabled | faux | Supprimer les en-têtes invalides |
| routage.http.xff_client_port.enabled | faux | Ajouter le port client à X-Forwarded-For |
| access_logs.s3.enabled | faux | Activer les journaux d'accès à S3 |

**Attributs NLB :**


| Attribut | Par défaut | Descriptif |
| :-- | :-- | :-- |
| suppression_protection.enabled | faux | Empêcher la suppression accidentelle |
| load_balancing.cross_zone.enabled | faux | Équilibrage de charge entre zones |
| access_logs.s3.enabled | faux | Activer les journaux d'accès |

**Suivi des connexions :**

NLB conserve l'état de connexion pour les connexions TCP :

- **Délai d'inactivité :** 350 secondes (TCP), 120 secondes (UDP)
- **Configurable :** Non (valeurs fixes)


### Routage des requêtes

**Ordre d'évaluation du routage ALB :**

1. **En-tête de l'hôte :** Évaluez d'abord les règles basées sur l'hôte
2. **Modèle de chemin :** Puis règles basées sur le chemin
3. **En-têtes HTTP :** Correspondance d'en-tête personnalisée
4. **Méthode HTTP :** GET, POST, etc.
5. **Chaîne de requête :** paramètres d'URL
6. **IP source :** Routage basé sur CIDR

**Priorité des règles :**

Règles évaluées dans l'ordre du numéro de priorité le plus bas au plus élevé :
```
Priority 1: Most specific rule (evaluated first)
Priority 10: Less specific rule
Priority 100: Catch-all rule
Default Rule: Catch everything not matched
```
**Types d'actions avancées :**


| Actions | Descriptif | Cas d'utilisation |
| :-- | :-- | :-- |
| Suivant | Envoyer au groupe cible | Routage normal |
| Redirection | Redirection HTTP | HTTP → HTTPS, migration de domaine |
| Réponse fixe | Renvoie une réponse statique | Page de maintenance, page d'erreur |
| Authentifier | Authentifier via Cognito/OIDC | Authentification de l'utilisateur |

**Groupes cibles pondérés :**

Répartissez le trafic sur plusieurs groupes cibles :
```
Rule: Path is /api/*
Actions:
  - Forward to API-v1 (weight: 80)
  - Forward to API-v2 (weight: 20)

Result: 80% traffic to v1, 20% to v2 (for testing/canary)
```
### Tarification de l'équilibreur de charge

**Tarif ALB :**

- **Fixe :** \$0,0225 par heure (~\$16,43/mois)
- **LCU (Load Balancer Capacité Unit) :** \$0,008 par LCU-heure

**Dimensions LCU (la plus élevée détermine la LCU) :**

- Nouvelles connexions par seconde : 25 = 1 LCU
- Connexions actives par minute : 3 000 = 1 LCU
- Octets traités (HTTP) par heure : 1 Go = 1 LCU
- Évaluations de règles par seconde : 1 000 = 1 LCU

**Tarif NLB :**

- **Fixe :** \$0,0225 par heure (~\$16,43/mois)
- **NLCU (Network LCU) :** 0,006 $ par heure NLCU

**Dimensions NLCU :**

- Nouvelles connexions/flux par seconde : 800 = 1 NLCU
- Connexions/flux actifs par minute : 100 000 = 1 NLCU
- Octets traités par heure : 1 Go = 1 NLCU

**Tarif GLB :**

- **Fixe :** \$0,0125 par heure (~\$9,13/mois)
- **GLCU :** \$0,004 par heure GLCU

**Exemple de calcul des coûts :**
```
Small Web Application (ALB):
- Fixed: $16.43/month
- Traffic: 100 GB/month = 100 LCUs × 744 hours/month × $0.008 = $595.20
- Total: ~$611.63/month

High-Traffic API (ALB):
- Fixed: $16.43/month
- 10,000 requests/sec = 400 LCUs (rule evaluations)
- 400 LCUs × 744 hours × $0.008 = $2,379.20
- Total: ~$2,395.63/month
```
## Implémentation pratique

### Atelier 1 : Configuration de l'équilibreur de charge d'application

**Objectif :** Créer un ALB avec plusieurs groupes cibles et un routage basé sur le chemin.

**Architecture:**
```
Internet → ALB (Port 443)
           ├── /api/* → API Target Group (Port 8080)
           ├── /images/* → Static Content TG (Port 80)
           └── /* → Web Application TG (Port 80)
```
#### Étape 1 : Créer des groupes cibles
```bash
# Create API Target Group
API_TG_ARN=$(aws elbv2 create-target-group \
    --name api-target-group \
    --protocol HTTP \
    --port 8080 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200 \
    --target-type instance \
    --tags Key=Name,Value=API-TG Key=Environment,Value=Production \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Register targets (EC2 instances)
aws elbv2 register-targets \
    --target-group-arn $API_TG_ARN \
    --targets Id=i-api1,Port=8080 Id=i-api2,Port=8080

# Create Static Content Target Group
STATIC_TG_ARN=$(aws elbv2 create-target-group \
    --name static-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path /health.html \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

aws elbv2 register-targets \
    --target-group-arn $STATIC_TG_ARN \
    --targets Id=i-static1 Id=i-static2

# Create Web Application Target Group
WEB_TG_ARN=$(aws elbv2 create-target-group \
    --name web-target-group \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTP \
    --health-check-path / \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --matcher HttpCode=200,301 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

aws elbv2 register-targets \
    --target-group-arn $WEB_TG_ARN \
    --targets Id=i-web1 Id=i-web2 Id=i-web3
```
#### Étape 2 : Configurer les attributs du groupe cible
```bash
# Configure deregistration delay (connection draining)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes \
        Key=deregistration_delay.timeout_seconds,Value=30 \
        Key=stickiness.enabled,Value=true \
        Key=stickiness.type,Value=lb_cookie \
        Key=stickiness.lb_cookie.duration_seconds,Value=86400

# Configure slow start mode (gradual ramp-up)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $WEB_TG_ARN \
    --attributes \
        Key=slow_start.duration_seconds,Value=60 \
        Key=deregistration_delay.timeout_seconds,Value=60

# Enable load balancing algorithm choice
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes \
        Key=load_balancing.algorithm.type,Value=least_outstanding_requests
```
#### Étape 3 : Créer un équilibreur de charge d'application
```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name production-alb \
    --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B $PUBLIC_SUBNET_1C \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=Production-ALB Key=Environment,Value=Production \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

echo "ALB DNS: $ALB_DNS"

# Configure ALB attributes
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes \
        Key=idle_timeout.timeout_seconds,Value=60 \
        Key=deletion_protection.enabled,Value=true \
        Key=routing.http2.enabled,Value=true \
        Key=access_logs.s3.enabled,Value=true \
        Key=access_logs.s3.bucket,Value=my-alb-logs-bucket \
        Key=access_logs.s3.prefix,Value=production-alb
```
#### Étape 4 : Configurer le certificat SSL/TLS
```bash
# Request certificate from ACM
CERT_ARN=$(aws acm request-certificate \
    --domain-name example.com \
    --subject-alternative-names *.example.com api.example.com \
    --validation-method DNS \
    --query 'CertificateArn' \
    --output text)

# Wait for certificate validation (requires DNS record creation)
# After validation completes...

# Or use existing certificate
# CERT_ARN="arn:aws:acm:us-east-1:123456789012:certificate/xxxxx"
```
#### Étape 5 : Créer un écouteur HTTPS avec des règles
```bash
# Create HTTPS listener (443)
HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions Type=forward,TargetGroupArn=$WEB_TG_ARN \
    --query 'Listeners[0].ListenerArn' \
    --output text)

# Create rule for API routing (/api/*)
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values='/api/*' \
    --actions Type=forward,TargetGroupArn=$API_TG_ARN

# Create rule for static content (/images/*, /css/*, /js/*)
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 2 \
    --conditions Field=path-pattern,Values='/images/*','/css/*','/js/*' \
    --actions Type=forward,TargetGroupArn=$STATIC_TG_ARN

# Create rule for API subdomain
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 3 \
    --conditions Field=host-header,Values='api.example.com' \
    --actions Type=forward,TargetGroupArn=$API_TG_ARN

# Create HTTP listener (80) with redirect to HTTPS
HTTP_LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
    --query 'Listeners[0].ListenerArn' \
    --output text)
```
#### Étape 6 : Règles de routage avancées
```bash
# Weighted target groups for canary deployment
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 5 \
    --conditions Field=path-pattern,Values='/api/v2/*' \
    --actions Type=forward,ForwardConfig='{
      "TargetGroups": [
        {"TargetGroupArn": "'$API_TG_ARN'", "Weight": 90},
        {"TargetGroupArn": "'$API_V2_TG_ARN'", "Weight": 10}
      ],
      "TargetGroupStickinessConfig": {
        "Enabled": true,
        "DurationSeconds": 3600
      }
    }'

# Header-based routing
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 6 \
    --conditions Field=http-header,HttpHeaderConfig={HttpHeaderName=X-Custom-Header,Values=['premium']} \
    --actions Type=forward,TargetGroupArn=$PREMIUM_TG_ARN

# Query string-based routing
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 7 \
    --conditions Field=query-string,QueryStringConfig={Values=[{Key=version,Value=beta}]} \
    --actions Type=forward,TargetGroupArn=$BETA_TG_ARN

# Fixed response for maintenance page
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 100 \
    --conditions Field=path-pattern,Values='/maintenance' \
    --actions Type=fixed-response,FixedResponseConfig='{
      "StatusCode": "503",
      "ContentType": "text/html",
      "MessageBody": "<html><body><h1>Under Maintenance</h1><p>We will be back soon!</p></body></html>"
    }'
```
### Atelier 2 : Configuration de l'équilibreur de charge réseau

**Objectif :** Créer une application NLB pour TCP avec des adresses IP statiques.
```bash
# Allocate Elastic IPs for NLB (one per subnet/AZ)
EIP_1A=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NLB-EIP-1A}]' \
    --query 'AllocationId' \
    --output text)

EIP_1B=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NLB-EIP-1B}]' \
    --query 'AllocationId' \
    --output text)

# Create NLB with static IPs
NLB_ARN=$(aws elbv2 create-load-balancer \
    --name production-nlb \
    --type network \
    --scheme internet-facing \
    --subnet-mappings \
        SubnetId=$PUBLIC_SUBNET_1A,AllocationId=$EIP_1A \
        SubnetId=$PUBLIC_SUBNET_1B,AllocationId=$EIP_1B \
    --tags Key=Name,Value=Production-NLB \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create target group for TCP traffic
TCP_TG_ARN=$(aws elbv2 create-target-group \
    --name tcp-target-group \
    --protocol TCP \
    --port 3306 \
    --vpc-id $VPC_ID \
    --health-check-protocol TCP \
    --health-check-port 3306 \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 3 \
    --unhealthy-threshold-count 3 \
    --target-type instance \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Register targets
aws elbv2 register-targets \
    --target-group-arn $TCP_TG_ARN \
    --targets Id=i-db1,Port=3306 Id=i-db2,Port=3306

# Create listener
aws elbv2 create-listener \
    --load-balancer-arn $NLB_ARN \
    --protocol TCP \
    --port 3306 \
    --default-actions Type=forward,TargetGroupArn=$TCP_TG_ARN

# Enable cross-zone load balancing
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true

# Get static IPs
aws elbv2 describe-load-balancers \
    --load-balancer-arns $NLB_ARN \
    --query 'LoadBalancers[0].AvailabilityZones[*].[ZoneName,LoadBalancerAddresses[0].IpAddress]' \
    --output table
```
### Atelier 3 : Implémentation de la terminaison SSL/TLS

**Objectif :** Configurez le chiffrement de bout en bout avec le déchargement SSL chez ALB.
```bash
# Create target group with HTTPS backend
SECURE_TG_ARN=$(aws elbv2 create-target-group \
    --name secure-backend-tg \
    --protocol HTTPS \
    --port 443 \
    --vpc-id $VPC_ID \
    --health-check-protocol HTTPS \
    --health-check-path /health \
    --health-check-interval-seconds 30 \
    --matcher HttpCode=200 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create HTTPS listener with multiple certificates (SNI)
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$MAIN_CERT_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
    --default-actions Type=forward,TargetGroupArn=$SECURE_TG_ARN

# Add additional certificates for SNI
aws elbv2 add-listener-certificates \
    --listener-arn $HTTPS_LISTENER_ARN \
    --certificates \
        CertificateArn=$API_CERT_ARN \
        CertificateArn=$ADMIN_CERT_ARN

# List available SSL policies
aws elbv2 describe-ssl-policies \
    --query 'SslPolicies[*].[Name,SslProtocols]' \
    --output table

# Update SSL policy
aws elbv2 modify-listener \
    --listener-arn $HTTPS_LISTENER_ARN \
    --ssl-policy ELBSecurityPolicy-TLS13-1-3-2021-06
```
### Atelier 4 : Configurer l'authentification Cognito

**Objectif :** Ajoutez l'authentification des utilisateurs à ALB à l'aide d'Amazon Cognito.
```bash
# Create Cognito User Pool (done separately)
# USER_POOL_ID=...
# USER_POOL_CLIENT_ID=...
# USER_POOL_DOMAIN=my-app.auth.us-east-1.amazoncognito.com

# Create authenticated target group
AUTH_TG_ARN=$(aws elbv2 create-target-group \
    --name authenticated-app-tg \
    --protocol HTTP \
    --port 80 \
    --vpc-id $VPC_ID \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Create listener with Cognito authentication
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions \
        Type=authenticate-cognito,AuthenticateCognitoConfig='{
          "UserPoolArn": "arn:aws:cognito-idp:us-east-1:123456789012:userpool/'$USER_POOL_ID'",
          "UserPoolClientId": "'$USER_POOL_CLIENT_ID'",
          "UserPoolDomain": "my-app",
          "OnUnauthenticatedRequest": "authenticate",
          "Scope": "openid",
          "SessionCookieName": "AWSELBAuthSessionCookie",
          "SessionTimeout": 604800
        }',Order=1 \
        Type=forward,TargetGroupArn=$AUTH_TG_ARN,Order=2

# Create rule for unauthenticated public pages
aws elbv2 create-rule \
    --listener-arn $HTTPS_LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values='/public/*','/login' \
    --actions Type=forward,TargetGroupArn=$PUBLIC_TG_ARN
```
### Atelier 5 : Surveillance et intégration de CloudWatch

**Objectif :** Mettre en place une surveillance complète des équilibreurs de charge.
```python
#!/usr/bin/env python3
# alb_monitoring_setup.py

import boto3

cloudwatch = boto3.client('cloudwatch')
sns = boto3.client('sns')

def create_alb_alarms(alb_name, target_group_name, sns_topic_arn):
    """
    Create comprehensive CloudWatch alarms for ALB
    """
    
    alarms = []
    
    # High 5XX error rate
    alarms.append({
        'AlarmName': f'{alb_name}-High-5XX-Errors',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'HTTPCode_Target_5XX_Count',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Sum',
        'Threshold': 10,
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when 5XX errors exceed threshold',
        'AlarmActions': [sns_topic_arn]
    })
    
    # High response time
    alarms.append({
        'AlarmName': f'{alb_name}-High-Response-Time',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 3,
        'MetricName': 'TargetResponseTime',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Average',
        'Threshold': 1.0,  # 1 second
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when response time exceeds 1 second',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Unhealthy host count
    alarms.append({
        'AlarmName': f'{target_group_name}-Unhealthy-Hosts',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'UnHealthyHostCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Maximum',
        'Threshold': 0,
        'Dimensions': [
            {'Name': 'TargetGroup', 'Value': target_group_name},
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when any target becomes unhealthy',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Low healthy host count
    alarms.append({
        'AlarmName': f'{target_group_name}-Low-Healthy-Hosts',
        'ComparisonOperator': 'LessThanThreshold',
        'EvaluationPeriods': 1,
        'MetricName': 'HealthyHostCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Minimum',
        'Threshold': 2,
        'Dimensions': [
            {'Name': 'TargetGroup', 'Value': target_group_name},
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert when healthy hosts drop below 2',
        'AlarmActions': [sns_topic_arn]
    })
    
    # High request count (potential DDoS)
    alarms.append({
        'AlarmName': f'{alb_name}-High-Request-Count',
        'ComparisonOperator': 'GreaterThanThreshold',
        'EvaluationPeriods': 2,
        'MetricName': 'RequestCount',
        'Namespace': 'AWS/ApplicationELB',
        'Period': 60,
        'Statistic': 'Sum',
        'Threshold': 100000,  # 100k requests per minute
        'Dimensions': [
            {'Name': 'LoadBalancer', 'Value': alb_name}
        ],
        'AlarmDescription': 'Alert on unusually high request rate',
        'AlarmActions': [sns_topic_arn]
    })
    
    # Create all alarms
    for alarm in alarms:
        cloudwatch.put_metric_alarm(**alarm)
        print(f"Created alarm: {alarm['AlarmName']}")
    
    print(f"✓ Created {len(alarms)} CloudWatch alarms")

# Example usage
# create_alb_alarms(
#     'app/production-alb/1234567890abcdef',
#     'targetgroup/web-tg/1234567890abcdef',
#     'arn:aws:sns:us-east-1:123456789012:alb-alerts'
# )
```
**Créer un tableau de bord CloudWatch :**
```bash
# Create dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ALB-Production-Dashboard \
    --dashboard-body file://alb-dashboard.json

# alb-dashboard.json
cat > alb-dashboard.json <<'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "RequestCount", {"stat": "Sum", "label": "Total Requests"}],
          [".", "HTTPCode_Target_2XX_Count", {"stat": "Sum"}],
          [".", "HTTPCode_Target_4XX_Count", {"stat": "Sum"}],
          [".", "HTTPCode_Target_5XX_Count", {"stat": "Sum"}]
        ],
        "period": 60,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "Request Metrics",
        "yAxis": {"left": {"label": "Count"}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "Average"}],
          ["...", {"stat": "p50"}],
          ["...", {"stat": "p95"}],
          ["...", {"stat": "p99"}]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Response Time",
        "yAxis": {"left": {"label": "Seconds"}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "HealthyHostCount", {"stat": "Average"}],
          [".", "UnHealthyHostCount", {"stat": "Average"}]
        ],
        "period": 60,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Target Health"
      }
    }
  ]
}
EOF
```
## Connaissances au niveau de la production

### Équilibrage de charge multi-régions avec Route 53

Pour les applications mondiales, combinez ELB avec Route 53 pour des architectures multi-régions active-active ou active-passive.

**Modèle d'architecture :**
```
Global Users
    ↓
Route 53 (Geoproximity/Latency/Failover)
    ├── us-east-1: ALB → Target Group → EC2 Fleet
    ├── eu-west-1: ALB → Target Group → EC2 Fleet
    └── ap-southeast-1: ALB → Target Group → EC2 Fleet
```
**Mise en œuvre:**
```bash
# Create ALBs in multiple regions
# us-east-1
ALB_US=$(aws elbv2 create-load-balancer \
    --name global-app-alb \
    --subnets $US_SUBNETS \
    --security-groups $US_SG \
    --region us-east-1 \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# eu-west-1
ALB_EU=$(aws elbv2 create-load-balancer \
    --name global-app-alb \
    --subnets $EU_SUBNETS \
    --security-groups $EU_SG \
    --region eu-west-1 \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

# Create Route 53 health checks for each ALB
US_HEALTH_CHECK=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        FullyQualifiedDomainName=$ALB_US,\
        Port=443,\
        ResourcePath=/health,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

EU_HEALTH_CHECK=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        FullyQualifiedDomainName=$ALB_EU,\
        Port=443,\
        ResourcePath=/health,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

# Create Route 53 records with latency-based routing
aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch file://multi-region-records.json

# multi-region-records.json
cat > multi-region-records.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "US-East-1",
        "Region": "us-east-1",
        "HealthCheckId": "$US_HEALTH_CHECK",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$ALB_US",
          "EvaluateTargetHealth": true
        }
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "EU-West-1",
        "Region": "eu-west-1",
        "HealthCheckId": "$EU_HEALTH_CHECK",
        "AliasTarget": {
          "HostedZoneId": "Z32O12XQLNTSW2",
          "DNSName": "$ALB_EU",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF
```
**Politiques de routage :**

**1. Basé sur la latence (meilleures performances) :**
Achemine les utilisateurs vers la région avec la latence la plus faible.

**2. Géoproximité (Contrôle Géographique):**
Itinéraires basés sur la situation géographique avec ajustement des biais.

**3. Basculement (DR actif-passif) :**
La région principale gère le trafic, la région secondaire prend le relais en cas d'échec.

**4. Pondéré (répartition du trafic) :**
Répartissez le trafic entre les régions (par exemple, 80 % aux États-Unis, 20 % dans l'UE pour les tests).

### Modèles de vérification de l'état avancés

**Point de terminaison de vérification de l'état personnalisé :**
```python
# health_check_endpoint.py
from flask import Flask, jsonify
import redis
import psycopg2
import requests
from datetime import datetime

app = Flask(__name__)

@app.route('/health/liveness')
def liveness():
    """
    Liveness check: Is the application running?
    Used by: Kubernetes, container orchestration
    """
    return jsonify({'status': 'alive'}), 200

@app.route('/health/readiness')
def readiness():
    """
    Readiness check: Is the application ready to serve traffic?
    Used by: Load balancers
    """
    checks = {}
    all_healthy = True
    
    # Check database connection
    try:
        conn = psycopg2.connect(
            host='db.example.com',
            database='myapp',
            timeout=2
        )
        conn.close()
        checks['database'] = 'healthy'
    except Exception as e:
        checks['database'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check Redis cache
    try:
        r = redis.Redis(host='cache.example.com', socket_timeout=2)
        r.ping()
        checks['cache'] = 'healthy'
    except Exception as e:
        checks['cache'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    # Check disk space
    import shutil
    disk = shutil.disk_usage('/')
    free_percent = (disk.free / disk.total) * 100
    if free_percent < 10:
        checks['disk'] = f'unhealthy: only {free_percent:.1f}% free'
        all_healthy = False
    else:
        checks['disk'] = f'healthy: {free_percent:.1f}% free'
    
    # Check dependent services
    try:
        response = requests.get('http://api.example.com/health', timeout=2)
        if response.status_code == 200:
            checks['api_dependency'] = 'healthy'
        else:
            checks['api_dependency'] = f'unhealthy: status {response.status_code}'
            all_healthy = False
    except Exception as e:
        checks['api_dependency'] = f'unhealthy: {str(e)}'
        all_healthy = False
    
    status_code = 200 if all_healthy else 503
    
    return jsonify({
        'status': 'healthy' if all_healthy else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'checks': checks
    }), status_code

@app.route('/health/startup')
def startup():
    """
    Startup check: Has the application completed initialization?
    Used by: Container platforms during startup
    """
    # Check if application has loaded configuration, connected to services
    # Return 200 only after initialization complete
    return jsonify({'status': 'started'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```
**Stratégie de bilan de santé :**


| Type de chèque | Point de terminaison | Cas d'utilisation | Seuil |
| :-- | :-- | :-- | :-- |
| ** Peu profond ** | `/santé` | Vérification rapide de la vitalité | 2 succès |
| **Profond** | `/santé/état de préparation` | Vérifier les dépendances | 3 succès |
| **Démarrage** | `/santé/démarrage` | Démarrage initial | 10 succès |

### Protection et sécurité DDoS

**Intégration d'AWS Shield :**
```bash
# Shield Standard is automatically enabled (free)
# For advanced protection, enable Shield Advanced

# Enable Shield Advanced on ALB
aws shield subscribe-to-shield-advanced

aws shield create-protection \
    --name production-alb-protection \
    --resource-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/production-alb/1234567890abcdef

# Create DDoS response team (DRT) access
aws shield associate-drt-role \
    --role-arn arn:aws:iam::123456789012:role/ShieldDRTRole

# Configure health-based detection
aws shield update-emergency-contact-settings \
    --emergency-contact-list \
        EmailAddress=security@example.com,PhoneNumber=+1234567890 \
        EmailAddress=ops@example.com,PhoneNumber=+1234567891
```
**Intégration WAF pour la protection de couche 7 :**
```bash
# Create Web ACL
WAF_ACL_ARN=$(aws wafv2 create-web-acl \
    --name production-web-acl \
    --scope REGIONAL \
    --default-action Allow={} \
    --rules file://waf-rules.json \
    --visibility-config \
        SampledRequestsEnabled=true,\
        CloudWatchMetricsEnabled=true,\
        MetricName=ProductionWebACL \
    --query 'Summary.ARN' \
    --output text)

# Associate WAF with ALB
aws wafv2 associate-web-acl \
    --web-acl-arn $WAF_ACL_ARN \
    --resource-arn $ALB_ARN

# waf-rules.json
cat > waf-rules.json <<'EOF'
[
  {
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": {"Block": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitRule"
    }
  },
  {
    "Name": "GeoBlockRule",
    "Priority": 2,
    "Statement": {
      "GeoMatchStatement": {
        "CountryCodes": ["CN", "RU", "KP"]
      }
    },
    "Action": {"Block": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "GeoBlockRule"
    }
  },
  {
    "Name": "SQLiProtection",
    "Priority": 3,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesSQLiRuleSet"
      }
    },
    "OverrideAction": {"None": {}},
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "SQLiProtection"
    }
  }
]
EOF
```
**Limitation de taux chez ALB :**
```python
#!/usr/bin/env python3
# rate_limiting_lambda.py
# Lambda@Edge or CloudFront Function for rate limiting

import json
import hashlib
import time
from collections import defaultdict

# In-memory rate limit tracker (use ElastiCache for production)
rate_limits = defaultdict(list)
RATE_LIMIT = 100  # requests
TIME_WINDOW = 60  # seconds

def lambda_handler(event, context):
    """
    Rate limit requests based on client IP
    """
    
    request = event['Records'][0]['cf']['request']
    client_ip = request['clientIp']
    
    current_time = time.time()
    
    # Clean old entries
    rate_limits[client_ip] = [
        timestamp for timestamp in rate_limits[client_ip]
        if current_time - timestamp < TIME_WINDOW
    ]
    
    # Check rate limit
    if len(rate_limits[client_ip]) >= RATE_LIMIT:
        # Rate limit exceeded
        return {
            'status': '429',
            'statusDescription': 'Too Many Requests',
            'headers': {
                'content-type': [{'key': 'Content-Type', 'value': 'text/plain'}],
                'retry-after': [{'key': 'Retry-After', 'value': str(TIME_WINDOW)}]
            },
            'body': 'Rate limit exceeded. Please try again later.'
        }
    
    # Add current request
    rate_limits[client_ip].append(current_time)
    
    # Allow request
    return request
```
### Journaux d'accès et analyse

**Activer les journaux d'accès :**
```bash
# Create S3 bucket for logs
aws s3 mb s3://my-alb-access-logs

# Configure bucket policy
cat > bucket-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::127311923021:root"
    },
    "Action": "s3:PutObject",
    "Resource": "arn:aws:s3:::my-alb-access-logs/*"
  }]
}
EOF

aws s3api put-bucket-policy \
    --bucket my-alb-access-logs \
    --policy file://bucket-policy.json

# Enable access logs on ALB
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes \
        Key=access_logs.s3.enabled,Value=true \
        Key=access_logs.s3.bucket,Value=my-alb-access-logs \
        Key=access_logs.s3.prefix,Value=production-alb
```
**Analyser les journaux d'accès avec Athena :**
```sql
-- Create Athena table for ALB logs
CREATE EXTERNAL TABLE IF NOT EXISTS alb_logs (
    type string,
    time string,
    elb string,
    client_ip string,
    client_port int,
    target_ip string,
    target_port int,
    request_processing_time double,
    target_processing_time double,
    response_processing_time double,
    elb_status_code string,
    target_status_code string,
    received_bytes bigint,
    sent_bytes bigint,
    request_verb string,
    request_url string,
    request_proto string,
    user_agent string,
    ssl_cipher string,
    ssl_protocol string,
    target_group_arn string,
    trace_id string,
    domain_name string,
    chosen_cert_arn string,
    matched_rule_priority string,
    request_creation_time string,
    actions_executed string,
    redirect_url string,
    lambda_error_reason string,
    target_port_list string,
    target_status_code_list string,
    classification string,
    classification_reason string
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
WITH SERDEPROPERTIES (
'serialization.format' = '1',
'input.regex' = 
'([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) ([^ ]*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\s]+?)\" \"([^\s]+)\" \"([^ ]*)\" \"([^ ]*)\"')
LOCATION 's3://my-alb-access-logs/production-alb/AWSLogs/123456789012/elasticloadbalancing/us-east-1/';

-- Query: Top 10 client IPs by request count
SELECT client_ip, COUNT(*) as request_count
FROM alb_logs
WHERE parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z') 
    BETWEEN parse_datetime('2025-01-01-00:00:00','yyyy-MM-dd-HH:mm:ss')
    AND parse_datetime('2025-01-15-23:59:59','yyyy-MM-dd-HH:mm:ss')
GROUP BY client_ip
ORDER BY request_count DESC
LIMIT 10;

-- Query: Average response time by target
SELECT target_ip, 
       AVG(target_processing_time) as avg_response_time,
       COUNT(*) as request_count
FROM alb_logs
WHERE target_processing_time > 0
GROUP BY target_ip
ORDER BY avg_response_time DESC;

-- Query: 5XX errors by URL
SELECT request_url, 
       elb_status_code,
       COUNT(*) as error_count
FROM alb_logs
WHERE elb_status_code LIKE '5%'
GROUP BY request_url, elb_status_code
ORDER BY error_count DESC
LIMIT 20;

-- Query: Slow requests (>1 second)
SELECT client_ip, 
       request_url,
       target_processing_time,
       time
FROM alb_logs
WHERE target_processing_time > 1.0
ORDER BY target_processing_time DESC
LIMIT 100;

-- Query: Request rate over time (5-minute intervals)
SELECT date_trunc('minute', parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z')) as time_bucket,
       COUNT(*) / 5 as requests_per_second
FROM alb_logs
GROUP BY date_trunc('minute', parse_datetime(time,'yyyy-MM-dd''T''HH:mm:ss.SSSSSS''Z'))
ORDER BY time_bucket;
```
### Regroupement de connexions et maintien en vie

**Configuration Keep-Alive du back-end :**
```nginx
# Nginx backend configuration
upstream backend {
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
    
    keepalive 32;  # Keep 32 connections to backend
    keepalive_timeout 60s;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";  # Remove Connection header for keep-alive
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
**Configuration du serveur d'applications :**
```python
# Gunicorn configuration for efficient connection handling
import multiprocessing

# Server socket
bind = "0.0.0.0:8080"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"  # or "eventlet" for async
worker_connections = 1000
max_requests = 10000
max_requests_jitter = 1000

# Keep-alive
keepalive = 5  # seconds

# Timeouts
timeout = 30
graceful_timeout = 30

# Logging
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
loglevel = "info"
```
### Déploiements Bleu-Vert et Canari

**Déploiement bleu-vert avec groupes cibles pondérés :**
```python
#!/usr/bin/env python3
# blue_green_deployment.py

import boto3
import time

elbv2 = boto3.client('elbv2')

def blue_green_deployment(listener_arn, blue_tg_arn, green_tg_arn):
    """
    Perform blue-green deployment by switching target groups
    """
    
    print("Starting blue-green deployment...")
    
    # Step 1: Verify green environment health
    print("Verifying green environment health...")
    green_health = check_target_group_health(green_tg_arn)
    
    if not green_health['all_healthy']:
        raise Exception(f"Green environment not healthy: {green_health}")
    
    print(f"✓ Green environment healthy: {green_health['healthy_count']} targets")
    
    # Step 2: Switch traffic to green
    print("Switching traffic to green environment...")
    elbv2.modify_listener(
        ListenerArn=listener_arn,
        DefaultActions=[{
            'Type': 'forward',
            'TargetGroupArn': green_tg_arn
        }]
    )
    
    print("✓ Traffic switched to green")
    
    # Step 3: Monitor for issues
    print("Monitoring for issues (5 minutes)...")
    time.sleep(300)
    
    # Check metrics
    green_errors = check_target_group_errors(green_tg_arn)
    
    if green_errors['error_rate'] > 1.0:  # More than 1% errors
        print("❌ High error rate detected, rolling back...")
        rollback(listener_arn, blue_tg_arn)
        raise Exception(f"Deployment failed: {green_errors['error_rate']}% error rate")
    
    print(f"✓ Deployment successful. Error rate: {green_errors['error_rate']}%")
    
    # Step 4: Blue environment can now be decommissioned or updated
    print("Blue environment can be updated for next deployment")
    
    return True

def check_target_group_health(target_group_arn):
    """Check if all targets in group are healthy"""
    
    response = elbv2.describe_target_health(
        TargetGroupArn=target_group_arn
    )
    
    total = len(response['TargetHealthDescriptions'])
    healthy = sum(1 for t in response['TargetHealthDescriptions'] 
                  if t['TargetHealth']['State'] == 'healthy')
    
    return {
        'all_healthy': total == healthy,
        'healthy_count': healthy,
        'total_count': total
    }

def check_target_group_errors(target_group_arn):
    """Check error rate for target group"""
    
    cloudwatch = boto3.client('cloudwatch')
    
    # Get 5XX errors
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='HTTPCode_Target_5XX_Count',
        Dimensions=[{
            'Name': 'TargetGroup',
            'Value': target_group_arn.split(':')[-1]
        }],
        StartTime=time.time() - 300,
        EndTime=time.time(),
        Period=300,
        Statistics=['Sum']
    )
    
    errors = sum(dp['Sum'] for dp in response['Datapoints'])
    
    # Get total requests
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/ApplicationELB',
        MetricName='RequestCount',
        Dimensions=[{
            'Name': 'TargetGroup',
            'Value': target_group_arn.split(':')[-1]
        }],
        StartTime=time.time() - 300,
        EndTime=time.time(),
        Period=300,
        Statistics=['Sum']
    )
    
    total = sum(dp['Sum'] for dp in response['Datapoints'])
    error_rate = (errors / total * 100) if total > 0 else 0
    
    return {'error_rate': error_rate, 'total_requests': total}

def rollback(listener_arn, blue_tg_arn):
    """Rollback to blue environment"""
    
    print("Rolling back to blue environment...")
    elbv2.modify_listener(
        ListenerArn=listener_arn,
        DefaultActions=[{
            'Type': 'forward',
            'TargetGroupArn': blue_tg_arn
        }]
    )
    print("✓ Rolled back to blue")
```
**Déploiement Canary avec routage pondéré :**
```python
#!/usr/bin/env python3
# canary_deployment.py

import boto3
import time

def canary_deployment(listener_arn, rule_priority, stable_tg_arn, canary_tg_arn):
    """
    Gradual canary deployment with automatic rollback on errors
    """
    
    elbv2 = boto3.client('elbv2')
    
    # Canary stages: 5% → 25% → 50% → 100%
    stages = [
        {'canary_weight': 5, 'stable_weight': 95, 'duration': 300},   # 5 minutes
        {'canary_weight': 25, 'stable_weight': 75, 'duration': 600},  # 10 minutes
        {'canary_weight': 50, 'stable_weight': 50, 'duration': 900},  # 15 minutes
        {'canary_weight': 100, 'stable_weight': 0, 'duration': 0}     # Full rollout
    ]
    
    for stage in stages:
        print(f"\nCanary stage: {stage['canary_weight']}% canary, {stage['stable_weight']}% stable")
        
        # Update rule with weighted target groups
        elbv2.modify_rule(
            RuleArn=get_rule_arn(listener_arn, rule_priority),
            Actions=[{
                'Type': 'forward',
                'ForwardConfig': {
                    'TargetGroups': [
                        {
                            'TargetGroupArn': canary_tg_arn,
                            'Weight': stage['canary_weight']
                        },
                        {
                            'TargetGroupArn': stable_tg_arn,
                            'Weight': stage['stable_weight']
                        }
                    ],
                    'TargetGroupStickinessConfig': {
                        'Enabled': True,
                        'DurationSeconds': 3600
                    }
                }
            }]
        )
        
        print(f"✓ Updated weights")
        
        if stage['duration'] > 0:
            print(f"Monitoring for {stage['duration']} seconds...")
            time.sleep(stage['duration'])
            
            # Check canary health
            errors = check_target_group_errors(canary_tg_arn)
            
            if errors['error_rate'] > 2.0:  # More than 2% errors
                print(f"❌ Canary error rate too high: {errors['error_rate']}%")
                print("Rolling back to stable version...")
                
                # Rollback: 100% to stable
                elbv2.modify_rule(
                    RuleArn=get_rule_arn(listener_arn, rule_priority),
                    Actions=[{
                        'Type': 'forward',
                        'TargetGroupArn': stable_tg_arn
                    }]
                )
                
                raise Exception(f"Canary deployment failed at {stage['canary_weight']}%")
            
            print(f"✓ Canary healthy. Error rate: {errors['error_rate']}%")
    
    print("\n✓ Canary deployment completed successfully")
    return True

def get_rule_arn(listener_arn, priority):
    """Get rule ARN by priority"""
    elbv2 = boto3.client('elbv2')
    
    rules = elbv2.describe_rules(ListenerArn=listener_arn)
    
    for rule in rules['Rules']:
        if rule.get('Priority') == str(priority):
            return rule['RuleArn']
    
    raise Exception(f"Rule with priority {priority} not found")
```
## Conseils \& Bonnes pratiques

### Conseils de configuration du bilan de santé

**Astuce 1 : Utilisez des points de terminaison dédiés au contrôle de santé**

N'utilisez pas la racine de l'application :
```python
# Bad - Heavy operation on every health check
@app.route('/')
def index():
    # Complex database queries
    # External API calls
    return render_template('index.html')

# Good - Lightweight health check
@app.route('/health')
def health():
    # Quick check only
    return 'OK', 200

# Better - Deep health check with caching
from flask_caching import Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/health')
@cache.cached(timeout=10)  # Cache for 10 seconds
def health():
    checks = {
        'database': check_db(),
        'cache': check_cache()
    }
    if all(checks.values()):
        return jsonify(checks), 200
    return jsonify(checks), 503
```
**Astuce 2 : Faites correspondre l'intervalle de vérification de l'état à l'heure de démarrage de l'application**
```
Application startup time: 60 seconds
Health check interval: 30 seconds
Healthy threshold: 2

Time to become healthy: 30 × 2 = 60 seconds minimum
Total time for instance to serve traffic: 60 (startup) + 60 (health checks) = 120 seconds

Recommendation: Consider slow_start mode for gradual ramp-up
```
**Astuce 3 : Utilisez différents contrôles de santé pour évaluer la vivacité et l'état de préparation**
```bash
# Liveness check: Is the process running?
aws elbv2 create-target-group \
    --health-check-path /health/live \
    --health-check-interval-seconds 30

# Readiness check: Can it handle traffic?
# (For Kubernetes/ECS, not direct ALB feature)
```
### Conseils d'optimisation des performances

**Astuce 4 : Activez HTTP/2 pour de meilleures performances**
```bash
# HTTP/2 provides:
# - Multiplexing (multiple requests over single connection)
# - Header compression
# - Server push capability

aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --attributes Key=routing.http2.enabled,Value=true
```
**Astuce 5 : Utilisez le multiplexage de connexion**

Configurez les serveurs backend pour gérer plusieurs requêtes par connexion :
```python
# gunicorn.conf.py
workers = 4
worker_class = "gevent"
worker_connections = 1000
keepalive = 5

# This allows:
# - 4 workers × 1000 connections = 4000 concurrent connections
# - Reuse connections for multiple requests
```
**Astuce 6 : Optimisez le délai de désinscription**
```bash
# For stateless APIs (no long requests)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=30

# For long-polling or WebSocket
aws elbv2 modify-target-group-attributes \
    --target-group-arn $TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=300
```
### Conseils d'optimisation des coûts

**Astuce 7 : minimisez le transfert de données entre zones**
```bash
# For ALB: Cross-zone enabled by default (with charges)
# Disable if traffic naturally balanced and you want to save costs

# For NLB: Cross-zone disabled by default (no charges when enabled)
# Enable for better load distribution
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true
```
**Astuce 8 : Utilisez NLB pour les exigences IP statiques (enregistrez sur la passerelle NAT)**
```
Scenario: Need to whitelist IPs at partner firewall

Option 1: NAT Gateway + ALB
- 3 NAT Gateways: $97.20/month + data charges
- 1 ALB: $16.43/month + LCU charges
- Total: ~$130+/month

Option 2: NLB with Elastic IPs
- 1 NLB: $16.43/month + NLCU charges
- No NAT Gateway needed for static IPs
- Total: ~$20-40/month

Savings: ~$90/month
```
**Astuce 9 : Utilisation d'une LCU de bonne taille**
```bash
# Monitor LCU usage
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name ConsumedLCUs \
    --dimensions Name=LoadBalancer,Value=app/my-alb/1234567890abcdef \
    --start-time 2025-01-01T00:00:00Z \
    --end-time 2025-01-15T23:59:59Z \
    --period 3600 \
    --statistics Maximum

# Optimize:
# - Reduce rule complexity
# - Consolidate target groups
# - Use path-based routing instead of header-based when possible
```
### Conseils de sécurité

**Astuce 10 : Utilisez toujours HTTPS avec la redirection HTTP**
```bash
# Create HTTP listener that redirects to HTTPS
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=redirect,RedirectConfig='{
      "Protocol": "HTTPS",
      "Port": "443",
      "StatusCode": "HTTP_301"
    }'
```
**Astuce 11 : implémentez les en-têtes de sécurité**
```nginx
# Add security headers at backend
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "default-src 'self'" always;
```
**Astuce 12 : Utilisez WAF pour la protection de la couche application**
```bash
# Essential WAF rules:
# 1. Rate limiting
# 2. SQL injection protection
# 3. XSS protection
# 4. Geographic blocking (if applicable)
# 5. Known bad inputs (AWS Managed Rules)

# Cost: ~$5-10/month + $1 per million requests
# Value: Prevents attacks, reduces incident response costs
```
### Conseils de surveillance

**Astuce 13 : Configurez des alarmes complètes**
```bash
# Critical alarms for production:
# 1. Unhealthy host count > 0
# 2. 5XX error rate > 1%
# 3. Response time p99 > 3 seconds
# 4. Target connection errors > 10/minute
# 5. Rejected connection count > 0

# Create alarm dashboard
aws cloudwatch put-dashboard \
    --dashboard-name ALB-Production-Health \
    --dashboard-body file://dashboard.json
```
**Astuce 14 : Utilisez les métriques au niveau cible**
```bash
# Monitor individual targets, not just aggregate
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name TargetResponseTime \
    --dimensions \
        Name=TargetGroup,Value=targetgroup/my-tg/1234567890abcdef \
        Name=AvailabilityZone,Value=us-east-1a \
    --start-time 2025-01-15T00:00:00Z \
    --end-time 2025-01-15T23:59:59Z \
    --period 300 \
    --statistics Average,Maximum,p99
```
**Astuce 15 : Activez les journaux d'accès pour la médecine légale**
```bash
# Access logs are invaluable for:
# - Security incident investigation
# - Performance troubleshooting
# - User behavior analysis
# - Compliance auditing

# Cost: S3 storage only (~$0.023/GB)
# Enable for all production load balancers
```
## Pièges \& Remèdes

### Piège 1 : configuration incorrecte du contrôle de santé

**Problème :** Les contrôles d'état marquent les instances saines comme défectueuses ou vice versa, provoquant des problèmes de routage du trafic.

**Pourquoi cela arrive :**

- Le chemin de vérification de l'état n'existe pas ou renvoie un code d'état incorrect
- Timeout trop court pour le temps de réponse de l'application
- Des seuils trop agressifs ou trop cléments
- Le bilan de santé ne vérifie pas l'état réel de l'application

**Impact :**

- Instances saines marquées comme malsaines → capacité réduite
- Instances malsaines marquées saines → erreurs envoyées aux utilisateurs
- Instances de battement (cyclage sain/malsain)
- Fausses alarmes et fatigue des alertes

**Exemple :**
```
Health Check Configuration:
- Path: /
- Interval: 5 seconds
- Timeout: 2 seconds
- Healthy threshold: 2
- Unhealthy threshold: 2

Problem:
- / endpoint does heavy database query (takes 3-5 seconds)
- Health checks timeout after 2 seconds
- Instance marked unhealthy even though it's serving traffic fine
```
**Remède :**

**Étape 1 : Créer un point de terminaison dédié au contrôle de santé**
```python
# health_endpoint.py
from flask import Flask, jsonify
import time

app = Flask(__name__)

# Bad health check (uses production endpoint)
@app.route('/')
def index():
    # Complex operation
    data = fetch_from_database()  # Takes 3 seconds
    process_data(data)            # Takes 2 seconds
    return render_template('index.html')

# Good health check (lightweight)
@app.route('/health')
def health():
    return 'OK', 200

# Better health check (verifies dependencies with timeout)
@app.route('/health/ready')
def health_ready():
    checks = {}
    start_time = time.time()
    
    # Check with timeout
    try:
        # Quick database ping (not full query)
        db_start = time.time()
        db.execute('SELECT 1').fetchone()
        checks['database'] = {
            'status': 'healthy',
            'response_time': time.time() - db_start
        }
    except Exception as e:
        checks['database'] = {
            'status': 'unhealthy',
            'error': str(e)
        }
        return jsonify(checks), 503
    
    # Return within health check timeout
    if time.time() - start_time > 1.5:  # Safety margin
        return jsonify({'status': 'timeout'}), 503
    
    return jsonify({'status': 'healthy', 'checks': checks}), 200
```
**Étape 2 : Configurer les paramètres de vérification de l'état appropriés**
```bash
# For fast APIs (< 100ms response time)
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-protocol HTTP \
    --health-check-path /health \
    --health-check-interval-seconds 10 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 2 \
    --matcher HttpCode=200

# For slower applications (databases, processing)
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 3 \
    --unhealthy-threshold-count 3

# For applications with slow startup
aws elbv2 modify-target-group \
    --target-group-arn $TG_ARN \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 5  # Wait longer before marking healthy
```
**Étape 3 : Testez le bilan de santé localement**
```bash
# Test health check response
curl -v http://your-instance:8080/health

# Check response time
time curl http://your-instance:8080/health

# Test from load balancer subnet
aws ssm start-session --target i-1234567890abcdef0
curl -v http://10.0.1.10:8080/health
```
**Étape 4 : Surveiller les échecs du contrôle de santé**
```python
#!/usr/bin/env python3
# monitor_health_check_failures.py

import boto3
from datetime import datetime, timedelta

def analyze_health_check_failures(target_group_arn):
    """
    Analyze health check failures to identify issues
    """
    
    elbv2 = boto3.client('elbv2')
    cloudwatch = boto3.client('cloudwatch')
    
    # Get current target health
    health = elbv2.describe_target_health(
        TargetGroupArn=target_group_arn
    )
    
    unhealthy_targets = [
        t for t in health['TargetHealthDescriptions']
        if t['TargetHealth']['State'] != 'healthy'
    ]
    
    if unhealthy_targets:
        print(f"Found {len(unhealthy_targets)} unhealthy targets:\n")
        
        for target in unhealthy_targets:
            target_id = target['Target']['Id']
            state = target['TargetHealth']['State']
            reason = target['TargetHealth'].get('Reason', 'Unknown')
            description = target['TargetHealth'].get('Description', '')
            
            print(f"Target: {target_id}")
            print(f"  State: {state}")
            print(f"  Reason: {reason}")
            print(f"  Description: {description}")
            
            # Get recent health check metrics
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=1)
            
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/ApplicationELB',
                MetricName='HealthyHostCount',
                Dimensions=[
                    {'Name': 'TargetGroup', 'Value': target_group_arn.split(':')[-1]},
                    {'Name': 'AvailabilityZone', 'Value': target['Target'].get('AvailabilityZone', 'unknown')}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=60,
                Statistics=['Average']
            )
            
            print(f"  Recent health status: {response['Datapoints'][-5:] if response['Datapoints'] else 'No data'}")
            print()
    else:
        print("✓ All targets healthy")

# Run analysis
analyze_health_check_failures('arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/1234567890abcdef')
```
**Prévention :**

- Créez toujours des points de terminaison `/health` dédiés
- Tester les contrôles de santé avant le déploiement
- Faire correspondre le délai d'attente au temps de réponse réel + tampon
- Utiliser des seuils appropriés pour le temps de démarrage de l'application
- Surveiller en permanence les échecs du contrôle de santé

***

### Piège 2 : Ne pas configurer correctement le drainage des connexions

**Problème :** Les requêtes en cours sont interrompues lorsque les cibles sont désenregistrées, provoquant des erreurs pour les utilisateurs finaux.

**Pourquoi cela arrive :**

- Utilisation du délai de désinscription par défaut sans contrepartie
- Ne pas comprendre les modèles de demandes de candidature
- Délais d'attente agressifs pour accélérer les déploiements
- Aucun test d'arrêt progressif

**Impact :**

- Erreurs 502/504 lors des déploiements
- Transactions incomplètes
- Mauvaise expérience utilisateur
- Incohérence des données

**Remède :**

**Étape 1 : Analyser la durée de la demande**
```python
#!/usr/bin/env python3
# analyze_request_duration.py

import boto3
from datetime import datetime, timedelta

def analyze_request_duration(alb_log_bucket, alb_log_prefix):
    """
    Analyze ALB access logs to determine appropriate deregistration delay
    """
    
    s3 = boto3.client('s3')
    
    # Download recent access logs
    response = s3.list_objects_v2(
        Bucket=alb_log_bucket,
        Prefix=alb_log_prefix,
        MaxKeys=100
    )
    
    request_durations = []
    
    for obj in response.get('Contents', []):
        # Parse access log
        log_data = s3.get_object(Bucket=alb_log_bucket, Key=obj['Key'])
        
        for line in log_data['Body'].read().decode('utf-8').splitlines():
            parts = line.split()
            if len(parts) > 9:
                # Extract processing times
                request_time = float(parts[7])
                target_time = float(parts[8])
                response_time = float(parts[9])
                
                total_time = request_time + target_time + response_time
                request_durations.append(total_time)
    
    if request_durations:
        request_durations.sort()
        p95 = request_durations[int(len(request_durations) * 0.95)]
        p99 = request_durations[int(len(request_durations) * 0.99)]
        max_duration = max(request_durations)
        
        print("Request Duration Analysis:")
        print(f"  P95: {p95:.2f} seconds")
        print(f"  P99: {p99:.2f} seconds")
        print(f"  Max: {max_duration:.2f} seconds")
        print(f"\nRecommended deregistration delay: {int(p99 * 1.5)} seconds")
        
        return int(p99 * 1.5)
    
    return 300  # Default 5 minutes

# Usage
recommended_delay = analyze_request_duration('my-alb-logs', 'production-alb/')
```
**Étape 2 : Configurer le délai de désinscription en fonction de la charge de travail**
```bash
# API with quick requests (< 5 seconds)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $API_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=30

# File upload/download service (long requests)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $UPLOAD_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=900

# WebSocket connections
aws elbv2 modify-target-group-attributes \
    --target-group-arn $WEBSOCKET_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=3600

# Background job processor (longest)
aws elbv2 modify-target-group-attributes \
    --target-group-arn $JOBS_TG_ARN \
    --attributes Key=deregistration_delay.timeout_seconds,Value=3600
```
**Étape 3 : implémenter l'arrêt progressif dans l'application**
```python
# app.py with graceful shutdown
import signal
import sys
import threading
import time

class GracefulShutdown:
    def __init__(self):
        self.shutdown_event = threading.Event()
        self.active_requests = 0
        self.lock = threading.Lock()
        
        signal.signal(signal.SIGTERM, self.handle_signal)
        signal.signal(signal.SIGINT, self.handle_signal)
    
    def handle_signal(self, signum, frame):
        print(f"Received signal {signum}, starting graceful shutdown...")
        self.shutdown_event.set()
        
        # Stop health check endpoint
        self.mark_unhealthy()
        
        # Wait for active requests to complete
        print(f"Waiting for {self.active_requests} active requests...")
        while self.active_requests > 0:
            time.sleep(1)
        
        print("All requests completed, shutting down")
        sys.exit(0)
    
    def mark_unhealthy(self):
        """Mark health check as unhealthy"""
        global health_check_status
        health_check_status = False
    
    def request_started(self):
        with self.lock:
            self.active_requests += 1
    
    def request_completed(self):
        with self.lock:
            self.active_requests -= 1

# Use in Flask
from flask import Flask
app = Flask(__name__)
shutdown_handler = GracefulShutdown()
health_check_status = True

@app.before_request
def before_request():
    shutdown_handler.request_started()

@app.after_request
def after_request(response):
    shutdown_handler.request_completed()
    return response

@app.route('/health')
def health():
    if health_check_status:
        return 'OK', 200
    else:
        return 'Shutting down', 503
```
**Étape 4 : Testez l'arrêt progressif**
```bash
# Deploy new version and monitor for errors
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 5  # Scale up

# Wait for new instances
sleep 120

# Scale down old instances
aws autoscaling set-desired-capacity \
    --auto-scaling-group-name myapp-asg \
    --desired-capacity 3

# Monitor for 502/504 errors
aws cloudwatch get-metric-statistics \
    --namespace AWS/ApplicationELB \
    --metric-name HTTPCode_Target_5XX_Count \
    --dimensions Name=LoadBalancer,Value=$ALB_NAME \
    --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Sum
```
**Prévention :**

- Analyser les modèles de durée réelle des demandes
- Configurer le délai de désinscription de manière appropriée
- Implémenter l'arrêt progressif des applications
- Tester régulièrement le processus de déploiement
- Surveiller les erreurs 502/504 lors des déploiements

***

### Piège 3 : Idées fausses sur l'équilibrage de charge entre zones

**Problème :** Mauvaise compréhension du comportement d'équilibrage de charge entre zones, entraînant une répartition inégale de la charge ou des coûts de transfert de données inattendus.

**Pourquoi cela arrive :**

- Différentes valeurs par défaut pour ALB vs NLB
- Ne pas comprendre les implications en termes de coûts de transfert de données
- En supposant que l'équilibreur de charge se répartit automatiquement de manière égale
- Répartition inégale des instances entre les AZ

**Impact :**

- Répartition inégale de la charge entre les cibles
- Coûts de transfert de données plus élevés
- Factures AWS inattendues
- Mauvaise utilisation des ressources

**Exemple :**
```
Configuration:
- ALB with cross-zone enabled (default)
- AZ-1: 2 instances
- AZ-2: 8 instances

Without cross-zone:
- AZ-1 instances: 50% of AZ-1 traffic each (25% total each)
- AZ-2 instances: 12.5% of AZ-2 traffic each (6.25% total each)
- Uneven!

With cross-zone:
- Each instance: 10% of total traffic (even distribution)
- But: Cross-AZ data transfer charges apply
```
**Remède :**

**Étape 1 : Comprendre le comportement par défaut**
```bash
# Check current cross-zone setting
aws elbv2 describe-load-balancer-attributes \
    --load-balancer-arn $ALB_ARN \
    --query 'Attributes[?Key==`load_balancing.cross_zone.enabled`]'

# ALB: Enabled by default (can't be disabled at load balancer level)
# NLB: Disabled by default (can be enabled)
# CLB: Disabled by default (can be enabled)
```
**Étape 2 : Calculer l'impact des coûts**
```python
#!/usr/bin/env python3
# calculate_cross_zone_cost.py

def calculate_cross_zone_cost(monthly_traffic_gb, instances_per_az):
    """
    Calculate cost difference with/without cross-zone load balancing
    """
    
    cross_az_transfer_cost = 0.01  # $0.01 per GB
    
    # Calculate average cross-AZ traffic
    total_instances = sum(instances_per_az.values())
    
    # With cross-zone: traffic distributed evenly
    # Some traffic will cross AZs
    cross_az_traffic = 0
    
    for az, count in instances_per_az.items():
        # Traffic coming from other AZs
        other_az_instances = total_instances - count
        proportion_from_other_az = other_az_instances / total_instances
        
        # Traffic this AZ receives from other AZs
        traffic_from_other_az = monthly_traffic_gb * proportion_from_other_az
        cross_az_traffic += traffic_from_other_az
    
    cross_zone_cost = cross_az_traffic * cross_az_transfer_cost
    
    print("Cross-Zone Load Balancing Cost Analysis:")
    print(f"  Monthly traffic: {monthly_traffic_gb} GB")
    print(f"  Instance distribution: {instances_per_az}")
    print(f"  Cross-AZ traffic: {cross_az_traffic:.2f} GB")
    print(f"  Cross-AZ transfer cost: ${cross_zone_cost:.2f}/month")
    
    # Without cross-zone (uneven distribution)
    print(f"\n  Without cross-zone:")
    print(f"    Cost: $0 (no cross-AZ transfer)")
    print(f"    But: Uneven load distribution")
    
    return cross_zone_cost

# Example
cost = calculate_cross_zone_cost(
    monthly_traffic_gb=1000,  # 1 TB
    instances_per_az={'us-east-1a': 3, 'us-east-1b': 5, 'us-east-1c': 2}
)
# Output: ~$6-8/month additional cost for even distribution
```
**Étape 3 : Optimiser la distribution des instances**
```bash
# For Auto Scaling Groups, balance instances across AZs
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name balanced-asg \
    --vpc-zone-identifier "$SUBNET_1A,$SUBNET_1B,$SUBNET_1C" \
    --min-size 6 \
    --max-size 12 \
    --desired-capacity 9 \
    --capacity-rebalance  # Proactively replace impaired instances

# With 9 instances across 3 AZs = 3 per AZ (balanced)
```
**Étape 4 : Activer/Désactiver Cross-Zone en fonction des exigences**
```bash
# For NLB: Enable if you want even distribution
aws elbv2 modify-load-balancer-attributes \
    --load-balancer-arn $NLB_ARN \
    --attributes Key=load_balancing.cross_zone.enabled,Value=true

# Benefit: No data transfer charges for NLB cross-zone
# (Unlike ALB where charges apply)

# For ALB: Cross-zone always evaluates all targets
# To minimize costs with uneven distribution:
# Option 1: Keep instances balanced across AZs
# Option 2: Accept the cost for better distribution
```
**Prévention :**

- Équilibrez toujours les instances entre les AZ
- Comprendre les implications en termes de coûts avant d'activer
- Surveiller le transfert de données inter-AZ dans Cost Explorer
- Utilisez NLB lorsque des adresses IP statiques sont nécessaires (cross-zone gratuite)

***

### Résumé des principaux pièges

| Piège | Impact | Solution rapide |
| :-- | :-- | :-- |
| Mauvaise configuration du contrôle de santé | Réduction de capacité, erreurs | Point de terminaison `/health` dédié |
| Pas de vidange de connexion | Erreurs 502/504 | Définir un délai approprié |
| Malentendu entre zones | Charge inégale, coûts inattendus | Équilibrer les instances, comprendre les coûts |
| SSL/TLS manquant | Failles de sécurité | Activer HTTPS avec ACM |
| Aucun journal d'accès | Impossible de dépanner | Activer les journaux d'accès S3 |
| Déploiement AZ unique | Pas de haute disponibilité | Déployer sur 3 AZ |

## Résumé du chapitre

Elastic Load Balancing est fondamental pour créer des applications hautement disponibles et évolutives dans AWS. Comprendre les différences entre ALB, NLB et GLB, configurer correctement les vérifications de l'état, mettre en œuvre la terminaison SSL/TLS et surveiller les mesures de performances sont des compétences essentielles pour les architectes de solutions.

**Principaux points à retenir :**

- **Choisissez le bon type d'équilibreur de charge :** ALB pour HTTP/HTTPS avec routage avancé, NLB pour TCP/UDP ou IP statiques, GLB pour les appareils réseau
- **Les vérifications de l'état sont essentielles :** Configurez des points de terminaison de vérification de l'état dédiés, des délais d'attente appropriés et des seuils qui correspondent au comportement de l'application.
- **Mettre en œuvre des arrêts progressifs :** Utilisez le délai de désenregistrement et l'arrêt progressif au niveau de l'application pour éviter les erreurs de demande en cours
- **Activer la terminaison SSL/TLS :** Décharger le chiffrement au niveau de l'équilibreur de charge, utiliser ACM pour la gestion des certificats, mettre en œuvre des redirections HTTP vers HTTPS.
- **L'équilibrage de charge entre zones est important :** Comprendre les implications en termes de coûts, équilibrer les instances sur plusieurs zones de disponibilité et permettre une distribution uniforme
- **Surveiller de manière exhaustive :** Activez les journaux d'accès, créez des alarmes CloudWatch pour les erreurs et les performances, analysez régulièrement les métriques
- **La sécurité est multicouche :** Utilisez WAF pour la protection des applications, Shield pour DDoS et des groupes de sécurité pour le contrôle d'accès au réseau.

Comprendre ELB en profondeur vous permet de créer des architectures résilientes, performantes et rentables. Les modèles d'équilibrage de charge que vous maîtrisez seront essentiels lorsque nous explorerons l'orchestration des conteneurs dans les prochains chapitres.

Au chapitre 6, nous explorerons Amazon ECS et les applications conteneurisées, où les équilibreurs de charge jouent un rôle crucial dans la découverte de services et la distribution du trafic.

## Questions de révision

1. **Quel type d'équilibreur de charge fonctionne au niveau de la couche 7 (couche d'application) ?**
a) Équilibreur de charge réseau
b) Équilibreur de charge d'application
c) Équilibreur de charge de passerelle
d) Équilibreur de charge classique uniquement

**Réponse : B** - Application Load Balancer fonctionne au niveau de la couche 7 (HTTP/HTTPS) et fournit un routage basé sur le contenu.

2. **Quel est le comportement d'équilibrage de charge entre zones par défaut pour ALB ?**
a) Désactivé
b) Activé, avec frais de transfert de données
c) Activé, pas de frais
d) Doit être configuré manuellement

**Réponse : B** - ALB a activé les zones croisées par défaut et facture le transfert de données entre zones de disponibilité.

3. **Quel équilibreur de charge fournit des adresses IP statiques ?**
a) Équilibreur de charge d'application uniquement
b) Équilibreur de charge réseau uniquement
c) ALB et NLB
d) Ni l'un ni l'autre

**Réponse : B** - NLB fournit une adresse IP élastique par zone de disponibilité pour les exigences IP statiques.

4. **Quel est l'objectif du délai de désenregistrement (vidange de la connexion) ?**
a) Accélérer les déploiements
b) Autoriser les demandes en vol à se terminer avant la suppression de la cible
c) Réduire les coûts
d) Améliorer les performances du contrôle de santé

**Réponse : B** - Le délai de désenregistrement permet aux connexions existantes de se terminer avant de supprimer la cible de la rotation.

5. **Quel code d'état HTTP une cible saine doit-elle renvoyer pour les vérifications de l'état ?**
a) Tout code 2xx ou 3xx
b) Seulement 200
c) Seulement 200 ou 301
d) Configuré dans matcher (par défaut 200)

**Réponse : D** - Les codes de réussite du contrôle de santé sont configurables via le paramètre matcher (la valeur par défaut est 200).

6. **Quel est le délai d'expiration maximum du délai de désenregistrement ?**
a) 300 secondes (5 minutes)
b) 900 secondes (15 minutes)
c) 3600 secondes (1 heure)
d) Aucune limite

**Réponse : C** - Le délai maximum de désenregistrement est de 3 600 secondes (1 heure).

7. **Quel service AWS fournit une protection DDoS pour les équilibreurs de charge ?**
a) AWS WAF
b) Bouclier AWS
c) AWS GuardDuty
d) Centre de sécurité AWS

**Réponse : B** - AWS Shield fournit une protection DDoS (Standard gratuite, Advanced payante).

8. **À quoi sert SNI (Server Name Indication) ?**
a) Plusieurs certificats SSL sur un seul équilibreur de charge
b) Prises de contact SSL plus rapides
c) Une meilleure sécurité
d) Coûts réduits

**Réponse : A** - SNI permet d'héberger plusieurs certificats SSL/TLS sur un seul écouteur d'équilibrage de charge.

9. **Quel type d'équilibreur de charge est requis pour PrivateLink ?**
a) Équilibreur de charge d'application
b) Équilibreur de charge réseau
c) Équilibreur de charge de passerelle
d) Équilibreur de charge classique

**Réponse : B** - PrivateLink nécessite Network Load Balancer pour l'exposition des services privés.

10. **À quoi servent les « sessions collantes » ?**
a) Des temps de réponse plus rapides
b) Acheminer l'utilisateur vers la même cible pendant la durée
c) Une meilleure sécurité
d) Coûts réduits

**Réponse : B** - Les sessions persistantes acheminent les requêtes du même client vers la même cible, en conservant l'état de la session.

11. **Quelle métrique indique que les cibles ne sont pas saines ?**
a) Nombre de requêtes
b) Temps de réponse cible
c) UnHealthyHostCount
d) HTTPCode_5XX_Count

**Réponse : C** - UnHealthyHostCount affiche le nombre de cibles défectueuses.

12. **Quel est l'intervalle minimum de contrôle de santé ?**
a) 5 secondes (ALB/CLB), 10 secondes (NLB)
b) 10 secondes pour tous
c) 30 secondes pour tous
d) 1 seconde

**Réponse : A** - Le minimum ALB/CLB est de 5 secondes, le minimum NLB est de 10 secondes.

13. **Quel type d'équilibreur de charge préserve l'adresse IP source par défaut ?**
a) Équilibreur de charge d'application
b) Équilibreur de charge réseau
c) Équilibreur de charge de passerelle
d) Équilibreur de charge classique

**Réponse : B** - NLB préserve l'adresse IP source du client, tandis qu'ALB utilise l'en-tête X-Forwarded-For.

14. **À quoi sert le mode de démarrage lent ?**
a) Économisez des coûts
b) Augmenter progressivement le trafic vers de nouvelles cibles
c) Améliorer la sécurité
d) Réduire la latence

**Réponse : B** – Le démarrage lent augmente progressivement le trafic vers les cibles nouvellement enregistrées.

15. **Quelle affirmation concernant Gateway Load Balancer est VRAIE ?**
a) Acheminer le trafic HTTP/HTTPS
b) Fonctionne à la couche 7
c) Utilisé pour les appareils virtuels tiers
d) Option d'équilibrage de charge la moins chère

**Réponse : C** - GLB est spécialement conçu pour le déploiement et la mise à l'échelle d'appliances réseau tierces.

***
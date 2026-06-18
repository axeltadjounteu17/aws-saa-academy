# Chapitre 3 : Cloud privé virtuel (VPC)

##Présentation

Amazon Virtual Private Cloud (VPC) constitue la base réseau de votre infrastructure AWS. Il fournit des environnements réseau isolés dans lesquels vous pouvez lancer des ressources AWS avec un contrôle complet sur l'adressage IP, les sous-réseaux, les tables de routage et les passerelles réseau. Alors qu'IAM contrôle *qui* peut accéder à vos ressources, VPC contrôle *comment* les ressources communiquent entre elles et avec le monde extérieur.

Considérez le VPC comme votre centre de données privé dans le cloud, mais avec la flexibilité et l'évolutivité que les réseaux traditionnels ne pourraient jamais offrir. Vous pouvez créer plusieurs réseaux isolés au sein d'un seul compte AWS, les segmenter en sous-réseaux publics et privés, contrôler le flux de trafic avec des groupes de sécurité et des ACL réseau et vous connecter aux réseaux sur site via VPN ou Direct Connect. Ce niveau de contrôle est essentiel pour créer des applications sécurisées, conformes et performantes.

L’importance d’une conception appropriée du VPC ne peut être surestimée. Un VPC bien architecturé assure la sécurité grâce à l'isolation du réseau, prend en charge la haute disponibilité via des déploiements multi-AZ, facilite la connectivité cloud hybride et s'adapte à la croissance future. À l’inverse, une mauvaise conception de VPC entraîne un épuisement des adresses IP, des configurations de routage complexes et fragiles, des vulnérabilités de sécurité et des efforts de réarchitecture coûteux.

Ce chapitre fournit une couverture complète des principes fondamentaux du VPC, des modèles de mise en réseau avancés et des architectures prêtes pour la production. Vous apprendrez à concevoir des blocs CIDR évolutifs, à mettre en œuvre une sécurité réseau de défense en profondeur, à créer des applications multiniveaux résilientes et à intégrer des réseaux sur site de manière transparente. Que vous déployiez votre première application dans AWS ou que vous conceviez une infrastructure à l'échelle mondiale, la maîtrise du VPC est fondamentale pour votre réussite en tant qu'architecte de solutions.

## Théorie \&Concepts

### Fondamentaux du VPC

Un VPC est une section logiquement isolée du cloud AWS dans laquelle vous pouvez lancer des ressources dans un réseau virtuel que vous définissez. Chaque VPC existe dans une seule région AWS mais peut s'étendre sur plusieurs zones de disponibilité.

**Caractéristiques clés :**

- **Portée régionale :** les VPC sont spécifiques à une région ; ils ne peuvent pas s'étendre sur plusieurs régions
- **Prise en charge de plusieurs AZ :** Les sous-réseaux au sein d'un VPC peuvent être distribués sur plusieurs AZ
- **Contrôle d'adresse IP :** Vous définissez la plage d'adresses IP à l'aide de la notation CIDR
- **Limites par défaut :** 5 VPC par région (limite souple, peut être augmentée)
- **Isolement complet :** les VPC sont isolés les uns des autres par défaut

**VPC par défaut :**

Chaque compte AWS est livré avec un VPC par défaut dans chaque région :

- Bloc CIDR : 172.31.0.0/16
- Un sous-réseau par défaut par AZ (généralement /20)
- Passerelle Internet attachée
- Groupe de sécurité par défaut et ACL réseau
- Pratique pour démarrer, mais les charges de travail de production doivent utiliser des VPC personnalisés


### Blocs CIDR et adressage IP

La notation CIDR (Classless Inter-Domain Routing) définit les plages d'adresses IP de votre VPC.

**Notation CIDR :** `10.0.0.0/16`

- Première partie : Adresse réseau (10.0.0.0)
- Deuxième partie : Longueur du préfixe (16 bits pour le réseau, 16 bits pour les hôtes)

**Exigences CIDR AWS VPC :**

- Minimum : /28 (16 adresses IP)
- Maximum : /16 (65 536 adresses IP)
- Peut utiliser les plages IP privées RFC 1918 :
    - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
    - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
- Peut utiliser des blocs CIDR routables publiquement (non recommandé)

**Dimensionnement du bloc CIDR :**


| CIDR | IP totales | IP utilisables | Cas d'utilisation |
| :-- | :-- | :-- | :-- |
| /28 | 16 | 11 | Très petits sous-réseaux |
| /24 | 256 | 251 | Petits sous-réseaux (sous-réseau privé typique) |
| /20 | 4 096 | 4 091 | Sous-réseaux moyens (sous-réseau public typique) |
| /16 | 65 536 | 65 531 | VPC entier (taille typique) |

**AWS réserve 5 IP par sous-réseau :**

- Première IP : adresse réseau
- Deuxième IP : routeur VPC
- Troisième IP : serveur DNS
- Quatrième IP : utilisation future
- Dernière IP : adresse de diffusion réseau

Exemple : Dans 10.0.0.0/24 :

- 10.0.0.0 - Adresse réseau (réservée)
- 10.0.0.1 - Routeur VPC (réservé)
- 10.0.0.2 - Serveur DNS (réservé)
- 10.0.0.3 - Utilisation future (réservé)
- 10.0.0.4-10.0.0.254 - Disponible pour utilisation (251 adresses)
- 10.0.0.255 - Adresse de diffusion (réservée)

**Blocs CIDR secondaires :**

Vous pouvez ajouter jusqu'à 5 blocs CIDR secondaires à un VPC :

- Utile lorsque vous manquez d'adresses IP
- Ne doit pas chevaucher les blocs CIDR existants
- Ne peut pas être supprimé si les sous-réseaux les utilisent


### Sous-réseaux

Les sous-réseaux sont des subdivisions de la plage d'adresses IP d'un VPC où vous lancez des ressources AWS.

**Caractéristiques du sous-réseau :**

- **Spécifique à AZ :** Chaque sous-réseau existe dans une seule zone de disponibilité
- **Sous-ensemble CIDR :** Le CIDR du sous-réseau doit être compris dans la plage CIDR du VPC.
- **Pas de chevauchement :** Les sous-réseaux ne peuvent pas avoir de blocs CIDR qui se chevauchent
- **Public vs Privé :** Classification basée sur le routage (pas de propriété inhérente)

**Sous-réseaux publics :**

- Avoir un itinéraire vers la passerelle Internet (IGW)
- Les ressources obtiennent des adresses IP publiques
- Utilisé pour : serveurs Web, équilibreurs de charge, hôtes bastions

**Sous-réseaux privés :**

- Pas de route directe vers IGW
- Les ressources utilisent la passerelle/l'instance NAT pour l'Internet sortant
- Utilisé pour : Serveurs d'applications, bases de données, services internes

**Stratégie de dimensionnement des sous-réseaux :**
```
Example: VPC 10.0.0.0/16

Public Subnets (smaller, fewer resources):
- 10.0.1.0/24  (AZ-a, 251 hosts)
- 10.0.2.0/24  (AZ-b, 251 hosts)
- 10.0.3.0/24  (AZ-c, 251 hosts)

Private App Subnets (medium):
- 10.0.11.0/24 (AZ-a, 251 hosts)
- 10.0.12.0/24 (AZ-b, 251 hosts)
- 10.0.13.0/24 (AZ-c, 251 hosts)

Private Data Subnets (smaller, highly controlled):
- 10.0.21.0/24 (AZ-a, 251 hosts)
- 10.0.22.0/24 (AZ-b, 251 hosts)
- 10.0.23.0/24 (AZ-c, 251 hosts)

Reserved for future expansion:
- 10.0.100.0/22 (1,019 hosts)
- 10.1.0.0/16 (entire /16 block)
```
### Tables de routage

Les tables de routage déterminent vers où le trafic réseau des sous-réseaux est dirigé.

**Composants de la table de routage :**

- **Destination :** plage d'adresses IP (CIDR)
- **Cible :** Où envoyer le trafic correspondant (IGW, NAT, homologue VPC, etc.)
- **Table de routage principale :** Créée automatiquement avec VPC, utilisée par défaut
- **Tables de routage personnalisées :** Créées pour des exigences de routage spécifiques

**Itinéraire local par défaut :**

Chaque table de routage possède une route locale qui permet la communication au sein du VPC :
```
Destination: 10.0.0.0/16
Target: local
```
Cet itinéraire ne peut être ni modifié ni supprimé.

**Priorité d'itinéraire :**

Lorsque plusieurs routes correspondent, AWS utilise la route la plus spécifique (correspondance de préfixe la plus longue) :
```
10.0.0.0/16 → local
10.0.1.0/24 → NAT Gateway
10.0.1.15/32 → VPN
```
Le trafic vers 10.0.1.15 utilise la route VPN (la plus spécifique).

**Types de tables de routage :**

**Tableau de routage public :**
```
Destination         Target
10.0.0.0/16        local
0.0.0.0/0          igw-xxxxx
```
**Tableau de routage privé :**
```
Destination         Target
10.0.0.0/16        local
0.0.0.0/0          nat-xxxxx
```
**Table de routage isolée (pas d'Internet) :**
```
Destination         Target
10.0.0.0/16        local
192.168.0.0/16     vgw-xxxxx (VPN to on-premises)
```
### Passerelle Internet (IGW)

Une passerelle Internet permet la communication entre les ressources de votre VPC et Internet.

**Caractéristiques IGW :**

- **Haute disponibilité :** Redondant et mis à l'échelle horizontalement par AWS
- **Aucune contrainte de bande passante :** Évolue automatiquement
- **Un par VPC :** Vous ne pouvez attacher qu'un seul IGW à un VPC
- **Bidirectionnel :** Prend en charge le trafic entrant et sortant
- **Apatride :** ne suit pas l'état de la connexion

**Exigences pour l'accès à Internet :**

1. Attachez IGW au VPC
2. Créez une route vers IGW (0.0.0.0/0 → igw-xxxxx)
3. Attribuez une adresse IP publique ou une adresse IP élastique aux ressources
4. Le groupe de sécurité doit autoriser le trafic sortant
5. L'ACL réseau doit autoriser le trafic

**IP publique et IP élastique :**

**IP publique :**

- Attribué automatiquement aux instances dans les sous-réseaux publics
- Changements lorsque l'instance s'arrête/démarre
- Ne peut pas être déplacé entre les instances
- Gratuit

**IP élastique (EIP) :**

- Adresse IP publique statique
- Persiste lors des arrêts/démarrages
- Peut être réaffecté à différentes instances
- Facturé lorsqu'il n'est pas associé à l'instance en cours d'exécution
- Utile pour : passerelles NAT, hôtes bastions, liste blanche


### Passerelle NAT et instance NAT

NAT (Network Address Translation) permet aux instances de sous-réseaux privés de se connecter à Internet tout en empêchant les connexions entrantes.

**Passerelle NAT (gérée par AWS) :**

**Caractéristiques :**

- Entièrement géré par AWS
- Hautement disponible dans une seule AZ
- Évolue automatiquement jusqu'à **100 Gbit/s** (mise à jour en 2023 – était auparavant de 45 Gbit/s)
- Facturé à l'heure + données traitées
- Prend en charge jusqu'à 55 000 connexions simultanées par destination unique

> **Remarque 2025 :** AWS propose désormais des **passerelles NAT privées** (aucune IP élastique requise) pour la communication VPC vers VPC ou VPC vers sur site entièrement au sein du réseau AWS, éliminant ainsi le transit Internet.

**Meilleures pratiques :**

- Déployez une passerelle NAT par AZ pour une haute disponibilité
- Placer dans un sous-réseau public avec route vers IGW
- Allouer une adresse IP élastique pour une adresse IP sortante stable

**Coûts :**

- \$0,045 par heure
- 0,045 $ par Go traité
- Transfert de données gratuit vers S3/DynamoDB (même région via le point de terminaison de la passerelle)

**Instance NAT (autogérée) :**

Une instance EC2 configurée pour effectuer NAT :

**Avantages :**

- Coût inférieur (tarification de l'instance EC2 uniquement)
- Peut être utilisé comme hôte bastion
- Contrôle total sur le logiciel/configuration

**Inconvénients :**

- Gestion manuelle requise
- Point de défaillance unique (nécessite une configuration HA)
- Bande passante limitée (dépend du type d'instance)
- Doit désactiver la vérification source/destination

**Quand utiliser :**

- Passerelle NAT : charges de travail de production, haute disponibilité requise, gestion sans intervention
- Instance NAT : environnements sensibles aux coûts, nécessitant des fonctionnalités supplémentaires


### Groupes de sécurité

Les groupes de sécurité agissent comme des pare-feu virtuels contrôlant le trafic entrant et sortant au niveau de l'instance.

**Caractéristiques clés :**

- **Avec état :** Trafic de retour automatiquement autorisé
- **Niveau instance :** appliqué aux ENI (Elastic Network Interfaces)
- **Refus par défaut :** Tous les appels entrants refusés, tous les appels sortants autorisés par défaut
- **Règles uniquement :** Impossible de refuser explicitement le trafic (autoriser uniquement)
- **Plusieurs SG :** Jusqu'à 5 groupes de sécurité par instance
- **Modifications des règles :** Prenez effet immédiatement

**Règles du groupe de sécurité :**

Chaque règle précise :

- **Type :** Protocole (TCP, UDP, ICMP ou tous)
- **Plage de ports :** Port ou plage unique
- **Source/Destination :** adresses IP, blocs CIDR ou autres groupes de sécurité

**Exemples de règles :**
```
Inbound:
Type: HTTP
Protocol: TCP
Port: 80
Source: 0.0.0.0/0 (anywhere)

Type: HTTPS
Protocol: TCP
Port: 443
Source: 0.0.0.0/0

Type: SSH
Protocol: TCP
Port: 22
Source: 203.0.113.0/24 (your office network)

Type: MySQL
Protocol: TCP
Port: 3306
Source: sg-12345678 (application server security group)
```
**Référencement des groupes de sécurité :**

Au lieu de coder en dur les adresses IP, référencez d’autres groupes de sécurité :
```
Web Server SG:
Inbound: Port 80/443 from 0.0.0.0/0

App Server SG:
Inbound: Port 8080 from Web Server SG

Database SG:
Inbound: Port 3306 from App Server SG
```
Cela crée une sécurité chaînée qui s’adapte automatiquement à mesure que des instances sont ajoutées/supprimées.

### Listes de contrôle d'accès au réseau (NACL)

Les NACL sont des pare-feu sans état qui contrôlent le trafic au niveau du sous-réseau.

**Caractéristiques clés :**

- **Apatride :** Le trafic de retour doit être explicitement autorisé
- **Niveau sous-réseau :** Appliquer à toutes les ressources du sous-réseau
- **Autoriser par défaut :** La NACL par défaut autorise tout le trafic
- **Règles ordonnées :** Évaluées par ordre numérique (le plus bas en premier)
- **Explicit Deny :** Peut refuser explicitement le trafic (contrairement aux groupes de sécurité)
- **Évaluation :** Arrête au premier match

**Règles de la NACL :**

Chaque règle comporte :

- **Numéro de règle :** 1-32766 (évalué dans l'ordre)
- **Type :** Protocole
- **Plage de ports :** Ports applicables
- **Source/Destination :** Blocs CIDR
- **Action :** Autoriser ou refuser

**Exemple NACL :**
```
Inbound Rules:
Rule #  Type      Protocol  Port   Source        Allow/Deny
100     HTTP      TCP       80     0.0.0.0/0     Allow
110     HTTPS     TCP       443    0.0.0.0/0     Allow
120     SSH       TCP       22     203.0.113.0/24 Allow
130     Custom    TCP       1024-  0.0.0.0/0     Allow (ephemeral ports)
                             65535
*       All       All       All    0.0.0.0/0     Deny

Outbound Rules:
Rule #  Type      Protocol  Port   Destination   Allow/Deny
100     HTTP      TCP       80     0.0.0.0/0     Allow
110     HTTPS     TCP       443    0.0.0.0/0     Allow
120     Custom    TCP       1024-  0.0.0.0/0     Allow (ephemeral ports)
                             65535
*       All       All       All    0.0.0.0/0     Deny
```
**Ports éphémères :**

Les NACL étant sans état, vous devez autoriser les ports éphémères pour le trafic de retour :

-Linux : 32768-61000
-Fenêtres : 49152-65535
-ELB : 1024-65535
- Recommandation : 1024-65535 (couvre tout)

**Groupes de sécurité vs NACL :**


| Fonctionnalité | Groupe de sécurité | LNCL |
| :-- | :-- | :-- |
| Niveau | Instance (ENI) | Sous-réseau |
| État | Avec état | Apatride |
| Règles | Autoriser uniquement | Autoriser et refuser |
| Évaluation | Toutes les règles | Premier match |
| Par défaut | Refuser tous les appels entrants | Autoriser tout |
| Trafic de retour | Automatique | Manuel |

**Bonne pratique :** Utilisez des groupes de sécurité comme couche de sécurité principale et des NACL pour une protection supplémentaire au niveau du sous-réseau.

### Appairage de VPC

L'appairage de VPC crée une connexion réseau entre deux VPC, permettant le routage à l'aide d'adresses IP privées.

**Caractéristiques :**

- **Non transitif :** les VPC ne peuvent pas communiquer via un intermédiaire
- **Aucun CIDR qui se chevauche :** Les VPC connectés doivent avoir des plages IP distinctes
- **Cross-Region :** Prend en charge le peering inter-régions
- **Cross-Account :** Prend en charge les connexions entre différents comptes AWS
- **Chiffré :** Le trafic inter-régions est crypté
- **Pas de point de défaillance unique :** Hautement disponible de par sa conception

**Exemple de routage transitif :**
```
VPC A (10.0.0.0/16) ←→ VPC B (10.1.0.0/16) ←→ VPC C (10.2.0.0/16)

VPC A cannot communicate with VPC C through VPC B
Direct peering required: VPC A ←→ VPC C
```
**Limites du peering :**

- Maximum 125 connexions d'appairage par VPC
- Pas de blocs CIDR qui se chevauchent
- Les groupes de sécurité peuvent référencer des groupes de sécurité VPC homologues (même région uniquement)
- Impossible d'appairer avec des blocs CIDR IPv6 qui se chevauchent

**Cas d'utilisation :**

- VPC de services partagés (DNS, Active Directory)
- Accès à l'environnement de développement/test aux ressources partagées
- Reprise après sinistre multirégionale
- Fusion des réseaux des sociétés acquises


### Passerelle de transit

AWS Transit Gateway agit comme un routeur cloud, connectant plusieurs VPC et réseaux sur site via un hub central.

**Principaux avantages :**

- **Topologie simplifiée :** Hub-and-spoke au lieu d'un maillage complet
- **Routage transitif :** Prend en charge les connexions transitives (contrairement au peering VPC)
- **Évolutivité :** Connectez des milliers de VPC
- **Cross-Region :** Prise en charge du peering inter-région
- **Tables de routage :** Plusieurs tables de routage pour la segmentation du trafic
- **Multidiffusion :** Prend en charge le trafic multidiffusion

**Transit Gateway et appairage de VPC :**

**VPC Peering Full Mesh (5 VPC) :**
```
Connections required: n(n-1)/2 = 5(4)/2 = 10 peering connections

VPC1 ←→ VPC2
VPC1 ←→ VPC3
VPC1 ←→ VPC4
VPC1 ←→ VPC5
VPC2 ←→ VPC3
VPC2 ←→ VPC4
VPC2 ←→ VPC5
VPC3 ←→ VPC4
VPC3 ←→ VPC5
VPC4 ←→ VPC5
```
**Transit Gateway Hub-Spoke (5 VPC) :**
```
Connections required: n = 5 attachments

      TGW
    /  |  \
VPC1 VPC2 VPC3 VPC4 VPC5
```
**Pièces jointes de la passerelle de transit :**

- Pièces jointes VPC
- Connexions VPN
- Passerelles Direct Connect
- Peering Transit Gateway (inter-région)

**Tableaux de routage de la passerelle de transit :**

Créez plusieurs tables de routage pour l'isolation du trafic :
```
Production Route Table:
- Production VPCs can talk to each other
- Can route to on-premises (VPN)
- Cannot access development VPCs

Development Route Table:
- Development VPCs can talk to each other
- Can access shared services
- Cannot access production
```
**Coûts :**

- 0,05 $ par heure de pièce jointe
- 0,02 $ par Go traité
- Plus cher que le peering VPC mais offre plus de flexibilité


### Points de terminaison d'un VPC

Les points de terminaison d'un VPC permettent des connexions privées aux services AWS sans passer par Internet.

**Types de points de terminaison d'un VPC :**

**1. Points de terminaison de la passerelle (S3 et DynamoDB) :**

- **Gratuit :** Aucun frais de traitement des données
- **Entrée de table de routage :** Ajouté aux tables de routage
- **Spécifique à la région :** Accès à la même région uniquement
- **Contrôle des politiques :** Les politiques de ressources contrôlent l'accès

Exemple d'entrée de table de routage :
```
Destination                   Target
pl-12345678 (S3 prefix list) vpce-xxxxx (Gateway endpoint)
```
**2. Points de terminaison de l'interface (PrivateLink) :**

- **Basé sur ENI :** Crée une interface réseau élastique dans le sous-réseau
- **Résolution DNS :** Les noms DNS privés sont résolus en adresses IP privées
- **Facturation :** \$0,01 par heure + \$0,01 par Go traité
- **Spécifique à AZ :** Déployez dans chaque AZ pour une haute disponibilité
- **Prend en charge :** La plupart des services AWS (EC2, SNS, SQS, etc.)

**Avantages :**

- Sécurité améliorée (pas d'exposition Internet)
- Coûts de transfert de données réduits
- Performances améliorées (latence plus faible)
- Répondre aux exigences de conformité (les données ne quittent pas le réseau AWS)

**Cas d'utilisation :**

- Accédez à S3 à partir de sous-réseaux privés sans NAT
- Points de terminaison de la passerelle API privée
- PrivateLink pour les applications SaaS
- Communication de service à service


### Journaux de flux VPC

Les journaux de flux VPC capturent des informations sur le trafic IP circulant via les interfaces réseau.

**Capacités :**

- **Niveaux de capture :** VPC, sous-réseau ou ENI
- **Accepté/Rejeté :** Tout enregistrer, accepté uniquement ou rejeté uniquement
- **Destinations :** CloudWatch Logs, S3, Kinesis Data Firehose
- **Aucun impact sur les performances :** Capturé en dehors du chemin de données

**Format d'enregistrement du journal de flux :**
```
version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status

2 123456789012 eni-abc123 10.0.1.5 198.51.100.1 49152 80 6 10 5200 1620000000 1620000060 ACCEPT OK
```
**Cas d'utilisation :**

- Analyse de sécurité (identifier les accès non autorisés)
- Dépannage des problèmes de connectivité
- Analyse des coûts (modèles de transfert de données)
- Audit de conformité
- Analyse du trafic réseau

**Analyse avec CloudWatch Logs Insights :**
```sql
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, action
| filter action = "REJECT"
| stats count(*) as rejectionCount by srcAddr
| sort rejectionCount desc
| limit 10
```
### DNS dans le VPC

Chaque VPC dispose d'une résolution DNS fournie par Amazon Route 53 Resolver.

**Paramètres DNS :**

- **enableDnsSupport :** Résolution DNS activée (par défaut : true)
- **enableDnsHostnames :** Attribuer des noms d'hôte DNS publics (par défaut : dépend du type de VPC)

**Résolution DNS :**

Ressources internes : `ip-10-0-1-5.ec2.internal` (DNS privé)
Ressources publiques : `ec2-198-51-100-1.compute-1.amazonaws.com` (DNS public)

**Résolveur Route 53 :**

- Requêtes DNS acheminées vers l'adresse VPC+2 (par exemple, 10.0.0.2)
- Résout les noms internes et transmet les requêtes externes
- Peut configurer des règles de transfert pour le DNS sur site

**Zones hébergées privées :**

Associez des zones hébergées Route 53 privées à des VPC :

- Noms DNS internes (app.internal.example.com)
- Résolution DNS inter-VPC
- DNS hybride entre AWS et sur site


### Interfaces réseau élastiques (ENI)

Une ENI est un composant réseau logique représentant une carte réseau virtuelle.

**Attributs ENI :**

- **Adresse IPv4 privée principale**
- **Une ou plusieurs adresses IPv4 privées secondaires**
- **Une IP Elastic par IPv4 privée**
- **Une IPv4 publique (facultatif)**
- **Un ou plusieurs groupes de sécurité**
- **Adresse MAC**
- **Drapeau de vérification source/destination**

**Cas d'utilisation :**

- **Réseau de gestion :** ENI séparée pour le trafic de gestion
- **Instances à double hébergement :** Plusieurs sous-réseaux/contextes de sécurité
- **Licence :** Licences logicielles basées sur MAC (ENI conserve MAC)
- **Haute disponibilité :** Déplacez ENI entre les instances pendant le basculement

**Pièce jointe ENI :**

- ENI primaire : créé avec l'instance, supprimé avec l'instance
- ENI secondaire : peut être créé indépendamment, attaché/détaché dynamiquement


### IPv6 dans le VPC

Les VPC peuvent être à double pile, prenant en charge à la fois IPv4 et IPv6.

**Caractéristiques IPv6 :**

- **Bloc CIDR :** AWS attribue /56 CIDR (256 /64 sous-réseaux)
- **Adresses publiques :** Toutes les adresses IPv6 sont publiques
- **Passerelle Internet :** Requis pour l'accès Internet IPv6
- **Passerelle Internet de sortie uniquement :** équivalent IPv6 du NAT (sortant uniquement)
- **Pas de NAT :** IPv6 n'utilise pas de NAT (chaque adresse est unique au monde)

**Activation d'IPv6 :**

1. Associer le bloc CIDR IPv6 au VPC
2. Attribuez /64 IPv6 CIDR aux sous-réseaux
3. Mettre à jour les tables de routage (`::/0` → IGW ou EIGW)
4. Attribuer automatiquement des adresses IPv6 aux instances
5. Mettre à jour les groupes de sécurité/NACL pour IPv6

**Cas d'utilisation :**

- Applications IoT (grand espace d'adressage)
- Applications nécessitant un adressage de bout en bout
- Applications modernes conçues pour IPv6
- Exigences de conformité


## Implémentation pratique

### Atelier 1 : Créer une architecture VPC de production à 3 niveaux

**Objectif :** Créer un VPC sécurisé et hautement disponible avec des niveaux public, d'application et de base de données sur 3 zones de disponibilité.

**Aperçu de l'architecture :**
```
VPC: 10.0.0.0/16

Public Tier (Web):
- 10.0.1.0/24 (us-east-1a)
- 10.0.2.0/24 (us-east-1b)
- 10.0.3.0/24 (us-east-1c)

Application Tier:
- 10.0.11.0/24 (us-east-1a)
- 10.0.12.0/24 (us-east-1b)
- 10.0.13.0/24 (us-east-1c)

Database Tier:
- 10.0.21.0/24 (us-east-1a)
- 10.0.22.0/24 (us-east-1b)
- 10.0.23.0/24 (us-east-1c)
```
#### Étape 1 : Créer un VPC
```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=Production-VPC}]' \
    --query 'Vpc.VpcId' \
    --output text)

echo "VPC ID: $VPC_ID"

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-hostnames

# Enable DNS support (enabled by default, but verify)
aws ec2 modify-vpc-attribute \
    --vpc-id $VPC_ID \
    --enable-dns-support
```
#### Étape 2 : Créer une passerelle Internet
```bash
# Create IGW
IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=Production-IGW}]' \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

echo "IGW ID: $IGW_ID"

# Attach IGW to VPC
aws ec2 attach-internet-gateway \
    --vpc-id $VPC_ID \
    --internet-gateway-id $IGW_ID
```
#### Étape 3 : Créer des sous-réseaux
```bash
# Public Subnets
PUBLIC_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.1.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1A},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

PUBLIC_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.2.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1B},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

PUBLIC_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.3.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=Public-Subnet-1C},{Key=Tier,Value=Public}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Application Subnets
APP_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.11.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1A},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

APP_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.12.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1B},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

APP_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.13.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=App-Subnet-1C},{Key=Tier,Value=Application}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Database Subnets
DB_SUBNET_1A=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.21.0/24 \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1A},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

DB_SUBNET_1B=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.22.0/24 \
    --availability-zone us-east-1b \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1B},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

DB_SUBNET_1C=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.0.23.0/24 \
    --availability-zone us-east-1c \
    --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=DB-Subnet-1C},{Key=Tier,Value=Database}]' \
    --query 'Subnet.SubnetId' \
    --output text)

# Enable auto-assign public IP for public subnets
aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1A \
    --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1B \
    --map-public-ip-on-launch

aws ec2 modify-subnet-attribute \
    --subnet-id $PUBLIC_SUBNET_1C \
    --map-public-ip-on-launch
```
#### Étape 4 : Créer des passerelles NAT
```bash
# Allocate Elastic IPs for NAT Gateways
EIP_1A=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1A}]' \
    --query 'AllocationId' \
    --output text)

EIP_1B=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1B}]' \
    --query 'AllocationId' \
    --output text)

EIP_1C=$(aws ec2 allocate-address \
    --domain vpc \
    --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=NAT-EIP-1C}]' \
    --query 'AllocationId' \
    --output text)

# Create NAT Gateways (one per AZ for high availability)
NAT_GW_1A=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1A \
    --allocation-id $EIP_1A \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1A}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

NAT_GW_1B=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1B \
    --allocation-id $EIP_1B \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1B}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

NAT_GW_1C=$(aws ec2 create-nat-gateway \
    --subnet-id $PUBLIC_SUBNET_1C \
    --allocation-id $EIP_1C \
    --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=NAT-GW-1C}]' \
    --query 'NatGateway.NatGatewayId' \
    --output text)

# Wait for NAT Gateways to become available
echo "Waiting for NAT Gateways to become available..."
aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW_1A $NAT_GW_1B $NAT_GW_1C
echo "NAT Gateways are ready"
```
#### Étape 5 : Créer des tables de routage
```bash
# Public Route Table
PUBLIC_RT=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Public-RT}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add route to Internet Gateway
aws ec2 create-route \
    --route-table-id $PUBLIC_RT \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID

# Associate public subnets with public route table
aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PUBLIC_RT \
    --subnet-id $PUBLIC_SUBNET_1C

# Private Route Tables (one per AZ for NAT Gateway routing)
PRIVATE_RT_1A=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1A}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1A

PRIVATE_RT_1B=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1B}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1B \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1B

PRIVATE_RT_1C=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1C}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1C \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1C

# Associate application subnets
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $APP_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $APP_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $APP_SUBNET_1C

# Associate database subnets
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $DB_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $DB_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $DB_SUBNET_1C
```
#### Étape 6 : Créer des groupes de sécurité
```bash
# Web Tier Security Group (Public-facing)
WEB_SG=$(aws ec2 create-security-group \
    --group-name web-tier-sg \
    --description "Security group for web tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=Web-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Application Tier Security Group
APP_SG=$(aws ec2 create-security-group \
    --group-name app-tier-sg \
    --description "Security group for application tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=App-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow traffic from web tier on port 8080
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# Database Tier Security Group
DB_SG=$(aws ec2 create-security-group \
    --group-name db-tier-sg \
    --description "Security group for database tier" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=DB-Tier-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow MySQL/Aurora from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG

# Bastion Host Security Group (for SSH access)
BASTION_SG=$(aws ec2 create-security-group \
    --group-name bastion-sg \
    --description "Security group for bastion host" \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=Bastion-SG}]' \
    --query 'GroupId' \
    --output text)

# Allow SSH from your IP (replace with your IP)
aws ec2 authorize-security-group-ingress \
    --group-id $BASTION_SG \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24  # Replace with your IP

# Allow SSH from bastion to app and DB tiers
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG
```
#### Étape 7 : Créer des ACL réseau (couche supplémentaire)
```bash
# Public Subnet NACL
PUBLIC_NACL=$(aws ec2 create-network-acl \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=Public-NACL}]' \
    --query 'NetworkAcl.NetworkAclId' \
    --output text)

# Inbound rules
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 100 \
    --protocol tcp \
    --port-range From=80,To=80 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 110 \
    --protocol tcp \
    --port-range From=443,To=443 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 120 \
    --protocol tcp \
    --port-range From=22,To=22 \
    --cidr-block 203.0.113.0/24 \
    --rule-action allow

# Ephemeral ports (for return traffic)
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --ingress \
    --rule-number 130 \
    --protocol tcp \
    --port-range From=1024,To=65535 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

# Outbound rules
aws ec2 create-network-acl-entry \
    --network-acl-id $PUBLIC_NACL \
    --egress \
    --rule-number 100 \
    --protocol -1 \
    --cidr-block 0.0.0.0/0 \
    --rule-action allow

# Associate with public subnets
aws ec2 replace-network-acl-association \
    --association-id $(aws ec2 describe-network-acls \
        --filters "Name=association.subnet-id,Values=$PUBLIC_SUBNET_1A" \
        --query 'NetworkAcls[0].Associations[0].NetworkAclAssociationId' \
        --output text) \
    --network-acl-id $PUBLIC_NACL
```
#### Étape 8 : Créer des points de terminaison d'un VPC
```bash
# S3 Gateway Endpoint (free, for private S3 access)
S3_ENDPOINT=$(aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C \
    --query 'VpcEndpoint.VpcEndpointId' \
    --output text)

# DynamoDB Gateway Endpoint
DYNAMODB_ENDPOINT=$(aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.dynamodb \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C \
    --query 'VpcEndpoint.VpcEndpointId' \
    --output text)

echo "VPC Setup Complete!"
echo "VPC ID: $VPC_ID"
echo "Public Subnets: $PUBLIC_SUBNET_1A, $PUBLIC_SUBNET_1B, $PUBLIC_SUBNET_1C"
echo "App Subnets: $APP_SUBNET_1A, $APP_SUBNET_1B, $APP_SUBNET_1C"
echo "DB Subnets: $DB_SUBNET_1A, $DB_SUBNET_1B, $DB_SUBNET_1C"
```
### Atelier 2 : Implémentation de l'appairage de VPC

**Objectif :** Connectez deux VPC dans différentes régions à l'aide du peering VPC pour la reprise après sinistre.

**Scénario :**

- VPC principal : us-east-1 (10.0.0.0/16)
- DR VPC : us-west-2 (10.1.0.0/16)
```bash
# Create peering connection (from us-east-1)
PEERING_ID=$(aws ec2 create-vpc-peering-connection \
    --vpc-id $VPC_ID_EAST \
    --peer-vpc-id $VPC_ID_WEST \
    --peer-region us-west-2 \
    --tag-specifications 'ResourceType=vpc-peering-connection,Tags=[{Key=Name,Value=East-West-Peering}]' \
    --query 'VpcPeeringConnection.VpcPeeringConnectionId' \
    --output text)

# Accept peering connection (in us-west-2)
aws ec2 accept-vpc-peering-connection \
    --vpc-peering-connection-id $PEERING_ID \
    --region us-west-2

# Add routes in us-east-1 route tables
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 10.1.0.0/16 \
    --vpc-peering-connection-id $PEERING_ID

# Add routes in us-west-2 route tables
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_WEST \
    --destination-cidr-block 10.0.0.0/16 \
    --vpc-peering-connection-id $PEERING_ID \
    --region us-west-2

# Update security groups to allow traffic from peered VPC
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --cidr 10.1.0.0/16
```
### Atelier 3 : Configuration de Transit Gateway

**Objectif :** Créer une architecture hub-and-spoke à l'aide de Transit Gateway pour plusieurs VPC.
```bash
# Create Transit Gateway
TGW_ID=$(aws ec2 create-transit-gateway \
    --description "Production Transit Gateway" \
    --options "AmazonSideAsn=64512,AutoAcceptSharedAttachments=enable,DefaultRouteTableAssociation=enable,DefaultRouteTablePropagation=enable,DnsSupport=enable,VpnEcmpSupport=enable" \
    --tag-specifications 'ResourceType=transit-gateway,Tags=[{Key=Name,Value=Production-TGW}]' \
    --query 'TransitGateway.TransitGatewayId' \
    --output text)

# Wait for Transit Gateway to become available
echo "Waiting for Transit Gateway..."
aws ec2 wait transit-gateway-available --transit-gateway-ids $TGW_ID

# Attach VPC 1 (Production)
TGW_ATTACH_1=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_1 \
    --subnet-ids $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=Production-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Attach VPC 2 (Development)
TGW_ATTACH_2=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_2 \
    --subnet-ids $DEV_SUBNET_1A $DEV_SUBNET_1B $DEV_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=Development-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Attach VPC 3 (Shared Services)
TGW_ATTACH_3=$(aws ec2 create-transit-gateway-vpc-attachment \
    --transit-gateway-id $TGW_ID \
    --vpc-id $VPC_ID_3 \
    --subnet-ids $SHARED_SUBNET_1A $SHARED_SUBNET_1B $SHARED_SUBNET_1C \
    --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=SharedServices-VPC-Attachment}]' \
    --query 'TransitGatewayVpcAttachment.TransitGatewayAttachmentId' \
    --output text)

# Create custom route tables for traffic isolation
PROD_TGW_RT=$(aws ec2 create-transit-gateway-route-table \
    --transit-gateway-id $TGW_ID \
    --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=Production-TGW-RT}]' \
    --query 'TransitGatewayRouteTable.TransitGatewayRouteTableId' \
    --output text)

DEV_TGW_RT=$(aws ec2 create-transit-gateway-route-table \
    --transit-gateway-id $TGW_ID \
    --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=Development-TGW-RT}]' \
    --query 'TransitGatewayRouteTable.TransitGatewayRouteTableId' \
    --output text)

# Associate attachments with route tables
aws ec2 associate-transit-gateway-route-table \
    --transit-gateway-route-table-id $PROD_TGW_RT \
    --transit-gateway-attachment-id $TGW_ATTACH_1

aws ec2 associate-transit-gateway-route-table \
    --transit-gateway-route-table-id $DEV_TGW_RT \
    --transit-gateway-attachment-id $TGW_ATTACH_2

# Add routes in VPC route tables to Transit Gateway
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 10.2.0.0/16 \
    --transit-gateway-id $TGW_ID  # Route to shared services VPC

echo "Transit Gateway setup complete!"
```
### Atelier 4 : Activation des journaux de flux VPC

**Objectif :** Activer la journalisation complète du trafic réseau pour l'analyse de la sécurité.
```bash
# Create CloudWatch Log Group
aws logs create-log-group --log-group-name /aws/vpc/flowlogs/production

# Create IAM role for Flow Logs
cat > flow-logs-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "vpc-flow-logs.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

FLOW_LOGS_ROLE=$(aws iam create-role \
    --role-name VPCFlowLogsRole \
    --assume-role-policy-document file://flow-logs-trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach policy
cat > flow-logs-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ],
    "Resource": "*"
  }]
}
EOF

aws iam put-role-policy \
    --role-name VPCFlowLogsRole \
    --policy-name VPCFlowLogsPolicy \
    --policy-document file://flow-logs-policy.json

# Enable Flow Logs for VPC
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-group-name /aws/vpc/flowlogs/production \
    --deliver-logs-permission-arn $FLOW_LOGS_ROLE

# Alternative: Flow Logs to S3 (more cost-effective for long-term storage)
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type s3 \
    --log-destination arn:aws:s3:::my-flow-logs-bucket

# Query Flow Logs with CloudWatch Logs Insights
# Use this query to find top talkers
cat > flow-logs-query.txt <<'EOF'
fields @timestamp, srcAddr, dstAddr, bytes
| stats sum(bytes) as totalBytes by srcAddr
| sort totalBytes desc
| limit 10
EOF
```
### Atelier 5 : Modèle CloudFormation pour un VPC complet

**Objectif :** Automatisez la création de VPC avec Infrastructure as Code.
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production 3-Tier VPC with NAT Gateways and VPC Endpoints'

Parameters:
  EnvironmentName:
    Description: Environment name prefix
    Type: String
    Default: Production
  
  VpcCIDR:
    Description: CIDR block for VPC
    Type: String
    Default: 10.0.0.0/16
  
  EnableNATGateway:
    Description: Enable NAT Gateway for private subnets
    Type: String
    Default: 'true'
    AllowedValues: ['true', 'false']

Conditions:
  CreateNATGateway: !Equals [!Ref EnableNATGateway, 'true']

Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCIDR
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-VPC'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-IGW'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [0, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-1'
        - Key: Tier
          Value: Public

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [1, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-2'
        - Key: Tier
          Value: Public

  PublicSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [2, !Cidr [!Ref VpcCIDR, 12, 8]]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-Subnet-3'
        - Key: Tier
          Value: Public

  # Application Subnets
  AppSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [3, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-1'
        - Key: Tier
          Value: Application

  AppSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [4, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-2'
        - Key: Tier
          Value: Application

  AppSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [5, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-App-Subnet-3'
        - Key: Tier
          Value: Application

  # Database Subnets
  DBSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [0, !GetAZs '']
      CidrBlock: !Select [6, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-1'
        - Key: Tier
          Value: Database

  DBSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [1, !GetAZs '']
      CidrBlock: !Select [7, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-2'
        - Key: Tier
          Value: Database

  DBSubnet3:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      AvailabilityZone: !Select [2, !GetAZs '']
      CidrBlock: !Select [8, !Cidr [!Ref VpcCIDR, 12, 8]]
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-DB-Subnet-3'
        - Key: Tier
          Value: Database

  # NAT Gateways
  NATGateway1EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway2EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway3EIP:
    Type: AWS::EC2::EIP
    Condition: CreateNATGateway
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway1:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-1'

  NATGateway2:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway2EIP.AllocationId
      SubnetId: !Ref PublicSubnet2
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-2'

  NATGateway3:
    Type: AWS::EC2::NatGateway
    Condition: CreateNATGateway
    Properties:
      AllocationId: !GetAtt NATGateway3EIP.AllocationId
      SubnetId: !Ref PublicSubnet3
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-NAT-GW-3'

  # Public Route Table
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Public-RT'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet2

  PublicSubnet3RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet3

  # Private Route Tables
  PrivateRouteTable1:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${EnvironmentName}-Private-RT-1'

  DefaultPrivateRoute1:
    Type: AWS::EC2::Route
    Condition: CreateNATGateway
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NATGateway1

  AppSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref AppSubnet1

  DBSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PrivateRouteTable1
      SubnetId: !Ref DBSubnet1

  # VPC Endpoints
  S3Endpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.s3'
      RouteTableIds:
        - !Ref PrivateRouteTable1

  DynamoDBEndpoint:
    Type: AWS::EC2::VPCEndpoint
    Properties:
      VpcId: !Ref VPC
      ServiceName: !Sub 'com.amazonaws.${AWS::Region}.dynamodb'
      RouteTableIds:
        - !Ref PrivateRouteTable1

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${EnvironmentName}-VPC-ID'

  PublicSubnets:
    Description: List of public subnet IDs
    Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2, !Ref PublicSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-Public-Subnets'

  AppSubnets:
    Description: List of application subnet IDs
    Value: !Join [',', [!Ref AppSubnet1, !Ref AppSubnet2, !Ref AppSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-App-Subnets'

  DBSubnets:
    Description: List of database subnet IDs
    Value: !Join [',', [!Ref DBSubnet1, !Ref DBSubnet2, !Ref DBSubnet3]]
    Export:
      Name: !Sub '${EnvironmentName}-DB-Subnets'
```
Déployez le modèle :
```bash
aws cloudformation create-stack \
    --stack-name production-vpc \
    --template-body file://vpc-template.yaml \
    --parameters ParameterKey=EnvironmentName,ParameterValue=Production

# Monitor stack creation
aws cloudformation wait stack-create-complete --stack-name production-vpc

# Get outputs
aws cloudformation describe-stacks \
    --stack-name production-vpc \
    --query 'Stacks[0].Outputs' \
    --output table
```
## Connaissances au niveau de la production

### Architecture Hub-and-Spoke avec Transit Gateway

Pour les environnements d'entreprise dotés de plusieurs VPC et d'une connectivité hybride, une architecture en étoile offre une gestion centralisée et un routage simplifié.

**Composants architecturaux :**
```
                    Transit Gateway
                          |
        +-----------------+------------------+
        |                 |                  |
    Shared Services     Production        Development
        VPC               VPC                VPC
        |                                     |
    (DNS, AD,          (Applications)      (Test Env)
     Monitoring)                             
        |                                     
   VPN/Direct Connect
        |
   On-Premises
```
**Stratégie de mise en œuvre :**
```python
#!/usr/bin/env python3
# transit_gateway_setup.py

import boto3

ec2 = boto3.client('ec2')

def create_hub_spoke_architecture():
    """Create Transit Gateway hub-and-spoke architecture"""
    
    # Create Transit Gateway
    tgw_response = ec2.create_transit_gateway(
        Description='Enterprise Transit Gateway',
        Options={
            'AmazonSideAsn': 64512,
            'AutoAcceptSharedAttachments': 'enable',
            'DefaultRouteTableAssociation': 'disable',  # Custom route tables
            'DefaultRouteTablePropagation': 'disable',
            'VpnEcmpSupport': 'enable',
            'DnsSupport': 'enable'
        },
        TagSpecifications=[{
            'ResourceType': 'transit-gateway',
            'Tags': [{'Key': 'Name', 'Value': 'Enterprise-TGW'}]
        }]
    )
    
    tgw_id = tgw_response['TransitGateway']['TransitGatewayId']
    print(f"Created Transit Gateway: {tgw_id}")
    
    # Wait for Transit Gateway to become available
    waiter = ec2.get_waiter('transit_gateway_available')
    waiter.wait(TransitGatewayIds=[tgw_id])
    
    # Create route tables for traffic segmentation
    route_tables = {}
    
    for rt_name in ['Production', 'Development', 'SharedServices']:
        rt_response = ec2.create_transit_gateway_route_table(
            TransitGatewayId=tgw_id,
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-route-table',
                'Tags': [{'Key': 'Name', 'Value': f'{rt_name}-TGW-RT'}]
            }]
        )
        route_tables[rt_name] = rt_response['TransitGatewayRouteTable']['TransitGatewayRouteTableId']
        print(f"Created route table: {rt_name}")
    
    return tgw_id, route_tables

def attach_vpcs_to_tgw(tgw_id, route_tables, vpcs):
    """Attach VPCs to Transit Gateway with appropriate route table associations"""
    
    attachments = {}
    
    for vpc_name, vpc_config in vpcs.items():
        # Create attachment
        attach_response = ec2.create_transit_gateway_vpc_attachment(
            TransitGatewayId=tgw_id,
            VpcId=vpc_config['vpc_id'],
            SubnetIds=vpc_config['subnet_ids'],
            Options={'DnsSupport': 'enable'},
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-attachment',
                'Tags': [{'Key': 'Name', 'Value': f'{vpc_name}-TGW-Attachment'}]
            }]
        )
        
        attachment_id = attach_response['TransitGatewayVpcAttachment']['TransitGatewayAttachmentId']
        attachments[vpc_name] = attachment_id
        
        # Associate with appropriate route table
        rt_id = route_tables[vpc_config['environment']]
        ec2.associate_transit_gateway_route_table(
            TransitGatewayRouteTableId=rt_id,
            TransitGatewayAttachmentId=attachment_id
        )
        
        print(f"Attached {vpc_name} to Transit Gateway")
    
    return attachments

def configure_routing_policies(route_tables, attachments):
    """Configure routing policies for traffic segmentation"""
    
    # Production can access Shared Services but not Development
    ec2.create_transit_gateway_route(
        DestinationCidrBlock='10.2.0.0/16',  # Shared Services CIDR
        TransitGatewayRouteTableId=route_tables['Production'],
        TransitGatewayAttachmentId=attachments['SharedServices']
    )
    
    # Development can access Shared Services but not Production
    ec2.create_transit_gateway_route(
        DestinationCidrBlock='10.2.0.0/16',
        TransitGatewayRouteTableId=route_tables['Development'],
        TransitGatewayAttachmentId=attachments['SharedServices']
    )
    
    # Shared Services can access all
    for cidr, attachment in [('10.0.0.0/16', attachments['Production']),
                              ('10.1.0.0/16', attachments['Development'])]:
        ec2.create_transit_gateway_route(
            DestinationCidrBlock=cidr,
            TransitGatewayRouteTableId=route_tables['SharedServices'],
            TransitGatewayAttachmentId=attachment
        )
    
    print("Routing policies configured")

# Example usage
vpcs = {
    'Production': {
        'vpc_id': 'vpc-prod123',
        'subnet_ids': ['subnet-prod-1a', 'subnet-prod-1b', 'subnet-prod-1c'],
        'environment': 'Production'
    },
    'Development': {
        'vpc_id': 'vpc-dev456',
        'subnet_ids': ['subnet-dev-1a', 'subnet-dev-1b', 'subnet-dev-1c'],
        'environment': 'Development'
    },
    'SharedServices': {
        'vpc_id': 'vpc-shared789',
        'subnet_ids': ['subnet-shared-1a', 'subnet-shared-1b', 'subnet-shared-1c'],
        'environment': 'SharedServices'
    }
}

tgw_id, route_tables = create_hub_spoke_architecture()
attachments = attach_vpcs_to_tgw(tgw_id, route_tables, vpcs)
configure_routing_policies(route_tables, attachments)
```
### Modèles de connectivité hybride

La connexion des VPC AWS aux réseaux sur site nécessite une planification minutieuse de la bande passante, de la redondance et du routage.

**Modèle 1 : VPN site à site AWS**

**Caractéristiques :**

- Utilise Internet pour la connectivité
- Cryptage IPsec
- Jusqu'à 1,25 Gbit/s par tunnel
- Rentable pour les petites charges de travail

**Mise en œuvre :**
```bash
# Create Customer Gateway (on-premises side)
CGW_ID=$(aws ec2 create-customer-gateway \
    --type ipsec.1 \
    --public-ip 203.0.113.1 \
    --bgp-asn 65000 \
    --tag-specifications 'ResourceType=customer-gateway,Tags=[{Key=Name,Value=OnPrem-CGW}]' \
    --query 'CustomerGateway.CustomerGatewayId' \
    --output text)

# Create Virtual Private Gateway
VGW_ID=$(aws ec2 create-vpn-gateway \
    --type ipsec.1 \
    --amazon-side-asn 64512 \
    --tag-specifications 'ResourceType=vpn-gateway,Tags=[{Key=Name,Value=Production-VGW}]' \
    --query 'VpnGateway.VpnGatewayId' \
    --output text)

# Attach VGW to VPC
aws ec2 attach-vpn-gateway \
    --vpc-id $VPC_ID \
    --vpn-gateway-id $VGW_ID

# Create VPN Connection
VPN_ID=$(aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --customer-gateway-id $CGW_ID \
    --vpn-gateway-id $VGW_ID \
    --options TunnelOptions='[{TunnelInsideCidr=169.254.10.0/30,PreSharedKey=MySecurePreSharedKey123},{TunnelInsideCidr=169.254.11.0/30,PreSharedKey=MySecurePreSharedKey456}]' \
    --tag-specifications 'ResourceType=vpn-connection,Tags=[{Key=Name,Value=Production-VPN}]' \
    --query 'VpnConnection.VpnConnectionId' \
    --output text)

# Enable route propagation
aws ec2 enable-vgw-route-propagation \
    --route-table-id $PRIVATE_RT \
    --gateway-id $VGW_ID
```
**Modèle 2 : AWS Direct Connect**

**Caractéristiques :**

- Connexion réseau dédiée
- 1 Gbps ou 10 Gbps (dédié) ou 50 Mbps - 10 Gbps (hébergé)
- Performances réseau constantes
- Coûts de transfert de données réduits
- Coût initial plus élevé

**Quand utiliser Direct Connect :**

- Transferts de données volumineux (>1 To/mois)
- Exigences constantes de faible latence
- Exigences de conformité (pas d'Internet public)
- Applications critiques

**Connexion directe + VPN (DX crypté) :**

Pour le chiffrement via Direct Connect :
```bash
# Create Transit Virtual Interface on Direct Connect
# Then create VPN over the private VIF

# Create VPN connection over Direct Connect
VPN_DX_ID=$(aws ec2 create-vpn-connection \
    --type ipsec.1 \
    --customer-gateway-id $CGW_ID \
    --transit-gateway-id $TGW_ID \
    --options '{"EnableAcceleration":false,"StaticRoutesOnly":false,"TunnelInsideIpVersion":"ipv4"}' \
    --tag-specifications 'ResourceType=vpn-connection,Tags=[{Key=Name,Value=DX-VPN}]' \
    --query 'VpnConnection.VpnConnectionId' \
    --output text)
```
### Modèles de sécurité avancés

**Modèle 1 : Contrôle de sortie centralisé**

Acheminez tout le trafic Internet via un VPC de sécurité pour inspection :
```
Production VPC → Transit Gateway → Security VPC (Firewall) → Internet
Development VPC → Transit Gateway → Security VPC (Firewall) → Internet
```
**Mise en œuvre:**
```yaml
# Security VPC with inspection appliances
SecurityVPC:
  CIDR: 10.255.0.0/16
  Subnets:
    - Inspection-AZ1: 10.255.1.0/24
    - Inspection-AZ2: 10.255.2.0/24
  Appliances:
    - Palo Alto Networks VM-Series
    - Or AWS Network Firewall

# Transit Gateway routing
Production-RT:
  Routes:
    - 0.0.0.0/0 → Security VPC attachment

Security-VPC-RT:
  Routes:
    - 10.0.0.0/8 → VPC attachments (return traffic)
    - 0.0.0.0/0 → Internet Gateway (after inspection)
```
**Modèle 2 : PrivateLink pour l'exposition au service**

Exposez les services en privé sans peering VPC :
```bash
# Create Network Load Balancer
NLB_ARN=$(aws elbv2 create-load-balancer \
    --name internal-service-nlb \
    --type network \
    --scheme internal \
    --subnets $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)

# Create VPC Endpoint Service
SERVICE_NAME=$(aws ec2 create-vpc-endpoint-service-configuration \
    --network-load-balancer-arns $NLB_ARN \
    --acceptance-required \
    --query 'ServiceConfiguration.ServiceName' \
    --output text)

# In consumer VPC, create interface endpoint
aws ec2 create-vpc-endpoint \
    --vpc-id $CONSUMER_VPC_ID \
    --service-name $SERVICE_NAME \
    --vpc-endpoint-type Interface \
    --subnet-ids $CONSUMER_SUBNET_1A $CONSUMER_SUBNET_1B \
    --security-group-ids $CONSUMER_SG
```
### Surveillance et dépannage du réseau

**Configuration de surveillance complète :**
```python
#!/usr/bin/env python3
# network_monitoring.py

import boto3
from datetime import datetime, timedelta

cloudwatch = boto3.client('cloudwatch')
ec2 = boto3.client('ec2')

def create_network_dashboard(vpc_id):
    """Create CloudWatch dashboard for network monitoring"""
    
    dashboard_body = {
        "widgets": [
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/NATGateway", "BytesInFromDestination", {"stat": "Sum"}],
                        [".", "BytesInFromSource", {"stat": "Sum"}],
                        [".", "BytesOutToDestination", {"stat": "Sum"}],
                        [".", "BytesOutToSource", {"stat": "Sum"}]
                    ],
                    "period": 300,
                    "stat": "Sum",
                    "region": "us-east-1",
                    "title": "NAT Gateway Traffic",
                    "yAxis": {"left": {"label": "Bytes"}}
                }
            },
            {
                "type": "metric",
                "properties": {
                    "metrics": [
                        ["AWS/VPN", "TunnelState", {"stat": "Maximum"}],
                        [".", "TunnelDataIn", {"stat": "Sum"}],
                        [".", "TunnelDataOut", {"stat": "Sum"}]
                    ],
                    "period": 60,
                    "stat": "Maximum",
                    "region": "us-east-1",
                    "title": "VPN Health and Traffic"
                }
            },
            {
                "type": "log",
                "properties": {
                    "query": "SOURCE '/aws/vpc/flowlogs'\n| fields @timestamp, srcAddr, dstAddr, action\n| filter action = 'REJECT'\n| stats count() by srcAddr\n| sort count desc\n| limit 10",
                    "region": "us-east-1",
                    "title": "Top Rejected Source IPs"
                }
            }
        ]
    }
    
    cloudwatch.put_dashboard(
        DashboardName=f'Network-Monitoring-{vpc_id}',
        DashboardBody=str(dashboard_body)
    )

def create_network_alarms(nat_gateway_id, vpn_connection_id):
    """Create CloudWatch alarms for network issues"""
    
    # NAT Gateway packet drop alarm
    cloudwatch.put_metric_alarm(
        AlarmName='NAT-Gateway-PacketDrop',
        ComparisonOperator='GreaterThanThreshold',
        EvaluationPeriods=2,
        MetricName='PacketsDropCount',
        Namespace='AWS/NATGateway',
        Period=300,
        Statistic='Sum',
        Threshold=100,
        ActionsEnabled=True,
        AlarmActions=['arn:aws:sns:us-east-1:123456789012:network-alerts'],
        Dimensions=[{'Name': 'NatGatewayId', 'Value': nat_gateway_id}]
    )
    
    # VPN tunnel down alarm
    cloudwatch.put_metric_alarm(
        AlarmName='VPN-Tunnel-Down',
        ComparisonOperator='LessThanThreshold',
        EvaluationPeriods=2,
        MetricName='TunnelState',
        Namespace='AWS/VPN',
        Period=60,
        Statistic='Maximum',
        Threshold=1,
        ActionsEnabled=True,
        AlarmActions=['arn:aws:sns:us-east-1:123456789012:critical-alerts'],
        Dimensions=[{'Name': 'VpnId', 'Value': vpn_connection_id}]
    )

def analyze_flow_logs():
    """Analyze VPC Flow Logs for security and performance insights"""
    
    logs = boto3.client('logs')
    
    query = """
    fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, protocol, bytes, action
    | filter action = "REJECT"
    | stats count(*) as rejectionCount, sum(bytes) as totalBytes by srcAddr, dstAddr, dstPort
    | sort rejectionCount desc
    | limit 20
    """
    
    response = logs.start_query(
        logGroupName='/aws/vpc/flowlogs/production',
        startTime=int((datetime.now() - timedelta(hours=1)).timestamp()),
        endTime=int(datetime.now().timestamp()),
        queryString=query
    )
    
    query_id = response['queryId']
    
    # Wait for query to complete
    import time
    while True:
        result = logs.get_query_results(queryId=query_id)
        if result['status'] == 'Complete':
            return result['results']
        time.sleep(1)
```
### Stratégies d'optimisation des coûts

**Réduction des coûts de la passerelle NAT :**
```python
def calculate_nat_gateway_savings():
    """Calculate potential savings from NAT Gateway optimization"""
    
    # Scenario: 3 NAT Gateways processing 10 TB/month each
    nat_hourly_cost = 0.045  # per hour per NAT Gateway
    nat_data_cost = 0.045    # per GB processed
    
    # Current cost (3 NAT Gateways)
    hours_per_month = 730
    data_per_month_gb = 10 * 1024  # 10 TB
    
    current_cost = (3 * nat_hourly_cost * hours_per_month) + \
                   (data_per_month_gb * nat_data_cost * 3)
    
    # Optimized: 1 NAT Gateway + VPC Endpoints for AWS services
    vpc_endpoint_hourly = 0.01
    vpc_endpoint_data = 0.01
    
    # Assume 70% traffic goes to AWS services (S3, DynamoDB)
    aws_service_traffic = data_per_month_gb * 0.7
    internet_traffic = data_per_month_gb * 0.3
    
    optimized_cost = (nat_hourly_cost * hours_per_month) + \
                     (internet_traffic * nat_data_cost) + \
                     (vpc_endpoint_hourly * hours_per_month * 2) + \
                     (aws_service_traffic * vpc_endpoint_data)
    
    savings = current_cost - optimized_cost
    savings_percent = (savings / current_cost) * 100
    
    print(f"Current monthly cost: ${current_cost:,.2f}")
    print(f"Optimized monthly cost: ${optimized_cost:,.2f}")
    print(f"Monthly savings: ${savings:,.2f} ({savings_percent:.1f}%)")
    
    return savings

# Example output:
# Current monthly cost: $1,477.05
# Optimized monthly cost: $506.73
# Monthly savings: $970.32 (65.7%)
```
**Optimisation des coûts de transfert de données :**
```bash
# Use VPC Endpoints to avoid NAT Gateway charges for AWS services
aws ec2 create-vpc-endpoint \
    --vpc-id $VPC_ID \
    --service-name com.amazonaws.us-east-1.s3 \
    --route-table-ids $PRIVATE_RT_1A $PRIVATE_RT_1B $PRIVATE_RT_1C

# For services without Gateway Endpoints, use Interface Endpoints
for service in ec2 ec2messages ssm ssmmessages logs; do
    aws ec2 create-vpc-endpoint \
        --vpc-id $VPC_ID \
        --vpc-endpoint-type Interface \
        --service-name com.amazonaws.us-east-1.$service \
        --subnet-ids $APP_SUBNET_1A $APP_SUBNET_1B $APP_SUBNET_1C \
        --security-group-ids $ENDPOINT_SG
done
```
## Conseils \& Bonnes pratiques

### Stratégies de planification CIDR

**Conseil 1 : Planifiez votre croissance**

Dimensionnez toujours votre VPC plus grand que vos besoins immédiats :
```
Bad: /24 VPC (256 IPs) for "small" application
     - Runs out of IPs quickly
     - Difficult to expand

Good: /16 VPC (65,536 IPs)
      - Room for growth
      - Can create many subnets
      - Future-proof
```
**Astuce 2 : Utilisez des blocs CIDR qui ne se chevauchent pas**

Tenir à jour une feuille de calcul d'allocation CIDR :
```
10.0.0.0/16   - Production VPC (us-east-1)
10.1.0.0/16   - Development VPC (us-east-1)
10.2.0.0/16   - Shared Services VPC (us-east-1)
10.10.0.0/16  - Production VPC (eu-west-1)
10.11.0.0/16  - Development VPC (eu-west-1)
172.16.0.0/12 - Reserved for on-premises
192.168.0.0/16 - Reserved for future use
```
**Astuce 3 : Numérotation cohérente des sous-réseaux**

Utilisez des modèles cohérents sur tous les VPC :
```
x.x.1.0/24   - Public subnet AZ-A
x.x.2.0/24   - Public subnet AZ-B
x.x.3.0/24   - Public subnet AZ-C
x.x.11.0/24  - App subnet AZ-A
x.x.12.0/24  - App subnet AZ-B
x.x.13.0/24  - App subnet AZ-C
x.x.21.0/24  - DB subnet AZ-A
x.x.22.0/24  - DB subnet AZ-B
x.x.23.0/24  - DB subnet AZ-C
x.x.100.0/22 - Reserved for expansion
```
### Bonnes pratiques en matière de segmentation de réseau

**Astuce 4 : Mettre en œuvre une défense en profondeur**

Contrôles de sécurité des couches :
```
1. Network ACLs (Subnet level, stateless)
2. Security Groups (Instance level, stateful)
3. Host-based firewall (OS level)
4. Application-level authorization
```
**Astuce 5 : Utilisez le chaînage de groupes de sécurité**

Groupes de sécurité de référence au lieu d’adresses IP :
```bash
# Web tier can only talk to app tier
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# App tier can only talk to database tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG
```
Cela s'adapte automatiquement à mesure que des instances sont ajoutées/supprimées.

**Astuce 6 : Réduisez les sous-réseaux publics**

Placez uniquement les ressources qui ont absolument besoin d'adresses IP publiques dans des sous-réseaux publics :

- Equilibreurs de charge
- Passerelles NAT
- Hôtes du Bastion
- Points de terminaison VPN

Tout le reste doit être dans des sous-réseaux privés.

### Conseils pour la haute disponibilité

**Astuce 7 : Déployez des passerelles NAT dans chaque zone de disponibilité**

Pour une véritable haute disponibilité :
```bash
# One NAT Gateway per AZ
NAT-GW-1A in Public-Subnet-1A → Routes for AZ-A private subnets
NAT-GW-1B in Public-Subnet-1B → Routes for AZ-B private subnets
NAT-GW-1C in Public-Subnet-1C → Routes for AZ-C private subnets
```
Cela évite les frais de transfert de données entre zones de disponibilité et élimine les points de défaillance uniques.

**Astuce 8 : Utilisez les adresses IP Elastic de manière stratégique**

Allouer des adresses IP élastiques pour :

- Passerelles NAT (obligatoires)
- Hôtes Bastion (accès cohérent)
- Ressources nécessitant une liste blanche IP

N'utilisez pas les EIP pour :

- Ressources mises à l'échelle automatiquement (utilisez des équilibreurs de charge)
- Ressources derrière NAT
- Services uniquement internes

**Astuce 9 : Testez les scénarios de basculement**

Testez régulièrement AZ et les pannes de composants :
```bash
# Simulate NAT Gateway failure
aws ec2 delete-nat-gateway --nat-gateway-id $NAT_GW_1A

# Verify traffic fails over to other AZs
# Recreate NAT Gateway
```
### Conseils d'optimisation des performances

**Astuce 10 : Utilisez un réseau amélioré**

Activez une mise en réseau améliorée pour de meilleures performances :

- ENA (Elastic Network Adapter) - jusqu'à 100 Gbit/s
- Nécessite les types d'instances pris en charge (C5, M5, R5, etc.)
- Pas de frais supplémentaires

**Astuce 11 : Tirez parti des groupes de placement**

Pour les applications à faible latence et à haut débit :
```bash
# Cluster placement group
aws ec2 create-placement-group \
    --group-name compute-cluster \
    --strategy cluster

# Launch instances in placement group
aws ec2 run-instances \
    --placement GroupName=compute-cluster \
    --instance-type c5n.18xlarge \
    --count 10
```
**Astuce 12 : Optimisez les paramètres MTU**

Utilisez des trames jumbo (MTU 9001) dans VPC :
```bash
# Check current MTU
ip link show eth0

# Set MTU to 9001 (within VPC)
sudo ip link set dev eth0 mtu 9001

# For internet traffic, use 1500
```
### Conseils de surveillance et de dépannage

**Astuce 13 : Activez les journaux de flux VPC à partir du premier jour**

N'attendez pas un incident de sécurité :
```bash
# Enable Flow Logs immediately after VPC creation
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids $VPC_ID \
    --traffic-type ALL \
    --log-destination-type s3 \
    --log-destination arn:aws:s3:::vpc-flow-logs-bucket
```
**Astuce 14 : Utilisez l'analyseur d'accessibilité**

Testez la connectivité avant le déploiement :
```bash
# Test if EC2 can reach RDS
aws ec2 create-network-insights-path \
    --source $EC2_ENI \
    --destination $RDS_ENI \
    --protocol tcp \
    --destination-port 3306

aws ec2 start-network-insights-analysis \
    --network-insights-path-id $PATH_ID
```
**Astuce 15 : Surveillez les métriques de la passerelle NAT**

Configurez des alarmes pour les problèmes de passerelle NAT :
```bash
# Alert on connection tracking errors
aws cloudwatch put-metric-alarm \
    --alarm-name NAT-Connection-Tracking-Errors \
    --metric-name ErrorPortAllocation \
    --namespace AWS/NATGateway \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold
```
### Conseils de sécurité

**Astuce 16 : implémentez le moindre privilège dans les groupes de sécurité**

N'utilisez pas 0.0.0.0/0 sauf en cas d'absolue nécessité :
```bash
# Bad
--cidr 0.0.0.0/0

# Good - specific CIDR
--cidr 203.0.113.0/24

# Better - reference security group
--source-group $TRUSTED_SG
```
**Astuce 17 : Audits réguliers des groupes de sécurité**

Recherchez et supprimez les groupes de sécurité inutilisés :
```python
def audit_security_groups():
    ec2 = boto3.client('ec2')
    
    # Get all security groups
    sgs = ec2.describe_security_groups()['SecurityGroups']
    
    # Get all network interfaces
    enis = ec2.describe_network_interfaces()['NetworkInterfaces']
    
    # Find security groups in use
    used_sgs = set()
    for eni in enis:
        for sg in eni['Groups']:
            used_sgs.add(sg['GroupId'])
    
    # Find unused security groups
    unused_sgs = []
    for sg in sgs:
        if sg['GroupId'] not in used_sgs and sg['GroupName'] != 'default':
            unused_sgs.append({
                'GroupId': sg['GroupId'],
                'GroupName': sg['GroupName'],
                'VpcId': sg['VpcId']
            })
    
    print(f"Found {len(unused_sgs)} unused security groups")
    return unused_sgs
```
**Astuce 18 : Utilisez AWS Network Firewall pour une inspection avancée**

Pour l’inspection dynamique des paquets :
```bash
# Create Network Firewall
aws network-firewall create-firewall \
    --firewall-name production-firewall \
    --firewall-policy-arn $POLICY_ARN \
    --vpc-id $VPC_ID \
    --subnet-mappings SubnetId=$FIREWALL_SUBNET_1A SubnetId=$FIREWALL_SUBNET_1B
```
### Conseils d'optimisation des coûts

**Astuce 19 : Passerelles NAT de bonne taille**

Analysez les modèles de trafic :
```python
def analyze_nat_gateway_usage():
    cloudwatch = boto3.client('cloudwatch')
    
    response = cloudwatch.get_metric_statistics(
        Namespace='AWS/NATGateway',
        MetricName='BytesOutToDestination',
        Dimensions=[{'Name': 'NatGatewayId', 'Value': 'nat-xxxxx'}],
        StartTime=datetime.now() - timedelta(days=30),
        EndTime=datetime.now(),
        Period=86400,  # 1 day
        Statistics=['Sum']
    )
    
    # Analyze if NAT Gateway is underutilized
    # Consider consolidating multiple low-traffic NAT Gateways
```
**Astuce 20 : Utilisez les points de terminaison d'un VPC de manière agressive**

Libérez de la capacité de la passerelle NAT :
```bash
# Create endpoints for all supported services
SERVICES="s3 dynamodb ec2 ec2messages ssm ssmmessages logs sns sqs"

for service in $SERVICES; do
    aws ec2 create-vpc-endpoint \
        --vpc-id $VPC_ID \
        --service-name com.amazonaws.us-east-1.$service \
        --route-table-ids $PRIVATE_RTs \
        --security-group-ids $ENDPOINT_SG
done
```
## Pièges \& Remèdes

### Piège 1 : Dimensionnement inadéquat des blocs CIDR

**Problème :** Choisir un bloc CIDR trop petit (par exemple, /24 ou /28), ce qui entraîne un épuisement des adresses IP à mesure que l'application se développe.

**Pourquoi cela arrive :**

- Sous-estimer la croissance future
- Essayer de "conserver" les adresses IP
- Je ne comprends pas les mathématiques du sous-réseau
- Copier des exemples sans considération

**Impact :**

- Impossible d'ajouter plus de ressources
- Obligé de créer un nouveau VPC et de migrer
- Architecture multi-VPC complexe
- Perte d'agilité et augmentation des coûts

**Exemple :**
```
Initial: VPC with /24 (256 IPs, 251 usable)
Subnets:
- Public: 10.0.0.0/26 (64 IPs, 59 usable)
- Private: 10.0.0.64/26 (64 IPs, 59 usable)
- Database: 10.0.0.128/26 (64 IPs, 59 usable)

Problem: Only 59 usable IPs per subnet
- Auto Scaling can't add instances
- Can't deploy new services
- Out of IPs after modest growth
```
**Remède :**

**Étape 1 : Audit de l'utilisation actuelle de l'adresse IP**
```bash
# Count running instances per subnet
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[*].Instances[*].[SubnetId]' \
    --output text | sort | uniq -c

# Check available IPs per subnet
aws ec2 describe-subnets \
    --subnet-ids $SUBNET_ID \
    --query 'Subnets[*].[SubnetId,CidrBlock,AvailableIpAddressCount]' \
    --output table
```
**Étape 2 : Ajouter un bloc CIDR secondaire**

Si vous disposez d'un VPC existant qui manque d'adresses IP :
```bash
# Add secondary CIDR block
aws ec2 associate-vpc-cidr-block \
    --vpc-id $VPC_ID \
    --cidr-block 10.1.0.0/16

# Wait for association
aws ec2 wait vpc-available --vpc-ids $VPC_ID

# Create new subnets in secondary CIDR
aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block 10.1.1.0/24 \
    --availability-zone us-east-1a
```
**Étape 3 : Concevoir un VPC correctement dimensionné**

Pour les nouveaux VPC, utilisez un dimensionnement approprié :
```bash
# Create VPC with /16 (65,536 IPs)
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block 10.0.0.0/16 \
    --query 'Vpc.VpcId' \
    --output text)

# Create subnets with /20 or /24
# /20 = 4,096 IPs (4,091 usable) - Good for auto-scaling
# /24 = 256 IPs (251 usable) - Good for smaller subnets

# Public subnets (/24)
10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24

# Application subnets (/20)
10.0.16.0/20, 10.0.32.0/20, 10.0.48.0/20

# Database subnets (/24)
10.0.4.0/24, 10.0.5.0/24, 10.0.6.0/24

# Reserve for future
10.1.0.0/16, 10.2.0.0/16, etc.
```
**Étape 4 : Outil de planification CIDR**
```python
#!/usr/bin/env python3
import ipaddress

def plan_vpc_cidr(vpc_cidr, subnet_plans):
    """Plan VPC CIDR blocks and subnets"""
    
    vpc_network = ipaddress.IPv4Network(vpc_cidr)
    print(f"VPC: {vpc_cidr}")
    print(f"Total IPs: {vpc_network.num_addresses}")
    print(f"Usable IPs: {vpc_network.num_addresses - 5}")  # AWS reserves 5
    print("\nSubnets:")
    
    current_network = vpc_network.network_address
    
    for name, prefix_len, count in subnet_plans:
        for i in range(count):
            subnet = ipaddress.IPv4Network(f"{current_network}/{prefix_len}")
            usable = subnet.num_addresses - 5
            print(f"  {name}-{i+1}: {subnet} ({usable} usable IPs)")
            current_network = subnet.network_address + subnet.num_addresses
    
    # Show remaining space
    used_ips = int(current_network) - int(vpc_network.network_address)
    remaining = vpc_network.num_addresses - used_ips
    print(f"\nRemaining IPs: {remaining} ({remaining/vpc_network.num_addresses*100:.1f}%)")

# Example usage
plan_vpc_cidr('10.0.0.0/16', [
    ('Public', 24, 3),      # 3 public subnets of /24
    ('Application', 20, 3), # 3 app subnets of /20
    ('Database', 24, 3),    # 3 db subnets of /24
])
```
**Prévention :**

- Utilisez toujours /16 pour le VPC CIDR sauf si vous avez des contraintes spécifiques
- Planifier 3 à 5 ans de croissance
- Documenter l'allocation CIDR dans le registre central
- Utilisez le calculateur CIDR avant de créer un VPC
- Réserver de l'espace pour les futurs sous-réseaux

***

### Piège 2 : Routage asymétrique avec plusieurs passerelles NAT

**Problème :** Ressources dans une zone de disponibilité utilisant la passerelle NAT dans une autre zone de disponibilité, entraînant des frais de transfert de données entre zones de disponibilité et des problèmes de routage potentiels.

**Pourquoi cela arrive :**

- Utilisation d'une table de routage unique pour tous les sous-réseaux privés
- Ne pas comprendre l'association des tables de routage
- L'optimisation des coûts a mal tourné (moins de passerelles NAT)
- Documentation d'architecture incomplète

**Impact :**

- Frais inattendus de transfert de données entre zones de zone (\$0,01/Go dans chaque direction)
- Disponibilité réduite en cas de panne de NAT Gateway AZ
- Dégradation des performances
- Consommation inutile de bande passante

**Exemple de problème :**
```
Architecture:
- App-Subnet-1A uses Private-RT
- App-Subnet-1B uses Private-RT
- App-Subnet-1C uses Private-RT

Private-RT routes:
- 0.0.0.0/0 → NAT-GW-1A (only in AZ-A)

Result:
- Instances in 1B cross AZ boundary to reach NAT-GW-1A
- Instances in 1C cross AZ boundary to reach NAT-GW-1A
- Unnecessary cross-AZ charges
```
**Remède :**

**Étape 1 : Identifier le routage asymétrique**
```
# List route tables and their associations
aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[*].[RouteTableId,Associations[*].SubnetId,Routes[?DestinationCidrBlock==`0.0.0.0/0`].NatGatewayId]' \
    --output table

# Check NAT Gateway locations
aws ec2 describe-nat-gateways \
    --filter "Name=vpc-id,Values=$VPC_ID" \
    --query 'NatGateways[*].[NatGatewayId,SubnetId,State]' \
    --output table
```
**Étape 2 : Implémenter des tables de routage spécifiques à AZ**
```
# Create separate route table for each AZ
PRIVATE_RT_1A=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1A}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

PRIVATE_RT_1B=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1B}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

PRIVATE_RT_1C=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=Private-RT-1C}]' \
    --query 'RouteTable.RouteTableId' \
    --output text)

# Add NAT Gateway routes (one per AZ)
aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1A \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1A

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1B \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1B

aws ec2 create-route \
    --route-table-id $PRIVATE_RT_1C \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NAT_GW_1C

# Associate subnets with AZ-specific route tables
aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1A \
    --subnet-id $APP_SUBNET_1A

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1B \
    --subnet-id $APP_SUBNET_1B

aws ec2 associate-route-table \
    --route-table-id $PRIVATE_RT_1C \
    --subnet-id $APP_SUBNET_1C
```
**Étape 3 : Vérifier la configuration du routage**
```
#!/usr/bin/env python3
# verify_routing.py

import boto3

def verify_nat_gateway_routing(vpc_id):
    """Verify NAT Gateway routing is AZ-aligned"""
    
    ec2 = boto3.client('ec2')
    
    # Get subnets
    subnets = ec2.describe_subnets(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )['Subnets']
    
    # Get NAT Gateways
    nat_gateways = ec2.describe_nat_gateways(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )['NatGateways']
    
    # Build NAT Gateway to AZ mapping
    nat_to_az = {}
    for nat in nat_gateways:
        subnet_id = nat['SubnetId']
        subnet = next(s for s in subnets if s['SubnetId'] == subnet_id)
        nat_to_az[nat['NatGatewayId']] = subnet['AvailabilityZone']
    
    # Check each private subnet
    issues = []
    
    for subnet in subnets:
        if subnet['MapPublicIpOnLaunch']:
            continue  # Skip public subnets
        
        subnet_id = subnet['SubnetId']
        subnet_az = subnet['AvailabilityZone']
        
        # Get route table
        route_tables = ec2.describe_route_tables(
            Filters=[
                {'Name': 'association.subnet-id', 'Values': [subnet_id]}
            ]
        )['RouteTables']
        
        if not route_tables:
            continue
        
        rt = route_tables
        
        # Find NAT Gateway route
        for route in rt['Routes']:
            if route.get('DestinationCidrBlock') == '0.0.0.0/0' and 'NatGatewayId' in route:
                nat_id = route['NatGatewayId']
                nat_az = nat_to_az.get(nat_id)
                
                if nat_az != subnet_az:
                    issues.append({
                        'subnet': subnet_id,
                        'subnet_az': subnet_az,
                        'nat_gateway': nat_id,
                        'nat_az': nat_az,
                        'route_table': rt['RouteTableId']
                    })
    
    if issues:
        print("⚠️  Asymmetric routing detected:")
        for issue in issues:
            print(f"  Subnet {issue['subnet']} (AZ: {issue['subnet_az']}) → "
                  f"NAT Gateway {issue['nat_gateway']} (AZ: {issue['nat_az']})")
    else:
        print("✓ All subnets have AZ-aligned NAT Gateway routing")
    
    return issues

# Usage
verify_nat_gateway_routing('vpc-12345678')
```
**Étape 4 : Calculer l'impact des coûts**
```
def calculate_cross_az_cost():
    """Calculate cost impact of cross-AZ NAT Gateway traffic"""
    
    # Assumptions
    instances_per_az = 50
    avg_traffic_per_instance_gb = 100  # per month
    cross_az_cost = 0.01  # per GB each direction
    
    # Scenario 1: Asymmetric routing (all use NAT in AZ-A)
    # AZ-B and AZ-C instances cross AZ boundary
    cross_az_instances = instances_per_az * 2  # AZ-B and AZ-C
    cross_az_traffic = cross_az_instances * avg_traffic_per_instance_gb
    asymmetric_cost = cross_az_traffic * cross_az_cost * 2  # in and out
    
    # Scenario 2: Proper routing (each AZ uses its own NAT)
    proper_cost = 0  # No cross-AZ traffic for NAT Gateway routing
    
    monthly_savings = asymmetric_cost - proper_cost
    annual_savings = monthly_savings * 12
    
    print(f"Asymmetric routing cost: ${asymmetric_cost:,.2f}/month")
    print(f"Proper routing cost: ${proper_cost:,.2f}/month")
    print(f"Monthly savings: ${monthly_savings:,.2f}")
    print(f"Annual savings: ${annual_savings:,.2f}")
    
    return monthly_savings

# Example output:
# Asymmetric routing cost: $200.00/month
# Proper routing cost: $0.00/month
# Monthly savings: $200.00
# Annual savings: $2,400.00
```
**Prévention :**

- Créez une passerelle NAT par AZ dès le début
- Utiliser des tables de routage distinctes par AZ
- Architecture de routage des documents
- Implémenter des scripts de vérification automatisés
- Surveiller les métriques de transfert de données inter-AZ

---

### Piège 3 : mauvaises configurations des groupes de sécurité

**Problème :** Règles de groupe de sécurité trop permissives (0.0.0.0/0 sur les ports sensibles), restrictions de sortie manquantes ou dépendances circulaires.

**Pourquoi cela arrive :**

- Raccourcis de test rapides qui deviennent permanents
- Compréhension insuffisante du comportement du groupe de sécurité
- Mentalité "Faites en sorte que ça marche"
- Exemples de copier-coller sans révision

**Impact :**

- Accès non autorisé aux ressources
- Failles de sécurité et exfiltration de données
- Violations de conformité
- Échec des audits de sécurité

**Erreurs courantes :**
```
# Mistake 1: SSH open to the world
--protocol tcp --port 22 --cidr 0.0.0.0/0

# Mistake 2: Database accessible from anywhere
--protocol tcp --port 3306 --cidr 0.0.0.0/0

# Mistake 3: Allowing all traffic
--protocol -1 --cidr 0.0.0.0/0

# Mistake 4: Ephemeral ports too broad
--protocol tcp --port-range 0-65535 --cidr 0.0.0.0/0
```
**Remède :**

**Étape 1 : Auditer les groupes de sécurité existants**
```
# Find security groups with 0.0.0.0/0 rules
aws ec2 describe-security-groups \
    --filters "Name=ip-permission.cidr,Values=0.0.0.0/0" \
    --query 'SecurityGroups[*].[GroupId,GroupName,IpPermissions[?contains(IpRanges[].CidrIp, `0.0.0.0/0`)]]' \
    --output json > overly-permissive-sgs.json

# Find security groups with sensitive ports open
aws ec2 describe-security-groups \
    --query 'SecurityGroups[?IpPermissions[?FromPort<=`22` && ToPort>=`22` && IpRanges[?CidrIp==`0.0.0.0/0`]]].[GroupId,GroupName]' \
    --output table
```
**Étape 2 : Script d'audit du groupe de sécurité**
```
#!/usr/bin/env python3
# audit_security_groups.py

import boto3
import json

def audit_security_groups():
    """Comprehensive security group audit"""
    
    ec2 = boto3.client('ec2')
    
    sgs = ec2.describe_security_groups()['SecurityGroups']
    
    findings = {
        'critical': [],
        'high': [],
        'medium': []
    }
    
    dangerous_ports = {
        22: 'SSH',
        3389: 'RDP',
        3306: 'MySQL',
        5432: 'PostgreSQL',
        27017: 'MongoDB',
        6379: 'Redis',
        9200: 'Elasticsearch'
    }
    
    for sg in sgs:
        sg_id = sg['GroupId']
        sg_name = sg['GroupName']
        
        # Skip default security group
        if sg_name == 'default':
            continue
        
        # Check inbound rules
        for permission in sg.get('IpPermissions', []):
            from_port = permission.get('FromPort', 0)
            to_port = permission.get('ToPort', 65535)
            
            # Check for 0.0.0.0/0
            for ip_range in permission.get('IpRanges', []):
                if ip_range.get('CidrIp') == '0.0.0.0/0':
                    
                    # Critical: Dangerous ports open to world
                    for port, service in dangerous_ports.items():
                        if from_port <= port <= to_port:
                            findings['critical'].append({
                                'sg_id': sg_id,
                                'sg_name': sg_name,
                                'issue': f'{service} (port {port}) open to 0.0.0.0/0',
                                'rule': permission
                            })
                    
                    # High: Non-standard ports open to world
                    if not (from_port == 80 or from_port == 443):
                        findings['high'].append({
                            'sg_id': sg_id,
                            'sg_name': sg_name,
                            'issue': f'Ports {from_port}-{to_port} open to 0.0.0.0/0',
                            'rule': permission
                        })
            
            # Check for overly broad CIDR blocks
            for ip_range in permission.get('IpRanges', []):
                cidr = ip_range.get('CidrIp', '')
                if cidr.endswith('/8') or cidr.endswith('/16'):
                    findings['medium'].append({
                        'sg_id': sg_id,
                        'sg_name': sg_name,
                        'issue': f'Overly broad CIDR: {cidr}',
                        'rule': permission
                    })
        
        # Check for security groups with no restrictions
        if not sg.get('IpPermissions'):
            # This is actually good - no inbound rules
            pass
    
    # Report findings
    print("=" * 60)
    print("SECURITY GROUP AUDIT REPORT")
    print("=" * 60)
    
    if findings['critical']:
        print(f"\n🚨 CRITICAL ({len(findings['critical'])} findings):")
        for f in findings['critical']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if findings['high']:
        print(f"\n⚠️  HIGH ({len(findings['high'])} findings):")
        for f in findings['high']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if findings['medium']:
        print(f"\n⚡ MEDIUM ({len(findings['medium'])} findings):")
        for f in findings['medium']:
            print(f"  {f['sg_id']} ({f['sg_name']}): {f['issue']}")
    
    if not any(findings.values()):
        print("\n✓ No security issues found")
    
    return findings

# Run audit
findings = audit_security_groups()
```
**Étape 3 : Corrigez les règles trop permissives**
```
# Remove dangerous rule
aws ec2 revoke-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# Replace with specific CIDR
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24  # Your office network

# Or reference another security group
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG
```
**Étape 4 : Mettre en œuvre les meilleures pratiques du groupe de sécurité**
```
# Bastion Host Security Group
BASTION_SG=$(aws ec2 create-security-group \
    --group-name bastion-sg \
    --description "Bastion host - SSH from office only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# SSH only from office
aws ec2 authorize-security-group-ingress \
    --group-id $BASTION_SG \
    --protocol tcp \
    --port 22 \
    --cidr 203.0.113.0/24

# Web Server Security Group
WEB_SG=$(aws ec2 create-security-group \
    --group-name web-tier-sg \
    --description "Web servers - HTTP/HTTPS only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# HTTP and HTTPS from anywhere (legitimate use case)
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# SSH only from bastion
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

# Application Server Security Group
APP_SG=$(aws ec2 create-security-group \
    --group-name app-tier-sg \
    --description "Application servers - internal only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Application port only from web tier
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 8080 \
    --source-group $WEB_SG

# SSH only from bastion
aws ec2 authorize-security-group-ingress \
    --group-id $APP_SG \
    --protocol tcp \
    --port 22 \
    --source-group $BASTION_SG

# Database Security Group
DB_SG=$(aws ec2 create-security-group \
    --group-name db-tier-sg \
    --description "Database - application tier only" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Database port only from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG \
    --protocol tcp \
    --port 3306 \
    --source-group $APP_SG

# No SSH access needed (managed service)
```
**Étape 5 : Mettre en œuvre la surveillance automatisée**
```
#!/usr/bin/env python3
# monitor_security_groups.py

import boto3
from datetime import datetime

def lambda_handler(event, context):
    """Lambda function to monitor security group changes"""
    
    # This is triggered by CloudTrail via EventBridge
    # Event types: AuthorizeSecurityGroupIngress, RevokeSecurityGroupIngress
    
    ec2 = boto3.client('ec2')
    sns = boto3.client('sns')
    
    # Extract event details
    event_name = event['detail']['eventName']
    request_params = event['detail']['requestParameters']
    
    # Check if rule added 0.0.0.0/0
    if event_name == 'AuthorizeSecurityGroupIngress':
        group_id = request_params.get('groupId')
        ip_permissions = request_params.get('ipPermissions', {})
        
        for permission in ip_permissions.get('items', []):
            for ip_range in permission.get('ipRanges', {}).get('items', []):
                if ip_range.get('cidrIp') == '0.0.0.0/0':
                    # Alert on suspicious rule
                    message = f"""
                    ⚠️ Security Group Alert
                    
                    A potentially dangerous rule was added:
                    
                    Security Group: {group_id}
                    Event: {event_name}
                    CIDR: 0.0.0.0/0
                    Port: {permission.get('fromPort')} - {permission.get('toPort')}
                    Protocol: {permission.get('ipProtocol')}
                    
                    User: {event['detail']['userIdentity']['arn']}
                    Time: {event['detail']['eventTime']}
                    
                    Please review and remediate if necessary.
                    """
                    
                    sns.publish(
                        TopicArn='arn:aws:sns:us-east-1:123456789012:security-alerts',
                        Subject='Security Group Rule Added - Review Required',
                        Message=message
                    )
    
    return {'statusCode': 200}
```
**Étape 6 : Configurer la règle EventBridge**
```
# Create EventBridge rule for security group changes
aws events put-rule \
    --name security-group-changes \
    --event-pattern '{
      "source": ["aws.ec2"],
      "detail-type": ["AWS API Call via CloudTrail"],
      "detail": {
        "eventName": [
          "AuthorizeSecurityGroupIngress",
          "AuthorizeSecurityGroupEgress",
          "RevokeSecurityGroupIngress",
          "RevokeSecurityGroupEgress"
        ]
      }
    }'

# Add Lambda as target
aws events put-targets \
    --rule security-group-changes \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:monitor-security-groups"
```
**Prévention :**

- Implémenter des modèles de groupes de sécurité
- Utiliser l'Infrastructure as Code avec examen par les pairs
- Activer l'analyse automatisée des règles dangereuses
- Audits réguliers du groupe de sécurité (hebdomadaire/mensuel)
- Utilisez les règles AWS Config pour la conformité
- Former l'équipe aux bonnes pratiques du groupe de sécurité
- Documenter les modèles de groupe de sécurité approuvés

---

### Piège 4 : itinéraires oubliés ou périmés

**Problème :** Entrées de la table de routage pointant vers des ressources supprimées (passerelles NAT, connexions VPN, connexions d'appairage), provoquant un blackholing du trafic.

**Pourquoi cela arrive :**

- Supprimer des ressources sans mettre à jour les tables de routage
- Modifications manuelles sans documentation
- Manque de tests après des changements d'infrastructure
- Aucun processus de validation de la table de routage

**Impact :**

- Trafic silencieusement abandonné (trou noir)
- Pannes de connectivité
- Dépannage difficile (pas d'erreurs évidentes)
- Temps d'arrêt des applications

**Exemple :**
```
# Route table still points to deleted NAT Gateway
Destination: 0.0.0.0/0
Target: nat-xxxxx (state: deleted)
Status: blackhole

# Result: All outbound traffic from subnet is dropped
```
**Remède :**

**Étape 1 : Identifier les itinéraires des trous noirs**
```
# Find routes in blackhole state
aws ec2 describe-route-tables \
    --query 'RouteTables[*].Routes[?State==`blackhole`].[RouteTableId,DestinationCidrBlock,GatewayId,NatGatewayId,State]' \
    --output table

# More comprehensive check
aws ec2 describe-route-tables \
    --query 'RouteTables[*].[RouteTableId,Routes[?State==`blackhole`]]' \
    --output json | jq '.[] | select(. | length > 0)'
```
**Étape 2 : Script de validation d'itinéraire automatisé**
```
#!/usr/bin/env python3
# validate_routes.py

import boto3

def validate_route_tables():
    """Validate all route tables and identify issues"""
    
    ec2 = boto3.client('ec2')
    
    route_tables = ec2.describe_route_tables()['RouteTables']
    
    issues = []
    
    for rt in route_tables:
        rt_id = rt['RouteTableId']
        vpc_id = rt['VpcId']
        
        # Get associated subnets
        associations = rt.get('Associations', [])
        subnet_count = len([a for a in associations if 'SubnetId' in a])
        
        for route in rt['Routes']:
            destination = route.get('DestinationCidrBlock', route.get('DestinationPrefixListId', 'Unknown'))
            state = route.get('State', 'active')
            
            # Check for blackhole routes
            if state == 'blackhole':
                issues.append({
                    'severity': 'critical',
                    'route_table': rt_id,
                    'vpc': vpc_id,
                    'destination': destination,
                    'issue': 'Blackhole route - traffic will be dropped',
                    'target': route.get('GatewayId') or route.get('NatGatewayId') or route.get('TransitGatewayId'),
                    'affected_subnets': subnet_count
                })
            
            # Check for specific target types
            if 'NatGatewayId' in route:
                nat_id = route['NatGatewayId']
                try:
                    nat = ec2.describe_nat_gateways(NatGatewayIds=[nat_id])['NatGateways']
                    if nat['State'] not in ['available', 'pending']:
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"NAT Gateway in state: {nat['State']}",
                            'target': nat_id,
                            'affected_subnets': subnet_count
                        })
                except:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': 'NAT Gateway not found (deleted)',
                        'target': nat_id,
                        'affected_subnets': subnet_count
                    })
            
            # Check VPC peering connections
            if 'VpcPeeringConnectionId' in route:
                peer_id = route['VpcPeeringConnectionId']
                try:
                    peer = ec2.describe_vpc_peering_connections(
                        VpcPeeringConnectionIds=[peer_id]
                    )['VpcPeeringConnections']
                    
                    if peer['Status']['Code'] != 'active':
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"VPC Peering in state: {peer['Status']['Code']}",
                            'target': peer_id,
                            'affected_subnets': subnet_count
                        })
                except:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': 'VPC Peering Connection not found (deleted)',
                        'target': peer_id,
                        'affected_subnets': subnet_count
                    })
            
            # Check Transit Gateway attachments
            if 'TransitGatewayId' in route:
                tgw_id = route['TransitGatewayId']
                try:
                    attachments = ec2.describe_transit_gateway_vpc_attachments(
                        Filters=[
                            {'Name': 'transit-gateway-id', 'Values': [tgw_id]},
                            {'Name': 'vpc-id', 'Values': [vpc_id]}
                        ]
                    )['TransitGatewayVpcAttachments']
                    
                    if not attachments or attachments['State'] != 'available':
                        state = attachments['State'] if attachments else 'not found'
                        issues.append({
                            'severity': 'high',
                            'route_table': rt_id,
                            'vpc': vpc_id,
                            'destination': destination,
                            'issue': f"Transit Gateway attachment state: {state}",
                            'target': tgw_id,
                            'affected_subnets': subnet_count
                        })
                except Exception as e:
                    issues.append({
                        'severity': 'critical',
                        'route_table': rt_id,
                        'vpc': vpc_id,
                        'destination': destination,
                        'issue': f'Transit Gateway issue: {str(e)}',
                        'target': tgw_id,
                        'affected_subnets': subnet_count
                    })
    
    # Report findings
    print("=" * 80)
    print("ROUTE TABLE VALIDATION REPORT")
    print("=" * 80)
    
    if not issues:
        print("\n✓ All route tables are healthy")
    else:
        critical = [i for i in issues if i['severity'] == 'critical']
        high = [i for i in issues if i['severity'] == 'high']
        
        if critical:
            print(f"\n🚨 CRITICAL ISSUES ({len(critical)}):")
            for issue in critical:
                print(f"\n  Route Table: {issue['route_table']}")
                print(f"  VPC: {issue['vpc']}")
                print(f"  Destination: {issue['destination']}")
                print(f"  Issue: {issue['issue']}")
                print(f"  Target: {issue['target']}")
                print(f"  Affected Subnets: {issue['affected_subnets']}")
        
        if high:
            print(f"\n⚠️  HIGH PRIORITY ISSUES ({len(high)}):")
            for issue in high:
                print(f"\n  Route Table: {issue['route_table']}")
                print(f"  Destination: {issue['destination']}")
                print(f"  Issue: {issue['issue']}")
    
    return issues

# Run validation
issues = validate_route_tables()
```
**Étape 3 : Nettoyer les routes des trous noirs**
```
# Delete blackhole route
aws ec2 delete-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0

# Add new route with valid target
aws ec2 create-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --nat-gateway-id $NEW_NAT_GW_ID
```
**Étape 4 : implémenter les notifications de changement d'itinéraire**
```
#!/usr/bin/env python3
# route_change_monitor.py

import boto3
import json

def lambda_handler(event, context):
    """Monitor route table changes and send notifications"""
    
    sns = boto3.client('sns')
    
    # CloudTrail event for route changes
    detail = event['detail']
    event_name = detail['eventName']
    
    if event_name in ['CreateRoute', 'ReplaceRoute', 'DeleteRoute']:
        request_params = detail['requestParameters']
        
        message = f"""
        Route Table Change Detected
        
        Event: {event_name}
        Route Table: {request_params.get('routeTableId')}
        Destination: {request_params.get('destinationCidrBlock')}
        Target: {request_params.get('gatewayId') or request_params.get('natGatewayId') or request_params.get('transitGatewayId')}
        
        User: {detail['userIdentity']['arn']}
        Time: {detail['eventTime']}
        Region: {detail['awsRegion']}
        
        Please verify this change is intentional and test connectivity.
        """
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:network-changes',
            Subject=f'Route Table Change: {event_name}',
            Message=message
        )
    
    return {'statusCode': 200}
```
**Étape 5 : Mettre en œuvre la validation automatisée des itinéraires**
```
# Create EventBridge scheduled rule to run validation daily
aws events put-rule \
    --name daily-route-validation \
    --schedule-expression "cron(0 9 * * ? *)" \
    --state ENABLED

aws events put-targets \
    --rule daily-route-validation \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:validate-routes"
```
**Prévention :**

- Implémenter Infrastructure as Code (routes définies dans CloudFormation/Terraform)
- Exécutez la validation de l'itinéraire avant de supprimer les ressources réseau
- Mettre en place des contrôles de santé quotidiens automatisés de la table de routage
- Surveiller CloudTrail pour les modifications de la table de routage
- Documenter tous les changements d'itinéraire manuels
- Utiliser le processus de gestion des changements pour les modifications du réseau

---

### Piège 5 : complexité du peering VPC à grande échelle

**Problème :** La gestion de l'appairage de VPC à maillage complet devient ingérable à mesure que le nombre de VPC augmente, ce qui entraîne une complexité opérationnelle et des erreurs de routage.

**Pourquoi cela arrive :**

- Commencer par le peering VPC sans planifier l'évolutivité
- Ne pas comprendre les avantages de Transit Gateway
- Architectures héritées qui se sont développées de manière organique
- Tentative de peering avec trop de VPC

**Impact :**

- Croissance exponentielle des connexions peering (n(n-1)/2)
- Gestion de tables de routage complexes
- Dépannage difficile
- Limites d'entrée dans la table de routage atteintes
- Frais généraux opérationnels

**Exemple :**
```
5 VPCs require: 5(4)/2 = 10 peering connections
10 VPCs require: 10(9)/2 = 45 peering connections
20 VPCs require: 20(19)/2 = 190 peering connections

Each VPC needs routes to all others in all route tables
Becomes unmanageable quickly
```
**Remède :**

**Étape 1 : Évaluer la complexité actuelle du peering**
```
#!/usr/bin/env python3
# assess_vpc_peering.py

import boto3

def assess_peering_complexity():
    """Assess VPC peering complexity and recommend solutions"""
    
    ec2 = boto3.client('ec2')
    
    # Get all VPCs
    vpcs = ec2.describe_vpcs()['Vpcs']
    vpc_count = len(vpcs)
    
    # Get all peering connections
    peering_connections = ec2.describe_vpc_peering_connections()['VpcPeeringConnections']
    
    active_peerings = [p for p in peering_connections if p['Status']['Code'] == 'active']
    
    # Calculate complexity
    max_possible_peerings = vpc_count * (vpc_count - 1) / 2
    current_peerings = len(active_peerings)
    
    # Get route table counts
    route_tables = ec2.describe_route_tables()['RouteTables']
    total_routes = sum(len(rt['Routes']) for rt in route_tables)
    
    print("=" * 60)
    print("VPC PEERING COMPLEXITY ASSESSMENT")
    print("=" * 60)
    
    print(f"\nVPCs: {vpc_count}")
    print(f"Active Peering Connections: {current_peerings}")
    print(f"Maximum Possible Peerings: {int(max_possible_peerings)}")
    print(f"Total Route Tables: {len(route_tables)}")
    print(f"Total Routes: {total_routes}")
    
    # Recommendations
    print("\nRECOMMENDATIONS:")
    
    if vpc_count <= 5 and current_peerings <= 10:
        print("✓ VPC Peering is manageable at current scale")
    elif vpc_count <= 10 and current_peerings <= 30:
        print("⚠️  VPC Peering is becoming complex")
        print("   Consider Transit Gateway for future growth")
    else:
        print("🚨 VPC Peering is too complex")
        print("   STRONGLY RECOMMEND migrating to Transit Gateway")
        
        # Calculate Transit Gateway savings
        tgw_attachments = vpc_count
        tgw_routes_per_rt = vpc_count  # One route to TGW covers all VPCs
        
        print(f"\n   Transit Gateway Benefits:")
        print(f"   - Connections: {tgw_attachments} (vs {current_peerings} peerings)")
        print(f"   - Routes per table: ~{tgw_routes_per_rt} (vs {current_peerings})")
        print(f"   - Simplified management and troubleshooting")
        print(f"   - Support for transitive routing")
    
    # Find VPCs with most peering connections
    vpc_peering_count = {}
    for peering in active_peerings:
        accepter = peering['AccepterVpcInfo']['VpcId']
        requester = peering['RequesterVpcInfo']['VpcId']
        
        vpc_peering_count[accepter] = vpc_peering_count.get(accepter, 0) + 1
        vpc_peering_count[requester] = vpc_peering_count.get(requester, 0) + 1
    
    if vpc_peering_count:
        print("\nVPCs with Most Peering Connections:")
        sorted_vpcs = sorted(vpc_peering_count.items(), key=lambda x: x, reverse=True)[:5]
        for vpc_id, count in sorted_vpcs:
            print(f"  {vpc_id}: {count} peerings")
    
    return {
        'vpc_count': vpc_count,
        'peering_count': current_peerings,
        'complexity_score': current_peerings / max_possible_peerings if max_possible_peerings > 0 else 0
    }

# Run assessment
result = assess_peering_complexity()
```
**Étape 2 : Plan de migration vers Transit Gateway**
```
#!/usr/bin/env python3
# migrate_to_transit_gateway.py

import boto3
import time

def migrate_peering_to_tgw(vpc_ids, tgw_id=None):
    """Migrate from VPC peering to Transit Gateway"""
    
    ec2 = boto3.client('ec2')
    
    # Step 1: Create Transit Gateway if not provided
    if not tgw_id:
        print("Creating Transit Gateway...")
        tgw_response = ec2.create_transit_gateway(
            Description='Migration from VPC Peering',
            Options={
                'AmazonSideAsn': 64512,
                'AutoAcceptSharedAttachments': 'enable',
                'DefaultRouteTableAssociation': 'enable',
                'DefaultRouteTablePropagation': 'enable',
                'VpnEcmpSupport': 'enable',
                'DnsSupport': 'enable'
            },
            TagSpecifications=[{
                'ResourceType': 'transit-gateway',
                'Tags': [{'Key': 'Name', 'Value': 'Peering-Migration-TGW'}]
            }]
        )
        
        tgw_id = tgw_response['TransitGateway']['TransitGatewayId']
        print(f"Created Transit Gateway: {tgw_id}")
        
        # Wait for availability
        print("Waiting for Transit Gateway to become available...")
        waiter = ec2.get_waiter('transit_gateway_available')
        waiter.wait(TransitGatewayIds=[tgw_id])
        print("Transit Gateway is available")
    
    # Step 2: Attach all VPCs to Transit Gateway
    attachments = {}
    
    for vpc_id in vpc_ids:
        print(f"\nAttaching VPC: {vpc_id}")
        
        # Get subnets (use one per AZ)
        subnets = ec2.describe_subnets(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )['Subnets']
        
        # Select one subnet per AZ
        az_subnets = {}
        for subnet in subnets:
            az = subnet['AvailabilityZone']
            if az not in az_subnets:
                az_subnets[az] = subnet['SubnetId']
        
        subnet_ids = list(az_subnets.values())[:3]  # Max 3 AZs
        
        # Create attachment
        attach_response = ec2.create_transit_gateway_vpc_attachment(
            TransitGatewayId=tgw_id,
            VpcId=vpc_id,
            SubnetIds=subnet_ids,
            Options={'DnsSupport': 'enable'},
            TagSpecifications=[{
                'ResourceType': 'transit-gateway-attachment',
                'Tags': [{'Key': 'Name', 'Value': f'{vpc_id}-TGW-Attachment'}]
            }]
        )
        
        attachment_id = attach_response['TransitGatewayVpcAttachment']['TransitGatewayAttachmentId']
        attachments[vpc_id] = attachment_id
        print(f"Created attachment: {attachment_id}")
    
    # Wait for attachments to become available
    print("\nWaiting for attachments to become available...")
    time.sleep(60)  # Attachments typically take 1-2 minutes
    
    # Step 3: Update route tables
    print("\nUpdating route tables...")
    
    for vpc_id in vpc_ids:
        # Get all route tables for VPC
        route_tables = ec2.describe_route_tables(
            Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
        )['RouteTables']
        
        for rt in route_tables:
            rt_id = rt['RouteTableId']
            
            # Add routes to Transit Gateway for other VPCs
            for other_vpc_id in vpc_ids:
                if other_vpc_id != vpc_id:
                    # Get CIDR of other VPC
                    other_vpc = ec2.describe_vpcs(VpcIds=[other_vpc_id])['Vpcs']
                    other_cidr = other_vpc['CidrBlock']
                    
                    try:
                        ec2.create_route(
                            RouteTableId=rt_id,
                            DestinationCidrBlock=other_cidr,
                            TransitGatewayId=tgw_id
                        )
                        print(f"  Added route in {rt_id}: {other_cidr} → TGW")
                    except Exception as e:
                        if 'RouteAlreadyExists' not in str(e):
                            print(f"  Error adding route: {e}")
    
    print("\n✓ Migration complete!")
    print(f"\nNext steps:")
    print(f"1. Test connectivity between VPCs via Transit Gateway")
    print(f"2. Verify all applications are working")
    print(f"3. Remove VPC peering connections")
    print(f"4. Clean up old routes pointing to peering connections")
    
    return tgw_id, attachments

# Example usage
# vpc_ids = ['vpc-11111', 'vpc-22222', 'vpc-33333', 'vpc-44444']
# tgw_id, attachments = migrate_peering_to_tgw(vpc_ids)
```
**Étape 3 : Nettoyer les anciennes connexions d'appairage**
```
# After verifying Transit Gateway connectivity works

# List all peering connections
aws ec2 describe-vpc-peering-connections \
    --query 'VpcPeeringConnections[*].[VpcPeeringConnectionId,Status.Code]' \
    --output table

# Delete peering connection
aws ec2 delete-vpc-peering-connection \
    --vpc-peering-connection-id pcx-12345678

# Remove routes pointing to old peering connections
aws ec2 delete-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 10.1.0.0/16
```
**Prévention :**

- Planifiez Transit Gateway dès le début si vous prévoyez > 5 VPC
- Utilisez Transit Gateway pour toute architecture multi-VPC
- Documenter clairement la topologie du réseau
- Mettre en œuvre l'automatisation du réseau
- Revues d'architecture régulières

---

### Piège 6 : Ne pas planifier l'épuisement d'IPv4

**Problème :** Vous manquez d'espace IP privé RFC 1918 lorsque vous disposez de nombreux VPC ou que vous devez vous connecter à des réseaux sur site avec des CIDR qui se chevauchent.

**Pourquoi cela arrive :**

- Utilisation de blocs CIDR courants (10.0.0.0/16, 172.31.0.0/16)
- Pas de coordination avec les équipes réseau sur site
- Pas de stratégie d'allocation centrale de CIDR
- Dupliquer les blocs CIDR sur les VPC

**Impact :**

- Impossible d'appairer des VPC avec des CIDR qui se chevauchent
- Impossible de se connecter au réseau sur site
- Solutions de contournement complexes en matière de NAT et de routage
- Migrations forcées de VPC

**Remède :**

**Étape 1 : Créer un registre d'allocation CIDR**
```
# cidr-allocation-registry.yaml
cidr_allocations:
  on_premises:
    - 10.0.0.0/8     # Corporate network
    - 172.16.0.0/12  # Reserved for on-prem expansion
  
  aws_regions:
    us_east_1:
      production:
        - 10.100.0.0/16  # Production VPC 1
        - 10.101.0.0/16  # Production VPC 2
      development:
        - 10.110.0.0/16  # Dev VPC
      shared_services:
        - 10.120.0.0/16  # Shared services
    
    eu_west_1:
      production:
        - 10.200.0.0/16  # Production VPC
      development:
        - 10.210.0.0/16  # Dev VPC
    
    ap_southeast_1:
      production:
        - 10.300.0.0/16  # Production VPC
  
  reserved_for_future:
    - 192.168.0.0/16   # Reserved
    - 10.150.0.0/16    # Reserved for us-east-1 expansion
    - 10.250.0.0/16    # Reserved for eu-west-1 expansion
```
**Étape 2 : Mettre en œuvre l'outil d'allocation CIDR**
```
#!/usr/bin/env python3
# cidr_allocator.py

import ipaddress
import yaml

class CIDRAllocator:
    def __init__(self, registry_file='cidr-allocation-registry.yaml'):
        with open(registry_file, 'r') as f:
            self.registry = yaml.safe_load(f)
        
        self.allocated = self._load_allocated_cidrs()
    
    def _load_allocated_cidrs(self):
        """Load all allocated CIDR blocks"""
        allocated = []
        
        # On-premises
        for cidr in self.registry['cidr_allocations'].get('on_premises', []):
            allocated.append(ipaddress.IPv4Network(cidr))
        
        # AWS regions
        for region, vpcs in self.registry['cidr_allocations'].get('aws_regions', {}).items():
            for env, cidrs in vpcs.items():
                for cidr in cidrs:
                    allocated.append(ipaddress.IPv4Network(cidr))
        
        return allocated
    
    def check_overlap(self, proposed_cidr):
        """Check if proposed CIDR overlaps with existing allocations"""
        proposed = ipaddress.IPv4Network(proposed_cidr)
        
        overlaps = []
        for existing in self.allocated:
            if proposed.overlaps(existing):
                overlaps.append(str(existing))
        
        return overlaps
    
    def suggest_cidr(self, region, prefix_length=16):
        """Suggest available CIDR block for region"""
        
        # Regional starting points
        region_bases = {
            'us-east-1': '10.100.0.0/12',    # 10.100.0.0 - 10.111.255.255
            'us-west-2': '10.112.0.0/12',    # 10.112.0.0 - 10.127.255.255
            'eu-west-1': '10.200.0.0/12',    # 10.200.0.0 - 10.215.255.255
            'ap-southeast-1': '10.300.0.0/12', # 10.300.0.0 - 10.315.255.255
        }
        
        if region not in region_bases:
            raise ValueError(f"Region {region} not configured in allocator")
        
        # Generate candidates
        base_network = ipaddress.IPv4Network(region_bases[region])
        
        for subnet in base_network.subnets(new_prefix=prefix_length):
            if not any(subnet.overlaps(existing) for existing in self.allocated):
                return str(subnet)
        
        raise ValueError(f"No available /{prefix_length} CIDR blocks in {region}")
    
    def allocate_cidr(self, region, environment, cidr):
        """Allocate a CIDR block"""
        
        # Check for overlaps
        overlaps = self.check_overlap(cidr)
        if overlaps:
            raise ValueError(f"CIDR {cidr} overlaps with: {', '.join(overlaps)}")
        
        # Add to registry
        if region not in self.registry['cidr_allocations']['aws_regions']:
            self.registry['cidr_allocations']['aws_regions'][region] = {}
        
        if environment not in self.registry['cidr_allocations']['aws_regions'][region]:
            self.registry['cidr_allocations']['aws_regions'][region][environment] = []
        
        self.registry['cidr_allocations']['aws_regions'][region][environment].append(cidr)
        self.allocated.append(ipaddress.IPv4Network(cidr))
        
        print(f"✓ Allocated {cidr} to {region}/{environment}")
        
        return True
    
    def save_registry(self, filename='cidr-allocation-registry.yaml'):
        """Save updated registry"""
        with open(filename, 'w') as f:
            yaml.dump(self.registry, f, default_flow_style=False)
        
        print(f"✓ Registry saved to {filename}")

# Example usage
allocator = CIDRAllocator()

# Check if a CIDR is available
overlaps = allocator.check_overlap('10.100.0.0/16')
if overlaps:
    print(f"CIDR overlaps with: {overlaps}")
else:
    print("CIDR is available")

# Suggest available CIDR
suggested = allocator.suggest_cidr('us-east-1', prefix_length=16)
print(f"Suggested CIDR: {suggested}")

# Allocate CIDR
allocator.allocate_cidr('us-east-1', 'production', suggested)
allocator.save_registry()
```
**Étape 3 : implémenter IPv6 pour une pérennité**
```
# Associate IPv6 CIDR with VPC
aws ec2 associate-vpc-cidr-block \
    --vpc-id $VPC_ID \
    --amazon-provided-ipv6-cidr-block

# Wait for association
aws ec2 wait vpc-available --vpc-ids $VPC_ID

# Get assigned IPv6 CIDR
IPV6_CIDR=$(aws ec2 describe-vpcs \
    --vpc-ids $VPC_ID \
    --query 'Vpcs.Ipv6CidrBlockAssociationSet.Ipv6CidrBlock' \
    --output text)

echo "Assigned IPv6 CIDR: $IPV6_CIDR"

# Assign IPv6 CIDR to subnets
aws ec2 associate-subnet-cidr-block \
    --subnet-id $SUBNET_ID \
    --ipv6-cidr-block "${IPV6_CIDR%::*}::/64"  # Use first /64

# Enable auto-assign IPv6
aws ec2 modify-subnet-attribute \
    --subnet-id $SUBNET_ID \
    --assign-ipv6-address-on-creation

# Update route tables for IPv6
aws ec2 create-route \
    --route-table-id $PUBLIC_RT \
    --destination-ipv6-cidr-block ::/0 \
    --gateway-id $IGW_ID

# For private subnets, use Egress-Only Internet Gateway
EIGW_ID=$(aws ec2 create-egress-only-internet-gateway \
    --vpc-id $VPC_ID \
    --query 'EgressOnlyInternetGateway.EgressOnlyInternetGatewayId' \
    --output text)

aws ec2 create-route \
    --route-table-id $PRIVATE_RT \
    --destination-ipv6-cidr-block ::/0 \
    --egress-only-internet-gateway-id $EIGW_ID
```
**Prévention :**

- Tenir à jour le registre central d'allocation CIDR
- Utilisez des blocs CIDR qui ne se chevauchent pas dès le début
- Coordonner avec les équipes du réseau avant d'attribuer
- Implémenter IPv6 pour une évolutivité à long terme
- Documenter toutes les allocations CIDR
- Audits réguliers de l'utilisation du CIDR

---

## Résumé du chapitre

Amazon VPC est la base réseau d'AWS, fournissant des réseaux isolés définis par logiciel avec un contrôle complet sur l'adressage IP, le routage et la sécurité. La maîtrise de l'architecture VPC nécessite de comprendre la conception des sous-réseaux, les mécanismes de routage, les couches de sécurité et les modèles de connectivité pour les déploiements cloud natifs et hybrides.

**Principaux points à retenir :**

- **Planifiez soigneusement les blocs CIDR :** Utilisez des VPC /16 avec une marge de croissance, maintenez un registre d'allocation central et évitez les chevauchements avec les réseaux sur site.
- **Concevoir pour la haute disponibilité :** Déployez des ressources sur plusieurs zones de disponibilité, utilisez une passerelle NAT par zone de disponibilité et implémentez un routage spécifique à chaque zone de disponibilité pour éviter les frais inter-zones.
- **Contrôles de sécurité des couches :** Utilisez des groupes de sécurité pour le filtrage avec état au niveau de l'instance, des NACL pour le filtrage sans état au niveau des sous-réseaux et des sous-réseaux privés pour les ressources sans accès direct à Internet.
- **Optimiser le routage :** Mettez en œuvre des associations de tables de routage appropriées, validez régulièrement les itinéraires et envisagez Transit Gateway pour les environnements multi-VPC
- **Tirez parti des points de terminaison d'un VPC :** Réduisez les coûts de la passerelle NAT et améliorez la sécurité en utilisant les points de terminaison de passerelle pour S3/DynamoDB et les points de terminaison d'interface pour d'autres services AWS.
- **Surveillez le trafic réseau :** Activez les journaux de flux VPC dès le premier jour, créez des tableaux de bord complets et configurez des alertes automatisées en cas d'anomalies du réseau.
- **Évoluez intelligemment :** utilisez Transit Gateway au lieu de l'appairage de VPC pour plus de 5 à 10 VPC, mettez en œuvre des architectures en étoile et planifiez une connectivité hybride

Comprendre VPC en profondeur vous permet de créer des architectures réseau sécurisées, évolutives et rentables qui prennent en charge à la fois les besoins actuels et la croissance future. La base de réseau que vous avez construite ici sera essentielle lorsque nous explorerons les services de calcul dans le chapitre suivant.

Au chapitre 4, nous plongerons dans Amazon EC2, où vous apprendrez à lancer et à gérer des serveurs virtuels au sein de l'infrastructure VPC que vous maîtrisez.

## Exercice pratique en laboratoire

**Objectif :** Créez un VPC hautement disponible, prêt pour la production, avec une isolation complète du réseau, une architecture multiniveau et une simulation de connectivité hybride.

**Scénario :** Déployez une infrastructure d'applications à 3 niveaux avec :

- Niveau Web public avec Application Load Balancer
- Niveau d'application privé avec Auto Scaling
- Niveau de base de données privée avec RDS Multi-AZ
- Hôte Bastion pour un accès sécurisé
- Points de terminaison VPC pour les services AWS
- Connectivité VPN à une simulation sur site

**Étapes de l'exercice :**

1. **Conception et architecture documentaire**
    - Dessiner un schéma de réseau
    - Planifier l'allocation CIDR
    - Règles du groupe de sécurité du document
    - Définir la stratégie de la table de routage
2. **Déployer l'infrastructure VPC principale**
    - Créer un VPC avec /16 CIDR
    - Déployer 9 sous-réseaux sur 3 AZ (public, application, base de données)
    - Configurer la passerelle Internet et les passerelles NAT
    - Configurer les tables de routage
3. **Mettre en œuvre des couches de sécurité**
    - Créer des groupes de sécurité pour chaque niveau
    - Configurer les NACL pour une protection supplémentaire
    - Configurer l'hôte bastion pour l'accès SSH
    - Implémenter le chaînage des groupes de sécurité
4. **Déployer les composants d'application**
    - Lancer Application Load Balancer dans les sous-réseaux publics
    - Créer un groupe Auto Scaling dans les sous-réseaux d'applications
    - Déployer RDS Multi-AZ dans les sous-réseaux de bases de données
    - Configurer les contrôles de santé
5. **Optimiser avec les points de terminaison d'un VPC**
    - Créer un point de terminaison de passerelle S3
    - Configurer les points de terminaison de l'interface Systems Manager
    - Tester la connectivité privée
6. **Activer la surveillance**
    - Activer les journaux de flux VPC
    - Créer un tableau de bord CloudWatch
    - Mettre en place des alarmes pour les anomalies
7. **Tester et valider**
    - Vérifier la connectivité entre les niveaux
    - Tester les scénarios de basculement AZ
    - Valider les restrictions du groupe de sécurité
    - Confirmer que la surveillance fonctionne

**Résultats attendus :**

- Architecture VPC multiniveau entièrement fonctionnelle
- Conception de réseau documentée
- Contrôles de sécurité fonctionnels
- Suivi opérationnel

**Nettoyage :**
```
aws cloudformation delete-stack --stack-name production-vpc
# Manually delete NAT Gateways and release Elastic IPs
# Terminate EC2 instances
# Delete RDS instances
```
## Questions de révision

1. **Quelle est la taille minimale et maximale du bloc CIDR pour un VPC ?**
a) /24 à /8
b) /28 à /16
c) /32 à /16
d) /28 à /8

**Réponse : B** - Les VPC AWS prennent en charge les blocs CIDR de /28 (16 adresses IP) à /16 (65 536 adresses IP).

2. **Combien d'adresses IP AWS réserve-t-il dans chaque sous-réseau ?**
une) 3
b) 4
c)5
d) 10

**Réponse : C** - AWS réserve 5 adresses IP : adresse réseau, routeur VPC, serveur DNS, utilisation future et adresse de diffusion.

3. **Quelle est la principale différence entre un groupe de sécurité et une ACL réseau ?**
a) Les groupes de sécurité sont apatrides, les NACL sont avec état
b) Les groupes de sécurité sont avec état, les NACL sont sans état
c) Les groupes de sécurité refusent par défaut, les NACL autorisent par défaut
d) Il n'y a aucune différence

**Réponse : B** - Les groupes de sécurité sont avec état (le trafic de retour est automatiquement autorisé), tandis que les NACL sont sans état (le trafic de retour doit être explicitement autorisé).

4. **Combien de passerelles NAT devez-vous déployer pour une haute disponibilité dans un VPC avec 3 AZ ?**
une) 1
b)2
c) 3
d)6

**Réponse : C** - Déployez une passerelle NAT par zone de disponibilité (3 au total) pour garantir une haute disponibilité et éviter les frais de transfert de données entre zones de disponibilité.

5. **Qu'arrive-t-il au trafic lorsqu'une table de routage comporte un itinéraire de trou noir ?**
a) Le trafic est redirigé vers l'itinéraire par défaut
b) Le trafic est supprimé silencieusement
c) Une erreur est renvoyée à l'expéditeur
d) Le trafic est envoyé au routeur VPC

**Réponse : B** - Les routes Blackhole suppriment silencieusement le trafic sans renvoyer d'erreur, ce qui se produit généralement lorsque la ressource cible est supprimée.

6. **Quel composant VPC permet une connectivité privée à S3 sans utiliser Internet ou une passerelle NAT ?**
a) Appairage de VPC
b) Passerelle de transit
c) Point de terminaison d'un VPC (passerelle)
d) Connexion directe

**Réponse : C** - S3 Gateway Endpoint fournit une connectivité privée à S3 sans frais de transfert de données ni utilisation de la passerelle NAT.

7. **Combien de connexions d'appairage de VPC sont requises pour un maillage complet de 10 VPC ?**
une) 10
b) 20
c) 45
d) 90

**Réponse : C** - Formule : n(n-1)/2 = 10(9)/2 = 45 connexions d'appairage.

8. **Quel est le nombre maximum de blocs CIDR secondaires que vous pouvez ajouter à un VPC ?**
une) 3
b) 5
c) 10
d) Illimité

**Réponse : B** - Vous pouvez ajouter jusqu'à 5 blocs CIDR secondaires à un VPC (en plus du CIDR principal).

9. **Quelle affirmation concernant l'appairage de VPC est VRAIE ?**
a) L'appairage de VPC est transitif
b) L'appairage de VPC nécessite des blocs CIDR qui ne se chevauchent pas
c) L'appairage de VPC ne peut connecter que des VPC dans la même région
d) L'appairage de VPC crée un point de défaillance unique

**Réponse : B** - L'appairage de VPC nécessite des blocs CIDR qui ne se chevauchent pas. Il n’est PAS transitif, prend en charge les connexions entre régions et n’a aucun point de défaillance unique.

10. **Quel est l'objectif d'une passerelle Internet de sortie uniquement ?**
a) Autoriser le trafic IPv6 entrant
b) Autoriser uniquement le trafic IPv6 sortant
c) Remplacer la passerelle NAT pour IPv4
d) Activer l'appairage de VPC sur IPv6

**Réponse : B** - La passerelle Internet de sortie uniquement autorise le trafic IPv6 sortant tout en empêchant les connexions entrantes (équivalent IPv6 de la passerelle NAT).

11. **Comment AWS Transit Gateway simplifie-t-il la connectivité multi-VPC par rapport au peering VPC ?**
a) C'est moins cher que le peering VPC
b) Il fournit un routage transitif via un hub central
c) Il ne nécessite pas de mise à jour de la table de routage
d) Il crypte automatiquement tout le trafic

**Réponse : B** - Transit Gateway fournit un routage transitif, permettant aux VPC de communiquer via un hub central au lieu de nécessiter des connexions d'appairage entièrement maillées.

12. **Quel est l'ordre correct d'évaluation de l'itinéraire lorsque plusieurs itinéraires correspondent à une destination ?**
a) Les premiers gagnants créés
b) Gains les plus spécifiques (préfixe le plus long)
c) Derniers gains créés
d) Sélection aléatoire

**Réponse : B** - AWS utilise la correspondance de préfixe la plus longue - l'itinéraire le plus spécifique (longueur de préfixe la plus longue) l'emporte.

13. **Lequel des éléments suivants n'est PAS une limitation valide de la passerelle NAT ?**
a) Prend en charge jusqu'à 55 000 connexions simultanées
b) Évolue jusqu'à 45 Gbit/s
c) Doit être déployé dans un sous-réseau public
d) Peut être partagé sur plusieurs VPC

**Réponse : D** - Les passerelles NAT ne peuvent pas être partagées entre les VPC. Chaque VPC a besoin de sa ou de ses propres passerelles NAT.

14. **Quel est le principal cas d'utilisation des journaux de flux VPC ?**
a) Surveiller les événements de création de VPC
b) Capturer les informations sur le trafic IP pour l'analyse de la sécurité
c) Consigner les modifications apportées aux groupes de sécurité
d) Suivre l'allocation des coûts du VPC

**Réponse : B** - Les journaux de flux VPC capturent des informations sur le trafic IP circulant via les interfaces réseau à des fins d'analyse de sécurité et de dépannage.

15. **Quand devez-vous utiliser Transit Gateway au lieu de l'appairage de VPC ?**
a) Pour connecter 2-3 VPC
b) Quand vous avez besoin du coût le plus bas possible
c) Pour connecter plus de 10 VPC ou nécessiter un routage transitif
d) Uniquement pour la connectivité interrégionale

**Réponse : C** - Transit Gateway est idéal pour connecter de nombreux VPC (10+) ou lorsqu'un routage transitif est requis, malgré des coûts plus élevés que l'appairage de VPC.

---
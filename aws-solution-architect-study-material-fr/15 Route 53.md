# Chapitre 15 : Route 53

##Présentation

Le système de noms de domaine (DNS) est l'annuaire téléphonique d'Internet, traduisant les noms de domaine lisibles par l'homme (www.example.com) en adresses IP (192.0.2.1) que les ordinateurs utilisent pour communiquer. Chaque interaction Internet commence par DNS : lorsque les utilisateurs saisissent une URL, leur navigateur interroge les serveurs DNS pour trouver l'emplacement du site Web. Amazon Route 53, le service DNS hautement disponible et évolutif d'AWS, va bien au-delà de la résolution de noms de base, offrant des politiques de routage intelligentes, une vérification de l'état, une gestion du trafic et une intégration transparente avec les services AWS. Le nom « Route 53 » fait référence au port TCP/UDP 53, le port standard pour DNS.

Les systèmes DNS traditionnels fournissent un mappage domaine-IP simple, mais Route 53 transforme le DNS en une plate-forme intelligente de gestion du trafic. Au lieu de router tous les utilisateurs vers un seul serveur, les politiques de routage de Route 53 permettent une distribution sophistiquée du trafic : le routage par géolocalisation dirige les utilisateurs vers le centre de données le plus proche pour une latence plus faible ; le routage pondéré permet une migration progressive du trafic entre les déploiements ; Le routage de basculement bascule automatiquement vers les ressources de sauvegarde en cas de panne ; Le routage basé sur la latence envoie les utilisateurs vers la région qui répond le plus rapidement. Ces capacités rendent Route 53 essentiel pour les architectures multirégionales, la reprise après sinistre, les déploiements bleu-vert et la fourniture d'applications mondiales.

Comprendre les principes fondamentaux du DNS et les fonctionnalités avancées de Route 53 distingue l'hébergement de sites Web de base de l'infrastructure mondiale de production. Des valeurs TTL mal configurées provoquent des pannes prolongées lors du basculement. Des contrôles de santé inappropriés déclenchent des faux positifs, détournant inutilement le trafic des ressources saines. Ne pas utiliser d'enregistrements d'alias pour les ressources AWS entraîne des coûts et une complexité inutiles. L’absence de DNSSEC rend les domaines vulnérables aux attaques d’empoisonnement du cache. Ce chapitre fournit une couverture complète depuis les bases du DNS jusqu'aux modèles de production, y compris les zones hébergées, les types d'enregistrement, les politiques de routage, les contrôles d'état, le flux de trafic, DNSSEC et les meilleures pratiques pour créer des systèmes résilients et distribués à l'échelle mondiale.

## Théorie \&Concepts

### Principes fondamentaux du DNS

**Comment fonctionne le DNS (système hiérarchique) :**

DNS fonctionne comme un système hiérarchique distribué avec plusieurs couches :
```
DNS Resolution Process:

1. User types www.example.com in browser
   ↓
2. Browser checks local DNS cache
   - If found: Use cached IP (fast)
   - If not: Query DNS resolver
   ↓
3. Recursive Resolver (ISP or 8.8.8.8)
   - Checks its cache
   - If not cached, begins recursive query
   ↓
4. Root Name Server (.)
   - "I don't know www.example.com"
   - "But ask .com TLD server at 192.5.6.30"
   ↓
5. TLD Name Server (.com)
   - "I don't know www.example.com"
   - "But ask example.com authoritative server at 203.0.113.1"
   ↓
6. Authoritative Name Server (Route 53)
   - "www.example.com is at 198.51.100.1"
   ↓
7. Response travels back through resolver to browser
   ↓
8. Browser connects to 198.51.100.1
```
**Hiérarchie DNS :**
```
Root Zone (.)
├── Top-Level Domains (TLDs)
│   ├── Generic TLDs: .com, .org, .net, .io
│   ├── Country Code TLDs: .uk, .de, .jp, .in
│   └── New TLDs: .cloud, .tech, .app
│
└── Second-Level Domains
    ├── example.com
    │   ├── www.example.com (subdomain)
    │   ├── api.example.com (subdomain)
    │   └── mail.example.com (subdomain)
    │
    └── company.org
        ├── blog.company.org
        └── shop.company.org
```
**Types d'enregistrement DNS :**

Comprendre les types d'enregistrements est fondamental pour la configuration DNS :

**Un enregistrement (enregistrement d'adresse) :**

- Mappe le domaine à l'adresse IPv4
- Exemple : `www.example.com → 192.0.2.1`
- Type d'enregistrement le plus courant
- Requis pour l'hébergement de sites Web

**Enregistrement AAAA (adresse IPv6) :**

- Mappe le domaine à l'adresse IPv6
- Exemple : `www.example.com → 2001:0db8::1`
- Importance croissante à mesure que l'adoption d'IPv6 augmente
- Souvent configuré avec les enregistrements A

**Enregistrement CNAME (nom canonique) :**

- Crée un alias pointant vers un autre domaine
- Exemple : `www.example.com → example.com`
- Ne peut pas être utilisé pour la zone apex (domaine racine)
- Limitation : ne peut pas coexister avec d'autres types d'enregistrements

**Enregistrement MX (échange de courrier) :**

- Spécifie les serveurs de messagerie pour le domaine
- Inclut les valeurs de priorité (inférieure = priorité supérieure)
- Exemple : `10 mail1.example.com`, `20 mail2.example.com`
- Indispensable pour le routage des emails

**Enregistrement TXT (texte) :**

- Stocke les informations textuelles
- Cas d'utilisation :
    - SPF : vérification de l'expéditeur de l'e-mail
    - DKIM : Authentification des e-mails
    - Vérification de domaine pour les services
    - Preuve de propriété du site
- Exemple : `v=spf1 include:_spf.google.com ~all`

**Enregistrement NS (serveur de noms) :**

- Délégue le sous-domaine à différents serveurs de noms
- Spécifie les serveurs de noms faisant autorité pour la zone
- Exemple : `exemple.com → ns-123.awsdns-12.com`
- Critique pour la délégation DNS

**Enregistrement SOA (début de l'autorité) :**

- Contient des métadonnées de zone
- Comprend : le serveur de noms principal, l'e-mail de l'administrateur, le numéro de série, les délais d'actualisation/nouvelle tentative
- Géré automatiquement par Route 53
- Un seul SOA par zone

**Enregistrement PTR (pointeur) :**

- Recherche DNS inversée (IP vers domaine)
- Utilisé pour la vérification du serveur de messagerie
- Exemple : `1.2.0.192.in-addr.arpa → mail.example.com`
- Important pour la délivrabilité des emails

**Enregistrement SRV (Service) :**

- Spécifie l'emplacement des services
- Format : `cible du port de poids prioritaire`
- Utilisé pour : SIP, XMPP, LDAP
- Exemple : `_sip._tcp.example.com 10 60 5060 sipserver.example.com`

**Enregistrement CAA (autorisation de l'autorité de certification) :**

- Spécifie quelles autorités de certification peuvent émettre des certificats
- Fonction de sécurité empêchant l'émission de certificats non autorisés
- Exemple : `0 numéro "letsencrypt.org"`
- Pratique de sécurité recommandée

**Durée de vie (TTL) :**

TTL est la durée (en secondes) pendant laquelle les enregistrements DNS sont mis en cache :
```
TTL Impact:

Short TTL (60-300 seconds):
✓ Faster failover during issues
✓ Quick changes propagate rapidly
✗ More DNS queries (higher cost)
✗ Increased latency for users

Long TTL (3600-86400 seconds):
✓ Fewer DNS queries (lower cost)
✓ Better performance (cached)
✗ Slow propagation of changes
✗ Delayed failover

Recommended TTL:
- Production stable records: 3600-7200 (1-2 hours)
- Pre-migration: 300 (5 minutes)
- During migration: 60 (1 minute)
- Post-migration: Increase gradually
```
**Comportement de mise en cache DNS :**

Les réponses DNS sont mises en cache à plusieurs niveaux, affectant la propagation des modifications :
```
Cache Hierarchy:

Browser Cache
└── TTL: Varies (often ignores DNS TTL)

OS Cache
└── TTL: Respects DNS TTL

Router/Gateway Cache
└── TTL: Respects DNS TTL

ISP Resolver Cache
└── TTL: Respects DNS TTL (mostly)

Maximum Propagation Time = Longest Cache TTL

Example:
- Set TTL to 300 seconds
- Make DNS change
- Maximum wait: 5 minutes for full propagation
- Reality: Can take longer due to non-compliant resolvers
```
### Zones hébergées de la Route 53

**Qu'est-ce qu'une zone hébergée ?**

Une zone hébergée est un conteneur pour les enregistrements DNS appartenant à un domaine. Considérez-le comme une base de données d'enregistrements DNS pour votre domaine.

**Deux types de zones hébergées :**

**1. Zone hébergée publique :**
```
Purpose: Internet-facing domains
Access: Publicly resolvable from internet
Use Cases:
- Website domains (www.example.com)
- API endpoints (api.example.com)
- Email servers (mail.example.com)
- Public services

Cost: $0.50/month per hosted zone
Query Cost: $0.40 per million queries
```
**2. Zone hébergée privée :**
```
Purpose: Internal VPC resources
Access: Only from associated VPCs
Use Cases:
- Internal applications (app.internal)
- Database endpoints (db.internal)
- Microservices (service.internal)
- Development environments

Cost: $0.50/month per hosted zone
Query Cost: $0.40 per million queries

Requirements:
- Associate with one or more VPCs
- VPC DNS resolution enabled
- VPC DNS hostnames enabled
```
**Architecture de zone hébergée :**
```
Public Hosted Zone (example.com)
├── Name Servers (4 provided by Route 53)
│   ├── ns-123.awsdns-12.com
│   ├── ns-456.awsdns-45.co.uk
│   ├── ns-789.awsdns-78.org
│   └── ns-012.awsdns-01.net
│
├── Records
│   ├── A: example.com → 192.0.2.1
│   ├── A: www.example.com → 192.0.2.1
│   ├── CNAME: blog.example.com → blog-platform.com
│   ├── MX: example.com → mail.example.com
│   └── TXT: example.com → "verification-code"
│
└── Delegation to subdomains
    └── NS: subdomain.example.com → other-name-servers
```
**DNS Split-View (configuration hybride) :**

Route 53 prend en charge le DNS à vue partagée où le même domaine est résolu différemment pour les utilisateurs internes et externes :
```
Public Hosted Zone (example.com)
├── www.example.com → 203.0.113.1 (Public IP)
└── api.example.com → CloudFront distribution

Private Hosted Zone (example.com)
├── www.example.com → 10.0.1.100 (Private IP)
├── api.example.com → 10.0.2.50 (Internal ALB)
└── database.example.com → 10.0.3.10 (RDS endpoint)

External Users: See public zone records
Internal VPC Users: See private zone records (takes precedence)

Use Cases:
- Internal services bypass internet
- Lower latency for internal access
- Security (internal resources not exposed)
- Cost savings (no internet data transfer)
```
### Politiques de routage

Les politiques de routage de Route 53 permettent une distribution intelligente du trafic au-delà de la simple résolution DNS.

**1. Politique de routage simple :**

La politique la plus élémentaire : un enregistrement avec une ou plusieurs adresses IP :
```
Behavior:
- Single resource or multiple IPs
- Returns all values to client
- Client chooses randomly
- No health checking
- No traffic distribution control

Use Cases:
- Single web server
- Simple static websites
- Development environments
- No failover requirements

Example:
www.example.com (A record)
├── 192.0.2.1
├── 192.0.2.2
└── 192.0.2.3

Client receives all three IPs, picks one randomly
```
**2. Politique de routage pondérée :**

Répartit le trafic sur plusieurs ressources en fonction des pondérations attribuées :
```
Behavior:
- Assign weight to each record (0-255)
- Traffic percentage = (weight / sum of weights) × 100
- Useful for gradual migrations
- Supports health checking

Use Cases:
- Blue-green deployments
- A/B testing
- Gradual traffic migration
- Load distribution across regions

Mathematics:
Record A: Weight 70
Record B: Weight 20
Record C: Weight 10
Total: 100

Traffic Distribution:
A receives: 70/100 = 70%
B receives: 20/100 = 20%
C receives: 10/100 = 10%

Migration Strategy:
Day 1: Old=100, New=0 (100% old)
Day 2: Old=90, New=10 (90% old, 10% new)
Day 3: Old=70, New=30 (70% old, 30% new)
Day 4: Old=50, New=50 (50/50 split)
Day 5: Old=20, New=80 (20% old, 80% new)
Day 6: Old=0, New=100 (100% new)
```
**3. Politique de routage basée sur la latence :**

Achemine les utilisateurs vers la région avec la latence réseau la plus faible :
```
Behavior:
- Create records in multiple regions
- Route 53 measures latency from user to each region
- Routes to fastest region
- Requires health checks for failover

How Latency is Determined:
- Historical latency data from AWS infrastructure
- Measured between user location and AWS regions
- Updated regularly
- Not real-time per-query measurement

Use Cases:
- Global applications
- Multi-region deployments
- User experience optimization
- International audiences

Example Configuration:
www.example.com (Latency policy)
├── us-east-1 → 52.1.2.3 (New York region)
├── eu-west-1 → 34.240.5.6 (Ireland region)
├── ap-southeast-1 → 13.228.7.8 (Singapore region)
└── ap-south-1 → 13.126.9.10 (Mumbai region)

User in London:
- Latency to us-east-1: 80ms
- Latency to eu-west-1: 10ms ← Selected
- Latency to ap-southeast-1: 180ms
- Latency to ap-south-1: 150ms

User in Tokyo:
- Latency to us-east-1: 150ms
- Latency to eu-west-1: 240ms
- Latency to ap-southeast-1: 75ms ← Selected
- Latency to ap-south-1: 100ms
```
**4. Politique de routage de basculement :**

Fournit un basculement actif-passif pour une haute disponibilité :
```
Behavior:
- Primary resource (active)
- Secondary resource (standby)
- Health check on primary
- Automatic failover to secondary if primary unhealthy

States:
Primary Healthy → Route to Primary
Primary Unhealthy → Route to Secondary

Use Cases:
- Disaster recovery
- Active-passive architecture
- Backup resource standby
- High availability requirements

Example:
www.example.com (Failover policy)
├── Primary: us-east-1 ALB (52.1.2.3)
│   └── Health Check: HTTP on port 80, path /health
└── Secondary: us-west-2 ALB (34.208.4.5)
    └── Always available (no health check required)

Normal Operation: All traffic to us-east-1
Primary Fails: Automatic switch to us-west-2 (within health check interval)
Primary Recovers: Automatic switch back to us-east-1
```
**5. Politique de routage de géolocalisation :**

Achemine les utilisateurs en fonction de leur emplacement géographique :
```
Behavior:
- Define records for specific locations
- Locations: Continents, Countries, US States
- Routes based on user's location
- Default record for unmatched locations

Location Precedence (most specific wins):
1. US State (e.g., California)
2. Country (e.g., United States)
3. Continent (e.g., North America)
4. Default location

Use Cases:
- Content localization
- License restrictions
- Compliance requirements (data residency)
- Language-specific content
- Regional pricing

Example:
www.example.com (Geolocation policy)
├── Europe → eu-west-1 (German website version)
├── Asia → ap-southeast-1 (Asian market version)
├── United States → us-east-1 (US version)
├── California (US State) → us-west-1 (California-specific)
└── Default → us-east-1 (fallback for unmatched)

User in Germany: Receives eu-west-1 (European version)
User in India: Receives ap-southeast-1 (Asian version)
User in California: Receives us-west-1 (CA-specific)
User in New York: Receives us-east-1 (US version)
User in Antarctica: Receives us-east-1 (default)

Important Notes:
- Based on location of DNS resolver, not user
- VPN/proxy can affect geolocation
- Always configure default location
- More specific rules override general rules
```
**6. Politique d'itinéraire de géoproximité :**

Itinéraires basés sur la situation géographique des ressources et des utilisateurs, avec ajustement des biais :
```
Behavior:
- Routes to nearest resource geographically
- Bias: Expand or shrink geographic region (±99)
- Positive bias: Attracts more traffic
- Negative bias: Reduces traffic
- Requires Traffic Flow for configuration

Geographic Calculation:
- For AWS resources: Region location
- For non-AWS: Specify latitude/longitude
- Calculates distance from user to each resource

Bias Impact:
Bias +50: Expands region by ~50% more area
Bias -50: Shrinks region by ~50% less area

Use Cases:
- Load balancing with geographic preference
- Gradual traffic shifting between regions
- Testing new regions with small percentage
- Optimizing data center utilization

Example:
www.example.com (Geoproximity policy)
├── us-east-1: Bias +20 (expand coverage)
├── eu-west-1: Bias 0 (neutral)
└── ap-south-1: Bias -30 (reduce coverage, testing phase)

Effect:
- US East attracts users from broader area
- Europe gets normal proximity-based traffic  
- Asia Pacific handles smaller area (test phase)
- Allows gradual traffic increase to new regions
```
**7. Politique de routage des réponses à valeurs multiples :**

Renvoie plusieurs valeurs en réponse aux requêtes DNS avec vérification de l'état :
```
Behavior:
- Returns up to 8 healthy records randomly
- Health check on each record
- Only returns healthy records
- Client chooses from returned values

Comparison to Simple Routing:
Simple: Returns all values, no health checking
Multivalue: Returns only healthy values (up to 8)

Use Cases:
- Multiple web servers
- Simple load distribution
- Basic health checking
- Alternative to ELB for simple scenarios

Example:
www.example.com (Multivalue policy)
├── Record 1: 192.0.2.1 (Health: Healthy)
├── Record 2: 192.0.2.2 (Health: Unhealthy) ← Not returned
├── Record 3: 192.0.2.3 (Health: Healthy)
├── Record 4: 192.0.2.4 (Health: Healthy)
└── Record 5: 192.0.2.5 (Health: Healthy)

Query Response: Returns IPs 1, 3, 4, 5 (up to 8 healthy)
Client picks one randomly

Not a Load Balancer Replacement:
- No session affinity
- No SSL termination
- No layer 7 routing
- Limited to DNS-level distribution
```
**Matrice de comparaison des politiques de routage :**
```
┌─────────────────┬──────────────┬────────────┬─────────────┬────────────┐
│ Policy          │ Health Check │ Use Case   │ Complexity  │ Best For   │
├─────────────────┼──────────────┼────────────┼─────────────┼────────────┤
│ Simple          │ No           │ Basic      │ Simplest    │ Dev/Test   │
│ Weighted        │ Yes          │ A/B Test   │ Low         │ Migration  │
│ Latency         │ Yes          │ Global     │ Medium      │ Performance│
│ Failover        │ Required     │ HA/DR      │ Low         │ Uptime     │
│ Geolocation     │ Yes          │ Compliance │ Medium      │ Regional   │
│ Geoproximity    │ Yes          │ Fine-tune  │ High        │ Advanced   │
│ Multivalue      │ Yes          │ Simple LB  │ Low         │ Basic HA   │
└─────────────────┴──────────────┴────────────┴─────────────┴────────────┘
```
### Bilans de santé

Les vérifications de l'état surveillent la disponibilité des ressources et déclenchent des modifications de routage :

**Types de contrôles de santé :**

**1. Vérifications de l'état des points de terminaison :**
```
Monitor: HTTP/HTTPS/TCP endpoint
Checks: Response code, response time, response body
Configuration:
- Protocol: HTTP, HTTPS, TCP
- Port: Any port (80, 443, custom)
- Path: /health, /api/status
- Interval: 30 seconds (standard) or 10 seconds (fast)
- Failure Threshold: 3 consecutive failures
- Success Threshold: Default (varies by interval)

Health Check Process:
1. Route 53 health checker sends request
2. Endpoint responds (or times out)
3. Evaluates response:
   - HTTP: 2xx or 3xx = healthy
   - HTTPS: SSL handshake + 2xx/3xx = healthy
   - TCP: Connection successful = healthy
4. Track consecutive failures/successes
5. Update health status

String Matching (Optional):
- Check response body contains specific string
- Useful for verifying actual application health
- Example: Check for "status:ok" in JSON response
```
**2. Bilans de santé calculés :**
```
Monitor: Status of other health checks
Logic: Boolean operations (AND, OR, NOT)
Use Case: Complex health scenarios

Example:
Application Healthy = 
  (Database Healthy AND Cache Healthy) OR Backup-DB Healthy

Configuration:
- Child Health Checks: List of health checks to monitor
- Threshold: Minimum number of healthy children
- Operator: Count-based evaluation

Use Cases:
- Application requires multiple services
- Database + Cache + API all must be healthy
- Any one of multiple redundant systems healthy
- Complex dependency relationships
```
**3. Vérifications de l'état des alarmes CloudWatch :**
```
Monitor: CloudWatch alarm state
Triggers: Based on any CloudWatch metric
Use Case: Custom health criteria

Example Scenarios:
- CPU utilization > 90%
- 5xx error rate > 5%
- Database connections > 1000
- Custom application metrics

Integration:
1. Create CloudWatch alarm
2. Create Route 53 health check monitoring alarm
3. Health check status = Alarm state
   - Alarm OK = Healthy
   - Alarm Alarm = Unhealthy
   - Alarm Insufficient Data = Unhealthy
```
**Lieux des contrôles de santé :**

Route 53 effectue des contrôles de santé à partir de plusieurs emplacements mondiaux :
```
Health Check Regions:
- United States (multiple locations)
- Europe (multiple locations)
- Asia Pacific (multiple locations)
- South America
- Africa
- Middle East

Default: Checks from ~15 locations globally
Fast Interval: Checks from ~18 locations

Consensus Evaluation:
- Requires majority of checkers reporting healthy
- Example: 15 checkers, need ≥8 reporting healthy
- Prevents false positives from isolated network issues
- Single checker failure doesn't trigger failover

Recommendation:
- Don't rely on single health checker location
- Configure firewall to allow all Route 53 health checker IPs
- Use CloudWatch metrics to monitor health check status
```
**Bonnes pratiques en matière de configuration de vérification de l'état :**
```
Interval Selection:
Standard (30s):
- Cost: Included in health check price
- Detection: ~90 seconds (3 failures × 30s)
- Use: Most scenarios

Fast (10s):
- Cost: Higher ($1/month vs $0.50/month)
- Detection: ~30 seconds (3 failures × 10s)
- Use: Critical applications needing rapid failover

Failure Threshold:
Low (2-3): Faster failover, more false positives
High (5-10): Slower failover, fewer false positives
Recommended: 3 for most use cases

Health Check Path:
❌ Bad: /
❌ Bad: / (homepage with heavy processing)
✅ Good: /health (lightweight dedicated endpoint)
✅ Good: /api/health (checks dependencies)

Endpoint Requirements:
- Fast response (< 2 seconds)
- Check critical dependencies (database, cache)
- Return 200 OK when healthy
- Return 5xx when unhealthy
- Don't cache health check responses
```
### Enregistrements d'alias et enregistrements CNAME

Un concept critique de la Route 53 qui provoque de fréquentes confusions :

**Enregistrements CNAME (DNS standard) :**
```
What: Creates alias to another domain name
Limitations:
❌ Cannot be used at zone apex (root domain)
   - example.com CNAME → invalid
   - www.example.com CNAME → valid
❌ Cannot coexist with other record types
❌ Incurs DNS query charges for each resolution
❌ Works with any DNS provider

Cost Impact:
Query 1: example.com CNAME → www.example.com ($0.40/million)
Query 2: www.example.com A → 192.0.2.1 ($0.40/million)
Total: 2 queries charged

Example:
www.example.com CNAME → example.com
blog.example.com CNAME → hosting-platform.com
```
**Enregistrements d'alias (spécifiques à la Route 53) :**
```
What: Route 53 extension for AWS resources
Advantages:
✅ Can be used at zone apex (root domain)
✅ Can coexist with other record types
✅ No charge for queries to AWS resources
✅ Native AWS resource integration
✅ Automatic IP address updates

Supported AWS Resources:
- CloudFront distributions
- Elastic Load Balancers (ALB, NLB, CLB)
- S3 website endpoints
- API Gateway
- VPC endpoints
- AWS Global Accelerator
- Another Route 53 record in same hosted zone

Cost Impact:
Query: example.com ALIAS → CloudFront
Cost: Free (no charge for alias queries to AWS resources)

Example:
example.com (Alias) → CloudFront distribution
www.example.com (Alias) → ALB
api.example.com (Alias) → API Gateway
```
**Quand les utiliser :**
```
Use CNAME when:
- Pointing to non-AWS resource
- Subdomain (not zone apex)
- Need standard DNS compatibility
- Pointing to external service

Use Alias when:
- Pointing to AWS resource
- Zone apex (root domain)
- Want to save costs (free queries)
- Need automatic IP updates
- AWS-native integration

Example Decision Tree:
┌─────────────────────────────────────┐
│ Need to route zone apex?            │
├─────────────────┬───────────────────┤
│ Yes             │ No                │
│                 │                   │
│ Pointing to AWS?│ Pointing to AWS? │
│                 │                   │
│ Yes → ALIAS     │ Yes → ALIAS       │
│ No → Cannot use │ No → CNAME        │
│      (DNS limit)│                   │
└─────────────────┴───────────────────┘
```
### Flux de circulation et politiques de circulation

Traffic Flow fournit un éditeur visuel pour les configurations de routage complexes :

**Capacités de flux de trafic :**
```
Visual Policy Editor:
- Drag-and-drop interface
- Combine multiple routing policies
- Complex decision trees
- Version control for policies
- Reusable across hosted zones

Policy Components:
├── Endpoints (targets)
├── Rules (routing decisions)
│   ├── Geolocation rules
│   ├── Geo proximity rules
│   ├── Latency rules
│   ├── Failover rules
│   └── Weighted rules
├── Health checks
└── Combinations of above

Cost:
- $50/month per policy record
- Expensive for simple scenarios
- Cost-effective for complex routing

When to Use:
✅ Complex multi-region architectures
✅ Multiple routing policies combined
✅ Need visual representation
✅ Frequently update routing logic
✅ Reuse policies across domains

When NOT to Use:
❌ Simple routing scenarios
❌ Cost-sensitive applications
❌ Single routing policy sufficient
❌ Static routing configuration
```
**Exemple de scénario de flux de trafic :**
```
Global E-commerce Site Requirements:
1. Route users to nearest region (latency-based)
2. Within region, distribute across AZs (weighted)
3. Failover to backup region if primary unhealthy
4. Special handling for EU users (compliance)
5. Gradually migrate traffic to new infrastructure

Traffic Flow Policy:
                    [User Request]
                          │
                    [Geolocation]
                          │
          ┌───────────────┼───────────────┐
          │               │               │
      [Europe]       [Americas]      [Asia-Pacific]
          │               │               │
    [Compliance     [Latency-Based   [Latency-Based
     Routing]        Routing]         Routing]
          │               │               │
    [eu-west-1]    [us-east-1]     [ap-southeast-1]
          │               │               │
     [Weighted]      [Weighted]      [Weighted]
          │               │               │
    ┌─────┴──────┐  ┌────┴─────┐  ┌─────┴──────┐
    │            │  │          │  │            │
[AZ-a 60%] [AZ-b 40%] [Old 20%] [New 80%] [AZ-a] [AZ-b]
    │            │  │          │  │            │
 [Health     [Health  [Health  [Health  [Health  [Health
  Check]      Check]   Check]   Check]   Check]   Check]
    │            │  │          │  │            │
[Failover]  [Failover] [Failover] [Failover] [Failover] [Failover]
    │            │  │          │  │            │
[Backup]    [Backup] [Backup] [Backup] [Backup] [Backup]

This complex logic requires Traffic Flow
Simple routing policies cannot achieve this
```
### DNSSEC (extensions de sécurité DNS)

DNSSEC ajoute des signatures cryptographiques aux enregistrements DNS, empêchant ainsi l'usurpation d'identité DNS et l'empoisonnement du cache :

**Concepts DNSSEC :**
```
Problem Without DNSSEC:
User requests: www.bank.com
Attacker intercepts DNS response
Attacker provides fake IP (attacker's server)
User connects to phishing site
User credentials stolen

How DNSSEC Prevents This:
1. DNS records are digitally signed
2. Signatures verified using public key cryptography
3. Chain of trust from root to domain
4. Tampered records detected and rejected

DNSSEC Record Types:
- RRSIG: Signature for record set
- DNSKEY: Public key for verification
- DS: Delegation signer (links child to parent)
- NSEC/NSEC3: Authenticated denial of existence

Trust Chain:
Root Zone (signed by ICANN)
    ↓
.com TLD (signed by root)
    ↓
example.com (signed by .com)
    ↓
www.example.com (signed by example.com)

Each level verifies signature of next level
```
**DNSSEC sur la route 53 :**
```
Route 53 DNSSEC Support:
✅ Signing: Route 53 can sign hosted zones
✅ Validation: Route 53 resolvers validate DNSSEC
✅ Key Management: Integrated with KMS

Enabling DNSSEC:
1. Enable signing in Route 53 hosted zone
2. Route 53 generates KSK (Key Signing Key)
3. Route 53 generates ZSK (Zone Signing Key)
4. Add DS record to parent zone (.com registrar)
5. DNSSEC chain of trust established

Key Rotation:
- ZSK: Rotated automatically
- KSK: Rotate manually (recommended yearly)
- Zero-downtime rotation process

Cost:
- $0.50/month per hosted zone
- $0.10/month per KSK stored in KMS
- CloudWatch alarm for KSK rotation: Free

Limitations:
- Cannot use with some older DNS resolvers
- Adds complexity to DNS troubleshooting
- Larger DNS responses
- Not supported with all registrars
```
**Considérations relatives au déploiement DNSSEC :**
```
When to Enable DNSSEC:
✅ Financial services
✅ Healthcare applications
✅ E-commerce sites
✅ Government systems
✅ High-security requirements
✅ Compliance mandates

When NOT to Enable:
❌ Development/test environments
❌ Internal-only domains
❌ Legacy system compatibility issues
❌ No security requirements
❌ Registrar doesn't support DS records

Monitoring DNSSEC:
- CloudWatch alarms for key rotation
- Test DNSSEC validation regularly
- Monitor for signing errors
- Test from DNSSEC-aware resolvers
- Have rollback plan ready
```
## Implémentation pratique

### Atelier 1 : Configuration de domaine de base avec plusieurs types d'enregistrement
```bash
# Create hosted zone
aws route53 create-hosted-zone \
    --name example.com \
    --caller-reference $(date +%s) \
    --hosted-zone-config Comment="Production domain"

# Create A record for root domain
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'

# Create www subdomain pointing to same IP
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "www.example.com",
          "Type": "A",
          "TTL": 300,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'
```
### Atelier 2 : Configuration du basculement
```bash
# Create health check
HEALTH_CHECK_ID=$(aws route53 create-health-check \
    --health-check-config \
        Type=HTTPS,\
        ResourcePath=/health,\
        FullyQualifiedDomainName=primary.example.com,\
        Port=443,\
        RequestInterval=30,\
        FailureThreshold=3 \
    --query 'HealthCheck.Id' \
    --output text)

# Primary record with health check
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "Primary",
          "Failover": "PRIMARY",
          "HealthCheckId": "'$HEALTH_CHECK_ID'",
          "TTL": 60,
          "ResourceRecords": [{"Value": "192.0.2.1"}]
        }
      }]
    }'

# Secondary record (backup)
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "Secondary",
          "Failover": "SECONDARY",
          "TTL": 60,
          "ResourceRecords": [{"Value": "198.51.100.1"}]
        }
      }]
    }'
```
## Conseils \& Bonnes pratiques

**Astuce 1 : Réduisez la durée de vie avant les modifications**
Réduisez le TTL à 60 secondes 24 heures avant d’apporter des modifications pour une propagation plus rapide.

**Astuce 2 : Utilisez les enregistrements d'alias pour les ressources AWS**
Utilisez toujours des enregistrements d'alias (et non CNAME) pour CloudFront, ALB, S3 : c'est gratuit et fonctionne au sommet de la zone.

**Astuce 3 : Mettez en œuvre des vérifications de l'état pour tous les basculements**
N'utilisez jamais le routage de basculement sans vérifications de l'état : Route 53 ne saura pas quand basculer.

**Astuce 4 : tester les procédures de basculement**
Testez régulièrement les échecs du contrôle de santé pour vérifier que le basculement fonctionne comme prévu.

**Astuce 5 : Utilisez des zones hébergées privées pour les ressources internes**
Conservez les noms de ressources internes dans des zones hébergées privées, distinctes du DNS public.

## Pièges \& Remèdes

**Piège 1 : retards de propagation du DNS**
*Problème :* Les modifications mettent des heures à se propager à l'échelle mondiale.
*Solution :* Réduisez la durée de vie avant les modifications, attendez que l'ancienne durée de vie expire avant d'apporter des modifications.

**Piège 2 : faux positifs du bilan de santé**
*Problème :* Les contrôles d'état signalent un état malsain alors que la ressource est réellement saine.
*Solution :* Ajoutez les adresses IP du vérificateur de santé Route 53 à la liste blanche, assurez-vous que le chemin revient rapidement et augmentez le seuil d'échec.

**Piège 3 : Utiliser CNAME pour Zone Apex**
*Problème :* Impossible de créer un enregistrement CNAME pour le domaine racine (restriction DNS RFC).
*Solution :* Utilisez des enregistrements d'alias pour le sommet de la zone.

## Questions de révision

1. **Origine du nom de la Route 53 ?** Port TCP/UDP 53
2. **Coût d'enregistrement d'alias pour les ressources AWS ?** Gratuit
3. **Le routage de basculement est requis ?** Bilan de santé sur le serveur principal
4. **Intervalle maximal de contrôle de santé ?** 30 secondes (standard)
5. **CNAME au sommet de la zone ?** Non autorisé (utiliser un alias)

***
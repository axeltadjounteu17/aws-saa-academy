# Chapitre 13 : ElastiCache \& MemoryDB

##Présentation

Les magasins de données en mémoire offrent des temps de réponse de l'ordre de l'ordre de la microseconde en conservant les données dans la RAM plutôt que sur le disque, offrant ainsi des performances 10 à 100 fois plus rapides que les bases de données traditionnelles. Amazon ElastiCache et Amazon MemoryDB for Redis proposent des bases de données en mémoire entièrement gérées qui accélèrent les performances des applications grâce à la mise en cache, au stockage de sessions, à l'analyse en temps réel et au courtage de messages. Alors que les bases de données excellent en matière de stockage durable et persistant, les magasins en mémoire excellent en termes de rapidité, en exécutant des millions d'opérations par seconde avec une latence inférieure à la milliseconde.

ElastiCache prend en charge deux moteurs : Redis et Memcached. Redis est un magasin de structures de données en mémoire riche en fonctionnalités prenant en charge les chaînes, les hachages, les listes, les ensembles, les ensembles triés, etc., avec persistance, réplication et messagerie pub/sub en option. Memcached est un magasin de valeurs-clés multithread plus simple, axé uniquement sur la mise en cache avec partitionnement automatique. Redis offre des fonctionnalités avancées telles que les opérations atomiques, les scripts Lua et les transactions, tandis que Memcached excelle dans la mise en cache simple avec une surcharge minimale. Comprendre quand utiliser chaque moteur et comment implémenter des modèles de mise en cache appropriés permet de distinguer l'utilisation de base du cache des implémentations de niveau production.

Amazon MemoryDB for Redis est une base de données en mémoire durable et compatible Redis qui combine la vitesse de Redis avec la durabilité des bases de données traditionnelles. Contrairement à ElastiCache (principalement un cache), MemoryDB fournit à la fois des fonctionnalités de base de données principales et une mise en cache, conservant les données sur les déploiements multi-AZ avec journalisation des transactions. Cela fait de MemoryDB une base de données principale adaptée aux applications nécessitant des lectures en microsecondes, des écritures en millisecondes à un chiffre et une forte cohérence – des cas d'utilisation tels que les classements de jeux, l'inventaire en temps réel et les services financiers.

Ce chapitre fournit une couverture complète d'ElastiCache et de MemoryDB, des principes fondamentaux aux modèles de production. Vous apprendrez la comparaison Redis vs Memcached, les stratégies de mise en cache (mise en cache, écriture directe, chargement différé), les modes de cluster, la réplication, les options de persistance, la gestion des connexions, les modèles d'invalidation du cache, la gestion des sessions, l'analyse en temps réel et la surveillance. Que vous ajoutiez une mise en cache à des applications existantes ou construisiez des systèmes en temps réel, la maîtrise des bases de données en mémoire est essentielle pour offrir des performances exceptionnelles.

## Théorie \&Concepts

### Principes fondamentaux d'ElastiCache

**Qu'est-ce qu'ElastiCache ?**

ElastiCache est un service de mise en cache en mémoire entièrement géré prenant en charge les moteurs Redis et Memcached.

**Principales caractéristiques :**

- **Latence en microsecondes :** Performances de lecture/écriture inférieures à la milliseconde
- **Évolutivité :** millions d'opérations par seconde
- **Haute disponibilité :** Multi-AZ avec basculement automatique (Redis)
- **Entièrement géré :** Provisionnement, correctifs et sauvegardes automatisés
- **Conformité :** Chiffrement au repos et en transit
- **Surveillance :** Intégration des métriques CloudWatch

**Cas d'utilisation :**
```
1. Database Caching: Reduce database load, improve response times
2. Session Storage: Centralized session management across app servers
3. Real-time Analytics: Leaderboards, counting, trending data
4. Message Queuing: Pub/sub messaging, task queues
5. Geospatial Data: Location-based services with Redis geospatial
6. Rate Limiting: Track API usage, throttle requests
```
**ElastiCache vs base de données :**


| Fonctionnalité | ÉlastiCache | Base de données |
| :-- | :-- | :-- |
| **Stockage** | RAM (volatile) | Disque (persistant) |
| **Vitesse** | Microsecondes | Millisecondes |
| **Capacité** | Limité par la RAM (Go) | Grand (To) |
| **Durabilité** | Facultatif (Redis) | Intégré |
| **Coût par Go** | Supérieur | Inférieur |
| **Cas d'utilisation** | Vitesse critique | Stockage persistant |

### Redis contre Memcached

**Fonctionnalités Redis :**
```
Data Structures:
- Strings: Simple key-value
- Hashes: Field-value pairs (like objects)
- Lists: Ordered collections
- Sets: Unique unordered collections
- Sorted Sets: Ordered by score
- Bitmaps, HyperLogLogs, Streams

Advanced Features:
- Persistence: RDB snapshots, AOF logs
- Replication: Master-replica with automatic failover
- Transactions: Multi-command atomic operations
- Pub/Sub: Message broadcasting
- Lua Scripting: Server-side logic
- Geospatial: Location queries
- Cluster Mode: Horizontal scaling (up to 500 nodes)
```
**Fonctionnalités Memcached :**
```
Simplicity:
- Key-value store only
- Simple strings
- Multithreaded: Better multi-core CPU utilization
- Automatic sharding across nodes

Limitations:
- No persistence
- No replication
- No complex data types
- No transactions
- No pub/sub
```
**Matrice de décision Redis vs Memcached :**


| Facteur | Rédis | Memcaché |
| :-- | :-- | :-- |
| **Types de données** | Chaînes, listes, ensembles, hachages, ensembles triés | Cordes uniquement |
| **Persistance** | Oui (facultatif) | Non |
| **Réplication** | Oui | Non |
| **Multi-AZ** | Oui | Non |
| **Pub/Sous** | Oui | Non |
| **Opérations** | Oui | Non |
| **Enfilage** | Monothread | Multithread |
| **Cas d'utilisation** | Mise en cache complexe, sessions, analyses | Mise en cache simple |
| **Quand utiliser** | Besoin de durabilité, données complexes, HA | Cache simple, performances multicœurs |

**Recommandation:**
```
Choose Redis for:
- Session storage (need persistence)
- Complex data structures
- Pub/sub messaging
- Sorted data (leaderboards)
- High availability requirements
- Most production use cases

Choose Memcached for:
- Pure caching (no persistence needed)
- Large multi-core instances
- Simpler requirements
- Legacy compatibility
```
### Stratégies de mise en cache

**1. Chargement paresseux (Cache-Aside) :**
```python
# Application manages cache
# Cache only when requested

def get_user(user_id):
    """
    Lazy loading pattern
    """
    
    # 1. Try cache first
    cache_key = f"user:{user_id}"
    cached_user = redis.get(cache_key)
    
    if cached_user:
        # Cache hit
        return json.loads(cached_user)
    
    # 2. Cache miss - query database
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # 3. Store in cache for next time
    redis.setex(
        cache_key,
        3600,  # TTL: 1 hour
        json.dumps(user)
    )
    
    return user

# Pros:
# - Only cache what's needed
# - Cache miss doesn't break app (resilient)
# - Simple to implement

# Cons:
# - Initial request slow (cache miss penalty)
# - Stale data possible
# - Cache miss creates temporary load spike
```
**2. Écriture directe :**
```python
# Write to cache AND database simultaneously

def update_user(user_id, user_data):
    """
    Write-through pattern
    """
    
    # 1. Write to database
    db.execute(
        "UPDATE users SET name = ?, email = ? WHERE id = ?",
        user_data['name'], user_data['email'], user_id
    )
    
    # 2. Write to cache (ensure cache is up-to-date)
    cache_key = f"user:{user_id}"
    redis.setex(
        cache_key,
        3600,
        json.dumps(user_data)
    )
    
    return user_data

# Pros:
# - Cache always up-to-date
# - No stale data
# - Read performance consistent

# Cons:
# - Write latency increased (2 operations)
# - Caches data that may never be read
# - More complex error handling
```
**3. Écriture différée (écriture différée) :**
```python
# Write to cache immediately, database asynchronously

def update_user_writebehind(user_id, user_data):
    """
    Write-behind pattern
    """
    
    # 1. Write to cache immediately
    cache_key = f"user:{user_id}"
    redis.setex(cache_key, 3600, json.dumps(user_data))
    
    # 2. Queue database write asynchronously
    queue.send({
        'action': 'update_user',
        'user_id': user_id,
        'data': user_data
    })
    
    return user_data  # Return immediately

# Background worker processes queue
def process_db_writes():
    while True:
        message = queue.receive()
        if message['action'] == 'update_user':
            db.execute(
                "UPDATE users SET ... WHERE id = ?",
                message['user_id']
            )

# Pros:
# - Fastest write performance
# - Reduced database load
# - Batch writes possible

# Cons:
# - Data loss risk (if cache fails before DB write)
# - Complex implementation
# - Eventual consistency
```
**4. Expiration de la durée de vie (TTL) :**
```python
# Automatic cache invalidation after time period

# Set with TTL
redis.setex("product:123", 300, json.dumps(product))  # 5 minutes

# Set without expiration
redis.set("permanent:data", value)

# Add expiration to existing key
redis.expire("key", 3600)  # 1 hour

# Remove expiration
redis.persist("key")

# Check TTL
ttl = redis.ttl("key")  # Returns seconds remaining
```
**5. Invalidation du cache lors de la mise à jour :**
```python
# Delete cache when data changes

def update_product(product_id, product_data):
    """
    Invalidate cache on update
    """
    
    # 1. Update database
    db.execute("UPDATE products SET ... WHERE id = ?", product_id)
    
    # 2. Delete cache entry (will be repopulated on next read)
    redis.delete(f"product:{product_id}")
    
    # 3. Also invalidate related caches
    redis.delete(f"products:category:{product_data['category']}")
    redis.delete("products:featured")

# Lazy loading will repopulate cache on next read
```
**Sélection de la stratégie de mise en cache :**
```
Lazy Loading: Best for most use cases (resilient, simple)
Write-Through: When cache must always be current
Write-Behind: When write performance is critical
TTL: For data that changes periodically
Invalidation: For data that changes unpredictably
```
### Modes de cluster Redis

**Cluster désactivé (un seul fragment) :**
```
Architecture:
Primary Node (writes)
    ↓
Replica Node 1 (reads)
Replica Node 2 (reads)

Features:
- All data on single shard
- Up to 5 replicas
- Automatic failover to replica
- Maximum size: Based on instance type
- Simpler to manage

Use when:
- Dataset fits in single node memory
- Don't need horizontal scaling
- Simpler operations preferred
```
**Cluster activé (multi-fragments) :**
```
Architecture:
Shard 1 (Partition 0-5460)
├── Primary
└── Replica

Shard 2 (Partition 5461-10922)
├── Primary
└── Replica

Shard 3 (Partition 10923-16383)
├── Primary
└── Replica

Features:
- Data partitioned across shards
- Up to 500 nodes (90 shards with 5 replicas each)
- Horizontal scaling
- Automatic resharding
- Higher complexity

Use when:
- Dataset > single node capacity
- Need > 500 GB
- Require > 250K ops/sec
- Want to scale horizontally

Hash Slot Calculation:
slot = CRC16(key) mod 16384
```
**Comparaison des modes de cluster :**


| Fonctionnalité | Désactivé | Activé |
| :-- | :-- | :-- |
| **Éclats** | 1 | 1-90 |
| **Répliques par fragment** | 0-5 | 0-5 |
| **Nœuds maximum** | 6 | 500 |
| **Mémoire maximale** | ~600 Go | ~150+ To |
| **Mise à l'échelle** | Vertical uniquement | Horizontal + Vertical |
| **Multi-AZ** | Oui | Oui |
| **Opérations** | Plus simple | Plus complexe |
| **Coût** | Inférieur | Supérieur |

### Amazon MemoryDB pour Redis

**MemoryDB contre ElastiCache :**
```
ElastiCache Redis (Cache):
- Primary use: Caching layer
- Durability: Optional (snapshots)
- Writes: Asynchronous replication
- Use as: Cache in front of database

MemoryDB (Database):
- Primary use: Primary database
- Durability: Transaction log (Multi-AZ)
- Writes: Durable, persisted before response
- Use as: Primary database with microsecond reads
```
**Architecture MemoryDB :**
```
Client Application
    ↓
MemoryDB Cluster Endpoint
    ↓
Primary Node (writes)
├── Transaction Log (durable Multi-AZ)
└── Replicas (reads)
    ↓
S3 (backups, snapshots)

Write Path:
1. Client writes to primary
2. Written to transaction log (Multi-AZ)
3. Acknowledge to client (durable)
4. Asynchronously replicate to replicas

Read Path:
1. Client reads from primary or replicas
2. Microsecond latency from memory
```
**Fonctionnalités de MemoryDB :**

- **Durabilité :** Journal des transactions multi-AZ
- **Performance :** Lectures en microsecondes, écritures en ms à un chiffre
- **Compatibilité :** Compatible Redis 6.2+
- **Mise à l'échelle :** Mise à l'échelle verticale et horizontale
- **Haute disponibilité :** Basculement automatique
- **Sauvegardes :** Récupération à un moment précis

**Quand utiliser MemoryDB :**
```
Use MemoryDB as primary database when:
- Need microsecond read latency
- Require Redis data structures
- Want durability without separate DB
- Building real-time applications:
  * Gaming (leaderboards, session state)
  * Financial services (fraud detection, trading)
  * Real-time inventory
  * IoT (device state, telemetry)

Use ElastiCache when:
- Need cache layer only
- Have existing database
- Want lowest cost
- Don't need durability
```
### Persistance des données (Redis uniquement)

**RDB (sauvegarde de la base de données Redis) :**
```
Point-in-time snapshots of entire dataset

Configuration:
save 900 1      # Save after 900 sec if 1 key changed
save 300 10     # Save after 300 sec if 10 keys changed
save 60 10000   # Save after 60 sec if 10000 keys changed

Pros:
- Compact single file
- Faster restarts
- Good for backups
- Minimal performance impact

Cons:
- Data loss between snapshots
- Fork() can pause Redis briefly
- Not for real-time durability
```
**AOF (fichier en annexe uniquement) :**
```
Logs every write operation

Configuration:
appendonly yes
appendfsync always    # Sync every write (slow, safest)
appendfsync everysec  # Sync every second (recommended)
appendfsync no        # OS decides (fast, least safe)

Pros:
- Minimal data loss (1 second max)
- Append-only (corruption resistant)
- Auto-rewrite when too large

Cons:
- Larger files than RDB
- Slower restarts
- Higher performance overhead
```
**Stratégie de persistance :**
```
No Persistence:
- Pure cache
- Fastest performance
- Data loss on restart acceptable

RDB Only:
- Periodic backups sufficient
- Some data loss acceptable
- Fast restarts important

AOF Only:
- Minimal data loss required
- Real-time durability needed

RDB + AOF (Both):
- Maximum durability
- Best of both worlds
- ElastiCache default (recommended)
```
## Implémentation pratique

### Atelier 1 : Création d'un cluster Redis

**Objectif :** Déployez un cluster Redis prêt pour la production avec réplication et Multi-AZ.
```bash
# Create subnet group
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name redis-subnet-group \
    --cache-subnet-group-description "Production Redis subnet group" \
    --subnet-ids subnet-1a subnet-1b subnet-1c

# Create security group
REDIS_SG=$(aws ec2 create-security-group \
    --group-name redis-cluster-sg \
    --description "Redis cluster security group" \
    --vpc-id vpc-12345678 \
    --query 'GroupId' \
    --output text)

# Allow Redis port from application tier
aws ec2 authorize-security-group-ingress \
    --group-id $REDIS_SG \
    --protocol tcp \
    --port 6379 \
    --source-group sg-app-tier

# Create parameter group
aws elasticache create-cache-parameter-group \
    --cache-parameter-group-name redis7-production \
    --cache-parameter-group-family redis7 \
    --description "Production Redis 7 parameters"

# Configure parameters
aws elasticache modify-cache-parameter-group \
    --cache-parameter-group-name redis7-production \
    --parameter-name-values \
        "ParameterName=maxmemory-policy,ParameterValue=allkeys-lru" \
        "ParameterName=timeout,ParameterValue=300" \
        "ParameterName=tcp-keepalive,ParameterValue=300"

# Create replication group (cluster mode disabled)
aws elasticache create-replication-group \
    --replication-group-id production-redis \
    --replication-group-description "Production Redis cluster" \
    --engine redis \
    --engine-version 7.0 \
    --cache-node-type cache.r7g.large \
    --num-cache-clusters 3 \
    --automatic-failover-enabled \
    --multi-az-enabled \
    --cache-subnet-group-name redis-subnet-group \
    --security-group-ids $REDIS_SG \
    --cache-parameter-group-name redis7-production \
    --snapshot-retention-limit 7 \
    --snapshot-window "03:00-05:00" \
    --preferred-maintenance-window "sun:05:00-sun:07:00" \
    --at-rest-encryption-enabled \
    --transit-encryption-enabled \
    --auth-token "SecureAuthToken123!" \
    --tags Key=Environment,Value=Production

# Wait for cluster to be available
aws elasticache wait replication-group-available \
    --replication-group-id production-redis

# Get cluster endpoint
PRIMARY_ENDPOINT=$(aws elasticache describe-replication-groups \
    --replication-group-id production-redis \
    --query 'ReplicationGroups[0].NodeGroups[0].PrimaryEndpoint.Address' \
    --output text)

READER_ENDPOINT=$(aws elasticache describe-replication-groups \
    --replication-group-id production-redis \
    --query 'ReplicationGroups[0].NodeGroups[0].ReaderEndpoint.Address' \
    --output text)

echo "Primary Endpoint: $PRIMARY_ENDPOINT:6379"
echo "Reader Endpoint: $READER_ENDPOINT:6379"
```
**Créer le mode de cluster activé (partagé) :**
```bash
# For larger datasets requiring horizontal scaling

aws elasticache create-replication-group \
    --replication-group-id production-redis-sharded \
    --replication-group-description "Sharded Redis cluster" \
    --engine redis \
    --engine-version 7.0 \
    --cache-node-type cache.r7g.xlarge \
    --cache-subnet-group-name redis-subnet-group \
    --security-group-ids $REDIS_SG \
    --automatic-failover-enabled \
    --multi-az-enabled \
    --num-node-groups 3 \
    --replicas-per-node-group 2 \
    --cache-parameter-group-name redis7-production \
    --snapshot-retention-limit 7 \
    --at-rest-encryption-enabled \
    --transit-encryption-enabled \
    --auth-token "SecureAuthToken123!"

# Configuration endpoint (cluster mode)
CLUSTER_ENDPOINT=$(aws elasticache describe-replication-groups \
    --replication-group-id production-redis-sharded \
    --query 'ReplicationGroups[0].ConfigurationEndpoint.Address' \
    --output text)

echo "Cluster Endpoint: $CLUSTER_ENDPOINT:6379"
```
### Atelier 2 : Implémentation de modèles de mise en cache

**Objectif :** Implémenter des modèles de mise en cache de production dans l'application.
```python
# cache_manager.py
import redis
import json
import time
from functools import wraps
from datetime import timedelta

class CacheManager:
    """
    Production-grade cache manager with multiple patterns
    """
    
    def __init__(self, host, port=6379, password=None, ssl=True):
        """
        Initialize Redis connection with connection pooling
        """
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            password=password,
            ssl=ssl,
            ssl_cert_reqs='required',
            decode_responses=True,
            max_connections=50,
            socket_keepalive=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True
        )
        
        self.redis = redis.Redis(connection_pool=self.pool)
    
    def cache_aside(self, key, fetch_func, ttl=3600):
        """
        Lazy loading / cache-aside pattern
        
        Args:
            key: Cache key
            fetch_func: Function to fetch data on cache miss
            ttl: Time to live in seconds
        """
        
        # Try cache first
        cached_value = self.redis.get(key)
        
        if cached_value:
            # Cache hit
            return json.loads(cached_value)
        
        # Cache miss - fetch from source
        value = fetch_func()
        
        # Store in cache
        if value is not None:
            self.redis.setex(
                key,
                ttl,
                json.dumps(value)
            )
        
        return value
    
    def cache_decorator(self, ttl=3600, key_prefix=''):
        """
        Decorator for caching function results
        
        Usage:
            @cache_manager.cache_decorator(ttl=300, key_prefix='user')
            def get_user(user_id):
                return db.query(...)
        """
        
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key from function name and arguments
                key_parts = [key_prefix or func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = ':'.join(key_parts)
                
                # Use cache-aside pattern
                return self.cache_aside(
                    cache_key,
                    lambda: func(*args, **kwargs),
                    ttl
                )
            
            return wrapper
        return decorator
    
    def write_through(self, key, value, update_func, ttl=3600):
        """
        Write-through pattern
        
        Args:
            key: Cache key
            value: Value to write
            update_func: Function to update database
            ttl: Cache TTL
        """
        
        # 1. Update database first
        result = update_func(value)
        
        # 2. Update cache
        self.redis.setex(
            key,
            ttl,
            json.dumps(result)
        )
        
        return result
    
    def invalidate(self, pattern):
        """
        Invalidate cache keys matching pattern
        
        Args:
            pattern: Redis pattern (e.g., 'user:*')
        """
        
        # Scan and delete matching keys
        cursor = 0
        deleted_count = 0
        
        while True:
            cursor, keys = self.redis.scan(
                cursor,
                match=pattern,
                count=100
            )
            
            if keys:
                self.redis.delete(*keys)
                deleted_count += len(keys)
            
            if cursor == 0:
                break
        
        return deleted_count
    
    def get_or_set_with_lock(self, key, fetch_func, ttl=3600, lock_timeout=10):
        """
        Prevent cache stampede with distributed lock
        
        Cache stampede: Multiple requests all miss cache simultaneously,
        all query database, overwhelming it.
        
        Solution: First request acquires lock, others wait
        """
        
        # Try to get from cache
        cached_value = self.redis.get(key)
        if cached_value:
            return json.loads(cached_value)
        
        # Cache miss - try to acquire lock
        lock_key = f"lock:{key}"
        lock_acquired = self.redis.set(
            lock_key,
            '1',
            nx=True,  # Only set if doesn't exist
            ex=lock_timeout
        )
        
        if lock_acquired:
            try:
                # We got the lock - fetch data
                value = fetch_func()
                
                if value is not None:
                    self.redis.setex(key, ttl, json.dumps(value))
                
                return value
            
            finally:
                # Release lock
                self.redis.delete(lock_key)
        
        else:
            # Someone else has lock - wait and retry
            for _ in range(10):  # Wait up to 1 second
                time.sleep(0.1)
                
                cached_value = self.redis.get(key)
                if cached_value:
                    return json.loads(cached_value)
            
            # Still not cached - fetch directly (fallback)
            return fetch_func()
    
    def cache_with_tags(self, key, value, tags, ttl=3600):
        """
        Cache with tags for grouped invalidation
        
        Example: Cache all products for category
        When category changes, invalidate all related products
        """
        
        pipe = self.redis.pipeline()
        
        # Set value
        pipe.setex(key, ttl, json.dumps(value))
        
        # Add to tag sets
        for tag in tags:
            tag_key = f"tag:{tag}"
            pipe.sadd(tag_key, key)
            pipe.expire(tag_key, ttl)
        
        pipe.execute()
    
    def invalidate_by_tag(self, tag):
        """
        Invalidate all keys associated with tag
        """
        
        tag_key = f"tag:{tag}"
        
        # Get all keys with this tag
        keys = self.redis.smembers(tag_key)
        
        if keys:
            # Delete all keys and tag set
            self.redis.delete(*keys, tag_key)
            return len(keys)
        
        return 0

# Usage examples
cache = CacheManager(
    host='production-redis.abcdef.0001.use1.cache.amazonaws.com',
    password='SecureAuthToken123!'
)

# Pattern 1: Cache-aside
def get_user_from_db(user_id):
    """Simulated database query"""
    return {'id': user_id, 'name': 'John Doe'}

user = cache.cache_aside(
    f'user:{user_id}',
    lambda: get_user_from_db(user_id),
    ttl=300
)

# Pattern 2: Decorator
@cache.cache_decorator(ttl=600, key_prefix='product')
def get_product(product_id):
    """Function is automatically cached"""
    return db.query("SELECT * FROM products WHERE id = ?", product_id)

product = get_product(123)  # First call: DB query + cache
product = get_product(123)  # Second call: From cache

# Pattern 3: Write-through
def update_product_in_db(product_data):
    db.execute("UPDATE products SET ... WHERE id = ?", product_data['id'])
    return product_data

cache.write_through(
    f'product:{product_id}',
    product_data,
    update_product_in_db,
    ttl=600
)

# Pattern 4: Cache stampede prevention
popular_product = cache.get_or_set_with_lock(
    f'product:{popular_id}',
    lambda: get_product_from_db(popular_id),
    ttl=60
)

# Pattern 5: Tagged caching
cache.cache_with_tags(
    f'product:{product_id}',
    product_data,
    tags=[f'category:{product_data["category"]}', 'products'],
    ttl=600
)

# Invalidate all products in category
cache.invalidate_by_tag(f'category:{category_id}')
```
### Atelier 3 : Gestion des sessions

**Objectif :** Implémentez un stockage de session centralisé avec Redis.
```python
# session_manager.py
import redis
import uuid
import json
from datetime import timedelta

class SessionManager:
    """
    Centralized session management with Redis
    """
    
    def __init__(self, redis_host, password=None):
        self.redis = redis.Redis(
            host=redis_host,
            port=6379,
            password=password,
            ssl=True,
            decode_responses=True
        )
        self.default_ttl = 3600  # 1 hour
    
    def create_session(self, user_id, session_data, ttl=None):
        """
        Create new user session
        
        Returns:
            session_id: Unique session identifier
        """
        
        session_id = str(uuid.uuid4())
        session_key = f"session:{session_id}"
        
        # Store session data
        session_data['user_id'] = user_id
        session_data['created_at'] = time.time()
        
        self.redis.setex(
            session_key,
            ttl or self.default_ttl,
            json.dumps(session_data)
        )
        
        # Add to user's sessions list
        user_sessions_key = f"user_sessions:{user_id}"
        self.redis.sadd(user_sessions_key, session_id)
        self.redis.expire(user_sessions_key, ttl or self.default_ttl)
        
        return session_id
    
    def get_session(self, session_id):
        """
        Retrieve session data
        """
        
        session_key = f"session:{session_id}"
        session_data = self.redis.get(session_key)
        
        if session_data:
            # Refresh TTL on access (sliding expiration)
            self.redis.expire(session_key, self.default_ttl)
            return json.loads(session_data)
        
        return None
    
    def update_session(self, session_id, session_data):
        """
        Update session data
        """
        
        session_key = f"session:{session_id}"
        
        # Get existing data
        existing = self.get_session(session_id)
        if not existing:
            return False
        
        # Merge updates
        existing.update(session_data)
        
        # Update in Redis
        self.redis.setex(
            session_key,
            self.default_ttl,
            json.dumps(existing)
        )
        
        return True
    
    def delete_session(self, session_id):
        """
        Delete session (logout)
        """
        
        # Get session to find user_id
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Delete session
        session_key = f"session:{session_id}"
        self.redis.delete(session_key)
        
        # Remove from user's sessions
        user_sessions_key = f"user_sessions:{session['user_id']}"
        self.redis.srem(user_sessions_key, session_id)
        
        return True
    
    def delete_all_user_sessions(self, user_id):
        """
        Delete all sessions for user (logout everywhere)
        """
        
        user_sessions_key = f"user_sessions:{user_id}"
        session_ids = self.redis.smembers(user_sessions_key)
        
        if session_ids:
            # Delete all session keys
            session_keys = [f"session:{sid}" for sid in session_ids]
            self.redis.delete(*session_keys, user_sessions_key)
            
            return len(session_ids)
        
        return 0
    
    def get_active_sessions_count(self, user_id):
        """
        Get count of active sessions for user
        """
        
        user_sessions_key = f"user_sessions:{user_id}"
        return self.redis.scard(user_sessions_key)

# Flask integration example
from flask import Flask, request, jsonify

app = Flask(__name__)
session_mgr = SessionManager(redis_host='redis-endpoint')

@app.route('/login', methods=['POST'])
def login():
    """Login and create session"""
    
    user_id = request.json['user_id']
    
    # Authenticate user (simplified)
    # ... authentication logic ...
    
    # Create session
    session_data = {
        'username': request.json['username'],
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent')
    }
    
    session_id = session_mgr.create_session(user_id, session_data)
    
    return jsonify({'session_id': session_id})

@app.route('/api/protected', methods=['GET'])
def protected_route():
    """Protected API requiring valid session"""
    
    session_id = request.headers.get('X-Session-ID')
    
    if not session_id:
        return jsonify({'error': 'No session'}), 401
    
    # Validate session
    session = session_mgr.get_session(session_id)
    
    if not session:
        return jsonify({'error': 'Invalid session'}), 401
    
    # Session valid - process request
    return jsonify({
        'message': 'Access granted',
        'user_id': session['user_id']
    })

@app.route('/logout', methods=['POST'])
def logout():
    """Logout and delete session"""
    
    session_id = request.headers.get('X-Session-ID')
    
    if session_mgr.delete_session(session_id):
        return jsonify({'message': 'Logged out'})
    
    return jsonify({'error': 'Session not found'}), 404

@app.route('/logout-all', methods=['POST'])
def logout_all():
    """Logout from all devices"""
    
    session_id = request.headers.get('X-Session-ID')
    session = session_mgr.get_session(session_id)
    
    if not session:
        return jsonify({'error': 'Invalid session'}), 401
    
    count = session_mgr.delete_all_user_sessions(session['user_id'])
    
    return jsonify({
        'message': f'Logged out from {count} devices'
    })
```
## Connaissances au niveau de la production

### Analyses en temps réel avec Redis

**Mise en œuvre du classement :**
```python
# leaderboard.py
import redis
from datetime import datetime

class Leaderboard:
    """
    Real-time gaming leaderboard using Redis sorted sets
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def add_score(self, game_id, player_id, score, timestamp=None):
        """
        Add player score to leaderboard
        Uses sorted set with score as ranking value
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        
        # Store in sorted set (score is the sort value)
        self.redis.zadd(leaderboard_key, {player_id: score})
        
        # Store player details separately
        player_key = f"player:{game_id}:{player_id}"
        self.redis.hset(player_key, mapping={
            'score': score,
            'last_updated': timestamp or datetime.utcnow().isoformat()
        })
        
        # Set expiration (30 days for inactive leaderboards)
        self.redis.expire(leaderboard_key, 30 * 86400)
        self.redis.expire(player_key, 30 * 86400)
    
    def get_top_players(self, game_id, limit=10):
        """
        Get top N players
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        
        # Get top players (highest scores)
        top_players = self.redis.zrevrange(
            leaderboard_key,
            0,
            limit - 1,
            withscores=True
        )
        
        # Format results
        results = []
        for rank, (player_id, score) in enumerate(top_players, start=1):
            player_key = f"player:{game_id}:{player_id}"
            player_info = self.redis.hgetall(player_key)
            
            results.append({
                'rank': rank,
                'player_id': player_id,
                'score': int(score),
                'last_updated': player_info.get('last_updated')
            })
        
        return results
    
    def get_player_rank(self, game_id, player_id):
        """
        Get player's current rank
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        
        # Get rank (0-indexed, so add 1)
        rank = self.redis.zrevrank(leaderboard_key, player_id)
        
        if rank is None:
            return None
        
        # Get score
        score = self.redis.zscore(leaderboard_key, player_id)
        
        return {
            'rank': rank + 1,
            'player_id': player_id,
            'score': int(score)
        }
    
    def get_players_around(self, game_id, player_id, context=5):
        """
        Get players ranked around specific player
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        
        # Get player's rank
        rank = self.redis.zrevrank(leaderboard_key, player_id)
        
        if rank is None:
            return []
        
        # Get players around this rank
        start = max(0, rank - context)
        end = rank + context
        
        players = self.redis.zrevrange(
            leaderboard_key,
            start,
            end,
            withscores=True
        )
        
        results = []
        for i, (pid, score) in enumerate(players):
            results.append({
                'rank': start + i + 1,
                'player_id': pid,
                'score': int(score),
                'is_current_player': pid == player_id
            })
        
        return results
    
    def get_total_players(self, game_id):
        """
        Get total number of players
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        return self.redis.zcard(leaderboard_key)
    
    def get_score_distribution(self, game_id, ranges):
        """
        Get count of players in score ranges
        
        Example ranges: [(0, 1000), (1001, 5000), (5001, 10000)]
        """
        
        leaderboard_key = f"leaderboard:{game_id}"
        
        distribution = {}
        
        for min_score, max_score in ranges:
            count = self.redis.zcount(
                leaderboard_key,
                min_score,
                max_score
            )
            
            distribution[f"{min_score}-{max_score}"] = count
        
        return distribution

# Usage
redis_client = redis.Redis(host='redis-endpoint', decode_responses=True)
leaderboard = Leaderboard(redis_client)

# Add scores
leaderboard.add_score('game-001', 'player-123', 15000)
leaderboard.add_score('game-001', 'player-456', 12000)
leaderboard.add_score('game-001', 'player-789', 18000)

# Get top 10 players
top_players = leaderboard.get_top_players('game-001', limit=10)
print("Top players:", top_players)

# Get player rank
player_rank = leaderboard.get_player_rank('game-001', 'player-123')
print(f"Player rank: {player_rank['rank']} with score {player_rank['score']}")

# Get players around specific player
context = leaderboard.get_players_around('game-001', 'player-123', context=5)
print("Players around:", context)
```
**Comptage et statistiques en temps réel :**
```python
# analytics.py
import redis
from datetime import datetime, timedelta

class RealTimeAnalytics:
    """
    Real-time analytics using Redis data structures
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def increment_counter(self, metric_name, increment=1):
        """
        Increment counter (page views, API calls, etc.)
        """
        
        key = f"counter:{metric_name}"
        return self.redis.incrby(key, increment)
    
    def increment_time_series(self, metric_name, timestamp=None):
        """
        Increment time-series counter (hourly, daily metrics)
        """
        
        if not timestamp:
            timestamp = datetime.utcnow()
        
        # Multiple time resolutions
        hour_key = f"metric:{metric_name}:hour:{timestamp.strftime('%Y-%m-%d-%H')}"
        day_key = f"metric:{metric_name}:day:{timestamp.strftime('%Y-%m-%d')}"
        month_key = f"metric:{metric_name}:month:{timestamp.strftime('%Y-%m')}"
        
        pipe = self.redis.pipeline()
        
        # Increment all resolutions
        pipe.incr(hour_key)
        pipe.expire(hour_key, 7 * 86400)  # 7 days retention
        
        pipe.incr(day_key)
        pipe.expire(day_key, 90 * 86400)  # 90 days retention
        
        pipe.incr(month_key)
        pipe.expire(month_key, 365 * 86400)  # 1 year retention
        
        pipe.execute()
    
    def get_metric(self, metric_name, resolution='day', date=None):
        """
        Get metric value for specific time period
        """
        
        if not date:
            date = datetime.utcnow()
        
        if resolution == 'hour':
            key = f"metric:{metric_name}:hour:{date.strftime('%Y-%m-%d-%H')}"
        elif resolution == 'day':
            key = f"metric:{metric_name}:day:{date.strftime('%Y-%m-%d')}"
        elif resolution == 'month':
            key = f"metric:{metric_name}:month:{date.strftime('%Y-%m')}"
        
        value = self.redis.get(key)
        return int(value) if value else 0
    
    def get_metric_range(self, metric_name, start_date, end_date, resolution='day'):
        """
        Get metric values for date range
        """
        
        results = []
        current_date = start_date
        
        while current_date <= end_date:
            value = self.get_metric(metric_name, resolution, current_date)
            
            results.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'value': value
            })
            
            if resolution == 'hour':
                current_date += timedelta(hours=1)
            elif resolution == 'day':
                current_date += timedelta(days=1)
            elif resolution == 'month':
                # Add month (simplified)
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
        
        return results
    
    def track_unique_visitors(self, metric_name, visitor_id):
        """
        Track unique visitors using HyperLogLog
        """
        
        today = datetime.utcnow().strftime('%Y-%m-%d')
        key = f"unique:{metric_name}:{today}"
        
        # Add to HyperLogLog (probabilistic counting)
        self.redis.pfadd(key, visitor_id)
        self.redis.expire(key, 90 * 86400)  # 90 days retention
    
    def get_unique_count(self, metric_name, date=None):
        """
        Get unique visitor count
        """
        
        if not date:
            date = datetime.utcnow()
        
        key = f"unique:{metric_name}:{date.strftime('%Y-%m-%d')}"
        return self.redis.pfcount(key)
    
    def record_event(self, event_type, event_data):
        """
        Record event in Redis stream for processing
        """
        
        stream_key = f"events:{event_type}"
        
        # Add to stream
        event_id = self.redis.xadd(
            stream_key,
            event_data,
            maxlen=10000  # Keep last 10k events
        )
        
        return event_id
    
    def top_n_items(self, category, item_id, score=1):
        """
        Track top N items (products, articles, etc.)
        """
        
        key = f"top:{category}"
        
        # Increment score
        self.redis.zincrby(key, score, item_id)
        
        # Keep only top 100
        self.redis.zremrangebyrank(key, 0, -101)
    
    def get_top_items(self, category, limit=10):
        """
        Get top N items
        """
        
        key = f"top:{category}"
        
        return self.redis.zrevrange(
            key,
            0,
            limit - 1,
            withscores=True
        )

# Usage
analytics = RealTimeAnalytics(redis_client)

# Track page view
analytics.increment_counter('page_views')
analytics.increment_time_series('page_views')

# Track unique visitor
analytics.track_unique_visitors('site_visitors', 'user-123')

# Get today's unique visitors
unique_count = analytics.get_unique_count('site_visitors')
print(f"Unique visitors today: {unique_count}")

# Track popular products
analytics.top_n_items('products', 'product-456', score=1)

# Get top products
top_products = analytics.get_top_items('products', limit=10)
print("Top products:", top_products)

# Record event
analytics.record_event('purchase', {
    'user_id': 'user-123',
    'product_id': 'product-456',
    'amount': '99.99'
})
```
### Implémentation de la limitation de débit
```python
# rate_limiter.py
import redis
import time

class RateLimiter:
    """
    Rate limiting using Redis
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def fixed_window(self, key, limit, window_seconds):
        """
        Fixed window rate limiting
        
        Example: 100 requests per minute
        """
        
        current_window = int(time.time() / window_seconds)
        window_key = f"rate_limit:fixed:{key}:{current_window}"
        
        pipe = self.redis.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, window_seconds * 2)  # Keep for 2 windows
        results = pipe.execute()
        
        current_count = results[0]
        
        return {
            'allowed': current_count <= limit,
            'current': current_count,
            'limit': limit,
            'remaining': max(0, limit - current_count),
            'reset_after': window_seconds - (int(time.time()) % window_seconds)
        }
    
    def sliding_window(self, key, limit, window_seconds):
        """
        Sliding window rate limiting (more accurate)
        
        Uses sorted set with timestamps
        """
        
        now = time.time()
        window_start = now - window_seconds
        
        key = f"rate_limit:sliding:{key}"
        
        pipe = self.redis.pipeline()
        
        # Remove old entries
        pipe.zremrangebyscore(key, 0, window_start)
        
        # Count entries in current window
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiration
        pipe.expire(key, window_seconds)
        
        results = pipe.execute()
        current_count = results[1]
        
        return {
            'allowed': current_count < limit,
            'current': current_count + 1,
            'limit': limit,
            'remaining': max(0, limit - current_count - 1)
        }
    
    def token_bucket(self, key, capacity, refill_rate, refill_period):
        """
        Token bucket rate limiting
        
        Args:
            capacity: Maximum tokens
            refill_rate: Tokens added per period
            refill_period: Seconds between refills
        """
        
        bucket_key = f"rate_limit:token:{key}"
        
        # Get current bucket state
        bucket_data = self.redis.hgetall(bucket_key)
        
        now = time.time()
        
        if bucket_data:
            tokens = float(bucket_data['tokens'])
            last_refill = float(bucket_data['last_refill'])
        else:
            tokens = capacity
            last_refill = now
        
        # Calculate refill
        time_passed = now - last_refill
        refills = int(time_passed / refill_period)
        
        if refills > 0:
            tokens = min(capacity, tokens + (refills * refill_rate))
            last_refill = now
        
        # Try to consume token
        if tokens >= 1:
            tokens -= 1
            allowed = True
        else:
            allowed = False
        
        # Update bucket
        self.redis.hset(bucket_key, mapping={
            'tokens': tokens,
            'last_refill': last_refill
        })
        
        self.redis.expire(bucket_key, refill_period * 10)
        
        return {
            'allowed': allowed,
            'tokens_remaining': tokens,
            'capacity': capacity
        }
    
    def check_rate_limit(self, user_id, endpoint, method='sliding_window'):
        """
        Comprehensive rate limiting
        """
        
        # Different limits for different endpoints
        limits = {
            'api_general': {'limit': 100, 'window': 60},  # 100/min
            'api_write': {'limit': 10, 'window': 60},     # 10/min
            'api_read': {'limit': 1000, 'window': 60},    # 1000/min
        }
        
        config = limits.get(endpoint, {'limit': 100, 'window': 60})
        key = f"{user_id}:{endpoint}"
        
        if method == 'fixed_window':
            return self.fixed_window(key, config['limit'], config['window'])
        elif method == 'sliding_window':
            return self.sliding_window(key, config['limit'], config['window'])
        else:
            return self.token_bucket(key, config['limit'], config['limit'], config['window'])

# Flask middleware example
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)
rate_limiter = RateLimiter(redis_client)

def rate_limit(endpoint_type='api_general'):
    """
    Rate limiting decorator
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Get user ID from authentication
            user_id = request.headers.get('X-User-ID', request.remote_addr)
            
            # Check rate limit
            result = rate_limiter.check_rate_limit(user_id, endpoint_type)
            
            if not result['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'limit': result['limit'],
                    'reset_after': result.get('reset_after', 60)
                }), 429
            
            # Add rate limit headers
            response = f(*args, **kwargs)
            if isinstance(response, tuple):
                response = response[0]
            
            response.headers['X-RateLimit-Limit'] = str(result['limit'])
            response.headers['X-RateLimit-Remaining'] = str(result['remaining'])
            
            return response
        
        return wrapper
    return decorator

@app.route('/api/data')
@rate_limit('api_read')
def get_data():
    return jsonify({'data': 'example'})

@app.route('/api/update', methods=['POST'])
@rate_limit('api_write')
def update_data():
    return jsonify({'success': True})
```
### Gestion de la mémoire

**Stratégies d'optimisation de la mémoire :**
```python
# memory_manager.py
import redis

class MemoryManager:
    """
    Manage Redis memory efficiently
    """
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def get_memory_stats(self):
        """
        Get current memory usage
        """
        
        info = self.redis.info('memory')
        
        return {
            'used_memory': info['used_memory'],
            'used_memory_human': info['used_memory_human'],
            'used_memory_peak': info['used_memory_peak'],
            'used_memory_peak_human': info['used_memory_peak_human'],
            'maxmemory': info.get('maxmemory', 0),
            'maxmemory_human': info.get('maxmemory_human', 'unlimited'),
            'mem_fragmentation_ratio': info['mem_fragmentation_ratio'],
            'evicted_keys': info.get('evicted_keys', 0)
        }
    
    def analyze_key_space(self, pattern='*', sample_size=100):
        """
        Analyze key space to find memory hogs
        """
        
        key_stats = []
        cursor = 0
        sampled = 0
        
        while sampled < sample_size:
            cursor, keys = self.redis.scan(cursor, match=pattern, count=10)
            
            for key in keys:
                # Get key type and size
                key_type = self.redis.type(key)
                
                # Estimate memory usage
                if key_type == 'string':
                    size = len(self.redis.get(key) or '')
                elif key_type == 'hash':
                    size = sum(len(k) + len(v) for k, v in self.redis.hgetall(key).items())
                elif key_type == 'list':
                    size = sum(len(v) for v in self.redis.lrange(key, 0, -1))
                elif key_type == 'set':
                    size = sum(len(v) for v in self.redis.smembers(key))
                elif key_type == 'zset':
                    size = sum(len(v) for v, _ in self.redis.zrange(key, 0, -1, withscores=True))
                else:
                    size = 0
                
                key_stats.append({
                    'key': key,
                    'type': key_type,
                    'size': size,
                    'ttl': self.redis.ttl(key)
                })
                
                sampled += 1
                if sampled >= sample_size:
                    break
            
            if cursor == 0:
                break
        
        # Sort by size
        key_stats.sort(key=lambda x: x['size'], reverse=True)
        
        return key_stats[:20]  # Top 20 largest keys
    
    def set_eviction_policy(self, policy='allkeys-lru'):
        """
        Configure eviction policy
        
        Policies:
        - noeviction: Return error when memory limit reached
        - allkeys-lru: Evict least recently used keys
        - allkeys-lfu: Evict least frequently used keys
        - volatile-lru: Evict LRU keys with TTL
        - volatile-lfu: Evict LFU keys with TTL
        - volatile-ttl: Evict keys with shortest TTL
        - volatile-random: Randomly evict keys with TTL
        - allkeys-random: Randomly evict keys
        """
        
        self.redis.config_set('maxmemory-policy', policy)
        
        return self.redis.config_get('maxmemory-policy')
    
    def cleanup_expired_keys(self):
        """
        Force cleanup of expired keys
        """
        
        # Redis lazily deletes expired keys
        # This scans and deletes explicitly
        
        cleaned = 0
        cursor = 0
        
        while True:
            cursor, keys = self.redis.scan(cursor, count=100)
            
            for key in keys:
                ttl = self.redis.ttl(key)
                if ttl == -2:  # Key doesn't exist (expired)
                    cleaned += 1
            
            if cursor == 0:
                break
        
        return cleaned
    
    def compress_data(self, key, value):
        """
        Store compressed data to save memory
        """
        
        import gzip
        import base64
        
        # Compress
        compressed = gzip.compress(value.encode('utf-8'))
        encoded = base64.b64encode(compressed).decode('utf-8')
        
        # Store with flag
        self.redis.hset(f"compressed:{key}", mapping={
            'data': encoded,
            'compressed': 'true'
        })
    
    def get_compressed_data(self, key):
        """
        Retrieve and decompress data
        """
        
        import gzip
        import base64
        
        data = self.redis.hget(f"compressed:{key}", 'data')
        
        if data:
            decoded = base64.b64decode(data)
            decompressed = gzip.decompress(decoded)
            return decompressed.decode('utf-8')
        
        return None

# Usage
mem_manager = MemoryManager(redis_client)

# Check memory usage
stats = mem_manager.get_memory_stats()
print(f"Memory used: {stats['used_memory_human']}")
print(f"Fragmentation ratio: {stats['mem_fragmentation_ratio']}")

# Find large keys
large_keys = mem_manager.analyze_key_space()
print("Largest keys:")
for key_info in large_keys[:5]:
    print(f"  {key_info['key']}: {key_info['size']} bytes ({key_info['type']})")

# Set eviction policy
mem_manager.set_eviction_policy('allkeys-lru')
```
## Conseils \& Bonnes pratiques

### Conseils de gestion des connexions

**Astuce 1 : Utilisez le regroupement de connexions**
```python
# Always use connection pools for production

# BAD: Creating new connection for each request
def get_user(user_id):
    r = redis.Redis(host='redis-endpoint')  # New connection
    return r.get(f'user:{user_id}')

# GOOD: Use connection pool
pool = redis.ConnectionPool(
    host='redis-endpoint',
    port=6379,
    max_connections=50,
    socket_keepalive=True,
    socket_connect_timeout=5
)

redis_client = redis.Redis(connection_pool=pool)

def get_user(user_id):
    return redis_client.get(f'user:{user_id}')  # Reuse connection
```
**Astuce 2 : Configurer les délais d'attente**
```python
# Set appropriate timeouts to prevent hanging

redis_client = redis.Redis(
    host='redis-endpoint',
    socket_connect_timeout=5,  # Connection timeout
    socket_timeout=5,           # Read/write timeout
    socket_keepalive=True,
    socket_keepalive_options={
        socket.TCP_KEEPIDLE: 60,
        socket.TCP_KEEPINTVL: 10,
        socket.TCP_KEEPCNT: 3
    },
    retry_on_timeout=True,      # Retry on timeout
    health_check_interval=30    # Check connection health
)
```
**Astuce 3 : Gérer les échecs de connexion avec élégance**
```python
# Implement fallback for cache failures

def get_with_fallback(key, fallback_func):
    """
    Try cache, fall back to source on failure
    """
    try:
        cached = redis_client.get(key)
        if cached:
            return json.loads(cached)
    except redis.ConnectionError:
        # Redis unavailable - continue without cache
        logger.warning("Redis unavailable, using fallback")
    except Exception as e:
        logger.error(f"Cache error: {e}")
    
    # Get from source (database)
    return fallback_func()
```
### Conseils sur les modèles de mise en cache

**Astuce 4 : définissez toujours le TTL**
```python
# Prevent unbounded cache growth

# BAD: No TTL (cache never expires)
redis.set('key', value)

# GOOD: Always set TTL
redis.setex('key', 3600, value)  # 1 hour

# Or use default TTL helper
def cache_set(key, value, ttl=3600):
    redis.setex(key, ttl, json.dumps(value))
```
**Astuce 5 : Utilisez Pipeline pour les opérations groupées**
```python
# Reduce network round trips

# BAD: Multiple individual commands
for i in range(1000):
    redis.set(f'key:{i}', f'value{i}')
# 1000 network round trips

# GOOD: Use pipeline
pipe = redis.pipeline()
for i in range(1000):
    pipe.set(f'key:{i}', f'value{i}')
pipe.execute()
# 1 network round trip
```
**Astuce 6 : implémentez le réchauffement du cache**
```python
# Pre-populate cache for critical data

def warm_cache():
    """
    Pre-load frequently accessed data into cache
    """
    
    # Get frequently accessed data
    popular_products = db.query("SELECT * FROM products WHERE featured = true")
    
    pipe = redis.pipeline()
    
    for product in popular_products:
        key = f'product:{product["id"]}'
        pipe.setex(key, 3600, json.dumps(product))
    
    pipe.execute()
    
    logger.info(f"Warmed cache with {len(popular_products)} products")

# Run on application startup
warm_cache()

# Or schedule periodically
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(warm_cache, 'interval', hours=1)
scheduler.start()
```
### Conseils de surveillance

**Astuce 7 : Surveillez les indicateurs clés**
```python
# Set up CloudWatch alarms

cloudwatch = boto3.client('cloudwatch')

# CPU utilization
cloudwatch.put_metric_alarm(
    AlarmName='Redis-HighCPU',
    MetricName='CPUUtilization',
    Namespace='AWS/ElastiCache',
    Statistic='Average',
    Period=300,
    EvaluationPeriods=2,
    Threshold=75,
    ComparisonOperator='GreaterThanThreshold',
    Dimensions=[
        {'Name': 'CacheClusterId', 'Value': 'production-redis-001'}
    ]
)

# Memory usage
cloudwatch.put_metric_alarm(
    AlarmName='Redis-HighMemory',
    MetricName='DatabaseMemoryUsagePercentage',
    Namespace='AWS/ElastiCache',
    Statistic='Average',
    Period=300,
    EvaluationPeriods=2,
    Threshold=90,
    ComparisonOperator='GreaterThanThreshold'
)

# Evictions (indicates memory pressure)
cloudwatch.put_metric_alarm(
    AlarmName='Redis-Evictions',
    MetricName='Evictions',
    Namespace='AWS/ElastiCache',
    Statistic='Sum',
    Period=300,
    EvaluationPeriods=1,
    Threshold=100,
    ComparisonOperator='GreaterThanThreshold'
)
```
**Astuce 8 : Surveiller le taux de réussite du cache**
```python
# Track cache effectiveness

def track_cache_metrics(operation, hit):
    """
    Track cache hit/miss metrics
    """
    
    cloudwatch = boto3.client('cloudwatch')
    
    cloudwatch.put_metric_data(
        Namespace='CustomApp/Cache',
        MetricData=[
            {
                'MetricName': 'CacheHits' if hit else 'CacheMisses',
                'Value': 1,
                'Unit': 'Count',
                'Dimensions': [
                    {'Name': 'Operation', 'Value': operation}
                ]
            }
        ]
    )

def get_with_metrics(key, fallback_func):
    """
    Get from cache with metrics tracking
    """
    
    cached = redis.get(key)
    
    if cached:
        track_cache_metrics('get_user', hit=True)
        return json.loads(cached)
    
    track_cache_metrics('get_user', hit=False)
    
    # Fetch from source
    value = fallback_func()
    
    # Cache for next time
    redis.setex(key, 3600, json.dumps(value))
    
    return value

# Calculate hit ratio
# Hit Ratio = Hits / (Hits + Misses)
# Target: > 90% for effective caching
```
### Conseils sur les performances

**Astuce 9 : Choisissez la bonne structure de données**
```python
# Use appropriate Redis data type for use case

# Counters: Use INCR
redis.incr('page_views')  # Atomic increment

# Sets: Use for unique items
redis.sadd('users:online', 'user123')  # O(1) add
redis.sismember('users:online', 'user123')  # O(1) check

# Sorted Sets: Use for rankings
redis.zadd('leaderboard', {'player1': 100, 'player2': 200})
redis.zrevrank('leaderboard', 'player2')  # Get rank O(log N)

# Hashes: Use for objects
redis.hset('user:123', mapping={'name': 'John', 'email': 'john@example.com'})
redis.hgetall('user:123')  # Get all fields

# Lists: Use for queues
redis.rpush('queue:jobs', 'job1')  # Enqueue
redis.lpop('queue:jobs')  # Dequeue

# Strings: Use for simple key-value
redis.set('config:timeout', '30')
```
**Astuce 10 : Utilisez les scripts Lua pour les opérations atomiques**
```python
# Atomic operations with Lua scripting

# Example: Atomic get-and-decrement for inventory
lua_script = """
local key = KEYS[1]
local decrement = tonumber(ARGV[1])

local current = tonumber(redis.call('GET', key) or '0')

if current >= decrement then
    redis.call('DECRBY', key, decrement)
    return current - decrement
else
    return -1
end
"""

# Register script
decrement_inventory = redis.register_script(lua_script)

# Execute atomically
remaining = decrement_inventory(keys=['inventory:product123'], args=[1])

if remaining >= 0:
    print(f"Purchase successful, {remaining} remaining")
else:
    print("Insufficient inventory")
```
## Pièges \& Remèdes

### Piège 1 : problèmes d'invalidation du cache

**Problème :** Données périmées servies à partir du cache après les mises à jour de la base de données.

**Pourquoi cela arrive :**

- Pas d'invalidation du cache en écriture
- Les mises à jour asynchrones ne sont pas reflétées dans le cache
- Plusieurs clés de cache non invalidées
- TTL trop long pour modifier les données

**Impact :**

- Les utilisateurs voient des informations obsolètes
- Incohérence des données
- Erreurs de logique métier
- Réclamations clients

**Remède :**

**Étape 1 : implémenter l'invalidation explicite**
```python
# Invalidate cache on every write

def update_product(product_id, product_data):
    """
    Update product and invalidate cache
    """
    
    # 1. Update database
    db.execute(
        "UPDATE products SET name = ?, price = ? WHERE id = ?",
        product_data['name'], product_data['price'], product_id
    )
    
    # 2. Invalidate related caches
    cache_keys = [
        f'product:{product_id}',
        f'products:category:{product_data["category_id"]}',
        'products:featured',
        'products:all'
    ]
    
    redis.delete(*cache_keys)
    
    # 3. Invalidate by pattern if needed
    cursor = 0
    while True:
        cursor, keys = redis.scan(cursor, match=f'product:{product_id}:*', count=100)
        if keys:
            redis.delete(*keys)
        if cursor == 0:
            break
```
**Étape 2 : Utiliser le cache-aside avec l'écriture directe**
```python
# Combine patterns for consistency

def update_product_consistent(product_id, product_data):
    """
    Ensure cache consistency
    """
    
    try:
        # Start transaction
        db.begin()
        
        # 1. Update database
        db.execute(
            "UPDATE products SET name = ?, price = ? WHERE id = ?",
            product_data['name'], product_data['price'], product_id
        )
        
        # 2. Commit transaction
        db.commit()
        
        # 3. Update cache (after successful DB write)
        cache_key = f'product:{product_id}'
        redis.setex(cache_key, 3600, json.dumps(product_data))
        
        # 4. Invalidate related caches
        redis.delete(f'products:category:{product_data["category_id"]}')
        
    except Exception as e:
        db.rollback()
        # Don't update cache if DB write failed
        raise e
```
**Étape 3 : Utiliser les balises de cache pour l'invalidation de groupe**
```python
# Tag-based invalidation

def cache_with_tags(key, value, tags, ttl=3600):
    """
    Cache with tags for grouped invalidation
    """
    
    pipe = redis.pipeline()
    
    # Set value
    pipe.setex(key, ttl, json.dumps(value))
    
    # Add to tag sets
    for tag in tags:
        tag_key = f'tag:{tag}'
        pipe.sadd(tag_key, key)
        pipe.expire(tag_key, ttl)
    
    pipe.execute()

def invalidate_tag(tag):
    """
    Invalidate all keys with tag
    """
    
    tag_key = f'tag:{tag}'
    keys = redis.smembers(tag_key)
    
    if keys:
        redis.delete(*keys, tag_key)
        return len(keys)
    
    return 0

# Usage
cache_with_tags(
    f'product:{product_id}',
    product_data,
    tags=[f'category:{category_id}', 'products'],
    ttl=600
)

# When category changes, invalidate all products in category
invalidate_tag(f'category:{category_id}')
```
**Prévention :**

- Toujours invalider le cache lors des écritures
- Utilisez des durées de vie plus courtes pour les données qui changent fréquemment
- Implémenter l'invalidation basée sur les balises
- Surveiller l'obsolescence du cache
- Stratégie d'invalidation des documents

***

### Piège 2 : épuisement de la mémoire

**Problème :** Redis manque de mémoire, ce qui entraîne des expulsions ou des échecs.

**Pourquoi cela arrive :**

- Pas de TTL sur les clés (croissance illimitée)
- Mauvaise politique d'expulsion
- Fuites de mémoire à partir de valeurs élevées
- Pas de surveillance de l'utilisation de la mémoire

**Impact :**

- Expulsions de cache (taux de réussite réduit)
- Erreurs d'application (MOO)
- Dégradation des performances
- Pannes de service

**Remède :**

**Étape 1 : Configurer la politique d'expulsion**
```bash
# Set maxmemory and eviction policy

aws elasticache modify-cache-cluster \
    --cache-cluster-id production-redis \
    --cache-parameter-group-name redis7-production

# In parameter group, set:
# maxmemory-policy = allkeys-lru  # Evict LRU keys when memory full
# maxmemory = 6gb  # Set appropriate limit
```
**Étape 2 : Appliquer le TTL sur toutes les clés**
```python
# Wrapper to ensure TTL always set

def safe_set(key, value, ttl=3600):
    """
    Set with mandatory TTL
    """
    if ttl is None:
        raise ValueError("TTL must be specified")
    
    return redis.setex(key, ttl, value)

# Monitor keys without TTL
def find_keys_without_ttl():
    """
    Find keys that will never expire
    """
    
    no_ttl_keys = []
    cursor = 0
    
    while True:
        cursor, keys = redis.scan(cursor, count=100)
        
        for key in keys:
            ttl = redis.ttl(key)
            if ttl == -1:  # No expiration set
                no_ttl_keys.append(key)
        
        if cursor == 0:
            break
    
    return no_ttl_keys

# Fix keys without TTL
def fix_missing_ttls(default_ttl=86400):
    """
    Add TTL to keys missing expiration
    """
    
    keys = find_keys_without_ttl()
    
    for key in keys:
        redis.expire(key, default_ttl)
    
    return len(keys)
```
**Étape 3 : Surveiller l'utilisation de la mémoire**
```python
# Set up memory monitoring

def monitor_memory():
    """
    Monitor Redis memory and alert
    """
    
    info = redis.info('memory')
    
    used_memory = info['used_memory']
    maxmemory = info.get('maxmemory', 0)
    
    if maxmemory > 0:
        usage_pct = (used_memory / maxmemory) * 100
        
        if usage_pct > 90:
            alert = {
                'level': 'CRITICAL',
                'message': f'Redis memory at {usage_pct:.1f}%',
                'used': info['used_memory_human'],
                'max': info['maxmemory_human'],
                'evicted_keys': info.get('evicted_keys', 0)
            }
            
            send_alert(alert)
    
    # Track evictions
    evicted_keys = info.get('evicted_keys', 0)
    
    cloudwatch.put_metric_data(
        Namespace='CustomApp/Redis',
        MetricData=[{
            'MetricName': 'MemoryUsagePercent',
            'Value': usage_pct,
            'Unit': 'Percent'
        }]
    )
    
    return usage_pct

# Run periodically
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()
scheduler.add_job(monitor_memory, 'interval', minutes=5)
scheduler.start()
```
**Prévention :**

- Toujours définir TTL sur les clés
- Configurer une politique d'expulsion appropriée
- Surveiller l'utilisation de la mémoire et les expulsions
- Dimensionner le cluster de manière appropriée
- Utiliser la compression pour les grandes valeurs
- Analyse régulière de l'espace clé

***

### Piège 3 : Troupeau tonitruant (Cache Stampede)

**Problème :** De nombreuses requêtes manquent simultanément le cache, ce qui surcharge la base de données.

**Pourquoi cela arrive :**

- Le cache des objets populaires expire
- De nombreuses demandes arrivent en même temps
- Base de données de requêtes de toutes les demandes
- Base de données débordée

**Impact :**

- Surcharge de base de données
- Temps de réponse lents
- Pannes en cascade
- Panne de service

**Scénario :**
```
T=0: Cache expires for popular product
T=1: 1000 requests arrive simultaneously
T=2: All 1000 requests miss cache
T=3: All 1000 requests query database
T=4: Database overwhelmed, requests fail
```
**Remède :**

**Étape 1 : Utiliser le verrouillage distribué**
```python
# Only one request fetches data, others wait

def get_with_lock(key, fetch_func, ttl=3600, lock_timeout=10):
    """
    Prevent cache stampede with locking
    """
    
    # Try cache first
    cached = redis.get(key)
    if cached:
        return json.loads(cached)
    
    # Cache miss - try to acquire lock
    lock_key = f'lock:{key}'
    lock_acquired = redis.set(
        lock_key,
        '1',
        nx=True,  # Only if doesn't exist
        ex=lock_timeout
    )
    
    if lock_acquired:
        try:
            # We have the lock - fetch data
            value = fetch_func()
            
            if value is not None:
                redis.setex(key, ttl, json.dumps(value))
            
            return value
        
        finally:
            redis.delete(lock_key)
    
    else:
        # Someone else has lock - wait for them
        for i in range(20):  # Wait up to 2 seconds
            time.sleep(0.1)
            
            cached = redis.get(key)
            if cached:
                return json.loads(cached)
        
        # Still no cache - fetch directly (fallback)
        return fetch_func()
```
**Étape 2 : Expiration anticipée probabiliste**
```python
# Refresh cache before it expires for popular items

import random

def get_with_early_refresh(key, fetch_func, ttl=3600, beta=1.0):
    """
    Probabilistic early refresh to prevent stampede
    
    XFetch algorithm: Refresh cache probabilistically before expiration
    """
    
    cached_data = redis.get(key)
    
    if cached_data:
        # Check if should refresh early
        current_ttl = redis.ttl(key)
        
        # Calculate probability of early refresh
        # Higher probability as TTL decreases
        delta = ttl - current_ttl
        probability = delta * beta * random.random() / ttl
        
        if probability > 1:
            # Refresh cache in background
            import threading
            
            def refresh():
                value = fetch_func()
                redis.setex(key, ttl, json.dumps(value))
            
            thread = threading.Thread(target=refresh)
            thread.daemon = True
            thread.start()
        
        return json.loads(cached_data)
    
    # Cache miss - fetch and cache
    value = fetch_func()
    
    if value is not None:
        redis.setex(key, ttl, json.dumps(value))
    
    return value
```
**Étape 3 : Utiliser le modèle obsolète pendant la revalidation**
```python
# Serve stale data while refreshing in background

def get_with_stale_cache(key, fetch_func, ttl=3600, stale_ttl=7200):
    """
    Serve stale cache while refreshing
    """
    
    # Try fresh cache
    cached = redis.get(key)
    if cached:
        return json.loads(cached)
    
    # Try stale cache
    stale_key = f'stale:{key}'
    stale = redis.get(stale_key)
    
    if stale:
        # Serve stale data
        stale_data = json.loads(stale)
        
        # Refresh in background
        import threading
        
        def refresh():
            try:
                value = fetch_func()
                
                # Update fresh cache
                redis.setex(key, ttl, json.dumps(value))
                
                # Update stale cache
                redis.setex(stale_key, stale_ttl, json.dumps(value))
            
            except Exception as e:
                logger.error(f"Background refresh failed: {e}")
        
        thread = threading.Thread(target=refresh)
        thread.daemon = True
        thread.start()
        
        return stale_data
    
    # No cache at all - fetch synchronously
    value = fetch_func()
    
    if value is not None:
        redis.setex(key, ttl, json.dumps(value))
        redis.setex(stale_key, stale_ttl, json.dumps(value))
    
    return value
```
**Prévention :**

- Utilisez le verrouillage distribué pour les éléments populaires
- Implémenter une actualisation précoce probabiliste
- Servir des données obsolètes tout en actualisant
- Surveiller les taux de réussite du cache
- Utilisez un TTL plus long pour des données stables

***

## Résumé du chapitre

Amazon ElastiCache et MemoryDB fournissent des bases de données en mémoire entièrement gérées offrant des performances en microsecondes pour la mise en cache, la gestion des sessions, l'analyse en temps réel et l'accès aux données à haut débit. Comprendre Redis vs Memcached, les stratégies de mise en cache (cache-aside, write-through), les modes de cluster, les options de persistance et la gestion appropriée des connexions sont essentiels pour les déploiements de production. L'invalidation efficace du cache, la gestion de la mémoire et la prévention des bousculades séparent les implémentations de mise en cache fiables des implémentations problématiques.

**Principaux points à retenir :**

- **Choisissez Redis plutôt que Memcached :** Redis offre des structures de données, la persistance, la réplication et la haute disponibilité pour la plupart des cas d'utilisation.
- **Utiliser le regroupement de connexions :** Utilisez toujours des pools pour éviter la surcharge et l'épuisement des connexions.
- **Implémenter le cache-aside :** Modèle le plus polyvalent avec repli vers la source en cas d'échec du cache
- **Toujours définir le TTL :** Empêche la croissance illimitée du cache et les données obsolètes
- **Empêcher les bousculades :** Utilisez le verrouillage distribué ou l'actualisation probabiliste pour les éléments populaires
- **Surveiller la mémoire :** Suivez l'utilisation, les expulsions et définissez une politique d'expulsion appropriée.
- **MemoryDB pour la durabilité :** Utilisez MemoryDB lorsque vous avez besoin de la vitesse de Redis avec la durabilité de la base de données

Comprendre ElastiCache et MemoryDB vous permet de créer des applications hautes performances avec des temps de réponse inférieurs à la milliseconde, traitant des millions de requêtes par seconde tout en réduisant la charge de la base de données.

## Questions de révision

1. **Port par défaut de Redis ?**
a) 3306
b) 5432
c) 6379
d) 27017

**Réponse : C** - Redis écoute sur le port 6379 par défaut.

2. **Nombre maximum de nœuds ElastiCache en mode cluster ?**
une)6
b) 90
c) 500
d) Illimité

**Réponse : C** - Le mode cluster ElastiCache prend en charge jusqu'à 500 nœuds.

3. **Quelle politique d'expulsion supprime les clés les moins récemment utilisées ?**
a) pas d'expulsion
b) allkeys-lru
c) volatile-ttl
d) toutes les clés sont aléatoires

**Réponse : B** - allkeys-lru expulse les clés les moins récemment utilisées de toutes les clés.

4. **Différence principale entre MemoryDB et ElastiCache ?**
a) Performances
b) Durabilité
c) Coût
d) Disponibilité

**Réponse : B** - MemoryDB offre une durabilité avec le journal des transactions multi-AZ.

5. **Structure de données Redis pour les classements ?**
a) Chaîne
b) Liste
c) Ensemble trié
d) Hachage

**Réponse : C** - Les ensembles triés conservent des données ordonnées parfaites pour les classements.

6. **Modèle de mise en cache également appelé ?**
a) Écriture directe
b) Chargement paresseux
c) écriture derrière
d) Le cache d'abord

**Réponse : B** - Le cache-aside est également connu sous le nom de chargement paresseux.

7. **Persistance Redis avec une perte de données minimale ?**
a) RDB uniquement
b) AOF avec chaque seconde
c) Aucune persistance
d) Instantanés uniquement

**Réponse : B** - AOF avec Everysec fsync fournit une perte de données minimale (< 1 seconde).

8. **Avantage Memcached sur Redis ?**
a) Persistance
b) Réplication
c) Multithread
d) Structures de données

**Réponse : C** - Memcached est multithread et utilise mieux les processeurs multicœurs.

9. **Commande Redis pour l'incrément atomique ?**
a) ENSEMBLE
b) INCR
c) AJOUTER
d) AUGMENTATION

**Réponse : B** - INCR incrémente atomiquement un compteur.

10. **ElastiCache Multi-AZ fournit :**
a) Lire la mise à l'échelle
b) Écrire la mise à l'échelle
c) Basculement automatique
d) Réplication interrégionale

**Réponse : C** - Multi-AZ fournit un basculement automatique vers le réplica.

11. **Emplacements de hachage en mode cluster Redis ?**
a) 1024
b) 4096
c) 16384
d) 65536

**Réponse : C** - Le cluster Redis utilise 16 384 emplacements de hachage.

12. **Meilleure stratégie de mise en cache pour les charges de travail lourdes en lecture ?**
a) Écriture directe
b) Écriture derrière
c) Cache-côté (chargement paresseux)
d) Pas de mise en cache

**Réponse : C** - Le cache-aside fonctionne mieux pour les lectures intensives avec des écritures occasionnelles.

13. **Avantage du pipeline Redis ?**
a) Traitement plus rapide
b) Réduction des allers-retours sur le réseau
c) Réduire l'utilisation de la mémoire
d) Meilleure persistance

**Réponse : B** - Pipeline des commandes par lots, réduisant ainsi les allers-retours sur le réseau.

14. **Technique de prévention des bousculades de cache ?**
a) TTL plus grand
b) Plus de mémoire
c) Verrouillage distribué
d) Base de données plus rapide

**Réponse : C** - Le verrouillage distribué empêche plusieurs récupérations simultanées.

15. **Redis TTL -1 signifie :**
a) Expiré
b) Pas d'expiration
c) 1 seconde
d) Clé invalide

**Réponse : B** - TTL -1 indique que la clé n'a pas de date d'expiration définie.

***
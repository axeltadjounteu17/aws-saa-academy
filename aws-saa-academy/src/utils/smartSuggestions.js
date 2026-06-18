// Suggestions par domaine AWS
const DOMAIN_SUGGESTIONS = {
  networking: [
    'Différence entre VPC Peering et Transit Gateway',
    'Quand utiliser un NAT Gateway vs NAT Instance',
    'Comment configurer un VPC Endpoint',
    'Route 53 routing policies expliquées',
    'Différence entre Security Groups et NACLs'
  ],
  compute: [
    'EC2 vs Lambda : quand utiliser quoi ?',
    'Auto Scaling Groups best practices',
    'ECS vs EKS : différences clés',
    'Spot Instances vs Reserved Instances',
    'Fargate vs EC2 pour les conteneurs'
  ],
  storage: [
    'S3 storage classes comparison',
    'EBS vs EFS vs S3 : cas d\'usage',
    'S3 lifecycle policies pour optimiser les coûts',
    'Glacier retrieval options',
    'EBS volume types et performances'
  ],
  database: [
    'RDS Multi-AZ vs Read Replicas',
    'DynamoDB vs RDS : quand utiliser quoi ?',
    'Aurora Serverless use cases',
    'ElastiCache Redis vs Memcached',
    'DynamoDB Global Tables'
  ],
  security: [
    'IAM roles vs IAM users',
    'KMS vs CloudHSM',
    'Security Groups vs NACLs',
    'AWS WAF configuration best practices',
    'Cognito User Pools vs Identity Pools'
  ],
  monitoring: [
    'CloudWatch vs CloudTrail vs Config',
    'CloudWatch Alarms best practices',
    'X-Ray pour le tracing distribué',
    'EventBridge use cases',
    'Systems Manager Session Manager'
  ]
}

// Suggestions générales populaires
const GENERAL_SUGGESTIONS = [
  'Quels sont les 4 domaines de l\'examen SAA-C03 ?',
  'Différence entre Availability Zone et Region',
  'Comment préparer l\'examen en 3 mois ?',
  'Well-Architected Framework : 6 piliers',
  'Services AWS les plus importants pour l\'examen',
  'Stratégies de migration vers AWS (7 Rs)'
]

// Mots-clés pour détecter les domaines
const DOMAIN_KEYWORDS = {
  networking: /vpc|subnet|route|gateway|peering|endpoint|nat|igw|transit|direct.?connect|vpn|elastic.?ip|eni/i,
  compute: /ec2|lambda|ecs|eks|fargate|auto.?scaling|elastic.?beanstalk|batch|lightsail|spot|reserved/i,
  storage: /s3|ebs|efs|fsx|glacier|storage.?gateway|snowball|datasync|backup/i,
  database: /rds|dynamo|aurora|redshift|elasticache|neptune|documentdb|timestream|memorydb/i,
  security: /iam|kms|security|waf|shield|cognito|secrets.?manager|certificate.?manager|guardduty|macie|inspector/i,
  monitoring: /cloudwatch|cloudtrail|config|x-ray|eventbridge|systems.?manager|trusted.?advisor/i
}

/**
 * Détecte le domaine AWS d'une question
 */
export function detectDomain(query) {
  if (!query) return 'general'
  
  const q = query.toLowerCase()
  
  for (const [domain, regex] of Object.entries(DOMAIN_KEYWORDS)) {
    if (regex.test(q)) {
      return domain
    }
  }
  
  return 'general'
}

/**
 * Génère des suggestions intelligentes basées sur l'historique
 */
export function generateSmartSuggestions(chatHistory, currentQuery = '') {
  // Analyser les derniers messages pour détecter les sujets
  const recentTopics = chatHistory
    .slice(-5)
    .map(msg => msg.text || '')
    .join(' ')
  
  const domain = detectDomain(currentQuery || recentTopics)
  
  if (domain !== 'general' && DOMAIN_SUGGESTIONS[domain]) {
    // Retourner 3 suggestions du domaine détecté
    return DOMAIN_SUGGESTIONS[domain].slice(0, 3)
  }
  
  // Suggestions générales
  return GENERAL_SUGGESTIONS.slice(0, 3)
}

/**
 * Génère des suggestions de suivi basées sur la dernière réponse
 */
export function generateFollowUpSuggestions(lastResponse) {
  if (!lastResponse) return []
  
  const suggestions = []
  const text = lastResponse.toLowerCase()
  
  // Détecter les services mentionnés et suggérer des questions liées
  const servicePatterns = [
    { pattern: /vpc/i, suggestion: 'Comment configurer un VPC Peering ?' },
    { pattern: /rds/i, suggestion: 'RDS Multi-AZ vs Read Replicas ?' },
    { pattern: /s3/i, suggestion: 'S3 lifecycle policies et storage classes ?' },
    { pattern: /lambda/i, suggestion: 'Lambda best practices et limitations ?' },
    { pattern: /ec2/i, suggestion: 'EC2 instance types et pricing models ?' },
    { pattern: /dynamo/i, suggestion: 'DynamoDB partition keys et indexes ?' },
    { pattern: /cloudfront/i, suggestion: 'CloudFront vs S3 Transfer Acceleration ?' },
    { pattern: /iam/i, suggestion: 'IAM policies et best practices ?' },
    { pattern: /elb|load.?balancer/i, suggestion: 'ALB vs NLB vs CLB : différences ?' },
    { pattern: /auto.?scaling/i, suggestion: 'Auto Scaling policies et stratégies ?' }
  ]
  
  for (const { pattern, suggestion } of servicePatterns) {
    if (pattern.test(text) && !suggestions.includes(suggestion)) {
      suggestions.push(suggestion)
      if (suggestions.length >= 2) break
    }
  }
  
  // Toujours suggérer d'aller plus loin
  if (suggestions.length < 3) {
    suggestions.push('Montre-moi un lab pratique sur ce sujet')
  }
  if (suggestions.length < 3) {
    suggestions.push('Quelles questions d\'examen portent sur ce concept ?')
  }
  
  return suggestions.slice(0, 3)
}

/**
 * Génère des suggestions contextuelles pour la barre de recherche
 */
export function generateSearchSuggestions(query, recentSearches = []) {
  if (!query || query.length < 2) {
    // Retourner les recherches récentes
    return recentSearches.slice(0, 5)
  }
  
  const q = query.toLowerCase()
  const suggestions = []
  
  // Suggestions basées sur les services AWS populaires
  const awsServices = [
    'VPC', 'EC2', 'S3', 'RDS', 'Lambda', 'DynamoDB', 'CloudFront',
    'Route 53', 'IAM', 'ELB', 'Auto Scaling', 'ECS', 'EKS',
    'CloudWatch', 'CloudTrail', 'KMS', 'Cognito', 'API Gateway',
    'SNS', 'SQS', 'Step Functions', 'EventBridge', 'Kinesis'
  ]
  
  // Filtrer les services qui correspondent
  for (const service of awsServices) {
    if (service.toLowerCase().includes(q)) {
      suggestions.push(service)
    }
  }
  
  // Suggestions de concepts
  const concepts = [
    'Multi-AZ', 'Read Replica', 'Auto Scaling', 'Load Balancing',
    'Encryption', 'VPC Peering', 'Transit Gateway', 'Direct Connect',
    'CloudFormation', 'Elastic Beanstalk', 'Serverless', 'Containers'
  ]
  
  for (const concept of concepts) {
    if (concept.toLowerCase().includes(q) && suggestions.length < 8) {
      suggestions.push(concept)
    }
  }
  
  return suggestions.slice(0, 5)
}

/**
 * Génère des suggestions de questions complètes
 */
export function generateQuestionSuggestions(partialQuery) {
  if (!partialQuery || partialQuery.length < 3) return []
  
  const q = partialQuery.toLowerCase()
  const suggestions = []
  
  // Templates de questions courantes
  const questionTemplates = [
    { trigger: 'différence', template: 'Quelle est la différence entre {service1} et {service2} ?' },
    { trigger: 'quand', template: 'Quand utiliser {service} ?' },
    { trigger: 'comment', template: 'Comment configurer {service} ?' },
    { trigger: 'best', template: '{service} best practices ?' },
    { trigger: 'vs', template: '{service1} vs {service2} : comparaison' }
  ]
  
  for (const { trigger, template } of questionTemplates) {
    if (q.includes(trigger)) {
      // Détecter les services mentionnés
      const services = []
      for (const [domain, regex] of Object.entries(DOMAIN_KEYWORDS)) {
        const matches = partialQuery.match(regex)
        if (matches) {
          services.push(...matches)
        }
      }
      
      if (services.length > 0) {
        let suggestion = template
        if (services.length >= 2) {
          suggestion = suggestion
            .replace('{service1}', services[0])
            .replace('{service2}', services[1])
        } else {
          suggestion = suggestion.replace('{service}', services[0])
        }
        suggestions.push(suggestion)
      }
    }
  }
  
  return suggestions.slice(0, 3)
}

/**
 * Obtient des suggestions basées sur le niveau de l'utilisateur
 */
export function getSuggestionsForLevel(level = 'intermediate') {
  const levelSuggestions = {
    beginner: [
      'Qu\'est-ce qu\'AWS et ses services principaux ?',
      'Différence entre Region et Availability Zone',
      'Comment créer un compte AWS ?',
      'Qu\'est-ce qu\'un VPC ?',
      'Introduction à EC2'
    ],
    intermediate: [
      'Architecture haute disponibilité avec Multi-AZ',
      'Stratégies de scaling et load balancing',
      'Sécurité et IAM best practices',
      'Optimisation des coûts AWS',
      'Serverless vs Containers'
    ],
    advanced: [
      'Architecture multi-région avec Route 53',
      'Disaster Recovery strategies',
      'Microservices avec ECS/EKS',
      'Event-driven architecture avec EventBridge',
      'Well-Architected Framework en pratique'
    ]
  }
  
  return levelSuggestions[level] || levelSuggestions.intermediate
}

// Made with Bob

# Chapitre 2 : Gestion des identités et des accès (IAM)

##Présentation

La gestion des identités et des accès (IAM) est la pierre angulaire de l'architecture de sécurité AWS. Chaque interaction avec AWS, qu'il s'agisse du lancement d'une instance EC2, de la lecture d'un compartiment S3 ou de la mise à jour d'une base de données, nécessite une authentification (prouvant qui vous êtes) et une autorisation (vérifiant ce que vous êtes autorisé à faire). IAM fournit le cadre pour les deux, vous permettant de contrôler l'accès aux ressources AWS avec précision et flexibilité.

Contrairement aux modèles de sécurité traditionnels sur site avec des défenses basées sur le périmètre, AWS fonctionne sur un modèle de sécurité zéro confiance dans lequel l'identité constitue le nouveau périmètre. Ce changement oblige les architectes à penser différemment la sécurité : au lieu de s'appuyer sur les limites du réseau, vous devez explicitement accorder des autorisations pour chaque action sur chaque ressource. Une politique IAM mal configurée peut exposer des données sensibles, permettre une élévation de privilèges ou permettre aux attaquants de prendre pied dans votre infrastructure.

L’importance de l’IAM ne peut être surestimée. Il ne s'agit pas simplement d'une case à cocher lors de la configuration initiale : c'est un composant vivant et respirant de votre architecture qui évolue avec vos applications et votre structure organisationnelle. Une mise en œuvre appropriée de l'IAM permet des stratégies multi-comptes sécurisées, la conformité réglementaire, des déploiements automatisés et une sécurité de défense en profondeur. À l’inverse, les erreurs IAM restent l’une des principales causes de failles de sécurité dans le cloud, depuis les informations d’identification exposées dans les référentiels publics jusqu’aux politiques trop permissives qui accordent un accès involontaire.

Ce chapitre fournit une couverture complète des principes fondamentaux de l'IAM, des modèles avancés et des meilleures pratiques du monde réel. Vous apprendrez à élaborer des politiques précises, à mettre en œuvre un accès entre comptes en toute sécurité, à tirer parti de la fédération d'identité pour l'intégration d'entreprise et à créer des pistes d'audit pour la conformité. Qu'il s'agisse de sécuriser le premier déploiement AWS d'une startup ou de concevoir des solutions d'identité à l'échelle de l'entreprise, la maîtrise de l'IAM n'est pas négociable pour tout architecte de solutions.

## Théorie \&Concepts

### Fondamentaux de l'IAM

IAM est un **service mondial** qui fonctionne dans toutes les régions AWS. Les ressources créées dans IAM (utilisateurs, groupes, rôles et stratégies) sont automatiquement disponibles dans le monde entier. Cette nature globale simplifie la gestion mais nécessite un examen attentif des conflits de noms et de la portée des politiques.

**Principes clés de l'IAM :**

1. **Moyen privilège :** Accordez uniquement les autorisations requises pour effectuer une tâche
2. **Défense en profondeur :** Superposez plusieurs contrôles de sécurité (MFA, politiques réseau, cryptage)
3. **Séparation des tâches :** Distribuez les autorisations entre plusieurs identités pour éviter les abus
4. **Audit régulier :** Examinez et affinez en permanence les autorisations d'accès

### Identités IAM

IAM propose trois types d'identités pour interagir avec les ressources AWS :

#### Utilisateurs IAM

Un utilisateur IAM représente une personne ou une application qui doit interagir avec AWS. Chaque utilisateur dispose d'informations d'identification uniques (mot de passe, clés d'accès) et peut se voir accorder des autorisations spécifiques.

**Caractéristiques :**

- Identité permanente liée à votre compte AWS
- Identifiants à long terme (mots de passe, clés d'accès)
- Maximum de 5 000 utilisateurs par compte AWS
- Doit être utilisé avec parcimonie dans les architectures modernes (préférer les rôles)

**Cas d'utilisation :**

- Employés individuels nécessitant un accès à la console AWS
- Applications héritées qui ne peuvent pas assumer de rôles
- Comptes d'accès d'urgence en cas de bris de verre

**Méthodes d'authentification :**

- **Mot de passe de la console :** Pour l'accès à AWS Management Console
- **Clés d'accès :** Accès programmatique via AWS CLI, SDK ou API
- **Clés SSH :** Pour les référentiels AWS CodeCommit
- **Certificats de serveur :** Pour des services AWS spécifiques

**Meilleures pratiques :**

- Activer MFA pour tous les utilisateurs humains
- Faites pivoter les clés d'accès régulièrement (tous les 90 jours)
- Utilisez des informations d'identification temporaires (rôles) autant que possible
- Mettre en œuvre des politiques de mots de passe fortes


#### Groupes IAM

Les groupes sont des ensembles d'utilisateurs partageant des autorisations communes. Au lieu d'attacher des stratégies à des utilisateurs individuels, attachez-les à des groupes pour une gestion plus facile.

**Caractéristiques:**

- Ne peut pas être imbriqué (les groupes ne peuvent pas contenir d'autres groupes)
- Un utilisateur peut appartenir à plusieurs groupes (jusqu'à 10)
- Les groupes n'ont pas d'informations d'identification : ils sont purement organisationnels
- Maximum de 300 groupes par compte AWS

**Modèles de groupe courants :**
```
Developers Group → ReadOnly policies + specific dev environment access
Admins Group → AdministratorAccess policy
Finance Group → Billing and cost management access
Auditors Group → ReadOnly access to logs and configuration
```
**Important :** Les groupes ne sont pas de véritables identités. Vous ne pouvez pas accorder à un groupe l'accès à une ressource dans une stratégie basée sur les ressources. Les groupes existent uniquement pour organiser les utilisateurs et simplifier l’attachement aux politiques.

#### Rôles IAM

Les rôles sont des identités qui peuvent être assumées par des entités de confiance (utilisateurs, applications, services). Contrairement aux utilisateurs, les rôles ne disposent pas d'informations d'identification permanentes. Au lieu de cela, ils fournissent des informations d'identification de sécurité temporaires lorsqu'ils sont assumés.

**Caractéristiques :**

- Pas d'identifiants permanents (mot de passe ou clés d'accès)
- Peut être assumé par les utilisateurs IAM, les services AWS ou les identités externes
- Fournir des informations d'identification temporaires (valables de 15 minutes à 12 heures)
- Peut être assumé sur tous les comptes AWS
- Aucune limite sur le nombre de rôles par compte

**Types de rôles :**

**1. Rôles de service :**
Autorisez les services AWS à effectuer des actions en votre nom.
```
Example: Lambda execution role allows Lambda to write logs to CloudWatch
EC2 instance role allows application to read from S3
```
**2. Rôles entre comptes :**
Activez l'accès entre les comptes AWS (courant dans les organisations multi-comptes).
```
Example: DevAccount can assume DeploymentRole in ProdAccount
```
**3. Rôles d'utilisateurs fédérés :**
Autorisez les utilisateurs authentifiés par des fournisseurs d'identité externes à accéder à AWS.
```
Example: Corporate AD users assuming AWS roles via SAML federation
```
**4. Rôles liés au service :**
Rôles prédéfinis créés automatiquement par les services AWS.
```
Example: AWSServiceRoleForAutoScaling
Cannot be modified, only deleted when service no longer uses them
```
**Politiques de confiance :**

Chaque rôle possède une politique de confiance (également appelée politique d'assumer le rôle) qui définit qui peut assumer le rôle :
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```
Cette politique de confiance permet aux instances EC2 d'assumer ce rôle.

**Durée de la séance :**

Lorsque vous assumez un rôle, vous spécifiez une durée de session :

- Par défaut : 1 heure
- Maximum : 12 heures (configurable par rôle)
- Minimum : 15 minutes


### Politiques IAM

Les stratégies sont des documents JSON qui définissent les autorisations. Ils répondent à la question : « Quelles actions peuvent être réalisées sur quelles ressources et dans quelles conditions ?

#### Structure de la politique
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```
**Éléments de politique :**

- **Version :** Version linguistique de la politique (utilisez toujours "2012-10-17")
- **Déclaration :** Tableau de déclarations d'autorisation individuelles
- **Sid :** (Facultatif) Identifiant de déclaration pour la documentation
- **Effet :** "Autoriser" ou "Refuser"
- **Principal :** (politiques basées sur les ressources uniquement) À qui la déclaration s'applique
- **Action :** Liste d'actions (par exemple, "s3:GetObject", "ec2:RunInstances")
- **Ressource :** ARN des ressources auxquelles l'instruction s'applique
- **Condition :** (Facultatif) Circonstances dans lesquelles la déclaration s'applique


#### Types de règles

**1. Politiques basées sur l'identité :**

Attaché aux identités IAM (utilisateurs, groupes, rôles). Ils définissent ce que l'identité peut faire.

**Politiques gérées :**

- **AWS Géré :** Créé et maintenu par AWS (par exemple, `AdministratorAccess`, `ReadOnlyAccess`)
- **Géré par le client :** Créé et maintenu par vous
- Peut être attaché à plusieurs identités
- Versionné (jusqu'à 5 versions retenues)
- Taille maximale : 6 144 caractères

**Politiques en ligne :**

- Intégré directement dans un seul utilisateur, groupe ou rôle
- Relation individuelle avec l'identité
- Supprimé lorsque l'identité est supprimée
- Utiliser pour des exceptions ou des autorisations ponctuelles

**2. Politiques basées sur les ressources :**

Attaché directement aux ressources (buckets S3, files d'attente SQS, fonctions Lambda). Ils définissent qui peut accéder à la ressource.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAccountBAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```
Les politiques basées sur les ressources incluent un élément « Principal » spécifiant qui a accès.

**3. Limites des autorisations :**

Fonctionnalité avancée qui définit les autorisations maximales qu'une identité peut avoir. Même si une stratégie accorde des autorisations plus larges, la limite limite ce qui est réellement autorisé.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "ec2:*",
        "rds:*"
      ],
      "Resource": "*"
    }
  ]
}
```
Cette limite autorise uniquement les actions S3, EC2 et RDS, quelles que soient les autres stratégies attachées.

**Cas d'utilisation :**

- Déléguer la gestion des autorisations aux développeurs sans leur donner de droits d'administrateur
- Appliquer les bases de sécurité de l'organisation
- Empêcher l'élévation des privilèges

**4. Politiques de contrôle des services (SCP) :**

Faisant partie d'AWS Organizations, les SCP définissent les autorisations maximales pour les comptes d'une organisation. Ils n'accordent pas d'autorisations, ils se contentent de les limiter.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "ec2:Region": ["us-east-1", "us-west-2"]
        }
      }
    }
  ]
}
```
Ce SCP empêche le lancement d'instances EC2 en dehors de us-east-1 et us-west-2.

**5. Politiques de session :**

Transmises lors de l'acceptation d'un rôle ou de la fédération d'un utilisateur, les politiques de session limitent davantage les autorisations pour cette session spécifique.

#### Logique d'évaluation des politiques

Lorsque plusieurs stratégies s'appliquent, AWS les évalue dans cet ordre :

1. **Refus explicite :** Si une stratégie refuse explicitement une action, l'accès est refusé
2. **SCP des organisations :** Vérifiez si l'action est autorisée par les SCP.
3. **Politiques basées sur les ressources :** Vérifiez si la stratégie de ressources autorise l'accès
4. **Politiques basées sur l'identité :** Vérifiez si les politiques d'identité autorisent l'accès
5. ** Limites des autorisations : ** Vérifiez si l'action se situe dans les limites
6. **Politiques de session :** Vérifiez si la politique de session autorise l'accès

**Flux de décision :**
```
Explicit Deny? → DENY
SCPs Allow? → If No, DENY
(Resource Policy OR Identity Policy) Allow? → If No, DENY
Permission Boundary Allow? → If No, DENY
Session Policy Allow? → If No, DENY
Otherwise → ALLOW
```
**Règle clé :** Un refus explicite l'emporte toujours. Par défaut, toutes les actions sont implicitement refusées, sauf si elles sont explicitement autorisées.

### Meilleures pratiques IAM pour la conception de politiques

#### Utilisation des variables de stratégie

Les variables de politique permettent des politiques dynamiques qui s'adaptent au contexte actuel :
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::company-bucket/${aws:username}",
        "arn:aws:s3:::company-bucket/${aws:username}/*"
      ]
    }
  ]
}
```
Cette stratégie accorde à chaque utilisateur l'accès à son propre dossier dans le compartiment S3.

**Variables de stratégie communes :**

- `${aws:username}` - Nom d'utilisateur IAM
- `${aws:userid}` - ID unique de l'identité
- `${aws:PrincipalTag/TagKey}` - Valeur d'une balise attachée au principal
- `${aws:CurrentTime}` - Date et heure actuelles
- `${aws:SourceIp}` - Adresse IP source de la requête


#### Clés de condition

Les conditions ajoutent un contrôle d'accès basé sur le contexte :

**Restrictions relatives à l'adresse IP :**
```json
{
  "Condition": {
    "IpAddress": {
      "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
    }
  }
}
```
**AMF requis :**
```json
{
  "Condition": {
    "Bool": {
      "aws:MultiFactorAuthPresent": "true"
    }
  }
}
```
**Accès basé sur le temps :**
```json
{
  "Condition": {
    "DateGreaterThan": {
      "aws:CurrentTime": "2025-01-01T00:00:00Z"
    },
    "DateLessThan": {
      "aws:CurrentTime": "2025-12-31T23:59:59Z"
    }
  }
}
```
**Étiquettes de ressources :**
```json
{
  "Condition": {
    "StringEquals": {
      "ec2:ResourceTag/Environment": "Production"
    }
  }
}
```
**SSL/TLS requis :**
```json
{
  "Condition": {
    "Bool": {
      "aws:SecureTransport": "true"
    }
  }
}
```
### Fédération d'identité

La fédération d'identité permet aux utilisateurs d'accéder à AWS à l'aide d'informations d'identification provenant de fournisseurs d'identité externes, éliminant ainsi le besoin de créer des utilisateurs IAM pour tout le monde.

#### Types de fédération

**1. Fédération SAML 2.0 :**

Intégrez les fournisseurs d'identité d'entreprise (Active Directory, Okta, Azure AD) à l'aide de SAML.

**Couler:**
```
1. User authenticates with corporate IdP
2. IdP generates SAML assertion
3. User presents assertion to AWS STS
4. STS returns temporary credentials
5. User accesses AWS resources using temporary credentials
```
**Cas d'utilisation :**

- Enterprise SSO pour l'accès à la console
- Gestion centralisée des identités
- Exigences de conformité pour l'accès fédéré

**2. Fédération d'identité Web :**

Autorisez les utilisateurs à se connecter à l'aide de fournisseurs d'identité Web (Amazon, Google, Facebook) pour les applications mobiles ou Web.

**Flux (avec Cognito) :**
```
1. User authenticates with web IdP (Google)
2. App receives IdP token
3. App exchanges token with Amazon Cognito
4. Cognito returns AWS credentials
5. App accesses AWS resources
```
**3. AWS IAM Identity Center (anciennement AWS SSO) :**

Service géré d'AWS pour la fédération des identités du personnel.

**Caractéristiques :**

- IdP intégré ou connexion à un IdP externe
- Imputation automatique des comptes
- Ensembles d'autorisations pour un accès cohérent
- Intégration avec AWS Organizations

**4. Fédération OIDC (OpenID Connect) :**

Protocole standard de fédération d'identité, couramment utilisé pour les actions GitHub, GitLab CI/CD.
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
        }
      }
    }
  ]
}
```
### Authentification multifacteur (MFA)

MFA ajoute une couche de sécurité supplémentaire en exigeant deux formes d'authentification :

1. Quelque chose que vous connaissez (mot de passe)
2. Quelque chose que vous possédez (appareil MFA)

**Types de périphériques MFA pris en charge :**

**1. Appareils MFA virtuels :**

- Des applications comme Google Authenticator, Microsoft Authenticator, Authy
- Génère des mots de passe à usage unique basés sur le temps (TOTP)
- Le plus courant et le plus rentable

**2. Périphériques MFA matériels :**

- Appareils physiques (Gemalto, YubiKey)
- Plus sécurisé mais plus cher
- Requis pour les environnements de haute sécurité

**3. Clés de sécurité U2F :**

- YubiKey, autres appareils FIDO U2F
- Option la plus sécurisée
- Tap physique requis pour l'authentification

**MFA pour le compte racine :**
Activez toujours MFA sur le compte racine : ce n'est pas négociable pour des raisons de sécurité.

**MFA dans les politiques IAM :**

Exiger l'authentification multifacteur pour les opérations sensibles :
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:TerminateInstances",
      "Resource": "*",
      "Condition": {
        "Bool": {
          "aws:MultiFactorAuthPresent": "true"
        }
      }
    }
  ]
}
```
### Accès entre comptes

Les organisations doivent fréquemment accorder l'accès à tous les comptes AWS. L'accès entre comptes permet cela sans partager les informations d'identification.

**Modèle 1 : Assomption de rôle (recommandé)**
```
Account A (123456789012) → Assume Role → Account B (987654321098)
```
**Politique de confiance dans le compte B :**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-12345"
        }
      }
    }
  ]
}
```
**ID externe :** Un identifiant unique qui évite le problème de « adjoint confus » où un service intermédiaire pourrait être amené à accéder aux ressources du mauvais compte.

**Modèle 2 : Politiques basées sur les ressources**

Pour les services prenant en charge les politiques basées sur les ressources (S3, SQS, SNS, Lambda) :
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:user/Alice"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```
**Différence :**

- **Assomption de rôle :** Informations d'identification temporaires, s'adaptent à n'importe quel service
- **Basé sur les ressources :** Accès direct sans assumer de rôle, limité à des services spécifiques


### Analyseur d'accès IAM

AWS IAM Access Analyzer aide à identifier les ressources partagées avec des entités externes et valide les politiques.

**Caractéristiques :**

**1. Analyse de l'accès externe :**
Identifie les ressources accessibles depuis l'extérieur de votre compte ou organisation AWS.

**2. Validation de la politique :**
Vérifie les politiques par rapport aux meilleures pratiques et identifie les erreurs avant le déploiement.

**3. Génération de politiques :**
Analyse les journaux CloudTrail pour générer des stratégies de moindre privilège basées sur l'utilisation réelle.

**Résultats :**

- Compartiments S3 publics
- Rôles IAM assumables par des comptes externes
- Clés KMS avec politiques de clés externes
- Fonctions Lambda avec autorisations entre comptes


### Service de jeton de sécurité AWS (STS)

STS vous permet de demander des informations d'identification temporaires à privilèges limités. C'est l'épine dorsale de la fédération et de la prise en charge des rôles.

**API clés :**

**Assumer un rôle :**
Assumer un rôle IAM au sein ou entre les comptes.
```bash
aws sts assume-role \
    --role-arn arn:aws:iam::987654321098:role/CrossAccountRole \
    --role-session-name session-name \
    --duration-seconds 3600
```
**AssumeRoleWithWebIdentity :**
Assumer un rôle en utilisant un jeton d'identité Web (Google, Facebook, Amazon).

**AssumeRoleWithSAML :**
Assumer un rôle en utilisant l'assertion SAML de l'IdP.

**ObtenirSessionToken :**
Obtenez des informations d'identification temporaires pour un utilisateur IAM (couramment utilisées avec MFA).
```bash
aws sts get-session-token \
    --serial-number arn:aws:iam::123456789012:mfa/user \
    --token-code 123456
```
**ObtenirFederationToken :**
Obtenez des informations d'identification temporaires pour les utilisateurs fédérés.

**Structure des informations d'identification temporaires :**
```json
{
  "Credentials": {
    "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",
    "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "SessionToken": "very-long-session-token-string",
    "Expiration": "2025-11-15T03:23:00Z"
  }
}
```
### Politiques IAM pour les services AWS

Comprendre comment les services AWS utilisent IAM :

**Rôles de service :**
La plupart des services AWS nécessitent un rôle pour fonctionner :

- Lambda a besoin d'un rôle pour écrire des journaux sur CloudWatch
- Les instances EC2 ont besoin d'un rôle pour accéder à S3
- Les tâches ECS nécessitent un rôle pour extraire les images de l'ECR

**Rôles liés au service :**
Certains services créent et gèrent automatiquement des rôles :

- Mise à l'échelle automatique : `AWSServiceRoleForAutoScaling`
- ElastiCache : `AWSServiceRoleForElastiCache`
- Ne peuvent pas être modifiés, supprimés uniquement lorsque le service n'en a plus besoin

**Politiques basées sur les ressources sur les services :**
Certains services prennent en charge les stratégies basées sur les ressources :

- Politiques du compartiment S3
- Politiques de sujets SNS
- Politiques de file d'attente SQS
- Politiques de fonction Lambda
- Politiques du référentiel ECR


### Limites et quotas IAM

Comprendre les limites IAM aide à planifier l'architecture :


| Ressource | Limite par défaut | Remarques |
| :-- | :-- | :-- |
| Utilisateurs par compte | 5 000 | Utiliser la fédération pour les grandes organisations |
| Groupes par compte | 300 | Les utilisateurs peuvent appartenir à 10 groupes maximum |
| Rôles par compte | 1 000 | Limite souple, peut être augmentée |
| Politiques par utilisateur/groupe/rôle | 10 politiques gérées | Plus les politiques en ligne |
| Taille de la police | 2 048 caractères (en ligne), 6 144 (gérés) | Compresser les politiques si la limite est atteinte |
| Appareils MFA par utilisateur | 8 | Plusieurs appareils pour la redondance |

## Implémentation pratique

### Atelier 1 : Créer des utilisateurs IAM avec une politique de mot de passe forte

**Objectif :** Configurez les utilisateurs IAM avec des politiques de mot de passe appliquées et une MFA.

#### Étape 1 : Configurer la stratégie de mot de passe du compte
```bash
# Set strong password policy
aws iam update-account-password-policy \
    --minimum-password-length 14 \
    --require-symbols \
    --require-numbers \
    --require-uppercase-characters \
    --require-lowercase-characters \
    --allow-users-to-change-password \
    --max-password-age 90 \
    --password-reuse-prevention 12 \
    --hard-expiry

# Verify password policy
aws iam get-account-password-policy
```
**Sortir:**
```json
{
  "PasswordPolicy": {
    "MinimumPasswordLength": 14,
    "RequireSymbols": true,
    "RequireNumbers": true,
    "RequireUppercaseCharacters": true,
    "RequireLowercaseCharacters": true,
    "AllowUsersToChangePassword": true,
    "MaxPasswordAge": 90,
    "PasswordReusePrevention": 12,
    "HardExpiry": true
  }
}
```
#### Étape 2 : Créer des utilisateurs IAM
```bash
# Create IAM user
aws iam create-user --user-name alice

# Create login profile with initial password
aws iam create-login-profile \
    --user-name alice \
    --password 'TemporaryP@ssw0rd123!' \
    --password-reset-required

# Create access keys for programmatic access
aws iam create-access-key --user-name alice
```
**Important :** Stockez la sortie de la clé d'accès en toute sécurité. C'est la seule fois où AWS affiche la clé d'accès secrète.

#### Étape 3 : Activer MFA pour l'utilisateur
```bash
# Create virtual MFA device
aws iam create-virtual-mfa-device \
    --virtual-mfa-device-name alice-mfa \
    --outfile /tmp/QRCode.png \
    --bootstrap-method QRCodePNG

# The QR code is saved to /tmp/QRCode.png
# User scans this with their authenticator app

# Enable MFA device (user provides two consecutive codes)
aws iam enable-mfa-device \
    --user-name alice \
    --serial-number arn:aws:iam::123456789012:mfa/alice-mfa \
    --authentication-code-1 123456 \
    --authentication-code-2 789012
```
#### Étape 4 : Créer des groupes et attribuer des autorisations
```bash
# Create developers group
aws iam create-group --group-name developers

# Attach AWS managed policy
aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Add user to group
aws iam add-user-to-group \
    --group-name developers \
    --user-name alice

# Verify group membership
aws iam get-group --group-name developers
```
### Atelier 2 : Création de stratégies IAM personnalisées

**Objectif :** Créer des stratégies personnalisées précises selon le principe du moindre privilège.

#### Scénario 1 : Politique des développeurs S3

Autoriser les développeurs à gérer des objets dans des compartiments S3 spécifiques, mais pas à modifier la configuration du compartiment :
```bash
# Create policy document
cat > s3-developer-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    },
    {
      "Sid": "ManageDevBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-*",
        "arn:aws:s3:::staging-application-*"
      ]
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-*/*",
        "arn:aws:s3:::staging-application-*/*"
      ]
    },
    {
      "Sid": "DenyProductionBuckets",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::prod-application-*",
        "arn:aws:s3:::prod-application-*/*"
      ]
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
    --policy-name S3DeveloperAccess \
    --policy-document file://s3-developer-policy.json \
    --description "Allow developers to manage dev/staging S3 buckets"

# Attach to developers group
aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::123456789012:policy/S3DeveloperAccess
```
#### Scénario 2 : Gestion EC2 avec accès basé sur des balises

Autoriser les utilisateurs à gérer uniquement les instances EC2 marquées avec leur équipe :
```bash
cat > ec2-team-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ViewAllInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:Get*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ManageTeamInstances",
      "Effect": "Allow",
      "Action": [
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances",
        "ec2:TerminateInstances"
      ],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "RequireTeamTagOnCreate",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Team": "${aws:PrincipalTag/Team}"
        }
      }
    },
    {
      "Sid": "AllowLaunchTemplate",
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": [
        "arn:aws:ec2:*:*:network-interface/*",
        "arn:aws:ec2:*:*:subnet/*",
        "arn:aws:ec2:*:*:volume/*",
        "arn:aws:ec2:*:*:security-group/*",
        "arn:aws:ec2:*::image/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name EC2TeamBasedAccess \
    --policy-document file://ec2-team-policy.json
```
**Tagez l'utilisateur :**
```bash
aws iam tag-user \
    --user-name alice \
    --tags Key=Team,Value=backend
```
Désormais, Alice ne peut gérer que les instances EC2 étiquetées avec « Team=backend ».

#### Scénario 3 : Contrôle d'accès basé sur le temps

Accordez l'accès uniquement pendant les heures de bureau :
```bash
cat > business-hours-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowDuringBusinessHours",
      "Effect": "Allow",
      "Action": "rds:*",
      "Resource": "*",
      "Condition": {
        "DateGreaterThan": {
          "aws:CurrentTime": "2025-01-01T09:00:00Z"
        },
        "DateLessThan": {
          "aws:CurrentTime": "2025-12-31T18:00:00Z"
        },
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name BusinessHoursRDSAccess \
    --policy-document file://business-hours-policy.json
```
### Atelier 3 : Configuration de l'accès entre comptes

**Objectif :** Permettre un accès croisé sécurisé entre les comptes de développement et de production.

#### Scénario : Compte de développement accédant à la production en lecture seule

**Compte de production (111111111111) – Créer un rôle :**
```bash
# Create trust policy
cat > trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::222222222222:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "prod-readonly-external-id-12345"
        },
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name CrossAccountReadOnly \
    --assume-role-policy-document file://trust-policy.json \
    --description "Read-only access for dev account" \
    --max-session-duration 14400  # 4 hours

# Attach read-only policy
aws iam attach-role-policy \
    --role-name CrossAccountReadOnly \
    --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# Add custom policy for specific resources
cat > prod-read-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::prod-logs-bucket",
        "arn:aws:s3:::prod-logs-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name CrossAccountReadOnly \
    --policy-name ProdReadAccess \
    --policy-document file://prod-read-policy.json
```
**Compte de développement (222222222222) - Assumer le rôle :**
```bash
# Grant user/role permission to assume the cross-account role
cat > assume-role-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::111111111111:role/CrossAccountReadOnly"
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name AssumeProdReadRole \
    --policy-document file://assume-role-policy.json

aws iam attach-user-policy \
    --user-name alice \
    --policy-arn arn:aws:iam::222222222222:policy/AssumeProdReadRole

# Assume the role
aws sts assume-role \
    --role-arn arn:aws:iam::111111111111:role/CrossAccountReadOnly \
    --role-session-name alice-prod-session \
    --external-id prod-readonly-external-id-12345 \
    --duration-seconds 14400

# Output contains temporary credentials
# Export them:
export AWS_ACCESS_KEY_ID=ASIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN=very-long-session-token

# Now commands run with prod account permissions
aws s3 ls s3://prod-logs-bucket/
```
#### Créer un script d'hypothèse de rôle
```bash
cat > assume-prod-role.sh <<'EOF'
#!/bin/bash

ROLE_ARN="arn:aws:iam::111111111111:role/CrossAccountReadOnly"
SESSION_NAME="$(whoami)-prod-session"
EXTERNAL_ID="prod-readonly-external-id-12345"

echo "Assuming role: $ROLE_ARN"

CREDENTIALS=$(aws sts assume-role \
    --role-arn "$ROLE_ARN" \
    --role-session-name "$SESSION_NAME" \
    --external-id "$EXTERNAL_ID" \
    --duration-seconds 14400 \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)

if [ $? -eq 0 ]; then
    export AWS_ACCESS_KEY_ID=$(echo $CREDENTIALS | awk '{print $1}')
    export AWS_SECRET_ACCESS_KEY=$(echo $CREDENTIALS | awk '{print $2}')
    export AWS_SESSION_TOKEN=$(echo $CREDENTIALS | awk '{print $3}')
    
    echo "Successfully assumed role!"
    echo "Credentials will expire in 4 hours"
    echo "Current identity:"
    aws sts get-caller-identity
else
    echo "Failed to assume role"
    exit 1
fi
EOF

chmod +x assume-prod-role.sh

# Usage:
source ./assume-prod-role.sh
```
### Atelier 4 : Implémentation des limites d'autorisation

**Objectif :** Utilisez les limites d'autorisation pour déléguer en toute sécurité la gestion des autorisations aux développeurs.

#### Scénario : Autoriser les développeurs à créer des rôles mais limiter leurs autorisations
```bash
# Create permission boundary policy
cat > developer-permission-boundary.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowedServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*",
        "ec2:Describe*",
        "ec2:Get*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyDangerousActions",
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "RestrictRegions",
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2"
          ]
        }
      }
    }
  ]
}
EOF

# Create the boundary policy
aws iam create-policy \
    --policy-name DeveloperPermissionBoundary \
    --policy-document file://developer-permission-boundary.json

# Allow developers to create roles with this boundary
cat > developer-role-creation-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowRoleCreation",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary"
        }
      }
    },
    {
      "Sid": "RequireBoundaryOnRole",
      "Effect": "Deny",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/app-*",
      "Condition": {
        "StringNotEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary"
        }
      }
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name DeveloperRoleCreation \
    --policy-document file://developer-role-creation-policy.json

aws iam attach-group-policy \
    --group-name developers \
    --policy-arn arn:aws:iam::123456789012:policy/DeveloperRoleCreation
```
**Le développeur crée un rôle :**
```bash
# Developer can create role with boundary
aws iam create-role \
    --role-name app-lambda-role \
    --assume-role-policy-document file://lambda-trust-policy.json \
    --permissions-boundary arn:aws:iam::123456789012:policy/DeveloperPermissionBoundary

# Attach policies to the role
aws iam attach-role-policy \
    --role-name app-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/AWSLambdaExecute

# This role can only perform actions allowed by BOTH:
# 1. The attached policy (AWSLambdaExecute)
# 2. The permission boundary (DeveloperPermissionBoundary)
```
### Laboratoire 5 : Simulation et tests de politiques

**Objectif :** Testez les stratégies IAM avant de les appliquer en production.

#### Utilisation du simulateur de stratégie IAM
```bash
# Simulate S3 access for a user
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::123456789012:user/alice \
    --action-names s3:GetObject s3:PutObject s3:DeleteObject \
    --resource-arns arn:aws:s3:::dev-application-bucket/*

# Output shows whether each action is allowed or denied
```
**Exemple de sortie :**
```json
{
  "EvaluationResults": [
    {
      "EvalActionName": "s3:GetObject",
      "EvalResourceName": "arn:aws:s3:::dev-application-bucket/*",
      "EvalDecision": "allowed",
      "MatchedStatements": [
        {
          "SourcePolicyId": "S3DeveloperAccess",
          "SourcePolicyType": "IAM Policy"
        }
      ]
    },
    {
      "EvalActionName": "s3:DeleteObject",
      "EvalResourceName": "arn:aws:s3:::prod-application-bucket/*",
      "EvalDecision": "explicitDeny",
      "MatchedStatements": [
        {
          "SourcePolicyId": "S3DeveloperAccess",
          "SourcePolicyType": "IAM Policy",
          "Statement": "DenyProductionBuckets"
        }
      ]
    }
  ]
}
```
#### Tests de politique programmatique
```python
#!/usr/bin/env python3
# test_iam_policies.py

import boto3
import json

iam = boto3.client('iam')

def test_policy_permissions(policy_document, actions, resources):
    """
    Test if a policy allows specific actions on resources
    """
    results = iam.simulate_custom_policy(
        PolicyInputList=[json.dumps(policy_document)],
        ActionNames=actions,
        ResourceArns=resources
    )
    
    print("Policy Simulation Results:")
    print("=" * 60)
    
    for result in results['EvaluationResults']:
        action = result['EvalActionName']
        resource = result['EvalResourceName']
        decision = result['EvalDecision']
        
        status = "✓ ALLOWED" if decision == "allowed" else "✗ DENIED"
        print(f"{status}: {action} on {resource}")
        
        if 'MatchedStatements' in result:
            for statement in result['MatchedStatements']:
                print(f"  Matched: {statement.get('SourcePolicyId', 'N/A')}")
    
    print("=" * 60)

# Example usage
policy = {
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Action": "s3:*",
        "Resource": "arn:aws:s3:::dev-*"
    }]
}

test_policy_permissions(
    policy,
    ['s3:GetObject', 's3:PutObject', 's3:DeleteBucket'],
    ['arn:aws:s3:::dev-bucket/*', 'arn:aws:s3:::prod-bucket/*']
)
```
### Atelier 6 : Implémentation de la fédération SAML

**Objectif :** Configurer une fédération SAML avec un IdP externe pour SSO.

#### Étape 1 : Créer un fournisseur d'identité SAML dans AWS
```bash
# Download IdP metadata from your SAML provider (Okta, Azure AD, etc.)
# Save it as idp-metadata.xml

# Create SAML provider in AWS
aws iam create-saml-provider \
    --saml-metadata-document file://idp-metadata.xml \
    --name CorporateIdP

# Output:
# arn:aws:iam::123456789012:saml-provider/CorporateIdP
```
#### Étape 2 : Créer un rôle IAM pour la fédération SAML
```bash
# Create trust policy for SAML
cat > saml-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:saml-provider/CorporateIdP"
      },
      "Action": "sts:AssumeRoleWithSAML",
      "Condition": {
        "StringEquals": {
          "SAML:aud": "https://signin.aws.amazon.com/saml"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
    --role-name CorporateIdP-Developers \
    --assume-role-policy-document file://saml-trust-policy.json \
    --description "Federated access for corporate developers"

# Attach policies
aws iam attach-role-policy \
    --role-name CorporateIdP-Developers \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```
#### Étape 3 : Configurer l'IdP

Dans votre IdP SAML (Okta, Azure AD, etc.) :

1. Ajoutez AWS en tant qu'application SAML
2. Configurez le mappage d'attributs :
```
https://aws.amazon.com/SAML/Attributes/Role → 
arn:aws:iam::123456789012:saml-provider/CorporateIdP,arn:aws:iam::123456789012:role/CorporateIdP-Developers

https://aws.amazon.com/SAML/Attributes/RoleSessionName → 
${user.email}
```
3. Attribuez des utilisateurs/groupes à l'application

#### Étape 4 : tester la fédération

Les utilisateurs peuvent désormais :

1. Connectez-vous à l'IdP d'entreprise
2. Cliquez sur Application AWS
3. Connectez-vous automatiquement à la console AWS avec un rôle fédéré

## Connaissances au niveau de la production

### Modèles d'architecture IAM d'entreprise

Les environnements de production nécessitent des architectures IAM sophistiquées qui équilibrent sécurité, convivialité et efficacité opérationnelle.

#### Modèle 1 : Organisation multicompte avec IAM Identity Center

Pour les entreprises disposant de plusieurs comptes AWS :

**Architecture :**
```
Management Account (Organizations)
├── IAM Identity Center
│   ├── Identity Source (Azure AD/Okta)
│   ├── Permission Sets
│   └── Account Assignments
├── Security Account (Audit/Logging)
├── Shared Services Account (Networking)
├── Development Accounts (by team)
└── Production Accounts (by application)
```
**Avantages :**

- Gestion centralisée des identités
- Autorisations cohérentes entre les comptes
- Approvisionnement automatique du compte
- Expérience d'authentification unique

**Mise en œuvre avec AWS CloudFormation :**
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'IAM Identity Center Permission Set for Developers'

Resources:
  DeveloperPermissionSet:
    Type: AWS::SSOAdmin::PermissionSet
    Properties:
      Name: DeveloperAccess
      Description: 'Full access to dev resources, read-only to prod'
      InstanceArn: !Ref IdentityCenterInstanceArn
      SessionDuration: PT4H
      ManagedPolicies:
        - arn:aws:iam::aws:policy/PowerUserAccess
      InlinePolicy: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Deny",
              "Action": [
                "iam:*User*",
                "iam:*AccessKey*",
                "organizations:*"
              ],
              "Resource": "*"
            }
          ]
        }

  DeveloperAccountAssignment:
    Type: AWS::SSOAdmin::Assignment
    Properties:
      InstanceArn: !Ref IdentityCenterInstanceArn
      PermissionSetArn: !GetAtt DeveloperPermissionSet.PermissionSetArn
      PrincipalId: !Ref DevelopersGroupId
      PrincipalType: GROUP
      TargetId: !Ref DevAccountId
      TargetType: AWS_ACCOUNT
```
#### Modèle 2 : rôles IAM spécifiques au service avec le moindre privilège

**Modèle de rôle d'exécution Lambda :**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowLogging",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function:*"
    },
    {
      "Sid": "AllowS3Read",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-input-bucket",
        "arn:aws:s3:::my-input-bucket/*"
      ]
    },
    {
      "Sid": "AllowDynamoDBWrite",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"
    },
    {
      "Sid": "AllowKMSDecrypt",
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```
**Modèle de profil d'instance EC2 :**
```bash
# Create role
cat > ec2-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "ec2.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
    --role-name WebServerRole \
    --assume-role-policy-document file://ec2-trust-policy.json

# Attach inline policy
cat > ec2-permissions.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::app-config-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:app/database-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "MyApplication"
        }
      }
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name WebServerRole \
    --policy-name WebServerPermissions \
    --policy-document file://ec2-permissions.json

# Create instance profile
aws iam create-instance-profile --instance-profile-name WebServerProfile
aws iam add-role-to-instance-profile \
    --instance-profile-name WebServerProfile \
    --role-name WebServerRole

# Launch EC2 with instance profile
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.micro \
    --iam-instance-profile Name=WebServerProfile \
    --subnet-id subnet-12345678
```
#### Modèle 3 : Accès d'urgence en cas de bris de vitre

Pour les situations d'urgence lorsque les méthodes d'accès normales échouent :
```bash
# Create emergency access role
cat > emergency-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::123456789012:user/emergency-admin"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "Bool": {
        "aws:MultiFactorAuthPresent": "true"
      },
      "IpAddress": {
        "aws:SourceIp": ["203.0.113.0/24"]
      }
    }
  }]
}
EOF

aws iam create-role \
    --role-name EmergencyAdministrator \
    --assume-role-policy-document file://emergency-trust-policy.json \
    --max-session-duration 3600  # 1 hour only

# Attach AdministratorAccess with notification
cat > emergency-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
  }]
}
EOF

aws iam attach-role-policy \
    --role-name EmergencyAdministrator \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create CloudWatch alarm for emergency role usage
aws cloudwatch put-metric-alarm \
    --alarm-name emergency-role-assumed \
    --alarm-description "Emergency admin role was assumed" \
    --metric-name AssumeRole \
    --namespace AWS/STS \
    --statistic Sum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=RoleName,Value=EmergencyAdministrator \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:security-alerts
```
### Audit et conformité complets

#### Intégration CloudTrail
```bash
# Ensure CloudTrail is logging IAM events
aws cloudtrail create-trail \
    --name iam-audit-trail \
    --s3-bucket-name iam-audit-logs-bucket \
    --include-global-service-events \
    --is-multi-region-trail \
    --enable-log-file-validation

# Start logging
aws cloudtrail start-logging --name iam-audit-trail

# Create event selector for data events
aws cloudtrail put-event-selectors \
    --trail-name iam-audit-trail \
    --event-selectors '[{
      "ReadWriteType": "All",
      "IncludeManagementEvents": true,
      "DataResources": []
    }]'
```
#### Configuration de l'analyseur d'accès IAM
```bash
# Create analyzer
aws accessanalyzer create-analyzer \
    --analyzer-name organization-analyzer \
    --type ORGANIZATION

# Create archive rule for known external access
aws accessanalyzer create-archive-rule \
    --analyzer-name organization-analyzer \
    --rule-name archive-partner-access \
    --filter '{
      "principal": {
        "contains": ["arn:aws:iam::999999999999:root"]
      }
    }'
```
#### Contrôles de conformité automatisés
```python
#!/usr/bin/env python3
# iam_compliance_checker.py

import boto3
from datetime import datetime, timedelta

iam = boto3.client('iam')
sns = boto3.client('sns')

def check_mfa_enabled():
    """Check if all users have MFA enabled"""
    users = iam.list_users()['Users']
    non_compliant = []
    
    for user in users:
        mfa_devices = iam.list_mfa_devices(UserName=user['UserName'])['MFADevices']
        if not mfa_devices:
            non_compliant.append(user['UserName'])
    
    return non_compliant

def check_access_key_rotation():
    """Check for access keys older than 90 days"""
    users = iam.list_users()['Users']
    old_keys = []
    
    for user in users:
        access_keys = iam.list_access_keys(UserName=user['UserName'])['AccessKeyMetadata']
        
        for key in access_keys:
            age = datetime.now(key['CreateDate'].tzinfo) - key['CreateDate']
            if age > timedelta(days=90) and key['Status'] == 'Active':
                old_keys.append({
                    'User': user['UserName'],
                    'KeyId': key['AccessKeyId'],
                    'Age': age.days
                })
    
    return old_keys

def check_unused_credentials():
    """Find users with credentials not used in 90+ days"""
    credential_report = iam.generate_credential_report()
    # Wait for report generation
    while credential_report['State'] != 'COMPLETE':
        time.sleep(2)
        credential_report = iam.generate_credential_report()
    
    report = iam.get_credential_report()['Content'].decode('utf-8')
    # Parse CSV and find unused credentials
    # Implementation details omitted for brevity
    
    return []

def send_compliance_report(findings):
    """Send compliance findings to security team"""
    message = "IAM Compliance Report\n\n"
    
    if findings['no_mfa']:
        message += f"Users without MFA: {', '.join(findings['no_mfa'])}\n\n"
    
    if findings['old_keys']:
        message += "Access keys requiring rotation:\n"
        for key in findings['old_keys']:
            message += f"  - {key['User']}: {key['KeyId']} ({key['Age']} days old)\n"
    
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:123456789012:security-compliance',
        Subject='IAM Compliance Report',
        Message=message
    )

def lambda_handler(event, context):
    """Lambda handler for scheduled compliance checks"""
    findings = {
        'no_mfa': check_mfa_enabled(),
        'old_keys': check_access_key_rotation(),
        'unused_creds': check_unused_credentials()
    }
    
    if any(findings.values()):
        send_compliance_report(findings)
    
    return {'statusCode': 200, 'findings': findings}
```
Déployez ce Lambda selon un calendrier :
```bash
# Create Lambda execution role
# Create Lambda function
# Create EventBridge rule to run daily
aws events put-rule \
    --name daily-iam-compliance-check \
    --schedule-expression "cron(0 9 * * ? *)" \
    --state ENABLED

aws events put-targets \
    --rule daily-iam-compliance-check \
    --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:123456789012:function:iam-compliance-checker"
```
### Modèles IAM avancés

#### Contrôle d'accès basé sur les attributs (ABAC)

ABAC utilise des balises pour contrôler l'accès, permettant une gestion des autorisations plus évolutive :
```bash
# Tag resources
aws ec2 create-tags \
    --resources i-1234567890abcdef0 \
    --tags Key=Project,Value=WebApp Key=Environment,Value=Dev

# Tag users
aws iam tag-user \
    --user-name alice \
    --tags Key=Project,Value=WebApp Key=Role,Value=Developer

# Create ABAC policy
cat > abac-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ec2:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Project": "${aws:PrincipalTag/Project}",
          "ec2:ResourceTag/Environment": "Dev"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": {
          "aws:RequestTag/Project": "${aws:PrincipalTag/Project}"
        },
        "ForAllValues:StringEquals": {
          "aws:TagKeys": ["Project", "Environment", "Owner"]
        }
      }
    }
  ]
}
EOF
```
Désormais, Alice ne peut gérer que les instances EC2 marquées avec `Project=WebApp`.

#### Balises de session pour accès temporaire

Lors de la fédération d'utilisateurs, transmettez les balises de session pour un contrôle plus précis :
```python
import boto3

sts = boto3.client('sts')

# Assume role with session tags
response = sts.assume_role(
    RoleArn='arn:aws:iam::123456789012:role/FederatedDeveloper',
    RoleSessionName='alice-session',
    DurationSeconds=3600,
    Tags=[
        {'Key': 'Project', 'Value': 'WebApp'},
        {'Key': 'CostCenter', 'Value': 'Engineering'},
        {'Key': 'Department', 'Value': 'Backend'}
    ],
    TransitiveTagKeys=['Project', 'CostCenter']  # These tags pass to subsequent sessions
)
```
## Conseils \& Bonnes pratiques

### Bonnes pratiques de sécurité

**Astuce 1 : n'utilisez jamais de compte root pour les opérations quotidiennes**

Le compte root a un accès illimité à tout. Protégez-le :
```bash
# Enable MFA on root
# Set up billing alerts (root-only action)
aws budgets create-budget \
    --account-id 123456789012 \
    --budget file://root-budget.json

# Lock away root credentials
# Create admin IAM user for daily tasks
```
**Astuce 2 : implémentez la suppression MFA pour les compartiments S3**

Empêcher la suppression accidentelle ou malveillante :
```bash
# Enable versioning first
aws s3api put-bucket-versioning \
    --bucket critical-data-bucket \
    --versioning-configuration Status=Enabled

# Enable MFA delete (requires root account with MFA)
aws s3api put-bucket-versioning \
    --bucket critical-data-bucket \
    --versioning-configuration Status=Enabled,MFADelete=Enabled \
    --mfa "arn:aws:iam::123456789012:mfa/root-account-mfa-device 123456"
```
**Astuce 3 : Utilisez les rôles IAM partout où cela est possible**

Les rôles fournissent des informations d'identification temporaires et éliminent le risque d'exposition de clés d'accès à long terme :

- Instances EC2 → Profils d'instance
- Fonctions Lambda → Rôles d'exécution
- Tâches ECS → Rôles de tâches
- Pipelines CI/CD → Fédération OIDC avec rôles

**Astuce 4 : changez régulièrement les informations d'identification**
```bash
# Create script to find and rotate old keys
aws iam list-access-keys --user-name alice

# Create new key
NEW_KEY=$(aws iam create-access-key --user-name alice)

# Test new key works
# Update applications to use new key

# Deactivate old key
aws iam update-access-key \
    --user-name alice \
    --access-key-id AKIAIOSFODNN7EXAMPLE \
    --status Inactive

# After verification period, delete old key
aws iam delete-access-key \
    --user-name alice \
    --access-key-id AKIAIOSFODNN7EXAMPLE
```
**Astuce 5 : Utilisez AWS Secrets Manager pour les informations d'identification**

Ne codez pas en dur les informations d'identification dans les fichiers de code ou de configuration :
```bash
# Store database credentials
aws secretsmanager create-secret \
    --name prod/database/credentials \
    --secret-string '{"username":"admin","password":"SecureP@ssw0rd!"}'

# Enable automatic rotation
aws secretsmanager rotate-secret \
    --secret-id prod/database/credentials \
    --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789012:function:SecretsManagerRotation \
    --rotation-rules AutomaticallyAfterDays=30
```
**Code de candidature :**
```python
import boto3
import json

secretsmanager = boto3.client('secretsmanager')

def get_database_credentials():
    response = secretsmanager.get_secret_value(SecretId='prod/database/credentials')
    return json.loads(response['SecretString'])

creds = get_database_credentials()
# Use creds['username'] and creds['password']
```
### Conseils de conception de politiques

**Astuce 6 : Commencez par les politiques gérées par AWS, affinez avec les politiques personnalisées**

Les politiques gérées par AWS sont un bon point de départ :

- `ReadOnlyAccess` - Tout afficher
- `PowerUserAccess` - Tout sauf la gestion IAM
- `ViewOnlyAccess` - Similaire à ReadOnly mais plus restrictif

Créez ensuite des stratégies personnalisées pour renforcer ou étendre les autorisations.

**Astuce 7 : Utilisez les conditions générales pour une défense en profondeur**

Ajoutez toujours des conditions le cas échéant :
```json
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-bucket/*",
  "Condition": {
    "StringEquals": {
      "s3:x-amz-server-side-encryption": "AES256"
    },
    "IpAddress": {
      "aws:SourceIp": "203.0.113.0/24"
    }
  }
}
```
Cela garantit que les objets sont cryptés et que les téléchargements proviennent d'un réseau fiable.

**Astuce 8 : Utilisez NotAction avec précaution**

`NotAction` peut être dangereux : il autorise tout sauf les actions répertoriées :
```json
{
  "Effect": "Allow",
  "NotAction": "iam:*",
  "Resource": "*"
}
```
Cela autorise tout sauf les actions IAM. Soyez prudent : les nouveaux services AWS sont automatiquement autorisés.

**Conseil 9 : Tirez parti des validateurs de politiques**

Avant de déployer des stratégies :
```bash
# Validate policy syntax
aws iam get-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --version-id v1 \
    | jq '.PolicyVersion.Document' \
    | python -m json.tool

# Use IAM Access Analyzer policy validation
aws accessanalyzer validate-policy \
    --policy-document file://my-policy.json \
    --policy-type IDENTITY_POLICY
```
**Astuce 10 : Documentez vos politiques**

Utilisez « Sid » (ID de déclaration) pour documenter l'intention :
```json
{
  "Sid": "AllowDevelopersToManageTheirOwnS3Buckets",
  "Effect": "Allow",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::dev-${aws:username}-*"
}
```
### Conseils opérationnels

**Astuce 11 : Utilisez AWS Organizations pour la gestion multi-comptes**
```bash
# Create organization
aws organizations create-organization --feature-set ALL

# Create OUs
aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Development

# Apply SCPs
aws organizations attach-policy \
    --policy-id p-xyz789 \
    --target-id ou-abc123
```
**Astuce 12 : Mettre en œuvre la gestion des versions des politiques**

Les stratégies gérées par le client prennent en charge le contrôle de version :
```bash
# Create new version
aws iam create-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --policy-document file://updated-policy.json \
    --set-as-default

# Rollback if needed
aws iam set-default-policy-version \
    --policy-arn arn:aws:iam::123456789012:policy/MyPolicy \
    --version-id v2
```
**Astuce 13 : Utilisez CloudWatch Logs Insights pour l'audit IAM**
```sql
fields @timestamp, userIdentity.principalId, eventName, sourceIPAddress, errorCode
| filter eventSource = "iam.amazonaws.com"
| filter eventName like /^(Create|Delete|Update|Attach|Detach)/
| sort @timestamp desc
| limit 100
```
**Astuce 14 : Configurez des alertes budgétaires pour les opérations IAM**

Même si IAM lui-même est gratuit, surveillez les coûts associés :
```bash
# Monitor CloudTrail costs (IAM events are logged here)
aws cloudwatch put-metric-alarm \
    --alarm-name high-cloudtrail-costs \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold 100 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=ServiceName,Value=AWSCloudTrail
```
**Astuce 15 : Mettez en œuvre l'accès juste à temps (JIT)**

Pour les opérations privilégiées, accordez un accès élevé temporaire :
```python
# JIT access request system
def grant_temporary_admin_access(user_arn, duration_hours=1):
    sts = boto3.client('sts')
    iam = boto3.client('iam')
    
    # Create temporary policy
    temp_policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": "*",
            "Resource": "*"
        }]
    }
    
    # Attach to user temporarily
    policy_name = f"TempAdmin-{int(time.time())}"
    iam.put_user_policy(
        UserName=user_arn.split('/')[-1],
        PolicyName=policy_name,
        PolicyDocument=json.dumps(temp_policy)
    )
    
    # Schedule removal
    scheduler = boto3.client('scheduler')
    scheduler.create_schedule(
        Name=f"remove-{policy_name}",
        ScheduleExpression=f"at({(datetime.now() + timedelta(hours=duration_hours)).isoformat()})",
        Target={
            'Arn': 'arn:aws:lambda:us-east-1:123456789012:function:RemoveTempPolicy',
            'Input': json.dumps({'user': user_arn, 'policy': policy_name})
        }
    )
    
    return f"Granted admin access for {duration_hours} hours"
```
### Conseils de surveillance et d'audit

**Astuce 16 : Activez IAM Access Advisor**

Suivez l'utilisation des autorisations au niveau du service :
```bash
# Generate access advisor report
JOB_ID=$(aws iam generate-service-last-accessed-details \
    --arn arn:aws:iam::123456789012:user/alice \
    --query 'JobId' \
    --output text)

# Check status
aws iam get-service-last-accessed-details --job-id $JOB_ID

# Identify unused permissions
# Remove policies for services not accessed in 90+ days
```
**Astuce 17 : Configurez des alertes de sécurité en temps réel**
```bash
# Create EventBridge rule for IAM changes
aws events put-rule \
    --name iam-policy-changes \
    --event-pattern '{
      "source": ["aws.iam"],
      "detail-type": ["AWS API Call via CloudTrail"],
      "detail": {
        "eventName": [
          "PutUserPolicy",
          "PutRolePolicy",
          "PutGroupPolicy",
          "AttachUserPolicy",
          "AttachRolePolicy",
          "AttachGroupPolicy"
        ]
      }
    }'

# Target SNS for alerts
aws events put-targets \
    --rule iam-policy-changes \
    --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:123456789012:security-alerts"
```
**Astuce 18 : Mettez en œuvre la séparation des tâches**

Aucune personne ne devrait avoir le contrôle total :
```
User Management → Security Team
Policy Creation → DevOps Team
Permission Assignment → Team Leads
Audit Access → Compliance Team
```
**Astuce 19 : Utilisez AWS Config pour la conformité IAM**
```bash
# Enable Config rules for IAM
aws configservice put-config-rule \
    --config-rule '{
      "ConfigRuleName": "iam-user-mfa-enabled",
      "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "IAM_USER_MFA_ENABLED"
      }
    }'

aws configservice put-config-rule \
    --config-rule '{
      "ConfigRuleName": "iam-root-access-key-check",
      "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "IAM_ROOT_ACCESS_KEY_CHECK"
      }
    }'
```
**Astuce 20 : Créez un tableau de bord d'hygiène IAM**
```python
# iam_dashboard.py
import boto3
from datetime import datetime, timedelta

def create_iam_hygiene_dashboard():
    cloudwatch = boto3.client('cloudwatch')
    iam = boto3.client('iam')
    
    # Collect metrics
    users = iam.list_users()['Users']
    users_without_mfa = len([u for u in users if not iam.list_mfa_devices(UserName=u['UserName'])['MFADevices']])
    total_users = len(users)
    
    # Publish custom metrics
    cloudwatch.put_metric_data(
        Namespace='IAM/Hygiene',
        MetricData=[
            {
                'MetricName': 'UsersWithoutMFA',
                'Value': users_without_mfa,
                'Unit': 'Count',
                'Timestamp': datetime.now()
            },
            {
                'MetricName': 'TotalUsers',
                'Value': total_users,
                'Unit': 'Count',
                'Timestamp': datetime.now()
            },
            {
                'MetricName': 'MFAComplianceRate',
                'Value': ((total_users - users_without_mfa) / total_users * 100) if total_users > 0 else 0,
                'Unit': 'Percent',
                'Timestamp': datetime.now()
            }
        ]
    )

# Run this on a schedule to track IAM health over time
```
## Pièges \& Remèdes

### Piège 1 : politiques trop permissives avec des ressources génériques

**Problème :** Stratégies utilisant `"Resource": "*"` avec des actions larges, accordant un accès involontaire à toutes les ressources du compte.

**Pourquoi cela arrive :**

- Prototypage rapide sans raffinement
- Manque de compréhension des ARN spécifiques aux ressources
- Copier-coller des exemples sans modification
- Pression pour "que ça marche"

**Impact :**

- Possibilités d'élévation de privilèges
- Mouvement latéral pour les attaquants
- Violations de conformité (principe du moindre privilège)
- Difficulté à savoir qui a accès à quoi

**Exemple du problème :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": "*"
  }]
}
```
Cela permet les opérations S3 sur TOUS les compartiments du compte, y compris les données de production.

**Remède :**

**Étape 1 : Identifiez les politiques trop permissives**
```bash
# List all customer-managed policies
aws iam list-policies --scope Local --query 'Policies[*].[PolicyName,Arn]' --output table

# Check each policy for wildcards
for policy_arn in $(aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text); do
    echo "Checking $policy_arn"
    aws iam get-policy-version \
        --policy-arn $policy_arn \
        --version-id $(aws iam get-policy --policy-arn $policy_arn --query 'Policy.DefaultVersionId' --output text) \
        --query 'PolicyVersion.Document' | grep -q '"Resource": "\*"' && echo "⚠️  WARNING: Wildcard resource in $policy_arn"
done
```
**Étape 2 : Utilisez IAM Access Analyzer pour rechercher les problèmes**
```bash
# Validate policy
aws accessanalyzer validate-policy \
    --policy-document file://my-policy.json \
    --policy-type IDENTITY_POLICY \
    --query 'findings[?findingType==`WARNING`]'
```
**Étape 3 : Affiner vers des ressources spécifiques**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListAllBuckets",
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    },
    {
      "Sid": "ManageSpecificBuckets",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-bucket",
        "arn:aws:s3:::staging-application-bucket"
      ]
    },
    {
      "Sid": "ManageObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::dev-application-bucket/*",
        "arn:aws:s3:::staging-application-bucket/*"
      ]
    }
  ]
}
```
**Étape 4 : Utiliser la génération de stratégies à partir de CloudTrail**

IAM Access Analyzer peut générer des stratégies de moindre privilège basées sur l'utilisation réelle :
```bash
# Start policy generation
JOB_ID=$(aws accessanalyzer start-policy-generation \
    --policy-generation-details '{
      "principalArn": "arn:aws:iam::123456789012:role/MyApplicationRole"
    }' \
    --cloud-trail-details '{
      "trails": [{
        "cloudTrailArn": "arn:aws:cloudtrail:us-east-1:123456789012:trail/management-events",
        "regions": ["us-east-1"]
      }],
      "startTime": "'$(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%SZ)'",
      "endTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }' \
    --query 'jobId' \
    --output text)

# Wait for generation to complete
aws accessanalyzer get-generated-policy --job-id $JOB_ID

# Review and apply the generated policy
```
**Prévention :**

- Commencez toujours par refuser tout, puis autorisez explicitement ce qui est nécessaire
- Utilisez le simulateur de politique IAM pour tester avant le déploiement
- Mettre en œuvre le processus de révision des politiques
- Configurer une analyse automatisée des politiques trop permissives
- Utilisez les règles AWS Config pour détecter les violations

***

### Piège 2 : informations d'identification codées en dur dans les fichiers de code ou de configuration

**Problème :** Clés d'accès intégrées directement dans le code de l'application, les fichiers de configuration ou, pire encore, affectées au contrôle de version.

**Pourquoi cela arrive :**

- Commodité pendant le développement
- Manque de sensibilisation aux meilleures alternatives
- Applications héritées non refactorisées
- Formation en sécurité insuffisante

**Impact :**

- Informations d'identification exposées si le référentiel est public
- Informations d'identification divulguées dans les journaux CI/CD
- Difficile de faire pivoter sans changements de code
- Échecs de conformité
- Potentiel de violations massives

**Exemple concret :**
```python
# BAD - Never do this!
import boto3

s3 = boto3.client(
    's3',
    aws_access_key_id='AKIAIOSFODNN7EXAMPLE',
    aws_secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
)
```
**Remède :**

**Étape 1 : Rechercher les informations d'identification codées en dur**
```bash
# Use git-secrets to scan repository
git clone https://github.com/awslabs/git-secrets
cd git-secrets
make install

# Install hooks in your repository
cd /path/to/your/repo
git secrets --install
git secrets --register-aws

# Scan existing history
git secrets --scan-history

# Use truffleHog for deep scanning
docker run --rm -v /path/to/repo:/proj dxa4481/trufflehog file:///proj --regex --entropy=True
```
**Étape 2 : Supprimer les informations d'identification exposées de l'historique Git**
```bash
# Use BFG Repo-Cleaner to remove secrets
java -jar bfg.jar --replace-text passwords.txt my-repo.git

# Or use git-filter-repo
git filter-repo --path-glob '**/*.py' --invert-paths --force

# After cleaning, force push
git push origin --force --all
```
**Étape 3 : Permutez immédiatement les informations d'identification compromises**
```bash
# Deactivate exposed key
aws iam update-access-key \
    --user-name compromised-user \
    --access-key-id AKIAIOSFODNN7EXAMPLE \
    --status Inactive

# Create new key
NEW_KEY=$(aws iam create-access-key --user-name compromised-user)

# Delete old key after verification
aws iam delete-access-key \
    --user-name compromised-user \
    --access-key-id AKIAIOSFODNN7EXAMPLE
```
**Étape 4 : Mettre en œuvre une gestion appropriée des informations d'identification**

**Pour les instances EC2 :**
```python
# GOOD - Use IAM roles
import boto3

# Boto3 automatically uses instance profile credentials
s3 = boto3.client('s3')
# No credentials needed!
```
**Pour les fonctions Lambda :**
```python
# GOOD - Use execution role
import boto3

# Lambda automatically assumes its execution role
s3 = boto3.client('s3')
```
**Pour les applications nécessitant des informations d'identification spécifiques :**
```python
# GOOD - Use AWS Secrets Manager
import boto3
import json

def get_credentials():
    secretsmanager = boto3.client('secretsmanager')
    response = secretsmanager.get_secret_value(SecretId='app/external-api/credentials')
    return json.loads(response['SecretString'])

creds = get_credentials()
```
**Pour le développement local :**
```python
# GOOD - Use AWS CLI profiles
import boto3

# Uses credentials from ~/.aws/credentials
session = boto3.Session(profile_name='dev')
s3 = session.client('s3')
```
**Étape 5 : Configurer des contrôles préventifs**
```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
# Check for AWS credentials
if git diff --cached | grep -E 'AKIA[0-9A-Z]{16}'; then
    echo "ERROR: AWS Access Key detected!"
    echo "Please remove hardcoded credentials before committing"
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```
**Prévention :**

- Ne confiez jamais les informations d'identification au contrôle de version
- Utilisez les rôles IAM dans la mesure du possible
- Stocker les secrets dans AWS Secrets Manager ou Parameter Store
- Implémenter l'analyse automatisée dans le pipeline CI/CD
- Former l'équipe à la gestion sécurisée des identifiants

- Utilisez les règles AWS Config pour détecter les clés d'accès des utilisateurs IAM
- Rotation régulière des informations d'identification à l'aide d'outils automatisés

***

### Piège 3 : Utilisation du compte root pour les opérations quotidiennes

**Problème :** Utilisation du compte racine (le compte créé lors de votre première inscription à AWS) pour les tâches de routine au lieu de créer des utilisateurs IAM ou d'utiliser un accès fédéré.

**Pourquoi cela arrive :**

- Commodité : c'est le premier compte créé
- Manque de compréhension des meilleures pratiques IAM
- Petites équipes sans bonne gouvernance
- La mentalité "C'est juste un compte test" qui persiste en production

**Impact :**

- Aucune piste d'audit indiquant qui a effectué les actions
- Impossible de restreindre les autorisations du compte root
- Point de compromis unique pour l'ensemble du compte
- Violations de conformité
- Impossible d'appliquer les politiques MFA sur l'accès root
- Risque d'actions destructrices accidentelles

**Remède :**

**Étape 1 : Audit de l'utilisation du compte racine**
```bash
# Check CloudTrail for root account activity
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=Username,AttributeValue=root \
    --max-results 50 \
    --query 'Events[*].[EventTime,EventName,Username]' \
    --output table

# Create CloudWatch alarm for root usage
aws cloudwatch put-metric-alarm \
    --alarm-name root-account-usage \
    --alarm-description "Alert on root account usage" \
    --metric-name RootAccountUsage \
    --namespace CustomMetrics \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:critical-security-alerts
```
**Étape 2 : Sécuriser le compte root**
```bash
# Enable MFA on root account (must be done via console)
# 1. Sign in as root
# 2. Go to "My Security Credentials"
# 3. Activate MFA on root account
# 4. Choose hardware or virtual MFA device

# Delete root access keys if they exist
aws iam list-access-keys --user-name root
# If any exist, delete them immediately via console
```
**Étape 3 : Créer des utilisateurs administratifs IAM**
```bash
# Create admin user
aws iam create-user --user-name admin-alice

# Create admin group
aws iam create-group --group-name Administrators

# Attach administrator policy
aws iam attach-group-policy \
    --group-name Administrators \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Add user to group
aws iam add-user-to-group \
    --group-name Administrators \
    --user-name admin-alice

# Create console password
aws iam create-login-profile \
    --user-name admin-alice \
    --password 'TemporaryP@ssw0rd123!' \
    --password-reset-required

# Enable MFA for admin user
# User must do this through console on first login
```
**Étape 4 : Implémenter les restrictions du compte racine**
```yaml
# CloudFormation StackSet to deny root usage across organization
AWSTemplateFormatVersion: '2010-09-09'
Description: 'SCP to restrict root account usage'

Resources:
  RootAccountRestrictionSCP:
    Type: AWS::Organizations::Policy
    Properties:
      Name: DenyRootAccountUsage
      Description: Prevent root account from performing most actions
      Type: SERVICE_CONTROL_POLICY
      Content: |
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "DenyRootAccountUsage",
              "Effect": "Deny",
              "Action": "*",
              "Resource": "*",
              "Condition": {
                "StringLike": {
                  "aws:PrincipalArn": "arn:aws:iam::*:root"
                },
                "StringNotEquals": {
                  "aws:PrincipalArn": [
                    "arn:aws:iam::123456789012:root"
                  ]
                }
              }
            }
          ]
        }
```
**Étape 5 : Créer une surveillance de l'utilisation du compte racine**
```python
#!/usr/bin/env python3
# root_account_monitor.py

import boto3
from datetime import datetime, timedelta

cloudtrail = boto3.client('cloudtrail')
sns = boto3.client('sns')

def check_root_usage():
    """Check for root account activity in last 24 hours"""
    
    # Look up root account events
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'Username',
            'AttributeValue': 'root'
        }],
        StartTime=datetime.now() - timedelta(days=1),
        EndTime=datetime.now()
    )
    
    events = response['Events']
    
    if events:
        # Filter out read-only events
        concerning_events = [
            e for e in events 
            if not e['EventName'].startswith(('Get', 'List', 'Describe'))
        ]
        
        if concerning_events:
            message = "⚠️ ROOT ACCOUNT ACTIVITY DETECTED ⚠️\n\n"
            message += f"Number of events: {len(concerning_events)}\n\n"
            
            for event in concerning_events[:10]:  # Show first 10
                message += f"Time: {event['EventTime']}\n"
                message += f"Event: {event['EventName']}\n"
                message += f"IP: {event.get('SourceIPAddress', 'Unknown')}\n"
                message += f"User Agent: {event.get('UserAgent', 'Unknown')}\n\n"
            
            # Send alert
            sns.publish(
                TopicArn='arn:aws:sns:us-east-1:123456789012:critical-security-alerts',
                Subject='🚨 Root Account Usage Detected',
                Message=message
            )
            
            return True
    
    return False

def lambda_handler(event, context):
    """Lambda handler for scheduled checks"""
    root_used = check_root_usage()
    
    return {
        'statusCode': 200,
        'rootAccountUsed': root_used
    }
```
**Étape 6 : Documenter les procédures d'accès au compte racine**

Créez un runbook pour les rares cas où un accès root est nécessaire :
```markdown
# Root Account Access Procedure

## When Root Access is Required
- Changing account settings (email, contact info)
- Closing AWS account
- Enabling MFA delete on S3 bucket
- Restoring IAM user permissions if all admin access is lost
- Signing up for GovCloud
- Changing payment methods (first time)

## Access Process
1. Get approval from CISO/Security team
2. Retrieve root credentials from secure storage (password manager/vault)
3. Use hardware MFA device
4. Perform required action
5. Document action in security log
6. Return credentials to secure storage
7. Notify security team of completion

## Post-Access Actions
- Review CloudTrail logs for root activity
- Verify only intended actions were performed
- Update documentation if needed
```
**Prévention :**

- Verrouiller les informations d'identification root dans un coffre-fort sécurisé (gestionnaire de mots de passe)
- Activer MFA sur le compte root
- Configurer les alarmes CloudWatch pour une utilisation root
- Éduquer l'équipe sur les risques liés au compte root
- Utilisez AWS Organizations SCP pour restreindre l'utilisation de root
- Effectuer des examens réguliers de l'activité du compte root

***

### Piège 4 : Contrôles d'accès entre comptes insuffisants

**Problème :** Rôles entre comptes configurés sans conditions appropriées, permettant un accès involontaire ou rendant les comptes vulnérables à des attaques adjointes confuses.

**Pourquoi cela arrive :**

- Copier les politiques de confiance sans comprendre les conditions
- Ne pas utiliser d'identifiants externes
- Restrictions IP trop permissives
- Manque de compréhension des modèles de sécurité entre comptes

**Impact :**

- Accès entre comptes non autorisé
- Vulnérabilité adjointe confuse
- Mouvement latéral entre comptes
- Violations de conformité
- Difficulté à suivre les modèles d'accès

**Exemple d'adjoint confus :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:root"
    },
    "Action": "sts:AssumeRole"
  }]
}
```
Cela permet à TOUTE identité du compte 333333333333 d'assumer le rôle, y compris un service tiers qui pourrait être amené à accéder à votre compte.

**Remède :**

**Étape 1 : implémenter l'identification externe pour l'accès tiers**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:root"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id-that-only-you-and-partner-know"
      }
    }
  }]
}
```
**Générer des identifiants externes forts :**
```bash
# Generate cryptographically secure external ID
EXTERNAL_ID=$(openssl rand -base64 32)
echo "External ID: $EXTERNAL_ID"
# Share this securely with the partner
```
**Étape 2 : Ajouter des conditions supplémentaires**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::333333333333:role/SpecificServiceRole"
    },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": {
        "sts:ExternalId": "unique-external-id-12345"
      },
      "IpAddress": {
        "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
      },
      "DateGreaterThan": {
        "aws:CurrentTime": "2025-01-01T00:00:00Z"
      },
      "DateLessThan": {
        "aws:CurrentTime": "2025-12-31T23:59:59Z"
      }
    }
  }]
}
```
**Étape 3 : Auditer les rôles inter-comptes existants**
```bash
# List all roles
aws iam list-roles --query 'Roles[*].[RoleName,Arn]' --output table

# Check each role for cross-account trust
for role in $(aws iam list-roles --query 'Roles[*].RoleName' --output text); do
    echo "Checking role: $role"
    
    TRUST_POLICY=$(aws iam get-role --role-name $role --query 'Role.AssumeRolePolicyDocument')
    
    # Check if trust policy allows cross-account access
    echo "$TRUST_POLICY" | jq '.Statement[] | select(.Principal.AWS != null) | select(.Principal.AWS | type == "string" and (contains("arn:aws:iam::") and (contains(":root") or contains(":user/") or contains(":role/"))))'
    
    # Flag roles without ExternalId when trusting external accounts
    echo "$TRUST_POLICY" | jq '.Statement[] | select(.Condition.StringEquals."sts:ExternalId" == null) | select(.Principal.AWS | type == "string" and contains("arn:aws:iam::"))'
    
    echo "---"
done
```
**Étape 4 : Utiliser IAM Access Analyzer pour les résultats multi-comptes**
```bash
# Create analyzer for organization
aws accessanalyzer create-analyzer \
    --analyzer-name org-cross-account-analyzer \
    --type ORGANIZATION

# List findings
aws accessanalyzer list-findings \
    --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-cross-account-analyzer \
    --filter '{"resourceType":{"eq":["AWS::IAM::Role"]}}' \
    --query 'findings[*].[id,resourceType,principal.AWS,condition]' \
    --output table

# Get detailed finding
aws accessanalyzer get-finding \
    --analyzer-arn arn:aws:access-analyzer:us-east-1:123456789012:analyzer/org-cross-account-analyzer \
    --id <finding-id>
```
**Étape 5 : Mettre en œuvre la surveillance entre comptes**
```python
#!/usr/bin/env python3
# cross_account_monitor.py

import boto3
import json

cloudtrail = boto3.client('cloudtrail')
sns = boto3.client('sns')

def monitor_cross_account_assumptions():
    """Monitor AssumeRole calls from external accounts"""
    
    # Query CloudTrail for AssumeRole events
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'EventName',
            'AttributeValue': 'AssumeRole'
        }],
        MaxResults=50
    )
    
    suspicious_assumptions = []
    
    for event in response['Events']:
        event_data = json.loads(event['CloudTrailEvent'])
        
        # Check if assumption came from external account
        if 'userIdentity' in event_data:
            principal_account = event_data['userIdentity'].get('accountId')
            our_account = boto3.client('sts').get_caller_identity()['Account']
            
            if principal_account and principal_account != our_account:
                # External account assumed role
                suspicious_assumptions.append({
                    'time': event['EventTime'],
                    'external_account': principal_account,
                    'role_assumed': event_data['requestParameters']['roleArn'],
                    'source_ip': event_data['sourceIPAddress'],
                    'external_id_used': event_data['requestParameters'].get('externalId', 'NONE')
                })
    
    if suspicious_assumptions:
        message = "Cross-Account Role Assumptions Detected:\n\n"
        for assumption in suspicious_assumptions:
            message += f"Time: {assumption['time']}\n"
            message += f"External Account: {assumption['external_account']}\n"
            message += f"Role: {assumption['role_assumed']}\n"
            message += f"Source IP: {assumption['source_ip']}\n"
            message += f"External ID: {assumption['external_id_used']}\n\n"
        
        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789012:security-alerts',
            Subject='Cross-Account Role Assumptions',
            Message=message
        )
    
    return len(suspicious_assumptions)

def lambda_handler(event, context):
    count = monitor_cross_account_assumptions()
    return {'statusCode': 200, 'assumptionCount': count}
```
**Étape 6 : Implémenter le moindre privilège pour les rôles entre comptes**

N'accordez pas un accès administrateur complet aux rôles multi-comptes :
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOnlyAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::shared-reports-bucket",
        "arn:aws:s3:::shared-reports-bucket/*"
      ]
    },
    {
      "Sid": "SpecificDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/SharedDataTable"
    },
    {
      "Sid": "DenyDangerousActions",
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }
  ]
}
```
**Prévention :**

- Utilisez toujours ExternalId pour l'accès à des tiers
- Spécifiez les ARN principaux exacts (pas `:root`)
- Ajouter des restrictions IP lorsque cela est possible
- Mettre en œuvre un accès temporel avec conditions
- Utilisez IAM Access Analyzer pour détecter les accès externes
- Surveiller les appels AssumeRole dans CloudTrail
- Documenter toutes les relations entre comptes

***

### Piège 5 : Ne pas utiliser de politiques de contrôle des services (SCP) dans les organisations

**Problème :** Gestion des autorisations uniquement via des stratégies IAM dans des comptes individuels sans tirer parti des SCP AWS Organizations pour un contrôle centralisé.

**Pourquoi cela arrive :**

- Ne pas utiliser AWS Organizations
- Manque de compréhension des capacités du SCP
- Peur de briser les modèles d'accès existants
- Gestion décentralisée des comptes AWS

**Impact :**

- Postures de sécurité incohérentes entre les comptes
- Incapacité à appliquer les politiques à l'échelle de l'organisation
- Risque de comptes malveillants avec des autorisations excessives
- Défis de conformité à grande échelle
- Pas de garde-fou pour les nouveaux comptes

**Remède :**

**Étape 1 : Configurer AWS Organizations**
```bash
# Create organization
aws organizations create-organization --feature-set ALL

# Verify organization
aws organizations describe-organization

# Create organizational units
aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Production

aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Development

aws organizations create-organizational-unit \
    --parent-id r-abc123 \
    --name Sandbox
```
**Étape 2 : Créer des SCP fondamentaux**

**Refuser l'utilisation de la racine SCP :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyRootUser",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringLike": {
        "aws:PrincipalArn": "arn:aws:iam::*:root"
      }
    }
  }]
}
```
**CPD de restriction de région :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyUnapprovedRegions",
    "Effect": "Deny",
    "Action": "*",
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {
        "aws:RequestedRegion": [
          "us-east-1",
          "us-west-2",
          "eu-west-1"
        ]
      },
      "ArnNotLike": {
        "aws:PrincipalArn": [
          "arn:aws:iam::*:role/OrganizationAccountAccessRole"
        ]
      }
    }
  }]
}
```
**Empêcher les modifications de stratégie IAM SCP :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ProtectIAMRoles",
    "Effect": "Deny",
    "Action": [
      "iam:DeleteRole",
      "iam:DeleteRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:UpdateAssumeRolePolicy"
    ],
    "Resource": [
      "arn:aws:iam::*:role/OrganizationAccountAccessRole",
      "arn:aws:iam::*:role/SecurityAuditRole"
    ]
  }]
}
```
**Nécessite un SCP de chiffrement :**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedS3",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": ["AES256", "aws:kms"]
        }
      }
    },
    {
      "Sid": "DenyUnencryptedEBS",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:volume/*",
      "Condition": {
        "Bool": {
          "ec2:Encrypted": "false"
        }
      }
    }
  ]
}
```
**Étape 3 : Créer et attacher des SCP**
```bash
# Create SCP
aws organizations create-policy \
    --name DenyRootUsage \
    --description "Prevent root account usage" \
    --type SERVICE_CONTROL_POLICY \
    --content file://deny-root-scp.json

# Attach to OU
aws organizations attach-policy \
    --policy-id p-abc123 \
    --target-id ou-def456

# Verify attachment
aws organizations list-policies-for-target \
    --target-id ou-def456 \
    --filter SERVICE_CONTROL_POLICY
```
**Étape 4 : Tester l'impact des SCP**

Avant de postuler à grande échelle, testez dans un compte sandbox :
```bash
# Attach SCP to test account
aws organizations attach-policy \
    --policy-id p-abc123 \
    --target-id 123456789012

# Test actions in the account
# Verify desired actions are blocked
# Verify necessary actions still work

# If issues arise, detach and refine
aws organizations detach-policy \
    --policy-id p-abc123 \
    --target-id 123456789012
```
**Étape 5 : implémenter la hiérarchie SCP**
```
Root (FullAWSAccess)
├── Production OU
│   ├── RequireEncryption SCP
│   ├── DenyRootUsage SCP
│   ├── RegionRestriction SCP
│   └── RequireMFA SCP
├── Development OU
│   ├── RequireEncryption SCP
│   ├── DenyRootUsage SCP
│   └── RegionRestriction SCP
└── Sandbox OU
    └── DenyProductionAccess SCP
```
**Étape 6 : Surveiller l'efficacité du SCP**
```python
#!/usr/bin/env python3
# scp_monitoring.py

import boto3
import json

organizations = boto3.client('organizations')
cloudtrail = boto3.client('cloudtrail')

def check_scp_denials():
    """Monitor for actions denied by SCPs"""
    
    # Query CloudTrail for denied actions
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'ErrorCode',
            'AttributeValue': 'AccessDenied'
        }],
        MaxResults=50
    )
    
    scp_denials = []
    
    for event in response['Events']:
        event_data = json.loads(event['CloudTrailEvent'])
        
        # Check if denial was due to SCP
        if 'errorMessage' in event_data:
            if 'service control policy' in event_data['errorMessage'].lower():
                scp_denials.append({
                    'time': event['EventTime'],
                    'user': event_data['userIdentity']['arn'],
                    'action': event['EventName'],
                    'account': event_data['userIdentity'].get('accountId'),
                    'error': event_data['errorMessage']
                })
    
    return scp_denials

def audit_scp_coverage():
    """Audit which accounts have SCPs applied"""
    
    # List all accounts
    accounts = organizations.list_accounts()['Accounts']
    
    coverage = {}
    
    for account in accounts:
        if account['Status'] == 'ACTIVE':
            # Get policies for account
            policies = organizations.list_policies_for_target(
                TargetId=account['Id'],
                Filter='SERVICE_CONTROL_POLICY'
            )
            
            coverage[account['Id']] = {
                'name': account['Name'],
                'scp_count': len(policies['Policies']),
                'policies': [p['Name'] for p in policies['Policies']]
            }
    
    return coverage

def lambda_handler(event, context):
    denials = check_scp_denials()
    coverage = audit_scp_coverage()
    
    return {
        'statusCode': 200,
        'scp_denials': len(denials),
        'accounts_covered': len(coverage)
    }
```
**Prévention :**

- Activer AWS Organizations pour toutes les configurations multi-comptes
- Commencez avec des SCP permissifs et resserrez progressivement
- Testez d'abord les SCP dans les comptes sandbox
- Documenter le but de chaque SCP
- Réviser et mettre à jour les SCP trimestriellement
- Surveiller CloudTrail pour les actions refusées par SCP
- Utilisez les SCP comme garde-fous, et non comme contrôle d'accès principal

***

### Piège 6 : Négliger les limites de taille des politiques IAM

**Problème :** Création de stratégies trop complexes qui dépassent les limites de taille AWS, provoquant des échecs de déploiement ou forçant des solutions de contournement qui compromettent la sécurité.

**Pourquoi cela arrive :**

- Ajout d'autorisations progressivement sans refactorisation
- Ne pas comprendre les limites de taille
- Essayer d'implémenter ABAC avec des conditions excessives
- Copie de grands exemples de politiques sans optimisation

**Impact :**

- Échecs de création de politique
- Ruptures du pipeline de déploiement
- Utilisation forcée des politiques en ligne (plus difficile à gérer)
- Solutions de contournement qui réduisent la sécurité
- Cauchemars d'entretien

**Limites de taille de stratégie :**

- Politique gérée : 6 144 caractères
- Politique en ligne : 2 048 caractères (utilisateur), 10 240 (rôle/groupe)
- Politique basée sur les ressources : varie selon le service

**Remède :**

**Étape 1 : Identifier les politiques surdimensionnées**
```bash
# Check policy sizes
for policy_arn in $(aws iam list-policies --scope Local --query 'Policies[*].Arn' --output text); do
    VERSION_ID=$(aws iam get-policy --policy-arn $policy_arn --query 'Policy.DefaultVersionId' --output text)
    
    POLICY_DOC=$(aws iam get-policy-version \
        --policy-arn $policy_arn \
        --version-id $VERSION_ID \
        --query 'PolicyVersion.Document' \
        --output json)
    
    SIZE=$(echo "$POLICY_DOC" | wc -c)
    
    if [ $SIZE -gt 5000 ]; then
        echo "⚠️  Large policy: $policy_arn ($SIZE characters)"
    fi
done
```
**Étape 2 : Optimiser la structure des politiques**

**Avant (verbeux) :**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket1/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket2/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket3/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::bucket1/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::bucket2/*"
    }
  ]
}
```
**Après (optimisé) :**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": [
      "arn:aws:s3:::bucket1/*",
      "arn:aws:s3:::bucket2/*",
      "arn:aws:s3:::bucket3/*"
    ]
  }]
}
```
**Étape 3 : Utiliser les caractères génériques de manière stratégique**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:*",
    "Resource": [
      "arn:aws:s3:::app-*-dev",
      "arn:aws:s3:::app-*-dev/*"
    ]
  }]
}
```
Cela correspond à `app-web-dev`, `app-api-dev`, etc.

**Étape 4 : Diviser les grandes polices**

Au lieu d’une politique massive, créez plusieurs politiques ciblées :
```bash
# Create separate policies for different services
aws iam create-policy \
    --policy-name S3DeveloperAccess \
    --policy-document file://s3-policy.json

aws iam create-policy \
    --policy-name DynamoDBDeveloperAccess \
    --policy-document file://dynamodb-policy.json

aws iam create-policy \
    --policy-name LambdaDeveloperAccess \
    --policy-document file://lambda-policy.json

# Attach all to group
aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/S3DeveloperAccess

aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/DynamoDBDeveloperAccess

aws iam attach-group-policy --group-name Developers \
    --policy-arn arn:aws:iam::123456789012:policy/LambdaDeveloperAccess
```
**Étape 5 : Utiliser les limites d'autorisation pour les grands ensembles d'autorisations**

Au lieu d'attacher de nombreuses stratégies, utilisez une limite d'autorisation :
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:*",
      "dynamodb:*",
      "lambda:*",
      "ec2:Describe*",
      "ec2:Get*",
      "logs:*",
      "cloudwatch:*"
    ],
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "aws:RequestedRegion": ["us-east-1", "us-west-2"]
      }
    }
  }]
}
```
Définissez comme limite d'autorisation, puis attachez des politiques spécifiques pour les autorisations réelles.

**Étape 6 : exploiter les balises de ressources**

Utilisez ABAC pour réduire la taille de la politique :
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "ec2:*",
    "Resource": "*",
    "Condition": {
      "StringEquals": {
        "ec2:ResourceTag/Team": "${aws:PrincipalTag/Team}"
      }
    }
  }]
}
```
Cette seule instruction gère toutes les équipes sans les énumérer chacune.

**Prévention :**

- Concevoir des politiques d'évolutivité dès le départ
- Utiliser efficacement les caractères génériques et les variables
- Diviser les grandes politiques en modules logiques
- Tirez parti d'ABAC pour un contrôle d'accès évolutif
- Examens réguliers des politiques et refactorisation
- Surveiller la taille des politiques dans le pipeline CI/CD

***

### Piège 7 : Gestion inappropriée des informations d'identification de sécurité temporaires

**Problème :** Traiter les informations d'identification temporaires (de STS) comme des clés d'accès permanentes, ce qui entraîne des problèmes d'expiration, des jetons temporaires codés en dur ou des échecs de renouvellement.

**Pourquoi cela arrive :**

- Manque de compréhension du cycle de vie des informations d'identification STS
- Mauvaise gestion des erreurs pour les informations d'identification expirées
- Ne pas implémenter de mécanismes de rafraîchissement automatique
- Stockage permanent des informations d'identification temporaires

**Impact :**

- Pannes d'application lorsque les informations d'identification expirent
- Conditions de course lors de l'actualisation des informations d'identification
- Risques de sécurité si des informations d'identification temporaires sont exposées
- Débogage difficile des pannes intermittentes

**Remède :**

**Étape 1 : Comprendre l'expiration des informations d'identification**
```python
#!/usr/bin/env python3
# check_credential_expiration.py

import boto3
import json
from datetime import datetime, timezone

def check_credentials():
    """Check if current credentials are about to expire"""
    
    sts = boto3.client('sts')
    
    try:
        # Get caller identity
        identity = sts.get_caller_identity()
        
        # If using temporary credentials, check expiration
        if ':assumed-role/' in identity['Arn']:
            # Get session token info
            # Note: No direct API to check expiration, must track manually
            print(f"Using temporary credentials: {identity['Arn']}")
            print("⚠️  Implement expiration tracking in your application")
        else:
            print(f"Using permanent credentials: {identity['Arn']}")
            print("Consider using roles instead")
    
    except Exception as e:
        print(f"Error: {e}")
        print("Credentials may be expired or invalid")

if __name__ == "__main__":
    check_credentials()
```
**Étape 2 : Mettre en œuvre l'actualisation automatique des informations d'identification**
```python
#!/usr/bin/env python3
# auto_refresh_credentials.py

import boto3
from datetime import datetime, timedelta, timezone
import threading
import time

class RefreshableCredentials:
    """Auto-refreshing temporary credentials"""
    
    def __init__(self, role_arn, external_id=None):
        self.role_arn = role_arn
        self.external_id = external_id
        self.credentials = None
        self.expiration = None
        self.lock = threading.Lock()
        
        # Initial credential fetch
        self._refresh_credentials()
        
        # Start background refresh thread
        self.refresh_thread = threading.Thread(target=self._auto_refresh, daemon=True)
        self.refresh_thread.start()
    
    def _refresh_credentials(self):
        """Refresh temporary credentials"""
        with self.lock:
            sts = boto3.client('sts')
            
            assume_role_params = {
                'RoleArn': self.role_arn,
                'RoleSessionName': f'session-{int(time.time())}',
                'DurationSeconds': 3600  # 1 hour
            }
            
            if self.external_id:
                assume_role_params['ExternalId'] = self.external_id
            
            response = sts.assume_role(**assume_role_params)
            
            self.credentials = response['Credentials']
            self.expiration = response['Credentials']['Expiration']
            
            print(f"Credentials refreshed. Expire at: {self.expiration}")
    
    def _auto_refresh(self):
        """Background thread to auto-refresh credentials"""
        while True:
            if self.expiration:
                # Refresh 5 minutes before expiration
                time_until_expiry = (self.expiration - datetime.now(timezone.utc)).total_seconds()
                
                if time_until_expiry < 300:  # 5 minutes
                    print("Credentials expiring soon, refreshing...")
                    try:
                        self._refresh_credentials()
                    except Exception as e:
                        print(f"Failed to refresh credentials: {e}")
            
            time.sleep(60)  # Check every minute
    
    def get_boto3_session(self):
        """Get boto3 session with current credentials"""
        with self.lock:
            return boto3.Session(
                aws_access_key_id=self.credentials['AccessKeyId'],
                aws_secret_access_key=self.credentials['SecretAccessKey'],
                aws_session_token=self.credentials['SessionToken']
            )

# Usage
credentials = RefreshableCredentials(
    role_arn='arn:aws:iam::123456789012:role/MyAppRole',
    external_id='my-external-id'
)

# Use throughout application
session = credentials.get_boto3_session()
s3 = session.client('s3')
```
**Étape 3 : Gérer l'expiration des informations d'identification avec élégance**
```python
#!/usr/bin/env python3
# graceful_credential_handling.py

import boto3
from botocore.exceptions import ClientError
import time

class ResilientAWSClient:
    """AWS client with automatic retry on credential expiration"""
    
    def __init__(self, service_name, role_arn):
        self.service_name = service_name
        self.role_arn = role_arn
        self.client = None
        self._refresh_client()
    
    def _refresh_client(self):
        """Create new client with fresh credentials"""
        sts = boto3.client('sts')
        
        response = sts.assume_role(
            RoleArn=self.role_arn,
            RoleSessionName=f'session-{int(time.time())}',
            DurationSeconds=3600
        )
        
        session = boto3.Session(
            aws_access_key_id=response['Credentials']['AccessKeyId'],
            aws_secret_access_key=response['Credentials']['SecretAccessKey'],
            aws_session_token=response['Credentials']['SessionToken']
        )
        
        self.client = session.client(self.service_name)
    
    def call(self, method_name, **kwargs):
        """Call AWS API with automatic retry on expired credentials"""
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                method = getattr(self.client, method_name)
                return method(**kwargs)
            
            except ClientError as e:
                error_code = e.response['Error']['Code']
                
                if error_code in ['ExpiredToken', 'InvalidToken']:
                    print(f"Credentials expired, refreshing (attempt {attempt + 1}/{max_retries})")
                    self._refresh_client()
                    
                    if attempt == max_retries - 1:
                        raise
                else:
                    raise
            
            except Exception as e:
                raise

# Usage
s3_client = ResilientAWSClient('s3', 'arn:aws:iam::123456789012:role/MyAppRole')
buckets = s3_client.call('list_buckets')
```
**Étape 4 : Ne stockez jamais les informations d'identification temporaires de manière permanente**
```python
# BAD - Never do this
with open('credentials.txt', 'w') as f:
    f.write(f"ACCESS_KEY={credentials['AccessKeyId']}\n")
    f.write(f"SECRET_KEY={credentials['SecretAccessKey']}\n")
    f.write(f"SESSION_TOKEN={credentials['SessionToken']}\n")

# GOOD - Store only role ARN, fetch credentials dynamically
config = {
    'role_arn': 'arn:aws:iam::123456789012:role/MyAppRole',
    'external_id': 'my-external-id'
}

# Credentials fetched on-demand
```
**Étape 5 : Surveiller l'utilisation des informations d'identification**
```python
#!/usr/bin/env python3
# monitor_credential_usage.py

import boto3
from datetime import datetime, timedelta

cloudtrail = boto3.client('cloudtrail')

def find_expired_credential_errors():
    """Find API calls that failed due to expired credentials"""
    
    response = cloudtrail.lookup_events(
        LookupAttributes=[{
            'AttributeKey': 'ErrorCode',
            'AttributeValue': 'ExpiredToken'
        }],
        StartTime=datetime.now() - timedelta(hours=24),
        EndTime=datetime.now()
    )
    
    expired_errors = []
    
    for event in response['Events']:
        expired_errors.append({
            'time': event['EventTime'],
            'event': event['EventName'],
            'user': event.get('Username', 'N/A'),
            'source_ip': event.get('SourceIPAddress', 'N/A')
        })
    
    return expired_errors

# Run regularly to identify applications with credential issues
errors = find_expired_credential_errors()
if errors:
    print(f"Found {len(errors)} expired credential errors in last 24 hours")
    for error in errors:
        print(f"  - {error['time']}: {error['event']} from {error['source_ip']}")
```
**Étape 6 : Utiliser la gestion intégrée des informations d'identification du SDK AWS**

La plupart des kits SDK AWS gèrent automatiquement l'actualisation des informations d'identification :
```python
# Python boto3 - automatic refresh
# When using instance profile or ECS task role
import boto3

# SDK automatically refreshes credentials
s3 = boto3.client('s3')
buckets = s3.list_buckets()  # Works even if credentials expire
```

```javascript
// JavaScript/Node.js
const AWS = require('aws-sdk');

// Automatic credential refresh with IAM role
const s3 = new AWS.S3();

s3.listBuckets((err, data) => {
  if (err) console.log(err);
  else console.log(data);
});
```
**Prévention :**

- Utiliser les rôles IAM dans la mesure du possible (EC2, Lambda, ECS)
- Implémenter l'actualisation automatique des informations d'identification
- Gérer les erreurs d'expiration avec élégance
- Ne stockez jamais les informations d'identification temporaires de manière permanente
- Surveiller CloudTrail pour les erreurs ExpiredToken
- Utiliser les fournisseurs d'informations d'identification AWS SDK
- Définir des durées de session appropriées

***

## Résumé du chapitre

IAM est le fondement de la sécurité AWS, contrôlant qui peut accéder à quelles ressources et dans quelles conditions. La maîtrise d'IAM nécessite de comprendre ses composants (utilisateurs, groupes, rôles, politiques), de mettre en œuvre l'accès au moindre privilège et de suivre les meilleures pratiques de sécurité tout au long du cycle de vie des informations d'identification.

**Principaux points à retenir :**

- **IAM est mondial :** Les ressources créées dans IAM sont disponibles dans toutes les régions AWS, simplifiant la gestion mais nécessitant une planification minutieuse
- **Rôles par rapport aux utilisateurs :** Préférez les rôles IAM avec des informations d'identification temporaires aux utilisateurs IAM avec des clés d'accès à long terme pour réduire les risques de sécurité.
- **Le moindre privilège n'est pas négociable :** accordez uniquement les autorisations minimales requises pour chaque tâche, en utilisant des politiques précises avec des ressources et des conditions spécifiques.
- **Défense en profondeur :** Superposez plusieurs contrôles de sécurité, notamment MFA, restrictions IP, limites d'autorisation et SCP pour une protection complète
- **L'accès entre comptes nécessite des précautions :** Utilisez des identifiants externes, des principes spécifiques et des conditions pour éviter toute confusion dans les vulnérabilités des adjoints.
- **La fédération s'adapte mieux :** Pour les organisations comptant de nombreux utilisateurs, implémentez une fédération SAML ou OIDC au lieu de créer des utilisateurs IAM individuels.
- **Audit continu :** Utilisez CloudTrail, IAM Access Analyzer et des contrôles de conformité automatisés pour détecter et résoudre les problèmes de sécurité.

Comprendre IAM en profondeur vous permet de créer des architectures AWS sécurisées, évolutives et conformes. Les modèles et pratiques présentés dans ce chapitre constituent la base de sécurité de tous les services et solutions ultérieurs.

Au chapitre 3, nous explorerons Amazon VPC, qui fournit l'isolation et la segmentation du réseau qui complètent les contrôles d'accès basés sur l'identité d'IAM.

## Exercice pratique en laboratoire

**Objectif :** Créez une architecture IAM complète pour une application à trois niveaux avec une séparation appropriée des tâches, un accès au moindre privilège et des capacités d'audit.

**Scénario :** Vous configurez IAM pour une application Web avec :

- Développeurs frontend (besoin de S3, CloudFront)
- Développeurs backend (besoin de Lambda, DynamoDB, API Gateway)
- Administrateurs de bases de données (besoin de RDS)
- Équipe DevOps (besoin d'un accès complet à l'infrastructure)
- Auditeurs (besoin d'un accès en lecture seule)

**Étapes de l'exercice :**

1. **Créer des groupes d'utilisateurs avec le moindre privilège**
    - Créer des groupes pour chaque rôle
    - Joindre des politiques gérées et personnalisées appropriées
    - Implémenter les limites d'autorisation
2. **Configurer l'accès entre comptes**
    - Créer un rôle dans le compte "production"
    - Configurer la politique de confiance avec un identifiant externe
    - Hypothèse de test du compte "développement"
3. **Mettre en œuvre les exigences MFA**
    - Configurer MFA pour tous les utilisateurs
    - Créer une politique exigeant une MFA pour les actions sensibles
    - Tester l'application de l'AMF
4. **Créer des rôles de service**
    - Rôle d'exécution Lambda
    - Profil d'instance EC2
    - Rôle de tâche ECS
5. **Configurer la piste d'audit**
    - Activer CloudTrail pour les événements IAM
    - Créer un analyseur d'accès IAM
    - Configurer des alarmes CloudWatch pour les activités suspectes
6. **Tester et valider**
    - Utiliser le simulateur de politique IAM
    - Tenter des actions non autorisées
    - Vérifier la mise en œuvre du moindre privilège

**Résultats attendus :**

- Architecture IAM fonctionnelle avec séparation appropriée
- Tous les utilisateurs ont activé MFA
- Piste d'audit capturant toutes les modifications IAM
- Politiques et procédures documentées

**Nettoyage :**
```bash
# Delete users, groups, roles, policies created during exercise
# Be careful not to delete production IAM resources
```
## Questions de révision

1. **Quelle est la différence entre un utilisateur IAM et un rôle IAM ?**
a) Les utilisateurs disposent d'informations d'identification permanentes, les rôles fournissent des informations d'identification temporaires.
b) Les utilisateurs sont mondiaux, les rôles sont régionaux
c) Les utilisateurs peuvent avoir des politiques, les rôles ne peuvent pas
d) Il n'y a aucune différence

**Réponse : A** - Les utilisateurs disposent d'informations d'identification permanentes (mots de passe, clés d'accès) tandis que les rôles fournissent des informations d'identification temporaires via l'API AssumeRole.

2. **Quel type de stratégie IAM définit les autorisations maximales qu'une identité peut avoir ?**
a) Politique basée sur l'identité
b) Politique basée sur les ressources
c) Limite d'autorisation
d) Politique de contrôle des services

**Réponse : C** – Les limites d'autorisation définissent les autorisations maximales, même si d'autres stratégies accordent un accès plus large.

3. **À quoi sert un identifiant externe dans l'accès entre comptes ?**
a) Pour chiffrer la demande de prise de rôle
b) Pour éviter le problème des adjoints confus
c) Pour identifier la région de la demande
d) Pour définir la durée de la session

**Réponse : B** - L'ID externe évite la vulnérabilité adjointe confuse où un service pourrait être amené à accéder aux ressources du mauvais compte.

4. **Dans l'évaluation des politiques, que se passe-t-il si une politique refuse explicitement une action et qu'une autre l'autorise ?**
a) Autoriser les gains
b) Refuser les victoires
c) Les plus récentes victoires politiques
d) L'utilisateur choisit

**Réponse : B** - Un refus explicite l'emporte toujours sur les autorisations. Il s’agit d’un principe fondamental de l’évaluation des politiques d’IAM.

5. **Quel service AWS permet un accès fédéré à l'aide des informations d'identification de l'entreprise ?**
a) AWS IAM
b) AWS SSO (IAM Identity Center)
c) AWS Cognito
d) Service d'annuaire AWS

**Réponse : B** - AWS SSO (maintenant appelé IAM Identity Center) permet un accès fédéré à l'aide de fournisseurs d'identité d'entreprise comme Active Directory, Okta ou Azure AD.

6. **Quel est le nombre maximum de stratégies gérées pouvant être attachées à un seul rôle IAM ?**
une) 5
b) 10
c) 20
d) Illimité

**Réponse : B** - Vous pouvez attacher jusqu'à 10 stratégies gérées à un seul rôle, utilisateur ou groupe IAM.

7. **Quelle clé de condition nécessite une authentification multifacteur ?**
a) `aws : MFARequired`
b) `aws :MultiFactorAuthPresent`
c) `aws : MFAEnabled`
d) « aws : SecureMFA »

**Réponse : B** - La clé de condition « aws:MultiFactorAuthPresent » vérifie si MFA a été utilisé pour l'authentification.

8. **Quel est l'objectif principal des politiques de contrôle des services (SCP) ?**
a) Accorder des autorisations aux services AWS
b) Définir les autorisations maximales pour les comptes d'une organisation
c) Définir des règles d'accès spécifiques au service
d) Créer des rôles liés au service

**Réponse : B** - Les SCP définissent les autorisations maximales pour les comptes au sein d'une organisation AWS, agissant comme des garde-fous.

9. **Quand devez-vous utiliser des stratégies en ligne plutôt que des stratégies gérées ?**
a) Lorsque vous devez attacher la politique à plusieurs identités
b) Quand vous souhaitez un contrôle de version
c) Lorsque vous avez besoin d'une relation un-à-un stricte entre la politique et l'identité
d) Les politiques en ligne sont obsolètes et ne doivent pas être utilisées

**Réponse : C** - Les stratégies en ligne sont appropriées lorsque vous avez besoin d'une relation un-à-un stricte et que vous souhaitez que la stratégie soit supprimée avec l'identité.

10. **À quoi la variable de stratégie `aws:username` est-elle résolue ?**
a) L'adresse e-mail de l'utilisateur IAM
b) Le nom convivial de l'utilisateur IAM
c) L'ARN de l'utilisateur IAM
d) L'identifiant du compte de l'utilisateur IAM

**Réponse : B** - `${aws:username}` correspond au nom convivial de l'utilisateur IAM effectuant la demande.

11. **Quelle fonctionnalité IAM analyse les journaux CloudTrail pour générer des stratégies de moindre privilège ?**
a) Simulateur de politique IAM
b) Génération de politiques IAM Access Analyzer
c) Conseiller d'accès IAM
d) Rapport d'identification IAM

**Réponse : B** - IAM Access Analyzer peut générer des stratégies de moindre privilège basées sur l'utilisation réelle de l'API à partir des journaux CloudTrail.

12. **Quelle est la durée maximale des informations d'identification temporaires de STS AssumeRole ?**
a) 1 heure
b) 12 heures
c) 24 heures
d) 7 jours

**Réponse : B** - La durée maximale de la session pour AssumeRole est de 12 heures (configurable par rôle).

13. **Quelle affirmation concernant IAM est FAUX ?**
a) IAM est un service mondial
b) Les utilisateurs IAM peuvent appartenir à plusieurs groupes
c) Les groupes IAM peuvent être imbriqués
d) Les rôles IAM peuvent être assumés entre comptes

**Réponse : C** - Les groupes IAM ne peuvent pas être imbriqués (les groupes ne peuvent pas contenir d'autres groupes).

14. **Que se passe-t-il si vous n'attachez aucune stratégie à un utilisateur IAM ?**
a) Ils obtiennent un accès en lecture seule
b) Ils n'obtiennent aucune autorisation (refus implicite)
c) Ils héritent des autorisations au niveau de l'organisation
d) Ils obtiennent un accès PowerUser

**Réponse : B** – En l'absence de stratégie attachée, l'utilisateur ne dispose d'aucune autorisation. Toutes les actions sont implicitement refusées par défaut.

15. **Quel n'est PAS un type de périphérique MFA valide pour AWS ?**
a) Appareil MFA virtuel (Google Authenticator)
b) Périphérique MFA matériel (Gemalto)
c) Clé de sécurité U2F (YubiKey)
d) SMS

**Réponse : D** - Les messages texte SMS ne sont pas pris en charge en tant que périphériques MFA pour AWS (bien qu'ils soient utilisés par certains autres fournisseurs d'identité).

***
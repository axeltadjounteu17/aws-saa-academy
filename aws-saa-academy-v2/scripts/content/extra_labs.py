"""Labs pratiques ajoutés à la v2 (contenu original, FR/EN).

Chaque texte est un couple (français, anglais). Les blocs de code sont communs aux deux langues
(commentaires en anglais, comme dans le corpus d'origine) et écrits en chaînes brutes r'''…'''
pour conserver les barres obliques inverses de bash.
Commandes prévues pour AWS CloudShell ou un AWS CLI v2 configuré, dans un compte de test.
"""

CLOUDSHELL = (
    "AWS CloudShell (recommandé : AWS CLI, jq et OpenSSL déjà installés) ou AWS CLI v2 configuré",
    "AWS CloudShell (recommended: AWS CLI, jq and OpenSSL preinstalled) or a configured AWS CLI v2",
)
ADMIN = ("Un compte AWS de test avec des droits administrateur", "A test AWS account with administrator permissions")

EXTRA_LABS = [
    {
        "id": "lab_extra_01", "chapterId": "ch_03", "domain": "D4", "difficulty": "beginner", "estimatedTime": 20,
        "tags": ["VPC", "S3", "NAT Gateway"],
        "title": ("Lab : accéder à S3 sans NAT Gateway avec un point de terminaison passerelle",
                  "Lab: reach S3 without a NAT Gateway using a gateway endpoint"),
        "objective": ("Ajouter un point de terminaison passerelle S3 à un VPC de test, le restreindre à un bucket et vérifier la route créée automatiquement.",
                      "Add an S3 gateway endpoint to a test VPC, restrict it to one bucket and check the route created automatically."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer un VPC et une table de routage de test", "Create a test VPC and route table"),
             "text": ("Le VPC est isolé : le lab ne modifie pas votre VPC par défaut.", "The VPC is isolated: the lab does not change your default VPC."),
             "code": r'''
export AWS_REGION=${AWS_REGION:-eu-west-3}
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.50.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=lab-gateway-endpoint}]' \
  --query Vpc.VpcId --output text)
RTB_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" --query RouteTable.RouteTableId --output text)
echo "$VPC_ID $RTB_ID"
'''},
            {"title": ("Repérer la liste de préfixes de S3", "Find the S3 prefix list"),
             "text": ("AWS publie les plages d'adresses de S3 dans une liste de préfixes gérée : c'est la destination de la route du point de terminaison.",
                      "AWS publishes the S3 address ranges in a managed prefix list: it is the destination of the endpoint route."),
             "code": r'''
aws ec2 describe-prefix-lists \
  --filters Name=prefix-list-name,Values=com.amazonaws.$AWS_REGION.s3 \
  --query 'PrefixLists[0].[PrefixListId,PrefixListName]' --output text
'''},
            {"title": ("Créer le point de terminaison, limité à un bucket", "Create the endpoint, limited to one bucket"),
             "text": ("Remplacez my-lab-bucket par l'un de vos buckets : tout autre bucket sera refusé à travers ce point de terminaison.",
                      "Replace my-lab-bucket with one of your buckets: any other bucket is denied through this endpoint."),
             "code": r'''
cat > endpoint-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
    "Resource": ["arn:aws:s3:::my-lab-bucket", "arn:aws:s3:::my-lab-bucket/*"]
  }]
}
EOF
ENDPOINT_ID=$(aws ec2 create-vpc-endpoint --vpc-id "$VPC_ID" --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.$AWS_REGION.s3 --route-table-ids "$RTB_ID" \
  --policy-document file://endpoint-policy.json \
  --query VpcEndpoint.VpcEndpointId --output text)
echo "$ENDPOINT_ID"
'''},
            {"title": ("Vérifier la route ajoutée", "Check the added route"),
             "text": ("Une route pl-… vers vpce-… apparaît : le trafic S3 des sous-réseaux associés reste sur le réseau AWS.",
                      "A pl-… to vpce-… route appears: S3 traffic from the associated subnets stays on the AWS network."),
             "code": r'''
aws ec2 describe-route-tables --route-table-ids "$RTB_ID" \
  --query 'RouteTables[0].Routes[].[DestinationPrefixListId,GatewayId,State]' --output table
'''},
        ],
        "expected": [
            ("Une route vers la liste de préfixes S3 cible le point de terminaison (vpce-…).", "A route to the S3 prefix list targets the endpoint (vpce-…)."),
            ("Le point de terminaison passerelle est gratuit, contrairement à la NAT Gateway, facturée à l'heure et au Go traité.",
             "The gateway endpoint is free, unlike the NAT Gateway, which is billed per hour and per GB processed."),
            ("Il ne sert qu'au trafic du VPC : depuis un réseau local (VPN, Direct Connect), il faut un point de terminaison interface.",
             "It only serves traffic from the VPC: from an on-premises network (VPN, Direct Connect), you need an interface endpoint."),
        ],
        "cleanup": {"text": ("La suppression du point de terminaison prend quelques secondes avant que la table de routage puisse être supprimée.",
                             "Deleting the endpoint takes a few seconds before the route table can be deleted."),
                    "code": r'''
aws ec2 delete-vpc-endpoints --vpc-endpoint-ids "$ENDPOINT_ID"
sleep 20
aws ec2 delete-route-table --route-table-id "$RTB_ID"
aws ec2 delete-vpc --vpc-id "$VPC_ID"
rm -f endpoint-policy.json
'''},
        "cost": ("Gratuit : VPC, table de routage et point de terminaison passerelle ne sont pas facturés.",
                 "Free: the VPC, route table and gateway endpoint are not billed."),
    },
    {
        "id": "lab_extra_02", "chapterId": "ch_02", "domain": "D1", "difficulty": "intermediate", "estimatedTime": 25,
        "tags": ["IAM", "STS"],
        "title": ("Lab : rôle IAM protégé par un ExternalId et identifiants temporaires",
                  "Lab: an IAM role protected by an ExternalId, with temporary credentials"),
        "objective": ("Créer un rôle en lecture seule que l'on ne peut assumer qu'avec un ExternalId, puis utiliser les identifiants temporaires fournis par STS.",
                      "Create a read-only role that can only be assumed with an ExternalId, then use the temporary credentials issued by STS."),
        "prerequisites": [CLOUDSHELL, ADMIN,
                          ("Un seul compte suffit : le rôle fait confiance à votre propre compte.", "One account is enough: the role trusts your own account.")],
        "steps": [
            {"title": ("Écrire la politique d'approbation", "Write the trust policy"),
             "text": ("Le principal « root » du compte désigne toute identité du compte autorisée par IAM, pas l'utilisateur root lui-même.",
                      "The account \"root\" principal means any identity in the account allowed by IAM, not the root user itself."),
             "code": r'''
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::${ACCOUNT_ID}:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "StringEquals": { "sts:ExternalId": "lab-external-id-4821" } }
  }]
}
EOF
'''},
            {"title": ("Créer le rôle en lecture seule", "Create the read-only role"),
             "text": ("La politique gérée ReadOnlyAccess donne la lecture sur la plupart des services, sans aucune écriture.",
                      "The ReadOnlyAccess managed policy grants read access to most services, with no write access."),
             "code": r'''
aws iam create-role --role-name LabReadOnlyRole \
  --assume-role-policy-document file://trust-policy.json --max-session-duration 3600
aws iam attach-role-policy --role-name LabReadOnlyRole \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
sleep 10   # IAM propagation
'''},
            {"title": ("Assumer le rôle sans puis avec l'ExternalId", "Assume the role without, then with, the ExternalId"),
             "text": ("Le premier appel est refusé car la condition sts:ExternalId n'est pas remplie.",
                      "The first call is denied because the sts:ExternalId condition is not met."),
             "code": r'''
ROLE_ARN=arn:aws:iam::${ACCOUNT_ID}:role/LabReadOnlyRole
aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name lab   # AccessDenied expected
aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name lab \
  --external-id lab-external-id-4821 --query Credentials.Expiration --output text
'''},
            {"title": ("Utiliser les identifiants temporaires", "Use the temporary credentials"),
             "text": ("Les variables d'environnement remplacent votre identité le temps du test ; supprimez-les à la fin.",
                      "The environment variables replace your identity for the test; unset them at the end."),
             "code": r'''
CREDS=$(aws sts assume-role --role-arn "$ROLE_ARN" --role-session-name lab \
  --external-id lab-external-id-4821 --query Credentials --output json)
export AWS_ACCESS_KEY_ID=$(echo "$CREDS" | jq -r .AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS" | jq -r .SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo "$CREDS" | jq -r .SessionToken)
aws sts get-caller-identity --query Arn --output text   # assumed-role/LabReadOnlyRole/lab
aws s3 ls                                                 # allowed: read only
aws s3 mb s3://lab-should-fail-$RANDOM                    # AccessDenied: no write permission
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
'''},
        ],
        "expected": [
            ("Sans ExternalId : AccessDenied. Avec : des identifiants valables une heure au plus.",
             "Without ExternalId: AccessDenied. With it: credentials valid for at most one hour."),
            ("get-caller-identity renvoie un ARN assumed-role : CloudTrail attribue les actions à ce rôle et à cette session.",
             "get-caller-identity returns an assumed-role ARN: CloudTrail attributes the actions to this role and session."),
            ("La création du bucket échoue : le rôle ne peut que lire.", "Creating the bucket fails: the role can only read."),
        ],
        "cleanup": {"text": ("Détachez la politique avant de supprimer le rôle.", "Detach the policy before deleting the role."),
                    "code": r'''
aws iam detach-role-policy --role-name LabReadOnlyRole --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
aws iam delete-role --role-name LabReadOnlyRole
rm -f trust-policy.json
'''},
        "cost": ("Gratuit : IAM et STS ne sont pas facturés.", "Free: IAM and STS are not billed."),
    },
    {
        "id": "lab_extra_03", "chapterId": "ch_08", "domain": "D4", "difficulty": "beginner", "estimatedTime": 20,
        "tags": ["S3", "S3 Glacier"],
        "title": ("Lab : versioning et règles de cycle de vie S3", "Lab: S3 versioning and lifecycle rules"),
        "objective": ("Activer le versioning, observer plusieurs versions d'un objet et définir des règles de cycle de vie pour les versions actuelles et non actuelles.",
                      "Enable versioning, observe several versions of an object and define lifecycle rules for current and noncurrent versions."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer un bucket versionné", "Create a versioned bucket"),
             "text": ("En us-east-1, retirez l'option --create-bucket-configuration.", "In us-east-1, remove the --create-bucket-configuration option."),
             "code": r'''
export AWS_REGION=${AWS_REGION:-eu-west-3}
BUCKET=lab-lifecycle-$(aws sts get-caller-identity --query Account --output text)-$RANDOM
aws s3api create-bucket --bucket "$BUCKET" --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION"
aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
'''},
            {"title": ("Envoyer deux versions du même objet", "Upload two versions of the same object"),
             "text": ("Chaque envoi crée une nouvelle version ; la plus récente porte IsLatest = True.",
                      "Each upload creates a new version; the most recent one has IsLatest = True."),
             "code": r'''
echo "version 1" > notes.txt && aws s3 cp notes.txt "s3://$BUCKET/notes.txt"
echo "version 2" > notes.txt && aws s3 cp notes.txt "s3://$BUCKET/notes.txt"
aws s3api list-object-versions --bucket "$BUCKET" --prefix notes.txt \
  --query 'Versions[].[VersionId,IsLatest,LastModified]' --output table
'''},
            {"title": ("Ajouter une règle de cycle de vie", "Add a lifecycle rule"),
             "text": ("Les versions actuelles descendent vers des classes moins chères ; les anciennes versions sont archivées puis supprimées.",
                      "Current versions move down to cheaper classes; old versions are archived and then deleted."),
             "code": r'''
cat > lifecycle.json <<'EOF'
{
  "Rules": [{
    "ID": "archive-and-expire",
    "Filter": { "Prefix": "" },
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 90, "StorageClass": "GLACIER_IR" },
      { "Days": 180, "StorageClass": "DEEP_ARCHIVE" }
    ],
    "NoncurrentVersionTransitions": [{ "NoncurrentDays": 30, "StorageClass": "GLACIER_IR" }],
    "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
EOF
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration file://lifecycle.json
aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET" --query 'Rules[0].ID'
'''},
            {"title": ("Supprimer l'objet et observer le marqueur", "Delete the object and observe the marker"),
             "text": ("Sur un bucket versionné, une suppression ajoute un marqueur de suppression : les versions restent récupérables.",
                      "On a versioned bucket, a delete adds a delete marker: the versions remain recoverable."),
             "code": r'''
aws s3 rm "s3://$BUCKET/notes.txt"
aws s3api list-object-versions --bucket "$BUCKET" --prefix notes.txt \
  --query '{versions: Versions[].VersionId, deleteMarkers: DeleteMarkers[].VersionId}'
'''},
        ],
        "expected": [
            ("Deux versions, puis un marqueur de suppression qui masque l'objet sans effacer ses versions.",
             "Two versions, then a delete marker that hides the object without erasing its versions."),
            ("La règle est enregistrée ; les transitions s'appliqueront après le nombre de jours indiqué, donc rien n'est visible pendant le lab.",
             "The rule is saved; transitions apply after the configured number of days, so nothing is visible during the lab."),
            ("Par défaut, les objets de moins de 128 Ko ne changent pas de classe de stockage.",
             "By default, objects smaller than 128 KB do not change storage class."),
        ],
        "cleanup": {"text": ("Un bucket versionné doit être vidé de toutes ses versions et de ses marqueurs avant d'être supprimé.",
                             "A versioned bucket must be emptied of all versions and delete markers before deletion."),
                    "code": r'''
for KIND in Versions DeleteMarkers; do
  aws s3api list-object-versions --bucket "$BUCKET" --query "${KIND}[].[Key,VersionId]" --output text |
  while read -r KEY VERSION; do
    { [ -z "$VERSION" ] || [ "$KEY" = "None" ]; } && continue
    aws s3api delete-object --bucket "$BUCKET" --key "$KEY" --version-id "$VERSION" > /dev/null
  done
done
aws s3api delete-bucket --bucket "$BUCKET"
rm -f notes.txt lifecycle.json
'''},
        "cost": ("Quasi gratuit : quelques octets stockés pendant quelques minutes.", "Almost free: a few bytes stored for a few minutes."),
    },
    {
        "id": "lab_extra_04", "chapterId": "ch_24", "domain": "D1", "difficulty": "intermediate", "estimatedTime": 25,
        "tags": ["KMS", "CloudTrail"],
        "title": ("Lab : chiffrement d'enveloppe avec une clé de données KMS", "Lab: envelope encryption with a KMS data key"),
        "objective": ("Chiffrer un fichier localement avec une clé de données générée par KMS, ne conserver que la clé chiffrée, puis tout déchiffrer.",
                      "Encrypt a file locally with a data key generated by KMS, keep only the encrypted key, then decrypt everything."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer une clé KMS et un alias", "Create a KMS key and an alias"),
             "text": ("La clé KMS ne quitte jamais le service : elle ne sert qu'à chiffrer et déchiffrer des clés de données.",
                      "The KMS key never leaves the service: it only encrypts and decrypts data keys."),
             "code": r'''
KEY_ID=$(aws kms create-key --description "lab envelope encryption" --query KeyMetadata.KeyId --output text)
aws kms create-alias --alias-name alias/lab-envelope --target-key-id "$KEY_ID"
'''},
            {"title": ("Générer une clé de données", "Generate a data key"),
             "text": ("KMS renvoie la clé en clair et la même clé chiffrée. Seule la version chiffrée est faite pour être stockée.",
                      "KMS returns the plaintext key and the same key encrypted. Only the encrypted copy is meant to be stored."),
             "code": r'''
aws kms generate-data-key --key-id alias/lab-envelope --key-spec AES_256 --output json > datakey.json
jq -r .Plaintext datakey.json > datakey.b64           # plaintext data key: never store it
jq -r .CiphertextBlob datakey.json > datakey.enc.b64  # encrypted data key: safe to store
rm -f datakey.json
'''},
            {"title": ("Chiffrer le fichier localement", "Encrypt the file locally"),
             "text": ("Pour rester simple, la clé de données sert ici de phrase secrète à OpenSSL. En production, l'AWS Encryption SDK l'utilise directement en AES-GCM.",
                      "To keep it simple, the data key is used here as an OpenSSL passphrase. In production, the AWS Encryption SDK uses it directly with AES-GCM."),
             "code": r'''
echo "Confidential data" > secret.txt
openssl enc -aes-256-cbc -pbkdf2 -salt -in secret.txt -out secret.txt.enc -pass file:datakey.b64
rm -f datakey.b64 secret.txt   # only the encrypted file and the encrypted key remain
ls -l secret.txt.enc datakey.enc.b64
'''},
            {"title": ("Déchiffrer avec KMS", "Decrypt with KMS"),
             "text": ("KMS déchiffre la clé de données (sans qu'on précise la clé KMS : elle est indiquée dans le texte chiffré), puis OpenSSL déchiffre le fichier.",
                      "KMS decrypts the data key (no need to name the KMS key: it is recorded in the ciphertext), then OpenSSL decrypts the file."),
             "code": r'''
base64 --decode datakey.enc.b64 > datakey.enc
aws kms decrypt --ciphertext-blob fileb://datakey.enc --query Plaintext --output text > datakey.b64
openssl enc -d -aes-256-cbc -pbkdf2 -in secret.txt.enc -out secret.decrypted.txt -pass file:datakey.b64
rm -f datakey.b64
cat secret.decrypted.txt
'''},
            {"title": ("Retrouver les appels dans CloudTrail", "Find the calls in CloudTrail"),
             "text": ("Les événements apparaissent dans l'historique CloudTrail après quelques minutes.",
                      "The events show up in the CloudTrail event history after a few minutes."),
             "code": r'''
aws cloudtrail lookup-events --max-results 5 \
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt \
  --query 'Events[].[EventTime,Username]' --output table
'''},
        ],
        "expected": [
            ("Le fichier déchiffré est identique à l'original.", "The decrypted file matches the original."),
            ("Sans accès à KMS (politique de clé et IAM), la clé chiffrée et le fichier restent inutilisables.",
             "Without access to KMS (key policy and IAM), the encrypted key and file are unusable."),
            ("Chaque appel GenerateDataKey et Decrypt est tracé dans CloudTrail.", "Every GenerateDataKey and Decrypt call is logged in CloudTrail."),
        ],
        "cleanup": {"text": ("Une clé KMS ne peut pas être supprimée immédiatement : planifiez sa suppression (7 jours minimum).",
                             "A KMS key cannot be deleted immediately: schedule its deletion (7 days minimum)."),
                    "code": r'''
aws kms delete-alias --alias-name alias/lab-envelope
aws kms schedule-key-deletion --key-id "$KEY_ID" --pending-window-in-days 7
rm -f secret.txt.enc secret.decrypted.txt datakey.enc datakey.enc.b64
'''},
        "cost": ("Une clé gérée par le client coûte environ 1 USD par mois, au prorata. Les quelques appels du lab restent dans l'offre gratuite de KMS.",
                 "A customer managed key costs about 1 USD per month, prorated. The few API calls in this lab stay within the KMS free tier."),
    },
    {
        "id": "lab_extra_05", "chapterId": "ch_17", "domain": "D2", "difficulty": "intermediate", "estimatedTime": 30,
        "tags": ["SNS", "SQS"],
        "title": ("Lab : diffusion SNS vers SQS avec file de lettres mortes", "Lab: SNS to SQS fan-out with a dead-letter queue"),
        "objective": ("Publier un message une seule fois vers deux files SQS, puis provoquer des échecs pour voir le message partir dans la file de lettres mortes.",
                      "Publish a message once to two SQS queues, then cause failures to see the message move to the dead-letter queue."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer la rubrique et la file de lettres mortes", "Create the topic and the dead-letter queue"),
             "text": ("La DLQ recevra les messages que les consommateurs n'arrivent pas à traiter.", "The DLQ will receive the messages consumers fail to process."),
             "code": r'''
TOPIC_ARN=$(aws sns create-topic --name lab-orders --query TopicArn --output text)
DLQ_URL=$(aws sqs create-queue --queue-name lab-orders-dlq --query QueueUrl --output text)
DLQ_ARN=$(aws sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn \
  --query Attributes.QueueArn --output text)
'''},
            {"title": ("Créer deux files avec une politique de redirection", "Create two queues with a redrive policy"),
             "text": ("Après 3 réceptions sans suppression (maxReceiveCount), un message est déplacé vers la DLQ.",
                      "After 3 receives without deletion (maxReceiveCount), a message is moved to the DLQ."),
             "code": r'''
cat > redrive.json <<EOF
{ "RedrivePolicy": "{\"deadLetterTargetArn\":\"${DLQ_ARN}\",\"maxReceiveCount\":\"3\"}" }
EOF
BILLING_URL=$(aws sqs create-queue --queue-name lab-billing --attributes file://redrive.json --query QueueUrl --output text)
SHIPPING_URL=$(aws sqs create-queue --queue-name lab-shipping --attributes file://redrive.json --query QueueUrl --output text)
'''},
            {"title": ("Abonner les files à la rubrique", "Subscribe the queues to the topic"),
             "text": ("La politique de chaque file n'autorise que cette rubrique SNS à y envoyer des messages.",
                      "Each queue policy only allows this SNS topic to send messages to it."),
             "code": r'''
for QUEUE_URL in "$BILLING_URL" "$SHIPPING_URL"; do
  QUEUE_ARN=$(aws sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn \
    --query Attributes.QueueArn --output text)
  cat > policy.json <<EOF
{ "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"sns.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"${QUEUE_ARN}\",\"Condition\":{\"ArnEquals\":{\"aws:SourceArn\":\"${TOPIC_ARN}\"}}}]}" }
EOF
  aws sqs set-queue-attributes --queue-url "$QUEUE_URL" --attributes file://policy.json
  aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs \
    --notification-endpoint "$QUEUE_ARN" --attributes RawMessageDelivery=true
done
'''},
            {"title": ("Publier et lire le message dans chaque file", "Publish and read the message in each queue"),
             "text": ("Le même message arrive dans les deux files.", "The same message lands in both queues."),
             "code": r'''
aws sns publish --topic-arn "$TOPIC_ARN" --message '{"orderId":"1001","total":42.5}'
aws sqs receive-message --queue-url "$BILLING_URL" --wait-time-seconds 10 --query 'Messages[0].Body' --output text
aws sqs receive-message --queue-url "$SHIPPING_URL" --wait-time-seconds 10 --query 'Messages[0].Body' --output text
'''},
            {"title": ("Simuler des échecs de traitement", "Simulate processing failures"),
             "text": ("On attend la fin du délai de visibilité (30 s), puis on reçoit le message sans jamais le supprimer. Le compteur de la DLQ peut mettre une minute à se mettre à jour.",
                      "Wait for the visibility timeout (30 s) to expire, then receive the message without ever deleting it. The DLQ counter can take a minute to update."),
             "code": r'''
sleep 30
for ATTEMPT in 1 2 3 4 5 6; do
  aws sqs receive-message --queue-url "$BILLING_URL" --visibility-timeout 0 \
    --wait-time-seconds 2 --query 'Messages[0].MessageId' --output text
done
aws sqs get-queue-attributes --queue-url "$DLQ_URL" \
  --attribute-names ApproximateNumberOfMessages --query Attributes --output text
'''},
        ],
        "expected": [
            ("Le producteur publie une fois ; chaque file reçoit sa copie et peut être traitée à son rythme.",
             "The producer publishes once; each queue gets its own copy and can be processed at its own pace."),
            ("Après 3 réceptions sans suppression, le message se retrouve dans la DLQ.", "After 3 receives without deletion, the message ends up in the DLQ."),
            ("En production, une alarme CloudWatch sur la DLQ prévient l'équipe d'exploitation.", "In production, a CloudWatch alarm on the DLQ alerts the operations team."),
        ],
        "cleanup": {"text": ("Supprimer la rubrique supprime aussi ses abonnements.", "Deleting the topic also deletes its subscriptions."),
                    "code": r'''
for QUEUE_URL in "$BILLING_URL" "$SHIPPING_URL" "$DLQ_URL"; do aws sqs delete-queue --queue-url "$QUEUE_URL"; done
aws sns delete-topic --topic-arn "$TOPIC_ARN"
rm -f redrive.json policy.json
'''},
        "cost": ("Gratuit dans l'offre gratuite : 1 million de requêtes SQS et 1 million de publications SNS par mois.",
                 "Free within the free tier: 1 million SQS requests and 1 million SNS publishes per month."),
    },
    {
        "id": "lab_extra_06", "chapterId": "ch_32", "domain": "D2", "difficulty": "advanced", "estimatedTime": 45,
        "tags": ["AWS Backup", "EBS", "IAM"],
        "title": ("Lab : sauvegarde AWS Backup copiée dans une autre région", "Lab: an AWS Backup recovery point copied to another Region"),
        "objective": ("Sauvegarder un petit volume EBS avec AWS Backup et copier le point de récupération dans une région de reprise.",
                      "Back up a small EBS volume with AWS Backup and copy the recovery point to a recovery Region."),
        "prerequisites": [CLOUDSHELL, ADMIN,
                          ("Deux régions : la région source et une région de reprise différente (ici eu-west-1).",
                           "Two Regions: the source Region and a different recovery Region (eu-west-1 here).")],
        "steps": [
            {"title": ("Créer un coffre dans chaque région", "Create a vault in each Region"),
             "text": ("Si votre région source est déjà eu-west-1, choisissez une autre région de reprise.",
                      "If your source Region is already eu-west-1, pick another recovery Region."),
             "code": r'''
SRC_REGION=${AWS_REGION:-eu-west-3}
DR_REGION=eu-west-1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws backup create-backup-vault --backup-vault-name lab-vault --region "$SRC_REGION"
aws backup create-backup-vault --backup-vault-name lab-vault-dr --region "$DR_REGION"
'''},
            {"title": ("Créer le rôle utilisé par AWS Backup", "Create the role used by AWS Backup"),
             "text": ("AWS Backup agit avec ce rôle pour créer et copier les instantanés.", "AWS Backup uses this role to create and copy snapshots."),
             "code": r'''
aws iam create-role --role-name LabBackupRole --assume-role-policy-document \
  '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"backup.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name LabBackupRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
ROLE_ARN=arn:aws:iam::${ACCOUNT_ID}:role/LabBackupRole
sleep 10   # IAM propagation
'''},
            {"title": ("Créer un volume et lancer une sauvegarde", "Create a volume and start a backup"),
             "text": ("Un volume gp3 de 1 Go suffit pour la démonstration.", "A 1 GB gp3 volume is enough for the demo."),
             "code": r'''
AZ=$(aws ec2 describe-availability-zones --region "$SRC_REGION" --query 'AvailabilityZones[0].ZoneName' --output text)
VOLUME_ID=$(aws ec2 create-volume --region "$SRC_REGION" --availability-zone "$AZ" \
  --size 1 --volume-type gp3 --query VolumeId --output text)
aws ec2 wait volume-available --region "$SRC_REGION" --volume-ids "$VOLUME_ID"
JOB_ID=$(aws backup start-backup-job --region "$SRC_REGION" --backup-vault-name lab-vault \
  --resource-arn "arn:aws:ec2:${SRC_REGION}:${ACCOUNT_ID}:volume/${VOLUME_ID}" \
  --iam-role-arn "$ROLE_ARN" --query BackupJobId --output text)
'''},
            {"title": ("Attendre la fin de la sauvegarde", "Wait for the backup to finish"),
             "text": ("Comptez quelques minutes.", "Allow a few minutes."),
             "code": r'''
while true; do
  STATE=$(aws backup describe-backup-job --region "$SRC_REGION" --backup-job-id "$JOB_ID" --query State --output text)
  echo "$STATE"; [ "$STATE" = COMPLETED ] && break
  case "$STATE" in FAILED|ABORTED|EXPIRED) break;; esac
  sleep 20
done
RECOVERY_POINT=$(aws backup describe-backup-job --region "$SRC_REGION" --backup-job-id "$JOB_ID" \
  --query RecoveryPointArn --output text)
'''},
            {"title": ("Copier le point de récupération dans la région de reprise", "Copy the recovery point to the recovery Region"),
             "text": ("Relancez la dernière commande jusqu'à l'état COMPLETED.", "Run the last command again until the state is COMPLETED."),
             "code": r'''
DR_VAULT_ARN=$(aws backup describe-backup-vault --region "$DR_REGION" --backup-vault-name lab-vault-dr \
  --query BackupVaultArn --output text)
COPY_JOB_ID=$(aws backup start-copy-job --region "$SRC_REGION" --recovery-point-arn "$RECOVERY_POINT" \
  --source-backup-vault-name lab-vault --destination-backup-vault-arn "$DR_VAULT_ARN" \
  --iam-role-arn "$ROLE_ARN" --query CopyJobId --output text)
aws backup describe-copy-job --region "$SRC_REGION" --copy-job-id "$COPY_JOB_ID" --query CopyJob.State --output text
'''},
        ],
        "expected": [
            ("Un point de récupération dans chaque région : c'est la stratégie « sauvegarde et restauration ».",
             "One recovery point in each Region: this is the \"backup and restore\" strategy."),
            ("En production, un plan AWS Backup automatise la fréquence, la rétention et la copie (action de copie dans la règle).",
             "In production, an AWS Backup plan automates frequency, retention and copy (copy action in the rule)."),
            ("Le RPO dépend de la fréquence des sauvegardes, le RTO de la durée de restauration : ce sont les plus longs des quatre stratégies.",
             "RPO depends on backup frequency and RTO on restore time: they are the longest of the four strategies."),
        ],
        "cleanup": {"text": ("Supprimez les points de récupération avant les coffres : un coffre doit être vide pour être supprimé.",
                             "Delete the recovery points before the vaults: a vault must be empty to be deleted."),
                    "code": r'''
DR_POINT=$(aws backup describe-copy-job --region "$SRC_REGION" --copy-job-id "$COPY_JOB_ID" \
  --query CopyJob.DestinationRecoveryPointArn --output text)
aws backup delete-recovery-point --region "$DR_REGION" --backup-vault-name lab-vault-dr --recovery-point-arn "$DR_POINT"
aws backup delete-recovery-point --region "$SRC_REGION" --backup-vault-name lab-vault --recovery-point-arn "$RECOVERY_POINT"
sleep 30
aws backup delete-backup-vault --region "$DR_REGION" --backup-vault-name lab-vault-dr
aws backup delete-backup-vault --region "$SRC_REGION" --backup-vault-name lab-vault
aws ec2 delete-volume --region "$SRC_REGION" --volume-id "$VOLUME_ID"
aws iam detach-role-policy --role-name LabBackupRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup
aws iam delete-role --role-name LabBackupRole
'''},
        "cost": ("Quelques centimes : un volume de 1 Go pendant moins d'une heure, ses instantanés et un transfert entre régions minime.",
                 "A few cents: a 1 GB volume for under an hour, its snapshots and a tiny cross-Region transfer."),
    },
    {
        "id": "lab_extra_07", "chapterId": "ch_05", "domain": "D2", "difficulty": "intermediate", "estimatedTime": 30,
        "tags": ["Auto Scaling", "EC2", "CloudWatch"],
        "title": ("Lab : Auto Scaling avec suivi de cible et autoréparation", "Lab: Auto Scaling with target tracking and self-healing"),
        "objective": ("Créer un groupe Auto Scaling sur deux zones, ajouter une politique de suivi de cible et vérifier qu'une instance terminée est remplacée.",
                      "Create an Auto Scaling group across two zones, add a target tracking policy and check that a terminated instance is replaced."),
        "prerequisites": [CLOUDSHELL, ADMIN,
                          ("Le VPC par défaut avec ses sous-réseaux par défaut (présents dans la plupart des comptes).",
                           "The default VPC with its default subnets (present in most accounts).")],
        "steps": [
            {"title": ("Trouver l'AMI et deux sous-réseaux", "Find the AMI and two subnets"),
             "text": ("Le paramètre public SSM donne toujours l'AMI Amazon Linux 2023 la plus récente.", "The public SSM parameter always returns the latest Amazon Linux 2023 AMI."),
             "code": r'''
AMI_ID=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text)
SUBNETS=$(aws ec2 describe-subnets --filters Name=default-for-az,Values=true \
  --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
echo "$AMI_ID $SUBNETS"
'''},
            {"title": ("Créer le modèle de lancement et le groupe", "Create the launch template and the group"),
             "text": ("Minimum 2 instances réparties sur 2 zones : le groupe survit à la perte d'une zone.",
                      "At least 2 instances across 2 zones: the group survives the loss of one zone."),
             "code": r'''
aws ec2 create-launch-template --launch-template-name lab-asg-template \
  --launch-template-data "{\"ImageId\":\"${AMI_ID}\",\"InstanceType\":\"t3.micro\"}"
aws autoscaling create-auto-scaling-group --auto-scaling-group-name lab-asg \
  --launch-template 'LaunchTemplateName=lab-asg-template,Version=$Latest' \
  --min-size 2 --max-size 4 --desired-capacity 2 --vpc-zone-identifier "$SUBNETS"
'''},
            {"title": ("Ajouter une politique de suivi de cible", "Add a target tracking policy"),
             "text": ("La politique crée elle-même les alarmes CloudWatch qui ajoutent ou retirent des instances.",
                      "The policy creates the CloudWatch alarms that add or remove instances by itself."),
             "code": r'''
cat > target-tracking.json <<'EOF'
{ "TargetValue": 50.0, "PredefinedMetricSpecification": { "PredefinedMetricType": "ASGAverageCPUUtilization" } }
EOF
aws autoscaling put-scaling-policy --auto-scaling-group-name lab-asg --policy-name cpu-50 \
  --policy-type TargetTrackingScaling --target-tracking-configuration file://target-tracking.json
'''},
            {"title": ("Terminer une instance et observer le remplacement", "Terminate an instance and watch the replacement"),
             "text": ("Le groupe détecte la baisse de capacité et lance une nouvelle instance.", "The group detects the lower capacity and launches a new instance."),
             "code": r'''
sleep 60
INSTANCE_ID=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names lab-asg \
  --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text)
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID"
sleep 120
aws autoscaling describe-scaling-activities --auto-scaling-group-name lab-asg --max-items 4 \
  --query 'Activities[].[StatusCode,Description]' --output table
'''},
        ],
        "expected": [
            ("Deux instances réparties sur deux zones de disponibilité.", "Two instances spread over two Availability Zones."),
            ("Après la terminaison manuelle, une activité « Launching a new EC2 instance » ramène le groupe à 2 instances.",
             "After the manual termination, a \"Launching a new EC2 instance\" activity brings the group back to 2 instances."),
            ("Deux alarmes TargetTracking-lab-asg-… apparaissent dans CloudWatch.", "Two TargetTracking-lab-asg-… alarms appear in CloudWatch."),
        ],
        "cleanup": {"text": ("--force-delete termine les instances en même temps que le groupe.", "--force-delete terminates the instances together with the group."),
                    "code": r'''
aws autoscaling delete-auto-scaling-group --auto-scaling-group-name lab-asg --force-delete
aws ec2 delete-launch-template --launch-template-name lab-asg-template
rm -f target-tracking.json
'''},
        "cost": ("Environ 0,01 USD par heure et par instance t3.micro : supprimez le groupe à la fin.",
                 "About 0.01 USD per hour per t3.micro instance: delete the group at the end."),
    },
    {
        "id": "lab_extra_08", "chapterId": "ch_21", "domain": "D4", "difficulty": "intermediate", "estimatedTime": 25,
        "tags": ["Athena", "S3", "Glue"],
        "title": ("Lab : partitions Athena et volume de données lu", "Lab: Athena partitions and data scanned"),
        "objective": ("Interroger des fichiers CSV partitionnés sur S3 avec Athena et comparer le volume lu avec et sans filtre de partition.",
                      "Query partitioned CSV files on S3 with Athena and compare the data scanned with and without a partition filter."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer un bucket et des données partitionnées", "Create a bucket and partitioned data"),
             "text": ("Un dossier par mois, au format year=…/month=… reconnu par Athena.", "One folder per month, using the year=…/month=… layout Athena recognizes."),
             "code": r'''
export AWS_REGION=${AWS_REGION:-eu-west-3}
BUCKET=lab-athena-$(aws sts get-caller-identity --query Account --output text)-$RANDOM
aws s3 mb "s3://$BUCKET" --region "$AWS_REGION"
for MONTH in 01 02 03; do
  echo "order_id,amount,country" > orders.csv
  for i in $(seq 1 500); do echo "${MONTH}-${i},$((RANDOM % 500)),FR" >> orders.csv; done
  aws s3 cp orders.csv "s3://$BUCKET/orders/year=2025/month=${MONTH}/orders.csv"
done
'''},
            {"title": ("Définir une fonction d'exécution des requêtes", "Define a query helper"),
             "text": ("La fonction lance une requête, attend sa fin et affiche son état et le nombre d'octets lus.",
                      "The function starts a query, waits for it to finish and prints its state and the bytes scanned."),
             "code": r'''
athena() {
  local QID STATE
  QID=$(aws athena start-query-execution --query-string "$1" \
    --result-configuration "OutputLocation=s3://$BUCKET/results/" --query QueryExecutionId --output text)
  while true; do
    STATE=$(aws athena get-query-execution --query-execution-id "$QID" --query QueryExecution.Status.State --output text)
    case "$STATE" in SUCCEEDED|FAILED|CANCELLED) break;; esac
    sleep 1
  done
  aws athena get-query-execution --query-execution-id "$QID" \
    --query '[QueryExecution.Status.State,QueryExecution.Statistics.DataScannedInBytes]' --output text
}
'''},
            {"title": ("Créer la base, la table et ses partitions", "Create the database, the table and its partitions"),
             "text": ("MSCK REPAIR TABLE découvre les dossiers de partitions déjà présents dans S3.", "MSCK REPAIR TABLE discovers the partition folders already in S3."),
             "code": r'''
athena "CREATE DATABASE IF NOT EXISTS lab_athena"
athena "CREATE EXTERNAL TABLE IF NOT EXISTS lab_athena.orders (order_id string, amount int, country string) PARTITIONED BY (year string, month string) ROW FORMAT DELIMITED FIELDS TERMINATED BY ',' LOCATION 's3://$BUCKET/orders/' TBLPROPERTIES ('skip.header.line.count'='1')"
athena "MSCK REPAIR TABLE lab_athena.orders"
'''},
            {"title": ("Comparer le volume lu", "Compare the data scanned"),
             "text": ("La seconde requête ne lit que la partition de février.", "The second query only reads the February partition."),
             "code": r'''
athena "SELECT count(*), sum(amount) FROM lab_athena.orders"
athena "SELECT count(*), sum(amount) FROM lab_athena.orders WHERE year = '2025' AND month = '02'"
'''},
        ],
        "expected": [
            ("La requête filtrée lit environ trois fois moins de données.", "The filtered query scans about three times less data."),
            ("Athena facture au volume lu (10 Mo minimum par requête) : partitions, compression et format en colonnes (Parquet) réduisent coût et durée.",
             "Athena bills by data scanned (10 MB minimum per query): partitions, compression and a columnar format (Parquet) cut cost and time."),
        ],
        "cleanup": {"text": ("Supprimez la table et la base avant le bucket.", "Drop the table and the database before the bucket."),
                    "code": r'''
athena "DROP TABLE IF EXISTS lab_athena.orders"
athena "DROP DATABASE IF EXISTS lab_athena"
aws s3 rb "s3://$BUCKET" --force
rm -f orders.csv
'''},
        "cost": ("Moins d'un centime : quelques requêtes facturées 10 Mo chacune.", "Under one cent: a few queries billed at 10 MB each."),
    },
    {
        "id": "lab_extra_09", "chapterId": "ch_16", "domain": "D1", "difficulty": "advanced", "estimatedTime": 35,
        "tags": ["Site-to-Site VPN", "VPC"],
        "title": ("Lab : configurer un VPN Site-to-Site côté AWS", "Lab: configure a Site-to-Site VPN on the AWS side"),
        "objective": ("Créer une passerelle privée virtuelle, une passerelle client et une connexion VPN à routes statiques, puis observer les deux tunnels et la propagation des routes.",
                      "Create a virtual private gateway, a customer gateway and a static-route VPN connection, then observe both tunnels and route propagation."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer un VPC et une passerelle privée virtuelle", "Create a VPC and a virtual private gateway"),
             "text": ("La passerelle privée virtuelle est l'extrémité AWS du VPN.", "The virtual private gateway is the AWS end of the VPN."),
             "code": r'''
export AWS_REGION=${AWS_REGION:-eu-west-3}
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.60.0.0/16 --query Vpc.VpcId --output text)
VGW_ID=$(aws ec2 create-vpn-gateway --type ipsec.1 --amazon-side-asn 64512 \
  --query VpnGateway.VpnGatewayId --output text)
aws ec2 attach-vpn-gateway --vpn-gateway-id "$VGW_ID" --vpc-id "$VPC_ID"
'''},
            {"title": ("Déclarer la passerelle client", "Declare the customer gateway"),
             "text": ("Sans équipement réel, on utilise votre adresse IP publique : les tunnels resteront « DOWN », mais toute la configuration AWS est visible.",
                      "Without real hardware, your public IP address is used: the tunnels stay DOWN, but the whole AWS configuration is visible."),
             "code": r'''
MY_IP=$(curl -s https://checkip.amazonaws.com)
CGW_ID=$(aws ec2 create-customer-gateway --type ipsec.1 --bgp-asn 65000 --ip-address "$MY_IP" \
  --query CustomerGateway.CustomerGatewayId --output text)
'''},
            {"title": ("Créer la connexion VPN à routes statiques", "Create the static-route VPN connection"),
             "text": ("La création prend environ 5 minutes ; 192.168.0.0/16 représente le réseau local.",
                      "Creation takes about 5 minutes; 192.168.0.0/16 stands for the on-premises network."),
             "code": r'''
VPN_ID=$(aws ec2 create-vpn-connection --type ipsec.1 --customer-gateway-id "$CGW_ID" \
  --vpn-gateway-id "$VGW_ID" --options StaticRoutesOnly=true \
  --query VpnConnection.VpnConnectionId --output text)
aws ec2 wait vpn-connection-available --vpn-connection-ids "$VPN_ID"
aws ec2 create-vpn-connection-route --vpn-connection-id "$VPN_ID" --destination-cidr-block 192.168.0.0/16
'''},
            {"title": ("Observer les tunnels et propager les routes", "Inspect the tunnels and propagate routes"),
             "text": ("La propagation ajoute les routes du VPN dans la table de routage du VPC, sans saisie manuelle.",
                      "Propagation adds the VPN routes to the VPC route table, with no manual entry."),
             "code": r'''
aws ec2 describe-vpn-connections --vpn-connection-ids "$VPN_ID" \
  --query 'VpnConnections[0].VgwTelemetry[].[OutsideIpAddress,Status]' --output table
RTB_ID=$(aws ec2 describe-route-tables --filters Name=vpc-id,Values="$VPC_ID" \
  --query 'RouteTables[0].RouteTableId' --output text)
aws ec2 enable-vgw-route-propagation --route-table-id "$RTB_ID" --gateway-id "$VGW_ID"
aws ec2 describe-route-tables --route-table-ids "$RTB_ID" --query 'RouteTables[0].Routes[].[DestinationCidrBlock,GatewayId,Origin]' --output table
'''},
        ],
        "expected": [
            ("Deux tunnels, chacun avec sa propre adresse IP côté AWS, pour la redondance.", "Two tunnels, each with its own AWS-side IP address, for redundancy."),
            ("La route 192.168.0.0/16 apparaît dans la table de routage avec l'origine EnableVgwRoutePropagation.",
             "The 192.168.0.0/16 route appears in the route table with the EnableVgwRoutePropagation origin."),
            ("Avec Direct Connect, ce VPN sert de secours : BGP préfère le lien Direct Connect tant qu'il est disponible.",
             "With Direct Connect, this VPN acts as a backup: BGP prefers the Direct Connect link while it is available."),
        ],
        "cleanup": {"text": ("Supprimez la connexion VPN en premier : elle est facturée à l'heure.", "Delete the VPN connection first: it is billed per hour."),
                    "code": r'''
aws ec2 delete-vpn-connection --vpn-connection-id "$VPN_ID"
aws ec2 wait vpn-connection-deleted --vpn-connection-ids "$VPN_ID"
aws ec2 delete-customer-gateway --customer-gateway-id "$CGW_ID"
aws ec2 detach-vpn-gateway --vpn-gateway-id "$VGW_ID" --vpc-id "$VPC_ID"
sleep 90   # detaching takes about a minute
aws ec2 delete-vpn-gateway --vpn-gateway-id "$VGW_ID"
aws ec2 delete-vpc --vpc-id "$VPC_ID"
'''},
        "cost": ("Environ 0,05 USD par heure de connexion VPN : supprimez-la dès la fin du lab.",
                 "About 0.05 USD per hour of VPN connection: delete it as soon as you finish."),
    },
    {
        "id": "lab_extra_10", "chapterId": "ch_18", "domain": "D2", "difficulty": "intermediate", "estimatedTime": 25,
        "tags": ["EventBridge", "S3", "CloudWatch"],
        "title": ("Lab : réagir aux nouveaux objets S3 avec EventBridge", "Lab: react to new S3 objects with EventBridge"),
        "objective": ("Envoyer les événements d'un bucket S3 vers EventBridge et les écrire dans CloudWatch Logs grâce à une règle filtrée.",
                      "Send S3 bucket events to EventBridge and write them to CloudWatch Logs with a filtered rule."),
        "prerequisites": [CLOUDSHELL, ADMIN],
        "steps": [
            {"title": ("Créer un bucket et activer EventBridge", "Create a bucket and enable EventBridge"),
             "text": ("Une fois activé, S3 envoie tous ses événements au bus d'événements par défaut.", "Once enabled, S3 sends all its events to the default event bus."),
             "code": r'''
export AWS_REGION=${AWS_REGION:-eu-west-3}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=lab-events-${ACCOUNT_ID}-$RANDOM
aws s3 mb "s3://$BUCKET" --region "$AWS_REGION"
aws s3api put-bucket-notification-configuration --bucket "$BUCKET" \
  --notification-configuration '{"EventBridgeConfiguration": {}}'
'''},
            {"title": ("Préparer le groupe de journaux", "Prepare the log group"),
             "text": ("La politique de ressource autorise EventBridge à écrire dans ce groupe de journaux.", "The resource policy lets EventBridge write to this log group."),
             "code": r'''
aws logs create-log-group --log-group-name /aws/events/lab-s3
LOG_ARN=arn:aws:logs:${AWS_REGION}:${ACCOUNT_ID}:log-group:/aws/events/lab-s3
aws logs put-resource-policy --policy-name lab-eventbridge-to-logs --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":[\"events.amazonaws.com\",\"delivery.logs.amazonaws.com\"]},\"Action\":[\"logs:CreateLogStream\",\"logs:PutLogEvents\"],\"Resource\":\"${LOG_ARN}:*\"}]}"
'''},
            {"title": ("Créer la règle et sa cible", "Create the rule and its target"),
             "text": ("Le modèle d'événement ne retient que les objets créés dans ce bucket.", "The event pattern only keeps objects created in this bucket."),
             "code": r'''
aws events put-rule --name lab-s3-object-created --event-pattern \
  "{\"source\":[\"aws.s3\"],\"detail-type\":[\"Object Created\"],\"detail\":{\"bucket\":{\"name\":[\"${BUCKET}\"]}}}"
aws events put-targets --rule lab-s3-object-created --targets "[{\"Id\":\"logs\",\"Arn\":\"${LOG_ARN}\"}]"
'''},
            {"title": ("Envoyer un objet et lire l'événement", "Upload an object and read the event"),
             "text": ("L'événement arrive en quelques secondes.", "The event arrives within seconds."),
             "code": r'''
echo "hello" > hello.txt
aws s3 cp hello.txt "s3://$BUCKET/uploads/hello.txt"
sleep 20
aws logs filter-log-events --log-group-name /aws/events/lab-s3 \
  --query 'events[0].message' --output text | head -c 800; echo
'''},
        ],
        "expected": [
            ("Un événement « Object Created » apparaît dans le groupe de journaux, avec le nom du bucket et la clé de l'objet.",
             "An \"Object Created\" event appears in the log group, with the bucket name and the object key."),
            ("Le même événement pourrait déclencher Lambda, Step Functions ou une file SQS sans modifier le producteur.",
             "The same event could trigger Lambda, Step Functions or an SQS queue without changing the producer."),
        ],
        "cleanup": {"text": ("Retirez la cible avant de supprimer la règle.", "Remove the target before deleting the rule."),
                    "code": r'''
aws events remove-targets --rule lab-s3-object-created --ids logs
aws events delete-rule --name lab-s3-object-created
aws logs delete-resource-policy --policy-name lab-eventbridge-to-logs
aws logs delete-log-group --log-group-name /aws/events/lab-s3
aws s3 rb "s3://$BUCKET" --force
rm -f hello.txt
'''},
        "cost": ("Quasi gratuit : quelques événements et quelques Ko de journaux.", "Almost free: a handful of events and a few KB of logs."),
    },
]

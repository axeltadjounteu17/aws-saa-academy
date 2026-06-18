# Part 5: Networking \& Content Delivery

# Chapter 14: Amazon CloudFront

## Introduction

Content delivery speed directly impacts user experience, engagement, and revenue. Studies show that a 100ms delay in page load time can reduce conversions by 7%, and 40% of users abandon websites that take more than 3 seconds to load. Amazon CloudFront, AWS's content delivery network (CDN), solves this problem by caching content at 450+ edge locations worldwide, delivering data from the location closest to users. Instead of requesting files from your origin server thousands of miles away, users receive content from nearby edge locations with single-digit millisecond latency.

CloudFront isn't just about speed—it's a comprehensive content delivery platform providing security, customization, and reliability. CloudFront integrates with AWS Shield for DDoS protection, AWS WAF for application firewall, and AWS Certificate Manager for free SSL/TLS certificates. Lambda@Edge enables running code at edge locations for dynamic content generation, A/B testing, and request/response manipulation. Origin failover provides automatic switching between primary and backup origins, ensuring high availability. Understanding CloudFront's architecture, cache behaviors, and optimization techniques transforms slow, centralized applications into fast, globally distributed systems.

The difference between proper and improper CloudFront configuration can mean success or failure for global applications. Misconfigured cache keys cause duplicate caching, wasting storage and reducing hit rates. Wrong TTL settings serve stale content or miss cache opportunities. Improper origin configurations expose backend servers to DDoS attacks. Missing security headers leave applications vulnerable. This chapter covers CloudFront from fundamentals to production patterns, including distributions, origins, cache behaviors, Lambda@Edge, signed URLs/cookies, security best practices, monitoring, and cost optimization. Whether you're serving static websites or dynamic applications, mastering CloudFront is essential for delivering exceptional global performance.

## Theory \& Concepts

### CloudFront Fundamentals

**What is CloudFront?**

CloudFront is AWS's content delivery network (CDN) that caches and delivers content from edge locations closest to users.

**Core Components:**

```
User Request
    ↓
CloudFront Edge Location (nearest to user)
├── Cache Hit: Serve from edge (fast, ms latency)
└── Cache Miss: Fetch from origin (slower, first request)
    ↓
Origin (S3, ALB, API Gateway, custom server)
    ↓
CloudFront caches response at edge
    ↓
Subsequent requests served from cache
```

**Key Benefits:**

- **Performance:** Reduced latency (data closer to users)
- **Global Reach:** 450+ edge locations across 100+ cities
- **Security:** DDoS protection, SSL/TLS, WAF integration
- **Cost Reduction:** Reduced origin load, lower data transfer costs
- **Availability:** Multiple origins, automatic failover
- **Flexibility:** Lambda@Edge for custom logic

> **2025 Updated Facts:**
> - CloudFront has **600+ Points of Presence** (edge locations + regional edge caches) across **100+ cities in 50+ countries** as of 2025 (previously quoted as 450+)
> - CloudFront supports **gRPC** natively on ALB origins
> - **Origin Access Control (OAC)** is the current recommended method (replaces legacy OAI — Origin Access Identity)
> - **CloudFront Functions** support JavaScript (ES 5.1+); Lambda@Edge supports Node.js 18.x and Python 3.12
> - **Response Headers Policies**: You can now attach managed or custom response headers policies to cache behaviors without Lambda@Edge — eliminating the need for Lambda just to add security headers
> - **Continuous deployment**: CloudFront supports staging distributions and traffic weights for canary deployments natively (no Lambda required)
> - **CloudFront KeyValueStore**: Serverless key-value store accessible from CloudFront Functions for dynamic configuration without redeployment


### Distributions

**Two Distribution Types:**

**1. Web Distribution:**

```
Use for: Websites, web applications, APIs
Protocols: HTTP, HTTPS
Origins: S3, ALB, EC2, custom origins
Features: All CloudFront features
```

**2. RTMP Distribution (Deprecated):**

```
Legacy streaming media distribution
Being replaced by other streaming solutions
```

**Distribution Configuration:**

```
Distribution
├── Origins: Where content comes from
├── Behaviors: Rules for handling requests
├── Error Pages: Custom error responses
├── Restrictions: Geo-blocking rules
└── Invalidations: Cache clearing
```


### Origins

**Supported Origin Types:**

**1. Amazon S3:**

```
Use for: Static websites, images, videos, downloads

Configuration:
- S3 bucket endpoint
- Origin Access Identity (OAI): Restrict direct S3 access
- S3 bucket policies: Allow CloudFront access only

Example:
Origin: my-bucket.s3.amazonaws.com
OAI: CloudFront user can access
S3 Policy: Block public access, allow OAI only
```

**2. Application Load Balancer:**

```
Use for: Dynamic content, web applications

Configuration:
- ALB DNS name
- Custom headers for origin verification
- Security groups allow CloudFront IP ranges

Example:
Origin: my-alb-123456.us-east-1.elb.amazonaws.com
Security: Only allow CloudFront managed prefix list
```

**3. EC2 or Custom Origin:**

```
Use for: Legacy apps, custom servers

Configuration:
- Public IP or DNS
- HTTP/HTTPS protocol
- Custom port (default 80/443)

Example:
Origin: api.example.com:8080
Protocol: HTTPS
Custom headers: X-Origin-Verify: secret-token
```

**4. API Gateway:**

```
Use for: REST APIs, serverless backends

Configuration:
- API Gateway endpoint
- Custom domain with API Gateway
- Authorization headers

Example:
Origin: abc123.execute-api.us-east-1.amazonaws.com
Path: /prod
```


### Origin Groups (Failover)

**High Availability with Multiple Origins:**

```
Origin Group
├── Primary Origin (S3 bucket us-east-1)
└── Secondary Origin (S3 bucket us-west-2)

Failover Triggers:
- 5xx errors (500, 502, 503, 504)
- Origin timeouts

Process:
1. Request sent to primary origin
2. Primary returns 503 (unavailable)
3. CloudFront automatically tries secondary
4. Secondary responds successfully
5. Content served to user

No manual intervention required
```

**Configuration:**

```bash
# Create origin group with failover
aws cloudfront create-distribution --distribution-config '{
  "Origins": {
    "Items": [
      {
        "Id": "primary-s3",
        "DomainName": "primary-bucket.s3.amazonaws.com",
        "S3OriginConfig": {...}
      },
      {
        "Id": "secondary-s3",
        "DomainName": "secondary-bucket.s3.amazonaws.com",
        "S3OriginConfig": {...}
      }
    ]
  },
  "OriginGroups": {
    "Items": [{
      "Id": "s3-failover-group",
      "FailoverCriteria": {
        "StatusCodes": {
          "Items": [500, 502, 503, 504],
          "Quantity": 4
        }
      },
      "Members": {
        "Items": [
          {"OriginId": "primary-s3"},
          {"OriginId": "secondary-s3"}
        ]
      }
    }]
  }
}'
```


### Cache Behaviors

**What are Cache Behaviors?**

Rules that define how CloudFront handles requests based on path patterns.

**Path Pattern Matching:**

```
Default Behavior (*): Matches all requests
├── /images/*: Images cached for 24 hours
├── /api/*: Not cached, forward all headers
├── /static/*: Cached for 1 year
└── /*.html: Cached for 1 hour

Order matters: First match wins
```

**Key Settings:**

**1. Path Pattern:**

```
Examples:
- *: Match everything (default)
- /images/*.jpg: JPEG images
- /api/*: API requests
- /static/css/*.css: CSS files
```

**2. Origin:**

```
Which origin serves this path
- S3 for static assets
- ALB for dynamic content
- API Gateway for API endpoints
```

**3. Viewer Protocol Policy:**

```
- HTTP and HTTPS: Allow both
- Redirect HTTP to HTTPS: Force encryption
- HTTPS Only: Reject HTTP requests

Recommendation: Redirect HTTP to HTTPS
```

**4. Allowed HTTP Methods:**

```
- GET, HEAD: Read-only (caching)
- GET, HEAD, OPTIONS: Read + preflight
- GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE: All methods (no caching POST/PUT/DELETE)
```

**5. Cache Key and Origin Requests:**

```
Cache Key: What makes cached objects unique

Include in cache key:
- Query strings: ?id=123
- Headers: Accept-Language, Accept-Encoding
- Cookies: session_id

Important: Only include what's necessary
- More in cache key = lower hit rate
- Less in cache key = higher hit rate, but less personalization
```


### Caching and TTL

**Cache TTL (Time To Live):**

```
Three TTL Sources (priority order):

1. Cache-Control headers from origin
   Cache-Control: max-age=3600
   CloudFront respects this

2. CloudFront cache behavior settings
   Minimum TTL: 0 seconds
   Maximum TTL: 31536000 seconds (1 year)
   Default TTL: 86400 seconds (24 hours)

3. If no Cache-Control header:
   Uses default TTL from behavior

Best Practice:
Set Cache-Control at origin for control
Use CloudFront settings as guardrails
```

**TTL Strategy by Content Type:**

```
Static Assets (never change):
- images/logo.png
- styles/main.css
- scripts/app.js
TTL: 1 year (31536000)
Versioning: Use query strings (?v=1.0.2) or file hashing

Dynamic Content (frequently changes):
- /api/products
- /feed/latest
TTL: 0 seconds (no cache) or very short (60s)

Semi-Dynamic Content:
- /products/list
- /blog/posts
TTL: 5-60 minutes
Invalidate on update

HTML Pages:
TTL: 5-60 minutes
Use versioned assets for static resources
```

**Cache-Control Examples:**

```
Origin Response Headers:

1. Cache for 1 hour, public cache allowed:
Cache-Control: public, max-age=3600

2. Cache for 1 day, CDN can cache longer:
Cache-Control: public, max-age=86400, s-maxage=604800

3. Don't cache (always fetch fresh):
Cache-Control: no-cache, no-store, must-revalidate

4. Cache but revalidate with origin:
Cache-Control: max-age=3600, must-revalidate

5. Private (don't cache in CDN):
Cache-Control: private, max-age=3600
```


### Lambda@Edge

**What is Lambda@Edge?**

Run Lambda functions at CloudFront edge locations for request/response manipulation.

**Four Trigger Points:**

```
Client Request
    ↓
1. Viewer Request (before cache lookup)
   - Modify request before checking cache
   - A/B testing, authentication, URL rewriting
    ↓
CloudFront Cache Lookup
    ↓
2. Origin Request (cache miss, before origin)
   - Modify request before sending to origin
   - Add authentication headers, dynamic origin selection
    ↓
Origin Response
    ↓
3. Origin Response (after origin, before caching)
   - Modify response before caching
   - Add security headers, image optimization
    ↓
Cache and Store
    ↓
4. Viewer Response (before sending to client)
   - Modify response before sending to user
   - Personalization, add cookies
    ↓
Client Receives Response
```

**Use Cases:**

```
Viewer Request:
- A/B testing (route to different origins)
- Normalize cache keys
- Redirect mobile users
- Bot detection
- Authentication

Origin Request:
- Add authentication headers
- Modify request based on device type
- Dynamic origin selection
- Request signing

Origin Response:
- Generate response without origin
- Image optimization
- Add security headers
- Response modification

Viewer Response:
- Add security headers
- Cookie manipulation
- User-specific content
```

**Limitations:**

```
Runtime: Node.js 18.x, Python 3.9
Memory: 128 MB (viewer), 10 GB (origin)
Timeout: 5 seconds (viewer), 30 seconds (origin)
Package size: 1 MB (viewer), 50 MB (origin)
```


### CloudFront Functions

**Lightweight alternative to Lambda@Edge:**

```
CloudFront Functions vs Lambda@Edge:

CloudFront Functions:
- JavaScript only
- Sub-millisecond execution
- Max 10KB code
- Viewer request/response only
- $0.10 per 1M invocations
- Simple transformations

Lambda@Edge:
- Node.js, Python
- Milliseconds execution
- 1-50 MB code
- All four triggers
- More expensive
- Complex logic

Use CloudFront Functions for:
- Header manipulation
- URL redirects/rewrites
- Request validation
- Cache key normalization

Use Lambda@Edge for:
- External API calls
- Complex logic
- Origin request/response
- Large packages
```


### Signed URLs and Signed Cookies

**Restrict Access to Private Content:**

**Signed URLs:**

```
Use for: Individual file access (videos, downloads)

Format:
https://d123456.cloudfront.net/video.mp4?
  Expires=1641024000&
  Signature=abc123&
  Key-Pair-Id=APKAEXAMPLE

Features:
- Expiration time
- IP restriction (optional)
- Start time (optional)
- One URL per resource

Example Use Cases:
- Premium video content
- Paid downloads
- Time-limited access
```

**Signed Cookies:**

```
Use for: Multiple file access (website sections)

Set-Cookie headers:
CloudFront-Policy=base64(policy)
CloudFront-Signature=signature
CloudFront-Key-Pair-Id=APKAEXAMPLE

Features:
- Access multiple files
- No URL changes needed
- Same expiration for all files

Example Use Cases:
- Premium sections of website
- Subscriber-only content
- Course materials
```

**Signing Process:**

```python
import boto3
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key
import datetime

def rsa_signer(message):
    """RSA signing for CloudFront"""
    with open('private_key.pem', 'rb') as key_file:
        private_key = load_pem_private_key(
            key_file.read(),
            password=None,
            backend=default_backend()
        )
    
    return private_key.sign(message, padding.PKCS1v15(), hashes.SHA1())

def create_signed_url(url, key_pair_id, expire_minutes=60):
    """
    Create CloudFront signed URL
    """
    
    cloudfront_signer = CloudFrontSigner(key_pair_id, rsa_signer)
    
    # Set expiration
    expire_date = datetime.datetime.utcnow() + datetime.timedelta(minutes=expire_minutes)
    
    # Generate signed URL
    signed_url = cloudfront_signer.generate_presigned_url(
        url,
        date_less_than=expire_date
    )
    
    return signed_url

# Usage
signed_url = create_signed_url(
    'https://d123456.cloudfront.net/premium-video.mp4',
    'APKAEXAMPLE123',
    expire_minutes=120
)
```


### Security Headers

**Recommended Security Headers:**

```
X-Content-Type-Options: nosniff
  - Prevents MIME type sniffing

X-Frame-Options: DENY
  - Prevents clickjacking

X-XSS-Protection: 1; mode=block
  - Enables XSS filter in browsers

Strict-Transport-Security: max-age=31536000; includeSubDomains
  - Forces HTTPS

Content-Security-Policy: default-src 'self'
  - Controls resource loading

Referrer-Policy: strict-origin-when-cross-origin
  - Controls referrer information

Permissions-Policy: geolocation=(), microphone=(), camera=()
  - Controls browser features
```

**Adding Headers with Lambda@Edge:**

```javascript
// security-headers.js
exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;
    
    // Add security headers
    headers['strict-transport-security'] = [{
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
    }];
    
    headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    }];
    
    headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
    }];
    
    headers['x-xss-protection'] = [{
        key: 'X-XSS-Protection',
        value: '1; mode=block'
    }];
    
    headers['referrer-policy'] = [{
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    }];
    
    return response;
};
```


## Hands-On Implementation

### Lab 1: Creating CloudFront Distribution for Static Website

**Objective:** Deploy global CDN for S3-hosted static website.

```bash
# Create S3 bucket
aws s3 mb s3://my-static-website-bucket

# Upload website files
aws s3 sync ./website/ s3://my-static-website-bucket/

# Create CloudFront Origin Access Identity
OAI_ID=$(aws cloudfront create-cloud-front-origin-access-identity \
    --cloud-front-origin-access-identity-config \
        CallerReference=$(date +%s),Comment="OAI for my-static-website" \
    --query 'CloudFrontOriginAccessIdentity.Id' \
    --output text)

# Update S3 bucket policy
cat > bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "CloudFrontAccess",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity $OAI_ID"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-static-website-bucket/*"
  }]
}
EOF

aws s3api put-bucket-policy \
    --bucket my-static-website-bucket \
    --policy file://bucket-policy.json

# Block public access (CloudFront only access)
aws s3api put-public-access-block \
    --bucket my-static-website-bucket \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
        IgnorePublicAcls=true,\
        BlockPublicPolicy=false,\
        RestrictPublicBuckets=false

# Create distribution
cat > distribution-config.json <<EOF
{
  "CallerReference": "$(date +%s)",
  "Comment": "Static website distribution",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "S3-my-static-website",
      "DomainName": "my-static-website-bucket.s3.amazonaws.com",
      "S3OriginConfig": {
        "OriginAccessIdentity": "origin-access-identity/cloudfront/$OAI_ID"
      }
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-my-static-website",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "Compress": true,
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {"Forward": "none"}
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      {
        "ErrorCode": 403,
        "ResponsePagePath": "/error.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 300
      },
      {
        "ErrorCode": 404,
        "ResponsePagePath": "/error.html",
        "ResponseCode": "404",
        "ErrorCachingMinTTL": 300
      }
    ]
  },
  "PriceClass": "PriceClass_100"
}
EOF

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
    --distribution-config file://distribution-config.json \
    --query 'Distribution.Id' \
    --output text)

# Get distribution domain name
DOMAIN_NAME=$(aws cloudfront get-distribution \
    --id $DISTRIBUTION_ID \
    --query 'Distribution.DomainName' \
    --output text)

echo "CloudFront URL: https://$DOMAIN_NAME"
echo "Distribution ID: $DISTRIBUTION_ID"

# Wait for deployment (takes 15-20 minutes)
aws cloudfront wait distribution-deployed --id $DISTRIBUTION_ID
```


### Lab 2: Custom SSL Certificate with ACM

**Objective:** Configure custom domain with HTTPS.

```bash
# Request certificate in us-east-1 (required for CloudFront)
CERTIFICATE_ARN=$(aws acm request-certificate \
    --domain-name example.com \
    --subject-alternative-names www.example.com \
    --validation-method DNS \
    --region us-east-1 \
    --query 'CertificateArn' \
    --output text)

# Get DNS validation records
aws acm describe-certificate \
    --certificate-arn $CERTIFICATE_ARN \
    --region us-east-1 \
    --query 'Certificate.DomainValidationOptions'

# Add DNS validation records to Route 53 (or your DNS provider)
# Format: CNAME _abc123.example.com → _xyz456.acm-validations.aws.

# Wait for validation
aws acm wait certificate-validated \
    --certificate-arn $CERTIFICATE_ARN \
    --region us-east-1

# Update distribution with custom domain
aws cloudfront update-distribution \
    --id $DISTRIBUTION_ID \
    --distribution-config '{
      ...existing config...,
      "Aliases": {
        "Quantity": 2,
        "Items": ["example.com", "www.example.com"]
      },
      "ViewerCertificate": {
        "ACMCertificateArn": "'$CERTIFICATE_ARN'",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
      }
    }'

# Create Route 53 records
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
      "Changes": [{
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z2FDTNDATAQYW2",
            "DNSName": "'$DOMAIN_NAME'",
            "EvaluateTargetHealth": false
          }
        }
      }]
    }'
```

### Lab 3: Lambda@Edge for Dynamic Content

**Objective:** Implement A/B testing and security headers with Lambda@Edge.

```javascript
// a-b-testing-viewer-request.js
'use strict';

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // Check if user already has A/B test cookie
    const cookies = headers.cookie || [];
    let experimentGroup = null;
    
    for (let cookie of cookies) {
        const cookieValue = cookie.value;
        const match = cookieValue.match(/experiment=([AB])/);
        if (match) {
            experimentGroup = match[1];
            break;
        }
    }
    
    // Assign group if not set
    if (!experimentGroup) {
        // 50/50 split
        experimentGroup = Math.random() < 0.5 ? 'A' : 'B';
    }
    
    // Route to different origins based on group
    if (experimentGroup === 'B') {
        // Modify request to use variant B
        request.origin = {
            custom: {
                domainName: 'variant-b.example.com',
                port: 443,
                protocol: 'https',
                path: '',
                sslProtocols: ['TLSv1.2'],
                readTimeout: 30,
                keepaliveTimeout: 5,
                customHeaders: {}
            }
        };
    }
    
    // Add header to identify group (for analytics)
    headers['x-experiment-group'] = [{ value: experimentGroup }];
    
    return request;
};
```

```javascript
// security-headers-viewer-response.js
'use strict';

exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;
    
    // Add security headers
    headers['strict-transport-security'] = [{
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload'
    }];
    
    headers['content-security-policy'] = [{
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    }];
    
    headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
    }];
    
    headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
    }];
    
    headers['x-xss-protection'] = [{
        key: 'X-XSS-Protection',
        value: '1; mode=block'
    }];
    
    headers['referrer-policy'] = [{
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
    }];
    
    // Add experiment cookie if not present
    const request = event.Records[0].cf.request;
    const requestHeaders = request.headers;
    const experimentGroup = requestHeaders['x-experiment-group'] 
        ? requestHeaders['x-experiment-group'][0].value 
        : 'A';
    
    headers['set-cookie'] = [{
        key: 'Set-Cookie',
        value: `experiment=${experimentGroup}; Path=/; Secure; HttpOnly; Max-Age=86400`
    }];
    
    return response;
};
```

**Deploy Lambda@Edge:**

```bash
# Package Lambda function
zip function.zip viewer-request.js

# Create IAM role for Lambda@Edge
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com"
      ]
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

ROLE_ARN=$(aws iam create-role \
    --role-name LambdaEdgeExecutionRole \
    --assume-role-policy-document file://trust-policy.json \
    --query 'Role.Arn' \
    --output text)

# Attach basic execution policy
aws iam attach-role-policy \
    --role-name LambdaEdgeExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create Lambda function (must be in us-east-1)
FUNCTION_ARN=$(aws lambda create-function \
    --region us-east-1 \
    --function-name ABTestingViewerRequest \
    --runtime nodejs18.x \
    --role $ROLE_ARN \
    --handler viewer-request.handler \
    --zip-file fileb://function.zip \
    --timeout 5 \
    --memory-size 128 \
    --query 'FunctionArn' \
    --output text)

# Publish version (Lambda@Edge requires versioned functions)
VERSION_ARN=$(aws lambda publish-version \
    --region us-east-1 \
    --function-name ABTestingViewerRequest \
    --query 'FunctionArn' \
    --output text)

# Associate with CloudFront distribution
aws cloudfront update-distribution \
    --id $DISTRIBUTION_ID \
    --distribution-config '{
      ...
      "DefaultCacheBehavior": {
        ...
        "LambdaFunctionAssociations": {
          "Quantity": 1,
          "Items": [{
            "LambdaFunctionARN": "'$VERSION_ARN'",
            "EventType": "viewer-request",
            "IncludeBody": false
          }]
        }
      }
    }'
```


### Lab 4: Signed URLs for Premium Content

**Objective:** Restrict access to premium content with signed URLs.

```python
# generate_signed_url.py
import boto3
from botocore.signers import CloudFrontSigner
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
import datetime
import base64

class CloudFrontSignedURLGenerator:
    """
    Generate CloudFront signed URLs
    """
    
    def __init__(self, key_pair_id, private_key_path):
        """
        Args:
            key_pair_id: CloudFront key pair ID
            private_key_path: Path to private key PEM file
        """
        self.key_pair_id = key_pair_id
        
        # Load private key
        with open(private_key_path, 'rb') as key_file:
            self.private_key = serialization.load_pem_private_key(
                key_file.read(),
                password=None,
                backend=default_backend()
            )
    
    def rsa_signer(self, message):
        """Sign message with RSA private key"""
        return self.private_key.sign(
            message,
            padding.PKCS1v15(),
            hashes.SHA1()
        )
    
    def generate_signed_url(self, url, expire_minutes=60, 
                           ip_address=None, date_less_than=None):
        """
        Generate signed URL
        
        Args:
            url: CloudFront URL to sign
            expire_minutes: Minutes until expiration
            ip_address: Optional IP restriction
            date_less_than: Optional custom expiration time
        """
        
        if not date_less_than:
            date_less_than = datetime.datetime.utcnow() + datetime.timedelta(
                minutes=expire_minutes
            )
        
        # Create CloudFront signer
        signer = CloudFrontSigner(self.key_pair_id, self.rsa_signer)
        
        # Generate signed URL
        if ip_address:
            # Custom policy with IP restriction
            policy = {
                "Statement": [{
                    "Resource": url,
                    "Condition": {
                        "DateLessThan": {
                            "AWS:EpochTime": int(date_less_than.timestamp())
                        },
                        "IpAddress": {
                            "AWS:SourceIp": ip_address
                        }
                    }
                }]
            }
            
            signed_url = signer.generate_presigned_url(
                url,
                policy=json.dumps(policy)
            )
        else:
            # Simple canned policy
            signed_url = signer.generate_presigned_url(
                url,
                date_less_than=date_less_than
            )
        
        return signed_url
    
    def generate_signed_cookies(self, resource_path, expire_minutes=60):
        """
        Generate signed cookies for multiple file access
        
        Args:
            resource_path: Path pattern (e.g., /premium/*)
            expire_minutes: Minutes until expiration
        """
        
        expire_time = datetime.datetime.utcnow() + datetime.timedelta(
            minutes=expire_minutes
        )
        
        # Create policy
        policy = {
            "Statement": [{
                "Resource": f"https://d123456.cloudfront.net{resource_path}",
                "Condition": {
                    "DateLessThan": {
                        "AWS:EpochTime": int(expire_time.timestamp())
                    }
                }
            }]
        }
        
        policy_str = json.dumps(policy).replace(' ', '')
        policy_b64 = base64.b64encode(policy_str.encode()).decode()
        
        # Sign policy
        signature = self.rsa_signer(policy_str.encode())
        signature_b64 = base64.b64encode(signature).decode()
        
        # Return cookies
        cookies = {
            'CloudFront-Policy': policy_b64,
            'CloudFront-Signature': signature_b64,
            'CloudFront-Key-Pair-Id': self.key_pair_id
        }
        
        return cookies

# Flask example
from flask import Flask, request, make_response, redirect

app = Flask(__name__)
url_generator = CloudFrontSignedURLGenerator(
    key_pair_id='APKAEXAMPLE123',
    private_key_path='cloudfront-private-key.pem'
)

@app.route('/premium/download/<filename>')
def premium_download(filename):
    """
    Generate signed URL for premium download
    """
    
    # Verify user has access (check subscription, etc.)
    user_id = request.headers.get('X-User-ID')
    if not has_premium_access(user_id):
        return {'error': 'Premium access required'}, 403
    
    # Generate signed URL
    cloudfront_url = f'https://d123456.cloudfront.net/premium/{filename}'
    
    signed_url = url_generator.generate_signed_url(
        cloudfront_url,
        expire_minutes=15,  # 15 minute download window
        ip_address=request.remote_addr  # Restrict to user's IP
    )
    
    # Redirect to signed URL
    return redirect(signed_url)

@app.route('/premium/courses/<course_id>')
def premium_course(course_id):
    """
    Set signed cookies for course access
    """
    
    user_id = request.headers.get('X-User-ID')
    if not has_course_access(user_id, course_id):
        return {'error': 'Course access required'}, 403
    
    # Generate signed cookies
    cookies = url_generator.generate_signed_cookies(
        f'/courses/{course_id}/*',
        expire_minutes=240  # 4 hour access
    )
    
    # Set cookies and redirect
    response = make_response(redirect(f'/courses/{course_id}/content'))
    
    for cookie_name, cookie_value in cookies.items():
        response.set_cookie(
            cookie_name,
            cookie_value,
            max_age=240*60,
            secure=True,
            httponly=True,
            samesite='Strict'
        )
    
    return response
```


## Production-Level Knowledge

### Cache Hit Ratio Optimization

**Analyzing Cache Performance:**

```python
# cache_analyzer.py
import boto3
from datetime import datetime, timedelta

class CloudFrontCacheAnalyzer:
    """
    Analyze CloudFront cache performance
    """
    
    def __init__(self, distribution_id):
        self.cloudwatch = boto3.client('cloudwatch')
        self.distribution_id = distribution_id
    
    def get_cache_hit_rate(self, days=7):
        """
        Calculate cache hit rate
        """
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        # Get requests metrics
        requests = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/CloudFront',
            MetricName='Requests',
            Dimensions=[
                {'Name': 'DistributionId', 'Value': self.distribution_id}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,  # Daily
            Statistics=['Sum']
        )
        
        # Get bytes downloaded (cached content)
        bytes_downloaded = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/CloudFront',
            MetricName='BytesDownloaded',
            Dimensions=[
                {'Name': 'DistributionId', 'Value': self.distribution_id}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,
            Statistics=['Sum']
        )
        
        # Get origin requests (cache misses)
        origin_requests = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/CloudFront',
            MetricName='OriginRequests',
            Dimensions=[
                {'Name': 'DistributionId', 'Value': self.distribution_id}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,
            Statistics=['Sum']
        )
        
        # Calculate hit rate
        total_requests = sum(d['Sum'] for d in requests['Datapoints'])
        total_origin = sum(d['Sum'] for d in origin_requests['Datapoints'])
        
        if total_requests > 0:
            cache_hit_rate = ((total_requests - total_origin) / total_requests) * 100
        else:
            cache_hit_rate = 0
        
        return {
            'cache_hit_rate': round(cache_hit_rate, 2),
            'total_requests': int(total_requests),
            'cache_hits': int(total_requests - total_origin),
            'cache_misses': int(total_origin),
            'period_days': days
        }
    
    def get_popular_objects(self, days=7):
        """
        Get most requested objects from CloudFront logs
        Requires CloudFront logging enabled
        """
        
        # Parse CloudFront logs from S3
        s3 = boto3.client('s3')
        
        # Get log bucket and prefix from distribution
        cloudfront = boto3.client('cloudfront')
        distribution = cloudfront.get_distribution(Id=self.distribution_id)
        
        logging_config = distribution['Distribution']['DistributionConfig'].get('Logging')
        
        if not logging_config or not logging_config['Enabled']:
            return {'error': 'CloudFront logging not enabled'}
        
        log_bucket = logging_config['Bucket'].replace('.s3.amazonaws.com', '')
        log_prefix = logging_config['Prefix']
        
        # Parse logs and aggregate requests by object
        # (Simplified - production would use Athena)
        
        return {
            'message': 'Use Athena to query logs',
            'query': '''
                SELECT uri_stem, COUNT(*) as requests
                FROM cloudfront_logs
                WHERE date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
                GROUP BY uri_stem
                ORDER BY requests DESC
                LIMIT 100
            '''
        }
    
    def identify_cache_issues(self):
        """
        Identify common cache configuration issues
        """
        
        cloudfront = boto3.client('cloudfront')
        distribution = cloudfront.get_distribution(Id=self.distribution_id)
        
        config = distribution['Distribution']['DistributionConfig']
        issues = []
        
        # Check default cache behavior
        default_behavior = config['DefaultCacheBehavior']
        
        # Issue 1: Forwarding all headers
        forwarded_headers = default_behavior.get('ForwardedValues', {}).get('Headers', {})
        if forwarded_headers.get('Quantity', 0) > 5:
            issues.append({
                'severity': 'HIGH',
                'issue': f'Forwarding {forwarded_headers["Quantity"]} headers',
                'impact': 'Reduces cache hit rate - each header combination creates separate cache',
                'recommendation': 'Only forward necessary headers'
            })
        
        # Issue 2: Forwarding all query strings without whitelist
        query_strings = default_behavior.get('ForwardedValues', {}).get('QueryString')
        if query_strings and not default_behavior.get('ForwardedValues', {}).get('QueryStringCacheKeys'):
            issues.append({
                'severity': 'MEDIUM',
                'issue': 'Forwarding all query strings',
                'impact': 'Each query string combination creates separate cache entry',
                'recommendation': 'Use query string whitelist for relevant parameters only'
            })
        
        # Issue 3: Short TTL
        min_ttl = default_behavior.get('MinTTL', 0)
        default_ttl = default_behavior.get('DefaultTTL', 86400)
        
        if default_ttl < 3600:
            issues.append({
                'severity': 'MEDIUM',
                'issue': f'Short default TTL: {default_ttl} seconds',
                'impact': 'Frequent cache expirations, more origin requests',
                'recommendation': 'Increase TTL for static content to 24 hours or more'
            })
        
        # Issue 4: No compression
        if not default_behavior.get('Compress'):
            issues.append({
                'severity': 'LOW',
                'issue': 'Compression disabled',
                'impact': 'Larger file sizes, slower downloads, higher costs',
                'recommendation': 'Enable automatic compression'
            })
        
        return issues

# Usage
analyzer = CloudFrontCacheAnalyzer('E1234567890ABC')

# Get cache hit rate
metrics = analyzer.get_cache_hit_rate(days=7)
print(f"Cache hit rate: {metrics['cache_hit_rate']}%")
print(f"Total requests: {metrics['total_requests']:,}")
print(f"Cache hits: {metrics['cache_hits']:,}")
print(f"Cache misses: {metrics['cache_misses']:,}")

# Target: > 85% cache hit rate
if metrics['cache_hit_rate'] < 85:
    print("\n⚠️  Cache hit rate below target (85%)")
    
    # Identify issues
    issues = analyzer.identify_cache_issues()
    
    if issues:
        print("\nPotential issues:")
        for issue in issues:
            print(f"\n[{issue['severity']}] {issue['issue']}")
            print(f"  Impact: {issue['impact']}")
            print(f"  Fix: {issue['recommendation']}")
```


### Origin Shield

**Additional Caching Layer:**

```
Benefits of Origin Shield:
- Centralized cache layer before origin
- Reduces origin load by up to 60%
- Increases cache hit ratio
- Better cache consolidation

Architecture:
Edge Location → Regional Edge Cache → Origin Shield → Origin

Without Origin Shield:
Multiple edge locations → Origin (more requests)

With Origin Shield:
Multiple edge locations → Origin Shield → Origin (fewer requests)

Cost: $0.0075 per 10,000 requests
Worth it for: High-traffic sites, expensive origins
```

**Enable Origin Shield:**

```bash
# Update distribution with Origin Shield
aws cloudfront update-distribution \
    --id $DISTRIBUTION_ID \
    --distribution-config '{
      "Origins": {
        "Items": [{
          "Id": "my-origin",
          "DomainName": "origin.example.com",
          "CustomOriginConfig": {...},
          "OriginShield": {
            "Enabled": true,
            "OriginShieldRegion": "us-east-1"
          }
        }]
      }
    }'
```


### Advanced Cache Key Configuration

**Cache Policy (New Method):**

```bash
# Create cache policy with precise control
aws cloudfront create-cache-policy --cache-policy-config '{
  "Name": "OptimizedCachePolicy",
  "MinTTL": 1,
  "MaxTTL": 31536000,
  "DefaultTTL": 86400,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": {
        "Quantity": 2,
        "Items": ["id", "version"]
      }
    },
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": {
        "Quantity": 2,
        "Items": ["Accept-Language", "CloudFront-Viewer-Country"]
      }
    },
    "CookiesConfig": {
      "CookieBehavior": "none"
    }
  }
}'
```

**Cache Key Best Practices:**

```
Good Cache Key Design:
- Only include variables that affect response
- Use normalized values (lowercase, sorted)
- Avoid session-specific data
- Use whitelist, not blacklist

Bad Examples:
✗ Including all headers (100+ variations)
✗ Including all cookies (user-specific)
✗ Including all query strings (tracking params)
✗ Including timestamps

Good Examples:
✓ Accept-Language only (i18n content)
✓ CloudFront-Viewer-Country (geo-specific)
✓ Product ID query string only
✓ Normalized Accept-Encoding
```


### Cost Optimization

**Price Class Selection:**

```
Price Classes:
- PriceClass_All: All edge locations (highest performance, highest cost)
- PriceClass_200: Most locations excluding expensive regions
- PriceClass_100: Only North America and Europe (lowest cost)

Cost Comparison (per GB):
PriceClass_100: $0.085
PriceClass_200: $0.085-0.12
PriceClass_All: $0.085-0.17

Recommendation:
- Global audience: PriceClass_All
- US/Europe focus: PriceClass_100 (40% savings)
- Most use cases: PriceClass_200 (balance)
```

**Minimize Origin Fetches:**

```python
# Cost breakdown
costs = {
    'cloudfront_request': 0.0075,  # Per 10,000 requests
    'cloudfront_data_transfer': 0.085,  # Per GB (first 10 TB)
    'origin_data_transfer': 0.09,  # Per GB (to internet)
    'origin_requests': 'depends'  # ALB, EC2, etc.
}

# Optimization strategies
optimizations = [
    {
        'strategy': 'Increase cache TTL',
        'impact': 'Reduce origin requests by 50-70%',
        'savings': 'Significant (origin compute + transfer)'
    },
    {
        'strategy': 'Use Origin Shield',
        'impact': 'Reduce origin requests by 40-60%',
        'cost': '$0.0075 per 10,000 requests',
        'net_savings': 'Positive for high-traffic'
    },
    {
        'strategy': 'Compress responses',
        'impact': 'Reduce transfer by 70-90%',
        'savings': 'Major for text content'
    },
    {
        'strategy': 'Optimize cache key',
        'impact': 'Increase hit rate 10-30%',
        'savings': 'More cache hits = fewer origin requests'
    }
]
```


## Tips \& Best Practices

### Distribution Configuration Tips

**Tip 1: Always Use HTTPS**

```bash
# Redirect HTTP to HTTPS
"ViewerProtocolPolicy": "redirect-to-https"

# Or enforce HTTPS only
"ViewerProtocolPolicy": "https-only"

Benefits:
- Security (encryption in transit)
- SEO (Google ranking factor)
- HTTP/2 support (faster)
- Required for modern browser features
```

**Tip 2: Enable Compression**

```bash
# Enable automatic compression
"Compress": true

Compresses:
- Text files (HTML, CSS, JS, JSON, XML)
- Fonts (WOFF, TTF, OTF)
- SVG images

Savings: 70-90% for text files
No additional cost
```

**Tip 3: Use Origin Custom Headers for Verification**

```bash
# Add custom header to identify CloudFront requests
"CustomHeaders": {
  "Quantity": 1,
  "Items": [{
    "HeaderName": "X-Origin-Verify",
    "HeaderValue": "secret-token-here"
  }]
}

# Origin (ALB/EC2) verifies header
# Reject requests without header (bypass protection)
```


### Cache Behavior Tips

**Tip 4: Separate Behaviors for Different Content Types**

```bash
# Optimal cache behaviors
Behaviors:
1. /static/* (images, CSS, JS)
   - TTL: 1 year
   - Cache all query strings: false
   - Forward headers: minimal

2. /api/* (API requests)
   - TTL: 0 (no cache) or very short
   - Forward all headers
   - Forward query strings

3. /*.html (HTML pages)
   - TTL: 5-60 minutes
   - Cache based on Accept-Language
   - Invalidate on deploy

4. Default (*)
   - TTL: 24 hours
   - Balanced settings
```

**Tip 5: Use Query String Whitelist**

```bash
# Only cache based on relevant query strings

# BAD: Cache all query strings
"QueryString": true

# Creates separate cache for:
# /product?id=123&utm_source=email&timestamp=xyz
# /product?id=123&utm_source=twitter&timestamp=abc
# Low hit rate due to tracking parameters

# GOOD: Whitelist relevant parameters only
"QueryStringCacheKeys": {
  "Quantity": 2,
  "Items": ["id", "variant"]
}

# Now caches:
# /product?id=123&variant=blue
# Ignores utm_* and timestamp
# Higher hit rate
```


### Security Tips

**Tip 6: Use Origin Access Identity (OAI) for S3**

```bash
# Prevent direct S3 access
# Force all access through CloudFront

1. Create OAI
2. Update S3 bucket policy (allow OAI only)
3. Block public S3 access
4. Configure CloudFront to use OAI

Result: S3 bucket not directly accessible
All requests must go through CloudFront
```

**Tip 7: Enable AWS WAF**

```bash
# Add Web Application Firewall
aws wafv2 associate-web-acl \
    --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/... \
    --resource-arn arn:aws:cloudfront::123456789012:distribution/$DISTRIBUTION_ID

Protection from:
- SQL injection
- XSS attacks
- Rate limiting
- Geographic restrictions
- Bot traffic
```

**Tip 8: Implement Geo-Restrictions**

```bash
# Block or allow specific countries
"Restrictions": {
  "GeoRestriction": {
    "RestrictionType": "blacklist",  # or "whitelist"
    "Quantity": 2,
    "Items": ["CN", "RU"]  # ISO country codes
  }
}

Use cases:
- Compliance requirements
- Licensing restrictions
- Reduce abuse from specific regions
```


### Monitoring Tips

**Tip 9: Enable CloudFront Logging**

```bash
# Enable access logs
"Logging": {
  "Enabled": true,
  "IncludeCookies": false,
  "Bucket": "my-cloudfront-logs.s3.amazonaws.com",
  "Prefix": "cloudfront/"
}

Logs contain:
- Timestamp, viewer IP
- Request URI, query string
- HTTP status, bytes sent
- User agent, referer
- Edge location, cache status

Analyze with Amazon Athena:
- Popular content
- Cache hit rates
- Error rates
- Geographic distribution
```

**Tip 10: Set Up CloudWatch Alarms**

```python
# Monitor key metrics
cloudwatch = boto3.client('cloudwatch')

alarms = [
    {
        'AlarmName': 'CloudFront-HighErrorRate',
        'MetricName': '5xxErrorRate',
        'Threshold': 5,  # 5% error rate
        'ComparisonOperator': 'GreaterThanThreshold'
    },
    {
        'AlarmName': 'CloudFront-HighOriginLatency',
        'MetricName': 'OriginLatency',
        'Threshold': 1000,  # 1 second
        'ComparisonOperator': 'GreaterThanThreshold'
    },
    {
        'AlarmName': 'CloudFront-LowCacheHitRate',
        'MetricName': 'CacheHitRate',
        'Threshold': 85,  # 85%
        'ComparisonOperator': 'LessThanThreshold'
    }
]

for alarm in alarms:
    cloudwatch.put_metric_alarm(
        AlarmName=alarm['AlarmName'],
        Namespace='AWS/CloudFront',
        MetricName=alarm['MetricName'],
        Dimensions=[
            {'Name': 'DistributionId', 'Value': distribution_id}
        ],
        Period=300,
        EvaluationPeriods=2,
        Threshold=alarm['Threshold'],
        ComparisonOperator=alarm['ComparisonOperator'],
        Statistic='Average'
    )
```


## Pitfalls \& Remedies

### Pitfall 1: Low Cache Hit Rate

**Problem:** Most requests miss cache and fetch from origin, negating CDN benefits.

**Why It Happens:**

- Including too many variables in cache key
- Forwarding all headers/cookies/query strings
- Not setting appropriate TTL
- Unique query strings (timestamps, tracking codes)

**Impact:**

- Slow performance (origin latency)
- High origin load and costs
- Wasted CloudFront spend
- Poor user experience

**Example:**

```
Bad Configuration:
- Forward all headers (50+ headers)
- Forward all query strings
- Forward all cookies
- TTL: 60 seconds

Result:
- Each unique combination creates separate cache
- /page?id=123&utm_source=email&time=1234567890
- /page?id=123&utm_source=twitter&time=1234567891
- Two separate cache entries for same content
- Cache hit rate: 15%
```

**Remedy:**

**Step 1: Analyze Current Cache Performance**

```python
# Check cache hit rate
analyzer = CloudFrontCacheAnalyzer(distribution_id)
metrics = analyzer.get_cache_hit_rate(days=7)

print(f"Cache hit rate: {metrics['cache_hit_rate']}%")

if metrics['cache_hit_rate'] < 85:
    print("⚠️  Low cache hit rate detected")
    
    # Identify configuration issues
    issues = analyzer.identify_cache_issues()
    
    for issue in issues:
        print(f"\n{issue['issue']}")
        print(f"  Fix: {issue['recommendation']}")
```

**Step 2: Optimize Cache Key**

```bash
# Use cache policy with whitelist approach

aws cloudfront create-cache-policy --cache-policy-config '{
  "Name": "OptimizedCachePolicy",
  "DefaultTTL": 86400,
  "ParametersInCacheKeyAndForwardedToOrigin": {
    "EnableAcceptEncodingGzip": true,
    "EnableAcceptEncodingBrotli": true,
    
    # Only include relevant query strings
    "QueryStringsConfig": {
      "QueryStringBehavior": "whitelist",
      "QueryStrings": {
        "Quantity": 1,
        "Items": ["id"]  # Only "id" parameter affects response
      }
    },
    
    # Only include necessary headers
    "HeadersConfig": {
      "HeaderBehavior": "whitelist",
      "Headers": {
        "Quantity": 1,
        "Items": ["Accept-Language"]  # For i18n content
      }
    },
    
    # Don't include cookies in cache key
    "CookiesConfig": {
      "CookieBehavior": "none"
    }
  }
}'
```

**Step 3: Normalize Cache Keys**

```javascript
// Use CloudFront Function to normalize cache keys
function handler(event) {
    var request = event.request;
    var querystring = request.querystring;
    
    // Remove tracking parameters
    delete querystring.utm_source;
    delete querystring.utm_medium;
    delete querystring.utm_campaign;
    delete querystring.timestamp;
    delete querystring.fbclid;
    delete querystring.gclid;
    
    // Sort query strings for consistency
    var sortedQs = {};
    Object.keys(querystring).sort().forEach(function(key) {
        sortedQs[key] = querystring[key];
    });
    
    request.querystring = sortedQs;
    
    return request;
}
```

**Step 4: Increase TTL**

```bash
# Set appropriate TTL based on content type

Static Assets (versioned):
- CSS, JS, images with version/hash in filename
- TTL: 1 year (31536000 seconds)
- Cache-Control: public, max-age=31536000, immutable

Semi-Static Content:
- Product pages, blog posts
- TTL: 1 hour to 1 day
- Cache-Control: public, max-age=3600

Dynamic Content:
- User-specific pages
- TTL: 0 (no cache)
- Cache-Control: private, no-cache
```

**Prevention:**

- Only include necessary parameters in cache key
- Use query string whitelist, not all
- Set appropriate TTL for content type
- Remove tracking parameters
- Monitor cache hit rate regularly
- Target: > 85% cache hit rate

***

### Pitfall 2: Serving Stale Content After Updates

**Problem:** CloudFront serves old cached content after origin updates.

**Why It Happens:**

- Long TTL without invalidation strategy
- Not using versioned assets
- No cache invalidation on deploy
- Misunderstanding TTL behavior

**Impact:**

- Users see outdated content
- Bug fixes not reflected
- Broken functionality
- Customer complaints

**Remedy:**

**Step 1: Use Asset Versioning**

```bash
# Version static assets in filename

BAD (no versioning):
/css/styles.css  # Same filename, CloudFront caches old version

GOOD (versioning):
/css/styles.v1.2.3.css  # New version = new filename = new cache entry

Or use content hashing:
/css/styles.a3b5c7d9.css  # Hash changes when content changes

Webpack example:
output: {
  filename: '[name].[contenthash].js'
}

Result: New deploy = new filenames = cache automatically updated
```

**Step 2: Implement Cache Invalidation**

```python
# Automate invalidation on deploy
import boto3

def invalidate_cloudfront(distribution_id, paths):
    """
    Invalidate CloudFront cache
    """
    
    cloudfront = boto3.client('cloudfront')
    
    response = cloudfront.create_invalidation(
        DistributionId=distribution_id,
        InvalidationBatch={
            'Paths': {
                'Quantity': len(paths),
                'Items': paths
            },
            'CallerReference': str(time.time())
        }
    )
    
    invalidation_id = response['Invalidation']['Id']
    
    print(f"Invalidation created: {invalidation_id}")
    
    # Wait for completion (optional)
    waiter = cloudfront.get_waiter('invalidation_completed')
    waiter.wait(
        DistributionId=distribution_id,
        Id=invalidation_id
    )
    
    print("Invalidation completed")
    
    return invalidation_id

# CI/CD integration
def deploy_website():
    """
    Deploy website and invalidate cache
    """
    
    # 1. Upload files to S3
    upload_files_to_s3()
    
    # 2. Invalidate CloudFront
    invalidate_cloudfront(
        distribution_id='E1234567890ABC',
        paths=[
            '/index.html',
            '/about.html',
            '/api/*',  # Wildcard
            '/*'  # All files (costs more)
        ]
    )
    
    print("Deployment complete")

# Note: Invalidation costs
# First 1,000 paths free per month
# $0.005 per path after
# Use versioned assets to avoid invalidation costs
```

**Step 3: Use Cache-Control Headers**

```python
# Set Cache-Control at origin
from flask import Flask, make_response

app = Flask(__name__)

@app.route('/api/products')
def get_products():
    """API endpoint - don't cache"""
    
    response = make_response(get_products_from_db())
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/static/<path:filename>')
def static_files(filename):
    """Static assets - cache for 1 year"""
    
    response = make_response(send_file(filename))
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response

@app.route('/')
def index():
    """HTML pages - cache for 5 minutes"""
    
    response = make_response(render_template('index.html'))
    response.headers['Cache-Control'] = 'public, max-age=300'
    return response
```

**Step 4: Implement Soft Invalidation**

```javascript
// Use query string versioning (soft invalidation)

// In HTML:
<link rel="stylesheet" href="/css/styles.css?v=1.2.3">
<script src="/js/app.js?v=1.2.3"></script>

// On deploy, increment version:
<link rel="stylesheet" href="/css/styles.css?v=1.2.4">

// CloudFront sees new URL, fetches from origin
// No invalidation needed
// Old version still cached (harmless)

// Build process:
const version = process.env.BUILD_NUMBER || Date.now();
html = html.replace(/\?v=[\d.]+/g, `?v=${version}`);
```

**Prevention:**

- Use versioned filenames for static assets
- Set appropriate Cache-Control headers
- Automate invalidation in CI/CD
- Use soft invalidation (query strings) for HTML
- Test cache behavior before production

***

### Pitfall 3: Origin Exposure to DDoS

**Problem:** Origin servers directly accessible, bypassing CloudFront protection.

**Why It Happens:**

- Origin security groups allow 0.0.0.0/0
- Public IP/DNS exposed
- No origin verification
- Not using OAI for S3

**Impact:**

- DDoS attacks directly on origin
- CloudFront benefits bypassed
- Origin overwhelmed
- Service outage

**Remedy:**

**Step 1: Restrict Origin Access**

```bash
# For S3: Use Origin Access Identity
1. Create OAI in CloudFront
2. Update S3 bucket policy (allow OAI only)
3. Block all public access to S3
4. Configure CloudFront to use OAI

# For ALB/EC2: Restrict security groups
aws ec2 authorize-security-group-ingress \
    --group-id sg-origin \
    --protocol tcp \
    --port 443 \
    --source-group sg-cloudfront-prefix-list

# Or use managed prefix list
aws ec2 authorize-security-group-ingress \
    --group-id sg-origin \
    --ip-permissions \
        IpProtocol=tcp,FromPort=443,ToPort=443,\
        PrefixListIds=[{PrefixListId=pl-cloudfront}]

# Result: Only CloudFront can reach origin
```

**Step 2: Verify Requests from CloudFront**

```python
# Add custom header verification at origin
from flask import Flask, request

app = Flask(__name__)

CLOUDFRONT_SECRET = "secret-token-from-env"

@app.before_request
def verify_cloudfront():
    """
    Verify request came from CloudFront
    """
    
    # Check custom header
    if request.headers.get('X-Origin-Verify') != CLOUDFRONT_SECRET:
        # Request didn't come from CloudFront
        return {'error': 'Forbidden'}, 403
    
    # Request verified, continue

@app.route('/api/data')
def get_data():
    # This will only execute for CloudFront requests
    return {'data': 'example'}
```

**Step 3: Use AWS WAF with CloudFront**

```bash
# Create WAF web ACL
aws wafv2 create-web-acl \
    --name CloudFrontWAF \
    --scope CLOUDFRONT \
    --default-action Allow={} \
    --rules '[
      {
        "Name": "RateLimitRule",
        "Priority": 1,
        "Statement": {
          "RateBasedStatement": {
            "Limit": 2000,
            "AggregateKeyType": "IP"
          }
        },
        "Action": {"Block": {}}
      },
      {
        "Name": "GeoBlockRule",
        "Priority": 2,
        "Statement": {
          "GeoMatchStatement": {
            "CountryCodes": ["CN", "RU"]
          }
        },
        "Action": {"Block": {}}
      }
    ]'

# Associate with CloudFront
aws wafv2 associate-web-acl \
    --web-acl-arn arn:aws:wafv2:us-east-1:123456789012:global/webacl/... \
    --resource-arn arn:aws:cloudfront::123456789012:distribution/$DISTRIBUTION_ID
```

**Prevention:**

- Never expose origin directly
- Use OAI for S3 origins
- Restrict security groups to CloudFront IPs
- Add custom header verification
- Enable AWS WAF
- Monitor origin access logs

***

## Chapter Summary

Amazon CloudFront provides global content delivery with 450+ edge locations, delivering microsecond latency to users worldwide. Understanding distributions, origins, cache behaviors, Lambda@Edge, signed URLs, and security best practices is essential for production deployments. Proper cache key configuration maximizes hit rates, appropriate TTL settings balance freshness and performance, and origin protection prevents DDoS attacks. CloudFront transforms slow centralized applications into fast global systems.

**Key Takeaways:**

- **Always redirect HTTP to HTTPS:** Security, SEO, and performance benefits
- **Optimize cache keys:** Only include necessary parameters, use whitelists, target >85% hit rate
- **Use versioned assets:** Avoid invalidation costs, automatic cache updates on deploy
- **Protect origins:** Use OAI for S3, restrict security groups, verify requests with custom headers
- **Enable compression:** 70-90% size reduction for text files at no cost
- **Lambda@Edge for customization:** A/B testing, security headers, dynamic routing
- **Monitor cache hit rate:** Use CloudWatch metrics, analyze logs with Athena

Understanding CloudFront deeply enables you to deliver exceptional global performance, reduce origin load, and build secure, scalable content delivery systems.

## Review Questions

1. **CloudFront default TTL?**
a) 1 hour
b) 24 hours
c) 7 days
d) 30 days

**Answer: B** - Default TTL is 24 hours (86,400 seconds).

2. **Maximum CloudFront custom headers?**
a) 5
b) 10
c) 20
d) Unlimited

**Answer: B** - Maximum 10 custom headers per origin.

3. **Lambda@Edge viewer request timeout?**
a) 1 second
b) 5 seconds
c) 30 seconds
d) 60 seconds

**Answer: B** - Viewer request/response timeout is 5 seconds.

4. **CloudFront free invalidation paths per month?**
a) 100
b) 1,000
c) 10,000
d) Unlimited

**Answer: B** - First 1,000 paths free per month, \$0.005 per path after.

5. **Which header CloudFront automatically adds?**
a) X-Forwarded-For
b) CloudFront-Viewer-Country
c) X-Real-IP
d) Both A and B

**Answer: D** - CloudFront adds X-Forwarded-For and CloudFront-Viewer-Country.

6. **Origin Shield benefit?**
a) Faster edge locations
b) Reduces origin requests
c) Free SSL certificates
d) Automatic compression

**Answer: B** - Origin Shield reduces origin requests by up to 60%.

7. **S3 Origin Access Identity purpose?**
a) Faster transfers
b) Restrict S3 to CloudFront only
c) Enable versioning
d) Reduce costs

**Answer: B** - OAI restricts S3 bucket access to CloudFront only.

8. **CloudFront charge for HTTPS requests?**
a) Free (same as HTTP)
b) 2x HTTP cost
c) \$0.01 per 10,000
d) Depends on certificate

**Answer: A** - HTTPS requests cost same as HTTP (no additional charge).

9. **Maximum Lambda@Edge package size (viewer)?**
a) 1 MB
b) 10 MB
c) 50 MB
d) 250 MB

**Answer: A** - Viewer request/response limited to 1 MB.

10. **Best TTL for versioned static assets?**
a) 60 seconds
b) 1 hour
c) 24 hours
d) 1 year

**Answer: D** - Versioned assets can use 1 year TTL (31,536,000 seconds).

11. **CloudFront Functions runtime?**
a) Node.js only
b) Python only
c) JavaScript only
d) Any language

**Answer: C** - CloudFront Functions use JavaScript only.

12. **Signed URL use case?**
a) Faster downloads
b) Restrict access to premium content
c) Enable compression
d) Reduce costs

**Answer: B** - Signed URLs restrict access to authorized users only.

13. **Cache behavior matching order?**
a) Random
b) Alphabetical
c) Most specific first
d) First match wins (top to bottom)

**Answer: D** - First matching behavior wins, order matters.

14. **CloudFront price classes?**
a) 2
b) 3
c) 5
d) 10

**Answer: B** - Three price classes (100, 200, All).

15. **Recommended viewer protocol policy?**
a) HTTP and HTTPS
b) HTTP only
c) Redirect HTTP to HTTPS
d) HTTPS only

**Answer: C** - Redirect HTTP to HTTPS (allows both, enforces security).

***

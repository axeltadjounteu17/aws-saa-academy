# Chapter 19: API Gateway

## Introduction

APIs (Application Programming Interfaces) are the backbone of modern applications, enabling mobile apps, web frontends, and external systems to communicate with backend services. Amazon API Gateway provides fully managed API hosting, transforming the complex task of building production APIs into simple configuration. API Gateway handles authentication, throttling, caching, monitoring, versioning, and documentation while automatically scaling to handle any request volume—from a few requests per day to millions per second. Understanding API Gateway deeply is essential for building secure, scalable, performant APIs without managing infrastructure.

The evolution from monolithic to microservices architectures makes API gateways indispensable. Traditional approaches expose backend services directly, requiring each service to handle authentication, rate limiting, logging, and SSL termination. This duplicates logic, increases attack surface, and complicates changes. API Gateway centralizes these concerns—providing a single entry point with consistent authentication, throttling to protect backends, caching to reduce load, request/response transformation to decouple clients from backend formats, and comprehensive monitoring. One API Gateway configuration replaces hundreds of lines of boilerplate code across microservices.

API Gateway offers three API types optimized for different use cases: REST APIs provide full-featured HTTP APIs with caching and advanced transformations; HTTP APIs deliver lower-latency, lower-cost alternatives for simple proxy scenarios; WebSocket APIs enable real-time bidirectional communication for chat, gaming, and streaming. Choosing the wrong type wastes money or misses required features. Misconfigured CORS blocks legitimate requests. Improper throttling allows DDoS attacks or blocks legitimate traffic. Missing caching overloads backends. This chapter covers API Gateway from fundamentals to production patterns, including API types, integration patterns, authentication, throttling, caching, versioning, custom domains, monitoring, and building production-grade APIs.

## Theory \& Concepts

### API Gateway Fundamentals

**What is API Gateway?**

Amazon API Gateway is a fully managed service for creating, deploying, and managing APIs at any scale:

```
Core Capabilities:

Request Management:
- Accept HTTP/WebSocket requests
- Route to backend (Lambda, HTTP, AWS service)
- Transform request/response
- Validate requests against OpenAPI schema

Security:
- Authentication (IAM, Cognito, Lambda authorizers)
- Authorization (IAM policies, custom logic)
- API keys for third-party developers
- AWS WAF integration (DDoS protection)
- SSL/TLS termination

Performance:
- Edge-optimized or regional endpoints
- Response caching (reduce backend load)
- Request throttling (protect backends)
- Payload compression

Operations:
- Multiple deployment stages (dev, test, prod)
- Canary deployments (gradual rollout)
- CloudWatch metrics and logging
- X-Ray tracing integration
- API documentation generation

Architecture:

Client (Mobile/Web/IoT)
    ↓
CloudFront (Edge-optimized) or Regional Endpoint
    ↓
API Gateway
├── Authentication/Authorization
├── Request Validation
├── Rate Limiting/Throttling
├── Caching (optional)
└── Request Transformation
    ↓
Backend Integration
├── Lambda Function (serverless)
├── HTTP Endpoint (microservices)
├── AWS Service (DynamoDB, Step Functions, etc.)
└── VPC Link (private resources)
    ↓
Response Transformation
    ↓
Client receives response
```


### API Types Comparison

**REST API vs HTTP API vs WebSocket API:**

```
REST API (Full-Featured):

Characteristics:
- Feature-rich (all API Gateway features)
- Edge-optimized or regional
- Request/response transformations
- Request validation
- Response caching
- Usage plans and API keys
- Higher latency (~100ms)
- Higher cost

Features:
✓ Response caching
✓ Request/response mapping templates
✓ Request validation
✓ API keys and usage plans
✓ Resource policies
✓ AWS X-Ray tracing
✓ Private endpoints (VPC)
✓ CORS configuration
✓ Custom domain names
✓ Canary deployments

Pricing (us-east-1):
- First 333 million requests: $3.50 per million
- Next 667 million: $2.80 per million
- Over 1 billion: $2.38 per million
- Caching: $0.02/hour per GB

Use Cases:
- APIs needing caching
- Complex request transformations
- API monetization (usage plans/keys)
- Enterprise APIs with full features
- Private APIs in VPC

HTTP API (Lightweight, Lower Cost):

Characteristics:
- Simpler, faster, cheaper
- Lower latency (~70ms, 30% faster)
- 70% cheaper than REST API
- JWT authorization built-in
- OIDC/OAuth 2.0 support

Features:
✓ JWT authorizers (native)
✓ CORS (automatic)
✓ OIDC/OAuth 2.0
✓ Custom domain names
✓ Auto-deployment
✗ No caching
✗ No usage plans/API keys
✗ No request validation
✗ No mapping templates

Pricing (us-east-1):
- First 300 million requests: $1.00 per million
- Over 300 million: $0.90 per million

Cost Comparison Example:
100 million requests/month
- REST API: $350
- HTTP API: $100
Savings: $250/month (71% cheaper)

Use Cases:
- Simple proxy to Lambda/HTTP
- Cost-sensitive applications
- OAuth/JWT authentication
- Microservices communication
- Modern serverless APIs

WebSocket API:

Characteristics:
- Persistent bidirectional connections
- Real-time communication
- Server can push to client
- Connection-based pricing

Features:
✓ Persistent connections
✓ Server-initiated messages
✓ Connection management
✓ Route-based message handling
✓ Lambda integration
✗ No caching
✗ No usage plans

Pricing:
- Connection minutes: $0.25 per million
- Messages: $1.00 per million
- Data transfer: Standard rates

Example Cost:
1,000 users, 1 hour average connection, 100 messages each
- Connections: 1,000 × 60 min = 60,000 min = $0.015
- Messages: 1,000 × 100 = 100,000 = $0.10
Total: $0.115 per session

Use Cases:
- Chat applications
- Real-time dashboards
- Multiplayer gaming
- Live streaming updates
- IoT device communication
- Financial trading platforms

Decision Matrix:

┌─────────────────────────┬──────────┬──────────┬──────────────┐
│ Feature                 │ REST API │ HTTP API │ WebSocket    │
├─────────────────────────┼──────────┼──────────┼──────────────┤
│ Response Caching        │ Yes      │ No       │ No           │
│ Usage Plans/API Keys    │ Yes      │ No       │ No           │
│ Request Validation      │ Yes      │ No       │ No           │
│ Mapping Templates       │ Yes      │ No       │ No           │
│ JWT Authorizers         │ Yes      │ Native   │ Yes          │
│ Private Endpoints (VPC) │ Yes      │ No       │ No           │
│ Cost (per million)      │ $3.50    │ $1.00    │ Varies       │
│ Latency                 │ ~100ms   │ ~70ms    │ Connection   │
│ Best For                │ Features │ Cost     │ Real-time    │
└─────────────────────────┴──────────┴──────────┴──────────────┘

Recommendation:
- Start with HTTP API (cheaper, simpler)
- Use REST API only if need caching/usage plans
- Use WebSocket API for real-time requirements
```


### Integration Types

API Gateway supports multiple backend integration patterns:

```
1. Lambda Proxy Integration:

Flow:
Client → API Gateway → Lambda (event contains full request)
                     ← Lambda (return formatted response)

Request Format to Lambda:
{
  "httpMethod": "POST",
  "path": "/users",
  "queryStringParameters": {"id": "123"},
  "headers": {"Content-Type": "application/json"},
  "body": "{\"name\": \"John\"}",
  "requestContext": {...}
}

Lambda Response Format:
{
  "statusCode": 200,
  "headers": {"Content-Type": "application/json"},
  "body": "{\"userId\": \"123\", \"name\": \"John\"}"
}

Characteristics:
✓ Simple pass-through
✓ Lambda handles everything
✓ Flexible response format
✗ Lambda must format response correctly

Use Case: Most Lambda integrations (default choice)

2. Lambda Custom Integration:

Flow:
Client → API Gateway → Transform request
                    → Lambda (custom input)
                    ← Lambda (custom output)
                    ← Transform response → Client

Characteristics:
✓ Request/response mapping templates
✓ Decouple client from Lambda format
✓ Version API independently of Lambda
✗ More complex configuration

Use Case: Legacy Lambda functions, specific formats

3. HTTP Proxy Integration:

Flow:
Client → API Gateway → HTTP Endpoint (pass-through)
                     ← HTTP Endpoint

Characteristics:
✓ Simple pass-through to HTTP backend
✓ Preserves headers, query strings
✓ Works with any HTTP service
✗ Limited transformation

Use Case: Proxy to existing HTTP APIs, microservices

4. HTTP Custom Integration:

Flow:
Client → API Gateway → Transform → HTTP Endpoint
                               ← Transform ← HTTP Response

Characteristics:
✓ Request/response transformation
✓ Header manipulation
✓ Query string modifications
✗ Complex configuration

Use Case: Integrate with non-standard HTTP APIs

5. AWS Service Integration:

Flow:
Client → API Gateway → AWS Service (DynamoDB, SNS, SQS, etc.)
                     ← Service Response

Example: Direct DynamoDB Integration
POST /users
API Gateway → DynamoDB PutItem (no Lambda)

Characteristics:
✓ No Lambda needed (lower cost)
✓ Lower latency (fewer hops)
✓ Direct service access
✗ Complex mapping templates
✗ Limited transformation logic

Use Case: Simple CRUD operations, message publishing

6. Mock Integration:

Flow:
Client → API Gateway → Mock Response (no backend)

Characteristics:
✓ No backend required
✓ Fixed response
✓ Useful for testing
✗ Static data only

Use Case: API development, testing, documentation

7. VPC Link Integration:

Flow:
Client → API Gateway → VPC Link → NLB → Private Resource

Characteristics:
✓ Access private VPC resources
✓ Secure (no public exposure)
✓ Works with NLB only
✗ Additional cost (VPC Link)

Use Case: Private APIs, legacy systems in VPC

Integration Decision Tree:

Need serverless? → Lambda Proxy ✓
Need VPC access? → VPC Link ✓
Need direct AWS service? → AWS Service Integration ✓
Need to proxy HTTP? → HTTP Proxy ✓
Need complex transformations? → Custom Integration ✓
Need testing without backend? → Mock Integration ✓
```


### Authentication and Authorization

**Authentication Methods:**

```
1. IAM Authentication:

How it Works:
Client signs request with AWS credentials (SigV4)
    ↓
API Gateway validates signature
    ↓
IAM policy authorizes access

Characteristics:
✓ No additional cost
✓ Built-in AWS authentication
✓ Granular permissions (IAM policies)
✗ Requires AWS credentials
✗ Complex for public APIs

Use Case:
- Internal AWS services calling API
- Admin APIs
- Service-to-service communication

Example IAM Policy:
{
  "Effect": "Allow",
  "Action": "execute-api:Invoke",
  "Resource": "arn:aws:execute-api:us-east-1:*/*/GET/users"
}

2. Amazon Cognito Authorizer:

How it Works:
User authenticates with Cognito
    ↓
Receives JWT token
    ↓
Client sends request with token in header
    ↓
API Gateway validates with Cognito
    ↓
Request authorized

Characteristics:
✓ User management built-in
✓ Social identity providers (Google, Facebook)
✓ MFA support
✓ User pools and identity pools
✗ Additional service cost

Use Case:
- Mobile/web applications
- User authentication required
- Social login needed

3. Lambda Authorizer (Custom):

How it Works:
Client sends request with auth token
    ↓
API Gateway calls Lambda authorizer
    ↓
Lambda validates token (custom logic)
    ↓
Returns IAM policy (allow/deny)
    ↓
API Gateway caches policy (configurable TTL)
    ↓
Request authorized or rejected

Types:
- Token-based: Bearer token in header
- Request-based: Full request parameters

Lambda Authorizer Response:
{
  "principalId": "user123",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [{
      "Action": "execute-api:Invoke",
      "Effect": "Allow",
      "Resource": "arn:aws:execute-api:*:*:*/*/GET/users"
    }]
  },
  "context": {
    "userId": "user123",
    "role": "admin"
  }
}

Characteristics:
✓ Completely custom logic
✓ Any authentication mechanism
✓ Policy caching (reduce invocations)
✗ Additional Lambda cost
✗ Added latency (~100ms)

Use Case:
- OAuth/JWT from third-party
- Legacy authentication systems
- Custom authorization logic
- Complex permissions

Caching:
- TTL: 0 (no cache) to 3600 seconds
- Reduces Lambda invocations
- Based on token value

4. API Keys:

How it Works:
Client includes API key in header (x-api-key)
    ↓
API Gateway validates key
    ↓
Associates with usage plan
    ↓
Checks throttle/quota limits

Characteristics:
✓ Simple implementation
✓ Usage plans integration
✓ Throttling per key
✗ Not secure (easily shared)
✗ No user identity
✗ Should combine with other auth

Use Case:
- Third-party developers
- Usage tracking/billing
- Rate limiting per client
- NOT for security (use with IAM/Cognito)

Important: API keys are NOT a security mechanism
Use for identification and usage tracking only
Always combine with proper authentication

5. Resource Policies:

How it Works:
Policy attached to API
    ↓
Defines who can access
    ↓
Source IP restrictions
    ↓
VPC/VPC endpoint restrictions

Example Policy:
{
  "Effect": "Deny",
  "Principal": "*",
  "Action": "execute-api:Invoke",
  "Resource": "arn:aws:execute-api:*:*:*",
  "Condition": {
    "NotIpAddress": {
      "aws:SourceIp": ["203.0.113.0/24"]
    }
  }
}

Use Case:
- IP allowlist/denylist
- VPC endpoint policies
- Cross-account access
```

**Authorization Comparison:**

```
┌──────────────────┬─────────────┬─────────────┬──────────────┐
│ Method           │ Complexity  │ Cost        │ Best For     │
├──────────────────┼─────────────┼─────────────┼──────────────┤
│ IAM              │ Low         │ Free        │ AWS services │
│ Cognito          │ Medium      │ Low         │ User apps    │
│ Lambda Authorizer│ High        │ Medium      │ Custom auth  │
│ API Keys         │ Very Low    │ Free        │ Tracking only│
│ Resource Policy  │ Low         │ Free        │ IP/VPC limit │
└──────────────────┴─────────────┴─────────────┴──────────────┘

Recommendation:
Public user APIs → Cognito
Service-to-service → IAM
Custom requirements → Lambda Authorizer
Usage tracking → API Keys (with other auth)
```


### Throttling and Rate Limiting

**Throttling Mechanisms:**

```
Three-Level Throttling Hierarchy:

1. Account-Level Limits (Regional):
   - 10,000 requests per second (RPS)
   - Burst: 5,000 requests
   - Shared across all APIs in region
   - Can request increase via support

2. API/Stage-Level Limits:
   - Configure per API or stage
   - Default: Inherit account limits
   - Can reduce below account limit
   - Cannot exceed account limit

3. Method-Level Limits:
   - Most granular control
   - Per HTTP method (GET, POST, etc.)
   - Overrides stage-level settings
   - Useful for expensive operations

Example Configuration:

Account: 10,000 RPS

API "Production" Stage:
- Stage limit: 5,000 RPS
- Burst: 2,500

Within Production:
- GET /users: 1,000 RPS (read-heavy)
- POST /users: 100 RPS (write-limited)
- GET /products: 2,000 RPS (popular endpoint)

Throttling Behavior:

Within Limits:
Request arrives → Check limits → Process normally

Exceeding Limits:
Request arrives → Check limits → 429 Too Many Requests
Response Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
Retry-After: 1

Burst Behavior:
Burst capacity allows temporary spikes
- Sustained rate: 1,000 RPS
- Burst: 2,000 requests
- Bucket refills at sustained rate

Example:
Idle system (bucket full: 2,000 tokens)
    ↓
Spike: 2,000 requests in 1 second (depletes bucket)
    ↓
Bucket refills at 1,000/second
    ↓
After 2 seconds: Bucket full again

Token Bucket Algorithm:
- Tokens added at steady rate (RPS)
- Each request consumes one token
- Burst = bucket capacity
- No tokens = throttle (429)
```

**Usage Plans (REST API Only):**

```
Usage Plans: Throttle + Quota + API Keys

Components:

1. Throttling:
   - Rate: Requests per second
   - Burst: Additional capacity

2. Quota:
   - Maximum requests per period
   - Period: Day, week, month
   - Hard limit (cannot exceed)

3. API Keys:
   - Associate keys with plan
   - Track usage per key
   - Multiple keys per plan

Example Usage Plan:

Plan: "Free Tier"
- Throttle: 10 RPS, burst 20
- Quota: 10,000 requests/day
- API Keys: free-tier-key-1, free-tier-key-2

Plan: "Premium"
- Throttle: 100 RPS, burst 200
- Quota: 1,000,000 requests/month
- API Keys: premium-key-1, premium-key-2

Use Cases:
- API monetization (free/premium tiers)
- Third-party developer limits
- Partner integrations
- SLA enforcement
- Cost control

Important: HTTP API does NOT support usage plans
Only REST API has this feature
```


### Caching

**Response Caching (REST API Only):**

```
Cache Configuration:

Cache Size Options:
- 0.5 GB: $0.02/hour
- 1.6 GB: $0.038/hour
- 6.1 GB: $0.20/hour
- 13.5 GB: $0.25/hour
- 28.4 GB: $0.50/hour
- 58.2 GB: $1.00/hour
- 118 GB: $2.00/hour
- 237 GB: $4.00/hour

Cache TTL:
- Default: 300 seconds (5 minutes)
- Range: 0 to 3600 seconds
- Configurable per stage/method

Cache Key:
Determines cache entry uniqueness
Components:
- Path parameters
- Query strings (optional, selectable)
- Headers (optional, selectable)

Example:
Endpoint: GET /users/{userId}?include=details

Cache Keys:
- Path: /users/123 (always included)
- Query: include=details (optional)
- Header: Accept-Language (optional)

Different cache entries:
- /users/123?include=details (cached separately)
- /users/123?include=basic (different entry)
- /users/456?include=details (different entry)

Cache Invalidation:

Manual Invalidation:
- Invalidate entire cache
- Invalidate specific resource
- Flush all on deployment (optional)

TTL Expiration:
- Automatic after TTL
- Least Recently Used (LRU) eviction

Client Invalidation:
- Cache-Control: max-age=0 (requires IAM permission)
- Requires cache invalidation authorization

Cost-Benefit Analysis:

Scenario: 1 million requests/day, Lambda backend ($0.20/million)

Without Caching:
- API Gateway: $3.50
- Lambda: 1M × $0.20 = $200
- Total: $203.50/day

With Caching (90% hit rate):
- API Gateway: $3.50
- Lambda: 100K × $0.20 = $20 (only cache misses)
- Cache (1.6 GB): $0.038 × 24 = $0.91
- Total: $24.41/day

Savings: $179/day = $5,370/month (88% reduction)

Best Practices:
✓ Enable for read-heavy endpoints
✓ Start with 5-minute TTL, adjust based on data freshness
✓ Include only necessary parameters in cache key
✓ Monitor cache hit rate (target > 80%)
✓ Consider data update frequency
✗ Don't cache user-specific data (high cardinality)
✗ Don't cache rapidly changing data
```


### CORS Configuration

**Cross-Origin Resource Sharing:**

```
CORS Problem:

Browser Security:
Web page: https://example.com
API: https://api.example.com

Without CORS:
Browser blocks API call (different origin)
Console Error: "CORS policy blocked request"

With CORS:
API returns CORS headers
Browser allows API call

CORS Headers:

Preflight Request (OPTIONS):
Browser sends OPTIONS request before actual request

OPTIONS /users
Origin: https://example.com

API Response:
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, X-Api-Key
Access-Control-Max-Age: 86400

Actual Request:
Browser sends actual request (GET, POST, etc.)

API Response:
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
(response data)

API Gateway CORS Configuration:

REST API:
Manual configuration required
- Enable CORS on resource
- Configure allowed origins
- Configure allowed methods
- Configure allowed headers

HTTP API:
Automatic CORS support
- Simple enable/disable
- Wildcard origins supported
- Simpler configuration

Common Configurations:

Development (Allow All):
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *

⚠️ WARNING: Insecure for production!

Production (Specific Origins):
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Key
Access-Control-Allow-Credentials: true

Multiple Origins (Not directly supported):
Solution: Lambda function checks Origin header, returns matching value

CORS Preflight Caching:
Access-Control-Max-Age: 86400 (24 hours)
Browser caches preflight response
Reduces OPTIONS requests

Common CORS Issues:

Issue: "No Access-Control-Allow-Origin header"
Cause: CORS not enabled or misconfigured
Fix: Enable CORS, configure origins

Issue: "Credentials flag is true, but Access-Control-Allow-Credentials is missing"
Cause: Sending cookies/credentials without header
Fix: Set Access-Control-Allow-Credentials: true

Issue: "Method not allowed"
Cause: Method not in Access-Control-Allow-Methods
Fix: Add method to allowed methods list

Issue: "Header not allowed"
Cause: Custom header not in Access-Control-Allow-Headers
Fix: Add header to allowed headers list
```


### Request/Response Transformation

**Mapping Templates (REST API Only):**

```
VTL (Velocity Template Language):

Purpose:
Transform request/response format
Map client format to backend format
Extract/inject data

Request Mapping Example:

Client Request:
POST /users
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com"
}

Mapping Template:
{
  "user": {
    "name": "$input.path('$.firstName') $input.path('$.lastName')",
    "contactEmail": "$input.path('$.email')",
    "createdAt": "$context.requestTimeEpoch"
  }
}

Backend Receives:
{
  "user": {
    "name": "John Doe",
    "contactEmail": "john@example.com",
    "createdAt": 1642176000000
  }
}

Response Mapping Example:

Backend Response:
{
  "userId": "user-123",
  "username": "johndoe",
  "email": "john@example.com",
  "createdTimestamp": 1642176000000
}

Mapping Template:
{
  "user": {
    "id": "$input.path('$.userId')",
    "name": "$input.path('$.username')",
    "email": "$input.path('$.email')",
    "createdAt": "$util.parseJson($input.path('$.createdTimestamp'))"
  }
}

Client Receives:
{
  "user": {
    "id": "user-123",
    "name": "johndoe",
    "email": "john@example.com",
    "createdAt": 1642176000000
  }
}

Common VTL Functions:

$input.path('$.field') - Extract JSON field
$input.json('$') - Entire JSON body
$context.requestId - Request ID
$context.authorizer.claims.sub - Cognito user ID
$util.escapeJavaScript($input.json('$')) - Escape JSON
$util.urlEncode($input.params('param')) - URL encode
$util.base64Encode($input.path('$.data')) - Base64 encode

HTTP API Limitations:
HTTP APIs do NOT support mapping templates
Only basic parameter mapping
Use Lambda for complex transformations
```


## Hands-On Implementation

### Lab 1: Creating HTTP API with Lambda

```python
import boto3

apigateway = boto3.client('apigatewayv2')

# Create HTTP API
api = apigateway.create_api(
    Name='users-api',
    ProtocolType='HTTP',
    CorsConfiguration={
        'AllowOrigins': ['https://app.example.com'],
        'AllowMethods': ['GET', 'POST'],
        'AllowHeaders': ['Content-Type']
    }
)

# Create integration
integration = apigateway.create_integration(
    ApiId=api['ApiId'],
    IntegrationType='AWS_PROXY',
    IntegrationUri='arn:aws:lambda:us-east-1:123456789012:function:get-users',
    PayloadFormatVersion='2.0'
)

# Create route
apigateway.create_route(
    ApiId=api['ApiId'],
    RouteKey='GET /users',
    Target=f"integrations/{integration['IntegrationId']}"
)
```


### Lab 2: Usage Plan with API Keys

```python
# Create API key
key = apigateway.create_api_key(
    name='partner-api-key',
    enabled=True
)

# Create usage plan
plan = apigateway.create_usage_plan(
    name='partner-plan',
    throttle={'rateLimit': 100, 'burstLimit': 200},
    quota={'limit': 10000, 'period': 'DAY'}
)

# Associate API with plan
apigateway.create_usage_plan_key(
    usagePlanId=plan['id'],
    keyId=key['id'],
    keyType='API_KEY'
)
```


## Tips \& Best Practices

**Tip 1: Use HTTP API Unless Need REST Features**
HTTP APIs are 70% cheaper and 30% faster—use unless need caching or usage plans.

**Tip 2: Enable Caching for Read-Heavy Endpoints**
90% cache hit rate reduces backend load 10× and saves significant Lambda costs.

**Tip 3: Use Lambda Authorizers Sparingly**
Cache authorizer results (TTL=3600) to reduce invocations and latency.

**Tip 4: Configure CORS Properly**
Don't use wildcard (*) in production—specify exact origins for security.

**Tip 5: Monitor Throttling Metrics**
Set CloudWatch alarms on 4XXError (throttling) to adjust limits before users affected.

## Pitfalls \& Remedies

**Pitfall 1: CORS Misconfiguration**
*Problem:* Browser blocks API calls due to missing or incorrect CORS headers.
*Solution:* Enable CORS for all methods; include all required headers in Allow-Headers; test with browser dev tools.

**Pitfall 2: Insufficient Throttling Limits**
*Problem:* Legitimate traffic throttled during peak usage; or DDoS overwhelms backend.
*Solution:* Monitor 429 errors; set method-level limits for expensive operations; request limit increases proactively.

**Pitfall 3: Cache Key Misconfiguration**
*Problem:* Cache too granular (low hit rate) or too broad (serving wrong data).
*Solution:* Include only parameters affecting response; exclude user-specific headers; monitor hit rate.

## Review Questions

1. **HTTP API cost vs REST API cost?** ~70% cheaper (\$1.00 vs \$3.50 per million)
2. **Default throttle limit (account)?** 10,000 RPS with 5,000 burst
3. **Cache TTL range?** 0 to 3,600 seconds
4. **HTTP API supports caching?** No (REST API only)
5. **WebSocket API use case?** Real-time bidirectional communication

***

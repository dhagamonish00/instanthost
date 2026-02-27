# InstantHost API Documentation v1

## Base URL
`https://instanthost.site/api/v1`

## Authentication
Use Bearer tokens (API Key) in the `Authorization` header.
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### 1. Create/Update Publish
`POST /publish` or `PUT /publish/:slug`

**Body:**
```json
{
  "files": [
    { "path": "index.html", "size": 1024, "contentType": "text/html" }
  ],
  "ttlSeconds": 86400,
  "viewer": { "title": "My Page", "description": "Hello world" }
}
```

**Response:**
```json
{
  "success": true,
  "slug": "fast-blue-bird-x1",
  "siteUrl": "https://fast-blue-bird-x1.instanthost.site",
  "finalizeUrl": "...",
  "uploads": [
    { "path": "index.html", "method": "PUT", "url": "PRESIGNED_S3_URL", "headers": { "Content-Type": "text/html" } }
  ]
}
```

### 2. Finalize Publish
`POST /publish/:slug/finalize`

Call this after uploading all files to the presigned URLs.

**Body:**
```json
{ "versionId": "..." }
```

### 3. Claim Site
`POST /publish/:slug/claim`

Convert an anonymous publish to a permanent one.

**Body:**
```json
{ "claimToken": "..." }
```

### 4. List Sites
`GET /sites` (Authenticated only)

### 5. Analytics
`GET /sites/:slug/analytics` (Authenticated only) - Coming soon.

## Rate Limits
- **Anonymous**: 5 publishes per hour.
- **Authenticated**: 60 publishes per hour.

## Error Codes
- `401`: Unauthorized (Missing/invalid API key).
- `403`: Forbidden (Quota exceeded or ownership mismatch).
- `404`: Not Found.
- `429`: Too Many Requests.

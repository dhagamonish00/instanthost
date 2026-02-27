# Production Deployment Guide

## Architecture
InstantHost consists of:
- **Node.js API**: Express server handling logic and routing.
- **PostgreSQL**: Persistent storage for user and publish metadata.
- **Cloudflare R2**: Global CDN and storage for static files.
- **SMTP**: Email service for magic links.

## 1. Cloudflare Configuration

### R2 Bucket
1. Create an R2 bucket named `instanthost-sites`.
2. Configure a Custom Domain or R2 Managed Subdomain for the bucket if you want to serve files through it directly (optional, if server is not proxying).
3. Generate an API Token with "Edit" permissions for the bucket. Save the **Access Key ID** and **Secret Access Key**.

### DNS / Subdomain Routing
1. Point your domain (e.g., `instanthost.site`) to your server's IP.
2. Add a wildcard CNAME record: `*.instanthost.site` pointing to the main domain.
3. This allows the server to receive traffic for any slug and route accordingly.

## 2. Server Deployment (Docker)

### Dockerfile
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm install --production
COPY server/ .
EXPOSE 3000
CMD ["node", "index.js"]
```

### Docker Compose
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: instanthost
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

## 3. Environment Variables
Ensure all variables in `.env` are set correctly for the production environment.

## 4. Reverse Proxy (Nginx)
Use Nginx or Caddy to handle SSL (Let's Encrypt) and forward traffic to port 3000.
```nginx
server {
    listen 80;
    server_name instanthost.site *.instanthost.site;
    return 301 https://$host$request_uri;
}
...
```

## 5. Security Checklist
- [ ] Change default DB passwords.
- [ ] Ensure `NODE_ENV=production`.
- [ ] Use a secure SMTP provider.
- [ ] Set `BASE_URL` to your production domain.

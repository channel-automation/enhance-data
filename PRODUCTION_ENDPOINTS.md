# Production Endpoints - Complete List

## 🚀 Deployments Status
- ✅ **Cloudflare Worker**: https://audience-acuity-proxy.curly-king-877d.workers.dev
- ⏳ **Railway Node.js**: Auto-deploying from GitHub push...

## 📍 Cloudflare Worker Endpoints

### Base URL: `https://audience-acuity-proxy.curly-king-877d.workers.dev`

### 🔐 Token Management
- `GET /token` - Generate a fresh Bearer token
- `GET /token?count=5` - Generate multiple tokens (max 10)
- `GET /token?keyId=XXX&secret=YYY` - Use custom credentials
- `GET /token-info` - Learn how tokens are generated
- `GET /token-validate?token=XXX` - Validate token format

### 📊 Audience Acuity Proxy
- `GET /phone?phone=15551234567&template=218923726` - Get identity by phone
- `GET /email?email=example@gmail.com&template=218923726` - Get identity by email
- `GET /address?address=123 Main St&template=218923726` - Get identity by address
- `GET /identities/phone?phone=15551234567` - Alternative phone endpoint

### 💾 D1 Database (SQLite)
- `POST /save-identity` - Save Audience Acuity data to D1
- `GET /get-identity/{phone}?workspace_id=XXX` - Retrieve saved identity from D1
- `GET /dashboard` - Interactive data visualization dashboard

### 🗄️ MySQL Database Proxy (NEW!)
- `GET /mysql/tables` - List all MySQL tables
- `GET /mysql/tables/{tableName}/schema` - Get table schema
- `GET /mysql/data/{tableName}` - Get data from any table
  - Query params: `limit`, `offset`, `orderBy`, `orderDir`, any column filter
- `GET /mysql/bot-users` - Get bot users with filtering
  - Query params: `user_id`, `phone`, `email`, `limit`, `offset`
- `POST /mysql/query` - Execute custom SELECT query
  - Body: `{ "query": "SELECT ...", "params": [] }`

### 🔧 Utility
- `GET /health` - Health check
- `GET /` or `GET /info` - API documentation

## 📍 Railway Node.js Endpoints (When deployed)

### Base URL: `https://[your-app].up.railway.app`

### Port 3001 - Audience Acuity Proxy Server
- `GET /identities/phone?phone=XXX` - Get identity by phone
- `GET /identities/email?email=XXX` - Get identity by email
- `GET /identities/address?address=XXX` - Get identity by address
- `GET /ip` - Get server's outgoing IP for whitelisting
- `GET /health` - Health check

### Port 3002 - MySQL API Server
- `GET /api/tables` - List all MySQL tables
- `GET /api/tables/:tableName/schema` - Get table schema
- `GET /api/data/:tableName` - Get data from any table
- `GET /api/bot-users` - Get bot users with filtering
- `POST /api/query` - Execute custom SELECT query
- `GET /health` - Health check

## 📊 Available MySQL Tables
- `bot_user_event_logs`
- `bot_user_fields`
- `bot_user_labels`
- `bot_users`
- `bot_vars`
- `chat_msgs`
- `daily_campaign_performance_summary`
- `global_sendgrid_stats`
- `ih_q2_sales`
- `market_lookup`
- `team_labels`
- `team_list_change_logs`
- `team_list_items`
- `twilio_calls_logs`
- `twilio_sms_logs`

## 🔨 Example Usage

### Get Bot Users via Worker
```bash
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/mysql/data/bot_users?limit=5"
```

### Custom Query via Worker
```bash
curl -X POST https://audience-acuity-proxy.curly-king-877d.workers.dev/mysql/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT user_id, first_name, email FROM bot_users WHERE email IS NOT NULL LIMIT 5"
  }'
```

### Get Identity Data via Worker
```bash
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/phone?phone=6102991669"
```

### Save Identity to D1
```bash
curl -X POST https://audience-acuity-proxy.curly-king-877d.workers.dev/save-identity \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "6102991669",
    "workspace_id": "client-123",
    "audience_acuity_data": {...}
  }'
```

## ⚠️ Important Notes

1. **MySQL API URL**: Currently set to placeholder. After Railway deployment completes:
   ```bash
   wrangler secret put MYSQL_API_URL
   # Enter your Railway URL: https://[your-app].up.railway.app
   ```

2. **Environment Variables**: Railway needs these in dashboard:
   - `MYSQL_HOST=5.161.181.95`
   - `MYSQL_PORT=3307`
   - `MYSQL_USER=chau_96323`
   - `MYSQL_PASSWORD=eipoPhohphi3fo3doh5hahM2kie8of`
   - `MYSQL_DATABASE=chau_96323`
   - `PORT=3001`
   - `MYSQL_PORT=3002`

3. **CORS**: All endpoints have CORS enabled for browser access

4. **Rate Limiting**: Cloudflare Workers have built-in DDoS protection

5. **Authentication**: MySQL endpoints currently open - add auth as needed
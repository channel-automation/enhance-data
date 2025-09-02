# 🚀 Production Endpoints - Separated by Service

## 1️⃣ Railway Node.js Server
**URL:** `https://enhance-data-production.up.railway.app`

### Audience Acuity Proxy Endpoints (Port 3001)
```
GET  /identities/phone?phone=15551234567&template=218923726
GET  /identities/email?email=example@gmail.com&template=218923726
GET  /identities/address?address=123 Main St&template=218923726
GET  /ip                    # Get server IP for whitelisting
GET  /health                # Health check
```

### MySQL API Endpoints (Port 3002)
```
GET  /api/tables                           # List all MySQL tables
GET  /api/tables/{tableName}/schema        # Get table schema
GET  /api/data/{tableName}                 # Get table data with pagination
     ?limit=100&offset=0&orderBy=id&orderDir=DESC
     ?anyColumn=filterValue                # Filter by any column
GET  /api/bot-users                        # Specialized bot users endpoint
     ?user_id=XXX&phone=XXX&email=XXX&limit=100&offset=0
POST /api/query                            # Execute SELECT queries
     Body: { "query": "SELECT...", "params": [] }
GET  /health                               # Health check
```

---

## 2️⃣ Cloudflare Worker
**URL:** `https://audience-acuity-proxy.curly-king-877d.workers.dev`

### Token Management
```
GET  /token                                # Generate single token
GET  /token?count=5                        # Generate multiple tokens
GET  /token?keyId=XXX&secret=YYY          # Custom credentials
GET  /token-info                          # Token generation info
GET  /token-validate?token=XXX            # Validate token format
```

### Audience Acuity Proxy (via Worker)
```
GET  /phone?phone=15551234567&template=218923726
GET  /email?email=example@gmail.com&template=218923726
GET  /address?address=123 Main St&template=218923726
GET  /identities/phone?phone=15551234567
```

### D1 Database (SQLite)
```
POST /save-identity                       # Save identity to D1
     Body: { "phone": "XXX", "workspace_id": "XXX", "audience_acuity_data": {...} }
GET  /get-identity/{phone}?workspace_id=XXX
GET  /dashboard                           # Visual dashboard
```

### MySQL Proxy (Routes to Railway)
```
GET  /mysql/tables                        # List all tables
GET  /mysql/tables/{tableName}/schema     # Get table schema
GET  /mysql/data/{tableName}              # Get table data
     ?limit=100&offset=0&orderBy=id&orderDir=DESC
GET  /mysql/bot-users                     # Bot users with filtering
POST /mysql/query                         # Custom SELECT query
     Body: { "query": "SELECT...", "params": [] }
```

### Utility
```
GET  /health                              # Health check
GET  /                                    # API documentation
GET  /info                                # API documentation
```

---

## 📊 MySQL Tables Available
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

---

## 🔧 Quick Test Commands

### Test Worker MySQL Proxy
```bash
# List tables via Worker
curl https://audience-acuity-proxy.curly-king-877d.workers.dev/mysql/tables

# Get bot users via Worker
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/mysql/data/bot_users?limit=5"

# Custom query via Worker
curl -X POST https://audience-acuity-proxy.curly-king-877d.workers.dev/mysql/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT user_id, email FROM bot_users WHERE email IS NOT NULL LIMIT 3"}'
```

### Test Railway Direct
```bash
# List tables directly from Railway
curl https://enhance-data-production.up.railway.app/api/tables

# Get bot users directly from Railway
curl "https://enhance-data-production.up.railway.app/api/data/bot_users?limit=5"
```

### Test Audience Acuity
```bash
# Via Worker
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/phone?phone=6102991669"

# Via Railway
curl "https://enhance-data-production.up.railway.app/identities/phone?phone=6102991669"
```

---

## 🔄 Data Flow

```
1. MySQL Data:
   User → Cloudflare Worker → Railway Node.js → MySQL Database

2. Audience Acuity:
   User → Cloudflare Worker → Audience Acuity API
   OR
   User → Railway Node.js → Audience Acuity API

3. D1 Storage:
   User → Cloudflare Worker → D1 Database (SQLite)
```

---

## ⚙️ Environment Variables

### Railway (Set in Dashboard)
```env
# MySQL Configuration
MYSQL_HOST=5.161.181.95
MYSQL_PORT=3307
MYSQL_USER=chau_96323
MYSQL_PASSWORD=eipoPhohphi3fo3doh5hahM2kie8of
MYSQL_DATABASE=chau_96323

# Server Ports
PORT=3001        # Main proxy server
MYSQL_PORT=3002  # MySQL API server

# Audience Acuity
AA_KEY_ID=RtbTYKU0MRMBFDyK
AA_SECRET=mIyr8FfEfu3BypFWxB8gMfwzF2hdOpqE
AA_ORIGIN=https://api.audienceacuity.com
```

### Cloudflare Worker (wrangler.toml)
```toml
[vars]
AA_ORIGIN = "https://api.audienceacuity.com"
MYSQL_API_URL = "https://enhance-data-production.up.railway.app"
```
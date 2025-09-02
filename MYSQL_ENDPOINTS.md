# MySQL API Endpoints Documentation

## Overview
This service provides RESTful API access to MySQL database through both Node.js server and Cloudflare Worker proxy.

## Architecture
```
User → Cloudflare Worker → Node.js MySQL API → MySQL Database
```

## Environment Variables Required
```bash
# MySQL Configuration
MYSQL_HOST=5.161.181.95
MYSQL_PORT=3307
MYSQL_USER=chau_96323
MYSQL_PASSWORD=eipoPhohphi3fo3doh5hahM2kie8of
MYSQL_DATABASE=chau_96323

# Server Ports
PORT=3001        # Main proxy server
MYSQL_PORT=3002  # MySQL API server
```

## Available Endpoints

### Direct MySQL API Endpoints (Node.js - Port 3002)
- `GET /health` - Health check
- `GET /api/tables` - List all MySQL tables
- `GET /api/tables/:tableName/schema` - Get table schema
- `GET /api/data/:tableName` - Get data from any table
  - Query params: `limit`, `offset`, `orderBy`, `orderDir`
  - Filter by any column: `?columnName=value`
- `GET /api/bot-users` - Get bot users with filtering
  - Query params: `user_id`, `phone`, `email`, `limit`, `offset`
- `POST /api/query` - Execute custom SELECT query
  - Body: `{ "query": "SELECT ...", "params": [] }`

### Cloudflare Worker MySQL Proxy Endpoints
- `GET /mysql/tables` - List all MySQL tables
- `GET /mysql/tables/{tableName}/schema` - Get table schema
- `GET /mysql/data/{tableName}` - Get data from any table
- `GET /mysql/bot-users` - Get bot users with filtering
- `POST /mysql/query` - Execute custom SELECT query

## Example Usage

### Get all tables
```bash
curl https://your-worker.workers.dev/mysql/tables
```

### Get data from bot_users table
```bash
curl "https://your-worker.workers.dev/mysql/data/bot_users?limit=10&offset=0"
```

### Custom query
```bash
curl -X POST https://your-worker.workers.dev/mysql/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM chat_msgs WHERE user_id = ? LIMIT 5",
    "params": ["user123"]
  }'
```

## Available Tables
- bot_user_event_logs
- bot_user_fields
- bot_user_labels
- bot_users
- bot_vars
- chat_msgs
- daily_campaign_performance_summary
- global_sendgrid_stats
- ih_q2_sales
- market_lookup
- team_labels
- team_list_change_logs
- team_list_items
- twilio_calls_logs
- twilio_sms_logs

## Deployment

### Railway
The Node.js servers auto-deploy when pushing to GitHub. The `npm start` command runs both:
1. Original Audience Acuity proxy (port 3001)
2. MySQL API server (port 3002)

### Cloudflare Worker
Deploy with: `npm run deploy`

After Railway deployment, update the Worker's MYSQL_API_URL:
```bash
wrangler secret put MYSQL_API_URL
# Enter: https://your-railway-app.up.railway.app
```
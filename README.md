# Audience Acuity API Proxy

A Cloudflare Worker that provides simple REST endpoints for Audience Acuity's API with dynamic authentication handling.

## What This Solves

Audience Acuity uses dynamic Bearer tokens that change every request:
- `Bearer <KEY_ID><NOW><MD5(NOW+SECRET)>`
- `NOW` = current timestamp in base-36
- `MD5` hash changes every time

This Worker handles the dynamic authentication automatically, so you can make simple API calls.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set your API credentials as Cloudflare secrets:
```bash
wrangler secret put AA_KEY_ID
# Enter: piW26VAQeP9IjdDy

wrangler secret put AA_SECRET  
# Enter: VASWj9dhpHUxyH7VEzve3jXyfFCOOoao
```

3. Deploy to Cloudflare:
```bash
npm run deploy
```

## API Endpoints

Your deployed Worker will provide these endpoints:

### Phone Lookup
```
GET https://your-worker.workers.dev/phone?phone=15551234567&template=79123584
```

### Email Lookup  
```
GET https://your-worker.workers.dev/email?email=example@gmail.com&template=79123584
```

### Address Lookup
```
GET https://your-worker.workers.dev/address?address=123%20Main%20St&template=79123584
```

### API Info
```
GET https://your-worker.workers.dev/
```

## Parameters

- `phone`: 10-digit phone number (required for phone endpoint)
- `email`: Email address (required for email endpoint) 
- `address`: Street address (required for address endpoint)
- `template`: API request template ID (optional, defaults to 79123584)

## Development

Run locally:
```bash
npm run dev
```

View logs:
```bash
npm run tail
```

## Example Usage

```bash
# Phone lookup
curl "https://your-worker.workers.dev/phone?phone=15551234567"

# Email lookup  
curl "https://your-worker.workers.dev/email?email=test@example.com"

# Address lookup
curl "https://your-worker.workers.dev/address?address=123%20Main%20St"
```

The Worker automatically:
- Generates fresh Bearer tokens for each request
- Handles CORS for browser requests
- Returns JSON responses with proper error handling
- Proxies all responses from Audience Acuity API
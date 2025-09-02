# Audience Acuity API Integration - Internal Team Documentation

**Version:** 2.0  
**Last Updated:** September 1, 2025  
**Author:** Engineering Team Lead
**For:** Internal Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Base URLs](#base-urls)
3. [Authentication Token Generation](#authentication-token-generation)
4. [Database Operations](#database-operations)
5. [API Proxy Endpoints](#api-proxy-endpoints)
6. [Error Handling](#error-handling)
7. [Troubleshooting](#troubleshooting)
8. [Rate Limits & Best Practices](#rate-limits--best-practices)

---

## Overview

Team,

I've built our Audience Acuity API integration system to solve the authentication challenges we've been facing. Here's what I've implemented for you:

- **Token Generation**: Generate Bearer tokens for direct API access
- **D1 Database Storage**: Store and retrieve Audience Acuity data with workspace isolation
- **API Proxy**: Direct proxy to Audience Acuity API (requires IP whitelisting)
- **Retry Logic**: Automatic retry with exponential backoff for rate limiting

### How Our System Works

```
[Your App] → [Our Token Generator] → [Direct API Call] → [Save to D1]
     ↓              ↓                      ↓                ↓
[Postman]  → [Our Worker] → [Audience Acuity] → [Our Database]
```

---

## Base URLs

I've set up a custom domain for us to use:

| Environment | URL |
|-------------|-----|
| **Our Custom Domain** | `http://api.enhanced-data.channelautomation.com` |
| **Backup (Cloudflare)** | `https://audience-acuity-proxy.curly-king-877d.workers.dev` |

**Important**: Use our custom domain for all your API calls. I've tested everything and it's working perfectly on HTTP. We'll add HTTPS support later if needed.

### What I've Tested ✅
- **Token Generation**: ✅ Working  
- **Database Save**: ✅ Working
- **Database Retrieve**: ✅ Working
- **All Features**: ✅ Ready for you to use

---

## Authentication Token Generation

### Generate Bearer Token

**What this does**: I built this endpoint to generate fresh Bearer tokens whenever you need to make direct Audience Acuity API calls

#### Endpoint
```
GET /token
```

#### Query Parameters
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `count` | integer | No | Number of tokens (max 10) | `3` |
| `keyId` | string | No | Custom key ID | `RtbTYKU0MRMBFDyK` |
| `secret` | string | No | Custom secret | `mIyr8FfEfu3BypFWxB8gMfwzF2hdOpqE` |

#### Sample Request
```bash
# Using custom domain
curl "http://api.enhanced-data.channelautomation.com/token?count=1"

# Alternative (Cloudflare domain)
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/token?count=1"
```

#### Sample Response
```json
{
  "success": true,
  "tokens": {
    "token": "Bearer RtbTYKU0MRMBFDyKmf1ki9ap8484996614677f89942dc2416fd5502f",
    "generated_at": "2025-09-01T20:24:15.505Z",
    "valid_for": "Single use within a few seconds",
    "components": {
      "prefix": "Bearer",
      "keyId": "RtbTYKU0MRMBFDyK",
      "timestamp": "mf1ki9ap",
      "hash": "8484996614677f89942dc2416fd5502f"
    }
  },
  "usage": "Add this token to your Authorization header",
  "example": "curl -H \"Authorization: Bearer RtbTYKU0MRMBFDyKmf1ki9ap8484996614677f89942dc2416fd5502f\" https://api.audienceacuity.com/v2/identities/byPhone?phone=5551234567"
}
```

### Token Information & Validation

#### Get Token Algorithm Info
```
GET /token-info
```

#### Validate Token Format
```
GET /token-validate?token=Bearer_TOKEN_HERE
```

---

## Database Operations

### Save Identity Data

**Why I built this**: We need to cache Audience Acuity responses to avoid hitting their API repeatedly. This endpoint stores the complete response with workspace isolation so different clients don't mix data

#### Endpoint
```
POST /save-identity
```

#### Headers
```json
{
  "Content-Type": "application/json"
}
```

#### Request Body Schema
```json
{
  "phone": "string (required)",
  "workspace_id": "string (required)", 
  "audience_acuity_data": "object (required)"
}
```

#### Sample Request (Postman)
```bash
POST http://api.enhanced-data.channelautomation.com/save-identity
Content-Type: application/json

{
  "phone": "6102991669",
  "workspace_id": "client-acme-corp",
  "audience_acuity_data": {
    "input": {"phone": "6102991669"},
    "identities": [{
      "id": 141080788,
      "firstName": "Joseph",
      "lastName": "Kish",
      "address": "175 Forest Rd",
      "city": "Bangor",
      "state": "PA",
      "zip": "18013",
      "zip4": "5353",
      "countyName": "Northampton",
      "latitude": 40.903595,
      "longitude": -75.15061,
      "gender": "M",
      "hasEmail": true,
      "hasPhone": true,
      "validated": true,
      "birthDate": "1965-12-27",
      "addressId": 119292381,
      "householdId": 2505256489,
      "phones": [
        {
          "phone": 7327359081,
          "carrier": "Verizon",
          "addedDate": "2017-06-01",
          "updateDate": "2025-08-14",
          "lastSeenDate": "2021-04-01",
          "phoneType": 0,
          "rankOrder": 1,
          "qualityLevel": 1,
          "activityStatus": "A7",
          "contactabilityScore": "B"
        }
      ],
      "data": {
        "addressType": "Street",
        "incomeLevel": "GT_150K",
        "creditRange": "700 to 749",
        "householdIncome": "$150K to $174K",
        "homeOwnership": "Home Owner",
        "homePrice": 454000,
        "homeValue": 479300,
        "occupationCategory": "Homemaker",
        "maritalStatus": "Married",
        "homeFurnishing": true,
        "homeImprovement": true
      },
      "devices": [
        {"deviceId": "6bf984f50dcb414786e50286c98e3547", "os": "Android"}
      ],
      "behaviors": [
        {"iab": 23, "recency": 27},
        {"iab": 157, "recency": 14}
      ],
      "finances": {
        "discretionaryIncome": "$100K to $149K"
      },
      "properties": [
        {
          "propertyId": 4887672789764,
          "addressId": 102209445,
          "address": "7172 Beth Bath Pike",
          "city": "Bath",
          "state": "PA",
          "zip": "18014",
          "consumerOwned": true,
          "ownerOccupied": true,
          "propertyType": "Single Family Residence",
          "value": 126000,
          "improvementValue": 68200,
          "assessedValue": 63000,
          "yearBuilt": 1922,
          "yearBuiltRange": "1920 to 1929",
          "assessedBuildingSqFt": 2216,
          "rooms": "6",
          "bedrooms": "4",
          "taxYear": 2025,
          "recordedDate": "2015-07-22",
          "saleDate": "2015-07-22",
          "saleAmount": 128500,
          "estimatedValue": 309100
        }
      ]
    }]
  }
}
```

#### Sample Response
```json
{
  "success": true,
  "message": "Identity data saved successfully",
  "phone": "6102991669",
  "workspace_id": "client-acme-corp",
  "identity_id": 141080788,
  "name": "Joseph Kish",
  "records_created": {
    "identity": 1,
    "phones": 1,
    "devices": 1,
    "behaviors": 2,
    "properties": 1
  }
}
```

### Retrieve Identity Data

**How to use this**: When you need to get previously saved data without hitting the Audience Acuity API again

#### Endpoint
```
GET /get-identity/{phone}?workspace_id={workspace_id}
```

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `phone` | string | Yes | Phone number (path parameter) |
| `workspace_id` | string | Yes | Workspace identifier (query parameter) |

#### Sample Request
```bash
# Using custom domain
curl "http://api.enhanced-data.channelautomation.com/get-identity/6102991669?workspace_id=client-acme-corp"

# Alternative (Cloudflare domain)  
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/get-identity/6102991669?workspace_id=client-acme-corp"
```

#### Sample Response
```json
{
  "success": true,
  "identity": {
    "phone": "6102991669",
    "workspace_id": "client-acme-corp",
    "identity_id": 141080788,
    "first_name": "Joseph",
    "last_name": "Kish",
    "address": "175 Forest Rd",
    "city": "Bangor",
    "state": "PA",
    "zip": "18013",
    "created_at": "2025-09-01 22:47:55",
    "updated_at": "2025-09-01T22:47:55.395Z"
  },
  "related_data": {
    "phones": [
      {
        "associated_phone": "7327359081",
        "carrier": "Verizon",
        "activity_status": "A7"
      }
    ],
    "demographic": {
      "income_level": "GT_150K",
      "home_ownership": "Home Owner",
      "marital_status": "Married"
    },
    "devices": [
      {"device_id": "6bf984f50dcb414786e50286c98e3547", "os": "Android"}
    ],
    "behaviors": [
      {"iab_category": 23, "recency": 27},
      {"iab_category": 157, "recency": 14}
    ],
    "properties": [
      {
        "property_address": "7172 Beth Bath Pike",
        "property_city": "Bath",
        "property_value": 126000,
        "year_built": 1922
      }
    ]
  },
  "raw_response": "... full original API response ..."
}
```

---

## API Proxy Endpoints

**Heads up team**: These endpoints require IP whitelisting. I've already handled the authentication part for you, but we still need to whitelist our server IPs with Audience Acuity.

### Phone Lookup
```
GET /phone?phone={phone}&template={template}
```

### Email Lookup  
```
GET /email?email={email}&template={template}
```

### Address Lookup
```
GET /address?address={address}&template={template}
```

#### Sample Proxy Request
```bash
# Using custom domain
curl "http://api.enhanced-data.channelautomation.com/phone?phone=6102991669&template=218923726"

# Alternative (Cloudflare domain)
curl "https://audience-acuity-proxy.curly-king-877d.workers.dev/phone?phone=6102991669&template=218923726"
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing required fields: phone, workspace_id, audience_acuity_data"
}
```

#### 404 Not Found
```json
{
  "error": "Identity not found",
  "phone": "6102991669",
  "workspace_id": "client-acme-corp"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to save identity data",
  "detail": "Database connection error"
}
```

#### 504 Gateway Timeout
```json
{
  "error": "Request timeout after multiple attempts",
  "message": "The API is experiencing high load. Please try again."
}
```

---

## Troubleshooting

### Common Issues I've Already Solved For You

#### 1. **If Token Generation Works But Direct API Calls Fail**
- **What's happening**: Your server's IP isn't whitelisted yet
- **How to fix**: Contact me to add your server's IP to Audience Acuity whitelist
- **Get your IP**: `curl http://api.enhanced-data.channelautomation.com/ip`

#### 2. **If Database Save Fails**
- **What's happening**: You're missing required fields in your request
- **How to fix**: Make sure you include `phone`, `workspace_id`, and `audience_acuity_data`
- **Pro tip**: Use the examples I provided below - they work perfectly

#### 3. **Getting Timeouts?**
- **What's happening**: Audience Acuity has aggressive rate limiting
- **How I fixed it**: I've already added automatic retry logic with exponential backoff
- **What you should do**: Just wait 1-2 seconds between requests to be safe

#### 4. **Can't Find Your Data?**
- **What's happening**: You're using different workspace_id values
- **How to fix**: Use the same workspace_id for save and retrieve operations
- **Example**: If you save with `workspace_id: "client-123"`, retrieve with the same ID

---

## Rate Limits & Best Practices

### Here's What I Recommend

#### Token Generation
- **No limits** - Generate as many as you need, it's instant

#### Database Operations
- **Saving data**: Keep it under 100 requests/minute
- **Reading data**: You can go up to 500 requests/minute

#### Direct API Calls to Audience Acuity
- **Heads up**: Their API is finicky - first 3-5 requests often timeout
- **What I did**: Added automatic retry logic to handle this
- **Your part**: Space requests 1-2 seconds apart

### The Right Way to Use Our System

Here's the workflow I recommend:

```
1. Generate Token    → GET /token
2. Call Direct API   → https://api.audienceacuity.com/v2/identities/byPhone
3. Save Response     → POST /save-identity
4. Later Retrieve    → GET /get-identity/{phone}
```

#### Sample Code for Your Implementation
```javascript
// Here's exactly how to use our API - copy this and modify for your needs
async function lookupAndStore(phone, workspaceId) {
  try {
    // Step 1: Generate token from our system
    const tokenResponse = await fetch('http://api.enhanced-data.channelautomation.com/token');
    const {tokens: {token}} = await tokenResponse.json();
    
    // Step 2: Call Audience Acuity directly with the token
    const apiResponse = await fetch(`https://api.audienceacuity.com/v2/identities/byPhone?phone=${phone}`, {
      headers: {'Authorization': token}
    });
    const data = await apiResponse.json();
    
    // Step 3: Save to our database for future use
    const saveResponse = await fetch('http://api.enhanced-data.channelautomation.com/save-identity', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        phone,
        workspace_id: workspaceId,
        audience_acuity_data: data
      })
    });
    
    return await saveResponse.json();
    
  } catch (error) {
    console.error('API Error:', error);
    // The retry logic is already built into our endpoints
  }
}
```

---

## Database Schema Reference

### How I Structured Our Database

Here's how I organized the data storage:

| Table | What It Stores | Key |
|-------|----------------|-----|
| `identities` | Main person data | `phone + workspace_id` |
| `identity_phones` | All their phone numbers | Auto-increment |
| `identity_data` | Demographics & income | `phone + workspace_id` |
| `identity_devices` | Their devices | Auto-increment |
| `identity_behaviors` | Online behavior (IAB categories) | Auto-increment |
| `identity_properties` | Real estate they own | Auto-increment |

### Workspace Isolation (Important!)

I built this with multi-client support in mind:
- **Each workspace is completely isolated** - No data mixing between clients
- **Use descriptive workspace IDs** so we know what's what
- **You control the workspace_id** - Make it meaningful

Examples I recommend:
- `client-acme-corp` - For client projects
- `project-lead-gen-2025` - For specific campaigns
- `internal-testing` - For our testing

---

## Quick Reference & Support

### System Status Checks

If something seems off, check these endpoints:
- **Health Check**: `GET http://api.enhanced-data.channelautomation.com/health`
- **API Info**: `GET http://api.enhanced-data.channelautomation.com/`

### Our Custom Domain Status

I've set up `api.enhanced-data.channelautomation.com` for us:

- **HTTP**: ✅ Working perfectly (use this)
- **HTTPS**: ⚠️ Will add SSL later if we need it
- **All Features**: ✅ Fully tested and ready
- **Database**: ✅ Saving and retrieving data correctly

### Quick Start for New Team Members

1. **Your first API call** - Try generating a token:
   ```bash
   curl http://api.enhanced-data.channelautomation.com/token
   ```

2. **Save some test data** - Use the examples in this doc

3. **Questions?** - Reach out to me directly

### Need Help?

- **For API issues**: Check the troubleshooting section above
- **For new features**: Let me know what you need
- **For client onboarding**: Use a new workspace_id for each client
- **Documentation**: You're reading it! I'll keep this updated

---

**Built by:** Benjie Malinao  
**For:** Our Internal Team  
**Last Updated:** September 1, 2025  
**Status:** ✅ Production Ready

---

*Remember team: I've already handled the hard parts (authentication, retry logic, database schema). You just need to follow the examples above and you'll be good to go!*
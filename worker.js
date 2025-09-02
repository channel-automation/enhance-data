import md5 from 'blueimp-md5';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Get environment variables (fallback to provided credentials for demo)
      const keyId = env.AA_KEY_ID || 'RtbTYKU0MRMBFDyK';
      const secret = env.AA_SECRET || 'mIyr8FfEfu3BypFWxB8gMfwzF2hdOpqE';
      const origin = env.AA_ORIGIN || 'https://api.audienceacuity.com';
      const db = env.DB; // D1 database binding

      // Generate dynamic Authorization header
      function getAuthorization() {
        const now = Date.now().toString(36);
        const hash = md5(`${now}${secret}`);
        return `Bearer ${keyId}${now}${hash}`;
      }

      // Retry logic for API calls
      async function makeAPICallWithRetry(apiUrl, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Attempt ${attempt}/${maxRetries} for ${apiUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
            
            const response = await fetch(apiUrl, {
              headers: { 
                'Authorization': getAuthorization(),
                'Connection': 'keep-alive'
              },
              signal: controller.signal,
              cf: { 
                resolveOverride: 'api.audienceacuity.com',
                cacheTtl: 0, // Don't cache to avoid stale data
                cacheEverything: false
              }
            });
            
            clearTimeout(timeoutId);
            console.log(`Success on attempt ${attempt}`);
            return response;
            
          } catch (error) {
            lastError = error;
            console.log(`Attempt ${attempt} failed:`, error.message);
            
            // If not the last attempt, wait before retrying
            if (attempt < maxRetries) {
              // Exponential backoff: 1s, 2s, 4s
              const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
              console.log(`Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
        }
        
        // All retries failed
        throw lastError;
      }

      // Route: Get identities by phone
      if (pathname === '/identities/phone' || pathname === '/phone') {
        const phone = url.searchParams.get('phone');
        const template = url.searchParams.get('template') || '218923726';

        // Get our outgoing IP first (debug mode)
        if (url.searchParams.get('debug') === 'ip') {
          const ipResponse = await fetch('https://httpbin.org/ip');
          const ipData = await ipResponse.json();
          return jsonResponse({ 
            message: 'Cloudflare Worker outgoing IP', 
            ip: ipData.origin,
            note: 'Add this IP to your Audience Acuity API whitelist'
          });
        }

        if (!phone) {
          return jsonResponse({ error: 'Missing required phone parameter' }, 400);
        }

        try {
          const apiUrl = `${origin}/v2/identities/byPhone?phone=${encodeURIComponent(phone)}&template=${encodeURIComponent(template)}`;
          const response = await makeAPICallWithRetry(apiUrl);
          const data = await response.json().catch(() => ({}));
          return jsonResponse(data, response.status);
        } catch (error) {
          console.error('Phone lookup error after retries:', error.message);
          return jsonResponse({ 
            error: 'Request failed after multiple attempts',
            message: 'The API is experiencing high load. Please try again.',
            detail: error.message
          }, 504);
        }
      }

      // Route: Get identities by email
      if (pathname === '/identities/email' || pathname === '/email') {
        const email = url.searchParams.get('email');
        const template = url.searchParams.get('template') || '218923726';

        if (!email) {
          return jsonResponse({ error: 'Missing required email parameter' }, 400);
        }

        try {
          const apiUrl = `${origin}/v2/identities/byEmail?email=${encodeURIComponent(email)}&template=${encodeURIComponent(template)}`;
          const response = await makeAPICallWithRetry(apiUrl);
          const data = await response.json().catch(() => ({}));
          return jsonResponse(data, response.status);
        } catch (error) {
          console.error('Email lookup error after retries:', error.message);
          return jsonResponse({ 
            error: 'Request failed after multiple attempts',
            message: 'The API is experiencing high load. Please try again.',
            detail: error.message
          }, 504);
        }
      }

      // Route: Get identities by address
      if (pathname === '/identities/address' || pathname === '/address') {
        const address = url.searchParams.get('address');
        const template = url.searchParams.get('template') || '218923726';

        if (!address) {
          return jsonResponse({ error: 'Missing required address parameter' }, 400);
        }

        try {
          const apiUrl = `${origin}/v2/identities/byAddress?address=${encodeURIComponent(address)}&template=${encodeURIComponent(template)}`;
          const response = await makeAPICallWithRetry(apiUrl);
          const data = await response.json().catch(() => ({}));
          return jsonResponse(data, response.status);
        } catch (error) {
          console.error('Address lookup error after retries:', error.message);
          return jsonResponse({ 
            error: 'Request failed after multiple attempts',
            message: 'The API is experiencing high load. Please try again.',
            detail: error.message
          }, 504);
        }
      }

      // Save Audience Acuity data to D1 database
      if (pathname === '/save-identity' && request.method === 'POST') {
        if (!db) {
          return jsonResponse({ 
            error: 'Database not configured. Please bind D1 database to worker.' 
          }, 500);
        }

        try {
          const body = await request.json();
          const { phone, workspace_id, audience_acuity_data } = body;
          
          if (!phone || !workspace_id || !audience_acuity_data) {
            return jsonResponse({ 
              error: 'Missing required fields: phone, workspace_id, audience_acuity_data' 
            }, 400);
          }

          // Validate phone format (basic)
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length < 10) {
            return jsonResponse({ 
              error: 'Invalid phone number format' 
            }, 400);
          }

          // Extract first identity from Audience Acuity response
          const identities = audience_acuity_data.identities || [];
          if (identities.length === 0) {
            return jsonResponse({ 
              error: 'No identities found in audience_acuity_data' 
            }, 400);
          }

          const identity = identities[0]; // Use first identity
          const now = new Date().toISOString();

          // Insert main identity record
          await db.prepare(`
            INSERT OR REPLACE INTO identities (
              phone, workspace_id, identity_id, first_name, last_name, address, city, state, zip, zip4,
              county_name, latitude, longitude, gender, birth_date, address_id, household_id,
              has_email, has_phone, validated, updated_at, raw_response
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            cleanPhone, workspace_id, identity.id || null, identity.firstName || null, identity.lastName || null,
            identity.address || null, identity.city || null, identity.state || null, identity.zip || null, identity.zip4 || null,
            identity.countyName || null, identity.latitude || null, identity.longitude || null, identity.gender || null,
            identity.birthDate || null, identity.addressId || null, identity.householdId || null,
            identity.hasEmail ? 1 : 0, identity.hasPhone ? 1 : 0, identity.validated ? 1 : 0,
            now, JSON.stringify(audience_acuity_data)
          ).run();

          // Clear existing related data
          await db.prepare('DELETE FROM identity_phones WHERE phone = ? AND workspace_id = ?').bind(cleanPhone, workspace_id).run();
          await db.prepare('DELETE FROM identity_data WHERE phone = ? AND workspace_id = ?').bind(cleanPhone, workspace_id).run();
          await db.prepare('DELETE FROM identity_devices WHERE phone = ? AND workspace_id = ?').bind(cleanPhone, workspace_id).run();
          await db.prepare('DELETE FROM identity_behaviors WHERE phone = ? AND workspace_id = ?').bind(cleanPhone, workspace_id).run();
          await db.prepare('DELETE FROM identity_properties WHERE phone = ? AND workspace_id = ?').bind(cleanPhone, workspace_id).run();

          let recordsCreated = {
            identity: 1,
            phones: 0,
            devices: 0,
            behaviors: 0,
            properties: 0
          };

          // Insert related records
          if (identity.phones) {
            for (const phone of identity.phones) {
              await db.prepare(`
                INSERT INTO identity_phones (
                  phone, workspace_id, associated_phone, carrier, phone_type, added_date,
                  update_date, last_seen_date, rank_order, quality_level, activity_status, contactability_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                cleanPhone, workspace_id, phone.phone?.toString(), phone.carrier, phone.phoneType,
                phone.addedDate, phone.updateDate, phone.lastSeenDate, phone.rankOrder,
                phone.qualityLevel, phone.activityStatus, phone.contactabilityScore
              ).run();
              recordsCreated.phones++;
            }
          }

          if (identity.data) {
            const data = identity.data;
            await db.prepare(`
              INSERT INTO identity_data (
                phone, workspace_id, address_type, income_level, credit_range, household_income,
                home_ownership, home_price, home_value, occupation_category, marital_status,
                home_furnishing, home_improvement, discretionary_income
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              cleanPhone, workspace_id, data.addressType, data.incomeLevel, data.creditRange,
              data.householdIncome, data.homeOwnership, data.homePrice, data.homeValue,
              data.occupationCategory, data.maritalStatus,
              data.homeFurnishing ? 1 : 0, data.homeImprovement ? 1 : 0,
              identity.finances?.discretionaryIncome
            ).run();
          }

          if (identity.devices) {
            for (const device of identity.devices) {
              await db.prepare('INSERT INTO identity_devices (phone, workspace_id, device_id, os) VALUES (?, ?, ?, ?)').bind(
                cleanPhone, workspace_id, device.deviceId, device.os
              ).run();
              recordsCreated.devices++;
            }
          }

          if (identity.behaviors) {
            for (const behavior of identity.behaviors) {
              await db.prepare('INSERT INTO identity_behaviors (phone, workspace_id, iab_category, recency) VALUES (?, ?, ?, ?)').bind(
                cleanPhone, workspace_id, behavior.iab, behavior.recency
              ).run();
              recordsCreated.behaviors++;
            }
          }

          if (identity.properties) {
            for (const property of identity.properties) {
              await db.prepare(`
                INSERT INTO identity_properties (
                  phone, workspace_id, property_id, property_address_id, property_address, property_city,
                  property_state, property_zip, consumer_owned, owner_occupied, property_type, property_value,
                  improvement_value, assessed_value, year_built, year_built_range, building_sqft, rooms,
                  bedrooms, tax_year, recorded_date, sale_date, sale_amount, estimated_value
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                cleanPhone, workspace_id, property.propertyId, property.addressId, property.address,
                property.city, property.state, property.zip, property.consumerOwned ? 1 : 0,
                property.ownerOccupied ? 1 : 0, property.propertyType, property.value,
                property.improvementValue, property.assessedValue, property.yearBuilt,
                property.yearBuiltRange, property.assessedBuildingSqFt || property.buildingSqFt,
                property.rooms, property.bedrooms, property.taxYear, property.recordedDate,
                property.saleDate, property.saleAmount, property.estimatedValue
              ).run();
              recordsCreated.properties++;
            }
          }
          
          return jsonResponse({
            success: true,
            message: 'Identity data saved successfully',
            phone: cleanPhone,
            workspace_id: workspace_id,
            identity_id: identity.id,
            name: `${identity.firstName} ${identity.lastName}`,
            dashboard_link: `${url.origin}/dashboard?phone=${encodeURIComponent(cleanPhone)}&workspace_id=${encodeURIComponent(workspace_id)}`,
            records_created: recordsCreated
          });

        } catch (error) {
          console.error('Database save error:', error);
          return jsonResponse({ 
            error: 'Failed to save identity data',
            detail: error.message
          }, 500);
        }
      }

      // Get identity data from D1 database
      if (pathname.startsWith('/get-identity/') && request.method === 'GET') {
        if (!db) {
          return jsonResponse({ 
            error: 'Database not configured. Please bind D1 database to worker.' 
          }, 500);
        }

        const pathParts = pathname.split('/');
        const phone = pathParts[2];
        const workspace_id = url.searchParams.get('workspace_id');

        if (!phone || !workspace_id) {
          return jsonResponse({ 
            error: 'Missing phone number in path or workspace_id parameter' 
          }, 400);
        }

        try {
          const cleanPhone = phone.replace(/\D/g, '');
          
          // Get main identity
          const identity = await db.prepare(`
            SELECT * FROM identities WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).first();

          if (!identity) {
            return jsonResponse({ 
              error: 'Identity not found',
              phone: cleanPhone,
              workspace_id: workspace_id
            }, 404);
          }

          // Get related data
          const phones = await db.prepare(`
            SELECT * FROM identity_phones WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).all();

          const data = await db.prepare(`
            SELECT * FROM identity_data WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).first();

          const devices = await db.prepare(`
            SELECT * FROM identity_devices WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).all();

          const behaviors = await db.prepare(`
            SELECT * FROM identity_behaviors WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).all();

          const properties = await db.prepare(`
            SELECT * FROM identity_properties WHERE phone = ? AND workspace_id = ?
          `).bind(cleanPhone, workspace_id).all();

          return jsonResponse({
            success: true,
            identity: identity,
            related_data: {
              phones: phones.results || [],
              demographic: data,
              devices: devices.results || [],
              behaviors: behaviors.results || [],
              properties: properties.results || []
            },
            raw_response: identity.raw_response ? JSON.parse(identity.raw_response) : null
          });

        } catch (error) {
          console.error('Database query error:', error);
          return jsonResponse({ 
            error: 'Failed to retrieve identity data',
            detail: error.message
          }, 500);
        }
      }

      // Token generation endpoint
      if (pathname === '/token') {
        const customKeyId = url.searchParams.get('keyId') || keyId;
        const customSecret = url.searchParams.get('secret') || secret;
        const count = parseInt(url.searchParams.get('count') || '1');
        
        if (count > 10) {
          return jsonResponse({ error: 'Count cannot exceed 10' }, 400);
        }
        
        const tokens = [];
        for (let i = 0; i < count; i++) {
          const now = Date.now().toString(36);
          const hash = md5(`${now}${customSecret}`);
          const token = `Bearer ${customKeyId}${now}${hash}`;
          
          tokens.push({
            token,
            generated_at: new Date().toISOString(),
            valid_for: 'Single use within a few seconds',
            components: {
              prefix: 'Bearer',
              keyId: customKeyId,
              timestamp: now,
              hash: hash
            }
          });
          
          // Small delay between token generation to ensure unique timestamps
          if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        return jsonResponse({
          success: true,
          tokens: count === 1 ? tokens[0] : tokens,
          usage: 'Add this token to your Authorization header',
          example: `curl -H "Authorization: ${tokens[0].token}" https://api.audienceacuity.com/v2/identities/byPhone?phone=5551234567`
        });
      }

      // Token info endpoint - explains how tokens work
      if (pathname === '/token-info') {
        const sampleKeyId = 'YOUR_KEY_ID';
        const sampleSecret = 'YOUR_SECRET';
        const sampleNow = Date.now().toString(36);
        const sampleHash = md5(`${sampleNow}${sampleSecret}`);
        
        return jsonResponse({
          description: 'Audience Acuity Bearer Token Generator',
          algorithm: {
            step1: 'Get current timestamp in milliseconds',
            step2: 'Convert timestamp to base36 string',
            step3: 'Concatenate: timestamp_base36 + secret',
            step4: 'Generate MD5 hash of concatenated string',
            step5: 'Combine: Bearer + keyId + timestamp_base36 + hash'
          },
          example: {
            keyId: sampleKeyId,
            secret: sampleSecret,
            timestamp_ms: Date.now(),
            timestamp_base36: sampleNow,
            concatenated: `${sampleNow}${sampleSecret}`,
            md5_hash: sampleHash,
            final_token: `Bearer ${sampleKeyId}${sampleNow}${sampleHash}`
          },
          endpoints: [
            'GET /token - Generate a fresh Bearer token',
            'GET /token?count=5 - Generate multiple tokens',
            'GET /token?keyId=XXX&secret=YYY - Use custom credentials'
          ],
          important_notes: [
            'Tokens are single-use and time-sensitive',
            'Must be used within seconds of generation',
            'Each API call needs a fresh token'
          ]
        });
      }

      // Token validation endpoint
      if (pathname === '/token-validate') {
        const token = url.searchParams.get('token') || request.headers.get('Authorization');
        
        if (!token) {
          return jsonResponse({ 
            error: 'Missing token parameter or Authorization header' 
          }, 400);
        }
        
        // Parse the token
        const tokenMatch = token.match(/^Bearer (.+)$/);
        if (!tokenMatch) {
          return jsonResponse({ 
            valid: false,
            error: 'Token must start with "Bearer "' 
          }, 400);
        }
        
        const tokenBody = tokenMatch[1];
        
        // Try to extract components (this is a simple validation)
        // Real validation would need to know the keyId length
        const validation = {
          format_valid: tokenBody.length > 40, // Rough estimate
          has_bearer_prefix: token.startsWith('Bearer '),
          approximate_structure: {
            looks_like_keyid: tokenBody.substring(0, 16),
            looks_like_timestamp: tokenBody.substring(16, 24),
            looks_like_hash: tokenBody.substring(24)
          },
          note: 'This is a format check only. Real validation requires the API server.'
        };
        
        return jsonResponse({
          token_received: token,
          validation,
          valid: validation.format_valid && validation.has_bearer_prefix
        });
      }

      // Dashboard endpoint
      if (pathname === '/dashboard') {
        const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Data Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 30px; border-radius: 20px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; }
        .header h1 { color: #333; font-size: 2.5em; margin-bottom: 10px; }
        .header p { color: #666; font-size: 1.1em; }
        .search-section { background: white; padding: 25px; border-radius: 15px; margin-bottom: 30px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
        .search-form { display: flex; gap: 15px; flex-wrap: wrap; align-items: end; }
        .form-group { flex: 1; min-width: 200px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
        .form-group input:focus { outline: none; border-color: #667eea; }
        .search-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 12px 25px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
        .search-btn:hover { transform: translateY(-2px); }
        .loading { text-align: center; padding: 40px; color: white; font-size: 18px; }
        .error { background: #fee; color: #c33; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #fcc; }
        .identity-card { background: white; border-radius: 15px; padding: 30px; margin-bottom: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .identity-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #f0f0f0; }
        .identity-name { font-size: 2em; color: #333; font-weight: 700; }
        .identity-id { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9em; font-weight: 600; }
        .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
        .data-section { background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #667eea; }
        .data-section h3 { color: #333; margin-bottom: 15px; font-size: 1.3em; display: flex; align-items: center; gap: 10px; }
        .icon { font-size: 1.2em; }
        .data-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .data-item:last-child { border-bottom: none; }
        .data-label { font-weight: 600; color: #495057; }
        .data-value { color: #333; text-align: right; max-width: 60%; word-wrap: break-word; }
        .list-item { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e9ecef; }
        .workspace-badge { display: inline-block; background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 600; margin-left: 10px; }
        .raw-data { background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 14px; overflow-x: auto; max-height: 400px; overflow-y: auto; }
        .toggle-btn { background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px; }
        @media (max-width: 768px) { .search-form { flex-direction: column; } .identity-header { flex-direction: column; gap: 15px; text-align: center; } .data-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Enhanced Data Dashboard</h1>
            <p>Visualize and explore enhanced identity data from your D1 database</p>
        </div>
        <div class="search-section">
            <div class="search-form">
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="text" id="phone" placeholder="e.g., 6102991669" />
                </div>
                <div class="form-group">
                    <label for="workspace">Workspace ID</label>
                    <input type="text" id="workspace" placeholder="e.g., 5648" />
                </div>
                <button class="search-btn" onclick="fetchIdentityData()">🔍 Search</button>
            </div>
        </div>
        <div id="results"></div>
    </div>
    <script>
        const API_BASE = window.location.origin;
        async function fetchIdentityData() {
            const phone = document.getElementById('phone').value.trim();
            const workspace = document.getElementById('workspace').value.trim();
            const resultsDiv = document.getElementById('results');
            if (!phone || !workspace) {
                resultsDiv.innerHTML = '<div class="error">Please enter both phone number and workspace ID</div>';
                return;
            }
            resultsDiv.innerHTML = '<div class="loading">🔄 Fetching data...</div>';
            try {
                const response = await fetch(API_BASE + '/get-identity/' + phone + '?workspace_id=' + workspace);
                const data = await response.json();
                if (data.success) {
                    displayIdentityData(data);
                } else {
                    resultsDiv.innerHTML = '<div class="error">❌ ' + (data.error || 'Identity not found') + '</div>';
                }
            } catch (error) {
                resultsDiv.innerHTML = '<div class="error">❌ Error fetching data: ' + error.message + '</div>';
            }
        }
        function displayIdentityData(data) {
            const identity = data.identity;
            const related = data.related_data;
            let html = '<div class="identity-card">';
            html += '<div class="identity-header">';
            html += '<div><div class="identity-name">👤 ' + identity.first_name + ' ' + identity.last_name + '</div>';
            html += '<div style="color: #666; margin-top: 5px;">📱 ' + identity.phone + ' <span class="workspace-badge">Workspace: ' + identity.workspace_id + '</span></div></div>';
            html += '<div class="identity-id">ID: ' + identity.identity_id + '</div></div>';
            html += '<div class="data-grid">';
            html += '<div class="data-section"><h3><span class="icon">🏠</span> Address & Location</h3>';
            html += '<div class="data-item"><span class="data-label">Address:</span><span class="data-value">' + identity.address + '</span></div>';
            html += '<div class="data-item"><span class="data-label">City:</span><span class="data-value">' + identity.city + ', ' + identity.state + '</span></div>';
            html += '<div class="data-item"><span class="data-label">ZIP:</span><span class="data-value">' + identity.zip + '-' + identity.zip4 + '</span></div>';
            html += '<div class="data-item"><span class="data-label">County:</span><span class="data-value">' + identity.county_name + '</span></div>';
            html += '<div class="data-item"><span class="data-label">Coordinates:</span><span class="data-value">' + identity.latitude + ', ' + identity.longitude + '</span></div>';
            html += '</div>';
            html += '<div class="data-section"><h3><span class="icon">👨‍👩‍👧‍👦</span> Personal Details</h3>';
            html += '<div class="data-item"><span class="data-label">Gender:</span><span class="data-value">' + (identity.gender === 'M' ? 'Male' : 'Female') + '</span></div>';
            html += '<div class="data-item"><span class="data-label">Birth Date:</span><span class="data-value">' + identity.birth_date + '</span></div>';
            html += '<div class="data-item"><span class="data-label">Has Email:</span><span class="data-value">' + (identity.has_email ? '✅ Yes' : '❌ No') + '</span></div>';
            html += '<div class="data-item"><span class="data-label">Validated:</span><span class="data-value">' + (identity.validated ? '✅ Yes' : '❌ No') + '</span></div>';
            html += '</div>';
            if (related.demographic) {
                html += '<div class="data-section"><h3><span class="icon">💰</span> Demographics & Finance</h3>';
                html += '<div class="data-item"><span class="data-label">Income Level:</span><span class="data-value">' + related.demographic.income_level + '</span></div>';
                html += '<div class="data-item"><span class="data-label">Household Income:</span><span class="data-value">' + related.demographic.household_income + '</span></div>';
                html += '<div class="data-item"><span class="data-label">Home Ownership:</span><span class="data-value">' + related.demographic.home_ownership + '</span></div>';
                html += '<div class="data-item"><span class="data-label">Marital Status:</span><span class="data-value">' + related.demographic.marital_status + '</span></div>';
                html += '</div>';
            }
            
            // Add Phone Numbers section
            if (related.phones && related.phones.length > 0) {
                html += '<div class="data-section"><h3><span class="icon">📱</span> Phone Numbers (' + related.phones.length + ')</h3>';
                for (let i = 0; i < related.phones.length; i++) {
                    const phone = related.phones[i];
                    html += '<div class="list-item">';
                    html += '<div class="data-item"><span class="data-label">Phone:</span><span class="data-value">' + phone.associated_phone + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Carrier:</span><span class="data-value">' + phone.carrier + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Status:</span><span class="data-value">' + phone.activity_status + ' (' + phone.contactability_score + ')</span></div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            // Add Devices section  
            if (related.devices && related.devices.length > 0) {
                html += '<div class="data-section"><h3><span class="icon">📱</span> Devices (' + related.devices.length + ')</h3>';
                for (let i = 0; i < related.devices.length; i++) {
                    const device = related.devices[i];
                    html += '<div class="list-item">';
                    html += '<div class="data-item"><span class="data-label">OS:</span><span class="data-value">' + device.os + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Device ID:</span><span class="data-value">' + device.device_id.substring(0, 16) + '...</span></div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            // Add Behaviors section
            if (related.behaviors && related.behaviors.length > 0) {
                html += '<div class="data-section"><h3><span class="icon">🎯</span> Behaviors (' + related.behaviors.length + ')</h3>';
                for (let i = 0; i < related.behaviors.length; i++) {
                    const behavior = related.behaviors[i];
                    html += '<div class="list-item">';
                    html += '<div class="data-item"><span class="data-label">IAB Category:</span><span class="data-value">' + behavior.iab_category + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Recency:</span><span class="data-value">' + behavior.recency + ' days</span></div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            // Add Properties section
            if (related.properties && related.properties.length > 0) {
                html += '<div class="data-section"><h3><span class="icon">🏡</span> Properties (' + related.properties.length + ')</h3>';
                for (let i = 0; i < related.properties.length; i++) {
                    const property = related.properties[i];
                    html += '<div class="list-item">';
                    html += '<div class="data-item"><span class="data-label">Address:</span><span class="data-value">' + property.property_address + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">City:</span><span class="data-value">' + property.property_city + ', ' + property.property_state + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Type:</span><span class="data-value">' + property.property_type + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Value:</span><span class="data-value">$' + (property.property_value ? property.property_value.toLocaleString() : '0') + '</span></div>';
                    html += '<div class="data-item"><span class="data-label">Year Built:</span><span class="data-value">' + property.year_built + ' (' + property.year_built_range + ')</span></div>';
                    html += '<div class="data-item"><span class="data-label">Bedrooms:</span><span class="data-value">' + property.bedrooms + '</span></div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
            html += '<div class="data-section" style="margin-top: 30px;"><h3><span class="icon">📄</span> Raw API Response</h3>';
            html += '<button class="toggle-btn" onclick="toggleRawData()">Show/Hide Raw Data</button>';
            html += '<div id="raw-data" class="raw-data" style="display: none; margin-top: 15px;"><pre>' + JSON.stringify(data.raw_response, null, 2) + '</pre></div>';
            html += '</div>';
            html += '<div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #f0f0f0; color: #666; text-align: center;">';
            html += '<small>Created: ' + identity.created_at + ' | Updated: ' + identity.updated_at + '</small></div>';
            html += '</div>';
            document.getElementById('results').innerHTML = html;
        }
        function toggleRawData() {
            const rawData = document.getElementById('raw-data');
            rawData.style.display = rawData.style.display === 'none' ? 'block' : 'none';
        }
        window.onload = function() {
            const urlParams = new URLSearchParams(window.location.search);
            const phoneParam = urlParams.get('phone');
            const workspaceParam = urlParams.get('workspace_id');
            
            if (phoneParam && workspaceParam) {
                document.getElementById('phone').value = phoneParam;
                document.getElementById('workspace').value = workspaceParam;
                // Auto-fetch data if URL parameters are provided
                setTimeout(fetchIdentityData, 500);
            } else {
                // Default test data
                document.getElementById('phone').value = '6102991669';
                document.getElementById('workspace').value = '5648';
            }
        };
    </script>
</body>
</html>`;
        return new Response(dashboardHTML, {
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Health check endpoint
      if (pathname === '/health') {
        return jsonResponse({ 
          status: 'healthy', 
          timestamp: new Date().toISOString()
        });
      }

      // MySQL Proxy Endpoints
      const MYSQL_API_URL = env.MYSQL_API_URL || 'http://localhost:3002';
      
      // Proxy to MySQL API - List all tables
      if (pathname === '/mysql/tables') {
        try {
          const response = await fetch(`${MYSQL_API_URL}/api/tables`);
          const data = await response.json();
          return jsonResponse(data);
        } catch (error) {
          return jsonResponse({ 
            error: 'Failed to fetch tables from MySQL', 
            detail: error.message 
          }, 500);
        }
      }

      // Proxy to MySQL API - Get table schema
      if (pathname.startsWith('/mysql/tables/') && pathname.endsWith('/schema')) {
        const tableName = pathname.split('/')[3];
        try {
          const response = await fetch(`${MYSQL_API_URL}/api/tables/${tableName}/schema`);
          const data = await response.json();
          return jsonResponse(data);
        } catch (error) {
          return jsonResponse({ 
            error: `Failed to fetch schema for table ${tableName}`, 
            detail: error.message 
          }, 500);
        }
      }

      // Proxy to MySQL API - Get data from any table
      if (pathname.startsWith('/mysql/data/')) {
        const tableName = pathname.replace('/mysql/data/', '');
        const queryString = url.search;
        try {
          const response = await fetch(`${MYSQL_API_URL}/api/data/${tableName}${queryString}`);
          const data = await response.json();
          return jsonResponse(data);
        } catch (error) {
          return jsonResponse({ 
            error: `Failed to fetch data from table ${tableName}`, 
            detail: error.message 
          }, 500);
        }
      }

      // Proxy to MySQL API - Bot users endpoint
      if (pathname === '/mysql/bot-users') {
        const queryString = url.search;
        try {
          const response = await fetch(`${MYSQL_API_URL}/api/bot-users${queryString}`);
          const data = await response.json();
          return jsonResponse(data);
        } catch (error) {
          return jsonResponse({ 
            error: 'Failed to fetch bot users from MySQL', 
            detail: error.message 
          }, 500);
        }
      }

      // Proxy to MySQL API - Custom query endpoint
      if (pathname === '/mysql/query' && request.method === 'POST') {
        try {
          const body = await request.json();
          const response = await fetch(`${MYSQL_API_URL}/api/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await response.json();
          return jsonResponse(data);
        } catch (error) {
          return jsonResponse({ 
            error: 'Failed to execute query on MySQL', 
            detail: error.message 
          }, 500);
        }
      }

      // Default route - API info
      if (pathname === '/' || pathname === '/info') {
        return jsonResponse({
          message: 'Audience Acuity API Proxy, Token Generator & D1 Database',
          token_endpoints: [
            'GET /token - Generate a fresh Bearer token',
            'GET /token?count=5 - Generate multiple tokens (max 10)',
            'GET /token?keyId=XXX&secret=YYY - Use custom credentials',
            'GET /token-info - Learn how tokens are generated',
            'GET /token-validate?token=XXX - Validate token format'
          ],
          database_endpoints: [
            'POST /save-identity - Save Audience Acuity data to D1',
            'GET /get-identity/{phone}?workspace_id=XXX - Retrieve saved identity',
          ],
          mysql_endpoints: [
            'GET /mysql/tables - List all MySQL tables',
            'GET /mysql/tables/{tableName}/schema - Get table schema',
            'GET /mysql/data/{tableName} - Get data from any table (supports pagination)',
            'GET /mysql/bot-users - Get bot users with filtering',
            'POST /mysql/query - Execute custom SELECT query'
          ],
          dashboard: [
            'GET /dashboard - Interactive data visualization dashboard'
          ],
          proxy_endpoints: [
            'GET /phone?phone=15551234567&template=218923726',
            'GET /email?email=example@gmail.com&template=218923726',
            'GET /address?address=123 Main St&template=218923726',
            'GET /health - Health check'
          ],
          database_schema: {
            primary_key: 'phone + workspace_id',
            isolation: 'Data isolated by workspace_id',
            tables: ['identities', 'identity_phones', 'identity_data', 'identity_devices', 'identity_behaviors', 'identity_properties']
          },
          features: [
            'Bearer token generation for any API client',
            'D1 database storage with workspace isolation',
            'Complete Audience Acuity data parsing & storage',
            'Automatic retry with exponential backoff',
            'Handles API rate limiting gracefully'
          ],
          note: 'Token & DB endpoints work globally. Proxy endpoints require IP whitelisting.'
        });
      }

      // 404 for unknown routes
      return jsonResponse({ error: 'Route not found' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ 
        error: 'Internal server error', 
        detail: err.message 
      }, 500);
    }
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
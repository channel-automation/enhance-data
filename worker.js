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

      // Health check endpoint
      if (pathname === '/health') {
        return jsonResponse({ 
          status: 'healthy', 
          timestamp: new Date().toISOString()
        });
      }

      // Default route - API info
      if (pathname === '/' || pathname === '/info') {
        return jsonResponse({
          message: 'Audience Acuity API Proxy (v2 with retry logic)',
          endpoints: [
            'GET /phone?phone=15551234567&template=218923726',
            'GET /email?email=example@gmail.com&template=218923726',
            'GET /address?address=123 Main St&template=218923726',
            'GET /health - Health check'
          ],
          features: [
            'Automatic retry with exponential backoff',
            'Handles API rate limiting gracefully',
            'Optimized for Cloudflare Workers'
          ],
          note: 'This proxy handles the dynamic Bearer token authentication automatically'
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
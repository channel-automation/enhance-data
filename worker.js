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

      // Route: Get identities by phone
      if (pathname === '/identities/phone' || pathname === '/phone') {
        const phone = url.searchParams.get('phone');
        const template = url.searchParams.get('template') || '218923726';

        // Get our outgoing IP first
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

        const apiUrl = `${origin}/v2/identities/byPhone?phone=${encodeURIComponent(phone)}&template=${encodeURIComponent(template)}`;
        
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': getAuthorization() },
          cf: { resolveOverride: 'api.audienceacuity.com' }
        });

        const data = await response.json().catch(() => ({}));
        return jsonResponse(data, response.status);
      }

      // Route: Get identities by email
      if (pathname === '/identities/email' || pathname === '/email') {
        const email = url.searchParams.get('email');
        const template = url.searchParams.get('template') || '218923726';

        if (!email) {
          return jsonResponse({ error: 'Missing required email parameter' }, 400);
        }

        const apiUrl = `${origin}/v2/identities/byEmail?email=${encodeURIComponent(email)}&template=${encodeURIComponent(template)}`;
        
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': getAuthorization() },
          cf: { resolveOverride: 'api.audienceacuity.com' }
        });

        const data = await response.json().catch(() => ({}));
        return jsonResponse(data, response.status);
      }

      // Route: Get identities by address
      if (pathname === '/identities/address' || pathname === '/address') {
        const address = url.searchParams.get('address');
        const template = url.searchParams.get('template') || '218923726';

        if (!address) {
          return jsonResponse({ error: 'Missing required address parameter' }, 400);
        }

        const apiUrl = `${origin}/v2/identities/byAddress?address=${encodeURIComponent(address)}&template=${encodeURIComponent(template)}`;
        
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': getAuthorization() },
          cf: { resolveOverride: 'api.audienceacuity.com' }
        });

        const data = await response.json().catch(() => ({}));
        return jsonResponse(data, response.status);
      }

      // Default route - API info
      if (pathname === '/' || pathname === '/info') {
        return jsonResponse({
          message: 'Audience Acuity API Proxy',
          endpoints: [
            'GET /phone?phone=15551234567&template=218923726',
            'GET /email?email=example@gmail.com&template=218923726',
            'GET /address?address=123 Main St&template=218923726'
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
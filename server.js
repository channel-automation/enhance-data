const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Configuration
const config = {
  keyId: process.env.AA_KEY_ID || 'RtbTYKU0MRMBFDyK',
  secret: process.env.AA_SECRET || 'mIyr8FfEfu3BypFWxB8gMfwzF2hdOpqE',
  origin: process.env.AA_ORIGIN || 'https://api.audienceacuity.com'
};

// Create axios instance with keep-alive
const axiosInstance = axios.create({
  httpAgent: new (require('http').Agent)({ keepAlive: true }),
  httpsAgent: new (require('https').Agent)({ keepAlive: true }),
  timeout: 6000, // 6 second timeout per attempt
});

// Generate dynamic Authorization header
function getAuthorization() {
  const now = Date.now().toString(36);
  const hash = crypto.createHash('md5').update(now + config.secret).digest('hex');
  return `Bearer ${config.keyId}${now}${hash}`;
}

// Retry logic for API calls
async function makeAPICallWithRetry(url, params, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);
      
      const response = await axiosInstance.get(url, {
        params,
        headers: { 
          'Authorization': getAuthorization(),
          'Connection': 'keep-alive'
        }
      });
      
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
app.get('/phone', async (req, res) => {
  try {
    const { phone, template = '218923726' } = req.query;

    if (!phone) {
      return res.status(400).json({ error: 'Missing required phone parameter' });
    }

    const apiUrl = `${config.origin}/v2/identities/byPhone`;
    const params = { phone, template };

    const response = await makeAPICallWithRetry(apiUrl, params);
    res.json(response.data);
    
  } catch (error) {
    console.error('Phone lookup error after retries:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Request timeout after multiple attempts',
        message: 'The API is experiencing high load. Please try again.'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error', 
        detail: error.message 
      });
    }
  }
});

// Route: Get identities by email
app.get('/email', async (req, res) => {
  try {
    const { email, template = '218923726' } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Missing required email parameter' });
    }

    const apiUrl = `${config.origin}/v2/identities/byEmail`;
    const params = { email, template };

    const response = await makeAPICallWithRetry(apiUrl, params);
    res.json(response.data);
    
  } catch (error) {
    console.error('Email lookup error after retries:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Request timeout after multiple attempts',
        message: 'The API is experiencing high load. Please try again.'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error', 
        detail: error.message 
      });
    }
  }
});

// Route: Get identities by address
app.get('/address', async (req, res) => {
  try {
    const { address, template = '218923726' } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Missing required address parameter' });
    }

    const apiUrl = `${config.origin}/v2/identities/byAddress`;
    const params = { address, template };

    const response = await makeAPICallWithRetry(apiUrl, params);
    res.json(response.data);
    
  } catch (error) {
    console.error('Address lookup error after retries:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Request timeout after multiple attempts',
        message: 'The API is experiencing high load. Please try again.'
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error', 
        detail: error.message 
      });
    }
  }
});

// Route: Get server's outgoing IP
app.get('/ip', async (req, res) => {
  try {
    const response = await axios.get('https://httpbin.org/ip');
    res.json({
      message: 'Railway server outgoing IP',
      ip: response.data.origin,
      note: 'Add this IP to your Audience Acuity API whitelist'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get IP address' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Default route - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Audience Acuity API Proxy (v2 with retry logic)',
    endpoints: [
      'GET /phone?phone=15551234567&template=218923726',
      'GET /email?email=example@gmail.com&template=218923726',
      'GET /address?address=123 Main St&template=218923726',
      'GET /ip - Get server outgoing IP for whitelisting',
      'GET /health - Health check'
    ],
    features: [
      'Automatic retry with exponential backoff',
      'Connection keep-alive for better performance',
      'Handles API rate limiting gracefully'
    ],
    note: 'This proxy handles the dynamic Bearer token authentication automatically'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using API Key: ${config.keyId}`);
  console.log('Features: Retry logic, Connection pooling, Exponential backoff');
});
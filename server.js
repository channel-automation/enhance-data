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
  keyId: process.env.AA_KEY_ID || 'bmq5wd7LiBfRzXGu',
  secret: process.env.AA_SECRET || 'KHhBHY9dbnA9WZexjRaVeIAp5nn7GFpb',
  origin: process.env.AA_ORIGIN || 'https://api.audienceacuity.com'
};

// Generate dynamic Authorization header
function getAuthorization() {
  const now = Date.now().toString(36);
  const hash = crypto.createHash('md5').update(now + config.secret).digest('hex');
  return `Bearer ${config.keyId}${now}${hash}`;
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

    const response = await axios.get(apiUrl, {
      params,
      headers: { 
        'Authorization': getAuthorization()
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Phone lookup error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Internal server error', detail: error.message });
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

    const response = await axios.get(apiUrl, {
      params,
      headers: { 
        'Authorization': getAuthorization()
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Email lookup error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Internal server error', detail: error.message });
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

    const response = await axios.get(apiUrl, {
      params,
      headers: { 
        'Authorization': getAuthorization()
      },
      timeout: 30000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Address lookup error:', error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Internal server error', detail: error.message });
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

// Default route - API info
app.get('/', (req, res) => {
  res.json({
    message: 'Audience Acuity API Proxy',
    endpoints: [
      'GET /phone?phone=15551234567&template=218923726',
      'GET /email?email=example@gmail.com&template=218923726',
      'GET /address?address=123 Main St&template=218923726',
      'GET /ip - Get server outgoing IP for whitelisting'
    ],
    note: 'This proxy handles the dynamic Bearer token authentication automatically'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using API Key: ${config.keyId}`);
});
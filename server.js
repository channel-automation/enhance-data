const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

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

// ============================================
// MYSQL API ENDPOINTS
// ============================================

// MySQL connection pool configuration
const poolConfig = {
  host: process.env.MYSQL_HOST || '5.161.181.95',
  port: process.env.MYSQL_PORT || 3307,
  user: process.env.MYSQL_USER || 'chau_96323',
  password: process.env.MYSQL_PASSWORD || 'eipoPhohphi3fo3doh5hahM2kie8of',
  database: process.env.MYSQL_DATABASE || 'chau_96323',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

// Initialize connection pool
async function initializePool() {
  try {
    pool = mysql.createPool(poolConfig);
    console.log('MySQL connection pool initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize MySQL pool:', error);
    return false;
  }
}

// MySQL API Routes
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as status');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    res.json({ success: true, tables: tableNames });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tables/:tableName/schema', async (req, res) => {
  const { tableName } = req.params;
  try {
    const [columns] = await pool.execute(`DESCRIBE \`${tableName}\``);
    res.json({ success: true, table: tableName, schema: columns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/data/:tableName', async (req, res) => {
  const { tableName } = req.params;
  const { 
    limit = 100, 
    offset = 0, 
    orderBy = null,
    orderDir = 'ASC',
    ...filters 
  } = req.query;

  try {
    // Build WHERE clause from query parameters
    let whereClause = '';
    const whereParams = [];
    
    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [key, value] of Object.entries(filters)) {
        conditions.push(`\`${key}\` = ?`);
        whereParams.push(value);
      }
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Build ORDER BY clause
    let orderClause = '';
    if (orderBy) {
      orderClause = `ORDER BY \`${orderBy}\` ${orderDir === 'DESC' ? 'DESC' : 'ASC'}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\` ${whereClause}`;
    const [countResult] = whereParams.length > 0 
      ? await pool.execute(countQuery, whereParams)
      : await pool.query(countQuery);
    const totalCount = countResult[0].total;

    // Get paginated data
    const dataQuery = `
      SELECT * FROM \`${tableName}\` 
      ${whereClause} 
      ${orderClause} 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;
    const [rows] = whereParams.length > 0
      ? await pool.execute(dataQuery.replace(`LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`, 'LIMIT ? OFFSET ?'), [...whereParams, parseInt(limit), parseInt(offset)])
      : await pool.query(dataQuery);

    res.json({
      success: true,
      table: tableName,
      data: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/bot-users', async (req, res) => {
  const { 
    limit = 100, 
    offset = 0,
    user_id,
    phone,
    email
  } = req.query;

  try {
    let whereClause = '';
    const whereParams = [];

    // Build dynamic WHERE clause
    const conditions = [];
    if (user_id) {
      conditions.push('user_id = ?');
      whereParams.push(user_id);
    }
    if (phone) {
      conditions.push('phone LIKE ?');
      whereParams.push(`%${phone}%`);
    }
    if (email) {
      conditions.push('email LIKE ?');
      whereParams.push(`%${email}%`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM bot_users ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, whereParams);
    const totalCount = countResult[0].total;

    // Get data
    const query = `
      SELECT * FROM bot_users 
      ${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.execute(query, [...whereParams, parseInt(limit), parseInt(offset)]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + rows.length < totalCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/query', async (req, res) => {
  const { query, params = [] } = req.body;

  // Only allow SELECT queries for safety
  if (!query || !query.trim().toUpperCase().startsWith('SELECT')) {
    return res.status(400).json({ 
      success: false, 
      error: 'Only SELECT queries are allowed' 
    });
  }

  try {
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server with MySQL initialization
async function startServer() {
  const initialized = await initializePool();
  if (!initialized) {
    console.error('Failed to initialize MySQL connection. Starting without MySQL...');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using API Key: ${config.keyId}`);
    console.log('Features: Retry logic, Connection pooling, Exponential backoff');
    if (initialized) {
      console.log('\n=== MySQL API Endpoints Available ===');
      console.log('  GET  /api/tables - List all tables');
      console.log('  GET  /api/tables/:table/schema - Get table schema');
      console.log('  GET  /api/data/:table - Get table data');
      console.log('  GET  /api/bot-users - Get bot users');
      console.log('  POST /api/query - Execute SELECT query');
      console.log('  GET  /api/health - MySQL health check');
    }
  });
}

startServer();
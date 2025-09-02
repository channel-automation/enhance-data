const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as status');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Get all tables
app.get('/api/tables', async (req, res) => {
  try {
    const [tables] = await pool.execute('SHOW TABLES');
    const tableNames = tables.map(table => Object.values(table)[0]);
    res.json({ success: true, tables: tableNames });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get table schema
app.get('/api/tables/:tableName/schema', async (req, res) => {
  const { tableName } = req.params;
  try {
    const [columns] = await pool.execute(`DESCRIBE \`${tableName}\``);
    res.json({ success: true, table: tableName, schema: columns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generic GET endpoint for any table with pagination and filtering
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

// Specific endpoint for bot_users table
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

// Custom query endpoint (be careful with this in production!)
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

// Start server
async function startServer() {
  const initialized = await initializePool();
  if (!initialized) {
    console.error('Failed to initialize database connection');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`MySQL API server running on http://localhost:${PORT}`);
    console.log('\nAvailable endpoints:');
    console.log(`  GET  /health - Health check`);
    console.log(`  GET  /api/tables - List all tables`);
    console.log(`  GET  /api/tables/:tableName/schema - Get table schema`);
    console.log(`  GET  /api/data/:tableName - Get data from any table`);
    console.log(`  GET  /api/bot-users - Get bot users with filtering`);
    console.log(`  POST /api/query - Execute custom SELECT query`);
  });
}

startServer();
const mysql = require('mysql2/promise');

async function testConnection() {
  const config = {
    host: '5.161.181.95',
    port: 3307,
    user: 'chau_96323',
    password: 'eipoPhohphi3fo3doh5hahM2kie8of',
    database: 'chau_96323',
    connectTimeout: 10000
  };

  console.log('Testing MySQL connection...');
  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('User:', config.user);
  console.log('Database:', config.database);

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Connected successfully!');

    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful:', rows);

    // Get list of tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\nAvailable tables:');
    tables.forEach(table => {
      console.log('  -', Object.values(table)[0]);
    });

    await connection.end();
    console.log('\n✅ Connection closed successfully');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    return false;
  }
}

testConnection();
const { spawn } = require('child_process');

// Start both servers
console.log('Starting Audience Acuity Proxy Server and MySQL API Server...');

// Start the original server.js on PORT (default 3001)
const server1 = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Start mysql-endpoint.js on a different port
const server2 = spawn('node', ['mysql-endpoint.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.MYSQL_PORT || '3002' }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server1.kill('SIGTERM');
  server2.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  server1.kill('SIGINT');
  server2.kill('SIGINT');
  process.exit(0);
});

server1.on('exit', (code) => {
  console.log(`Server 1 exited with code ${code}`);
  server2.kill('SIGTERM');
  process.exit(code);
});

server2.on('exit', (code) => {
  console.log(`Server 2 exited with code ${code}`);
  server1.kill('SIGTERM');
  process.exit(code);
});
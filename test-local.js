const axios = require('axios');

// Test configuration
const LOCAL_PORT = 3001;
const PHONE_NUMBER = '6102991669';

async function testEndpoint(url, name) {
  console.log(`\n=== Testing ${name} ===`);
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout for the entire retry sequence
      validateStatus: () => true // Accept any status code
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (response.status === 200) {
      console.log(`✅ SUCCESS in ${duration}s`);
      console.log(`Found: ${response.data.identities ? response.data.identities.length : 0} identities`);
      if (response.data.identities && response.data.identities[0]) {
        const identity = response.data.identities[0];
        console.log(`Name: ${identity.firstName} ${identity.lastName}`);
        console.log(`Location: ${identity.city}, ${identity.state}`);
      }
    } else if (response.status === 504) {
      console.log(`⏱️ TIMEOUT after ${duration}s - All retry attempts failed`);
      console.log(`Message: ${response.data.message || response.data.error}`);
    } else {
      console.log(`❌ ERROR ${response.status} in ${duration}s`);
      console.log(`Error: ${JSON.stringify(response.data)}`);
    }
    
    return { status: response.status, duration };
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`❌ REQUEST FAILED in ${duration}s`);
    console.log(`Error: ${error.message}`);
    return { status: 0, duration };
  }
}

async function runTests() {
  console.log('Starting local server tests with retry logic...');
  console.log('Testing phone number:', PHONE_NUMBER);
  console.log('Server should retry up to 3 times with exponential backoff\n');
  
  // Test the phone endpoint multiple times
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\n========== TEST RUN ${i}/5 ==========`);
    
    const result = await testEndpoint(
      `http://localhost:${LOCAL_PORT}/phone?phone=${PHONE_NUMBER}`,
      'Phone Endpoint'
    );
    
    results.push(result);
    
    // Wait 2 seconds between tests
    if (i < 5) {
      console.log('\nWaiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n========== SUMMARY ==========');
  const successful = results.filter(r => r.status === 200).length;
  const failed = results.filter(r => r.status !== 200).length;
  const avgDuration = (results.reduce((sum, r) => sum + parseFloat(r.duration), 0) / results.length).toFixed(2);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful} (${(successful/results.length*100).toFixed(0)}%)`);
  console.log(`Failed: ${failed} (${(failed/results.length*100).toFixed(0)}%)`);
  console.log(`Average duration: ${avgDuration}s`);
  
  // Show retry behavior
  console.log('\n========== RETRY BEHAVIOR ==========');
  console.log('The server will:');
  console.log('1. Try the initial request (6s timeout)');
  console.log('2. If failed, wait 1s and retry');
  console.log('3. If failed again, wait 2s and retry');
  console.log('4. If failed again, wait 4s and make final attempt');
  console.log('5. Total max time: ~19s (6s + 1s + 6s + 2s + 6s + 4s + 6s)');
}

// Check if server is running
axios.get(`http://localhost:${LOCAL_PORT}/health`)
  .then(() => {
    console.log(`✅ Server is running on port ${LOCAL_PORT}`);
    runTests();
  })
  .catch(() => {
    console.log(`❌ Server is not running on port ${LOCAL_PORT}`);
    console.log(`Please start the server first with: node server.js`);
    console.log(`Then run this test with: node test-local.js`);
  });
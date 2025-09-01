const crypto = require('crypto');
const https = require('https');

const keyId = 'RtbTYKU0MRMBFDyK';
const secret = 'mIyr8FfEfu3BypFWxB8gMfwzF2hdOpqE';

function getAuthorization() {
  const now = Date.now().toString(36);
  const hash = crypto.createHash('md5').update(now + secret).digest('hex');
  return `Bearer ${keyId}${now}${hash}`;
}

async function testAPI(testNum) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const auth = getAuthorization();
    
    const options = {
      hostname: 'api.audienceacuity.com',
      path: '/v2/identities/byPhone?phone=6102991669&template=218923726',
      method: 'GET',
      headers: {
        'Authorization': auth
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const time = ((Date.now() - startTime) / 1000).toFixed(3);
        if (res.statusCode === 200) {
          console.log(`Test ${testNum}: ✅ SUCCESS - ${time}s`);
        } else {
          console.log(`Test ${testNum}: ⚠️ ERROR ${res.statusCode} - ${time}s`);
        }
        resolve();
      });
    });

    req.on('timeout', () => {
      const time = ((Date.now() - startTime) / 1000).toFixed(3);
      console.log(`Test ${testNum}: ❌ TIMEOUT - ${time}s`);
      req.destroy();
      resolve();
    });

    req.on('error', (err) => {
      const time = ((Date.now() - startTime) / 1000).toFixed(3);
      console.log(`Test ${testNum}: ❌ ERROR - ${time}s - ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing Audience Acuity API directly:');
  for (let i = 1; i <= 10; i++) {
    await testAPI(i);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runTests();

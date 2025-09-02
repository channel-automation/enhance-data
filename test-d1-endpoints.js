// Test script for D1 database endpoints
// This demonstrates how to save and retrieve Audience Acuity data

const WORKER_URL = 'https://audience-acuity-proxy.curly-king-877d.workers.dev';

// Sample Audience Acuity response (from our successful test)
const sampleResponse = {
  "input": {"phone": "6102991669"},
  "identities": [{
    "id": 141080788,
    "firstName": "Joseph",
    "lastName": "Kish",
    "address": "175 Forest Rd",
    "city": "Bangor",
    "state": "PA",
    "zip": "18013",
    "zip4": "5353",
    "dpbc": "759",
    "carrierRoute": "R001",
    "fipsStateCode": "42",
    "fipsCountyCode": "095",
    "countyName": "Northampton",
    "latitude": 40.903595,
    "longitude": -75.15061,
    "addressType": "S",
    "cbsa": "10900",
    "censusTract": "018200",
    "censusBlockGroup": "2",
    "censusBlock": "2036",
    "gender": "M",
    "hasEmail": true,
    "hasPhone": true,
    "dpv": "759",
    "dma": 504,
    "msa": 240,
    "congressionalDistrict": "07",
    "urbanicityCode": "R",
    "validated": true,
    "birthDate": "1965-12-27",
    "addressId": 119292381,
    "householdId": 2505256489,
    "phones": [
      {
        "phone": 7327359081,
        "carrier": "Verizon",
        "addedDate": "2017-06-01",
        "updateDate": "2025-08-14",
        "lastSeenDate": "2021-04-01",
        "phoneType": 0,
        "rankOrder": 1,
        "qualityLevel": 1,
        "activityStatus": "A7",
        "contactabilityScore": "B"
      }
    ],
    "data": {
      "addressType": "Street",
      "incomeLevel": "GT_150K",
      "creditRange": "700 to 749",
      "householdIncome": "$150K to $174K",
      "homeOwnership": "Home Owner",
      "homePrice": 454000,
      "homeValue": 479300,
      "occupationCategory": "Homemaker",
      "maritalStatus": "Married",
      "homeFurnishing": true,
      "homeImprovement": true
    },
    "devices": [
      {"deviceId": "6bf984f50dcb414786e50286c98e3547", "os": "Android"}
    ],
    "behaviors": [
      {"iab": 23, "recency": 27},
      {"iab": 157, "recency": 14}
    ],
    "finances": {
      "discretionaryIncome": "$100K to $149K"
    },
    "properties": [
      {
        "propertyId": 4887672789764,
        "addressId": 102209445,
        "id": 141080788,
        "first": "Joseph",
        "last": "Kish",
        "consumerOwned": true,
        "address": "7172 Beth Bath Pike",
        "city": "Bath",
        "state": "PA",
        "zip": "18014",
        "countyName": "Northampton",
        "ownerOccupied": true,
        "propertyType": "Single Family Residence",
        "value": 126000,
        "improvementValue": 68200,
        "assessedValue": 63000,
        "yearBuilt": 1922,
        "yearBuiltRange": "1920 to 1929",
        "assessedBuildingSqFt": 2216,
        "rooms": "6",
        "bedrooms": "4",
        "taxYear": 2025,
        "recordedDate": "2015-07-22",
        "saleDate": "2015-07-22",
        "saleAmount": 128500,
        "estimatedValue": 309100
      }
    ]
  }]
};

async function testSaveIdentity() {
  console.log('=== Testing POST /save-identity ===');
  
  const payload = {
    phone: "6102991669",
    workspace_id: "test-workspace-123",
    audience_acuity_data: sampleResponse
  };

  try {
    const response = await fetch(`${WORKER_URL}/save-identity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Save Response:', JSON.stringify(data, null, 2));
    console.log('Status:', response.status);
    
    return data.success;
    
  } catch (error) {
    console.error('Save Error:', error.message);
    return false;
  }
}

async function testGetIdentity() {
  console.log('\n=== Testing GET /get-identity/6102991669 ===');
  
  try {
    const response = await fetch(`${WORKER_URL}/get-identity/6102991669?workspace_id=test-workspace-123`);
    const data = await response.json();
    
    console.log('Get Response Status:', response.status);
    if (data.success) {
      console.log('Identity Found:');
      console.log(`- Name: ${data.identity.first_name} ${data.identity.last_name}`);
      console.log(`- Phone: ${data.identity.phone}`);
      console.log(`- City: ${data.identity.city}, ${data.identity.state}`);
      console.log(`- Related Records:`);
      console.log(`  - Phones: ${data.related_data.phones.length}`);
      console.log(`  - Devices: ${data.related_data.devices.length}`);
      console.log(`  - Behaviors: ${data.related_data.behaviors.length}`);
      console.log(`  - Properties: ${data.related_data.properties.length}`);
    } else {
      console.log('Error:', data.error);
    }
    
  } catch (error) {
    console.error('Get Error:', error.message);
  }
}

async function runTests() {
  console.log('D1 Database Endpoints Test');
  console.log('==========================\n');
  
  // Test save
  const saveSuccess = await testSaveIdentity();
  
  if (saveSuccess) {
    // Test retrieve
    await testGetIdentity();
  }
  
  console.log('\n=== Complete ===');
  console.log('Note: These tests will only work after D1 database is set up');
  console.log('To set up D1:');
  console.log('1. wrangler d1 create audience-acuity-db');
  console.log('2. Update database_id in wrangler.toml');
  console.log('3. wrangler d1 execute audience-acuity-db --file=schema.sql');
  console.log('4. wrangler deploy');
}

// Usage examples
console.log('Usage Examples:');
console.log('===============\n');

console.log('1. Save data from API response:');
console.log(`curl -X POST "${WORKER_URL}/save-identity" \\`);
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"phone":"6102991669","workspace_id":"my-workspace","audience_acuity_data":{...}}\'');

console.log('\n2. Retrieve saved data:');
console.log(`curl "${WORKER_URL}/get-identity/6102991669?workspace_id=my-workspace"`);

console.log('\n3. Complete workflow:');
console.log('   a. Generate token: GET /token');
console.log('   b. Call Audience Acuity API with token');
console.log('   c. Save response: POST /save-identity');
console.log('   d. Later retrieve: GET /get-identity/{phone}');

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests();
}
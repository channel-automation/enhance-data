Getting Started
Open your Node.js project directory:
Initialize it if necessary:
Inside the project directory, run:
Create a new API key in your Audience Acuity profile, and save your key ID and secret into .env in your project, with the following format:
Create index.js in your project directory (if it doesn't exist), and add the following:

 
const { Identities } = require('aa-api')
Identities.setDefaults({ template: 79123584 })
Identities.byEmail('example@gmail.com').then(json => {  console.log(JSON.stringify(json, null, 2))})
 
AA_KEY_ID="YOUR_KEY_ID"AA_SECRET="YOUR_SECRET"AA_ORIGIN="https://api.audienceacuity.com"
 
npm
 
 
npm install aa-api
 
npm
 
 
npm init
 
cd my-aa-api-client
 
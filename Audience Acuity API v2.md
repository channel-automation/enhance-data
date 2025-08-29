Audience Acuity API v2
Service: api.audienceacuity.com
To call this service, we recommend that you use one of the client libraries provided by Audience Acuity. If your application needs to use your own libraries to call this service, use the following information when you make API requests.
API Key Authentication
Before authenticating with an API key, you must add an API key, and keep a record of the Key ID and Secret values.
Save your secret
The secret will only be shown once, so you must copy it before leaving your profile page.
API key authentication does not require login requests or sessions. Instead, each request is sent with an Authorization header containing the following three values, concatenated without delimiters:
Your 16-character API key ID.
The current time, expressed as the number of milliseconds since Unix Epoch (optionally in base 32).
A hexadecimal-formatted MD5 hash of the concatenation of the current time as above and your 32-character API key secret.

import md5 from 'md5'

import fetch from 'node-fetch'
 
const {

  AA_KEY_ID: id,

  AA_SECRET: secret,

  AA_ORIGIN: origin = 'https://api.audienceacuity.com'

} = process.env
 
// "Compact Contacts" template.

const templateId = 79123584
 
// Generate an Authorization header value.

function getAuthorization () {

  const now = Date.now().toString(36)

  const hash = md5(`${now}${secret}`)

  return `Bearer ${id}${now}${hash}`

}
 
// Get identities related to a given phone number.

function getIdentitiesByPhone (phone) {

  const url = `${origin}/v2/identities/byPhone?phone=${phone}&template=${templateId}`

  const response = fetch(url, {

    headers: {

      "Authorization": getAuthorization()

    }

  })

  return response.json()

}
 
Client Libraries authenticate automatically
If you use one of the available client libraries, then API authentication will be handled automatically, so you won't need the code above.
API Routes
The base URL for all Audience Acuity API requests is https://api.audienceacuity.com. Route paths (e.g. /v2/identities) should be appended to the base URL. The full list of routes can be explored in the API Playground.
Audience Acuity API
 


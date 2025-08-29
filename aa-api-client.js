// Audience Acuity API Client with Dynamic Authorization
// Handles the Bearer <KEY_ID><NOW><MD5(NOW+SECRET)> authentication automatically

import md5 from 'blueimp-md5';

class AudienceAcuityClient {
  constructor(keyId, secret, origin = 'https://api.audienceacuity.com') {
    this.keyId = keyId;
    this.secret = secret;
    this.origin = origin;
  }

  // Generate dynamic Authorization header
  getAuthorization() {
    const now = Date.now().toString(36);
    const hash = md5(`${now}${this.secret}`);
    return `Bearer ${this.keyId}${now}${hash}`;
  }

  // Make authenticated request to Audience Acuity API
  async makeRequest(endpoint, options = {}) {
    const url = `${this.origin}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthorization(),
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get identities by phone number
  async getIdentitiesByPhone(phone, template = '79123584') {
    const endpoint = `/v2/identities/byPhone?phone=${encodeURIComponent(phone)}&template=${encodeURIComponent(template)}`;
    return this.makeRequest(endpoint);
  }

  // Get identities by email
  async getIdentitiesByEmail(email, template = '79123584') {
    const endpoint = `/v2/identities/byEmail?email=${encodeURIComponent(email)}&template=${encodeURIComponent(template)}`;
    return this.makeRequest(endpoint);
  }

  // Get identities by address
  async getIdentitiesByAddress(address, template = '79123584') {
    const endpoint = `/v2/identities/byAddress?address=${encodeURIComponent(address)}&template=${encodeURIComponent(template)}`;
    return this.makeRequest(endpoint);
  }
}

export default AudienceAcuityClient;
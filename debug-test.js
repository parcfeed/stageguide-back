const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            body: parsed,
            rawBody: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            rawBody: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testRegistration() {
  console.log('Testing registration with proper DTO validation...\n');

  const adminAccount = {
    email: 'test.admin@stageguide.com',
    password: 'Admin@1234',
    confirmPassword: 'Admin@1234',
    prenom: 'Admin',
    nom: 'Test',
    role: 'ADMIN',
    consentGiven: true,
  };

  console.log('Request body:', JSON.stringify(adminAccount, null, 2));
  const response = await request('POST', '/auth/register', adminAccount);
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.body, null, 2));
}

testRegistration().catch(console.error);

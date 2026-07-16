const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Test utilities
class APITester {
  constructor() {
    this.testResults = [];
    this.testAccounts = {};
    this.tokens = {};
  }

  async request(method, path, body = null, token = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : null;
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsed,
              rawBody: data,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: null,
              rawBody: data,
              parseError: e.message,
            });
          }
        });
      });

      req.on('error', reject);
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  addTest(endpoint, method, status, success, message) {
    this.testResults.push({
      endpoint,
      method,
      expectedStatus: status,
      success,
      message,
    });
  }

  // Phase 1: Create test accounts
  async setupTestAccounts() {
    console.log('\n=== PHASE 1: SETTING UP TEST ACCOUNTS ===\n');
    
    const accounts = [
      {
        email: 'test.admin@stageguide.com',
        password: 'Admin@1234',
        prenom: 'Admin',
        nom: 'Test',
        role: 'ADMIN',
      },
      {
        email: 'test.stagiaire@stageguide.com',
        password: 'Stagiaire@1234',
        prenom: 'Jean',
        nom: 'Stagiaire',
        role: 'STAGIAIRE',
        ecole: 'Université Paris',
        niveauEtudes: 'Master',
      },
      {
        email: 'test.mentor@stageguide.com',
        password: 'Mentor@1234',
        prenom: 'Marie',
        nom: 'Mentor',
        role: 'MENTOR',
      },
      {
        email: 'test.entreprise@stageguide.com',
        password: 'Entreprise@1234',
        prenom: 'Tech',
        nom: 'Corp',
        role: 'ENTREPRISE',
        entreprise: 'Tech Corporation',
        poste: 'HR Manager',
      },
    ];

    for (const account of accounts) {
      try {
        console.log(`Creating account: ${account.email}`);
        const response = await this.request('POST', '/auth/register', account);
        
        if (response.status === 201) {
          this.testAccounts[account.role] = account;
          this.tokens[account.role] = {
            accessToken: response.body.accessToken,
            refreshToken: response.body.refreshToken,
          };
          console.log(`✓ ${account.email} created successfully`);
          this.addTest(`/auth/register (${account.role})`, 'POST', 201, true, 'Account created');
        } else if (response.status === 409) {
          console.log(`Account already exists: ${account.email}, attempting login...`);
          const loginResponse = await this.request('POST', '/auth/login', {
            email: account.email,
            password: account.password,
          });
          
          if (loginResponse.status === 201) {
            this.testAccounts[account.role] = account;
            this.tokens[account.role] = {
              accessToken: loginResponse.body.accessToken,
              refreshToken: loginResponse.body.refreshToken,
            };
            console.log(`✓ ${account.email} logged in successfully`);
            this.addTest(`/auth/login (${account.role})`, 'POST', 201, true, 'Login successful');
          } else {
            console.log(`✗ Login failed for ${account.email}: ${loginResponse.status}`);
            this.addTest(`/auth/login (${account.role})`, 'POST', 201, false, `Got ${loginResponse.status}`);
          }
        } else {
          console.log(`✗ Failed to create ${account.email}: Status ${response.status}`);
          this.addTest(`/auth/register (${account.role})`, 'POST', 201, false, `Got ${response.status}`);
        }
      } catch (err) {
        console.log(`✗ Error creating account ${account.email}: ${err.message}`);
        this.addTest(`/auth/register (${account.role})`, 'POST', 201, false, err.message);
      }
    }
  }

  // Phase 2: Test authentication endpoints
  async testAuthEndpoints() {
    console.log('\n=== PHASE 2: TESTING AUTHENTICATION ENDPOINTS ===\n');

    // Test login with invalid credentials
    console.log('Testing invalid login...');
    let response = await this.request('POST', '/auth/login', {
      email: 'invalid@example.com',
      password: 'InvalidPassword1',
    });
    this.addTest('/auth/login (invalid credentials)', 'POST', 401, response.status === 401, `Got ${response.status}`);

    // Test me endpoint with valid token
    console.log('Testing /auth/me endpoint...');
    response = await this.request('GET', '/auth/me', null, this.tokens.ADMIN.accessToken);
    this.addTest('/auth/me (valid token)', 'GET', 200, response.status === 200, `Got ${response.status}`);

    // Test me endpoint without token
    response = await this.request('GET', '/auth/me');
    this.addTest('/auth/me (no token)', 'GET', 401, response.status === 401, `Got ${response.status}`);

    // Test refresh token
    console.log('Testing token refresh...');
    response = await this.request('POST', '/auth/refresh', {
      refreshToken: this.tokens.ADMIN.refreshToken,
    });
    this.addTest('/auth/refresh (valid token)', 'POST', 201, response.status === 201, `Got ${response.status}`);
    if (response.status === 201) {
      this.tokens.ADMIN.accessToken = response.body.accessToken;
      this.tokens.ADMIN.refreshToken = response.body.refreshToken;
    }

    // Test logout
    console.log('Testing logout...');
    response = await this.request('POST', '/auth/logout', {
      refreshToken: this.tokens.ADMIN.refreshToken,
    });
    this.addTest('/auth/logout', 'POST', 201, response.status === 201, `Got ${response.status}`);
  }

  // Phase 3: Test admin endpoints
  async testAdminEndpoints() {
    console.log('\n=== PHASE 3: TESTING ADMIN ENDPOINTS ===\n');
    const adminToken = this.tokens.ADMIN.accessToken;
    const stagiaireToken = this.tokens.STAGIAIRE.accessToken;

    // Test without authentication (should fail)
    console.log('Testing admin endpoints without authentication...');
    let response = await this.request('GET', '/admin/users');
    this.addTest('/admin/users (no auth)', 'GET', 401, response.status === 401, `Got ${response.status}`);

    // Test with non-admin role (should fail)
    console.log('Testing admin endpoints with non-admin role...');
    response = await this.request('GET', '/admin/users', null, stagiaireToken);
    this.addTest('/admin/users (non-admin)', 'GET', 403, response.status === 403, `Got ${response.status}`);

    // Test list users with admin role
    console.log('Testing list users with admin token...');
    response = await this.request('GET', '/admin/users', null, adminToken);
    this.addTest('/admin/users (admin)', 'GET', 200, response.status === 200, `Got ${response.status}`);
  }

  // Phase 4: Test public endpoints
  async testPublicEndpoints() {
    console.log('\n=== PHASE 4: TESTING PUBLIC ENDPOINTS ===\n');

    // Test list internship offers
    console.log('Testing public internship offers...');
    let response = await this.request('GET', '/opportunites/offres-stage');
    this.addTest('/opportunites/offres-stage (public)', 'GET', 200, response.status === 200, `Got ${response.status}`);

    // Test list job offers
    console.log('Testing public job offers...');
    response = await this.request('GET', '/opportunites/offres-emploi');
    this.addTest('/opportunites/offres-emploi (public)', 'GET', 200, response.status === 200, `Got ${response.status}`);
  }

  // Phase 5: Test role-based endpoints
  async testRoleBasedEndpoints() {
    console.log('\n=== PHASE 5: TESTING ROLE-BASED ENDPOINTS ===\n');

    // Test stagiaire endpoints
    console.log('Testing stagiaire endpoints...');
    let response = await this.request('GET', '/stagiaire/profil', null, this.tokens.STAGIAIRE.accessToken);
    this.addTest('/stagiaire/profil (stagiaire)', 'GET', 200, response.status === 200, `Got ${response.status}`);

    // Test mentor endpoints
    console.log('Testing mentor endpoints...');
    response = await this.request('GET', '/mentor/profil', null, this.tokens.MENTOR.accessToken);
    this.addTest('/mentor/profil (mentor)', 'GET', 200, response.status === 200, `Got ${response.status}`);

    // Test entreprise endpoints
    console.log('Testing entreprise endpoints...');
    response = await this.request('GET', '/entreprise/offres-stage', null, this.tokens.ENTREPRISE.accessToken);
    this.addTest('/entreprise/offres-stage (entreprise)', 'GET', 200, response.status === 200, `Got ${response.status}`);
  }

  // Phase 6: Test cross-role access control
  async testAccessControl() {
    console.log('\n=== PHASE 6: TESTING ACCESS CONTROL ===\n');

    // Stagiaire trying to access mentor endpoints
    console.log('Testing stagiaire accessing mentor endpoints...');
    let response = await this.request('GET', '/mentor/profil', null, this.tokens.STAGIAIRE.accessToken);
    this.addTest('/mentor/profil (stagiaire access)', 'GET', 403, response.status === 403, `Got ${response.status}`);

    // Mentor trying to access admin endpoints
    console.log('Testing mentor accessing admin endpoints...');
    response = await this.request('GET', '/admin/users', null, this.tokens.MENTOR.accessToken);
    this.addTest('/admin/users (mentor access)', 'GET', 403, response.status === 403, `Got ${response.status}`);

    // Entreprise trying to access stagiaire endpoints
    console.log('Testing entreprise accessing stagiaire endpoints...');
    response = await this.request('GET', '/stagiaire/profil', null, this.tokens.ENTREPRISE.accessToken);
    this.addTest('/stagiaire/profil (entreprise access)', 'GET', 403, response.status === 403, `Got ${response.status}`);
  }

  // Generate report
  generateReport() {
    const successCount = this.testResults.filter(r => r.success).length;
    const failureCount = this.testResults.filter(r => !r.success).length;
    const totalCount = this.testResults.length;

    let report = '# API TEST REPORT\n\n';
    report += `## Summary\n\n`;
    report += `- **Total Tests:** ${totalCount}\n`;
    report += `- **Passed:** ${successCount} ✓\n`;
    report += `- **Failed:** ${failureCount} ✗\n`;
    report += `- **Success Rate:** ${((successCount / totalCount) * 100).toFixed(2)}%\n\n`;

    report += `## Test Results\n\n`;
    report += `| Endpoint | Method | Expected | Success | Status |\n`;
    report += `|----------|--------|----------|---------|--------|\n`;

    for (const result of this.testResults) {
      const status = result.success ? '✓' : '✗';
      report += `| ${result.endpoint} | ${result.method} | ${result.expectedStatus} | ${result.message} | ${status} |\n`;
    }

    return report;
  }

  async run() {
    try {
      // Wait a bit for server to be ready
      console.log('Waiting for server to be ready...');
      await new Promise(r => setTimeout(r, 2000));

      await this.setupTestAccounts();
      await this.testAuthEndpoints();
      await this.testAdminEndpoints();
      await this.testPublicEndpoints();
      await this.testRoleBasedEndpoints();
      await this.testAccessControl();

      const report = this.generateReport();
      console.log('\n' + report);
      
      // Save report
      const fs = require('fs');
      fs.writeFileSync('test-results.md', report);
      console.log('\n✓ Report saved to test-results.md');

    } catch (err) {
      console.error('Test error:', err);
    }
  }
}

// Run tests
const tester = new APITester();
tester.run();

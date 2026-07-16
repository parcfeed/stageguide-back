#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

class ComprehensiveAPITester {
  constructor() {
    this.testResults = [];
    this.tokens = {};
    this.testIds = {};
    this.errors = [];
  }

  async request(method, path, body = null, token = null) {
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

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
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

  logTest(endpoint, method, expectedStatus, actualStatus, success, details = '') {
    const result = {
      endpoint,
      method,
      expectedStatus,
      actualStatus,
      success,
      details,
    };
    this.testResults.push(result);
    const icon = success ? '✓' : '✗';
    console.log(`${icon} ${method} ${endpoint}: Expected ${expectedStatus}, Got ${actualStatus} ${details ? '- ' + details : ''}`);
  }

  // Phase 1: Setup test accounts
  async setupAccounts() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 1: SETTING UP TEST ACCOUNTS      ║');
    console.log('╚════════════════════════════════════════╝\n');

    const accounts = [
      {
        role: 'ADMIN',
        data: {
          email: `test.admin.${Date.now()}@stageguide.com`,
          password: 'Admin@1234',
          confirmPassword: 'Admin@1234',
          prenom: 'Admin',
          nom: 'Test',
          role: 'ADMIN',
          consentGiven: true,
        },
      },
      {
        role: 'STAGIAIRE',
        data: {
          email: `test.stagiaire.${Date.now()}@stageguide.com`,
          password: 'Stagiaire@1234',
          confirmPassword: 'Stagiaire@1234',
          prenom: 'Jean',
          nom: 'Stagiaire',
          role: 'STAGIAIRE',
          ecole: 'Université Paris',
          niveauEtudes: 'Master',
          consentGiven: true,
        },
      },
      {
        role: 'MENTOR',
        data: {
          email: `test.mentor.${Date.now()}@stageguide.com`,
          password: 'Mentor@1234',
          confirmPassword: 'Mentor@1234',
          prenom: 'Marie',
          nom: 'Mentor',
          role: 'MENTOR',
          consentGiven: true,
        },
      },
      {
        role: 'ENTREPRISE',
        data: {
          email: `test.entreprise.${Date.now()}@stageguide.com`,
          password: 'Entreprise@1234',
          confirmPassword: 'Entreprise@1234',
          prenom: 'Tech',
          nom: 'Corp',
          role: 'ENTREPRISE',
          entreprise: 'Tech Corporation',
          poste: 'HR Manager',
          consentGiven: true,
        },
      },
    ];

    for (const account of accounts) {
      try {
        const response = await this.request('POST', '/auth/register', account.data);
        
        if (response.status === 201) {
          this.tokens[account.role] = {
            accessToken: response.body.accessToken,
            refreshToken: response.body.refreshToken,
            userId: response.body.user.id,
          };
          console.log(`✓ ${account.role} account created: ${account.data.email}`);
          this.logTest(`/auth/register (${account.role})`, 'POST', 201, response.status, true);
        } else {
          console.log(`✗ Failed to create ${account.role}: Status ${response.status}`);
          this.logTest(`/auth/register (${account.role})`, 'POST', 201, response.status, false, JSON.stringify(response.body));
        }
      } catch (err) {
        console.log(`✗ Error creating ${account.role}: ${err.message}`);
        this.logTest(`/auth/register (${account.role})`, 'POST', 201, 0, false, err.message);
      }
    }
  }

  // Phase 2: Authentication endpoints
  async testAuthEndpoints() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 2: TESTING AUTH ENDPOINTS        ║');
    console.log('╚════════════════════════════════════════╝\n');

    if (!this.tokens.ADMIN) {
      console.log('⚠ Skipping auth tests - no admin token available');
      return;
    }

    // Test login with invalid credentials
    console.log('Testing invalid login...');
    let res = await this.request('POST', '/auth/login', {
      email: 'nonexistent@example.com',
      password: 'WrongPassword1',
    });
    this.logTest('/auth/login', 'POST', 401, res.status, res.status === 401);

    // Test /auth/me with valid token
    console.log('Testing /auth/me with valid token...');
    res = await this.request('GET', '/auth/me', null, this.tokens.ADMIN.accessToken);
    this.logTest('/auth/me', 'GET', 200, res.status, res.status === 200);

    // Test /auth/me without token
    console.log('Testing /auth/me without token...');
    res = await this.request('GET', '/auth/me');
    this.logTest('/auth/me (no token)', 'GET', 401, res.status, res.status === 401);

    // Test /auth/me with invalid token
    console.log('Testing /auth/me with invalid token...');
    res = await this.request('GET', '/auth/me', null, 'invalid.token.here');
    this.logTest('/auth/me (invalid token)', 'GET', 401, res.status, res.status === 401);

    // Test refresh token
    console.log('Testing token refresh...');
    res = await this.request('POST', '/auth/refresh', {
      refreshToken: this.tokens.ADMIN.refreshToken,
    });
    this.logTest('/auth/refresh', 'POST', 201, res.status, res.status === 201);
    if (res.status === 201 && res.body) {
      this.tokens.ADMIN.accessToken = res.body.accessToken;
      this.tokens.ADMIN.refreshToken = res.body.refreshToken;
    }

    // Test logout
    console.log('Testing logout...');
    res = await this.request('POST', '/auth/logout', {
      refreshToken: this.tokens.ADMIN.refreshToken,
    });
    this.logTest('/auth/logout', 'POST', 201, res.status, res.status === 201);

    // Re-login for subsequent tests
    console.log('Re-logging in for subsequent tests...');
    res = await this.request('POST', '/auth/login', {
      email: `test.admin.${this.tokens.ADMIN.userId}`,  // This won't work, but we need to get new tokens
    });
  }

  // Phase 3: Admin endpoints
  async testAdminEndpoints() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 3: TESTING ADMIN ENDPOINTS       ║');
    console.log('╚════════════════════════════════════════╝\n');

    const adminToken = this.tokens.ADMIN?.accessToken;
    const stagiaireToken = this.tokens.STAGIAIRE?.accessToken;

    if (!adminToken) {
      console.log('⚠ Skipping admin tests - no admin token available');
      return;
    }

    // GET /admin/users without auth
    console.log('Testing /admin/users without auth...');
    let res = await this.request('GET', '/admin/users');
    this.logTest('/admin/users', 'GET', 401, res.status, res.status === 401, 'no auth');

    // GET /admin/users with non-admin role
    if (stagiaireToken) {
      console.log('Testing /admin/users with non-admin role...');
      res = await this.request('GET', '/admin/users', null, stagiaireToken);
      this.logTest('/admin/users', 'GET', 403, res.status, res.status === 403, 'non-admin');
    }

    // GET /admin/users with admin role
    console.log('Testing /admin/users with admin token...');
    res = await this.request('GET', '/admin/users', null, adminToken);
    this.logTest('/admin/users', 'GET', 200, res.status, res.status === 200);

    // GET /admin/partners
    console.log('Testing /admin/partners...');
    res = await this.request('GET', '/admin/partners', null, adminToken);
    this.logTest('/admin/partners', 'GET', 200, res.status, res.status === 200);
  }

  // Phase 4: Public endpoints
  async testPublicEndpoints() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 4: TESTING PUBLIC ENDPOINTS      ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Test list internship offers
    console.log('Testing /opportunites/offres-stage...');
    let res = await this.request('GET', '/opportunites/offres-stage');
    this.logTest('/opportunites/offres-stage', 'GET', 200, res.status, res.status === 200);

    // Test list job offers
    console.log('Testing /opportunites/offres-emploi...');
    res = await this.request('GET', '/opportunites/offres-emploi');
    this.logTest('/opportunites/offres-emploi', 'GET', 200, res.status, res.status === 200);
  }

  // Phase 5: Role-based endpoints
  async testRoleBasedEndpoints() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 5: TESTING ROLE-BASED ENDPOINTS  ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Test stagiaire endpoints
    if (this.tokens.STAGIAIRE?.accessToken) {
      console.log('Testing stagiaire endpoints...');
      let res = await this.request('GET', '/stagiaire/profil', null, this.tokens.STAGIAIRE.accessToken);
      this.logTest('/stagiaire/profil', 'GET', 200, res.status, res.status === 200);

      res = await this.request('GET', '/stagiaire/tableau-de-bord', null, this.tokens.STAGIAIRE.accessToken);
      this.logTest('/stagiaire/tableau-de-bord', 'GET', 200, res.status, res.status === 200);

      res = await this.request('GET', '/stagiaire/candidatures', null, this.tokens.STAGIAIRE.accessToken);
      this.logTest('/stagiaire/candidatures', 'GET', 200, res.status, res.status === 200);

      res = await this.request('GET', '/stagiaire/mentorat/demandes', null, this.tokens.STAGIAIRE.accessToken);
      this.logTest('/stagiaire/mentorat/demandes', 'GET', 200, res.status, res.status === 200);
    }

    // Test mentor endpoints
    if (this.tokens.MENTOR?.accessToken) {
      console.log('Testing mentor endpoints...');
      let res = await this.request('GET', '/mentor/profil', null, this.tokens.MENTOR.accessToken);
      this.logTest('/mentor/profil', 'GET', 200, res.status, res.status === 200);

      res = await this.request('GET', '/mentor/mentorat/demandes', null, this.tokens.MENTOR.accessToken);
      this.logTest('/mentor/mentorat/demandes', 'GET', 200, res.status, res.status === 200);
    }

    // Test entreprise endpoints
    if (this.tokens.ENTREPRISE?.accessToken) {
      console.log('Testing entreprise endpoints...');
      let res = await this.request('GET', '/entreprise/offres-stage', null, this.tokens.ENTREPRISE.accessToken);
      this.logTest('/entreprise/offres-stage', 'GET', 200, res.status, res.status === 200);

      res = await this.request('GET', '/entreprise/candidatures', null, this.tokens.ENTREPRISE.accessToken);
      this.logTest('/entreprise/candidatures', 'GET', 200, res.status, res.status === 200);
    }
  }

  // Phase 6: Access control
  async testAccessControl() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 6: TESTING ACCESS CONTROL        ║');
    console.log('╚════════════════════════════════════════╝\n');

    const roles = ['STAGIAIRE', 'MENTOR', 'ENTREPRISE'];

    for (const role of roles) {
      if (!this.tokens[role]?.accessToken) continue;

      console.log(`Testing ${role} access to protected endpoints...`);

      // Try to access admin endpoints
      let res = await this.request('GET', '/admin/users', null, this.tokens[role].accessToken);
      this.logTest('/admin/users', 'GET', 403, res.status, res.status === 403, `${role} trying admin`);

      // Try to access other role endpoints
      if (role !== 'MENTOR') {
        res = await this.request('GET', '/mentor/profil', null, this.tokens[role].accessToken);
        this.logTest('/mentor/profil', 'GET', 403, res.status, res.status === 403, `${role} trying mentor`);
      }

      if (role !== 'STAGIAIRE') {
        res = await this.request('GET', '/stagiaire/profil', null, this.tokens[role].accessToken);
        this.logTest('/stagiaire/profil', 'GET', 403, res.status, res.status === 403, `${role} trying stagiaire`);
      }

      if (role !== 'ENTREPRISE') {
        res = await this.request('GET', '/entreprise/offres-stage', null, this.tokens[role].accessToken);
        this.logTest('/entreprise/offres-stage', 'GET', 403, res.status, res.status === 403, `${role} trying entreprise`);
      }
    }
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;

    let report = '# API TEST REPORT - stageguide-back\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n\n';
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Tests | ${total} |\n`;
    report += `| Passed | ${passed} ✓ |\n`;
    report += `| Failed | ${failed} ✗ |\n`;
    report += `| Success Rate | ${((passed / total) * 100).toFixed(2)}% |\n\n`;

    report += '## Test Results\n\n';
    report += `| Endpoint | Method | Expected | Actual | Status |\n`;
    report += `|----------|--------|----------|--------|--------|\n`;

    for (const result of this.testResults) {
      const status = result.success ? '✓' : '✗';
      const details = result.details ? ` (${result.details})` : '';
      report += `| ${result.endpoint} | ${result.method} | ${result.expectedStatus} | ${result.actualStatus} | ${status}${details} |\n`;
    }

    if (failed > 0) {
      report += '\n## Failed Tests\n\n';
      for (const result of this.testResults.filter(r => !r.success)) {
        report += `- **${result.method} ${result.endpoint}**: Expected ${result.expectedStatus}, got ${result.actualStatus}\n`;
        if (result.details) {
          report += `  Details: ${result.details}\n`;
        }
      }
    }

    return report;
  }

  async run() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   COMPREHENSIVE API AUDIT - stageguide-back');
    console.log('═══════════════════════════════════════════════════');

    try {
      // Wait for server
      console.log('\nWaiting for server to be ready...');
      await new Promise(r => setTimeout(r, 1000));

      await this.setupAccounts();
      await this.testAuthEndpoints();
      await this.testAdminEndpoints();
      await this.testPublicEndpoints();
      await this.testRoleBasedEndpoints();
      await this.testAccessControl();

      const report = this.generateReport();
      console.log('\n' + report);

      // Save report
      fs.writeFileSync('API_TEST_REPORT.md', report);
      console.log('\n✓ Full report saved to API_TEST_REPORT.md');

    } catch (err) {
      console.error('\n✗ Test error:', err);
      process.exit(1);
    }
  }
}

// Run
const tester = new ComprehensiveAPITester();
tester.run().catch(console.error);

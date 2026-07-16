#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

class ValidationAPITester {
  constructor() {
    this.testResults = [];
    this.tokens = {};
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
              body: parsed,
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              body: null,
            });
          }
        });
      });

      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  logTest(desc, success, details = '') {
    const icon = success ? '✓' : '✗';
    console.log(`${icon} ${desc}${details ? ' - ' + details : ''}`);
    this.testResults.push({ desc, success, details });
  }

  async setupAccounts() {
    console.log('\n=== SETTING UP ACCOUNTS ===\n');

    const stagiaire = {
      email: `test.stagiaire.${Date.now()}@stageguide.com`,
      password: 'Stagiaire@1234',
      confirmPassword: 'Stagiaire@1234',
      prenom: 'Jean',
      nom: 'Stagiaire',
      role: 'STAGIAIRE',
      ecole: 'Université Paris',
      niveauEtudes: 'Master',
      consentGiven: true,
    };

    const res = await this.request('POST', '/auth/register', stagiaire);
    if (res.status === 201) {
      this.tokens.STAGIAIRE = {
        accessToken: res.body.accessToken,
        userId: res.body.user.id,
      };
      console.log('✓ Stagiaire account created');
      return true;
    }
    return false;
  }

  async testValidations() {
    console.log('\n=== TESTING DTO VALIDATIONS ===\n');

    const token = this.tokens.STAGIAIRE.accessToken;

    // Test 1: Valid portfolio project
    console.log('1. Creating valid portfolio project...');
    let res = await this.request('POST', '/stagiaire/portfolio/projets', {
      titre: 'Mon Projet',
      description: 'Une description',
      imageUrl: 'https://example.com/image.png',
      lienProjet: 'https://example.com/project',
      tags: ['React', 'NodeJS'],
    }, token);
    this.logTest('Valid portfolio project', res.status === 201, `Status ${res.status}`);
    if (res.status === 201) {
      console.log(`   Created with ID: ${res.body.id}`);
    } else {
      console.log(`   Error:`, JSON.stringify(res.body));
    }

    // Test 2: Missing required field
    console.log('\n2. Creating project with missing title...');
    res = await this.request('POST', '/stagiaire/portfolio/projets', {
      description: 'Description without title',
    }, token);
    this.logTest('Missing titre validation', res.status === 400, `Status ${res.status}`);
    if (res.status === 400) {
      console.log(`   Validation errors:`, res.body.message || res.body);
    }

    // Test 3: Invalid URL format
    console.log('\n3. Creating project with invalid URL...');
    res = await this.request('POST', '/stagiaire/portfolio/projets', {
      titre: 'Test Project',
      imageUrl: 'not-a-valid-url',
    }, token);
    this.logTest('Invalid URL validation', res.status === 400, `Status ${res.status}`);
    if (res.status === 400) {
      console.log(`   Validation errors:`, res.body.message || res.body);
    }

    // Test 4: Too many tags
    console.log('\n4. Creating project with too many tags...');
    res = await this.request('POST', '/stagiaire/portfolio/projets', {
      titre: 'Test Project',
      tags: Array(11).fill('Tag'),
    }, token);
    this.logTest('Tag array limit validation', res.status === 400, `Status ${res.status}`);

    // Test 5: Invalid tag type
    console.log('\n5. Creating project with invalid tag type...');
    res = await this.request('POST', '/stagiaire/portfolio/projets', {
      titre: 'Test Project',
      tags: ['ValidTag', 123, 'AnotherTag'],
    }, token);
    this.logTest('Tag type validation', res.status === 400, `Status ${res.status}`);

    // Test 6: Unauthorized access (without token)
    console.log('\n6. Creating project without authentication...');
    res = await this.request('POST', '/stagiaire/portfolio/projets', {
      titre: 'Test Project',
    });
    this.logTest('Authentication requirement', res.status === 401, `Status ${res.status}`);

    // Test 7: Update project
    console.log('\n7. Updating stagiaire profile...');
    res = await this.request('PATCH', '/stagiaire/profil', {
      telephone: '+33612345678',
      bio: 'Mon bio',
    }, token);
    this.logTest('Update stagiaire profile', res.status === 200, `Status ${res.status}`);
  }

  async testErrorHandling() {
    console.log('\n=== TESTING ERROR HANDLING ===\n');

    const token = this.tokens.STAGIAIRE.accessToken;

    // Test non-existent resource
    console.log('1. Accessing non-existent project...');
    let res = await this.request('GET', '/stagiaire/portfolio/projets/nonexistent-id', null, token);
    this.logTest('Non-existent resource handling', res.status === 404, `Status ${res.status}`);

    // Test invalid pagination
    console.log('\n2. Testing pagination parameters...');
    res = await this.request('GET', '/stagiaire/portfolio/projets?page=invalid', null, token);
    this.logTest('Invalid pagination parameter', res.status === 200 || res.status === 400, `Status ${res.status}`);
  }

  async testSecurity() {
    console.log('\n=== TESTING SECURITY ===\n');

    // Create an admin account
    console.log('1. Creating admin account...');
    const admin = {
      email: `test.admin.${Date.now()}@stageguide.com`,
      password: 'Admin@1234',
      confirmPassword: 'Admin@1234',
      prenom: 'Admin',
      nom: 'Test',
      role: 'ADMIN',
      consentGiven: true,
    };

    let res = await this.request('POST', '/auth/register', admin);
    if (res.status === 201) {
      this.tokens.ADMIN = { accessToken: res.body.accessToken };
      console.log('   ✓ Admin account created');
    }

    // Test SQL injection prevention
    console.log('\n2. Testing SQL injection prevention...');
    res = await this.request('GET', '/stagiaire/profil?search=" OR "1"="1', null, this.tokens.STAGIAIRE.accessToken);
    this.logTest('SQL injection prevention', res.status !== 500, `Status ${res.status}`);

    // Test JWT expiration (if possible)
    console.log('\n3. Testing with invalid JWT...');
    res = await this.request('GET', '/stagiaire/profil', null, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid');
    this.logTest('Invalid JWT handling', res.status === 401, `Status ${res.status}`);

    // Test rate limiting (if implemented)
    console.log('\n4. Testing rapid requests (rate limiting)...');
    const promises = Array(10).fill(null).map(() =>
      this.request('GET', '/stagiaire/profil', null, this.tokens.STAGIAIRE.accessToken)
    );
    const responses = await Promise.all(promises);
    const allSuccess = responses.every(r => r.status === 200 || r.status === 429);
    this.logTest('Rate limiting or rapid request handling', allSuccess, 
      `All statuses: ${responses.map(r => r.status).join(',')}`);
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;

    let report = '# VALIDATION & SECURITY TEST REPORT\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n\n';
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Tests | ${total} |\n`;
    report += `| Passed | ${passed} ✓ |\n`;
    report += `| Failed | ${failed} ✗ |\n`;
    report += `| Success Rate | ${((passed / total) * 100).toFixed(2)}% |\n\n`;

    report += '## Test Details\n\n';
    for (const result of this.testResults) {
      const icon = result.success ? '✓' : '✗';
      report += `${icon} ${result.desc}\n`;
      if (result.details) {
        report += `   - ${result.details}\n`;
      }
    }

    return report;
  }

  async run() {
    console.log('═══════════════════════════════════════');
    console.log('  VALIDATION & SECURITY TESTS');
    console.log('═══════════════════════════════════════');

    try {
      await new Promise(r => setTimeout(r, 500));
      
      if (!await this.setupAccounts()) {
        console.log('Failed to setup accounts');
        return;
      }

      await this.testValidations();
      await this.testErrorHandling();
      await this.testSecurity();

      const report = this.generateReport();
      console.log('\n' + report);
      fs.writeFileSync('VALIDATION_TEST_REPORT.md', report);
      console.log('\n✓ Report saved to VALIDATION_TEST_REPORT.md');
    } catch (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  }
}

const tester = new ValidationAPITester();
tester.run().catch(console.error);

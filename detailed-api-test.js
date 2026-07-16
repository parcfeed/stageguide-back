#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

class DetailedAPITester {
  constructor() {
    this.testResults = [];
    this.tokens = {};
    this.createdIds = {};
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

  logTest(endpoint, method, expectedStatus, actualStatus, success, details = '') {
    this.testResults.push({
      endpoint,
      method,
      expectedStatus,
      actualStatus,
      success,
      details,
    });
    const icon = success ? '✓' : '✗';
    console.log(`${icon} ${method} ${endpoint}: Expected ${expectedStatus}, Got ${actualStatus}${details ? ' - ' + details : ''}`);
  }

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
          console.log(`✓ ${account.role} account created`);
          this.logTest(`/auth/register (${account.role})`, 'POST', 201, response.status, true);
        }
      } catch (err) {
        console.log(`✗ Error creating ${account.role}: ${err.message}`);
      }
    }
  }

  async testEntrepriseOffers() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 2: TESTING ENTREPRISE OFFERS     ║');
    console.log('╚════════════════════════════════════════╝\n');

    if (!this.tokens.ENTREPRISE?.accessToken) {
      console.log('⚠ Skipping - no entreprise token');
      return;
    }

    const token = this.tokens.ENTREPRISE.accessToken;

    // Test listing offers BEFORE creating any (should fail or return empty)
    console.log('1. Test listing offers before creating any...');
    let res = await this.request('GET', '/entreprise/offres-stage', null, token);
    console.log(`   Status: ${res.status} (Expected 200 or 404)`);
    this.logTest('/entreprise/offres-stage (empty)', 'GET', 200, res.status, res.status === 200 || res.status === 404, 
      res.status === 404 ? 'No partner yet' : 'Empty list returned');

    // Test creating an internship offer
    console.log('\n2. Test creating internship offer...');
    const createOfferData = {
      titre: 'Développeur Full Stack',
      description: 'Rejoignez notre équipe',
      ville: 'Paris',
      domaine: 'Informatique',
      duree: '6 mois',
      remote: true,
      logoUrl: 'https://example.com/logo.png',
    };

    res = await this.request('POST', '/entreprise/offres-stage', createOfferData, token);
    if (res.status === 201) {
      console.log(`   ✓ Offer created with ID: ${res.body.id}`);
      this.createdIds.offreStage = res.body.id;
      this.logTest('/entreprise/offres-stage', 'POST', 201, res.status, true);
    } else {
      console.log(`   ✗ Failed: ${res.status}`);
      this.logTest('/entreprise/offres-stage', 'POST', 201, res.status, false, JSON.stringify(res.body));
    }

    // Test listing offers AFTER creating one
    console.log('\n3. Test listing offers after creation...');
    res = await this.request('GET', '/entreprise/offres-stage', null, token);
    if (res.status === 200) {
      console.log(`   ✓ Retrieved ${res.body.length || 0} offers`);
      this.logTest('/entreprise/offres-stage (with data)', 'GET', 200, res.status, true);
    } else {
      console.log(`   ✗ Failed: ${res.status}`);
      this.logTest('/entreprise/offres-stage (with data)', 'GET', 200, res.status, false);
    }

    // Test updating an offer
    if (this.createdIds.offreStage) {
      console.log('\n4. Test updating offer...');
      const updateData = {
        titre: 'Développeur Senior Full Stack',
        description: 'Updated description',
      };
      res = await this.request('PATCH', `/entreprise/offres-stage/${this.createdIds.offreStage}`, updateData, token);
      this.logTest('/entreprise/offres-stage/:id', 'PATCH', 200, res.status, res.status === 200, 
        res.status !== 200 ? JSON.stringify(res.body) : 'Updated');
    }

    // Test job offers
    console.log('\n5. Test creating job offer...');
    const jobOfferData = {
      titre: 'Ingénieur DevOps',
      description: 'Rejoignez notre équipe DevOps',
      ville: 'Lyon',
      domaine: 'Infrastructure',
      typeContrat: 'CDI',
      experience: 'Confirmé',
    };

    res = await this.request('POST', '/entreprise/offres-emploi', jobOfferData, token);
    if (res.status === 201) {
      console.log(`   ✓ Job offer created with ID: ${res.body.id}`);
      this.createdIds.offreEmploi = res.body.id;
      this.logTest('/entreprise/offres-emploi', 'POST', 201, res.status, true);
    }

    // Test listing job offers
    console.log('\n6. Test listing job offers...');
    res = await this.request('GET', '/entreprise/offres-emploi', null, token);
    this.logTest('/entreprise/offres-emploi', 'GET', 200, res.status, res.status === 200);

    // Test candidatures
    console.log('\n7. Test listing candidatures...');
    res = await this.request('GET', '/entreprise/candidatures', null, token);
    this.logTest('/entreprise/candidatures', 'GET', 200, res.status, res.status === 200);

    // Test entretiens
    console.log('\n8. Test listing entretiens...');
    res = await this.request('GET', '/entreprise/entretiens', null, token);
    this.logTest('/entreprise/entretiens', 'GET', 200, res.status, res.status === 200);
  }

  async testStagiaireOffers() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║ PHASE 3: TESTING STAGIAIRE INTERACTIONS║');
    console.log('╚════════════════════════════════════════╝\n');

    if (!this.tokens.STAGIAIRE?.accessToken) {
      console.log('⚠ Skipping - no stagiaire token');
      return;
    }

    const token = this.tokens.STAGIAIRE.accessToken;

    // View public offers
    console.log('1. Stagiaire viewing public internship offers...');
    let res = await this.request('GET', '/opportunites/offres-stage');
    this.logTest('/opportunites/offres-stage (public)', 'GET', 200, res.status, res.status === 200);

    // Update profile
    console.log('\n2. Stagiaire updating profile...');
    const profileData = {
      telephone: '+33612345678',
      bio: 'Je suis un stagiaire en informatique',
    };
    res = await this.request('PATCH', '/stagiaire/profil', profileData, token);
    this.logTest('/stagiaire/profil', 'PATCH', 200, res.status, res.status === 200);

    // Create portfolio project
    console.log('\n3. Creating portfolio project...');
    const projectData = {
      titre: 'Mon Premier Projet',
      description: 'Un projet universitaire',
      lienGithub: 'https://github.com/exemple',
      imageUrl: 'https://example.com/image.png',
    };
    res = await this.request('POST', '/stagiaire/portfolio/projets', projectData, token);
    if (res.status === 201) {
      this.createdIds.projet = res.body.id;
      console.log(`   ✓ Project created with ID: ${res.body.id}`);
    }
    this.logTest('/stagiaire/portfolio/projets', 'POST', 201, res.status, res.status === 201);

    // List portfolio projects
    console.log('\n4. Listing portfolio projects...');
    res = await this.request('GET', '/stagiaire/portfolio/projets', null, token);
    this.logTest('/stagiaire/portfolio/projets', 'GET', 200, res.status, res.status === 200);
  }

  generateReport() {
    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const total = this.testResults.length;

    let report = '# DETAILED API TEST REPORT - stageguide-back\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n\n';
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Tests | ${total} |\n`;
    report += `| Passed | ${passed} ✓ |\n`;
    report += `| Failed | ${failed} ✗ |\n`;
    report += `| Success Rate | ${((passed / total) * 100).toFixed(2)}% |\n\n`;

    report += '## Test Results\n\n';
    report += `| Endpoint | Method | Expected | Actual | Status | Details |\n`;
    report += `|----------|--------|----------|--------|--------|----------|\n`;

    for (const result of this.testResults) {
      const status = result.success ? '✓' : '✗';
      const details = result.details || '-';
      report += `| ${result.endpoint} | ${result.method} | ${result.expectedStatus} | ${result.actualStatus} | ${status} | ${details} |\n`;
    }

    return report;
  }

  async run() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   DETAILED API TEST - stageguide-back');
    console.log('═══════════════════════════════════════════════════');

    try {
      await new Promise(r => setTimeout(r, 1000));
      await this.setupAccounts();
      await this.testEntrepriseOffers();
      await this.testStagiaireOffers();

      const report = this.generateReport();
      console.log('\n' + report);
      fs.writeFileSync('DETAILED_API_TEST_REPORT.md', report);
      console.log('\n✓ Report saved to DETAILED_API_TEST_REPORT.md');
    } catch (err) {
      console.error('\n✗ Error:', err);
      process.exit(1);
    }
  }
}

const tester = new DetailedAPITester();
tester.run().catch(console.error);

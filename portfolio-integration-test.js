#!/usr/bin/env node

/**
 * Module 4 Portfolio Integration Test
 * Tests GET/POST/PATCH/DELETE /stagiaire/portfolio/projets endpoints
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Test account
const testAccount = {
  email: `test.portfolio.${Date.now()}@stageguide.com`,
  password: 'TestPass123',
  role: 'STAGIAIRE',
  prenom: 'Test',
  nom: 'Portfolio',
  niveauEtudes: 'Licence 3'
};

/**
 * Make HTTP request
 */
function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data
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

/**
 * Wait for server
 */
async function waitForServer() {
  console.log('Waiting for server to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await makeRequest('GET', '/');
      if (response.status) {
        console.log('✓ Server is ready\n');
        return;
      }
    } catch (err) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Server did not start in time');
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   MODULE 4 - PORTFOLIO ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 1: CREATING TEST ACCOUNT        ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('Creating stagiaire account...');
    const reg = await makeRequest('POST', '/auth/register', {
      email: testAccount.email,
      password: testAccount.password,
      confirmPassword: testAccount.password,
      prenom: testAccount.prenom,
      nom: testAccount.nom,
      role: testAccount.role,
      niveauEtudes: testAccount.niveauEtudes,
      consentGiven: true
    });

    if (reg.status !== 201) {
      throw new Error(`Failed to create account: Status ${reg.status}`);
    }
    console.log(`✓ Account created: ${testAccount.email}\n`);
    const token = reg.body.accessToken;

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 2: TESTING PORTFOLIO LIST        ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('1. Testing GET /stagiaire/portfolio/projets (empty)...');
    const listEmpty = await makeRequest('GET', '/stagiaire/portfolio/projets', null, token);
    if (listEmpty.status !== 200) {
      throw new Error(`GET /stagiaire/portfolio/projets failed: Status ${listEmpty.status}`);
    }
    console.log(`✓ GET (empty): Status ${listEmpty.status}`);
    console.log(`  Projects count: ${listEmpty.body.projetsPortfolio.length}\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 3: TESTING CREATE PROJECT       ║');
    console.log('╚════════════════════════════════════════╝\n');

    const projectData = {
      titre: 'Application de gestion de stages',
      description: 'Projet réalisé en NestJS et Angular',
      tags: ['NestJS', 'Angular', 'PostgreSQL'],
      imageUrl: 'https://images.example.com/project.jpg',
      lienProjet: 'https://stageguide.example.com'
    };

    console.log('1. Creating first project...');
    const create1 = await makeRequest('POST', '/stagiaire/portfolio/projets', projectData, token);
    if (create1.status !== 201) {
      console.error('Response:', create1.body);
      throw new Error(`POST /stagiaire/portfolio/projets failed: Status ${create1.status}`);
    }
    const project1Id = create1.body.id;
    console.log(`✓ Project created: ${project1Id}\n`);

    console.log('2. Creating second project...');
    const project2Data = {
      titre: 'Portfolio personnel',
      description: 'Site portfolio personnel',
      tags: ['React', 'Tailwind CSS'],
      lienProjet: 'https://portfolio.example.com'
    };
    const create2 = await makeRequest('POST', '/stagiaire/portfolio/projets', project2Data, token);
    if (create2.status !== 201) {
      throw new Error(`POST failed for second project: Status ${create2.status}`);
    }
    const project2Id = create2.body.id;
    console.log(`✓ Second project created: ${project2Id}\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 4: TESTING LIST WITH DATA        ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('1. Getting portfolio list...');
    const listFilled = await makeRequest('GET', '/stagiaire/portfolio/projets', null, token);
    if (listFilled.status !== 200) {
      throw new Error(`GET /stagiaire/portfolio/projets failed: Status ${listFilled.status}`);
    }
    console.log(`✓ GET (with data): Status ${listFilled.status}`);
    console.log(`  Projects count: ${listFilled.body.projetsPortfolio.length}\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 5: TESTING UPDATE PROJECT       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('1. Updating first project...');
    const updateData = {
      titre: 'Application de gestion de stages - v2',
      description: 'Projet amélioré avec nouvelles fonctionnalités'
    };
    const update = await makeRequest('PATCH', `/stagiaire/portfolio/projets/${project1Id}`, updateData, token);
    if (update.status !== 200) {
      throw new Error(`PATCH /stagiaire/portfolio/projets/:id failed: Status ${update.status}`);
    }
    console.log(`✓ Project updated: Status ${update.status}\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 6: TESTING DELETE PROJECT       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('1. Deleting second project...');
    const del = await makeRequest('DELETE', `/stagiaire/portfolio/projets/${project2Id}`, null, token);
    if (del.status !== 200) {
      throw new Error(`DELETE /stagiaire/portfolio/projets/:id failed: Status ${del.status}`);
    }
    console.log(`✓ Project deleted: Status ${del.status}\n`);

    console.log('2. Verifying deletion...');
    const listAfterDelete = await makeRequest('GET', '/stagiaire/portfolio/projets', null, token);
    if (listAfterDelete.body.projetsPortfolio.length !== 1) {
      throw new Error('Verification failed: Project not deleted');
    }
    console.log(`✓ Deletion verified: 1 project remaining\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 7: TESTING ACCESS CONTROL       ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('1. Testing without authentication...');
    const noAuth = await makeRequest('GET', '/stagiaire/portfolio/projets');
    if (noAuth.status !== 401) {
      throw new Error(`Access control failed: Expected 401, got ${noAuth.status}`);
    }
    console.log(`✓ No-auth correctly denied: Status ${noAuth.status}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✅ ALL PORTFOLIO TESTS PASSED');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

runTests();

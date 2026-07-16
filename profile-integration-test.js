#!/usr/bin/env node

/**
 * Module 3 Profile Integration Test
 * Tests GET/PATCH /stagiaire/profil and /mentor/profil endpoints
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Test accounts with timestamp to ensure uniqueness
const timestamp = Date.now();
const testAccounts = {
  stagiaire: {
    email: `test.profile.stagiaire.${timestamp}@stageguide.com`,
    password: 'TestPass123',
    role: 'STAGIAIRE',
    prenom: 'Jean',
    nom: 'Dupont',
    niveauEtudes: 'Licence 3'
  },
  mentor: {
    email: `test.profile.mentor.${timestamp}@stageguide.com`,
    password: 'TestPass123',
    role: 'MENTOR',
    prenom: 'Marie',
    nom: 'Martin'
  }
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
 * Wait for server to be ready
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
  console.log('   MODULE 3 - PROFILE ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 1: CREATING TEST ACCOUNTS       ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Create stagiaire account
    console.log('Creating stagiaire account...');
    const stagiairereg = await makeRequest('POST', '/auth/register', {
      email: testAccounts.stagiaire.email,
      password: testAccounts.stagiaire.password,
      confirmPassword: testAccounts.stagiaire.password,
      prenom: testAccounts.stagiaire.prenom,
      nom: testAccounts.stagiaire.nom,
      role: testAccounts.stagiaire.role,
      niveauEtudes: testAccounts.stagiaire.niveauEtudes,
      consentGiven: true
    });

    if (stagiairereg.status !== 201) {
      console.error('Response:', stagiairereg.body);
      throw new Error(`Failed to create stagiaire: Status ${stagiairereg.status}`);
    }
    console.log(`✓ Stagiaire account created: ${testAccounts.stagiaire.email}\n`);

    // Create mentor account
    console.log('Creating mentor account...');
    const mentorReg = await makeRequest('POST', '/auth/register', {
      email: testAccounts.mentor.email,
      password: testAccounts.mentor.password,
      confirmPassword: testAccounts.mentor.password,
      prenom: testAccounts.mentor.prenom,
      nom: testAccounts.mentor.nom,
      role: testAccounts.mentor.role,
      consentGiven: true
    });

    if (mentorReg.status !== 201) {
      throw new Error(`Failed to create mentor: Status ${mentorReg.status}`);
    }
    console.log(`✓ Mentor account created: ${testAccounts.mentor.email}\n`);

    // Get tokens
    const stagiaireToken = stagiairereg.body.accessToken;
    const mentorToken = mentorReg.body.accessToken;

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 2: TESTING STAGIAIRE PROFILE     ║');
    console.log('╚════════════════════════════════════════╝\n');

    // GET stagiaire profile
    console.log('1. Testing GET /stagiaire/profil...');
    const getStag = await makeRequest('GET', '/stagiaire/profil', null, stagiaireToken);
    if (getStag.status !== 200) {
      throw new Error(`GET /stagiaire/profil failed: Status ${getStag.status}`);
    }
    console.log(`✓ GET /stagiaire/profil: Status ${getStag.status}`);
    console.log(`  Data: ${JSON.stringify(getStag.body, null, 2).split('\n').slice(0, 3).join('\n')}...\n`);

    // PATCH stagiaire profile
    console.log('2. Testing PATCH /stagiaire/profil...');
    const updateStag = await makeRequest('PATCH', '/stagiaire/profil', {
      telephone: '+33 6 12 34 56 78',
      ecole: 'Université Douala',
      niveauEtudes: 'Master 1',
      bio: 'Développeur passionné par le web'
    }, stagiaireToken);
    if (updateStag.status !== 200) {
      throw new Error(`PATCH /stagiaire/profil failed: Status ${updateStag.status}`);
    }
    console.log(`✓ PATCH /stagiaire/profil: Status ${updateStag.status}`);
    console.log(`  Message: ${updateStag.body.message}\n`);

    // GET updated profile
    console.log('3. Verifying profile update...');
    const getUpdatedStag = await makeRequest('GET', '/stagiaire/profil', null, stagiaireToken);
    if (getUpdatedStag.status !== 200) {
      throw new Error(`GET /stagiaire/profil (verify) failed: Status ${getUpdatedStag.status}`);
    }
    if (getUpdatedStag.body.ecole !== 'Université Douala') {
      throw new Error('Profile update verification failed: ecole not updated');
    }
    console.log(`✓ Profile successfully updated and verified\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 3: TESTING MENTOR PROFILE        ║');
    console.log('╚════════════════════════════════════════╝\n');

    // GET mentor profile
    console.log('1. Testing GET /mentor/profil...');
    const getMentor = await makeRequest('GET', '/mentor/profil', null, mentorToken);
    if (getMentor.status !== 200) {
      throw new Error(`GET /mentor/profil failed: Status ${getMentor.status}`);
    }
    console.log(`✓ GET /mentor/profil: Status ${getMentor.status}`);
    console.log(`  Data: ${JSON.stringify(getMentor.body, null, 2).split('\n').slice(0, 3).join('\n')}...\n`);

    // PATCH mentor profile
    console.log('2. Testing PATCH /mentor/profil...');
    const updateMentor = await makeRequest('PATCH', '/mentor/profil', {
      telephone: '+33 6 98 76 54 32',
      entreprise: 'TechCorp',
      poste: 'Développeur Senior',
      bio: 'Mentor passionné par l\'accompagnement'
    }, mentorToken);
    if (updateMentor.status !== 200) {
      throw new Error(`PATCH /mentor/profil failed: Status ${updateMentor.status}`);
    }
    console.log(`✓ PATCH /mentor/profil: Status ${updateMentor.status}`);
    console.log(`  Message: ${updateMentor.body.message}\n`);

    // GET updated profile
    console.log('3. Verifying profile update...');
    const getUpdatedMentor = await makeRequest('GET', '/mentor/profil', null, mentorToken);
    if (getUpdatedMentor.status !== 200) {
      throw new Error(`GET /mentor/profil (verify) failed: Status ${getUpdatedMentor.status}`);
    }
    if (getUpdatedMentor.body.entreprise !== 'TechCorp') {
      throw new Error('Profile update verification failed: entreprise not updated');
    }
    console.log(`✓ Profile successfully updated and verified\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║ PHASE 4: TESTING ACCESS CONTROL       ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Stagiaire trying to access mentor profile
    console.log('1. Testing stagiaire accessing /mentor/profil (should fail)...');
    const stagAccessMentor = await makeRequest('GET', '/mentor/profil', null, stagiaireToken);
    if (stagAccessMentor.status !== 403) {
      throw new Error(`Access control failed: Expected 403, got ${stagAccessMentor.status}`);
    }
    console.log(`✓ Stagiaire correctly denied access: Status ${stagAccessMentor.status}\n`);

    // Mentor trying to access stagiaire profile
    console.log('2. Testing mentor accessing /stagiaire/profil (should fail)...');
    const mentorAccessStag = await makeRequest('GET', '/stagiaire/profil', null, mentorToken);
    if (mentorAccessStag.status !== 403) {
      throw new Error(`Access control failed: Expected 403, got ${mentorAccessStag.status}`);
    }
    console.log(`✓ Mentor correctly denied access: Status ${mentorAccessStag.status}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('   ✅ ALL PROFILE TESTS PASSED');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error.message);
    process.exit(1);
  }
}

runTests();

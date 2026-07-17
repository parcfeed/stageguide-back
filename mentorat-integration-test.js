#!/usr/bin/env node

/**
 * Module 8 Mentorat Integration Test
 * Verifies student requests, mentor decision responses, and role constraints
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Test accounts
const testStagiaire = {
  email: `stagiaire.mentorat-test.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'STAGIAIRE',
  prenom: 'Stagiaire',
  nom: 'Mentee',
  niveauEtudes: 'Licence 3',
  consentGiven: true
};

const testMentor = {
  email: `mentor.mentorat-test.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'MENTOR',
  prenom: 'Mentor',
  nom: 'Guide',
  consentGiven: true
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
  console.log('   MODULE 8 - MENTORAT ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    // 1. Setup accounts
    console.log('1. Registering test accounts...');
    const stagReg = await makeRequest('POST', '/auth/register', testStagiaire);
    if (stagReg.status !== 201) throw new Error(`Stagiaire signup failed: ${JSON.stringify(stagReg.body)}`);
    const stagToken = stagReg.body.accessToken;

    const mentorReg = await makeRequest('POST', '/auth/register', testMentor);
    if (mentorReg.status !== 201) throw new Error(`Mentor signup failed: ${JSON.stringify(mentorReg.body)}`);
    const mentorToken = mentorReg.body.accessToken;
    console.log('   ✓ Test Stagiaire and Mentor created.');

    // 2. Test GET /stagiaire/mentorat/demandes
    console.log('\n2. Listing student mentoring data (demands, timeline, suggestions)...');
    const stagList = await makeRequest('GET', '/stagiaire/mentorat/demandes', null, stagToken);
    if (stagList.status !== 200) throw new Error(`Failed listing student mentoring demands: ${stagList.status}`);
    console.log(`   ✓ Success 200. Student ID: ${stagList.body.stagiaireId}`);
    if (!Array.isArray(stagList.body.timeline)) throw new Error('Expected timeline steps array');

    // 3. Test POST /stagiaire/mentorat/demandes
    console.log('\n3. Student creating mentoring request...');
    const createReq = await makeRequest('POST', '/stagiaire/mentorat/demandes', {
      mentorId: 'mock-mentor-uuid',
      message: 'Je souhaite être guidé en développement backend avec Node.js/NestJS.'
    }, stagToken);
    if (createReq.status !== 201) throw new Error(`Failed creating demand: ${createReq.status} - ${JSON.stringify(createReq.body)}`);
    console.log(`   ✓ Created request. ID: ${createReq.body.id}, Status: ${createReq.body.statut}`);

    // 4. Test GET /mentor/mentorat/demandes
    console.log('\n4. Mentor listing received requests...');
    const mentorList = await makeRequest('GET', '/mentor/mentorat/demandes', null, mentorToken);
    if (mentorList.status !== 200) throw new Error(`Failed listing mentor requests: ${mentorList.status}`);
    console.log(`   ✓ Success 200. Mentor ID: ${mentorList.body.mentorId}`);

    // 5. Test PATCH /mentor/mentorat/demandes/:id/reponse
    console.log('\n5. Mentor responding to request...');
    const repondRes = await makeRequest('PATCH', '/mentor/mentorat/demandes/some-demande-uuid/reponse', {
      decision: 'ACCEPTEE'
    }, mentorToken);
    if (repondRes.status !== 200) throw new Error(`Failed to record decision: ${repondRes.status}`);
    console.log(`   ✓ Decision registered. Message: "${repondRes.body.message}"`);

    // 6. Test GET /mentor/stagiaires
    console.log('\n6. Mentor listing mentees...');
    const menteesRes = await makeRequest('GET', '/mentor/stagiaires', null, mentorToken);
    if (menteesRes.status !== 200) throw new Error(`Failed listing mentees: ${menteesRes.status}`);
    console.log(`   ✓ Success 200. Count: ${menteesRes.body.stagiaires.length}`);

    // 7. Security: role restriction check for Stagiaire on Mentor route
    console.log('\n7. Checking security: Stagiaire trying to access Mentor demands...');
    const failStag = await makeRequest('GET', '/mentor/mentorat/demandes', null, stagToken);
    console.log(`   ✓ Stagiaire on Mentor route returned status: ${failStag.status}`);
    if (failStag.status !== 403) throw new Error('Expected 403 Forbidden for student on mentor endpoint');

    // 8. Security: role restriction check for Mentor on Stagiaire route
    console.log('\n8. Checking security: Mentor trying to access Stagiaire demands...');
    const failMentor = await makeRequest('GET', '/stagiaire/mentorat/demandes', null, mentorToken);
    console.log(`   ✓ Mentor on Stagiaire route returned status: ${failMentor.status}`);
    if (failMentor.status !== 403) throw new Error('Expected 403 Forbidden for mentor on student endpoint');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();

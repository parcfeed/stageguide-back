#!/usr/bin/env node

/**
 * Module 7 Entreprise Integration Test
 * Tests CRUD offers, list candidatures, plan interviews
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Test accounts
const testStagiaire = {
  email: `stagiaire.entreprise-test.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'STAGIAIRE',
  prenom: 'Candidat',
  nom: 'Test',
  niveauEtudes: 'Master 1',
  consentGiven: true
};

const testEntreprise = {
  email: `entreprise.entreprise-test.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'ENTREPRISE',
  prenom: 'Recruteur',
  nom: 'Test',
  entreprise: 'RecruitInc',
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
  console.log('   MODULE 7 - ENTREPRISE ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    // 1. Setup accounts
    console.log('1. Registering test accounts...');
    const stagReg = await makeRequest('POST', '/auth/register', testStagiaire);
    if (stagReg.status !== 201) throw new Error('Stagiaire signup failed');
    const stagToken = stagReg.body.accessToken;

    const entReg = await makeRequest('POST', '/auth/register', testEntreprise);
    if (entReg.status !== 201) throw new Error('Entreprise signup failed');
    const entToken = entReg.body.accessToken;
    console.log('   ✓ Test Stagiaire and Entreprise created.');

    // 2. Test POST /entreprise/offres-stage (This creates the partner profile lazily)
    console.log('\n2. Creating new internship offer...');
    const createStageRes = await makeRequest('POST', '/entreprise/offres-stage', {
      titre: 'Stage Fullstack Node/Angular',
      description: 'Nous cherchons un stagiaire motivé pour concevoir des features.',
      ville: 'Yaoundé',
      domaine: 'Développement Web',
      duree: '6 mois',
      remote: true
    }, entToken);
    if (createStageRes.status !== 201) throw new Error('Create stage offer failed');
    const stageId = createStageRes.body.id;
    console.log(`   ✓ Created offer: "${createStageRes.body.titre}" with ID: ${stageId}`);

    // 3. Test GET /entreprise/offres-stage
    console.log('\n3. Listing internship offers...');
    const listStageEmpty = await makeRequest('GET', '/entreprise/offres-stage', null, entToken);
    if (listStageEmpty.status !== 200) throw new Error('Failed listing stages');
    console.log(`   ✓ Status 200. Count: ${listStageEmpty.body.length}`);

    // 4. Test PATCH /entreprise/offres-stage/:id (Edit)
    console.log('\n4. Modifying internship offer...');
    const editStageRes = await makeRequest('PATCH', `/entreprise/offres-stage/${stageId}`, {
      titre: 'Stage Fullstack TypeScript (Angular/NestJS)'
    }, entToken);
    if (editStageRes.status !== 200) throw new Error('Edit stage offer failed');
    console.log(`   ✓ Modified. New title: "${editStageRes.body.titre}"`);

    // 5. Test CRUD for Job Offer
    console.log('\n5. Creating new job offer...');
    const createJobRes = await makeRequest('POST', '/entreprise/offres-emploi', {
      titre: 'Lead Developer NestJS',
      description: 'Recherche d un développeur expérimenté sur NestJS et Clean Architecture.',
      ville: 'Douala',
      domaine: 'Backend',
      typeContrat: 'CDI',
      experience: '5 ans',
      remote: false
    }, entToken);
    if (createJobRes.status !== 201) throw new Error('Create job offer failed');
    const jobId = createJobRes.body.id;
    console.log(`   ✓ Created job offer: "${createJobRes.body.titre}" with ID: ${jobId}`);

    console.log('\n6. Modifying job offer...');
    const editJobRes = await makeRequest('PATCH', `/entreprise/offres-emploi/${jobId}`, {
      remote: true
    }, entToken);
    if (editJobRes.status !== 200) throw new Error('Edit job offer failed');
    console.log(`   ✓ Modified. Télétravail autorisé: ${editJobRes.body.remote}`);

    // 6. Test GET /entreprise/offres-stage and GET /entreprise/offres-emploi
    console.log('\n7. Verifying lists contain active offers...');
    const listStage = await makeRequest('GET', '/entreprise/offres-stage', null, entToken);
    const listJob = await makeRequest('GET', '/entreprise/offres-emploi', null, entToken);
    console.log(`   ✓ Stage offers count: ${listStage.body.length}`);
    console.log(`   ✓ Job offers count: ${listJob.body.length}`);

    // 7. Role restriction checks: Stagiaire cannot access /entreprise/offres-stage
    console.log('\n8. Checking role guards (Stagiaire accessing company offers)...');
    const forbiddenRes = await makeRequest('GET', '/entreprise/offres-stage', null, stagToken);
    console.log(`   ✓ Server returned status: ${forbiddenRes.status}`);
    if (forbiddenRes.status !== 403) throw new Error('Expected 403 Forbidden for Stagiaire on company endpoint');

    // 8. Stagiaire applies to the offer
    console.log('\n9. Stagiaire applying to the internship offer...');
    const applyRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreStageId: stageId,
      message: 'Voici ma candidature spontanée.'
    }, stagToken);
    if (applyRes.status !== 201) throw new Error('Apply failed');
    const candId = applyRes.body.id;
    console.log(`   ✓ Candidature created with ID: ${candId}`);

    // 9. Entreprise list candidatures
    console.log('\n10. Listing candidatures received by the company...');
    const candList = await makeRequest('GET', '/entreprise/candidatures', null, entToken);
    if (candList.status !== 200) throw new Error('Failed to list candidatures');
    console.log(`    ✓ Total candidatures received: ${candList.body.length}`);
    const foundCand = candList.body.find(c => c.id === candId);
    if (foundCand) {
      console.log(`    ✓ Found candidature. Candidate: "${foundCand.utilisateur?.prenom} ${foundCand.utilisateur?.nom}"`);
      console.log(`    ✓ Motivation message: "${foundCand.message}"`);
    } else {
      throw new Error('Newly created candidature not returned in company list');
    }

    // 10. Entreprise schedules interview
    console.log('\n11. Scheduling an interview for the candidate...');
    const planRes = await makeRequest('POST', '/entreprise/entretiens', {
      candidatureId: candId,
      dateProposee: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      lieu: 'Microsoft Teams Link',
      message: 'Préparez vos réalisations.'
    }, entToken);
    if (planRes.status !== 201) throw new Error(`Plan interview failed: ${JSON.stringify(planRes.body)}`);
    console.log(`    ✓ Interview scheduled successfully. ID: ${planRes.body.id}`);

    // 11. Entreprise lists interviews
    console.log('\n12. Listing scheduled interviews...');
    const intList = await makeRequest('GET', '/entreprise/entretiens', null, entToken);
    if (intList.status !== 200) throw new Error('Failed to list interviews');
    console.log(`    ✓ Total interviews: ${intList.body.length}`);
    const foundInt = intList.body.find(i => i.candidatureId === candId);
    if (foundInt) {
      console.log(`    ✓ Found interview. Candidate Name: "${foundInt.candidature?.utilisateur?.prenom}"`);
      console.log(`    ✓ Venue: "${foundInt.lieu}"`);
    } else {
      throw new Error('Newly scheduled interview not returned in company list');
    }

    // 12. Test Archive Offer
    console.log('\n13. Archiving internship offer...');
    const archiveStageRes = await makeRequest('PATCH', `/entreprise/offres-stage/${stageId}/archive`, null, entToken);
    if (archiveStageRes.status !== 200) throw new Error('Archive stage offer failed');
    console.log(`    ✓ Archiving completed. Tâche isArchived: ${archiveStageRes.body.isArchived}`);

    // Verify it doesn't show in active lists
    const listStagePostArchive = await makeRequest('GET', '/entreprise/offres-stage', null, entToken);
    console.log(`    ✓ Active stage offers count post-archive: ${listStagePostArchive.body.length} (Expected: 0)`);
    if (listStagePostArchive.body.length !== 0) throw new Error('Offer still returned in active list post-archive');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();

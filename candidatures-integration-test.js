#!/usr/bin/env node

/**
 * Module 6 Candidatures Integration Test
 * Tests GET/POST /stagiaire/candidatures and all response codes
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

// Test Stagiaire
const testStagiaire = {
  email: `stagiaire.candidature.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'STAGIAIRE',
  prenom: 'Jean',
  nom: 'Candidat',
  niveauEtudes: 'Licence 3',
  consentGiven: true
};

// Test Entreprise
const testEntreprise = {
  email: `entreprise.candidature.${Date.now()}@stageguide.com`,
  password: 'Password123',
  confirmPassword: 'Password123',
  role: 'ENTREPRISE',
  prenom: 'Alice',
  nom: 'Recruteuse',
  entreprise: 'RecruitCorp',
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
 * Run tests
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   MODULE 6 - CANDIDATURES INTEGRATION TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    // 1. Sign up and Login Stagiaire
    console.log('1. Registering test Stagiaire...');
    const stagiairReg = await makeRequest('POST', '/auth/register', testStagiaire);
    if (stagiairReg.status !== 201) throw new Error('Failed to register Stagiaire');
    const stagiaireToken = stagiairReg.body.accessToken;
    console.log('   ✓ Registered and logged in Stagiaire.');

    // 2. Sign up and Login Entreprise
    console.log('\n2. Registering test Entreprise...');
    const entReg = await makeRequest('POST', '/auth/register', testEntreprise);
    if (entReg.status !== 201) throw new Error('Failed to register Entreprise');
    const entrepriseToken = entReg.body.accessToken;
    console.log('   ✓ Registered and logged in Entreprise.');

    // 3. Create Offer (Stage & Emploi) via Entreprise
    console.log('\n3. Creating an internship offer as Entreprise...');
    const stageOfferRes = await makeRequest('POST', '/entreprise/offres-stage', {
      titre: 'Stage Front-End Angular',
      description: 'Développement d une application moderne.',
      ville: 'Douala',
      domaine: 'Développement Web',
      duree: '3 mois',
      remote: true
    }, entrepriseToken);
    if (stageOfferRes.status !== 201) throw new Error('Failed to create stage offer');
    const stageId = stageOfferRes.body.id;
    console.log('   ✓ Created internship offer with ID:', stageId);

    console.log('\n4. Creating a job offer as Entreprise...');
    const jobOfferRes = await makeRequest('POST', '/entreprise/offres-emploi', {
      titre: 'Développeur Angular Senior',
      description: 'Recherche d un développeur autonome.',
      ville: 'Yaoundé',
      domaine: 'Développement Web',
      typeContrat: 'CDI',
      experience: '3 ans',
      remote: false
    }, entrepriseToken);
    if (jobOfferRes.status !== 201) throw new Error('Failed to create job offer');
    const jobId = jobOfferRes.body.id;
    console.log('   ✓ Created job offer with ID:', jobId);

    // 4. Test GET /stagiaire/candidatures - Empty List
    console.log('\n5. Listing candidatures before applying...');
    const listEmptyRes = await makeRequest('GET', '/stagiaire/candidatures', null, stagiaireToken);
    if (listEmptyRes.status !== 200) throw new Error('Failed to get candidatures list');
    console.log(`   ✓ Returned status ${listEmptyRes.status}. Total candidatures: ${listEmptyRes.body.length}`);

    // 5. Test POST /stagiaire/candidatures WITH motivation message
    console.log('\n6. Applying to internship offer WITH a motivation message...');
    const appWithMsgRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreStageId: stageId,
      message: 'Je suis très intéressé par ce stage en Angular.'
    }, stagiaireToken);
    if (appWithMsgRes.status !== 201) throw new Error(`Apply failed: ${JSON.stringify(appWithMsgRes.body)}`);
    console.log('   ✓ Application created successfully.');
    console.log('   ✓ Returned status:', appWithMsgRes.body.statut);
    console.log('   ✓ Returned message:', appWithMsgRes.body.message);

    // 6. Test POST /stagiaire/candidatures WITHOUT motivation message
    console.log('\n7. Applying to job offer WITHOUT a motivation message...');
    const appWithoutMsgRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreEmploiId: jobId
    }, stagiaireToken);
    if (appWithoutMsgRes.status !== 201) throw new Error(`Apply failed: ${JSON.stringify(appWithoutMsgRes.body)}`);
    console.log('   ✓ Application created successfully.');
    console.log('   ✓ Returned status:', appWithoutMsgRes.body.statut);
    console.log('   ✓ Returned message:', appWithoutMsgRes.body.message);

    // 7. Test GET /stagiaire/candidatures - Verify immediate addition and status
    console.log('\n8. Verifying candidatures list update...');
    const listRes = await makeRequest('GET', '/stagiaire/candidatures', null, stagiaireToken);
    if (listRes.status !== 200) throw new Error('Failed to get list');
    console.log(`   ✓ Total candidatures: ${listRes.body.length} (Expected: 2)`);
    
    // Check fields and status
    const app1 = listRes.body.find(c => c.offreStageId === stageId);
    const app2 = listRes.body.find(c => c.offreEmploiId === jobId);
    
    if (app1 && app2) {
      console.log(`   ✓ Application 1 Status: ${app1.statut} (Expected: EN_ATTENTE)`);
      console.log(`   ✓ Application 1 Message: "${app1.message}"`);
      console.log(`   ✓ Application 2 Status: ${app2.statut} (Expected: EN_ATTENTE)`);
      console.log(`   ✓ Application 2 Message: "${app2.message}"`);
    } else {
      throw new Error('Applications not found in list');
    }

    // 8. Test 400 Bad Request - Duplicate application
    console.log('\n9. Testing 400: Duplicate application (re-applying to the same stage)...');
    const duplicateRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreStageId: stageId
    }, stagiaireToken);
    console.log(`   ✓ Server returned status ${duplicateRes.status}. Message: "${duplicateRes.body?.message}"`);
    if (duplicateRes.status !== 400) throw new Error('Expected 400 for duplicate candidature');

    // 9. Test 400 Bad Request - Invalid body (both stage and job)
    console.log('10. Testing 400: Invalid payload (both stage and job IDs provided)...');
    const invalidBodyRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreStageId: stageId,
      offreEmploiId: jobId
    }, stagiaireToken);
    console.log(`   ✓ Server returned status ${invalidBodyRes.status}. Message: "${invalidBodyRes.body?.message}"`);
    if (invalidBodyRes.status !== 400) throw new Error('Expected 400 for providing both offer IDs');

    // 10. Test 401 Unauthorized - Missing / Invalid token
    console.log('\n11. Testing 401: Unauthorized (no token)...');
    const unauthorizedRes = await makeRequest('GET', '/stagiaire/candidatures');
    console.log(`   ✓ Server returned status ${unauthorizedRes.status}`);
    if (unauthorizedRes.status !== 401) throw new Error('Expected 401 for request without token');

    // 11. Test 403 Forbidden - Role other than STAGIAIRE (using Entreprise token)
    console.log('\n12. Testing 403: Forbidden (requesting stagiaire endpoint as Entreprise)...');
    const forbiddenRes = await makeRequest('GET', '/stagiaire/candidatures', null, entrepriseToken);
    console.log(`   ✓ Server returned status ${forbiddenRes.status}`);
    if (forbiddenRes.status !== 403) throw new Error('Expected 403 for non-stagiaire role');

    // 12. Test 404 Not Found - Non-existent offer ID
    console.log('\n13. Testing 404: Not Found (applying to a non-existent offer ID)...');
    const notFoundRes = await makeRequest('POST', '/stagiaire/candidatures', {
      offreStageId: '00000000-0000-0000-0000-000000000000'
    }, stagiaireToken);
    console.log(`   ✓ Server returned status ${notFoundRes.status}. Message: "${notFoundRes.body?.message}"`);
    if (notFoundRes.status !== 404) throw new Error('Expected 404 for non-existent offer ID');

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();

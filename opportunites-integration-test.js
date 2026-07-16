#!/usr/bin/env node

/**
 * Module 4 Opportunités Integration Test
 * Tests GET /opportunites/offres-stage and GET /opportunites/offres-emploi
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

/**
 * Make HTTP request
 */
function makeRequest(method, path) {
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
  console.log('   MODULE 4 - OPPORTUNITES ENDPOINTS TEST');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    // Test GET /opportunites/offres-stage
    console.log('Testing GET /opportunites/offres-stage...');
    const stageRes = await makeRequest('GET', '/opportunites/offres-stage');
    if (stageRes.status === 200) {
      console.log('  ✓ GET /opportunites/offres-stage returned 200 OK');
      console.log('  ✓ Returned filters:', JSON.stringify(stageRes.body.filtres));
      console.log('  ✓ Returned offers count:', stageRes.body.offres.length);
    } else {
      console.log(`  ✗ GET /opportunites/offres-stage failed with status ${stageRes.status}`);
      process.exit(1);
    }

    // Test GET /opportunites/offres-stage with query parameters
    console.log('\nTesting GET /opportunites/offres-stage?search=Angular&ville=Douala&remote=true...');
    const stageQueryRes = await makeRequest('GET', '/opportunites/offres-stage?search=Angular&ville=Douala&remote=true');
    if (stageQueryRes.status === 200) {
      console.log('  ✓ GET /opportunites/offres-stage?search=Angular&ville=Douala&remote=true returned 200 OK');
      console.log('  ✓ Returned filters:', JSON.stringify(stageQueryRes.body.filtres));
    } else {
      console.log(`  ✗ GET with query parameters failed with status ${stageQueryRes.status}`);
      process.exit(1);
    }

    // Test GET /opportunites/offres-emploi
    console.log('\nTesting GET /opportunites/offres-emploi...');
    const emploiRes = await makeRequest('GET', '/opportunites/offres-emploi');
    if (emploiRes.status === 200) {
      console.log('  ✓ GET /opportunites/offres-emploi returned 200 OK');
      console.log('  ✓ Returned filters:', JSON.stringify(emploiRes.body.filtres));
      console.log('  ✓ Returned offers count:', emploiRes.body.offres.length);
    } else {
      console.log(`  ✗ GET /opportunites/offres-emploi failed with status ${emploiRes.status}`);
      process.exit(1);
    }

    // Test GET /opportunites/offres-emploi with query parameters
    console.log('\nTesting GET /opportunites/offres-emploi?search=NestJS&ville=Yaounde&remote=false...');
    const emploiQueryRes = await makeRequest('GET', '/opportunites/offres-emploi?search=NestJS&ville=Yaounde&remote=false');
    if (emploiQueryRes.status === 200) {
      console.log('  ✓ GET /opportunites/offres-emploi?search=NestJS&ville=Yaounde&remote=false returned 200 OK');
      console.log('  ✓ Returned filters:', JSON.stringify(emploiQueryRes.body.filtres));
    } else {
      console.log(`  ✗ GET with query parameters failed with status ${emploiQueryRes.status}`);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTests();

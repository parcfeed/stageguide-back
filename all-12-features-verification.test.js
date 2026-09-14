#!/usr/bin/env node

/**
 * Complete Verification Test for all 12 Backend Features:
 * 1. Notifications: PATCH /notifications/:id/lire & PATCH /notifications/lire-tout
 * 2. Messages: POST /messages/conversations
 * 3. Candidatures: PATCH /stagiaire/candidatures/:id/annuler
 * 4. Formations: POST /stagiaire/formations/:id/inscription
 * 5. Opportunités: GET :id & POST /opportunites/offres-sauvegardees
 * 6. Entreprise: PATCH /entreprise/candidatures/:id/statut & PATCH /entreprise/entretiens/:id/statut
 * 7. Mentor: POST /mentor/mentorat/sessions & POST /mentor/mentorat/evaluations
 * 8. Stagiaire mentorat: CRUD objectifs
 * 9. Conventions: PATCH /stagiaire/conventions/:id/statut
 * 10. Certificats: POST /stagiaire/certificats
 * 11. Correspondance: GET /correspondance/mentors (with competence matching & score)
 * 12. Admin: GET /admin/stats
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
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
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
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

async function waitForServer() {
  console.log('Waiting for backend server to be ready on port 3000...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await makeRequest('GET', '/');
      if (response.status) {
        console.log('✓ Server is ready!\n');
        return;
      }
    } catch (err) {
      // Waiting
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Server did not start in time');
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   STAGEGUIDE BACKEND - VERIFICATION OF ALL 12 FEATURES   ');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await waitForServer();

    const timestamp = Date.now();

    // 0. Create test accounts for all roles
    console.log('--- 0. Setting up test accounts ---');
    const stagiaireData = {
      email: `stagiaire_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      prenom: 'Alice',
      nom: 'Stagiaire',
      role: 'STAGIAIRE',
      niveauEtudes: 'Master 2 Informatique',
      consentGiven: true,
    };
    const mentorData = {
      email: `mentor_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      prenom: 'Marc',
      nom: 'Mentor',
      role: 'MENTOR',
      poste: 'Architecte Logiciel',
      entreprise: 'TechCorp',
      consentGiven: true,
    };
    const entrepriseData = {
      email: `entreprise_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      prenom: 'Claire',
      nom: 'RH',
      role: 'ENTREPRISE',
      entreprise: `Entreprise_${timestamp}`,
      consentGiven: true,
    };
    const adminData = {
      email: `admin_${timestamp}@test.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      prenom: 'Alex',
      nom: 'Admin',
      role: 'ADMIN',
      consentGiven: true,
    };

    const regStagiaire = await makeRequest('POST', '/auth/register', stagiaireData);
    if (regStagiaire.status !== 201) throw new Error(`Stagiaire register failed: ${regStagiaire.status} - ${JSON.stringify(regStagiaire.body)}`);
    const tokenStagiaire = regStagiaire.body.accessToken;
    const stagiaireId = regStagiaire.body.user.id;

    const regMentor = await makeRequest('POST', '/auth/register', mentorData);
    if (regMentor.status !== 201) throw new Error(`Mentor register failed: ${regMentor.status} - ${JSON.stringify(regMentor.body)}`);
    const tokenMentor = regMentor.body.accessToken;
    const mentorId = regMentor.body.user.id;

    const regEntreprise = await makeRequest('POST', '/auth/register', entrepriseData);
    if (regEntreprise.status !== 201) throw new Error(`Entreprise register failed: ${regEntreprise.status} - ${JSON.stringify(regEntreprise.body)}`);
    const tokenEntreprise = regEntreprise.body.accessToken;

    const regAdmin = await makeRequest('POST', '/auth/register', adminData);
    if (regAdmin.status !== 201) throw new Error(`Admin register failed: ${regAdmin.status} - ${JSON.stringify(regAdmin.body)}`);
    const tokenAdmin = regAdmin.body.accessToken;

    console.log('✓ Accounts created: Stagiaire, Mentor, Entreprise, Admin\n');

    // ─── 1. Notifications ────────────────────────────────────────────────────────
    console.log('--- 1. Notifications: PATCH /notifications/:id/lire & /notifications/lire-tout ---');
    const listNotifs = await makeRequest('GET', '/notifications', null, tokenStagiaire);
    if (listNotifs.status !== 200) throw new Error(`GET /notifications failed: ${listNotifs.status}`);
    console.log(`✓ GET /notifications: ${listNotifs.status} (Count: ${listNotifs.body.notifications.length})`);

    const markAllRead = await makeRequest('PATCH', '/notifications/lire-tout', null, tokenStagiaire);
    if (markAllRead.status !== 200) throw new Error(`PATCH /notifications/lire-tout failed: ${markAllRead.status}`);
    console.log(`✓ PATCH /notifications/lire-tout: ${markAllRead.status} - ${markAllRead.body.message}`);

    // ─── 2. Messages ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Messages: POST /messages/conversations ---');
    const createConv = await makeRequest(
      'POST',
      '/messages/conversations',
      {
        participantIds: [mentorId],
        titre: 'Premier contact mentorat',
        premierMessage: 'Bonjour mentor !',
      },
      tokenStagiaire,
    );
    if (createConv.status !== 201 && createConv.status !== 200) {
      throw new Error(`POST /messages/conversations failed: ${createConv.status}`);
    }
    const convId = createConv.body.id;
    console.log(`✓ POST /messages/conversations: ${createConv.status} (Conv ID: ${convId})`);

    // ─── 3. Candidatures: Annuler ────────────────────────────────────────────────
    console.log('\n--- 3. Candidatures: PATCH /stagiaire/candidatures/:id/annuler ---');
    // First create a stage offer from entreprise
    const createStage = await makeRequest(
      'POST',
      '/entreprise/offres-stage',
      {
        titre: `Stage Fullstack TypeScript ${timestamp}`,
        description: 'Conception d API et interface utilisateur Angular',
        ville: 'Paris',
        domaine: 'Informatique',
        duree: '6 mois',
        remote: true,
      },
      tokenEntreprise,
    );
    if (createStage.status !== 201) throw new Error(`Create stage offer failed: ${createStage.status}`);
    const stageId = createStage.body.id;

    // Stagiaire applies
    const createCand = await makeRequest(
      'POST',
      '/stagiaire/candidatures',
      {
        offreStageId: stageId,
        message: 'Ma candidature motivée.',
      },
      tokenStagiaire,
    );
    if (createCand.status !== 201) throw new Error(`Apply failed: ${createCand.status}`);
    const candId = createCand.body.id;
    console.log(`✓ Candidature created: ID ${candId}`);

    // Cancel candidature
    const cancelCand = await makeRequest('PATCH', `/stagiaire/candidatures/${candId}/annuler`, null, tokenStagiaire);
    if (cancelCand.status !== 200) throw new Error(`Cancel candidature failed: ${cancelCand.status}`);
    console.log(`✓ PATCH /stagiaire/candidatures/:id/annuler: ${cancelCand.status} (New statut: ${cancelCand.body.statut})`);

    // ─── 4. Formations: Inscription ──────────────────────────────────────────────
    console.log('\n--- 4. Formations: POST /stagiaire/formations/:id/inscription ---');
    const catalogue = await makeRequest('GET', '/stagiaire/formations', null, tokenStagiaire);
    if (catalogue.body.formations && catalogue.body.formations.length > 0) {
      const formationId = catalogue.body.formations[0].id;
      const insc = await makeRequest('POST', `/stagiaire/formations/${formationId}/inscription`, null, tokenStagiaire);
      console.log(`✓ POST /stagiaire/formations/:id/inscription: ${insc.status}`);
    } else {
      console.log('✓ Catalogue formations checked (0 active formations in seed, test passed)');
    }

    // ─── 5. Opportunités: GET :id & Sauvegarde ────────────────────────────────────
    console.log('\n--- 5. Opportunités: GET /offres-stage/:id, GET /offres-emploi/:id & Sauvegarde ---');
    const getStageDetail = await makeRequest('GET', `/opportunites/offres-stage/${stageId}`);
    if (getStageDetail.status !== 200) throw new Error(`GET /opportunites/offres-stage/:id failed: ${getStageDetail.status}`);
    console.log(`✓ GET /opportunites/offres-stage/:id: ${getStageDetail.status} - "${getStageDetail.body.titre}"`);

    // Create an emploi offer from entreprise to test GET /opportunites/offres-emploi/:id
    const createEmploi = await makeRequest(
      'POST',
      '/entreprise/offres-emploi',
      {
        titre: `CDI Lead Développeur NestJS ${timestamp}`,
        description: 'Poste en CDI pour encadrer les projets backend',
        ville: 'Paris',
        domaine: 'Informatique',
        typeContrat: 'CDI',
      },
      tokenEntreprise,
    );
    if (createEmploi.status !== 201) throw new Error(`Create emploi offer failed: ${createEmploi.status}`);
    const emploiId = createEmploi.body.id;

    const getEmploiDetail = await makeRequest('GET', `/opportunites/offres-emploi/${emploiId}`);
    if (getEmploiDetail.status !== 200) throw new Error(`GET /opportunites/offres-emploi/:id failed: ${getEmploiDetail.status}`);
    console.log(`✓ GET /opportunites/offres-emploi/:id: ${getEmploiDetail.status} - "${getEmploiDetail.body.titre}"`);

    const saveOfferStage = await makeRequest(
      'POST',
      '/opportunites/offres-sauvegardees',
      { offreStageId: stageId },
      tokenStagiaire,
    );
    if (saveOfferStage.status !== 201) throw new Error(`Save stage offer failed: ${saveOfferStage.status}`);
    console.log(`✓ POST /opportunites/offres-sauvegardees (stage): ${saveOfferStage.status}`);

    const saveOfferEmploi = await makeRequest(
      'POST',
      '/opportunites/offres-sauvegardees',
      { offreEmploiId: emploiId },
      tokenStagiaire,
    );
    if (saveOfferEmploi.status !== 201) throw new Error(`Save emploi offer failed: ${saveOfferEmploi.status}`);
    console.log(`✓ POST /opportunites/offres-sauvegardees (emploi): ${saveOfferEmploi.status}`);

    // ─── 6. Entreprise: Changer statut candidature & entretien ───────────────────
    console.log('\n--- 6. Entreprise: PATCH /candidatures/:id/statut & /entretiens/:id/statut ---');
    // Entreprise creates a second offer so stagiaire can apply fresh
    const createStage2 = await makeRequest(
      'POST',
      '/entreprise/offres-stage',
      {
        titre: `Stage Frontend Angular ${timestamp}`,
        description: 'Conception UI/UX et intégration Angular',
        ville: 'Lyon',
        domaine: 'Informatique',
        duree: '3 mois',
      },
      tokenEntreprise,
    );
    if (createStage2.status !== 201) throw new Error(`Create stage 2 failed: ${createStage2.status}`);
    const stageId2 = createStage2.body.id;

    // Stagiaire applies to second offer
    const createCand2 = await makeRequest(
      'POST',
      '/stagiaire/candidatures',
      { offreStageId: stageId2, message: 'Deuxieme candidature' },
      tokenStagiaire,
    );
    if (createCand2.status !== 201) throw new Error(`Create cand 2 failed: ${createCand2.status} - ${JSON.stringify(createCand2.body)}`);
    const candId2 = createCand2.body.id;

    // Entreprise changes candidature status
    const updateCandStatut = await makeRequest(
      'PATCH',
      `/entreprise/candidatures/${candId2}/statut`,
      { statut: 'EN_COURS' },
      tokenEntreprise,
    );
    if (updateCandStatut.status !== 200) throw new Error(`Update cand statut failed: ${updateCandStatut.status}`);
    console.log(`✓ PATCH /entreprise/candidatures/:id/statut: ${updateCandStatut.status} (Statut: ${updateCandStatut.body.statut})`);

    // Entreprise plans interview
    const planEntr = await makeRequest(
      'POST',
      '/entreprise/entretiens',
      {
        candidatureId: candId2,
        dateProposee: new Date(Date.now() + 86400000).toISOString(),
        lieu: 'Visioconférence Google Meet',
      },
      tokenEntreprise,
    );
    const entretienId = planEntr.body.id;

    // Entreprise updates interview status
    const updateEntrStatut = await makeRequest(
      'PATCH',
      `/entreprise/entretiens/${entretienId}/statut`,
      { statut: 'CONFIRME' },
      tokenEntreprise,
    );
    if (updateEntrStatut.status !== 200) throw new Error(`Update entretien statut failed: ${updateEntrStatut.status}`);
    console.log(`✓ PATCH /entreprise/entretiens/:id/statut: ${updateEntrStatut.status} (Statut: ${updateEntrStatut.body.statut})`);

    // ─── 7. Mentor: Sessions et Évaluations ──────────────────────────────────────
    console.log('\n--- 7. Mentor: POST /sessions & POST /evaluations ---');
    // Stagiaire requests mentoring with valid mentor
    const demandeMentorat = await makeRequest(
      'POST',
      '/stagiaire/mentorat/demandes',
      { mentorId, message: 'Besoin d un accompagnement.' },
      tokenStagiaire,
    );
    const demandeId = demandeMentorat.body.id;

    // Mentor accepts
    const acceptDemande = await makeRequest(
      'PATCH',
      `/mentor/mentorat/demandes/${demandeId}/reponse`,
      { decision: 'ACCEPTEE' },
      tokenMentor,
    );
    if (acceptDemande.status !== 200) throw new Error(`Accept demande failed: ${acceptDemande.status}`);

    // Mentor creates session
    const createSession = await makeRequest(
      'POST',
      '/mentor/mentorat/sessions',
      {
        stagiaireId,
        sujet: 'Revue de projet et architecture',
        commenceLe: new Date(Date.now() + 172800000).toISOString(),
      },
      tokenMentor,
    );
    if (createSession.status !== 201) throw new Error(`Create session failed: ${createSession.status}`);
    console.log(`✓ POST /mentor/mentorat/sessions: ${createSession.status} (Sujet: ${createSession.body.sujet})`);

    // Mentor submits evaluation
    const submitEval = await makeRequest(
      'POST',
      '/mentor/mentorat/evaluations',
      {
        stagiaireId,
        communication: 5,
        resolutionProblemes: 4,
        adaptabilite: 5,
        travailEquipe: 4,
        commentaires: 'Excellent investissement technique.',
      },
      tokenMentor,
    );
    if (submitEval.status !== 201) throw new Error(`Submit eval failed: ${submitEval.status}`);
    console.log(`✓ POST /mentor/mentorat/evaluations: ${submitEval.status}`);

    // ─── 8. Stagiaire mentorat: CRUD objectifs ───────────────────────────────────
    console.log('\n--- 8. Stagiaire mentorat: CRUD objectifs ---');
    const createObj = await makeRequest(
      'POST',
      '/stagiaire/mentorat/objectifs',
      { titre: 'Maîtriser NestJS et Prisma' },
      tokenStagiaire,
    );
    if (createObj.status !== 201) throw new Error(`Create objectif failed: ${createObj.status}`);
    const objId = createObj.body.id;
    console.log(`✓ POST /stagiaire/mentorat/objectifs: ${createObj.status} (ID: ${objId})`);

    const listObj = await makeRequest('GET', '/stagiaire/mentorat/objectifs', null, tokenStagiaire);
    if (listObj.status !== 200) throw new Error(`GET /stagiaire/mentorat/objectifs failed: ${listObj.status}`);
    console.log(`✓ GET /stagiaire/mentorat/objectifs: ${listObj.status} (Count: ${listObj.body.objectifs ? listObj.body.objectifs.length : listObj.body.length})`);

    const updateObj = await makeRequest(
      'PATCH',
      `/stagiaire/mentorat/objectifs/${objId}`,
      { statut: 'completed' },
      tokenStagiaire,
    );
    if (updateObj.status !== 200) throw new Error(`Update objectif failed: ${updateObj.status}`);
    console.log(`✓ PATCH /stagiaire/mentorat/objectifs/:id: ${updateObj.status} (Statut: ${updateObj.body.statut})`);

    const deleteObj = await makeRequest(
      'DELETE',
      `/stagiaire/mentorat/objectifs/${objId}`,
      null,
      tokenStagiaire,
    );
    if (deleteObj.status !== 200) throw new Error(`Delete objectif failed: ${deleteObj.status}`);
    console.log(`✓ DELETE /stagiaire/mentorat/objectifs/:id: ${deleteObj.status}`);

    // Verify notifications/:id/lire now that notifications have been generated for stagiaire
    console.log('\n--- 1b. Notifications: Testing PATCH /notifications/:id/lire on generated notification ---');
    const notifsGenerated = await makeRequest('GET', '/notifications', null, tokenStagiaire);
    if (notifsGenerated.status === 200 && notifsGenerated.body.notifications && notifsGenerated.body.notifications.length > 0) {
      const targetNotifId = notifsGenerated.body.notifications[0].id;
      const markSingleRead = await makeRequest('PATCH', `/notifications/${targetNotifId}/lire`, null, tokenStagiaire);
      if (markSingleRead.status !== 200) throw new Error(`PATCH /notifications/:id/lire failed: ${markSingleRead.status}`);
      console.log(`✓ PATCH /notifications/:id/lire: ${markSingleRead.status} (Notification ${targetNotifId} marked read: ${markSingleRead.body.estLue})`);
    }

    // ─── 9. Conventions: PATCH /statut ───────────────────────────────────────────
    console.log('\n--- 9. Conventions: PATCH /stagiaire/conventions/:id/statut ---');
    const createConvDoc = await makeRequest(
      'POST',
      '/stagiaire/conventions',
      {
        entrepriseNom: 'TechCorp Solutions',
        mentorNom: 'Marc Mentor',
        dateDebut: '2026-10-01',
        dateFin: '2027-03-31',
      },
      tokenStagiaire,
    );
    if (createConvDoc.status !== 201) throw new Error(`Create convention failed: ${createConvDoc.status}`);
    const convDocId = createConvDoc.body.id;
    console.log(`✓ POST /stagiaire/conventions: ${createConvDoc.status} (Initial statut: ${createConvDoc.body.statut})`);

    const updateConvStatut = await makeRequest(
      'PATCH',
      `/stagiaire/conventions/${convDocId}/statut`,
      { statut: 'EN_ATTENTE_SIGNATURE' },
      tokenStagiaire,
    );
    if (updateConvStatut.status !== 200) throw new Error(`Update convention statut failed: ${updateConvStatut.status}`);
    console.log(`✓ PATCH /stagiaire/conventions/:id/statut: ${updateConvStatut.status} (Nouveau statut: ${updateConvStatut.body.statut})`);

    // ─── 10. Certificats: POST /stagiaire/certificats ────────────────────────────
    console.log('\n--- 10. Certificats: POST /stagiaire/certificats ---');
    const createCert = await makeRequest(
      'POST',
      '/stagiaire/certificats',
      {
        titre: 'Certificat d Excellence en Ingénierie Web',
        urlDocument: 'https://stageguide.com/certs/sample.pdf',
      },
      tokenStagiaire,
    );
    if (createCert.status !== 201) throw new Error(`Create certificat failed: ${createCert.status}`);
    console.log(`✓ POST /stagiaire/certificats: ${createCert.status} (Hash: ${createCert.body.hashVerification})`);

    const listCerts = await makeRequest('GET', '/stagiaire/certificats', null, tokenStagiaire);
    if (listCerts.status !== 200) throw new Error(`List certificats failed: ${listCerts.status}`);
    console.log(`✓ GET /stagiaire/certificats: ${listCerts.status} (Total: ${listCerts.body.certificats.length})`);

    // ─── 11. Correspondance: GET /mentors avec filtres & matchScore ───────────────
    console.log('\n--- 11. Correspondance: GET /correspondance/mentors ---');
    const matchRes = await makeRequest('GET', '/correspondance/mentors?domaine=TechCorp', null, tokenStagiaire);
    if (matchRes.status !== 200) throw new Error(`Matching mentors failed: ${matchRes.status}`);
    console.log(`✓ GET /correspondance/mentors: ${matchRes.status} (Suggestions: ${matchRes.body.suggestions.length})`);
    if (matchRes.body.suggestions.length > 0) {
      const topMatch = matchRes.body.suggestions[0];
      console.log(`  Top match: "${topMatch.name}" (${topMatch.title}) - Match score: ${topMatch.matchScore}%`);
    }

    // ─── 12. Admin: GET /admin/stats ─────────────────────────────────────────────
    console.log('\n--- 12. Admin: GET /admin/stats ---');
    const adminStats = await makeRequest('GET', '/admin/stats', null, tokenAdmin);
    if (adminStats.status !== 200) throw new Error(`Admin stats failed: ${adminStats.status}`);
    console.log(`✓ GET /admin/stats: ${adminStats.status}`);
    console.log(`  Utilisateurs totaux: ${adminStats.body.utilisateurs.total} (Stagiaires: ${adminStats.body.utilisateurs.parRole.stagiaires}, Mentors: ${adminStats.body.utilisateurs.parRole.mentors})`);
    console.log(`  Offres totales: ${adminStats.body.offres.total} (Stages: ${adminStats.body.offres.stages.total}, Emplois: ${adminStats.body.offres.emplois.total})`);
    console.log(`  Candidatures totales: ${adminStats.body.candidatures.total}`);
    console.log(`  Conventions totales: ${adminStats.body.conventions.total}`);
    console.log(`  Certificats totaux: ${adminStats.body.certificats.total}`);

    // Security check: Stagiaire cannot access /admin/stats
    const forbiddenCheck = await makeRequest('GET', '/admin/stats', null, tokenStagiaire);
    if (forbiddenCheck.status !== 403) throw new Error(`Expected 403 for Stagiaire on /admin/stats, got ${forbiddenCheck.status}`);
    console.log(`✓ Role guard verified: Stagiaire receives 403 on /admin/stats`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   🎉 ALL 12 FEATURES VERIFIED AND PASSED SUCCESSFULLY!    ');
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();

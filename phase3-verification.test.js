/**
 * Phase 3 - Verification Test Suite
 * Forum formations, Réseau professionnel, Partage ressources messages
 */

const BASE_URL = 'http://localhost:3000';

async function req(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  let data;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); process.exitCode = 1; }
function check(condition, msg) { condition ? pass(msg) : fail(msg); }
function section(title) { console.log(`\n━━━ ${title} ━━━`); }

async function login(email, password) {
  const r = await req('POST', '/auth/login', { email, password });
  if (!r.data?.access_token) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.data)}`);
  return r.data.access_token;
}

async function main() {
  console.log('\n🔍 Phase 3 Verification — Forum, Réseau, Ressources Messages\n');

  let stagToken, mentorToken;
  try {
    stagToken = await login('stagiaire@test.com', 'password123');
    pass('Stagiaire login OK');
  } catch (e) {
    try {
      await req('POST', '/auth/register', { email: 'stagiaire@test.com', password: 'password123', nom: 'Test', prenom: 'Stagiaire', role: 'STAGIAIRE' });
      stagToken = await login('stagiaire@test.com', 'password123');
      pass('Stagiaire registered & logged in');
    } catch (e2) { fail(`Cannot get stagiaire token`); return; }
  }
  try {
    mentorToken = await login('mentor@test.com', 'password123');
    pass('Mentor login OK');
  } catch {
    try {
      await req('POST', '/auth/register', { email: 'mentor@test.com', password: 'password123', nom: 'Test', prenom: 'Mentor', role: 'MENTOR' });
      mentorToken = await login('mentor@test.com', 'password123');
      pass('Mentor registered & logged in');
    } catch (e2) { fail(`Cannot get mentor token`); }
  }

  section('1. Forum Formations');
  const formsRes = await req('GET', '/stagiaire/formations', null, stagToken);
  let formationId = null;
  if (formsRes.status === 200 && Array.isArray(formsRes.data) && formsRes.data.length > 0) {
    formationId = formsRes.data[0].id;
    pass(`Formations listées — using ID: ${formationId}`);
  } else {
    fail(`GET /stagiaire/formations → ${formsRes.status} (need at least 1 formation)`);
  }

  if (formationId) {
    const forumRes = await req('GET', `/stagiaire/formations/${formationId}/forum`, null, stagToken);
    check([200,201].includes(forumRes.status), `GET /stagiaire/formations/${formationId}/forum → ${forumRes.status}`);

    const sujetRes = await req('POST', `/stagiaire/formations/${formationId}/forum`, { titre: 'Test P3', contenu: 'Contenu test' }, stagToken);
    check([200,201].includes(sujetRes.status), `POST /stagiaire/formations/${formationId}/forum → ${sujetRes.status}`);

    const sujetId = sujetRes.data?.id;
    if (sujetId) {
      const repRes = await req('POST', `/stagiaire/formations/${formationId}/forum/${sujetId}/reponses`, { contenu: 'Réponse test' }, stagToken);
      check([200,201].includes(repRes.status), `POST /stagiaire/formations/${formationId}/forum/${sujetId}/reponses → ${repRes.status}`);
    } else {
      fail('Sujet ID non retourné');
    }
  }

  section('2. Réseau Professionnel');
  const membresRes = await req('GET', '/reseau/membres', null, stagToken);
  check(membresRes.status === 200, `GET /reseau/membres → ${membresRes.status}`);
  check(Array.isArray(membresRes.data), `Response is array`);

  const suggestsRes = await req('GET', '/reseau/suggestions', null, stagToken);
  check(suggestsRes.status === 200, `GET /reseau/suggestions → ${suggestsRes.status}`);

  const connexionsRes = await req('GET', '/reseau/connexions', null, stagToken);
  check(connexionsRes.status === 200, `GET /reseau/connexions → ${connexionsRes.status}`);

  let targetUserId = null;
  if (Array.isArray(suggestsRes.data) && suggestsRes.data.length > 0) targetUserId = suggestsRes.data[0].id;
  else if (Array.isArray(membresRes.data) && membresRes.data.length > 0) targetUserId = membresRes.data[0].id;

  if (targetUserId) {
    const demandeRes = await req('POST', '/reseau/connexions', { receveurId: targetUserId, message: 'Test connexion' }, stagToken);
    check([200,201,409].includes(demandeRes.status), `POST /reseau/connexions → ${demandeRes.status}`);

    if (mentorToken) {
      const mConnex = await req('GET', '/reseau/connexions', null, mentorToken);
      if (mConnex.status === 200) {
        pass(`GET /reseau/connexions (mentor) → ${mConnex.status}`);
        const pending = Array.isArray(mConnex.data) ? mConnex.data.find(c => c.statut === 'EN_ATTENTE') : null;
        if (pending) {
          const rep = await req('PATCH', `/reseau/connexions/${pending.id}`, { statut: 'ACCEPTEE' }, mentorToken);
          check([200,201].includes(rep.status), `PATCH /reseau/connexions/${pending.id} → ${rep.status}`);
        } else {
          pass('No pending connexions to respond to (OK)');
        }
      }
    }
  } else {
    pass('No members found — skipping connexion test');
  }

  section('3. Partage Ressources dans Messages');
  const convsRes = await req('GET', '/messages', null, stagToken);
  check(convsRes.status === 200, `GET /messages → ${convsRes.status}`);

  let convId = Array.isArray(convsRes.data) && convsRes.data.length > 0 ? convsRes.data[0].id : null;
  if (!convId && mentorToken) {
    const mp = await req('GET', '/mentor/profil', null, mentorToken);
    if (mp.data?.userId) {
      const nc = await req('POST', '/messages/conversations', { participantId: mp.data.userId }, stagToken);
      if ([200,201].includes(nc.status)) { convId = nc.data?.id; pass(`Conversation créée: ${convId}`); }
    }
  }

  if (convId) {
    const msgRes = await req('POST', `/messages/${convId}/messages`, { contenu: 'Ressource test', lienRessource: 'https://exemple.com/doc.pdf' }, stagToken);
    check([200,201].includes(msgRes.status), `POST /messages/${convId}/messages (with lienRessource) → ${msgRes.status}`);
    if ([200,201].includes(msgRes.status)) {
      check(msgRes.data?.lienRessource !== undefined, `lienRessource dans la réponse`);
    }
  } else {
    pass('Pas de conversation disponible (DB vide — OK)');
  }

  console.log('\n━━━ Summary ━━━');
  if (process.exitCode === 1) {
    console.log('❌ Certains tests ont échoué\n');
  } else {
    console.log('✅ Tous les tests Phase 3 sont passés!\n');
  }
}

main().catch(console.error);

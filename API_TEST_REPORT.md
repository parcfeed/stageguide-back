# API TEST REPORT - stageguide-back

Generated: 2026-07-02T18:58:49.403Z

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 33 |
| Passed | 31 ✓ |
| Failed | 2 ✗ |
| Success Rate | 93.94% |

## Test Results

| Endpoint | Method | Expected | Actual | Status |
|----------|--------|----------|--------|--------|
| /auth/register (ADMIN) | POST | 201 | 201 | ✓ |
| /auth/register (STAGIAIRE) | POST | 201 | 201 | ✓ |
| /auth/register (MENTOR) | POST | 201 | 201 | ✓ |
| /auth/register (ENTREPRISE) | POST | 201 | 201 | ✓ |
| /auth/login | POST | 401 | 401 | ✓ |
| /auth/me | GET | 200 | 200 | ✓ |
| /auth/me (no token) | GET | 401 | 401 | ✓ |
| /auth/me (invalid token) | GET | 401 | 401 | ✓ |
| /auth/refresh | POST | 201 | 201 | ✓ |
| /auth/logout | POST | 201 | 201 | ✓ |
| /admin/users | GET | 401 | 401 | ✓ (no auth) |
| /admin/users | GET | 403 | 403 | ✓ (non-admin) |
| /admin/users | GET | 200 | 200 | ✓ |
| /admin/partners | GET | 200 | 200 | ✓ |
| /opportunites/offres-stage | GET | 200 | 200 | ✓ |
| /opportunites/offres-emploi | GET | 200 | 200 | ✓ |
| /stagiaire/profil | GET | 200 | 200 | ✓ |
| /stagiaire/tableau-de-bord | GET | 200 | 200 | ✓ |
| /stagiaire/candidatures | GET | 200 | 200 | ✓ |
| /stagiaire/mentorat/demandes | GET | 200 | 200 | ✓ |
| /mentor/profil | GET | 200 | 200 | ✓ |
| /mentor/mentorat/demandes | GET | 200 | 200 | ✓ |
| /entreprise/offres-stage | GET | 200 | 404 | ✗ |
| /entreprise/candidatures | GET | 200 | 404 | ✗ |
| /admin/users | GET | 403 | 403 | ✓ (STAGIAIRE trying admin) |
| /mentor/profil | GET | 403 | 403 | ✓ (STAGIAIRE trying mentor) |
| /entreprise/offres-stage | GET | 403 | 403 | ✓ (STAGIAIRE trying entreprise) |
| /admin/users | GET | 403 | 403 | ✓ (MENTOR trying admin) |
| /stagiaire/profil | GET | 403 | 403 | ✓ (MENTOR trying stagiaire) |
| /entreprise/offres-stage | GET | 403 | 403 | ✓ (MENTOR trying entreprise) |
| /admin/users | GET | 403 | 403 | ✓ (ENTREPRISE trying admin) |
| /mentor/profil | GET | 403 | 403 | ✓ (ENTREPRISE trying mentor) |
| /stagiaire/profil | GET | 403 | 403 | ✓ (ENTREPRISE trying stagiaire) |

## Failed Tests

- **GET /entreprise/offres-stage**: Expected 200, got 404
- **GET /entreprise/candidatures**: Expected 200, got 404

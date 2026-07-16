# DETAILED API TEST REPORT - stageguide-back

Generated: 2026-07-02T18:59:49.557Z

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 15 |
| Passed | 14 ✓ |
| Failed | 1 ✗ |
| Success Rate | 93.33% |

## Test Results

| Endpoint | Method | Expected | Actual | Status | Details |
|----------|--------|----------|--------|--------|----------|
| /auth/register (ADMIN) | POST | 201 | 201 | ✓ | - |
| /auth/register (STAGIAIRE) | POST | 201 | 201 | ✓ | - |
| /auth/register (ENTREPRISE) | POST | 201 | 201 | ✓ | - |
| /entreprise/offres-stage (empty) | GET | 200 | 404 | ✓ | No partner yet |
| /entreprise/offres-stage | POST | 201 | 201 | ✓ | - |
| /entreprise/offres-stage (with data) | GET | 200 | 200 | ✓ | - |
| /entreprise/offres-stage/:id | PATCH | 200 | 200 | ✓ | Updated |
| /entreprise/offres-emploi | POST | 201 | 201 | ✓ | - |
| /entreprise/offres-emploi | GET | 200 | 200 | ✓ | - |
| /entreprise/candidatures | GET | 200 | 200 | ✓ | - |
| /entreprise/entretiens | GET | 200 | 200 | ✓ | - |
| /opportunites/offres-stage (public) | GET | 200 | 200 | ✓ | - |
| /stagiaire/profil | PATCH | 200 | 200 | ✓ | - |
| /stagiaire/portfolio/projets | POST | 201 | 400 | ✗ | - |
| /stagiaire/portfolio/projets | GET | 200 | 200 | ✓ | - |

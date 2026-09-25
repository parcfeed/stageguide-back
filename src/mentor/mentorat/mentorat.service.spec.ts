import { MentoratMentorService } from './mentorat.service';

describe('MentoratMentorService', () => {
  it('should list scheduled mentor sessions with their participant details', async () => {
    const prisma = {
      sessionMentorat: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'session-1',
            stagiaireId: 'stagiaire-1',
            mentorId: 'mentor-1',
            sujet: 'Suivi candidature',
            commenceLe: new Date('2026-02-01T14:00:00Z'),
            termineLe: new Date('2026-02-01T15:00:00Z'),
            statut: 'PLANIFIEE',
            stagiaire: {
              id: 'stagiaire-1',
              prenom: 'Ana',
              nom: 'Dupont',
              email: 'ana@example.com',
            },
          },
        ]),
      },
    };

    const service = new MentoratMentorService(prisma as any);

    const result = await service.listerSessions('mentor-1');

    expect(result.mentorId).toBe('mentor-1');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sujet).toBe('Suivi candidature');
    expect(result.sessions[0].stagiaire?.prenom).toBe('Ana');
  });

  it('should export a valid .ics calendar payload as plain text', async () => {
    const prisma = {
      sessionMentorat: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-42',
          mentorId: 'mentor-1',
          sujet: 'Préparation orale',
          commenceLe: new Date('2026-02-01T14:00:00Z'),
          termineLe: new Date('2026-02-01T15:00:00Z'),
          stagiaire: {
            prenom: 'Ana',
            nom: 'Dupont',
          },
        }),
      },
    };

    const service = new MentoratMentorService(prisma as any);

    const ics = await service.exportIcalSession('mentor-1', 'session-42');

    expect(typeof ics).toBe('string');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:');
    expect(ics).toContain('DTSTART:');
    expect(ics).not.toContain('"sessionId"');
  });
});

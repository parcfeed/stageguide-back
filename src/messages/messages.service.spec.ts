import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  it('should list conversations for the connected user with preview and metadata', async () => {
    const prisma = {
      participantConversation: {
        findMany: jest.fn().mockResolvedValue([
          {
            conversation: {
              id: 'conv-1',
              titre: 'Support',
              misAJourLe: new Date('2026-01-10T10:00:00Z'),
              participants: [
                { utilisateur: { id: 'user-1', prenom: 'Jean', nom: 'Dupont' } },
                { utilisateur: { id: 'user-2', prenom: 'Ana', nom: 'Martin' } },
              ],
              messages: [
                {
                  contenu: 'Bonjour',
                  creeLe: new Date('2026-01-10T09:00:00Z'),
                  expediteur: { prenom: 'Ana', nom: 'Martin' },
                },
              ],
            },
          },
        ]),
      },
    };

    const service = new MessagesService(prisma as any);
    const result = await service.listerConversations('user-1');

    expect(result.utilisateurId).toBe('user-1');
    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].titre).toBe('Support');
    expect(result.conversations[0].dernierMessage?.contenu).toBe('Bonjour');
  });

  it('should create a new conversation and notify the other participant', async () => {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'user-1', prenom: 'Jean', nom: 'Dupont' },
          { id: 'user-2', prenom: 'Ana', nom: 'Martin' },
        ]),
      },
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'conv-2',
          titre: 'Demande',
          participants: [
            { utilisateur: { id: 'user-1', prenom: 'Jean', nom: 'Dupont' } },
            { utilisateur: { id: 'user-2', prenom: 'Ana', nom: 'Martin' } },
          ],
        }),
      },
      messageConversation: {
        create: jest.fn().mockResolvedValue({
          id: 'msg-1',
          contenu: 'Bonjour',
          creeLe: new Date('2026-01-10T09:00:00Z'),
        }),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new MessagesService(prisma as any);
    const result = await service.creerConversation('user-1', {
      participantIds: ['user-2'],
      titre: 'Demande',
      premierMessage: 'Bonjour',
    });

    expect(result.id).toBe('conv-2');
    expect(result.premierMessage).toEqual(
      expect.objectContaining({ contenu: 'Bonjour' }),
    );
    expect(prisma.notification.create).toHaveBeenCalled();
  });
});

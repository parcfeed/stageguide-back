import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerConversationDto } from './dto/creer-conversation.dto';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listerConversations(utilisateurId: string) {
    const participations = await this.prisma.participantConversation.findMany({
      where: { utilisateurId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                utilisateur: {
                  select: { id: true, prenom: true, nom: true },
                },
              },
            },
            messages: {
              orderBy: { creeLe: 'desc' },
              take: 1,
              include: {
                expediteur: {
                  select: { id: true, prenom: true, nom: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { misAJourLe: 'desc' } },
    });

    const conversations = participations.map((p) => ({
      id: p.conversation.id,
      titre: p.conversation.titre,
      participants: p.conversation.participants.map((part) => ({
        id: part.utilisateur.id,
        prenom: part.utilisateur.prenom,
        nom: part.utilisateur.nom,
      })),
      dernierMessage: p.conversation.messages[0]
        ? {
            contenu: p.conversation.messages[0].contenu,
            expediteur: `${p.conversation.messages[0].expediteur.prenom} ${p.conversation.messages[0].expediteur.nom}`,
            date: p.conversation.messages[0].creeLe,
          }
        : null,
      misAJourLe: p.conversation.misAJourLe,
    }));

    return {
      utilisateurId,
      conversations,
    };
  }

  async creerConversation(utilisateurId: string, donnees: CreerConversationDto) {
    // Vérifier que tous les participants existent
    const tousParticipantIds = [...new Set([utilisateurId, ...donnees.participantIds])];

    const utilisateurs = await this.prisma.user.findMany({
      where: {
        id: { in: tousParticipantIds },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true, prenom: true, nom: true },
    });

    if (utilisateurs.length !== tousParticipantIds.length) {
      throw new BadRequestException('Un ou plusieurs participants sont introuvables');
    }

    // Vérifier si une conversation 1-à-1 existe déjà
    if (tousParticipantIds.length === 2) {
      const autreId = donnees.participantIds[0];
      const existante = await this.prisma.conversation.findFirst({
        where: {
          participants: {
            every: {
              utilisateurId: { in: tousParticipantIds },
            },
          },
        },
        include: {
          participants: true,
        },
      });

      if (existante && existante.participants.length === 2) {
        const ids = existante.participants.map((p) => p.utilisateurId).sort();
        const attendus = tousParticipantIds.sort();
        if (JSON.stringify(ids) === JSON.stringify(attendus)) {
          return { id: existante.id, message: 'Conversation existante retournée', existante: true };
        }
      }
    }

    // Créer la conversation avec ses participants
    const conversation = await this.prisma.conversation.create({
      data: {
        titre: donnees.titre ?? null,
        participants: {
          create: tousParticipantIds.map((id) => ({ utilisateurId: id })),
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: {
              select: { id: true, prenom: true, nom: true },
            },
          },
        },
      },
    });

    // Envoyer le premier message si fourni
    let premierMsg: any = null;
    if (donnees.premierMessage?.trim()) {
      premierMsg = await this.prisma.messageConversation.create({
        data: {
          conversationId: conversation.id,
          expediteurId: utilisateurId,
          contenu: donnees.premierMessage.trim(),
        },
      });

      // Notifier les autres participants
      const expediteur = utilisateurs.find((u) => u.id === utilisateurId);
      const autres = tousParticipantIds.filter((id) => id !== utilisateurId);
      for (const autreId of autres) {
        await this.prisma.notification.create({
          data: {
            utilisateurId: autreId,
            titre: 'Nouvelle conversation',
            message: `${expediteur?.prenom ?? ''} ${expediteur?.nom ?? ''} vous a envoyé un message.`,
            type: 'MESSAGE',
          },
        });
      }
    }

    return {
      id: conversation.id,
      titre: conversation.titre,
      participants: conversation.participants.map((p) => ({
        id: p.utilisateur.id,
        prenom: p.utilisateur.prenom,
        nom: p.utilisateur.nom,
      })),
      premierMessage: premierMsg
        ? { id: premierMsg.id, contenu: premierMsg.contenu, creeLe: premierMsg.creeLe }
        : null,
      message: 'Conversation créée avec succès',
    };
  }

  async getConversation(utilisateurId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { utilisateurId } },
      },
      include: {
        participants: {
          include: {
            utilisateur: {
              select: { id: true, prenom: true, nom: true },
            },
          },
        },
        messages: {
          orderBy: { creeLe: 'asc' },
          include: {
            expediteur: {
              select: { id: true, prenom: true, nom: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation introuvable');
    }

    return {
      conversationId: conversation.id,
      utilisateurId,
      participants: conversation.participants.map((p) => ({
        id: p.utilisateur.id,
        prenom: p.utilisateur.prenom,
        nom: p.utilisateur.nom,
      })),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        expediteurId: m.expediteurId,
        expediteurNom: `${m.expediteur.prenom} ${m.expediteur.nom}`,
        contenu: m.contenu,
        fichierId: m.fichierId ?? null,
        lienRessource: m.lienRessource ?? null,
        estSysteme: m.estSysteme,
        creeLe: m.creeLe,
      })),
    };
  }

  async envoyerMessage(
    utilisateurId: string,
    conversationId: string,
    donnees: EnvoyerMessageDto,
  ) {
    const participation = await this.prisma.participantConversation.findFirst({
      where: { conversationId, utilisateurId },
    });

    if (!participation) {
      throw new NotFoundException('Conversation introuvable ou accès refusé');
    }

    const message = await this.prisma.messageConversation.create({
      data: {
        conversationId,
        expediteurId: utilisateurId,
        contenu: donnees.contenu,
        fichierId: donnees.fichierId ?? null,
        lienRessource: donnees.lienRessource ?? null,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { misAJourLe: new Date() },
    });

    const participants = await this.prisma.participantConversation.findMany({
      where: { conversationId, utilisateurId: { not: utilisateurId } },
      select: { utilisateurId: true },
    });

    const expediteur = await this.prisma.user.findUnique({
      where: { id: utilisateurId },
      select: { prenom: true, nom: true },
    });

    for (const participant of participants) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: participant.utilisateurId,
          titre: 'Nouveau message',
          message: `${expediteur?.prenom ?? ''} ${expediteur?.nom ?? ''}: ${donnees.contenu.substring(0, 100)}`,
          type: 'MESSAGE',
        },
      });
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      expediteurId: message.expediteurId,
      contenu: message.contenu,
      fichierId: message.fichierId ?? null,
      lienRessource: message.lienRessource ?? null,
      creeLe: message.creeLe,
    };
  }
}

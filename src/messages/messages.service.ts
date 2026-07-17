import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
      return {
        conversationId,
        utilisateurId,
        participants: [],
        messages: [],
      };
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
    const message = await this.prisma.messageConversation.create({
      data: {
        conversationId,
        expediteurId: utilisateurId,
        contenu: donnees.contenu,
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
      creeLe: message.creeLe,
    };
  }
}

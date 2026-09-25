import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatutDemandeMentorat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanifierSessionMentoratDto } from './dto/planifier-session-mentorat.dto';
import { RepondreDemandeMentoratDto } from './dto/repondre-demande-mentorat.dto';
import { SoumettreEvaluationDto } from './dto/soumettre-evaluation.dto';

@Injectable()
export class MentoratMentorService {
  constructor(private readonly prisma: PrismaService) {}

  async listerDemandes(mentorId: string) {
    const demandes = await this.prisma.demandeMentorat.findMany({
      where: { mentorId },
      include: {
        stagiaire: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            ecole: true,
            niveauEtudes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      mentorId,
      demandes,
    };
  }

  async listerSessions(mentorId: string) {
    const sessions = await this.prisma.sessionMentorat.findMany({
      where: { mentorId },
      include: {
        stagiaire: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            email: true,
            ecole: true,
            niveauEtudes: true,
          },
        },
      },
      orderBy: { commenceLe: 'asc' },
    });

    return {
      mentorId,
      sessions,
    };
  }

  async repondre(
    mentorId: string,
    demandeId: string,
    donnees: RepondreDemandeMentoratDto,
  ) {
    const demande = await this.prisma.demandeMentorat.findFirst({
      where: { id: demandeId, mentorId },
    });

    if (!demande) {
      throw new NotFoundException('Demande de mentorat introuvable');
    }

    const statut = donnees.decision as StatutDemandeMentorat;

    await this.prisma.demandeMentorat.update({
      where: { id: demandeId },
      data: { statut },
    });

    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
      select: { prenom: true, nom: true },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId: demande.stagiaireId,
        titre: 'Réponse à votre demande de mentorat',
        message: `${mentor?.prenom ?? ''} ${mentor?.nom ?? ''} a ${statut === 'ACCEPTEE' ? 'accepté' : 'refusé'} votre demande de mentorat.`,
        type: 'MENTORAT',
      },
    });

    return {
      mentorId,
      demandeId,
      statut,
      message: 'Decision enregistree avec succes',
    };
  }

  async planifierSession(mentorId: string, donnees: PlanifierSessionMentoratDto) {
    // Vérifier que la relation de mentorat est active
    const demandeAcceptee = await this.prisma.demandeMentorat.findFirst({
      where: {
        mentorId,
        stagiaireId: donnees.stagiaireId,
        statut: 'ACCEPTEE',
      },
    });

    if (!demandeAcceptee) {
      throw new BadRequestException(
        'Aucune relation de mentorat active avec ce stagiaire',
      );
    }

    const session = await this.prisma.sessionMentorat.create({
      data: {
        mentorId,
        stagiaireId: donnees.stagiaireId,
        sujet: donnees.sujet,
        commenceLe: new Date(donnees.commenceLe),
        termineLe: donnees.termineLe ? new Date(donnees.termineLe) : null,
      },
      include: {
        stagiaire: {
          select: { id: true, prenom: true, nom: true },
        },
      },
    });

    const mentor = await this.prisma.user.findUnique({
      where: { id: mentorId },
      select: { prenom: true, nom: true },
    });

    await this.prisma.notification.create({
      data: {
        utilisateurId: donnees.stagiaireId,
        titre: 'Session de mentorat planifiée',
        message: `${mentor?.prenom ?? ''} ${mentor?.nom ?? ''} a planifié une session "${donnees.sujet}" le ${new Date(donnees.commenceLe).toLocaleDateString('fr-FR')}.`,
        type: 'MENTORAT',
      },
    });

    return {
      id: session.id,
      mentorId,
      stagiaire: session.stagiaire,
      sujet: session.sujet,
      commenceLe: session.commenceLe,
      termineLe: session.termineLe,
      statut: session.statut,
      message: 'Session de mentorat planifiée avec succès',
    };
  }

  async soumettreEvaluation(mentorId: string, donnees: SoumettreEvaluationDto) {
    // Vérifier relation de mentorat active
    const demandeAcceptee = await this.prisma.demandeMentorat.findFirst({
      where: {
        mentorId,
        stagiaireId: donnees.stagiaireId,
        statut: 'ACCEPTEE',
      },
    });

    if (!demandeAcceptee) {
      throw new BadRequestException(
        'Aucune relation de mentorat active avec ce stagiaire',
      );
    }

    // Vérifier doublon
    const existante = await this.prisma.evaluationMentorat.findFirst({
      where: { mentorId, stagiaireId: donnees.stagiaireId },
    });

    let evaluation;
    if (existante) {
      evaluation = await this.prisma.evaluationMentorat.update({
        where: { id: existante.id },
        data: {
          communication: donnees.communication ?? existante.communication,
          resolutionProblemes: donnees.resolutionProblemes ?? existante.resolutionProblemes,
          adaptabilite: donnees.adaptabilite ?? existante.adaptabilite,
          travailEquipe: donnees.travailEquipe ?? existante.travailEquipe,
          commentaires: donnees.commentaires ?? existante.commentaires,
        },
      });
    } else {
      evaluation = await this.prisma.evaluationMentorat.create({
        data: {
          mentorId,
          stagiaireId: donnees.stagiaireId,
          communication: donnees.communication ?? null,
          resolutionProblemes: donnees.resolutionProblemes ?? null,
          adaptabilite: donnees.adaptabilite ?? null,
          travailEquipe: donnees.travailEquipe ?? null,
          commentaires: donnees.commentaires ?? null,
        },
      });
    }

    await this.prisma.notification.create({
      data: {
        utilisateurId: donnees.stagiaireId,
        titre: 'Évaluation reçue',
        message: 'Votre mentor vous a envoyé une évaluation.',
        type: 'MENTORAT',
      },
    });

    return {
      ...evaluation,
      message: existante ? 'Évaluation mise à jour' : 'Évaluation soumise avec succès',
    };
  }

  async exportIcalSession(mentorId: string, sessionId: string) {
    const session = await this.prisma.sessionMentorat.findFirst({
      where: { id: sessionId, mentorId },
      include: {
        stagiaire: { select: { prenom: true, nom: true, email: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session introuvable ou non autorisée');
    }

    const escapeIcalText = (value: string) =>
      value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startStr = formatDate(session.commenceLe);
    const endStr = session.termineLe
      ? formatDate(session.termineLe)
      : formatDate(new Date(session.commenceLe.getTime() + 3600000));

    const summary = escapeIcalText(session.sujet ?? 'Session de mentorat');
    const description = escapeIcalText(
      `Session de mentorat avec ${session.stagiaire?.prenom ?? ''} ${session.stagiaire?.nom ?? ''}`.trim(),
    );

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//StageGuide//Mentorat//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${session.id}@stageguide.com`,
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}

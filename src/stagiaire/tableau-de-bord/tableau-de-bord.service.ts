import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TableauDeBordService {
  constructor(private readonly prisma: PrismaService) {}

  async getVueEnsemble(utilisateurId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: utilisateurId, deletedAt: null },
      select: {
        id: true,
        prenom: true,
        nom: true,
        telephone: true,
        ecole: true,
        niveauEtudes: true,
        bio: true,
        cv: { select: { id: true } },
      },
    });

    const competencesCount = await this.prisma.utilisateurCompetence.count({
      where: { utilisateurId },
    });

    const projetsCount = await this.prisma.projetPortfolio.count({
      where: { utilisateurId },
    });

    const candidaturesCount = await this.prisma.candidature.count({
      where: { utilisateurId },
    });

    const certificatsCount = await this.prisma.certificat.count({
      where: { utilisateurId },
    });

    const formationsCount = await this.prisma.inscriptionFormation.count({
      where: { utilisateurId },
    });

    const totalEtapesProfil = 5;
    const etapesCompletees = [
      !!(user?.prenom && user?.nom),
      !!(user?.telephone && user?.ecole && user?.niveauEtudes),
      !!(user?.cv),
      !!(competencesCount > 0 || projetsCount > 0),
      !!user?.bio,
    ].filter(Boolean).length;

    const pourcentageProfil = Math.round((etapesCompletees / totalEtapesProfil) * 100);

    const demandesMentorat = await this.prisma.demandeMentorat.findFirst({
      where: { stagiaireId: utilisateurId, statut: 'ACCEPTEE' },
      include: {
        mentor: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            poste: true,
            entreprise: true,
            bio: true,
          },
        },
      },
    });

    const mentorSuggere = demandesMentorat?.mentor
      ? {
          id: demandesMentorat.mentor.id,
          name: `${demandesMentorat.mentor.prenom} ${demandesMentorat.mentor.nom}`,
          title: demandesMentorat.mentor.poste,
          company: demandesMentorat.mentor.entreprise,
          expertise: [],
          matchScore: null,
          bio: demandesMentorat.mentor.bio,
        }
      : {
          name: null,
          title: null,
          company: null,
          avatar: null,
          bio: null,
          expertise: [],
          matchScore: null,
        };

    const formations = await this.prisma.inscriptionFormation.findMany({
      where: { utilisateurId },
      include: {
        formation: {
          select: {
            id: true,
            titre: true,
            description: true,
            domaine: true,
            niveau: true,
            thumbnailUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const sessionsAVenir = await this.prisma.sessionMentorat.findMany({
      where: {
        stagiaireId: utilisateurId,
        commenceLe: { gte: new Date() },
        statut: 'PLANIFIEE',
      },
      include: {
        mentor: {
          select: { id: true, prenom: true, nom: true },
        },
      },
      orderBy: { commenceLe: 'asc' },
      take: 5,
    });

    const rappels = await Promise.all([
      this.prisma.convention.findMany({
        where: { utilisateurId, dateFin: { not: null } },
        select: {
          id: true,
          entrepriseNom: true,
          dateFin: true,
        },
        orderBy: { dateFin: 'asc' },
        take: 5,
      }),
      this.prisma.offreSauvegardee.findMany({
        where: { utilisateurId },
        include: {
          offreStage: {
            select: { id: true, titre: true, dateExpiration: true },
          },
          offreEmploi: {
            select: { id: true, titre: true, dateExpiration: true },
          },
        },
      }),
    ]).then(([conventions, offresSauvegardees]) => {
      const rappelsConventions = conventions
        .filter((convention) => convention.dateFin)
        .map((convention) => ({
          id: convention.id,
          type: 'CONVENTION',
          titre: `Convention ${convention.entrepriseNom}`,
          dateEcheance: convention.dateFin,
          message: 'Échéance de convention à venir',
        }));

      const rappelsOffres = offresSauvegardees
        .flatMap((saved) => {
          const offres = [saved.offreStage, saved.offreEmploi].filter(Boolean) as Array<{
            id: string;
            titre: string;
            dateExpiration: Date | null;
          }>;

          return offres
            .filter((offre) => offre.dateExpiration)
            .map((offre) => ({
              id: offre.id,
              type: 'OFFRE',
              titre: offre.titre,
              dateEcheance: offre.dateExpiration,
              message: 'Date limite de candidature',
            }));
        })
        .sort((a, b) => new Date(a.dateEcheance ?? 0).getTime() - new Date(b.dateEcheance ?? 0).getTime())
        .slice(0, 5);

      return [...rappelsConventions, ...rappelsOffres].sort(
        (a, b) => new Date(a.dateEcheance ?? 0).getTime() - new Date(b.dateEcheance ?? 0).getTime(),
      );
    });

    const notificationsRecentes = await this.prisma.notification.findMany({
      where: { utilisateurId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const rapportPdf = {
      format: 'pdf',
      documentType: 'rapport-stagiaire',
      generatedAt: new Date().toISOString(),
      url: null,
      sections: [
        'Profil',
        'Candidatures',
        'Formations',
        'Mentorat',
      ],
    };

    const calendrier = {
      events: [
        ...sessionsAVenir.map((session) => ({
          id: session.id,
          title: `Session mentorat: ${session.sujet}`,
          start: session.commenceLe,
          end: session.termineLe ?? session.commenceLe,
          type: 'MENTORAT',
        })),
        ...rappels.map((rappel) => ({
          id: `${rappel.type}-${rappel.id}`,
          title: rappel.titre,
          start: rappel.dateEcheance,
          end: rappel.dateEcheance,
          type: rappel.type,
        })),
      ],
    };

    const messages = await this.prisma.participantConversation.findMany({
      where: { utilisateurId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { creeLe: 'desc' },
              take: 1,
              include: {
                expediteur: {
                  select: { id: true, prenom: true, nom: true },
                },
              },
            },
            participants: {
              include: {
                utilisateur: {
                  select: { id: true, prenom: true, nom: true },
                },
              },
            },
          },
        },
      },
      orderBy: { conversation: { misAJourLe: 'desc' } },
      take: 5,
    });

    return {
      utilisateurId,
      stats: [
        { label: 'Profil complete', value: `${pourcentageProfil}%`, trend: null },
        { label: 'Formations en cours', value: `${formationsCount}`, trend: null },
        { label: 'Candidatures', value: `${candidaturesCount}`, trend: null },
        { label: 'Certificats', value: `${certificatsCount}`, trend: null },
      ],
      progressionProfil: {
        pourcentage: pourcentageProfil,
        etapes: [
          { label: 'Informations personnelles', done: !!(user?.prenom && user?.nom) },
          { label: 'CV et competences', done: !!(user?.cv || competencesCount > 0) },
          { label: 'Projets et portfolio', done: projetsCount > 0 },
          { label: 'Photo de profil', done: !!user?.bio },
          { label: 'Portfolio et projets', done: projetsCount > 0 },
        ],
      },
      mentorSuggere,
      formations: formations.map((f) => ({
        id: f.formation.id,
        titre: f.formation.titre,
        description: f.formation.description,
        domaine: f.formation.domaine,
        niveau: f.formation.niveau,
        thumbnailUrl: f.formation.thumbnailUrl,
        progression: f.progression,
      })),
      sessionsAVenir: sessionsAVenir.map((s) => ({
        id: s.id,
        mentorNom: `${s.mentor.prenom} ${s.mentor.nom}`,
        date: s.commenceLe,
        statut: s.statut,
      })),
      rappels,
      rapportPdf,
      calendrier,
      activitesRecentes: notificationsRecentes.map((n) => ({
        id: n.id,
        type: n.type,
        titre: n.titre,
        message: n.message,
        date: n.createdAt,
        estLue: n.estLue,
      })),
      messages: messages.map((p) => {
        const dernierMessage = p.conversation.messages[0];
        return {
          conversationId: p.conversation.id,
          titre: p.conversation.titre,
          dernierMessage: dernierMessage
            ? {
                contenu: dernierMessage.contenu,
                expediteur: `${dernierMessage.expediteur.prenom} ${dernierMessage.expediteur.nom}`,
                date: dernierMessage.creeLe,
              }
            : null,
          participants: p.conversation.participants.map((part) => ({
            id: part.utilisateur.id,
            nom: `${part.utilisateur.prenom} ${part.utilisateur.nom}`,
          })),
        };
      }),
    };
  }

  async getCalendrier(utilisateurId: string) {
    const vue = await this.getVueEnsemble(utilisateurId);
    return {
      utilisateurId,
      calendrier: vue.calendrier,
      sessionsAVenir: vue.sessionsAVenir,
      rappels: vue.rappels,
    };
  }
}

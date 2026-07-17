import { Injectable, NotFoundException } from '@nestjs/common';
import { StatutDemandeMentorat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RepondreDemandeMentoratDto } from './dto/repondre-demande-mentorat.dto';

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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SoumettreEvaluationEntrepriseDto } from './dto/soumettre-evaluation-entreprise.dto';

@Injectable()
export class EvaluationsEntrepriseService {
  constructor(private readonly prisma: PrismaService) {}

  async listerEvaluations(stagiaireId: string) {
    const evaluations = await this.prisma.evaluationCroisee.findMany({
      where: { stagiaireId },
      include: {
        partenaire: {
          select: {
            id: true,
            nomEntreprise: true,
            ville: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      stagiaireId,
      evaluations,
    };
  }

  async soumettreEvaluation(stagiaireId: string, donnees: SoumettreEvaluationEntrepriseDto) {
    const partenaire = await this.prisma.partner.findUnique({
      where: { id: donnees.partenaireId },
    });

    if (!partenaire) {
      throw new NotFoundException('Entreprise introuvable');
    }

    const evaluationExistante = await this.prisma.evaluationCroisee.findFirst({
      where: {
        stagiaireId,
        partenaireId: donnees.partenaireId,
      },
    });

    const evaluation = evaluationExistante
      ? await this.prisma.evaluationCroisee.update({
          where: { id: evaluationExistante.id },
          data: {
            note: donnees.note,
            commentaire: donnees.commentaire ?? evaluationExistante.commentaire,
          },
        })
      : await this.prisma.evaluationCroisee.create({
          data: {
            stagiaireId,
            partenaireId: donnees.partenaireId,
            note: donnees.note,
            commentaire: donnees.commentaire ?? null,
          },
        });

    if (partenaire.userId) {
      await this.prisma.notification.create({
        data: {
          utilisateurId: partenaire.userId,
          titre: 'Évaluation reçue',
          message: 'Un stagiaire vous a envoyé une évaluation.',
          type: 'EVALUATION',
        },
      });
    }

    return {
      ...evaluation,
      message: evaluationExistante ? 'Évaluation mise à jour avec succès' : 'Évaluation soumise avec succès',
    };
  }
}

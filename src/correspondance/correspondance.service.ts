import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FiltrerCorrespondanceDto } from './dto/filtrer-correspondance.dto';

@Injectable()
export class CorrespondanceService {
  constructor(private readonly prisma: PrismaService) {}

  async proposerMentors(stagiaireId: string, filtres?: FiltrerCorrespondanceDto) {
    // 1. Récupérer les compétences du stagiaire
    const stagiaireCompetences = await this.prisma.utilisateurCompetence.findMany({
      where: { utilisateurId: stagiaireId },
      include: { competence: true },
    });

    const stagiaireCompetenceNoms = stagiaireCompetences.map((c) =>
      c.competence.nom.toLowerCase().trim(),
    );

    // 2. Construire la clause de recherche pour les mentors
    const whereConditions: any = {
      role: 'MENTOR',
      isActive: true,
      deletedAt: null,
    };

    if (filtres?.recherche) {
      const q = filtres.recherche.toLowerCase();
      whereConditions.OR = [
        { prenom: { contains: q, mode: 'insensitive' } },
        { nom: { contains: q, mode: 'insensitive' } },
        { poste: { contains: q, mode: 'insensitive' } },
        { entreprise: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filtres?.domaine) {
      const d = filtres.domaine.toLowerCase();
      whereConditions.AND = [
        ...(whereConditions.AND || []),
        {
          OR: [
            { poste: { contains: d, mode: 'insensitive' } },
            { bio: { contains: d, mode: 'insensitive' } },
            { entreprise: { contains: d, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 3. Récupérer les mentors avec leurs compétences
    const mentors = await this.prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        prenom: true,
        nom: true,
        poste: true,
        entreprise: true,
        bio: true,
        competences: {
          include: {
            competence: true,
          },
        },
      },
    });

    // 4. Calculer le score de correspondance pour chaque mentor
    const suggestions = mentors
      .map((mentor) => {
        const mentorCompetences = mentor.competences.map((c) =>
          c.competence.nom.toLowerCase().trim(),
        );

        // Si filtre par compétence demandé, vérifier la présence
        if (filtres?.competence) {
          const cFiltre = filtres.competence.toLowerCase().trim();
          const matchCompetence = mentorCompetences.some((mc) => mc.includes(cFiltre));
          const matchBioPoste =
            (mentor.poste && mentor.poste.toLowerCase().includes(cFiltre)) ||
            (mentor.bio && mentor.bio.toLowerCase().includes(cFiltre));
          if (!matchCompetence && !matchBioPoste) {
            return null;
          }
        }

        // Calcul du matchScore
        let matchScore = 60; // Score de base

        if (stagiaireCompetenceNoms.length > 0 && mentorCompetences.length > 0) {
          const communes = mentorCompetences.filter((mc) =>
            stagiaireCompetenceNoms.includes(mc),
          );
          const ratio = communes.length / stagiaireCompetenceNoms.length;
          matchScore += Math.round(ratio * 35);
        } else if (mentorCompetences.length > 0) {
          matchScore += 15;
        }

        // Bonus pour profil complet (bio et poste renseignés)
        if (mentor.bio && mentor.poste) {
          matchScore = Math.min(matchScore + 5, 98);
        }

        return {
          id: mentor.id,
          name: `${mentor.prenom} ${mentor.nom}`,
          title: mentor.poste,
          company: mentor.entreprise,
          bio: mentor.bio,
          expertise: mentor.competences.map((c) => c.competence.nom),
          matchScore,
          prenom: mentor.prenom,
          nom: mentor.nom,
          poste: mentor.poste,
          entreprise: mentor.entreprise,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    return {
      stagiaireId,
      suggestions,
    };
  }
}

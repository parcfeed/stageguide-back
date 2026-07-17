import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CorrespondanceService {
  constructor(private readonly prisma: PrismaService) {}

  async proposerMentors(stagiaireId: string) {
    const mentors = await this.prisma.user.findMany({
      where: {
        role: 'MENTOR',
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        prenom: true,
        nom: true,
        poste: true,
        entreprise: true,
        bio: true,
      },
      take: 10,
    });

    const suggestions = mentors.map((mentor) => ({
      id: mentor.id,
      name: `${mentor.prenom} ${mentor.nom}`,
      title: mentor.poste,
      company: mentor.entreprise,
      bio: mentor.bio,
    }));

    return {
      stagiaireId,
      suggestions,
    };
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum StatutCandidatureEntreprise {
  EN_COURS = 'EN_COURS',
  ACCEPTEE = 'ACCEPTEE',
  REFUSEE = 'REFUSEE',
}

export class ChangerStatutCandidatureDto {
  @ApiProperty({
    description: 'Nouveau statut de la candidature',
    enum: StatutCandidatureEntreprise,
  })
  @IsEnum(StatutCandidatureEntreprise)
  statut: StatutCandidatureEntreprise;
}

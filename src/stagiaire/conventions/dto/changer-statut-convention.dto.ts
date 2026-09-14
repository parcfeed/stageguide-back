import { ApiProperty } from '@nestjs/swagger';
import { StatutConvention } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangerStatutConventionDto {
  @ApiProperty({
    enum: StatutConvention,
    example: StatutConvention.EN_ATTENTE_SIGNATURE,
    description: 'Nouveau statut de la convention',
  })
  @IsEnum(StatutConvention, {
    message: `Le statut doit être l'un des suivants : ${Object.values(StatutConvention).join(', ')}`,
  })
  statut!: StatutConvention;
}

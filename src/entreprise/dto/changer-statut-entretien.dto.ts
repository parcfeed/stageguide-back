import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum StatutEntretienUpdate {
  CONFIRME = 'CONFIRME',
  ANNULE = 'ANNULE',
  TERMINE = 'TERMINE',
}

export class ChangerStatutEntretienDto {
  @ApiProperty({
    description: 'Nouveau statut de l entretien',
    enum: StatutEntretienUpdate,
  })
  @IsEnum(StatutEntretienUpdate)
  statut: StatutEntretienUpdate;
}

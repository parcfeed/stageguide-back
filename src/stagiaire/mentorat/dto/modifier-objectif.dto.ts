import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ModifierObjectifDto {
  @ApiPropertyOptional({ description: 'Nouveau titre de l objectif' })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({
    description: 'Nouveau statut de l objectif',
    enum: ['pending', 'in_progress', 'completed'],
  })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed'])
  statut?: string;
}

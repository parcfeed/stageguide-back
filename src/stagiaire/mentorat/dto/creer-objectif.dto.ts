import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreerObjectifDto {
  @ApiProperty({ description: 'Titre de l objectif' })
  @IsString()
  titre: string;

  @ApiPropertyOptional({
    description: 'Statut de l objectif',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed'])
  statut?: string;
}

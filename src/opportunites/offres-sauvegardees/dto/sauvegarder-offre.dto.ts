import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SauvegarderOffreDto {
  @ApiPropertyOptional({ description: 'ID de l offre de stage a sauvegarder' })
  @IsOptional()
  @IsUUID('4')
  offreStageId?: string;

  @ApiPropertyOptional({ description: 'ID de l offre d emploi a sauvegarder' })
  @IsOptional()
  @IsUUID('4')
  offreEmploiId?: string;
}

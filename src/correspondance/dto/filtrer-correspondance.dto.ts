import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FiltrerCorrespondanceDto {
  @ApiPropertyOptional({
    example: 'Informatique',
    description: 'Filtrer par domaine ou secteur',
  })
  @IsOptional()
  @IsString()
  domaine?: string;

  @ApiPropertyOptional({
    example: 'TypeScript',
    description: 'Filtrer par nom de compétence',
  })
  @IsOptional()
  @IsString()
  competence?: string;

  @ApiPropertyOptional({
    example: 'Backend',
    description: 'Recherche textuelle par mot-clé',
  })
  @IsOptional()
  @IsString()
  recherche?: string;
}

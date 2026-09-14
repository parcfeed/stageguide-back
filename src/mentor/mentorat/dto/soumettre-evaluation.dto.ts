import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SoumettreEvaluationDto {
  @ApiProperty({ description: 'ID du stagiaire a evaluer' })
  @IsUUID('4')
  stagiaireId: string;

  @ApiPropertyOptional({ description: 'Note communication (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communication?: number;

  @ApiPropertyOptional({ description: 'Note resolution de problemes (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  resolutionProblemes?: number;

  @ApiPropertyOptional({ description: 'Note adaptabilite (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  adaptabilite?: number;

  @ApiPropertyOptional({ description: 'Note travail en equipe (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  travailEquipe?: number;

  @ApiPropertyOptional({ description: 'Commentaires libres' })
  @IsOptional()
  @IsString()
  commentaires?: string;
}

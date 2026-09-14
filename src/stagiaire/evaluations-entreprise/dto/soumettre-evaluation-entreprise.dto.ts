import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class SoumettreEvaluationEntrepriseDto {
  @ApiProperty({ description: 'ID de l entreprise évaluée' })
  @IsUUID('4')
  partenaireId!: string;

  @ApiProperty({ description: 'Note globale de 1 à 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  note!: number;

  @ApiPropertyOptional({ description: 'Commentaire libre' })
  @IsOptional()
  @IsString()
  commentaire?: string;
}

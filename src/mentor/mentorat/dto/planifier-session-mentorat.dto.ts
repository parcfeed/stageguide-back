import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class PlanifierSessionMentoratDto {
  @ApiProperty({ description: 'ID du stagiaire a mentorer' })
  @IsUUID('4')
  stagiaireId: string;

  @ApiProperty({ description: 'Sujet de la session' })
  @IsString()
  sujet: string;

  @ApiProperty({ description: 'Date et heure de debut de la session (ISO 8601)' })
  @IsDateString()
  commenceLe: string;

  @ApiPropertyOptional({ description: 'Date et heure de fin de la session (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  termineLe?: string;
}

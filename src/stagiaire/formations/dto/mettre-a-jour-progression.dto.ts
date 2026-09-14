import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MettreAJourProgressionDto {
  @ApiPropertyOptional({ example: 35, description: 'Pourcentage de progression de la formation (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progression?: number;
}

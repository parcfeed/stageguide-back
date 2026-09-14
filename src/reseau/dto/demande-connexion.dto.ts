import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DemandeConnexionDto {
  @ApiProperty({ example: 'UUID-utilisateur-cible' })
  @IsString()
  @IsNotEmpty()
  destinataireId!: string;

  @ApiPropertyOptional({ example: 'Bonjour, je souhaiterais échanger avec vous sur vos projets.' })
  @IsOptional()
  @IsString()
  message?: string;
}

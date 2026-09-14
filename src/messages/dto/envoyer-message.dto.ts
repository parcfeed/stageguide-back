import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class EnvoyerMessageDto {
  @ApiProperty({ example: 'Bonjour ! N oubliez pas notre session demain.' })
  @IsString()
  @MinLength(1)
  contenu!: string;

  @ApiPropertyOptional({ example: 'UUID-fichier-ou-document' })
  @IsOptional()
  @IsString()
  fichierId?: string;

  @ApiPropertyOptional({ example: 'https://github.com/stageguide/ressources' })
  @IsOptional()
  @IsString()
  lienRessource?: string;
}

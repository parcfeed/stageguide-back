import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  Min,
} from 'class-validator';

const typesDocument = [
  'CV',
  'LETTRE_MOTIVATION',
  'CONVENTION',
  'ATTESTATION',
  'CERTIFICAT',
  'AUTRE',
] as const;

export class EnregistrerFichierDto {
  @ApiProperty({ example: 'cv-jean-dupont.pdf' })
  @IsString()
  @MinLength(1)
  nom!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MinLength(1)
  typeMime!: string;

  @ApiPropertyOptional({
    example: 'data:application/pdf;base64,JVBERi0xLjQK',
    description: 'URL externe ou URL de données du fichier attaché.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/|data:)/i, {
    message: 'url must be a valid URL or a data URL',
  })
  url?: string;

  @ApiPropertyOptional({
    example: 'CV',
    enum: typesDocument,
    description: 'Type fonctionnel du document',
  })
  @IsOptional()
  @IsIn(typesDocument)
  typeDocument?: (typeof typesDocument)[number];

  @ApiPropertyOptional({
    example: 245760,
    description: 'Taille du fichier en octets',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tailleOctets?: number;
}

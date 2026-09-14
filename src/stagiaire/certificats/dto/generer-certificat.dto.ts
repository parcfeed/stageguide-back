import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class GenererCertificatDto {
  @ApiProperty({
    example: 'Certificat de réussite - Stage Développement Fullstack',
    description: 'Titre ou intitulé du certificat',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le titre du certificat est obligatoire' })
  titre!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/documents/certificat.pdf',
    description: 'URL du document PDF associé (optionnel)',
  })
  @IsOptional()
  @IsString()
  urlDocument?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreerConversationDto {
  @ApiProperty({ description: 'Liste des IDs des participants (sans l utilisateur courant)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: 'Titre optionnel de la conversation' })
  @IsOptional()
  @IsString()
  titre?: string;

  @ApiPropertyOptional({ description: 'Premier message a envoyer' })
  @IsOptional()
  @IsString()
  premierMessage?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EnvoyerMessageDto {
  @ApiProperty({ example: 'Bonjour ! N oubliez pas notre session demain.' })
  @IsString()
  @MinLength(1)
  contenu!: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreerAlerteDto {
  @ApiPropertyOptional({ example: 'Informatique' })
  @IsOptional()
  @IsString()
  domaine?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  ville?: string;

  @ApiPropertyOptional({ example: 'STAGE' })
  @IsOptional()
  @IsString()
  type?: string;
}

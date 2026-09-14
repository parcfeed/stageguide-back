import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class RepondreConnexionDto {
  @ApiProperty({ enum: ['ACCEPTEE', 'REFUSEE'], example: 'ACCEPTEE' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACCEPTEE', 'REFUSEE'])
  decision!: 'ACCEPTEE' | 'REFUSEE';
}

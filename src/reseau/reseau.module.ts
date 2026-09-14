import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReseauController } from './reseau.controller';
import { ReseauService } from './reseau.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReseauController],
  providers: [ReseauService],
  exports: [ReseauService],
})
export class ReseauModule {}

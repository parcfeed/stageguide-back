import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CorrespondanceModule } from './correspondance/correspondance.module';
import { EntrepriseModule } from './entreprise/entreprise.module';
import { FichiersModule } from './fichiers/fichiers.module';
import { ReseauModule } from './reseau/reseau.module';
import { MentorModule } from './mentor/mentor.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpportunitesModule } from './opportunites/opportunites.module';
import { PrismaModule } from './prisma/prisma.module';
import { StagiaireModule } from './stagiaire/stagiaire.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    StagiaireModule,
    MentorModule,
    EntrepriseModule,
    OpportunitesModule,
    CorrespondanceModule,
    MessagesModule,
    NotificationsModule,
    FichiersModule,
    ReseauModule,
  ],
})
export class AppModule {}

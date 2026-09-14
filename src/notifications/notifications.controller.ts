import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Liste les notifications de l utilisateur connecte' })
  @Get()
  async lister(@CurrentUser() utilisateur: { id: string }) {
    return this.notificationsService.lister(utilisateur.id);
  }

  @ApiOperation({ summary: 'Marque toutes les notifications comme lues' })
  @Patch('lire-tout')
  async marquerToutesLues(@CurrentUser() utilisateur: { id: string }) {
    return this.notificationsService.marquerToutesLues(utilisateur.id);
  }

  @ApiOperation({ summary: 'Marque une notification comme lue' })
  @ApiParam({ name: 'id', description: 'Identifiant de la notification' })
  @Patch(':id/lire')
  async marquerLue(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.marquerLue(utilisateur.id, notificationId);
  }
}

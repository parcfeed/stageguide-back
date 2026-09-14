import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreerConversationDto } from './dto/creer-conversation.dto';
import { EnvoyerMessageDto } from './dto/envoyer-message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @ApiOperation({ summary: 'Liste les conversations de l utilisateur connecte' })
  @Get()
  async listerConversations(@CurrentUser() utilisateur: { id: string }) {
    return this.messagesService.listerConversations(utilisateur.id);
  }

  @ApiOperation({ summary: 'Cree une nouvelle conversation' })
  @Post('conversations')
  async creerConversation(
    @CurrentUser() utilisateur: { id: string },
    @Body() donnees: CreerConversationDto,
  ) {
    return this.messagesService.creerConversation(utilisateur.id, donnees);
  }

  @ApiOperation({ summary: 'Recupere le detail d une conversation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la conversation' })
  @Get(':id')
  async getConversation(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') conversationId: string,
  ) {
    return this.messagesService.getConversation(utilisateur.id, conversationId);
  }

  @ApiOperation({ summary: 'Envoie un message dans une conversation' })
  @ApiParam({ name: 'id', description: 'Identifiant de la conversation' })
  @Post(':id/messages')
  async envoyerMessage(
    @CurrentUser() utilisateur: { id: string },
    @Param('id') conversationId: string,
    @Body() donnees: EnvoyerMessageDto,
  ) {
    return this.messagesService.envoyerMessage(
      utilisateur.id,
      conversationId,
      donnees,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  // *create conversation
  @Post('create-conversation')
  @ApiOperation({ summary: 'Create a new conversation' })
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req,
  ) {
    const user = req.user.userId;
    return this.conversationService.create(createConversationDto, user);
  }

  //  *conversation list of user
  @Get('conversation-list/:userId')
  async findAll(@Req() req, @Param('userId') userId: string) {
    return this.conversationService.findAll(userId);
  }

  // get conversation by id
  @Get('single-conversation/:id')
  @ApiOperation({ summary: 'Get a single conversation by ID' })
  findOne(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.findOne(id, user);
  }

  // delete conversation
  // Delete a conversation by ID
  @Delete('delete-conversation/:id')
  @ApiOperation({ summary: 'Delete a conversation by ID' })
  remove(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.remove(id, user);
  }
}

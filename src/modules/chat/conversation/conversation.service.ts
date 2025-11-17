import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { MessageGateway } from '../message/message.gateway';

@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  // *create conversation
  async create(createConversationDto: CreateConversationDto, sender: string) {

    const { participant_id } = createConversationDto;

     if(participant_id === sender){
      throw new ConflictException("Cannot create conversation with yourself");  
     }

     // check if conversation already exists between the two users
     const existingConversation = await this.prisma.conversation.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: sender } } },
            { participants: { some: { userId: participant_id } } },
          ],
        },
        include: {
          participants: {
            include: { user: {
              select: { 
                id: true,
                name: true,
                avatar: true,
            }
            }
           },
          },
        },
      });

       if (existingConversation) {
        return {
          message: 'Conversation already exists',
          success: true,
          conversation: {
            id: existingConversation.id,
            participants: existingConversation.participants.map((p) => ({
              userId: p.user.id,
              name: p.user.name,
              avatar: p.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${p.user.avatar}`) : null,
            })),
          },
        };
      }
      

      // create new conversation
      const newConversation = await this.prisma.conversation.create({
        data: {
          participants: {
            create: [
              { userId: sender },
              { userId: participant_id },
            ],
          },
        },
        include: {
          participants: {
            include: { user:{
              select: { 
                id: true,
                name: true,
                avatar: true,
              }
            },
          },
         },
        },
      });

      const formattedParticipants = {
        id: newConversation.id,
        participants: newConversation.participants.map((p) => ({
          userId: p.user.id,
          name: p.user.name,
          avatar: p.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${p.user.avatar}`) : null,
        })),
      }
      return {
        message: 'Conversation created successfully',
        success: true,
        conversation: formattedParticipants,
      };
  }
  
  //  *conversation list of user
  async findAll(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { 
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        messages: { 
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            text: true,
            attachments: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', 
      },
    });


    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      participants: conv.participants.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${p.user.avatar}`) : null,
      })),
      lastMessage: conv.messages[0]
        ? {
            text: conv.messages[0].text,
            attachments: conv.messages[0].attachments ? SojebStorage.url(`${appConfig().storageUrl.attachment}/${conv.messages[0].attachments}`) : null,
            createdAt: conv.messages[0].createdAt,
          }
        : null,
    }));

    return {
      message: 'Conversations retrieved successfully',
      success: true,
      conversations: formattedConversations,
    };
  }

  // get conversation by id
  async findOne(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: id,
        participants: { 
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: { 
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true, 
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant.',
      );
    }

    const formattedConversation = {
      id: conversation.id,
      participants: conversation.participants.map((p) => ({
        userId: p.user.id,
        name: p.user.name,
        avatar: p.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${p.user.avatar}`) : null,
      })),
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        text: msg.text,
        createdAt: msg.createdAt,
        sender: {
          id: msg.sender.id,
          name: msg.sender.name,
          avatar: msg.sender.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${msg.sender.avatar}`) : null,
        },
      })),
    };

    return {
      message: 'Conversation retrieved successfully',
      success: true,
      conversation: formattedConversation,
    };
  }

  // delete conversation
  async remove(id: string, userId: string) {
   
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: id,
        participants: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        'Conversation not found or you are not a participant.',
      );
    }

    await this.prisma.conversation.delete({
      where: {
        id: id,
      },
    });

    return {
      message: 'Conversation deleted successfully',
      success: true,
    };
  }


}

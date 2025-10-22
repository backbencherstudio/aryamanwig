import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import appConfig from '../../../config/app.config';
import { CreateMessageDto } from './dto/create-message.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { MessageGateway } from './message.gateway';
import { StringHelper } from 'src/common/helper/string.helper';
import { paginateResponse, PaginationDto } from 'src/common/pagination';
import { MessageStatus } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  // Send message (with Prisma transaction)
  async create(
    createMessageDto: CreateMessageDto,
    sender: string,
    image?: Express.Multer.File,
  ) {
    const { text, conversationId } = createMessageDto;

    
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId: sender },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.',
      );
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    
    let attachmentRecord = null;

    
    if (image) {
      const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;

      await SojebStorage.put(
        appConfig().storageUrl.attachment + '/' + fileName,
        image.buffer,
      );

      attachmentRecord = {
        name: image.originalname,
        type: image.mimetype,
        size: image.size,
        file: fileName,
      };
    }

    
    const [message] = await this.prisma.$transaction(async (tx) => {
     
      let newAttachment = null;

      if (attachmentRecord) {
        newAttachment = await tx.attachment.create({
          data: attachmentRecord,
        });
      }

      const newMessage = await tx.message.create({
        data: {
          text,
          conversationId,
          senderId: sender,
          status: 'SENT',
          attachmentId: newAttachment?.id,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          attachment: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return [newMessage];
    });
    
    
    return {
      message: 'Message sent successfully',
      success: true,
      data: message,
    };
  }
 
  // get all messages for a conversation
  async findAll(
    conversationId: string,
    userId: string,
    paginationdto: PaginationDto,
  ) {
    const { page, perPage } = paginationdto;
    const skip = (page - 1) * perPage;
    const take = perPage; 
    const whereClause = { conversationId };

    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId: userId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.',
      );
    }

    const [totalMessages, messages] = await this.prisma.$transaction([
      this.prisma.message.count({
        where: whereClause,
      }),
      this.prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true, 
              avatar: true,
            },
          },
          attachment: true, 
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: take, 
      }),
    ]);

   
    if (totalMessages === 0) {
      return {
        message: 'No messages found',
        success: true,
        data: paginateResponse([], page, perPage, totalMessages),
        
      };
    } 

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
     
      attachment: msg.attachment
        ? {
            id: msg.attachment.id,
            name: msg.attachment.name,
            type: msg.attachment.type,
            size: msg.attachment.size,
            file: SojebStorage.url(
              `${appConfig().storageUrl.attachment}/${msg.attachment.file}`,
            ),
          }
        : null,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        email: msg.sender.email,
        avatar: msg.sender.avatar
          ? SojebStorage.url(
              `${appConfig().storageUrl.avatar}/${msg.sender.avatar}`,
            )
          : null,
      },
    }));

    const paginationResult = paginateResponse(formattedMessages, page, perPage, totalMessages);

    return {
      message: 'Messages retrieved successfully',
      success: true,
      ...paginationResult,
      
    };
  } 

  // unread message count
  async getUnreadMessage(userId: string, conversationId: string) {
  
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.',
      );
    }

    const lastReadAt = participant.lastReadAt || new Date(0);

    const whereClause = {
      conversationId,
      NOT: { status: MessageStatus.READ },
      senderId: { not: userId },
      createdAt: { gt: lastReadAt },
    };

    // Prisma transaction (array version)
    const [unreadCount, unreadMessages] = await this.prisma.$transaction([

      this.prisma.message.count({
        where: whereClause,
      }),

      this.prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          attachment: true,
        },
      }),
    ]);


    const formattedMessages = unreadMessages.map((msg) => ({
    id: msg.id,
    text: msg.text,
    senderName: msg.sender.name,
    attachment: msg.attachment
      ? {
          id: msg.attachment.id,
          name: msg.attachment.name,
          type: msg.attachment.type,
          file: SojebStorage.url(
            `${appConfig().storageUrl.attachment}/${msg.attachment.file}`,
          ),
        }
      : null,
  }));

    return {
      message: 'Unread message count retrieved successfully',
      success: true,
      data: {
        count: unreadCount,
        messages: formattedMessages,
      },
    };
  }

  // Mark messages as read
  async readMessages(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new UnauthorizedException(
        'You are not a participant of this conversation.',
      );
    }

    const lastReadAt = participant.lastReadAt || new Date(0);

    await this.prisma.$transaction(async (tx) => {
      
      await tx.message.updateMany({
        where: {
          conversationId,
          senderId: { not: userId },
          status: { not: 'READ' },
          createdAt: { gt: lastReadAt },
        },
        data: { status: 'READ' },
      });

      await tx.participant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });
    });

    return {
      message: 'Messages marked as read successfully',
      success: true,
    };
  }

  // Delete a message
  async deleteMessage(userId: string, messageId: string) {

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        attachment: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this message.',
      );
    }

    await this.prisma.$transaction(async (tx) => {

        await tx.message.delete({
          where: { id: messageId },
        });

        await SojebStorage.delete(
          `${appConfig().storageUrl.attachment}/${message.attachment.file}`,
        );

        if (message.attachment) {
          await tx.attachment.delete({
            where: { id: message.attachment.id },
          });
        }
    });

   return {
     message: 'Message deleted successfully',
     success: true,
   };

  }
  
}


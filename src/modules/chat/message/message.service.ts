import { Injectable } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { CreateMessageDto } from './dto/create-message.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatRepository } from '../../../common/repository/chat/chat.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { MessageGateway } from './message.gateway';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { Role } from '../../../common/guard/role/role.enum';
import { AttachmentDto } from './dto/attachment.dto';

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) { }

  async create(
    user_id: string,
    createMessageDto: CreateMessageDto,
    attachments: AttachmentDto[] = []
  ) {
    try {
      const data: any = {};

      if (createMessageDto.conversation_id) {
        data.conversation_id = createMessageDto.conversation_id;
      }
      if (createMessageDto.message) {
        data.message = createMessageDto.message;
      }

      // check if conversation exists
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: createMessageDto.conversation_id },
        select: {
          id: true,
          participant_id: true,
          creator_id: true,
          deleted_by_creator: true,
          deleted_by_participant: true,
        },
      });
      // const conversation = await this.prisma.conversation.findFirst({
      //   where: {
      //     id: data.conversation_id,
      //   },
      // });
      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const receiver_id = conversation.creator_id === user_id ? conversation.participant_id : conversation.creator_id;
      if (receiver_id) {
        data.receiver_id = receiver_id;
      }

      // check if receiver exists
      const receiver = await this.prisma.user.findFirst({
        where: {
          id: receiver_id,
        },
      });

      if (!receiver) {
        return {
          success: false,
          message: 'Receiver not found',
        };
      }

      const message = await this.prisma.message.create({
        data: {
          ...data,
          status: MessageStatus.SENT,
          sender_id: user_id,
        },
      });

      // Check if this is the first message sent to the receiver by the sender
      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          sender_id: user_id,
          receiver_id: data.receiver_id,
        },
      });

      const userDetails = await UserRepository.getUserDetails(user_id);
      // If no notification exists, create one
      if (!existingNotification) {
        const notificationEvent = await this.prisma.notificationEvent.create({
          data: {
            type: 'New Message',
            text: `You have received a new message from ${userDetails.last_name}`,
          },
        });
        // Create the notification
        await this.prisma.notification.create({
          data: {
            sender_id: user_id,
            receiver_id: data.receiver_id,
            notification_event_id: notificationEvent.id,
          },
        });
      }

      // update conversation updated_at
      await this.prisma.conversation.update({
        where: {
          id: data.conversation_id,
        },
        data: {
          updated_at: DateHelper.now(),
        },
      });

      // emit message to receiver if online
      this.messageGateway.server
        .to(this.messageGateway.clients.get(data.receiver_id))
        .emit('message', { from: user_id, data: message });

      return {
        success: true,
        data: message,
        message: 'Message sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }



  async findAll({
    user_id,
    conversation_id,
    limit = 20,
    cursor,
  }: {
    user_id: string;
    conversation_id: string;
    limit?: number;
    cursor?: string;
  }) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const where_condition = {
        AND: [{ id: conversation_id }],
      };

      if (userDetails.type != Role.ADMIN) {
        where_condition['OR'] = [
          { creator_id: user_id },
          { participant_id: user_id },
        ];
      }

      const conversation = await this.prisma.conversation.findFirst({
        where: {
          ...where_condition,
        },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const paginationData = {};
      if (limit) {
        paginationData['take'] = limit;
      }
      if (cursor) {
        paginationData['cursor'] = cursor ? { id: cursor } : undefined;
      }

      const messages = await this.prisma.message.findMany({
        ...paginationData,
        where: {
          conversation_id: conversation_id,
        },
        orderBy: {
          created_at: 'asc',
        },
        select: {
          id: true,
          message: true,
          created_at: true,
          status: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },

          attachment: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              file: true,
            },
          },
        },
      });

      // add attachment url
      for (const message of messages) {
        if (message.attachment) {
          message.attachment['file_url'] = SojebStorage.url(
            appConfig().storageUrl.attachment + message.attachment.file,
          );
        }
      }

      // add image url
      for (const message of messages) {
        if (message.sender && message.sender.avatar) {
          message.sender['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + message.sender.avatar,
          );
        }
        if (message.receiver && message.receiver.avatar) {
          message.receiver['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + message.receiver.avatar,
          );
        }
      }

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateMessageStatus(message_id: string, status: MessageStatus) {
    return await ChatRepository.updateMessageStatus(message_id, status);
  }

  async readMessage(message_id: string) {
    return await ChatRepository.updateMessageStatus(
      message_id,
      MessageStatus.READ,
    );
  }

  async updateUserStatus(user_id: string, status: string) {
    return await ChatRepository.updateUserStatus(user_id, status);
  }
}

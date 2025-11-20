import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import appConfig from '../../../config/app.config';
import { CreateMessageDto } from './dto/create-message.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { MessageGateway } from './message.gateway';
import { StringHelper } from 'src/common/helper/string.helper';
import { paginateResponse, PaginationDto } from 'src/common/pagination';
import { MessageStatus } from '@prisma/client';
import { send } from 'process';
import { url } from 'inspector';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  // *Send message (with Prisma transaction)
  async create(
    createMessageDto: CreateMessageDto,
    sender: string,
    files?: Express.Multer.File[],
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

    const savedFileNames: string[] = [];

    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `${StringHelper.randomString(8)}_${file.originalname}`;
        await SojebStorage.put(
          appConfig().storageUrl.attachment + '/' + fileName,
          file.buffer,
        );
        savedFileNames.push(fileName);
      }
    }

    const message = await this.prisma.message.create({
      data: {
        text,
        conversationId,
        senderId: sender,
        status: MessageStatus.SENT,
        attachments: savedFileNames.length > 0 ? savedFileNames : [],
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
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const formatted = {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      status: message.status,
      attchment:message.attachments,
      attachments_url: (message.attachments || []).map((f) =>
        SojebStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
      ),
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
        avatar: message.sender.avatar
          ? SojebStorage.url(
              `${appConfig().storageUrl.avatar}/${message.sender.avatar}`,
            )
          : null,
      },
    };


    // note: socket implementation for message sending
   const participants = conversation.participants;
   const receiver = participants.find(p => p.userId !== sender); 
    
    if (receiver) {
     this.messageGateway.server
      .to(receiver.userId)
      .emit('message', {
        from: sender,
        data: formatted,
      });
    }

    /*
     socket.on('message', (msg) => {
      console.log('New message received:', msg);
    });
    */

    return {
      message: 'Message sent successfully',
      success: true,
      data: formatted,
    };
  }

  // *get all messages for a conversation
 // ... পূর্বের কোড ...

async findAll(
  conversationId: string,
  userId: string,
  paginationdto: PaginationDto,
) {
  const { page, perPage } = paginationdto;
  const skip = (page - 1) * perPage;
  const take = perPage;
  const whereClause = { conversationId };

  // **১. Authorization এবং Conversation Participants Fetch করা**
  const conversation = await this.prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
    },
  });

  if (!conversation) {
    throw new NotFoundException('Conversation not found');
  }

  // **২. ইউজারটি Participant কিনা, চেক করা**
  const isParticipant = conversation.participants.some(
    (p) => p.userId === userId,
  );
  if (!isParticipant) {
    throw new UnauthorizedException(
      'You are not a participant of this conversation.',
    );
  }

  // **৩. বর্তমান User (অনুরোধকারী) ছাড়া অন্য Participant-কে Receiver হিসেবে চিহ্নিত করা**
  // ধরে নেওয়া হচ্ছে এটি One-to-One চ্যাট, তাই রিসিভার একজনই হবে।
  const receiverParticipant = conversation.participants.find(
    (p) => p.userId !== userId,
  );
  
  // Receiver-এর ডেটা একবার ফরমেট করে রাখা হলো
  let formattedReceiver = null;
  if (receiverParticipant) {
    formattedReceiver = {
      id: receiverParticipant.user.id,
      name: receiverParticipant.user.name,
      email: receiverParticipant.user.email,
      avater: receiverParticipant.user.avatar,
      avatar_url: receiverParticipant.user.avatar
        ? SojebStorage.url(
            `${appConfig().storageUrl.avatar}/${receiverParticipant.user.avatar}`,
          )
        : null,
    };
  }

  // **৪. মেসেজ Count এবং Data Transaction**
  const [totalMessages, messages] = await this.prisma.$transaction([
    this.prisma.message.count({ where: whereClause }),
    this.prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        // 'receiver' ইনক্লুড করার দরকার নেই, কারণ আমরা Participant থেকে নিচ্ছি।
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
    }),
  ]);

  if (totalMessages === 0) {
    return {
      message: 'No messages found',
      success: true,
      data: paginateResponse([], page, perPage, totalMessages),
    };
  }

  // **৫. ফরমেটিং এবং Receiver যোগ করা**
  const formattedMessages = messages.map((msg) => ({
    id: msg.id,
    text: msg.text,
    attachments: msg.attachments,
    attachments_url: (msg.attachments || []).map((f) =>
      SojebStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
    ),
    createdAt: msg.createdAt,
    sender: {
      id: msg.sender.id,
      name: msg.sender.name,
      email: msg.sender.email,
      avater: msg.sender.avatar,
      avatar_url: msg.sender.avatar
        ? SojebStorage.url(
            `${appConfig().storageUrl.avatar}/${msg.sender.avatar}`,
          )
        : null,
    },
    // ***এখানে Receiver ডেটা যুক্ত করা হলো***
    // যদি বর্তমান ম্যাসেজটি এই Receiver-এর পাঠানো না হয়, তবে সেই Receiver-এর ডেটা এখানে থাকবে।
    // One-to-One চ্যাটের ক্ষেত্রে, ম্যাসেজের sender যদি আপনি না হন, তবে receiver-এর ডেটা অন্য participant-ই হবে।
    receiver: formattedReceiver,
  }));

  const paginationResult = paginateResponse(
    formattedMessages,
    page,
    perPage,
    totalMessages,
  );

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

    const [unreadCount, unreadMessages] = await this.prisma.$transaction([
      this.prisma.message.count({ where: whereClause }),
      this.prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      }),
    ]);

    const formattedMessages = unreadMessages.map((msg) => ({
      id: msg.id,
      text: msg.text,
      senderName: msg.sender.name,
      attachments: (msg.attachments || []).map((f) =>
        SojebStorage.url(`${appConfig().storageUrl.attachment}/${f}`),
      ),
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

      if (message.attachments && message.attachments.length > 0) {
        for (const fname of message.attachments) {
          await SojebStorage.delete(
            `${appConfig().storageUrl.attachment}/${fname}`,
          );
        }
      }
    });

    return {
      message: 'Message deleted successfully',
      success: true,
    };
  }

  // delete all message
  async deleteAllMessages(userId: string, conversationId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    if (participant.userId !== userId) {
      throw new UnauthorizedException(
        'You are not authorized to delete this message.',
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      select: { id: true, attachments: true },
    });

    // delete DB records in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.message.deleteMany({
        where: { conversationId },
      });
    });

    // delete files from storage (best-effort)
    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const fname of msg.attachments) {
          await SojebStorage.delete(
            `${appConfig().storageUrl.attachment}/${fname}`,
          );
        }
      }
    }

    return {
      message: 'Messages deleted successfully',
      success: true,
    };
  }
}

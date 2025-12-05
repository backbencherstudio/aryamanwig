import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {

  constructor(private prisma: PrismaService) {}

  async findAllNotificationsForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        receiver_id: userId, 
      },
      orderBy: {
        created_at: 'desc', 
      },
    });
  }
}

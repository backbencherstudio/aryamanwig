import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationService {
  
  constructor(
      private readonly prisma: PrismaService
  ) {}
 

   // get all notifications for a user
   async getNotificationsForUser(userId: string) {
      const notifications = await this.prisma.notification.findMany({
        where: {
          receiver_id: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true, 
            },
          },
          notification_event: true, 
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return {
        message: 'Notifications retrieved successfully',
        success: true,
        data: notifications,
      };
    }

    // get unread notification count for a user
    async getUnreadCount(userId: string) {
        const count = await this.prisma.notification.count({
          where: {
            receiver_id: userId,
            read_at: null,
          },
        });

        return {
          message: 'Unread notification count retrieved successfully',
          success: true,
          data: count,
        };
    }

    // mark a notification as read
    async markAsRead(notificationId: string, userId: string) {

      const notification = await this.prisma.notification.findFirst({
        where: {
          id: notificationId,
          receiver_id: userId,
        },
      });

      if (!notification) {
        throw new NotFoundException('Notification not found');
      }

      if (notification.read_at) {
        return {
          message: 'Notification already marked as read',
          success: true,
          data: notification,
        };
      }


      const updatedNotification = await this.prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          read_at: new Date(),
        },
      });

      return {
        message: 'Notification marked as read',
        success: true,
        data: updatedNotification,
      };
    }



  }


   


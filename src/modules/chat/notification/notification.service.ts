import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FirebaseService } from 'src/firebase/firebase.service';

// NotificationType সংজ্ঞা
type NotificationType =
  | 'new_user'
  | 'Review_Product'
  | 'user_approval'
  | 'disposal'
  | 'Boost_Product';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService, 
    private readonly firebaseService: FirebaseService 
  ) {}

  // ==========================
  // EXISTING FUNCTIONS
  // ==========================

  // get all notifications for a user
  async getNotificationsForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { receiver_id: userId },
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
      orderBy: { created_at: 'desc' },
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
      where: { receiver_id: userId, read_at: null },
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
      where: { id: notificationId, receiver_id: userId },
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
      where: { id: notificationId },
      data: { read_at: new Date() },
    });

    return {
      message: 'Notification marked as read',
      success: true,
      data: updatedNotification,
    };
  }

  // ==========================
  // NEW FCM LOGIC
  // ==========================

  /**
   * SEND NOTIFICATION + PUSH VIA FIREBASE
   */
  async sendNotification(data: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }) {
    const { sender_id, receiver_id, text, type, entity_id } = data;

    // 1️⃣ CREATE OR GET NotificationEvent
    let notificationEvent = await this.prisma.notificationEvent.findFirst({
      where: { type, text },
    });

    if (!notificationEvent) {
      notificationEvent = await this.prisma.notificationEvent.create({
        data: { type, text },
      });
    }

    // 2️⃣ CREATE Notification
    const notification = await this.prisma.notification.create({
      data: {
        sender_id,
        receiver_id,
        entity_id,
        notification_event_id: notificationEvent.id,
      },
    });

    // 3️⃣ FETCH user with FCM token
    const user = await this.prisma.user.findFirst({
      where: { id: receiver_id },
      select: { id: true, fcm_token: true, name: true },
    });

    if (!user || !user.fcm_token) {
      this.logger.warn(`User ${receiver_id} has no FCM token. Push skipped.`);
      return { success: true, message: 'Notification saved but no FCM token' };
    }

    // 4️⃣ CREATE PUSH PAYLOAD
    const pushTitle = type ? type.replace('_', ' ').toUpperCase() : 'New Notification';
    const payload = {
      id: notification.id,
      entity_id,
      title: pushTitle,
      body: text,
      type,
    };

    // 5️⃣ SEND PUSH NOTIFICATION
    await this.firebaseService.pushToDevice(user.fcm_token, pushTitle, text, payload);

    this.logger.log(`FCM Push sent to user ${receiver_id}`);
    return { success: true, message: 'Notification sent' };
  }
}

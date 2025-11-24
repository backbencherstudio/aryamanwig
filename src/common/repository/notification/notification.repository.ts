import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type NotificationType = 'new_user' |
                        'Review_Product' | 
                        'user_approval' |
                        'disposal' |
                        'Boost_Product' ;
                        

export class NotificationRepository {
  
  static async createNotification(payload: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: NotificationType;
    entity_id: string;
  }) {

    const { sender_id, receiver_id, text, type, entity_id } = payload;

    let notificationEvent = await prisma.notificationEvent.findFirst({
      where: { type, text },
    });

    if (!notificationEvent) {
      notificationEvent = await prisma.notificationEvent.create({
        data: { type, text },
      });
    }

    const newNotification = await prisma.notification.create({
      data: {
        sender_id,
        receiver_id,
        entity_id,
        notification_event_id: notificationEvent.id,
      },
    });

 
    const user = await prisma.user.findFirst({
      where: { id: receiver_id },
      select: { id: true, fcm_token: true, name: true }
    });

    if (!user || !user.fcm_token) {
    return { success: true, message: "Notification saved but no FCM token" };
    }

    




    return newNotification;
  }
}





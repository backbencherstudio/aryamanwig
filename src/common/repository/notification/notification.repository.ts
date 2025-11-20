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

    return newNotification;
  }
}




/*
export class NotificationRepository {
  static async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text?: string;
    type?:
      | 'message'
      | 'comment'
      | 'review'
      | 'booking'
      | 'payment_transaction'
      | 'package'
      | 'blog';
    entity_id?: string;
  }) {
    const notificationEventData = {};
    if (type) {
      notificationEventData['type'] = type;
    }
    if (text) {
      notificationEventData['text'] = text;
    }
    const notificationEvent = await prisma.notificationEvent.create({
      data: {
        type: type,
        text: text,
        ...notificationEventData,
      },
    });

    const notificationData = {};
    if (sender_id) {
      notificationData['sender_id'] = sender_id;
    }
    if (receiver_id) {
      notificationData['receiver_id'] = receiver_id;
    }
    if (entity_id) {
      notificationData['entity_id'] = entity_id;
    }

    const notification = await prisma.notification.create({
      data: {
        notification_event_id: notificationEvent.id,
        ...notificationData,
      },
    });

    return notification;
  }
}
*/
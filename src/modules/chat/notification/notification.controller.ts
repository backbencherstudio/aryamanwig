import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';


@Controller('notification')
@UseGuards(JwtAuthGuard)
export class NotificationController {

  constructor(private readonly notificationService: NotificationService) {}
  
  // get all notifications for the authenticated user
  @Get()
  getNotifications( @Req() req: any) {
    const userId = req.user.id;
    return this.notificationService.getNotificationsForUser(userId);
  }

  // user unreads a notification
  @Get('unread-count')
  getUnreadCount(@Req() req: any) {
    const userId = req.user.id;
    return this.notificationService.getUnreadCount(userId);
  }

  // mark a notification as read
  @Patch('read-notification/:id')
  markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationService.markAsRead(id, userId);
  }

  
}

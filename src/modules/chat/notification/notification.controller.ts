import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { Request } from 'express';

@Controller('no')
@UseGuards(JwtAuthGuard) // Ensures that only authenticated users can access these endpoints
export class NotificationController {

  constructor(private readonly notificationService: NotificationService) {}

  // Get all notifications for the authenticated user
  @Get()
  async getAllUserNotifications(@Req() req: Request) {
    const userId = req.user.userId; 
    
    console.log(`Fetching notifications for user ID: ${userId}`);

    try {
      const notifications = await this.notificationService.findAllNotificationsForUser(userId);
      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error fetching notifications',
        error: error.message,
      };
    }
  }
}

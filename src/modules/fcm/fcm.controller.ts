import { Controller, Patch, Body, UseGuards, Req, HttpCode } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // আপনার সঠিক পাথ
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard'; // আপনার সঠিক Auth Guard পাথ
import { UpdateFcmTokenDto } from './dto/update-fcm.dto';


@Controller('fcm')
@UseGuards(JwtAuthGuard)
export class FcmController {
  constructor(private readonly prisma: PrismaService) {}


  @Patch('token')
  @HttpCode(200)
  async updateToken(
    @Req() req: any, 
    @Body() updateFcmTokenDto: UpdateFcmTokenDto
  ) {
   
    const userId = req.user.id; 
    
    await this.prisma.user.update({
        where: { id: userId },
        data: {
            fcm_token: updateFcmTokenDto.token,
            device_type: updateFcmTokenDto.deviceType,
        },
        select: { id: true, fcm_token: true } 
    });

    return { 
        success: true, 
        message: 'FCM Token updated successfully for push notifications.' 
    };
  }
}
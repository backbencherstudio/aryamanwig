import { Controller, Get, Post, Body, Param, Req, UseGuards, UseInterceptors, UploadedFile, Patch } from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('disposal')
@UseGuards(JwtAuthGuard)
export class DisposalController {

  constructor(private readonly disposalService: DisposalService) {}

  // *Create Disposal Request
  @UseInterceptors(
    FileInterceptor('images', {
      storage: memoryStorage(),
      limits: { 
        fileSize: 5 * 1024 * 1024,  
      },
    }),
  )
  @Post('create/:productId')
  async createRequest(
    @Param('productId') productId: string, 
    @Body() createDisposalDto: CreateDisposalDto, 
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,  
  ) {
    const userId = req.user.userId;

    return this.disposalService.createDisposal(
      productId,
      createDisposalDto,
      userId,
      file  
    );
  }


  // *my pending disposal requests
  @Get('my-pending-requests')
  async getMyPendingRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.disposalService.getMyPendingRequests(userId);
  }

  // *my approved disposal requests
  @Get('my-approved-requests')
  async getMyApprovedRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.disposalService.getMyApprovedRequests(userId);
  }

  // *my payment completed disposal requests
  @Get('my-completed-requests')
  async getMyCompletedRequests(@Req() req: any) {
    const userId = req.user.userId;
    return this.disposalService.getMyCompletedRequests(userId);
  }


    
}

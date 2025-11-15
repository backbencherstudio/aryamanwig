import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Patch,
} from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UpdateDisposalStatusDto } from './dto/update-disposal.dto';
import { UpdateDisposalHistoryDto } from './dto/update-disposal-history';

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
      file,
    );
  }

  // *my disposal requests
  //* 1.PENDING
  //* 2.COMPLETED
  //* 3.APPROVED
  //* 4.Pickup
  // * 5.PENALTY

  @Get('my-disposal-requests/:status')
  async getMyRequestsByStatus(
    @Param('status') status: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;

    return this.disposalService.getMyRequestsByStatus(userId, status);
  }

  // Topic: Admin

  // *Get all pending disposal requests
  @Get('admin/pending-requests')
  async getAllPendingRequests() {
    return this.disposalService.getAllPendingRequests();
  }

  // *Approve Disposal Request
  // *1.APPROVED
  // *2.CANCELLED
  @Patch('admin/approve-request/:disposalId')
  async updateRequestStatus(
    @Param('disposalId') disposalId: string,
    @Body() updateDisposalStatusDto: UpdateDisposalStatusDto,
  ) {
    const { status } = updateDisposalStatusDto;
    return this.disposalService.updateRequestStatus(disposalId, status);
  }

  // *muss wig history
  // *1.All
  // *2.PICKEDUP
  // *3.COMPLETE
  // *4.PENALTY
  @Get('disposal-history/:status')
  async getDisposalHistory(@Param('status') status: string, @Req() req: any) {
    const userId = req.user.userId;
    return this.disposalService.getDisposalHistory(userId, status);
  }

  // *muss wig history change
  // *1.status penalty price with comment
  // *2.complete status
  @Patch('update-history/:disposalId')
  async updateDisposalHistory(
    @Param('disposalId') disposalId: string,
    @Body() updateDisposalHistoryDto: UpdateDisposalHistoryDto,
  ) {
    return this.disposalService.updateDisposalHistory(
      disposalId,
      updateDisposalHistoryDto,
    );
  }
}

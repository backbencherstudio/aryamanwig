import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DisposalService } from './disposal.service';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { UpdateDisposalDto } from './dto/update-disposal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('disposal')
@UseGuards(JwtAuthGuard)
export class DisposalController {

  constructor(private readonly disposalService: DisposalService) {}
  

  @Post('create/:productId')
  async createRequest(
    @Param('productId') productId: string, 
    @Body() createDisposalDto: CreateDisposalDto, 
    @Req() req: any,
  ) {
    const userId = req.user.userId; 

    return this.disposalService.createDisposal(
      productId,
      createDisposalDto,
      userId,
    );
  }


 

 
}

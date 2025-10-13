import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateStatusBidDto } from './dto/status-update-bid.dto';

@Controller('bid')
export class BidController {

  constructor(private readonly bidService: BidService) {}

  // create bid 
  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createBidDto: CreateBidDto,
         @Req() req: any
  ) {
    const user = req.user.userId;
    return this.bidService.create(createBidDto, user);
  }


  // get all bid a single product 
  @Get('singleproductbid/:productId')
  getBidsForProduct(@Param('productId') productId: string) {
    return this.bidService.getBidsForProduct(productId);
  }

  // approve or reject a bid
  @UseGuards(JwtAuthGuard)
  @Patch('update-status/:bidId')
  updateBidStatus(@Param('bidId') bidId: string,
                  @Body() updateStatusBidDto: UpdateStatusBidDto,
                  @Req() req: any
  ) {
    const productOwner = req.user.userId;
    return this.bidService.updateBidStatus(bidId, updateStatusBidDto, productOwner);
  }

  // get all bids by a user

}

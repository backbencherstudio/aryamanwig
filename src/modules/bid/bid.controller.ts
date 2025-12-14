import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { BidService } from './bid.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateStatusBidDto } from './dto/status-update-bid.dto';
import { PaginationDto } from 'src/common/pagination';

@Controller('bid')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  // *create bid
  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createBidDto: CreateBidDto, @Req() req: any) {
    const user = req.user.userId;
    return this.bidService.create(createBidDto, user);
  }

  // *get all bid a single product
  @Get('singleproductbid/:productId')
  getBidsForProduct(@Param('productId') productId: string) {
    return this.bidService.getBidsForProduct(productId);
  }

  // *approve or reject a bid
  @UseGuards(JwtAuthGuard)
  @Patch('update-status/:bidId')
  updateBidStatus(
    @Param('bidId') bidId: string,
    @Body() updateStatusBidDto: UpdateStatusBidDto,
    @Req() req: any,
  ) {
    const productOwner = req.user.userId;
    return this.bidService.updateBidStatus(
      bidId,
      updateStatusBidDto,
      productOwner,
    );
  }

  // TOPIC: buyer list

  // *get my all bids with accepted
  @UseGuards(JwtAuthGuard)
  @Get('my-accepted-bids')
  getMyBids(@Query() paginationDto: PaginationDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.bidService.getMyBids(userId, paginationDto);
  }

  // *get my all bids with pending
  @UseGuards(JwtAuthGuard)
  @Get('my-pending-bids')
  getMyPendingBids(@Query() paginationDto: PaginationDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.bidService.getMyPendingBids(userId, paginationDto);
  }

  // TOPIC: seller list

  // * my product wise request bid
  @UseGuards(JwtAuthGuard)
  @Get('seller-product-bids')
  getSellerProductWiseBids(
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const sellerId = req.user.userId;
    return this.bidService.getSellerProductWiseBids(sellerId, paginationDto);
  }

  // * get my all bids with accepted
  @UseGuards(JwtAuthGuard)
  @Get('seller-accepted-bids')
  getSellerAcceptedBids(
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const sellerId = req.user.userId;
    return this.bidService.getSellerAcceptedBids(sellerId, paginationDto);
  }
}

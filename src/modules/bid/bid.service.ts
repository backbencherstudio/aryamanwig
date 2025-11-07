import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBidDto } from './dto/create-bid.dto';
import { UpdateBidDto } from './dto/update-bid.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { UpdateStatusBidDto } from './dto/status-update-bid.dto';
import { log } from 'node:console';
import { getBoostTimeLeft } from 'src/common/utils/date.utils';
import { last } from 'rxjs';

@Injectable()
export class BidService {

  constructor(
      private readonly prisma: PrismaService,
  ) {}

  // create bid
  async create(createBidDto: CreateBidDto, userId: string) {

    const { product_id, bid_amount } = createBidDto;

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
      select: { 
        id: true,
        price: true,
        user_id: true
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.user_id === userId) {
      throw new ConflictException('You cannot bid on your own product');
    }

     if (new Decimal(bid_amount).greaterThanOrEqualTo(product.price)) {
      throw new ConflictException('Bid amount must be less than product price');
    }
   

    const bid = await this.prisma.bid.create({
      data: {
        product_id,
        user_id: userId,
        bid_amount,
      },
    });

    return {
      success: true,
      message: 'Bid created successfully',
      data: bid,
    }
  }



  // get all bids for a single product
  async getBidsForProduct(productId: string) {

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { 
        id: true,
        product_title: true,
        price: true,
        photo: true,
        user_id: true,
        created_at: true,
        boost_until: true,
        condition: true,
        location: true,
        size: true,
      },
    });

    console.log(product);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const bids = await this.prisma.bid.findMany({
      where: { product_id: productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            updated_at: true,
          },
        },
      },
      orderBy: {
        bid_amount: 'desc', 
      },
    });


    // যদি বিড না থাকে
    if (bids.length === 0) {
      return {
        success: true,
        message: 'No bids found for this product',
        data: [],
      };
    }

   return {
    success: true,
    message: 'Bids fetched successfully',
      product: {
        id: product.id,
        product_title: product.product_title,
        location:product.location,
        price: product.price,
        // --- 💡 পরিবর্তন এখানে ---
        photo: product.photo && product.photo.length > 0
          ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
          : [],
        // ------------------------- 
        condition: product.condition,
        size: product.size,
        boost_until:product.boost_until,
      },
      bids: bids.map(bid => ({
        id: bid.id,
        bid_amount: bid.bid_amount,
        last_updated: bid.updated_at,
        status: bid.status,
        bider_id: bid.user.id,
        bider_name: bid.user.name,
        bider_avatar: bid.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${bid.user.avatar}`) : null,
      })),
    };
  }

  // approve or reject a bid
  async updateBidStatus(bidId: string, 
                        updateStatusBidDto: UpdateStatusBidDto,
                        productOwner: string) {

    const { status } = updateStatusBidDto;

    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        product: true,
        user: true,
      },
    });

    if (!bid) {
     throw new NotFoundException('Bid not found');
    }

    if (bid.product.user_id !== productOwner) {
      throw new ConflictException('You are not the owner of this product');
    }


    if (bid.status === status) {
     throw new ConflictException(`Bid is already ${status}`);
    }


    const updatedBid = await this.prisma.bid.update({
     where: { id: bidId },
     data: { status },
    });



     return {
        success: true,
        message: `Bid status updated to ${status}`,
        data: {
          id: updatedBid.id,
          product_id: updatedBid.product_id,
          bid_amount: updatedBid.bid_amount,
          status: updatedBid.status,
          bidder: {
            id: bid.user.id,
            name: bid.user.name,
            avatar: bid.user.avatar
              ? SojebStorage.url(`${appConfig().storageUrl.product}/${bid.user.avatar}`)
              : null,
          },
        },
      };



     





  }



  
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { paginationToken } from 'aws-sdk/clients/supportapp';
import { paginateResponse, PaginationDto } from 'src/common/pagination';
import { BoostStatus, Prisma } from '@prisma/client';

@Injectable()
export class BidService {
  constructor(private readonly prisma: PrismaService) {}

  // *create bid
  async create(createBidDto: CreateBidDto, userId: string) {
    const { product_id, bid_amount } = createBidDto;

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
      select: {
        id: true,
        price: true,
        user_id: true,
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
    };
  }

  // *get all bids for a single product
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
        condition: true,
        location: true,
        size: true,
        boosts: {
          where: {
            status: BoostStatus.ACTIVE,
            end_date: { gte: new Date() },
          },
          orderBy: { end_date: 'desc' },
          take: 1,
        },
      },
    });

    

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
        location: product.location,
        price: product.price,
        photo:
          product.photo && product.photo.length > 0
            ? product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [],
        // -------------------------
        condition: product.condition,
        size: product.size,
        boost_until: product.boosts.length > 0 ? product.boosts[0].end_date : null,
      },
      bids: bids.map((bid) => ({
        id: bid.id,
        bid_amount: bid.bid_amount,
        last_updated: bid.updated_at,
        status: bid.status,
        bider_id: bid.user.id,
        bider_name: bid.user.name,
        bider_avatar: bid.user.avatar
          ? SojebStorage.url(
              `${appConfig().storageUrl.avatar}/${bid.user.avatar}`,
            )
          : null,
      })),
    };
  }

  // *approve or reject a bid
  async updateBidStatus(
    bidId: string,
    updateStatusBidDto: UpdateStatusBidDto,
    productOwner: string,
  ) {
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
            ? SojebStorage.url(
                `${appConfig().storageUrl.product}/${bid.user.avatar}`,
              )
            : null,
        },
      },
    };
  }

  // TOPIC: buyer list

  // *get all bids with accepted
  async getMyBids(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const total = await tx.bid.count({
        where: {
          user_id: userId,
          status: 'ACCEPTED',
        },
      });

      const myBids = await tx.bid.findMany({
        where: {
          user_id: userId,
          status: 'ACCEPTED',
        },
        skip,
        take: perPage,
        include: {
          product: {
            select: {
              id: true,
              product_title: true,
              price: true,
              photo: true,
              size: true,
              condition: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (myBids.length === 0) {
        return {
          success: true,
          message: 'No bids found for this user',
          data: [],
          total,
        };
      }

      // Format the bids data
      const formattedBids = myBids.map((bid) => {
        const productPhotos =
          bid.product.photo && bid.product.photo.length > 0
            ? bid.product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [];

        return {
          bid_id: bid.id,
          bid_amount: bid.bid_amount,
          status: bid.status,
          bid_created_at: bid.created_at,
          product: {
            id: bid.product.id,
            product_title: bid.product.product_title,
            original_price: bid.product.price,
            photo: productPhotos.length > 0 ? productPhotos[0] : null,
            size: bid.product.size,
            condition: bid.product.condition,
          },
        };
      });

      // Paginate the formatted data
      const paginatedData = paginateResponse(
        formattedBids,
        total,
        page,
        perPage,
      );

      return {
        success: true,
        message: 'Bids fetched successfully',
        data: paginatedData,
      };
    });

    return transactionResult;
  }

  // *get all bids with pending
  async getMyPendingBids(userId: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const total = await tx.bid.count({
        where: {
          user_id: userId,
          status: 'PENDING',
        },
      });

      const myBids = await tx.bid.findMany({
        where: {
          user_id: userId,
          status: 'PENDING',
        },
        skip,
        take: perPage,
        include: {
          product: {
            select: {
              id: true,
              product_title: true,
              price: true,
              photo: true,
              size: true,
              condition: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (myBids.length === 0) {
        return {
          success: true,
          message: 'No bids found for this user',
          data: [],
          total,
        };
      }

      // Format the bids data
      const formattedBids = myBids.map((bid) => {
        const productPhotos =
          bid.product.photo && bid.product.photo.length > 0
            ? bid.product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [];

        return {
          bid_id: bid.id,
          bid_amount: bid.bid_amount,
          status: bid.status,
          bid_created_at: bid.created_at,
          product: {
            id: bid.product.id,
            product_title: bid.product.product_title,
            original_price: bid.product.price,
            photo: productPhotos.length > 0 ? productPhotos[0] : null,
            size: bid.product.size,
            condition: bid.product.condition,
          },
        };
      });

      // Paginate the formatted data
      const paginatedData = paginateResponse(
        formattedBids,
        total,
        page,
        perPage,
      );

      return {
        success: true,
        message: 'Bids fetched successfully',
        data: paginatedData,
      };
    });

    return transactionResult;
  }

  // topic: seller list


  // *get product wise request bids
   async getSellerProductWiseBids(
    sellerId: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

     const whereClause = {
      user_id: sellerId,
      bids: { some: {} },
    };

   

    const [totalProducts, products] = await this.prisma.$transaction([
      
      this.prisma.product.count({
        where: whereClause
          
      }),

     
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        include: {
          bids: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
            orderBy: { bid_amount: 'desc' },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    
    if (products.length === 0) {
      return {
        success: true,
        message: 'No products with bids found for this seller',
        data: [],
        total: totalProducts,
      };
    }

   
    const formatted = products.map((product) => {
      const photos =
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [];

      return {
        product: {
          id: product.id,
          title: product.product_title,
          price: product.price,
          photo: photos.length > 0 ? photos[0] : null,
          size: product.size,
          condition: product.condition,
          created_at: product.created_at,
        },
        bids: product.bids.map((bid) => ({
          bid_id: bid.id,
          amount: bid.bid_amount,
          status: bid.status,
          bidder: {
            id: bid.user.id,
            name: bid.user.name,
            avatar: bid.user.avatar
              ? SojebStorage.url(
                  `${appConfig().storageUrl.avatar}/${bid.user.avatar}`,
                )
              : null,
          },
          bid_time: bid.created_at,
        })),
      };
    });

   
    const paginatedData = paginateResponse(formatted, totalProducts, page, perPage);

    return {
      success: true,
      message: 'Products with bids fetched successfully',
      data: paginatedData,
    };
  }
 

  //  * get my all bids with accepted
  async getSellerAcceptedBids(
    sellerId: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause: Prisma.BidWhereInput = {
      product: {
        user_id: sellerId,
      },
      status: 'ACCEPTED',
    };


    const [totalBids, bids] = await this.prisma.$transaction([
      this.prisma.bid.count({
        where: whereClause,
      }),

      this.prisma.bid.findMany({
        where: whereClause,
        skip,
        take: perPage,
        include: {
          product: {
            select: {
              id: true,
              product_title: true,
              price: true,
              photo: true,
              size: true,
              condition: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);


    if (bids.length === 0) {
      return {
        success: true,
        message: 'No accepted bids found for this seller',
        data: [],
        total: totalBids,
      };
    }

    const formattedBids = bids.map((bid) => {
      const productPhotos =
        bid.product.photo && bid.product.photo.length > 0
          ? bid.product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [];

      return {
        bid_id: bid.id,
        bid_amount: bid.bid_amount, 
        status: bid.status,
        bid_created_at: bid.created_at,
        product: {
          id: bid.product.id,
          title: bid.product.product_title,
          price: bid.product.price,
          photo: productPhotos.length > 0 ? productPhotos[0] : null,
          size: bid.product.size,
          condition: bid.product.condition,
        },
        bidder: {
          id: bid.user.id,
          name: bid.user.name,
          avatar: bid.user.avatar
            ? SojebStorage.url(
                `${appConfig().storageUrl.avatar}/${bid.user.avatar}`,
              )
            : null,
        },
      };
    });

    const paginatedData = paginateResponse(formattedBids, totalBids, page, perPage);

    return {
      success: true,
      message: 'Accepted bids fetched successfully',
      data: paginatedData,
    };
  }



  

  
}

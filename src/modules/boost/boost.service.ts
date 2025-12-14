import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BoostStatus,
  BoostPaymentStatus,
  ProductStatus,
  BoostTier,
} from '@prisma/client';
import { paginateResponse } from 'src/common/pagination/pagination.service';
import { BoostProductDto, BoostTierEnum } from './dto/boost-product.dto';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class BoostService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly TIER_DETAILS = {
    [BoostTierEnum.TIER_1]: {
      days: 3,
      price: 4.9,
      name: 'Muss Schnell Weg',
      tier: BoostTier.TIER_1,
    },
    [BoostTierEnum.TIER_2]: {
      days: 5,
      price: 9.9,
      name: 'Muss Zackig Weg',
      tier: BoostTier.TIER_2,
    },
    [BoostTierEnum.TIER_3]: {
      days: 7,
      price: 19.9,
      name: 'Muss Sofort Weg',
      tier: BoostTier.TIER_3,
    },
  };

  // *Boost a product
  async boost(boostProductDto: BoostProductDto, user: string) {
    const { product_id, boost_tier } = boostProductDto;

    const tierDetails = this.TIER_DETAILS[boost_tier];
    if (!tierDetails) {
      throw new ConflictException('Invalid boost tier provided');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${product_id} not found`);
    }

    if (product.user_id !== user) {
      throw new ConflictException('You are not allowed to boost this product');
    }

    if (product.status === ProductStatus.REJECTED) {
      throw new ConflictException('Rejected products cannot be boosted');
    }

    if (product.status === ProductStatus.PENDING) {
      throw new ConflictException('Only approved products can be boosted');
    }

    // Check if there's already an active boost
    const nowUTC = new Date();
    const existingActiveBoost = await this.prisma.boost.findFirst({
      where: {
        product_id: product_id,
        status: BoostStatus.ACTIVE,
        end_date: { gte: nowUTC },
      },
    });

    if (existingActiveBoost) {
      const remainingHours = Math.ceil(
        (new Date(existingActiveBoost.end_date).getTime() - nowUTC.getTime()) /
          (1000 * 60 * 60),
      );
      throw new ConflictException(
        `This product is already boosted! You can boost again after ${remainingHours} hours.`,
      );
    }

    const boostEndDate = new Date(
      nowUTC.getTime() + tierDetails.days * 24 * 60 * 60 * 1000,
    );

    // Create new boost record
    const newBoost = await this.prisma.boost.create({
      data: {
        user_id: user,
        product_id: product_id,
        tier: tierDetails.tier,
        status: BoostStatus.PENDING,
        payment_status: BoostPaymentStatus.PENDING,
        price: tierDetails.price,
        start_date: nowUTC,
        end_date: boostEndDate,
        until_date: boostEndDate,
      },
      include: {
        product: {
          select: {
            id: true,
            photo: true,
            product_title: true,
            size: true,
            condition: true,
            created_at: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Product boosted successfully',
      boost_status: newBoost.payment_status,
      data: {
        boost_id: newBoost.id,
        id: newBoost.product.id,
        photo: newBoost.product.photo,
        product_photo_url:
          newBoost.product.photo && newBoost.product.photo.length > 0
            ? newBoost.product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [],
        title: newBoost.product.product_title,
        size: newBoost.product.size,
        condition: newBoost.product.condition,
        created_time: newBoost.product.created_at,
        boost_time: newBoost.end_date,
        boost_tier_name: tierDetails.name,
        boost_price: newBoost.price,
      },
    };
  }

  // *Get Boosted Products by Status
  async getBoostedProductsByStatus(
    status: 'PENDING' | 'ACTIVE' | 'EXPIRED',
    page: number,
    perPage: number,
    user: string,
  ) {
    const skip = (page - 1) * perPage;
    const whereClause = {
      user_id: user,
      status: BoostStatus[status],
    };

    const [total, boostedProducts] = await this.prisma.$transaction([
      this.prisma.boost.count({ where: whereClause }),
      this.prisma.boost.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { end_date: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              product_title: true,
              photo: true,
              price: true,
              size: true,
              condition: true,
              created_at: true,
            },
          },
        },
      }),
    ]);

    const formattedProducts = boostedProducts.map((boost) => ({
      id: boost.product.id,
      title: boost.product.product_title,
      price: boost.product.price,
      condition: boost.product.condition,
      size: boost.product.size,
      created_time: boost.product.created_at,
      photo: boost.product.photo && boost.product.photo.length > 0
        ? boost.product.photo.map((p) =>
            SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
          )
        : [],
      boost_time: boost.end_date,
      boost_status: boost.status,
      boost_payment_status: boost.payment_status,
    }));

    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

    return {
      success: true,
      message: 'Boosted products retrieved successfully',
      ...paginatedData,
    };
  }

}
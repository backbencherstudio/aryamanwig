import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { UpdateDisposalDto } from './dto/update-disposal.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { DisposalItemSize, DisposalType, DisposalStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class DisposalService {

  constructor(private prisma: PrismaService) {}

 
  private readonly PICKUP_ITEM_PRICES = {
    [DisposalItemSize.SMALL]: 10.0,
    [DisposalItemSize.MEDIUM]: 20.0,
    [DisposalItemSize.LARGE]: 30.0,
    [DisposalItemSize.EXTRA_LARGE]: 0.0,
  };
  private readonly PICKUP_BASE_FEE = 80.0;
  private readonly MINIMUM_ORDER_VALUE = 120.0;
  private readonly ALLOWED_CITIES = ['zurich', 'schwyz'];
  private readonly SEND_IN_FEE = 5.0;


  async createDisposal(
    productId: string, 
    dto: CreateDisposalDto,
    userId: string,
  ) {
   
    const product = await this.prisma.product.findUnique({
      where: { id: productId }, 
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    if (product.user_id !== userId) {
      throw new ForbiddenException('You do not own this product.');
    }

    const existingRequest = await this.prisma.disposal.findFirst({
      where: {
        product_id: productId, 
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'A disposal request for this product is already in progress.',
      );
    }

   
    if (dto.type === DisposalType.PICKUP) {
      return this.createPickupRequest(productId, dto, userId);
    } else {
      return this.createSendInRequest(productId, dto, userId);
    }
  }

  
  private async createPickupRequest(
    productId: string,
    dto: CreateDisposalDto,
    userId: string,
  ) {
    
    if (!this.ALLOWED_CITIES.includes(dto.place_name.toLowerCase())) {
      throw new ForbiddenException(
        'Sorry, pickup service is only available in Canton Zurich & Schwyz.',
      );
    }
    
    const base_fee = this.PICKUP_BASE_FEE;
    const item_total_fee = this.PICKUP_ITEM_PRICES[dto.item_size];
    const final_total_amount = base_fee + item_total_fee;
    //const scheduledDate = new Date();

    const scheduled_at = new Date();
    this.validatePickupDayAndTime(scheduled_at);
   
    if (final_total_amount < this.MINIMUM_ORDER_VALUE) {
      throw new BadRequestException(
        `Minimum order value must be CHF ${this.MINIMUM_ORDER_VALUE}.`,
      );
    }

    const request = await this.prisma.disposal.create({
      data: {
        user_id: userId,
        product_id: productId, 
        type: 'PICKUP',
        status: DisposalStatus.PENDING, 
        payment_status: PaymentStatus.DUE,
        item_size: dto.item_size,
        final_total_amount: final_total_amount,
        base_fee: base_fee,
        item_total_fee: item_total_fee,
        place_address: dto.place_address,
        place_city: dto.place_name,
        scheduled_at: scheduled_at,
        place_name: dto.place_name,
      },
    });
    return {
      success: true,
      message: 'Pickup request created. Please proceed to payment.',
      data: request,
    };
  }

  private async createSendInRequest(
    productId: string,
    dto: CreateDisposalDto,
    userId: string,
  ) {
    
    const request = await this.prisma.disposal.create({
      data: {
        user_id: userId,
        product_id: productId,
        type: 'SEND_IN',
        status: DisposalStatus.PENDING,
      },
    });
    return {
      success: true,
      message: 'Send-in request created. Please proceed to payment.',
      data: request,
    };
  }


  private validatePickupDayAndTime(requestedDate: Date) {
   
    const dayOfWeek = requestedDate.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      throw new BadRequestException(
        'Pickup is only available on Saturday or Sunday.',
      );
    }

    const now = new Date();
    const currentDay = now.getUTCDay();
    
    const daysUntilFriday = (5 - currentDay + 7) % 7;
    const deadline = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilFriday,
        12, // 12:00
        0,
        0,
        0,
      ),
    );

    if (now.getTime() > deadline.getTime()) {
      const nextAvailableTime = deadline.getTime() + 24 * 60 * 60 * 1000;
      if (requestedDate.getTime() < nextAvailableTime) {
        throw new BadRequestException(
          'The deadline for this weekend (Friday 12:00) has passed. Please book for next weekend.',
        );
      }
    }
   
    else {
      if (requestedDate.getTime() < deadline.getTime()) {
        throw new BadRequestException(
          'Booking is too early. You can only book for the upcoming Saturday or Sunday.',
        );
      }
    }
  }
  




}

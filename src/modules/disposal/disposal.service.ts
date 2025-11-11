import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {  DisposalStatus, DisposalType,  ProductItemSize } from '@prisma/client';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class DisposalService {
  constructor(private prisma: PrismaService) {}

  private readonly PICKUP_ITEM_PRICES = {
    [ProductItemSize.SMALL]: 10.0,
    [ProductItemSize.MEDIUM]: 25.0,
    [ProductItemSize.LARGE]: 50.0,
  };

  private readonly PICKUP_BASE_FEE = 80.0;
  private readonly MINIMUM_ORDER_VALUE = 120.0;
  private readonly ALLOWED_CITIES = ['zurich', 'schwyz'];

  // *Create Disposal Request
  async createDisposal(
    productId: string, 
    dto: CreateDisposalDto,
    userId: string,
    file: Express.Multer.File,  
  ) {
    const { productname, producttype, productquantity, product_item_size } = dto;

    
    const product = await this.prisma.product.findUnique({
      where: { id: productId }, 
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

   
    if (product.product_item_size) {
      dto.product_item_size = product.product_item_size; 
    }

     // todo remove this comment later
    // if (product.user_id && product.user_id !== userId) {
    //   throw new ForbiddenException('You do not own this product.');
    // }

    
    if (!productname) {
      throw new BadRequestException('Please add product name.');
    }

    if (!producttype) {
      throw new BadRequestException('Please add product type.');
    }

    if (!productquantity) {
      throw new BadRequestException('Please add product quantity.');
    }

    if (!file) {
      throw new BadRequestException('Please upload a product photo.');
    }

    // Check if there is already an active disposal request for this product
    const existingRequest = await this.prisma.disposal.findFirst({
      where: {
        product_id: productId, 
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingRequest) {
      throw new ConflictException('A disposal request for this product is already in progress.');
    }

    // Based on the type of disposal (PICKUP or SEND_IN), create the respective request
    if (dto.type === DisposalType.PICKUP) {
      return this.createPickupRequest(productId, dto, userId, file, productquantity, dto.product_item_size);
    } else {
      return this.createSendInRequest(productId, dto, userId, file, productquantity, dto.product_item_size);
    }
  }
  // note: Pickup Request Creation
  private async createPickupRequest(
    productId: string,
    dto: CreateDisposalDto,
    userId: string,
    file: Express.Multer.File, 
    productquantity: number,
    product_item_size: ProductItemSize,
  ) {
    if (!this.ALLOWED_CITIES.includes(dto.place_name.toLowerCase())) {
      throw new ForbiddenException('Pickup service is only available in Canton Zurich & Schwyz.');
    }

    const base_fee = this.PICKUP_BASE_FEE;
    const item_total_fee = this.PICKUP_ITEM_PRICES[product_item_size] * productquantity;    
    const final_total_amount = base_fee + item_total_fee;

    if (final_total_amount < this.MINIMUM_ORDER_VALUE) {
      throw new BadRequestException(`Minimum order value must be CHF ${this.MINIMUM_ORDER_VALUE}.`);
    }

    let photo: string | null = null;

    // Upload the image
    if (file) {
      const fileName = `${StringHelper.randomString(8)}_${file.originalname}`;
      await SojebStorage.put(
        appConfig().storageUrl.disposalPhoto + '/' + fileName,
        file.buffer,
      );
      photo = fileName;
    }

    const request = await this.prisma.disposal.create({
      data: {
        user_id: userId,
        product_id: productId,
        productname: dto.productname,
        productphoto: photo, 
        producttype: dto.producttype,
        productquantity: dto.productquantity,
        type: DisposalType.PICKUP,
        item_size: product_item_size,
        base_fee: base_fee,
        item_total_fee: item_total_fee,
        final_total_amount: final_total_amount,
        place_name: dto.place_name,
        place_address: dto.place_address, 
        latitude: dto.place_latitude,
        longitude: dto.place_longitude,
      },
    });

    return {
      success: true,
      message: 'Pickup request created. Please wait for admin confirmation.',
      data: request,
    };
  }
  // note: Send-In Request Creation
  private async createSendInRequest(
    productId: string,
    dto: CreateDisposalDto,
    userId: string,
    file: Express.Multer.File,
    productquantity: number,
    product_item_size: ProductItemSize,
  ) {
    const base_fee = this.PICKUP_BASE_FEE;
    const item_total_fee = this.PICKUP_ITEM_PRICES[product_item_size] * productquantity;
    const final_total_amount = base_fee + item_total_fee;

    if (final_total_amount < this.MINIMUM_ORDER_VALUE) {
      throw new BadRequestException(`Minimum order value must be CHF ${this.MINIMUM_ORDER_VALUE}.`);
    }

    let photo: string | null = null;

    // Upload the image
    if (file) {
      const fileName = `${StringHelper.randomString(8)}_${file.originalname}`;
      await SojebStorage.put(
        appConfig().storageUrl.disposalPhoto + '/' + fileName,
        file.buffer,
      );
      photo = fileName;
    }

    const request = await this.prisma.disposal.create({
      data: {
        user_id: userId,
        product_id: productId,
        productname: dto.productname,
        productphoto: photo, 
        producttype: dto.producttype,
        productquantity: dto.productquantity,
        type: DisposalType.SEND_IN,
        item_size: product_item_size,
        base_fee: base_fee,
        item_total_fee: item_total_fee,
        final_total_amount: final_total_amount,
      },
    });

    return {
      success: true,
      message: 'Send-in request created. Please wait for admin confirmation.',
      data: request,
    };
  }

  // *Get pending disposal requests for the user
  async getMyPendingRequests(userId: string) {
    const pendingRequests = await this.prisma.disposal.findMany({
      where: {
        user_id: userId,
        status: DisposalStatus.PENDING,
      },
      select: {  
        productname: true,
        producttype: true,
        productquantity: true,
        final_total_amount: true,
        productphoto: true,
        product: {
          select: {
            product_title: true,
            product_item_size: true,
            condition: true,
            size: true,
          },
        },
      },
    });

    return pendingRequests.map(request => ({
      productname: request.productname,
      productsize: request.product.size,          
      condition: request.product.condition,     
      final_total_amount: request.final_total_amount,
      productquantity: request.productquantity,
      productphoto: request.productphoto,
    }));
  }

  // *Get approved disposal requests for the user
  async getMyApprovedRequests(userId: string) {
    const approvedRequests = await this.prisma.disposal.findMany({
      where: {
        user_id: userId,
        status: DisposalStatus.CONFIRMED,
      },
    });

    return approvedRequests;
  }

  // *Get completed disposal requests for the user
  async getMyCompletedRequests(userId: string) {
    const completedRequests = await this.prisma.disposal.findMany({
      where: {
        user_id: userId,
        status: DisposalStatus.COMPLETED,
      },
    });

    return completedRequests;
  }







}

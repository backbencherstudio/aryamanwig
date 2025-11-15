import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDisposalDto } from './dto/create-disposal.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DisposalStatus,
  DisposalType,
  PaymentStatus,
  ProductItemSize,
} from '@prisma/client';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { UpdateDisposalHistoryDto } from './dto/update-disposal-history';

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
    const { productname, producttype, productquantity, product_item_size } =
      dto;

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
      throw new ConflictException(
        'A disposal request for this product is already in progress.',
      );
    }

    // Based on the type of disposal (PICKUP or SEND_IN), create the respective request
    if (dto.type === DisposalType.PICKUP) {
      return this.createPickupRequest(
        productId,
        dto,
        userId,
        file,
        productquantity,
        dto.product_item_size,
      );
    } else {
      return this.createSendInRequest(
        productId,
        dto,
        userId,
        file,
        productquantity,
        dto.product_item_size,
      );
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
      throw new ForbiddenException(
        'Pickup service is only available in Canton Zurich & Schwyz.',
      );
    }

    const base_fee = this.PICKUP_BASE_FEE;
    const item_total_fee =
      this.PICKUP_ITEM_PRICES[product_item_size] * productquantity;
    const final_total_amount = base_fee + item_total_fee;

    if (final_total_amount < this.MINIMUM_ORDER_VALUE) {
      throw new BadRequestException(
        `Minimum order value must be CHF ${this.MINIMUM_ORDER_VALUE}.`,
      );
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
    const item_total_fee =
      this.PICKUP_ITEM_PRICES[product_item_size] * productquantity;
    const final_total_amount = base_fee + item_total_fee;

    if (final_total_amount < this.MINIMUM_ORDER_VALUE) {
      throw new BadRequestException(
        `Minimum order value must be CHF ${this.MINIMUM_ORDER_VALUE}.`,
      );
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
  async getMyRequestsByStatus(userId: string, status: string) {
    const whereClause: any = {
      user_id: userId,
    };

    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
      case 'PENDING':
        whereClause.status = DisposalStatus.PENDING;
        break;

      case 'APPROVED':
        whereClause.status = DisposalStatus.CONFIRMED;
        whereClause.payment_status = PaymentStatus.DUE;
        break;

      case 'PICKUP':
        whereClause.status = DisposalStatus.PICKUP;
        whereClause.payment_status = PaymentStatus.PAID;
        break;

      case 'COMPLETED':
        whereClause.status = DisposalStatus.COMPLETED;
        break;

      case 'PENALTY':
        whereClause.status = DisposalStatus.PENALTY;
        break;

      default:
        throw new BadRequestException('Invalid status type');
    }

    const requests = await this.prisma.disposal.findMany({
      where: whereClause,
      select: {
        productname: true,
        producttype: true,
        productquantity: true,
        final_total_amount: true,
        productphoto: true,
        status: true,
        payment_status: true,
        admin_comment: true,
        penalty_amount: true,
        product: {
          select: {
            product_title: true,
            product_item_size: true,
            condition: true,
            size: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (requests.length === 0) {
      throw new NotFoundException(
        'No disposal requests found for the specified status. ',
      );
    }

    return requests.map((request) => ({
      productname: request.productname,
      productsize: request.product.size,
      condition: request.product.condition,
      final_total_amount: request.final_total_amount,
      productquantity: request.productquantity,
      productphoto: request.productphoto,
      photoUrl: request.productphoto
        ? SojebStorage.url(
            `${appConfig().storageUrl.disposalPhoto}/${request.productphoto}`,
          )
        : null,
      status: request.status,
      payment_status: request.payment_status,
      comment: request.admin_comment,
      penaltyAmount: request.penalty_amount,
    }));
  }

  // Topic: Admin

  // *Get all pending disposal requests
  async getAllPendingRequests() {
    const requests = await this.prisma.disposal.findMany({
      where: {
        status: DisposalStatus.PENDING,
      },
      select: {
        id: true,
        place_address: true,
        place_name: true,
        productname: true,
        productquantity: true,
        item_size: true,
        latitude: true,
        longitude: true,
        final_total_amount: true,
        productphoto: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return requests.map((req) => ({
      disposalId: req.id,
      sellerName: req.user.name,
      email: req.user.email,
      pickupAddress: `${req.place_name}, ${req.place_address}`,
      mapUrl: `https://www.google.com/maps?q=${req.latitude},${req.longitude}`,
      productName: req.productname,
      quantity: req.productquantity,
      size: req.item_size,
      price: req.final_total_amount,
      productPhoto: req.productphoto,
    }));
  }

  // * Approve Disposal Request
  async updateRequestStatus(disposalId: string, status: string) {
    const request = await this.prisma.disposal.findUnique({
      where: { id: disposalId },
    });

    if (!request) {
      throw new NotFoundException('Disposal request not found.');
    }
    if (request.status !== DisposalStatus.PENDING) {
      throw new BadRequestException(
        'This request is not in pending state and cannot be updated.',
      );
    }

    let dataToUpdate: any = {};
    const normalizedStatus = status.toUpperCase();

    if (normalizedStatus === 'APPROVED') {
      dataToUpdate = {
        status: DisposalStatus.CONFIRMED,
        admin_approved: true,
        approved_at: new Date(),
      };
    } else if (normalizedStatus === 'CANCELLED') {
      dataToUpdate = {
        status: DisposalStatus.CANCELLED,
      };
    } else {
      throw new BadRequestException('Invalid status value provided.');
    }

    await this.prisma.disposal.update({
      where: { id: disposalId },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: `Request has been ${status.toLowerCase()}.`,
    };
  }

  // *Get disposal history
  async getDisposalHistory(userId: string, status: string) {
    const whereClause: any = {
      user_id: userId,
    };

    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
      case 'ALL':
        whereClause.status = {
          not: DisposalStatus.PENDING,
        };
        break;

      case 'PICKUP':
        whereClause.status = DisposalStatus.PICKUP;
        whereClause.payment_status = PaymentStatus.PAID;
        break;

      case 'COMPLETED':
        whereClause.status = DisposalStatus.COMPLETED;
        break;

      case 'PENALTY':
        whereClause.status = DisposalStatus.PENALTY;
        break;

      default:
        throw new BadRequestException('Invalid status type');
    }

    const requests = await this.prisma.disposal.findMany({
      where: whereClause,
      select: {
        id: true,
        productname: true,
        producttype: true,
        productquantity: true,
        final_total_amount: true,
        productphoto: true,
        status: true,
        payment_status: true,
        admin_comment: true,
        penalty_amount: true,
        product: {
          select: {
            product_title: true,
            product_item_size: true,
            condition: true,
            size: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        latitude: true,
        longitude: true,
        place_address: true,
        place_name: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return requests.map((request) => ({
      disposalId: request.id,
      sellerName: request.user.name,
      email: request.user.email,
      pickupAddress:
        `${request.place_name || ''}, ${request.place_address || ''}`.trim(),
      mapUrl: `https://www.google.com/maps?q=${request.latitude},${request.longitude}`,
      productName: request.productname,
      productPhoto: request.productphoto,
      qnty: request.productquantity,
      size: request.product.product_item_size,
      price: request.final_total_amount,
      earnings: request.final_total_amount,
      status: request.status,
      comment: request.admin_comment,
      penaltyAmount: request.penalty_amount,
      payment_status: request.payment_status,
    }));
  }

  // *Update disposal history
  async updateDisposalHistory(
    disposalId: string,
    dto: UpdateDisposalHistoryDto,
  ) {
    const request = await this.prisma.disposal.findUnique({
      where: { id: disposalId },
    });

    if (!request) {
      throw new NotFoundException('Disposal request not found.');
    }

    let dataToUpdate: any = {};
    const newStatus = dto.status;

    if (newStatus === DisposalStatus.COMPLETED) {
      dataToUpdate = {
        status: DisposalStatus.COMPLETED,
      };
    } else if (newStatus === DisposalStatus.PENALTY) {
      dataToUpdate = {
        status: DisposalStatus.PENALTY,
        penalty_amount: dto.penalty_amount,
        admin_comment: dto.comment,
      };
    }

    await this.prisma.disposal.update({
      where: { id: disposalId },
      data: dataToUpdate,
    });

    return {
      success: true,
      message: `Request status has been updated to ${newStatus.toLowerCase()}.`,
    };
  }
}

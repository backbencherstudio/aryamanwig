import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Condition, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { BoostProductDto, BoostTierEnum } from './dto/boost-product.dto';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { subHours } from 'date-fns';
import { formatDate, getBoostTimeLeft } from 'src/common/utils/date.utils';
import { ca, id } from 'date-fns/locale';
import { paginateResponse } from 'src/common/pagination/pagination.service';
import { PaginationDto } from 'src/common/pagination';
import {
  ProductStatus,
  Prisma,
  BoostPaymentStatus,
  BoostStatus,
} from '@prisma/client';
import { MessageGateway } from '../chat/message/message.gateway';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import { UserRepository } from 'src/common/repository/user/user.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  //-------------------------------------get active products boost
  private async getActiveBoost(productId: string) {
    const nowUTC = new Date();
    return this.prisma.boost.findFirst({
      where: {
        product_id: productId,
        status: BoostStatus.ACTIVE,
        end_date: { gte: nowUTC },
      },
      orderBy: { end_date: 'desc' },
    });
  }
  //-----------------------------------------------

  // create product
  async create(
    createProductDto: CreateProductDto,
    user: string,
    images?: Express.Multer.File[],
  ) {
    const {
      product_title,
      product_description,
      stock,
      price,
      location,
      size,
      color,
      time,
      condition,
      category_id,
      product_item_size,
    } = createProductDto;

    const existingProduct = await this.prisma.product.findFirst({
      where: { product_title, user_id: user },
    });

    if (existingProduct) {
      throw new ConflictException('Product with this title already exists');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: category_id },
    });
    if (!category) {
      throw new ConflictException('Category does not exist');
    }

    let photos: string[] = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;

        await SojebStorage.put(
          appConfig().storageUrl.product + '/' + fileName,
          image.buffer,
        );

        photos.push(fileName);
      }

      // Create product in DB
      const newProduct = await this.prisma.product.create({
        data: {
          product_title,
          product_description,
          price,
          stock,
          photo: photos,
          location,
          size,
          color,
          time,
          condition,
          user_id: user,
          category_id,
          product_item_size,
        },
      });

      let photoUrl = null;
      if (newProduct.photo) {
        photoUrl = SojebStorage.url(
          `${appConfig().storageUrl.product}/${newProduct.photo}`,
        );
      }

      return {
        success: true,
        message: 'Product created successfully',
        data: {
          id: newProduct.id,
          product_title: newProduct.product_title,
          product_description: newProduct.product_description,
          price: newProduct.price,
          stock: newProduct.stock,
          photo: newProduct.photo,
          photoUrl,
        },
      };
    }
  }

  // Get all products
  async findAll(page: number, perPage: number) {
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          size: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      product_photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginatedData,
    };
  }

  // Get a product by ID
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
        bids: {
          orderBy: { created_at: 'asc' },
          take: 1,
          select: { id: true, bid_amount: true },
        },
        boosts: {
          where: {
            status: BoostStatus.ACTIVE,
            until_date: { gte: new Date() },
          },
          orderBy: { until_date: 'desc' },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // Seller er total product count
    const totalItems = await this.prisma.product.count({
      where: { user_id: product.user_id },
    });

    const activeBoost = product.boosts.length > 0 ? product.boosts[0] : null;

    return {
      success: true,
      message: 'Product retrieved successfully',
      data: {
        seller_Info: {
          user_id: product.user.id,
          name: product.user.name,
          profile_photo: product.user.avatar
            ? SojebStorage.url(
                `${appConfig().storageUrl.avatar}/${product.user.avatar}`,
              )
            : null,
          total_items: totalItems,
        },

        product_id: product.id,
        product_photo:
          product.photo && product.photo.length > 0
            ? product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [],
        title: product.product_title,
        status: product.status,
        location: product.location,
        price: product.price,
        description: product.product_description,
        condition: product.condition === 'NEW' ? 'Like New' : product.condition,
        size: product.size,
        product_item_size: product.product_item_size,
        color: product.color || 'Not Specified',
        uploaded: product.created_at,
        remaining_time: activeBoost ? activeBoost.until_date : null,
        minimum_bid:
          product.bids.length > 0 ? product.bids[0].bid_amount : null,
        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        },
      },
    };
  }

  //update product
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: string,
    newImages?: Express.Multer.File[],
  ) {
    const { images_to_delete, ...updateData } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    if (product.user_id !== user)
      throw new ConflictException('You are not allowed to update this product');

    let photos: string[] = product.photo || [];

    if (
      updateProductDto.images_to_delete &&
      updateProductDto.images_to_delete.length > 0
    ) {
      for (const img of updateProductDto.images_to_delete) {
        await SojebStorage.delete(`${appConfig().storageUrl.product}/${img}`);
        photos = photos.filter((p) => p !== img); // remove from array
      }
    }

    if (newImages && newImages.length > 0) {
      for (const image of newImages) {
        const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;
        await SojebStorage.put(
          `${appConfig().storageUrl.product}/${fileName}`,
          image.buffer,
        );
        photos.push(fileName);
      }
    }

    if (updateProductDto.category_id) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.category_id },
      });

      if (!category) {
        throw new ConflictException('Category does not exist');
      }
    }

    if (
      updateProductDto.product_title &&
      updateProductDto.product_title !== product.product_title
    ) {
      const existingProduct = await this.prisma.product.findFirst({
        where: { product_title: updateProductDto.product_title, user_id: user },
      });

      if (existingProduct) {
        throw new ConflictException('Product with this title already exists');
      }
    }

    // Validate price
    if (updateProductDto.price) {
      if (updateProductDto.price <= 0) {
        throw new ConflictException('Price must be greater than 0');
      }
    }

    // Validate stock
    if (updateProductDto.stock) {
      if (updateProductDto.stock < 0) {
        throw new ConflictException('Stock cannot be less than 0');
      }
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...updateData,
        photo: photos,
      },
    });

    const photoUrls =
      updatedProduct.photo?.map((p) =>
        SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
      ) || [];

    return {
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updatedProduct.id,
        product_title: updatedProduct.product_title,
        product_description: updatedProduct.product_description,
        status: updatedProduct.status,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
        condition: updatedProduct.condition,
        photo: updatedProduct.photo,
        photoUrls,
        product_owner: updatedProduct.user_id,
      },
    };
  }

  // delete product
  async remove(id: string, user: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.user_id !== user) {
      throw new ConflictException('You are not allowed to delete this product');
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  // get all products for a user
  async getAllProductsForUser(user: string, query: PaginationDto) {
    const { page, perPage } = query;
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({
        where: { user_id: user, ...whereClause },
      }),
      this.prisma.product.findMany({
        where: { user_id: user, ...whereClause },
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          product_description: true,
          location: true,
          size: true,
          color: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found for this user',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo: product.photo,
      product_photo_url:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,

      price: product.price,
      description: product.product_description,
      location: product.location,
      condition: product.condition === 'NEW' ? 'Like New' : product.condition,
      size: product.size,
      color: product.color || 'Not Specified',
      uploaded: product.created_at,
      remaining_time:
        product.boosts.length > 0 ? product.boosts[0].until_date : null,
      is_in_wishlist: product.wishlists.length > 0,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginatedData,
    };
  }

  // get all product for client
  async getAllProductsForClient(user: string, query: PaginationDto) {
    const { page, perPage } = query;
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({
        where: { user_id: user, ...whereClause },
      }),
      this.prisma.product.findMany({
        where: { user_id: user, ...whereClause },
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          product_description: true,
          location: true,
          size: true,
          color: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found for this user',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo: product.photo,
      product_photo_url:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,

      price: product.price,
      description: product.product_description,
      location: product.location,
      condition: product.condition === 'NEW' ? 'Like New' : product.condition,
      size: product.size,
      color: product.color || 'Not Specified',
      uploaded: product.created_at,
      remaining_time:
        product.boosts.length > 0 ? product.boosts[0].until_date : null,
      is_in_wishlist: product.wishlists.length > 0,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginatedData,
    };
  }

  // search products
  async searchProducts(paginationDto: PaginationDto, search?: string) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    let whereClause: any = {
      status: ProductStatus.APPROVED,
    };

    if (search && search.trim() !== '') {
      whereClause = {
        ...whereClause,
        product_title: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          size: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found matching your search',
        ...paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
    }));

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginateResponse(formattedProducts, total, page, perPage),
    };
  }
  
  // filter products by price range and categories
  async filterProducts(filterDto: FilterProductDto, user: string) {
    const { min_price, max_price, categories, location, time_in_hours } =
      filterDto;

    // 🔹 Base where clause
    let whereClause: any = {
      status: ProductStatus.APPROVED,
    };

    if (min_price) {
      whereClause.price = { ...whereClause.price, gte: min_price };
    }
    if (max_price) {
      whereClause.price = { ...whereClause.price, lte: max_price };
    }
    if (categories && categories.length) {
      whereClause.category_id = { in: categories };
    }
    if (location) {
      whereClause.location = { contains: location, mode: 'insensitive' };
    }

    // 🔹 Time filter for boosted products
    let boostFilter: any = {
      status: BoostStatus.ACTIVE,
      until_date: { gte: new Date() },
    };

    if (time_in_hours) {
      const now = new Date();
      const timeThreshold = new Date(
        now.getTime() + time_in_hours * 60 * 60 * 1000,
      );
      boostFilter.until_date = { gte: now, lte: timeThreshold };
      whereClause.boosts = { some: boostFilter };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      select: {
        id: true,
        product_title: true,
        status: true,
        size: true,
        condition: true,
        created_at: true,
        price: true,
        photo: true,
        wishlists: {
          where: { user_id: user },
          select: { id: true },
        },
        boosts: {
          where: {
            status: BoostStatus.ACTIVE,
            until_date: { gte: new Date() },
          },
          orderBy: { until_date: 'desc' },
          take: 1,
        },
      },
    });

    if (!products.length) {
      return {
        success: false,
        total: 0,
        message: 'No products found',
        data: [],
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
    }));

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: formattedProducts,
        product_count: products.length,
      },
    };
  }

  /*=================( Category Area Start)=================*/
  // get all products in a category
  async findAllProductsInCategory(
    categoryId: string,
    user: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const whereClause = {
      category_id: categoryId,
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          size: true,
          condition: true,
          status: true,
          created_at: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          bids: {
            orderBy: { created_at: 'asc' },
            take: 1,
            select: { id: true, bid_amount: true },
          },
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found in this category',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,
      size: product.size,
      status: product.status,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left:
        product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginatedData,
    };
  }

  // get category based latest products
  async findLatestProductsInCategory(
    categoryId: string,
    user: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const whereClause = {
      category_id: categoryId,
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_title: true,
          size: true,
          status: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          bids: {
            orderBy: { created_at: 'asc' },
            take: 1,
            select: { id: true, bid_amount: true },
          },
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found in this category',
        ...paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left:
        product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Latest products retrieved successfully',
      ...paginatedData,
    };
  }

  // get category based oldest products
  async findOldestProductsInCategory(
    categoryId: string,
    user: string,
    paginationDto: PaginationDto,
  ) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    const whereClause = {
      category_id: categoryId,
      status: ProductStatus.APPROVED,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: 'asc' },
        select: {
          id: true,
          product_title: true,
          size: true,
          status: true,
          condition: true,
          created_at: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          bids: {
            orderBy: { created_at: 'asc' },
            take: 1,
            select: { id: true, bid_amount: true },
          },
          boosts: {
            where: {
              status: BoostStatus.ACTIVE,
              until_date: { gte: new Date() },
            },
            orderBy: { until_date: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No products found in this category',
        ...paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = products.map((product) => ({
      id: product.id,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
            )
          : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left:
        product.boosts.length > 0 ? product.boosts[0].until_date : null,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    const paginatedData = paginateResponse(
      formattedProducts,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: 'Oldest products retrieved successfully',
      ...paginatedData,
    };
  }
}

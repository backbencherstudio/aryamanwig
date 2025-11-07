import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
import { ProductStatus ,Prisma} from '@prisma/client';





@Injectable()
export class ProductsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


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


    let photos:  string[] = [];
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

    // let photoUrl = null;
    // if(newProduct.photo) {
    //    photoUrl = SojebStorage.url(`${appConfig().storageUrl.product}/${newProduct.photo}`);
    // }

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
          // photoUrl,
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
          boost_until: true,
          price: true,
          photo: true,
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
      product_photo: product.photo && product.photo.length > 0
          ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
          : [],
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time:product.created_at,
      boost_time: product.boost_until,
      price: product.price,
    }));

    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

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
        }
      },
    });


    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    // Seller er total product count
    const totalItems = await this.prisma.product.count({
      where: { user_id: product.user_id },
    });

    console.log(`Total products by seller ${product.user_id}: ${totalItems}`);

    return {
      success: true,
      message: 'Product retrieved successfully',
      data: {

        seller_Info: {
          user_id: product.user.id,
          name: product.user.name ,
          profile_photo: product.user.avatar ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${product.user.avatar}`): null,
          total_items: totalItems,
        },
 
        product_id: product.id,
        product_photo: product.photo && product.photo.length > 0
          ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
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
        remaining_time: product.boost_until,
        minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        },
      },
    };
  }

  //update product
  async update(id: string, 
         updateProductDto: UpdateProductDto,
         user: string,
         newImages?: Express.Multer.File[]) {

    const { images_to_delete, ...updateData } = updateProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id },
    });


    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    if (product.user_id !== user) throw new ConflictException('You are not allowed to update this product');
    
     
    let photos: string[] = product.photo || [];

    if (updateProductDto.images_to_delete && updateProductDto.images_to_delete.length > 0) {
      for (const img of updateProductDto.images_to_delete) {
        await SojebStorage.delete(`${appConfig().storageUrl.product}/${img}`);
        photos = photos.filter(p => p !== img); // remove from array
      }
    }

    if (newImages && newImages.length > 0) {
      for (const image of newImages) {
        const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;
        await SojebStorage.put(`${appConfig().storageUrl.product}/${fileName}`, image.buffer);
        photos.push(fileName);
      }
    }

    if(updateProductDto.category_id) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateProductDto.category_id },
      });

      if (!category) {
        throw new ConflictException('Category does not exist');
      }
    }

    if(updateProductDto.product_title && updateProductDto.product_title !== product.product_title) {
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
        photo: photos
      },
    });

    const photoUrls = updatedProduct.photo?.map(p => 
      SojebStorage.url(`${appConfig().storageUrl.product}/${p}`)) || [];

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
        boost_time: updatedProduct.boost_until,
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
          boost_until: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
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
       product_photo_url: product.photo && product.photo.length > 0
          ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
          : [],
      title: product.product_title,
     
      price: product.price,
      description: product.product_description,
      location: product.location,
      condition: product.condition === 'NEW' ? 'Like New' : product.condition,
      size: product.size,
      color: product.color || 'Not Specified',
      uploaded: product.created_at,
      remaining_time:product.boost_until,
      is_in_wishlist: product.wishlists.length > 0,
    }));


    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginatedData,
    };
  }

  /*=================( Boosting Area Start)=================*/
  
  private readonly TIER_DETAILS = {
      [BoostTierEnum.TIER_1]: {
        days: 3,
        price: 4.90,
        name: 'Muss Schnell Weg',
      },
      [BoostTierEnum.TIER_2]: {
        days: 5,
        price: 9.90,
        name: 'Muss Zackig Weg',
      },
      [BoostTierEnum.TIER_3]: {
        days: 7,
        price: 19.90,
        name: 'Muss Sofort Weg',
      },
  };


  // boost product
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

    const nowUTC = new Date();
    if (product.boost_until && new Date(product.boost_until) > nowUTC) {
      const remainingHours = Math.ceil(
        (new Date(product.boost_until).getTime() - nowUTC.getTime()) /
          (1000 * 60 * 60),
      );
      throw new ConflictException(
        `This product is already boosted! You can boost again after ${remainingHours} hours.`,
      );
    }

    const boostUntil = new Date(
      nowUTC.getTime() + tierDetails.days * 24 * 60 * 60 * 1000,
    );

    const updatedProduct = await this.prisma.product.update({
      where: { id: product_id },
      data: {
        is_boosted: true,
        boost_until: boostUntil,
        boost_tier: boost_tier, 
        boost_payment_status: 'COMPLETED', 
      },
      select: {
        id: true,
        photo: true,
        product_title: true,
        size: true,
        condition: true,
        created_at: true,
        boost_until: true,
        price: true,
        boost_payment_status: true,
        boost_tier: true,
      }
    });

    return {
      success: true,
      message: 'Product boosted successfully',
      boost_status: updatedProduct.boost_payment_status,
      data: {
        id: updatedProduct.id,
        photo: updatedProduct.photo, 
        product_photo_url: updatedProduct.photo && updatedProduct.photo.length > 0
          ? updatedProduct.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
          : [],
        title: updatedProduct.product_title,
        size: updatedProduct.size,
        condition: updatedProduct.condition,
        created_time: updatedProduct.created_at,
        boost_time: updatedProduct.boost_until,
        price: updatedProduct.price,
        boost_tier_name: tierDetails.name,
        boost_price_paid: tierDetails.price, 
      },
    };
  }

  
  // paginated boosted products
  async getBoostedProducts(page: number, perPage: number) {
    const nowUTC = new Date();
    const skip = (page - 1) * perPage;

    const whereClause = {
      is_boosted: true,
      boost_until: { gte: nowUTC },
    };

    const [total, boostedProducts] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { boost_until: 'desc' }, 
        select: {
          id: true,
          product_title: true,
          size: true,
          condition: true,
          created_at: true,
          boost_until: true,
          price: true,
          photo: true,
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No active boosted products found',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = boostedProducts.map((product) => ({
      id: product.id,
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boost_until,
      price: product.price,
    }));
    
    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

    return {
      success: true,
      message: 'Boosted products retrieved successfully',
      ...paginatedData,
    };
  }

  // paginated boosted products for a user
  async getUserBoostedProducts(user: string, page: number, perPage: number) {
    const nowUTC = new Date();
    const skip = (page - 1) * perPage;

    const whereClause = {
      user_id: user,
      is_boosted: true,
      boost_until: { gte: nowUTC },
    };

    const [total, boostedProducts] = await this.prisma.$transaction([
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
          boost_until: true,
          price: true,
          photo: true,
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: 'No active boosted products found for this user',
        data: paginateResponse([], total, page, perPage),
      };
    }

    const formattedProducts = boostedProducts.map((product) => ({
      id: product.id,
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left: product.boost_until,
      price: product.price,
    }));

    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

    return {
      success: true,
      message: 'User boosted products retrieved successfully',
      ...paginatedData,
    };
  }


  /*=================( Search Area Start)=================*/

  // search products
  async searchProducts(
    paginationDto: PaginationDto,
    search?: string,
  ) {
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
          boost_until: true,
          price: true,
          photo: true,
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
      boost_time: product.boost_until,
      price: product.price,
      photo:
        product.photo && product.photo.length > 0
          ? product.photo.map((p) =>
              SojebStorage.url(`${appConfig().storageUrl.product}/${p}`)
            )
          : [],
    }));

    return {
      success: true,
      message: 'Products retrieved successfully',
      ...paginateResponse(formattedProducts, total, page, perPage),
    };
  }
  /*=================( Filter Area Start)=================*/

  // filter products by price range and categories
  async filterProducts(
    filterDto: FilterProductDto, 
    user: string, 
  ) {
  
    const { min_price, 
            max_price, 
            categories, 
            location, 
            time_in_hours } = filterDto;

    // 🔹 Time filter 
    let timeFilter: any = {};
    if (time_in_hours) {
      const now = new Date();
      const timeThreshold = new Date(now.getTime() + time_in_hours * 60 * 60 * 1000); 
      timeFilter = { 
        is_boosted: true,
        boost_until: { gte: now, lte: timeThreshold } 
      };
    } 

    // 🔹 Fetch from DB
    const products = await this.prisma.product.findMany({
      where: {
        AND: [
          { status: ProductStatus.APPROVED },
          min_price ? { price: { gte: min_price } } : {},
          max_price ? { price: { lte: max_price } } : {},
          categories && categories.length ? { category_id: { in: categories } } : {},
          location ? { location: { contains: location, mode: 'insensitive' } } : {},
          timeFilter,
        ],
      },
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
        boost_until: true,
        price: true,
        photo: true,
        wishlists:{
          where: { user_id: user },
          select: { id: true },
        }
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


    const formattedProducts = products.map(product => ({
      id: product.id,
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boost_until,
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
      status: ProductStatus.APPROVED
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
          boost_until: true,
          price: true,
          photo: true,
          wishlists: {
            where: { user_id: user },
            select: { id: true },
          },
          bids:{
            orderBy: { created_at: 'asc' },
            take: 1,
            select: { id: true, bid_amount: true }
          }
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
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      size: product.size,
      status: product.status,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left: product.boost_until,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    
    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

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
      category_id: categoryId , 
      status: ProductStatus.APPROVED
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
          boost_until: true,
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
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left: product.boost_until,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    
    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

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
      status: ProductStatus.APPROVED
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
          boost_until: true,
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
          }
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
      photo: product.photo && product.photo.length > 0
        ? product.photo.map(p => SojebStorage.url(`${appConfig().storageUrl.product}/${p}`))
        : [],
      title: product.product_title,
      status: product.status,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time_left: product.boost_until,
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0, 
      minimum_bid: product.bids.length > 0 ? product.bids[0].bid_amount : null,
    }));

    
    const paginatedData = paginateResponse(formattedProducts, total, page, perPage);

    return {
      success: true,
      message: 'Oldest products retrieved successfully',
      ...paginatedData, 
    };
  }


}

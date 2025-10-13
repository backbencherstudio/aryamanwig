import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Condition, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { BoostProductDto } from './dto/boost-product.dto';
import { StringHelper } from 'src/common/helper/string.helper';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { subHours } from 'date-fns';
import { formatDate, getBoostTimeLeft } from 'src/common/utils/date.utils';
import { ca, id } from 'date-fns/locale';


@Injectable()
export class ProductsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // create product
  async create(
    createProductDto: CreateProductDto,
    user: string,
    image?: Express.Multer.File,
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
      status,
      category_id,
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

   
    let photo: string | null = null;
    if (image) {
      const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;
      
      await SojebStorage.put(
        appConfig().storageUrl.product + '/' + fileName,
        image.buffer,
      );

      photo = fileName; 
    }

    // Create product in DB
    const newProduct = await this.prisma.product.create({
      data: {
        product_title,
        product_description,
        price,
        stock,
        photo,
        location,
        size,
        color,
        time,
        condition,
        status,
        user_id: user,
        category_id,
      },
    });

    let photoUrl = null;
    if(newProduct.photo) {
       photoUrl = SojebStorage.url(`${appConfig().storageUrl.product}/${newProduct.photo}`);
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

  // Get all products
  async findAll() {

    const products = await this.prisma.product.findMany({
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
    });

    if (products.length === 0) {
      throw new NotFoundException('No products found');
    }

  
    const formattedProducts = products.map(product => ({
      id: product.id,
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time: getBoostTimeLeft(product.boost_until),
      price: product.price,
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

  // Get a product by ID
  async findOne(id: string) {

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
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
        product_photo: product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`): null,
        title: product.product_title,
        location: product.location,
        price: product.price,
        description: product.product_description,
        condition: product.condition === 'NEW' ? 'Like New' : product.condition,
        size: product.size,
        color: product.color || 'Not Specified',
        uploaded: formatDate(product.created_at),
        remaining_time: getBoostTimeLeft(product.boost_until),

        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        },

        
      },
    };
  }

  // update product
  async update(id: string, 
         updateProductDto: UpdateProductDto,
         user: string,
         image?: Express.Multer.File) {

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    console.log(product);

    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    if (product.user_id !== user) throw new ConflictException('You are not allowed to update this product');
    
     
    // handle new image
     let photo: string | null = null;

      if (image) {
        
        // Delete old image if exists
        if (product.photo) {
          await SojebStorage.delete(`${appConfig().storageUrl.product}/${product.photo}`);
        }

        const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;

        await SojebStorage.put(
        appConfig().storageUrl.product + '/' + fileName,
        image.buffer,
        );

        await SojebStorage.put(`${appConfig().storageUrl.product}/${fileName}`, image.buffer);

        photo = fileName;
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
        ...updateProductDto,
        photo: photo ? photo : product.photo, // Update photo if new one is provided
      },
    });

    let photoUrl = null;
    if(updatedProduct.photo) {
       photoUrl = SojebStorage.url(`${appConfig().storageUrl.product}/${updatedProduct.photo}`);
    }

    return {
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updatedProduct.id,
        product_title: updatedProduct.product_title,
        product_description: updatedProduct.product_description,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
        condition: updatedProduct.condition,
        photo: updatedProduct.photo,
        boost_time: updatedProduct.boost_until,
        photoUrl,
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
  async getAllProductsForUser(user: string) {
    
    const products = await this.prisma.product.findMany({
      where: { user_id: user },
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
        // include wishlist show
        wishlists:{
          where: { user_id: user },
          select: { id: true },
        }
      },
      orderBy: { created_at: 'desc' },
    });

    console.log(products);

    if (products.length === 0) {
      return {
        success: true,
        message: 'No products found for this user',
        data: {
          products: [],
          product_count: 0,
        },
      };
    }

    if (!products.length) {
      return {
        success: true,
        message: 'No products found for this user',
        data: {
          products: [],
          product_count: 0,
        },
      };
    }

  
    const formattedProducts = products.map(product => ({
      id: product.id,
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : null,
      title: product.product_title,
      price: product.price,
      description: product.product_description,
      location: product.location,
      condition: product.condition === 'NEW' ? 'Like New' : product.condition,
      size: product.size,
      color: product.color || 'Not Specified',
      uploaded: formatDate(product.created_at),
      remaining_time: getBoostTimeLeft(product.boost_until),
      is_in_wishlist: product.wishlists.length > 0,
    }));

    return {  
      success: true,
      data: {
        products: formattedProducts,
        product_count: products.length,
      },
    };

  }

  /*=================( Boosting Area Start)=================*/
  
  // boost product
  async boost(boostProductDto: BoostProductDto, user: string) {

    const { product_id, days } = boostProductDto;

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${product_id} not found`);
    }

    if (product.user_id !== user) {
      throw new ConflictException('You are not allowed to boost this product');
    }

    const nowUTC = new Date();

    if (product.boost_until && new Date(product.boost_until) > nowUTC) {
      const remainingHours = Math.ceil(
        (new Date(product.boost_until).getTime() - nowUTC.getTime()) / (1000 * 60 * 60)
      );
      throw new ConflictException(
        `This product is already boosted! You can boost again after ${remainingHours} hours.`
      );
    }

    const boostUntil = new Date(nowUTC.getTime() + days * 24 * 60 * 60 * 1000);

    const updatedProduct = await this.prisma.product.update({
      where: { id: product_id },
      data: {
        boost_until: boostUntil,
        is_boosted: true,
      },
    });

    return {
      success: true,
      message: 'Product boosted successfully',
      data: {
        id: updatedProduct.id,
        photo: SojebStorage.url(`${appConfig().storageUrl.product}/${updatedProduct.photo}`),
        title: updatedProduct.product_title,
        size: updatedProduct.size,
        condition: updatedProduct.condition,
        created_time: updatedProduct.created_at,
        boost_time: updatedProduct.boost_until,
        price: updatedProduct.price,
      },
    };
  }

  // product boosted products
  async getBoostedProducts() {
  
    const nowUTC = new Date();

    const boostedProducts = await this.prisma.product.findMany({
      where: {
        is_boosted: true,
        boost_until: { gte: nowUTC },
      },
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
    });

    const formattedProducts = boostedProducts.map(product => ({
      id: product.id,
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time: getBoostTimeLeft(product.boost_until),
      price: product.price,
    }));

    return {
      success: true,
      message: 'Boosted products retrieved successfully',
      data: {
        products: formattedProducts,
        product_count: boostedProducts.length,
      },
    };
  }

  // get all boosted products for a user
  async getUserBoostedProducts(user: string) {
    const nowUTC = new Date();

    // 1️⃣ Find boosted products where this user is the owner
    const boostedProducts = await this.prisma.product.findMany({
      where: {
        user_id: user,
        is_boosted: true,
        boost_until: { gte: nowUTC }, // only active boosts
      },
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
      orderBy: { created_at: 'desc' },
    });

    // 2️⃣ If no boosted products found
    if (boostedProducts.length === 0) {
      return {
        success: true,
        message: 'No active boosted products found for this user',
        data: {
          products: [],
          product_count: 0,
        },
      };
    }

    // 3️⃣ Format the product data
    const formattedProducts = boostedProducts.map((product) => ({
      id: product.id,
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time_left: getBoostTimeLeft(product.boost_until),
      price: product.price,
    }));

    // 4️⃣ Return formatted response
    return {
      success: true,
      message: 'User boosted products retrieved successfully',
      data: {
        products: formattedProducts,
        product_count: boostedProducts.length,
      },
    };
  }
  
  /*=================( Filter Area Start)=================*/

  // filter products by price range and categories
  async filterProducts(filterDto: FilterProductDto, user: string) {
  
    const { min_price, max_price, categories, location, time_in_hours } = filterDto;

    // 🔹 Time filter 
    let timeFilter: any = {};
    if (time_in_hours) {
      const timeThreshold = subHours(new Date(), time_in_hours);
      timeFilter = { created_at: { gte: timeThreshold } };
    }

    // 🔹 Fetch from DB
    const products = await this.prisma.product.findMany({
      where: {
        AND: [
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
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time: getBoostTimeLeft(product.boost_until),
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
  async findAllProductsInCategory(categoryId: string, user: string) {

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          include: {
            wishlists: { where: { user_id: user }, select: { id: true } },
          },
        },
      },
    });


    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (category.products.length === 0) {
      return {
        success: true,
        message: 'No products found in this category',
        data: {
          products: [],
          product_count: 0,
        },
      };
    }


    const productDetails = category.products.map(product => ({
      id: product.id,
      photo: product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`) : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time_left: getBoostTimeLeft(product.boost_until),
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
    }));

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: productDetails,
        product_count: category.products.length,
      },
    };
  }

  // get category based latest products
  async findLatestProductsInCategory(categoryId: string, user: string) {

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          orderBy: { created_at: 'desc' },
          include: {
            wishlists: { where: { user_id: user }, select: { id: true } },
          },
        },
      },
    });

    console.log(category);

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }
    if (category.products.length === 0) {
      return {
        success: true,
        message: 'No products found in this category',
        data: {
          products: [],
          product_count: 0,
        },
      };
    }

  
    const productDetails = category.products.map(product => ({
      id: product.id,
      photo: product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`) : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time_left: getBoostTimeLeft(product.boost_until),
      price: product.price,
      is_in_wishlist: product.wishlists.length > 0,
    }));

    return {
      success: true,
      message: 'Latest products retrieved successfully',
      data: {
        products: productDetails,
        product_count: category.products.length,
      },
    };
  }

  // get category based oldest products
  async findOldestProductsInCategory(categoryId: string, user: string) {

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        products: {
          orderBy: { created_at: 'asc' },
          include: {
            wishlists: { where: { user_id: user }, select: { id: true } },
          },
        },
      },
    });

    if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found`);
    if (category.products.length === 0) {
      return { success: true, message: 'No products found in this category', data: { products: [], product_count: 0 } };
    }

    const productDetails = category.products.map((product) => ({
      id: product.id,
      photo: product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`) : null,
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: formatDate(product.created_at),
      boost_time_left: getBoostTimeLeft(product.boost_until),
      price: product.price,
      is_wishlisted: product.wishlists.length > 0, // ✅ Added
    }));

    return {
      success: true,
      message: 'Oldest products retrieved successfully',
      data: { products: productDetails, product_count: category.products.length },
    };
  }





}

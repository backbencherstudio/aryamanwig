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

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: products.map(product => ({
          photo: SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`),
          title: product.product_title,
          size: product.size,
          condition: product.condition,
          created_time: product.created_at,
          boost_time: product.boost_until,
          price: product.price,
        })),
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
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Product retrieved successfully',
      data: {
        photo: product.photo
          ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
          : null,
        title: product.product_title,
        size: product.size,
        condition: product.condition,
        created_time: product.created_at,
        boost_time: product.boost_until,
        price: product.price,
        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        },
      },
    };
  }


  // get all products in a category
  async findAllProductsInCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { products: true },
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

    // 🔹 Map only required fields
    const productDetails = category.products.map(product => ({
      photo: product.photo
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
        : 'https://example.com/default-product.png',
      title: product.product_title,
      size: product.size,
      condition: product.condition,
      created_time: product.created_at,
      boost_time: product.boost_until,
      price: product.price,
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

  // filter products by price range and categories
  async filterProducts(filterDto: FilterProductDto) {

    const { min_price, max_price, categories, location, time_in_hours } = filterDto;

    // 🔹 Time filter 
    let timeFilter: any = {};
    if (time_in_hours) {
      const timeThreshold = subHours(new Date(), time_in_hours);
      timeFilter = { created_at: { gte: timeThreshold } };
    }

    // Database get products
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
      },
    });

    
     // Check if products exist
    if (!products.length) {
        return {
            total: 0,
            message: "No products found",
            data: [],
        };
    }

  // 🔹 Format data (same as getBoostedProducts)
  return {
    success: true,
    message: 'Products retrieved successfully',
    data: {
      products: products.map(product => ({
        photo: product.photo
          ? SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`)
          : null,
        title: product.product_title,
        size: product.size,
        condition: product.condition,
        created_time: product.created_at,
        boost_time: product.boost_until,
        price: product.price,
      })),
      product_count: products.length,
    },
  };

  }

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

  // product boosted produc
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

    return {
      success: true,
      message: 'Boosted products retrieved successfully',
      data: {
        products: boostedProducts.map(product => ({
          photo: SojebStorage.url(`${appConfig().storageUrl.product}/${product.photo}`),
          title: product.product_title,
          size: product.size,
          condition: product.condition,
          created_time: product.created_at,
          boost_time: product.boost_until,
          price: product.price,
        })),
        product_count: boostedProducts.length,
      },
    };
  }

  

}

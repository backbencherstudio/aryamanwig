import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Condition, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductsService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // create product
  async create(createProductDto: CreateProductDto, user:string) {

   const { product_title,
           product_description,
           stock, 
           price, 
           photos, 
           location, 
           size, 
           color, 
           time, 
           condition, 
           status, 
           category_id } = createProductDto;

    const category = await this.prisma.category.findUnique({
      where: { id: category_id },
    });
    
    if (!category) {
      throw new ConflictException('Category does not exist');
    }

    const newProduct = await this.prisma.product.create({
      data: {
        product_title,
        product_description,
        price:1,
        stock,
        photos,
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
 
     return{
      message: 'Product created successfully',
      data:{
        id: newProduct.id,
        product_title: newProduct.product_title,
        product_description: newProduct.product_description,
        price: newProduct.price,
        stock: newProduct.stock,
     }

    }
  }

  // Get all products
  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true, 
      },
    });

    // Check if no products are found
    if (products.length === 0) {
      throw new Error('No products found');
    }

    return {
      message: 'Products retrieved successfully',
      data: products.map(product => ({
        id: product.id,
        product_title: product.product_title,
        product_description: product.product_description,
        price: product.price,
        stock: product.stock,
        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        }
      })),
    };
  }

  // Get a product by ID
  async findOne(id: string) {

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      message: 'Product retrieved successfully',
      data: {
        id: product.id,
        product_title: product.product_title, 
        product_description: product.product_description,
        price: product.price,
        stock: product.stock,
        category: {
          id: product.category.id,
          category_name: product.category.category_name,
        },
      },
    };
  }

  // update by product
  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}

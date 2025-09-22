import { ConflictException, Injectable } from '@nestjs/common';
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
        price,
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

  // get all products

  findAll() {
    return `This action returns all products`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}

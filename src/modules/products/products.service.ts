import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Condition, CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FilterProductDto } from './dto/filter-product.dto';

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
      success: true,
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
      success: true,
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
      success: true,
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

  // get all products in a category
  async findAllProductsInCategory(categoryId: string) {

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { products: true },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    // Map products to only include required fields
    const productDetails = category.products.map(product => ({
      id: product.id,
      product_title: product.product_title,
      price: product.price.toString(), // Convert price to string if needed
      size: product.size,
      condition: product.condition,
    }));

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: productDetails,
        product_count: category.products.length, // Count of products in category
      },
    };
  }

  // update product
  async update(id: string, 
         updateProductDto: UpdateProductDto,
         user: string) {

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.user_id !== user) {
      throw new ConflictException('You are not allowed to update this product');
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
      data: updateProductDto,
    });

    return {
      success: true,
      message: 'Product updated successfully',
      data: {
        id: updatedProduct.id,
        product_title: updatedProduct.product_title,
        product_description: updatedProduct.product_description,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
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
  
  const { min_price, max_price, categories } = filterDto;

  const products = await this.prisma.product.findMany({
    where: {
      AND: [
        min_price ? { price: { gte: min_price } } : {},
        max_price ? { price: { lte: max_price } } : {},
        categories && categories.length ? { category_id: { in: categories, mode: 'insensitive' } } : {},
      ],
    },
  });

  // Use the map function outside of the data object
  const filteredProducts = products.map(product => ({
    id: product.id,
    product_title: product.product_title,
    price: product.price.toString(),
    size: product.size,
    condition: product.condition,
  }));

  return {
    success: true,
    message: 'Products filtered successfully',
    data: {
      products: filteredProducts, // Corrected this line
      product_count: filteredProducts.length,
    },
  };
}



}

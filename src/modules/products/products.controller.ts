import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { filter } from 'rxjs';
import { FilterProductDto } from './dto/filter-product.dto';

@Controller('products')

export class ProductsController {

  constructor(private readonly productsService: ProductsService) { }

  // create product
  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createProductDto: CreateProductDto,
    @Req() req: any
  ) {
    const user = req.user.userId
    return this.productsService.create(createProductDto, user);
  }

  // get all products
  @Get('allproducts')
  async findAll() {
    return this.productsService.findAll();
  }

  // get all products in a category
  @Get('category/:id/products')
  async findAllProductsInCategory(@Param('id') id: string) {
    return this.productsService.findAllProductsInCategory(id);
  }

  // get single product by id
  @Get('singleproduct/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // update product by id
  @UseGuards(JwtAuthGuard)
  @Patch('updatebyid/:id')
  update(@Param('id') id: string, 
         @Body() updateProductDto: UpdateProductDto, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.update(id, updateProductDto, user);
  }

  // delete product by id
  @UseGuards(JwtAuthGuard)
  @Delete('deletebyid/:id')
  remove(@Param('id') id: string, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.remove(id, user);
  }

  // get products by filter with price range and categories
  @Get('filter')
  async filterProducts(@Query() filterDto: FilterProductDto) {
    return this.productsService.filterProducts(filterDto);
  }

   
}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products')

export class ProductsController {
  
  constructor(private readonly productsService: ProductsService) {}
  
  // create product
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@Body() createProductDto: CreateProductDto,
         @Req() req: any
  ) { 
  const user = req.user.userId 
    return this.productsService.create(createProductDto,user);
  }

  // get all products
  @Get('allproducts')
  async findAll() {
    return this.productsService.findAll();
  }

  // get single product by id
  @Get('singleproduct/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.remove(+id);
  }
}

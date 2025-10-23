import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { filter } from 'rxjs';
import { FilterProductDto } from './dto/filter-product.dto';
import { BoostProductDto } from './dto/boost-product.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaginationDto } from 'src/common/pagination';

@Controller('products')

export class ProductsController {

  constructor(private readonly productsService: ProductsService) { }

  // create product
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
     FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
      },
    }),
  )
  @Post('create')
  create(@Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    const user = req.user.userId
    return this.productsService.create(createProductDto, user, file);
  }

  // get all products
  @Get('allproducts')
  async findAll(@Query() query: PaginationDto) {
    const { page, perPage } = query;
    return this.productsService.findAll(page, perPage);
  }


  // get single product by id
  @Get('singleproduct/:id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  //update product by id
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
  FileInterceptor('image', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  }),
  )
  @Patch('updatebyid/:id')
  update(@Param('id') id: string, 
         @Body() updateProductDto: UpdateProductDto, 
         @Req() req: any,
         @UploadedFile() file?: Express.Multer.File
         ) {
    const user = req.user.userId;
    return this.productsService.update(id, updateProductDto, user, file);
  }

  // delete product by id
  @UseGuards(JwtAuthGuard)
  @Delete('deletebyid/:id')
  remove(@Param('id') id: string, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.remove(id, user);
  }


  // get all products for a user
  @UseGuards(JwtAuthGuard)
  @Get('user-all-products')
  getAllProductsForUser(@Req() req: any,
                        @Query() query: PaginationDto
 ) {
    const user = req.user.userId;
    return this.productsService.getAllProductsForUser(user, query);
  }
  /*=================( Boosting Area Start)=================*/

  // Create Product Boost
  @UseGuards(JwtAuthGuard)
  @Post('create-boost')
  boost(@Body() boostProductDto: BoostProductDto, 
        @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.boost(boostProductDto, user);
  }

  // get all boosted products
  @Get('boosted-products')
  async getBoostedProducts(@Query() query: PaginationDto) { 
    const { page, perPage } = query;
    return this.productsService.getBoostedProducts(page, perPage);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user-boosted-products')
  async getUserBoostedProducts(@Req() req: any, @Query() query: PaginationDto) { 
    const user = req.user.userId;
    const { page, perPage } = query;
    return this.productsService.getUserBoostedProducts(user, page, perPage);
  }

  /*=================( Filter Area Start)=================*/

  // get products by filter with price range and categories
  @UseGuards(JwtAuthGuard)
  @Get('filter')
  async filterProducts(
    @Query() filterDto: FilterProductDto, 
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.productsService.filterProducts(filterDto, user);
  }

  /*=================( Category Area Start)=================*/

  // get all products in a category
  @UseGuards(JwtAuthGuard)
  @Get('category/:id/products')
  async findAllProductsInCategory(
    @Param('id') id: string, 
    @Req() req: any,
    @Query() paginationDto: PaginationDto
  ) {
    const user = req.user.userId;
    return this.productsService.findAllProductsInCategory(id, user, paginationDto);
  }

  // get category based  latest products
  @UseGuards(JwtAuthGuard)
  @Get('category/:id/latest-products')
  async findLatestProductsInCategory(
    @Param('id') id: string, 
    @Req() req: any,
    @Query() paginationDto: PaginationDto
  ) {
    const user = req.user.userId;
    return this.productsService.findLatestProductsInCategory(id, user, paginationDto);
  }

  // get category based oldest products
  @UseGuards(JwtAuthGuard)
  @Get('category/:id/oldest-products')
  async findOldestProductsInCategory(
     @Param('id') id: string,
     @Req() req: any,
     @Query() paginationDto: PaginationDto
  ) {
    const user = req.user.userId;
    return this.productsService.findOldestProductsInCategory(id, user, paginationDto);
  }


  


}

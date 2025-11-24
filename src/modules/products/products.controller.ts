import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { filter } from 'rxjs';
import { FilterProductDto } from './dto/filter-product.dto';
import { BoostProductDto, BoostTierEnum } from './dto/boost-product.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaginationDto } from 'src/common/pagination';
import { SearchProductsDto } from './dto/search-products.dto';

@UseGuards(JwtAuthGuard)
@Controller('products')

export class ProductsController {

  constructor(private readonly productsService: ProductsService) { }

  // create product
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
       // files: 10,
      },
    }),
  )
  @Post('create')
  create(@Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    const user = req.user.userId
    return this.productsService.create(createProductDto, user, files);
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
  @UseInterceptors(
  FilesInterceptor('images',10, {
    storage: memoryStorage(),
    limits: { 
      fileSize: 5 * 1024 * 1024,
      //files: 1 
      },
  }),
  )
  @Patch('updatebyid/:id')
  update(@Param('id') id: string, 
         @Body() updateProductDto: UpdateProductDto, 
         @Req() req: any,
         @UploadedFiles() files?: Express.Multer.File[]
         ) {
    const user = req.user.userId;
    return this.productsService.update(id, updateProductDto, user, files);
  }

  // delete product by id
  remove(@Param('id') id: string, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.remove(id, user);
  }


  // get all products for a user
  @Get('user-all-products')
  getAllProductsForUser(@Req() req: any,
                        @Query() query: PaginationDto
 ) {
    const user = req.user.userId;
    return this.productsService.getAllProductsForUser(user, query);
  }


  // get all product for client
  @Get('client-all-products/:id')
  getAllProductsForClient(
    @Req() req: any,                
    @Query() query: PaginationDto,
    @Param('id') id: string,
 ) {
   
    return this.productsService.getAllProductsForClient(id, query);
  }




  /*=================( Boosting Area Start)=================*/

  // *Create Product Boost
  @Post('create-boost')
  boost(@Body() boostProductDto: BoostProductDto, 
        @Req() req: any) {
    const user = req.user.userId;
    return this.productsService.boost(boostProductDto, user);
  }

  // *get all boosted products(admin)
  @Get('boosted-products')
  async getBoostedProducts(@Query() query: PaginationDto) { 
    const { page, perPage } = query;
    return this.productsService.getBoostedProducts(page, perPage);
  }

  // *get all boosted products for a user(pending)
  @Get('user-boosted-products-pending')
  async getUserBoostedProductsPending(@Req() req: any, @Query() query: PaginationDto) { 
    const user = req.user.userId;
    const { page, perPage } = query;
    return this.productsService.getUserBoostedProductsPending(user, page, perPage);
  }

  @Get('user-boosted-products-completed')
  async getUserBoostedProductsCompleted(@Req() req: any, @Query() query: PaginationDto) { 
    const user = req.user.userId;
    const { page, perPage } = query;
    return this.productsService.getUserBoostedProductsCompleted(user, page, perPage);
  }

  /*=================( Search Area Start)=================*/

  @Get('search') 
  async searchProducts(
    @Query() searchDto: SearchProductsDto, 
  ) {
    const { search, ...paginationDto } = searchDto;
  return this.productsService.searchProducts(paginationDto, search);
  }

  /*=================( Filter Area Start)=================*/

  // get products by filter with price range and categories
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

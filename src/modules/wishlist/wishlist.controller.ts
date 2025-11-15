import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';

@Controller('wishlist')
export class WishlistController {

  constructor(private readonly wishlistService: WishlistService) {}

  // add to wishlist
  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createWishlistDto: CreateWishlistDto,
        @Req() req: any
  ) {
    const user = req.user.userId;
   
    return this.wishlistService.addToWishlist(createWishlistDto, user);
  }


  // get all wishlist items
  @Get('allwishlist')
  findAll(
    @Query() paginationDto: PaginationDto
  ) {
    return this.wishlistService.findAll(paginationDto);
  }

  // get all wishlist items for a user
  @UseGuards(JwtAuthGuard)
  @Get('userwishlist')
  findUserWishlist(
    @Req() req: any,
    @Query() paginationDto: PaginationDto
  ) {
    const user = req.user.userId;
    return this.wishlistService.findAllUser(user, paginationDto);
  }


  // get single wishlist item by id
  @Get('singlebyid/:id')
  findOne(@Param('id') id: string) {
    return this.wishlistService.findOne(id);
  }

  // delete wishlist item by id
  @UseGuards(JwtAuthGuard)
  @Delete('deletebyid/:id')
  remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user.userId;
    return this.wishlistService.remove(id, user);
  }


}

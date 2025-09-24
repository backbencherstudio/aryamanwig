import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
    console.log(user)
    return this.wishlistService.addToWishlist(createWishlistDto, user);
  }


  // get all wishlist items
  @Get('allwishlist')
  findAll() {
    return this.wishlistService.findAll();
  }

  // get all wishlist items for a user
  @UseGuards(JwtAuthGuard)
  @Get('userwishlist')
  findUserWishlist(@Req() req: any) {
    const user = req.user.userId;
    return this.wishlistService.findAllUser(user);
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

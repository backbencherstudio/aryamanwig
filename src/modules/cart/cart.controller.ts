import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
export class CartController {

  constructor(private readonly cartService: CartService) {}

  // create cart 
  @UseGuards(JwtAuthGuard)
  @Post('create')
  addToCart(
    @Req() req, @Body() dto: CreateCartDto) {
    const user = req.user.userId;
    return this.cartService.addToCart(user, dto);
  }


  // update cart item
  @UseGuards(JwtAuthGuard)
  @Patch('update/:cartItemId')
  updateCartItem(
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateCartItem(cartItemId, dto);
  }

  // My cart list
  @UseGuards(JwtAuthGuard)
  @Get('my-cart')
  getMyCart(@Req() req) {
    const user = req.user.userId;
    return this.cartService.getMyCart(user);
  }

  // my cart with sellers id
  @UseGuards(JwtAuthGuard)
  @Get('my-cart/:sellerId')
  getMyCartBySeller(
      @Req() req, 
      @Param('sellerId') sellerId: string) {
    const userId = req.user.userId;
    return this.cartService.getMyCartBySeller(userId, sellerId);
  }

  




}

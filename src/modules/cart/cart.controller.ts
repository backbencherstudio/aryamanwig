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
  UseInterceptors,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { NoFilesInterceptor } from '@nestjs/platform-express/multer/interceptors/no-files.interceptor';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // create cart
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async addToCart(@Req() req, @Body() dto: CreateCartDto) {
    const user = req.user.userId;
    return this.cartService.addToCart(user, dto);
  }

  // update cart item
  @UseGuards(JwtAuthGuard)
  @Patch('update/:cartItemId')
  async updateCartItem(
    @Param('cartItemId') cartItemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateCartItem(cartItemId, dto);
  }

  // remove cart item
  @UseGuards(JwtAuthGuard)
  @Delete('delete/:cartItemId')
  async removeCartItem(@Param('cartItemId') cartItemId: string) {
    return this.cartService.removeCartItem(cartItemId);
  }

  // My cart list
  @UseGuards(JwtAuthGuard)
  @Get('my-cart')
  async getMyCart(@Req() req) {
    const user = req.user.userId;
    return this.cartService.getMyCart(user);
  }

 


  
}

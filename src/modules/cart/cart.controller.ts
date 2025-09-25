import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Add an item to the cart
  @Post('add-item')
  async addItemToCart(
    @Body('userId') userId: string,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    return this.cartService.addItemToCart(userId, productId, quantity);
  }

  // Remove an item from the cart
  @Delete('remove-item/:cartItemId')
  async removeItemFromCart(@Param('cartItemId') cartItemId: string) {
    return this.cartService.removeItemFromCart(cartItemId);
  }

  // Clear all items in a user's cart
  @Delete('clear/:cartId')
  async clearCart(@Param('cartId') cartId: string) {
    return this.cartService.clearCart(cartId);
  }

  // Get all items in a user's cart grouped by product owner
  @Get('items')
  async getCartItemsGroupedByOwner(@Query('userId') userId: string) {
    return this.cartService.getCartItemsGroupedByOwner(userId);
  }
}

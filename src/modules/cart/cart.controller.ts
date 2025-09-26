import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // If already has cart then update, if not then create and then add an item to the cart
  @UseGuards(JwtAuthGuard)
  @Put('add-item')
  async addItemToCart(
    @Req() req: any,
    @Body() data: { productId: string; quantity: number },
  ) {
    console.log(req.user.userId, data.productId, data.quantity);

    const { productId, quantity } = data;
    try {
      const userId = req.user.userId;

      const result = await this.cartService.addItemToCart(
        userId,
        productId,
        quantity,
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to add item to cart',
      };
    }
  }

  // Remove an item from the cart
  @UseGuards(JwtAuthGuard)
  @Delete('remove-item/:cartItemId')
  async removeItemFromCart(
    @Req() req: any,
    @Param('cartItemId') cartItemId: string,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.cartService.removeItemFromCart(
        userId,
        cartItemId,
      );
      return {
        success: true,
        data: 'Cart item removed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to remove item from cart',
      };
    }
  }

  // Clear all items in a user's cart
  @UseGuards(JwtAuthGuard)
  @Delete('clear/:cartId')
  async clearCart(@Req() req: any, @Param('cartId') cartId: string) {
    try {
      const userId = req.user.userId;
      const result = await this.cartService.clearCart(userId, cartId);
      return {
        success: true,
        data: 'Cart cleared successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to clear cart',
      };
    }
  }

  // Get all items in a user's cart grouped by product owner
  @UseGuards(JwtAuthGuard)
  @Get('cart-items')
  async getCartItemsGroupedByOwner(@Req() req: any) {
    try {
      const userId = req.user.userId;
      const cartItems =
        await this.cartService.getCartItemsGroupedByOwner(userId);
      return {
        success: true,
        data: cartItems,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve cart items',
      };
    }
  }
}

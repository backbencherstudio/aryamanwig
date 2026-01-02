import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cart, CartItem } from '@prisma/client';
import { CreateCartDto } from './dto/create-cart.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {

  constructor(private prisma: PrismaService) {}

  // *add to cart
  async addToCart(userId: string, dto: CreateCartDto) {
    
    const { product_id } = dto;
    const quantity = 1;

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
      select: { id: true,
                price: true, 
                user_id: true             
              },
    });

    if (!product) throw new NotFoundException('Product not found');

    if (product.user_id === userId) {
      throw new NotFoundException('Cannot add your own product to cart');
    } 


    const checkBid = await this.prisma.bid.findFirst({
      where: {
        product_id: product_id,
        user_id: userId,
        status: 'ACCEPTED',
      },
    });

    const priceToUse = checkBid
      ? new Decimal(checkBid.bid_amount)
      : new Decimal(product.price);


    let cart = await this.prisma.cart.findFirst({
      where: { user_id: userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { user_id: userId },
      });
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cart_id: cart.id,
        product_id,
      },
    });

    
    await this.prisma.$transaction(async (tx) => {
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        const newTotal = priceToUse.mul(newQty);

        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            total_price: newTotal,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cart_id: cart.id,
            product_id,
            quantity,
            total_price: priceToUse.mul(quantity),
          },
        });
      }

    
      if (checkBid) {
        await tx.bid.delete({
          where: { id: checkBid.id },
        });
      }
    });

    
    return {
      success: true,
      message: checkBid
        ? 'Winning bid product added to cart successfully'
        : 'Product added to cart',
    };
  }

  // *update cart item
  async updateCartItem(cartItemId: string, dto: UpdateCartDto) {
 
    const { quantity } = dto;

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { product: true },
    });


    if (!cartItem) throw new NotFoundException('Cart item not found');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: cartItemId } });
      return { success: true, message: 'Item removed from cart' };
    }

    const newTotal = new Decimal(cartItem.product.price).mul(quantity);

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: {
        quantity,
        total_price: newTotal,
      },
    });

    return { success: true, message: 'Cart item updated successfully' };


  }

  // *remove cart item
  async removeCartItem(cartItemId: string) {

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });

    return { success: true, message: 'Item deleted from cart' };
  }
  
  // *my cart list
  async getMyCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { user_id: userId },
      include: {
        cartItems: {
          include: {
            product: {
              select: {
                id: true,
                product_title: true,
                price: true,
                size: true,
                condition: true,
                photo: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      return { success: true, message: 'Your cart is empty', data: [] };
    }

   
    const formattedCartItems = cart.cartItems.map((item) => {
     
      const firstPhoto = item.product.photo && item.product.photo.length > 0
        ? SojebStorage.url(`${appConfig().storageUrl.product}/${item.product.photo[0]}`)
        : null; 

      return {
        cart_item_id: item.id, 
        product_id: item.product.id,
        product_title: item.product.product_title,
        price: item.product.price, 
        quantity: item.quantity,
        total_price: item.total_price, 
        size: item.product.size,
        condition: item.product.condition,
        photo: firstPhoto, 
      };
    });

    const grandTotal = cart.cartItems.reduce(
      (sum, item) => sum + parseFloat(item.total_price.toString()),
      0,
    );

    return {
      success: true,
      message: 'Cart fetched successfully',
      data: {
        items: formattedCartItems, 
        grand_total: grandTotal,
      },
    };
  }


  

  
}

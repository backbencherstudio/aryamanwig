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

  // add to cart
  async addToCart(userId: string, dto: CreateCartDto) {
    
    const { product_id, quantity } = dto;

    // 🔍 Step 1: Product খুঁজে বের করো
    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
      select: { id: true, price: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    // 🔍 Step 2: User এর bid চেক করো
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

    // 🔍 Step 3: Cart খুঁজে বের করো, না থাকলে তৈরি করো
    let cart = await this.prisma.cart.findFirst({
      where: { user_id: userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { user_id: userId },
      });
    }

    // 🔍 Step 4: আগেই cart item আছে কিনা চেক করো
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cart_id: cart.id,
        product_id,
      },
    });

    // 🔒 Step 5: সব write অপারেশন transaction এর ভিতরে করো
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

      // 🔥 যদি bid থাকে → delete করে দাও
      if (checkBid) {
        await tx.bid.delete({
          where: { id: checkBid.id },
        });
      }
    });

    // ✅ সব কাজ শেষ
    return {
      success: true,
      message: checkBid
        ? 'Winning bid product added to cart successfully'
        : 'Product added to cart',
    };
  }


  // update cart item
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

  // remove cart item
  async removeCartItem(cartItemId: string) {

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: cartItemId },
    });

    if (!cartItem) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });

    return { success: true, message: 'Item deleted from cart' };
  }
  
  // my cart list
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
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    
    if (!cart || cart.cartItems.length === 0) {
      return { success: true, message: 'Your cart is empty', data: [] };
    }

    
    const grouped = [];

    for (const item of cart.cartItems) {

      const seller = item.product.user;

      
      let existingSeller = grouped.find((g) => g.seller_id === seller.id);

     
      if (!existingSeller) {
        existingSeller = {
          seller_id: seller.id,
          seller_name: seller.name,
          seller_avatar: seller.avatar
            ? SojebStorage.url(`${appConfig().storageUrl.product}/${seller.avatar}`)
            : null,
          products: [],
        };
        grouped.push(existingSeller);
      }

      
      existingSeller.products.push({
        cart_item_id: item.id,
        product_id: item.product.id,
        product_title: item.product.product_title,
        price: item.product.price,
        quantity: item.quantity,
        total_price: item.total_price,
        size: item.product.size,
        condition: item.product.condition,
        photo: item.product.photo
          ? SojebStorage.url(`${appConfig().storageUrl.product}/${item.product.photo}`)
          : null,
      });
    }

   
    const grandTotal = cart.cartItems.reduce(
      (sum, i) => sum + parseFloat(i.total_price.toString()),
      0,
    );

    return {
      success: true,
      message: 'Cart fetched successfully',
      data: {
        sellers: grouped,
        grand_total: grandTotal,
      },
    };
  }

  // my cart with sellers id
  async getMyCartBySeller(userId: string, sellerId: string) {

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
                user: { 
                  select: { 
                    id: true,
                    name: true,
                    avatar: true
                } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return { success: true, message: 'Your cart is empty', data: [] };
    }


    const items = cart.cartItems.filter((i) => i.product.user.id === sellerId);

    if (items.length === 0) {
      return {
        success: true,
        message: 'No products found for this seller',
        data: [],
      };
    }

    const subtotal = items.reduce(
      (sum, i) => sum + parseFloat(i.total_price.toString()),
      0,
    );

    return {
      success: true,
      message: 'Seller cart fetched successfully',
      data: {
        seller: {
          seller_id: sellerId,
          seller_name: items[0].product.user.name,
          seller_avatar: items[0].product.user.avatar
            ? SojebStorage.url(`${appConfig().storageUrl.product}/${items[0].product.user.avatar}`)
            : null,
        },
        products: items.map((i) => ({
          cart_item_id: i.id,
          product_id: i.product.id,
          product_title: i.product.product_title,
          price: i.product.price,
          quantity: i.quantity,
          total_price: i.total_price,
          size: i.product.size,
          condition: i.product.condition,
          photo: i.product.photo
            ? SojebStorage.url(`${appConfig().storageUrl.product}/${i.product.photo}`)
            : null,
        })),
        subtotal,
      },
    };
  }

  
}

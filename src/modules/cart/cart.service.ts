import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cart, CartItem } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // Add an item to the cart specified product owned by user
  // also, Update the quantity of an item in the cart
  async addItemToCart(userId: string, productId: string, quantity: number) {
    try {
      // Ensure the user has a cart
      let existingCart = await this.prisma.cart.findFirst({
        where: { user_id: userId },
      });
      // Create a new cart for a user if not exists
      if (!existingCart) {
        existingCart = await this.prisma.cart.create({
          data: {
            user_id: userId,
          },
        });
        if (!existingCart) {
          throw new Error('Failed to create a cart for the user');
        }
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        throw new Error('Product not found');
      }
      if (quantity > product.stock) {
        throw new Error('Insufficient stock for the product');
      }

      const cartId = existingCart.id;
      const totalPrice = Number(product.price) * quantity;

      // make an operation tose way that if in cart, if cart item exists then update quantity and total price else create new cart item

      const existingCartItem = await this.prisma.cartItem.findFirst({
        where: {
          cart_id: cartId,
          product_id: productId,
        },
      });

      if (existingCartItem) {
        // Update existing cart item
        const updatedCartItem = await this.prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity,
            total_price: totalPrice,
          },
        });
        return updatedCartItem;
      } else {
        // Create new cart item
        const newCartItem = await this.prisma.cartItem.create({
          data: {
            cart_id: cartId,
            product_id: productId,
            quantity,
            total_price: totalPrice,
          },
        });
        return newCartItem;
      }
    } catch (error) {
      throw new Error('Error adding item to cart: ' + error.message);
    }
  }

  // TODO: Get all items in a user's cart

  // Remove an item from the cart
  async removeItemFromCart(userId: string, cartItemId: string) {
    try {
      // Build logic that is cartItemId is belong to userId
      const userCartItem = await this.prisma.cartItem.findFirst({
        where: { id: cartItemId, cart: { user_id: userId } },
      });
      if (!userCartItem) {
        throw new Error('Cart item does not belong to the user');
      }

      const deletedCartItem = await this.prisma.cartItem.deleteMany({
        where: {
          id: cartItemId,
        },
      });
      if (!deletedCartItem.count) {
        throw new Error('Cart item not found or already deleted');
      }
      return deletedCartItem;
    } catch (error) {
      throw new Error('Error removing item from cart: ' + error.message);
    }
  }
  //   async removeItemFromCart(cartItemId: string) {
  //     return this.prisma.cartItem.delete({
  //       where: { id: cartItemId },
  //     });
  //   }

  // Clear all items in a user's cart
  async clearCart(userId: string, cartId: string) {
    try {
      // First, ensure the cart belongs to the user
      const cart = await this.prisma.cart.findUnique({
        where: { id: cartId },
      });
      if (!cart || cart.user_id !== userId) {
        throw new Error('Cart not found or does not belong to the user');
      }
      const deleteCart = await this.prisma.cart.delete({
        where: { id: cartId },
      });
      return deleteCart;
    } catch (error) {
      throw new Error('Error clearing cart: ' + error.message);
    }
  }
  /* 
  await this.prisma.cartItem.deleteMany({
      where: { cart_id: cartId },
    });
  */

  async getCartItemsGroupedByOwner(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { user_id: userId },
      include: {
        cartItems: {
          include: {
            product: true, // Include product details to access owner info
          },
        },
      },
    });
    if (!cart) {
      throw new Error('Cart not found');
    }

    /* 
    Separate cart item by different product ownership like,
    
    ---Cart
        |---Buyer UserId X
        |---Product owner (Id and email)
        |      |---CartItem 1 (Product A, Quantity, Total Price)
        |      |---CartItem 2 (Product B, Quantity, Total Price)
        |---Product owner (Id and email)
               |---CartItem 3 (Product C, Quantity, Total Price)
      
    */

    const groupedCartItems = cart.cartItems.reduce(async (acc, item) => {
      const ownerId = item.product.user_id;
      const ownerEmail = await this.prisma.user.findUnique({
        where: { id: ownerId },
        select: { email: true },
      }); //item.product.user.email; // Assuming product.user includes email

      if (!acc[ownerId]) {
        acc[ownerId] = {
          owner: {
            id: ownerId,
            email: ownerEmail,
          },
          items: [],
        };
      }

      acc[ownerId].items.push({
        productTitle: item.product.product_title,
        quantity: item.quantity,
        totalPrice: item.total_price,
      });

      return acc;
    }, {});

    return groupedCartItems;
    // return Object.values(groupedCartItems);
  }
}

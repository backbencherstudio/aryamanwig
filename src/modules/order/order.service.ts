import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OrderProductDto, ShippingInfoDto } from './dto/create-order.dto';
import { Or } from '@prisma/client/runtime/library';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async placeOrder(
    buyerId: string,
    sellerId: string,
    shippingInfo: ShippingInfoDto,
    orderProducts: OrderProductDto[],
  ) {
    const order = await this.prisma.$transaction(async (prisma) => {
      let grandTotal = new Prisma.Decimal(0);

      const order = await prisma.order.create({
        data: {
          buyer: { connect: { id: buyerId } },
          seller: { connect: { id: sellerId } },
          order_status: 'PENDING',
          grand_total: grandTotal,
          total_amount: new Prisma.Decimal(0),
          shipping_name: shippingInfo.shipping_name,
          email: shippingInfo.email,
          shipping_country: shippingInfo.shipping_country,
          shipping_state: shippingInfo.shipping_state,
          shipping_city: shippingInfo.shipping_city,
          shipping_zip_code: shippingInfo.shipping_zip_code,
          shipping_address: shippingInfo.shipping_address,
        },
      });

      for (const product of orderProducts) {
        const prod = await prisma.product.findUnique({
          where: { id: product.product_id },
        });
        if (sellerId !== prod?.user_id) {
          throw new Error(
            `Order create only for specific one seller. Product with Title: '${prod.product_title}' does not belong to the given seller_id`,
          );
        }
        if (!prod) {
          throw new Error(`Product with ID ${product.product_id} not found`);
        }
        if (prod.stock < product.quantity) {
          throw new Error(
            `Insufficient stock for product ID ${product.product_id}`,
          );
        }

        // Ensure proper type conversion for multiplication
        const productTotalPrice = prod.price.mul(
          new Prisma.Decimal(product.quantity),
        );
        grandTotal = grandTotal.add(productTotalPrice);

        const orderItem = await prisma.orderItem.create({
          data: {
            order: { connect: { id: order.id } },
            product: { connect: { id: product.product_id } },
            quantity: product.quantity,
            total_price: productTotalPrice,
          },
        });
        if (!orderItem) {
          throw new Error('Failed to create order item');
        }
        // also reduce the stock of the product
        const updatedProduct = await prisma.product.update({
          where: { id: product.product_id },
          data: {
            stock: { decrement: product.quantity },
          },
        });
        if (!updatedProduct) {
          throw new Error('Failed to update product stock');
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { grand_total: grandTotal, total_amount: grandTotal },
      });
      if (!updatedOrder) {
        throw new Error('Failed to update order totals');
      }

      return updatedOrder;
    });
    return order;
  }

  // for buyer
  async trackOrdersByBuyer(buyerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { buyer_id: buyerId },
      // only select order_id, created_at, updated_at
      select: {
        id: true,
        seller_id: true,
        grand_total: true,
        order_status: true,
        created_at: true,
        updated_at: true,
        order_items: {
          // only select orderItem_id, productId, product_title, photo, quantity, total_price
          select: {
            id: true,
            product: {
              select: { product_title: true, photo: true },
            },
            quantity: true,
            total_price: true,
          },
        },
      },
    });

    if (!orders) {
      throw new Error('No orders found for this buyer');
    }
    // make additional field named order_name -> first product name before space + (n-1) more (max 30 char)
    orders.forEach((order) => {
      if (order.order_items.length > 0) {
        const firstProductName = order.order_items[0].product.product_title;
        const additionalProductsCount = order.order_items.length - 1;
        order['order_name'] =
          `${firstProductName} + ${additionalProductsCount} more`;
      }
    });
    return orders;
  }

  async trackSpecificOrderByBuyer(buyerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { buyer_id: buyerId, id: orderId },
      include: {
        seller: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            avatar: true,
            email: true,
            address: true,
            zip_code: true,
            city: true,
            state: true,
            country: true,
          },
        },
        order_items: {
          include: {
            product: {
              select: { id: true, product_title: true, photo: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('No orders found for this buyer');
    }

    // Transform the response to match the desired structure
    const transformedOrder = {
      id: order.id,
      order_status: order.order_status,
      grand_total: order.grand_total,
      shipping_details: {
        shipping_name: order.shipping_name,
        email: order.email,
        shipping_country: order.shipping_country,
        shipping_state: order.shipping_state,
        shipping_city: order.shipping_city,
        shipping_zip_code: order.shipping_zip_code,
        shipping_address: order.shipping_address,
      },
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      seller: order.seller,
      order_items: order.order_items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        total_price: item.total_price,
        product: item.product,
      })),
    };

    return transformedOrder;
  }

  // TODO: for seller
  async trackOrdersBySeller(sellerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { seller_id: sellerId },
      // only select order_id, created_at, updated_at
      select: {
        id: true,
        buyer_id: true,
        grand_total: true,
        order_status: true,
        created_at: true,
        updated_at: true,
        order_items: {
          // only select orderItem_id, productId, product_title, photo, quantity, total_price
          select: {
            id: true,
            product: {
              select: { product_title: true, photo: true },
            },
            quantity: true,
            total_price: true,
          },
        },
      },
    });

    if (!orders) {
      throw new Error('No orders found for this seller');
    }
    // make additional field named order_name -> first product name before space + (n-1) more (max 30 char)
    orders.forEach((order) => {
      if (order.order_items.length > 0) {
        const firstProductName = order.order_items[0].product.product_title;
        const additionalProductsCount = order.order_items.length - 1;
        order['order_name'] =
          `${firstProductName} + ${additionalProductsCount} more`;
      }
    });
    return orders;
  }

  async trackSpecificOrderBySeller(sellerId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { seller_id: sellerId, id: orderId },
      include: {
        buyer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            address: true,
            city: true,
            state: true,
            country: true,
            zip_code: true,
          },
        },
        order_items: {
          include: {
            product: {
              select: { id: true, product_title: true, photo: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error('No orders found for this seller');
    }

    // Transform the response to match the desired structure
    const transformedOrder = {
      id: order.id,
      order_status: order.order_status,
      grand_total: order.grand_total,
      shipping_details: {
        shipping_name: order.shipping_name,
        email: order.email,
        shipping_country: order.shipping_country,
        shipping_state: order.shipping_state,
        shipping_city: order.shipping_city,
        shipping_zip_code: order.shipping_zip_code,
        shipping_address: order.shipping_address,
      },
      total_amount: order.total_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      buyer: order.buyer,
      order_items: order.order_items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        total_price: item.total_price,
        product: item.product,
      })),
    };

    return transformedOrder;
  }
}

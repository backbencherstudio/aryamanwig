import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async placeOrder(
    buyerId: string,
    sellerId: string,
    shippingInfo: {
      shipping_name: string;
      email: string;
      shipping_country: string;
      shipping_state: string;
      shipping_city: string;
      shipping_zip_code: string;
      shipping_address: string;
    },
    orderProducts: {
      product_id: string;
      quantity: number;
      total_price: number;
    }[],
  ) {
    return await this.prisma.$transaction(async (prisma) => {
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
        const itemTotal = new Prisma.Decimal(product.total_price);
        grandTotal = grandTotal.add(itemTotal);

        await prisma.orderItem.create({
          data: {
            order: { connect: { id: order.id } },
            product: { connect: { id: product.product_id } },
            quantity: product.quantity,
            total_price: itemTotal,
          },
        });
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { grand_total: grandTotal, total_amount: grandTotal },
      });

      return order;
    });
  }
}

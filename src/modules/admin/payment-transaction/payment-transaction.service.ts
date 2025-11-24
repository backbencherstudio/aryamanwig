import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';

@Injectable()
export class PaymentTransactionService {
  constructor(private prisma: PrismaService) {}

  async getAllTransactions() {
    const tx = await this.prisma.paymentTransaction.findMany({
      where: { status: 'succeeded' },
      orderBy: { created_at: 'desc' },
    });

    const result = [];

    for (const item of tx) {
      let productName = null;
      let sellerName = null;
      let price = Number(item.amount ?? 0);

      // ---------------- ORDER TRANSACTION ----------------
      if (item.order_id) {
        const order = await this.prisma.order.findUnique({
          where: { id: item.order_id },
          include: {
            seller: true,
            order_items: {
              include: { product: true },
            },
          },
        });

        if (order) {
          productName = order.order_items?.[0]?.product?.product_title ?? '-';
          sellerName = order.seller?.name ?? '-';
        }
      }

      // Earnings Calculation
      const sellerAmount = price * 0.95; // 95%
      const platformEarning = price * 0.05; // 5%

      result.push({
        id: item.id,
        productName,
        productPrice: `$${price}`,
        paymentAmount: `$${price}`,
        sellerName,
        sellerAmount: `$${sellerAmount.toFixed(2)}`,
        earning: `$${platformEarning.toFixed(2)}`,
        created_at: item.created_at,
      });
    }

    return {
      success: true,
      data: result,
    };
  }
}



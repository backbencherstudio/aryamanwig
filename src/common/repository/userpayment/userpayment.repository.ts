import { EarningStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma";

const HOLD_DAYS = 3;

export async function recordEarningOnOrderPaid(params: {
  orderId: string;
  sellerId: string;
  amount: Prisma.Decimal | number;
}) {
  const amount = new Prisma.Decimal(params.amount);
  const feePercent = new Prisma.Decimal(10); // 10% platform fee
  const feeAmount = amount.mul(feePercent).div(100);
  const netAmount = amount.sub(feeAmount);
  const releaseAt = new Date(Date.now() + HOLD_DAYS * 24 * 60 * 60 * 1000);

  return prisma.userEarning.create({
    data: {
      order_id: params.orderId,
      user_id: params.sellerId,
      amount,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      net_amount: netAmount,
      release_at: releaseAt,
      status: EarningStatus.SCHEDULED,
    },
  });
}

export async function releaseDueEarnings() {
  const now = new Date();

  const due = await prisma.userEarning.findMany({
    where: {
      status: EarningStatus.SCHEDULED,
      release_at: { lte: now },
      net_amount: { not: null },
      user_id: { not: null },
    },
  });

  for (const earning of due) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: earning.user_id! },
        data: {
          avaliable_balance: {
            increment: new Prisma.Decimal(earning.net_amount!),
          },
        },
      }),
      prisma.userEarning.update({
        where: { id: earning.id },
        data: { status: EarningStatus.RELEASED },
      }),
    ]);
  }

  return due.length;
}

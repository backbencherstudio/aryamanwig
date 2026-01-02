import { BoostStatus } from "@prisma/client";
import { prisma } from "../prisma";

/**
 * Check and expire boosts where until_date has passed
 * Decreases until_date by 30 minutes for all active boosts
 * Returns number of processed boosts
 */
export async function expireBoosts(): Promise<number> {
  const now = new Date();

  // Find all active boosts
  const activeBoosts = await prisma.boost.findMany({
    where: {
      status: BoostStatus.ACTIVE,
    },
    select: {
      id: true,
      until_date: true,
    },
  });

  for (const boost of activeBoosts) {
    if (boost.until_date) {
      const newUntilDate = new Date(boost.until_date);
      newUntilDate.setMinutes(newUntilDate.getMinutes() - 30); 

      // If until_date is now in the past, expire the boost
      if (newUntilDate <= now) {
        await prisma.boost.update({
          where: { id: boost.id },
          data: {
            until_date: newUntilDate,
            status: BoostStatus.EXPIRED,
            updated_at: now,
          },
        });
      } else {
        // Otherwise just update until_date
        await prisma.boost.update({
          where: { id: boost.id },
          data: {
            until_date: newUntilDate,
            updated_at: now,
          },
        });
      }
    }
  }

  return activeBoosts.length;
}

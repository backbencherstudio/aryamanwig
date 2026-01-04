import { Injectable } from "@nestjs/common";
import { CreateDashboradDto } from "./dto/create-dashborad.dto";
import { UpdateDashboradDto } from "./dto/update-dashborad.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { paginateResponse, PaginationDto } from "src/common/pagination";
import { DateHelper } from "src/common/helper/date.helper";
import { SojebStorage } from "src/common/lib/Disk/SojebStorage";
import appConfig from "src/config/app.config";
import { OrderStatus, ProductStatus } from "@prisma/client";
import { MessageGateway } from "src/modules/chat/message/message.gateway";
import { NotificationRepository } from "src/common/repository/notification/notification.repository";
import { UserRepository } from "src/common/repository/user/user.repository";
import { recordEarningOnOrderPaid } from "src/common/repository/userpayment/userpayment.repository";

@Injectable()
export class DashboradService {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  // * Get all new user requests (pending users)
  async newUserRequests(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: 0,
      type: "user",
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          location: true,
          created_at: true,
        },
      }),
    ]);

    const formattedUsers = users.map((user) => {
      return {
        id: user.id,
        user_name: user.name,
        email: user.email,
        location: user.location,
      };
    });

    return {
      success: true,
      message: "New user requests fetched successfully",
      ...paginateResponse(formattedUsers, total, page, perPage),
    };
  }

  // * Approve user request
  async approveUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      if (user.status === 1) {
        return {
          success: false,
          message: "User is already approved",
        };
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 1,
        },
      });

      const adminUser = await UserRepository.getAdminUser();

      const notificationPayload: any = {
        sender_id: adminUser.id,
        receiver_id: userId,
        text: "Your account has been approved",
        type: "user_approval",
        entity_id: userId,
      };

      const userSocketId = this.messageGateway.clients.get(userId);

      if (userSocketId) {
        this.messageGateway.server
          .to(userSocketId)
          .emit("notification", notificationPayload);
      }

      await NotificationRepository.createNotification(notificationPayload);

      return {
        success: true,
        message: "User approved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // * Reject user request
  async rejectUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Set status to 0 (inactive) and keep approved_at as null
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 0,
        },
      });

      return {
        success: true,
        message: "User rejected successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // * Active users with aggregated counts for dashboard
  async activeUsers(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: 1,
      type: "user",
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where: whereClause }),
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          location: true,
          _count: {
            select: {
              products: true,
              orders_buyer: true,
              orders_seller: true,
            },
          },
        },
      }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      user_name: u.name,
      email: u.email,
      location: u.location,
      bought_products: u._count?.orders_buyer ?? 0,
      sold_products: u._count?.orders_seller ?? 0,
      uploaded_products: u._count?.products ?? 0,
    }));

    return {
      success: true,
      message: "Active users fetched successfully",
      ...paginateResponse(formatted, total, page, perPage),
    };
  }

  // * Get recent orders for admin dashboard
  async recentOrders(paginationDto: PaginationDto) {
    const { page = 1, perPage = 10 } = paginationDto;
    const skip = (page - 1) * perPage;

    const [total, orderItems] = await this.prisma.$transaction([
      this.prisma.orderItem.count(),

      this.prisma.orderItem.findMany({
        skip,
        take: perPage,
        orderBy: {
          order: {
            created_at: "desc",
          },
        },
        select: {
          id: true,
          quantity: true,
          total_price: true,
          product: {
            select: {
              product_title: true,
              photo: true,
            },
          },
          order: {
            select: {
              id: true,
              order_status: true,
              shipping_city: true,
              shipping_address: true,
              buyer: {
                select: {
                  name: true,
                },
              },
              seller: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedData = orderItems.map((item) => ({
      no: item.order.id,
      product_name: item.product.product_title,
      product_photo: item.product.photo[0]
        ? SojebStorage.url(
            `${appConfig().storageUrl.product}/${item.product.photo[0]}`,
          )
        : null,
      seller_name: item.order.seller.name,
      buyer_name: item.order.buyer.name,
      delivery_address: `${item.order.shipping_address}, ${item.order.shipping_city}`,
      quantity: item.quantity,
      amount: item.total_price,
      action_status: item.order.order_status,
    }));

    return {
      meta: {
        totalItems: total,
        currentPage: page,
        itemsPerPage: perPage,
        totalPages: Math.ceil(total / perPage),
      },
      data: formattedData,
    };
  }

  // topic: product

  // * Get product upload requests for admin
  async productUploadRequests(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      status: ProductStatus.PENDING,
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          product_title: true,
          size: true,
          status: true,
          color: true,
          price: true,
          product_item_size: true,
          photo: true,
          created_at: true,
          stock: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              category_name: true,
            },
          },
        },
      }),
    ]);

    const formattedProducts = products.map((product, index) => ({
      No: `${index + 1}`,
      id: product.id,
      Product_Name: product.product_title,
      Product_Photo: product.photo[0]
        ? SojebStorage.url(
            `${appConfig().storageUrl.product}/${product.photo[0]}`,
          )
        : null,
      User_Name: product.user?.name ?? null,
      Category: product.category?.category_name ?? null,
      Size: product.size,
      Product_Item_Size: product.product_item_size,
      Color: product.color,
      Qnty: product.stock,
      Amount: product.price,
      Time: product.created_at,
    }));

    return {
      success: true,
      message: "Total pending products fetched successfully",
      ...paginateResponse(formattedProducts, total, page, perPage),
    };
  }

  // * Approve product upload request
  async approveProduct(productId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        return {
          success: false,
          message: "Product not found",
        };
      }
      if (product.status === ProductStatus.APPROVED) {
        return {
          success: false,
          message: "Product is already approved",
        };
      }
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.APPROVED,
        },
      });
      return {
        success: true,
        message: "Product approved successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // * Reject product upload request
  async rejectProduct(productId: string) {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return {
          success: false,
          message: "Product not found",
        };
      }
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          status: ProductStatus.REJECTED,
        },
      });
      return {
        success: true,
        message: "Product rejected successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // topic: order

  // * recent completed orders
  async totalOrders(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      order_status: OrderStatus.DELIVERED,
    };

    const total = await this.prisma.order.count({ where: whereClause });

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                product_title: true,
                photo: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: perPage,
    });

    const formattedOrders = orders.flatMap((order, orderIndex) =>
      order.order_items.map((item, itemIndex) => ({
        No: `${orderIndex + 1}`,
        Product_Name: item.product.product_title,
        Product_Photo: item.product.photo[0]
          ? SojebStorage.url(
              `${appConfig().storageUrl.product}/${item.product.photo[0]}`,
            )
          : null,
        Seller_Name: order.seller.name,
        Buyer_Name: order.buyer.name,
        Delivery_Address: order.shipping_address + ", " + order.shipping_city,
        Qnty: item.quantity,
        Amount: item.total_price,
        Action: order.order_status,
      })),
    );

    return {
      success: true,
      message: "Completed orders fetched successfully",
      ...paginateResponse(formattedOrders, total, page, perPage),
    };
  }

  // *recent pending orders
  async pendingOrders(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      order_status: OrderStatus.PROCESSING,
    };

    const total = await this.prisma.order.count({ where: whereClause });

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                product_title: true,
                photo: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: perPage,
    });

    const formattedOrders = orders.flatMap((order, orderIndex) =>
      order.order_items.map((item, itemIndex) => ({
        No: `${orderIndex + 1}`,
        Product_Name: item.product.product_title,
        Product_Photo: item.product.photo[0]
          ? SojebStorage.url(
              `${appConfig().storageUrl.product}/${item.product.photo[0]}`,
            )
          : null,
        Seller_Name: order.seller.name,
        Buyer_Name: order.buyer.name,
        Delivery_Address: order.shipping_address + ", " + order.shipping_city,
        Qnty: item.quantity,
        Amount: item.total_price,
        Action: order.order_status,
      })),
    );

    return {
      success: true,
      message: "Completed orders fetched successfully",
      ...paginateResponse(formattedOrders, total, page, perPage),
    };
  }

  // *recent cancelled orders
  async cancelledOrders(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = {
      order_status: OrderStatus.CANCELLED,
    };

    const total = await this.prisma.order.count({ where: whereClause });

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      include: {
        order_items: {
          include: {
            product: {
              select: {
                id: true,
                product_title: true,
                photo: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip,
      take: perPage,
    });

    const formattedOrders = orders.flatMap((order, orderIndex) =>
      order.order_items.map((item, itemIndex) => ({
        No: `${orderIndex + 1}`,
        Product_Name: item.product.product_title,
        Product_Photo: item.product.photo[0]
          ? SojebStorage.url(
              `${appConfig().storageUrl.product}/${item.product.photo[0]}`,
            )
          : null,
        Seller_Name: order.seller.name,
        Buyer_Name: order.buyer.name,
        Delivery_Address: order.shipping_address + ", " + order.shipping_city,
        Qnty: item.quantity,
        Amount: item.total_price,
        Action: order.order_status,
      })),
    );

    return {
      success: true,
      message: "Completed orders fetched successfully",
      ...paginateResponse(formattedOrders, total, page, perPage),
    };
  }

  // * update order status
  async updateOrderStatus(orderid: string, status: "DELIVERED" | "CANCELLED") {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderid },
        include: {
          order_items: {
            include: {
              product: {
                select: {
                  product_title: true,
                },
              },
            },
            take: 1,
          },
        },
      });

      if (!order) {
        return { success: false, message: "Order not found" };
      }

      const newStatus =
        status === "DELIVERED" ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;

      if (order.order_status === newStatus) {
        return { success: true, message: "Order already in desired status" };
      }

      // Update order status
      await this.prisma.order.update({
        where: { id: orderid },
        data: { order_status: newStatus },
      });

      // If status is DELIVERED, create earning immediately
      if (newStatus === OrderStatus.DELIVERED && order.seller_id) {
        await recordEarningOnOrderPaid({
          orderId: order.id,
          sellerId: order.seller_id,
          amount: order.grand_total,
        });
      }

      // Get product title from order items
      const productTitle =
        order.order_items?.[0]?.product?.product_title || "Product";

      // Send notification to buyer
      const adminUser = await UserRepository.getAdminUser();
      const isDelivered = newStatus === OrderStatus.DELIVERED;
      const notificationType = isDelivered
        ? "order_delivered"
        : "order_cancelled";
      const notificationText = isDelivered
        ? `Your order for "${productTitle}" has been delivered successfully!`
        : `Your order for "${productTitle}" has been cancelled.`;

      const notificationPayload: any = {
        sender_id: adminUser.id,
        receiver_id: order.buyer_id,
        text: notificationText,
        type: notificationType,
        entity_id: orderid,
      };

      // Send real-time notification via socket
      const buyerSocketId = this.messageGateway.clients.get(order.buyer_id);
      if (buyerSocketId) {
        this.messageGateway.server
          .to(buyerSocketId)
          .emit("notification", notificationPayload);
      }

      // Save notification to database
      await NotificationRepository.createNotification(notificationPayload);

      // Also notify seller if order is cancelled
      if (!isDelivered && order.seller_id) {
        const sellerNotificationPayload: any = {
          sender_id: adminUser.id,
          receiver_id: order.seller_id,
          text: `Order for "${productTitle}" has been cancelled.`,
          type: "order_cancelled",
          entity_id: orderid,
        };

        const sellerSocketId = this.messageGateway.clients.get(order.seller_id);
        if (sellerSocketId) {
          this.messageGateway.server
            .to(sellerSocketId)
            .emit("notification", sellerNotificationPayload);
        }

        await NotificationRepository.createNotification(
          sellerNotificationPayload,
        );
      }

      return { success: true, message: "Order status updated successfully" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // topic: boost

  // * recent boost requests
  async recentBoostRequests(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const [total, boosts] = await this.prisma.$transaction([
      this.prisma.boost.count(),
      this.prisma.boost.findMany({
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          product: {
            select: {
              id: true,
              product_title: true,
              price: true,
              photo: true,
              stock: true,
            },
          },
        },
      }),
    ]);

    const formattedBoosts = boosts.map((boost, index) => {
      // Calculate duration in days
      const startDate = new Date(boost.start_date);
      const endDate = boost.end_date ? new Date(boost.end_date) : new Date();
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

      return {
        no: skip + index + 1,
        id: boost.id,
        product_id: boost.product_id,
        product_name: boost.product?.product_title ?? "N/A",
        product_photo: boost.product?.photo?.[0]
          ? SojebStorage.url(
              `${appConfig().storageUrl.product}/${boost.product.photo[0]}`,
            )
          : null,
        seller_name: boost.user?.name ?? "N/A",
        quantity: boost.product?.stock ?? 0,
        price: boost.product?.price ?? 0,
        boost_type: boost.tier,
        boost_price: boost.price,
        duration: `${durationDays} Days`,
        status: boost.status,
        payment_status: boost.payment_status,
        created_at: boost.created_at,
      };
    });

    return {
      success: true,
      message: "Recent boost requests fetched successfully",
      ...paginateResponse(formattedBoosts, total, page, perPage),
    };
  }

  // topic: transaction

  // * Transactions list for admin dashboard (as shown in UI design)
  async transactions(dto: { page: number; perPage: number; filter?: string }) {
    const { page, perPage, filter } = dto;
    const skip = (page - 1) * perPage;

    // Build filter based on month/time period
    let dateFilter = {};
    if (filter === "monthly") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      dateFilter = {
        created_at: {
          gte: startOfMonth,
        },
      };
    } else if (filter === "weekly") {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = {
        created_at: {
          gte: startOfWeek,
        },
      };
    } else if (filter === "daily") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = {
        created_at: {
          gte: startOfDay,
        },
      };
    }

    const whereClause = {
      ...dateFilter,
    };

    const [total, earnings] = await this.prisma.$transaction([
      this.prisma.userEarning.count({ where: whereClause }),
      this.prisma.userEarning.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              id: true,
              grand_total: true,
              order_items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      product_title: true,
                      price: true,
                      photo: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const formattedTransactions = earnings.map((earning, index) => {
      const product = earning.order?.order_items?.[0]?.product;
      return {
        no: String(skip + index + 1).padStart(2, "0"),
        seller_name: earning.user?.name ?? "N/A",
        product_name: product?.product_title ?? "N/A",
        product_photo: product?.photo?.[0]
          ? SojebStorage.url(
              `${appConfig().storageUrl.product}/${product.photo[0]}`,
            )
          : null,
        product_price: product?.price ?? 0,
        payment_amount: earning.amount ?? 0,
        sellers_amount: earning.net_amount ?? 0,
        earning: earning.fee_amount ?? 0, // 5% platform fee
      };
    });

    return {
      success: true,
      message: "Transactions fetched successfully",
      ...paginateResponse(formattedTransactions, total, page, perPage),
    };
  }

  //  total user,sell,order,revenue
  async getSummary() {
    const totalUsers = await this.prisma.user.count({});
    const totalProducts = await this.prisma.product.count();
    const totalOrders = await this.prisma.order.count();
    const totalRevenueResult = await this.prisma.order.aggregate({
      _sum: {
        grand_total: true,
      },
    });
    const totalRevenue = totalRevenueResult._sum.grand_total || 0;
    return {
      success: true,
      message: "Summary fetched successfully",
      data: {
        total_users: totalUsers,
        total_products: totalProducts,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
      },
    };
  } 


}

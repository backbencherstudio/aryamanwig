import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateWishlistDto } from "./dto/create-wishlist.dto";
import { UpdateWishlistDto } from "./dto/update-wishlist.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { SojebStorage } from "src/common/lib/Disk/SojebStorage";
import appConfig from "src/config/app.config";
import { create } from "domain";
import { formatDate, getBoostTimeLeft } from "src/common/utils/date.utils";
import { paginateResponse, PaginationDto } from "src/common/pagination";

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // add to wishlist
  async addToWishlist(createWishlistDto: CreateWishlistDto, user: string) {
    const { product_id } = createWishlistDto;

    const product = await this.prisma.product.findUnique({
      where: { id: product_id },
    });

    if (!product) {
      throw new ConflictException("Product not found");
    }

    if (product.user_id === user) {
      throw new ConflictException(
        "You cannot add your own product to wishlist",
      );
    }

    const existingWishlistItem = await this.prisma.wishlist.findFirst({
      where: { product_id, user_id: user },
    });

    if (existingWishlistItem) {
      throw new ConflictException("Product already in wishlist");
    }

    const newWishlistItem = await this.prisma.wishlist.create({
      data: {
        product_id,
        user_id: user,
      },
    });

    return {
      success: true,
      message: "Product added to wishlist successfully",
      data: {
        id: newWishlistItem.id,
        product_id: newWishlistItem.product_id,
        user_id: newWishlistItem.user_id,
      },
    };
  }

  // get all wishlist items
  async findAll(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.wishlist.count(),
      this.prisma.wishlist.findMany({
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        include: {
          product: {
            select: {
              product_title: true,
              product_description: true,
              stock: true,
              price: true,
              photo: true,
            },
          },
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: "Wishlist is empty",
        ...paginateResponse([], total, page, perPage),
      };
    }

    const formattedItems = items
      .filter((item) => item.product !== null)
      .map((item) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product: {
          product_title: item.product.product_title,
          product_description: item.product.product_description,
          stock: item.product.stock,
          price: item.product.price,
          photo:
            item.product.photo && item.product.photo.length > 0
              ? item.product.photo.map((p) =>
                  SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
                )
              : null,
        },
      }));

    const paginatedData = paginateResponse(
      formattedItems,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: "Wishlist items retrieved successfully",
      ...paginatedData,
    };
  }

  // get all wishlist items for a user
  async findAllUser(user: string, paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const whereClause = { user_id: user };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.wishlist.count({ where: whereClause }),
      this.prisma.wishlist.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
        include: {
          product: true,
        },
      }),
    ]);

    if (total === 0) {
      return {
        success: true,
        message: "Your wishlist is empty",
        ...paginateResponse([], total, page, perPage),
      };
    }

    // Format the response data
    const formattedItems = items
      .filter((item) => item.product !== null) // Filter out items with deleted products
      .map((item) => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product_title: item.product.product_title,
        product_photo:
          item.product.photo && item.product.photo.length > 0
            ? item.product.photo.map((p) =>
                SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
              )
            : [],
        product_size: item.product.size,
        product_condition: item.product.condition,
        product_price: item.product.price,
        product_stock: item.product.stock,
        created_at: item.product.created_at,
      }));

    const paginatedData = paginateResponse(
      formattedItems,
      total,
      page,
      perPage,
    );

    return {
      success: true,
      message: "User wishlist items retrieved successfully",
      ...paginatedData,
    };
  }

  // get single wishlist item by id
  async findOne(id: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new NotFoundException("Wishlist item not found");
    }

    if (!item.product) {
      throw new NotFoundException("Product no longer exists");
    }

    return {
      success: true,
      message: "Wishlist item retrieved successfully",
      data: {
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product: {
          product_title: item.product.product_title,
          product_description: item.product.product_description,
          stock: item.product.stock,
          price: item.product.price,
          photo:
            item.product.photo && item.product.photo.length > 0
              ? item.product.photo.map((p) =>
                  SojebStorage.url(`${appConfig().storageUrl.product}/${p}`),
                )
              : null,
        },
      },
    };
  }

  // delete wishlist item by id
  async remove(id: string, user: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException("Wishlist item not found");
    }

    if (item.user_id !== user) {
      throw new ConflictException("You are not authorized to delete this item");
    }

    await this.prisma.wishlist.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Wishlist item removed successfully",
    };
  }
}

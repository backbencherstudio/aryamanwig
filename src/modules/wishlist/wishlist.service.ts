import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { create } from 'domain';
import { formatDate, getBoostTimeLeft } from 'src/common/utils/date.utils';

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
      throw new ConflictException('Product not found');
    }

    const existingWishlistItem = await this.prisma.wishlist.findFirst({
      where: { product_id, user_id: user },
    });

    if (existingWishlistItem) {
      throw new ConflictException('Product already in wishlist');
    }

    const newWishlistItem = await this.prisma.wishlist.create({
      data: {
        product_id,
        user_id: user,
      },
    });

    return {
      success: true,
      message: 'Product added to wishlist successfully',
      data: {
        id: newWishlistItem.id,
        product_id: newWishlistItem.product_id,
        user_id: newWishlistItem.user_id,
      }
    }
  }

  // get all wishlist items
  async findAll() {

    const items = await this.prisma.wishlist.findMany({
      include: {
        product: true, 
      },
    });

    return {
      success: true,
      message: 'Wishlist items retrieved successfully',
      data: items.map(item => ({
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product: {
          product_title: item.product.product_title,
          product_description: item.product.product_description,
          stock: item.product.stock,
          price: item.product.price,
          photo: item.product.photo,
        },
      })),
    };
  }

  // get all wishlist items for a user
  async findAllUser(user: string) {

    const items = await this.prisma.wishlist.findMany({
      where: { user_id: user },
      include: {
        product: true, 
      },
    });


    return {
      success: true,
      message: 'User wishlist items retrieved successfully',
      data: items.map(item => ({

        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product_title: item.product.product_title,
        product_photo: item.product.photo ? SojebStorage.url(`${appConfig().storageUrl.product}/${item.product.photo}`): null,
        product_size: item.product.size,
        product_condition: item.product.condition,
        product_price: item.product.price,
        product_stock: item.product.stock,
        created_at: formatDate(item.product.created_at),
        boost_time: getBoostTimeLeft(item.product.boost_until)

      })),
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
      throw new NotFoundException('Wishlist item not found');
    }

    return {
      success: true,
      message: 'Wishlist item retrieved successfully',
      data: {
        id: item.id,
        user_id: item.user_id,
        product_id: item.product_id,
        product: {
          product_title: item.product.product_title,
          product_description: item.product.product_description,
          stock: item.product.stock,
          price: item.product.price,
          photo: item.product.photo,
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
      throw new NotFoundException('Wishlist item not found');
    }

    if (item.user_id !== user) {
      throw new ConflictException('You are not authorized to delete this item');
    }

    await this.prisma.wishlist.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Wishlist item removed successfully',
    };
  }

  
}

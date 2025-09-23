import { Injectable } from '@nestjs/common';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { PrismaService } from 'src/prisma/prisma.service';

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
      throw new Error('Product not found');
    }

    // const existingWishlistItem = await this.prisma.wishlist.findFirst({
    //   where: { product_id, user_id: user },
    // });
    
  }


  // get all wishlist items
  findAll() {
    return `This action returns all wishlist`;
  }

  findOne(id: number) {
    return `This action returns a #${id} wishlist`;
  }

  update(id: number, updateWishlistDto: UpdateWishlistDto) {
    return `This action updates a #${id} wishlist`;
  }

  remove(id: number) {
    return `This action removes a #${id} wishlist`;
  }
}

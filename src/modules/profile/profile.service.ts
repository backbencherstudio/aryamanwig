import { Injectable } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { add } from 'date-fns';
import { ProductStatus } from '@prisma/client';
import { PaginationDto } from 'src/common/pagination';

@Injectable()
export class ProfileService {

   constructor(
      private readonly prisma: PrismaService,
    ) {}


     async getProfileAndProducts(userId: string, query: PaginationDto) {
    try {
      // Fetch user profile data
      const user = await this.prisma.user.findFirst({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          avatar: true,
          cover_photo: true,
          country: true,
          city: true,
          address: true,
        },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Fetch review stats (average rating and review count)
      const reviewStats = await this.prisma.review.aggregate({
        where: { review_receiver: userId },
        _avg: { rating: true },
        _count: { id: true },
      });

      // Calculate total earnings from orders where payment is "PAID"
      const totalEarnings = await this.prisma.order.aggregate({
        where: { seller_id: userId, payment_status: 'PAID' },
        _sum: { grand_total: true },
      });

      // Calculate total penalties from disposals
      const totalPenalties = await this.prisma.disposal.aggregate({
        where: { user_id: userId },
        _sum: { penalty_amount: true },
      });

      // Get avatar and cover photo URLs
      const avatarUrl = user.avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null;
      
      const coverPhotoUrl = user.cover_photo
        ? SojebStorage.url(`${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`)
        : null;

      // Pagination for products
      const { page, perPage } = query;
      const skip = (page - 1) * perPage;

      const whereClause = { user_id: userId, status: ProductStatus.APPROVED };

      // Fetch user products
      const [totalProducts, products] = await this.prisma.$transaction([
        this.prisma.product.count({ where: whereClause }),
        this.prisma.product.findMany({
          where: whereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            product_title: true,
            product_description: true,
            price: true,
            stock: true,
            photo: true,
          },
        }),
      ]);

      // Return combined data: profile and products
      return {
        success: true,
        message: 'Profile and products retrieved successfully',
        data: {
          profile: {
            ...user,
            avatarUrl,
            coverPhotoUrl,
            location: user.country || user.city || user.address,
            rating: reviewStats._avg.rating ?? 0,
            review_count: reviewStats._count.id,
            total_earning: totalEarnings._sum.grand_total ?? 0,
            total_penalties: totalPenalties._sum.penalty_amount ?? 0,
          },
          products: {
            products,
            total: totalProducts,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(totalProducts / perPage),
          },
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }



  // get user profile view
  async Me(userId: string) {
      try {
      
        const user = await this.prisma.user.findFirst({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            cover_photo: true, 
            country: true,    
            city: true,
            address: true,
          },
        });
  
        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }

    
        const reviewStats = await this.prisma.review.aggregate({
          where: {
            review_receiver: userId 
          },
          _avg: {
            rating: true,
          },
          _count: {
            id: true, 
          }
        });

 
         const totalEarnings = await this.prisma.order.aggregate({
          where: {
            seller_id: userId,
            payment_status: 'PAID',
          },
          _sum: {
            grand_total: true,
          },
        });

        const totalPenalties = await this.prisma.disposal.aggregate({
          where: {
            user_id: userId,
          },
          _sum: {
            penalty_amount: true,
          },
        });



  
        const avatar_url = user.avatar
          ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
          : null;
      
        
        const cover_photo_url = user.cover_photo
          ? SojebStorage.url(`${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`)
          : null;

        
        return {
          success: true,
          data: {
            ...user, 
            avatar_url,
            cover_photo_url,
            location: user.country || user.city || user.address,
            rating: reviewStats._avg.rating ?? 0, 
            review_count: reviewStats._count.id,
            total_earning: totalEarnings._sum.grand_total ?? 0,
            total_penalties: totalPenalties._sum.penalty_amount ?? 0,

          },
        };

      } catch (error) {
        return {
          success: false,
          message: error.message,
        };
      }
  }

  // user profile with average review and average rating
  async getUserReviews(userId: string) {

    // get user details
    const user = await this.prisma.user.findUnique({  
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        city: true,
        address: true,
        phone_number: true,
        type: true,
      },
    });

   

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const averageRating = await this.prisma.review.aggregate({
      where: { review_receiver: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    

   
    return {
      success: true,
      message: 'User profile with average rating',
      data:{
        username: user.name,
        userphoto: user.avatar ? SojebStorage.url(appConfig().storageUrl.avatar+user.avatar,) : null,
        averageRating: averageRating._avg.rating ? parseFloat(averageRating._avg.rating.toFixed(2)) : 0,
        totalReviews: averageRating._count.rating ? averageRating._count.rating : 0,
        adress: user.address,
        city: user.city,
      }
    }



  }

   
  // client user profile view
   async Client(userId: string) {
      try {
      
        const user = await this.prisma.user.findFirst({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            avatar: true,
            cover_photo: true, 
            country: true,    
            city: true,
            address: true,
          },
        });
  
        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }

    
        const reviewStats = await this.prisma.review.aggregate({
          where: {
            review_receiver: userId 
          },
          _avg: {
            rating: true,
          },
          _count: {
            id: true, 
          }
        });

 
         const totalEarnings = await this.prisma.order.aggregate({
          where: {
            seller_id: userId,
            payment_status: 'PAID',
          },
          _sum: {
            grand_total: true,
          },
        });

        const totalPenalties = await this.prisma.disposal.aggregate({
          where: {
            user_id: userId,
          },
          _sum: {
            penalty_amount: true,
          },
        });



  
        const avatar_url = user.avatar
          ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
          : null;
      
        
        const cover_photo_url = user.cover_photo
          ? SojebStorage.url(`${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`)
          : null;

        
        return {
          success: true,
          data: {
            ...user, 
            avatar_url,
            cover_photo_url,
            location: user.country || user.city || user.address,
            rating: reviewStats._avg.rating ?? 0, 
            review_count: reviewStats._count.id,
          
          },
        };

      } catch (error) {
        return {
          success: false,
          message: error.message,
        };
      }
  }

  
  // user profile with average review and average rating
  async getClientReviews(userId: string) {

    // get user details
    const user = await this.prisma.user.findUnique({  
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        city: true,
        address: true,
        phone_number: true,
        type: true,
      },
    });

   

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    const averageRating = await this.prisma.review.aggregate({
      where: { review_receiver: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    

   
    return {
      success: true,
      message: 'User profile with average rating',
      data:{
        username: user.name,
        userphoto: user.avatar ? SojebStorage.url(appConfig().storageUrl.avatar+user.avatar,) : null,
        averageRating: averageRating._avg.rating ? parseFloat(averageRating._avg.rating.toFixed(2)) : 0,
        totalReviews: averageRating._count.rating ? averageRating._count.rating : 0,
        adress: user.address,
        city: user.city,
      }
    }



  }

}
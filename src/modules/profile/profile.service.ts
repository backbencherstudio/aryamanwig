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

  // *user dashboard with profile and products
  async getProfileAndProductsandReviews(userId: string, query: PaginationDto) {
     
      const { page, perPage } = query;
      const skip = (page - 1) * perPage;
      const productWhereClause = { user_id: userId };
      const reviewWhereClause = { review_receiver: userId };
      
      const [
        //aggregate and profile data
        user,
        reviewStats,
        totalEarnings,
        totalPenalties,

        // products data
        totalProducts,
        products,
        totalReviews,
        reviews
      ] = await Promise.all([
        
       
        this.prisma.user.findFirst({
          where: { id: userId },
          select: {
            id: true, name: true, avatar: true, cover_photo: true,
            country: true, city: true, address: true,
          },
        }),

        this.prisma.review.aggregate({
          where: reviewWhereClause,
          _avg: { rating: true },
          _count: { id: true },
        }),

        this.prisma.order.aggregate({
          where: { seller_id: userId, payment_status: 'PAID' },
          _sum: { grand_total: true },
        }),

        this.prisma.disposal.aggregate({
          where: { user_id: userId },
          _sum: { penalty_amount: true },
        }),

        this.prisma.product.count({ where: productWhereClause }),
        this.prisma.product.findMany({
          where: productWhereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          select: {
            id: true, product_title: true, price: true,
            photo: true, status: true,
          },
        }),
        this.prisma.review.count({ where: reviewWhereClause }),
        this.prisma.review.findMany({
          where: reviewWhereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: { name: true, avatar: true }
            },
          },
        }),
      ]);

     
      if (!user) {
        return { success: false, message: 'User not found' };
      }

    
      const avatarUrl = user.avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null;
      const coverPhotoUrl = user.cover_photo
        ? SojebStorage.url(`${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`)
        : null;

      const formattedProducts = products.map(p => ({
        ...p,
        photoUrls: p.photo?.map(img =>
          SojebStorage.url(`${appConfig().storageUrl.product}/${img}`)
        ) || []
      }));

      const formattedReviews = reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.user.name,
        reviewer_avatar: review.user.avatar
          ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${review.user.avatar}`)
          : null,
        created_ago: review.created_at,
      }));

      
      return {
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: {
          profile: {
            ...user,
            avatarUrl,
            coverPhotoUrl,
            location: user.country || user.city || user.address,
            rating: Number(reviewStats._avg.rating?.toFixed(2)) || 0,
            review_count: reviewStats._count.id,
            total_earning: totalEarnings._sum.grand_total ?? 0,
            total_penalties: totalPenalties._sum.penalty_amount ?? 0,
          },
          products: {
            data: formattedProducts,
            total: totalProducts,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(totalProducts / perPage),
          },
          reviews: {
            data: formattedReviews,
            total: totalReviews,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(totalReviews / perPage),
          }
        },
      };

    
  }

  // *client dashboard with profile and products
  async getProfileAndProducts(userId: string, query: PaginationDto) {
   
      
      const { page, perPage } = query;
      const skip = (page - 1) * perPage;
      const productWhereClause = { user_id: userId };
      const reviewWhereClause = { review_receiver: userId };

     
      const [
      
        user,
        reviewStats,
        totalEarnings,
        totalPenalties,

       
        totalProducts,
        products,
        totalReviews,
        reviews
      ] = await Promise.all([
        
        
        this.prisma.user.findFirst({
          where: { id: userId },
          select: {
            id: true, name: true, avatar: true, cover_photo: true,
            country: true, city: true, address: true,
          },
        }),
        this.prisma.review.aggregate({
          where: reviewWhereClause,
          _avg: { rating: true },
          _count: { id: true },
        }),
        this.prisma.order.aggregate({
          where: { seller_id: userId, payment_status: 'PAID' },
          _sum: { grand_total: true },
        }),
        this.prisma.disposal.aggregate({
          where: { user_id: userId },
          _sum: { penalty_amount: true },
        }),

      
        this.prisma.product.count({ where: productWhereClause }),
        this.prisma.product.findMany({
          where: productWhereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          select: {
            id: true, product_title: true, price: true,
            photo: true, status: true,
          },
        }),
        this.prisma.review.count({ where: reviewWhereClause }),
        this.prisma.review.findMany({
          where: reviewWhereClause,
          skip,
          take: perPage,
          orderBy: { created_at: 'desc' },
          include: {
            user: { 
              select: { name: true, avatar: true }
            },
          },
        }),
      ]);

     
      if (!user) {
        return { success: false, message: 'User not found' };
      }

    
      const avatarUrl = user.avatar
        ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${user.avatar}`)
        : null;
      const coverPhotoUrl = user.cover_photo
        ? SojebStorage.url(`${appConfig().storageUrl.coverPhoto}/${user.cover_photo}`)
        : null;

      const formattedProducts = products.map(p => ({
        ...p,
        photoUrls: p.photo?.map(img =>
          SojebStorage.url(`${appConfig().storageUrl.product}/${img}`)
        ) || []
      }));

      const formattedReviews = reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        reviewer_name: review.user.name,
        reviewer_avatar: review.user.avatar
          ? SojebStorage.url(`${appConfig().storageUrl.avatar}/${review.user.avatar}`)
          : null,
        created_ago: review.created_at,
      }));

      
      return {
        success: true,
        message: 'Profile data retrieved successfully',
        data: {
          profile: {
            ...user,
            avatarUrl,
            coverPhotoUrl,
            location: user.country || user.city || user.address,
            rating: Number(reviewStats._avg.rating?.toFixed(2)) || 0,
            review_count: reviewStats._count.id,
            total_earning: totalEarnings._sum.grand_total ?? 0,
            total_penalties: totalPenalties._sum.penalty_amount ?? 0,
          },
          products: {
            data: formattedProducts,
            total: totalProducts,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(totalProducts / perPage),
          },
          reviews: {
            data: formattedReviews,
            total: totalReviews,
            currentPage: page,
            perPage,
            totalPages: Math.ceil(totalReviews / perPage),
          }
        },
      };

    
  }

  // *get user profile view
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

  // *user profile with average review and average rating
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

   
  // *client user profile view
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

  
  // *user profile with average review and average rating
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
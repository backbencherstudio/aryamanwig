import { Injectable } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import appConfig from 'src/config/app.config';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { add } from 'date-fns';

@Injectable()
export class ProfileService {

   constructor(
      private readonly prisma: PrismaService,
    ) {}

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

    console.log(user)

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

    console.log(averageRating)

   
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

  // profile.service.ts
 
  // profile.service.ts
// profile.service.ts


  

}
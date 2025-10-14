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
            email: true,
            avatar: true,
            address: true,
            phone_number: true,
            type: true,
            gender: true,
            date_of_birth: true,
            created_at: true,
          },
        });
  
        if (!user) {
          return {
            success: false,
            message: 'User not found',
          };
        }
  
        if (user.avatar) {
          user['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar+user.avatar,
          );
        }
  
        if (user) {
          return {
            success: true,
            data: user,
          };
        } else {
          return {
            success: false,
            message: 'User not found',
          };
        }
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



  

}
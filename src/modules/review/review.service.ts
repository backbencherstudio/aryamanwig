import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDistanceToNowStrict, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { use } from 'passport';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';


@Injectable()
export class ReviewService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // create review
  async create( createReviewDto: CreateReviewDto, buyerId: string) {

    const { rating, 
            comment, 
            review_receiver, 
            status,
            order_id } = createReviewDto;


    const order = await this.prisma.order.findUnique({
      where: { id: order_id },
      select: {
        id: true,
        buyer_id: true,
        seller_id: true,
        order_status: true,
      },
    });


    if (!order) throw new NotFoundException('Order not found');


    if (order.buyer_id !== buyerId) {
      throw new ConflictException('You are not authorized to review for this order');
    }

    if (order.order_status !== 'DELIVERED') {
      throw new ConflictException('You can only review after the order is delivered');
    }

    if (order.seller_id !== review_receiver) {
      throw new ConflictException('You can only review the seller of this order');
    }

    if(review_receiver === buyerId){
      throw new ConflictException('You cannot review yourself');
    }

     const existingReview = await this.prisma.review.findFirst({
      where: {
        review_sender: buyerId,
        review_receiver,
        order_id,
      },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed for this order');
    }

    const newReview = await this.prisma.review.create({
      data: {
        rating,
        comment,
        review_receiver,
        review_sender: buyerId,
        order_id
      },
      include: {
        order: true,
      }
    });
         
    return {
      success: true,
      message: 'Review created successfully',
      data: {
        id: newReview.id,
        rating: newReview.rating,
        comment: newReview.comment,
        order_id: newReview.order_id,
        review_receiver: newReview.review_receiver,
        review_sender: newReview.review_sender,
        status: newReview.status
      }
    }
  }

  // get all reviews
   async findAll() {

    const reviews = await this.prisma.review.findMany({
      orderBy: { id: 'desc' },
      include: {
        user: true,
      },
    });

    return{
      success: true,
      message: 'Reviews retrieved successfully',
      data: reviews.map(review => ({
        id: review.id,
        rating: review.rating,  
        comment: review.comment,
        review_receiver: review.review_receiver,
        review_sender: review.review_sender,
        status: review.status,
        user: { id: review.user.id, 
                name: review.user.name, 
                email: review.user.email,
                avatar: review.user.avatar ? SojebStorage.url(`${process.env.STORAGE_URL}/avatar/${review.user.avatar}`) : null
              }
      }))
    }

  }

  // get single review by id
  async findOne(id: string) {

    const review = await this.prisma.review.findUnique({
      where: { id: id },
      include: {
        user: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return {
      success: true,
      message: 'Review retrieved successfully',
      data: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        review_receiver: review.review_receiver,
        review_sender: review.review_sender,
        status: review.status,
        user: { 
          id: review.user.id, 
          name: review.user.name, 
          email: review.user.email,
          avatar: review.user.avatar ? SojebStorage.url(`${process.env.STORAGE_URL}/avatar/${review.user.avatar}`) : null
        }
      }
    }
  }

  // update review by id
  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string) {

    const { rating, comment, status } = updateReviewDto;

     const review = await this.prisma.review.findUnique({
      where: { id },
     });

     if (!review) {
       throw new NotFoundException('Review not found');
     }
    

     if (review.review_sender !== userId) {
      throw new ForbiddenException('You are not allowed to update this review');
     }

    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: updateReviewDto
    });

    return {
      success: true,
      message: 'Review updated successfully',
      data: {
        id: updatedReview.id,
        rating: updatedReview.rating,
        comment: updatedReview.comment,
        review_receiver: updatedReview.review_receiver,
        review_sender: updatedReview.review_sender,
        status: updatedReview.status,
      },
    };
  }

   // delete review by id
   async remove(id: string, userId: string) {

    const existingReview = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.review_sender !== userId) {
      throw new NotFoundException('You are not authorized to delete this review');
    }

    const deletedReview = await this.prisma.review.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Review deleted successfully',
      data: deletedReview,
    };
  }

  // get all reviws for a user
  async getAllReviewsForClient(id: string) {
    const reviews = await this.prisma.review.findMany({
      where: { review_receiver: id },
      orderBy: { id: 'desc' },
      include: {
        user: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const aggregate = await this.prisma.review.aggregate({
      where: { review_receiver: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

  
   

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      name: review.user.name,
      avatar: review.user.avatar ?  SojebStorage.url(`${appConfig().storageUrl.avatar}/${review.user.avatar}`): null,
      created_ago: review.created_at,
    }));

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        totalReviews: aggregate._count.rating,
        averageRating: Number(aggregate._avg.rating?.toFixed(2)) || 0,
        reviews: formattedReviews,
      },
    };
  }


  //
  async getAllReviewsForUser(id: string) {
    const reviews = await this.prisma.review.findMany({
      where: { review_receiver: id },
      orderBy: { id: 'desc' },
      include: {
        user: true,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const aggregate = await this.prisma.review.aggregate({
      where: { review_receiver: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

  
   

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      name: review.user.name,
      avatar: review.user.avatar ?  SojebStorage.url(`${appConfig().storageUrl.avatar}/${review.user.avatar}`): null,
      created_ago: review.created_at,
    }));

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        totalReviews: aggregate._count.rating,
        averageRating: Number(aggregate._avg.rating?.toFixed(2)) || 0,
        reviews: formattedReviews,
      },
    };
  }

  
  }
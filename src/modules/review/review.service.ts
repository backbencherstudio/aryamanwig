import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDistanceToNowStrict, differenceInWeeks, differenceInMonths, differenceInYears } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { use } from 'passport';


@Injectable()
export class ReviewService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // create review
  async create( createReviewDto: CreateReviewDto, userId: string) {

    const { rating, 
            comment, 
            review_receiver, 
            status } = createReviewDto;

    const existing_receiver = await this.prisma.user.findUnique({
      where: { id: review_receiver },
    });        

    if (!existing_receiver) {
      throw new NotFoundException('Review receiver does not exist');
    }

    if (review_receiver === userId) {
      throw new NotFoundException('You cannot review yourself');
    }

    const newReview = await this.prisma.review.create({
      data: {
        rating, 
        comment, 
        review_receiver, 
        review_sender: userId,
        status
      },
    });

    return {
      success: true,
      message: 'Review created successfully',
      data: {
        id: newReview.id,
        rating: newReview.rating,
        comment: newReview.comment,
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
                email: review.user.email }
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
          email: review.user.email 
        }
      }
    }
  }

  // update review by id
  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string) {  
    const { rating, comment, status } = updateReviewDto;

    const existingReview = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    if (existingReview.review_sender !== userId) {
      throw new NotFoundException('You are not authorized to update this review');
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

  
    const getTimeAgo = (date: Date): string => {
      const now = new Date();
      const years = differenceInYears(now, date);
      const months = differenceInMonths(now, date);
      const weeks = differenceInWeeks(now, date);

      if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
      if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
      if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

      return formatDistanceToNowStrict(date, {
        addSuffix: true,
        locale: enUS,
      });
    };

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      name: review.user.name,
      avatar: review.user.avatar,
      created_ago: getTimeAgo(new Date(review.created_at)),
    }));

    return {
      success: true,
      message: 'Reviews retrieved successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
        totalReviews: aggregate._count.rating,
        averageRating: Number(aggregate._avg.rating?.toFixed(2)) || 0,
        reviews: formattedReviews,
      },
    };
  }







    
  }
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // create review
  @UseGuards(JwtAuthGuard)
  @Post('create')
  create(@Body() createReviewDto: CreateReviewDto,
         @Req() req: any
  ) {
    const buyerId = req.user.userId;
    return this.reviewService.create(createReviewDto, buyerId);
  }

  // get all reviews
  @Get('allreviews')
  findAll() {
    return this.reviewService.findAll();
  }

  // get single review by id
  @Get('singlereview/:id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  // update review by id
  @UseGuards(JwtAuthGuard)
  @Patch('updatebyid/:id')
  update(@Param('id') id: string, 
         @Body() updateReviewDto: UpdateReviewDto, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.reviewService.update(id, updateReviewDto, user);
  }

  // delete review by id
  @UseGuards(JwtAuthGuard)
  @Delete('deletebyid/:id')
  remove(@Param('id') id: string, 
         @Req() req: any) {
    const user = req.user.userId;
    return this.reviewService.remove(id, user);
  }

  // get all reviws for a user
  @Get('user/:id/reviews')
  getAllReviewsForUser(@Param('id') id: string) {
    return this.reviewService.getAllReviewsForUser(id);
  }


 
  
}

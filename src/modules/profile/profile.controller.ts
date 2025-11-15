import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from '../products/products.service';
import { PaginationDto } from 'src/common/pagination';

@Controller('profile')
export class ProfileController {

   constructor(
    private readonly profileService: ProfileService,
    private readonly productsService: ProductsService
  ) {}



   @UseGuards(JwtAuthGuard)
  @Get('profile-with-products')
  async getProfileWithProducts(
    @Req() req: any,
    @Query() query: PaginationDto, // Handle pagination for products
  ) {
    const userId = req.user.userId;

    // Fetch both profile and products
    const result = await this.profileService.getProfileAndProducts(userId, query);

    return result;
  }


  @UseGuards(JwtAuthGuard)
  @Get('me')
  async Me( @Req() req: any ) {
    const user = req.user.userId;
    return this.profileService.Me(user);
  }

  //  user profile with average review and average rating
  @UseGuards(JwtAuthGuard)
  @Get('review-with-rating')
  async getUserReviews(@Req() req: any) {
    const user = req.user.userId;
    return this.profileService.getUserReviews(user);
  }


  // client user profile view
  @UseGuards(JwtAuthGuard)
  @Get('client/:id')
  async Client( 
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.profileService.Client(id);
  }

  // cliet review list
  @UseGuards(JwtAuthGuard)
  @Get('client-with-rating/:id')
  async getClientReviews(
    @Req() req: any,
    @Param('id') id: string
  ) {
    return this.profileService.getClientReviews(id);
  }
  

}

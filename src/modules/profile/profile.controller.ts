import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('profile')
export class ProfileController {

  constructor(private readonly profileService: ProfileService) {}

  // get user profile view
  @UseGuards(JwtAuthGuard)
  @Get('me')
  Me( @Req() request: any ) {
    const user = request.user;
    return this.profileService.Me(user.id);
  }

  //  user profile with average review and average rating
  @UseGuards(JwtAuthGuard)
  @Get('review-with-rating')
  async getUserReviews(@Req() req: any) {
    const user = req.user.userId;
    return this.profileService.getUserReviews(user);
  }

}

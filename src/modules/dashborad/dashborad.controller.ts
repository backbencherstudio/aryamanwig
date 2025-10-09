import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { DashboradService } from './dashborad.service';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashborad')
export class DashboradController {

  constructor(private readonly dashboradService: DashboradService) {}

  /*================= Brought Item For User =====================*/
  
  // total brought item for user
  @UseGuards(JwtAuthGuard)
  @Get('total-brought-item')
  totalBroughtItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.totalBroughtItem(user);
  }

  // bought pending item  for user
  @UseGuards(JwtAuthGuard)
  @Get('bought-pending-item')
  boughtPendingItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.boughtPendingItem(user);
  }
 

  // bought delivered item  for user
  @UseGuards(JwtAuthGuard)
  @Get('bought-delivered-item')
  boughtDeliveredItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.boughtDeliveredItem(user);
  }


  // bought cancelled item  for user
  @UseGuards(JwtAuthGuard)
  @Get('bought-cancelled-item')
  boughtCancelledItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.boughtCancelledItem(user);
  }


  /*================= Selling Item For User =====================*/
  
  // total selling item for user
  @UseGuards(JwtAuthGuard)
  @Get('total-selling-item')
  totalSellingItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.totalSellingItem(user);
  }
  
  
  // selling pending item  for user
  @UseGuards(JwtAuthGuard)
  @Get('selling-pending-item')
  sellingPendingItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.sellingPendingItem(user);
  }

  // selling delivered item  for user
  @UseGuards(JwtAuthGuard)
  @Get('selling-delivered-item')
  sellingDeliveredItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.sellingDeliveredItem(user);
  }

  // selling cancelled item  for user
  @UseGuards(JwtAuthGuard)
  @Get('selling-cancelled-item')
  sellingCancelledItem(@Req() req: any) {
    const user = req.user.userId;
    return this.dashboradService.sellingCancelledItem(user);
  }



  
}

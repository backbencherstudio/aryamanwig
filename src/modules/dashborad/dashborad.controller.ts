
import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common'; 
import { DashboradService } from './dashborad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from 'src/common/pagination';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ProductStatus } from '@prisma/client';


@Controller('dashborad')
export class DashboradController {
  constructor(private readonly dashboradService: DashboradService) {}

  /*================= Brought Item For User =====================*/
  
  @UseGuards(JwtAuthGuard)
  @Get('total-brought-item')
  totalBroughtItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.totalBroughtItem(user, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bought-pending-item')
  boughtPendingItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.boughtPendingItem(user, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bought-delivered-item')
  boughtDeliveredItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.boughtDeliveredItem(user, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bought-cancelled-item')
  boughtCancelledItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.boughtCancelledItem(user, paginationDto);
  }

  /*================= Selling Item For User =====================*/
  
  @UseGuards(JwtAuthGuard)
  @Get('total-selling-item')
  totalSellingItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.totalSellingItem(user, paginationDto);
  }
  
  @UseGuards(JwtAuthGuard)
  @Get('selling-pending-item')
  sellingPendingItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.sellingPendingItem(user, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('selling-delivered-item')
  sellingDeliveredItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.sellingDeliveredItem(user, paginationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('selling-cancelled-item')
  sellingCancelledItem(@Req() req: any, @Query() paginationDto: PaginationDto) {
    const user = req.user.userId;
    return this.dashboradService.sellingCancelledItem(user, paginationDto);
  }

  /*=================  Selling Item For User =====================*/
 
}


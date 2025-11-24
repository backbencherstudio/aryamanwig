import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { DashboradService } from './dashborad.service';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { PaginationDto } from 'src/common/pagination';

@Controller('admin/dashborad')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(Role.ADMIN)
export class DashboradController {

  constructor(private readonly dashboradService: DashboradService) {}


  // topic: User

  // *  View all new Request
  @Get('new-user-requests')
  getNewUserRequests(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.newUserRequests(paginationDto);
  }

  // * add approve user request
  @Patch('approve-user/:userId')
  async approveUser(@Param('userId') userId: string) {
    return this.dashboradService.approveUser(userId);
  }


  // * Reject user request
  @Post('reject-user/:userId')
  async rejectUser(@Param('userId') userId: string) {
    return this.dashboradService.rejectUser(userId);
  }
  

  // * Active users list for admin dashboard
  @Get('active-users-product')
  getActiveUsers(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.activeUsers(paginationDto);
  }

  
  // * Recent Orders for admin dashboard
  @Get('recent-orders')
  getRecentOrders(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.recentOrders(paginationDto);
  }


  // topic: product

  // * product upload requests for admin 
  @Get('product-upload-requests')
  getProductUploadRequests(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.productUploadRequests(paginationDto);
  }

  // * approve product upload request
  @Post('approve-product/:productId')
  async approveProduct(@Param('productId') productId: string) {
    return this.dashboradService.approveProduct(productId);
  }

  // * reject product upload request
  @Post('reject-product/:productId')
  async rejectProduct(@Param('productId') productId: string) {
    return this.dashboradService.rejectProduct(productId);
  }


  // topic: order

  // *recent completed orders
  @Get('recent-complete-orders')
  totalOrders(
    @Query() paginationDto: PaginationDto
  ) {
    return this.dashboradService.totalOrders(paginationDto);
  }

  // *recent pending orders
  @Get('recent-pending-orders')
  getPendingOrders(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.pendingOrders(paginationDto);
  }


  // *recent cancelled orders
  @Get('recent-cancelled-orders')
  getCancelledOrders(@Query() paginationDto: PaginationDto) {
    return this.dashboradService.cancelledOrders(paginationDto);
  }
  






  
}

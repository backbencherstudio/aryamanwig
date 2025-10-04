import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DashboradService } from './dashborad.service';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';

@Controller('dashborad')
export class DashboradController {

  constructor(private readonly dashboradService: DashboradService) {}


  // recently order
  // @Get('recent-order')
  // recentOrder() {
  //   return this.dashboradService.recentOrder();
  // }
 
  // // get only paid order
  // @Get('paid-order')
  // paidOrder() {
  //   return this.dashboradService.paidOrder();
  // }

  // // get only pending order
  // @Get('pending-order')
  // pendingOrder() {
  //   return this.dashboradService.pendingOrder();
  // }

  // // cancel order list
  // @Get('cancel-order')
  // cancelOrder() {
  //   return this.dashboradService.cancelOrder();
  // }
  
  // // product upload approve list request
  // @Get('product-upload-request')
  // productUploadRequest() {
  //   return this.dashboradService.productUploadRequest();
  // }


  
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { BoostService } from './boost.service';

import { PaginationDto } from 'src/common/pagination';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { BoostProductDto } from './dto/boost-product.dto';
import { BoostQueryDto } from './dto/boost-query.dto';

@Controller('boost')
export class BoostController {
  constructor(private readonly boostService: BoostService) {}

  // *Create Product Boost
  @UseGuards(JwtAuthGuard)
  @Post('create-boost')
  boost(@Body() boostProductDto: BoostProductDto, @Req() req: any) {
    const user = req.user.userId;
    return this.boostService.boost(boostProductDto, user);
  }

  // *Get Boosted Products by Status
  // *(Pending)
  // *(Active)
  // *(Expired)
 @UseGuards(JwtAuthGuard) // Ensure user is authenticated
  @Get('boosted-products-status')
  async getBoostedProductsByStatus(
    @Query() query: BoostQueryDto,
    @Req() req: any,
  ) {
    const { status, page, perPage } = query;
    const user = req.user.userId;
    return this.boostService.getBoostedProductsByStatus(status, page, perPage, user);
  }
}

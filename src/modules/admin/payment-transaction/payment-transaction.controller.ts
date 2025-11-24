import { Controller, Get, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Payment transaction')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/payment-transaction')
export class PaymentTransactionController {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  @Get('list')
  @ApiOperation({
    summary: 'Get all payment transactions with earning calculation',
  })
  async getAll() {
    return this.paymentTransactionService.getAllTransactions();
  }
}

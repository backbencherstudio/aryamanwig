import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DashboradService } from './dashborad.service';
import { CreateDashboradDto } from './dto/create-dashborad.dto';
import { UpdateDashboradDto } from './dto/update-dashborad.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';

@Controller('dashborad')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(Role.ADMIN)
export class DashboradController {

  constructor(private readonly dashboradService: DashboradService) {}

  // *  View all new Request
  @Get('new-requests')


  
}

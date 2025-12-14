import { IsEnum, IsOptional } from 'class-validator';
import { BoostStatus } from '@prisma/client';

export class BoostProductDto {
  @IsEnum(BoostStatus)
  @IsOptional() // Optional, as per your logic
  status: BoostStatus;
}

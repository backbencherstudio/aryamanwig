// src/common/dto/boost-query.dto.ts

import { IsIn, IsInt, IsOptional } from 'class-validator';

export class BoostQueryDto {
  @IsIn(['PENDING', 'ACTIVE', 'EXPIRED'])
  @IsOptional()
  status?: 'PENDING' | 'ACTIVE' | 'EXPIRED';

  @IsInt()
  @IsOptional()
  page: number = 1;

  @IsInt()
  @IsOptional()
  perPage: number = 10;
}

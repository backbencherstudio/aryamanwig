// src/products/dto/search-products.dto.ts

import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/pagination/dto/offset-pagination.dto';


export class SearchProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
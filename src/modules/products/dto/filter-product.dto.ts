import { IsOptional, IsNumber, IsArray, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer'; // Transform ইম্পোর্ট করুন

export class FilterProductDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  min_price?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  max_price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => { 
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim());
    }
    return value;
  })
  categories?: string[];
}
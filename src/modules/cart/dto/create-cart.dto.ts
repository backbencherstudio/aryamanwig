// Updated CreateCartDto
import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class CreateCartDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity: number = 1; 
}
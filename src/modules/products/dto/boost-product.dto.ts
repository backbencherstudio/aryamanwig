
import { IsString, IsInt, Min } from 'class-validator';

export class BoostProductDto {
    
  @IsString()
  product_id: string;

  @IsInt()
  @Min(1, { message: 'Days must be at least 1' })
  days: number;
}

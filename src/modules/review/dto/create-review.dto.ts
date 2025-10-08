
import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateReviewDto {


  @IsString()
  @IsNotEmpty({ message: 'Order ID Must be provided' })
  order_id: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNotEmpty({ message: 'Review receiver Must be provided' })
  @IsString()
  review_receiver: string; // receiver user id

  @IsOptional()
  status?: number;
}


import { IsInt, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';

export class CreateReviewDto {

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNotEmpty()
  @IsString()
  review_receiver: string; // receiver user id

  @IsOptional()
  status?: number;
}

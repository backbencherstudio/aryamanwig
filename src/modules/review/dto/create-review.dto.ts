import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsNotEmpty,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateReviewDto {
  @IsString()
  @IsNotEmpty({ message: "Order ID Must be provided" })
  order_id: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @Type(() => Number)
  status?: number;
}

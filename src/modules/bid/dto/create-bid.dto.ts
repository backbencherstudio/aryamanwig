
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateBidDto {

  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  bid_amount: number;
  
}

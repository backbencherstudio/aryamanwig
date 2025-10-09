import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateCartDto {
  @IsString()
  @IsNotEmpty()
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

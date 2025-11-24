// CreateOrderDto (Example Structure - Assuming shipping details remain)
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested, IsEmail } from 'class-validator';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  cartItemIds: string[]; 

 
  @IsString() @IsNotEmpty() shipping_name: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsString() @IsNotEmpty() shipping_country: string;
  @IsString() @IsNotEmpty() shipping_state: string;
  @IsString() @IsNotEmpty() shipping_city: string;
  @IsString() @IsNotEmpty() shipping_zip_code: string;
  @IsString() @IsNotEmpty() shipping_address: string;
}

import { IsNotEmpty, IsString, IsEmail } from 'class-validator';
export class CreateOrderDto {

  @IsNotEmpty()
  @IsString()
  shipping_name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  shipping_country: string;

  @IsNotEmpty()
  @IsString()
  shipping_state: string;

  @IsNotEmpty()
  @IsString()
  shipping_city: string;

  @IsNotEmpty()
  @IsString()
  shipping_zip_code: string;

  @IsNotEmpty()
  @IsString()
  shipping_address: string;
}

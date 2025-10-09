// import {
//   IsEmail,
//   IsNotEmpty,
//   IsString,
//   IsArray,
//   ValidateNested,
// } from 'class-validator';
// import { Type } from 'class-transformer';

// export class ShippingInfoDto {
//   @IsNotEmpty()
//   @IsString()
//   shipping_name: string;

//   @IsNotEmpty()
//   @IsEmail()
//   email: string;

//   @IsNotEmpty()
//   @IsString()
//   shipping_country: string;

//   @IsNotEmpty()
//   @IsString()
//   shipping_state: string;

//   @IsNotEmpty()
//   @IsString()
//   shipping_city: string;

//   @IsNotEmpty()
//   @IsString()
//   shipping_zip_code: string;

//   @IsNotEmpty()
//   @IsString()
//   shipping_address: string;
// }

// export class OrderProductDto {
//   @IsNotEmpty()
//   @IsString()
//   product_id: string;

//   @IsNotEmpty()
//   quantity: number;
// }

// export class CreateOrderDto {
//   //   @IsNotEmpty()
//   //   @IsString()
//   //   seller_id: string;

//   @IsNotEmpty()
//   @IsString()
//   seller_id: string;

//   @IsNotEmpty()
//   @ValidateNested()
//   @Type(() => ShippingInfoDto)
//   shipping_info: ShippingInfoDto;

//   @IsNotEmpty()
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => OrderProductDto)
//   order_products: OrderProductDto[];
// }

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

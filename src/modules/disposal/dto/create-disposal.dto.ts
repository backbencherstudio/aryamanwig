import {  DisposalType, ProductItemSize } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, ValidateIf } from "class-validator";

export class CreateDisposalDto {


  @IsString()
  productname: string;

  @IsString()
  producttype: string;

  @IsNumber()
  productquantity: number;

  @IsEnum(DisposalType)
  type: DisposalType;

    
  @IsOptional()
  @IsEnum(ProductItemSize) 
  product_item_size?: ProductItemSize;

 
  @ValidateIf((o) => o.type === 'PICKUP')  
  @IsString()
  place_name: string;

  @IsOptional()
  @IsString()
  place_address?: string;


  @IsOptional() 
  place_latitude?: number;

  @IsOptional()
  place_longitude?: number;


}  



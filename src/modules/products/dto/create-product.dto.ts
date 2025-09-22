import { IsString, IsOptional, IsInt, IsDecimal, IsArray, IsDate, IsEnum } from 'class-validator';


export enum Condition {
  NEW = 'NEW',
  OLD = 'OLD',
}

export class CreateProductDto {

  @IsString()
  product_title: string;

  @IsString()
  product_description: string;

  @IsInt()
  stock: number;

  @IsDecimal({ decimal_digits: '0,2', force_decimal: true })
  price: number;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsDate()
  time?: Date;


  @IsOptional()
  @IsEnum(Condition)
  condition?: Condition;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsString()
  user_id?: string;

  @IsString()
  category_id?: string;
}

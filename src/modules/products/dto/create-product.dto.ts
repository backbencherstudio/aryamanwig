import { IsString, IsOptional, IsInt, IsDecimal, IsArray, IsDate, IsEnum, IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';


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

  @IsNotEmpty()
  @IsNumber({maxDecimalPlaces:2}, {message: 'Stock must be number and can have maximum two decimal places'})
  @IsPositive()
  @Min(0, {message: 'Price must be a positive number'})
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
  category_id?: string;
}

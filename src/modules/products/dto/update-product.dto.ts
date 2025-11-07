import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProductDto extends PartialType(CreateProductDto) {

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => { 
    if (typeof value === 'string') {
        return value.split(',').map(item => item.trim());
    }
    return value;
    })
 images_to_delete?: string[];
  
}

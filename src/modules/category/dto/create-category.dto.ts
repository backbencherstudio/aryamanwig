import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateCategoryDto {
    
    @IsString()
    category_name: string;

    @IsString()
    category_description: string;

    @IsOptional()
    @IsInt()
    status?: number;

    @IsString()
    category_owner: string;

}

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';

@Controller('category')
export class CategoryController {

  constructor(private readonly categoryService: CategoryService) {}

  // Create a new category
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@Body() createCategoryDto: CreateCategoryDto, 
              @Req() req: any) {
    
  const user = req.user.userId;
  return await this.categoryService.create(createCategoryDto, user);
  }

  // Get all categories
  @Get('allCategories')
  findAll() {
  return this.categoryService.findAll();
  }

  // Get a category by ID
  @Get('singlecategory/:id')
  findOne(@Param('id') id: string) {
  return this.categoryService.findOne(id);
  }

  // Update a category
  @UseGuards(JwtAuthGuard)
  @Patch('updatebyid/:id')
  update(@Param('id') id: string, 
        @Body() updateCategoryDto: UpdateCategoryDto,
        @Req() req: any) {
  const user = req.user.userId;
  console.log('Updating category:', id, 'by user:', user);
  return this.categoryService.update(id, updateCategoryDto, user);
  }

  // Delete a category
  @UseGuards(JwtAuthGuard)
  @Delete('deletebyid/:id')
  Remove(@Param('id') id: string,
         @Req() req: any
  ) {
  const user = req.user.userId;
  return this.categoryService.remove(id,user);
  }

 
}

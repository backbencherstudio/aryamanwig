import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoryService {

  constructor(private prisma: PrismaService) {}

  // Create a new category
  async create(createCategoryDto: CreateCategoryDto, user: string) {

    const { category_name, category_description, status } = createCategoryDto;

      const existingCategory = await this.prisma.category.findUnique({
        where: { category_name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }

      const newCategory = await this.prisma.category.create({
        data: {
          category_name,
          category_description,
          status,
          category_owner: user,
        },
      });

      return {
        success: true,
        message: 'Category created successfully',
        data:{
          id: newCategory.id,
          category_name: newCategory.category_name,
          category_description: newCategory.category_description, 
        }
      };
  
  }

  // Get all categories
  async findAll() {

    const categories = await this.prisma.category.findMany();

    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories.map(category => ({
        category_id: category.id,
        category_name: category.category_name,
        category_description: category.category_description,
        status: category.status,
      })),
    };
  }

  
  // Get a category by ID
  async findOne(id: string) {

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Category retrieved successfully',
      data: {
        category_id: category.id,
        category_name: category.category_name,
        category_description: category.category_description,
        status: category.status,
      },
    };
  }

  // Update a category
  async update(id: string, updateCategoryDto: UpdateCategoryDto, user: string) {

    const { category_name, category_description, status } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    console.log('Category found:', category);

    if (category.category_owner !== user) {
      throw new ForbiddenException('You are not allowed to update this category');
    }

    if (category_name && category_name !== category.category_name) {

      const existingCategory = await this.prisma.category.findUnique({
        where: { category_name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      } 
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto
    });

    return{
      success: true,
      message: 'Category updated successfully',
      data: { 
        category_id: updatedCategory.id,
        category_name: updatedCategory.category_name,
        category_description: updatedCategory.category_description,
        status: updatedCategory.status,

      }
    }
  }

  // Delete a category
  async remove(id: string, user: string) {

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if the user is the owner of the category
    if (category.category_owner !== user) {
      throw new ForbiddenException('You are not allowed to delete this category');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Category deleted successfully',
      data: {
        category_id: category.id,
        category_name: category.category_name,
      },
    };
  }



  
}

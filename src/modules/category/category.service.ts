import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { StringHelper } from "src/common/helper/string.helper";
import { SojebStorage } from "src/common/lib/Disk/SojebStorage";
import appConfig from "src/config/app.config";
import { PaginationDto } from "src/common/pagination/dto/offset-pagination.dto";
import { paginateResponse } from "src/common/pagination/pagination.service";

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Create a new category
  async create(
    createCategoryDto: CreateCategoryDto,
    user: string,
    image?: Express.Multer.File,
  ) {
    const { category_name, category_description, status } = createCategoryDto;

    const existingCategory = await this.prisma.category.findUnique({
      where: { category_name },
    });

    if (existingCategory) {
      throw new ConflictException("Category with this name already exists");
    }

    // Handle photo upload if provided
    let photo: string | null = null;

    if (image) {
      const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;
      await SojebStorage.put(
        appConfig().storageUrl.category + "/" + fileName,
        image.buffer,
      );
      photo = fileName;
    }

    const newCategory = await this.prisma.category.create({
      data: {
        category_name,
        category_description,
        status,
        category_owner: user,
        photo,
      },
    });

    return {
      success: true,
      message: "Category created successfully",
      data: {
        id: newCategory.id,
        category_name: newCategory.category_name,
        category_description: newCategory.category_description,
        status: newCategory.status,
        photo: newCategory.photo
          ? SojebStorage.url(
              `${appConfig().storageUrl.category}/${newCategory.photo}`,
            )
          : null,
      },
    };
  }

  // Get all categories
  async findAll(paginationDto: PaginationDto) {
    const { page, perPage } = paginationDto;
    const skip = (page - 1) * perPage;

    const [total, categories] = await this.prisma.$transaction([
      this.prisma.category.count(),
      this.prisma.category.findMany({
        skip,
        take: perPage,
        orderBy: { created_at: "desc" },
      }),
    ]);

    const data = categories.map((category) => ({
      category_id: category.id,
      category_name: category.category_name,
      category_description: category.category_description,
      status: category.status,
      photo: category.photo
        ? SojebStorage.url(
            `${appConfig().storageUrl.category}/${category.photo}`,
          )
        : null,
    }));

    return {
      success: true,
      message: "Categories retrieved successfully",
      ...paginateResponse(data, total, page, perPage),
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
      message: "Category retrieved successfully",
      data: {
        category_id: category.id,
        category_name: category.category_name,
        category_description: category.category_description,
        photo: category.photo
          ? SojebStorage.url(
              `${appConfig().storageUrl.category}/${category.photo}`,
            )
          : null,
        status: category.status,
      },
    };
  }

  // Update a category
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    user: string,
    image?: Express.Multer.File,
  ) {
    const { category_name, category_description, status } = updateCategoryDto;

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // if (category.category_owner !== user) {
    //   throw new ForbiddenException('You are not allowed to update this category');
    // }

    if (category_name && category_name !== category.category_name) {
      const existingCategory = await this.prisma.category.findUnique({
        where: { category_name },
      });

      if (existingCategory) {
        throw new ConflictException("Category with this name already exists");
      }
    }

    // 📸 Handle photo upload if provided
    let photo = category.photo;

    if (image) {
      const fileName = `${StringHelper.randomString(8)}_${image.originalname}`;
      await SojebStorage.put(
        appConfig().storageUrl.category + "/" + fileName,
        image.buffer,
      );
      photo = fileName;
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        ...updateCategoryDto,
        photo,
      },
    });

    return {
      success: true,
      message: "Category updated successfully",
      data: {
        category_id: updatedCategory.id,
        category_name: updatedCategory.category_name,
        category_description: updatedCategory.category_description,
        status: updatedCategory.status,
        photo: updatedCategory.photo
          ? SojebStorage.url(
              `${appConfig().storageUrl.category}/${updatedCategory.photo}`,
            )
          : null,
      },
    };
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
      throw new ForbiddenException(
        "You are not allowed to delete this category",
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: "Category deleted successfully",
      data: {
        category_id: category.id,
        category_name: category.category_name,
      },
    };
  }

  // Get all categories for a user
  async getAllCategoriesForUser(user: string) {
    const categories = await this.prisma.category.findMany({
      where: { category_owner: user },
    });
    return {
      success: true,
      message: "User categories retrieved successfully",
      data: categories.map((category) => ({
        category_id: category.id,
        category_name: category.category_name,
        category_description: category.category_description,
        status: category.status,
        photo: category.photo
          ? SojebStorage.url(
              `${appConfig().storageUrl.category}/${category.photo}`,
            )
          : null,
      })),
    };
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Query,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guard/role/roles.guard";
import { Roles } from "src/common/guard/role/roles.decorator";
import { Role } from "src/common/guard/role/role.enum";
import { PaginationDto } from "src/common/pagination/dto/offset-pagination.dto";

@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Create a new category

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @Post("create")
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const user = req.user.userId;
    return await this.categoryService.create(createCategoryDto, user, file);
  }

  // Get all categories
  @Get("allCategories")
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoryService.findAll(paginationDto);
  }

  // Get a category by ID
  @Get("singlecategory/:id")
  findOne(@Param("id") id: string) {
    return this.categoryService.findOne(id);
  }

  // Update a category
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @Patch("updatebyid/:id")
  update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const user = req.user.userId;

    return this.categoryService.update(id, updateCategoryDto, user, file);
  }

  // Delete a category
  @UseGuards(JwtAuthGuard)
  @Delete("deletebyid/:id")
  Remove(@Param("id") id: string, @Req() req: any) {
    const user = req.user.userId;
    return this.categoryService.remove(id, user);
  }

  // Get all categories for a user
  @UseGuards(JwtAuthGuard)
  @Get("user-all-categories")
  getAllCategoriesForUser(@Req() req: any) {
    const user = req.user.userId;
    return this.categoryService.getAllCategoriesForUser(user);
  }
}

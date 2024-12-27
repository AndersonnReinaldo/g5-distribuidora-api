import { Controller, Get, Post, Param, Body, Put, UseGuards } from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { categorias } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<categorias[]> {
    return this.categoryService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<categorias> {
    return this.categoryService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<categorias, 'id' | 'createdAt' | 'updatedAt'>): Promise<categorias> {
    return this.categoryService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<categorias>): Promise<categorias> {
    return this.categoryService.update(+id, stock);
  }
}

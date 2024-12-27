import { Controller, Get, Post, Param, Body, Put, Delete, UseGuards } from '@nestjs/common';
import { ProductService } from '../services/product.service';
import { produtos } from '@prisma/client';
import { AuthGuard } from 'src/modules/auth/auth.guard';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(AuthGuard)
  @Get()
  findAll(): Promise<produtos[]> {
    return this.productService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: number): Promise<produtos> {
    return this.productService.findOne(+id);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Body() stock: Omit<produtos, 'id' | 'createdAt' | 'updatedAt'>): Promise<produtos> {
    return this.productService.create(stock);
  }
  
  @UseGuards(AuthGuard)
  @Put(':id')
  update(@Param('id') id: number, @Body() stock: Partial<produtos>): Promise<produtos> {
    return this.productService.update(+id, stock);
  }
}

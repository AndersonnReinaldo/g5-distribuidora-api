import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { categorias } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<categorias[]> {
    return this.prisma.categorias.findMany();
  }

  async findOne(id: number): Promise<categorias> {
    const categoria = await this.prisma.categorias.findUnique({ where: { id_categoria: id } });
    if (!categoria) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrado.`);
    }
    return categoria;
  }

  async create(data: Omit<categorias, 'id' | 'createdAt' | 'updatedAt'>): Promise<categorias> {
    return this.prisma.categorias.create({ data });
  }

  async update(id: number, data: Partial<categorias>): Promise<categorias> {
    const categoria = await this.prisma.categorias.findUnique({ where: { id_categoria: id } });

    if (!categoria) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrado.`);
    }

    return this.prisma.categorias.update({ where: { id_categoria: id }, data });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { produtos } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<produtos[]> {
    return this.prisma.produtos.findMany();
  }

  async findOne(id: number): Promise<produtos> {
    const produto = await this.prisma.produtos.findUnique({ where: { id_produto: id } });
    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }
    return produto;
  }

  async create(data: Omit<produtos, 'id' | 'createdAt' | 'updatedAt'>): Promise<produtos> {
    return this.prisma.produtos.create({ data });
  }

  async update(id: number, data: Partial<produtos>): Promise<produtos> {
    const produto = await this.prisma.produtos.findUnique({ where: { id_produto: id } });

    if (!produto) {
      throw new NotFoundException(`Produto com ID ${id} não encontrado.`);
    }

    return this.prisma.produtos.update({ where: { id_produto: id }, data });
  }
}

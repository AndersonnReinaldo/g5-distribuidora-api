import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { marca } from '@prisma/client';

@Injectable()
export class MarkService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<marca[]> {
    return this.prisma.marca.findMany();
  }

  async findOne(id: number): Promise<marca> {
    const marca = await this.prisma.marca.findUnique({ where: { id_marca: id } });
    if (!marca) {
      throw new NotFoundException(`Marca com ID ${id} não encontrado.`);
    }
    return marca;
  }

  async create(data: Omit<marca, 'id' | 'createdAt' | 'updatedAt'>): Promise<marca> {
    return this.prisma.marca.create({ data });
  }

  async update(id: number, data: Partial<marca>): Promise<marca> {
    const marca = await this.prisma.marca.findUnique({ where: { id_marca: id } });

    if (!marca) {
      throw new NotFoundException(`Marca com ID ${id} não encontrado.`);
    }

    return this.prisma.marca.update({ where: { id_marca: id }, data });
  }
}

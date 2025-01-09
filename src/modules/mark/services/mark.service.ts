import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { marcas } from '@prisma/client';

@Injectable()
export class MarkService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<marcas[]> {
    return this.prisma.marcas.findMany();
  }

  async findOne(id: number): Promise<marcas> {
    const marca = await this.prisma.marcas.findUnique({ where: { id_marca: id } });
    if (!marca) {
      throw new NotFoundException(`Marca com ID ${id} não encontrado.`);
    }
    return marca;
  }

  async create(data: Omit<marcas, 'id' | 'createdAt' | 'updatedAt'>): Promise<marcas> {
    return this.prisma.marcas.create({ data });
  }

  async update(id: number, data: Partial<marcas>): Promise<marcas> {
    const marca = await this.prisma.marcas.findUnique({ where: { id_marca: id } });

    if (!marca) {
      throw new NotFoundException(`Marca com ID ${id} não encontrado.`);
    }

    return this.prisma.marcas.update({ where: { id_marca: id }, data });
  }
}

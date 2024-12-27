import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { unidades_medida } from '@prisma/client';

@Injectable()
export class UnitService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<unidades_medida[]> {
    return this.prisma.unidades_medida.findMany();
  }

  async findOne(id: number): Promise<unidades_medida> {
    const unidadeDeMedida = await this.prisma.unidades_medida.findUnique({ where: { id_unidade_medida: id } });
    if (!unidadeDeMedida) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrado.`);
    }
    return unidadeDeMedida;
  }

  async create(data: Omit<unidades_medida, 'id' | 'createdAt' | 'updatedAt'>): Promise<unidades_medida> {
    return this.prisma.unidades_medida.create({ data });
  }

  async update(id: number, data: Partial<unidades_medida>): Promise<unidades_medida> {
    const unidadeDeMedida = await this.prisma.unidades_medida.findUnique({ where: { id_unidade_medida: id } });

    if (!unidadeDeMedida) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrado.`);
    }

    return this.prisma.unidades_medida.update({ where: { id_unidade_medida: id }, data });
  }
}

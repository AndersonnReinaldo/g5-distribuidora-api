import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { metodos_pagamento } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<metodos_pagamento[]> {
    return this.prisma.metodos_pagamento.findMany();
  }

  async findOne(id: number): Promise<metodos_pagamento> {
    const unidadeDeMedida = await this.prisma.metodos_pagamento.findUnique({ where: { id_metodo_pagamento: id } });
    if (!unidadeDeMedida) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrado.`);
    }
    return unidadeDeMedida;
  }

  async create(data: Omit<metodos_pagamento, 'id' | 'createdAt' | 'updatedAt'>): Promise<metodos_pagamento> {
    return this.prisma.metodos_pagamento.create({ data });
  }

  async update(id: number, data: Partial<metodos_pagamento>): Promise<metodos_pagamento> {
    const unidadeDeMedida = await this.prisma.metodos_pagamento.findUnique({ where: { id_metodo_pagamento: id } });

    if (!unidadeDeMedida) {
      throw new NotFoundException(`Unidade com ID ${id} não encontrado.`);
    }

    return this.prisma.metodos_pagamento.update({ where: { id_metodo_pagamento: id }, data });
  }
}

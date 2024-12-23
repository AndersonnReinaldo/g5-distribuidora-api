import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { estoque } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<estoque[]> {
    const estoque = await this.prisma.estoque.findMany({
      include:{
        produtos:{
          include:{
            categorias: true,
            marca:{
              select:{ descricao: true }
            }
          }
        }
      }
    });

    return estoque?.map((estoque) => {
      const { id_estoque,id_produto, quantidade,status,produtos:{ nome,image, categorias, marca  } } = estoque
      return {
        id_estoque,
        nome: nome,
        image,
        id_categoria: categorias?.id_categoria,
        categoria: categorias?.descricao,
        id_produto,
        quantidade,
        marca: marca?.descricao,
        status
      }
    })
  }

  async findOne(id: number): Promise<estoque> {
    const estoque = await this.prisma.estoque.findUnique({ where: { id_estoque: id } });
    if (!estoque) {
      throw new NotFoundException(`Estoque com ID ${id} não encontrado.`);
    }
    return estoque;
  }

  async create(data: Omit<estoque, 'id' | 'createdAt' | 'updatedAt'>): Promise<estoque> {
    const productExists = await this.prisma.produtos.findUnique({ where: { id_produto: data.id_produto } });

    if (!productExists) {
      throw new NotFoundException(`Produto ${data.id_produto} não encontrado.`);
    }

    const estoqueExists = await this.prisma.estoque.findFirst({ where: { id_produto: data.id_produto, status: 1 } });

    if (estoqueExists) {
      throw new NotFoundException(`Produto ${data.id_produto} já existe no estoque.`);
    }

    return this.prisma.estoque.create({ data });
  }

  async update(id: number, data: Partial<estoque>): Promise<estoque> {
    const estoque = await this.prisma.estoque.findUnique({ where: { id_estoque: id } });

    if (!estoque) {
      throw new NotFoundException(`Estoque com ID ${id} não encontrado.`);
    }

    return this.prisma.estoque.update({ where: { id_estoque: id }, data });
  }
}

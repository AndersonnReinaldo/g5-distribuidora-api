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
            },
            unidades_medida:{
              select:{ descricao: true }
            }
          }
        }
      }
    });

    return estoque?.map((estoque) => {
      const {
        id_estoque,
        id_produto,
        quantidade,
        status,
        produtos:{
           nome,
           image,
           categorias,
           marca,
           multiplo_vendas,
           valor_unitario,
           id_unidade_medida_multiplo,
           unidades_medida
        }
       } = estoque
       
      return {
        id_estoque,
        multiplo_vendas,
        valor_unitario,
        nome: nome,
        image,
        id_categoria: categorias?.id_categoria,
        categoria: categorias?.descricao,
        id_produto,
        quantidade,
        quantidadeMultiplo: quantidade < multiplo_vendas ? 0 : Math.round(quantidade / multiplo_vendas),
        unidade_medida: unidades_medida?.descricao,
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

  async movement(data: Partial<MovementData>) {
    
    if (!data?.quantidade) {
      throw new NotFoundException(`Quantidade nao informada.`);
    }

    const estoque = await this.prisma.estoque.findUnique({ where: { id_estoque: data?.id_estoque } });

    if (!estoque) {
      throw new NotFoundException(`Estoque com ID ${data?.id_estoque} não encontrado.`);  
    }

    if (data?.quantidade > estoque.quantidade && data?.tipo_movimento == 1) {
      throw new NotFoundException(`Quantidade nao disponivel para venda.`);
    }

    await this.prisma.estoque_movimentacoes.create({
      data: {
        id_estoque: data?.id_estoque,
        tipo_movimento: data?.tipo_movimento,
        valor_total: data?.valor_unitario * data?.quantidade,
        valor_unitario: data?.valor_unitario,
        id_usuario: data?.id_usuario,
        id_metodo_pagamento: data?.id_metodo_pagamento,
        quantidade: data?.quantidade  
      }
    });

    const quantidade = data?.tipo_movimento == 2 ? estoque.quantidade - data?.quantidade : estoque.quantidade + data?.quantidade

    return this.prisma.estoque.update({ where: { id_estoque: data?.id_estoque }, data: { quantidade } });
  }
}

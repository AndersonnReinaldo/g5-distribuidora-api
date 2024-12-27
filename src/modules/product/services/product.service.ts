import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { produtos } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<produtos[]> {
    const produtos = await this.prisma.produtos.findMany({
      include: { 
        marca: true,
        categorias: true,
        unidades_medida: true,
        estoque:{
          select:{
            quantidade: true
          }
        }
       },
    });

    return produtos?.map((produto) => {
      return {
        ...produto,
        quantidade: produto.estoque[0]?.quantidade,
        quantidadeMultiplo: produto.estoque[0]?.quantidade < produto.multiplo_vendas ? 0 : Math.round(produto.estoque[0]?.quantidade / produto.multiplo_vendas),
        marca: produto.marca.descricao,
        categoria: produto.categorias?.descricao,
        unidade_medida: produto.unidades_medida?.descricao,
        id_marca: produto?.id_marca,
        id_unidade_medida_multiplo: produto?.id_unidade_medida_multiplo
      }
    })
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

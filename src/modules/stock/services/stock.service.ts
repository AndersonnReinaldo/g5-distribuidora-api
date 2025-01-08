import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { estoque } from '@prisma/client';
import * as moment from 'moment-timezone'


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
           codigo,
           categorias,
           marca,
           multiplo_vendas,
           valor_unitario,
           unidades_medida
        }
       } = estoque
       
      return {
        id_estoque,
        multiplo_vendas,
        valor_unitario,
        nome,
        codigo,
        image,
        id_categoria: categorias?.id_categoria,
        categoria: categorias?.descricao,
        id_produto,
        quantidade,
        quantidadeMultiplo: quantidade < multiplo_vendas ? 0 : Math.floor(quantidade / multiplo_vendas),
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
    let estoque: any;

    if (!data?.quantidade) {
      throw new NotFoundException(`Quantidade nao informada.`);
    }

    estoque = await this.prisma.estoque.findFirst({ 
        include:{
          produtos:{
            select:{
              valor_unitario:true
            }
          }
        },
      where: { 
          id_produto: data?.id_produto,
          status: 1
        } 
    });

    const valor_unitario = data?.valor_unitario ? data?.valor_unitario : estoque?.produtos?.valor_unitario

    if(!valor_unitario){
      throw new NotFoundException(`Valor unitario nao informado.`);
    }

    if (!estoque) {
      const { id_estoque } = await this.prisma.estoque.create({ data:{
        id_produto: data?.id_produto,
        quantidade: data?.quantidade
       } });

       estoque = await this.prisma.estoque.findFirst({ 
        include:{
          produtos:{
            select:{
              valor_unitario:true
            }
          }
        },
        where: { 
          id_estoque,
          status: 1
        }
      });

      if (data?.quantidade > estoque.quantidade && data?.tipo_movimento == 2) {
        throw new NotFoundException(`Quantidade nao disponivel para venda. Estoque: ${estoque?.quantidade}`);
      }

      await this.prisma.estoque_movimentacoes.create({
        data: {
          id_estoque: estoque?.id_estoque,
          tipo_movimento: data?.tipo_movimento,
          valor_total: valor_unitario * data?.quantidade,
          valor_unitario: valor_unitario,
          id_usuario: data?.id_usuario,
          id_metodo_pagamento: data?.id_metodo_pagamento,
          quantidade: data?.quantidade  
        }
      });

      return estoque;

    }else {
    if (data?.quantidade > estoque.quantidade && data?.tipo_movimento == 2) {
      throw new NotFoundException(`Quantidade nao disponivel para venda. Estoque: ${estoque?.quantidade}`);
    }

    await this.prisma.estoque_movimentacoes.create({
      data: {
        id_estoque: estoque?.id_estoque,
        tipo_movimento: data?.tipo_movimento,
        valor_total: valor_unitario * data?.quantidade,
        valor_unitario: valor_unitario,
        id_usuario: data?.id_usuario,
        id_metodo_pagamento: data?.id_metodo_pagamento,
        quantidade: data?.quantidade  
      }
    });

    const quantidade = data?.tipo_movimento == 2 ? estoque.quantidade - data?.quantidade : estoque.quantidade + data?.quantidade

    return this.prisma.estoque.update({ where: { id_estoque: estoque?.id_estoque }, data: { quantidade } });
    }
  }

  async listAllMovementsById(id: number) {
    const estoque = await this.prisma.estoque_movimentacoes.findMany({
      orderBy:{
        id_estoque_movimentacao: 'desc'
      },
      include:{
        estoque:{
          select:{
            produtos: {
              select: {
                nome: true,
                valor_unitario: true,
                multiplo_vendas:true
              }
            }
          }   
        },
        metodos_pagamento:{
          select: {
            descricao: true
          }
        },
        usuarios:{
          select:{
            nome: true
          }
        }
      },
      where: { id_estoque: id } 
    }
  );

    return estoque?.map((estoque) => {
      const {id_estoque_movimentacao, datahora, valor_total, valor_unitario, quantidade, metodos_pagamento, usuarios,estoque:{ produtos }} = estoque
        return {
          id_estoque_movimentacao,
          quantidade,
          valor_unitario_padrao: produtos?.valor_unitario,
          valor_unitario_venda:valor_unitario,
          valor_total,
          tipo_movimento: estoque?.tipo_movimento == 1 ? 'Entrada' : 'Saida',
          datahoraFormat:  moment(datahora).tz('America/Fortaleza').format("DD/MM/YYYY [às] HH:mm:ss"),
          datahora,
          metodo_pagamento: metodos_pagamento?.descricao,
          responsavel: usuarios?.nome,
          produto: produtos?.nome,
          quantidadeMultiplo: quantidade < produtos?.multiplo_vendas ? 0 : Math.floor(quantidade / produtos?.multiplo_vendas),
        }
    });
  }
}

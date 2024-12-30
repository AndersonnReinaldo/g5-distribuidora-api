import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { caixas_dia } from '@prisma/client';
import { StockService } from 'src/modules/stock/services/stock.service';
import { PrinterService } from 'src/services/printer.service';

@Injectable()
export class CashflowService {
  constructor(
    private prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly printerService: PrinterService
  ) {}

  async findAll(): Promise<caixas_dia[]> {
    return this.prisma.caixas_dia.findMany();
  }

  async findOne(id: number): Promise<caixas_dia> {
    const caixas_dia = await this.prisma.caixas_dia.findUnique({ where: { id_caixa_dia: id } });
    if (!caixas_dia) {
      throw new NotFoundException(`Caixa com ID ${id} não encontrado.`);
    }
    return caixas_dia;
  }

  async create(data: Omit<caixas_dia, 'id' | 'createdAt' | 'updatedAt'>): Promise<caixas_dia> {
    return this.prisma.caixas_dia.create({ data });
  }

  async update(id: number, data: Partial<caixas_dia>): Promise<caixas_dia> {
    const caixas_dia = await this.prisma.caixas_dia.findUnique({ where: { id_caixa_dia: id } });

    if (!caixas_dia) {
      throw new NotFoundException(`Caixa com ID ${id} não encontrado.`);
    }

    return this.prisma.caixas_dia.update({ where: { id_caixa_dia: id }, data });
  }

  async makeSale(data: CheckoutAttributes): Promise<any> {

    if(!data || !data.id_caixa_dia || !data.id_usuario || !data.products?.length) {
      throw new NotFoundException(`Dados nao informados.`);
    }

    const findCashflow = await this.prisma.caixas_dia.findUnique({ where: { id_caixa_dia: data?.id_caixa_dia, id_usuario: data?.id_usuario } })

    if(!findCashflow) {
      throw new NotFoundException(`Caixa nao encontrado.`);
    }

    await this.prisma.caixas_dia.update({
      where: { id_caixa_dia: data?.id_caixa_dia },
      data: {
        valor_total: findCashflow?.valor_total + data?.valor_total
      }
    })

    const transacao = await this.prisma.transacoes.create({
      data: {
        id_caixa_dia: data?.id_caixa_dia,
        id_metodo_pagamento: data?.id_metodo_pagamento,
        id_usuario: data?.id_usuario,
        valor_total: data?.valor_total
      }
    })

    for (const product of data?.products) {
      const estoque = await this.stockService.movement({
        id_produto: product?.id_produto,
        quantidade: product?.quantidade,
        id_metodo_pagamento: data?.id_metodo_pagamento,
        id_usuario: data?.id_usuario,
        tipo_movimento: 2,
        valor_unitario: product?.valor_unitario
      })

      await this.prisma.itens_transacao.create({
        data: {
          id_transacao: transacao?.id_transacao,
          id_produto: product?.id_produto,
          id_estoque: estoque?.id_estoque,
          quantidade: product?.quantidade,
          valor_unitario: product?.valor_unitario
        }
      })
    }

    const itensPrint = data?.products?.map((item) => {
      return {
        name: item?.nome,
        quantity: item?.quantidade,
        price: item?.valor_unitario,
        total: item?.quantidade * item?.valor_unitario
      }
    })

    this.printerService.printReceipt({
      address:"Beberibe - CE",
      cnpj:"00.000.000/0000-00",
      name:"G5 Distribuidora",
    }, itensPrint,'Dinheiro')

    return findCashflow;
  }
}

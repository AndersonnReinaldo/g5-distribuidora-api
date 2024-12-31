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

  async findBoxActiveByUser(id: number): Promise<caixas_dia> {
    const caixas_dia = await this.prisma.caixas_dia.findFirst({ where: { id_usuario: id, status: 1 } });

    if (!caixas_dia) {
      throw new NotFoundException(`Caixa não encontrado para este usuário.`);
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
    if (!data || !data.id_caixa_dia || !data.id_usuario || !data.products?.length) {
      throw new NotFoundException(`Dados não informados.`);
    }
  
    const findCashflow = await this.prisma.caixas_dia.findUnique({
      where: { id_caixa_dia: data.id_caixa_dia, id_usuario: data.id_usuario,status:1 }
    });
  
    if (!findCashflow) {
      throw new NotFoundException(`Não existe um caixa aberto para este usuário.`);
    }
  
    const caixaAbertoOntem = findCashflow.data_hora_abertura.toISOString().slice(0, 10) !== new Date().toISOString().slice(0, 10);
  
    if (caixaAbertoOntem && findCashflow.status === 1) {
      throw new NotFoundException(`Feche o caixa do dia anterior primeiro.`);
    }
  
    try {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.caixas_dia.update({
          where: { id_caixa_dia: data.id_caixa_dia },
          data: {
            valor_total: findCashflow.valor_total + data.valor_total
          }
        });
  
        const transacao = await prisma.transacoes.create({
          data: {
            id_caixa_dia: data.id_caixa_dia,
            id_metodo_pagamento: data.id_metodo_pagamento,
            id_usuario: data.id_usuario,
            valor_total: data.valor_total
          }
        });
  
        for (const product of data.products) {
          const estoque = await this.stockService.movement({
            id_produto: product.id_produto,
            quantidade: product.quantidade,
            id_metodo_pagamento: data.id_metodo_pagamento,
            id_usuario: data.id_usuario,
            tipo_movimento: 2,
            valor_unitario: product.valor_unitario
          });
  
          await prisma.itens_transacao.create({
            data: {
              id_transacao: transacao.id_transacao,
              id_produto: product.id_produto,
              id_estoque: estoque.id_estoque,
              quantidade: product.quantidade,
              valor_unitario: product.valor_unitario
            }
          });
        }
      });
  
      const itensPrint = data.products.map((item) => ({
        name: item.nome,
        quantity: item.quantidade,
        price: item.valor_unitario,
        total: item.quantidade * item.valor_unitario
      }));
  
      this.printerService.printReceipt(
        {
          address: "Beberibe - CE",
          cnpj: "00.000.000/0000-00",
          name: "G5 Distribuidora"
        },
        itensPrint,
        'Dinheiro'
      );
  
      return findCashflow;
    } catch (error) {
      throw new Error(`Erro ao processar a venda: ${error.message}`);
    }
  }

  async closeBox( id_usuario: number ) {
    const findCashflow = await this.prisma.caixas_dia.findFirst({
      where: { id_usuario, status: 1 }
    });

    if (!findCashflow) {
      throw new NotFoundException(`Caixa não encontrado.`);
    }

    await this.prisma.caixas_dia.update({
      where: { id_caixa_dia: findCashflow?.id_caixa_dia },
      data: {
        status: 2,
        data_hora_fechamento: new Date()
      }
    });

    return {
      id_caixa_dia: findCashflow.id_caixa_dia,
      data_hora_abertura: findCashflow.data_hora_abertura,
      data_hora_fechamento: findCashflow.data_hora_fechamento,
      message: "Caixa fechado com sucesso."
    };
  }

  async openBox(id_usuario: number) {
    const today = new Date().toISOString().slice(0, 10);
    const cashflowToday = await this.prisma.caixas_dia.findFirst({
      where: {
        id_usuario,
        data_hora_abertura: {
          gte: new Date(`${today}T00:00:00`),
          lte: new Date(`${today}T23:59:59`)
        }
      }
    });
  
    if (cashflowToday) {
      throw new NotFoundException("Já existe um caixa para hoje para este usuário.");
    }
  
    const newCashflow = await this.prisma.caixas_dia.create({
      data: {
        id_usuario,
        status: 1,
        valor_total: 0
      }
    });
  
    return {
      id_caixa_dia: newCashflow.id_caixa_dia,
      data_hora_abertura: newCashflow.data_hora_abertura,
      status: newCashflow.status,
      message: "Caixa aberto com sucesso."
    };
  }
  
}

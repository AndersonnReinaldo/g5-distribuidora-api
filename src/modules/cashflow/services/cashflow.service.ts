import { formatToBRL } from 'src/utils/string';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { caixas_dia, transacoes } from '@prisma/client';
import { StockService } from 'src/modules/stock/services/stock.service';
import { PrinterService } from 'src/services/printer.service';
import { currentDate } from 'src/utils/date';

@Injectable()
export class CashflowService {
  constructor(
    private prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly printerService: PrinterService
  ) {}

  async generateDailyCashSummary(id_caixa_dia: number) {
    const caixaDia = await this.prisma.caixas_dia.findUnique({ where: { id_caixa_dia } });
  
    if (!caixaDia) {
      throw new NotFoundException(`Caixa com ID ${id_caixa_dia} não encontrado.`);
    }
  
    const transacoes = await this.prisma.transacoes.findMany({
      where: { id_caixa_dia },
      include: {
        itens_transacao: {
          include: {
            produtos: true
          },
          where: {
            status: 1
          }
        }
      }
    });
  
    const totais = {
      totalRecebido: transacoes.reduce((sum, transacao) => sum + transacao.valor_total, 0),
      totalPago: transacoes.reduce((sum, transacao) => sum + transacao.valor_pago, 0),
      totalPagoSecundario: transacoes.reduce((sum, transacao) => sum + transacao.valor_pago_secundario, 0),
      totalMisto: transacoes.reduce((sum, transacao) => sum + transacao.pagamento_misto, 0)
    };
  
    const transacoesFormatadas = transacoes.map((transacao) => ({
      id: transacao.id_transacao,
      usuarioId: transacao.id_usuario,
      clienteId: transacao.id_cliente,
      caixaId: transacao.id_caixa_dia,
      metodoPagamento: {
        primarioId: transacao.id_metodo_pagamento,
        secundarioId: transacao.id_metodo_pagamento_secundario,
        pagamentoMisto: Boolean(transacao.pagamento_misto)
      },
      data: transacao.data_transacao,
      valores: {
        total: transacao.valor_total,
        pago: transacao.valor_pago,
        pagoSecundario: transacao.valor_pago_secundario
      },
      status: transacao.status === 1 ? "Pago" : "Pendente",
      itens: transacao.itens_transacao.map((item) => ({
        id: item.id_item_transacao,
        quantidade: item.quantidade,
        valorUnitario: item.valor_unitario,
        desconto: item.desconto,
        status: item.status === 1 ? "Ativo" : "Inativo",
        produto: {
          id: item.produtos.id_produto,
          nome: item.produtos.nome,
          categoriaId: item.produtos.id_categoria,
          marcaId: item.produtos.id_marca,
          unidadeMedidaId: item.produtos.id_unidade_medida_multiplo,
          multiploVendas: item.produtos.multiplo_vendas,
          valorUnitario: item.produtos.valor_unitario,
          imagem: item.produtos.image,
          status: item.produtos.status === 1 ? "Disponível" : "Indisponível"
        }
      }))
    }));
  
    return {
      caixaDia: {
        id: id_caixa_dia,
        totais,
        transacoes: transacoesFormatadas
      }
    };
  }

  async generateAllCashSummaries() {
    const caixas = await this.prisma.caixas_dia.findMany({
      include: {
        usuarios: true
      }
    });
  
    if (!caixas || caixas.length === 0) {
      throw new NotFoundException('Nenhum caixa encontrado.');
    }
  
    const caixasComTransacoes = await Promise.all(
      caixas.map(async (caixa) => {
        const transacoes = await this.prisma.transacoes.findMany({
          where: { id_caixa_dia: caixa.id_caixa_dia },
          include: {
            usuarios: true,
            itens_transacao: {
              include: {
                produtos: true,
              }
            },
          },
        });
  
        const totais = {
          totalCaixa: caixa?.valor_total,
          totalCancelado: transacoes.filter((transacao) => transacao.status === 2).reduce((sum, transacao) => sum + transacao.valor_total, 0),
          totalSangria: caixa?.valor_sangria,
          totalItems: transacoes.reduce((sum, transacao) => {
            const quantidadeItens = transacao.itens_transacao?.reduce((innerSum, item) => innerSum + item.quantidade, 0) || 0;
            return sum + quantidadeItens;
          }, 0),
        };

          const findMethodsPayment = await this.prisma.metodos_pagamento.findMany();


        const methodsPayment = findMethodsPayment.reduce((acc, method) => {
          acc[method.id_metodo_pagamento] = method.descricao;
          return acc;
        }, {});
    
        if (!findMethodsPayment) {      
          throw new NotFoundException(`Metodos de pagamentos não encontrado.`);
        }

        const usuarios = await this.prisma.usuarios.findMany();
          
        
        const transacoesFormatadas = transacoes.map((transacao) => ({
          id: transacao.id_transacao,
          usuarioId: transacao.id_usuario,
          clienteId: transacao.id_cliente,
          caixaId: transacao.id_caixa_dia,
          responsavel: transacao.usuarios?.nome || 'N/A',
          responsavelCancelamento: usuarios.find((user) => user.id_usuario === transacao.id_usuario_cancelamento)?.nome || 'N/A',
          valorTotal: transacao.valor_total,
          nome_avulso: transacao.nome_avulso,
          observacao: transacao.observacao,
          pagamento: {
            primarioId: transacao.id_metodo_pagamento,
            secundarioId: transacao.id_metodo_pagamento_secundario,
            pagamentoMisto: Boolean(transacao.pagamento_misto),
            pagamentoText: `
            ${formatToBRL(transacao?.valor_pago)} foi pago com ${methodsPayment[transacao.id_metodo_pagamento]?.toLowerCase()}.${transacao.pagamento_misto ? `\nO restante, ${formatToBRL(transacao?.valor_pago_secundario)}, foi pago com ${methodsPayment[transacao.id_metodo_pagamento_secundario]?.toLowerCase()}.` : ''}
            `.trim()

          },
          data: transacao.data_transacao,
          dataCancelamento: transacao.data_cancelamento,
          valores: {
            total: transacao.valor_total,
            pago: transacao.valor_pago,
            pagoSecundario: transacao.valor_pago_secundario,

              },
          status: transacao.status,
          itens: transacao.itens_transacao.map((item) => ({
            id: item.id_item_transacao,
            quantidade: item.quantidade,
            valorUnitario: item.valor_unitario,
            desconto: item.desconto,
            status: item.status,
            produto: {
              id: item.produtos.id_produto,
              nome: item.produtos.nome,
              categoriaId: item.produtos.id_categoria,
              marcaId: item.produtos.id_marca,
              unidadeMedidaId: item.produtos.id_unidade_medida_multiplo,
              multiploVendas: item.produtos.multiplo_vendas,
              valorUnitario: item.produtos.valor_unitario,
              imagem: item.produtos.image,
              status: item.produtos.status,
            },
          })),
        }));
  
        return {
            id: caixa.id_caixa_dia,
            responsavel: `${caixa.usuarios?.nome}`,
            data_hora_abertura: caixa.data_hora_abertura,
            data_hora_fechamento: caixa.data_hora_fechamento,
            status: caixa.status === 1 ? 'Caixa Aberto' : 'Caixa Fechado',
            totais,
            transacoes: transacoesFormatadas,
        };
      }),
    );
  
    return caixasComTransacoes;;
  }
  
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
    

    let transacao;
    try {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.caixas_dia.update({
          where: { id_caixa_dia: data.id_caixa_dia },
          data: {
            valor_total: findCashflow.valor_total + data.valor_total
          }
        });
  
        transacao = await prisma.transacoes.create({
          data: {
            id_caixa_dia: data.id_caixa_dia,
            id_metodo_pagamento: data.id_metodo_pagamento,
            id_metodo_pagamento_secundario: data?.id_metodo_pagamento_secundario,
            id_usuario: data.id_usuario,
            valor_total: data.valor_total,
            valor_pago: data.valor_pago,
            valor_pago_secundario: data?.valor_pago_secundario,
            pagamento_misto: data?.pagamento_misto,
            observacao: data?.observacao,
            nome_avulso: data?.nome_avulso
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
  
      return transacao;

    } catch (error) {
      throw new Error(`Erro ao processar a venda: ${error.message}`);
    }
  }

  async cancelSale(transactionId: number, userId: number): Promise<any> {
    if (!transactionId || !userId) {
      throw new NotFoundException(`Dados não informados.`);
    }
  
    const transaction = await this.prisma.transacoes.findUnique({
      where: { id_transacao: transactionId },
      include: {
        itens_transacao: true,
      },
    });
  
    if (!transaction || transaction.id_usuario !== userId) {
      throw new NotFoundException(`Transação não encontrada ou usuário inválido.`);
    }
  
    const cashflow = await this.prisma.caixas_dia.findUnique({
      where: { id_caixa_dia: transaction.id_caixa_dia, id_usuario: userId, status: 1 },
    });
  
    if (!cashflow) {
      throw new NotFoundException(`Não existe um caixa aberto para este usuário.`);
    }
  
    let reversedTransaction;
    try {
      await this.prisma.$transaction(async (prisma) => {
        await prisma.caixas_dia.update({
          where: { id_caixa_dia: transaction.id_caixa_dia },
          data: {
            valor_total: cashflow.valor_total - transaction.valor_total,
          },
        });
  
        for (const item of transaction.itens_transacao) {
          await this.stockService.movement({
            id_produto: item.id_produto,
            quantidade: item.quantidade,
            id_metodo_pagamento: transaction.id_metodo_pagamento,
            id_usuario: userId,
            tipo_movimento: 1,
            valor_unitario: item.valor_unitario,
          });
        }
  
        await prisma.itens_transacao.updateMany({
          where: { id_transacao: transaction.id_transacao },
          data: {
            status: 2
          }
        });
  
        reversedTransaction = await prisma.transacoes.update({
          where: { id_transacao: transaction.id_transacao },
          data: {
            id_usuario_cancelamento: userId,
            data_cancelamento: new Date(),
            status: 2
          }
        });
      });
  
      return reversedTransaction;
    } catch (error) {
      throw new Error(`Erro ao reverter a venda: ${error.message}`);
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
  
    if (cashflowToday && cashflowToday.status === 2) {
      throw new NotFoundException("O caixa para hoje já foi fechado, consulte a administração.");
    }else if(cashflowToday && cashflowToday.status === 1){
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

  async checkBoxDay(id_usuario: number): Promise<caixas_dia> {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().slice(0, 10);
  
    // Verifica se há um caixa aberto de ontem ainda
    const openCashflowYesterday = await this.prisma.caixas_dia.findFirst({
      where: {
        id_usuario,
        status: 1, // Status 1 significa "aberto"
        data_hora_abertura: {
          gte: new Date(`${yesterdayISO}T00:00:00`),
          lte: new Date(`${yesterdayISO}T23:59:59`),
        },
      },
    });
  
    if (openCashflowYesterday) {
      throw new ConflictException({
        message: "Você deve fechar o caixa do dia anterior antes de abrir o caixa de hoje.",
        typeConflict: 1
      });
    }
  
    // Verifica se há um caixa aberto hoje
    const openCashflowToday = await this.prisma.caixas_dia.findFirst({
      where: {
        id_usuario,
        data_hora_abertura: {
          gte: new Date(`${today}T00:00:00`),
          lte: new Date(`${today}T23:59:59`),
        },
        status: 1, // Status 1 significa "aberto"
      },
    });
  
    if (openCashflowToday) {
      return openCashflowToday;
    }
  
    // Verifica se o caixa de hoje foi fechado
    const closedCashflowToday = await this.prisma.caixas_dia.findFirst({
      where: {
        id_usuario,
        data_hora_abertura: {
          gte: new Date(`${today}T00:00:00`),
          lte: new Date(`${today}T23:59:59`),
        },
        status: 2, // Status 2 significa "fechado"
      },
    });
  
    if (closedCashflowToday) {
      throw new ConflictException({
        message: "O caixa de hoje foi fechado!",
        typeConflict: 2
      });
    }
  
    // Caso nenhum caixa esteja aberto hoje e nenhum caixa esteja aberto de ontem
    const cashflowToday = await this.prisma.caixas_dia.findFirst({
      where: {
        id_usuario,
        data_hora_abertura: {
          gte: new Date(`${today}T00:00:00`),
          lte: new Date(`${today}T23:59:59`),
        },
      },
    });
  
    if (!cashflowToday) {
      throw new NotFoundException("Não existe um caixa para hoje para este usuário.");
    }
  
    return cashflowToday;
  }
  
  async printInvoice(id_transacao: number, print: boolean): Promise<any> {
    const transacao = await this.prisma.transacoes.findUnique({
      where: { id_transacao },
      include: {
        caixas_dia: true,
        itens_transacao: {
          include: {
            produtos: {
              include: {
                unidades_medida: true,
                categorias: true,
              },
            }
          }
        }
      }
    })

    if (!transacao) {
      throw new NotFoundException(`Transacao com ID ${id_transacao} não encontrada.`);
    }

    const itensPrint = transacao.itens_transacao.map((item) => ({
      name: item.produtos.nome,
      quantity: item.quantidade,
      totalQuantityPack: Math.floor(item.quantidade / item.produtos.multiplo_vendas),
      totalRestUnit: item.quantidade % item.produtos.multiplo_vendas,
      price: item.valor_unitario * item.quantidade,
      total: item.quantidade * item.valor_unitario,
      nameUnit: item.produtos.unidades_medida.descricao,
      unitPrice: item.valor_unitario
    }));

    const findMethodsPayment = await this.prisma.metodos_pagamento.findMany();
  
    const methodsPayment = findMethodsPayment.reduce((acc, method) => {
      acc[method.id_metodo_pagamento] = method.descricao;
      return acc;
    }, {});

    if (!findMethodsPayment) {      
      throw new NotFoundException(`Metodos de pagamentos não encontrado.`);
    }
      
    const textPayment = `
    ${formatToBRL(transacao?.valor_pago)} foi pago com ${methodsPayment[transacao.id_metodo_pagamento]?.toLowerCase()}.${transacao.pagamento_misto ? `\nO restante, ${formatToBRL(transacao?.valor_pago_secundario)}, foi pago com ${methodsPayment[transacao.id_metodo_pagamento_secundario]?.toLowerCase()}.` : ''}
    `.trim();


    if(print) {
      const printFlash = await this.printerService.generateReceiptSale(transacao.caixas_dia.id_usuario,itensPrint,textPayment,transacao?.nome_avulso,transacao?.observacao,!!print);

      if(!printFlash.status){
        return {
          status: printFlash.status,
          message: printFlash.text
        }
      }else{
        return {
          status: printFlash.status,
          message: printFlash.text
        }
      }
    
    }else{
      return await this.printerService.generateReceiptSale(transacao.caixas_dia.id_usuario,itensPrint,textPayment,transacao?.nome_avulso,transacao?.observacao,!!print);
    }

  }

  async printFlashResume(id_caixa_dia: number, print: boolean): Promise<any> {
    const caixa = await this.prisma.caixas_dia.findUnique({ where: { id_caixa_dia } });
  
    if (!caixa) {
      throw new NotFoundException(`Caixa com ID ${id_caixa_dia} não encontrado.`);
    }
  
    const transacoes = await this.prisma.transacoes.findMany({
      where: { id_caixa_dia },
      include: {
        itens_transacao: {
          include: {
            produtos: {
              include: {
                unidades_medida: true,
                categorias: true,
              },
            },
          },
        },
      },
    });
  
    const saledProducts = transacoes
    .filter((transacao) => transacao.status === 1)
    .flatMap((transacao) =>
      transacao.itens_transacao.map((item) => {
        const { quantidade, produtos } = item;
        const { multiplo_vendas } = produtos;
  
        return {
          name: produtos.nome,
          quantity: quantidade,
          name_unit: produtos.unidades_medida.descricao,
          price: item.valor_unitario,
          multiplo_vendas: multiplo_vendas,
          total: quantidade * item.valor_unitario
        };
      })
    );
  
    const sales = transacoes.filter((transacao) => transacao.status === 1)?.length || 0;
    const canceledSales = transacoes.filter((transacao) => transacao.status === 2)?.length || 0;
  
    const canceledSalesProducts = transacoes
    .filter((transacao) => transacao.status === 2)
    .flatMap((transacao) =>
      transacao.itens_transacao.map((item) => {
        const { quantidade, produtos } = item;
        const { multiplo_vendas } = produtos;
  
        return {
          name: produtos.nome,
          quantity: quantidade,
          name_unit: produtos.unidades_medida.descricao,
          price: item.valor_unitario,
          multiplo_vendas: multiplo_vendas,
          total: quantidade * item.valor_unitario
        };
      })
      );

      if(print) {
        const printRecipt = await this.printerService.generateFlash(
          id_caixa_dia,
          caixa?.id_usuario,
          sales,
          canceledSales,
          saledProducts,
          canceledSalesProducts,
          !!print
        );

        if(!printRecipt.status){
          return {
            status: printRecipt.status,
            message: printRecipt.text
          }
        }else{
          return {
            status: printRecipt.status,
            message: printRecipt.text
          }
        }
      
      }else{
        return await this.printerService.generateFlash(
          id_caixa_dia,
          caixa?.id_usuario,
          sales,
          canceledSales,
          saledProducts,
          canceledSalesProducts,
          !!print
        );
      }
  }
  
  
}

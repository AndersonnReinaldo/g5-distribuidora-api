import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import iconv from 'iconv-lite';
import { PDFDocument, rgb, StandardFonts, utf8Encode } from 'pdf-lib';
import { formatToBRL } from 'src/utils/string';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SerialPort } from 'serialport'
import utf8 from 'utf8';

interface ItemSale { name: string; multiplo_vendas: number; quantity: number; name_unit:string; 
   price: number }

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(private readonly prisma: PrismaService) { }

  private async generatePDFlashSummaryPDF(
    id_caixa_dia: number,
    userId: number,
    sales: number,
    canceledSales: number,
    items: ItemSale[],
    items_canceled: ItemSale[],
  ): Promise<{ text: string[]; company: any }> {
    const totalSold = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCanceled = items_canceled.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
    const productSummarySaled: {
      name: string;
      totalQuantity: number;
      totalQuantityPack?: number;
      totalPrice: number;
      nameUnit: string;
      multiploVendas: number;
      totalRestUnit?: number;
    }[] = [];
    const productSummaryCanceled: {
      name: string;
      totalQuantity: number;
      totalQuantityPack?: number;
      totalPrice: number;
      nameUnit: string;
      multiploVendas: number;
      totalRestUnit?: number;
    }[] = [];
  
    // Aggregating product data
    items.forEach((item) => {
      const existingProduct = productSummarySaled.find((p) => p.name === item.name);
      if (existingProduct) {
        existingProduct.totalQuantity += item.quantity;
        existingProduct.totalPrice += item.price * item.quantity;
        existingProduct.totalQuantityPack += (existingProduct.totalQuantity / item.multiplo_vendas);
      } else {
        productSummarySaled.push({
          name: item.name,
          totalQuantity: item.quantity,
          totalPrice: item.price * item.quantity,
          nameUnit: item.name_unit,
          multiploVendas: item.multiplo_vendas
        });
      }
    });
  
    items_canceled.forEach((item) => {
      const existingProduct = productSummaryCanceled.find((p) => p.name === item.name);
      if (existingProduct) {
        existingProduct.totalQuantity += item.quantity;
        existingProduct.totalPrice += item.price * item.quantity;
      } else {
        productSummaryCanceled.push({
          name: item.name,
          totalQuantity: item.quantity,
          totalPrice: item.price * item.quantity,
          nameUnit: item.name_unit,
          multiploVendas: item.multiplo_vendas
        });
      }
    });

    productSummarySaled.forEach((item) => {
      item.totalQuantityPack = Math.floor(item.totalQuantity / item.multiploVendas);
      item.totalRestUnit = item.totalQuantity % item.multiploVendas;
    })

    productSummaryCanceled.forEach((item) => {
      item.totalQuantityPack = Math.floor(item.totalQuantity / item.multiploVendas);
      item.totalRestUnit = item.totalQuantity % item.multiploVendas;
    })
    
    const divisaoEstrelas = '*******************************************************************************************';
    const divisaoTracos = '----------------------------------------------------------------------------------------------------------';
    const company = await this.prisma.empresa_config.findFirst();
    const user = await this.prisma.usuarios.findFirst({ where: { id_usuario: userId } });
  
    // Obtendo a data e hora atuais
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');
  
    const receiptText = [];
  
    // Header
    receiptText.push(divisaoEstrelas);
    receiptText.push(`                                        RESUMO DO CAIXA ${id_caixa_dia}                              `);
    receiptText.push(divisaoEstrelas);
    receiptText.push(`Empresa: ${company.razao_social}`);
    receiptText.push(`CNPJ: ${company.cnpj}`);
    receiptText.push(`Endereço: ${company.endereco}`);
    receiptText.push(`Operador: ${user?.nome}`);
    receiptText.push(`Gerado em: ${formattedDate} às ${formattedTime}`);
    receiptText.push(divisaoTracos);
  
    // General Summary
    receiptText.push('Resumo Geral:');
    receiptText.push(`Total Valor Vendido: ${formatToBRL(totalSold)}`);
    receiptText.push(`Total de Vendas: ${sales}`);
    receiptText.push(`Total Valor Cancelado: ${formatToBRL(totalCanceled)}`);
    receiptText.push(`Vendas Canceladas: ${canceledSales}`);
    receiptText.push(divisaoTracos);
  
    // Product Details
    receiptText.push('Resumo por Produto (Vendidos):');
  
    if (productSummarySaled.length === 0) {
      receiptText.push('');
      receiptText.push('                                        Nenhum produto vendido                           ');
      receiptText.push('');
    } else {
      receiptText.push('');
      let resumeTotalSaled = {};
      productSummarySaled.forEach((product) => {
        let text:string = `${product.name} |`;

          resumeTotalSaled[product.nameUnit] = !resumeTotalSaled[product.nameUnit] ? product.totalQuantityPack : resumeTotalSaled[product.nameUnit] + product.totalQuantityPack;
          resumeTotalSaled['UNIDADE'] = !resumeTotalSaled['UNIDADE'] ? product.totalRestUnit : resumeTotalSaled['UNIDADE'] + product.totalRestUnit;

        if (product.totalQuantityPack > 0) {
          text += `${product.totalQuantityPack.toString().padStart(2)} ${product.totalQuantityPack > 1 ? `${product.nameUnit}(s)` : product.nameUnit}`;
        }

        if(product.totalQuantityPack > 0 && product.totalRestUnit > 0) {
          text += ` + `;
        }

        if (product.totalRestUnit > 0) {
          text += ` ${product.totalRestUnit.toString()} ${product.totalRestUnit > 1 ? `unidade(s)` : 'unidade'} `;
        }
        
        text += `| Total (UN): ${product.totalQuantity} | ${formatToBRL(product.totalPrice)}`
        receiptText.push(text);
      });

      receiptText.push('');

      let textResumeTotalSaled = '';
      Object.keys(resumeTotalSaled).forEach((key, index) => {
        if (resumeTotalSaled[key] > 0) {
          if (textResumeTotalSaled) {
            textResumeTotalSaled += ' + ';
          }
          textResumeTotalSaled += `${resumeTotalSaled[key]} ${key}(s)`;
        }
      });
      
      receiptText.push(`Total Vendido: ${textResumeTotalSaled} = ${formatToBRL(totalSold)}`);
    }
  
    receiptText.push(divisaoTracos);
  
    receiptText.push('Resumo por Produto (Cancelados):');
  
    if (productSummaryCanceled.length === 0) {
      receiptText.push('');
      receiptText.push('                                      Nenhuma venda foi cancelada                           ');
      receiptText.push('');
    } else {
      receiptText.push('');
      let resumeTotalCanceled = {};
      productSummaryCanceled.forEach((product) => {
        let text:string = `${product.name} |`;

          resumeTotalCanceled[product.nameUnit] = !resumeTotalCanceled[product.nameUnit] ? product.totalQuantityPack : resumeTotalCanceled[product.nameUnit] + product.totalQuantityPack;
          resumeTotalCanceled['UNIDADE'] = !resumeTotalCanceled['UNIDADE'] ? product.totalRestUnit : resumeTotalCanceled['UNIDADE'] + product.totalRestUnit;

        if (product.totalQuantityPack > 0) {
          text += `${product.totalQuantityPack.toString().padStart(2)} ${product.totalQuantityPack > 1 ? `${product.nameUnit}(s)` : product.nameUnit}`;
        }

        if(product.totalQuantityPack > 0 && product.totalRestUnit > 0) {
          text += ` + `;
        }

        if (product.totalRestUnit > 0) {
          text += ` ${product.totalRestUnit.toString()} ${product.totalRestUnit > 1 ? `unidade(s)` : 'unidade'} `;
        }
        
        text += `| Total (UN): ${product.totalQuantity} | ${formatToBRL(product.totalPrice)}`
        receiptText.push(text);
      });

      receiptText.push('');

      let textResumeTotalCanceled = '';
      Object.keys(resumeTotalCanceled).forEach((key,index) => {
        if (resumeTotalCanceled[key] > 0) {
          if (textResumeTotalCanceled) {
            textResumeTotalCanceled += ' + ';
          }
          textResumeTotalCanceled += `${resumeTotalCanceled[key]} ${key}(s)`;
        }
      });

      receiptText.push(`Total Cancelado: ${textResumeTotalCanceled} = ${formatToBRL(totalCanceled)}`);
    }
  
    receiptText.push(divisaoTracos);
  
    return { text: receiptText, company };
  }

  private async generatePDFlashSummaryThermalPrinter(
    id_caixa_dia: number,
    userId: number,
    sales: number,
    canceledSales: number,
    items: ItemSale[],
    items_canceled: ItemSale[],
  ): Promise<{ text: string[]; company: any }> {
    const divisaoEstrelas = '*************************************************';
    const divisaoTracos = '--------------------------------------------------';
  
    const calculateTotals = (items: ItemSale[]) => {
      const summary: {
        name: string;
        totalQuantity: number;
        totalQuantityPack?: number;
        totalPrice: number;
        nameUnit: string;
        multiploVendas: number;
        totalRestUnit?: number;
      }[] = [];
  
      items.forEach((item) => {
        const existingProduct = summary.find((p) => p.name === item.name);
        if (existingProduct) {
          existingProduct.totalQuantity += item.quantity;
          existingProduct.totalPrice += item.price * item.quantity;
        } else {
          summary.push({
            name: item.name,
            totalQuantity: item.quantity,
            totalPrice: item.price * item.quantity,
            nameUnit: item.name_unit,
            multiploVendas: item.multiplo_vendas,
          });
        }
      });
  
      summary.forEach((item) => {
        item.totalQuantityPack = Math.floor(item.totalQuantity / item.multiploVendas);
        item.totalRestUnit = item.totalQuantity % item.multiploVendas;
      });
  
      return summary;
    };
  
    const formatSummaryText = (
      title: string,
      summary: any[],
      totalValue: number,
    ) => {
      const lines = [title];
      if (summary.length === 0) {
        lines.push('', 'Nenhum produto encontrado.', '');
      } else {
        const resumeTotal: Record<string, number> = {};
  
        summary.forEach((product) => {
          let line = `${product.name} |`;
          resumeTotal[product.nameUnit] = (resumeTotal[product.nameUnit] || 0) + product.totalQuantityPack;
          resumeTotal['UNIDADE'] = (resumeTotal['UNIDADE'] || 0) + product.totalRestUnit;
  
          if (product.totalQuantityPack > 0) {
            line += `${product.totalQuantityPack} ${product.nameUnit}(s)`;
          }
  
          if (product.totalRestUnit > 0) {
            line += ` + ${product.totalRestUnit} unidade(s)`;
          }
  
          line += ` | Total (UN): ${product.totalQuantity} | ${formatToBRL(product.totalPrice)}`;
          lines.push(line);
        });
  
        const summaryLine = Object.keys(resumeTotal)
          .map((key) => `${resumeTotal[key]} ${key}(s)`)
          .join(' + ');
        lines.push(`Total: ${summaryLine} = ${formatToBRL(totalValue)}`);
      }
      return lines;
    };
  
    const totalSold = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalCanceled = items_canceled.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
    const productSummarySaled = calculateTotals(items);
    const productSummaryCanceled = calculateTotals(items_canceled);
  
    const company = await this.prisma.empresa_config.findFirst();
    const user = await this.prisma.usuarios.findFirst({ where: { id_usuario: userId } });
  
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');
  
    const receiptText = [
      divisaoEstrelas,
      `RESUMO DO CAIXA ${id_caixa_dia}`.padStart(35, ' '),
      divisaoEstrelas,
      `Empresa: ${company.razao_social}`,
      `CNPJ: ${company.cnpj}`,
      `Endereço: ${company.endereco}`,
      `Operador: ${user?.nome}`,
      `Gerado em: ${formattedDate} as ${formattedTime}`,
      divisaoTracos,
      'Resumo Geral:',
      `Total Valor Vendido: ${formatToBRL(totalSold)}`,
      `Total de Vendas: ${sales}`,
      `Total Valor Cancelado: ${formatToBRL(totalCanceled)}`,
      `Vendas Canceladas: ${canceledSales}`,
      divisaoTracos,
      ...formatSummaryText('Resumo por Produto (Vendidos):', productSummarySaled, totalSold),
      divisaoTracos,
      ...formatSummaryText('Resumo por Produto (Cancelados):', productSummaryCanceled, totalCanceled),
      divisaoTracos,
    ];
  
    return { text: receiptText, company };
  }
  
  private async generateReceiptContentPdf(
    userId:number,
    items: { name: string; quantity: number; totalRestUnit: number; totalQuantityPack: number; price: number, nameUnit: string }[],
    payment: string,
  ): Promise<{ text: string[]; company: any }> {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const receiptText = [];
    const divisaoEstrelas = '*******************************************************************************************'
    const divisaoTracos = '----------------------------------------------------------------------------------------------------------';
    const company = await this.prisma.empresa_config.findFirst();
    const user = await this.prisma.usuarios.findFirst({where:{id_usuario: userId }});
  
    // Cabeçalho do recibo
    receiptText.push(divisaoEstrelas);
    receiptText.push('                                   DOCUMENTO SEM VALOR FISCAL                           ');
    receiptText.push(divisaoEstrelas);
    receiptText.push(`Empresa: ${company.razao_social}`);
    receiptText.push(`CNPJ: ${company.cnpj}`);
    receiptText.push(`Endereço: ${company.endereco}`);
    receiptText.push(`Operador: ${user?.nome}`);
    receiptText.push(divisaoTracos);
  
    // Detalhes dos itens
    let resumeTotalSaled = {};
    items.forEach((item) => {
        let text:string = `${item.name} |`;

        resumeTotalSaled[item.nameUnit] = !resumeTotalSaled[item.nameUnit] ? item.totalQuantityPack : resumeTotalSaled[item.nameUnit] + item.totalQuantityPack;
        resumeTotalSaled['UNIDADE'] = !resumeTotalSaled['UNIDADE'] ? item.totalRestUnit : resumeTotalSaled['UNIDADE'] + item.totalRestUnit;

          if (item.totalQuantityPack > 0) {
            text += `${item.totalQuantityPack.toString().padStart(2)} ${item.totalQuantityPack > 1 ? `${item.nameUnit}(s)` : item.nameUnit}`;
          }

          if(item.totalQuantityPack > 0 && item.totalRestUnit > 0) {
            text += ` + `;
          }
  
          if (item.totalRestUnit > 0) {
            text += ` ${item.totalRestUnit.toString()} ${item.totalRestUnit > 1 ? `unidade(s)` : 'unidade'} `;
          }
          
          text += `| Total (UN): ${item.quantity} | ${formatToBRL(item.price)}`
          receiptText.push(text);
    });
  
    receiptText.push(divisaoTracos);

    let textResumeTotalSaled = '';
    Object.keys(resumeTotalSaled).forEach((key,index) => {
      if (resumeTotalSaled[key] > 0) {
        if (textResumeTotalSaled) {
          textResumeTotalSaled += ' + ';
        }
        textResumeTotalSaled += `${resumeTotalSaled[key]} ${key}(s)`;
      }
    });

    receiptText.push(`Total Vendido: ${textResumeTotalSaled} = ${formatToBRL(total)}`);    receiptText.push(`FORMA DE PAGAMENTO: ${payment}`);
    receiptText.push(divisaoTracos);
  
    // Rodapé do recibo
    receiptText.push(divisaoEstrelas);
    receiptText.push('                                     OBRIGADO PELA PREFERÊNCIA                           ');
    receiptText.push(divisaoEstrelas);
  
    return { text: receiptText, company };
  }

  private async generateReceiptContentThermalPrinter(
    userId: number,
    items: { name: string; quantity: number; totalRestUnit: number; totalQuantityPack: number; price: number; nameUnit: string }[],
    payment: string,
  ): Promise<{ text: string[]; company: any }> {
    const divisaoEstrelas = '*************************************************';
    const divisaoTracos = '--------------------------------------------------';
  
    const calculateTotals = (items: any[]) => {
      const summary: {
        name: string;
        totalQuantity: number;
        totalQuantityPack?: number;
        totalPrice: number;
        nameUnit: string;
        multiploVendas: number;
        totalRestUnit?: number;
      }[] = [];
  
      items.forEach((item) => {
        const existingProduct = summary.find((p) => p.name === item.name);
        if (existingProduct) {
          existingProduct.totalQuantity += item.quantity;
          existingProduct.totalPrice += item.price * item.quantity;
        } else {
          summary.push({
            name: item.name,
            totalQuantity: item.quantity,
            totalPrice: item.price * item.quantity,
            nameUnit: item.nameUnit,
            multiploVendas: item.multiploVendas,
          });
        }
      });
  
      summary.forEach((item) => {
        item.totalQuantityPack = Math.floor(item.totalQuantity / item.multiploVendas);
        item.totalRestUnit = item.totalQuantity % item.multiploVendas;
      });
  
      return summary;
    };
  
    const formatSummaryText = (title: string, summary: any[], totalValue: number, payment: string) => {
      const lines = [title];
      if (summary.length === 0) {
        lines.push('', 'Nenhum item encontrado.', '');
      } else {
        const resumeTotal: Record<string, number> = {};
  
        summary.forEach((product) => {
          let line = `${product.name} |`;
          resumeTotal[product.nameUnit] = (resumeTotal[product.nameUnit] || 0) + product.totalQuantityPack;
          resumeTotal['UNIDADE'] = (resumeTotal['UNIDADE'] || 0) + product.totalRestUnit;
  
          if (product.totalQuantityPack > 0) {
            line += `${product.totalQuantityPack} ${product.nameUnit}(s)`;
          }
  
          if (product.totalRestUnit > 0) {
            line += ` + ${product.totalRestUnit} unidade(s)`;
          }
  
          line += ` | Total (UN): ${product.totalQuantity} | ${formatToBRL(product.totalPrice)}`;
          lines.push(line);
        });
  
        const summaryLine = Object.keys(resumeTotal)
          .map((key) => `${resumeTotal[key]} ${key}(s)`)
          .join(' + ');
        lines.push(`Total: ${summaryLine} = ${formatToBRL(totalValue)}`);
        lines.push(`Forma de Pagamento: ${payment}`);
      }
      return lines;
    };
  
    const totalSold = items.reduce((sum, item) => sum + item.price, 0);
    const productSummary = calculateTotals(items);
  
    const company = await this.prisma.empresa_config.findFirst();
    const user = await this.prisma.usuarios.findFirst({ where: { id_usuario: userId } });
  
    const now = new Date();
    const formattedDate = now.toLocaleDateString('pt-BR');
    const formattedTime = now.toLocaleTimeString('pt-BR');
  
    const receiptText = [
      '          RECIBO DE VENDA SEM VALOR FISCAL',
      divisaoEstrelas,
      `Empresa: ${company?.razao_social || 'N/A'}`,
      `CNPJ: ${company?.cnpj || 'N/A'}`,
      `Endereço: ${company?.endereco || 'N/A'}`,
      `Operador: ${user?.nome || 'N/A'}`,
      `Gerado em: ${formattedDate} às ${formattedTime}`,
      divisaoTracos,
      ...formatSummaryText('Resumo por Produto:', productSummary, totalSold, payment),
      divisaoTracos,
      divisaoEstrelas,
      'OBRIGADO PELA PREFERÊNCIA'.padStart(38, ' '),
      divisaoEstrelas,
    ];
  
    return { text: receiptText, company };
  }
  
  async generateReceiptSale(
    userId: number,
    items: { name: string; quantity: number; totalRestUnit: number; totalQuantityPack: number; price: number; nameUnit: string }[],
    payment: string,
  ): Promise<Buffer> {
    const { text } = await this.generateReceiptContentPdf(userId,items, payment);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 550;
    page.drawText(text.join('\n'), {
      x: 20,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateFlashPDF(
    id_caixa_dia: number,
    userId: number,
    sales:number,
    canceledSales:number,
    items: ItemSale[],
    items_canceled: ItemSale[],
  ): Promise<Buffer> {
    const { text } = await this.generatePDFlashSummaryPDF(id_caixa_dia, userId,sales, canceledSales, items, items_canceled);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
    let y = 550;
    const lineHeight = 12;
  
    text.forEach((line) => {
      if (y < 20) {
        y = 550;
        pdfDoc.addPage([400, 600]);
      }
      page.drawText(line, {
        x: 20,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    });
  
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateFlashPrint(
    id_caixa_dia: number,
    userId: number,
    sales: number,
    canceledSales: number,
    items: ItemSale[],
    items_canceled: ItemSale[],
  ): Promise<{ status: boolean; text: string }> {
    const { text } = await this.generatePDFlashSummaryThermalPrinter(id_caixa_dia, userId, sales, canceledSales, items, items_canceled);

    try {
      const paths = await SerialPort.list();
    
      if (paths.length === 0 || !paths[0]?.manufacturer) {
  
        return {
          status: false,
          text: 'Nenhuma porta serial encontrada.'
        }
      }
    
      const print = new SerialPort({
        path: paths[0].path,
        baudRate: 9600,
        lock: false,
        autoOpen: false,
      }); 
  
      const cleanText = text.map((line) =>
        line.replace(/[^\x20-\x7E]/g, '')
      );
  
      return new Promise((resolve, reject) => {
        print.open(function (err) {
          if (err) {
            resolve({
              status: false,
              text: err.message
            })
          }
        
          print.write(cleanText.join('\n'), 'utf8',function (err) {
            if (err) {
              resolve({
                status: false,
                text: err.message
              })
            }else{
              resolve({
                status: true,
                text: 'Flash impresso com sucesso!'
              })
            }
          });
        
        });
      })
    } catch (error) {
      return {
        status: false,
        text: error.message
      }
    }
  }

  async generateReceiptSalePrint(
    userId: number,
    items: { name: string; quantity: number; totalRestUnit: number; totalQuantityPack: number; price: number; nameUnit: string }[],
    payment: string,
  ): Promise<{ status: boolean; text: string}> {
    try {
    const { text } = await this.generateReceiptContentThermalPrinter(userId, items, payment);
    const paths = await SerialPort.list();
  
    if (paths.length === 0 || !paths[0]?.manufacturer) {

      return {
        status: false,
        text: 'Nenhuma porta serial encontrada.'
      }
    }
  
    const print = new SerialPort({
      path: paths[0].path,
      baudRate: 9600,
      lock: false,
      autoOpen: false,
    }); 

    const cleanText = text.map((line) =>
      line.replace(/[^\x20-\x7E]/g, '')
    );

    return new Promise((resolve, reject) => {
      print.open(function (err) {
        if (err) {
          resolve({
            status: false,
            text: err.message
          })
        }
      
        print.write(cleanText.join('\n'), 'utf8',function (err) {
          if (err) {
            resolve({
              status: false,
              text: err.message
            })
          }else{
            resolve({
              status: true,
              text: 'Recibo impresso com sucesso!'
            })
          }
        });
      
      });
    })
  } catch (error) {
    return {
      status: false,
      text: error.message
    }
  }
  }
}

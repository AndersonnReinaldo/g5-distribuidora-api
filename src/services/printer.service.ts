import { Injectable, Logger } from '@nestjs/common';
import * as escpos from 'escpos';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatToBRL } from 'src/utils/string';
import { PrismaService } from 'src/modules/prisma/prisma.service';

interface ItemSale { name: string; multiplo_vendas: number; quantity: number; name_unit:string; 
   price: number }

@Injectable()
export class PrinterService {
  private device: any;
  private printer: any;
  private readonly logger = new Logger(PrinterService.name);

  constructor(private readonly prisma: PrismaService) {
    try {
      // Configurar a conexão com a impressora
      escpos.USB = require('escpos-usb');
      const devices = escpos.USB.findPrinter();

      if (devices.length === 0) {
        this.logger.warn('Nenhuma impressora encontrada.');
        this.device = null;
        this.printer = null;
      } else {
        this.device = new escpos.USB();
        const options = { encoding: 'GB18030' };
        this.printer = new escpos.Printer(this.device, options);
        this.logger.log('Impressora detectada e configurada.');
      }
    } catch (error) {
      this.logger.error('Erro ao configurar a impressora:', error.message);
      this.device = null;
      this.printer = null;
    }
  }

  private async generateReceiptContent(
    items: { name: string; quantity: number; price: number }[],
    payment: string,
  ): Promise<{ text: string[]; qrCodeImage: string; company: any }> {
    const total = items.reduce((sum, item) => sum + item.price, 0);
    const receiptText = [];

    const company = await this.prisma.empresa_config.findFirst();

    receiptText.push('****************************************');
    receiptText.push('        DOCUMENTO SEM VALOR FISCAL      ');
    receiptText.push('****************************************');
    receiptText.push(`Empresa: ${company.razao_social}`);
    receiptText.push(`CNPJ: ${company.cnpj}`);
    receiptText.push(`Endereço: ${company.endereco}`);
    receiptText.push('----------------------------------------');

    items.forEach((item) => {
      receiptText.push(
        `${item.name.padEnd(20)} Qtd: ${item.quantity}  R$ ${formatToBRL(item.price)}`,
      );
    });

    receiptText.push('----------------------------------------');
    receiptText.push(`TOTAL:                      R$ ${formatToBRL(total)}`);
    receiptText.push(`FORMA DE PAGAMENTO: ${payment}`);
    receiptText.push('****************************************');

    const qrCodeData = 'Dados obrigatórios para o QR Code';
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    receiptText.push('****************************************');
    receiptText.push('        OBRIGADO PELA PREFERÊNCIA       ');
    receiptText.push('****************************************');

    return { text: receiptText, qrCodeImage, company };
  }

  private async generatePOSFlashSummary(
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
  
    const qtdeProdutosVendidos = productSummarySaled.reduce((sum, item) => sum + item.totalQuantity, 0);
    const qtdeProdutosCancelados = productSummaryCanceled.reduce((sum, item) => sum + item.totalQuantity, 0);
  
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
      Object.keys(resumeTotalSaled).forEach((key,index) => {
        textResumeTotalSaled += `${resumeTotalSaled[key]} ${key}(s)`;
        if(index < Object.keys(resumeTotalSaled).length - 1) {
          textResumeTotalSaled += ' | ';
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
        textResumeTotalCanceled += `${resumeTotalCanceled[key]} ${key}(s)`;
        if(index < Object.keys(resumeTotalCanceled).length - 1) {
          textResumeTotalCanceled += ' | ';
        }
      });

      receiptText.push(`Total Vendido: ${textResumeTotalCanceled} = ${formatToBRL(totalCanceled)}`);
    }
  
    receiptText.push(divisaoTracos);
  
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
      textResumeTotalSaled += `${resumeTotalSaled[key]} ${key}(s)`;
      if(index < Object.keys(resumeTotalSaled).length - 1) {
        textResumeTotalSaled += ' | ';
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

  async generateFlash(
    id_caixa_dia: number,
    userId: number,
    sales:number,
    canceledSales:number,
    items: ItemSale[],
    items_canceled: ItemSale[],
  ): Promise<Buffer> {
    // Obter o resumo do ponto de venda
    const { text } = await this.generatePOSFlashSummary(id_caixa_dia, userId,sales, canceledSales, items, items_canceled);
  
    // Criar o documento PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
    // Configurar layout inicial
    let y = 550;
    const lineHeight = 12;
  
    // Escrever cada linha do texto no PDF
    text.forEach((line) => {
      if (y < 20) {
        // Adicionar uma nova página se necessário
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
  
    // Salvar e retornar o PDF como Buffer
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
  
  async saveAsPdf(
    userId: number,
    items: { name: string; quantity: number; totalRestUnit: number; totalQuantityPack: number; price: number; nameUnit: string }[],
    payment: string,
  ): Promise<string> {
    const { company } = await this.generateReceiptContent(items, payment);
    const pdfBytes = await this.generateReceiptSale(userId,items, payment);

    const filePath = `./temp/${Date.now()}-${company?.razao_social}.pdf`;
    fs.writeFileSync(filePath, pdfBytes);

    this.logger.log(`Cupom fiscal salvo em: ${filePath}`);
    return filePath;
  }

  async printToThermalPrinter(
    items: { name: string; quantity: number; price: number }[],
    payment: string,
  ): Promise<void> {
    const { text, qrCodeImage } = await this.generateReceiptContent(items, payment);

    if (!this.device || !this.printer) {
      this.logger.warn('Impressora não disponível.');
      return;
    }

    return new Promise((resolve, reject) => {
      this.device.open(async (err: Error) => {
        if (err) {
          this.logger.error('Erro ao abrir a conexão com a impressora:', err);
          reject(err);
          return;
        }

        this.printer
          .align('CT')
          .text(text.join('\n'))
          .qrimage(qrCodeImage, { size: 10 })
          .cut()
          .close(resolve);
      });
    });
  }
}

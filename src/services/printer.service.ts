import { Injectable, Logger } from '@nestjs/common';
import * as escpos from 'escpos';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatToBRL } from 'src/utils/string';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import puppeteer from 'puppeteer';

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

  private async generateReceiptContentPdf(
    userId:number,
    items: { name: string; quantity: number; price: number }[],
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
    receiptText.push(`Responsável venda: ${user?.nome}`);
    receiptText.push(divisaoTracos);
  
    // Detalhes dos itens
    items.forEach((item) => {
      receiptText.push(
        `${item.name.padEnd(20)} Qtd: ${item.quantity.toString().padStart(3)}  R$ ${formatToBRL(item.price)}`,
      );
    });
  
    receiptText.push(divisaoTracos);
    receiptText.push(`TOTAL: ${' '.repeat(36)}R$ ${formatToBRL(total)}`);
    receiptText.push(`FORMA DE PAGAMENTO: ${payment}`);
    receiptText.push(divisaoTracos);
  
  
    // Rodapé do recibo
    receiptText.push(divisaoEstrelas);
    receiptText.push('                                     OBRIGADO PELA PREFERÊNCIA                           ');
    receiptText.push(divisaoEstrelas);
  
    return { text: receiptText, company };
  }

  async generateBlob(
    userId: number,
    items: { name: string; quantity: number; price: number }[],
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
  

  async saveAsPdf(
    userId: number,
    items: { name: string; quantity: number; price: number }[],
    payment: string,
  ): Promise<string> {
    const { company } = await this.generateReceiptContent(items, payment);
    const pdfBytes = await this.generateBlob(userId,items, payment);

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

import { Injectable, Logger } from '@nestjs/common';
import * as escpos from 'escpos';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatToBRL } from 'src/utils/string';

@Injectable()
export class PrinterService {
  private device: any;
  private printer: any;
  private readonly logger = new Logger(PrinterService.name);

  constructor() {
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

  /**
   * Imprime o cupom fiscal ou salva em um arquivo PDF se não houver impressora
   * @param companyInfo Informações da empresa
   * @param items Lista de itens vendidos
   * @param payment Método de pagamento
   */
  async printReceipt(
    companyInfo: { name: string; cnpj: string; address: string },
    items: { name: string; quantity: number; price: number }[],
    payment: string,
  ): Promise<void> {
    const total = items.reduce(
      (sum, item) => sum + item.price,
      0,
    );

    const receiptText = [];

    receiptText.push('****************************************');
    receiptText.push('        DOCUMENTO SEM VALOR FISCAL      ');
    receiptText.push('****************************************');
    receiptText.push(`Empresa: ${companyInfo.name}`);
    receiptText.push(`CNPJ: ${companyInfo.cnpj}`);
    receiptText.push(`Endereço: ${companyInfo.address}`);
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

    // Verifica se existe uma impressora
    if (!this.device || !this.printer) {
      this.logger.warn('Impressora não disponível. Salvando em PDF.');

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([400, 600]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let y = 550;

      page.drawText(receiptText.join('\n'), {
        x: 20,
        y,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });

      const qrImageBytes = Buffer.from(qrCodeImage.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);

      page.drawImage(qrImage, {
        x: 150,
        y: 50,
        width: 100,
        height: 100,
      });

      const pdfBytes = await pdfDoc.save();
      const filePath = `./temp/${Date.now()}-${companyInfo?.name}.pdf`;
      fs.writeFileSync(filePath, pdfBytes);

      this.logger.log(`Cupom fiscal salvo em: ${filePath}`);
      return;
    }

    // Se a impressora estiver disponível
    return new Promise((resolve, reject) => {
      this.device.open(async (err: Error) => {
        if (err) {
          this.logger.error('Erro ao abrir a conexão com a impressora:', err);
          reject(err);
          return;
        }

        // Imprime o cupom
        this.printer
          .align('CT')
          .text(receiptText.join('\n'))
          .qrimage(qrCodeImage, { size: 10 })
          .cut()
          .close(resolve);
      });
    });
  }
}

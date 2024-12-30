import { Injectable, Logger } from '@nestjs/common';
import * as escpos from 'escpos';
import * as QRCode from 'qrcode';
import * as fs from 'fs';

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
        const options = { encoding: 'GB18030' }; // Codificação para caracteres especiais
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
   * Imprime o cupom fiscal ou salva em um arquivo se não houver impressora
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
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const receiptText = [];

    receiptText.push('****************************************');
    receiptText.push('             CUPOM FISCAL              ');
    receiptText.push('****************************************');
    receiptText.push(`Empresa: ${companyInfo.name}`);
    receiptText.push(`CNPJ: ${companyInfo.cnpj}`);
    receiptText.push(`Endereço: ${companyInfo.address}`);
    receiptText.push('----------------------------------------');

    items.forEach((item) => {
      receiptText.push(
        `${item.name.padEnd(20)} Qtd: ${item.quantity}  R$ ${item.price.toFixed(
          2,
        )}`,
      );
    });

    receiptText.push('----------------------------------------');
    receiptText.push(`TOTAL:                      R$ ${total.toFixed(2)}`);
    receiptText.push(`FORMA DE PAGAMENTO: ${payment}`);
    receiptText.push('****************************************');

    const qrCodeData = 'Dados obrigatórios para o QR Code';
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    receiptText.push('QR Code: Gerado e não exibido em texto');
    receiptText.push('****************************************');
    receiptText.push('        OBRIGADO PELA PREFERÊNCIA       ');
    receiptText.push('****************************************');

    // Verifica se existe uma impressora
    if (!this.device || !this.printer) {
      this.logger.warn('Impressora não disponível. Salvando em arquivo.');

      const filePath = './receipt.txt';
      fs.writeFileSync(filePath, receiptText.join('\n'), 'utf-8');
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

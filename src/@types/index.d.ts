interface MovementData {
    id_produto: number;
    id_estoque: number;
    quantidade?: number;
    tipo_movimento?: number;
    valor_unitario?: number;
    id_usuario?: number;
    id_metodo_pagamento?: number;
  }
  
  interface Estoque {
    id_estoque: number;
    quantidade: number;
  }
  
  interface EstoqueMovimentacoesCreateInput {
    id_estoque: number;
    tipo_movimento?: number;
    valor_total_venda?: number;
    valor_unitario?: number;
    id_usuario?: number;
    id_metodo_pagamento?: number;
  }

  interface CheckoutAttributes {
    id_usuario?: number;
    id_caixa_dia:number;
    products?: Array<{
      id_produto: number; 
      id_estoque: number;       
      quantidade: number;        
      valor_total: number;
      valor_unitario: number;
      nome?: string;       
    }>;

    valor_pago?: number;
    valor_pago_secundario?: number;
    valor_total: number;
    id_metodo_pagamento: number;
    id_metodo_pagamento_secundario: number;
    pagamento_misto: number;       
    troco?: number;              
  }
  
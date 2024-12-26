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
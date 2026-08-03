from backend.database.database import db
from backend.models.pedido import Pedidos
from backend.models.item_pedidos import ItemPedidos  # ou item_pedido de acordo com o nome do seu arquivo .py
from backend.models.estoque import Estoque

def criar_pedido_service(dados: dict) -> dict:
    # 1. Validações iniciais
    if not dados.get('user_id') or not dados.get('loja_id'):
        raise ValueError("Usuário e Loja são obrigatórios para criar um pedido.")
    
    itens_dados = dados.get('itens', [])
    if not itens_dados:
        raise ValueError("O pedido precisa conter pelo menos um item.")

    # 2. Instancia o Pedido principal
    novo_pedido = Pedidos(
        valor_total=dados.get('valor_total', 0.0),
        status_pagamento=dados.get('status_pagamento', 'Pendente'),
        tipo=dados.get('tipo', 'Venda'),  # 'Venda' ou 'Locacao'
        user_id=dados.get('user_id'),
        loja_id=dados.get('loja_id')
    )

    db.session.add(novo_pedido)
    db.session.flush()  # Gera o ID do pedido antes de commitar

    # 3. Adiciona os itens e atualiza o Estoque automaticamente
    for item in itens_dados:
        produto_id = item.get('produto_id')
        qtd_comprada = item.get('quantidade', 1)

        # Registra o item do pedido
        novo_item = ItemPedidos(
            quantidade=qtd_comprada,
            valor_unitario=item.get('valor_unitario'),
            pedido_id=novo_pedido.id,
            produto_id=produto_id
        )
        db.session.add(novo_item)

        # Baixa no Estoque correspondente da loja
        estoque_item = Estoque.query.filter_by(
            loja_id=dados.get('loja_id'), 
            produto_id=produto_id
        ).first()

        if estoque_item:
            if estoque_item.quantidade < qtd_comprada:
                raise ValueError(f"Estoque insuficiente para o produto ID {produto_id}.")
            estoque_item.quantidade -= qtd_comprada

    db.session.commit()
    return novo_pedido.to_dict()
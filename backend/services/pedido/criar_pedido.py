from datetime import datetime
from backend.database.database import db
from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.models.produto import Produto


class CriarPedidoService:
    def executar(self, dados: dict):
        if not dados.get('user_id') or not dados.get('loja_id'):
            raise ValueError("Usuário e Loja são obrigatórios.")

        itens_dados = dados.get('itens') or []
        if not itens_dados:
            raise ValueError("O pedido precisa ter pelo menos um item.")

        tipo = dados.get('tipo', 'Venda')

        pedido = Pedido(
            user_id=dados['user_id'],
            loja_id=dados['loja_id'],
            status=dados.get('status', 'Pendente'),
            tipo=tipo,
            valor_total=0.0,
            forma_pagamento=dados.get('forma_pagamento', 'Não informado'),
            endereco_entrega=dados.get('endereco_entrega'),
            observacao=dados.get('observacao'),
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        db.session.add(pedido)
        db.session.flush()  # garante pedido.id antes de criar os itens

        valor_total = 0.0

        for item in itens_dados:
            produto_id = item.get('produto_id')
            quantidade = int(item.get('quantidade', 1))

            if quantidade < 1:
                db.session.rollback()
                raise ValueError("A quantidade de cada item deve ser pelo menos 1.")

            produto = Produto.buscar_por_id(produto_id)
            if not produto:
                db.session.rollback()
                raise ValueError(f"Produto de ID {produto_id} não encontrado.")
            if not produto.disponivel:
                db.session.rollback()
                raise ValueError(f"Produto '{produto.nome}' está indisponível no momento.")

            valor_unitario = produto.preco_venda if tipo == 'Venda' else produto.preco_locacao

            item_pedido = ItemPedidos(
                pedido_id=pedido.id,
                produto_id=produto.id,
                quantidade=quantidade,
                valor_unitario=valor_unitario
            )
            db.session.add(item_pedido)
            valor_total += valor_unitario * quantidade

        pedido.valor_total = valor_total
        db.session.commit()

        return pedido.to_dict(incluir_itens=True)

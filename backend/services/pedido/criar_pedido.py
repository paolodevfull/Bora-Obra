from datetime import datetime
from backend.models.pedido import Pedido

class CriarPedidoService:
    def executar(self, dados: dict):
        if not dados.get('user_id') or not dados.get('loja_id'):
            raise ValueError("Usuário e Loja são obrigatórios.")
            
        pedido = Pedido(
            user_id=dados['user_id'],
            loja_id=dados['loja_id'],
            status=dados.get('status', 'Pendente'),
            tipo=dados.get('tipo', 'Venda'),
            valor_total=float(dados.get('valor_total', 0.0)),
            observacao=dados.get('observacao'),
            created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        pedido.salvar()
        return pedido.to_dict()
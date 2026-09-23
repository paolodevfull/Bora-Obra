from datetime import datetime
from sqlalchemy import func
from backend.database.database import db
from backend.models.pedido import Pedido

class RelatorioRepository:
    @staticmethod
    def calcular_lucro_e_resumo_diario(loja_id):
        hoje = datetime.now().strftime("%Y-%m-%d")

        resultado = db.session.query(
            func.sum(Pedido.valor_total).label('faturamento_total'),
            func.count(Pedido.id).label('total_pedidos')
        ).filter(Pedido.created_at.like(f"{hoje}%"), Pedido.loja_id == loja_id, Pedido.status != "Cancelado").first()

        faturamento = resultado.faturamento_total or 0.0
        total_pedidos = resultado.total_pedidos or 0
        # Busca os 5 pedidos mais recentes
        pedidos_recentes = Pedido.query.filter_by(loja_id=loja_id).order_by(Pedido.id.desc()).limit(5).all()
        ultimos_pedidos = [p.to_dict() for p in pedidos_recentes]

        return {
            "data": hoje,
            "faturamento_total": round(faturamento, 2),
            "total_pedidos": total_pedidos,
            "ultimos_pedidos": ultimos_pedidos
        }

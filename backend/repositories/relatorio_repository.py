from sqlalchemy import func
from backend.database.database import db
from backend.models.pedido import Pedido

class RelatorioRepository:

    @staticmethod
    def calcular_lucro_e_resumo_diario():
        # Consulta de soma total de vendas e contagem de pedidos
        resultado = db.session.query(
            func.sum(Pedido.valor_total).label('faturamento_total'),
            func.count(Pedido.id).label('total_pedidos')
        ).first()

        faturamento = resultado.faturamento_total or 0.0
        total_pedidos = resultado.total_pedidos or 0

        # Margem média estimada de lucro bruto (ex: 35%)
        lucro_estimado = faturamento * 0.35

        return {
            "faturamento_total": round(faturamento, 2),
            "total_pedidos": total_pedidos,
            "lucro_estimado": round(lucro_estimado, 2),
            "margem_aplicada": "35%"
        }
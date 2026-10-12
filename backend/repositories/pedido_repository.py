from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.repositories.base_repository import BaseRepository
from backend.database.database import db
from sqlalchemy.exc import IntegrityError
class PedidoRepository(BaseRepository):
    model = Pedido
    @staticmethod
    def criar_com_itens(pedido, itens):
        try:
            db.session.add(pedido)
            db.session.flush()
            for item in itens:
                db.session.add(ItemPedidos(pedido_id=pedido.id, **item))
            db.session.commit()
            return pedido
        except IntegrityError:
            db.session.rollback()
            if pedido.idempotency_key:
                existente = Pedido.query.filter_by(
                    user_id=pedido.user_id, idempotency_key=pedido.idempotency_key
                ).first()
                if existente:
                    return existente
            raise
        except Exception:
            db.session.rollback()
            raise

    @staticmethod
    def buscar_por_idempotencia(user_id, key):
        if not key:
            return None
        return Pedido.query.filter_by(user_id=user_id, idempotency_key=key).first()

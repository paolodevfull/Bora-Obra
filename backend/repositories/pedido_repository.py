from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.repositories.base_repository import BaseRepository
from backend.database.database import db
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
        except Exception:
            db.session.rollback()
            raise

from backend.database.database import db


#fazer os imports dos models aqui

from .base_model import ModeloBase
from .estoque import Estoque
from .item_pedidos import ItemPedidos
from .loja import Loja
from .pedido import Pedidos
from .produto import Produto
from .user import User

__all__ = ["db","ModeloBase","Estoque","ItemPedidos","Loja","Pedidos","Produto","User"]
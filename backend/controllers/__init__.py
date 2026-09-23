from backend.controllers.loja_controller import loja_bp
from backend.controllers.pedido_controller import pedido_bp
from backend.controllers.produto_controller import produto_bp
from backend.controllers.user_controller import user_bp
from backend.controllers.auth_controller import auth_bp
from backend.controllers.relatorio_controller import relatorio_bp

__all__ = ["loja_bp", "pedido_bp", "user_bp", "produto_bp", "auth_bp", "relatorio_bp"]

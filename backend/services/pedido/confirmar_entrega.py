"""Compatibility name for the delivery confirmation use case."""
from backend.services.pedido.confirmar_entrega_pedido import ConfirmarEntregaPedidoService
class ConfirmarEntregaService(ConfirmarEntregaPedidoService):
    pass

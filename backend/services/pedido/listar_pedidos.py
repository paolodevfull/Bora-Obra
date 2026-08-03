from backend.models.pedido import Pedidos

def listar_pedidos_service():
    pedidos = Pedidos.query.all()
    return [pedido.to_dict() for pedido in pedidos]

def obter_pedido_detalhado_service(pedido_id: int) -> dict:
    pedido = Pedidos.query.get(pedido_id)
    if not pedido:
        raise KeyError("Pedido não encontrado.")

    # Retorna o pedido junto com a lista de itens relacionados
    resultado = pedido.to_dict()
    resultado['itens'] = [item.to_dict() for item in pedido.itens]
    
    if pedido.entrega:
        resultado['entrega'] = pedido.entrega.to_dict()

    return resultado
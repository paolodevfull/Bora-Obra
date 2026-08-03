from backend.models.loja import Loja

def listar_lojas_service():
    lojas = Loja.query.all()
    return [l.to_dict() for l in lojas]

def obter_loja_por_id_service(loja_id: int):
    loja = Loja.query.get(loja_id)
    if not loja:
        raise KeyError("Loja não encontrada.")
    return loja.to_dict()
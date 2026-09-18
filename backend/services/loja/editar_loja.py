from backend.services.validation import texto
from backend.repositories.loja_repository import LojaRepository
from backend.models.loja import Loja
from backend.services.errors import ServiceError
from backend.services.geocoding import geocodificar_endereco


class EditarLojaService:
    def executar(self, loja_id, lojista_id, dados):
        loja = LojaRepository.buscar_por_id(loja_id)
        if not loja:
            raise ServiceError("Loja não encontrada.", 404)
        if loja.lojista_id != lojista_id:
            raise ServiceError("Você não tem permissão para editar esta loja.", 403)

        nome = texto(dados.get('nome',loja.nome), 'Nome', 3, 100)
        endereco = texto(dados.get('endereco',loja.endereco), 'Endereço', 5, 200)
        telefone = str(dados.get('telefone',loja.telefone) or '').strip()
        endereco_alterado = endereco != loja.endereco
        loja.nome = nome
        loja.endereco = endereco
        loja.telefone = telefone
        if endereco_alterado or loja.latitude is None or loja.longitude is None:
            loja.latitude, loja.longitude = geocodificar_endereco(endereco)
        LojaRepository.atualizar(loja)
        return loja.to_dict()

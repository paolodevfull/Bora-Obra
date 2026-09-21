from backend.repositories.loja_repository import LojaRepository
from backend.services.acesso import AcessoService
from backend.services.validation import texto
from backend.models.loja import Loja
from backend.services.errors import ServiceError
from backend.services.geocoding import geocodificar_endereco
from backend.services.endereco import normalizar_endereco, CAMPOS_ENDERECO


class CriarLojaService:
    def executar(self, dados, lojista_id):
        AcessoService().usuario(lojista_id, {'lojista'})
        nome = texto(dados.get('nome'), 'Nome', 3, 100)
        endereco = normalizar_endereco(dados, obrigatorio=True)
        telefone = (dados.get('telefone') or '').strip()

        if LojaRepository.buscar_por_lojista(lojista_id):
            raise ServiceError("Este lojista já possui uma loja cadastrada.")

        latitude, longitude = geocodificar_endereco(endereco['endereco'])
        loja = Loja(nome=nome, endereco=endereco['endereco'], telefone=telefone, lojista_id=lojista_id,
                    latitude=latitude, longitude=longitude,
                    **{campo: endereco[campo] for campo in CAMPOS_ENDERECO})
        LojaRepository.salvar(loja)
        return loja.to_dict()

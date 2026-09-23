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
        responsavel_nome = texto(dados.get('responsavel_nome') or 'Não informado', 'Responsável', maximum=100)
        documento = str(dados.get('documento') or '').strip()
        email = str(dados.get('email') or '').strip().lower()
        logo_url = str(dados.get('logo_url') or '').strip()

        if LojaRepository.buscar_por_lojista(lojista_id):
            raise ServiceError("Este lojista já possui uma loja cadastrada.")

        latitude, longitude = geocodificar_endereco(endereco['endereco'], endereco)
        loja = Loja(nome=nome, endereco=endereco['endereco'], telefone=telefone, lojista_id=lojista_id,
                    responsavel_nome=responsavel_nome, documento=documento, email=email, logo_url=logo_url,
                    ativa=bool(dados.get('ativa', True)),
                    latitude=latitude, longitude=longitude,
                    **{campo: endereco[campo] for campo in CAMPOS_ENDERECO})
        LojaRepository.salvar(loja)
        return loja.to_dict()

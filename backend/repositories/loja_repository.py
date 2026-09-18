from backend.models.loja import Loja
from backend.repositories.base_repository import BaseRepository


class LojaRepository(BaseRepository):
    model = Loja

    @classmethod
    def buscar_por_lojista(cls, identifier):
        return cls.model.query.filter_by(lojista_id=identifier).first()

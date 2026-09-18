from backend.models.estoque import Estoque
from backend.repositories.base_repository import BaseRepository


class EstoqueRepository(BaseRepository):
    model = Estoque

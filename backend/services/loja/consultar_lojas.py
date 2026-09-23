from backend.services.acesso import AcessoService
from backend.services.loja.listar_lojas import ListarLojasService
class ConsultarLojasService:
    def executar(self, user_id):
        user = AcessoService().usuario(user_id, {'cliente','lojista','funcionario'}) if user_id else None
        is_operator = bool(user and user.tipo in {'lojista', 'funcionario'})
        lojista_id = user.id if user and user.tipo == 'lojista' else user.responsavel_id if is_operator else None
        return ListarLojasService().executar(lojista_id, publico=not is_operator)

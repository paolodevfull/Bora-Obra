from backend.repositories.user_repository import UserRepository
from backend.repositories.loja_repository import LojaRepository
from backend.services.errors import ServiceError


class AcessoService:
    def usuario(self, user_id, tipos=None):
        user = UserRepository.buscar_por_id(user_id) if user_id else None
        if not user:
            raise ServiceError('Entre na sua conta para continuar.', 401)
        # O status precisa ser conferido em cada requisição: uma conta desativada
        # não deve conservar acesso apenas porque sua sessão foi criada anteriormente.
        if not user.ativo:
            raise ServiceError('Esta conta está inativa. Fale com o responsável.', 403)
        if tipos and user.tipo not in tipos:
            raise ServiceError('Seu perfil não tem permissão para esta ação.', 403)
        return user

    def loja(self, user_id, required=True):
        user = self.usuario(user_id, {'lojista', 'funcionario'})
        loja = LojaRepository.buscar_por_lojista(user.id if user.tipo == 'lojista' else user.responsavel_id)
        if not loja and required:
            raise ServiceError('Cadastre sua loja antes de continuar.', 400)
        return loja

    def pedido(self, pedido, user_id):
        user = self.usuario(user_id)
        if not pedido:
            raise ServiceError('Pedido não encontrado.', 404)
        if user.tipo == 'cliente' and pedido.user_id == user.id:
            return pedido
        if user.tipo in {'lojista', 'funcionario'}:
            loja = self.loja(user.id, required=False)
            if loja and pedido.loja_id == loja.id:
                return pedido
        raise ServiceError('Você não tem acesso a este pedido.', 403)

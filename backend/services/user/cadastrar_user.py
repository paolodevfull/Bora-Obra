from backend.services.acesso import AcessoService
from backend.services.user.criar_user import CriarUserService
from backend.services.errors import ServiceError
class CadastrarUserService:
    def executar(self, dados, user_id=None):
        dados = dict(dados)
        dados.pop('responsavel_id', None)
        if user_id:
            user = AcessoService().usuario(user_id, {'lojista'})
            if dados.get('tipo') != 'funcionario': raise ServiceError('Lojistas podem cadastrar apenas funcionários.',403)
            dados['responsavel_id'] = user.id
            # Contas operacionais herdam o endereço de contato do responsável quando o formulário não o informa.
            for campo in ('telefone', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'):
                if not dados.get(campo):
                    dados[campo] = getattr(user, campo, '')
        elif dados.get('tipo', 'cliente') not in {'cliente','lojista'}:
            raise ServiceError('Cadastro público disponível para clientes e lojistas.',403)
        return CriarUserService().executar(dados)

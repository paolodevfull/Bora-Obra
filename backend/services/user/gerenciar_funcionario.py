from backend.repositories.user_repository import UserRepository
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError
from backend.services.validation import texto, booleano


class GerenciarFuncionarioService:
    def obter(self, funcionario_id, lojista_id):
        lojista = AcessoService().usuario(lojista_id, {'lojista'})
        funcionario = UserRepository.buscar_por_id(funcionario_id)
        if not funcionario or funcionario.responsavel_id != lojista.id or funcionario.tipo != 'funcionario':
            raise ServiceError('Funcionário não encontrado.', 404)
        return funcionario

    def editar(self, funcionario_id, lojista_id, dados):
        funcionario = self.obter(funcionario_id, lojista_id)
        funcionario.nome = texto(dados.get('nome', funcionario.nome), 'Nome', maximum=100)
        email = texto(dados.get('email', funcionario.email), 'E-mail', maximum=120).lower()
        outro = UserRepository.buscar_por_email(email)
        if '@' not in email or (outro and outro.id != funcionario.id): raise ServiceError('E-mail inválido ou já utilizado.')
        funcionario.email = email
        funcionario.telefone = str(dados.get('telefone', funcionario.telefone) or '').strip()
        if 'ativo' in dados: funcionario.ativo = booleano(dados['ativo'], 'Status')
        senha = dados.get('senha')
        if senha: funcionario.set_senha(texto(senha, 'Senha', 6, 128))
        return UserRepository.atualizar(funcionario).to_dict()

    def excluir(self, funcionario_id, lojista_id):
        funcionario = self.obter(funcionario_id, lojista_id)
        UserRepository.deletar(funcionario)

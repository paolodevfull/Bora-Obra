from backend.models.produto import Produto
from backend.services.acesso import AcessoService
from backend.services.errors import ServiceError


class ListarOpcoesRelatorioService:
    def executar(self, user_id, filtros):
        loja = AcessoService().loja(user_id)
        if filtros.get('loja') and filtros['loja'] != str(loja.id):
            raise ServiceError('Você não tem acesso a esta loja.', 403)
        try:
            pagina = int(filtros.get('pagina', 1))
            if pagina < 1:
                raise ValueError()
        except ValueError:
            raise ServiceError('Página inválida.')
        query = Produto.query.filter_by(loja_id=loja.id)
        if filtros.get('busca'):
            query = query.filter(Produto.nome.icontains(filtros['busca'], autoescape=True))
        total = query.count()
        if filtros.get('hierarquia') == '1':
            produtos = query.order_by(Produto.categoria, Produto.nome, Produto.id).limit(2000).all()
            return {'lojas': [{'id': loja.id, 'nome': loja.nome}], 'total': total, 'pagina': 1,
                    'produtos': [{'id': p.id, 'nome': p.nome, 'categoria': p.categoria,
                                  'sku': p.sku, 'ativo': p.disponivel} for p in produtos]}
        produtos = query.order_by(Produto.nome, Produto.id).offset((pagina - 1) * 50).limit(50).all()
        return {'lojas': [{'id': loja.id, 'nome': loja.nome}], 'total': total, 'pagina': pagina,
                'produtos': [{'id': p.id, 'nome': p.nome, 'categoria': p.categoria,
                              'sku': p.sku, 'ativo': p.disponivel} for p in produtos]}

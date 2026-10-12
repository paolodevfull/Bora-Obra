from backend.services.validation import texto, positivo, booleano, inteiro
from backend.repositories.loja_repository import LojaRepository
from backend.services.errors import ServiceError

def validar_produto(dados):
    values = dict(dados)
    values['nome'] = texto(values.get('nome'), 'Nome', 1, 100)
    values['loja_id'] = inteiro(values.get('loja_id'), 'Loja')
    if not LojaRepository.buscar_por_id(values['loja_id']):
        raise ServiceError('Loja não encontrada.', 404)
    for key in ['preco_venda', 'preco_locacao']:
        values[key] = positivo(values.get(key), key.replace('_', ' '))
    for key in ['disponivel','disponivel_venda','disponivel_locacao','status_manutencao','classificacao_curva_a']:
        values[key] = booleano(values.get(key, key.startswith('disponivel')), key)
    for key, label, maximum in [('categoria', 'Categoria', 50), ('utilidade', 'Utilidade', 100),
                                ('descricao', 'Descrição', 2000)]:
        values[key] = texto(values.get(key), label, maximum=maximum)
    value = values.get('cor_tamanho') or ''
    if not isinstance(value, str) or len(value.strip()) > 100: raise ServiceError('Cor/tamanho inválido.')
    values['cor_tamanho'] = value.strip()
    values['estoque'] = inteiro(values.get('estoque', 0), 'Estoque', minimum=0)
    for key, maximum in [('unidade', 20), ('sku', 60), ('imagem_url', 500)]:
        value = values.get(key) or ('un' if key == 'unidade' else '')
        if not isinstance(value, str) or len(value.strip()) > maximum: raise ServiceError(f'{key} inválido.')
        values[key] = value.strip()
    if not values['sku']:
        raise ServiceError('SKU é obrigatório.')
    return {k: v for k, v in values.items() if k in {'nome','loja_id','preco_venda','preco_locacao','disponivel','disponivel_venda','disponivel_locacao','status_manutencao','classificacao_curva_a','categoria','utilidade','descricao','cor_tamanho','estoque','unidade','sku','imagem_url'}}

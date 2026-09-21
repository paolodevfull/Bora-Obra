import re

from backend.services.errors import ServiceError


CAMPOS_ENDERECO = ('cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf')


def normalizar_endereco(dados, atual=None, obrigatorio=False):
    """Valida campos estruturados e mantém compatibilidade com `endereco` legado."""
    atual = atual or {}
    valores = {campo: str(dados.get(campo, atual.get(campo, '')) or '').strip() for campo in CAMPOS_ENDERECO}
    tem_campos = any(campo in dados for campo in CAMPOS_ENDERECO)

    if tem_campos:
        cep = re.sub(r'\D', '', valores['cep'])
        if cep and len(cep) != 8:
            raise ServiceError('CEP deve conter 8 números.')
        valores['cep'] = f'{cep[:5]}-{cep[5:]}' if cep else ''
        valores['uf'] = valores['uf'].upper()
        if valores['uf'] and not re.fullmatch(r'[A-Z]{2}', valores['uf']):
            raise ServiceError('UF deve conter duas letras.')
        if obrigatorio:
            faltantes = [campo for campo in ('cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf') if not valores[campo]]
            if faltantes:
                raise ServiceError(f"Preencha os campos obrigatórios do endereço: {', '.join(faltantes)}.")

        partes = [
            ', '.join(filter(None, (valores['logradouro'], valores['numero']))),
            valores['complemento'], valores['bairro'],
            ' - '.join(filter(None, (valores['cidade'], valores['uf']))),
            f"CEP {valores['cep']}" if valores['cep'] else ''
        ]
        valores['endereco'] = ', '.join(parte for parte in partes if parte)
    else:
        valores['endereco'] = str(dados.get('endereco', atual.get('endereco', '')) or '').strip()

    if obrigatorio and len(valores['endereco']) < 5:
        raise ServiceError('Informe o endereço completo.')
    if len(valores['endereco']) > 300:
        raise ServiceError('Endereço completo excede 300 caracteres.')
    return valores

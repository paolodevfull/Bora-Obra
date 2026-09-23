from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

from flask import current_app
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.utils import secure_filename

from backend.repositories.loja_repository import LojaRepository
from backend.services.errors import ServiceError


FORMATOS = {'PNG', 'JPEG', 'WEBP'}
EXTENSOES = {'.png', '.jpg', '.jpeg', '.webp'}
FORMATOS_POR_EXTENSAO = {'.png': 'PNG', '.jpg': 'JPEG', '.jpeg': 'JPEG', '.webp': 'WEBP'}
MIMES_POR_FORMATO = {
    'PNG': {'image/png'},
    'JPEG': {'image/jpeg'},
    'WEBP': {'image/webp'},
}
MAX_BYTES = 2 * 1024 * 1024
MIN_DIMENSAO = 48
MAX_DIMENSAO = 4096
PREFIXO_PUBLICO = '/static/uploads/lojas/'


def _loja_autorizada(loja_id, lojista_id):
    loja = LojaRepository.buscar_por_id(loja_id)
    if not loja:
        raise ServiceError('Loja não encontrada.', 404)
    if loja.lojista_id != lojista_id:
        raise ServiceError('Você não tem permissão para alterar esta loja.', 403)
    return loja


def _diretorio_upload():
    diretorio = Path(current_app.config['LOGO_UPLOAD_DIR']).resolve()
    diretorio.mkdir(parents=True, exist_ok=True)
    return diretorio


def _arquivo_interno(url, diretorio):
    caminho_publico = urlsplit(str(url or '')).path
    if not caminho_publico.startswith(PREFIXO_PUBLICO):
        return None
    candidato = (diretorio / Path(caminho_publico).name).resolve()
    return candidato if candidato.parent == diretorio else None


def _apagar_arquivos(urls, diretorio):
    for url in urls:
        arquivo = _arquivo_interno(url, diretorio)
        if arquivo:
            arquivo.unlink(missing_ok=True)


def _abrir_imagem(arquivo):
    nome = secure_filename(arquivo.filename or '')
    extensao = Path(nome).suffix.lower()
    if extensao not in EXTENSOES:
        raise ServiceError('Envie um arquivo PNG, JPEG ou WebP.')
    mime_declarado = str(getattr(arquivo, 'mimetype', '') or '').lower()
    if mime_declarado not in {mime for mimes in MIMES_POR_FORMATO.values() for mime in mimes}:
        raise ServiceError('O tipo do arquivo deve ser PNG, JPEG ou WebP.')

    conteudo = arquivo.read(MAX_BYTES + 1)
    if not conteudo:
        raise ServiceError('Selecione uma imagem para enviar.')
    if len(conteudo) > MAX_BYTES:
        raise ServiceError('O logotipo deve ter no máximo 2 MB.')

    try:
        with Image.open(BytesIO(conteudo)) as verificacao:
            formato = (verificacao.format or '').upper()
            largura, altura = verificacao.size
            verificacao.verify()
        if formato not in FORMATOS:
            raise ServiceError('O conteúdo do arquivo não é PNG, JPEG ou WebP.')
        if formato != FORMATOS_POR_EXTENSAO[extensao] or mime_declarado not in MIMES_POR_FORMATO[formato]:
            raise ServiceError('A extensão e o conteúdo da imagem não correspondem.')
        if not (MIN_DIMENSAO <= largura <= MAX_DIMENSAO and MIN_DIMENSAO <= altura <= MAX_DIMENSAO):
            raise ServiceError('Use uma imagem entre 48 × 48 e 4096 × 4096 pixels.')
        imagem = Image.open(BytesIO(conteudo))
        imagem.seek(0)
        imagem.load()
        resultado = ImageOps.exif_transpose(imagem).convert('RGBA')
        imagem.close()
        return resultado
    except ServiceError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise ServiceError('O arquivo não contém uma imagem válida.')


class LogoLojaService:
    def enviar(self, loja_id, lojista_id, arquivo):
        loja = _loja_autorizada(loja_id, lojista_id)
        if arquivo is None:
            raise ServiceError('Selecione um logotipo para enviar.')

        imagem = _abrir_imagem(arquivo)
        diretorio = _diretorio_upload()
        identificador = uuid4().hex
        nome_logo = f'loja-{loja.id}-{identificador}.webp'
        nome_marcador = f'loja-{loja.id}-{identificador}-marker.webp'
        caminho_logo = diretorio / nome_logo
        caminho_marcador = diretorio / nome_marcador

        try:
            logo = imagem.copy()
            logo.thumbnail((512, 512), Image.Resampling.LANCZOS)
            logo.save(caminho_logo, 'WEBP', quality=86, method=6)
            marcador = ImageOps.fit(imagem, (96, 96), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
            marcador.save(caminho_marcador, 'WEBP', quality=84, method=6)

            urls_antigas = (loja.logo_url, loja.logo_marcador_url)
            loja.logo_url = f'{PREFIXO_PUBLICO}{nome_logo}'
            loja.logo_marcador_url = f'{PREFIXO_PUBLICO}{nome_marcador}'
            LojaRepository.atualizar(loja)
            _apagar_arquivos(urls_antigas, diretorio)
            return loja.to_dict()
        except Exception:
            caminho_logo.unlink(missing_ok=True)
            caminho_marcador.unlink(missing_ok=True)
            raise
        finally:
            imagem.close()

    def remover(self, loja_id, lojista_id):
        loja = _loja_autorizada(loja_id, lojista_id)
        diretorio = _diretorio_upload()
        urls_antigas = (loja.logo_url, loja.logo_marcador_url)
        loja.logo_url = None
        loja.logo_marcador_url = None
        LojaRepository.atualizar(loja)
        _apagar_arquivos(urls_antigas, diretorio)
        return loja.to_dict()

from backend.database import db  # Ajuste o import do banco conforme seu projeto
from backend.models.loja import Loja

class CriarLojaService:
    def executar(self, dados):
        nome = dados.get('nome', '').strip()
        endereco = dados.get('endereco', '').strip()
        telefone = dados.get('telefone', '').strip()

        # Validações de entrada
        if not nome or len(nome) < 3:
            raise ValueError("O nome da loja deve conter pelo menos 3 caracteres.")
        if not endereco or len(endereco) < 5:
            raise ValueError("O endereço da loja deve ser informado corretamente.")

        nova_loja = Loja(
            nome=nome,
            endereco=endereco,
            telefone=telefone
        )
        
        db.session.add(nova_loja)
        db.session.commit()

        return {
            'id': nova_loja.id,
            'nome': nova_loja.nome,
            'endereco': nova_loja.endereco,
            'telefone': nova_loja.telefone
        }
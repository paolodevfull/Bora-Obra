from backend.database.database import db
from backend.models.user import User

def criar_user_service(dados: dict) -> dict:
    nome = dados.get('nome')
    email = dados.get('email')

    if not nome or not email:
        raise ValueError("Nome e E-mail são obrigatórios.")

    try:
        novo_usuario = User(
            nome=nome,
            email=email,
            senha=dados.get('senha', '123456'),
            telefone=dados.get('telefone', '000000000'),
            tipo=dados.get('tipo', 'Cliente')
        )

        db.session.add(novo_usuario)
        db.session.flush()   # Gera o ID do banco antes do commit
        db.session.commit()  # Efetiva no arquivo SQLite

        print(f"✅ Usuário gravado no SQLite com ID: {novo_usuario.id}")

        return {
            "id": novo_usuario.id,
            "nome": novo_usuario.nome,
            "email": novo_usuario.email,
            "tipo": novo_usuario.tipo
        }
    except Exception as e:
        db.session.rollback() # Em caso de falha, descarta a transação
        print(f"❌ Erro ao salvar no banco: {str(e)}")
        raise
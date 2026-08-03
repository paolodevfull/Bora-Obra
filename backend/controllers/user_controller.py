from flask import Blueprint, request, jsonify
from backend.services.user.criar_user import criar_user_service
from backend.models.user import User

user_bp = Blueprint('users', __name__, url_prefix='/api/users')

# GET: Listar todos os usuários
@user_bp.route('', methods=['GET'])
def listar_usuarios():
    users = User.query.all()
    # Mapeando manualmente para não depender de u.to_dict()
    lista = [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "tipo": u.tipo
        } for u in users
    ]
    return jsonify(lista), 200


# GET: Buscar usuário por ID
@user_bp.route('/<int:id>', methods=['GET'])
def buscar_usuario(id):
    user = User.query.get_or_404(id)
    return jsonify({
        "id": user.id,
        "nome": user.nome,
        "email": user.email,
        "tipo": user.tipo
    }), 200


# POST: Criar novo usuário (usando a Service Layer)
@user_bp.route('', methods=['POST'])
def criar_usuario():
    try:
        dados = request.get_json() or {}
        
        # Garante valores padrões para testes caso não venham no formulário
        if 'senha' not in dados or not dados['senha']:
            dados['senha'] = '123456'
            
        novo_usuario = criar_user_service(dados)
        return jsonify(novo_usuario), 201

    except ValueError as e:
        return jsonify({'erro': str(e)}), 400
    except Exception as e:
        return jsonify({'erro': f'Erro interno: {str(e)}'}), 500


# DELETE: Deletar usuário
@user_bp.route('/<int:id>', methods=['DELETE'])
def deletar_usuario(id):
    user = User.query.get_or_404(id)
    from backend.database.database import db
    db.session.delete(user)
    db.session.commit()
    return jsonify({'mensagem': 'Usuário removido com sucesso'}), 200
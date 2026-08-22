from backend.models.loja import Loja  # Ajuste o import conforme o local do seu Model

class ListarLojasService:
    def executar(self):
        try:
            lojas = Loja.query.all()
            return [{
                'id': l.id,
                'nome': l.nome,
                'endereco': l.endereco,
                'telefone': l.telefone
            } for l in lojas]
        except Exception as e:
            raise Exception(f"Erro ao buscar lojas no banco: {str(e)}")
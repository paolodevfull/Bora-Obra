from flask import Blueprint, redirect, render_template, request, url_for

from backend.models import Produto, db



produto_bp = Blueprint("produto", __name__, url_prefix="/produtos")


@produto_bp.route("/")
def index():
    produtos = Produto.listar()
    return render_template("lista.html", produtos=produtos)


@produto_bp.route("/cadastrar", methods=["GET", "POST"])
def cadastrar():
    if request.method == "POST":
        produto = Produto(
            nome=request.form["nome"],
            categoria=request.form["categoria"],
            preco_venda=request.form["preco_venda"],
            preco_locacao=int(request.form["preco_locacao"]),
            utilidade=request.form["utilidade"],
        )
        db.session.add(produto)
        db.session.commit()
        return redirect(url_for("produto.index"))
    return render_template("formulario.html")


@produto_bp.route("/editar/<int:id>", methods=["GET", "POST"])
def editar(id):
    produto = db.session.get(Produto, id)
    if request.method == "POST":
        produto.nome = request.form["nome"]
        produto.categoria = request.form["categoria"]
        produto.preco_venda = request.form["preco_venda"]
        produto.preco_locacao = int(request.form["preco_locacao"])
        produto.utilidade= request.form["utilidade"]
        db.session.commit()
        return redirect(url_for("produto.index"))
    return render_template("formulario.html", produto=produto)


@produto_bp.route("/excluir/<int:id>")
def excluir(id):
    produto = db.session.get(Produto, id)
    db.session.delete(produto)
    db.session.commit()
    return redirect(url_for("produto.index"))
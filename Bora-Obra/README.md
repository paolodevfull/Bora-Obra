# BoraObra 🛠️

## Integrantes da equipe
* Felipe Matos Carvalho 
* Miguel Dias Xavier Lopes 
* Moisés Caldeira Brant
* Murilo Dias Oliveira 
* Otávio Cesar Nunes de Oliveira 
* Paolo Eduardo Monteiro Lopes de Andrade 

O **BoraObra** é uma plataforma B2B2C para digitalizar depósitos de bairro e locadoras de ferramentas — unifica venda, locação e expedição em um único sistema, substituindo o controle manual em papel.

---

## 🏗️ Arquitetura do Sistema

Arquitetura em camadas, priorizando o **Princípio da Responsabilidade Única (SRP)**:

* **Controllers:** Classes responsáveis pelo mapeamento das rotas Flask, tratando requisições HTTP e retornando respostas em JSON.
* **Services (`XService.executar()`):** Uma classe por caso de uso, contendo as regras de negócio.
* **Models (SQLAlchemy):** Classes de domínio herdando de `db.Model`.
* **Repositories:** Abstrai consultas complexas (filtros dinâmicos, relatórios) sem poluir Models nem Services.

---

## 🚀 Funcionalidades

### Autenticação e perfis de usuário
- Cadastro e login com senha (hash), sessão persistente.
- Três tipos de conta — **Cliente**, **Lojista**, **Entregador** — cada um com sua própria experiência:
  - **Lojista:** painel de gestão (dashboard, lojas, usuários, produtos, pedidos — somente leitura).
  - **Cliente:** busca lojas, navega pelo catálogo, monta um pedido (venda ou locação) e acompanha o status em "Meus pedidos".
  - **Entregador:** tela de "em breve" (funcionalidade ainda não implementada).

### Gestão (painel do lojista)
- Cadastro de lojas, usuários e produtos (venda e locação).
- Toggle de disponibilidade imediata do produto (Curva A).
- Busca de produtos por utilidade/categoria.
- Dashboard com faturamento total, total de pedidos e lucro estimado (margem de 35%).
- Visualização de todos os pedidos recebidos, com cliente, endereço de entrega e status — sem poder criar ou apagar.

### Compra (painel do cliente)
- Catálogo por loja, com alternância entre preço de venda e de locação.
- Carrinho com cálculo automático do total.
- Pedido com endereço de entrega e forma de pagamento.
- Histórico de pedidos próprios com status.

### Pedidos e expedição
- Pedido com itens reais (produto + quantidade + valor unitário), não apenas um valor total solto.
- Geração de ticket térmico com todos os itens, código, forma de pagamento e endereço de entrega.

---

## 💻 Tecnologias Utilizadas

* **Backend:** Python, Flask, Flask-SQLAlchemy, SQLite, Werkzeug (hash de senha)
* **Frontend:** HTML5, CSS3, JavaScript (SPA — single page application)
* **Arquitetura:** Layered Architecture com padrão Repository e Services orientados a caso de uso

---

## ⚙️ Como rodar localmente

```bash
# 1. Instalar dependências
pip install -r requirements.txt

# 2. Rodar a aplicação (cria o banco automaticamente na primeira execução)
python app.py
```

A aplicação sobe em `http://127.0.0.1:5000`.

> ⚠️ Se você já tinha um banco de dados de uma versão anterior do projeto, apague `backend/database/bora_obra.db` antes de rodar — os models mudaram (colunas novas como `senha_hash` e `endereco_entrega`) e o SQLite não migra automaticamente.

---

## 📁 Estrutura de pastas

```
Bora-Obra/
├── backend/
│   ├── controllers/      # Rotas da API Flask
│   ├── database/         # Configuração do banco e arquivo SQLite
│   ├── models/            # Entidades do SQLAlchemy
│   ├── repositories/      # Consultas complexas e relatórios
│   └── services/           # Regras de negócio, isoladas por domínio
├── frontend/
│   ├── static/
│   │   ├── css/style.css
│   │   └── js/main.js
│   └── templates/
│       └── index.html      # SPA única (painel lojista + painel cliente + placeholder entregador)
├── app.py                  # Ponto de entrada do Flask
└── README.md
```

---

## 🗺️ Próximos passos

Consulte `BoraObra_Raio-X_e_Plano_de_Acao.md` para o histórico de decisões e a lista de melhorias pendentes (ex: padronização de services, módulo de estoque, módulo de entrega, atualização de status do pedido pelo lojista).
# BoraObra 🛠️

O **BoraObra** é uma plataforma desenvolvida para facilitar a gestão, locação e venda de equipamentos e suprimentos de construção civil. 

---

## 🏗️ Arquitetura do Sistema

O projeto adota uma arquitetura em camadas bem definida, priorizando o **Princípio da Responsabilidade Única (SRP)** e os padrões de projeto recomendados pela disciplina:

* **Controllers (Orientadas a Objetos):** Classes responsáveis pelo mapeamento das rotas Flask, tratando requisições HTTP e retornando respostas em formato JSON.
* **Services (Casos de Uso):** Classes isoladas por funcionalidade (uma classe/arquivo por caso de uso), contendo as regras de negócio do sistema.
* **Models (SQLAlchemy):** Classes de domínio herdando de `db.Model`, integradas com os métodos de persistência convencionais (`salvar()`, `atualizar()`, `deletar()`, `listar_todos()`, `buscar_por_id()`).
* **Repositories:** Camada responsável por abstrair consultas complexas, filtros dinâmicos e geração de dados para relatórios sem poluir as Models nem os Services.

---

## 🚀 10 Funcionalidades Implementadas

1. **Cadastrar Usuário:** Registro completo de usuários (clientes, lojistas e entregadores).
2. **Cadastrar Loja:** Cadastro e gerenciamento das unidades e lojas parceiras.
3. **Cadastrar Produto:** Registro de itens com suporte a valores de venda e locação.
4. **Listar Produtos:** Consulta e exibição do catálogo geral de produtos cadastrados.
5. **Alternar Disponibilidade de Produto (Toggle Curva A):** Permite ativar ou desativar rapidamente a disponibilidade de um item para locação/venda imediata.
6. **Buscar Produtos por Utilidade/Obra e Categoria:** Filtro dinâmico e avançado via Repository para localizar materiais específicos pela etapa da obra ou utilidade.
7. **Registrar Pedido:** Criação e vinculo de novos pedidos associando o cliente e a loja responsável.
8. **Consultar Histórico de Pedidos:** Listagem detalhada dos pedidos realizados no sistema.
9. **Gerar Ticket Térmico de Expedição:** Emissão de comanda formatada para impressão/envio ao entregador ou motoboy com resumo do pedido e endereço.
10. **Gerar Relatório Financeiro e Lucro Diário:** Dashboard consolidado via Repository com faturamento total do dia e estimativa de lucro bruto.

---

## 💻 Tecnologias Utilizadas

* **Backend:** Python, Flask, Flask-SQLAlchemy, SQLite
* **Frontend:** HTML5, CSS3, JavaScript
* **Arquitetura:** MVC / Layered Architecture com Pattern Repository e Service-Oriented Use Cases
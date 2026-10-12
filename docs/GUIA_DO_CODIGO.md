# Guia para entender e evoluir o código

## Ordem recomendada de leitura

1. `app.py` para entender inicialização, páginas, middlewares e erros.
2. `backend/config/settings.py` e `.env.example` para configuração.
3. `backend/controllers/` para conhecer os contratos HTTP.
4. `backend/services/acesso.py` para autenticação e isolamento.
5. Um domínio completo: controller → service → repository → model.
6. `frontend/static/js/main.js`, `components.js` e `api.js`.
7. A página e o módulo JS da funcionalidade desejada.
8. `tests/` para observar comportamentos esperados.

## Inicialização

`python app.py` chama `create_app()`. A factory carrega `.env`, aplica configurações, inicia SQLAlchemy, registra blueprints, configura CSRF e headers, registra páginas estáticas e valida o MySQL. O frontend é servido pelo mesmo host; não há servidor separado nem CORS no desenvolvimento normal.

## Exemplo completo: criação de pedido

1. `catalogo.js` reúne loja, modalidade, endereço e itens e envia `POST /api/pedidos` com `Idempotency-Key`.
2. `api.js` adiciona cookie e `X-CSRF-Token`.
3. `pedido_controller.py` obtém o usuário da sessão e chama `CriarPedidoService`.
4. `criar_pedido.py` valida cliente, loja, datas, itens, disponibilidade e estoque.
5. `ProdutoRepository.buscar_ids_para_atualizacao()` bloqueia produtos no MySQL.
6. O service usa preços persistidos, calcula `Decimal` e altera estoque.
7. `PedidoRepository.criar_com_itens()` grava pedido e itens em uma transação.
8. A resposta volta em JSON; um retry com a mesma chave retorna o pedido existente.

## Como adicionar uma página

1. Crie o HTML em `frontend/cliente/` ou `frontend/lojista/`.
2. Use `data-page` compatível com `components.js`.
3. Adicione a página à allowlist correspondente em `app.py`.
4. Crie um módulo JS externo; não use handlers inline.
5. Registre ações em `main.js` e reutilize `apiRequest()`.
6. Adicione link ao shell compartilhado e teste navegação direta e responsividade.

## Como adicionar um endpoint

1. Defina o contrato e os perfis permitidos.
2. Crie ou reutilize um service; não coloque regra no controller.
3. Use `json_body()` e `@endpoint` para JSON e erros esperados.
4. Autorize com `AcessoService`; não confie em IDs do navegador.
5. Registre a rota no blueprint apropriado.
6. Atualize `docs/API.md` e escreva teste de sucesso, validação e permissão.

## Como adicionar model, regra e consulta

- Model: declare tipos, nulabilidade, defaults, FKs e relacionamentos em `backend/models/`; exporte em `models/__init__.py`.
- Regra: crie uma classe de caso de uso em `backend/services/<domínio>/`.
- Consulta: mantenha CRUD simples no repository/ORM; consultas extensas podem ir para `database/sql/queries/` somente quando houver benefício comprovado.
- Escritas compostas devem usar uma transação com rollback e bloqueio quando houver concorrência.
- Dinheiro usa `Numeric/DECIMAL`, nunca `float` para cálculo.

## Como criar uma migration

1. Não edite dados destrutivamente sem autorização e backup.
2. Crie `backend/database/sql/migrations/AAAAMMDD_descricao.sql`.
3. Consulte `information_schema` antes de adicionar coluna ou índice.
4. Atualize model e schema de instalação nova.
5. Execute em banco de desenvolvimento e depois no `_test`.
6. Rode `python -m backend.database.check_connection` e a suíte.

O projeto ainda não usa Alembic; a ordem das migrations é o nome do arquivo.

## Variáveis de ambiente

Adicione a variável a `.env.example`, leia-a em `settings.py` ou no módulo responsável, defina fallback somente se for seguro e documente obrigatoriedade e formato no README. Nunca versionar `.env`.

## JavaScript, CSS e APIs

- use módulos ES e funções pequenas;
- escape texto antes de inserir em `innerHTML`;
- use `textContent` quando HTML não for necessário;
- centralize HTTP em `api.js`;
- cancele buscas obsoletas com `AbortController` e aplique debounce;
- use tokens de `tokens.css` em vez de cores fixas;
- mantenha o seletor de tema apenas em Configurações.

## Como escrever um teste

Adicione cenários em `tests/test_fluxo.py` ou `tests/test_relatorios.py`. A factory aceita URI de teste, mas recusa recriar bancos sem sufixo `_test`. Teste comportamento público: status HTTP, payload, persistência, autorização e rollback. Execute um teste específico com:

```powershell
$env:TEST_DB_NAME="bora_obra_test"
python -m unittest tests.test_fluxo.FluxoTest.test_complete_rental_and_sale_flow -v
```

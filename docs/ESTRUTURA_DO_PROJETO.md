# Estrutura do projeto

```text
Bora-Obra/
├── app.py
├── requirements.txt
├── .env.example
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   │   └── sql/{schema,migrations}/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   └── services/{loja,pedido,produto,relatorio,user}/
├── frontend/
│   ├── login.html
│   ├── cadastro.html
│   ├── cliente/
│   ├── lojista/
│   └── static/{css,img,js,vendor}/
├── tests/
├── docs/
├── CONTRIBUTING.md
└── README.md
```

## Raiz

- `app.py`: ponto de entrada e factory `create_app()`.
- `requirements.txt`: dependências Python e faixas aceitas.
- `.env.example`: catálogo seguro de variáveis.
- `.gitignore`: exclui ambiente, segredos, caches, bancos e uploads.

## Backend

- `config/settings.py`: configuração central por ambiente.
- `controllers/`: blueprints de autenticação, usuários, lojas, produtos, pedidos e relatórios.
- `controllers/http.py`: leitura de JSON e conversão de `ServiceError`.
- `middleware/request_context.py`: request ID, duração e log de lentidão.
- `models/`: `User`, `Loja`, `Produto`, `Pedido`, `ItemPedidos`, `Estoque` e `Entrega`.
- `repositories/`: primitivas de persistência e consultas específicas.
- `services/`: casos de uso agrupados por domínio; `acesso.py` centraliza autorização.
- `database/connection.py`: URL MySQL e teste de conexão.
- `database/initialize.py`: validação não destrutiva do schema.
- `database/sql/schema/bora_obra.sql`: instalação nova.
- `database/sql/migrations/`: índices de relatórios e idempotência de pedidos.

Não existem arquivos ativos em `queries/`, `procedures/` ou `views`; as consultas atuais permanecem no ORM por não justificarem SQL duplicado.

## Frontend

- `login.html` e `cadastro.html`: entrada pública.
- `cliente/`: início, catálogo, detalhes de produto, conta e pedidos.
- `lojista/`: painel, loja/configurações, funcionários, produtos, pedidos e relatórios.
- `static/js/main.js`: inicialização e roteamento de ações declarativas.
- `static/js/components.js`: shells e componentes compartilhados.
- `static/js/api.js`: fetch, CSRF, erros e sessão expirada.
- `static/js/auth.js`: login, cadastro e conta.
- `static/js/catalogo.js`: lojas, filtros, produto, locação, carrinho e checkout.
- `static/js/gestao.js`: operações do lojista.
- `static/js/relatorios.js`: filtros, gráficos e exportações.
- `static/js/mapa-lojas.js`: Leaflet, marcadores e distância.
- `static/css/tokens.css`: tokens de tema; `style.css` e `relatorios.css`: apresentação.
- `static/vendor/`: Chart.js e Leaflet locais.

## Testes e documentação

- `tests/test_fluxo.py`: autenticação, permissões, CRUD, pedidos, estoque, upload e infraestrutura.
- `tests/test_relatorios.py`: combinações de filtros, rankings e exportações.
- `tests/mysql_test_config.py`: URL segura do banco `_test`.
- `docs/`: arquitetura, API, banco, estrutura, guia, manual, segurança e solução de problemas.

Caches, `.env`, `.venv`, bancos locais, artefatos, logs e uploads não fazem parte da estrutura versionada.

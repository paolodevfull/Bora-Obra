# Arquitetura do BoraObra

## Visão geral

O BoraObra é uma aplicação web em camadas. O Flask serve páginas HTML estáticas e uma API JSON. A interface é renderizada no navegador com JavaScript Vanilla; não há Jinja.

```text
Navegador (HTML por página + módulos JS + CSS)
        │ fetch + cookie de sessão + CSRF
        ▼
Flask (controllers → services → repositories → models)
        │
        ▼
SQLite no desenvolvimento
```

## Diretórios

- `app.py`: fábrica da aplicação, configuração, páginas e proteções HTTP.
- `backend/controllers`: rotas `/api` e protocolo HTTP.
- `backend/services`: casos de uso, autorização e regras de negócio.
- `backend/repositories`: consultas e transações.
- `backend/models`: entidades SQLAlchemy.
- `backend/database`: inicialização e migrações aditivas legadas.
- `frontend/cliente`: páginas do comprador.
- `frontend/lojista`: páginas do lojista e funcionário.
- `frontend/static/js`: componentes e módulos por responsabilidade.
- `frontend/static/css`: tokens visuais e estilos.
- `frontend/static/vendor`: Chart.js e Leaflet locais.
- `tests`: testes de integração e infraestrutura.

## Autenticação e autorização

A autenticação utiliza sessão Flask em cookie `HttpOnly` e `SameSite=Lax`. Operações de alteração exigem um token obtido em `GET /api/auth/csrf`; o cliente HTTP adiciona o token automaticamente.

Controllers não devem confiar em IDs enviados pelo navegador para determinar a loja ou a conta autenticada. A autorização fica nos serviços `AcessoService` e `AcessoProdutoService`.

## Fluxo de pedido

1. O cliente seleciona produtos de uma loja.
2. O backend recalcula preços e valida loja, modalidade, disponibilidade e estoque.
3. Vendas reduzem o estoque na mesma transação do pedido.
4. O lojista altera `Pendente → Confirmado → Despachado`.
5. O cliente confirma `Despachado → Entregue`.

Locações validam o estoque físico, mas ainda registram somente a quantidade de dias. Datas de início/fim e reservas concorrentes exigem evolução do schema.

## Decisões e dívida técnica

- Não há framework nem etapa de build no frontend.
- Chart.js e Leaflet são servidos localmente e somente nas páginas que precisam deles.
- ViaCEP roda no navegador; Nominatim e BrasilAPI são consultados pelo backend.
- Coordenadas ficam persistidas para evitar geocodificação a cada abertura do mapa.
- Dinheiro e datas ainda seguem o schema legado (`Float` e texto). A migração para `Numeric` e `DateTime` deve usar Alembic e backup.

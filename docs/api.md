# API BoraObra

As respostas usam JSON, exceto a exportação XML. Rotas autenticadas dependem do cookie de sessão. Requisições `POST`, `PUT`, `PATCH` e `DELETE` exigem `X-CSRF-Token`.

## Autenticação

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/auth/csrf` | Cria ou retorna o token CSRF |
| POST | `/api/auth/login` | Autentica uma conta |
| POST | `/api/auth/logout` | Encerra a sessão |
| GET | `/api/auth/me` | Retorna a conta autenticada |

O login é limitado após tentativas inválidas repetidas. Não há recuperação de senha nesta versão.

## Usuários

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| POST | `/api/users` | Público/lojista | Cadastro de conta ou funcionário |
| GET | `/api/users` | Lojista | Lista funcionários vinculados |
| PUT/PATCH | `/api/users/me` | Autenticado | Atualiza a própria conta |
| PUT/PATCH | `/api/users/<id>` | Lojista | Atualiza funcionário próprio |
| DELETE | `/api/users/<id>` | Lojista | Exclui funcionário próprio |

## Lojas e produtos

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/api/lojas` | Público/autenticado | Lojas ativas ou visão administrativa do proprietário |
| POST | `/api/lojas` | Lojista | Cadastra a loja |
| PUT/PATCH | `/api/lojas/<id>` | Proprietário | Atualiza a loja |
| GET | `/api/produtos` | Público/autenticado | Lista produtos permitidos ao perfil |
| GET | `/api/produtos/buscar` | Público | Busca por utilidade/categoria |
| POST | `/api/produtos` | Loja autenticada | Cadastra produto |
| PUT/PATCH | `/api/produtos/<id>` | Loja responsável | Atualiza produto |
| DELETE | `/api/produtos/<id>` | Loja responsável | Exclui produto sem pedidos vinculados |
| PATCH | `/api/produtos/<id>/toggle-disponibilidade` | Loja responsável | Alterna disponibilidade |

## Pedidos

| Método | Rota | Acesso | Finalidade |
|---|---|---|---|
| GET | `/api/pedidos` | Autenticado | Lista pedidos permitidos ao perfil |
| POST | `/api/pedidos` | Cliente | Cria pedido; preços são recalculados no servidor |
| GET | `/api/pedidos/<id>/ticket` | Participante | Retorna o ticket |
| PATCH | `/api/pedidos/<id>` | Loja | Executa transição de status válida |
| PATCH | `/api/pedidos/<id>/cancelar` | Cliente proprietário | Cancela quando permitido |
| PATCH | `/api/pedidos/<id>/confirmar-entrega` | Cliente proprietário | Confirma pedido despachado |

Pedidos de locação podem enviar `data_inicio_locacao` e `data_fim_locacao` no formato
`AAAA-MM-DD`. Quando o período é informado, o servidor valida as datas e calcula a
quantidade de diárias; o valor de `dias_locacao` recebido nos itens não é usado para
substituir esse cálculo.

## Relatórios

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/relatorios/lucro-diario` | Resumo diário legado, sem lucro fictício |
| GET | `/api/relatorios/detalhado` | Relatório filtrado da loja |
| GET | `/api/relatorios/detalhado.xml` | XML com os mesmos filtros |

Filtros: `inicio`, `fim`, `tipo`, `status`, `pagamento`, `cliente`, `produto` e `categoria`. O período máximo é 366 dias.

## Erros

Erros esperados usam `{ "erro": "mensagem amigável" }`. Códigos principais: `400`, `401`, `403`, `404`, `429` e `500`.

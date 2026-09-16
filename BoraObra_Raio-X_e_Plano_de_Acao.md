# BoraObra — Raio-X do Projeto e Plano de Ação

Documento de organização gerado a partir da revisão de todos os arquivos de `frontend/` e `backend/`, cruzados com o Relatório de Elicitação de Requisitos. Objetivo: servir de checklist para decidir por onde começar as melhorias.

---

## 1. Front-end (`frontend/`)

### 1.1 Decisão já tomada
- **Manter apenas o SPA (`index.html` + `main.js` + `style.css`)** como interface oficial do painel do lojista.
- As páginas soltas `lojas.html`, `usuarios.html`, `produtos.html`, `pedidos.html` e seus JS (`lojas.js`, `usuarios.js`, `produtos.js`, `pedidos.js`) devem ser **removidas** da pasta `frontend/` quando for conveniente — hoje não têm rota ativa no `app.py`, e mesmo que tivessem, enviam campos que não existem no banco atual (ver seção 2.3).

### 1.2 Já entregue (versão desktop)
- Layout desktop com topbar fixa (marca, seletor de loja, busca, usuário) + sidebar de navegação.
- Dashboard assimétrico (card de faturamento em destaque + pedidos + lucro).
- Identidade visual própria: paleta grafite/laranja/azul, tipografia Barlow Condensed + Inter + IBM Plex Mono.
- Todos os IDs e funções que o `main.js` usa foram preservados — nenhuma lógica quebrada.

### 1.3 Pendente (visual, sem lógica nova)
| Item | Descrição | Relacionado a |
|---|---|---|
| Dashboard de KPIs | Adicionar campos de tempo médio de atendimento e horário de pico | Requisito 6 |
| Toggle de disponibilidade | Trocar botão texto 🟢/🔴 por um switch visual de verdade | Requisito 14, dor "risco de vender item já alugado" |
| Busca por situação | Placeholder da busca deixar claro que aceita "situação" (ex: "furar concreto"), não só nome técnico | Nota 4-5 na pesquisa |
| Papel do usuário na topbar | Hoje mostra "Operador" genérico; preparar UI para refletir vendedor/estoquista/gerente/entregador | Requisito 7 |
| Modal de ticket | Conferir se o layout do `ticket-card` comporta itens, código, quantidade, forma de pagamento e QR code quando o back enviar esses dados | Pesquisa (seção "o que não pode faltar no ticket") |
| Logo | Decidir se troca o ícone vetorial `fa-helmet-safety` pelo `logo.png` enviado | Pendente de resposta sua |

---

## 2. Back-end (`backend/`)

### 2.1 Rotas órfãs / desconectadas
Código que existe mas não está registrado em lugar nenhum — não quebra nada hoje, mas também não funciona:

- **`index_controller.py`** define `GET /` retornando um JSON de status, mas não está registrado no `app.py` (que já tem sua própria rota `/` renderizando `index.html`). Risco de conflito se alguém registrar o blueprint no futuro.
- **`estoque_controller.py` não existe.** `criar_estoque.py` e `editar_estoque.py` (services) e o model `Estoque` existem e são válidos, mas não há rota `/api/estoques` conectando isso ao front.
- **`entrega_controller.py` não existe**, e o service `criar_entrega.py` importa `backend.models.entrega.Entrega`, **model que não existe em nenhum arquivo enviado**. Se algo tentar importar esse service hoje, quebra com `ImportError`.

### 2.2 Inconsistência de padrão entre services
A maior parte segue `XService` com método `.executar()` (User, Loja, Pedido, a maioria de Produto e Relatório). Mas:
- `editar_produto.py`, `deletar_produto.py`, `criar_estoque.py`, `editar_estoque.py`, `criar_entrega.py` são **funções soltas**, não classes.
- Esses mesmos arquivos levantam `KeyError` em vez de `ValueError` — e os controllers só capturam `ValueError`. Ou seja, se fossem conectados a uma rota hoje, um erro de "não encontrado" cairia como 500 (erro interno) em vez do 404 esperado.

### 2.3 Campos que o front antigo manda mas o model não tem
- `produtos.js`/`produtos.html` (antigo) mandam `cor_tamanho` e `descricao`. O model `Produto` **não tem essas colunas**.
- `editar_produto.py` (service) também tenta gravar `produto.descricao` e `produto.cor_tamanho` — mesmo problema, silenciosamente não persiste no banco.
- `lojas.js`/`lojas.html` (antigo) mandam `cnpj`, `localizacao`, `user_id`, `catalogo_ferramentas`. O model `Loja` só tem `nome`, `endereco`, `telefone`.

### 2.4 Duplicação de código nos models
- `ModeloBase` (com `id`, `created_at`, `to_dict()` automáticos) só é usado por `Estoque` e `ItemPedidos`.
- `Loja`, `Pedido`, `Produto` e `User` reimplementam manualmente `salvar()`, `atualizar()`, `deletar()`, `listar_todos()`, `buscar_por_id()` e `to_dict()` — código repetido 4 vezes que `ModeloBase` já resolveria.

### 2.5 Pedido sem itens reais
- O model `ItemPedidos` existe (quantidade, valor unitário, FK para pedido e produto), mas `Pedido` **não declara nenhum `db.relationship`** apontando para ele.
- Consequência direta: `gerar_ticket_pedido.py` só retorna cabeçalho, data, loja, cliente, tipo, valor total, status e observação — **sem lista de itens, código, quantidade, forma de pagamento ou QR code**, tudo isso pedido explicitamente na pesquisa com os lojistas.

### 2.6 Relatório de lucro não filtra por dia
- `RelatorioRepository.calcular_lucro_e_resumo_diario()` soma **todos os pedidos da tabela**, sem filtro de data — apesar do nome dizer "diário". Hoje o dashboard mostra acumulado histórico, não o dia atual.
- A margem de 35% é fixa (hardcoded), o que é coerente com o requisito de "lucro estimado" — não é um bug.

### 2.7 Requisitos do relatório sem nenhum código correspondente
Não apareceu nenhum arquivo relacionado a:
- Sincronização em tempo real / nuvem (WebSocket, polling) — Requisito 1
- Check-in via QR Code / totem — Requisito 2
- Roteirização de separação no depósito — Requisito 3
- Integração com leitor de código de barras/RFID — Requisito 4
- Notificações push/SMS — Requisito 5
- Autenticação real (login hoje é decorativo no front, sem token/sessão) — Requisito 7
- Modo offline-first — Requisito 8
- Grade de atributos (cor, tamanho) persistente — Requisito 9
- API de logística externa — Requisito 10
- Busca por faixa de preço (`ProdutoRepository` só tem utilidade + categoria) — parte do Requisito 12
- Planos de assinatura — Requisito 15
- Split de pagamento — Requisito 17
- Escolha retirada vs. delivery — Requisito 18
- Mapa de lojas próximas — Requisito 19 (esse é do app do cliente final, não do painel do lojista)
- Locação com prazo de contrato definido — Requisito 20

---

## 3. Sugestão de ordem de prioridade

Pensando em "o que destrava mais coisa com menos esforço" e no que já dói mais segundo a pesquisa com os lojistas:

1. **Conectar itens ao pedido** (`ItemPedidos` + relationship em `Pedido`) — desbloqueia o ticket completo, que é a dor nº1 mencionada na pesquisa (motoboy, conferência, ticket incompleto).
2. **Padronizar os services** (todos como classe `.executar()`, todos levantando `ValueError`) — evita bugs silenciosos antes de conectar Estoque e Entrega a rotas novas.
3. **Resolver os campos órfãos do Produto** (`cor_tamanho`, `descricao`) — decidir se entram no model ou se são removidos de vez dos services/front antigo.
4. **Criar `estoque_controller.py`** — o resto já existe, só falta conectar.
5. **Decidir o destino de `criar_entrega.py`** — criar o model `Entrega` e o controller, ou remover se não for prioridade agora.
6. **Filtrar relatório por dia** — ajuste pequeno com impacto direto no dashboard.
7. **Remover `index_controller.py` ou lhe dar um propósito** (ex: healthcheck em outra rota, tipo `/api/status`).
8. **Refatorar models para usar `ModeloBase`** — reduz duplicação, mas não é urgente (não quebra nada hoje).
9. Requisitos maiores (autenticação real, offline-first, split de pagamento, integração de hardware) — ficam para depois, são mudanças estruturais maiores.

---

*Documento gerado para planejamento interno do projeto BoraObra — não reflete alterações já aplicadas ao código.*

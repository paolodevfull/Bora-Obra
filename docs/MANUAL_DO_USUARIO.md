# Manual do usuário

## Cliente

### Cadastro e acesso

1. Abra **Criar minha conta**.
2. Informe nome, e-mail, telefone, endereço e uma senha que cumpra os requisitos.
3. Entre com e-mail e senha. Não há recuperação de senha nesta versão.
4. No menu do perfil, abra **Configurações** para atualizar dados, endereço ou tema.

### Lojas, mapa e produtos

Na página inicial, autorize a localização apenas se quiser ordenar e filtrar lojas por distância. A posição permanece no navegador. Se negar, use a busca por nome/endereço e a lista normalmente. Selecione uma loja pelo marcador ou cartão e abra **Produtos**.

Use os filtros de compra/locação, categoria, loja, preço e disponibilidade. Abra o produto para ver dados completos. Em locação, escolha retirada e devolução na página do produto antes de adicionar.

### Carrinho e pedido

1. Escolha quantidade e adicione produtos da mesma loja/modalidade.
2. Revise itens, período, endereço e forma de pagamento.
3. Confirme uma vez; se a conexão repetir a solicitação, a chave idempotente evita duplicação.
4. O preço final e o estoque são conferidos pelo servidor.

### Acompanhamento e cancelamento

Em **Pedidos**, consulte produtos, total, loja, datas e status. Pedido pendente pode ser cancelado; venda cancelada devolve estoque. Quando a loja marcar como despachado, o cliente pode confirmar a entrega. O ticket pode ser consultado pelos participantes do pedido.

## Lojista

### Primeiros passos

1. Entre com perfil lojista.
2. Em **Configurações/Loja**, cadastre dados, endereço completo e status.
3. Envie logotipo PNG, JPEG ou WebP; ele será otimizado e usado no mapa.
4. Confira a posição. Se estiver incorreta, revise CEP, número, bairro, cidade e UF e salve novamente.

### Dashboard

O painel apresenta indicadores calculados dos pedidos, estoque, modalidades e gráficos. Selecione período e use **Atualizar dados**. Ausência de dados é mostrada como estado vazio, não como valor fictício.

### Funcionários

Cadastre nome, e-mail, telefone e senha. É possível editar, ativar/desativar e excluir quando não houver vínculos impeditivos. Funcionários acessam produtos e pedidos da loja, mas não administram funcionários nem outra loja.

### Produtos e estoque

Cadastre nome, categoria, utilidade, descrição, SKU, unidade, imagem, preços, estoque e modalidades. Manutenção e disponibilidade impedem operações incompatíveis. O estoque de venda é reduzido no pedido e restaurado no cancelamento permitido.

### Pedidos

A loja vê apenas pedidos recebidos por ela. Transições permitidas:

```text
Pendente → Confirmado → Despachado → Entregue
        ↘ Cancelado ↙
```

Não pule etapas. Funcionários podem operar pedidos da loja vinculada.

### Relatórios

Escolha período, modalidade, status, pagamento, cliente, região, categoria e produtos. A seleção de produtos é agrupada por categoria. Defina análise, critério, ranking e quantidade e clique em **Atualizar relatório**. Exporte XML, PDF ou PNG; todos usam os mesmos filtros.

Os valores confirmados incluem pedidos `Confirmado`, `Despachado` e `Entregue`; não representam confirmação bancária, pois o sistema não processa pagamentos reais.

### Tema e saída

O tema Claro/Escuro/Sistema fica em Configurações e permanece no navegador. No celular, abra o menu recolhível para navegar e sair.

## Mensagens comuns

- **Sessão de segurança expirou:** atualize a página e repita.
- **Quantidade indisponível:** reduza a quantidade ou solicite atualização do estoque.
- **Loja não está recebendo pedidos:** o lojista precisa reativá-la.
- **Não foi possível localizar a loja:** corrija o endereço e salve.
- **Seu perfil não tem permissão:** entre com a conta adequada ou fale com o responsável.

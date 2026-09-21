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
- Três perfis operacionais — **Cliente**, **Lojista** e **Funcionário** — cada um com sua própria experiência:
  - **Lojista:** painel de gestão para lojas, funcionários, produtos, pedidos e indicadores.
  - **Cliente:** busca lojas, navega pelo catálogo, monta um pedido (venda ou locação) e acompanha o status em "Meus pedidos".
  - **Funcionário:** opera produtos e pedidos vinculados à loja do lojista responsável.

### Gestão (painel do lojista)
- Cadastro e edição da loja, funcionários e produtos (venda e locação).
- Toggle de disponibilidade imediata do produto (Curva A).
- Busca de produtos por utilidade/categoria.
- Dashboard responsivo com indicadores de faturamento, pedidos, vendas, locações e estoque.
- Gráficos de faturamento, situação dos pedidos e vendas versus locações com **Chart.js**.
- Filtro de período e estados de carregamento, conteúdo vazio e erro, sem métricas fictícias.
- Visualização dos pedidos recebidos, atualização de status e impressão de ticket térmico.

### Compra (painel do cliente)
- Catálogo por loja, com alternância entre preço de venda e de locação.
- Mapa no início do marketplace com lojas próximas, raio configurável e seleção da loja pelo marcador.
- Localização atual acompanhada com a **Geolocation API** do navegador, mediante autorização do cliente.
- Distância entre cliente e loja calculada no frontend pela fórmula de **Haversine**.
- Endereços das lojas convertidos em latitude e longitude pelo **Nominatim/OpenStreetMap** no cadastro ou na edição.
- Carrinho com cálculo automático do total.
- Pedido com endereço de entrega e forma de pagamento.
- Histórico de pedidos próprios com status.

### Pedidos e expedição
- Pedido com itens reais (produto + quantidade + valor unitário), não apenas um valor total solto.
- Geração de ticket térmico com todos os itens, código, forma de pagamento e endereço de entrega.

---

## 💻 Tecnologias Utilizadas

* **Backend:** Python, Flask, Flask-SQLAlchemy, SQLite, Werkzeug (hash de senha)
* **Frontend:** HTML5, CSS3 e JavaScript Vanilla modular (SPA — single page application)
* **Gráficos:** Chart.js 4.4.7, servido localmente em `frontend/static/vendor/`
* **Mapa:** Leaflet 1.9.4 com tiles e atribuição do OpenStreetMap
* **Geolocalização:** Geolocation API, cálculo de Haversine e geocodificação de endereços com Nominatim
* **Endereços:** ViaCEP para preenchimento automático de logradouro, bairro, cidade e UF
* **Formulários:** máscaras brasileiras para CEP, telefone, UF, número de endereço e valores monetários
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

Na inicialização, o sistema cria as tabelas ausentes, aplica migrações aditivas compatíveis com o SQLite e popula uma base vazia com dados de demonstração. O banco existente não é apagado. Em produção, defina `FLASK_SECRET_KEY`, `DATABASE_URL` e desative o seed com `BORAOBRA_SEED=0`.

Conta de demonstração criada apenas quando a base está totalmente vazia: `demo@boraobra.local` / `BoraObra123!` (a senha pode ser alterada com `BORAOBRA_DEMO_PASSWORD`).

### Mapa e lojas próximas

No ambiente local, acesse a aplicação por `http://127.0.0.1:5000` ou `http://localhost:5000`. Em produção, a localização do navegador exige **HTTPS**. O cliente precisa autorizar o acesso à localização; caso negue, o catálogo e a busca textual de lojas continuam disponíveis.

O endereço da loja deve ser completo — rua, número, bairro, cidade, estado e CEP. No cadastro ou quando o endereço é alterado, o backend consulta o Nominatim uma única vez e persiste `latitude` e `longitude`. A posição do cliente permanece no navegador e não é enviada ao backend.

Nos formulários de conta, cliente e loja, o frontend consulta o [ViaCEP](https://viacep.com.br/) após a digitação dos oito números do CEP. Logradouro, bairro, cidade e UF são preenchidos automaticamente; número e complemento continuam sob responsabilidade do usuário. Se o serviço estiver indisponível, todos os campos permanecem editáveis para preenchimento manual.

Lojas criadas antes da inclusão deste recurso precisam ter o endereço salvo novamente para receber coordenadas. É possível desabilitar a geocodificação externa com:

```powershell
$env:BORAOBRA_GEOCODING="0"
```

Para identificar corretamente a aplicação perante o serviço de geocodificação, configure um User-Agent próprio:

```powershell
$env:BORAOBRA_GEOCODING_USER_AGENT="BoraObra/1.0 (contato: seu-email@dominio.com)"
```

O cálculo da distância usa a fórmula de Haversine, considerando a curvatura da Terra:

```text
posição do cliente + coordenadas da loja → distância em km → filtro pelo raio escolhido
```

Referências: [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/) e [política de uso do Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

### Dashboards e Chart.js

O Chart.js é carregado localmente, portanto não depende de CDN. Os dashboards destroem a instância anterior antes de recriar um gráfico, evitando o erro `Canvas is already in use`, respeitam `prefers-reduced-motion` e exibem um estado informativo quando não existem dados.

Gráficos atualmente utilizados:

- faturamento por período, separando vendas e locações;
- pedidos por status;
- vendas versus locações;
- gastos do cliente ao longo do tempo.

Os números são calculados a partir dos pedidos retornados pelo backend; a interface não preenche métricas com valores simulados.

## ✅ Testes

```bash
python -m unittest discover -s tests -v
```

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
│   │   ├── js/             # API, dashboard, gráficos, catálogo, mapa e ticket
│   │   └── vendor/         # Chart.js e Leaflet servidos localmente
│   └── templates/
│       └── index.html      # SPA única (painel lojista + painel cliente + placeholder entregador)
├── app.py                  # Ponto de entrada do Flask
└── README.md
```

---

## 🗺️ Próximos passos

- Migrar o banco de desenvolvimento de SQLite para MySQL.
- Adotar migrações versionadas com Flask-Migrate/Alembic.
- Substituir campos monetários `Float` por `Numeric` e datas textuais por `DateTime`.
- Validar as métricas do dashboard com uma massa de dados controlada.

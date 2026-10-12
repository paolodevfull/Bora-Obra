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
- Cadastro e login com senha protegida por hash, sessão assinada, token CSRF e limite de tentativas.
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

* **Backend:** Python, Flask, Flask-SQLAlchemy, MySQL 8, PyMySQL e Werkzeug (hash de senha)
* **Frontend:** HTML5, CSS3 e JavaScript Vanilla modular, com uma página HTML independente por área
* **Gráficos:** Chart.js 4.4.7, servido localmente em `frontend/static/vendor/`
* **Mapa:** Leaflet 1.9.4 com tiles e atribuição do OpenStreetMap
* **Geolocalização:** Geolocation API, cálculo de Haversine e geocodificação de endereços com Nominatim
* **Endereços:** ViaCEP para preenchimento e BrasilAPI como fallback de coordenadas por CEP
* **Formulários:** máscaras brasileiras para CEP, telefone, UF, número de endereço e valores monetários
* **Arquitetura:** Layered Architecture com padrão Repository e Services orientados a caso de uso

---

## ⚙️ Como rodar localmente

### Pré-requisitos

- Python 3;
- MySQL 8, executado diretamente ou pelo WampServer;
- MySQL Workbench, opcional para executar o schema e as migrations;
- navegador baseado em Chromium para exportações em PDF e PNG.

### 1. Instalação das dependências

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

Caso o Chromium do Playwright não esteja disponível, utilize um Chrome, Edge ou Brave já instalado:

```env
PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:\caminho\para\chrome.exe
```

### 2. Configuração do ambiente

Crie um arquivo `.env` na raiz com base no `.env.example`:

```env
BORAOBRA_ENV=development
FLASK_SECRET_KEY=gere-uma-chave-longa-e-segura

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bora_obra
DB_USER=root
DB_PASSWORD=sua_senha
DB_CHARSET=utf8mb4

FLASK_DEBUG=0
FLASK_COOKIE_SECURE=0
BORAOBRA_SESSION_MINUTES=480
BORAOBRA_SLOW_REQUEST_MS=1000

BORAOBRA_GEOCODING=1
BORAOBRA_GEOCODING_USER_AGENT=BoraObra/1.0 (contato: email@dominio.com)
PLAYWRIGHT_CHROMIUM_EXECUTABLE=
```

> O `.env` contém credenciais locais e não deve ser enviado ao Git. Versione somente o `.env.example`.

Em produção, use `BORAOBRA_ENV=production`, uma `FLASK_SECRET_KEY` aleatória e `FLASK_COOKIE_SECURE=1` sob HTTPS.

### 3. Criação e atualização do banco

O **MySQL 8 é o único banco suportado**. A aplicação não utiliza SQLite e não faz fallback automático quando o MySQL está indisponível.

Para uma instalação nova, execute no MySQL Workbench:

```text
backend/database/sql/schema/bora_obra.sql
```

Em bancos existentes, execute em ordem crescente os arquivos de:

```text
backend/database/sql/migrations/
```

As migrations são aditivas e verificam a existência das estruturas antes das alterações. Para validar a conexão e o schema:

```bash
python -m backend.database.check_connection
```

### 4. Execução

Com o MySQL ou WampServer iniciado:

```bash
python app.py
```

Acesse `http://127.0.0.1:5000`. Caso o MySQL esteja indisponível ou incompatível com as models, a inicialização é interrompida com uma mensagem clara nos logs.

### Sessões, logs e consistência dos pedidos

- `BORAOBRA_SESSION_MINUTES` define a duração da sessão autenticada;
- `BORAOBRA_SLOW_REQUEST_MS` define quando uma requisição é registrada como lenta;
- respostas incluem `X-Request-ID` e `Server-Timing` para diagnóstico;
- o backend recalcula preços e totais sem confiar nos valores enviados pelo navegador;
- o frontend envia uma `Idempotency-Key` por tentativa de checkout;
- retries da mesma tentativa reutilizam o pedido existente;
- movimentações de estoque utilizam transação e bloqueio de linha no MySQL.

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

Quando o Nominatim não encontra o endereço completo, o backend tenta consultas mais amplas e, por último, a BrasilAPI pelo CEP. O fallback por CEP é aproximado e pode posicionar endereços próximos no mesmo ponto.

Referências: [Leaflet](https://leafletjs.com/), [OpenStreetMap](https://www.openstreetmap.org/), [política do Nominatim](https://operations.osmfoundation.org/policies/nominatim/) e [BrasilAPI](https://brasilapi.com.br/).

### Dashboards e Chart.js

O Chart.js é carregado localmente, portanto não depende de CDN. Os dashboards destroem a instância anterior antes de recriar um gráfico, evitando o erro `Canvas is already in use`, respeitam `prefers-reduced-motion` e exibem um estado informativo quando não existem dados.

Gráficos atualmente utilizados:

- faturamento por período, separando vendas e locações;
- pedidos por status;
- vendas versus locações;
- gastos do cliente ao longo do tempo.

Os números são calculados a partir dos pedidos retornados pelo backend; a interface não preenche métricas com valores simulados.

### Relatórios e exportações

Os relatórios utilizam exclusivamente os registros do MySQL e respeitam os filtros selecionados, incluindo período, modalidade, status, pagamento, cliente, região, categoria e produtos.

Formatos disponíveis:

- **PDF:** documento completo gerado com Playwright;
- **PNG:** captura em boa resolução gerada com `page.screenshot()`;
- **XML:** arquivo estruturado gerado com `xml.etree.ElementTree`.

As exportações não inserem valores estáticos no frontend. Indicadores, rankings e gráficos são calculados com base nos registros retornados pelo backend.

## ✅ Testes

Os testes de integração utilizam um banco MySQL separado. O nome precisa terminar com `_test`, pois a preparação da suíte recria as tabelas desse banco.

```bash
$env:TEST_DB_NAME="bora_obra_test"
python -m unittest discover -s tests -v
```

> Nunca configure `TEST_DB_NAME` com o nome do banco principal.

---

## 📁 Estrutura de pastas

```
Bora-Obra/
├── backend/
│   ├── config/           # Configuração centralizada por ambiente
│   ├── controllers/      # Rotas da API Flask
│   ├── database/
│   │   ├── connection.py # Construção e teste da conexão MySQL
│   │   └── sql/
│   │       ├── schema/   # Criação de uma instalação nova
│   │       └── migrations/ # Atualizações de bancos existentes
│   ├── middleware/       # Segurança, rastreabilidade e tempo de resposta
│   ├── models/           # Entidades do SQLAlchemy
│   ├── repositories/     # Acesso e consultas ao banco
│   └── services/         # Regras de negócio isoladas por domínio
├── frontend/
│   ├── login.html          # Entrada na conta
│   ├── cadastro.html       # Criação de conta
│   ├── cliente/            # Catálogo, conta, painel e pedidos do cliente
│   ├── lojista/            # Uma página HTML para cada área operacional
│   ├── static/
│   │   ├── css/style.css
│   │   ├── js/             # Componentes, API, dashboards, catálogo, mapa e ticket
│   │   └── vendor/         # Chart.js e Leaflet servidos localmente
├── app.py                  # Ponto de entrada do Flask
├── .env.example            # Exemplo seguro das variáveis aceitas
├── requirements.txt        # Dependências Python
└── README.md
```

As páginas são HTML estático, sem Jinja. O Flask serve os arquivos e mantém apenas APIs, sessão, validações, regras de negócio e banco de dados. Cabeçalhos, menus, modais e navegação compartilhada são montados no cliente por `frontend/static/js/components.js`.

## 📚 Documentação

- [Arquitetura e decisões técnicas](docs/architecture.md)
- [Catálogo da API](docs/api.md)
- [Manual de cliente, lojista e funcionário](docs/user-guide.md)
- [Segurança, integrações, ambiente e produção](docs/security-and-operations.md)
- [.env.example](.env.example) com as variáveis aceitas

---

## 🗺️ Próximos passos

- Adotar migrações versionadas com Flask-Migrate/Alembic.
- Implementar paginação server-side nas listagens operacionais.
- Processar exportações pesadas em segundo plano em produção.
- Utilizar armazenamento compartilhado para rate limiting em múltiplos workers.

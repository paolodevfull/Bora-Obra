Em “Gestão (painel do lojista)”
- Interface separada por área, com páginas próprias para início, loja, funcionários, produtos, pedidos e relatórios.
- Tema claro, escuro ou automático, com preferência salva no navegador.
- Layout responsivo com menu lateral fixo no desktop e recolhível no celular.
- Upload, validação, redimensionamento e remoção do logotipo da loja.
- Relatórios filtráveis com indicadores, gráficos e exportações em XML e PNG.

Em “Compra (painel do cliente)”
- Seleção do período de locação diretamente na página do produto.
- Atualização automática do preço conforme quantidade e duração da locação.
- Página própria para carrinho, confirmação, histórico e detalhes dos pedidos.
- Cancelamento de pedidos quando permitido pelas regras de negócio.
- Tema claro, escuro ou automático configurável na conta do cliente.
- Marcadores do mapa personalizados com o logotipo de cada loja.

**Gráficos:** Chart.js 4.4.7, servido localmente em `frontend/static/vendor/`
* **Mapa:** Leaflet 1.9.4 com tiles e atribuição do OpenStreetMap
* **Geolocalização:** Geolocation API, cálculo de Haversine e geocodificação de endereços com Nominatim
* **Endereços:** ViaCEP para preenchimento automático de logradouro, bairro, cidade e UF
* **Formulários:** máscaras brasileiras para CEP, telefone, UF, número de endereço e valores monetários
* **Arquitetura:** Layered Architecture com padrão Repository e Services orientados a caso de uso

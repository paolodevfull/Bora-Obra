# Integrações externas

## ViaCEP

- Finalidade: preencher endereço após CEP.
- Código: `frontend/static/js/viacep.js`.
- Dados: CEP de oito dígitos; recebe logradouro, bairro, cidade e UF.
- Falha: campos permanecem editáveis e o usuário pode preencher manualmente.
- Teste: digite um CEP válido e depois simule modo offline.

## Nominatim / OpenStreetMap

- Finalidade: transformar endereço da loja em coordenadas.
- Código: `backend/services/geocoding.py`.
- Dados: variações do endereço e User-Agent configurado; recebe latitude/longitude.
- Configuração: `BORAOBRA_GEOCODING` e `BORAOBRA_GEOCODING_USER_AGENT`.
- Falha: tenta endereços mais amplos e depois BrasilAPI; a loja pode ser salva com mensagem de posicionamento.
- Limites: respeitar a política pública e evitar geocodificação repetitiva.

## BrasilAPI

Fallback por CEP no backend quando Nominatim não localiza. Coordenada pode ser aproximada e não substitui endereço completo.

## Leaflet, OpenStreetMap e geolocalização

Leaflet 1.9.4 fica em `frontend/static/vendor/leaflet/`. `mapa-lojas.js` cria mapa, controles, marcadores com logo, raio e cálculo Haversine. Tiles vêm do OpenStreetMap. A Geolocation API fornece a posição ao navegador mediante permissão; ela não é persistida nem enviada ao backend. Em produção exige HTTPS.

## Chart.js

Chart.js 4.4.7 é servido localmente por `frontend/static/vendor/chart.umd.min.js`. `dashboard-charts.js` e `relatorios.js` criam gráficos responsivos, destroem instâncias anteriores e respeitam o tema.

## Uploads e Pillow

`logo_loja.py` valida conteúdo, MIME, extensão, tamanho e dimensão. Pillow converte para WebP e gera marcador. Falha não deve substituir a imagem anterior; ausência ou erro de imagem usa o recurso padrão.

## Playwright e ElementTree

`exportar_relatorio.py` usa Playwright para renderizar HTML controlado em PDF e PNG. Pode usar Chromium próprio ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `relatorio_controller.py` usa ElementTree para XML. Todos os formatos recebem o mesmo resultado filtrado do service.

## Font Awesome

Os ícones ainda são carregados externamente por CDN em páginas que os referenciam. Uma indisponibilidade afeta ícones, não regras ou dados. Para operação totalmente offline, hospede os arquivos localmente e revise a política CSP.

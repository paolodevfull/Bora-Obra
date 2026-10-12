# Segurança, integrações e operação

## Sessões e rastreabilidade

- `BORAOBRA_SESSION_MINUTES` controla a validade da sessão autenticada (mínimo de 15 minutos).
- APIs retornam `Cache-Control: no-store`, `X-Request-ID` e `Server-Timing`.
- `BORAOBRA_SLOW_REQUEST_MS` define o limiar dos avisos de lentidão.
- O limitador de login é local ao processo. Em múltiplos workers ou servidores, use armazenamento compartilhado, como Redis.
- Execute as migrations em `backend/database/sql/migrations/` em ordem. A migration de idempotência é aditiva e preserva pedidos existentes.

## Variáveis

- `BORAOBRA_ENV`: use `production` em produção; nesse modo a chave secreta é obrigatória.
- `FLASK_SECRET_KEY`: chave longa, aleatória e privada para sessões.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_CHARSET`: conexão MySQL.
- `FLASK_DEBUG`: `1` somente em desenvolvimento.
- `FLASK_COOKIE_SECURE`: `1` quando o site usar HTTPS.
- `BORAOBRA_GEOCODING`: `0` desativa geocodificação externa.
- `BORAOBRA_GEOCODING_USER_AGENT`: identificação/contato enviados ao Nominatim.

Nunca versionar `.env`, bancos, dumps, chaves ou cookies.

## Integrações

- **ViaCEP:** recebe o CEP digitado para preencher o endereço no navegador.
- **Nominatim/OpenStreetMap:** recebe variações do endereço da loja para obter coordenadas.
- **BrasilAPI:** fallback por CEP; a coordenada pode ser aproximada.
- **OpenStreetMap:** entrega as imagens do mapa ao navegador.
- **Geolocation API:** a posição do cliente permanece no navegador e alimenta o cálculo Haversine.

## Desenvolvimento

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m playwright install chromium
$env:DB_HOST="127.0.0.1"
$env:DB_PORT="3306"
$env:DB_NAME="bora_obra"
$env:DB_USER="root"
$env:DB_PASSWORD="sua-senha-local"
$env:DB_CHARSET="utf8mb4"
$env:FLASK_SECRET_KEY="uma-chave-local"
python -m backend.database.check_connection
python app.py
```

As exportações PDF e PNG são renderizadas pelo Playwright. O caminho opcional
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite reutilizar um navegador Chromium já instalado.

Testes:

```powershell
$env:TEST_DB_NAME="bora_obra_test"
python -m unittest discover -s tests -v
```

## Produção

- Use HTTPS e `FLASK_COOKIE_SECURE=1`.
- Defina `BORAOBRA_ENV=production` e uma `FLASK_SECRET_KEY` persistente.
- Não use o servidor de desenvolvimento do Flask.
- Aplique rate limiting também no proxy e não registre dados sensíveis.
- Faça backup antes de alterar o schema.
- Use migrations versionadas antes de qualquer alteração futura do schema.

## Limitações conhecidas

- O limitador de login é local ao processo; múltiplos workers exigem Redis ou proteção no proxy.
- Locações ainda não bloqueiam reservas concorrentes por período.
- Não há recuperação de senha.
- Font Awesome ainda é carregado por CDN.
- IDs numéricos permanecem no contrato da API por compatibilidade, mas não são exibidos como informação técnica na UI.

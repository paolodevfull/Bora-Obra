# Segurança, integrações e operação

## Variáveis

- `BORAOBRA_ENV`: use `production` em produção; nesse modo a chave secreta é obrigatória.
- `FLASK_SECRET_KEY`: chave longa, aleatória e privada para sessões.
- `DATABASE_URL`: URL SQLAlchemy. O schema atual é validado com SQLite.
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
$env:FLASK_SECRET_KEY="uma-chave-local"
python app.py
```

Testes:

```powershell
python -m unittest discover -s tests -v
```

## Produção

- Use HTTPS e `FLASK_COOKIE_SECURE=1`.
- Defina `BORAOBRA_ENV=production` e uma `FLASK_SECRET_KEY` persistente.
- Não use o servidor de desenvolvimento do Flask.
- Aplique rate limiting também no proxy e não registre dados sensíveis.
- Faça backup antes de alterar o schema.
- Adote Alembic/Flask-Migrate antes da migração para MySQL.

## Limitações conhecidas

- O limitador de login é local ao processo; múltiplos workers exigem Redis ou proteção no proxy.
- Dinheiro ainda usa `Float` e datas de pedido ainda usam texto no schema legado.
- Locações não persistem data inicial/final nem reserva concorrente por período.
- Não há recuperação de senha.
- Font Awesome ainda é carregado por CDN.
- IDs numéricos permanecem no contrato da API por compatibilidade, mas não são exibidos como informação técnica na UI.

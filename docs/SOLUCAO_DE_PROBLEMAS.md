# Solução de problemas

## MySQL/WampServer não inicia ou não conecta

1. Inicie o WampServer e confirme o serviço MySQL verde/ativo.
2. Verifique se a porta configurada está escutando (padrão `3306`).
3. Confira `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` no `.env`.
4. Execute `python -m backend.database.check_connection`.

`Access denied` indica credencial ou privilégio incorreto. `Unknown database` indica que o schema não foi executado. `Can't connect` normalmente indica serviço parado, host ou porta incorretos.

## Schema ou migration pendente

Se a inicialização indicar tabela/coluna ausente ou nulabilidade divergente, execute primeiro `backend/database/sql/schema/bora_obra.sql` em instalação nova; em banco existente, aplique os arquivos de `migrations/` em ordem. Não use `db.create_all()` no banco principal.

## Porta 5000 ocupada

Encerre a instância anterior com `Ctrl+C`. Para desenvolvimento temporário em outra porta:

```powershell
python -c "from app import create_app; create_app().run(port=5001)"
```

Acesse `http://127.0.0.1:5001`.

## Ambiente virtual ou dependência ausente

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip check
```

Linux/macOS: `source .venv/bin/activate`.

## Playwright/PDF/PNG

Execute `python -m playwright install chromium`. Sem download, defina `PLAYWRIGHT_CHROMIUM_EXECUTABLE` para Chrome, Edge ou Brave existente. Confirme que o processo possui permissão para iniciar o navegador. XML não depende de Chromium.

## Frontend não acessa a API ou CORS

Abra o frontend pela URL Flask, não diretamente como `file://`. O projeto é same-origin e não configura CORS para outro servidor. Verifique a aba Rede e os logs do Flask. Resposta `401` indica sessão ausente; `403` pode indicar CSRF expirado ou permissão.

## Upload de logotipo falha

Use PNG, JPEG ou WebP real, até 2 MB e entre 48×48 e 4096×4096. Não renomeie executável para extensão de imagem. Verifique permissão de escrita em `frontend/static/uploads/lojas/`.

## ViaCEP, mapa ou localização falha

- ViaCEP indisponível: preencha os campos manualmente.
- Nominatim indisponível: confira internet e `BORAOBRA_GEOCODING`; tente salvar depois.
- marcador ausente: endereço/coordenação pode estar inválido; revise e salve.
- localização negada: busca textual continua disponível.
- em produção, geolocalização do navegador exige HTTPS.

## Permissão negada

Confirme conta ativa e perfil. Clientes só acessam próprios pedidos; lojista/funcionário somente sua loja; apenas lojista administra loja e funcionários. Não altere IDs na URL para tentar acessar outro registro.

## Testes falham

1. Use banco separado terminado em `_test`.
2. Garanta privilégios de criar/remover tabelas nesse banco.
3. Defina `TEST_DB_NAME=bora_obra_test`.
4. Rode um teste específico com `python -m unittest modulo.Classe.teste -v`.
5. Leia primeiro a primeira falha; erros seguintes podem ser consequência.

Nunca use o banco principal: a suíte recria o schema de teste.

### Falha do teste de banco legado

Se `test_legacy_database_is_retained_but_not_referenced_by_runtime` falhar por ausência de `backend/database/bora_obra.db`, não crie um SQLite vazio para ocultar o problema. O runtime atual é exclusivamente MySQL. A equipe precisa decidir entre remover/atualizar essa asserção obsoleta ou manter formalmente um artefato legado antes de integrar à `main`.

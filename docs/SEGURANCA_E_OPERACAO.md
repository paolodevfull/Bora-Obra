# Segurança e operação

## Controles implementados

- senhas com hash Werkzeug;
- sessão assinada, HttpOnly, SameSite e expiração configurável;
- CSRF em todas as mutações da API;
- limitação local de falhas de login;
- autorização por perfil, conta ativa, propriedade de pedido e loja;
- ORM/queries parametrizadas;
- preços, totais, estoque e identidade validados no backend;
- upload validado pelo conteúdo e convertido para formato seguro;
- erros públicos sanitizados e rollback global;
- `X-Request-ID`, `Server-Timing`, `no-store`, `nosniff`, `DENY` e política de permissões;
- segredo e banco por ambiente.

## Regras para contribuições

- nunca registrar senhas, tokens, cookies, pagamento ou dados pessoais desnecessários;
- nunca confiar em `user_id`, `loja_id`, preço ou permissão enviados pelo cliente;
- toda rota sensível deve passar por `AcessoService`;
- toda escrita composta precisa de transação e rollback;
- não retornar stack trace, SQL, caminhos ou credenciais;
- validar extensão e conteúdo real de uploads;
- manter `.env`, dumps, uploads e logs fora do Git.

## Desenvolvimento e produção

Em desenvolvimento, use MySQL local/WampServer e `FLASK_DEBUG=1` apenas quando necessário. Em produção, use HTTPS, `BORAOBRA_ENV=production`, segredo persistente, cookie Secure e servidor WSGI. Aplique rate limit compartilhado/proxy, backups e rotação de logs. O servidor Flask embutido não é produção.

## Observabilidade

Respostas carregam request ID e duração. Requisições acima de `BORAOBRA_SLOW_REQUEST_MS` geram warning. Procure o request ID nos logs ao investigar falhas, sem copiar dados sensíveis para tickets públicos.

## Limitações de segurança/operação

- rate limit é por processo;
- não há recuperação/rotação de senha;
- CSP não está formalizada devido às origens externas atuais;
- exportações Playwright são síncronas;
- ainda não há servidor WSGI configurado no repositório;
- pagamentos informados não representam integração financeira.

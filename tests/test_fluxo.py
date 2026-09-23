import importlib
import pathlib
import re
import io
import sqlite3
import tempfile
import unittest
from PIL import Image
from datetime import date, timedelta
from contextlib import closing
from unittest.mock import patch
from app import create_app
from backend.database.database import db
from backend.database.initialize import inicializar_banco
from backend.models.pedido import Pedido
from backend.models.user import User
from backend.models.produto import Produto
from backend.services.geocoding import geocodificar_endereco


class FluxoTest(unittest.TestCase):
    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.engine.dispose()

    def setUp(self):
        self.app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:', 'SEED_DATA': False, 'SECRET_KEY':'test'})
        self.owner = self.app.test_client()
        self.client = self.app.test_client()
        self.other = self.app.test_client()
        self.register(self.owner, 'owner@example.com', 'lojista')
        self.loja = self.call(self.owner, 'post', '/api/lojas', {'nome':'Loja de testes','endereco':'Rua de testes, 100'}, 201)
        self.produto = self.call(self.owner,'post','/api/produtos',{'nome':'Furadeira','preco_venda':199.90,'preco_locacao':25.50,'categoria':'Furação','estoque':10},201)
        self.register(self.client,'cliente@example.com','cliente')
        self.register(self.other,'outro@example.com','cliente')

    def call(self, client, method, path, data=None, status=200):
        kwargs = {'json':data} if data is not None else {}
        if method.lower() in {'post', 'put', 'patch', 'delete'}:
            token = client.get('/api/auth/csrf').get_json()['csrf_token']
            kwargs['headers'] = {'X-CSRF-Token': token}
        response = getattr(client,method)(path,**kwargs)
        self.assertEqual(response.status_code,status,response.get_json())
        return response.get_json()

    def register(self,client,email,tipo):
        self.call(client,'post','/api/users',{'nome':'Teste','email':email,'senha':'Teste123!','tipo':tipo},201)
        return self.call(client,'post','/api/auth/login',{'email':email,'senha':'Teste123!'})

    def order(self, tipo='Locacao', **overrides):
        data={'loja_id':self.loja['id'],'tipo':tipo,'itens':[{'produto_id':self.produto['id'],'quantidade':2,'dias_locacao':3}], 'endereco_entrega':'Rua do cliente, 42','forma_pagamento':'Pix'}
        data.update(overrides)
        return data

    def test_complete_rental_and_sale_flow(self):
        inicio = date.today() + timedelta(days=1)
        fim = inicio + timedelta(days=3)
        rental=self.call(self.client,'post','/api/pedidos',self.order(
            valor_total=0.01,
            data_inicio_locacao=inicio.isoformat(),
            data_fim_locacao=fim.isoformat(),
            itens=[{'produto_id':self.produto['id'],'quantidade':2,'dias_locacao':99}],
        ),201)
        self.assertEqual(rental['valor_total'],153)
        self.assertEqual(rental['data_inicio_locacao'], inicio.isoformat())
        self.assertEqual(rental['data_fim_locacao'], fim.isoformat())
        ticket=self.call(self.client,'get',f"/api/pedidos/{rental['id']}/ticket")
        self.assertEqual(ticket['itens'][0]['dias_locacao'],3)
        self.assertEqual(ticket['data_inicio_locacao'], inicio.isoformat())
        self.assertEqual(ticket['loja_origem'],'Loja de testes')
        sale=self.call(self.client,'post','/api/pedidos',self.order('Venda'),201)
        self.assertEqual(sale['valor_total'],399.80)
        report=self.call(self.owner,'get','/api/relatorios/lucro-diario')
        self.assertEqual(report['total_pedidos'],2)
        self.assertAlmostEqual(report['faturamento_total'],552.80)
        self.call(self.owner,'patch',f"/api/pedidos/{rental['id']}",{'status':'Confirmado'})
        self.call(self.owner,'patch',f"/api/pedidos/{rental['id']}",{'status':'Despachado'})
        self.call(self.client,'patch',f"/api/pedidos/{rental['id']}/confirmar-entrega")
        self.assertEqual(self.call(self.client,'get','/api/pedidos')[1]['status'],'Entregue')

    def test_ticket_report_and_product_authorization(self):
        order=self.call(self.client,'post','/api/pedidos',self.order(),201)
        self.call(self.other,'get',f"/api/pedidos/{order['id']}/ticket",status=403)
        self.call(self.app.test_client(),'get',f"/api/pedidos/{order['id']}/ticket",status=401)
        self.call(self.client,'get','/api/relatorios/lucro-diario',status=403)
        owner2=self.app.test_client(); self.register(owner2,'second@example.com','lojista')
        self.call(owner2,'post','/api/lojas',{'nome':'Outra loja','endereco':'Outro endereço 20'},201)
        self.call(owner2,'patch',f"/api/produtos/{self.produto['id']}",{'nome':'Invasão'},403)
        report=self.call(owner2,'get','/api/relatorios/lucro-diario')
        self.assertEqual(report['faturamento_total'],0)
        self.assertEqual(report['ultimos_pedidos'],[])

    def test_invalid_price_and_names(self):
        for invalid in [-1,0,'abc','NaN','Infinity',False,0.001,{},None]:
            with self.subTest(invalid=invalid):
                self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'preco_venda':invalid},400)
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'nome':'   '},400)
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'disponivel_locacao':'false'},400)
        self.assertEqual(self.call(self.owner,'get','/api/produtos')[0]['preco_venda'],199.90)

    def test_missing_ids_and_rollback(self):
        self.call(self.client,'post','/api/pedidos',self.order(loja_id=999),404)
        self.call(self.client,'post','/api/pedidos',self.order(itens=[{'produto_id':self.produto['id']},{'produto_id':999}]),404)
        for quantity in [0,-1,1.5,True,'a',None]:
            self.call(self.client,'post','/api/pedidos',self.order(itens=[{'produto_id':self.produto['id'],'quantidade':quantity}]),400)
        with self.app.app_context(): self.assertEqual(Pedido.query.count(),0)

    def test_stock_is_validated_and_sales_decrement_inventory(self):
        self.call(self.client, 'post', '/api/pedidos', self.order('Venda', itens=[{
            'produto_id': self.produto['id'], 'quantidade': 11
        }]), 400)
        self.call(self.client, 'post', '/api/pedidos', self.order('Venda', itens=[{
            'produto_id': self.produto['id'], 'quantidade': 3
        }]), 201)
        product = self.call(self.owner, 'get', '/api/produtos')[0]
        self.assertEqual(product['estoque'], 7)
        order = self.call(self.client, 'get', '/api/pedidos')[0]
        self.call(self.client, 'patch', f"/api/pedidos/{order['id']}/cancelar")
        product = self.call(self.owner, 'get', '/api/produtos')[0]
        self.assertEqual(product['estoque'], 10)

    def test_customer_cannot_skip_delivery_statuses(self):
        order = self.call(self.client, 'post', '/api/pedidos', self.order(), 201)
        self.call(self.client, 'patch', f"/api/pedidos/{order['id']}/confirmar-entrega", status=400)

    def test_rental_period_validation(self):
        inicio = date.today() + timedelta(days=2)
        self.call(self.client, 'post', '/api/pedidos', self.order(
            data_inicio_locacao=inicio.isoformat(),
            data_fim_locacao=inicio.isoformat(),
        ), 400)
        self.call(self.client, 'post', '/api/pedidos', self.order(
            data_inicio_locacao=(date.today() - timedelta(days=1)).isoformat(),
            data_fim_locacao=inicio.isoformat(),
        ), 400)

    def test_csrf_is_required_for_state_changes(self):
        response = self.app.test_client().post('/api/auth/login', json={
            'email': 'cliente@example.com', 'senha': 'Teste123!'
        })
        self.assertEqual(response.status_code, 403)

    def test_public_store_payload_hides_management_fields(self):
        public_store = self.call(self.client, 'get', '/api/lojas')[0]
        self.assertNotIn('documento', public_store)
        self.assertNotIn('responsavel_nome', public_store)
        self.assertNotIn('email', public_store)

    def test_login_rate_limit(self):
        visitor = self.app.test_client()
        for _ in range(5):
            self.call(visitor, 'post', '/api/auth/login', {
                'email': 'rate-limit@example.com', 'senha': 'senha-incorreta'
            }, 401)
        self.call(visitor, 'post', '/api/auth/login', {
            'email': 'rate-limit@example.com', 'senha': 'senha-incorreta'
        }, 429)

    def test_availability_and_history(self):
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'disponivel_locacao':False})
        self.call(self.client,'post','/api/pedidos',self.order(),400)
        self.call(self.client,'post','/api/pedidos',self.order('Venda'),201)
        self.call(self.owner,'delete',f"/api/produtos/{self.produto['id']}",status=400)
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'status_manutencao':True})
        self.call(self.client,'post','/api/pedidos',self.order('Venda'),400)

    def test_json_and_profile_validation(self):
        for payload in [[],None,'abc',10]:
            token = self.owner.get('/api/auth/csrf').get_json()['csrf_token']
            response=self.owner.post('/api/produtos',json=payload,headers={'X-CSRF-Token':token})
            self.assertEqual(response.status_code,400)
            self.assertIn('erro',response.json)
        self.call(self.client,'patch','/api/users/me',{'nome':'Mudança','senha':'a'},400)
        self.assertEqual(self.call(self.client,'get','/api/auth/me')['nome'],'Teste')
        self.call(self.client,'patch','/api/users/me',{'tipo':'lojista'})
        self.assertEqual(self.call(self.client,'get','/api/auth/me')['tipo'],'cliente')
        self.call(self.owner,'patch',f"/api/lojas/{self.loja['id']}",{'telefone':'123456'})

    def test_status_transitions_and_cancelled_report(self):
        order=self.call(self.client,'post','/api/pedidos',self.order(),201)
        path=f"/api/pedidos/{order['id']}"
        self.call(self.owner,'patch',path,{'status':'Entregue'},400)
        self.call(self.owner,'patch',path,{'status':'Cancelado'})
        self.call(self.client,'patch',path+'/confirmar-entrega',status=400)
        self.assertEqual(self.call(self.owner,'get','/api/relatorios/lucro-diario')['total_pedidos'],0)

    def test_customer_order_details_and_cancellation(self):
        order=self.call(self.client,'post','/api/pedidos',self.order(),201)
        listed=self.call(self.client,'get','/api/pedidos')[0]
        self.assertTrue(listed['pode_cancelar'])
        self.assertEqual(listed['itens'][0]['nome_produto'],'Furadeira')
        self.assertEqual(listed['loja_nome'],'Loja de testes')
        self.call(self.other,'patch',f"/api/pedidos/{order['id']}/cancelar",status=404)
        cancelled=self.call(self.client,'patch',f"/api/pedidos/{order['id']}/cancelar")
        self.assertEqual(cancelled['status'],'Cancelado')
        self.call(self.client,'patch',f"/api/pedidos/{order['id']}/cancelar",status=400)

    def test_management_fields_permissions_and_filtered_exports(self):
        loja=self.call(self.owner,'patch',f"/api/lojas/{self.loja['id']}",{'responsavel_nome':'Paulo Gestor','documento':'12.345.678/0001-99','email':'loja@example.com','logo_url':'https://example.com/logo.png','ativa':True})
        self.assertEqual(loja['responsavel_nome'],'Paulo Gestor')
        produto=self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'estoque':12,'unidade':'un','sku':'FUR-001','imagem_url':'https://example.com/furadeira.png'})
        self.assertEqual(produto['sku'],'FUR-001')
        funcionario=self.call(self.owner,'post','/api/users',{'nome':'Ana Funcionária','email':'ana@example.com','senha':'Teste123!','tipo':'funcionario','telefone':'(31) 99999-9999','ativo':True},201)
        atualizado=self.call(self.owner,'patch',f"/api/users/{funcionario['id']}",{'ativo':False,'nome':'Ana Funcionária','email':'ana@example.com'})
        self.assertFalse(atualizado['ativo'])
        login=self.app.test_client()
        self.call(login,'post','/api/auth/login',{'email':'ana@example.com','senha':'Teste123!'},status=403)
        self.call(self.client,'post','/api/pedidos',self.order('Venda'),201)
        hoje=__import__('datetime').date.today().isoformat()
        relatorio=self.call(self.owner,'get',f'/api/relatorios/detalhado?inicio={hoje}&fim={hoje}&tipo=Venda')
        self.assertEqual(relatorio['resumo']['quantidade_vendas'],1)
        xml=self.owner.get(f'/api/relatorios/detalhado.xml?inicio={hoje}&fim={hoje}')
        self.assertEqual(xml.status_code,200)
        self.assertEqual(xml.mimetype,'application/xml')

    def test_store_logo_upload_validation_replacement_and_removal(self):
        def imagem(formato, tamanho=(180, 120), cor=(220, 95, 20, 255)):
            stream = io.BytesIO()
            modo = 'RGB' if formato == 'JPEG' else 'RGBA'
            Image.new(modo, tamanho, cor[:3] if modo == 'RGB' else cor).save(stream, formato)
            stream.seek(0)
            return stream

        def enviar(stream, nome, status=200, client=None):
            client = client or self.owner
            token = client.get('/api/auth/csrf').get_json()['csrf_token']
            resposta = client.post(
                f"/api/lojas/{self.loja['id']}/logo",
                data={'logo': (stream, nome)}, content_type='multipart/form-data',
                headers={'X-CSRF-Token': token}
            )
            self.assertEqual(resposta.status_code, status, resposta.get_json())
            return resposta.get_json()

        with tempfile.TemporaryDirectory() as diretorio:
            self.app.config['LOGO_UPLOAD_DIR'] = diretorio
            urls = []
            for formato, nome in [('PNG', '../../marca.png'), ('JPEG', 'marca.jpg'), ('WEBP', 'marca.webp')]:
                loja = enviar(imagem(formato), nome)
                self.assertTrue(loja['logo_url'].startswith('/static/uploads/lojas/loja-'))
                self.assertTrue(loja['logo_marcador_url'].endswith('-marker.webp'))
                urls.append(loja['logo_marcador_url'])
                self.assertEqual(len(list(pathlib.Path(diretorio).glob('*.webp'))), 2)
            self.assertEqual(len(set(urls)), 3)
            self.assertEqual(self.call(self.client, 'get', '/api/lojas')[0]['logo_marcador_url'], urls[-1])

            enviar(imagem('PNG', (20, 20)), 'pequena.png', 400)
            enviar(io.BytesIO(b'<script>alert(1)</script>'), 'falsa.png', 400)
            enviar(imagem('JPEG'), 'extensao-falsa.png', 400)
            enviar(io.BytesIO(b'x' * (2 * 1024 * 1024 + 1)), 'grande.png', 400)
            enviar(imagem('PNG'), 'sem-permissao.png', 403, self.client)

            removida = self.call(self.owner, 'delete', f"/api/lojas/{self.loja['id']}/logo")
            self.assertIsNone(removida['logo_url'])
            self.assertIsNone(removida['logo_marcador_url'])
            self.assertEqual(list(pathlib.Path(diretorio).glob('*.webp')), [])

    def test_employee_permissions(self):
        self.call(self.owner,'post','/api/users',{'nome':'Funcionário','email':'staff@example.com','senha':'Teste123!','tipo':'funcionario'},201)
        staff=self.app.test_client()
        self.call(staff,'post','/api/auth/login',{'email':'staff@example.com','senha':'Teste123!'})
        self.call(staff,'get','/api/users',status=403)
        self.call(staff,'patch',f"/api/produtos/{self.produto['id']}/toggle-disponibilidade")
        self.assertEqual(len(self.call(staff,'get','/api/produtos')),1)

    def test_inactive_account_loses_existing_session_access(self):
        funcionario = self.call(self.owner, 'post', '/api/users', {
            'nome':'Funcionário temporário', 'email':'temporario@example.com',
            'senha':'Teste123!', 'tipo':'funcionario'
        }, 201)
        staff = self.app.test_client()
        self.call(staff, 'post', '/api/auth/login', {
            'email':'temporario@example.com', 'senha':'Teste123!'
        })
        self.call(self.owner, 'patch', f"/api/users/{funcionario['id']}", {'ativo':False})
        self.call(staff, 'get', '/api/auth/me', status=403)
        self.call(staff, 'get', '/api/produtos', status=403)

    def test_structured_addresses_and_account_name_login(self):
        account=self.app.test_client()
        created=self.call(account,'post','/api/users',{
            'nome':'Maria da Obra','email':'maria@example.com','senha':'Teste123!','tipo':'cliente',
            'cep':'30140-110','logradouro':'Avenida Brasil','numero':'500','complemento':'Apto 2',
            'bairro':'Centro','cidade':'Belo Horizonte','uf':'mg'
        },201)
        self.assertEqual(created['uf'],'MG')
        self.assertIn('CEP 30140-110',created['endereco'])
        self.call(account,'post','/api/auth/login',{'nome':'Nome incorreto','email':'maria@example.com','senha':'Teste123!'},401)
        self.call(account,'post','/api/auth/login',{'nome':'Maria da Obra','email':'maria@example.com','senha':'Teste123!'})

        owner=self.app.test_client(); self.register(owner,'endereco-loja@example.com','lojista')
        loja=self.call(owner,'post','/api/lojas',{
            'nome':'Loja Completa','telefone':'(31) 99999-9999','cep':'30140-110',
            'logradouro':'Avenida Brasil','numero':'900','bairro':'Centro',
            'cidade':'Belo Horizonte','uf':'mg'
        },201)
        self.assertEqual(loja['uf'],'MG')
        self.assertEqual(loja['numero'],'900')
        self.assertIn('Belo Horizonte - MG',loja['endereco'])

    def test_invalid_structured_address(self):
        account=self.app.test_client()
        self.call(account,'post','/api/users',{'nome':'CEP inválido','email':'cep@example.com','senha':'Teste123!','tipo':'cliente','cep':'123'},400)
        owner=self.app.test_client(); self.register(owner,'loja-invalida@example.com','lojista')
        self.call(owner,'post','/api/lojas',{'nome':'Loja sem número','cep':'30140-110','logradouro':'Rua A','bairro':'Centro','cidade':'BH','uf':'MG'},400)


class InfrastructureTest(unittest.TestCase):
    def test_geocoding_uses_broader_address_fallback(self):
        app=create_app({'TESTING':False,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:',
                        'SEED_DATA':False,'GEOCODING_ENABLED':True,
                        'GEOCODING_USER_AGENT':'BoraObra tests'})
        responses = [io.BytesIO(b'[]') for _ in range(3)] + [
            io.BytesIO(b'[{"lat":"-19.921","lon":"-43.942"}]')
        ]
        componentes={'logradouro':'Praça Carlos Chagas','numero':'9530','bairro':'Santo Agostinho',
                     'cidade':'Belo Horizonte','uf':'MG','cep':'30170-020'}
        with app.app_context(), patch('backend.services.geocoding.urlopen', side_effect=responses), \
                patch('backend.services.geocoding.time.sleep'):
            latitude, longitude = geocodificar_endereco(
                'Praça Carlos Chagas, 9530, Santo Agostinho, Belo Horizonte - MG, CEP 30170-020',
                componentes
            )
        self.assertEqual((latitude, longitude), (-19.921, -43.942))

    def test_geocoding_falls_back_to_postal_code_coordinates(self):
        app=create_app({'TESTING':False,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:',
                        'SEED_DATA':False,'GEOCODING_ENABLED':True,
                        'GEOCODING_USER_AGENT':'BoraObra tests'})
        def fake_urlopen(request, timeout=8):
            if 'brasilapi.com.br' in request.full_url:
                return io.BytesIO(b'{"location":{"coordinates":{"latitude":"-19.925","longitude":"-43.950"}}}')
            return io.BytesIO(b'[]')
        componentes={'logradouro':'Rua sem ponto no mapa','numero':'9999','bairro':'Centro',
                     'cidade':'Belo Horizonte','uf':'MG','cep':'30170-020'}
        with app.app_context(), patch('backend.services.geocoding.urlopen', side_effect=fake_urlopen), \
                patch('backend.services.geocoding.time.sleep'):
            coordenadas = geocodificar_endereco('Rua sem ponto no mapa, 9999', componentes)
        self.assertEqual(coordenadas, (-19.925, -43.95))

    def test_frontend_is_modular_and_has_no_inline_handlers(self):
        root = pathlib.Path('frontend')
        pages = [root / 'login.html', root / 'cadastro.html', *sorted((root / 'cliente').glob('*.html')), *sorted((root / 'lojista').glob('*.html'))]
        self.assertGreaterEqual(len(pages), 10)
        for page in pages:
            html = page.read_text(encoding='utf-8')
            self.assertIsNone(re.search(r'\bon(?:click|submit|input|change)\s*=', html, re.I), page)
            self.assertIn('type="module"', html, page)
            self.assertIn('/static/js/theme-init.js', html, page)
            self.assertIn('/static/css/tokens.css', html, page)
            self.assertIn('/static/img/favicon.svg', html, page)
            self.assertNotIn('{{', html, page)
            self.assertNotIn('{%', html, page)

        login_html = (root / 'login.html').read_text(encoding='utf-8').lower()
        cadastro_html = (root / 'cadastro.html').read_text(encoding='utf-8').lower()
        self.assertNotIn('recuperar', login_html)
        self.assertIn('form-login', login_html)
        self.assertIn('form-cadastro', cadastro_html)
        self.assertNotIn('tema-selecionar', login_html)
        self.assertNotIn('tema-selecionar', cadastro_html)
        self.assertNotIn('tema-alternar', (root / 'static/js/components.js').read_text(encoding='utf-8'))
        self.assertNotIn('Buscar nesta página', (root / 'static/js/components.js').read_text(encoding='utf-8'))
        self.assertIn('data-theme="system"', (root / 'cliente/cadastro.html').read_text(encoding='utf-8'))
        self.assertIn('data-theme="system"', (root / 'lojista/lojas.html').read_text(encoding='utf-8'))

        css = (root / 'static/css/style.css').read_text(encoding='utf-8')
        full_width_rule = '#painel-lojista .app-layout > .main-content'
        self.assertIn(full_width_rule, css)
        self.assertGreater(css.rfind(full_width_rule), css.rfind('.main-content { max-width: 1480px;'))
        self.assertIn('body[data-page="perfil-cliente"] .edit-modal-card', css)

        scripts = list((root / 'static/js').glob('*.js'))
        self.assertGreaterEqual(len(scripts), 6)
        for script in scripts:
            content = script.read_text(encoding='utf-8')
            self.assertNotIn('Object.assign(window', content)
            self.assertIsNone(re.search(r'\bon(?:click|submit|input|change)\s*=', content, re.I))
            for imported in re.findall(r"from\s+['\"](\./[^'\"]+)['\"]", content):
                imported_path = imported.split('?', 1)[0]
                self.assertTrue((script.parent / imported_path).resolve().is_file(), f'Import ausente em {script}: {imported}')

    def test_empty_database_initialization_and_imports(self):
        app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:'})
        with app.app_context():
            inicializar_banco()
            self.assertEqual(User.query.count(),0)
            self.assertEqual(Produto.query.count(),0)
        for path in pathlib.Path('backend').rglob('*.py'):
            importlib.import_module('.'.join(path.with_suffix('').parts))
        for path in pathlib.Path('backend/controllers').glob('*.py'):
            content=path.read_text(encoding='utf-8')
            self.assertNotIn('backend.models',content)
            self.assertNotIn('db.session',content)
        response=app.test_client().get('/')
        self.assertEqual(response.status_code,200)
        response.close()

    def test_static_pages_support_direct_navigation(self):
        app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:','SEED_DATA':False})
        client=app.test_client()
        pages=['/','/login.html','/cadastro.html','/cliente/index.html','/cliente/detalhes.html','/cliente/painel.html','/cliente/pedidos.html','/cliente/cadastro.html','/lojista/painel.html','/lojista/lojas.html','/lojista/usuarios.html','/lojista/produtos.html','/lojista/pedidos.html','/lojista/relatorios.html']
        for page in pages:
            response=client.get(page)
            self.assertEqual(response.status_code,200,page)
            self.assertEqual(response.mimetype,'text/html',page)
            response.close()

    def test_existing_database_migrates_on_copy(self):
        original=pathlib.Path('backend/database/bora_obra.db')
        if not original.exists(): self.skipTest('No legacy database')
        target=pathlib.Path('backend/database/test_legacy_copy.db')
        try:
            with closing(sqlite3.connect(original)) as source, closing(sqlite3.connect(target)) as destination:
                before=source.execute('SELECT COUNT(*) FROM users').fetchone()[0]
                source.backup(destination)
            app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///'+target.resolve().as_posix(),'SEED_DATA':False})
            with app.app_context():
                self.assertEqual(User.query.count(),before)
                inicializar_banco()
                db.session.remove(); db.engine.dispose()
        finally:
            target.unlink(missing_ok=True)


if __name__=='__main__': unittest.main()

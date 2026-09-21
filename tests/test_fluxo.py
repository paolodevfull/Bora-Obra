import importlib
import pathlib
import re
import sqlite3
import tempfile
import unittest
from contextlib import closing
from app import create_app
from backend.database.database import db
from backend.database.initialize import inicializar_banco, povoar_banco
from backend.models.pedido import Pedido
from backend.models.user import User
from backend.models.produto import Produto


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
        self.produto = self.call(self.owner,'post','/api/produtos',{'nome':'Furadeira','preco_venda':199.90,'preco_locacao':25.50,'categoria':'Furação'},201)
        self.register(self.client,'cliente@example.com','cliente')
        self.register(self.other,'outro@example.com','cliente')

    def call(self, client, method, path, data=None, status=200):
        response = getattr(client,method)(path,**({'json':data} if data is not None else {}))
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
        rental=self.call(self.client,'post','/api/pedidos',self.order(valor_total=0.01),201)
        self.assertEqual(rental['valor_total'],153)
        ticket=self.call(self.client,'get',f"/api/pedidos/{rental['id']}/ticket")
        self.assertEqual(ticket['itens'][0]['dias_locacao'],3)
        self.assertEqual(ticket['loja_origem'],'Loja de testes')
        sale=self.call(self.client,'post','/api/pedidos',self.order('Venda'),201)
        self.assertEqual(sale['valor_total'],399.80)
        report=self.call(self.owner,'get','/api/relatorios/lucro-diario')
        self.assertEqual(report['total_pedidos'],2)
        self.assertAlmostEqual(report['faturamento_total'],552.80)
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

    def test_availability_and_history(self):
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'disponivel_locacao':False})
        self.call(self.client,'post','/api/pedidos',self.order(),400)
        self.call(self.client,'post','/api/pedidos',self.order('Venda'),201)
        self.call(self.owner,'delete',f"/api/produtos/{self.produto['id']}",status=400)
        self.call(self.owner,'patch',f"/api/produtos/{self.produto['id']}",{'status_manutencao':True})
        self.call(self.client,'post','/api/pedidos',self.order('Venda'),400)

    def test_json_and_profile_validation(self):
        for payload in [[],None,'abc',10]:
            response=self.owner.post('/api/produtos',json=payload)
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

    def test_employee_permissions(self):
        self.call(self.owner,'post','/api/users',{'nome':'Funcionário','email':'staff@example.com','senha':'Teste123!','tipo':'funcionario'},201)
        staff=self.app.test_client()
        self.call(staff,'post','/api/auth/login',{'email':'staff@example.com','senha':'Teste123!'})
        self.call(staff,'get','/api/users',status=403)
        self.call(staff,'patch',f"/api/produtos/{self.produto['id']}/toggle-disponibilidade")
        self.assertEqual(len(self.call(staff,'get','/api/produtos')),1)

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
    def test_frontend_is_modular_and_has_no_inline_handlers(self):
        root = pathlib.Path('frontend')
        html = (root / 'templates/index.html').read_text(encoding='utf-8')
        self.assertIsNone(re.search(r'\bon(?:click|submit|input|change)\s*=', html, re.I))
        self.assertIn('type="module"', html)

        scripts = list((root / 'static/js').glob('*.js'))
        self.assertGreaterEqual(len(scripts), 6)
        for script in scripts:
            content = script.read_text(encoding='utf-8')
            self.assertNotIn('Object.assign(window', content)
            self.assertIsNone(re.search(r'\bon(?:click|submit|input|change)\s*=', content, re.I))
            for imported in re.findall(r"from\s+['\"](\./[^'\"]+)['\"]", content):
                self.assertTrue((script.parent / imported).resolve().is_file(), f'Import ausente em {script}: {imported}')

    def test_seed_is_idempotent_and_imports(self):
        app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:'})
        with app.app_context():
            povoar_banco(); inicializar_banco()
            self.assertEqual(User.query.count(),1)
            self.assertEqual(Produto.query.count(),1)
        for path in pathlib.Path('backend').rglob('*.py'):
            importlib.import_module('.'.join(path.with_suffix('').parts))
        for path in pathlib.Path('backend/controllers').glob('*.py'):
            content=path.read_text(encoding='utf-8')
            self.assertNotIn('backend.models',content)
            self.assertNotIn('db.session',content)
        self.assertEqual(app.test_client().get('/').status_code,200)

    def test_existing_database_migrates_on_copy(self):
        original=pathlib.Path('backend/database/bora_obra.db')
        if not original.exists(): self.skipTest('No legacy database')
        with tempfile.TemporaryDirectory() as temp:
            target=pathlib.Path(temp)/'legacy.db'
            with closing(sqlite3.connect(original)) as source, closing(sqlite3.connect(target)) as destination:
                before=source.execute('SELECT COUNT(*) FROM users').fetchone()[0]
                source.backup(destination)
            app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///'+target.as_posix(),'SEED_DATA':False})
            with app.app_context():
                self.assertEqual(User.query.count(),before)
                inicializar_banco()
                db.session.remove(); db.engine.dispose()


if __name__=='__main__': unittest.main()

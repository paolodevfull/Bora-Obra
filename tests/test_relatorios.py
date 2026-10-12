import unittest
from xml.etree import ElementTree
import test_fluxo
from backend.database.database import db
from backend.models.pedido import Pedido
from backend.models.item_pedidos import ItemPedidos
from backend.models.produto import Produto
from backend.models.user import User
from urllib.parse import urlencode


class RelatoriosTest(unittest.TestCase):
    setUp = test_fluxo.FluxoTest.setUp
    tearDown = test_fluxo.FluxoTest.tearDown
    call = test_fluxo.FluxoTest.call
    register = test_fluxo.FluxoTest.register
    order = test_fluxo.FluxoTest.order

    def fixture_filters(self):
        with self.app.app_context():
            cliente = User.query.filter_by(email='cliente@example.com').one()
            cliente.nome = 'Ana Teste'
            outro = User.query.filter_by(email='outro@example.com').one()
            outro.nome = 'Bruno Teste'
            p = db.session.get(Produto, self.produto['id'])
            p.categoria = 'Ferramentas'
            second = Produto(loja_id=self.loja['id'], nome='Serra', categoria='Corte', utilidade='Cortar',
                              descricao='Serra de teste', sku='SERRA-TESTE', preco_venda=20, preco_locacao=5)
            db.session.add(second)
            db.session.flush()
            self.second_id = second.id
            specs = [
                ('2026-09-01 00:00:00', 'Confirmado', 'Venda', 'Pix', cliente.id, 'Centro', [(p.id, 2, 10.10, 1), (second.id, 1, 20, 1)]),
                ('2026-09-02 23:59:59', 'Entregue', 'Locacao', 'Dinheiro', outro.id, 'Sul', [(second.id, 2, 5, 3)]),
                ('2026-09-03 12:00:00', 'Despachado', 'Venda', 'Cartão de crédito', cliente.id, 'Centro', [(p.id, 1, 10.10, 1)]),
                ('2026-09-04 12:00:00', 'Pendente', 'Venda', 'Cartão de débito', cliente.id, 'Sul', [(p.id, 1, 10.10, 1)]),
                ('2026-09-05 12:00:00', 'Cancelado', 'Venda', 'Pix', outro.id, 'Centro', [(second.id, 1, 20, 1)]),
            ]
            for data, status, tipo, pagamento, uid, regiao, itens in specs:
                pedido = Pedido(user_id=uid, loja_id=self.loja['id'], created_at=__import__('datetime').datetime.fromisoformat(data), status=status,
                                tipo=tipo, forma_pagamento=pagamento, endereco_entrega=regiao,
                                valor_total=sum(q * v * d for _, q, v, d in itens))
                db.session.add(pedido)
                db.session.flush()
                for pid, q, v, d in itens:
                    db.session.add(ItemPedidos(pedido_id=pedido.id, produto_id=pid, quantidade=q, valor_unitario=v, dias_locacao=d))
            db.session.commit()

    def report(self, **filters):
        query = {'inicio': '2026-09-01', 'fim': '2026-09-30', **filters}
        return self.call(self.owner, 'get', '/api/relatorios/detalhado?' + urlencode(query))

    def test_every_filter_and_combination(self):
        self.fixture_filters()
        cases = [
            ({}, 80.30, 5, 6, 26.77),
            ({'tipo': 'Venda'}, 50.30, 4, 4, 25.15),
            ({'tipo': 'Locacao'}, 30, 1, 2, 30),
            ({'status': 'Confirmado'}, 40.20, 1, 3, 40.20),
            ({'status': 'Entregue'}, 30, 1, 2, 30),
            ({'status': 'Despachado'}, 10.10, 1, 1, 10.10),
            ({'status': 'Pendente'}, 0, 1, 0, 0),
            ({'status': 'Cancelado'}, 0, 1, 0, 0),
            ({'pagamento': 'Pix'}, 40.20, 2, 3, 40.20),
            ({'pagamento': 'Dinheiro'}, 30, 1, 2, 30),
            ({'pagamento': 'Cartão de crédito'}, 10.10, 1, 1, 10.10),
            ({'pagamento': 'Cartão de débito'}, 0, 1, 0, 0),
            ({'cliente': 'Ana'}, 50.30, 3, 4, 25.15),
            ({'regiao': 'Sul'}, 30, 2, 2, 30),
            ({'categoria': 'Corte'}, 50, 3, 3, 25),
            ({'produto': 'Serra'}, 50, 3, 3, 25),
            ({'produtos': str(self.second_id)}, 50, 3, 3, 25),
            ({'produtos': f"{self.second_id},{self.produto['id']}"}, 80.30, 5, 6, 26.77),
            ({'loja': str(self.loja['id'])}, 80.30, 5, 6, 26.77),
            ({'inicio': '2026-09-01', 'fim': '2026-09-02'}, 70.20, 2, 5, 35.10),
            ({'inicio': '2026-08-01', 'fim': '2026-08-31'}, 0, 0, 0, 0),
            ({'cliente': 'Ana', 'categoria': 'Corte', 'pagamento': 'Pix', 'status': 'Confirmado', 'tipo': 'Venda', 'regiao': 'Centro'}, 20, 1, 1, 20),
        ]
        for filters, total, pedidos, quantidade, ticket in cases:
            with self.subTest(filters=filters):
                data = self.report(**filters)
                r = data['resumo']
                self.assertEqual(r['total_vendido'], total)
                self.assertEqual(r['quantidade_pedidos'], pedidos)
                self.assertEqual(r['produtos_vendidos'], quantidade)
                self.assertEqual(r['ticket_medio'], ticket)
                self.assertAlmostEqual(sum(p['total'] for p in data['pedidos']), total)
                self.assertAlmostEqual(sum(p['faturamento'] for p in data['ranking_completo']), total)
                self.assertAlmostEqual(sum(p['vendas'] + p['locacoes'] for p in data['serie']), total)
                xml = self.owner.get('/api/relatorios/detalhado.xml?' + urlencode({'inicio': '2026-09-01', 'fim': '2026-09-30', **filters}))
                self.assertEqual(xml.status_code, 200)
                self.assertEqual(float(ElementTree.fromstring(xml.data).findtext('resumo/total_vendido')), total)

    def test_all_ranking_modes_and_limits(self):
        self.fixture_filters()
        with self.app.app_context():
            for i in range(22):
                db.session.add(Produto(loja_id=self.loja['id'], nome=f'Sem venda {i:02}', categoria='Extra',
                    utilidade='Demonstração', descricao='Produto sem venda', sku=f'SEM-{i:02}',
                    preco_venda=1, preco_locacao=1))
            db.session.commit()
        for order in ['mais_vendidos', 'menos_vendidos', 'maior_faturamento', 'menor_faturamento']:
            for criterio in ['quantidade', 'faturamento']:
                for limite, tamanho in [('5', 5), ('10', 10), ('20', 20), ('todos', 24)]:
                    with self.subTest(order=order, criterio=criterio, limite=limite):
                        data = self.report(ordenacao=order, criterio=criterio, limite=limite)
                        campo = 'faturamento' if 'faturamento' in order else criterio
                        values = [p[campo] for p in data['ranking']]
                        self.assertEqual(values, sorted(values, reverse=order in {'mais_vendidos', 'maior_faturamento'}))
                        self.assertEqual(len(values), tamanho)
                        self.assertEqual(data['resumo']['total_vendido'], 80.30)
                        self.assertEqual(len(data['ranking_completo']), 24)
        self.assertEqual(len(self.report(ordenacao='sem_vendas', limite='todos')['ranking']), 22)
        self.assertEqual(self.report(ordenacao='recentes')['ranking'][0]['nome'], 'Furadeira')

    def test_product_options_pagination(self):
        with self.app.app_context():
            for i in range(110):
                db.session.add(Produto(loja_id=self.loja['id'], nome=f'Produto {i:03}', categoria='Teste',
                    utilidade='Demonstração', descricao='Produto de paginação', sku=f'PAG-{i:03}',
                    preco_venda=1, preco_locacao=1))
            db.session.commit()
        pages = [self.call(self.owner, 'get', f'/api/relatorios/opcoes?pagina={p}') for p in (1, 2, 3)]
        self.assertEqual([len(p['produtos']) for p in pages], [50, 50, 11])
        self.assertEqual(len({v['id'] for p in pages for v in p['produtos']}), 111)
    def test_multiple_products_ranking_and_exports(self):
        second = self.call(self.owner, 'post', '/api/produtos', {
            'nome': 'Serra', 'preco_venda': 10.15, 'preco_locacao': 5, 'categoria': 'Corte',
            'utilidade':'Cortar','descricao':'Serra de teste','sku':'SERRA-API','estoque': 20}, 201)
        order = self.call(self.client, 'post', '/api/pedidos', self.order('Venda', itens=[
            {'produto_id': self.produto['id'], 'quantidade': 2},
            {'produto_id': second['id'], 'quantidade': 3}]), 201)
        self.call(self.owner, 'patch', f"/api/pedidos/{order['id']}", {'status': 'Confirmado'})
        base = '/api/relatorios/detalhado'
        all_data = self.call(self.owner, 'get', base)
        self.assertAlmostEqual(all_data['resumo']['total_vendido'], 430.25)
        self.assertEqual(all_data['ranking'][0]['nome'], 'Serra')
        amount = self.call(self.owner, 'get', base + '?criterio=faturamento')
        self.assertEqual(amount['ranking'][0]['nome'], 'Furadeira')
        filtered = self.call(self.owner, 'get', base + f"?produtos={second['id']}")
        self.assertEqual(filtered['resumo']['total_vendido'], 30.45)
        both = self.call(self.owner, 'get', base + f"?produtos={second['id']},{self.produto['id']}")
        self.assertEqual(both['resumo'], all_data['resumo'])
        xml = self.owner.get(base + f".xml?produtos={second['id']}")
        root = ElementTree.fromstring(xml.data)
        self.assertEqual(root.findtext('resumo/total_vendido'), '30.45')
        self.assertTrue(root.findtext('gerado_em'))
        self.assertIsNotNone(root.find('ranking_completo'))

    def test_filter_validation_and_empty_ranking(self):
        for query in ('produtos=abc', 'limite=999', 'inicio=errado', 'status_pagamento=pago'):
            self.call(self.owner, 'get', '/api/relatorios/detalhado?' + query, status=400)
        for query in ('loja=99999', 'produtos=99999'):
            self.call(self.owner, 'get', '/api/relatorios/detalhado?' + query, status=403)
        self.call(self.client, 'get', '/api/relatorios/opcoes', status=403)
        empty = self.call(self.owner, 'get', '/api/relatorios/detalhado?ordenacao=sem_vendas')
        self.assertEqual(empty['ranking'][0]['quantidade'], 0)
        self.assertEqual(empty['resumo']['total_vendido'], 0)
        options = self.call(self.owner, 'get', '/api/relatorios/opcoes?busca=Furadeira')
        self.assertEqual(options['total'], 1)
        self.assertEqual(options['produtos'][0]['id'], self.produto['id'])

    def test_pending_and_cancelled_do_not_enter_totals(self):
        order = self.call(self.client, 'post', '/api/pedidos', self.order('Venda'), 201)
        self.call(self.owner, 'patch', f"/api/pedidos/{order['id']}", {'status': 'Cancelado'})
        data = self.call(self.owner, 'get', '/api/relatorios/detalhado')
        self.assertEqual(data['resumo']['quantidade_pedidos'], 1)
        self.assertEqual(data['resumo']['total_vendido'], 0)
        self.assertEqual(data['serie'], [])

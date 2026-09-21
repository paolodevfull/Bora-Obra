import { showToast } from './ui.js';

const cache = new Map();
const controllers = new Map();

function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '').slice(0, 8);
}

function formatarCep(valor) {
    const numeros = somenteNumeros(valor);
    return numeros.length > 5 ? `${numeros.slice(0, 5)}-${numeros.slice(5)}` : numeros;
}

function definirStatus(prefixo, mensagem = '', tipo = '') {
    const status = document.getElementById(`${prefixo}-cep-status`);
    if (!status) return;
    status.textContent = mensagem;
    status.dataset.tipo = tipo;
}

function preencher(prefixo, endereco) {
    const valores = {
        logradouro: endereco.logradouro,
        bairro: endereco.bairro,
        cidade: endereco.localidade,
        uf: endereco.uf
    };
    Object.entries(valores).forEach(([campo, valor]) => {
        const input = document.getElementById(`${prefixo}-${campo}`);
        if (input && valor) input.value = valor;
    });
}

export async function consultarCep(prefixo, { focarNumero = false } = {}) {
    const input = document.getElementById(`${prefixo}-cep`);
    if (!input) return;
    const cep = somenteNumeros(input.value);
    input.value = formatarCep(cep);
    input.setCustomValidity('');

    if (cep.length < 8) {
        definirStatus(prefixo, cep ? 'Digite os 8 números do CEP.' : '');
        return;
    }

    controllers.get(prefixo)?.abort();
    const controller = new AbortController();
    controllers.set(prefixo, controller);
    input.setAttribute('aria-busy', 'true');
    definirStatus(prefixo, 'Buscando endereço…', 'carregando');

    try {
        let endereco = cache.get(cep);
        if (!endereco) {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
                signal: controller.signal,
                headers: { Accept: 'application/json' }
            });
            if (!response.ok) throw new Error('O serviço de CEP não respondeu corretamente.');
            endereco = await response.json();
            if (endereco.erro) throw new Error('CEP não encontrado. Confira os números informados.');
            cache.set(cep, endereco);
        }
        preencher(prefixo, endereco);
        definirStatus(prefixo, 'Endereço encontrado. Confira o número e o complemento.', 'sucesso');
        if (focarNumero) document.getElementById(`${prefixo}-numero`)?.focus();
    } catch (error) {
        if (error.name === 'AbortError') return;
        input.setCustomValidity(error.message.includes('não encontrado') ? error.message : '');
        definirStatus(prefixo, `${error.message} Você pode preencher o endereço manualmente.`, 'erro');
        showToast(error.message, 'aviso');
    } finally {
        if (controllers.get(prefixo) === controller) {
            controllers.delete(prefixo);
            input.removeAttribute('aria-busy');
        }
    }
}

export function configurarViaCep(prefixos) {
    prefixos.forEach(prefixo => {
        const input = document.getElementById(`${prefixo}-cep`);
        if (!input) return;
        let timer;
        input.addEventListener('input', () => {
            input.value = formatarCep(input.value);
            input.setCustomValidity('');
            definirStatus(prefixo);
            clearTimeout(timer);
            if (somenteNumeros(input.value).length === 8) {
                timer = setTimeout(() => consultarCep(prefixo), 300);
            }
        });
        input.addEventListener('blur', () => {
            clearTimeout(timer);
            if (somenteNumeros(input.value).length === 8) consultarCep(prefixo, { focarNumero: false });
        });
    });
}

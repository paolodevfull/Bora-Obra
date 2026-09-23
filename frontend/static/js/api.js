// Same-origin API client shared by all feature modules.
let csrfToken = '';

async function getCsrfToken(force = false) {
    if (csrfToken && !force) return csrfToken;
    const response = await fetch('/api/auth/csrf', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Não foi possível iniciar uma sessão segura. Atualize a página.');
    const data = await response.json();
    csrfToken = data.csrf_token;
    return csrfToken;
}

export async function apiRequest(endpoint, options = {}, accepted = []) {
    let response;
    try {
        const method = (options.method || 'GET').toUpperCase();
        const multipart = options.body instanceof FormData;
        const headers = { Accept: 'application/json', ...options.headers };
        if (!multipart && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            headers['X-CSRF-Token'] = await getCsrfToken();
        }
        response = await fetch(endpoint, {
            ...options,
            credentials: 'same-origin',
            headers
        });
        if (response.status === 403 && headers['X-CSRF-Token']) {
            const errorData = await response.clone().json().catch(() => ({}));
            if (/sessão de segurança/i.test(errorData.erro || '')) {
                headers['X-CSRF-Token'] = await getCsrfToken(true);
                response = await fetch(endpoint, { ...options, credentials: 'same-origin', headers });
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Sem conexão com o servidor. Verifique sua conexão e tente novamente.');
    }
    if (!response.ok && !accepted.includes(response.status)) {
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.clone().json().catch(() => ({})) : {};
        const serverMessage = data.mensagem || data.message || data.erro || '';
        const technical = /(traceback|sql|database|constraint|exception|\/api\/|stack)/i.test(serverMessage);
        const defaults = {
            400: 'Revise os dados informados e tente novamente.',
            401: endpoint.includes('/auth/login') ? 'E-mail ou senha inválidos.' : 'Sua sessão terminou. Entre novamente.',
            403: 'Você não tem permissão para realizar esta ação.',
            404: 'Não encontramos o conteúdo solicitado.',
            409: 'Não foi possível concluir porque os dados já estão em uso.',
            429: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
            500: 'Ocorreu um problema no servidor. Tente novamente em alguns instantes.'
        };
        const message = technical || response.status >= 500 ? defaults[response.status] : serverMessage || defaults[response.status] || 'Não foi possível concluir a operação.';
        const error = new Error(message);
        error.status = response.status;
        const sessaoInvalida = response.status === 401
            || (response.status === 403 && /conta.*inativ/i.test(serverMessage));
        if (sessaoInvalida && !endpoint.includes('/auth/login')) {
            window.dispatchEvent(new CustomEvent('boraobra:session-expired'));
        }
        throw error;
    }
    return response;
}

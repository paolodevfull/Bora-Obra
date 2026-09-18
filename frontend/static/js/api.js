// Same-origin API client shared by all feature modules.
export async function apiRequest(endpoint, options = {}, accepted = []) {
    let response;
    try {
        response = await fetch(endpoint, {
            ...options,
            credentials: 'same-origin',
            headers: {'Content-Type': 'application/json', Accept: 'application/json', ...options.headers}
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Sem conexão com o servidor. Verifique sua conexão e tente novamente.');
    }
    if (!response.ok && !accepted.includes(response.status)) {
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json') ? await response.clone().json().catch(() => ({})) : {};
        const error = new Error(data.mensagem || data.message || data.erro || `Não foi possível concluir a operação (${response.status}).`);
        error.status = response.status;
        if (response.status === 401) window.dispatchEvent(new CustomEvent('boraobra:session-expired'));
        throw error;
    }
    return response;
}

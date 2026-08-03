document.addEventListener('DOMContentLoaded', async () => {
    const statusBox = document.getElementById('api-status');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/status');
        const data = await response.json();

        if (response.ok) {
            statusBox.textContent = `🟢 ${data.status} | Total de Produtos: ${data.total_produtos}`;
            statusBox.style.backgroundColor = '#e9f7ef';
            statusBox.style.borderColor = '#c3e6cb';
            statusBox.style.color = '#155724';
        } else {
            throw new Error();
        }
    } catch (err) {
        statusBox.textContent = '🔴 Servidor Offline ou com erro';
        statusBox.style.backgroundColor = '#f8d7da';
        statusBox.style.borderColor = '#f5c6cb';
        statusBox.style.color = '#721c24';
    }
});
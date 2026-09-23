export function clearFieldErrors(form) {
    form?.querySelectorAll('.field-error').forEach(element => { element.textContent = ''; });
    form?.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute('aria-invalid'));
}

export function fieldError(id, message) {
    const input = document.getElementById(id);
    const error = document.getElementById(`${id}-error`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
    return false;
}

export function validateRequired(input, message) {
    if (String(input?.value || '').trim()) return true;
    return fieldError(input?.id, message);
}

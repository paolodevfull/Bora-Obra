from decimal import Decimal, InvalidOperation
from backend.services.errors import ServiceError


def texto(value, label, minimum=1, maximum=250):
    if not isinstance(value, str) or not minimum <= len(value.strip()) <= maximum:
        raise ServiceError(f'{label}: informe entre {minimum} e {maximum} caracteres.')
    return value.strip()


def positivo(value, label):
    try:
        if isinstance(value, bool):
            raise ValueError
        number = Decimal(str(value))
        if not number.is_finite() or number <= 0 or number > 1000000000:
            raise ValueError
        rounded = number.quantize(Decimal('0.01'))
        if rounded <= 0:
            raise ValueError
        return float(rounded)
    except (ValueError, InvalidOperation, TypeError):
        raise ServiceError(f'{label} deve ser um valor positivo válido.')


def inteiro(value, label, minimum=1):
    if isinstance(value, bool):
        raise ServiceError(f'{label} deve ser um número inteiro.')
    try:
        result = int(str(value))
        if not minimum <= result <= 1000000:
            raise ValueError
        return result
    except (ValueError, TypeError):
        raise ServiceError(f'{label} deve ser um inteiro maior ou igual a {minimum}.')


def booleano(value, label):
    if not isinstance(value, bool):
        raise ServiceError(f'{label} deve ser verdadeiro ou falso.')
    return value

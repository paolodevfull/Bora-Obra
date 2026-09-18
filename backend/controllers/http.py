from functools import wraps
from flask import request, jsonify
from backend.services.errors import ServiceError

def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict): raise ServiceError('Envie um objeto JSON válido.')
    return data

def endpoint(function):
    @wraps(function)
    def wrapped(*args, **kwargs):
        try:
            return function(*args, **kwargs)
        except ServiceError as error:
            return jsonify(erro=str(error)), error.status
    return wrapped

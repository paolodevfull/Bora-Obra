import re
import time
from uuid import uuid4

from flask import g, request


_SAFE_REQUEST_ID = re.compile(r'^[A-Za-z0-9._-]{8,64}$')


def begin_request():
    supplied = request.headers.get('X-Request-ID', '')
    g.request_id = supplied if _SAFE_REQUEST_ID.fullmatch(supplied) else uuid4().hex
    g.request_started_at = time.perf_counter()


def finish_request(app, response):
    elapsed_ms = (time.perf_counter() - getattr(g, 'request_started_at', time.perf_counter())) * 1000
    request_id = getattr(g, 'request_id', uuid4().hex)
    response.headers['X-Request-ID'] = request_id
    response.headers['Server-Timing'] = f'app;dur={elapsed_ms:.1f}'
    if elapsed_ms >= app.config['SLOW_REQUEST_MS']:
        app.logger.warning(
            'Requisição lenta request_id=%s method=%s path=%s status=%s duration_ms=%.1f',
            request_id, request.method, request.path, response.status_code, elapsed_ms,
        )
    return response


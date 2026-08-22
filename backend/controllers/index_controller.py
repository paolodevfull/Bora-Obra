from flask import Blueprint, jsonify

index_bp = Blueprint('index_bp', __name__)

class IndexController:

    @staticmethod
    @index_bp.route('/', methods=['GET'])
    def status():
        return jsonify({"status": "API BoraObra Online"}), 200
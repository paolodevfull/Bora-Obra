import os

# Define o caminho absoluto da pasta 'backend/' (onde este arquivo config.py está)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

from flask import Flask, redirect, render_template, request, url_for
from flask_sqlalchemy import SQLAlchemy


#----------------------------- BANCO ----------------------------

boraObra = Flask(__name__)

database = os.path.abspath(os.path.dirname(__file__))
boraObra.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(  
    database, 'backend','database','bora_obra.db'
)

boraObra.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(boraObra)


with boraObra.app_context():
    db.create_all()

#-----------------------------------------------------------------


if __name__ == '__main__':
    boraObra.run(debug=True)
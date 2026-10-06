import os
import socket
import psycopg
from flask import Flask, jsonify, request

app = Flask(__name__)

# Variáveis de ambiente (com valores por omissão)
PORT   = int(os.getenv("PORT", 5500))      # ex.: "5500"
NUMBER = os.getenv("NUMBER", "0")          # ex.: "1" (útil para distinguir backends)

# ONDE está a base de dados? (o upstream do backend)
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = int(os.getenv("DB_PORT", 5432))
DB_NAME     = os.getenv("DB_NAME", "stackerino")
DB_USER     = os.getenv("DB_USER", "stackerino")
DB_PASSWORD = os.getenv("DB_PASSWORD", "stackerino")


def ligar_bd():
    # O servidor BACKEND liga-se ao servidor de BASE DE DADOS (chamada entre serviços)
    return psycopg.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASSWORD, connect_timeout=3,
    )


def erro_bd(err):
    print(f"Não foi possível usar a base de dados em {DB_HOST}:{DB_PORT}: {err}")
    return jsonify({"erro": "A base de dados não responde", "detalhe": str(err).strip()}), 503


# O backend fala JSON (dados), não HTML (páginas).
@app.get("/api/mensagens")
def listar_mensagens():
    try:
        with ligar_bd() as conn:
            linhas = conn.execute(
                "SELECT id, autor, texto, criada_em FROM mensagens ORDER BY id DESC LIMIT 20"
            ).fetchall()
    except psycopg.Error as err:
        return erro_bd(err)

    return jsonify({
        "backend_number": NUMBER,
        "backend_hostname": socket.gethostname(),
        "mensagens": [
            {"id": i, "autor": a, "texto": t, "criada_em": c.strftime("%Y-%m-%d %H:%M:%S")}
            for (i, a, t, c) in linhas
        ],
    })


@app.post("/api/mensagens")
def criar_mensagem():
    dados = request.get_json(silent=True) or {}
    autor = str(dados.get("autor", "")).strip()[:50]
    texto = str(dados.get("texto", "")).strip()[:280]
    if not autor or not texto:
        return jsonify({"erro": "Os campos 'autor' e 'texto' são obrigatórios"}), 400

    try:
        with ligar_bd() as conn:
            (novo_id,) = conn.execute(
                "INSERT INTO mensagens (autor, texto) VALUES (%s, %s) RETURNING id", (autor, texto)
            ).fetchone()
    except psycopg.Error as err:
        return erro_bd(err)

    return jsonify({"id": novo_id, "autor": autor, "texto": texto}), 201


# Health-check: o backend está vivo? E consegue falar com a base de dados?
@app.get("/healthcheck")
def healthcheck():
    try:
        with ligar_bd() as conn:
            conn.execute("SELECT 1")
        return jsonify({"backend": "ok", "base_de_dados": "ok"}), 200
    except psycopg.Error as err:
        return jsonify({"backend": "ok", "base_de_dados": "erro", "detalhe": str(err).strip()}), 503


if __name__ == "__main__":
    # 0.0.0.0 = escutar em TODAS as placas de rede (necessário para outras máquinas chegarem cá)
    print(f"Backend {NUMBER} à escuta em http://0.0.0.0:{PORT}/api/mensagens")
    print(f"O backend vai usar a base de dados em {DB_HOST}:{DB_PORT}/{DB_NAME} (utilizador {DB_USER})")
    app.run(host="0.0.0.0", port=PORT)

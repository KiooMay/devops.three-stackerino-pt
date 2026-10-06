-- Cria a tabela onde o backend guarda as mensagens.
-- Corre UMA vez:  psql -h localhost -U stackerino -d stackerino -f db/init.sql
CREATE TABLE IF NOT EXISTS mensagens (
  id        SERIAL PRIMARY KEY,
  autor     VARCHAR(50)  NOT NULL,
  texto     VARCHAR(280) NOT NULL,
  criada_em TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO mensagens (autor, texto) VALUES ('Professor', 'Bem-vindos ao Three-Stackerino! 🎉');

# Three-Stackerino 🖥️ ➡️ 🧠 ➡️ 🗄️

Três serviços que **falam uns com os outros**, todos a correr no teu computador (WSL):

| Pasta       | O que é             | Tecnologia      | Porta  | Fala…                            |
| ----------- | ------------------- | --------------- | ------ | -------------------------------- |
| `frontend/` | **Frontend**        | Node.js/Express | `3000` | HTML (páginas para humanos) 👀   |
| `backend/`  | **Backend (API)**   | Python/Flask    | `5500` | JSON (dados para programas) 🤖   |
| `db/`       | **Base de dados**   | PostgreSQL      | `5432` | SQL (guarda os dados no disco) 💾 |

No **two-stackerino** puseste **dois** serviços a falar. Agora acrescentamos o terceiro: uma **base de dados** a sério. A aplicação é um **mural de mensagens**: escreves uma mensagem na página, ela é guardada na base de dados, e continua lá mesmo que desligues tudo.

> [!IMPORTANT]
> Este lab é para correr **localmente, no WSL (Ubuntu)**. Não precisas de VMs, nem de cloud, nem de Docker.

---

## 0. Como é que os três serviços se ligam?

Continuando o restaurante 🍝:

- O **frontend** é o **empregado de mesa**: fala com o cliente (tu, no browser).
- O **backend** é a **cozinha**: faz o trabalho a sério.
- A **base de dados** é a **despensa**: é onde as coisas ficam guardadas. Só a cozinha lá entra.

```
 ┌─────────┐  GET /       ┌────────────┐  GET /api/mensagens  ┌────────────┐   SELECT / INSERT   ┌──────────────┐
 │ Browser │ ───────────► │  FRONTEND  │ ───────────────────► │  BACKEND   │ ──────────────────► │  POSTGRESQL  │
 │  (tu)   │ ◄─────────── │  :3000     │ ◄─────────────────── │  :5500     │ ◄────────────────── │  :5432       │
 └─────────┘  página HTML └────────────┘   dados JSON         └────────────┘   linhas da tabela  └──────────────┘
```

> [!IMPORTANT]
> 💡 **Ideia-chave:** cada serviço só conhece **o seguinte** na cadeia, e encontra-o através de **variáveis de ambiente**:
> - o frontend encontra o backend com `BACKEND_URL`
> - o backend encontra a base de dados com `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
>
> O frontend **nunca** fala diretamente com a base de dados.

### Variáveis de ambiente

| Serviço  | Variável      | Para que serve                                  | Por omissão             |
| -------- | ------------- | ----------------------------------------------- | ----------------------- |
| frontend | `PORT`        | Porta onde o frontend fica à escuta             | `3000`                  |
| frontend | `BACKEND_URL` | **Onde é que o frontend encontra o backend**    | `http://localhost:5500` |
| backend  | `PORT`        | Porta onde o backend fica à escuta              | `5500`                  |
| backend  | `NUMBER`      | Número mostrado na página                       | `0`                     |
| backend  | `DB_HOST`     | **Onde é que o backend encontra a base de dados** | `localhost`           |
| backend  | `DB_PORT`     | Porta da base de dados                          | `5432`                  |
| backend  | `DB_NAME`     | Nome da base de dados                           | `stackerino`            |
| backend  | `DB_USER`     | Utilizador da base de dados                     | `stackerino`            |
| backend  | `DB_PASSWORD` | Palavra-passe da base de dados                  | `stackerino`            |

### Endpoints

| Serviço  | Endpoint                | O que faz                                                   |
| -------- | ----------------------- | ----------------------------------------------------------- |
| frontend | `GET /`                 | Página com o mural e o formulário                           |
| frontend | `POST /mensagens`       | Recebe o formulário e envia-o ao backend                    |
| backend  | `GET /api/mensagens`    | Lista as últimas 20 mensagens (JSON)                        |
| backend  | `POST /api/mensagens`   | Guarda uma mensagem `{"autor": "...", "texto": "..."}`      |
| backend  | `GET /healthcheck`      | Diz se o backend está vivo **e** se consegue falar com a BD |

---

## Antes de começar (WSL) 🐧

- Abre o **Ubuntu** (WSL). Vais precisar de **3 terminais**: no Windows Terminal, abre novos separadores com `Ctrl + Shift + T` (ou usa o VS Code com `code .` e divide o terminal).
- Trabalha **dentro do Linux** (ex.: `~/`), não em `/mnt/c/...`. É muito mais rápido.
- O browser do Windows consegue abrir `http://localhost:3000` diretamente: o WSL reencaminha as portas.

> [!TIP]
> No prompt do teu terminal deve aparecer o teu utilizador (ex.: `joana@PC:~$`). Isso vai aparecer nos prints: é assim que eu sei que são teus.

---

## Passo 1 — Fazer fork e clonar o repositório

1. No GitHub, abre https://github.com/professordiogodev/devops.three-stackerino-pt e carrega em **Fork** (canto superior direito). Fica com uma cópia na tua conta.
2. No WSL:

```bash
sudo apt update
sudo apt install git -y
cd ~
git clone https://github.com/<O-TEU-UTILIZADOR>/devops.three-stackerino-pt
cd devops.three-stackerino-pt
```

---

## Passo 2 — Terminal 1: a BASE DE DADOS 🗄️

### 2.1 Instalar e arrancar o PostgreSQL

```bash
sudo apt install postgresql -y
sudo service postgresql start
sudo service postgresql status      # deve dizer "online"
```

> [!NOTE]
> No WSL, o PostgreSQL **não arranca sozinho** quando abres o computador. Sempre que voltares a este lab, corre outra vez `sudo service postgresql start`.

### 2.2 Criar o utilizador e a base de dados

O PostgreSQL vem com um superutilizador chamado `postgres`. Usamo-lo **uma vez** para criar um utilizador e uma base de dados só para a nossa aplicação:

```bash
sudo -u postgres psql -c "CREATE USER stackerino WITH PASSWORD 'stackerino';"
sudo -u postgres psql -c "CREATE DATABASE stackerino OWNER stackerino;"
```

### 2.3 Criar a tabela

```bash
psql -h localhost -U stackerino -d stackerino -f db/init.sql
```

Pede a palavra-passe: escreve `stackerino` (não aparece nada enquanto escreves, é normal).

### 2.4 Ver o que lá está

```bash
psql -h localhost -U stackerino -d stackerino
```

Dentro do `psql` (o prompt muda para `stackerino=>`):

```sql
\dt
SELECT * FROM mensagens;
```

Deves ver a tabela `mensagens` com **uma** mensagem do Professor. Sai com `\q`.

> [!TIP]
> ✅ A base de dados está pronta. Ela fala **SQL**, na porta **5432**. Ninguém lhe vai abrir uma página no browser: só o backend fala com ela.

---

## Passo 3 — Terminal 2: o BACKEND 🧠

Abre um **novo** terminal:

```bash
cd ~/devops.three-stackerino-pt/backend

sudo apt install python3-venv -y
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt

export NUMBER=1
python3 app.py
```

Ao arrancar, o backend mostra **onde** vai procurar a base de dados:

```
Backend 1 à escuta em http://0.0.0.0:5500/api/mensagens
O backend vai usar a base de dados em localhost:5432/stackerino (utilizador stackerino)
```

> [!TIP]
> ✅ Testa no browser:
> - http://localhost:5500/healthcheck → `{"backend": "ok", "base_de_dados": "ok"}`
> - http://localhost:5500/api/mensagens → **JSON** com a mensagem do Professor

> [!WARNING]
> Deixa este terminal **a correr**! `Ctrl + C` para o backend.

---

## Passo 4 — Terminal 3: o FRONTEND 🖥️

Abre um **terceiro** terminal. Primeiro confirma a versão do Node:

```bash
node -v
```

Precisas da versão **18 ou superior**. Se der erro ou uma versão mais antiga, instala com o `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
node -v
```

Depois:

```bash
cd ~/devops.three-stackerino-pt/frontend
npm install

export BACKEND_URL=http://localhost:5500
node index.js
```

> [!TIP]
> ✅ Abre http://localhost:3000. Deves ver **Frontend ✅ → Backend ✅ → Base de dados ✅**, a mensagem do Professor e um formulário.

### 4.1 Escrever no mural ✍️

Publica **3 mensagens**, pelo menos uma com o **teu nome** no campo "autor". Depois volta ao **Terminal 1** e confirma que elas chegaram à base de dados:

```bash
psql -h localhost -U stackerino -d stackerino -c "SELECT * FROM mensagens;"
```

🎉 **Três serviços integrados!** Tu escreveste no browser → o frontend enviou ao backend → o backend guardou no PostgreSQL.

Agora para o frontend e o backend (`Ctrl + C`) e volta a arrancá-los. As mensagens **continuam lá**: estão guardadas na base de dados, não na memória das aplicações.

---

## Passo 5 — Estragar de propósito 🔨 (muito importante!)

Numa cadeia de 3 serviços, quando algo falha tens de descobrir **qual dos elos** partiu.

### 5.1 Desligar a base de dados

```bash
# Terminal 1
sudo service postgresql stop
```

Atualiza http://localhost:3000 → **🟠 O backend responde, mas a base de dados não**. Abre também http://localhost:5500/healthcheck → `"base_de_dados": "erro"`. Olha para o Terminal 2: o erro aparece no log do backend.

Volta a ligar: `sudo service postgresql start` e atualiza a página.

### 5.2 Desligar o backend

No Terminal 2, `Ctrl + C`. Atualiza http://localhost:3000 → **😢 O frontend está ligado, mas o backend não responde**.

Volta a arrancar o backend (`python3 app.py`) e atualiza.

> [!IMPORTANT]
> Repara: a **mesma** página de erro aparece em sítios diferentes da cadeia. O frontend só sabe falar com o backend; é o backend que lhe diz "a BD não responde". É assim que se diagnostica na vida real: **segue a cadeia, um elo de cada vez.**

### 🩺 Lista de diagnóstico

1. A BD está a correr? `sudo service postgresql status`
2. Consigo entrar na BD com os dados do backend? `psql -h localhost -U stackerino -d stackerino -c "SELECT 1;"`
3. O backend está a correr e chega à BD? `curl localhost:5500/healthcheck`
4. O frontend está a correr? `curl localhost:3000/healthcheck`
5. O `BACKEND_URL` e as `DB_*` estão certos? Os dois serviços mostram-nos quando arrancam.

| Erro                                                   | Causa provável                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `Connection refused` na porta 5432                      | PostgreSQL desligado → `sudo service postgresql start`                         |
| `password authentication failed for user "stackerino"` | `DB_PASSWORD` errada, ou não correste o passo 2.2                              |
| `relation "mensagens" does not exist`                  | Não correste o `db/init.sql` (passo 2.3)                                       |
| `database "stackerino" does not exist`                 | Não correste o passo 2.2                                                       |
| `Address already in use` (porta 5500 ou 3000)          | Já tens algo nessa porta (ex.: outro terminal ou o Live Server do VS Code). Fecha-o, ou muda a `PORT` |
| `fetch is not defined` / `fetch failed` no frontend    | Node antigo (< 18) ou backend desligado                                        |

---

## Passo 6 — Desafio obrigatório: total de mensagens 🧮

Vais acrescentar uma funcionalidade que atravessa **os três serviços**:

> A página do frontend deve mostrar **"Total de mensagens: N"**, em que N é calculado pela base de dados.

O que tens de fazer:

1. **Base de dados:** a contagem faz-se em SQL: `SELECT COUNT(*) FROM mensagens;` (experimenta-a primeiro no `psql`).
2. **Backend (`backend/app.py`):** cria um endpoint novo `GET /api/estatisticas` que devolve `{"total_mensagens": N}`. Inspira-te no `listar_mensagens()`.
3. **Frontend (`frontend/index.js`):** na rota `GET /`, chama também `${backendUrl}/api/estatisticas` e mostra o total na página.
4. Reinicia o backend e o frontend (`Ctrl + C` e voltar a arrancar) e testa.
5. Faz commit e push para o **teu** fork:

```bash
cd ~/devops.three-stackerino-pt
git add .
git commit -m "Desafio: total de mensagens"
git push
```

> [!TIP]
> Se o `git push` pedir palavra-passe, o GitHub não aceita a tua palavra-passe normal: usa um **Personal Access Token** (GitHub → Settings → Developer settings → Personal access tokens) ou faz login com `gh auth login`.

---

## 📤 Entrega (no Teams)

Na tarefa do Teams, entrega:

1. O **link do teu fork** no GitHub (ex.: `https://github.com/joana/devops.three-stackerino-pt`), com o commit do desafio.
2. **7 prints**, com os nomes de ficheiro abaixo. Em todos os prints de terminal tem de se ver o **teu utilizador no prompt**.

| Print           | O que tem de mostrar                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `print-1-bd.png`        | Terminal 1: `sudo service postgresql status` (online) **e** o `\dt` com a tabela `mensagens`                    |
| `print-2-backend.png`   | Terminal 2 com o backend a correr **e** o browser em http://localhost:5500/healthcheck com `"base_de_dados": "ok"` |
| `print-3-frontend.png`  | Os **3 terminais** visíveis (lado a lado ou separadores) **e** a página http://localhost:3000 com as tuas 3 mensagens (uma com o teu nome) |
| `print-4-select.png`    | Terminal 1: `SELECT * FROM mensagens;` com as mesmas mensagens que aparecem na página                          |
| `print-5-sem-bd.png`    | Página 🟠 *"O backend responde, mas a base de dados não"* **e** o terminal com `sudo service postgresql stop`  |
| `print-6-sem-backend.png` | Página 😢 *"O frontend está ligado, mas o backend não responde"* **e** o Terminal 2 parado                   |
| `print-7-desafio.png`   | Página http://localhost:3000 a mostrar **"Total de mensagens: N"**, em que N bate certo com o `SELECT COUNT(*)` |

> [!TIP]
> No Windows, `Win + Shift + S` tira um print de uma zona do ecrã.

### ✅ Critérios de avaliação (20 valores)

| #  | Critério                                                                                         | Valores |
| -- | ------------------------------------------------------------------------------------------------ | ------- |
| 1  | Fork no GitHub do aluno, público, com o link entregue no Teams                                   | 1       |
| 2  | PostgreSQL a correr e tabela `mensagens` criada (print 1)                                        | 2       |
| 3  | Backend a correr e ligado à BD: healthcheck com `"base_de_dados": "ok"` (print 2)                | 2       |
| 4  | Frontend a correr, os 3 serviços integrados e 3 mensagens publicadas, uma com o nome do aluno (print 3) | 3 |
| 5  | As mensagens da página estão na base de dados (print 4)                                          | 2       |
| 6  | Diagnóstico: BD desligada mostra o erro certo (print 5)                                          | 2       |
| 7  | Diagnóstico: backend desligado mostra o erro certo (print 6)                                     | 2       |
| 8  | Desafio: endpoint `GET /api/estatisticas` no backend, com o `COUNT(*)` feito em SQL (código no fork) | 2   |
| 9  | Desafio: frontend mostra o total, e o valor bate certo com a BD (print 7 + código no fork)       | 2       |
| 10 | Commit do desafio com mensagem clara, feito pelo aluno, no fork                                  | 1       |
| 11 | Prints legíveis, com os nomes pedidos e o utilizador do aluno visível nos terminais              | 1       |
|    | **Total**                                                                                        | **20**  |

> [!CAUTION]
> Prints sem o teu utilizador visível, ou iguais aos de um colega, valem **0** nesse critério. O link tem de ser do **teu** fork, não do repositório do professor.

---

## 🏆 Desafios extra (não contam para nota)

1. **Mudar a porta da BD:** o que tens de mudar no backend se o PostgreSQL estiver na porta `5433`? E no frontend?
2. **Dois backends:** corre um segundo backend com `NUMBER=2 PORT=5501`. Muda o frontend para ele **apenas** com o `BACKEND_URL`. As mensagens são as mesmas? Porquê?
3. **Apagar mensagens:** acrescenta `DELETE /api/mensagens/<id>` ao backend e um botão 🗑️ ao frontend.
4. **Explicar:** numa frase cada, explica a um colega porque é que o frontend não fala diretamente com a base de dados.

Diverte-te! 🚀

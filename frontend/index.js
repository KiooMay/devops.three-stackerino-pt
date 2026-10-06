const express = require("express")
require("dotenv").config()

const app = express()
app.use(express.urlencoded({ extended: false }))

const port = process.env.PORT || 3000
// ONDE está o backend? Esta é a variável mais importante do frontend!
const backendUrl = process.env.BACKEND_URL || "http://localhost:5500"

// Evita que alguém injete HTML/JavaScript através de uma mensagem
const escapar = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

const pagina = (corpo) => `
  <html>
    <head><meta charset="utf-8"><title>Three-Stackerino</title></head>
    <body style="font-family: sans-serif; max-width: 640px; margin: 40px auto;">
      ${corpo}
      <p><small>URL do backend usado: <code>${backendUrl}</code></small></p>
    </body>
  </html>
`

app.get("/", async (req, res) => {
  let response
  try {
    // O servidor FRONTEND chama o servidor BACKEND (chamada entre serviços)
    response = await fetch(`${backendUrl}/api/mensagens`)
  } catch (err) {
    console.error(`Não foi possível contactar o backend em ${backendUrl}:`, err.message)
    return res.status(502).send(pagina(`
      <h1>😢 O frontend está ligado, mas o backend não responde</h1>
      <p>Tentei chamar <code>${backendUrl}/api/mensagens</code> e falhei.</p>
      <p>Erro: <code>${escapar(err.message)}</code></p>
      <p>Verifica: o backend está a correr? O <code>BACKEND_URL</code> está certo?</p>
    `))
  }

  const data = await response.json()

  if (!response.ok) {
    // O backend respondeu, mas foi a BASE DE DADOS que falhou
    console.error(`O backend respondeu ${response.status}:`, data.detalhe)
    return res.status(502).send(pagina(`
      <h1>🟠 O backend responde, mas a base de dados não</h1>
      <p>Frontend ✅ → Backend ✅ → Base de dados ❌</p>
      <p>Erro: <code>${escapar(data.detalhe || data.erro)}</code></p>
      <p>Verifica: o PostgreSQL está a correr? As variáveis <code>DB_*</code> do backend estão certas? Correste o <code>db/init.sql</code>?</p>
    `))
  }

  const lista = data.mensagens
    .map((m) => `<li><b>${escapar(m.autor)}</b>: ${escapar(m.texto)} <small>(${m.criada_em})</small></li>`)
    .join("")

  res.send(pagina(`
    <h1>🖥️ Mural do Three-Stackerino</h1>
    <p>Frontend ✅ → Backend ✅ → Base de dados ✅</p>
    <form method="POST" action="/mensagens" style="background: #eef; padding: 16px; border-radius: 8px;">
      <input name="autor" placeholder="O teu nome" maxlength="50" required>
      <input name="texto" placeholder="Escreve uma mensagem" maxlength="280" required size="35">
      <button>Publicar</button>
    </form>
    <ul>${lista || "<li>Ainda não há mensagens.</li>"}</ul>
    <p>Respondido pelo backend número <b>${escapar(data.backend_number)}</b>
       (hostname <code>${escapar(data.backend_hostname)}</code>)</p>
  `))
})

app.post("/mensagens", async (req, res) => {
  try {
    // O frontend envia a mensagem ao backend em JSON. O backend guarda-a na base de dados.
    const response = await fetch(`${backendUrl}/api/mensagens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autor: req.body.autor, texto: req.body.texto }),
    })
    if (!response.ok) console.error(`O backend recusou a mensagem (${response.status}):`, await response.text())
  } catch (err) {
    console.error(`Não foi possível contactar o backend em ${backendUrl}:`, err.message)
  }
  res.redirect("/")
})

app.get("/healthcheck", (req, res) => {
  res.status(200).send("O frontend funciona!")
})

const server = app.listen(port, () => {
  console.log(`Frontend à escuta em http://localhost:${port}`)
  console.log(`O frontend vai chamar o backend em ${backendUrl}`)
})

process.on("SIGTERM", () => server.close(() => process.exit(0)))
process.on("SIGINT", () => server.close(() => process.exit(0)))

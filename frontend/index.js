const express = require("express")
require("dotenv").config()

const app = express()
app.use(express.urlencoded({ extended: false }))

const port = process.env.PORT || 3000
const backendUrl = process.env.BACKEND_URL || "http://localhost:5500"

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

app.get("/", async (_req, res) => {
  try {
    // 1. Obter mensagens
    const response = await fetch(`${backendUrl}/api/mensagens`)
    const data = await response.json()

    // 2. Obter estatísticas (DESAFIO)
    const respEstat = await fetch(`${backendUrl}/api/estatisticas`)
    const estatisticas = await respEstat.json()
    const total = estatisticas.total_mensagens || 0

    if (!response.ok) {
      console.error(`O backend respondeu ${response.status}:`, data.detalhe)
      return res.status(502).send(pagina(`
        <h1>🟠 O backend responde, mas a base de dados não</h1>
        <p>Frontend ✅ → Backend ✅ → Base de dados ❌</p>
        <p>Erro: <code>${escapar(data.detalhe || data.erro)}</code></p>
        <p>Verifica: o PostgreSQL está a correr? As variáveis <code>DB_*</code> do backend estão certas?</p>
      `))
    }

    const lista = (data.mensagens || [])
      .map((m) => `<li><b>${escapar(m.autor)}</b>: ${escapar(m.texto)} <small>(${m.criada_em})</small></li>`)
      .join("")

    res.send(pagina(`
      <h1>🖥️ Mural do Three-Stackerino</h1>
      <p>Frontend ✅ → Backend ✅ → Base de dados ✅</p>
      <h2>Total de mensagens: ${total}</h2>
      <form method="POST" action="/mensagens" style="background: #eef; padding: 16px; border-radius: 8px;">
        <input name="autor" placeholder="O teu nome" maxlength="50" required>
        <input name="texto" placeholder="Escreve uma mensagem" maxlength="280" required size="35">
        <button>Publicar</button>
      </form>
      <ul>${lista || "<li>Ainda não há mensagens.</li>"}</ul>
      <p>Respondido pelo backend número <b>${escapar(data.backend_number)}</b>
         (hostname <code>${escapar(data.backend_hostname)}</code>)</p>
    `))
  } catch (err) {
    console.error(`Não foi possível contactar o backend em ${backendUrl}:`, err.message)
    res.status(502).send(pagina(`
      <h2>Erro no Frontend</h2>
      <p>Não foi possível contactar o backend em <code>${escapar(backendUrl)}</code>.</p>
      <p><small>${escapar(err.message)}</small></p>
    `))
  }
})

app.post("/mensagens", async (req, res) => {
  try {
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

app.get("/healthcheck", (_req, res) => {
  res.status(200).send("O frontend funciona!")
})

const server = app.listen(port, () => {
  console.log(`Frontend à escuta em http://localhost:${port}`)
  console.log(`O frontend vai chamar o backend em ${backendUrl}`)
})

process.on("SIGTERM", () => server.close(() => process.exit(0)))
process.on("SIGINT", () => server.close(() => process.exit(0)))
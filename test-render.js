fetch('https://ra-dourados.onrender.com/api/irmaos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nome: "Teste API",
    cpf: "111.111.111-12",
    grupo: "Teste API GT"
  })
}).then(async r => {
  console.log("STATUS:", r.status);
  console.log("BODY:", await r.text());
  process.exit(0);
}).catch(e => {
  console.error("ERRO:", e);
  process.exit(1);
});

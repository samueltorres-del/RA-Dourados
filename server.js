const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/pessoas', require('./routes/pessoas'));
app.use('/api/atendimentos', require('./routes/atendimentos'));
app.use('/api/irmaos', require('./routes/irmaos'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ RA Dourados rodando em: http://localhost:${PORT}\n`);
});

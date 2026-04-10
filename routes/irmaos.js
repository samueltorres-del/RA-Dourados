const express = require('express');
const router = express.Router();
const { Irmaos, Pessoas } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { q, municipio } = req.query;
    res.json(await Irmaos.all(q, municipio));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/debug-db', (req, res) => {
  const uri = process.env.MONGO_URI;
  res.json({
    temURI: !!uri,
    comecaCom: uri ? uri.substring(0, 10) : null,
    temAspas: uri ? (uri.includes('"') || uri.includes("'")) : false,
    estadoMongoose: require('mongoose').connection.readyState,
    msg: "0=Disconnected, 1=Connected, 2=Connecting, 3=Disconnecting"
  });
});

router.get('/composicao', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const csvPath = path.join(__dirname, '..', 'Composição RA - Dourados-2026.csv');
  
  if (!fs.existsSync(csvPath)) return res.json([]);
  
  const data = fs.readFileSync(csvPath, 'latin1');
  const lines = data.split('\n').map(l => l.trim().split(';'));
  const groups = [];

  const isHeader = (cell) => {
    return cell && (cell.startsWith('GT ') || cell.includes(' da RA') || cell === 'DEPAC' || cell.includes('LGPD') || cell.includes('GL&C') || cell === 'CNS');
  };

  for (let r = 0; r < lines.length; r++) {
    for (let c = 0; c < lines[r].length; c++) {
      let cell = lines[r][c] ? lines[r][c].trim() : '';
      if (isHeader(cell)) {
        const membros = [];
        for (let r2 = r + 1; r2 < lines.length; r2++) {
          let mem = lines[r2][c] ? lines[r2][c].trim() : '';
          if (mem === '') continue;
          if (isHeader(mem)) break; // stop at next header
          membros.push(mem);
        }
        groups.push({ grupo: cell, membros });
      }
    }
  }
  res.json(groups);
});

router.get('/export', async (req, res) => {
  try {
    const { q, municipio } = req.query;
    const list = await Irmaos.all(q, municipio);
    
    let header = 'ID,Nome,CPF,Nascimento,Telefone,E-mail,Endereço,Bairro,Cidade,Grupo,Cadastrado_Em\n';
    let rows = list.data.map(p => {
      return `${p.id},"${p.nome || ''}","${p.cpf || ''}","${p.nascimento || ''}","${p.telefone || ''}","${p.email || ''}","${p.endereco || ''}","${p.bairro || ''}","${p.cidade || ''}","${p.grupo || ''}","${p.criado_em || ''}"`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-membros.csv"');
    res.send("\uFEFF" + header + rows.join('\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body.nome || !req.body.grupo || !req.body.cpf) {
      return res.status(400).json({ error: 'Nome, CPF e grupo são obrigatórios' });
    }
    const id = await Irmaos.create(req.body);

    try {
      const limpoCpf = req.body.cpf.replace(/\D/g, '');
      const resPessoas = await Pessoas.all(limpoCpf, null, 1, 999);
      const existing = resPessoas.data.find(p => p.cpf && p.cpf.replace(/\D/g, '') === limpoCpf);

      if (!existing) {
        await Pessoas.create({
          nome: req.body.nome,
          cpf: req.body.cpf,
          nascimento: req.body.nascimento,
          telefone: req.body.telefone,
          email: req.body.email,
          endereco: req.body.endereco,
          bairro: req.body.bairro,
          municipio: req.body.cidade || 'Dourados',
          observacoes: `Voluntário/Membro automático da RA - Cargo: ${req.body.grupo}`
        });
      }
    } catch(e) { console.error('Erro na sincronização de Pessoas:', e); }

    res.status(201).json({ success: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    if (!req.body.nome) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    const ok = await Irmaos.update(req.params.id, req.body);
    if (!ok) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Irmaos.delete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

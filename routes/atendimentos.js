const express = require('express');
const router = express.Router();
const { Atendimentos } = require('../db/database');

router.get('/stats/dashboard', async (req, res) => {
  try { res.json(await Atendimentos.dashboard()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/export/csv', async (req, res) => {
  try {
    const { data_de, data_ate, status, responsavel } = req.query;
    const rows = await Atendimentos.exportRows({ data_de, data_ate, status, responsavel });
    const header = 'ID;Nome;CPF;Telefone;Data;Tipo;Responsavel;Status;Unidade;Descricao;Providencias;Criado_em\n';
    const csv = rows.map(r => [r.id, `"${r.pessoa_nome||''}"`, r.pessoa_cpf||'', r.pessoa_tel||'',
      r.data_atendimento, r.tipo, `"${r.responsavel||''}"`, r.status, r.unidade||'',
      `"${(r.descricao||'').replace(/"/g,'""')}"`, `"${(r.providencias||'').replace(/"/g,'""')}"`, r.criado_em].join(';')).join('\n');
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="ra_dourados.csv"');
    res.send('\uFEFF' + header + csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try {
    const { q, status, tipo, responsavel, data_de, data_ate, pessoa_id, page = 1, limit = 25 } = req.query;
    const result = await Atendimentos.all({ q, status, tipo, responsavel, data_de, data_ate, pessoa_id }, Number(page), Number(limit));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const a = await Atendimentos.getById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Não encontrado' });
    res.json(a);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { pessoa_id, data_atendimento, descricao } = req.body;
    if (!pessoa_id) return res.status(400).json({ error: 'Pessoa é obrigatória' });
    if (!data_atendimento) return res.status(400).json({ error: 'Data é obrigatória' });
    if (!descricao || !descricao.trim()) return res.status(400).json({ error: 'Descrição é obrigatória' });
    const id = await Atendimentos.create(req.body);
    res.status(201).json({ id, message: 'Atendimento registrado com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    await Atendimentos.update(req.params.id, req.body);
    res.json({ message: 'Atualizado com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Atendimentos.delete(req.params.id);
    res.json({ message: 'Excluído com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

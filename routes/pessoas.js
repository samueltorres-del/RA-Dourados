const express = require('express');
const router = express.Router();
const { Pessoas } = require('../db/database');

router.get('/', async (req, res) => {
  try {
    const { q, municipio, page = 1, limit = 50 } = req.query;
    const result = await Pessoas.all(q, municipio, Number(page), Number(limit));
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const p = await Pessoas.getById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Não encontrada' });
    res.json(p);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    const id = await Pessoas.create(req.body);
    res.status(201).json({ id, message: 'Cadastro realizado com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || !nome.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
    await Pessoas.update(req.params.id, req.body);
    res.json({ message: 'Atualizado com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await Pessoas.delete(req.params.id);
    res.json({ message: 'Excluído com sucesso' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

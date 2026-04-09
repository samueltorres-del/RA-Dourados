require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PessoaModel, AtendimentoModel, IrmaoModel, HistoricoModel, Counter } = require('../db/database');

const DB_DIR = path.join(__dirname, '..', 'db');

const FILES = {
  pessoas: path.join(DB_DIR, 'pessoas.json'),
  atendimentos: path.join(DB_DIR, 'atendimentos.json'),
  historico: path.join(DB_DIR, 'historico.json'),
  irmaos: path.join(DB_DIR, 'irmaos.json'),
  counters: path.join(DB_DIR, 'counters.json')
};

function read(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

async function migrateData() {
  console.log('🔄 Iniciando migração de dados...');

  // 1. Counters
  const counters = read(FILES.counters) || {};
  if (Object.keys(counters).length > 0) {
    console.log('Migrando Counters...');
    for (const [key, val] of Object.entries(counters)) {
      await Counter.findByIdAndUpdate(key, { seq: val }, { upsert: true });
    }
  }

  // 2. Pessoas
  const pessoas = read(FILES.pessoas);
  if (pessoas.length > 0) {
    console.log(`Migrando ${pessoas.length} Pessoas...`);
    for (let p of pessoas) {
      if (!p.id) continue;
      const existe = await PessoaModel.findOne({ id: Number(p.id) });
      if (!existe) await PessoaModel.create(p);
    }
  }

  // 3. Atendimentos
  const atend = read(FILES.atendimentos);
  if (atend.length > 0) {
    console.log(`Migrando ${atend.length} Atendimentos...`);
    for (let a of atend) {
      if (!a.id) continue;
      const existe = await AtendimentoModel.findOne({ id: Number(a.id) });
      if (!existe) await AtendimentoModel.create(a);
    }
  }

  // 4. Irmaos
  const irmaos = read(FILES.irmaos);
  if (irmaos.length > 0) {
    console.log(`Migrando ${irmaos.length} Irmãos...`);
    for (let i of irmaos) {
      if (!i.id) continue;
      const existe = await IrmaoModel.findOne({ id: Number(i.id) });
      if (!existe) await IrmaoModel.create(i);
    }
  }

  // 5. Historico
  const historico = read(FILES.historico);
  if (historico.length > 0) {
    console.log(`Migrando ${historico.length} Registros de Histórico...`);
    for (let h of historico) {
      if (!h.id) continue;
      const existe = await HistoricoModel.findOne({ id: Number(h.id) });
      if (!existe) await HistoricoModel.create(h);
    }
  }

  console.log('✅ Migração concluída com sucesso!');
  process.exit(0);
}

// O require('../db/database') já tenta conectar.
// Vamos dar 1 segundinho para a conexão estabelecer.
setTimeout(() => {
  migrateData().catch(console.error);
}, 2000);

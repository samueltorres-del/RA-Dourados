require('dotenv').config();
const mongoose = require('mongoose');

// Tenta usar a string do .env, caso falhe (em debug), levanta erro limpo
const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('\n✅ Banco de Dados MONGODB Conectado!'))
  .catch(err => console.error('\n❌ Erro de conexão ao MongoDB (Verifique a sua URI no arquivo .env):', err.message));

// ---------- AUTO-INCREMENT COUNTER ----------
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextId(modelName) {
  const result = await Counter.findByIdAndUpdate(
    modelName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
}

// ---------- SCHEMAS ----------

const pessoaSchema = new mongoose.Schema({
  id: { type: Number, unique: true }, // ID numérico para manter retrocompatibilidade
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, default: null },
  nascimento: { type: String, default: null },
  telefone: { type: String, default: null },
  email: { type: String, default: null },
  endereco: { type: String, default: null },
  bairro: { type: String, default: null },
  municipio: { type: String, default: 'Dourados' },
  uf: { type: String, default: 'MS' },
  observacoes: { type: String, default: null },
  criado_em: { type: String },
  atualizado_em: { type: String }
});

const atendimentoSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  pessoa_id: { type: Number, required: true },
  data_atendimento: { type: String },
  tipo: { type: String, default: 'Triagem' },
  responsavel: { type: String, default: null },
  status: { type: String, default: 'Aberto' },
  descricao: { type: String, trim: true },
  providencias: { type: String, default: null },
  unidade: { type: String, default: 'CRAS' },
  criado_em: { type: String },
  atualizado_em: { type: String }
});

const irmaoSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  nome: { type: String, required: true, trim: true },
  cpf: { type: String, default: null },
  nascimento: { type: String, default: null },
  telefone: { type: String, default: null },
  email: { type: String, default: null },
  endereco: { type: String, default: null },
  bairro: { type: String, default: null },
  cidade: { type: String, default: null },
  grupo: { type: String, default: null },
  criado_em: { type: String },
  atualizado_em: { type: String }
});

const historicoSchema = new mongoose.Schema({
  id: { type: Number },
  tabela: { type: String },
  registro_id: { type: Number },
  acao: { type: String },
  dados: { type: String },
  criado_em: { type: String }
});

pessoaSchema.pre('save', async function () {
  if (this.isNew && !this.id) this.id = await getNextId('pessoas');
});
atendimentoSchema.pre('save', async function () {
  if (this.isNew && !this.id) this.id = await getNextId('atendimentos');
});
irmaoSchema.pre('save', async function () {
  if (this.isNew && !this.id) this.id = await getNextId('irmaos');
});
historicoSchema.pre('save', async function () {
  if (this.isNew && !this.id) this.id = await getNextId('historico');
});

const PessoaModel = mongoose.model('Pessoa', pessoaSchema);
const AtendimentoModel = mongoose.model('Atendimento', atendimentoSchema);
const IrmaoModel = mongoose.model('Irmao', irmaoSchema);
const HistoricoModel = mongoose.model('Historico', historicoSchema);

function now() { return new Date().toLocaleString('sv-SE').replace('T', ' '); }

async function logHistorico(tabela, registro_id, acao, dados) {
  await HistoricoModel.create({ tabela, registro_id, acao, dados: JSON.stringify(dados), criado_em: now() });
}

// ---------- COMPATIBILITY LAYER ----------

const Pessoas = {
  async all(q, municipio, page = 1, limit = 50) {
    let query = {};
    if (q) {
      const lq = new RegExp(q, 'i');
      query.$or = [{ nome: lq }, { cpf: lq }, { telefone: lq }];
    }
    if (municipio) query.municipio = municipio;
    
    const rows = await PessoaModel.find(query).sort({ nome: 1 }).skip((page - 1) * limit).limit(limit).lean();
    const total = await PessoaModel.countDocuments(query);
    
    // Obter atendimentos para injetar no array total_atendimentos
    for (let p of rows) {
      p.total_atendimentos = await AtendimentoModel.countDocuments({ pessoa_id: p.id });
    }
    return { data: rows, total };
  },
  async getById(id) {
    const p = await PessoaModel.findOne({ id: Number(id) }).lean();
    if (!p) return null;
    p.atendimentos = await AtendimentoModel.find({ pessoa_id: p.id }).sort({ data_atendimento: -1 }).lean();
    return p;
  },
  async create(data) {
    const dataCriacao = now();
    const nova = await PessoaModel.create({
      ...data, nome: data.nome.trim(), municipio: data.municipio || 'Dourados',
      uf: data.uf || 'MS', criado_em: dataCriacao, atualizado_em: dataCriacao
    });
    await logHistorico('pessoas', nova.id, 'INSERT', data);
    return nova.id;
  },
  async update(id, data) {
    const p = await PessoaModel.findOneAndUpdate(
      { id: Number(id) }, 
      { ...data, nome: data.nome.trim(), atualizado_em: now() }, 
      { new: true }
    );
    if (!p) return false;
    await logHistorico('pessoas', id, 'UPDATE', data);
    return true;
  },
  async delete(id) {
    await PessoaModel.findOneAndDelete({ id: Number(id) });
    await AtendimentoModel.deleteMany({ pessoa_id: Number(id) });
  }
};

const Atendimentos = {
  async all(filters = {}, page = 1, limit = 50) {
    let query = {};
    const { status, tipo, responsavel, data_de, data_ate, pessoa_id, q } = filters;
    
    if (status) query.status = status;
    if (tipo) query.tipo = tipo;
    if (responsavel) query.responsavel = new RegExp(responsavel, 'i');
    if (pessoa_id) query.pessoa_id = Number(pessoa_id);
    if (data_de || data_ate) {
      query.data_atendimento = {};
      if (data_de) query.data_atendimento.$gte = data_de;
      if (data_ate) query.data_atendimento.$lte = data_ate;
    }

    // A busca text 'q' no json anterior filtrava nome (precisa de join simulado), descricao e responsável.
    // Como Mongoose não tem joins tão simples para Regex cross-table quando schema tem id numérico sem populate nativo...
    // faremos busca de IN se 'q' existir
    if (q) {
      const lq = new RegExp(q, 'i');
      const pMatch = await PessoaModel.find({ nome: lq }).select('id').lean();
      const pIds = pMatch.map(x => x.id);
      
      query.$or = [
        { pessoa_id: { $in: pIds } },
        { descricao: lq },
        { responsavel: lq }
      ];
    }

    const rows = await AtendimentoModel.find(query)
      .sort({ data_atendimento: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    for (let a of rows) {
      const p = await PessoaModel.findOne({ id: a.pessoa_id }).select('nome cpf telefone').lean();
      a.pessoa_nome = p ? p.nome : null;
      a.pessoa_cpf = p ? p.cpf : null;
      a.pessoa_tel = p ? p.telefone : null;
    }

    const total = await AtendimentoModel.countDocuments(query);
    return { data: rows, total };
  },
  async getById(id) {
    const a = await AtendimentoModel.findOne({ id: Number(id) }).lean();
    if (!a) return null;
    const p = await PessoaModel.findOne({ id: a.pessoa_id }).lean();
    a.pessoa_nome = p ? p.nome : null;
    a.pessoa_cpf = p ? p.cpf : null;
    a.pessoa_tel = p ? p.telefone : null;
    return a;
  },
  async dashboard() {
    const total_pessoas = await PessoaModel.countDocuments();
    const total_atend = await AtendimentoModel.countDocuments();
    const abertos = await AtendimentoModel.countDocuments({ status: { $in: ['Aberto', 'Em andamento'] } });
    const concluidos = await AtendimentoModel.countDocuments({ status: 'Concluído' });
    
    // Aggregations para por_tipo e por_status
    let por_tipo = await AtendimentoModel.aggregate([{ $group: { _id: "$tipo", total: { $sum: 1 } } }, { $sort: { total: -1 } }]);
    por_tipo = por_tipo.map(x => ({ tipo: x._id, total: x.total }));

    let por_status = await AtendimentoModel.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]);
    por_status = por_status.map(x => ({ status: x._id, total: x.total }));

    const atendsDesc = await AtendimentoModel.find().lean();
    const porMesMap = {};
    atendsDesc.forEach(a => {
      const mes = (a.data_atendimento || '').slice(0, 7);
      if (mes) porMesMap[mes] = (porMesMap[mes] || 0) + 1;
    });
    const por_mes = Object.entries(porMesMap).map(([mes, total]) => ({ mes, total })).sort((a,b)=>b.mes.localeCompare(a.mes)).slice(0, 12);

    let ultimos = await AtendimentoModel.find().sort({ criado_em: -1 }).limit(8).lean();
    for (let u of ultimos) {
      const p = await PessoaModel.findOne({ id: u.pessoa_id }).select('nome').lean();
      u.pessoa_nome = p ? p.nome : null;
    }

    return { total_pessoas, total_atend, abertos, concluidos, por_tipo, por_status, por_mes, ultimos };
  },
  async create(data) {
    const dt = now();
    const a = await AtendimentoModel.create({
      ...data, pessoa_id: Number(data.pessoa_id), tipo: data.tipo || 'Triagem',
      status: data.status || 'Aberto', descricao: data.descricao.trim(),
      criado_em: dt, atualizado_em: dt
    });
    await logHistorico('atendimentos', a.id, 'INSERT', data);
    return a.id;
  },
  async update(id, data) {
    const a = await AtendimentoModel.findOneAndUpdate(
      { id: Number(id) },
      { ...data, pessoa_id: Number(data.pessoa_id), atualizado_em: now() },
      { new: true }
    );
    if (!a) return false;
    await logHistorico('atendimentos', id, 'UPDATE', data);
    return true;
  },
  async delete(id) {
    await AtendimentoModel.findOneAndDelete({ id: Number(id) });
  },
  async exportRows(filters={}) {
    const r = await this.all(filters, 1, 99999);
    return r.data;
  }
};

const Irmaos = {
  async all(q, municipio, limit = 500) {
    let query = {};
    if (q) {
      const lq = new RegExp(q, 'i');
      query.$or = [{ nome: lq }, { telefone: lq }, { grupo: lq }];
    }
    if (municipio) query.cidade = municipio;
    
    const rows = await IrmaoModel.find(query).sort({ nome: 1 }).limit(limit).lean();
    const total = await IrmaoModel.countDocuments(query);
    return { data: rows, total };
  },
  async getById(id) {
    return await IrmaoModel.findOne({ id: Number(id) }).lean();
  },
  async create(data) {
    const dt = now();
    const i = await IrmaoModel.create({ ...data, nome: data.nome.trim(), criado_em: dt, atualizado_em: dt });
    await logHistorico('irmaos', i.id, 'INSERT', data);
    return i.id;
  },
  async update(id, data) {
    const i = await IrmaoModel.findOneAndUpdate(
      { id: Number(id) },
      { ...data, nome: data.nome.trim(), atualizado_em: now() },
      { new: true }
    );
    if (!i) return false;
    await logHistorico('irmaos', id, 'UPDATE', data);
    return true;
  },
  async delete(id) {
    await IrmaoModel.findOneAndDelete({ id: Number(id) });
  },
  async exportRows() {
    const r = await this.all(null, null, 99999);
    return r.data;
  }
};

module.exports = { Pessoas, Atendimentos, Irmaos, PessoaModel, AtendimentoModel, IrmaoModel, HistoricoModel, Counter };

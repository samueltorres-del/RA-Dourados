// === UTILS ===
const $ = id => document.getElementById(id);
const fmtDate = s => { if(!s) return '—'; const [y,m,d]=s.split('T')[0].split('-'); return `${d}/${m}/${y}`; };
const today = () => new Date().toISOString().split('T')[0];
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

function toast(msg, type='success') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.className = 'toast', 3000);
}

function badgeStatus(s) {
  const m = { 'Aberto':'badge-blue','Em andamento':'badge-amber','Concluído':'badge-green','Cancelado':'badge-red' };
  return `<span class="badge ${m[s]||'badge-blue'}">${s}</span>`;
}

function maskCPF(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  v = v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  el.value = v;
}
function maskTel(el) {
  let v = el.value.replace(/\D/g,'').slice(0,11);
  if(v.length>2) v='('+v.slice(0,2)+') '+v.slice(2);
  if(v.length>10) v=v.slice(0,10)+'-'+v.slice(10);
  el.value = v;
}

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  $(`page-${id}`).classList.add('active');
  if(btn) btn.classList.add('active');
  const titles = { dashboard:'Dashboard', pessoas:'Pessoas', atendimentos:'Atendimentos', 'novo-atend':'Novo Atendimento', relatorios:'Relatórios' };
  $('page-title').textContent = titles[id]||'';
  if(id==='dashboard') loadDashboard();
  if(id==='pessoas') loadPessoas();
  if(id==='atendimentos') loadAtendimentos();
  if(id==='novo-atend') loadSelectPessoas();
  if(id==='relatorios') loadRelatorio();
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// === API ===
async function api(path, method='GET', body=null) {
  const opts = { method, headers: {'Content-Type':'application/json'} };
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch('/api'+path, opts);
  const data = await r.json();
  if(!r.ok) throw new Error(data.error||'Erro na requisição');
  return data;
}

// === DASHBOARD ===
async function loadDashboard() {
  try {
    const d = await api('/atendimentos/stats/dashboard');
    $('m-pessoas').textContent = d.total_pessoas;
    $('m-total').textContent = d.total_atend;
    $('m-abertos').textContent = d.abertos;
    $('m-conc').textContent = d.concluidos;
    renderBarChart('chart-status', d.por_status, 'status', 'total');
    renderBarChart('chart-tipo', d.por_tipo, 'tipo', 'total');
    const rows = d.ultimos.map(a => `<tr>
      <td>${fmtDate(a.data_atendimento)}</td>
      <td>${a.pessoa_nome||'—'}</td>
      <td>${a.tipo}</td>
      <td>${a.responsavel||'—'}</td>
      <td>${badgeStatus(a.status)}</td>
    </tr>`).join('');
    $('dash-table').innerHTML = rows || '<tr><td colspan="5" class="loading">Nenhum registro ainda.</td></tr>';
  } catch(e) { toast(e.message,'error'); }
}

function renderBarChart(containerId, data, labelKey, valueKey) {
  const el = $(containerId);
  if(!data||!data.length) { el.innerHTML='<div class="empty-state">Sem dados</div>'; return; }
  const max = Math.max(...data.map(d=>d[valueKey]));
  const colors = {'Aberto':'#3b6fd4','Em andamento':'#d97706','Concluído':'#14723e','Cancelado':'#991b1b',
    'Triagem':'#3b6fd4','Orientação':'#0891b2','Encaminhamento':'#7c3aed','Visita domiciliar':'#14723e','Reunião':'#d97706','Outro':'#6b7280'};
  el.innerHTML = data.map(d => {
    const pct = max > 0 ? Math.round((d[valueKey]/max)*100) : 0;
    const c = colors[d[labelKey]]||'#3b6fd4';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:#374151">${d[labelKey]}</span>
        <span style="color:#6b7280;font-weight:500">${d[valueKey]}</span>
      </div>
      <div style="height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${c};border-radius:4px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');
}

// === PESSOAS ===
let pessoasPage = 1;
async function loadPessoas() {
  const q = $('busca-pessoas').value;
  try {
    const d = await api(`/pessoas?q=${encodeURIComponent(q)}&page=${pessoasPage}&limit=20`);
    const rows = d.data.map(p => `<tr>
      <td style="color:#6b7280;font-size:12px">${p.id}</td>
      <td><strong>${p.nome}</strong></td>
      <td style="font-family:'IBM Plex Mono',monospace;font-size:12px">${p.cpf||'—'}</td>
      <td>${p.telefone||'—'}</td>
      <td>${p.municipio||'—'}</td>
      <td><span class="badge badge-blue">${p.total_atendimentos}</span></td>
      <td class="td-actions">
        <button class="btn btn-sm" onclick="verPessoa(${p.id})">Ver</button>
        <button class="btn btn-sm" onclick="editarPessoa(${p.id})">Editar</button>
      </td>
    </tr>`).join('');
    $('pessoas-table').innerHTML = rows || '<tr><td colspan="7" class="loading">Nenhum cadastro encontrado.</td></tr>';
    renderPag('pessoas-pag', d.total, 20, pessoasPage, p => { pessoasPage=p; loadPessoas(); });
  } catch(e) { toast(e.message,'error'); }
}

function renderPag(containerId, total, limit, current, cb) {
  const pages = Math.ceil(total/limit);
  if(pages<=1) { $(containerId).innerHTML=''; return; }
  let html='';
  for(let i=1;i<=pages;i++) {
    html+=`<button class="btn btn-sm${i===current?' btn-primary':''}" onclick="(${cb.toString()})(${i})">${i}</button>`;
  }
  $(containerId).innerHTML=html;
}

async function loadSelectPessoas() {
  try {
    const d = await api('/pessoas?limit=500');
    const sel = $('f-pessoa-id');
    sel.innerHTML = '<option value="">— selecione —</option>' +
      d.data.map(p=>`<option value="${p.id}">${p.nome}${p.cpf?' — '+p.cpf:''}</option>`).join('');
  } catch(e) {}
}

function openModalPessoa() {
  $('modal-pessoa-title').textContent = 'Nova pessoa';
  $('p-id').value='';
  ['p-nome','p-cpf','p-nasc','p-tel','p-email','p-end','p-bairro','p-obs'].forEach(id=>$(id).value='');
  $('p-municipio').value='Dourados';
  $('btn-del-pessoa').style.display='none';
  $('msg-pessoa').innerHTML='';
  openModal('modal-pessoa');
}

async function editarPessoa(id) {
  try {
    const p = await api('/pessoas/'+id);
    $('modal-pessoa-title').textContent = 'Editar — '+p.nome;
    $('p-id').value = p.id;
    $('p-nome').value = p.nome||'';
    $('p-cpf').value = p.cpf||'';
    $('p-nasc').value = p.nascimento||'';
    $('p-tel').value = p.telefone||'';
    $('p-email').value = p.email||'';
    $('p-end').value = p.endereco||'';
    $('p-bairro').value = p.bairro||'';
    $('p-municipio').value = p.municipio||'Dourados';
    $('p-obs').value = p.observacoes||'';
    $('btn-del-pessoa').style.display='';
    $('msg-pessoa').innerHTML='';
    openModal('modal-pessoa');
  } catch(e) { toast(e.message,'error'); }
}

async function verPessoa(id) {
  try {
    const p = await api('/pessoas/'+id);
    $('modal-pessoa-title').textContent = p.nome;
    $('p-id').value = p.id;
    $('p-nome').value = p.nome||'';
    $('p-cpf').value = p.cpf||'';
    $('p-nasc').value = p.nascimento||'';
    $('p-tel').value = p.telefone||'';
    $('p-email').value = p.email||'';
    $('p-end').value = p.endereco||'';
    $('p-bairro').value = p.bairro||'';
    $('p-municipio').value = p.municipio||'';
    $('p-obs').value = p.observacoes||'';
    $('btn-del-pessoa').style.display='';
    openModal('modal-pessoa');
  } catch(e) { toast(e.message,'error'); }
}

async function salvarPessoa() {
  const id = $('p-id').value;
  const body = {
    nome:$('p-nome').value, cpf:$('p-cpf').value, nascimento:$('p-nasc').value,
    telefone:$('p-tel').value, email:$('p-email').value, endereco:$('p-end').value,
    bairro:$('p-bairro').value, municipio:$('p-municipio').value, observacoes:$('p-obs').value
  };
  try {
    if(id) { await api('/pessoas/'+id,'PUT',body); toast('Cadastro atualizado!'); }
    else { await api('/pessoas','POST',body); toast('Cadastro realizado!'); }
    closeModal('modal-pessoa');
    loadPessoas();
  } catch(e) { $('msg-pessoa').innerHTML=`<div style="padding:8px 12px;background:#fee2e2;color:#991b1b;border-radius:6px;font-size:12px;margin-bottom:10px">${e.message}</div>`; }
}

async function deletarPessoa() {
  if(!confirm('Excluir essa pessoa e todos os seus atendimentos?')) return;
  try {
    await api('/pessoas/'+$('p-id').value,'DELETE');
    toast('Pessoa excluída!');
    closeModal('modal-pessoa');
    loadPessoas();
  } catch(e) { toast(e.message,'error'); }
}

function exportarCSVPessoas() { window.location='/api/atendimentos/export/csv'; }

// === ATENDIMENTOS ===
let atPage = 1;
let currentAtId = null;
async function loadAtendimentos() {
  const q = $('busca-at').value;
  const status = $('filt-status').value;
  const tipo = $('filt-tipo').value;
  try {
    const d = await api(`/atendimentos?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&tipo=${encodeURIComponent(tipo)}&page=${atPage}&limit=25`);
    const rows = d.data.map(a=>`<tr>
      <td style="color:#6b7280;font-size:12px">${a.id}</td>
      <td>${fmtDate(a.data_atendimento)}</td>
      <td>${a.pessoa_nome||'—'}</td>
      <td>${a.tipo}</td>
      <td>${a.responsavel||'—'}</td>
      <td>${badgeStatus(a.status)}</td>
      <td style="font-size:12px;color:#6b7280">${a.unidade||'—'}</td>
      <td class="td-actions">
        <button class="btn btn-sm" onclick="verAtend(${a.id})">Ver</button>
        <button class="btn btn-sm" onclick="editarAtend(${a.id})">Editar</button>
      </td>
    </tr>`).join('');
    $('at-table').innerHTML = rows || '<tr><td colspan="8" class="loading">Nenhum atendimento encontrado.</td></tr>';
    renderPag('at-pag', d.total, 25, atPage, p => { atPage=p; loadAtendimentos(); });
  } catch(e) { toast(e.message,'error'); }
}

async function salvarAtend() {
  const body = {
    pessoa_id:$('f-pessoa-id').value,
    data_atendimento:$('f-data').value,
    tipo:$('f-tipo').value,
    responsavel:$('f-responsavel').value,
    status:$('f-status').value,
    descricao:$('f-descricao').value,
    providencias:$('f-providencias').value,
    unidade:$('f-unidade').value
  };
  try {
    await api('/atendimentos','POST',body);
    toast('Atendimento registrado!');
    limparFormAt();
    showPage('atendimentos',document.querySelectorAll('.nav-item')[2]);
  } catch(e) {
    $('msg-at').innerHTML=`<div style="padding:8px 12px;background:#fee2e2;color:#991b1b;border-radius:6px;font-size:12px;margin-bottom:10px">${e.message}</div>`;
  }
}

function limparFormAt() {
  ['f-pessoa-id','f-tipo','f-status','f-unidade'].forEach(id=>$(id).selectedIndex=0);
  ['f-responsavel','f-descricao','f-providencias'].forEach(id=>$(id).value='');
  $('f-data').value=today();
  $('msg-at').innerHTML='';
}

async function verAtend(id) {
  currentAtId = id;
  try {
    const a = await api('/atendimentos/'+id);
    $('modal-atend-body').innerHTML=`
      <div class="detail-row"><div class="detail-label">Pessoa</div><div class="detail-val"><strong>${a.pessoa_nome||'—'}</strong>${a.pessoa_cpf?` <span style="color:#6b7280;font-size:12px">(${a.pessoa_cpf})</span>`:''}</div></div>
      <div class="detail-row"><div class="detail-label">Data</div><div class="detail-val">${fmtDate(a.data_atendimento)}</div></div>
      <div class="detail-row"><div class="detail-label">Tipo</div><div class="detail-val">${a.tipo}</div></div>
      <div class="detail-row"><div class="detail-label">Unidade</div><div class="detail-val">${a.unidade||'—'}</div></div>
      <div class="detail-row"><div class="detail-label">Responsável</div><div class="detail-val">${a.responsavel||'—'}</div></div>
      <div class="detail-row"><div class="detail-label">Status</div><div class="detail-val">${badgeStatus(a.status)}</div></div>
      <div class="detail-row"><div class="detail-label">Descrição</div><div class="detail-val" style="white-space:pre-wrap">${a.descricao}</div></div>
      <div class="detail-row"><div class="detail-label">Providências</div><div class="detail-val" style="white-space:pre-wrap">${a.providencias||'—'}</div></div>
      <div class="detail-row"><div class="detail-label">Registrado em</div><div class="detail-val" style="font-size:12px;color:#6b7280">${a.criado_em}</div></div>
      <div style="margin-top:14px">
        <label style="font-size:12px;font-weight:500;color:#6b7280;display:block;margin-bottom:4px">Alterar status:</label>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="modal-status" style="padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
            <option ${a.status==='Aberto'?'selected':''}>Aberto</option>
            <option ${a.status==='Em andamento'?'selected':''}>Em andamento</option>
            <option ${a.status==='Concluído'?'selected':''}>Concluído</option>
            <option ${a.status==='Cancelado'?'selected':''}>Cancelado</option>
          </select>
          <button class="btn btn-primary btn-sm" onclick="salvarStatus(${a.id},${JSON.stringify(a)})">Salvar</button>
        </div>
      </div>`;
    openModal('modal-atend');
  } catch(e) { toast(e.message,'error'); }
}

async function editarAtend(id) {
  try {
    const a = await api('/atendimentos/'+id);
    await loadSelectPessoas();
    $('f-pessoa-id').value=a.pessoa_id;
    $('f-data').value=a.data_atendimento;
    $('f-tipo').value=a.tipo;
    $('f-responsavel').value=a.responsavel||'';
    $('f-status').value=a.status;
    $('f-descricao').value=a.descricao;
    $('f-providencias').value=a.providencias||'';
    $('f-unidade').value=a.unidade||'CRAS';
    showPage('novo-atend',document.querySelectorAll('.nav-item')[3]);
    toast('Edite os campos e salve novamente.','success');
  } catch(e) { toast(e.message,'error'); }
}

async function salvarStatus(id, atend) {
  const st = $('modal-status').value;
  try {
    await api('/atendimentos/'+id,'PUT',{...atend, status:st});
    toast('Status atualizado!');
    closeModal('modal-atend');
    loadAtendimentos();
  } catch(e) { toast(e.message,'error'); }
}

async function deletarAtend() {
  if(!currentAtId||!confirm('Excluir este atendimento?')) return;
  try {
    await api('/atendimentos/'+currentAtId,'DELETE');
    toast('Atendimento excluído!');
    closeModal('modal-atend');
    loadAtendimentos();
  } catch(e) { toast(e.message,'error'); }
}

// === RELATÓRIOS ===
async function loadRelatorio() {
  try {
    const d = await api('/atendimentos/stats/dashboard');
    $('rel-por-tipo').innerHTML='<table><thead><tr><th>Tipo</th><th>Total</th></tr></thead><tbody>'+
      d.por_tipo.map(t=>`<tr><td>${t.tipo}</td><td>${t.total}</td></tr>`).join('')+'</tbody></table>';
    $('rel-por-mes').innerHTML='<table><thead><tr><th>Mês</th><th>Atendimentos</th></tr></thead><tbody>'+
      d.por_mes.map(m=>{
        const[y,mo]=m.mes.split('-');
        const nome=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(mo)];
        return `<tr><td>${nome}/${y}</td><td>${m.total}</td></tr>`;
      }).join('')+'</tbody></table>';
  } catch(e) {}
}

function exportCSVFiltrado() {
  const de=$('rel-de').value, ate=$('rel-ate').value, st=$('rel-status').value, resp=$('rel-resp').value;
  let url='/api/atendimentos/export/csv?';
  if(de) url+=`data_de=${de}&`;
  if(ate) url+=`data_ate=${ate}&`;
  if(st) url+=`status=${encodeURIComponent(st)}&`;
  if(resp) url+=`responsavel=${encodeURIComponent(resp)}`;
  window.location=url;
}

function enviarWA() {
  fetch('/api/atendimentos/stats/dashboard').then(r=>r.json()).then(d=>{
    const msg=`*RA Dourados — Relatório*\n\nPessoas: ${d.total_pessoas}\nAtendimentos: ${d.total_atend}\nConcluídos: ${d.concluidos}\nEm aberto: ${d.abertos}\n\n_${new Date().toLocaleDateString('pt-BR')}_`;
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  });
}

function enviarEmail() {
  fetch('/api/atendimentos/stats/dashboard').then(r=>r.json()).then(d=>{
    const body=`Relatório RA Dourados\n\nPessoas: ${d.total_pessoas}\nAtendimentos: ${d.total_atend}\nConcluídos: ${d.concluidos}\nEm aberto: ${d.abertos}\n\nGerado em ${new Date().toLocaleDateString('pt-BR')}`;
    window.open('mailto:?subject=Relatório RA Dourados&body='+encodeURIComponent(body));
  });
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  $('top-date').textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  $('f-data').value = today();
  loadDashboard();
  document.querySelector('[onclick="openModal(\'modal-pessoa\')"]')?.setAttribute('onclick','openModalPessoa()');
});

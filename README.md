# RA Dourados — Sistema de Atendimentos

Sistema completo de Registro de Atendimentos com banco de dados SQLite, backend Node.js e frontend responsivo.

---

## ⚡ Como rodar

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior
- VS Code (recomendado)

### 2. Instalar dependências

Abra o terminal na pasta do projeto e rode:

```bash
npm install
```

### 3. Iniciar o sistema

```bash
npm start
```

Ou, para desenvolvimento com reinício automático:

```bash
npm run dev
```

### 4. Acessar no navegador

```
http://localhost:3000
```

---

## 📁 Estrutura do projeto

```
ra-dourados/
├── server.js              # Servidor Express
├── package.json
├── db/
│   ├── database.js        # Configuração SQLite
│   └── ra_dourados.db     # Banco de dados (criado automaticamente)
├── routes/
│   ├── pessoas.js         # API de cadastro de pessoas
│   └── atendimentos.js    # API de atendimentos + exportação CSV
└── public/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## 🔧 Funcionalidades

| Módulo         | Funcionalidades                                                    |
|----------------|--------------------------------------------------------------------|
| Dashboard      | Métricas, gráficos por status/tipo, últimos atendimentos          |
| Pessoas        | Cadastro completo, busca, edição, exclusão                        |
| Atendimentos   | Registro RA, filtros, edição de status, exclusão                  |
| Relatórios     | Histórico mensal, por tipo, exportação CSV filtrada               |
| Exportações    | CSV (Excel), PDF (impressão), WhatsApp, E-mail                    |

---

## 🗄️ Banco de dados

O SQLite é criado automaticamente em `db/ra_dourados.db`.

Para fazer backup, basta copiar esse arquivo.

### Tabelas

- **pessoas** — cadastro de pessoas atendidas
- **atendimentos** — registros de atendimento (RA)
- **historico** — log de todas as operações (INSERT/UPDATE)

---

## 🌐 API REST

| Método | Rota                              | Descrição                   |
|--------|-----------------------------------|-----------------------------|
| GET    | /api/pessoas                      | Listar pessoas               |
| POST   | /api/pessoas                      | Criar pessoa                 |
| PUT    | /api/pessoas/:id                  | Atualizar pessoa             |
| DELETE | /api/pessoas/:id                  | Excluir pessoa               |
| GET    | /api/atendimentos                 | Listar atendimentos          |
| POST   | /api/atendimentos                 | Criar atendimento            |
| PUT    | /api/atendimentos/:id             | Atualizar atendimento        |
| DELETE | /api/atendimentos/:id             | Excluir atendimento          |
| GET    | /api/atendimentos/stats/dashboard | Métricas do dashboard        |
| GET    | /api/atendimentos/export/csv      | Exportar CSV com filtros     |

---

## 💡 Dicas

- Para mudar a porta, defina a variável de ambiente: `PORT=8080 npm start`
- O banco de dados fica em `db/ra_dourados.db` — faça backup regularmente
- Para acessar de outro computador na rede, use o IP local: `http://192.168.x.x:3000`

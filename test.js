require('dotenv').config();
const { Irmaos } = require('./db/database');

setTimeout(async () => {
  try {
    const id = await Irmaos.create({
      nome: 'Teste Local',
      cpf: '000.000.000-00',
      grupo: 'Teste'
    });
    console.log('ID INSERIDO:', id);
    process.exit(0);
  } catch(e) {
    console.error('ERRO:', e);
    process.exit(1);
  }
}, 2000);

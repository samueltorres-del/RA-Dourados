const fs = require('fs');
const path = require('path');

const csvPath = 'c:\\ra-dourados\\Composição RA - Dourados-2026.csv';
const data = fs.readFileSync(csvPath, 'latin1');
const lines = data.split('\n').map(l => l.trim().split(';'));

const groups = [];

// A matrix approach:
// Every cell that starts with "GT " or "Anciães" etc is a header.
// So let's scan all rows and cols.

for (let r = 0; r < lines.length; r++) {
  for (let c = 0; c < lines[r].length; c++) {
    let cell = lines[r][c].trim();
    if (cell && (cell.startsWith('GT ') || cell.includes(' da RA') || cell === 'DEPAC' || cell.includes('LGPD') || cell.includes('GL&C') || cell === 'CNS')) {
      const groupName = cell;
      const members = [];
      // look downwards in the same column for members
      for (let r2 = r + 1; r2 < lines.length; r2++) {
        let mem = lines[r2][c] ? lines[r2][c].trim() : '';
        if (mem === '') continue;
        // stop if we hit another header-like cell in the same column
        if (mem.startsWith('GT ') || mem.includes(' da RA')) break;
        members.push(mem);
      }
      if (members.length > 0) {
        groups.push({ grupo: groupName, membros: members });
      }
    }
  }
}

console.log(JSON.stringify(groups, null, 2));

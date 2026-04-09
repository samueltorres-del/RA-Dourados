const fs = require('fs');

const data = fs.readFileSync('c:\\ra-dourados\\Composição RA - Dourados-2026.csv', 'latin1');
const lines = data.split('\n').map(l => l.trim()).filter(l => l);

const groups = new Set();
let currentCols = [];

lines.forEach(line => {
    const cols = line.split(';');
    // A heuristic to find header rows: if multiple columns have non-empty text and don't have '(' in them.
    // Actually, looking at the CSV format, headers like 'Anciães da RA;Diáconos da RA;Coordenador da RA;Secretário da RA'
    if (cols.some(c => c.includes('GT ') || c.includes(' da RA') || c.includes('RMA'))) {
        cols.forEach(c => {
            if (c.trim()) groups.add(c.trim());
        });
    }
});

console.log("Found Groups:", Array.from(groups));

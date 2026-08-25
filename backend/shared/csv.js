const fs = require('fs');

function quote(value) {
  return `"${String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
}

function parse(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') { current += '"'; i++; }
        else quoted = !quoted;
      } else if (line[i] === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += line[i];
      }
    }

    values.push(current);
    return values;
  });
}

function read(filePath, mapRow) {
  if (!fs.existsSync(filePath)) return [];
  return parse(fs.readFileSync(filePath, 'utf8')).map(mapRow);
}

function write(filePath, header, rows) {
  fs.mkdirSync(require('path').dirname(filePath), { recursive: true });
  const content = rows.map(row => row.map(quote).join(',')).join('\n');
  fs.writeFileSync(filePath, `${header}\n${content}${content ? '\n' : ''}`);
}

module.exports = { parse, read, write, quote };

const fs = require('fs');
const path = require('path');

function fixMarkdown(content) {
  const lines = content.split(/\r?\n/);
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Convert top-level # (except first line) to ##
    if (i > 0 && /^# (?!#)/.test(line)) {
      line = '#' + line;
    }

    result.push(line);
  }

  // Fix MD028: blank line between blockquotes
  for (let i = 1; i < result.length - 1; i++) {
    if (result[i].trim() === '' && result[i - 1].startsWith('>') && result[i + 1].startsWith('>')) {
      result[i] = '>';
    }
  }

  // Remove consecutive blank lines (MD012)
  const cleaned = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i].trim() === '' && cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
      continue;
    }
    cleaned.push(result[i]);
  }

  while (cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
    cleaned.pop();
  }

  return cleaned.join('\n') + '\n';
}

const files = [
  'AGENT-COMMANDS.md',
  'AGENTS.md',
  'GEMINI.md',
  path.join('.agents', 'rules', 'agent-commands.md')
];

for (const relPath of files) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    const original = fs.readFileSync(fullPath, 'utf8');
    const fixed = fixMarkdown(original);
    fs.writeFileSync(fullPath, fixed, 'utf8');
    console.log(`Fixed ${relPath}`);
  }
}

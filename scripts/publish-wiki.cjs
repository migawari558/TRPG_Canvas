const fs = require('node:fs');
const path = require('node:path');

function renderWiki(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const files = fs.readdirSync(source).filter(file => file.endsWith('.md'));
  for (const file of files) {
    const text = fs.readFileSync(path.join(source, file), 'utf8');
    const rendered = text.replace(/\]\(([\w-]+)\.md(#[^)]*)?\)/g, (_, name, hash = '') => {
      if (!files.includes(`${name}.md`)) throw new Error(`Broken Wiki link: ${name}`);
      return `](${name}${hash})`;
    });
    fs.writeFileSync(path.join(destination, file), rendered);
  }
}
if (require.main === module) renderWiki('docs/wiki', process.argv[2]);
module.exports = { renderWiki };

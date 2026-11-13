import fs from 'node:fs';

const file = '_site/index.html';
const build = (process.env.GITHUB_SHA || 'local').slice(0, 7);
let html = fs.readFileSync(file, 'utf8');
html = html.replace(/\?v=[A-Za-z0-9._-]+/g, `?v=${build}`);
fs.writeFileSync(file, html);
console.log(`Stamped web assets with build ${build}`);

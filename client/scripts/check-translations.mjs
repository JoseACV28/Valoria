import {readerCatalog} from '../src/i18n/readerCatalog.js';
import {polishCatalog} from '../src/i18n/polishCatalog.js';
import {launchCatalog} from '../src/i18n/launchCatalog.js';
import {experienceCatalog} from '../src/i18n/experienceCatalog.js';
import {parse} from '@babel/parser';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const sourceRoot=fileURLToPath(new URL('../src',import.meta.url));import {catalog} from '../src/i18n/catalog.js';
import {extraCatalog,aliases} from '../src/i18n/extraCatalog.js';
import {passwordCatalog} from '../src/i18n/passwordCatalog.js';
const moreCatalog=JSON.parse(fs.readFileSync(path.join(sourceRoot,'i18n/moreCatalog.json'),'utf8'));
const norm=s=>s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const known=new Set([...Object.keys(catalog),...Object.keys(extraCatalog),...Object.keys(aliases),...Object.keys(moreCatalog),...Object.keys(passwordCatalog),...Object.keys(experienceCatalog),...Object.keys(launchCatalog),...Object.keys(polishCatalog),...Object.keys(readerCatalog)].map(norm));const keys=new Set();
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.callee.name==='ui'&&n.arguments[0]?.type==='StringLiteral')keys.add(n.arguments[0].value.trim());for(const[k,v]of Object.entries(n)){if(['loc','start','end','extra'].includes(k))continue;if(Array.isArray(v))v.forEach(visit);else if(v?.type)visit(v);}}
function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory()&&x.name!=='i18n')walk(p);else if(p.endsWith('.jsx'))visit(parse(fs.readFileSync(p,'utf8'),{sourceType:'module',plugins:['jsx']}));}}walk(sourceRoot);
const missing=[...keys].filter(k=>!known.has(norm(k))&&/[a-zá-ž]/i.test(k)).sort();console.log(JSON.stringify({total:keys.size,missing:missing.length}));if(missing.length){console.error(missing.join('\n'));process.exitCode=1;}


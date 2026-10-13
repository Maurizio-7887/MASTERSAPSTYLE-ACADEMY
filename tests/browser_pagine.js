// Facoltativo: apre in Chromium le pagine indicate e segnala errori JS.
// Uso: npm i -D playwright; BASE=http://localhost:5000 node tests/browser_pagine.js /vuoto/impostazioni/ /vuoto/contabilita/fi-bl
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch(process.env.CHROME ? {executablePath:process.env.CHROME} : {});
const ctx=await b.newContext();const p=await ctx.newPage();const errs=[];
p.on('pageerror',e=>errs.push(p.url()+' PAGEERROR '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(p.url()+' CONSOLE '+m.text())});
const pages=process.argv.slice(2);
for(const u of pages){await p.goto((process.env.BASE||'http://localhost:5000')+u);await p.waitForTimeout(700);
 const info=await p.evaluate(()=>{const vis=[...document.querySelectorAll('main section.vista')].filter(s=>s.classList.contains('attiva')).map(s=>s.dataset.vista);
  const fi=document.getElementById('fi-mod-nav')?FIModules.active:null;return {vis,fi,ghosts:document.getElementById('ponte-fantasmi')?.children.length||0,txt:document.querySelector('main').innerText.length};});
 console.log(u,JSON.stringify(info));}
console.log(errs.join('\n')||'nessun errore JS');await b.close();})();

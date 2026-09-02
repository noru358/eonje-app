import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE='http://127.0.0.1:4173';
const outDir='browser-qc';
await mkdir(outDir,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{stdio:['ignore','pipe','pipe']});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){for(let i=0;i<80;i++){try{const r=await fetch(BASE);if(r.ok)return}catch{}await sleep(250)}throw new Error(`server did not start\n${serverLog}`)}
const report={pages:{},errors:[]};
let browser;
try{
  await waitServer();
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(`console: ${m.text()}`)});

  await page.goto(`${BASE}/?intent=sunset`,{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.body.classList.contains('ready')||document.body.classList.contains('error'),null,{timeout:30000});
  const home=await page.evaluate(()=>{
    const panel=document.querySelector('#recommendation');const box=panel?.getBoundingClientRect();const scene=getComputedStyle(document.querySelector('.scene'));
    return {bodyClass:document.body.className,place:document.body.dataset.place,season:document.body.dataset.season,daypart:document.body.dataset.daypart,background:scene.backgroundImage,panel:{width:Math.round(box?.width||0),height:Math.round(box?.height||0)},conditions:document.querySelectorAll('#conditions .condition').length,positives:document.querySelectorAll('#positives .evidence-item').length,cautions:document.querySelectorAll('#cautions .evidence-item').length,headline:document.querySelector('#headline')?.textContent.trim(),confirm:document.querySelector('#confirmPlanButton')?.textContent.trim()};
  });
  if(home.bodyClass!=='ready')throw new Error(`home failed to reach ready: ${JSON.stringify(home)}`);
  if(home.season!=='autumn')throw new Error(`expected September autumn scene, got ${home.season}`);
  if(!/autumn\/(?:master-v2|night-v2)\.png/.test(home.background))throw new Error(`home is not using physical autumn asset: ${home.background}`);
  if(home.conditions<2||home.positives<1||home.cautions<1)throw new Error(`home decision panel is under-populated: ${JSON.stringify(home)}`);
  if(home.panel.height>460)throw new Error(`home panel density regressed: height ${home.panel.height}`);
  report.pages.home=home;await page.screenshot({path:`${outDir}/home.png`,fullPage:true});

  await page.goto(`${BASE}/map.html?intent=sunset`,{waitUntil:'networkidle',timeout:60000});await page.waitForSelector('.leaflet-container');await page.waitForTimeout(1200);
  const map=await page.evaluate(()=>({place:document.body.dataset.place,season:document.body.dataset.season,daypart:document.body.dataset.daypart,tiles:document.querySelectorAll('.leaflet-tile').length,markers:document.querySelectorAll('.park-marker-wrap').length,conditions:document.querySelectorAll('.map-conditions>div').length,evidence:document.querySelectorAll('.map-evidence section').length,confirm:Boolean(document.querySelector('[data-confirm]')),background:getComputedStyle(document.querySelector('.map-scene')).backgroundImage}));
  if(map.markers<6)throw new Error(`map markers missing: ${map.markers}`);if(map.conditions<2||map.evidence!==2||!map.confirm)throw new Error(`map decision panel incomplete: ${JSON.stringify(map)}`);report.pages.map=map;await page.screenshot({path:`${outDir}/map.png`,fullPage:true});

  await page.goto(`${BASE}/history.html`,{waitUntil:'networkidle',timeout:60000});const history=await page.evaluate(()=>({confirmed:Boolean(document.querySelector('#confirmedList')),saved:Boolean(document.querySelector('#savedList')),recent:Boolean(document.querySelector('#recentList'))}));if(!history.confirmed||!history.saved||!history.recent)throw new Error(`history surface incomplete: ${JSON.stringify(history)}`);report.pages.history=history;await page.screenshot({path:`${outDir}/history.png`,fullPage:true});

  if(report.errors.length)throw new Error(`browser console errors: ${report.errors.join(' | ')}`);
  await writeFile(`${outDir}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();server.kill('SIGTERM');await sleep(250)}

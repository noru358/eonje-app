import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const BASE={path:'public/assets/hanriver-spring-sunset.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_091335_c0b42e8b-cf7e-432d-abba-295ff689b902.png',sha256:'8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f',width:2752,height:1536};
const GENERATED=[
  ['mangwon','https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_72298e28-deae-442f-aee6-f3c6b594e340.png'],
  ['yeouido','https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_f44aee01-9690-4f00-9336-dc985749b7cf.png'],
  ['ichon','https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_ebfce0f5-a3f7-4780-83b5-1267c39c0813.png'],
  ['banpo','https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_48cee21f-b721-4037-bf23-bb4b6328a09b.png'],
  ['jamsil','https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_4058281a-2672-4e7c-8b16-40a02debfa37.png']
].map(([place,source])=>({path:`public/assets/scenes/${place}/spring/master.png`,source,width:1376,height:768}));

// The current-season v2 set is derived from photographs taken at the actual park
// in September/November (or a park-specific illuminated landmark for night). We
// crop and soften them into the app's editorial art direction instead of tinting
// a cherry-blossom master. See public/credits.html for attribution/licenses.
const AUTUMN_SOURCES=[
  {place:'mangwon',file:'master-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/0/0c/240922_Onlee_%EB%A7%9D%EC%9B%90%ED%95%9C%EA%B0%95%EA%B3%B5%EC%9B%90_%EB%B2%84%EC%8A%A4%ED%82%B9.jpg',position:'center'},
  {place:'yeouido',file:'master-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/b/be/November_2019_Yeouido_02.jpg',position:'center'},
  {place:'ichon',file:'master-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/6/67/Korea_Ichon_Hangang_Park_20140912_03_%2815213656755%29.jpg',position:'center'},
  {place:'jamsil',file:'master-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/f/fc/October_Welcome_Backstrike_City_-_Tower_Seoul_Korea_-_Master_Asia_Photography_2012_Truth_the_Colors_of_Gate_Eden_Eye_on_River_-_panoramio.jpg',position:'center'},
  {place:'banpo',file:'night-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/b/bf/Banpo_Bridge_Moonlight_Rainbow_Fountain_at_night_-_2023-08-14.jpg',position:'center'},
  {place:'ttukseom',file:'night-v2.png',source:'https://upload.wikimedia.org/wikipedia/commons/6/6f/NIght_view_at_Ttukseom_Hangang_Park.jpg',position:'center'}
];

function sha256(bytes){return createHash('sha256').update(bytes).digest('hex')}
function pngDimensions(bytes){if(bytes.length<24||bytes.subarray(1,4).toString('ascii')!=='PNG')throw new Error('not a PNG');return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}}
function validatePng(bytes,item){const {width,height}=pngDimensions(bytes);if(width!==item.width||height!==item.height)throw new Error(`unexpected dimensions ${width}x${height}`);if(item.sha256&&sha256(bytes)!==item.sha256)throw new Error('unexpected hash');return{width,height,hash:sha256(bytes)}}
async function fetchBytes(url){const response=await fetch(url,{headers:{'user-agent':'eonje-app/0.6 seasonal-scene-fetch'},signal:AbortSignal.timeout(35_000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);return Buffer.from(await response.arrayBuffer())}
async function ensurePng(item){const target=join(ROOT,item.path);try{const existing=await readFile(target);return{status:'verified',...validatePng(existing,item)}}catch{}await mkdir(dirname(target),{recursive:true});const bytes=await fetchBytes(item.source);const meta=validatePng(bytes,item);await writeFile(target,bytes);return{status:'downloaded',...meta}}
async function ensureDerived(item){const target=join(ROOT,`public/assets/scenes/${item.place}/autumn/${item.file}`);try{const existing=await readFile(target);const meta=await sharp(existing).metadata();if(meta.width===1600&&meta.height===900)return{status:'verified',width:meta.width,height:meta.height}}catch{}
  await mkdir(dirname(target),{recursive:true});const source=await fetchBytes(item.source);
  const out=await sharp(source,{failOn:'none'}).rotate().resize(1600,900,{fit:'cover',position:item.position||'centre'}).median(2).modulate({brightness:1.04,saturation:.92}).sharpen({sigma:.75,m1:.4,m2:.8}).png({compressionLevel:8}).toBuffer();
  await writeFile(target,out);return{status:'derived',width:1600,height:900,size:out.length};
}

const baseMeta=await ensurePng(BASE);console.log(`design base ${baseMeta.status} → ${baseMeta.width}x${baseMeta.height} sha256:${baseMeta.hash.slice(0,12)}`);
let ready=0;for(const item of GENERATED){try{const meta=await ensurePng(item);ready++;console.log(`spring scene ${meta.status} → ${item.path}`)}catch(error){console.warn(`spring scene unavailable → ${item.path}: ${error.message}`)}}
let autumnReady=0;for(const item of AUTUMN_SOURCES){try{const meta=await ensureDerived(item);autumnReady++;console.log(`autumn scene ${meta.status} → ${item.place}/${item.file}`)}catch(error){console.warn(`autumn scene unavailable → ${item.place}/${item.file}: ${error.message}`)}}
console.log(`scene assets ready → spring ${ready}/${GENERATED.length}, real-source autumn ${autumnReady}/${AUTUMN_SOURCES.length}; summer/winter native masters remain pending`);

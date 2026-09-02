import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const BASE={path:'public/assets/hanriver-spring-sunset.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_091335_c0b42e8b-cf7e-432d-abba-295ff689b902.png',sha256:'8f9bc95005bad23a493e3fdb6ca86fa94ba89fa54fe0a1d462804c0f8b152f5f',width:2752,height:1536,required:true};
const SCENES=[
  {path:'public/assets/scenes/mangwon/spring/master.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_72298e28-deae-442f-aee6-f3c6b594e340.png',width:1376,height:768},
  {path:'public/assets/scenes/yeouido/spring/master.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_f44aee01-9690-4f00-9336-dc985749b7cf.png',width:1376,height:768},
  {path:'public/assets/scenes/ichon/spring/master.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_ebfce0f5-a3f7-4780-83b5-1267c39c0813.png',width:1376,height:768},
  {path:'public/assets/scenes/banpo/spring/master.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_48cee21f-b721-4037-bf23-bb4b6328a09b.png',width:1376,height:768},
  {path:'public/assets/scenes/jamsil/spring/master.png',source:'https://d8j0ntlcm91z4.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/hf_20260902_095141_4058281a-2672-4e7c-8b16-40a02debfa37.png',width:1376,height:768},
  {path:'public/assets/scenes/mangwon/autumn/master.png',source:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/86bbbe14-26b5-458f-9b08-1869180d2d09.png',width:1376,height:768},
  {path:'public/assets/scenes/yeouido/autumn/master.png',source:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/db72b9ec-1e4e-4a22-8a81-ddb377c3bf79.png',width:1376,height:768},
  {path:'public/assets/scenes/ichon/autumn/master.png',source:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/42e04e1b-8ff3-4627-9326-1fda04a72f43.png',width:1376,height:768},
  {path:'public/assets/scenes/banpo/autumn/master.png',source:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/aa8e5330-2fe3-4e3e-bb80-e92b2a625986.png',width:1376,height:768},
  {path:'public/assets/scenes/jamsil/autumn/master.png',source:'https://d2ol7oe51mr4n9.cloudfront.net/user_3IUSVXbiZ0tsNqdqqpOsx4mWnu0/d6e9aab1-d767-4914-ada9-598527399d76.png',width:1376,height:768}
];
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex')}
function pngDimensions(bytes){if(bytes.length<24||bytes.subarray(1,4).toString('ascii')!=='PNG')throw new Error('not a PNG');return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}}
function validate(bytes,item){const {width,height}=pngDimensions(bytes);if(width!==item.width||height!==item.height)throw new Error(`unexpected dimensions ${width}x${height}`);if(item.sha256&&sha256(bytes)!==item.sha256)throw new Error('unexpected hash');return{width,height,hash:sha256(bytes)}}
async function ensure(item){const target=join(ROOT,item.path);try{const existing=await readFile(target);const meta=validate(existing,item);return{status:'verified',...meta}}catch{}await mkdir(dirname(target),{recursive:true});const response=await fetch(item.source,{signal:AbortSignal.timeout(25_000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());const meta=validate(bytes,item);await writeFile(target,bytes);return{status:'downloaded',...meta,size:bytes.length}}
const baseMeta=await ensure(BASE);console.log(`design base ${baseMeta.status} → ${baseMeta.width}x${baseMeta.height} sha256:${baseMeta.hash.slice(0,12)}`);let ready=0;for(const item of SCENES){try{const meta=await ensure(item);ready++;console.log(`scene ${meta.status} → ${item.path}`)}catch(error){console.warn(`scene unavailable → ${item.path}: ${error.message}`)}}console.log(`scene masters ready → ${ready}/${SCENES.length}; autumn is a physical raster season, other missing seasons use retouch until native masters exist`);

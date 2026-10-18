// Render the share card from the original portrait, signature paths and local fonts.
// Run: node tools/prepare-social-preview.mjs
// Optional: PREVIEW_BROWSER_CHANNEL=chrome to use an installed Chrome.
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brandGeometry} from '../src/components/brand/geometry.ts';

const data=async(file,mime)=>`data:${mime};base64,${(await readFile(new URL('../'+file,import.meta.url))).toString('base64')}`;
const font=await data('src/assets/fonts/Epilogue.woff2','font/woff2');
const portrait=await data('public/images/mee-hero-h03-c01.webp','image/webp');
const signature=brandGeometry.signature;
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><style>
@font-face{font-family:Epilogue;src:url('${font}') format('woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:#f5f5f7;color:#1d1d1f;font-family:Epilogue,sans-serif;-webkit-font-smoothing:antialiased}
.signature{position:absolute;left:66px;top:46px;width:142px;height:52px;color:#1d1d1f}
.name{position:absolute;left:66px;top:203px;margin:0;letter-spacing:-2.8px;font-size:57px;line-height:1.15;font-weight:550}
.name strong{display:block;font-size:110px;line-height:1.13;letter-spacing:-6.5px;font-weight:750;margin-top:9px}
.role{position:absolute;left:70px;top:420px;margin:0;font-size:22px;line-height:1.6;letter-spacing:-.7px;color:#57575b}
.domain{position:absolute;left:70px;bottom:50px;font-size:17px;letter-spacing:-.45px;color:#57575b}
.arrow{position:absolute;left:563px;bottom:49px;width:24px;height:24px;stroke:#1d1d1f;stroke-width:1.7;fill:none}
.portrait{position:absolute;left:654px;right:34px;top:34px;bottom:34px;border-radius:40px;overflow:hidden;background:#d7dbdb}
.portrait img{position:absolute;left:50%;top:-97px;height:850px;width:auto;transform:translateX(-50%)}
</style><body><svg class="signature" viewBox="${signature.viewBox}" fill="none" stroke="currentColor" stroke-width="${signature.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${signature.paths.map(d=>`<path d="${d}"/>`).join('')}</svg>
<h1 class="name">Abdulrahman<strong>Elsayed.</strong></h1><p class="role">Web designer &amp; developer.<br>Based in Egypt. Working worldwide.</p><div class="domain">abdulrahmanelsayed.xyz</div><svg class="arrow" viewBox="0 0 24 24"><path d="M4 20 20 4M4 4h16v16"/></svg><div class="portrait"><img src="${portrait}" alt="Portrait of Abdulrahman Elsayed"></div></body></html>`;
const browser=await chromium.launch({headless:true,...(process.env.PREVIEW_BROWSER_CHANNEL?{channel:process.env.PREVIEW_BROWSER_CHANNEL}:{})});
let png;
try{
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:2});
 await page.setContent(html);await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
 const bounds=await page.locator('.name').evaluate(el=>({right:el.getBoundingClientRect().right,bottom:el.getBoundingClientRect().bottom}));
 if(bounds.right>620||bounds.bottom>415)throw Error('Share-card text crosses its safe area');
 png=await page.screenshot({type:'png'});
}finally{await browser.close();}
const jpeg=await sharp(png).resize(1200,630).flatten({background:'#f5f5f7'}).jpeg({quality:90,mozjpeg:true,chromaSubsampling:'4:4:4'}).toBuffer();
const hash=createHash('sha256').update(jpeg).digest('hex');
const file=`public/images/social-preview-${hash.slice(0,12)}.jpg`;
await writeFile(new URL('../'+file,import.meta.url),jpeg);
console.log(JSON.stringify({file,bytes:jpeg.length,sha256:hash,width:1200,height:630,format:'jpeg'},null,2));

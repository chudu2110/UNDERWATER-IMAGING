import assert from 'node:assert/strict';
import {Browser, sleep} from './.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import {mkdirSync} from 'node:fs';
const browser=await Browser.launch();
mkdirSync('logs/dev/design-qa/qa',{recursive:true});
try {
 const page=await browser.newPage({width:1440,height:1000});
 await page.goto('http://127.0.0.1:7860');
 await page.eval(()=>{window.enhanceCalls=0;const request=window.fetch.bind(window);window.fetch=(url,...args)=>{if(String(url).includes('/api/enhance'))window.enhanceCalls++;return request(url,...args);};});
 const initial=await page.eval(()=>({
  lang:document.documentElement.lang,ids:[...document.querySelectorAll('[id]')].map(e=>e.id),
  ordered:!!(document.querySelector('#samples').compareDocumentPosition(document.querySelector('#studio'))&Node.DOCUMENT_POSITION_FOLLOWING),
  controls:document.querySelector('#samples').querySelectorAll('select:not(#demo-zoom):not(#demo-edge),input[type=file],[data-role=enhance],[data-role=model]').length,
  webgl:document.querySelector('#ocean').getContext('webgl').getError(),
  english:!/[ăâđêôơưẠ-ỹ]/i.test(document.body.innerText)
 }));
 assert.equal(initial.lang,'en');assert(initial.ordered);assert.equal(initial.controls,0);assert.equal(initial.webgl,0);assert(initial.english);assert.equal(new Set(initial.ids).size,initial.ids.length);
 // Every scene has a real, prepared output and never calls inference.
 for(const scene of ['U45','CH60','UFO','LSUI','CC7']){
  await page.eval(scene=>document.querySelector(`[data-sample="${scene}"]`).click(),scene);
  await page.eval(async()=>{await Promise.all(['demo-before','demo-after'].map(id=>document.getElementById(id).decode()));});
  const result=await page.eval(()=>({src:document.querySelector('#demo-after').getAttribute('src'),width:document.querySelector('#demo-after').naturalWidth,reference:!document.querySelector('#demo-reference').hidden}));
  assert.equal(result.src,`/assets/examples/${scene}-512.png`);assert(result.width>0);assert.equal(result.reference,['UFO','LSUI'].includes(scene));
 }
 assert.equal(await page.eval(()=>window.enhanceCalls),0);
 // Resolution variants are prepared model outputs, not on-demand submissions.
 for(const scene of ['U45','CH60','UFO','LSUI','CC7']){
  await page.eval(scene=>document.querySelector(`[data-sample="${scene}"]`).click(),scene);
  for(const edge of [256,512,768]){
   await page.eval(edge=>{const select=document.querySelector('#demo-edge');select.value=String(edge);select.dispatchEvent(new Event('change'));},edge);
   await page.eval(async()=>{await document.querySelector('#demo-after').decode();});
   const size=await page.eval(()=>({width:document.querySelector('#demo-after').naturalWidth,height:document.querySelector('#demo-after').naturalHeight,src:document.querySelector('#demo-after').getAttribute('src')}));
   assert.equal(size.src,`/assets/examples/${scene}-${edge}.png`);assert.equal(Math.max(size.width,size.height),Math.min(edge,640));
  }
 }
 await page.eval(async()=>{await document.querySelector('#architecture-open img').decode();});
 assert.equal(await page.eval(()=>document.querySelector('#architecture-open img').naturalWidth),2325);
 await page.eval(()=>document.querySelector('#architecture-open').click());
 assert(await page.eval(()=>document.querySelector('#architecture-dialog').open));
 await page.eval(()=>document.querySelector('#architecture-close').click());
 assert.equal(await page.eval(()=>document.querySelector('#architecture-dialog').open),false);

 await page.eval(()=>{document.querySelector('#demo-compare').value=25;document.querySelector('#demo-compare').dispatchEvent(new Event('input'));});
 assert.equal(await page.eval(()=>document.querySelector('#demo-viewer').style.getPropertyValue('--split')),'25%');
 for(const mode of ['side-by-side','original','enhanced','compare']){
  await page.eval(mode=>document.querySelector(`button[data-view="${mode}"]`).click(),mode);
  assert.equal(await page.eval(()=>document.querySelector('#demo-viewer').dataset.view),mode);
  assert.equal(await page.eval(()=>document.querySelector('#demo-compare').hidden),mode!=='compare');
 }
 await page.eval(()=>{document.querySelector('#demo-zoom').value='2';document.querySelector('#demo-zoom').dispatchEvent(new Event('change'));});
 assert.equal(await page.eval(()=>document.querySelector('#demo-viewer').style.getPropertyValue('--zoom')),'2');
 await page.eval(()=>document.querySelector('[data-sample="UFO"]').click());
 await page.eval(async()=>{const d=document.querySelector('#demo-reference');d.open=true;await document.querySelector('#demo-reference-image').decode();});
 assert(await page.eval(()=>document.querySelector('#demo-reference-image').naturalWidth>0));
 // Upload and its live inference remain independent from the static gallery.
 assert(await page.eval(()=>document.querySelector('#upload').closest('[data-workspace]').querySelector('[data-role=enhance]').disabled));
 await page.eval(async()=>{const blob=await(await fetch('/samples/U45.png')).blob();const transfer=new DataTransfer();transfer.items.add(new File([blob],'my-photo.png',{type:'image/png'}));const input=document.querySelector('#upload');input.files=transfer.files;input.dispatchEvent(new Event('change'));});
 assert.equal(await page.eval(()=>document.querySelector('#demo-after').getAttribute('src')),'/assets/examples/UFO-768.png');
 await page.eval(()=>{document.querySelector('input[name="upload-size"][value="256"]').click();document.querySelector('[data-workspace=upload] [data-role=enhance]').click();});
 let done=false;
 for(let i=0;i<60;i++){await sleep(1000);if(await page.eval(()=>document.querySelector('[data-workspace=upload] [data-role=loading]').hidden)){done=true;break;}}
 assert(done,'Upload inference timed out');
 assert.equal(await page.eval(()=>document.querySelector('[data-workspace=upload] [data-role=message]').classList.contains('error')),false);
 const uploadResult=await page.eval(()=>document.querySelector('[data-workspace=upload] [data-role=after]').src);assert(uploadResult.startsWith('blob:'));
 await page.eval(()=>document.querySelector('[data-sample="LSUI"]').click());
 assert.equal(await page.eval(()=>document.querySelector('[data-workspace=upload] [data-role=after]').src),uploadResult);
 assert.equal(await page.eval(()=>window.enhanceCalls),1);
 for(const width of [1440,768,390]){
  await page.setViewport({width,height:1000,mobile:width===390});
  assert(await page.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}`);
  for(const id of ['samples','method-title','studio']){await page.eval(id=>document.getElementById(id).scrollIntoView({behavior:'instant'}),id);await sleep(300);await page.screenshot({path:`logs/dev/design-qa/qa/${id}-ready-${width}.jpg`});}
 }
 assert.deepEqual(page.consoleErrors,[]);
 console.log('PASS: architecture image/dialog; 15 prepared resolution variants; prepared gallery before upload; all five result pairs; no gallery inference/model/submit; four viewing modes and zoom; reference images; independent live upload; WebGL; English UI; responsive 1440/768/390; no console errors.');
}finally{await browser.close();}

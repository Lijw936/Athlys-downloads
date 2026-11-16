"""Browser checks of packaged assets, native entry wiring and actual offline worker.
Synthetic SDK is served from a temporary directory. No real service is contacted.
"""
import asyncio,json,os,re,shutil,subprocess,tempfile,socket
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'audit-evidence/platforms';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 from fixture_config import irl_config
 results=[]
 def record(name,detail):results.append({'case':name,'status':'PASS','detail':detail})
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox'])
  with tempfile.TemporaryDirectory(prefix='athlys-synthetic-platform-') as tmp:
   root=Path(tmp);shutil.copytree(ROOT/'web',root/'web');(root/'web/app-config.js').write_text(irl_config());(root/'web/supabase-client.bundle.js').write_text((ROOT/'tests/browser/ui-fixture.js').read_text());
   sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();base=f'http://127.0.0.1:{port}'
   with open(OUT/'server.log','w')as log:
    proc=subprocess.Popen(['python','-m','http.server',str(port),'--bind','127.0.0.1','--directory',str(root/'web')],stdout=log,stderr=log)
    try:
     await asyncio.sleep(.3)
     c=await b.new_context(viewport={'width':412,'height':915});p=await c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
     await p.route('**/*',lambda r:r.continue_()if r.request.url.startswith(base)else r.abort())
     await p.goto(base+'/mobile.html');await p.evaluate('navigator.serviceWorker.ready');await p.wait_for_timeout(700)
     assert await p.evaluate('!!navigator.serviceWorker.controller')
     assert not errors,errors
     await c.set_offline(True)
     for entry in ['mobile.html','club-app.html','trial.html']:
      await p.goto(base+'/'+entry);await p.wait_for_timeout(400);assert len(await p.locator('body').inner_text())>100
      if entry=='club-app.html':assert await p.locator('#club-app .content').count()==1
      await p.screenshot(path=str(OUT/('offline-'+entry+'.png')))
     assert not errors,errors;record('actual-worker-offline-three-shells','mobile/Club/diagnostic served by installed worker, no SDK/auth/model calls')
     await c.close()
     # Verify parser-inserted native bundles and JS back handler with a fake native bridge.
     (root/'web/native-app.bundle.js').write_text("window.__nativeBundleLoaded=true;window.athlysApp={addListener:(name,fn)=>{(window.__nativeListeners||={})[name]=fn},exitApp:()=>window.__nativeExit=true};")
     (root/'web/intent-launcher.bundle.js').write_text('window.__intentBundleLoaded=true;')
     for entry in ['mobile.html','index.html','app.html']:
      c=await b.new_context(viewport={'width':1440,'height':1000},service_workers='block');p=await c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
      await p.add_init_script("window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android'};")
      await p.route('**/*',lambda r:r.continue_()if r.request.url.startswith(base)else r.abort())
      await p.goto(base+'/'+entry);await p.wait_for_timeout(400)
      assert await p.evaluate('!!window.__nativeBundleLoaded'),entry
      assert await p.locator('#athlys .main').count()==1,entry
      assert not errors,errors
      if entry=='mobile.html':assert await p.evaluate('!!window.__intentBundleLoaded')
      await p.locator('[data-nav="schedule"]:visible').first.click();await p.evaluate('window.__nativeListeners.backButton()');await p.wait_for_timeout(100);assert 'view=home'in p.url
      record('native-entry-'+entry,'browser simulation: bundles parse, main app boots, JS back handler restores home; no Android OS proof')
      await c.close()
    finally:proc.terminate();proc.wait(timeout=5)
  # Verify links/styles/scripts in exactly the two Windows staging directories.
  for app in ['desktop','desktop-club']:
   subprocess.run(['node',str(ROOT/app/'copy-web.cjs')],cwd=ROOT,check=True,capture_output=True)
   root=ROOT/app/'web';checked=0
   for html in root.glob('*.html'):
    for value in re.findall(r'(?:href|src)=["\']([^"\']+)',html.read_text()):
     if value.startswith(('https:','http:','mailto:','#','data:')):continue
     target=root/value.split('?')[0].lstrip('/')
     if value=='/':target=root/'index.html'
     assert target.exists(),f'{app}/{html.name}: missing {value}';checked+=1
   assert not list(root.rglob('*.test.*'))
   assert not any((root/n).exists()for n in ['landing.html','refonte.css','mobile.js','app-visual-polish.css'])
   record(app+'-packaged-links',{'local_links_checked':checked,'tests_showcase_legacy':'excluded'})
  await b.close()
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())

import asyncio,json,os,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/os.environ.get('AUDIT_OUTPUT','audit-evidence');OUT.mkdir(exist_ok=True)
FIXTURE=(ROOT/'tests/browser/ui-fixture.js').read_text()
AXE=Path(os.environ.get('AXE_PATH',str(ROOT/'tests/browser/node_modules/axe-core/axe.min.js')))
from fixture_config import irl_config
IRL_CONFIG=irl_config()
BASE=os.environ.get('ATHLYS_AUDIT_URL','http://127.0.0.1:8784')
metrics=r'''() => {const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const w=innerWidth;return {width:w,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>visible(e)&&!e.closest('.table-wrap,.athlys-cohort-table')&&e.getBoundingClientRect().right>w+2&&!e.closest('.assistant:not(.open)')).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:(e.innerText||'').slice(0,90),right:Math.round(e.getBoundingClientRect().right)})),smallTargets:[...document.querySelectorAll('button,a,input,select')].filter(e=>visible(e)&&e.getBoundingClientRect().width<24&&e.getBoundingClientRect().height<24).slice(0,12).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||e.name||'').slice(0,70),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),whitePanels:[...document.querySelectorAll('.card,.panel,.auth-card')].filter(e=>visible(e)&&/rgb\(255, 255, 255\)/.test(getComputedStyle(e).backgroundColor)).length,heading:[...document.querySelectorAll('h1,h2')].filter(visible).map(e=>e.innerText).slice(0,5),activeNavigation:[...document.querySelectorAll('[data-nav].active,[data-view].active')].filter(visible).map(e=>e.dataset.nav||e.dataset.view),scrollY,bodyLength:document.body.innerText.length};}'''
async def main():
 results=[]
 async with async_playwright()as pw:
  browser=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  for role in ['coach','athlete','club']:
   for width,height in [(360,800),(412,915),(768,1024),(1440,1000)]:
    context=await browser.new_context(viewport={'width':width,'height':height},service_workers='block',reduced_motion='reduce',locale='fr-FR')
    page=await context.new_page();page.set_default_timeout(2500);errors=[];missing=[];external=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('response',lambda r:missing.append({'url':r.url,'status':r.status})if r.status>=400 and r.url.startswith(BASE)else None)
    theme_script=''
    if os.environ.get('AUDIT_THEME')=='light':
     uid='22222222-2222-4222-8222-222222222222'if role=='athlete'else'11111111-1111-4111-8111-111111111111'
     theme_script='localStorage.setItem("athlys-club-theme","light");localStorage.setItem("athlys-full-prefs-'+uid+'",JSON.stringify({theme:"light",fontSize:3}));'
    await page.add_init_script('window.__auditOptions='+json.dumps({'role':role})+';'+theme_script+FIXTURE)
    async def route(req):
     url=req.request.url
     if '/supabase-client.bundle.js'in url:await req.fulfill(body=FIXTURE,content_type='text/javascript')
     elif '/app-config.js' in url and os.environ.get('AUDIT_IRL'):
      await req.fulfill(body=IRL_CONFIG,content_type='text/javascript')
     elif url.startswith(BASE):await req.continue_()
     else:external.append({'url':url,'method':req.request.method});await req.abort()
    await page.route('**/*',route)
    entry='club-app.html'if role=='club'else'mobile.html'if width<821 else'index.html'
    await page.goto(BASE+'/'+entry);await page.wait_for_timeout(800)
    navattr='data-view'if role=='club'else'data-nav'
    targets=await page.locator('['+navattr+']').evaluate_all('(els)=>[...new Set(els.map(e=>e.getAttribute("'+navattr+'")))]')
    if role!='club':
     more=page.locator('[data-nav="more"]:visible').first
     if await more.count():await more.click();await page.wait_for_timeout(150);targets=list(dict.fromkeys(targets+await page.locator('[data-nav]').evaluate_all('(els)=>els.map(e=>e.dataset.nav)')))
    if width<821:targets=[x for x in targets if x!='quantum']
    if not await page.locator('[data-nav="more"]:visible').count() and role!='club':targets=[x for x in targets if x!='more']
    for target in targets:
     if os.environ.get('AUDIT_SKIP_INTEGRATIONS') and target=='integrations':continue
     locator=page.locator('['+navattr+'="'+target+'"]:visible').first
     if not await locator.count()and role!='club':
      more=page.locator('[data-nav="more"]:visible').first
      if await more.count():await more.click();await page.wait_for_timeout(100)
      locator=page.locator('['+navattr+'="'+target+'"]:visible').first
     print(role,width,target,flush=True)
     row={'role':role,'width':width,'entry':entry,'route':target,'fixture':'synthetic UI only; no backend permission proof'}
     if not await locator.count():row['unreachable']=True;results.append(row);continue
     before=len(errors)
     try:await locator.click();await page.wait_for_timeout(120);row.update(await page.evaluate(metrics));row['url']=page.url
     
     except Exception as e:row['navigation_error']=str(e)[:200]
     row['page_errors']=errors[before:];row['missing_resources']=missing[:]
     if AXE.exists():
      if not await page.evaluate('!!window.axe'):await page.add_script_tag(path=str(AXE))
      axe=await asyncio.wait_for(page.evaluate('async()=>{const r=await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}});return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,8).map(n=>({html:n.html.slice(0,350),target:n.target,summary:n.failureSummary}))}));}'),timeout=30)
      row['axe_violations']=axe
     if target in ['home','overview','profile','more','messages','people','training','settings']or row.get('overflow')or row.get('page_errors'):
      shot=f'{role}-{width}-{target}.png';await page.screenshot(path=str(OUT/shot));row['screenshot']=shot
     results.append(row)
     (OUT/'baseline.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    # Real browser back should remain in app and recover previous view.
    if role!='club'and width==1440 and await page.locator('[data-nav="home"]:visible').count():
     await page.locator('[data-nav="home"]:visible').first.click();await page.locator('[data-nav="training"]:visible').first.click();await page.go_back();await page.wait_for_timeout(150)
     results.append({'role':role,'width':width,'case':'browser_back','url':page.url,'body_length':len(await page.locator('body').inner_text())})
    (OUT/'baseline.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    await context.close()
  await browser.close()
 (OUT/'baseline.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 failures=[r for r in results if r.get('unreachable')or r.get('navigation_error')or r.get('page_errors')or r.get('overflow')or r.get('axe_violations')or r.get('missing_resources')or (os.environ.get('AUDIT_IRL') and r.get('route') and r.get('url') and 'view='+r['route'] not in r['url'])]
 print(json.dumps({'routes':len(results),'issues':len(failures),'page_errors':sum(len(r.get('page_errors',[]))for r in results),'unreachable':[{'role':r['role'],'width':r['width'],'route':r.get('route')}for r in results if r.get('unreachable')],'axe_rules':sorted({v['id']for r in results for v in r.get('axe_violations',[])})},ensure_ascii=False))
 if failures:raise SystemExit(1)
if __name__=='__main__':asyncio.run(main())

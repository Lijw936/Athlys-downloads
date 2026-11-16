"""Synthetic browser journeys. Blocks every external request and never uses real accounts."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'audit-evidence/journeys';OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('ATHLYS_AUDIT_URL','http://127.0.0.1:8784');FIXTURE=(ROOT/'tests/browser/ui-fixture.js').read_text();AXE=Path(os.environ.get('AXE_PATH',str(ROOT/'tests/browser/node_modules/axe-core/axe.min.js')))
from fixture_config import irl_config
IRL_CONFIG=irl_config()
results=[]
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),args=['--no-sandbox'])
  async def setup(role,width=412,mode='populated',clubRole='owner',delay=0):
   ctx=await browser.new_context(viewport={'width':width,'height':915},service_workers='block',reduced_motion='reduce',locale='fr-FR');p=await ctx.new_page();p.set_default_timeout(5000);errors=[];external=[]
   p.on('pageerror',lambda e:errors.append(str(e)))
   await p.add_init_script('window.__auditOptions='+json.dumps(dict(role=role,mode=mode,clubRole=clubRole,delay=delay))+';'+FIXTURE)
   async def route(r):
    if '/supabase-client.bundle.js'in r.request.url:await r.fulfill(body=FIXTURE,content_type='text/javascript')
    elif '/app-config.js' in r.request.url:await r.fulfill(body=IRL_CONFIG,content_type='text/javascript')
    elif r.request.url.startswith(BASE):await r.continue_()
    else:external.append({'url':r.request.url,'method':r.request.method});await r.abort()
   await p.route('**/*',route)
   entry='club-app.html'if role=='club'else'mobile.html'if width<=820 else'index.html'
   await p.goto(BASE+'/'+entry);await p.wait_for_timeout(400+delay*3)
   return ctx,p,errors,external
  async def check(name,fn):
   try:detail=await fn();results.append({'case':name,'status':'PASS','detail':detail})
   except Exception as e:results.append({'case':name,'status':'FAIL','error':str(e)[:1200]})
   (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(name,results[-1]['status'],flush=True)
  async def navigate(p,role,target):
   attr='data-view'if role=='club'else'data-nav';node=p.locator('['+attr+'="'+target+'"]:visible').first
   if not await node.count() and role!='club':await p.locator('[data-nav="more"]:visible').first.click();node=p.locator('['+attr+'="'+target+'"]:visible').first
   await node.click();await p.wait_for_timeout(80)
   assert 'view='+target in p.url,p.url
  for role in ['coach','athlete','club']:
   for width in [360,768,1440]:
    async def history_case(role=role,width=width):
     ctx,p,errors,external=await setup(role,width)
     try:
      a,b=('people','settings')if role=='club'else('schedule','messages')
      await navigate(p,role,a);await navigate(p,role,b);await p.go_back();await p.wait_for_timeout(100);assert 'view='+a in p.url
      await p.go_forward();await p.wait_for_timeout(100);assert 'view='+b in p.url
      await p.reload();await p.wait_for_timeout(400);assert 'view='+b in p.url
      assert await p.locator('[aria-current="page"]:visible').count()>0
      assert not errors,errors
      return {'history':'back/forward/reload','external_requests_blocked':len(external)}
     finally:await ctx.close()
    await check(f'{role}-{width}-history',history_case)
   async def forms(role=role):
    ctx,p,errors,external=await setup(role)
    try:
     await navigate(p,role,'people'if role=='club'else'training')
     action='person-new'if role=='club'else'program-new'if role=='coach'else'log-new'
     # Club uses add-person; the actual accessible action is discovered from the UI.
     if role=='club':action='add-person'
     trigger=p.locator('[data-action="'+action+'"]:visible').first
     if not await trigger.count()and role=='club':trigger=p.get_by_role('button',name='Ajouter une personne').first
     await trigger.click();await p.wait_for_timeout(100)
     dialog=p.get_by_role('dialog');assert await dialog.count()==1
     assert await dialog.evaluate('(d)=>d.contains(document.activeElement)')
     await p.keyboard.press('Shift+Tab');assert await dialog.evaluate('(d)=>d.contains(document.activeElement)')
     await p.keyboard.press('Tab');assert await dialog.evaluate('(d)=>d.contains(document.activeElement)')
     await p.add_script_tag(path=str(AXE));violations=await p.evaluate('async()=> (await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))')
     await p.screenshot(path=str(OUT/(role+'-dialog.png')))
     assert not violations,violations
     submit=dialog.locator('button[type="submit"],.form-end button:not([type="button"])').last
     if await submit.count():
      await submit.scroll_into_view_if_needed();assert await submit.evaluate('(b)=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),'submit covered by another layer'
     await p.keyboard.press('Escape');assert await p.get_by_role('dialog').count()==0
     assert await p.locator('[inert]').count()==0
     assert not errors,errors
     return 'dialogue nommé, focus contenu, cycle Tab, Escape, contraste/libellés'
    finally:await ctx.close()
   await check(role+'-dialog-keyboard-accessibility',forms)
   for mode in ['empty','error','anonymous']:
    async def state_case(role=role,mode=mode):
     ctx,p,errors,external=await setup(role,mode=mode)
     try:
      assert len(await p.locator('body').inner_text())>120
      assert not await p.locator('.athlys-auth-loader.is-visible').count(),'loader still visible'
      if mode=='empty':await navigate(p,role,'licenses'if role=='club'else'training')
      if mode=='error':assert 'indisponib' in (await p.locator('body').inner_text()).lower(),(await p.locator('body').inner_text())[:1500]
      if mode=='anonymous':
       assert await p.locator('input[type="password"]').count()==1
       if role!='club':
        await p.get_by_role('button',name='Afficher le mot de passe',exact=True).click();assert await p.locator('input[name="password"]').get_attribute('type')=='text'
        await p.get_by_role('button',name='Mot de passe oublié ?').click();assert await p.locator('input[name="password"]').count()==0
        await p.get_by_role('button',name='Retour à la connexion').click()
       await p.add_script_tag(path=str(AXE));v=await p.evaluate('async()=> (await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))');assert not v,v
      assert not errors,errors
      await p.screenshot(path=str(OUT/(role+'-'+mode+'.png')))
      return {'state':mode,'external_requests_blocked':len(external)}
     finally:await ctx.close()
    await check(role+'-'+mode,state_case)
   async def offline(role=role):
    ctx,p,errors,external=await setup(role)
    try:
     await ctx.set_offline(True);await p.wait_for_timeout(100)
     await navigate(p,role,'settings'if role=='club'else'integrations')
     assert not errors,errors
     await p.screenshot(path=str(OUT/(role+'-offline.png')))
     return 'navigation hors connexion sur page déjà chargée; rechargement PWA contrôlé séparément'
    finally:await ctx.close()
   await check(role+'-offline-navigation',offline)
  for clubRole in ['owner','admin','registrar','coach','viewer']:
   async def permissions(clubRole=clubRole):
    ctx,p,errors,_=await setup('club',clubRole=clubRole)
    try:
     await navigate(p,'club','people');buttons=p.get_by_role('button',name='Ajouter une personne')
     assert bool(await buttons.count())==(clubRole in ['owner','admin','registrar'])
     await navigate(p,'club','settings');assert await p.locator('#settings-form input[name="name"]').is_disabled()==(clubRole not in ['owner','admin'])
     assert not errors,errors
     return 'visibilité des commandes seulement; aucune preuve RLS serveur'
    finally:await ctx.close()
   await check('club-role-'+clubRole,permissions)
  for width in [320,820,821,1920]:
   async def boundary(width=width):
    ctx,p,errors,_=await setup('coach',width)
    try:
     await navigate(p,'coach','performance');assert await p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     await p.locator('[data-perf-tab]:visible').last.scroll_into_view_if_needed();await p.locator('[data-perf-tab]:visible').last.click();assert not errors,errors
     return 'seuil responsive et dernier onglet accessibles'
    finally:await ctx.close()
   await check('responsive-boundary-'+str(width),boundary)
  for role in ['coach','athlete','club']:
   async def light(role=role):
    ctx,p,errors,_=await setup(role)
    try:
     if role=='club':await p.evaluate("localStorage.setItem('athlys-club-theme','light')")
     else:
      uid='22222222-2222-4222-8222-222222222222'if role=='athlete'else'11111111-1111-4111-8111-111111111111'
      await p.evaluate('(id)=>localStorage.setItem("athlys-full-prefs-"+id,JSON.stringify({theme:"light",fontSize:3}))',uid)
     await p.reload();await p.wait_for_timeout(400);await navigate(p,role,'settings'if role=='club'else'profile')
     await p.add_script_tag(path=str(AXE));v=await p.evaluate('async()=> (await axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))');assert not v,v
     if role=='club':assert await p.locator('.brand').evaluate('(e)=>getComputedStyle(e).backgroundColor')=='rgb(19, 33, 60)'
     await p.screenshot(path=str(OUT/(role+'-light-large-text.png')));assert not errors,errors
     return 'thème clair, préférence de texte agrandi, contraste et navigation'
    finally:await ctx.close()
   await check(role+'-light-large-text',light)
  async def lm_program():
   ctx,p,errors,_=await setup('coach');requests=[]
   try:
    async def infer(r):
     q=r.request.post_data_json;requests.append(q)
     text=q.get('text','');start=text.index('RPE 5')
     result={'execution':'external_server','mode':'external_lm','program':{'sessions':[{'day':'Lundi','duration_total_minutes':30,'start':0,'end':len(text),'blocks':[{'type':'continuous','text':text,'start':0,'end':len(text),'fields':[{'field':'RPE','raw':'5'}]}]}]},'lm_proposals':{'interpretations':[{'quote':'RPE 5','source_start':start,'source_end':start+5,'session_index':0,'rpe_written':5,'rpe_suggestion':None,'scope':'block','explanation':'Mention littérale synthétique.'}]}}
     await r.fulfill(json={'id':q['id'],'result':result})
    await p.route('https://athlys-generative-irl.onrender.com/infer',infer)
    await navigate(p,'coach','training');await p.locator('[data-action="program-new"]:visible').first.click()
    await p.locator('[name="source_text"]').fill('Lundi : footing, durée totale 30 min, RPE 5.')
    await p.locator('[data-action="program-parse"]').click();await p.wait_for_timeout(500);assert await p.locator('#program-parse-preview .program-preview-session').count(),(await p.locator('#program-parse-preview').inner_text())+str(requests)
    assert len(requests)==1 and requests[0]['task']=='program_parse'
    assert not any(key in requests[0]for key in ['athlete','history','logs'])
    await p.locator('[data-action="program-accept-lm-rpe"]').first.click();assert await p.locator('[data-program-edit="planned_rpe"]').first.input_value()=='5'
    await p.locator('.program-preview-session details summary').first.click();date=p.locator('[data-program-edit="planned_date"]').first;await date.fill('2026-12-20');await date.dispatch_event('change');assert await date.input_value()=='2026-12-20'
    assert await p.evaluate('window.__auditMutations.length')==0
    assert not errors,errors
    await p.screenshot(path=str(OUT/'coach-external-program-preview.png'))
    return 'réponse LM simulée, cible acceptée explicitement, date conservée, aucune écriture ni inférence distante réelle'
   finally:await ctx.close()
  await check('external-program-preview-coach-review',lm_program)
  await browser.close()
 print(json.dumps({'cases':len(results),'pass':sum(r['status']=='PASS'for r in results),'fail':[r for r in results if r['status']=='FAIL']},ensure_ascii=False))
 if any(r['status']=='FAIL'for r in results):raise SystemExit(1)
if __name__=='__main__':asyncio.run(main())

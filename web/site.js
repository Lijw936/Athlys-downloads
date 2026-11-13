(()=>{"use strict";
const button=document.querySelector('[data-menu-open]');
const drawer=document.querySelector('.drawer');
const scrim=document.querySelector('.drawer-scrim');
const close=document.querySelector('[data-menu-close]');
let lastFocus=null,previousOverflow="";
function setOpen(open){
 if(!drawer||!button)return;
 const wasOpen=drawer.classList.contains('open');
 if(open===wasOpen)return;
 if(open){lastFocus=document.activeElement;previousOverflow=document.body.style.overflow;}
 drawer.classList.toggle('open',open);
 scrim?.classList.toggle('open',open);
 drawer.inert=!open;
 drawer.setAttribute('aria-hidden',String(!open));
 if(scrim)scrim.setAttribute('aria-hidden','true');
 document.body.style.overflow=open?'hidden':previousOverflow;
 button.setAttribute('aria-expanded',String(open));
 if(open)close?.focus();
 else if(wasOpen){(lastFocus instanceof HTMLElement?lastFocus:button).focus();lastFocus=null;}
}
if(drawer){drawer.inert=true;drawer.setAttribute('aria-hidden','true');}
if(scrim)scrim.setAttribute('aria-hidden','true');
button?.addEventListener('click',()=>setOpen(true));
close?.addEventListener('click',()=>setOpen(false));
scrim?.addEventListener('click',()=>setOpen(false));
document.addEventListener('keydown',e=>{
 if(!drawer?.classList.contains('open'))return;
 if(e.key==='Escape'){e.preventDefault();setOpen(false);return;}
 if(e.key!=='Tab')return;
 const items=[...drawer.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hasAttribute('disabled')&&el.getAttribute('aria-hidden')!=='true');
 if(!items.length){e.preventDefault();close?.focus();return;}
 const first=items[0],last=items[items.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
drawer?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
const form=document.querySelector('[data-contact-form]');form?.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);const subject=encodeURIComponent('[Athlys] '+data.get('subject'));const body=encodeURIComponent('Nom : '+data.get('name')+'\\nAdresse e-mail : '+data.get('email')+'\\n\\n'+data.get('message'));window.location.href='mailto:adiceam.lilian@gmail.com?subject='+subject+'&body='+body;});
const progress=document.createElement('div');progress.className='scroll-progress';progress.innerHTML='<span></span>';document.body.prepend(progress);const fill=progress.firstElementChild;let ticking=false;function updateScroll(){const max=document.documentElement.scrollHeight-innerHeight;fill.style.width=(max>0?Math.min(100,scrollY/max*100):0)+'%';document.querySelector('.site-header')?.classList.toggle('scrolled',scrollY>12);ticking=false}addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(updateScroll);ticking=true}},{passive:true});updateScroll();
const revealTargets=[...document.querySelectorAll('.page-hero-inner,.page-section-inner,.section-head,.intro-grid,.role-card,.feature-card,.sport-tile,.principle,.cta-band,.download-card,.contact-card,.step,.feature-explorer,.explorer-tile,.club-plan-card,.club-plan-row,.club-cta')];revealTargets.forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--reveal-delay',Math.min(i%6,5)*75+'ms')});if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.1,rootMargin:'0px 0px -28px 0px'});revealTargets.forEach(el=>observer.observe(el))}else revealTargets.forEach(el=>el.classList.add('is-visible'));
const motionOK=!matchMedia('(prefers-reduced-motion: reduce)').matches;
if(motionOK&&matchMedia('(pointer:fine)').matches){document.querySelectorAll('.role-card,.feature-card,.sport-tile,.explorer-tile,.download-card,.contact-card,.step,.club-plan-card').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;card.style.setProperty('--pointer-x',x*100+'%');card.style.setProperty('--pointer-y',y*100+'%');card.style.setProperty('--tilt-x',(0.5-y)*4+'deg');card.style.setProperty('--tilt-y',(x-0.5)*5+'deg')});card.addEventListener('pointerleave',()=>{card.style.setProperty('--tilt-x','0deg');card.style.setProperty('--tilt-y','0deg')})})}
if(motionOK){const hero=document.querySelector('.hero-art');if(hero){let frame=false;addEventListener('scroll',()=>{if(frame)return;frame=true;requestAnimationFrame(()=>{const y=Math.max(-18,Math.min(18,scrollY*.035));hero.style.setProperty('--hero-shift',y+'px');frame=false})},{passive:true})}}
const explorer=document.querySelector('[data-explorer]');if(explorer){const content={
planifier:{title:'Un programme clair, du collectif à l’individuel.',copy:'Le coach construit les cycles, organise les semaines et attribue les séances. L’athlète retrouve ses rendez-vous et sait quoi faire, quand le faire.',points:['Construire le calendrier et les cycles','Attribuer des séances par groupe ou par athlète','Visualiser les prochains entraînements'],bars:[36,62,48,86,68,95,55],metric:'SEMAINE ORGANISÉE',value:'07 jours',note:'Un cap partagé, chaque jour'},
suivre:{title:'Lire la progression, pas seulement les chiffres.',copy:'Chaque séance alimente un historique structuré. Volume, durée, intensité, charge et résultats se replacent dans le contexte de l’entraînement.',points:['Consigner durée, volume et RPE','Calculer la charge sRPE et suivre son évolution','Mettre en regard résultats, objectifs et régularité'],bars:[52,43,72,61,92,75,84],metric:'JOURNAL D’ENTRAÎNEMENT',value:'Une vue d’ensemble',note:'Des données pour mieux comprendre'},
ressentir:{title:'Donner une place à ce que l’athlète ressent.',copy:'Forme, énergie, stress, bien-être ou douleur : l’athlète peut partager ses sensations. Ces repères complètent les données d’entraînement et nourrissent le dialogue.',points:['Renseigner les sensations du jour','Suivre forme, stress et récupération','Choisir les informations partagées avec le coach'],bars:[82,68,42,74,55,88,63],metric:'POINT DE VUE ATHLÈTE',value:'Chaque jour',note:'Le ressenti complète la mesure'},
echanger:{title:'Garder le dialogue au cœur du suivi.',copy:'Messagerie, questionnaires et vidéos techniques facilitent les retours entre deux séances. Les informations utiles restent accessibles au bon endroit.',points:['Dialoguer entre coach et athlète','Envoyer des questionnaires ciblés','Partager des vidéos techniques privées'],bars:[45,78,60,88,48,72,95],metric:'ESPACE DE COMMUNICATION',value:'Un lien continu',note:'Les bonnes informations, au bon moment'},
};const tabs=[...explorer.querySelectorAll('[data-explorer-tab]')];const title=explorer.querySelector('[data-explorer-title]'),copy=explorer.querySelector('[data-explorer-copy]'),points=explorer.querySelector('[data-explorer-points]'),visual=explorer.querySelector('.explorer-visual'),panel=explorer.querySelector('[role=tabpanel]');function select(key){const item=content[key];if(!item)return;tabs.forEach(tab=>{const active=tab.dataset.explorerTab===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.classList.toggle('is-active',active)});panel.classList.remove('panel-changing');void panel.offsetWidth;panel.classList.add('panel-changing');title.textContent=item.title;copy.textContent=item.copy;points.innerHTML=item.points.map(p=>'<div class="explorer-point"></div>').join('');[...points.children].forEach((el,i)=>el.textContent=item.points[i]);[...visual.querySelectorAll(':scope > span')].forEach((bar,i)=>bar.style.setProperty('--h',item.bars[i]+'%'));let metric=visual.querySelector('.visual-caption');if(metric){metric.querySelector('small').textContent=item.metric;metric.querySelector('strong').textContent=item.value;metric.querySelector('span').textContent=item.note}panel.setAttribute('aria-labelledby','tab-'+key)}tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab.dataset.explorerTab));tab.addEventListener('keydown',e=>{if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[next].focus();select(tabs[next].dataset.explorerTab)}})});select('planifier');}

/* Titres façon typing : animation progressive, texte complet exposé aux lecteurs d'écran. */
const typingReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('main h1').forEach((heading,index)=>{
  const fullText=heading.textContent.replace(/\s+/g,' ').trim();
  heading.setAttribute('aria-label',fullText);
  const visual=document.createElement('span');
  visual.className='typing-visual';
  visual.setAttribute('aria-hidden','true');
  while(heading.firstChild) visual.appendChild(heading.firstChild);
  heading.appendChild(visual);
  if(typingReduced) return;
  const walker=document.createTreeWalker(visual,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  const originals=nodes.map(node=>node.textContent);
  nodes.forEach(node=>node.textContent='');
  const caret=document.createElement('span');caret.className='typing-caret';caret.setAttribute('aria-hidden','true');visual.appendChild(caret);
  let nodeIndex=0,charIndex=0;
  const typeNext=()=>{
    if(nodeIndex>=nodes.length){caret.remove();return}
    const source=originals[nodeIndex];
    nodes[nodeIndex].textContent+=source.charAt(charIndex++);
    if(charIndex>=source.length){nodeIndex++;charIndex=0}
    if(nodeIndex<nodes.length)window.setTimeout(typeNext,21);
    else window.setTimeout(()=>caret.remove(),520);
  };
  window.setTimeout(typeNext,240+index*130);
});
/* La page courante est indiquée sans multiplier les variantes de navigation. */
const currentPath=location.pathname.replace(/\/$/,'')||'/';
document.querySelectorAll('.site-nav a,.drawer nav a').forEach(link=>{
  const target=new URL(link.href,location.origin).pathname.replace(/\/$/,'')||'/';
  if(target===currentPath)link.setAttribute('aria-current','page');
});

})();
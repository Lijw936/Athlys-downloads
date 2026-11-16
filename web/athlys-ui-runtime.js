/* Shared navigation and keyboard behaviour. No account data is put in URLs. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AthlysUI=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function navigatorFor(options){
  var current=null,scope=null,replaying=false,depth=0;
  function allowed(value){return options.allowed().indexOf(value)>=0;}
  function read(){var value=new URL(location.href).searchParams.get('view');return allowed(value)?value:options.home;}
  function url(value){var next=new URL(location.href);next.searchParams.set('view',value);return next;}
  window.addEventListener('popstate',function(){if(!options.active())return;replaying=true;depth=Math.max(0,Number(history.state&&history.state.athlysDepth)||0);options.restore(read());replaying=false;});
  return {
   sync:function(value){
    var nextScope=options.scope();
    if(!options.active()){current=null;scope=null;depth=0;var clean=new URL(location.href);clean.searchParams.delete('view');history.replaceState(null,'',clean);return false;}
    if(current===null||scope!==nextScope){scope=nextScope;current=scope&&current!==null?options.home:read();depth=0;history.replaceState({athlysView:current,athlysDepth:0},'',url(current));options.set(current);return true;}
    if(!allowed(value)){value=options.home;options.set(value);}
    if(current===value)return false;
    current=value;
    if(!replaying){depth++;history.pushState({athlysView:value,athlysDepth:depth},'',url(value));}
    return true;
   },canGoBack:function(){return depth>0;}
  };
 }
 function enhance(root,options){
  options=options||{};
  // Bind visible labels to their controls, including dynamically rendered forms.
  root.querySelectorAll('label:not([for])').forEach(function(label,index){
   var control=label.querySelector('input,select,textarea')||(label.parentElement&&label.parentElement.querySelector('input,select,textarea'));
   if(!control)return;if(!control.id)control.id='athlys-field-'+index;label.htmlFor=control.id;
  });
  root.querySelectorAll('.table-wrap,.athlys-cohort-table').forEach(function(el){el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label','Tableau défilant horizontalement');});
  root.querySelectorAll('[data-nav],[data-view]').forEach(function(button){if((button.dataset.nav||button.dataset.view)===new URL(location.href).searchParams.get('view'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  var dialog=root.querySelector('.modal-backdrop .modal,[data-modal] .modal');
  var page=root.querySelector('main,.main,#page');
  if(page){page.id=page.id||'athlys-main';page.tabIndex=-1;}
  if(!root.querySelector('.skip-link')&&page){var skip=document.createElement('a');skip.className='skip-link';skip.href='#'+page.id;skip.textContent='Aller au contenu';root.prepend(skip);}
  if(dialog){dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;var title=dialog.querySelector('h2');if(title){title.id='athlys-dialog-title';dialog.setAttribute('aria-labelledby',title.id);}}
  root.querySelectorAll('.layout,.topbar,.mobile-nav,.assistant,.app-shell,.club-shell').forEach(function(el){el.inert=!!dialog&&!el.contains(dialog);});
  document.body.classList.toggle('athlys-dialog-open',!!dialog);
  var key=dialog&&(dialog.getAttribute('aria-labelledby')+':'+dialog.querySelector('h2')?.textContent);
  if(key&&key!==root.__dialogKey){var first=dialog.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button');(first||dialog).focus({preventScroll:true});}
  if(!key&&root.__dialogKey){var restore=root.__dialogTrigger&&root.querySelector(root.__dialogTrigger);if(restore)restore.focus({preventScroll:true});}
  root.__dialogKey=key;
  if(options.changed&&!dialog){window.scrollTo(0,0);if(page)page.scrollTop=0;var content=root.querySelector('main h1,.main h1,#page h1');if(content){content.tabIndex=-1;content.focus({preventScroll:true});}}
 }
 function keyboard(root,event,close){
  var dialog=root.querySelector('[role="dialog"]');
  if(event.key==='Escape'){if(close())event.preventDefault();return;}
  if(!dialog||event.key!=='Tab')return;
  var items=Array.from(dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')).filter(function(el){return !el.disabled&&el.getClientRects().length;});
  var first=items[0],last=items[items.length-1];if(!first){event.preventDefault();dialog.focus();return;}
  if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();}
 }
 return {navigatorFor:navigatorFor,enhance:enhance,keyboard:keyboard};
});

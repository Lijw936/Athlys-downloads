(function(){
 "use strict";
 var DB="athlys-local-v1",VERSION=1;
 function open(){return new Promise(function(resolve,reject){
  if(!("indexedDB" in window)){reject(new Error("IndexedDB indisponible"));return}
  var req=indexedDB.open(DB,VERSION);
  req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains("snapshots"))d.createObjectStore("snapshots",{keyPath:"userId"});if(!d.objectStoreNames.contains("queue")){var s=d.createObjectStore("queue",{keyPath:"id"});s.createIndex("userId","userId",{unique:false})}};
  req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error||new Error("Stockage local indisponible"))};
 })}
 function run(name,mode,action){return open().then(function(db){return new Promise(function(resolve,reject){var tx=db.transaction(name,mode),r=action(tx.objectStore(name));r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error)};tx.oncomplete=function(){db.close()};tx.onerror=function(){db.close();reject(tx.error)}})})}
 function copy(x){return JSON.parse(JSON.stringify(x))}
 window.AthlysOfflineStore={
  saveSnapshot:function(userId,profile,data){return run("snapshots","readwrite",function(s){return s.put({userId:userId,profile:copy(profile),data:copy(data),savedAt:new Date().toISOString()})})},
  loadSnapshot:function(userId){return run("snapshots","readonly",function(s){return s.get(userId)})},
  enqueue:function(userId,table,payload){var id=payload.id||((window.crypto&&crypto.randomUUID)?crypto.randomUUID():"offline-"+Date.now()+"-"+Math.random().toString(16).slice(2));var item={id:id,userId:userId,table:table,payload:copy(Object.assign({},payload,{id:id})),createdAt:new Date().toISOString()};return run("queue","readwrite",function(s){return s.put(item)}).then(function(){return item})},
  list:function(userId){return open().then(function(db){return new Promise(function(resolve,reject){var tx=db.transaction("queue","readonly"),r=tx.objectStore("queue").index("userId").getAll(userId);r.onsuccess=function(){resolve((r.result||[]).sort(function(a,b){return a.createdAt.localeCompare(b.createdAt)}))};r.onerror=function(){reject(r.error)};tx.oncomplete=function(){db.close()}})})},
  remove:function(id){return run("queue","readwrite",function(s){return s.delete(id)})},
  count:function(userId){return this.list(userId).then(function(a){return a.length})}
 };
})();
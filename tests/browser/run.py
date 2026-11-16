"""Run the isolated visual gate against a local HTTP server, then stop it."""
import os,socket,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
s=socket.socket();s.bind(('127.0.0.1',0));port=s.getsockname()[1];s.close()
env={**os.environ,'ATHLYS_AUDIT_URL':f'http://127.0.0.1:{port}','AUDIT_IRL':'1','AUDIT_OUTPUT':'audit-evidence/final','AXE_PATH':str(ROOT/'tests/browser/node_modules/axe-core/axe.min.js')}
with open(ROOT/'audit-evidence-http.log','w')as log:
 p=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1','--directory',str(ROOT/'web')],stdout=log,stderr=log)
 try:
  time.sleep(.3)
  for name in ['journeys.py','platforms.py','audit.py']:subprocess.run([sys.executable,str(ROOT/'tests/browser'/name)],cwd=ROOT,env=env,check=True)
  subprocess.run([sys.executable,str(ROOT/'tests/browser/audit.py')],cwd=ROOT,env={**env,'AUDIT_THEME':'light','AUDIT_OUTPUT':'audit-evidence/light'},check=True)
 finally:p.terminate();p.wait(timeout=5)

"""Use the production IRL config transformation in a temporary directory."""
from pathlib import Path
import shutil,subprocess,tempfile
ROOT=Path(__file__).resolve().parents[2]
def irl_config():
 with tempfile.TemporaryDirectory(prefix='athlys-ui-config-')as tmp:
  root=Path(tmp);(root/'scripts').mkdir();(root/'web').mkdir();shutil.copy2(ROOT/'scripts/prepare-irl-build.py',root/'scripts/prepare-irl-build.py');shutil.copy2(ROOT/'web/app-config.js',root/'web/app-config.js')
  subprocess.run(['python',str(root/'scripts/prepare-irl-build.py'),'--platform','web','--external-endpoint','https://athlys-generative-irl.onrender.com/infer'],check=True,capture_output=True)
  return (root/'web/app-config.js').read_text()

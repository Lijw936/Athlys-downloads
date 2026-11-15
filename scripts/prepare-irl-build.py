#!/usr/bin/env python3
"""Prepare an isolated IRL trial bundle; never invent remote configuration."""
from pathlib import Path
import argparse,re
p=argparse.ArgumentParser();p.add_argument('--platform',choices=['web','windows','android'],required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1]
config=root/'web/app-config.js';s=config.read_text();s,n=re.subn(r'externalRtcEnabled:\s*(?:true|false)','externalRtcEnabled: true',s)
if n!=1 or 'externalRtcGatewayConfigured: false'not in s:raise SystemExit('Explicit unconfigured external gateway required')
config.write_text(s)
if a.platform=='android':
 gradle=root/'android/app/build.gradle';s=gradle.read_text();s=re.sub(r'(?m)^(\s*versionCode\s+)\d+',r'\g<1>13',s,count=1);s=re.sub(r'''(?m)^(\s*versionName\s+)["'][^"']+["']''',r'\g<1>"1.3.9-irl"',s,count=1)
 if re.search(r'applicationIdSuffix\s+["\'][^"\']+["\']',s):s=re.sub(r'applicationIdSuffix\s+["\'][^"\']+["\']','applicationIdSuffix ".irl"',s,count=1)
 else:s,n=re.subn(r'(buildTypes\s*\{)',r'\1\n        debug { applicationIdSuffix ".irl" }',s,count=1)
 gradle.write_text(s);strings=root/'android/app/src/main/res/values/strings.xml';strings.write_text(re.sub(r'(<string name="app_name">)[^<]*(</string>)',r'\1Athlys IRL\2',strings.read_text()))
 import shutil
 shutil.copy2(root/'web/mobile.html',root/'web/index.html')
print('IRL variant prepared; external LM stays unavailable until gateway + host + TURN are verified.')

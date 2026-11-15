#!/usr/bin/env python3
"""Prepare an isolated IRL build. Only configure the verified free HTTPS reference service."""
from pathlib import Path
from urllib.parse import urlparse
import argparse,re,json,shutil
p=argparse.ArgumentParser();p.add_argument('--platform',choices=['web','windows','android'],required=True);p.add_argument('--external-endpoint');a=p.parse_args();root=Path(__file__).resolve().parents[1]
config=root/'web/app-config.js';s=config.read_text()
def setting(name,value):
 global s
 pattern=rf'(?m)(\s*{re.escape(name)}:\s*)(?:"[^"\n]*"|true|false|\[[^\]\n]*\])'
 s,n=re.subn(pattern,lambda m:m[1]+json.dumps(value),s)
 if n!=1:raise SystemExit('Missing or ambiguous public config field: '+name)
setting('externalRtcEnabled',True)
if a.external_endpoint:
 endpoint=urlparse(a.external_endpoint)
 if endpoint.scheme!='https' or endpoint.netloc not in ['athlys-external-irl.onrender.com','athlys-generative-irl.onrender.com'] or endpoint.path!='/infer' or endpoint.query or endpoint.fragment:raise SystemExit('Only the verified free IRL endpoint may be packaged')
 setting('externalRtcGatewayConfigured',True);setting('externalRtcAuthorizationUrl',a.external_endpoint);setting('externalRtcAuthorizationOrigins',['https://athlys-external-irl.onrender.com','https://athlys-generative-irl.onrender.com']);setting('externalTransport','https');setting('externalGenerativeEnabled',endpoint.netloc=='athlys-generative-irl.onrender.com');setting('externalHttpsFallbackUrl','https://athlys-external-irl.onrender.com/infer')
elif 'externalRtcGatewayConfigured: false' not in s:raise SystemExit('No endpoint: gateway must be explicitly unconfigured')
config.write_text(s)
if a.platform=='android':
 gradle=root/'android/app/build.gradle';s=gradle.read_text();s,n=re.subn(r'(?m)^(\s*versionCode\s+)\d+',r'\g<1>15',s,count=1)
 if n!=1:raise SystemExit('Android versionCode not found')
 s,n=re.subn(r'''(?m)^(\s*versionName\s+)["'][^"']+["']''',r'\g<1>"1.3.11-irl"',s,count=1)
 if n!=1:raise SystemExit('Android versionName not found')
 if re.search(r'applicationIdSuffix\s+["\'][^"\']+["\']',s):s=re.sub(r'applicationIdSuffix\s+["\'][^"\']+["\']','applicationIdSuffix ".irl.lm"',s,count=1)
 else:
  s,n=re.subn(r'(buildTypes\s*\{)',r'\1\n        debug { applicationIdSuffix ".irl.lm" }',s,count=1)
  if n!=1:raise SystemExit('Android buildTypes not found')
 gradle.write_text(s);strings=root/'android/app/src/main/res/values/strings.xml';strings.write_text(re.sub(r'(<string name="app_name">)[^<]*(</string>)',r'\1Athlys LM IRL\2',strings.read_text()));shutil.copy2(root/'web/mobile.html',root/'web/index.html')
print('IRL prepared: external generative LM with source/number checks and reference fallback.' if a.external_endpoint else 'IRL prepared: external gateway unconfigured.')

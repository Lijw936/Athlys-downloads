import {createHash} from 'node:crypto';import {createWriteStream} from 'node:fs';import {mkdir,readFile,rename,rm} from 'node:fs/promises';import {Readable,Transform} from 'node:stream';import {pipeline} from 'node:stream/promises';import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {MODEL} from './contracts.mjs';
export async function downloadVerified(url,destination,expected,bytes){
 try{const b=await readFile(destination);if(b.length===bytes&&createHash('sha256').update(b).digest('hex')===expected)return;}catch{}
 await mkdir(path.dirname(destination),{recursive:true});const temp=destination+'.partial';
 const response=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!response.ok||!response.body)throw Error('ARTIFACT_DOWNLOAD_FAILED');
 const hash=createHash('sha256');let count=0;const check=new Transform({transform(chunk,encoding,done){count+=chunk.length;if(count>bytes)return done(Error('ARTIFACT_SIZE'));hash.update(chunk);done(null,chunk);}});
 try{await pipeline(Readable.fromWeb(response.body),check,createWriteStream(temp,{mode:0o600}));if(count!==bytes||hash.digest('hex')!==expected)throw Error('ARTIFACT_INTEGRITY');await rename(temp,destination);}catch(e){await rm(temp,{force:true});throw e;}
}
export async function prepare(root=process.cwd()){
 const archive=path.join(root,'.athlys-runtime/llama.tar.gz');
 await downloadVerified('https://github.com/ggml-org/llama.cpp/releases/download/b12420/llama-b12420-bin-ubuntu-x64.tar.gz',archive,'68499631ccab30d2b8fc1ada8903e80e340be7516480d7ceb6f1571ef7412217',23373277);
 const unpack=spawnSync('tar',['-xzf',archive,'--no-same-owner','-C',path.dirname(archive)],{stdio:'ignore'});if(unpack.status!==0)throw Error('RUNTIME_UNPACK_FAILED');
 await downloadVerified('https://huggingface.co/'+MODEL.repository+'/resolve/'+MODEL.revision+'/'+MODEL.file,path.join(root,'.athlys-model/model.gguf'),MODEL.sha256,MODEL.bytes);
 console.log('Pinned public runtime and model verified. No user data downloaded.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))await prepare();

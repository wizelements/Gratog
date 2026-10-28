#!/usr/bin/env node
/* Sealed staging credential handoff, authorized manual dispatch only.
   GitHub runner cannot call Vercel and writes ciphertext only. */
import {createPublicKey,publicEncrypt,randomBytes,createCipheriv,constants} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const env=process.env;
const BRANCH=String(env.GITHUB_REF||'').replace(/^refs\/heads\//,'');
const APPROVED_BRANCHES=new Set(['feat/turso-completion-20261019','feat/turso-lemonade-certification-20261027']);
if(env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
  (!APPROVED_BRANCHES.has(BRANCH)||env.GITHUB_REF!=='refs/heads/'+BRANCH)||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !env.SQUARE_SANDBOX_ACCESS_TOKEN||
  (env.TURSO_STAGING_AUTH_TOKEN||'').length<24||
  !env.RECIPIENT_PUBLIC_KEY_B64)
  throw Error('ISOLATED_STAGING_HANDOFF_REFUSED');
const pem=Buffer.from(env.RECIPIENT_PUBLIC_KEY_B64,'base64').toString('utf8');
const pub=createPublicKey(pem);
if(pub.asymmetricKeyType!=='rsa'||(pub.asymmetricKeyDetails?.modulusLength||0)<3072)
  throw Error('STRONG_RSA_RECIPIENT_REQUIRED');
const key=randomBytes(32),iv=randomBytes(12);
const plaintext=Buffer.from(JSON.stringify({
  branch:BRANCH,sha:env.GITHUB_SHA,
  SQUARE_ACCESS_TOKEN:env.SQUARE_SANDBOX_ACCESS_TOKEN,
  TURSO_STAGING_AUTH_TOKEN:env.TURSO_STAGING_AUTH_TOKEN,
}),'utf8');
const cipher=createCipheriv('aes-256-gcm',key,iv);
const encrypted=Buffer.concat([cipher.update(plaintext),cipher.final()]);
const sealedKey=publicEncrypt({key:pub,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
const artifact={kind:'GRATOG_ISOLATED_SANDBOX_SEALED_HANDOFF_V1',
 branch:BRANCH,sha:env.GITHUB_SHA,alg:'RSA-OAEP-SHA256/AES-256-GCM',
 key:sealedKey.toString('base64'),iv:iv.toString('base64'),
 tag:cipher.getAuthTag().toString('base64'),payload:encrypted.toString('base64')};
mkdirSync('test-results',{recursive:true});
writeFileSync('test-results/integrated-preview-staging-sealed.json',JSON.stringify(artifact)+'\n',{mode:0o600});
plaintext.fill(0);key.fill(0);
console.log('SEALED_SANDBOX_HANDOFF_READY: ciphertext only; no provider writes');

'use strict';
(function(root){
 const subtle=globalThis.crypto.subtle,enc=new TextEncoder(),dec=new TextDecoder();
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const b64=a=>{let s='';for(const b of new Uint8Array(a))s+=String.fromCharCode(b);return btoa(s)};
 const hash=async text=>Array.from(new Uint8Array(await subtle.digest('SHA-256',enc.encode(text)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const publicOnly=j=>({kty:'RSA',e:j.e,n:j.n,alg:'RSA-OAEP-256',ext:true,key_ops:['encrypt']});
 async function keyId(j){if(j.kty!=='RSA'||typeof j.e!=='string'||typeof j.n!=='string'||bytes(j.n.replace(/-/g,'+').replace(/_/g,'/')).length<384)throw Error('3072bit以上のRSA公開鍵が必要です');return hash(JSON.stringify({e:j.e,kty:'RSA',n:j.n}))}
 const aad=e=>enc.encode(JSON.stringify({version:2,keyId:e.keyId,revision:e.revision,previous:e.previous}));
 async function encrypt(payload,jwk,revision,previous){
  if(['d','p','q','dp','dq','qi'].some(k=>Object.prototype.hasOwnProperty.call(jwk,k)))throw Error('秘密鍵は送信処理に渡さないでください');
  const id=await keyId(jwk),pub=await subtle.importKey('jwk',publicOnly(jwk),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const aes=await subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const e={version:2,algorithm:'RSA-OAEP-256+A256GCM',keyId:id,revision,previous};
  const iv=crypto.getRandomValues(new Uint8Array(12));
  e.iv=b64(iv);e.wrappedKey=b64(await subtle.encrypt({name:'RSA-OAEP'},pub,await subtle.exportKey('raw',aes)));
  e.ciphertext=b64(await subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(e)},aes,enc.encode(JSON.stringify(payload))));return e;
 }
 async function decrypt(e,jwk){
  if(e.version!==2||e.algorithm!=='RSA-OAEP-256+A256GCM'||e.keyId!==await keyId(jwk)||!Number.isSafeInteger(e.revision)||e.revision<1||!/^[a-f0-9]{64}$/.test(e.previous)&&e.previous!==null)throw Error('暗号化データの形式が不正です');
  if(bytes(e.iv).length!==12||e.ciphertext.length>8_000_000)throw Error('暗号化データの長さが不正です');
  const key=await subtle.importKey('jwk',jwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
  const raw=await subtle.decrypt({name:'RSA-OAEP'},key,bytes(e.wrappedKey));
  const aes=await subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);
  return JSON.parse(dec.decode(await subtle.decrypt({name:'AES-GCM',iv:bytes(e.iv),additionalData:aad(e)},aes,bytes(e.ciphertext))));
 }
 const api={hash,keyId,publicOnly,encrypt,decrypt};if(typeof module!=='undefined')module.exports=api;root.SalonCrypto=api;
})(typeof globalThis!=='undefined'?globalThis:this);

import { useEffect, useRef, useState } from 'react';
import type { ZodTypeAny } from 'zod';

/** This stores unfinished input only. Approved settings and execution state stay on the server. */
export function useFormRecovery<T>(key: string|null, value: T, dirty: boolean, schema: ZodTypeAny, restore: (input: T) => void) {
  const [notice,setNotice]=useState('');
  const latest=useRef({schema,restore});
  latest.current={schema,restore};
  const hydrating=useRef(false);
  const cleared=useRef<string|null>(null);
  const serialized=JSON.stringify(value);
  useEffect(()=>{
    hydrating.current=false;
    cleared.current=null;
    if(!key)return;
    try {
      const raw=localStorage.getItem(key);
      if(!raw)return;
      if(raw.length>200000)throw new Error('Input recovery is too large.');
      const parsed=latest.current.schema.safeParse(JSON.parse(raw));
      if(!parsed.success)throw new Error('Input recovery is not valid.');
      hydrating.current=true;
      latest.current.restore(parsed.data as T);
      setNotice('Restored unfinished input from this device. Review it against the latest saved version.');
    } catch {setNotice('Your unfinished input could not be restored. Saved workspace data is unchanged.');}
  },[key]);
  useEffect(()=>{
    if(hydrating.current){hydrating.current=false;return;}
    if(!key||cleared.current===serialized)return;
    try {if(dirty)localStorage.setItem(key,serialized);else localStorage.removeItem(key);}
    catch {setNotice('This unfinished input could not be protected on this device. Save before leaving this page.');}
  },[key,serialized,dirty]);
  return {notice,clear:()=>{cleared.current=serialized;if(key)try{localStorage.removeItem(key);}catch{setNotice('The local recovery copy could not be removed.');}}};
}

export const creationRecoveryKey=(workspaceId:string)=>`platypus.workspace-input.${workspaceId}.creation`;

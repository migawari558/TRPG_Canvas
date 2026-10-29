import { conflictCopy } from '../../electron/conflict-copy.mjs';

// Match desktop: load external changes only on open, compare the saved revision
// on write, and continue editing a conflict copy rather than replacing the text.
export async function synchronizeDraft(entry, { read, write, parse, canApply = () => true, mode = 'save' }, retries = 1) {
  if (!entry.uri) return { action: 'unlinked', entry };
  const localText = JSON.stringify(entry.doc);
  const localChanged = localText !== entry.baseText;
  if (mode === 'save' && !localChanged) return { action:'unchanged', entry };
  const remote = await read({ uri:entry.uri });
  if (!canApply()) return { action:'postponed', entry };
  const baseline = { ...entry, uri:remote.uri || entry.uri, name:remote.name || entry.name, provider:remote.provider || entry.provider, hash:remote.hash, checkedAt:new Date().toISOString() };
  if (!localChanged) { const doc=parse(remote.text);return {action:'pulled',entry:{...baseline,doc,baseText:JSON.stringify(doc)}}; }
  if (remote.hash !== entry.hash) {
    const copy = conflictCopy(entry.doc);
    const backup = {key:copy.id,doc:copy,conflictOf:entry.key};
    let original;
    try{const doc=parse(remote.text);original={...baseline,doc,baseText:JSON.stringify(doc)};}catch{/* An unreadable original must still not prevent a conflict backup. */}
    return {action:'conflict',entry:backup,copy:backup,original};
  }
  try {
    const result=await write({uri:entry.uri,hash:entry.hash,text:JSON.stringify(entry.doc,null,2)});
    return {action:'pushed',entry:{...entry,...result,baseText:localText,fileSavedAt:new Date().toISOString()}};
  } catch(error) {
    if(error.code==='CONFLICT' && retries>0) return synchronizeDraft(entry,{read,write,parse,canApply,mode},retries-1);
    throw error;
  }
}

import { conflictCopy } from '../../electron/conflict-copy.mjs';

// The document provider's revision is checked again by the native writer.
// Keep this independent of React so races/offline/conflicts can be tested.
export async function synchronizeDraft(entry, { read, write, parse, canApply = () => true }, retries = 1) {
  if (!entry.uri) return { action: 'unlinked', entry };
  const remote = await read({ uri: entry.uri });
  const doc = parse(remote.text);
  if (!canApply()) return { action: 'postponed', entry };
  if(remote.hash!==entry.hash && entry.supersededHashes?.includes(remote.hash)) return {action:'postponed',entry};
  const localText = JSON.stringify(entry.doc), remoteText = JSON.stringify(doc);
  const localChanged = localText !== entry.baseText;
  const remoteChanged = remote.hash !== entry.hash;
  const baseline = { ...entry, uri:remote.uri || entry.uri, name:remote.name || entry.name, provider:remote.provider || entry.provider, hash:remote.hash, baseText:remoteText, checkedAt:new Date().toISOString() };
  if (localText === remoteText || (!localChanged && !remoteChanged)) return { action:'unchanged', entry:baseline };
  if (!localChanged) return { action:'pulled', entry:{ ...baseline, doc } };
  if (remoteChanged) {
    const copy = conflictCopy(entry.doc);
    return { action:'conflict', entry:{ ...baseline, doc }, copy:{ key:copy.id, doc:copy, conflictOf:entry.key } };
  }
  try {
    const result = await write({ uri:entry.uri, hash:remote.hash, text:JSON.stringify(entry.doc,null,2) });
    return { action:'pushed', entry:{ ...entry, ...result, baseText:localText, supersededHashes:[...new Set([...(entry.supersededHashes||[]),remote.hash])].slice(-8), fileSavedAt:new Date().toISOString(), checkedAt:new Date().toISOString() } };
  } catch(error) {
    if(error.code==='CONFLICT' && retries>0) return synchronizeDraft(entry,{read,write,parse,canApply},retries-1);
    throw error;
  }
}

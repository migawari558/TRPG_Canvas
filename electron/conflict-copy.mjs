export function conflictCopy(doc, id = globalThis.crypto.randomUUID()) {
  return { ...doc, id, title: `${doc.title}（競合コピー）` };
}

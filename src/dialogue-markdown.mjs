const cleanSpeaker = value => String(value || '話者').replace(/[\r\n]+/g, ' ').trim().slice(0, 80) || '話者';

export function dialoguePlugin(md) {
  md.block.ruler.before('fence', 'dialogue_fence', (state, start, end, silent) => {
    const line = number => state.src.slice(state.bMarks[number] + state.tShift[number], state.eMarks[number]);
    const match = /^(\:{3,})dialogue(?:\s+(.+?))?\s*$/i.exec(line(start));
    if (!match || state.sCount[start] - state.blkIndent >= 4) return false;
    if (silent) return true;
    let stop = start + 1;
    while (stop < end && line(stop).trim() !== match[1]) stop++;
    const open = state.push('dialogue_open', 'section', 1);
    open.attrSet('data-dialogue', 'true'); open.attrSet('data-speaker', cleanSpeaker(match[2])); open.attrSet('class', 'dialogue');
    const speakerOpen = state.push('dialogue_speaker_open', 'div', 1); speakerOpen.attrSet('class', 'dialogue-speaker');
    const speaker = state.push('text', '', 0); speaker.content = cleanSpeaker(match[2]);
    state.push('dialogue_speaker_close', 'div', -1);
    const bodyOpen = state.push('dialogue_body_open', 'div', 1); bodyOpen.attrSet('class', 'dialogue-body');
    const oldParent = state.parentType; state.parentType = 'dialogue';
    state.md.block.tokenize(state, start + 1, stop); state.parentType = oldParent;
    state.push('dialogue_body_close', 'div', -1);
    state.push('dialogue_close', 'section', -1);
    state.line = Math.min(stop + 1, end); return true;
  }, { alt: ['paragraph', 'blockquote'] });
}

export function dialogueToMarkdown(speaker, content) {
  const body = String(content || '').trim();
  const fence = ':'.repeat(Math.max(3, ...[...body.matchAll(/^(:+)\s*$/gm)].map(match => match[1].length + 1)));
  return `\n\n${fence}dialogue ${cleanSpeaker(speaker)}\n${body}\n${fence}\n\n`;
}

export { cleanSpeaker };

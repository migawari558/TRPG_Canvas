import TurndownService from 'turndown';
import { taskItemToMarkdown } from './task-markdown.mjs';

const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
converter.addRule('strikethrough', { filter: ['s', 'del'], replacement: content => `~~${content}~~` });
converter.addRule('taskItem', { filter: node => node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem', replacement: taskItemToMarkdown });

export const serializeWritingNotes = editor => converter.turndown(editor.getHTML());

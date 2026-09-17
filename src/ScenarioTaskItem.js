import TaskItem from '@tiptap/extension-task-item';
import { InputRule } from '@tiptap/core';

export const ScenarioTaskItem = TaskItem.extend({
  addInputRules() {
    return [new InputRule({
      find: /^\s*(?:-\s)?\[([ xX])\]\s$/,
      handler: ({ state, range, match, chain }) => {
        const { $from } = state.selection;
        const parentItem = $from.depth >= 2 ? $from.node($from.depth - 1).type.name : null;
        const commands = chain().deleteRange(range);
        // "- " already becomes a normal bullet before the checkbox marker is typed.
        // Lift just this item, keeping its ordinary siblings as ordinary bullets.
        if (parentItem === 'listItem') commands.liftListItem('listItem');
        if (parentItem !== 'taskItem') commands.toggleTaskList();
        commands.updateAttributes('taskItem', { checked: match[1].toLowerCase() === 'x' }).run();
      }
    })];
  }
}).configure({ nested: true, HTMLAttributes: { 'data-type': 'taskItem' }, a11y: { checkboxLabel: node => `${node.textContent || '項目'}のチェック` } });

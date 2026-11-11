import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function MobileEditorToolbar({ controls, syntax, disabled }) {
  const toolbar = useRef(null);

  function closeMenus() {
    toolbar.current?.querySelectorAll('details[open]').forEach(menu => { menu.open = false; });
  }

  useEffect(() => {
    const dismiss = event => {
      if (!toolbar.current?.contains(event.target)) closeMenus();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  function button(index, showLabel = false) {
    const [Icon, label, action, active] = controls[index];
    return <button key={label} type="button" disabled={disabled} aria-label={label}
      aria-pressed={!!active} className={active ? 'active' : ''} title={`${label}\n記法: ${syntax[index]}`}
      onClick={() => { action(); closeMenus(); }}>
      <Icon size={18}/>{showLabel && <span>{label.replace(/（.*）/, '')}</span>}
    </button>;
  }

  function menu(label, indexes) {
    return <details className="mobile-format-menu" onToggle={event => {
      if (event.currentTarget.open) {
        toolbar.current.querySelectorAll('details[open]').forEach(other => {
          if (other !== event.currentTarget) other.open = false;
        });
      }
    }}>
      <summary>{label}<ChevronDown size={14}/></summary>
      <div className="mobile-format-options" role="group" aria-label={label}>
        {indexes.map(index => button(index, true))}
      </div>
    </details>;
  }

  return <div className="editor-toolbar mobile-editor-toolbar" ref={toolbar}
    role="toolbar" aria-label="本文の書式" onKeyDown={event => {
      if (event.key === 'Escape') {
        const open = toolbar.current.querySelector('details[open]');
        closeMenus();
        open?.querySelector('summary').focus();
      }
    }} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) closeMenus();
    }}>
    {button(0)}
    {menu('書式', [1, 2, 4, 5, 6, 7])}
    {menu('挿入', [8, 9, 10, 11, 12, 13, 14, 15, 16])}
    <span className="mobile-toolbar-spacer"/>
    {button(3)}{button(17)}{button(18)}
  </div>;
}

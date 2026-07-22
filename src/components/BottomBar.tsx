import React from 'react';
import type { SheetTab } from '../store/useStore';

interface Props { activeTab: SheetTab; onTabChange: (tab: SheetTab) => void; }

const items = [
  { id: 'components', label: 'Components', icon: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><rect x="3" y="3" width="14" height="14" rx="1.5"/><line x1="10" y1="3" x2="10" y2="17"/><circle cx="8" cy="10" r="0.7" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="0.7" fill="currentColor" stroke="none"/></svg> },
  { id: 'measure', label: 'Measure', icon: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><rect x="2" y="7" width="16" height="6" rx="1"/><line x1="6" y1="7" x2="6" y2="10"/><line x1="10" y1="7" x2="10" y2="10"/><line x1="14" y1="7" x2="14" y2="10"/></svg> },
  { id: 'materials', label: 'Materials', icon: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><circle cx="7" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="6.3" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="13" r="1" fill="currentColor" stroke="none"/></svg> },
  { id: 'fixtures', label: 'Fixtures', icon: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="5" y="3" width="10" height="14" rx="1"/><line x1="10" y1="6" x2="10" y2="10"/><circle cx="10" cy="13" r="1.5"/></svg> },
  { id: 'analysis', label: 'Analysis', icon: <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="4" y1="17" x2="4" y2="9"/><line x1="10" y1="17" x2="10" y2="4"/><line x1="16" y1="17" x2="16" y2="12"/></svg> },
];

export default function BottomBar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button key={item.id} className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(activeTab === item.id ? null : item.id as SheetTab)}>
          {item.icon}<span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

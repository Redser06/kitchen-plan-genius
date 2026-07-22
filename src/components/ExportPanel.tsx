import React from 'react';
import { useStore } from '../store/useStore';

export default function ExportPanel() {
  const showExportPanel = useStore((s) => s.showExportPanel);
  const setShowExportPanel = useStore((s) => s.setShowExportPanel);
  const shareLinkPublic = useStore((s) => s.shareLinkPublic);
  const setShareLinkPublic = useStore((s) => s.setShareLinkPublic);
  const linkCopied = useStore((s) => s.linkCopied);
  const setLinkCopied = useStore((s) => s.setLinkCopied);
  const collaborators = useStore((s) => s.collaborators);
  const inviteEmail = useStore((s) => s.inviteEmail);
  const setInviteEmail = useStore((s) => s.setInviteEmail);
  const inviteCollaborator = useStore((s) => s.inviteCollaborator);
  const removeCollaborator = useStore((s) => s.removeCollaborator);
  const setCollaboratorRole = useStore((s) => s.setCollaboratorRole);
  const history = useStore((s) => s.history);
  const historyIndex = useStore((s) => s.historyIndex);
  const restoreVersion = useStore((s) => s.restoreVersion);
  const design = useStore((s) => s.design);

  if (!showExportPanel) return null;

  const copyLink = () => { if (navigator.clipboard) navigator.clipboard.writeText('https://kitchenplan.app/d/8f2a91').catch(() => {}); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); };
  const exportJSON = () => { const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'kitchen-design.json'; a.click(); URL.revokeObjectURL(url); };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(43,36,32,0.35)', zIndex: 300, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setShowExportPanel(false)}>
      <div style={{ width: 380, height: '100%', background: 'var(--surface)', borderLeft: '1px solid var(--border)', overflowY: 'auto', padding: 24, animation: 'kp-panel-in 0.2s ease' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: 20, fontWeight: 600 }}>Export & Collaborate</h2>
          <button onClick={() => setShowExportPanel(false)} style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>
          </button>
        </div>

        {/* Export */}
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>Export</div>
        <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 8, width: '100%' }}>🖨 Print / save as PDF blueprint</button>
        <button onClick={exportJSON} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 24, width: '100%' }}>⬇ Export design data (JSON)</button>

        {/* Share link */}
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>Share link</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Anyone with the link can {shareLinkPublic ? 'view & edit' : 'view only'}</span>
          <button onClick={() => setShareLinkPublic(!shareLinkPublic)} style={{ width: 40, height: 22, borderRadius: 11, background: shareLinkPublic ? 'var(--accent)' : '#D8C9B3', position: 'relative', border: 'none' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', transform: shareLinkPublic ? 'translateX(18px)' : 'translateX(2px)', transition: 'transform 0.2s' }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          <input type="text" readOnly value="https://kitchenplan.app/d/8f2a91" style={{ flex: 1, fontSize: 12.5, padding: '9px 10px', background: '#fff', border: '1px solid var(--border)', borderRadius: 8 }} />
          <button onClick={copyLink} style={{ padding: '9px 14px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 12.5, fontWeight: 600 }}>{linkCopied ? 'Copied!' : 'Copy'}</button>
        </div>

        {/* Collaborators */}
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>Collaborators</div>
        {collaborators.map((c: any) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{c.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.email}</div>
            </div>
            <select value={c.role} onChange={(e) => setCollaboratorRole(c.id, e.target.value)} disabled={c.id === 1} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, width: 80 }}>
              <option value="Owner">Owner</option><option value="Editor">Editor</option><option value="Viewer">Viewer</option>
            </select>
            {c.id !== 1 && <button onClick={() => removeCollaborator(c.id)} style={{ color: 'var(--text-3)', fontSize: 16 }}>×</button>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 24 }}>
          <input type="text" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') inviteCollaborator(); }} placeholder="Invite by email…" style={{ flex: 1, fontSize: 13, padding: '9px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }} />
          <button onClick={inviteCollaborator} style={{ padding: '9px 16px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Invite</button>
        </div>

        {/* Version history */}
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>Version history</div>
        {history.map((h: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: i === historyIndex ? 600 : 400, color: i === historyIndex ? 'var(--accent)' : 'var(--text-2)' }}>Version {i + 1}{i === historyIndex ? ' (current)' : ''}</span>
            {i !== historyIndex && <button onClick={() => restoreVersion(i)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Restore</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

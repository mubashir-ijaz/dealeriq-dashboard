// src/components/CarDetailModal.js
// Shared popup for gallery views — click a car to see full details + image,
// with Prev/Next to browse through the rest of the filtered list without closing.
import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink, ImageOff } from 'lucide-react';

export default function CarDetailModal({ open, onClose, onPrev, onNext, hasPrev, hasNext, image, title, subtitle, badge, fields, link, accentColor }) {
  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!open) return null;

  const navBtn = side => ({
    position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)',
    width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
    background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, maxWidth: 860, width: '100%', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
              {subtitle && <div style={{ fontSize: 11.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{subtitle}</div>}
            </div>
            {badge}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 6, flexShrink: 0 }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          {/* Image + prev/next — full width, whole photo visible (no cropping) */}
          <div style={{ position: 'relative', width: '100%', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
            {image
              ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              : <ImageOff size={40} color="var(--text3)" />
            }
            {hasPrev && <button onClick={onPrev} style={navBtn('left')} title="Previous (←)"><ChevronLeft size={20} /></button>}
            {hasNext && <button onClick={onNext} style={navBtn('right')} title="Next (→)"><ChevronRight size={20} /></button>}
          </div>

          {/* Fields — scrolls independently below the image */}
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
              {fields.filter(([, v]) => v !== '' && v != null).map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', marginBottom: 3, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>
            {link && (
              <a href={link} target="_blank" rel="noreferrer"
                style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, color: accentColor || 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                Open Original <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

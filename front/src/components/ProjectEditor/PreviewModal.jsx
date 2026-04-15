import React from 'react';

const PreviewModal = ({ show, onClose, project }) => {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', backdropFilter: 'blur(5px)' }}>
      <div style={{ background: '#12161f', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '16px', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        
        {/* Header Preview */}
        <div style={{ position: 'sticky', top: 0, background: 'rgba(18, 22, 31, 0.95)', padding: '15px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, backdropFilter: 'blur(10px)' }}>
          <div style={{ color: '#0ce688', fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#0ce688', borderRadius: '50%', boxShadow: '0 0 10px #0ce688' }}></span>
            Mode Prévisualisation
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%' }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = '#a1a1aa'; }}
          >
            ×
          </button>
        </div>

        {/* Content Preview */}
        <div style={{ padding: '40px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '15px' }}>{project.title || 'Titre du projet'}</h1>
            <p style={{ fontSize: '18px', color: '#a1a1aa', maxWidth: '800px', margin: '0 auto' }}>{project.subtitle || 'Un sous-titre accrocheur pour présenter votre concept.'}</p>
          </div>

          <div style={{ display: 'flex', gap: '40px', marginBottom: '60px' }}>
            <div style={{ flex: 2 }}>
              <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {project.photoName ? (
                  <div style={{ color: '#0ce688' }}>[Image : {project.photoName}]</div>
                ) : (
                  <span style={{ color: '#a1a1aa' }}>Aucune image principale</span>
                )}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: '#0ce688', marginBottom: '5px' }}>0 DT</div>
                <div style={{ fontSize: '14px', color: '#a1a1aa' }}>engagés sur un objectif de {project.goal || '0'} DT</div>
              </div>
              
              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '0%', height: '100%', background: '#0ce688' }}></div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>0</div>
                  <div style={{ fontSize: '13px', color: '#a1a1aa' }}>contributeurs</div>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700 }}>{project.duration || '0'}</div>
                  <div style={{ fontSize: '13px', color: '#a1a1aa' }}>jours restants</div>
                </div>
              </div>

              <button style={{ background: '#0ce688', color: '#111', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '16px', fontWeight: 700, cursor: 'not-allowed', opacity: 0.5 }}>
                Soutenir ce projet
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

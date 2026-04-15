import React, { useEffect, useRef, useState } from 'react';

const BLOCK_TYPES = [
  { value: 'paragraph', label: 'Paragraphe' },
  { value: 'heading', label: 'Titre' },
  { value: 'subheading', label: 'Sous-titre' },
];

const createBlock = (type = 'paragraph', content = '') => ({
  id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  content,
});

const normalizeStory = (story) => {
  let parsed = story;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = null;
    }
  }

  const blocks = Array.isArray(parsed?.blocks) && parsed.blocks.length > 0
    ? parsed.blocks.map((block) => ({
        id: block?.id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: block?.type || 'paragraph',
        content: block?.content || '',
        fileName: block?.fileName || '',
      }))
    : [createBlock()];

  return {
    blocks,
    risks: typeof parsed?.risks === 'string' ? parsed.risks : '',
    faqs: Array.isArray(parsed?.faqs) ? parsed.faqs : [],
  };
};

const serializeStory = (story) => JSON.stringify({
  blocks: story.blocks,
  risks: story.risks,
  faqs: story.faqs,
});

const StoryTab = ({ draftProject, onSaveDraft }) => {
  const initialStory = normalizeStory(draftProject?.story);
  const [blocks, setBlocks] = useState(initialStory.blocks);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [showTypeMenu, setShowTypeMenu] = useState(null);
  const [risks, setRisks] = useState(initialStory.risks);
  const [faqs, setFaqs] = useState(initialStory.faqs);

  const fileInputRef = useRef(null);
  const imageBlockTarget = useRef(null);
  const lastStorySnapshotRef = useRef(serializeStory(initialStory));

  useEffect(() => {
    const nextStory = normalizeStory(draftProject?.story);
    const nextSnapshot = serializeStory(nextStory);

    if (nextSnapshot === lastStorySnapshotRef.current) {
      return;
    }

    lastStorySnapshotRef.current = nextSnapshot;
    setBlocks(nextStory.blocks);
    setRisks(nextStory.risks);
    setFaqs(nextStory.faqs);
  }, [draftProject?.story]);

  useEffect(() => {
    if (!onSaveDraft) {
      return;
    }

    const nextStory = { blocks, risks, faqs };
    const nextSnapshot = serializeStory(nextStory);

    if (nextSnapshot === lastStorySnapshotRef.current) {
      return;
    }

    lastStorySnapshotRef.current = nextSnapshot;
    onSaveDraft({ story: nextStory });
  }, [blocks, risks, faqs, onSaveDraft]);

  const updateBlock = (id, updates) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
  };

  const deleteBlock = (id) => {
    setBlocks((prev) => {
      const filtered = prev.filter((block) => block.id !== id);
      return filtered.length === 0 ? [createBlock()] : filtered;
    });
  };

  const addBlockAfter = (id, type = 'paragraph') => {
    setBlocks((prev) => {
      const idx = prev.findIndex((block) => block.id === id);
      const newBlock = createBlock(type);
      const updated = [...prev];
      updated.splice(idx + 1, 0, newBlock);
      setActiveBlockId(newBlock.id);
      return updated;
    });
  };

  const addBlockAtEnd = (type = 'paragraph') => {
    const newBlock = createBlock(type);
    setBlocks((prev) => [...prev, newBlock]);
    setActiveBlockId(newBlock.id);
  };

  const handleImageUpload = (blockId) => {
    imageBlockTarget.current = blockId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && imageBlockTarget.current) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const targetId = imageBlockTarget.current;
        setBlocks((prev) => {
          const idx = prev.findIndex((block) => block.id === targetId);
          const imgBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'image',
            content: ev.target?.result || '',
            fileName: file.name,
          };
          const updated = [...prev];
          updated.splice(idx + 1, 0, imgBlock);
          return updated;
        });
        imageBlockTarget.current = null;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const addVideoEmbed = (blockId) => {
    const url = prompt("Collez l'URL de la vidéo (YouTube, Vimeo, etc.) :");
    if (url && url.trim()) {
      setBlocks((prev) => {
        const idx = prev.findIndex((block) => block.id === blockId);
        const videoBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: 'video',
          content: url.trim(),
        };
        const updated = [...prev];
        updated.splice(idx + 1, 0, videoBlock);
        return updated;
      });
    }
  };

  const toggleList = (blockId) => {
    const block = blocks.find((item) => item.id === blockId);
    if (!block) return;
    updateBlock(blockId, { type: block.type === 'list' ? 'paragraph' : 'list' });
  };

  const getVideoEmbedUrl = (url) => {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    return url;
  };

  const handleKeyDown = (e, block) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'list') {
      e.preventDefault();
      addBlockAfter(block.id);
    }
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
    }
  };

  return (
    <>
      <div style={{ maxWidth: '800px', margin: '0 auto 30px auto', textAlign: 'left' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Histoire du projet</h1>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>
          Décrivez pourquoi vous levez des fonds, ce qui vous tient à cœur, comment vous comptez réaliser votre projet et qui vous êtes.
        </p>
      </div>

      <div className="story-info-banner">
        <div className="story-info-icon">i</div>
        <div style={{ flex: 1 }}>
          <strong>Bienvenue dans l'editeur d'histoire</strong>
          <span style={{ color: '#a1a1aa', marginLeft: '8px' }}>Utilisez la barre d'outils pour structurer votre contenu.</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="story-editor">
        {blocks.map((block) => (
          <div
            key={block.id}
            className={`story-block ${activeBlockId === block.id ? 'active' : ''}`}
            onClick={() => setActiveBlockId(block.id)}
          >
            {activeBlockId === block.id && block.type !== 'image' && block.type !== 'video' && (
              <div className="story-toolbar">
                <div className="story-toolbar-group">
                  <div className="story-type-selector">
                    <button
                      className="story-toolbar-btn story-type-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTypeMenu(showTypeMenu === block.id ? null : block.id);
                      }}
                    >
                      {BLOCK_TYPES.find((type) => type.value === block.type)?.label || 'Paragraphe'}
                      <span className="story-chevron">v</span>
                    </button>
                    {showTypeMenu === block.id && (
                      <div className="story-type-menu">
                        {BLOCK_TYPES.map((type) => (
                          <button
                            key={type.value}
                            className={`story-type-option ${block.type === type.value ? 'active' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateBlock(block.id, { type: type.value });
                              setShowTypeMenu(null);
                            }}
                          >
                            <span className={`story-type-preview ${type.value}`}>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="story-toolbar-divider" />

                <div className="story-toolbar-group">
                  <button className="story-toolbar-btn" title="Ajouter une image" onClick={(e) => { e.stopPropagation(); handleImageUpload(block.id); }}>
                    Img
                  </button>
                  <button className="story-toolbar-btn" title="Intégrer une vidéo" onClick={(e) => { e.stopPropagation(); addVideoEmbed(block.id); }}>
                    Vid
                  </button>
                  <button
                    className={`story-toolbar-btn ${block.type === 'list' ? 'active' : ''}`}
                    title="Liste à puces"
                    onClick={(e) => { e.stopPropagation(); toggleList(block.id); }}
                  >
                    List
                  </button>
                </div>

                <div className="story-toolbar-divider" />

                <button className="story-toolbar-btn story-delete-btn" title="Supprimer ce bloc" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>
                  Del
                </button>
              </div>
            )}

            {block.type === 'image' ? (
              <div className="story-image-block">
                <img src={block.content} alt={block.fileName || 'Image'} className="story-image" />
                <button className="story-image-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} title="Supprimer l'image">
                  x
                </button>
              </div>
            ) : block.type === 'video' ? (
              <div className="story-video-block">
                <iframe
                  src={getVideoEmbedUrl(block.content)}
                  title="Vidéo intégrée"
                  className="story-video-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button className="story-image-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} title="Supprimer la vidéo">
                  x
                </button>
              </div>
            ) : (
              <textarea
                className={`story-textarea story-${block.type}`}
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, block)}
                onFocus={() => setActiveBlockId(block.id)}
                placeholder={
                  block.type === 'heading'
                    ? 'Titre...'
                    : block.type === 'subheading'
                      ? 'Sous-titre...'
                      : block.type === 'list'
                        ? '- Element de liste...'
                        : "Commencez à écrire l'histoire du projet..."
                }
                rows={1}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
              />
            )}
          </div>
        ))}

        <div className="story-add-block">
          <button className="story-add-btn" onClick={() => addBlockAtEnd()} title="Ajouter un bloc">
            +
          </button>
        </div>
      </div>

      <div style={{ height: '40px' }}></div>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '50px' }} />

      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Risques et défis</h2>
          <p style={{ marginBottom: '15px' }}>Soyez honnête sur les risques et les défis potentiels de ce projet et sur la manière dont vous prévoyez de les surmonter.</p>
        </div>
        <div className="pe-split-right">
          <textarea
            className="pe-textarea pe-input"
            placeholder="Décrivez les risques, dépendances, délais ou contraintes à anticiper..."
            value={risks}
            onChange={(e) => setRisks(e.target.value)}
          ></textarea>
        </div>
      </div>

      <div className="pe-split-row">
        <div className="pe-split-left">
          <h2>Foire aux questions</h2>
          <p style={{ marginBottom: '15px' }}>Publiez des reponses aux questions frequemment posees.</p>
        </div>
        <div className="pe-split-right" style={{ background: 'transparent', border: 'none', padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {faqs.map((faq, index) => (
              <div key={`${faq.question}-${index}`} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '24px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <label className="pe-label">Question</label>
                  <input
                    type="text"
                    className="pe-input"
                    value={faq.question || ''}
                    onChange={(e) => {
                      const nextFaqs = [...faqs];
                      nextFaqs[index] = { ...nextFaqs[index], question: e.target.value };
                      setFaqs(nextFaqs);
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label className="pe-label">Réponse</label>
                  <textarea
                    className="pe-textarea pe-input"
                    style={{ minHeight: '100px', lineHeight: '1.5', padding: '12px 16px' }}
                    value={faq.answer || ''}
                    onChange={(e) => {
                      const nextFaqs = [...faqs];
                      nextFaqs[index] = { ...nextFaqs[index], answer: e.target.value };
                      setFaqs(nextFaqs);
                    }}
                  ></textarea>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button
                    className="pe-save-btn"
                    style={{ color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    onClick={() => setFaqs(faqs.filter((_, faqIndex) => faqIndex !== index))}
                  >
                    <span style={{ fontSize: '16px' }}>x</span> Supprimer
                  </button>
                </div>
              </div>
            ))}

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '30px', textAlign: 'center' }}>
              <button
                className="pe-new-item-btn"
                style={{ background: '#111', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 'none' }}
                onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
              >
                Ajouter une autre FAQ
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StoryTab;

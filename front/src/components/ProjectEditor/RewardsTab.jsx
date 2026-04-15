import React, { useEffect, useRef, useState } from 'react';

const API_URL = 'http://localhost:5000';

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url}`;
};

const RewardsTab = ({ draftProject, onSaveDraft }) => {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [items, setItems] = useState(Array.isArray(draftProject?.rewards) ? draftProject.rewards : []);
  const [itemTitle, setItemTitle] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');
  const [savingMsg, setSavingMsg] = useState('');
  const [savingError, setSavingError] = useState('');

  const imageInputRef = useRef(null);

  useEffect(() => {
    setItems(Array.isArray(draftProject?.rewards) ? draftProject.rewards : []);
  }, [draftProject?.rewards]);

  const resetRewardForm = () => {
    setItemTitle('');
    setItemPrice('');
    setItemDesc('');
    setItemImage('');
  };

  const syncWithServer = async (newItems) => {
    setSavingMsg('Sauvegarde en cours...');
    setSavingError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/campaigns/${draftProject.campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rewards: newItems }),
      });

      if (res.ok) {
        setSavingMsg('Enregistre');
        if (onSaveDraft) {
          onSaveDraft({ rewards: newItems });
        }
        setTimeout(() => setSavingMsg(''), 2000);
      } else {
        setSavingMsg('');
        setSavingError('Erreur de sauvegarde');
      }
    } catch {
      setSavingMsg('');
      setSavingError('Erreur réseau');
    }
  };

  const handleDeleteItem = (indexToDelete) => {
    const newItems = items.filter((_, idx) => idx !== indexToDelete);
    setItems(newItems);
    syncWithServer(newItems);
  };

  const handleRewardImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSavingError("L'image de la récompense est trop volumineuse (max 5 Mo).");
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setItemImage(loadEvent.target?.result || '');
      setSavingError('');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveItem = () => {
    if (!itemTitle.trim()) {
      return;
    }

    const newItems = [
      ...items,
      {
        title: itemTitle.trim(),
        price: itemPrice,
        desc: itemDesc.trim(),
        image: itemImage,
      },
    ];

    setItems(newItems);
    resetRewardForm();
    setIsAddingItem(false);
    syncWithServer(newItems);
  };

  return (
    <>
      <div style={{ maxWidth: '1100px', margin: '0 auto 60px auto', textAlign: 'left', position: 'relative' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>Récompenses</h1>
        <p style={{ color: '#a1a1aa' }}>Définissez ce que vous offrez à vos contributeurs en échange de leur soutien.</p>

        {savingMsg && (
          <div style={{ position: 'absolute', top: '10px', right: '0', background: 'rgba(5,206,120,0.1)', color: '#0ce688', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid rgba(5,206,120,0.3)' }}>
            {savingMsg}
          </div>
        )}
      </div>

      {savingError && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 20px auto', background: 'rgba(239,68,68,0.12)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.22)' }}>
          {savingError}
        </div>
      )}

      {!isAddingItem && (
        <div className="pe-rewards-intro" style={{ maxWidth: '1100px', margin: '0 auto 40px auto', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '50px 30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: '#d1d1d6', lineHeight: '1.7', fontSize: '16px', maxWidth: '800px', margin: '0 auto 35px auto' }}>
            L'ajout de récompenses aide les contributeurs à comparer facilement vos offres. Vous pouvez maintenant illustrer chaque récompense avec sa propre photo.
          </p>
          <button className="pe-new-item-btn" onClick={() => setIsAddingItem(true)}>
            <span style={{ fontSize: '22px', marginRight: '8px', fontWeight: 'bold' }}>+</span> Ajouter une récompense
          </button>
        </div>
      )}

      {items.length > 0 && !isAddingItem && (
        <div style={{ maxWidth: '1100px', margin: '0 auto 40px auto', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '20px', color: '#fff' }}>Vos récompenses sauvegardées ({items.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {items.map((item, idx) => {
              const rewardImage = item?.image || item?.image_url || '';

              return (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                  <button
                    onClick={() => handleDeleteItem(idx)}
                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(12,14,20,0.85)', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'color 0.2s', borderRadius: '999px', width: '32px', height: '32px' }}
                    title="Supprimer cette récompense"
                    onMouseOver={(e) => { e.target.style.color = '#ff7875'; }}
                    onMouseOut={(e) => { e.target.style.color = '#ff4d4f'; }}
                  >
                    x
                  </button>

                  {rewardImage && (
                    <img
                      src={resolveMediaUrl(rewardImage)}
                      alt={item.title || `Recompense ${idx + 1}`}
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '10px', marginBottom: '16px' }}
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingRight: '40px', gap: '12px', alignItems: 'flex-start' }}>
                    <strong style={{ fontSize: '18px', color: '#fff' }}>{item.title}</strong>
                    <span style={{ color: '#0ce688', fontWeight: '600', whiteSpace: 'nowrap' }}>{item.price ? `${item.price} TND` : 'Inclus'}</span>
                  </div>

                  {item.desc && <p style={{ color: '#a1a1aa', fontSize: '14px', lineHeight: '1.5', marginBottom: 0 }}>{item.desc}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isAddingItem && (
        <div className="pe-split-right" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
          <h2 style={{ marginBottom: '30px' }}>Créer une nouvelle récompense</h2>

          <div className="pe-form-row">
            <div className="pe-form-col">
              <label className="pe-label">Titre de la récompense</label>
              <input
                type="text"
                className="pe-input"
                placeholder="Ex: T-shirt exclusif Hive.tn"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
              />
            </div>
            <div className="pe-form-col">
              <label className="pe-label">Valeur estimee (TND)</label>
              <input
                type="number"
                className="pe-input"
                placeholder="Ex: 50"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label className="pe-label">Description (optionnelle)</label>
            <textarea
              className="pe-textarea pe-input"
              placeholder="Décrivez cette récompense en quelques mots..."
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label className="pe-label">Photo de la récompense (optionnelle)</label>
            <div className="pe-upload-box" style={{ padding: '22px' }}>
              <button className="pe-upload-btn" type="button" onClick={() => imageInputRef.current?.click()}>
                {itemImage ? "Remplacer la photo de la récompense" : 'Ajouter une photo'}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleRewardImageChange}
              />
              <div className="pe-upload-text">
                Formats acceptes : JPG, PNG, WEBP ou GIF. Taille maximale : 5 MB.
              </div>

              {itemImage && (
                <div style={{ marginTop: '18px' }}>
                  <img
                    src={itemImage}
                    alt="Aperçu de la récompense"
                    style={{ width: '100%', maxWidth: '320px', height: '200px', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                  />
                  <button
                    type="button"
                    className="pe-save-btn"
                    style={{ marginTop: '14px' }}
                    onClick={() => setItemImage('')}
                  >
                    Supprimer la photo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pe-reward-form-actions">
            <button
              className="cp-btn-next"
              style={{ width: 'auto', margin: 0 }}
              onClick={handleSaveItem}
              disabled={!itemTitle.trim()}
            >
              Sauvegarder la récompense
            </button>
            <button
              className="pe-save-btn"
              onClick={() => {
                setIsAddingItem(false);
                resetRewardForm();
                setSavingError('');
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RewardsTab;

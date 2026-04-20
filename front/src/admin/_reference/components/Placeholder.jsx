import React from 'react';

export default function Placeholder({ icon: Icon, title, description, items = [] }) {
  return (
    <div className="fade-in admin-placeholder">
      <div className="admin-placeholder__icon">
        <Icon size={28} strokeWidth={1.8} />
      </div>
      <div>
        <p className="admin-placeholder__eyebrow">Module en préparation</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {items.length > 0 && (
        <div className="admin-placeholder__grid">
          {items.map((item) => (
            <div className="admin-placeholder__item" key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

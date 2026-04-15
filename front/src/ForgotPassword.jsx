import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SignIn.css';

const ForgotPassword = ({ onSwitch }) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Hive.tn</h1>
          <h2 className="auth-title">Mot de passe oublié ?</h2>
          <p className="auth-subtitle">
            {isSubmitted 
              ? "Vérifiez votre boîte de réception pour les instructions de réinitialisation."
              : "Entrez votre adresse e-mail pour recevoir un lien de réinitialisation sécurisé."}
          </p>
        </div>

        {!isSubmitted ? (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input 
                type="email" 
                id="reset-email" 
                required 
                placeholder=" " 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="reset-email">Adresse Email</label>
            </div>
            
            <button type="submit" className="auth-button">
              <span>Envoyer le lien</span>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="btn-icon">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', margin: '20px 0', padding: '24px', backgroundColor: 'rgba(5, 206, 120, 0.05)', borderRadius: '12px', border: '1px solid rgba(5, 206, 120, 0.2)' }}>
            <svg style={{ width: '48px', height: '48px', color: '#05ce78', marginBottom: '16px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3 style={{ color: '#fff', fontSize: '18px', margin: '0 0 8px 0' }}>Email envoyé</h3>
            <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
              Nous avons envoyé un lien de réinitialisation à <strong style={{ color: '#05ce78' }}>{email}</strong>
            </p>
          </div>
        )}

        <div className="auth-footer">
          {isSubmitted ? "C'est bon ?" : "Je m'en souviens !"} <Link to="/login" className="auth-link">Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

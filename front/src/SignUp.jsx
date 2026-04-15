import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './SignUp.css';
import GoogleAuthButton from './components/Auth/GoogleAuthButton';

const API_URL = 'http://localhost:5000';

const SignUp = ({ onSwitch, onHome }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.fullname || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Tous les champs sont obligatoires.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    // API call
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullname,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Une erreur est survenue.');
        return;
      }

      setSuccess(data.message || 'Inscription réussie !');
      setFormData({ fullname: '', email: '', password: '', confirmPassword: '' });

      // Redirect to sign-in after a short delay
      setTimeout(() => {
        onSwitch();
      }, 1500);
    } catch (err) {
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo" style={{ cursor: 'pointer' }} onClick={onHome}>Hive.tn</h1>
          <h2 className="auth-title">Rejoignez la ruche</h2>
          <p className="auth-subtitle">Créez votre compte pour soutenir ou lancer des projets innovants.</p>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}
        {success && <div className="auth-message auth-success">{success}</div>}

        <GoogleAuthButton disabled={loading} label="Continuer avec Google" />
        <div className="auth-divider">ou</div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input type="text" id="fullname" required placeholder=" " value={formData.fullname} onChange={handleChange} />
            <label htmlFor="fullname">Nom complet</label>
          </div>
          <div className="input-group">
            <input type="email" id="email" required placeholder=" " value={formData.email} onChange={handleChange} />
            <label htmlFor="email">Adresse Email</label>
          </div>
          <div className="input-group">
            <input type={showPassword ? "text" : "password"} id="password" required placeholder=" " value={formData.password} onChange={handleChange} />
            <label htmlFor="password">Mot de passe</label>
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"></path></svg>
              )}
            </button>
          </div>
          <div className="input-group">
            <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" required placeholder=" " value={formData.confirmPassword} onChange={handleChange} />
            <label htmlFor="confirmPassword">Confirmez le mot de passe</label>
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword((current) => !current)}
              aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
              title={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
            >
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"></path></svg>
              )}
            </button>
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            <span>{loading ? 'Inscription en cours...' : 'Créer mon compte'}</span>
            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="btn-icon"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        </form>
        <div className="auth-footer">
          Déjà un compte ? <Link to="/login" className="auth-link">Connectez-vous</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

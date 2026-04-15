import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  FileText,
  Globe,
  LifeBuoy,
  Mail,
  MoveRight,
  Camera,
  BriefcaseBusiness,
  Send,
} from 'lucide-react';
import './Footer.css';

const trustItems = [
  { icon: BadgeCheck, label: 'Campagnes modérées' },
  { icon: Globe, label: 'Créateurs tunisiens' },
  { icon: FileText, label: 'Soumission gratuite' },
  { icon: LifeBuoy, label: 'Support de proximité' },
];

const footerColumns = [
  {
    title: 'Découverte',
    links: [
      { label: 'Explorer', to: '/discover#discover-results' },
      { label: 'Catégories', to: '/discover#discover-filters' },
      { label: 'Projets récents', to: '/#projets-recents' },
    ],
  },
  {
    title: 'Créateurs',
    links: [
      { label: 'Lancer un projet', to: '/start#start-hero' },
      { label: 'Guide du créateur', to: '/start#guide-createur' },
      { label: 'FAQ créateur', to: '/start#faq-createur' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Centre d’aide', to: '/support' },
      { label: 'Contact', to: '/support/new' },
      { label: 'Sécurité & confiance', to: '/start#securite-confiance' },
    ],
  },
  {
    title: 'Plateforme',
    links: [
      { label: 'À propos', to: '/about' },
      { label: 'Comment ça marche', to: '/#comment-ca-marche' },
      { label: 'Conditions générales', to: '/terms' },
    ],
  },
];

const socialLinks = [
  { label: 'Découvrir Hive.tn', to: '/discover#discover-results', icon: Send },
  { label: 'Guide du créateur', to: '/start#guide-createur', icon: Camera },
  { label: 'À propos de Hive.tn', to: '/about', icon: BriefcaseBusiness },
];

const legalLinks = [
  { label: 'Conditions générales', to: '/terms' },
  { label: 'Confidentialité', to: '/privacy' },
  { label: 'Cookies', to: '/cookies' },
];

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsSubscribed(true);
    setEmail('');
  };

  return (
    <div className="hive-footer-wrapper">
      <div className="hive-footer-trustbar" aria-label="Éléments de confiance">
        {trustItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="hive-footer-trustitem">
              <span className="hive-footer-trusticon">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      <footer className="hive-footer">
        <div className="hive-footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">Hive.tn</Link>
            <p className="footer-tagline">
              La plateforme tunisienne pour découvrir, soutenir et lancer des projets créatifs,
              culturels et entrepreneuriaux.
            </p>
            <div className="footer-socials">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.label} to={item.to} className="social-link" aria-label={item.label} title={item.label}>
                    <Icon size={16} strokeWidth={2} />
                  </Link>
                );
              })}
            </div>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} className="footer-nav-col" aria-label={column.title}>
              <h4 className="footer-col-title">{column.title}</h4>
              <ul className="footer-nav-list">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="footer-nav-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="footer-newsletter-panel">
          <div className="footer-newsletter-copy">
            <div className="footer-newsletter-kicker">Newsletter</div>
            <h3 className="footer-newsletter-title">Recevez les nouveaux projets en avant-première</h3>
            <p className="footer-newsletter-subtitle">
              Pas de spam. Seulement les nouveautés importantes de Hive.tn.
            </p>
          </div>

          <form className="footer-newsletter-form" onSubmit={handleNewsletterSubmit}>
            <label className="footer-newsletter-inputwrap">
              <Mail size={16} strokeWidth={2} />
              <input
                type="email"
                placeholder="Votre adresse email"
                className="newsletter-input"
                required
                aria-label="Email pour la newsletter"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (isSubscribed) setIsSubscribed(false);
                }}
              />
            </label>
            <button type="submit" className="newsletter-submit">
              <span>S'abonner</span>
              <MoveRight size={15} strokeWidth={2.2} />
            </button>
          </form>
          {isSubscribed && (
            <div className="footer-newsletter-success">
              Merci, votre intérêt pour la newsletter Hive.tn a bien été pris en compte.
            </div>
          )}
        </div>

        <div className="hive-footer-bottom">
          <div className="footer-bottom-copy">
            <div className="footer-copyright">© 2026 Hive.tn</div>
            <div className="footer-bottom-note">Plateforme tunisienne de découverte et de lancement de projets</div>
          </div>

          <div className="footer-legal-links">
            {legalLinks.map((link) => (
              <Link key={link.label} to={link.to} className="footer-legal-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;

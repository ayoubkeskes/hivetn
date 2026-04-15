import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Home.css';

const API_URL = 'http://localhost:5000';

const Navbar = ({ onNavigate, isAuthenticated, onLogout, activeTab }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = storedUser.name || 'Utilisateur';
  const userEmail = storedUser.email || '';
  const userInitials = userName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok || !data.success || !isMounted) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error) {
        console.error('Notifications load error:', error);
      } finally {
        if (isMounted) {
          setLoadingNotifications(false);
        }
      }
    };

    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [isAuthenticated, location.pathname]);

  const handleCreateProject = () => {
    if (isAuthenticated) {
      onNavigate('startProject');
    } else {
      onNavigate('signIn', 'Vous devez etre connecte pour creer un projet.');
    }
    setIsMobileMenuOpen(false);
  };

  const handleMenuNavigate = (view) => {
    setIsMobileMenuOpen(false);
    onNavigate(view);
  };

  const formatNotificationTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok || !data.success) return;
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  const handleOpenNotificationLink = async (notification) => {
    try {
      if (!notification.is_read) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setNotifications((prev) => prev.map((item) => (
            item.id === notification.id ? { ...item, is_read: true } : item
          )));
          setUnreadCount(data.unreadCount ?? Math.max(0, unreadCount - 1));
        }
      }
    } catch (error) {
      console.error('Notification read error:', error);
    }

    setShowNotifications(false);
    setIsMobileMenuOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const profileMenuItems = [
    {
      key: 'profile',
      label: 'Profil',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
    {
      key: 'settings',
      label: 'Parametres',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5A3.5 3.5 0 1 0 8.5 12a3.5 3.5 0 0 0 3.5 3.5Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-2 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-2 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 2 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 1 0 2 1.7 1.7 0 0 0-.6 1Z" />
        </svg>
      ),
    },
    {
      key: 'support',
      label: 'Support',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 0 1 16 0" />
          <path d="M6 15v2a2 2 0 0 0 2 2h1v-6H8a2 2 0 0 0-2 2Z" />
          <path d="M18 15v2a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
          <path d="M12 19v1a2 2 0 0 1-2 2h2" />
        </svg>
      ),
    },
    {
      key: 'saved',
      label: 'Enregistrements',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4.5h10a1 1 0 0 1 1 1V21l-6-3.8L6 21V5.5a1 1 0 0 1 1-1Z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={`navbar ${isMobileMenuOpen ? 'nav-open' : ''}`} style={{ zIndex: 110 }}>
      <div className="nav-left">
        <h1 className="nav-logo" onClick={() => handleMenuNavigate('home')}>Hive.tn</h1>
      </div>

      <button
        type="button"
        className={`nav-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className={`nav-mobile-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-center">
          <span className={`nav-link ${activeTab === 'discover' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('discover')}>Decouvrir</span>
          <span className={`nav-link ${activeTab === 'home' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('home')}>Accueil</span>
          <span className={`nav-link ${activeTab === 'startProject' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={handleCreateProject}>Lancer un projet</span>
        </div>

        <div className="nav-right">
          {!isAuthenticated ? (
            <>
              <span className="nav-link" style={{ cursor: 'pointer' }} onClick={() => handleMenuNavigate('signIn')}>Connexion</span>
              <button className="nav-btn-solid" onClick={() => handleMenuNavigate('signUp')}>S'inscrire</button>
            </>
          ) : (
            <div className="nav-user-actions">
              <div className="notification-container" ref={notificationRef}>
                <button
                  type="button"
                  className="notification-btn"
                  aria-label="Notifications"
                  onClick={() => {
                    setShowNotifications((prev) => !prev);
                    setShowProfileMenu(false);
                  }}
                >
                  <span className="notification-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"></path><path d="M10 21a2.3 2.3 0 0 0 4 0"></path></svg></span>
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <strong>Notifications</strong>
                      {unreadCount > 0 && (
                        <button type="button" className="notification-mark-all" onClick={handleMarkAllAsRead}>
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="dropdown-divider"></div>

                    {loadingNotifications ? (
                      <div className="notification-empty">Chargement...</div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">Aucune notification pour le moment.</div>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className={`notification-item ${notification.is_read ? 'is-read' : 'is-unread'}`}
                            onClick={() => handleOpenNotificationLink(notification)}
                          >
                            <div className="notification-item-top">
                              <span className="notification-item-title">{notification.title}</span>
                              <span className="notification-item-time">{formatNotificationTime(notification.created_at)}</span>
                            </div>
                            <span className="notification-item-message">{notification.message}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="user-profile-container" ref={menuRef}>
                <div
                  className="user-avatar"
                  onClick={() => {
                    setShowProfileMenu((prev) => !prev);
                    setShowNotifications(false);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: storedUser.avatar ? 'none' : 'linear-gradient(135deg, #0ce688, #0ab56b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#0b0f19',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  {storedUser.avatar ? (
                    <img src={storedUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    userInitials
                  )}
                </div>

                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      <strong>{userName}</strong>
                      <span className="text-small" style={{ color: '#a1a1aa', fontSize: '13px' }}>{userEmail}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    {profileMenuItems.map((item) => (
                      <div key={item.key} className="dropdown-item" onClick={() => handleMenuNavigate(item.key)}>
                        <span className="dropdown-item-icon">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                    <div className="dropdown-divider"></div>
                    <div
                      className="dropdown-item text-danger"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setIsMobileMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                    >
                      <span className="dropdown-item-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <path d="M16 17l5-5-5-5" />
                          <path d="M21 12H9" />
                        </svg>
                      </span>
                      <span>Deconnexion</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


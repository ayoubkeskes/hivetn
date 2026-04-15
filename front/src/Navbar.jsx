import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react';
import './Home.css';

const API_URL = 'http://localhost:5000';

const NAV_ITEMS = [
  { key: 'discover', label: 'Découvrir', view: 'discover' },
  { key: 'howItWorks', label: 'Comment ça marche', path: '/#comment-ca-marche' },
];

const PROFILE_MENU_ITEMS = [
  { key: 'profile', label: 'Mon profil', icon: User, view: 'profile' },
  { key: 'support', label: 'Support', icon: HelpCircle, path: '/support' },
  { key: 'saved', label: 'Projets sauvegardés', icon: Bookmark, view: 'saved' },
  { key: 'settings', label: 'Paramètres', icon: Settings, view: 'settings' },
];

const NavItem = ({ label, active, onClick }) => (
  <button
    type="button"
    className={`nav-link ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

const NavbarButton = ({ children, variant = 'ghost', className = '', ...props }) => (
  <button
    type="button"
    className={variant === 'primary' ? `nav-btn-solid ${className}` : `nav-btn-outline ${className}`}
    {...props}
  >
    {children}
  </button>
);

const NotificationButton = ({ unreadCount, onClick, className = '' }) => (
  <button
    type="button"
    className={`notification-btn ${className}`.trim()}
    aria-label="Notifications"
    onClick={onClick}
  >
    <Bell size={18} strokeWidth={2} aria-hidden="true" />
    {unreadCount > 0 && (
      <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
    )}
  </button>
);

const AvatarButton = ({ avatar, initials, onClick, expanded = false }) => (
  <button
    type="button"
    className={`user-avatar ${expanded ? 'is-open' : ''}`}
    onClick={onClick}
    aria-haspopup="menu"
    aria-expanded={expanded}
    aria-label="Ouvrir le menu du profil"
  >
    {avatar ? (
      <img src={avatar} alt="Avatar" />
    ) : (
      <span>{initials}</span>
    )}
    <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
  </button>
);

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
  const userInitials = userName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const closeAllMenus = () => {
    setIsMobileMenuOpen(false);
    setShowProfileMenu(false);
    setShowNotifications(false);
  };

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
    closeAllMenus();
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
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

  const navigateToPath = (path) => {
    const [pathnamePart, hashPart] = path.split('#');
    const pathname = pathnamePart || '/';
    const hash = hashPart ? `#${hashPart}` : '';

    closeAllMenus();

    if (location.pathname === pathname && location.hash === hash) {
      if (hashPart) {
        const element = document.getElementById(hashPart);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    navigate(path);
  };

  const handleViewNavigation = (view, payload = '') => {
    closeAllMenus();
    onNavigate(view, payload);
  };

  const handleCreateProject = () => {
    if (isAuthenticated) {
      handleViewNavigation('startProject');
    } else {
      handleViewNavigation('signIn', 'Vous devez être connecté pour créer un projet.');
    }
  };

  const handleNavItemClick = (item) => {
    if (item.path) {
      navigateToPath(item.path);
      return;
    }

    handleViewNavigation(item.view);
  };

  const handleProfileItemClick = (item) => {
    if (item.path) {
      navigateToPath(item.path);
      return;
    }

    handleViewNavigation(item.view);
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

    closeAllMenus();

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const isNavItemActive = useMemo(() => {
    return (item) => {
      if (item.key === 'discover') {
        return activeTab === 'discover' && location.hash !== '#discover-filters';
      }

      if (item.key === 'howItWorks') {
        return location.pathname === '/' && location.hash === '#comment-ca-marche';
      }

      return false;
    };
  }, [activeTab, location.hash, location.pathname]);

  const mobileProfileItems = PROFILE_MENU_ITEMS.map((item) => (
    <button
      key={item.key}
      type="button"
      className="nav-mobile-profile-link"
      onClick={() => handleProfileItemClick(item)}
    >
      <item.icon size={16} strokeWidth={2} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  ));

  return (
    <nav
      className={`navbar ${isMobileMenuOpen ? 'nav-open' : ''}`}
      style={{
        zIndex: 110,
        '--space-1': '8px',
        '--space-2': '12px',
        '--space-3': '16px',
        '--space-4': '24px',
        '--space-5': '32px',
        '--space-6': '48px',
        '--container-padding': 'clamp(16px, 4vw, 32px)',
      }}
    >
      <div className="nav-left">
        <button type="button" className="nav-logo" onClick={() => handleViewNavigation('home')}>
          <span className="nav-logo-mark" aria-hidden="true">H</span>
          <span className="nav-logo-text">Hive.tn</span>
        </button>
      </div>

      <div className="nav-center nav-center--desktop">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            label={item.label}
            active={isNavItemActive(item)}
            onClick={() => handleNavItemClick(item)}
          />
        ))}
      </div>

      <div className="nav-right nav-right--desktop">
        {!isAuthenticated ? (
          <>
            <NavbarButton onClick={() => handleViewNavigation('signIn')}>Se connecter</NavbarButton>
            <NavbarButton variant="primary" onClick={() => handleViewNavigation('signUp')}>
              S'inscrire
            </NavbarButton>
          </>
        ) : (
          <div className="nav-user-actions">
            <NavbarButton variant="primary" className="nav-launch-btn" onClick={handleCreateProject}>
              Lancer un projet
            </NavbarButton>

            <div className="notification-container" ref={notificationRef}>
              <NotificationButton
                unreadCount={unreadCount}
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowProfileMenu(false);
                }}
              />

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
              <AvatarButton
                avatar={storedUser.avatar}
                initials={userInitials}
                expanded={showProfileMenu}
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
              />

              {showProfileMenu && (
                <div className="profile-dropdown" role="menu">
                  <div className="dropdown-header">
                    <strong>{userName}</strong>
                    <span className="text-small">{userEmail}</span>
                  </div>
                  <div className="dropdown-divider"></div>
                  {PROFILE_MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className="dropdown-item"
                        onClick={() => handleProfileItemClick(item)}
                      >
                        <span className="dropdown-item-icon"><Icon size={17} strokeWidth={2} aria-hidden="true" /></span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  <div className="dropdown-divider"></div>
                  <button
                    type="button"
                    className="dropdown-item text-danger"
                    onClick={() => {
                      closeAllMenus();
                      if (onLogout) onLogout();
                    }}
                  >
                    <span className="dropdown-item-icon"><LogOut size={17} strokeWidth={2} aria-hidden="true" /></span>
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="nav-mobile-actions">
        {!isAuthenticated ? (
          <>
            <button type="button" className="nav-mobile-auth-link" onClick={() => handleViewNavigation('signIn')}>
              Se connecter
            </button>
            <NavbarButton variant="primary" className="nav-mobile-signup" onClick={() => handleViewNavigation('signUp')}>
              S'inscrire
            </NavbarButton>
          </>
        ) : (
          <>
            <NotificationButton
              unreadCount={unreadCount}
              className="notification-btn--mobile"
              onClick={() => navigateToPath('/profile')}
            />
            <button
              type="button"
              className="nav-mobile-avatar-link"
              onClick={() => navigateToPath('/profile')}
              aria-label="Voir mon profil"
            >
              {storedUser.avatar ? <img src={storedUser.avatar} alt="Avatar" /> : <span>{userInitials}</span>}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        className={`nav-menu-toggle ${isMobileMenuOpen ? 'active' : ''}`}
        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
      >
        {isMobileMenuOpen ? <X size={18} strokeWidth={2.4} /> : <Menu size={18} strokeWidth={2.4} />}
      </button>

      <div className={`nav-mobile-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-mobile-links">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.key}
              label={item.label}
              active={isNavItemActive(item)}
              onClick={() => handleNavItemClick(item)}
            />
          ))}
        </div>

        <div className="nav-mobile-footer">
          <NavbarButton variant="primary" className="nav-mobile-launch" onClick={handleCreateProject}>
            Lancer un projet
          </NavbarButton>

          {!isAuthenticated ? (
            <div className="nav-mobile-auth-actions">
              <NavbarButton onClick={() => handleViewNavigation('signIn')}>Se connecter</NavbarButton>
              <NavbarButton variant="primary" onClick={() => handleViewNavigation('signUp')}>
                S'inscrire
              </NavbarButton>
            </div>
          ) : (
            <div className="nav-mobile-profile-links">
              {mobileProfileItems}
              <button
                type="button"
                className="nav-mobile-profile-link nav-mobile-profile-link--danger"
                onClick={() => {
                  closeAllMenus();
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                <span>Déconnexion</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

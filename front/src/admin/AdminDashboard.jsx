import React, { useState, useEffect } from 'react';
import {
  Ban,
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit2,
  Eye,
  FileText,
  Flag,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  PiggyBank,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Undo2,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import AdminSupportWorkspace from '../components/Support/AdminSupportWorkspace';
import { getSettings, updateSetting } from './services/settingsService.js';
import { fetchAdminLogById, fetchAdminLogs } from './services/adminLogsService.js';
import { buildApiUrl } from '../shared/services/api.js';

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
};

const describeDonutArc = (centerX, centerY, outerRadius, innerRadius, startAngle, endAngle) => {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

const campaignSortOptions = [
  { value: 'newest', label: 'Plus récentes en premier' },
  { value: 'oldest', label: 'Plus anciennes en premier' },
  { value: 'goal', label: 'Objectif décroissant' },
  { value: 'collected', label: 'Collecte décroissante' },
];

const SortMenu = ({ value, options, onChange, label = 'Trier', className = '' }) => {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`admin-sort-menu ${className} ${open ? 'is-open' : ''}`} ref={menuRef}>
      <button
        type="button"
        className="admin-sort-menu__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption.label}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="admin-sort-menu__panel" role="listbox" aria-label={label}>
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`admin-sort-menu__option ${selected ? 'is-selected' : ''}`}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {selected && <Check size={16} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const emptyEditCampaignModal = () => ({
  isOpen: false,
  campaignId: null,
  title: '',
  description: '',
  category: '',
  targetAmount: '',
  imageUrl: '',
  imagePreview: '',
  imageFile: null,
  videoUrl: '',
  videoPreview: '',
  videoFile: null,
});
const emptyCommentsModal = () => ({
  isOpen: false,
  campaign: null,
  comments: [],
  loading: false,
  error: '',
});

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return buildApiUrl(url);
};

const adminRoutes = [
  { id: 'dashboard', path: '/admin' },
  { id: 'campaigns', path: '/admin/campaigns' },
  { id: 'moderation', path: '/admin/campaigns/pending' },
  { id: 'drafts', path: '/admin/campaigns/drafts' },
  { id: 'rejected', path: '/admin/campaigns/rejected' },
  { id: 'pledges', path: '/admin/transactions/pledges' },
  { id: 'payments', path: '/admin/transactions/payments' },
  { id: 'refunds', path: '/admin/transactions/refunds' },
  { id: 'users', path: '/admin/users' },
  { id: 'roles', path: '/admin/users/roles' },
  { id: 'support', path: '/admin/support' },
  { id: 'reports', path: '/admin/support/reports' },
  { id: 'analytics', path: '/admin/analytics' },
  { id: 'settings', path: '/admin/settings' },
  { id: 'logs', path: '/admin/logs' },
];

const defaultAdminSettings = {
  platform: {
    commission_rate: 5,
    min_campaign_amount: 500,
    default_duration: 30,
  },
  moderation: {
    auto_approval: false,
    require_review: true,
  },
  notifications: {
    email_admin: true,
    alerts_enabled: true,
  },
  support: {
    sla_hours: 24,
    ticket_categories: ['GENERAL', 'PAYMENT', 'CAMPAIGN', 'TECHNICAL', 'ACCOUNT'],
  },
  security: {
    max_admins: 5,
    session_timeout: 120,
  },
};

const adminRouteMap = adminRoutes.reduce((acc, route) => {
  acc[route.id] = route.path;
  return acc;
}, {});

const resolveAdminTabFromPath = (pathname) => {
  if (pathname === '/admin') return 'dashboard';
  if (pathname.startsWith('/admin/support/reports')) return 'reports';
  if (pathname.startsWith('/admin/support/')) return 'support';

  const exactRoute = adminRoutes
    .filter((route) => route.path !== '/admin')
    .sort((a, b) => b.path.length - a.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return exactRoute?.id || 'dashboard';
};

const formatAdminRoleLabel = (role) => {
  if (role === 'SUPER_ADMIN') return 'Super Admin';
  if (role === 'ADMIN') return 'Administrateur';
  if (role === 'MODERATOR') return 'Moderateur';
  if (!role) return 'Admin';
  return role
    .toString()
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getStoredAdminUser = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('user') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * AdminDashboard â€” Connected to real backend API
 * All mock data removed. KPIs, pending campaigns, and users
 * are fetched from /api/admin/* endpoints.
 */
const AdminDashboard = ({ onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(() => resolveAdminTabFromPath(location.pathname));
  const [rejectModal, setRejectModal] = useState({ isOpen: false, campaignId: null, reason: '' });
  const [viewModal, setViewModal] = useState({ isOpen: false, campaign: null });
  const [editCampaignModal, setEditCampaignModal] = useState(emptyEditCampaignModal);
  const [commentsModal, setCommentsModal] = useState(emptyCommentsModal);
  const [deleteCommentModal, setDeleteCommentModal] = useState({ isOpen: false, comment: null });
  const [deleteCampaignModal, setDeleteCampaignModal] = useState({ isOpen: false, campaign: null });
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, user: null });
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: '', message: '', variant: 'success' });
  const [roleConfirmModal, setRoleConfirmModal] = useState({ isOpen: false, user: null, newRole: 'USER' });
  const [editUserModal, setEditUserModal] = useState({
    isOpen: false,
    userId: null,
    name: '',
    email: '',
    role: 'USER',
    bio: '',
    avatar: '',
  });
  const [createUserModal, setCreateUserModal] = useState({
    isOpen: false,
    name: '',
    email: '',
    password: '',
    role: 'USER',
    bio: '',
  });

  // â”€â”€ Live State (fetched from API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [stats, setStats] = useState(null);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [pledges, setPledges] = useState([]);
  const [users, setUsers] = useState([]);
  const [supportStats, setSupportStats] = useState(null);
  const [adminSettings, setAdminSettings] = useState(defaultAdminSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [settingsFeedback, setSettingsFeedback] = useState('');
  const [settingsModal, setSettingsModal] = useState({ isOpen: false, section: null, fields: [] });
  const [settingsDraft, setSettingsDraft] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogsFacets, setAdminLogsFacets] = useState({ action_types: [], entity_types: [] });
  const [adminLogsPagination, setAdminLogsPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [adminLogsFilters, setAdminLogsFilters] = useState({
    search: '',
    actionType: '',
    entityType: '',
    adminUserId: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
  });
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);
  const [adminLogsError, setAdminLogsError] = useState('');
  const [selectedAdminLog, setSelectedAdminLog] = useState(null);
  const [adminLogDetailLoading, setAdminLogDetailLoading] = useState(false);
  const [hoveredStatusSegment, setHoveredStatusSegment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // â”€â”€ Camps Tab State (Pagination, Filters, Preview) â”€â”€
  const [campFilters, setCampFilters] = useState({ search: '', category: '', status: '', sort: 'newest' });
  const [campPage, setCampPage] = useState(1);
  const campItemsPerPage = 10;
  const [previewPanel, setPreviewPanel] = useState({ isOpen: false, campaign: null });
  const [moderationFilters, setModerationFilters] = useState({ search: '', category: '', statusTab: 'ALL', sort: 'newest' });
  const [userFilters, setUserFilters] = useState({ search: '', role: '', sort: 'newest' });

  const token = localStorage.getItem('token');
  const currentUser = getStoredAdminUser();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const openFeedbackModal = (title, message, variant = 'success') => {
    setFeedbackModal({ isOpen: true, title, message, variant });
  };

  // â”€â”€ Fetch KPI stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchStats = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/stats'), { headers });
      const data = await res.json();
      if (data.success) setStats(data.stats);
      else setError(data.message);
    } catch { setError('Impossible de charger les statistiques.'); }
  };

  // â”€â”€ Fetch pending campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchPending = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/campaigns/pending'), { headers });
      const data = await res.json();
      if (data.success) setPendingCampaigns(data.campaigns);
    } catch { /* silent */ }
  };

  const fetchAllCampaigns = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/campaigns'), { headers });
      const data = await res.json();
      if (data.success) setAllCampaigns(data.campaigns);
    } catch { /* silent */ }
  };

  const fetchPledges = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/pledges'), { headers });
      const data = await res.json();
      if (data.success) setPledges(data.pledges);
    } catch { /* silent */ }
  };

  // â”€â”€ Fetch users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchUsers = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/users'), { headers });
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch { /* silent */ }
  };

  const fetchSupportStats = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/admin/support/tickets?page=1&limit=1'), { headers });
      const data = await res.json();
      if (data.success) setSupportStats(data.summary || data.stats || null);
    } catch { /* silent */ }
  };

  const fetchAdminSettings = async () => {
    setSettingsLoading(true);
    setSettingsError('');

    try {
      const data = await getSettings();
      setAdminSettings(Object.keys(defaultAdminSettings).reduce((acc, key) => {
        acc[key] = {
          ...defaultAdminSettings[key],
          ...(data[key] || {}),
        };
        return acc;
      }, {}));
    } catch (settingsLoadError) {
      setSettingsError(settingsLoadError.message || "Impossible de charger les paramètres.");
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleOpenCampaignComments = async (campaign) => {
    setCommentsModal({
      isOpen: true,
      campaign,
      comments: [],
      loading: true,
      error: '',
    });

    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${campaign.id}/comments`), { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setCommentsModal({
          isOpen: true,
          campaign,
          comments: [],
          loading: false,
          error: data.message || 'Impossible de charger les commentaires.',
        });
        return;
      }

      setCommentsModal({
        isOpen: true,
        campaign: data.campaign || campaign,
        comments: data.comments || [],
        loading: false,
        error: '',
      });
    } catch {
      setCommentsModal({
        isOpen: true,
        campaign,
        comments: [],
        loading: false,
        error: 'Impossible de charger les commentaires.',
      });
    }
  };

  const handleDeleteAdminComment = async (comment) => {
    setDeleteCommentModal({ isOpen: true, comment });
  };

  const confirmDeleteAdminComment = async () => {
    if (!deleteCommentModal.comment) return;

    try {
      const res = await fetch(buildApiUrl(`/api/admin/comments/${deleteCommentModal.comment.id}`), {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        openFeedbackModal('Suppression impossible', data.message || "Le commentaire n'a pas pu être supprimé.", 'error');
        return;
      }

      setCommentsModal((prev) => ({
        ...prev,
        comments: prev.comments.map((item) => (
          item.id === deleteCommentModal.comment.id
            ? { ...item, is_deleted: true }
            : item
        )),
      }));
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de supprimer ce commentaire pour le moment.', 'error');
    } finally {
      setDeleteCommentModal({ isOpen: false, comment: null });
    }
  };

  // â”€â”€ Initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchPending(), fetchAllCampaigns(), fetchPledges(), fetchUsers(), fetchSupportStats(), fetchAdminSettings()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  useEffect(() => {
    setActiveTab(resolveAdminTabFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (!selectedAdminLog) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedAdminLog(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAdminLog]);

  useEffect(() => {
    if (activeTab !== 'logs') return;

    let ignore = false;

    const loadAdminLogs = async () => {
      setAdminLogsLoading(true);
      setAdminLogsError('');

      try {
        const result = await fetchAdminLogs({
          ...adminLogsFilters,
          limit: adminLogsPagination.limit || 20,
        });

        if (ignore) return;
        setAdminLogs(result.logs);
        setAdminLogsFacets(result.facets);
        setAdminLogsPagination(result.pagination);
      } catch (logsError) {
        if (!ignore) {
          setAdminLogsError(logsError.message || "Impossible de charger les logs admin.");
        }
      } finally {
        if (!ignore) setAdminLogsLoading(false);
      }
    };

    loadAdminLogs();

    return () => {
      ignore = true;
    };
  }, [activeTab, adminLogsFilters]);

  const handleAdminTabChange = (tab) => {
    setActiveTab(tab);
    navigate(adminRouteMap[tab] || '/admin');
  };

  const handleOpenCampaignPreview = (campaign) => {
    if (!campaign?.id) return;
    navigate(`/project/${campaign.id}`);
  };

  const handleExitAdmin = () => {
    navigate('/');
  };

  // â”€â”€ Approve campaign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleApprove = async (id) => {
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${id}/approve`), {
        method: 'POST', headers,
      });
      const data = await res.json();
      if (data.success) {
        setPendingCampaigns(prev => prev.filter(c => c.id !== id));
        fetchStats();
        fetchAllCampaigns();
        setFeedbackModal({
          isOpen: true,
          title: 'Campagne approuvee',
          message: data.message || 'La campagne est maintenant active sur la plateforme.',
          variant: 'success',
        });
      } else {
        openFeedbackModal('Approbation impossible', data.message || "La campagne n'a pas pu être approuvée.", 'error');
      }
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de contacter le serveur pour approuver la campagne.', 'error');
    }
  };

  // â”€â”€ Reject campaign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRejectClick = (id) => {
    setRejectModal({ isOpen: true, campaignId: id, reason: '' });
  };

  const handleOpenEditCampaign = (campaign) => {
    setEditCampaignModal({
      ...emptyEditCampaignModal(),
      isOpen: true,
      campaignId: campaign.id,
      title: campaign.title || '',
      description: campaign.description || '',
      category: campaign.category || '',
      targetAmount: campaign.target_amount ? String(campaign.target_amount / 1000) : '',
      imageUrl: campaign.image_url || '',
      imagePreview: resolveMediaUrl(campaign.image_url),
      videoUrl: campaign.video_url || '',
      videoPreview: resolveMediaUrl(campaign.video_url),
    });
  };

  const handleEditCampaignImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      openFeedbackModal('Image trop volumineuse', "Choisissez une image de 5 Mo maximum.", 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditCampaignModal(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: event.target?.result || '',
        videoUrl: '',
        videoPreview: '',
        videoFile: null,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleEditCampaignVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) {
      openFeedbackModal('Vidéo trop volumineuse', 'Choisissez une vidéo de 200 Mo maximum.', 'warning');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setEditCampaignModal(prev => ({
      ...prev,
      videoFile: file,
      videoPreview: objectUrl,
      imageUrl: '',
      imagePreview: '',
      imageFile: null,
    }));
    e.target.value = '';
  };

  const handleSaveEditedCampaign = async () => {
    if (!editCampaignModal.title.trim() || !editCampaignModal.category.trim() || !editCampaignModal.targetAmount) {
      openFeedbackModal('Champs obligatoires', 'Titre, catégorie et objectif sont obligatoires.', 'warning');
      return;
    }

    const targetAmount = Number(editCampaignModal.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      openFeedbackModal('Objectif invalide', "L'objectif doit être un montant positif.", 'warning');
      return;
    }

    try {
      let nextImageUrl = editCampaignModal.imageUrl || '';
      let nextVideoUrl = editCampaignModal.videoUrl || '';

      if (editCampaignModal.imageFile) {
        nextVideoUrl = '';
        const formData = new FormData();
        formData.append('file', editCampaignModal.imageFile);

        const uploadRes = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}/image`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          openFeedbackModal('Upload image impossible', uploadData.message || "Erreur lors de l'upload de l'image.", 'error');
          return;
        }

        nextImageUrl = uploadData.fileUrl || nextImageUrl;
      }

      if (editCampaignModal.videoFile) {
        nextImageUrl = '';
        const formData = new FormData();
        formData.append('file', editCampaignModal.videoFile);

        const uploadRes = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}/video`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadData.success) {
          openFeedbackModal('Importation de la vidéo impossible', uploadData.message || "Erreur lors de l'importation de la vidéo.", 'error');
          return;
        }

        nextVideoUrl = uploadData.fileUrl || nextVideoUrl;
      }

      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${editCampaignModal.campaignId}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: editCampaignModal.title.trim(),
          description: editCampaignModal.description.trim(),
          category: editCampaignModal.category.trim(),
          target_amount: Math.round(targetAmount * 1000),
          image_url: nextImageUrl,
          video_url: nextVideoUrl,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setEditCampaignModal(emptyEditCampaignModal());
        fetchAllCampaigns();
        setFeedbackModal({
          isOpen: true,
          title: 'Campagne mise à jour',
          message: data.message || 'Les informations de la campagne ont été enregistrées avec succès.',
          variant: 'success',
        });
      } else {
        openFeedbackModal('Mise à jour impossible', data.message || 'Erreur de mise à jour.', 'error');
      }
    } catch {
      openFeedbackModal('Erreur réseau', "Impossible d'enregistrer les modifications pour le moment.", 'error');
    }
  };

  const confirmRejection = async () => {
    if (!rejectModal.reason.trim()) {
      openFeedbackModal('Motif requis', 'Ajoutez un motif clair avant de refuser cette campagne.', 'warning');
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${rejectModal.campaignId}/reject`), {
        method: 'POST', headers,
        body: JSON.stringify({ reason: rejectModal.reason }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingCampaigns(prev => prev.filter(c => c.id !== rejectModal.campaignId));
        fetchStats();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Campagne refusée' : 'Refus impossible',
        data.message || 'Campagne refusee.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de finaliser le refus de la campagne.', 'error');
    }
    setRejectModal({ isOpen: false, campaignId: null, reason: '' });
  };

  // â”€â”€ Delete user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDeleteCampaign = async (campaign) => {
    setDeleteCampaignModal({ isOpen: true, campaign });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteCampaignModal.campaign) return;
    const campaign = deleteCampaignModal.campaign;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/campaigns/${campaign.id}`), {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (data.success) {
        setAllCampaigns(prev => prev.filter(item => item.id !== campaign.id));
        setPendingCampaigns(prev => prev.filter(item => item.id !== campaign.id));
        fetchStats();
        fetchPending();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Campagne supprimée' : 'Suppression impossible',
        data.message || 'Campagne supprimée.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de supprimer cette campagne pour le moment.', 'error');
    } finally {
      setDeleteCampaignModal({ isOpen: false, campaign: null });
    }
  };

  const handleDeleteUser = async (user) => {
    setDeleteUserModal({ isOpen: true, user });
  };

  const resetCreateUserModal = () => {
    setCreateUserModal({
      isOpen: false,
      name: '',
      email: '',
      password: '',
      role: 'USER',
      bio: '',
    });
  };

  const handleCreateUser = async () => {
    if (!createUserModal.name.trim()) {
      openFeedbackModal('Nom requis', 'Le nom est obligatoire.', 'warning');
      return;
    }

    if (!createUserModal.email.trim()) {
      openFeedbackModal('Email requis', "L'email est obligatoire.", 'warning');
      return;
    }

    if (!createUserModal.password || createUserModal.password.length < 6) {
      openFeedbackModal('Mot de passe requis', 'Le mot de passe doit contenir au moins 6 caracteres.', 'warning');
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/api/admin/users'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: createUserModal.name.trim(),
          email: createUserModal.email.trim(),
          password: createUserModal.password,
          role: createUserModal.role,
          bio: createUserModal.bio,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => [data.user, ...prev]);
        fetchStats();
        resetCreateUserModal();
      }
      openFeedbackModal(
        data.success ? 'Utilisateur ajouté' : 'Création impossible',
        data.message || 'Utilisateur ajouté avec succès.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur réseau', "Impossible d'ajouter cet utilisateur pour le moment.", 'error');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    const user = deleteUserModal.user;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${user.id}`), {
        method: 'DELETE', headers,
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        fetchStats();
        fetchAllCampaigns();
      }
      openFeedbackModal(
        data.success ? 'Utilisateur supprimé' : 'Suppression impossible',
        data.message || 'Utilisateur supprimé.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de supprimer cet utilisateur pour le moment.', 'error');
    } finally {
      setDeleteUserModal({ isOpen: false, user: null });
    }
  };

  // â”€â”€ Toggle rôle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleToggleRole = async (user) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setRoleConfirmModal({ isOpen: true, user, newRole });
  };

  const confirmToggleRole = async () => {
    if (!roleConfirmModal.user) return;

    const user = roleConfirmModal.user;
    const newRole = roleConfirmModal.newRole;
    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${user.id}/role`), {
        method: 'PUT', headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      }
      openFeedbackModal(
        data.success ? 'Rôle mis à jour' : 'Modification impossible',
        data.message || 'Le rôle a été mis à jour.',
        data.success ? 'success' : 'error'
      );
    } catch {
      openFeedbackModal('Erreur réseau', 'Impossible de modifier le rôle pour le moment.', 'error');
    }
    setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' });
  };

  // â”€â”€ Rename user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleOpenEditUser = (user) => {
    setEditUserModal({
      isOpen: true,
      userId: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'USER',
      bio: user.bio || '',
      avatar: user.avatar || '',
    });
  };

  const handleEditUserAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      openFeedbackModal('Image trop volumineuse', "Choisissez une image de 5 Mo maximum.", 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEditUserModal(prev => ({ ...prev, avatar: event.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEditedUser = async () => {
    if (!editUserModal.name.trim()) {
      openFeedbackModal('Nom requis', 'Le nom est obligatoire.', 'warning');
      return;
    }

    if (!editUserModal.email.trim()) {
      openFeedbackModal('Email requis', "L'email est obligatoire.", 'warning');
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/api/admin/users/${editUserModal.userId}`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: editUserModal.name.trim(),
          email: editUserModal.email.trim(),
          role: editUserModal.role,
          bio: editUserModal.bio,
          avatar: editUserModal.avatar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(user => user.id === data.user.id ? data.user : user));
        if (data.user.id === currentUser.id) {
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...data.user }));
        }
        setEditUserModal({
          isOpen: false,
          userId: null,
          name: '',
          email: '',
          role: 'USER',
          bio: '',
          avatar: '',
        });
        openFeedbackModal('Utilisateur mis à jour', data.message || 'Les informations utilisateur ont été enregistrées.', 'success');
      } else {
        openFeedbackModal('Mise à jour impossible', data.message || "Erreur lors de la mise à jour de l'utilisateur.", 'error');
      }
    } catch {
      openFeedbackModal('Erreur réseau', "Impossible de mettre à jour cet utilisateur pour le moment.", 'error');
    }
  };

  // â”€â”€ Loading state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="admin-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#a1a1aa', fontSize: '18px' }}>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (error && !stats) {
    return (
      <div className="admin-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: '#f87171', fontSize: '16px' }}>{error}</p>
        <button className="btn-primary" onClick={() => onNavigate('home')}>Retour à l'accueil</button>
      </div>
    );
  }

  // â”€â”€ Computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalFunds = stats?.totalFunds || 0;
  const platformRevenue = totalFunds * (stats?.commissionRate || 0.05);
  const activeCampaigns = stats?.activeCampaigns || 0;
  const successRate = stats?.successRate || 0;
  const successfulCampaigns = stats?.successfulCampaigns || 0;
  const totalUsers = stats?.totalUsers || 0;
  const totalConfirmedSupports = stats?.totalConfirmedSupports ?? stats?.totalPaidDonations ?? 0;
  const totalTarget = stats?.totalTarget || 0;
  const latestPaidDonations = stats?.latestPaidDonations || [];
  const categorySplit = stats?.categorySplit || [];
  const totalCategoryCount = categorySplit.reduce((sum, c) => sum + c.value, 0) || 1;
  const getCampaignStatusClass = (status) => {
    if (status === 'ACTIVE') return 'actif';
    if (status === 'PENDING') return 'attente';
    if (status === 'DRAFT') return 'brouillon';
    if (status === 'REJECTED') return 'refuse';
    return 'archive';
  };
  const getCampaignStatusLabel = (status) => {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'PENDING') return 'En attente';
    if (status === 'DRAFT') return 'Brouillon';
    if (status === 'REJECTED') return 'Refusée';
    if (status === 'CLOSED') return 'Clôturée';
    return status;
  };

  const formatCampaignStatus = (status) => {
    if (status === 'ACTIVE') return 'Active';
    if (status === 'PENDING') return 'En attente';
    if (status === 'DRAFT') return 'Brouillon';
    if (status === 'REJECTED') return 'Refusée';
    if (status === 'CLOSED') return 'Clôturée';
    return status;
  };

  const getPledgeStatusClass = (status) => {
    if (status === 'SUCCESS' || status === 'PAID') return 'actif';
    if (status === 'PENDING') return 'attente';
    if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELED') return 'refuse';
    return 'archive';
  };

  const formatPledgeStatus = (status) => {
    if (status === 'SUCCESS' || status === 'PAID') return 'Confirmé';
    if (status === 'PENDING') return 'En attente';
    if (status === 'FAILED') return 'Échoué';
    if (status === 'EXPIRED') return 'Expiré';
    if (status === 'CANCELED') return 'Annulé';
    return status;
  };

  const draftCampaigns = allCampaigns.filter((campaign) => campaign.status === 'DRAFT');
  const rejectedCampaigns = allCampaigns.filter((campaign) => campaign.status === 'REJECTED');
  const adminUsers = users.filter((user) => user.role === 'ADMIN');
  const newUsersCount = users.filter((user) => {
    if (!user.created_at) return false;
    const createdAt = new Date(user.created_at).getTime();
    return Number.isFinite(createdAt) && createdAt >= Date.now() - (30 * 24 * 60 * 60 * 1000);
  }).length;
  const filteredUsers = users
    .filter((user) => {
      const query = userFilters.search.trim().toLowerCase();
      const searchableText = [
        user.name,
        user.email,
        user.bio,
        user.role,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !searchableText.includes(query)) return false;
      if (userFilters.role && user.role !== userFilters.role) return false;
      return true;
    })
    .sort((a, b) => {
      if (userFilters.sort === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (userFilters.sort === 'name') return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
      if (userFilters.sort === 'role') return (a.role || '').localeCompare(b.role || '', 'fr', { sensitivity: 'base' });
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  const successfulPledges = pledges.filter((pledge) => ['SUCCESS', 'PAID'].includes(pledge.status));
  const failedPledges = pledges.filter((pledge) => ['FAILED', 'EXPIRED', 'CANCELED'].includes(pledge.status));
  const openSupportTickets = supportStats?.open_in_progress_tickets ?? supportStats?.open_tickets ?? null;
  const unassignedSupportTickets = supportStats?.new_unassigned_tickets ?? null;
  const statusCounts = {
    draft: stats?.draftCampaigns ?? draftCampaigns.length,
    pending: stats?.pendingCampaigns ?? pendingCampaigns.length,
    active: stats?.activeCampaigns ?? activeCampaigns,
    rejected: rejectedCampaigns.length,
    closed: stats?.closedCampaigns ?? allCampaigns.filter((campaign) => campaign.status === 'CLOSED').length,
  };
  const totalStatusCount = Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const sidebarProfile = {
    name: currentUser.name || 'Administrateur',
    role: formatAdminRoleLabel(currentUser.role),
    email: currentUser.email || 'admin@hive.tn',
    avatar: currentUser.avatar || '',
    initials: (currentUser.name || 'AD')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
  };

  // â”€â”€ Camps Tab Filtering & Pagination â”€â”€
  const uniqueCategories = [...new Set(allCampaigns.map(c => c.category).filter(Boolean))].sort();

  const filteredCamps = allCampaigns.filter(c => {
    if (campFilters.search && !c.title?.toLowerCase().includes(campFilters.search.toLowerCase()) && !c.creator_name?.toLowerCase().includes(campFilters.search.toLowerCase())) return false;
    if (campFilters.category && c.category !== campFilters.category) return false;
    if (campFilters.status && c.status !== campFilters.status) return false;
    return true;
  }).sort((a, b) => {
    if (campFilters.sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (campFilters.sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (campFilters.sort === 'goal') return (b.target_amount || 0) - (a.target_amount || 0);
    if (campFilters.sort === 'collected') return (b.current_amount || 0) - (a.current_amount || 0);
    return 0;
  });

  const totalCampPages = Math.ceil(filteredCamps.length / campItemsPerPage);
  const currentCampPage = Math.min(campPage, totalCampPages > 0 ? totalCampPages : 1);
  const paginatedCamps = filteredCamps.slice((currentCampPage - 1) * campItemsPerPage, currentCampPage * campItemsPerPage);
  const moderationCampaigns = allCampaigns.length > 0 ? allCampaigns : pendingCampaigns;
  const moderationCategories = [...new Set(moderationCampaigns.map((campaign) => campaign.category).filter(Boolean))].sort();
  const moderationTabItems = [
    { key: 'ALL', label: 'Toutes', count: moderationCampaigns.length },
    { key: 'PENDING', label: 'En attente', count: statusCounts.pending },
    { key: 'ACTIVE', label: 'Actives', count: statusCounts.active },
    { key: 'DRAFT', label: 'Brouillons', count: statusCounts.draft },
    { key: 'REJECTED', label: 'Refusées', count: statusCounts.rejected },
  ];
  const campaignTabItems = [
    { key: '', label: 'Toutes', count: allCampaigns.length },
    { key: 'PENDING', label: 'En attente', count: statusCounts.pending },
    { key: 'ACTIVE', label: 'Actives', count: statusCounts.active },
    { key: 'DRAFT', label: 'Brouillons', count: statusCounts.draft },
    { key: 'REJECTED', label: 'Refusées', count: statusCounts.rejected },
  ];

  const filteredModerationCampaigns = moderationCampaigns
    .filter((campaign) => {
      const query = moderationFilters.search.trim().toLowerCase();
      const matchesSearch = !query || [
        campaign.title,
        campaign.creator_name,
        campaign.creator_email,
        campaign.category,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      if (!matchesSearch) return false;
      if (moderationFilters.category && campaign.category !== moderationFilters.category) return false;
      if (moderationFilters.statusTab !== 'ALL' && campaign.status !== moderationFilters.statusTab) return false;
      return true;
    })
    .sort((a, b) => {
      if (moderationFilters.sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (moderationFilters.sort === 'goal') return (b.target_amount || 0) - (a.target_amount || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });


  const dashboardKpis = [
    {
      title: 'Montant traité',
      value: `${totalFunds.toLocaleString('fr-FR')} DT`,
      detail: `${totalConfirmedSupports} soutien${totalConfirmedSupports > 1 ? 's' : ''} confirmé${totalConfirmedSupports > 1 ? 's' : ''}`,
      icon: CreditCard,
      tone: 'green',
    },
    {
      title: 'Revenus plateforme',
      value: `${platformRevenue.toLocaleString('fr-FR')} DT`,
      detail: `${Math.round((stats?.commissionRate || 0.05) * 100)}% sur paiements vérifiés`,
      icon: BarChart3,
      tone: 'blue',
    },
    {
      title: 'Campagnes actives',
      value: activeCampaigns.toLocaleString('fr-FR'),
      detail: `${statusCounts.pending} en attente de modération`,
      icon: Megaphone,
      tone: 'violet',
    },
    {
      title: 'Utilisateurs',
      value: totalUsers.toLocaleString('fr-FR'),
      detail: `${adminUsers.length} admin${adminUsers.length > 1 ? 's' : ''}`,
      icon: Users,
      tone: 'slate',
    },
    {
      title: 'Taux de succès',
      value: `${successRate}%`,
      detail: `${successfulCampaigns} campagne${successfulCampaigns > 1 ? 's' : ''} à 100% ou plus`,
      icon: ShieldCheck,
      tone: 'amber',
    },
    {
      title: 'Objectifs cumulés',
      value: `${totalTarget.toLocaleString('fr-FR')} DT`,
      detail: 'Campagnes actives et clôturées',
      icon: PiggyBank,
      tone: 'cyan',
    },
  ];

  const campaignStatusCards = [
    { key: 'draft', label: 'Brouillons', value: statusCounts.draft, className: 'brouillon' },
    { key: 'pending', label: 'En attente', value: statusCounts.pending, className: 'attente' },
    { key: 'active', label: 'Actives', value: statusCounts.active, className: 'actif' },
    { key: 'rejected', label: 'Rejetées', value: statusCounts.rejected, className: 'refuse' },
    { key: 'closed', label: 'Clôturées', value: statusCounts.closed, className: 'archive' },
  ];

  const recentActivities = [
    ...latestPaidDonations.map((donation) => ({
      id: `donation-${donation.id}`,
      type: 'Soutien payé',
      title: donation.campaignTitle || 'Campagne inconnue',
      meta: `${donation.donorName || 'Utilisateur inconnu'} · ${Number(donation.amountTnd || 0).toLocaleString('fr-FR')} DT`,
      date: donation.paidAt,
      icon: WalletCards,
    })),
    ...pendingCampaigns.slice(0, 4).map((campaign) => ({
      id: `pending-${campaign.id}`,
      type: 'Campagne à modérer',
      title: campaign.title || 'Sans titre',
      meta: campaign.creator_name || 'Créateur inconnu',
      date: campaign.created_at,
      icon: ShieldCheck,
    })),
    ...users.slice(0, 3).map((user) => ({
      id: `user-${user.id}`,
      type: 'Nouvel utilisateur',
      title: user.name || user.email || 'Utilisateur',
      meta: user.role === 'ADMIN' ? 'Administrateur' : 'Membre',
      date: user.created_at,
      icon: Users,
    })),
  ]
    .filter((activity) => activity.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const dashboardAlerts = [
    {
      id: 'pending-campaigns',
      title: 'Campagnes en attente',
      text: statusCounts.pending > 0
        ? `${statusCounts.pending} campagne${statusCounts.pending > 1 ? 's' : ''} attendent une décision.`
        : 'Aucune campagne en attente de modération.',
      level: statusCounts.pending > 0 ? 'warning' : 'success',
      action: 'Voir',
      tab: 'moderation',
    },
    {
      id: 'support-tickets',
      title: 'Tickets non traités',
      text: openSupportTickets === null
        ? 'Statistiques support indisponibles pour le moment.'
        : `${openSupportTickets} ticket${openSupportTickets > 1 ? 's' : ''} ouvert${openSupportTickets > 1 ? 's' : ''}${unassignedSupportTickets ? `, dont ${unassignedSupportTickets} non assigné${unassignedSupportTickets > 1 ? 's' : ''}` : ''}.`,
      level: openSupportTickets > 0 ? 'warning' : 'success',
      action: 'Ouvrir',
      tab: 'support',
    },
    {
      id: 'pledge-issues',
      title: 'Soutiens à vérifier',
      text: failedPledges.length > 0
        ? `${failedPledges.length} soutien${failedPledges.length > 1 ? 's' : ''} échoué${failedPledges.length > 1 ? 's' : ''} ou expiré${failedPledges.length > 1 ? 's' : ''}.`
        : 'Aucun incident de soutien détecté.',
      level: failedPledges.length > 0 ? 'danger' : 'success',
      action: 'Analyser',
      tab: 'pledges',
    },
  ];

  const dashboardPrimaryMetrics = [
    {
      title: 'Fonds totaux collectés',
      value: `${totalFunds.toLocaleString('fr-FR')} DT`,
      detail: `${totalConfirmedSupports} soutien${totalConfirmedSupports > 1 ? 's' : ''} confirmé${totalConfirmedSupports > 1 ? 's' : ''}`,
      icon: CreditCard,
      tone: 'green',
    },
    {
      title: 'Campagnes actives',
      value: activeCampaigns.toLocaleString('fr-FR'),
      detail: `${statusCounts.pending} en attente · ${statusCounts.draft} brouillon${statusCounts.draft > 1 ? 's' : ''}`,
      icon: Megaphone,
      tone: 'blue',
    },
    {
      title: 'Utilisateurs totaux',
      value: totalUsers.toLocaleString('fr-FR'),
      detail: `+${newUsersCount} ce mois`,
      icon: Users,
      tone: 'violet',
    },
    {
      title: 'Taux de succès',
      value: `${successRate}%`,
      detail: `${successfulCampaigns} campagne${successfulCampaigns > 1 ? 's' : ''} à 100% ou plus`,
      icon: ShieldCheck,
      tone: 'amber',
    },
  ];

  const fundsByCategory = Object.values(
    allCampaigns.reduce((acc, campaign) => {
      const categoryName = campaign.category || 'Autres';
      const amount = Number(campaign.current_amount || 0) / 1000;

      if (!acc[categoryName]) {
        acc[categoryName] = { name: categoryName, amount: 0 };
      }

      acc[categoryName].amount += amount;
      return acc;
    }, {})
  )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxFundsByCategory = fundsByCategory.reduce((max, item) => Math.max(max, item.amount), 0);
  const rawFundsTickStep = maxFundsByCategory > 0 ? maxFundsByCategory / 4 : 0;
  const fundsTickMagnitude = rawFundsTickStep > 0 ? 10 ** Math.floor(Math.log10(rawFundsTickStep)) : 0;
  const fundsTickRatio = fundsTickMagnitude > 0 ? rawFundsTickStep / fundsTickMagnitude : 0;
  const fundsTickStep = fundsTickMagnitude > 0
    ? (fundsTickRatio <= 1 ? 1 : fundsTickRatio <= 2 ? 2 : fundsTickRatio <= 5 ? 5 : 10) * fundsTickMagnitude
    : 0;
  const fundsChartTicks = fundsTickStep > 0
    ? [4, 3, 2, 1, 0].map((multiplier) => multiplier * fundsTickStep)
    : [];
  const fundsChartMax = fundsChartTicks[0] || maxFundsByCategory;

  const statusChartSegments = [
    { key: 'active', label: 'Actives', value: statusCounts.active, color: '#22c55e' },
    { key: 'pending', label: 'En attente', value: statusCounts.pending, color: '#f59e0b' },
    { key: 'draft', label: 'Brouillons', value: statusCounts.draft, color: '#64748b' },
    { key: 'closed', label: 'Terminées', value: statusCounts.closed, color: '#3b82f6' },
    { key: 'rejected', label: 'Refusées', value: statusCounts.rejected, color: '#ef4444' },
  ].filter((segment) => Number(segment.value || 0) > 0);

  const totalStatusSegments = statusChartSegments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  let donutCursor = 0;
  const statusChartArcs = statusChartSegments.map((segment) => {
    const segmentRatio = totalStatusSegments > 0 ? (Number(segment.value || 0) / totalStatusSegments) : 0;
    const startAngle = donutCursor * 360;
    donutCursor += segmentRatio;
    const endAngle = donutCursor * 360;
    const midAngle = startAngle + ((endAngle - startAngle) / 2);
    const tooltipPoint = polarToCartesian(120, 120, 82, midAngle);

    return {
      ...segment,
      path: describeDonutArc(120, 120, 108, 54, startAngle, endAngle),
      tooltipLeft: tooltipPoint.x,
      tooltipTop: tooltipPoint.y,
    };
  });

  const platformSettings = adminSettings.platform || defaultAdminSettings.platform;
  const moderationSettings = adminSettings.moderation || defaultAdminSettings.moderation;
  const notificationsSettings = adminSettings.notifications || defaultAdminSettings.notifications;
  const supportSettings = adminSettings.support || defaultAdminSettings.support;
  const securitySettings = adminSettings.security || defaultAdminSettings.security;

  const settingsSections = [
    {
      key: 'platform',
      title: 'Paramètres de la plateforme',
      description: 'Configuration générale de Hive.tn et des règles visibles par les créateurs.',
      icon: Settings,
      action: 'Configurer',
      rows: [
        { label: 'Commission plateforme', helper: 'Taux appliqué aux paiements confirmés.', value: `${platformSettings.commission_rate}%`, status: 'Actif', settingKey: 'platform', fields: ['commission_rate'] },
        { label: 'Seuil minimum de financement', helper: 'Montant minimum conseille avant publication.', value: `${platformSettings.min_campaign_amount} DT`, status: 'Standard', settingKey: 'platform', fields: ['min_campaign_amount'] },
        { label: 'Durée par défaut', helper: 'Durée proposée lors de la création de campagne.', value: `${platformSettings.default_duration} jours`, status: 'Actif', settingKey: 'platform', fields: ['default_duration'] },
      ],
    },
    {
      key: 'moderation',
      title: 'Modération & validation',
      description: 'Règles de contrôle avant publication et suivi des campagnes sensibles.',
      icon: ShieldCheck,
      action: 'Gérer',
      rows: [
        { label: 'Validation automatique', helper: 'Autorise la publication sans décision admin manuelle.', value: moderationSettings.auto_approval ? 'Activée' : 'Désactivée', status: moderationSettings.auto_approval ? 'Actif' : 'Standard', settingKey: 'moderation', fields: ['auto_approval'] },
        { label: 'Revue obligatoire', helper: 'Chaque campagne soumise passe par la modération admin.', value: moderationSettings.require_review ? 'Obligatoire' : 'Optionnelle', status: moderationSettings.require_review ? 'Actif' : 'Prêt', settingKey: 'moderation', fields: ['require_review'] },
        { label: 'Signalements suspects', helper: 'Prêt le traitement des contenus ou activités à risque.', value: 'File dédiée', status: 'Prêt', tab: 'reports' },
      ],
    },
    {
      key: 'transactions',
      title: 'Transactions & commissions',
      description: 'Paramètres financiers utilises pour le suivi des soutiens et revenus plateforme.',
      icon: CreditCard,
      action: 'Modifier',
      rows: [
        { label: 'Commission plateforme', helper: 'Taux appliqué aux paiements confirmés.', value: `${platformSettings.commission_rate}%`, status: 'Actif', settingKey: 'platform', fields: ['commission_rate'] },
        { label: 'Contrôle des soutiens', helper: 'Suivi des paiements archives, echoues ou expires.', value: `${pledges.length} lignes`, status: 'Disponible', tab: 'pledges' },
        { label: 'Remboursements', helper: 'Workflow réservé aux futures demandes de remboursement.', value: 'Non activé', status: 'Prêt', tab: 'refunds' },
      ],
    },
    {
      key: 'notifications',
      title: 'Notifications admin',
      description: 'Alertes opérationnelles pour garder les equipes informees.',
      icon: MessageSquare,
      action: 'Ajuster',
      rows: [
        { label: 'Campagnes en attente', helper: 'Alerte quand une campagne attend une décision.', value: `${statusCounts.pending} en attente`, status: statusCounts.pending > 0 ? 'À traiter' : 'Calme', tab: 'moderation' },
        { label: 'Emails admin', helper: 'Envoie les notifications critiques aux administrateurs.', value: notificationsSettings.email_admin ? 'Actifs' : 'Désactivés', status: notificationsSettings.email_admin ? 'Actif' : 'Non activé', settingKey: 'notifications', fields: ['email_admin'] },
        { label: 'Alertes système', helper: 'Notifications internes pour erreurs et activité inhabituelle.', value: notificationsSettings.alerts_enabled ? 'Activées' : 'Désactivées', status: notificationsSettings.alerts_enabled ? 'Actif' : 'Standard', settingKey: 'notifications', fields: ['alerts_enabled'] },
      ],
    },
    {
      key: 'support',
      title: 'Support & tickets',
      description: 'Organisation du support client, SLA et affectation des tickets.',
      icon: LifeBuoy,
      action: 'Ouvrir',
      rows: [
        { label: 'SLA de première réponse', helper: 'Délai cible pour répondre aux nouvelles demandes.', value: `${supportSettings.sla_hours} h`, status: 'Standard', settingKey: 'support', fields: ['sla_hours'] },
        { label: 'Tickets non assignés', helper: 'Demandes qui attendent un responsable support.', value: `${unassignedSupportTickets ?? 0}`, status: (unassignedSupportTickets || 0) > 0 ? 'À traiter' : 'OK', tab: 'support' },
        { label: 'Catégories support', helper: 'Général, paiement, campagne, technique et compte.', value: `${supportSettings.ticket_categories?.length || 0} types`, status: 'Actif', settingKey: 'support', fields: ['ticket_categories'] },
      ],
    },
    {
      key: 'security',
      title: 'Sécurité & rôles',
      description: 'Accès admin, permissions et contrôle des opérations sensibles.',
      icon: Users,
      action: 'Gérer',
      rows: [
        { label: 'Administrateurs maximum', helper: 'Limite opérationnelle des comptes back-office.', value: `${securitySettings.max_admins} admins`, status: 'Contrôle', settingKey: 'security', fields: ['max_admins'] },
        { label: 'Expiration de session', helper: 'Durée maximale avant reconnexion admin.', value: `${securitySettings.session_timeout} min`, status: 'Sécurisé', settingKey: 'security', fields: ['session_timeout'] },
        { label: 'Journalisation', helper: 'Base prévue pour tracer les actions sensibles.', value: 'Logs admin', status: 'Prêt', tab: 'logs' },
      ],
    },
  ];

  const renderNavItem = ({ id, label, icon: Icon, count, navigateToId = id, activeIds = [id] }) => (
    <button
      key={id}
      type="button"
      className={`admin-nav-item ${activeIds.includes(activeTab) ? 'active' : ''}`}
      onClick={() => handleAdminTabChange(navigateToId)}
    >
      <span className="nav-label">
        <Icon className="nav-icon" size={17} strokeWidth={1.9} />
        <span className="nav-text">{label}</span>
      </span>
      {typeof count === 'number' && count > 0 && <span className="nav-count">{count}</span>}
    </button>
  );

  const renderPlaceholder = ({ icon: Icon, title, description, items = [] }) => (
    <div className="fade-in admin-placeholder">
      <div className="admin-placeholder__icon">
        <Icon size={28} strokeWidth={1.8} />
      </div>
      <div>
        <p className="admin-placeholder__eyebrow">Module prépare</p>
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

  const renderDashboardSectionHeader = (title, subtitle) => (
    <div className="dashboard-section-header">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );

  const renderDashboardMetricCard = ({ title, value, detail, icon: Icon, tone }) => (
    <article className={`dashboard-metric-card dashboard-metric-card--${tone}`} key={title}>
      <div className="dashboard-metric-card__header">
        <div>
          <span className="dashboard-metric-card__label">{title}</span>
          <strong className="dashboard-metric-card__value">{value}</strong>
        </div>
        <span className="dashboard-metric-card__icon">
          <Icon size={20} strokeWidth={2} />
        </span>
      </div>
      <span className="dashboard-metric-card__detail">{detail}</span>
    </article>
  );

  const renderKpiCard = ({ title, value, detail, icon: Icon, tone }) => (
    <article className={`admin-kpi-card admin-kpi-card--${tone}`} key={title}>
      <div className="admin-kpi-card__top">
        <span className="admin-kpi-card__icon"><Icon size={18} strokeWidth={2} /></span>
        <span className="admin-kpi-card__label">{title}</span>
      </div>
      <strong className="admin-kpi-card__value">{value}</strong>
      <span className="admin-kpi-card__detail">{detail}</span>
    </article>
  );

  const renderQuickActionCard = ({ title, value, text, icon: Icon, tab }) => (
    <button type="button" className="quick-action-card" onClick={() => handleAdminTabChange(tab)} key={title}>
      <span className="quick-action-card__icon"><Icon size={18} strokeWidth={2} /></span>
      <span className="quick-action-card__content">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
      <span className="quick-action-card__value">{value}</span>
      <ChevronRight className="quick-action-card__arrow" size={16} />
    </button>
  );

  const renderModerationActions = (campaign) => (
    <div className="cell-actions-iconic moderation-actions">
      <button
        type="button"
        className="icon-btn btn-view"
        title="Voir les details"
        aria-label="Voir les details"
        onClick={() => setViewModal({ isOpen: true, campaign })}
      >
        <Eye size={16} />
      </button>
      <button
        type="button"
        className="icon-btn btn-comments"
        title="Voir les commentaires"
        aria-label="Voir les commentaires"
        onClick={() => handleOpenCampaignComments(campaign)}
      >
        <MessageSquare size={16} />
      </button>
      {campaign.status === 'PENDING' && (
        <>
          <button
            type="button"
            className="icon-btn btn-approve"
            title="Approuver la campagne"
            aria-label="Approuver la campagne"
            onClick={() => handleApprove(campaign.id)}
          >
            <ShieldCheck size={16} />
          </button>
          <button
            type="button"
            className="icon-btn btn-reject"
            title="Refuser la campagne"
            aria-label="Refuser la campagne"
            onClick={() => handleRejectClick(campaign.id)}
          >
            <Ban size={16} />
          </button>
        </>
      )}
      <button
        type="button"
        className="icon-btn btn-delete"
        title="Supprimer la campagne"
        aria-label="Supprimer la campagne"
        onClick={() => handleDeleteCampaign(campaign)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  const getUserInitials = (user) => {
    const base = user?.name || user?.email || 'U';
    return base
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';
  };

  const renderUserActions = (user, isSelf) => {
    if (isSelf) {
      return <span className="admin-user-protected">Vous</span>;
    }

    return (
      <div className="cell-actions-iconic admin-user-actions">
        <button
          type="button"
          className="icon-btn btn-edit"
          title="Modifier l'utilisateur"
          aria-label="Modifier l'utilisateur"
          onClick={() => handleOpenEditUser(user)}
        >
          <Edit2 size={16} />
        </button>
        <button
          type="button"
          className={`icon-btn ${user.role === 'ADMIN' ? 'btn-warning' : 'btn-approve'}`}
          title={user.role === 'ADMIN' ? 'Retrograder en utilisateur' : 'Promouvoir en admin'}
          aria-label={user.role === 'ADMIN' ? 'Retrograder en utilisateur' : 'Promouvoir en admin'}
          onClick={() => handleToggleRole(user)}
        >
          <ShieldCheck size={16} />
        </button>
        <button
          type="button"
          className="icon-btn btn-delete"
          title="Supprimer l'utilisateur"
          aria-label="Supprimer l'utilisateur"
          onClick={() => handleDeleteUser(user)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  const formatActivityDate = (date) => {
    if (!date) return 'Date indisponible';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatAdminLogDate = (date) => {
    if (!date) return 'Non disponible';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const adminActionLabels = {
    CAMPAIGN_APPROVED: 'Campagne approuvee',
    CAMPAIGN_REJECTED: 'Campagne refusee',
    CAMPAIGN_UPDATED: 'Campagne modifiee',
    CAMPAIGN_MEDIA_UPDATED: 'Media campagne',
    CAMPAIGN_DELETED: 'Campagne supprimée',
    USER_ROLE_CHANGED: 'Role modifie',
    USER_UPDATED: 'Utilisateur modifie',
    USER_DELETED: 'Utilisateur supprimé',
    COMMENT_DELETED: 'Commentaire supprimé',
    SETTINGS_UPDATED: 'Paramètres modifies',
    SUPPORT_TICKET_REPLIED: 'Réponse support',
    SUPPORT_TICKET_UPDATED: 'Ticket modifie',
    SUPPORT_TICKET_ASSIGNED: 'Ticket assigne',
    SUPPORT_TICKET_NOTE_ADDED: 'Note support',
  };

  const adminEntityLabels = {
    campaign: 'Campagne',
    user: 'Utilisateur',
    comment: 'Commentaire',
    payment: 'Paiement',
    refund: 'Remboursement',
    auth: 'Authentification',
    settings: 'Paramètres',
    support_ticket: 'Ticket support',
  };

  const formatAdminAction = (actionType) => adminActionLabels[actionType] || actionType || 'Action';
  const formatAdminEntity = (entityType) => adminEntityLabels[entityType] || entityType || 'Ressource';

  const getAdminLogBadgeTone = (actionType = '') => {
    if (actionType.includes('DELETED') || actionType.includes('REJECTED')) return 'danger';
    if (actionType.includes('APPROVED') || actionType.includes('RESOLVED')) return 'success';
    if (actionType.includes('SETTINGS')) return 'violet';
    if (actionType.includes('UPDATED') || actionType.includes('EDITED') || actionType.includes('ROLE')) return 'info';
    if (actionType.includes('SUPPORT')) return 'support';
    return 'neutral';
  };

  const getAdminLogTarget = (log) => {
    if (log.target_campaign_title) return log.target_campaign_title;
    if (log.target_user_name || log.target_user_email) return log.target_user_name || log.target_user_email;
    if (log.entity_id) return `#${String(log.entity_id).slice(0, 8)}`;
    return 'Aucune';
  };

  const updateAdminLogsFilter = (key, value) => {
    setAdminLogsFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  const resetAdminLogsFilters = () => {
    setAdminLogsFilters({
      search: '',
      actionType: '',
      entityType: '',
      adminUserId: '',
      dateFrom: '',
      dateTo: '',
      page: 1,
    });
  };

  const openAdminLogDetails = async (log) => {
    setAdminLogDetailLoading(true);
    setSelectedAdminLog(log);

    try {
      const detail = await fetchAdminLogById(log.id);
      setSelectedAdminLog(detail || log);
    } catch (detailError) {
      openFeedbackModal('Log indisponible', detailError.message || "Impossible de charger le détail du log.", 'error');
    } finally {
      setAdminLogDetailLoading(false);
    }
  };

  const sensitiveAdminLogsCount = adminLogs.filter((log) => (
    String(log.action_type || '').includes('DELETED')
    || String(log.action_type || '').includes('ROLE')
    || String(log.action_type || '').includes('SETTINGS')
  )).length;

  const todaysAdminLogsCount = adminLogs.filter((log) => {
    if (!log.created_at) return false;
    const date = new Date(log.created_at);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }).length;

  const settingsFieldLabels = {
    commission_rate: { label: 'Commission plateforme (%)', type: 'number', min: 0, max: 30, step: 0.1 },
    min_campaign_amount: { label: 'Seuil minimum (DT)', type: 'number', min: 1 },
    default_duration: { label: 'Durée par défaut (jours)', type: 'number', min: 1, max: 365 },
    auto_approval: { label: 'Validation automatique', type: 'boolean' },
    require_review: { label: 'Revue obligatoire', type: 'boolean' },
    email_admin: { label: 'Emails admin', type: 'boolean' },
    alerts_enabled: { label: 'Alertes système', type: 'boolean' },
    sla_hours: { label: 'SLA première réponse (heures)', type: 'number', min: 1, max: 720 },
    ticket_categories: { label: 'Catégories support', type: 'text-list' },
    max_admins: { label: 'Administrateurs maximum', type: 'number', min: 1, max: 100 },
    session_timeout: { label: 'Expiration de session (minutes)', type: 'number', min: 5, max: 1440 },
  };

  const openSettingsModal = (row) => {
    if (!row.settingKey) return;

    const source = adminSettings[row.settingKey] || defaultAdminSettings[row.settingKey] || {};
    const fields = row.fields || Object.keys(source);
    const draft = fields.reduce((acc, field) => {
      const value = source[field];
      acc[field] = Array.isArray(value) ? value.join(', ') : value;
      return acc;
    }, {});

    setSettingsFeedback('');
    setSettingsError('');
    setSettingsModal({
      isOpen: true,
      section: row.settingKey,
      title: row.label,
      description: row.helper,
      fields,
    });
    setSettingsDraft(draft);
  };

  const closeSettingsModal = () => {
    setSettingsModal({ isOpen: false, section: null, fields: [] });
    setSettingsDraft({});
    setSettingsSaving(false);
    setSettingsError('');
  };

  const normalizeSettingsDraft = () => {
    return (settingsModal.fields || []).reduce((acc, field) => {
      const fieldConfig = settingsFieldLabels[field] || {};
      const value = settingsDraft[field];

      if (fieldConfig.type === 'boolean') {
        acc[field] = Boolean(value);
      } else if (fieldConfig.type === 'number') {
        acc[field] = Number(value);
      } else if (fieldConfig.type === 'text-list') {
        acc[field] = String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        acc[field] = value;
      }

      return acc;
    }, {});
  };

  const handleSaveSettings = async () => {
    if (!settingsModal.section) return;

    setSettingsSaving(true);
    setSettingsError('');
    setSettingsFeedback('');

    try {
      const payload = normalizeSettingsDraft();
      const updated = await updateSetting(settingsModal.section, payload);

      setAdminSettings((prev) => ({
        ...prev,
        [settingsModal.section]: {
          ...(prev[settingsModal.section] || {}),
          ...(updated?.value || payload),
          updated_at: updated?.updated_at,
        },
      }));
      setSettingsFeedback('Paramètres enregistrés avec succès.');
      closeSettingsModal();
    } catch (saveError) {
      setSettingsError(saveError.message || "Impossible d'enregistrer les paramètres.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const renderSettingsRow = (row) => (
    <button
      type="button"
      className="admin-settings-row"
      key={row.label}
      onClick={() => (row.settingKey ? openSettingsModal(row) : row.tab && handleAdminTabChange(row.tab))}
      disabled={!row.tab && !row.settingKey}
    >
      <span className="admin-settings-row__copy">
        <strong>{row.label}</strong>
        <span>{row.helper}</span>
      </span>
      <span className="admin-settings-row__meta">
        <span className="admin-settings-row__value">{row.value}</span>
        <span className={`admin-settings-badge admin-settings-badge--${String(row.status || 'standard').toLowerCase().replace(/\s+/g, '-')}`}>
          {row.status}
        </span>
        <ChevronRight size={15} className="admin-settings-row__chevron" />
      </span>
    </button>
  );

  const renderSettingsCard = (section) => {
    const Icon = section.icon;

    return (
      <article className="admin-settings-card" key={section.title}>
        <div className="admin-settings-card__header">
          <span className="admin-settings-card__icon">
            <Icon size={18} strokeWidth={2} />
          </span>
          <div>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </div>
          <button
            type="button"
            className="admin-settings-card__action"
            onClick={() => section.key && openSettingsModal({
              settingKey: section.key,
              label: section.title,
              helper: section.description,
              fields: Object.keys(defaultAdminSettings[section.key] || {}),
            })}
          >
            {section.action}
          </button>
        </div>
        <div className="admin-settings-card__rows">
          {section.rows.map(renderSettingsRow)}
        </div>
      </article>
    );
  };

  const renderCampaignTable = (campaigns, title, emptyMessage, variant = 'all') => (
    <div className="fade-in admin-table-wrapper">
      <div className="table-header-bar">
        <h4>{title} ({campaigns.length})</h4>
      </div>
      {campaigns.length === 0 ? (
        <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
          {emptyMessage}
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Créateur</th>
              <th>Catégorie</th>
              <th>Objectif</th>
              <th>Collecte</th>
              <th>Statut</th>
              <th>Créée le</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(campaign => (
              <tr key={campaign.id}>
                <td className="cell-primary">{campaign.title}</td>
                <td className="cell-secondary">{campaign.creator_name}</td>
                <td className="cell-secondary">{campaign.category || 'Non catégorisé'}</td>
                <td className="cell-primary">{(campaign.target_amount / 1000).toLocaleString()} DT</td>
                <td>
                  <div className="cell-primary">{(Number(campaign.current_amount || 0) / 1000).toLocaleString('fr-FR')} DT</div>
                  <div className="cell-secondary">{campaign.paid_donation_count || 0} soutien{campaign.paid_donation_count > 1 ? 's' : ''} archive{campaign.paid_donation_count > 1 ? 's' : ''}</div>
                </td>
                <td>
                  <span className={`status-badge ${getCampaignStatusClass(campaign.status)}`}>
                    {formatCampaignStatus(campaign.status)}
                  </span>
                </td>
                <td className="cell-secondary">{new Date(campaign.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  {campaign.status === 'ACTIVE' ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="action-btn" onClick={() => handleOpenEditCampaign(campaign)}>
                        Modifier
                      </button>
                      <button className="action-btn" onClick={() => handleOpenCampaignComments(campaign)} style={{ color: '#22c55e' }}>
                        Commentaires
                      </button>
                      <button className="action-btn" onClick={() => handleDeleteCampaign(campaign)} style={{ color: '#f97316' }}>
                        Supprimer
                      </button>
                    </div>
                  ) : campaign.status === 'DRAFT' || campaign.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {campaign.status === 'PENDING' && variant !== 'all' && (
                        <>
                          <button className="action-btn" onClick={() => handleApprove(campaign.id)}>Approuver</button>
                          <button className="action-btn" onClick={() => setViewModal({ isOpen: true, campaign })} style={{ color: '#0ea5e9' }}>Détails</button>
                          <button className="action-btn" onClick={() => handleRejectClick(campaign.id)} style={{ color: '#ef4444' }}>Refuser</button>
                        </>
                      )}
                      <button className="action-btn" onClick={() => handleDeleteCampaign(campaign)} style={{ color: '#f97316' }}>
                        Supprimer
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Non modifiable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="admin-wrapper">

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Sidebar â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <button type="button" className="admin-brand" onClick={() => onNavigate('home')}>
            <span className="admin-brand__mark" aria-hidden="true">
              <img src="/hive-logo-mark.png" alt="" />
            </span>
            <span className="admin-brand__copy">
              <span className="admin-brand__name">Hive.tn</span>
              <span className="admin-brand__meta">Back-office admin</span>
            </span>
          </button>
        </div>

        <nav className="admin-nav" aria-label="Navigation admin">
          <div className="admin-nav-section">
            <div className="admin-nav-section-items">
              {renderNavItem({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard })}
              {renderNavItem({
                id: 'campaigns',
                label: 'Campagnes',
                icon: Megaphone,
                count: allCampaigns.length,
                activeIds: ['campaigns', 'moderation', 'drafts', 'rejected'],
              })}
              {renderNavItem({
                id: 'transactions',
                label: 'Transactions',
                icon: CreditCard,
                count: pledges.length,
                navigateToId: 'pledges',
                activeIds: ['pledges', 'payments', 'refunds'],
              })}
              {renderNavItem({
                id: 'users',
                label: 'Utilisateurs',
                icon: Users,
                count: users.length,
                activeIds: ['users', 'roles'],
              })}
              {renderNavItem({
                id: 'support',
                label: 'Support',
                icon: LifeBuoy,
                count: openSupportTickets || 0,
                activeIds: ['support', 'reports'],
              })}
            </div>
          </div>

          <div className="admin-nav-section">
            <div className="admin-nav-section-items">
              {renderNavItem({ id: 'settings', label: 'Paramètres', icon: Settings })}
              {renderNavItem({ id: 'logs', label: 'Logs Admin', icon: ScrollText })}
            </div>
          </div>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="sidebar-profile-avatar" style={sidebarProfile.avatar ? { background: `url(${sidebarProfile.avatar}) center/cover`, color: 'transparent' } : {}}>
            {sidebarProfile.avatar ? '' : sidebarProfile.initials}
          </div>
          <div className="sidebar-profile-content">
            <div className="sidebar-profile-row">
              <div className="sidebar-profile-name">{sidebarProfile.name}</div>
              <span className="sidebar-profile-role">{sidebarProfile.role}</span>
            </div>
            <div className="sidebar-profile-email">{sidebarProfile.email}</div>
          </div>
        </div>
      </aside>

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Main Content â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <main className="admin-main">

        <header className="admin-header">
          <div className="admin-header-left">
            <div>
              <p className="admin-header-kicker">Back-office Hive.tn</p>
              <h1 className="admin-header-title">Dashboard Admin</h1>
              <p className="admin-header-subtitle">
                Vue consolidée des campagnes, transactions et opérations à traiter.
              </p>
            </div>
          </div>
          <div className="admin-header-actions">
            <div className="admin-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <button className="btn-primary" onClick={handleExitAdmin}>Quitter l'Admin</button>
          </div>
        </header>

        <section className="admin-content">

          {/* â”€â”€ TAB: Dashboard â”€â”€ */}
          {activeTab === 'dashboard' && (
            <div className="fade-in dashboard-overview">
              <section className="dashboard-showcase">
                <div className="dashboard-showcase__header">
                  <div>
                    <span className="dashboard-showcase__eyebrow">Dashboard admin</span>
                    <h2>Vue de synthèse de la plateforme</h2>
                    <p>Une lecture plus claire des chiffres clés et de la répartition des campagnes, adaptée au style visuel de Hive.tn.</p>
                  </div>
                  <div className="dashboard-showcase__brand-block">
                    <div className="dashboard-showcase__brand-card">
                      <img
                        src="/hive-logo-mark.png"
                        alt="Logo Hive.tn"
                        className="dashboard-showcase__brand-logo"
                      />
                      <div className="dashboard-showcase__brand-copy">
                        <strong>Hive.tn</strong>
                        <span>Console d'administration</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-metrics-grid">
                  {dashboardPrimaryMetrics.map(renderDashboardMetricCard)}
                </div>
              </section>

              <section className="dashboard-chart-grid">
                <article className="dashboard-visual-card">
                  <div className="dashboard-visual-card__header">
                    <div>
                      <h3>Fonds par catégorie</h3>
                      <p>Montants déjà collectés en DT, regroupés par catégorie de campagne.</p>
                    </div>
                    <span className="dashboard-visual-card__pill">
                      {fundsByCategory.reduce((sum, item) => sum + item.amount, 0).toLocaleString('fr-FR')} DT
                    </span>
                  </div>

                  {fundsByCategory.length === 0 ? (
                    <p className="dashboard-empty-state">Aucune donnée de catégorie disponible.</p>
                  ) : (
                    <div className="dashboard-bar-chart">
                      <div className="dashboard-bar-chart__axis">
                        {fundsChartTicks.map((tick) => (
                          <span key={tick}>{tick.toLocaleString('fr-FR')} DT</span>
                        ))}
                      </div>
                      <div className="dashboard-bar-chart__plot">
                        <div className="dashboard-bar-chart__grid">
                          {fundsChartTicks.slice(0, -1).map((tick) => (
                            <span key={tick}></span>
                          ))}
                        </div>
                        <div className="dashboard-bar-chart__bars">
                          {fundsByCategory.map((item, index) => (
                            <div className="dashboard-bar-chart__item" key={item.name}>
                              <span className="dashboard-bar-chart__value">{Math.round(item.amount).toLocaleString('fr-FR')} DT</span>
                              <div className="dashboard-bar-chart__track">
                                <div
                                  className="dashboard-bar-chart__fill-wrap"
                                  style={{
                                    height: `${fundsChartMax > 0 ? (item.amount / fundsChartMax) * 100 : 0}%`,
                                  }}
                                >
                                  <span className="dashboard-bar-chart__tooltip">
                                    <strong>{item.name}</strong>
                                    <span>Valeur : {item.amount.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} DT</span>
                                  </span>
                                  <span
                                    className="dashboard-bar-chart__fill"
                                    style={{
                                      '--bar-accent-index': index,
                                    }}
                                  ></span>
                                </div>
                              </div>
                              <span className="dashboard-bar-chart__label" title={item.name}>{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </article>

                <article className="dashboard-visual-card">
                  <div className="dashboard-visual-card__header">
                    <div>
                      <h3>Répartition des campagnes</h3>
                      <p>État du pipeline global entre modération, publication et clôture.</p>
                    </div>
                    <span className="dashboard-visual-card__pill">
                      {totalStatusSegments.toLocaleString('fr-FR')} campagnes
                    </span>
                  </div>

                  {statusChartSegments.length === 0 ? (
                    <p className="dashboard-empty-state">Aucune donnée de statut disponible.</p>
                  ) : (
                    <div className="dashboard-distribution">
                      <div className="dashboard-distribution__chart">
                        <div className="dashboard-donut-chart">
                          <svg viewBox="0 0 240 240" className="dashboard-donut-chart__svg" aria-label="Répartition des campagnes">
                            {statusChartArcs.map((segment) => (
                              <path
                                key={segment.key}
                                d={segment.path}
                                fill={segment.color}
                                className={`dashboard-donut-chart__segment ${hoveredStatusSegment?.key === segment.key ? 'is-active' : ''}`}
                                onMouseEnter={() => setHoveredStatusSegment(segment)}
                                onMouseLeave={() => setHoveredStatusSegment((current) => (current?.key === segment.key ? null : current))}
                              />
                            ))}
                          </svg>
                          <div className="dashboard-donut-chart__center">
                            <strong>{totalStatusSegments}</strong>
                            <span>Total</span>
                          </div>
                          {hoveredStatusSegment && (
                            <div
                              className="dashboard-donut-chart__tooltip"
                              style={{
                                left: `${hoveredStatusSegment.tooltipLeft}px`,
                                top: `${hoveredStatusSegment.tooltipTop}px`,
                              }}
                            >
                              <strong>{hoveredStatusSegment.label} : {hoveredStatusSegment.value}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="dashboard-distribution__legend">
                        {statusChartSegments.map((segment) => (
                          <div
                            className="dashboard-distribution__legend-item"
                            key={segment.key}
                            onMouseEnter={() => {
                              const matchingSegment = statusChartArcs.find((arc) => arc.key === segment.key);
                              if (matchingSegment) setHoveredStatusSegment(matchingSegment);
                            }}
                            onMouseLeave={() => setHoveredStatusSegment((current) => (current?.key === segment.key ? null : current))}
                          >
                            <span className="dashboard-distribution__swatch" style={{ backgroundColor: segment.color }}></span>
                            <div>
                              <strong>{segment.label}</strong>
                              <span>{segment.value} campagne{segment.value > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              </section>

              <section className="dashboard-summary-grid">
                <article className="dashboard-summary-card">
                  <div className="dashboard-summary-card__header">
                    <h3>Priorités du jour</h3>
                    <p>Accès rapides vers les points qui demandent une action admin.</p>
                  </div>
                  <div className="dashboard-priority-list">
                    {dashboardAlerts.map((alert) => (
                      <button
                        type="button"
                        className={`dashboard-priority-item dashboard-priority-item--${alert.level}`}
                        key={alert.id}
                        onClick={() => handleAdminTabChange(alert.tab)}
                      >
                        <span className="dashboard-priority-item__dot"></span>
                        <span className="dashboard-priority-item__content">
                          <strong>{alert.title}</strong>
                          <span>{alert.text}</span>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </article>

                <article className="dashboard-summary-card">
                  <div className="dashboard-summary-card__header">
                    <h3>Activité récente</h3>
                    <p>Derniers événements remontés depuis les campagnes, paiements et comptes.</p>
                  </div>
                  {recentActivities.length === 0 ? (
                    <p className="dashboard-empty-state">Aucune activité récente à afficher.</p>
                  ) : (
                    <div className="dashboard-activity-list">
                      {recentActivities.slice(0, 4).map((activity) => {
                        const Icon = activity.icon;
                        return (
                          <article className="dashboard-activity-entry" key={activity.id}>
                            <span className="dashboard-activity-entry__icon"><Icon size={15} strokeWidth={2} /></span>
                            <div className="dashboard-activity-entry__content">
                              <div className="dashboard-activity-entry__top">
                                <strong>{activity.type}</strong>
                                <time>{formatActivityDate(activity.date)}</time>
                              </div>
                              <p>{activity.title}</p>
                              <span>{activity.meta}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </article>
              </section>
            </div>
          )}

          {/* â”€â”€ TAB: Modération â”€â”€ */}
          {activeTab === 'moderation' && (
            <div className="fade-in admin-moderation-module">
              <section className="admin-moderation-hero">
                <div className="admin-moderation-hero__copy">
                  {renderDashboardSectionHeader(
                    'Modération des campagnes',
                    'Centralisez les décisions éditoriales, priorisez les soumissions sensibles et traitez les demandes en quelques clics.'
                  )}
                </div>
                <div className="admin-moderation-hero__stats">
                  <article>
                    <strong>{statusCounts.pending}</strong>
                    <span>En attente</span>
                  </article>
                  <article>
                    <strong>{statusCounts.rejected}</strong>
                    <span>Refusées</span>
                  </article>
                  <article>
                    <strong>{moderationCampaigns.length}</strong>
                    <span>Campagnes suivies</span>
                  </article>
                </div>
              </section>

              <section className="admin-moderation-toolbar">
                <div className="admin-moderation-tabs" role="tablist" aria-label="Filtres de modération">
                  {moderationTabItems.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={moderationFilters.statusTab === tab.key}
                      className={`admin-moderation-tab ${moderationFilters.statusTab === tab.key ? 'is-active' : ''}`}
                      onClick={() => setModerationFilters((prev) => ({ ...prev, statusTab: tab.key }))}
                    >
                      <span>{tab.label}</span>
                      <strong>{tab.count}</strong>
                    </button>
                  ))}
                </div>

                <div className="filter-bar-controls admin-moderation-filters">
                  <div className="filter-search">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Rechercher un titre, créateur ou catégorie..."
                      value={moderationFilters.search}
                      onChange={(e) => setModerationFilters((prev) => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                  <div className="filter-dropdowns">
                    <select
                      value={moderationFilters.category}
                      onChange={(e) => setModerationFilters((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Toutes les catégories</option>
                      {moderationCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select
                      value={moderationFilters.sort}
                      onChange={(e) => setModerationFilters((prev) => ({ ...prev, sort: e.target.value }))}
                    >
                      <option value="newest">Plus récentes</option>
                      <option value="oldest">Plus anciennes</option>
                      <option value="goal">Objectif le plus élevé</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="admin-table-wrapper mod-campaigns-table admin-moderation-table-card">
              <div className="table-header-bar">
                <h4>{filteredModerationCampaigns.length} campagne{filteredModerationCampaigns.length > 1 ? 's' : ''} affichée{filteredModerationCampaigns.length > 1 ? 's' : ''}</h4>
              </div>
              {filteredModerationCampaigns.length === 0 ? (
                <div className="table-empty-state">
                  <ShieldCheck size={40} className="empty-icon" />
                  <h4>Aucune campagne à modérer avec ces filtres</h4>
                  <p>Ajustez les onglets ou la recherche pour retrouver une soumission pertinente.</p>
                </div>
              ) : (
                <div className="admin-moderation-table-scroll">
                  <table className="admin-table enhanced-table moderation-table">
                    <thead>
                      <tr>
                        <th>Campagne</th>
                        <th>Créateur</th>
                        <th>Objectif</th>
                        <th>Catégorie</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModerationCampaigns.map((camp) => {
                        const mediaUrl = resolveMediaUrl(camp.image_url);
                        return (
                          <tr key={camp.id} className="enhanced-row">
                            <td>
                              <div className="cell-title-group">
                                <div className="campaign-thumbnail moderation-thumbnail">
                                  {mediaUrl ? (
                                    <img src={mediaUrl} alt={camp.title || 'Campagne'} />
                                  ) : (
                                    <div className="thumb-placeholder"><Megaphone size={16} /></div>
                                  )}
                                </div>
                                <div className="campaign-title-info">
                                  <strong>{camp.title || 'Sans titre'}</strong>
                                  <small>
                                    {camp.created_at
                                      ? `Soumise le ${new Date(camp.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                      : 'Date de soumission indisponible'}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="cell-primary">{camp.creator_name || 'Créateur inconnu'}</div>
                              <div className="cell-secondary">{camp.creator_email || 'Email indisponible'}</div>
                            </td>
                            <td className="cell-primary">{((camp.target_amount || 0) / 1000).toLocaleString('fr-FR')} DT</td>
                            <td><span className="category-badge">{camp.category || 'Sans catégorie'}</span></td>
                            <td>
                              <span className={`status-badge modern-badge badge-${camp.status?.toLowerCase() || 'default'}`}>
                                {getCampaignStatusLabel(camp.status) || 'Statut inconnu'}
                              </span>
                            </td>
                            <td>{renderModerationActions(camp)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          )}

          {/* â”€â”€ TAB: Toutes les campagnes (Reworked) â”€â”€ */}
          {activeTab === 'campaigns' && (
            <div className="fade-in admin-campaigns-module">
              
              {/* KPI Summary Cards */}
              <div className="kpi-summary-cards">
                <article className="kpi-card">
                  <span className="kpi-label">Total campagnes</span>
                  <strong className="kpi-value">{allCampaigns.length}</strong>
                </article>
                <article className="kpi-card">
                  <span className="kpi-label">Actives</span>
                  <strong className="kpi-value active-val">{activeCampaigns}</strong>
                </article>
                <article className="kpi-card">
                  <span className="kpi-label">En attente</span>
                  <strong className="kpi-value pending-val">{statusCounts.pending}</strong>
                </article>
                <article className="kpi-card">
                  <span className="kpi-label">Brouillons</span>
                  <strong className="kpi-value draft-val">{statusCounts.draft}</strong>
                </article>
              </div>

              <section className="admin-moderation-toolbar admin-campaigns-status-toolbar">
                <div className="admin-moderation-tabs" role="tablist" aria-label="Filtres des campagnes">
                  {campaignTabItems.map((tab) => (
                    <button
                      key={tab.label}
                      type="button"
                      role="tab"
                      aria-selected={campFilters.status === tab.key}
                      className={`admin-moderation-tab ${campFilters.status === tab.key ? 'is-active' : ''}`}
                      onClick={() => {
                        setCampFilters((prev) => ({ ...prev, status: tab.key }));
                        setCampPage(1);
                      }}
                    >
                      <span>{tab.label}</span>
                      <strong>{tab.count}</strong>
                    </button>
                  ))}
                </div>
              </section>

              {/* Filter Bar */}
              <div className="filter-bar-controls">
                <div className="filter-search">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Rechercher une campagne..."
                    value={campFilters.search}
                    onChange={(e) => { setCampFilters(prev => ({ ...prev, search: e.target.value })); setCampPage(1); }}
                  />
                </div>
                <div className="filter-dropdowns">
                  <SortMenu
                    value={campFilters.category}
                    options={[
                      { value: '', label: 'Toutes Catégories' },
                      ...uniqueCategories.map((cat) => ({ value: cat, label: cat })),
                    ]}
                    label="Catégorie des campagnes"
                    className="admin-sort-menu--category"
                    onChange={(category) => {
                      setCampFilters((prev) => ({ ...prev, category }));
                      setCampPage(1);
                    }}
                  />
                  <SortMenu
                    value={campFilters.sort}
                    options={campaignSortOptions}
                    label="Tri des campagnes"
                    className="admin-sort-menu--sort"
                    onChange={(sort) => {
                      setCampFilters((prev) => ({ ...prev, sort }));
                      setCampPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Enhanced Table Workspace */}
              <div className="admin-table-wrapper mod-campaigns-table">
                {paginatedCamps.length === 0 ? (
                  <div className="table-empty-state">
                    <Megaphone size={40} className="empty-icon" />
                    <h4>Aucune campagne trouvée</h4>
                    <p>Modifiez vos critères de recherche ou de filtre.</p>
                  </div>
                ) : (
                  <>
                    <table className="admin-table enhanced-table">
                      <thead>
                        <tr>
                          <th>Titre</th>
                          <th>Collecte / Objectif</th>
                          <th>Statut</th>
                          <th>Créée le</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCamps.map(campaign => {
                          const goal = campaign.target_amount || 0;
                          const collected = (campaign.current_amount || 0);
                          let pct = goal > 0 ? Math.round((collected / goal) * 100) : 0;
                          pct = Math.min(100, Math.max(0, pct));
                          const thumbnailUrl = resolveMediaUrl(campaign.image_url);

                          return (
                            <tr key={campaign.id} className="enhanced-row">
                              <td>
                                <div className="cell-title-group">
                                  <div className="campaign-thumbnail">
                                    {thumbnailUrl ? (
                                      <img src={thumbnailUrl} alt="Thumbnail" />
                                    ) : (
                                      <div className="thumb-placeholder"><Megaphone size={16} /></div>
                                    )}
                                  </div>
                                  <div className="campaign-title-info">
                                    <strong>{campaign.title || 'Campagne sans titre'}</strong>
                                    <small>{campaign.creator_name || 'Créateur inconnu'}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="cell-progress">
                                  <div className="progress-numbers">
                                    <strong>{(collected / 1000).toLocaleString('fr-FR')} DT</strong>
                                    <span> / {(goal / 1000).toLocaleString('fr-FR')} DT</span>
                                  </div>
                                  <div className="campaign-progress-bar">
                                    <div className="campaign-progress-fill" style={{ width: `${pct}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge modern-badge badge-${campaign.status?.toLowerCase() || 'default'}`}>
                                  {formatCampaignStatus(campaign.status)}
                                </span>
                              </td>
                              <td className="cell-secondary">
                                {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
                              </td>
                              <td>
                                <div className="cell-actions-iconic campaign-row-actions">
                                  {campaign.status === 'PENDING' && (
                                    <>
                                      <button
                                        type="button"
                                        className="campaign-row-actions__decision campaign-row-actions__decision--approve"
                                        onClick={() => handleApprove(campaign.id)}
                                      >
                                        Approuver
                                      </button>
                                      <button
                                        type="button"
                                        className="campaign-row-actions__decision campaign-row-actions__decision--reject"
                                        onClick={() => handleRejectClick(campaign.id)}
                                      >
                                        Rejeter
                                      </button>
                                    </>
                                  )}
                                  <button className="icon-btn btn-view" title="Voir l'aperçu complet" onClick={() => handleOpenCampaignPreview(campaign)}>
                                    <Eye size={18} />
                                  </button>
                                  {['ACTIVE', 'PENDING', 'DRAFT'].includes(campaign.status) && (
                                    <>
                                      <button className="icon-btn btn-edit" title="Modifier" onClick={() => handleOpenEditCampaign(campaign)}>
                                        <Edit2 size={18} />
                                      </button>
                                      <button className="icon-btn btn-comments" title="Commentaires" onClick={() => handleOpenCampaignComments(campaign)}>
                                        <MessageSquare size={18} />
                                      </button>
                                      <button className="icon-btn btn-delete" title="Supprimer" onClick={() => handleDeleteCampaign(campaign)}>
                                        <Trash2 size={18} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {/* Pagination */}
                    {totalCampPages > 1 && (
                      <div className="table-pagination">
                        <span className="pagination-info">
                          {'Affichage de '}
                          {((currentCampPage - 1) * campItemsPerPage) + 1}
                          {' \u00e0 '}
                          {Math.min(currentCampPage * campItemsPerPage, filteredCamps.length)}
                          {' sur '}
                          {filteredCamps.length}
                          {' campagnes'}
                        </span>
                        <div className="pagination-controls">
                          <button 
                            disabled={currentCampPage === 1} 
                            onClick={() => setCampPage(p => Math.max(1, p - 1))}
                          >
                            <ChevronLeft size={16} /> {'Pr\u00e9c\u00e9dent'}
                          </button>
                          <span className="page-indicator">Page {currentCampPage} / {totalCampPages}</span>
                          <button 
                            disabled={currentCampPage === totalCampPages} 
                            onClick={() => setCampPage(p => Math.min(totalCampPages, p + 1))}
                          >
                            Suivant <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'drafts' && renderCampaignTable(
            draftCampaigns,
            'Campagnes brouillons',
            'Aucune campagne brouillon pour le moment.',
            'drafts'
          )}

          {activeTab === 'rejected' && renderCampaignTable(
            rejectedCampaigns,
            'Campagnes rejetées',
            'Aucune campagne rejetée pour le moment.',
            'rejected'
          )}

          {activeTab === 'support' && (
            <AdminSupportWorkspace />
          )}

          {activeTab === 'reports' && renderPlaceholder({
            icon: Flag,
            title: 'Signalements',
            description: "L'espace signalements est prêt à accueillir les futurs rapports utilisateurs, contenus abusifs et workflows de modération.",
            items: [
              { title: 'File de traitement', text: 'Priorité, statut, responsable et historique seront centralisés ici.' },
              { title: 'Contexte relié', text: 'Chaque signalement pourra pointer vers une campagne, un commentaire ou un utilisateur.' },
            ],
          })}

          {activeTab === 'pledges' && (
            <div className="fade-in admin-table-wrapper">
              <div className="table-header-bar">
                <h4>Tous les soutiens ({pledges.length})</h4>
              </div>
              {pledges.length === 0 ? (
                <p style={{ color: '#a1a1aa', padding: '40px', textAlign: 'center' }}>
                  Aucun soutien enregistré pour le moment.
                </p>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Montant</th>
                      <th>Statut</th>
                      <th>Utilisateur</th>
                      <th>Campagne</th>
                      <th>Créateur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pledges.map((pledge) => (
                      <tr key={pledge.id}>
                        <td className="cell-secondary">
                          {(pledge.paid_at || pledge.created_at) ? new Date(pledge.paid_at || pledge.created_at).toLocaleString('fr-FR') : 'Non disponible'}
                        </td>
                        <td>
                          <div className="cell-primary">
                            {pledge.provider === 'legacy'
                              ? 'Soutien direct'
                              : pledge.provider === 'manual'
                                ? 'Support archive'
                                : 'Archive'}
                          </div>
                          <div className="cell-secondary">{pledge.provider_payment_ref || pledge.provider_order_id || pledge.provider_short_id || '-'}</div>
                        </td>
                        <td className="cell-primary">
                          {(Number(pledge.amount || 0) / 1000).toLocaleString('fr-FR')} DT
                        </td>
                        <td>
                          <span className={`status-badge ${getPledgeStatusClass(pledge.status)}`}>
                            {formatPledgeStatus(pledge.status)}
                          </span>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.donor_name || 'Utilisateur inconnu'}</div>
                          <div className="cell-secondary">{pledge.donor_email || '-'}</div>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.campaign_title || 'Campagne inconnue'}</div>
                          <div className="cell-secondary">{pledge.campaign_category || 'Sans catégorie'} · {formatCampaignStatus(pledge.campaign_status)}</div>
                        </td>
                        <td>
                          <div className="cell-primary">{pledge.creator_name || 'Créateur inconnu'}</div>
                          <div className="cell-secondary">{pledge.creator_email || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'payments' && renderPlaceholder({
            icon: CreditCard,
            title: 'Paiements',
            description: 'Structure prête pour le suivi détaillé des paiements, rapprochements prestataire et statuts de règlement.',
            items: [
              { title: 'Transactions prestataire', text: 'Référence, montant, statut, frais et date de confirmation.' },
              { title: 'Contrôles opérationnels', text: 'Filtres par période, campagne, utilisateur et source de paiement.' },
            ],
          })}

          {activeTab === 'refunds' && renderPlaceholder({
            icon: Undo2,
            title: 'Remboursements',
            description: 'Module réservé aux remboursements futurs avec workflow de demande, validation et trace admin.',
            items: [
              { title: 'Demandes', text: 'Motif, montant, initiateur et statut du remboursement.' },
              { title: 'Audit', text: 'Chaque décision pourra être historisée dans les logs admin.' },
            ],
          })}
          {/* â”€â”€ TAB: Users â”€â”€ */}
          {activeTab === 'users' && (
            <div className="fade-in admin-users-module">
              <section className="admin-users-hero">
                <div className="admin-users-hero__stats">
                  <article className="kpi-card admin-users-stat-card admin-users-stat-card--total">
                    <div className="admin-users-stat-card__top">
                      <span className="admin-users-stat-card__icon">
                        <Users size={18} strokeWidth={2} />
                      </span>
                      <span className="kpi-label">Total utilisateurs</span>
                    </div>
                    <strong className="kpi-value">{users.length}</strong>
                    <small>Comptes inscrits sur Hive.tn</small>
                  </article>
                  <article className="kpi-card admin-users-stat-card admin-users-stat-card--admins">
                    <div className="admin-users-stat-card__top">
                      <span className="admin-users-stat-card__icon">
                        <ShieldCheck size={18} strokeWidth={2} />
                      </span>
                      <span className="kpi-label">Admins</span>
                    </div>
                    <strong className="kpi-value active-val">{adminUsers.length}</strong>
                    <small>Acces back-office actifs</small>
                  </article>
                  <article className="kpi-card admin-users-stat-card admin-users-stat-card--new">
                    <div className="admin-users-stat-card__top">
                      <span className="admin-users-stat-card__icon">
                        <UserPlus size={18} strokeWidth={2} />
                      </span>
                      <span className="kpi-label">Nouveaux 30j</span>
                    </div>
                    <strong className="kpi-value pending-val">{newUsersCount}</strong>
                    <small>Inscriptions récentes</small>
                  </article>
                </div>
                <div className="admin-users-hero__copy">
                  <div className="dashboard-section-header">
                    <h3>Gestion des utilisateurs</h3>
                    <p>Suivi rapide des comptes, rôles admin et nouvelles inscriptions.</p>
                    <button
                      type="button"
                      className="btn-primary admin-users-add-btn"
                      onClick={() => setCreateUserModal(prev => ({ ...prev, isOpen: true }))}
                    >
                      <UserPlus size={17} strokeWidth={2} />
                      Ajouter un utilisateur
                    </button>
                  </div>
                </div>
              </section>

              <div className="filter-bar-controls">
                <div className="filter-search">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={userFilters.search}
                    onChange={(e) => setUserFilters((prev) => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <div className="filter-dropdowns">
                  <select
                    value={userFilters.role}
                    onChange={(e) => setUserFilters((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="">Tous les rôles</option>
                    <option value="ADMIN">Admins</option>
                    <option value="USER">Utilisateurs</option>
                  </select>
                  <select
                    value={userFilters.sort}
                    onChange={(e) => setUserFilters((prev) => ({ ...prev, sort: e.target.value }))}
                  >
                    <option value="newest">Plus récents en premier</option>
                    <option value="oldest">Plus anciens en premier</option>
                    <option value="name">Nom A-Z</option>
                    <option value="role">Role A-Z</option>
                  </select>
                </div>
              </div>

              <div className="admin-table-wrapper admin-users-table-card">
                <div className="table-header-bar">
                  <h4>
                    Utilisateurs de la plateforme ({filteredUsers.length}
                    {filteredUsers.length !== users.length ? ` / ${users.length}` : ''})
                  </h4>
                </div>
                {filteredUsers.length === 0 ? (
                  <div className="table-empty-state admin-users-empty-state">
                    <Users size={40} className="empty-icon" />
                    <h4>Aucun utilisateur trouvé</h4>
                    <p>Ajustez la recherche ou les filtres pour retrouver un compte.</p>
                  </div>
                ) : (
                  <div className="admin-users-table-scroll">
                    <table className="admin-table enhanced-table admin-users-table">
                      <thead>
                        <tr>
                          <th>Utilisateur</th>
                          <th>Role</th>
                          <th>Email</th>
                          <th>Inscrit le</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => {
                          const isSelf = u.id === currentUser.id;
                          return (
                            <tr key={u.id} className="enhanced-row">
                              <td>
                                <div className="admin-user-cell">
                                  <div
                                    className="admin-user-avatar"
                                    style={u.avatar ? { backgroundImage: `url(${u.avatar})`, color: 'transparent' } : {}}
                                  >
                                    {!u.avatar && getUserInitials(u)}
                                  </div>
                                  <div className="admin-user-copy">
                                    <strong>{u.name || 'Utilisateur sans nom'}</strong>
                                    <small>{isSelf ? 'Compte connecté et protégé' : (u.bio || 'Compte plateforme Hive.tn')}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`status-badge modern-badge ${u.role === 'ADMIN' ? 'badge-active' : 'badge-default'}`}>
                                  {u.role === 'ADMIN' ? 'Admin' : 'User'}
                                </span>
                              </td>
                              <td className="cell-secondary">{u.email || 'Email indisponible'}</td>
                              <td className="cell-secondary">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date inconnue'}
                              </td>
                              <td>{renderUserActions(u, isSelf)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'roles' && renderPlaceholder({
            icon: ShieldCheck,
            title: 'Rôles & permissions',
            description: 'Base prête pour une gestion plus fine des permissions admin, modération, support et finance.',
            items: [
              { title: `${adminUsers.length} administrateur${adminUsers.length > 1 ? 's' : ''}`, text: 'Comptes disposant actuellement du rôle ADMIN.' },
              { title: `${users.length} utilisateur${users.length > 1 ? 's' : ''}`, text: 'Utilisateurs pouvant évoluer vers des rôles plus granulaires.' },
            ],
          })}

          {activeTab === 'analytics' && renderPlaceholder({
            icon: BarChart3,
            title: 'Analytics',
            description: 'Espace préparé pour les courbes de croissance, cohortes, conversion créateur et performance des campagnes.',
            items: [
              { title: 'Vue acquisition', text: 'Sources, inscriptions et création de campagnes.' },
              { title: 'Vue revenus', text: 'Soutiens payés, commission plateforme et tendances mensuelles.' },
            ],
          })}

          {activeTab === 'settings' && (
            <div className="fade-in admin-settings-page">
              <section className="admin-settings-hero">
                <div className="admin-settings-hero__title">
                  <span className="admin-settings-hero__icon">
                    <Settings size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <p>Configuration admin</p>
                    <h2>Paramètres</h2>
                    <span>Centralisez les règles plateforme, modération, support et sécurité de Hive.tn.</span>
                  </div>
                </div>
                <div className="admin-settings-hero__stats">
                  <div>
                    <strong>{settingsSections.length}</strong>
                    <span>sections</span>
                  </div>
                  <div>
                    <strong>{settingsSections.reduce((count, section) => count + section.rows.length, 0)}</strong>
                    <span>règles suivies</span>
                  </div>
                  <div>
                    <strong>{adminUsers.length}</strong>
                    <span>admins</span>
                  </div>
                </div>
              </section>

              <section className="admin-settings-summary">
                <article>
                  <span className="status-badge actif">Actif</span>
                  <strong>Configuration opérationnelle</strong>
                  <p>Les paramètres essentiels sont représentés pour piloter les décisions admin sans quitter le back-office.</p>
                </article>
                <article>
                  <span className="status-badge attente">A surveiller</span>
                  <strong>{statusCounts.pending} campagne{statusCounts.pending > 1 ? 's' : ''} en attente</strong>
                  <p>Les files de modération et support restent accessibles directement depuis les lignes de configuration.</p>
                </article>
              </section>

              {settingsLoading && (
                <div className="admin-settings-feedback">Chargement des paramètres...</div>
              )}

              {settingsError && (
                <div className="admin-settings-feedback admin-settings-feedback--error">{settingsError}</div>
              )}

              {settingsFeedback && (
                <div className="admin-settings-feedback admin-settings-feedback--success">{settingsFeedback}</div>
              )}

              <section className="admin-settings-grid">
                {settingsSections.map(renderSettingsCard)}
              </section>

              <section className="admin-settings-danger">
                <div>
                  <span className="admin-settings-danger__label">Actions sensibles</span>
                  <h3>Opérations critiques</h3>
                  <p>Ces actions doivent rester réservées aux administrateurs autorisés et être tracées dans les logs admin.</p>
                </div>
                <div className="admin-settings-danger__actions">
                  <button type="button" onClick={() => handleAdminTabChange('logs')}>Voir les logs</button>
                  <button type="button" onClick={() => handleAdminTabChange('roles')}>Vérifier les rôles</button>
                </div>
              </section>
            </div>
          )}

          {false && activeTab === 'settings' && renderPlaceholder({
            icon: Settings,
            title: 'Paramètres',
            description: 'Module prêt pour les paramètres globaux Hive.tn, règles de commission, modération et notifications.',
            items: [
              { title: 'Plateforme', text: "Commission, seuils, catégories et règles d'éligibilité." },
              { title: 'Opérations', text: 'Emails système, SLA support et préférences admin.' },
            ],
          })}

          {false && activeTab === 'logs' && renderPlaceholder({
            icon: ScrollText,
            title: 'Logs Admin',
            description: 'Espace optionnel pour tracer les actions sensibles : validation, refus, suppression, changement de rôle et remboursements.',
            items: [
              { title: 'Traçabilité', text: 'Qui a fait quoi, quand, et sur quelle ressource.' },
              { title: 'Sécurité', text: 'Base exploitable pour audits internes et investigations.' },
            ],
          })}

          {activeTab === 'logs' && (
            <div className="fade-in admin-logs-page">
              <section className="admin-logs-hero">
                <div className="admin-logs-hero__title">
                  <span className="admin-logs-hero__icon">
                    <ScrollText size={20} strokeWidth={2} />
                  </span>
                  <div>
                    <p>Audit & sécurité</p>
                    <h2>Logs Admin</h2>
                    <span>Traçabilité des actions sensibles réalisées dans le back-office Hive.tn.</span>
                  </div>
                </div>
                <div className="admin-logs-kpis">
                  <article><strong>{adminLogsPagination.total}</strong><span>logs au total</span></article>
                  <article><strong>{todaysAdminLogsCount}</strong><span>sur cette page aujourd'hui</span></article>
                  <article><strong>{adminLogsFacets.action_types?.length || 0}</strong><span>types d'action</span></article>
                  <article><strong>{sensitiveAdminLogsCount}</strong><span>actions sensibles</span></article>
                </div>
              </section>

              <div className="dashboard-section-header admin-logs-section-header">
                <h3>Recherche et filtres</h3>
                <p>Isolez rapidement les actions critiques par type d événement, ressource, administrateur ou période.</p>
              </div>

              <section className="admin-logs-filters">
                <div className="admin-logs-search">
                  <Search size={16} />
                  <input
                    type="search"
                    value={adminLogsFilters.search}
                    onChange={(e) => updateAdminLogsFilter('search', e.target.value)}
                    placeholder="Rechercher un log..."
                  />
                </div>
                <select value={adminLogsFilters.actionType} onChange={(e) => updateAdminLogsFilter('actionType', e.target.value)}>
                  <option value="">Type d'action</option>
                  {(adminLogsFacets.action_types || []).map((action) => (
                    <option key={action} value={action}>{formatAdminAction(action)}</option>
                  ))}
                </select>
                <select value={adminLogsFilters.entityType} onChange={(e) => updateAdminLogsFilter('entityType', e.target.value)}>
                  <option value="">Type de ressource</option>
                  {(adminLogsFacets.entity_types || []).map((entity) => (
                    <option key={entity} value={entity}>{formatAdminEntity(entity)}</option>
                  ))}
                </select>
                <select value={adminLogsFilters.adminUserId} onChange={(e) => updateAdminLogsFilter('adminUserId', e.target.value)}>
                  <option value="">Administrateur</option>
                  {adminUsers.map((admin) => (
                    <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>
                  ))}
                </select>
                <input type="date" value={adminLogsFilters.dateFrom} onChange={(e) => updateAdminLogsFilter('dateFrom', e.target.value)} aria-label="Date de début" />
                <input type="date" value={adminLogsFilters.dateTo} onChange={(e) => updateAdminLogsFilter('dateTo', e.target.value)} aria-label="Date de fin" />
                <button type="button" className="action-btn" onClick={resetAdminLogsFilters}>Réinitialiser</button>
              </section>

              {adminLogsError && (
                <div className="admin-settings-feedback admin-settings-feedback--error">{adminLogsError}</div>
              )}

              <div className="dashboard-section-header admin-logs-section-header">
                <h3>Journal d'audit</h3>
                <p>Historique chronologique des opérations admin avec accès rapide au détail de chaque action.</p>
              </div>

              <section className="admin-logs-table-card">
                <div className="admin-logs-table-card__header">
                  <div>
                    <h3>Journal d'audit</h3>
                    <p>{adminLogsPagination.total} entrée{adminLogsPagination.total > 1 ? 's' : ''} trouvée{adminLogsPagination.total > 1 ? 's' : ''}</p>
                  </div>
                  <span className="admin-settings-badge admin-settings-badge--actif">Lecture seule</span>
                </div>

                {adminLogsLoading ? (
                  <div className="admin-logs-empty">Chargement des logs admin...</div>
                ) : adminLogs.length === 0 ? (
                  <div className="admin-logs-empty">Aucun log trouvé pour ces filtres.</div>
                ) : (
                  <div className="admin-table-wrapper admin-logs-table-wrapper">
                    <table className="admin-table admin-logs-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Admin</th>
                          <th>Action</th>
                          <th>Ressource</th>
                          <th>Cible</th>
                          <th>Description</th>
                          <th>Détails</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminLogs.map((log) => (
                          <tr key={log.id} className="enhanced-row">
                            <td>{formatAdminLogDate(log.created_at)}</td>
                            <td><strong>{log.admin_name || 'Admin supprimé'}</strong><div className="cell-secondary">{log.admin_email || 'Email indisponible'}</div></td>
                            <td><span className={`admin-log-action-badge admin-log-action-badge--${getAdminLogBadgeTone(log.action_type)}`}>{formatAdminAction(log.action_type)}</span></td>
                            <td><strong>{formatAdminEntity(log.entity_type)}</strong><div className="cell-secondary">{log.entity_id ? `ID ${String(log.entity_id).slice(0, 8)}` : 'Sans ID'}</div></td>
                            <td>{getAdminLogTarget(log)}</td>
                            <td className="admin-log-description">{log.description}</td>
                            <td><button type="button" className="action-btn" onClick={() => openAdminLogDetails(log)}><Eye size={14} /> Voir</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="admin-logs-pagination">
                  <span>Page {adminLogsPagination.page} sur {adminLogsPagination.totalPages}</span>
                  <div>
                    <button type="button" className="action-btn" disabled={adminLogsPagination.page <= 1 || adminLogsLoading} onClick={() => updateAdminLogsFilter('page', adminLogsPagination.page - 1)}>
                      <ChevronLeft size={14} /> Précédent
                    </button>
                    <button type="button" className="action-btn" disabled={adminLogsPagination.page >= adminLogsPagination.totalPages || adminLogsLoading} onClick={() => updateAdminLogsFilter('page', adminLogsPagination.page + 1)}>
                      Suivant <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

        </section>
      </main>

      {settingsModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-settings-modal">
            <div className="admin-settings-modal__header">
              <div>
                <h3 className="modal-title">{settingsModal.title || 'Modifier les paramètres'}</h3>
                <p className="modal-desc">{settingsModal.description || 'Ajustez la configuration admin.'}</p>
              </div>
              <button type="button" className="action-btn" onClick={closeSettingsModal}>
                <X size={16} />
              </button>
            </div>

            <div className="admin-settings-modal__fields">
              {(settingsModal.fields || []).map((field) => {
                const config = settingsFieldLabels[field] || { label: field, type: 'text' };
                const value = settingsDraft[field];

                if (config.type === 'boolean') {
                  return (
                    <label className="admin-settings-toggle-field" key={field}>
                      <span>
                        <strong>{config.label}</strong>
                        <small>{value ? 'Active' : 'Désactivé'}</small>
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) => setSettingsDraft((prev) => ({ ...prev, [field]: event.target.checked }))}
                      />
                    </label>
                  );
                }

                return (
                  <label className="admin-settings-modal__field" key={field}>
                    <span>{config.label}</span>
                    <input
                      type={config.type === 'number' ? 'number' : 'text'}
                      min={config.min}
                      max={config.max}
                      step={config.step}
                      value={value ?? ''}
                      onChange={(event) => setSettingsDraft((prev) => ({ ...prev, [field]: event.target.value }))}
                    />
                    {config.type === 'text-list' && (
                      <small>Séparez les valeurs par des virgules.</small>
                    )}
                  </label>
                );
              })}
            </div>

            {settingsError && (
              <div className="admin-settings-feedback admin-settings-feedback--error">{settingsError}</div>
            )}

            <div className="modal-actions">
              <button className="action-btn" onClick={closeSettingsModal}>Annuler</button>
              <button className="btn-primary" onClick={handleSaveSettings} disabled={settingsSaving}>
                {settingsSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Modal de Refus â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {selectedAdminLog && (
        <div className="modal-overlay admin-log-modal-overlay" onMouseDown={() => setSelectedAdminLog(null)}>
          <div className="modal-content admin-log-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-settings-modal__header">
              <div>
                <h3 className="modal-title">Détails du log</h3>
                <p className="modal-desc">Trace complète de l'action admin sélectionnée.</p>
              </div>
              <button type="button" className="action-btn admin-log-modal__close" onClick={() => setSelectedAdminLog(null)} aria-label="Fermer le détail du log">
                <X size={16} />
              </button>
            </div>

            {adminLogDetailLoading ? (
              <div className="admin-logs-empty">Chargement du détail...</div>
            ) : (
              <>
                <div className="admin-log-detail-grid">
                  <article>
                    <span>Date</span>
                    <strong>{formatAdminLogDate(selectedAdminLog.created_at)}</strong>
                  </article>
                  <article>
                    <span>Administrateur</span>
                    <strong>{selectedAdminLog.admin_name || 'Admin supprimé'}</strong>
                    <small>{selectedAdminLog.admin_email || 'Email indisponible'}</small>
                  </article>
                  <article>
                    <span>Action</span>
                    <strong>{formatAdminAction(selectedAdminLog.action_type)}</strong>
                    <small>{selectedAdminLog.action_type}</small>
                  </article>
                  <article>
                    <span>Ressource</span>
                    <strong>{formatAdminEntity(selectedAdminLog.entity_type)}</strong>
                    <small>{selectedAdminLog.entity_id || 'Sans identifiant'}</small>
                  </article>
                  <article>
                    <span>Cible</span>
                    <strong>{getAdminLogTarget(selectedAdminLog)}</strong>
                    <small>{selectedAdminLog.target_user_email || selectedAdminLog.target_campaign_title || 'Aucune cible jointe'}</small>
                  </article>
                  <article>
                    <span>Adresse IP</span>
                    <strong>{selectedAdminLog.ip_address || 'Non disponible'}</strong>
                  </article>
                </div>

                <div className="admin-log-detail-section">
                  <span>Description</span>
                  <p>{selectedAdminLog.description}</p>
                </div>
                <div className="admin-log-detail-section">
                  <span>Métadonnées</span>
                  <pre>{JSON.stringify(selectedAdminLog.metadata || {}, null, 2)}</pre>
                </div>
                <div className="admin-log-detail-section">
                  <span>Agent utilisateur</span>
                  <p>{selectedAdminLog.user_agent || 'Non disponible'}</p>
                </div>
              </>
            )}

            <div className="modal-actions">
              <button className="action-btn" onClick={() => setSelectedAdminLog(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {rejectModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Refuser la campagne</h3>
            <p className="modal-desc">
              Fournissez une raison détaillée. Celle-ci sera automatiquement envoyée par email au créateur de la campagne.
            </p>
            <textarea
              className="modal-textarea"
              placeholder="Ex : Le plan d'affaires est incomplet..."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
            />
            <div className="modal-actions">
              <button className="action-btn" onClick={() => setRejectModal({ isOpen: false, campaignId: null, reason: '' })}>Annuler</button>
              <button className="btn-reject-confirm" onClick={confirmRejection}>Envoyer le refus</button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€â”€â”€â”€â”€â”€â”€ Modal de Détails (View 360) â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {commentsModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-comments-modal">
            <div className="admin-comments-modal__header">
              <div>
                <h3 className="modal-title">Commentaires de campagne</h3>
                <p className="modal-desc">
                  {commentsModal.campaign?.title || 'Campagne'} · {commentsModal.comments.filter((comment) => !comment.is_deleted).length} visible(s)
                </p>
              </div>
              <button
                className="action-btn"
                onClick={() => setCommentsModal(emptyCommentsModal())}
              >
                Fermer
              </button>
            </div>

            {commentsModal.loading ? (
              <div className="admin-comments-empty">Chargement des commentaires...</div>
            ) : commentsModal.error ? (
              <div className="admin-comments-empty admin-comments-empty--error">{commentsModal.error}</div>
            ) : commentsModal.comments.length === 0 ? (
              <div className="admin-comments-empty">Aucun commentaire sur cette campagne pour le moment.</div>
            ) : (
              <div className="admin-comments-list">
                {commentsModal.comments.map((comment) => (
                  <article key={comment.id} className={`admin-comment-card ${comment.is_deleted ? 'is-deleted' : ''}`}>
                    <div className="admin-comment-card__meta">
                      <div>
                        <strong>{comment.author_name || 'Utilisateur inconnu'}</strong>
                        <span>{comment.author_email || 'Email indisponible'}</span>
                      </div>
                      <div className="admin-comment-card__aside">
                        <span>{comment.created_at ? new Date(comment.created_at).toLocaleString('fr-FR') : 'Date inconnue'}</span>
                        <span className={`admin-comment-status ${comment.is_deleted ? 'is-deleted' : 'is-active'}`}>
                          {comment.is_deleted ? 'Supprimé' : 'Visible'}
                        </span>
                      </div>
                    </div>
                    <p className="admin-comment-card__content">{comment.content}</p>
                    {!comment.is_deleted && (
                      <div className="admin-comment-card__actions">
                        <button
                          className="action-btn"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteAdminComment(comment)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {deleteCommentModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">✦</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer ce commentaire ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Ce commentaire disparaitra immediatement de la page publique de la campagne.
            </p>
            <div className="admin-delete-comment-modal__preview">
              {deleteCommentModal.comment?.content}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteCommentModal({ isOpen: false, comment: null })}
              >
                Garder le commentaire
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteAdminComment}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteCampaignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cette campagne ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Cette action retirera definitivement la campagne de la plateforme.
            </p>
            <div className="admin-delete-comment-modal__preview">
              <strong>{deleteCampaignModal.campaign?.title}</strong>
              <br />
              Statut : {deleteCampaignModal.campaign?.status || 'Inconnu'}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteCampaignModal({ isOpen: false, campaign: null })}
              >
                Garder la campagne
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteCampaign}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-delete-comment-modal">
            <div className="admin-delete-comment-modal__icon">!</div>
            <h3 className="modal-title admin-delete-comment-modal__title">Supprimer cet utilisateur ?</h3>
            <p className="modal-desc admin-delete-comment-modal__desc">
              Toutes ses campagnes seront également supprimées. Cette action est irréversible.
            </p>
            <div className="admin-delete-comment-modal__preview">
              <strong>{deleteUserModal.user?.name}</strong>
              <br />
              {deleteUserModal.user?.email}
            </div>
            <div className="modal-actions admin-delete-comment-modal__actions">
              <button
                className="action-btn"
                onClick={() => setDeleteUserModal({ isOpen: false, user: null })}
              >
                Annuler
              </button>
              <button className="btn-reject-confirm" onClick={confirmDeleteUser}>
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {feedbackModal.isOpen && (
        <div className="modal-overlay">
          <div className={`modal-content admin-feedback-modal admin-feedback-modal--${feedbackModal.variant}`}>
            <div className="admin-feedback-modal__icon">
              {feedbackModal.variant === 'error' ? '!' : feedbackModal.variant === 'warning' ? 'i' : '✓'}
            </div>
            <h3 className="modal-title admin-feedback-modal__title">{feedbackModal.title}</h3>
            <p className="modal-desc admin-feedback-modal__desc">{feedbackModal.message}</p>
            <div className="modal-actions admin-feedback-modal__actions">
              <button
                className="btn-primary"
                onClick={() => setFeedbackModal({ isOpen: false, title: '', message: '', variant: 'success' })}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {roleConfirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content admin-role-confirm-modal">
            <div className="admin-role-confirm-modal__icon">
              {roleConfirmModal.newRole === 'ADMIN' ? '↑' : '↓'}
            </div>
            <h3 className="modal-title admin-role-confirm-modal__title">
              {roleConfirmModal.newRole === 'ADMIN' ? 'Promouvoir cet utilisateur ?' : 'Retirer les droits admin ?'}
            </h3>
            <p className="modal-desc admin-role-confirm-modal__desc">
              {roleConfirmModal.newRole === 'ADMIN'
                ? `"${roleConfirmModal.user?.name}" obtiendra l accès complet au dashboard d'administration.`
                : `"${roleConfirmModal.user?.name}" repassera en rôle utilisateur standard.`}
            </p>
            <div className="modal-actions admin-role-confirm-modal__actions">
              <button
                className="action-btn"
                onClick={() => setRoleConfirmModal({ isOpen: false, user: null, newRole: 'USER' })}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={confirmToggleRole}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {createUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', width: '90%', textAlign: 'left' }}>
            <h3 className="modal-title">Ajouter un utilisateur</h3>
            <p className="modal-desc">
              Créez un compte local avec un rôle utilisateur ou admin.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Nom</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={createUserModal.name}
                    onChange={(e) => setCreateUserModal(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Role</label>
                  <select
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={createUserModal.role}
                    onChange={(e) => setCreateUserModal(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Email</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={createUserModal.email}
                    onChange={(e) => setCreateUserModal(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Mot de passe</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    type="password"
                    value={createUserModal.password}
                    onChange={(e) => setCreateUserModal(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Bio</label>
                <textarea
                  className="modal-textarea"
                  value={createUserModal.bio}
                  onChange={(e) => setCreateUserModal(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="action-btn" onClick={resetCreateUserModal}>
                Annuler
              </button>
              <button className="btn-primary" onClick={handleCreateUser}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {editCampaignModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '90%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>
            <h3 className="modal-title">Modifier une campagne active</h3>
            <p className="modal-desc">
              L'administrateur peut corriger les informations de base d'une campagne acceptée.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Image de campagne</label>
                <div className="admin-avatar-editor">
                  <label
                    className="admin-avatar-upload"
                    style={editCampaignModal.imagePreview ? {
                      backgroundImage: `url(${editCampaignModal.imagePreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent',
                    } : {}}
                  >
                    {editCampaignModal.imagePreview ? "Aperçu de l'image" : 'Choisir une image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditCampaignImageChange}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {editCampaignModal.imageFile ? 'Nouvelle image prête à être enregistrée. La vidéo sera retirée.' : "Une campagne ne peut garder qu'un seul média principal à la fois."}
                    </span>
                    {editCampaignModal.imagePreview && (
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditCampaignModal(prev => ({
                          ...prev,
                          imageUrl: '',
                          imagePreview: '',
                          imageFile: null,
                        }))}
                      >
                        Supprimer l'image
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Vidéo de campagne</label>
                <div className="admin-avatar-editor">
                  <label className="admin-avatar-upload admin-video-upload">
                    {editCampaignModal.videoPreview ? (
                      <video
                        src={editCampaignModal.videoPreview}
                        controls
                        className="admin-campaign-video-preview"
                      />
                    ) : (
                      'Choisir une vidéo'
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={handleEditCampaignVideoChange}
                    />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b949e', fontSize: '12px' }}>
                      {editCampaignModal.videoFile ? "Nouvelle vidéo prête à être enregistrée. L'image sera retirée." : "Une campagne ne peut garder qu'un seul média principal à la fois."}
                    </span>
                    {editCampaignModal.videoPreview && (
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditCampaignModal(prev => ({
                          ...prev,
                          videoUrl: '',
                          videoPreview: '',
                          videoFile: null,
                        }))}
                      >
                        Supprimer la vidéo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Titre</label>
                <input
                  className="modal-textarea"
                  style={{ minHeight: 'auto', height: '46px' }}
                  value={editCampaignModal.title}
                  onChange={(e) => setEditCampaignModal(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Description</label>
                <textarea
                  className="modal-textarea"
                  value={editCampaignModal.description}
                  onChange={(e) => setEditCampaignModal(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Catégorie</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editCampaignModal.category}
                    onChange={(e) => setEditCampaignModal(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Objectif (TND)</label>
                  <input
                    type="number"
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editCampaignModal.targetAmount}
                    onChange={(e) => setEditCampaignModal(prev => ({ ...prev, targetAmount: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ position: 'sticky', bottom: 0, background: '#161b22', paddingTop: '16px' }}>
              <button
                className="action-btn"
                onClick={() => setEditCampaignModal(emptyEditCampaignModal())}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSaveEditedCampaign}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {editUserModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '90%', textAlign: 'left' }}>
            <h3 className="modal-title">Modifier un utilisateur</h3>
            <p className="modal-desc">
              L'administrateur peut mettre à jour les informations du compte et le rôle.
            </p>

            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Nom</label>
                  <input
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editUserModal.name}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Role</label>
                  <select
                    className="modal-textarea"
                    style={{ minHeight: 'auto', height: '46px' }}
                    value={editUserModal.role}
                    onChange={(e) => setEditUserModal(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Email</label>
                <input
                  className="modal-textarea"
                  style={{ minHeight: 'auto', height: '46px' }}
                  value={editUserModal.email}
                  onChange={(e) => setEditUserModal(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Bio</label>
                <textarea
                  className="modal-textarea"
                  value={editUserModal.bio}
                  onChange={(e) => setEditUserModal(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', color: '#d1d5db', fontSize: '14px' }}>Avatar</label>
                <div className="admin-avatar-editor">
                  <label
                    className="admin-avatar-upload"
                    style={editUserModal.avatar ? {
                      backgroundImage: `url(${editUserModal.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'transparent',
                    } : {}}
                  >
                    {editUserModal.avatar ? 'Avatar actuel' : 'Choisir une image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleEditUserAvatarChange}
                    />
                  </label>
                  {editUserModal.avatar && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#8b949e', fontSize: '12px' }}>Aperçu de l'image actuelle</span>
                      <button
                        type="button"
                        className="action-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => setEditUserModal(prev => ({ ...prev, avatar: '' }))}
                      >
                        Supprimer l'image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="action-btn"
                onClick={() => setEditUserModal({
                  isOpen: false,
                  userId: null,
                  name: '',
                  email: '',
                  role: 'USER',
                  bio: '',
                  avatar: '',
                })}
              >
                Annuler
              </button>
              <button className="btn-primary" onClick={handleSaveEditedUser}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {viewModal.isOpen && viewModal.campaign && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '85vh', overflowY: 'auto', textAlign: 'left' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', color: '#fff', margin: 0 }}>Détails de la Campagne</h2>
              <button onClick={() => setViewModal({ isOpen: false, campaign: null })} style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Informations de base</h3>
              <p><strong>Titre :</strong> {viewModal.campaign.title}</p>
              <p><strong>Catégorie :</strong> {viewModal.campaign.category}</p>
              <p><strong>Objectif :</strong> {(viewModal.campaign.target_amount / 1000).toLocaleString()} TND</p>
              <p><strong>Date de création :</strong> {viewModal.campaign.created_at ? new Date(viewModal.campaign.created_at).toLocaleDateString('fr-FR') : 'Non disponible'}</p>
              <p><strong>Créateur :</strong> {viewModal.campaign.creator_name} ({viewModal.campaign.creator_email})</p>
              <div style={{ marginTop: '15px' }}>
                <strong>Sous-titre / Description :</strong>
                <p style={{ marginTop: '5px', color: '#d1d1d6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {viewModal.campaign.description || <span style={{ fontStyle: 'italic', color: '#6b7280' }}>Aucune description fournie.</span>}
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Récompenses Proposées</h3>
              {!viewModal.campaign.rewards || viewModal.campaign.rewards.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Aucune récompense ajoutée par le créateur.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {viewModal.campaign.rewards.map((rew, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {(rew.image || rew.image_url) && (
                        <img
                          src={resolveMediaUrl(rew.image || rew.image_url)}
                          alt={rew.title || `Recompense ${idx + 1}`}
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px' }}
                        />
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong style={{ fontSize: '16px', color: '#fff' }}>{rew.title}</strong>
                        <strong style={{ color: '#0ce688' }}>{rew.price} TND</strong>
                      </div>
                      {rew.desc && <p style={{ color: '#a1a1aa', fontSize: '14px', margin: 0 }}>{rew.desc}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', color: '#a1a1aa', marginBottom: '10px', textTransform: 'uppercase' }}>Histoire du projet</h3>
              <div style={{ color: '#d1d1d6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {viewModal.campaign.story ? (
                  viewModal.campaign.story
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#6b7280' }}>L'histoire détaillée n'est pas encore complétée.</span>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="action-btn" onClick={() => setViewModal({ isOpen: false, campaign: null })}>Fermer</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="action-btn" onClick={() => {
                  handleApprove(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Approuver</button>
                <button className="btn-reject-confirm" onClick={() => {
                  handleRejectClick(viewModal.campaign.id);
                  setViewModal({ isOpen: false, campaign: null });
                }}>Refuser</button>
              </div>
            </div>

          </div>
        </div>
      )}
    {/* â”€â”€ Side Panel Preview â”€â”€ */}
    {previewPanel.isOpen && previewPanel.campaign && (
      <>
        <div className="preview-panel-overlay" onClick={() => setPreviewPanel({ isOpen: false, campaign: null })}></div>
        <div className="preview-panel-drawer open">
          <div className="preview-panel-header">
            <h3>Aperçu de la Campagne</h3>
            <button className="icon-btn btn-close-panel" onClick={() => setPreviewPanel({ isOpen: false, campaign: null })}>
              <X size={20} />
            </button>
          </div>
          <div className="preview-panel-content">
            {resolveMediaUrl(previewPanel.campaign.image_url) ? (
              <img src={resolveMediaUrl(previewPanel.campaign.image_url)} alt="Visuel de campagne" className="preview-cover" />
            ) : (
              <div className="preview-cover-placeholder"><Megaphone size={32} /></div>
            )}
            
            <div className="preview-body">
              <h2>{previewPanel.campaign.title || 'Sans titre'}</h2>
              <p className="preview-creator">Par <strong>{previewPanel.campaign.creator_name || 'Créateur inconnu'}</strong></p>
              
              <div className="preview-tags">
                <span className={`status-badge modern-badge badge-${previewPanel.campaign.status?.toLowerCase() || 'default'}`}>
                  {formatCampaignStatus(previewPanel.campaign.status)}
                </span>
                {previewPanel.campaign.category && (
                  <span className="category-badge">{previewPanel.campaign.category}</span>
                )}
              </div>

              <div className="preview-goal-box">
                <div className="goal-row">
                  <span>Objectif</span>
                  <strong>{((previewPanel.campaign.target_amount || 0) / 1000).toLocaleString('fr-FR')} DT</strong>
                </div>
                <div className="goal-row">
                  <span>Collecté</span>
                  <strong>{((previewPanel.campaign.current_amount || 0) / 1000).toLocaleString('fr-FR')} DT</strong>
                </div>
              </div>

              <div className="preview-desc">
                <h4>Description</h4>
                <p>{previewPanel.campaign.description || 'Aucune description disponible.'}</p>
              </div>
            </div>
          </div>
          <div className="preview-panel-footer">
            <button 
              className="action-btn" 
              onClick={() => {
                setPreviewPanel({ isOpen: false, campaign: null });
                handleOpenEditCampaign(previewPanel.campaign);
              }}
            >
              <Edit2 size={16} /> Modifier
            </button>
            <button 
              className="action-btn" 
              style={{ color: '#22c55e' }}
              onClick={() => {
                setPreviewPanel({ isOpen: false, campaign: null });
                handleOpenCampaignComments(previewPanel.campaign);
              }}
            >
              <MessageSquare size={16} /> Commentaires
            </button>
          </div>
        </div>
      </>
    )}

    </div>
  );
};

export default AdminDashboard;






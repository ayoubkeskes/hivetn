import React, { Suspense, useCallback, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { clearAuthSession, getStoredToken } from "@/shared/utils/authStorage.js";

const Home = React.lazy(() => import("@/modules/campaigns/pages/Home.jsx"));
const SignIn = React.lazy(() => import("@/modules/auth/pages/SignIn.jsx"));
const SignUp = React.lazy(() => import("@/modules/auth/pages/SignUp.jsx"));
const GoogleAuthCallback = React.lazy(() => import("@/modules/auth/pages/GoogleAuthCallback.jsx"));
const ForgotPassword = React.lazy(() => import("@/modules/auth/pages/ForgotPassword.jsx"));
const Settings = React.lazy(() => import("@/modules/profile/pages/Settings.jsx"));
const Profile = React.lazy(() => import("@/modules/profile/pages/Profile.jsx"));
const PublicUserProfile = React.lazy(() => import("@/modules/profile/pages/PublicUserProfile.jsx"));
const SavedProjects = React.lazy(() => import("@/modules/campaigns/pages/SavedProjects.jsx"));
const ProjectDetails = React.lazy(() => import("@/modules/campaigns/pages/ProjectDetails.jsx"));
const Discover = React.lazy(() => import("@/modules/campaigns/pages/Discover.jsx"));
const StartProject = React.lazy(() => import("@/modules/campaigns/pages/StartProject.jsx"));
const CreateProjectStep1 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep1.jsx"));
const CreateProjectStep2 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep2.jsx"));
const CreateProjectStep3 = React.lazy(() => import("@/modules/campaigns/pages/CreateProjectStep3.jsx"));
const ProjectEditor = React.lazy(() => import("@/modules/campaigns/pages/ProjectEditor.jsx"));
const AdminDashboard = React.lazy(() => import("@/admin/AdminDashboard.jsx"));
const DonationPage = React.lazy(() => import("@/modules/payments/pages/DonationPage.jsx"));
const PaymentSuccessPage = React.lazy(() => import("@/modules/payments/pages/PaymentSuccessPage.jsx"));
const PaymentCancelPage = React.lazy(() => import("@/modules/payments/pages/PaymentCancelPage.jsx"));
const SupportTicketsPage = React.lazy(() => import("@/modules/support/pages/SupportTicketsPage.jsx"));
const CreateSupportTicketPage = React.lazy(() => import("@/modules/support/pages/CreateSupportTicketPage.jsx"));
const SupportTicketDetailsPage = React.lazy(() => import("@/modules/support/pages/SupportTicketDetailsPage.jsx"));
const InfoPage = React.lazy(() => import("@/InfoPage.jsx"));
const Footer = React.lazy(() => import("@/shared/components/Footer.jsx"));

class AdminRouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Une erreur est survenue lors du chargement de l'espace admin.",
    };
  }

  componentDidCatch(error) {
    console.error("Admin route error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#0b0f19",
            color: "#f8fafc",
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              padding: "24px",
              borderRadius: "20px",
              border: "1px solid rgba(248, 113, 113, 0.22)",
              background: "rgba(17, 24, 39, 0.96)",
              boxShadow: "0 20px 44px rgba(0, 0, 0, 0.28)",
            }}
          >
            <p style={{ margin: "0 0 10px", color: "#fca5a5", fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Erreur admin
            </p>
            <h1 style={{ margin: "0 0 12px", fontSize: "24px" }}>Le dashboard admin n'a pas pu s'afficher.</h1>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken());
  const [signInMessage, setSignInMessage] = useState("");

  const hideFooterRoutes = [
    "/login",
    "/register",
    "/auth/google/callback",
    "/forgot-password",
    "/create/",
    "/editor",
    "/admin",
    "/support",
  ];

  const shouldShowFooter =
    !hideFooterRoutes.some((path) => location.pathname.startsWith(path)) &&
    !location.pathname.endsWith("/soutenir") &&
    !location.pathname.endsWith("/contribute");

  const [draftProject, setDraftProject] = useState({
    category: "",
    title: "",
    subtitle: "",
    goal: "",
    image_url: "",
    video_url: "",
    duration_days: 30,
    rewards: [],
    story: {
      blocks: [],
      risks: "",
      faqs: [],
    },
    campaignId: null,
  });

  const handleSaveDraft = useCallback((data) => {
    setDraftProject((prev) => ({ ...prev, ...data }));
  }, []);

  const handleNavigate = (view, payload = "") => {
    if (view === "signIn" && payload) setSignInMessage(payload);

    if (view === "projectDetails") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      navigate(campaignId ? `/project/${campaignId}` : "/project");
      return;
    }

    if (view === "donationPage") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      const rewardId = typeof payload === "object" ? payload?.rewardId : null;
      const suffix = rewardId ? `?rewardId=${encodeURIComponent(rewardId)}` : "";
      navigate(campaignId ? `/campaigns/${campaignId}/contribute${suffix}` : "/discover");
      return;
    }

    if (view === "projectEditor") {
      const campaignId = typeof payload === "object" ? payload?.id : payload;
      navigate(campaignId ? `/editor/${campaignId}` : "/editor");
      return;
    }

    if (view === "publicProfile") {
      const userId = typeof payload === "object" ? payload?.id : payload;
      navigate(userId ? `/users/${userId}` : "/");
      return;
    }

    const routeMap = {
      home: "/",
      signIn: "/login",
      signUp: "/register",
      forgotPassword: "/forgot-password",
      settings: "/settings",
      profile: "/profile",
      saved: "/saved",
      discover: "/discover",
      startProject: "/start",
      createProjectStep1: "/create/step1",
      createProjectStep2: "/create/step2",
      createProjectStep3: "/create/step3",
      support: "/support",
      newSupportTicket: "/support/new",
      adminDashboard: "/admin",
    };

    navigate(routeMap[view] || "/");
  };

  const handleLogout = () => {
    clearAuthSession();
    setIsAuthenticated(false);
    navigate("/");
  };


  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            height: "100vh",
            justifyContent: "center",
            alignItems: "center",
            color: "#0ce688",
            backgroundColor: "#0b0f19",
          }}
        >
          Chargement...
        </div>
      }
    >
      <Routes>
        <Route
          path="/"
          element={<Home isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/login"
          element={
            <SignIn
              message={signInMessage}
              onSwitch={() => {
                setSignInMessage("");
                navigate("/register");
              }}
              onForgotPassword={() => navigate("/forgot-password")}
              onHome={() => navigate("/")}
              onLoginSuccess={(_token, user) => {
                setIsAuthenticated(true);
                setSignInMessage("");
                navigate(user.role === "ADMIN" ? "/admin" : "/");
              }}
            />
          }
        />
        <Route path="/register" element={<SignUp onSwitch={() => navigate("/login")} onHome={() => navigate("/")} />} />
        <Route
          path="/auth/google/callback"
          element={
            <GoogleAuthCallback
              onAuthSuccess={(_token, user) => {
                setIsAuthenticated(true);
                setSignInMessage("");
                navigate(user.role === "ADMIN" ? "/admin" : "/");
              }}
            />
          }
        />
        <Route
          path="/forgot-password"
          element={<ForgotPassword onSwitch={() => navigate("/login")} onHome={() => navigate("/")} />}
        />
        <Route
          path="/discover"
          element={<Discover isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/project"
          element={
            <ProjectDetails
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProjectDetails
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/campaigns/:campaignId/contribute"
          element={
            <DonationPage
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/project/:id/soutenir"
          element={
            <DonationPage
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onLoginSuccess={() => setIsAuthenticated(true)}
            />
          }
        />
        <Route
          path="/payment/success"
          element={
            <PaymentSuccessPage
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/payment/cancel"
          element={
            <PaymentCancelPage
              isAuthenticated={isAuthenticated}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/start"
          element={<StartProject isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/create/step1"
          element={<CreateProjectStep1 onNavigate={handleNavigate} onSaveDraft={handleSaveDraft} draftProject={draftProject} />}
        />
        <Route path="/create/step2" element={<CreateProjectStep2 onNavigate={handleNavigate} />} />
        <Route
          path="/create/step3"
          element={<CreateProjectStep3 onNavigate={handleNavigate} onSaveDraft={handleSaveDraft} draftProject={draftProject} />}
        />
        <Route
          path="/editor/:id?"
          element={<ProjectEditor onNavigate={handleNavigate} draftProject={draftProject} onSaveDraft={handleSaveDraft} />}
        />
        <Route
          path="/settings"
          element={<Settings isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/profile"
          element={<Profile isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/users/:id"
          element={<PublicUserProfile isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/saved"
          element={<SavedProjects isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/about"
          element={<InfoPage pageKey="about" isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/terms"
          element={<InfoPage pageKey="terms" isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/privacy"
          element={<InfoPage pageKey="privacy" isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/cookies"
          element={<InfoPage pageKey="cookies" isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support"
          element={<SupportTicketsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support/new"
          element={<CreateSupportTicketPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/support/:id"
          element={<SupportTicketDetailsPage isAuthenticated={isAuthenticated} onNavigate={handleNavigate} onLogout={handleLogout} />}
        />
        <Route
          path="/admin/*"
          element={
            <AdminRouteErrorBoundary>
              <AdminDashboard onNavigate={handleNavigate} />
            </AdminRouteErrorBoundary>
          }
        />
      </Routes>

      {shouldShowFooter && <Footer />}
    </Suspense>
  );
}

export default AppRoutes;

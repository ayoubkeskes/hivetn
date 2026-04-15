import { BrowserRouter } from "react-router-dom";

import AppProviders from "./providers/index.jsx";
import AppRoutes from "./routes.jsx";
import ScrollToTop from "../components/ScrollToTop.jsx";

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}

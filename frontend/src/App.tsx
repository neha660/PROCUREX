import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { OverviewPage } from "@/pages/OverviewPage";
import { BriefsPage } from "@/pages/BriefsPage";
import { VendorsPage } from "@/pages/VendorsPage";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { AuditPage } from "@/pages/AuditPage";
import { SecurityPage } from "@/pages/SecurityPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<OverviewPage />} />
          <Route path="briefs" element={<BriefsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="approvals" element={<ApprovalsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

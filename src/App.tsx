import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RouteGuard } from "@/auth/RouteGuard";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Settings } from "@/pages/Settings";
import { Placeholder } from "@/pages/Placeholder";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Authenticated app shell */}
        <Route element={<RouteGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="log/food" element={<Placeholder title="Food" phase="Phase 2" />} />
            <Route path="log/workout" element={<Placeholder title="Workout" phase="Phase 2" />} />
            <Route path="log/medicine" element={<Placeholder title="Medicine" phase="Phase 2" />} />
            <Route path="log/steps" element={<Placeholder title="Steps" phase="Phase 2" />} />
            <Route path="log/water" element={<Placeholder title="Water" phase="Phase 5" />} />
            <Route path="log/wellbeing" element={<Placeholder title="Wellbeing" phase="Phase 5" />} />
            <Route path="checkin" element={<Placeholder title="Daily check-in" phase="Phase 4" />} />
            <Route path="progress" element={<Placeholder title="Progress" phase="Phase 5" />} />
            <Route path="photos" element={<Placeholder title="Progress photos" phase="Phase 5" />} />
            <Route path="review" element={<Placeholder title="Weekly review" phase="Phase 5" />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RouteGuard } from "@/auth/RouteGuard";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Weight } from "@/pages/Weight";
import { History } from "@/pages/History";
import { Checkin } from "@/pages/Checkin";
import { Progress } from "@/pages/Progress";
import { Photos } from "@/pages/Photos";
import { Review } from "@/pages/Review";
import { Settings } from "@/pages/Settings";
import { Food } from "@/pages/log/Food";
import { Workout } from "@/pages/log/Workout";
import { Medicine } from "@/pages/log/Medicine";
import { Steps } from "@/pages/log/Steps";
import { Water } from "@/pages/log/Water";
import { Wellbeing } from "@/pages/log/Wellbeing";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Authenticated app shell */}
        <Route element={<RouteGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="weight" element={<Weight />} />
            <Route path="history" element={<History />} />
            <Route path="log/food" element={<Food />} />
            <Route path="log/workout" element={<Workout />} />
            <Route path="log/medicine" element={<Medicine />} />
            <Route path="log/steps" element={<Steps />} />
            <Route path="log/water" element={<Water />} />
            <Route path="log/wellbeing" element={<Wellbeing />} />
            <Route path="checkin" element={<Checkin />} />
            <Route path="progress" element={<Progress />} />
            <Route path="photos" element={<Photos />} />
            <Route path="review" element={<Review />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { Routes, Route } from "react-router-dom";
import FundraiserBanner from "./pages/FundraiserBanner";
import Dashboard from "./Dashboard";
import WeeklyDetails from "./pages/WeeklyDetails";
import MonthlyDetails from "./pages/MonthlyDetails";
import YearDetails from "./pages/YearDetails";
import { ActivitiesProvider } from "./ActivitiesContext";
import {DarkModeProvider} from "./DarkModeContext"
import React from "react";


export default function App() {
  return (
    <ActivitiesProvider>
    <DarkModeProvider>
      <FundraiserBanner />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/weekly" element={<WeeklyDetails />} />
        <Route path="/monthly" element={<MonthlyDetails />} />
        <Route path="/year/:year" element={<YearDetails />} />
      </Routes>
      </DarkModeProvider>
    </ActivitiesProvider>
  );
}

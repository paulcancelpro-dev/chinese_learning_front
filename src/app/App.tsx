import { lazy, Suspense } from "react";
import { Route, Routes, Link } from "react-router-dom";
import Layout from "./Layout";
import { Loading } from "../components/ui";
const Dashboard = lazy(() => import("../features/Dashboard"));
const Vocabulary = lazy(() => import("../features/Vocabulary"));
const ImportPage = lazy(() => import("../features/Import"));
const Practice = lazy(() => import("../features/Practice"));
const SessionPage = lazy(() => import("../features/Session"));
const Results = lazy(() =>
  import("../features/Session").then((module) => ({ default: module.Results })),
);
const ProgressPage = lazy(() => import("../features/Progress"));
const History = lazy(() => import("../features/History"));
export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vocabulary" element={<Vocabulary />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="practice" element={<Practice />} />
          <Route path="practice/session" element={<SessionPage />} />
          <Route path="practice/results" element={<Results />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="statistics" element={<Dashboard statistics />} />
          <Route path="history" element={<History />} />
          <Route
            path="*"
            element={
              <>
                <h1>Cette page n’existe pas</h1>
                <Link to="/">Retour au tableau de bord</Link>
              </>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}

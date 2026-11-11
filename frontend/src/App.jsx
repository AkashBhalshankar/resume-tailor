import React, { useState, useEffect } from 'react';
import JobList from './components/JobList';
import { Briefcase, FileText } from 'lucide-react';
import { AppProvider, useApp } from './store';
import Header from './components/Header';
import Toasts from './components/Toasts';
import UploadScreen from './screens/UploadScreen';
import ReviewScreen from './screens/ReviewScreen';
import EditResumeScreen from './screens/EditResumeScreen';
import DownloadScreen from './screens/DownloadScreen';
import OutreachScreen from './screens/OutreachScreen';
import HistoryScreen from './screens/HistoryScreen';
import { getCuratedJobs, getRemovedJobs, deleteJob } from './api';

const SCREENS = {
  upload: UploadScreen,
  review: ReviewScreen,
  edit: EditResumeScreen,
  download: DownloadScreen,
  outreach: OutreachScreen,
  history: HistoryScreen,
};

function TailorApp() {
  const { screen, resume } = useApp();
  const needsResume = ['review', 'edit', 'download', 'outreach'].includes(screen);
  const Screen = SCREENS[!resume && needsResume ? 'upload' : screen];
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main key={screen} className="animate-fade-up mx-auto w-full max-w-[1200px] flex-1 px-4 pb-28 pt-8 sm:px-6">
        <Screen />
      </main>
      <Toasts />
    </div>
  );
}

function ScoutApp() {
  const [jobs, setJobs] = useState([]);
  const [removed, setRemoved] = useState(new Set());

  const fetchJobs = async () => {
    try {
      const [jobList, removedList] = await Promise.all([
        getCuratedJobs(),
        getRemovedJobs(),
      ]);

      if (Array.isArray(jobList)) {
        const removedSet = new Set(removedList || []);
        setRemoved(removedSet);
        setJobs(jobList.filter((j) => !removedSet.has(j.id)));
      }
    } catch (err) {
      console.log('Notice fetching jobs:', err);
    }
  };

  const handleRemove = async (jobId) => {
    try {
      await deleteJob(jobId);
      setRemoved((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err) {
      console.log('Remove failed:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3600000); // auto-refresh every 1 hour
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">AI</div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Deep Research Job Agent</h1>
            <p className="text-[11px] text-slate-500">AI Roles � Early career (up to 8 years) � Indian hubs � No remote � Auto-refresh every 1 hour</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
<span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold border border-emerald-200">AI-Only Filter Active</span>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-full text-xs font-semibold border border-blue-200">8 YoE Ceiling</span>
        </div>
      </header>
      <main className="flex-1 p-5 max-w-[1600px] w-full mx-auto overflow-hidden">
        <JobList jobs={jobs} onRefresh={fetchJobs} onRemove={handleRemove} />
      </main>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('tailor');

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-lg px-2 py-1 flex gap-1">
        <button
          onClick={() => setView('scout')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            view === 'scout'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" /> Scout
        </button>

        <button
          onClick={() => setView('tailor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
            view === 'tailor'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Resume Tailor
        </button>
      </nav>

      {view === 'scout' ? (
        <ScoutApp />
      ) : (
        <AppProvider>
          <TailorApp />
        </AppProvider>
      )}
    </>
  );
}

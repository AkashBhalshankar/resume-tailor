import React, { useState } from 'react';
import { ExternalLink, ShieldCheck, Building2, MapPin, RefreshCw, XCircle } from 'lucide-react';

export default function JobList({ jobs, onRefresh, onRemove }) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

  const handleTriggerScout = async () => {
    setIsSearching(true);
    setSearchMessage('Starting the ATS scout...');
    try {
      const response = await fetch('/api/jobs/trigger-search', { method: 'POST' });
      if (!response.ok) throw new Error(`Scout request failed (${response.status})`);

      const interval = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/jobs/scout-status');
          if (!statusResponse.ok) throw new Error(`Status request failed (${statusResponse.status})`);
          const status = await statusResponse.json();
          setSearchMessage(`${status.message} Discovered: ${status.discovered}; verified: ${status.verified}.`);
          if (status.status !== 'running') {
            clearInterval(interval);
            setIsSearching(false);
            if (onRefresh) onRefresh();
          }
        } catch (error) {
          clearInterval(interval);
          setIsSearching(false);
          setSearchMessage(error.message);
        }
      }, 2000);
    } catch (err) {
      setIsSearching(false);
      setSearchMessage(err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFBF7] p-6 rounded-xl border border-[#E2E8F0] shadow-sm overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-[#E2E8F0] gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Curated AI Opportunities (India)</h2>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            AI-only roles &middot; Early career (up to 8 years) &middot; Indian tech hubs only &middot; No remote &middot; No internships &middot; Auto-refresh every 1 hour
          </p>
        </div>

        {/* Live Search Trigger & Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerScout}
            disabled={isSearching}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
            {isSearching ? 'Scouring India ATS...' : 'Run Deep Scout Now'}
          </button>
          <span className="text-xs font-medium text-slate-500 bg-white px-3 py-2 rounded-lg border border-[#E2E8F0]">
            {jobs.length} Verified Roles
          </span>
        </div>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            {searchMessage || <>No live jobs scraped yet. Click <strong>"Run Deep Scout Now"</strong> above to harvest active postings!</>}
          </div>
        ) : (
          jobs.map((job) => {
            return (
              <div
                key={job.id}
                className="p-5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                      {(job.match_score ?? job.score ?? 0)}% Match
                    </span>
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {job.ats} Direct
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {job.experience_range ?? job.experience ?? '0-2 Years'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{job.title}</h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-emerald-700">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {job.location}
                    </span>
                    {job.workplace_type && (
                      <span className="flex items-center gap-1 font-medium text-blue-600">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        {job.workplace_type}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(job.matched_skills ?? job.skills ?? []).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-50 text-slate-700 border border-slate-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                  >
                    Open Job <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {onRemove && (
                    <button
                      onClick={() => onRemove(job.id)}
                      title="Remove from list"
                      className="px-3 py-2.5 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg border border-[#E2E8F0] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
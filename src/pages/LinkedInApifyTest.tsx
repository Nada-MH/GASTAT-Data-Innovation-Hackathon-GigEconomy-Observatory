import React, { useState, useEffect } from 'react';
import { Search, Loader2, Play, ExternalLink, User, Briefcase, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';

interface ApifyResult {
  fullName: string;
  occupation: string;
  location: string;
  url: string;
  profilePicUrl?: string;
  publicIdentifier?: string;
}

export function LinkedInApifyTest() {
  const { t, language } = useLanguage();
  const [keywords, setKeywords] = useState('freelance graphic designer Saudi Arabia');
  const [limit, setLimit] = useState(10);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'>('IDLE');
  const [results, setResults] = useState<ApifyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'RUNNING' && runId) {
      interval = setInterval(async () => {
        try {
          const resp = await fetch(`/api/linkedin/apify/status/${runId}`);
          const data = await resp.json();
          
          if (data.status === 'SUCCEEDED') {
            setStatus('SUCCEEDED');
            fetchResults(runId);
            clearInterval(interval);
          } else if (data.status === 'FAILED' || data.status === 'ABORTED' || data.status === 'TIMED-OUT') {
            setStatus('FAILED');
            setError(`Run ended with status: ${data.status}`);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [status, runId]);

  const startScrape = async () => {
    setError(null);
    setResults([]);
    setSavedCount(null);
    setStatus('RUNNING');
    
    try {
      const resp = await fetch('/api/linkedin/apify/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, limit }),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      
      setRunId(data.runId);
    } catch (err: any) {
      setError(err.message);
      setStatus('FAILED');
    }
  };

  const fetchResults = async (id: string) => {
    try {
      const resp = await fetch(`/api/linkedin/apify/results/${id}`);
      const data = await resp.json();
      console.log('📦 Apify Results Data:', data);
      setResults(data.data || []);
      setSavedCount(data.savedCount || 0);
    } catch (err: any) {
      setError('Failed to load results: ' + err.message);
    }
  };

  // Helper to safely render values that might be objects or missing
  const safeStr = (val: any, fallback: string = 'N/A'): string => {
    if (!val) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
       // Try to find a 'text' or 'name' property if it's an object
       return val.text || val.name || val.label || JSON.stringify(val);
    }
    return String(val);
  };

  // Extract fields with support for different naming conventions
  const getProfileData = (p: any) => {
    return {
      name: safeStr(p.fullName || p.full_name || p.name || p.publicIdentifier || p.id, 'LinkedIn Member'),
      title: safeStr(p.occupation || p.jobTitle || p.job_title || p.title, 'Professional'),
      loc: safeStr(p.location || p.locationName || p.city, 'Saudi Arabia'),
      url: p.url || p.link || p.linkedin_url || '#',
      img: p.profilePicUrl || p.profile_pic || p.image_url || p.avatar
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="text-indigo-600" size={24} />
            LinkedIn Apify Lab
          </h2>
          <p className="text-slate-500 text-sm mt-1">Experimental scraper testing environment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <Card className="lg:col-span-1 border-indigo-100 shadow-lg shadow-indigo-100/20">
          <CardHeader>
            <CardTitle className="text-lg">Scraper Settings</CardTitle>
            <CardDescription>Configure the search parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Search Keywords</label>
              <textarea
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm min-h-[100px]"
                placeholder="e.g. freelance software developer Riyadh"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Max Results ({limit})</label>
              <input
                type="range"
                min="1"
                max="50"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <button
              onClick={startScrape}
              disabled={status === 'RUNNING'}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                status === 'RUNNING' 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              }`}
            >
              {status === 'RUNNING' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Execution in Progress...
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  Start Apify Mission
                </>
              )}
            </button>

            {status !== 'IDLE' && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    status === 'SUCCEEDED' ? 'bg-emerald-100 text-emerald-700' :
                    status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {status}
                  </span>
                </div>
                {runId && (
                  <p className="text-[10px] font-mono text-slate-400 truncate">Run ID: {runId}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="lg:col-span-2 border-indigo-100 shadow-lg shadow-indigo-100/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Observation Results</CardTitle>
              <CardDescription>
                {results.length > 0 
                  ? `Successfully mapped ${results.length} professional profiles` 
                  : 'Awaiting data harvest...'}
              </CardDescription>
            </div>
            {status === 'SUCCEEDED' && (
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full">
                <CheckCircle2 size={20} />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {savedCount !== null && (
              <div className="mb-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm flex items-center gap-3">
                <CheckCircle2 size={18} className="shrink-0 text-indigo-600" />
                <p>
                  <b>Mission Success!</b> {savedCount > 0 
                    ? `Added ${savedCount} unique profiles to the repository.` 
                    : 'All found profiles were already in the repository (No duplicates added).'}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {status === 'RUNNING' ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <Search className="absolute inset-0 m-auto text-indigo-400" size={24} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">Harvesting LinkedIn Ecosystem</p>
                  <p className="text-sm text-slate-500">Apify cloud actor is processing your request...</p>
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-4">
                {results.map((p, idx) => {
                  const profile = getProfileData(p);
                  return (
                    <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors shrink-0 overflow-hidden">
                        {profile.img ? (
                          <img src={profile.img} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors uppercase tracking-tight truncate">
                            {profile.name}
                          </h4>
                          <a 
                            href={profile.url === '#' ? undefined : profile.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`text-slate-400 hover:text-indigo-600 transition-colors ${profile.url === '#' ? 'opacity-20 cursor-not-allowed' : ''}`}
                          >
                            <ExternalLink size={16} />
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-y-1 gap-x-4 mt-1">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Briefcase size={12} className="text-slate-400" />
                            {profile.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <MapPin size={12} className="text-slate-400" />
                            {profile.loc}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-40">
                <Search size={48} />
                <p className="mt-4 font-medium italic">No active harvest results in current session</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

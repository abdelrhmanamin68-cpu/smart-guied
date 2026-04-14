import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Coffee, Utensils, Sparkles, Send, Loader2, Compass, History } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations, type Place, type RecommendationResponse } from "./lib/gemini";

const EXAMPLES = [
  { en: "Cheap restaurants near Smouha", ar: "مطاعم رخيصة في سموحة" },
  { en: "Places to hang out at night", ar: "أماكن للخروج بالليل" },
  { en: "Best cafes with a sea view", ar: "أحسن كافيهات على البحر" },
  { en: "Activities for kids in Alexandria", ar: "أنشطة للأطفال في إسكندرية" }
];

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await getRecommendations(searchQuery);
      setResults(data);
      setHistory(prev => [searchQuery, ...prev.slice(0, 4)]);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [results]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="alex-gradient text-white py-12 px-4 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl mb-4 tracking-tight">
              Smart Alexandria <span className="text-alex-gold italic">Guide</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light max-w-2xl mx-auto">
              Your AI companion to discover the Pearl of the Mediterranean.
            </p>
          </motion.div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 -mt-8 pb-20">
        {/* Search Section */}
        <section className="glass-card rounded-3xl p-6 md:p-10 mb-12">
          <div className="relative flex items-center mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Where do you want to go? (e.g., 'مطاعم في العجمي')"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-6 pr-16 text-lg focus:outline-none focus:border-alex-blue transition-all"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="absolute right-3 p-3 bg-alex-blue text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(ex.en);
                  handleSearch(ex.en);
                }}
                className="text-sm bg-white border border-slate-200 px-4 py-2 rounded-full hover:border-alex-blue hover:text-alex-blue transition-all"
              >
                {ex.ar} / {ex.en}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <History className="w-4 h-4" />
              <span>Recent:</span>
              {history.map((h, i) => (
                <button 
                  key={i} 
                  onClick={() => { setQuery(h); handleSearch(h); }}
                  className="hover:underline"
                >
                  {h.length > 20 ? h.substring(0, 20) + "..." : h}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative">
                <Loader2 className="w-16 h-16 text-alex-blue animate-spin" />
                <Sparkles className="w-6 h-6 text-alex-gold absolute -top-2 -right-2 animate-pulse" />
              </div>
              <p className="mt-4 text-slate-600 font-medium">Consulting the local experts...</p>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-center"
            >
              {error}
            </motion.div>
          )}

          {results && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              ref={resultsRef}
              className="space-y-8"
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-2xl mb-2 flex items-center gap-2">
                  <Compass className="text-alex-blue" /> Recommendations
                </h2>
                <p className="text-slate-700 leading-relaxed text-lg">{results.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.places.map((place, i) => (
                  <PlaceCard key={i} place={place} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!results && !loading && (
          <div className="text-center py-20 opacity-40">
            <Compass className="w-20 h-20 mx-auto mb-4 text-slate-300" />
            <p className="text-xl">Start typing to explore Alexandria</p>
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-400 py-10 px-4 text-center">
        <p className="mb-2">Made with ❤️ for Alexandria</p>
        <p className="text-sm">Powered by Gemini AI • Smart Alexandria Guide 2024</p>
      </footer>
    </div>
  );
}

function PlaceCard({ place, index }: any) {
  const Icon = place.category === "cafe" ? Coffee : place.category === "restaurant" ? Utensils : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-slate-100 group"
    >
      <div className="h-3 bg-alex-blue opacity-80 group-hover:opacity-100 transition-opacity" />
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-blue-50 text-alex-blue rounded-2xl">
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex items-center bg-alex-gold/10 text-alex-gold px-3 py-1 rounded-full text-sm font-bold">
            ★ {place.rating.toFixed(1)}
          </div>
        </div>

        <h3 className="text-2xl mb-1 group-hover:text-alex-blue transition-colors">{place.name}</h3>
        
        <div className="flex items-center gap-1 text-slate-500 text-sm mb-4">
          <MapPin className="w-4 h-4" />
          <span>{place.location}</span>
          <span className="mx-2">•</span>
          <span className="font-medium text-slate-700">{place.priceRange}</span>
        </div>

        <p className="text-slate-600 leading-relaxed">
          {place.description}
        </p>

        <div className="mt-6 flex justify-between items-center">
          <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
            {place.category}
          </span>
          <button className="text-alex-blue font-semibold hover:underline flex items-center gap-1">
            View on Map <Sparkles className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

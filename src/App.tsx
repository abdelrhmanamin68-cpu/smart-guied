import { useState, useRef, useEffect } from "react";
import { 
  Search, MapPin, Coffee, Utensils, Sparkles, Send, Loader2, 
  Compass, History, Heart, Star, LogIn, LogOut, User as UserIcon,
  MessageSquare, Trash2, ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getRecommendations, type Place, type RecommendationResponse } from "./lib/gemini";
import { 
  auth, db, loginWithGoogle, logout, testConnection, handleFirestoreError, OperationType 
} from "./lib/firebase";
import { 
  onAuthStateChanged, User 
} from "firebase/auth";
import { 
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc, 
  addDoc, Timestamp, orderBy, limit 
} from "firebase/firestore";
import ErrorBoundary from "./components/ErrorBoundary";

const EXAMPLES = [
  { en: "Cheap restaurants near Smouha", ar: "مطاعم رخيصة في سموحة" },
  { en: "Places to hang out at night", ar: "أماكن للخروج بالليل" },
  { en: "Best cafes with a sea view", ar: "أحسن كافيهات على البحر" },
  { en: "Activities for kids in Alexandria", ar: "أنشطة للأطفال في إسكندرية" }
];

function AppContent() {
  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "favorites">("search");
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Listen for favorites
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const q = query(collection(db, "favorites"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFavorites(favs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "favorites");
    });

    return () => unsubscribe();
  }, [user]);

  const handleSearch = async (searchQuery: string = queryText) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    setActiveTab("search");
    try {
      const data = await getRecommendations(searchQuery);
      setResults(data);
      setHistory(prev => [searchQuery, ...prev.slice(0, 4)].filter((v, i, a) => a.indexOf(v) === i));
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

  const toggleFavorite = async (place: Place) => {
    if (!user) {
      loginWithGoogle();
      return;
    }

    const placeId = `${place.name}-${place.location}`.replace(/\s+/g, '-').toLowerCase();
    const existing = favorites.find(f => f.placeId === placeId);

    try {
      if (existing) {
        await deleteDoc(doc(db, "favorites", existing.id));
      } else {
        await setDoc(doc(db, "favorites", `${user.uid}_${placeId}`), {
          userId: user.uid,
          placeId,
          name: place.name,
          location: place.location,
          category: place.category,
          description: place.description,
          priceRange: place.priceRange,
          rating: place.rating,
          savedAt: Timestamp.now()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "favorites");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("search")}>
            <div className="bg-alex-blue p-2 rounded-lg">
              <Compass className="text-white w-5 h-5" />
            </div>
            <span className="font-serif text-xl font-bold text-alex-blue hidden sm:inline">Smart Alexandria</span>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveTab("favorites")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeTab === 'favorites' ? 'bg-alex-blue text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
                  <span className="hidden md:inline">Favorites</span>
                  {favorites.length > 0 && <span className="bg-alex-gold text-white text-xs px-1.5 py-0.5 rounded-full">{favorites.length}</span>}
                </button>
                <div className="h-8 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ""} alt={user.displayName || ""} className="w-8 h-8 rounded-full border border-slate-200" />
                  <button onClick={logout} className="text-slate-500 hover:text-red-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={loginWithGoogle}
                className="flex items-center gap-2 bg-alex-blue text-white px-5 py-2 rounded-xl hover:bg-blue-700 transition-all font-medium shadow-lg shadow-blue-100"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="alex-gradient text-white py-16 px-4 shadow-2xl relative overflow-hidden">
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
              Alexandria <span className="text-alex-gold italic">Awaits</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 font-light max-w-2xl mx-auto">
              Discover hidden gems, local favorites, and the best of the Mediterranean.
            </p>
          </motion.div>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 -mt-10 pb-20">
        {activeTab === "search" ? (
          <>
            {/* Search Section */}
            <section className="glass-card rounded-3xl p-6 md:p-10 mb-12">
              <div className="relative flex items-center mb-6">
                <input
                  type="text"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="What are you looking for? (e.g., 'أماكن خروج في سموحة')"
                  className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-7 pr-16 text-lg focus:outline-none focus:border-alex-blue focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="absolute right-4 p-3 bg-alex-blue text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQueryText(ex.en);
                      handleSearch(ex.en);
                    }}
                    className="text-sm bg-white border border-slate-200 px-4 py-2.5 rounded-full hover:border-alex-blue hover:text-alex-blue hover:shadow-md transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-3 h-3 text-alex-gold" />
                    {ex.ar}
                  </button>
                ))}
              </div>

              {history.length > 0 && (
                <div className="flex items-center gap-3 text-slate-400 text-sm overflow-x-auto pb-2 no-scrollbar">
                  <History className="w-4 h-4 flex-shrink-0" />
                  {history.map((h, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setQueryText(h); handleSearch(h); }}
                      className="whitespace-nowrap hover:text-alex-blue transition-colors bg-slate-100 px-3 py-1 rounded-lg"
                    >
                      {h}
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
                  className="flex flex-col items-center justify-center py-24"
                >
                  <div className="relative">
                    <Loader2 className="w-20 h-20 text-alex-blue animate-spin" />
                    <Sparkles className="w-8 h-8 text-alex-gold absolute -top-2 -right-2 animate-pulse" />
                  </div>
                  <p className="mt-6 text-slate-500 font-medium text-lg">Finding the best spots for you...</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-3xl text-center flex flex-col items-center gap-3"
                >
                  <AlertTriangle className="w-10 h-10" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}

              {results && !loading && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  ref={resultsRef}
                  className="space-y-10"
                >
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Compass className="w-32 h-32" />
                    </div>
                    <h2 className="text-3xl mb-4 flex items-center gap-3">
                      <Sparkles className="text-alex-gold" /> AI Insights
                    </h2>
                    <p className="text-slate-700 leading-relaxed text-xl font-light">{results.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {results.places.map((place, i) => (
                      <PlaceCard 
                        key={i} 
                        place={place} 
                        index={i} 
                        isFavorite={favorites.some(f => f.placeId === `${place.name}-${place.location}`.replace(/\s+/g, '-').toLowerCase())}
                        onToggleFavorite={() => toggleFavorite(place)}
                        user={user}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!results && !loading && (
              <div className="text-center py-32 opacity-20">
                <Compass className="w-24 h-24 mx-auto mb-6 text-slate-300" />
                <p className="text-2xl font-light">Your Alexandria journey starts here</p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-4xl font-serif text-alex-blue mb-2">My Favorites</h2>
                <p className="text-slate-500">Your curated list of places in Alexandria</p>
              </div>
              <button 
                onClick={() => setActiveTab("search")}
                className="text-alex-blue font-bold hover:underline"
              >
                Back to Search
              </button>
            </div>

            {favorites.length === 0 ? (
              <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-300">
                <Heart className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-xl text-slate-400">You haven't saved any places yet.</p>
                <button 
                  onClick={() => setActiveTab("search")}
                  className="mt-6 bg-alex-blue text-white px-8 py-3 rounded-xl font-bold"
                >
                  Explore Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {favorites.map((fav, i) => (
                  <PlaceCard 
                    key={fav.id} 
                    place={fav} 
                    index={i} 
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(fav)}
                    user={user}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900 text-slate-500 py-16 px-4 text-center border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center gap-6 mb-8">
            <Compass className="w-8 h-8 opacity-50" />
            <Sparkles className="w-8 h-8 opacity-50" />
            <MapPin className="w-8 h-8 opacity-50" />
          </div>
          <p className="text-lg text-slate-400 mb-2 font-serif">Smart Alexandria Guide</p>
          <p className="text-sm max-w-md mx-auto mb-8">
            The ultimate AI-powered companion for exploring the beautiful city of Alexandria.
          </p>
          <div className="h-px bg-slate-800 w-20 mx-auto mb-8" />
          <p className="text-xs uppercase tracking-widest">© 2024 • Built with Gemini & Firebase</p>
        </div>
      </footer>
    </div>
  );
}

function PlaceCard({ place, index, isFavorite, onToggleFavorite, user }: any) {
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const placeId = place.placeId || `${place.name}-${place.location}`.replace(/\s+/g, '-').toLowerCase();
  const Icon = place.category === "cafe" ? Coffee : place.category === "restaurant" ? Utensils : Sparkles;

  useEffect(() => {
    if (showReviews) {
      const q = query(
        collection(db, "reviews"), 
        where("placeId", "==", placeId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, "reviews");
      });
      return () => unsubscribe();
    }
  }, [showReviews, placeId]);

  const submitReview = async () => {
    if (!user || !newReview.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        userPhoto: user.photoURL || "",
        placeId,
        rating: newRating,
        comment: newReview,
        createdAt: Timestamp.now()
      });
      setNewReview("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "reviews");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-slate-100 group flex flex-col h-full"
    >
      <div className="h-4 alex-gradient opacity-90 group-hover:opacity-100 transition-opacity" />
      <div className="p-8 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-6">
          <div className="p-4 bg-blue-50 text-alex-blue rounded-2xl shadow-inner">
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={onToggleFavorite}
              className={`p-3 rounded-2xl transition-all shadow-sm ${isFavorite ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-300 hover:text-red-400'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <div className="flex items-center bg-alex-gold/10 text-alex-gold px-4 py-1.5 rounded-full text-sm font-black shadow-sm">
              ★ {place.rating.toFixed(1)}
            </div>
          </div>
        </div>

        <h3 className="text-3xl mb-2 font-serif group-hover:text-alex-blue transition-colors leading-tight">{place.name}</h3>
        
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
          <MapPin className="w-4 h-4 text-alex-blue" />
          <span className="font-medium text-slate-600">{place.location}</span>
          <span className="mx-1 opacity-30">•</span>
          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">{place.priceRange}</span>
        </div>

        <p className="text-slate-600 leading-relaxed text-lg font-light mb-8 flex-grow">
          {place.description}
        </p>

        <div className="pt-6 border-t border-slate-50 mt-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-[0.2em] font-black text-slate-300">
              {place.category}
            </span>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowReviews(!showReviews)}
                className="text-slate-400 hover:text-alex-blue transition-colors flex items-center gap-2 font-bold text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                {showReviews ? "Hide Reviews" : "Reviews"}
              </button>
              <a 
                href={`https://www.google.com/maps/search/${encodeURIComponent(place.name + " " + place.location + " Alexandria")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-alex-blue font-bold hover:underline flex items-center gap-2 text-sm"
              >
                Maps <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <AnimatePresence>
            {showReviews && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-4"
              >
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {reviews.length === 0 ? (
                    <p className="text-center text-slate-400 py-4 text-sm italic">No reviews yet. Be the first!</p>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="bg-slate-50 p-4 rounded-2xl">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <img src={rev.userPhoto} className="w-6 h-6 rounded-full" alt="" />
                            <span className="text-xs font-bold text-slate-700">{rev.userName}</span>
                          </div>
                          <div className="flex text-alex-gold">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'opacity-20'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-snug">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {user ? (
                  <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-900">Write a Review</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} onClick={() => setNewRating(s)}>
                            <Star className={`w-4 h-4 ${s <= newRating ? 'text-alex-gold fill-current' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea 
                      value={newReview}
                      onChange={(e) => setNewReview(e.target.value)}
                      placeholder="Share your experience..."
                      className="w-full bg-white border border-blue-100 rounded-xl p-3 text-sm focus:outline-none focus:border-alex-blue h-20 resize-none"
                    />
                    <button 
                      onClick={submitReview}
                      disabled={isSubmitting || !newReview.trim()}
                      className="w-full bg-alex-blue text-white py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-100 disabled:opacity-50"
                    >
                      {isSubmitting ? "Posting..." : "Post Review"}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={loginWithGoogle}
                    className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold hover:border-alex-blue hover:text-alex-blue transition-all"
                  >
                    Sign in to write a review
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AlertTriangle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

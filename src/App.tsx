import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { auth, db, signIn, logOut, handleFirestoreError, OperationType } from './firebase';
import { collection, query, onSnapshot, limit } from 'firebase/firestore';
import { Ad, AdCategory } from './types';
import AdCard from './components/AdCard';
import AdForm from './components/AdForm';
import EnquiryForm from './components/EnquiryForm';
import EnquiryList from './components/EnquiryList';
import { Search, Plus, LogIn, LogOut, Newspaper, LayoutGrid, List, ArrowUpDown, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';

class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Application Error</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

const CATEGORIES: (AdCategory | 'All')[] = ['All', 'For Sale', 'Services', 'Rentals', 'Jobs', 'Lost & Found'];

function ClassifiedsApp() {
  const [user, loadingAuth] = useAuthState(auth);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AdCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high'>('newest');
  
  const [showAdForm, setShowAdForm] = useState(false);
  const [selectedAdForEnquiry, setSelectedAdForEnquiry] = useState<Ad | null>(null);
  const [selectedAdForEnquiries, setSelectedAdForEnquiries] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'ads'), limit(100));

    // Real-time listener for ads
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Ad[];
      setAds(data);
      setLoadingAds(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });

    return () => unsubscribe();
  }, []);

  const filteredAndSortedAds = ads
    .filter(ad => {
      const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           ad.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || ad.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Featured ads always on top
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      if (sortBy === 'newest') return b.posted_at.toMillis() - a.posted_at.toMillis();
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
              <Newspaper className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 hidden sm:block">
              LOCAL<span className="text-blue-600">BOARD</span>
            </h1>
          </div>

          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="Search local listings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-xl outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loadingAuth ? (
              <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAdForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Post Ad
                </button>
                <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />
                <button
                  onClick={logOut}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                  alt={user.displayName || 'User'} 
                  className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm hidden sm:block"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl transition-all shadow-lg shadow-slate-200 text-sm"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                  selectedCategory === cat 
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button className="p-1.5 rounded-lg bg-slate-100 text-slate-900">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex-1 sm:flex-none">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer shadow-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Lowest Price</option>
                <option value="price-high">Highest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {loadingAds ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 h-80 animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedAds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 text-center px-4">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No listings found</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
              We couldn't find any ads matching your current search or filters.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedAds.map(ad => (
              <AdCard 
                key={ad.id} 
                ad={ad} 
                onEnquire={(ad) => setSelectedAdForEnquiry(ad)}
                onViewEnquiries={(adId) => setSelectedAdForEnquiries(adId)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdForm && (
        <AdForm 
          onClose={() => setShowAdForm(false)} 
          onSuccess={() => {}} 
        />
      )}

      {selectedAdForEnquiry && (
        <EnquiryForm 
          ad={selectedAdForEnquiry} 
          onClose={() => setSelectedAdForEnquiry(null)} 
          onSuccess={() => {}} 
        />
      )}

      {selectedAdForEnquiries && (
        <EnquiryList 
          adId={selectedAdForEnquiries} 
          onClose={() => setSelectedAdForEnquiries(null)} 
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="p-1.5 bg-slate-900 rounded-lg text-white">
              <Newspaper className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">
              LOCAL<span className="text-blue-600">BOARD</span>
            </h2>
          </div>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
            A community-driven digital classifieds board. Buy, sell, and connect with your neighbors instantly.
          </p>
          <div className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            © 2026 LocalBoard Community Project
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClassifiedsApp />
    </ErrorBoundary>
  );
}

import React, { useState, useEffect } from 'react';
import { Martini, Wine, CheckCircle, Bookmark, X, Star, Shield, ChevronRight, AlertCircle, Check, Image, Edit2, Camera, LogIn, LogOut, Plus, ArrowLeft, BarChart2, User as UserIcon, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, updateProfile, doc, setDoc, getDoc, onSnapshot } from './lib/firebase';
import { User } from 'firebase/auth';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

type RatingData = {
  visual: number;
  aroma: number;
  taste: number;
  overall: number;
  notes: string;
};

type ToastType = 'success' | 'error' | 'info';

type TastingEvent = {
  id: string;
  name: string;
  createdAt: number;
};

type RumSample = {
  id: string;
  tastingId: string;
  name: string;
  image: string;
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DEFAULT_TASTINGS: TastingEvent[] = [
  { id: 'tasting-eminente', name: 'Eminente', createdAt: 0 }
];

const DEFAULT_SAMPLES: RumSample[] = [
  { id: '1', tastingId: 'tasting-eminente', name: "Eminente Ambar Claro", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/EminenteAmbarClaro.png?v=1" },
  { id: '2', tastingId: 'tasting-eminente', name: "Eminente Carta Oro", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/EminenteCartaOro.png?v=1" },
  { id: '3', tastingId: 'tasting-eminente', name: "Eminente Reserva 7YO", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Eminente%207.png?v=1" },
  { id: '4', tastingId: 'tasting-eminente', name: "Eminente Gran Reserva 10YO No. 1", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/EminenteGranreserva.png?v=1" },
  { id: '5', tastingId: 'tasting-eminente', name: "Eminente Grand Reserva 10YO No.2", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Eminenteno2.png?v=1" },
  { id: '6', tastingId: 'tasting-eminente', name: "Eminente Signatura Cocodrilo 14YO", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/EminenteCocodrilo.png?v=1" }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'dashboard' | 'tasting' | 'profile'>('splash');
  const [selectedTastingId, setSelectedTastingId] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  
  const [tastings, setTastings] = useState<TastingEvent[]>(DEFAULT_TASTINGS);
  const [samples, setSamples] = useState<RumSample[]>(DEFAULT_SAMPLES);
  
  const [tastingData, setTastingData] = useState<Record<string, RatingData>>({});
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [userTheme, setUserTheme] = useState<string>('#D4AF37');
  
  const [activeModal, setActiveModal] = useState<'rating' | 'addTasting' | 'addSample' | null>(null);
  const [currentSampleId, setCurrentSampleId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const isAdmin = user?.email === 'papp.robin8TH@gmail.com';

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  const loadLocalData = () => {
    const savedDiary = localStorage.getItem('cubaLibreDiary');
    if (savedDiary) {
      try { setTastingData(JSON.parse(savedDiary)); } catch (e) {}
    }
    const savedImages = localStorage.getItem('cubaLibreImages');
    if (savedImages) {
      try { setCustomImages(JSON.parse(savedImages)); } catch (e) {}
    }
    const savedTastings = localStorage.getItem('cubaLibreTastings');
    if (savedTastings) {
      try { setTastings(JSON.parse(savedTastings)); } catch (e) {}
    }
    const savedSamples = localStorage.getItem('cubaLibreSamples');
    if (savedSamples) {
      try { setSamples(JSON.parse(savedSamples)); } catch (e) {}
    }
    const savedTheme = localStorage.getItem('cubaLibreTheme');
    if (savedTheme) {
      setUserTheme(savedTheme);
    }
  };

  const syncToFirestore = async (
    newTastingData: Record<string, RatingData>, 
    newCustomImages: Record<string, string>, 
    newTastings: TastingEvent[],
    newSamples: RumSample[],
    newTheme: string = userTheme,
    uid: string = user?.uid || ''
  ) => {
    if (!uid || !db) return;
    try {
      await setDoc(doc(db, 'users', uid), {
        tastingData: newTastingData,
        customImages: newCustomImages,
        tastings: newTastings,
        samples: newSamples,
        userTheme: newTheme,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}`);
    }
  };

  useEffect(() => {
    const r = parseInt(userTheme.substring(1, 3), 16) || 212;
    const g = parseInt(userTheme.substring(3, 5), 16) || 175;
    const b = parseInt(userTheme.substring(5, 7), 16) || 55;
    
    const lightR = Math.min(255, Math.floor(r * 1.3));
    const lightG = Math.min(255, Math.floor(g * 1.3));
    const lightB = Math.min(255, Math.floor(b * 1.3));
    
    const darkR = Math.floor(r * 0.7);
    const darkG = Math.floor(g * 0.7);
    const darkB = Math.floor(b * 0.7);

    const toHex = (c: number) => c.toString(16).padStart(2, '0');
    
    document.documentElement.style.setProperty('--color-gold-main', userTheme);
    document.documentElement.style.setProperty('--color-gold-light', `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`);
    document.documentElement.style.setProperty('--color-gold-dark', `#${toHex(darkR)}${toHex(darkG)}${toHex(darkB)}`);
  }, [userTheme]);

  useEffect(() => {
    const onboardingComplete = localStorage.getItem('onboardingComplete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }

    if (!auth) {
      setIsLoadingUser(false);
      loadLocalData();
      return;
    }

    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        
        if (!db) {
          setIsLoadingUser(false);
          return;
        }

        // Load local data first so we have something to sync if cloud is empty
        const savedDiary = localStorage.getItem('cubaLibreDiary');
        const savedImages = localStorage.getItem('cubaLibreImages');
        const savedTastings = localStorage.getItem('cubaLibreTastings');
        const savedSamples = localStorage.getItem('cubaLibreSamples');
        
        let localTastingData = tastingData;
        let localCustomImages = customImages;
        let localTastings = tastings;
        let localSamples = samples;

        if (savedDiary) { try { localTastingData = JSON.parse(savedDiary); setTastingData(localTastingData); } catch (e) {} }
        if (savedImages) { try { localCustomImages = JSON.parse(savedImages); setCustomImages(localCustomImages); } catch (e) {} }
        if (savedTastings) { try { localTastings = JSON.parse(savedTastings); setTastings(localTastings); } catch (e) {} }
        if (savedSamples) { try { localSamples = JSON.parse(savedSamples); setSamples(localSamples); } catch (e) {} }

        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.tastingData) {
              setTastingData(data.tastingData);
              localStorage.setItem('cubaLibreDiary', JSON.stringify(data.tastingData));
            }
            if (data.customImages) {
              setCustomImages(data.customImages);
              localStorage.setItem('cubaLibreImages', JSON.stringify(data.customImages));
            }
            if (data.tastings) {
              setTastings(data.tastings);
              localStorage.setItem('cubaLibreTastings', JSON.stringify(data.tastings));
            }
            if (data.samples) {
              setSamples(data.samples);
              localStorage.setItem('cubaLibreSamples', JSON.stringify(data.samples));
            }
            if (data.userTheme) {
              setUserTheme(data.userTheme);
              localStorage.setItem('cubaLibreTheme', data.userTheme);
            }
          } else {
            // No remote data, sync local data up
            syncToFirestore(localTastingData, localCustomImages, localTastings, localSamples, userTheme, currentUser.uid);
          }
          setIsLoadingUser(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          console.error('Failed to load from Firestore', error);
          showToast('Nepodarilo sa načítať dáta z cloudu. Používam lokálne dáta.', 'error');
          loadLocalData();
          setIsLoadingUser(false);
        });
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        loadLocalData();
        setIsLoadingUser(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleLogin = async () => {
    if (!auth) {
      showToast('Firebase nie je nakonfigurovaný.', 'error');
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Prihlásenie úspešné.', 'success');
    } catch (error) {
      console.error('Login failed', error);
      showToast('Nepodarilo sa prihlásiť.', 'error');
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      showToast('Odhlásenie úspešné.', 'info');
      setCurrentScreen('splash');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingComplete', 'true');
  };

  const saveTastingData = (data: Record<string, RatingData>) => {
    try {
      setTastingData(data);
      localStorage.setItem('cubaLibreDiary', JSON.stringify(data));
      if (user) syncToFirestore(data, customImages, tastings, samples);
      showToast('Hodnotenie bolo uložené.', 'success');
    } catch (e) {
      console.error('Failed to save data', e);
      showToast('Chyba pri ukladaní dát.', 'error');
    }
  };

  const saveCustomImage = (id: string, url: string) => {
    try {
      const newImages = { ...customImages, [id]: url };
      setCustomImages(newImages);
      localStorage.setItem('cubaLibreImages', JSON.stringify(newImages));
      if (user) syncToFirestore(tastingData, newImages, tastings, samples);
      showToast('Obrázok bol aktualizovaný.', 'success');
    } catch (e) {
      console.error('Failed to save image', e);
      showToast('Nepodarilo sa uložiť obrázok.', 'error');
    }
  };

  const saveTheme = (newTheme: string) => {
    setUserTheme(newTheme);
    localStorage.setItem('cubaLibreTheme', newTheme);
    if (user) syncToFirestore(tastingData, customImages, tastings, samples, newTheme);
  };

  const handleAddTasting = (name: string) => {
    const newTasting: TastingEvent = { id: `tasting-${Date.now()}`, name, createdAt: Date.now() };
    const newTastings = [...tastings, newTasting];
    setTastings(newTastings);
    localStorage.setItem('cubaLibreTastings', JSON.stringify(newTastings));
    if (user) syncToFirestore(tastingData, customImages, newTastings, samples);
    setActiveModal(null);
    showToast('Degustácia pridaná.', 'success');
  };

  const handleAddSample = (name: string) => {
    if (!selectedTastingId) return;
    const newSample: RumSample = { 
      id: `sample-${Date.now()}`, 
      tastingId: selectedTastingId, 
      name, 
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=141414&color=D4AF37&size=400` 
    };
    const newSamples = [...samples, newSample];
    setSamples(newSamples);
    localStorage.setItem('cubaLibreSamples', JSON.stringify(newSamples));
    if (user) syncToFirestore(tastingData, customImages, tastings, newSamples);
    setActiveModal(null);
    showToast('Vzorka pridaná.', 'success');
  };

  const openRatingModal = (id: string) => {
    setCurrentSampleId(id);
    setActiveModal('rating');
  };

  const currentTastingSamples = samples.filter(s => s.tastingId === selectedTastingId);
  const ratedSamples = currentTastingSamples.filter(s => tastingData[s.id]);
  const hasRatings = ratedSamples.length > 0;

  const avgData = hasRatings ? [
    { subject: 'Vizuál', A: Number((ratedSamples.reduce((sum, s) => sum + tastingData[s.id].visual, 0) / ratedSamples.length).toFixed(1)), fullMark: 10 },
    { subject: 'Vôňa', A: Number((ratedSamples.reduce((sum, s) => sum + tastingData[s.id].aroma, 0) / ratedSamples.length).toFixed(1)), fullMark: 10 },
    { subject: 'Chuť', A: Number((ratedSamples.reduce((sum, s) => sum + tastingData[s.id].taste, 0) / ratedSamples.length).toFixed(1)), fullMark: 10 },
    { subject: 'Celkovo', A: Number((ratedSamples.reduce((sum, s) => sum + tastingData[s.id].overall, 0) / ratedSamples.length).toFixed(1)), fullMark: 10 },
  ] : [];

  return (
    <div className="min-h-screen flex flex-col w-full max-w-md mx-auto relative">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[60] px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] border ${
              toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' :
              toast.type === 'success' ? 'bg-green-900/90 border-green-500 text-white' :
              'bg-bg-panel border-gold-main/50 text-text-main'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
             toast.type === 'success' ? <Check className="w-5 h-5" /> :
             <Shield className="w-5 h-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentScreen === 'splash' ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col justify-center items-center text-center p-10"
          >
            <div className="mb-8 flex flex-col items-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mb-6"
              >
                {logoError ? (
                  <div className="w-32 h-32 rounded-full border-2 border-gold-main/30 shadow-[0_0_15px_rgba(212,175,55,0.3)] flex items-center justify-center bg-bg-panel">
                    <Wine className="w-16 h-16 text-gold-main" />
                  </div>
                ) : (
                  <img 
                    src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400" 
                    alt="The Cuba Libre Logo" 
                    className="w-32 h-32 object-cover rounded-full border-2 border-gold-main/30 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                )}
              </motion.div>
              <h1 className="text-4xl leading-tight mb-5 gold-text">The Cuba Libre</h1>
              <h2 className="text-2xl font-heading font-semibold">Rum & Cigar House</h2>
            </div>
            <p className="text-text-muted mb-10 text-base leading-relaxed">
              Vitajte na vašej ceste svetom exkluzívnych rumov. Zaznamenajte si svoje dojmy a chute.
            </p>
            <motion.button 
              className="btn-gold text-lg px-8 py-4 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] w-full max-w-[280px]" 
              onClick={() => setCurrentScreen('dashboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{ boxShadow: ['0px 0px 15px rgba(212,175,55,0.3)', '0px 0px 30px rgba(212,175,55,0.6)', '0px 0px 15px rgba(212,175,55,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Začať degustáciu <ChevronRight className="w-6 h-6" />
            </motion.button>
          </motion.div>
        ) : currentScreen === 'dashboard' ? (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-5"
          >
            <header className="sticky top-0 z-50 bg-gradient-to-b from-bg-dark/95 to-bg-dark/80 backdrop-blur-md border-b border-gold-main/20 px-5 py-4 mb-8 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] -mx-5">
              <div className="flex-1 flex justify-start">
                {isInstallable && (
                  <button onClick={handleInstallClick} className="text-xs text-gold-main hover:text-gold-light flex flex-col items-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mb-1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    Inštalovať
                  </button>
                )}
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center">
                {logoError ? (
                  <div className="w-10 h-10 rounded-full border border-gold-main/30 flex items-center justify-center bg-bg-panel mb-1">
                    <Wine className="w-5 h-5 text-gold-main" />
                  </div>
                ) : (
                  <img 
                    src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400" 
                    alt="The Cuba Libre Logo" 
                    className="w-10 h-10 object-cover rounded-full border border-gold-main/30 mb-1"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                  />
                )}
                <h2 className="text-xl tracking-wide gold-text font-heading text-center whitespace-nowrap">Degustačný Denník</h2>
              </div>

              <div className="flex-1 flex justify-end">
                {isLoadingUser ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gold-main/30 border-t-gold-main animate-spin"></div>
                ) : user ? (
                  <button onClick={() => setCurrentScreen('profile')} className="text-xs text-text-muted hover:text-gold-main flex flex-col items-center transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-7 h-7 rounded-full mb-1 border border-gold-main/50" />
                    ) : (
                      <UserIcon className="w-6 h-6 mb-1" />
                    )}
                    Profil
                  </button>
                ) : (
                  <button onClick={handleLogin} className="text-xs text-text-muted hover:text-gold-main flex flex-col items-center transition-colors">
                    <LogIn className="w-6 h-6 mb-1" />
                    Prihlásiť
                  </button>
                )}
              </div>
            </header>

            {isLoadingUser ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-gold-main/30 border-t-gold-main animate-spin"></div>
              </div>
            ) : user ? (
              <>
                <motion.div 
                  className="flex flex-col gap-5 flex-1 content-start"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 }
                    }
                  }}
                >
                  {tastings.map((tasting) => {
                    const tastingSamples = samples.filter(s => s.tastingId === tasting.id);
                    const ratedCount = tastingSamples.filter(s => tastingData[s.id]).length;
                    
                    return (
                      <motion.div
                        key={tasting.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                        }}
                        onClick={() => { setSelectedTastingId(tasting.id); setCurrentScreen('tasting'); }}
                        whileHover={{ scale: 1.02, y: -2, boxShadow: "0 10px 30px -10px var(--color-gold-main)" }}
                        whileTap={{ scale: 0.98 }}
                        className="relative overflow-hidden rounded-2xl p-6 shadow-2xl cursor-pointer group transition-all duration-300 border border-white/5 hover:border-gold-main/40"
                      >
                        {/* Luxurious background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0a0a0a] z-0"></div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-gold-main/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
                        
                        {/* Decorative elements */}
                        <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none z-0 transform group-hover:scale-110 group-hover:-rotate-6">
                          <Wine className="w-40 h-40 text-gold-main" />
                        </div>
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-main/20 to-transparent z-10"></div>
                        
                        <div className="relative z-10 flex justify-between items-center">
                          <div className="flex-1 pr-4">
                            <h3 className="font-body font-semibold text-2xl text-gold-light mb-3 tracking-wide drop-shadow-sm">{tasting.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-text-muted">
                              <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 shadow-inner">
                                <Wine className="w-3.5 h-3.5 text-gold-main/80" /> 
                                <span className="font-mono text-gold-light/90">{ratedCount}</span>
                                <span className="opacity-50 mx-0.5">/</span>
                                <span className="font-mono">{tastingSamples.length}</span>
                              </span>
                              <span className="text-xs uppercase tracking-widest opacity-50">Ohodnotených</span>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-main/10 to-transparent border border-gold-main/20 flex items-center justify-center group-hover:bg-gold-main group-hover:border-gold-main transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            <ChevronRight className="w-6 h-6 text-gold-main group-hover:text-bg-dark transition-all duration-300 group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                    }}
                    onClick={() => setActiveModal('addTasting')} 
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(212,175,55,0.05)" }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-4 relative overflow-hidden rounded-2xl p-5 text-gold-main flex items-center justify-center gap-4 transition-all duration-300 group border border-dashed border-gold-main/30 hover:border-gold-main/60 bg-black/20 hover:bg-gold-main/5"
                  >
                    <div className="w-12 h-12 rounded-full bg-gold-main/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-gold-main/20 transition-all duration-300">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <span className="block font-semibold tracking-wide text-lg">Pridať novú degustáciu</span>
                      <span className="block text-xs text-text-muted uppercase tracking-widest mt-1">Vytvoriť vlastnú udalosť</span>
                    </div>
                  </motion.button>
                </motion.div>

                <footer className="mt-8 pb-5 text-center space-y-3">
                  <p className="text-xs text-text-muted opacity-60 pt-2">
                    Všetky dáta sú bezpečne uložené.
                  </p>
                </footer>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-10">
                <Shield className="w-16 h-16 text-gold-main/20 mb-6" />
                <h3 className="text-xl gold-text mb-3">Prihlásenie nutné</h3>
                <p className="text-text-muted mb-8">
                  Pre zobrazenie vzoriek rumov a ukladanie vašich hodnotení sa prosím prihláste.
                </p>
                <button className="btn-gold flex items-center justify-center gap-2" onClick={handleLogin}>
                  <LogIn className="w-5 h-5" /> Prihlásiť sa
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tasting"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col relative"
          >
            {/* Subtle background gradient and pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-main/5 via-bg-main to-bg-main pointer-events-none z-0"></div>
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
            
            <header className="sticky top-0 z-20 bg-bg-main/90 backdrop-blur-md text-center py-5 px-5 border-b border-white/5 mb-6">
              <button 
                onClick={() => setCurrentScreen('dashboard')} 
                className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold-main flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold tracking-wide gold-text">{tastings.find(t => t.id === selectedTastingId)?.name}</h2>
              <p className="text-text-muted text-xs mt-1 uppercase tracking-widest">Zoznam vzoriek</p>
            </header>

            <div className="flex flex-col gap-4 flex-1 content-start px-5 pb-10 relative z-10">
              {samples.filter(s => s.tastingId === selectedTastingId).map((sample) => {
                const id = sample.id;
                const isRated = !!tastingData[id];
                const rating = tastingData[id];
                const isSelected = currentSampleId === id;
                const imageUrl = customImages[id] || sample.image;
                
                return (
                  <motion.div
                    key={id}
                    onClick={() => openRatingModal(id)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    animate={{ 
                      scale: isSelected ? 1.02 : 1,
                      borderColor: isSelected ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)'
                    }}
                    className={`
                      border rounded-2xl p-4 shadow-lg cursor-pointer relative flex items-center gap-4
                      active:bg-bg-panel-light transition-all duration-300 overflow-hidden group
                      ${isRated 
                        ? `bg-gradient-to-r ${rating.overall >= 4.5 ? 'from-bg-panel to-gold-main/20' : rating.overall >= 3.5 ? 'from-bg-panel to-gold-main/10' : 'from-bg-panel to-bg-panel-light'}` 
                        : 'bg-bg-panel hover:border-gold-main/40'
                      }
                    `}
                  >
                    {isRated && rating.overall >= 4.5 && (
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-gold-main/30 to-transparent pointer-events-none"></div>
                    )}
                    
                    <div className="relative shrink-0">
                      <div className="w-20 h-24 rounded-xl overflow-hidden border border-white/10 shadow-md bg-black/50 group-hover:border-gold-main/30 transition-colors">
                        <img 
                          src={imageUrl} 
                          alt={sample.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('ui-avatars.com')) {
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sample.name)}&background=141414&color=D4AF37&size=400`;
                            }
                          }}
                        />
                      </div>
                      {isRated && (
                        <div className="absolute -bottom-2 -right-2 bg-bg-main border border-gold-main/50 rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-4 h-4 text-gold-main" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-heading font-medium text-xl text-gold-light truncate mb-1 group-hover:text-gold-main transition-colors">{sample.name}</h3>
                      {isRated ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3.5 h-3.5 ${star <= rating.overall ? 'text-gold-main fill-gold-main' : 'text-white/10 fill-white/5'}`} 
                              />
                            ))}
                            <span className="text-xs text-gold-main ml-2 font-medium">{rating.overall}/5</span>
                          </div>
                          {rating.notes && (
                            <span className="text-xs text-text-muted truncate italic opacity-80">
                              "{rating.notes}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted flex items-center gap-1.5">
                          <Edit2 className="w-3.5 h-3.5 opacity-60" /> Klepnite pre hodnotenie
                        </p>
                      )}
                    </div>
                    
                    <div className="shrink-0 pl-2">
                      <ChevronRight className={`w-5 h-5 transition-colors ${isRated ? 'text-gold-main/50' : 'text-text-muted group-hover:text-gold-main'}`} />
                    </div>
                  </motion.div>
                );
              })}

              {isAdmin && (
                <motion.button 
                  onClick={() => setActiveModal('addSample')} 
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(212,175,55,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-2 border border-dashed border-gold-main/30 rounded-2xl p-5 text-gold-main flex flex-col items-center justify-center gap-3 hover:bg-gold-main/5 hover:border-gold-main/60 transition-all group w-full"
                >
                  <div className="w-10 h-10 rounded-full bg-gold-main/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-medium tracking-wide">Pridať novú vzorku</span>
                </motion.button>
              )}

              {hasRatings && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 border border-white/5 rounded-xl p-5 shadow-lg bg-bg-panel"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 className="w-5 h-5 text-gold-main" />
                    <h3 className="text-lg gold-text">Profil degustácie</h3>
                  </div>
                  <p className="text-xs text-text-muted mb-4">Priemerné hodnotenie vzoriek v tejto degustácii.</p>
                  
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={avgData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'rgba(212,175,55,0.5)', fontSize: 10 }} />
                        <Radar
                          name="Priemer"
                          dataKey="A"
                          stroke="#D4AF37"
                          fill="#D4AF37"
                          fillOpacity={0.3}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#141414', borderColor: 'rgba(212,175,55,0.3)', borderRadius: '8px' }}
                          itemStyle={{ color: '#D4AF37' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {currentScreen === 'profile' && user && (
          <ProfileScreen 
            user={user}
            setUser={setUser}
            tastings={tastings}
            tastingData={tastingData}
            setCurrentScreen={setCurrentScreen}
            handleLogout={handleLogout}
            showToast={showToast}
            userTheme={userTheme}
            saveTheme={saveTheme}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'rating' && currentSampleId && (
          <RatingModal
            sample={samples.find(s => s.id === currentSampleId)!}
            initialData={tastingData[currentSampleId]}
            customImage={customImages[currentSampleId]}
            onClose={() => setActiveModal(null)}
            onSave={(data) => {
              saveTastingData({ ...tastingData, [currentSampleId]: data });
              setActiveModal(null);
            }}
            onSaveImage={(url) => saveCustomImage(currentSampleId, url)}
            isAdmin={isAdmin}
          />
        )}
        {activeModal === 'addTasting' && (
          <InputModal 
            title="Nová degustácia" 
            placeholder="Názov degustácie (napr. Zacapa)" 
            onClose={() => setActiveModal(null)} 
            onSave={handleAddTasting} 
          />
        )}
        {activeModal === 'addSample' && (
          <InputModal 
            title="Nová vzorka" 
            placeholder="Názov vzorky" 
            onClose={() => setActiveModal(null)} 
            onSave={handleAddSample} 
          />
        )}
        {showOnboarding && (
          <OnboardingModal onClose={completeOnboarding} />
        )}
      </AnimatePresence>
    </div>
  );
}

const THEMES = [
  { id: 'gold', name: 'Zlatá (Gold)', color: '#D4AF37' },
  { id: 'ruby', name: 'Rubínová (Ruby)', color: '#E63946' },
  { id: 'sapphire', name: 'Zafírová (Sapphire)', color: '#4285F4' },
  { id: 'emerald', name: 'Smaragdová (Emerald)', color: '#34A853' },
  { id: 'amethyst', name: 'Ametystová (Amethyst)', color: '#A142F4' },
];

function ProfileScreen({ user, setUser, tastings, tastingData, setCurrentScreen, handleLogout, showToast, userTheme, saveTheme }: any) {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalTastings = tastings.length;
  const totalRated = Object.keys(tastingData).length;
  const avgOverall = totalRated > 0
    ? (Object.values(tastingData).reduce((sum: number, r: any) => sum + r.overall, 0) / totalRated).toFixed(1)
    : '0.0';

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoURL(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!auth?.currentUser) return;
    setIsSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      setUser({ ...auth.currentUser });
      showToast('Profil bol úspešne aktualizovaný', 'success');
    } catch (e) {
      showToast('Chyba pri aktualizácii profilu', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      key="profile"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col relative min-h-screen pb-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-main/5 via-bg-main to-bg-main pointer-events-none z-0"></div>
      
      <header className="sticky top-0 z-20 bg-bg-main/90 backdrop-blur-md text-center py-5 px-5 border-b border-white/5 mb-6">
        <button 
          onClick={() => setCurrentScreen('dashboard')} 
          className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold-main flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl tracking-wide gold-text font-heading">Môj Profil</h2>
      </header>

      <div className="px-5 relative z-10 space-y-8">
        <div className="bg-bg-panel border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div 
              className="relative w-24 h-24 rounded-full border-2 border-gold-main/50 overflow-hidden mb-4 bg-black/50 flex items-center justify-center cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-10 h-10 text-gold-main/50" />
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-white">{displayName || 'Neznámy používateľ'}</h3>
            <p className="text-sm text-text-muted">{user?.email}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-text-muted text-xs mb-2 uppercase tracking-widest">Zobrazené meno</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-gold-main/50 focus:outline-none transition-colors"
                placeholder="Vaše meno"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs mb-2 uppercase tracking-widest">Profilová fotka</label>
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white hover:border-gold-main/50 focus:outline-none transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5 text-gold-main" />
                Vybrať fotku z galérie
              </button>
            </div>

            <div className="pt-2">
              <label className="block text-text-muted text-xs mb-3 uppercase tracking-widest">Farebná téma</label>
              <div className="flex flex-wrap gap-3">
                {THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => saveTheme(theme.color)}
                    className={`w-10 h-10 rounded-full border-2 transition-transform shadow-lg ${userTheme.toUpperCase() === theme.color.toUpperCase() ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: theme.color }}
                    title={theme.name}
                  />
                ))}
                <div 
                  className={`relative w-10 h-10 rounded-full overflow-hidden border-2 transition-transform shadow-lg ${!THEMES.find(t => t.color.toUpperCase() === userTheme.toUpperCase()) ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} 
                  title="Vlastná farba"
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ backgroundColor: userTheme }}>
                    <span className="text-[10px] font-bold text-white mix-blend-difference">Vlastná</span>
                  </div>
                  <input 
                    type="color" 
                    value={userTheme}
                    onChange={(e) => saveTheme(e.target.value)}
                    className="absolute inset-[-10px] w-[60px] h-[60px] cursor-pointer opacity-0"
                  />
                </div>
              </div>
            </div>

            <motion.button 
              onClick={handleSave}
              disabled={isSaving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-gold py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-4"
            >
              {isSaving ? <div className="w-5 h-5 border-2 border-bg-main border-t-transparent rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
              Uložiť zmeny
            </motion.button>
          </div>
        </div>

        <div className="bg-bg-panel border border-white/5 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg gold-text mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Štatistiky degustácií
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
              <div className="text-3xl font-heading text-gold-main mb-1">{totalTastings}</div>
              <div className="text-xs text-text-muted uppercase tracking-wider">Degustácie</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center">
              <div className="text-3xl font-heading text-gold-main mb-1">{totalRated}</div>
              <div className="text-xs text-text-muted uppercase tracking-wider">Hodnotené vzorky</div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 border border-white/5 text-center col-span-2">
              <div className="text-4xl font-heading text-gold-light mb-1">{avgOverall} <span className="text-lg text-gold-main/50">/ 10</span></div>
              <div className="text-xs text-text-muted uppercase tracking-wider">Priemerné hodnotenie</div>
            </div>
          </div>
        </div>

        <motion.button 
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-xl border border-red-500/30 text-red-400 font-medium flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Odhlásiť sa
        </motion.button>
      </div>
    </motion.div>
  );
}

function InputModal({ title, placeholder, onClose, onSave }: { title: string, placeholder: string, onClose: () => void, onSave: (val: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center z-50 p-5">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-bg-panel w-full max-w-sm border border-gold-main/40 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-xl gold-text mb-4">{title}</h3>
        <input 
          autoFocus 
          type="text" 
          value={val} 
          onChange={e => setVal(e.target.value)} 
          placeholder={placeholder} 
          className="w-full bg-bg-dark border border-gold-main/40 rounded px-4 py-3 text-text-main focus:outline-none focus:border-gold-main mb-6" 
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-text-muted hover:text-text-main transition-colors">Zrušiť</button>
          <button onClick={() => { if(val.trim()) onSave(val.trim()); }} className="flex-1 btn-gold py-2 rounded">Uložiť</button>
        </div>
      </motion.div>
    </div>
  );
}

function OnboardingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Vitajte v Degustačnom Denníku",
      description: "Zaznamenajte si svoje dojmy z exkluzívnych rumov a vytvorte si vlastnú zbierku chutí.",
      icon: <Martini className="w-12 h-12 text-gold-main mb-4" />
    },
    {
      title: "Hodnoťte ako profesionál",
      description: "Každú vzorku môžete ohodnotiť podľa vizuálu, vône, chuti a celkového dojmu. Pridajte aj vlastné poznámky.",
      icon: <Star className="w-12 h-12 text-gold-main mb-4" />
    },
    {
      title: "Vaše dáta sú v bezpečí",
      description: "Všetky hodnotenia sa ukladajú priamo vo vašom zariadení. Kedykoľvek si ich môžete stiahnuť.",
      icon: <Shield className="w-12 h-12 text-gold-main mb-4" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex justify-center items-center z-[70] p-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-bg-panel w-full max-w-sm border border-gold-main/30 rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(0,0,0,0.8)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-bg-panel-light">
          <motion.div 
            className="h-full bg-gold-main"
            initial={{ width: "0%" }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex flex-col items-center mb-6 mt-4">
          {steps[step].icon}
          <h2 className="text-xl gold-text mb-3 font-heading font-semibold">{steps[step].title}</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            {steps[step].description}
          </p>
        </div>

        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-3 text-text-muted text-sm hover:text-text-main transition-colors"
          >
            Preskočiť
          </button>
          <button 
            onClick={handleNext}
            className="flex-1 btn-gold py-3 text-sm font-semibold rounded"
          >
            {step === steps.length - 1 ? "Začať" : "Ďalej"}
          </button>
        </div>
        
        <div className="flex justify-center gap-1.5 mt-6">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-gold-main' : 'bg-white/10'}`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function RatingModal({
  sample,
  initialData,
  customImage,
  onClose,
  onSave,
  onSaveImage,
  isAdmin,
}: {
  sample: RumSample;
  initialData?: RatingData;
  customImage?: string;
  onClose: () => void;
  onSave: (data: RatingData) => void;
  onSaveImage: (url: string) => void;
  isAdmin?: boolean;
}) {
  const [rating, setRating] = useState<RatingData>(
    initialData || { visual: 0, aroma: 0, taste: 0, overall: 0, notes: '' }
  );
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(customImage || sample.image);

  const updateRating = (category: keyof Omit<RatingData, 'notes'>, value: number) => {
    setRating((prev) => ({ ...prev, [category]: value }));
  };

  const handleImageSave = () => {
    onSaveImage(imageUrl);
    setIsEditingImage(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImageUrl(dataUrl);
          onSaveImage(dataUrl);
          setIsEditingImage(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-end z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-bg-panel w-full max-w-md max-h-[90vh] border-t border-gold-main/40 rounded-t-3xl p-7 overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.8)] relative"
      >
        {/* Subtle background gradient and pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-main/10 via-bg-panel to-bg-panel pointer-events-none z-0 rounded-t-3xl"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 rounded-t-3xl" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10">
          <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6"></div>
          
          <div className="flex justify-between items-start mb-6">
          <h2 className="text-3xl font-heading font-medium gold-text leading-tight pr-4 tracking-wide">{sample.name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-gold-main transition-colors bg-white/5 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <label className="text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
              <Image className="w-3.5 h-3.5" /> Fotka vzorky
            </label>
            {isAdmin && (
              <button 
                onClick={() => setIsEditingImage(!isEditingImage)}
                className="text-gold-main text-xs uppercase tracking-wider flex items-center gap-1 hover:text-gold-light"
              >
                <Edit2 className="w-3 h-3" /> {isEditingImage ? 'Zrušiť' : 'Upraviť'}
              </button>
            )}
          </div>

          {isEditingImage ? (
            <div className="mb-4 space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full bg-bg-panel-light border border-dashed border-gold-main/40 rounded-xl px-3 py-6 text-center text-sm text-text-muted flex flex-col items-center gap-3 group-hover:border-gold-main group-hover:bg-gold-main/5 transition-all">
                  <Camera className="w-8 h-8 text-gold-main" />
                  <span>Odfotiť alebo nahrať z galérie</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-xs text-text-muted uppercase tracking-widest">alebo URL</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-bg-dark border border-gold-main/40 rounded-lg px-4 py-2 text-sm text-text-main focus:outline-none focus:border-gold-main"
                />
                <button 
                  onClick={handleImageSave}
                  className="bg-gold-main text-bg-dark px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gold-light transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          ) : null}

          <div className="w-full h-64 rounded-2xl overflow-hidden border border-gold-main/20 relative group shadow-[0_8px_30px_rgba(0,0,0,0.5)] bg-black/50">
            <img 
              src={imageUrl} 
              alt={sample.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes('ui-avatars.com')) {
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sample.name)}&background=141414&color=D4AF37&size=400`;
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-white font-heading text-xl drop-shadow-md">{sample.name}</h3>
            </div>
          </div>
        </div>

        <div className="space-y-7 mb-8">
          <RatingGroup label="Vizuál (Farba, viskozita)" value={rating.visual} onChange={(v) => updateRating('visual', v)} />
          <RatingGroup label="Vôňa (Aróma)" value={rating.aroma} onChange={(v) => updateRating('aroma', v)} />
          <RatingGroup label="Chuť (Paleta chutí)" value={rating.taste} onChange={(v) => updateRating('taste', v)} />
          <RatingGroup label="Celkový dojem" value={rating.overall} onChange={(v) => updateRating('overall', v)} />
        </div>

        <div className="mb-8">
          <label className="block text-text-muted text-xs mb-3 uppercase tracking-widest flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5" />
            Poznámky
          </label>
          <textarea
            className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-gold-light font-body text-base min-h-[120px] resize-none focus:outline-none focus:border-gold-main/50 focus:bg-black/40 transition-all duration-200 placeholder:text-white/20"
            placeholder="Zadajte vlastné poznámky o dyme, koreninách, dochuti..."
            value={rating.notes}
            onChange={(e) => setRating((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <button className="w-full btn-gold py-4 rounded-xl text-lg font-semibold shadow-lg shadow-gold-main/20" onClick={() => onSave(rating)}>
          Uložiť hodnotenie
        </button>
        </div>
      </motion.div>
    </div>
  );
}

function RatingGroup({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) {
  const max = 10;
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <label className="text-text-muted text-xs uppercase tracking-widest">{label}</label>
        <span className={`font-mono text-sm font-medium ${value > 0 ? 'text-gold-main' : 'text-text-muted'}`}>
          {value}/{max}
        </span>
      </div>
      <div className="relative h-3 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold-dark via-gold-main to-gold-light transition-all duration-300 ease-out"
          style={{ width: `${(value / max) * 100}%` }}
        />
        <input 
          type="range" 
          min="0" 
          max={max} 
          step="0.5"
          value={value} 
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted mt-2 px-1 font-mono">
        <span>0</span>
        <span>{max / 2}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

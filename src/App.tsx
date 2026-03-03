import React, { useState, useEffect } from 'react';
import { Martini, Wine, CheckCircle, Bookmark, X, Star, ChevronRight, AlertCircle, Check, Image, Edit2, Camera, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc } from './lib/firebase';
import { User } from 'firebase/auth';

type RatingData = {
  visual: number;
  aroma: number;
  taste: number;
  overall: number;
  notes: string;
};

type ToastType = 'success' | 'error' | 'info';

type RumSample = {
  name: string;
  image: string;
};

const RUM_SAMPLES: RumSample[] = [
  { name: "Eminente Ambar Claro", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/EminenteAmbarClaro.png" },
  { name: "Eminente Carta Oro", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/EminenteCartaOro.png" },
  { name: "Eminente Reserva 7YO", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/Eminente%207.png" },
  { name: "Eminente Gran Reserva 10YO No. 1", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/EminenteGranreserva.png" },
  { name: "Eminente Grand Reserva 10YO No.2", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/Eminenteno2.png" },
  { name: "Eminente Signatura Cocodrilo 14YO", image: "https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/EminenteCocodrilo.png" }
];

const TOTAL_SAMPLES = RUM_SAMPLES.length;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'dashboard'>('splash');
  const [tastingData, setTastingData] = useState<Record<number, RatingData>>({});
  const [customImages, setCustomImages] = useState<Record<number, string>>({});
  const [activeModal, setActiveModal] = useState<'rating' | null>(null);
  const [currentSampleId, setCurrentSampleId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLocalData = () => {
    const saved = localStorage.getItem('cubaLibreDiary');
    if (saved) {
      try {
        setTastingData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse tasting data', e);
      }
    } else {
      setTastingData({});
    }

    const savedImages = localStorage.getItem('cubaLibreImages');
    if (savedImages) {
      try {
        setCustomImages(JSON.parse(savedImages));
      } catch (e) {
        console.error('Failed to parse images', e);
      }
    } else {
      setCustomImages({});
    }
  };

  const loadFirestoreData = async (uid: string) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
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
      } else {
        // No remote data, sync local data up
        const localTasting = JSON.parse(localStorage.getItem('cubaLibreDiary') || '{}');
        const localImages = JSON.parse(localStorage.getItem('cubaLibreImages') || '{}');
        if (Object.keys(localTasting).length > 0 || Object.keys(localImages).length > 0) {
          await syncToFirestore(localTasting, localImages, uid);
        }
      }
    } catch (e) {
      console.error('Failed to load from Firestore', e);
      showToast('Nepodarilo sa načítať dáta z cloudu.', 'error');
      loadLocalData();
    }
  };

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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadFirestoreData(currentUser.uid);
      } else {
        loadLocalData();
      }
      setIsLoadingUser(false);
    });

    return () => unsubscribe();
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
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const syncToFirestore = async (newTastingData: Record<number, RatingData>, newCustomImages: Record<number, string>, uid: string = user?.uid || '') => {
    if (!uid || !db) return;
    try {
      await setDoc(doc(db, 'users', uid), {
        tastingData: newTastingData,
        customImages: newCustomImages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error('Failed to sync to Firestore', e);
    }
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingComplete', 'true');
  };

  const saveTastingData = (data: Record<number, RatingData>) => {
    try {
      setTastingData(data);
      localStorage.setItem('cubaLibreDiary', JSON.stringify(data));
      if (user) syncToFirestore(data, customImages);
      showToast('Hodnotenie bolo uložené.', 'success');
    } catch (e) {
      console.error('Failed to save data', e);
      showToast('Chyba pri ukladaní dát. Skontrolujte miesto v úložisku.', 'error');
    }
  };

  const saveCustomImage = (id: number, url: string) => {
    try {
      const newImages = { ...customImages, [id]: url };
      setCustomImages(newImages);
      localStorage.setItem('cubaLibreImages', JSON.stringify(newImages));
      if (user) syncToFirestore(tastingData, newImages);
      showToast('Obrázok bol aktualizovaný.', 'success');
    } catch (e) {
      console.error('Failed to save image', e);
      showToast('Nepodarilo sa uložiť obrázok.', 'error');
    }
  };

  const openRatingModal = (id: number) => {
    setCurrentSampleId(id);
    setActiveModal('rating');
  };

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
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-6"
              >
                <img 
                  src="https://cdn.jsdelivr.net/gh/papprobin8th-rgb/Denn-k-The-Cuba@main/public/Logocuba.jpg" 
                  alt="The Cuba Libre Logo" 
                  className="w-32 h-32 object-cover rounded-full border-2 border-gold-main/30 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/141414/D4AF37?text=The+Cuba+Libre';
                  }}
                />
              </motion.div>
              <h1 className="text-4xl leading-tight mb-5 gold-text">The Cuba Libre</h1>
              <h2 className="text-2xl font-heading font-semibold">Rum & Cigar House</h2>
            </div>
            <p className="text-text-muted mb-10 text-base leading-relaxed">
              Vitajte na vašej ceste svetom exkluzívnych rumov. Zaznamenajte si svoje dojmy a chute.
            </p>
            <button className="btn-gold" onClick={() => setCurrentScreen('dashboard')}>
              Začať degustáciu
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col p-5"
          >
            <header className="text-center py-5 pb-7 border-b border-white/5 mb-8 relative">
              <h2 className="text-2xl tracking-wide gold-text">Degustačný Denník</h2>
              <p className="text-text-muted text-sm mt-2">Zoznam vzoriek</p>
              
              <div className="absolute top-5 right-0">
                {isLoadingUser ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gold-main/30 border-t-gold-main animate-spin mx-auto"></div>
                ) : user ? (
                  <button onClick={handleLogout} className="text-xs text-text-muted hover:text-gold-main flex flex-col items-center transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full mb-1 border border-gold-main/50" />
                    ) : (
                      <LogOut className="w-6 h-6 mb-1" />
                    )}
                    Odhlásiť
                  </button>
                ) : (
                  <button onClick={handleLogin} className="text-xs text-text-muted hover:text-gold-main flex flex-col items-center transition-colors">
                    <LogIn className="w-6 h-6 mb-1" />
                    Prihlásiť
                  </button>
                )}
              </div>
            </header>

            <div className="flex flex-col gap-4 flex-1 content-start">
              {RUM_SAMPLES.map((sample, index) => {
                const id = index + 1;
                const isRated = !!tastingData[id];
                const rating = tastingData[id];
                const isSelected = currentSampleId === id;
                const imageUrl = customImages[id] || sample.image;
                
                return (
                  <motion.div
                    key={id}
                    onClick={() => openRatingModal(id)}
                    whileTap={{ scale: 0.98 }}
                    animate={{ 
                      scale: isSelected ? 1.02 : 1,
                      borderColor: isSelected ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)'
                    }}
                    className={`
                      border rounded-xl p-4 shadow-lg cursor-pointer relative flex items-center gap-4
                      active:bg-bg-panel-light transition-all duration-300 overflow-hidden group
                      ${isRated 
                        ? `bg-gradient-to-r ${rating.overall >= 4.5 ? 'from-bg-panel to-gold-main/20' : rating.overall >= 3.5 ? 'from-bg-panel to-gold-main/10' : 'from-bg-panel to-gold-main/5'}` 
                        : 'bg-bg-panel'}
                      ${isSelected 
                        ? 'shadow-[0_0_20px_rgba(212,175,55,0.2)]' 
                        : 'hover:border-gold-main/40'}
                    `}
                  >
                    <div className={`
                      w-12 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-black/20
                      ${isRated ? 'border border-gold-main/30' : 'border border-white/5'}
                    `}>
                      <img 
                        src={imageUrl} 
                        alt={sample.name} 
                        className="w-full h-full object-cover opacity-90"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/100x200/141414/D4AF37?text=${encodeURIComponent(sample.name.split(' ').join('\n'))}`;
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <h3 className={`font-body font-medium text-base truncate ${isRated ? 'text-gold-light' : 'text-text-main'}`}>
                        {sample.name}
                      </h3>
                      {isRated ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-gold-main fill-gold-main" />
                          <span className="text-xs text-gold-main font-mono">{rating.overall}/5</span>
                          <span className="text-xs text-text-muted ml-2 truncate max-w-[150px] italic">
                            {rating.notes ? `"${rating.notes}"` : 'Hodnotené'}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-text-muted mt-1">Klepnite pre hodnotenie</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isRated ? (
                         <CheckCircle className="w-6 h-6 text-gold-main drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-gold-main transition-colors" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <footer className="mt-8 pb-5 text-center space-y-3">
              <p className="text-xs text-text-muted opacity-60 pt-2">
                Všetky dáta sú bezpečne uložené.
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === 'rating' && currentSampleId && (
          <RatingModal
            sampleId={currentSampleId}
            initialData={tastingData[currentSampleId]}
            customImage={customImages[currentSampleId]}
            onClose={() => setActiveModal(null)}
            onSave={(data) => {
              saveTastingData({ ...tastingData, [currentSampleId]: data });
              setActiveModal(null);
            }}
            onSaveImage={(url) => saveCustomImage(currentSampleId, url)}
          />
        )}
        {showOnboarding && (
          <OnboardingModal onClose={completeOnboarding} />
        )}
      </AnimatePresence>
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
  sampleId,
  initialData,
  customImage,
  onClose,
  onSave,
  onSaveImage,
}: {
  sampleId: number;
  initialData?: RatingData;
  customImage?: string;
  onClose: () => void;
  onSave: (data: RatingData) => void;
  onSaveImage: (url: string) => void;
}) {
  const [rating, setRating] = useState<RatingData>(
    initialData || { visual: 0, aroma: 0, taste: 0, overall: 0, notes: '' }
  );
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState(customImage || RUM_SAMPLES[sampleId - 1].image);

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
        className="bg-bg-panel w-full max-w-md max-h-[90vh] border-t border-gold-main/40 rounded-t-2xl p-7 overflow-y-auto shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex justify-between items-center mb-6 border-b border-gold-main/20 pb-4">
          <h2 className="text-xl gold-text leading-tight">{RUM_SAMPLES[sampleId - 1].name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main transition-colors ml-4">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-text-muted text-sm uppercase tracking-wide flex items-center gap-2">
              <Image className="w-4 h-4" /> Fotka vzorky
            </label>
            <button 
              onClick={() => setIsEditingImage(!isEditingImage)}
              className="text-gold-main text-xs flex items-center gap-1 hover:underline"
            >
              <Edit2 className="w-3 h-3" /> {isEditingImage ? 'Zrušiť' : 'Upraviť'}
            </button>
          </div>
          
          {isEditingImage ? (
            <div className="flex flex-col gap-3 mb-4">
              <div className="relative overflow-hidden group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full bg-bg-panel-light border border-dashed border-gold-main/40 rounded-lg px-3 py-6 text-center text-sm text-text-muted flex flex-col items-center gap-3 group-hover:border-gold-main group-hover:bg-gold-main/5 transition-all">
                  <Camera className="w-8 h-8 text-gold-main" />
                  <span>Odfotiť alebo nahrať z galérie</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 my-1">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-xs text-text-muted uppercase">alebo URL</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-bg-dark border border-gold-main/40 rounded px-3 py-2 text-sm text-text-main focus:outline-none focus:border-gold-main"
                />
                <button 
                  onClick={handleImageSave}
                  className="bg-gold-main text-bg-dark px-3 py-2 rounded text-sm font-semibold hover:bg-gold-light"
                >
                  OK
                </button>
              </div>
            </div>
          ) : null}

          <div className="w-full h-48 rounded-lg overflow-hidden border border-white/10 relative group">
            <img 
              src={imageUrl} 
              alt={RUM_SAMPLES[sampleId - 1].name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/600x400/141414/D4AF37?text=${encodeURIComponent(RUM_SAMPLES[sampleId - 1].name.split(' ').join('\n'))}`;
              }}
            />
          </div>
        </div>

        <div className="space-y-6 mb-6">
          <RatingGroup label="Vizuál (Farba, viskozita)" value={rating.visual} onChange={(v) => updateRating('visual', v)} />
          <RatingGroup label="Vôňa (Aróma)" value={rating.aroma} onChange={(v) => updateRating('aroma', v)} />
          <RatingGroup label="Chuť (Paleta chutí)" value={rating.taste} onChange={(v) => updateRating('taste', v)} />
          <RatingGroup label="Celkový dojem" value={rating.overall} onChange={(v) => updateRating('overall', v)} />
        </div>

        <div className="mb-5">
          <label className="block text-text-muted text-sm mb-2 uppercase tracking-wide flex items-center gap-2">
            <span className="w-4 h-4 inline-block align-text-bottom"><Bookmark className="w-4 h-4" /></span>
            Poznámky
          </label>
          <textarea
            className="w-full bg-bg-dark border border-gold-main/40 rounded p-4 text-gold-light font-body text-base min-h-[120px] resize-none focus:outline-none focus:shadow-[0_0_10px_rgba(212,175,55,0.2)] placeholder:text-[#555] transition-shadow duration-200"
            placeholder="Zadajte vlastné poznámky o dyme, koreninách, dochuti..."
            value={rating.notes}
            onChange={(e) => setRating((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <button className="btn-gold" onClick={() => onSave(rating)}>
          Uložiť hodnotenie
        </button>
      </motion.div>
    </div>
  );
}

function RatingGroup({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-text-muted text-sm uppercase tracking-wide">{label}</label>
        <span className={`font-mono text-sm ${value > 0 ? 'text-gold-main' : 'text-text-muted'}`}>
          {value}/5
        </span>
      </div>
      <div className="flex gap-2.5 text-3xl text-[#333]">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-8 h-8 cursor-pointer transition-all duration-200 active:scale-125 ${
              star <= value ? 'fill-gold-main text-gold-main drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]' : 'fill-[#333] text-[#333]'
            }`}
            onClick={() => onChange(star)}
          />
        ))}
      </div>
    </div>
  );
}

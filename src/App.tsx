import React, { useState, useEffect } from 'react';
import { Martini, Wine, CheckCircle, Bookmark, X, Star, Shield, Smartphone, FileDown, ChevronRight, AlertCircle, Check, FileJson, FileSpreadsheet, Image, Edit2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  { name: "Eminente Reserva 7yo", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Eminente%207.png" },
  { name: "Eminente Grand Reserva 10yo", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/EminenteGranreserva.png" },
  { name: "Eminente Gran Reserva n.2 10 yo", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Eminenteno2.png" },
  { name: "Cristobál Niña", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Cristobao.png" },
  { name: "Canerock", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Canerock.png" },
  { name: "Compañero Coconut", image: "https://raw.githubusercontent.com/papprobin8th-rgb/Denn-k-The-Cuba/main/public/Companero.png" }
];

const TOTAL_SAMPLES = RUM_SAMPLES.length;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'dashboard'>('splash');
  const [tastingData, setTastingData] = useState<Record<number, RatingData>>({});
  const [customImages, setCustomImages] = useState<Record<number, string>>({});
  const [activeModal, setActiveModal] = useState<'rating' | 'share' | null>(null);
  const [currentSampleId, setCurrentSampleId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'rated' | 'unrated' | 'high'>('all');

  const [showOnboarding, setShowOnboarding] = useState(false);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const saved = localStorage.getItem('cubaLibreDiary');
    if (saved) {
      try {
        setTastingData(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse tasting data', e);
        showToast('Nepodarilo sa načítať uložené dáta.', 'error');
      }
    }

    const savedImages = localStorage.getItem('cubaLibreImages');
    if (savedImages) {
      try {
        setCustomImages(JSON.parse(savedImages));
      } catch (e) {
        console.error('Failed to parse images', e);
      }
    }

    const onboardingComplete = localStorage.getItem('onboardingComplete');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onboardingComplete', 'true');
  };

  const saveTastingData = (data: Record<number, RatingData>) => {
    try {
      setTastingData(data);
      localStorage.setItem('cubaLibreDiary', JSON.stringify(data));
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
      showToast('Obrázok bol aktualizovaný.', 'success');
    } catch (e) {
      console.error('Failed to save image', e);
      showToast('Nepodarilo sa uložiť obrázok.', 'error');
    }
  };

  const exportDataAsJson = () => {
    try {
      const dataStr = JSON.stringify(tastingData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuba-libre-tasting-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Dáta boli úspešne exportované.', 'success');
    } catch (e) {
      console.error('Export failed', e);
      showToast('Nepodarilo sa exportovať dáta.', 'error');
    }
  };

  const exportDataAsHtml = () => {
    try {
      const htmlContent = `
<!DOCTYPE html>
<html lang="sk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Cuba Libre | Degustačný Denník</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
    
    :root {
      --color-bg-dark: #070707;
      --color-bg-panel: #141414;
      --color-bg-panel-light: #1f1f1f;
      --color-gold-light: #FFDF73;
      --color-gold-main: #D4AF37;
      --color-gold-dark: #997A15;
      --color-text-main: #EAEAEA;
      --color-text-muted: #888888;
      --font-heading: 'Playfair Display', serif;
      --font-body: 'Montserrat', sans-serif;
    }

    body {
      font-family: var(--font-body);
      background-color: var(--color-bg-dark);
      background-image: radial-gradient(circle at 50% 10%, #201e1a 0%, #070707 60%);
      background-attachment: fixed;
      color: var(--color-text-main);
      margin: 0;
      padding: 20px;
      min-height: 100vh;
    }

    .container {
      max-width: 480px;
      margin: 0 auto;
    }

    h1, h2, h3 {
      font-family: var(--font-heading);
      font-weight: 600;
      margin: 0;
    }

    .gold-text {
      background: linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-gold-main) 50%, var(--color-gold-dark) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
    }

    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 30px;
    }

    .card {
      background-color: var(--color-bg-panel);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    }

    .card.rated {
      background: linear-gradient(to bottom right, var(--color-bg-panel), rgba(212, 175, 55, 0.05));
      border-color: rgba(212, 175, 55, 0.3);
    }

    .rum-name {
      font-size: 1.1rem;
      margin-bottom: 8px;
      color: var(--color-gold-light);
    }

    .rating-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .star {
      color: var(--color-gold-main);
      fill: var(--color-gold-main);
    }

    .notes {
      font-style: italic;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .score-badge {
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(212, 175, 55, 0.2);
      font-family: monospace;
      color: var(--color-gold-main);
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 class="gold-text" style="font-size: 1.5rem;">Degustačný Denník</h2>
      <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-top: 8px;">The Cuba Libre - Rum & Cigar House</p>
    </div>

    <div id="content">
      ${RUM_SAMPLES.map((sample, index) => {
        const id = index + 1;
        const data = tastingData[id];
        if (!data) return '';
        
        return `
          <div class="card rated">
            <h3 class="rum-name">${sample.name}</h3>
            <div class="rating-row">
              <span class="score-badge">Celkovo: ${data.overall}/5</span>
              <span class="score-badge">Vizuál: ${data.visual}</span>
              <span class="score-badge">Vôňa: ${data.aroma}</span>
              <span class="score-badge">Chuť: ${data.taste}</span>
            </div>
            ${data.notes ? `<div class="notes">"${data.notes}"</div>` : ''}
          </div>
        `;
      }).join('')}
      
      ${Object.keys(tastingData).length === 0 ? '<p style="text-align: center; color: var(--color-text-muted);">Zatiaľ žiadne záznamy.</p>' : ''}
    </div>
    
    <div style="text-align: center; margin-top: 40px; color: var(--color-text-muted); font-size: 0.8rem;">
      Vygenerované dňa ${new Date().toLocaleDateString('sk-SK')}
    </div>
  </div>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cuba-libre-dennik.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Súbor bol úspešne stiahnutý.', 'success');
    } catch (e) {
      console.error('Download failed', e);
      showToast('Nepodarilo sa stiahnuť súbor.', 'error');
    }
  };

  const exportDataAsCsv = () => {
    try {
      // Define CSV headers
      const headers = ['ID', 'Rum Name', 'Visual', 'Aroma', 'Taste', 'Overall', 'Notes'];
      
      // Map data to rows
      const rows = RUM_SAMPLES.map((sample, index) => {
        const id = index + 1;
        const data = tastingData[id];
        
        if (!data) {
          return [id, `"${sample.name}"`, '', '', '', '', '""'].join(',');
        }
        
        // Escape quotes in notes
        const safeNotes = data.notes ? `"${data.notes.replace(/"/g, '""')}"` : '""';
        
        return [
          id,
          `"${sample.name}"`,
          data.visual,
          data.aroma,
          data.taste,
          data.overall,
          safeNotes
        ].join(',');
      });
      
      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Create and download blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cuba-libre-tasting-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Dáta boli úspešne exportované (CSV).', 'success');
    } catch (e) {
      console.error('CSV Export failed', e);
      showToast('Nepodarilo sa exportovať dáta do CSV.', 'error');
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
              >
                <Martini className="w-16 h-16 mb-4 text-gold-main drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]" />
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
            <header className="text-center py-5 pb-7 border-b border-white/5 mb-6">
              <h2 className="text-2xl tracking-wide gold-text">Degustačný Denník</h2>
              <p className="text-text-muted text-sm mt-2">Zoznam vzoriek</p>
            </header>

            <div className="flex flex-col gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Hľadať rum..." 
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full bg-bg-panel border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-gold-main/50 transition-colors text-text-main placeholder:text-text-muted/50"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'all', label: 'Všetky' },
                  { id: 'rated', label: 'Hodnotené' },
                  { id: 'unrated', label: 'Nehodnotené' },
                  { id: 'high', label: 'Top (4+)' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
                      filterType === f.id 
                        ? 'bg-gold-main/10 border-gold-main text-gold-main' 
                        : 'bg-bg-panel border-white/10 text-text-muted hover:border-white/30'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-1 content-start">
              {(() => {
                const filteredSamples = RUM_SAMPLES
                  .map((sample, index) => ({ ...sample, id: index + 1 }))
                  .filter(sample => {
                    const matchesText = sample.name.toLowerCase().includes(filterText.toLowerCase());
                    const rating = tastingData[sample.id];
                    const isRated = !!rating;
                    
                    if (!matchesText) return false;
                    
                    if (filterType === 'rated') return isRated;
                    if (filterType === 'unrated') return !isRated;
                    if (filterType === 'high') return isRated && rating.overall >= 4;
                    
                    return true;
                  });

                if (filteredSamples.length === 0) {
                   return (
                    <div className="text-center py-10 text-text-muted">
                      <p>Žiadne výsledky pre zvolené filtre.</p>
                    </div>
                   );
                }

                return filteredSamples.map((sample) => {
                  const { id, name, image } = sample;
                  const isRated = !!tastingData[id];
                  const rating = tastingData[id];
                  const isSelected = currentSampleId === id;
                  const imageUrl = customImages[id] || image;
                  
                  return (
                    <motion.div
                      key={id}
                      onClick={() => openRatingModal(id)}
                      whileTap={{ scale: 0.98 }}
                      layout
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
                        <img src={imageUrl} alt={name} className="w-full h-full object-cover opacity-90" />
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h3 className={`font-body font-medium text-base truncate ${isRated ? 'text-gold-light' : 'text-text-main'}`}>
                          {name}
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
                });
              })()}
            </div>

            <footer className="mt-8 pb-5 text-center space-y-3">
              <button className="btn-gold flex items-center justify-center gap-2" onClick={() => setActiveModal('share')}>
                <Bookmark className="w-5 h-5" /> Uložiť môj denník
              </button>
              <div className="flex gap-2">
                <button className="btn-outline flex-1 flex items-center justify-center gap-2 !mt-0 px-2" onClick={exportDataAsJson}>
                  <FileJson className="w-4 h-4" /> JSON
                </button>
                <button className="btn-outline flex-1 flex items-center justify-center gap-2 !mt-0 px-2" onClick={exportDataAsHtml}>
                  <FileDown className="w-4 h-4" /> HTML
                </button>
                <button className="btn-outline flex-1 flex items-center justify-center gap-2 !mt-0 px-2" onClick={exportDataAsCsv}>
                  <FileSpreadsheet className="w-4 h-4" /> CSV
                </button>
              </div>
              <p className="text-xs text-text-muted opacity-60 pt-2">
                Všetky dáta sú bezpečne uložené iba vo vašom zariadení.
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
        {activeModal === 'share' && (
          <ShareModal onClose={() => setActiveModal(null)} showToast={showToast} downloadHtml={exportDataAsHtml} />
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
            <div className="flex gap-2 mb-3">
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
          ) : null}

          <div className="w-full h-48 rounded-lg overflow-hidden border border-white/10 relative group">
            <img 
              src={imageUrl} 
              alt={RUM_SAMPLES[sampleId - 1].name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
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

function ShareModal({ onClose, showToast, downloadHtml }: { onClose: () => void; showToast: (msg: string, type: ToastType) => void; downloadHtml: () => void }) {
  const simulateAction = (msg: string) => {
    showToast(msg, 'info');
    onClose();
  };

  const handleDownload = () => {
    downloadHtml();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-end z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-bg-panel w-full max-w-md max-h-[90vh] border-t border-gold-main/40 rounded-t-2xl p-7 overflow-y-auto shadow-[0_-10px_30px_rgba(0,0,0,0.8)] text-center"
      >
        <Shield className="w-12 h-12 mx-auto mb-5 text-gold-main" />
        <h2 className="text-2xl gold-text mb-4">Uložiť denník</h2>
        <p className="text-text-muted mb-6 text-sm leading-relaxed">
          Odnes si svoje degustačné zážitky domov. Pridaj si aplikáciu na plochu alebo stiahni zhrnutie.
        </p>
        
        <button
          className="btn-gold flex items-center justify-center gap-2 mb-4"
          onClick={() => simulateAction('Denník bol pripravený na pridanie na plochu (PWA simulácia).')}
        >
          <Smartphone className="w-5 h-5" /> Pridať na plochu
        </button>
        
        <button
          className="btn-outline flex items-center justify-center gap-2 mb-4"
          onClick={handleDownload}
        >
          <FileDown className="w-5 h-5" /> Stiahnuť zhrnutie (HTML)
        </button>
        
        <button
          className="w-full py-2 text-text-muted hover:text-text-main transition-colors mt-2"
          onClick={onClose}
        >
          Späť
        </button>
      </motion.div>
    </div>
  );
}

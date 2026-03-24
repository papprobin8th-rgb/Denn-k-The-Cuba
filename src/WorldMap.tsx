import React, { useMemo, useState, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, Plus, Minus, RotateCcw, Eye, Wind, Coffee, Award } from 'lucide-react';
import { getCountryFlag } from './lib/flags';

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-50m.json";

interface WorldMapProps {
  tastingData: Record<string, any>;
  samples: any[];
  themeColor?: string;
}

export default function WorldMap({ tastingData, samples, themeColor = '#D4AF37' }: WorldMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 });

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(tastingData).forEach((rating: any) => {
      if (rating.country) {
        counts[rating.country] = (counts[rating.country] || 0) + 1;
      }
    });
    return counts;
  }, [tastingData]);

  const hoveredCountryData = useMemo(() => {
    if (!hoveredCountry) return null;
    
    const count = countryCounts[hoveredCountry] || 0;
    
    if (count === 0) {
      return { name: hoveredCountry, count: 0, topTags: [], avgOverall: '0.0', avgVisual: '0.0', avgAroma: '0.0', avgTaste: '0.0' };
    }

    const tagsCount: Record<string, number> = {};
    let sumOverall = 0;
    let sumVisual = 0;
    let sumAroma = 0;
    let sumTaste = 0;

    Object.values(tastingData).forEach((rating: any) => {
      if (rating.country === hoveredCountry) {
        sumOverall += rating.overall || 0;
        sumVisual += rating.visual || 0;
        sumAroma += rating.aroma || 0;
        sumTaste += rating.taste || 0;

        if (rating.tags) {
          rating.tags.forEach((tag: string) => {
            tagsCount[tag] = (tagsCount[tag] || 0) + 1;
          });
        }
      }
    });

    const topTags = Object.entries(tagsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    return { 
      name: hoveredCountry, 
      count, 
      topTags,
      avgOverall: (sumOverall / count).toFixed(1),
      avgVisual: (sumVisual / count).toFixed(1),
      avgAroma: (sumAroma / count).toFixed(1),
      avgTaste: (sumTaste / count).toFixed(1)
    };
  }, [hoveredCountry, countryCounts, tastingData]);

  const maxCount = Math.max(0, ...Object.values(countryCounts));

  const colorScale = scaleLinear<string>()
    .domain(maxCount > 2 ? [1, maxCount / 2, maxCount] : [1, Math.max(2, maxCount)])
    .range(
      maxCount > 2 
        ? ["#4a3300", themeColor, "#ffea75"] 
        : maxCount === 2 
          ? ["#5c4300", themeColor] 
          : [themeColor, themeColor]
    );

  const selectedCountrySamples = useMemo(() => {
    if (!selectedCountry) return [];
    
    return samples.filter(sample => {
      const rating = tastingData[sample.id];
      return rating && rating.country === selectedCountry;
    });
  }, [selectedCountry, samples, tastingData]);

  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  function triggerAnimation() {
    setIsAnimating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsAnimating(false), 400);
  }

  function handleZoomIn() {
    if (position.zoom >= 4) return;
    triggerAnimation();
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }

  function handleZoomOut() {
    if (position.zoom <= 1) return;
    triggerAnimation();
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }

  function handleReset() {
    triggerAnimation();
    setPosition({ coordinates: [0, 20], zoom: 1 });
  }

  function handleMoveEnd(position: any) {
    setPosition(position);
  }

  return (
    <>
      <div className="w-full h-64 bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5 shadow-lg relative group">
        
        {/* Zoom Controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button onClick={handleZoomIn} className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm transition-colors shadow-lg">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={handleZoomOut} className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm transition-colors shadow-lg">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={handleReset} className="w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/10 backdrop-blur-sm transition-colors shadow-lg">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredCountryData && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-3 left-3 bg-black/90 text-white text-xs p-3 rounded-xl border border-white/10 backdrop-blur-md pointer-events-none z-10 shadow-2xl min-w-[160px]"
            >
              <div className="font-bold text-gold-main mb-2 text-sm border-b border-white/10 pb-1 flex items-center gap-1.5">
                <span className="text-base leading-none">{getCountryFlag(hoveredCountryData.name)}</span>
                <span>{hoveredCountryData.name} {hoveredCountryData.count > 0 && `(${hoveredCountryData.count})`}</span>
              </div>
              {hoveredCountryData.count === 0 ? (
                <div className="text-white/50 italic">Zatiaľ žiadne vzorky</div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-1"><Award className="w-3 h-3 text-gold-main" /> Celkovo:</span>
                      <span className="text-gold-main font-mono font-bold">{hoveredCountryData.avgOverall}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-1"><Eye className="w-3 h-3 text-blue-400" /> Vizuál:</span>
                      <span className="text-blue-400 font-mono">{hoveredCountryData.avgVisual}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-1"><Wind className="w-3 h-3 text-emerald-400" /> Aróma:</span>
                      <span className="text-emerald-400 font-mono">{hoveredCountryData.avgAroma}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 flex items-center gap-1"><Coffee className="w-3 h-3 text-amber-400" /> Chuť:</span>
                      <span className="text-amber-400 font-mono">{hoveredCountryData.avgTaste}</span>
                    </div>
                  </div>
                  
                  {hoveredCountryData.topTags.length > 0 && (
                    <div className="mt-1 pt-2 border-t border-white/10">
                      <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Najčastejšie tagy</div>
                      <div className="flex flex-wrap gap-1">
                        {hoveredCountryData.topTags.map(tag => (
                          <span key={tag} className="bg-white/10 text-white/80 px-1.5 py-0.5 rounded text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
          <ZoomableGroup 
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            translateExtent={[
              [-100, -100],
              [900, 500]
            ]}
            minZoom={1} 
            maxZoom={4}
            style={{ transition: isAnimating ? "transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)" : "none" }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies
                  .filter(geo => geo.properties.name !== "Antarctica")
                  .map((geo) => {
                    const countryName = geo.properties.name;
                    const count = countryCounts[countryName] || 0;
                    const isHovered = hoveredCountry === countryName;
                    const isSelected = selectedCountry === countryName;
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        className={count > 0 && !isSelected ? "animate-country-glow" : ""}
                        fill={isSelected ? themeColor : (count > 0 ? colorScale(count) : "#1A1A1A")}
                        stroke={isSelected ? "#FFFFFF" : "rgba(255,255,255,0.15)"}
                        strokeWidth={isSelected ? 1.5 : (isHovered ? 1 : 0.5)}
                        onMouseEnter={() => {
                          setHoveredCountry(countryName);
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null);
                        }}
                        onClick={() => {
                          setSelectedCountry(countryName);
                        }}
                        style={{
                          default: { 
                            fill: isSelected ? themeColor : (count > 0 ? colorScale(count) : "#1A1A1A"),
                            outline: "none", 
                            cursor: "pointer", 
                            transition: "all 250ms",
                            "--glow-color": `${themeColor}66`
                          } as React.CSSProperties,
                          hover: { 
                            fill: isSelected ? themeColor : (count > 0 ? "#fff4b3" : "#2A2A2A"), 
                            outline: "none", 
                            cursor: "pointer", 
                            transition: "all 250ms" 
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        
        {Object.keys(countryCounts).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-text-muted text-sm bg-[#1a1a1a]/80 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">Zatiaľ žiadne krajiny</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="bg-bg-panel border border-white/10 rounded-2xl w-full overflow-hidden shadow-lg"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none">{getCountryFlag(selectedCountry)}</span>
                <div>
                  <h3 className="text-xl font-heading text-gold-main">{selectedCountry}</h3>
                  <p className="text-sm text-text-muted mt-0.5">
                    {countryCounts[selectedCountry] || 0} {(countryCounts[selectedCountry] === 1) ? 'hodnotená vzorka' : ((countryCounts[selectedCountry] || 0) >= 2 && (countryCounts[selectedCountry] || 0) <= 4) ? 'hodnotené vzorky' : 'hodnotených vzoriek'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCountry(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            <div className="p-4 max-h-[300px] overflow-y-auto">
              <div className="space-y-3">
                {selectedCountrySamples.length > 0 ? (
                  selectedCountrySamples.map(sample => {
                    const rating = tastingData[sample.id];
                    return (
                      <div key={sample.id} className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                          <img src={sample.image} alt={sample.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{sample.name}</h4>
                          <div className="flex items-center gap-1 mt-1 text-gold-main">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span className="text-sm font-mono">{rating.overall}/10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-text-muted">
                    <p>Zatiaľ žiadne hodnotené vzorky z tejto krajiny.</p>
                    <p className="text-xs mt-2 opacity-70">Uistite sa, že ste pri hodnotení zadali presný názov krajiny (napr. "{selectedCountry}").</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

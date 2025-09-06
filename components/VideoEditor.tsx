import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Caption, StyleOptions, HorizontalAlign, CaptionEffect } from '../types';
import { Timeline } from './Timeline';

interface VideoEditorProps {
    initialCaptions: Caption[];
    videoUrl: string;
    videoFileName: string;
    onReset: () => void;
}

const DEFAULT_STYLES: StyleOptions = {
    foregroundColor: '#FFFFFF',
    foregroundColorOpacity: 1,
    backgroundColor: '#000000',
    backgroundOpacity: 0.6,
    fontSize: 5, // 5% of video height
    maxWidth: 80, // 80% of video width
    padding: 20, // 20% of font size
    borderRadius: 8,
    position: { x: 50, y: 90 }, // Center bottom
    horizontalAlign: 'center',
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    effect: 'shadow',
    shadowColor: '#000000',
    shadowBlur: 5,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    strokeColor: '#000000',
    strokeWidth: 2,
};

const PRESETS: { name: string, styles: Partial<StyleOptions> }[] = [
    { name: 'Classic Movie', styles: { fontFamily: 'Times New Roman', foregroundColor: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0, effect: 'outline', strokeColor: '#000000', strokeWidth: 2, fontWeight: 'normal', position: { x: 50, y: 90 } } },
    { name: 'Social Media', styles: { fontFamily: 'Impact', foregroundColor: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0.5, effect: 'shadow', shadowColor: '#000000', shadowBlur: 5, shadowOffsetX: 3, shadowOffsetY: 3, fontWeight: 'bold', position: { x: 50, y: 85 } } },
    { name: 'News Ticker', styles: { fontFamily: 'Arial', foregroundColor: '#FFFFFF', backgroundColor: '#0000FF', backgroundOpacity: 1, effect: 'none', fontWeight: 'bold', position: { x: 50, y: 95 }, borderRadius: 0 } },
    { name: 'Minimalist', styles: { fontFamily: 'Verdana', foregroundColor: '#FFFFFF', backgroundColor: '#000000', backgroundOpacity: 0, effect: 'shadow', shadowColor: '#000000', shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 0, fontWeight: 'normal', position: { x: 50, y: 90 } } },
];

const FONT_FACES = ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Lucida Console', 'Impact', 'Comic Sans MS'];
const COLOR_SWATCHES = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

// --- Time Formatting Utilities ---
const formatDisplayTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

const formatSRTTime = (seconds: number): string => {
    const date = new Date(0);
    date.setSeconds(seconds);
    const time = date.toISOString().substr(11, 12);
    return time.replace('.', ',');
};

// --- Helper Utilities ---
function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
}

function rgbaToString(rgb: string, opacity: number): string {
    return `rgba(${rgb}, ${opacity})`;
}

// --- SVG Icons for Tools ---
const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const SplitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.58 3.42A2 2 0 0 1 20 5v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h13.58zM12 11v10M8.5 21a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM19.5 21a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z" /></svg>;
const MergeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8L22 12L18 16"/><path d="M6 8L2 12L6 16"/><path d="M2 12H22"/></svg>;
const EyedropperIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 5.5-5.5"/><path d="M18.6 11.2c.4-1.6-.2-3.3-1.6-4.3l-2.4-1.7c-1-.7-2.6-.5-3.3.5L2.6 14c-.7 1 .2 2.5 1.7 3.3l2.4 1.7c1.6.9 3.5.7 4.5-.3l7.4-10.5z"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

// --- Canvas Drawing Logic ---
const drawText = (
    ctx: CanvasRenderingContext2D, 
    text: string, 
    styles: StyleOptions, 
    videoWidth: number,
    videoHeight: number
): { x: number; y: number; width: number; height: number } => {
    // Reset effects from previous draws
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;

    const fontSizePx = (styles.fontSize / 100) * videoHeight;
    const maxWidthPx = (styles.maxWidth / 100) * videoWidth;
    const paddingPx = fontSizePx * (styles.padding / 100);
    const positionX = (styles.position.x / 100) * videoWidth;
    const positionY = (styles.position.y / 100) * videoHeight;

    ctx.font = `${styles.fontWeight} ${fontSizePx}px ${styles.fontFamily}`;
    ctx.textAlign = styles.horizontalAlign;
    ctx.textBaseline = 'middle';

    const allLines: string[] = [];
    text.split('\n').forEach(initialLine => {
        let currentLine = '';
        for (const word of initialLine.split(' ')) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxWidthPx && currentLine) {
                allLines.push(currentLine);
                currentLine = word;
            } else { currentLine = testLine; }
        }
        allLines.push(currentLine);
    });

    const lineHeight = fontSizePx * 1.2;
    let textBlockWidth = 0;
    allLines.forEach(line => textBlockWidth = Math.max(textBlockWidth, ctx.measureText(line).width));
    
    const bgWidth = textBlockWidth + (paddingPx * 2);
    const totalTextHeight = allLines.length * lineHeight;
    const bgHeight = totalTextHeight + (paddingPx * 2);
    const bgX = positionX - (bgWidth / 2);
    const bgY = positionY - (bgHeight / 2);

    ctx.globalAlpha = styles.backgroundOpacity;
    ctx.fillStyle = styles.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, styles.borderRadius);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    
    if (styles.effect === 'shadow') {
        ctx.shadowColor = styles.shadowColor;
        ctx.shadowBlur = styles.shadowBlur;
        ctx.shadowOffsetX = styles.shadowOffsetX;
        ctx.shadowOffsetY = styles.shadowOffsetY;
    } else if (styles.effect === 'outline') {
        ctx.strokeStyle = styles.strokeColor;
        ctx.lineWidth = styles.strokeWidth;
    }
    
    ctx.fillStyle = rgbaToString(hexToRgb(styles.foregroundColor), styles.foregroundColorOpacity);
    const startY = bgY + paddingPx + (totalTextHeight / allLines.length) / 2;

    allLines.forEach((line, index) => {
        let lineX = bgX + paddingPx;
        if (styles.horizontalAlign === 'center') lineX = bgX + bgWidth / 2;
        else if (styles.horizontalAlign === 'right') lineX = bgX + bgWidth - paddingPx;
        const lineY = startY + (index * lineHeight);
        if (styles.effect === 'outline' && styles.strokeWidth > 0) ctx.strokeText(line, lineX, lineY);
        ctx.fillText(line, lineX, lineY);
    });

    return { x: bgX, y: bgY, width: bgWidth, height: bgHeight };
};

// --- Style Input Component ---
interface StyleSliderInputProps { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min: number; max: number; step: number; }
const StyleSliderInput: React.FC<StyleSliderInputProps> = ({ label, value, onChange, min, max, step }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="text-gray-300 text-xs">{label}</label>
            <input type="number" value={value} onChange={onChange} min={min} max={max} step={step} className="w-20 bg-gray-800 border border-gray-600 rounded-md p-1 text-xs text-right focus:ring-gray-400 focus:border-gray-400" />
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500" />
    </div>
);

// --- Precise Time Input Component ---
interface TimeInputProps { value: number; max: number; onChange: (newValue: number) => void; }
const TimeInput: React.FC<TimeInputProps> = ({ value, max, onChange }) => {
    const [displayValue, setDisplayValue] = useState(formatDisplayTime(value));
    
    useEffect(() => { setDisplayValue(formatDisplayTime(value)); }, [value]);

    const parseTime = (timeStr: string): number | null => {
        const parts = timeStr.split(/[:.]/).map(p => parseInt(p, 10));
        if (parts.some(isNaN)) return null;
        try {
            if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 1000;
            if (parts.length === 2) return parts[0] + parts[1] / 1000;
            if (parts.length === 1) return parts[0];
        } catch { return null; }
        return null;
    };

    const handleBlur = () => {
        const parsedSeconds = parseTime(displayValue);
        if (parsedSeconds !== null) {
            onChange(Math.max(0, Math.min(max, parsedSeconds)));
        } else {
            setDisplayValue(formatDisplayTime(value));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
            setDisplayValue(formatDisplayTime(value));
            (e.target as HTMLInputElement).blur();
        }
    };
    
    return (
        <input 
            type="text" 
            value={displayValue}
            onChange={e => setDisplayValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="bg-gray-700/50 text-gray-300 text-xs font-mono rounded-md px-2 py-1 whitespace-nowrap w-24 text-center focus:bg-gray-700 focus:ring-1 focus:ring-gray-400 focus:outline-none"
        />
    );
};


// --- Main Editor Component ---
export const VideoEditor: React.FC<VideoEditorProps> = ({ initialCaptions, videoUrl, videoFileName, onReset }) => {
    type EditorState = { captions: Caption[], styles: StyleOptions };

    const sortedCaptions = useMemo(() => 
        [...initialCaptions].sort((a, b) => a.start - b.start), 
        [initialCaptions]
    );

    const [history, setHistory] = useState<EditorState[]>([{ captions: sortedCaptions, styles: DEFAULT_STYLES }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    
    const currentState = history[historyIndex];
    const { captions, styles } = currentState || { captions: sortedCaptions, styles: DEFAULT_STYLES }; // Safeguard
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    
    const [customPresets, setCustomPresets] = useState<{name: string, styles: StyleOptions}[]>(() => {
        try {
            const item = window.localStorage.getItem('captionerCustomPresets');
            return item ? JSON.parse(item) : [];
        } catch (error) { return []; }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('captionerCustomPresets', JSON.stringify(customPresets));
        } catch (error) { console.error("Could not save custom presets:", error); }
    }, [customPresets]);

    const updateState = useCallback((updater: (prevState: EditorState) => EditorState, mergeWithLast: boolean = false) => {
        setHistory(prevHistory => {
            const stateToUpdate = prevHistory[historyIndex];
            if (!stateToUpdate) {
                console.error("Attempted to update a non-existent history state.");
                return prevHistory;
            }
            const newHistoryIndex = mergeWithLast ? historyIndex : historyIndex + 1;
            const newState = updater(stateToUpdate);
            const historySlice = prevHistory.slice(0, newHistoryIndex);
            
            return [...historySlice, newState];
        });
    
        if (!mergeWithLast) {
          setHistoryIndex(prevIndex => prevIndex + 1);
        }
    }, [historyIndex]);
  
    const undo = useCallback(() => canUndo && setHistoryIndex(historyIndex - 1), [canUndo, historyIndex]);
    const redo = useCallback(() => canRedo && setHistoryIndex(historyIndex + 1), [canRedo, historyIndex]);

    const [activeTab, setActiveTab] = useState<'captions' | 'styles'>('captions');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportMessage, setExportMessage] = useState('');
    const [waveform, setWaveform] = useState<Float32Array | null>(null);
    const [isGeneratingWaveform, setIsGeneratingWaveform] = useState(true);
    const [videoDuration, setVideoDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeCaptionIndex, setActiveCaptionIndex] = useState(-1);
    const [editingCaption, setEditingCaption] = useState<{ index: number; text: string } | null>(null);
    const [eyedropper, setEyedropper] = useState<{active: boolean, target: keyof StyleOptions | null}>({active: false, target: null});
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
    const [selectedCaptionIndex, setSelectedCaptionIndex] = useState<number | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth * 0.33);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const captionListRef = useRef<HTMLDivElement>(null);
    const isNudgingRef = useRef(false);
    
    const [isDragging, setIsDragging] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, styleX: 0, styleY: 0 });
    const [captionBoundingBox, setCaptionBoundingBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
    };

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current || !editorContainerRef.current) return;
        const totalWidth = editorContainerRef.current.offsetWidth;
        const newSidebarWidth = totalWidth - e.clientX + (editorContainerRef.current.getBoundingClientRect().left);
        const minWidth = 350;
        const maxWidth = totalWidth * 0.6;
        setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newSidebarWidth)));
    }, []);

    const handleResizeMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
    }, [handleResizeMouseMove]);

    useEffect(() => {
        const generateWaveform = async () => {
            setIsGeneratingWaveform(true);
            try {
                const audioContext = new AudioContext();
                const response = await fetch(videoUrl);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                const channelData = audioBuffer.getChannelData(0);
                const samples = 2000; const blockSize = Math.floor(channelData.length / samples);
                const filteredData = new Float32Array(samples);
                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) { sum += Math.abs(channelData[blockSize * i + j]); }
                    filteredData[i] = sum / blockSize;
                }
                setWaveform(filteredData);
            } catch (error) { console.error("Failed to generate waveform:", error);
            } finally { setIsGeneratingWaveform(false); }
        };
        generateWaveform();
    }, [videoUrl]);
    
    const handleSeek = useCallback((time: number) => { if(videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(videoDuration, time)); }, [videoDuration]);
    const handleCaptionTimeChange = useCallback((index: number, start: number, end: number, merge: boolean) => {
        updateState(prev => {
            const newCaptions = [...prev.captions];
            if (newCaptions[index]) {
                newCaptions[index] = { ...newCaptions[index], start, end };
            }
            return { ...prev, captions: newCaptions };
        }, merge);
    }, [updateState]);

    const handleDeleteCaption = useCallback((index: number) => {
        updateState(prev => {
            const newCaptions = [...prev.captions];
            newCaptions.splice(index, 1);
            return { ...prev, captions: newCaptions };
        });
        setSelectedCaptionIndex(null);
    }, [updateState]);

    // Effect for keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape' && editingCaption) setEditingCaption(null); return;
            }
            if (e.metaKey || e.ctrlKey) {
                if (e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
                else if (e.key === 'y') { e.preventDefault(); redo(); } return;
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectedCaptionIndex !== null) {
                e.preventDefault();
                handleDeleteCaption(selectedCaptionIndex);
                return;
            }
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedCaptionIndex !== null) {
                e.preventDefault();
                const frameDuration = 1 / 30; // Assuming 30fps
                const nudgeAmount = e.shiftKey ? 10 * frameDuration : frameDuration;
                
                const caption = captions[selectedCaptionIndex];
                const duration = caption.end - caption.start;
                
                let newStart = e.key === 'ArrowLeft' ? caption.start - nudgeAmount : caption.start + nudgeAmount;
                let newEnd = newStart + duration;

                if (newStart < 0) { newStart = 0; newEnd = duration; }
                if (newEnd > videoDuration) { newEnd = videoDuration; newStart = videoDuration - duration; }
                
                const prevCaption = captions[selectedCaptionIndex - 1];
                if (prevCaption && newStart < prevCaption.end) { newStart = prevCaption.end; newEnd = newStart + duration; }
                const nextCaption = captions[selectedCaptionIndex + 1];
                if (nextCaption && newEnd > nextCaption.start) { newEnd = nextCaption.start; newStart = newEnd - duration; }
                
                if (newStart >= 0 && newEnd <= videoDuration && newEnd > newStart) {
                    handleCaptionTimeChange(selectedCaptionIndex, newStart, newEnd, true);
                    isNudgingRef.current = true;
                }
                return;
            }

            if (e.key === ' ') { e.preventDefault(); videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); handleSeek(currentTime - (1/30)); }
            if (e.key === 'ArrowRight') { e.preventDefault(); handleSeek(currentTime + (1/30)); }
            if (e.key === 'Tab') {
                e.preventDefault(); const direction = e.shiftKey ? -1 : 1;
                let nextCaption;
                if(direction === 1) { nextCaption = captions.find(c => c.start > currentTime); }
                else { nextCaption = [...captions].reverse().find(c => c.end < currentTime); }
                if(nextCaption) handleSeek(nextCaption.start);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && isNudgingRef.current) {
                isNudgingRef.current = false;
                updateState(prev => ({ ...prev }), false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
    }, [captions, currentTime, handleSeek, undo, redo, editingCaption, selectedCaptionIndex, videoDuration, handleCaptionTimeChange, updateState, handleDeleteCaption]);

    // Effect for Video Listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleMetadata = () => {
            setVideoDuration(video.duration);
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                if(canvasRef.current){
                    canvasRef.current.width = video.videoWidth;
                    canvasRef.current.height = video.videoHeight;
                }
                setVideoAspectRatio(video.videoWidth / video.videoHeight);
            }
        };
        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            setActiveCaptionIndex(captions.findIndex(c => video.currentTime >= c.start && video.currentTime <= c.end));
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('loadedmetadata', handleMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        // Handle case where metadata is already loaded
        if (video.readyState >= 1) handleMetadata();

        return () => {
            video.removeEventListener('loadedmetadata', handleMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [videoUrl, captions]);

    // Effect for Canvas Rendering
    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const renderLoop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const time = video.currentTime;
            const activeIndex = editingCaption ? editingCaption.index : captions.findIndex(c => time >= c.start && time <= c.end);

            if (activeIndex !== -1) {
                const textToRender = editingCaption && editingCaption.index === activeIndex ? editingCaption.text : captions[activeIndex].text;
                const bounds = drawText(ctx, textToRender, styles, canvas.width, canvas.height);
                setCaptionBoundingBox(bounds);
            } else {
                setCaptionBoundingBox({ x: 0, y: 0, width: 0, height: 0 });
            }
            animationFrameId = requestAnimationFrame(renderLoop);
        };
        
        renderLoop();
        
        return () => { cancelAnimationFrame(animationFrameId); };
    }, [captions, styles, editingCaption, videoUrl]);
    
    useEffect(() => {
        if(activeCaptionIndex > -1 && captionListRef.current) {
            const activeElement = captionListRef.current.children[activeCaptionIndex] as HTMLElement;
            if(activeElement) activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeCaptionIndex]);

    const handleCaptionTextChange = (index: number, text: string) => { updateState(prev => { const newCaptions = [...prev.captions]; newCaptions[index] = { ...newCaptions[index], text }; return { ...prev, captions: newCaptions }; }); };
    const handleStyleChange = (field: keyof StyleOptions, value: any, merge: boolean = false) => { updateState(prev => ({ ...prev, styles: { ...prev.styles, [field]: value } }), merge); };
    const handleStyleInputChange = (field: keyof StyleOptions, value: string) => { handleStyleChange(field, parseFloat(value), true); };

    const handleSplitCaption = (index: number) => {
        const time = videoRef.current?.currentTime; const caption = captions[index]; if (time === undefined || time <= caption.start || time >= caption.end) return;
        updateState(prev => { const newCaptions = [...prev.captions]; const originalCaption = newCaptions[index]; const firstPart = { ...originalCaption, end: time }; const secondPart = { ...originalCaption, start: time }; newCaptions.splice(index, 1, firstPart, secondPart); return { ...prev, captions: newCaptions }; });
    };
    
    const handleMergeCaption = (index: number) => {
        if (index + 1 >= captions.length) return;
        updateState(prev => { const newCaptions = [...prev.captions]; const first = newCaptions[index]; const second = newCaptions[index + 1]; const merged = { start: first.start, end: second.end, text: `${first.text} ${second.text}`.trim() }; newCaptions.splice(index, 2, merged); return { ...prev, captions: newCaptions }; });
    };

    const handleAddCaption = () => {
        const time = videoRef.current?.currentTime ?? 0;
        const newCaption: Caption = {
            start: time,
            end: Math.min(time + 2, videoDuration),
            text: "New Caption"
        };
        updateState(prev => {
            const newCaptions = [...prev.captions].sort((a,b) => a.start - b.start);
            const insertIndex = newCaptions.findIndex(c => c.start > time);
            
            if (insertIndex === -1) { // Add to end
                const lastCaption = newCaptions[newCaptions.length - 1];
                if (lastCaption && newCaption.start < lastCaption.end) newCaption.start = lastCaption.end;
                if (newCaption.end - newCaption.start < 0.1) { alert("Not enough space to add a new caption here."); return prev; }
                newCaptions.push(newCaption);
            } else { // Insert in middle
                const prevCaption = newCaptions[insertIndex - 1];
                if (prevCaption && newCaption.start < prevCaption.end) newCaption.start = prevCaption.end;
                const nextCaption = newCaptions[insertIndex];
                if (nextCaption && newCaption.end > nextCaption.start) newCaption.end = nextCaption.start;
                if (newCaption.end - newCaption.start < 0.1) { alert("Not enough space to add a new caption here."); return prev; }
                newCaptions.splice(insertIndex, 0, newCaption);
            }
            return { ...prev, captions: newCaptions };
        });
    };

    const handlePlayPause = () => {
        if (videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
        }
    };
    
    const sampleColorFromVideo = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const canvas = e.currentTarget;
        if (!video || !eyedropper.target || !eyedropper.active) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = video.videoWidth;
        offscreenCanvas.height = video.videoHeight;
        const ctx = offscreenCanvas.getContext('2d');
        if(!ctx) return;
        ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const pixel = ctx.getImageData(x * (video.videoWidth/canvas.clientWidth), y * (video.videoHeight/canvas.clientHeight), 1, 1).data;
        const color = `#${("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6)}`;
        
        handleStyleChange(eyedropper.target, color);
        setEyedropper({active: false, target: null});
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (eyedropper.active) return;
        const rect = e.currentTarget.getBoundingClientRect(); const canvas = canvasRef.current; if (!canvas) return;
        const scaleX = canvas.width / rect.width; const scaleY = canvas.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX; const mouseY = (e.clientY - rect.top) * scaleY;
        
        if (isDragging) {
            const videoWidth = videoRef.current?.videoWidth ?? 1; const videoHeight = videoRef.current?.videoHeight ?? 1;
            const deltaX = (e.clientX - dragStart.x) * scaleX; const deltaY = (e.clientY - dragStart.y) * scaleY;
            const newStyleX = dragStart.styleX + (deltaX / videoWidth) * 100; const newStyleY = dragStart.styleY + (deltaY / videoHeight) * 100;
            handleStyleChange('position', { x: Math.max(0, Math.min(100, newStyleX)), y: Math.max(0, Math.min(100, newStyleY)) }, true);
        } else { const { x, y, width, height } = captionBoundingBox; setIsHovering(mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height); }
    };
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if(eyedropper.active) { sampleColorFromVideo(e); return; }
        if (isHovering) { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY, styleX: styles.position.x, styleY: styles.position.y }); }
    };

    const handleMouseUp = () => { if(isDragging) { updateState(prev => ({...prev})); setIsDragging(false); } };
    const handleDoubleClick = () => { if (isHovering && activeCaptionIndex !== -1) { videoRef.current?.pause(); setEditingCaption({ index: activeCaptionIndex, text: captions[activeCaptionIndex].text }); } };
    const handleInPlaceCaptionSave = () => { if (editingCaption) { handleCaptionTextChange(editingCaption.index, editingCaption.text); setEditingCaption(null); } };

    const handleDownloadSRT = () => {
        const srtContent = captions.map((caption, index) => `${index + 1}\n${formatSRTTime(caption.start)} --> ${formatSRTTime(caption.end)}\n${caption.text}\n`).join('\n');
        const blob = new Blob([srtContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; const baseFileName = videoFileName.substring(0, videoFileName.lastIndexOf('.')) || videoFileName; a.download = `${baseFileName}_captions.srt`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        if (!videoRef.current) return;
        if (typeof MediaRecorder === 'undefined') {
            alert("Sorry, your browser doesn't support the MediaRecorder API needed for video export.");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);
        setExportMessage("Initializing export...");

        const video = videoRef.current;
        video.pause();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            alert("Could not create canvas context for exporting.");
            setIsExporting(false);
            return;
        }

        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            setExportMessage("Finalizing video...");
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const baseFileName = videoFileName.substring(0, videoFileName.lastIndexOf('.')) || videoFileName;
            a.download = `${baseFileName}_captioned.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsExporting(false);
            setExportMessage('');
        };

        recorder.start();
        const originalTime = video.currentTime;
        const frameRate = 30;
        const numFrames = Math.floor(video.duration * frameRate);

        for (let i = 0; i <= numFrames; i++) {
            const time = i / frameRate;
            setExportMessage(`Rendering frame ${i} of ${numFrames}`);
            setExportProgress((i / numFrames) * 100);

            video.currentTime = time;
            await new Promise(resolve => { video.onseeked = resolve; });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const activeCaption = captions.find(c => time >= c.start && time < c.end);
            if (activeCaption) {
                drawText(ctx, activeCaption.text, styles, canvas.width, canvas.height);
            }
        }
        
        recorder.stop();
        video.currentTime = originalTime;
    };

    const applyPreset = (presetStyles: Partial<StyleOptions>) => { updateState(prev => ({...prev, styles: {...DEFAULT_STYLES, ...prev.styles, ...presetStyles}})) };
    const handleSavePreset = () => {
        const name = prompt("Enter a name for your preset:", "My Custom Style");
        if(name) { setCustomPresets(prev => [...prev, { name, styles }]); }
    };

    const renderInPlaceEditor = () => {
        const canvas = canvasRef.current; const video = videoRef.current; if (!canvas || !video || !editingCaption) return null;
        const scale = video.clientWidth / canvas.width; const fontSizePx = (styles.fontSize / 100) * canvas.height; const paddingPx = fontSizePx * (styles.padding / 100);
        const textareaStyle: React.CSSProperties = {
            position: 'absolute', left: `${(captionBoundingBox.x / canvas.width) * 100}%`, top: `${(captionBoundingBox.y / canvas.height) * 100}%`,
            width: `${(captionBoundingBox.width / canvas.width) * 100}%`, height: `${(captionBoundingBox.height / canvas.height) * 100}%`,
            fontFamily: styles.fontFamily, fontWeight: styles.fontWeight, fontSize: `${fontSizePx * scale}px`, color: styles.foregroundColor,
            backgroundColor: `rgba(${hexToRgb(styles.backgroundColor)}, ${styles.backgroundOpacity})`, textAlign: styles.horizontalAlign, padding: `${paddingPx * scale}px`,
            border: '2px solid #f9fafb', borderRadius: `${styles.borderRadius * scale}px`, resize: 'none', boxSizing: 'border-box', zIndex: 20, lineHeight: 1.2, overflow: 'hidden',
        };
        return <textarea style={textareaStyle} value={editingCaption.text} onChange={(e) => setEditingCaption({ ...editingCaption, text: e.target.value })} onBlur={handleInPlaceCaptionSave} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); setEditingCaption(null); } if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInPlaceCaptionSave(); } }} autoFocus />;
    }

    const CollapsibleSection: React.FC<{title: string, children: React.ReactNode, defaultOpen?: boolean}> = ({ title, children, defaultOpen = false }) => (
        <details className="border-b border-gray-700/50 last:border-b-0" open={defaultOpen}>
            <summary className="list-none flex justify-between items-center py-2 cursor-pointer text-gray-200 hover:bg-gray-800/50 rounded-md px-2 -mx-2">
                <h4 className="font-semibold text-sm">{title}</h4>
                <ChevronDownIcon />
            </summary>
            <div className="pt-2 pb-4 px-2 space-y-4">{children}</div>
        </details>
    );

    return (
        <div ref={editorContainerRef} className="w-full bg-gray-900 rounded-lg shadow-2xl p-4 md:p-6 border border-gray-700/50 relative">
            {isExporting && ( <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 rounded-lg"> <p className="text-white text-lg font-semibold mb-2">Exporting Video...</p> <p className="text-gray-300 text-sm mb-4">{exportMessage}</p> <div className="w-1/2 mt-2 bg-gray-600 rounded-full h-2.5"> <div className="bg-gray-400 h-2.5 rounded-full" style={{ width: `${exportProgress.toFixed(0)}%` }}></div> </div> </div> )}
            <div className="flex w-full" style={{minHeight: '70vh'}}>
                <div className="flex flex-col gap-4 flex-grow pr-2" style={{width: `calc(100% - ${sidebarWidth}px - 6px)`}}>
                    <div className="w-full flex justify-center items-center bg-black rounded-lg overflow-hidden flex-grow relative">
                        <div
                            className="relative shadow-lg"
                            style={{
                                maxHeight: '100%',
                                maxWidth: '100%',
                                aspectRatio: videoAspectRatio ? `${videoAspectRatio}` : '16 / 9',
                            }}
                            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleDoubleClick}
                            >
                            <video ref={videoRef} src={videoUrl} controls className="w-full h-full block" style={{ cursor: eyedropper.active ? 'crosshair' : (isHovering ? 'move' : 'default') }}></video>
                            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
                            {renderInPlaceEditor()}
                        </div>
                    </div>
                     <div className="flex flex-col gap-2 flex-shrink-0">
                        <div className="flex items-center gap-4 px-2">
                             <label className="text-xs text-gray-400 whitespace-nowrap">Timeline Zoom</label>
                             <button onClick={() => setZoomLevel(z => Math.max(0.2, z - 0.2))} className="px-2 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600">-</button>
                             <input type="range" min="0.2" max="5" step="0.1" value={zoomLevel} onChange={e => setZoomLevel(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-500" />
                             <button onClick={() => setZoomLevel(z => Math.min(5, z + 0.2))} className="px-2 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600">+</button>
                        </div>
                        <Timeline 
                            captions={captions} 
                            waveform={waveform} 
                            duration={videoDuration} 
                            currentTime={currentTime} 
                            onSeek={handleSeek} 
                            onCaptionTimeChange={handleCaptionTimeChange} 
                            isLoading={isGeneratingWaveform} 
                            activeCaptionIndex={activeCaptionIndex}
                            selectedCaptionIndex={selectedCaptionIndex}
                            onSelectCaption={setSelectedCaptionIndex}
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                            isPlaying={isPlaying}
                            onPlayPause={handlePlayPause}
                        />
                    </div>
                </div>

                <div className="w-1.5 flex-shrink-0 cursor-col-resize bg-gray-800 hover:bg-gray-500 transition-colors duration-200 rounded-full mx-1" onMouseDown={handleResizeMouseDown}></div>

                <div className="flex flex-col pl-2" style={{width: `${sidebarWidth}px`}}>
                    <div className="w-full bg-gray-800/40 rounded-lg flex flex-col h-full">
                        <div className="flex-shrink-0">
                            <div className="flex border-b border-gray-700/50 mb-2 px-2">
                                <button onClick={() => setActiveTab('captions')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'captions' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}>Captions</button>
                                <button onClick={() => setActiveTab('styles')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'styles' ? 'text-white border-b-2 border-white' : 'text-gray-400 hover:text-white'}`}>Styles</button>
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto custom-scrollbar px-4 text-sm">
                            {activeTab === 'captions' && (
                                <div>
                                    <button onClick={handleAddCaption} className="w-full flex items-center justify-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md mb-4 shadow"><AddIcon /> Add Caption at Playhead</button>
                                    <div ref={captionListRef} className="space-y-3">
                                        {captions.map((caption, index) => (
                                            <div key={index} className={`p-3 rounded-lg transition-colors border ${activeCaptionIndex === index ? 'bg-gray-700/80 border-gray-500' : 'bg-gray-800/50 border-gray-700/80'}`}>
                                                <div className="flex gap-2 items-center mb-2">
                                                    <TimeInput value={caption.start} max={caption.end - 0.1} onChange={newStart => handleCaptionTimeChange(index, newStart, caption.end, false)} />
                                                    <span className="text-gray-500">→</span>
                                                    <TimeInput value={caption.end} max={videoDuration} onChange={newEnd => handleCaptionTimeChange(index, caption.start, newEnd, false)} />
                                                </div>
                                                <textarea value={caption.text} onChange={(e) => handleCaptionTextChange(index, e.target.value)} onClick={() => handleSeek(caption.start)} className="w-full bg-gray-900/70 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-gray-400 focus:border-gray-400 resize-none" rows={2}/>
                                                <div className="flex gap-2 mt-2 justify-end">
                                                    <button onClick={() => handleSplitCaption(index)} disabled={currentTime <= caption.start || currentTime >= caption.end} title="Split caption at current playhead position" className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><SplitIcon /> Split</button>
                                                    <button onClick={() => handleMergeCaption(index)} disabled={index >= captions.length - 1} title="Merge with next caption" className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"><MergeIcon/> Merge</button>
                                                    <button onClick={() => handleDeleteCaption(index)} title="Delete caption" className="flex items-center gap-1.5 text-xs bg-red-900/80 hover:bg-red-800 px-2 py-1 rounded-md"><DeleteIcon/> Delete</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'styles' && (
                                <div className="space-y-1">
                                    <CollapsibleSection title="Presets" defaultOpen>
                                        <div className="flex flex-wrap gap-2">{PRESETS.map(p => <button key={p.name} onClick={() => applyPreset(p.styles)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">{p.name}</button>)} {customPresets.map(p => <button key={p.name} onClick={() => applyPreset(p.styles)} className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded">{p.name}</button>)}</div> <button onClick={handleSavePreset} className="text-xs w-full mt-2 bg-gray-700 hover:bg-gray-600 py-1 rounded">Save Custom Style</button>
                                    </CollapsibleSection>

                                    <CollapsibleSection title="Text & Font" defaultOpen>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-gray-300 block mb-1 text-xs">Font Family</label><select value={styles.fontFamily} onChange={e => handleStyleChange('fontFamily', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-xs focus:ring-gray-400 focus:border-gray-400">{FONT_FACES.map(font => <option key={font} value={font}>{font}</option>)}</select></div>
                                            <div><label className="text-gray-300 block mb-1 text-xs">Font Weight</label><div className="grid grid-cols-2 gap-2"><button onClick={() => handleStyleChange('fontWeight', 'normal')} className={`p-2 rounded text-xs font-semibold ${styles.fontWeight === 'normal' ? 'bg-gray-500' : 'bg-gray-700'}`}>Normal</button><button onClick={() => handleStyleChange('fontWeight', 'bold')} className={`p-2 rounded text-xs font-semibold ${styles.fontWeight === 'bold' ? 'bg-gray-500' : 'bg-gray-700'}`}>Bold</button></div></div>
                                        </div>
                                        <StyleSliderInput label="Font Size (%)" min={1} max={15} step={0.5} value={styles.fontSize} onChange={e => handleStyleInputChange('fontSize', e.target.value)} />
                                        <StyleSliderInput label="Max Width (%)" min={20} max={100} step={1} value={styles.maxWidth} onChange={e => handleStyleInputChange('maxWidth', e.target.value)} />
                                    </CollapsibleSection>
                                    
                                    <CollapsibleSection title="Position & Alignment" defaultOpen>
                                        <div>
                                            <label className="text-gray-300 block mb-1 text-xs">Text Alignment (in box)</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button onClick={() => handleStyleChange('horizontalAlign', 'left')} className={`p-2 rounded text-xs ${styles.horizontalAlign === 'left' ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Left</button>
                                                <button onClick={() => handleStyleChange('horizontalAlign', 'center')} className={`p-2 rounded text-xs ${styles.horizontalAlign === 'center' ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Center</button>
                                                <button onClick={() => handleStyleChange('horizontalAlign', 'right')} className={`p-2 rounded text-xs ${styles.horizontalAlign === 'right' ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Right</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-gray-300 block mb-1 text-xs">Caption Position</label>
                                            <p className="text-gray-400 text-[10px] mb-2">You can also drag the caption on the video preview.</p>
                                            <button onClick={() => handleStyleChange('position', { x: 50, y: 50 })} className="w-full text-xs bg-gray-700 hover:bg-gray-600 p-2 rounded">Center on Screen</button>
                                        </div>
                                    </CollapsibleSection>
                                    
                                    <CollapsibleSection title="Color & Appearance">
                                        <div><label className="text-gray-300 block mb-1 text-xs">Text Color</label><div className="flex items-center gap-2"><input type="color" value={styles.foregroundColor} onChange={e => handleStyleChange('foregroundColor', e.target.value, true)} className="p-0 h-8 w-10 bg-gray-700 border-none rounded cursor-pointer" /><div className="flex flex-wrap gap-1 flex-1">{COLOR_SWATCHES.map(c => <button key={c} onClick={()=>handleStyleChange('foregroundColor', c)} style={{backgroundColor: c}} className="w-5 h-5 rounded-full border border-gray-500"/>)}</div><button onClick={() => setEyedropper({active: true, target: 'foregroundColor'})} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"><EyedropperIcon/></button></div></div>
                                        <StyleSliderInput label="Text Opacity" min={0} max={1} step={0.05} value={styles.foregroundColorOpacity} onChange={e => handleStyleInputChange('foregroundColorOpacity', e.target.value)} />
                                        <div><label className="text-gray-300 block mb-1 text-xs">Background Color</label><div className="flex items-center gap-2"><input type="color" value={styles.backgroundColor} onChange={e => handleStyleChange('backgroundColor', e.target.value, true)} className="p-0 h-8 w-10 bg-gray-700 border-none rounded cursor-pointer" /><div className="flex flex-wrap gap-1 flex-1">{COLOR_SWATCHES.map(c => <button key={c} onClick={()=>handleStyleChange('backgroundColor', c)} style={{backgroundColor: c}} className="w-5 h-5 rounded-full border border-gray-500"/>)}</div><button onClick={() => setEyedropper({active: true, target: 'backgroundColor'})} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded"><EyedropperIcon/></button></div></div>
                                        <StyleSliderInput label="Bg Opacity" min={0} max={1} step={0.05} value={styles.backgroundOpacity} onChange={e => handleStyleInputChange('backgroundOpacity', e.target.value)} />
                                    </CollapsibleSection>
                                    
                                    <CollapsibleSection title="Effects">
                                        <div><label className="text-gray-300 block mb-1 text-xs">Effect</label><div className="grid grid-cols-3 gap-2"><button onClick={() => handleStyleChange('effect', 'none')} className={`p-2 rounded text-xs ${styles.effect === 'none' ? 'bg-gray-500' : 'bg-gray-700'}`}>None</button><button onClick={() => handleStyleChange('effect', 'shadow')} className={`p-2 rounded text-xs ${styles.effect === 'shadow' ? 'bg-gray-500' : 'bg-gray-700'}`}>Shadow</button><button onClick={() => handleStyleChange('effect', 'outline')} className={`p-2 rounded text-xs ${styles.effect === 'outline' ? 'bg-gray-500' : 'bg-gray-700'}`}>Outline</button></div></div>
                                        {styles.effect === 'shadow' && <div className="p-3 bg-gray-900/50 rounded-md space-y-3"> <label className="text-gray-300 block text-xs">Shadow Color</label> <input type="color" value={styles.shadowColor} onChange={e => handleStyleChange('shadowColor', e.target.value, true)} className="w-full h-8 bg-gray-800 border-none rounded cursor-pointer" /> <StyleSliderInput label="Blur" min={0} max={20} step={1} value={styles.shadowBlur} onChange={e => handleStyleInputChange('shadowBlur', e.target.value)} /> <StyleSliderInput label="Offset X" min={-10} max={10} step={1} value={styles.shadowOffsetX} onChange={e => handleStyleInputChange('shadowOffsetX', e.target.value)} /> <StyleSliderInput label="Offset Y" min={-10} max={10} step={1} value={styles.shadowOffsetY} onChange={e => handleStyleInputChange('shadowOffsetY', e.target.value)} /></div>}
                                        {styles.effect === 'outline' && <div className="p-3 bg-gray-900/50 rounded-md space-y-3"> <label className="text-gray-300 block text-xs">Outline Color</label> <input type="color" value={styles.strokeColor} onChange={e => handleStyleChange('strokeColor', e.target.value, true)} className="w-full h-8 bg-gray-800 border-none rounded cursor-pointer" /> <StyleSliderInput label="Width" min={0} max={10} step={0.5} value={styles.strokeWidth} onChange={e => handleStyleInputChange('strokeWidth', e.target.value)} /></div>}
                                    </CollapsibleSection>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 justify-between items-center">
                 <button onClick={onReset} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Start Over</button>
                 <div className="flex flex-wrap gap-2 md:gap-4">
                     <button onClick={undo} disabled={!canUndo} className="bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">Undo</button>
                     <button onClick={redo} disabled={!canRedo} className="bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg disabled:opacity-50 transition-colors">Redo</button>
                     <button onClick={handleDownloadSRT} className="bg-gray-700 hover:bg-gray-600 py-2 px-4 rounded-lg transition-colors">Download .SRT</button>
                    <button onClick={handleExport} disabled={isExporting} className="bg-gray-200 hover:bg-white text-black font-bold py-2 px-6 rounded-lg disabled:opacity-50 transition-colors">Export Video</button>
                </div>
            </div>
            <div className="mt-4 text-center text-xs text-gray-500">
                <span className="font-bold">Pro Tip:</span> Use <kbd className="font-sans border border-gray-600 bg-gray-700 rounded-sm px-1 py-0.5">←</kbd><kbd className="font-sans border border-gray-600 bg-gray-700 rounded-sm px-1 py-0.5">→</kbd> to nudge captions. Use <kbd className="font-sans border border-gray-600 bg-gray-700 rounded-sm px-1 py-0.5">Delete</kbd> to remove. Hold <kbd className="font-sans border border-gray-600 bg-gray-700 rounded-sm px-1 py-0.5">Shift</kbd> for bigger steps.
            </div>
        </div>
    );
};
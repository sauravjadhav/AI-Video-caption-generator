import React, { useRef, useEffect, useState, memo } from 'react';
import type { Caption } from '../types';

interface TimelineProps {
    captions: Caption[];
    waveform: Float32Array | null;
    duration: number;
    currentTime: number;
    onSeek: (time: number) => void;
    onCaptionTimeChange: (index: number, start: number, end: number, mergeWithLastHistory: boolean) => void;
    isLoading: boolean;
    activeCaptionIndex: number;
    selectedCaptionIndex: number | null;
    onSelectCaption: (index: number | null) => void;
    zoomLevel: number;
    onZoomChange: (newZoom: number) => void;
    isPlaying: boolean;
    onPlayPause: () => void;
}

const Waveform = memo(({ waveform, height, width }: { waveform: Float32Array | null, height: number, width: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!waveform || !canvasRef.current || width === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, width, height);

        const maxAmp = Math.max(...waveform);
        if(maxAmp === 0) return;

        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)'; // gray-400 with opacity

        const centerY = height / 2;
        ctx.beginPath();
        const step = Math.max(1, Math.floor(waveform.length / width));
        for (let i = 0; i < waveform.length; i+= step) {
            const x = (i / waveform.length) * width;
            const amp = (waveform[i] / maxAmp) * centerY * 0.9;
            ctx.moveTo(x, centerY - amp);
            ctx.lineTo(x, centerY + amp);
        }
        ctx.stroke();

    }, [waveform, height, width]);

    return <canvas ref={canvasRef} style={{width: `${width}px`, height: `${height}px`}} className="absolute top-0 left-0" />;
});


const TimeRuler = memo(({ duration, totalWidth, onSeek, onScrub }: { duration: number, totalWidth: number, onSeek: (time:number) => void, onScrub: (scrubbing:boolean) => void }) => {
    const rulerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ruler = rulerRef.current;
        const handleInteraction = (e: MouseEvent) => {
            if (!ruler || duration <= 0 || totalWidth <= 0) return;
            const rect = ruler.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / totalWidth) * duration;
            onSeek(Math.max(0, Math.min(duration, time)));
        };
        const handleMouseDown = (e: MouseEvent) => {
            onScrub(true);
            handleInteraction(e);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        };
        const handleMouseMove = (e: MouseEvent) => {
            handleInteraction(e);
        };
        const handleMouseUp = () => {
            onScrub(false);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        ruler?.addEventListener('mousedown', handleMouseDown);
        return () => {
            ruler?.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [duration, totalWidth, onSeek, onScrub]);

    const ticks = [];
    if (duration > 0 && totalWidth > 0) {
        const pixelsPerSecond = totalWidth / duration;
        const timeIntervals = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
        const minPixelGap = 70;
        
        let majorInterval = timeIntervals[timeIntervals.length -1];
        for(const interval of timeIntervals){
            if(interval * pixelsPerSecond > minPixelGap){
                majorInterval = interval; break;
            }
        }
        
        const minorInterval = majorInterval / (pixelsPerSecond * majorInterval > 100 ? 5 : 2);

        for (let i = 0; i <= duration + 0.001; i += minorInterval) {
            if (i > duration) continue;
            const isMajor = Math.abs(i % majorInterval) < 0.001 || Math.abs(i % majorInterval - majorInterval) < 0.001;
            const left = (i / duration) * totalWidth;
            
            const formatTime = (seconds: number) => {
                if (majorInterval < 1) return seconds.toFixed(1);
                if (majorInterval < 60) return Math.round(seconds) + 's';
                const minutes = Math.floor(seconds / 60);
                const secs = Math.round(seconds % 60);
                return `${minutes}:${String(secs).padStart(2, '0')}`;
            }

            ticks.push(
                <div key={`tick-${i}`} className="absolute h-full top-0" style={{ left: `${left}px` }}>
                    <div className={`w-px ${isMajor ? 'h-4 bg-gray-500' : 'h-2 bg-gray-600'}`}></div>
                    {isMajor && <span className="text-gray-400 text-[10px] absolute top-5 transform -translate-x-1/2">{formatTime(i)}</span>}
                </div>
            );
        }
    }

    return (
        <div ref={rulerRef} className="relative h-10 bg-gray-800/50 select-none cursor-pointer" style={{width: `${totalWidth}px`}}>
            {ticks}
        </div>
    );
});

const PlayIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"></path></svg>);
const PauseIcon = () => (<svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>);


export const Timeline: React.FC<TimelineProps> = ({
    captions, waveform, duration, currentTime, onSeek, onCaptionTimeChange,
    isLoading, activeCaptionIndex, selectedCaptionIndex, onSelectCaption,
    zoomLevel, onZoomChange, isPlaying, onPlayPause
}) => {
    const timelineWrapperRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);

    const PIXELS_PER_SECOND_BASE = 150;
    const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoomLevel;
    const totalWidth = duration * pixelsPerSecond;

    useEffect(() => {
        const scroller = scrollContainerRef.current;
        if (!scroller || duration <= 0 || isScrubbing) return;
        
        const playheadPx = currentTime * pixelsPerSecond;

        const containerWidth = scroller.offsetWidth;
        const scrollLeft = scroller.scrollLeft;

        const buffer = containerWidth * 0.2;
        if (playheadPx < scrollLeft + buffer || playheadPx > scrollLeft + containerWidth - buffer) {
            scroller.scrollTo({ left: playheadPx - containerWidth / 2, behavior: 'smooth' });
        }
    }, [currentTime, duration, isScrubbing, pixelsPerSecond]);


    type DragState = { index: number; mode: 'move' | 'resize-start' | 'resize-end'; startX: number; originalStart: number; originalEnd: number; }
    const [dragState, setDragState] = useState<DragState | null>(null);


    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('.caption-clip')) return;
        onSelectCaption(null);
    };

    const handleClipMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        onSelectCaption(index);
        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const edgeThreshold = 8;
        let mode: DragState['mode'] = 'move';
        if (clickX < edgeThreshold) mode = 'resize-start';
        else if (clickX > rect.width - edgeThreshold) mode = 'resize-end';
        setDragState({ index, mode, startX: e.clientX, originalStart: captions[index].start, originalEnd: captions[index].end });
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) { // Pinch-to-zoom on trackpads
            e.preventDefault();
            const scrollContainer = scrollContainerRef.current;
            if (!scrollContainer) return;

            const rect = scrollContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const scrollLeft = scrollContainer.scrollLeft;
            const timeAtCursor = (scrollLeft + mouseX) / pixelsPerSecond;

            const zoomFactor = -e.deltaY * 0.005;
            const newZoom = Math.max(0.2, Math.min(5, zoomLevel + zoomFactor));
            onZoomChange(newZoom);
            
            const newPixelsPerSecond = PIXELS_PER_SECOND_BASE * newZoom;
            const newScrollLeft = timeAtCursor * newPixelsPerSecond - mouseX;
            scrollContainer.scrollLeft = newScrollLeft;
        }
    };


    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragState || duration === 0 || pixelsPerSecond === 0) return;
            
            const SNAP_THRESHOLD_PX = 6;

            const deltaX = e.clientX - dragState.startX;
            const deltaTime = deltaX / pixelsPerSecond;
            let newStart = dragState.originalStart;
            let newEnd = dragState.originalEnd;

            if (dragState.mode === 'move') {
                newStart += deltaTime;
                newEnd += deltaTime;
                if (Math.abs((newStart * pixelsPerSecond) - (currentTime * pixelsPerSecond)) < SNAP_THRESHOLD_PX) {
                    const snapDelta = currentTime - newStart;
                    newStart += snapDelta; newEnd += snapDelta;
                } else if (Math.abs((newEnd * pixelsPerSecond) - (currentTime * pixelsPerSecond)) < SNAP_THRESHOLD_PX) {
                    const snapDelta = currentTime - newEnd;
                    newStart += snapDelta; newEnd += snapDelta;
                }
            } else if (dragState.mode === 'resize-start') {
                newStart += deltaTime;
                if (Math.abs((newStart * pixelsPerSecond) - (currentTime * pixelsPerSecond)) < SNAP_THRESHOLD_PX) {
                    newStart = currentTime;
                }
            } else if (dragState.mode === 'resize-end') {
                newEnd += deltaTime;
                if (Math.abs((newEnd * pixelsPerSecond) - (currentTime * pixelsPerSecond)) < SNAP_THRESHOLD_PX) {
                    newEnd = currentTime;
                }
            }
            
            newStart = Math.max(0, newStart);
            newEnd = Math.min(duration, newEnd);
            const prevCaption = captions[dragState.index - 1];
            if(prevCaption) newStart = Math.max(newStart, prevCaption.end);
            const nextCaption = captions[dragState.index + 1];
            if(nextCaption) newEnd = Math.min(newEnd, nextCaption.start);
            if(newStart + 0.1 >= newEnd) {
              if(dragState.mode === 'resize-start') newStart = newEnd - 0.1;
              else if (dragState.mode === 'resize-end') newEnd = newStart + 0.1;
            }
            if (dragState.mode === 'move' && newStart === 0) newEnd = newStart + (dragState.originalEnd - dragState.originalStart);
            if (dragState.mode === 'move' && newEnd === duration) newStart = newEnd - (dragState.originalEnd - dragState.originalStart);
            onCaptionTimeChange(dragState.index, newStart, newEnd, true);
        };
        const handleMouseUp = () => {
            if(dragState) {
                const finalCaption = captions[dragState.index];
                onCaptionTimeChange(dragState.index, finalCaption.start, finalCaption.end, false);
            }
            setDragState(null);
        };
        if (dragState) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [dragState, duration, onCaptionTimeChange, captions, pixelsPerSecond, currentTime]);

    if (isLoading) {
        return ( <div className="w-full bg-gray-900/80 rounded-lg flex items-center justify-center min-h-[10rem]"> <p className="text-gray-400 text-sm">Generating audio waveform...</p> </div> );
    }
    
    const playheadPositionPx = currentTime * pixelsPerSecond;

    return (
        <div ref={timelineWrapperRef} className="w-full bg-gray-900/80 rounded-lg flex relative select-none overflow-hidden border border-gray-700/50" onClick={handleTimelineClick} onWheel={handleWheel}>
            <div className="w-24 flex-shrink-0 bg-gray-800/60 z-20 shadow-lg">
                <div className="h-10 border-b border-gray-700/50 flex items-center justify-center">
                    <button 
                        onClick={onPlayPause} 
                        className="p-2 rounded-full bg-gray-700/80 hover:bg-gray-600 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                        aria-label={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                </div>
                <div className="h-14 flex items-center justify-center p-2 border-b border-gray-700/50"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Audio</span></div>
                <div className="h-16 flex items-center justify-center p-2"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Captions</span></div>
            </div>

            <div ref={scrollContainerRef} className="flex-grow h-full overflow-x-auto custom-scrollbar">
                <div className="relative" style={{ width: `${totalWidth}px`, height: '100%' }}>
                    <div className="w-full"><TimeRuler duration={duration} totalWidth={totalWidth} onSeek={onSeek} onScrub={setIsScrubbing} /></div>
                    
                    <div className="relative w-full">
                        <div className="relative h-14 w-full border-b border-gray-700/50"><Waveform waveform={waveform} height={56} width={totalWidth}/></div>
                        <div className="relative h-16 w-full pt-2 px-1">
                            {captions.map((caption, index) => {
                                if (duration === 0) return null;
                                const left = (caption.start || 0) * pixelsPerSecond;
                                const width = Math.max(0, (caption.end - caption.start)) * pixelsPerSecond;
                                const isSelected = selectedCaptionIndex === index;
                                const getCursorStyle = (e: React.MouseEvent<HTMLDivElement>) => {
                                    if (!isSelected) return 'pointer';
                                    const target = e.currentTarget as HTMLDivElement;
                                    const rect = target.getBoundingClientRect(); const hoverX = e.clientX - rect.left;
                                    if (hoverX < 8 || hoverX > rect.width - 8) return 'ew-resize';
                                    return 'move';
                                }
                                return (
                                    <div key={index} 
                                        className={`absolute h-12 rounded-md p-2 flex items-center justify-center transition-all duration-100 ease-in-out caption-clip bg-gray-700 border text-gray-200 shadow-md`}
                                        style={{ left: `${left}px`, width: `${width}px`, minWidth: '20px', borderColor: isSelected ? '#FFFFFF' : 'transparent', borderWidth: isSelected ? '2px' : '1px', zIndex: isSelected ? 10 : 1 }}
                                        onMouseDown={(e) => handleClipMouseDown(e, index)}
                                        onMouseMove={(e) => { if (isSelected) (e.currentTarget as HTMLDivElement).style.cursor = getCursorStyle(e); }}
                                    >
                                        <p className="text-sm truncate pointer-events-none select-none px-1">{caption.text}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="absolute top-0 h-full z-30 pointer-events-none" style={{ left: `${playheadPositionPx}px` }}>
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-gray-900 ring-1 ring-red-400 shadow-lg"></div>
                        <div className="w-0.5 h-full bg-red-400 shadow-md"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
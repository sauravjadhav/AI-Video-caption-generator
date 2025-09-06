
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { VideoEditor } from './components/VideoEditor';
import { generateCaptionsFromVideo } from './services/geminiService';
import type { Caption } from './types';

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Clean up the object URL when the component unmounts or the file changes
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileSelect = (file: File) => {
    // Reset state when a new file is selected
    setVideoFile(file);
    setCaptions(null);
    setError(null);
    if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleGenerateCaptions = async () => {
    if (!videoFile) return;

    setIsLoading(true);
    setError(null);
    setCaptions(null);

    try {
      const generatedCaptions = await generateCaptionsFromVideo(videoFile, setStatus);
      setCaptions(generatedCaptions);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
      setStatus('');
    }
  };
  
  const handleReset = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setCaptions(null);
    setError(null);
    setIsLoading(false);
    setStatus('');
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12 flex items-center justify-center">
        <div className="w-full max-w-7xl">
          {!videoFile && !isLoading && !error && (
            <div className="max-w-3xl mx-auto">
              <FileUpload onFileSelect={handleFileSelect} disabled={isLoading} />
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative text-center max-w-3xl mx-auto" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button onClick={handleReset} className="mt-2 sm:mt-0 sm:ml-4 bg-red-600 hover:bg-red-500 text-white font-bold py-1 px-3 rounded">Try Again</button>
            </div>
          )}

          {videoFile && !captions && !isLoading && !error && (
            <div className="bg-gray-900/70 backdrop-blur-sm rounded-lg shadow-xl p-6 text-center border border-gray-700 max-w-3xl mx-auto">
                <h2 className="text-xl font-bold text-white mb-4">Video Ready</h2>
                <video src={videoUrl ?? ''} controls className="w-full rounded-lg mb-4 max-h-80 bg-black"></video>
                <p className="text-gray-400 mb-4 truncate px-4" title={videoFile.name}>File: {videoFile.name}</p>
                <div className="flex justify-center space-x-4">
                    <button onClick={handleReset} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                        Change Video
                    </button>
                    <button onClick={handleGenerateCaptions} disabled={isLoading} className="bg-gray-200 hover:bg-white text-black font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        Generate Captions
                    </button>
                </div>
            </div>
          )}

          {isLoading && <div className="max-w-3xl mx-auto"><Loader status={status} /></div>}

          {captions && videoFile && videoUrl && (
             <VideoEditor 
                initialCaptions={captions} 
                videoUrl={videoUrl}
                videoFileName={videoFile.name}
                onReset={handleReset}
              />
          )}

        </div>
      </main>
      <footer className="text-center py-4 text-xs text-gray-500">
        <p>Powered by Google Gemini. For demonstration purposes only.</p>
      </footer>
    </div>
  );
};

export default App;
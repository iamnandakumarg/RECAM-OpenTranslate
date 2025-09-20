import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import './services/pdfSetup'; // Ensures PDF worker is configured on app start
import { ProcessStep, Status, HistoryItem, TranslatedLine } from './types';
import { LANGUAGES, PROCESS_STEPS } from './constants';
import { LogoIcon, TrashIcon } from './components/icons';
import { FileUpload } from './components/FileUpload';
import { LanguageSelector } from './components/LanguageSelector';
import { ProgressBar } from './components/ProgressBar';
import { DownloadOptions } from './components/DownloadOptions';
import { HistoryPanel } from './components/HistoryPanel';
import { processAndTranslateFile } from './services/fileProcessor';
import { supabase } from './services/supabaseClient';

interface TranslatedData {
    docxBlob?: Blob;
    text: string;
    structuredText?: TranslatedLine[];
}

const App: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [sourceLang, setSourceLang] = useState<string>('auto');
    const [targetLang, setTargetLang] = useState<string>('en');
    const [status, setStatus] = useState<Status>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [progressPercentage, setProgressPercentage] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressStep, setProgressStep] = useState<number>(0);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    const [translatedData, setTranslatedData] = useState<TranslatedData | null>(null);

    // State for managing library loading
    const [librariesReady, setLibrariesReady] = useState<boolean>(false);
    const [libraryError, setLibraryError] = useState<string | null>(null);

    // Fetch history from Supabase on component mount
    useEffect(() => {
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('translation_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching history:', error.message);
                setError('Could not load translation history.');
            } else if (data) {
                setHistory(data);
            }
        };
        fetchHistory();
    }, []);

    // Proactive check for all required external libraries on startup.
    useEffect(() => {
        const libs = ['mammoth', 'jspdf', 'saveAs', 'JSZip'];
        const checkInterval = 100;
        const timeout = 15000;
        let timeElapsed = 0;

        const intervalId = setInterval(() => {
            const allLoaded = libs.every(lib => typeof (window as any)[lib] !== 'undefined');

            if (allLoaded) {
                clearInterval(intervalId);
                setLibrariesReady(true);
            } else {
                timeElapsed += checkInterval;
                if (timeElapsed > timeout) {
                    clearInterval(intervalId);
                    const unloaded = libs.filter(lib => typeof (window as any)[lib] === 'undefined');
                    const errorMessage = `The following libraries failed to load in time: ${unloaded.join(', ')}.`;
                    setLibraryError(`A critical resource failed to load. Please check your network connection and refresh the page. Details: ${errorMessage}`);
                    console.error(errorMessage);
                }
            }
        }, checkInterval);

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (!selectedFile) return;
        resetState();
        setFile(selectedFile);
        setProgressStep(1);
        setStatusMessage('File selected. Choose languages and start translation.');
    }, []);
    
    const handleProgressUpdate = (message: string, percentage: number | null = null) => {
        setStatusMessage(message);
        setProgressPercentage(percentage);
    };

    const handleProcessAndTranslate = async () => {
        if (!file || status === 'processing') return;

        setStatus('processing');
        setProgressStep(1); // 'Process' step is active
        handleProgressUpdate('Starting translation process...', 0);
        setError(null);
        setTranslatedData(null);
        
        try {
            const result = await processAndTranslateFile({
                file,
                sourceLang,
                targetLang,
                onProgress: handleProgressUpdate,
            });
            
            setTranslatedData(result);

            const newHistoryItem = {
                file_name: file?.name || 'Untitled',
                source_language: sourceLang,
                target_language: targetLang,
                translated_text: result.text,
            };

            const { data: insertedData, error: insertError } = await supabase
                .from('translation_history')
                .insert(newHistoryItem)
                .select()
                .single();

            if (insertError) {
                console.error('Error saving history:', insertError.message);
                // Don't block the user, just log the error and continue
            } else if (insertedData) {
                // Add the new item to the top of the history list in the UI
                setHistory([insertedData, ...history.slice(0, 9)]);
            }

            setStatus('processed');
            setStatusMessage('Translation complete. Your document is ready for download.');
            setProgressStep(2); // 'Process' done, 'Download' is active
            setProgressPercentage(null);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setStatus('error');
            setProgressStep(1); // Reset to the step that failed
            setProgressPercentage(null);
        }
    };
    
    const resetState = () => {
        setFile(null);
        setTranslatedData(null);
        setStatus('idle');
        setStatusMessage('');
        setError(null);
        setProgressStep(0);
        setProgressPercentage(null);
    };

    const handleDeleteHistoryItem = async (id: number) => {
        const originalHistory = [...history];
        // Optimistically update the UI
        setHistory(history.filter(item => item.id !== id));

        const { error } = await supabase
            .from('translation_history')
            .delete()
            .match({ id });

        if (error) {
            console.error('Error deleting history item:', error.message);
            setError('Could not delete item from history. Please try again.');
            // Revert UI if the deletion fails
            setHistory(originalHistory);
        }
    };


    const renderContent = () => {
        if (!librariesReady) {
            return (
                <div className="flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-lg text-center border-gray-300">
                     <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                    <p className="font-semibold text-lg text-gray-800">Initializing application...</p>
                    <p className="text-sm text-gray-500">Please wait, loading required resources.</p>
                </div>
            )
        }
        
        if (libraryError) {
             return (
                <div className="text-center text-lg text-red-700 p-8 bg-red-50 rounded-xl">
                    <p className="font-semibold">Initialization Failed</p>
                    <p className="text-sm mt-2">{libraryError}</p>
                </div>
            )
        }

        if (!file) {
            return <FileUpload onFileSelect={handleFileSelect} />;
        }

        return (
             <div className="space-y-8">
                <div className="flex justify-between items-start p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button onClick={resetState} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full">
                        <TrashIcon />
                    </button>
                </div>
                
                {/* Translation Step */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <LanguageSelector
                            id="source-lang"
                            label="Source Language"
                            languages={[{ code: 'auto', name: 'Auto-Detect' }, ...LANGUAGES]}
                            value={sourceLang}
                            onChange={(e) => setSourceLang(e.target.value)}
                        />
                        <LanguageSelector
                            id="target-lang"
                            label="Target Language"
                            languages={LANGUAGES}
                            value={targetLang}
                            onChange={(e) => setTargetLang(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleProcessAndTranslate}
                        disabled={status === 'processing'}
                        className="w-full bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                        {status === 'processing' ? (
                           <>
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                             </svg>
                             Processing...
                           </>
                        ) : 'Translate Document'}
                    </button>
                </div>
                
                {/* Download Step */}
                {status === 'processed' && translatedData && (
                    <div className="pt-8 border-t border-gray-200">
                         <DownloadOptions 
                            docxBlob={translatedData.docxBlob}
                            text={translatedData.text} 
                            filename={file.name} 
                            structuredText={translatedData.structuredText}
                        />
                    </div>
                )}


                {status !== 'idle' && (
                    <div className="text-center text-sm text-gray-600 p-4 bg-gray-100 rounded-xl">
                        <p>{statusMessage}</p>
                        {status === 'processing' && progressPercentage !== null && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2.5 overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-200" 
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div className="text-center text-sm text-red-700 p-4 bg-red-50 rounded-xl">
                        <p><strong>Error:</strong> {error}</p>
                    </div>
                )}
            </div>
        )
    };


    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans" style={{fontFamily: "'Inter', sans-serif"}}>
            <header className="py-4 px-6 md:px-10 bg-white border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <LogoIcon />
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900">RECAM OpenTranslate</h1>
                </div>
            </header>

            <main className="p-4 md:p-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
                            <ProgressBar steps={PROCESS_STEPS} currentStep={progressStep} />
                            {renderContent()}
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                       <HistoryPanel history={history} onDeleteItem={handleDeleteHistoryItem} />
                    </div>
                </div>
            </main>
             <footer className="text-center py-6 mt-8 text-sm text-gray-500 border-t border-gray-200">
                <p>Powered by Open-Source AI. Built by a world-class React engineer.</p>
            </footer>
        </div>
    );
};

export default App;

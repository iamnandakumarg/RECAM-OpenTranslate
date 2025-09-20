import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Stepper } from './components/Stepper';
import { FileUpload } from './components/FileUpload';
import { ProcessingView } from './components/ProcessingView';
import { TranslationPreview } from './components/TranslationPreview';
import { DownloadOptions } from './components/DownloadOptions';
import { ProgressBar } from './components/ProgressBar';
import { uploadFile, extractContent, translate, deleteDocument } from './services/apiService';
import { generatePdf, generateDocx } from './services/documentGenerator';
import useLocalStorage from './hooks/useLocalStorage';
import type { ExtractedData, TranslatedData, GlossaryTerm } from './types';

type AppStep = 'upload' | 'extracting' | 'edit' | 'translating' | 'result' | 'download';
export type Formality = 'default' | 'formal' | 'informal';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('upload');
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData[] | null>(null);
  const [translatedData, setTranslatedData] = useState<TranslatedData[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [progress, setProgress] = useState(0);
  const [progressTask, setProgressTask] = useState('');
  const [formality, setFormality] = useState<Formality>('default');
  const [glossary, setGlossary] = useLocalStorage<GlossaryTerm[]>('recam-leasetranspro-glossary', []);

  const handleFileSelect = useCallback((file: File) => {
    setOriginalFile(file);
    setError(null);
  }, []);

  const handleClearFile = useCallback(() => {
    setOriginalFile(null);
    setError(null);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!originalFile) return;

    let tempUploadedFilePath: string | null = null;
    setStep('extracting');
    setError(null);
    setProgress(0);
    setProgressTask('');

    try {
      // Step 1: Upload
      setProgress(20);
      setProgressTask('Uploading document...');
      const filePath = await uploadFile(originalFile);
      setUploadedFilePath(filePath);
      tempUploadedFilePath = filePath;

      // Step 2: Extract Content
      setProgress(60);
      setProgressTask('Extracting text and layout...');
      const extracted = await extractContent(originalFile);
      setExtractedData(extracted);
      
      setProgress(100);
      setProgressTask('Extraction complete!');
      
      setTimeout(() => {
        setStep('edit');
      }, 500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Processing failed: ${errorMessage}. Please try again.`);
      setStep('upload');
      setProgress(0);
      setProgressTask('');
      console.error(err);

      if (tempUploadedFilePath) {
         await deleteDocument(tempUploadedFilePath).catch(delErr => console.error("Failed to clean up orphaned file on error:", delErr));
         setUploadedFilePath(null);
      }
    }
  }, [originalFile]);


  const handleTranslate = useCallback(async () => {
    if (!extractedData) return;

    setStep('translating');
    setError(null);
    setProgress(0);
    setProgressTask('Translating content...');

    try {
      const glossaryString = glossary.map(term => `${term.source}: ${term.target}`).join('\n');
      
      const updateProgress = (p: number) => {
        setProgress(p);
      };

      const translated = await translate(
          extractedData, 
          sourceLanguage, 
          targetLanguage, 
          formality, 
          glossaryString,
          updateProgress
      );
      setTranslatedData(translated);

      setProgress(100);
      setProgressTask('Complete!');
      
      setTimeout(() => {
        setStep('result');
      }, 500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Translation failed: ${errorMessage}. Please try again.`);
      setStep('edit'); // Go back to edit step on failure
      setProgress(0);
      setProgressTask('');
      console.error(err);
    }
  }, [extractedData, sourceLanguage, targetLanguage, formality, glossary]);


  const handleReset = async () => {
    if (uploadedFilePath) {
      try {
        await deleteDocument(uploadedFilePath);
        console.log(`Successfully deleted file: ${uploadedFilePath}`);
      } catch (err) {
        console.error(`Failed to delete file from storage: ${uploadedFilePath}`, err);
      }
    }
    
    setStep('upload');
    setOriginalFile(null);
    setUploadedFilePath(null);
    setExtractedData(null);
    setTranslatedData(null);
    setError(null);
    setProgress(0);
    setProgressTask('');
    setSourceLanguage('auto');
    setTargetLanguage('en');
    setFormality('default');
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!translatedData || !originalFile) return;
    try {
        const fileName = originalFile.name.replace(/\.[^/.]+$/, "") + '.pdf';
        await generatePdf(translatedData, fileName);
        setStep('download');
    } catch (err) {
        console.error("Failed to generate PDF:", err);
        setError("Sorry, we couldn't generate the PDF. Please try again.");
    }
  }, [translatedData, originalFile]);

  const handleDownloadDocx = useCallback(async () => {
      if (!translatedData || !originalFile) return;
      try {
          const fileName = originalFile.name.replace(/\.[^/.]+$/, "") + '.docx';
          await generateDocx(translatedData, fileName);
          setStep('download');
      } catch (err) {
          console.error("Failed to generate DOCX:", err);
          setError("Sorry, we couldn't generate the DOCX. Please try again.");
      }
  }, [translatedData, originalFile]);

  const renderContent = () => {
    switch (step) {
      case 'upload':
        return (
            <FileUpload 
                originalFile={originalFile}
                onFileSelect={handleFileSelect}
                onClearFile={handleClearFile}
                onExtract={handleExtract}
                error={error}
                sourceLanguage={sourceLanguage}
                setSourceLanguage={setSourceLanguage}
                targetLanguage={targetLanguage}
                setTargetLanguage={setTargetLanguage}
                formality={formality}
                setFormality={setFormality}
                glossary={glossary}
                setGlossary={setGlossary}
            />
        );
      case 'extracting':
      case 'translating':
        return (
            <div>
                <ProcessingView fileName={originalFile?.name || 'document'} />
                <div className="mt-8 px-8">
                    <ProgressBar progress={progress} taskName={progressTask} />
                </div>
            </div>
        );
      case 'edit':
        if (extractedData) {
            return (
                <TranslationPreview
                    original={extractedData}
                    onOriginalChange={setExtractedData}
                    onTranslate={handleTranslate}
                />
            )
        }
        return null;
      case 'result':
        if (extractedData && translatedData) {
          return (
            <div>
              <TranslationPreview original={extractedData} translated={translatedData} onOriginalChange={setExtractedData} />
              <DownloadOptions 
                onDownloadPdf={handleDownloadPdf}
                onDownloadDocx={handleDownloadDocx} 
              />
            </div>
          );
        }
        return null;
       case 'download':
            return (
                <div className="text-center p-8">
                    <h2 className="text-2xl font-bold mb-4">Download Started!</h2>
                    <p className="mb-8">Your translated document has been generated and should be in your downloads folder.</p>
                    <button
                        onClick={handleReset}
                        className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Translate Another Document
                    </button>
                </div>
            );
         
      default:
        return null;
    }
  };
  
  const steps = ['Upload', 'Preview & Edit', 'Download'];
  let currentStepIndex = 0;
  if (step === 'edit') {
      currentStepIndex = 1;
  } else if (step === 'translating' || step === 'result' || step === 'download') {
      currentStepIndex = 2;
  } else if (step === 'extracting' || (step === 'upload' && originalFile)) {
      currentStepIndex = 0; // Still on first step but showing progress
  }


  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Stepper steps={steps} currentStep={currentStepIndex} />
          <div className="mt-8 bg-white rounded-xl shadow-xl p-6 sm:p-10">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
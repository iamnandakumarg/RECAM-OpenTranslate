import React from 'react';

interface TranslationPreviewProps {
    original: string;
    translated: string;
}

const TextBox: React.FC<{ title: string; text: string }> = ({ title, text }) => (
    <div className="w-full">
        <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-400">{title}</h4>
        <div className="h-64 p-3 border border-gray-200 dark:border-gray-600 rounded-md overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-300 font-sans">{text}</pre>
        </div>
    </div>
);


export const TranslationPreview: React.FC<TranslationPreviewProps> = ({ original, translated }) => {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <TextBox title="Original Text" text={original} />
            {translated && <TextBox title="Translated Text" text={translated} />}
        </div>
    );
};
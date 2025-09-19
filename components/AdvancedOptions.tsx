import React from 'react';

interface AdvancedOptionsProps {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({ checked, onChange }) => {
    return (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-md mb-2 text-gray-800 dark:text-gray-300">Advanced Options</h4>
            <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                    <input
                        id="high-accuracy-ocr"
                        aria-describedby="high-accuracy-ocr-description"
                        name="high-accuracy-ocr"
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-600 dark:bg-gray-900"
                    />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="high-accuracy-ocr" className="font-medium text-gray-900 dark:text-gray-200 cursor-pointer">
                        Enable High-Accuracy OCR
                    </label>
                    <p id="high-accuracy-ocr-description" className="text-gray-500 dark:text-gray-400">
                        Pre-processes the image to improve text recognition. This may be slower.
                    </p>
                </div>
            </div>
        </div>
    );
};
import React, { useState } from 'react';
import type { Formality } from '../App';
import type { GlossaryTerm } from '../types';
import { TrashIcon, ChevronDownIcon } from './icons';

interface AdvancedOptionsProps {
    formality: Formality;
    setFormality: (formality: Formality) => void;
    glossary: GlossaryTerm[];
    setGlossary: (glossary: GlossaryTerm[]) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
    formality,
    setFormality,
    glossary,
    setGlossary,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [sourceTerm, setSourceTerm] = useState('');
    const [targetTerm, setTargetTerm] = useState('');

    const handleAddTerm = (e: React.FormEvent) => {
        e.preventDefault();
        if (sourceTerm.trim() && targetTerm.trim()) {
            setGlossary([...glossary, { source: sourceTerm.trim(), target: targetTerm.trim() }]);
            setSourceTerm('');
            setTargetTerm('');
        }
    };

    const handleRemoveTerm = (indexToRemove: number) => {
        setGlossary(glossary.filter((_, index) => index !== indexToRemove));
    };

  return (
    <div className="max-w-lg mx-auto my-6 text-left border-t border-gray-200 pt-6">
        <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-800 focus:outline-none"
            aria-expanded={isOpen}
            aria-controls="advanced-settings-content"
        >
            <span>Advanced Settings</span>
            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
            <div id="advanced-settings-content" className="mt-4 space-y-6">
                {/* Formality Selector */}
                <div>
                    <label htmlFor="formality" className="block text-sm font-medium text-gray-700 mb-1">
                        Translation Formality
                    </label>
                    <select
                        id="formality"
                        value={formality}
                        onChange={(e) => setFormality(e.target.value as Formality)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md shadow-sm"
                    >
                        <option value="default">Default</option>
                        <option value="formal">Formal</option>
                        <option value="informal">Informal</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Choose the tone for the translation (e.g., for business vs. casual documents).</p>
                </div>

                {/* Custom Glossary */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Glossary
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Define specific translations for key terms to ensure consistency. Persists in your browser.</p>
                    <form onSubmit={handleAddTerm} className="flex items-start space-x-2">
                        <input
                            type="text"
                            value={sourceTerm}
                            onChange={(e) => setSourceTerm(e.target.value)}
                            placeholder="Source Term"
                            className="flex-1 block w-full p-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md shadow-sm"
                        />
                        <input
                            type="text"
                            value={targetTerm}
                            onChange={(e) => setTargetTerm(e.target.value)}
                            placeholder="Target Translation"
                            className="flex-1 block w-full p-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md shadow-sm"
                        />
                        <button type="submit" className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 text-sm">
                            Add
                        </button>
                    </form>

                    {glossary.length > 0 && (
                        <div className="mt-3 max-h-40 overflow-y-auto pr-2 border border-gray-200 rounded-md p-2 bg-gray-50/50">
                            <ul className="space-y-2">
                                {glossary.map((term, index) => (
                                    <li key={index} className="flex items-center justify-between bg-white p-2 rounded-md text-sm shadow-sm">
                                        <div>
                                            <span className="font-semibold text-gray-800">{term.source}</span>
                                            <span className="mx-2 text-gray-400">&rarr;</span>
                                            <span className="text-gray-700">{term.target}</span>
                                        </div>
                                        <button onClick={() => handleRemoveTerm(index)} aria-label={`Remove term ${term.source}`} className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

import React from 'react';
import { Language } from '../types';

interface LanguageSelectorProps {
    id: string;
    label: string;
    languages: Language[];
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ id, label, languages, value, onChange }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <select
                id={id}
                value={value}
                onChange={onChange}
                className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
                {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
            </select>
        </div>
    );
};
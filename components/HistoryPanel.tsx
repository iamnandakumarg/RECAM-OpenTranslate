import React from 'react';
import { HistoryItem } from '../types';
import { HistoryIcon, TrashIcon } from './icons';
import { LANGUAGES } from '../constants';

interface HistoryPanelProps {
    history: HistoryItem[];
    onDeleteItem: (id: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onDeleteItem }) => {
    const getLangName = (code: string) => {
        if (code === 'auto') return 'Auto-Detect';
        return LANGUAGES.find(l => l.code === code)?.name || code;
    }

    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <HistoryIcon />
                    Translation History
                </h3>
            </div>
            {history.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <p>Your recent translations will appear here.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {history.map(item => (
                        <li key={item.id} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center gap-2">
                            <div className="flex-grow min-w-0">
                                <p className="font-medium text-gray-800 text-sm truncate">{item.file_name}</p>
                                <p className="text-xs text-gray-600">
                                    {getLangName(item.source_language)} → {getLangName(item.target_language)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(item.created_at).toLocaleString()}</p>
                            </div>
                             <div className="flex-shrink-0">
                                <button
                                    onClick={() => onDeleteItem(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    aria-label={`Delete translation for ${item.file_name}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

import React from 'react';
import { LogoIcon } from './icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-3">
          <LogoIcon className="h-8 w-8 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            RECAM LeaseTransPro
          </h1>
        </div>
      </div>
    </header>
  );
};
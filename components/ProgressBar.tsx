import React from 'react';
import { ProcessStep } from '../types';

interface ProgressBarProps {
    steps: ProcessStep[];
    currentStep: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ steps, currentStep }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                        {stepIdx < currentStep ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-blue-500" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600">
                                    <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" />
                                    </svg>
                                    <span className="sr-only">{step.name}</span>
                                </div>
                            </>
                        ) : stepIdx === currentStep ? (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-500 bg-white" aria-current="step">
                                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-hidden="true" />
                                    <span className="sr-only">{step.name}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="h-0.5 w-full bg-gray-200" />
                                </div>
                                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white hover:border-gray-400">
                                     <span className="sr-only">{step.name}</span>
                                </div>
                            </>
                        )}
                         <span className="absolute top-10 text-center w-full -ml-4 text-xs font-medium text-gray-500">{step.name}</span>
                    </li>
                ))}
            </ol>
        </nav>
    );
};
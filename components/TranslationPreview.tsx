import React, { useState } from 'react';
import type { ExtractedData, TranslatedData, DocumentBlock, TableBlock, TextBlock, TableCell, TranslationResult, FailedTranslation } from '../types';
import { InfoIcon, EditIcon, RefreshCwIcon } from './icons';
import { CopyButton } from './CopyButton';

const CONFIDENCE_THRESHOLD = 0.9;

const getConfidenceAttributes = (confidence?: number): { className: string; title?: string } => {
    if (confidence && confidence < CONFIDENCE_THRESHOLD) {
        return {
            className: 'bg-amber-200/60 rounded cursor-help',
            title: `Low confidence OCR (Score: ${Math.round(confidence * 100)}%)`
        };
    }
    return { className: '' };
}

const isFailedTranslation = (result: any): result is FailedTranslation => {
    return result && typeof result.error === 'string';
};

const extractTextFromPages = (pages: (ExtractedData | TranslationResult)[]): string => {
    return pages.map(page => {
        if (isFailedTranslation(page)) {
            return `\n\n-- Page ${page.pageNumber} Failed to Translate --\n\n`;
        }
        
        const pageData = page as ExtractedData;
        return pageData.blocks.map(block => {
            if (block.type === 'table') {
                return block.rows.map(row => 
                    row.map(cell => cell.text).join('\t')
                ).join('\n');
            }
            return block.text;
        }).join('\n\n');
    }).join('\n\n-- Page Break --\n\n');
};


interface DocumentColumnProps {
  pages: (ExtractedData | TranslationResult)[];
  title: string;
  isEditable?: boolean;
  onDataChange?: React.Dispatch<React.SetStateAction<ExtractedData[] | null>>;
  onRetryPage?: (pageNumber: number) => void;
}

const DocumentColumn: React.FC<DocumentColumnProps> = ({ pages, title, isEditable = false, onDataChange, onRetryPage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const fullText = extractTextFromPages(pages);

  const handleUpdate = (pageNumber: number, blockId: string, newText: string, cellId?: string) => {
    if (!onDataChange) return;

    onDataChange(prevData => {
        if (!prevData) return null;
        const newData = JSON.parse(JSON.stringify(prevData));
        const page = newData.find((p: ExtractedData) => p.pageNumber === pageNumber);
        if (!page) return newData;

        const block = page.blocks.find((b: DocumentBlock) => b.id === blockId);
        if (!block) return newData;

        if (block.type === 'table' && cellId) {
            for (const row of block.rows) {
                const cell = row.find((c: TableCell) => c.id === cellId);
                if (cell) {
                    cell.text = newText;
                    break;
                }
            }
        } else if (block.type !== 'table') {
            (block as TextBlock).text = newText;
        }

        return newData;
    });
  };

  const renderBlock = (block: DocumentBlock, pageNumber: number) => {
    const commonProps = {
        suppressContentEditableWarning: true,
        style: isEditing ? { outline: 'none' } : undefined
    };

    if (block.type === 'table') {
      return (
         <div key={block.id} className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200 border">
              <tbody className="bg-white divide-y divide-gray-200">
                {block.rows.map((row, rowIndex) => (
                  <tr key={`row-${rowIndex}`}>
                    {row.map((cell) => {
                      const { className, ...rest } = getConfidenceAttributes(cell.confidence);
                      return (
                        <td 
                            key={cell.id} 
                            className={`px-3 py-2 text-xs text-gray-700 border-l ${className} ${isEditing ? 'focus:bg-blue-100/50' : ''}`} {...rest}
                            contentEditable={isEditing}
                            onBlur={(e) => handleUpdate(pageNumber, block.id, e.currentTarget.textContent || '', cell.id)}
                            {...commonProps}
                        >
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      );
    }
  
    const { className, ...rest } = getConfidenceAttributes(block.confidence);
    const editableProps = isEditing ? {
        contentEditable: true,
        onBlur: (e: React.FocusEvent<HTMLElement>) => handleUpdate(pageNumber, block.id, e.currentTarget.textContent || ''),
        ...commonProps
    } : {};

    const combinedClassName = `${className} ${isEditing ? 'focus:bg-blue-100/50 p-1' : 'p-1'}`;

    switch (block.type) {
      case 'heading':
        const Tag = `h${block.level || 1}` as keyof JSX.IntrinsicElements;
        return <Tag key={block.id} className={`font-bold text-lg mb-2 ${combinedClassName}`} {...rest} {...editableProps}>{block.text}</Tag>;
      case 'paragraph':
        return <p key={block.id} className={`mb-4 text-sm leading-relaxed ${combinedClassName}`} {...rest} {...editableProps}>{block.text}</p>;
      case 'list_item':
        return <li key={block.id} className={`ml-4 mb-1 text-sm ${combinedClassName}`} {...rest} {...editableProps}>{block.text}</li>;
      default:
        return null;
    }
  };


  return (
    <div className="w-full p-4 border border-gray-200 rounded-lg bg-white h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4 sticky top-[-1rem] bg-white/80 backdrop-blur-sm py-3 border-b border-gray-200 -mx-4 px-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center space-x-2">
            {isEditable && (
                 <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`inline-flex items-center px-3 py-1 border text-xs font-medium rounded-md transition-all ${isEditing ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                 >
                    <EditIcon className="w-4 h-4 mr-1.5"/>
                    {isEditing ? 'Editing' : 'Edit'}
                </button>
            )}
            <CopyButton textToCopy={fullText} />
        </div>
      </div>
      {pages.map(page => (
        <div key={`page-${page.pageNumber}`} className="mb-6">
            {isFailedTranslation(page) ? (
                <div className="p-4 bg-red-50 border-2 border-dashed border-red-300 rounded-lg text-center">
                    <h4 className="font-semibold text-red-800">Translation Failed for Page {page.pageNumber}</h4>
                    <p className="text-xs text-red-700 mt-1 mb-3 break-words">{page.error}</p>
                    {onRetryPage && (
                        <button
                            onClick={() => onRetryPage(page.pageNumber)}
                            disabled={page.error === 'Retrying translation...'}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                        >
                            <RefreshCwIcon className={`w-3 h-3 mr-1.5 ${page.error === 'Retrying translation...' ? 'animate-spin' : ''}`} />
                            {page.error === 'Retrying translation...' ? 'Retrying...' : 'Retry'}
                        </button>
                    )}
                </div>
            ) : (
                <div className={`p-4 bg-gray-50/50 border-2 border-dashed rounded-lg ${isEditing ? 'border-blue-400' : 'border-gray-200'}`}>
                    {(page as ExtractedData).blocks.map(block => renderBlock(block, page.pageNumber))}
                </div>
            )}
          <p className="text-xs text-center text-gray-400 mt-2">Page {page.pageNumber}</p>
        </div>
      ))}
    </div>
  );
};


interface TranslationPreviewProps {
  original: ExtractedData[];
  translated?: TranslationResult[];
  onOriginalChange: React.Dispatch<React.SetStateAction<ExtractedData[] | null>>;
  onTranslate?: () => void;
  onRetryPage?: (pageNumber: number) => void;
}

export const TranslationPreview: React.FC<TranslationPreviewProps> = ({ original, translated, onOriginalChange, onTranslate, onRetryPage }) => {

  if (!translated) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-center mb-4">Preview & Edit Document</h2>
            <div className="flex items-center justify-center bg-blue-100 text-blue-800 text-xs rounded-md p-3 mb-4">
                <InfoIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Click the 'Edit' button to correct any text extracted from the document before translating.</span>
            </div>
            <div className="mb-6">
                <DocumentColumn pages={original} title="Original Document" isEditable={true} onDataChange={onOriginalChange} />
            </div>
            <div className="mt-8 text-center border-t pt-6">
                <button
                    onClick={onTranslate}
                    className="w-full max-w-xs mx-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Translate Document
                </button>
            </div>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-4">Translation Preview</h2>
      <div className="flex items-center justify-center bg-amber-100 text-amber-800 text-xs rounded-md p-3 mb-4">
        <InfoIcon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>Hover over amber-highlighted sections to see the confidence score. These areas should be reviewed for accuracy.</span>
      </div>
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <DocumentColumn pages={original} title="Original Document" isEditable={true} onDataChange={onOriginalChange} />
        <DocumentColumn pages={translated} title="Translated Document" onRetryPage={onRetryPage} />
      </div>
    </div>
  );
};
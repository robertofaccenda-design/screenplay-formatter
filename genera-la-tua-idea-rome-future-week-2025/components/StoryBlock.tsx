import React from 'react';
import type { StoryPart } from '../types';

interface StoryBlockProps {
  part: StoryPart;
  onGoBack: (partId: number) => void;
}

const StoryBlock: React.FC<StoryBlockProps> = ({ part, onGoBack }) => {
  const isRoot = part.parentId === null;
  return (
    <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden my-6 animate-fade-in-up">
      {part.image ? (
        <img src={part.image} alt={`Illustrazione per la parte ${part.id} della storia`} className="w-full h-64 object-cover" />
      ) : (
        <div className="w-full h-64 bg-brand-secondary flex items-center justify-center">
            <svg className="w-12 h-12 text-brand-primary opacity-50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
        </div>
      )}
      <div className="p-6 md:p-8">
        {!isRoot && part.choiceThatLedHere && (
           <div className="mb-4 p-3 bg-brand-secondary/30 rounded-lg border border-brand-secondary/50">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-brand-text/80">La tua scelta:</p>
                    <p className="font-semibold text-brand-primary italic">"{part.choiceThatLedHere}"</p>
                </div>
                <button 
                  onClick={() => onGoBack(part.id)} 
                  className="text-sm font-semibold text-brand-primary hover:text-brand-accent transition-colors underline"
                >
                  Cambia
                </button>
            </div>
          </div>
        )}
        <p className="font-serif text-lg leading-relaxed break-words">{part.text}</p>
      </div>
    </div>
  );
};

export default StoryBlock;

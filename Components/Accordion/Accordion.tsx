"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Accordion({ 
  title, 
  children, 
  defaultOpen = false 
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const contentEl = contentRef.current;
      if (contentEl) {
        setHeight(contentEl.scrollHeight);
      }
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 md:p-6 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
        
        <ChevronDown 
          className={`
            w-6 h-6 text-indigo-600 transition-transform duration-300 flex-shrink-0
            ${isOpen ? "rotate-180" : "rotate-0"}
          `}
        />
      </button>
      
      <div 
        ref={contentRef}
        style={{ height: height }}
        className="transition-all duration-500 ease-in-out overflow-hidden"
      >
        <div className="p-4 md:p-6 pt-0 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
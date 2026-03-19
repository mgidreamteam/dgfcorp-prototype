import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

const Breadcrumb: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav className="flex mb-6" aria-label="Breadcrumb">
    <ol className="inline-flex items-center space-x-1 md:space-x-2">
      {items.map((item, index) => (
        <li key={index} className="inline-flex items-center">
          {index > 0 && <ChevronRight className="w-3 h-3 text-zinc-500 mx-1" />}
          <button
            onClick={item.onClick}
            disabled={!item.onClick}
            className={`text-sm font-medium transition-colors ${
              item.onClick
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 cursor-default'
            }`}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ol>
  </nav>
);

export default Breadcrumb;
import React, { useState } from 'react';
import { Bot, Zap, AlertTriangle } from 'lucide-react';

interface ParameterDialogProps {
  missingParams: string[];
  originalPrompt: string;
  onCancel: () => void;
  onSubmit: (updatedPrompt: string) => void;
  isConstrained: boolean;
}

const ParameterDialog: React.FC<ParameterDialogProps> = ({ missingParams, originalPrompt, onCancel, onSubmit, isConstrained }) => {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const handleInputChange = (param: string, value: string) => {
    setParamValues(prev => ({ ...prev, [param]: value }));
  };

  const allParamsFilled = missingParams.every(param => paramValues[param] && paramValues[param].trim() !== '');
  const isSubmitDisabled = isConstrained && !allParamsFilled;

  const handleSubmitWithUpdates = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    const additions = Object.entries(paramValues)
      .filter(([, value]) => (value as string).trim() !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    if (additions) {
      const updatedPrompt = `${originalPrompt}. Please incorporate these additional details: ${additions}.`;
      onSubmit(updatedPrompt);
    } else {
      // If user submitted without filling anything, it's same as proceeding with assumptions
      handleSubmitWithAssumptions();
    }
  };

  const handleSubmitWithAssumptions = () => {
    if (isConstrained) return; // Should not be possible via UI, but good to have a guard
    const updatedPrompt = `${originalPrompt}. Some parameters were not specified; please make reasonable, industry-standard assumptions for any missing critical details and list them in the output.`;
    onSubmit(updatedPrompt);
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      aria-labelledby="dialog-title"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 id="dialog-title" className="text-xl font-bold text-white">Specify Your Design</h2>
              <p className="text-zinc-400 text-sm">Your prompt needs more details for a precise design.</p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmitWithUpdates}>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {isConstrained && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-sm rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Constrained mode: All parameters are required.
              </div>
            )}
            <p className="text-zinc-300 mb-4">Please provide values for the following parameters, or let Ñolmo make reasonable assumptions.</p>
            <div className="space-y-4">
              {missingParams.map(param => (
                <div key={param}>
                  <label htmlFor={param} className="block text-sm font-medium text-zinc-400 capitalize mb-1">
                    {param.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    id={param}
                    name={param}
                    onChange={(e) => handleInputChange(param, e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg p-2 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
                    placeholder="Enter value..."
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end items-center gap-4">
            {!isConstrained && (
                <button
                type="button"
                onClick={handleSubmitWithAssumptions}
                className="text-zinc-400 hover:text-white text-sm font-medium transition-colors px-4 py-2"
                >
                Proceed with Assumptions
                </button>
            )}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all flex items-center gap-2 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:shadow-none"
              title={isSubmitDisabled ? "Please fill all required parameters for constrained design" : ""}
            >
              <Zap className="w-4 h-4" />
              Update &amp; Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ParameterDialog;
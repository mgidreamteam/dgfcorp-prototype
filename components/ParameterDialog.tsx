import React, { useState } from 'react';
import { Bot, Zap, AlertTriangle } from 'lucide-react';
import GlobalModal from './GlobalModal';

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
      handleSubmitWithAssumptions();
    }
  };

  const handleSubmitWithAssumptions = () => {
    if (isConstrained) return;
    const updatedPrompt = `${originalPrompt}. Some parameters were not specified; please make reasonable, industry-standard assumptions for any missing critical details and list them in the output.`;
    onSubmit(updatedPrompt);
  };
  
  return (
    <GlobalModal
      isOpen={true}
      title={
        <div>
          <div className="text-sm font-bold uppercase">Specify Your Design</div>
          <div className="text-xs text-zinc-400 font-normal">Your prompt needs more details for a precise design.</div>
        </div>
      }
      icon={
        <div className="bg-white/10 p-2 rounded-lg border border-white/20 mr-2">
          <Bot className="w-6 h-6 text-white" />
        </div>
      }
      footer={
        <>
          {!isConstrained && (
             <button type="button" onClick={handleSubmitWithAssumptions} className="text-[#a1a1aa] hover:text-[#fff] text-sm font-medium transition-colors px-4 py-2">
               Proceed with Assumptions
             </button>
          )}
          <button
            type="button"
            onClick={handleSubmitWithUpdates}
            disabled={isSubmitDisabled}
            className="bg-white hover:bg-[#e4e4e7] text-black px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-white/10 transition-all flex items-center gap-2 disabled:bg-[#3f3f46] disabled:text-[#a1a1aa] disabled:cursor-not-allowed disabled:shadow-none"
            title={isSubmitDisabled ? "Please fill all required parameters for constrained design" : ""}
          >
            <Zap className="w-4 h-4" />
            Update &amp; Generate
          </button>
        </>
      }
      maxWidth="32rem"
    >
      <form onSubmit={handleSubmitWithUpdates} id="parameter-form">
        {isConstrained && (
          <div className="mb-4 p-3 bg-[#eab308]/10 border border-[#eab308]/20 text-[#fde047] text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Constrained mode: All parameters are required.
          </div>
        )}
        <p className="mb-4">Please provide values for the following parameters, or let Hilo make reasonable assumptions.</p>
        <div className="space-y-4">
          {missingParams.map(param => (
            <div key={param}>
              <label htmlFor={param} className="block text-sm font-medium text-[#a1a1aa] capitalize mb-1">
                {param.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                id={param}
                name={param}
                onChange={(e) => handleInputChange(param, e.target.value)}
                className="w-full bg-[#27272a] border border-[#3f3f46] text-white rounded-lg p-2 focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
                placeholder="Enter value..."
              />
            </div>
          ))}
        </div>
      </form>
    </GlobalModal>
  );
};

export default ParameterDialog;
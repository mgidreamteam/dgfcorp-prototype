import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error intercepted by AppErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    // Force a full reload to reset all WebGL contexts and state cleanly.
    window.location.href = '/studio';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center z-[9999] relative">
            <div className="absolute inset-0 max-w-lg max-h-lg bg-red-900/20 blur-[100px] rounded-full mx-auto my-auto pointer-events-none"></div>
            
            <AlertTriangle className="w-20 h-20 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            
            <h1 className="text-3xl font-bold text-white tracking-tighter mb-4">CRITICAL SYSTEM FAILURE</h1>
            
            <p className="text-zinc-400 mb-8 max-w-md">
                The visual simulation engine encountered a fatal context loss or unhandled exception. 
                <br /><br />
                <span className="font-mono text-xs text-red-400/80 bg-red-950/30 p-2 rounded block">
                    {this.state.error?.message || "Unknown Runtime Error"}
                </span>
            </p>
            
            <div className="flex items-center gap-4">
                <button 
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold tracking-widest flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                    <RefreshCcw className="w-5 h-5" /> Reboot Workspace
                </button>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-bold tracking-widest flex items-center gap-2 transition-colors border border-zinc-700"
                >
                    <Home className="w-5 h-5" /> Return to Hub
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

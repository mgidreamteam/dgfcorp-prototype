import React, { useState, useEffect } from 'react';
import { Maximize2, Download, Loader2, Image as ImageIcon, Layers3, CircuitBoard, LayoutGrid, XCircle, X } from 'lucide-react';
import { DesignProject, DesignStatus } from '../types';

type ViewType = 'rendered' | 'exploded' | 'circuit' | 'pcb' | 'stl';

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <img src={imageUrl} alt="Full screen view" className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        <button 
          onClick={onClose} 
          className="absolute -top-4 -right-4 p-2 bg-zinc-800 text-white rounded-full hover:bg-white hover:text-black transition-colors"
          aria-label="Close image viewer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const QuadViewPanel: React.FC<{
    title: string;
    icon: React.ElementType;
    assetUrl: string | null;
    isLoading: boolean;
    isApplicable: boolean;
    productName: string;
    viewType: ViewType;
    onViewFullScreen?: (url: string) => void;
    onDownloadImage?: (imageUrl: string, productName: string, viewType: ViewType) => void;
}> = ({ title, icon: Icon, assetUrl, isLoading, isApplicable, productName, viewType, onViewFullScreen, onDownloadImage }) => {

    const renderContent = () => {
        if (!isApplicable) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                    <XCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">Not Applicable</p>
                </div>
            );
        }

        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-white mb-3" />
                    <p className="text-sm font-medium animate-pulse">Generating...</p>
                </div>
            );
        }

        if (assetUrl) {
            return (
                 <>
                    <img 
                        src={assetUrl} 
                        alt={`${productName} - ${title}`} 
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDownloadImage?.(assetUrl, productName, viewType); }}
                            className="p-2 bg-zinc-800/80 hover:bg-white hover:text-black text-white rounded-lg backdrop-blur-sm transition-colors"
                            title="Download"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                         <button 
                            className="p-2 bg-zinc-800/80 hover:bg-white hover:text-black text-white rounded-lg backdrop-blur-sm transition-colors"
                            onClick={(e) => { e.stopPropagation(); onViewFullScreen?.(assetUrl); }}
                            title="Full Screen"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                </>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-700">
                <div className="w-12 h-12 border-2 border-dashed border-zinc-800 rounded-lg mb-3 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                </div>
                <p className="text-xs">Pending</p>
            </div>
        );
    };

    return (
        <div className="relative aspect-square bg-black border border-zinc-800 rounded-lg overflow-hidden group">
            <div className="absolute top-0 left-0 p-3">
                <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <Icon className="w-3 h-3 text-zinc-500" />
                    {title}
                </h3>
            </div>
            <div className="w-full h-full flex items-center justify-center">
                {renderContent()}
            </div>
        </div>
    );
};

interface AssetViewerProps {
  assetUrls: DesignProject['assetUrls'];
  status: DesignStatus;
  productName: string;
  hasElectronics: boolean;
}

const AssetViewer: React.FC<AssetViewerProps> = ({ assetUrls, status, productName, hasElectronics }) => {
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

  const handleDownload = (imageUrl: string, productName: string, viewType: ViewType) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;

    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Draw the original image
        ctx.drawImage(image, 0, 0);

        // Add the watermark
        const watermarkText = "BETA PRODUCT - MATERIEL GROUP INC.";
        const fontSize = Math.max(24, Math.floor(image.width / 30));
        ctx.font = `bold ${fontSize}px "Kode Mono", monospace`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Rotate the context to draw diagonal text
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(-Math.PI / 4.5);
        ctx.fillText(watermarkText, 0, 0);
        
        // Reset transformation
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Trigger download
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
        link.download = `${productName.replace(/ /g, '_')}-${viewType}-${timestamp}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    };

    image.onerror = () => {
        console.error("Failed to load image for watermarking. Downloading original image.");
        // Fallback to direct download
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
        link.download = `${productName.replace(/ /g, '_')}-${viewType}-${timestamp}.jpg`;
        link.href = imageUrl;
        link.click();
    }
  };


  if (!assetUrls && status === DesignStatus.IDLE) {
    return (
        <div className="w-full aspect-video bg-zinc-900 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-center p-8">
            <div className="text-zinc-600">
                <div className="w-16 h-16 bg-zinc-800 rounded-lg mx-auto mb-4"></div>
                 <p className="text-sm">Visualizations will appear here</p>
                <p className="text-xs opacity-70">Submit a design prompt to begin generation</p>
            </div>
        </div>
    );
  }

  return (
    <>
      {modalImageUrl && <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuadViewPanel
          title="Rendered View"
          icon={ImageIcon}
          assetUrl={assetUrls?.rendered || null}
          isLoading={status === DesignStatus.GENERATING_RENDER}
          isApplicable={true}
          productName={productName}
          viewType="rendered"
          onViewFullScreen={setModalImageUrl}
          onDownloadImage={handleDownload}
        />
        <QuadViewPanel
          title="Exploded View"
          icon={Layers3}
          assetUrl={assetUrls?.exploded || null}
          isLoading={status === DesignStatus.GENERATING_EXPLODED_VIEW}
          isApplicable={true}
          productName={productName}
          viewType="exploded"
          onViewFullScreen={setModalImageUrl}
          onDownloadImage={handleDownload}
        />
        <QuadViewPanel
          title="Circuit Diagram"
          icon={CircuitBoard}
          assetUrl={assetUrls?.circuit || null}
          isLoading={status === DesignStatus.GENERATING_CIRCUIT}
          isApplicable={hasElectronics}
          productName={productName}
          viewType="circuit"
          onViewFullScreen={setModalImageUrl}
          onDownloadImage={handleDownload}
        />
        <QuadViewPanel
          title="PCB Layout"
          icon={LayoutGrid}
          assetUrl={assetUrls?.pcb || null}
          isLoading={status === DesignStatus.GENERATING_PCB}
          isApplicable={hasElectronics}
          productName={productName}
          viewType="pcb"
          onViewFullScreen={setModalImageUrl}
          onDownloadImage={handleDownload}
        />
      </div>
    </>
  );
};

export default AssetViewer;
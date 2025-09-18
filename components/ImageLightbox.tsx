
import React from 'react';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ imageUrl, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div className="relative p-4 animate-[scale-up_0.3s_ease-out_forwards]" style={{ transform: 'scale(0.9)', opacity: 0 }}>
        <button 
          onClick={onClose} 
          className="absolute -top-2 -right-2 bg-white text-black h-8 w-8 rounded-full flex items-center justify-center text-xl font-bold z-10 shadow-lg"
        >
          &times;
        </button>
        <img 
          src={imageUrl} 
          alt="Enlarged view" 
          loading="eager"
          decoding="async"
          fetchpriority="high"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={e => e.stopPropagation()}
        />
      </div>
      <style>{`
        @keyframes scale-up {
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageLightbox;
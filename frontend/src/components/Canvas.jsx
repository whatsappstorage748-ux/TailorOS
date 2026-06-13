import React, { useRef, useState, useEffect } from 'react';
import { Undo, Redo, Trash2, Grid, Edit3, Eraser } from 'lucide-react';

export default function Canvas({ onChange, initialImage }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#002FA7'); // International Klein Blue
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Undo/Redo stacks
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    contextRef.current = context;

    clearCanvas(false);
    
    const initialState = canvas.toDataURL('image/webp', 0.85);
    setHistory([initialState]);
    setHistoryIndex(0);
    setIsInitialized(true);
  }, []);

  // Load initial image if it changes and canvas is initialized
  useEffect(() => {
    if (!isInitialized) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    if (!initialImage) {
      clearCanvas(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = initialImage;
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, rect.width, rect.height);
      context.drawImage(img, 0, 0, rect.width, rect.height);
      
      const loadedState = canvas.toDataURL('image/webp', 0.85);
      setHistory([loadedState]);
      setHistoryIndex(0);
      if (onChange) {
        onChange(loadedState);
      }
    };
  }, [isInitialized, initialImage]);

  // Update canvas stroke configurations when state changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = isEraser ? '#FFFFFF' : brushColor;
      // Eraser brush size should be slightly larger for better usability
      contextRef.current.lineWidth = isEraser ? brushSize * 2.5 : brushSize;
    }
  }, [brushColor, brushSize, isEraser]);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const tempImage = new Image();
      const currentData = canvas.toDataURL('image/webp', 0.85);
      tempImage.src = currentData;
      
      tempImage.onload = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        contextRef.current = canvas.getContext('2d');
        contextRef.current.scale(2, 2);
        contextRef.current.lineCap = 'round';
        contextRef.current.lineJoin = 'round';
        contextRef.current.strokeStyle = isEraser ? '#FFFFFF' : brushColor;
        contextRef.current.lineWidth = isEraser ? brushSize * 2.5 : brushSize;
        
        contextRef.current.drawImage(tempImage, 0, 0, rect.width, rect.height);
      };
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [brushColor, brushSize, isEraser]);

  const pushToHistory = (state) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    if (onChange) {
      onChange(state);
    }
  };

  // Canvas operations
  const startDrawing = ({ nativeEvent }) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (nativeEvent.touches) {
      clientX = nativeEvent.touches[0].clientX;
      clientY = nativeEvent.touches[0].clientY;
    } else {
      clientX = nativeEvent.clientX;
      clientY = nativeEvent.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawing(true);
    nativeEvent.preventDefault();
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (nativeEvent.touches) {
      clientX = nativeEvent.touches[0].clientX;
      clientY = nativeEvent.touches[0].clientY;
    } else {
      clientX = nativeEvent.clientX;
      clientY = nativeEvent.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const currentWidth = isEraser ? brushSize * 2.5 : brushSize;
    if (nativeEvent.pointerType === 'pen' && nativeEvent.pressure > 0) {
      contextRef.current.lineWidth = currentWidth * nativeEvent.pressure * 1.5;
    } else {
      contextRef.current.lineWidth = currentWidth;
    }

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    nativeEvent.preventDefault();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    contextRef.current.closePath();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/webp', 0.85);
    pushToHistory(dataURL);
  };

  const clearCanvas = (resetHistory = true) => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    const rect = canvas.getBoundingClientRect();
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, rect.width, rect.height);
    
    if (resetHistory) {
      const blankState = canvas.toDataURL('image/webp', 0.85);
      pushToHistory(blankState);
    }
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const prevIndex = historyIndex - 1;
    setHistoryIndex(prevIndex);
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const img = new Image();
    img.src = history[prevIndex];
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, rect.width, rect.height);
      context.drawImage(img, 0, 0, rect.width, rect.height);
      if (onChange) {
        onChange(history[prevIndex]);
      }
    };
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    const img = new Image();
    img.src = history[nextIndex];
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, rect.width, rect.height);
      context.drawImage(img, 0, 0, rect.width, rect.height);
      if (onChange) {
        onChange(history[nextIndex]);
      }
    };
  };

  const selectColor = (color) => {
    setBrushColor(color);
    setIsEraser(false);
  };

  const gridBackgroundStyle = showGrid ? {
    backgroundImage: `
      linear-gradient(rgba(224, 231, 255, 0.6) 1px, transparent 1px),
      linear-gradient(90deg, rgba(224, 231, 255, 0.6) 1px, transparent 1px)
    `,
    backgroundSize: '24px 24px'
  } : {};

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Canvas Tool Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800 gap-2">
        <div className="flex items-center space-x-2 text-slate-300">
          <Edit3 className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-sm tracking-wider uppercase">Measurements Canvas</span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Colors & Eraser */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <button
              type="button"
              className={`w-6 h-6 rounded-full border-2 ${!isEraser && brushColor === '#002FA7' ? 'border-brand-400 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: '#002FA7' }}
              title="Blue Ink"
              onClick={() => selectColor('#002FA7')}
            />
            <button
              type="button"
              className={`w-6 h-6 rounded-full border-2 ${!isEraser && brushColor === '#0c0f16' ? 'border-brand-400 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: '#0c0f16' }}
              title="Black Ink"
              onClick={() => selectColor('#0c0f16')}
            />
            <button
              type="button"
              className={`w-6 h-6 rounded-full border-2 ${!isEraser && brushColor === '#dc2626' ? 'border-brand-400 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: '#dc2626' }}
              title="Red Ink"
              onClick={() => selectColor('#dc2626')}
            />
            
            <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
            
            {/* Eraser Button */}
            <button
              type="button"
              className={`p-1.5 rounded transition ${
                isEraser 
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Eraser"
              onClick={() => setIsEraser(true)}
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          {/* Brush Sizes */}
          <div className="flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-medium text-slate-500 uppercase">Size</span>
            {[2, 3, 5, 8].map((size) => (
              <button
                key={size}
                type="button"
                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                  brushSize === size ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setBrushSize(size)}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Grid, Undo, Redo, Clear */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              className={`p-1.5 rounded transition ${showGrid ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:text-slate-200'}`}
              title="Toggle Grid Paper"
              onClick={() => setShowGrid(!showGrid)}
            >
              <Grid className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
            <button
              type="button"
              disabled={historyIndex <= 0}
              className={`p-1.5 rounded transition ${historyIndex <= 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200'}`}
              title="Undo"
              onClick={handleUndo}
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              className={`p-1.5 rounded transition ${historyIndex >= history.length - 1 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-slate-200'}`}
              title="Redo"
              onClick={handleRedo}
            >
              <Redo className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
            <button
              type="button"
              className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 transition"
              title="Clear Canvas"
              onClick={() => clearCanvas(true)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div className="flex-1 relative bg-white overflow-hidden min-h-[300px]">
        <div 
          className="absolute inset-0 transition-all pointer-events-none"
          style={gridBackgroundStyle}
        />
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className={`absolute inset-0 select-none z-10 ${isEraser ? 'cursor-cell' : 'cursor-crosshair'} touch-none`}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
}

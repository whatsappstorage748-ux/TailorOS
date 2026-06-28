import React, { useRef, useState, useEffect } from 'react';
import { Undo, Redo, Trash2, Grid, Edit3, Eraser } from 'lucide-react';

export default function Canvas({ onChange, initialImage, readOnly = false }) {
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

  // Keep refs of drawing settings to prevent stale closures in ResizeObserver
  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);
  const isEraserRef = useRef(isEraser);

  useEffect(() => {
    brushColorRef.current = brushColor;
    brushSizeRef.current = brushSize;
    isEraserRef.current = isEraser;
  }, [brushColor, brushSize, isEraser]);

  // Initialize and handle dynamic resizing using ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const targetWidth = Math.round(rect.width * 2);
      const targetHeight = Math.round(rect.height * 2);

      // Skip resizing if already correctly sized to prevent infinite loops
      if (canvas.width === targetWidth && canvas.height === targetHeight) {
        return;
      }

      const isFirstTime = !isInitialized;

      if (isFirstTime) {
        // Initialize synchronously on first size detection
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        const context = canvas.getContext('2d');
        context.scale(2, 2);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = brushColorRef.current;
        context.lineWidth = brushSizeRef.current;
        contextRef.current = context;

        // Start with a clean white canvas
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, rect.width, rect.height);

        const initialState = canvas.toDataURL('image/webp', 0.85);
        setHistory([initialState]);
        setHistoryIndex(0);
        setIsInitialized(true);
      } else {
        // Asynchronously scale and draw existing image back on subsequent resizes
        const tempImage = new Image();
        const currentData = canvas.toDataURL('image/webp', 0.85);
        
        tempImage.onload = () => {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const context = canvas.getContext('2d');
          context.scale(2, 2);
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.strokeStyle = isEraserRef.current ? '#FFFFFF' : brushColorRef.current;
          context.lineWidth = isEraserRef.current ? brushSizeRef.current * 2.5 : brushSizeRef.current;
          contextRef.current = context;

          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, rect.width, rect.height);
          context.drawImage(tempImage, 0, 0, rect.width, rect.height);
        };
        tempImage.src = currentData;
      }
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, [isInitialized]);

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
    if (readOnly) return;
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
    if (readOnly || !isDrawing) return;
    
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
    if (readOnly) return;
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

  /* Neutral grid — like ruled engineering paper, no neon tint */
  const gridBackgroundStyle = showGrid ? {
    backgroundImage: `
      linear-gradient(rgba(203, 213, 225, 0.5) 1px, transparent 1px),
      linear-gradient(90deg, rgba(203, 213, 225, 0.5) 1px, transparent 1px)
    `,
    backgroundSize: '24px 24px'
  } : {};

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Canvas Toolbar — flat, minimal, professional */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 gap-2">
        <div className="flex items-center gap-2 text-gray-600">
          <Edit3 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Measurement Sheet</span>
          {readOnly && (
            <span className="ml-2 text-2xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
              Read-Only
            </span>
          )}
        </div>

        <div className={`flex items-center gap-3 ${readOnly ? 'opacity-30 pointer-events-none' : ''}`}>
          {/* Color swatches */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-md">
            {[['#002FA7','Blue'],['#111827','Black'],['#dc2626','Red']].map(([color, label]) => (
              <button
                key={color} type="button" title={label}
                disabled={readOnly}
                onClick={() => selectColor(color)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  !isEraser && brushColor === color ? 'border-gray-600 scale-125' : 'border-gray-200 hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            <button
              type="button" title="Eraser"
              disabled={readOnly}
              onClick={() => setIsEraser(true)}
              className={`p-1 rounded transition ${
                isEraser ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Brush sizes */}
          <div className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-md">
            <span className="text-2xs font-semibold text-gray-400 uppercase mr-1">Size</span>
            {[2, 3, 5, 8].map((size) => (
              <button
                key={size} type="button"
                disabled={readOnly}
                onClick={() => setBrushSize(size)}
                className={`w-5 h-5 rounded text-xs font-bold transition ${
                  brushSize === size ? 'bg-brand-600 text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >{size}</button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 px-1 py-1 bg-white border border-gray-200 rounded-md">
            <button type="button" title="Toggle grid" onClick={() => setShowGrid(!showGrid)} disabled={readOnly}
              className={`p-1 rounded transition ${showGrid ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Grid className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button type="button" title="Undo" onClick={handleUndo} disabled={readOnly || historyIndex <= 0}
              className={`p-1 rounded transition ${historyIndex <= 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button type="button" title="Redo" onClick={handleRedo} disabled={readOnly || historyIndex >= history.length - 1}
              className={`p-1 rounded transition ${historyIndex >= history.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-100'}`}>
              <Redo className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-200" />
            <button type="button" title="Clear" onClick={() => clearCanvas(true)} disabled={readOnly}
              className="p-1 rounded text-red-400 hover:bg-red-50 transition">
              <Trash2 className="w-3.5 h-3.5" />
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

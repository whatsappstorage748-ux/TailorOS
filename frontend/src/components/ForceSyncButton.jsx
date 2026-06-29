import React, { useState } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { syncPendingData, requeueStuckOrders } from '../utils/syncManager';

const ForceSyncButton = () => {
  const [status, setStatus] = useState('idle'); // idle | syncing | success

  const handleClick = async () => {
    if (status !== 'idle') return;
    
    setStatus('syncing');
    
    // Perform sync operations
    try {
      await requeueStuckOrders();
      await syncPendingData();
    } catch (error) {
      console.error(error);
    }

    setStatus('success');
    
    // Reset after 3 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 3000);
  };

  const isSuccess = status === 'success';

  return (
    <button 
      onClick={handleClick}
      className={`group relative overflow-hidden flex items-center h-6 rounded text-white font-medium text-[10px] uppercase transition-all duration-300 ease-out shadow-sm ${
        isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700'
      }`}
      style={{
        width: '100px'
      }}
      title="Retry syncing stuck pending orders"
    >
      <span 
        className={`absolute h-full flex items-center justify-center transition-all duration-300 ease-out ${
          isSuccess ? '-left-full opacity-0' : 'left-0 w-[72%] group-hover:-left-[72%] group-hover:opacity-0'
        }`}
      >
        Force Sync
        <span className="absolute top-[20%] right-0 w-[1px] h-[60%] bg-brand-800/50"></span>
      </span>
      
      <div 
        className={`absolute right-0 h-full flex items-center justify-center transition-all duration-300 ease-out ${
          isSuccess ? 'w-full' : 'w-[28%] group-hover:w-full'
        }`}
      >
        {isSuccess ? (
          <Check className="w-3.5 h-3.5 text-white animate-in zoom-in duration-300" />
        ) : (
          <RefreshCw className={`w-3 h-3 text-white transition-all duration-300 ${status === 'syncing' ? 'animate-spin' : 'group-hover:w-3.5 group-hover:h-3.5'}`} />
        )}
      </div>
    </button>
  );
};

export default ForceSyncButton;

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { OddVoiceJSON } from '../oddVoiceJSON/oddVoiceHelpers';
import { Voice } from '../oddvoices/oddvoicesUtils';

// Define types for worker messages
type GenerateRequest = {
  id: string;
  type: 'generate';
  data: {
    json: OddVoiceJSON;
    voice: Voice;
  };
};

type WorkerResponse = {
  id?: string;
  status: 'success' | 'error' | 'moduleReady';
  buffer?: Uint8Array;
  error?: string;
};

export const useVoiceGenerationWorker = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const workerRef = React.useRef<Worker | null>(null);
  const callbacksRef = React.useRef<Record<string, (result: any) => void>>({});
  
  // Initialize worker on component mount
  React.useEffect(() => {
    // Create worker instance
    const worker = new Worker(
      new URL('./voiceGenerationWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, status, buffer, error } = event.data;
      
      if (status === 'moduleReady') {
        setIsReady(true);
        return;
      }
      
      if (!id) return;
      
      // Find callback for this request
      const callback = callbacksRef.current[id];
      if (callback) {
        if (status === 'success') {
          callback({ success: true, data: buffer });
        } else if (status === 'error') {
          callback({ success: false, error });
          setError(error || 'Unknown error');
        }
        
        // Remove callback after it's called
        delete callbacksRef.current[id];
      }
      
      // Check if we're done processing
      if (Object.keys(callbacksRef.current).length === 0) {
        setIsProcessing(false);
      }
    };
    
    // Handle worker errors
    worker.onerror = (event) => {
      setError(`Worker error: ${event.message}`);
      setIsProcessing(false);
    };
    
    workerRef.current = worker;
    
    // Clean up on unmount
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);
  
  // Generate audio function
  const generateAudio = React.useCallback(async (json: OddVoiceJSON, voice: Voice = Voice.air) => {
    if (!workerRef.current || !isReady) {
      throw new Error('Worker is not ready');
    }
    
    setIsProcessing(true);
    setError(null);
    
    return new Promise<Uint8Array>((resolve, reject) => {
      const id = uuidv4();
      
      // Store callback
      callbacksRef.current[id] = (result) => {
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error || 'Unknown error'));
        }
      };
      
      // Send request to worker
      workerRef.current?.postMessage({
        id,
        type: 'generate',
        data: {
          json,
          voice
        }
      });
    });
  }, [isReady]);
  
  return {
    generateAudio,
    isReady,
    isProcessing,
    error
  };
};
import React from 'react';
import { v4 as uuidv4 } from 'uuid';

// Define types for worker messages
type WorkerRequest = {
  id: string;
  rawXml: string;
};

type WorkerResponse = {
  id: string;
  status: 'success' | 'error' | 'ready';
  outputs?: any[];
  error?: string;
};

export const useXmlProcessingWorker = () => {
  const [isReady, setIsReady] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const workerRef = React.useRef<Worker | null>(null);
  const callbacksRef = React.useRef<Record<string, (result: any) => void>>({});
  
  // Initialize worker on component mount
  React.useEffect(() => {
    // Create worker instance
    const worker = new Worker(
      new URL('./xmlProcessingWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, status, outputs, error } = event.data;
      
      if (status === 'ready') {
        setIsReady(true);
        return;
      }
      
      // Find callback for this request
      const callback = callbacksRef.current[id];
      if (callback) {
        if (status === 'success') {
          callback({ success: true, data: outputs });
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
  
  // Process XML function
  const processXml = React.useCallback(async (rawXml: string) => {
    if (!workerRef.current || !isReady) {
      throw new Error('Worker is not ready');
    }
    
    setIsProcessing(true);
    setError(null);
    
    return new Promise<any>((resolve, reject) => {
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
        rawXml
      });
    });
  }, [isReady]);
  
  return {
    processXml,
    isReady,
    isProcessing,
    error
  };
};
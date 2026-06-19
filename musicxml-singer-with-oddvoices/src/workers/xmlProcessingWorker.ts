import { createSplitOddVoiceJsonInputsFromMusicXml } from '../oddVoiceJSON';
import { parseXmlText } from '../musicXmlParsing/xmlHelpers';

// Setup the web worker context
const ctx: Worker = self as any;

// Listen for messages from the main thread
ctx.addEventListener('message', (event) => {
  try {
    const { id, rawXml } = event.data;

    // Parse the XML text
    const parsedXml = parseXmlText(rawXml);
    
    // Generate the OddVoice JSON outputs
    const outputs = createSplitOddVoiceJsonInputsFromMusicXml(parsedXml);
    
    // Send the result back to the main thread
    ctx.postMessage({
      id,
      status: 'success',
      outputs
    });
  } catch (error) {
    // Send error back to main thread
    ctx.postMessage({
      id: event.data.id,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Signal that worker is ready
ctx.postMessage({ status: 'ready' });
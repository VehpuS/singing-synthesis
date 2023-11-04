import React from 'react';
import './App.css';
import { SplitParams, createSplitOddVoiceJsonInputsFromMusicXml } from "./oddVoiceJSON";
import { parseXmlText } from "./musicXmlParsing/xmlHelpers";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";
import { map } from "lodash";

export const App = () => {
  const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<Array<{
    output: OddVoiceJSON;
    splitParams: SplitParams;
  }>>([])
  return (
    <div className="App">
      <input type="file" onChange={(e) => {
        const file = e.target.files![0]
        const reader = new FileReader()
        reader.onload = (e) => {
          setOddVoiceOutputs(createSplitOddVoiceJsonInputsFromMusicXml(
            parseXmlText(e.target!.result as string)
          ))
        }
        reader.readAsText(file)
      }} />
      {map(oddVoiceOutputs, (oddVoiceOutput, i) => (
        <div key={i}>
          <h2>Part {i}</h2>
          <a href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(oddVoiceOutput.output, null, 2))}`} download={`part-${i}.json`}>
            Download JSON - {oddVoiceOutput.splitParams.partName} (voice {oddVoiceOutput.splitParams.voice}) - {
              oddVoiceOutput.splitParams.chordLvl === oddVoiceOutput.splitParams.largestChordLvl
                ? ``
                : `chord level ${oddVoiceOutput.splitParams.chordLvl}/${oddVoiceOutput.splitParams.largestChordLvl}`
            }
          </a>
        </div>
      ))}
    </div>
  );
}

export default App;

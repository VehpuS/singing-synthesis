import React from "react";
import { map } from "lodash";

import { SplitParams, createSplitOddVoiceJsonInputsFromMusicXml } from "./oddVoiceJSON";
import { parseXmlText } from "./musicXmlParsing/xmlHelpers";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";

import './App.css'

function App() {
  const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<Array<{
    output: OddVoiceJSON;
    splitParams: SplitParams;
  }>>([]);
  if (oddVoiceOutputs.length > 0) {
    console.log({ oddVoiceOutputs });
  }
  return (
    <div className="App">
      <input type="file" onChange={(e) => {
        const file = e?.target?.files?.[0]
        if (!file) {
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e?.target?.result) {
            setOddVoiceOutputs(createSplitOddVoiceJsonInputsFromMusicXml(
              parseXmlText(e.target.result as string)
            ))
          }
        }
        reader.readAsText(file)
      }} />
      {oddVoiceOutputs.length > 0 && (
        <button onClick={() => {
          const allAnchors = document.querySelectorAll("a.part-downloads");
          allAnchors.forEach((anchor) => {
            (anchor as HTMLAnchorElement).click();
          });
        }
        }>Download All</button>
      )}
      {map(oddVoiceOutputs, (oddVoiceOutput, i) => {
        const fileName = `${oddVoiceOutput.splitParams.partName
          }_(voice_${oddVoiceOutput.splitParams.voice
          })${oddVoiceOutput.splitParams.largestChordLvl > 1
            ? `_chord-level_${oddVoiceOutput.splitParams.chordLvl}-${oddVoiceOutput.splitParams.largestChordLvl}`
            : ``
          }.json`;
        return (
          <div key={i}>
            <h2>Part {i + 1}</h2>
            <a className="part-downloads" href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(oddVoiceOutput.output, null, 2))}`} download={fileName}>
              Download JSON - {oddVoiceOutput.splitParams.partName} (voice {oddVoiceOutput.splitParams.voice}){
                oddVoiceOutput.splitParams.largestChordLvl > 1
                  ? ` - chord level ${oddVoiceOutput.splitParams.chordLvl}/${oddVoiceOutput.splitParams.largestChordLvl}`
                  : ``
              }
            </a>
          </div>
        );
      })}
    </div>
  );
}

export default App

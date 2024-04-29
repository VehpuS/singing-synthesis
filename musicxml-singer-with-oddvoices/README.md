# MusicXML Singer App

This app allows arrangers of choir music to generate synthesized voices based on MusicXML notation with lyrics. The app does not require a backend to run as it uses a web assembly core that is downloaded on runtime, called [Oddvoices](https://oddvoices.org/).

## How to use the App?

Upload a music XML file with singing voices (musical notation and lyrics) and an initial version of the voices will be generated. If the result is acceptable - great :). Otherwise, try changing the lyrics, and perhaps report the needed change as an issue if you thing this can be resolved in conversion. If you're still having trouble - please report an issue with your file or add a relevant pull request with a new test.

Conversion tests (with sample MusicXML files and their source MuseScore files) can be found in `musicxml-singer-with-oddvoices/src/oddVoiceJSON/tests`.

## How to run the App?

Either use the Github pages / netlify hosted version, or `git clone`, then `npm install` and run `npm run dev`. A local version of the app should run after installing submodules and compiling the c code into Web Assembly (you may need to install some local dependencies to make this work obviously - specifically `emcc` and `cmake`). You can use the github pages action for guidance if any of the dependency installations give you trouble.

## How to test the App

Run `npm test`. It will run both frontend rendering test and the conversion test suite using `vite-test`.

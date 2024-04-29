# Singing Synthesis Projects

A collection of projects aimed at creating a music xml to vocalized synthesized audio process.

TL;DR - jump to `musicxml-singer-with-oddvoices`.

## How I got here

This was done in 3 progressive projects:

### 1. Compiling sinsy (`synthesize_with_sinsy`)

[Sinsy](https://www.sinsy.jp/) - Sinsy is an HMM/DNN-based singing voice synthesis system. You can generate a singing voice sample by uploading the musical score (MusicXML) to this website.

Directly downloading the [source code](https://sinsy.sourceforge.net/) and compiling it proved challenging, and after various attempts the most consistent was I found to do so is documented in the `synthesize_with_sinsy` folder (based on https://github.com/mathigatti/RealTimeSingingSynthesizer).

### 2. Python scripts for Music XML preprocessing (`musicxml_python_helpers`)

After successfully compiling a program that could sing, I wanted to allow an a capella composer to upload a vocally complex arrangement and generate all vocal parts without directly manipulating the notes. In order to do so I created a Python script to split an a capella arrangement into it's constituent parts (i.e. SATB), voices (in cases of 'chords' in a given part) and tempo sections (since sinsy doesn't support tempo changes).

After successfully doing so, further research into open source vocal synthesis lead me to discover the [Oddvoices](https://oddvoices.org/) project, which is an open source singing synthesis that can be compiled into web assembly. Oddvoices supports MIDI input, as well as a proprietary JSON based input for pitch and lyrics. After considering building a music xml parsing solution into the oddvoices source code, I was encouraged in a pair programming session with [@SonOfLilit](https://github.com/SonOfLilit) to instead attempt to reverse engineer the JSON parsing schema, which while not fully documented on Oddvoices' documentation site, is easy to write and should be parsable by reading the source code and some trial and error.

Both of these adventures lead to the code in `musicxml_python_helpers`. While they work well and may be useful in other contexts, I have moved on to a completely different approach.


### 3. A Client Side WebApp for Vocal Synthesis (`musicxml-singer-with-oddvoices`)

Having successfully built a music XML parser in Python and finding the [Oddvoices](https://gitlab.com/oddvoices/oddvoices/) project, I realized I could move the parsing logic to Typescript and create a newer frontend for Oddvoices which accepts music-xml as input and generates the split audio parts.


## Unstructured notes for future features

- [Web Audio DAW](https://github.com/rserota/wad) - perhaps we can create a whole daw interface?

- [opensheetmusicdisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay) (use musicxml to sync tracks, maybe as a player UI).

  - Based on [verovio](https://github.com/rism-digital/verovio) - which can be used by itself

- Unroll musicxml before creating playback using [musicxml-midi](https://github.com/infojunkie/musicxml-midi/blob/main/src/xsl/unroll.xsl)

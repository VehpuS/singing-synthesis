export type MusicXMLStep = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export const stepValues: { [key in MusicXMLStep]: number } = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
};


export class TempoSection {
    constructor(
        public measureIdx: number,
        public measureChildIdx: number,
        public tempo: number
    ) { }
}

export interface TextNode { '#text'?: string }

export interface AttributesNode<Attributes extends {} = {}> {
    ':@'?: Attributes;
}

export type OrderedXMLNode<Tag extends string, Children extends {} = TextNode, Attributes extends {} = {}> =
    Record<Tag, Array<Children>> & (AttributesNode<Attributes>);

export type OrderedXMLNodeTag<El extends OrderedXMLNode<string, {}>> = keyof El;

export type ScorePart = OrderedXMLNode<
    'score-part',
    | OrderedXMLNode<'part-name'>
    | OrderedXMLNode<'part-abbreviation'>
    | OrderedXMLNode<'score-instrument', OrderedXMLNode<'instrument-name'>>
    | OrderedXMLNode<'midi-device'>
    | OrderedXMLNode<
        'midi-instrument',
        | OrderedXMLNode<'midi-channel'>
        | OrderedXMLNode<'midi-name'>
        | OrderedXMLNode<'midi-bank'>
        | OrderedXMLNode<'midi-program'>
    >
>

export type ClefNode = OrderedXMLNode<'clef',
    | OrderedXMLNode<'sign'>
    | OrderedXMLNode<'line'>
>

export type MeasureAttributes = OrderedXMLNode<"attributes",
    | OrderedXMLNode<"divisions">
    | OrderedXMLNode<'key', OrderedXMLNode<'fifths'>>
    | OrderedXMLNode<
        'time',
        | OrderedXMLNode<'beats'>
        | OrderedXMLNode<'beat-type'>
    >
    | ClefNode
>

export type Lyric = OrderedXMLNode<'lyric',
    | OrderedXMLNode<'syllabic'>
    | OrderedXMLNode<'text'>,
    { 'number': string, }
>

export type Pitch = OrderedXMLNode<'pitch',
    | OrderedXMLNode<'step', { '#text': MusicXMLStep, }>
    | OrderedXMLNode<'octave'>
    | OrderedXMLNode<'alter'>
>

export type MeasureNote = OrderedXMLNode<'note',
    | OrderedXMLNode<'rest', {}>
    | OrderedXMLNode<'voice'>
    | Pitch
    | OrderedXMLNode<'duration'>
    | OrderedXMLNode<'type'>
    | OrderedXMLNode<'tie', TextNode, { 'type': string, }>
    | Lyric
>

export type MeasurePrintPageLayout = OrderedXMLNode<"page-layout",
    | OrderedXMLNode<"page-height">
    | OrderedXMLNode<"page-width">
    | OrderedXMLNode<"page-margins",
        | OrderedXMLNode<"left-margin">
        | OrderedXMLNode<"right-margin">
        | OrderedXMLNode<"top-margin">
        | OrderedXMLNode<"bottom-margin">,
        { "type": string }
    >
>

export type MeasurePrint = OrderedXMLNode<"print",
    | OrderedXMLNode<
        'system-layout',
        | OrderedXMLNode<'system-margins',
            | OrderedXMLNode<'left-margin'>
            | OrderedXMLNode<'right-margin'>,
            { 'type': string, }
        >
        | OrderedXMLNode<'system-distance'>
        | OrderedXMLNode<'top-system-distance'>
    >
    | OrderedXMLNode<'staff-layout',
        | OrderedXMLNode<'staff-distance'>,
        { 'number': string, }
    >
    | MeasurePrintPageLayout
    // Other children types are possible - not addressed
    | OrderedXMLNode<"measure-layout">
    // Other children types are possible - not addressed
    | OrderedXMLNode<"measure-numbering">
    // Other children types are possible - not addressed
    | OrderedXMLNode<"part-name-display">
    // Other children types are possible - not addressed
    | OrderedXMLNode<"part-abbreviation-display">
>

export type MeasureSound = OrderedXMLNode<'sound', TextNode, { 'tempo': string, }>

export type MeasureDirection = OrderedXMLNode<'direction', MeasureSound>

export type Measure = OrderedXMLNode<'measure',
    | MeasureAttributes
    | MeasureDirection
    | MeasureNote
    | MeasurePrint,
    { number: string; width: string; }
>

export type ScorePartwiseDefaults = OrderedXMLNode<
    'defaults',
    | OrderedXMLNode<'scaling', OrderedXMLNode<'millimeters'> | OrderedXMLNode<'tenths'>>
    | MeasurePrintPageLayout
    | OrderedXMLNode<
        'system-layout',
        OrderedXMLNode<
            'system-margins',
            OrderedXMLNode<'left-margin'> | OrderedXMLNode<'right-margin'>,
            { 'type': string, }
        >
        | OrderedXMLNode<'system-distance'>
        | OrderedXMLNode<'top-system-distance'>
    >
    | OrderedXMLNode<
        'staff-layout',
        OrderedXMLNode<'staff-distance'>,
        { 'number': string, }
    >
    | OrderedXMLNode<'appearance', OrderedXMLNode<'line-width'>>
    | OrderedXMLNode<'music-font'>
    | OrderedXMLNode<'word-font'>
    | OrderedXMLNode<'lyric-font'>
>

export type ScorePartMeasures = OrderedXMLNode<'part', Measure, { 'id': string, }>

export type ScorePartList = OrderedXMLNode<"part-list", ScorePart>;

export type ScorePartwise = OrderedXMLNode<
    "score-partwise",
    | OrderedXMLNode<'work', OrderedXMLNode<'work-title'>>
    | OrderedXMLNode<'identification',
        | OrderedXMLNode<'creator', TextNode, { 'type': string }>
        | OrderedXMLNode<'rights', TextNode>
        | OrderedXMLNode<'encoding', any>
    >
    | OrderedXMLNode<'credit', any>
    | ScorePartwiseDefaults
    // There are more element types, but we don't need them
    | ScorePartList
    | ScorePartMeasures,

    { 'version': string, }
>

export type MusicXmlHeader = OrderedXMLNode<"xml", {}, { version: string, encoding: string, }>;

export type MusicXmlJson = [MusicXmlHeader, ScorePartwise,];

# Preprocessing MusicXML files for audio synthesis - for sinpy and oddvoices

```python
fn = 'radio-video/auto_split/Radio_Video.xml'
from xml_helpers import *
n = read_as_xml_node(fn)
from music_xml_parsing import *

parse_vocal_parts_from_root(n.el)
# [MusicXMLPart(part_name='Soprano', part_idx=0, voices=['1'], largest_chord_per_voice=[1]), MusicXMLPart(part_name='Mezzo-soprano', part_idx=1, voices=['1'], largest_chord_per_voice=[1]), MusicXMLPart(part_name='Alto', part_idx=2, voices=['1'], largest_chord_per_voice=[2]), MusicXMLPart(part_name='Tenor', part_idx=3, voices=['1'], largest_chord_per_voice=[1]), MusicXMLPart(part_name='Baritone', part_idx=4, voices=['1'], largest_chord_per_voice=[1]), MusicXMLPart(part_name='Bass', part_idx=5, voices=['1'], largest_chord_per_voice=[2])]

get_tempos_from_singing_parts(n.el)
# {128.0, 130.0, 135.0, 137.0, 138.0, 139.0, 140.0, 75.0, 77.0, 143.0, 144.0, 145.0, 150.0, 152.0, 155.0, 158.0, 98.0, 163.0, 100.0, 102.0, 105.0, 106.0, 110.0, 123.0, 127.0}
```

import pysinsy
from nnmnkwii.io import hts
from nnsvs.pretrained import create_svs_engine
from nnsvs.util import example_xml_file

def test_pretrained_engine():
    engine = create_svs_engine('r9y9/yoko_latest')
    contexts = pysinsy.extract_fullcontext(example_xml_file('get_over'))
    labels = hts.HTSLabelFile.create_from_contexts(contexts)
    assert len(labels) > 0, "Failed to create labels from contexts"
    wav, sr = engine.svs(labels)
    assert wav.ndim == 1, "Expected mono output, got {} channels".format(wav.ndim)
    assert len(wav) > 0, "Synthesized waveform is empty"
    assert sr is not None, "Sample rate is not defined"
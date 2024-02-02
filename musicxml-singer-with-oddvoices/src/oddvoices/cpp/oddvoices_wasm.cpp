#include <emscripten.h>
#include <emscripten/bind.h>
#include "sing.hpp"

std::string sing(
    oddvoices::Voice &voice, oddvoices::g2p::G2P &g2p, std::string json, std::string outWAVFile, std::string lyrics)
{
    auto [ok, error] = oddvoices::frontend::singJSON(
        voice, g2p, json, outWAVFile, lyrics);
    if (ok)
    {
        return "";
    }
    return error;
};

EMSCRIPTEN_BINDINGS(oddvoices_wasm)
{
    emscripten::function("sing", &sing);
    emscripten::class_<oddvoices::Voice>("Voice")
        .constructor<>()
        .function("initFromFile", &oddvoices::Voice::initFromFile);
    emscripten::class_<oddvoices::g2p::G2P>("G2P")
        .constructor<std::string>();
}

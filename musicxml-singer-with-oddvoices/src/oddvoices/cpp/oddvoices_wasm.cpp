#include <emscripten.h>
#include <emscripten/bind.h>
#include "sing.hpp"

// Create an enum for the voices
enum Voice
{
    AIR = 0,
    CICADA = 1,
    QUAKE = 2
};

std::string sing(oddvoices::Voice &voice, std::string json, std::string outWAVFile, std::string lyrics)
{
    // Setup the G2P Class
    oddvoices::g2p::G2P g2p("oddvoices/cmudict-0.7b");

    // Sing the JSON
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
}

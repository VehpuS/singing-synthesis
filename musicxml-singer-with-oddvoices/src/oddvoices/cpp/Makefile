CFLAGS=-O3 -std=c++17

ODDVOICES_INCLUDES=-Ioddvoices/cpp/src/
ODDVOICES_FRONTEND_INCLUDES=-Ioddvoices/cpp/frontend/
MIDIFILE_INCLUDES=-Ioddvoices/cpp/external_libraries/midifile/include/
RAPIDJSON_INCLUDES=-Ioddvoices/cpp/external_libraries/rapidjson/include/
ALL_CPP_INCLUDES=$(ODDVOICES_INCLUDES) $(ODDVOICES_FRONTEND_INCLUDES) $(MIDIFILE_INCLUDES) $(RAPIDJSON_INCLUDES)

ODDVOICES_SOURCES=$(wildcard oddvoices/cpp/src/*.cpp)
ODDVOICES_FRONTEND_SOURCES=oddvoices/cpp/frontend/sing.cpp oddvoices/cpp/frontend/wav.cpp
MIDIFILE_SOURCES=$(wildcard oddvoices/cpp/external_libraries/midifile/src/*.cpp)
WASM_SOURCES=oddvoices_wasm.cpp
ALL_CPP_SOURCES=$(WASM_SOURCES) $(ODDVOICES_SOURCES) $(ODDVOICES_FRONTEND_SOURCES) $(MIDIFILE_SOURCES)

all:
	mkdir -p ../app/js/
	emcc $(CFLAGS) --bind -o ../app/js/oddvoices_wasm.js $(ALL_CPP_INCLUDES) $(ALL_CPP_SOURCES) -s ASSERTIONS=1 -s ALLOW_MEMORY_GROWTH=1

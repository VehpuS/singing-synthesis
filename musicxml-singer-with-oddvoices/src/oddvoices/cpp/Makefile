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
PRELOAD_FILES=--preload-file oddvoices/cmudict-0.7b

# Determine the operating system
UNAME_S := $(shell uname -s)

# Set sed flags based on the operating system
ifeq ($(UNAME_S),Darwin)  # macOS
	SED_FLAGS := -i ''
else ifeq ($(UNAME_S),Linux)  # Linux
	SED_FLAGS := -i
else
	$(error Unsupported operating system: $(UNAME_S))
endif

# Define the sed command
SED := sed $(SED_FLAGS)

all:
	emcc $(CFLAGS) --bind -o ../../../public/oddvoices_wasm.mjs $(ALL_CPP_INCLUDES) $(ALL_CPP_SOURCES) -s ASSERTIONS=1 -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT='web' -s USE_ES6_IMPORT_META=0 $(PRELOAD_FILES) -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "FS"]'
	mkdir -p ../js  # Create the directory if it doesn't exist
	# Add the vite.config.ts 'base' property to the generated oddvoices_wasm.mjs file as a prefix
	$(SED) 's/"oddvoices_wasm/"singing-synthesis\/oddvoices_wasm/g' ../../../public/oddvoices_wasm.mjs
	mv ../../../public/oddvoices_wasm.mjs ../js/oddvoices_wasm.mjs


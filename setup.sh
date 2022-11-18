if [[ l$1 != l ]];
then
    apt install software-properties-common
    yes | add-apt-repository ppa:mscore-ubuntu/mscore3-stable
    apt update
    apt install musescore3
    ln -s /usr/bin/musescore3 /usr/bin/musescore

    # git clone https://github.com/mathigatti/RealTimeSingingSynthesizer.git

    # SETUP libespeak-NG
    pushd $1/synthesisSoftware/libespeak-NG/

    apt install make autoconf automake libtool pkg-config
    apt install gcc
    apt install libsonic-dev
    apt install ruby-ronn
    apt install ruby-kramdown

    ./autogen.sh
    ./configure --prefix=/usr
    make
    ln -s $1//synthesisSoftware/libespeak-NG/src/.libs/libespeak-ng.so /usr/lib/libespeak-ng.so 
    popd

    # SETUP Sinsy
    pushd $1/synthesisSoftware/Sinsy-NG-0.0.1
    apt install libsamplerate-dev
    mkdir -p build
    cd build
    cmake ..
    make

    ln -s $a/synthesisSoftware/Sinsy-NG-0.0.1/build/libsinsy.so /lib/libsinsy.so
    ln -s $a/synthesisSoftware/libespeak-NG/src/.libs/libespeak-ng.so.1 /usr/lib/libespeak-ng.so.1
    cp -r $a/synthesisSoftware/libespeak-NG/espeak-ng-data /usr/share/

    popd

    # PIP Dependencies
    pip install MIDIUtil midi2voice

else
    echo "Please provide a base directory as the script's first parameter"
fi
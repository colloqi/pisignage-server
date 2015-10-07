# Script to install ffmpeg and image magic in ubuntu 14.04 LTS 

sudo apt-get update
sudo apt-get -y --force-yes install autoconf automake build-essential libass-dev libfreetype6-dev \
  libsdl1.2-dev libtheora-dev libtool libva-dev libvdpau-dev libvorbis-dev libxcb1-dev libxcb-shm0-dev \
  libxcb-xfixes0-dev pkg-config texi2html zlib1g-dev

# Refer https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu for more info
# make a directory for ffmpeg compilation
mkdir ~/ffmpeg_sources
cd  ~/ffmpeg_sources

#install yasm assembler for x86
sudo apt-get install yasm

#install video encoder
sudo apt-get install libx264-dev

#install audio encoder
cd  ~/ffmpeg_sources
wget -O fdk-aac.tar.gz https://github.com/mstorsjo/fdk-aac/tarball/master
tar xzvf fdk-aac.tar.gz
cd mstorsjo-fdk-aac*
autoreconf -fiv
./configure --prefix="$HOME/ffmpeg_build" --disable-shared
make
make install
make distclean

#install ffmpeg
cd  ~/ffmpeg_sources
wget http://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
tar xjvf ffmpeg-snapshot.tar.bz2
cd ffmpeg
PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure \
>   --prefix="$HOME/ffmpeg_build" \
>   --pkg-config-flags="--static" \
>   --extra-cflags="-I$HOME/ffmpeg_build/include" \
>   --extra-ldflags="-L$HOME/ffmpeg_build/lib" \
>   --bindir="$HOME/bin" \
>   --enable-gpl \
>   --enable-libass \
>   --enable-libfdk-aac \
>   --enable-libfreetype \
>   --enable-libtheora \
>   --enable-libvorbis \
>   --enable-libx264 \
>   --enable-nonfree
PATH="$HOME/bin:$PATH" make
make install
make distclean
hash -r

#install imagemagick
sudo apt-get install imagemagick 

#create symlink to ffmpeg and ffmprobe
# Command creates a link for ~/bin/ffmprobe and /bin/ffmpeg 
sudo ln -s ~/bin/ff /usr/local/bin/ffmpeg
sudo ln -s ~/bin/ffprobe /usr/local/bin/ffprobe

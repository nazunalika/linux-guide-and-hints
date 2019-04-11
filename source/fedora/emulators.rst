Emulators
^^^^^^^^^

Dolphin
-------

Wii controls
************

In order to set up mouse controls for "Motion Controls and IR", reset the controls to default. If you are playing Super Paper Mario, make sure **Sideways Wii Remote** is ticked. 

Game idiosyncrasies
*******************

Paper Mario: The Thousand-Year Door
+++++++++++++++++++++++++++++++++++

When you need to enter "Tube Mode" in Chapter 4, the game asks you to rapidly rotate your stick. However, using a keyboard where i.e. WASD is mapped to Up/Left/Down/Right, this is physically impossible. An easier way is to map something straight in a line i.e. 1324 in the top number row to Up/Left/Down/Right.

Compiling PCSX2
---------------

`PCSX2 <https://github.com/PCSX2/pcsx2>`_  is a 32-bit only Playstation 2 emulator. The wiki does not contain any
instructions (other than install from RPMFusion) for Fedora. This is what you need to do.

Dependencies
************

.. code-block:: bash

   dnf install zlib-devel.i686 bzip2-devel.i686 freetype-devel.i686 \
   glew-devel.i686 libX11-devel.i686 libICE-devel.i686 libXrandr-devel.i686 \
   mesa-libGLES-devel.i686 alsa-lib-devel.i686 SDL-devel.i686 gtk2-devel.i686 \
   portaudio-devel.i686 sparsehash-devel.i686 wxGTK-devel.i686 \
   soundtouch-devel.i686 libaio-devel.i686 lzma-devel.i686

You might also need ``xz-devel.i686`` and ``compat-wtkGTK3-gtk2-devel.i686``. Do not install ``wxGTK3-devel.i686`` or CMake will say it can't find ``wxWidgets``.

CMake flags
***********

These are taken from the RPMFusion spec.

.. code-block:: bash

    cmake .. \
    -DCMAKE_TOOLCHAIN_FILE=$PWD/../cmake/linux-compiler-i386-multilib.cmake \
    -DXDG_STD=TRUE -DGLSL_API=TRUE -DFORCE_INTERNAL_SOUNDTOUCH=FALSE \
    -DFORCE_INTERNAL_SDL=FALSE -DCMAKE_BUILD_STRIP=FALSE -DGTK3_API=FALSE \
    -DEXTRA_PLUGINS=FALSE -DSDL2_API=FALSE -DCMAKE_BUILD_TYPE=Release

Most of these are self-explanatory. ``XDG_STD`` will have it put files in standard Linux locations (``.config``, etc).
We need to use the i386 toolchain because PCSX2 can't be compiled for 64-bit currently.

RetroArch
---------

Building beetle-psx-libretro (mednafen)
***************************************

First, clone the `beetle-psx-libretro repo <https://github.com/libretro/beetle-psx-libretro>`_:

.. code-block:: bash

   git clone git@github.com:libretro/beetle-psx-libretro.git

Then enable the Vulkan renderer and build:

.. code-block:: bash

   make HAVE_VULKAN=1

Copy the core to the RetroArch directory:

.. code-block:: bash

   cp mednafen_psx_hw_libretro.so ~/.config/retroarch/cores/

Enabling the Vulkan renderer and 32-bit color
*********************************************

Mednafen, being an accurate PSX emulator, doesn't support 32-bit color depth.
Patching it to disable `dithering <https://en.wikipedia.org/wiki/Dither>`_ will
result in color banding as expected, which looks something like this:

.. figure:: /_static/img/silent_hill_16.png
   :alt: 16-bit rendering with dithering disabled (OpenGL)

   16-bit rendering with dithering disabled (OpenGL). Source: https://forums.libretro.com/t/mednafen-psx-32-bit-rendering-a-possibility/4440

However, the `beetle-psx-libretro <https://github.com/libretro/beetle-psx-libretro>`_ core
for RetroArch supports 32-bit color depth, but it's a little tricky to setup. 

We will be using the Vulkan renderer because the OpenGL renderer is a little buggy
(see `beetle-psx-libretro#43 <https://github.com/libretro/beetle-psx-libretro/issues/43>`_).
For example, this is what 32-bit rendering with dithering disabled looks like in the OpenGL
renderer:

.. figure:: /_static/img/silent_hill_32.png
   :alt: 32-bit rendering with dithering disabled (OpenGL)

   32-bit rendering with dithering disabled (OpenGL). Source: https://forums.libretro.com/t/mednafen-psx-32-bit-rendering-a-possibility/4440

On the other hand, this is what it looks like with Vulkan:

.. figure:: /_static/img/silent_hill.png
   :alt: 32-bit rendering with dithering disabled (Vulkan)

   32-bit rendering with dithering disabled (Vulkan)

In this particular instance, however, the issue is because mask bit emulation is yet to be backported
to the OpenGL renderer. This article may become out of date once that's implemented.

If you followed our guide on installing Nvidia drivers from :doc:`negativo`, then you can
install the ``vulkan`` package.

In ``retroarch.cfg``, put ``video_driver = "vulkan"``. In ``retroarch-core-options.cfg``, put ``beetle_psx_hw_renderer = "vulkan"``. 

Due to an unknown reason (see `beetle-psx-libretro#158 <https://github.com/libretro/beetle-psx-libretro/issues/158>`_),
on X11 (i.e, if you are running XFCE, as opposed to Gnome which uses Wayland), you will get a "bad sector" error. The
fix is to set ``beetle_psx_hw_cd_access_method = "precache"`` (this enables what the documentation refers to as "CD image cache").

Finally, ensure that ``beetle_psx_hw_color_depth = "32bpp"``.

Shaders
*******

Since texture filtering is only supported with the OpenGL renderer, shaders are an alternative. However, since shaders are essentially
a post-process effect, this will also affect pre-rendered backgrounds (like in Resident Evil). It can also be slightly slower.

If you are using the OpenGL renderer, download the `glsl-shaders <https://github.com/libretro/glsl-shaders>`_ repository. If you
are using the Vulkan renderer, download the `slang-shaders <https://github.com/libretro/slang-shaders>`_ repository. In order to load
these shader presets, load a core/content then go to **Quick Menu** -> **Shaders** -> **Load Shader Preset**. Then look for files with
the ``.glslp`` or ``.slangp`` file extensions. For convenience, you might want to install these to ``~/.config/retroarch/shaders``.

mednafen randomly speeds up
---------------------------

mednafen seems to have problems with pulseaudio; change the ``sound.driver`` to ``sdl``. Note: this doesn't seem to apply
to RetroArch.

Mupen64Plus unofficial FAQ
--------------------------

Where does Mupen64Plus like to put files?
*****************************************

The config is located in ``~/.config/mupen64plus``. Hi-res textures are
expected to be found in ``~/.local/share/mupen64plus`` although this can be changed
in the configuration. Some cache files for hi-res textures and memory are created
in ``~/.cache/mupen64plus``. The default prefix is ``/usr/local``.

There are also ``.ini`` files that contain ROM information installed in ``$PREFIX/share``.
mupen64plus and the Rice video plugin need to find these files. If you are using the
mupen64plus-ui-console, specify ``--datadir $PREFIX/share/mupen64plus`` at the command-line.

I'm getting a ``dlopen`` error
******************************

The console UI is compiled with the default path it looks for the core library,
which is ``libmupen64plus.so.2``. This is the reason why specifying ``LD_LIBRARY_PATH`` 
does not work. Although it uses ``dlopen``, the console UI only searches in the place 
specified at compile-time or at the command line with ``--corelib``, which takes an 
absolute path including the filename. 

.. code-block:: bash

	./mupen64plus --corelib $PWD/libmupen64plus.so.2

Keycode values 
**************

Please use the keycode values from ``SDL_keysym.h`` (found `here <https://www.libsdl.org/release/SDL-1.2.15/include/SDL_keysym.h>`_)
and not the values from the wiki.

I changed one of the hi-res textures and no change is visible
*************************************************************

A cache of the textures are created after the first time and then read from the hard disk.
This file can be found in ``~/.cache/mupen64plus``. So you have to delete this file everytime
you make a modification for a game.

Recommended plugins?
********************

Video: `GLideN64 <https://github.com/gonetz/GLideN64/releases>`_ Do not confuse this with 
glide64mk2, which seems to be made for ancient graphics cards

RSP (processor): `cxd4 <https://github.com/mupen64plus/mupen64plus-rsp-cxd4>`_

Note that the Rice video plugin is not compatible with cxd4.

How do I compile it?
********************

All of the projects follow a pattern: their Makefiles are located in ``project/unix`` and they
do not use autotools. You specify make variables like so:

.. code-block:: bash

	make PREFIX=$PWD
	
The six mandatory projects you need to compile are:

- The `core library (mupen64plus-core) <https://github.com/mupen64plus/mupen64plus-core>`_
- RSP plugin. i.e, `mupen64plus-rsp-hle <https://github.com/mupen64plus/mupen64plus-rsp-hle>`_
- Video plugin. i.e, `mupen64plus-rice <https://github.com/mupen64plus/mupen64plus-video-rice>`_
- Audio plugin. `mupen64plus-audio-sdl <https://github.com/mupen64plus/mupen64plus-audio-sdl>`_
- Input plugin. `mupen64plus-input-sdl <https://github.com/mupen64plus/mupen64plus-input-sdl>`_
- UI. `mupen64plus-ui-console <https://github.com/mupen64plus/mupen64plus-ui-console>`_

GBA
---

There are a plethora of emulators out there, some of them good, most of
them bad. `VBA-M <http://vba-m.com/>`_ has reigned supreme as a gameboy
emulator for many years and is recommended by pretty much every site out
there. But overall, it has poor performance, is limited in its
functionality, has a horrid codebase and the GTK version doesn't even
run.

There are some high quality alternatives:

* `gambatte <https://github.com/sinamas/gambatte>`_ - GB and GBC
* `mGBA <https://github.com/mgba-emu/mgba>`_ - GB, GBC and GBA
* `MAME <http://mamedev.org>`_ - GB, GBC and GBA
* `BGB <http://bgb.bircd.org>`_ - GB, GBC

Which one you use is a matter of preference, although they all have
their pros and cons. Personally, I alternate between mGBA and MAME.

MAME
----

Configuration
*************

MAME looks for configuration in at least two places:
``/etc/mame/mame.ini`` and ``~/.mame/ini/mame.ini``. The latter
overrides the former.

Example ``mame.ini``
++++++++++++++++++++

For some reason, fullscreen mode likes to eat up as much screenspace as
possible with no regards to aspect ratio, etc. It's not even true fullscreen
mode. So I enable windowed mode instead. I disable sound by default instead
opting to explicitly enable it on the command line if I wish. This is because
MAME doesn't seem to have a feature to mute or disable audio while the emulator
is running. I disable filtering because I personally don't like how blurry it
looks. Finally, ``autosave`` is a feature that allows you to resume execution
right from where you left off. While this may be a convenience if you
accidentally close MAME or find saving to be boring, I like using in-game saves
and don't like having to soft reset whenever I start up MAME.

+----------+--------+
| Option   | Value  |
+==========+========+
| video    | opengl |
+----------+--------+
| window   | 1      |
+----------+--------+
| sound    | none   |
+----------+--------+
| filter   | 0      |
+----------+--------+
| autosave | 0      |
+----------+--------+

Also if you enable ``gl_glsl`` you want to set ``gl_glsl_filter`` to ``0`` (if
you don't like the bilinear filter.)

Example command line options
++++++++++++++++++++++++++++

I'm assuming that you're using the ini file in the previous section. In
general, starting up MAME looks like this:

.. code-block:: bash

	mame &lt;driver&gt; -cart &lt;file&gt; -resolution &lt;widthxheight&gt; -sound &lt;auto or none&gt; -speed &lt;floating point value&gt;

For example:

.. code-block:: bash

	mame gbcolor -cart "Pokemon - Red.gb" -resolution 320x288 -sound auto -speed 1.0

In this case, I've taken the native resolution of the gameboy color and doubled
it. In this case, I want sound. And finally, the game will run at normal speed.
It's probably possible to add some further configuration with scaling and what
not but I've found it to be tedious and inconsistent, so instead I wrote a `UI
script`_ that has preset resolutions for certain consoles.

Speed
*****

Emulators have tackled gamer's impatience in different ways, by adding speed
boosting options. For example, throttling, frame skipping, boosting
(essentially key-activated throttling) and so on. These features tend to be
broken, choppy or make the game unplayable. The emulators I've mentioned in the
introductory section use a much more reasonable approach: an FPS target and in
the case of MAME, a real-time speed option. The latter two approaches result in
much less choppy gameplay, consistent results and more control over the speed
of the emulation.

The difference between mGBA's and gambatte's FPS target and MAME's speed
feature is that the latter is relative to real time. That means an
option of ``2.0`` will not make the game run at 120 FPS for example.
Despite this, trying arbitrary speed values between ``1.0`` and ``10.0``
(for example, ``10.0`` being roughly ``350%``) doesn't result in any
choppiness. On the other hand, I've experienced choppiness in mGBA when
setting an FPS target above 120. 

UI script
*********

In lieu of using a MAME front-end, I've opted to write a simple start-up
script. A precursory glance at the list of front-ends seems to show
either old projects or those written specifically for systems like
Ubuntu. Rather than go out of my way to install and deal with even more
software on my system that may not even work properly, I've found this
script to work perfectly fine for my needs.

This requires ``zenity``, a simple program that creates GTK dialogs.

The script takes two arguments, a value for sound and speed respectively. i.e,
``mameui.sh auto 1.0``. I did this so I could write two trivial wrapper scripts
for launchers in my menu, one for muted gameplay at normal speed, and another
for muted gameplay at an arbitrary speed.

.. code-block:: bash

    #!/bin/bash

    # enable ** and avoiding non-matches
    shopt -s globstar nullglob
    DIR="/home/tom/Downloads/games"
    LIST=("$DIR"/**/*{.gba,.gbc,.gb,.md,.nes,.sfc,.n64})
    SOUND="${1:-auto}"
    SPEED="${2:-1.0}"

    # geometry of zenity dialog
    WIDTH=640
    HEIGHT=480

    declare -A RESOLUTIONS
    RESOLUTIONS=(\
            [gb]="320x288" \
            [gbc]="320x288" \
            [gba]="480x320" \
            [md]="640x480" \
            [sfc]="640x480" \
            [nes]="640x480" \
            [n64]="640x480"
    )

    declare -A MAPPINGS
    MAPPINGS=(\
            [gb]="gbcolor" \
            [gbc]="gbcolor" \
            [gba]="gba" \
            [md]="genesis" \
            [sfc]="snes" \
            [nes]="nes" \
            [n64]="n64"
    )

    EXTS=()
    for FILE in "${LIST[@]}"; do
            FILENAME=$(basename "$FILE")
            EXTENSION="${FILENAME##*.}"
            EXTS+=("$EXTENSION")
    done

    # zenity requires arguments to be
    # interspersed.
    MERGED=()
    for INDEX in "${!LIST[@]}"; do
            MERGED+=("${EXTS[$INDEX]}")
            MERGED+=("$(basename "${LIST[$INDEX]}")")
    done

    set -x
    # zenity outputs choices delimited
    # by a pipe, hence IFS
    CHOICE=$(zenity --width=$WIDTH --height=$HEIGHT \
            --list --print-column=ALL \
            --column "Extension" --column "Filename" \
            "${MERGED[@]}") IFS='|'

    # if we didn't hit cancel
    if [ $? -ne 1 ]; then
            SPLIT_CHOICE=("$CHOICE")
            unset IFS

            EXT_CHOICE="${SPLIT_CHOICE[0]}"
            FILE_CHOICE="${SPLIT_CHOICE[1]}"

            FILE_CHOICE=$(find "$DIR" -name "$FILE_CHOICE")

            mame "${MAPPINGS[$EXT_CHOICE]}" -cart "$FILE_CHOICE" -resolution \
                    "${RESOLUTIONS[$EXT_CHOICE]}" -sound "$SOUND" -speed "$SPEED"
    fi

mGBA
----

Controller/joystick issue
*************************

If you have certain brands of USB devices, namely mice or keyboards, i.e
Microsoft Nano Transceiver, it will try to load that as a joystick.
Unfortunately, you have to manually clear the controls everytime the
emulator loads and there doesn't seem to be any way to fix this via the
config. I've also tried to unsuccessfully patch it. 

One workaround is to blacklist your device from udev. The
`udev-joystick-blacklist
<https://github.com/denilsonsa/udev-joystick-blacklist>`_ project on
Github provides a script that does this for you and covers a range of
devices known to be detected as joysticks. Of course, you do this at
your own risk but I've had no problems with this approach.


Building
********

An RPM for mGBA doesn't seem to exist, but luckily the compilation
process is painless. As is the case for all CMake projects, you want to
create a build folder. Don't run ``cmake`` directly in the source
folder. Make sure to set a prefix with ``CMAKE_INSTALL_PREFIX`` to avoid
polluting ``/usr``.

.. code-block:: bash

  cd mgba
  mkdir build
  cd build
  cmake .. -DCMAKE_INSTALL_PREFIX=... -DOTHER_VARIABLE=...
  make
  make install

Make sure to set ``LD_LIBRARY_PATH`` to the location of ``libmgba.so``
if you decided to build a shared library. Include the installation
folder in your ``PATH`` for the binaries and man pages. Also located in
the ``share`` folder are some shaders but they aren't anything special.

CMake variables
+++++++++++++++

Some of the variables that are important are:

+-----------------------------+---------+--------------------------------------------------------------+
| Variable                    | Value   | Comment                                                      |
+=============================+=========+==============================================================+
| BUILD_GL                    | ON      |                                                              |
+-----------------------------+---------+--------------------------------------------------------------+
| BUILD_GLES2                 | OFF     | This is for embedded systems                                 |
+-----------------------------+---------+--------------------------------------------------------------+
| BUILD_LIBRETRO              | OFF     | This is for embedded systems                                 |
+-----------------------------+---------+--------------------------------------------------------------+
| BUILD_QT                    | ON      | The Qt front-end is superior to the SDL front-end            |
+-----------------------------+---------+--------------------------------------------------------------+
| BUILD_SDL                   | ON      | No reason not to include it, though                          |
+-----------------------------+---------+--------------------------------------------------------------+
| CMAKE_BUILD_TYPE            | Release |                                                              |
+-----------------------------+---------+--------------------------------------------------------------+
| OpenGL_GL_PREFERENCE        | GLVND   | Required because CMake uses legacy GL by default             |
+-----------------------------+---------+--------------------------------------------------------------+
| OPENGLx_mesa_INCLUDE_DIR    |         | This can be ignored, as it's not applicable to Linux systems |
+-----------------------------+---------+--------------------------------------------------------------+

The rest is discretionary, such as whether or not to disable the
debugger. It lists ``libepoxy`` after ``OpenGL support``, however it is
simply a library that seems to deal with pointer safety. It really has
no bearing aside from compilation.

Dependencies
++++++++++++

You need Qt5, Qt5 Multimedia (for audio) and libzip if you want to load
ROMs directly from zipped files.

.. code-block:: bash

  dnf install qt5-qtmultimedia-devel SDL2-devel libzip-devel sqlite-devel qt5-linguist

Link cable support
------------------

Both mGBA and BGB emulate linking on the same computer.

BGB
***

You need to run two instances of the emulator, one which acts as the
server and the other as the client. For the server, ``Right-click`` > ``Link`` >
``Listen``. Accept the default port. In the other client instance,
``Right-click`` > ``Link`` > ``Connect``. Whatever port you entered for
the server, append to the end. For example, ``127.0.0.1:8765``. Note
that once the two are connected, pausing one instance will pause the
other.

You can now alternate between windows to send independent input.

mGBA
****

This emulator allegedly requires two controllers for multiplayer to work
properly. mGBA has a distinct lack of documentation and instructions,
but here is a `youtube video
<https://www.youtube.com/watch?v=f1LWEUTbcLA>`_ showing somebody who
managed to get it to work (again, no instructions). If you want to try it yourself, you need to
go to ``File`` > ``New multiplayer window`` rather than running two
instances of the emulator.

Kega Fusion
-----------

Dependencies
************

To get Kega to run on Fedora, install the following dependencies:

.. code-block:: bash

   dnf install alsa-plugins-pulseaudio.i686 mesa-dri-drivers.i686 mesa-libGLU.i686 gtk2.i686 alsa-lib.i686 libSM.i686

Configuration
*************

The following assumes a new install.

.. code-block:: bash

   # Fresh configuration, skip if you already have one
   % mkdir ~/.Kega\ Fusion
   % cat &gt; ~/.Kega\ Fusion/Fusion.ini &lt;&lt;EOF
   ALSADeviceName=default
   libmpg123path=/usr/lib/libmpg123.so.0
   EOF
   # Make a desktop file
   % mkdir -p ~/.local/share/icons/hicolor/256x256
   % wget -q -O ~/.local/share/icons/hicolor/256x256/kega-fusion.png http://trya.alwaysdata.net/linux/icons/kega-fusion.png
   % cat &gt; ~/.local/share/applications/Fusion.desktop &lt;&lt;EOF
   [Desktop Entry]
   Version=1.0
   Type=Application
   Exec=/home/username/Games/Fusion/Fusion
   Name=Kega Fusion
   GenericName=Sega Emulator
   Comment=Sega Emulator
   Icon=kega-fusion
   Categories=Game;Emulator;


No Sound?
*********

Make sure all dependencies are met above. If you've already installed them and still have no sound and you already have a Fusion.ini file (meaning you've ran it once before), change ALSADeviceName to 'default' in Fusion.ini, open Kega, click 'Sound' and click 'Disable Sound' and ensure the checkmark goes away.

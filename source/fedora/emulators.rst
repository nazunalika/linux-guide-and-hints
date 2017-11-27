Emulators
^^^^^^^^^

mednafen randomly speeds up
---------------------------

mednafen seems to have probelms with pulseaudio; change the ``sound.driver`` to ``sdl``.

Mupen64Plus unofficial FAQ
--------------------------

Where does Mupen64Plus like to put files?
*****************************************

The config is located in ``~/.config/mupen64plus``. Hi-res textures are
expected to be found in ``~/.local/share/mupen64plus`` although this can be changed
in the configuration. Some cache files for hi-res textures and memory are created
in ``~/.cache/mupen64plus``. The default prefix is ``/usr/local``.

I'm getting a ``dlopen`` error
******************************

The console UI is compiled with the default path it looks for the core library,
which is ``libmupen64plus.so.2``. This is the reason why specifying ``LD_LIBRARY_PATH`` 
does not work. Although it uses ``dlopen``, the console UI only searches in the place 
specified at compile-time or at the command line with ``--corelib``, which takes an 
absolute path including the filename. 

.. code-block:: bash

	./mupen64plus --corelib $PWD/libmupen64plus.so.2

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

MAME configuration
------------------

MAME looks for configuration in at least two places:
``/etc/mame/mame.ini`` and ``~/.mame/ini/mame.ini``. The latter
overrides the former.

Inconsistency
*************

The official `MAME website <http://mamedev.org>`_ is seriously lacking
in the documentation department. The `MESS <http://www.mess.org>`_
website contains better information, including configuration options.

While the two are separate projects and are not 100% compatible, the two
projects merged possibly explaining why some options work or don't work.
For example, ``auto`` is explicitly outlined as a valid value for
``-sound`` by the MESS docs, even though this is missing from the MAME
docs. To continue the example ``mame -showusage`` gives two options for
sound: ``sdl`` or ``none``. ``man mame`` lists ``-nosound`` and
``-sound`` as valid command line options, which is consistent with the
other options (i.e, ``-filter`` and ``-nofilter``), but don't work.

Since the documentation is out-of-date/unsynchronized/severely lacking,
you'll have to experiment to see what works. 

Example ``mame.ini``
********************

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
****************************

I'm assuming that you're using the ini file in the previous section. In
general, starting up MAME looks like this:

.. code-block:: bash

	mame <driver> -cart <file> -resolution <widthxheight> -sound <auto or none> -speed <floating point value>

For example:

.. code-block:: bash

	mame gbcolor -cart "Pokemon - Red.gb" -resolution 320x288 -sound auto -speed 1.0

In this case, I've taken the native resolution of the gameboy color and doubled
it. In this case, I want sound. And finally, the game will run at normal speed.
It's probably possible to add some further configuration with scaling and what
not but I've found it to be tedious and inconsistent, so instead I wrote a `UI
script`_ that has preset resolutions for certain consoles.

Speed
-----

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
---------

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
		SPLIT_CHOICE=($CHOICE)
		unset IFS

		EXT_CHOICE="${SPLIT_CHOICE[0]}"
		FILE_CHOICE="${SPLIT_CHOICE[1]}"
		
		FILE_CHOICE=$(find "$DIR" -name "$FILE_CHOICE")

		mame ${MAPPINGS[$EXT_CHOICE]} -cart "$FILE_CHOICE" -resolution \
			${RESOLUTIONS[$EXT_CHOICE]} -sound "$SOUND" -speed "$SPEED" 
	fi  

mGBA controller/joystick issue
------------------------------

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


Compiling mGBA
--------------

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
***************

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
| OPENGLx_mesa_INCLUDE_DIR    |         | This can be ignored, as it's not applicable to Linux systems |
+-----------------------------+---------+--------------------------------------------------------------+

The rest is discretionary, such as whether or not to disable the
debugger. It lists ``libepoxy`` after ``OpenGL support``, however it is
simply a library that seems to deal with pointer safety. It really has
no bearing aside from compilation.

Dependencies
************

You need Qt5, Qt5 Multimedia (for audio) and libzip if you want to load
ROMs directly from zipped files.

.. code-block:: bash

  dnf install qt5-devel qt5-qtbase-devel qt5-multimedia-devel SDL2-devel libzip-devel

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

.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

Emulators
^^^^^^^^^

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

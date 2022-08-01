.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

XScreenSaver
^^^^^^^^^^^^

Gamma or brightness is too high when unlocking
----------------------------------------------

It's possible that this is caused by XScreenSaver `changing the hardware gamma <https://github.com/GalliumOS/xscreensaver/blob/master/utils/fade.c>`_
for its fade to black effect. Although ``xgamma`` is deprecated, it seems to address the issue. Observe:

.. code-block:: bash

    ~ xrandr --verbose | grep -i gamma
        Gamma:      1.0:1.0:1.0
        Gamma:      1.0:1.0:1.0
    ~ xgamma
    -> Red  1.664, Green  1.664, Blue  1.664

Simply run ``xgamma -gamma 1.0``.

Press :kbd:`Ctrl+Shift+L` to lock the screen. Unlock the screen by entering your password. The brightness should be normal.

Disable fade to black effect
----------------------------

Disabling fade to black will not address the gamma issue as any program that touches the hardware gamma
will exhibit the same symptoms. However if you find the effect annoying, do:

* Open up "Screensaver"

* Click the "Advanced tab"

* Under "Fading and Colormaps", uncheck "Fade to Black when Blanking"


Conflict with xfce-screensaver
------------------------------

XFCE now ships its own screensaver application which is known to conflict with
xscreensaver. In **Settings**, click on the **Screensaver** icon (the one with
a starry background) then uncheck both the **Enable Screensaver** and **Enable
Lock Screen** options. In **Session and Startup** under **Application
Autostart** make sure to disable xfce-screensaver as well.

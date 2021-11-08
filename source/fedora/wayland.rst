Wayland
^^^^^^^

If you are running Wayland, there may be a few apps that don't work out of the box without extra tweaks or command line parameters. This page will list some of those.

Discord
-------

.. code-block:: bash

    flatpak run --socket=wayland com.discordapp.Discord --enable-features=UseOzonePlatform --ozone-platform=wayland

.. note::

    The following are temporal issues and may be fixed by the time you read this.

Evolution
---------

Evolution must be run with X11 for now until this bug is fixed.

.. code-block:: bash

    env GDK_BACKEND=x11 evolution

mpv
---

mpv must be run with a special environment variable until this is fixed.

https://github.com/mpv-player/mpv/issues/9393

.. code-block:: bash

    env __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/50_mesa.json mpv

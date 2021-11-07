# Wayland

If you are running Wayland, there may be a few apps that don't work out of the box without extra tweaks or command line parameters. This page will list some of those.

## Discord

.. code-block:: bash

    flatpak run --socket=wayland com.discordapp.Discord --enable-features=UseOzonePlatform --ozone-platform=wayland


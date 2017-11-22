Blockify
^^^^^^^^

`Github <https://github.com/mikar/blockify>`_

This program mutes advertisements automatically in Spotify.

An RPM is available from `openSUSE's build service
<https://build.opensuse.org/package/show/home:fusion809/blockify>`_,
though you may prefer to install it manually.

.. note:: pip

  You may want to review the article on :doc:`pip` for general advice on
  not polluting your system when installing Python packages.

First the dependencies:

.. code-block:: bash

  dnf install pygtk2 python3-docopt dbus qstreamer-devel wmctrl

Pulseaudio and ALSA are required as well. Finally, you have to install
this using Python 3.

.. code-block:: bash

  git clone https://github.com/mikar/blockify
  cd blockify
  pip3 install --user .

This will put everything into ``~/.local/``. Uninstall using:

.. code-block:: bash

  pip3 uninstall --user blockify

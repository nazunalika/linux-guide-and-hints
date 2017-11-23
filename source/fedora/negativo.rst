negativo17 repositories
^^^^^^^^^^^^^^^^^^^^^^^

This page serves as a summary of the repositories located at `https://negativo17.org/ <https://negativo17.org/>`_ to save the reader the trouble of sifting through the blog posts.

Most of the repositories target EPEL 6, 7 and Fedora 25, 26, 27.

The source RPMs, repos and other files can be found `here <https://negativo17.org/repos/>`_.

Multimedia
----------

.. code-block:: bash

   dnf config-manager --add-repo=http://negativo17.org/repos/fedora-multimedia.repo

This is incompatible with and not a replacement for RPMFusion.

Packages of interest:

- Nvidia drivers
- ``gstreamer1-plugins-bad``, ``gstreamer1-plugins-ugly``, ``gstreamer1-plugins-vaapi``, ``gstreamer1-plugins-libav``, ``gstreamer1-plugins-bad-fluidsynth``
- ``mozilla-open264``
- ``vlc`` 

Nvidia
------

.. code-block:: bash

   dnf config-manager --add-repo=http://negativo17.org/repos/fedora-nvidia.repo

The multimedia repo contains the Nvidia packages; you do not need both. Before using it, make sure you remove all previous Nvidia packages (i.e, from RPMFusion):

.. code-block:: bash

   sudo dnf remove \*nvidia\*

Packages of interest:

- ``vulkan``
- ``nvidia-settings``, ``nvidia-driver-libs``
- ``dkms-nvidia`` or ``akmod-nvidia``

Both ``vulkan`` and ``nvidia-driver-libs`` have ``i686`` versions when you need 32-bit (i.e, Wine).

You need to also explicitly install ``kernel-devel`` to avoid pulling in the debug package.

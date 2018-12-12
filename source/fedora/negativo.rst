negativo17 repositories and Nvidia drivers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This page serves as a summary of the repositories located at `https://negativo17.org/ <https://negativo17.org/>`_ to save the reader the trouble of sifting through the blog posts.

The source RPMs, repos and other files can be found `here <https://negativo17.org/repos/>`_.

Multimedia
----------

.. code-block:: bash

   dnf config-manager --add-repo=http://negativo17.org/repos/fedora-multimedia.repo

This is incompatible with and not a replacement for RPMFusion. However, the epoch is set to override RPMFusion packages whenever possible.

Packages of interest:

- Nvidia drivers
- ``gstreamer1-plugins-bad``, ``gstreamer1-plugins-ugly``, ``gstreamer1-libav``, ``gstreamer1-plugins-bad-fluidsynth``
- ``mozilla-openh264``
- ``mpv``

Nvidia
------

The multimedia repo contains the Nvidia packages. Before using it, make sure you remove all previous Nvidia packages (i.e, from RPMFusion):

.. code-block:: bash

   sudo dnf remove \*nvidia\*

Packages of interest:

- ``vulkan-loader``
- ``nvidia-settings``, ``nvidia-driver-libs``
- ``dkms-nvidia`` or ``akmod-nvidia``

Both ``vulkan-loader`` and ``nvidia-driver-libs`` have ``i686`` versions when you need 32-bit (i.e, Wine).

You need to also explicitly install ``kernel-devel`` to avoid pulling in the debug package.

DKMS
----

Run ``dkms status``. If the output is empty, then you'll need to manually run the build and install:

.. code-block:: bash

    dkms add nvidia/&lt;version&gt;
    dkms build nvidia/&lt;version&gt;
    dkms install nvidia/&lt;version&gt;

Where ``<version>`` is something like ``390.25``. You may prefer to do this before rebooting. In that case, append the ``-k`` switch and specify
the kernel version.

If you receive an error like the following:

.. code-block:: bash

   Error! Could not locate dkms.conf file

You will need to remove the previous driver version you have installed. i.e, if you previously had 415.18 installed and upgraded to 415.22,
then remove the 415.18 directory.

.. code-block:: bash

   rm -r /var/lib/dkms/nvidia/415.18

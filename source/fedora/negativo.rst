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

Suspend doesn't work
--------------------

If your computer immediately wakes up upon suspending and you see an error message like the following:

.. code-block:: none

    PreserveVideoMemoryAllocations module parameter is set. System Power
    Management attempted without driver procfs suspend interface. Please refer
    to the 'Configuring Power Management Support' section in the driver README.

Then you need to enable the systemd services for Nvidia:

.. code-block:: bash

    systemctl enable nvidia-suspend.service
    systemctl enable nvidia-resume.service

See `the Nvidia forums <https://forums.developer.nvidia.com/t/resuming-from-suspend-issue-driver-450-57-fedora-32-modesetting-enabled-gtx-750-ti/146265>`_ for more details.

Module doesn't load upon upgrade to Fedora 35
---------------------------------------------

It is unclear why this is happening, however the following workaround works:

.. code-block:: bash

    grubby --update-kernel=ALL --args "modprobe.blacklist=nouveau"

Automatically signing modules for secure boot
---------------------------------------------

Neither negativo nor rpmfusion automatically sign the kernel modules. This is
because it requires manual intervention by the user where a key has to be
created and enrolled into MOK. After that, you can use a script that will sign
the modules after they are built automatically. See `akmod-sign-modules
<https://github.com/larsks/akmod-sign-modules>`_ for akmods. There is a DKMS
version available on the Internet. Note that it does not appear to work unless
you run it manually. That is:

.. code-block:: bash

    systemctl start akmods@$(uname -r)
    systemctl status akmods@$(uname -r)

There is a COPR for changes slated to appear in Fedora 36. Namely
`akmods-secureboot
<https://copr.fedorainfracloud.org/coprs/egeretto/akmods-secureboot/>`_ and
`kmodtool-secureboot
<https://copr.fedorainfracloud.org/coprs/egeretto/kmodtool-secureboot/>`_ by
egeretto. Either generate the key using the provided `akmods-keygen` service
file or by following the `RedHat guide
<https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/8/html/managing_monitoring_and_updating_the_kernel/signing-kernel-modules-for-secure-boot_managing-monitoring-and-updating-the-kernel>`_.

There are a few ways to verify that you enrolled your key correctly.

.. code-block:: bash

    mokutil --list-enrolled
    mokutil --test-key /etc/pki/akmods/certs/public_key.der

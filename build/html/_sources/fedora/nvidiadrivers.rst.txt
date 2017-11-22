Nvidia drivers
^^^^^^^^^^^^^^

You may wish to use proprietary drivers for better performance. 

Negativo
--------

If for some reason you don't want to use RPM Fusion, try `Negativo <http://negativo17.org/nvidia-driver>`_ instead. Installation is dead simple:

.. code-block:: bash

  dnf config-manager --add-repo=http://negativo17.org/repos/fedora-nvidia.repo
  dnf -y remove \*nvidia\*
  dnf -y install nvidia-driver

RPM Fusion
----------

This assumes you're following along with the tutorial from `RPM Fusion
<http://rpmfusion.org/Howto/nVidia?highlight=%28CategoryHowto%29>`_. 

After you decide which driver you want to install, you'll want the
32-bit libraries since many games and application are 32-bit:

.. code-block:: bash

  dnf install xorg-x11-drv-nvidia-libs.i686

kmod
****

* Pros

  * Precompiled
  * No need for devel tools, and the like

* Cons

  * A new kernel update can cause the kmod to be completely useless
    (aka, loss of functionality). Although this happens rarely.

.. code-block:: bash

  dnf install kmod-nvidia "kernel-devel-uname-r == $(uname -r)"
  dnf update -y

akmod
*****

* Pros

  * Does not need a specific kernel version
  * No need to wait for a new kmod when a kernel updates

* Cons

  * Requires devel tools and utilities (like gcc, automake)
  * Longer boot times if a new kernel was installed (as it has to recompile during boot)
  * If the driver compiles but the system does not boot, it cannot be
    solved using the devel tools (aka, unforeseen/non-correctable
    issues)

.. code-block:: bash

  dnf install akmod "kernel-devel-uname-r == $(uname -r)"
  dnf update -y

Troubleshooting
***************

If you are using lightdm and the DPI on the login screen is messed up
after installing a driver, open up
``/etc/lightdm/lightdm-gtk-greeter.conf``, uncomment ``xtf-dpi`` and
change it to 96 (or whatever's appropriate for your monitor.)

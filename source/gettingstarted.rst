Getting started
^^^^^^^^^^^^^^^

To save yourself time, you may prefer to download a `respin ISO <https://dl.fedoraproject.org/pub/alt/live-respins/>`_ that has updates preinstalled. The ``WORK`` ISO comes with GNOME. Fedora only supports the use of base and rpmfusion for packages. However, if you insist on using `negativo17 <https://negativo17.org>`__, you will need to either:

* Not have RPMFusion enabled
* Have RPMFusion enabled but use priorities to ensure negativo17 is used before rpmfusion

This is because they are not compatible with each other.

Some other notes:

* gstreamer 0.10 is deprecated, install gstreamer1.
* negativo17 users, ``libmpg123`` is now ``mpg123``

The :doc:`fedora/negativo` article contains more information.

.. raw:: html

   <script src="https://gist.github.com/remyabel/bbebf3043860abe24a19bf0b1d67bd33.js"></script>

   <noscript>

.. code-block:: bash

   #!/bin/bash
   if [[ $UID != 0 ]]; then
      echo "Not root."
      exit
   fi

   dnf config-manager --add-repo=http://negativo17.org/repos/fedora-multimedia.repo

   # We explicitly list out the packages here because gstreamer1-*
   # will pull in upstream packages that creates conflicts
   dnf install gstreamer1-plugins-bad gstreamer1-plugins-ugly gstreamer1-plugins-bad-fluidsynth gstreamer1-libav
   dnf install mozilla-openh264
   dnf install vlc

   dnf install ffmpeg mpg123

   # kernel-devel needs to be explicitly listed to avoid pulling in the debug package
   dnf install nvidia-settings kernel-devel vulkan-loader.i686 nvidia-driver-libs.i686
   # You can choose dkms-nvidia if you prefer
   dnf install akmod-nvidia

   dnf clean all
   dnf --refresh upgrade

.. raw:: html

   </noscript>

Please don't use Skype unless you enjoy having the NSA read your messages. Finally, check out the :doc:`fedora/pulseaudio` articles on troubleshooting tips.

Other things negativo17 related
-------------------------------

negativo17 provides Flash as well, but you should probably just avoid Flash altogether,
or at least leave it on "Ask to Activate". Fortunately, it seems most of the web has ditched
Flash in favor of moving to HTML5 for web players. I haven't had to activate Flash in a long
time.

negativo17 also provides Steam. However, if you have any games that are
Window only, you need to download Steam via Wine and install the games that way
or use Proton. See the :doc:`fedora/winetips` article for more information.

Finally, to ensure that Negativo's repo takes precedence over RPMFusion, edit ``/etc/yum.repos.d/fedora-multimedia.repo``
and add ``priority=1`` under ``[fedora-multimedia]``.

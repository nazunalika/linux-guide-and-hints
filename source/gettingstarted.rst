Getting started
^^^^^^^^^^^^^^^

To save yourself time, you may prefer to download a `respin ISO <https://dl.fedoraproject.org/pub/alt/live-respins/>`_ that has updates
preinstalled. The ``WORK`` ISO comes with GNOME. We will be using packages and
repositories solely from `negativo17.org <https://negativo17.org/>`_ and *not*
RPMFusion (which is not compatible anyway). A few notes:

- gstreamer 0.10 is deprecated, install gstreamer1. The good news is that the
  myriad of packages has been reduced to about 5.

- Since we are not using RPMFusion, ``libmpg123`` is now ``mpg123``

The :doc:`fedora/negativo` article contains more information. This
script will get you off your feet (adapted from `Louis' script <https://github.com/nazunalika/useful-scripts/blob/master/fedora/fedora-desk.sh>`_):

.. code-block:: bash

   #!/bin/bash
   if [[ $UID != 0 ]]; then
       echo "Not root."
       exit
    fi

    dnf config-manager --add-repo=http://negativo17.org/repos/fedora-multimedia.repo

    # We explicitly list out the packages here because gstreamer1-*
    # will pull in upstream packages that creates conflicts
    dnf install gstreamer1-plugins-bad gstreamer1-plugins-ugly gstreamer1-plugins-vaapi gstreamer1-plugins-libav gstreamer1-plugins-bad-fluidsynth
    dnf install mozilla-open264
    dnf install vlc

    dnf install ffmpeg mpg123

    # kernel-devel needs to be explicitly listed to avoid pulling in the debug package
    dnf install nvidia-settings kernel-devel vulkan.i686 nvidia-driver-libs.i686
    # You can choose dkms-nvidia if you prefer
    dnf install akmod-nvidia

    dnf clean all
    dnf --refresh upgrade

Please don't use Skype unless you enjoy having the NSA read your messages. Finally, check out the
:doc:`fedora/vlc` and :doc:`fedora/pulseaudio` articles on troubleshooting tips.

Other things
------------

negativo17 provides Flash as well, but you should probably just avoid Flash altogether,
or at least leave it on "Ask to Activate". Fortunately, it seems most of the web has ditched
Flash in favor of moving to HTML5 for web players. I haven't had to activate Flash in a long
time.

Again, negativo17 provides Steam. However, if you have any games that are Window only,
you need to download Steam via Wine and install the games that way.

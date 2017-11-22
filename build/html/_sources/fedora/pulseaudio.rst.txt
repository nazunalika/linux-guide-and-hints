Pulseaudio
^^^^^^^^^^

Flat Volume
-----------

Upon a fresh install of Fedora, a feature called ``flat volume`` may be
enabled. It's described on the `Fedora Project's wiki
<https://fedoraproject.org/wiki/Features/VolumeControl#Volume_Control>`_:

::

  Upcoming PA versions support "flat volumes" (and we enable this by
  default). That will basically collapse the stream volume and device
  volume into one (only supported for volume controls with dB info).
  This follows what Vista does: the device volume is always the maximum
  volume of all streams playing on it. 

In layman's terms, if you adjust a volume's audio it will also mess with
the max volume. In a media player like VLC for example, this will more
than likely cause your ears to burst. For most users, this is
undesirable.

The fix is to open up ``/etc/pulse/daemon.conf``, uncomment
``flat-volumes``, and change it to ``no``.

Sound Crackling
---------------

You will occasionally run into sound crackling issues, mainly in voip
applications. To fix this, you can do modify /etc/pulse/default.pa.

.. code-block:: bash

   # sed -i.bak ’/load-module module-udev-detect/ s/$/ tsched=0/’ /etc/pulse/default.pa

You can also do this manually.

.. code-block:: bash

   ### Automatically load driver modules depending on the hardware available
   .ifexists module-udev-detect.so
   #load-module module-udev-detect
   load-module module-udev-detect tsched=0
   .else


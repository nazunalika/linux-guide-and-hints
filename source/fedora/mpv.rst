mpv
^^^

If VLC does not perform well enough for you, you may prefer mpv instead. First, install mpv:

.. code-block:: bash

   dnf install mpv mpv-libs

Then for mpv to actually utilize cuda, you need the appropriate libraries:

.. code-block:: bash

   dnf install nvidia-driver-cuda nvidia-driver-cuda-libs cuda

With that being said, mpv does *not* recommend using hardware decoding by default AND hardware acceleration (with Nvidia) is not supposed on Wayland. If you do, I recommend the following settings:

.. code-block:: bash

    profile=gpu-hq
    hwdec=auto-copy-safe
    # Only if you're using Wayland; hardware acceleration will not work
    gpu-context=wayland

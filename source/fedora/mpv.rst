mpv
^^^

If VLC does not perform well enough for you, you may prefer cuda-enabled mpv instead. First, install mpv:

.. code-block:: bash

   dnf install mpv mpv-libs

Then for mpv to actually utilize cuda, you need the appropriate libraries:

.. code-block:: bash

   dnf install nvidia-driver-cuda nvidia-driver-cuda-libs cuda

After restarting your computer, you can play your MKV files with ``mpv --hwdec=cuda``. 

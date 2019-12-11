Bup
^^^

`Bup <https://github.com/bup/bup>`_ is a backup system based on the git
packfile format. The current version shipped in Fedora is ``0.29.2``, which is
from 2018. This will provide a quick guide on how to build Bup from source.

First, install some system dependencies:

.. code-block:: shell

    dnf install fuse-devel libacl-devel perl-Time-HiRes

Now we need the Python dependencies. ``python3-fuse`` doesn't appear to exist,
only ``python2-fuse``. Not only is the latter package very old, but since
Fedora 31 there has been a mass migration from Python 2 to 3. Unfortunately,
bup hasn't fully been ported to Python 3 yet and will not start if you invoke
it with Python 3.

For simplicity, we'll use a virtualenv:

.. code-block:: shell

    virtualenv -p python2 ~/.venv
    source ~/.venv/bin/activate
    pip2 install pyxattr pylibacl

Then build it:

.. code-block:: shell

    ./configure
    make
    make long-check

The ``configure`` script will automatically detect which Python binary is used
to invoke bup. Remember to run it inside the virtualenv.

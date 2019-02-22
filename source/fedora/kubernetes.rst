Kubernetes
^^^^^^^^^^

Installation
------------

Both ``kubernetes`` and ``kubectl`` (comes with the ``kubernetes`` package) are already available in Fedora.
However, you will still need to obtain ``minikube`` and ``docker-machine-driver-kvm2`` from the
`Github repository <https://github.com/kubernetes/minikube/>`_. The installation instructions recommend that you
download the binary and copy it to ``/usr/local/bin``, but many would prefer not to use a binary blob obtained
from the Internet and compile from source instead.

Fortunately, it is quite simple.

.. raw:: html

   <script src="https://gist.github.com/remyabel/e9c33b830da73768fe6ea2363fc27e1a.js"></script>

Then simply add ``$GOBIN`` to your path.

.. note:: 

   There are COPR repos available, however, most of them seem to just copy over the binary to ``/usr/local/bin``
   and there is one that builds from source, but has questionable quality.

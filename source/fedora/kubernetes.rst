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

   <noscript>

.. code-block:: bash

   #!/bin/bash

   set -xe

   export GOPATH=$(go env GOPATH)
   export GOBIN=$GOPATH/bin

   # go get will not work here, minikube expects to have a certain directory structure
   if [[ ! -d "$GOPATH/src/k8s.io/minikube" ]];
   then
       git clone https://github.com/kubernetes/minikube.git $GOPATH/src/k8s.io/minikube
   fi
   cd $GOPATH/src/k8s.io/minikube
   git checkout -- .
   git checkout $(git describe --abbrev=0 --tags)
   git apply patch
   make clean
   make && make drivers

   cp out/minikube $GOBIN
   cp out/docker-machine-driver-kvm2 $GOBIN

And the patch:

.. code-block:: bash

   diff --git a/Makefile b/Makefile
   index 42b571bfd..8da3cf0b1 100755
   --- a/Makefile
   +++ b/Makefile
   @@ -173,7 +173,7 @@ depend: out/minikube.d out/test.d out/docker-machine-driver-hyperkit.d out/stora
    all: cross drivers e2e-cross

    .PHONY: drivers
   -drivers: out/docker-machine-driver-hyperkit out/docker-machine-driver-kvm2
   +drivers: out/docker-machine-driver-kvm2

    .PHONY: integration
   integration: out/minikube

.. raw:: html

   </noscript>

Then simply add ``$GOBIN`` to your path.

.. note:: 

   There are COPR repos available, however, most of them seem to just copy over the binary to ``/usr/local/bin``
   and there is one that builds from source, but has questionable quality.

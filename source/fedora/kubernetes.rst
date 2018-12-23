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

.. code-block:: bash

   # libvirt-devel is required for building docker-machine-driver-kvm2
   sudo dnf install glibc-static libvirt-devel

   export GOPATH=$(go env GOPATH)
   export GOBIN=$GOPATH/bin

   # go get will not work here, minikube expects to have a certain directory structure
   git clone https://github.com/kubernetes/minikube.git $GOPATH/src/k8s.io/minikube
   cd $GOPATH/src/k8s.io/minikube
   make && make drivers

   cp out/minikube $GOBIN
   cp out/driver-machine-driver-kvm2 $GOBIN

Then simply add ``$GOBIN`` to your path.

.. note:: 

   There are COPR repos available, however, most of them seem to just copy over the binary to ``/usr/local/bin``
   and there is one that builds from source, but has questionable quality.

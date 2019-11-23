Kubernetes
^^^^^^^^^^

Installation
------------

Both ``kubernetes`` and ``kubectl`` (comes with the ``kubernetes`` package) are already available in Fedora.
However, you will still need to obtain ``minikube`` and ``docker-machine-driver-kvm2`` from the
`Github repository <https://github.com/kubernetes/minikube/>`_. The installation instructions recommend that you
download the binary and copy it to ``/usr/local/bin``, but many would prefer not to use a binary blob obtained
from the Internet and compile from source instead.

Fortunately, it is quite simple. First, install ``libvirt-devel``. Then use the following script:

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
   make clean
   make && make docker-machine-driver-kvm2

   cp out/minikube $GOBIN
   cp out/docker-machine-driver-kvm2 $GOBIN

Then simply add ``$GOBIN`` to your path.

.. note:: 

   There are COPR repos available, however, most of them seem to just copy over the binary to ``/usr/local/bin``
   and there is one that builds from source, but has questionable quality.

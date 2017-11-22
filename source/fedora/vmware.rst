VMware
^^^^^^

On Fedora (and possibly other distros), the VMware kernel modules don't rebuild with kernel updates automatically. Fortunately, doing this is a simple process.

.. code-block:: bash

    # Build the VMware kernel modules
    cd /usr/lib/vmware/modules/source
    sudo tar xf vmmon.tar
    sudo tar xf vmnet.tar
    cd vmmon-only
    sudo make
    cd ../vmnet-only
    sudo make
    cd ..
    # Copy them to the modules directory
    sudo mkdir /usr/lib/modules/$(uname -r)/misc
    sudo cp vmmon.o /usr/lib/modules/$(uname -r)/misc/vmmon.ko
    sudo cp vmnet.o /usr/lib/modules/$(uname -r)/misc/vmnet.ko
    # Load the new modules
    sudo depmod -a
    # Restart the VMware service
    sudo /etc/init.d/vmware restart

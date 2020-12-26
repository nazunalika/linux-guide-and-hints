dnscrypt
^^^^^^^^

A recent `change
<https://src.fedoraproject.org/rpms/dnscrypt-proxy/blob/master/f/dnscrypt-proxy.spec#_158>`_
(specifically 2.0.44-5) removed Fedora's systemd files and falls back to
``dnscrypt-proxy``'s installation method for service files instead. However, if
that ``dnscrypt-proxy`` no longer starts, you may need to follow the
instructions I posted `here
<https://github.com/DNSCrypt/dnscrypt-proxy/issues/1556#issuecomment-751370507>`_:

Hi, the latest changes to the RPM removed the systemd files and falls back to
``dnscrypt-proxy``'s method instead. I ran into this issue myself. Since
``dnscrypt-proxy`` doesn't overwrite the existing service file, the one
previously shipped with Fedora will cause ``dnscrypt-proxy`` to not start.

Try removing ``/etc/systemd/system/dnscrypt-proxy.service`` and re-run ``sudo
dnscrypt-proxy -install service``.

Since the RPM no longer uses sockets, you might need to edit the config as well
to specify listening addresses:

.. code-block::

    listen_addresses = ['127.0.0.1:53', '[::1]:53']

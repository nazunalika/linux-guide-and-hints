.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

DNS
^^^

There are various DNS solutions available on Fedora, including but not limited
to dnsmasq, BIND, Unbound, etc. systemd-resolved has some overlapping
functionality with Unbound and other solutions, but is known to be buggy and
feature incomplete. dnscrypt-proxy is not that widely used, but contains
blocking and a built-in DNS-over-HTTPS server. Unbound can be combined with
dnscrypt-proxy for example by forwarding requests, however, they overlap with
blocking capabilities and caching. Generally speaking, you would use
dnscrypt-proxy for DNS-over-HTTPS and other solutions for DNS-over-TLS.


Interoperability with systemd-resolved
--------------------------------------

A lot of guides suggest disabling ``systemd-resolved`` when using dnscrypt.
However, it is relatively straight forward to get it working. A couple of things to note:

- ``systemd-resolved`` will not do any caching when it detects another resolver running
  on localhost (i.e, dnscrypt), so ``resolvectl`` statistics will be misleading
- it will claim no DNSSEC support, although we can test this later

One footgun is that ``systemd-resolved`` will use a fallback resolver if DNS
resolution doesn't work for some reason. This is obviously undesirable because
it might result in traffic being sent unencrypted. The solution is to ensure
that traffic is only sent to ``dnscrypt-proxy`` and that there are no fallback
resolvers.

First, in Network Manager, ensure that your DNS server points to ``127.0.0.1``.
Then, we're going to create a config file in
``/etc/systemd/resolved.conf.d/dns_servers.conf`` with the following contents:

.. code-block:: none

    [Resolve]
    DNS=127.0.0.1
    Domains=~.

If everything worked correctly, running ``resolvectl status`` should show something similar to:

.. code-block:: none

    Global
             Protocols: LLMNR=resolve -mDNS -DNSOverTLS DNSSEC=no/unsupported
      resolv.conf mode: stub
    Current DNS Server: 127.0.0.1
           DNS Servers: 127.0.0.1
            DNS Domain: ~.

Now how do we actually test if everything is working properly?

- For DNSSEC, use https://dnssec.vs.uni-due.de/
- For QNAME minimization, run ``dig qnamemintest.internet.nl txt``
- For blocking, you can either enable logging in dnscrypt or run ``resolvectl
  query`` for a domain you expect to be blocked. ``dig`` should also show a
  message saying the query was blocked locally by your resolver
- For leaking, https://dnsleaktest.com/

Unbound
^^^^^^^

.. meta::
    :description: How to install/configure Unbound on CentOS for DNS forwarding for a network or a standalone machine.

Requirements
------------

Setup
-----

Installation
++++++++++++

.. code:: shell

   % yum install unbound -y
   % systemctl enable unbound

DNS over TLS (DoT)
++++++++++++++++++

Setting up DoT with unbound is straight forward, whether you already have a DNS server already or not. Let's go over the most basic configuration.

.. code:: shell

   % vi /etc/unbound/unbound.conf
   server:
           . . .
           # Set the below to an IP address if you wish - as I have multiple VLAN's
           # it is just easier for me to listen everywhere
           interface: 0.0.0.0
           interface: ::
           # Optionally set a port - I have bind already running, so port 9053 works
           interface-automatic: no
           port: 9053
           . . .
           # Set access control rules here. I'll show a few examples with just two of
           # my networks
           # REFUSE everything
           access-control: 0.0.0.0/0 refuse
           access-control: ::0/0 refuse
           # Allow localhost to snoop
           access-control: 127.0.0.1/32 allow_snoop
           access-control: ::1 allow_snoop
           # Allow the entire localhost subnet
           access-control: 127.0.0.0/8 allow
           access-control: ::ffff:127.0.0.1 allow
           # Allow my main network and sandbox network
           access-control: 10.100.0.0/24 allow
           access-control: 10.100.1.0/24 allow
           . . .
           # Ensure tls-cert-bundle is set
           tls-cert-bundle: /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
           . . .
   # Create the forward zone for DoT queries
   forward-zone:
           name: "."
           forward-tls-upstream: yes
           # Cloudflare
           forward-addr: 1.1.1.1@853#cloudflare-dns.com
           forward-addr: 1.0.0.1@853#cloudflare-dns.com
           forward-addr: 2606:4700:4700::1111@853#cloudflare-dns.com
           forward-addr: 2606:4700:4700::1001@853#cloudflare-dns.com
           # Quad9
           forward-addr: 9.9.9.9@853#dns.quad9.net
           forward-addr: 149.112.112.112@853#dns.quad9.net

   % systemctl enable unbound --now
   # If you are using bind already with forwarders, you should edit it. Example.
   % vi /etc/named.conf
   options {
           . . .
           forwarders {
                   # This assumes your bind server and unbound server are on
                   # the same server like I did.
                   127.0.0.1 port 9053;
           };
           forward only;
           . . .



Git
^^^

Setting up Cloudflare and Github pages
--------------------------------------

Because Github has rolled out official support for HTTPS for custom domains, configuring it in tandem with Cloudflare has become
slightly trickier. Ensure that your Cloudflare settings look like the following. The latest Github IPs can be found in their
`documentation <https://help.github.com/articles/setting-up-an-apex-domain/#configuring-a-records-with-your-dns-provider>`_.

+-------+-------------+----------------------------+--------------------------+
| Type  |    Name     |           Value            |          Status          |
+-------+-------------+----------------------------+--------------------------+
| CNAME | www         | is an alias of example.com | DNS and HTTP Proxy (CDN) |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+
| A     | example.com | points to <GITHUB-IP>      | DNS only                 |
+-------+-------------+----------------------------+--------------------------+

The reason you enable the HTTP proxy for the CNAME is to allow Cloudflare's page rules to work. Without it, ``example.com`` (without
the www subdomain) does not resolve correctly and the HTTP -> HTTPS redirect does not work.

GPG
---

This summarizes the information from `Github Help <https://help.github.com/articles/signing-commits-with-gpg/>`_.

* List your keys with ``gpg2 --list-keys``.
* Configure your git signing key with ``git config --global user.signingkey <key>``.
* Run ``gpg2 --armor --export <key>`` and add the key to your Github account.
* Sign commits with ``git commit -S <...>``
* ``git-bump`` will sign tags automatically.

Note that ``gpg2`` and ``gpg`` are not interchangeable. If you decide to use ``gpg2``, you can tell git to use it with
``git config --global gpg.program gpg2``.

Ensure that your name and e-mail address match the Github account you're adding the key to.

`gpg-agent` requires that you set `GPG_TTY`. For bash, this would look like:

.. code-block:: bash

   GPG_TTY=$(tty)
   export GPG_TTY

For fish:

.. code-block:: bash

   set -gx GPG_TTY (tty)

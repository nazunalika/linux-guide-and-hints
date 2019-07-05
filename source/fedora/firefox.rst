Firefox
^^^^^^^

Disable automatic redirect to a website if typing an invalid URL
----------------------------------------------------------------

Example, you type ``firefox build/html/fedora/gcc.rst`` (where gcc.rst doesn't exist) and it opens up ``build.com/...``. Go to ``about:config`` and set ``browser.fixup.alternate.enabled`` to ``false``.

Glitchy UI when using custom GTK theme
--------------------------------------

If you are using a custom GTK theme for your window manager, you need to instruct Firefox to use the default theme. On XFCE, this will be something like:

.. code-block:: bash

   env GTK_THEME=Adwaita:light firefox

If that's inconvenient, you can add the change to Firefox directly. Go to ``about:config`` and add a new key called ``widget.content.gtk-theme-override``. Set the value to ``Adwaita:light`` or whatever you prefer.

Enabling Secure DNS and Encrypted SNI
-------------------------------------

For some reason, this is disabled by default. First, ensure you're using
Cloudflare's DNS servers 1.1.1.1 and 1.0.0.1. Then go to Firefox Options >
General > Network Settings and check the box "Enable DNS over HTTPS" (by
default this will use Mozilla's provider). Then, in ``about::config`` set
``network.trr.bootstrapAddress`` to ``1.1.1.1`` and
``network.security.esni.enabled`` to ``true``. After restarting your browser,
run the test at https://www.cloudflare.com/ssl/encrypted-sni/ to check your
results.

Source: https://www.reddit.com/r/firefox/comments/a5evhr/configure_dns_over_https_in_firefox/

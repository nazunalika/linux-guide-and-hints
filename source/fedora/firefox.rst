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

Forcing dark theme
------------------

By default, Firefox will use your system preference to determine whether or not
to use a dark theme, but does not expose this option.  In ``about:config``,
create a new entry called ``ui.systemUsesDarkTheme`` and set it to ``1``.

If you experience a "flashing" white background when loading a new tab, then
you need a custom ``userContent.css`` file. First, enable
``toolkit.legacyUserProfileCustomizations.stylesheets``. Then create a
``chrome`` folder in your user profile and populate ``userContent.css`` with
the following contents:

.. code-block:: css

    /*
       dark background in new tabs without a white flash (with tridactyl newtab)
       @see: https://github.com/tridactyl/tridactyl/issues/2510
    */
    :root {
      --tridactyl-bg: #1d1b19 !important;
      --tridactyl-fg: white !important;
    }

    /*
        set the background color of the new tab page (without tridactyl or with tridactyl without newtab)
    */
    @-moz-document url-prefix(about:home), url-prefix(about:newtab) {
      body {
        background: #1d1b19;
      }
    }

    /*
        if you set it straight to body element, it will be applied to the random web pages
        that don't explicitly set the background color of their body element
        (there's many of those online)
    */
    /* body { */
    /* background-color: #1d1b19; */
    /* } */

Credit goes to `@maricn <https://github.com/maricn>`_ for the CSS.

Disable ``network.http.referer.spoofSource``
--------------------------------------------

Some privacy guides or tools suggest you enable this setting. However, it can
break websites. This `article
<https://feeding.cloud.geek.nz/posts/tweaking-referrer-for-privacy-in-firefox/>`_
suggests using setting ``network.http.referer.XOriginPolicy`` and
``network.http.referer.XOriginTrimmingPolicy`` to ``2`` instead.

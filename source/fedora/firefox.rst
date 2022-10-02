.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

Firefox
^^^^^^^

Original author: Tommy Nguyen

Last modified: Mon Aug 1 17:02

arkenfox/user.js
----------------

The recommended way of managing config settings nowadays is `arkenfox
<https://github.com/arkenfox/user.js>`_. Help can be found in the `wiki
<https://github.com/arkenfox/user.js/wiki>`_.

For historical purposes, advice on individual settings can be found below. Note
however that these settings may be deprecated or inactive in the future.

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

Minimizing ram usage
--------------------

Firefox uses multiple processes for tabs which can lead to increased RAM usage
over time. While you can go to ``about:memory`` and run the garbage collector,
it has a marginal effect.  Restarting the browser is needed to keep RAM usage
down. However, there are two things you can do to mitigate high RAM usage:

* in ``about:config``, set ``browser.newtab.preload`` to false. This will
  prevent tabs from loading until you click on them
* Install `Auto Tab Discard <https://add0n.com/tab-discard.html>`_ which will
  put tabs to sleep automatically if not in use

Alternative to Stylus
---------------------

If you wish not to have Stylus installed but want to replicate its
functionality, here's what you can do. First, go to each style you have
installed and export it. It will look something like:

.. code-block:: css

    @-moz-document domain("example.com") {
        /* insert style here */
    }

You can use ``url-prefix``, etc. Put it in a folder somewhere. We want to now
append this to ``userContent.css`` which is going to be located in the
``chrome`` folder in your Firefox profile.

.. code-block:: bash

    for file in *.css
    do
        cat "$file" >> $HOME/.mozilla/firefox/some-profile.default/chrome/userContent.css
    done

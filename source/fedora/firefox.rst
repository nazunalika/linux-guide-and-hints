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

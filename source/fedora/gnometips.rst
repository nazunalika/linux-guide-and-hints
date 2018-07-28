GNOME Tips
^^^^^^^^^^

System Tray
-----------

GNOME does not come with a system tray. The extension TopIcons Plus used to be the goto for adding a tray back into GNOME. However, the developer has ceased development. GNOME and KDE have both gone to libappindicator instead of the legacy system tray. Quite a few applications now support this, such as Pidgin, Clementine, Discord, Dropbox, Telegram, and potentially many others.

The extension needed is `(K)StatusNotifierItem/AppIndicator <https://extensions.gnome.org/extension/615/appindicator-support/>`__.

Add minimize/maximize
---------------------

GNOME Developers seem to think minimize/maximize is not a useful feature of a desktop environment. To enable it, run the following as your user:

.. code-block:: bash

   % gsettings set org.gnome.desktop.wm.preferences button-layout 'appmenu:minimize,maximize,close'

Pidgin
------

When using Pidgin in GNOME, there's no default tray for it to live in. You will need to install the (K)StatusNotiferItem/AppIndicator extension from the `gnome extension website <https://extensions.gnome.org/extension/615/appindicator-support/>`__. And then install this package:

.. code-block:: bash

   % dnf install pidgin-indicator -y

In pidgin, click tools -> plugins, enable Ubuntu Indicator and restart pidgin.


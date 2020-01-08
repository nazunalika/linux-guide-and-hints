COPR
^^^^

We provide up-to-date RPM's for some packages located at our copr. They are typically updated at release time of the software.

* `gzdoom <https://copr.fedorainfracloud.org/coprs/nalika/gzdoom/>`__
* `atheme <https://copr.fedorainfracloud.org/coprs/nalika/irc/>`__
* `charybdis (ircd) <https://copr.fedorainfracloud.org/coprs/nalika/irc/>`__

The sources can be found `on Github <https://github.com/nazunalika>`__.

gzdoom
------

The gzdoom RPM package provides the following:

* A proper desktop file
* Compatibility with FluidSynth 2.x
* Fallback soundfont to prevent gzdoom crashes when none are available
* Static linking (as pushed by the source code by default)

It currently recommends freedoom, but it can safely be ignored or removed after installation.

ircd
----

The irc repo provides atheme (a services daemon) and charybdis (an irc daemon). At one point, we packaged inspircd, but it was removed as the developers decided to keep reinventing the wheel with how it gets built.

* `charybdis <https://github.com/charybdis-ircd/charybdis>`__
* `atheme <https://atheme.github.io/atheme.html>`__

The packages provide the following:

* Standardized directories (to comply with FHS)
* PPC64LE support
* AARCH64 support where possible
* No code modifications (with the exception of specific packages that may never make it upstream)
* Default configurations with examples


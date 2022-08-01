.. SPDX-FileCopyrightText: 2019-2022 Louis Abel, Tommy Nguyen
..
.. SPDX-License-Identifier: MIT

COPR
^^^^

We provide up-to-date RPM's for some packages located at our copr. They are typically updated at release time of the software.

* `gzdoom <https://copr.fedorainfracloud.org/coprs/nalika/gzdoom/>`__
* `atheme <https://copr.fedorainfracloud.org/coprs/nalika/irc/>`__
* `solanum (ircd) <https://copr.fedorainfracloud.org/coprs/nalika/irc/>`__

The sources can be found `on Github <https://github.com/nazunalika>`__.

Additionally, until Firejail and libimobiledevice get newer versions in the
repos, we have `copr versions available
<https://copr.fedorainfracloud.org/coprs/remyabel/>`_.

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

* `solanum <https://solanum.chat>`__
* `atheme <https://atheme.github.io/atheme.html>`__

The packages provide the following:

* Standardized directories (to comply with FHS)
* PPC64LE support where possible
* AARCH64 support where possible
* No code modifications (with the exception of specific packages that may never make it upstream)
* Default configurations with examples


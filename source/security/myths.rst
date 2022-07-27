Myths
^^^^^

Linux security is a rather contentious topic. While this article isn't about
whether Linux is secure overall, it tackles some widely spread myths and
misconceptions about the ecosystem.

Most package maintainers can't code
-----------------------------------

This myth is based on the assumption that a package maintainer's skillset
extends as far as packaging, no more, no less. The reality is that package
maintainers often have a modicum of coding skill in order to analyze security
flaws of applications and write patches that cannot or have not been merged
upstream yet.

Some packages like Firefox or PipeWire are maintained by those who have
software engineering experience (both are RedHat employees, but Martin Stransky
for example contributes directly to the Firefox codebase).

Package managers are an unnecessary and insecure middleman
----------------------------------------------------------

The perception by many users is that package managers simply are wrappers
around applications and are unnecessary when you could get it directly from the
developer instead. However, I think this description fits more for download
sites (which simply distribute and repackage executables) but package
maintainers do more than simply redistribute binaries.

Fedora for example requires first-party packages to be built on Fedora
infrastructure. The source code is taken, any necessary patches applied, distro
specific configure flags are passed and the subsequent binary is built on the
infrastructure. On the other hand, binaries from developers are typically
either built on the developer machine or on some third party infrastructure
(like GitHub, Azure and so forth). While the general idea is that users tend to
trust downloading directly from the developers instead of a middleman, the
middleman is simply a different party.

There have been many instances of supply chain compromises from careless
developers not enabling 2FA, committing API secrets to their repository or
GitHub vulnerabilities for example, but by building the code on Fedora's
infrastructure, this is bypassed entirely.

Michał Górny has blog posts tackling this topic in `The modern packager’s
security nightmare
<https://blogs.gentoo.org/mgorny/2021/02/19/the-modern-packagers-security-nightmare/>`_
and `Why not rely on app developer to handle security?
<https://blogs.gentoo.org/mgorny/2021/02/23/why-not-rely-on-app-developer-to-handle-security/>`_.

Is Flatpak a good compromise?
-----------------------------

Flatpak apps are built against a common runtime rather than arbitrary
dependencies so this is similar to traditional package management.  Similarly,
Flatpaks are built using the distro's infrastructure (Fedora in the case of
their registry, Flathub in the case of a third party registry). However, there
is one downside.

App developers are essentially given control over what permissions their app
does or doesn't need.  In theory this makes sense, as the app developer may
know what works best for their app. In practice, many weaken the sandbox to
avoid bug reports or due to lack of understanding of the Linux ecosystem in
general may use the broadest permissions available.

Flatpaks that are simply wrappers around proprietary apps (like Discord) cannot
for example prevent telemetry or would require weakening the sandbox for
essential features.  Ironically, it is more secure to run Discord in a browser
where you have a full spectrum blocker (like UBlock Origin) and the website
sandboxing features of your browser.

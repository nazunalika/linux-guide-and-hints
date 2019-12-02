Password management
^^^^^^^^^^^^^^^^^^^

Our :doc:`antipatterns </security/antipatterns>` article discusses some insecure things
that can be done w.r.t. password from a system administrator or developer point
of view. This article is aimed towards users.

There is a wealth of information about there about how to choose a secure
password.  Often this involves multiple character classes (such as lowercase,
uppercase, punctuation etc.) or passphrases (strings of randomly chosen
dictionary words, ala `Diceware <https://en.wikipedia.org/wiki/Diceware>`_).
However, what's often skipped is the discussion of two other important
elements: length and entropy of the password.  Without dwelving into a deep
discussion, a complex password which is short is weak.  And a password with low
entropy (that is, the password is generated using a poor random number
generator or manually by a human) is also bad. The rule of thumb to remember is
that **how a password is generated** is more important than heuristic measures
of the complexity of a password. Furthermore, you should avoid reusing passwords
due to `credential stuffing attacks <https://www.owasp.org/index.php/Credential_stuffing>`_.

Regardless of what your password ends up being or how complex your password is,
you should be using password manager software to store your passwords. For the
desktop, I highly recommend `KeePassXC <https://keepassxc.org/>`_ and for
mobile `Strongbox <https://github.com/strongbox/strongbox>`_ as KeePassXC does
not have a mobile client. You can also use `Pass
<https://www.passwordstore.org/>`_, which is a commandline password store that
uses GPG to encrypt your passwords and has a plethora of third party
integrations.

Backing your databases up to your phone
---------------------------------------

We assume you've read our :doc:`IPhone </fedora/iphone>` article. A typical mechanism for
transferring files to your phone is to either use iTunes or the cloud. However, in addition
to iTunes working poorly on Linux, I consider it to be user unfriendly bloatware. I also do not
like using iCloud to avoid exposing myself to unnecessary risk.

Transferring your files to your iphone using ``ifuse`` is very straightforward:

.. code-block:: shell

    #!/bin/bash

    if ifuse --documents com.markmcguill.strongbox "$HOME"/strongbox/;
    then
        cp "$HOME"/NewDatabase* "$HOME"/strongbox || fail
        sleep 1
        fusermount -u "$HOME"/strongbox || fail
    fi

It is a quick operation and you can start using the database on your phone instantly.

FAQ
---

Isn't using a single password bad?
**********************************

Using a single, complex password stored only in your brain is more secure than
multiple insecure passwords that you have to remember. Writing those passwords
down, storing them in a plaintext file or some other mechanism is not as secure
as an encrypted database. It goes without saying that the master password you
choose should be long and generated in a cryptographically secure manner.

But your master password can be stolen by a keylogger
*****************************************************

The same could be said about any other password, password manager or not.
Furthermore, if an attacker has physical access to your computer, it's
generally considered game over.  Password managers like KeePassXC do have
features like autotype which can autofill passwords in an obfuscated manner to
defeat software keyloggers. However, you should be making sure your computer is
free of malware anyway.

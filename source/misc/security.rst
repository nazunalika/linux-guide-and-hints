Security and anti-patterns
^^^^^^^^^^^^^^^^^^^^^^^^^^

Whether you are a system administrator or developer, practicing good
infosec hygiene is important. Downplaying the importance of security,
whether due to apathy or simply thinking it's too expensive, can be
costly in the long run. This article is meant to briefly touch on some
general practices you should follow and is not meant to be a
comprehensive guide.

HTTPS
-----

There is no reason not to use HTTPS in 2019. Services like Cloudflare
and Let's Encrypt offer certificates for free and are easy to deploy.
For Cloudflare, the only thing that's required is to add some DNS
records and enable universal SSL (with some caveats if you intend on
using ``Full (Strict)``). Let's Encrypt has easy-to-use clients like
`certbot <https://certbot.eff.org/>`_ that will handle issuing,
revocation and renewal of certificates with minimal interaction. 

If you are concerned about speed, see https://istlsfastyet.com/. 

For a list of common complaints and rebuttals, see
https://doesmysiteneedhttps.com/.

If your complaint is that Let's Encrypt doesn't provide Extended
Validation Certificates, see `Extended Validation Certificates are Dead <https://www.troyhunt.com/extended-validation-certificates-are-dead/>`_ by Troy Hunt.

There are still some anti-patterns that can limit the usefulness of
HTTPS:

Insecure requests
+++++++++++++++++

If your page redirects HTTP to HTTPS or if you are loading resources
that are HTTP only, your page is still vulnerable. Ideally, you should
combine `HTTP Strict Transport Security
<https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security>`_ and
`Content Security Policy <https://content-security-policy.com/>`_. For
example, a page which links to a form via HTTP (even if the final
destination is HTTPS) is suspectible to a MITM attack. Mixed content
(loading resources with HTTP even on a HTTPS site) is also an attack
vector. Ensure that you do not allow HTTP requests and that you
whitelist assets to mitigate the damage an attacker can do. At a
minimum, your CSP should include ``upgrade-insecure-requests`` and
disallow ``unsafe-inline``.

Using insecure ciphers
++++++++++++++++++++++

Allowing insecure ciphers in your suite can expose your users to
different types of attacks. There is a trade-off between security and
compatibility (and the cipher suite shipped with nginx by the default
enables some insecure ciphers). See Mozilla's `Server Side TLS
<https://wiki.mozilla.org/Security/Server_Side_TLS>`_ article for a
cipher suite that prefers strong ciphers while also taking compatibility
into account.

Consider dropping support for obsolete platforms. `badssl
<https://badssl.com/>`_ will test your browser for support for various
features.

Consider scanning your server using a third party service like `testssl
<https://testssl.sh/>`_.

.. note::

    TODO: add more sections.

Password security
-----------------

Some anti-patterns related to password security include:

Using deprecated hashing functions
++++++++++++++++++++++++++++++++++

It goes without saying that you should not be using md5 and sha1 to hash
your passwords. While sha256 and sha512 are superior, you should be
using a strong hashing function or key derivation function that employs
key stretching (the practice of iteratively applying a hashing function)
and salting. Both properties will make password hashes more resistant to
bruteforcing. For example, bcrypt does this out of the box without need
for extra configuration, however key derivation functions like Argon2
and PBKDF2 are also popular choices. [#f1]_ [#f2]_

For services like SMTP, XMPP or PostgreSQL, you should attempt to use
`SCRAM-SHA1
<https://en.wikipedia.org/wiki/Salted_Challenge_Response_Authentication_Mechanism>`_.
SCRAM uses PBKDF2 under the hood and is strongly preferred to
DIGEST-MD5. The other advantage of this mechanism is that users do not
have to store their passwords in plain-text locally. 

Arbitrary password lengths
++++++++++++++++++++++++++

If you are storing passwords hashed (which you should), then there is
little reason to limit the length of passwords. By definition, hash
functions will take an input of arbitrary length and output a string of
fixed length. If a site caps password length to a small value (usually
something like 16 characters), there is a high probability they are
storing passwords in plain-text. However, it is reasonable to cap the
password length to something moderately high (like 512 characters) to
mitigate denial-of-service attacks. [#f3]_

Client-side hashing
+++++++++++++++++++

It is our opinion that client-side hashing does not add any additional
security.  The hashed password simply becomes the new password. While one can
argue that it obfuscates the original password (since password reuse is
rampant), a more effective strategy is to educate users to use password
managers and to not reuse passwords across services. There are a few problems
with client-side hashing:

1. The user may have JavaScript disabled for security reasons.

2. It requires that you trust the client (which is always a bad idea). The user
   or an attacker can simply modify the client side code to do what they wish.
   It also makes it easier for an attacker to impersonate the user.

.. note::

    TODO: add more sections.

Disabling mitigations
---------------------

There's a site (and general opinion) called https://make-linux-fast-again.com/
making the rounds that recommends disabling all mitigations related to
Meltdown, Spectre, MDS, et al. It is our opinion that you should not be
following this advice. The kernel documentation has pages on `L1TF
<https://www.kernel.org/doc/html/latest/admin-guide/hw-vuln/l1tf.html>`_ and
`MDS <https://www.kernel.org/doc/html/latest/admin-guide/hw-vuln/mds.html>`_
that discusses these vulnerabilities in full, the available mitigations and the
pros and cons of disabling them. In a nutshell, since some of the mitigations
lead to performance degradation, some people are suggesting disabling all
mitigations.  **This is very bad advice**.

The most significant performance degradation results from disabling SMT. Due to
the trade-off between the loss of performance and the low risk of most users
being affected by these vulnerabilities, SMT is on by default. If you care
about performance, **no further action is needed**. Disabling the other
mitigations exposes yourself to unnecessary risk for little to no performance
gain.

.. rubric:: Footnotes

.. [#f1] See `How to securely hash passwords? <https://security.stackexchange.com/questions/211/how-to-securely-hash-passwords/31846#31846>`_
.. [#f2] See `AES: Why is it a good practice to use only the first 16 bytes of a hash for encryption? <https://crypto.stackexchange.com/questions/68545/aes-why-is-it-a-good-practice-to-use-only-the-first-16-bytes-of-a-hash-for-encr/68548#68548>`_
.. [#f3] See `What technical reasons are there to have low maximum password lengths? <https://security.stackexchange.com/questions/33470/what-technical-reasons-are-there-to-have-low-maximum-password-lengths>`_

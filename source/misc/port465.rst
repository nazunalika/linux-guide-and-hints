Is port 465 deprecated?
^^^^^^^^^^^^^^^^^^^^^^^

.. note::

    For a guide on how to setup Exim4 with Gmail and implicit TLS, see `How To
    Secure A Linux Server
    <https://github.com/imthenachoman/How-To-Secure-A-Linux-Server#the-miscellaneous>`_.

No. Some sources like `Debian's guide on Gmail and Exim4
<https://wiki.debian.org/GmailAndExim4>`_ and the StackOverflow question `What
is the difference between ports 465 and 587?
<https://stackoverflow.com/questions/15796530/what-is-the-difference-between-ports-465-and-587/19942206#19942206>`_
claim that port 465 is deprecated. RFC 8314 entitled `Cleartext Considered
Obsolete: Use of Transport Layer Security (TLS) for Email Submission and Access
<https://tools.ietf.org/html/rfc8314>`_ recommends that you use port 465 with
implicit TLS instead of STARTTLS on port 587:

   In brief, this memo now recommends that:

   -  TLS version 1.2 or greater be used for all traffic between MUAs
      and Mail Submission Servers, and also between MUAs and Mail Access
      Servers.

   -  MUAs and Mail Service Providers (MSPs) (a) discourage the use of
      cleartext protocols for mail access and mail submission and
      (b) deprecate the use of cleartext protocols for these purposes as
      soon as practicable.

   -  Connections to Mail Submission Servers and Mail Access Servers be
      made using "Implicit TLS" (as defined below), in preference to
      connecting to the "cleartext" port and negotiating TLS using the
      STARTTLS command or a similar command.

More specifically:

   The STARTTLS mechanism on port 587 is relatively widely deployed due
   to the situation with port 465 (discussed in Section 7.3).  This
   differs from IMAP and POP services where Implicit TLS is more widely
   deployed on servers than STARTTLS.  It is desirable to migrate core
   protocols used by MUA software to Implicit TLS over time, for
   consistency as well as for the additional reasons discussed in
   Appendix A.

However, some have conflated `SMTPS <https://en.wikipedia.org/wiki/SMTPS>`_
with implicit TLS on port 465, which is not the same thing. In particular,
section 7.3 of RFC 8314 explains that SMTPS was briefly assigned to port 465
and subsequently revoked:

   ...

   Unfortunately, some widely deployed mail software interpreted "smtps" as
   "submissions" [RFC6409] and used that port for email submission by default when
   an end user requested security during account setup.

   ...

   Although STARTTLS on port 587 has been deployed, it has not replaced the
   deployed use of Implicit TLS submission on port 465.

To reiterate, "Implicit TLS submission" which is defined in section 3 is not
the same as SMTPS and you should use port 465 over port 587 if possible.
Another point of confusion is the use of SSL on port 465. As a result, you'll
find many resources on the Internet claiming not to use port 465. It is true
that you should prefer TLS over SSL, but port 465 is not deprecated.

.. note::

   The RFC also states:

      Note that there is no significant difference between the security
      properties of STARTTLS on port 587 and Implicit TLS on port 465 if
      the implementations are correct and if both the client and the server
      are configured to require successful negotiation of TLS prior to
      Message Submission.

   The key phrase here being "require successful negotation". If STARTTLS is not
   configured this way, then it is less secure than Implicit TLS.

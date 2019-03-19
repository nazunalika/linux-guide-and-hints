Packaging
^^^^^^^^^

`git-build-rpm <https://github.com/iovation/git-build-rpm>`_ is a tool (that
installs itself as a git subcommand) for packaging RPM's. Conveniently, it
handles submodules while tito and rpkg do not. First, grab the dependencies:

.. code-block:: bash

    sudo dnf install git rpm-build perl-rpm-build-perl perl-IPC-System-Simple \
                perl-Path-Class perl-Test-Pod perl-Module-Build
    pip3 install --user git-archive-all

Then build and install:

.. code-block:: bash

    perl Build.PL
    ./Build
    ./bin/git-build-rpm --package-name git-build-rpm
    sudo dnf install git-build-rpm*.rpm

At the time of writing, it does not copy over SRPM's (which is what we really
want to upload to COPR), so apply this patch:

.. code-block:: diff

    diff --git a/bin/git-build-rpm b/bin/git-build-rpm
    index 69bea6f..1d18c47 100755
    --- a/bin/git-build-rpm
    +++ b/bin/git-build-rpm
    @@ -128,11 +128,20 @@ runx 'rpmbuild', '-ba', '--define', "_topdir $dir",
     $dir->subdir('RPMS')->recurse(callback => sub {
         my $rpm = shift;
         my $bn = $rpm->basename;
    -    return if $bn !~ /[.]rpm$/;
    +    return if $bn !~ /rpm$/;
         move $rpm, $bn;
         print "* Copy $bn\n" unless $opts{quiet};
     });

    +$dir->subdir('SRPMS')->recurse(callback => sub {
    +    my $rpm = shift;
    +    my $bn = $rpm->basename;
    +    return if $bn !~ /rpm$/;
    +    move $rpm, $bn;
    +    print "* Copy $bn\n" unless $opts{quiet};
    +});
    +
    +
     sub _pod2usage {
         require Pod::Usage;
         Pod::Usage::pod2usage(

Now you should be able to build the SRPM and upload it to COPR like so:

.. code-block:: bash

    git build-rpm --spec example.spec --package-name example
    copr-cli build your-project /path/to/srpm.src.rpm

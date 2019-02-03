XDG Base Directory specification
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

There is a lot of controversy regarding the presence of dotfiles in the home
directory. See: `Dotfile madness
<https://old.reddit.com/r/linux/comments/amf9xh/dotfile_madness/>`_ and `I'm
tired of .folders littering my home directory -- want to do something about it.
<https://old.reddit.com/r/linux/comments/971m0z/im_tired_of_folders_littering_my_home_directory/>`_.
Most of the commotion stems from the `XDG Base Directory Specification
<https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html>`_
which details directories that files should be stored in. As a result, users of
the /r/linux subreddit have been using this specification to start a campaign
to get as many applications as possible to change their behavior. However, I
believe this is misguided given this `quote
<https://lists.debian.org/debian-user/2014/11/msg01817.html>`_ by a Debian
developer:

   The "Base Directory Specification" itself is just html page to reference,
   a base for other XDG specifications, that's why it's called "base".
   As its original author said [1]:

   > XDG Base Directory spec is intended for use by other specification.

   > For example the XDG Menu specification and Autostart specification

   > refer to the XDG Base Directory specification instead of reinventing

   > their own filesystem locations / hierarchy.

   It just gives the meaning to directories, used by *other XDG standards*,
   which brought peace and clarity to the mess of desktop environments.

   Those XDG standards were created by "X Desktop Group" only to define
   unified directories for COMMON files of multiple X desktop environments,
   not for some rogue applications to hide their own private files.
   Each of files placed in those directories is extensively documented
   by other XDG standards.

   Later some people started to abuse those directories and put there files,
   that never supposed to be there. Those people don't really think about
   standards or unification. Usually they just enable displaying hidden files
   in their file manager, see a lot of dotfiles in a home directory and think
   that "this is wrong". They start searching how to "fix" this, find xdg
   basedir-spec, and use it as an excuse for moving ~/.appname files, to
   ~/.config/appname, or worse, split them among .config, .local, .cache...
   They don't think about /etc/xdg, they don't read FHS or other XDG standards,
   they don't care about people who have to do 2-4 times more work to find and
   migrate settings of selected application to another machine, they just
   don't want to see dotfiles.

   But don't blame XDG standard for that, blame people abusing it
   to reduce the number of dotfiles in their home directory.

Indeed, section 3.8.2 of the FHS states:

   3.8.2. Requirements

   User specific configuration files for applications are
   stored in the user’s home directory in a file that starts with the ’.’ character
   (a "dot file"). If an application needs to create more than one dot file then
   they should be placed in a subdirectory with a name starting with a ’.’
   character, (a "dot directory"). In this case the configuration files should not
   start with the ’.’ character.

So the moral of the story is applications following the FHS are already
following the standard and the XDG Base Directory specification is being abused
to apply to all applications when it is actually much more narrowly scoped. The
next time you decide to spam issue trackers and post `rude comments
<https://github.com/npm/npm/issues/6675#issuecomment-303289082>`_ like:

   Linux users don't deserve a "more pleasant user experience" ? What the hell?

   You're clearly not a Linux user and you don't give a s***, don't you?

Please think twice.

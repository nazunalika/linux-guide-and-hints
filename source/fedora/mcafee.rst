McAfee
^^^^^^

Depending on the environment you're in, you might need to have McAfee installed on your workstation. We are of the opinion that antivirus for Linux is pointless and ridiculous. We are also of the opinion that the auditors and "security professionals" just want to check a box to say they're compliant. To make them happy, this is how to install McAfee without destroying your host system.

It will still report to the ePO server and everything, and as far as the managers of the application are concerned, it reports just fine, including hardware information.

.. code-block:: bash

    % dnf --nogpg --installroot=/var/lib/machines/lazybox install @core anacron dmidecode --releasever=30 initscripts -y
    % setenforce 0
    % systemd-nspawn -M lazybox
    lazybox% passwd   # Set your root password
                      # Press CTRL + ] three times to exit
    # Copy the agent and antivirus packages to somewhere like /var/lib/machines/lazybox/opt/av
    % setenforce 1
    % systemd-nspawn -M lazybox -b
    # You will see a login prompt, login as root
    lazybox% unzip agentPackages.zip
    lazybox% tar xzf ISecTP-10.6.1-115-Release-standalone.tar.gz
    lazybox% chmod +x *.sh
    lazybox% ./install.sh -i
    lazybox% ./install-isectp.sh
    lazybox% cd /opt/isec/ens/threatprevention/bin
    lazybox% ./isecav --usefanotify
    lazybox% exit
    # Press CTRL + ] three times
    % vi /etc/systemd/system/mcafee.service
    [Unit]
   Description=McAfee Container
   
   [Service]
   Type=notify
   RestartForceExitStatus=133
   SuccessExitStatus=133
   LimitNOFILE=100000
   ExecStart=/usr/bin/systemd-nspawn -M lazybox -b --capability=CAP_IPC_LOCK,CAP_AUDIT_WRITE,CAP_AUDIT_CONTROL,CAP_SYS_MODULE,CAP_SYSLOG,CAP_NET_ADMIN --link-journal=try-guest
   WatchdogSec=3min
   Slice=machine.slice
   Delegate=yes
   TasksMax=16384
   
   # Enforce a strict device policy, similar to the one nspawn configures when it
   # allocates its own scope unit. Make sure to keep these policies in sync if you
   # change them!
   DevicePolicy=closed
   DeviceAllow=/dev/net/tun rwm
   DeviceAllow=char-pts rw
   
   # nspawn itself needs access to /dev/loop-control and /dev/loop, to implement
   # the --image= option. Add these here, too.
   DeviceAllow=/dev/loop-control rw
   DeviceAllow=block-loop rw
   DeviceAllow=block-blkext rw
   
   # nspawn can set up LUKS encrypted loopback files, in which case it needs
   # access to /dev/mapper/control and the block devices /dev/mapper/*.
   DeviceAllow=/dev/mapper/control rw
   DeviceAllow=block-device-mapper rw
   
   KillMode=mixed
   
   [Install]
   WantedBy=multi-user.target
   
   % systemctl daemon-reload
   % systemctl enable mcafee.service --now
   % systemctl status mcafee.service
   ● mcafee.service - McAfee Container
      Loaded: loaded (/etc/systemd/system/mcafee.service; enabled; vendor preset: disabled)
      Active: active (running) since Tue 2019-05-14 09:09:42 MST; 1h 29min ago
    Main PID: 1084 (systemd-nspawn)
      Status: "Container running: Startup finished in 10.280s."
       Tasks: 1 (limit: 16384)
      Memory: 3.3M
      CGroup: /machine.slice/mcafee.service
              └─1084 /usr/bin/systemd-nspawn -M lazybox -b --capability=CAP_IPC_LOCK,CAP_AUDIT_WRITE,CAP_AUDIT_CONTROL,CAP_SYS_MODULE,CAP_SYSLOG,CAP_NET_ADMIN --link-journal=try-guest
   
   May 14 09:09:46 diurne.chotel.com systemd-nspawn[1084]: [  OK  ] Started Network Manager Script Dispatcher Service.
   May 14 09:09:46 diurne.chotel.com systemd-nspawn[1084]: [  OK  ] Started McAfee Endpoint Security Platform for Linux.
   May 14 09:09:46 diurne.chotel.com systemd-nspawn[1084]:          Starting Network Name Resolution...
   May 14 09:09:47 diurne.chotel.com systemd-nspawn[1084]: [  OK  ] Started Network Name Resolution.
   May 14 09:09:47 diurne.chotel.com systemd-nspawn[1084]: [  OK  ] Reached target Host and Network Name Lookups.
   May 14 09:09:47 diurne.chotel.com systemd-nspawn[1084]: [  OK  ] Started Session c2 of user mfe.
   May 14 09:09:51 diurne.chotel.com systemd-nspawn[1084]: [2B blob data]
   May 14 09:09:51 diurne.chotel.com systemd-nspawn[1084]: Fedora 30 (Thirty)
   May 14 09:09:51 diurne.chotel.com systemd-nspawn[1084]: Kernel 5.0.13-300.fc30.x86_64 on an x86_64 (console)
   May 14 09:09:51 diurne.chotel.com systemd-nspawn[1084]: [1B blob data]

   % ps -ef | grep McAfee
   root      1909  1187  0 09:09 ?        00:00:02 /opt/McAfee/agent/bin/masvc self_start
   root      2432  1187  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2434  2432  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2435  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2436  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2437  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2438  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2439  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start
   root      2440  2434  0 09:09 ?        00:00:00 /opt/McAfee/agent/bin/macompatsvc self_start


Optionally, you can modify the nspawn container to run on a private network, which requires additional configuration.

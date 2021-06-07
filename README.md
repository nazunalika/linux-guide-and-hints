# Linux Guide and Hints

The website is live at https://linuxguideandhints.com - We are in the process of making some changes and moving things around.

This website is also available over [Gemini](gemini://tilde.team/~remyabel/linux-guide-and-hints.cgi).

### Contributions

If you would like to contribute or you find an error, please open an issue/PR as necessary.

### Dependencies

    npm install -g grunt-cli
    npm install
    pip3 install -U --user -r requirements.txt

### Building

    make html SPHINXOPTS=-Ea
    grunt build

It's important to run the commands in that order. `make html` will build the docs, then `grunt build` does copying and minifying.

### Livereload

    grunt connect

Add `localhost.ssl` to your `/etc/hosts`, then visit `https://localhost.ssl:8443`. 

You will need a self-signed certificate. Run the convenience script `generate-cert.sh` provided in this repo.

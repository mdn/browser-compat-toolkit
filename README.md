Browser Compat Toolkit 2018
---

[![Build Status](https://travis-ci.org/mdn/browser-compat-toolkit.svg?branch=master)](https://travis-ci.org/mdn/browser-compat-toolkit)

Toolkit for visualizing and editing MDN's browser compatibility data.

This was developed at the
[Paris 2018 Hack on MDN](https://hacks.mozilla.org/2018/03/hack-on-mdn-building-useful-tools-with-browser-compatibility-data/).
It is an interesting proof-of-concept, but there was not a clear path to using
it for rendering compatibility tables on
[MDN Web Docs](https://developer.mozilla.org), or to help contributors to
the
[browser-compat-data (BCD) project](https://github.com/mdn/browser-compat-data).
Without MDN staff sponsorship, this repository has not kept up with BCD
development. Feel free to use these ideas for your own BCD integration.

Some goals of the proof of concept:

* Render MDN's compat tables from code in this repo.
* Allow GitHub reviewers to see tables.
* Allow contributors to view and edit compat data.

# Mobile click behavior

> Status: proposed

> Date: 09.05.2022

## Context

Currently, a short click will switch the app in fullscreen mode. A long click (with a release of the click) will run an identify (like a click on desktop)

The issue is that there is no location popup possibilities with that (or at least it's unwanted if it pops up after a long click). We need to rework that.

# Decision

Switch the short click to the identify (as on desktop). A long click should show the location popup, and if possible a long touch should be detected without the user needing to raise his finger (no release detection). The threshold is 500ms.

To replace the fullscreen toggle, I would propose we add a new button in the interface (maybe by the zoom/geolocation?) with the "expand" icon from font-awesome.

This button should (for now) be hidden on desktop (and the app should subsequently exit fullscreen mode if the size of the windows is set to a desktop size).

In fullscreen mode, a new button should be available (with the "compress" font-awesome icon) that enables the user to go back to the non-fullscreen mode (that should be the only thing visible on screen when in fullscreen)

## Consequences

This would allow mobile users to use all the features we provide (identify, location) while keeping the fullscreen possibility.

## Links

* [JIRA ticket this ADR is based on](https://jira.swisstopo.ch/browse/BGDIINF_SB-2235)
* [JIRA ticket where this became a problem](https://jira.swisstopo.ch/browse/BGDIINF_SB-2323)

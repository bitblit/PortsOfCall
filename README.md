# @bitblit/PortsOfCall

Detector and wrapper for serial port devices

## Introduction

A computer may have multiple devices attached to it through serial ports, but we may not know which devices there
are, and wo which ports they are connected.  Moreover, which port they are on can change over time.  PortsOfCall
combines an architecture for searching the various attached ports, trying to detect what device is attached to
them, with wrappers that can then be attached to the port and used as abstractions for the device itself.  While
I mean for it to have a plugin architecture, the main devices I mean to support out of the box are GPS units
and OBD-II devices for cars.

## Installation
`npm install @bitblit/ports-of-call`

## Usage

TBD

## Dependencies

This library depends on the following libraries:

* Serialport - I really hope its obvious why I depend on this
* GPS - For processing data coming in from the gps device
* Ratchet - I depend on my own Ratchet library for various utility functions
* Winston - because I always need logging
* Moment - because I always need better date handling than what comes with Javascript
* Moment-Timezone - because I always need timezone specific handling of date
* RXJS - I use observable timers for periodic reconnection, as well as for wrapping some things in observables

# Testing
Ha!  No, seriously - I am actually improving on this in Node, slowly (2018-03-23)

To run the tests that ARE in here,

`npm test`

# Release Notes
The 0.x.x branches are built on Node 8.11.1.  
The 0.1.x branches are built on Node 8.12.0.
The 0.2.x branches are built on Node 10.x


# Deployment

I'll write notes-to-self here on how my deployment from [CircleCI](https://circleci.com) is actually going to work.

Following the notes from [here](https://docs.npmjs.com/getting-started/publishing-npm-packages).  Important points:

* Everything in the package that isn't in .gitignore or .npmignore gets uploaded.  Review before post

For circleci using [these notes](https://circleci.com/docs/1.0/npm-continuous-deployment/)

Looks like its my standard - set a release tag and push to Github, CircleCI takes care of the rest:

```
    git commit -m "New stuff"
    git tag -a release-0.0.5 -m "Because I like it a lot"
    git push origin master --tags

```

Also following notes from [here](https://ljn.io/posts/publishing-typescript-projects-with-npm/) on converting the
typescript into usable javascript+mapping stuff.



# Contributing

Pull requests are welcome, although I'm not sure why you'd be interested!

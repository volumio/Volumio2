# Volumio 2 WebUI

[![Join the chat at https://gitter.im/volumio/Volumio2](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/volumio/Volumio2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Latest Volumio 2 Image file

[Alpha1](http://volumio.org/wp-content/uploads/Volumio2/Volumioalpha1-2015-02-04PI.img.zip)

System Image is built with [Volumio Builder](https://github.com/volumio/Build)

## Preliminary Setup

Clone the repo

```shell
git clone https://github.com/volumio/Volumio2.git volumio
```

Now install [libgroove](https://github.com/andrewrk/libgroove).  
All other dependecies are in the package JSON, from the working directory just run

```shell
cd volumio
npm install
```

You can run all the servers in one single step just running with nodejs

```shell
nodejs bin/www
```

## System Architecture

![volumiosystemarchitecture](http://lightflo.ws/images/VolumioArchitecture3.png)


## Development tasks and milestones

### Operating System

- [ ] Custom Debian Based Operating System
 - [X] Minimal Jessie Based BSP
 - [X] SystemD migration
 - [ ] Volumio APT repo

- [ ] Custom Compiled Core Packages
 - [X] MPD
 - [ ] SPOP
 - [ ] Upmpdcli
 - [X] NodeJS


### Node Backend

- [ ] Volumio Core
 - [X] MPD Emulation Interface
 - [ ] Command Router
 - [ ] WebUI Endpoints
 - [ ] Mixer Controls
 
- [ ] Audio services Controllers
 - [ ] MPD Service and Library
 - [ ] SPOP Service and Library
 - [ ] Shairport Service and Library
 - [ ] UPNP Service and Library
 - [ ] \(groove?\) Service and Library
 - [ ] Pulse Service and Library

- [ ] System manager worker
 - [ ] Networking
 - [ ] CIFS\SAMBA
 - [ ] I2S Driver
 - [ ] Hardware Layer
 - [ ] USB Drives
 
### Frontend

- [ ] Volumio 2 WebUI (Playback)
 - [ ] Boostrap Based Structure
 - [ ] Playback Handling
 - [ ] Library retrieval
 - [ ] SPOP Hooks
 - [ ] Airplay Hooks

- [ ] Volumio 2 WebUI (Configuration)
 - [ ] Playback Option Configuration
 - [ ] Network Option Configuration
 - [ ] Plug-in System Configuration
 - [ ] System Configuration


* ToDos, Tasks and Bugs [here](https://github.com/volumio/WebUI-NODE#boards) (you need to associate your github account with [ZenHub])(https://www.zenhub.io/)
* [Forum Threads](http://volumio.org/forum/discussion-t2098-10.html) for internal discussion, remember to subscribe topics
* [Wiki](https://github.com/volumio/WebUI-NODE/wiki) (Internal, Will be made public once released)


### Tools

* Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)

## Development Guidelines

* This is intended to run on Low Power Devices (r-pi). Let's keep code efficient and lightweight
* To allow code mantainability, always comment your code properly and update DOCs if needed
* Adhere to [MVC Best Practices](http://www.yiiframework.com/doc/guide/1.1/en/basics.best-practices) to maximize project quality
* Have fun and enjoy what you're doing!

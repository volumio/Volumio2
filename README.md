[![Join the chat at https://gitter.im/volumio/Volumio2](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/volumio/Volumio2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![dependencies](https://david-dm.org/volumio/Volumio2.svg)](https://david-dm.org/volumio/Volumio2)
[![bitHound Dependencies](https://www.bithound.io/github/volumio/Volumio2/badges/dependencies.svg)](https://www.bithound.io/github/volumio/Volumio2/master/dependencies/npm)
[![bitHound Score](https://www.bithound.io/github/volumio/Volumio2/badges/score.svg)](https://www.bithound.io/github/volumio/Volumio2)

# Volumio 2

## Volumio 2 System Images

LATEST
* [Alpha5 (2016-17-01)](http://updates.volumio.org/pi/volumio/0.814/Volumio0.814-2016-01-17PI.img.zip)

PREVIOUS VERSIONS
* [Alpha4 (2016-15-01)](http://updates.volumio.org/pi/volumio/0.809/Volumio0.809-2016-01-15PI.img.zip)
* [Alpha3 (2015-26-11)](http://updates.volumio.org/pi/volumio/0.957/Volumio0.957-2015-11-26PI.img.zip)
* [Alpha2 (2015-31-05)](https://volumio.org/wp-content/uploads/Volumio2/VolumioAlpha2-2015-05-31PI.img.zip)
* [Alpha1 (2015-02-04)](http://volumio.org/wp-content/uploads/Volumio2/Volumioalpha1-2015-02-04PI.img.zip)



## Volumio 2 Virtual Machines 

Useful for fast developing, no need for a Raspberry Pi (also much faster)

VMWARE Image is suggested, as Network configuration is tricky with Virtual Box 

* [VMWare Virtual Machine - Beta1](http://repo.volumio.org/Volumio2/DevTools/VolumioVM-VMWare.zip)
* [Virtual Box Virtual Machine - Alpha5](http://repo.volumio.org/Volumio2/DevTools/VolumioVM-VirtualBox.zip)



System Images built with [Volumio Builder](https://github.com/volumio/Build)

## Preliminary Setup

IMPORTANT NOTE:
Volumio is designed to be an highly integrated system. This means that the WebUi is optimized to work along with the custom made Volumio system, and therefore it needs to run in a very tightly controlled environment. IT WON'T WORK on standard Raspbian or other non-volumio OSes. If you want to know what kind of customizations we're using, take a look at the [Volumio Builder](https://github.com/volumio/Build)

Volumio works with 12.x version of NodeJS, we're using 0.12.6. Reports of working\not working node version are appreciated!

Clone the repo in the directory of your choice (default: /volumio)

```shell
git clone https://github.com/volumio/Volumio2.git volumio
cd volumio
```

Make sure /volumio folder is owned volumio user 

```shell
sudo chown -R volumio:volumio /volumio
```

And that /data folder exists and is owned by volumio user

```shell
sudo mkdir /data
sudo chown -R volumio:volumio /data
```

On Debian, you need to install

```shell
sudo apt-get install libavahi-compat-libdnssd-dev
```
For other systems, see [node_mdns installation](https://github.com/agnat/node_mdns#installation).

All other dependecies are in the package JSON, from the working directory just run (as user volumio)

```shell
npm install
```

You can run all the servers in one single step just running with nodejs

```shell
node index.js
```

Finally, point your browser to http://(ip address):3000 to access the UI.

A DEV Console is available at http://(ip address):3000/dev

To make development more comfortable, a samba server is installed. This way the /volumio folder is accessible (and editable) via Network. Just mount it on your dev workstation and it will be available as local filesystem.
Testing on PI is strongly suggested.

Please take a look at the [Developer Info and Guidelines](https://github.com/volumio/Volumio2/wiki/Setting-Up-a-Dev-Environment)

## Development tasks and milestones

### Current Tasks

- [X] Templating System

    The idea is to allow the installation of different templates and skins. To allow that a template system needs to be created: as general guidelines we'll provide a set of Java functions to hook with the WebSockets connection. The different templates then will be a folder containing just css js and html.

- [X] Plugin System

    Every service (input, output, visualization etc) will be treated as a standalone entity. This will allow to add external plugins in the future. The plugins will be composed of a folder, with all the methods, and a "manifest file" which is an executable that sends via nodes js its name, its available methods and other informations. At system startup every manifest in the manifest folder is executed, so the system receives with WS all the available plugins and their capabilities and methods.  Then the core knows what is availbable and how to call them. 

- [X] Music Database System

    Music stored on USB Drives, Device memory or NAS will be handled by MPD, and therefore they'll be stored in its DB. Other services which requires a DB can have their levelDB database in place. For online services, that are meant to be browsed "live" this doesn't apply.

### Operating System

- [X] Custom Debian Based Operating System
 - [X] Minimal Jessie Based BSP
 - [X] SystemD migration
 - [X] Remote Scripted Build system with Recipes
 - [X] X86 Support
 - [X] Volumio APT repo

- [X] Custom Compiled Core Packages
 - [X] MPD
 - [X] SPOP
 - [X] Upmpdcli
 - [X] Shairport Sync
 - [X] NodeJS

### Node Backend

- [X] Volumio Core
 - [X] Command Router
 - [X] WebUI Endpoints
 - [X] Mixer Controls
 - [X] Volume Controls
 
- [ ] Communication Interfaces 
 - [X] Socket.io Controller
 - [ ] API Controller 
 - [X] MPD Emulation Interface

- [ ] Audio services Controllers
 - [X] MPD Service and Library
 - [X] SPOP Service and Library
 - [X] Shairport Service and Library
 - [X] UPNP Service and Library
 - [ ] \(groove?\) Service and Library

- [ ] System manager worker
 - [X] Networking
 - [X] CIFS\SAMBA
 - [ ] I2S Driver
 - [X] Hardware Layer
 - [X] USB Drives
 - [X] Volumio Service Discovery 
 - 
### Frontend

- [ ] Volumio 2 WebUI (Playback)
 - [X] Boostrap Based Structure
 - [X] Playback Handling
 - [X] Library retrieval
 - [X] Library Sorting 
 - [X] Airplay Hooks

- [ ] Volumio 2 WebUI (Configuration)
 - [X] Playback Option Configuration
 - [X] Network Option Configuration
 - [X] Plug-in System Configuration
 - [X] System Configuration

## Development Guidelines

* [Forum Threads](http://volumio.org/forum/discussion-t2098-10.html) for internal discussion, remember to subscribe topics.
* Document your work where possible on the [Wiki](https://github.com/volumio/Volumio2/wiki).
* This is intended to run on Low Power Devices (r-pi). Let's keep code efficient and lightweight.
* To allow code mantainability, always comment your code properly and update DOCs if needed.
* Adhere to [MVC Best Practices](http://www.yiiframework.com/doc/guide/1.1/en/basics.best-practices) to maximize project quality.
* Have fun and enjoy what you're doing!

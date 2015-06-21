[![Join the chat at https://gitter.im/volumio/Volumio2](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/volumio/Volumio2?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Volumio 2

## Volumio 2 System Images

LATEST
* [Alpha2 (2015-31-05)](https://volumio.org/wp-content/uploads/Volumio2/VolumioAlpha2-2015-05-31PI.img.zip)

PREVIOUS VERSIONS
* [Alpha1 (2015-02-04)](http://volumio.org/wp-content/uploads/Volumio2/Volumioalpha1-2015-02-04PI.img.zip)

System Images built with [Volumio Builder](https://github.com/volumio/Build)

## Preliminary Setup

Clone the repo in the directory of your choice

```shell
git clone https://github.com/volumio/Volumio2.git volumio/
```

All other dependecies are in the package JSON, from the working directory just run

```shell
cd volumio/
npm install
```

You can run all the servers in one single step just running with nodejs

```shell
node index.js
```

Finally, point your browser to http://(ip address):3000 to access the test UI.

To make development more confortable, a samba server is installed. This way the /volumio folder is accessible (and editable) via Network. Just mount it on your dev workstation and it will be available as local filesystem.
Testing on PI is strongly suggested.

Please take a look at the [Developer Info and Guidelines](https://github.com/volumio/Volumio2/wiki/Setting-Up-a-Dev-Environment)

## Development tasks and milestones

### Current Tasks

- [ ] Templating System

    The idea is to allow the installation of different templates and skins. To allow that a template system needs to be created: as general guidelines we'll provide a set of Java functions to hook with the WebSockets connection. The different templates then will be a folder containing just css js and html.

- [ ] Plugin System

    Every service (input, output, visualization etc) will be treated as a standalone entity. This will allow to add external plugins in the future. The plugins will be composed of a folder, with all the methods, and a "manifest file" which is an executable that sends via nodes js its name, its available methods and other informations. At system startup every manifest in the manifest folder is executed, so the system receives with WS all the available plugins and their capabilities and methods.  Then the core knows what is availbable and how to call them. 

- [ ] Music Database System

    Every music service available will feature its own LevelDB database, storing its pertaining music file. The Volumio core then needs to query those databases to retrieve available music, so it can route the appropriate request to the right service for a certain song. 

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
 - [X] Command Router
 - [X] WebUI Endpoints
 - [ ] Mixer Controls
 
- [ ] Audio services Controllers
 - [X] MPD Service and Library
 - [X] SPOP Service and Library
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
 - [X] Playback Handling
 - [X] Library retrieval
 - [ ] Airplay Hooks

- [ ] Volumio 2 WebUI (Configuration)
 - [ ] Playback Option Configuration
 - [ ] Network Option Configuration
 - [ ] Plug-in System Configuration
 - [ ] System Configuration

## Development Guidelines

* [Forum Threads](http://volumio.org/forum/discussion-t2098-10.html) for internal discussion, remember to subscribe topics.
* Document your work where possible on the [Wiki](https://github.com/volumio/Volumio2/wiki).
* This is intended to run on Low Power Devices (r-pi). Let's keep code efficient and lightweight.
* To allow code mantainability, always comment your code properly and update DOCs if needed.
* Adhere to [MVC Best Practices](http://www.yiiframework.com/doc/guide/1.1/en/basics.best-practices) to maximize project quality.
* Have fun and enjoy what you're doing!

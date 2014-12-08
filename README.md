

# WebUI-NODE



## Preliminary Setup

First thing is to get node:

       sudo apt-get install curl
       sudo curl -sL https://deb.nodesource.com/setup | bash -
       sudo apt-get install -y nodejs

Clone the repo

       git clone https://github.com/volumio/WebUI-NODE.git 

All dependecies are in the package JSON, from the working directory just run

       cd WebUI-NODE
       npm install

You can run all the servers in one single step just running with nodejs
        nodejs bin/www 

## Developing

* ToDos, Tasks and Bugs [here](https://github.com/volumio/WebUI-NODE#boards) (you need to associate your github account with [ZenHub])(https://www.zenhub.io/) 
* [Forum Threads](http://volumio.org/forum/discussion-t2098-10.html) for internal discussion, remember to subscribe topics 
* [Wiki](http://volumio.org/forum/discussion-t2098-10.html) (Internal, Will be made public once released)


### Tools

* Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)

## Development Guidelines

* This is intended to run on Low Power Devices (r-pi). Let's keep code efficient and lightweight
* To allow code mantainability, always comment your code properly and update DOCs if needed 
* Adhere to [MVC Best Practices](http://www.yiiframework.com/doc/guide/1.1/en/basics.best-practices) to maximize project quality
* Have fun and enjoy what you're doing!


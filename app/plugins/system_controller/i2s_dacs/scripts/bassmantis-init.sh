#!/bin/sh

### AWINIC AMPLIFIERS I2C ADDRESS
AW_LEFT=0x34
AW_RIGHT=0x35


echo "INIT BASSMANTIS-uHAT"
# soft Reset
sudo i2cset -y 1 $AW_LEFT 0x00 0xAA55 w
sudo i2cset -y 1 $AW_RIGHT 0x00 0xAA55 w
# PWDN=0/I2SEN=1
sudo i2cset -y 1 $AW_LEFT 0x04 0x4400 w
sudo i2cset -y 1 $AW_RIGHT 0x04 0x4400 w
# INPLEV=1/44.1kHz/64FS/Left
sudo i2cset -y 1 $AW_LEFT 0x05 0xE724 w
# INPLEV=1/44.1kHz/64FS/Right
sudo i2cset -y 1 $AW_RIGHT 0x05 0xE728 w

sudo i2cset -y 1 $AW_LEFT 0x09 0x4A42 w
sudo i2cset -y 1 $AW_RIGHT 0x09 0x4A42 w
sudo i2cset -y 1 $AW_LEFT 0x0A 0xC203 w
sudo i2cset -y 1 $AW_RIGHT 0x0A 0xC203 w
sudo i2cset -y 1 $AW_LEFT 0x0B 0xC203 w
sudo i2cset -y 1 $AW_RIGHT 0x0B 0xC203 w
sudo i2cset -y 1 $AW_LEFT 0x0C 0x0770 w
sudo i2cset -y 1 $AW_RIGHT 0x0C 0x0770 w

# HAGCE=0
sudo i2cset -y 1 $AW_LEFT 0x0D 0x1B00 w
sudo i2cset -y 1 $AW_RIGHT 0x0D 0x1B00 w

sudo i2cset -y 1 $AW_LEFT 0x0E 0x2903 w
sudo i2cset -y 1 $AW_RIGHT 0x0E 0x2903 w
sudo i2cset -y 1 $AW_LEFT 0x20 0x0100 w
sudo i2cset -y 1 $AW_RIGHT 0x20 0x0100 w

# BSTEN=1 | BSTLIMIT=0 (2.75A) | BSTVOUT=4 (7.5V)
sudo i2cset -y 1 $AW_LEFT 0x60 0x841C w
sudo i2cset -y 1 $AW_RIGHT 0x60 0x841C w

sudo i2cset -y 1 $AW_LEFT 0x61 0x0E0F w
sudo i2cset -y 1 $AW_RIGHT 0x61 0x0E0F w

# BST_MODE=1 (Force Boost)
sudo i2cset -y 1 $AW_LEFT 0x62 0x8EF5 w
sudo i2cset -y 1 $AW_RIGHT 0x62 0x8EF5 w

sudo i2cset -y 1 $AW_LEFT 0x63 0x7F30 w
sudo i2cset -y 1 $AW_RIGHT 0x63 0x7F30 w

sudo i2cset -y 1 $AW_LEFT 0x67 0x7C00 w
sudo i2cset -y 1 $AW_RIGHT 0x67 0x7C00 w

sudo i2cset -y 1 $AW_LEFT 0x69 0x4102 w
sudo i2cset -y 1 $AW_RIGHT 0x69 0x4102 w

# HMUTE=0
sudo i2cset -y 1 $AW_LEFT 0x08 0x0E20 w
sudo i2cset -y 1 $AW_RIGHT 0x08 0x0E20 w

echo "BASSMANTIS-uHAT INIT DONE!"

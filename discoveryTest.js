/**
 * Created by massi on 07/08/15.
 */

var mdns=require('mdns');
var txt_record={
    volumioName:"cameretta",
    UUID:"sodosidosjdksndksndkls"
}
var ad = mdns.createAdvertisement(mdns.tcp('volumio'), 3000,{txtRecord: txt_record});
ad.start();

/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



 /*
 Device Side Program
 ***********************
 Device-side programming consists of three parts:
    1) Connecting to the IoT service (MQTT broker)
    2) Publishing events to applications
    3) Subscribing commands from applications
*********************
*/


var flagShowStatusInfoLogs = false;

// Use sctrict mode
'use strict';

//------------------------------------------------------------------------------
// Change variable values in this section to customize emitted data
//------------------------------------------------------------------------------




// read the id of the IoT foundation org out of a local .env file
// format of .env file:
// iotf_org=<id of IoT Foundation organization>
require('dotenv').load();

// Note that the following configuration must match with the parameters that
// the device was registered with. This device registration can
// either be done in the dashboard of the IoT Foundation service or via its
// API

var iotfConfig = {
    "org" : process.env.iotf_org,
    "id" : process.env.iotf_id,
    "auth-token" : process.env.iotf_authtoken,
    "type" : process.env.iotf_type,
    "auth-method" : "token"
};

// Quality of Serive for the publish event. Supported values : 0, 1, 2
var QosLevel = 0;

//------------------------------------------------------------------------------
// Setup all the required node modules we'll need
//------------------------------------------------------------------------------

// ** Setup all the required node modules we'll need **
var express = require('express'); //express framework
var app = express(); //Init the app as an express application
var cfenv = require('cfenv'); //helps to access the CloudFoundry environment:
var appEnv = cfenv.getAppEnv(); //get the application env from CloudFoundry

console.log('');
console.log('--- DEBUG appENV: ---');
console.log(appEnv);
console.log('');


//The ibmiotf package simplifies intractions with the IoT Foundation Service
var Iotf = require("ibmiotf");

/**** Start the express server ****/
 var port = appEnv.port+2;

 app.listen(port, function() {
     console.log("Server started on http://" + appEnv.bind + ":" + port);
  }).on('error', function(err) {
    if (err.errno === 'EADDRINUSE') {
        console.log('Server not started, port ' + appEnv.url + ' is busy')
    } else {
        console.log(err);
    }
});
/****/

/* ******* (1) Connecting to the IoT service (MQTT broker) */
/* ******************************************************* */

console.log('');
console.log('--- DEBUG iotConfig: ---');
console.log(iotfConfig);
console.log('');

// Create a client (used to send data)
var iotfClient = new Iotf.IotfDevice(iotfConfig);

// Connect to the initialized iotf service
iotfClient.connect();

// Handle errors coming from the iotf service
iotfClient.on("error", function (err) {
    // console.log("Error received while connecting to IoTF service: " + err.message);
    if (err.message.indexOf('authorized') > -1) {
        console.log('');
        console.log("Make sure the device is registered in the IotF org with the following configuration:")
        console.log(iotfConfig);
        console.log('');
    }
    process.exit( );
});


// Handle commands coming from the iotf service (this is the equivalent of SUBSCRIBE TO A COMMAND)
iotfClient.on("command", function (commandName,format,payload,topic) {
    if(commandName === "blink") {
        console.log(">>>>Command *" + commandName +  "* received<<<<");
        //function to be performed for this command
        //blink(payload);
    }
    else if(commandName === "showtwittext") {
        console.log(">>>>Command *" + commandName +  "* received<<<<");
        var twitterObject = JSON.parse(payload);
        console.log("Text Twitter: " + twitterObject.tweettext);
    } else {
        console.log("Command not supported.. " + commandName);
    }
        console.log("------------------");
        console.log("Command Name: " +  commandName );
        console.log("payload: " +  payload );
        console.log("topic: " +  topic );
        console.log("-------------------");

});


function generateAndPublishSensorsData(interval) {
  /* Here you can retrieve data from the Sensor and put them in a dataPacket*/

  var dataPacket = {
      "d" : {
          "temperature" : 0,
          "pressure" : 50,
          "humidity" : 10,
          "luminosity" : 5
      }
  };

      //--loop forever - send status of sensor and pins------------------------------------------------------------
      setInterval(function(){ //generate different dataPacket to publish

          // add a time stamp to the data packet
          var date = new Date();
          dataPacket.ts = date.toISOString();

          // convert the data packet into a string and then publish it
          iotfClient.publish("status","json", JSON.stringify(dataPacket) );
          // log out the emitted dataPacket
          if (flagShowStatusInfoLogs == true) {
            console.log(JSON.stringify(dataPacket));
          }

              var temperatureIncrement = 20;
              var humidityIncrement = 2;
              var pressureIncrement = 2;
            //var luminosityIncrement = 1;

          if (dataPacket.d.temperature === 100) {
              dataPacket.d.temperature = 0;
          }
          dataPacket.d.temperature = dataPacket.d.temperature + temperatureIncrement;

          if (dataPacket.d.humidity === 100) {
              dataPacket.d.humidity = 0;
          }
          dataPacket.d.humidity = dataPacket.d.humidity + humidityIncrement;

          if (dataPacket.d.pressure === 100) {
              dataPacket.d.pressure = 0;
          }
          dataPacket.d.pressure = dataPacket.d.pressure + pressureIncrement;

      }, interval);

}

iotfClient.on("connect", function () {
    console.log("DeviceSide Program is connected to the IoT Foundation service");
    console.log("QoS level set to: " + QosLevel);

/* ******* (2) Publishing events to applications */
/* ********************************************* */

    // inital data packet to be emitted as a JSON object
    /* Here you can retrieve data from the Sensor and put them in a dataPacket*/

    //generate sensors data and publish them each 'interval' ms
    //see generateAndPublishSensorsData(interval) function
    generateAndPublishSensorsData(3000);

    //prepare the info board packet to send
    var infoBoardPacket = {
        "d" : {
            "pinsboard" : 42,
            "voltageboard" : 5,
        }
    };

    iotfClient.publish("infoboard","json", JSON.stringify(infoBoardPacket) );

});

// Copyright 2019 Google LLC. All rights reserved.
// Use of this source code is governed by the Apache 2.0
// license that can be found in the LICENSE file.

// [START run-decompress_setup]
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const unzipper = require("unzipper");

const {
  Storage
} = require('@google-cloud/storage');
const storage = new Storage();

const app = express();
app.use(bodyParser.json());
// [END run-decompress_setup]

// [START run-decompress_handler]
app.post('/', (req, res) => {

  if (!req.body) {
    var msg = 'no Pub/Sub message received';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }
  if (!req.body.message) {
    var msg = 'invalid Pub/Sub message format';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
  }

  var dataUtf8encoded = Buffer.from(req.body.message.data, 'base64')
    .toString('utf8');

  var pubSubMessage;
  try {
    pubSubMessage = JSON.parse(dataUtf8encoded);
  } catch (ex) {
    console.error('Bad request');
    return res.sendStatus(400);
  }

  // Check if the file uploaded is a zip, if not then skip.
  if (path.extname(pubSubMessage.name) != '.zip') {
    console.log("File '" + pubSubMessage.name + "' is not a zip file. Skipping.");
    return res.sendStatus(200);
  }

  // TODO: Check pubSubMessage.size and compare to RAM and see if it will run out of space.

  console.log("Processing file: " + pubSubMessage.name);

  var gcsBucket = storage.bucket(pubSubMessage.bucket);
  var gcsDestinationBucket = storage.bucket(process.env.DestinationBucket)
  var gcsObject = gcsBucket.file(pubSubMessage.name);

  gcsObject.createReadStream()
    .pipe(unzipper.Parse())
    .on("entry", function (entry) {
      var filePath = entry.path;
      var type = entry.type;
      var size = entry.size;
      console.log(`Found ${type}: ${filePath}`);
      var gcsDestinationObject = gcsDestinationBucket.file(`${pubSubMessage.name}/${filePath}`);
      entry
        .pipe(gcsDestinationObject.createWriteStream())
        .on('error', function (err) {
          console.log(`File Error: ${err}`);
        })
        .on('finish', function () {
          console.log("File Extracted");
        });
    });

  res.status(204).send();
});
// [END run-decompress_handler]

module.exports = app;
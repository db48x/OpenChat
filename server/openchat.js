"use strict";
process.title = 'MapBoard';
 
// Port where we'll run the websocket server
var webSocketsServerPort = 1337;
 
// websocket and http servers
var webSocketServer = require('websocket').server;
var http = require('http');
var BinaryServer = require('binaryjs').BinaryServer;

// mongodb stuff
var databaseUrl = "mydb"; // "username:password@example.com/mydb"
var collections = ["users", "chathistory"];
var mongojs = require('mongojs');
var ObjectId = mongojs.ObjectId;
var db = mongojs.connect(databaseUrl, collections);
 
 
// ------------------------------------------------------------------------------------------
var webSocketsServerPortImg = 1338;

var fs = require('fs');
var express = require('express');
var AWS = require('aws-sdk');
var im   = require('imagemagick');
var async = require('async');

var app = express();
var imagesFilePath = 'images/';
app.use(express.static(__dirname + imagesFilePath));
var imageServer = http.createServer(app);

// start ImageMagick class
function ImageMagick() {
    this.getExifInfo = function (fileName, callbackLatLng) {
        var latlng = {};
        // readMetaData does more work than we currently require,
        // parsing every property in the image rather than just the
        // ones we need.
        im.readMetadata(fileName,
                        function (err, metadata) {
                            if (!err) {
                                var latDMS = ConvertDMSToDD(metadata.exif.GPSLatitude,
                                                            metadata.exif.GPSLatitudeRef);
                                console.log(latDMS);
                                var lngDMS = ConvertDMSToDD(metadata.exif.GPSLongitude,
                                                            metadata.exif.GPSLongitudeRef);
                                console.log(lngDMS);  
                                callbackLatLng({ lat : latDMS, lng : lngDMS });
                            }
                            return callbackLatLng(err);
                        });
    };

	this.resizeAndSave = function (fileName, newFilename, maxWidth, callback) {
		console.log('resizeAndSave: ' + fileName);
		im.resize({
			srcData: fs.readFileSync(fileName, 'binary'),
			width:   maxWidth
			}, function(err, stdout){
				if (err) {console.log('error: ' + err); }
				fs.writeFileSync(newFilename, stdout, 'binary');
				console.log('resized jpg');
				callback(newFilename);
		});
	};
	
	function getDMS(metadata) {
		// massage the data:  '98/1, 24/1, 464099/10000'
		var data = metadata.trimRight().split(',');
		var outVal = '';
		for (var i = 0; i < data.length; i++) {
		    var item = data[i].split('/');
		    var numVal = item[0] / item[1];
		    outVal += numVal;
		    if( i != data.length - 1) {
		        outVal += ',';
		    }
		}
		return outVal;
	}
    function ConvertDMSToDD(DMS, dir) {
		var dms = DMS.split(',');
        var dd = parseFloat(dms[0]) + parseFloat(dms[1] / 60)  + parseFloat(dms[2] / (60 * 60));
        if (dir == 'S' || dir == 'W') {
            dd = dd * -1;
        } // Don't do anything for N or E
        return dd;
    }
}
// end ImageMagick class


// start S3Helper class
function S3Helper() {
	// constructor
	// load the S3 credentials
	AWS.config.loadFromPath('awsCredentials.json');
	AWS.config.update({region: 'us-east-1'});
	var s3 = new AWS.S3();
	var bucket = 'zeitgeistmedia';	// default bucket
	this.getFile = function (fileKey, toFilePath, callback) {
		var data = {Bucket: bucket, Key: fileKey};
		s3.client.getObject(data, function(err, data) {
			if (err) {
				console.log('Error downloading data: ', err);
			} else {
				console.log('Successfully downloaded data file: ' + fileKey);
						
				// now save the data
				var buff = new Buffer(data.Body, 'binary');
				var fd = fs.openSync(toFilePath + fileKey, 'w');
				fs.writeSync(fd, buff, 0, buff.length,0);

				console.log('Wrote file to location: ' + toFilePath + fileKey);
				
				callback();
			}
		});
	};
	this.pushFile = function (fromFilePath, fileKey, callback) {
		// Read in the file, convert it to base64, store to S3
		var fileName = fromFilePath + fileKey;
		fs.readFile(fileName, function (err, imgData) {
			if (err) {
				console.log('Error reading file: ' + fileName);
			} else {
				var data = {Bucket: bucket, Key: fileKey, Body: imgData};
				s3.client.putObject(data, function(err, resp) {
					if (err) {
						console.log('Error uploading data: ', err);
					} else {
						console.log('Uploaded file to s3: ' + fileKey);
						var url = 'https://s3.amazonaws.com/zeitgeistmedia/' + fileKey;
						callback(fileKey, url);
						
					}
				});
			}
		});
	};
}
// end S3Helper class
var s3Helper = new S3Helper();
var imgMgk = new ImageMagick();
var imagesFilePath = 'images/';

// Start Binary.js class
function binServer() 
{
	var _this = this;
	var bs = new BinaryServer({server: imageServer, path: '/binary-endpoint'});
	this.cbConnection = {};
	
	// Wait for new user connections
	bs.on('connection', function(client){
		// Incoming stream from browsers
		client.on('stream', function(stream, meta){
			var fileKey = meta.name;
			var file = fs.createWriteStream(imagesFilePath + meta.name);
			stream.pipe(file);
			// Send progress back
			stream.on('data', function(data){
				stream.write({cmd: 'progress', data: {rx: data.length / meta.size}});
			});
			stream.on('end', function(){
				console.log('file upload complete. Size: ' + meta.size);
				// now push the file to S3
				s3Helper.pushFile(imagesFilePath, fileKey, function(fileKey, url) {
					console.log('Successfully uploaded image: ' + url);
					stream.write({cmd: 'uploadComplete', data: {url: url}});					
				});
			});
		});
		client.on('message', function(message){
			console.log((new Date()) + ' new message received: ' + message);
		});
	});
};
binServer.prototype.callBackForNotifications = function(conn)
{
	this.cbConnection = conn;
	console.log('callBackForNotifications called');
};

var bs = new binServer();



imageServer.listen(webSocketsServerPortImg);
console.log('HTTP and BinaryJS server started on port ' + webSocketsServerPortImg);

// ---------------------------------------------------------------------------------------------------

/**
 * HTTP server
 */
var server = http.createServer(function(request, response) {
    // Not important for us. We're writing WebSocket server, not HTTP server
});


server.listen(webSocketsServerPort, function() {
    console.log((new Date()) + ' Server is listening on port ' + webSocketsServerPort);
});

// latest 100 messages
var chathistory = [];
var loggedOn = false;

// collection class for active users
function Collection(initial) {
    this.count = 0;
    this.collection = Object.create(null);    
    Object.keys(initial).forEach(function (k) { this.collection[k] = initial[k]; });
        
    this.has = function (prop) {
        return Object.hasOwnProperty.call(this.collection, prop);
    };
    this.add = function (key, item) {
        this.collection[key] = item;
        return ++this.count;
    };
    this.remove = function (key) {
        if (!this.has(key)) 
            return undefined;
        delete this.collection[key];
        return --this.count;
    };
    this.item = function (key) {
        return this.collection[key];
    };
    this.forEach = function (callback) {
        if (!callback || typeof callback != 'function')
            return;
        this.keys()
            .forEach(function (k) {
                         callback(k, this.item(k));
                     });
    };
    this.keys = function () {
        return Object.keys(this.collection);
    };
};

//var clients = [];
var connections = new Collection();

 
/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
    // WebSocket server is tied to a HTTP server. WebSocket request is just
    // an enhanced HTTP request. For more info http://tools.ietf.org/html/rfc6455#page-6
    httpServer: server
});



// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {
	var _this = this;
	
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

    // TODO check 'request.origin' to make sure that
    // client is connecting from your website
    // (http://en.wikipedia.org/wiki/Same_origin_policy)
    var connection = request.accept(null, request.origin);
    // we need to know client index to remove them on 'close' event
    
    // create a connectionId and store it in the connections collection
    var connectionId = db.ObjectId();
    console.log((new Date()) + 'Yo, we have a connection!');    
    connections.add(connectionId, connection);
    
    // send back chat history
//    if (chathistory.length > 0) {
//        console.log('Send the chat history');
//        connection.sendUTF(JSON.stringify({ cmd: 'history', data: chathistory }));
//    }

	function getOnlineUsers()
	{
		var projections =  { _id: 1, name: 1, lat: 1, lng: 1, userImageUrl: 1};	
		db.users.find( {online: true}, projections, function(err, users) {
			if( err || !users) {			// err, user not found
				console.log("getOnlineUsers, no online users found");
			}
			else {				
				console.log("getOnlineUsers, found " + users.length + " online users.");
				//console.log("getOnlineUsers, found users:" + JSON.stringify(users));
    			connection.sendUTF(JSON.stringify({ cmd: 'users', data: users}));
			}
		});
	}
	getOnlineUsers();
	
	function getUserLong(user) {
		return { _id: user._id, name: user.name, email: user.email, lat: user.lat, lng: user.lng, userImageUrl: user.userImageUrl, windowTransparency: user.windowTransparency};		
	}
	function getUserMed(user) {
		return { _id: user._id, name: user.name, lat: user.lat, lng: user.lng, userImageUrl: user.userImageUrl};		
	}
	function getUserShort(user) {
		return { _id: user._id, name: user.name };		
	}
    
    console.log('before callBackForNotifications called');
    bs.callBackForNotifications(connection);

	this.sendUserLogin = function(loginMsg, connId, user) {
		var json;
		if(loginMsg == 'success' || loginMsg == 'successNew') {
			var usr = getUserMed(user);
    		json = JSON.stringify({ cmd: 'userLogin', value: loginMsg, data: usr });
    		           	
           	loggedOn = true;
           	// send userLogin only to current client
           	connections.item(connId).sendUTF(json);
			// broadcast addUser message to all other clients
	        var json = JSON.stringify({ cmd: 'addUser', data: usr });	        
	        connections.forEach(function (key, conn) {
	        	console.log('connections.forEach key: ' + key);
			    if(key != connId)
					conn.sendUTF(json);
			});
		}
		else {	// user login failed
    		json = JSON.stringify({ cmd: 'userLogin', value: loginMsg });
    		//clients[clIndex].connection.sendUTF(json);
    		connections.item(connectionId).sendUTF(json);
    	}
	};
	this.sendUserLogOut = function(connId) {		

    	var argQuery = {connectionId: connId};
    	var argUpdate = { $set: { online: false, connectionId: null} };						            	
		db.users.findAndModify( { query: argQuery, update: argUpdate, new: true, upsert: false}, function(err, user) {
			if( err || !user ) {
				console.log('ERROR: sendUserLogOut, not able to updated online flag');
			}
			else {
				console.log('sendUserLogOut, updated online flag');
				console.log('sendUserLogOut for user: ' + JSON.stringify(user));
				var json;
		       	loggedOn = false;
				var usr = getUserShort(user);
				json = JSON.stringify({ cmd: 'userLogOut', data: usr });
		       	// send userLogin only to current client
		    	try {
					connections.item(connId).sendUTF(json);
				} catch(e) {
					console.log(e);
				}
				// broadcast removeUser message to all other clients
		        var json = JSON.stringify({ cmd: 'removeUser', data: usr });
		        connections.forEach(function (key, conn) {
				    if(key != connId)
				    {
				    	try {
							conn.sendUTF(json);
						} catch(e) {
							console.log(e);
						}
					}
				});
			}
		});
	};
	
	this.getUserSettings = function(user, connId) {
		var usr = getUserLong(user);
		var json = JSON.stringify({ cmd: 'getUserSettings', data: usr });
		connections.item(connId).sendUTF(json);
	};
	

	// json structure:
	//  {
	//		cmd: userLogin / addUser / userMsg 
	//		value: true / false / message
    //		data : userInfo data { id, name, email, lat, lng, picUrl }
    //  }
    var protocol = new Collection({ userLogin: userLogin,
                                    userLogOut: userLogout,
                                    getUserSettings: getSettings,
                                    setUserSettings: setSettings,
                                    userMessage: onChat,
                                    importImage: importImage
                                  });

    function userLogin(message) {
        console.log('look up user email in DB');
        var userEmail = message.data.email.toLowerCase();       // always store the lower case email
        // try to find the user in the database
        db.users.findOne({ email: userEmail }, function(err, user) {
            if (err || !user) {                 // err, user NOT found
                console.log('User was NOT found, create a new record in MongoDb');
                var userName = userEmail.substring(0, userEmail.indexOf('@'));
                var user = { email: userEmail,
                             name: userName,
                             pw: message.data.pw,
                             lat: message.data.lat,
                             lng: message.data.lng,
                             userImageUrl: message.data.userImageUrl,
                             windowTransparency: message.data.windowTransparency,
                             online: true,
                             tsLastLogin: (new Date()).toJSON(),
                             connectionId: connectionId
                           };
                db.users.save(user, function(err, saved) {
                    if(err || !saved)
                        console.log("User not saved");
                    else {
                        console.log("User saved");
                        _this.sendUserLogin('successNew', connectionId, user);
                    }
                });
            }
            else {
                console.log("User found, check the password");
                console.log(user.pw);
                console.log(user.pw);
                if (user.pw.toLowerCase() == message.data.pw.toLowerCase()) {   // login success, not case sensitive
                    // set the online flag
                    var argQuery = {_id: user._id};
                    var argUpdate = { $set: { online: true, tsLastLogin: (new Date()).toJSON(), connectionId: connectionId} };
                    db.users.findAndModify({ query: argQuery, update: argUpdate, new: true, upsert: false}, function(err, user) {
                        if(err || !user) {
                            console.log('login not successful');
                        }
                        else {
                            console.log('login successful');
                            _this.sendUserLogin('success', connectionId, user);
                        }
                    });
                }
                else {
                    var msg = 'login failed, wrong password';
                    console.log(msg);
                    _this.sendUserLogin(msg, connectionId);
                }
            }
        });
    }

    function userLogout(message) {
        _this.sendUserLogOut(connectionId);
    }

    function getSettings(message) {
        // look up user id and password
        var userId = message.data._id;
        // try to find the user in the database
        db.users.findOne({connectionId: connectionId}, function(err, user) {
            if(err || !user) {                  // err, user not found
                console.log("getUserSettings, User with id " + userId + " not found");
            } else if (user._id != userId) {
                console.log("getUserSettings, hacker alert! userId spoofed");
            } else {
                console.log("getUserSettings, User with id " + userId + " found");
                // return all the user settings
                _this.getUserSettings(user, connectionId);
            }
        });
    }

    function setSettings(message) {
        var argQuery = { connectionId: connectionId,
                         pw: message.data.pw };
        var argUpdate = { $set: { email: message.data.email.toLowerCase(),
                                  name: message.data.name,
                                  pw: message.data.pw,
                                  userImageUrl: message.data.userImageUrl,
                                  windowTransparency: message.data.windowTransparency
                                }
                        };
        var userId = message.data._id;
        db.users.findAndModify({ query: argQuery, update: argUpdate, new: true, upsert: false }, function(err, user) {
            if(err || !user) {                  // err, user not found
                console.log("setUserSettings findAndModify, User not found");
            } else if (user._id != userId) {
                console.log("setUserSettings, hacker alert! userId spoofed");
            } else {
                console.log("setUserSettings findAndModify, User with id " + user._id + " and PW: " + user.pw + " found");
                var usr = getUserMed(user);
                var json = JSON.stringify({ cmd: 'setUserSettings', data: usr });
                // broadcast message to all connected clients
                connections.forEach(function (key, conn) {
                    conn.sendUTF(json);
                });
            }
        });
    }

    function onChat(message) {
        if (loggedOn) {
            console.log((new Date()) + ' Received Message from ' + message.data.name + ': ' + message.value);
            var usr = getUserMed(message.data);
            var jsonMsg = JSON.stringify({ cmd: 'userMessage', value: message.value, data: usr });
            // broadcast message to all connected clients
            connections.forEach(function (key, conn) {
                conn.sendUTF(jsonMsg);
            });
        }
    }

    function importImage(message) {
        // get the image from S3
        var fileKey = json.fileKey;
        s3Helper.getFile(fileKey, imagesFilePath, function() {
            console.log('Successfully downloaded image');
            console.log('crop the image');
            imgMgk.resizeAndSave(imagesFilePath + fileKey, imagesFilePath + fileKey, 800);
            console.log('get exif data');
            imgMgk.getExifInfo(imagesFilePath + fileKey, function(latlng) {
                console.log('info received: ' + JSON.stringify(latlng));
                console.log('upload the image to S3');
                s3Helper.pushFile(imagesFilePath, fileKey, function() {
                    console.log('Successfully uploaded image' );
                    console.log('return response');
                    var url = 'https://s3.amazonaws.com/zeitgeistmedia/' + fileKey;
                    connection.sendUTF(JSON.stringify({ type: 'importImage', url:url, latlng: latlng, fileKey: fileKey }));
                });
            });
        });
    }

    connection.on('message', function (message) {
        if (message.type === 'utf8') { // accept only text
            var json = JSON.parse(message.utf8Data);
            if (protocol.keys().indexOf(json.cmd) !== -1) {
                console.log(json.data);
                protocol.item(json.cmd)(json);
            }
            else
                console.log("unknown command: "+ json.cmd +"["+ protocol.keys() +"]");
        }
    });

    // user disconnected
    connection.on('close', function (connection) {
    	console.log('connection.on close');
        if (loggedOn !== false) {
        	_this.sendUserLogOut(connectionId);
            console.log((new Date()) + ' Peer '
                + connection.remoteAddress + ' disconnected.');
            // send out notification to all connected clients about logoff
        }
        // remove user from the list of connected clients
        console.log('connections.remove before: ' + connections.count);
        connections.remove(connectionId);
        console.log('connections.remove after: ' + connections.count);
    });

});

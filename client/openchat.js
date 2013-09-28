$(function () {
	// globals 
    var BASE64_MARKER = ';base64,';
	var URI_WEBSOCKET = 'ws://' + location.host;
	var UserMarkers = {};
	var CURRENTUSER = {};
	var CURRENTPOS = {lat: 0, lng: 0};
	var USERIMAGEURL = "https://s3.amazonaws.com/zeitgeistmedia/";
	var REQCHATHISTORY = false;		
	var UsersCollection = function() {
		var filterJson = '';
		this.filter = function(json) {
			filterJson = json;
		};
	};
	UsersCollection.prototype = new Collection();
	var Users = new UsersCollection();
	
	Users.add('foo', 1);
	console.log(Users.has('foo'));
	console.log(Users.has('nofoo'));
	
	
	$(".chosen").chosen();	
	$(".chosenPanel").chosen({width: '200px'});	// workaround for issue with chosen (26e12ed)

	function clearCurrentUser() {
		CURRENTUSER = { _id: '', email: '', pw: '', lat: 0, lng: 0, userImageUrl: '', windowTransparency: '.5' };
	}
	clearCurrentUser();
	function getUserMed(user) {
		return { _id: user._id, name: user.name, lat: user.lat, lng: user.lng, userImageUrl: user.userImageUrl};		
	}
	function getUserShort(user) {
		return {_id: user._id, name: user.name };
	}
	function setWindowsTransparency(val) {
		$(".bgTransparency").css('background', 'rgba(255, 255, 255, ' + val + ')'); 
	}
	
	var lmap = new LMap();	
    // start class LMap
    function LMap() {
		// constructor
		var LeafIcon = L.Icon.extend({
		    options: {
		        shadowUrl: 'js/images/marker-shadow.png',
				iconSize: [25, 41],
				iconAnchor: [12, 41],
				popupAnchor: [1, -34],
				shadowSize: [41, 41]
		    }
		});	
		var blueIcon = new LeafIcon({iconUrl: 'js/images/marker-icon.png'});
		var greenIcon = new LeafIcon({iconUrl: 'js/images/marker-icon-green.png'});
		var redIcon = new LeafIcon({iconUrl: 'js/images/marker-icon-red.png'});

	    var map = new L.Map('map');
	    var tiles = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png');
		/*
	    var tiles = new L.TileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	        attribution: '',
	        maxZoom: 18
	    });
		*/
	    map.addLayer(tiles);
	    map.locate({ setView: true, maxZoom: 2 });

		// add clustering option
	    var cluster = new L.MarkerClusterGroup();
	    var clusterUsers = new L.MarkerClusterGroup();

	    //cluster.addLayer(new L.Marker(getRandomLatLng(map)));
	    map.addLayer(cluster);
	    map.addLayer(clusterUsers);
	    // adds the marker
	    //var m = new R.Marker(LOCUSER);
	    //map.addLayer(m);

	    this.addUserMarker = function(id, latlng, name, email, userImageUrl) {
	        var msgMarker = name;
	        if (userImageUrl != '') {
	            msgMarker = "<img id=" + id + " src='" + userImageUrl + "' style='width: 90px; height: 100px;' /><br>" + name;
	        }
	        markerIcon = {icon: blueIcon};
	        if (id == CURRENTUSER._id) {
		        if (userImageUrl != '') 
		            msgMarker = "<img id=" + id + " onclick='window.launchEditor(\""+ id + "\", this.src);' src='" + userImageUrl + "' style='width: 90px; height: 100px;' /><br>" + name;
	        	markerIcon = {icon: greenIcon};
			}	        
	        var marker = L.marker(latlng, markerIcon).addTo(map).bindPopup(msgMarker).openPopup();
	        //var marker = clusterUsers.addLayer(L.marker(latlng).bindPopup(msg));
	        // close the marker after a few seconds
			setTimeout(function(){
				marker.closePopup(); 
			}, 3000);

	        UserMarkers[id] = marker;
	    };
	    this.removeUserMarker = function(id) {
	        var marker = UserMarkers[id]; 
	    	//clusterUsers.removeLayer(marker);
	    	if(marker != undefined)
	    	{
	    		map.removeLayer(marker);
	        	delete UserMarkers[id];
	        }
	    };
	    this.addImageMarker = function(latlng, msg, imgSrc, imgId) {
	        var msgMarker = msg;
	        if (imgSrc) {
	            msgMarker = "<img id=" + imgId + " onclick='window.launchEditor(\""+ imgId + "\", this.src);' src='" + imgSrc + "' style='width: 100px; height: 100px;' /><br>";
	        }
	        // TODO user a cluster to group the images
	        //return cluster.addLayer(L.marker(latlng).bindPopup(msgMarker));
        	markerIcon = {icon: redIcon};
	        var marker = L.marker(latlng, markerIcon).addTo(map).bindPopup(msgMarker).openPopup();
			setTimeout(function(){
				marker.closePopup(); 
			}, 2000);
	    };
	    this.showBezierAnim = function(startLatLng, endLatLng)
	    {
	        var b = new R.BezierAnim([startLatLng, endLatLng], {}, function () {
		        setTimeout(function () {
					map.removeLayer(b);
		        }, 2000);
	        });
	        map.addLayer(b);
	    };
	    this.showOriginatorLoc = function(startLatLng)
	    {
	        var p = new R.Pulse(
		        startLatLng,
		        6,
		        { 'stroke': '#2478ad', 'fill': '#30a3ec' },
		        { 'stroke': '#30a3ec', 'stroke-width': 3 });

	        map.addLayer(p);
	        setTimeout(function () {
				map.removeLayer(p);
	        }, 2000);
	    };

	    map.on('locationfound', function(e){
	        CURRENTPOS.lat = e.latlng.lat+Math.random();
	        CURRENTPOS.lng = e.latlng.lng+Math.random();
			clearCurrentUser();
	        /*
	        var radius = e.accuracy / 2;
	        var msg = 'You are located inside this circle';
			lmap.addMarker(LOCUSER, msg);
			L.circle(LOCUSER, radius).addTo(map);
			*/
	    });
	    map.on('locationerror', function(e){
	        console.log("locationerror: "+ e.message);
	    });

	    map.on('click', function (e) {
	        //addMarker(e.latlng, 'Map clicked here');
	        
	        // zoom in two units
	        //map.zoomIn(2);
	        var showHide = ($('div.panelTop').css('display') == 'none') ? 'show' : 'hide';
	        $('div.panelTop').animate({
	            'height': showHide
	        }, 300);
	        
	    });
	}
    // end class Map
	
	// start class BinaryUpload
	function BinaryUpload() {
        if (typeof BinaryClient === "undefined")
            return;
		var uri = URI_WEBSOCKET + ':1338/binary-endpoint';
	    var client = new BinaryClient(uri);
	    
		client.on('stream', function(stream, meta){    
		    var parts = [];
		    stream.on('data', function(data){
				console.log('client.on( stream data: ' );
		    });
		    stream.on('end', function(){
				console.log('client.on( stream end: : ' );
		    });
		});	    

	    this.uploadFile = function(fileOrData, fileName, fileSize, callback) {
	        var stream = client.send(fileOrData, {name: fileName, size: fileSize});	        
	        var tx = 0;
	        stream.on('data', function(json){
				//$('#progress').text(Mh.round(tx+=data.rx*100) + '% complete');
				switch (json.cmd) {
				case 'progress':
					console.log('progress: ' + Math.round(tx+=json.data.rx*100) + '% complete');
					break;
                case 'uploadComplete':
					console.log('uploadCompleteUrl' + json.data.url);
					callback(json.data.url);
                	break;
                }
	        });	        
	        // TODO instead of uploadComplete use stream.on('end', but it doesn't trigger
	        //stream.on('end', function(){
	        //	console.log('BinaryUpload end stream received.'); 
	        // 	callback('https://s3.amazonaws.com/zeitgeistmedia/' + fileName);
	        //});
	    };
		this.uploadDataURI = function(dataURI, fileName, fileType, callback) {
			// TODO determine the image time instead of hard coding
		  	var blob = this.b64toBlob(dataURI, fileType);

			var reader = new FileReader(); // to read file contents
			reader.onload = (function (file) {
		        binaryUpload.uploadFile(file, fileName, blob.size, callback);
			})(blob);
			reader.readAsArrayBuffer(blob);
		};
		this.b64toBlob = function (dataURI, contentType, sliceSize) {
		    contentType = contentType || '';
		    sliceSize = sliceSize || 1024;

		    function charCodeFromCharacter(c) {
		        return c.charCodeAt(0);
		    }

			var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
			var b64Data = dataURI.substring(base64Index);
		    var byteCharacters = atob(b64Data);
		    var byteArrays = [];

		    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		        var slice = byteCharacters.slice(offset, offset + sliceSize);
		        var byteNumbers = Array.prototype.map.call(slice, charCodeFromCharacter);
		        var byteArray = new Uint8Array(byteNumbers);

		        byteArrays.push(byteArray);
		    }

		    var blob = new Blob(byteArrays, {type: contentType});
		    return blob;
		};
	}
	var binaryUpload = new BinaryUpload();
	// end class BinaryUpload

	// start class Hash
	function Hash() {
		var crcTable = [0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685, 2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995, 2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648, 2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990, 1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755, 2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145, 1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206, 2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980, 1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705, 3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527, 1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772, 4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290, 251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719, 3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925, 453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202, 4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960, 984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733, 3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467, 855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048, 3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054, 702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443, 3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945, 2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430, 2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580, 2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225, 1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143, 2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732, 1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850, 2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135, 1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109, 3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954, 1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920, 3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877, 83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603, 3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992, 534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934, 4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795, 376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105, 3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270, 936918000, 2847714899, 3736837829, 1202900863, 817233897, 3183342108, 3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449, 601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471, 3272380065, 1510334235, 755167117];
		var crc = -1;
		this.crc32 = function(buf) {
		    for (var i=0; i<buf.length; i++) {
		        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
		    }
		    return ((crc ^ -1) >>> 0).toString(16);
		};
		this.crc32ofBase64 = function(dataURI) {
		  var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
		  var base64 = dataURI.substring(base64Index);
		  var raw = window.atob(base64);
		  return this.crc32(raw);
		};
	}
	// end class Hash
	var hash = new Hash();
	
    // start class ServerConnection
    function ServerConnection() {
        var protocol = new Collection({userLogin: userLogin,
                                       userLogOut: userLogOut,
                                       addUser: addUser,
                                       removeUser: removeUser,
                                       users: users,
                                       userMessage: userMessage,
                                       importImage: importImage,
                                       getUserSettings: getUserSettings,
                                       setUserSettings: setUserSettings,
                                       chatHistory: chatHistory
                                      });

        // constructor code
        var _this = this;
        var uri = URI_WEBSOCKET + ':1337';
        var connection = new WebSocket(uri);
        this.callback = {};
        var input = $('#input');
        input.removeAttr('disabled').focus();

        this.send = function (command, payload, cb) {
            var envelope = JSON.stringify({ cmd: command, data: payload });
            console.log("sending message: "+ envelope);
            this.callback = cb;
            connection.send(envelope);
        };

        this.chatMessage = function (msg) {
            // TODO instead of getUserMed send getUserShort and use the cached user data.
            this.send('userMessage',
                      { missive: msg,
                        user: getUserMed(CURRENTUSER)
                      });
        };

        connection.onopen = function () {
            console.log('connection.onopen');
        };

        connection.onerror = function (error) {
            console.log('Sorry, but there\'s some problem connecting to the server.</p>');
        };

        connection.onmessage = function (message) {
        var json = '';
            try {
                json = JSON.parse(message.data);
                console.log("recieved message: "+ message.data);
            } catch (e) {
                console.log('This doesn\'t look like a valid JSON: ', message.data);
                return;
            }
            var func;
            if ((func = protocol.item(json.cmd)))
                func(json);
            if (typeof(_this.callback) == 'function')
                _this.callback(json);
        };

        input.keydown(function (e) {
                          if (e.keyCode === 13) {
                              var msg = $(this).val();
                              if (!msg) {
                                  return;
                              }
                          }
                      });

        function userLogin(json) {
        }

        function userLogOut(json) {
            console.log('userLogOut: ' + json.data._id);
            clearCurrentUser();
            localStorage.setItem('authenticated', 'false');
            $("#txtLoginName").text("Not Logged In");
            // remove my marker
            lmap.removeUserMarker(json.data._id);
        }

        function addUser(json) {
            console.log("onmessage addUser");
            var locUser = new L.LatLng(json.data.lat, json.data.lng);
            lmap.addUserMarker(json.data._id, locUser, json.data.name, json.data.email, json.data.userImageUrl);
        }

        function removeUser(json) {
            console.log("onmessage removeUser");
            lmap.removeUserMarker(json.data._id);
        }

        function users(json) {
            console.log("onmessage users");
            console.log(JSON.stringify(json));
            for (var i = 0; i < json.data.length; i++)
            {
                var locUser = new L.LatLng(json.data[i].lat, json.data[i].lng);
                lmap.addUserMarker(json.data[i]._id, locUser, json.data[i].name, json.data[i].email, json.data[i].userImageUrl);
            }
        }

        function userMessage(json) {
            var locOriginator = new L.LatLng(json.data.user.lat, json.data.user.lng);
            lmap.showOriginatorLoc(locOriginator);

            // animation: loop through the users and show how the message is spread
            for (var key in UserMarkers) {
                if (key != undefined)
                {
                    var obj = UserMarkers[key];
                    lmap.showBezierAnim(locOriginator, obj._latlng);
                }
            }
            addChatMessage(json.data.user.name, json.data.missive, json.data.user.userImageUrl);
        }

        function importImage(json) {
            console.log(JSON.stringify(json));
            // add marker todo
            var picLoc = new L.LatLng(json.data.latlng.lat, json.data.latlng.lng);
            lmap.addImageMarker(picLoc, '', json.data.url, json.data.fileKey);
        }

        function getUserSettings(json) {
            console.log('getUserSettings');
        }

        function setUserSettings(json) {
            console.log('setUserSettings');
        refreshUserMarker(json.data);
        }

        function chatHistory(json) {
            console.log(json);
            for (var i = 0; i < json.data.length; i++ ) {
                var message = json.data[i];
                addChatMessage(message.name, message.msg, USERIMAGEURL + message.userId, 0);
            }
        }
    }
    // end class ServerConnection
    var server = new ServerConnection();
		
    function addChatMessage(name, chatMessage, userImageUrl, timeout) {
    	if(timeout===undefined) 
			timeout = 500;
		var imageHtml = "";
		if(userImageUrl != undefined) {
			imageHtml = "<td><img style='width: 24px; height: 24px;' src='" + userImageUrl + "'/></td>";
		}    	
		var eleTR = $( "#chatTable tbody" ).append( "<tr>" +
		imageHtml +
		"<td>" + name + ":</td>" +
		"<td>" + chatMessage + "</td>" +
		"</tr>" );
		$(".ui-dialog-content").animate({scrollTop: $("#chatTable").height()}, timeout);
	}
	
	// start FeatherEditor
    var featherEditor = (typeof Aviary !== "undefined") && new Aviary.Feather({
        apiKey: '1234567',
        apiVersion: 2,
        tools: ['crop', 'orientation', 'brightness', 'contrast', 'saturation', 'warmth', 'stickers', 'enhance', 'text'],
        onSave: function (imageID, newURL) {
            console.log(imageID);
            console.log(newURL);
        },
        onSaveButtonClicked: function(imageID)
		{
		   featherEditor.getImageData(function(data)
		   {
				binaryUpload.uploadDataURI(data, imageID, '', function(url){
        			console.log('userImageFile uploaded callback dialog settings, url: ' + url);
        			if(imageID == CURRENTUSER._id) { 
						refreshUserMarker(CURRENTUSER);
					} else {
						var img = document.getElementById(imageID);
						img.src = url + '?burst='+Math.random();
					}
		        	featherEditor.close();
				});
		    });
		    return false;
		},
        postUrl: 'http://example.com/featherposturl'
    });
    window.launchEditor = function (id, src) {
        featherEditor && featherEditor.launch({ image: id,
                                                url: src
                                              });
        return false;
    };
	// end FeatherEditor

	/*
	x-1. when clicking on the synch button, get the src of img1, convert to binary and upload to server
	-2. when clicking on the synch button upload the images

	// start class ImageState
		class ImageState
		{
			imageId		// should be generated locally
			imageSynced
			syncImage
		}
	*/
	
	// start class ImageUtils
	function ImageUtils() {}

	ImageUtils.prototype.resizeImage = function(base64, maxWidth, maxHeight, callBackForBase64Data) {
        var img = new Image();
        img.src = base64;

        img.onerror = function (e) {
            console.log('onerror: ');
        };

        // this is a hacky, had to be implemented because image complete is not done on the onload event
        var waitForImageLoad = function (img, callBack) {
            console.log('img completed: ' + img.complete);
            if (!img.complete) {
                setTimeout(function () { waitForImageLoad(img, callBack); }, 100);
            }
            else {
                // the image is loaded
                onImageComplete(img, callBack);
            }
        };
        waitForImageLoad(img, callBackForBase64Data);

        function onImageComplete(theImg, callBack) {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var canvasCopy = document.createElement('canvas');
            var copyContext = canvasCopy.getContext('2d');

            var ratio = 1;
            console.log('image width: ' + theImg.width + ', image height: ' + theImg.height);
            if (theImg.width > maxWidth) {
                ratio = maxWidth / theImg.width;
            }
            else if (theImg.height > maxHeight) {
                ratio = maxHeight / theImg.height;
			}
            canvasCopy.width = theImg.width;
            canvasCopy.height = theImg.height;
            copyContext.drawImage(theImg, 0, 0);

            canvas.width = theImg.width * ratio;
            canvas.height = theImg.height * ratio;
            ctx.drawImage(canvasCopy, 0, 0, canvas.width, canvas.height);
            callBack(canvas.toDataURL());
        } (img, callBackForBase64Data);        
	}		
	ImageUtils.prototype.loadImage = function(file, pxMaxWidth, pxMaxHeight, callback) {
		var _this = this;
        var reader = new FileReader(); // to read file contents
        reader.onload = (function (file) {
            return function (evt) {
		        var base64DataOrig = 'data:' + file.type + ';base64,' + btoa(evt.target.result);		        
		        _this.resizeImage(base64DataOrig, pxMaxWidth, pxMaxHeight, function(base64Data) {
					callback(base64Data);
		        });
            };
        })(file);
        reader.readAsBinaryString(file);
    };
    
    imageUtils = new ImageUtils();
	
	// start class LocalImages
	function LocalImages() {
        var _this = this;
		var imageCollection = {};

		this.set = function(key, item) {
			imageCollection[key] = { key: key, item: item};
		};
		this.remove = function(key) {
			delete imageCollection[key];
		};
		this.itemByKey = function(key) {
			return imageCollection[key];
		};
		// zero based index
		this.itemByIndex = function(index) {
			_index = 0;
			for (var key in imageCollection) {
				if (_index == index) {
					return imageCollection[key];
				}
				_index ++;
			}
		};
		this.count = function() {
			return Object.keys(imageCollection).length;
		};
		this.syncImages = function() {
			// loop through imageCollection
			//
		};
		this.loadFiles = function(entries) {
	        for (var i = 0; i < entries.length; i++) {
	            var reader = new FileReader(); // to read file contents
	            reader.onload = (function (file) {
	                return function (evt) {
	                	// load the image base64 and create the markers
	                	imageUtils.loadImage(file, 800, 800, function(base64Data){
							var fileId = hash.crc32ofBase64(base64Data);
							// add to image collection
							_this.set(fileId, base64Data);
					        var exif = EXIF.readFromBinaryFile(new BinaryFile(evt.target.result));
					        console.log('exif.GPSLongitude: ' + exif.GPSLongitude);
					        console.log('exif.GPSLongitudeRef: ' + exif.GPSLongitudeRef);
					        var picLoc = new L.LatLng(ConvertDMSToDD(exif.GPSLatitude, exif.GPSLatitudeRef), ConvertDMSToDD(exif.GPSLongitude, exif.GPSLongitudeRef));
					        var msg = exif.UserComment;
					        if (!msg) {
					            msg = file.name;
					        }
				            lmap.addImageMarker(picLoc, msg, base64Data, fileId);
						});
	                };
	            })(entries[i]);
	            reader.readAsBinaryString(entries[i]);
	        }
	    };
	    function ConvertDMSToDD(DMS, dir) {
	        var dd = DMS[0] + DMS[1] / 60 + DMS[2] / (60 * 60);

	        if (dir == 'S' || dir == 'W') {
	            dd = dd * -1;
	        } // Don't do anything for N or E
	        return dd;
	    }	
	}
	// end class LocalImages	
	var localImages = new LocalImages();
	
	
	// start class filepicker
	function FilePickerIO() {
        if (typeof filepicker === "undefined")
            return;
		filepicker.setKey('A9Vk0HCS9ScAhfDSsCZKgz');
		
		this.showDialog = function() {
			filepicker.pick({services: [ 'DROPBOX', 'EVERNOTE', 'FACEBOOK', 'FLICKR', 'GOOGLE_DRIVE', 'PICASA', 'INSTAGRAM', 'URL', 'VIDEO', 'WEBCAM' ]}, 
			function(FPFiles){
				//console.log(JSON.stringify(FPFiles));
				filepicker.store(FPFiles, FPFiles.filename,
				    function(storedPFFiles){
				        console.log(JSON.stringify(storedPFFiles));
						server.send('importImage', storedPFFiles.key);
				    }
				);    			
			});
		}
	}
	// end class filepicker	
	var filePickerIO = new FilePickerIO();

	function refreshUserMarker(user) {
		// remove and add the user marker with the new settings
		lmap.removeUserMarker(user._id);
		var locUser = new L.LatLng(user.lat, user.lng);   
		lmap.addUserMarker(user._id, locUser, user.name, user.email, (user.userImageUrl === '')?'':(user.userImageUrl + '?burst='+Math.random()));				        	
	}

// ------------------------------ dialog - generic functions ------------------------------
	var 	email = $( "#email" ), 
			password = $( "#password" ),
			allFields = $( [] ).add( email ).add( password ),
			tips = $( ".validateTips" );
	      
	function updateTips( t ) {
		tips.text( t ).addClass( "ui-state-highlight" );
		setTimeout(function() {
			tips.removeClass( "ui-state-highlight", 1500 );
		}, 500 );
	}
	function checkRegexp( o, regexp, n ) {
		if ( !( regexp.test( o.val() ) ) ) {
			o.addClass( "ui-state-error" );
			updateTips( n );
			o.focus();
			return false;
		} else {
			return true;
		}
	}
	function checkLength( o, n, min, max ) {
		if ( o.val().length > max || o.val().length < min ) {
			o.addClass( "ui-state-error" );
			updateTips( "Length of " + n + " must be between " + min + " and " + max + "." );
			o.focus();
			return false;
		} else {
			return true;
		}
	}
	function loginUser(userEmail, userPassword, userImage, callback) {
		console.log(userEmail);
		console.log(userPassword);
		// validate user info
		
		// get the user name
		CURRENTUSER.email = userEmail;
		CURRENTUSER.pw = userPassword;

		function sendLogin() {
			CURRENTUSER.lat = CURRENTPOS.lat;
			CURRENTUSER.lng = CURRENTPOS.lng;
			// if valid, send info to the server
	 		server.send('userLogin', CURRENTUSER, callback);
		}
		
		if (CURRENTPOS.lat == 0 && CURRENTPOS.lng == 0) {
			//navigator.geolocation
            //         .getCurrentPosition(function (position) {
			//                                 CURRENTPOS.lat = position.coords.latitude;
			//	                             CURRENTPOS.lng = position.coords.longitude;
			//	                             sendLogin();
			//                             },
            //                             function (e) {
            //                                 sendLogin();
            //                             });
            CURRENTPOS.lat = 0;
	        CURRENTPOS.lng = 0;
            sendLogin();
		} else {
			sendLogin();
		}
	}

// ------------------------------ dialog-login ------------------------------
    $("#dialog-login").dialog({
		dialogClass:'bgTransparency',
        autoOpen: false,
        height: 400,
        width: 400,
        modal: true,
	    show: 'explode',
        hide: 'fade',
        buttons: {
            "Sign Up/Sign In": function () {
                var bValid = true;

				allFields.removeClass( "ui-state-error" );
				 
				bValid = bValid && checkRegexp( email, /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i, "Please enter your email address" );
				bValid = bValid && checkLength( email, "email", 6, 80 );
				bValid = bValid && checkLength( password, "password", 2, 16 );
				bValid = bValid && checkRegexp( password, /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9" );

				if ( bValid ) {
					loginUser($("#email").val(), $("#password").val(), $("#userImage").val(), function(json){	
						if(json.cmd == "userLogin" && (json.data.status == "success" || json.data.status == "successNew"))
						{
							console.log('user login success here! :'+ json);
							
		        			// now add our marker
		        			var pw = CURRENTUSER.pw;
	                		CURRENTUSER = json.data.user;
	                		CURRENTUSER.pw = pw;
	                		// set transparency
	                		setWindowsTransparency(CURRENTUSER.windowTransparency); 
	                		var locUser = new L.LatLng(CURRENTUSER.lat, CURRENTUSER.lng);                		
	                		lmap.addUserMarker(CURRENTUSER._id, locUser, CURRENTUSER.name, CURRENTUSER.email, CURRENTUSER.userImageUrl);
	                		$("#txtLoginName").text(json.data.name);
							// if true, store that stuff in localstorage
							localStorage.setItem('authenticated', 'true');       
							
							if(json.value == 'successNew') {
		                		updateTips('Welcome ' + CURRENTUSER.name + '!');                		
		    					setTimeout(function () {	// delayed close 
		    						$("#dialog-login").dialog().dialog('close'); 
		    						$("#dialog-settings").dialog('open');
		    						}, 2000
		    					);  
		    				}
		    				else {
		    					$("#dialog-login").dialog().dialog('close');
		    				}
			        	}
			        	else {
			        		updateTips(json.value);	// display the error
			        	}
 					});
                }                
            },
        },
        open: function() {
        	console.log('dialog login open function called');
        },
        close: function () {
        	allFields.val( "" ).removeClass( "ui-state-error" );
        }
    });	
  
// ------------------------------ dialog-settings ------------------------------
	var userImageFile;
	$("#dialog-settings").dialog({
		dialogClass:'bgTransparency',
        autoOpen: false,
        height: 650,
        width: 480,
        modal: true,
	    show: 'explode',
        hide: 'fade',
	    buttons: [{
	        text: "Apply",
	        click: function() {
                var bValid = true;
	        	var userEmail = $("input#userEmail");
	        	var passwordSettings =$("input#passwordSettings");
	        	var userName = $("input#userName");
				userEmail.removeClass( "ui-state-error" );
	        	passwordSettings.removeClass( "ui-state-error" );
	        	userName.removeClass( "ui-state-error" );
				
				bValid = bValid && checkLength( passwordSettings, "password", 2, 16 );
				// correct password?
				bValid = bValid && (CURRENTUSER.pw == passwordSettings.val());
				 
				bValid = bValid && checkRegexp( userEmail, /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i, "Please enter your email address" );
				bValid = bValid && checkLength( userName, "user name", 2, 20 );
				bValid = bValid && checkLength( userEmail, "email", 6, 80 );
					
				if ( bValid ) {			        	
		        	// get and apply the user settings
		        	CURRENTUSER.name = userName.val();
		        	CURRENTUSER.email = userEmail.val();
		        	CURRENTUSER.pw =  passwordSettings.val();
		        	CURRENTUSER.windowTransparency = $("input#windowTransparency").val();
		        	// get the languages
		        	var languages = [];
					var $selected = $('#userLanguages option:selected');
					$selected.each(function(){
						languages.push( $(this).text() );
					});
					CURRENTUSER.languages = languages;

					function updateMarkerAndServer(user)
					{
						server.send('setUserSettings',
                                    user,
                                    function (jsonResp) {
							            // check for success
							            if ((jsonResp.cmd == "setUserSettings") && 
                                            (jsonResp.data._id === CURRENTUSER._id))
							            {
								            var pw = CURRENTUSER.pw;
								            CURRENTUSER = jsonResp.data;
								            CURRENTUSER.pw = pw;
								            $("#txtLoginName").text(CURRENTUSER.name);
		    				            }
						            });
					}

					// upload the image if we have one							
					if(userImageFile !== undefined)
					{
	    				CURRENTUSER.userImageUrl = 'https://s3.amazonaws.com/zeitgeistmedia/' + CURRENTUSER._id;
						// transfer the resized image instead of using the original 
			       		binaryUpload.uploadDataURI($("img#imgUserImage").attr("src"), CURRENTUSER._id, userImageFile.type, function(url){
		        			console.log('userImageFile uploaded callback dialog settings, url: ' + url);
							updateMarkerAndServer(CURRENTUSER);		        			
						});
					} 
					else 
					{
						updateMarkerAndServer(CURRENTUSER);		        								
					}
							        	
		        	setWindowsTransparency(CURRENTUSER.windowTransparency);

					// clear the form inputs
					passwordSettings.val('');
					passwordSettings.removeClass( "ui-state-error" );
		        	// close the dialog
		        	$(this).dialog('close');
		        }
	        },
	        id: 'dialog_save_button'
    	},
		{
	        text: "Cancel",
	        click: function() {
	        	// reverse the style
		        setWindowsTransparency(CURRENTUSER.windowTransparency);
	        	$(this).dialog('close');
	        },
	        id: 'dialog_cancel_button'
    	}],
        open: function () {
                   userImageFile = undefined;
                   console.log('dialog settings open function called');        
                   tips.text('Choose Your Pic:');
           
                   // send getUserSettings
                   server.send('getUserSettings',
                               CURRENTUSER,
                               function (jsonResp) {
                                   if (CURRENTUSER._id == jsonResp.data._id) 
                                   {
                                       var user = jsonResp.data;
                                       console.log('getUserSettings inside callback, now fill the form');
                                       var valTransparency = .5;
                                       // apply them to the dialog
                                       $("input#userName").val(user.name);
                                       $("input#userEmail").val(user.email);
                                       var userImage = $("img#imgUserImage");
                                       if (user.userImageUrl != "")
                                       {
                                           userImage.attr("src", user.userImageUrl+'?burst='+Math.random());
                                           // TODO the below code doesn't seem to work
                                           //var txtLaunchEditor = "window.launchEditor('imgUserImage', this.src);";
                                           // imgUserImage should be replaced with user._id
                                           //userImage.on("click", txtLaunchEditor);
                                       }
                                       else
                                       {
                                           userImage.attr("src", 'https://s3.amazonaws.com/zeitgeistmedia/iconUser.png');
                                       }
                                       if (user.windowTransparency) {
                                           valTransparency = user.windowTransparency;
                                       }
                                       $("input#windowTransparency").val(valTransparency);
                                       // languages
                                       var $languages = $('select#userLanguages');
                                       $languages.val(user.languages);
                                       $languages.trigger("chosen:updated");
                                       /*
                                       // interests
                                       var $interests = $('select#userInterests');
                                       $interests.val(user.interests);
                                       $interests.trigger("chosen:updated");
                                       */                  
                                   }               
                               });
                   
                               $("input#userImageNew").change(function (e) {
                                   userImageFile = this.files.item(0);
                                   imageUtils.loadImage(userImageFile, 200, 200, function(base64){
                                       $('img#imgUserImage').attr('src', base64);
                                   });
                               });
                               $("input#windowTransparency").on('input', function (e) {
                                   setWindowsTransparency($(this).val());
                               });
              },
        close: function () {
                   // clear the values
                   allFields.val( "" ).removeClass( "ui-state-error" );
               }
    });    
    $('#dialog-settings').parents('.ui-dialog').find('.ui-dialog-buttonpane')
    .prepend('<input type=\'password\' placeholder=\'Current Password\' id=\'passwordSettings\' class=\'dialogTextInput\'/>');

// ------------------------------ dialog-chat ------------------------------
	$("#dialog-chat").dialog({
		dialogClass:'bgTransparency',
        autoOpen: false,
        height: 600,
        width: 500,
        modal: false,
	    show: 'explode',
        hide: 'fade',
        resizable: true,
	    buttons: [{
	        text: "Send Msg",
	        click: function() {
                var bValid = true;
                var chatMessage = $("#messageInput").val();
                bValid = (chatMessage.length > 0);
				if ( bValid ) {		
					server.chatMessage(chatMessage);
					$("#messageInput").val('');
            	}
	        },
	        id: 'dialog_send_button'
  		}],
        open: function() {
            if (!REQCHATHISTORY) {
                server.send('getChatHistory', null);
                REQCHATHISTORY = true;
            }
        }
	});
    $('#dialog-chat').parents('.ui-dialog').find('.ui-dialog-buttonpane')
    .prepend('<input type=\'text\' id=\'messageInput\' class=\'dialogTextInput\'/>');
	
	// route the enter key for all dialogs to the first button
	$('body').on('keyup', '.ui-dialog', function(event) {  
		if (event.keyCode === $.ui.keyCode.ENTER) {  
			$(this).find('.ui-dialog-buttonpane button:first').click(); 
		} 
	}); 
	
	// if not logged in, show the dialog
	//if (localStorage.getItem('authenticated')==='true') {
	//	alert('User with user id: ' + localStorage.getItem('userId') + ' is already authenticated.');
	//} else {
		$("#dialog-login").dialog("open");
 	//}
	// event handlers

	function verifyLoggedIn() {
		if (localStorage.getItem('authenticated')!=='true') {
			$("#dialog-login").dialog("open");
			return false;
		}
		else {
			return true;
		}
	}
// ------------------------------ event handlers ------------------------------
 	// drag drop event handlers
    var dropArea = document.getElementById('map');
    dropArea.addEventListener('dragleave', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }, false);
    dropArea.addEventListener('dragenter', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }, false);
    dropArea.addEventListener('dragover', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
    }, false);
    dropArea.addEventListener('drop', function (evt) {
        localImages.loadFiles(evt.dataTransfer.files);
        evt.preventDefault();
        evt.stopPropagation();
    }, false);

    $("#btnLocalImages").button().click(function() {
		if (verifyLoggedIn()) {
			$('#selectFiles').click();
		}
    });
    $("#btnImportImages").button().click(function() {
		if (verifyLoggedIn()) {
	    	filePickerIO.showDialog();
		}
    });
    $("#btnImportBlog").button().click(function() {
		if (verifyLoggedIn()) {
	        alert('btnImportBlog');
		}
    });    
    $("#btnChat").button().click(function() {
		if (verifyLoggedIn()) {
    	    $("#dialog-chat").dialog("open");
		}
    });
     $("#btnSettings").button().click(function() {
		if (verifyLoggedIn()) {
        	$("#dialog-settings").dialog("open");
		}
    });   
    $("#btnFilters").button().click(function() {        
        if($('div.panelRight').css('display') == 'none') {
	        $('div.panelRight').animate({
	            'width': 'show'
	        }, 300, function() {
	            $('div.panel').fadeIn(500);
	        });
		} else {
	       $('div.panel').fadeOut(500, function() {
	            $('div.panelRight').animate({
	                'width': 'hide'
	            }, 300);
	        });
	 	}
    });
    
    $("#btnLogin").button().click(function() {
		$("#dialog-login").dialog("open");
    }); 
    $("#btnLogout").button().click(function() {
		if (verifyLoggedIn()) {
			server.send('userLogOut', null);
		}
    });      
	  
    $('#selectFiles').change(function (e) {
    	localImages.loadFiles(this.files);
    });

    $('#btnSynchFiles').click(function () {    	
    	// loop through the images
		var count = localImages.count();	
		for(i = 0; i < count; i++) {
    		// get the image id's
			var imageId = localImages.itemByIndex(i).key;
			var synced = localImages.itemByIndex(i).item;
			if(!synced) {
    			// get the src
    			var img = document.getElementById(imageId);
    			if(img) {
    				// send the image to EC2
    				binaryUpload.uploadDataURI(img.src, imageId);
				}
			}
			console.log(imageId);
		}
    });
});

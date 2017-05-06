(function() {
	'use strict';

	var DEVELOPING = false,
		BUFFER_SIZE = 4096,
		MAIN_ORDER = 2,
		ENDING_ORDER = 6;


	var rendering = false,
		renderer,
		scene,
		sceneHUD,
		root,
		camera, cameraTarget = new THREE.Vector3(),
		cameraTween,
		cameraHUD,
		cameraTargetTween,
		boom = 0,
		textScale = 0.5,
		activeText,
		lastRenderTime = 0,
		textKLAWI,
		textPlayYourHeart,
		textHackPKU,
		grid,
		tris,
		lastEmerge,
		audioContext,
		jsAudioNode,
		analyserNode,
		preCompressorGainNode,
		compressorNode,
		sorolletPlayer,
		songOrder, songPattern, songRow,
		infoLayer = document.getElementById('info'),
		orderList = [3, 4, 2, 2, 2, 2, 1, 1, 0],
		curOrderIndex = 0,
		curRow = 0;
		
		var lRect = new Array(),
		lRound = new Array(),
		lTri = new Array(),
		rRect = new Array(),
		rRound = new Array(),
		rTri = new Array();

		var lRectTween = new Array(),
		lRoundTween = new Array(),
		lTriTween = new Array(),
		rRectTween = new Array(),
		rRoundTween = new Array(),
		rTriTween = new Array();

		var ballSprite;

		var volumeNode = [];
        // Setup Leap loop with frame callback function
        var controllerOptions = {
            enableGestures: true,
            hand: function(hand){
                //console.log( hand.screenPosition() );
            }
        };
		var boomList = [];
        var previousFrame;
        var appWidth = window.innerWidth;
        var appHeight = window.innerHeight;
        var prevHandPos = [];
        var down = [];

	preSetup();

	function preSetup() {
		var container = document.getElementById('container'),
			intro = document.getElementById('intro'),
			start = document.getElementById('start');

		// Audio API & WebGL?
		if( AudioDetector.detects( [ 'webAudioSupport' ] ) ) {
			if( !Detector.webgl ) {
				Detector.addGetWebGLMessage({ parent: container });
				return;
			}
			
			if(DEVELOPING) {
				setup();
			}
		}

		container.style.visibility = 'hidden';
		
		start.addEventListener('click', function startClick(e) {
			console.log('eh');
			start.removeEventListener('click', startClick);
			intro.className = 'loading';
			start.innerHTML = 'OK, hold on a second...';
			setTimeout(setup, 100);
		});

	}

	function audioSetup() {

		audioContext = new AudioContext();
		jsAudioNode = audioContext.createScriptProcessor( BUFFER_SIZE );
		//sorolletPlayer = new SOROLLET.Player( audioContext.sampleRate );
		if(audioContext.createDynamicsCompressor) {
			compressorNode = audioContext.createDynamicsCompressor();
			compressorNode.ratio.value = 12.0;
		} else {
			compressorNode = audioContext.createGain();
			compressorNode.gain.value = 1.4;
		}
		analyserNode = audioContext.createAnalyser();
		analyserNode.fftSize = 256;

		//preCompressorGainNode.connect(compressorNode);
		compressorNode.connect(analyserNode);
		analyserNode.connect(jsAudioNode);
		jsAudioNode.connect(audioContext.destination);

		jsAudioNode.onaudioprocess = function(audioProcessingEvent) {

			// The input buffer is the song we loaded earlier
			var inputBuffer = audioProcessingEvent.inputBuffer;

			// The output buffer contains the samples that will be modified and played
			var outputBuffer = audioProcessingEvent.outputBuffer;
			// Loop through the output channels (in this case there is only one)
			
			for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
				var inputData = inputBuffer.getChannelData(channel);
				var outputData = outputBuffer.getChannelData(channel);

				// Loop through the 4096 samples
				let max = 0;
				for (var sample = 0; sample < inputBuffer.length; sample++) {
				// make output equal to the same as the input
				outputData[sample] = inputData[sample];
				if (inputData[sample] > max) max = inputData[sample];
				// add noise to each output sample
				//outputData[sample] += ((Math.random() * 2) - 1) * 0.2;       
				}
				//console.log(max);
			}
			var bufferLength = analyserNode.frequencyBinCount;
    		var dataArray = new Uint8Array(bufferLength);
			analyserNode.getByteFrequencyData(dataArray);
			//console.log(dataArray);
			let times = 1.0, sum = 0;
			for (let i = 127; i>=0; i--) {
				sum += dataArray[i] * times;
				times *= 0.99;
			}
			//console.log(sum);
			if (lastEmerge == 0 || sum > lastEmerge) {
				//console.log("boom!");
				let e = {
					order: songOrder,
					row : songRow
				}
				if(!rendering) {
					rendering = true;
					render();
				}
				if (songRow % 1 == 0) e.note = 48;
					else e.note = 0;
				kickstart(e);
				songRow ++;
				if (songRow == 64) {
					songRow = 0;
					songOrder = (songOrder + 1) % 9; 
					let order = songOrder;
					if(order >= MAIN_ORDER && order < ENDING_ORDER + 2) {
						root.add(grid);
						grid.materialTween.start();
					} else {
						root.remove(grid);
					}
				}

			}
			lastEmerge = sum;
		}
		// 		var buffer = event.outputBuffer,
		// 		outputBufferLeft = buffer.getChannelData(0),
		// 		outputBufferRight = buffer.getChannelData(1),
		// 		numSamples = outputBufferLeft.length,
		// 		sorolletBuffer = sorolletPlayer.getBuffer(numSamples);

		// 		for(var i = 0; i < numSamples; i++) {
		// 			var buf = sorolletBuffer[i];
		// 			outputBufferLeft[i] = buf;
		// 			outputBufferRight[i] = buf;
		// 		}
		// };

		// // init sorollet using song array
		// SOROLLET.Legacy.loadSongFromArray(sorolletPlayer, song);
		// var voice1 = sorolletPlayer.voices[0];
		// var voice2 = sorolletPlayer.voices[1];

		// // Manually override some stuff so that this sounds sort of decent
		// voice1.wave1Octave = 3;
		// voice1.pitchEnvelope.setOutputRange(-10, 10);
		// voice1.pitchEnvelope.setTimeScale(3);

		// voice2.wave1Volume = 0;
		// voice2.wave2Volume = 0;
		// voice2.noiseAmount = 0.5;
		// voice2.volumeEnvelope.setAttack(0);
		// voice2.volumeEnvelope.setDecay(0.2);
		// voice2.volumeEnvelope.setTimeScale(0.1);

		// // Events
		// sorolletPlayer.addEventListener('orderChanged', function(ev) {
		// 	songOrder = ev.order;
		// 	updateInfo();
		// 	if(!rendering) {
		// 		rendering = true;
		// 		render();
		// 	}
		// }, false);

		// sorolletPlayer.addEventListener('patternChanged', function(ev) {
		// 	songPattern = ev.pattern;
		// 	updateInfo();
		// }, false);

		// sorolletPlayer.addEventListener('rowChanged', function(ev) {
		// 	songRow = ev.row;
		// 	updateInfo();
		// }, false);

		// sorolletPlayer.addEventListener('songEnded', function() {
		// 	document.getElementById('looping').style.display = 'block';
		// }, false);

		songOrder = 0;
		songPattern = orderList[songOrder];
		songRow = 0;


        // For debugging/hacking
		var debug = document.getElementById('debug');

		// var gui1 = new SOROLLET.VoiceGUI();
		// gui1.attachTo( voice1 );

		// var gui2 = new SOROLLET.VoiceGUI();
		// gui2.attachTo( voice2 );

		// debug.appendChild(gui1.dom);
		// debug.appendChild(gui2.dom);


		// for better hackage
		window.sorolletPlayer = sorolletPlayer;

	}


	// Builds a mesh with lines that render the letters in data
	function makeText(data, numInstances) {
		var lineMaterial = new THREE.LineBasicMaterial({ color: 0xFFB2BD, linewidth: 1 });
		var lineGeometry = new THREE.Geometry();
		var text = new THREE.Object3D();
		var index = 0;
		var numCharacters = data[index++];
		var characterWidth = 1.4;
		var x = 0;

		// Build geometry first
		for(var i = 0; i < numCharacters; i++) {
			var numSegments = data[index++];

			for(var j = 0; j < numSegments; j++) {
				var absX1 = data[index++];
				var absY1 = data[index++];
				var absX2 = data[index++];
				var absY2 = data[index++];
				
				lineGeometry.vertices.push(new THREE.Vector3(x + absX1, absY1, 0));
				lineGeometry.vertices.push(new THREE.Vector3(x + absX2, absY2, 0));

			}
				x += characterWidth;

		}

		THREE.GeometryUtils.center(lineGeometry);

		// and numInstances lines later
		for(var k = 0; k < numInstances; k++) {
			var line = new THREE.Line(lineGeometry, lineMaterial, THREE.LinePieces);
			text.add( line );
		}

		return text;

	}


	function makeGrid(width) {

		var num = 30;
		var thickEach = 5;
		var gridInc = 4 * width / num;
		var gridTop = width * 2;
		var xPos = -gridTop;
		var yPos;
		var grid = new THREE.Object3D();
		var gridThinMaterial = new THREE.LineDashedMaterial({ linewidth: 1, color: 0xF1EFB4, dashSize: 2, gapSize: 10, opacity: 0.25, transparent: true, blending: THREE.AdditiveBlending });
		var gridThickMaterial = new THREE.LineBasicMaterial({ linewidth: 1, color: 0xF1EFB4, opacity: 0.25, transparent: true, blending: THREE.AdditiveBlending });
		var geometryThin = new THREE.Geometry();
		var geometryThick = new THREE.Geometry();
		var geometry;

		for(var i = 0; i < num; i++) {

			yPos = -gridTop;

			for(var j = 0; j < num; j++) {

				if(i % thickEach === 0 & j % thickEach === 0) {

					geometry = geometryThick;

				} else {

					geometry = geometryThin;

				}

				geometry.vertices.push(new THREE.Vector3(xPos, yPos, -gridTop));
				geometry.vertices.push(new THREE.Vector3(xPos, yPos,  gridTop));

				geometry.vertices.push(new THREE.Vector3(xPos, -gridTop, yPos));
				geometry.vertices.push(new THREE.Vector3(xPos,  gridTop, yPos));

				yPos += gridInc;
			}

			xPos += gridInc;

		}

		geometryThin.computeLineDistances();

		grid.add(new THREE.Line(geometryThin, gridThinMaterial, THREE.LinePieces));
		grid.add(new THREE.Line(geometryThick, gridThickMaterial, THREE.LinePieces));

		grid.materialTween = new TWEEN.Tween({ opacity: 0 })
			.onUpdate(function() {
				gridThinMaterial.opacity = this.opacity;
				gridThickMaterial.opacity = this.opacity;
			})
			.easing(TWEEN.Easing.Exponential.InOut)
			.to({ opacity: 0.4 }, 500);

		return grid;
	}

	function makeTris(length, separation, radius) {

		var vertexShader = [
			//'varying vec2 vUv;',
			'uniform float time;',
			'uniform float radius;',
			'attribute float angle;',

			'void main() {',

				'vec4 pos = vec4( position.xyz, 1.0 );',
				
				'float angle2 = angle + time;',
				'float radius2 = radius + 0.5*radius * cos(time*2.0 + angle2+pos.x*10.0);',
				'float angle3 = angle + time * 5.0;',
				'float radius3 = radius * 15.0;',

				'radius2 *= 10.0;',
				'pos.y = radius2 * sin(angle2) + radius3 * sin(angle3);',
				'pos.z = radius2 * 0.5 * cos(angle2) + radius3 * cos(angle3);',

				'gl_Position = projectionMatrix * modelViewMatrix * pos;',

			'}'
		].join('\n');

		var fragmentShader = [
			'uniform float opacity;',
			'uniform vec3 color;',

			'void main() {',
			'    gl_FragColor = vec4( color, opacity );',
			'}'
		].join('\n');

		var geom = new THREE.Geometry();
		
		// var mat = new THREE.LineBasicMaterial({ color: 0x79D1EA, transparent: true, blending: THREE.AdditiveBlending, linewidth: 2, opacity: 0.5 });
		var mat = new THREE.ShaderMaterial({
			attributes: {
				'angle': { type: 'f', value: [] }
			},
			uniforms: {
				'radius': { type: 'f', value: radius },
				'opacity': { type: 'f', value: 0.0 },
				'time': { type: 'f', value: 0.0 },
				'color': { type: 'v3', value: new THREE.Vector3(0.478, 0.823, 0.921) }
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader
		});
		mat.linewidth = 1;
		mat.blending = THREE.AdditiveBlending;
		mat.transparent = true;
		
		var num = length / separation,
			startX = -length / 2,
			x = startX,
			angle = 0;

		for(var i = 0; i < num; i++) {
			geom.vertices.push(new THREE.Vector3(x, radius * Math.sin(angle), radius * Math.cos(angle)));
			x += separation;
			angle = x * 5;
			mat.attributes.angle.value.push(angle);
		}

		THREE.GeometryUtils.center(geom);

		var line = new THREE.Line(geom, mat, THREE.LineStrip);

		var materialTweenProps = { opacity: 0 };
		line.materialTween = new TWEEN.Tween(materialTweenProps)
			.easing(TWEEN.Easing.Exponential.Out)
			.onUpdate(function() {
				mat.uniforms.opacity.value = this.opacity;
			});

		line.materialTween.properties = materialTweenProps;

		return line;
	}


	function graphicsSetup() {
		scene = new THREE.Scene();
		scene.fog = new THREE.Fog(0x383733, 300, 600);

		root = new THREE.Object3D();
		root.rotationTween = new TWEEN.Tween(root.rotation).easing(TWEEN.Easing.Exponential.In);
		root.positionTween = new TWEEN.Tween(root.position).easing(TWEEN.Easing.Bounce.InOut);
		scene.add(root);

		camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
		cameraTween = new TWEEN.Tween(camera.position).easing(TWEEN.Easing.Exponential.InOut);
		cameraTargetTween = new TWEEN.Tween(cameraTarget).easing(TWEEN.Easing.Circular.Out);

		var p = 100;
		camera.position.set(p, p, p);
		camera.lookAt(cameraTarget);

		// var geometry = new THREE.BoxGeometry( 1, 1, 1 );
		// var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		// var cube = new THREE.Mesh( geometry, material );
		// scene.add( cube );
		// cube.rotation.x += 0.1;
		// cube.rotation.y += 0.1;
		//camera.position.z = 5;

        var numCopies = 10;
		var s = 5;

        //textXPLSV = makeText(gfx.text_xplsv, numCopies);
		textKLAWI = makeText(gfx.text_klawi, numCopies);
		textKLAWI.scale.set(s,s,s);
		scene.add(textKLAWI);
		activeText = textKLAWI;

		//textToTheBeat = makeText(gfx.text_to_the_beat, numCopies);
		textPlayYourHeart = makeText(gfx.text_play_your_heart, numCopies);
		textPlayYourHeart.scale.set(s, s, s);

		textHackPKU = makeText(gfx.text_hackpku, numCopies);
		textHackPKU.scale.set(s, s, s);

		grid = makeGrid(1000);

		tris = makeTris(10000, 3, 85);
		root.add(tris);

				// HUD start from here
		var hudCanvas = document.createElement('canvas');
		var width = window.innerWidth/2;
  		var height = window.innerHeight/2;	
  		// Again, set dimensions to fit the screen.
  		hudCanvas.width = width;
  		hudCanvas.height = height;

  		// Get 2D context and draw something supercool.
		
		// var hudBitmap = hudCanvas.getContext('2d');
		// hudBitmap.font = "Normal 40px Arial";
  		// hudBitmap.textAlign = 'center';
  		// hudBitmap.fillStyle = "rgba(245,245,245,0.75)";
  		// hudBitmap.fillText('Initializing...', width / 2, height / 2);
		
		// Create the camera and set the viewport to match the screen dimensions.
  		cameraHUD = new THREE.OrthographicCamera(-width/2, width/2, height/2, -height/2, 0, 30 );

  		// Create also a custom scene for HUD.
  		sceneHUD = new THREE.Scene();

		// Create texture from rendered graphics.
		var hudTexture = new THREE.Texture(hudCanvas) 
		hudTexture.needsUpdate = true;
		//var ballTexture = THREE.ImageUtils.loadTexture( 'js/data/ball.png' );

  		// Create HUD material.
  		var material = new THREE.MeshBasicMaterial( {map: hudTexture} );
  		material.transparent = true;
		//var ballMaterial = new THREE.SpriteMaterial( { map: ballTexture} );

  		// Create plane to render the HUD. This plane fill the whole screen.
  		var planeGeometry = new THREE.PlaneGeometry( width, height );
  		var plane = new THREE.Mesh( planeGeometry, material );
  		sceneHUD.add( plane );

		drawAllButton();

		// HOD end here
		THREE.ImageUtils.crossOrigin = '';	
		var ballTexture = THREE.ImageUtils.loadTexture( 'http://localhost:3000/images/center.png' );
	
		// suggested- alignment: THREE.SpriteAlignment.center  for targeting-style icon
		//			  alignment: THREE.SpriteAlignment.topLeft for cursor-pointer style icon
		var ballMaterial = new THREE.SpriteMaterial( { map: ballTexture, useScreenCoordinates: true } );
		ballSprite = new THREE.Sprite( ballMaterial );
		ballSprite.scale.set( 32, 32, 1.0 );
		ballSprite.position.set( 50, 50, 0 );
		sceneHUD.add( ballSprite );	

	}

	function drawRectButton(baseX, baseY, left) {
		//var material = new THREE.SpriteMaterial();
		var material = new THREE.SpriteMaterial({color:  0xffffff});
		for ( var x = -2.5; x < 2.5; x+=0.3 ) {
			for ( var y = -2.5; y < 2.5; y+=0.3 ) {
				// 创建粒子
				var sprite = new THREE.Sprite( material );
				// 设置其位置
				var sx = x * 10 + baseX;
				var sy = y * 10 + baseY;
				var sz = 0;
				sprite.position.set( sx, sy, sz );
				// Tween 动画轨迹
				sprite.x = sprite.position.x;
				sprite.y = sprite.position.y;
				sprite.z = sprite.position.z;
				sprite.sx = sx;
				sprite.sy = sy;
				sprite.sz = sz;
				var tween = new TWEEN.Tween(sprite)
					.to({ x: sx + (Math.random() - 0.5)*100, y: sy + (Math.random() - 0.5)*100, z: sz}, 1000);
					//.start();
				tween.onUpdate(function() {
					this.position.set( this.x, this.y, this.z );
				});
				tween.onComplete(function() {
					let tweenEnd = new TWEEN.Tween(this)
					.to({ x: this.sx, y: this.sy, z: this.sz }, 500)
					.start();
					tweenEnd.onUpdate(function() {
						this.position.set( this.x, this.y, this.z );
					});
					//this.position.set( this.sx, this.sy, this.sz );
					//this.x = this.sx;
					//this.y = this.sy;
					//this.z = this.sz;
				});
				// 添加到记录
				if (left) {
					lRect.push( sprite );
					lRectTween.push( tween );
				} else {
					rRect.push( sprite );
					rRectTween.push( tween );
				}
				// 添加到场景
				sceneHUD.add( sprite );
			}
		}
	}

	function calcR(x, y) {
		var tmp = x*x + y*y;
		return Math.sqrt(tmp);
	}

	function drawRoundButton(baseX, baseY, left) {
		var material = new THREE.SpriteMaterial();
		for ( var x = -2.5; x < 2.5; x+=0.2 ) {
			for ( var y = -2.5; y < 2.5; y+=0.2 ) {
				var distance = calcR(x, y);
				if (distance > 2.5) {
					continue;
				} 
				// 创建粒子
				var sprite = new THREE.Sprite( material );
				// 设置其位置
				sprite.position.set( x * 10 + baseX, y * 10 + baseY, 0 );
				// 添加到记录
				if (left) {
					lRound.push( sprite );
				} else {
					rRound.push( sprite );
				}
				// 添加到场景
				sceneHUD.add( sprite );
			}
		}
	}

	function drawTriButton(baseX, baseY, left) {
		var material = new THREE.SpriteMaterial();
		for ( var x = -2.5; x < 2.5; x+=0.2 ) {
			for ( var y = -2.5; y < 2.5; y+=0.2 ) {
				var d1 = 2*x - y + 2.5;
				var d2 = 2*x + y - 2.5;
				if (d1 >= 0 && d2 < 0) {
					// 创建粒子
					var sprite = new THREE.Sprite( material );
					// 设置其位置
					sprite.position.set( x * 10 + baseX, y * 10 + baseY, 0 );
					// 添加到记录
					if (left) {
						lTri.push( sprite );
					} else {
						rTri.push( sprite );
					}
					// 添加到场景
					sceneHUD.add( sprite );
				}
			}
		}
	}


	function drawAllButton() {
		/*
		* 六个button坐标
		* w/5, h/5
		* w/5, 0
		* w/5, -h/5
		* -w/5, h/5
		* -w/5, 0
		* -w/5, -h/5
		* 对应每个button区域：button坐标 +/-30范围内
		*/
		//left
		var baseX = window.innerWidth/5 , baseY = window.innerHeight/5;
		drawRectButton(baseX, baseY, false);
		baseY = 0;
		drawRoundButton(baseX, baseY, false);
		baseY = -window.innerHeight/5;
		drawTriButton(baseX, baseY, false);
		//right	
		baseX = -window.innerWidth/5;
		drawRectButton(baseX, baseY, true);
		baseY = 0;
		drawRoundButton(baseX, baseY, true);
		baseY = window.innerHeight/5;
		drawTriButton(baseX, baseY, true);
	}

	function activeTween (tweenArr) {
		for ( let i = 0; i < tweenArr.length; i++) {
			tweenArr[i].start();
		}
	}

	function inactiveTween (tweenArr) {
		for ( let i = 0; i < tweenArr.length; i++) {
			tweenArr[i].stop();
		}
	}

	function loadMusic() {
		let bufferLoader = new BufferLoader(
			audioContext,
			[
			'http://localhost:3000/sounds/demo.mp3',
			'http://localhost:3000/sounds/demo2.mp3',
			],
			function(bufferList) {
				console.log("success get music");
				for (let i = 0; i < bufferList.length; i++) {
					var source = audioContext.createBufferSource();
					source.buffer = bufferList[i];
					let preCompressorGainNode = audioContext.createGain();
					preCompressorGainNode.gain.value = 0.9;
					source.connect(preCompressorGainNode);
					preCompressorGainNode.connect(compressorNode);
					source.loop = true;
					source.start();
					volumeNode[i + 1] = preCompressorGainNode;
					if (i != 0) preCompressorGainNode.gain.value = 0;
				}
			}
		);
		bufferLoader.load();
	}

	function kickstart(e) {
	//	sorolletPlayer.addEventListener('rowChanged', function(e) {
			var order = e.order,
				row = e.row,
				r;
			//var thePattern = sorolletPlayer.patterns[sorolletPlayer.orderList[order]];
			//var theCell = thePattern.getCell(row, 0);
			var bdNote = e.note;

			if(bdNote !== null && bdNote === 48) {
				boom += 5;
				textScale += 0.5;

				if(order < MAIN_ORDER) {
					r = 20;
					cameraTween.stop();
					cameraTween.to({
						x: rrand(-r*2, r*2),
						y: rrand(-r, r),
						z: camera.position.z + 0.025
					}, 200).start();
				}

			}

			// If first order, first row -- fade tris in
			if(order === 0 && row === 0) {
				tris.material.uniforms.opacity.value = 0;
				tris.materialTween.to({ opacity: 0.5 }, 16000)
					.start();
			}

			if(order < MAIN_ORDER) {

				if(row < 16 || (row > 32 && row < 48)) {
					switchText();
				} else {
					console.log("hehe");
					//switchText();
				}

			} else {

				// Things that happen when there's a KICK
				if(row % 4 === 0 || bdNote && bdNote === 48) {

					r = 300;

					cameraTween.stop()
						.easing(TWEEN.Easing.Exponential.Out)
						.to({
							x: rrand(-r, r),
							y: rrand(-r, r),
							z: rrand(r / 2, r)
						}, 400)
						.start();

					// 'bump'
					root.positionTween
						.stop()
						.to({
							y: [-150, 50, 0]
						}, 200)
						.start();

					tris.materialTween.stop();
					tris.materialTween.properties.opacity = 0;
					tris.materialTween.to({ opacity: [0.75, 0] }, 500)
						.start();

				}

				if(row % 8 === 0) {

					cameraTargetTween
						.stop()
						.to({
							x: rrand(-20, 20),
							y: rrand(-5, 5),
							z: 10 + 3 * Math.sin(Date.now() * 0.001)
						}, 1000)
						.start();

					switchText();

				}

				if(row % 8 === 0) {

					var rot = Math.PI * 0.05;

					root.rotationTween
						.stop()
						.to({
							x: root.rotation.x + rrand(-rot, rot),
							z: root.rotation.z + rrand(-rot, rot)
						}, 500)
						.start();

				}
			
			}
		
//		}, false);
	}

	function playBoom() {
		let index = Math.floor(Math.random() * 5);
		var source = audioContext.createBufferSource();
		source.buffer = boomList[index];
		let preCompressorGainNode = audioContext.createGain();
		preCompressorGainNode.gain.value = 10;
		source.connect(preCompressorGainNode);
		preCompressorGainNode.connect(compressorNode);
		source.start();
	}

	function volumeAdjust(index, delta) {
		delta *= 2;
		console.log("volume adjust " + index + " " + delta);
		if (volumeNode[index]) {
			volumeNode[index].gain.value += delta;
			if (volumeNode[index].gain.value < 0) volumeNode[index].gain.value = 0;
		}
		//if (volumeNode[index].gain.value > 2) 
	}

	function setLeapMotion() {
		let bufferLoader = new BufferLoader(
			audioContext,
			[
			'http://localhost:3000/sounds/0.wav',
			'http://localhost:3000/sounds/1.wav',
			'http://localhost:3000/sounds/2.wav',
			'http://localhost:3000/sounds/3.wav',
			'http://localhost:3000/sounds/4.wav',
			],
			function(bufferList) {
				for (let i = 0; i < bufferList.length; i++) {
					boomList[i] = bufferList[i];
					// var source = audioContext.createBufferSource();
					// source.buffer = bufferList[i];
					// let preCompressorGainNode = audioContext.createGain();
					// preCompressorGainNode.gain.value = 10;
					// source.connect(preCompressorGainNode);
					// preCompressorGainNode.connect(compressorNode);
					// //source.loop = true;
					// source.start();
				}
			}
		);
		bufferLoader.load();

		Leap.loop(controllerOptions, function(frame) {

            var iBox = frame.interactionBox;

            var handPos = [];
            if (frame.hands.length > 0) {
                for (var i = 0; i < frame.hands.length; i++) {
                    var hand = frame.hands[i];
                    //if (handPos[pointable.handId]) continue;

                    var leapPoint = hand.stabilizedPalmPosition;
                    var normalizedPoint = iBox.normalizePoint(leapPoint, true);
                    var appX = normalizedPoint[0] * appWidth - appWidth / 2;
                    var appY = normalizedPoint[1] * appHeight - appHeight / 2;
                    handPos[hand.id] = {x: appX, y: appY};
                    console.log("hand " + hand.id);
                    if (!down[hand.id]) down[hand.id] = 0;

                    if (prevHandPos[hand.id] && prevHandPos[hand.id].y > handPos[hand.id].y) {
						down[hand.id] ++;
						if (appX > - appWidth / 2 && appX < appWidth / 2 && hand.fingers) {
							let extFingers = 0;
							for (let j = 0; j < hand.fingers.length; j++)
								if (hand.fingers[j].extended) extFingers ++;
							volumeAdjust(extFingers, -(prevHandPos[hand.id].y - handPos[hand.id].y) / appHeight);
						}
					}
                    else if (prevHandPos[hand.id] && prevHandPos[hand.id].y + 1 < handPos[hand.id].y) {
						if (appX > - appWidth / 2 && appX < appWidth / 2 && hand.fingers) {
							let extFingers = 0;
							for (let j = 0; j < hand.fingers.length; j++)
								if (hand.fingers[j].extended) extFingers ++;
							volumeAdjust(extFingers, -(prevHandPos[hand.id].y - handPos[hand.id].y) / appHeight);
						}
						else {
							if (down[hand.id] > 1) {
								console.log("Boom!");
								playBoom();
								console.log("hand_" + hand.id + " " + JSON.stringify(handPos[hand.id]));
							}
							down[hand.id] = 0;
						}
                    }
					else down[hand.id] ++;
                    prevHandPos = handPos;
                }
            }
		});
	}
	function setup() {
		renderer = new THREE.WebGLRenderer({ antialias: false });
		renderer.setClearColor( 0x383733, 1.0 );
		
		document.getElementById('renderer').appendChild(renderer.domElement);

		window.addEventListener('resize', onResize, false);
		onResize();
		
		// 3D paraphernalia setup
		graphicsSetup();


		// Audio setup
		audioSetup();
		loadMusic();
		setLeapMotion();

		// Event listeners setup


		// also check for some more things on order changes
		// sorolletPlayer.addEventListener('orderChanged', function(e) {
		// 	var order = e.order;
		// 	if(order >= MAIN_ORDER && order < ENDING_ORDER + 2) {
		// 		root.add(grid);
		// 		grid.materialTween.start();
		// 	} else {
		// 		root.remove(grid);
		// 	}

		// }, false);

		window.addEventListener('keyup', onKeyUp, false);

		// Finally start playing!
		// what was that thing that didn't quite work on Chrome if this was done too early due to some GC thingy? TODO check that out!
		// jsAudioNode.connect( audioContext.destination );
		
		//sorolletPlayer.play();
	
	}

	function onKeyUp(e) {
		
		var code = e.keyCode,
			newOrder = -1,
			numOrders = sorolletPlayer.orderList.length;

		if(code === 37) {
			
			// left == rewind
			newOrder = songOrder - 1;
			if(newOrder < 0) {
				newOrder = numOrders - 1;
			}

		} else if(code === 39) {

			// right
			newOrder = songOrder + 1;
			if(newOrder >= numOrders) {
				newOrder = 0;
			}

		} else if(code === 68) {
		
			// toggle showing synths debug panel
			var debug = document.getElementById('debug'),
				ds = debug.style;

			if(ds.display === 'block') {
				ds.display = 'none';
			} else {
				ds.display = 'block';
			}

			var info = document.getElementById('info');
			info.style.display = ds.display;

		}

		if(newOrder > -1) {
			sorolletPlayer.jumpToOrder(newOrder, songRow);
		}
	}

	function updateCamera(time, deltaTime, order, pattern, row) {

		var cameraFOV = 45;
		
		if(order >= MAIN_ORDER) {
			cameraFOV = 110 + 40*Math.sin(time*0.05);
		}

		camera.fov = cameraFOV;
		camera.updateProjectionMatrix();
		camera.lookAt(cameraTarget);

	}

	function updateEffect(time, deltaTime, order, pattern, row) {
		
		// Text
		var tScale, activeTextChildren, activeTextNumChildren, range = 0.06;

		if(order < MAIN_ORDER) {
			tScale = textScale + rrand(0, 0.1);
			var elapsedRows = (order * 64 + row);
			range += 0.5 * (1 - elapsedRows / 128.0);
			tris.material.uniforms.time.value += 0.0005;
		} else {
			tScale = 80;
			tris.material.uniforms.time.value += 0.01;
		}

		activeText.scale.set(tScale, tScale, tScale);

		activeTextChildren = activeText.children;
		activeTextNumChildren = activeTextChildren.length;

		for(var i = 0; i < activeTextNumChildren; i++) {
			var child = activeTextChildren[i];
			child.position.set(rrand(-range, range), rrand(-range, range), rrand(-range, range));
		}


		// TODO vertically downwards moving text

		updateCamera(time, deltaTime, order, pattern, row);

	}

	function switchText() {
		if (activeText == textKLAWI) {
			activeText = textPlayYourHeart;
			root.remove(textKLAWI);
		} else if (activeText == textPlayYourHeart) {
			activeText = textHackPKU;
			root.remove(textPlayYourHeart);
		} else {
			activeText = textKLAWI;
			root.remove(textHackPKU);
		}
		root.add(activeText);
	}


	function updateInfo() {
		info.innerHTML = 'order ' + songOrder + ': ' + songPattern + '/' + songRow + 
			'<br />cam x=' + camera.position.x.toFixed(2) + ' y=' + camera.position.y.toFixed(2) + ' z= ' + camera.position.z.toFixed(2) +
			'<br />target x=' + cameraTarget.x.toFixed(2) + ' y=' + cameraTarget.y.toFixed(2) + ' z= ' + cameraTarget.z.toFixed(2) +
			'<br />' + sorolletPlayer.finished;

	}

	function rrand(min, max) {
		return min + Math.random() * (max - min);
	}

	function onResize() {
		var w = window.innerWidth,
			h = window.innerHeight;

		renderer.setSize(w, h);

		if(camera) {
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
		}
	}

	function render() {
		
		var t = Date.now() * 0.001;

		TWEEN.update();

		updateEffect(t, t - lastRenderTime, songOrder, songPattern, songRow);
		lastRenderTime = t;

		
		renderer.render( scene, camera );

		renderer.autoClear = false;
		// HOD render
		// Render HUD on top of the scene.
    	renderer.render(sceneHUD, cameraHUD);
		
		requestAnimationFrame( render );

	}

})();

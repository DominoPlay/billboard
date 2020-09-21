/** @license
 * DHTML Snowstorm! JavaScript-based Snow for web pages
 * --------------------------------------------------------
 * Version 2.0, EXPERIMENTAL DEV/WORK-IN-PROGRESS build
 * (Previous rev: 1.41.20101113)
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/snowstorm/license.txt
*/

/*global window, document, navigator, clearInterval, setInterval */
/*jslint white: false, onevar: true, plusplus: false, undef: true, nomen: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true */

var snowStorm = (function(window, document) {

  // --- common properties ---

  this.flakesMax = 128;           // Limit total amount of snow made (falling + sticking)
  this.flakesMaxActive = 48;      // Limit amount of snow falling at once (less = lower CPU use)
  this.flakesMinActive = 24;      // Try to keep at least X flakes active at all times
  this.flakeScale = 1.0;          // Percentage to scale flakes (1.0 default = normal size)
  this.animationInterval = 42;    // Theoretical "miliseconds per frame" measurement. 20 = fast + smooth, but high CPU use. 50 = more conservative, but slower
  this.excludeMobile = true;      // Snow is likely to be bad news for mobile phones' CPUs (and batteries.) By default, be nice.
  this.flakeBottom = null;        // Integer for Y axis snow limit, 0 or null for "full-screen" snow effect
  this.followMouse = true;        // Snow movement can respond to the user's mouse
  this.snowColor = '#fff';        // Don't eat (or use?) yellow snow.
  this.snowCharacter = '&bull;';  // &bull; = bullet, &middot; is square on some systems etc.
  this.snowStick = true;          // Whether or not snow should "stick" at the bottom. When off, will never collect.
  this.targetElement = null;      // element which snow will be appended to (null = document.body) - can be an element ID eg. 'myDiv', or a DOM node reference
  this.useMeltEffect = true;      // When recycling fallen snow (or rarely, when falling), have it "melt" and fade out if browser supports it
  this.useTwinkleEffect = false;  // Allow snow to randomly "flicker" in and out of view while falling
  this.usePositionFixed = false;  // true = snow does not shift vertically when scrolling. May increase CPU load, disabled by default - if enabled, used only where supported
  this.useOpacity = true;         // transparency effects for background/distant items

  // --- less-used bits ---

  this.freezeOnBlur = true;       // Only snow when the window is in focus (foreground.) Saves CPU.
  this.flakeLeftOffset = 0;       // Left margin/gutter space on edge of container (eg. browser window.) Bump up these values if seeing horizontal scrollbars.
  this.flakeRightOffset = 0;      // Right margin/gutter space on edge of container
  this.flakeWidth = 15;           // Max pixel width reserved for snow element
  this.flakeHeight = 15;          // Max pixel height reserved for snow element
  this.vMaxX = 3;                 // Maximum X velocity range for snow
  this.vMaxY = 2;                 // Maximum Y velocity range for snow
  this.zIndex = 0;                // CSS stacking order applied to each snowflake

  /**
   * --- WARNING: These features may not be supported in all browsers. ---
   * They may also cause really high CPU use; here be dragons, etc. Tread carefully.
   * Web font rendering may be crap without font smoothing, but depends on user setup.
   * CSS transforms, if not hardware-accelerated, will eat up lots of CPU.
  */

  this.useScaling = true;         // flakes shrink to the same small size as they drop towards the bottom.
  this.useWebFont = true;         // (if supported by browser) use embedded EOT/TTF/WOFF font file for real snowflake characters
  this.use2DRotate = true;        // (if supported by browser) 2D CSS transforms: rotating snow
  this.use3DRotate = true;        // (if supported by browser) additional 3D CSS transform effect

  this.scaleOffset = 60; // (experimental) vertical offset before scaling begins to take effect.


// this.useOpacity = true;

// this.useWebFont = this.use2DRotate = this.use3DRotate = false;

/*
 this.useScaling = false;
 this.useOpacity = false;
*/

// this.useWebFont = false;

// this.use3DRotate = false;

  // --- End of user section ---

  this.webFontCharacters = ['%','\'','(','6','7','j','C','e','f','o']; // characters for webflakes font (EOT/TTF/WOFF)
  this.webFontCharactersSubset = ['%','\'']; // if 2D/3D transforms enabled, may be too slow without hardware acceleration - use these simpler glyphs, lower CPU

  var s = this, storm = this, i, head, css, cssLink, cssText, text, node, activeCount, ua = navigator.userAgent,
  // UA sniffing and backCompat rendering mode checks for fixed position, etc.
  isIE = ua.match(/msie/i),
  isIE6 = ua.match(/msie 6/i),
  isMobile = ua.match(/mobile/i),
  isBackCompatIE = (isIE && document.compatMode === 'BackCompat'),
  isIOS = ua.match(/(ipad|iphone|ipod)/i),
  noFixed = (isMobile || isBackCompatIE || isIE6),
  screenX = null, screenX2 = null, screenY = null, scrollY = null, vRndX = null, vRndY = null,
  lastCreate = 0,
  windOffset = 1,
  angle = 0,
  windMultiplier = 1.1,
  windOffsetMax = windOffset*windMultiplier,
  vAmpMotionOffset = 1,
  orientation = 0,
  fixedForEverything = false,
  testDiv = document.createElement('div'),

  templates = {
    snow: null,
    snowCharacter: null
  },

  features = {

    opacity: (function(){
      try {
        testDiv.style.opacity = '0.5';
      } catch(e) {
        return false;
      }
      return true;
    }()),

    transforms: {
      ie:  (typeof testDiv.style['-ms-transform'] !== 'undefined' ? '-ms-transform' : null),
      moz: (typeof testDiv.style.MozTransform !== 'undefined' ? 'MozTransform' : null),
      opera: (typeof testDiv.style['OTransform'] !== 'undefined' ? 'OTransform' : null),
      webkit: (typeof testDiv.style.webkitTransform !== 'undefined' ? 'webkitTransform' : null),
      prop: null
    }
  },

  didInit = false,

  docFrag = document.createDocumentFragment();

  features.transforms.prop = (features.transforms.moz || features.transforms.webkit || features.transforms.ie || features.transforms.opera);

  this.timer = null;
  this.flakes = [];
  this.disabled = false;
  this.active = false;
  this.meltFrameCount = 20;
  this.meltFrames = [];
  this.types = 100;

  this.timing = {

    frameCount: 0,
    timestamp: 0,
    lastTimestamp: 0,
    wasSlow: null,
    slowInterval: Math.max(50,s.animationInterval*1.1),

    ping: function() {

      s.timing.lastTimestamp = new Date().getTime();
      if (s.timing.frameCount++ > s.timing.slowInterval) {
        // we've probably sampled enough, restart.
        s.timing.reset();
      }

    },

    tooSlow: function() {

      var isSlow = (s.timing.report() > s.timing.slowInterval);
      if (isSlow) {
        s.timing.wasSlow = true;
      }
      return isSlow;

    },

    reset: function(offset) {

      s.timing.frameCount = 0;
      s.timing.timestamp = new Date().getTime()+(offset||0);
      if (s.timing.wasSlow === false && s.flakesMaxActive < s.flakesMax-1) {
        s.flakesMaxActive += 2; // allow this to climb slightly
      }
      s.timing.wasSlow = false;

    },

    report: function() {

      if (s.timing.frameCount < 1) {
        return 0;
      } else {
        return (parseInt((s.timing.lastTimestamp-s.timing.timestamp)/s.timing.frameCount,10));
      }

    }

  };


  this.events = (function() {

    var old = (!window.addEventListener && window.attachEvent), slice = Array.prototype.slice,
    evt = {
      add: (old?'attachEvent':'addEventListener'),
      remove: (old?'detachEvent':'removeEventListener')
    };

    function getArgs(oArgs) {
      var args = slice.call(oArgs), len = args.length;
      if (old) {
        args[1] = 'on' + args[1]; // prefix
        if (len > 3) {
          args.pop(); // no capture
        }
      } else if (len === 3) {
        args.push(false);
      }
      return args;
    }

    function apply(args, sType) {
      var element = args.shift(),
          method = [evt[sType]];
      if (old) {
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }
    }

    function addEvent() {
      apply(getArgs(arguments), 'add');
    }

    function removeEvent() {
      apply(getArgs(arguments), 'remove');
    }

    return {
      add: addEvent,
      remove: removeEvent
    };

  }());

  function rnd(n,min) {

    if (isNaN(min)) {
      min = 0;
    }
    return (Math.random()*n)+min;

  }

  function plusMinus(n) {
    return (parseInt(rnd(2),10)===1?n*-1:n);
  }

  function checkFontFace() {

    /**
     * CSS @font-face detection code: Modernizr.js library (BSD/MIT) by Faruk Ates and Paul Irish
     * http://www.modernizr.com/
     * Their code credits Diego Perini's CSS support script
     * http://javascript.nwbox.com/CSSSupport/
    */

    var sheet,
        style = document.createElement('style'),
        impl = document.implementation || { hasFeature: function() { return false; } },
        supportAtRule;

    style.type = 'text/css';
    head.insertBefore(style, head.firstChild);
    sheet = style.sheet || style.styleSheet;

    // removing it crashes IE browsers
    // head.removeChild(style);

    supportAtRule = impl.hasFeature('CSS2', '') ? function(rule) {

      if (!(sheet && rule)) {
        return false;
      }
      var result = false;
      try {
        sheet.insertRule(rule, 0);
        result = !(/unknown/i).test(sheet.cssRules[0].cssText);
        sheet.deleteRule(sheet.cssRules.length - 1);
      } catch(e) {}
      return result;

    } : function(rule) {

      if (!(sheet && rule)) {
        return false;
      }
      sheet.cssText = rule;
      return sheet.cssText.length !== 0 && !(/unknown/i).test(sheet.cssText) && sheet.cssText.replace(/\r+|\n+/g, '').indexOf(rule.split(' ')[0]) === 0;

    };

    return supportAtRule('@font-face { font-family: "font"; src: "fonts/wwflakes-webfont.ttf"; }');

  }

  function addWebFont() {

    /**
     * Now we inject the CSSes (sneaky inline injection for most, external CSS file for IE.)
     * WWFlakes by Angela Lane (freeware, commercial use allowed): http://www.fontspace.com/windwalker64/wwflakes
     * Author's original site (1999): http://web.archive.org/web/20010211105631/members.nbci.com/windwalker64/index2.html
    */

    css = document.createElement('style');

    text = {
      rule: "@font-face",
      value: [
        "font-family: 'WWFlakesRegular';",
        "src: url('fonts/wwflakes-webfont.eot');",
        "src: local('☺'), url('fonts/wwflakes-webfont.woff') format('woff'), url('fonts/wwflakes-webfont.ttf') format('truetype');",
        "font-weight: normal;",
        "font-style: normal;"
      ]
    };

    cssText = text.rule + ' {\n' + text.value.join('\n') + '\n}';

    node = document.createTextNode(cssText);

    if (!isIE) {

      css.appendChild(node);
      head.appendChild(css);

    } else {

      /*
        var count = document.styleSheets.length;
        head.appendChild(css);
        document.styleSheets[count].addRule(text.rule, text.value.join('\n'));
        // css.innerHTML = 'body { color: #ff33ff; }'; // fails
      */

      cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.type = 'text/css';
      cssLink.href = 'wwflakes-webfont.css';
      head.appendChild(cssLink);

    }

  }

  this.getSnowCharacter = function() {

    var charset = (s.useWebFont ? (s.use2DRotate ? (features.transforms.webkit ? s.webFontCharacters : s.webFontCharactersSubset) : s.webFontCharactersSubset) : null);
    return (!charset ? s.snowCharacter : charset[parseInt(Math.random()*charset.length,10)]);

  };

  this.randomizeWind = function() {

    vRndX = plusMinus(rnd(s.vMaxX,0.2));
    vRndY = rnd(s.vMaxY,0.2);
    if (s.flakes) {
      for (var i=s.flakes.length; i--;) {
        if (s.flakes[i].active) {
          s.flakes[i].setVelocities();
        }
      }
    }

  };

  this.scrollHandler = function() {

    // "attach" snowflakes to bottom of window if no absolute bottom value was given
    scrollY = (s.flakeBottom?0:parseInt(window.scrollY||document.documentElement.scrollTop||document.body.scrollTop,10));
    if (isNaN(scrollY)) {
      scrollY = 0; // Netscape 6 scroll fix
    }
    if (!fixedForEverything && !s.flakeBottom && s.flakes) {
      for (var i=s.flakes.length; i--;) {
        if (s.flakes[i].active === 0) {
          s.flakes[i].stick();
        }
      }
    }

  };

  this.resizeHandler = function() {

    if (window.innerWidth || window.innerHeight) {
      screenX = window.innerWidth-(!isIE?2:2)-s.flakeRightOffset;
      screenY = (s.flakeBottom?s.flakeBottom:window.innerHeight);
    } else {
      screenX = (document.documentElement.clientWidth||document.body.clientWidth||document.body.scrollWidth)-(!isIE?8:-0)-s.flakeRightOffset;
      screenY = s.flakeBottom?s.flakeBottom:(document.documentElement.clientHeight||document.body.clientHeight||document.body.scrollHeight);
    }
    if (screenY < (document.body.scrollHeight)) {
      // account for vertical scrollbar, too
      screenX -= 16;
    }
    screenX2 = parseInt(screenX/2,10);

  };

  this.resizeHandlerAlt = function() {

    screenX = s.targetElement.offsetLeft+s.targetElement.offsetWidth-s.flakeRightOffset;
    screenY = s.flakeBottom?s.flakeBottom:s.targetElement.offsetTop+s.targetElement.offsetHeight;
    screenX2 = parseInt(screenX/2,10);

  };

  this.motionHandler = function(motionObj) {

    // tilt/motion detection, gyroscope on the iDevices
    // this event fires continuously in iOS 4.2 with "null" if no motion? lame?

    var mX = motionObj.x,
        mY = motionObj.y,
        max = 1, // todo: refactor
        tmp;

    if (orientation === -90 || orientation === 90) {
      // handle rotation.
      tmp = mX;
      mX = mY;
      mY = tmp;
    }

    if (vRndX < 0) { // always be +ve for iOS, so snow always falls in direction of phone tilt.
      vRndX = Math.abs(vRndX);
    }

    if (mX !== null) {
      if (orientation === 90) {
        // rotated case, flipped X axis
        mX *= -1;
      }
      if (mX < 0) {
        mX = Math.max(-max, mX)/max; // normalize, scale
        windOffset = Math.max(-windOffsetMax, windOffset+(windMultiplier*mX));
      } else if (mX > 0) {
        mX = Math.min(max, mX)/max;
        windOffset = Math.min(windOffsetMax, windOffset+(windMultiplier*mX));
      }
    } else {
      // normalize down to ~1
      if (Math.abs(windOffset) > 0.1) {
        windOffset *= 0.9;
      }
    }

    if (mY !== null) {
      if (orientation === -90) {
        // rotated case, flipped Y axis
        mY *= -1;
      }
      if (mY < 0) { // phone tilting upward - move snow up.
        mY = Math.max(-max, mY)/max;
        if (vAmpMotionOffset < 1) {
          vAmpMotionOffset -= mY;
        }
      } else if (mY > 0) { // phone tilting downward.
        mY = Math.min(max, mY)/max;
        if (vAmpMotionOffset > -1) {
          vAmpMotionOffset -= mY; // -= mY;
        }
      }
    }

  };

  this.tiltHandler = {

    iOS: function(e) {
      s.motionHandler({
        x: e.accelerationIncludingGravity.x/8,
        y: e.accelerationIncludingGravity.y/8
      });
    },

    moz: function(oData) {
      s.motionHandler({
        x: oData.x*-1,
        y: oData.y
      });
    }

  };

  this.orientationHandler = {

    iOS: function(e) {
      orientation = window.orientation;
    },
    moz: {}

  };

  this.freeze = function() {

    // pause animation
    if (!s.disabled) {
      s.disabled = 1;
    } else {
      return false;
    }
    clearInterval(s.timer);

  };

  this.resume = function() {

    if (s.disabled) {
       s.disabled = 0;
    } else {
      return false;
    }
    s.timerInit();

  };

  this.toggleSnow = function() {

    if (!s.flakes.length) {
      // first run
      s.start();
    } else {
      s.active = !s.active;
      if (s.active) {
        s.show();
        s.resume();
      } else {
        s.stop();
        s.freeze();
      }
    }

  };

  this.stop = function() {

    this.freeze();
    for (var i=this.flakes.length; i--;) {
      this.flakes[i].hide();
    }
    s.events.remove(window,'scroll',s.scrollHandler);
    s.events.remove(window,'resize',s.resizeHandler);
    if (s.freezeOnBlur) {
      if (isIE) {
        s.events.remove(document,'focusout',s.freeze);
        s.events.remove(document,'focusin',s.resume);
      } else {
        s.events.remove(window,'blur',s.freeze);
        s.events.remove(window,'focus',s.resume);
      }
    }

  };

  this.show = function() {

    for (var i=this.flakes.length; i--;) {
      this.flakes[i].show();
    }

  };

  this.SnowFlake = function(parent,type,x,y) {

    var s = this, storm = parent, style = [], boxOffsetW = storm.useWebFont?1:0, boxOffsetH = storm.useWebFont?3:0, origType = type, rndNumber = Math.random(1);
    this.type = null;
    this.x = x||parseInt(rnd(screenX-20),10);
    this.y = (!isNaN(y)?y:-rnd(screenY)-12);
    this.vX = null;
    this.vY = null;
    this.angle = 0;
    this.angleOffset = parseInt(Math.random()*360,10);
    this.angleMultiplier = plusMinus(Math.random()*2);
    this.rotateDirection = plusMinus(1+plusMinus(Math.random()*1));
    this.vAmp = null;
    this.melting = false;
    this.meltFrameCount = storm.meltFrameCount;
    this.meltFrames = storm.meltFrames;
    this.meltFrame = 0;
    this.twinkleFrame = 0;
    this.active = 1;
    this.fontSize = null;
    this.scale = null;
    // this.sway = 0; // parseInt(Math.random()*360);
    this.opacity = null; // more opacity for background items
    this.character = storm.getSnowCharacter();
    this.o = templates.snow.cloneNode(true);
    this.oNode = (storm.useWebFont?this.o.childNodes[0]:this.o);
    this.oNode.innerHTML = this.character;
    this.flakeWidth = null;
    this.flakeHeight = null;
    this.visible = false;

    docFrag.appendChild(this.o);

    this.setType = function(type) {

      if (s.type === type || s.melting) {
        return false;
      }

      s.type = type;
      s.vAmp = 1+(type/storm.types*2);
      s.fontSize = (9+(type/storm.types)*(storm.useWebFont?14:10)*storm.flakeScale);
      s.scale = (type/storm.types);
      s.opacity = 0.5+(((type+1)/storm.types)*0.5); // more opacity for background items
      s.setOpacity(s.o,s.opacity);
      s.flakeWidth = s.fontSize+boxOffsetW;
      s.flakeHeight = s.fontSize+boxOffsetH;

      if (!storm.useWebFont) {

        // slight vertical tweak for plain-text snowflakes, bottom align
        s.oNode.style.marginBottom = -(s.flakeHeight/2.35)+rndNumber+'px'; // -Math.random(1)+'px';

        s.oNode.style.lineHeight = (s.flakeHeight+4)+'px'; // (Math.floor(s.fontSize)+7)+'px';

      }

      // w/h may need to be fixed for web fonts
      s.o.style.fontSize = s.fontSize+'px';
      s.o.style.width = s.flakeWidth+'px';
      s.o.style.height = s.flakeHeight+'px';

    };

    this.refresh = function(bForce) {

      if (isNaN(s.x) || isNaN(s.y) || (!bForce && s.y < -s.flakeHeight)) {

        // discard NaN and off-screen values, unless forced from recycle or init etc.
        return false;

      }

      s.o.style.left = s.x+'px';
      s.o.style.top = s.y+'px';

    };

    this.stick = function() {

      if (noFixed || (storm.targetElement !== document.documentElement && storm.targetElement !== document.body)) {

        s.y = (screenY+scrollY-s.flakeHeight-(isIE && storm.useWebFont?1:0));
        s.o.style.top = s.y+'px';

      } else if (storm.flakeBottom) {

        s.o.style.top = storm.flakeBottom+'px';

      } else {

        s.hide();
        s.o.style.top = 'auto';
        s.o.style.bottom = '0px';
        s.o.style.position = 'fixed';
        s.show();

      }

    };

    this.vCheck = function() {

      if (s.vX>=0 && s.vX<0.2) {

        s.vX = 0.2;

      } else if (s.vX<0 && s.vX>-0.2) {

        s.vX = -0.2;

      }

      if (s.vY>=0 && s.vY<0.2) {

        s.vY = 0.2;

      }

    };

    this.applyTransform = function(angle) {

      if (storm.use2DRotate && s.y >= -s.flakeHeight && (features.transforms.webkit || this.fontSize >= 14)) {

        var angle2 = Math.abs(Math.min(3,s.angleOffset+(angle*s.angleMultiplier)));

        if (!storm.use3DRotate || !features.transforms.webkit) {

          // angle
          style.push('rotate('+angle+'deg)');

        } else {

          if (Math.abs(angle2) > 360) {

            angle2 = 0;

          }

          style.push('rotate('+angle+'deg) rotate3D(0,1,0,'+angle2+'deg)'); // should be hardware-accelerated // s.angleOffset+(angle*s.angleMultiplier)

        }

        s.oNode.style[features.transforms.prop] = style.join(' '); // apply directly to the text element
        style = [];

      }

    };

    this.move = function() {

      var vX = s.vX*(windOffset*s.scale), yDiff, diffScale;
      s.x += vX;
      s.y += (s.vY*s.vAmp*vAmpMotionOffset);

/*
      // apply sway, if needed
      s.sway += 2.5; // * s.rotateDirection);
      if (Math.abs(s.sway) >= 360) {
        s.sway = 0;
      }
      s.swayX = Math.sin(s.sway*Math.PI/180)*s.flakeWidth*1.5;
      // s.swayX = 0;
      // s.o.style.marginLeft = s.swayX+'px';
*/
      if (s.x >= screenX || screenX-s.x < s.flakeWidth) { // X-axis scroll check

        s.x = 0; // -s.flakeWidth causes scrollbars in Firefox. :/

      } else if (vX < 0 && s.x-storm.flakeLeftOffset < 0-s.flakeWidth) {

        s.x = screenX-s.flakeWidth-1; // flakeWidth;

      }


// TODO: vX + sway = direction (left or right)
// determine final position based on direction + offset

/*
      if (s.x + s.swayX >= screenX || screenX - s.x + s.swayX < s.flakeWidth) { // X-axis scroll check

        s.x = 0; // -s.flakeWidth causes scrollbars in Firefox. :/

      } else if (vX + s.swayX <= 0 && s.x + s.swayX - storm.flakeLeftOffset < -s.flakeWidth) {

        s.x = screenX - s.flakeWidth + s.swayX - 1; // flakeWidth;

      }
*/
      yDiff = screenY + scrollY - s.y;
      // scale vertically according to distance?

      if (storm.useScaling) {

        // diffScale = Math.floor(Math.max(0, Math.min(storm.types, yDiff/(screenY+scrollY)*storm.types)));
        diffScale = Math.floor(Math.max(0, Math.min(storm.types, (yDiff*(100/storm.scaleOffset))/(screenY+scrollY)*origType)));
        // console.log(diffScale);
        s.setType(diffScale);

      }

      // s.setType(15-(yDiff/(screenY + scrollY)*15));

      if (storm.use2DRotate && features.transforms.prop) {

        s.angle += (5 * windOffset * s.rotateDirection);

        if (Math.abs(s.angle) >= 360) {

          s.angle = 0;

        }

        s.applyTransform(s.angle);

      }

      if (yDiff <= s.flakeHeight) {

        s.active = 0;

        if (storm.snowStick) {
          s.stick();
        } else {
          s.recycle();
        }

      } else {

        if (storm.useMeltEffect && s.active && s.type < 3 && !s.melting && Math.random()>0.998) {

          // ~1/1000 chance of melting mid-air, with each frame
          s.melting = true;
          s.melt();
          // only incrementally melt one frame
          // s.melting = false;

        }

        if (storm.useTwinkleEffect) {

          if (!s.twinkleFrame) {

            if (Math.random()>0.9) {

              s.twinkleFrame = parseInt(Math.random()*20,10);

            }

          } else {

            s.twinkleFrame--;
            s.o.style.visibility = (s.twinkleFrame && s.twinkleFrame%2===0?'hidden':'visible');

          }

        }

      }

      s.refresh();

    };

    this.animate = function() {

      // main animation loop
      // move, check status, die etc.
      s.move();

    };

    this.setVelocities = function() {

      s.vX = vRndX+rnd(storm.vMaxX*0.2,0.1);
      s.vY = vRndY+rnd(storm.vMaxY*0.2,0.1);

    };

    this.setOpacity = function(o,opacity) {

      if (storm.useOpacity && features.opacity) {

        o.style.opacity = opacity;

      }

    };

    this.melt = function() {

      if (!storm.useMeltEffect || !s.melting) {

        s.recycle();

      } else {

        if (s.meltFrame < s.meltFrameCount) {

          s.meltFrame++;
          s.setOpacity(s.o,s.opacity*s.meltFrames[s.meltFrame]);
          s.o.style.fontSize = s.fontSize-(s.fontSize*(s.meltFrame/s.meltFrameCount))+'px';
          /*
          var typeScale = parseInt(origType-(origType*(s.meltFrame/s.meltFrameCount)));
          s.setType(typeScale);
          */
          // s.o.childNodes[0].style.marginBottom = -(s.flakeHeight/2.35)-Math.random(1)+'px';

          if (!storm.useWebFont) {
            s.oNode.style.marginBottom = -(s.flakeHeight/2.35)-Math.random(1)+'px';
          }

        } else {

          s.recycle();

        }

      }

    };

    this.show = function() {

      if (!s.visible) {

        s.visible = true;
        s.o.style.display = 'block';

      }

    };

    this.hide = function() {

      if (s.visible) {

        s.visible = false;
        s.o.style.display = 'none';

      }

    };

    this.recycle = function(bOverride) {

      s.hide();
      s.meltFrame = 0;
      s.melting = false;

      if (bOverride || ((activeCount < storm.flakesMaxActive) && !s.active)) {

        s.o.style.position = (fixedForEverything?'fixed':'absolute');
        s.o.style.bottom = 'auto';
        s.setType(origType); // revert
        s.setVelocities();
        s.vCheck();
        s.setOpacity(s.o,s.opacity);
        s.o.style.padding = '0px';
        s.o.style.margin = '0px';
        s.o.style.fontSize = s.fontSize+'px';
        s.x = parseInt(rnd(screenX-s.flakeWidth-20),10);
        s.y = parseInt(rnd(screenY)*-1,10)-s.flakeHeight;
        s.refresh(true);
        s.show();
        s.active = 1;

      } else {

        s.active = 0; // ?

      }

    };

    this.setType(type);
    this.recycle(true); // set up x/y coords etc.
    this.refresh(true);

  };

  this.snow = function() {

    var active = 0, used = 0, waiting = 0, flake = null, i, forcingMelt = false, meltable = [], waitingFlakes = [], inactive = [], isSlow = storm.timing.tooSlow(), tmp, now;

    for (i=s.flakes.length; i--;) {

      if (s.flakes[i].active === 1) {

        s.flakes[i].move();

        if (isSlow && s.flakes[i].active === 1 && !s.flakes[i].melting) { //  && Math.random() > 0.5

          meltable.push(i);

        }

        active++;

      } else if (s.flakes[i].active === 0) {

        used++;
        inactive.push(i);

      } else {

        waiting++;
        waitingFlakes.push(i);

      }

      if (s.flakes[i].melting) {

        s.flakes[i].melt();

      }

    }

    activeCount = active; // storm.activeCount

    if (active > s.flakesMaxActive && meltable.length) {

      // we're over-limit.
      tmp = s.flakes[meltable[parseInt(Math.random()*meltable.length,10)]];
      tmp.melting = true;

    }

    if (isSlow && active > storm.flakesMinActive && meltable.length) { // don't melt everything away..

      // save the <strike>clock tower</strike> CPU!
      tmp = s.flakes[meltable[parseInt(Math.random()*meltable.length,10)]];
      tmp.melting = true;
      // .. and reset the timer, force re-calculation
      s.timing.reset();

    }

    if (isSlow) {

      if (s.flakesMaxActive > s.flakesMinActive) {

        // s.flakesMaxActive = Math.min(s.flakes.length, s.flakesMaxActive); // we're at our limit, so, no more than this.
        s.flakesMaxActive--;

      }

      if (inactive.length) {

        // recycle or melt an existing flake, get some more motion going
        tmp = s.flakes[inactive[parseInt(Math.random()*inactive.length,10)]];

        if (tmp.active === 0 && !s.snowStick) {

          tmp.recycle();

        } else {

          tmp.melting = true;

        }

      }

    }

    if (!isSlow && active < s.flakesMaxActive) {

      // maybe we have some waiting flakes we can start.

      if (meltable.length) {

        tmp = s.flakes[meltable[parseInt(Math.random()*meltable.length,10)]];
        tmp.melting = true;

      }

      flake = s.flakes[parseInt(rnd(s.flakes.length),10)];

      if (flake.active === 0) {

        flake.melting = true;

      }

    }

    if (s.flakes.length < s.flakesMaxActive && (s.flakes.length < s.flakesMinActive || !isSlow)) {

      // make more snow.
      now = new Date().getTime();

      if (now - lastCreate > 333) {

        lastCreate = now;
        s.createSnow(1, false);

      }

    }

    s.timing.ping();

    var estimatedFPS = Math.floor(s.timing.frameCount/(s.timing.lastTimestamp-s.timing.timestamp)*1000);
    if (!isNaN(estimatedFPS) && estimatedFPS !== Infinity && document.getElementById('active')) {
      document.getElementById('active').innerHTML = active +' of '+s.flakes.length+' (max active: '+s.flakesMaxActive+'), used: '+used+', waiting: '+waiting+', load: '+parseInt(storm.timing.report()/storm.timing.slowInterval*100,10)+'%, FPS: ~'+estimatedFPS+', slow: '+(s.timing.wasSlow?'true':'false');
    }

 
  };

  this.mouseMove = function(e) {

    if (!s.followMouse) {
      return true;
    }

    var x = parseInt(e.clientX,10);

    if (x<screenX2) {

      windOffset = -windMultiplier+(x/screenX2*windMultiplier);

    } else {

      x -= screenX2;
      windOffset = (x/screenX2)*windMultiplier;

    }

  };

  this.createTemplate = function() {

    templates.snow = document.createElement('div');
    templates.snow.className = 'snowflake';
    templates.snowCharacter = document.createElement('div');

    var o = templates.snow.style,
        oSnow = templates.snowCharacter.style;

    o.MozUserSelect = 'none';
    o.KhtmlUserSelect = 'none';
    o.WebkitlUserSelect = 'none';
    o.color = storm.snowColor;
    o.margin = '0px';
    o.padding = '0px';
    o.position = (fixedForEverything?'fixed':'absolute');
    o.fontFamily = (s.useWebFont?'WWFlakesRegular,':'')+'arial,verdana,sans-serif'; // "Arial Unicode MS","Lucida Sans Unicode",
    o.overflow = 'hidden'; // TODO: May only apply when using regular (non-web) font?
    o.fontWeight = 'normal';
    o.zIndex = storm.zIndex;

// o.outline = '1px solid #ff33ff';

    oSnow.display = 'block';
    oSnow.cursor = 'default';
    oSnow.position = 'absolute';
    oSnow.bottom = '0px';
    oSnow.left = '1px';

    oSnow.overflow = 'hidden'; // TODO: May only apply when using regular (non-web) font?

    if (storm.useWebFont) {
      templates.snow.appendChild(templates.snowCharacter);
    }

  };

  this.createSnow = function(limit,allowInactive) {

    for (var i=0; i<limit && s.flakes.length < s.flakesMax; i++) {

      s.flakes.push(new s.SnowFlake(s,parseInt(rnd(storm.types),10)));

      if (allowInactive || i > s.flakesMaxActive) {

        s.flakes[s.flakes.length-1].active = -1;

      }

    }

    storm.targetElement.appendChild(docFrag);

  };

  this.timerInit = function() {

    s.timing.reset(s.animationInterval);
    s.timer = setInterval(s.snow,s.animationInterval);

  };

  this.init = function() {

    function asciiCase() {

      // No support. Fall back to plain text.
      s.useWebFont = false;
      // Maybe disable rotate, too?
      // generally if no web font, no 2D rotate.
      s.use2DRotate = false;

    }

    if (s.useWebFont) {

      if (!ua.match(/blackberry/i) && checkFontFace()) {

        addWebFont();

      } else {

        asciiCase();

      }

    } else {

      asciiCase();

    }

    s.createTemplate();

    for (var i=0; i<s.meltFrameCount; i++) {

      s.meltFrames.push(1-(i/s.meltFrameCount));

    }

    orientation = (typeof window.orientation !== 'undefined' ? window.orientation:0);

    s.randomizeWind();
    s.createSnow(2); // create initial batch
    s.events.add(window,'devicemotion',s.tiltHandler.iOS); // iOS 4.2+, apparently based on w3 spec for motion
    s.events.add(window,'MozOrientation',s.tiltHandler.moz); // Firefox 3.6+
    s.events.add(document.body,'orientationchange',s.orientationHandler.iOS);
    s.events.add(window,'resize',s.resizeHandler);
    s.events.add(window,'scroll',s.scrollHandler);

    if (s.freezeOnBlur) {

      if (isIE) {

        s.events.add(document,'focusout',s.freeze);
        s.events.add(document,'focusin',s.resume);

      } else {

        s.events.add(window,'blur',s.freeze);
        s.events.add(window,'focus',s.resume);

      }

    }

    s.resizeHandler();
    s.scrollHandler();

    if (s.followMouse) {
      s.events.add(isIE?document:window,'mousemove',s.mouseMove);
    }

    s.animationInterval = Math.max(20,s.animationInterval);
    s.timerInit();

  };

  this.start = function(bFromOnLoad) {

    if (!didInit) {

      didInit = true;

    } else if (bFromOnLoad) {

      // already loaded and running
      return true;

    }

    if (typeof s.targetElement === 'string') {

      var targetID = s.targetElement;
      s.targetElement = document.getElementById(targetID);

      if (!s.targetElement) {

        throw new Error('Snowstorm: Unable to get targetElement "'+targetID+'"');

      }

    }

    if (!s.targetElement) {

      s.targetElement = (!isIE?(document.documentElement?document.documentElement:document.body):document.body);

    }

    if (s.targetElement !== document.documentElement && s.targetElement !== document.body) {

      s.resizeHandler = s.resizeHandlerAlt; // re-map handler to get element instead of screen dimensions

    }

    head = document.getElementsByTagName('head')[0];
    s.resizeHandler(); // get bounding box elements
    s.usePositionFixed = (s.usePositionFixed && !noFixed); // whether or not position:fixed is supported
    fixedForEverything = s.usePositionFixed;

    if (screenX && screenY && !s.disabled) {

      s.init();
      s.active = true;

    }

  };

  function doStart() {

    if ((this.excludeMobile && !isMobile) || !this.excludeMobile) {

      window.setTimeout(function() {

        s.start(true);

      }, 20);

    }

    // event cleanup
    s.events.remove(window, 'load', doStart);

  }

  // hooks for starting the snow
  s.events.add(window, 'load', doStart, false);

  return this;

}(window, document));
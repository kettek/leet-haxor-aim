window.addEventListener('load', function() {
/* ==== Private Variables ==== */
var eShoot      = document.getElementById('shoot');
var eHud        = document.getElementById('hud');
var eScoreboard = document.getElementById('scoreboard');
var eScoreHits  = document.getElementById('scoreboard-hits');
var eScoreHitsP = document.getElementById('scoreboard-hits-percentage');
var eScoreMisses  = document.getElementById('scoreboard-misses');
var eScoreMissesP = document.getElementById('scoreboard-misses-percentage');
var eScoreLosses  = document.getElementById('scoreboard-losses');
var eScoreLossesP = document.getElementById('scoreboard-losses-percentage');
var eScoreHittime = document.getElementById('scoreboard-hittime');
var eHudHits    = document.getElementById('hud-hits');
var eHudMisses  = document.getElementById('hud-misses');
var eHudLost    = document.getElementById('hud-lost');
var eSettings   = document.getElementById('settings');
var eSettingsModes = [];

var eSettingsSpawnrate  = document.getElementById('settings-spawnrate');
var eSettingsLifetime   = document.getElementById('settings-lifetime');
var eSettingsLength     = document.getElementById('settings-length');

var gAnimationFrame;
var gCtx            = eShoot.getContext('2d');
var gPx             = 1.0;
var gPy             = 1.0;
var gPs             = 1.0;

var gSettingsCache  = {};

var gRunning        = false;

var gHitCount, gLostCount, gMissCount;
var gStartTime, gLastTime, gCurrentTime;

var gHitTimeLast = 0;
var gHitTimes = [];

var gModes          = {};
var gSelectedMode   = '';

// Do some initial setup for page elements.
{
  document.getElementById('settings-go').addEventListener('click', function(e) { hideSettings(); showHud(); start(); });
  document.getElementById('scoreboard-go').addEventListener('click', function(e) { hideScoreboard(); showSettings(); });

  var c = eSettings.getElementsByTagName('FIELDSET');
  for (var i = 0; i < c.length; i++) {
    if (c[i].id.indexOf("mode-") != -1) {
      eSettingsModes.push(c[i]);
      if (i == 0) {
        showFieldset(c[i]);
        gSelectedMode = c[i].id.substring(5);
      } else {
        hideFieldset(c[i]);
      }
      c[i].addEventListener('click', (function(self) { return function(e) {
        for (var i = 0; i < eSettingsModes.length; i++) {
          if (eSettingsModes[i] !== self) {
            hideFieldset(eSettingsModes[i]);
          } else {
            gSelectedMode = self.id.substring(5);
            showFieldset(self);
          }
        }
      }})(c[i]));
    }
  }
  hideScoreboard(); hideHud(); showSettings();
}
/* ==== Core Logic ==== */
function showHud() {
  eHud.style.display = '';
}
function hideHud() {
  eHud.style.display = 'none';
}
function showScoreboard() {
  eScoreHits.innerText = gHitCount;
  eScoreHitsP.innerText = Math.round(gHitCount / (gHitCount+gLostCount) * 100) + '%';
  eScoreMisses.innerText = gMissCount;
  eScoreLosses.innerText = gLostCount;
  eScoreLossesP.innerText = Math.round(gLostCount / (gLostCount+gHitCount) * 100) + '%';
  {
    var total = 0;
    for (var i = 0; i < gHitTimes.length; i++) {
      total += gHitTimes[i];
    }
    total = gHitTimes.length > 0 ? Math.round(total / gHitTimes.length) : 0;
    eScoreHittime.innerText = total + 'ms';
  }
  eScoreboard.style.display = '';
}
function hideScoreboard() {
  eScoreboard.style.display = 'none';
}
function showSettings() {
  eSettings.style.display = '';
}
function hideSettings() {
  eSettings.style.display = 'none';
}
function getSetting(name) {
  if (gSettingsCache[name] !== undefined) return gSettingsCache[name];
  var els = eSettings.getElementsByTagName('input');
  var vals = [];
  for (var i = 0; i < els.length; i++) {
    if (els[i].name.indexOf('settings-'+name) !== -1) {
      var val = parseFloat(els[i].value);
      if (vals[vals.length-1] && val == vals[vals.length-1]) {
      } else {
        vals.push(val);
      }
    }
  }
  var total = 0;
  for (var i = 0; i < vals.length; i++) {
    total += vals[i];
  }
  gSettingsCache[name] = total / vals.length;
  return gSettingsCache[name];
}
function setSetting(name, value) {
  var els = eSettings.getElementsByTagName('input');
  for (var i = 0; i < els.length; i++) {
    if (els[i].name.indexOf('settings-'+name) !== -1) {
      els[i].value = value;
      els[i].dispatchEvent(new Event('change'));
    }
  }
  delete gSettingsCache[name];
}
window.setSetting = setSetting;
function hideFieldset(target) {
  for (var j = 0; j < target.children.length; j++) {
    if (target.children[j].tagName != 'LEGEND') {
      target.children[j].style.display = 'none';
    }
  }
  target.className = '';
}
function showFieldset(target) {
  for (var j = 0; j < target.children.length; j++) {
    if (target.children[j].tagName != 'LEGEND') {
      target.children[j].style.display = '';
    }
  }
  target.className = 'focused';
}

function adjust() {
  eShoot.width = eShoot.parentNode.clientWidth;
  eShoot.height = eShoot.parentNode.clientHeight;
  gPx = eShoot.width / 100;
  gPy = eShoot.height / 100;
  gPs = gPx > gPy ? gPx : gPy;
}

function sync() {
  eHudHits.innerText = gHitCount;
  eHudMisses.innerText = gMissCount;
  eHudLost.innerText = gLostCount;
}

function reset() {
  gStartTime = gLastTime = gCurrentTime = performance.now();
  gHitCount = gLostCount = gMissCount = 0;
  gHitTimes = [];
}

function start() {
  reset();
  gRunning = true;
  gAnimationFrame = window.requestAnimationFrame(loop);
}

function draw() {
  // Clear our canvas.
  gCtx.clearRect(0, 0, eShoot.width, eShoot.height);
  if (gModes[gSelectedMode].draw) gModes[gSelectedMode].draw();
}

function loop(pTime) {
  adjust();
  gCurrentTime = pTime;

  if (gModes[gSelectedMode].loop) gModes[gSelectedMode].loop(gCurrentTime - gLastTime);

  draw();
  sync();

  // Keep on looping.
  gLastTime = gCurrentTime;
  if (gRunning && gCurrentTime <= gStartTime+(getSetting('length')*1000)) {
    gAnimationFrame = window.requestAnimationFrame(loop);
  } else {
    hideHud();
    showScoreboard();
  }
}

/* ==== Browser Events ==== */
eShoot.addEventListener('contextmenu', function(e) { e.preventDefault() });
function tapHandler(e) {
  e.preventDefault();
  var x = e.clientX || e.touches[0].clientX;
  var y = e.clientY || e.touches[0].clientY;
  if (gModes[gSelectedMode].tap) gModes[gSelectedMode].tap(x, y);
}
eShoot.addEventListener('touchstart', tapHandler);
eShoot.addEventListener('mousedown', tapHandler);
window.addEventListener('resize', adjust);

/* ==== Primitives ==== */
function Circle(x, y, maxSize, growTime) {
  this.x = x || 0;
  this.y = y || 0;
  this.growTime = growTime || 2000;
  this.growth = 0;
  this.size = 0;
  this.maxSize = maxSize || 5;
  this.remove = false;
}
Circle.prototype.step = function(time) {
  this.growth += time;
  if (this.growth >= this.growTime / 2) {
    this.size = (1.0 - this.growth / this.growTime) * this.maxSize;
  } else {
    this.size = this.growth / this.growTime * this.maxSize;
  }
  if (this.growth >= this.growTime) {
    this.remove = true;
    return false;
  }
  return true;
}
Circle.prototype.draw = function() {
  gCtx.beginPath();
  gCtx.arc(this.x*gPx, this.y*gPy, this.size*gPs, 0, (Math.PI/180)*360);
  gCtx.closePath();
  gCtx.fillStyle = "yellow";
  gCtx.fill();
}
Circle.prototype.collision = function(x, y) {
  var distance = Math.sqrt(Math.pow(x - (this.x*gPx), 2) + Math.pow(y - (this.y*gPy), 2));
  if (distance < 1 + this.size*gPs) {
    return true;
  }
  return false;
}

/* ==== Modes ==== */
/* == Target Mode == */
gModes['target'] = (function(){
  var lCircles = [];
  var lLastCreateCounter = 0;
  function createCircle() {
    var x, y;
  
    if (window.crypto) {
      var ran = new Uint32Array(2);
      window.crypto.getRandomValues(ran);
      x = getSetting('size')/2 + ran[0] % (100 - getSetting('size'));
      y = getSetting('size')/2 + ran[1] % (100 - getSetting('size'));
    } else {
      var min = Math.ceil(getSetting('size')/2);
      var maxW = Math.floor(100 - getSetting('size'));
      var maxH = Math.floor(100 - getSetting('size'));
      x = Math.floor(Math.random() * (maxW - min + 1)) + min;
      y = Math.floor(Math.random() * (maxH - min + 1)) + min;
    }
  
    lCircles.push(new Circle(x, y, getSetting('size'), getSetting('lifetime')*1000));
    lLastCreateCounter -= getSetting('spawnrate');
  }

  return {
    start: function() {
    },
    reset: function() {
      lCircles = [];
    },
    draw: function() {
      for (var i = 0; i < lCircles.length; i++) {
        lCircles[i].draw();
      }
    },
    loop: function(delta) {
      lLastCreateCounter += delta;
      // Create a new circle if enough time has elapsed.
      while (lLastCreateCounter >= getSetting('spawnrate')) {
        createCircle();
      }
      // Reverse iteration through our circles, running their logic and removing them as needed.
      for (var i = lCircles.length-1; i >= 0; i--) {
        if (!lCircles[i].step(delta)) {
          gLostCount++;
        }
        if (lCircles[i].remove) {
          lCircles.splice(i, 1);
        }
      }
    },
    tap: function(x, y) {
      for (var i = 0; i < lCircles.length; i++) {
        if (lCircles[i].collision(x, y)) {
          lCircles[i].remove = true;
          gHitCount++;
          var hit_time = performance.now();
          gHitTimes.push(hit_time - (gHitTimes.length > 0 ? gHitTimeLast : gStartTime));
          gHitTimeLast = hit_time;
          if (lCircles.length-1 == 0) createCircle();
          return;
        }
      }
      gMissCount++;
    }
  }
})();
/* == Track Mode == */
gModes['track'] = (function() {
  return {};
})();
/* == Reflex Mode == */
gModes['reflex'] = (function() {
  return {};
})();

adjust();
reset();
draw();
sync();
});

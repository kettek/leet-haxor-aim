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

var lAnimationFrame;
var lCtx            = eShoot.getContext('2d');
var lPx             = 1.0;
var lPy             = 1.0;
var lPs             = 1.0;

var lSelectedMode   = '';
var lSettingsCache  = {};

var lRunning        = false;
var lCircles        = [];

var lHitCount, lLostCount, lMissCount;
var lStartTime, lLastTime, lCurrentTime;
var lLastCreate;

var lHitTimeLast = 0;
var lHitTimes = [];

var lModes = {
  'mode-track': {
    start: function() { },
    reset: function() { },
    loop: function(d) { },
    draw: function(d) { },
  },
  'mode-target': {
    start: function() { },
    reset: function() { },
    loop: function(d) { },
    draw: function(d) { },
  }
};

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
        lSelectedMode = c[i].id;
      } else {
        hideFieldset(c[i]);
      }
      c[i].addEventListener('click', (function(self) { return function(e) {
        for (var i = 0; i < eSettingsModes.length; i++) {
          if (eSettingsModes[i] !== self) {
            hideFieldset(eSettingsModes[i]);
          } else {
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
  eScoreHits.innerText = lHitCount;
  eScoreHitsP.innerText = Math.round(lHitCount / (lHitCount+lLostCount) * 100) + '%';
  eScoreMisses.innerText = lMissCount;
  eScoreLosses.innerText = lLostCount;
  eScoreLossesP.innerText = Math.round(lLostCount / (lLostCount+lHitCount) * 100) + '%';
  {
    var total = 0;
    for (var i = 0; i < lHitTimes.length; i++) {
      total += lHitTimes[i];
    }
    eScoreHittime.innerText = Math.round(total / lHitTimes.length) + 'ms';
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
  if (lSettingsCache[name] !== undefined) return lSettingsCache[name];
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
  lSettingsCache[name] = total / vals.length;
  return lSettingsCache[name];
}
function setSetting(name, value) {
  var els = eSettings.getElementsByTagName('input');
  for (var i = 0; i < els.length; i++) {
    if (els[i].name.indexOf('settings-'+name) !== -1) {
      els[i].value = value;
      els[i].dispatchEvent(new Event('change'));
    }
  }
  delete lSettingsCache[name];
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
  lPx = eShoot.width / 100;
  lPy = eShoot.height / 100;
  lPs = lPx > lPy ? lPx : lPy;
}

function sync() {
  eHudHits.innerText = lHitCount;
  eHudMisses.innerText = lMissCount;
  eHudLost.innerText = lLostCount;
}

function reset() {
  lStartTime = lLastTime = lCurrentTime = lLastCreate = performance.now();
  lHitCount = lLostCount = lMissCount = 0;
  lHitTimes = [];
  lCircles = [];
}

function start() {
  reset();
  lRunning = true;
  lAnimationFrame = window.requestAnimationFrame(loop);
}

function draw() {
  // Clear our canvas.
  lCtx.clearRect(0, 0, eShoot.width, eShoot.height);
  // Render our circles.
  for (var i = 0; i < lCircles.length; i++) {
    lCircles[i].draw();
  }
}

function loop(pTime) {
  adjust();
  lCurrentTime = pTime;
  var elapsedTime = lCurrentTime - lLastTime;

  // Create a new circle if enough time has elapsed.
  if (lCurrentTime >= lLastCreate + getSetting('spawnrate')) {
    createCircle();
  }

  // Reverse iteration through our circles, running their logic and removing them as needed.
  for (var i = lCircles.length-1; i >= 0; i--) {
    if (!lCircles[i].step(elapsedTime)) {
      lLostCount++;
    }
    if (lCircles[i].remove) {
      lCircles.splice(i, 1);
    }
  }

  draw();
  sync();

  // Keep on looping.
  lLastTime = lCurrentTime;
  if (lRunning && lCurrentTime <= lStartTime+(getSetting('length')*1000)) {
    lAnimationFrame = window.requestAnimationFrame(loop);
  } else {
    hideHud();
    showScoreboard();
  }
}

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
  lLastCreate = lCurrentTime;
}

/* ==== Browser Events ==== */
eShoot.addEventListener('contextmenu', function(e) { e.preventDefault() });
function tapHandler(e) {
  e.preventDefault();
  var x = e.clientX || e.touches[0].clientX;
  var y = e.clientY || e.touches[0].clientY;
  for (var i = 0; i < lCircles.length; i++) {
    if (lCircles[i].collision(x, y)) {
      lCircles[i].remove = true;
      lHitCount++;
      var hit_time = performance.now();
      lHitTimes.push(hit_time - (lHitTimes.length > 0 ? lHitTimeLast : lStartTime));
      lHitTimeLast = hit_time;
      if (lCircles.length-1 == 0) createCircle();
      return;
    }
  }
  lMissCount++;
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
  lCtx.beginPath();
  lCtx.arc(this.x*lPx, this.y*lPy, this.size*lPs, 0, (Math.PI/180)*360);
  lCtx.closePath();
  lCtx.fillStyle = "yellow";
  lCtx.fill();
}
Circle.prototype.collision = function(x, y) {
  var distance = Math.sqrt(Math.pow(x - (this.x*lPx), 2) + Math.pow(y - (this.y*lPy), 2));
  if (distance < 1 + this.size*lPs) {
    return true;
  }
  return false;
}

adjust();
reset();
draw();
sync();
});

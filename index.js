window.addEventListener('load', function() {
/* ==== Private Variables ==== */
var eShoot      = document.getElementById('shoot');
var eHud        = document.getElementById('hud');
var eHudHits    = document.getElementById('hud-hits');
var eHudMisses  = document.getElementById('hud-misses');
var eHudLost    = document.getElementById('hud-lost');
var eSettings   = document.getElementById('settings');
var eSettingsModes = [];

var eSettingsSpawnrate  = document.getElementById('settings-spawnrate');
var eSettingsLifetime   = document.getElementById('settings-lifetime');
var eSettingsLength     = document.getElementById('settings-length');
var eSettingsGo         = document.getElementById('settings-go');

var lAnimationFrame;
var lCtx            = eShoot.getContext('2d');

var lSelectedMode   = '';

var lTargetTime     = 15000;
var lCreateRate     = 750;
var lAliveTime      = 3000;
var lMaxSize        = 30;

var lRunning        = false;
var lCircles        = [];

var lHitCount, lLostCount, lMissCount;
var lStartTime, lLastTime, lCurrentTime;
var lLastCreate;

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
  eSettingsSpawnrate.addEventListener('change', function(e) { lCreateRate = parseFloat(eSettingsSpawnrate.value) });
  eSettingsLifetime.addEventListener('change', function(e) { lAliveTime = parseFloat(eSettingsLifetime.value) });
  eSettingsLength.addEventListener('change', function(e) { lTargetTime = parseFloat(eSettingsLength.value)*1000 });
  eSettingsGo.addEventListener('click', function(e) { hideSettings(); showHud(); start(); });

  var c = eSettings.getElementsByTagName('FIELDSET');
  for (var i = 0; i < c.length; i++) {
    if (c[i].id.indexOf("mode-") != -1) {
      eSettingsModes.push(c[i]);
      if (i != 0) {
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
  hideHud(); showSettings();
}
/* ==== Core Logic ==== */
function showHud() {
  eHud.style.display = '';
}
function hideHud() {
  eHud.style.display = 'none';
}
function showSettings() {
  eSettings.style.display = '';
}
function hideSettings() {
  eSettings.style.display = 'none';
}
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
}

function sync() {
  eHudHits.innerText = lHitCount;
  eHudMisses.innerText = lMissCount;
  eHudLost.innerText = lLostCount;
}

function reset() {
  lStartTime = lLastTime = lCurrentTime = lLastCreate = performance.now();
  lHitCount = lLostCount = lMissCount = 0;
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
  if (lCurrentTime >= lLastCreate + lCreateRate) {
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
  if (lRunning && lCurrentTime <= lStartTime+lTargetTime) lAnimationFrame = window.requestAnimationFrame(loop);
}

function createCircle() {
  var x, y;

  if (window.crypto) {
    var ran = new Uint32Array(2);
    window.crypto.getRandomValues(ran);
    x = lMaxSize/2 + ran[0] % (eShoot.width - lMaxSize);
    y = lMaxSize/2 + ran[1] % (eShoot.height - lMaxSize);
  } else {
    var min = Math.ceil(lMaxSize/2);
    var maxW = Math.floor(eShoot.width - lMaxSize);
    var maxH = Math.floor(eShoot.height - lMaxSize);
    x = Math.floor(Math.random() * (maxW - min + 1)) + min;
    y = Math.floor(Math.random() * (maxH - min + 1)) + min;
  }

  lCircles.push(new Circle(x, y, lMaxSize, lAliveTime));
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
      if (lCircles.length-1 == 0) createCircle();
      return;
    }
  }
  lMissCount++;
}
eShoot.addEventListener('touchstart', tapHandler);
eShoot.addEventListener('mousedown', tapHandler);
window.addEventListener('keydown', function(e) {
  if (e.which == 32) {
    reset();
    if (!lRunning) {
      start();
    } else {
      window.cancelAnimationFrame(lAnimationFrame)
      lRunning = false;
    }
  }
  if (e.which == 70) {
    var requestFullscreen = eShoot.requestFullscreen || eShoot.webkitRequestFullScreen || eShoot.mozRequestFullScreen || eShoot.msRequestFullscreen;
    requestFullscreen.call(eShoot);
  }
});
window.addEventListener('resize', adjust);

/* ==== Primitives ==== */
function Circle(x, y, maxSize, growTime) {
  this.x = x || 0;
  this.y = y || 0;
  this.growTime = growTime || 2000;
  this.growth = 0;
  this.size = 0;
  this.maxSize = maxSize || 100;
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
  lCtx.arc(this.x, this.y, this.size, 0, (Math.PI/180)*360);
  lCtx.closePath();
  lCtx.fillStyle = "yellow";
  lCtx.fill();
}
Circle.prototype.collision = function(x, y) {
  var distance = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
  if (distance < 1 + this.size) {
    return true;
  }
  return false;
}

adjust();
reset();
draw();
sync();
});

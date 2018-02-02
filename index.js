window.addEventListener('load', function() {
/* ==== Private Variables ==== */
var eShoot = document.getElementById('shoot');

var lCtx            = eShoot.getContext('2d');

var lTargetTime     = 15000;
var lCreateRate     = 750;
var lAliveTime      = 3000;
var lMaxSize        = 30;

var lRunning        = false;
var lCircles        = [];

var lHitCount, lLostCount, lMissCount;
var lStartTime, lLastTime, lCurrentTime;
var lLastCreate;

/* ==== Core Logic ==== */
function adjust() {
  eShoot.width = eShoot.parentNode.clientWidth;
  eShoot.height = eShoot.parentNode.clientHeight;
}

function reset() {
  lStartTime = lLastTime = lCurrentTime = lLastCreate = performance.now();
  lHitCount = lLostCount = lMissCount = 0;
  lCircles = [];
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

  // Render our circles.
  for (var i = 0; i < lCircles.length; i++) {
    lCircles[i].draw();
  }

  // Draw our UI information.
  lCtx.fillStyle = 'white';
  lCtx.fillText(lHitCount + ' hits; ' + lMissCount + ' misses; ' + lLostCount + ' lost', 100, 100);

  // Keep on looping.
  lLastTime = lCurrentTime;
  if (lRunning && lCurrentTime <= lStartTime+lTargetTime) window.requestAnimationFrame(loop);
}

function createCircle() {
  var x, y, ran;

  ran = new Uint32Array(2);
  window.crypto.getRandomValues(ran);
  x = lMaxSize/2 + ran[0] % (eShoot.width - lMaxSize);
  y = lMaxSize/2 + ran[1] % (eShoot.height - lMaxSize);

  lCircles.push(new Circle(x, y, lMaxSize, lAliveTime));
  lLastCreate = lCurrentTime;
}

/* ==== Browser Events ==== */
eShoot.addEventListener('contextmenu', function(e) { e.preventDefault() });
eShoot.addEventListener('mousedown', function(e) {
  e.preventDefault();
  for (var i = 0; i < lCircles.length; i++) {
    if (lCircles[i].collision(e.clientX, e.clientY)) {
      lCircles[i].remove = true;
      lHitCount++;
      if (lCircles.length-1 == 0) createCircle();
      return;
    }
  }
  lMissCount++;
});
window.addEventListener('keydown', function(e) {
  if (e.which == 32) {
    reset();
    if (!lRunning) {
      lRunning = true;
      window.requestAnimationFrame(loop);
    } else {
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
function Circle(x=0, y=0, maxSize=100, growTime=2000) {
  this.x = x;
  this.y = y;
  this.growTime = growTime;
  this.growth = 0;
  this.size = 0;
  this.maxSize = maxSize;
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
  lCtx.closePath();
  lCtx.arc(this.x, this.y, this.size, 0, (Math.PI/180)*360);
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

reset();
loop();
});

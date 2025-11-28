let playerX, playerY;
let playerRotationValue = 0;
let bg;
let tx;
let ty;
let start = false;
let startMenu = false;
let antdex = false;
let antDexEntries = [];   // array of objects {name, desc, stats}
let dexScrollY = 0;       // current scroll offset
let dexTargetScroll = 0;  // for smooth scrolling
let dexScrollSpeed = 20;  // scroll sensitivity
let selectedDexIndex = -1;// highlight
let progressDisplay = 0; // what’s currently drawn
let progressTarget = 0;  // what the actual percent should be

let movementType1Discovered = false; 
let movementType2Discovered = false; 
let movementType3Discovered = false; 
let movementType4Discovered = false;
let movementType5Discovered = false;
let movementType6Discovered = false;
let movementType7Discovered = false;
let movementType8Discovered = false;

let maxSpeedDiscovered = false;
let minSpeedDiscovered = false;
let walkingAntsDiscovered = false;

let basicBulletsDiscovered = false;
let heavyBulletsDiscovered = false;
let landMineDiscovered = false;

let minBulletSpeedDiscovered = false;
let midBulletSpeedDiscovered = false;
let maxBulletSpeedDiscovered = false;

let straightShootingAntsDiscovered = false;
let wideShotAntsDiscovered = false;
let wildShotAntsDiscovered = false;
let mostOffTargetAntsDiscovered = false;

let rapidFireDiscovered = false;
let averageFireRateAntsDiscovered = false;
let minimalFireRateAntsDiscovered = false;

let middleStationedAntsDiscovered = false;

let chaserAntsDiscovered = false;
let midrangeAntsDiscovered = false;
let farRangeAntsDiscovered = false;
let playerBasedSnipersDiscovered = false;

let showDiscoveryPopup = false;
let discoveryPopupTimer = 0;
let discoveryPopupDuration = 240; // frames (~4 seconds)
let discoveryPopupY = 0;          // for smooth slide
let discoveryPopupTargetY = 0;    // target Y position

let speedTime = 0.5;
let dashCoolDown;
let dash = false;
let dashReady = true;
let shield = 3;
let shot = 3;
let shotBreak = 0;
let playerBullets = []; 
let playerBulletShot = false;
let playerBulletRotationValue;
let liveRankingsPrinted = false;
let level = 1;
const BASE_PLAYER_SPEED = 4;
let levelEnd = 0;

let deathAnimations = [];
let floatingTexts = [];


let enemyCount = 1;
let enemyIndex;

//enemy one
let antX = [];
let antY = [];
let strikeX = [];
let strikeY = [];
let strikeTime1 = [];
let drawStrike1 = [];
let bulletShot = [];
let bulletCount = [];
let shotAngleX = [];
let shotAngleY = [];
let bulletSpeed = [];
let bulletCooldown = [];
let bulletAngle = [];
let enemyBullets = [];
let antSpeed = [];
let antPoints = [];
let antLives = [];
let shotOffsetX = [];
let shotOffsetY = [];
let followBeetle = [];
let followAnt = [];
let standStill = [];
let findLocation = [];
let followValue = [];
let keepDistance = [];
let followTarget = [];
let autonomy = [];
let explosionBehavior = [];
let explodeOnTermination = [];
let triggerExplodeViaProximity = [];
let explosionProximity = [];
let standingPointX = [];
let standingPointY = [];
let anchorPointX = [];
let anchorPointY = [];
let distanceFromAnchor = [];
let spawnX = [];
let spawnY = [];
let angleFromSpawn = [];
let movementMutationRate = [];
let bulletSize = [];
const ANT_SPAWN_BUFFER = 20;
let antMoveX = [];
let antMoveY = [];
let antPrevX = [];
let antPrevY = [];

let bulletSplitCount = []; // NEW: how many pieces (1–5)
let bulletSpread = [];     // NEW: spread angle in degrees (or radians)

let explosionRadiusMultiplier = [];
let explosionResidueMultiplier = [];

let enemyExplosions = [];
let bulletExplodeAfter = [];

let buttons = {};


//let canvasSize = 600;
let playerSpeed = 4;
let scoreBarHeight = 40;
let score = 0;
let totalScore = 0;
let health = 10;
let timeCount = 10;
let highScore = 0;
let end = false;
let comboTime = 0;
let combo = 0;
let comboConstant = 50;
let comboPoints = 0;
let streakPoints = 0;

let beetle;
let ant;
let shieldFull;
let shieldEmpty;
let acidFull;
let acidEmpty;

function preload(){
  beetle = loadImage('img/p5GameBeetle.gif');
  ant = loadImage('img/antenemy.gif');
  bg = loadImage('img/background.png');
  bulletImage = loadImage('img/bullet.gif');
  shieldFull = loadImage('img/shieldfull.png');
  shieldEmpty = loadImage('img/shieldempty.png');
  acidFull = loadImage('img/acidfull.png');
  acidEmpty = loadImage('img/acidempty.png');
  beetleHit = loadImage('img/beetle-hit-loop.gif');
  splashScreen = loadImage('img/antagonist-splashscreen.png');
  
  //sounds
  sFast = loadSound('sounds/fast.mp3');
  sGainShield = loadSound('sounds/gainshield.mp3');
  sGetHit1 = loadSound('sounds/gethit1.mp3');
  sGetHit2 = loadSound('sounds/gethit2.mp3');
  sHit1 = loadSound('sounds/hit1.mp3');
  sHit2 = loadSound('sounds/hit2.mp3');
  sLoseShield = loadSound('sounds/loseshield.mp3');
  sShieldHit1 = loadSound('sounds/shield1.mp3');
  sShieldHit2 = loadSound('sounds/shield2.mp3');
  sSpit1 = loadSound('sounds/spit1.mp3');
  sSpit2 = loadSound('sounds/spit2.mp3');
  
  gamemusic = loadSound('sounds/beetle-theme.mp3');
  titlemusic = loadSound('sounds/beetle-title.mp3');
  endmusic = loadSound('sounds/beetle-end.mp3');
  

}


function setup() {
  
  createCanvas(windowWidth, windowHeight);
  //enemyCount = windowWidth/150 + windowHeight/150;
  //Beetle
  playerX = width / 2;
  playerY = height / 2;
  playerBulletX = playerX;
  playerBulletY = playerY;
  playerBulletRotationValue = playerRotationValue;
  playerSpeed = BASE_PLAYER_SPEED / enemyCount;
  let dashCooldown = 0;


  for (let i = 1; i < enemyCount + 1; i++) {
    //enemy one
      antX[i] = random(0, windowWidth);
      antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, windowHeight - ANT_SPAWN_BUFFER);
      spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
      spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
    //console.log(antX[i]);
    antPrevX[i] = antX[i];
    antPrevY[i] = antY[i];
    
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    //console.log(bulletShot[i]);
    enemyBullets[i] = [];
    bulletSpeed[i] = 180; // Random speed for each enemy
    bulletCooldown[i] = 120; // Random cooldown for each enemy
    antSpeed[i] = 1.95;
    bulletSize[i] = 1;
    bulletSplitCount[i] = 1;          // no split by default
    bulletSpread[i] = 0;              // 0° spread (all bullets same direction)
    bulletExplodeAfter[i] = 800; 
    explosionRadiusMultiplier[i] = 1;
    explosionResidueMultiplier[i] = 1;
    shotOffsetX[i] = 0;
    shotOffsetY[i] = 0;
    followValue[i] = 0;
    autonomy[i] = 0;
    explosionBehavior[i] = 0;
    explosionProximity[i] = 200;
    if (Math.round(explosionBehavior[i]) === 0){
      explodeOnTermination[i] = true;
      triggerExplodeViaProximity[i] = false;
    } else if (Math.round(explosionBehavior[i]) === 1){
      explodeOnTermination[i] = false;
      triggerExplodeViaProximity[i] = true;
    }
    standingPointX[i] = windowWidth / 2;
    standingPointY[i] = windowHeight / 2;
    distanceFromAnchor[i] = 200;
    angleFromSpawn[i] = PI;
    if (Math.round(autonomy[i]) === 0){
      followTarget[i] = true;
      keepDistance[i] = false;
    } else if (Math.round(autonomy[i]) === 1){
      followTarget[i] = false;
      keepDistance[i] = true;
    }
    if (Math.round(followValue[i]) === 0){
      followAnt[i] = false;
      followBeetle[i] = true;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 1) {
      followAnt[i] = true;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 2) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = true;
      standStill[i] = false;
    } else if (Math.round(followValue[i]) === 3) {
      followAnt[i] = false;
      followBeetle[i] = false;
      findLocation[i] = false;
      standStill[i] = true;
    }
    antPoints[i] = 0;
    antLives[i] = 1;
  }

  buttons.up = {x: 80, y: windowHeight - 140, w: 60, h: 60};
  buttons.down = {x: 80, y: windowHeight - 60, w: 60, h: 60};
  buttons.left = {x: 20, y: windowHeight - 100, w: 60, h: 60};
  buttons.right = {x: 140, y: windowHeight - 100, w: 60, h: 60};

  buttons.dash = {x: windowWidth - 140, y: windowHeight - 100, w: 80, h: 80};
  buttons.shoot = {x: windowWidth - 50, y: windowHeight - 100, w: 80, h: 80};
  
  updateAntDexEntries();
}

function triggerDiscoveryPopup() {
  showDiscoveryPopup = true;
  discoveryPopupTimer = discoveryPopupDuration;
  discoveryPopupY = windowHeight + 100;          // start off-screen
  discoveryPopupTargetY = windowHeight - 50;    // where it should slide to
}

function draw() {

  if (start == true){
      for (let i = 1; i <= enemyCount; i++) {
        antMoveX[i] = 0;
        antMoveY[i] = 0;
      }
      healthBegin = health;
      shieldBegin = shield;
      drawBackground();
      drawScoreboard();
      autonomousAntMovement();
      drawEnemy();
      drawBeetle();
      drawStrikes();
      calculateBonus();
      enemyInteraction1(); // Beetle Eats Enemy
      enemyShoot1();
      drawEnemyExplosions();
      detectKeyboardInput();
      // Beetle Moves
      beetleShoot();
      beetleDash();    
      enemyStrike();
      drawDeathEffects();
      endGame();
      if (frameCount % 1000 === 0 && end === false) {  // roughly every 5 seconds at 60fps
        printLiveAntRankings();
      }

  } else {
    drawStartScreen();
  }
  if (start && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    drawMobileControls();
  }
  updateAntDexEntries();
  
  if (showDiscoveryPopup) {
    const popupWidth = 300;
    const popupHeight = 100;
    const popupX = windowWidth - 150;

    discoveryPopupY = lerp(discoveryPopupY, discoveryPopupTargetY, 0.1);

    // fade out near the end of its timer
    const fadeOutStart = 60; // last 1 second
    const alpha = map(discoveryPopupTimer, 0, fadeOutStart, 0, 180, true);

    push();
    noStroke();
    fill(0, 0, 0, alpha);
    rectMode(CENTER);
    rect(popupX, discoveryPopupY, popupWidth, popupHeight, 20);

    fill(255, 255, 255, alpha + 75);
    textSize(24);
    textAlign(CENTER, CENTER);
    text("New Ant Discovered!", popupX, discoveryPopupY);
    pop();

    // Countdown
    discoveryPopupTimer--;
    if (discoveryPopupTimer <= 0) {
      showDiscoveryPopup = false;
    }
  }
}

function drawBackground() {

    imageMode(CORNER);
    tx = 0;
    ty = 0;
    image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
    ty = ty + 1;
    image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
    ty = 0;
    tx = tx + 1;
    image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);
    ty = ty + 1;
    image(bg, tx * windowWidth / 2, ty * windowHeight / 2, windowWidth / 2, windowHeight / 2);

}

function drawScoreboard() {
  rectMode(CORNER);
  fill(128, 200, 0);
  rect(0, 0, windowWidth, scoreBarHeight);

  fill(0);
  textSize(16);
  textAlign(CENTER);

  highScore = getItem('newHighScore');
  if (highScore == null) {
    highScore = 0;
  }

  let padding = 10;
  let yPos = scoreBarHeight * 0.65;
  
  // Available width for text
  let sectionWidth = windowWidth / 7;
  let startX = sectionWidth / 2;

  // Left to right: Round, Time, Combo, Health, Score, Total, High Score
  
  // Round
  fill(0);
  text(`Round: ${level}`, startX, yPos);

  // Time
  text(`Time: ${round(timeCount)}`, startX + sectionWidth, yPos);

  // Combo (colored)
  let comboText = `Combo: ${combo}`;
  if (streakPoints > 0) {
    comboText += ` +${streakPoints}`;
  }
  fill(Math.pow(comboTime, 2), comboTime * 5, 0);
  text(comboText, startX + sectionWidth * 2, yPos);

  // Health
  // Flash red box if health below 10
  if (health < 10) {
    let flashAlpha = map(sin(frameCount * 20/health), -1, 1, 50, 150);
    fill(255, 0, 0, flashAlpha);
    rectMode(CENTER);
    rect(startX + sectionWidth * 3, scoreBarHeight / 2, sectionWidth * 0.8, scoreBarHeight * 1);
    rectMode(CORNER);
  }
  
  fill(0);
  text(`Health: ${health.toFixed(2)}`, startX + sectionWidth * 3, yPos);

  // Score
  text(`Score: ${score}`, startX + sectionWidth * 4, yPos);

  // Total
  text(`Total: ${totalScore}`, startX + sectionWidth * 5, yPos);

  // High Score
  text(`High Score: ${highScore}`, startX + sectionWidth * 6, yPos);

  if (!end) {
    timeCount -= (1 / 100);
  }
}

function drawStrikes(){
  if(drawStrike1[enemyIndex] == 1){
  push();
    image(beetleHit, strikeX[enemyIndex], strikeY[enemyIndex], 150, 150);
    strikeTime1[enemyIndex]--;
    if(strikeTime1[enemyIndex] <= 0) {
      drawStrike1[enemyIndex] = 0;
    }
  pop();
  }
}

function drawEnemy(){
  //enemy one
  for (let i = 1; i < enemyCount + 1; i++) {

    push();
      angleMode(DEGREES)
      imageMode(CENTER);
      translate(antX[i], antY[i]);
      let a = atan2(playerY - antY[i], playerX - antX[i]);
      rotate(a);
      image(ant, 0, 0, 60, 60);
    pop();


  }
  //console.log(enemyIndex);
}

function drawBeetle(){


  push();
    angleMode(DEGREES)
    imageMode(CENTER);
    translate(playerX, playerY);
    push()
      rotate(playerRotationValue);
      image(beetle, 0, 0, 130, 130);
    pop()

    // Shot icons on right side
    if (shot >= 1){
      image(acidFull, -50, -50, 50, 50);
    } else {
      image(acidEmpty, -50, -50, 50, 50);
    }
    if (shot >= 2){
      image(acidFull, -40, -50, 50, 50);
    } else {
      image(acidEmpty, -40, -50, 50, 50);
    }
    if (shot >= 3){
      image(acidFull, -30, -50, 50, 50);
    }else {
      image(acidEmpty, -30, -50, 50, 50);
    }

    // Shield icons on left side
    if (shield > 1) {
      image(shieldFull, 30, -50, 30, 30);
    } else {
      image(shieldEmpty, 30, -50, 30, 30);
    }
    if (shield > 2) {
      image(shieldFull, 50, -50, 30, 30);
    } else {
      image(shieldEmpty, 50, -50, 30, 30);
    }
    if (shield >= 3) {
      image(shieldFull, 70, -50, 30, 30);
    } else {
      image(shieldEmpty, 70, -50, 30, 30);
    }
  pop();

  if (shot < 3){
    shot = shot + (1 / 150);
  }

}

function enemyInteraction1(){

  //enemy one interaction
  for (let i = 1; i < enemyCount + 1; i++) {
    if(playerX > (antX[i] - 27) && playerY > (antY[i] - 27) && playerX < (antX[i] + 27) && playerY < (antY[i] + 27)) {
      if (end == false){
        comboTime = 60;
        combo = combo + 1;
        calculateBonus();
        streakPoints = streakPoints + comboPoints;
        score = score + 100 + comboPoints;
        health = health + 1;
        addDeathEffect(antX[i], antY[i], 100 + comboPoints);
        antX[i] = random(0, windowWidth);
        antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, windowHeight - ANT_SPAWN_BUFFER);
        spawnX[i] = antX[i] + cos(angleFromSpawn[i]);
        spawnY[i] = antY[i] + sin(angleFromSpawn[i]);
        antLives[i]++;
        console.log("Ant", i, "lives:", antLives[i]);

        if(!sGetHit1.isPlaying() || !sGetHit2.isPlaying()) {
          sHit = round(random(1,2));
          if(sHit == 1) {
            sGetHit1.play();
          } else {
            sGetHit2.play();
          }       
        }

      }
    }
  }
}


function enemyShoot1() {
  if (end == false) {
    for (let i = 1; i < enemyCount + 1; i++) {
      if (frameCount % bulletCooldown[i] === 0) {

        let vx = ((playerX + shotOffsetX[i]) - antX[i] + 1) /
                 (bulletSpeed[i] * (bulletSize[i] ** bulletSize[i]));
        let vy = ((playerY + shotOffsetY[i]) - antY[i] + 1) /
                 (bulletSpeed[i] * (bulletSize[i] ** bulletSize[i]));

        let bullet = {
          x: antX[i],
          y: antY[i],
          speedX: vx,
          speedY: vy,
          angle: atan2((playerY + shotOffsetY[i]) - antY[i],
                       (playerX + shotOffsetX[i]) - antX[i]),
          life: 0,
          explodeAfter: bulletExplodeAfter[i], // per-ant timer

          size: bulletSize[i]                  // 🔴 key: keep the bullet's size
        };

        enemyBullets[i].push(bullet);
      }

      // Update and draw bullets
      for (let b = enemyBullets[i].length - 1; b >= 0; b--) {
        let bullet = enemyBullets[i][b];

        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        bullet.life++;

        // --- EXPLOSION TRIGGER ---
        let shouldExplode = false;

        // 1) explode when bullet life ends, if this ant is set to do that
        if (explodeOnTermination[i] && bullet.life >= bullet.explodeAfter) {
          shouldExplode = true;
        }

        // 2) explode when close to player, if this ant is proximity-based
        if (triggerExplodeViaProximity[i]) {
          let distToPlayer = dist(bullet.x, bullet.y, playerX, playerY);
          if (distToPlayer <= explosionProximity[i]) {
            shouldExplode = true;
          }
        }

        if (shouldExplode) {
          spawnEnemyExplosion(bullet.x, bullet.y, bullet.size, i);
          enemyBullets[i].splice(b, 1);
          continue;
        }

        // draw bullet normally
        push();
        angleMode(DEGREES);
        imageMode(CENTER);
        translate(bullet.x, bullet.y);
        rotate(bullet.angle);
        image(bulletImage, 0, 0, (20 * bulletSize[i]), (20 * bulletSize[i]));
        pop();

        if (!sSpit1.isPlaying() && !sSpit2.isPlaying()) {
          sHit = round(random(1, 2));
          if (sHit == 1) {
            sSpit1.play();
          } else {
            sSpit2.play();
          }
        }

        if (
          bullet.x < 0 || bullet.x > windowWidth ||
          bullet.y < scoreBarHeight || bullet.y > windowHeight
        ) {
          enemyBullets[i].splice(b, 1);
        } else if (
          bullet.x > playerX - 25 && bullet.x < playerX + 25 &&
          bullet.y > playerY - 25 && bullet.y < playerY + 25
        ) {
          enemyBullets[i].splice(b, 1);
          handlePlayerHit(i);
        }
      }
    }
  }
}


function handlePlayerHit(i){
  if (end == false){
    if (shield > 1){
      shield = shield - bulletSize[i];
      antPoints[i] = antPoints[i] + bulletSize[i];
      console.log("Ant", i, "points:", antPoints[i]);
      if(!sShieldHit1.isPlaying() || !sShieldHit2.isPlaying()) {
        sHit = round(random(1,2));
        if(sHit == 1) {
          sShieldHit1.play();
        } else {
          sShieldHit2.play();
        }       
      }
    } else {
      health = health - bulletSize[i];
      antPoints[i] = antPoints[i] + bulletSize[i];
      console.log("Ant", i, "points:", antPoints[i]);
      if(!sHit1.isPlaying() || !sHit2.isPlaying()) {
        sHit = round(random(1,2));
        if(sHit == 1) {
          sHit1.play();
        } else {
          sHit2.play();
        }       
      }
    }
  }
}





function detectKeyboardInput(){
  if (touches.length > 0) {
    handleMobileInput(mouseX, mouseY);
  }
  for (let i = 1; i < enemyCount + 1; i++) {
    if(end == false) {

      //left
      if (keyIsDown(65) || keyIsDown(37)) {
        if (playerX > (playerSpeed - 0.1)){
          playerX -= playerSpeed;
        }
        if (followTarget[i] === true){
          if (followBeetle[i] === true){
            if (antX[i] > ((antSpeed[i]) -.01)){
              antX[i] -= (antSpeed[i]);
            }
          }
        } 
        playerRotationValue = 180;
      }

      //right
      if (keyIsDown(68) || keyIsDown(39)) {
        if (playerX < windowWidth - (playerSpeed - 0.1)){
          playerX += playerSpeed;
        }
        if (followTarget[i] === true){
          if (followBeetle[i] === true){
            if (antX[i] < windowWidth - ((antSpeed[i]) -.01)){
              antX[i] += (antSpeed[i]);
            }
          }
        } 
        playerRotationValue = 0;
      }

      //up
      if (keyIsDown(87) || keyIsDown(38)) {
        if (playerY > (scoreBarHeight + 25) + (playerSpeed - 0.01)){
          playerY -= playerSpeed;
        }
        if (followTarget[i] === true){
          if (followBeetle[i] === true){
            if (antY[i] > (scoreBarHeight + 15) + ((antSpeed[i]) -.01)){
              antY[i] -= (antSpeed[i]);
            }
          }
        }
        playerRotationValue = 270;
      }

      //down
      if (keyIsDown(83) || keyIsDown(40)) {
        if (playerY < windowHeight - (playerSpeed - 0.1)){
          playerY += playerSpeed;
        }
        if (followTarget[i] === true){
          if (followBeetle[i] === true){
            if (antY[i] < windowHeight - ((antSpeed[i]) -.01)){
              antY[i] += (antSpeed[i]);
            }
          }
        }
        playerRotationValue = 90;
      }

      if (keyIsDown(16) && dashReady){
        dash = true;
      }

      if (keyIsDown(32) && shot >= 1 && shotBreak <= 0){
        shot = shot - 1;
        shotBreak = 0.1;
        playerBulletShot = true;
      }
    }
    for (let i = 1; i <= enemyCount; i++) {
      antMoveX[i] = antX[i] - antPrevX[i];
      antMoveY[i] = antY[i] - antPrevY[i];
    }
    if (followTarget[i] === true){
      if (followAnt[i] === true) {
        let nearest = getNearestAnt(i);
        if (nearest !== -1) {
          let dx = antMoveX[nearest];
          let dy = antMoveY[nearest];
          let length = sqrt(dx*dx + dy*dy);

          if (length > 0) {
            dx /= length;
            dy /= length;

            antX[i] += dx * antSpeed[i];
            antY[i] += dy * antSpeed[i];

            antX[i] = constrain(antX[i], 0, windowWidth);
            antY[i] = constrain(antY[i], scoreBarHeight + 15, windowHeight);
          }
        }
      }
    }
  }
  for (let i = 1; i <= enemyCount; i++) {
    antPrevX[i] = antX[i];
    antPrevY[i] = antY[i];
  }
}   

function drawMobileControls() {
  noStroke();
  fill(200, 200, 200, 150);

  for (let key in buttons) {
    let b = buttons[key];
    rect(b.x, b.y, b.w, b.h, 10);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(20);
    if (key === "up") text("↑", b.x + b.w/2, b.y + b.h/2);
    if (key === "down") text("↓", b.x + b.w/2, b.y + b.h/2);
    if (key === "left") text("←", b.x + b.w/2, b.y + b.h/2);
    if (key === "right") text("→", b.x + b.w/2, b.y + b.h/2);
    if (key === "dash") text("D", b.x + b.w/2, b.y + b.h/2);
    if (key === "shoot") text("S", b.x + b.w/2, b.y + b.h/2);
    fill(200, 200, 200, 150);
  }
}

function handleMobileInput(x, y) {
  for (let key in buttons) {
    let b = buttons[key];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (key === "up") playerY -= playerSpeed;
      if (key === "down") playerY += playerSpeed;
      if (key === "left") playerX -= playerSpeed;
      if (key === "right") playerX += playerSpeed;
      if (key === "dash" && dashReady) dash = true;
      if (key === "shoot" && shot >= 1 && shotBreak <= 0) {
        shot -= 1;
        shotBreak = 0.1;
        playerBulletShot = true;
      }
    }
  }
}

function beetleShoot() {
  // Cooldown system
  if (shotBreak > 0) {
    shotBreak -= 1 / 100;
  }

  // Fire bullet when ready
  if (playerBulletShot) {
    sSpit1.play(); // optional: keeps your sound feedback
    playerBullets.push({
      x: playerX,
      y: playerY,
      rotation: playerRotationValue
    });
    playerBulletShot = false;
  }

  // Update bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];

    // move bullet in its facing direction
    if (b.rotation == 90)  b.y += BASE_PLAYER_SPEED * 3;
    if (b.rotation == 0)   b.x += BASE_PLAYER_SPEED * 3;
    if (b.rotation == 270) b.y -= BASE_PLAYER_SPEED * 3;
    if (b.rotation == 180) b.x -= BASE_PLAYER_SPEED * 3;

    // draw bullet
    push();
    angleMode(DEGREES);
    imageMode(CENTER);
    translate(b.x, b.y);
    rotate(b.rotation);
    image(bulletImage, 0, 0, 20, 20);
    pop();

    // bullet collisions
    for (let j = 1; j < enemyCount + 1; j++) {
      if (
        b.x < antX[j] + 25 &&
        b.x > antX[j] - 25 &&
        b.y < antY[j] + 25 &&
        b.y > antY[j] - 25
      ) {
        antLives[j]++;
        comboTime = 60;
        combo++;
        calculateBonus();
        streakPoints += comboPoints;
        score += 100 + comboPoints;
        health++;
        addDeathEffect(antX[j], antY[j], 100 + comboPoints);
        antX[j] = random(0, windowWidth);
        antY[j] = random(scoreBarHeight + ANT_SPAWN_BUFFER, windowHeight - ANT_SPAWN_BUFFER);
        spawnX[j] = antX[j] + cos(angleFromSpawn[j]);
        spawnY[j] = antY[j] + sin(angleFromSpawn[j]);
        playerBullets.splice(i, 1);
        break;
      }
    }

    // remove bullet if off-screen
    if (
      b.x < 0 ||
      b.x > windowWidth ||
      b.y < scoreBarHeight ||
      b.y > windowHeight
    ) {
      playerBullets.splice(i, 1);
    }
  }
}

function beetleDash(){

  //handle dash
  if (dash == true && dashReady == true) {
    playerSpeed = BASE_PLAYER_SPEED / enemyCount * 7;
    speedTime = speedTime - (1 / 100);
    if (speedTime <= 0){
      dash = false;
      dashCoolDown = 2;
      dashReady = false;

      if(!sFast.isPlaying()) {
        sFast.play();
      }
      
    }
  } else {
    dashCoolDown = dashCoolDown - (1 / 100);
    //console.log(round(dashCoolDown));
    playerSpeed = BASE_PLAYER_SPEED / enemyCount;
    if (dashCoolDown <= 0){
      speedTime = 0.25;
      dashReady = true;
    }
  }
}

function enemyStrike() {

  //Flash screen when hit by enemy shot
  if (healthBegin > health){
    noStroke();
    rectMode(CORNER);
    fill(250, 0, 0, 75);
    rect(0, 0, windowWidth, windowHeight);
  }

  if (shieldBegin > shield){
    noStroke();
    rectMode(CORNER);
    fill( 0, 0, 255, 75);
    rect(0, 0, windowWidth, windowHeight);
  }
  if (shield < 3){
    shield = shield + (1 / 500);
  }
}

function calculateBonus(){
  if(comboTime <= 0){
    combo = 0;
    streakPoints = 0;
  } else if(comboTime > 0){
    comboTime = comboTime - 1;
    if (combo > 1) {
            let roundedCombo = Math.ceil(combo / 5) * 5;
            comboPoints = (roundedCombo / 5) * comboConstant; // Calculate bonus points
        } else {
            comboPoints = 0; // No points if combo is 1 or less
    }
  }
}

function getNearestAnt(index) {
  let nearestIndex = -1;
  let nearestDist = Infinity;
  for (let j = 1; j <= enemyCount; j++) {
    if (j !== index) { // don’t compare to self
      let dx = antX[j] - antX[index];
      let dy = antY[j] - antY[index];
      let distSq = dx * dx + dy * dy; // squared distance (faster than dist())
      if (distSq < nearestDist) {
        nearestDist = distSq;
        nearestIndex = j;
      }
    }
  }
  return nearestIndex; // index of the nearest ant
}

function addDeathEffect(x, y, points = 100) {
  // death burst
  deathAnimations.push({
    x: x,
    y: y,
    size: 10,
    opacity: 255,
  });

  // floating score text
  floatingTexts.push({
    x: x,
    y: y - 10,
    text: `+${points}`,
    opacity: 255,
    riseSpeed: 1.5,
  });
}

function spawnEnemyExplosion(x, y, size, ownerId) {
  const BASE_RADIUS     = 20;  // radius for size 1
  const RADIUS_PER_SIZE = 40;

  const BASE_LIFE       = 10;  // frames for size 1 (~0.3 sec)
  const LIFE_PER_SIZE   = 20;

  let radius  = (BASE_RADIUS + RADIUS_PER_SIZE * (size - 1)) * explosionRadiusMultiplier[ownerId];
  let maxLife = (BASE_LIFE   + LIFE_PER_SIZE   * (size - 1)) * explosionResidueMultiplier[ownerId];

  enemyExplosions.push({
    x: x,
    y: y,
    radius: radius,
    maxLife: maxLife,
    life: 0,
    size: size,       // bulletSize that created it
    ownerId: ownerId  // which ant owns this explosion
  });
}

function drawEnemyExplosions() {
  for (let i = enemyExplosions.length - 1; i >= 0; i--) {
    let e = enemyExplosions[i];

    e.life++;

    let t = e.life / e.maxLife;
    let alpha = lerp(180, 0, t);
    let currentRadius = e.radius * (0.9 + 0.2 * sin(e.life * 0.4));

    // damage player ONCE if inside

    let d = dist(playerX, playerY, e.x, e.y);
    if (d < currentRadius) {
      // every frame the beetle is inside, do a “tick” of damage
      handleExplosionDamage(e.size, e.ownerId);
    }
  

    // draw explosion
    push();
    noStroke();
    fill(0, 255, 0, alpha * 0.6);
    ellipse(e.x, e.y, currentRadius * 1.2);

    fill(0, 200, 0, alpha);
    ellipse(e.x, e.y, currentRadius * 1);
    pop();

    if (e.life >= e.maxLife) {
      enemyExplosions.splice(i, 1);
    }
  }
}

function handleExplosionDamage(size, ownerId) {
  let damage = size/60; // same “units” as bulletSize

  if (shield > 0) {
    shield -= damage;
    antPoints[ownerId] = antPoints[ownerId] + damage;
    if(!sShieldHit1.isPlaying() || !sShieldHit2.isPlaying()) {
      sHit = round(random(1,2));
      if(sHit == 1) {
        sShieldHit1.play();
      } else {
        sShieldHit2.play();
      }
    }
  } else {
    health -= damage;
    antPoints[ownerId] = antPoints[ownerId] + damage;
    if(!sHit1.isPlaying() || !sHit2.isPlaying()) {
      sHit = round(random(1,2));
      if(sHit == 1) {
        sHit1.play();
      } else {
        sHit2.play();
      }
    }
  }
}

function autonomousAntMovement(){
  for (let i = 1; i <= enemyCount; i++) {
    if (findLocation[i] === true){
      if (followTarget[i] === true){
        if (standingPointX[i] > antX[i] + antSpeed[i]) {
          antX[i] += antSpeed[i];
        } else if (standingPointX[i] < antX[i] - antSpeed[i]) {
          antX[i] -= antSpeed[i];
        }

        if (standingPointY[i] > antY[i] + antSpeed[i]) {
          antY[i] += antSpeed[i];
        } else if (standingPointY[i] < antY[i] - antSpeed[i]) {
          antY[i] -= antSpeed[i];
        }
        antX[i] = constrain(antX[i], 0, windowWidth);
        antY[i] = constrain(antY[i], scoreBarHeight + 15, windowHeight);
      }
    }
  }
  for (let i = 1; i <= enemyCount; i++) {
    if (!keepDistance[i]) continue; // only handle autonomous keep-distance ants

    // --- Ensure valid anchors ---
    if (isNaN(anchorPointX[i]) || isNaN(anchorPointY[i]) || anchorPointX[i] === undefined) {
      anchorPointX[i] = spawnX[i];
      anchorPointY[i] = spawnY[i];
    }

    // --- Assign anchor based on behavior ---
    if (standStill[i]) {
      anchorPointX[i] = spawnX[i];
      anchorPointY[i] = spawnY[i];
    } else if (followBeetle[i]) {
      anchorPointX[i] = playerX;
      anchorPointY[i] = playerY;
    } else if (followAnt[i]) {
      const nearest = getNearestAnt(i);
      if (nearest !== -1) {
        anchorPointX[i] = antX[nearest];
        anchorPointY[i] = antY[nearest];
      }
    } else if (findLocation[i]) {
      anchorPointX[i] = standingPointX[i];
      anchorPointY[i] = standingPointY[i];
    }

    // --- Calculate movement ---
    let dx = anchorPointX[i] - antX[i];
    let dy = anchorPointY[i] - antY[i];
    let dist = sqrt(dx * dx + dy * dy);
    const ideal = distanceFromAnchor[i];


    // Approach or back away at uniform speed
    const tooFar = dist > ideal + 5;
    const tooClose = dist < ideal - 5;

    if (tooFar || tooClose) {
      // If too far → move toward anchor
      // If too close → move away from anchor
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (tooFar) {
        antX[i] += dirX * antSpeed[i];
        antY[i] += dirY * antSpeed[i];
      } else if (tooClose) {
        antX[i] -= dirX * antSpeed[i];
        antY[i] -= dirY * antSpeed[i];
      }
    }
    // --- Keep on screen ---
    antX[i] = constrain(antX[i], 0, windowWidth);
    antY[i] = constrain(antY[i], scoreBarHeight + 15, windowHeight);
  }
}


function drawDeathEffects() {
  // Draw particle-like bursts
  for (let i = deathAnimations.length - 1; i >= 0; i--) {
    let d = deathAnimations[i];
    push();
      noStroke();
      fill(255, 200, 0, d.opacity); // yellowish glow
      ellipse(d.x, d.y, d.size);
      fill(255, 100, 0, d.opacity * 0.7);
      ellipse(d.x, d.y, d.size * 0.6);
    pop();

    // Animate it
    d.size += 2;
    d.opacity -= 15;
    if (d.opacity <= 0) deathAnimations.splice(i, 1);
  }

  // Draw floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let t = floatingTexts[i];
    push();
      textAlign(CENTER);
      textSize(24);
      fill(255, 255, 0, t.opacity);
      text(t.text, t.x, t.y);
    pop();

    // Animate floating upward and fading out
    t.y -= t.riseSpeed;
    t.opacity -= 5;
    if (t.opacity <= 0) floatingTexts.splice(i, 1);
  }
}



function endGame(){
  if (health < 1){
    fill(128, 0, 0);
    rectMode(CORNER);
    rect(0, 0, windowWidth, windowHeight);
    rectMode(CENTER);
    fill(240, 164, 0);
    rect(windowWidth / 2, windowHeight * 0.75, windowWidth / 3, windowHeight / 6); // Moved button further down
    fill(255, 255, 255);
    if(levelEnd == 0){
      totalScore = totalScore + score;
      levelEnd = 1;
    }
    textAlign(CENTER);
    textSize(80);
    text('You Lost', windowWidth / 2, windowHeight / 2 - 120); // moved up
    textSize(40);
    text('Round: ' + level, windowWidth / 2, windowHeight / 2 - 60); // new line
    textSize(50);
    text('Score: ' + score, windowWidth / 2, windowHeight / 2 - 10);
    textSize(30);
    text('Total Score: ' + totalScore, windowWidth / 2, windowHeight / 2 + 30);
    text('High Score: ' + highScore, windowWidth / 2, windowHeight / 2 + 60);
    highScore = getItem('newHighScore');
    if(totalScore > highScore){
      storeItem('newHighScore', totalScore);
    }
    end = true;
    text('Restart?', windowWidth / 2, windowHeight * 0.75); // Adjusted position
    textSize(20);
    text('Press Enter', windowWidth / 2, windowHeight * 0.80); // Adjusted position

    if(!endmusic.isPlaying()) {
      gamemusic.stop();
      endmusic.play();
    }
    if (keyIsDown(13)) {
      end = false;
      level = 1;
      enemyCount = 1;
      levelEnd = 0;
      totalScore = 0;
      score = 0;
      health = 10;
      timeCount = 60;
      playerRotationValue = 0;
      bulletShot[enemyIndex] = 0;
      bulletSpeed[enemyIndex] = 100;
      playerX = width / 2;
      playerY = height / 2;
      shield = 3;
      shot = 3;
      //enemy one
      antX[enemyIndex] = windowWidth * 0.75;
      antY[enemyIndex] = windowHeight * 0.5;
      
      endmusic.stop();
      gamemusic.play();

    }else if (touches.length > 0) {
      end = false;
      level = 1;
      enemyCount = 1;
      levelEnd = 0;
      totalScore = 0;
      score = 0;
      health = 10;
      timeCount = 60;
      playerRotationValue = 0;
      bulletShot[enemyIndex] = 0;
      bulletSpeed[enemyIndex] = 100;
      playerX = width / 2;
      playerY = height / 2;
      shield = 3;
      shot = 3;
      //enemy one
      antX[enemyIndex] = windowWidth * 0.75;
      antY[enemyIndex] = windowHeight * 0.5;
      
      endmusic.stop();
      gamemusic.play();
    }
  }

if (timeCount < 0) {
    fill(0, 128, 0);
    rectMode(CORNER);
    rect(0, 0, windowWidth, windowHeight);
    if(levelEnd == 0){
      totalScore = totalScore + score;
      levelEnd = 1;
    }
    fill(255);
    textAlign(CENTER);
    if (liveRankingsPrinted === false){
      printLiveAntRankings();
      printWinningAntStats();
      liveRankingsPrinted = true;
    }
    // Show Round
    textSize(80);
    text('Score: ' + score, windowWidth / 2, windowHeight * 0.33);

    textSize(40);
    text('Total Score: ' + totalScore, windowWidth / 2, windowHeight * 0.42);

    textSize(30);
    text('High Score: ' + highScore, windowWidth / 2, windowHeight * 0.50);

    highScore = getItem('newHighScore');
    if (totalScore > highScore) {
      storeItem('newHighScore', totalScore);
    }

    end = true;

    rectMode(CENTER);
    fill(240, 164, 0);
    rect(windowWidth / 2, windowHeight * 0.61, windowWidth / 3, windowHeight / 6);

    fill(255);
    textSize(30);
    text('Next Round', windowWidth / 2, windowHeight * 0.60);
    textSize(20);
    text('Press Enter', windowWidth / 2, windowHeight * 0.65);
    if(!endmusic.isPlaying()) {
      gamemusic.stop();
      endmusic.play();
    }
    if (keyIsDown(13)) {
      nextRound();
    }else if (touches.length > 0) {
      nextRound();
    }
  }
}
function getWinningAnt() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  return antStats[0]; // top performer
}

function getTopAnts() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  return antStats.slice(0, 3); // top 3
  
}

function printLiveAntRankings() {
  let antStats = [];
  for (let i = 1; i <= enemyCount; i++) {
    let ratio = antPoints[i] / antLives[i];
    antStats.push({
      id: i,
      points: antPoints[i],
      lives: antLives[i],
      ratio: isNaN(ratio) ? 0 : ratio
    });
  }

  antStats.sort((a, b) => b.ratio - a.ratio);
  console.log("-------------------------------");
  console.log("=== Live Ant Rankings ===");
  for (let i = 0; i < antStats.length; i++) {
    console.log(
      `#${i + 1}: Ant ${antStats[i].id}  | Points: ${antStats[i].points}  | Lives: ${antStats[i].lives}  | Ratio: ${antStats[i].ratio.toFixed(2)}`
    );
  }

  console.log(`Currently winning ant: ${antStats[0].id} with ratio ${antStats[0].ratio.toFixed(2)}`);

}

function printWinningAntStats() {
  const topAnts = getTopAnts();
  const count1 = Math.round((enemyCount + 1) * 0.5);
  const count2 = Math.round((enemyCount + 1) * 0.3);
  const count3 = (enemyCount + 1) - count1 - count2;
  console.log("===============================");
  console.log("=== Round Over: Top 3 Ants ===");
  for (let i = 0; i < topAnts.length; i++) {
    const ant = topAnts[i];
    console.log(
      `#${i + 1}: Ant ${ant.id} | Points: ${ant.points} | Lives: ${ant.lives} | Ratio: ${ant.ratio.toFixed(2)}`
    );
    console.log(
      `   bulletSpeed: ${bulletSpeed[ant.id].toFixed(2)}, bulletCooldown: ${bulletCooldown[ant.id]}, antSpeed: ${antSpeed[ant.id].toFixed(2)}`
    );
    console.log(
      `   shotOffsetX: ${shotOffsetX[ant.id].toFixed(2)}, shotOffsetY: ${shotOffsetY[ant.id].toFixed(2)}`
    );
    console.log(
      `   followValue: ${followValue[ant.id].toFixed(2)}, autonomy: ${autonomy[ant.id].toFixed(2)}, bulletSize: ${bulletSize[ant.id].toFixed(2)}`
    );
    console.log(
      `   standingPointX: ${standingPointX[ant.id].toFixed(2)}, standingPointY: ${standingPointY[ant.id]}, distanceFromAnchor: ${distanceFromAnchor[ant.id].toFixed(2)}`
    );
  }

  console.log(`\nNext generation distribution:`);
  console.log(`   ${count1} ants inherit from #1`);
  console.log(`   ${count2} ants inherit from #2`);
  console.log(`   ${count3} ants inherit from #3`);
  console.log("===============================");
}



function nextRound(){
  end = false;
  liveRankingsPrinted = false;
  let winner = getWinningAnt();
  let topAnts = getTopAnts();  // top 3
  console.log("Top ants this round:", topAnts);
  level++;
  if (level <= 16){
    enemyCount++;
  }
  levelEnd = 0;
  score = 0;
  health = 10;
  if (level <= 3) {
      movementMutationRate = 0.1;
      timeCount = 10; 
  } else if (level <= 7) {
      movementMutationRate = 0.2;
      timeCount = 30; 
  } else {
      movementMutationRate = 0.4;
      timeCount = 60; 
  }
  
  for (let i = 1; i <= enemyCount; i++) {
    antX[i] = random(0, windowWidth);
    antY[i] = random(scoreBarHeight + ANT_SPAWN_BUFFER, windowHeight - ANT_SPAWN_BUFFER);
  }

  playerRotationValue = 0;
  bulletShot[enemyIndex] = 0;
  playerX = width / 2;
  playerY = height / 2;
  console.log("enemy count:", enemyCount);

  shield = 3;
  shot = 3;
  dashCoolDown = 0;

  playerSpeed = BASE_PLAYER_SPEED / enemyCount;
  
  endmusic.stop();
  gamemusic.play();
  

  // how many ants are influenced by each "winner"
  let count1 = Math.round(enemyCount * 0.5);
  let count2 = Math.round(enemyCount * 0.3);
  let count3 = enemyCount - count1 - count2; // remainder
  
  console.log(`Assigning ${count1} ants from #1, ${count2} ants from #2, ${count3} ants from #3`);

  let antGroups = [];
  for (let i = 0; i < count1; i++) antGroups.push(topAnts[0]);
  for (let i = 0; i < count2; i++) antGroups.push(topAnts[1]);
  for (let i = 0; i < count3; i++) antGroups.push(topAnts[2]);

  // shuffle so they aren’t always grouped
  antGroups = shuffle(antGroups);
  
  for (let i = 1; i <= enemyCount; i++) {
    strikeX[i] = 0;
    strikeY[i] = 0;
    strikeTime1[i] = 0;
    drawStrike1[i] = 1;
    bulletShot[i] = 0;
    enemyBullets[i] = [];

    let parent = antGroups[i-1]; // pick which "winner" this ant is based on
    if (parent) {
      console.log(`Ant ${i} inherits from parent Ant ${parent.id}`);
      bulletSpeed[i]   = constrain(bulletSpeed[parent.id]   + random(-50, 50), 60, 300);
      bulletCooldown[i]= constrain(floor(bulletCooldown[parent.id] + random(-5, 5)), 79, 200);
      antSpeed[i]      = constrain(antSpeed[parent.id]      + random(-0.3, 0.3), 0.9, 3);
      shotOffsetX[i]   = constrain(shotOffsetX[parent.id]   + random(-50, 50), -500, 500);
      shotOffsetY[i]   = constrain(shotOffsetY[parent.id]   + random(-50, 50), -500, 500);
      standingPointX[i]   = constrain(standingPointX[parent.id]   + random(-100, 100), 0, windowWidth);
      standingPointY[i]   = constrain(standingPointY[parent.id]   + random(-100, 100), scoreBarHeight, windowHeight);
      followValue[i]    = constrain(followValue[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 3.49);
      autonomy[i]    = constrain(autonomy[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
      distanceFromAnchor[i]    = constrain(distanceFromAnchor[parent.id]    + random(-100, 100), 0.1, 1000);
      explosionBehavior[i]    = constrain(explosionBehavior[parent.id]    + random(-movementMutationRate, movementMutationRate), -0.5, 1.5);
      explosionProximity[i]    = constrain(explosionProximity[parent.id]    + random(-100, 100), 0.1, 1000);
      angleFromSpawn[i]    = constrain(angleFromSpawn[parent.id]    + random((-PI / 3), (PI / 3)), 0, TWO_PI);
      bulletSize[i]    = constrain(bulletSize[parent.id]    + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3);
      explosionRadiusMultiplier[i] = constrain(explosionRadiusMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
      explosionResidueMultiplier[i] = constrain(explosionResidueMultiplier[parent.id] + random(-0.2, 0.2), 0.5, 3);
      bulletExplodeAfter[i] = constrain(bulletExplodeAfter[parent.id] + random(-50, 50), 100, 800);

      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = true;
        keepDistance[i] = false;
      } else if (Math.round(autonomy[i]) === 1){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      if (Math.round(explosionBehavior[i]) === 0){
        explodeOnTermination[i] = true;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 1){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = true;
      }
      if (Math.round(followValue[i]) === 0){
        followAnt[i] = false;
        followBeetle[i] = true;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 1) {
        followAnt[i] = true;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 2) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = true;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 3) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = true;
      }
    } else {

      bulletSpeed[i] = winner 
        ? constrain(bulletSpeed[winner.id] + random(-50, 50), 60, 300)   
        : random(60, 300);

      bulletCooldown[i] = winner 
        ? constrain(floor(bulletCooldown[winner.id] + random(-5, 5)), 79, 200)
        : floor(random(79, 200));

      antSpeed[i] = winner 
        ? constrain(antSpeed[winner.id] + random(-0.5, 0.5), 0.9, 3)   
        : random(0.9, 3);

      shotOffsetX[i] = winner 
        ? constrain(shotOffsetX[winner.id] + random(-50, 50), -500, 500)
        : random(-500, 500);

      shotOffsetY[i] = winner 
        ? constrain(shotOffsetY[winner.id] + random(-50, 50), -500, 500)
        : random(-500, 500);
      
      standingPointX[i] = winner 
        ? constrain(standingPointX[winner.id] + random(-100, 100), 0, windowWidth)
        : random(0, windowWidth);

      standingPointY[i] = winner 
        ? constrain(standingPointY[winner.id] + random(-100, 100), scoreBarHeight, windowHeight)
        : random(scoreBarHeight, windowHeight);
      
      followValue[i] = winner 
        ? constrain(followValue[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 3.49)
        : random(-0.5, 3.49);
      
      autonomy[i] = winner 
        ? constrain(autonomy[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 1.5)
        : random(-0.5, 1.5);
      
      distanceFromAnchor[i] = winner 
        ? constrain(distanceFromAnchor[winner.id] + random(-100, 100), 0.1, 1000)
        : random(0.1, 1000);
      
      explosionBehavior[i] = winner
        ? constrain(explosionBehavior[winner.id] + random(-movementMutationRate, movementMutationRate), -0.5, 1.5)
        : random(-0.5, 1.5);
      
      explosionProximity[i] = winner
        ? constrain(explosionProximity[winner.id] + random(-100, 100), 0.1, 1000)
        : random(0.1, 1000);
      
      angleFromSpawn[i] = winner 
        ? constrain(angleFromSpawn[winner.id] + random((-PI / 3), (PI / 3)), 0, TWO_PI)
        : random(0, TWO_PI);
      
      bulletSize[i] = winner 
        ? constrain(bulletSize[winner.id] + random(-(movementMutationRate / 2), (movementMutationRate / 2)), 1, 3)
        : random(1, 3);

      explosionRadiusMultiplier[i] = winner
        ? constrain(explosionRadiusMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3)
        : random(0.5, 3);

      explosionResidueMultiplier[i] = winner
        ? constrain(explosionResidueMultiplier[winner.id] + random(-0.2, 0.2), 0.5, 3)
        : random(0.5, 3);

      bulletExplodeAfter[i] = constrain(bulletExplodeAfter[winner.id] + random(-50, 50), 100, 800);
      
      if (Math.round(autonomy[i]) === 0){
        followTarget[i] = true;
        keepDistance[i] = false;
      } else if (Math.round(autonomy[i]) === 1){
        followTarget[i] = false;
        keepDistance[i] = true;
      }
      if (Math.round(explosionBehavior[i]) === 0){
        explodeOnTermination[i] = true;
        triggerExplodeViaProximity[i] = false;
      } else if (Math.round(explosionBehavior[i]) === 1){
        explodeOnTermination[i] = false;
        triggerExplodeViaProximity[i] = true;
      }
      if (Math.round(followValue[i]) === 0){
        followAnt[i] = false;
        followBeetle[i] = true;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 1) {
        followAnt[i] = true;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 2) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = true;
        standStill[i] = false;
      } else if (Math.round(followValue[i]) === 3) {
        followAnt[i] = false;
        followBeetle[i] = false;
        findLocation[i] = false;
        standStill[i] = true;
      }
    }
    
    antPoints[i] = 0;
    antLives[i] = 1;

    
    console.log(`Ant ${i} bulletSpeed = ${bulletSpeed[i]}, cooldown = ${bulletCooldown[i]}`);
  }

}




function drawStartScreen(){

  push();
    if (startMenu === false){
      imageMode(CENTER);
      image(splashScreen, windowWidth / 2, windowHeight / 2, windowHeight * 1.4, windowHeight);
      if(!titlemusic.isPlaying()) {
        titlemusic.play();
      }
      if (keyIsDown(13)) {
        startMenu = true;
      }
    }
    if (startMenu === true){
      imageMode(CENTER);
      image(splashScreen, windowWidth / 2, windowHeight / 2, windowHeight * 1.4, windowHeight);
      if(!titlemusic.isPlaying()) {
        titlemusic.play();
      }
      imageMode(CORNER);
      fill(0, 0, 0, 200);
      rect(0, 0, windowWidth, windowHeight);
      fill(255, 255, 255);
      textAlign(CENTER);
      textSize(80);
      text("Main Menu", windowWidth / 2, windowHeight / 3);
      textSize(40);
      text("1) Start Game", windowWidth / 2, (windowHeight / 3) + 60);
      text("2) *Under Development*", windowWidth / 2, (windowHeight / 3) + 120);
      if (keyIsDown(49)) {
        start = true;
        titlemusic.stop();
        gamemusic.play();
      }else if (keyIsDown(50)) {
        antdex = true;
        startMenu = false;
      }

    }
    antdexScreen();
  
  pop();
}

function antdexScreen() {
  if (!antdex) return;

  // Background
  imageMode(CORNER);
  fill(20);
  rect(0, 0, windowWidth, windowHeight);
  fill(255);
  textAlign(CENTER);
  textSize(70);
  text("Ant Types", windowWidth / 2, 100);
  
  stroke(100);
  strokeWeight(2);
  line(windowWidth / 2 - 200, 200, windowWidth / 2 + 200, 200);
  noStroke();
  
  let totalEntries = antDexEntries.length;
  let discoveredCount = antDexEntries.filter(e => e.discovered).length;
  let progress = discoveredCount / totalEntries;

  textSize(28);
  fill(255);
  text(`Discovered: ${discoveredCount} / ${totalEntries}`, windowWidth / 2, 150);

  // --- Discovery progress counter + smooth animated bar ---
  progressTarget = discoveredCount / totalEntries;

  // ease display toward target (smooth slide)
  // dynamic easing that slows down as it approaches the target
  let diff = abs(progressTarget - progressDisplay);
  let easing = map(diff, 0, 1, 0.01, 0.05, true); // fast at start, slow near end
  progressDisplay += (progressTarget - progressDisplay) * easing;

  // draw text
  textSize(28);
  fill(255);
  text(`Discovered: ${discoveredCount} / ${totalEntries}`, windowWidth / 2, 150);

  // draw progress bar
  rectMode(CENTER);
  fill(60);
  rect(windowWidth / 2, 180, 300, 16, 8);

  // animated fill
  // smooth gradient: red → green → gold
  let c1, c2, t;
  if (progressDisplay < 0.25) {
    c1 = color(255, 0, 0);     // red
    c2 = color(0, 255, 0);     // green
    t = progressDisplay / 0.25;
  } else if (progressDisplay < 0.5) {
    c1 = color(0, 255, 0);     // green
    c2 = color(160, 32, 240);  // purple
    t = (progressDisplay - 0.25) / 0.25;
  } else if (progressDisplay < 0.75) {
    c1 = color(160, 32, 240);  // purple
    c2 = color(255, 255, 255); // bright white
    t = (progressDisplay - 0.5) / 0.25;
  } else {
    c1 = color(255, 255, 255); // bright white
    c2 = color(255, 215, 0);   // gold
    t = (progressDisplay - 0.99) / 0.01;
  }
  let barColor = lerpColor(c1, c2, t);

  // --- shake effect when fully completed ---
  let shakeX = 0;
  let shakeY = 0;
  if (progressDisplay > 0.85 && progressDisplay < 0.999) {
    shakeX = random(-3 * progressDisplay, 3 * progressDisplay);
    shakeY = random(-3 * progressDisplay, 3 * progressDisplay);
  }

  // draw animated fill
  push();
  translate(shakeX, shakeY);
  fill(barColor);
  noStroke();
  rect(windowWidth / 2 - 150 + progressDisplay * 300 / 2, 180, 300 * progressDisplay, 16, 8);
  pop();
  rectMode(CORNER);

  if (progressDisplay > 0.999) {
    let glowAlpha = map(sin(frameCount * 0.05), -1, 1, 50, 180); // pulsing glow
    noFill();
    stroke(255, 215, 0, glowAlpha);
    strokeWeight(10);
    rectMode(CENTER);
    rect(windowWidth / 2, 180, 310, 20, 10);
    noStroke();
  }

  rectMode(CORNER);
  
  // --- Input handling ---
  if (keyIsDown(38)) dexTargetScroll += dexScrollSpeed; // up
  if (keyIsDown(40)) dexTargetScroll -= dexScrollSpeed; // down
  dexTargetScroll = constrain(
    dexTargetScroll,
    -((Math.ceil(antDexEntries.length / 2) * 220) - windowHeight + 220),
    0
  );
  dexScrollY = lerp(dexScrollY, dexTargetScroll, 0.2); // smooth scrolling

  // --- Layout parameters ---
  let colWidth = windowWidth / 2.3;      // space per column
  let leftColX = windowWidth / 2 - colWidth - 30;
  let rightColX = windowWidth / 2 + 30;
  let rowHeight = 220;                   // vertical spacing
  let baseY = 270 + dexScrollY;

  // --- Draw entries ---
  textAlign(LEFT);
  for (let i = 0; i < antDexEntries.length; i++) {
    let e = antDexEntries[i];
    let col = i % 2;                     // 0 = left, 1 = right
    let row = Math.floor(i / 2);
    let x = col === 0 ? leftColX : rightColX;
    let y = baseY + row * rowHeight;

    // only draw visible cards
    if (y > -180 && y < windowHeight + 180) {
      fill(i === selectedDexIndex ? 70 : 40);
      rect(x, y - 60, colWidth, 180, 20);

      if (e.discovered) {
        // --- normal visible entry ---
        fill(255);
        textSize(32);
        text(e.name, x + 20, y - 20);
        // allow for up to 3 lines of description text
        textSize(20);
        text(e.desc, x + 20, y + 5, colWidth - 40, 90);  // was 60 → now 90

        fill(180);
        textSize(18);
        text(e.stats, x + 20, y + 100);   
      } else {
        // --- hidden entry ---
        fill(180);
        textSize(32);
        text("???", x + 20, y - 20);

        textSize(20);
        text("?????????????????", x + 20, y + 10, colWidth - 40, 60);

        textSize(18);
        text("????????????", x + 20, y + 70);
      }
    }
  }

  // --- Scrollbar (right edge) ---
  let totalRows = Math.ceil(antDexEntries.length / 2);
  let contentHeight = totalRows * rowHeight;
  let viewRatio = windowHeight / contentHeight;
  let barH = max(60, windowHeight * viewRatio);
  fill(100, 100, 100, 150);
  rect(
    windowWidth - 30,
    map(-dexTargetScroll, 0, contentHeight - windowHeight + 220, 0, windowHeight - barH),
    10,
    barH,
    5
  );

  // --- Exit prompt ---
  fill(255);
  textAlign(CENTER);
  textSize(24);
  text("Press ESC to return", windowWidth / 2, windowHeight - 40);

  if (keyIsDown(27)) {
    antdex = false;
    startMenu = true;
  }
}


function mouseWheel(event) {
  if (antdex) dexTargetScroll -= event.delta / 2;
}

function touchMoved() {
  if (antdex) dexTargetScroll += (movedY);
}

function updateAntDexEntries() {
  //checks for and stores previously discovered ants
  if (movementType1Discovered === true){
    storeItem('movementType1PreviouslyDiscovered', movementType1Discovered)
  }
  if (getItem('movementType1PreviouslyDiscovered') === true){
    movementType1Discovered = getItem('movementType1PreviouslyDiscovered')
  }
  if (movementType2Discovered === true){
    storeItem('movementType2PreviouslyDiscovered', movementType2Discovered)
  }
  if (getItem('movementType2PreviouslyDiscovered') === true){
    movementType2Discovered = getItem('movementType2PreviouslyDiscovered')
  }
  if (movementType3Discovered === true){
    storeItem('movementType3PreviouslyDiscovered', movementType3Discovered)
  }
  if (getItem('movementType3PreviouslyDiscovered') === true){
    movementType3Discovered = getItem('movementType3PreviouslyDiscovered')
  }
  if (movementType4Discovered === true){
    storeItem('movementType4PreviouslyDiscovered', movementType4Discovered)
  }
  if (getItem('movementType4PreviouslyDiscovered') === true){
    movementType4Discovered = getItem('movementType4PreviouslyDiscovered')
  }
  if (movementType5Discovered === true) {
    storeItem('movementType5PreviouslyDiscovered', movementType5Discovered);
  }
  if (getItem('movementType5PreviouslyDiscovered') === true) {
    movementType5Discovered = getItem('movementType5PreviouslyDiscovered');
  }

  if (movementType6Discovered === true) {
    storeItem('movementType6PreviouslyDiscovered', movementType6Discovered);
  }
  if (getItem('movementType6PreviouslyDiscovered') === true) {
    movementType6Discovered = getItem('movementType6PreviouslyDiscovered');
  }

  if (movementType7Discovered === true) {
    storeItem('movementType7PreviouslyDiscovered', movementType7Discovered);
  }
  if (getItem('movementType7PreviouslyDiscovered') === true) {
    movementType7Discovered = getItem('movementType7PreviouslyDiscovered');
  }

  if (movementType8Discovered === true) {
    storeItem('movementType8PreviouslyDiscovered', movementType8Discovered);
  }
  if (getItem('movementType8PreviouslyDiscovered') === true) {
    movementType8Discovered = getItem('movementType8PreviouslyDiscovered');
  }
  if (maxSpeedDiscovered === true) {
    storeItem('maxSpeedPreviouslyDiscovered', maxSpeedDiscovered);
  }
  if (getItem('maxSpeedPreviouslyDiscovered') === true) {
    maxSpeedDiscovered = getItem('maxSpeedPreviouslyDiscovered');
  }

  if (minSpeedDiscovered === true) {
    storeItem('minSpeedPreviouslyDiscovered', minSpeedDiscovered);
  }
  if (getItem('minSpeedPreviouslyDiscovered') === true) {
    minSpeedDiscovered = getItem('minSpeedPreviouslyDiscovered');
  }
  if (heavyBulletsDiscovered === true) {
    storeItem('heavyBulletsPreviouslyDiscovered', heavyBulletsDiscovered);
  }
  if (getItem('heavyBulletsPreviouslyDiscovered') === true) {
    heavyBulletsDiscovered = getItem('heavyBulletsPreviouslyDiscovered');
  }

  if (landMineDiscovered === true) {
    storeItem('landMinePreviouslyDiscovered', landMineDiscovered);
  }
  if (getItem('landMinePreviouslyDiscovered') === true) {
    landMineDiscovered = getItem('landMinePreviouslyDiscovered');
  }
  
  if (minBulletSpeedDiscovered === true) {
    storeItem('minBulletSpeedPreviouslyDiscovered', minBulletSpeedDiscovered);
  }
  if (getItem('minBulletSpeedPreviouslyDiscovered') === true) {
    minBulletSpeedDiscovered = getItem('minBulletSpeedPreviouslyDiscovered');
  }

  if (midBulletSpeedDiscovered === true) {
    storeItem('midBulletSpeedPreviouslyDiscovered', midBulletSpeedDiscovered);
  }
  if (getItem('midBulletSpeedPreviouslyDiscovered') === true) {
    midBulletSpeedDiscovered = getItem('midBulletSpeedPreviouslyDiscovered');
  }

  if (maxBulletSpeedDiscovered === true) {
    storeItem('maxBulletSpeedPreviouslyDiscovered', maxBulletSpeedDiscovered);
  }
  if (getItem('maxBulletSpeedPreviouslyDiscovered') === true) {
    maxBulletSpeedDiscovered = getItem('maxBulletSpeedPreviouslyDiscovered');
  }

  if (basicBulletsDiscovered === true) {
    storeItem('basicBulletsPreviouslyDiscovered', basicBulletsDiscovered);
  }
  if (getItem('basicBulletsPreviouslyDiscovered') === true) {
    basicBulletsDiscovered = getItem('basicBulletsPreviouslyDiscovered');
  }

  if (rapidFireDiscovered === true) {
    storeItem('rapidFirePreviouslyDiscovered', rapidFireDiscovered);
  }
  if (getItem('rapidFirePreviouslyDiscovered') === true) {
    rapidFireDiscovered = getItem('rapidFirePreviouslyDiscovered');
  }
  
  if (walkingAntsDiscovered === true) {
    storeItem('walkingAntsPreviouslyDiscovered', walkingAntsDiscovered);
  }
  if (getItem('walkingAntsPreviouslyDiscovered') === true) {
    walkingAntsDiscovered = getItem('walkingAntsPreviouslyDiscovered');
  }

  if (averageFireRateAntsDiscovered === true) {
    storeItem('averageFireRateAntsPreviouslyDiscovered', averageFireRateAntsDiscovered);
  }
  if (getItem('averageFireRateAntsPreviouslyDiscovered') === true) {
    averageFireRateAntsDiscovered = getItem('averageFireRateAntsPreviouslyDiscovered');
  }

  if (minimalFireRateAntsDiscovered === true) {
    storeItem('minimalFireRateAntsPreviouslyDiscovered', minimalFireRateAntsDiscovered);
  }
  if (getItem('minimalFireRateAntsPreviouslyDiscovered') === true) {
    minimalFireRateAntsDiscovered = getItem('minimalFireRateAntsPreviouslyDiscovered');
  }

  if (straightShootingAntsDiscovered === true) {
    storeItem('straightShootingAntsPreviouslyDiscovered', straightShootingAntsDiscovered);
  }
  if (getItem('straightShootingAntsPreviouslyDiscovered') === true) {
    straightShootingAntsDiscovered = getItem('straightShootingAntsPreviouslyDiscovered');
  }

  if (wideShotAntsDiscovered === true) {
    storeItem('wideShotAntsPreviouslyDiscovered', wideShotAntsDiscovered);
  }
  if (getItem('wideShotAntsPreviouslyDiscovered') === true) {
    wideShotAntsDiscovered = getItem('wideShotAntsPreviouslyDiscovered');
  }

  if (wildShotAntsDiscovered === true) {
    storeItem('wildShotAntsPreviouslyDiscovered', wildShotAntsDiscovered);
  }
  if (getItem('wildShotAntsPreviouslyDiscovered') === true) {
    wildShotAntsDiscovered = getItem('wildShotAntsPreviouslyDiscovered');
  }

  if (mostOffTargetAntsDiscovered === true) {
    storeItem('mostOffTargetAntsPreviouslyDiscovered', mostOffTargetAntsDiscovered);
  }
  if (getItem('mostOffTargetAntsPreviouslyDiscovered') === true) {
    mostOffTargetAntsDiscovered = getItem('mostOffTargetAntsPreviouslyDiscovered');
  }

  if (middleStationedAntsDiscovered === true) {
    storeItem('middleStationedAntsPreviouslyDiscovered', middleStationedAntsDiscovered);
  }
  if (getItem('middleStationedAntsPreviouslyDiscovered') === true) {
    middleStationedAntsDiscovered = getItem('middleStationedAntsPreviouslyDiscovered');
  }

  if (chaserAntsDiscovered === true) {
    storeItem('chaserAntsPreviouslyDiscovered', chaserAntsDiscovered);
  }
  if (getItem('chaserAntsPreviouslyDiscovered') === true) {
    chaserAntsDiscovered = getItem('chaserAntsPreviouslyDiscovered');
  }

  if (midrangeAntsDiscovered === true) {
    storeItem('midrangeAntsPreviouslyDiscovered', midrangeAntsDiscovered);
  }
  if (getItem('midrangeAntsPreviouslyDiscovered') === true) {
    midrangeAntsDiscovered = getItem('midrangeAntsPreviouslyDiscovered');
  }

  if (farRangeAntsDiscovered === true) {
    storeItem('farRangeAntsPreviouslyDiscovered', farRangeAntsDiscovered);
  }
  if (getItem('farRangeAntsPreviouslyDiscovered') === true) {
    farRangeAntsDiscovered = getItem('farRangeAntsPreviouslyDiscovered');
  }

  if (playerBasedSnipersDiscovered === true) {
    storeItem('playerBasedSnipersPreviouslyDiscovered', playerBasedSnipersDiscovered);
  }
  if (getItem('playerBasedSnipersPreviouslyDiscovered') === true) {
    playerBasedSnipersDiscovered = getItem('playerBasedSnipersPreviouslyDiscovered');
  }
  
  //checks for new discoveries
  if (start === true){
    for (let i = 1; i <= enemyCount; i++) {
      if (!movementType1Discovered && followBeetle[i] === true && followTarget[i] === true){
        movementType1Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType2Discovered && followAnt[i] === true && followTarget[i] === true){
        movementType2Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType3Discovered && findLocation[i] === true && followTarget[i] === true){
        movementType3Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType4Discovered && standStill[i] === true && followTarget[i] === true){
        movementType4Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType5Discovered && followBeetle[i] === true && keepDistance[i] === true) {
        movementType5Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType6Discovered && followAnt[i] === true && keepDistance[i] === true) {
        movementType6Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType7Discovered && findLocation[i] === true && keepDistance[i] === true) {
        movementType7Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!movementType8Discovered && standStill[i] === true && keepDistance[i] === true) {
        movementType8Discovered = true;
        triggerDiscoveryPopup();
      }
      if (!maxSpeedDiscovered && antSpeed[i] === 3) {
        maxSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minSpeedDiscovered && antSpeed[i] === 0.9) {
        minSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!heavyBulletsDiscovered && bulletSize[i] >= 1.5) {
        heavyBulletsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!landMineDiscovered && bulletSize[i] >= 2.5) {
        landMineDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minBulletSpeedDiscovered && bulletSpeed[i] === 300) {
        minBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!midBulletSpeedDiscovered && bulletSpeed[i] === 180) {
        midBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!maxBulletSpeedDiscovered && bulletSpeed[i] === 60) {
        maxBulletSpeedDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!basicBulletsDiscovered && bulletSize[i] === 1) {
        basicBulletsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!rapidFireDiscovered && bulletCooldown[i] === 80) {
        rapidFireDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!walkingAntsDiscovered && antSpeed[i] === 1.95) {
        walkingAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!averageFireRateAntsDiscovered && bulletCooldown[i] === 120) {
        averageFireRateAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!minimalFireRateAntsDiscovered && bulletCooldown[i] === 200) {
        minimalFireRateAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!straightShootingAntsDiscovered && shotOffsetX[i] === 0 && shotOffsetY[i] === 0) {
        straightShootingAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!wideShotAntsDiscovered && (shotOffsetX[i] > 100 || shotOffsetY[i] > 0)) {
        wideShotAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!wildShotAntsDiscovered && (shotOffsetX[i] > 350 || shotOffsetY[i] > 350)) {
        wildShotAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!mostOffTargetAntsDiscovered && (shotOffsetX[i] === 500 || shotOffsetY[i] === 500)) {
        mostOffTargetAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!middleStationedAntsDiscovered && findLocation[i] === true && followTarget[i] === true && (standingPointX[i] === windowWidth / 2 || standingPointY === windowHeight / 2)) {
        middleStationedAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!chaserAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] < 80) {
        chaserAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!midrangeAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 150) {
        midrangeAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!farRangeAntsDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 500) {
        farRangeAntsDiscovered = true;
        triggerDiscoveryPopup();
      }
      if (!playerBasedSnipersDiscovered && followBeetle[i] === true && keepDistance[i] === true && distanceFromAnchor[i] > 800) {
        playerBasedSnipersDiscovered = true;
        triggerDiscoveryPopup();
      }
    }
  }
  

  
  antDexEntries = [
    {
      name: "Follow Beetle Ants",
      desc: "Follows the movements and intentions of the player, easily influenced and trapped.",
      stats: "Follow Target: Beetle • Follow Style: Follow",
      discovered: movementType1Discovered
    },
    {
      name: "Follow Ants Ants",
      desc: "Follows the movements of other ants, adapting to the style that's working for its neighbors.",
      stats: "Follow Target: Ants • Follow Style: Follow",
      discovered: movementType2Discovered
    },
    {
      name: "Find Spot Ants",
      desc: "Constantly moving to a chosen spot on the screen. This spot stays the same the entire round.",
      stats: "Follow Target: Location • Follow Style: Follow",
      discovered: movementType3Discovered
    },
    {
      name: "Stand Still Ants",
      desc: "Never moves. Stay on the location of its spawn until killed. The lack of movement often grants better aim.",
      stats: "Follow Target: Spawn • Follow Style: Follow",
      discovered: movementType4Discovered
    },
    {
      name: "Keep Distance From Beetle Ants",
      desc: "Strives to maintain a certain distance from the player, retreating if they're too close and closing in if they're too far.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance",
      discovered: movementType5Discovered
    },
    {
      name: "Keep Distance From Ants Ants",
      desc: "Keeps a certain distance from other ants, allowing them to coordinate how they distribute themselves across the screen.",
      stats: "Follow Target: Ants • Follow Style: Keep Distance",
      discovered: movementType6Discovered
    },
    {
      name: "Keep Distance From Location Ants",
      desc: "Stays a certain distance away from a spot in all directions. This spot and distance does not change for the entire round.",
      stats: "Follow Target: Location • Follow Style: Keep Distance",
      discovered: movementType7Discovered
    },
    {
      name: "Keep Distance From Spawn Ants",
      desc: "Moves a certain distance away from where it spawned each time it respawns. This combines slightly chaotic movements with the accuracy of standing still.",
      stats: "Follow Target: Spawn • Follow Style: Keep Distance",
      discovered: movementType8Discovered
    },
    {
      name: "Sprinting Ants",
      desc: "The fastest ants possible, moving at 3/4 the speed of the player. this allows them to prolong close encounters but more easily influenced.",
      stats: "Ant Speed: 3",
      discovered: maxSpeedDiscovered
    },
    {
      name: "Crawling Ants",
      desc: "The slowest ants possible, moving at just barely a crawl. They can't be influenced much position wise but they often get more accurate shots.",
      stats: "Ant Speed: 0.9",
      discovered: minSpeedDiscovered
    },
    {
      name: "Heavy Bullets Ants",
      desc: "These ants have bigger bullets, dealing more damage but moving at a slower speed. If they hit shields for more damage than the shields can handle the shield will take longer to regenerate.",
      stats: "Bullet Size: > 1.5",
      discovered: heavyBulletsDiscovered
    },
    {
      name: "Land Mine Ants",
      desc: "These ants have humongous bullets dealing devastating damage, so big that they practically aren't even moving, creating traps. It is extremely rare for bullets to get this size.",
      stats: "Bullet Size: > 2.5",
      discovered: landMineDiscovered
    },
    {
      name: "Basic Bullets Ants",
      desc: "Ants with normal sized bullets, each one doing basic damage. They often stay this way when the speed decrease of larger bullets is not worth the extra damage.",
      stats: "Bullet Size: 1",
      discovered: basicBulletsDiscovered
    },
    {
      name: "Slow Bullets Ants",
      desc: "The slowest a bullet can be. With a basic bullet it takes around 5 seconds for one to reach its target. This keeps the bullets on the screen for longer, providing more obstacles to avoid.",
      stats: "Bullet Speed: 300",
      discovered: minBulletSpeedDiscovered
    },
    {
      name: "Moderate Bullet Speed Ants",
      desc: "The most moderate bullet speed possible. With a basic bullet it takes around 3 seconds for one to reach its target. It’s not too fast or slow.",
      stats: "Bullet Speed: 180",
      discovered: midBulletSpeedDiscovered
    },
    {
      name: "Fast Bullets Ants",
      desc: "The fastest a bullet can be. With a basic bullet it takes around 1 seconds for one to reach its target. This gives the player less time to react but also less lingering obstacles",
      stats: "Bullet Speed: 60",
      discovered: maxBulletSpeedDiscovered
    },
    {
      name: "Rapid Fire Ants",
      desc: "Ants with shortest possible cooldown, shooting a bullet every 1.2 seconds. This is often peak difficulty.",
      stats: "Bullet Cooldown: 80",
      discovered: rapidFireDiscovered
    },
    {
      name: "Walking Ants",
      desc: "Ants with a moderate movement speed, enough to get around in a decent time but not speeding around, moving about half as fast as the player.",
      stats: "Ant Speed: 1.95",
      discovered: walkingAntsDiscovered
    },
    {
      name: "Average Fire Rate Ants",
      desc: "Fires bullets at a moderate rate. The ant will fire a bullet every 2 seconds.",
      stats: "Bullet Cooldown: 120",
      discovered: averageFireRateAntsDiscovered
    },
    {
      name: "Minimal Fire Rate Ants",
      desc: "What? How? Why? There’s no advantage to this, it starts the game at a faster fire rate already. Fires a bullet every 3.3 seconds.",
      stats: "Bullet Cooldown: 200",
      discovered: minimalFireRateAntsDiscovered
    },
    {
      name: "Straight Shooting Ants",
      desc: "These ants shoot directly at the player, often not hitting a moving target. Good for players that sit still.",
      stats: "Shot Offset: 0",
      discovered: straightShootingAntsDiscovered
    },
    {
      name: "Wide Shot Ants",
      desc: "These ants shoot off target often in an attempt to lead the player. Sometimes this gets so precise you could swear the ants can predict the future.",
      stats: "Shot Offset: < 100",
      discovered: wideShotAntsDiscovered
    },
    {
      name: "Wild Shot Ants",
      desc: "These ants shoot way off target, maybe taking advantage of extra speed from shooting a far bullet or blocking off the player’s next part of the screen. There are many potential uses for this.",
      stats: "Shot Offset: < 350",
      discovered: wildShotAntsDiscovered
    },
    {
      name: "The Most Off Target Ants",
      desc: "Doesn’t shoot anywhere near the player. Who knows why.",
      stats: "Shot Offset: 500",
      discovered: mostOffTargetAntsDiscovered
    },
    {
      name: "Middle Stationed Ants",
      desc: "These ants move towards spots in the middle of the screen, either because it's advantageous or nowhere else is.",
      stats: "Follow Target: Location • Follow Style: Follow • Standing Point: Middle",
      discovered: middleStationedAntsDiscovered
    },
    {
      name: "Chaser Ants",
      desc: "aka. Oh My God Those Ants Are Coming Right At Me Ants. These ants get close to the player to hit more of their shots, often seen as threatening because of their chosen proximity.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: < 80",
      discovered: chaserAntsDiscovered
    },
    {
      name: "Midrange Ants",
      desc: "These ants usually blend into a group, using bullets to keep the beetle at bay. They tend to skillfully dodge if the beetle gets too close.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 150",
      discovered: midrangeAntsDiscovered
    },
    {
      name: "Far Range Ants",
      desc: "These ants keep a distance from the player that is often inconvenient to close, usually resulting in them being overlooked and ignored in favor of easier prey.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 500",
      discovered: farRangeAntsDiscovered
    },
    {
      name: "Player Based Snipers",
      desc: "Stays very far away from the player, often ensuring a faster bullet.",
      stats: "Follow Target: Beetle • Follow Style: Keep Distance • Distance From Target: > 800",
      discovered: playerBasedSnipersDiscovered
    },
  ];
  
}
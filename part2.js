
//initialize canvas
var canvas = document.getElementById("myCanvas");
var c = canvas.getContext("2d");

//scale canvas to window height
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

//method of limiting framerate from
// https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe
const fps = 59;
var stop = false;
var fpsInterval, startTime, now, then, elapsed;
var mouseInputBox, avoidWallsBox, colorsFlockBox, betterAlignmentSim, betterCohesionSim, betterSeparationSim;
var boids = [];
var alphaValue = 1;

const backgroundColor = '#121212';
const boidColors = [
    '#11AD4F',
    '#4DE7FA',
    '#FA5701',
    '#8F58BE',
    '#0C85FA',
]

class Vec2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(other) {
        return new Vec2(this.x + other.x, this.y + other.y);
    }
    sub(other) {
        return new Vec2(this.x - other.x, this.y - other.y);
    }
    mult(scalar) {
        return new Vec2(this.x * scalar, this.y * scalar);
    }
    div(scalar) {
        if (scalar != 0) {
            return new Vec2(this.x / scalar, this.y / scalar);
        }
        else {
            return new Vec2(0, 0);
        }
    }
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        var mag = this.mag();
        if (mag > 0) {
            return this.div(mag);
        }
        else {
            return new Vec2(0, 0);
        }
    }
    // Rotate vector clockwise by angle in radians
    rotate(angle) {
        var x = this.x;
        var y = this.y;
        return new Vec2(x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle));
    }
    limit(max) {
        if (this.mag() > max) {
            return this.normalize().mult(max);
        }
    }
    copy() {
        return new Vec2(this.x, this.y);
    }
    static random() {
        return new Vec2(Math.random() * 2 - 1, Math.random() * 2 - 1);
    }
}

var origin = new Vec2(0, 0);
var mousePos = origin;

window.addEventListener('mousemove', e => {
    var rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;
});

//General information about boids derived from
//  https://www.red3d.com/cwr/boids/
class Boid {
    constructor(direction, pos, color) {
        this.direction = direction;
        this.pos = pos;
        this.color = color;
    }
    setSeparation(value) {
        this.separation = value;
    }
    setCohesion(value) {
        this.cohesion = value*0.2;
    }
    setAlignment(value) {
        this.alignment = value*0.05;
    }
    setObstacleAvoidance(value) {
        this.obstacleAvoidance = value;
    }
    setFlockRadius(value) {
        this.flockRadius = canvas.height * (value/100);
    }
    setMoveSpeed(value) {
        this.moveSpeed = (0.6 + (Math.random() * 0.4)) * (value/8);
    }
    setSize(value) {
        this.sideLength = value/5;
    }
    determineFlock(others) {
        var currentFlock = [];
        others.forEach((other) => {
            var dist = this.pos.sub(other.pos);

            if ((dist.mag() <= this.flockRadius) && !(other === this)) {
                if (colorsFlockBox.checked == false) {
                    currentFlock.push(other);
                }
                else if (other.color == this.color) {
                    currentFlock.push(other);
                }
            }
        });
        return currentFlock;
    }
    separate(others) {
        var separationVec = new Vec2(0, 0);
        others.forEach(other => {
            if (other != this) {
                var direction = this.pos.sub(other.pos);
                var dist = direction.mag();
                direction = direction.mult(1 / (dist * dist));
                separationVec = separationVec.add(direction);
            }
        });

        // avoid mouse
        var direction = this.pos.sub(mousePos);
        var dist = direction.mag();
        direction = direction.mult(1 / (dist * dist));
        separationVec = separationVec.add(direction);

        return separationVec;
    }
    align(flock) {
        var avgDirection = new Vec2(0, 0);
        flock.forEach((other) => {
            if (other != this) {
                avgDirection = avgDirection.add(other.direction);
            }
        });
        avgDirection.normalize();
        return avgDirection;
    }
    cohere(flock) {
        var avgPos = new Vec2(0, 0);
        var count = 0;
        flock.forEach((other) => {
            if (other != this) {
                avgPos = avgPos.add(other.pos);
                count++;
            }
        });
        if (count > 0) {
            avgPos = avgPos.div(count);
            avgPos = avgPos.sub(this.pos);
            avgPos = avgPos.normalize();
        }
        return avgPos;
    }
    avoidWalls() {
    }
    move() {
        this.direction = this.direction.normalize();
        this.pos = this.pos.add(this.direction.mult(this.moveSpeed));
        if (this.pos.x > canvas.width) {
            this.pos.x = 0;
        }
        else if (this.pos.x < 0) {
            this.pos.x = canvas.width;
        }
        if (this.pos.y > canvas.height) {
            this.pos.y = 0;
        }
        else if (this.pos.y < 0) {
            this.pos.y = canvas.height;
        }
    }
    update(others) {
        var flock = this.determineFlock(others);
        var alignVec = new Vec2(0, 0);
        var cohereVec = new Vec2(0, 0);
        var separateVec = new Vec2(0, 0);
        if (flock.length > 0) {
            alignVec = this.align(flock);
            cohereVec = this.cohere(flock);
        }
        separateVec = this.separate(others);
        if (avoidWallsBox.checked == true) {
            // this.avoidWalls();
        }
        alignVec = alignVec.mult(this.alignment);
        cohereVec = cohereVec.mult(this.cohesion);
        separateVec = separateVec.mult(this.separation);
        this.direction = this.direction.add(alignVec).add(cohereVec).add(separateVec);
        this.move();
    }
    draw() {
        //find the other to vertices of the triangle
        var normalizedDirection = this.direction.normalize();
        var right = normalizedDirection.rotate(Math.PI / 2);
        var tip = this.pos.add(normalizedDirection.mult(this.sideLength));
        var back = this.pos.sub(normalizedDirection.mult(this.sideLength));
        var backRight = back.add(right.mult(this.sideLength / 1.5));
        var backLeft = back.sub(right.mult(this.sideLength / 1.5));

        c.beginPath();
        c.moveTo(tip.x, tip.y);
        c.lineTo(backLeft.x, backLeft.y);
        c.lineTo(backRight.x, backRight.y);
        c.closePath();

        c.lineWidth = 1;
        c.strokeStyle = boidColors[this.color];
        c.stroke();

        c.save();
        c.fillStyle = boidColors[this.color];
        c.globalAlpha = 0.5;
        c.fill();
        c.restore();
    }
}

function drawAll(boids) {
    boids.forEach(boid => {
        boid.update(boids);
        boid.draw();
    });
}

function startDrawLoop() {
    fpsInterval = 1000 / fps;
    then = Date.now();
    drawLoop();
}

function drawLoop() {
    if (stop) {
        return;
    }

    window.requestAnimationFrame(drawLoop);

    //limit framerate to 60fps
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);

        //draw things
        c.save();
        c.globalAlpha = alphaValue;
        c.fillStyle = backgroundColor;
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.fill();
        c.restore();

        drawAll(boids);
    }
}

var flockRangeSlider = document.getElementById("flockRangeSlider");
var flockRangeOutput = document.getElementById("flockRangeOut");
flockRangeOutput.innerHTML = "Flocking range: screen Height * " + flockRangeSlider.value / 100;
flockRangeSlider.oninput = function () {
    flockRangeOutput.innerHTML = "Flocking range: screen Height * " + flockRangeSlider.value / 100;
    boids.forEach(boid => {
        boid.setFlockRadius(flockRangeSlider.value);
    });
}

var boidMoveSpeedSlider = document.getElementById("boidMoveSpeedSlider");
var moveSpeedOut = document.getElementById("boidMoveSpeedOut");
moveSpeedOut.innerHTML = "Boid speed: " + boidMoveSpeedSlider.value/100;
boidMoveSpeedSlider.oninput = function () {
    moveSpeedOut.innerHTML = "Boid speed: " + boidMoveSpeedSlider.value/100;
    boids.forEach(boid => {
        boid.setMoveSpeed(this.value);
    });
}

var boidSizeSlider = document.getElementById("boidSizeSlider");
var boidSizeOut = document.getElementById("boidSizeOut");
boidSizeOut.innerHTML = "Boid Size: " + boidSizeSlider.value/100;
boidSizeSlider.oninput = function () {
    boidSizeOut.innerHTML = "Boid size: " + this.value/100;
    boids.forEach(boid => {
        boid.setSize(this.value);
    });
}

var boidSeparationSlider = document.getElementById("separationSlider");
var boidSeparationOut = document.getElementById("separationOut");
boidSeparationOut.innerHTML = "Separation weight: " + boidSeparationSlider.value/100;
boidSeparationSlider.oninput = function () {
    boidSeparationOut.innerHTML = "Separation weight: " + boidSeparationSlider.value/100;
    boids.forEach(boid => {
        boid.setSeparation(this.value);
    });
}

var boidCohesionSlider = document.getElementById("cohesionSlider");
var boidCohesionOut = document.getElementById("cohesionOut");
boidCohesionOut.innerHTML = "Cohesion weight: " + boidCohesionSlider.value/100;
boidCohesionSlider.oninput = function () {
    boidCohesionOut.innerHTML = "Cohesion weight: " + boidCohesionSlider.value/100;
    boids.forEach(boid => {
        boid.setCohesion(this.value);
    });
}

var boidAlignmentSlider = document.getElementById("alignmentSlider");
var boidAlignmentOut = document.getElementById("alignmentOut");
boidAlignmentOut.innerHTML = "Alignment weight: " + boidAlignmentSlider.value/100;
boidAlignmentSlider.oninput = function () {
    boidAlignmentOut.innerHTML = "Alignment weight: " + boidAlignmentSlider.value/100;
    boids.forEach(boid => {
        boid.setAlignment(this.value);
    });
}

var alphaSlider = document.getElementById("alphaSlider");
var alphaOut = document.getElementById("alphaOut");
alphaOut.innerHTML = "Trails length: " + alphaSlider.value;
alphaValue = (10 - alphaSlider.value) / 10;;
alphaSlider.oninput = function () {
    alphaOut.innerHTML = "Trails length: " + alphaSlider.value;
    alphaValue = (10 - alphaSlider.value) / 10;
}

mouseInputBox = document.getElementById("mouseInputBox");
var mouseInputOut = document.getElementById("mouseInputOut");
mouseInputOut.innerHTML = "Avoid mouse?";

avoidWallsBox = document.getElementById("avoidWallsBox");
var avoidWallsOut = document.getElementById("avoidWallsOut");
avoidWallsOut.innerHTML = "Avoid walls?";

colorsFlockBox = document.getElementById("flockingColorsBox");

function setNumBoids(desiredNum) {
    var currentBoids = boids.length;
    if (currentBoids > desiredNum) {
        for (let i = 0; i < currentBoids - desiredNum; i++) {
            boids.pop();
        }
        boids.forEach(boid => {
            boid.update();
        });
    }
    else {
        for (let i = boids.length; i < desiredNum; i++) {
            var x = Math.random() * canvas.width;
            var y = Math.random() * canvas.height;
            var color = Math.floor(Math.random() * 5);
            boids.push(new Boid(Vec2.random().normalize(), new Vec2(x, y), color));
            boids[boids.length - 1].setFlockRadius(flockRangeSlider.value);
            boids[boids.length - 1].setMoveSpeed(boidMoveSpeedSlider.value);
            boids[boids.length - 1].setSeparation(boidSeparationSlider.value);
            boids[boids.length - 1].setCohesion(boidCohesionSlider.value);
            boids[boids.length - 1].setAlignment(boidAlignmentSlider.value);
            boids[boids.length - 1].setSize(boidSizeSlider.value);        
        }
    }
}

var numBoids = document.getElementById("numBoids");
numBoids.onchange = function () {
    setNumBoids(parseInt(numBoids.value));
}

setNumBoids(parseInt(numBoids.value));  //TODO make relevant to sliders

var i = 0;
startDrawLoop();
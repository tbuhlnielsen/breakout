const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

// § Constants.
const midX = canvas.width / 2;
const bottomY = canvas.height;

const paddleWidth = 75;
const paddleHeight = 10;

const ballRadius = 10;

const brickWidth = 80;
const brickHeight = 20;
const brickRows = 5;
const brickCols = 8;
const brickGap = 10;
const xOffset = (canvas.width - brickCols * (brickWidth + brickGap - 1)) / 2;
const yOffset = 2 * brickHeight;
const brickColors = ["#dc2723", "#eb7814", "#ffc100", "green", "blue"];

// § Listening for keyboard input.
// The left and right arrow keys are used to move the paddle.
// The enter key is used to reset the game, the space key is used to start it.
let leftPressed = false;
let rightPressed = false;
let enterPressed = false;
let spacePressed = false;

document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "Left") {
        leftPressed = true;
    } else if (e.key === "ArrowRight" || e.key === "Right") {
        rightPressed = true;
    }
});

document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "Left") {
        leftPressed = false;
    } else if (e.key === "ArrowRight" || e.key === "Right") {
        rightPressed = false;
    }
});

document.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        enterPressed = true;
    } else if (e.key === " ") {
        spacePressed = true;
    }
});

// § Sprites
class Ball {
    constructor(x, y, radius, speed, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speed = speed;
        this.velX = 0;
        this.velY = 0;
        this.color = color;
    }

    launch() {
        this.velX = (Math.random() < 0.5) ? -1 : 1;
        this.velY = -this.speed;
    }

    reset() {
        this.x = midX;
        this.y = bottomY - paddleHeight - this.radius;
        this.velX = 0;
        this.velY = 0;
    }

    update() {
        this.move();
        this.handleEdgeCollisions();
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, true);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move() {
        this.x += this.velX;
        this.y += this.velY;
    }

    // Rebounds a Ball if it hits one of the canvas' edges (except the bottom,
    // which is handled separately because a collision there ends the game).
    handleEdgeCollisions() {
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.velX *= -1;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.velX *= -1;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.velY *= -1;
        }
    }
}

class Block {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.exploded = false;
    }

    draw() {
        if (!this.exploded) {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.closePath();
        }
    }
}

class Paddle extends Block {
    constructor(x, y, speed, color) {
        super(x, y, paddleWidth, paddleHeight, color);
        this.speed = speed;
        this.active = false; // Used to ensure the player can't move a Paddle 
                             // before the game starts.
    }

    activate() {
        this.active = true;
    }

    reset() {
        this.x = midX - this.width / 2;
        this.y = bottomY - this.height;
        this.active = false;
    }

    update() {
        if (this.active) {
            this.move();
            this.checkBounds();
        }
    }

    move() {
        let dx = 0
        if (leftPressed) {
            dx = -this.speed;
        }
        if (rightPressed) {
            dx = this.speed;
        }
        this.x += dx;
    }

    // Forces a Paddle to stay within the horizontal bounds of the canvas.
    checkBounds() {
        if (this.x < 0) {
            this.x = 0;
        }
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
        }
    }
}

// Returns true iff the smallest square enclosing ball intersects block.
function didCollide(ball, block) {
    if (ball.x + ball.radius < block.x || block.x + block.width < ball.x - ball.radius) {
        return false;
    }
    if (ball.y + ball.radius < block.y || block.y + block.height < ball.y - ball.radius) {
        return false;
    }
    return true;
}

// Returns an array of Blocks to be used as the player's targets.
function getBricks() {
    let bricks = [];
    for (let row = 0; row < brickRows; row++) {
        let y = yOffset + row * (brickHeight + brickGap);
        for (let col = 0; col < brickCols; col++) {
            let x = xOffset + col * (brickWidth + brickGap);
            bricks.push(new Block(x, y, brickWidth, brickHeight, brickColors[row]));
        }
    }
    return bricks;
}

class Game {
    constructor() {
        this.player = new Paddle(midX - paddleWidth/2, bottomY - paddleHeight, 6, "white");
        this.ball = new Ball(midX, bottomY - paddleHeight - ballRadius, ballRadius, 5, "#8418e7");
        this.bricks = getBricks();
        this.started = false;
        this.ended = false;
        this.score = 0;
    }

    run() {
        if (spacePressed) {
            this.start();
            spacePressed = false;
        }
        if (enterPressed) {
            this.reset();
            enterPressed = false;
        }
        if (!this.ended) {
            this.update();
            this.draw();
            this.checkEnded();
        }
        requestAnimationFrame(this.run.bind(this));
    }

    start() {
        if (!this.started) {
            this.ball.launch();
            this.player.activate();
            this.started = true;
        }
    }

    reset() {
        if (this.ended) {
            this.player.reset();
            this.ball.reset();
            this.bricks = getBricks();
            this.started = false;
            this.ended = false;
            this.score = 0;
        }
    }

    update() {
        this.player.update();
        this.ball.update();
        this.handleCollisions();
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.ball.draw();
        this.player.draw();
        this.bricks.forEach(brick => brick.draw());
    }

    checkEnded() {
        if (this.ball.y > this.player.y) {
            this.ended = true;
        }
        if (this.score === brickRows * brickCols) {
            this.ended = true;
        }
    }

    handleCollisions() {
        this.bricks.forEach(brick => {
            if (!brick.exploded && didCollide(this.ball, brick)) {
                brick.exploded = true;
                this.score++;
                if (this.ball.y < brick.y || brick.y + brick.height < this.ball.y) {
                    this.ball.velY *= -1;
                }
                else if (this.ball.x < brick.x || brick.x + brick.width < this.ball.x) {
                    this.ball.velX *= -1;
                }
            }
        });
        
       if (didCollide(this.ball, this.player)) {
           this.ball.y = bottomY - paddleHeight - this.ball.radius;
           this.ball.velY *= -1;
           this.ball.velX = 2 * (this.ball.speed / paddleWidth) 
                              * (this.ball.x - this.player.x) 
                              - this.ball.speed;
       }
    }
}

let game = new Game();
game.run();
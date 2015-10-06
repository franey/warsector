var then;
var keysToCapture, keysDown;
var canvas, ctx;
var camera;
var cube, pyramid;

////////////////////////////////////////////////////////////////////////
// A note on co-ordinate systems
// =====================================================================
// The playing area is mapped out on a right-handed co-ordinate system, 
// where the x axis points due 'east', the y axis due 'north', and the 
// z axis straight up.
//
// In keeping with trigonometric norms, an angle of 0 degrees/radians 
// points straight along the x-axis.
//
// When projecting on to the screen, however, we need to project on to a
// system where the x-axis goes from left to right, but the y-axis goes
// from top to bottom (and the virtual z-axis goes into the screen).
//
// As we effectively rotate the whole scene relative to the camera, this
// means we:
//
// - project the camera's y-axis to the screen's x-axis, inversely
//   (because at 0°/radians, points with a positive dy appear to the
//   left and those with a negative dy appear to the right)
//
// - project the camera's z-axis to the screen's y-axis, again inversely
//   (high dz appears at the top, low dz at the bottom)
//
// - project the camera's x-axis to the screen's virtual z-axis, this
//   time directly (high dx appears further away)
////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////
var mod = function (a, n) {
    return (a % n + n) %n;
};

// Camera
////////////////////////////////////////////////////////////////////////
var Camera = function (x, y, z, yaw) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.yaw = yaw;
    this.updateTransform();
};

Camera.prototype.move = function (seconds, direction) {
    var distance = seconds * Camera.speed;
    
    if (direction === "backwards") {
        distance *= -1;
    }

    this.x += distance * Math.cos(this.yaw);
    this.y += distance * Math.sin(this.yaw);
};

Camera.prototype.turn = function (seconds, direction) {
    var angle = seconds * Camera.angularSpeed;

    if (direction === "right") {
        angle *= -1;
    }

    this.yaw = mod(this.yaw + angle, 2*Math.PI);
    this.updateTransform();
};
    
Camera.prototype.updateTransform = function () {
    var cos = Math.cos(-this.yaw);
    var sin = Math.sin(-this.yaw);

    this.transform = function (point) {
        var dx = point.x - this.x;
        var dy = point.y - this.y;
        var dz = point.z - this.z;
        var transformed = new Point();

        transformed.x = dx*cos - dy*sin;
        transformed.y = dy*cos + dx*sin;
        transformed.z = dz;

        return transformed;
    };
};

////////////////////////////////////////////////////////////////////////
// Point
////////////////////////////////////////////////////////////////////////
var Point = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
};

Point.prototype.project = function () {
    var transformed = camera.transform(this);
    var zScale;
    var dx, dy;

    if (transformed.x > 0) {
        zScale = Camera.focalLength / transformed.x;
        dx = transformed.y * zScale;
        dy = transformed.z * zScale;

        this.projection = {
            x: canvas.width/2    - dx,
            y: canvas.height*2/3 - dy
        };
    } else {
        this.projection = null;
    }
};

////////////////////////////////////////////////////////////////////////
// Edge
////////////////////////////////////////////////////////////////////////
var Edge = function (from, to) {
    this.from = from;
    this.to = to;
}

Edge.prototype.draw = function () {
    if (this.from.projection && this.to.projection) {
        ctx.beginPath();
        ctx.moveTo(this.from.projection.x, this.from.projection.y);
        ctx.lineTo(this.to.projection.x, this.to.projection.y);
        ctx.stroke();
    }
};

////////////////////////////////////////////////////////////////////////
// Shape
////////////////////////////////////////////////////////////////////////
var Shape = function (vertices, edges) {
    var that = this;

    vertices = vertices || [];
    edges = edges || [];
    
    this.vertices = [];
    this.edges = [];

    vertices.map(function (v) {
        that.vertices.push(new Point(v[0], v[1], v[2]));
    });

    edges.map(function (e) {
        for (var i = 0; i < e[1].length; i++) {
            that.edges.push(new Edge(that.vertices[e[0]],
                        that.vertices[e[1][i]]));
        }
    });
};

Shape.prototype.draw = function () {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00ff22";
    ctx.shadowColor = ctx.strokeStyle;
    this.vertices.map(function (v) {v.project();});
    this.edges.map(function (e) {e.draw();});
};

////////////////////////////////////////////////////////////////////////
// Misc
////////////////////////////////////////////////////////////////////////
var drawHorizon = function () {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#008811";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height*2/3);
    ctx.lineTo(canvas.width, canvas.height*2/3);
    ctx.stroke();
};

var drawHUD = function () {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff0022";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.strokeText("x: " + Math.floor(camera.x) +
            "  y: " + Math.floor(camera.y) +
            "  yaw: " + Math.floor(mod(360 - camera.yaw*180/Math.PI, 360)) + "°",
            32, 32);
};

var drawSight = function () {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#008811";
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();
    ctx.moveTo(canvas.width/2, canvas.height/3);
    ctx.lineTo(canvas.width/2, canvas.height/2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width*3/8, canvas.height*7/12);
    ctx.lineTo(canvas.width*3/8, canvas.height/2);
    ctx.lineTo(canvas.width*5/8, canvas.height/2);
    ctx.lineTo(canvas.width*5/8, canvas.height*7/12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width/2, canvas.height);
    ctx.lineTo(canvas.width/2, canvas.height*5/6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width*3/8, canvas.height*3/4);
    ctx.lineTo(canvas.width*3/8, canvas.height*5/6);
    ctx.lineTo(canvas.width*5/8, canvas.height*5/6);
    ctx.lineTo(canvas.width*5/8, canvas.height*3/4);
    ctx.stroke();

};


var render = function () {
    // clear canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawHorizon();
    drawHUD();
    drawSight();

    // draw shapes
    cube.draw();
    pyramid.draw();
};

////////////////////////////////////////////////////////////////////////
// Set-up
////////////////////////////////////////////////////////////////////////
var init = function () {
    
    // Key capture
    keysToCapture = {
        //13: "Enter",
        //32: " ",
        37: "ArrowLeft",
        38: "ArrowUp",
        39: "ArrowRight",
        40: "ArrowDown",
        65: "a",
        76: "l",
        80: "p",
        81: "q",
    };

    keysDown = {};

    addEventListener("keydown", function (e) {
        var key = e.key || keysToCapture[e.keyCode];

        if (e.keyCode in keysToCapture) {
            e.preventDefault();
        }

        if (key) {
            keysDown[key] = true;
        }
    }, false);

    addEventListener("keyup", function (e) {
        var key = e.key || keysToCapture[e.keyCode];

        if (key) {
            delete keysDown[key];
        }
    }, false);

    canvas = document.getElementById("screen");
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.font = "18px monospace";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    camera = new Camera(0, 0, 200, 0);

    cube = new Shape([[2400, 800, 400], [2400, 400, 400],
                      [2400, 800,   0], [2400, 400,   0],
                      [2000, 800, 400], [2000, 400, 400],
                      [2000, 800,   0], [2000, 400,   0]],
                     [[0, [1, 2, 4]],
                      [3, [1, 2, 7]],
                      [5, [1, 4, 7]],
                      [6, [2, 4, 7]]]);

    pyramid = new Shape([[3200, -700, 400],
                         [3400, -500, 0], [3400, -900, 0],
                         [3000, -500, 0], [3000, -900, 0]],
                        [[0, [1, 2, 3, 4]],
                         [1, [2, 3]],
                         [4, [2, 3]]]);

    Camera.angularSpeed = Math.PI/3;
    Camera.focalLength = canvas.width/2;
    Camera.speed = 1000;
};

////////////////////////////////////////////////////////////////////////
// Animation
////////////////////////////////////////////////////////////////////////
var animate = function (now) {
    var seconds;

    then = then || now;
    seconds = (now - then) / 1000;
    then = now;

    if ("ArrowLeft" in keysDown) {
        camera.turn(seconds, "left");
    }

    if ("ArrowRight" in keysDown) {
        camera.turn(seconds, "right");
    }

    if ("ArrowUp" in keysDown) {
        camera.move(seconds, "forwards");
    }

    if ("ArrowDown" in keysDown) {
        camera.move(seconds, "backwards");
    }

    render();
    requestAnimationFrame(animate);
};


////////////////////////////////////////////////////////////////////////
// Run
////////////////////////////////////////////////////////////////////////
init();
animate(performance.now());

// eof

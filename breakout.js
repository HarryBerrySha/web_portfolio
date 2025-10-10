document.addEventListener("DOMContentLoaded", () => {
    (function () {
        const revealBtn = document.getElementById("revealGameBtn");
        const gameArea = document.getElementById("breakoutGameArea");
        const startBtn = document.getElementById("startGameBtn");
        const pauseBtn = document.getElementById("pauseGameBtn");
        const scoreEl = document.getElementById("breakoutScore");
        const livesEl = document.getElementById("breakoutLives");
        const levelEl = document.getElementById("breakoutLevel");
        const canvas = document.getElementById("breakoutCanvas");
        const ctx = canvas.getContext("2d");

        const VWIDTH = 800, VHEIGHT = 600;
        let running = false, paused = false, rafId = null;
        let score = 0, lives = 3, level = 1;

        const paddle = { w: 120, h: 14, x: VWIDTH / 2 - 60, y: VHEIGHT - 60, speed: 700 };
        const ball = { r: 10, x: VWIDTH / 2, y: VHEIGHT / 2, vx: 240, vy: -240 };
        let bricks = [];
        const ROWS = 5, COLS = 10, BW = 64, BH = 22, PAD = 10;
        const OFFSET_TOP = 64, OFFSET_LEFT = (VWIDTH - (COLS * (BW + PAD) - PAD)) / 2;

        function buildBricks() {
            bricks = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    bricks.push({ x: OFFSET_LEFT + c * (BW + PAD), y: OFFSET_TOP + r * (BH + PAD), w: BW, h: BH, alive: true });
                }
            }
        }

        function reset() {
            score = 0; lives = 3; level = 1; paused = false;
            paddle.x = VWIDTH / 2 - paddle.w / 2;
            ball.x = VWIDTH / 2; ball.y = VHEIGHT / 2; ball.vx = 240; ball.vy = -240;
            buildBricks();
            updateHUD();
        }

        function updateHUD() {
            scoreEl.textContent = `Score: ${score}`;
            livesEl.textContent = `Lives: ${lives}`;
            levelEl.textContent = `Level: ${level}`;
        }

        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(canvas.width / VWIDTH, 0, 0, canvas.height / VHEIGHT, 0, 0);
        }

        let left = false, right = false;
        window.addEventListener("keydown", e => {
            if (e.key === "ArrowLeft") left = true;
            if (e.key === "ArrowRight") right = true;
            if (e.key === " ") { paused = !paused; pauseBtn.textContent = paused ? "Resume" : "Pause"; }
        });
        window.addEventListener("keyup", e => {
            if (e.key === "ArrowLeft") left = false;
            if (e.key === "ArrowRight") right = false;
        });
        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const x = (e.clientX - rect.left) * dpr * (VWIDTH / canvas.width);
            paddle.x = Math.max(0, Math.min(VWIDTH - paddle.w, x - paddle.w / 2));
        });

        let last = 0;
        function loop(ts) {
            if (!running) return;
            if (paused) { rafId = requestAnimationFrame(loop); return; }
            if (!last) last = ts;
            const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
            update(dt); render();
            rafId = requestAnimationFrame(loop);
        }

        function update(dt) {
            if (left) paddle.x -= paddle.speed * dt;
            if (right) paddle.x += paddle.speed * dt;
            paddle.x = Math.max(0, Math.min(VWIDTH - paddle.w, paddle.x));

            ball.x += ball.vx * dt; ball.y += ball.vy * dt;
            if (ball.x - ball.r < 0 || ball.x + ball.r > VWIDTH) ball.vx *= -1;
            if (ball.y - ball.r < 0) ball.vy *= -1;

            if (ball.y + ball.r >= paddle.y && ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.vy > 0) {
                ball.y = paddle.y - ball.r;
                const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                const speed = Math.hypot(ball.vx, ball.vy);
                const angle = rel * Math.PI / 3;
                ball.vx = speed * Math.sin(angle);
                ball.vy = -Math.abs(speed * Math.cos(angle));
            }

            for (let b of bricks) {
                if (!b.alive) continue;
                if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
                    b.alive = false; score += 10; ball.vy *= -1;
                }
            }

            if (ball.y - ball.r > VHEIGHT) {
                lives--; updateHUD();
                if (lives <= 0) { endGame(); return; }
                ball.x = VWIDTH / 2; ball.y = VHEIGHT / 2; ball.vx = 240; ball.vy = -240;
            }

            if (!bricks.some(b => b.alive)) {
                level++; ball.vx *= 1.1; ball.vy *= 1.1; buildBricks();
            }
            updateHUD();
        }

        function render() {
            ctx.clearRect(0, 0, VWIDTH, VHEIGHT);
            ctx.fillStyle = "#041728"; ctx.fillRect(0, 0, VWIDTH, VHEIGHT);
            for (let b of bricks) { if (!b.alive) continue; ctx.fillStyle = "#3dd6a7"; ctx.fillRect(b.x, b.y, b.w, b.h); }
            ctx.fillStyle = "#fff"; ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
            ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
        }

        function startLoop() { if (running) return; running = true; last = 0; rafId = requestAnimationFrame(loop); }
        function stopLoop() { running = false; cancelAnimationFrame(rafId); rafId = null; }

        function endGame() {
            stopLoop();
            gameArea.style.display = 'none';
            revealBtn.style.display = 'inline-block';
        }

        revealBtn.onclick = function () {
            revealBtn.style.display = 'none';
            gameArea.style.display = 'block';
            resizeCanvas();
        };

        startBtn.addEventListener("click", () => {
            reset(); resizeCanvas(); startLoop();
        });

        pauseBtn.addEventListener("click", () => {
            paused = !paused;
            pauseBtn.textContent = paused ? "Resume" : "Pause";
        });

        window.addEventListener("resize", resizeCanvas);
        reset(); render();
    })();
});
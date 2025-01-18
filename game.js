class Tank {
    constructor(game, x, y, color, isPlayer = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.rotation = 0; // 角度，0表示向右
        this.health = 100;
        this.isPlayer = isPlayer;
        this.cannonLength = 30;
        this.reloadTime = 500; // 装弹时间（毫秒）
        this.lastShootTime = 0;
        this.tracks = []; // 履带痕迹
        this.maxTracks = 10; // 最大履带痕迹数量
        this.trackInterval = 5; // 履带痕迹间隔
        this.lastTrackTime = 0;
        this.moving = false;
        this.moveDirection = { x: 0, y: 0 }; // 移动方向
        this.targetRotation = 0; // 目标旋转角度
        this.rotationSpeed = 3; // 旋转速度
    }

    draw(ctx) {
        // 先绘制履带痕迹
        this.drawTracks(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        // 绘制履带
        ctx.fillStyle = '#555';
        ctx.fillRect(-this.width/2 - 2, -this.height/2, 4, this.height);
        ctx.fillRect(this.width/2 - 2, -this.height/2, 4, this.height);

        // 绘制坦克主体
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // 绘制炮管
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.cannonLength, 0);
        ctx.stroke();

        ctx.restore();

        // 绘制血条
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 4;
        const barY = this.y - this.height/2 - 10;
        const healthPercent = this.health / 100;

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth * healthPercent, barHeight);
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShootTime >= this.reloadTime) {
            const angle = this.rotation * Math.PI / 180;
            const bulletX = this.x + Math.cos(angle) * this.cannonLength;
            const bulletY = this.y + Math.sin(angle) * this.cannonLength;
            
            this.game.bullets.push(new Bullet(
                bulletX,
                bulletY,
                this.rotation,
                this.isPlayer
            ));
            
            this.lastShootTime = now;
            return true;
        }
        return false;
    }

    // 添加移动方法
    move(directionX, directionY) {
        this.moving = true;
        this.moveDirection = { x: directionX, y: directionY };
        
        // 计算移动角度
        if (directionX !== 0 || directionY !== 0) {
            this.targetRotation = Math.atan2(directionY, directionX) * 180 / Math.PI;
        }

        // 添加履带痕迹
        const now = Date.now();
        if (now - this.lastTrackTime > this.trackInterval) {
            this.addTrack();
            this.lastTrackTime = now;
        }

        // 实际移动
        const moveX = directionX * this.speed;
        const moveY = directionY * this.speed;

        // 边界检查
        const nextX = this.x + moveX;
        const nextY = this.y + moveY;
        
        if (nextX >= this.width/2 && nextX <= this.game.canvas.width - this.width/2) {
            this.x = nextX;
        }
        if (nextY >= this.height/2 && nextY <= this.game.canvas.height - this.height/2) {
            this.y = nextY;
        }
    }

    // 添加履带痕迹
    addTrack() {
        this.tracks.push({
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            opacity: 1
        });

        if (this.tracks.length > this.maxTracks) {
            this.tracks.shift();
        }
    }

    // 更新履带痕迹
    updateTracks() {
        this.tracks.forEach(track => {
            track.opacity -= 0.02;
        });
        this.tracks = this.tracks.filter(track => track.opacity > 0);
    }

    // 绘制履带痕迹
    drawTracks(ctx) {
        this.tracks.forEach(track => {
            ctx.save();
            ctx.translate(track.x, track.y);
            ctx.rotate(track.rotation * Math.PI / 180);
            ctx.globalAlpha = track.opacity;
            
            // 绘制左履带痕迹
            ctx.fillStyle = '#555';
            ctx.fillRect(-this.width/2 - 2, -this.height/2, 4, this.height);
            
            // 绘制右履带痕迹
            ctx.fillRect(this.width/2 - 2, -this.height/2, 4, this.height);
            
            ctx.globalAlpha = 1;
            ctx.restore();
        });
    }

    // 更新旋转
    updateRotation() {
        if (this.rotation !== this.targetRotation) {
            const diff = this.targetRotation - this.rotation;
            const shortestAngle = ((diff + 180) % 360) - 180;
            
            if (Math.abs(shortestAngle) < this.rotationSpeed) {
                this.rotation = this.targetRotation;
            } else {
                this.rotation += Math.sign(shortestAngle) * this.rotationSpeed;
            }
            
            // 保持角度在0-360范围内
            this.rotation = (this.rotation + 360) % 360;
        }
    }

    // 更新方法
    update() {
        this.updateTracks();
        this.updateRotation();
    }
}

class Bullet {
    constructor(x, y, angle, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.radius = 3;
        this.angle = angle;
        this.isPlayerBullet = isPlayerBullet;
        this.damage = 20;
    }

    update() {
        this.x += Math.cos(this.angle * Math.PI / 180) * this.speed;
        this.y += Math.sin(this.angle * Math.PI / 180) * this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = this.isPlayerBullet ? '#ff0' : '#f00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // 创建玩家坦克
        this.playerTank = new Tank(this, this.canvas.width/2, this.canvas.height/2, '#0f0', true);
        
        // 创建敌方坦克
        this.enemies = [
            new Tank(this, 100, 100, '#f00'),
            new Tank(this, this.canvas.width - 100, 100, '#f00'),
            new Tank(this, this.canvas.width - 100, this.canvas.height - 100, '#f00')
        ];

        this.bullets = [];
        this.score = 0;
        
        this.setupEventListeners();
        this.gameLoop();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }

    setupEventListeners() {
        const keys = new Set();
        
        // 键盘按下
        document.addEventListener('keydown', (e) => {
            keys.add(e.key);
            
            // 计算移动方向
            let dirX = 0;
            let dirY = 0;
            
            if (keys.has('ArrowUp')) dirY = -1;
            if (keys.has('ArrowDown')) dirY = 1;
            if (keys.has('ArrowLeft')) dirX = -1;
            if (keys.has('ArrowRight')) dirX = 1;
            
            // 标准化向量
            if (dirX !== 0 && dirY !== 0) {
                const length = Math.sqrt(dirX * dirX + dirY * dirY);
                dirX /= length;
                dirY /= length;
            }
            
            this.playerTank.move(dirX, dirY);
            
            if (e.key === ' ') {
                this.playerTank.shoot();
            }
        });
        
        // 键盘松开
        document.addEventListener('keyup', (e) => {
            keys.delete(e.key);
            
            // 如果没有按键被按下，停止移动
            if (!keys.has('ArrowUp') && !keys.has('ArrowDown') && 
                !keys.has('ArrowLeft') && !keys.has('ArrowRight')) {
                this.playerTank.moving = false;
                this.playerTank.moveDirection = { x: 0, y: 0 };
            }
        });
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update();

            // 检查子弹是否击中目标
            if (bullet.isPlayerBullet) {
                // 玩家子弹检查是否击中敌人
                for (let enemy of this.enemies) {
                    if (this.checkBulletHit(bullet, enemy)) {
                        enemy.health -= bullet.damage;
                        this.bullets.splice(i, 1);
                        if (enemy.health <= 0) {
                            this.score += 100;
                            this.updateScore();
                        }
                        break;
                    }
                }
            } else {
                // 敌人子弹检查是否击中玩家
                if (this.checkBulletHit(bullet, this.playerTank)) {
                    this.playerTank.health -= bullet.damage;
                    this.bullets.splice(i, 1);
                    this.updateHealth();
                    if (this.playerTank.health <= 0) {
                        this.gameOver();
                    }
                }
            }

            // 检查子弹是否超出边界
            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                this.bullets.splice(i, 1);
            }
        }
    }

    checkBulletHit(bullet, tank) {
        const dx = bullet.x - tank.x;
        const dy = bullet.y - tank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < tank.width / 2;
    }

    updateHealth() {
        document.getElementById('health').textContent = `生命值: ${this.playerTank.health}`;
    }

    updateScore() {
        document.getElementById('score').textContent = `得分: ${this.score}`;
    }

    gameOver() {
        alert('游戏结束！得分：' + this.score);
        location.reload();
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 更新和绘制玩家坦克
        this.playerTank.update();
        this.playerTank.draw(this.ctx);
        
        // 更新和绘制敌方坦克
        this.enemies.forEach(enemy => {
            if (enemy.health > 0) {
                enemy.update();
                enemy.draw(this.ctx);
            }
        });
        
        // 更新和绘制子弹
        this.updateBullets();
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new Game();
}); 
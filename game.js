class Tank {
    constructor(game, x, y, color, isPlayer = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 40;
        this.height = 40;
        this.speed = isPlayer ? 5 : 3;  // 敌人速度稍慢
        this.rotation = 0; // 角度，0表示向右
        this.health = isPlayer ? 1000 : 200;  // 玩家血量1000，敌人血量200
        this.isPlayer = isPlayer;
        this.cannonLength = isPlayer ? 40 : 30;  // 玩家坦克炮管更长
        this.reloadTime = isPlayer ? 200 : 2000;  // 调整玩家射击间隔
        this.bulletDamage = isPlayer ? 40 : 15;
        this.bulletSpeed = isPlayer ? 15 : 8;    // 玩家子弹更快
        this.bulletSize = isPlayer ? 5 : 3;      // 玩家子弹更大
        this.lastShootTime = 0;
        this.aiUpdateTime = 0;  // 用于敌人AI
        this.aiUpdateInterval = 500;    // 提高AI更新频率
        this.tracks = []; // 履带痕迹
        this.maxTracks = 10; // 最大履带痕迹数量
        this.trackInterval = 5; // 履带痕迹间隔
        this.lastTrackTime = 0;
        this.moving = false;
        this.moveDirection = { x: 0, y: 0 }; // 移动方向
        this.targetRotation = 0; // 目标旋转角度
        this.rotationSpeed = 3; // 旋转速度
        this.patrolPoint = null;        // 巡逻点
        this.patrolRadius = 200;        // 巡逻半径
        this.aiState = 'patrol';        // AI状态：patrol/chase/retreat
    }

    draw(ctx) {
        // 先绘制履带痕迹
        this.drawTracks(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);

        // 绘制坦克主体 - 使用圆角矩形
        ctx.fillStyle = this.color;
        const radius = 5; // 圆角半径
        this.roundRect(ctx, -this.width/2, -this.height/2, this.width, this.height, radius);

        // 绘制炮管 - 更简洁的设计
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.cannonLength, 0);
        ctx.stroke();

        ctx.restore();

        // 绘制血条
        this.drawHealthBar(ctx);

        // 如果是敌人，显示当前状态
        if (!this.isPlayer) {
            ctx.fillStyle = this.getStateColor();
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height/2 - 15, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 添加圆角矩形绘制方法
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 3;  // 降低血条高度
        const barY = this.y - this.height/2 - 8;
        const healthPercent = this.health / (this.isPlayer ? 1000 : 200);  // 根据最大生命值计算

        // 绘制血条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);

        // 绘制血条
        const healthColor = this.isPlayer ? '#00ff00' : '#ff3333';
        ctx.fillStyle = healthColor;
        ctx.fillRect(this.x - barWidth/2, barY, barWidth * healthPercent, barHeight);
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShootTime >= this.reloadTime) {
            const angle = this.rotation * Math.PI / 180;
            const bulletX = this.x + Math.cos(angle) * this.cannonLength;
            const bulletY = this.y + Math.sin(angle) * this.cannonLength;
            
            // 创建新子弹
            const bullet = new Bullet(
                bulletX,
                bulletY,
                this.rotation,
                this.isPlayer,
                this.bulletSpeed,
                this.bulletSize,
                this.bulletDamage
            );

            // 检查子弹数量限制
            if (this.game.bullets.length < this.game.maxBullets) {
                this.game.bullets.push(bullet);
                this.lastShootTime = now;
                return true;
            }
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

    // 添加AI行为
    updateAI() {
        if (!this.isPlayer) {
            const now = Date.now();
            if (now - this.aiUpdateTime >= this.aiUpdateInterval) {
                // 计算到玩家的距离和方向
                const dx = this.game.playerTank.x - this.x;
                const dy = this.game.playerTank.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angleToPlayer = Math.atan2(dy, dx) * 180 / Math.PI;

                // 根据距离切换AI状态
                if (distance < 150) {
                    this.aiState = 'retreat';
                } else if (distance < 400) {
                    this.aiState = 'chase';
                } else {
                    this.aiState = 'patrol';
                }

                // 根据状态执行不同的行为
                switch (this.aiState) {
                    case 'chase':
                        // 追击玩家
                        this.targetRotation = angleToPlayer;
                        this.move(dx/distance, dy/distance);
                        if (Math.abs(this.rotation - angleToPlayer) < 10) {
                            this.shoot();
                        }
                        break;

                    case 'retreat':
                        // 撤退并射击
                        this.targetRotation = angleToPlayer;
                        this.move(-dx/distance, -dy/distance);
                        if (Math.abs(this.rotation - angleToPlayer) < 20) {
                            this.shoot();
                        }
                        break;

                    case 'patrol':
                        // 巡逻行为
                        if (!this.patrolPoint) {
                            this.setNewPatrolPoint();
                        }
                        this.patrol();
                        break;
                }

                this.aiUpdateTime = now;
            }
        }
    }

    // 设置新的巡逻点
    setNewPatrolPoint() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.patrolRadius;
        this.patrolPoint = {
            x: this.x + Math.cos(angle) * distance,
            y: this.y + Math.sin(angle) * distance
        };

        // 确保巡逻点在地图范围内
        this.patrolPoint.x = Math.max(this.width, Math.min(this.game.canvas.width - this.width, this.patrolPoint.x));
        this.patrolPoint.y = Math.max(this.height, Math.min(this.game.canvas.height - this.height, this.patrolPoint.y));
    }

    // 执行巡逻
    patrol() {
        if (this.patrolPoint) {
            const dx = this.patrolPoint.x - this.x;
            const dy = this.patrolPoint.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) {
                // 到达巡逻点，设置新的巡逻点
                this.setNewPatrolPoint();
            } else {
                // 移动到巡逻点
                this.targetRotation = Math.atan2(dy, dx) * 180 / Math.PI;
                this.move(dx/distance, dy/distance);
            }
        }
    }

    // 更新方法
    update() {
        this.updateTracks();
        this.updateRotation();
        this.updateAI();  // 添加AI更新
    }

    // 获取状态对应的颜色
    getStateColor() {
        switch (this.aiState) {
            case 'chase': return '#ff0';   // 黄色表示追击
            case 'retreat': return '#f00';  // 红色表示撤退
            case 'patrol': return '#0f0';   // 绿色表示巡逻
            default: return '#fff';
        }
    }
}

class Bullet {
    constructor(x, y, angle, isPlayerBullet, speed, size, damage) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.radius = size;
        this.angle = angle;
        this.isPlayerBullet = isPlayerBullet;
        this.damage = damage;
    }

    draw(ctx) {
        // 简化子弹外观
        ctx.fillStyle = this.isPlayerBullet ? '#4444ff' : '#ff4444';
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
        
        // 增加敌方坦克数量
        this.enemies = [
            new Tank(this, 100, 100, '#f00'),
            new Tank(this, this.canvas.width - 100, 100, '#f00'),
            new Tank(this, this.canvas.width - 100, this.canvas.height - 100, '#f00'),
            new Tank(this, 100, this.canvas.height - 100, '#f00')
        ];

        this.bullets = [];
        this.maxBullets = 50;  // 限制最大子弹数量
        this.isSpacePressed = false;  // 添加空格键状态跟踪
        this.score = 0;
        this.gameTime = 0;  // 游戏时间（秒）
        this.lastEnemySpawn = 0;  // 上次生成敌人的时间
        this.enemySpawnInterval = 30000;  // 每30秒生成新敌人
        
        this.setupEventListeners();
        this.gameLoop();
        
        // 开始计时
        this.startTime = Date.now();
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
            
            // 空格键射击逻辑优化
            if (e.key === ' ' && !this.isSpacePressed) {
                this.isSpacePressed = true;
                if (this.bullets.length < this.maxBullets) {
                    this.playerTank.shoot();
                }
            }
        });
        
        // 键盘松开
        document.addEventListener('keyup', (e) => {
            keys.delete(e.key);
            
            // 空格键释放
            if (e.key === ' ') {
                this.isSpacePressed = false;
            }
            
            // 如果没有按键被按下，停止移动
            if (!keys.has('ArrowUp') && !keys.has('ArrowDown') && 
                !keys.has('ArrowLeft') && !keys.has('ArrowRight')) {
                this.playerTank.moving = false;
                this.playerTank.moveDirection = { x: 0, y: 0 };
            }
        });
    }

    updateBullets() {
        // 优化子弹更新逻辑
        const activeBullets = [];
        
        for (const bullet of this.bullets) {
            // 更新子弹位置
            bullet.x += Math.cos(bullet.angle * Math.PI / 180) * bullet.speed;
            bullet.y += Math.sin(bullet.angle * Math.PI / 180) * bullet.speed;

            // 检查子弹是否超出边界
            if (bullet.x < 0 || bullet.x > this.canvas.width ||
                bullet.y < 0 || bullet.y > this.canvas.height) {
                continue; // 跳过超出边界的子弹
            }

            // 检查子弹碰撞
            let hitTarget = false;
            
            if (bullet.isPlayerBullet) {
                // 玩家子弹检查是否击中敌人
                for (let enemy of this.enemies) {
                    if (enemy.health > 0 && this.checkBulletHit(bullet, enemy)) {
                        enemy.health -= bullet.damage;
                        if (enemy.health <= 0) {
                            this.score += 100;
                            this.updateScore();
                        }
                        hitTarget = true;
                        break;
                    }
                }
            } else {
                // 敌人子弹检查是否击中玩家
                if (this.checkBulletHit(bullet, this.playerTank)) {
                    this.playerTank.health -= bullet.damage;
                    this.updateHealth();
                    if (this.playerTank.health <= 0) {
                        this.gameOver();
                    }
                    hitTarget = true;
                }
            }

            // 如果子弹没有击中目标，保留它
            if (!hitTarget) {
                activeBullets.push(bullet);
            }
        }

        // 更新活跃子弹列表
        this.bullets = activeBullets;
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

    // 添加生成新敌人的方法
    spawnNewEnemy() {
        const positions = [
            { x: 100, y: 100 },
            { x: this.canvas.width - 100, y: 100 },
            { x: this.canvas.width - 100, y: this.canvas.height - 100 },
            { x: 100, y: this.canvas.height - 100 }
        ];

        // 随机选择一个位置生成敌人
        const pos = positions[Math.floor(Math.random() * positions.length)];
        this.enemies.push(new Tank(this, pos.x, pos.y, '#f00'));
    }

    updateGameTime() {
        const currentTime = Date.now();
        this.gameTime = Math.floor((currentTime - this.startTime) / 1000);
        
        // 更新游戏时间显示
        document.getElementById('score').textContent = 
            `得分: ${this.score} | 时间: ${Math.floor(this.gameTime/60)}分${this.gameTime%60}秒`;

        // 检查是否需要生成新敌人
        if (currentTime - this.lastEnemySpawn >= this.enemySpawnInterval) {
            this.spawnNewEnemy();
            this.lastEnemySpawn = currentTime;
        }
    }

    gameOver() {
        const timeStr = `${Math.floor(this.gameTime/60)}分${this.gameTime%60}秒`;
        alert(`游戏结束！\n存活时间：${timeStr}\n得分：${this.score}`);
        location.reload();
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 更新游戏时间
        this.updateGameTime();
        
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
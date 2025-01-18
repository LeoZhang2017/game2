class Wall {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 添加简单的纹理效果
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        for(let i = 0; i < this.width; i += 10) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i, this.y + this.height);
            ctx.stroke();
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
        ctx.fillStyle = this.isPlayerBullet ? '#4444ff' : '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Tank {
    constructor(game, x, y, color, isPlayer = false) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 40;
        this.height = 40;
        this.speed = isPlayer ? 10 : 3;  // 玩家速度从5提升到10，敌人保持3不变
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
        this.patrolTimer = 0;           // 添加巡逻计时器
        this.patrolInterval = 2000;     // 每2秒改变一次巡逻方向
        this.currentDirection = { x: 0, y: 0 }; // 当前移动方向
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
            
            this.game.bullets.push(new Bullet(
                bulletX,
                bulletY,
                this.rotation,
                this.isPlayer,
                this.bulletSpeed,
                this.bulletSize,
                this.bulletDamage
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
        
        if (directionX !== 0 || directionY !== 0) {
            this.targetRotation = Math.atan2(directionY, directionX) * 180 / Math.PI;
        }

        // 添加履带痕迹
        const now = Date.now();
        if (now - this.lastTrackTime > this.trackInterval) {
            this.addTrack();
            this.lastTrackTime = now;
        }

        // 分别计算X和Y方向的移动
        const moveX = directionX * this.speed;
        const moveY = directionY * this.speed;

        // 分别检查X和Y方向的移动
        let canMoveX = true;
        let canMoveY = true;

        // 尝试X方向移动
        const nextX = this.x + moveX;
        const nextY = this.y;
        
        // 检查X方向碰撞
        for (const wall of this.game.walls) {
            const tankLeft = nextX - this.width/2;
            const tankRight = nextX + this.width/2;
            const tankTop = nextY - this.height/2;
            const tankBottom = nextY + this.height/2;

            if (!(tankRight < wall.x || 
                  tankLeft > wall.x + wall.width || 
                  tankBottom < wall.y || 
                  tankTop > wall.y + wall.height)) {
                canMoveX = false;
                break;
            }
        }

        // 尝试Y方向移动
        const testX = this.x;
        const testY = this.y + moveY;
        
        // 检查Y方向碰撞
        for (const wall of this.game.walls) {
            const tankLeft = testX - this.width/2;
            const tankRight = testX + this.width/2;
            const tankTop = testY - this.height/2;
            const tankBottom = testY + this.height/2;

            if (!(tankRight < wall.x || 
                  tankLeft > wall.x + wall.width || 
                  tankBottom < wall.y || 
                  tankTop > wall.y + wall.height)) {
                canMoveY = false;
                break;
            }
        }

        // 应用可能的移动
        if (canMoveX && nextX >= this.width/2 && nextX <= this.game.canvas.width - this.width/2) {
            this.x = nextX;
        }
        if (canMoveY && testY >= this.height/2 && testY <= this.game.canvas.height - this.height/2) {
            this.y = testY;
        }

        // 如果是AI控制的坦克，在碰到墙时改变方向
        if (!this.isPlayer && (!canMoveX || !canMoveY)) {
            this.chooseNewDirection();
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
            
            // 检查是否被困住
            const isStuck = this.checkCollision(
                this.x + this.currentDirection.x * this.speed,
                this.y + this.currentDirection.y * this.speed
            );

            // 如果被困住或者到了改变方向的时间
            if (isStuck || now - this.patrolTimer > this.patrolInterval) {
                this.patrolTimer = now;
                this.chooseNewDirection();
            }

            // 执行移动
            this.move(this.currentDirection.x, this.currentDirection.y);

            // 如果看到玩家，尝试射击
            const dx = this.game.playerTank.x - this.x;
            const dy = this.game.playerTank.y - this.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceToPlayer < 300 && Math.random() < 0.02) {
                this.shoot();
            }
        }
    }

    // 修改AI的选择新方向逻辑
    chooseNewDirection() {
        // 如果坦克被困住，尝试更多方向
        const directions = [];
        for (let angle = 0; angle < 360; angle += 45) {
            directions.push({
                x: Math.cos(angle * Math.PI / 180),
                y: Math.sin(angle * Math.PI / 180)
            });
        }

        // 测试每个方向，选择一个可行的方向
        for (let i = 0; i < directions.length; i++) {
            const randomIndex = Math.floor(Math.random() * directions.length);
            const dir = directions[randomIndex];
            
            // 预测下一个位置
            const nextX = this.x + dir.x * this.speed * 2;
            const nextY = this.y + dir.y * this.speed * 2;
            
            // 如果这个方向可行，就选择它
            if (!this.checkCollision(nextX, nextY)) {
                this.currentDirection = dir;
                return;
            }
        }

        // 如果所有方向都不可行，选择相反方向
        this.currentDirection = {
            x: -this.currentDirection.x,
            y: -this.currentDirection.y
        };
    }

    // 检查位置是否会发生碰撞
    checkCollision(x, y) {
        for (const wall of this.game.walls) {
            const tankLeft = x - this.width/2;
            const tankRight = x + this.width/2;
            const tankTop = y - this.height/2;
            const tankBottom = y + this.height/2;

            if (!(tankRight < wall.x || 
                  tankLeft > wall.x + wall.width || 
                  tankBottom < wall.y || 
                  tankTop > wall.y + wall.height)) {
                return true;
            }
        }
        return false;
    }

    // 修改初始化位置，确保不会卡在墙里
    static findValidPosition(game) {
        let x, y;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            x = Math.random() * (game.canvas.width - 100) + 50;
            y = Math.random() * (game.canvas.height - 100) + 50;
            attempts++;
        } while (attempts < maxAttempts && game.checkPositionCollision(x, y));

        return { x, y };
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

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // 修改墙壁厚度和位置
        this.walls = [
            // 中间的十字形墙壁，减小厚度从40到20
            new Wall(this.canvas.width/2 - 150, this.canvas.height/2 - 10, 300, 20),  // 横墙
            new Wall(this.canvas.width/2 - 10, this.canvas.height/2 - 150, 20, 300),  // 竖墙
            
            // 四个角落的墙壁，统一使用较细的墙
            new Wall(100, 100, 100, 15),
            new Wall(this.canvas.width - 200, 100, 100, 15),
            new Wall(100, this.canvas.height - 120, 100, 15),
            new Wall(this.canvas.width - 200, this.canvas.height - 120, 100, 15)
        ];

        // 修改玩家坦克的初始位置，确保在十字墙下方中央
        this.playerTank = new Tank(
            this, 
            this.canvas.width/2,      // x坐标在中间
            this.canvas.height/2 + 200, // y坐标在十字墙下方
            '#0f0', 
            true
        );
        
        // 修改敌方坦克的生成位置，确保在更开阔的位置
        this.enemies = [
            new Tank(this, 200, 200, '#f00'),                                    // 左上区域
            new Tank(this, this.canvas.width - 200, 200, '#f00'),               // 右上区域
            new Tank(this, this.canvas.width - 200, this.canvas.height - 200, '#f00'), // 右下区域
            new Tank(this, 200, this.canvas.height - 200, '#f00')               // 左下区域
        ];

        this.bullets = [];
        this.maxBullets = 50;
        this.isSpacePressed = false;
        this.score = 0;
        this.gameTime = 0;
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 30000;
        
        this.setupEventListeners();
        this.gameLoop();
        
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
        // 跟踪按下的键
        this.pressedKeys = new Set();
        
        // 键盘按下
        document.addEventListener('keydown', (e) => {
            this.pressedKeys.add(e.key);
            this.updatePlayerMovement();
            
            // 空格键射击
            if (e.key === ' ' && !this.isSpacePressed) {
                this.isSpacePressed = true;
                this.playerTank.shoot();
            }
        });
        
        // 键盘松开
        document.addEventListener('keyup', (e) => {
            this.pressedKeys.delete(e.key);
            this.updatePlayerMovement();
            
            if (e.key === ' ') {
                this.isSpacePressed = false;
            }
        });
    }

    // 新增：更新玩家移动
    updatePlayerMovement() {
        let dirX = 0;
        let dirY = 0;
        
        if (this.pressedKeys.has('ArrowUp')) dirY = -1;
        if (this.pressedKeys.has('ArrowDown')) dirY = 1;
        if (this.pressedKeys.has('ArrowLeft')) dirX = -1;
        if (this.pressedKeys.has('ArrowRight')) dirX = 1;
        
        // 标准化向量
        if (dirX !== 0 && dirY !== 0) {
            const length = Math.sqrt(dirX * dirX + dirY * dirY);
            dirX /= length;
            dirY /= length;
        }
        
        this.playerTank.move(dirX, dirY);
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
        
        // 绘制墙壁
        this.walls.forEach(wall => wall.draw(this.ctx));
        
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

    // 添加位置检查方法
    checkPositionCollision(x, y) {
        for (const wall of this.walls) {
            const tankLeft = x - 20;
            const tankRight = x + 20;
            const tankTop = y - 20;
            const tankBottom = y + 20;

            if (!(tankRight < wall.x || 
                  tankLeft > wall.x + wall.width || 
                  tankBottom < wall.y || 
                  tankTop > wall.y + wall.height)) {
                return true;
            }
        }
        return false;
    }
}

// 启动游戏
window.addEventListener('load', () => {
    new Game();
}); 
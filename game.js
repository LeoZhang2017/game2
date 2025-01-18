class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isGameOver = false;  // 添加游戏状态标志
        this.initGame();  // 将初始化逻辑移到单独的方法中
        this.lastShootTime = 0;  // 添加上次射击时间记录
    }

    // 新增：初始化游戏状态
    initGame() {
        // 计算屏幕中心位置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.player = {
            x: centerX,      // 设置玩家X坐标到屏幕中心
            y: centerY,      // 设置玩家Y坐标到屏幕中心
            health: 1000,
            ammo: 300,
            artifacts: 0,
            speed: 10,
            radius: 20,
            direction: 0,
            shootCooldown: 100
        };
        
        // 调整敌人位置，让它们分散在玩家周围
        this.enemies = [
            {
                x: centerX - 300,  // 左侧
                y: centerY,
                type: 'steel',
                health: 100,
                radius: 20,
                color: '#8B0000',
                speed: 1,
                damage: 5
            },
            {
                x: centerX + 300,  // 右侧
                y: centerY,
                type: 'tech',
                health: 80,
                radius: 20,
                color: '#4B0082',
                speed: 1.5,
                damage: 3
            },
            {
                x: centerX,
                y: centerY + 300,  // 下方
                type: 'raider',
                health: 60,
                radius: 20,
                color: '#8B4513',
                speed: 2,
                damage: 8
            }
        ];
        
        // 调整密钥位置，让它们分散在地图上
        this.keys = [
            {
                x: centerX - 200,
                y: centerY - 200,
                collected: false,
                radius: 15,
                color: '#FFD700'
            },
            {
                x: centerX + 200,
                y: centerY - 200,
                collected: false,
                radius: 15,
                color: '#FFD700'
            },
            {
                x: centerX,
                y: centerY + 200,
                collected: false,
                radius: 15,
                color: '#FFD700'
            }
        ];
        
        this.bullets = [];
        this.items = [];
        this.isGameOver = false;
        
        this.setupCanvas();
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
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            const newX = this.player.x;
            const newY = this.player.y;
            
            switch(e.key) {
                case 'ArrowUp':
                    this.movePlayer(newX, newY - this.player.speed);
                    this.player.direction = 270; // 向上
                    break;
                case 'ArrowDown':
                    this.movePlayer(newX, newY + this.player.speed);
                    this.player.direction = 90; // 向下
                    break;
                case 'ArrowLeft':
                    this.movePlayer(newX - this.player.speed, newY);
                    this.player.direction = 180; // 向左
                    break;
                case 'ArrowRight':
                    this.movePlayer(newX + this.player.speed, newY);
                    this.player.direction = 0; // 向右
                    break;
                case ' ': // 空格键射击
                    this.tryShoot();  // 改用新的射击方法
                    break;
                case 'i':
                    this.toggleInventory();
                    break;
            }
        });

        // 添加空格键持续按下的处理
        let shootInterval = null;
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && !shootInterval) {
                shootInterval = setInterval(() => this.tryShoot(), this.player.shootCooldown);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === ' ' && shootInterval) {
                clearInterval(shootInterval);
                shootInterval = null;
            }
        });

        // 移除鼠标射击事件
        // this.canvas.addEventListener('click', ...);
    }

    // 新增：尝试射击方法
    tryShoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShootTime >= this.player.shootCooldown) {
            if (this.player.ammo > 0) {
                this.shoot();
                this.player.ammo--;
                this.updateStats();
                this.lastShootTime = currentTime;
            } else {
                this.showMessage("弹药耗尽！");
            }
        }
    }

    shoot() {
        // 根据玩家朝向计算子弹方向
        let targetX, targetY;
        const shootDistance = 1000; // 射程

        // 根据方向计算目标点
        const angleInRadians = this.player.direction * Math.PI / 180;
        targetX = this.player.x + Math.cos(angleInRadians) * shootDistance;
        targetY = this.player.y + Math.sin(angleInRadians) * shootDistance;

        // 检查是否击中敌人
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) return;
            
            // 检查子弹路径是否经过敌人
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 计算敌人是否在射击方向上
            const angleToEnemy = Math.atan2(dy, dx) * 180 / Math.PI;
            const angleDiff = Math.abs(((angleToEnemy - this.player.direction + 180) % 360) - 180);
            
            if (distance < 300 && angleDiff < 30) {
                enemy.health -= 50;  // 增加伤害从20到50
                if (enemy.health <= 0) {
                    this.showMessage(`击杀了${this.getEnemyTypeName(enemy.type)}！`);
                } else {
                    this.showMessage(`击中${this.getEnemyTypeName(enemy.type)}！`);
                }
            }
        });

        // 绘制射击效果
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(targetX, targetY);
        this.ctx.strokeStyle = '#ff0';
        this.ctx.stroke();
    }

    updateStats() {
        document.getElementById('health').textContent = `生命值: ${this.player.health}`;
        document.getElementById('ammo').textContent = `弹药: ${this.player.ammo}`;
        document.getElementById('artifacts').textContent = `密钥碎片: ${this.player.artifacts}/8`;
    }

    toggleInventory() {
        const inventory = document.getElementById('inventory');
        inventory.classList.toggle('hidden');
    }

    drawPlayer() {
        // 绘制玩家
        this.ctx.fillStyle = '#0f0';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制方向指示器
        const angleInRadians = this.player.direction * Math.PI / 180;
        const indicatorLength = this.player.radius + 10;
        const endX = this.player.x + Math.cos(angleInRadians) * indicatorLength;
        const endY = this.player.y + Math.sin(angleInRadians) * indicatorLength;

        this.ctx.beginPath();
        this.ctx.moveTo(this.player.x, this.player.y);
        this.ctx.lineTo(endX, endY);
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.lineWidth = 1;
    }

    drawKeys() {
        this.keys.forEach(key => {
            if (!key.collected) {
                this.ctx.fillStyle = key.color;
                this.ctx.beginPath();
                this.ctx.arc(key.x, key.y, key.radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // 添加闪光效果
                this.ctx.strokeStyle = '#FFF';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }

    checkKeyCollection() {
        this.keys.forEach(key => {
            if (!key.collected) {
                const distance = Math.sqrt(
                    Math.pow(this.player.x - key.x, 2) + 
                    Math.pow(this.player.y - key.y, 2)
                );
                
                if (distance < this.player.radius + key.radius) {
                    key.collected = true;
                    this.player.artifacts++;
                    this.updateStats();
                    this.showMessage("收集到一个密钥碎片！");
                }
            }
        });
    }

    showMessage(text) {
        const dialog = document.getElementById('dialog');
        const content = document.getElementById('dialog-content');
        content.textContent = text;
        dialog.classList.remove('hidden');
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            dialog.classList.add('hidden');
        }, 3000);
    }

    drawEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.health > 0) {
                // 绘制敌人
                this.ctx.fillStyle = enemy.color;
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
                this.ctx.fill();

                // 绘制血条
                this.drawHealthBar(enemy);
            }
        });
    }

    drawHealthBar(enemy) {
        const barWidth = 40;
        const barHeight = 4;
        const barY = enemy.y - enemy.radius - 10;
        const healthPercent = enemy.health / (enemy === this.player ? 1000 : 100);
        
        // 背景条
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(enemy.x - barWidth/2, barY, barWidth, barHeight);
        
        // 血量条
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(enemy.x - barWidth/2, barY, barWidth * healthPercent, barHeight);
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.health <= 0) return;

            // 计算到玩家的方向
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 如果距离太近，攻击玩家
            if (distance < enemy.radius + this.player.radius) {
                this.playerTakeDamage(enemy.damage);
            }

            // 移动敌人
            if (distance > enemy.radius + this.player.radius) {
                enemy.x += (dx / distance) * enemy.speed;
                enemy.y += (dy / distance) * enemy.speed;
            }
        });
    }

    playerTakeDamage(damage) {
        this.player.health = Math.max(0, this.player.health - damage);
        this.updateStats();
        
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        this.isGameOver = true;
        
        // 创建游戏结束对话框
        const dialog = document.getElementById('dialog');
        const content = document.getElementById('dialog-content');
        content.innerHTML = `
            <h2>游戏结束！</h2>
            <p>你收集到了 ${this.player.artifacts} 个密钥碎片</p>
            <button id="restart-button">重新开始</button>
        `;
        dialog.classList.remove('hidden');
        
        // 添加重新开始按钮事件
        document.getElementById('restart-button').addEventListener('click', () => {
            dialog.classList.add('hidden');
            this.initGame();  // 重新初始化游戏
        });
    }

    getEnemyTypeName(type) {
        switch(type) {
            case 'steel': return '钢铁兄弟会成员';
            case 'tech': return '科技教派成员';
            case 'raider': return '荒野掠夺者';
            default: return '敌人';
        }
    }

    gameLoop() {
        if (this.isGameOver) return;  // 如果游戏结束，停止循环
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 更新和绘制游戏元素
        this.drawKeys();
        this.drawEnemies();
        this.drawPlayer();
        
        // 更新敌人
        this.updateEnemies();
        
        // 检查收集
        this.checkKeyCollection();
        
        // 更新状态
        this.updateStats();
        
        // 检查胜利条件
        if (this.player.artifacts >= 8) {
            this.victory();
            return;
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    movePlayer(newX, newY) {
        // 检查边界
        const playerRadius = 20; // 玩家圆形的半径
        
        // 限制在画布范围内
        newX = Math.max(playerRadius, Math.min(this.canvas.width - playerRadius, newX));
        newY = Math.max(playerRadius, Math.min(this.canvas.height - playerRadius, newY));
        
        // 更新玩家位置
        this.player.x = newX;
        this.player.y = newY;
    }

    // 新增：胜利处理
    victory() {
        this.isGameOver = true;
        const dialog = document.getElementById('dialog');
        const content = document.getElementById('dialog-content');
        content.innerHTML = `
            <h2>恭喜胜利！</h2>
            <p>你成功收集了所有密钥碎片！</p>
            <button id="restart-button">再玩一次</button>
        `;
        dialog.classList.remove('hidden');
        
        document.getElementById('restart-button').addEventListener('click', () => {
            dialog.classList.add('hidden');
            this.initGame();
        });
    }
}

// 当页面加载完成后启动游戏
window.addEventListener('load', () => {
    new Game();
}); 
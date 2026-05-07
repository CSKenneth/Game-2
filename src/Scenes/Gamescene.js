class GameScene extends Phaser.Scene {
    constructor() {
        super("gamescene");

        this.my = { sprite: {}, text: {} };

        this.my.sprite.bullet = [];
        this.my.sprite.enemy = [];
        this.my.sprite.monkeyBullet = []; // 🐒 NEW
    }

    init_game() {
        let my = this.my;

        my.sprite.bullet = [];
        my.sprite.enemy = [];
        my.sprite.monkeyBullet = [];

        this.playerSpeed = 250;

        this.bulletSpeed = 400;
        this.maxBullets = 25;

        this.shootCooldown = 0;
        this.shootCooldownMax = 250;

        this.waterMax = 25;
        this.waterAmmo = this.waterMax;

        this.lawnHealth = 100;
        this.wave = 1;
        this.myScore = 0;

        this.enemiesAlive = 0;

        this.waveActive = true;
        this.waveText = null;

        this.gameOver = false;
    }

    preload() {
        this.load.setPath("./assets/");

        this.load.image("player", "ship_0000.png");
        this.load.image("elephant", "elephant.png");
        this.load.image("snake", "animals/snake.png");
        this.load.image("monkey", "animals/monkey.png");

        this.load.image("bullet", "Lazers/laserBlue1.png");
        this.load.image("enemyBullet", "Lazers/laserBeige1.png");

        this.load.image("tiny_town_tiles", "kenny-tiny-town-tilemap-packed.png");
        this.load.tilemapTiledJSON("map", "lawn.json");

        this.load.bitmapFont(
            "rocketSquare",
            "KennyRocketSquare_0.png",
            "KennyRocketSquare.fnt"
        );

        this.load.audio("hitSound", "jingles_PIZZI09.ogg");
        this.load.audio("backgroundMusic", "backgroundMusic.mp3");
    }

    create() {
        let my = this.my;

        this.init_game();

        this.map = this.add.tilemap("map", 16, 16, 10, 10);
        this.tileset = this.map.addTilesetImage("lawn-area", "tiny_town_tiles");

        this.grassLayer = this.map.createLayer("Grass", this.tileset, 0, 0);
        this.fenceLayer = this.map.createLayer("Fences", this.tileset, 0, 0);
        this.bucketLayer = this.map.createLayer("Bucket", this.tileset, 0, 0);

        this.grassLayer.setScale(4.0);
        this.fenceLayer.setScale(4.0);
        this.bucketLayer.setScale(4.0);

        // player stuff
        my.sprite.player = this.add.sprite(
            game.config.width / 2,
            game.config.height - 60,
            "player"
        );

        my.sprite.player.setScale(2);
        my.sprite.player.rotation = 3.14;

        // inputs
        this.left = this.input.keyboard.addKey("A");
        this.right = this.input.keyboard.addKey("D");
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        // ui
        my.text.score = this.add.bitmapText(280, 10, "rocketSquare", "Score: 0");
        my.text.wave = this.add.bitmapText(10, 10, "rocketSquare", "Wave: 0");
        my.text.health = this.add.bitmapText(10, 35, "rocketSquare", "Lawn: 100");
        my.text.ammo = this.add.bitmapText(285, 570, "rocketSquare", "Water: " + this.waterAmmo);

        this.hitSound = this.sound.add("hitSound");
        this.backgroundMusic = this.sound.add("backgroundMusic");
        this.backgroundMusic.play({ loop: true, volume: 0.2 });

        this.spawnWave();
        document.getElementById('description').innerHTML = '<h2>Movement: A/D <br> Shooting: Spacebar <br> Ammo refill: Touch Bucket <br> Made by Kenneth Tran <br> Email: ktran111@ucsc.edu</h2>' 
    }

    spawnWave() {
    let my = this.my;

    this.enemiesAlive = 5 + this.wave;

    let monkeySpawned = false;

    for (let i = 0; i < this.enemiesAlive; i++) {

        //spawn %
        let isFast = Math.random() < 0.3;
        let isMonkey = Math.random() < 0.15;

       //makes sure there is atleast 1 monkey per wave
        if (!monkeySpawned && i === this.enemiesAlive - 1) {
            isMonkey = true;
        }

        let enemy;
        //monkey
        if (isMonkey) {
            monkeySpawned = true;

            enemy = this.add.sprite(
                Math.random() * game.config.width,
                80,
                "monkey"
            );

            enemy.setScale(0.25);

            enemy.speed = 0;
            enemy.isMonkey = true;
            enemy.shootTimer = 0;
            enemy.scorePoints = 500;

            enemy.setTint(0xffff00);
        }
        else {
            //snake and elephant
            enemy = this.add.sprite(
                Math.random() * game.config.width,
                Math.random() * 100,
                isFast ? "snake" : "elephant"
            );

            enemy.setScale(0.25);
            enemy.isMonkey = false;

            if (isFast) {
                enemy.speed = 60;
                enemy.scorePoints = 200;
                enemy.setTint(0x00ffcc);
            } else {
                enemy.speed = 30;
                enemy.scorePoints = 1000;
                enemy.setTint(0xff4444);
            }
        }

        enemy.dead = false;
        my.sprite.enemy.push(enemy);
        }
    }
    checkWaveEnd() {
        if (this.enemiesAlive <= 0 && this.waveActive) {
            this.waveActive = false;

            this.waveText = this.add.text(
                200,
                250,
                "Wave Complete!\nPress ENTER to continue",
                {
                    fontSize: "28px",
                    fill: "#ffffff",
                    align: "center",
                }
            );
        }
    }

    killEnemy(enemy) {
        if (enemy.dead) return;

        enemy.dead = true;
        enemy.setVisible(false);
        enemy.setActive(false);

        this.enemiesAlive--;
    }

    update(time, delta) {
        let my = this.my;
        let dt = delta / 1000;

        if (!this.waveActive) {
            if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {

                if (this.waveText) {
                    this.waveText.destroy();
                    this.waveText = null;
                }

                this.wave++;
                this.spawnWave();
                this.waveActive = true;
            }
            return;
        }

        if (this.gameOver) return;

        // player movement
        if (this.left.isDown && my.sprite.player.x > 20) {
            my.sprite.player.x -= this.playerSpeed * dt;
        }

        if (this.right.isDown && my.sprite.player.x < game.config.width - 20) {
            my.sprite.player.x += this.playerSpeed * dt;
        }

        // shooting
        this.shootCooldown -= delta;

        if (this.space.isDown && this.shootCooldown <= 0 && this.waterAmmo > 0) {
            if (my.sprite.bullet.length < this.maxBullets) {

                let bullet = this.add.sprite(
                    my.sprite.player.x,
                    my.sprite.player.y - 20,
                    "bullet"
                );

                bullet.setScale(0.15);
                bullet.speed = this.bulletSpeed;
                my.sprite.bullet.push(bullet);

                this.shootCooldown = this.shootCooldownMax;
                this.waterAmmo--;
            }
        }

        // water refill
        let bucketTile = this.bucketLayer.getTileAtWorldXY(
            my.sprite.player.x,
            my.sprite.player.y
        );

        if (bucketTile) {
            this.waterAmmo = this.waterMax;
        }

        // bullets
        for (let bullet of my.sprite.bullet) {
            bullet.y -= bullet.speed * dt;
        }

        my.sprite.bullet = my.sprite.bullet.filter(b => b.y > -50);

        // enemies and monkey shooting
        for (let enemy of my.sprite.enemy) {

            if (enemy.dead) continue;

            // normal enemies move
            if (!enemy.isMonkey) {
                enemy.y += enemy.speed * dt;

                if (enemy.y > game.config.height - 50) {
                    this.lawnHealth -= 10;
                    this.killEnemy(enemy);
                    this.checkWaveEnd();
                }
            }

            // monkey shooting
            if (enemy.isMonkey) {
                enemy.shootTimer -= delta;

                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = 6000;

                    let log = this.add.sprite(
                        enemy.x,
                        enemy.y + 20,
                        "enemyBullet"
                    );

                    log.setScale(0.5);
                    log.speed = 80;

                    this.my.sprite.monkeyBullet.push(log);
                }
            }
        }

        // enemy bullet movement
        for (let log of this.my.sprite.monkeyBullet) {
            log.y += log.speed * dt;

            if (this.collides(log, my.sprite.player)) {
                log.y = 9999;
                this.lawnHealth -= 10;
            }
        }

        this.my.sprite.monkeyBullet =
            this.my.sprite.monkeyBullet.filter(l => l.y < game.config.height + 50);

        // player bullet collision
        for (let bullet of my.sprite.bullet) {
            for (let enemy of my.sprite.enemy) {

                if (enemy.dead) continue;

                if (this.collides(enemy, bullet)) {

                    bullet.y = -100;

                    this.killEnemy(enemy);

                    this.myScore += enemy.scorePoints;
                    this.updateScore();

                    this.hitSound.play();

                    this.checkWaveEnd();
                }
            }
        }

        // ui
        my.text.health.setText("Lawn: " + this.lawnHealth);
        my.text.ammo.setText("Water: " + this.waterAmmo);
        my.text.wave.setText("Wave: " + this.wave);

        // gameover screen
        if (this.lawnHealth <= 0 && !this.gameOver) {
            this.gameOver = true;

            this.add.text(250, 300, "GAME OVER\nPress R to Restart", {
                fontSize: "32px",
                fill: "#fff",
            });

            this.input.keyboard.once("keydown-R", () => {
                this.scene.restart();
            });
        }
    }

    collides(a, b) {
        if (Math.abs(a.x - b.x) > a.displayWidth / 2 + b.displayWidth / 2)
            return false;

        if (Math.abs(a.y - b.y) > a.displayHeight / 2 + b.displayHeight / 2)
            return false;

        return true;
    }

    updateScore() {
        this.my.text.score.setText("Score: " + this.myScore);
    }
}
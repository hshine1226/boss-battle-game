import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'

const GameComponent = () => {
    const gameRef = useRef(null)

    useEffect(() => {
        let game
        // 시작 화면 Scene
        class StartScene extends Phaser.Scene {
            constructor() {
                super({ key: 'StartScene' })
            }

            preload() {
                // 'boss-battle-game.png' 이미지를 로드합니다.
                this.load.image('background', 'assets/boss-battle-game.png')
            }

            create() {
                // 'boss-battle-game.png' 이미지를 배경으로 추가합니다.
                this.add.image(400, 350, 'background')

                // "BOSS BATTLE GAME" 텍스트 추가
                this.add
                    .text(400, 200, 'BOSS BATTLE GAME', {
                        fontSize: '48px',
                        fill: '#fff',
                        stroke: '#000',
                        strokeThickness: 6
                    })
                    .setOrigin(0.5)

                // 게임 시작 버튼 추가
                const startButton = this.add
                    .text(400, 300, 'Game Start', {
                        fontSize: '32px',
                        fill: '#0f0',
                        stroke: '#000',
                        strokeThickness: 4,
                        backgroundColor: '#333',
                        padding: { left: 15, right: 15, top: 10, bottom: 10 }
                    })
                    .setOrigin(0.5)
                    .setInteractive()

                startButton.on('pointerover', () =>
                    startButton.setStyle({ fill: '#ff0' })
                )
                startButton.on('pointerout', () =>
                    startButton.setStyle({ fill: '#0f0' })
                )
                startButton.on('pointerdown', () =>
                    this.scene.start('GameScene')
                )
            }
        }

        let player
        let boss
        let platforms
        let cursors
        let canDoubleJump = false
        let hasDoubleJumped = false
        let isJumpKeyReleased = true
        let canForceDescend = true
        let bossStage = 1
        let bossHealth = 150
        let playerHealth = 100
        let bossDirection = 1
        let bossChangeTimer = 0
        let gameOver = false
        let score = 0
        let gameOverText
        let nextStageText
        let currentScene
        let playerHealthBar
        let bossHealthBar
        let stageText
        let scoreText
        let playerInvincible = false
        let invincibilityTimer
        let backgroundMusic
        let fightSound
        let winSound
        let jumpSound
        let punchSound
        let gameOverSound

        // 기존 게임 Scene
        class GameScene extends Phaser.Scene {
            constructor() {
                super({ key: 'GameScene' })
            }

            init() {
                this.player = null
                this.boss = null
                this.platforms = null
                this.cursors = null
                this.canDoubleJump = false
                this.hasDoubleJumped = false
                this.isJumpKeyReleased = true
                this.canForceDescend = true
                this.bossStage = 1
                this.bossHealth = 300
                this.playerHealth = 100
                this.bossDirection = 1
                this.bossChangeTimer = 0
                this.gameOver = false
                this.score = 0
                this.gameOverText = null
                this.nextStageText = null
                this.playerHealthText = null
                this.bossHealthText = null
                this.stageText = null
                this.scoreText = null
                this.playerInvincible = false
                this.invincibilityTimer = null
                this.backgroundMusic = null
                this.fightSound = null
                this.winSound = null
                this.jumpSound = null
                this.punchSound = null
                this.playerHealthBar = null
                this.bossHealthBar = null
            }

            preload() {
                this.load.image(
                    'sky',
                    'https://labs.phaser.io/assets/skies/space3.png'
                )
                this.load.image(
                    'ground',
                    'https://labs.phaser.io/assets/sprites/platform.png'
                )
                this.load.spritesheet(
                    'dude',
                    'https://labs.phaser.io/assets/sprites/dude.png',
                    { frameWidth: 32, frameHeight: 48 }
                )
                this.load.image(
                    'boss1',
                    'https://labs.phaser.io/assets/sprites/mushroom2.png'
                )
                this.load.image('boss2', '/assets/boss-2.png')
                this.load.image('boss3', '/assets/boss-3.png')

                this.load.audio('bg1', '/assets/bg-1.mp3')
                this.load.audio('bg2', '/assets/bg-2.mp3')
                this.load.audio('bg3', '/assets/bg-3.mp3')

                // 새로운 효과음 로드
                this.load.audio('fight', '/assets/fight.mp3')
                this.load.audio('win', '/assets/win.mp3')
                this.load.audio('jump', '/assets/jump.mp3')
                this.load.audio('punch', '/assets/punch.mp3')

                // Game Over 효과음 로드
                this.load.audio('gameOver', '/assets/game-over.mp3')
            }

            create() {
                currentScene = this

                this.add.image(400, 300, 'sky')

                platforms = this.physics.add.staticGroup()
                platforms.create(400, 568, 'ground').setScale(2).refreshBody()

                player = this.physics.add.sprite(100, 450, 'dude')
                player.setBounce(0.2)
                player.setCollideWorldBounds(true)

                boss = this.physics.add.sprite(700, 450, 'boss1')
                boss.setBounce(0.2)
                boss.setCollideWorldBounds(true)

                this.physics.add.collider(player, platforms, function () {
                    canDoubleJump = false
                    hasDoubleJumped = false
                    canForceDescend = true
                })
                this.physics.add.collider(boss, platforms)
                this.physics.add.collider(
                    player,
                    boss,
                    this.hitBoss,
                    null,
                    this
                )

                cursors = this.input.keyboard.createCursorKeys()

                this.anims.create({
                    key: 'left',
                    frames: this.anims.generateFrameNumbers('dude', {
                        start: 0,
                        end: 3
                    }),
                    frameRate: 10,
                    repeat: -1
                })

                this.anims.create({
                    key: 'turn',
                    frames: [{ key: 'dude', frame: 4 }],
                    frameRate: 20
                })

                this.anims.create({
                    key: 'right',
                    frames: this.anims.generateFrameNumbers('dude', {
                        start: 5,
                        end: 8
                    }),
                    frameRate: 10,
                    repeat: -1
                })

                const textStyle = {
                    fontSize: '24px',
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 4
                }
                // 플레이어 체력바 (파란색)
                playerHealthBar = this.add.graphics()
                playerHealthBar.fillStyle(0x0000ff, 1)
                playerHealthBar.fillRect(16, 16, 50, 20)

                // 보스 체력바 (빨간색)
                bossHealthBar = this.add.graphics()
                bossHealthBar.fillStyle(0xff0000, 1)
                bossHealthBar.fillRect(584, 16, 200, 20)

                // 체력바 테두리
                this.add.rectangle(116, 26, 204, 24).setStrokeStyle(2, 0xffffff)
                this.add.rectangle(684, 26, 204, 24).setStrokeStyle(2, 0xffffff)

                // 체력바 레이블
                this.add.text(16, 40, 'PLAYER', {
                    fontSize: '16px',
                    fill: '#fff'
                })
                this.add
                    .text(780, 40, 'BOSS', { fontSize: '16px', fill: '#fff' })
                    .setOrigin(1, 0)

                stageText = this.add
                    .text(400, 16, 'Stage: 1', textStyle)
                    .setOrigin(0.5, 0)
                scoreText = this.add.text(16, 50, 'Score: 0', textStyle)

                gameOverText = this.add.text(400, 300, 'Game Over', {
                    fontSize: '64px',
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 6
                })
                gameOverText.setOrigin(0.5)
                gameOverText.setVisible(false)

                nextStageText = this.add.text(400, 300, 'Next Stage', {
                    fontSize: '64px',
                    fill: '#fff',
                    stroke: '#000',
                    strokeThickness: 6
                })
                nextStageText.setOrigin(0.5)
                nextStageText.setVisible(false)

                try {
                    backgroundMusic = this.sound.add('bg1', { loop: true })
                    backgroundMusic.setVolume(0.3)
                    backgroundMusic.play()

                    // 효과음 추가
                    fightSound = this.sound.add('fight')
                    winSound = this.sound.add('win')
                    jumpSound = this.sound.add('jump')
                    jumpSound.setVolume(0.3)
                    punchSound = this.sound.add('punch')

                    // Game Over 효과음 추가
                    gameOverSound = this.sound.add('gameOver')

                    // 첫 스테이지 시작 효과음 재생
                    fightSound.play()
                } catch (error) {
                    console.error('Failed to load or play audio:', error)
                }
            }

            update(time) {
                if (gameOver) {
                    return
                }

                const speed = 480

                if (cursors.left.isDown) {
                    player.setVelocityX(-speed)
                    player.anims.play('left', true)
                } else if (cursors.right.isDown) {
                    player.setVelocityX(speed)
                    player.anims.play('right', true)
                } else {
                    player.setVelocityX(0)
                    player.anims.play('turn')
                }

                if (cursors.up.isDown) {
                    if (player.body.touching.down) {
                        player.setVelocityY(-330)
                        canDoubleJump = true
                        hasDoubleJumped = false
                        jumpSound.play() // 점프 효과음 재생
                    } else if (
                        canDoubleJump &&
                        !hasDoubleJumped &&
                        isJumpKeyReleased
                    ) {
                        player.setVelocityY(-300)
                        hasDoubleJumped = true
                        jumpSound.play() // 이단 점프 효과음 재생
                    }
                    isJumpKeyReleased = false
                } else {
                    isJumpKeyReleased = true
                }

                if (
                    cursors.down.isDown &&
                    !player.body.touching.down &&
                    canForceDescend
                ) {
                    player.setVelocityY(450)
                    canForceDescend = false
                }

                if (boss && boss.active) {
                    this.updateBossMovement(time)
                }

                scoreText.setText(`Score: ${score}`)
                stageText.setText(`Stage: ${bossStage}`)
                // 체력바 업데이트
                // 플레이어 체력바 업데이트
                playerHealthBar.clear()
                playerHealthBar.fillStyle(0x0000ff, 1)
                playerHealthBar.fillRect(16, 16, (playerHealth / 100) * 200, 20)

                // 보스 체력바 업데이트
                bossHealthBar.clear()
                bossHealthBar.fillStyle(0xff0000, 1)
                bossHealthBar.fillRect(
                    584,
                    16,
                    (bossHealth / (150 * bossStage)) * 200,
                    20
                )

                if (playerInvincible) {
                    player.alpha = 0.5
                } else {
                    player.alpha = 1
                }
            }

            updateBossMovement(time) {
                if (!boss || !boss.body) {
                    return
                }

                let speed = 200 * bossStage

                if (time > bossChangeTimer) {
                    bossDirection = Math.random() < 0.5 ? -1 : 1
                    bossChangeTimer = time + Phaser.Math.Between(2000, 4000)

                    if (boss.body.touching.down && Math.random() < 0.3) {
                        boss.setVelocityY(Phaser.Math.Between(-400, -300))
                    }
                }

                boss.setVelocityX(speed * bossDirection)

                if (
                    (boss.x > 750 && bossDirection === 1) ||
                    (boss.x < 50 && bossDirection === -1)
                ) {
                    bossDirection *= -1
                }
            }

            hitBoss(player, boss) {
                if (player.body.touching.down && boss.body.touching.up) {
                    bossHealth -= 50
                    player.setVelocityY(-200)
                    score += 100
                    punchSound.play() // 보스 공격 효과음 재생

                    if (bossHealth <= 0) {
                        boss.destroy()
                        score += 1000
                        winSound.play() // 스테이지 통과 효과음 재생
                        this.nextStage()
                    }
                } else if (!playerInvincible) {
                    playerHealth -= 10
                    player.setTint(0xff0000)

                    const knockbackForce = 200
                    player.setVelocityY(-knockbackForce)
                    if (player.x < boss.x) {
                        player.setVelocityX(-knockbackForce)
                    } else {
                        player.setVelocityX(knockbackForce)
                    }

                    playerInvincible = true
                    if (invincibilityTimer) invincibilityTimer.remove()
                    invincibilityTimer = currentScene.time.delayedCall(
                        500,
                        () => {
                            playerInvincible = false
                            player.clearTint()
                        }
                    )

                    if (playerHealth <= 0) {
                        this.endGame('Game Over')
                    }
                }
            }

            nextStage() {
                bossStage++
                if (bossStage > 3) {
                    // 모든 스테이지를 클리어한 경우
                    this.endGame('Game Clear! Victory!', true)
                    return
                }

                nextStageText.setVisible(true)
                currentScene.time.delayedCall(2000, () => {
                    nextStageText.setVisible(false)
                    this.respawnBoss()
                    this.changeBgMusic()
                    fightSound.play() // 새 스테이지 시작 효과음 재생
                })
            }

            respawnBoss() {
                bossHealth = 150 * bossStage
                const bossKey = `boss${bossStage}`

                let bossY = 450
                if (bossStage > 1) {
                    bossY = 400
                }

                boss = currentScene.physics.add.sprite(700, bossY, bossKey)
                boss.setBounce(0.2)
                boss.setCollideWorldBounds(true)

                if (bossStage > 1) {
                    boss.setScale(1.5)
                }

                currentScene.physics.add.collider(boss, platforms)
                currentScene.physics.add.collider(
                    player,
                    boss,
                    this.hitBoss,
                    null,
                    currentScene
                )
            }

            changeBgMusic() {
                try {
                    if (backgroundMusic) {
                        backgroundMusic.stop()
                    }
                    backgroundMusic = currentScene.sound.add(`bg${bossStage}`, {
                        loop: true
                    })
                    backgroundMusic.setVolume(0.3)
                    backgroundMusic.play()
                } catch (error) {
                    console.error('Failed to change background music:', error)
                }
            }

            endGame(message, isVictory = false) {
                gameOver = true
                if (gameOverText) {
                    gameOverText.setText(message)
                    gameOverText.setVisible(true)
                }

                if (currentScene && currentScene.physics) {
                    currentScene.physics.pause()
                }

                if (backgroundMusic) {
                    backgroundMusic.stop()
                }

                // 승리 시 효과음 재생
                if (isVictory) {
                    winSound.play()
                } else {
                    gameOverSound.play() // Game Over 효과음 재생
                }

                // Restart 버튼 추가
                const restartButton = this.add
                    .text(400, 400, 'Restart', {
                        fontSize: '32px',
                        fill: '#0f0',
                        backgroundColor: '#000',
                        padding: { left: 15, right: 15, top: 10, bottom: 10 }
                    })
                    .setOrigin(0.5)
                    .setInteractive()
                    .on('pointerdown', this.restartGame, this)
                    .on('pointerover', () =>
                        restartButton.setStyle({ fill: '#ff0' })
                    )
                    .on('pointerout', () =>
                        restartButton.setStyle({ fill: '#0f0' })
                    )

                // 최종 점수 표시
                this.add
                    .text(400, 450, `Final Score: ${score}`, {
                        fontSize: '24px',
                        fill: '#fff'
                    })
                    .setOrigin(0.5)

                // 콘솔에 게임 결과 로그 출력
                console.log(
                    `Game Over. ${
                        isVictory ? 'Victory!' : 'Defeat.'
                    } Final Score:`,
                    score
                )
            }

            // 새로운 메서드: 게임 재시작
            restartGame() {
                // 게임 상태 초기화
                gameOver = false
                bossHealth = 150
                playerHealth = 100
                bossStage = 1
                score = 0
                playerInvincible = false

                // 씬 재시작
                this.scene.restart()

                // 콘솔에 게임 재시작 로그 출력
                console.log('Game Restarted')
            }
        }

        const config = {
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: gameRef.current,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 300 },
                    debug: false
                }
            },
            scene: [StartScene, GameScene]
        }

        game = new Phaser.Game(config)

        return () => {
            game.destroy(true)
        }
    }, [])

    return <div ref={gameRef} />
}

export default GameComponent

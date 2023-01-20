namespace SpriteKind {
    export const Shark = SpriteKind.create()
    export const EnemyProjectile = SpriteKind.create()
}

namespace shark {

    let boss:Sprite = null
    let bossInvulnerable = false;
    let playerSprite:Sprite = null;
    let finalBlowLaunched :boolean = false;

    let headSprite:Sprite
    let bodySprite:Sprite
    let footSprite:Sprite

    const SHARK_MAX_HP = 100

    export function spawnBoss(_playerSprite : Sprite, initHandler:boolean) {
        for (let attackObject of attackObjects) {
            attackObject.stopAtOnce()
        }
        boss = sprites.create(assets.image`AlienBoss`, SpriteKind.Shark)
        boss.setPosition(140, randint(10, 110))
        boss.setVelocity(30, 30)
        boss.setFlag(SpriteFlag.BounceOnWall, true)
        attackObjects = []

        sprites.setDataNumber(boss, "hp", SHARK_MAX_HP)
        cubicbird.displayHitPointBar(sprites.readDataNumber(boss, "hp") / SHARK_MAX_HP * 100)

        playerSprite = _playerSprite

        if (initHandler) {
            game.onUpdate(function () {
                if (engine.status() == engine.STATUS.NORMAL && boss) {
                    moveBoss()
                }
            })
            game.onUpdateInterval(2000, function () {
                if (engine.status() == engine.STATUS.NORMAL && boss) {
                    bossAttack()
                }
            })
            game.onUpdateInterval(500, function () {
                if (engine.status() == engine.STATUS.NORMAL && boss) {
                    if (Math.percentChance((SHARK_MAX_HP - sprites.readDataNumber(boss, "hp")) / SHARK_MAX_HP)) {
                        bossExplosionAttack()
                    }
                    
                }
            })

            game.onUpdate(function() {
                if (engine.engineTime() > 20000 && !finalBlowLaunched) {
                    finalBlowLaunched = bossAngerAttack(120, 5000, 10000)
                }
            })
        }
    }

    function bossExplosionAttack() {
        if (headSprite) {
            attackEffect.explode(headSprite, 24, 1000)    
        } 

        if (bodySprite) {
            attackEffect.explode(bodySprite, 24, 1000)    
        } 
        if (footSprite) {
            attackEffect.explode(footSprite, 24, 1000)    
        }   
    
    }

    function bossAttack () {
         headSprite = sprites.createProjectileFromSprite(assets.image`BossProjectileHead`, boss, -100 + randint(-20, 20), 0)
        headSprite.setKind(SpriteKind.EnemyProjectile)
        headSprite.x -= 10
        headSprite.y -= 43

         bodySprite = sprites.createProjectileFromSprite(assets.image`BossProjectileBody`, boss, -100 + randint(-20, 20), 0)
        bodySprite.x -= 10
        bodySprite.y += 2
        bodySprite.setKind(SpriteKind.EnemyProjectile)

         footSprite = sprites.createProjectileFromSprite(assets.image`BossProjectileFoot`, boss, -100 + randint(-20, 20), 0)
        footSprite.x -= 10
        footSprite.y += 38
        footSprite.setKind(SpriteKind.EnemyProjectile)
    }

    function moveBoss () {
        if (boss.x > 150) {
            boss.vx = -30
        }
        if (boss.x < 120) {
            boss.vx = 30
        }
        if (boss.y > 110) {
            boss.vy = -30
        }
        if (boss.y < 10) {
            boss.vy = 30
        }
    }

    let attackObjects :attackEffect.AttackObject[] = []
    let angerAttackLaunched = false;

    function bossAngerAttack (width:number, duration:number, preparedDuration:number) :boolean {
        if (angerAttackLaunched) {
            return false;
        }

        angerAttackLaunched = true

        let angerAttack = attackEffect.laserAttack(boss, attackEffect.LaserAttackDirection.LEFT, width, duration, preparedDuration)

        attackObjects.push(angerAttack)

        control.runInParallel(function() {
            pause(duration + preparedDuration)
            angerAttackLaunched = false
        })
        return true
    }

    export function takeDamage(damage : number) :boolean {
        if (!(bossInvulnerable)) {
            sprites.changeDataNumberBy(boss, "hp", -damage)
            if (showBossHp) {
                cubicbird.displayHitPointBar(sprites.readDataNumber(boss, "hp") / SHARK_MAX_HP * 100)
            }
            
            if (sprites.readDataNumber(boss, "hp") <= 0) {
                boss.destroy(effects.disintegrate, 2000)
                return true
            } else if (sprites.readDataNumber(boss, "hp") == 50 
            || sprites.readDataNumber(boss, "hp") == 20 || sprites.readDataNumber(boss, "hp") == 10 ) {
                bossAngerAttack(50, 1000, 2000)
            }
        }
        return false
    }

    let showBossHp:boolean = true

    export function toggleBossHp() {
        if (!showBossHp) {
            cubicbird.displayHitPointBar(sprites.readDataNumber(boss, "hp") / SHARK_MAX_HP * 100)
            showBossHp = true
        } else {
            cubicbird.displayHitPointBar(0)
            showBossHp = false
        }
    }
}
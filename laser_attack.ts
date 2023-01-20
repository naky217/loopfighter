// % weight=100 color=#6699CC icon="\u2593"
// block="SpecialAttack" % groups='["Laser", "Explosion"]'
namespace attackEffect {

    export enum LaserAttackDirection {
        RIGHT,
        LEFT,
        UP,
        DOWN
    }

    const COLOR_INNER = 1
    const COLOR_OUTER = 2

    class OnHitCallback {
        spriteKind: number
        callback: (sprite: Sprite) => void
        constructor(spriteKind: number, callback: (sprite: Sprite) => void) {
            this.spriteKind = spriteKind;
            this.callback = callback
        }
    }

    interface AttackAnimation {

        draw(canvas:Image):void
        
    }

    abstract class AttackChecker {

        constructor() {
            this.onHitCallbacks = []
        }

        protected onHitCallbacks: OnHitCallback[]
        registerOnHitCallbacks(spriteKind: number, onHitCallback: (sprite: Sprite) => void) {
            this.onHitCallbacks.push(new OnHitCallback(spriteKind, onHitCallback))
        }
    }

    enum CHECKER_STATUS{
        CREATED,
        STARTED,
        STOPPED            
    }

    class LaserAttackChecker extends AttackChecker {
        

        private left: number
        private right: number
        private top: number
        private bottom: number

        private sprite: Sprite
        private width: number
        private direction: LaserAttackDirection

        private status:CHECKER_STATUS 

        private overlapCheckerImage: Image
        private overlapCheckerImageCenterX: number
        private overlapCheckerImageCenterY: number

        private hitSprites :Sprite[]

        define(sprite: Sprite, width: number, direction: LaserAttackDirection) {
            this.status = CHECKER_STATUS.CREATED;
            this.sprite = sprite
            this.width = width
            this.direction = direction

            // reset hit sprites every time
            this.hitSprites = []
        }

        resetOverlapChecker() {
            let result = null;
            if (this.direction == LaserAttackDirection.RIGHT) {
                this.left = this.sprite.x
                this.right = 120
                this.top = this.sprite.y - this.width / 2
                this.bottom = this.sprite.y + this.width / 2

                result = image.create(this.right - this.left, this.bottom - this.top)
            } else if (this.direction == LaserAttackDirection.LEFT) {
                this.left = 0
                this.right = this.sprite.x
                this.top = this.sprite.y - this.width / 2
                this.bottom = this.sprite.y + this.width / 2

                result = image.create(this.right - this.left, this.bottom - this.top)
            }
            result.fill(1)
            this.overlapCheckerImage = result
            this.overlapCheckerImageCenterX = (this.right + this.left) / 2
            this.overlapCheckerImageCenterY = (this.top + this.bottom) / 2
        }

        checkOverlap(candidate: Sprite) {
            if (this.direction == LaserAttackDirection.RIGHT) {
                if (candidate.x < this.left) {
                    return false;
                } else {
                    return this.top < candidate.y && candidate.y < this.bottom
                }
            } else if (this.direction == LaserAttackDirection.LEFT) {
                if (candidate.x > this.right) {
                    return false;
                } else {
                    return this.top < candidate.y && candidate.y < this.bottom
                }
            }
            return false;
        }


        constructor() {
            super()
            this._init()
        }

        stop() {
            this.status = CHECKER_STATUS.STOPPED;
        }

        start() {
            if (this.status == CHECKER_STATUS.CREATED) {
                this.status = CHECKER_STATUS.STARTED;
            }
            
        }


        onUpdateListener() {
            if (this.status != CHECKER_STATUS.STARTED) {
                return;
            }

            let attackSprites: Sprite[] = []

            this.resetOverlapChecker()

            for (let callback of this.onHitCallbacks) {
                for (let candidate of sprites.allOfKind(callback.spriteKind)) {
                    if (this.hitSprites.find((value:Sprite) => value === candidate)) {
                        continue
                    }

                    if (candidate.flags & (sprites.Flag.Ghost | sprites.Flag.RelativeToCamera)) {
                        continue
                    }

                    if (this.checkOverlap(candidate)) {
                        this.hitSprites.push(candidate)
                        control.runInParallel(function () {
                            callback.callback(candidate)
                        })
                    }
                }
                
            }


        }


        _init() {
            game.onUpdate(() => {
                this.onUpdateListener()
            })
        }

    }

    class LaserAttackAnimation implements AttackAnimation {
        private direction: LaserAttackDirection
        private width: number
        private sprite: Sprite
        private preparedDuration:number
        private attackStartTimestamp:number
        private active:boolean = false

        constructor(sprite: Sprite, width: number, direction: LaserAttackDirection, preparedDuration:number) {
            this.sprite = sprite
            this.width = width
            this.direction = direction
            this.attackStartTimestamp = engine.engineTime() + preparedDuration
            this.sprite.onDestroyed(function() {
                this.active = false
            })
            this.active = true
            
        }

        attackStarted() :boolean{
            return engine.engineTime() >= this.attackStartTimestamp
        }

        draw(canvas:Image) {
            if (!this.active) {
                return
            }
            canvas.fillCircle(this.sprite.x, this.sprite.y, this.width, COLOR_OUTER)
            if (this.attackStarted()) {
                switch (this.direction) {
                    case LaserAttackDirection.RIGHT:
                        canvas.fillRect(this.sprite.x, this.sprite.y - this.width / 2, 160 - this.sprite.x, this.width, COLOR_OUTER)
                        canvas.fillRect(this.sprite.x, this.sprite.y - this.width / 4, 160 - this.sprite.x, this.width / 2, COLOR_INNER)
                    case LaserAttackDirection.LEFT:
                        canvas.fillRect(0, this.sprite.y - this.width / 2, this.sprite.x, this.width, COLOR_OUTER)
                        canvas.fillRect(0, this.sprite.y - this.width / 4, this.sprite.x, this.width / 2, COLOR_INNER)
                }
            }
            canvas.fillCircle(this.sprite.x, this.sprite.y, this.width / 2, COLOR_INNER)
        }

    }

    class AnimationHolder {
        private animations: AttackAnimation[]
        private canvas:Image
        constructor(){
            this.animations = []
            this.canvas = image.create(160, 120)
            this._init()
        }
        registerAnimation(animation:AttackAnimation) {
            this.animations.push(animation)
        }
        unregisterAnimation(animation:AttackAnimation) {
            this.animations.removeElement(animation)
        }

        _init() {
            game.onPaint(() => {
                this.canvas.fill(0)
                for (let animation of this.animations) {
                    animation.draw(this.canvas)
                }
                screen.drawTransparentImage(this.canvas, 0, 0)
            })
        }

    }

     class ExplosionAttackAnimation implements AttackAnimation {

        private sprite:Sprite;
        private radius:number

        constructor(sprite:Sprite, radius:number) {
            this.sprite = sprite
            this.radius = radius
        }

        draw(canvas:Image) {
            canvas.fillCircle(this.sprite.x, this.sprite.y, this.radius, COLOR_OUTER)
            canvas.fillCircle(this.sprite.x, this.sprite.y, this.radius / 3 * 2, COLOR_INNER)
            
        }

    }
    

    class ExplosionAttackChecker extends AttackChecker {
        private x:number;
        private y:number;
        private radius:number;

        constructor() {
            super()
        }

        define(x:number, y:number, radius:number) {
            this.x = x;
            this.y = y;
            this.radius = radius
        }

        clone() : ExplosionAttackChecker {
            let result = new ExplosionAttackChecker() 
            for (let cb of this.onHitCallbacks) {
                result.onHitCallbacks.push(cb)
            }
            return result;
        }

        checkOverlap(candidate:Sprite) {
            return Math.pow(candidate.x - this.x, 2) + Math.pow(candidate.y - this.y, 2) <= this.radius * this.radius
        }

        notifyOnHitCallbacks() {
            for (let callback of this.onHitCallbacks) {
                for (let candidate of sprites.allOfKind(callback.spriteKind)) {                
                    if (candidate.flags & (sprites.Flag.Ghost | sprites.Flag.RelativeToCamera)) {
                        continue
                    }

                    if (this.checkOverlap(candidate)) {
                        control.runInParallel(function () {
                            callback.callback(candidate)
                        })
                    }
                }
                
            }

        }
    }

    let checker = new LaserAttackChecker()
    
    let laserAttackCallbacks: OnHitCallback[] = []

    export function laserAttack(sprite: Sprite, direction: LaserAttackDirection,
        width: number, duration: number, preparedDuration:number=0) :AttackObject{
        
        checker.define(sprite, width, direction)
        let laserAttackAnimation = new LaserAttackAnimation(sprite, width, direction, preparedDuration)
        animationHolder.registerAnimation(laserAttackAnimation)

        control.runInParallel(function () {
            pause(preparedDuration + 500)
            checker.start()
            pause(duration)
            checker.stop()
            animationHolder.unregisterAnimation(laserAttackAnimation)
        })

        return new AttackObject(checker, laserAttackAnimation)
    }

    export function onLaserHit(spriteKind: number, spriteHitCallback: (sprite: Sprite) => void) {
        checker.registerOnHitCallbacks(spriteKind, spriteHitCallback)
    }

    export class AttackObject{
        private checker :LaserAttackChecker
        private animation:AttackAnimation

        public constructor(checker:LaserAttackChecker, animation:AttackAnimation) {
            this.checker = checker 
            this.animation = animation
        }

        stopAtOnce() {
            this.checker.stop()
            animationHolder.unregisterAnimation(this.animation)
        }
    }

    

    

    let explosionAttackChecker = new ExplosionAttackChecker()
    let animationHolder = new AnimationHolder()

    export function onExplosionHit(spriteKind: number, spriteHitCallback: (sprite: Sprite) => void) {
        explosionAttackChecker.registerOnHitCallbacks(spriteKind, spriteHitCallback)
    }

    let explosionAnimationFrames = [
        img`
            ...22...............
            .221222......2222...
            2211112222222211222.
            21111111111111111122
            21111111111111111112
            22221111111111111122
            ...2111111111111122.
            ...221111111111122..
            ...12111111111122...
            ...1211111111112....
            ...2111111111112....
            ..22111111111112....
            .2211111111111122...
            21111111111111112...
            2111111222211111122.
            21111222..2221111122
            211122......22111112
            .2112........2211122
            ..222.........22122.
            ...............222..
        `, 
        img`
            . . . . . . . . . . . . . . . 2 2 . . .
            . . . . . . . . . . . . . . 2 2 2 . . .
            . . . . . . 2 2 1 1 1 1 . 1 1 1 2 2 . .
            . . . . . 2 2 1 1 1 1 1 1 1 1 1 1 2 2 2
            . . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 2
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 2
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 2 2
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 2 2 .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 . . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . . 1 1 1 1 1 1 1 1 1 1 1 1 . . . .
            2 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 . .
            2 1 1 1 1 2 . 1 1 1 1 1 . 1 1 1 1 1 2 2
            2 1 1 1 2 2 . . . . . . . 2 1 1 1 1 1 2
            2 2 1 1 2 . . . . . . . . 2 2 1 1 1 1 2
            . 2 2 2 2 . . . . . . . . . 2 1 1 2 2 .
            . . 2 2 . . . . . . . . . . . 2 2 . . .
        `,
        img`
            . . . . . . . . . . . . . . . 2 2 . . .
            . . . . . . . . . . . . . . 2 2 2 . . .
            . . . . . . 2 2 1 1 1 1 . 1 1 1 2 2 . .
            . . . . . 2 2 1 1 1 1 1 1 1 1 1 1 2 2 2
            . . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 2
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 1 2
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 1 1 1 2 2
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 2 2 .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 . . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 1 . . .
            . . . . 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            2 2 2 1 1 1 1 1 1 1 1 1 1 1 2 2 2 . . .
            2 1 1 1 1 1 1 1 1 1 1 1 1 2 2 . . . . .
            2 1 1 1 1 2 . 1 1 1 1 1 2 2 . . . . . .
            2 1 1 1 2 2 . . . . . . . . . . . . . .
            2 2 1 1 2 . . . . . . . . . . . . . . .
            . 2 2 2 2 . . . . . . . . . . . . . . .
            . . 2 2 . . . . . . . . . . . . . . . .
        `, 
        img`
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . 2 2 2 2 2 2 2 2 . . . . . .
            . . . . . 2 2 1 1 1 1 1 1 2 2 . . . . .
            . . . . 2 2 1 1 1 1 1 1 1 1 2 . . . . .
            . . . 2 2 1 1 1 1 1 1 1 1 1 2 2 . . . .
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 2 2 . . .
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 1 1 1 1 1 1 1 1 1 1 1 1 2 2 . . .
            . . . . 1 1 1 1 1 1 1 1 1 1 2 2 2 . . .
            2 2 2 1 1 1 1 1 1 1 1 1 1 1 2 2 2 . . .
            2 1 1 1 1 1 1 1 1 1 1 1 1 2 2 . . . . .
            2 1 1 1 1 2 . 1 1 1 1 1 2 2 . . . . . .
            2 1 1 1 2 2 . . . . . . . . . . . . . .
            2 2 1 1 2 . . . . . . . . . . . . . . .
            . 2 2 2 2 . . . . . . . . . . . . . . .
            . . 2 2 . . . . . . . . . . . . . . . .
        `,
        img`
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . 2 2 2 2 2 2 2 2 . . . . . .
            . . . . . 2 2 1 1 1 1 1 1 2 2 . . . . .
            . . . . 2 2 1 1 1 1 1 1 1 1 2 . . . . .
            . . . . 2 1 1 1 1 1 1 1 1 1 2 2 . . . .
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 2 2 . . .
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 2 1 1 1 1 1 1 1 1 1 1 1 1 2 . . .
            . . . 2 2 1 1 1 1 1 1 1 1 1 1 2 2 . . .
            . . . . 2 1 1 1 1 1 1 1 1 1 2 2 . . . .
            . . . . 2 2 1 1 1 1 1 1 1 1 2 . . . . .
            . . . . . 2 2 2 1 1 1 1 1 2 2 . . . . .
            . . . . . . . 2 2 2 2 2 2 2 . . . . . .
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . . . . . .
        ` 
    ]

     export function explode(sprite:Sprite, radius:number, period:number) {
        sprite.vx = 0
        sprite.vy = 0 
        sprite.destroy(effects.spray, period)
        
        let animationAnchorSprite = sprites.create(img`
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
        `, SpriteKind.SPRITE_KIND_ANIMATION_DUMMY)
        animationAnchorSprite.x = sprite.x
        animationAnchorSprite.y = sprite.y
        animationAnchorSprite.z = sprite.z - 10 // below the sprite
        animation.runImageAnimation(animationAnchorSprite, explosionAnimationFrames, period / 5, false)

        sprite.onDestroyed(function() {
            createExplosionDebrisSprite(sprite, 50, 50)
            createExplosionDebrisSprite(sprite, 50, -50)
            createExplosionDebrisSprite(sprite, -50, 50)
            createExplosionDebrisSprite(sprite, -50, -50)
        })

        control.runInParallel(function() {
            pause(period)
            animationAnchorSprite.destroy()
            
            let checker = explosionAttackChecker.clone()
            checker.define(sprite.x, sprite.y, radius) 
            checker.notifyOnHitCallbacks()

            let animation = new ExplosionAttackAnimation(sprite, radius)
            animationHolder.registerAnimation(animation)
            pause(1000)
            animationHolder.unregisterAnimation(animation)
            sprite.destroy()
        })
        
    }

    function createExplosionDebrisSprite(sprite:Sprite, vx:number, vy:number) {
        let debrisSprite = sprites.createProjectileFromSprite(img`
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . 1 1 . . . . . . . .
            . . . . . . . 1 1 . . . . . . .
            . . . . . . . 1 . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
        `, sprite, vx, vy)
        debrisSprite.setKind(SpriteKind.EnemyProjectile)
        debrisSprite.lifespan = 5000
    }

}

namespace SpriteKind {
    export const SPRITE_KIND_ANIMATION_DUMMY = SpriteKind.create()
}

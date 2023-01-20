namespace SpriteKind {
    export const TimeTravelPlayer = SpriteKind.create()
    export const Explosion = SpriteKind.create()
}
enum ActionList{
    UP, DOWN, LEFT, RIGHT, DESTROY
}
interface ActionTimestamp {
    timestamp :number
    action : ActionList
}
class StoredPlayerActivity {
    activities:ActionTimestamp[]
    public constructor() {
        this.activities = []
    }
    push(action:ActionList, timestamp:number) {
        this.activities.push({
            timestamp : timestamp, 
            action : action
        })
    }
}
class TimeTravelPlayer {
    private playerSprite :Sprite
    activities:ActionTimestamp[]
    private destroyed : boolean
    public constructor(storedPlayerActivity : StoredPlayerActivity) {
        this.playerSprite = sprites.create(assets.image`OtherTimelineSpaceship`, SpriteKind.TimeTravelPlayer)
        this.playerSprite.setFlag(SpriteFlag.StayInScreen, true)
        this.playerSprite.x = 32
        this.activities = storedPlayerActivity.activities
    }
    
    public say(text:string) {
        this.playerSprite.say(text)
    }

    public up() {
        this.playerSprite.vx = 0
        this.playerSprite.vy = -50
    }
    public down() {
        this.playerSprite.vx = 0
        this.playerSprite.vy = 50
    }
    public left() {
        this.playerSprite.vx = -50
        this.playerSprite.vy = 0
    }
    public right() {
        this.playerSprite.vx = 50
        this.playerSprite.vy = 0
    }

    public destroy(sayFarewall:boolean) {
        if (sayFarewall) {
            this.playerSprite.say("R to another timeline, keep fighting", 2000)
        }
        this.playerSprite.setFlag(SpriteFlag.Ghost, true)
        animation.runImageAnimation(this.playerSprite, assets.animation`TimeWrapAnim`, 200)
        this.playerSprite.vx = 0
        this.playerSprite.vy = 0
        this.destroyed = true
    }

    public fire() {
        if (!this.destroyed) {
            sprites.createProjectileFromSprite(assets.image`PlayerProjectiles`, this.playerSprite, 100, 0)
        }
        
    }
}
namespace engine {
    
    export enum STATUS  {
        NORMAL, ENDGAME
    }

    let currentTimelineTimeStamp:number = 0;

    let storedPlayerActivities : StoredPlayerActivity[] = []
    let playersInOtherTimeline : TimeTravelPlayer[]
    let currentPlayerActivityLogger : StoredPlayerActivity = null
    let playerSprite :Sprite = null

    let init = false
    let destroyedUniverse = 0

    let controlDisabled = false;

    let _haltTime:number = -1

    export let _status = STATUS.NORMAL

    export function status() :STATUS {
        return _status
    }

    export function engineTime() {
        return _haltTime == -1 ? game.runtime() - currentTimelineTimeStamp : _haltTime
    }

    export function endGame() {
        controlDisabled = true
        playerSprite.setFlag(SpriteFlag.Ghost, true)
        _status = STATUS.ENDGAME
        _haltTime = game.runtime() - currentTimelineTimeStamp

        freezeEverything()

        game.showLongText("Retreat before it's too late", DialogLayout.Bottom)
        currentPlayerActivityLogger.push(ActionList.DESTROY, game.runtime() - currentTimelineTimeStamp)
        storedPlayerActivities.push(currentPlayerActivityLogger)

        animation.runImageAnimation(playerSprite, assets.animation`TimeWrapAnim`)

        playerSprite.say("Opening wormhole to another timeline", 3000)
        playerSprite.vx = 0
        playerSprite.vy = 0

       

        playerSprite.lifespan = 3000

    }

    function overlapHandle() {
        sprites.onOverlap(SpriteKind.Player, SpriteKind.EnemyProjectile, function(sprite: Sprite, otherSprite: Sprite) {
            endGame()
        })
        sprites.onOverlap(SpriteKind.Player, SpriteKind.Shark, function(sprite: Sprite, otherSprite: Sprite) {
            endGame()
        })

        sprites.onOverlap(SpriteKind.Projectile, SpriteKind.Shark, function(sprite: Sprite, otherSprite: Sprite) {
            if (_status == STATUS.ENDGAME) {
                return 
            }

            otherSprite.startEffect(effects.spray, 200)
            sprite.destroy()
            if(shark.takeDamage(1)){
                _haltTime = game.runtime()
                game.showLongText("You've save us all, at " + destroyedUniverse + " universe(s)'s cost", DialogLayout.Bottom)
                game.over(true)
            }
        })
    }

    function bindControl() {
        controlDisabled = false;

        controller.up.onEvent(ControllerButtonEvent.Pressed, function() {
            if (controlDisabled) {
                return
            }
            currentPlayerActivityLogger.push(ActionList.UP, game.runtime() - currentTimelineTimeStamp)
            playerSprite.vy = -50
            playerSprite.vx = 0
        })
        controller.down.onEvent(ControllerButtonEvent.Pressed, function() {
            if (controlDisabled) {
                return
            }
            currentPlayerActivityLogger.push(ActionList.DOWN, game.runtime() - currentTimelineTimeStamp)
            playerSprite.vy = 50
            playerSprite.vx = 0
        })
        controller.left.onEvent(ControllerButtonEvent.Pressed, function() {
            if (controlDisabled) {
                return
            }
            currentPlayerActivityLogger.push(ActionList.LEFT, game.runtime() - currentTimelineTimeStamp)
            playerSprite.vy = 0
            playerSprite.vx = -50
        })
        controller.right.onEvent(ControllerButtonEvent.Pressed, function() {
            if (controlDisabled) {
                return
            }
            currentPlayerActivityLogger.push(ActionList.RIGHT, game.runtime() - currentTimelineTimeStamp)
            playerSprite.vy = 0
            playerSprite.vx = 50
        })
        controller.B.onEvent(ControllerButtonEvent.Pressed, function() {
            hud.toggleHud()
            shark.toggleBossHp()
        })
    }

    function dumpActivities(activities:ActionTimestamp[]) {
        let log = ""
        for (let activity of activities) {
            log += activity.timestamp + ":" + activity.action + ";"
        }
        console.log(log)
    }

    function summonPlayersInOtherTimeline() {
        playersInOtherTimeline = []
        for (let storedPlayerActivity of storedPlayerActivities) {
            playersInOtherTimeline.push(new TimeTravelPlayer(storedPlayerActivity))
        }
    }

    class MoveHandler {
        private currentActionIndice:number[]
        private currentTimelineTimeStamp:number
        static INSTANCE = new MoveHandler()

        reset(currentTimelineTimeStamp: number, length:number) {
            this.currentActionIndice = []
            this.currentTimelineTimeStamp = currentTimelineTimeStamp
            for (let i = 0 ; i < length; i++) {
                this.currentActionIndice.push(0)
            }
        }

        serve() {
            game.onUpdate(() =>  {
                if (_status == STATUS.ENDGAME) {
                    return 
                }


                let delta2 = game.runtime() - this.currentTimelineTimeStamp
                for (let k = 0 ; k < playersInOtherTimeline.length; k++) {
                    let anotherPlayer = playersInOtherTimeline[k]
                    while (this.currentActionIndice[k] < anotherPlayer.activities.length 
                        && anotherPlayer.activities[this.currentActionIndice[k]].timestamp < delta2) {
                        let action2 = anotherPlayer.activities[this.currentActionIndice[k]].action
                        switch(action2) {
                            case ActionList.UP: 
                                anotherPlayer.up() 
                                break;
                            case ActionList.DOWN: 
                                anotherPlayer.down() 
                                break;
                            case ActionList.LEFT: 
                                anotherPlayer.left() 
                                break;
                            case ActionList.RIGHT: 
                                anotherPlayer.right() 
                                break;
                            case ActionList.DESTROY: 
                                anotherPlayer.destroy(destroyedUniverse <= 2) 
                                break;
                        }
                        this.currentActionIndice[k] = this.currentActionIndice[k] + 1
                    }
                }
            })
        }
    }

    function moveHandler(initHandler:boolean) {
        MoveHandler.INSTANCE.reset(currentTimelineTimeStamp, playersInOtherTimeline.length)
        if (initHandler) {
            MoveHandler.INSTANCE.serve()
        }
    }
    
    function attackHandler() {
        game.onUpdateInterval(500, function() {
            if (engine.status() == STATUS.NORMAL) {
                for (let anotherPlayer22 of playersInOtherTimeline) {
                    anotherPlayer22.fire()
                }
                sprites.createProjectileFromSprite(assets.image`PlayerProjectiles`, playerSprite, 100, 0)
            }        
        })
    }

    function freezeAllOfKind(kind:number) {
        for (let sprite of sprites.allOfKind(kind)) {
            sprite.vx = 0
            sprite.vy = 0
        }
    }

    function freezeEverything() {
        freezeAllOfKind(SpriteKind.Player)
        freezeAllOfKind(SpriteKind.Shark)
        freezeAllOfKind(SpriteKind.Projectile)
        freezeAllOfKind(SpriteKind.EnemyProjectile)
        freezeAllOfKind(SpriteKind.Explosion)
        freezeAllOfKind(SpriteKind.TimeTravelPlayer)
    }

    export function restartGame() {
        currentPlayerActivityLogger = new StoredPlayerActivity()
        currentTimelineTimeStamp = game.runtime()
        playerSprite = sprites.create(assets.image`CurrentTimelineSpaceship`, SpriteKind.Player)

        playerSprite.x = 32
        playerSprite.z = 100
        playerSprite.setFlag(SpriteFlag.StayInScreen, true)
        bindControl()
        summonPlayersInOtherTimeline()

        playerSprite.onDestroyed(function() {
            destroyedUniverse++
            
            cubicbird.destroyAllSpriteOfKind(SpriteKind.Player)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.Shark)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.Projectile)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.EnemyProjectile)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.Explosion)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.TimeTravelPlayer)
            cubicbird.destroyAllSpriteOfKind(SpriteKind.SPRITE_KIND_ANIMATION_DUMMY)

            restartGame()   
        })

        moveHandler(!init)        
        shark.spawnBoss(playerSprite, !init)
        hud.resetTime(destroyedUniverse+1)

        if (!init) {
            overlapHandle()
            attackHandler()

            init = true
        }
        
        _haltTime = -1
        _status = STATUS.NORMAL

    }
}
attackEffect.onLaserHit(SpriteKind.Player, function(sprite: Sprite) {
    engine.endGame()    
})
attackEffect.onExplosionHit(SpriteKind.Player, function(sprite: Sprite) {
    engine.endGame()   
})
palette.setMonochrome()
engine.restartGame()

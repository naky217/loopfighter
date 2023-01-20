// Add your code here
namespace hud {

    let currentTimelineTimestamp:number
    let init = false;
    let _currentUniverse:number
    let on:boolean = true;

    export function toggleHud() {
        on = !on
    }

    export function resetTime(currentUniverse:number) {
        currentTimelineTimestamp = game.runtime()
        _currentUniverse = currentUniverse
            
        if(!init) {
            game.onShade(function() {
                if (on) {
                    let font: image.Font = image.font8
                    let offsetY: number;
                    const timestamp 
                        = (30000 - engine.engineTime()) /  1000

                    const num = "T-" + timestamp.toString().replace(".", ":").slice(0,4) + " in Universe " + _currentUniverse.toString()
                    
                    const width = num.length* font.charWidth;
                    const start_x = (screen.width - width)  / 2
                    const start_y = 1

                    screen.fillRect(start_x, 0, width + 4, image.font8.charHeight + 3, info.borderColor())
                    screen.fillRect(start_x + 1, 0, width + 2, image.font8.charHeight + 2, 1)  

                    screen.print(num, start_x + 2, 0, info.borderColor())
                }
            })
            init = true
        }
        
    }

}
# GridBase   

#### Installation    
npm install    


#### 4 person free-for-all capture the flag
-------
* Before start of game, each player creates their own base – clicking on the grid and selecting where they want to place their walls/turrets/flag/spawn point.   
* Upon creation, client sends map to server and you get randomly assigned with 3 other ready players.
* Server broadcasts players’ maps to each other, and glues all 4 bases together. Game is started. All player movements are broadcasted amongst the players. Easy with `socket.io`
* You lose if an enemy player moves your flag across your base to their base. (your base layout remains for the other players to use, but you disappear).
* You gain certain powerups (undecided) if you steal a flag.
* **_You win the match if you keep your flag in your base for the entire game (last man standing)_**

---
##### Players:
- Players can shoot other players, walls, turrets, and pick up flags.  
- They have regenerating health.
- Death makes them respawn @ their selected location after 3 seconds.   

##### Flag:
- Can be picked up (even your own flag) [or dropped] by moving over the flag and pressing ‘f’   

##### Blocks/Walls:
- Walls also have health, and can be shot down, but are strong.   

##### Turret Towers:
- Shoot enemy players. Also have health and can be shot down. Shoot slowly. (maybe powerups increase reload speed)   

##### Spawn:
 - Self select spawn point. Being shot down makes you spawn there after 3 sec   

---
![Alt text](https://gitlab.cs.washington.edu/agonch/cse461_P3/raw/master/game_image.PNG "Game Board Concept")
---

"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Pizza {
  id: number
  x: number
  y: number
  vy: number //speed of flying pizza
  isFlying: boolean
}

interface Target {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  isHit: boolean
  type: "normal" | "bonus"
}

interface PowerUp {
  id: number
  x: number
  y: number
  type: "speed" | "multi" | "points"
  collected: boolean
}

export default function PizzaShooterGame() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(0)// current level
  const [maxLevel, setMaxLevel] = useState(0)// highest level reached
  const [pizzas, setPizzas] = useState<Pizza[]>([])
  const [targets, setTargets] = useState<Target[]>([])
  const [powerUps, setPowerUps] = useState<PowerUp[]>([])
  const [playerX, setPlayerX] = useState(50)
  const [timeLeft, setTimeLeft] = useState(60)
  const [multiplier, setMultiplier] = useState(1)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const pizzaIdRef = useRef(0)
  const targetIdRef = useRef(0)
  const powerUpIdRef = useRef(0)

  // Initialize targets for the level
  const initializeTargets = useCallback(() => {
    const newTargets: Target[] = []
    const targetCount = Math.min(5 + level, 12)

    for (let i = 0; i < targetCount; i++) {
      newTargets.push({
        id: targetIdRef.current++,
        x: Math.random() * 80 + 10,
        y: Math.random() * 40 + 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        isHit: false,
        type: Math.random() > 0.8 ? "bonus" : "normal",
      })
    }
    const randomIndex = Math.floor(Math.random() * newTargets.length)
    newTargets[randomIndex].type = "bonus"
    setTargets(newTargets)
  }, [level])

//Target movement
useEffect(() => {
  if (gameState !== "playing") return
  const interval = setInterval(() => {
    setTargets((prev) =>
      prev.map((t) => {
        if(t.isHit) return t
        let newX = t.x + t.vx
        let newY = t.y + t.vy
        if (newX < 5 || newX > 95) {
          t.vx = -t.vx
          newX = Math.max(5, Math.min(95,newX))
        }
        if (newY < 5 || newY > 90) {
          t.vy = -t.vy
          newY = Math.max(5, Math.min(90, newY))
        }
        return {...t, x:newX, y:newY, vx: t.vx, vy:t.vy}
      })
    )
  }, 50)
  return() => clearInterval(interval)
}, [gameState])

  // Spawn power-ups occasionally
  const spawnPowerUp = useCallback(() => {
    if (Math.random() > 0.95) {
      const types: PowerUp["type"][] = ["speed", "multi", "points"]
      setPowerUps((prev) => [
        ...prev,
        {
          id: powerUpIdRef.current++,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          type: types[Math.floor(Math.random() * types.length)],
          collected: false,
        },
      ])
    }
  }, [])

  // Start game
  const startGame = () => {
    setGameState("playing")
    setScore(0)
    setLevel(1)
    setTimeLeft(30)
    setMultiplier(1)
    setPizzas([])
    setPowerUps([])
    setPlayerX(50)
    initializeTargets()
  }

  // Shoot pizza
  const shootPizza = useCallback(
    (clickX: number) => {
      if (gameState !== "playing") return

      const gameArea = gameAreaRef.current
      if (!gameArea) return

      const rect = gameArea.getBoundingClientRect()
      const x = ((clickX - rect.left) / rect.width) * 100

      const newPizza: Pizza = {
        id: pizzaIdRef.current++,
        x,
        y: 90,
        vy: Math.random() * 2 + 2, // Random speed between 2 and 4
        isFlying: true,
      }

      setPizzas((prev) => [...prev, newPizza])

    },
    [gameState],
  )

  //pizza movement
  useEffect(() => {
    if (gameState !== "playing") return
    const interval = setInterval(() => {
      setPizzas((prev) => 
      prev
        .map((p) => ({
          ...p,
          y: p.y - p.vy,
        }))
        .filter((p) => p.y > 0)
      )
    },50)
    return () => clearInterval(interval)
  }, [gameState])

  // Handle mouse click to shoot
  const handleGameAreaClick = (e: React.MouseEvent) => {
    shootPizza(e.clientX)
  }

  // Check collisions
  useEffect(() => {
    const checkCollisions = () => {
      setPizzas((currentPizzas) => {
        const activePizzas = currentPizzas.filter((pizza) => pizza.isFlying)

        activePizzas.forEach((pizza) => {
          // Check target collisions
          setTargets((currentTargets) => {
            return currentTargets.map((target) => {
              const dx = pizza.x - target.x
              const dy = pizza.y - target.y
              const distance = Math.sqrt(dx * dx + dy * dy)
              if (!target.isHit && distance < 6) {
                const points = target.type === "bonus" ? 50 * multiplier : 10 * multiplier
                setScore((prev) => prev + points)

                return { ...target, isHit: true }
              }
              return target
            })
          })

          // Check power-up collisions
          setPowerUps((currentPowerUps) => {
            return currentPowerUps.map((powerUp) => {
              if (!powerUp.collected && Math.abs(pizza.x - powerUp.x) < 6 && Math.abs(pizza.y - powerUp.y) < 6) {
                // Apply power-up effect
                switch (powerUp.type) {
                  case "points":
                    setScore((prev) => prev + 100)
                    break
                  case "multi":
                    setMultiplier((prev) => Math.min(prev + 1, 5))
                    setTimeout(() => setMultiplier(1), 10000)
                    break
                  case "speed":
                    setTimeLeft((prev) => prev + 10)
                    break
                }

                return { ...powerUp, collected: true }
              }
              return powerUp
            })
          })
        })

        return currentPizzas
      })
    }

    const interval = setInterval(checkCollisions, 50)
    return () => clearInterval(interval)
  }, [multiplier])

  //Reset game
  const resetGame = () => {
    setGameState("menu")
    setScore(0)
    setLevel(1)
    setTimeLeft(30)
    setMultiplier(1)
    setPizzas([])
    setPowerUps([])
    setTargets([])
    setPlayerX(50)
  }

  // Game timer
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
        let newLevel = 1
        if (score >= 100) newLevel  = 2
        if (score >= 300) newLevel = 3
        if (score >= 700) newLevel = 4
        if (score >= 1500) newLevel = 5
        if (score >= 1500) {
          newLevel = 5 + Math.floor((score -1500) / 1000)
        }
        setLevel(newLevel)
        setMaxLevel((prev) => Math.max(prev, newLevel))
      setGameState("gameOver")
    }
  }, [gameState, timeLeft, score])

  // Level progression
  useEffect(() => {
    const activeTargets = targets.filter((t) => !t.isHit)
    if (gameState === "playing" && activeTargets.length === 0) {
      setTimeout(initializeTargets, 1000)
    }
  }, [targets, gameState, initializeTargets])

  // Spawn power-ups periodically
  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(spawnPowerUp, 3000)
      return () => clearInterval(interval)
    }
  }, [gameState, spawnPowerUp])

  // Rocket follows mouse movement
useEffect(() => {
  if (gameState !== "playing") return

  const handleMouseMove = (e: MouseEvent) => {
    const gameArea = gameAreaRef.current
    if (!gameArea) return

    const rect = gameArea.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    setPlayerX(Math.max(5, Math.min(95, x))) // 경계 제한
  }

  window.addEventListener("mousemove", handleMouseMove)
  return () => window.removeEventListener("mousemove", handleMouseMove)
}, [gameState])


  if (gameState === "menu") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-100 to-red-100">
        <Card className="p-12 text-center max-w-2xl bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="text-6xl mb-6">🍕</div>
          <h1 className="text-4xl font-bold text-red-600 mb-6">Pizza Shooter</h1>
          <p className="text-gray-600 mb-8">
            Click to shoot pizza slices at targets!<br />Hit bonus targets for extra points and collect power-ups!"
          </p>
          <Button onClick={startGame} size="lg" className="text-lg px-8 bg-red-600 hover:bg-red-700 text-white transition-colors">
            Start Game
          </Button>
        </Card>
      </div>
    )
  }

  if (gameState === "gameOver") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-100 to-orange-100">
        <Card className="p-8 text-center max-w-md rounded-xl  bg-white shadow-lg border border-gray-300">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">Game Over!</h1>
          <div className="space-y-2 mb-6">
            <p className="text-xl">
              Final Score: <span className="font-bold text-yellow-600">{score}</span>
            </p>
            <p className="text-lg">
              Level Reached: <span className="font-bold">{level}</span>
            </p>
          </div>
          <div className="flex space-x-4 justify-center">
            <Button onClick={startGame} size="lg" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors">
              Play Again
            </Button>
            <Button onClick={resetGame} size="lg" className = "bg-white border border-black text-black px-6 py-2 rounded-md hover:bg-gray-100 transition-colors">
              Menu
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 p-4">
      {/* Game HUD */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-6">
          <div className="text-lg font-bold">
            Score: <span className="text-primary">{score}</span>
          </div>
          <div className="text-lg font-bold">
            Level: <span className="text-secondary">{level}</span>
          </div>
          <div className="text-lg font-bold">
            Time: <span className="text-destructive">{timeLeft}s</span>
          </div>
          {multiplier > 1 && <div className="text-lg font-bold text-accent">{multiplier}x Multiplier!</div>}
        </div>
        <Button onClick={() => setGameState("menu")} variant="outline">
          Menu
        </Button>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative w-full h-[600px] bg-gradient-to-b from-sky-200 to-green-200 rounded-lg border-4 border-red-600 cursor-crosshair overflow-hidden"
        onClick={handleGameAreaClick}
      >
        {/* Targets */}
        {targets.map((target) => (
          <div
            key={target.id}
            className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
              target.isHit
                ? "opacity-0 scale-0"
                : target.type === "bonus"
                  ? "bg-yellow-400 text-white target-hit"
                  : "bg-red-600 text-white"
            }`}
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {target.type === "bonus" ? "⭐" : "🎯"}
          </div>
        ))}

        {/* Power-ups */}
        {powerUps
          .filter((p) => !p.collected)
          .map((powerUp) => (
            <div
              key={powerUp.id}
              className="absolute w-8 h-8 rounded-full flex items-center justify-center text-lg pizza-spin bg-yellow-500 text-white"
              style={{
                left: `${powerUp.x}%`,
                top: `${powerUp.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {powerUp.type === "speed" ? "⚡" : powerUp.type === "multi" ? "✨" : "💎"}
            </div>
          ))}

        {/* Flying Pizzas */}
        {pizzas.map((pizza) => (
          <div
            key={pizza.id}
            className="absolute w-8 h-8 text-2xl pizza-fly"
            style={{
              left: `${pizza.x}%`,
              top: `${pizza.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            🍕
          </div>
        ))}

        {/* Player Cannon */}
        <div
          className="absolute bottom-4 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl transition-all duration-200"
          style={{
            left: `${playerX}%`,
            transform: "translateX(-50%)",
          }}
        >
          🚀
        </div>
        {/* Instructions */}
        <div className="absolute top-4 left-4 text-sm text-black bg-white p-3 rounded-md border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]">
          Click anywhere to shoot pizza! 🍕
        </div>
      </div>
    </div>
  )
}

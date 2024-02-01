"use client";

import { useEffect, useState } from "react";

type SlideDirection = "up" | "down" | "left" | "right" | "none";
type SlideResult = "normal" | "board_full" | "spwan_kill" | "spawn_fill";
type GameResult = "normal" | "game_over";

function Tile({ value }: { value: number }) {
  if (value === 0) {
    return <div className="tile w-24 h-24 bg-gray-300"></div>;
  }

  return (
    <div className="tile w-24 h-24 bg-gray-100 flex items-center justify-center">
      {value}
    </div>
  );
}

class GridHelper {
  buildGrid(size: number): number[] {
    return Array(size * size).fill(0);
  }

  reshapeGrid(grid: number[], size: number): number[][] {
    const result = [];

    for (let i = 0; i < size; i++) {
      result.push(grid.slice(i * size, i * size + size));
    }

    return result;
  }

  setDynamicCols(size: number) {
    document.querySelector(".grid")?.setAttribute("style", `grid-template-columns: repeat(${size}, 1fr)`);
  }
}


type GameConfig = {
  grid_size: number;
  root_tile_value: number;
  spawn_tile_count: number;
  starting_tile_count: number;
  win_tile_value: number;
  mutation_probability: number;
  mutation_at_start: boolean;
  spawn_kill: boolean;
}


export function Grid({ values, size, slideFunction }: { values: number[], size: number, slideFunction: (direction: SlideDirection) => void}) {
  const [slideDirection, setSlideDirection] = useState<SlideDirection>("none");

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case "ArrowUp":
        setSlideDirection("up");
        break;
      case "ArrowDown":
        setSlideDirection("down");
        break;
      case "ArrowLeft":
        setSlideDirection("left");
        break;
      case "ArrowRight":
        setSlideDirection("right");
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    new GridHelper().setDynamicCols(size);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [size]);

  useEffect(() => {
    if (slideDirection === "none") {
      return;
    }

    slideFunction(slideDirection);
    setSlideDirection("none");
  }, [slideDirection]);

  return (
    <div className={`grid grid-cols-4 gap-2`}>
      {values.map((value, index) => (
        <Tile key={index} value={value} />
      ))}
    </div>
  );
}

function ConfigEditor({ config, setConfig }: { config: GameConfig; setConfig: (config: GameConfig) => void }) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    if (event.target.type === "number") {
      setConfig({ ...config, [name]: parseInt(value) });
      return;
    }
    setConfig({ ...config, [name]: value });
  };

  return (
    <div>
      <div>
        <label htmlFor="grid_size">Grid Size</label>
        <input className="border" type="number" name="grid_size" id="grid_size" value={config.grid_size} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="root_tile_value">Root Tile Value</label>
        <input className="border" type="number" name="root_tile_value" id="root_tile_value" value={config.root_tile_value} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="spawn_tile_count">Spawn Tile Count</label>
        <input className="border" type="number" name="spawn_tile_count" id="spawn_tile_count" value={config.spawn_tile_count} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="starting_tile_count">Starting Tile Count</label>
        <input className="border" type="number" name="starting_tile_count" id="starting_tile_count" value={config.starting_tile_count} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="win_tile_value">Win Tile Value</label>
        <input className="border" type="number" name="win_tile_value" id="win_tile_value" value={config.win_tile_value} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="mutation_probability">Mutation Probability</label>
        <input className="border" type="number" name="mutation_probability" id="mutation_probability" value={config.mutation_probability} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="mutation_at_start">Mutation At Start</label>
        <input className="border" type="checkbox" name="mutation_at_start" id="mutation_at_start" checked={config.mutation_at_start} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="spawn_kill">Spawn Kill</label>
        <input className="border" type="checkbox" name="spawn_kill" id="spawn_kill" checked={config.spawn_kill} onChange={handleChange} />
      </div>
    </div>
  );
}

type GameState = {
  config: GameConfig;
  grid: number[][];
  score: number;
  movement_matrix: number[][];
  latest_spawn_result: SlideResult;
  latest_spawn_locations: number[][];
}

type SlidePerformedResponse = {
  game: GameState;
  reason: SlideResult;
  result: GameResult;
}

type NewGameResponse = {
  game_uuid: string;
  game: GameState;
}

class APIHelper {
  async createNewGame(config: GameConfig): Promise<NewGameResponse> {
    const api_url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/create_game/v1`;
    const response = await fetch(api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    return response.json();
  }

  async performSlide(game_uuid: string, slide_direction: SlideDirection): Promise<SlidePerformedResponse> {
    const api_url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/perform_slide/v1`;
    const payload = {
      game_uuid: game_uuid,
      slide_direction: slide_direction,
    };

    const response = await fetch(api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}

export function Game() {
  const [config, setConfig] = useState<GameConfig>({
    grid_size: 4,
    root_tile_value: 2,
    spawn_tile_count: 2,
    starting_tile_count: 2,
    win_tile_value: 2048,
    mutation_probability: 0.1,
    mutation_at_start: true,
    spawn_kill: false,
  });
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameUuid, setGameUuid] = useState<string>("");
  const [gameState, setGameState] = useState<GameState>({
    config: config,
    grid: new GridHelper().reshapeGrid(new GridHelper().buildGrid(config.grid_size), config.grid_size),
    score: 0,
    movement_matrix: [],
    latest_spawn_result: "normal",
    latest_spawn_locations: [],
  });
  const [gameOver, setGameOver] = useState<boolean>(false);

  const startNewGame = () => {
    if (gameStarted) {
      if (gameOver) {
        resetGame();
        return;
      }
    
      if (window.confirm("Are you sure you want to start a new game?")) {
        resetGame();
        return;
      } else {
        return;
      }
    }

    // createNewGame();
    setGameStarted(true);
  }

  const createNewGame = () => {
    const result = new Promise<NewGameResponse>((resolve, _reject) => {
      console.log("creating new game", config);
      new APIHelper().createNewGame(config).then((response) => {
        resolve(response);
      });
    });

    result.then((response) => {
      console.log(response);
      setGameUuid(response.game_uuid);
      setGameState(response.game);
    })
  }

  const performSlide = (direction: SlideDirection) => {
    if (gameOver) {
      return;
    }

    const result = new Promise<SlidePerformedResponse>((resolve, _repythoject) => {
      new APIHelper().performSlide(gameUuid, direction).then((response) => {
        resolve(response);
      });
    });

    result.then((response) => {
      setGameState(response.game);

      if (response.result === "game_over") {
        setGameOver(true);
      }
    }).catch((error) => {
      // Most likely occurs because arrow keys are pressed too quickly,
      // causing multiple API calls to be made before the previous one is resolved.
      // Either investigate locking the key, or just ignore it for now.
      console.error("error", error);
    });
  }

  useEffect(() => {
    if (gameStarted) {
      createNewGame();
    }
  }, [gameStarted]);

  const resetGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setGameUuid("");
    setGameState({
      config: config,
      grid: new GridHelper().reshapeGrid(new GridHelper().buildGrid(config.grid_size), config.grid_size),
      score: 0,
      movement_matrix: [],
      latest_spawn_result: "normal",
      latest_spawn_locations: [],
    });
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <h1>2048 Clone</h1>
      {gameOver ? <h2>Game over! Your final score was {gameState.score}</h2> : null}
      {gameStarted ? null : <ConfigEditor config={config} setConfig={setConfig} />}
      {gameStarted ? <Grid size={config.grid_size} values={gameState.grid.flat()} slideFunction={performSlide} /> : null}
      {gameStarted ? <p>Your score: <span className="font-bold">{gameState.score}</span></p> : null} 

      <button className="p-3 m-5 border rounded-md" onClick={startNewGame}>
        New Game
      </button>
    </div>

  );
}
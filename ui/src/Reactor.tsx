import React, { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import * as msgs from "./messages";
import debounce from "lodash.debounce";
import CellComponent from "./Cell";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import AddIcon from "@mui/icons-material/Add";

interface Cell {
  id: string;
  code: string;
  status: string;
}

interface ReactorState {
  focus: string;
  cells: Array<Cell>;
}

function randomId(): string {
  return `${Math.random() * 100000000}`;
}

function newCell(code: string): Cell {
  const id = randomId();
  return { id, code, status: "idle" };
}

function emptyState(): ReactorState {
  const cell = newCell("print('hello world')");
  return {
    focus: cell.id,
    cells: [cell],
  };
}

function Reactor(props: { darkMode: boolean; toggleMode: () => void }) {
  const { darkMode, toggleMode } = props;
  const [state, setState] = useState<ReactorState>(emptyState());

  const [results, setResults] = useState<Record<string, msgs.EvalResult>>({});

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    "ws://localhost:1337",
    { shouldReconnect: (closeEvent) => true }
  );

  const send = (v: msgs.Message) => {
    sendMessage(JSON.stringify(v));
  };

  function setAttr<K extends keyof Cell, T extends Cell[K]>(
    id: string,
    k: K,
    v: T
  ) {
    setState((state) => {
      const newState = { ...state };
      const cells = newState.cells.map((cell) => {
        if (cell.id === id) {
          cell[k] = v;
        }
        return cell;
      });
      newState.cells = cells;
      return newState;
    });
  }

  const changeStatus = (id: string, status: string) => {
    setAttr(id, "status", status);
  };

  const changeCode = (id: string, code: string) => {
    setAttr(id, "code", code);
  };

  const run = (id: string, code: string, kind: string) => {
    console.log(`running ${id} ${code} ${kind}`);
    send({ id, code, kind });
    changeStatus(id, "running");
  };

  const runDependant = (id: string) => {
    const ids = (Object.values(results) as Array<msgs.EvalResult>)
      .filter((res) => res.dependencies.includes(id))
      .map((res) => res.id);
    const uniqueIds = Array.from(new Set(ids));

    state.cells.forEach((cell) => {
      if (uniqueIds.includes(cell.id) && cell.id !== id) {
        run(cell.id, cell.code, "eval");
      }
    });
  };

  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data) as msgs.EvalResult;
      console.log(data);

      setResults((res) => {
        const newRes = { ...res };
        newRes[data.id] = data;
        return newRes;
      });

      if (data.error && data.error.length > 0) {
        changeStatus(data.id, "error");
      } else {
        changeStatus(data.id, "success");
        runDependant(data.id);
      }
    }
  }, [lastMessage, setResults]);

  const onSubmit = (id: string) => {
    return (code: string) => {
      changeCode(id, code);
      run(id, code, "eval");
    };
  };

  const onSubmitAndInsert = (id: string) => {
    return (code: string) => {
      changeCode(id, code);
      run(id, code, "eval");
      focusNext();
    };
  };

  const insertAfter = () => {
    setState((state) => {
      const newState = { ...state };
      const idx = newState.cells.findIndex(
        (cell) => cell.id === newState.focus
      );
      const cell = newCell("");
      newState.cells.splice(idx + 1, 0, cell);
      newState.focus = cell.id;
      return newState;
    });
  };

  const focusNext = () => {
    setState((state) => {
      const newState = { ...state };
      const idx = newState.cells.findIndex(
        (cell) => cell.id === newState.focus
      );

      if (idx < newState.cells.length - 1) {
        newState.focus = newState.cells[idx + 1].id;
      } else {
        const cell = newCell("");
        newState.cells.push(cell);
        newState.focus = cell.id;
      }

      return newState;
    });
  };

  const insertAfterCb = useCallback(
    debounce(insertAfter, 100, { leading: false, trailing: true }),
    []
  );

  const onFocus = (id: string) => {
    setState((state) => {
      const newState = { ...state };
      newState.focus = id;
      return newState;
    });
  };

  const connectionStatus = {
    [ReadyState.CONNECTING]: <CloudSyncIcon />,
    [ReadyState.OPEN]: <CloudIcon />,
    [ReadyState.CLOSING]: "closing",
    [ReadyState.CLOSED]: <CloudOffIcon />,
    [ReadyState.UNINSTANTIATED]: "uninstantiated",
  }[readyState];

  return (
    <>
      <Paper
        sx={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 100,
          borderColor: "rgba(194, 224, 255, 0.08)",
          borderWidth: "0px 0px thin",
          backdropFilter: "blur(10px)",
          backgroundColor: darkMode
            ? "rgba(10, 25, 41, 0.7)"
            : "rgba(245, 245, 245, 0.7)",
        }}
      >
        <Toolbar>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Box>
              <IconButton onClick={insertAfterCb}>
                <AddIcon />
              </IconButton>
            </Box>
            <Box>
              <IconButton onClick={toggleMode}>
                {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </Paper>

      <Box sx={{ position: "fixed", bottom: 15, right: 15 }}>
        <IconButton>{connectionStatus}</IconButton>
      </Box>

      <Box sx={{ mt: 10 }}>
        <Box sx={{ width: "600px", mx: "auto" }}>
          {state.cells.map((cell) => {
            return (
              <CellComponent
                onSubmit={onSubmit(cell.id)}
                onSubmitAndInsert={onSubmitAndInsert(cell.id)}
                onFocus={onFocus}
                code={cell.code}
                id={cell.id}
                status={cell.status}
                darkMode={darkMode}
                result={results[cell.id]}
                focused={cell.id === state.focus}
                key={cell.id}
              />
            );
          })}
        </Box>
      </Box>
    </>
  );
}

export default Reactor;

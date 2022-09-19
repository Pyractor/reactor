import React, { useState, useEffect, useCallback } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import * as msgs from "./messages";
import debounce from "lodash.debounce";
import CellComponent from "./Cell";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CropFreeIcon from "@mui/icons-material/CropFree";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

interface Cell {
  id: string;
  code: string;
  status: string;
}

interface ReactorState {
  focus: string;
  cells: Record<string, Cell>;
}

function randomId(): string {
  return `${Math.random() * 100000000}`;
}

function newCell(code: string): Cell {
  const id = randomId();
  return { id, code, status: "idle" };
}

function emptyState(): [ReactorState, Array<string>] {
  const cell = newCell(`import reactor.ui as ui

s = ui.Slider(value=20, min=2, max=1000)
s`);
  const cell2 = newCell(`import pandas as pd
import math

pd.DataFrame([math.log(i) for i in range(1, s.value)]).plot()`);
  const state: Record<string, Cell> = {};
  state[cell.id] = cell;
  state[cell2.id] = cell2;

  return [
    {
      focus: cell.id,
      cells: state,
    },
    [cell.id, cell2.id],
  ];
}

function Reactor(props: { darkMode: boolean; toggleMode: () => void }) {
  const { darkMode, toggleMode } = props;
  const [_emptyState, _emptyOrder] = emptyState();
  const [state, setState] = useState<ReactorState>(_emptyState);
  const [cellOrder, setCellOrder] = useState<Array<string>>(_emptyOrder);
  const [results, setResults] = useState<Record<string, msgs.EvalResult>>({});
  const [fullWidth, setFullWidth] = useState(false);

  const toggleFullWidth = () => {
    setFullWidth((v) => !v);
  };

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    "ws://localhost:1337",
    { shouldReconnect: (closeEvent) => true }
  );

  const send = (v: msgs.Message) => {
    console.log("--->", v);
    sendMessage(JSON.stringify(v));
  };

  function setAttr<K extends keyof Cell, T extends Cell[K]>(
    id: string,
    k: K,
    v: T
  ) {
    setState((oldState) => {
      const state = { ...oldState };
      Object.keys(state.cells).forEach((cid) => {
        if (cid === id) {
          state.cells[id][k] = v;
        }
      });
      return state;
    });
  }

  const changeStatus = (id: string, status: string) => {
    setAttr(id, "status", status);
  };

  const changeCode = (id: string, code: string) => {
    setAttr(id, "code", code);
  };

  const run = (id: string, code: string) => {
    send({ id, code, kind: "eval" });
    changeStatus(id, "running");
  };

  const inputChange = (id: string, value: any) => {
    send({ id, value, kind: "input_change" });
    changeStatus(id, "running");
  };

  const runDependant = (id: string) => {
    const ids = (Object.values(results) as Array<msgs.EvalResult>)
      .filter((res) => res.dependencies.includes(id))
      .map((res) => res.id);
    const uniqueIds = Array.from(new Set(ids));

    Object.values(state.cells).forEach((cell) => {
      if (uniqueIds.includes(cell.id) && cell.id !== id) {
        run(cell.id, cell.code);
      }
    });
  };

  /* eslint-disable */
  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data) as msgs.Result;
      console.log("<---", data);

      if (msgs.isEvalResult(data)) {
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

      if (msgs.isInputChangeResult(data)) {
        runDependant(data.cell_id);
      }
    }
  }, [lastMessage]);

  const onSubmit = (id: string) => {
    return (code: string) => {
      changeCode(id, code);
      run(id, code);
    };
  };

  const onSubmitAndInsert = (id: string) => {
    return (code: string) => {
      changeCode(id, code);
      run(id, code);
      focusNext();
    };
  };

  const insertAfter = () => {
    setState((oldState) => {
      const state = { ...oldState };
      const idx = cellOrder.indexOf(state.focus);
      const cell = newCell("");
      state.cells[cell.id] = cell;
      setCellOrder((order) => {
        order.splice(idx + 1, 0, cell.id);
        return order;
      });
      state.focus = cell.id;
      return state;
    });
  };

  const focusNext = () => {
    const cell = newCell("");

    setState((oldState) => {
      const state = { ...oldState };
      const idx = cellOrder.indexOf(state.focus);

      if (idx < cellOrder.length - 1) {
        state.focus = cellOrder[idx + 1];
      } else {
        state.cells[cell.id] = cell;
        state.focus = cell.id;

        const order = [...cellOrder];
        order.push(cell.id);
        setCellOrder(order);
      }

      return state;
    });
  };

  const moveCurrentBy = (n: number) => {
    const idx = cellOrder.indexOf(state.focus);
    const nidx = n + idx;

    setCellOrder((oldOrder) => {
      const order = [...oldOrder];

      if (nidx >= 0 && nidx < order.length) {
        const tmp = order[idx];
        order.splice(idx, 1);
        order.splice(nidx, 0, tmp);
      }

      return order;
    });
  };

  const moveUp = () => {
    moveCurrentBy(-1);
  };

  const moveDown = () => {
    moveCurrentBy(1);
  };

  const removeCurrent = () => {
    const id = state.focus;

    setState((oldState) => {
      const state = { ...oldState };
      const idx = cellOrder.indexOf(id);
      if (idx < cellOrder.length - 1) {
        state.focus = cellOrder[idx + 1];
      } else {
        state.focus = cellOrder[cellOrder.length - 2];
      }
      delete state.cells[id];
      return state;
    });

    setResults((oldResults) => {
      const res = { ...oldResults };
      delete res[id];
      return res;
    });

    setCellOrder((order) => order.filter((cid) => cid !== id));
  };

  const insertAfterCb = useCallback(
    debounce(insertAfter, 100, { leading: false, trailing: true }),
    []
  );

  const inputChangeCb = useCallback(
    debounce(inputChange, 100, { leading: false, trailing: true }),
    []
  );

  const onFocus = (id: string) => {
    setState((oldState) => {
      const state = { ...oldState };
      state.focus = id;
      return state;
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
          borderRadius: 0,
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
              <IconButton color="primary" onClick={insertAfterCb}>
                <AddIcon />
              </IconButton>
              <IconButton color="secondary" onClick={removeCurrent}>
                <DeleteIcon />
              </IconButton>
              <IconButton onClick={moveUp}>
                <ArrowUpwardIcon />
              </IconButton>
              <IconButton onClick={moveDown}>
                <ArrowDownwardIcon />
              </IconButton>
            </Box>
            <Box>
              <IconButton
                color={fullWidth ? "primary" : "default"}
                onClick={toggleFullWidth}
              >
                <CropFreeIcon />
              </IconButton>
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
        <Box sx={{ maxWidth: fullWidth ? "95%" : "70%", mx: "auto" }}>
          {cellOrder.map((id) => {
            const cell = state.cells[id];

            return (
              cell && (
                <CellComponent
                  onInputChange={inputChangeCb}
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
              )
            );
          })}
        </Box>
      </Box>
    </>
  );
}

export default Reactor;

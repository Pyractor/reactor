import React, { useState, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import * as events from "@uiw/codemirror-extensions-events";
import useWebSocket, { ReadyState } from "react-use-websocket";
import * as msgs from "./messages";
import debounce from "lodash.debounce";

const ResultComponent = (props: { result: msgs.Result | undefined }) => {
  const { result } = props;

  if (result === undefined || result === null) {
    return <pre></pre>;
  }

  if (typeof result === "string") {
    return <pre>{result}</pre>;
  }

  if (result.kind === "HTML") {
    return <span dangerouslySetInnerHTML={{ __html: result.value }}></span>;
  }

  if (result.kind === "plot") {
    return <img src={result.value} />;
  }

  return <pre>{JSON.stringify(result)}</pre>;
};

const CellCmp = (props: {
  code: string;
  id: string;
  status: string;
  result: msgs.EvalResult | undefined;
  onFocus: (id: string) => void;
  onSubmit: (code: string) => void;
}) => {
  const { id, code, result, status, onSubmit, onFocus } = props;
  const [editorState, setEditorState] = useState(code);

  const onChange = React.useCallback(
    (code: string) => {
      setEditorState(code);
    },
    [setEditorState]
  );

  const focusExt = events.content({
    focus: (evn) => {
      onFocus(id);
    },
  });

  const submit = () => {
    console.log("submit");
    onSubmit(editorState);
    return true;
  };

  const submitAndNext = () => {
    console.log("submitAndNext");
    onSubmit(editorState);
    return true;
  };

  const kmap = keymap.of([
    {
      key: "Cmd-Enter",
      preventDefault: true,
      run: submit,
    },
    {
      key: "Ctrl-Enter",
      preventDefault: true,
      run: submit,
    },
    {
      key: "Shift-Enter",
      preventDefault: true,
      run: submitAndNext,
    },
    ...defaultKeymap,
  ]);

  const colors: Record<string, string> = {
    idle: "gray",
    success: "green",
    error: "red",
    running: "yellow",
  };

  const borderColor = colors[status];
  const heightFn = (n: number) => {
    return `${n * 20 + 4}px`;
  };
  const height = heightFn(editorState.split("\n").length);

  return (
    <div
      style={{
        borderLeft: `15px solid ${borderColor}`,
        marginLeft: "5px",
        paddingLeft: "5px",
      }}
    >
      <CodeMirror
        value={editorState}
        basicSetup={{ defaultKeymap: false }}
        height={height}
        minHeight={heightFn(4)}
        extensions={[python(), kmap, focusExt]}
        onChange={onChange}
      />
      <pre>{result?.out}</pre>
      <pre>{result?.error}</pre>
      <pre>
        <ResultComponent result={result?.result} />
      </pre>
      <hr />
    </div>
  );
};

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

function Reactor() {
  const [state, setState] = useState<ReactorState>({
    focus: "",
    cells: [newCell("print('hello world')")],
  });

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

  const insertAfter = useCallback(
    debounce(() => {
      setState((state) => {
        const newState = { ...state };
        newState.cells.push(newCell(""));
        return newState;
      });
    }, 100),
    [setState]
  );

  const onFocus = (id: string) => {
    setState((state) => {
      const newState = { ...state };
      newState.focus = id;
      return newState;
    });
  };

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  return (
    <div>
      <div style={{ position: "fixed", bottom: 15, right: 15 }}>
        Connection: {connectionStatus}
      </div>

      {state.cells.map((cell) => {
        return (
          <CellCmp
            onSubmit={onSubmit(cell.id)}
            onFocus={onFocus}
            code={cell.code}
            id={cell.id}
            status={cell.status}
            result={results[cell.id]}
            key={cell.id}
          />
        );
      })}
      <button onClick={insertAfter}>Add +</button>
    </div>
  );
}
export default Reactor;

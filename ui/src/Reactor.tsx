import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import * as events from "@uiw/codemirror-extensions-events";
import useWebSocket, { ReadyState } from "react-use-websocket";
import * as msgs from "./messages";

function CellCmp(props: {
  code: string;
  id: string;
  result: msgs.EvalResult | undefined;
  onFocus: (id: string) => void;
  onSubmit: (code: string) => void;
}) {
  const { id, code, result, onSubmit, onFocus } = props;
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

  return (
    <div>
      <CodeMirror
        value={editorState}
        basicSetup={{ defaultKeymap: false }}
        height="100px"
        extensions={[python(), kmap, focusExt]}
        onChange={onChange}
      />
      <pre>{result?.out}</pre>
      <pre>{result?.result || result?.error}</pre>
      <hr />
    </div>
  );
}

interface Cell {
  id: string;
  code: string;
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
  return { id, code };
}

function Reactor() {
  const [state, setState] = useState<ReactorState>({
    focus: "",
    cells: [newCell("print('hello world')")],
  });

  const [results, setResults] = useState<Record<string, msgs.EvalResult>>({});

  const { sendMessage, lastMessage, readyState } = useWebSocket(
    "ws://localhost:1337"
  );

  const send = (v: msgs.Message) => {
    console.log(v);
    sendMessage(JSON.stringify(v));
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
    }
  }, [lastMessage, setResults]);

  const onSubmit = (id: string) => {
    return (code: string) => {
      send({ id, code, kind: "eval" });
    };
  };

  const insertAfter = () => {
    setState((state) => {
      const newState = { ...state };
      newState.cells.push(newCell(""));
      return newState;
    });
  };

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

  console.log(results);

  return (
    <div>
      <div style={{ position: "absolute", bottom: 15, right: 15 }}>
        Connection: {connectionStatus}
      </div>

      {state.cells.map((cell) => {
        return (
          <CellCmp
            onSubmit={onSubmit(cell.id)}
            onFocus={onFocus}
            code={cell.code}
            id={cell.id}
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

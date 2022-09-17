import React, { useState, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import * as events from "@uiw/codemirror-extensions-events";
import * as msgs from "./messages";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

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
const CellComponent = (props: {
  code: string;
  id: string;
  status: string;
  focused: boolean;
  result: msgs.EvalResult | undefined;
  onFocus: (id: string) => void;
  onSubmit: (code: string) => void;
  onSubmitAndInsert: (code: string) => void;
}) => {
  const {
    id,
    code,
    result,
    status,
    onSubmit,
    onSubmitAndInsert,
    onFocus,
    focused,
  } = props;
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
    onSubmitAndInsert(editorState);
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
    <Box
      sx={{
        borderLeft: `15px solid ${borderColor}`,
        my: "5px",
        py: "5px",
      }}
    >
      <Paper elevation={focused ? 3 : 0}>
        <CodeMirror
          theme={githubDark}
          value={editorState}
          basicSetup={{ defaultKeymap: false }}
          height={height}
          minHeight={heightFn(4)}
          autoFocus={focused}
          extensions={[python(), kmap, focusExt]}
          onChange={onChange}
        />
        <pre>{result?.out}</pre>
        <pre>{result?.error}</pre>
        <pre>
          <ResultComponent result={result?.result} />
        </pre>
      </Paper>
    </Box>
  );
};

export default CellComponent;

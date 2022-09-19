import "./cm_editor.css";

import React, { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { defaultKeymap } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { keymap } from "@codemirror/view";
import * as events from "@uiw/codemirror-extensions-events";
import * as msgs from "./messages";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
import UIElement from "./UI";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

const OutComponent = (props: { out: string | undefined }) => {
  const { out } = props;

  if (out === undefined || out.length === 0) {
    return <span></span>;
  }

  return (
    <Box component="pre" sx={{ pl: 0.5 }}>
      {out}
    </Box>
  );
};

const ResultComponent = (props: {
  result: msgs.ReturnedValue | undefined;
  onInputChange: (id: string, value: any) => void;
}) => {
  const { result, onInputChange } = props;

  if (result === undefined || result === null) {
    return <span></span>;
  }

  if (typeof result === "string") {
    return (
      <Box component="pre" sx={{ pl: 0.5 }}>
        {result}
      </Box>
    );
  }

  if (result.kind === "HTML") {
    return <span dangerouslySetInnerHTML={{ __html: result.value }}></span>;
  }

  if (result.kind === "input") {
    return <UIElement onChange={onInputChange} el={result.el} />;
  }

  if (result.kind === "plot") {
    return (
      <Box
        component="img"
        src={result.value}
        sx={{ maxWidth: "100%", my: "15px" }}
      />
    );
  }

  return (
    <Box component="pre" sx={{ pl: 0.5 }}>
      {JSON.stringify(result)}
    </Box>
  );
};
const CellComponent = (props: {
  code: string;
  id: string;
  status: string;
  focused: boolean;
  darkMode: boolean;
  result: msgs.EvalResult | undefined;
  onFocus: (id: string) => void;
  onInputChange: (id: string, value: any) => void;
  onSubmit: (code: string) => void;
  onSubmitAndInsert: (code: string) => void;
}) => {
  const {
    id,
    code,
    result,
    status,
    darkMode,
    onSubmit,
    onSubmitAndInsert,
    onFocus,
    onInputChange,
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

  const heightFn = (n: number) => {
    return `${n * 25 + 4}px`;
  };
  const height = heightFn(editorState.split("\n").length);

  return (
    <Paper
      sx={{
        p: 1.5,
        mb: 1,
        display: "flex",
        flexDirection: "row",
        border: focused
          ? `1px solid ${darkMode ? "#119595" : "#9fffff"}`
          : "1px solid rgba(0, 0, 0, 0.05)",
      }}
      elevation={focused ? 2 : 0}
    >
      <Box
        className={`state-indicator state-${status}`}
        sx={{
          borderRadius: 1,
          mr: 1.5,
        }}
      ></Box>
      <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <CodeMirror
          style={{ borderRadius: 100 }}
          theme={darkMode ? githubDark : githubLight}
          value={editorState}
          basicSetup={{ defaultKeymap: false }}
          height={height}
          minHeight={heightFn(4)}
          autoFocus={focused}
          extensions={[python(), kmap, focusExt]}
          onChange={onChange}
        />
        <Box sx={{ ml: 4 }}>
          <OutComponent out={result?.out} />
          <OutComponent out={result?.error} />
          {result?.result && (
            <ResultComponent
              onInputChange={onInputChange}
              result={result?.result}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CellComponent;

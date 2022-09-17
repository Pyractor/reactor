import React from "react";
import Reactor from "./Reactor";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "rgb(10, 25, 41)",
    },
    text: {
      primary: "rgb(160, 170, 180)",
    },
  },
});

const lightTheme = createTheme({
  palette: {
    mode: "light",
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Reactor />
    </ThemeProvider>
  );
}

export default App;

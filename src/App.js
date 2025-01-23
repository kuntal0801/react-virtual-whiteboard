import React from "react";
import Board from "./components/Board";
import Toolbar from "./components/Toolbar";
import BoardProvider from "./store/BoardProvider";
import ToolboxProvider from "./store/ToolboxProvider";
import Toolbox from "./components/Toolbox";

const App = () => {
  return (
    <BoardProvider>
      <ToolboxProvider>
        <Toolbar />
        <Board />
        <Toolbox/>
      </ToolboxProvider>
    </BoardProvider>
  );
};

export default App;

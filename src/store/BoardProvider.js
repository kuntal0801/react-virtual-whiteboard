import React, { useCallback, useReducer } from "react";
import axios from "axios";
import boardContext from "./board-context";
import { TOOL_ITEMS, BOARD_ACTIONS, TOOL_ACTION_TYPES } from "../constants";
import getStroke from "perfect-freehand";
import { createElement, getSvgPathFromStroke, isPointNearElement } from "../utils/element";
import rough from "roughjs/bin/rough";

const gen = rough.generator();
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3030";

const recreateElements = (elements) =>
  elements.map((el) => {
    const { type, x1, y1, x2, y2, stroke, fill, size, points } = el;
    switch (type) {
      case TOOL_ITEMS.BRUSH:
        return { ...el, path: new Path2D(getSvgPathFromStroke(getStroke(points || []))) };
      case TOOL_ITEMS.LINE:
        return { ...el, roughEle: gen.line(x1, y1, x2, y2, { stroke, strokeWidth: size }) };
      case TOOL_ITEMS.RECTANGLE:
        return { ...el, roughEle: gen.rectangle(x1, y1, x2 - x1, y2 - y1, { stroke, strokeWidth: size, fill }) };
      case TOOL_ITEMS.CIRCLE:
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return { ...el, roughEle: gen.ellipse(cx, cy, Math.abs(x2 - x1), Math.abs(y2 - y1), { stroke, strokeWidth: size, fill }) };
      case TOOL_ITEMS.ARROW:
        return { ...el, roughEle: gen.line(x1, y1, x2, y2, { stroke, strokeWidth: size }) };
      default:
        return el;
    }
  });

const boardReducer = (state, action) => {
  switch (action.type) {
    case BOARD_ACTIONS.CHANGE_TOOL:
      return { ...state, activeToolItem: action.payload.tool };
    case BOARD_ACTIONS.CHANGE_ACTION_TYPE:
      return { ...state, toolActionType: action.payload.actionType };
    case BOARD_ACTIONS.DRAW_DOWN: {
      const { clientX, clientY, stroke, fill, size } = action.payload;
      const newElement = createElement(state.elements.length, clientX, clientY, clientX, clientY, { type: state.activeToolItem, stroke, fill, size });
      return {
        ...state,
        toolActionType: state.activeToolItem === TOOL_ITEMS.TEXT ? TOOL_ACTION_TYPES.WRITING : TOOL_ACTION_TYPES.DRAWING,
        elements: [...state.elements, newElement],
      };
    }
    case BOARD_ACTIONS.DRAW_MOVE: {
      const { clientX, clientY } = action.payload;
      if (!state.elements.length) return state;

      const newElements = [...state.elements];
      const index = newElements.length - 1;
      const element = newElements[index];

      if ([TOOL_ITEMS.LINE, TOOL_ITEMS.RECTANGLE, TOOL_ITEMS.CIRCLE, TOOL_ITEMS.ARROW].includes(element.type)) {
        const updatedElement = createElement(index, element.x1, element.y1, clientX, clientY, element);
        newElements[index] = updatedElement;
      } else if (element.type === TOOL_ITEMS.BRUSH) {
        element.points = [...element.points, { x: clientX, y: clientY }];
        element.path = new Path2D(getSvgPathFromStroke(getStroke(element.points)));
        newElements[index] = element;
      }

      return { ...state, elements: newElements };
    }
    case BOARD_ACTIONS.DRAW_UP: {
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push([...state.elements]);
      return { ...state, history: newHistory, index: state.index + 1 };
    }
    case BOARD_ACTIONS.ERASE: {
      const { clientX, clientY } = action.payload;
      const newElements = state.elements.filter(el => !isPointNearElement(el, { pointX: clientX, pointY: clientY }));
      return { ...state, elements: newElements };
    }
    case BOARD_ACTIONS.CHANGE_TEXT: {
      const index = state.elements.length - 1;
      const newElements = [...state.elements];
      newElements[index].text = action.payload.text;
      const newHistory = state.history.slice(0, state.index + 1);
      newHistory.push(newElements);
      return { ...state, elements: newElements, history: newHistory, index: state.index + 1, toolActionType: TOOL_ACTION_TYPES.NONE };
    }
    case BOARD_ACTIONS.UNDO:
      if (state.index <= 0) return state;
      return { ...state, elements: state.history[state.index - 1], index: state.index - 1 };
    case BOARD_ACTIONS.REDO:
      if (state.index >= state.history.length - 1) return state;
      return { ...state, elements: state.history[state.index + 1], index: state.index + 1 };
    default:
      return state;
  }
};

const initialBoardState = { activeToolItem: TOOL_ITEMS.BRUSH, toolActionType: TOOL_ACTION_TYPES.NONE, elements: [], history: [[]], index: 0 };

const BoardProvider = ({ children, initialCanvas, socket, canvasId }) => {
  const [boardState, dispatchBoardAction] = useReducer(boardReducer, {
    ...initialBoardState,
    elements: initialCanvas?.elements ? recreateElements(initialCanvas.elements) : [],
    history: initialCanvas?.elements ? [recreateElements(initialCanvas.elements)] : [[]],
  });

  const saveCanvas = async (elements) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API_URL}/canvas/${canvasId}`, { elements }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      socket.emit("canvas_update", { canvasId, elements });
    } catch (err) {
      console.error("Failed to save canvas:", err);
    }
  };

  const boardMouseDownHandler = (event, toolboxState) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    const { clientX, clientY } = event;
    if (boardState.activeToolItem === TOOL_ITEMS.ERASER) {
      dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_ACTION_TYPE, payload: { actionType: TOOL_ACTION_TYPES.ERASING } });
      return;
    }
    dispatchBoardAction({
      type: BOARD_ACTIONS.DRAW_DOWN,
      payload: {
        clientX, clientY,
        stroke: toolboxState[boardState.activeToolItem]?.stroke,
        fill: toolboxState[boardState.activeToolItem]?.fill,
        size: toolboxState[boardState.activeToolItem]?.size,
      },
    });
  };

  const boardMouseMoveHandler = (event) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    const { clientX, clientY } = event;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.ERASE, payload: { clientX, clientY } });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.DRAW_MOVE, payload: { clientX, clientY } });
    }
  };

  const boardMouseUpHandler = () => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.WRITING) return;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({ type: BOARD_ACTIONS.DRAW_UP });
      saveCanvas(boardState.elements);
    }
    dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_ACTION_TYPE, payload: { actionType: TOOL_ACTION_TYPES.NONE } });
  };

  const textAreaBlurHandler = (text) => {
    dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_TEXT, payload: { text } });
    saveCanvas(boardState.elements);
  };

  const boardContextValue = {
    ...boardState,
    changeToolHandler: (tool) => dispatchBoardAction({ type: BOARD_ACTIONS.CHANGE_TOOL, payload: { tool } }),
    boardMouseDownHandler,
    boardMouseMoveHandler,
    boardMouseUpHandler,
    textAreaBlurHandler,
  };

  return <boardContext.Provider value={boardContextValue}>{children}</boardContext.Provider>;
};

export default BoardProvider;

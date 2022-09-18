import { UIElement } from "./UI";
export type Message = EvalMessage | InputChangeMessage;

export interface EvalMessage {
  kind: "eval";
  id: string;
  code: string;
}

export interface InputChangeMessage {
  kind: "input_change";
  id: string;
  value: any;
}

export type Result = EvalResult | InputChangeResult;

export type ReturnedValue =
  | string
  | { kind: "HTML"; value: string }
  | { kind: "input"; el: UIElement }
  | { kind: "plot"; value: string };

export interface EvalResult {
  kind: "eval";
  id: string;
  dependencies: Array<string>;
  result: ReturnedValue;
  out: string;
  error: string;
}

export function isEvalResult(msg: Result): msg is EvalResult {
  return msg.kind === "eval";
}

export interface InputChangeResult {
  kind: "input_change";
  id: string;
  cell_id: string;
}

export function isInputChangeResult(msg: Result): msg is InputChangeResult {
  return msg.kind === "input_change";
}

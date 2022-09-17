export type Message = EvalMessage;

export interface EvalMessage {
  kind: string;
  id: string;
  code: string;
}

export type Result =
  | string
  | { kind: "HTML"; value: string }
  | { kind: "plot"; value: string };

export interface EvalResult {
  id: string;
  dependencies: Array<string>;
  result: Result;
  out: string;
  error: string;
}

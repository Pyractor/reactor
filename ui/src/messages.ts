export type Message = EvalMessage;

export interface EvalMessage {
  kind: string;
  id: string;
  code: string;
}

export interface EvalResult {
  id: string;
  dependencies: Array<string>;
  result: string;
  out: string;
  error: string;
}

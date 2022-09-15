export type Message = EvalMessage;

export interface EvalMessage {
  kind: string;
  id: string;
  code: string;
}

export interface EvalResult {
  id: string;
  result: string | null;
  error: string | null;
}
